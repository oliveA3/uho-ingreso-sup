from django.db.models import Count
from django.db import transaction
from django.conf import settings
from django.utils import timezone
from datetime import datetime, time
from rest_framework import serializers, viewsets
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny

from apps.authentication.models import Estudiante, Usuario
from apps.gestion_personal.models import BoletaInteres, BoletaInteresItem, BoletaSolicitud, BoletaSolicitudItem, BoletaSolicitudItemAnterior, ConfirmacionPrueba
from apps.gestion_personal.models import BoletaSolicitud
from apps.superadmin.models import Asignatura, Carrera, Ces, Escuela, Municipio, Provincia


def build_plan_plaza_landing_payload(request):
    active_stage = Etapa.objects.filter(estado='en_curso').order_by('id').first()
    plan_stage = Etapa.objects.filter(nombre=ETAPAS_NOMBRES[3]).first()
    if not plan_stage:
        return {
            'year': timezone.now().year,
            'plan_year': None,
            'provincia_id': None,
            'provincia_nombre': 'Todas',
            'ces': [],
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
    selected_plan = PlanPlaza.objects.filter(
        proceso__etapa=plan_stage,
        proceso__anio__year=selected_year,
        carrera__activa=True,
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
        'provincia_id': None,
        'provincia_nombre': 'Todas',
        'ces': ces_data,
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
        active_stage = Etapa.objects.filter(estado="en_curso").order_by("id").first()
        solicitud_process = Proceso.get_for_stage_and_year(timezone.now().year, ETAPAS_NOMBRES[3])
        solicitud_forms = BoletaSolicitud.objects.filter(
            proceso=solicitud_process,
            estado__in={"por_aprobar", "aprobada"},
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
            "registro_estudiantil": any(
                etapa['numero'] == 1 and etapa['estado'] == 'en_curso'
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

    def get(self, request):
        current_stage = Etapa.objects.filter(estado="en_curso").order_by("id").first()
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

    @transaction.atomic
    def post(self, request, ballot_id):
        current_stage = Etapa.objects.filter(estado="en_curso").order_by("id").first()
        if not current_stage or current_stage.nombre != ETAPAS_NOMBRES[3]:
            return Response({"detail": "Las decisiones del Jefe de Comisión solo están disponibles durante la etapa 3."}, status=403)
        action = request.data.get("action")
        if action not in {"approve", "reject"}:
            return Response({"detail": "Acción inválida."}, status=400)
        ballot = BoletaSolicitud.objects.filter(pk=ballot_id, estado="modificada").first()
        if not ballot:
            return Response({"detail": "No existe una solicitud de modificación pendiente para esta boleta."}, status=404)
        if action == "approve":
            ballot.estado = "aprobada"
            ballot.aprobada_por = request.user.get_full_name() or request.user.username
            ballot.fecha_aprobada = timezone.localdate()
            ballot.save(update_fields=["estado", "aprobada_por", "fecha_aprobada"])
            BoletaSolicitudItemAnterior.objects.filter(boleta_solicitud=ballot).delete()
            from apps.core.notifications import notify_users
            notify_users(
                [Usuario.objects.filter(pk=ballot.estudiante.usuario_id).first()],
                "Modificación de boleta aprobada",
                f"El Jefe de Comisión aprobó tu solicitud de modificación de la boleta del proceso {ballot.proceso.anio.year}.",
            )
            return Response({"detail": "La modificación fue aprobada."})
        previous_items = list(BoletaSolicitudItemAnterior.objects.filter(boleta_solicitud=ballot))
        if not previous_items:
            return Response({"detail": "No existe un respaldo de la boleta anterior para restaurarla."}, status=409)
        ballot.boleta_solicitud.all().delete()
        BoletaSolicitudItem.objects.bulk_create([
            BoletaSolicitudItem(
                boleta_solicitud=ballot,
                plan_plaza=item.plan_plaza,
                prioridad=item.prioridad,
            )
            for item in previous_items
        ])
        BoletaSolicitudItemAnterior.objects.filter(boleta_solicitud=ballot).delete()
        ballot.estado = "aprobada"
        ballot.save(update_fields=["estado"])
        from apps.core.notifications import notify_users
        notify_users(
            [Usuario.objects.filter(pk=ballot.estudiante.usuario_id).first()],
            "Modificación de boleta rechazada",
            f"El Jefe de Comisión rechazó tu solicitud de modificación de la boleta del proceso {ballot.proceso.anio.year}. Se conservaron tus preferencias anteriores.",
        )
        return Response({"detail": "La modificación fue rechazada."})


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
        if stage_index == 3:
            exam_dates = [serializer.validated_data.get(field) for field in ("fecha_matematica", "fecha_espanol", "fecha_historia")]
            if any(date is None for date in exam_dates):
                return Response({"detail": "Debes indicar las fechas de Matemática, Español e Historia."}, status=400)
            if any(date < etapa.fecha_inicio or date > etapa.fecha_fin for date in exam_dates):
                return Response({"detail": "Las fechas de los exámenes deben estar dentro de la etapa 4."}, status=400)
            etapa.fecha_matematica, etapa.fecha_espanol, etapa.fecha_historia = exam_dates
        etapa.estado = 'en_curso'
        etapa.full_clean()
        update_fields = ["fecha_inicio", "fecha_fin", "estado"]
        if stage_index == 3:
            update_fields.extend(["fecha_matematica", "fecha_espanol", "fecha_historia"])
        etapa.save(update_fields=update_fields)
        process, _ = Proceso.objects.get_or_create(
            anio=timezone.localdate().replace(month=1, day=1),
            etapa=etapa,
        )
        if stage_index == 3:
            students = Estudiante.objects.filter(
                escalafones__escalafon__proceso__anio__year=timezone.now().year,
            ).distinct()
            subjects = {
                "Matemática": etapa.fecha_matematica,
                "Español": etapa.fecha_espanol,
                "Historia": etapa.fecha_historia,
            }
            for subject_name, exam_date in subjects.items():
                subject = Asignatura.objects.filter(nombre__iexact=subject_name, activa=True).first()
                if subject is None and subject_name == "Historia":
                    subject = Asignatura.objects.filter(nombre__iexact="Historia de Cuba", activa=True).first()
                if not subject:
                    return Response({"detail": f"No existe la asignatura activa '{subject_name}'."}, status=400)
                for student in students:
                    ConfirmacionPrueba.objects.get_or_create(
                        estudiante=student,
                        proceso=process,
                        asignatura=subject,
                        defaults={"confirmada": None, "fecha_prueba": timezone.make_aware(datetime.combine(exam_date, time.min))},
                    )
        from apps.core.notifications import notify_users
        recipients = Usuario.objects.exclude(rol="superadmin").exclude(is_superuser=True)
        notify_users(
            recipients,
            "Etapa activada",
            f"Se activó {etapa.nombre} desde {etapa.fecha_inicio} hasta {etapa.fecha_fin}.",
        )
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
