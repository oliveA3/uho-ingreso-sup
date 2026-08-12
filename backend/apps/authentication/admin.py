from django.contrib import admin
from .models import Usuario

@admin.register(Usuario)
class UsuarioAdmin(admin.ModelAdmin):
    fieldsets = (
        (None, {"fields": ("username", "password")}),
        ("Información personal", {"fields": ("email",)}),
        ("Rol y estado", {"fields": ("rol", "is_active", "email_verificado")}),
        ("Permisos", {"fields": ("is_staff", "is_superuser", "groups", "user_permissions")}),
        ("Fechas importantes", {"fields": ("last_login", "date_joined")}),
    )
    list_display = ("username", "email", "rol", "is_active", "email_verificado", "is_staff")
    search_fields = ("username", "email")
