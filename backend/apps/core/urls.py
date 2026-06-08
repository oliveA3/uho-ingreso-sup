from django.urls import path

from .views import (
    AuditLogListView,
    HealthCheckView,
    RoleAdminView,
    RoleListView,
    UserRoleUpdateView,
)

urlpatterns = [
    path("health/", HealthCheckView.as_view(), name="healthcheck"),
    path("roles/", RoleListView.as_view(), name="role_list"),
    path("roles/admin/", RoleAdminView.as_view(), name="role_admin"),
    path("users/<int:user_id>/assign-role/", UserRoleUpdateView.as_view(), name="assign_role"),
    path("audit/logs/", AuditLogListView.as_view(), name="audit_logs"),
]
