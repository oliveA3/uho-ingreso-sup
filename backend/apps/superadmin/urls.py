from django.urls import path
from .views import SuperAdminDashboard

urlpatterns = [
    path("dashboard/", SuperAdminDashboard.as_view(), name="superadmin-dashboard"),
]
from django.urls import path

from .views import SuperAdminConfigView, SuperAdminDashboardMetricsView

urlpatterns = [
    path("dashboard/", SuperAdminDashboardMetricsView.as_view(), name="superadmin_dashboard"),
    path("config/", SuperAdminConfigView.as_view(), name="superadmin_config"),
]
