from django.db.models import Count
from django.db import transaction
from django.utils import timezone
from drf_spectacular.utils import OpenApiExample, extend_schema, inline_serializer
from rest_framework import serializers, viewsets
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny

from apps.authentication.models import Estudiante, Usuario
from apps.core.audit import record_audit
from apps.gestion_personal.models import BoletaInteres, BoletaInteresItem, BoletaSolicitud, BoletaSolicitudItem
from apps.gestion_personal.models import BoletaSolicitud
from apps.superadmin.models import Carrera, Ces, Escuela, Municipio, Provincia, TipoOtorgamiento


def _landing_scope_province(request):
    """Returns (provincia_id, provincia_nombre) to scope the plan de plazas
    landing to, or (None, 'Todas') for an unauthenticated or national view."""
    user = getattr(request, "user", None)
    if not user or not user.is_authenticated or user.is_superuser or user.rol == "superadmin":
        return None, "Todas"
    provincia_id = getattr(user, "provincia_id", None)
    if not provincia_id:
        return None, "Todas"
    provincia = Provincia.objects.filter(pk=provincia_id).first()
    if not provincia:
        return None, "Todas"
    return provincia_id, provincia.nombre


def build_plan_plaza_landing_payload(request):
    active_stage = Etapa.objects.en_curso().order_by('id').first()
    plan_stage = Etapa.objects.filter(nombre=ETAPAS_NOMBRES[3]).first()
    provincia_id, provincia_nombre = _landing_scope_province(request)
    if not plan_stage:
        return {
            'year': timezone.now().year,
            'plan_year': None,
            'provincia_id': provincia_id,
            'provincia_nombre': provincia_nombre,
            'ces': [],
            'items': [],
            'years': [],
            'active_stage': active_stage.id if active_stage else None,
            'active_stage_nombre': active_stage.nombre if active_stage else None,
        }

    scope_filter = {'provincia_id': provincia_id} if provincia_id else {}

    years = list(
        PlanPlaza.objects.filter(proceso__etapa=plan_stage, **scope_filter)
        .values_list('proceso__anio__year', flat=True)
        .distinct()
        .order_by('-proceso__anio__year')
    )
    if not years:
        years = [timezone.now().year]

    if active_stage and active_stage.id == plan_stage.id:
        selected_year = timezone.now().year if timezone.now().year in years else years[0]
    else:
        selected_year = years[0] if years else timezone.now().year

    selected_items = list(
        PlanPlaza.objects.filter(proceso__etapa=plan_stage, proceso__anio__year=selected_year, **scope_filter)
        .select_related('carrera', 'ces', 'provincia', 'proceso', 'otorgamiento_tipo')
        .order_by('carrera__nombre')
    )
    selected_plan = PlanPlaza.objects.filter(
        proceso__etapa=plan_stage,
        proceso__anio__year=selected_year,
        carrera__activa=True,
        **scope_filter,
    )
    ces_data = [
        {
            "id": ces.id,
            "nombre": ces.nombre,
            "carreras_count": selected_plan.filter(ces=ces).values("carrera_id").distinct().count(),
            "plan_year": selected_year,
        }
        for ces in Ces.objects.filter(activa=True).order_by("nombre")
    ]

    province_names = sorted({
        item.provincia.nombre for item in selected_items
    })

    return {
        'year': selected_year,
        'plan_year': selected_year,
        'provincia_id': provincia_id,
        'provincia_nombre': provincia_nombre,
        'ces': ces_data,
        'items': [
            {
                'id': item.id,
                'carrera': item.carrera.nombre,
                'carrera_codigo': item.carrera.codigo,
                'cantidad_plazas': item.cantidad_plazas,
                'otorgamiento_tipo': item.otorgamiento_tipo.nombre,
                'ces': item.ces.nombre,
                'provincia': item.provincia.nombre,
                'sexo': item.sexo,
                'year': selected_year,
            }
            for item in selected_items
        ],
        'years': years,
        'provincias': province_names,
        'active_stage': active_stage.id if active_stage else None,
        'active_stage_nombre': active_stage.nombre if active_stage else None,
    }

from .models import ETAPAS_NOMBRES, Etapa, PlanPlaza, Proceso
from .permissions import CanAccessEscalafon, CanViewProvincialDashboard, IsCommissionChief, IsProvincialRepresentative
from .serializers import (
    ActivarEtapaSerializer,
    ProvincialProcesoSerializer,
    ProvincialEtapaSerializer,
    ProvincialEscuelaSerializer,
    ProvincialMunicipioSerializer,
    ProvincialProvinciaSerializer,
    ProvincialUserSerializer,
    ProvincialCarreraSerializer,
    ProvincialCesSerializer,
    ProvincialTipoOtorgamientoSerializer,
)
from .permissions import IsCareerManager
from .serializers_plan import PlanPlazaSerializer
from .services.boletas import BoletaRuleError, resolve_modification
from .services.etapas import StageRuleError, activate_stage


class ProvincialScopedMixin:
    permission_classes = [IsProvincialRepresentative]

    def province_queryset(self, queryset):
        province_id = getattr(self.request.user, "provincia_id", None)
        if self.request.user.is_superuser or self.request.user.rol == "superadmin":
            return queryset
        if queryset.model is Escuela:
            return queryset.filter(municipio__provincia_id=province_id)
        return queryset.filter(provincia_id=province_id)


