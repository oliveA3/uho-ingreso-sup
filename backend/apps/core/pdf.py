import html
import logging

from django.utils import timezone

from apps.superadmin.models import IdentidadVisual

logger = logging.getLogger(__name__)

_FALLBACK_WARNED = False


def build_report_html(title, lines, header_lines=None):
    """HTML del reporte con la identidad visual (nombre, logo y colores) guardada en la BD."""
    branding = IdentidadVisual.objects.order_by("-id").first()
    system_name = branding.nombre_sistema if branding else "IngresoSUP"
    primary = branding.color_primario if branding else "#1F4E79"
    accent = branding.color_acento if branding else "#5BA3D9"
    logo = branding.logo_url if branding and branding.logo_url else ""
    generated_at = timezone.localtime(timezone.now()).strftime("%d/%m/%Y %H:%M")

    meta = [f"Fecha de generación: {generated_at}", *(header_lines or [])]
    body = "".join(
        f"<p>{html.escape(str(line))}</p>" if str(line).strip() else "<p class='gap'>&nbsp;</p>"
        for line in lines
    )
    logo_tag = f"<img class='logo' src='{html.escape(logo, quote=True)}' alt=''>" if logo else ""
    meta_html = "".join(f"<div>{html.escape(item)}</div>" for item in meta)
    return f"""<!DOCTYPE html>
<html lang="es"><head><meta charset="utf-8"><style>
@page {{ size: A4; margin: 2cm 1.8cm; @bottom-right {{ content: "Página " counter(page) " de " counter(pages); font-size: 9pt; color: #64748b; }} }}
body {{ font-family: sans-serif; font-size: 10pt; color: #0f172a; }}
header {{ border-bottom: 3px solid {html.escape(accent)}; padding-bottom: 8px; margin-bottom: 14px; display: flex; gap: 14px; align-items: center; }}
.logo {{ height: 48px; }}
h1 {{ color: {html.escape(primary)}; font-size: 15pt; margin: 0 0 4px; }}
.meta {{ font-size: 9pt; color: #475569; }}
h2 {{ color: {html.escape(primary)}; font-size: 13pt; margin: 0 0 10px; }}
p {{ margin: 0 0 4px; }} .gap {{ margin: 0 0 8px; }}
</style></head><body>
<header>{logo_tag}<div><h1>{html.escape(system_name)}</h1><div class="meta">{meta_html}</div></div></header>
<h2>{html.escape(title)}</h2>
{body}
</body></html>"""


def _legacy_pdf(text_lines):
    """PDF de una página con texto plano; solo se usa si WeasyPrint no puede cargar sus librerías nativas."""
    def esc(value):
        return str(value or "").replace("\\", "\\\\").replace("(", "[").replace(")", "]")

    content = "BT /F1 10 Tf 40 790 Td " + " ".join(f"({esc(line)}) Tj 0 -16 Td" for line in text_lines) + " ET"
    data = content.encode("latin-1", errors="replace")
    objects = [
        b"1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj",
        b"2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj",
        b"3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 842]/Resources<</Font<</F1 4 0 R>>>>/Contents 5 0 R>>endobj",
        b"4 0 obj<</Type/Font/Subtype/Type1/BaseFont/Courier>>endobj",
        f"5 0 obj<</Length {len(data)}>>stream\n".encode("latin-1") + data + b"\nendstream endobj",
    ]
    return b"%PDF-1.4\n" + b"\n".join(objects) + b"\ntrailer<</Root 1 0 R>>\n%%EOF"


def render_pdf(title, lines, header_lines=None):
    """Genera el PDF con WeasyPrint (HTML/CSS -> PDF) usando la identidad visual del sistema."""
    global _FALLBACK_WARNED
    document = build_report_html(title, lines, header_lines)
    try:
        from weasyprint import HTML

        return HTML(string=document).write_pdf()
    except (ImportError, OSError):
        if not _FALLBACK_WARNED:
            logger.warning("WeasyPrint no está disponible (faltan librerías Pango/GTK); se usa el generador PDF básico.")
            _FALLBACK_WARNED = True
        system_name = IdentidadVisual.objects.order_by("-id").values_list("nombre_sistema", flat=True).first() or "IngresoSUP"
        generated_at = timezone.localtime(timezone.now()).strftime("%d/%m/%Y %H:%M")
        return _legacy_pdf([system_name, f"Fecha de generación: {generated_at}", *(header_lines or []), "", title, *lines])
