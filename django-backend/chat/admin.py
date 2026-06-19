from django.contrib import admin

from .models import ChatMessage, ChatSession


class ChatMessageInline(admin.TabularInline):
    model = ChatMessage
    extra = 0
    readonly_fields = ('id', 'created_at')


@admin.register(ChatSession)
class ChatSessionAdmin(admin.ModelAdmin):
    list_display = ('id', 'owner', 'title', 'created_at', 'updated_at')
    search_fields = ('owner__email', 'title')
    readonly_fields = ('id', 'created_at', 'updated_at')
    inlines = [ChatMessageInline]


@admin.register(ChatMessage)
class ChatMessageAdmin(admin.ModelAdmin):
    list_display = ('id', 'session', 'role', 'tokens_consumed', 'created_at')
    list_filter = ('role', 'created_at')
    search_fields = ('content', 'session__owner__email')
    readonly_fields = ('id', 'created_at')
