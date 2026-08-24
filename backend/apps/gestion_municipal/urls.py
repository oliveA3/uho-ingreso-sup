from django.urls import path

from .views import MunicipalEscuelaViewSet, MunicipalUserViewSet

urlpatterns = [
    path("escuelas/", MunicipalEscuelaViewSet.as_view({"get": "list", "post": "create"}), name="municipal-escuelas"),
    path("escuelas/<int:pk>/", MunicipalEscuelaViewSet.as_view({"get": "retrieve", "patch": "partial_update", "delete": "destroy"}), name="municipal-escuela-detail"),
    path("usuarios/", MunicipalUserViewSet.as_view({"get": "list", "post": "create"}), name="municipal-usuarios"),
    path("usuarios/<int:pk>/", MunicipalUserViewSet.as_view({"get": "retrieve", "patch": "partial_update", "delete": "destroy"}), name="municipal-usuario-detail"),
]