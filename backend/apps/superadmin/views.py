from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.db.models import Count

from apps.nomencladores.models import Provincia, Municipio
from apps.escuelas.models import Escuela
from apps.estudiantes.models import Estudiante
from .permissions import IsSuperAdmin


class SuperAdminDashboard(APIView):
    permission_classes = [IsSuperAdmin]

    def get(self, request):
        data = {
            "provincias_activas": Provincia.objects.filter(activa=True).count(),
            "municipios": Municipio.objects.count(),
            "escuelas": Escuela.objects.count(),
            "estudiantes": Estudiante.objects.count(),
        }
        return Response(data, status=status.HTTP_200_OK)
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.authentication.models import Rol
from apps.carreras.models import Carrera
from apps.escuelas.models import Escuela
from apps.estudiantes.models import Estudiante
from apps.nomencladores.models import Municipio, Provincia

from apps.core.permissions import IsSuperAdmin
from .models import SuperAdminConfig
from .serializers import SuperAdminConfigSerializer, SuperAdminConfigUpdateSerializer


class SuperAdminDashboardMetricsView(APIView):
    permission_classes = [IsSuperAdmin]

    def get(self, request):
        active_provincias = Provincia.objects.filter(activa=True).count()
        municipios = Municipio.objects.count()
        escuelas = Escuela.objects.count()
        estudiantes = Estudiante.objects.count()
        carreras = Carrera.objects.count()
        roles = Rol.objects.count()

        return Response(
            {
                "active_provincias": active_provincias,
                "municipios": municipios,
                "escuelas": escuelas,
                "estudiantes": estudiantes,
                "carreras": carreras,
                "roles": roles,
            },
            status=status.HTTP_200_OK,
        )


class SuperAdminConfigView(APIView):
    permission_classes = [IsSuperAdmin]

    def get_config(self):
        config, _ = SuperAdminConfig.objects.get_or_create(id=1)
        return config

    def get(self, request):
        config = self.get_config()
        serializer = SuperAdminConfigSerializer(config)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def put(self, request):
        config = self.get_config()
        serializer = SuperAdminConfigUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        for field, value in serializer.validated_data.items():
            setattr(config, field, value)
        config.save()
        return Response(SuperAdminConfigSerializer(config).data, status=status.HTTP_200_OK)

    def patch(self, request):
        return self.put(request)
