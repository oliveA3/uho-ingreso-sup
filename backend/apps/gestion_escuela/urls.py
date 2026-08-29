from django.urls import path

from .views import SchoolInterestMetricsView, SchoolSolicitudView, StudentsWithoutAccountView


urlpatterns = [
    path("estudiantes/sin-cuenta/", StudentsWithoutAccountView.as_view(), name="students-without-account"),
    path("boleta-interes/metricas/", SchoolInterestMetricsView.as_view(), name="school-interest-metrics"),
    path("boletas-solicitud/", SchoolSolicitudView.as_view(), name="school-solicitudes"),
    path("boletas-solicitud/<int:ballot_id>/aprobar/", SchoolSolicitudView.as_view(), name="school-solicitud-approve"),
]