@extend_schema(
    tags=["Gestión"],
    summary="Panel de indicadores provinciales",
    description=(
        "Devuelve los indicadores agregados del proceso de ingreso para la provincia del usuario "
        "autenticado (municipios, escuelas, representantes, estudiantes, boletas de interés/solicitud y "
        "avance por municipio). Un superusuario o un usuario con rol `superadmin` ve los datos a nivel "
        "nacional; el resto de los roles autorizados ven solo su provincia. "
        "Solo pueden acceder usuarios con rol `jefe_comision`, `ingreso_provincial` o `superadmin` "
        "(o superusuarios). Como efecto colateral, cierra automáticamente cualquier etapa `en_curso` "
        "cuya `fecha_fin` ya haya pasado, marcándola como `completada`."
    ),
    responses={
        200: inline_serializer(
            name="ProvincialDashboardResponse",
            fields={
                "municipios": serializers.IntegerField(),
                "municipios_activos": serializers.IntegerField(),
                "escuelas": serializers.IntegerField(),
                "escuelas_activas": serializers.IntegerField(),
                "representantes_municipales": serializers.IntegerField(),
                "representantes_activos": serializers.IntegerField(),
                "usuarios_creados": serializers.IntegerField(),
                "estudiantes": serializers.IntegerField(),
                "estudiantes_con_cuenta": serializers.IntegerField(),
                "boletas_interes_enviadas": serializers.IntegerField(),
                "boletas_interes_pendientes": serializers.IntegerField(),
                "etapa_activa": ProvincialEtapaSerializer(allow_null=True),
                "top_carreras": inline_serializer(
                    name="ProvincialDashboardTopCarrera",
                    fields={
                        "carrera__nombre": serializers.CharField(),
                        "total": serializers.IntegerField(),
                    },
                    many=True,
                ),
                "municipios_lista": inline_serializer(
                    name="ProvincialDashboardMunicipio",
                    fields={
                        "id": serializers.IntegerField(),
                        "nombre": serializers.CharField(),
                        "provincia": serializers.IntegerField(),
                        "activo": serializers.BooleanField(),
                        "escuelas_count": serializers.IntegerField(),
                        "representante": serializers.DictField(allow_null=True),
                        "completed": serializers.IntegerField(),
                        "total": serializers.IntegerField(),
                        "label": serializers.CharField(),
                    },
                    many=True,
                ),
                "avance": inline_serializer(
                    name="ProvincialDashboardAvance",
                    fields={
                        "label": serializers.CharField(),
                        "proceso": serializers.DateField(allow_null=True),
                    },
                ),
            },
        ),
        403: inline_serializer(
            name="ProvincialDashboardForbidden",
            fields={"detail": serializers.CharField()},
        ),
    },
    examples=[
        OpenApiExample(
            "Respuesta del dashboard",
            value={
                "success": True,
                "data": {
                    "municipios": 12,
                    "municipios_activos": 11,
                    "escuelas": 48,
                    "escuelas_activas": 45,
                    "representantes_municipales": 12,
                    "representantes_activos": 10,
                    "usuarios_creados": 60,
                    "estudiantes": 530,
                    "estudiantes_con_cuenta": 480,
                    "boletas_interes_enviadas": 300,
                    "boletas_interes_pendientes": 20,
                    "etapa_activa": {
                        "id": 3,
                        "numero": 3,
                        "nombre": "Solicitud de plazas",
                        "fecha_inicio": "2026-03-01",
                        "fecha_fin": "2026-03-31",
                        "fecha_matematica": None,
                        "fecha_espanol": None,
                        "fecha_historia": None,
                        "estado": "en_curso",
                    },
                    "top_carreras": [
                        {"carrera__nombre": "Medicina", "total": 45},
                    ],
                    "municipios_lista": [
                        {
                            "id": 1,
                            "nombre": "Plaza",
                            "provincia": 1,
                            "activo": True,
                            "escuelas_count": 5,
                            "representante": {"id": 7, "nombre": "Ana Pérez", "activo": True},
                            "completed": 4,
                            "total": 5,
                            "label": "Boletas de solicitud enviadas",
                        }
                    ],
                    "avance": {"label": "Boletas de solicitud enviadas", "proceso": "2026-01-01"},
                },
                "error": None,
            },
            response_only=True,
            status_codes=["200"],
        ),
    ],
)
class ProvincialDashboardView(APIView):
    permission_classes = [CanViewProvincialDashboard]

    def get(self, request):
        Etapa.objects.filter(
            estado='en_curso', fecha_fin__lt=timezone.localdate()
        ).update(estado='completada')
        municipalities = MunicipalityQuery(request).all()
        province_id = getattr(request.user, "provincia_id", None)
        if request.user.is_superuser or request.user.rol == "superadmin":
            schools = Escuela.objects.all()
            representatives = Usuario.objects.filter(rol="ingreso_municipal")
            users = Usuario.objects.exclude(rol="estudiante")
            escalafon_process = Proceso.get_for_stage_and_year(timezone.now().year, ETAPAS_NOMBRES[1])
            interest_process = Proceso.get_for_stage_and_year(timezone.now().year, ETAPAS_NOMBRES[2])
            students = Estudiante.objects.filter(escalafones__escalafon__proceso=escalafon_process).distinct() if escalafon_process else Estudiante.objects.none()
            interest_forms = BoletaInteres.objects.filter(proceso=interest_process) if interest_process else BoletaInteres.objects.none()
        else:
            schools = Escuela.objects.filter(municipio__provincia_id=province_id)
            representatives = Usuario.objects.filter(rol="ingreso_municipal", municipio__provincia_id=province_id)
            users = Usuario.objects.filter(provincia_id=province_id).exclude(rol="estudiante")
            escalafon_process = Proceso.get_for_stage_and_year(timezone.now().year, ETAPAS_NOMBRES[1])
            interest_process = Proceso.get_for_stage_and_year(timezone.now().year, ETAPAS_NOMBRES[2])
            students = Estudiante.objects.filter(escuela__municipio__provincia_id=province_id, escalafones__escalafon__proceso=escalafon_process).distinct() if escalafon_process else Estudiante.objects.none()
            interest_forms = BoletaInteres.objects.filter(
                estudiante__escuela__municipio__provincia_id=province_id,
                proceso=interest_process,
            ) if interest_process else BoletaInteres.objects.none()
        active_stage = Etapa.objects.en_curso().order_by("id").first()
        solicitud_process = Proceso.get_for_stage_and_year(timezone.now().year, ETAPAS_NOMBRES[3])
        solicitud_forms = BoletaSolicitud.objects.filter(
            proceso=solicitud_process,
            estado__in={"pendiente", "aprobada", "modificada"},
        ) if solicitud_process else BoletaSolicitud.objects.none()
        if province_id and not (request.user.is_superuser or request.user.rol == "superadmin"):
            solicitud_forms = solicitud_forms.filter(estudiante__escuela__municipio__provincia_id=province_id)
        active_stage_number = next(
            (number for number, name in ETAPAS_NOMBRES.items() if active_stage and name == active_stage.nombre),
            None,
        )
        using_solicitud = active_stage_number is not None and active_stage_number >= 3
        if using_solicitud:
            top_careers = BoletaSolicitudItem.objects.filter(
                boleta_solicitud__in=solicitud_forms
            ).values("plan_plaza__carrera__nombre").annotate(total=Count("id")).order_by("-total", "plan_plaza__carrera__nombre")[:10]
            top_career_name = "plan_plaza__carrera__nombre"
        else:
            top_careers = BoletaInteresItem.objects.filter(
                boleta_interes__in=interest_forms.filter(enviada=True)
            ).values("carrera__nombre").annotate(total=Count("id")).order_by("-total", "carrera__nombre")[:10]
            top_career_name = "carrera__nombre"
        progress_process = solicitud_process if using_solicitud else escalafon_process
        progress_label = "Boletas de solicitud enviadas" if using_solicitud else "Escalafones enviados"
        municipality_progress = {}
        for municipality in municipalities:
            municipality_schools = schools.filter(municipio_id=municipality.id)
            total_schools = municipality_schools.count()
            completed_schools = 0
            for school in municipality_schools:
                school_students = Estudiante.objects.filter(
                    escalafones__escalafon__escuela=school,
                    escalafones__escalafon__proceso=escalafon_process,
                ).distinct() if escalafon_process else Estudiante.objects.none()
                if not school_students.exists():
                    continue
                if using_solicitud:
                    completed = not school_students.exclude(
                        boleta_solicitud__proceso=progress_process,
                        boleta_solicitud__estado__in={"por_aprobar", "aprobada"},
                    ).exists()
                else:
                    completed = not school_students.exclude(
                        escalafones__escalafon__proceso=progress_process,
                        escalafones__escalafon__estado="enviado",
                    ).exists()
                completed_schools += int(completed)
            municipality_progress[municipality.id] = {
                "completed": completed_schools,
                "total": total_schools,
                "label": progress_label,
            }
        return Response({
            "municipios": municipalities.count(),
            "municipios_activos": municipalities.filter(activo=True).count(),
            "escuelas": schools.count(),
            "escuelas_activas": schools.filter(activa=True).count(),
            "representantes_municipales": representatives.count(),
            "representantes_activos": representatives.filter(is_active=True).count(),
            "usuarios_creados": users.count(),
            "estudiantes": students.count(),
            "estudiantes_con_cuenta": students.filter(usuario__isnull=False).count(),
            "boletas_interes_enviadas": interest_forms.filter(enviada=True).count(),
            "boletas_interes_pendientes": interest_forms.filter(enviada=False).count(),
            "etapa_activa": ProvincialEtapaSerializer(active_stage).data if active_stage else None,
            "top_carreras": [{"carrera__nombre": career[top_career_name], "total": career["total"]} for career in top_careers],
            "municipios_lista": [
                {**ProvincialMunicipioSerializer(municipality).data, **municipality_progress.get(municipality.id, {"completed": 0, "total": 0, "label": progress_label})}
                for municipality in municipalities
            ],
            "avance": {"label": progress_label, "proceso": progress_process.anio if progress_process else None},
        })


