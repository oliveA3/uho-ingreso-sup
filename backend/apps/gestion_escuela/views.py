from django.db.models import Count
from django.utils import timezone
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import OpenApiExample, OpenApiParameter, extend_schema, inline_serializer
from rest_framework import serializers
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.authentication.models import Estudiante, Usuario
from apps.core.notifications import notify_users
from apps.core.audit import record_audit
from apps.gestion_personal.models import BoletaInteres, BoletaInteresItem, BoletaSolicitud, ConfirmacionPrueba
from apps.gestion_personal.serializers import BoletaSolicitudSerializer
from apps.gestion_provincial.models import ETAPAS_NOMBRES, Etapa, PlanPlaza, Proceso
from .models import EscalafonItem
from .permissions import CanViewStudentsWithoutAccount, IsSchoolSecretary
from .serializers import StudentsWithoutAccountSerializer


@extend_schema(
    tags=["Gestión"],
    summary="Estudiantes de la escuela sin cuenta de usuario",
    description=(
        "Lista los estudiantes de la escuela del usuario autenticado que figuran en el escalafón vigente "
        "(etapa 1 del año en curso) pero todavía no tienen una cuenta de Usuario asociada. "
        "Solo puede consultarse por un Secretario o Director de Escuela (o un superusuario) que tenga "
        "una escuela asignada. Si no existe un proceso activo para la etapa 1 del año actual, se "
        "devuelve una lista vacía."
    ),
    responses={
        200: inline_serializer(
            name="StudentsWithoutAccountResponse",
            fields={"students": StudentsWithoutAccountSerializer(many=True)},
        ),
        403: inline_serializer(
            name="StudentsWithoutAccountForbidden",
            fields={"detail": serializers.CharField()},
        ),
    },
    examples=[
        OpenApiExample(
            "Respuesta exitosa",
            value={
                "success": True,
                "data": {
                    "students": [
                        {"id": 12, "ci": "01010199912345", "nombre": "Ana", "apellidos": "Pérez López", "indice_general": 92.5},
                    ]
                },
                "error": None,
            },
            response_only=True,
        ),
    ],
)
class StudentsWithoutAccountView(APIView):
    permission_classes = [CanViewStudentsWithoutAccount]

    def get(self, request):
        process = Proceso.get_for_stage_and_year(timezone.now().year, ETAPAS_NOMBRES[1])
        students = Estudiante.objects.filter(
            escuela_id=request.user.escuela_id,
            usuario__isnull=True,
            escalafones__escalafon__proceso=process,
        ).distinct().order_by("apellidos", "nombre") if process else Estudiante.objects.none()
        return Response({"students": StudentsWithoutAccountSerializer(students, many=True).data})


