from datetime import date
from io import BytesIO

from django.core.cache import cache
from django.core.files.uploadedfile import SimpleUploadedFile
from django.urls import reverse
from django.utils import timezone
from openpyxl import Workbook
from rest_framework.test import APITestCase

from apps.authentication.models import Estudiante, Usuario
from apps.gestion_escuela.models import Escalafon, EscalafonItem
from apps.gestion_personal.models import ConfirmacionPrueba, ResultadoExamen
from apps.gestion_provincial.models import ETAPAS_NOMBRES, CorteCarrera, Etapa, Otorgamiento, Proceso
from apps.superadmin.models import Asignatura, Carrera, Ces, Escuela, Municipio, Provincia

XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"


def make_xlsx(rows, name="datos.xlsx"):
    workbook = Workbook()
    for row in rows:
        workbook.active.append(row)
    buffer = BytesIO()
    workbook.save(buffer)
    return SimpleUploadedFile(name, buffer.getvalue(), content_type=XLSX)


def bad_xls():
    return SimpleUploadedFile("datos.xls", b"contenido", content_type="application/vnd.ms-excel")


def empty_xlsx():
    return SimpleUploadedFile("datos.xlsx", b"", content_type=XLSX)


class ImportBase(APITestCase):
    def setUp(self):
        cache.clear()
        self.provincia = Provincia.objects.create(nombre="Provincia Imp")
        self.otra_provincia = Provincia.objects.create(nombre="Otra Provincia Imp")
        municipio = Municipio.objects.create(nombre="Municipio Imp", provincia=self.provincia)
        otro_municipio = Municipio.objects.create(nombre="Municipio Otro Imp", provincia=self.otra_provincia)
        self.escuela = Escuela.objects.create(nombre="Escuela Imp", municipio=municipio)
        self.otra_escuela = Escuela.objects.create(nombre="Escuela Otra Imp", municipio=otro_municipio)
        self.ces = Ces.objects.create(nombre="CES Imp")
        self.carrera = Carrera.objects.create(codigo="IMP-1", nombre="Carrera Imp", ces=self.ces, provincia=self.provincia)
        self.jefe = self._user("jefe.imp", "jefe_comision", provincia=self.provincia)
        self.jefe_otra = self._user("jefe.otra", "jefe_comision", provincia=self.otra_provincia)
        self.secretario = self._user("sec.imp", "secretario_escuela", escuela=self.escuela)
        self.secretario_otra = self._user("sec.otra", "secretario_escuela", escuela=self.otra_escuela)
        self.director = self._user("dir.imp", "director_escuela", escuela=self.escuela)
        self.year_start = timezone.now().date().replace(month=1, day=1)

    def _user(self, username, rol, **extra):
        return Usuario.objects.create_user(
            username=username, email=f"{username}@example.com", password="secret1234", rol=rol, **extra,
        )

    def make_student(self, ci, escuela=None):
        return Estudiante.objects.create(
            ci=ci, nombre="Nombre", apellidos="Apellidos", sexo="F",
            direccion="Dir", escuela=escuela or self.escuela,
        )

    def stage(self, n, estado="en_curso"):
        etapa = Etapa.objects.get(nombre=ETAPAS_NOMBRES[n])
        etapa.estado = estado
        etapa.save(update_fields=["estado"])
        return Proceso.objects.get_or_create(anio=self.year_start, etapa=etapa)[0]

    def post_raw(self, url_name, user, file, data=None):
        self.client.force_authenticate(user)
        payload = dict(data or {})
        if file is not None:
            payload["file"] = file
        return self.client.post(reverse(url_name), payload, format="multipart")

    def run_import(self, url_name, user, file, data=None):
        """Encola (202) y devuelve (http_status, body) de la tarea ya resuelta."""
        accepted = self.post_raw(url_name, user, file, data)
        self.assertEqual(accepted.status_code, 202, accepted.content)
        self.assertEqual(accepted.data["estado"], "pendiente")
        status = self.client.get(reverse("import-task-status", args=[accepted.data["task_id"]]))
        self.assertEqual(status.status_code, 200)
        return status.data["http_status"], status.data["resultado"]


