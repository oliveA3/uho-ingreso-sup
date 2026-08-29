from django.conf import settings
from django.db.models import Count
from django.utils import timezone
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.authentication.models import Estudiante
from apps.gestion_personal.models import BoletaInteres, BoletaInteresItem, BoletaSolicitud
from apps.gestion_personal.serializers import BoletaSolicitudSerializer
from apps.gestion_provincial.models import ETAPAS_NOMBRES, Etapa, Proceso
from .permissions import CanViewStudentsWithoutAccount, IsSchoolSecretary
from .serializers import StudentsWithoutAccountSerializer


class StudentsWithoutAccountView(APIView):
	permission_classes = [CanViewStudentsWithoutAccount]

	def get(self, request):
		students = Estudiante.objects.filter(
			escuela_id=request.user.escuela_id,
			usuario__isnull=True,
		).order_by("apellidos", "nombre")
		return Response({"students": StudentsWithoutAccountSerializer(students, many=True).data})


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
		students = Estudiante.objects.filter(escuela_id=request.user.escuela_id)
		ballots = BoletaInteres.objects.filter(estudiante__in=students, proceso=process) if process else BoletaInteres.objects.none()
		top_careers = BoletaInteresItem.objects.filter(boleta_interes__in=ballots).values(
			"carrera__id", "carrera__nombre"
		).annotate(total=Count("id")).order_by("-total", "carrera__nombre")[:10]
		total_students = students.count()
		sent_count = ballots.filter(enviada=True).count()
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
		})


class SchoolSolicitudView(APIView):
	permission_classes = [IsSchoolSecretary]

	def get(self, request):
		stage = Etapa.objects.filter(nombre=ETAPAS_NOMBRES[3]).first()
		process = Proceso.get_for_stage_and_year(timezone.now().year, ETAPAS_NOMBRES[3])
		ballots = BoletaSolicitud.objects.filter(estudiante__escuela_id=request.user.escuela_id, proceso=process).select_related("estudiante", "estudiante__escuela").prefetch_related("boleta_solicitud__plan_plaza__carrera") if process else BoletaSolicitud.objects.none()
		return Response({
			"items": [{**BoletaSolicitudSerializer(ballot).data, "student": {"nombre": ballot.estudiante.nombre, "apellidos": ballot.estudiante.apellidos, "ci": ballot.estudiante.ci, "indice_general": ballot.estudiante.indice_general}} for ballot in ballots],
			"stage_active": bool(stage and stage.estado == "en_curso"),
		})

	def post(self, request, ballot_id):
		ballot = BoletaSolicitud.objects.filter(pk=ballot_id, estudiante__escuela_id=request.user.escuela_id).first()
		if not ballot:
			return Response({"detail": "No existe la boleta en tu escuela."}, status=404)
		if ballot.estado != "por_aprobar":
			return Response({"detail": "Solo pueden aprobarse boletas pendientes."}, status=400)
		ballot.estado = "aprobada"
		ballot.aprobada_por = request.user.get_full_name() or request.user.username
		ballot.fecha_aprobada = timezone.localdate()
		ballot.save(update_fields=["estado", "aprobada_por", "fecha_aprobada"])
		return Response(BoletaSolicitudSerializer(ballot).data)