@extend_schema(
    tags=["Gestión"],
    summary="Indicadores del panel de la escuela",
    description=(
        "Devuelve los indicadores agregados del año en curso para la escuela del usuario autenticado: "
        "cantidad de estudiantes en el escalafón vigente, cuántos tienen cuenta de usuario, y el estado "
        "de las boletas de interés y de solicitud (enviadas, pendientes, aprobadas, modificadas). "
        "También informa la etapa del proceso de ingreso que está actualmente en curso. "
        "Requiere el mismo permiso que la consulta de estudiantes sin cuenta (Secretario o Director de "
        "Escuela, o superusuario, con escuela asignada)."
    ),
    responses={
        200: inline_serializer(
            name="SchoolDashboardResponse",
            fields={
                "year": serializers.IntegerField(),
                "active_stage": inline_serializer(
                    name="SchoolDashboardActiveStage",
                    fields={"numero": serializers.IntegerField(allow_null=True), "nombre": serializers.CharField()},
                    required=False,
                ),
                "ballot_stage": inline_serializer(
                    name="SchoolDashboardBallotStage",
                    fields={"numero": serializers.IntegerField(allow_null=True), "nombre": serializers.CharField()},
                    required=False,
                ),
                "students": serializers.IntegerField(),
                "students_with_account": serializers.IntegerField(),
                "escalafon": inline_serializer(
                    name="SchoolDashboardEscalafon",
                    fields={
                        "sent": serializers.IntegerField(),
                        "accepted": serializers.IntegerField(),
                        "review": serializers.IntegerField(),
                        "no_response": serializers.IntegerField(),
                    },
                ),
                "interest": inline_serializer(
                    name="SchoolDashboardInterest",
                    fields={"sent": serializers.IntegerField(), "pending": serializers.IntegerField()},
                ),
                "solicitud": inline_serializer(
                    name="SchoolDashboardSolicitud",
                    fields={
                        "sent": serializers.IntegerField(),
                        "pending": serializers.IntegerField(),
                        "approved": serializers.IntegerField(),
                        "modified": serializers.IntegerField(),
                    },
                ),
            },
        ),
    },
    examples=[
        OpenApiExample(
            "Respuesta exitosa",
            value={
                "success": True,
                "data": {
                    "year": 2026,
                    "active_stage": {"numero": 2, "nombre": "Boleta de interés"},
                    "ballot_stage": {"numero": 2, "nombre": "Boleta de interés"},
                    "students": 150,
                    "students_with_account": 120,
                    "escalafon": {"sent": 1, "accepted": 140, "review": 5, "no_response": 5},
                    "interest": {"sent": 100, "pending": 50},
                    "solicitud": {"sent": 0, "pending": 0, "approved": 0, "modified": 0},
                },
                "error": None,
            },
            response_only=True,
        ),
    ],
)
class SchoolDashboardView(APIView):
    permission_classes = [CanViewStudentsWithoutAccount]

    def get(self, request):
        year = timezone.now().year
        escalafon_process = Proceso.get_for_stage_and_year(year, ETAPAS_NOMBRES[1])
        interest_process = Proceso.get_for_stage_and_year(year, ETAPAS_NOMBRES[2])
        solicitud_process = Proceso.get_for_stage_and_year(year, ETAPAS_NOMBRES[3])
        entries = EscalafonItem.objects.filter(escalafon__escuela_id=request.user.escuela_id, escalafon__proceso=escalafon_process) if escalafon_process else EscalafonItem.objects.none()
        students = Estudiante.objects.filter(id__in=entries.values("estudiante_id"))
        interest = BoletaInteres.objects.filter(estudiante__in=students, proceso=interest_process) if interest_process else BoletaInteres.objects.none()
        solicitud = BoletaSolicitud.objects.filter(estudiante__in=students, proceso=solicitud_process) if solicitud_process else BoletaSolicitud.objects.none()
        active_stage = Etapa.objects.filter(estado="en_curso").order_by("id").first()
        active_stage_number = next((number for number, name in ETAPAS_NOMBRES.items() if active_stage and name == active_stage.nombre), None)
        return Response({
            "year": year,
            "active_stage": {"numero": active_stage_number, "nombre": active_stage.nombre} if active_stage else None,
            "ballot_stage": {"numero": active_stage_number, "nombre": active_stage.nombre} if active_stage else None,
            "students": students.count(),
            "students_with_account": students.filter(usuario__isnull=False).count(),
            "escalafon": {"sent": entries.filter(escalafon__estado="enviado").values("escalafon_id").distinct().count(), "accepted": entries.filter(estado="aceptado").count(), "review": entries.filter(estado="por_revisar").count(), "no_response": entries.filter(estado="sin_respuesta").count()},
            "interest": {"sent": interest.filter(enviada=True).count(), "pending": max(students.count() - interest.filter(enviada=True).count(), 0)},
            "solicitud": {"sent": solicitud.filter(estado__in={"pendiente", "aprobada", "modificada"}).count(), "pending": solicitud.filter(estado="pendiente").count(), "approved": solicitud.filter(estado="aprobada").count(), "modified": solicitud.filter(estado="modificada").count()},
        })


