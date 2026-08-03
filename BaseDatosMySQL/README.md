# Scripts de base de datos

## Estructura

```
BaseDatosMySQL/
├── desarrollo/                 
│   ├── gestionturnos/          # BD de la app
│   │   ├── 01_esquema.sql      # crea la BD + tablas
│   │   └── 02_datos.sql        # datos de prueba (funcionarios, servicios, turnos…)
│   └── innhosp/                # stand-in del hospital
│       ├── 01_esquema.sql      # crea la BD + tablas de personal + vista viewPersonal
│       └── 02_datos.sql        # usuarios de prueba (clave de todos: huap2025)
└─── despliegue/                 
    ├── schema_gestionturnos.sql   # solo estructura crear BD del sistema
    ├── datos_gestionturnos.sql    # solo poblado para pruebas en urgencias
    └── setup_innhosp.sql          # En caso de querer hacer pruebas del innhosp

```

## Cómo se usa
- **Dev con Docker**: `docker compose -f docker-compose.dev.yml up` toma automáticamente las piezas de `desarrollo/` (crea `gestionturnos` vacía + `innhosp` con datos; el backend  crea las tablas de `gestionturnos` y el seeder las puebla).
- **Simular despliegue en tu PC**: ejecuta en tu MySQL los dos `despliegue/setup_*.sql`.
- **Hospital real**: entrega `despliegue/schema_gestionturnos.sql` (solo estructura, sin datos de prueba); ellos crean `gestionturnos` con ese script y cargan sus datos. `innhosp` es su BD real (no se crea con estos scripts).
- **DDL_AUTO=validate**: la estructura debe existir antes de arrancar el backend; ejecuta primero `despliegue/schema_gestionturnos.sql`.
- **Estructura y datos por separado**: `despliegue/schema_gestionturnos.sql` (esquema) y luego `despliegue/datos_gestionturnos.sql` (poblado).

## Migraciones incrementales

El proyecto no usa una herramienta formal de migraciones (Flyway/Liquibase); los cambios de esquema posteriores a la creación inicial se agregan como scripts numerados en `migraciones/`, pensados para aplicarse **una sola vez, en orden, sobre una base de datos ya creada** con los scripts de arriba (no reemplazan el esquema base, lo complementan). Cada script documenta su propia reversión al final.

| Script | Qué agrega |
| ------ | ---------- |
| `migraciones/V2__planificacion_vigencia.sql` | Tabla `planificacion_ejecucion` (vigencia efectiva de una generación) y columna `Turnos.id_ejecucion` (origen inequívoco de cada turno generado). Aditivo; los turnos existentes quedan con `id_ejecucion = NULL` (origen legado). |

Nota: `despliegue/schema_gestionturnos.sql` y `desarrollo/gestionturnos/01_esquema.sql` están marcados como generados y no se editan a mano; para un ambiente **nuevo**, ejecuta el script base correspondiente y luego, en orden, los scripts de `migraciones/`.
