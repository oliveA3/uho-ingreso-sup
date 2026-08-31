from django.urls import path

from .views import StudentDashboardView, StudentExamConfirmationView, StudentInterestEditView, StudentInterestItemView, StudentInterestSendView, StudentInterestView, StudentSolicitudEditView, StudentSolicitudPdfView, StudentSolicitudView


urlpatterns = [
    path("estudiante/dashboard/", StudentDashboardView.as_view(), name="student-dashboard"),
    path("estudiante/boleta-interes/", StudentInterestView.as_view(), name="student-interest"),
    path("estudiante/boleta-interes/items/", StudentInterestItemView.as_view(), name="student-interest-item"),
    path("estudiante/boleta-interes/items/<int:item_id>/", StudentInterestItemView.as_view(), name="student-interest-item-detail"),
    path("estudiante/boleta-interes/enviar/", StudentInterestSendView.as_view(), name="student-interest-send"),
    path("estudiante/boleta-interes/editar/", StudentInterestEditView.as_view(), name="student-interest-edit"),
    path("estudiante/boleta-solicitud/", StudentSolicitudView.as_view(), name="student-solicitud"),
    path("estudiante/boleta-solicitud/editar/", StudentSolicitudEditView.as_view(), name="student-solicitud-edit"),
    path("estudiante/boleta-solicitud/pdf/", StudentSolicitudPdfView.as_view(), name="student-solicitud-pdf"),
    path("estudiante/confirmacion-pruebas/", StudentExamConfirmationView.as_view(), name="student-exam-confirmation"),
]