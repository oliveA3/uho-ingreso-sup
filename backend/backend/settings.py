import os
import sys
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

# Carga opcional de variables desde un archivo .env (raíz del proyecto o backend/); las variables
# ya definidas en el entorno tienen prioridad.
try:
    from dotenv import load_dotenv

    for _env_file in (BASE_DIR.parent / ".env", BASE_DIR / ".env"):
        load_dotenv(_env_file, override=False)
except ImportError:
    pass

INSECURE_SECRET_KEY = "django-insecure-change-this-for-production"
SECRET_KEY = os.getenv("DJANGO_SECRET_KEY", INSECURE_SECRET_KEY)

RUNNING_TESTS = "test" in sys.argv
DEBUG = os.getenv("DJANGO_DEBUG", "true").lower() == "true"

ALLOWED_HOSTS = [host.strip() for host in os.getenv("DJANGO_ALLOWED_HOSTS", "localhost,127.0.0.1").split(",") if host.strip()]
FRONTEND_URL = os.getenv("FRONTEND_URL", "").rstrip("/")

# Guardias de arranque. El default de DEBUG sigue siendo `true` para que el
# arranque en limpio de docs/SETUP.md funcione sin configurar nada, pero las dos
# combinaciones que delatan un despliegue mal configurado abortan de inmediato en
# vez de servir el sistema de forma insegura.
_LOCAL_HOSTS = {"localhost", "127.0.0.1", "::1", "0.0.0.0", "testserver"}
_PUBLIC_HOSTS = [host for host in ALLOWED_HOSTS if host not in _LOCAL_HOSTS]


def _fail_configuration(message):
    from django.core.exceptions import ImproperlyConfigured

    raise ImproperlyConfigured(message)


if not RUNNING_TESTS:
    if DEBUG and _PUBLIC_HOSTS:
        # Se sirve un dominio publico pero nadie desactivo DEBUG: Django publicaria
        # trazas de error con configuracion y consultas SQL.
        _fail_configuration(
            f"DJANGO_ALLOWED_HOSTS declara hosts públicos ({', '.join(_PUBLIC_HOSTS)}) pero "
            "DJANGO_DEBUG sigue activo. Define DJANGO_DEBUG=false para desplegar."
        )
    if not DEBUG and SECRET_KEY == INSECURE_SECRET_KEY:
        _fail_configuration(
            "DJANGO_SECRET_KEY no está definida y DEBUG es False: define una clave larga y "
            "aleatoria antes de arrancar en producción (ver .env.example)."
        )

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
if RUNNING_TESTS or os.getenv("CACHE_BACKEND", "").lower() == "locmem" or (DEBUG and "REDIS_URL" not in os.environ):
    CACHES = {"default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"}}
else:
    CACHES = {"default": {"BACKEND": "django.core.cache.backends.redis.RedisCache", "LOCATION": f"{REDIS_URL}/1"}}

CELERY_BROKER_URL = os.getenv("CELERY_BROKER_URL", f"{REDIS_URL}/0")
CELERY_RESULT_BACKEND = os.getenv("CELERY_RESULT_BACKEND", CELERY_BROKER_URL)
CELERY_TASK_ALWAYS_EAGER = os.getenv("CELERY_TASK_ALWAYS_EAGER", "true" if RUNNING_TESTS else "false").lower() == "true"
CELERY_TASK_EAGER_PROPAGATES = True
CELERY_TASK_DEFAULT_RETRY_DELAY = 60
CELERY_TASK_TRACK_STARTED = True
# Si Redis no responde, `.delay()` debe fallar en segundos y no bloquear la
# petición HTTP que lo llamó: de eso dependen `send_email_async` y `notify_users`,
# que ya no despachan en un hilo aparte.
CELERY_BROKER_TRANSPORT_OPTIONS = {"socket_timeout": 2, "socket_connect_timeout": 2}
CELERY_BROKER_CONNECTION_RETRY_ON_STARTUP = True
CELERY_BROKER_CONNECTION_MAX_RETRIES = 1

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

