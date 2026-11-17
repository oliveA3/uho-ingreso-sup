import io
import unicodedata
from decimal import Decimal, InvalidOperation

from django.db import transaction
from openpyxl import load_workbook

from apps.authentication.models import Estudiante
from apps.gestion_personal.models import ConfirmacionPrueba, ResultadoExamen
from apps.gestion_provincial.models import ETAPAS_NOMBRES
from apps.superadmin.models import Asignatura


REQUIRED_HEADERS = ["CI", "Asignatura", "Nota"]
SUBJECTS = {
    "matematica": "Matematica",
    "espanol": "Espanol",
    "historia": "Historia",
}
SUBJECT_CATALOG_ALIASES = {
    "matematica": {"matematica"},
    "espanol": {"espanol"},
    "historia": {"historia", "historia de cuba"},
}


def normalize_header(value):
    """Minusculas, sin acentos y sin separadores, para comparar cabeceras de Excel."""
    text = unicodedata.normalize("NFKD", str(value or "").strip().lower())
    text = "".join(char for char in text if not unicodedata.combining(char))
    for separator in ("_", "-", ".", "/", " "):
        text = text.replace(separator, "")
    return text


def normalize_subject(value):
    text = unicodedata.normalize("NFKD", str(value or "").strip().lower())
    return "".join(char for char in text if not unicodedata.combining(char))


class ResultadosImportResult:
    def __init__(self, inserted=0, updated=0, errors=None, students=None, warnings=None):
        self.inserted = inserted
        self.updated = updated
        self.errors = errors or []
        self.students = students or []
        # Avisos que no invalidan la importación (p. ej. notas de estudiantes que
        # no habían confirmado la prueba de esa asignatura).
        self.warnings = warnings or []


class ResultadosExcelService:
    def import_file(self, file_obj, proceso, provincia, selected_subject=None, deadline=None):
        selected_subject_key = normalize_subject(selected_subject) if selected_subject else None
        if selected_subject_key not in SUBJECTS:
            return ResultadosImportResult(errors=[{
                "row": 1,
                "errors": ["Debe seleccionar una asignatura válida: Matematica, Espanol o Historia."],
            }])
        if deadline is None:
            return ResultadosImportResult(errors=[{
                "row": 1,
                "errors": ["Debe indicar la fecha límite de reclamaciones."],
            }])
        workbook = load_workbook(filename=io.BytesIO(file_obj.read()), data_only=True)
        worksheet = workbook.active
        headers = [cell.value for cell in worksheet[1]]
        # Las cabeceras se comparan normalizadas (sin mayusculas, acentos ni
        # separadores), igual que en los demas importadores: "CI", "ci" y "Ci "
        # deben valer lo mismo.
        normalized_positions = {}
        for index, header in enumerate(headers):
            if header is None:
                continue
            normalized_positions.setdefault(normalize_header(header), index)
        missing = [header for header in REQUIRED_HEADERS if normalize_header(header) not in normalized_positions]
        if missing:
            return ResultadosImportResult(errors=[{
                "row": 1,
                "errors": [f"Faltan columnas: {', '.join(missing)}"],
            }])

        active_subjects = list(Asignatura.objects.filter(activa=True))
        subjects = {
            name: next(
                (
                    item for item in active_subjects
                    if normalize_subject(item.nombre) in SUBJECT_CATALOG_ALIASES[subject_key]
                ),
                None,
            )
            for subject_key, name in SUBJECTS.items()
        }
        header_indexes = {header: normalized_positions[normalize_header(header)] for header in REQUIRED_HEADERS}
        rows = []
        errors = []
        warnings = []
        seen = set()
        students = {}
        for row_number, values in enumerate(worksheet.iter_rows(min_row=2, values_only=True), start=2):
            if not any(value not in (None, "") for value in values):
                continue
            data = {header: values[index] for header, index in header_indexes.items()}
            row_errors = []
            ci = str(data["CI"]).strip() if data["CI"] is not None else ""
            subject_key = normalize_subject(data["Asignatura"])
            subject = SUBJECTS.get(subject_key)
            key = (ci, subject_key)
            if not ci.isdigit() or len(ci) != 11:
                row_errors.append("CI debe contener exactamente 11 dígitos numéricos.")
            elif key in seen:
                row_errors.append("La combinación CI y Asignatura está repetida dentro del Excel.")
            else:
                seen.add(key)
            if not subject:
                row_errors.append("Asignatura debe ser Matematica, Espanol o Historia.")
            elif subject_key != selected_subject_key:
                row_errors.append("La asignatura del Excel no coincide con la asignatura seleccionada.")

            try:
                grade = Decimal(str(data["Nota"]))
                if grade < 0 or grade > 100 or grade.as_tuple().exponent < -2:
                    raise ValueError
                grade = float(grade)
            except (InvalidOperation, TypeError, ValueError):
                row_errors.append("Nota debe estar entre 0.00 y 100.00, con máximo 2 decimales.")
                grade = None

            student_query = Estudiante.objects.filter(
                ci=ci,
                confirmacionprueba__proceso__anio__year=proceso.anio.year,
                confirmacionprueba__proceso__etapa__nombre=ETAPAS_NOMBRES[4],
            )
            if provincia is not None:
                student_query = student_query.filter(escuela__municipio__provincia=provincia)
            student = student_query.distinct().first() if ci.isdigit() and len(ci) == 11 else None
            if student is None:
                row_errors.append("El CI no existe en la base de datos del proceso y la provincia indicada.")

            if student is not None and subject and not row_errors:
                # La nota se importa igual, pero se avisa de quien no confirmo la
                # prueba: el registro existe para todos desde la etapa 4, y
                # `confirmada` puede ser None (sin responder) o False (rechazada).
                subject_record = subjects[subject]
                confirmed = subject_record is not None and ConfirmacionPrueba.objects.filter(
                    estudiante=student,
                    proceso__anio__year=proceso.anio.year,
                    proceso__etapa__nombre=ETAPAS_NOMBRES[4],
                    asignatura=subject_record,
                    confirmada=True,
                ).exists()
                if not confirmed:
                    warnings.append({
                        "row": row_number,
                        "ci": ci,
                        "detalle": "No confirmó la prueba de esta asignatura; la nota se importó igualmente.",
                    })

            if row_errors:
                errors.append({"row": row_number, "errors": row_errors, "data": data})
            else:
                rows.append((student, subject, grade))
                students[student.id] = student

        if errors:
            return ResultadosImportResult(errors=errors)

        for index, (student, subject, grade) in enumerate(rows):
            if subjects[subject] is None:
                return ResultadosImportResult(errors=[{
                    "row": index + 2,
                    "errors": [f"No existe la asignatura '{subject}' en el catálogo."],
                }])

        inserted = updated = 0
        with transaction.atomic():
            for student, subject, grade in rows:
                # `update_or_create` para que una reimportacion actualice tambien la
                # fecha limite de reclamacion, no solo la nota.
                _, created = ResultadoExamen.objects.update_or_create(
                    estudiante=student,
                    proceso=proceso,
                    asignatura=subjects[subject],
                    defaults={"nota": grade, "fecha_limite_reclamo": deadline},
                )
                if created:
                    inserted += 1
                else:
                    updated += 1

        return ResultadosImportResult(
            inserted=inserted, updated=updated, students=list(students.values()), warnings=warnings,
        )