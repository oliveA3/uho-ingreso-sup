from django.urls import path

from .views import ProcesoHealthCheckView

urlpatterns = [
    path("health/", ProcesoHealthCheckView.as_view(), name="proceso_health"),
]
