from django.conf import settings
from django.http import HttpResponse
from django.db import transaction
from django.utils import timezone
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.models import Notificacion
from apps.gestion_escuela.models import EscalafonItem
from apps.gestion_provincial.models import ETAPAS_NOMBRES, Etapa, PlanPlaza, Proceso
from apps.superadmin.models import Carrera
from .models import BoletaInteres, BoletaInteresItem, BoletaSolicitud, BoletaSolicitudItem, ConfirmacionPrueba
from .serializers import AddBoletaInteresItemSerializer, BoletaInteresItemSerializer, BoletaSolicitudSerializer


def current_interest_context(request):
	if request.user.rol != "estudiante":
		return None, None, Response({"detail": "Solo un estudiante puede gestionar esta boleta."}, status=403)
	try:
		student = request.user.estudiante
	except Exception:
		return None, None, Response({"detail": "El usuario no tiene un perfil de estudiante."}, status=400)
	stage = Etapa.objects.filter(nombre=ETAPAS_NOMBRES[2]).first()
	process = Proceso.get_for_stage_and_year(timezone.now().year, stage) if stage else None
	if stage and stage.estado == "en_curso" and stage.fecha_fin and stage.fecha_fin < timezone.localdate():
		stage.estado = "completada"
		stage.save(update_fields=["estado"])
	return student, (process, stage), None


class StudentInterestView(APIView):
	permission_classes = [IsAuthenticated]

	def get(self, request):
		student, context, error = current_interest_context(request)
		if error:
			return error
		process, stage = context
		if not process:
			return Response({"detail": "No hay un proceso de ingreso activo."}, status=404)
		ballot, _ = BoletaInteres.objects.get_or_create(estudiante=student, proceso=process)
		available = Carrera.objects.filter(activa=True).values(
			"id", "codigo", "nombre", "ces__nombre", "provincia__nombre"
		).order_by("nombre")
		stage_active = settings.DEBUG or bool(stage and stage.estado == "en_curso")
		return Response({
			"id": ballot.id, "proceso": process.anio, "enviada": ballot.enviada,
			"fecha_enviada": ballot.fecha_enviada,
			"items": BoletaInteresItemSerializer(ballot.boleta_interes.order_by("prioridad"), many=True).data,
			"available_careers": [
				{"id": row["id"], "codigo": row["codigo"], "nombre": row["nombre"],
				 "ces_nombre": row["ces__nombre"], "provincia_nombre": row["provincia__nombre"]}
				for row in available
			],
			"stage": {"active": stage_active,
					  "fecha_fin": stage.fecha_fin if stage else None,
					  "dias_restantes": max((stage.fecha_fin - timezone.localdate()).days, 0) if stage and stage.fecha_fin else None},
			"max_items": 10,
		})


class StudentInterestItemView(APIView):
	permission_classes = [IsAuthenticated]

	def post(self, request):
		student, context, error = current_interest_context(request)
		if error:
			return error
		process, stage = context
		if not process or (not settings.DEBUG and (not stage or stage.estado != "en_curso")):
			return Response({"detail": "La boleta no está disponible para edición."}, status=403)
		ballot, _ = BoletaInteres.objects.get_or_create(estudiante=student, proceso=process)
		if ballot.enviada:
			return Response({"detail": "La boleta ya fue enviada."}, status=400)
		if ballot.boleta_interes.count() >= 10:
			return Response({"detail": "Solo puedes seleccionar hasta 10 carreras."}, status=400)
		serializer = AddBoletaInteresItemSerializer(data=request.data)
		serializer.is_valid(raise_exception=True)
		career = serializer.validated_data["carrera"]
		if ballot.boleta_interes.filter(carrera=career).exists():
			return Response({"detail": "Ya seleccionaste esta carrera."}, status=400)
		item = BoletaInteresItem.objects.create(boleta_interes=ballot, carrera=career, prioridad=ballot.boleta_interes.count() + 1)
		return Response(BoletaInteresItemSerializer(item).data, status=201)

	def delete(self, request, item_id):
		student, context, error = current_interest_context(request)
		if error:
			return error
		process, stage = context
		ballot = BoletaInteres.objects.filter(estudiante=student, proceso=process).first() if process else None
		if not ballot or ballot.enviada or (not settings.DEBUG and (not stage or stage.estado != "en_curso")):
			return Response({"detail": "La boleta no está disponible para edición."}, status=403)
		item = ballot.boleta_interes.filter(pk=item_id).first()
		if not item:
			return Response({"detail": "La carrera no está en tu boleta."}, status=404)
		item.delete()
		for priority, remaining in enumerate(ballot.boleta_interes.order_by("prioridad"), start=1):
			if remaining.prioridad != priority:
				remaining.prioridad = priority
				remaining.save(update_fields=["prioridad"])
		return Response(status=204)

	def patch(self, request, item_id):
		student, context, error = current_interest_context(request)
		if error:
			return error
		process, stage = context
		ballot = BoletaInteres.objects.filter(estudiante=student, proceso=process).first() if process else None
		if not ballot or ballot.enviada or (not settings.DEBUG and (not stage or stage.estado != "en_curso")):
			return Response({"detail": "La boleta no está disponible para edición."}, status=403)
		item = ballot.boleta_interes.filter(pk=item_id).first()
		if not item:
			return Response({"detail": "La carrera no está en tu boleta."}, status=404)
		direction = request.data.get("direction")
		if direction not in {"up", "down"}:
			return Response({"detail": "La dirección debe ser 'up' o 'down'."}, status=400)
		priority_filter = {"prioridad__lt": item.prioridad} if direction == "up" else {"prioridad__gt": item.prioridad}
		neighbor = ballot.boleta_interes.filter(**priority_filter).order_by(
			"-prioridad" if direction == "up" else "prioridad"
		).first()
		if not neighbor:
			return Response(BoletaInteresItemSerializer(item).data)
		with transaction.atomic():
			old_priority = item.prioridad
			item.prioridad = 0
			item.save(update_fields=["prioridad"])
			item.prioridad = neighbor.prioridad
			neighbor.prioridad = old_priority
			neighbor.save(update_fields=["prioridad"])
			item.save(update_fields=["prioridad"])
		return Response(BoletaInteresItemSerializer(item).data)


