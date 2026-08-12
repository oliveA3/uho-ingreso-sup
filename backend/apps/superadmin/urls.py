from django.urls import path

from .views import (
    IdentidadVisualConfig,
    ProvinciaViewSet,
    MunicipioViewSet,
    EscuelaViewSet
)

urlpatterns = [
    path("provincias/", ProvinciaViewSet.as_view({"get": "list"}), name="provincias"),
    path("municipios/", MunicipioViewSet.as_view({"get": "list"}), name="municipios"),
    path("escuelas/", EscuelaViewSet.as_view({"get": "list"}), name="escuelas"),
    path("dashboard/", IdentidadVisualConfig.as_view(),
         name="identidad-visual-config"),
]
