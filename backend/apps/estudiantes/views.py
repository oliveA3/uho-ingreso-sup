from django.http import JsonResponse
from django.views import View


class EstudiantesHealthCheckView(View):
    def get(self, request):
        return JsonResponse({"status": "ok", "app": "estudiantes"})
