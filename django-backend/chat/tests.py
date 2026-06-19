from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import AccessToken

from documents.models import Document

from .models import ChatMessage, ChatSession
from .services import ChatResult


User = get_user_model()


class ChatApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            email='candidate@example.com',
            password='password123',
        )
        token = AccessToken.for_user(self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')

    def create_indexed_document(self):
        return Document.objects.create(
            owner=self.user,
            file='documents/user_1/example.txt',
            original_filename='example.txt',
            status=Document.Status.SUCCESS,
            task_id='task-success',
            chunk_count=1,
        )

    def test_query_without_indexed_documents_returns_clear_answer(self):
        response = self.client.post(
            '/api/chat/query/',
            {'query': 'What is the policy?'},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            response.data['answer'],
            'No documents have been successfully indexed for this user yet.',
        )
        self.assertEqual(ChatMessage.objects.count(), 2)

    @patch('chat.views.complete_chat')
    @patch('chat.views.build_context')
    def test_query_uses_rag_context_and_stores_history(self, context_mock, chat_mock):
        self.create_indexed_document()
        context_mock.return_value = 'Relevant cancellation policy context.'
        chat_mock.return_value = ChatResult(
            answer='The policy requires 14 days notice.',
            tokens_consumed=42,
        )

        response = self.client.post(
            '/api/chat/query/',
            {'query': 'What is the cancellation policy?'},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['tokens_consumed'], 42)
        self.assertIn('chat_id', response.data)
        self.assertEqual(ChatSession.objects.count(), 1)
        self.assertEqual(ChatMessage.objects.count(), 2)
        context_mock.assert_called_once()
        chat_mock.assert_called_once()

    def test_invalid_chat_id_is_rejected(self):
        response = self.client.post(
            '/api/chat/query/',
            {
                'query': 'Continue this chat',
                'chat_id': '00000000-0000-0000-0000-000000000000',
            },
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('chat_id', response.data)

    def test_stream_without_indexed_documents_returns_sse_events(self):
        response = self.client.post(
            '/api/chat/query/stream/',
            {'query': 'What is the policy?'},
            format='json',
        )

        body = b''.join(response.streaming_content).decode()

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('event: token', body)
        self.assertIn('event: final', body)
        self.assertEqual(ChatMessage.objects.count(), 2)

    def test_session_list_returns_only_current_users_history(self):
        session = ChatSession.objects.create(owner=self.user, title='Policy chat')
        ChatMessage.objects.create(
            session=session,
            role=ChatMessage.Role.USER,
            content='What is the policy?',
        )
        ChatMessage.objects.create(
            session=session,
            role=ChatMessage.Role.ASSISTANT,
            content='The policy requires 14 days notice.',
            tokens_consumed=42,
        )
        other_user = User.objects.create_user(
            email='other@example.com',
            password='password123',
        )
        ChatSession.objects.create(owner=other_user, title='Hidden chat')

        response = self.client.get('/api/chat/sessions/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['id'], str(session.id))
        self.assertEqual(response.data[0]['message_count'], 2)
        self.assertEqual(response.data[0]['last_message_role'], 'assistant')
        self.assertIn('14 days notice', response.data[0]['last_message_preview'])

    def test_session_detail_returns_messages_in_order(self):
        session = ChatSession.objects.create(owner=self.user, title='Policy chat')
        user_message = ChatMessage.objects.create(
            session=session,
            role=ChatMessage.Role.USER,
            content='What is the policy?',
        )
        assistant_message = ChatMessage.objects.create(
            session=session,
            role=ChatMessage.Role.ASSISTANT,
            content='The policy requires 14 days notice.',
            tokens_consumed=42,
        )

        response = self.client.get(f'/api/chat/sessions/{session.id}/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['id'], str(session.id))
        self.assertEqual(response.data['message_count'], 2)
        self.assertEqual(
            [message['id'] for message in response.data['messages']],
            [str(user_message.id), str(assistant_message.id)],
        )

    def test_session_detail_rejects_other_users_session(self):
        other_user = User.objects.create_user(
            email='other@example.com',
            password='password123',
        )
        session = ChatSession.objects.create(owner=other_user, title='Hidden chat')

        response = self.client.get(f'/api/chat/sessions/{session.id}/')

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