def MunicipalityQuery(request):
    province_id = getattr(request.user, "provincia_id", None)
    queryset = Municipio.objects.annotate(escuelas_count=Count("escuelas")).order_by("nombre")
    requested_province = request.query_params.get("provincia")
    if not (request.user.is_superuser or request.user.rol == "superadmin"):
        queryset = queryset.filter(provincia_id=province_id)
    elif requested_province:
        queryset = queryset.filter(provincia_id=requested_province)
    return queryset


class ProvincialMunicipioViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = ProvincialMunicipioSerializer
    permission_classes = [IsProvincialRepresentative]

    def get_queryset(self):
        return MunicipalityQuery(self.request)


class ProvincialProvinciaViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = ProvincialProvinciaSerializer
    permission_classes = [IsCareerManager]

    def get_queryset(self):
        queryset = Provincia.objects.filter(activa=True).order_by("nombre")
        if not (self.request.user.is_superuser or self.request.user.rol == "superadmin"):
            queryset = queryset.filter(id=self.request.user.provincia_id)
        return queryset


class ProvincialCesViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = ProvincialCesSerializer
    permission_classes = [IsCareerManager]

    def get_queryset(self):
        return Ces.objects.filter(activa=True).order_by("nombre")


class ProvincialTipoOtorgamientoViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = ProvincialTipoOtorgamientoSerializer
    permission_classes = [IsCareerManager]

    def get_queryset(self):
        return TipoOtorgamiento.objects.filter(activa=True).order_by("nombre")


class ProvincialEtapaViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = ProvincialEtapaSerializer
    permission_classes = [CanAccessEscalafon]

    def get_queryset(self):
        return Etapa.objects.all()

    def list(self, request, *args, **kwargs):
        Etapa.objects.filter(
            estado='en_curso',
            fecha_fin__lt=timezone.localdate(),
        ).update(estado='completada')
        etapas = list(self.get_queryset())
        previous_completed = True
        data = []
        for etapa in etapas:
            serialized = self.get_serializer(etapa).data
            if etapa.estado == 'no_iniciada' and not previous_completed:
                serialized['estado'] = 'bloqueada'
            data.append(serialized)
            previous_completed = etapa.estado == 'completada'
        return Response(data)


@extend_schema(
    tags=["Gestión"],
    summary="Disponibilidad de etapas",
    description=(
        "Consulta pública (sin autenticación) del estado de todas las etapas del proceso de ingreso, "
        "indicando cuál etapa está en curso, cuáles están bloqueadas (una etapa `no_iniciada` se marca "
        "como `bloqueada` si la etapa anterior aún no está `completada`) y si el registro estudiantil "
        "(etapa 1) está abierto. Incluye además el landing público del plan de plazas vigente."
    ),
    responses={
        200: inline_serializer(
            name="PublicEtapasDisponibilidadResponse",
            fields={
                "etapas": ProvincialEtapaSerializer(many=True),
                "registro_estudiantil": serializers.BooleanField(),
                "plan_de_plazas": inline_serializer(
                    name="PublicEtapasPlanPlazaLanding",
                    fields={
                        "year": serializers.IntegerField(),
                        "plan_year": serializers.IntegerField(allow_null=True),
                        "provincia_id": serializers.IntegerField(allow_null=True),
                        "provincia_nombre": serializers.CharField(),
                        "ces": serializers.ListField(),
                        "items": serializers.ListField(),
                        "years": serializers.ListField(child=serializers.IntegerField()),
                        "active_stage": serializers.IntegerField(allow_null=True),
                        "active_stage_nombre": serializers.CharField(allow_null=True),
                    },
                ),
            },
        ),
    },
    examples=[
        OpenApiExample(
            "Respuesta de disponibilidad de etapas",
            value={
                "success": True,
                "data": {
                    "etapas": [
                        {
                            "id": 1,
                            "numero": 1,
                            "nombre": "Escalafón",
                            "fecha_inicio": "2026-01-10",
                            "fecha_fin": "2026-02-01",
                            "fecha_matematica": None,
                            "fecha_espanol": None,
                            "fecha_historia": None,
                            "estado": "completada",
                        },
                        {
                            "id": 2,
                            "numero": 2,
                            "nombre": "Boleta de interés",
                            "fecha_inicio": None,
                            "fecha_fin": None,
                            "fecha_matematica": None,
                            "fecha_espanol": None,
                            "fecha_historia": None,
                            "estado": "bloqueada",
                        },
                    ],
                    "registro_estudiantil": False,
                    "plan_de_plazas": {
                        "year": 2026,
                        "plan_year": 2026,
                        "provincia_id": None,
                        "provincia_nombre": "Todas",
                        "ces": [],
                        "items": [],
                        "years": [2026],
                        "active_stage": 1,
                        "active_stage_nombre": "Escalafón",
                    },
                },
                "error": None,
            },
            response_only=True,
            status_codes=["200"],
        ),
    ],
)
class PublicEtapasDisponibilidadView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        Etapa.objects.filter(
            estado='en_curso', fecha_fin__lt=timezone.localdate()
        ).update(estado='completada')
        etapas = list(Etapa.objects.all())
        ordered_names = list(ETAPAS_NOMBRES.values())
        etapas.sort(key=lambda etapa: ordered_names.index(etapa.nombre))
        previous_completed = True
        serialized = []
        for etapa in etapas:
            data = ProvincialEtapaSerializer(etapa).data
            if etapa.estado == 'no_iniciada' and not previous_completed:
                data['estado'] = 'bloqueada'
            serialized.append(data)
            previous_completed = etapa.estado == 'completada'
        payload = {
            "etapas": serialized,
            "registro_estudiantil": any(
                etapa['numero'] == 1 and etapa['estado'] == 'en_curso'
                for etapa in serialized
            ),
        }
        payload["plan_de_plazas"] = build_plan_plaza_landing_payload(request)
        return Response(payload)


