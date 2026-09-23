from django.utils import timezone

from apps.authentication.models import Usuario
from apps.core.audit import record_audit
from apps.gestion_personal.models import BoletaSolicitud, BoletaSolicitudItem, BoletaSolicitudItemAnterior

from ..models import ETAPAS_NOMBRES, Etapa


class BoletaRuleError(Exception):
    """Una regla de negocio de las boletas impide la operación."""

    def __init__(self, message, status=400):
        super().__init__(message)
        self.status = status


def resolve_modification(ballot_id, action, actor, request, path):
    """Aprueba o rechaza una modificación de boleta pendiente (etapa 3)."""
    current_stage = Etapa.objects.en_curso().order_by("id").first()
    if not current_stage or current_stage.nombre != ETAPAS_NOMBRES[3]:
        raise BoletaRuleError("Las decisiones del Jefe de Comisión solo están disponibles durante la etapa 3.", 403)
    if action not in {"approve", "reject"}:
        raise BoletaRuleError("Acción inválida.", 400)
    ballot = BoletaSolicitud.objects.filter(pk=ballot_id, estado="modificada").first()
    if not ballot:
        raise BoletaRuleError("No existe una solicitud de modificación pendiente para esta boleta.", 404)
    if action == "approve":
        return _approve(ballot, actor, request, path)
    return _reject(ballot, actor, request, path)


def _approve(ballot, actor, request, path):
    ballot.estado = "aprobada"
    ballot.aprobada_por = actor.get_full_name() or actor.username
    ballot.fecha_aprobada = timezone.localdate()
    ballot.save(update_fields=["estado", "aprobada_por", "fecha_aprobada"])
    record_audit(actor, "Aprobación de modificación de boleta", path, request=request, previous={"estado": "modificada"}, new={"estado": "aprobada", "boleta_id": ballot.id})
    BoletaSolicitudItemAnterior.objects.filter(boleta_solicitud=ballot).delete()
    from apps.core.notifications import notify_users
    notify_users(
        [Usuario.objects.filter(pk=ballot.estudiante.usuario_id).first()],
        "Modificación de boleta aprobada",
        f"El Jefe de Comisión aprobó tu solicitud de modificación de la boleta del proceso {ballot.proceso.anio.year}.",
    )
    return "La modificación fue aprobada."


def _reject(ballot, actor, request, path):
    previous_items = list(BoletaSolicitudItemAnterior.objects.filter(boleta_solicitud=ballot))
    if not previous_items:
        raise BoletaRuleError("No existe un respaldo de la boleta anterior para restaurarla.", 409)
    ballot.boleta_solicitud.all().delete()
    BoletaSolicitudItem.objects.bulk_create([
        BoletaSolicitudItem(boleta_solicitud=ballot, plan_plaza=item.plan_plaza, prioridad=item.prioridad)
        for item in previous_items
    ])
    BoletaSolicitudItemAnterior.objects.filter(boleta_solicitud=ballot).delete()
    ballot.estado = "aprobada"
    ballot.save(update_fields=["estado"])
    record_audit(actor, "Rechazo de modificación de boleta", path, request=request, previous={"estado": "modificada"}, new={"estado": "aprobada", "boleta_id": ballot.id})
    from apps.core.notifications import notify_users
    notify_users(
        [Usuario.objects.filter(pk=ballot.estudiante.usuario_id).first()],
        "Modificación de boleta rechazada",
        f"El Jefe de Comisión rechazó tu solicitud de modificación de la boleta del proceso {ballot.proceso.anio.year}. Se conservaron tus preferencias anteriores.",
    )
    return "La modificación fue rechazada."
