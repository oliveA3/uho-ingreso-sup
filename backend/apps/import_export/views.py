import unicodedata

from rest_framework.views import APIView
from rest_framework.response import Response
from django.http import HttpResponse
from django.db.models import Count, Q
from rest_framework import status, permissions
from django.db import IntegrityError
from django.db import transaction
from .services.excel_service import ExcelService
from .services.mappers import PLAN_PLAZA_MAP, PLAN_PLAZA_FK, OTORGAMIENTO_MAP, OTORGAMIENTO_FK
from .services.validators import validate_plan_plaza
from apps.gestion_provincial.models import PlanPlaza, Otorgamiento, CorteCarrera, Proceso, Etapa
from apps.authentication.models import Estudiante, Usuario
from apps.gestion_provincial.permissions import IsCareerManager
from apps.superadmin.models import Carrera, Ces, Escuela, Provincia
from .services.carreras_service import CareerExcelService
from .services.escalafon_service import EscalafonExcelService, resolve_school
from apps.gestion_escuela.models import Escalafon, EscalafonItem
from apps.gestion_escuela.serializers import EscalafonItemSerializer, StudentEscalafonActionSerializer
from apps.gestion_escuela.permissions import CanManageEscalafon
from apps.gestion_provincial.models import ETAPAS_NOMBRES, Etapa
from django.utils import timezone
from django.core.mail import send_mail
import io
from datetime import date, datetime
from decimal import Decimal, InvalidOperation

from openpyxl import Workbook, load_workbook
from apps.gestion_personal.models import BoletaInteres, BoletaSolicitud, BoletaSolicitudItem, Reclamacion
from apps.gestion_personal.models import ResultadoExamen
from .services.resultados_service import ResultadosExcelService


def _ballot_pdf(title, student, items, career_getter):
    escalafon_entry = EscalafonItem.objects.filter(
        estudiante=student,
        escalafon__proceso__anio__year=timezone.now().year,
    ).order_by("-escalafon__proceso__anio", "-escalafon_id", "-id").first()
    index = escalafon_entry.indice_general if escalafon_entry else student.indice_general
    lines = [
        title,
        f"Nombre: {student.nombre} {student.apellidos}",
        f"CI: {student.ci}",
        f"Escuela: {student.escuela.nombre}",
        f"Indice general: {index or ''}",
        "",
        "Prioridad | Carrera | CES | Provincia universidad",
    ]
    for item in items:
        career = career_getter(item)
        lines.append(f"{item.prioridad} | {career.nombre} | {career.ces.nombre} | {career.provincia.nombre}")
    safe_lines = []
    for line in lines:
        normalized = unicodedata.normalize("NFKD", str(line))
        safe_lines.append("".join(char for char in normalized if not unicodedata.combining(char)))
    content = "BT /F1 10 Tf 40 800 Td " + " ".join(
        f"({line.replace('\\', '\\\\').replace('(', '[').replace(')', ']')}) Tj 0 -16 Td" for line in safe_lines
    ) + " ET"
    objects = [
        b"1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj",
        b"2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj",
        b"3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 842]/Resources<</Font<</F1 4 0 R>>>>/Contents 5 0 R>>endobj",
        b"4 0 obj<</Type/Font/Subtype/Type1/BaseFont/Courier>>endobj",
        f"5 0 obj<</Length {len(content.encode())}>>stream\n{content}\nendstream endobj".encode(),
    ]
    return b"%PDF-1.4\n" + b"\n".join(objects) + b"\ntrailer<</Root 1 0 R>>\n%%EOF"


class StudentInterestPdfExportView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if request.user.rol != "estudiante":
            return Response({"detail": "Solo un estudiante puede descargar esta boleta."}, status=403)
        student = getattr(request.user, "estudiante", None)
        process = Proceso.get_for_stage_and_year(timezone.now().year, ETAPAS_NOMBRES[2])
        ballot = BoletaInteres.objects.filter(estudiante=student, proceso=process).first() if student and process else None
        if not ballot:
            return Response({"detail": "No existe una boleta de interés."}, status=404)
        items = ballot.boleta_interes.select_related("carrera__ces", "carrera__provincia").order_by("prioridad")
        response = HttpResponse(_ballot_pdf("BOLETA DE INTERES", student, items, lambda item: item.carrera), content_type="application/pdf")
        response["Content-Disposition"] = 'attachment; filename="boleta-interes.pdf"'
        return response


class SolicitudPdfExportView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, ballot_id=None):
        student = getattr(request.user, "estudiante", None)
        if request.user.rol == "estudiante":
            process = Proceso.get_for_stage_and_year(timezone.now().year, ETAPAS_NOMBRES[3])
            ballot = BoletaSolicitud.objects.filter(estudiante=student, proceso=process).select_related("estudiante__escuela").first() if student and process else None
        elif request.user.rol in {"secretario_escuela", "director_escuela"} and request.user.escuela_id and ballot_id:
            ballot = BoletaSolicitud.objects.filter(pk=ballot_id, estudiante__escuela_id=request.user.escuela_id).select_related("estudiante__escuela").first()
        else:
            return Response({"detail": "No tienes permiso para descargar esta boleta."}, status=403)
        if not ballot:
            return Response({"detail": "No existe la boleta de solicitud."}, status=404)
        items = ballot.boleta_solicitud.select_related("plan_plaza__carrera__ces", "plan_plaza__carrera__provincia").order_by("prioridad")
        response = HttpResponse(_ballot_pdf("BOLETA DE SOLICITUD", ballot.estudiante, items, lambda item: item.plan_plaza.carrera), content_type="application/pdf")
        response["Content-Disposition"] = 'attachment; filename="boleta-solicitud.pdf"'
        return response

