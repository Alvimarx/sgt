# Scripts de base de datos

## Estructura

```
BaseDatosMySQL/
├── desarrollo/                 # FUENTE ÚNICA — piezas por base de datos, en orden
│   ├── gestionturnos/          # BD de la app
│   │   ├── 01_esquema.sql      # crea la BD + tablas
│   │   └── 02_datos.sql        # datos de prueba (funcionarios, servicios, turnos…)
│   └── innhosp/                # stand-in del hospital
│       ├── 01_esquema.sql      # crea la BD + tablas de personal + vista viewPersonal
│       └── 02_datos.sql        # usuarios de prueba (clave de todos: huap2025)
├── despliegue/                 # GENERADOS (no editar a mano) — un solo script por BD
│   ├── setup_gestionturnos.sql # = gestionturnos/01 + 02
│   └── setup_innhosp.sql       # = innhosp/01 + 02
└── Datos antiguos/             # respaldos previos
```

## Cómo se usa
- **Dev con Docker**: `docker compose -f docker-compose.dev.yml up` toma automáticamente
  las piezas de `desarrollo/` (crea `gestionturnos` vacía + `innhosp` con datos; el backend
  crea las tablas de `gestionturnos` y el seeder las puebla).
- **Simular despliegue en tu PC**: ejecuta en tu MySQL los dos `despliegue/setup_*.sql`.
- **Hospital real**: usa solo la estructura `desarrollo/gestionturnos/01_esquema.sql` (sin datos
  de prueba); ellos cargan sus datos. `innhosp` es su BD real (no se crea con estos scripts).
