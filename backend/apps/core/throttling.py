from rest_framework.throttling import AnonRateThrottle, UserRateThrottle


class AuthenticationRateThrottle(AnonRateThrottle):
    scope = "authentication"

    def get_cache_key(self, request, view):
        key = super().get_cache_key(request, view)
        return f"{key}:{request.path}" if key else None


class BulkOperationRateThrottle(UserRateThrottle):
    scope = "bulk_operations"