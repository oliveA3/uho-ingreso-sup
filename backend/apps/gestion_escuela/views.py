from django.shortcuts import render
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.authentication.models import Estudiante
from .permissions import CanViewStudentsWithoutAccount
from .serializers import StudentsWithoutAccountSerializer


class StudentsWithoutAccountView(APIView):
	permission_classes = [CanViewStudentsWithoutAccount]

	def get(self, request):
		students = Estudiante.objects.filter(
			escuela_id=request.user.escuela_id,
			usuario__isnull=True,
		).order_by("apellidos", "nombre")
		return Response({"students": StudentsWithoutAccountSerializer(students, many=True).data})
