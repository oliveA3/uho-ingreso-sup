from django.urls import path

from .views import EstudiantesHealthCheckView

urlpatterns = [
    path("health/", EstudiantesHealthCheckView.as_view(), name="estudiantes_health"),
]
