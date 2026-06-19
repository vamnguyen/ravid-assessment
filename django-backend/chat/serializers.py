from rest_framework import serializers

from .models import ChatSession


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
