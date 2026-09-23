from django.db import transaction
from django.utils import timezone

from apps.authentication.models import Usuario
from apps.gestion_provincial.models import ETAPAS_NOMBRES, Etapa, PlanPlaza
from apps.gestion_personal.models import BoletaSolicitud, BoletaSolicitudItem, BoletaSolicitudItemAnterior

MAX_ITEMS = 10
EDITABLE_STATES = {"por_enviar", "pendiente", "modificada"}


class SolicitudError(Exception):
	def __init__(self, detail, status=400):
		super().__init__(detail)
		self.detail = detail
		self.status = status


def active_stage_number():
	active_stage = Etapa.objects.filter(estado="en_curso").order_by("id").first()
	return next((number for number, name in ETAPAS_NOMBRES.items() if active_stage and name == active_stage.nombre), None)


def stage_is_active(stage):
	return bool(stage and stage.estado == "en_curso") and active_stage_number() == 3


def can_edit(ballot, stage):
	return stage_is_active(stage) and ballot.estado in EDITABLE_STATES


def can_request_modification(ballot, stage):
	return active_stage_number() == 3 and ballot.estado == "aprobada"


def archive_and_mark_modified(ballot):
	"""Aprobada -> modificada, archivando los items actuales como historial."""
	BoletaSolicitudItemAnterior.objects.filter(boleta_solicitud=ballot).delete()
	BoletaSolicitudItemAnterior.objects.bulk_create([
		BoletaSolicitudItemAnterior(boleta_solicitud=ballot, plan_plaza=item.plan_plaza, prioridad=item.prioridad)
		for item in ballot.boleta_solicitud.all()
	])
	ballot.estado = "modificada"
	ballot.save(update_fields=["estado"])


def _validate_plans(student, process, raw_ids):
	try:
		plan_ids = [int(plan_id) for plan_id in raw_ids]
	except (TypeError, ValueError):
		plan_ids = []
	if len(plan_ids) != MAX_ITEMS or len(set(plan_ids)) != len(plan_ids):
		raise SolicitudError(f"Debes seleccionar exactamente {MAX_ITEMS} carreras sin repetir.")
	plans = list(PlanPlaza.objects.filter(id__in=plan_ids, proceso=process, provincia_id=student.escuela.municipio.provincia_id))
	if len(plans) != len(plan_ids):
		raise SolicitudError("Una o más carreras no pertenecen al plan de plazas disponible.")
	return plan_ids, plans


def submit(student, process, stage, raw_plan_ids, confirm=False, modification=False):
	"""
	Envía la boleta. Con modification=True una boleta aprobada pasa a 'modificada'
	y se guardan los nuevos items en una única transacción.
	Devuelve (ballot, is_modification, preview, requested_modification, plan_ids); preview=True si falta confirmar.
	"""
	if not process or not stage_is_active(stage):
		raise SolicitudError("La boleta no está disponible para edición. Solo puede modificarse durante la etapa 3.", 403)
	with transaction.atomic():
		ballot, _ = BoletaSolicitud.objects.select_for_update().get_or_create(estudiante=student, proceso=process)
		requesting = False
		if ballot.estado == "aprobada":
			if not modification:
				raise SolicitudError("La boleta ya fue aprobada; solicita una modificación desde la opción correspondiente.", 409)
			requesting = True
		elif ballot.estado not in EDITABLE_STATES:
			raise SolicitudError("La boleta no está en un estado editable.")
		plan_ids, plans = _validate_plans(student, process, raw_plan_ids)
		if not confirm:
			return ballot, requesting or ballot.estado == "modificada", True, requesting, plan_ids
		if requesting:
			archive_and_mark_modified(ballot)
		is_modification = ballot.estado == "modificada"
		by_id = {plan.id: plan for plan in plans}
		ballot.boleta_solicitud.all().delete()
		BoletaSolicitudItem.objects.bulk_create([
			BoletaSolicitudItem(boleta_solicitud=ballot, plan_plaza=by_id[plan_id], prioridad=priority)
			for priority, plan_id in enumerate(plan_ids, start=1)
		])
		ballot.estado = "modificada" if is_modification else "pendiente"
		ballot.fecha_enviada = timezone.localdate()
		ballot.save(update_fields=["estado", "fecha_enviada"])
	return ballot, is_modification, False, requesting, plan_ids


def notify_submission(student, is_modification):
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
