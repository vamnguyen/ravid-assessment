from django.urls import path

from .views import DocumentStatusView, DocumentUploadView

urlpatterns = [
    path('documents/upload/', DocumentUploadView.as_view(), name='document-upload'),
    path('documents/status/', DocumentStatusView.as_view(), name='document-status'),
]
