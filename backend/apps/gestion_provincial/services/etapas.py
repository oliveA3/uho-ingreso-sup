from datetime import datetime, time

from django.utils import timezone

from apps.authentication.models import Estudiante, Usuario
from apps.core.audit import record_audit
from apps.gestion_personal.models import ConfirmacionPrueba
from apps.superadmin.models import Asignatura

from ..models import ETAPAS_NOMBRES, Etapa, Proceso


class StageRuleError(Exception):
    """Una regla de negocio del ciclo de etapas impide la operación."""


def get_active_stage():
    return Etapa.objects.en_curso().first()


def is_stage_active(number):
    return Etapa.objects.en_curso().filter(nombre=ETAPAS_NOMBRES[number]).exists()


def activate_stage(pk, data, actor, request, path):
    """Activa una etapa aplicando las reglas del proceso (secuencia estricta, una sola activa, fechas de exámenes)."""
    etapa = Etapa.objects.select_for_update().get(pk=pk)

    active_stage = Etapa.objects.filter(estado='en_curso').exclude(pk=etapa.pk).exists()
    if active_stage:
        raise StageRuleError("Ya hay una etapa activa para este proceso.")
    if etapa.estado != 'no_iniciada':
        raise StageRuleError("La etapa ya fue activada y no puede modificarse.")

    ordered_names = list(ETAPAS_NOMBRES.values())
    stage_index = ordered_names.index(etapa.nombre)
    previous_stage = Etapa.objects.filter(
        nombre=ordered_names[stage_index - 1]
    ).first() if stage_index else None
    if previous_stage and previous_stage.estado != "completada":
        raise StageRuleError("Las etapas deben activarse estrictamente en secuencia.")

    etapa.fecha_inicio = data["fecha_inicio"]
    etapa.fecha_fin = data["fecha_fin"]
    if stage_index == 3:
        exam_dates = [data.get(field) for field in ("fecha_matematica", "fecha_espanol", "fecha_historia")]
        if any(date is None for date in exam_dates):
            raise StageRuleError("Debes indicar las fechas de Matemática, Español e Historia.")
        if any(date < etapa.fecha_inicio or date > etapa.fecha_fin for date in exam_dates):
            raise StageRuleError("Las fechas de los exámenes deben estar dentro de la etapa 4.")
        etapa.fecha_matematica, etapa.fecha_espanol, etapa.fecha_historia = exam_dates
    etapa.estado = 'en_curso'
    etapa.full_clean()
    update_fields = ["fecha_inicio", "fecha_fin", "estado"]
    if stage_index == 3:
        update_fields.extend(["fecha_matematica", "fecha_espanol", "fecha_historia"])
    etapa.save(update_fields=update_fields)
    record_audit(actor, "Activación de etapa", path, request=request, previous={"estado": "no_iniciada"}, new={"estado": "en_curso", "etapa": etapa.nombre, "fecha_inicio": etapa.fecha_inicio, "fecha_fin": etapa.fecha_fin})
    process, _ = Proceso.objects.get_or_create(
        anio=timezone.localdate().replace(month=1, day=1),
        etapa=etapa,
    )
    if stage_index == 3:
        students = Estudiante.objects.filter(
            escalafones__escalafon__proceso__anio__year=timezone.now().year,
        ).distinct()
        subjects = {
            "Matemática": etapa.fecha_matematica,
            "Español": etapa.fecha_espanol,
            "Historia": etapa.fecha_historia,
        }
        for subject_name, exam_date in subjects.items():
            subject = Asignatura.objects.filter(nombre__iexact=subject_name, activa=True).first()
            if subject is None and subject_name == "Historia":
                subject = Asignatura.objects.filter(nombre__iexact="Historia de Cuba", activa=True).first()
            if not subject:
                raise StageRuleError(f"No existe la asignatura activa '{subject_name}'.")
            for student in students:
                ConfirmacionPrueba.objects.get_or_create(
                    estudiante=student,
                    proceso=process,
                    asignatura=subject,
                    defaults={"confirmada": None, "fecha_prueba": timezone.make_aware(datetime.combine(exam_date, time.min))},
                )
    from apps.core.notifications import notify_users
    recipients = Usuario.objects.exclude(rol="superadmin").exclude(is_superuser=True)
    notify_users(
        recipients,
        "Etapa activada",
        f"Se activó {etapa.nombre} desde {etapa.fecha_inicio} hasta {etapa.fecha_fin}.",
    )
    return etapa
