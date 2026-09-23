import os
import sys
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = os.getenv("DJANGO_SECRET_KEY", "django-insecure-change-this-for-production")
DEBUG = os.getenv("DJANGO_DEBUG", "true").lower() == "true"
ALLOWED_HOSTS = [host.strip() for host in os.getenv("DJANGO_ALLOWED_HOSTS", "localhost,127.0.0.1").split(",") if host.strip()]

# Correo de notificaciones. EMAIL_PROVIDER: mailtrap (desarrollo), sendgrid (producción),
# smtp (SMTP institucional) o console (imprime en consola).
EMAIL_PROVIDER = os.getenv("EMAIL_PROVIDER", "console" if DEBUG else "smtp").lower()
_EMAIL_PRESETS = {
    "mailtrap": {"host": "sandbox.smtp.mailtrap.io", "port": "2525", "user": os.getenv("MAILTRAP_USER", ""), "password": os.getenv("MAILTRAP_PASSWORD", ""), "tls": "true"},
    "sendgrid": {"host": "smtp.sendgrid.net", "port": "587", "user": "apikey", "password": os.getenv("SENDGRID_API_KEY", ""), "tls": "true"},
}
_preset = _EMAIL_PRESETS.get(EMAIL_PROVIDER, {})
EMAIL_BACKEND = os.getenv(
    "EMAIL_BACKEND",
    "django.core.mail.backends.console.EmailBackend" if EMAIL_PROVIDER == "console" else "django.core.mail.backends.smtp.EmailBackend",
)
EMAIL_HOST = os.getenv("EMAIL_HOST", _preset.get("host", "localhost"))
EMAIL_PORT = int(os.getenv("EMAIL_PORT", _preset.get("port", "25")))
EMAIL_HOST_USER = os.getenv("EMAIL_HOST_USER", _preset.get("user", ""))
EMAIL_HOST_PASSWORD = os.getenv("EMAIL_HOST_PASSWORD", _preset.get("password", ""))
EMAIL_USE_TLS = os.getenv("EMAIL_USE_TLS", _preset.get("tls", "false")).lower() == "true"
DEFAULT_FROM_EMAIL = os.getenv("DEFAULT_FROM_EMAIL", "no-reply@ingresosup.local")

# Redis 7+: caché compartida (rate limiting, sesiones de throttling) y broker de Celery.
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")
# En desarrollo (DEBUG) sin REDIS_URL definido se usa caché local para poder arrancar sin Redis;
# en producción Redis es obligatorio.
if "test" in sys.argv or os.getenv("CACHE_BACKEND", "").lower() == "locmem" or (DEBUG and "REDIS_URL" not in os.environ):
    CACHES = {"default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"}}
else:
    CACHES = {"default": {"BACKEND": "django.core.cache.backends.redis.RedisCache", "LOCATION": f"{REDIS_URL}/1"}}

CELERY_BROKER_URL = os.getenv("CELERY_BROKER_URL", f"{REDIS_URL}/0")
CELERY_RESULT_BACKEND = os.getenv("CELERY_RESULT_BACKEND", CELERY_BROKER_URL)
CELERY_TASK_ALWAYS_EAGER = os.getenv("CELERY_TASK_ALWAYS_EAGER", "true" if "test" in sys.argv else "false").lower() == "true"
CELERY_TASK_EAGER_PROPAGATES = True
CELERY_TASK_DEFAULT_RETRY_DELAY = 60
CELERY_TASK_TRACK_STARTED = True

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "corsheaders",
    "drf_spectacular",
    "rest_framework",
    "rest_framework_simplejwt.token_blacklist",
    "apps.core",
    "apps.authentication",
    "apps.gestion_provincial",
    "apps.gestion_municipal",
    "apps.gestion_escuela",
    "apps.gestion_personal",
    "apps.superadmin",
    "apps.import_export",
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    "apps.core.middleware.AuditMiddleware",
]

ROOT_URLCONF = "backend.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "backend.wsgi.application"

# Base de datos: SQLite por defecto en desarrollo; PostgreSQL con DB_ENGINE=postgresql (+ DB_NAME, DB_USER, DB_PASSWORD, DB_HOST, DB_PORT).
if os.getenv("DB_ENGINE", "sqlite").lower() in {"postgres", "postgresql"}:
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.postgresql",
            "NAME": os.getenv("DB_NAME", "ingresosup"),
            "USER": os.getenv("DB_USER", "ingresosup"),
            "PASSWORD": os.getenv("DB_PASSWORD", ""),
            "HOST": os.getenv("DB_HOST", "localhost"),
            "PORT": os.getenv("DB_PORT", "5432"),
            "CONN_MAX_AGE": int(os.getenv("DB_CONN_MAX_AGE", "60")),
        }
    }
else:
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": BASE_DIR / "db.sqlite3",
        }
    }

AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.CommonPasswordValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.NumericPasswordValidator",
    },
]

