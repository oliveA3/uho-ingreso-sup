from django.conf import settings

ACCESS_COOKIE_NAME = "ingresosup_access"
REFRESH_COOKIE_NAME = "ingresosup_refresh"


def set_auth_cookies(response, access=None, refresh=None):
    """Stores JWTs as httpOnly cookies so they are inaccessible to page scripts (XSS)."""
    common = {
        "httponly": True,
        "secure": settings.CSRF_COOKIE_SECURE,
        "samesite": settings.CSRF_COOKIE_SAMESITE,
        "path": "/",
    }
    if access is not None:
        response.set_cookie(
            ACCESS_COOKIE_NAME,
            access,
            max_age=int(settings.SIMPLE_JWT["ACCESS_TOKEN_LIFETIME"].total_seconds()),
            **common,
        )
    if refresh is not None:
        response.set_cookie(
            REFRESH_COOKIE_NAME,
            refresh,
            max_age=int(settings.SIMPLE_JWT["REFRESH_TOKEN_LIFETIME"].total_seconds()),
            **common,
        )


def clear_auth_cookies(response):
    response.delete_cookie(ACCESS_COOKIE_NAME, path="/")
    response.delete_cookie(REFRESH_COOKIE_NAME, path="/")
