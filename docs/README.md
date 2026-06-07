# Documentación Inicial de IngresoSUP

Este documento describe la configuración básica necesaria para iniciar el entorno local del proyecto.

## Estructura del repositorio

- `backend/`: proyecto Django y aplicación `core`.
- `frontend/`: aplicación React + Vite + Tailwind.
- `docs/`: documentación de despliegue y roadmap.

## Backend

1. Abrir terminal en `backend/`.
2. Crear entorno virtual:

   ```bash
   python -m venv .venv
   .\.venv\Scripts\activate
   ```

3. Instalar dependencias:

   ```bash
   pip install -r requirements.txt
   ```

4. Ejecutar migraciones:

   ```bash
   python manage.py migrate
   ```

5. Crear un superusuario si es necesario:

   ```bash
   python manage.py createsuperuser
   ```

6. Levantar el servidor:

   ```bash
   python manage.py runserver
   ```

7. Endpoints de autenticación disponibles:

   - `POST /api/auth/login/`
   - `POST /api/auth/register/`
   - `POST /api/auth/logout/`
   - `GET /api/auth/me/`
   - `GET /api/roles/admin/`
   - `GET /api/audit/logs/`

## Frontend

1. Abrir terminal en `frontend/`.
2. Instalar dependencias:

   ```bash
   npm install
   ```

3. Levantar la app:

   ```bash
   npm run dev
   ```

## Notas

- El backend no genera HTML. Todo es API JSON.
- La landing page en React es mobile-first y accesible.
- La arquitectura está pensada para incorporar boletas, escalafón y reportes en módulos separados.
