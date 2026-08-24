from django.db.models import Count
from rest_framework import serializers, viewsets
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.authentication.models import Usuario
from apps.superadmin.models import Carrera, Ces, Escuela, Municipio, Provincia

from .permissions import IsProvincialRepresentative
from .serializers import (
    ProvincialEscuelaSerializer,
    ProvincialMunicipioSerializer,
    ProvincialProvinciaSerializer,
    ProvincialUserSerializer,
    ProvincialCarreraSerializer,
    ProvincialCesSerializer,
)
from .permissions import IsCareerManager


class ProvincialScopedMixin:
    permission_classes = [IsProvincialRepresentative]

    def province_queryset(self, queryset):
        province_id = getattr(self.request.user, "provincia_id", None)
        if self.request.user.is_superuser or self.request.user.rol == "superadmin":
            return queryset
        if queryset.model is Escuela:
            return queryset.filter(municipio__provincia_id=province_id)
        return queryset.filter(provincia_id=province_id)


class ProvincialDashboardView(APIView):
    permission_classes = [IsProvincialRepresentative]

    def get(self, request):
        municipalities = MunicipalityQuery(request).all()
        province_id = getattr(request.user, "provincia_id", None)
        if request.user.is_superuser or request.user.rol == "superadmin":
            schools = Escuela.objects.all()
            representatives = Usuario.objects.filter(rol="ingreso_municipal")
            users = Usuario.objects.exclude(rol="estudiante")
        else:
            schools = Escuela.objects.filter(municipio__provincia_id=province_id)
            representatives = Usuario.objects.filter(rol="ingreso_municipal", municipio__provincia_id=province_id)
            users = Usuario.objects.filter(provincia_id=province_id).exclude(rol="estudiante")
        return Response({
            "municipios": municipalities.count(),
            "municipios_activos": municipalities.filter(activo=True).count(),
            "escuelas": schools.count(),
            "escuelas_activas": schools.filter(activa=True).count(),
            "representantes_municipales": representatives.count(),
            "representantes_activos": representatives.filter(is_active=True).count(),
            "usuarios_creados": users.count(),
            "municipios_lista": ProvincialMunicipioSerializer(municipalities, many=True).data,
        })


def MunicipalityQuery(request):
    province_id = getattr(request.user, "provincia_id", None)
    queryset = Municipio.objects.annotate(escuelas_count=Count("escuelas")).order_by("nombre")
    requested_province = request.query_params.get("provincia")
    if not (request.user.is_superuser or request.user.rol == "superadmin"):
        queryset = queryset.filter(provincia_id=province_id)
    elif requested_province:
        queryset = queryset.filter(provincia_id=requested_province)
    return queryset


class ProvincialMunicipioViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = ProvincialMunicipioSerializer
    permission_classes = [IsProvincialRepresentative]

    def get_queryset(self):
        return MunicipalityQuery(self.request)


class ProvincialProvinciaViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = ProvincialProvinciaSerializer
    permission_classes = [IsCareerManager]

    def get_queryset(self):
        queryset = Provincia.objects.filter(activa=True).order_by("nombre")
        if not (self.request.user.is_superuser or self.request.user.rol == "superadmin"):
            queryset = queryset.filter(id=self.request.user.provincia_id)
        return queryset


class ProvincialCesViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = ProvincialCesSerializer
    permission_classes = [IsCareerManager]

    def get_queryset(self):
        return Ces.objects.filter(activa=True).order_by("nombre")

class ProvincialEscuelaViewSet(ProvincialScopedMixin, viewsets.ModelViewSet):
    serializer_class = ProvincialEscuelaSerializer

    def get_queryset(self):
        return self.province_queryset(Escuela.objects.select_related("municipio").order_by("nombre"))

    def perform_create(self, serializer):
        municipio = serializer.validated_data["municipio"]
        if not self.request.user.is_superuser and municipio.provincia_id != self.request.user.provincia_id:
            raise serializers.ValidationError("El municipio no pertenece a tu provincia.")
        serializer.save()


class ProvincialUserViewSet(ProvincialScopedMixin, viewsets.ModelViewSet):
    serializer_class = ProvincialUserSerializer

    def get_queryset(self):
        queryset = Usuario.objects.select_related("provincia", "municipio").filter(
            rol="ingreso_municipal"
        ).order_by("last_name", "first_name", "username")
        return self.province_queryset(queryset)

    def perform_create(self, serializer):
        municipality = serializer.validated_data["municipio"]
        province_id = getattr(self.request.user, "provincia_id", None)
        if not (self.request.user.is_superuser or self.request.user.rol == "superadmin") and municipality.provincia_id != province_id:
            raise serializers.ValidationError("El municipio no pertenece a tu provincia.")
        serializer.save(rol="ingreso_municipal", provincia=municipality.provincia)


class ProvincialCarreraViewSet(viewsets.ModelViewSet):
    serializer_class = ProvincialCarreraSerializer
    permission_classes = [IsCareerManager]

    def get_queryset(self):
        queryset = Carrera.objects.select_related("ces", "provincia").order_by("nombre")
        search = self.request.query_params.get("search")
        if search:
            queryset = queryset.filter(nombre__icontains=search)
        return queryset