class StageSixImportTests(ImportBase):
    OTORG_HEADERS = ["CI", "Codigo_Carrera", "Nombre_Carrera", "Indice_Otorgamiento"]
    CORTE_HEADERS = ["Codigo_Carrera", "Nombre_Carrera", "Indice_Corte"]

    def setUp(self):
        super().setUp()
        self.proceso = self.stage(6)
        self.student = self.make_student("90010112345")
        self.student2 = self.make_student("90010112346")

    # Otorgamiento
    def test_otorgamiento_happy_path(self):
        file = make_xlsx([
            self.OTORG_HEADERS,
            [self.student.ci, "IMP-1", "Carrera Imp", 91.5],
            [self.student2.ci, "IMP-1", "Carrera Imp", 88],
        ])
        code, body = self.run_import("import-otorgamiento", self.jefe, file)
        self.assertEqual(code, 201, body)
        self.assertEqual((body["inserted"], body["updated"], body["errors"]), (2, 0, []))
        self.assertEqual(Otorgamiento.objects.filter(proceso=self.proceso).count(), 2)
        self.assertEqual(Otorgamiento.objects.get(estudiante=self.student).indice_otorgamiento, 91.5)

    def test_otorgamiento_is_atomic(self):
        file = make_xlsx([
            self.OTORG_HEADERS,
            [self.student.ci, "IMP-1", "Carrera Imp", 91.5],
            ["99999999999", "IMP-1", "Carrera Imp", 80],
        ])
        code, body = self.run_import("import-otorgamiento", self.jefe, file)
        self.assertEqual(code, 400)
        self.assertEqual([e["row"] for e in body["errors"]], [3])
        self.assertEqual(Otorgamiento.objects.count(), 0)

    def test_otorgamiento_requires_stage_in_progress(self):
        self.stage(6, estado="no_iniciada")
        file = make_xlsx([self.OTORG_HEADERS, [self.student.ci, "IMP-1", "Carrera Imp", 91.5]])
        code, _ = self.run_import("import-otorgamiento", self.jefe, file)
        self.assertEqual(code, 400)
        self.assertEqual(Otorgamiento.objects.count(), 0)

    def test_otorgamiento_permissions_and_invalid_file(self):
        def good():
            return make_xlsx([self.OTORG_HEADERS, [self.student.ci, "IMP-1", "Carrera Imp", 91.5]])
        self.assertEqual(self.post_raw("import-otorgamiento", self.secretario, good()).status_code, 403)
        estudiante = self._user("est.o", "estudiante")
        self.assertEqual(self.post_raw("import-otorgamiento", estudiante, good()).status_code, 403)
        self.assertEqual(self.post_raw("import-otorgamiento", self.jefe, bad_xls()).status_code, 400)
        self.assertEqual(self.post_raw("import-otorgamiento", self.jefe, empty_xlsx()).status_code, 400)
        self.assertEqual(self.post_raw("import-otorgamiento", self.jefe, None).status_code, 400)
        self.assertEqual(Otorgamiento.objects.count(), 0)

    # Cortes
    def test_corte_happy_path(self):
        file = make_xlsx([self.CORTE_HEADERS, ["IMP-1", "Carrera Imp", 85.25]])
        code, body = self.run_import("import-cortes-carrera", self.jefe, file)
        self.assertEqual(code, 201, body)
        self.assertEqual((body["inserted"], body["updated"]), (1, 0))
        self.assertEqual(CorteCarrera.objects.get(proceso=self.proceso, carrera=self.carrera).indice_corte, 85.25)

    def test_corte_is_atomic(self):
        file = make_xlsx([
            self.CORTE_HEADERS,
            ["IMP-1", "Carrera Imp", 85],
            ["NOEXISTE", "Otra", 70],
        ])
        code, body = self.run_import("import-cortes-carrera", self.jefe, file)
        self.assertEqual(code, 400)
        self.assertEqual([e["row"] for e in body["errors"]], [3])
        self.assertEqual(CorteCarrera.objects.count(), 0)

    def test_corte_permissions_and_invalid_file(self):
        good = make_xlsx([self.CORTE_HEADERS, ["IMP-1", "Carrera Imp", 85]])
        self.assertEqual(self.post_raw("import-cortes-carrera", self.secretario, good).status_code, 403)
        self.assertEqual(self.post_raw("import-cortes-carrera", self.jefe, bad_xls()).status_code, 400)
        self.assertEqual(self.post_raw("import-cortes-carrera", self.jefe, empty_xlsx()).status_code, 400)
        self.assertEqual(CorteCarrera.objects.count(), 0)


