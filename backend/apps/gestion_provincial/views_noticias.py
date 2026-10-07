from django.db.models import Q
from django.http import FileResponse, Http404
from django.utils.text import get_valid_filename
from django.utils import timezone
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import OpenApiResponse, extend_schema, inline_serializer
from rest_framework import parsers, viewsets
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import serializers
from rest_framework.views import APIView

from apps.authentication.models import Usuario
from apps.superadmin.models import Provincia
from .models import Noticia
from .permissions import IsCommissionChief, IsNewsManager
from .serializers_noticias import LandingNoticiaSerializer, NewsManagerSerializer, NoticiaSerializer


def _news_landing_province(request):
    user = request.user
    if user.is_authenticated and user.provincia_id:
        province = Provincia.objects.filter(pk=user.provincia_id).first()
        if province:
            return province
    return Provincia.objects.filter(nombre__iexact="Holguín").order_by("id").first()


class ProvincialNoticiaViewSet(viewsets.ModelViewSet):
    serializer_class = NoticiaSerializer
    permission_classes = [IsNewsManager]
    parser_classes = [parsers.JSONParser, parsers.FormParser, parsers.MultiPartParser]

    def get_queryset(self):
        return Noticia.objects.filter(provincia_id=self.request.user.provincia_id).select_related("provincia")

    def perform_create(self, serializer):
        serializer.save(provincia_id=self.request.user.provincia_id)

    def perform_destroy(self, instance):
        instance.delete()


class ProvincialNewsManagerViewSet(viewsets.ModelViewSet):
    """CRUD de usuarios con rol `gestor_noticias`, acotado a la provincia del jefe de comisión
    autenticado (o de un superadmin, que ve todos)."""

    serializer_class = NewsManagerSerializer
    permission_classes = [IsCommissionChief]

    def get_queryset(self):
        queryset = Usuario.objects.filter(rol="gestor_noticias").select_related("provincia").order_by(
            "last_name", "first_name", "username"
        )
        user = self.request.user
        if user.is_superuser or user.rol == "superadmin":
            return queryset
        return queryset.filter(provincia_id=user.provincia_id)

    def perform_create(self, serializer):
        serializer.save(rol="gestor_noticias", provincia_id=self.request.user.provincia_id)

    def perform_destroy(self, instance):
        instance.delete()


class PublicNoticiasLandingView(APIView):
    permission_classes = [AllowAny]

    @extend_schema(
        responses=inline_serializer(
            name="PublicNoticiasLandingResponse",
            fields={
                "provincia_id": serializers.IntegerField(allow_null=True),
                "provincia_nombre": serializers.CharField(),
                "items": LandingNoticiaSerializer(many=True),
            },
        ),
    )
    def get(self, request):
        province = _news_landing_province(request)

        items = Noticia.objects.none()
        if province:
            items = Noticia.objects.filter(provincia=province).filter(
                Q(permanente=True) | Q(fecha_expiracion__gte=timezone.localdate())
            )

        return Response({
            "provincia_id": province.id if province else None,
            "provincia_nombre": province.nombre if province else "Holguín",
            "items": LandingNoticiaSerializer(
                items, many=True, context={"request": request}
            ).data,
        })


class PublicNoticiaDownloadView(APIView):
    permission_classes = [AllowAny]

    @extend_schema(
        responses={
            200: OpenApiResponse(response=OpenApiTypes.BINARY, description="Archivo multimedia descargable."),
            404: OpenApiResponse(description="La noticia o el archivo no está disponible."),
        },
    )
    def get(self, request, pk):
        user = request.user
        if user.is_authenticated and user.rol in {"gestor_noticias", "jefe_comision"} and user.provincia_id:
            news_query = Noticia.objects.filter(pk=pk, provincia_id=user.provincia_id)
        else:
            province = _news_landing_province(request)
            if not province:
                raise Http404
            news_query = Noticia.objects.filter(pk=pk, provincia=province).filter(
                Q(permanente=True) | Q(fecha_expiracion__gte=timezone.localdate())
            )
        noticia = news_query.first()
        if not noticia:
            raise Http404

        is_cover = request.query_params.get("tipo") == "portada"
        field_name = "imagen_portada" if is_cover else "multimedia"
        file_field = getattr(noticia, field_name)
        if not file_field.name:
            raise Http404
        extension = file_field.name.rsplit(".", 1)[-1].lower()
        inline = request.query_params.get("inline") == "1"
        inline_types = {
            "jpg": "image/jpeg", "jpeg": "image/jpeg", "png": "image/png",
            "webp": "image/webp", "gif": "image/gif",
            "mp4": "video/mp4", "webm": "video/webm", "ogg": "video/ogg",
        }
        if inline and extension not in inline_types:
            raise Http404
        file_field.open("rb")
        response = FileResponse(
            file_field,
            as_attachment=not inline,
            filename=get_valid_filename(file_field.name.rsplit("/", 1)[-1]),
            content_type=inline_types.get(extension, "application/octet-stream"),
        )
        response["X-Content-Type-Options"] = "nosniff"
        if inline:
            response["Content-Security-Policy"] = "default-src 'none'; sandbox"
        return response
