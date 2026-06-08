from rest_framework import serializers

from .models import SuperAdminConfig


class SuperAdminConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = SuperAdminConfig
        fields = ["id", "logo_url", "primary_color", "secondary_color", "accent_color", "updated_at"]


class SuperAdminConfigUpdateSerializer(serializers.Serializer):
    logo_url = serializers.URLField(required=False, allow_blank=True)
    primary_color = serializers.CharField(required=False, max_length=32)
    secondary_color = serializers.CharField(required=False, max_length=32)
    accent_color = serializers.CharField(required=False, max_length=32)
