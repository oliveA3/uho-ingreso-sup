from django.http import HttpResponse
from django.db import transaction
from apps.core.pdf import render_pdf
from django.utils import timezone
from drf_spectacular.openapi import AutoSchema
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import OpenApiExample, OpenApiParameter, extend_schema, inline_serializer
from rest_framework import serializers
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.models import Notificacion
from apps.core.audit import record_audit
from apps.authentication.models import Usuario
from apps.gestion_escuela.models import EscalafonItem
from apps.gestion_provincial.models import CorteCarrera, ETAPAS_NOMBRES, Etapa, PlanPlaza, Proceso
from apps.gestion_provincial.models import Otorgamiento
from apps.superadmin.models import Carrera
from .models import BoletaInteres, BoletaInteresItem, BoletaSolicitud, BoletaSolicitudItem, ConfirmacionPrueba
from .services import solicitud as solicitud_service
from .services.solicitud import MAX_ITEMS, SolicitudError
from .serializers import AddBoletaInteresItemSerializer, BoletaInteresItemSerializer, BoletaSolicitudItemSerializer, BoletaSolicitudSerializer, StudentProfileSerializer


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

	@extend_schema(
		tags=["Gestión"],
		summary="Consultar perfil del estudiante",
		description="Devuelve los datos del perfil del estudiante autenticado (datos personales de solo lectura y datos de contacto editables). Solo accesible por usuarios con rol 'estudiante'.",
		responses={200: StudentProfileSerializer, 400: inline_serializer(name="StudentProfileNoProfile", fields={"detail": serializers.CharField()}), 403: inline_serializer(name="StudentProfileForbidden", fields={"detail": serializers.CharField()})},
		examples=[
			OpenApiExample(
				"Perfil del estudiante",
				value={"success": True, "data": {"nombre": "Juan", "apellidos": "Pérez", "ci": "01019912345", "sexo": "M", "escuela": "IPVCE Vladimir Ilich Lenin", "provincia": "La Habana", "direccion": "Calle 1 #23", "email": "juan@example.com", "whatsapp": "+5355512345", "tutor_nombre": "María Pérez", "tutor_email": "maria@example.com", "tutor_telefono": "+5355554321"}, "error": None},
				response_only=True,
			),
		],
	)
	def get(self, request):
		if request.user.rol != "estudiante":
			return Response({"detail": "Solo un estudiante puede consultar este perfil."}, status=403)
		try:
			student = request.user.estudiante
		except Exception:
			return Response({"detail": "El usuario no tiene un perfil de estudiante."}, status=400)
		return Response(StudentProfileSerializer(student).data)

	@extend_schema(
		tags=["Gestión"],
		summary="Editar perfil del estudiante",
		description="Actualiza de forma parcial los datos de contacto del estudiante autenticado (dirección, whatsapp, datos del tutor y correo). Solo accesible por usuarios con rol 'estudiante'. Registra la operación en la auditoría.",
		request=StudentProfileSerializer,
		responses={200: StudentProfileSerializer, 400: inline_serializer(name="StudentProfileEditError", fields={"detail": serializers.CharField()}), 403: inline_serializer(name="StudentProfileEditForbidden", fields={"detail": serializers.CharField()})},
		examples=[
			OpenApiExample(
				"Actualizar datos de contacto",
				value={"direccion": "Calle 1 #23", "whatsapp": "+5355512345", "tutor_nombre": "María Pérez", "tutor_email": "maria@example.com", "tutor_telefono": "+5355554321"},
				request_only=True,
			),
			OpenApiExample(
				"Perfil actualizado",
				value={"success": True, "data": {"nombre": "Juan", "apellidos": "Pérez", "ci": "01019912345", "sexo": "M", "escuela": "IPVCE Vladimir Ilich Lenin", "provincia": "La Habana", "direccion": "Calle 1 #23", "email": "juan@example.com", "whatsapp": "+5355512345", "tutor_nombre": "María Pérez", "tutor_email": "maria@example.com", "tutor_telefono": "+5355554321"}, "error": None},
				response_only=True,
			),
		],
	)
	def patch(self, request):
		if request.user.rol != "estudiante":
			return Response({"detail": "Solo un estudiante puede editar este perfil."}, status=403)
		try:
			student = request.user.estudiante
		except Exception:
			return Response({"detail": "El usuario no tiene un perfil de estudiante."}, status=400)
		previous = {field: getattr(student, field) for field in ("direccion", "whatsapp", "tutor_nombre", "tutor_email", "tutor_telefono")}
		previous["email"] = request.user.email
		serializer = StudentProfileSerializer(student, data=request.data, partial=True)
		serializer.is_valid(raise_exception=True)
		updated = serializer.save()
		new = {field: getattr(updated, field) for field in previous if field != "email"}
		new["email"] = updated.usuario.email
		record_audit(request.user, "Edición de perfil estudiantil", request.path, request=request, previous=previous, new=new)
		return Response(StudentProfileSerializer(updated).data)


