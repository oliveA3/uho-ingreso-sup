from django.contrib import admin
from django.http import HttpResponse
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

def home(request):
    return HttpResponse("🚀 Backend IngresoSUP está corriendo")

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/v1/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/v1/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
    path("api/v1/", include("apps.core.urls")),
    path("api/v1/authentication/", include("apps.authentication.urls")),
    path("api/v1/superadmin/", include("apps.superadmin.urls")),
    path("api/v1/gestion-provincial/", include("apps.gestion_provincial.urls")),
    path("api/v1/gestion-municipal/", include("apps.gestion_municipal.urls")),
    path("api/v1/gestion-escuela/", include("apps.gestion_escuela.urls")),
    path("api/v1/gestion-personal/", include("apps.gestion_personal.urls")),
    path("api/v1/import-export/", include("apps.import_export.urls")),
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
