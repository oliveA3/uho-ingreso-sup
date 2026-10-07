from pathlib import Path
from urllib.parse import urlsplit

from django.core.files.base import ContentFile
from django.urls import reverse
from django.utils import timezone
from rest_framework import serializers

from apps.authentication.models import ROLES, Usuario
from .models import Noticia, validate_news_upload
from .services.noticias import fetch_open_graph_image


MEDIA_TYPES = {
    ".jpg": "imagen", ".jpeg": "imagen", ".png": "imagen", ".webp": "imagen", ".gif": "imagen",
    ".mp4": "video", ".webm": "video", ".ogg": "video",
    ".pdf": "documento", ".doc": "documento", ".docx": "documento", ".xls": "documento", ".xlsx": "documento",
}


def file_url(file_field):
    return file_field.url if file_field and file_field.name else None


def news_download_url(context, obj, file_type, inline=False):
    request = context.get("request")
    url = reverse("noticia-multimedia-download", kwargs={"pk": obj.pk})
    query = []
    if file_type == "portada":
        query.append("tipo=portada")
    if inline:
        query.append("inline=1")
    if query:
        url = f"{url}?{'&'.join(query)}"
    return request.build_absolute_uri(url) if request else url


class NoticiaSerializer(serializers.ModelSerializer):
    provincia_nombre = serializers.CharField(source="provincia.nombre", read_only=True)
    multimedia = serializers.FileField(
        write_only=True,
        required=False,
        allow_empty_file=False,
        validators=[validate_news_upload],
    )
    multimedia_url = serializers.SerializerMethodField()
    multimedia_download_url = serializers.SerializerMethodField()
    imagen_portada_url = serializers.SerializerMethodField()
    imagen_portada_download_url = serializers.SerializerMethodField()
    multimedia_tipo = serializers.SerializerMethodField()
    multimedia_nombre = serializers.SerializerMethodField()
    quitar_multimedia = serializers.BooleanField(write_only=True, required=False)

    class Meta:
        model = Noticia
        fields = [
            "id", "provincia", "provincia_nombre", "titulo", "contenido", "multimedia",
            "multimedia_url", "multimedia_download_url", "multimedia_nombre", "multimedia_tipo",
            "imagen_portada_url", "imagen_portada_download_url",
            "fecha_expiracion", "permanente", "url_externa", "creada_en", "actualizada_en",
            "quitar_multimedia",
        ]
        read_only_fields = ["id", "provincia", "provincia_nombre", "multimedia_url", "multimedia_download_url", "multimedia_nombre", "multimedia_tipo", "imagen_portada_url", "imagen_portada_download_url", "creada_en", "actualizada_en"]

    def get_multimedia_url(self, obj) -> str | None:
        if Path(obj.multimedia.name).suffix.lower() in {
            ".jpg", ".jpeg", ".png", ".webp", ".gif", ".mp4", ".webm", ".ogg",
        }:
            return news_download_url(self.context, obj, "multimedia", inline=True)
        return self._absolute_file_url(obj.multimedia)

    def get_multimedia_download_url(self, obj) -> str | None:
        return self._download_url(obj, "multimedia") if obj.multimedia.name else None

    def get_imagen_portada_url(self, obj) -> str | None:
        return news_download_url(self.context, obj, "portada", inline=True) if obj.imagen_portada.name else None

    def get_imagen_portada_download_url(self, obj) -> str | None:
        return self._download_url(obj, "portada") if obj.imagen_portada.name else None

    def _absolute_file_url(self, file_field):
        url = file_url(file_field)
        request = self.context.get("request")
        return request.build_absolute_uri(url) if url and request else url

    def _download_url(self, obj, file_type):
        return news_download_url(self.context, obj, file_type)

    def get_multimedia_tipo(self, obj) -> str | None:
        return MEDIA_TYPES.get(Path(obj.multimedia.name).suffix.lower()) if obj.multimedia.name else None

    def get_multimedia_nombre(self, obj) -> str | None:
        return Path(obj.multimedia.name).name if obj.multimedia.name else None

    def validate_url_externa(self, value):
        if value:
            try:
                parsed = urlsplit(value)
            except ValueError as error:
                raise serializers.ValidationError("La URL no es válida.") from error
            if parsed.scheme.lower() not in {"http", "https"} or parsed.username or parsed.password:
                raise serializers.ValidationError("La URL debe usar HTTP o HTTPS y no incluir credenciales.")
        return value

    def validate(self, attrs):
        permanent = attrs.get("permanente", getattr(self.instance, "permanente", False))
        expiry = attrs.get("fecha_expiracion", getattr(self.instance, "fecha_expiracion", None))
        if permanent:
            attrs["fecha_expiracion"] = None
        elif not expiry:
            raise serializers.ValidationError({"fecha_expiracion": "Indica una fecha de expiración o marca la noticia como permanente."})
        elif expiry < timezone.localdate():
            raise serializers.ValidationError({"fecha_expiracion": "La fecha de expiración no puede estar en el pasado."})
        return attrs

    def create(self, validated_data):
        validated_data.pop("quitar_multimedia", None)
        noticia = super().create(validated_data)
        if noticia.url_externa and not self._has_image_attachment(noticia):
            self._refresh_external_cover(noticia)
        return noticia

    def update(self, instance, validated_data):
        remove_media = validated_data.pop("quitar_multimedia", False)
        uploaded_media = validated_data.get("multimedia")
        if remove_media:
            validated_data["multimedia"] = ""
        external_url_changed = "url_externa" in validated_data and validated_data["url_externa"] != instance.url_externa
        old_media_name = instance.multimedia.name
        old_cover_name = instance.imagen_portada.name
        noticia = super().update(instance, validated_data)

        if old_media_name and (remove_media or uploaded_media) and old_media_name != noticia.multimedia.name:
            noticia._meta.get_field("multimedia").storage.delete(old_media_name)
        refresh_cover = bool(remove_media or uploaded_media or external_url_changed)
        if refresh_cover:
            if old_cover_name:
                noticia._meta.get_field("imagen_portada").storage.delete(old_cover_name)
            noticia.imagen_portada = ""
            noticia.save(update_fields=["imagen_portada"])
            if noticia.url_externa and not self._has_image_attachment(noticia):
                self._refresh_external_cover(noticia)
        return noticia

    @staticmethod
    def _has_image_attachment(noticia):
        return Path(noticia.multimedia.name).suffix.lower() in {".jpg", ".jpeg", ".png", ".webp", ".gif"}

    @staticmethod
    def _refresh_external_cover(noticia):
        preview = fetch_open_graph_image(noticia.url_externa)
        if not preview:
            return
        content, extension = preview
        noticia.imagen_portada.save(
            f"noticia-{noticia.pk}{extension}", ContentFile(content), save=True
        )


