# Documentación de IngresoSUP

Documentación operativa:

- [Instalación y operación local](SETUP.md)
- [Despliegue y operación en producción](DEPLOYMENT.md)
- [Carga inicial de territorios y catálogos](SEED_INITIAL_DATA.md)
- [API REST y OpenAPI](API.md)
- [Revisión de seguridad](SECURITY.md)
- [Diagrama entidad-relación](DIAGRAMA_ER.md)

## Orden recomendado

1. Instalar Python, crear el entorno virtual e instalar `backend/requirements-dev.txt` para desarrollo.
2. Ejecutar las migraciones de Django.
3. Ejecutar `test_data/seed_initial_data.py` para cargar territorios y catálogos (no crea usuarios por defecto).
4. Levantar el backend y comprobar `/api/v1/health/`.
5. Levantar el frontend.

Para un despliegue real, consulta [DEPLOYMENT.md](DEPLOYMENT.md) y completa [SECURITY.md](SECURITY.md).

La semilla de catálogos es idempotente y no borra datos. Las cuentas demo son optativas, requieren una contraseña explícita y no deben crearse en producción.
