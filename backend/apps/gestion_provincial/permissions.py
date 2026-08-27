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


class IsCommissionChief(BasePermission):
    message = "Solo el jefe de comisión puede gestionar las etapas."

    def has_permission(self, request, view):
        user = request.user
        return bool(
            user
            and user.is_authenticated
            and (user.is_superuser or user.rol in {"jefe_comision", "superadmin"})
        )


class CanViewProvincialDashboard(BasePermission):
    message = "No tienes permiso para consultar el dashboard provincial."

    def has_permission(self, request, view):
        user = request.user
        return bool(
            user
            and user.is_authenticated
            and (
                user.is_superuser
                or user.rol in {"jefe_comision", "ingreso_provincial", "superadmin"}
            )
        )


class CanAccessEscalafon(BasePermission):
    message = "El escalafón solo está disponible durante la etapa 1."

    def has_permission(self, request, view):
        user = request.user
        return bool(
            user
            and user.is_authenticated
            and (user.is_superuser or user.rol in {"jefe_comision", "secretario_escuela", "director_escuela", "estudiante", "superadmin"})
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