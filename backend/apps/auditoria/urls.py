from django.urls import path

from .views import AuditoriaHealthCheckView

urlpatterns = [
    path("health/", AuditoriaHealthCheckView.as_view(), name="auditoria_health"),
]