class ImportPlanPlazaView(APIView):
    permission_classes = [IsCareerManager]

    def _normalize_header(self, value):
        text = str(value or "").strip().lower()
        text = unicodedata.normalize("NFKD", text)
        text = "".join(ch for ch in text if not unicodedata.combining(ch))
        return text.replace("_", " ").replace("-", " ").replace(".", " ").replace("/", " ")

    def _get_active_process(self):
        stage = Etapa.objects.filter(nombre=ETAPAS_NOMBRES[3]).first()
        if not stage:
            raise ValueError("No existe la etapa para planes de plaza.")
        process = Proceso.objects.filter(anio__year=timezone.now().year, etapa=stage).order_by("-id").first()
        if process is None:
            process = Proceso.objects.create(
                anio=timezone.now().date().replace(month=1, day=1),
                etapa=stage,
            )
        return process

    def post(self, request):
        file = request.FILES.get("file")
        if not file:
            return Response({"detail": "Debe adjuntar un archivo Excel."}, status=400)
        required = ["Codigo_Carrera", "Nombre_Carrera", "Cantidad_Plazas", "Tipo_Otorgamiento", "CES", "Provincia", "Sexo"]
        try:
            workbook = load_workbook(file, data_only=True)
            sheet = workbook.active
            raw_headers = [cell.value for cell in sheet[1]]
            normalized_headers = {self._normalize_header(header): header for header in raw_headers if header is not None}
            missing = [header for header in required if self._normalize_header(header) not in normalized_headers]
            if missing:
                return Response({"detail": "Faltan columnas requeridas.", "missing": missing}, status=400)

            process = self._get_active_process()
            result = {"inserted": 0, "updated": 0, "errors": []}

            for row_number, values in enumerate(sheet.iter_rows(min_row=2, values_only=True), start=2):
                data = {}
                for index, header in enumerate(raw_headers):
                    if index < len(values):
                        key = self._normalize_header(header)
                        data[key] = values[index]
                try:
                    codigo = str(data.get("codigo carrera") or "").strip()
                    nombre = str(data.get("nombre carrera") or "").strip()
                    carrera = Carrera.objects.filter(codigo__iexact=codigo).first()
                    if carrera is None and nombre:
                        carrera = Carrera.objects.filter(nombre__iexact=nombre).first()
                    if carrera is None:
                        raise ValueError(f"No existe una carrera con código o nombre '{codigo or nombre}'.")

                    ces_name = str(data.get("ces") or "").strip()
                    ces = Ces.objects.filter(nombre__iexact=ces_name).first() if ces_name else None
                    if ces is None and carrera.ces_id:
                        ces = carrera.ces
                    if ces is None:
                        raise ValueError(f"No existe el CES '{ces_name or 'vacío'}'.")

                    row_provincia = str(data.get("provincia") or "").strip()
                    universidad_provincia = Provincia.objects.filter(nombre__iexact=row_provincia).first() if row_provincia else None
                    if universidad_provincia is None and carrera.provincia_id:
                        universidad_provincia = carrera.provincia

                    if request.user.is_authenticated and getattr(request.user, "rol", None) == "jefe_comision" and request.user.provincia_id:
                        provincia = request.user.provincia
                    else:
                        provincia = universidad_provincia

                    if provincia is None:
                        raise ValueError(f"No existe la provincia '{row_provincia or 'asociada al usuario'}'.")

                    if universidad_provincia and carrera.provincia_id and universidad_provincia.id != carrera.provincia_id:
                        # La provincia del CES es informativa; la provincia real del plan se define por el usuario que lo sube.
                        pass

                    amount = int(data.get("cantidad plazas"))
                    if amount <= 0:
                        raise ValueError("Cantidad_Plazas debe ser un entero positivo.")

                    tipo = str(data.get("tipo otorgamiento") or "").strip().lower()
                    valid_types = {value.lower(): value for value, label in PlanPlaza.TIPOS_OTORGAMIENTO}
                    if tipo not in valid_types:
                        raise ValueError("Tipo_Otorgamiento debe ser 'Municipal' o 'Provincial'.")
                    tipo = valid_types[tipo]

                    sex = str(data.get("sexo") or "").strip().upper()
                    if sex not in {"A", "F", "M"}:
                        raise ValueError("Sexo debe ser 'A', 'F' o 'M'.")

                    if nombre and str(carrera.nombre).strip().lower() != str(nombre).strip().lower():
                        raise ValueError("Nombre_Carrera no coincide con la carrera encontrada.")
                    if carrera.ces_id != ces.id:
                        raise ValueError("El CES no coincide con la carrera.")

                    _, created = PlanPlaza.objects.update_or_create(
                        proceso=process,
                        carrera=carrera,
                        sexo=sex,
                        defaults={
                            "cantidad_plazas": amount,
                            "otorgamiento_tipo": tipo,
                            "ces": ces,
                            "provincia": provincia,
                        },
                    )
                    result["inserted" if created else "updated"] += 1
                except Exception as error:
                    result["errors"].append({
                        "row": row_number,
                        "error": str(error),
                        "data": {key: value for key, value in (data or {}).items() if key is not None},
                    })

            return Response(result, status=400 if result["errors"] else 201)
        except Exception as error:
            return Response({"detail": f"No se pudo leer el Excel: {error}"}, status=400)


def _normalize_plan_plaza_filename(provincia, anio):
    import re
    import unicodedata

    text = (provincia or "todos").strip()
    text = unicodedata.normalize("NFKD", text)
    text = ''.join(ch for ch in text if not unicodedata.combining(ch))
    text = re.sub(r"[^a-zA-Z0-9]+", "_", text.lower()).strip("_") or "todos"
    return f"plan_plazas_{text}_{anio}.xlsx"