PASSWORD_HASHERS = [
    "django.contrib.auth.hashers.Argon2PasswordHasher",
    "django.contrib.auth.hashers.PBKDF2PasswordHasher",
]

LANGUAGE_CODE = "es-es"
TIME_ZONE = "America/Havana"
USE_I18N = True
USE_L10N = True
USE_TZ = True

STATIC_URL = "/static/"
STATIC_ROOT = Path(os.getenv("STATIC_ROOT", BASE_DIR / "staticfiles"))
MEDIA_URL = "/media/"
MEDIA_ROOT = Path(os.getenv("MEDIA_ROOT", BASE_DIR / "media"))
MAX_EXCEL_UPLOAD_BYTES = int(os.getenv("MAX_EXCEL_UPLOAD_BYTES", str(10 * 1024 * 1024)))

LOG_DIR = BASE_DIR / "logs"
LOG_DIR.mkdir(exist_ok=True)
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "handlers": {
        "audit_file": {
            "class": "logging.FileHandler",
            "filename": LOG_DIR / "audit.log",
            "encoding": "utf-8",
        },
    },
    "loggers": {
        "audit": {
            "handlers": ["audit_file"],
            "level": "INFO",
            "propagate": False,
        },
    },
}

AUTH_USER_MODEL = "authentication.Usuario"

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "apps.authentication.cookie_auth.CookieJWTAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
    "DEFAULT_RENDERER_CLASSES": [
        "apps.core.renderers.EnvelopeJSONRenderer",
    ],
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    "DEFAULT_THROTTLE_CLASSES": [
        "rest_framework.throttling.AnonRateThrottle",
        "rest_framework.throttling.UserRateThrottle",
    ],
    "EXCEPTION_HANDLER": "apps.core.exceptions.safe_exception_handler",
    "DEFAULT_THROTTLE_RATES": {
        "anon": "60/minute",
        "user": "120/minute",
        "authentication": "10/minute",
        "bulk_operations": "30/minute",
    },
}

SPECTACULAR_SETTINGS = {
    "TITLE": "IngresoSUP API",
    "DESCRIPTION": "API REST para la interoperabilidad del sistema de ingreso a la Educación Superior.",
    "VERSION": "1.0.0",
    "SERVE_INCLUDE_SCHEMA": False,
    "SECURITY": [{"BearerAuth": []}],
    "COMPONENTS": {
        "securitySchemes": {
            "BearerAuth": {
                "type": "http",
                "scheme": "bearer",
                "bearerFormat": "JWT",
                "description": "Token JWT obtenido al iniciar sesión en la API.",
            }
        }
    },
    "TAGS": [
        {"name": "Autenticación", "description": "Registro, verificación de correo, inicio y cierre de sesión, y tokens JWT."},
        {"name": "Core", "description": "Salud del servicio y notificaciones del usuario."},
        {"name": "Auditoría", "description": "Consulta y exportación de la traza de auditoría del sistema."},
        {"name": "Superadministración", "description": "CRUD de catálogos institucionales (nomencladores) y usuarios administrativos globales."},
        {"name": "Gestión", "description": "Operaciones de admisión, nomencladores y flujo de estudiantes/escuelas/provincias."},
        {"name": "Importación y exportación", "description": "Carga masiva desde Excel, plantillas y exportación de datos institucionales."},
        {"name": "Escalafón", "description": "Publicación, revisión y envío del escalafón estudiantil."},
        {"name": "Resultados", "description": "Publicación de resultados de exámenes de ingreso y reclamaciones."},
        {"name": "Otorgamiento", "description": "Otorgamiento de carreras y consultas públicas asociadas."},
    ],
}

from datetime import timedelta

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=int(os.getenv("JWT_ACCESS_MINUTES", "15"))),
    "REFRESH_TOKEN_LIFETIME": timedelta(hours=int(os.getenv("JWT_REFRESH_HOURS", "8"))),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "AUTH_HEADER_TYPES": ("Bearer",),
}

SESSION_COOKIE_AGE = int(os.getenv("SESSION_COOKIE_AGE", "28800"))
SESSION_EXPIRE_AT_BROWSER_CLOSE = True

CORS_ALLOW_ALL_ORIGINS = False
CORS_ALLOWED_ORIGINS = [
    "http://localhost:4173",
    "http://127.0.0.1:4173",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOW_HEADERS = [
    "*",
]
CSRF_TRUSTED_ORIGINS = [
    "http://localhost:4173",
    "http://127.0.0.1:4173",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]
# The Vite proxy keeps frontend and API requests same-origin in development.
SESSION_COOKIE_SAMESITE = "Lax"
CSRF_COOKIE_SAMESITE = "Lax"
SESSION_COOKIE_SECURE = False
CSRF_COOKIE_SECURE = False

if not DEBUG:
    SECURE_SSL_REDIRECT = True
    SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_HSTS_SECONDS = 31536000
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True
    SECURE_CONTENT_TYPE_NOSNIFF = True
    SECURE_REFERRER_POLICY = "same-origin"
