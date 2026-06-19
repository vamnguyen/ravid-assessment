# R.A.V.I.D. Chatbot Backend

Take-home backend implementation for a private document knowledge base and RAG chatbot.

The project uses Django REST Framework for APIs, JWT for authentication, PostgreSQL for relational data, Redis and Celery for asynchronous ingestion, Chroma for vector storage, LangChain for chunking/vector workflows, and OpenRouter for LLM responses.

## Architecture

```text
Client / React
  -> Django REST API
      -> PostgreSQL: users, documents, chat sessions, messages
      -> Redis: Celery broker and result backend
      -> Celery worker: document parsing, chunking, embedding, vector ingestion
      -> ChromaDB: per-user vector collections
      -> OpenRouter: LLM answer generation
      -> Flower: Celery task dashboard
```

Key design choices:

- `accounts` owns email-based authentication and JWT login.
- `documents` owns uploaded files, ingestion status, text extraction, chunking, and Chroma indexing.
- `chat` owns RAG query APIs, conversation history, and SSE streaming.
- Each user's vectors are isolated in a Chroma collection named `user_<user_id>_documents`.
- Uploaded files support PDF, TXT, and Markdown as required by the assessment.
- The first ingestion downloads Chroma's local ONNX embedding model; Docker keeps this cache in a persistent volume shared by web and Celery.

## Run With Docker

Create a local environment file:

```bash
cp .env.example .env
```

Set `OPENROUTER_API_KEY` in `.env` if you want live LLM responses. Document upload and ingestion can still run without the key.

Start the full stack:

```bash
docker compose up --build
```

Services:

- API: http://localhost:8000
- Swagger docs: http://localhost:8000/api/docs/
- OpenAPI schema: http://localhost:8000/api/schema/
- Flower dashboard: http://localhost:5555
- PostgreSQL: localhost:5432
- Redis: localhost:6379

Create an admin user:

```bash
docker compose exec web python manage.py createsuperuser
```

## Run Locally Without Docker

Local mode uses PostgreSQL as well. Start the database and Redis services, then run Django from your virtualenv:

```bash
docker compose up -d db redis
```

Your local `.env` should point to host ports:

```bash
DATABASE_URL=postgres://ravid:ravid@localhost:5432/ravid
REDIS_URL=redis://localhost:6379/0
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/1
```

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

Run a local worker if Redis is available:

```bash
celery -A config worker --loglevel=info
```

## API Examples

Register:

```bash
curl -X POST http://localhost:8000/api/register/ \
  -H "Content-Type: application/json" \
  -d '{"email":"example@gmail.com","password":"password123"}'
```

Login:

```bash
TOKEN=$(curl -s -X POST http://localhost:8000/api/login/ \
  -H "Content-Type: application/json" \
  -d '{"email":"example@gmail.com","password":"password123"}' \
  | python -c "import sys, json; print(json.load(sys.stdin)['token'])")
```

Upload a document:

```bash
curl -X POST http://localhost:8000/api/documents/upload/ \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@knowledge_base.pdf"
```

Check ingestion status:

```bash
curl "http://localhost:8000/api/documents/status/?task_id=<task_id>" \
  -H "Authorization: Bearer $TOKEN"
```

Ask a RAG question:

```bash
curl -X POST http://localhost:8000/api/chat/query/ \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query":"What is the cancellation policy?"}'
```

Continue a chat:

```bash
curl -X POST http://localhost:8000/api/chat/query/ \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"chat_id":"<chat_id>","query":"Can you summarize that in one sentence?"}'
```

Stream a response with Server-Sent Events:

```bash
curl -N -X POST http://localhost:8000/api/chat/query/stream/ \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query":"What is the cancellation policy?"}'
```

## Workflow To Explain In Interview

1. The user registers and logs in with email/password.
2. Login returns a JWT access token. Protected routes require `Authorization: Bearer <token>`.
3. The user uploads a PDF/TXT/MD file.
4. Django stores document metadata in PostgreSQL and enqueues a Celery task through Redis.
5. Celery extracts raw text, chunks it using LangChain's `RecursiveCharacterTextSplitter`, embeds chunks with Chroma's local default embedding function, and writes vectors to the user's Chroma collection.
6. The status endpoint reads the document row and Celery result to report `PROCESSING`, `SUCCESS`, or `FAILURE`.
7. Chat query retrieves relevant chunks only from the authenticated user's collection, builds a context-aware prompt, calls OpenRouter, and stores the user/assistant messages.
8. The streaming endpoint uses the same RAG flow but returns token chunks as `text/event-stream`.

## Tests

Run:

```bash
source .venv/bin/activate
python manage.py test
```

The test suite covers:

- Registration, duplicate registration, login success/failure.
- JWT protection for document upload.
- Upload validation for PDF/TXT/MD only.
- Document status and ownership isolation.
- RAG chat behavior with mocked model calls.
- SSE behavior for the no-documents case.

## Environment Variables

Important variables:

- `DATABASE_URL`: PostgreSQL connection string.
- `REDIS_URL`, `CELERY_BROKER_URL`, `CELERY_RESULT_BACKEND`: Redis/Celery configuration.
- `CHROMA_PERSIST_DIR`: persistent Chroma vector directory.
- `OPENROUTER_API_KEY`: required for live LLM responses.
- `OPENROUTER_MODEL`: OpenRouter model slug.

## Generated API Schema

The repository includes `openapi.yaml`, generated with:

```bash
python manage.py spectacular --file openapi.yaml --validate
```
