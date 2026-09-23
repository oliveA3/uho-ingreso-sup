# Revisión de seguridad

Completa esta lista antes de cada despliegue y, como mínimo, una vez por trimestre.

## Comprobaciones automáticas

Desde la raíz del repositorio:

```powershell
cd backend
..\.venv\Scripts\python.exe manage.py check --deploy
..\.venv\Scripts\python.exe manage.py test apps.authentication apps.core apps.import_export
cd ../frontend
npm run build
```

Corrige cualquier fallo antes de desplegar. El backend debe ejecutarse con `DJANGO_DEBUG=false`, una `DJANGO_SECRET_KEY` larga y aleatoria, `DJANGO_ALLOWED_HOSTS` explícito y HTTPS/TLS habilitado.

## Configuración y secretos

- No guardar contraseñas SMTP, claves Django, credenciales Redis ni tokens en Git.
- Usar un gestor de secretos o variables protegidas de la plataforma.
- Configurar `CORS_ALLOWED_ORIGINS` y `CSRF_TRUSTED_ORIGINS` solo con dominios conocidos.
- Confirmar `SECURE_PROXY_SSL_HEADER`, cookies seguras y redirección HTTPS detrás del proxy.
- Separar credenciales y bases de datos de desarrollo, pruebas y producción.
- Mantener dependencias actualizadas y ejecutar un análisis de vulnerabilidades.

## API y autenticación

- Confirmar que los endpoints no públicos requieren JWT y permisos según el rol.
- Confirmar que las rutas públicas se limitan a las consultas previstas.
- Verificar tokens CSRF en todas las peticiones de modificación desde el navegador.
- Verificar el bloqueo de login después de cinco intentos fallidos y los límites de frecuencia.
- Confirmar que las cuentas pendientes no pueden iniciar sesión antes de verificar el correo.
- Revisar que los errores no expongan trazas, SQL, versiones del framework ni credenciales.

## Archivos, correo y colas

- Revisar la validación de MIME, extensión, tamaño y contenido de archivos subidos.
- Probar el SMTP con una cuenta controlada y confirmar que no se registran credenciales.
- Confirmar que Redis no está expuesto públicamente y requiere autenticación/red privada cuando corresponda.
- Ejecutar el worker Celery con un usuario de servicio sin privilegios administrativos.
- Supervisar `NotificationOutbox`: estados `failed`, número de `intentos` y `ultimo_error`.
- Confirmar que el comando `enqueue_notifications` puede recuperar trabajos pendientes.

## Datos y auditoría

- Realizar copias de seguridad cifradas y probar periódicamente su restauración.
- Limitar el acceso a la base de datos, Redis, logs y archivos estáticos.
- Revisar los logs de auditoría para detectar filtración de datos personales.
- Definir retención y eliminación de datos conforme a la política de privacidad institucional.
- Confirmar que la política de privacidad mostrada al estudiante coincide con la versión registrada.
