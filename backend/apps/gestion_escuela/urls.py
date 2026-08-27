from django.urls import path

from .views import StudentsWithoutAccountView


urlpatterns = [
    path("estudiantes/sin-cuenta/", StudentsWithoutAccountView.as_view(), name="students-without-account"),
]