class StudentInterestSendView(APIView):
	permission_classes = [IsAuthenticated]

	def post(self, request):
		student, context, error = current_interest_context(request)
		if error:
			return error
		process, stage = context
		ballot = BoletaInteres.objects.filter(estudiante=student, proceso=process).first() if process else None
		if not ballot or (not settings.DEBUG and (not stage or stage.estado != "en_curso")):
			return Response({"detail": "La boleta no está disponible para envío."}, status=403)
		if ballot.enviada:
			return Response({"detail": "La boleta ya fue enviada."}, status=400)
		if ballot.boleta_interes.count() != 10:
			return Response({"detail": "Debes seleccionar exactamente 10 carreras para enviar la boleta."}, status=400)
		ballot.enviada = True
		ballot.fecha_enviada = timezone.localdate()
		ballot.save(update_fields=["enviada", "fecha_enviada"])
		return Response({"detail": "Boleta de interés enviada correctamente."})


class StudentInterestEditView(APIView):
	permission_classes = [IsAuthenticated]

	def post(self, request):
		student, context, error = current_interest_context(request)
		if error:
			return error
		process, stage = context
		ballot = BoletaInteres.objects.filter(estudiante=student, proceso=process).first() if process else None
		if not ballot or (not settings.DEBUG and (not stage or stage.estado != "en_curso")):
			return Response({"detail": "La boleta no está disponible para edición."}, status=403)
		if not ballot.enviada:
			return Response({"detail": "La boleta ya está pendiente de envío."}, status=400)
		ballot.enviada = False
		ballot.fecha_enviada = None
		ballot.save(update_fields=["enviada", "fecha_enviada"])
		return Response({"detail": "La boleta volvió a estar pendiente y puede editarse."})


def current_solicitud_context(request):
	if request.user.rol != "estudiante":
		return None, None, Response({"detail": "Solo un estudiante puede gestionar esta boleta."}, status=403)
	try:
		student = request.user.estudiante
	except Exception:
		return None, None, Response({"detail": "El usuario no tiene un perfil de estudiante."}, status=400)
	stage = Etapa.objects.filter(nombre=ETAPAS_NOMBRES[3]).first()
	process = Proceso.get_for_stage_and_year(timezone.now().year, stage) if stage else None
	return student, (process, stage), None