class StudentInterestView(APIView):
	permission_classes = [IsAuthenticated]

	@extend_schema(
		tags=["Gestión"],
		summary="Consultar boleta de interés del estudiante",
		description="Devuelve (creándola si no existe) la boleta de interés del estudiante autenticado para el proceso vigente de la etapa 2 (selección de interés), junto con las carreras disponibles, el estado de la etapa y el máximo de carreras permitido (10). Solo accesible por usuarios con rol 'estudiante'.",
		responses={
			200: inline_serializer(name="StudentInterestBallot", fields={
				"id": serializers.IntegerField(),
				"proceso": serializers.IntegerField(),
				"enviada": serializers.BooleanField(),
				"fecha_enviada": serializers.DateField(allow_null=True),
				"items": BoletaInteresItemSerializer(many=True),
				"available_careers": inline_serializer(name="AvailableCareer", fields={
					"id": serializers.IntegerField(), "codigo": serializers.CharField(), "nombre": serializers.CharField(),
					"ces_nombre": serializers.CharField(), "provincia_nombre": serializers.CharField(),
				}, many=True),
				"stage": inline_serializer(name="InterestStage", fields={
					"active": serializers.BooleanField(), "fecha_fin": serializers.DateField(allow_null=True), "dias_restantes": serializers.IntegerField(allow_null=True),
				}),
					"max_items": serializers.IntegerField(),
					"puede_editar": serializers.BooleanField(),
			}),
			403: inline_serializer(name="StudentInterestForbidden", fields={"detail": serializers.CharField()}),
			400: inline_serializer(name="StudentInterestNoProfile", fields={"detail": serializers.CharField()}),
			404: inline_serializer(name="StudentInterestNoProcess", fields={"detail": serializers.CharField()}),
		},
		examples=[
			OpenApiExample(
				"Boleta de interés",
				value={"success": True, "data": {
					"id": 1, "proceso": 2026, "enviada": False, "fecha_enviada": None,
					"items": [{"id": 5, "carrera": 12, "carrera_codigo": "INF01", "carrera_nombre": "Ingeniería Informática", "ces_nombre": "UCI", "provincia_nombre": "La Habana", "prioridad": 1}],
					"available_careers": [{"id": 12, "codigo": "INF01", "nombre": "Ingeniería Informática", "ces_nombre": "UCI", "provincia_nombre": "La Habana"}],
					"stage": {"active": True, "fecha_fin": "2026-10-15", "dias_restantes": 12},
						"max_items": 10, "puede_editar": True,
				}, "error": None},
				response_only=True,
			),
		],
	)
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
			"max_items": MAX_ITEMS,
			"puede_editar": stage_active and not ballot.enviada,
		})


class _InterestItemAutoSchema(AutoSchema):
	"""
	StudentInterestItemView is bound to two URL patterns (one without and one
	with the '<int:item_id>' path parameter) that share POST/PATCH/DELETE
	handlers. Without this, drf-spectacular documents all three methods for
	both paths and produces duplicate operationIds. This excludes POST from
	the '{item_id}' path and PATCH/DELETE from the path without it, so each
	operation is documented exactly once, on its real route.
	"""

	def is_excluded(self) -> bool:
		has_item_id = "item_id" in self.path
		if self.method == "POST" and has_item_id:
			return True
		if self.method in {"PATCH", "DELETE"} and not has_item_id:
			return True
		return super().is_excluded()


