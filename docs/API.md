# API REST

La API usa Django REST Framework, JWT Bearer y versionado por URL.

## URLs

- Base versionada: `/api/v1/`
- Esquema OpenAPI 3.0: `GET /api/v1/schema/`
- Swagger UI: `GET /api/v1/docs/`
- Salud del servicio: `GET /api/v1/health/`

Las rutas `/api/` se mantienen como alias de compatibilidad durante la transición. Para peticiones autenticadas:

```http
Authorization: Bearer <access>
```

El login se realiza con `POST /api/v1/authentication/login/` y el refresh con `POST /api/v1/authentication/token/refresh/`.

## Seguridad y límites

- La autenticación por defecto es JWT.
- Los endpoints públicos son excepciones explícitas para login, registro, verificación, CSRF y consultas públicas configuradas.
- La API aplica límites para clientes anónimos, usuarios autenticados, autenticación e importaciones masivas.
- Las respuestas normales son JSON; las rutas de exportación pueden devolver archivos.

La página de API del panel de Jefe de Comisión contiene el inventario funcional y enlaces al esquema vivo del backend. Si frontend y backend están separados, configura `VITE_API_ORIGIN` en el frontend.
