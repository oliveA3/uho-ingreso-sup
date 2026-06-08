from django.urls import path

from .views import EscuelasHealthCheckView

urlpatterns = [
    path("health/", EscuelasHealthCheckView.as_view(), name="escuelas_health"),
]
