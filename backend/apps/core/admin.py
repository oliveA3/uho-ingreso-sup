from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as DjangoUserAdmin

from .models import Rol, RolPermiso, Usuario


@admin.register(Rol)
class RolAdmin(admin.ModelAdmin):
    list_display = ("nombre", "nivel")
    search_fields = ("nombre",)


@admin.register(RolPermiso)
class RolPermisoAdmin(admin.ModelAdmin):
    list_display = ("rol", "permiso", "alcance")
    search_fields = ("permiso", "alcance")


@admin.register(Usuario)
class UsuarioAdmin(DjangoUserAdmin):
    fieldsets = (
        (None, {"fields": ("username", "password")}),
        ("Información personal", {"fields": ("email",)}),
        ("Rol y estado", {"fields": ("rol", "activo", "email_verificado")}),
        ("Permisos", {"fields": ("is_active", "is_staff", "is_superuser", "groups", "user_permissions")}),
        ("Fechas importantes", {"fields": ("last_login", "date_joined")}),
    )
    list_display = ("username", "email", "rol", "activo", "email_verificado", "is_staff")
    search_fields = ("username", "email")