class StudentInterestItemView(APIView):
	permission_classes = [IsAuthenticated]
	schema = _InterestItemAutoSchema()

	@extend_schema(
		tags=["Gestión"],
		summary="Añadir carrera a la boleta de interés",
		description="Agrega una carrera a la boleta de interés del estudiante autenticado, asignándole la siguiente prioridad disponible. Solo válido durante la etapa 2 ('en_curso'), con la boleta sin enviar y con menos de 10 carreras seleccionadas. Solo accesible por usuarios con rol 'estudiante'.",
		operation_id="gestion_personal_boleta_interes_item_create",
		request=AddBoletaInteresItemSerializer,
		responses={
			201: BoletaInteresItemSerializer,
			400: inline_serializer(name="StudentInterestItemCreateError", fields={"detail": serializers.CharField()}),
			403: inline_serializer(name="StudentInterestItemCreateForbidden", fields={"detail": serializers.CharField()}),
		},
		examples=[
			OpenApiExample("Agregar carrera", value={"carrera": 12}, request_only=True),
			OpenApiExample(
				"Carrera agregada",
				value={"success": True, "data": {"id": 5, "carrera": 12, "carrera_codigo": "INF01", "carrera_nombre": "Ingeniería Informática", "ces_nombre": "UCI", "provincia_nombre": "La Habana", "prioridad": 1}, "error": None},
				response_only=True,
			),
		],
	)
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
		if ballot.boleta_interes.count() >= MAX_ITEMS:
			return Response({"detail": f"Solo puedes seleccionar hasta {MAX_ITEMS} carreras."}, status=400)
		serializer = AddBoletaInteresItemSerializer(data=request.data)
		serializer.is_valid(raise_exception=True)
		career = serializer.validated_data["carrera"]
		if ballot.boleta_interes.filter(carrera=career).exists():
			return Response({"detail": "Ya seleccionaste esta carrera."}, status=400)
		item = BoletaInteresItem.objects.create(boleta_interes=ballot, carrera=career, prioridad=ballot.boleta_interes.count() + 1)
		record_audit(request.user, "Adición de carrera a boleta de interés", request.path, request=request, new={"carrera": career.codigo, "prioridad": item.prioridad})
		return Response(BoletaInteresItemSerializer(item).data, status=201)

	@extend_schema(
		tags=["Gestión"],
		summary="Eliminar carrera de la boleta de interés",
		description="Elimina la carrera identificada por 'item_id' de la boleta de interés del estudiante autenticado y reordena las prioridades restantes. Solo válido durante la etapa 2 ('en_curso') y con la boleta sin enviar. Solo accesible por usuarios con rol 'estudiante'.",
		operation_id="gestion_personal_boleta_interes_item_destroy",
		parameters=[OpenApiParameter(name="item_id", type=int, location=OpenApiParameter.PATH, description="Identificador del item de la boleta de interés a eliminar.")],
		responses={
			204: None,
			403: inline_serializer(name="StudentInterestItemDeleteForbidden", fields={"detail": serializers.CharField()}),
			404: inline_serializer(name="StudentInterestItemDeleteNotFound", fields={"detail": serializers.CharField()}),
		},
	)
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
		record_audit(request.user, "Eliminación de carrera de boleta de interés", request.path, request=request, previous={"carrera": item.carrera.codigo, "prioridad": item.prioridad})
		for priority, remaining in enumerate(ballot.boleta_interes.order_by("prioridad"), start=1):
			if remaining.prioridad != priority:
				remaining.prioridad = priority
				remaining.save(update_fields=["prioridad"])
		return Response(status=204)

	@extend_schema(
		tags=["Gestión"],
		summary="Reordenar carrera en la boleta de interés",
		description="Cambia la prioridad de la carrera identificada por 'item_id' intercambiándola con la carrera vecina ('up' sube prioridad, 'down' la baja). Solo válido durante la etapa 2 ('en_curso') y con la boleta sin enviar. Solo accesible por usuarios con rol 'estudiante'.",
		operation_id="gestion_personal_boleta_interes_item_update",
		parameters=[OpenApiParameter(name="item_id", type=int, location=OpenApiParameter.PATH, description="Identificador del item de la boleta de interés a reordenar.")],
		request=inline_serializer(name="StudentInterestItemReorder", fields={"direction": serializers.ChoiceField(choices=["up", "down"])}),
		responses={
			200: BoletaInteresItemSerializer,
			400: inline_serializer(name="StudentInterestItemUpdateError", fields={"detail": serializers.CharField()}),
			403: inline_serializer(name="StudentInterestItemUpdateForbidden", fields={"detail": serializers.CharField()}),
			404: inline_serializer(name="StudentInterestItemUpdateNotFound", fields={"detail": serializers.CharField()}),
		},
		examples=[
			OpenApiExample("Subir prioridad", value={"direction": "up"}, request_only=True),
			OpenApiExample(
				"Item reordenado",
				value={"success": True, "data": {"id": 5, "carrera": 12, "carrera_codigo": "INF01", "carrera_nombre": "Ingeniería Informática", "ces_nombre": "UCI", "provincia_nombre": "La Habana", "prioridad": 1}, "error": None},
				response_only=True,
			),
		],
	)
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

	@extend_schema(
		tags=["Gestión"],
		summary="Enviar boleta de interés",
		description="Envía definitivamente la boleta de interés del estudiante autenticado, siempre que tenga exactamente 10 carreras seleccionadas. Solo válido durante la etapa 2 ('en_curso') y con la boleta aún no enviada. Notifica al secretario de la escuela. Solo accesible por usuarios con rol 'estudiante'.",
		request=None,
		responses={
			200: inline_serializer(name="StudentInterestSendOk", fields={"detail": serializers.CharField()}),
			400: inline_serializer(name="StudentInterestSendError", fields={"detail": serializers.CharField()}),
			403: inline_serializer(name="StudentInterestSendForbidden", fields={"detail": serializers.CharField()}),
		},
		examples=[
			OpenApiExample(
				"Boleta enviada",
				value={"success": True, "data": {"detail": "Boleta de interés enviada correctamente."}, "error": None},
				response_only=True,
			),
		],
	)
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
		if ballot.boleta_interes.count() != MAX_ITEMS:
			return Response({"detail": f"Debes seleccionar exactamente {MAX_ITEMS} carreras para enviar la boleta."}, status=400)
		ballot.enviada = True
		ballot.fecha_enviada = timezone.localdate()
		ballot.save(update_fields=["enviada", "fecha_enviada"])
		record_audit(request.user, "Envío de boleta de interés", request.path, request=request, new={"boleta_id": ballot.id, "proceso": process.anio.year})
		from apps.core.notifications import notify_users
		notify_users(
			Usuario.objects.filter(rol="secretario_escuela", escuela=student.escuela),
			"Boleta de interés enviada",
			f"El estudiante {student.nombre} {student.apellidos} envió su boleta de interés.",
		)
		return Response({"detail": "Boleta de interés enviada correctamente."})


