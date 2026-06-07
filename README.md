# IngresoSUP

IngresoSUP es la base arquitectónica del sistema de ingreso a la Educación Superior en Cuba. El proyecto se diseña como una solución modular con backend Django REST y frontend React + Vite + Tailwind.

## Alcance inicial

- Backend Django en `backend/` con una aplicación central `core`.
- Autenticación basada en sesiones y roles (RBAC) según el ERS.
- Registro de estudiantes y login real contra la API de Django.
- Administración mínima de roles y auditoría de cambios en asignación de roles.
- Modelo de datos con usuario extendido, roles, provincias, municipios, escuelas, carreras y nomencladores básicos.
- Frontend React + Vite en `frontend/` con una landing page responsive y accesible.
- Documentación inicial en `docs/README.md`.

## Arquitectura

- `backend/`: API REST, modelo de dominio, autenticación y permisos intermedios.
- `frontend/`: SPA React que consumirá exclusivamente endpoints JSON.
- `docs/`: guías de despliegue y roadmap.

## Dependencias clave

- Backend: Django, Django REST framework, django-cors-headers.
- Frontend: React, Vite, TailwindCSS, Axios.

## Guía de despliegue local

1. Instalar Python 3.10+.
2. Crear un entorno virtual dentro de `backend/`:

   ```bash
   cd backend
   python -m venv .venv
   .\.venv\Scripts\activate
   pip install -r requirements.txt
   python manage.py migrate
   python manage.py createsuperuser
   python manage.py runserver
   ```

3. Instalar dependencias frontend y levantar la app:

   ```bash
   cd frontend
   npm install
   npm run dev
   ```

4. Acceder al frontend en la URL que devuelva Vite y al backend en `http://127.0.0.1:8000/api/`.

## Rutas de autenticación

- `POST /api/auth/login/` — iniciar sesión.
- `POST /api/auth/register/` — registro de estudiante.
- `POST /api/auth/logout/` — cerrar sesión.
- `GET /api/auth/me/` — obtener usuario autenticado.
- `GET /api/roles/admin/` — administración de roles para Super Administrador.
- `GET /api/audit/logs/` — consultar logs de cambios de rol (Super Administrador).

## Roadmap de módulos

- [x] Estructura base de backend Django
- [x] Modelo de usuario extendido y roles RBAC
- [x] Endpoints de login/logout y sesión
- [x] Estructura base del frontend React
- [x] Landing page con secciones de noticias, plazas, cortes y oferta académica
- [ ] Módulo de boletas
- [ ] Módulo de escalafón
- [ ] Módulo de reportes
- [ ] Módulo de gestión de admisión por etapas
- [ ] Implementar JWT y Single Page App auth completa
- [ ] Conexión de datos reales con APIs REST y backend

## Buenas prácticas

- Backend modular con `core` como punto de extensión.
- Separación de responsabilidades: API y UI.
- Comentarios y placeholders para futuras extensiones.
- Sistema de permisos por niveles para evitar escalamiento no autorizado.
