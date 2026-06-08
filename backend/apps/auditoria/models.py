from django.conf import settings
from django.db import models


class LogAuditoria(models.Model):
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="audit_actions",
    )
    target_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="audit_targets",
        null=True,
        blank=True,
    )
    action = models.CharField(max_length=128)
    detail = models.TextField(blank=True)
    module = models.CharField(max_length=128, blank=True)
    entity = models.CharField(max_length=128, blank=True)
    entity_id = models.CharField(max_length=128, blank=True)
    previous_data = models.JSONField(default=dict, blank=True)
    new_data = models.JSONField(default=dict, blank=True)
    ip = models.GenericIPAddressField(blank=True, null=True)
    user_agent = models.CharField(max_length=256, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Log de Auditoría"
        verbose_name_plural = "Logs de Auditoría"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.created_at.isoformat()} - {self.action} -> {self.target_user or self.actor}"
