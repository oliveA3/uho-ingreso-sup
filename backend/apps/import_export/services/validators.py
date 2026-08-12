def validate_color_hex(data):
    errors = []
    for field in ["color_primario", "color_secundario", "color_acento", "color_fondo", "color_exito", "color_error"]:
        val = data.get(field)
        if val:
            if not isinstance(val, str) or not val.startswith("#") or len(val) not in (4, 7):
                errors.append(f"{field} no es un hex válido: {val}")
    return errors

def validate_plan_plaza(data):
    errs = []
    if data.get("cantidad_plazas") is None:
        errs.append("cantidad_plazas es requerido")
    else:
        try:
            int(data["cantidad_plazas"])
        except Exception:
            errs.append("cantidad_plazas debe ser entero")
    # agregar más validaciones si hace falta
    return errs
