from rest_framework import exceptions
from rest_framework.authentication import CSRFCheck
from rest_framework_simplejwt.authentication import JWTAuthentication
from drf_spectacular.extensions import OpenApiAuthenticationExtension

from .cookies import ACCESS_COOKIE_NAME, REFRESH_COOKIE_NAME

PASSWORD_CHANGE_ALLOWED_SUFFIXES = ("/authentication/change-password", "/authentication/me", "/authentication/logout", "/authentication/csrf", "/authentication/token/refresh")


def _dummy_get_response(request):
    return None


class CookieJWTAuthentication(JWTAuthentication):
    """Reads the access token from an httpOnly cookie instead of the Authorization header.

    Unlike a bearer token, a cookie is sent automatically by the browser on
    every request, so state-changing requests must be validated against the
    CSRF token the same way session authentication is, otherwise a
    cross-site request could ride on the cookie.
    """

    def authenticate(self, request):
        raw_token = request.COOKIES.get(ACCESS_COOKIE_NAME)
        if raw_token is None:
            return super().authenticate(request)

        validated_token = self.get_validated_token(raw_token)
        user = self.get_user(validated_token)
        if request.method not in {"GET", "HEAD", "OPTIONS"}:
            self.enforce_csrf(request)
        self.enforce_password_change(request, user)
        return user, validated_token

    def enforce_password_change(self, request, user):
        """Un usuario con contraseña temporal solo puede cambiarla, ver su sesión o cerrarla."""
        if user.debe_cambiar_password and not request.path.rstrip("/").endswith(PASSWORD_CHANGE_ALLOWED_SUFFIXES):
            raise exceptions.PermissionDenied("Debes cambiar tu contraseña temporal antes de continuar.")

    def enforce_csrf(self, request):
        check = CSRFCheck(_dummy_get_response)
        check.process_request(request)
        reason = check.process_view(request, None, (), {})
        if reason:
            raise exceptions.PermissionDenied(f"CSRF Failed: {reason}")


class CookieJWTAuthenticationScheme(OpenApiAuthenticationExtension):
    """Declara en OpenAPI los dos mecanismos que `CookieJWTAuthentication` acepta.

    `authenticate()` lee primero la cookie HttpOnly y, si no está presente,
    delega en `JWTAuthentication`, que lee el header `Authorization`. Declarar
    solo uno de los dos dejaría la documentación desalineada del código.
    """

    target_class = "apps.authentication.cookie_auth.CookieJWTAuthentication"
    name = ["CookieAuth", "BearerAuth"]

    def get_security_requirement(self, auto_schema):
        # Lista de dicts => alternativas (OR): basta la cookie o basta el header.
        return [{"CookieAuth": []}, {"BearerAuth": []}]

    def get_security_definition(self, auto_schema):
        return [
            {
                "type": "apiKey",
                "in": "cookie",
                "name": ACCESS_COOKIE_NAME,
                "description": (
                    f"Cookie HttpOnly `{ACCESS_COOKIE_NAME}` con el JWT de acceso; la establece "
                    f"`POST /api/v1/authentication/login/` y la renueva "
                    f"`POST /api/v1/authentication/token/refresh/` a partir de la cookie "
                    f"`{REFRESH_COOKIE_NAME}`. Es el mecanismo que usa el cliente web y no es legible "
                    "desde JavaScript. Como el navegador la envía automáticamente, los métodos que "
                    "modifican estado (POST, PUT, PATCH, DELETE) exigen además el header `X-CSRFToken` "
                    "con el valor de la cookie `csrftoken`, que se obtiene en "
                    "`GET /api/v1/authentication/csrf/`."
                ),
            },
            {
                "type": "http",
                "scheme": "bearer",
                "bearerFormat": "JWT",
                "description": (
                    "Header `Authorization: Bearer <access>` con el JWT emitido al iniciar sesión. "
                    "Alternativa para clientes no navegador (integraciones servidor a servidor), que "
                    "no requiere CSRF porque el token se envía de forma explícita."
                ),
            },
        ]