class StudentInterestEditView(APIView):
	permission_classes = [IsAuthenticated]

	@extend_schema(
		tags=["Gestión"],
		summary="Reabrir boleta de interés enviada",
		description="Marca la boleta de interés del estudiante autenticado, ya enviada, como pendiente nuevamente para permitir su edición. Solo válido durante la etapa 2 ('en_curso'). Solo accesible por usuarios con rol 'estudiante'.",
		request=None,
		responses={
			200: inline_serializer(name="StudentInterestEditOk", fields={"detail": serializers.CharField()}),
			400: inline_serializer(name="StudentInterestEditError", fields={"detail": serializers.CharField()}),
			403: inline_serializer(name="StudentInterestEditForbidden", fields={"detail": serializers.CharField()}),
		},
		examples=[
			OpenApiExample(
				"Boleta reabierta",
				value={"success": True, "data": {"detail": "La boleta volvió a estar pendiente y puede editarse."}, "error": None},
				response_only=True,
			),
		],
	)
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
		record_audit(request.user, "Edición de boleta de interés enviada", request.path, request=request, previous={"enviada": True}, new={"enviada": False})
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

	@extend_schema(
		tags=["Gestión"],
		summary="Consultar boleta de solicitud del estudiante",
		description="Devuelve (creándola si no existe) la boleta de solicitud del estudiante autenticado para el proceso vigente de la etapa 3 (solicitud de plazas), junto con los datos del estudiante, los planes de plaza disponibles en su provincia y el estado de la etapa. Solo accesible por usuarios con rol 'estudiante'.",
		responses={
			200: inline_serializer(name="StudentSolicitudBallot", fields={
				"id": serializers.IntegerField(), "proceso": serializers.IntegerField(), "estado": serializers.CharField(),
				"fecha_enviada": serializers.DateField(allow_null=True), "fecha_aprobada": serializers.DateField(allow_null=True),
				"items": BoletaSolicitudItemSerializer(many=True),
				"student": inline_serializer(name="SolicitudStudent", fields={
					"nombre": serializers.CharField(), "apellidos": serializers.CharField(), "ci": serializers.CharField(),
					"escuela": serializers.CharField(), "municipio": serializers.CharField(), "provincia": serializers.CharField(),
					"indice_general": serializers.FloatField(allow_null=True),
				}),
				"available_plans": inline_serializer(name="AvailablePlan", many=True, fields={
					"id": serializers.IntegerField(), "carrera_nombre": serializers.CharField(), "carrera_codigo": serializers.CharField(),
					"ces_nombre": serializers.CharField(), "provincia_nombre": serializers.CharField(), "cantidad_plazas": serializers.IntegerField(),
					"otorgamiento_tipo": serializers.CharField(), "sexo": serializers.CharField(),
				}),
				"max_items": serializers.IntegerField(),
				"puede_editar": serializers.BooleanField(),
				"puede_solicitar_modificacion": serializers.BooleanField(),
				"stage": inline_serializer(name="SolicitudStage", fields={
					"numero": serializers.IntegerField(allow_null=True), "active": serializers.BooleanField(),
					"fecha_fin": serializers.DateField(allow_null=True), "dias_restantes": serializers.IntegerField(allow_null=True),
					"permite_modificacion": serializers.BooleanField(),
				}),
			}),
			400: inline_serializer(name="StudentSolicitudNoProfile", fields={"detail": serializers.CharField()}),
			403: inline_serializer(name="StudentSolicitudForbidden", fields={"detail": serializers.CharField()}),
			404: inline_serializer(name="StudentSolicitudNoProcess", fields={"detail": serializers.CharField()}),
		},
	)
	def get(self, request):
		student, context, error = current_solicitud_context(request)
		if error:
			return error
		process, stage = context
		if not process:
			return Response({"detail": "No hay un proceso de solicitud activo."}, status=404)
		ballot, _ = BoletaSolicitud.objects.get_or_create(estudiante=student, proceso=process)
		province_id = student.escuela.municipio.provincia_id
		plans = PlanPlaza.objects.filter(proceso=process, provincia_id=province_id).select_related("carrera", "ces", "provincia", "otorgamiento_tipo").order_by("carrera__nombre")
		active_stage = Etapa.objects.filter(estado="en_curso").order_by("id").first()
		active_stage_number = next((number for number, name in ETAPAS_NOMBRES.items() if active_stage and name == active_stage.nombre), None)
		allow_modification = active_stage_number == 3
		stage_is_active = solicitud_service.stage_is_active(stage)
		return Response({
			**BoletaSolicitudSerializer(ballot).data,
			"student": {"nombre": student.nombre, "apellidos": student.apellidos, "ci": student.ci,
				"escuela": student.escuela.nombre, "municipio": student.escuela.municipio.nombre,
				"provincia": student.escuela.municipio.provincia.nombre, "indice_general": student_escalafon_index(student)},
			"available_plans": [{"id": plan.id, "carrera_nombre": plan.carrera.nombre, "carrera_codigo": plan.carrera.codigo,
				"ces_nombre": plan.ces.nombre, "provincia_nombre": plan.provincia.nombre,
				"cantidad_plazas": plan.cantidad_plazas, "otorgamiento_tipo": plan.otorgamiento_tipo.nombre, "sexo": plan.sexo}
				for plan in plans],
			"max_items": MAX_ITEMS,
			"puede_editar": solicitud_service.can_edit(ballot, stage),
			"puede_solicitar_modificacion": solicitud_service.can_request_modification(ballot, stage),
			"stage": {"numero": active_stage_number or (3 if stage and stage.estado == "en_curso" else None),
				"active": stage_is_active,
				"fecha_fin": stage.fecha_fin if stage else None,
				"dias_restantes": max((stage.fecha_fin - timezone.localdate()).days, 0) if stage and stage.fecha_fin else None,
				"permite_modificacion": allow_modification},
		})

	@extend_schema(
		tags=["Gestión"],
		summary="Enviar o modificar boleta de solicitud",
		description=(
			"Envía la boleta de solicitud del estudiante autenticado con exactamente 10 planes de plaza priorizados, de su propia provincia. "
			"Requiere 'confirmar: true' en el cuerpo; si se omite o es falso, devuelve 200 con 'confirmacion_requerida: true' sin persistir cambios. "
			"Con 'modificacion: true' una boleta aprobada pasa a 'modificada' y se guardan los items dentro de una sola transacción (si algo falla, no queda ningún cambio). Solo válido durante la etapa 3 ('en_curso'). Si la boleta ya estaba en estado 'modificada' notifica al jefe de comisión provincial; en caso contrario notifica al secretario de la escuela. Solo accesible por usuarios con rol 'estudiante'."
		),
		request=inline_serializer(name="StudentSolicitudSubmit", fields={
			"plan_plazas": serializers.ListField(child=serializers.IntegerField(), help_text="Lista de exactamente 10 ids de PlanPlaza, en orden de prioridad."),
			"confirmar": serializers.BooleanField(default=False),
			"modificacion": serializers.BooleanField(default=False, help_text="Si es true y la boleta está aprobada, la pasa a 'modificada' y guarda los nuevos items en una sola transacción."),
		}),
		responses={
			200: inline_serializer(name="StudentSolicitudConfirmRequired", fields={"confirmacion_requerida": serializers.BooleanField(), "detail": serializers.CharField()}),
			201: BoletaSolicitudSerializer,
			400: inline_serializer(name="StudentSolicitudSubmitError", fields={"detail": serializers.CharField()}),
			403: inline_serializer(name="StudentSolicitudSubmitForbidden", fields={"detail": serializers.CharField()}),
			409: inline_serializer(name="StudentSolicitudSubmitConflict", fields={"detail": serializers.CharField()}),
		},
		examples=[
			OpenApiExample("Enviar boleta", value={"plan_plazas": [101, 102, 103, 104, 105, 106, 107, 108, 109, 110], "confirmar": True}, request_only=True),
				OpenApiExample("Solicitar modificación de boleta aprobada", value={"plan_plazas": [101, 102, 103, 104, 105, 106, 107, 108, 109, 110], "confirmar": True, "modificacion": True}, request_only=True),
			OpenApiExample(
				"Confirmación requerida",
				value={"success": True, "data": {"confirmacion_requerida": True, "detail": "Confirma el orden de prioridades antes de enviar."}, "error": None},
				response_only=True,
			),
		],
	)
	def post(self, request):
		student, context, error = current_solicitud_context(request)
		if error:
			return error
		process, stage = context
		try:
			ballot, is_modification, preview, requested, plan_ids = solicitud_service.submit(
				student, process, stage, request.data.get("plan_plazas", []),
				confirm=request.data.get("confirmar", False),
				modification=bool(request.data.get("modificacion", False)),
			)
		except SolicitudError as exc:
			return Response({"detail": exc.detail}, status=exc.status)
		if preview:
			return Response({"confirmacion_requerida": True, "detail": "Confirma el orden de prioridades antes de enviar."}, status=200)
		if requested:
			record_audit(request.user, "Solicitud de modificación de boleta", request.path, request=request, previous={"estado": "aprobada"}, new={"estado": "modificada"})
		record_audit(request.user, "Envío de boleta de solicitud", request.path, request=request, new={"boleta_id": ballot.id, "estado": ballot.estado, "plan_plazas": plan_ids})
		solicitud_service.notify_submission(student, is_modification)
		return Response(BoletaSolicitudSerializer(ballot).data, status=201)


