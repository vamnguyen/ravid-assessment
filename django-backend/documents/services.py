from pathlib import Path

from django.conf import settings
from langchain_chroma import Chroma
from langchain_core.documents import Document as LangChainDocument
from langchain_text_splitters import RecursiveCharacterTextSplitter
from pypdf import PdfReader


ALLOWED_DOCUMENT_EXTENSIONS = {'.pdf', '.txt', '.md'}


class DocumentIngestionError(Exception):
    pass


def validate_document_extension(filename):
    suffix = Path(filename).suffix.lower()
    if suffix not in ALLOWED_DOCUMENT_EXTENSIONS:
        raise DocumentIngestionError(
            'Invalid file format. Only PDF, TXT, and Markdown files are allowed.'
        )


def extract_text_from_file(file_path):
    path = Path(file_path)
    suffix = path.suffix.lower()

    if suffix == '.pdf':
        reader = PdfReader(str(path))
        pages = [page.extract_text() or '' for page in reader.pages]
        text = '\n\n'.join(page.strip() for page in pages if page.strip())
    elif suffix in {'.txt', '.md'}:
        text = path.read_text(encoding='utf-8', errors='ignore')
    else:
        raise DocumentIngestionError(
            'Invalid file format. Only PDF, TXT, and Markdown files are allowed.'
        )

    text = text.strip()
    if not text:
        raise DocumentIngestionError('Failed to parse document content.')

    return text


def split_text(text):
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=150,
        separators=['\n\n', '\n', '. ', ' ', ''],
    )
    return splitter.split_text(text)


def user_collection_name(user_id):
    return f'user_{user_id}_documents'


def get_user_vector_store(user_id):
    settings.CHROMA_PERSIST_DIR.mkdir(parents=True, exist_ok=True)
    return Chroma(
        collection_name=user_collection_name(user_id),
        persist_directory=str(settings.CHROMA_PERSIST_DIR),
    )


def index_document_chunks(document, chunks):
    vector_store = get_user_vector_store(document.owner_id)
    langchain_documents = [
        LangChainDocument(
            page_content=chunk,
            metadata={
                'user_id': str(document.owner_id),
                'document_id': str(document.id),
                'source': document.original_filename,
                'chunk_index': index,
            },
        )
        for index, chunk in enumerate(chunks)
    ]

    ids = [f'{document.id}:{index}' for index in range(len(langchain_documents))]
    vector_store.add_documents(langchain_documents, ids=ids)


def retrieve_user_context(user_id, query, k=4):
    vector_store = get_user_vector_store(user_id)
    try:
        return vector_store.similarity_search(query, k=k)
    except Exception:
        return []
