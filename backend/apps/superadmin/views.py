from drf_spectacular.utils import OpenApiExample, OpenApiParameter, extend_schema, inline_serializer
from rest_framework import filters, serializers, status, viewsets
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import AllowAny
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
    SuperAdminStudentSerializer,
    TipoOtorgamientoSerializer,
)


class CatalogPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 100


class ProvinciaViewSet(SoftDeleteModelMixin, viewsets.ModelViewSet):
    queryset = Provincia.objects.all().order_by("nombre")
    serializer_class = ProvinciaSerializer
    permission_classes = [IsSuperAdmin]
    pagination_class = CatalogPagination
    active_field = "activa"
    filter_backends = [filters.SearchFilter]
    search_fields = ["nombre", "descripcion"]

    def get_permissions(self):
        return [IsSuperAdmin()]


class MunicipioViewSet(SoftDeleteModelMixin, viewsets.ModelViewSet):
    serializer_class = MunicipioSerializer
    permission_classes = [IsSuperAdmin]
    pagination_class = CatalogPagination
    filter_backends = [filters.SearchFilter]
    search_fields = ["nombre", "descripcion"]
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
    pagination_class = CatalogPagination
    filter_backends = [filters.SearchFilter]
    search_fields = ["nombre", "codigo", "descripcion"]
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
    pagination_class = CatalogPagination
    filter_backends = [filters.SearchFilter]
    search_fields = ["nombre", "descripcion"]
    active_field = "activa"


class CarreraViewSet(SoftDeleteModelMixin, viewsets.ModelViewSet):
    queryset = Carrera.objects.all().order_by("nombre")
    serializer_class = CarreraSerializer
    permission_classes = [IsSuperAdmin]
    pagination_class = CatalogPagination
    filter_backends = [filters.SearchFilter]
    search_fields = ["codigo", "nombre", "descripcion"]
    active_field = "activa"


class AsignaturaViewSet(SoftDeleteModelMixin, viewsets.ModelViewSet):
    queryset = Asignatura.objects.all().order_by("nombre")
    serializer_class = AsignaturaSerializer
    permission_classes = [IsSuperAdmin]
    pagination_class = CatalogPagination
    filter_backends = [filters.SearchFilter]
    search_fields = ["nombre", "descripcion"]
    active_field = "activa"


class TipoOtorgamientoViewSet(SoftDeleteModelMixin, viewsets.ModelViewSet):
    queryset = TipoOtorgamiento.objects.all().order_by("nombre")
    serializer_class = TipoOtorgamientoSerializer
    permission_classes = [IsSuperAdmin]
    pagination_class = CatalogPagination
    filter_backends = [filters.SearchFilter]
    search_fields = ["nombre", "descripcion"]
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
    """Solo expone la acción `list` (ver `urls.py`: únicamente se mapea
    `{"get": "list"}`). El JSON de respuesta se arma a mano en `list()` en vez
    de delegarse a un `ModelSerializer`, por lo que `serializer_class` se
    declara únicamente para que drf-spectacular pueda documentar la forma de
    la respuesta; no se usa para serializar en tiempo de ejecución."""

    permission_classes = [IsSuperAdmin]
    serializer_class = SuperAdminStudentSerializer

    @extend_schema(
        tags=["Superadministración"],
        summary="Listar estudiantes (vista global)",
        description=(
            "Devuelve el listado de todos los estudiantes del sistema (de cualquier provincia/escuela), "
            "junto con los datos de su cuenta de usuario (si la tiene) y los años del proceso de ingreso "
            "en los que tiene escalafones registrados. Permite filtrar por año (`anio`), provincia "
            "(`provincia`) y coincidencia parcial de carné de identidad (`ci`). "
            "Solo accesible para usuarios con rol `superadmin`."
        ),
        parameters=[
            OpenApiParameter(
                name="anio",
                type=int,
                location=OpenApiParameter.QUERY,
                required=False,
                description="Filtra por año del proceso de ingreso al que pertenece el escalafón del estudiante.",
            ),
            OpenApiParameter(
                name="provincia",
                type=int,
                location=OpenApiParameter.QUERY,
                required=False,
                description="Filtra por el id de la provincia de la escuela del estudiante.",
            ),
            OpenApiParameter(
                name="ci",
                type=str,
                location=OpenApiParameter.QUERY,
                required=False,
                description="Filtra por coincidencia parcial (case-insensitive) del carné de identidad.",
            ),
        ],
        responses={200: SuperAdminStudentSerializer(many=True)},
        examples=[
            OpenApiExample(
                "Respuesta del listado de estudiantes",
                value={
                    "success": True,
                    "data": [
                        {
                            "id": 1,
                            "ci": "01019912345",
                            "nombre": "Juan",
                            "apellidos": "Pérez",
                            "sexo": "M",
                            "email": "juan@example.com",
                            "username": "juan.perez",
                            "user_id": 5,
                            "is_active": True,
                            "has_account": True,
                            "escuela": "IPVCE Vladimir Ilich Lenin",
                            "provincia": "La Habana",
                            "provincia_id": 3,
                            "anios": [2026, 2025],
                        }
                    ],
                    "error": None,
                },
                response_only=True,
                status_codes=["200"],
            ),
        ],
    )
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


