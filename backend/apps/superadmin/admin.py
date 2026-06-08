from django.contrib import admin

from .models import SuperAdminConfig


@admin.register(SuperAdminConfig)
class SuperAdminConfigAdmin(admin.ModelAdmin):
    list_display = ("logo_url", "primary_color", "secondary_color", "accent_color", "updated_at")
    readonly_fields = ("updated_at",)
