from django.db.models import Count
from django.db import transaction
from django.conf import settings
from django.utils import timezone
from rest_framework import serializers, viewsets
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny

from apps.authentication.models import Estudiante, Usuario
from apps.gestion_personal.models import BoletaInteres, BoletaInteresItem
from apps.gestion_personal.models import BoletaSolicitud
from apps.superadmin.models import Carrera, Ces, Escuela, Municipio, Provincia


def build_plan_plaza_landing_payload(request):
    active_stage = Etapa.objects.filter(estado='en_curso').order_by('id').first()
    plan_stage = Etapa.objects.filter(nombre=ETAPAS_NOMBRES[3]).first()
    default_province = None

    if request.user.is_authenticated and getattr(request.user, 'provincia_id', None):
        default_province = request.user.provincia
    if default_province is None:
        default_province = Provincia.objects.filter(nombre__iexact='La Habana').first()

    if not plan_stage:
        return {
            'year': timezone.now().year,
            'provincia_id': default_province.id if default_province else None,
            'provincia_nombre': default_province.nombre if default_province else None,
            'items': [],
            'years': [],
            'active_stage': active_stage.id if active_stage else None,
            'active_stage_nombre': active_stage.nombre if active_stage else None,
        }

    years = list(
        PlanPlaza.objects.filter(proceso__etapa=plan_stage)
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
        PlanPlaza.objects.filter(proceso__etapa=plan_stage, proceso__anio__year=selected_year)
        .select_related('carrera', 'ces', 'provincia', 'proceso')
        .order_by('carrera__nombre')
    )

    if default_province:
        selected_items = [item for item in selected_items if item.provincia_id == default_province.id]

    province_names = sorted({
        item.provincia.nombre for item in selected_items
    })

    return {
        'year': selected_year,
        'provincia_id': default_province.id if default_province else None,
        'provincia_nombre': default_province.nombre if default_province else None,
        'items': [
            {
                'id': item.id,
                'carrera': item.carrera.nombre,
                'carrera_codigo': item.carrera.codigo,
                'cantidad_plazas': item.cantidad_plazas,
                'otorgamiento_tipo': item.otorgamiento_tipo,
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
)
from .permissions import IsCareerManager
from .serializers_plan import PlanPlazaSerializer


class ProvincialScopedMixin:
    permission_classes = [IsProvincialRepresentative]

    def province_queryset(self, queryset):
        province_id = getattr(self.request.user, "provincia_id", None)
        if self.request.user.is_superuser or self.request.user.rol == "superadmin":
            return queryset
        if queryset.model is Escuela:
            return queryset.filter(municipio__provincia_id=province_id)
        return queryset.filter(provincia_id=province_id)


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
            students = Estudiante.objects.all()
            interest_forms = BoletaInteres.objects.all()
        else:
            schools = Escuela.objects.filter(municipio__provincia_id=province_id)
            representatives = Usuario.objects.filter(rol="ingreso_municipal", municipio__provincia_id=province_id)
            users = Usuario.objects.filter(provincia_id=province_id).exclude(rol="estudiante")
            students = Estudiante.objects.filter(escuela__municipio__provincia_id=province_id)
            interest_forms = BoletaInteres.objects.filter(
                estudiante__escuela__municipio__provincia_id=province_id
            )
        active_stage = Etapa.objects.filter(estado="en_curso").order_by("id").first()
        top_careers = BoletaInteresItem.objects.filter(
            boleta_interes__in=interest_forms
        ).values("carrera__nombre").annotate(total=Count("id")).order_by("-total", "carrera__nombre")[:5]
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
            "top_carreras": list(top_careers),
            "municipios_lista": ProvincialMunicipioSerializer(municipalities, many=True).data,
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
            "registro_estudiantil": settings.DEBUG or any(
                etapa['numero'] in (1, 2) and etapa['estado'] == 'en_curso'
                for etapa in serialized
            ),
        }
        payload["plan_de_plazas"] = build_plan_plaza_landing_payload(request)
        return Response(payload)


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

    def post(self, request, ballot_id):
        ballot = BoletaSolicitud.objects.filter(pk=ballot_id, estado="aprobada").first()
        if not ballot:
            return Response({"detail": "No existe una boleta aprobada para autorizar."}, status=404)
        ballot.estado = "por_enviar"
        ballot.aprobada_por = None
        ballot.fecha_aprobada = None
        ballot.fecha_enviada = None
        ballot.save(update_fields=["estado", "aprobada_por", "fecha_aprobada", "fecha_enviada"])
        return Response({"detail": "La boleta fue autorizada para modificación."})


class ProvincialActivarEtapaView(APIView):
    permission_classes = [IsCommissionChief]

    @transaction.atomic
    def post(self, request, pk):
        serializer = ActivarEtapaSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        etapa = Etapa.objects.select_for_update().get(pk=pk)

        active_stage = Etapa.objects.filter(estado='en_curso').exclude(pk=etapa.pk).exists()
        if active_stage:
            return Response(
                {"detail": "Ya hay una etapa activa para este proceso."},
                status=400,
            )
        if etapa.estado != 'no_iniciada':
            return Response(
                {"detail": "La etapa ya fue activada y no puede modificarse."},
                status=400,
            )

        ordered_names = list(ETAPAS_NOMBRES.values())
        stage_index = ordered_names.index(etapa.nombre)
        previous_stage = Etapa.objects.filter(
            nombre=ordered_names[stage_index - 1]
        ).first() if stage_index else None
        if previous_stage and previous_stage.estado != "completada":
            return Response(
                {"detail": "Las etapas deben activarse estrictamente en secuencia."},
                status=400,
            )

        etapa.fecha_inicio = serializer.validated_data["fecha_inicio"]
        etapa.fecha_fin = serializer.validated_data["fecha_fin"]
        etapa.estado = 'en_curso'
        etapa.full_clean()
        etapa.save(update_fields=["fecha_inicio", "fecha_fin", "estado"])
        from apps.core.notifications import notify_users
        notify_users(Usuario.objects.all(), "Etapa activada", f"Se activó {etapa.nombre} desde {etapa.fecha_inicio} hasta {etapa.fecha_fin}.")
        return Response(ProvincialEtapaSerializer(etapa).data)


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
        if etapa.nombre == ETAPAS_NOMBRES[1]:
            from apps.gestion_escuela.models import Escalafon
            Escalafon.objects.filter(estado="pendiente").update(estado="enviado")
        return Response(ProvincialEtapaSerializer(etapa).data)


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

    def get_queryset(self):
        queryset = PlanPlaza.objects.select_related("proceso", "carrera", "ces", "provincia").order_by("carrera__nombre")
        proceso_id = self.request.query_params.get("proceso")
        if proceso_id:
            return queryset.filter(proceso_id=proceso_id)

        current_process = Proceso.get_for_stage_and_year(timezone.now().year, ETAPAS_NOMBRES[3])
        if current_process is None:
            return queryset.none()
        return queryset.filter(proceso=current_process)
