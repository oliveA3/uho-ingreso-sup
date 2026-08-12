from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as DjangoUserAdmin

from apps.authentication.models import RolPermiso, Usuario


@admin.register(RolPermiso)
class RolPermisoAdmin(admin.ModelAdmin):
    list_display = ("rol", "permiso", "alcance")
    search_fields = ("permiso", "alcance")