class StudentSolicitudEditView(APIView):
	permission_classes = [IsAuthenticated]

	@extend_schema(
		tags=["Gestión"],
		summary="Solicitar edición o modificación de la boleta de solicitud",
		description=(
			"Reabre la boleta de solicitud del estudiante autenticado para edición según su estado actual: si está 'pendiente', limpia la aprobación previa; "
			"si está 'aprobada', archiva los items actuales como historial y pasa a 'modificada' (pendiente de revisión); si está 'por_enviar', queda igual. "
			"Solo disponible durante la etapa 3 ('en_curso') y no aplica si ya existe una modificación pendiente. Solo accesible por usuarios con rol 'estudiante'."
		),
		request=None,
		responses={
			200: BoletaSolicitudSerializer,
			400: inline_serializer(name="StudentSolicitudEditError", fields={"detail": serializers.CharField()}),
			403: inline_serializer(name="StudentSolicitudEditForbidden", fields={"detail": serializers.CharField()}),
			404: inline_serializer(name="StudentSolicitudEditNotFound", fields={"detail": serializers.CharField()}),
		},
	)
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
			record_audit(request.user, "Solicitud de edición de boleta", request.path, request=request, previous={"estado": "pendiente"}, new={"estado": ballot.estado})
			return Response(BoletaSolicitudSerializer(ballot).data)
		if ballot.estado not in {"por_enviar", "aprobada"}:
			return Response({"detail": "La boleta no está en un estado editable."}, status=400)
		if ballot.estado == "aprobada":
			solicitud_service.archive_and_mark_modified(ballot)
			record_audit(request.user, "Solicitud de modificación de boleta", request.path, request=request, previous={"estado": "aprobada"}, new={"estado": "modificada"})
			return Response(BoletaSolicitudSerializer(ballot).data)
		ballot.estado = "por_enviar"
		ballot.save(update_fields=["estado"])
		return Response(BoletaSolicitudSerializer(ballot).data)


