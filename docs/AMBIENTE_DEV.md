# Ambiente DEV

Guía completa para levantar SGT-HUAP en un ambiente de desarrollo local mediante Docker.

## Arquitectura

El backend (Spring Boot) mantiene **dos conexiones a base de datos totalmente independientes** (dos `DataSource`, dos pools de conexión, dos `EntityManagerFactory` — no es una sola conexión con dos esquemas):

```
Frontend (Vite + React, servido por Apache httpd)
   │  /api/v2/*  (proxy reverso)
   ▼
Backend (Spring Boot :8080)
   ├──▶ BD Sistema (gestionturnos) — EXTERNA, lectura/escritura
   │      DataSource "primary" → paquete com.pingeso.HUAP.Entity / Repository
   │
   └──▶ BD Login/Personal (viewPersonal, hospital) — EXTERNA, SOLO LECTURA
          DataSource "hospital" → paquete com.pingeso.HUAP.hospital
          (hibernate.hbm2ddl.auto=none fijo en código; nunca escribe ni altera esquema)
```

Ambas bases son **externas** al ambiente DEV: no se levanta ningún MySQL/MariaDB/Postgres local vía Docker. El `docker-compose.dev.yml` solo orquesta `backend` y `frontend`.

## Requisitos

- Docker + Docker Compose.
- Conectividad de red hacia los dos hosts externos (mismo segmento `10.6.15.x` que la red local de desarrollo; no requiere VPN si estás en esa red).
- Un archivo `.env.dev` con las credenciales reales (no versionado — pedirlo al equipo, o completar `.env.example` con los valores reales).

## Variables de entorno

Todas las variables las consume el backend vía `${VAR}` en `huap_backend/src/main/resources/application.properties`. Nombres tal como aparecen en el código (no inventados):

| Variable | Datasource | Obligatoria | Descripción |
|---|---|---|---|
| `DB_URL` | Sistema (gestionturnos) | Sí | URL JDBC completa (`jdbc:mysql://host:puerto/gestionturnos`) |
| `DB_USERNAME` | Sistema | Sí | Usuario de la BD del sistema |
| `DB_PASSWORD` | Sistema | Sí | Contraseña de la BD del sistema |
| `HOSPITAL_DB_URL` | Login/Personal | Sí | URL JDBC completa (`jdbc:mysql://host:puerto/innhosp`) |
| `HOSPITAL_DB_USERNAME` | Login/Personal | Sí | Usuario de la BD del hospital (solo `SELECT`) |
| `HOSPITAL_DB_PASSWORD` | Login/Personal | Sí | Contraseña de la BD del hospital |
| `DDL_AUTO` | Sistema | Sí | Estrategia de esquema de Hibernate. **`validate` en DEV** (la BD es externa/real, Hibernate nunca la altera) |
| `JWT_SECRET` | — | Sí | Secreto de firma de los JWT (≥32 caracteres). El valor de DEV es desechable, no protege ninguna BD real |
| `CORS_ALLOWED_ORIGINS` | — | No (tiene default) | Orígenes permitidos, separados por coma |
| `LOGIN_LOCK_DURATION_MS` | — | No (tiene default) | Bloqueo por fuerza bruta en login, en ms |
| `SWAGGER_ENABLED` | — | No (default `false`) | En DEV se deja `true` |
| `SERVER_ID` | — | No | Identificador de instancia, solo informativo |
| `VITE_API_BASE_URL` | — (frontend) | No (default `/api/v2`) | Base de la API que usa el build del frontend |
| `VITE_DEBUG` | — (frontend) | No (default `false`) | Logs de Axios en consola del navegador |
| `VITE_SOCKET_URL` | — (frontend) | No (default `http://localhost:8080`) | URL del backend para la conexión de websocket |

> Importante: **nunca** reutilices las credenciales de una BD para la otra — son sistemas distintos, con distinto host/puerto/usuario/contraseña.

## Configuración `.env.dev`

`.env.dev` vive en la raíz del repo, **no está versionado** (`.gitignore`), y es la única fuente de valores reales para `docker-compose.dev.yml`. Para crearlo:

