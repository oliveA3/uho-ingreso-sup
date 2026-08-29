from rest_framework.permissions import BasePermission


class CanManageEscalafon(BasePermission):
    message = "No tienes permiso para gestionar el escalafón."

    def has_permission(self, request, view):
        user = request.user
        return bool(user and user.is_authenticated and (user.is_superuser or user.rol in {"secretario_escuela", "director_escuela", "jefe_comision", "estudiante", "superadmin"}))


class CanViewStudentsWithoutAccount(BasePermission):
    message = "No tienes permiso para consultar estudiantes sin cuenta."

    def has_permission(self, request, view):
        user = request.user
        return bool(user and user.is_authenticated and (user.is_superuser or user.rol in {"secretario_escuela", "director_escuela"}) and user.escuela_id)


class IsSchoolSecretary(BasePermission):
    message = "Solo el Secretario de Escuela puede gestionar boletas de solicitud."

    def has_permission(self, request, view):
        user = request.user
        return bool(user and user.is_authenticated and (user.is_superuser or user.rol == "secretario_escuela") and user.escuela_id)
