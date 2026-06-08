from django.urls import path

from .views import ReportesHealthCheckView

urlpatterns = [
    path("health/", ReportesHealthCheckView.as_view(), name="reportes_health"),
]
