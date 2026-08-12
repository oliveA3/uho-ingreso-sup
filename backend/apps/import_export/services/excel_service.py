import io
from openpyxl import load_workbook, Workbook
from django.db import transaction
from django.core.exceptions import ObjectDoesNotExist, ValidationError

class ExcelImportResult:
    def __init__(self):
        self.inserted = 0
        self.updated = 0
        self.errors = []  # list of dicts: {"row": n, "errors": ["msg1", ...], "data": {...}}

class ExcelExportResult:
    def __init__(self, workbook_bytes):
        self.workbook_bytes = workbook_bytes

class ExcelService:
    def __init__(self, model, column_map, fk_resolvers=None, validator=None, update_on_conflict=None):
        """
        model: Django model class
        column_map: dict excel_col_name -> model_field_name
        fk_resolvers: dict model_field_name -> callable(value) -> model_instance or pk
        validator: callable(row_dict) -> list_of_errors (empty if ok)
        update_on_conflict: tuple(unique_field_name, fields_to_update) or None
        """
        self.model = model
        self.column_map = column_map
        self.fk_resolvers = fk_resolvers or {}
        self.validator = validator
        self.update_on_conflict = update_on_conflict

    def _row_to_obj_data(self, row_dict):
        data = {}
        errors = []
        for excel_col, model_field in self.column_map.items():
            raw = row_dict.get(excel_col, None)
            if model_field in self.fk_resolvers and raw not in (None, ""):
                try:
                    resolved = self.fk_resolvers[model_field](raw)
                    data[model_field] = resolved
                except Exception as e:
                    errors.append(f"FK resolver error for {model_field}: {e}")
            else:
                data[model_field] = raw
        return data, errors

    def import_file(self, file_obj, sheet_name=None, start_row=2):
        """
        file_obj: file-like object (UploadedFile)
        start_row: row index where data starts (1-based). Default 2 assuming header in row 1.
        """
        wb = load_workbook(filename=io.BytesIO(file_obj.read()), data_only=True)
        ws = wb[sheet_name] if sheet_name else wb.active

        headers = []
        for cell in ws[1]:
            headers.append(cell.value)

        result = ExcelImportResult()
        rows_to_create = []
        rows_meta = []  # keep original row number and data for error reporting

        for idx, row in enumerate(ws.iter_rows(min_row=start_row, values_only=True), start=start_row):
            row_dict = {headers[i]: row[i] for i in range(len(headers))}
            data, map_errors = self._row_to_obj_data(row_dict)
            val_errors = self.validator(data) if self.validator else []
            all_errors = map_errors + val_errors

            if all_errors:
                result.errors.append({"row": idx, "errors": all_errors, "data": row_dict})
                continue

            # handle update_on_conflict
            if self.update_on_conflict:
                unique_field, update_fields = self.update_on_conflict
                unique_value = data.get(unique_field)
                if unique_value is not None:
                    try:
                        with transaction.atomic():
                            obj, created = self.model.objects.update_or_create(
                                **{unique_field: unique_value},
                                defaults={k: v for k, v in data.items() if k in update_fields}
                            )
                            if created:
                                result.inserted += 1
                            else:
                                result.updated += 1
                    except Exception as e:
                        result.errors.append({"row": idx, "errors": [str(e)], "data": row_dict})
                    continue

            rows_to_create.append(self.model(**data))
            rows_meta.append((idx, row_dict))

        # bulk create in chunks
        if rows_to_create:
            try:
                with transaction.atomic():
                    self.model.objects.bulk_create(rows_to_create, ignore_conflicts=False)
                    result.inserted += len(rows_to_create)
            except Exception as e:
                # fallback: try row-by-row to capture errors
                for (idx, row_dict), obj in zip(rows_meta, rows_to_create):
                    try:
                        obj.save()
                        result.inserted += 1
                    except Exception as ex:
                        result.errors.append({"row": idx, "errors": [str(ex)], "data": row_dict})

        return result

    def export_queryset(self, queryset, field_names, header_map=None):
        """
        queryset: Django queryset
        field_names: list of model field names to export in order
        header_map: optional dict model_field -> header_name
        returns ExcelExportResult with bytes
        """
        wb = Workbook()
        ws = wb.active
        headers = [header_map.get(f, f) if header_map else f for f in field_names]
        ws.append(headers)

        for obj in queryset:
            row = []
            for f in field_names:
                val = getattr(obj, f)
                # if FK, write a readable representation
                if hasattr(val, "pk"):
                    row.append(str(val))
                else:
                    row.append(val)
            ws.append(row)

        bio = io.BytesIO()
        wb.save(bio)
        bio.seek(0)
        return ExcelExportResult(bio.read())
