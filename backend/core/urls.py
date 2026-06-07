from django.urls import path

from .views import (
    AuditLogListView,
    CurrentUserView,
    HealthCheckView,
    LoginView,
    LogoutView,
    RegisterView,
    RoleAdminView,
    RoleListView,
    UserRoleUpdateView,
)

urlpatterns = [
    path("health/", HealthCheckView.as_view(), name="healthcheck"),
    path("auth/login/", LoginView.as_view(), name="login"),
    path("auth/register/", RegisterView.as_view(), name="register"),
    path("auth/logout/", LogoutView.as_view(), name="logout"),
    path("auth/me/", CurrentUserView.as_view(), name="current_user"),
    path("roles/", RoleListView.as_view(), name="role_list"),
    path("roles/admin/", RoleAdminView.as_view(), name="role_admin"),
    path("users/<int:user_id>/assign-role/", UserRoleUpdateView.as_view(), name="assign_role"),
    path("audit/logs/", AuditLogListView.as_view(), name="audit_logs"),
]
