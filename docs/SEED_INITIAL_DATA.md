# Carga inicial de datos

El comando `seed_initial_data` carga el catálogo territorial y algunos catálogos
institucionales. Por defecto **no crea cuentas de usuario**; es seguro usarlo
como parte de la preparación de una instalación nueva, incluida producción.

## Qué carga por defecto

- Las 15 provincias de Cuba y el territorio especial Isla de la Juventud,
  representado como provincia técnica y municipio homónimo.
- Los municipios definidos para esos territorios.
- Tres CES iniciales y las asignaturas Matemática, Español e Historia de Cuba.

La carga es idempotente, no borra registros y usa el ORM dentro de una
transacción. No crea escuelas ni usuarios: carga los territorios y catálogos
que no dependen de datos institucionales aún no importados.

## Ejecución

Después de `migrate`, desde la raíz del repositorio:

```cmd
python test_data\seed_initial_data.py
```

También se puede ejecutar como comando Django:

```cmd
cd backend
python manage.py seed_initial_data
```

Las escuelas oficiales se importan o registran por separado; la semilla no
inventa centros para completar los municipios.

## Cuentas demo (solo desarrollo/pruebas)

Las cuentas demo incluyen un superusuario y usuarios de todos los roles, y
crean una sola escuela demo para sus alcances. No las crees en producción. Para
habilitarlas se requiere una contraseña elegida explícitamente:

```cmd
set INGRESOSUP_SEED_PASSWORD=una-clave-unica-y-segura
python test_data\seed_initial_data.py --with-demo-users
```

También se acepta `--password`, pero es preferible una variable de entorno o un
gestor de secretos para no dejar la contraseña en el historial de la terminal.
No se incluye una contraseña predeterminada. `--reset-password` solo tiene
efecto junto con `--with-demo-users`; actualiza las contraseñas de las cuentas
demo existentes.

Las cuentas demo usan estos nombres:

- `seed_superadmin`
- `seed_jefe_comision`
- `seed_ingreso_provincial`
- `seed_gestor_noticias`
- `seed_ingreso_municipal`
- `seed_director_escuela`
- `seed_secretario_escuela`
- `seed_estudiante`

El comando no elimina cuentas demo que hayan sido creadas por versiones
anteriores. Antes de desplegar una base que ya las contenga, desactívalas o
cámbiales las credenciales de forma controlada.

## Primer administrador de producción

En una instalación nueva, carga los catálogos sin cuentas demo y crea después
una cuenta administrativa real con:

```cmd
cd backend
python manage.py createsuperuser
```

Define su rol y alcance institucional desde el panel de administración, y
habilita MFA/controles institucionales si están disponibles en la plataforma.
