FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    TOKENIZERS_PARALLELISM=false \
    XDG_CACHE_HOME=/app/.cache

WORKDIR /app

COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .

RUN mkdir -p /app/media /app/chroma_db /app/.cache

EXPOSE 8000

CMD ["sh", "-c", "python manage.py migrate && python manage.py collectstatic --noinput && gunicorn config.wsgi:application --bind 0.0.0.0:8000 --workers 3 --timeout 300"]