@extend_schema(
    tags=["Superadministración"],
    summary="Panel de indicadores globales",
    description=(
        "Devuelve indicadores agregados a nivel nacional: cantidad de provincias (activas y totales), "
        "cantidad de roles definidos en el sistema, cantidad total de usuarios y el conteo de cada "
        "nomenclador (provincias, municipios, escuelas, carreras, CES y asignaturas). "
        "Solo accesible para usuarios con rol `superadmin`."
    ),
    responses={
        200: inline_serializer(
            name="SuperAdminDashboardResponse",
            fields={
                "provincias_activas": serializers.IntegerField(),
                "provincias_total": serializers.IntegerField(),
                "roles_definidos": serializers.IntegerField(),
                "usuarios_totales": serializers.IntegerField(),
                "nomencladores": inline_serializer(
                    name="SuperAdminDashboardNomencladores",
                    fields={
                        "provincias": serializers.IntegerField(),
                        "municipios": serializers.IntegerField(),
                        "escuelas": serializers.IntegerField(),
                        "carreras": serializers.IntegerField(),
                        "ces": serializers.IntegerField(),
                        "asignaturas": serializers.IntegerField(),
                    },
                ),
            },
        ),
    },
    examples=[
        OpenApiExample(
            "Respuesta del panel de indicadores globales",
            value={
                "success": True,
                "data": {
                    "provincias_activas": 15,
                    "provincias_total": 16,
                    "roles_definidos": 6,
                    "usuarios_totales": 320,
                    "nomencladores": {
                        "provincias": 16,
                        "municipios": 168,
                        "escuelas": 620,
                        "carreras": 45,
                        "ces": 12,
                        "asignaturas": 8,
                    },
                },
                "error": None,
            },
            response_only=True,
            status_codes=["200"],
        ),
    ],
)
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
        if self.request.method == "GET":
            # La identidad visual (logo, nombre del sistema) es pública: la
            # necesita la pantalla de login antes de que el usuario se autentique.
            return [AllowAny()]
        return [IsSuperAdmin()]

    @extend_schema(
        tags=["Superadministración"],
        summary="Consultar identidad visual del sistema",
        description=(
            "Devuelve la identidad visual vigente del sistema (logo, nombre, tipografía y paleta de "
            "colores). Si aún no existe un registro, se crea uno con los valores por defecto del modelo. "
            "Endpoint público (sin autenticación): lo necesita la pantalla de login antes de que el "
            "usuario se autentique."
        ),
        responses={
            200: inline_serializer(
                name="IdentidadVisualConfigResponse",
                fields={"config": IdentidadVisualSerializer()},
            ),
        },
        examples=[
            OpenApiExample(
                "Respuesta de la identidad visual",
                value={
                    "success": True,
                    "data": {
                        "config": {
                            "id": 1,
                            "logo_url": "/media/identidad/logo.png",
                            "nombre_sistema": "IngresoSUP",
                            "tipografia": "Inter",
                            "color_primario": "#0B5FFF",
                            "color_secundario": "#1F2933",
                            "color_acento": "#FFAA00",
                            "color_fondo": "#FFFFFF",
                            "color_exito": "#12B76A",
                            "color_error": "#F04438",
                            "fecha_creado": "2026-01-01T00:00:00Z",
                        }
                    },
                    "error": None,
                },
                response_only=True,
                status_codes=["200"],
            ),
        ],
    )
    def get(self, request):
        config, _ = IdentidadVisual.objects.get_or_create(pk=1)
        return api_success({"config": IdentidadVisualSerializer(config).data})

    @extend_schema(
        tags=["Superadministración"],
        summary="Actualizar identidad visual del sistema",
        description=(
            "Actualiza parcialmente la identidad visual del sistema (logo, nombre, tipografía y/o "
            "colores en formato hexadecimal). Solo se modifican los campos incluidos en el cuerpo de la "
            "petición; el resto conserva su valor actual. Solo accesible para usuarios con rol "
            "`superadmin`."
        ),
        request=IdentidadVisualUpdateSerializer,
        responses={
            200: inline_serializer(
                name="IdentidadVisualConfigUpdateResponse",
                fields={"config": IdentidadVisualSerializer()},
            ),
            400: inline_serializer(
                name="IdentidadVisualConfigValidationError",
                fields={"detail": serializers.CharField()},
            ),
        },
        examples=[
            OpenApiExample(
                "Petición de actualización",
                value={
                    "nombre_sistema": "IngresoSUP",
                    "color_primario": "#0B5FFF",
                    "color_acento": "#FFAA00",
                },
                request_only=True,
            ),
            OpenApiExample(
                "Respuesta de la identidad visual actualizada",
                value={
                    "success": True,
                    "data": {
                        "config": {
                            "id": 1,
                            "logo_url": "/media/identidad/logo.png",
                            "nombre_sistema": "IngresoSUP",
                            "tipografia": "Inter",
                            "color_primario": "#0B5FFF",
                            "color_secundario": "#1F2933",
                            "color_acento": "#FFAA00",
                            "color_fondo": "#FFFFFF",
                            "color_exito": "#12B76A",
                            "color_error": "#F04438",
                            "fecha_creado": "2026-01-01T00:00:00Z",
                        }
                    },
                    "error": None,
                },
                response_only=True,
                status_codes=["200"],
            ),
        ],
    )
    def put(self, request):
        config, _ = IdentidadVisual.objects.get_or_create(pk=1)
        serializer = IdentidadVisualUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        for field, value in serializer.validated_data.items():
            setattr(config, field, value)
        config.save()
        return api_success({"config": IdentidadVisualSerializer(config).data})
