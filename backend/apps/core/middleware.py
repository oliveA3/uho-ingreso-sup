from .audit import build_audit_action, record_audit


class AuditMiddleware:
    excluded_prefixes = ("/api/core/logs", "/admin/jsi18n")

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
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
            )
        return response
