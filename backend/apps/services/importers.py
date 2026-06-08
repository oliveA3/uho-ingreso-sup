import pandas as pd
from django.db import transaction, models
from django.core.exceptions import ValidationError

# Importación de tus modelos
from apps.escuelas.models import Escuela
from apps.escuelas.models import Estudiante  # Asumiendo ubicación estándar
from apps.escuelas.models import Escalafon, NotaExamen, Otorgamiento # Modelos implícitos según tu SRS
from apps.escuelas.models import Carrera, PlanPlaza, CorteCarrera
from apps.nomencladores.models import Ces, Provincia, Municipio, OtorgamientoTipo
from apps.proceso.models import Proceso


class ExcelImporterBase:
    """Clase Base con utilidades de validación compartidas."""
    
    def __init__(self, file_path, proceso_id=None):
        self.file_path = file_path
        self.proceso = Proceso.objects.get(pk=proceso_id) if proceso_id else None
        self.errors = []

    def load_dataframe(self, expected_columns):
        try:
            df = pd.read_excel(self.file_path, dtype=str) # Forzar strings para evitar pérdidas de ceros a la izquierda en CI
            df.columns = df.columns.str.strip()
            
            # Verificar encabezados
            missing_cols = [col for col in expected_columns if col not in df.columns]
            if missing_cols:
                raise ValidationError(f"Faltan las siguientes columnas obligatorias: {', '.join(missing_cols)}")
            return df
        except Exception as e:
            raise ValidationError(f"Error al leer el archivo Excel: {str(e)}")

    def validate_ci(self, ci, row_idx):
        if not ci or len(str(ci).strip()) != 11 or not str(ci).strip().isdigit():
            self.errors.append(f"Fila {row_idx}: El CI '{ci}' debe tener exactamente 11 dígitos numéricos.")
            return None
        return str(ci).strip()

    def validate_decimal(self, value, min_val, max_val, field_name, row_idx):
        try:
            val = float(value)
            if not (min_val <= val <= max_val):
                self.errors.append(f"Fila {row_idx}: {field_name} ({val}) fuera de rango [{min_val} - {max_val}].")
                return None
            return round(val, 2)
        except (ValueError, TypeError):
            self.errors.append(f"Fila {row_idx}: {field_name} debe ser un valor numérico decimal.")
            return None


# ==========================================
# 10.1 IMPORTADOR: ESCALAFÓN ESTUDIANTIL
# ==========================================
class EscalafonImporter(ExcelImporterBase):
    EXPECTED_COLUMNS = [
        "CI", "Nombre", "Apellidos", "Sexo", "Dirección", 
        "Índice_10mo", "Índice_11mo", "Índice_12mo", "Índice_General"
    ]

    @transaction.atomic
    def import_data(self):
        df = self.load_dataframe(self.EXPECTED_COLUMNS)
        ci_cache = set()

        for idx, row in df.iterrows():
            row_num = idx + 2  # pandas inicia en 0, fila 1 es encabezado
            
            ci = self.validate_ci(row["CI"], row_num)
            if ci in ci_cache:
                self.errors.append(f"Fila {row_num}: El CI {ci} está duplicado en el archivo.")
                continue
            if ci: ci_cache.add(ci)

            sexo = str(row["Sexo"]).strip().upper()
            if sexo not in ["M", "F"]:
                self.errors.append(f"Fila {row_num}: Sexo debe ser 'M' o 'F'.")

            idx_10 = self.validate_decimal(row["Índice_10mo"], 0.0, 100.0, "Índice_10mo", row_num)
            idx_11 = self.validate_decimal(row["Índice_11mo"], 0.0, 100.0, "Índice_11mo", row_num)
            idx_12 = self.validate_decimal(row["Índice_12mo"], 0.0, 100.0, "Índice_12mo", row_num)
            idx_gen = self.validate_decimal(row["Índice_General"], 0.0, 100.0, "Índice_General", row_num)

            if self.errors: continue

            # Buscar o crear Estudiante y guardar Escalafón
            estudiante, _ = Estudiante.objects.get_or_create(
                ci=ci,
                defaults={
                    "nombre": row["Nombre"].strip(),
                    "apellidos": row["Apellidos"].strip(),
                    "sexo": sexo,
                }
            )

            Escalafon.objects.update_or_create(
                proceso=self.proceso,
                estudiante=estudiante,
                defaults={
                    "direccion": row["Dirección"].strip(),
                    "indice_10mo": idx_10,
                    "indice_11mo": idx_11,
                    "indice_12mo": idx_12,
                    "indice_general": idx_gen
                }
            )

        if self.errors:
            raise ValidationError(self.errors)


