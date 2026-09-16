# Instalación y operación local

## Backend en Windows CMD

Desde la raíz del repositorio:

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

Si el entorno virtual todavía no existe:

```cmd
cd /d C:\Amanda\College\IngresoSup
python -m venv .venv
.venv\Scripts\activate.bat
cd backend
python -m pip install -r requirements.txt
```

El backend queda disponible en `http://127.0.0.1:8000/` y la API versionada en `/api/v1/`.

## Frontend

En otra ventana de CMD:

```cmd
cd /d C:\Amanda\College\IngresoSup\frontend
npm install
npm run dev
```

Si el backend está en otro dominio, crea `frontend/.env.production` antes de compilar:

```env
VITE_API_ORIGIN=https://api.ingresosup.cu
```

## Comprobaciones rápidas

```cmd
cd /d C:\Amanda\College\IngresoSup\backend
..\.venv\Scripts\python.exe manage.py check
..\.venv\Scripts\python.exe manage.py test
```

Consulta [SEED_INITIAL_DATA.md](SEED_INITIAL_DATA.md) para la carga territorial inicial y [API.md](API.md) para la documentación REST.
