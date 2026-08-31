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
from apps.gestion_provincial.models import PlanPlaza, Otorgamiento, Proceso, Etapa
from apps.authentication.models import Usuario
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

from openpyxl import Workbook, load_workbook
from apps.gestion_personal.models import BoletaInteres, BoletaSolicitud


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

class ImportOtorgamientoView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    def post(self, request):
        file = request.FILES.get("file")
        service = ExcelService(
            model=Otorgamiento,
            column_map=OTORGAMIENTO_MAP,
            fk_resolvers=OTORGAMIENTO_FK,
            validator=None
        )
        result = service.import_file(file)
        return Response({"inserted": result.inserted, "errors": result.errors})


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
        schools = Escuela.objects.filter(municipio__provincia_id=request.user.provincia_id)
        if request.user.rol == "secretario_escuela":
            schools = Escuela.objects.filter(municipio__provincia_id=request.user.provincia_id)
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
            "escuelas_enviaron": sum(item["escuelas_enviaron"] for item in data),
            "escuelas_pendientes": sum(item["escuelas"] - item["escuelas_enviaron"] for item in data),
            "total_estudiantes": sum(item["estudiantes"] for item in data),
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
        from apps.core.models import Notificacion
        secretaries = Usuario.objects.filter(rol="secretario_escuela", escuela=entry.escalafon.escuela)
        message = f"El estudiante {entry.estudiante.nombre} {entry.estudiante.apellidos} {'solicitó revisión' if action == 'revision' else 'aceptó sus índices'}."
        for secretary in secretaries:
            Notificacion.objects.create(usuario=secretary, titulo="Solicitud de revisión", contenido=message)
            if secretary.email:
                send_mail("Actualización de escalafón", message, None, [secretary.email], fail_silently=True)
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
        from apps.core.models import Notificacion
        Notificacion.objects.create(
            usuario=entry.estudiante.usuario,
            titulo="Revisión atendida",
            contenido="El secretario revisó tu solicitud de revisión del escalafón.",
        )
        return Response(EscalafonItemSerializer(entry, context={"request": request}).data)
