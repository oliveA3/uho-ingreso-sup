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

SENSITIVE_KEYS = {"password", "password1", "password2", "token", "csrfmiddlewaretoken"}


def sanitize_audit_data(data):
    if not data:
        return {}
    if hasattr(data, "lists"):
        data = {key: values if len(values) > 1 else values[0] for key, values in data.lists()}
    if hasattr(data, "items"):
        return {
            str(key): "[REDACTED]" if str(key).lower() in SENSITIVE_KEYS else value
            for key, value in data.items()
        }
    return {"value": str(data)}


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
        "enviar": "Envío de boleta",
        "aprobar": "Aprobación de boleta",
        "rechazar": "Rechazo de boleta",
        "confirmacion-pruebas": "Actualización de confirmación de prueba",
        "perfil": "Edición de perfil",
        "import": "Importación de archivo",
        "export": "Exportación de datos",
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
    previous_json = json.dumps(previous or {}, default=str)
    new_json = json.dumps(new or {}, default=str)
    try:
        LogAuditoria.objects.create(
            usuario=user,
            usuario_nombre=user.username,
            rol=user.rol,
            accion=action,
            modulo=module,
            entidad=user.rol,
            datos_anteriores=previous_json,
            datos_nuevos=new_json,
            ip=ip,
        )
    except Exception:
        logger.exception("No se pudo guardar el log de auditoría en la base de datos")
    logger.info(
        "%s | usuario=%s | rol=%s | modulo=%s | ip=%s | anteriores=%s | nuevos=%s",
        action, user.username, user.rol, module, ip, previous_json, new_json,
    )