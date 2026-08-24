from django.urls import path
from .views import ExportCarrerasView, ImportCarrerasView, ImportPlanPlazaView, ImportOtorgamientoView

urlpatterns = [
    path("import/plan-plaza/", ImportPlanPlazaView.as_view(), name="import-plan-plaza"),
    path("import/otorgamiento/", ImportOtorgamientoView.as_view(), name="import-otorgamiento"),
    path("import/carreras/", ImportCarrerasView.as_view(), name="import-carreras"),
    path("export/carreras/", ExportCarrerasView.as_view(), name="export-carreras"),
]
