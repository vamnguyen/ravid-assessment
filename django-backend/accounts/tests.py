from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient


User = get_user_model()


class AuthApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_register_success(self):
        response = self.client.post(
            '/api/register/',
            {'email': 'candidate@example.com', 'password': 'password123'},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['message'], 'Registration successful')
        self.assertTrue(User.objects.filter(email='candidate@example.com').exists())

    def test_register_duplicate_email(self):
        User.objects.create_user(email='candidate@example.com', password='password123')

        response = self.client.post(
            '/api/register/',
            {'email': 'candidate@example.com', 'password': 'password123'},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.data['error'],
            'User with this email already exists.',
        )

    def test_login_success(self):
        User.objects.create_user(email='candidate@example.com', password='password123')

        response = self.client.post(
            '/api/login/',
            {'email': 'candidate@example.com', 'password': 'password123'},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['message'], 'Login successful')
        self.assertIn('token', response.data)

    def test_login_failure(self):
        response = self.client.post(
            '/api/login/',
            {'email': 'candidate@example.com', 'password': 'wrong-password'},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(response.data['error'], 'Invalid email or password')
