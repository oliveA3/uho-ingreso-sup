from django.http import JsonResponse
from django.views import View


class AuditoriaHealthCheckView(View):
    def get(self, request):
        return JsonResponse({"status": "ok", "app": "auditoria"})
