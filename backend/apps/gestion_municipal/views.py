from rest_framework import serializers, viewsets
from rest_framework.permissions import BasePermission

from apps.authentication.models import Usuario
from apps.superadmin.models import Escuela

from .serializers import MunicipalEscuelaSerializer, MunicipalUserSerializer


class IsMunicipalRepresentative(BasePermission):
	message = "Solo un representante municipal puede gestionar esta información."

	def has_permission(self, request, view):
		user = request.user
		return bool(user and user.is_authenticated and (user.is_superuser or user.rol in {"ingreso_municipal", "superadmin"}))


class MunicipalScopeMixin:
	permission_classes = [IsMunicipalRepresentative]

	def scope_queryset(self, queryset):
		municipality_id = getattr(self.request.user, "municipio_id", None)
		if self.request.user.is_superuser or self.request.user.rol == "superadmin":
			return queryset
		if queryset.model is Escuela:
			return queryset.filter(municipio_id=municipality_id)
		return queryset.filter(municipio_id=municipality_id)


class MunicipalEscuelaViewSet(MunicipalScopeMixin, viewsets.ModelViewSet):
	serializer_class = MunicipalEscuelaSerializer

	def get_queryset(self):
		return self.scope_queryset(Escuela.objects.select_related("municipio").order_by("nombre"))

	def perform_create(self, serializer):
		municipality_id = getattr(self.request.user, "municipio_id", None)
		if not municipality_id and not (self.request.user.is_superuser or self.request.user.rol == "superadmin"):
			raise serializers.ValidationError("El representante no tiene un municipio asignado.")
		serializer.save(municipio_id=municipality_id)


class MunicipalUserViewSet(MunicipalScopeMixin, viewsets.ModelViewSet):
	serializer_class = MunicipalUserSerializer

	def get_queryset(self):
		queryset = Usuario.objects.select_related("municipio", "escuela").filter(
			rol__in={"director_escuela", "secretario_escuela"}
		).order_by("last_name", "first_name", "username")
		return self.scope_queryset(queryset)

	def perform_create(self, serializer):
		school = serializer.validated_data["escuela"]
		municipality_id = getattr(self.request.user, "municipio_id", None)
		if not (self.request.user.is_superuser or self.request.user.rol == "superadmin") and school.municipio_id != municipality_id:
			raise serializers.ValidationError("La escuela debe pertenecer a tu municipio.")
		serializer.save(municipio=school.municipio, provincia=school.municipio.provincia)

# Create your views here.