@extend_schema(
    tags=["Gestión"],
    summary="Landing público de plan de plazas",
    description=(
        "Consulta pública (sin autenticación) del catálogo de plazas ofertadas para el año vigente del "
        "plan de plazas (etapa 4 del proceso). Si el usuario está autenticado y pertenece a una "
        "provincia (rol distinto de superadmin), la respuesta se restringe a esa provincia; en caso "
        "contrario, devuelve el agregado nacional."
    ),
    responses={
        200: inline_serializer(
            name="PublicPlanPlazaLandingResponse",
            fields={
                "year": serializers.IntegerField(),
                "plan_year": serializers.IntegerField(allow_null=True),
                "provincia_id": serializers.IntegerField(allow_null=True),
                "provincia_nombre": serializers.CharField(),
                "ces": inline_serializer(
                    name="PublicPlanPlazaLandingCes",
                    fields={
                        "id": serializers.IntegerField(),
                        "nombre": serializers.CharField(),
                        "carreras_count": serializers.IntegerField(),
                        "plan_year": serializers.IntegerField(),
                    },
                    many=True,
                ),
                "items": inline_serializer(
                    name="PublicPlanPlazaLandingItem",
                    fields={
                        "id": serializers.IntegerField(),
                        "carrera": serializers.CharField(),
                        "carrera_codigo": serializers.CharField(),
                        "cantidad_plazas": serializers.IntegerField(),
                        "otorgamiento_tipo": serializers.CharField(),
                        "ces": serializers.CharField(),
                        "provincia": serializers.CharField(),
                        "sexo": serializers.CharField(),
                        "year": serializers.IntegerField(),
                    },
                    many=True,
                ),
                "years": serializers.ListField(child=serializers.IntegerField()),
                "provincias": serializers.ListField(child=serializers.CharField()),
                "active_stage": serializers.IntegerField(allow_null=True),
                "active_stage_nombre": serializers.CharField(allow_null=True),
            },
        ),
    },
    examples=[
        OpenApiExample(
            "Respuesta del landing de plan de plazas",
            value={
                "success": True,
                "data": {
                    "year": 2026,
                    "plan_year": 2026,
                    "provincia_id": None,
                    "provincia_nombre": "Todas",
                    "ces": [
                        {"id": 1, "nombre": "Universidad de La Habana", "carreras_count": 30, "plan_year": 2026},
                    ],
                    "items": [
                        {
                            "id": 10,
                            "carrera": "Medicina",
                            "carrera_codigo": "MED-01",
                            "cantidad_plazas": 50,
                            "otorgamiento_tipo": "Curso regular diurno",
                            "ces": "Universidad de La Habana",
                            "provincia": "La Habana",
                            "sexo": "indistinto",
                            "year": 2026,
                        }
                    ],
                    "years": [2026, 2025],
                    "provincias": ["La Habana"],
                    "active_stage": 4,
                    "active_stage_nombre": "Plan de plazas",
                },
                "error": None,
            },
            response_only=True,
            status_codes=["200"],
        ),
    ],
)
class PublicPlanPlazaLandingView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        return Response(build_plan_plaza_landing_payload(request))


