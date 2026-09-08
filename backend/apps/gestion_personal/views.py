from django.conf import settings
from django.http import HttpResponse
from django.db import transaction
from django.utils import timezone
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.models import Notificacion
from apps.authentication.models import Usuario
from apps.gestion_escuela.models import EscalafonItem
from apps.gestion_provincial.models import CorteCarrera, ETAPAS_NOMBRES, Etapa, PlanPlaza, Proceso
from apps.gestion_provincial.models import Otorgamiento
from apps.superadmin.models import Carrera
from .models import BoletaInteres, BoletaInteresItem, BoletaSolicitud, BoletaSolicitudItem, BoletaSolicitudItemAnterior, ConfirmacionPrueba
from .serializers import AddBoletaInteresItemSerializer, BoletaInteresItemSerializer, BoletaSolicitudSerializer, StudentProfileSerializer


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


class StudentProfileView(APIView):
	permission_classes = [IsAuthenticated]

	def get(self, request):
		if request.user.rol != "estudiante":
			return Response({"detail": "Solo un estudiante puede consultar este perfil."}, status=403)
		try:
			student = request.user.estudiante
		except Exception:
			return Response({"detail": "El usuario no tiene un perfil de estudiante."}, status=400)
		return Response(StudentProfileSerializer(student).data)

	def patch(self, request):
		if request.user.rol != "estudiante":
			return Response({"detail": "Solo un estudiante puede editar este perfil."}, status=403)
		try:
			student = request.user.estudiante
		except Exception:
			return Response({"detail": "El usuario no tiene un perfil de estudiante."}, status=400)
		serializer = StudentProfileSerializer(student, data=request.data, partial=True)
		serializer.is_valid(raise_exception=True)
		return Response(StudentProfileSerializer(serializer.save()).data)


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
		stage_active = bool(stage and stage.estado == "en_curso")
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
		if not process or not stage or stage.estado != "en_curso":
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
		if not ballot or ballot.enviada or not stage or stage.estado != "en_curso":
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
		if not ballot or ballot.enviada or not stage or stage.estado != "en_curso":
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
		if not ballot or not stage or stage.estado != "en_curso":
			return Response({"detail": "La boleta no está disponible para envío."}, status=403)
		if ballot.enviada:
			return Response({"detail": "La boleta ya fue enviada."}, status=400)
		if ballot.boleta_interes.count() != 10:
			return Response({"detail": "Debes seleccionar exactamente 10 carreras para enviar la boleta."}, status=400)
		ballot.enviada = True
		ballot.fecha_enviada = timezone.localdate()
		ballot.save(update_fields=["enviada", "fecha_enviada"])
		from apps.core.notifications import notify_users
		notify_users(
			Usuario.objects.filter(rol="secretario_escuela", escuela=student.escuela),
			"Boleta de interés enviada",
			f"El estudiante {student.nombre} {student.apellidos} envió su boleta de interés.",
		)
		return Response({"detail": "Boleta de interés enviada correctamente."})


class StudentInterestEditView(APIView):
	permission_classes = [IsAuthenticated]

	def post(self, request):
		student, context, error = current_interest_context(request)
		if error:
			return error
		process, stage = context
		ballot = BoletaInteres.objects.filter(estudiante=student, proceso=process).first() if process else None
		if not ballot or not stage or stage.estado != "en_curso":
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


