# IngresoSUP

IngresoSUP es un sistema modular para la gestión del proceso de ingreso a la Educación Superior en Cuba. Está compuesto por un backend Django REST y un frontend React + Vite + Tailwind.

## Componentes

- `backend/`: API REST, autenticación JWT, RBAC, modelos de dominio y auditoría.
- `frontend/`: SPA React para estudiantes, escuelas, municipios, provincia y administración.
- `test_data/`: archivos de prueba y semilla territorial para una instalación inicial.
- `docs/`: documentación operativa y técnica ampliada.

## Inicio rápido

Consulta [docs/SETUP.md](docs/SETUP.md) para instalar y ejecutar el proyecto localmente. La API queda disponible bajo `http://127.0.0.1:8000/api/v1/` y la documentación interactiva en `/api/v1/docs/`.

## Documentación

- [Índice de documentación](docs/README.md)
- [Instalación y operación local](docs/SETUP.md)
- [Despliegue y operación en producción](docs/DEPLOYMENT.md)
- [Carga inicial en Cuba: provincias, municipios, escuelas y roles](docs/SEED_INITIAL_DATA.md)
- [API REST y OpenAPI](docs/API.md)
- [Revisión de seguridad](docs/SECURITY.md)
- [Diagrama entidad-relación de la base de datos](docs/DIAGRAMA_ER.md)

## Estado del proyecto

- [x] Backend Django REST, con estructura modular.
- [x] API versionada con OpenAPI/Swagger.
- [x] Interfaz gráfica frontend con React + Tailwind.
- [x] Autenticación JWT y roles RBAC.
- [x] Gestión de admisión por etapas.
- [x] Etapa 1: Importación del escalafón y aprobación de índice.
- [x] Etapa 2: Llenado de boleta de interés.
- [x] Etapa 3: Llenado de boleta de solicitud de carreras.
- [x] Etapa 4: Confirmación de asistencia a las pruebas de ingreso.
- [x] Etapa 5: Aprobación de los resultados en pruebas de ingreso.
- [x] Etapa 6: Publicación del otorgamiento y cortes por carrera.
- [x] Módulo de auditoría con historial de acciones.  
- [x] Colas asíncronas con Redis y Celery.
- [x] Revisión de seguridad y lista de comprobaciones para despliegue.
- [x] Seed territorial idempotente para desarrollo y pruebas.
- [x] Documentación para despliegue local e información adicional.
- [ ] Manual de usuario.