class ProvincialProcesoViewSet(viewsets.GenericViewSet):
    serializer_class = ProvincialProcesoSerializer
    permission_classes = [IsCommissionChief]

    def list(self, request):
        procesos = Proceso.objects.select_related("etapa").order_by("-anio", "etapa_id")
        return Response(self.get_serializer(procesos, many=True).data)

    def create(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        proceso = serializer.save()
        return Response(self.get_serializer(proceso).data, status=201)


class CommissionSolicitudAuthorizationView(APIView):
    permission_classes = [IsCommissionChief]

    @extend_schema(
        tags=["Gestión"],
        summary="Listar solicitudes de modificación de boleta pendientes de autorización",
        description=(
            "Devuelve las boletas de solicitud (etapa 3) en estado `modificada` que están pendientes de "
            "que el Jefe de Comisión apruebe o rechace la modificación solicitada por el estudiante, junto "
            "con métricas agregadas. Solo disponible para el rol `jefe_comision` (o superusuario/"
            "`superadmin`). Si la etapa 3 no está actualmente en curso, devuelve listas y contadores en "
            "cero. Si el usuario tiene provincia asignada, los resultados se restringen a esa provincia."
        ),
        responses={
            200: inline_serializer(
                name="CommissionSolicitudAuthorizationListResponse",
                fields={
                    "items": inline_serializer(
                        name="CommissionSolicitudAuthorizationItem",
                        fields={
                            "id": serializers.IntegerField(),
                            "student": serializers.CharField(),
                            "school": serializers.CharField(),
                            "municipio": serializers.CharField(),
                            "provincia": serializers.CharField(),
                            "date": serializers.CharField(),
                            "estado": serializers.CharField(),
                            "items": inline_serializer(
                                name="CommissionSolicitudAuthorizationBoletaItem",
                                fields={
                                    "prioridad": serializers.IntegerField(),
                                    "carrera_nombre": serializers.CharField(),
                                    "ces_nombre": serializers.CharField(),
                                },
                                many=True,
                            ),
                        },
                        many=True,
                    ),
                    "metrics": inline_serializer(
                        name="CommissionSolicitudAuthorizationMetrics",
                        fields={
                            "total": serializers.IntegerField(),
                            "pendientes": serializers.IntegerField(),
                            "aprobadas": serializers.IntegerField(),
                        },
                    ),
                },
            ),
        },
        examples=[
            OpenApiExample(
                "Respuesta con solicitudes pendientes",
                value={
                    "success": True,
                    "data": {
                        "items": [
                            {
                                "id": 15,
                                "student": "Juan Pérez",
                                "school": "IPU Lenin",
                                "municipio": "Plaza",
                                "provincia": "La Habana",
                                "date": "10/03/2026",
                                "estado": "modificada",
                                "items": [
                                    {"prioridad": 1, "carrera_nombre": "Medicina", "ces_nombre": "UH"},
                                ],
                            }
                        ],
                        "metrics": {"total": 5, "pendientes": 1, "aprobadas": 5},
                    },
                    "error": None,
                },
                response_only=True,
                status_codes=["200"],
            ),
        ],
    )
    def get(self, request):
        current_stage = Etapa.objects.en_curso().order_by("id").first()
        if not current_stage or current_stage.nombre != ETAPAS_NOMBRES[3]:
            return Response({"items": [], "metrics": {"total": 0, "pendientes": 0, "aprobadas": 0}})
        user_province_id = getattr(request.user, "provincia_id", None)
        year = timezone.now().year

        approved_ballots = BoletaSolicitud.objects.filter(
            estado="aprobada",
            proceso__anio__year=year,
            proceso__etapa__nombre=ETAPAS_NOMBRES[3],
        )
        if user_province_id:
            approved_ballots = approved_ballots.filter(estudiante__escuela__municipio__provincia_id=user_province_id)

        pending_ballots = BoletaSolicitud.objects.filter(
            estado="modificada",
            proceso__anio__year=year,
            proceso__etapa__nombre=ETAPAS_NOMBRES[3],
        )
        if user_province_id:
            pending_ballots = pending_ballots.filter(estudiante__escuela__municipio__provincia_id=user_province_id)

        items = []
        for ballot in pending_ballots.select_related("estudiante__escuela__municipio__provincia", "estudiante__usuario").prefetch_related("boleta_solicitud__plan_plaza__carrera"):
            old_items = list(ballot.boleta_solicitud.order_by("prioridad"))
            items.append({
                "id": ballot.id,
                "student": f"{ballot.estudiante.nombre} {ballot.estudiante.apellidos}",
                "school": ballot.estudiante.escuela.nombre,
                "municipio": ballot.estudiante.escuela.municipio.nombre,
                "provincia": ballot.estudiante.escuela.municipio.provincia.nombre,
                "date": ballot.fecha_enviada.strftime("%d/%m/%Y") if ballot.fecha_enviada else "-",
                "estado": ballot.estado,
                "items": [
                    {
                        "prioridad": item.prioridad,
                        "carrera_nombre": item.plan_plaza.carrera.nombre,
                        "ces_nombre": item.plan_plaza.ces.nombre,
                    }
                    for item in old_items
                ],
            })

        return Response({
            "items": items,
            "metrics": {
                "total": approved_ballots.count(),
                "pendientes": len(items),
                "aprobadas": approved_ballots.count(),
            },
        })

    @extend_schema(
        tags=["Gestión"],
        summary="Aprobar o rechazar una solicitud de modificación de boleta",
        description=(
            "Permite al Jefe de Comisión (o superusuario/`superadmin`) decidir sobre una boleta de "
            "solicitud en estado `modificada`. Con `action=approve` la boleta pasa a `aprobada` y se "
            "descarta el respaldo de la versión anterior; se notifica al estudiante. Con `action=reject` "
            "se restauran los ítems previos a la modificación (a partir del respaldo guardado en "
            "`BoletaSolicitudItemAnterior`), la boleta queda `aprobada` con sus valores originales y "
            "también se notifica al estudiante. Precondiciones: la etapa 3 (Solicitud de plazas) debe "
            "estar `en_curso` (403 en caso contrario), debe existir una boleta con ese id en estado "
            "`modificada` (404 si no existe) y, para `reject`, debe existir un respaldo previo (409 si no "
            "existe)."
        ),
        request=inline_serializer(
            name="CommissionSolicitudAuthorizationDecision",
            fields={"action": serializers.ChoiceField(choices=["approve", "reject"])},
        ),
        responses={
            200: inline_serializer(
                name="CommissionSolicitudAuthorizationDecisionResponse",
                fields={"detail": serializers.CharField()},
            ),
            400: inline_serializer(
                name="CommissionSolicitudAuthorizationBadRequest",
                fields={"detail": serializers.CharField()},
            ),
            403: inline_serializer(
                name="CommissionSolicitudAuthorizationForbidden",
                fields={"detail": serializers.CharField()},
            ),
            404: inline_serializer(
                name="CommissionSolicitudAuthorizationNotFound",
                fields={"detail": serializers.CharField()},
            ),
            409: inline_serializer(
                name="CommissionSolicitudAuthorizationConflict",
                fields={"detail": serializers.CharField()},
            ),
        },
        examples=[
            OpenApiExample(
                "Solicitud de aprobación",
                value={"action": "approve"},
                request_only=True,
            ),
            OpenApiExample(
                "Respuesta al aprobar",
                value={"success": True, "data": {"detail": "La modificación fue aprobada."}, "error": None},
                response_only=True,
                status_codes=["200"],
            ),
            OpenApiExample(
                "Respuesta al rechazar",
                value={
                    "success": True,
                    "data": {"detail": "La modificación fue rechazada."},
                    "error": None,
                },
                response_only=True,
                status_codes=["200"],
            ),
        ],
    )
    @transaction.atomic
    def post(self, request, ballot_id):
        try:
            detail = resolve_modification(ballot_id, request.data.get("action"), request.user, request, request.path)
        except BoletaRuleError as error:
            return Response({"detail": str(error)}, status=error.status)
        return Response({"detail": detail})


@extend_schema(
    tags=["Gestión"],
    summary="Activar una etapa del proceso de ingreso",
    description=(
        "Activa (pone en estado `en_curso`) la etapa indicada por `pk`, estableciendo su rango de "
        "fechas. Solo puede invocarlo el Jefe de Comisión (o superusuario/`superadmin`). Precondiciones "
        "validadas por el servidor: no debe existir ya otra etapa `en_curso` (400), la etapa objetivo "
        "debe estar en estado `no_iniciada` (400) y las etapas deben activarse estrictamente en el orden "
        "definido por `ETAPAS_NOMBRES` -es decir, la etapa inmediatamente anterior debe estar "
        "`completada`- (400). Si la etapa a activar es la etapa 4 (Plan de plazas/Exámenes), son "
        "obligatorias además `fecha_matematica`, `fecha_espanol` y `fecha_historia`, y todas deben caer "
        "dentro del rango `[fecha_inicio, fecha_fin]`; en ese caso también se crean automáticamente "
        "registros `ConfirmacionPrueba` para cada estudiante con escalafón del año en curso y cada "
        "asignatura de examen. Al activarse, se crea/recupera el `Proceso` del año en curso asociado a "
        "la etapa y se notifica a todos los usuarios (excepto superadmin) del cambio."
    ),
    request=ActivarEtapaSerializer,
    responses={
        200: ProvincialEtapaSerializer,
        400: inline_serializer(
            name="ProvincialActivarEtapaBadRequest",
            fields={"detail": serializers.CharField()},
        ),
    },
    examples=[
        OpenApiExample(
            "Activar etapa 1 (Escalafón)",
            value={"fecha_inicio": "2026-01-10", "fecha_fin": "2026-02-01"},
            request_only=True,
        ),
        OpenApiExample(
            "Activar etapa 4 (con fechas de exámenes)",
            value={
                "fecha_inicio": "2026-05-01",
                "fecha_fin": "2026-05-31",
                "fecha_matematica": "2026-05-10",
                "fecha_espanol": "2026-05-15",
                "fecha_historia": "2026-05-20",
            },
            request_only=True,
        ),
        OpenApiExample(
            "Respuesta al activar",
            value={
                "success": True,
                "data": {
                    "id": 1,
                    "numero": 1,
                    "nombre": "Escalafón",
                    "fecha_inicio": "2026-01-10",
                    "fecha_fin": "2026-02-01",
                    "fecha_matematica": None,
                    "fecha_espanol": None,
                    "fecha_historia": None,
                    "estado": "en_curso",
                },
                "error": None,
            },
            response_only=True,
            status_codes=["200"],
        ),
    ],
)
class ProvincialActivarEtapaView(APIView):
    permission_classes = [IsCommissionChief]

    @transaction.atomic
    def post(self, request, pk):
        serializer = ActivarEtapaSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            etapa = activate_stage(pk, serializer.validated_data, request.user, request, request.path)
        except StageRuleError as error:
            return Response({"detail": str(error)}, status=400)
        return Response(ProvincialEtapaSerializer(etapa).data)


@extend_schema(
    tags=["Gestión"],
    summary="Cerrar una etapa del proceso de ingreso",
    description=(
        "Cierra (marca como `completada`) la etapa indicada por `pk`. Solo puede invocarlo el Jefe de "
        "Comisión (o superusuario/`superadmin`). Precondición: la etapa debe estar actualmente `en_curso` "
        "(400 en caso contrario). Si la etapa cerrada es la etapa 1 (Escalafón), como efecto adicional "
        "todos los escalafones `pendientes` de ese proceso pasan a estado `enviado` y sus ítems quedan "
        "con `indices_bloqueados=True`, impidiendo modificaciones posteriores."
    ),
    request=None,
    responses={
        200: ProvincialEtapaSerializer,
        400: inline_serializer(
            name="ProvincialCerrarEtapaBadRequest",
            fields={"detail": serializers.CharField()},
        ),
    },
    examples=[
        OpenApiExample(
            "Respuesta al cerrar",
            value={
                "success": True,
                "data": {
                    "id": 1,
                    "numero": 1,
                    "nombre": "Escalafón",
                    "fecha_inicio": "2026-01-10",
                    "fecha_fin": "2026-02-01",
                    "fecha_matematica": None,
                    "fecha_espanol": None,
                    "fecha_historia": None,
                    "estado": "completada",
                },
                "error": None,
            },
            response_only=True,
            status_codes=["200"],
        ),
    ],
)
class ProvincialCerrarEtapaView(APIView):
    permission_classes = [IsCommissionChief]

    @transaction.atomic
    def post(self, request, pk):
        etapa = Etapa.objects.select_for_update().get(pk=pk)
        if etapa.estado != "en_curso":
            return Response(
                {"detail": "Solo se puede cerrar una etapa en curso."},
                status=400,
            )
        etapa.estado = 'completada'
        etapa.save(update_fields=["estado"])
        record_audit(request.user, "Cierre de etapa", request.path, request=request, previous={"estado": "en_curso"}, new={"estado": "completada", "etapa": etapa.nombre})
        if etapa.nombre == ETAPAS_NOMBRES[1]:
            from apps.gestion_escuela.models import Escalafon, EscalafonItem

            escalafones = Escalafon.objects.filter(proceso__etapa=etapa, estado="pendiente")
            escalafon_ids = list(escalafones.values_list("id", flat=True))
            escalafones.update(estado="enviado")
            if escalafon_ids:
                EscalafonItem.objects.filter(escalafon_id__in=escalafon_ids).update(indices_bloqueados=True)
        return Response(ProvincialEtapaSerializer(etapa).data)


@extend_schema(
    tags=["Gestión"],
    summary="Reiniciar el ciclo de etapas del proceso de ingreso",
    description=(
        "Reinicia todas las etapas del catálogo a estado `no_iniciada`, limpiando sus fechas de inicio y "
        "fin, para permitir comenzar un nuevo ciclo del proceso de ingreso. Solo puede invocarlo el Jefe "
        "de Comisión (o superusuario/`superadmin`). Precondiciones: el catálogo de etapas debe estar "
        "completo (debe existir exactamente una etapa por cada nombre definido en `ETAPAS_NOMBRES`, 400 "
        "en caso contrario) y todas las etapas deben estar actualmente `completada` (400 en caso "
        "contrario). No admite parámetros; devuelve la representación de la primera etapa tras el "
        "reinicio."
    ),
    request=None,
    responses={
        200: ProvincialEtapaSerializer,
        400: inline_serializer(
            name="ProvincialReiniciarEtapasBadRequest",
            fields={"detail": serializers.CharField()},
        ),
    },
    examples=[
        OpenApiExample(
            "Respuesta al reiniciar el ciclo",
            value={
                "success": True,
                "data": {
                    "id": 1,
                    "numero": 1,
                    "nombre": "Escalafón",
                    "fecha_inicio": None,
                    "fecha_fin": None,
                    "fecha_matematica": None,
                    "fecha_espanol": None,
                    "fecha_historia": None,
                    "estado": "no_iniciada",
                },
                "error": None,
            },
            response_only=True,
            status_codes=["200"],
        ),
    ],
)
class ProvincialReiniciarEtapasView(APIView):
    permission_classes = [IsCommissionChief]

    @transaction.atomic
    def post(self, request):
        etapas = Etapa.objects.select_for_update().all()
        if not etapas or etapas.count() != len(ETAPAS_NOMBRES):
            return Response(
                {"detail": "El catálogo de etapas no está completo."}, status=400
            )
        if not all(etapa.estado == "completada" for etapa in etapas):
            return Response(
                {"detail": "Solo se puede iniciar un nuevo ciclo cuando todas las etapas estén completadas."},
                status=400,
            )
        etapas.update(fecha_inicio=None, fecha_fin=None, estado="no_iniciada")
        return Response(ProvincialEtapaSerializer(etapas.first()).data)

class ProvincialEscuelaViewSet(ProvincialScopedMixin, viewsets.ModelViewSet):
    serializer_class = ProvincialEscuelaSerializer

    def get_queryset(self):
        return self.province_queryset(Escuela.objects.select_related("municipio").order_by("nombre"))

    def perform_create(self, serializer):
        municipio = serializer.validated_data["municipio"]
        if not self.request.user.is_superuser and municipio.provincia_id != self.request.user.provincia_id:
            raise serializers.ValidationError("El municipio no pertenece a tu provincia.")
        serializer.save()


class ProvincialUserViewSet(ProvincialScopedMixin, viewsets.ModelViewSet):
    serializer_class = ProvincialUserSerializer

    def get_queryset(self):
        queryset = Usuario.objects.select_related("provincia", "municipio").filter(
            rol="ingreso_municipal"
        ).order_by("last_name", "first_name", "username")
        return self.province_queryset(queryset)

    def perform_create(self, serializer):
        municipality = serializer.validated_data["municipio"]
        province_id = getattr(self.request.user, "provincia_id", None)
        if not (self.request.user.is_superuser or self.request.user.rol == "superadmin") and municipality.provincia_id != province_id:
            raise serializers.ValidationError("El municipio no pertenece a tu provincia.")
        serializer.save(rol="ingreso_municipal", provincia=municipality.provincia)


class ProvincialCarreraViewSet(viewsets.ModelViewSet):
    serializer_class = ProvincialCarreraSerializer
    permission_classes = [IsCareerManager]

    def get_queryset(self):
        queryset = Carrera.objects.select_related("ces", "provincia").order_by("nombre")
        search = self.request.query_params.get("search")
        if search:
            queryset = queryset.filter(nombre__icontains=search)
        return queryset


class PlanPlazaViewSet(viewsets.ModelViewSet):
    serializer_class = PlanPlazaSerializer
    permission_classes = [IsCommissionChief]

    def _scoped(self, queryset):
        user = self.request.user
        if user.is_superuser or user.rol == "superadmin":
            return queryset
        return queryset.filter(provincia_id=user.provincia_id)

    def get_queryset(self):
        queryset = PlanPlaza.objects.select_related("proceso", "carrera", "ces", "provincia").order_by("carrera__nombre")
        queryset = self._scoped(queryset)
        proceso_id = self.request.query_params.get("proceso")
        if proceso_id:
            return queryset.filter(proceso_id=proceso_id)

        current_process = Proceso.get_for_stage_and_year(timezone.now().year, ETAPAS_NOMBRES[3])
        if current_process is None:
            return queryset.none()
        return queryset.filter(proceso=current_process)

    def perform_create(self, serializer):
        user = self.request.user
        if not (user.is_superuser or user.rol == "superadmin"):
            provincia = serializer.validated_data.get("provincia")
            if provincia is not None and provincia.id != user.provincia_id:
                raise serializers.ValidationError("No puedes crear un plan de plazas para otra provincia.")
            serializer.save(provincia_id=user.provincia_id)
        else:
            serializer.save()
