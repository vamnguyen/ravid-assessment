from types import SimpleNamespace
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import AccessToken

from .models import Document


User = get_user_model()


class DocumentApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            email='candidate@example.com',
            password='password123',
        )
        self.other_user = User.objects.create_user(
            email='other@example.com',
            password='password123',
        )

    def authenticate(self, user=None):
        user = user or self.user
        token = AccessToken.for_user(user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')

    def test_upload_requires_authentication(self):
        upload = SimpleUploadedFile('notes.txt', b'hello')

        response = self.client.post(
            '/api/documents/upload/',
            {'file': upload},
            format='multipart',
        )

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    @patch('documents.views.ingest_document.delay')
    def test_upload_accepts_allowed_file_and_starts_task(self, delay_mock):
        delay_mock.return_value = SimpleNamespace(id='task-123')
        self.authenticate()
        upload = SimpleUploadedFile('knowledge.md', b'# Policy\nUse secure APIs.')

        response = self.client.post(
            '/api/documents/upload/',
            {'file': upload},
            format='multipart',
        )

        self.assertEqual(response.status_code, status.HTTP_202_ACCEPTED)
        self.assertEqual(
            response.data['message'],
            'Document uploaded and ingestion started',
        )
        self.assertEqual(response.data['task_id'], 'task-123')
        document = Document.objects.get(id=response.data['document_id'])
        self.assertEqual(document.owner, self.user)
        self.assertEqual(document.status, Document.Status.PROCESSING)

    def test_upload_rejects_unsupported_file_extension(self):
        self.authenticate()
        upload = SimpleUploadedFile('malware.exe', b'not allowed')

        response = self.client.post(
            '/api/documents/upload/',
            {'file': upload},
            format='multipart',
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.data['error'],
            'Invalid file format. Only PDF, TXT, and Markdown files are allowed.',
        )

    def test_status_success_response(self):
        self.authenticate()
        document = Document.objects.create(
            owner=self.user,
            file='documents/user_1/example.txt',
            original_filename='example.txt',
            status=Document.Status.SUCCESS,
            task_id='task-success',
            chunk_count=2,
        )

        response = self.client.get(
            '/api/documents/status/',
            {'task_id': document.task_id},
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], 'SUCCESS')
        self.assertIn('indexed in vector storage', response.data['message'])

    def test_status_enforces_document_ownership(self):
        self.authenticate(self.other_user)
        Document.objects.create(
            owner=self.user,
            file='documents/user_1/example.txt',
            original_filename='example.txt',
            status=Document.Status.PROCESSING,
            task_id='task-private',
        )

        response = self.client.get(
            '/api/documents/status/',
            {'task_id': 'task-private'},
        )

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
