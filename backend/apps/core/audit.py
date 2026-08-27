import json
import logging

from .models import LogAuditoria

logger = logging.getLogger("audit")

RESOURCE_LABELS = {
    "asignaturas": "asignatura",
    "carreras": "carrera",
    "ces": "CES",
    "escuelas": "escuela",
    "etapas": "etapa",
    "municipios": "municipio",
    "otorgamiento": "otorgamiento",
    "plan-plaza": "plan de plazas",
    "procesos": "proceso",
    "provincias": "provincia",
    "usuarios": "usuario",
}


def build_audit_action(request):
    path_parts = [part for part in request.path.strip("/").split("/") if part]
    resource = next(
        (RESOURCE_LABELS[part] for part in path_parts if part in RESOURCE_LABELS),
        path_parts[-1] if path_parts else "recurso",
    )
    method_actions = {
        "POST": "Creación",
        "PUT": "Edición",
        "PATCH": "Edición",
        "DELETE": "Eliminación",
        "GET": "Consulta",
    }

    if "usuarios" in path_parts and request.method == "POST":
        request_data = getattr(request, "data", None)
        if request_data is None:
            request_data = request.POST
            if not request_data and request.body:
                try:
                    request_data = json.loads(request.body)
                except (TypeError, ValueError):
                    request_data = {}
        role = request_data.get("rol", "sin rol")
        return f"Creación de usuario con rol {role}"

    special_actions = {
        "activar": "Activación de etapa",
        "cerrar": "Cierre de etapa",
        "reiniciar": "Reinicio de etapas",
    }
    for part in reversed(path_parts):
        if part in special_actions:
            return special_actions[part]

    action = method_actions.get(request.method, request.method.title())
    return f"{action} de {resource}"


def record_audit(user, action, module, request=None, previous=None, new=None):
    if not user or not user.is_authenticated:
        return
    ip = request.META.get("REMOTE_ADDR", "") if request else ""
    LogAuditoria.objects.create(
        usuario=user,
        accion=action,
        modulo=module,
        entidad=user.rol,
        datos_anteriores=json.dumps(previous or {}, default=str),
        datos_nuevos=json.dumps(new or {}, default=str),
        ip=ip,
    )
    logger.info(
        "%s | usuario=%s | rol=%s | modulo=%s | ip=%s",
        action, user.username, user.rol, module, ip,
    )