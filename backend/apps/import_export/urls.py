from django.urls import path
from .views import ImportPlanPlazaView, ImportOtorgamientoView

urlpatterns = [
    path("import/plan-plaza/", ImportPlanPlazaView.as_view(), name="import-plan-plaza"),
    path("import/otorgamiento/", ImportOtorgamientoView.as_view(), name="import-otorgamiento"),
]
