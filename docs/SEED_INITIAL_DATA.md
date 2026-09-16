# Carga inicial de datos

`test_data/seed_initial_data.py` prepara una instalación nueva sin datos territoriales.

## Qué crea

- Las 15 provincias de Cuba.
- El territorio especial Isla de la Juventud, representado como una provincia técnica con su municipio homónimo para ajustarse al modelo territorial actual.
- Todos los municipios definidos para esos territorios.
- Una escuela preuniversitaria inicial por cada municipio.
- Los tres CES iniciales del catálogo: Universidad de Holguín, Universidad de
  Ciencias Médicas de Holguín e Instituto Superior Minero Metalúrgico de Moa.
- Las tres asignaturas de las Pruebas de Ingreso: Matemática, Español e Historia.
- Una cuenta de prueba para cada uno de los siete roles del sistema:
  `superadmin`, `jefe_comision`, `ingreso_provincial`, `ingreso_municipal`,
  `director_escuela`, `secretario_escuela` y `estudiante`.
- Un perfil `Estudiante` asociado a la cuenta de estudiante demo.

Los usuarios territoriales se asignan a la primera provincia, municipio y escuela
creados (`Pinar del Rio`). La semilla no crea múltiples representantes para cada
municipio o escuela: respeta las restricciones de unicidad de los modelos.

## Ejecución en CMD

Desde la raíz del repositorio, después de `migrate`:

```cmd
python test_data\seed_initial_data.py
```

Contraseña configurable para las cuentas demo:

```cmd
set INGRESOSUP_SEED_PASSWORD=UnaClaveLocal-Segura-2026
python test_data\seed_initial_data.py
```

Para actualizar la contraseña de las cuentas `seed_*` en una instalación ya cargada:

```cmd
python test_data\seed_initial_data.py --reset-password --password UnaClaveLocal-Segura-2026
```

También puede ejecutarse directamente como comando Django desde `backend`:

```cmd
cd backend
python manage.py seed_initial_data
```

## Cuentas creadas

- `seed_superadmin`
- `seed_jefe_comision`
- `seed_ingreso_provincial`
- `seed_ingreso_municipal`
- `seed_director_escuela`
- `seed_secretario_escuela`
- `seed_estudiante`

Por defecto la semilla usa `IngresoSUP-demo-2026!` si no se proporciona otra contraseña. Es una credencial de desarrollo: debe cambiarse antes de compartir una instalación o desplegarla.

## Propiedades

- Es idempotente: puede repetirse sin duplicar provincias, municipios, escuelas ni cuentas `seed_*`.
- No borra datos existentes.
- Solo actualiza las cuentas identificadas por los nombres `seed_*`.
- Usa el ORM y una transacción atómica, por lo que no depende de SQLite ni de SQL específico.
