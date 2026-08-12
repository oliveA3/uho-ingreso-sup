from django.contrib import admin
from .models import IdentidadVisual

@admin.register(IdentidadVisual)
class IdentidadVisualAdmin(admin.ModelAdmin):
    list_display = [
        "id",
        "nombre_sistema",
        "tipografia",
        "color_primario",
        "color_secundario",
        "color_acento",
        "fecha_creado",
    ]
    readonly_fields = ["fecha_creado"]  # este sí existe en el modelo