# Copias de seguridad (ver docs/DEPLOYMENT.md). No se ejecutan solas: hay que programarlas.
BACKUP_DIR = Path(os.getenv("BACKUP_DIR", BASE_DIR / "backups"))
BACKUP_REMOTE_DIR = os.getenv("BACKUP_REMOTE_DIR", "")
BACKUP_KEEP_DAILY = int(os.getenv("BACKUP_KEEP_DAILY", "7"))
BACKUP_KEEP_WEEKLY = int(os.getenv("BACKUP_KEEP_WEEKLY", "4"))
BACKUP_KEEP_MONTHLY = int(os.getenv("BACKUP_KEEP_MONTHLY", "12"))

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
        # Los errores de la API no se persistian en ningun sitio: iban al handler
        # de consola por defecto, que en Windows usa cp1252 y revienta con
        # UnicodeEncodeError al registrar una traza con acentos.
        "error_file": {
            "class": "logging.FileHandler",
            "filename": LOG_DIR / "errors.log",
            "encoding": "utf-8",
            "level": "WARNING",
        },
    },
    "loggers": {
        "audit": {
            "handlers": ["audit_file"],
            "level": "INFO",
            "propagate": False,
        },
        "django.request": {
            "handlers": ["error_file"],
            "level": "WARNING",
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
    # Los esquemas de seguridad (CookieAuth y BearerAuth) los declara
    # `apps.authentication.cookie_auth.CookieJWTAuthenticationScheme` a partir de
    # la clase de autenticación real, para que no se dupliquen ni se desalineen.
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

# Origenes del frontend. En desarrollo el proxy de Vite mantiene todo en el mismo
# origen; en produccion se declaran con FRONTEND_ORIGINS (lista separada por comas)
# para no tener que editar este archivo en cada despliegue.
_DEV_FRONTEND_ORIGINS = [
    "http://localhost:4173",
    "http://127.0.0.1:4173",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]
_configured_origins = [
    origin.strip().rstrip("/")
    for origin in os.getenv("FRONTEND_ORIGINS", "").split(",")
    if origin.strip()
]
if not _configured_origins and FRONTEND_URL:
    _configured_origins = [FRONTEND_URL]

CORS_ALLOW_ALL_ORIGINS = False
CORS_ALLOWED_ORIGINS = _configured_origins or _DEV_FRONTEND_ORIGINS
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOW_HEADERS = [
    "*",
]
CSRF_TRUSTED_ORIGINS = CORS_ALLOWED_ORIGINS

if not DEBUG and not _configured_origins and not RUNNING_TESTS:
    _fail_configuration(
        "Define FRONTEND_ORIGINS (o FRONTEND_URL) con el origen público del frontend: sin "
        "él CORS y CSRF rechazarían todas las peticiones del cliente en producción."
    )

# El frontend y la API pueden vivir en dominios distintos (ver VITE_API_ORIGIN en
# docs/DEPLOYMENT.md). En ese caso la cookie es cross-site y necesita
# `SameSite=None; Secure`; con `Lax` el navegador no la enviaria.
_SPLIT_DOMAIN = os.getenv("CROSS_SITE_COOKIES", "").lower() == "true"
_COOKIE_SAMESITE = "None" if _SPLIT_DOMAIN else "Lax"
SESSION_COOKIE_SAMESITE = _COOKIE_SAMESITE
CSRF_COOKIE_SAMESITE = _COOKIE_SAMESITE
SESSION_COOKIE_SECURE = False
CSRF_COOKIE_SECURE = False

if _SPLIT_DOMAIN and not DEBUG:
    # SameSite=None sin Secure es ignorado por los navegadores.
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True

if not DEBUG:
    # El cliente de pruebas habla HTTP: con el redirect activo toda la suite
    # recibiria 301 y no se podria validar la configuracion de produccion.
    SECURE_SSL_REDIRECT = not RUNNING_TESTS
    SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_HSTS_SECONDS = 31536000
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True
    SECURE_CONTENT_TYPE_NOSNIFF = True
    SECURE_REFERRER_POLICY = "same-origin"