class EscalafonImportTests(ImportBase):
    HEADERS = ["CI", "Nombre", "Apellidos", "Sexo", "Dirección", "Índice_10mo", "Índice_11mo", "Índice_12mo", "Índice_General"]

    def setUp(self):
        super().setUp()
        self.proceso = self.stage(1)

    def row(self, ci, general=90):
        return [ci, "Ana", "Pérez", "F", "Calle 1", 90, 91, 92, general]

    def test_happy_path_as_secretario(self):
        file = make_xlsx([self.HEADERS, self.row("90010100001", 95), self.row("90010100002", 80)])
        code, body = self.run_import("import-escalafon", self.secretario, file)
        self.assertEqual(code, 201, body)
        self.assertEqual((body["inserted"], body["errors"]), (2, []))
        escalafon = Escalafon.objects.get(escuela=self.escuela, proceso=self.proceso)
        self.assertEqual(EscalafonItem.objects.filter(escalafon=escalafon).count(), 2)
        self.assertTrue(Estudiante.objects.filter(ci="90010100001", escuela=self.escuela).exists())

    def test_happy_path_as_jefe_in_own_province(self):
        file = make_xlsx([self.HEADERS, self.row("90010100003")])
        code, body = self.run_import("import-escalafon", self.jefe, file, {"escuela": str(self.escuela.id)})
        self.assertEqual(code, 201, body)
        self.assertEqual(body["inserted"], 1)

    def test_is_atomic(self):
        file = make_xlsx([self.HEADERS, self.row("90010100004"), self.row("123", 90)])
        code, body = self.run_import("import-escalafon", self.secretario, file)
        self.assertEqual(code, 400)
        self.assertEqual([e["row"] for e in body["errors"]], [3])
        self.assertEqual(Escalafon.objects.count(), 0)
        self.assertEqual(EscalafonItem.objects.count(), 0)
        self.assertFalse(Estudiante.objects.filter(ci="90010100004").exists())

    def test_duplicate_escalafon_is_rejected(self):
        def file():
            return make_xlsx([self.HEADERS, self.row("90010100005")])
        self.assertEqual(self.run_import("import-escalafon", self.secretario, file())[0], 201)
        code, _ = self.run_import("import-escalafon", self.secretario, file())
        self.assertEqual(code, 400)
        self.assertEqual(Escalafon.objects.count(), 1)

    def test_scope_and_role_denied(self):
        def good():
            return make_xlsx([self.HEADERS, self.row("90010100006")])
        target = {"escuela": str(self.escuela.id)}
        self.assertEqual(self.post_raw("import-escalafon", self.secretario_otra, good(), target).status_code, 403)
        self.assertEqual(self.post_raw("import-escalafon", self.jefe_otra, good(), target).status_code, 403)
        self.assertEqual(self.post_raw("import-escalafon", self.director, good(), target).status_code, 403)
        self.assertEqual(Escalafon.objects.count(), 0)

    def test_invalid_file(self):
        self.assertEqual(self.post_raw("import-escalafon", self.secretario, bad_xls()).status_code, 400)
        self.assertEqual(self.post_raw("import-escalafon", self.secretario, empty_xlsx()).status_code, 400)
        self.assertEqual(Escalafon.objects.count(), 0)


class ResultadosImportTests(ImportBase):
    HEADERS = ["CI", "Asignatura", "Nota"]

    def setUp(self):
        super().setUp()
        self.proceso = self.stage(5)
        confirm_process = self.stage(4, estado="completada")
        self.matematica = Asignatura.objects.create(nombre="Matematica")
        self.student = self.make_student("90010200001")
        self.student2 = self.make_student("90010200002")
        for s in (self.student, self.student2):
            ConfirmacionPrueba.objects.create(
                estudiante=s, proceso=confirm_process, asignatura=self.matematica,
                confirmada=True, fecha_prueba=timezone.now(),
            )
        self.data = {"asignatura": "Matematica", "fecha_limite_reclamo": "2030-01-31"}

    def test_happy_path(self):
        file = make_xlsx([
            self.HEADERS,
            [self.student.ci, "Matematica", 88.5],
            [self.student2.ci, "Matematica", 70],
        ])
        code, body = self.run_import("import-resultados", self.jefe, file, self.data)
        self.assertEqual(code, 201, body)
        self.assertEqual((body["inserted"], body["updated"], body["errors"]), (2, 0, []))
        res = ResultadoExamen.objects.get(estudiante=self.student, proceso=self.proceso)
        self.assertEqual(res.nota, 88.5)
        self.assertEqual(res.fecha_limite_reclamo, date(2030, 1, 31))

    def test_is_atomic(self):
        file = make_xlsx([
            self.HEADERS,
            [self.student.ci, "Matematica", 88],
            [self.student2.ci, "Matematica", 150],
        ])
        code, body = self.run_import("import-resultados", self.jefe, file, self.data)
        self.assertEqual(code, 400)
        self.assertEqual([e["row"] for e in body["errors"]], [3])
        self.assertEqual(ResultadoExamen.objects.count(), 0)

    def test_student_from_other_province_is_rejected(self):
        file = make_xlsx([self.HEADERS, [self.student.ci, "Matematica", 88]])
        code, _ = self.run_import("import-resultados", self.jefe_otra, file, self.data)
        self.assertEqual(code, 400)
        self.assertEqual(ResultadoExamen.objects.count(), 0)

    def test_requires_stage_in_progress(self):
        self.stage(5, estado="no_iniciada")
        file = make_xlsx([self.HEADERS, [self.student.ci, "Matematica", 88]])
        self.assertEqual(self.post_raw("import-resultados", self.jefe, file, self.data).status_code, 403)
        self.assertEqual(ResultadoExamen.objects.count(), 0)

    def test_permissions_and_invalid_file(self):
        good = make_xlsx([self.HEADERS, [self.student.ci, "Matematica", 88]])
        self.assertEqual(self.post_raw("import-resultados", self.secretario, good, self.data).status_code, 403)
        self.assertEqual(self.post_raw("import-resultados", self.jefe, bad_xls(), self.data).status_code, 400)
        self.assertEqual(self.post_raw("import-resultados", self.jefe, empty_xlsx(), self.data).status_code, 400)
        self.assertEqual(ResultadoExamen.objects.count(), 0)