```bash
cp .env.example .env.dev
# completa DB_*, HOSPITAL_DB_*, JWT_SECRET, etc. con los valores reales
```

`.env.example` (sí versionado) documenta todas las variables con valores placeholder — nunca contiene secretos.

## Configuración de ambas bases

- **BD Sistema (gestionturnos)**: servidor externo de preproducción. El backend la usa en lectura/escritura para toda la operación normal de la app (turnos, servicios, solicitudes, etc.).
- **BD Login/Personal (viewPersonal, hospital)**: servidor externo del hospital, expuesto **solo lectura** para el login y la consulta de personal (`ViewPersonalRepository`). El backend jamás escribe en esta base (forzado en código, no solo por configuración).

Ambas requieren que el host donde corre Docker tenga alcance de red a los puertos correspondientes (ver Troubleshooting).

## Docker Compose

Un único archivo para DEV: **`docker-compose.dev.yml`**. Servicios:

- `backend`: build de `huap_backend/Dockerfile`, puerto `8080:8080`, variables desde `.env.dev` (`env_file`), healthcheck sobre `/api/v2/health`.
- `frontend`: build de `sgt-huap_frontend/Dockerfile`, puerto `5173:80`, proxy reverso `/api/v2 → backend:8080` (vía `apache/dev/httpd.conf`).

No hay servicio de base de datos: ambas son externas y se referencian solo por variables de entorno.

## Cómo construir

```bash
docker compose -f docker-compose.dev.yml --env-file .env.dev config   # valida sintaxis y variables
docker compose -f docker-compose.dev.yml --env-file .env.dev build
```

## Cómo iniciar

```bash
docker compose -f docker-compose.dev.yml --env-file .env.dev up -d --build
```

## Cómo detener

```bash
docker compose -f docker-compose.dev.yml --env-file .env.dev down
```

## Cómo ver logs

```bash
docker compose -f docker-compose.dev.yml logs -f
docker compose -f docker-compose.dev.yml logs -f backend   # solo backend
```

## Estado

```bash
docker compose -f docker-compose.dev.yml ps
```

## Cómo reconstruir

```bash
docker compose -f docker-compose.dev.yml --env-file .env.dev up -d --build --force-recreate
```

## Troubleshooting

**El backend no arranca / falla el healthcheck:**
- Revisa `docker compose -f docker-compose.dev.yml logs backend` — Spring Boot falla rápido si no puede conectar a cualquiera de las dos BD al arrancar (pool de HikariCP).
- Confirma que `.env.dev` existe y tiene los 6 valores `DB_*`/`HOSPITAL_DB_*` completos.
- Prueba alcance de red desde el host (sin credenciales, solo conexión TCP):
  ```bash
  # Windows PowerShell
  Test-NetConnection -ComputerName 10.6.15.193 -Port 3309
  Test-NetConnection -ComputerName 10.6.15.193 -Port 3307
  ```
  Si esto falla, el problema es de red (firewall, VPN, no estar en la misma subred), no de la app.

**`docker compose config` falla con "variable is missing a value":**
- Falta `.env.dev` o falta alguna variable dentro de él. Compará contra `.env.example`.

**El frontend carga pero no puede hablar con el backend:**
- Verifica que `apache/dev/httpd.conf` sigue montado (`docker compose -f docker-compose.dev.yml config` debe mostrar el volumen) y que `backend` está `healthy` (`docker compose ps`).

**Necesito trabajar sin conectividad a las BD externas:**
- Levantá tu propio MySQL local (no orquestado por este compose) usando los scripts de `BaseDatosMySQL/desarrollo/` y apuntá `DB_URL`/`HOSPITAL_DB_URL` en tu `.env.dev` a ese servidor local. `DDL_AUTO=update` es seguro únicamente en ese caso (BD local desechable), nunca contra las BD externas reales.

**No imprimir nunca contraseñas/tokens/cadenas de conexión completas en logs compartidos** (issues, chats, PRs) — si necesitás pedir ayuda con un error de conexión, comparte host/puerto y el mensaje de error, nunca `DB_PASSWORD`/`HOSPITAL_DB_PASSWORD`/`JWT_SECRET`.
