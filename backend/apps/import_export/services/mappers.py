from apps.superadmin.models import Carrera, Ces, Provincia
from apps.authentication.models import Estudiante
from apps.gestion_provincial.models import Proceso, PlanPlaza

def find_carrera_by_codigo_or_nombre(value):
    from apps.superadmin.models import Carrera
    try:
        return Carrera.objects.get(codigo=value)
    except Carrera.DoesNotExist:
        try:
            return Carrera.objects.get(nombre__iexact=value)
        except Carrera.DoesNotExist:
            raise ValueError(f"Carrera no encontrada: {value}")

def find_estudiante_by_documento(value):
    from apps.authentication.models import Estudiante
    try:
        return Estudiante.objects.get(documento=value)
    except Estudiante.DoesNotExist:
        raise ValueError(f"Estudiante no encontrado: {value}")

def find_proceso_by_year(value):
    from apps.gestion_provincial.models import Proceso
    # value puede ser año o id
    try:
        return Proceso.objects.get(pk=int(value))
    except Exception:
        # intentar por año si es fecha
        from datetime import datetime
        try:
            year = int(value)
            return Proceso.objects.get(anio__year=year)
        except Exception:
            raise ValueError(f"Proceso no encontrado: {value}")

PLAN_PLAZA_MAP = {
    "Proceso": "proceso",
    "CarreraCodigo": "carrera",
    "CantidadPlazas": "cantidad_plazas",
    "OtorgamientoTipo": "otorgamiento_tipo",
    "CES": "ces",
    "Provincia": "provincia",
    "Sexo": "sexo",
}

PLAN_PLAZA_FK = {
    "carrera": find_carrera_by_codigo_or_nombre,
    "proceso": find_proceso_by_year,
    "ces": lambda v: Ces.objects.get(nombre__iexact=v),
    "provincia": lambda v: Provincia.objects.get(nombre__iexact=v),
    #"otorgamiento_tipo": lambda v: OtorgamientoTipo.objects.get(nombre__iexact=v),
}

# mappers para Otorgamiento
OTORGAMIENTO_MAP = {
    "EstudianteDocumento": "estudiante",
    "Proceso": "proceso",
    "CarreraCodigo": "carrera",
    "IndiceOtorgamiento": "indice_otorgamiento",
}
OTORGAMIENTO_FK = {
    "estudiante": find_estudiante_by_documento,
    "proceso": find_proceso_by_year,
    "carrera": find_carrera_by_codigo_or_nombre,
}

# similar para CorteCarrera, Carrera, Provincia, etc.
