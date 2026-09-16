from .audit import build_audit_action, record_audit, sanitize_audit_data
from rest_framework_simplejwt.authentication import JWTAuthentication


class AuditMiddleware:
    excluded_prefixes = ("/api/core/logs", "/admin/jsi18n")

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if not request.user.is_authenticated:
            try:
                authenticated = JWTAuthentication().authenticate(request)
                if authenticated:
                    request.user, request.auth = authenticated
            except Exception:
                pass
        response = self.get_response(request)
        if (
            request.user.is_authenticated
            and request.path.startswith("/api/")
            and not request.path.startswith(self.excluded_prefixes)
        ):
            record_audit(
                request.user,
                build_audit_action(request),
                request.path,
                request=request,
                new={
                    "request": sanitize_audit_data(getattr(request, "data", request.POST)),
                    "http_status": response.status_code,
                },
            )
        return response