# ==========================================
# 10.2 IMPORTADOR: CATÁLOGO DE CARRERAS
# ==========================================
class CarreraImporter(ExcelImporterBase):
    EXPECTED_COLUMNS = ["Código", "Nombre", "CES", "Provincia"]

    @transaction.atomic
    def import_data(self):
        df = self.load_dataframe(self.EXPECTED_COLUMNS)

        for idx, row in df.iterrows():
            row_num = idx + 2
            
            try:
                ces = Ces.objects.get(nombre__iexact=row["CES"].strip())
            except Ces.DoesNotExist:
                self.errors.append(f"Fila {row_num}: El CES '{row['CES']}' no existe en nomencladores.")
                continue

            try:
                provincia = Provincia.objects.get(nombre__iexact=row["Provincia"].strip())
            except Provincia.DoesNotExist:
                self.errors.append(f"Fila {row_num}: La provincia '{row['Provincia']}' no existe.")
                continue

            if self.errors: continue

            Carrera.objects.update_or_create(
                codigo=row["Código"].strip(),
                defaults={
                    "nombre": row["Nombre"].strip(),
                    "ces": ces,
                    "provincia": provincia,
                    "activa": True
                }
            )

        if self.errors:
            raise ValidationError(self.errors)


# ==========================================
# 10.3 IMPORTADOR: PLAN DE PLAZAS
# ==========================================
class PlanPlazaImporter(ExcelImporterBase):
    EXPECTED_COLUMNS = ["Código_Carrera", "Nombre_Carrera", "Cantidad_Plazas", "Tipo_Otorgamiento", "CES", "Provincia", "Sexo"]

    @transaction.atomic
    def import_data(self):
        df = self.load_dataframe(self.EXPECTED_COLUMNS)

        for idx, row in df.iterrows():
            row_num = idx + 2
            
            # Validar Carrera
            try:
                carrera = Carrera.objects.get(codigo=row["Código_Carrera"].strip())
            except Carrera.DoesNotExist:
                self.errors.append(f"Fila {row_num}: Carrera con código '{row['Código_Carrera']}' no existe.")
                continue

            # Validar Plazas
            try:
                plazas = int(row["Cantidad_Plazas"])
                if plazas <= 0: raise ValueError
            except (ValueError, TypeError):
                self.errors.append(f"Fila {row_num}: Cantidad_Plazas debe ser un entero mayor que 0.")
                continue

            # Validar Tipo Otorgamiento, CES, Provincia
            try:
                tipo = OtorgamientoTipo.objects.get(nombre__iexact=row["Tipo_Otorgamiento"].strip())
                ces = Ces.objects.get(nombre__iexact=row["CES"].strip())
                provincia = Provincia.objects.get(nombre__iexact=row["Provincia"].strip())
            except (OtorgamientoTipo.DoesNotExist, Ces.DoesNotExist, Provincia.DoesNotExist) as e:
                self.errors.append(f"Fila {row_num}: Error en Nomencladores vinculados (Tipo, CES o Provincia).")
                continue

            # Validar Sexo
            sexo = str(row["Sexo"]).strip().upper()
            if sexo not in ["A", "F", "M"]:
                self.errors.append(f"Fila {row_num}: Sexo inválido. Valores válidos: A, F, M.")
                continue

            if self.errors: continue

            PlanPlaza.objects.update_or_create(
                proceso=self.proceso,
                carrera=carrera,
                tipo_otorgamiento=tipo,
                sexo=sexo,
                defaults={
                    "cantidad_plazas": plazas,
                    "ces": ces,
                    "provincia": provincia
                }
            )

        if self.errors:
            raise ValidationError(self.errors)


