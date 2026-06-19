from django.contrib import admin

from .models import Document


@admin.register(Document)
class DocumentAdmin(admin.ModelAdmin):
    list_display = (
        'id',
        'owner',
        'original_filename',
        'status',
        'task_id',
        'chunk_count',
        'created_at',
    )
    list_filter = ('status', 'created_at')
    search_fields = ('original_filename', 'task_id', 'owner__email')
    readonly_fields = ('id', 'created_at', 'updated_at')
