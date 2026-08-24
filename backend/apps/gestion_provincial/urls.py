from django.urls import path

from .views import (
    ProvincialDashboardView,
    ProvincialEscuelaViewSet,
    ProvincialMunicipioViewSet,
    ProvincialProvinciaViewSet,
    ProvincialUserViewSet,
    ProvincialCarreraViewSet,
    ProvincialCesViewSet,
)

urlpatterns = [
    path("dashboard/", ProvincialDashboardView.as_view(), name="provincial-dashboard"),
    path("municipios/", ProvincialMunicipioViewSet.as_view({"get": "list"}), name="provincial-municipios"),
    path("provincias/", ProvincialProvinciaViewSet.as_view({"get": "list"}), name="provincial-provincias"),
    path("escuelas/", ProvincialEscuelaViewSet.as_view({"get": "list", "post": "create"}), name="provincial-escuelas"),
    path("escuelas/<int:pk>/", ProvincialEscuelaViewSet.as_view({"get": "retrieve", "patch": "partial_update", "delete": "destroy"}), name="provincial-escuela-detail"),
    path("usuarios/", ProvincialUserViewSet.as_view({"get": "list", "post": "create"}), name="provincial-usuarios"),
    path("usuarios/<int:pk>/", ProvincialUserViewSet.as_view({"get": "retrieve", "patch": "partial_update", "delete": "destroy"}), name="provincial-usuario-detail"),
    path("carreras/", ProvincialCarreraViewSet.as_view({"get": "list", "post": "create"}), name="provincial-carreras"),
    path("carreras/<int:pk>/", ProvincialCarreraViewSet.as_view({"get": "retrieve", "patch": "partial_update", "delete": "destroy"}), name="provincial-carrera-detail"),
    path("ces/", ProvincialCesViewSet.as_view({"get": "list"}), name="provincial-ces"),
]