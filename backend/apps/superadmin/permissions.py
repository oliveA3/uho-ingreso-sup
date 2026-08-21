from rest_framework.permissions import BasePermission


class IsSuperAdmin(BasePermission):
	message = "Solo un superadministrador puede gestionar esta información."

	def has_permission(self, request, view):
		user = request.user
		return bool(
			user
			and user.is_authenticated
			and (user.is_superuser or user.rol == "superadmin")
		)
