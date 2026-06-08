"""Core app model aliases for shared API serializers and views."""

from apps.authentication.models import Rol, RolPermiso, Usuario
from apps.auditoria.models import LogAuditoria
from apps.carreras.models import Carrera
from apps.escuelas.models import Escuela
from apps.nomencladores.models import AsignaturaExamen, Ces, Municipio, OtorgamientoTipo, Provincia

__all__ = [
    "Rol",
    "RolPermiso",
    "Usuario",
    "LogAuditoria",
    "Provincia",
    "Municipio",
    "Ces",
    "OtorgamientoTipo",
    "AsignaturaExamen",
    "Carrera",
    "Escuela",
]