def student_escalafon_index(student):
	entry = EscalafonItem.objects.filter(
		estudiante=student,
		escalafon__proceso__anio__year=timezone.now().year,
	).order_by("-escalafon__proceso__anio", "-escalafon_id", "-id").first()
	return entry.indice_general if entry else student.indice_general


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
		active_stage = Etapa.objects.filter(estado="en_curso").order_by("id").first()
		active_stage_number = next((number for number, name in ETAPAS_NOMBRES.items() if active_stage and name == active_stage.nombre), None)
		allow_modification = active_stage_number == 3
		stage_is_active = bool(stage and stage.estado == "en_curso") and active_stage_number == 3
		return Response({
			**BoletaSolicitudSerializer(ballot).data,
			"student": {"nombre": student.nombre, "apellidos": student.apellidos, "ci": student.ci,
				"escuela": student.escuela.nombre, "municipio": student.escuela.municipio.nombre,
				"provincia": student.escuela.municipio.provincia.nombre, "indice_general": student_escalafon_index(student)},
			"available_plans": [{"id": plan.id, "carrera_nombre": plan.carrera.nombre, "carrera_codigo": plan.carrera.codigo,
				"ces_nombre": plan.ces.nombre, "provincia_nombre": plan.provincia.nombre,
				"cantidad_plazas": plan.cantidad_plazas, "otorgamiento_tipo": plan.otorgamiento_tipo, "sexo": plan.sexo}
				for plan in plans],
			"max_items": 10,
			"stage": {"numero": active_stage_number or (3 if stage and stage.estado == "en_curso" else None),
				"active": stage_is_active,
				"fecha_fin": stage.fecha_fin if stage else None,
				"dias_restantes": max((stage.fecha_fin - timezone.localdate()).days, 0) if stage and stage.fecha_fin else None,
				"permite_modificacion": allow_modification},
		})

	def post(self, request):
		student, context, error = current_solicitud_context(request)
		if error:
			return error
		process, stage = context
		active_stage = Etapa.objects.filter(estado="en_curso").order_by("id").first()
		active_stage_number = next((number for number, name in ETAPAS_NOMBRES.items() if active_stage and name == active_stage.nombre), None)
		can_submit = bool(stage and stage.estado == "en_curso") and active_stage_number == 3
		if not process or not can_submit:
			return Response({"detail": "La boleta no está disponible para edición. Solo puede modificarse durante la etapa 3."}, status=403)
		ballot, _ = BoletaSolicitud.objects.get_or_create(estudiante=student, proceso=process)
		if ballot.estado == "aprobada":
			return Response({"detail": "La boleta ya fue aprobada; solicita una modificación desde la opción correspondiente."}, status=409)
		is_modification = ballot.estado == "modificada"
		if ballot.estado in {"por_enviar", "pendiente", "modificada"}:
			ballot.estado = "modificada" if is_modification else "pendiente"
		else:
			return Response({"detail": "La boleta no está en un estado editable."}, status=400)
		plan_ids = request.data.get("plan_plazas", [])
		confirm = request.data.get("confirmar", False)
		try:
			plan_ids = [int(plan_id) for plan_id in plan_ids]
		except (TypeError, ValueError):
			plan_ids = []
		if len(plan_ids) != 10 or len(set(plan_ids)) != len(plan_ids):
			return Response({"detail": "Debes seleccionar exactamente 10 carreras sin repetir."}, status=400)
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
			ballot.estado = "modificada" if is_modification else "pendiente"
			ballot.fecha_enviada = timezone.localdate()
			ballot.save(update_fields=["estado", "fecha_enviada"])
		from apps.core.notifications import notify_users
		if is_modification:
			notify_users(
				Usuario.objects.filter(rol="jefe_comision", provincia_id=student.escuela.municipio.provincia_id),
				"Solicitud de modificación recibida",
				f"El estudiante {student.nombre} {student.apellidos} envió una modificación de su boleta para revisión.",
			)
		else:
			notify_users(
				Usuario.objects.filter(rol="secretario_escuela", escuela=student.escuela),
				"Boleta de solicitud enviada",
				f"El estudiante {student.nombre} {student.apellidos} envió su boleta de solicitud para aprobación.",
			)
		return Response(BoletaSolicitudSerializer(ballot).data, status=201)


