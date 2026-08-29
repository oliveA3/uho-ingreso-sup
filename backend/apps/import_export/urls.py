from django.urls import path
from .views import (
    EscalafonEntryView, EscalafonListView, EscalafonSendView, EscalafonTemplateView,
    EscalafonReviewView, ProvincialEscalafonSummaryView, ProvincialEscalafonExportView,
    ExportCarrerasView, ExportEscalafonView, ImportCarrerasView, ImportEscalafonView,
    ImportPlanPlazaView, ImportPlanPlazaExportView, PlanPlazaTemplateView,
    ImportOtorgamientoView, StudentEscalafonActionView,
)

urlpatterns = [
    path("import/plan-plaza/", ImportPlanPlazaView.as_view(), name="import-plan-plaza"),
    path("export/plan-plaza/", ImportPlanPlazaExportView.as_view(), name="export-plan-plaza"),
    path("export/plan-plaza/plantilla/", PlanPlazaTemplateView.as_view(), name="plan-plaza-template"),
    path("import/otorgamiento/", ImportOtorgamientoView.as_view(), name="import-otorgamiento"),
    path("import/carreras/", ImportCarrerasView.as_view(), name="import-carreras"),
    path("export/carreras/", ExportCarrerasView.as_view(), name="export-carreras"),
    path("import/escalafon/", ImportEscalafonView.as_view(), name="import-escalafon"),
    path("export/escalafon/", ExportEscalafonView.as_view(), name="export-escalafon"),
    path("escalafon/", EscalafonListView.as_view(), name="escalafon-list"),
    path("escalafon/resumen-provincial/", ProvincialEscalafonSummaryView.as_view(), name="escalafon-summary-provincial"),
    path("escalafon/exportar-provincial/", ProvincialEscalafonExportView.as_view(), name="escalafon-export-provincial"),
    path("escalafon/plantilla/", EscalafonTemplateView.as_view(), name="escalafon-template"),
    path("escalafon/<int:pk>/", EscalafonEntryView.as_view(), name="escalafon-entry"),
    path("escalafon/<int:pk>/revisar/", EscalafonReviewView.as_view(), name="escalafon-review"),
    path("escalafon/enviar-comision/", EscalafonSendView.as_view(), name="escalafon-send"),
    path("escalafon/mi-accion/<str:action>/", StudentEscalafonActionView.as_view(), name="student-escalafon-action"),
]