# ==========================================
# 10.4 IMPORTADOR: RESULTADOS DE EXÁMENES
# ==========================================
class ExamenesImporter(ExcelImporterBase):
    EXPECTED_COLUMNS = ["CI", "Asignatura", "Nota"]
    ASIGNATURAS_VALIDAS = ["Matematica", "Espanol", "Historia"]

    @transaction.atomic
    def import_data(self):
        df = self.load_dataframe(self.EXPECTED_COLUMNS)

        for idx, row in df.iterrows():
            row_num = idx + 2
            ci = self.validate_ci(row["CI"], row_num)
            
            if ci and not Estudiante.objects.filter(ci=ci).exists():
                self.errors.append(f"Fila {row_num}: El estudiante con CI '{ci}' no está registrado en el sistema.")
                continue

            asig = str(row["Asignatura"]).strip()
            if asig not in self.ASIGNATURAS_VALIDAS:
                self.errors.append(f"Fila {row_num}: Asignatura '{asig}' inválida. Usar: Matematica, Espanol o Historia.")
                continue

            nota = self.validate_decimal(row["Nota"], 0.0, 100.0, "Nota", row_num)

            if self.errors: continue

            estudiante = Estudiante.objects.get(ci=ci)
            NotaExamen.objects.update_or_create(
                proceso=self.proceso,
                estudiante=estudiante,
                asignatura=asig,
                defaults={"nota": nota}
            )

        if self.errors:
            raise ValidationError(self.errors)


# ==========================================
# 10.5 IMPORTADOR: OTORGAMIENTO DE CARRERA
# ==========================================
class OtorgamientoImporter(ExcelImporterBase):
    EXPECTED_COLUMNS = ["CI", "Código_Carrera", "Nombre_Carrera", "Índice_Otorgamiento"]

    @transaction.atomic
    def import_data(self):
        df = self.load_dataframe(self.EXPECTED_COLUMNS)

        for idx, row in df.iterrows():
            row_num = idx + 2
            ci = self.validate_ci(row["CI"], row_num)
            
            try:
                estudiante = Estudiante.objects.get(ci=ci)
            except Estudiante.DoesNotExist:
                self.errors.append(f"Fila {row_num}: Estudiante con CI '{ci}' no existe.")
                continue

            try:
                carrera = Carrera.objects.get(codigo=row["Código_Carrera"].strip())
            except Carrera.DoesNotExist:
                self.errors.append(f"Fila {row_num}: Carrera '{row['Código_Carrera']}' no existe.")
                continue

            indice = self.validate_decimal(row["Índice_Otorgamiento"], 0.0, 100.0, "Índice_Otorgamiento", row_num)

            if self.errors: continue

            Otorgamiento.objects.update_or_create(
                proceso=self.proceso,
                estudiante=estudiante,
                defaults={
                    "carrera": carrera,
                    "indice_otorgamiento": indice
                }
            )

        if self.errors:
            raise ValidationError(self.errors)


# ==========================================
# 10.6 IMPORTADOR: ÍNDICES DE CORTE
# ==========================================
class CorteCarreraImporter(ExcelImporterBase):
    EXPECTED_COLUMNS = ["Código_Carrera", "Nombre_Carrera", "Índice_Corte"]

    @transaction.atomic
    def import_data(self):
        df = self.load_dataframe(self.EXPECTED_COLUMNS)

        for idx, row in df.iterrows():
            row_num = idx + 2
            
            try:
                carrera = Carrera.objects.get(codigo=row["Código_Carrera"].strip())
            except Carrera.DoesNotExist:
                self.errors.append(f"Fila {row_num}: Carrera '{row['Código_Carrera']}' no existe.")
                continue

            # Dependiendo de tu modelo, 'indice_corte' puede ser Decimal o PositiveIntegerField multiplicada por 100.
            # Aquí lo asumo entero o decimal escalado según tu modelo actual: PositiveIntegerField
            try:
                idx_corte = float(row["Índice_Corte"])
                if not (0.0 <= idx_corte <= 100.0): raise ValueError
            except ValueError:
                self.errors.append(f"Fila {row_num}: Índice_Corte debe ser un número entre 0 y 100.")
                continue

            if self.errors: continue

            CorteCarrera.objects.update_or_create(
                proceso=self.proceso,
                carrera=carrera,
                defaults={"indice_corte": int(idx_corte * 100)} # Guardado escalado si es entero, ajusta según necesidad
            )

        if self.errors:
            raise ValidationError(self.errors)