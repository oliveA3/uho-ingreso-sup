from django.urls import path

from .views import SchoolDashboardView, SchoolExamConfirmationMetricsView, SchoolInterestMetricsView, SchoolSolicitudView, StudentsWithoutAccountView


urlpatterns = [
    path("estudiantes/sin-cuenta/", StudentsWithoutAccountView.as_view(), name="students-without-account"),
    path("dashboard/", SchoolDashboardView.as_view(), name="school-dashboard"),
    path("boleta-interes/metricas/", SchoolInterestMetricsView.as_view(), name="school-interest-metrics"),
    path("confirmacion-pruebas/metricas/", SchoolExamConfirmationMetricsView.as_view(), name="school-exam-confirmation-metrics"),
    path("boletas-solicitud/", SchoolSolicitudView.as_view(), name="school-solicitudes"),
    path("boletas-solicitud/<int:ballot_id>/aprobar/", SchoolSolicitudView.as_view(), name="school-solicitud-approve"),
]