class LandingNoticiaSerializer(serializers.ModelSerializer):
    title = serializers.CharField(source="titulo")
    description = serializers.CharField(source="contenido")
    date = serializers.DateTimeField(source="creada_en", format="%Y-%m-%d")
    media_type = serializers.SerializerMethodField()
    media_url = serializers.SerializerMethodField()
    cover_url = serializers.SerializerMethodField()
    media_name = serializers.SerializerMethodField()
    media_download_url = serializers.SerializerMethodField()
    cover_download_url = serializers.SerializerMethodField()
    external_url = serializers.URLField(source="url_externa", allow_blank=True)

    class Meta:
        model = Noticia
        fields = ["id", "title", "description", "date", "media_type", "media_url", "cover_url", "media_name", "media_download_url", "cover_download_url", "external_url"]

    def get_media_type(self, obj) -> str | None:
        extension = Path(obj.multimedia.name).suffix.lower() if obj.multimedia.name else ""
        if extension in {".mp4", ".webm", ".ogg"}:
            return "video"
        if extension in {".jpg", ".jpeg", ".png", ".webp", ".gif"} or obj.imagen_portada.name:
            return "imagen"
        return MEDIA_TYPES.get(extension)

    def get_media_url(self, obj) -> str | None:
        extension = Path(obj.multimedia.name).suffix.lower() if obj.multimedia.name else ""
        if extension in {
            ".jpg", ".jpeg", ".png", ".webp", ".gif", ".mp4", ".webm", ".ogg",
        }:
            return news_download_url(self.context, obj, "multimedia", inline=True)
        if obj.multimedia.name:
            url = file_url(obj.multimedia)
        elif obj.imagen_portada.name:
            return news_download_url(self.context, obj, "portada", inline=True)
        else:
            return None
        request = self.context.get("request")
        return request.build_absolute_uri(url) if url and request else url

    def get_cover_url(self, obj) -> str | None:
        return news_download_url(self.context, obj, "portada", inline=True) if obj.imagen_portada.name else None

    def get_media_name(self, obj) -> str | None:
        if obj.multimedia.name:
            return Path(obj.multimedia.name).name
        return None

    def get_media_download_url(self, obj) -> str | None:
        return self._download_url(obj, "multimedia") if obj.multimedia.name else None

    def get_cover_download_url(self, obj) -> str | None:
        return self._download_url(obj, "portada") if obj.imagen_portada.name else None

    def _download_url(self, obj, file_type):
        return news_download_url(self.context, obj, file_type)


class NewsManagerSerializer(serializers.ModelSerializer):
    rol_label = serializers.SerializerMethodField()
    provincia_nombre = serializers.CharField(source="provincia.nombre", read_only=True)
    password = serializers.CharField(write_only=True, required=False, min_length=8)

    class Meta:
        model = Usuario
        fields = [
            "id", "username", "email", "first_name", "last_name", "rol", "rol_label",
            "provincia", "provincia_nombre", "is_active", "password",
        ]
        read_only_fields = ["rol", "provincia", "provincia_nombre"]

    def get_rol_label(self, obj) -> str:
        return dict(ROLES).get(obj.rol, obj.rol)

    def create(self, validated_data):
        password = validated_data.pop("password", None)
        user = Usuario(**validated_data)
        user.set_password(password or Usuario.objects.make_random_password())
        user.debe_cambiar_password = True
        user.save()
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop("password", None)
        for field, value in validated_data.items():
            setattr(instance, field, value)
        if password:
            instance.set_password(password)
            instance.debe_cambiar_password = True
        instance.save()
        return instance

