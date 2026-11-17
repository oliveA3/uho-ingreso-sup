from datetime import datetime, time

from django.db.models import Q
from django.utils import timezone

from apps.authentication.models import Estudiante, Usuario
from apps.core.audit import record_audit
from apps.gestion_personal.models import ConfirmacionPrueba
from apps.superadmin.models import Asignatura

from ..models import ETAPAS_NOMBRES, Proceso, ensure_processes_for_year


class StageRuleError(Exception):
    """Una regla de negocio del ciclo de etapas impide la operación."""


# Etapas con tratamiento especial en el codigo, por numero (1-based, igual que las
# claves de ETAPAS_NOMBRES). Evita comparar contra indices crudos.
ETAPA_ESCALAFON = 1
ETAPA_BOLETA_INTERES = 2
ETAPA_PLAN_PLAZAS = 3
ETAPA_CONFIRMACION_PRUEBAS = 4
ETAPA_RESULTADOS = 5
ETAPA_OTORGAMIENTO = 6


def _expired_filter(today=None):
    """Etapas en curso cuya fecha de fin ya pasó."""
    return Q(estado="en_curso", fecha_fin__lt=today or timezone.localdate())


def is_stage_expired(stage, today=None):
    today = today or timezone.localdate()
    return bool(stage and stage.estado == "en_curso" and stage.fecha_fin and stage.fecha_fin < today)


def effective_stage_state(stage, today=None):
    """Estado real de la etapa para mostrar y decidir, sin escribir en la base.

    Una etapa en curso cuya `fecha_fin` ya pasó está cerrada de hecho aunque la
    fila siga diciendo `en_curso`: `close_expired_stages` persiste el cambio de
    forma periódica, pero las decisiones no deben esperar a esa tarea.
    """
    if stage is None:
        return None
    return "completada" if is_stage_expired(stage, today) else stage.estado


def get_current_cycle_year():
    """Devuelve el año/cohorte del ciclo más reciente que ya comenzó."""
    started_process = (
        Proceso.objects.filter(
            Q(estado__in=("en_curso", "completada"))
            | Q(fecha_inicio__isnull=False)
            | Q(fecha_fin__isnull=False)
        )
        .order_by("-anio", "-id")
        .first()
    )
    if started_process is None:
        return timezone.localdate().year

    cycle_year = started_process.anio.year
    cycle_processes = list(Proceso.objects.filter(anio__year=cycle_year))
    if (
        len(cycle_processes) == len(ETAPAS_NOMBRES)
        and all(effective_stage_state(proceso) == "completada" for proceso in cycle_processes)
    ):
        next_cycle_year = max(timezone.localdate().year, cycle_year + 1)
        if Proceso.objects.filter(anio__year=next_cycle_year).count() == len(ETAPAS_NOMBRES):
            return next_cycle_year
    return cycle_year


def close_expired_stages(year=None):
    """Marca como completadas las etapas en curso ya vencidas. Idempotente.

    La ejecuta Celery Beat (ver backend/celery.py). Antes esto se hacia de forma
    oportunista dentro de peticiones GET, asi que una etapa vencida seguia
    aceptando escrituras hasta que alguien cargaba la pantalla adecuada.
    """
    queryset = Proceso.objects.filter(_expired_filter())
    if year is not None:
        queryset = queryset.filter(anio__year=year)
    return queryset.update(estado="completada")


def get_active_stage(year=None):
    """Etapa realmente en curso: excluye las vencidas aunque no se hayan cerrado."""
    year = year or get_current_cycle_year()
    return (
        Proceso.objects.en_curso()
        .filter(anio__year=year)
        .exclude(_expired_filter())
        .select_related("etapa")
        .first()
    )


def is_stage_active(number, year=None):
    """Si la etapa `number` admite escrituras ahora mismo.

    Comprueba tambien la fecha de fin: una etapa vencida es de solo lectura desde
    el dia siguiente, sin depender de que la tarea de cierre haya corrido.
    """
    year = year or get_current_cycle_year()
    return (
        Proceso.objects.en_curso()
        .filter(etapa__nombre=ETAPAS_NOMBRES[number], anio__year=year)
        .exclude(_expired_filter())
        .exists()
    )


def stage_readonly_message(number, action="modificar información"):
    """Mensaje 403 estándar cuando una etapa no está en curso (solo lectura)."""
    return f"La etapa {number} no está en curso: el panel está en solo lectura y no se puede {action}."


