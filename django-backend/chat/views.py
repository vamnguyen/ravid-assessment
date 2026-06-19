import json

from django.db.models import Count, OuterRef, Subquery
from django.http import StreamingHttpResponse
from django.shortcuts import get_object_or_404
from drf_spectacular.utils import OpenApiResponse, extend_schema
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from documents.models import Document

from .models import ChatMessage, ChatSession
from .serializers import (
    ChatQueryResponseSerializer,
    ChatQuerySerializer,
    ChatSessionDetailSerializer,
    ChatSessionListSerializer,
)
from .services import (
    ChatConfigurationError,
    build_context,
    complete_chat,
    estimate_tokens,
    stream_chat,
)


def get_or_create_session(user, chat_id, query):
    if chat_id:
        return ChatSession.objects.get(id=chat_id, owner=user)

    return ChatSession.objects.create(owner=user, title=query[:80])


def recent_history(session, limit=10):
    messages = list(session.messages.order_by('-created_at')[:limit])
    return list(reversed(messages))


def no_documents_response(query):
    answer = 'No documents have been successfully indexed for this user yet.'
    return answer, estimate_tokens(query + ' ' + answer)


def chat_session_queryset(user):
    latest_message = ChatMessage.objects.filter(session=OuterRef('pk')).order_by(
        '-created_at'
    )
    return (
        ChatSession.objects.filter(owner=user)
        .annotate(
            message_count=Count('messages'),
            last_message_content=Subquery(latest_message.values('content')[:1]),
            last_message_role=Subquery(latest_message.values('role')[:1]),
        )
        .order_by('-updated_at')
    )


def store_chat_exchange(session, query, answer, tokens):
    ChatMessage.objects.create(
        session=session,
        role=ChatMessage.Role.USER,
        content=query,
    )
    ChatMessage.objects.create(
        session=session,
        role=ChatMessage.Role.ASSISTANT,
        content=answer,
        tokens_consumed=tokens,
    )
    session.save(update_fields=['updated_at'])


class ChatSessionListView(APIView):
    @extend_schema(
        responses={
            200: ChatSessionListSerializer(many=True),
            401: OpenApiResponse(description='Authentication required'),
        },
    )
    def get(self, request):
        serializer = ChatSessionListSerializer(
            chat_session_queryset(request.user),
            many=True,
        )
        return Response(serializer.data, status=status.HTTP_200_OK)


class ChatSessionDetailView(APIView):
    @extend_schema(
        responses={
            200: ChatSessionDetailSerializer,
            401: OpenApiResponse(description='Authentication required'),
            404: OpenApiResponse(description='Chat session not found'),
        },
    )
    def get(self, request, session_id):
        session = get_object_or_404(
            ChatSession.objects.filter(owner=request.user).prefetch_related('messages'),
            id=session_id,
        )
        serializer = ChatSessionDetailSerializer(session)
        return Response(serializer.data, status=status.HTTP_200_OK)


class ChatQueryView(APIView):
    @extend_schema(
        request=ChatQuerySerializer,
        responses={
            200: ChatQueryResponseSerializer,
            400: OpenApiResponse(description='Invalid chat request'),
            401: OpenApiResponse(description='Authentication required'),
            500: OpenApiResponse(description='LLM configuration error'),
        },
    )
    def post(self, request):
        serializer = ChatQuerySerializer(data=request.data, context={'request': request})
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        query = serializer.validated_data['query']
        chat_id = serializer.validated_data.get('chat_id')
        session = get_or_create_session(request.user, chat_id, query)
        history = recent_history(session)

        if not Document.objects.filter(
            owner=request.user,
            status=Document.Status.SUCCESS,
        ).exists():
            answer, tokens = no_documents_response(query)
        else:
            context = build_context(request.user.id, query)
            try:
                result = complete_chat(query=query, context=context, history_messages=history)
            except ChatConfigurationError as exc:
                return Response(
                    {'error': str(exc)},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                )
            answer = result.answer
            tokens = result.tokens_consumed

        store_chat_exchange(session, query, answer, tokens)

        return Response(
            {
                'answer': answer,
                'tokens_consumed': tokens,
                'chat_id': session.id,
            },
            status=status.HTTP_200_OK,
        )


class ChatStreamView(APIView):
    @extend_schema(
        request=ChatQuerySerializer,
        responses={
            200: OpenApiResponse(description='Server-Sent Events stream'),
            400: OpenApiResponse(description='Invalid chat request'),
            401: OpenApiResponse(description='Authentication required'),
        },
    )
    def post(self, request):
        serializer = ChatQuerySerializer(data=request.data, context={'request': request})
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        query = serializer.validated_data['query']
        chat_id = serializer.validated_data.get('chat_id')
        session = get_or_create_session(request.user, chat_id, query)
        history = recent_history(session)

        def encode_event(event, payload):
            return f'event: {event}\ndata: {json.dumps(payload)}\n\n'

        def event_stream():
            if not Document.objects.filter(
                owner=request.user,
                status=Document.Status.SUCCESS,
            ).exists():
                answer, tokens = no_documents_response(query)
                store_chat_exchange(session, query, answer, tokens)
                yield encode_event('token', {'content': answer})
                yield encode_event(
                    'final',
                    {
                        'answer': answer,
                        'tokens_consumed': tokens,
                        'chat_id': str(session.id),
                    },
                )
                return

            context = build_context(request.user.id, query)
            answer_parts = []

            try:
                stream = stream_chat(query=query, context=context, history_messages=history)
                for chunk in stream:
                    delta = chunk.choices[0].delta.content or ''
                    if not delta:
                        continue
                    answer_parts.append(delta)
                    yield encode_event('token', {'content': delta})

                answer = ''.join(answer_parts)
                tokens = estimate_tokens(query + ' ' + context + ' ' + answer)

                store_chat_exchange(session, query, answer, tokens)

                yield encode_event(
                    'final',
                    {
                        'answer': answer,
                        'tokens_consumed': tokens,
                        'chat_id': str(session.id),
                    },
                )
            except Exception as exc:
                yield encode_event('error', {'error': str(exc)})

        response = StreamingHttpResponse(event_stream(), content_type='text/event-stream')
        response['Cache-Control'] = 'no-cache'
        return response
