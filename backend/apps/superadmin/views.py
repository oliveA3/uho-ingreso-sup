from rest_framework import filters, viewsets
from rest_framework.views import APIView
from django.http import JsonResponse

from .models import Provincia, Municipio, Escuela
from .serializers import ProvinciaSerializer, MunicipioSerializer, EscuelaSerializer


class ProvinciaViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Provincia.objects.all().order_by('nombre')
    serializer_class = ProvinciaSerializer


class MunicipioViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = MunicipioSerializer
    filter_backends = [filters.SearchFilter]

    def get_queryset(self):
        qs = Municipio.objects.all().order_by('nombre')
        provincia_id = self.request.query_params.get('provincia')
        if provincia_id:
            qs = qs.filter(provincia_id=provincia_id)

        return qs


class EscuelaViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = EscuelaSerializer

    def get_queryset(self):
        qs = Escuela.objects.all().order_by('nombre')
        municipio_id = self.request.query_params.get('municipio')
        if municipio_id:
            qs = qs.filter(municipio_id=municipio_id)

        return qs

        return qs


class IdentidadVisualConfig(APIView):
    def get(self, request):
        return JsonResponse({"config": {}}, status=200)
