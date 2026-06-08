from django.http import JsonResponse
from django.views import View


class ProcesoHealthCheckView(View):
    def get(self, request):
        return JsonResponse({"status": "ok", "app": "proceso"})
