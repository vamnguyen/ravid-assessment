from datetime import timedelta
from pathlib import Path

import environ

BASE_DIR = Path(__file__).resolve().parent.parent

env = environ.Env(
    DEBUG=(bool, True),
    SECRET_KEY=(str, 'django-insecure-local-development-key'),
    ALLOWED_HOSTS=(list, ['localhost', '127.0.0.1']),
    CORS_ALLOW_ALL_ORIGINS=(bool, True),
)
environ.Env.read_env(BASE_DIR / '.env')

def env_path(name, default):
    path = Path(env(name, default=default))
    if path.is_absolute():
        return path
    return BASE_DIR / path

SECRET_KEY = env('SECRET_KEY')
DEBUG = env('DEBUG')
ALLOWED_HOSTS = env.list('ALLOWED_HOSTS', default=['localhost', '127.0.0.1'])

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'corsheaders',
    'drf_spectacular',
    'accounts',
    'documents',
    'chat',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'

DEFAULT_DATABASE_URL = 'postgres://ravid:ravid@localhost:5432/ravid'

DATABASES = {
    'default': env.db('DATABASE_URL', default=DEFAULT_DATABASE_URL)
}

AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

STATIC_URL = 'static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'

MEDIA_URL = '/media/'
MEDIA_ROOT = env_path('MEDIA_ROOT', 'media')

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'
AUTH_USER_MODEL = 'accounts.User'

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    ),
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
    'DEFAULT_PARSER_CLASSES': (
        'rest_framework.parsers.JSONParser',
        'rest_framework.parsers.FormParser',
        'rest_framework.parsers.MultiPartParser',
    ),
}

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(hours=1),
    'AUTH_HEADER_TYPES': ('Bearer',),
}

SPECTACULAR_SETTINGS = {
    'TITLE': 'RAVID Chatbot Backend API',
    'DESCRIPTION': 'Backend APIs for user auth, document ingestion, and RAG chat.',
    'VERSION': '1.0.0',
    'SERVE_INCLUDE_SCHEMA': False,
}

CORS_ALLOW_ALL_ORIGINS = env.bool('CORS_ALLOW_ALL_ORIGINS', default=True)

REDIS_URL = env('REDIS_URL', default='redis://localhost:6379/0')
CELERY_BROKER_URL = env('CELERY_BROKER_URL', default=REDIS_URL)
CELERY_RESULT_BACKEND = env('CELERY_RESULT_BACKEND', default='redis://localhost:6379/1')
CELERY_TASK_TRACK_STARTED = True
CELERY_TASK_TIME_LIMIT = 15 * 60
CELERY_RESULT_EXTENDED = True

CHROMA_PERSIST_DIR = env_path('CHROMA_PERSIST_DIR', 'chroma_db')
OPENROUTER_API_KEY = env('OPENROUTER_API_KEY', default='')
OPENROUTER_MODEL = env('OPENROUTER_MODEL', default='openrouter/auto')
OPENROUTER_BASE_URL = env('OPENROUTER_BASE_URL', default='https://openrouter.ai/api/v1')
OPENROUTER_HTTP_REFERER = env('OPENROUTER_HTTP_REFERER', default='http://localhost:8000')
OPENROUTER_APP_TITLE = env('OPENROUTER_APP_TITLE', default='RAVID Django RAG Backend')
