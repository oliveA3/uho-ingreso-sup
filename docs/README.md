# Documentación de IngresoSUP

Documentación operativa:

- [Instalación y operación local](SETUP.md)
- [Carga inicial de territorios y usuarios](SEED_INITIAL_DATA.md)
- [API REST y OpenAPI](API.md)
- [Revisión de seguridad](../SECURITY.md)

## Orden recomendado

1. Instalar Python, crear el entorno virtual e instalar `backend/requirements.txt`.
2. Ejecutar las migraciones de Django.
3. Ejecutar `test_data/seed_initial_data.py` para cargar Cuba, municipios, escuelas y cuentas demo.
4. Levantar el backend y comprobar `/api/v1/health/`.
5. Levantar el frontend.

La semilla es idempotente y no borra datos. Está destinada a desarrollo, pruebas y una instalación inicial controlada; no debe ejecutarse en producción sin revisar las credenciales y los datos que se quieren cargar.