class StudentSolicitudEditView(APIView):
	permission_classes = [IsAuthenticated]

	@transaction.atomic
	def post(self, request):
		student, context, error = current_solicitud_context(request)
		if error:
			return error
		process, _ = context
		ballot = BoletaSolicitud.objects.filter(estudiante=student, proceso=process).first() if process else None
		active_stage = Etapa.objects.filter(estado="en_curso").order_by("id").first()
		active_stage_number = next((number for number, name in ETAPAS_NOMBRES.items() if active_stage and name == active_stage.nombre), None)
		if not ballot:
			return Response({"detail": "No existe una boleta de solicitud para este estudiante."}, status=404)
		if active_stage_number != 3:
			return Response({"detail": "La solicitud de modificación solo está habilitada durante la etapa 3."}, status=403)
		if ballot.estado == "modificada":
			return Response({"detail": "Ya existe una solicitud de modificación pendiente de revisión."}, status=400)
		if ballot.estado == "pendiente":
			ballot.aprobada_por = None
			ballot.fecha_aprobada = None
			ballot.save(update_fields=["aprobada_por", "fecha_aprobada"])
			return Response(BoletaSolicitudSerializer(ballot).data)
		if ballot.estado not in {"por_enviar", "aprobada"}:
			return Response({"detail": "La boleta no está en un estado editable."}, status=400)
		if ballot.estado == "aprobada":
			BoletaSolicitudItemAnterior.objects.filter(boleta_solicitud=ballot).delete()
			BoletaSolicitudItemAnterior.objects.bulk_create([
				BoletaSolicitudItemAnterior(
					boleta_solicitud=ballot,
					plan_plaza=item.plan_plaza,
					prioridad=item.prioridad,
				)
				for item in ballot.boleta_solicitud.all()
			])
			ballot.estado = "modificada"
			ballot.save(update_fields=["estado"])
			return Response(BoletaSolicitudSerializer(ballot).data)
		ballot.estado = "por_enviar"
		ballot.save(update_fields=["estado"])
		return Response(BoletaSolicitudSerializer(ballot).data)


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
			f"Escuela: {student.escuela.nombre}", f"Indice general: {student_escalafon_index(student) or ''}", "", "Prioridad | Carrera | CES | Provincia universidad"]
		lines += [f"{item.prioridad} | {item.plan_plaza.carrera.nombre} | {item.plan_plaza.carrera.ces.nombre} | {item.plan_plaza.carrera.provincia.nombre}" for item in ballot.boleta_solicitud.select_related("plan_plaza__carrera__ces", "plan_plaza__carrera__provincia").order_by("prioridad")]
		content = "BT /F1 11 Tf 40 800 Td " + " ".join(f"({line.replace('(', '[').replace(')', ']')}) Tj 0 -18 Td" for line in lines) + " ET"
		objects = [b"1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj", b"2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj", b"3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 842]/Resources<</Font<</F1 4 0 R>>>>/Contents 5 0 R>>endobj", b"4 0 obj<</Type/Font/Subtype/Type1/BaseFont/Courier>>endobj", f"5 0 obj<</Length {len(content.encode())}>>stream\n{content}\nendstream endobj".encode()]
		response = HttpResponse(b"%PDF-1.4\n" + b"\n".join(objects) + b"\ntrailer<</Root 1 0 R>>\n%%EOF", content_type="application/pdf")
		response["Content-Disposition"] = 'attachment; filename="boleta-solicitud.pdf"'
		return response


class StudentExamConfirmationView(APIView):
	permission_classes = [IsAuthenticated]

	def _context(self, request):
		if request.user.rol != "estudiante":
			return None, None, Response({"detail": "Solo un estudiante puede gestionar las confirmaciones."}, status=403)
		try:
			student = request.user.estudiante
		except Exception:
			return None, None, Response({"detail": "El usuario no tiene un perfil de estudiante."}, status=400)
		stage = Etapa.objects.filter(nombre=ETAPAS_NOMBRES[4]).first()
		process = Proceso.get_for_stage_and_year(timezone.now().year, ETAPAS_NOMBRES[4])
		return student, (process, stage), None

	def get(self, request):
		student, context, error = self._context(request)
		if error:
			return error
		process, stage = context
		if not process:
			return Response({"detail": "No hay pruebas de ingreso disponibles para este año."}, status=404)
		confirmations = ConfirmacionPrueba.objects.filter(
			estudiante=student, proceso=process
		).select_related("asignatura").order_by("fecha_prueba", "asignatura__nombre")
		return Response({
			"process_year": process.anio.year,
			"stage": {"active": bool(stage and stage.estado == "en_curso"), "fecha_fin": stage.fecha_fin if stage else None},
			"exams": [{
				"id": confirmation.id,
				"subject": confirmation.asignatura.nombre,
				"date": confirmation.fecha_prueba,
				"confirmed": confirmation.confirmada,
				"status": "pending" if confirmation.confirmada is None else ("confirmed" if confirmation.confirmada else "absent"),
			} for confirmation in confirmations],
		})

	@transaction.atomic
	def post(self, request):
		student, context, error = self._context(request)
		if error:
			return error
		process, stage = context
		if not process or not stage or stage.estado != "en_curso":
			return Response({"detail": "La confirmación solo está disponible durante la etapa 4."}, status=403)
		confirmation = ConfirmacionPrueba.objects.filter(
			pk=request.data.get("id"), estudiante=student, proceso=process
		).select_related("asignatura").first()
		if not confirmation:
			return Response({"detail": "No existe esa prueba para tu proceso."}, status=404)
		if not isinstance(request.data.get("confirmada"), bool):
			return Response({"detail": "Debes indicar si asistirás a la prueba."}, status=400)
		was_confirmed = confirmation.confirmada
		confirmation.confirmada = request.data["confirmada"]
		confirmation.save(update_fields=["confirmada"])
		if confirmation.confirmada is False and was_confirmed is not False:
			from apps.core.notifications import notify_users
			notify_users(
				Usuario.objects.filter(rol="secretario_escuela", escuela=student.escuela),
				"Estudiante no asistirá a una prueba",
				f"El estudiante {student.nombre} {student.apellidos} indicó que no asistirá a {confirmation.asignatura.nombre} en el proceso {confirmation.proceso.anio.year}.",
			)
		return Response({"id": confirmation.id, "subject": confirmation.asignatura.nombre, "confirmed": confirmation.confirmada})