@extend_schema(
    tags=["Gestión"],
    summary="Métricas de boletas de interés de la escuela",
    description=(
        "Calcula métricas de las boletas de interés (etapa 2) para los estudiantes de la escuela del "
        "usuario autenticado que figuran en el escalafón vigente: cantidad enviadas/pendientes, top de "
        "carreras más solicitadas y desglose por sexo. Si la etapa 2 ya venció (fecha_fin en el pasado) "
        "se marca automáticamente como 'completada' antes de calcular las métricas. "
        "Requiere Secretario o Director de Escuela (o superusuario) con escuela asignada."
    ),
    responses={
        200: inline_serializer(
            name="SchoolInterestMetricsResponse",
            fields={
                "enviadas": serializers.IntegerField(),
                "pendientes": serializers.IntegerField(),
                "total": serializers.IntegerField(),
                "total_boletas": serializers.IntegerField(),
                "proceso": serializers.IntegerField(allow_null=True, help_text="Año del proceso, o null si no hay proceso activo para la etapa 2."),
                "stage": inline_serializer(
                    name="SchoolInterestMetricsStage",
                    fields={
                        "active": serializers.BooleanField(),
                        "numero": serializers.IntegerField(allow_null=True),
                        "nombre": serializers.CharField(allow_null=True),
                        "fecha_inicio": serializers.DateField(allow_null=True),
                        "fecha_fin": serializers.DateField(allow_null=True),
                    },
                ),
                "top_carreras": inline_serializer(
                    name="SchoolInterestMetricsTopCarrera",
                    fields={
                        "id": serializers.IntegerField(),
                        "nombre": serializers.CharField(),
                        "total": serializers.IntegerField(),
                    },
                    many=True,
                ),
                "sexo": inline_serializer(
                    name="SchoolInterestMetricsSexo",
                    fields={"label": serializers.CharField(), "total": serializers.IntegerField()},
                    many=True,
                ),
                "tipo_otorgamiento": serializers.ListField(child=serializers.DictField(), help_text="Reservado para uso futuro; siempre vacío en esta vista."),
            },
        ),
    },
    examples=[
        OpenApiExample(
            "Respuesta exitosa",
            value={
                "success": True,
                "data": {
                    "enviadas": 100,
                    "pendientes": 50,
                    "total": 150,
                    "total_boletas": 100,
                    "proceso": 2026,
                    "stage": {
                        "active": True,
                        "numero": 2,
                        "nombre": "Boleta de interés",
                        "fecha_inicio": "2026-03-01",
                        "fecha_fin": "2026-03-31",
                    },
                    "top_carreras": [{"id": 3, "nombre": "Ingeniería Informática", "total": 25}],
                    "sexo": [{"label": "M", "total": 60}, {"label": "F", "total": 40}],
                    "tipo_otorgamiento": [],
                },
                "error": None,
            },
            response_only=True,
        ),
    ],
)
class SchoolInterestMetricsView(APIView):
    permission_classes = [CanViewStudentsWithoutAccount]

    def get(self, request):
        stage = Etapa.objects.filter(nombre=ETAPAS_NOMBRES[2]).first()
        if stage and stage.estado == "en_curso" and stage.fecha_fin and stage.fecha_fin < timezone.localdate():
            stage.estado = "completada"
            stage.save(update_fields=["estado"])
        process = Proceso.get_for_stage_and_year(timezone.now().year, ETAPAS_NOMBRES[2])
        active_stage = Etapa.objects.filter(estado="en_curso").order_by("id").first()
        active_stage_number = next(
            (number for number, name in ETAPAS_NOMBRES.items() if active_stage and name == active_stage.nombre),
            None,
        )
        escalafon_process = Proceso.get_for_stage_and_year(timezone.now().year, ETAPAS_NOMBRES[1])
        students = Estudiante.objects.filter(
            escuela_id=request.user.escuela_id,
            escalafones__escalafon__proceso=escalafon_process,
        ).distinct()
        ballots = BoletaInteres.objects.filter(estudiante__in=students, proceso=process) if process else BoletaInteres.objects.none()
        submitted_ballots = ballots.filter(enviada=True)
        top_careers = BoletaInteresItem.objects.filter(boleta_interes__in=submitted_ballots).values(
            "carrera__id", "carrera__nombre"
        ).annotate(total=Count("id")).order_by("-total", "carrera__nombre")[:10]
        total_students = students.count()
        sent_count = ballots.filter(enviada=True).count()
        sex_counts = students.values("sexo").annotate(total=Count("id")).order_by("sexo")
        return Response({
            "enviadas": sent_count,
            "pendientes": max(total_students - sent_count, 0),
            "total": total_students,
            "total_boletas": ballots.count(),
            "proceso": process.anio if process else None,
            "stage": {
                "active": bool(active_stage_number == 2),
                "numero": active_stage_number,
                "nombre": active_stage.nombre if active_stage else None,
                "fecha_inicio": active_stage.fecha_inicio if active_stage else None,
                "fecha_fin": active_stage.fecha_fin if active_stage else None,
            },
            "top_carreras": [
                {"id": career["carrera__id"], "nombre": career["carrera__nombre"], "total": career["total"]}
                for career in top_careers
            ],
            "sexo": [{"label": item["sexo"] or "N/D", "total": item["total"]} for item in sex_counts],
            "tipo_otorgamiento": [],
        })


