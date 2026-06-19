from rest_framework import serializers

from .models import ChatMessage, ChatSession


class ChatQuerySerializer(serializers.Serializer):
    query = serializers.CharField(allow_blank=False, trim_whitespace=True)
    chat_id = serializers.UUIDField(required=False)

    def validate_chat_id(self, value):
        request = self.context['request']
        if not ChatSession.objects.filter(id=value, owner=request.user).exists():
            raise serializers.ValidationError('Invalid chat_id.')
        return value


class ChatQueryResponseSerializer(serializers.Serializer):
    answer = serializers.CharField()
    tokens_consumed = serializers.IntegerField()
    chat_id = serializers.UUIDField()


class ChatMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChatMessage
        fields = ['id', 'role', 'content', 'tokens_consumed', 'created_at']


class ChatSessionListSerializer(serializers.ModelSerializer):
    message_count = serializers.IntegerField(read_only=True)
    last_message_preview = serializers.SerializerMethodField()
    last_message_role = serializers.SerializerMethodField()

    class Meta:
        model = ChatSession
        fields = [
            'id',
            'title',
            'created_at',
            'updated_at',
            'message_count',
            'last_message_preview',
            'last_message_role',
        ]

    def get_last_message_preview(self, obj):
        content = getattr(obj, 'last_message_content', '') or ''
        return content[:160]

    def get_last_message_role(self, obj):
        return getattr(obj, 'last_message_role', '') or ''


class ChatSessionDetailSerializer(serializers.ModelSerializer):
    messages = ChatMessageSerializer(many=True)
    message_count = serializers.SerializerMethodField()

    class Meta:
        model = ChatSession
        fields = [
            'id',
            'title',
            'created_at',
            'updated_at',
            'message_count',
            'messages',
        ]

    def get_message_count(self, obj):
        return obj.messages.count()
