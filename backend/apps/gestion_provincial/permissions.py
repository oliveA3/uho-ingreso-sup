from rest_framework.permissions import BasePermission


class IsProvincialRepresentative(BasePermission):
    message = "Solo un representante provincial puede gestionar esta información."

    def has_permission(self, request, view):
        user = request.user
        return bool(
            user
            and user.is_authenticated
            and (user.is_superuser or user.rol in {"ingreso_provincial", "superadmin"})
        )


class IsCareerManager(BasePermission):
    message = "No tienes permiso para gestionar el catálogo de carreras."

    def has_permission(self, request, view):
        user = request.user
        return bool(
            user
            and user.is_authenticated
            and (
                user.is_superuser
                or user.rol in {"superadmin", "jefe_comision", "ingreso_provincial"}
            )
        )