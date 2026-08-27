from django.utils import timezone
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.models import Notificacion
from apps.gestion_escuela.models import EscalafonItem
from apps.gestion_provincial.models import ETAPAS_NOMBRES, Etapa, Proceso
from .models import ConfirmacionPrueba


class StudentDashboardView(APIView):
	permission_classes = [IsAuthenticated]

	def get(self, request):
		if request.user.rol != "estudiante":
			return Response({"detail": "Solo un estudiante puede consultar este resumen."}, status=403)

		student = request.user.estudiante
		process = Proceso.objects.filter(anio__year=timezone.now().year).order_by("-id").first()
		current_entry = EscalafonItem.objects.filter(
			estudiante__usuario=request.user,
			escalafon__proceso=process,
		).first() if process else None
		school_entries = EscalafonItem.objects.filter(
			escalafon__escuela=student.escuela,
			escalafon__proceso=process,
		).order_by("-indice_general", "estudiante__apellidos", "estudiante__nombre") if process else EscalafonItem.objects.none()

		position = next((index for index, entry in enumerate(school_entries, start=1) if entry.id == getattr(current_entry, "id", None)), None)
		interest = student.boleta_interes.filter(proceso=process).first() if process else None
		confirmations = ConfirmacionPrueba.objects.filter(estudiante=student, proceso=process) if process else ConfirmacionPrueba.objects.none()
		active_stage = Etapa.objects.filter(estado="en_curso").order_by("id").first()
		stages = []
		for number, name in ETAPAS_NOMBRES.items():
			stage = Etapa.objects.filter(nombre=name).first()
			stages.append({"numero": number, "nombre": name, "estado": stage.estado if stage else "no_iniciada"})

		notifications = Notificacion.objects.filter(usuario=request.user).order_by("-created_at")[:5]
		return Response({
			"student": {
				"nombre": student.nombre,
				"apellidos": student.apellidos,
				"escuela": student.escuela.nombre,
				"municipio": student.escuela.municipio.nombre,
			},
			"active_stage": {
				"numero": next((number for number, name in ETAPAS_NOMBRES.items() if name == active_stage.nombre), None),
				"nombre": active_stage.nombre,
				"fecha_fin": active_stage.fecha_fin,
			} if active_stage else None,
			"academic": {
				"indice_10": current_entry.indice_10 if current_entry else student.indice_10,
				"indice_11": current_entry.indice_11 if current_entry else student.indice_11,
				"indice_12": current_entry.indice_12 if current_entry else student.indice_12,
				"indice_general": current_entry.indice_general if current_entry else student.indice_general,
				"position": position,
				"entries_count": school_entries.count(),
			},
			"interest_count": interest.boleta_interes.count() if interest else 0,
			"confirmations_count": confirmations.filter(confirmada=True).count(),
			"stages": stages,
			"notifications": [
				{"id": notification.id, "mensaje": notification.mensaje, "created_at": notification.created_at}
				for notification in notifications
			],
		})

# Create your views here.