class StudentDashboardView(APIView):
	permission_classes = [IsAuthenticated]

	def get(self, request):
		if request.user.rol != "estudiante":
			return Response({"detail": "Solo un estudiante puede consultar este resumen."}, status=403)

		student = request.user.estudiante
		escalafon_process = Proceso.get_for_stage_and_year(timezone.now().year, ETAPAS_NOMBRES[1])
		interest_process = Proceso.get_for_stage_and_year(timezone.now().year, ETAPAS_NOMBRES[2])
		current_entry = EscalafonItem.objects.filter(
			estudiante__usuario=request.user,
			escalafon__proceso=escalafon_process,
		).first() if escalafon_process else None
		school_entries = EscalafonItem.objects.filter(
			escalafon__escuela=student.escuela,
			escalafon__proceso=escalafon_process,
		).order_by("-indice_general", "estudiante__apellidos", "estudiante__nombre") if escalafon_process else EscalafonItem.objects.none()

		position = next((index for index, entry in enumerate(school_entries, start=1) if entry.id == getattr(current_entry, "id", None)), None)
		interest = student.boleta_interes.filter(proceso=interest_process).first() if interest_process else None
		confirmations_process = Proceso.get_for_stage_and_year(timezone.now().year, ETAPAS_NOMBRES[4])
		confirmations = ConfirmacionPrueba.objects.filter(estudiante=student, proceso=confirmations_process) if confirmations_process else ConfirmacionPrueba.objects.none()
		active_stage = Etapa.objects.filter(estado="en_curso").order_by("id").first()
		stages = []
		for number, name in ETAPAS_NOMBRES.items():
			stage = Etapa.objects.filter(nombre=name).first()
			stages.append({"numero": number, "nombre": name, "estado": stage.estado if stage else "no_iniciada",
				"fecha_inicio": stage.fecha_inicio if stage else None, "fecha_fin": stage.fecha_fin if stage else None})

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


class StudentOtorgamientoView(APIView):
	permission_classes = [IsAuthenticated]

	def get(self, request):
		if request.user.rol != "estudiante":
			return Response({"detail": "Solo un estudiante puede consultar su otorgamiento."}, status=403)
		student = getattr(request.user, "estudiante", None)
		if not student:
			return Response({"detail": "El usuario no tiene un perfil de estudiante."}, status=400)
		try:
			year = int(request.query_params.get("anio", timezone.now().year))
		except (TypeError, ValueError):
			return Response({"detail": "El año indicado no es válido."}, status=400)
		process = Proceso.get_for_stage_and_year(year, ETAPAS_NOMBRES[6])
		award = Otorgamiento.objects.filter(
			proceso=process,
			estudiante=student,
		).select_related("carrera__ces") .first() if process else None
		entry = EscalafonItem.objects.filter(
			estudiante=student,
			escalafon__proceso__anio__year=year,
		).order_by("-id").first()
		cut = CorteCarrera.objects.filter(
			proceso=process,
			carrera=award.carrera,
		).first() if process and award else None
		first_choice = BoletaSolicitudItem.objects.filter(
			boleta_solicitud__estudiante=student,
			boleta_solicitud__proceso__anio__year=year,
			prioridad=1,
		).select_related("plan_plaza__carrera").first()
		first_choice_cut = CorteCarrera.objects.filter(
			proceso=process,
			carrera=first_choice.plan_plaza.carrera,
		).first() if process and first_choice else None
		awarded_choice = BoletaSolicitudItem.objects.filter(
			boleta_solicitud__estudiante=student,
			boleta_solicitud__proceso__anio__year=year,
			plan_plaza__carrera=award.carrera,
		).first() if process and award else None
		return Response({
			"year": year,
			"published": bool(award),
			"award": {
				"career": award.carrera.nombre,
				"career_code": award.carrera.codigo,
				"ces": award.carrera.ces.nombre,
				"award_index": award.indice_otorgamiento,
				"general_index": entry.indice_general if entry else None,
				"cut_index": cut.indice_corte if cut else None,
				"first_choice": first_choice.plan_plaza.carrera.nombre if first_choice else None,
				"first_choice_cut_index": first_choice_cut.indice_corte if first_choice_cut else None,
				"awarded_priority": awarded_choice.prioridad if awarded_choice else None,
			} if award else None,
		})

# Create your views here.
