from rest_framework import serializers

from .models import Document
from .services import DocumentIngestionError, validate_document_extension


class DocumentUploadSerializer(serializers.Serializer):
    file = serializers.FileField()

    def validate_file(self, value):
        try:
            validate_document_extension(value.name)
        except DocumentIngestionError as exc:
            raise serializers.ValidationError(str(exc)) from exc
        return value


class DocumentStatusResponseSerializer(serializers.Serializer):
    task_id = serializers.CharField()
    status = serializers.ChoiceField(choices=Document.Status.choices)
    message = serializers.CharField(required=False)
    error = serializers.CharField(required=False)
