import uuid
from pathlib import Path

from django.conf import settings
from django.db import models


def document_upload_path(instance, filename):
    suffix = Path(filename).suffix.lower()
    return f'documents/user_{instance.owner_id}/{instance.id}{suffix}'


class Document(models.Model):
    class Status(models.TextChoices):
        UPLOADED = 'UPLOADED', 'Uploaded'
        PROCESSING = 'PROCESSING', 'Processing'
        SUCCESS = 'SUCCESS', 'Success'
        FAILURE = 'FAILURE', 'Failure'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='documents',
    )
    file = models.FileField(upload_to=document_upload_path)
    original_filename = models.CharField(max_length=255)
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.UPLOADED,
        db_index=True,
    )
    task_id = models.CharField(max_length=255, blank=True, db_index=True)
    error_message = models.TextField(blank=True)
    chunk_count = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.original_filename} ({self.owner_id})'
