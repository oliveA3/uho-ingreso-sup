from django.urls import path

from .views import NomencladoresHealthCheckView

urlpatterns = [
    path("health/", NomencladoresHealthCheckView.as_view(), name="nomencladores_health"),
]
