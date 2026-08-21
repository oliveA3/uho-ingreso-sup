from django.urls import path

from .views import (
    AsignaturaViewSet,
    CarreraViewSet,
    CesViewSet,
    IdentidadVisualConfig,
    ProvinciaViewSet,
    MunicipioViewSet,
    EscuelaViewSet,
    SuperAdminDashboard,
    SuperAdminUserViewSet,
)

urlpatterns = [
    path("provincias/", ProvinciaViewSet.as_view({"get": "list", "post": "create"}), name="provincias"),
    path("provincias/<int:pk>/", ProvinciaViewSet.as_view({"get": "retrieve", "put": "update", "patch": "partial_update", "delete": "destroy"}), name="provincia-detail"),
    path("municipios/", MunicipioViewSet.as_view({"get": "list", "post": "create"}), name="municipios"),
    path("municipios/<int:pk>/", MunicipioViewSet.as_view({"get": "retrieve", "put": "update", "patch": "partial_update", "delete": "destroy"}), name="municipio-detail"),
    path("escuelas/", EscuelaViewSet.as_view({"get": "list", "post": "create"}), name="escuelas"),
    path("escuelas/<int:pk>/", EscuelaViewSet.as_view({"get": "retrieve", "put": "update", "patch": "partial_update", "delete": "destroy"}), name="escuela-detail"),
    path("ces/", CesViewSet.as_view({"get": "list", "post": "create"}), name="ces"),
    path("ces/<int:pk>/", CesViewSet.as_view({"get": "retrieve", "put": "update", "patch": "partial_update", "delete": "destroy"}), name="ces-detail"),
    path("carreras/", CarreraViewSet.as_view({"get": "list", "post": "create"}), name="carreras"),
    path("carreras/<int:pk>/", CarreraViewSet.as_view({"get": "retrieve", "put": "update", "patch": "partial_update", "delete": "destroy"}), name="carrera-detail"),
    path("asignaturas/", AsignaturaViewSet.as_view({"get": "list", "post": "create"}), name="asignaturas"),
    path("asignaturas/<int:pk>/", AsignaturaViewSet.as_view({"get": "retrieve", "put": "update", "patch": "partial_update", "delete": "destroy"}), name="asignatura-detail"),
    path("usuarios/", SuperAdminUserViewSet.as_view({"get": "list", "post": "create"}), name="superadmin-usuarios"),
    path("usuarios/<int:pk>/", SuperAdminUserViewSet.as_view({"get": "retrieve", "put": "update", "patch": "partial_update", "delete": "destroy"}), name="superadmin-usuario-detail"),
    path("dashboard/", SuperAdminDashboard.as_view(), name="superadmin-dashboard"),
    path("config/", IdentidadVisualConfig.as_view(), name="identidad-visual-config"),
]
