# Instalación y operación local

> **Base de datos:** el sistema está pensado para **PostgreSQL 14+** (y Redis 7+). Sin configuración adicional se usa SQLite, válido solo para pruebas rápidas. Para levantar PostgreSQL y Redis en un minuto con Docker, o instalarlos a mano, sigue la sección [Base de datos: PostgreSQL 14+](DEPLOYMENT.md#base-de-datos-postgresql-14) de la guía de despliegue.

## Backend en Windows CMD

Desde la raíz del repositorio:

```cmd
python -m venv .venv
.venv\Scripts\activate.bat
cd backend
python -m pip install -r requirements-dev.txt
python manage.py migrate
python manage.py seed_initial_data
python manage.py createsuperuser
cd ..
cd backend
python manage.py runserver
```

El backend queda disponible en `http://127.0.0.1:8000/` y la API versionada en `/api/v1/`.

## Frontend

En otra ventana de CMD:

```cmd
cd frontend
npm ci
npm run dev
```

Si el backend está en otro dominio, crea `frontend/.env.production` antes de compilar:

```env
VITE_API_ORIGIN=https://api.ingresosup.cu
```

## Comprobaciones rápidas

```cmd
cd backend
..\.venv\Scripts\python.exe manage.py check
..\.venv\Scripts\python.exe manage.py test
```

Consulta [SEED_INITIAL_DATA.md](SEED_INITIAL_DATA.md) para la carga territorial inicial y [API.md](API.md) para la documentación REST.
