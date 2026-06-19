from dataclasses import dataclass

from django.conf import settings
from openai import OpenAI

from documents.services import retrieve_user_context


class ChatConfigurationError(Exception):
    pass


@dataclass
class ChatResult:
    answer: str
    tokens_consumed: int


def estimate_tokens(text):
    return max(1, len(text.split()) * 4 // 3)


def build_context(user_id, query, k=4):
    documents = retrieve_user_context(user_id=user_id, query=query, k=k)
    return '\n\n'.join(
        f'[Source: {doc.metadata.get("source", "uploaded document")}]\n{doc.page_content}'
        for doc in documents
    )


def build_messages(query, context, history_messages=None):
    history_messages = history_messages or []
    messages = [
        {
            'role': 'system',
            'content': (
                'You are a helpful assistant for a private document knowledge base. '
                'Answer using only the provided context. If the answer is not in '
                'the context, say you do not know based on the uploaded documents.'
            ),
        }
    ]

    for message in history_messages:
        messages.append({'role': message.role, 'content': message.content})

    messages.append(
        {
            'role': 'user',
            'content': f'Context:\n{context or "No relevant context found."}\n\nQuestion:\n{query}',
        }
    )
    return messages


def get_openrouter_client():
    if not settings.OPENROUTER_API_KEY:
        raise ChatConfigurationError('OPENROUTER_API_KEY is not configured.')

    return OpenAI(
        api_key=settings.OPENROUTER_API_KEY,
        base_url=settings.OPENROUTER_BASE_URL,
        default_headers={
            'HTTP-Referer': settings.OPENROUTER_HTTP_REFERER,
            'X-Title': settings.OPENROUTER_APP_TITLE,
        },
    )


def complete_chat(query, context, history_messages=None):
    client = get_openrouter_client()
    messages = build_messages(query, context, history_messages)

    completion = client.chat.completions.create(
        model=settings.OPENROUTER_MODEL,
        messages=messages,
        temperature=0.2,
    )
    answer = completion.choices[0].message.content or ''
    usage = getattr(completion, 'usage', None)
    tokens = getattr(usage, 'total_tokens', None) if usage else None

    if tokens is None:
        tokens = estimate_tokens(query + ' ' + context + ' ' + answer)

    return ChatResult(answer=answer, tokens_consumed=tokens)


def stream_chat(query, context, history_messages=None):
    client = get_openrouter_client()
    messages = build_messages(query, context, history_messages)

    return client.chat.completions.create(
        model=settings.OPENROUTER_MODEL,
        messages=messages,
        temperature=0.2,
        stream=True,
    )
