from rest_framework import permissions

ROLE_HIERARCHY = {
    "Super Administrador": 100,
    "Jefe de Comisión de Ingreso": 90,
    "Representante Provincial": 80,
    "Representante Municipal": 70,
    "Director de Escuela": 60,
    "Secretario de Escuela": 50,
    "Estudiante": 10,
}


class IsSuperAdmin(permissions.BasePermission):
    """Permite solo a Super Administrador acceder a vistas de administración de roles."""

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and getattr(request.user.rol, "name", "").lower() == "super administrador"
        )


class IsRoleHierarchyHigher(permissions.BasePermission):
    """Permite acciones si el rol del usuario es jerárquicamente superior."""

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        target_role_name = getattr(view, "target_role_name", None)
        if not target_role_name:
            return True
        user_role_name = getattr(request.user.rol, "name", None)
        return ROLE_HIERARCHY.get(user_role_name, 0) > ROLE_HIERARCHY.get(target_role_name, 0)


class HasRolePermission(permissions.BasePermission):
    """Verifica permisos específicos asociados al rol del usuario."""

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if getattr(request.user, "is_superuser", False):
            return True
        required = getattr(view, "required_permission", None)
        if required is None:
            return True
        permissions_list = getattr(request.user.rol, "permissions", []) or []
        return required in permissions_list


class CanViewAuthenticatedResource(permissions.IsAuthenticated):
    """Extiende la autenticación para recursos internos del API."""

    pass


# Placeholder para permisos de escalafón, boletas y reportes.
# En futuras iteraciones se pueden añadir permisos específicos como:
# - IsCommissionChief
# - HasSchoolAssignment
