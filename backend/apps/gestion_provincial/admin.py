from django.contrib import admin

from .models import Etapa, Proceso


@admin.register(Proceso)
class ProcesoAdmin(admin.ModelAdmin):
	list_display = ("id", "anio", "etapa", "estado", "fecha_inicio", "fecha_fin")
	ordering = ("-anio", "-id")


@admin.register(Etapa)
class EtapaAdmin(admin.ModelAdmin):
	list_display = ("nombre",)
	ordering = ("id",)
	readonly_fields = ("nombre",)

	def has_add_permission(self, request):
		return False

	def has_delete_permission(self, request, obj=None):
		return False
