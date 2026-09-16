# IngresoSUP

IngresoSUP es un sistema modular para la gestión del proceso de ingreso a la Educación Superior en Cuba. Está compuesto por un backend Django REST y un frontend React + Vite + Tailwind.

## Componentes

- `backend/`: API REST, autenticación JWT, RBAC, modelos de dominio y auditoría.
- `frontend/`: SPA React para estudiantes, escuelas, municipios, provincia y administración.
- `test_data/`: archivos de prueba y semilla territorial para una instalación inicial.
- `docs/`: documentación operativa y técnica ampliada.
- `SECURITY.md`: lista de revisión previa a despliegues.

## Inicio rápido

La guía completa para Windows CMD está en [docs/SETUP.md](docs/SETUP.md). El flujo resumido es:

```cmd
cd /d C:\Amanda\College\IngresoSup
.venv\Scripts\activate.bat
cd backend
python -m pip install -r requirements.txt
python manage.py migrate
cd ..
python test_data\seed_initial_data.py
cd backend
python manage.py runserver
```

En otra ventana de CMD:

```cmd
cd /d C:\Amanda\College\IngresoSup\frontend
npm install
npm run dev
```

La API queda disponible bajo `http://127.0.0.1:8000/api/v1/` y la documentación interactiva en `/api/v1/docs/`.

## Documentación

- [Índice de documentación](docs/README.md)
- [Instalación y operación local](docs/SETUP.md)
- [Carga inicial en Cuba: provincias, municipios, escuelas y roles](docs/SEED_INITIAL_DATA.md)
- [API REST y OpenAPI](docs/API.md)
- [Revisión de seguridad](SECURITY.md)

## Configuración de producción

Si el frontend y el backend se despliegan en dominios separados, configura `VITE_API_ORIGIN` antes de construir el frontend:

```env
VITE_API_ORIGIN=https://api.ingresosup.cu
```

En producción configura también `DJANGO_DEBUG=false`, `DJANGO_SECRET_KEY`, `DJANGO_ALLOWED_HOSTS` y HTTPS/TLS. Revisa [SECURITY.md](SECURITY.md) antes de desplegar.

## Estado del proyecto

- [x] Backend Django REST y frontend React.
- [x] Autenticación JWT y roles RBAC.
- [x] Gestión de admisión por etapas.
- [x] Escalafón, boletas, resultados y otorgamiento.
- [x] API versionada con OpenAPI/Swagger.
- [x] Seed territorial idempotente para desarrollo y pruebas.
