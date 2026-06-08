from rest_framework.permissions import BasePermission


class IsSuperAdmin(BasePermission):
    message = "Se requiere rol Super Administrador."

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        try:
            return getattr(user.rol, 'name', '').lower() == 'super administrador'
        except Exception:
            return False