@extend_schema(
    tags=["Gestión"],
    summary="Métricas de confirmación de pruebas de la escuela",
    description=(
        "Devuelve, agrupadas por asignatura, las confirmaciones de pruebas (etapa 4) de los estudiantes "
        "de la escuela del usuario autenticado: cantidad pendientes, confirmadas y rechazadas, junto con "
        "el listado de estudiantes confirmados por asignatura. Solo puede consultarse por un Secretario "
        "o Director de Escuela (o superusuario) con escuela asignada."
    ),
    responses={
        200: inline_serializer(
            name="SchoolExamConfirmationMetricsResponse",
            fields={
                "year": serializers.IntegerField(),
                "process_id": serializers.IntegerField(allow_null=True),
                "stage_active": serializers.BooleanField(),
                "subjects": inline_serializer(
                    name="SchoolExamConfirmationSubject",
                    fields={
                        "name": serializers.CharField(),
                        "pending": serializers.IntegerField(),
                        "confirmed": serializers.IntegerField(),
                        "rejected": serializers.IntegerField(),
                        "confirmed_students": inline_serializer(
                            name="SchoolExamConfirmationStudent",
                            fields={
                                "id": serializers.IntegerField(),
                                "name": serializers.CharField(),
                                "ci": serializers.CharField(),
                            },
                            many=True,
                        ),
                    },
                    many=True,
                ),
            },
        ),
    },
    examples=[
        OpenApiExample(
            "Respuesta exitosa",
            value={
                "success": True,
                "data": {
                    "year": 2026,
                    "process_id": 7,
                    "stage_active": True,
                    "subjects": [
                        {
                            "name": "Matemática",
                            "pending": 2,
                            "confirmed": 10,
                            "rejected": 1,
                            "confirmed_students": [
                                {"id": 12, "name": "Ana Pérez López", "ci": "01010199912345"},
                            ],
                        }
                    ],
                },
                "error": None,
            },
            response_only=True,
        ),
    ],
)
class SchoolExamConfirmationMetricsView(APIView):
    permission_classes = [IsSchoolSecretary]

    def get(self, request):
        year = timezone.now().year
        process = Proceso.get_for_stage_and_year(year, ETAPAS_NOMBRES[4])
        confirmations = ConfirmacionPrueba.objects.filter(
            proceso=process,
            estudiante__escuela_id=request.user.escuela_id,
        ).select_related("estudiante", "asignatura") if process else ConfirmacionPrueba.objects.none()
        subjects = {}
        for confirmation in confirmations.order_by("fecha_prueba", "asignatura__nombre", "estudiante__apellidos", "estudiante__nombre"):
            subject = subjects.setdefault(confirmation.asignatura.nombre, {
                "pending": 0, "confirmed": 0, "rejected": 0, "confirmed_students": []
            })
            if confirmation.confirmada is None:
                status = "pending"
            elif confirmation.confirmada:
                status = "confirmed"
            else:
                status = "rejected"
            subject[status] += 1
            if status == "confirmed":
                subject["confirmed_students"].append({
                    "id": confirmation.estudiante_id,
                    "name": f"{confirmation.estudiante.nombre} {confirmation.estudiante.apellidos}",
                    "ci": confirmation.estudiante.ci,
                })
        return Response({
            "year": year,
            "process_id": process.id if process else None,
            "stage_active": bool(process and process.etapa.estado == "en_curso"),
            "subjects": [
                {"name": name, "pending": values["pending"], "confirmed": values["confirmed"], "rejected": values["rejected"], "confirmed_students": values["confirmed_students"]}
                for name, values in sorted(subjects.items())
            ],
        })


