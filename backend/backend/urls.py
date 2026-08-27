from django.contrib import admin
from django.urls import include, path
from django.http import HttpResponse

def home(request):
    return HttpResponse("🚀 Backend IngresoSUP está corriendo")

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", include("apps.core.urls")),
    path("api/core/", include("apps.core.urls")),
    path("api/authentication/", include("apps.authentication.urls")),
    path("api/superadmin/", include("apps.superadmin.urls")),
    path("api/gestion-provincial/", include("apps.gestion_provincial.urls")),
    path("api/gestion-municipal/", include("apps.gestion_municipal.urls")),
    path("api/gestion-escuela/", include("apps.gestion_escuela.urls")),
    path("api/gestion-personal/", include("apps.gestion_personal.urls")),
    path("api/import-export/", include("apps.import_export.urls")),
    path("", home),
]
