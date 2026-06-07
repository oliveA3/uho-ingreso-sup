from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as DjangoUserAdmin

from .models import (
    AsignaturaExamen,
    AuditLog,
    Carrera,
    Ces,
    Escuela,
    Municipio,
    OtorgamientoTipo,
    Province,
    Role,
    User,
)


@admin.register(Role)
class RoleAdmin(admin.ModelAdmin):
    list_display = ("name", "level", "description", "permissions")
    search_fields = ("name", "description")


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ("action", "target_user", "actor", "timestamp")
    list_filter = ("action", "timestamp")
    search_fields = ("target_user__username", "actor__username", "detail")


@admin.register(User)
class UserAdmin(DjangoUserAdmin):
    fieldsets = (
        (None, {"fields": ("username", "password")}),
        ("Información personal", {"fields": ("ci", "nombre", "apellidos", "email", "telefono")}),
        ("Relaciones", {"fields": ("rol", "municipio", "escuela")}),
        ("Permisos", {"fields": ("is_active", "is_staff", "is_superuser", "groups", "user_permissions")}),
        ("Fechas importantes", {"fields": ("last_login", "date_joined")}),
    )
    list_display = ("username", "ci", "nombre", "apellidos", "rol", "municipio", "escuela", "is_staff")
    search_fields = ("username", "ci", "nombre", "apellidos", "email")


@admin.register(Province)
class ProvinceAdmin(admin.ModelAdmin):
    list_display = ("name",)


@admin.register(Municipio)
class MunicipioAdmin(admin.ModelAdmin):
    list_display = ("name", "province")
    list_filter = ("province",)


@admin.register(Ces)
class CesAdmin(admin.ModelAdmin):
    list_display = ("name",)


@admin.register(Escuela)
class EscuelaAdmin(admin.ModelAdmin):
    list_display = ("name", "municipio", "director", "secretario")
    list_filter = ("municipio",)


@admin.register(Carrera)
class CarreraAdmin(admin.ModelAdmin):
    list_display = ("name", "ces")
    list_filter = ("ces",)


admin.site.register(OtorgamientoTipo)
admin.site.register(AsignaturaExamen)
