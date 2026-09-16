from pathlib import Path

from django.conf import settings
from openpyxl import load_workbook


MAX_EXCEL_UPLOAD_BYTES = int(getattr(settings, "MAX_EXCEL_UPLOAD_BYTES", 10 * 1024 * 1024))
ALLOWED_EXCEL_EXTENSIONS = {".xlsx", ".xlsm"}
ALLOWED_EXCEL_MIME_TYPES = {
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-excel.sheet.macroEnabled.12",
    "application/octet-stream",
    "",
}


def validate_excel_upload(upload):
    if not upload:
        return "Debe adjuntar un archivo Excel."
    if upload.size > MAX_EXCEL_UPLOAD_BYTES:
        return "El archivo no puede superar los 10 MB."
    if Path(upload.name).suffix.lower() not in ALLOWED_EXCEL_EXTENSIONS:
        return "Solo se permiten archivos Excel .xlsx o .xlsm."
    if (upload.content_type or "").lower() not in ALLOWED_EXCEL_MIME_TYPES:
        return "El tipo MIME del archivo no es un Excel permitido."
    try:
        upload.seek(0)
        workbook = load_workbook(filename=upload, read_only=True, data_only=True, keep_vba=Path(upload.name).suffix.lower() == ".xlsm")
        if not workbook.sheetnames:
            return "El archivo Excel no contiene hojas."
        workbook.close()
        upload.seek(0)
    except Exception:
        upload.seek(0)
        return "El archivo no es un Excel válido o está dañado."
    return None