def activate_stage(pk, data, actor, request, path):
    """Activa una etapa aplicando las reglas del proceso (secuencia estricta, una sola activa, fechas de exámenes)."""
    proceso = Proceso.objects.select_for_update().select_related("etapa").get(pk=pk)
    current_cycle_year = get_current_cycle_year()
    if proceso.anio.year != current_cycle_year:
        current_processes = ensure_processes_for_year(current_cycle_year)
        previous_cycle_completed = all(
            effective_stage_state(item) == "completada" for item in current_processes
        )
        next_cycle_year = max(timezone.localdate().year, current_cycle_year + 1)
        if not previous_cycle_completed or proceso.anio.year != next_cycle_year:
            raise StageRuleError("Solo se pueden activar etapas del ciclo vigente o del próximo ciclo anual.")

    active_stage = (
        Proceso.objects.en_curso()
        .filter(anio=proceso.anio)
        .exclude(pk=proceso.pk)
        .exclude(_expired_filter())
        .exists()
    )
    if active_stage:
        raise StageRuleError("Ya hay una etapa activa para este proceso.")
    if proceso.estado != 'no_iniciada':
        raise StageRuleError("La etapa ya fue activada y no puede modificarse.")

    ordered_names = list(ETAPAS_NOMBRES.values())
    stage_index = ordered_names.index(proceso.etapa.nombre)
    previous_stage = Proceso.objects.filter(
        anio=proceso.anio,
        etapa__nombre=ordered_names[stage_index - 1],
    ).first() if stage_index else None
    if previous_stage and effective_stage_state(previous_stage) != "completada":
        raise StageRuleError("Las etapas deben activarse estrictamente en secuencia.")

    proceso.fecha_inicio = data["fecha_inicio"]
    proceso.fecha_fin = data["fecha_fin"]
    if stage_index + 1 == ETAPA_CONFIRMACION_PRUEBAS:
        exam_dates = [data.get(field) for field in ("fecha_matematica", "fecha_espanol", "fecha_historia")]
        if any(date is None for date in exam_dates):
            raise StageRuleError("Debes indicar las fechas de Matemática, Español e Historia.")
        if any(date < proceso.fecha_inicio or date > proceso.fecha_fin for date in exam_dates):
            raise StageRuleError(f"Las fechas de los exámenes deben estar dentro de la etapa {ETAPA_CONFIRMACION_PRUEBAS}.")
        proceso.fecha_matematica, proceso.fecha_espanol, proceso.fecha_historia = exam_dates
    proceso.estado = 'en_curso'
    update_fields = ["fecha_inicio", "fecha_fin", "estado"]
    if stage_index + 1 == ETAPA_CONFIRMACION_PRUEBAS:
        update_fields.extend(["fecha_matematica", "fecha_espanol", "fecha_historia"])
    proceso.save(update_fields=update_fields)
    record_audit(actor, "Activación de etapa", path, request=request, previous={"estado": "no_iniciada"}, new={"estado": "en_curso", "etapa": proceso.etapa.nombre, "anio": proceso.anio.year, "fecha_inicio": proceso.fecha_inicio, "fecha_fin": proceso.fecha_fin})
    if stage_index + 1 == ETAPA_CONFIRMACION_PRUEBAS:
        student_ids = list(
            Estudiante.objects.filter(
                escalafones__escalafon__proceso__anio__year=proceso.anio.year,
            ).distinct().values_list("id", flat=True)
        )
        subjects = {
            "Matemática": proceso.fecha_matematica,
            "Español": proceso.fecha_espanol,
            "Historia": proceso.fecha_historia,
        }
        # `bulk_create` con `ignore_conflicts` en vez de un get_or_create por
        # estudiante y asignatura: con miles de estudiantes eran 3N consultas
        # dentro de la peticion HTTP, aqui son 3 (la restriccion unica de
        # (estudiante, proceso, asignatura) absorbe los duplicados).
        for subject_name, exam_date in subjects.items():
            subject = Asignatura.objects.filter(nombre__iexact=subject_name, activa=True).first()
            if subject is None and subject_name == "Historia":
                subject = Asignatura.objects.filter(nombre__iexact="Historia de Cuba", activa=True).first()
            if not subject:
                raise StageRuleError(f"No existe la asignatura activa '{subject_name}'.")
            exam_datetime = timezone.make_aware(datetime.combine(exam_date, time.min))
            ConfirmacionPrueba.objects.bulk_create(
                [
                    ConfirmacionPrueba(
                        estudiante_id=student_id,
                        proceso=proceso,
                        asignatura=subject,
                        confirmada=None,
                        fecha_prueba=exam_datetime,
                    )
                    for student_id in student_ids
                ],
                batch_size=500,
                ignore_conflicts=True,
            )
    from apps.core.notifications import notify_users
    recipients = Usuario.objects.exclude(rol="superadmin").exclude(is_superuser=True)
    notify_users(
        recipients,
        "Etapa activada",
        f"Se activó {proceso.etapa.nombre} desde {proceso.fecha_inicio} hasta {proceso.fecha_fin}.",
    )
    return proceso
