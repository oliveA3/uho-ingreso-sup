from django.urls import path

from .views import CarrerasHealthCheckView

urlpatterns = [
    path("health/", CarrerasHealthCheckView.as_view(), name="carreras_health"),
]
