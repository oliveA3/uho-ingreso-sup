import json

from .audit import build_audit_action, record_audit, sanitize_audit_data
from apps.authentication.cookie_auth import CookieJWTAuthentication


class AuditMiddleware:
    excluded_prefixes = ("/api/v1/core/logs", "/admin/jsi18n")

    def __init__(self, get_response):
        self.get_response = get_response

    @staticmethod
    def _capture_json_audit_data(request):
        if request.method not in {"POST", "PUT", "PATCH"} or request.content_type != "application/json":
            return
        try:
            content_length = int(request.META.get("CONTENT_LENGTH") or 0)
        except (TypeError, ValueError):
            content_length = 0
        if content_length > 1024 * 1024:
            return
        try:
            request._audit_data = json.loads(request.body or b"{}")
        except (TypeError, ValueError, UnicodeDecodeError):
            request._audit_data = {}

    def __call__(self, request):
        if not request.user.is_authenticated:
            try:
                authenticated = CookieJWTAuthentication().authenticate(request)
                if authenticated:
                    request.user, request.auth = authenticated
            except Exception:
                pass
        self._capture_json_audit_data(request)
        response = self.get_response(request)
        if (
            request.user.is_authenticated
            and request.path.startswith("/api/")
            and not request.path.startswith(self.excluded_prefixes)
        ):
            audit_data = getattr(request, "_audit_data", None)
            if audit_data is None:
                audit_data = request.POST
            record_audit(
                request.user,
                build_audit_action(request),
                request.path,
                request=request,
                new={
                    "request": sanitize_audit_data(audit_data),
                    "http_status": response.status_code,
                },
            )
        return response