class StudentSolicitudPdfView(APIView):
	permission_classes = [IsAuthenticated]

	@extend_schema(
		tags=["Gestión"],
		summary="Descargar boleta de solicitud en PDF",
		description="Genera y descarga un PDF con el resumen de la boleta de solicitud del estudiante autenticado (datos personales, índice general y carreras priorizadas). No requiere una etapa activa, solo que exista la boleta. Solo accesible por usuarios con rol 'estudiante'. La respuesta 200 es un archivo binario 'application/pdf', no pasa por el envoltorio JSON estándar.",
		responses={
			(200, "application/pdf"): OpenApiTypes.BINARY,
			400: inline_serializer(name="StudentSolicitudPdfNoProfile", fields={"detail": serializers.CharField()}),
			403: inline_serializer(name="StudentSolicitudPdfForbidden", fields={"detail": serializers.CharField()}),
			404: inline_serializer(name="StudentSolicitudPdfNotFound", fields={"detail": serializers.CharField()}),
		},
	)
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
		response = HttpResponse(render_pdf("BOLETA DE SOLICITUD", lines[1:]), content_type="application/pdf")
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

	@extend_schema(
		tags=["Gestión"],
		summary="Consultar confirmaciones de pruebas de ingreso",
		description="Lista las pruebas de ingreso asignadas al estudiante autenticado en el proceso vigente de la etapa 4 (pruebas de ingreso), con su estado de confirmación de asistencia. Solo accesible por usuarios con rol 'estudiante'.",
		responses={
			200: inline_serializer(name="StudentExamConfirmationList", fields={
				"process_year": serializers.IntegerField(),
				"stage": inline_serializer(name="ExamConfirmationStage", fields={"active": serializers.BooleanField(), "fecha_fin": serializers.DateField(allow_null=True)}),
				"exams": inline_serializer(name="ExamConfirmationItem", many=True, fields={
					"id": serializers.IntegerField(), "subject": serializers.CharField(), "date": serializers.DateField(),
					"confirmed": serializers.BooleanField(allow_null=True), "status": serializers.ChoiceField(choices=["pending", "confirmed", "absent"]),
				}),
			}),
			400: inline_serializer(name="StudentExamConfirmationNoProfile", fields={"detail": serializers.CharField()}),
			403: inline_serializer(name="StudentExamConfirmationForbidden", fields={"detail": serializers.CharField()}),
			404: inline_serializer(name="StudentExamConfirmationNoProcess", fields={"detail": serializers.CharField()}),
		},
	)
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

	@extend_schema(
		tags=["Gestión"],
		summary="Confirmar asistencia a una prueba de ingreso",
		description="Registra si el estudiante autenticado asistirá ('confirmada': true) o no ('confirmada': false) a la prueba de ingreso identificada por 'id'. Solo válido durante la etapa 4 ('en_curso'). Si cambia a 'no asistirá', notifica al secretario de la escuela. Solo accesible por usuarios con rol 'estudiante'.",
		request=inline_serializer(name="StudentExamConfirmationSubmit", fields={"id": serializers.IntegerField(), "confirmada": serializers.BooleanField()}),
		responses={
			200: inline_serializer(name="StudentExamConfirmationResult", fields={"id": serializers.IntegerField(), "subject": serializers.CharField(), "confirmed": serializers.BooleanField()}),
			400: inline_serializer(name="StudentExamConfirmationSubmitError", fields={"detail": serializers.CharField()}),
			403: inline_serializer(name="StudentExamConfirmationSubmitForbidden", fields={"detail": serializers.CharField()}),
			404: inline_serializer(name="StudentExamConfirmationSubmitNotFound", fields={"detail": serializers.CharField()}),
		},
		examples=[
			OpenApiExample("Confirmar asistencia", value={"id": 7, "confirmada": True}, request_only=True),
			OpenApiExample(
				"Confirmación registrada",
				value={"success": True, "data": {"id": 7, "subject": "Matemática", "confirmed": True}, "error": None},
				response_only=True,
			),
		],
	)
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
		record_audit(request.user, "Confirmación de asistencia a prueba", request.path, request=request, previous={"confirmada": was_confirmed}, new={"confirmada": confirmation.confirmada})
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

	@extend_schema(
		tags=["Gestión"],
		summary="Consultar resumen del dashboard del estudiante",
		description="Devuelve un resumen consolidado para el estudiante autenticado: datos básicos, etapa activa del proceso, índices académicos y posición en el escalafón de su escuela, cantidad de carreras en su boleta de interés, cantidad de pruebas confirmadas, el estado de todas las etapas del proceso y sus últimas 5 notificaciones. Solo accesible por usuarios con rol 'estudiante'.",
		responses={
			200: inline_serializer(name="StudentDashboardSummary", fields={
				"student": inline_serializer(name="DashboardStudent", fields={
					"nombre": serializers.CharField(), "apellidos": serializers.CharField(),
					"escuela": serializers.CharField(), "municipio": serializers.CharField(),
				}),
				"active_stage": inline_serializer(name="DashboardActiveStage", fields={
					"numero": serializers.IntegerField(allow_null=True), "nombre": serializers.CharField(), "fecha_fin": serializers.DateField(allow_null=True),
				}, required=False, allow_null=True),
				"academic": inline_serializer(name="DashboardAcademic", fields={
					"indice_10": serializers.FloatField(allow_null=True), "indice_11": serializers.FloatField(allow_null=True),
					"indice_12": serializers.FloatField(allow_null=True), "indice_general": serializers.FloatField(allow_null=True),
					"position": serializers.IntegerField(allow_null=True), "entries_count": serializers.IntegerField(),
				}),
				"interest_count": serializers.IntegerField(),
				"confirmations_count": serializers.IntegerField(),
				"stages": inline_serializer(name="DashboardStage", many=True, fields={
					"numero": serializers.IntegerField(), "nombre": serializers.CharField(), "estado": serializers.CharField(),
					"fecha_inicio": serializers.DateField(allow_null=True), "fecha_fin": serializers.DateField(allow_null=True),
				}),
				"notifications": inline_serializer(name="DashboardNotification", many=True, fields={
					"id": serializers.IntegerField(), "titulo": serializers.CharField(), "contenido": serializers.CharField(), "fecha": serializers.DateTimeField(),
				}),
			}),
			403: inline_serializer(name="StudentDashboardForbidden", fields={"detail": serializers.CharField()}),
		},
	)
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

	@extend_schema(
		tags=["Gestión"],
		summary="Consultar otorgamiento de carrera del estudiante",
		description="Devuelve el resultado de otorgamiento de carrera del estudiante autenticado para el año indicado (etapa 6, publicación de otorgamiento), incluyendo el índice de otorgamiento, el índice de corte de la carrera otorgada y la comparación con su primera opción. Si aún no se ha publicado el otorgamiento, 'published' es false y 'award' es null. Solo accesible por usuarios con rol 'estudiante'.",
		parameters=[OpenApiParameter(name="anio", type=int, location=OpenApiParameter.QUERY, required=False, description="Año del proceso a consultar. Por defecto, el año actual.")],
		responses={
			200: inline_serializer(name="StudentOtorgamientoResult", fields={
				"year": serializers.IntegerField(),
				"published": serializers.BooleanField(),
				"award": inline_serializer(name="StudentOtorgamientoAward", fields={
					"career": serializers.CharField(), "career_code": serializers.CharField(), "ces": serializers.CharField(),
					"award_index": serializers.FloatField(), "general_index": serializers.FloatField(allow_null=True),
					"cut_index": serializers.FloatField(allow_null=True), "first_choice": serializers.CharField(allow_null=True),
					"first_choice_cut_index": serializers.FloatField(allow_null=True), "awarded_priority": serializers.IntegerField(allow_null=True),
				}, allow_null=True),
			}),
			400: inline_serializer(name="StudentOtorgamientoError", fields={"detail": serializers.CharField()}),
			403: inline_serializer(name="StudentOtorgamientoForbidden", fields={"detail": serializers.CharField()}),
		},
		examples=[
			OpenApiExample(
				"Otorgamiento publicado",
				value={"success": True, "data": {
					"year": 2026, "published": True,
					"award": {"career": "Ingeniería Informática", "career_code": "INF01", "ces": "UCI", "award_index": 91.5, "general_index": 91.5, "cut_index": 88.2, "first_choice": "Ingeniería Informática", "first_choice_cut_index": 88.2, "awarded_priority": 1},
				}, "error": None},
				response_only=True,
			),
		],
	)
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