class StudentSolicitudView(APIView):
	permission_classes = [IsAuthenticated]

	def get(self, request):
		student, context, error = current_solicitud_context(request)
		if error:
			return error
		process, stage = context
		if not process:
			return Response({"detail": "No hay un proceso de solicitud activo."}, status=404)
		ballot, _ = BoletaSolicitud.objects.get_or_create(estudiante=student, proceso=process)
		province_id = student.escuela.municipio.provincia_id
		plans = PlanPlaza.objects.filter(proceso=process, provincia_id=province_id).select_related("carrera", "ces", "provincia").order_by("carrera__nombre")
		return Response({
			**BoletaSolicitudSerializer(ballot).data,
			"student": {"nombre": student.nombre, "apellidos": student.apellidos, "ci": student.ci,
				"escuela": student.escuela.nombre, "indice_general": student.indice_general},
			"available_plans": [{"id": plan.id, "carrera_nombre": plan.carrera.nombre, "carrera_codigo": plan.carrera.codigo,
				"ces_nombre": plan.ces.nombre, "provincia_nombre": plan.provincia.nombre,
				"cantidad_plazas": plan.cantidad_plazas, "otorgamiento_tipo": plan.otorgamiento_tipo, "sexo": plan.sexo}
				for plan in plans],
			"max_items": 10, "stage_active": settings.DEBUG or bool(stage and stage.estado == "en_curso"),
		})

	def post(self, request):
		student, context, error = current_solicitud_context(request)
		if error:
			return error
		process, stage = context
		if not process or (not settings.DEBUG and (not stage or stage.estado != "en_curso")):
			return Response({"detail": "La boleta no está disponible para edición."}, status=403)
		ballot, _ = BoletaSolicitud.objects.get_or_create(estudiante=student, proceso=process)
		if ballot.estado == "aprobada":
			return Response({"detail": "La boleta aprobada requiere autorización del Jefe de Comisión para modificarse."}, status=409)
		plan_ids = request.data.get("plan_plazas", [])
		confirm = request.data.get("confirmar", False)
		if not isinstance(plan_ids, list) or len(plan_ids) == 0 or len(plan_ids) > 10 or len(set(plan_ids)) != len(plan_ids):
			return Response({"detail": "Debes seleccionar entre 1 y 10 carreras sin repetir."}, status=400)
		plans = list(PlanPlaza.objects.filter(id__in=plan_ids, proceso=process, provincia_id=student.escuela.municipio.provincia_id))
		if len(plans) != len(plan_ids):
			return Response({"detail": "Una o más carreras no pertenecen al plan de plazas disponible."}, status=400)
		if not confirm:
			return Response({"confirmacion_requerida": True, "detail": "Confirma el orden de prioridades antes de enviar."}, status=200)
		with transaction.atomic():
			ballot.boleta_solicitud.all().delete()
			BoletaSolicitudItem.objects.bulk_create([
				BoletaSolicitudItem(boleta_solicitud=ballot, plan_plaza=next(plan for plan in plans if plan.id == plan_id), prioridad=priority)
				for priority, plan_id in enumerate(plan_ids, start=1)
			])
			ballot.estado = "por_aprobar"
			ballot.fecha_enviada = timezone.localdate()
			ballot.save(update_fields=["estado", "fecha_enviada"])
		return Response(BoletaSolicitudSerializer(ballot).data, status=201)


class StudentSolicitudPdfView(APIView):
	permission_classes = [IsAuthenticated]

	def get(self, request):
		student, context, error = current_solicitud_context(request)
		if error:
			return error
		process, _ = context
		ballot = BoletaSolicitud.objects.filter(estudiante=student, proceso=process).first() if process else None
		if not ballot:
			return Response({"detail": "No existe una boleta de solicitud."}, status=404)
		lines = ["BOLETA DE SOLICITUD", f"Nombre: {student.nombre} {student.apellidos}", f"CI: {student.ci}",
			f"Escuela: {student.escuela.nombre}", f"Indice general: {student.indice_general or ''}", "", "Prioridad | Carrera"]
		lines += [f"{item.prioridad} | {item.plan_plaza.carrera.nombre}" for item in ballot.boleta_solicitud.select_related("plan_plaza__carrera").order_by("prioridad")]
		content = "BT /F1 11 Tf 40 800 Td " + " ".join(f"({line.replace('(', '[').replace(')', ']')}) Tj 0 -18 Td" for line in lines) + " ET"
		objects = [b"1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj", b"2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj", b"3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 842]/Resources<</Font<</F1 4 0 R>>>>/Contents 5 0 R>>endobj", b"4 0 obj<</Type/Font/Subtype/Type1/BaseFont/Courier>>endobj", f"5 0 obj<</Length {len(content.encode())}>>stream\n{content}\nendstream endobj".encode()]
		response = HttpResponse(b"%PDF-1.4\n" + b"\n".join(objects) + b"\ntrailer<</Root 1 0 R>>\n%%EOF", content_type="application/pdf")
		response["Content-Disposition"] = 'attachment; filename="boleta-solicitud.pdf"'
		return response


class StudentDashboardView(APIView):
	permission_classes = [IsAuthenticated]

	def get(self, request):
		if request.user.rol != "estudiante":
			return Response({"detail": "Solo un estudiante puede consultar este resumen."}, status=403)

		student = request.user.estudiante
		process = Proceso.get_for_stage_and_year(timezone.now().year, ETAPAS_NOMBRES[1])
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

		notifications = Notificacion.objects.filter(usuario=request.user).order_by("-fecha")[:5]
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
				{"id": notification.id, "titulo": notification.titulo, "contenido": notification.contenido, "fecha": notification.fecha}
				for notification in notifications
			],
		})

# Create your views here.
