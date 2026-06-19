from django.urls import path

from .views import ChatQueryView, ChatStreamView

urlpatterns = [
    path('chat/query/', ChatQueryView.as_view(), name='chat-query'),
    path('chat/query/stream/', ChatStreamView.as_view(), name='chat-query-stream'),
]