class PlanPlazaTemplateView(APIView):
    permission_classes = [IsCareerManager]

    def get(self, request):
        workbook = Workbook()
        sheet = workbook.active
        sheet.title = "Plan de Plazas"
        sheet.append(["Codigo_Carrera", "Nombre_Carrera", "Cantidad_Plazas", "Tipo_Otorgamiento", "CES", "Provincia", "Sexo"])
        carreras = list(Carrera.objects.filter(activa=True).select_related("ces", "provincia").order_by("nombre")[:25])
        for index, carrera in enumerate(carreras, start=1):
            sheet.append([carrera.codigo, carrera.nombre, 10 + (index % 5), "Municipal" if index % 2 == 0 else "Provincial", carrera.ces.nombre, carrera.provincia.nombre, "A" if index % 3 else "F"])
        output = io.BytesIO()
        workbook.save(output)
        response = HttpResponse(output.getvalue(), content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
        response["Content-Disposition"] = 'attachment; filename="plan-plazas-prueba.xlsx"'
        return response


class ImportPlanPlazaExportView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        anio = request.query_params.get("anio") or request.query_params.get("year") or timezone.now().year
        provincia = request.query_params.get("provincia") or request.query_params.get("province") or ""

        queryset = PlanPlaza.objects.select_related("carrera", "carrera__ces", "carrera__provincia", "ces", "provincia", "proceso").filter(
            proceso__etapa__nombre=ETAPAS_NOMBRES[3],
            proceso__anio__year=anio,
        )
        if provincia:
            queryset = queryset.filter(provincia__nombre__iexact=provincia)

        workbook = Workbook()
        sheet = workbook.active
        sheet.title = "Plan de Plazas"
        headers = [
            "Codigo_Carrera",
            "Nombre_Carrera",
            "Cantidad_Plazas",
            "Tipo_Otorgamiento",
            "CES",
            "Provincia",
            "Sexo",
        ]
        sheet.append(headers)

        for item in queryset.order_by("carrera__nombre"):
            sheet.append([
                item.carrera.codigo,
                item.carrera.nombre,
                item.cantidad_plazas,
                "Municipal" if item.otorgamiento_tipo == "municipal" else "Provincial",
                item.ces.nombre,
                item.carrera.provincia.nombre,
                item.sexo,
            ])

        output = io.BytesIO()
        workbook.save(output)
        response = HttpResponse(output.getvalue(), content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
        response["Content-Disposition"] = f'attachment; filename="{_normalize_plan_plaza_filename(provincia or "todos", anio)}"'
        return response

def _normalize_import_header(value):
    text = unicodedata.normalize("NFKD", str(value or "").strip().lower())
    text = "".join(char for char in text if not unicodedata.combining(char))
    return "".join(char for char in text if char.isalnum())


def _get_stage_six_process():
    stage = Etapa.objects.filter(nombre=ETAPAS_NOMBRES[6]).first()
    process = Proceso.get_for_stage_and_year(timezone.now().year, ETAPAS_NOMBRES[6])
    if not stage or not process:
        raise ValueError("No existe un proceso de otorgamiento para el año actual.")
    if stage.estado != "en_curso":
        raise ValueError("La importación solo está disponible durante la etapa 6.")
    return process


def _read_stage_six_workbook(file_obj, required_headers):
    workbook = load_workbook(filename=file_obj, data_only=True)
    worksheet = workbook.active
    headers = [cell.value for cell in worksheet[1]]
    normalized = {_normalize_import_header(header): header for header in headers if header is not None}
    missing = [header for header in required_headers if _normalize_import_header(header) not in normalized]
    if missing:
        raise ValueError(f"Faltan columnas requeridas: {', '.join(missing)}")
    return worksheet, headers, normalized


def _resolve_stage_six_career(data):
    codigo = str(data.get("codigo_carrera") or "").strip()
    nombre = str(data.get("nombre_carrera") or "").strip()
    carrera = Carrera.objects.filter(codigo__iexact=codigo).first()
    if not carrera:
        raise ValueError(f"No existe una carrera con código '{codigo}'.")
    if not nombre or carrera.nombre.strip().lower() != nombre.lower():
        raise ValueError("Nombre_Carrera no coincide con la carrera del código indicado.")
    return carrera


def _import_stage_six_file(file_obj, kind):
    required_headers = (
        ["CI", "Codigo_Carrera", "Nombre_Carrera", "Indice_Otorgamiento"]
        if kind == "otorgamiento"
        else ["Codigo_Carrera", "Nombre_Carrera", "Indice_Corte"]
    )
    try:
        process = _get_stage_six_process()
        worksheet, headers, normalized_headers = _read_stage_six_workbook(file_obj, required_headers)
    except Exception as error:
        return {"inserted": 0, "updated": 0, "errors": [{"row": 1, "errors": [str(error)]}]}

    rows = []
    errors = []
    seen = set()
    for row_number, values in enumerate(worksheet.iter_rows(min_row=2, values_only=True), start=2):
        if not any(value not in (None, "") for value in values):
            continue
        raw = {normalized_headers[_normalize_import_header(header)]: values[index] for index, header in enumerate(headers) if header is not None and index < len(values)}
        data = {
            "ci": raw.get(normalized_headers.get("ci")),
            "codigo_carrera": raw.get(normalized_headers.get("codigocarrera")),
            "nombre_carrera": raw.get(normalized_headers.get("nombrecarrera")),
            "indice": raw.get(normalized_headers.get("indiceotorgamiento" if kind == "otorgamiento" else "indicecorte")),
        }
        row_errors = []
        student = None
        carrera = None
        if kind == "otorgamiento":
            ci = str(data["ci"] or "").strip()
            if not ci.isdigit() or len(ci) != 11:
                row_errors.append("CI debe contener exactamente 11 dígitos numéricos.")
            else:
                student = Estudiante.objects.filter(ci=ci).first()
                if not student:
                    row_errors.append("El CI no existe en la base de datos.")
        try:
            carrera = _resolve_stage_six_career(data)
        except ValueError as error:
            row_errors.append(str(error))
        try:
            indice = Decimal(str(data["indice"]))
            if indice < 0 or indice > 100 or indice.as_tuple().exponent < -2:
                raise ValueError
            data["indice"] = float(indice)
        except (InvalidOperation, TypeError, ValueError):
            row_errors.append("El índice debe ser un decimal entre 0 y 100, con máximo 2 decimales.")
        key = (student.id if student else data["ci"], carrera.id if carrera else data["codigo_carrera"])
        if key in seen:
            row_errors.append("La combinación indicada está repetida dentro del Excel.")
        else:
            seen.add(key)
        if row_errors:
            errors.append({"row": row_number, "errors": row_errors, "data": raw})
        else:
            rows.append((student, carrera, data["indice"]))
    if errors:
        return {"inserted": 0, "updated": 0, "errors": errors}

    inserted = updated = 0
    with transaction.atomic():
        for student, carrera, indice in rows:
            lookup = {"proceso": process, "carrera": carrera}
            if kind == "otorgamiento":
                lookup["estudiante"] = student
                _, created = Otorgamiento.objects.update_or_create(**lookup, defaults={"indice_otorgamiento": indice})
            else:
                _, created = CorteCarrera.objects.update_or_create(**lookup, defaults={"indice_corte": indice})
            if created:
                inserted += 1
            else:
                updated += 1
    return {"inserted": inserted, "updated": updated, "errors": []}


class ImportOtorgamientoView(APIView):
    permission_classes = [IsCareerManager]

    def post(self, request):
        if request.user.rol != "jefe_comision" and not request.user.is_superuser:
            return Response({"detail": "Solo el Jefe de Comisión puede importar otorgamientos."}, status=403)
        file = request.FILES.get("file")
        if not file:
            return Response({"detail": "Debe adjuntar un archivo Excel."}, status=400)
        result = _import_stage_six_file(file, "otorgamiento")
        if not result["errors"]:
            from apps.core.notifications import notify_users
            students = Usuario.objects.filter(
                rol="estudiante",
                escuela__municipio__provincia=request.user.provincia,
            ) if request.user.rol == "jefe_comision" else Usuario.objects.filter(rol="estudiante")
            notify_users(
                students,
                "Otorgamientos publicados",
                f"Se publicaron los otorgamientos de carreras del proceso {timezone.now().year}. Ya puedes consultar tu resultado.",
                filter_students=False,
            )
        return Response(result, status=400 if result["errors"] else 201)


class ImportCorteCarreraView(APIView):
    permission_classes = [IsCareerManager]

    def post(self, request):
        if request.user.rol != "jefe_comision" and not request.user.is_superuser:
            return Response({"detail": "Solo el Jefe de Comisión puede importar índices de corte."}, status=403)
        file = request.FILES.get("file")
        if not file:
            return Response({"detail": "Debe adjuntar un archivo Excel."}, status=400)
        result = _import_stage_six_file(file, "corte")
        return Response(result, status=400 if result["errors"] else 201)


class OtorgamientoSummaryView(APIView):
    permission_classes = [IsCareerManager]

    def get(self, request):
        if request.user.rol != "jefe_comision" and not request.user.is_superuser:
            return Response({"detail": "Solo el Jefe de Comisión puede consultar este resumen."}, status=403)
        try:
            anio = int(request.query_params.get("anio", timezone.now().year))
        except (TypeError, ValueError):
            return Response({"detail": "El año indicado no es válido."}, status=400)
        province_filter = {}
        if request.user.rol == "jefe_comision":
            if not request.user.provincia_id:
                return Response({"detail": "El usuario no tiene una provincia asignada."}, status=400)
            province_filter["estudiante__escuela__municipio__provincia_id"] = request.user.provincia_id
        stage_six_process = Proceso.get_for_stage_and_year(anio, ETAPAS_NOMBRES[6])
        stage_one_process = Proceso.get_for_stage_and_year(anio, ETAPAS_NOMBRES[1])
        awards = Otorgamiento.objects.filter(proceso=stage_six_process, **province_filter) if stage_six_process else Otorgamiento.objects.none()
        students = EscalafonItem.objects.filter(
            escalafon__proceso=stage_one_process,
            **{key.replace("estudiante__", "estudiante__"): value for key, value in province_filter.items()},
        ).values("estudiante_id").distinct() if stage_one_process else EscalafonItem.objects.none()
        awarded_student_ids = awards.values("estudiante_id").distinct()
        cuts = CorteCarrera.objects.filter(proceso=stage_six_process) if stage_six_process else CorteCarrera.objects.none()
        if request.user.rol == "jefe_comision":
            provincial_plan_careers = PlanPlaza.objects.filter(
                proceso__anio__year=anio,
                provincia_id=request.user.provincia_id,
            ).values("carrera_id")
            cuts = cuts.filter(carrera_id__in=provincial_plan_careers)
        return Response({
            "year": anio,
            "province": request.user.provincia.nombre if request.user.rol == "jefe_comision" else "Todas",
            "awarded_count": awards.count(),
            "without_award_count": students.exclude(estudiante_id__in=awarded_student_ids).count(),
            "cuts_count": cuts.count(),
        })


class ExportStageSixView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, kind):
        if request.user.rol not in {"jefe_comision", "secretario_escuela", "director_escuela", "superadmin"} and not request.user.is_superuser:
            return Response({"detail": "No tienes permiso para exportar estos datos."}, status=403)
        try:
            anio = int(request.query_params.get("anio", timezone.now().year))
        except (TypeError, ValueError):
            return Response({"detail": "El año indicado no es válido."}, status=400)
        if kind not in {"otorgamientos", "cortes"}:
            return Response({"detail": "Tipo de exportación no válido."}, status=404)
        process = Proceso.get_for_stage_and_year(anio, ETAPAS_NOMBRES[6])
        workbook = Workbook()
        sheet = workbook.active
        if kind == "otorgamientos":
            sheet.title = "Otorgamientos"
            sheet.append(["CI", "Código_Carrera", "Nombre_Carrera", "Índice_Otorgamiento"])
            queryset = Otorgamiento.objects.filter(proceso=process) if process else Otorgamiento.objects.none()
            if request.user.rol == "jefe_comision":
                queryset = queryset.filter(estudiante__escuela__municipio__provincia_id=request.user.provincia_id)
            elif request.user.rol in {"secretario_escuela", "director_escuela"}:
                if not request.user.escuela_id:
                    return Response({"detail": "El usuario no tiene una escuela asignada."}, status=400)
                queryset = queryset.filter(estudiante__escuela_id=request.user.escuela_id)
            for item in queryset.select_related("estudiante", "carrera").order_by("estudiante__apellidos", "estudiante__nombre"):
                sheet.append([item.estudiante.ci, item.carrera.codigo, item.carrera.nombre, item.indice_otorgamiento])
        else:
            sheet.title = "Índices de Corte"
            sheet.append(["Código_Carrera", "Nombre_Carrera", "Índice_Corte"])
            queryset = CorteCarrera.objects.filter(proceso=process) if process else CorteCarrera.objects.none()
            if request.user.rol == "jefe_comision":
                career_ids = PlanPlaza.objects.filter(
                    proceso__anio__year=anio,
                    provincia_id=request.user.provincia_id,
                ).values("carrera_id")
                queryset = queryset.filter(carrera_id__in=career_ids)
            elif request.user.rol in {"secretario_escuela", "director_escuela"}:
                if not request.user.escuela_id:
                    return Response({"detail": "El usuario no tiene una escuela asignada."}, status=400)
                career_ids = PlanPlaza.objects.filter(
                    proceso__anio__year=anio,
                    provincia_id=request.user.escuela.municipio.provincia_id,
                ).values("carrera_id")
                queryset = queryset.filter(carrera_id__in=career_ids)
            for item in queryset.select_related("carrera").order_by("carrera__codigo"):
                sheet.append([item.carrera.codigo, item.carrera.nombre, item.indice_corte])
        output = io.BytesIO()
        workbook.save(output)
        response = HttpResponse(output.getvalue(), content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
        response["Content-Disposition"] = f'attachment; filename="{kind}_{anio}.xlsx"'
        return response


class SchoolOtorgamientoListView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if request.user.rol not in {"secretario_escuela", "director_escuela"}:
            return Response({"detail": "Solo el Secretario o Director puede consultar estos otorgamientos."}, status=403)
        if not request.user.escuela_id:
            return Response({"detail": "El usuario no tiene una escuela asignada."}, status=400)
        try:
            anio = int(request.query_params.get("anio", timezone.now().year))
        except (TypeError, ValueError):
            return Response({"detail": "El año indicado no es válido."}, status=400)
        process = Proceso.get_for_stage_and_year(anio, ETAPAS_NOMBRES[6])
        awards = Otorgamiento.objects.filter(
            proceso=process,
            estudiante__escuela_id=request.user.escuela_id,
        ).select_related("estudiante", "carrera__ces") if process else Otorgamiento.objects.none()
        stage_one_process = Proceso.get_for_stage_and_year(anio, ETAPAS_NOMBRES[1])
        indices = {
            entry.estudiante_id: entry.indice_general
            for entry in EscalafonItem.objects.filter(
                escalafon__proceso=stage_one_process,
                escalafon__escuela_id=request.user.escuela_id,
            )
        } if stage_one_process else {}
        return Response({
            "year": anio,
            "items": [{
                "id": item.id,
                "student": f"{item.estudiante.nombre} {item.estudiante.apellidos}",
                "ci": item.estudiante.ci,
                "general_index": indices.get(item.estudiante_id),
                "award_index": item.indice_otorgamiento,
                "career": item.carrera.nombre,
                "ces": item.carrera.ces.nombre,
            } for item in awards.order_by("estudiante__apellidos", "estudiante__nombre")],
        })


class ImportCarrerasView(APIView):
    permission_classes = [IsCareerManager]

    def post(self, request):
        file = request.FILES.get("file")
        if not file:
            return Response({"detail": "Debe adjuntar un archivo Excel."}, status=status.HTTP_400_BAD_REQUEST)
        result = CareerExcelService().import_file(file)
        if result.errors:
            return Response({"inserted": 0, "errors": result.errors}, status=status.HTTP_400_BAD_REQUEST)
        return Response({"inserted": result.inserted, "errors": []})


class ExportCarrerasView(APIView):
    permission_classes = [IsCareerManager]

    def get(self, request):
        data = CareerExcelService().export_file(Carrera.objects.all().order_by("nombre"))
        response = HttpResponse(
            data,
            content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )
        response["Content-Disposition"] = 'attachment; filename="carreras.xlsx"'
        return response


class ImportEscalafonView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        if request.user.rol not in {"secretario_escuela", "jefe_comision", "superadmin"}:
            return Response({"detail": "Solo el Secretario puede importar el escalafón."}, status=status.HTTP_403_FORBIDDEN)
        if request.user.rol == "secretario_escuela" and request.data.get("escuela") not in {None, "", str(request.user.escuela_id), request.user.escuela_id}:
            return Response({"detail": "Solo puedes importar el escalafón de tu escuela."}, status=status.HTTP_403_FORBIDDEN)
        file = request.FILES.get("file")
        if not file:
            return Response({"detail": "Debe adjuntar un archivo Excel."}, status=status.HTTP_400_BAD_REQUEST)
        try:
            escuela = resolve_school(request.data.get("escuela") or request.user.escuela_id)
            anio = int(request.data.get("anio", request.data.get("año", timezone.now().year)))
            proceso = Proceso.get_for_stage_and_year(anio, ETAPAS_NOMBRES[1])
            if not proceso:
                raise ValueError("No existe un proceso para la etapa de escalafón en el año indicado.")
        except (TypeError, ValueError, Escuela.DoesNotExist):
            return Response({"detail": "Debe indicar una escuela válida y el año del escalafón."}, status=status.HTTP_400_BAD_REQUEST)
        try:
            result = EscalafonExcelService().import_file(file, escuela, proceso)
        except (IntegrityError, ValueError) as error:
            if isinstance(error, IntegrityError):
                error = "Ya existe un escalafón para esa escuela y año."
            return Response({"detail": str(error)}, status=status.HTTP_400_BAD_REQUEST)
        if result.errors:
            return Response({"inserted": 0, "errors": result.errors}, status=status.HTTP_400_BAD_REQUEST)
        from apps.core.notifications import notify_users
        notify_users(
            Usuario.objects.filter(rol="estudiante", escuela=escuela),
            "Escalafón actualizado",
            f"El secretario publicó el escalafón de tu escuela para el proceso {anio}.",
        )
        return Response({"inserted": result.inserted, "errors": []}, status=status.HTTP_201_CREATED)


class ImportResultadosView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        if request.user.rol not in {"jefe_comision", "superadmin"}:
            return Response({"detail": "Solo el Jefe de Comisión puede importar resultados."}, status=403)
        if not request.user.provincia_id and request.user.rol != "superadmin":
            return Response({"detail": "El usuario no tiene una provincia asignada."}, status=400)
        file = request.FILES.get("file")
        if not file:
            return Response({"detail": "Debe adjuntar un archivo Excel."}, status=400)
        try:
            anio = int(request.data.get("anio", timezone.now().year))
            proceso = Proceso.get_for_stage_and_year(anio, ETAPAS_NOMBRES[5])
        except (TypeError, ValueError):
            proceso = None
        if not proceso:
            return Response({"detail": "No existe un proceso de resultados para el año indicado."}, status=400)
        if proceso.etapa.estado != "en_curso":
            return Response({"detail": "La importación de resultados solo está disponible durante la etapa 5."}, status=403)
        selected_subject = request.data.get("asignatura")
        try:
            deadline = date.fromisoformat(str(request.data.get("fecha_limite_reclamo", "")))
        except ValueError:
            return Response({"detail": "Debe indicar una fecha límite de reclamaciones válida."}, status=400)
        try:
            result = ResultadosExcelService().import_file(
                file,
                proceso,
                request.user.provincia,
                selected_subject=selected_subject,
                deadline=deadline,
            )
        except Exception as error:
            return Response({"detail": f"No se pudo leer el Excel: {error}"}, status=400)
        if result.errors:
            return Response({"inserted": 0, "updated": 0, "errors": result.errors}, status=400)
        from apps.core.notifications import notify_users
        notification_users = Usuario.objects.filter(rol="estudiante")
        if request.user.rol != "superadmin":
            notification_users = notification_users.filter(
                escuela__municipio__provincia=request.user.provincia,
            )
        notify_users(
            notification_users,
            "Resultados de exámenes publicados",
            f"Ya puedes consultar tus resultados de {selected_subject} del proceso {proceso.anio.year}.",
            filter_students=False,
        )
        return Response({"inserted": result.inserted, "updated": result.updated, "errors": []}, status=201)


def normalize_result_subject(value):
    text = unicodedata.normalize("NFKD", str(value or "").strip().lower())
    text = "".join(char for char in text if not unicodedata.combining(char))
    if "matematic" in text:
        return "matematica"
    if "espanol" in text:
        return "espanol"
    if "historia" in text:
        return "historia"
    return None


def _school_result_row(entry, grades, anio):
    return {
        "id": entry.id,
        "ci": entry.estudiante.ci,
        "student": f"{entry.estudiante.nombre} {entry.estudiante.apellidos}",
        "school": entry.escalafon.escuela.nombre,
        "matematica": grades.get("matematica"),
        "espanol": grades.get("espanol"),
        "historia": grades.get("historia"),
        "escalafon_index": float(entry.indice_general),
        "process_year": anio,
    }


class ResultadosListView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        anio = int(request.query_params.get("anio", timezone.now().year))
        if request.user.rol in {"secretario_escuela", "director_escuela"}:
            if not request.user.escuela_id:
                return Response({"detail": "El usuario no tiene una escuela asignada."}, status=400)
            escalafon_process = Proceso.get_for_stage_and_year(anio, ETAPAS_NOMBRES[1])
            if not escalafon_process:
                return Response([])
            entries = EscalafonItem.objects.filter(
                escalafon__proceso=escalafon_process,
                escalafon__escuela_id=request.user.escuela_id,
            ).select_related("estudiante", "escalafon__escuela")
            result_process = Proceso.get_for_stage_and_year(anio, ETAPAS_NOMBRES[5])
            results = ResultadoExamen.objects.filter(
                proceso=result_process,
                estudiante__escuela_id=request.user.escuela_id,
            ).select_related("asignatura") if result_process else ResultadoExamen.objects.none()
            results_by_student = {}
            for result in results:
                subject_key = normalize_result_subject(result.asignatura.nombre)
                if subject_key:
                    results_by_student.setdefault(result.estudiante_id, {})[subject_key] = result.nota
            return Response([_school_result_row(entry, results_by_student.get(entry.estudiante_id, {}), anio) for entry in entries.order_by("-indice_general", "estudiante__apellidos")])

        if request.user.rol == "estudiante":
            student = getattr(request.user, "estudiante", None)
            if not student:
                return Response({"detail": "El usuario no tiene un perfil de estudiante."}, status=400)
            result_process = Proceso.get_for_stage_and_year(anio, ETAPAS_NOMBRES[5])
            results = ResultadoExamen.objects.filter(
                estudiante=student,
                proceso=result_process,
            ).select_related("asignatura") if result_process else ResultadoExamen.objects.none()
            claims = {
                claim.resultado_id: claim
                for claim in Reclamacion.objects.filter(
                    estudiante=student,
                    resultado__proceso=result_process,
                )
            } if result_process else {}
            current_stage = Etapa.objects.filter(estado="en_curso").order_by("id").first()
            current_stage_number = next(
                (number for number, name in ETAPAS_NOMBRES.items() if current_stage and current_stage.nombre == name),
                None,
            )
            results_by_subject = {
                normalize_result_subject(result.asignatura.nombre): result
                for result in results
                if normalize_result_subject(result.asignatura.nombre)
            }
            subjects = [("matematica", "Matemática"), ("espanol", "Español"), ("historia", "Historia")]
            return Response({
                "stage": {
                    "active": current_stage_number == 5,
                    "completed": current_stage_number is not None and current_stage_number > 5,
                    "current_number": current_stage_number,
                    "fecha_fin": current_stage.fecha_fin if current_stage_number == 5 else None,
                },
                "results": [{
                    "id": result.id if result else subject_key,
                    "subject": subject_name,
                    "grade": result.nota if result else None,
                    "fecha_limite_reclamo": result.fecha_limite_reclamo if result else None,
                    "claim": (
                        {
                            "id": claims[result.id].id,
                            "status": claims[result.id].estado,
                            "description": claims[result.id].descripcion,
                            "fecha_presentacion": claims[result.id].fecha_presentacion,
                            "lugar_presentacion": claims[result.id].lugar_presentacion,
                        }
                        if result and result.id in claims else None
                    ),
                } for subject_key, subject_name in subjects for result in [results_by_subject.get(subject_key)]],
            })
        elif request.user.rol in {"jefe_comision", "superadmin"}:
            queryset = ResultadoExamen.objects.filter(proceso__etapa__nombre=ETAPAS_NOMBRES[5])
            if request.user.rol == "jefe_comision":
                queryset = queryset.filter(estudiante__escuela__municipio__provincia_id=request.user.provincia_id)
        else:
            return Response({"detail": "No tienes permiso para consultar resultados."}, status=403)
        return Response([{
            "id": item.id,
            "ci": item.estudiante.ci,
            "student": f"{item.estudiante.nombre} {item.estudiante.apellidos}",
            "subject": item.asignatura.nombre,
            "grade": item.nota,
            "school": item.estudiante.escuela.nombre,
            "fecha_limite_reclamo": item.fecha_limite_reclamo,
            "process_year": item.proceso.anio.year,
        } for item in queryset.select_related("estudiante__escuela", "asignatura", "proceso").order_by("estudiante__apellidos", "asignatura__nombre")])


class LandingResultadosView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        try:
            anio = int(request.query_params.get("anio", timezone.now().year))
        except (TypeError, ValueError):
            return Response({"detail": "El año indicado no es válido."}, status=400)
        queryset = ResultadoExamen.objects.filter(
            proceso__anio__year=anio,
            proceso__etapa__nombre=ETAPAS_NOMBRES[5],
        ).select_related("estudiante__escuela__municipio__provincia", "asignatura", "proceso")
        provincia = request.query_params.get("provincia", "").strip()
        municipio = request.query_params.get("municipio", "").strip()
        escuela = request.query_params.get("escuela", "").strip()
        asignatura = request.query_params.get("asignatura", "").strip()
        if provincia:
            queryset = queryset.filter(estudiante__escuela__municipio__provincia__nombre__iexact=provincia)
        if municipio:
            queryset = queryset.filter(estudiante__escuela__municipio__nombre__iexact=municipio)
        if escuela:
            queryset = queryset.filter(estudiante__escuela__nombre__iexact=escuela)
        if asignatura:
            queryset = queryset.filter(asignatura__nombre__iexact=asignatura)
        results = [{
            "id": item.id,
            "student": f"{item.estudiante.nombre} {item.estudiante.apellidos}",
            "school": item.estudiante.escuela.nombre,
            "municipality": item.estudiante.escuela.municipio.nombre,
            "province": item.estudiante.escuela.municipio.provincia.nombre,
            "subject": item.asignatura.nombre,
            "grade": item.nota,
            "year": item.proceso.anio.year,
        } for item in queryset.order_by("estudiante__apellidos", "estudiante__nombre", "asignatura__nombre")]
        all_results = ResultadoExamen.objects.filter(
            proceso__anio__year=anio,
            proceso__etapa__nombre=ETAPAS_NOMBRES[5],
        ).select_related("estudiante__escuela__municipio__provincia", "asignatura")
        return Response({
            "year": anio,
            "results": results,
            "years": list(Proceso.objects.filter(etapa__nombre=ETAPAS_NOMBRES[5]).values_list("anio__year", flat=True).distinct().order_by("-anio__year")),
            "provinces": list(all_results.values_list("estudiante__escuela__municipio__provincia__nombre", flat=True).distinct().order_by("estudiante__escuela__municipio__provincia__nombre")),
            "municipalities": list(all_results.values_list("estudiante__escuela__municipio__nombre", flat=True).distinct().order_by("estudiante__escuela__municipio__nombre")),
            "schools": list(all_results.values_list("estudiante__escuela__nombre", flat=True).distinct().order_by("estudiante__escuela__nombre")),
            "subjects": list(all_results.values_list("asignatura__nombre", flat=True).distinct().order_by("asignatura__nombre")),
        })


class LandingOtorgamientosView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        try:
            anio = int(request.query_params.get("anio", timezone.now().year))
        except (TypeError, ValueError):
            return Response({"detail": "El año indicado no es válido."}, status=400)
        provincia = request.query_params.get("provincia", "").strip()
        ci = request.query_params.get("ci", "").strip()
        queryset = Otorgamiento.objects.filter(
            proceso__anio__year=anio,
            proceso__etapa__nombre=ETAPAS_NOMBRES[6],
        ).select_related("estudiante__escuela__municipio__provincia", "carrera__ces", "proceso")
        if provincia:
            queryset = queryset.filter(estudiante__escuela__municipio__provincia__nombre__iexact=provincia)
        if ci:
            queryset = queryset.filter(estudiante__ci__icontains=ci)
        all_awards = Otorgamiento.objects.filter(
            proceso__anio__year=anio,
            proceso__etapa__nombre=ETAPAS_NOMBRES[6],
        ).select_related("estudiante__escuela__municipio__provincia")
        return Response({
            "year": anio,
            "results": [{
                "id": item.id,
                "student": f"{item.estudiante.nombre} {item.estudiante.apellidos}",
                "ci": item.estudiante.ci,
                "career": item.carrera.nombre,
                "ces": item.carrera.ces.nombre,
                "award_index": item.indice_otorgamiento,
                "school": item.estudiante.escuela.nombre,
                "province": item.estudiante.escuela.municipio.provincia.nombre,
                "year": item.proceso.anio.year,
            } for item in queryset.order_by("estudiante__apellidos", "estudiante__nombre")],
            "years": list(Proceso.objects.filter(etapa__nombre=ETAPAS_NOMBRES[6]).values_list("anio__year", flat=True).distinct().order_by("-anio__year")),
            "provinces": list(all_awards.values_list("estudiante__escuela__municipio__provincia__nombre", flat=True).distinct().order_by("estudiante__escuela__municipio__provincia__nombre")),
        })


class LandingCortesView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        available_years = list(CorteCarrera.objects.filter(
            proceso__etapa__nombre=ETAPAS_NOMBRES[6],
        ).values_list("proceso__anio__year", flat=True).distinct().order_by("-proceso__anio__year"))
        if not available_years:
            return Response({"year": None, "items": [], "years": []})
        try:
            selected_year = int(request.query_params.get("anio", available_years[0]))
        except (TypeError, ValueError):
            return Response({"detail": "El año indicado no es válido."}, status=400)
        if selected_year not in available_years:
            selected_year = available_years[0]
        cuts = CorteCarrera.objects.filter(
            proceso__anio__year=selected_year,
            proceso__etapa__nombre=ETAPAS_NOMBRES[6],
        ).select_related("carrera", "proceso")
        province = request.query_params.get("provincia", "").strip()
        career_search = request.query_params.get("carrera", "").strip()
        if province:
            province_careers = PlanPlaza.objects.filter(
                proceso__anio__year=selected_year,
                provincia__nombre__iexact=province,
            ).values("carrera_id")
            cuts = cuts.filter(carrera_id__in=province_careers)
        if career_search:
            cuts = cuts.filter(carrera__nombre__icontains=career_search)
        requests = BoletaSolicitudItem.objects.filter(
            boleta_solicitud__proceso__anio__year=selected_year,
            boleta_solicitud__proceso__etapa__nombre=ETAPAS_NOMBRES[3],
        ).values("plan_plaza__carrera_id").annotate(total=Count("id"))
        requested_counts = {row["plan_plaza__carrera_id"]: row["total"] for row in requests}
        cuts = sorted(cuts, key=lambda cut: (-requested_counts.get(cut.carrera_id, 0), cut.carrera.nombre))
        return Response({
            "year": selected_year,
            "years": available_years,
            "provinces": list(PlanPlaza.objects.filter(proceso__anio__year=selected_year).values_list("provincia__nombre", flat=True).distinct().order_by("provincia__nombre")),
            "items": [{
                "id": cut.id,
                "career": cut.carrera.nombre,
                "career_code": cut.carrera.codigo,
                "index": cut.indice_corte,
                "requests_count": requested_counts.get(cut.carrera_id, 0),
                "year": selected_year,
            } for cut in cuts],
        })


class StudentResultClaimView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, result_id):
        if request.user.rol != "estudiante":
            return Response({"detail": "Solo un estudiante puede reclamar una nota."}, status=403)
        result = ResultadoExamen.objects.filter(
            pk=result_id,
            estudiante__usuario=request.user,
            proceso__etapa__nombre=ETAPAS_NOMBRES[5],
        ).first()
        if not result:
            return Response({"detail": "No existe ese resultado publicado."}, status=404)
        stage = Etapa.objects.filter(nombre=ETAPAS_NOMBRES[5]).first()
        if not stage or stage.estado != "en_curso":
            return Response({"detail": "Las reclamaciones no están disponibles fuera de la etapa 5."}, status=403)
        if result.fecha_limite_reclamo and result.fecha_limite_reclamo < timezone.localdate():
            return Response({"detail": "El plazo de reclamación ya finalizó."}, status=403)
        if Reclamacion.objects.filter(resultado=result).exists():
            return Response({"detail": "Ya existe una reclamación para esta nota."}, status=400)
        description = str(request.data.get("descripcion", "")).strip()
        if not description:
            return Response({"detail": "Debes indicar el motivo de la reclamación."}, status=400)
        claim = Reclamacion.objects.create(
            estudiante=request.user.estudiante,
            resultado=result,
            descripcion=description,
        )
        return Response({"id": claim.id, "status": claim.estado}, status=201)


class ResultClaimsListView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if request.user.rol not in {"jefe_comision", "superadmin"}:
            return Response({"detail": "No tienes permiso para consultar reclamaciones."}, status=403)
        try:
            anio = int(request.query_params.get("anio", timezone.now().year))
        except (TypeError, ValueError):
            return Response({"detail": "El año indicado no es válido."}, status=400)
        claims = Reclamacion.objects.filter(
            estado="pendiente",
            resultado__proceso__anio__year=anio,
            resultado__proceso__etapa__nombre=ETAPAS_NOMBRES[5],
        ).select_related("estudiante__escuela", "resultado__asignatura", "resultado__proceso")
        if request.user.rol == "jefe_comision":
            claims = claims.filter(estudiante__escuela__municipio__provincia_id=request.user.provincia_id)
        return Response([{
            "id": claim.id,
            "student": f"{claim.estudiante.nombre} {claim.estudiante.apellidos}",
            "ci": claim.estudiante.ci,
            "school": claim.estudiante.escuela.nombre,
            "subject": claim.resultado.asignatura.nombre,
            "grade": claim.resultado.nota,
            "description": claim.descripcion,
            "status": claim.estado,
            "date": claim.fecha_solicitud,
            "deadline": claim.resultado.fecha_limite_reclamo,
            "process_year": claim.resultado.proceso.anio.year,
        } for claim in claims.order_by("-fecha_solicitud", "estudiante__apellidos")])


class ResultClaimDecisionView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request, claim_id):
        if request.user.rol not in {"jefe_comision", "superadmin"}:
            return Response({"detail": "No tienes permiso para resolver reclamaciones."}, status=403)
        decision = request.data.get("estado")
        if decision not in {"aprobada", "rechazada"}:
            return Response({"detail": "El estado debe ser aprobada o rechazada."}, status=400)
        claim = Reclamacion.objects.filter(
            pk=claim_id,
            estado="pendiente",
            resultado__proceso__etapa__nombre=ETAPAS_NOMBRES[5],
        ).select_related("estudiante__escuela").first()
        if not claim:
            return Response({"detail": "La reclamación pendiente no existe."}, status=404)
        if request.user.rol == "jefe_comision" and claim.estudiante.escuela.municipio.provincia_id != request.user.provincia_id:
            return Response({"detail": "Solo puedes resolver reclamaciones de tu provincia."}, status=403)
        if decision == "aprobada":
            presentation_date = str(request.data.get("fecha_presentacion", "")).strip()
            presentation_place = str(request.data.get("lugar_presentacion", "")).strip()
            if not presentation_date or not presentation_place:
                return Response({"detail": "Para aceptar debes indicar fecha, hora y lugar de presentación."}, status=400)
            try:
                parsed_date = datetime.fromisoformat(presentation_date)
                if parsed_date.tzinfo is None:
                    parsed_date = timezone.make_aware(parsed_date)
            except ValueError:
                return Response({"detail": "La fecha y hora de presentación no son válidas."}, status=400)
            claim.fecha_presentacion = parsed_date
            claim.lugar_presentacion = presentation_place
        claim.estado = decision
        claim.fecha_respuesta = timezone.localdate()
        update_fields = ["estado", "fecha_respuesta"]
        if decision == "aprobada":
            update_fields.extend(["fecha_presentacion", "lugar_presentacion"])
        claim.save(update_fields=update_fields)
        if decision == "aprobada":
            from apps.core.notifications import notify_users
            presentation_text = parsed_date.strftime("%d/%m/%Y %H:%M")
            notify_users(
                [claim.estudiante.usuario],
                "Reclamación aceptada",
                f"Tu reclamación de {claim.resultado.asignatura.nombre} fue aceptada. Presentación: {presentation_text}, en {claim.lugar_presentacion}.",
            )
        return Response({"id": claim.id, "status": claim.estado})


