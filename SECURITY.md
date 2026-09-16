# Lista de revisión de seguridad

Esta lista debe completarse antes de cada despliegue en producción y, como mínimo, una vez por trimestre.

## Comprobaciones automáticas

```powershell
cd backend
..\.venv\Scripts\python.exe manage.py check --deploy
..\.venv\Scripts\python.exe manage.py test apps.authentication apps.core apps.import_export
cd ../frontend
npm run build
```

Revisa el resultado y corrige cualquier fallo antes del despliegue. El backend debe ejecutarse con `DJANGO_DEBUG=false`, una variable `DJANGO_SECRET_KEY` larga y aleatoria, `DJANGO_ALLOWED_HOSTS` configurado explícitamente y HTTPS/TLS habilitado.

## Revisión manual

- Confirmar que todos los endpoints no públicos requieren JWT y permisos según el rol.
- Confirmar que las rutas públicas se limitan a las consultas configuradas de notas y carreras otorgadas.
- Verificar tokens CSRF en todas las peticiones de modificación realizadas desde el navegador.
- Verificar el bloqueo de login después de cinco intentos fallidos y los límites de frecuencia en autenticación e importaciones.
- Revisar la validación de tipo MIME, extensión, tamaño y contenido de los archivos subidos.
- Confirmar que los errores de la API no exponen trazas, SQL, versiones del framework ni credenciales.
- Revisar las actualizaciones de dependencias y ejecutar un análisis de vulnerabilidades.
- Revisar los logs de auditoría para detectar filtración de datos sensibles y comprobar la disponibilidad en base de datos y archivo.
