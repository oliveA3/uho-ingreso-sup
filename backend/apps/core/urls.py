from django.urls import path

from .views import (
    AuditLogListView,
    HealthCheckView,
    RoleAdminView,
    RoleListView,
)

urlpatterns = [
    path("health/", HealthCheckView.as_view(), name="healthcheck"),
]
