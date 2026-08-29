from django.urls import path

from .views import (
    AuditLogListView,
    HealthCheckView,
    RoleAdminView,
    RoleListView,
    AuditLogExportView,
    AuditLogPdfView,
    NotificationListView,
    NotificationReadView,
)

urlpatterns = [
    path("health/", HealthCheckView.as_view(), name="healthcheck"),
    path("logs/", AuditLogListView.as_view(), name="audit-logs"),
    path("logs/export/", AuditLogExportView.as_view(), name="audit-logs-export"),
    path("logs/export/pdf/", AuditLogPdfView.as_view(), name="audit-logs-pdf"),
    path("notificaciones/", NotificationListView.as_view(), name="notifications"),
    path("notificaciones/<int:pk>/leer/", NotificationReadView.as_view(), name="notification-read"),
]
