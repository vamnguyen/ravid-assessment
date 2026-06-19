from django.urls import path

from .views import (
    ChatQueryView,
    ChatSessionDetailView,
    ChatSessionListView,
    ChatStreamView,
)

urlpatterns = [
    path('chat/sessions/', ChatSessionListView.as_view(), name='chat-sessions'),
    path(
        'chat/sessions/<uuid:session_id>/',
        ChatSessionDetailView.as_view(),
        name='chat-session-detail',
    ),
    path('chat/query/', ChatQueryView.as_view(), name='chat-query'),
    path('chat/query/stream/', ChatStreamView.as_view(), name='chat-query-stream'),
]
