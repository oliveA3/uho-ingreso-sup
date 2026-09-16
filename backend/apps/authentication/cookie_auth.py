from rest_framework import exceptions
from rest_framework.authentication import CSRFCheck
from rest_framework_simplejwt.authentication import JWTAuthentication

from .cookies import ACCESS_COOKIE_NAME


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
        self.enforce_csrf(request)
        return user, validated_token

    def enforce_csrf(self, request):
        check = CSRFCheck(_dummy_get_response)
        check.process_request(request)
        reason = check.process_view(request, None, (), {})
        if reason:
            raise exceptions.PermissionDenied(f"CSRF Failed: {reason}")