class ExportResultadosView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if request.user.rol not in {"jefe_comision", "secretario_escuela", "director_escuela", "superadmin"}:
            return Response({"detail": "No tienes permiso para exportar resultados."}, status=403)
        anio = int(request.query_params.get("anio", timezone.now().year))
        if request.user.rol in {"secretario_escuela", "director_escuela"}:
            if not request.user.escuela_id:
                return Response({"detail": "El usuario no tiene una escuela asignada."}, status=400)
            escalafon_process = Proceso.get_for_stage_and_year(anio, ETAPAS_NOMBRES[1])
            if not escalafon_process:
                return Response({"detail": "No existe un escalafón para el año indicado."}, status=404)
            entries = EscalafonItem.objects.filter(
                escalafon__proceso=escalafon_process,
                escalafon__escuela_id=request.user.escuela_id,
            ).select_related("estudiante", "escalafon__escuela")
            result_process = Proceso.get_for_stage_and_year(anio, ETAPAS_NOMBRES[5])
            results = ResultadoExamen.objects.filter(
                proceso=result_process,
                estudiante__escuela_id=request.user.escuela_id,
            ).select_related("asignatura") if result_process else ResultadoExamen.objects.none()
            results_by_student = {}
            for result in results:
                subject_key = normalize_result_subject(result.asignatura.nombre)
                if subject_key:
                    results_by_student.setdefault(result.estudiante_id, {})[subject_key] = result.nota

            workbook = Workbook()
            sheet = workbook.active
            sheet.title = "Resultados"
            sheet.append(["CI", "Estudiante", "Escuela", "Matematica", "Espanol", "Historia"])
            for entry in entries.order_by("-indice_general", "estudiante__apellidos"):
                row = _school_result_row(entry, results_by_student.get(entry.estudiante_id, {}), anio)
                sheet.append([
                    row["ci"],
                    row["student"],
                    row["school"],
                    row["matematica"] if row["matematica"] is not None else "-",
                    row["espanol"] if row["espanol"] is not None else "-",
                    row["historia"] if row["historia"] is not None else "-",
                ])
            output = io.BytesIO()
            workbook.save(output)
            response = HttpResponse(output.getvalue(), content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
            response["Content-Disposition"] = f'attachment; filename="resultados_{anio}_escuela.xlsx"'
            return response

        queryset = ResultadoExamen.objects.filter(
            proceso__anio__year=anio,
            proceso__etapa__nombre=ETAPAS_NOMBRES[5],
        )
        if request.user.rol == "jefe_comision":
            queryset = queryset.filter(
                estudiante__escuela__municipio__provincia_id=request.user.provincia_id,
            )
        selected_subject = request.query_params.get("asignatura", "").strip()
        if selected_subject:
            subject_key = normalize_result_subject(selected_subject)
            subject_names = {
                "matematica": "Matemática",
                "espanol": "Español",
                "historia": "Historia",
            }
            if not subject_key:
                return Response({"detail": "La asignatura indicada no es válida."}, status=400)
            queryset = queryset.filter(asignatura__nombre__iexact=subject_names[subject_key])
        workbook = Workbook()
        sheet = workbook.active
        sheet.title = "Resultados"
        sheet.append(["CI", "Asignatura", "Nota", "Fecha_Limite_Reclamo"])
        for item in queryset.select_related("estudiante", "asignatura").order_by("estudiante__apellidos", "asignatura__nombre"):
            sheet.append([item.estudiante.ci, item.asignatura.nombre, item.nota, item.fecha_limite_reclamo])
        output = io.BytesIO()
        workbook.save(output)
        response = HttpResponse(
            output.getvalue(),
            content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )
        filename_subject = normalize_result_subject(selected_subject) if selected_subject else "todas"
        response["Content-Disposition"] = f'attachment; filename="resultados_{filename_subject}_{anio}.xlsx"'
        return response


class ExportEscalafonView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        try:
            escuela = resolve_school(request.query_params.get("escuela") or request.user.escuela_id)
            if request.user.rol in {"secretario_escuela", "director_escuela"} and escuela.id != request.user.escuela_id:
                return Response({"detail": "Solo puedes exportar el escalafón de tu escuela."}, status=status.HTTP_403_FORBIDDEN)
            if request.user.rol == "jefe_comision" and escuela.municipio.provincia_id != request.user.provincia_id:
                return Response({"detail": "Solo puedes exportar escalafones de tu provincia."}, status=status.HTTP_403_FORBIDDEN)
            anio = int(request.query_params.get("anio", request.query_params.get("año", timezone.now().year)))
            proceso = Proceso.get_for_stage_and_year(anio, ETAPAS_NOMBRES[1])
            if not proceso:
                raise Escalafon.DoesNotExist
            escalafon = Escalafon.objects.get(escuela=escuela, proceso=proceso)
        except (TypeError, ValueError, Escuela.DoesNotExist, Escalafon.DoesNotExist):
            return Response({"detail": "No existe un escalafón para la escuela y año indicados."}, status=status.HTTP_404_NOT_FOUND)
        data = EscalafonExcelService().export_file(EscalafonItem.objects.filter(escalafon=escalafon).order_by("estudiante__apellidos", "estudiante__nombre"))
        response = HttpResponse(data, content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
        response["Content-Disposition"] = f'attachment; filename="escalafon-{anio}.xlsx"'
        return response


def escalafon_stage_active():
    stage = Etapa.objects.filter(nombre=ETAPAS_NOMBRES[1]).first()
    today = timezone.localdate()
    return bool(stage and stage.fecha_inicio and stage.fecha_fin and stage.fecha_inicio <= today <= stage.fecha_fin), stage


def visible_entries(request):
    process = Proceso.get_for_stage_and_year(timezone.now().year, ETAPAS_NOMBRES[1])
    entries = EscalafonItem.objects.select_related("estudiante", "escalafon__escuela").filter(escalafon__proceso=process) if process else EscalafonItem.objects.none()
    user = request.user
    if user.rol == "estudiante":
        return entries.filter(escalafon__escuela_id=user.escuela_id)
    if user.rol in {"secretario_escuela", "director_escuela"}:
        return entries.filter(escalafon__escuela_id=user.escuela_id)
    if user.rol == "jefe_comision":
        return entries.filter(escalafon__escuela__municipio__provincia_id=user.provincia_id)
    return entries


class EscalafonListView(APIView):
    permission_classes = [CanManageEscalafon]

    def get(self, request):
        entries = visible_entries(request).order_by("-escalafon__proceso__anio", "-indice_general", "estudiante__apellidos")
        active, _ = escalafon_stage_active()
        serialized = EscalafonItemSerializer(entries, many=True, context={"request": request}).data
        current = entries.filter(estudiante__usuario=request.user).first() if request.user.rol == "estudiante" else None
        return Response({"entries": serialized, "stage_active": active, "actual_id": current.id if current else None})


class ProvincialEscalafonSummaryView(APIView):
    permission_classes = [CanManageEscalafon]

    def get(self, request):
        if request.user.rol not in {"jefe_comision", "secretario_escuela"} and not request.user.is_superuser and request.user.rol != "superadmin":
            return Response({"detail": "No tienes permiso para consultar este resumen."}, status=403)
        process = Proceso.get_for_stage_and_year(timezone.now().year, ETAPAS_NOMBRES[1])
        if request.user.rol == "secretario_escuela":
            schools = Escuela.objects.filter(pk=request.user.escuela_id)
        else:
            schools = Escuela.objects.filter(municipio__provincia_id=request.user.provincia_id)
        current_entries = EscalafonItem.objects.filter(
            escalafon__proceso=process,
            escalafon__escuela__in=schools,
        ) if process else EscalafonItem.objects.none()
        municipalities = schools.values("municipio_id", "municipio__nombre").annotate(
            schools_count=Count("id"),
            sent_count=Count("escalafones", filter=Q(escalafones__proceso=process, escalafones__estado="enviado"), distinct=True),
            students_count=Count("escalafones__estudiantes", filter=Q(escalafones__proceso=process, escalafones__estado="enviado"), distinct=True),
        ).order_by("municipio__nombre")
        data = []
        for municipality in municipalities:
            sent = municipality["sent_count"]
            schools = municipality["schools_count"]
            municipality_schools = Escuela.objects.filter(
                municipio_id=municipality["municipio_id"]
            ).values("id", "nombre")
            school_statuses = dict(Escalafon.objects.filter(
                proceso=process,
                escuela_id__in=municipality_schools.values("id"),
            ).values_list("escuela_id", "estado")) if process else {}
            data.append({
                "id": municipality["municipio_id"],
                "nombre": municipality["municipio__nombre"],
                "escuelas": schools,
                "escuelas_enviaron": sent,
                "estudiantes": municipality["students_count"],
                "estado": "Completo" if sent == schools and schools else "Parcial" if sent else "Pendiente",
                "escuelas_lista": [
                    {"id": school["id"], "nombre": school["nombre"], "estado": school_statuses.get(school["id"], "pendiente")}
                    for school in municipality_schools
                ],
            })
        return Response({
            "year": timezone.now().year,
            "escuelas_enviaron": sum(item["escuelas_enviaron"] for item in data),
            "escuelas_pendientes": sum(item["escuelas"] - item["escuelas_enviaron"] for item in data),
            "total_estudiantes": current_entries.count(),
            "estudiantes_aceptaron": current_entries.filter(estado="aceptado").count(),
            "estudiantes_pendientes": current_entries.exclude(estado="aceptado").count(),
            "municipios": data,
        })


class ProvincialEscalafonExportView(APIView):
    permission_classes = [CanManageEscalafon]

    def get(self, request):
        if request.user.rol != "jefe_comision" and not request.user.is_superuser and request.user.rol != "superadmin":
            return Response({"detail": "Solo el Jefe de Comisión puede exportar este resumen."}, status=403)
        process = Proceso.get_for_stage_and_year(timezone.now().year, ETAPAS_NOMBRES[1])
        entries = EscalafonItem.objects.filter(
            escalafon__proceso=process,
            escalafon__escuela__municipio__provincia_id=request.user.provincia_id,
        ).order_by("escalafon__escuela__municipio__nombre", "estudiante__apellidos", "estudiante__nombre")
        data = EscalafonExcelService().export_file(entries)
        response = HttpResponse(data, content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
        response["Content-Disposition"] = 'attachment; filename="escalafones-provinciales.xlsx"'
        return response


class EscalafonTemplateView(APIView):
    permission_classes = [CanManageEscalafon]

    def get(self, request):
        workbook = Workbook()
        worksheet = workbook.active
        worksheet.append(["CI", "Nombre", "Apellidos", "Sexo", "Dirección", "Índice_10mo", "Índice_11mo", "Índice_12mo", "Índice_General"])
        output = io.BytesIO()
        workbook.save(output)
        response = HttpResponse(output.getvalue(), content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
        response["Content-Disposition"] = 'attachment; filename="plantilla-escalafon.xlsx"'
        return response


class EscalafonEntryView(APIView):
    permission_classes = [CanManageEscalafon]

    def patch(self, request, pk):
        try:
            entry = visible_entries(request).get(pk=pk)
        except EscalafonItem.DoesNotExist:
            return Response({"detail": "Registro no encontrado."}, status=404)
        if entry.escalafon.estado == "enviado":
            return Response({"detail": "El escalafón ya fue enviado y no puede modificarse."}, status=403)
        active, _ = escalafon_stage_active()
        serializer = EscalafonItemSerializer(entry, data=request.data, partial=True, context={"request": request, "stage_active": active})
        serializer.is_valid(raise_exception=True)
        return Response(serializer.data)


class EscalafonSendView(APIView):
    permission_classes = [CanManageEscalafon]

    def post(self, request):
        if request.user.rol != "secretario_escuela":
            return Response({"detail": "Solo el Secretario puede enviar índices a la Comisión."}, status=403)
        entries = visible_entries(request).filter(escalafon__proceso__anio__year=timezone.now().year)
        if entries.filter(estado="por_revisar").exists():
            return Response({"detail": "No puedes enviar el escalafón mientras existan reclamaciones pendientes."}, status=400)
        escalafones = Escalafon.objects.filter(
            id__in=entries.values("escalafon_id"),
            escuela=request.user.escuela,
        )
        with transaction.atomic():
            escalafones.update(estado="enviado")
            entries.update(indices_bloqueados=True)
        from apps.core.notifications import notify_users
        notify_users(
            Usuario.objects.filter(rol="jefe_comision", provincia_id=request.user.provincia_id),
            "Escalafón enviado a comisión",
            f"La escuela {request.user.escuela.nombre} envió su escalafón a la Comisión de Ingreso.",
        )
        return Response({"updated": entries.count()})


class StudentEscalafonActionView(APIView):
    permission_classes = [CanManageEscalafon]

    def post(self, request, action):
        if request.user.rol != "estudiante":
            return Response({"detail": "Solo un estudiante puede realizar esta acción."}, status=403)
        try:
            entry = EscalafonItem.objects.get(estudiante__usuario=request.user, escalafon__proceso__anio__year=timezone.now().year)
        except EscalafonItem.DoesNotExist:
            return Response({"detail": "No tienes un escalafón vigente."}, status=404)
        serializer = StudentEscalafonActionSerializer(data=request.data, context={"action": action})
        serializer.is_valid(raise_exception=True)
        if action not in {"aceptar", "revision"}:
            return Response({"detail": "Acción no válida."}, status=400)
        if entry.escalafon.estado == "enviado":
            return Response({"detail": "El escalafón ya fue enviado y solo puede consultarse."}, status=403)
        entry.estado = "aceptado" if action == "aceptar" else "por_revisar"
        entry.causa_revision = serializer.validated_data.get("causa", "") if action == "revision" else ""
        entry.fecha_revision = timezone.now() if action == "revision" else None
        entry.save(update_fields=["estado", "causa_revision", "fecha_revision"])
        from apps.core.notifications import notify_users
        secretaries = Usuario.objects.filter(rol="secretario_escuela", escuela=entry.escalafon.escuela)
        message = f"El estudiante {entry.estudiante.nombre} {entry.estudiante.apellidos} {'solicitó revisión' if action == 'revision' else 'aceptó sus índices'}."
        notify_users(secretaries, "Solicitud de revisión", message)
        return Response(EscalafonItemSerializer(entry, context={"request": request}).data)


class EscalafonReviewView(APIView):
    permission_classes = [CanManageEscalafon]

    def post(self, request, pk):
        if request.user.rol != "secretario_escuela":
            return Response({"detail": "Solo el Secretario puede revisar solicitudes."}, status=403)
        try:
            entry = visible_entries(request).get(pk=pk)
        except EscalafonItem.DoesNotExist:
            return Response({"detail": "Registro no encontrado."}, status=404)
        if entry.estado != "por_revisar":
            return Response({"detail": "Esta reclamación no está pendiente."}, status=400)
        entry.estado = "sin_respuesta"
        entry.save(update_fields=["estado"])
        from apps.core.notifications import notify_users
        notify_users(
            [entry.estudiante.usuario],
            "Revisión atendida",
            "El secretario revisó tu solicitud de revisión del escalafón.",
        )
        return Response(EscalafonItemSerializer(entry, context={"request": request}).data)
