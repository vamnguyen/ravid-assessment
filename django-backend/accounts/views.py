from drf_spectacular.utils import OpenApiResponse, extend_schema, inline_serializer
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import serializers
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import AccessToken

from .serializers import LoginSerializer, RegisterSerializer


class RegisterView(APIView):
    permission_classes = [AllowAny]

    @extend_schema(
        request=RegisterSerializer,
        responses={
            201: inline_serializer(
                name='RegisterSuccessResponse',
                fields={
                    'message': serializers.CharField(),
                    'user_id': serializers.CharField(),
                },
            ),
            400: OpenApiResponse(description='Registration failed'),
        },
    )
    def post(self, request):
        serializer = RegisterSerializer(data=request.data)

        if not serializer.is_valid():
            error = serializer.errors.get('email', ['Invalid registration data'])[0]
            return Response({'error': str(error)}, status=status.HTTP_400_BAD_REQUEST)

        user = serializer.save()

        return Response(
            {
                'message': 'Registration successful',
                'user_id': str(user.id),
            },
            status=status.HTTP_201_CREATED,
        )


class LoginView(APIView):
    permission_classes = [AllowAny]

    @extend_schema(
        request=LoginSerializer,
        responses={
            200: inline_serializer(
                name='LoginSuccessResponse',
                fields={
                    'message': serializers.CharField(),
                    'token': serializers.CharField(),
                },
            ),
            401: OpenApiResponse(description='Invalid credentials'),
        },
    )
    def post(self, request):
        serializer = LoginSerializer(data=request.data)

        if not serializer.is_valid():
            return Response(
                {'error': 'Invalid email or password'},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        token = AccessToken.for_user(serializer.validated_data['user'])

        return Response(
            {
                'message': 'Login successful',
                'token': str(token),
            },
            status=status.HTTP_200_OK,
        )
