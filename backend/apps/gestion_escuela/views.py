from django.conf import settings
from django.db.models import Count
from django.utils import timezone
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.authentication.models import Estudiante, Usuario
from apps.core.notifications import notify_users
from apps.gestion_personal.models import BoletaInteres, BoletaInteresItem, BoletaSolicitud, ConfirmacionPrueba
from apps.gestion_personal.serializers import BoletaSolicitudSerializer
from apps.gestion_provincial.models import ETAPAS_NOMBRES, Etapa, Proceso
from .models import EscalafonItem
from .permissions import CanViewStudentsWithoutAccount, IsSchoolSecretary
from .serializers import StudentsWithoutAccountSerializer


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
		latest_stage = Etapa.objects.filter(estado__in={"en_curso", "completada"}).order_by("-id").first()
		latest_stage_number = next((number for number, name in ETAPAS_NOMBRES.items() if latest_stage and name == latest_stage.nombre), None)
		return Response({
			"year": year,
			"active_stage": {"numero": active_stage_number, "nombre": active_stage.nombre} if active_stage else None,
			"ballot_stage": {"numero": latest_stage_number, "nombre": latest_stage.nombre} if latest_stage else None,
			"students": students.count(),
			"students_with_account": students.filter(usuario__isnull=False).count(),
			"escalafon": {"sent": entries.filter(escalafon__estado="enviado").values("escalafon_id").distinct().count(), "accepted": entries.filter(estado="aceptado").count(), "review": entries.filter(estado="por_revisar").count(), "no_response": entries.filter(estado="sin_respuesta").count()},
			"interest": {"sent": interest.filter(enviada=True).count(), "pending": max(students.count() - interest.filter(enviada=True).count(), 0)},
			"solicitud": {"sent": solicitud.filter(estado__in={"pendiente", "aprobada"}).count(), "pending": max(students.count() - solicitud.filter(estado__in={"pendiente", "aprobada"}).count(), 0), "approved": solicitud.filter(estado="aprobada").count()},
		})


class SchoolInterestMetricsView(APIView):
	permission_classes = [CanViewStudentsWithoutAccount]

	def get(self, request):
		stage = Etapa.objects.filter(nombre=ETAPAS_NOMBRES[2]).first()
		if stage and stage.estado == "en_curso" and stage.fecha_fin and stage.fecha_fin < timezone.localdate():
			stage.estado = "completada"
			stage.save(update_fields=["estado"])
		if not settings.DEBUG and (not stage or stage.estado != "en_curso"):
			return Response({"detail": "Las métricas estarán disponibles durante la Etapa 2."}, status=403)

		process = Proceso.get_for_stage_and_year(timezone.now().year, ETAPAS_NOMBRES[2])
		escalafon_process = Proceso.get_for_stage_and_year(timezone.now().year, ETAPAS_NOMBRES[1])
		students = Estudiante.objects.filter(
			escuela_id=request.user.escuela_id,
			escalafones__escalafon__proceso=escalafon_process,
		).distinct()
		ballots = BoletaInteres.objects.filter(estudiante__in=students, proceso=process) if process else BoletaInteres.objects.none()
		top_careers = BoletaInteresItem.objects.filter(boleta_interes__in=ballots).values(
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
			"stage": {"active": True, "fecha_fin": stage.fecha_fin if stage else None},
			"top_carreras": [
				{"id": career["carrera__id"], "nombre": career["carrera__nombre"], "total": career["total"]}
				for career in top_careers
			],
			"sexo": [{"label": item["sexo"] or "N/D", "total": item["total"]} for item in sex_counts],
			"tipo_otorgamiento": [],
		})


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
			subject = subjects.setdefault(confirmation.asignatura.nombre, {"pending": 0, "confirmed": 0, "rejected": 0, "confirmed_students": []})
			status = "pending" if confirmation.confirmada is None else "confirmed" if confirmation.confirmada else "rejected"
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
				for name, values in subjects.items()
			],
		})


class SchoolSolicitudView(APIView):
	permission_classes = [IsSchoolSecretary]

	def get(self, request):
		stage = Etapa.objects.filter(nombre=ETAPAS_NOMBRES[3]).first()
		process = Proceso.get_for_stage_and_year(timezone.now().year, ETAPAS_NOMBRES[3])
		escalafon_process = Proceso.get_for_stage_and_year(timezone.now().year, ETAPAS_NOMBRES[1])
		ballots = BoletaSolicitud.objects.filter(estudiante__escuela_id=request.user.escuela_id, proceso=process).select_related("estudiante", "estudiante__escuela").prefetch_related("boleta_solicitud__plan_plaza__carrera") if process else BoletaSolicitud.objects.none()
		students = Estudiante.objects.filter(
			escuela_id=request.user.escuela_id,
			escalafones__escalafon__proceso=escalafon_process,
		).distinct() if escalafon_process else Estudiante.objects.none()
		all_ballots = list(ballots)
		submitted_count = sum(ballot.estado in {"pendiente", "aprobada"} for ballot in all_ballots)
		career_counts = {}
		sex_counts = {}
		type_counts = {}
		for ballot in all_ballots:
			sex = ballot.estudiante.sexo or "N/D"
			sex_counts[sex] = sex_counts.get(sex, 0) + 1
			for item in ballot.boleta_solicitud.all():
				career = item.plan_plaza.carrera
				career_counts[career.id] = {"id": career.id, "nombre": career.nombre, "total": career_counts.get(career.id, {}).get("total", 0) + 1}
				tipo = item.plan_plaza.otorgamiento_tipo
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
				"total_boletas": len(all_ballots),
				"top_carreras": sorted(career_counts.values(), key=lambda career: (-career["total"], career["nombre"]))[:10],
				"sexo": [{"label": label, "total": total} for label, total in sorted(sex_counts.items())],
				"tipo_otorgamiento": [{"label": label, "total": total} for label, total in sorted(type_counts.items())],
			},
		})

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
		notify_users(
			[Usuario.objects.filter(pk=ballot.estudiante.usuario_id).first()],
			"Boleta aprobada: puedes solicitar una modificación",
			f"El Secretario aprobó tu boleta de solicitud del proceso {ballot.proceso.anio.year}. Si necesitas cambiar tus preferencias, puedes solicitar una modificación al Jefe de Comisión.",
		)
		return Response(BoletaSolicitudSerializer(ballot).data)
