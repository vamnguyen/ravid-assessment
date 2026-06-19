from celery import shared_task

from .models import Document
from .services import (
    DocumentIngestionError,
    extract_text_from_file,
    index_document_chunks,
    split_text,
)


@shared_task(bind=True)
def ingest_document(self, document_id):
    document = Document.objects.select_related('owner').get(id=document_id)
    document.status = Document.Status.PROCESSING
    document.error_message = ''
    document.save(update_fields=['status', 'error_message', 'updated_at'])

    try:
        text = extract_text_from_file(document.file.path)
        chunks = split_text(text)

        if not chunks:
            raise DocumentIngestionError('Failed to parse document content.')

        index_document_chunks(document, chunks)

        document.status = Document.Status.SUCCESS
        document.chunk_count = len(chunks)
        document.error_message = ''
        document.save(
            update_fields=['status', 'chunk_count', 'error_message', 'updated_at']
        )

        return {
            'document_id': str(document.id),
            'status': Document.Status.SUCCESS,
            'chunk_count': len(chunks),
        }
    except Exception as exc:
        document.status = Document.Status.FAILURE
        document.error_message = str(exc) or 'Failed to parse document content.'
        document.save(update_fields=['status', 'error_message', 'updated_at'])
        raise
