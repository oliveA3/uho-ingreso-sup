from rest_framework import filters, status, viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.authentication.models import Estudiante, ROLES, Usuario
from apps.authentication.serializers import SuperAdminUserSerializer
from apps.core.responses import api_success

from .mixins import SoftDeleteModelMixin
from .models import Asignatura, Carrera, Ces, Escuela, IdentidadVisual, Municipio, Provincia, TipoOtorgamiento
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
    TipoOtorgamientoSerializer,
)


class ProvinciaViewSet(SoftDeleteModelMixin, viewsets.ModelViewSet):
    queryset = Provincia.objects.all().order_by("nombre")
    serializer_class = ProvinciaSerializer
    permission_classes = [IsSuperAdmin]
    active_field = "activa"

    def get_permissions(self):
        return [IsSuperAdmin()]


class MunicipioViewSet(SoftDeleteModelMixin, viewsets.ModelViewSet):
    serializer_class = MunicipioSerializer
    permission_classes = [IsSuperAdmin]
    filter_backends = [filters.SearchFilter]
    search_fields = ["nombre"]
    active_field = "activo"

    def get_permissions(self):
        return [IsSuperAdmin()]

    def get_queryset(self):
        queryset = Municipio.objects.all().order_by("nombre")
        provincia_id = self.request.query_params.get("provincia")
        if provincia_id:
            queryset = queryset.filter(provincia_id=provincia_id)
        return queryset


class EscuelaViewSet(SoftDeleteModelMixin, viewsets.ModelViewSet):
    serializer_class = EscuelaSerializer
    permission_classes = [IsSuperAdmin]
    filter_backends = [filters.SearchFilter]
    search_fields = ["nombre", "codigo"]
    active_field = "activa"

    def get_permissions(self):
        return [IsSuperAdmin()]

    def get_queryset(self):
        queryset = Escuela.objects.all().order_by("nombre")
        municipio_id = self.request.query_params.get("municipio")
        if municipio_id:
            queryset = queryset.filter(municipio_id=municipio_id)
        return queryset


class CesViewSet(SoftDeleteModelMixin, viewsets.ModelViewSet):
    queryset = Ces.objects.all().order_by("nombre")
    serializer_class = CesSerializer
    permission_classes = [IsSuperAdmin]
    active_field = "activa"


class CarreraViewSet(SoftDeleteModelMixin, viewsets.ModelViewSet):
    queryset = Carrera.objects.all().order_by("nombre")
    serializer_class = CarreraSerializer
    permission_classes = [IsSuperAdmin]
    active_field = "activa"


class AsignaturaViewSet(SoftDeleteModelMixin, viewsets.ModelViewSet):
    queryset = Asignatura.objects.all().order_by("nombre")
    serializer_class = AsignaturaSerializer
    permission_classes = [IsSuperAdmin]
    active_field = "activa"


class TipoOtorgamientoViewSet(SoftDeleteModelMixin, viewsets.ModelViewSet):
    queryset = TipoOtorgamiento.objects.all().order_by("nombre")
    serializer_class = TipoOtorgamientoSerializer
    permission_classes = [IsSuperAdmin]
    active_field = "activa"


class SuperAdminUserViewSet(viewsets.ModelViewSet):
    serializer_class = SuperAdminUserSerializer
    permission_classes = [IsSuperAdmin]
    filter_backends = [filters.SearchFilter]
    search_fields = ["username", "first_name", "last_name", "email"]

    def get_queryset(self):
        queryset = Usuario.objects.select_related(
            "provincia", "municipio", "escuela"
        ).exclude(rol="estudiante").order_by("username")
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


class SuperAdminStudentViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsSuperAdmin]

    def list(self, request, *args, **kwargs):
        queryset = Estudiante.objects.select_related(
            "usuario", "escuela__municipio__provincia"
        ).prefetch_related("escalafones__escalafon__proceso")
        anio = request.query_params.get("anio")
        provincia = request.query_params.get("provincia")
        ci = request.query_params.get("ci", "").strip()
        if anio:
            queryset = queryset.filter(escalafones__escalafon__proceso__anio__year=anio)
        if provincia:
            queryset = queryset.filter(escuela__municipio__provincia_id=provincia)
        if ci:
            queryset = queryset.filter(ci__icontains=ci)
        queryset = queryset.distinct().order_by("apellidos", "nombre", "ci")
        data = []
        for student in queryset:
            years = sorted({
                item.escalafon.proceso.anio.year
                for item in student.escalafones.all()
                if item.escalafon.proceso_id
            }, reverse=True)
            account = student.usuario
            data.append({
                "id": student.id,
                "ci": student.ci,
                "nombre": student.nombre,
                "apellidos": student.apellidos,
                "sexo": student.sexo,
                "email": account.email if account else "",
                "username": account.username if account else "",
                "user_id": account.id if account else None,
                "is_active": bool(account and account.is_active),
                "has_account": bool(account),
                "escuela": student.escuela.nombre,
                "provincia": student.escuela.municipio.provincia.nombre,
                "provincia_id": student.escuela.municipio.provincia_id,
                "anios": years,
            })
        return Response(data)


class SuperAdminDashboard(APIView):
    permission_classes = [IsSuperAdmin]

    def get(self, request):
        return api_success(
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
        return [IsSuperAdmin()]

    def get(self, request):
        config, _ = IdentidadVisual.objects.get_or_create(pk=1)
        return api_success({"config": IdentidadVisualSerializer(config).data})

    def put(self, request):
        config, _ = IdentidadVisual.objects.get_or_create(pk=1)
        serializer = IdentidadVisualUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        for field, value in serializer.validated_data.items():
            setattr(config, field, value)
        config.save()
        return api_success({"config": IdentidadVisualSerializer(config).data})