class SchoolSolicitudView(APIView):
    permission_classes = [IsSchoolSecretary]

    @extend_schema(
        tags=["Gestión"],
        summary="Boletas de solicitud de la escuela",
        description=(
            "Lista las boletas de solicitud (etapa 3) enviadas, aprobadas o modificadas por los "
            "estudiantes de la escuela del usuario autenticado en el proceso vigente, junto con datos "
            "básicos del estudiante (incluyendo su índice general más reciente) y métricas agregadas "
            "(cantidades por estado, top de carreras y desglose por sexo y tipo de otorgamiento, "
            "considerando solo plazas publicadas para la provincia de la escuela). "
            "Requiere Secretario o Director de Escuela (o superusuario) con escuela asignada."
        ),
        responses={
            200: inline_serializer(
                name="SchoolSolicitudListResponse",
                fields={
                    "items": serializers.ListField(
                        child=serializers.DictField(),
                        help_text="Cada elemento combina los campos de BoletaSolicitudSerializer con un objeto 'student' ({nombre, apellidos, ci, indice_general}).",
                    ),
                    "stage_active": serializers.BooleanField(),
                    "metrics": inline_serializer(
                        name="SchoolSolicitudMetrics",
                        fields={
                            "enviadas": serializers.IntegerField(),
                            "pendientes": serializers.IntegerField(),
                            "pendientes_aprobar": serializers.IntegerField(),
                            "pendientes_enviar": serializers.IntegerField(),
                            "aprobadas": serializers.IntegerField(),
                            "modificadas": serializers.IntegerField(),
                            "total_boletas": serializers.IntegerField(),
                            "top_carreras": inline_serializer(
                                name="SchoolSolicitudTopCarrera",
                                fields={
                                    "id": serializers.IntegerField(),
                                    "nombre": serializers.CharField(),
                                    "total": serializers.IntegerField(),
                                },
                                many=True,
                            ),
                            "sexo": inline_serializer(
                                name="SchoolSolicitudSexo",
                                fields={"label": serializers.CharField(), "total": serializers.IntegerField()},
                                many=True,
                            ),
                            "tipo_otorgamiento": inline_serializer(
                                name="SchoolSolicitudTipoOtorgamiento",
                                fields={"label": serializers.CharField(), "total": serializers.IntegerField()},
                                many=True,
                            ),
                        },
                    ),
                },
            ),
        },
        examples=[
            OpenApiExample(
                "Respuesta exitosa",
                value={
                    "success": True,
                    "data": {
                        "items": [
                            {
                                "id": 5,
                                "proceso": 7,
                                "estado": "pendiente",
                                "fecha_enviada": "2026-05-10",
                                "fecha_aprobada": None,
                                "items": [],
                                "student": {"nombre": "Ana", "apellidos": "Pérez López", "ci": "01010199912345", "indice_general": 92.5},
                            }
                        ],
                        "stage_active": True,
                        "metrics": {
                            "enviadas": 1,
                            "pendientes": 1,
                            "pendientes_aprobar": 1,
                            "pendientes_enviar": 0,
                            "aprobadas": 0,
                            "modificadas": 0,
                            "total_boletas": 1,
                            "top_carreras": [{"id": 3, "nombre": "Ingeniería Informática", "total": 1}],
                            "sexo": [{"label": "F", "total": 1}],
                            "tipo_otorgamiento": [{"label": "Curso Regular", "total": 1}],
                        },
                    },
                    "error": None,
                },
                response_only=True,
            ),
        ],
    )
    def get(self, request):
        stage = Etapa.objects.filter(nombre=ETAPAS_NOMBRES[3]).first()
        process = Proceso.get_for_stage_and_year(timezone.now().year, ETAPAS_NOMBRES[3])
        escalafon_process = Proceso.get_for_stage_and_year(timezone.now().year, ETAPAS_NOMBRES[1])
        ballots = BoletaSolicitud.objects.filter(
            estudiante__escuela_id=request.user.escuela_id,
            proceso=process,
            estado__in={"pendiente", "aprobada", "modificada"},
        ).select_related("estudiante", "estudiante__escuela").prefetch_related("boleta_solicitud__plan_plaza__carrera") if process else BoletaSolicitud.objects.none()
        students = Estudiante.objects.filter(
            escuela_id=request.user.escuela_id,
            escalafones__escalafon__proceso=escalafon_process,
        ).distinct() if escalafon_process else Estudiante.objects.none()
        submitted_ballots = ballots.filter(estado__in={"pendiente", "aprobada", "modificada"})
        all_ballots = list(submitted_ballots)
        school_province_id = request.user.escuela.municipio.provincia_id
        published_plan_ids = set(PlanPlaza.objects.filter(
            proceso=process,
            provincia_id=school_province_id,
        ).values_list("id", flat=True)) if process else set()
        submitted_count = len(all_ballots)
        career_counts = {}
        sex_counts = {}
        type_counts = {}
        for ballot in all_ballots:
            valid_items = [
                item for item in ballot.boleta_solicitud.all()
                if item.plan_plaza_id in published_plan_ids
            ]
            if not valid_items:
                continue
            sex = ballot.estudiante.sexo or "N/D"
            sex_counts[sex] = sex_counts.get(sex, 0) + 1
            for item in valid_items:
                career = item.plan_plaza.carrera
                career_counts[career.id] = {"id": career.id, "nombre": career.nombre, "total": career_counts.get(career.id, {}).get("total", 0) + 1}
                tipo = item.plan_plaza.otorgamiento_tipo.nombre
                type_counts[tipo] = type_counts.get(tipo, 0) + 1
        return Response({
            "items": [{**BoletaSolicitudSerializer(ballot).data, "student": {"nombre": ballot.estudiante.nombre, "apellidos": ballot.estudiante.apellidos, "ci": ballot.estudiante.ci, "indice_general": (EscalafonItem.objects.filter(estudiante=ballot.estudiante, escalafon__proceso__anio__year=timezone.now().year).order_by("-escalafon_id", "-id").values_list("indice_general", flat=True).first() or ballot.estudiante.indice_general)}} for ballot in ballots],
            "stage_active": bool(stage and stage.estado == "en_curso"),
            "metrics": {
                "enviadas": submitted_count,
                "pendientes": sum(ballot.estado == "pendiente" for ballot in all_ballots),
                "pendientes_aprobar": sum(ballot.estado == "pendiente" for ballot in all_ballots),
                "pendientes_enviar": max(students.count() - submitted_count, 0),
                "aprobadas": sum(ballot.estado == "aprobada" for ballot in all_ballots),
                "modificadas": sum(ballot.estado == "modificada" for ballot in all_ballots),
                "total_boletas": len(all_ballots),
                "top_carreras": sorted(career_counts.values(), key=lambda career: (-career["total"], career["nombre"]))[:10],
                "sexo": [{"label": label, "total": total} for label, total in sorted(sex_counts.items())],
                "tipo_otorgamiento": [{"label": label, "total": total} for label, total in sorted(type_counts.items())],
            },
        })

    @extend_schema(
        tags=["Gestión"],
        summary="Aprobar una boleta de solicitud",
        description=(
            "Aprueba una boleta de solicitud pendiente perteneciente a un estudiante de la escuela del "
            "usuario autenticado. Solo el Secretario de Escuela (o un superusuario) puede aprobar, y "
            "únicamente mientras la etapa 3 esté en curso. La boleta debe pertenecer a la escuela del "
            "usuario y estar en estado 'pendiente'. Al aprobarla se registra auditoría y se notifica al "
            "estudiante."
        ),
        parameters=[
            OpenApiParameter(
                name="ballot_id",
                type=OpenApiTypes.INT,
                location=OpenApiParameter.PATH,
                description="Identificador de la boleta de solicitud (BoletaSolicitud) a aprobar.",
                required=True,
            ),
        ],
        request=None,
        responses={
            200: BoletaSolicitudSerializer,
            400: inline_serializer(
                name="SchoolSolicitudApproveBadRequest",
                fields={"detail": serializers.CharField()},
            ),
            403: inline_serializer(
                name="SchoolSolicitudApproveForbidden",
                fields={"detail": serializers.CharField()},
            ),
            404: inline_serializer(
                name="SchoolSolicitudApproveNotFound",
                fields={"detail": serializers.CharField()},
            ),
        },
        examples=[
            OpenApiExample(
                "Boleta aprobada",
                value={
                    "success": True,
                    "data": {
                        "id": 5,
                        "proceso": 7,
                        "estado": "aprobada",
                        "fecha_enviada": "2026-05-10",
                        "fecha_aprobada": "2026-05-12",
                        "items": [],
                    },
                    "error": None,
                },
                response_only=True,
            ),
            OpenApiExample(
                "No es Secretario de Escuela",
                value={
                    "success": False,
                    "data": None,
                    "error": "Solo el Secretario de Escuela puede aprobar boletas.",
                },
                response_only=True,
                status_codes=["403"],
            ),
            OpenApiExample(
                "Boleta ya procesada",
                value={
                    "success": False,
                    "data": None,
                    "error": "Solo pueden aprobarse boletas pendientes.",
                },
                response_only=True,
                status_codes=["400"],
            ),
        ],
    )
    def post(self, request, ballot_id):
        if request.user.rol != "secretario_escuela" and not request.user.is_superuser:
            return Response({"detail": "Solo el Secretario de Escuela puede aprobar boletas."}, status=403)
        stage = Etapa.objects.filter(nombre=ETAPAS_NOMBRES[3]).first()
        if not stage or stage.estado != "en_curso":
            return Response({"detail": "Las aprobaciones solo están disponibles durante la etapa 3."}, status=403)
        ballot = BoletaSolicitud.objects.filter(pk=ballot_id, estudiante__escuela_id=request.user.escuela_id).first()
        if not ballot:
            return Response({"detail": "No existe la boleta en tu escuela."}, status=404)
        if ballot.estado != "pendiente":
            return Response({"detail": "Solo pueden aprobarse boletas pendientes."}, status=400)
        ballot.estado = "aprobada"
        ballot.aprobada_por = request.user.get_full_name() or request.user.username
        ballot.fecha_aprobada = timezone.localdate()
        ballot.save(update_fields=["estado", "aprobada_por", "fecha_aprobada"])
        record_audit(request.user, "Aprobación de boleta de solicitud", request.path, request=request, previous={"estado": "pendiente"}, new={"estado": "aprobada", "boleta_id": ballot.id, "estudiante": ballot.estudiante.ci})
        notify_users(
            [Usuario.objects.filter(pk=ballot.estudiante.usuario_id).first()],
            "Boleta aprobada: puedes solicitar una modificación",
            f"El Secretario aprobó tu boleta de solicitud del proceso {ballot.proceso.anio.year}. Si necesitas cambiar tus preferencias, puedes solicitar una modificación al Jefe de Comisión.",
        )
        return Response(BoletaSolicitudSerializer(ballot).data)
