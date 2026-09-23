from rest_framework import exceptions
from rest_framework.authentication import CSRFCheck
from rest_framework_simplejwt.authentication import JWTAuthentication
from drf_spectacular.extensions import OpenApiAuthenticationExtension

from .cookies import ACCESS_COOKIE_NAME

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
    target_class = "apps.authentication.cookie_auth.CookieJWTAuthentication"
    name = "BearerAuth"

    def get_security_definition(self, auto_schema):
        return {
            "type": "http",
            "scheme": "bearer",
            "bearerFormat": "JWT",
            "description": "Token JWT emitido al iniciar sesión. La aplicación también usa la cookie HttpOnly access_token para mantener la sesión autentica.",
        }
