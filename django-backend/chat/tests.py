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
