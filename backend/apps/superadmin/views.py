from django.http import JsonResponse
from rest_framework import filters, status, viewsets
from rest_framework.permissions import AllowAny
from rest_framework.views import APIView

from apps.authentication.models import ROLES, Usuario
from apps.authentication.serializers import SuperAdminUserSerializer

from .models import Asignatura, Carrera, Ces, Escuela, IdentidadVisual, Municipio, Provincia
from .permissions import IsSuperAdmin
from .serializers import (
    AsignaturaSerializer,
    CarreraSerializer,
    CesSerializer,
    EscuelaSerializer,
    IdentidadVisualSerializer,
    IdentidadVisualUpdateSerializer,
    MunicipioSerializer,
    ProvinciaSerializer,
)


class ProvinciaViewSet(viewsets.ModelViewSet):
    queryset = Provincia.objects.all().order_by("nombre")
    serializer_class = ProvinciaSerializer
    permission_classes = [IsSuperAdmin]


class MunicipioViewSet(viewsets.ModelViewSet):
    serializer_class = MunicipioSerializer
    permission_classes = [IsSuperAdmin]
    filter_backends = [filters.SearchFilter]
    search_fields = ["nombre"]

    def get_queryset(self):
        queryset = Municipio.objects.all().order_by("nombre")
        provincia_id = self.request.query_params.get("provincia")
        if provincia_id:
            queryset = queryset.filter(provincia_id=provincia_id)
        return queryset


class EscuelaViewSet(viewsets.ModelViewSet):
    serializer_class = EscuelaSerializer
    permission_classes = [IsSuperAdmin]
    filter_backends = [filters.SearchFilter]
    search_fields = ["nombre", "codigo"]

    def get_queryset(self):
        queryset = Escuela.objects.all().order_by("nombre")
        municipio_id = self.request.query_params.get("municipio")
        if municipio_id:
            queryset = queryset.filter(municipio_id=municipio_id)
        return queryset


class CesViewSet(viewsets.ModelViewSet):
    queryset = Ces.objects.all().order_by("nombre")
    serializer_class = CesSerializer
    permission_classes = [IsSuperAdmin]


class CarreraViewSet(viewsets.ModelViewSet):
    queryset = Carrera.objects.all().order_by("nombre")
    serializer_class = CarreraSerializer
    permission_classes = [IsSuperAdmin]


class AsignaturaViewSet(viewsets.ModelViewSet):
    queryset = Asignatura.objects.all().order_by("nombre")
    serializer_class = AsignaturaSerializer
    permission_classes = [IsSuperAdmin]


class SuperAdminUserViewSet(viewsets.ModelViewSet):
    serializer_class = SuperAdminUserSerializer
    permission_classes = [IsSuperAdmin]
    filter_backends = [filters.SearchFilter]
    search_fields = ["username", "first_name", "last_name", "email"]

    def get_queryset(self):
        queryset = Usuario.objects.select_related(
            "provincia", "municipio", "escuela"
        ).all().order_by("username")
        role = self.request.query_params.get("rol")
        provincia = self.request.query_params.get("provincia")
        estado = self.request.query_params.get("estado")
        if role:
            queryset = queryset.filter(rol=role)
        if provincia:
            queryset = queryset.filter(provincia_id=provincia)
        if estado == "activo":
            queryset = queryset.filter(is_active=True)
        elif estado == "inactivo":
            queryset = queryset.filter(is_active=False)
        return queryset


class SuperAdminDashboard(APIView):
    permission_classes = [IsSuperAdmin]

    def get(self, request):
        return JsonResponse(
            {
                "provincias_activas": Provincia.objects.filter(activa=True).count(),
                "provincias_total": Provincia.objects.count(),
                "roles_definidos": len(ROLES),
                "usuarios_totales": Usuario.objects.count(),
                "nomencladores": {
                    "provincias": Provincia.objects.count(),
                    "municipios": Municipio.objects.count(),
                    "escuelas": Escuela.objects.count(),
                    "carreras": Carrera.objects.count(),
                    "ces": Ces.objects.count(),
                    "asignaturas": Asignatura.objects.count(),
                },
            },
            status=status.HTTP_200_OK,
        )


class IdentidadVisualConfig(APIView):
    permission_classes = [IsSuperAdmin]

    def get_permissions(self):
        if self.request.method == "GET":
            return [AllowAny()]
        return [IsSuperAdmin()]

    def get(self, request):
        config, _ = IdentidadVisual.objects.get_or_create(pk=1)
        return JsonResponse({"config": IdentidadVisualSerializer(config).data})

    def put(self, request):
        config, _ = IdentidadVisual.objects.get_or_create(pk=1)
        serializer = IdentidadVisualUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        for field, value in serializer.validated_data.items():
            setattr(config, field, value)
        config.save()
        return JsonResponse({"config": IdentidadVisualSerializer(config).data})
