from celery.result import AsyncResult
from drf_spectacular.utils import OpenApiParameter, OpenApiResponse, extend_schema
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Document
from .serializers import DocumentStatusResponseSerializer, DocumentUploadSerializer
from .tasks import ingest_document


class DocumentUploadView(APIView):
    @extend_schema(
        request=DocumentUploadSerializer,
        responses={
            202: OpenApiResponse(description='Document uploaded and ingestion started'),
            400: OpenApiResponse(description='Invalid upload'),
            401: OpenApiResponse(description='Authentication required'),
        },
    )
    def post(self, request):
        serializer = DocumentUploadSerializer(data=request.data)

        if not serializer.is_valid():
            error = serializer.errors.get('file', ['Invalid upload'])[0]
            return Response({'error': str(error)}, status=status.HTTP_400_BAD_REQUEST)

        upload = serializer.validated_data['file']
        document = Document.objects.create(
            owner=request.user,
            file=upload,
            original_filename=upload.name,
            status=Document.Status.PROCESSING,
        )
        task = ingest_document.delay(str(document.id))
        document.task_id = task.id
        document.save(update_fields=['task_id', 'updated_at'])

        return Response(
            {
                'message': 'Document uploaded and ingestion started',
                'document_id': str(document.id),
                'task_id': task.id,
            },
            status=status.HTTP_202_ACCEPTED,
        )


class DocumentStatusView(APIView):
    @extend_schema(
        parameters=[
            OpenApiParameter(
                name='task_id',
                location=OpenApiParameter.QUERY,
                required=True,
                type=str,
            )
        ],
        responses={
            200: DocumentStatusResponseSerializer,
            400: OpenApiResponse(description='Missing task_id'),
            404: OpenApiResponse(description='Task not found'),
            401: OpenApiResponse(description='Authentication required'),
        },
    )
    def get(self, request):
        task_id = request.query_params.get('task_id')
        if not task_id:
            return Response(
                {'error': 'task_id query parameter is required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        document = Document.objects.filter(owner=request.user, task_id=task_id).first()
        if document is None:
            return Response({'error': 'Task not found.'}, status=status.HTTP_404_NOT_FOUND)

        celery_result = AsyncResult(task_id)

        if document.status == Document.Status.SUCCESS:
            return Response(
                {
                    'task_id': task_id,
                    'status': 'SUCCESS',
                    'message': (
                        'Document successfully parsed, embedded, and indexed '
                        'in vector storage.'
                    ),
                },
                status=status.HTTP_200_OK,
            )

        if document.status == Document.Status.FAILURE or celery_result.failed():
            return Response(
                {
                    'task_id': task_id,
                    'status': 'FAILURE',
                    'error': document.error_message or 'Failed to parse document content.',
                },
                status=status.HTTP_200_OK,
            )

        return Response(
            {
                'task_id': task_id,
                'status': 'PROCESSING',
            },
            status=status.HTTP_200_OK,
        )
