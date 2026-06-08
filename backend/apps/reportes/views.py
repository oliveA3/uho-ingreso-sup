from django.http import JsonResponse
from django.views import View


class ReportesHealthCheckView(View):
    def get(self, request):
        return JsonResponse({"status": "ok", "app": "reportes"})
