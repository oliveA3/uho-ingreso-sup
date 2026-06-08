from django.http import JsonResponse
from django.views import View


class CarrerasHealthCheckView(View):
    def get(self, request):
        return JsonResponse({"status": "ok", "app": "carreras"})
