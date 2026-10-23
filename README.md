# SGT-HUAP — Sistema de Gestión de Turnos

**Plataforma web para la gestión de turnos del personal del Hospital de Urgencia Asistencia Pública (HUAP).**

![Java](https://img.shields.io/badge/Java-21-orange)
![Spring Boot](https://img.shields.io/badge/Spring%20Boot-4.0-brightgreen)
![React](https://img.shields.io/badge/React-19-blue)
![Vite](https://img.shields.io/badge/Vite-7-purple)
![MySQL](https://img.shields.io/badge/MySQL-8.0-blue)
![Docker](https://img.shields.io/badge/Docker-Compose-blue)

El sistema permite planificar, asignar y gestionar los turnos del personal por servicio y puesto, gestionar solicitudes de intercambio y ofertas de turnos, bitácora de auditoría y estadísticas, con autenticación y autorización basada en roles.

> **Entrega a TIC HUAP (martes 3 de noviembre de 2026).** El índice operativo (qué se entrega, en qué estado quedó, despliegue, pruebas, decisiones, deuda técnica y pendientes) es [`docs/TRASPASO.md`](docs/TRASPASO.md). Conviene empezar por ahí. Este repositorio es público: no contiene datos reales ni secretos, y las claves, el secreto JWT y los `.env` se crean nuevos en cada ambiente.

---

## Índice

- [Qué hace](#qué-hace)
- [Arquitectura](#arquitectura)
- [Stack tecnológico](#stack-tecnológico)
- [Arranque rápido (ambiente local)](#arranque-rápido-ambiente-local)
- [Documentos vigentes](#documentos-vigentes)
- [Scripts](#scripts)
- [Configuración](#configuración)
- [Pruebas](#pruebas)
- [Estructura del repositorio](#estructura-del-repositorio)

---

## Qué hace

- **Planificación de turnos** por servicio, puesto y tipo de turno, con rotativas y un molde que genera los turnos reales.
- **Personal y roles:** funcionarios asignados a servicios con roles por servicio (médico, subrogante, jefatura) y un rol de sistema (administrador).
- **Solicitudes** (permiso, botar turno, cobertura, intercambio, oferta particular) y **ofertas generales** con postulaciones, que la jefatura aprueba o rechaza.
- **Bitácora** de auditoría, auditoría de asistencia, **estadísticas** y **exportación** a CSV.
- **Feriados** y reglas de horario por servicio.
- **Autenticación JWT** y autorización por rol de sistema y rol de servicio, con acceso acotado al servicio de la sesión.
- Modo móvil (bajo 1200 px) y modo desktop con menú lateral (desde 1200 px).
- Las notificaciones existen en el código, pero la bandeja está oculta en la entrega (decisión C-09).

## Arquitectura

Cada backend usa **dos conexiones a base de datos**: la BD propia del SGT (`gestionturnos`, lectura y escritura) y la vista de personal del hospital (`innhosp.viewPersonal`, **solo lectura**, para el login y el alta de personal).

| Ambiente | Archivo | Qué levanta |
|---|---|---|
| Local | `docker-compose.local.yml` | MySQL con las dos bases ficticias, el backend y, opcional, el frontend |
| VM de demostración | `docker-compose.hetzner.yml` | MySQL interno, 1 backend y 1 frontend Apache que hace de proxy de `/api/v2` |
| Producción de referencia | `docker-compose.yml` | Balanceador Apache, 3 frontends y 3 backends; bases externas |
| DEV del equipo anterior | `docker-compose.dev.yml` | Backend y frontend contra las bases reales de la red del hospital |

```
Cliente ──▶ Apache (balanceador o frontend) ──┬──▶ Frontend (Apache httpd + build React)
                                              └──▶ /api/v2/* ──▶ Backend (Spring Boot :8080) ──┬──▶ MySQL gestionturnos (R/W)
                                                                                                └──▶ MySQL innhosp · viewPersonal (solo lectura)
```

## Stack tecnológico

| Capa | Tecnologías |
|------|-------------|
| **Backend** | Java 21, Spring Boot 4.0 (`4.0.0-SNAPSHOT`), Spring Data JPA, Spring Security + JWT (jjwt), Maven |
| **Frontend** | React 19, Vite 7, Tailwind CSS 3, React Router 7, Axios, dayjs |
| **Base de datos** | MySQL 8.0, dos datasources: `gestionturnos` (app, R/W) e `innhosp` (`viewPersonal`, solo lectura) |
| **Infraestructura** | Docker, Docker Compose, Apache httpd (balanceador y servido de estáticos del frontend) |
| **Pruebas** | JUnit y Mockito, Testcontainers, Playwright |

## Arranque rápido (ambiente local)

Es un ambiente autocontenido con datos ficticios: no necesita las bases del hospital.

Requisitos: Docker con Compose; Node `^20.19.0 || >=22.12.0` (lo exige Vite 7); Java 21 solo para correr el backend o sus pruebas fuera de Docker; puertos libres 3306, 8080 y 5173.

```bash
# 1. Variables (el archivo real no se versiona). Completar MYSQL_ROOT_PASSWORD, DB_PASSWORD,
#    HOSPITAL_DB_PASSWORD (la misma clave) y JWT_SECRET (openssl rand -base64 48)
cp .env.local.example .env.local

# 2. Base y backend (la primera vez construye la imagen del backend; MySQL ejecuta los scripts de init una sola vez)
docker compose -f docker-compose.local.yml --env-file .env.local up -d db backend

# 3. Comprobar el backend
curl http://localhost:8080/api/v2/health

# 4. Turnos vigentes de Urgencias (7 semanas desde el lunes actual; una vez por volumen)
bash scripts/generar_turnos_demo.sh

# 5. Frontend
cd sgt-huap_frontend
npm ci
npm run dev
```

Abrir **`http://localhost:5173`**. Usar `localhost` y no la dirección numérica de loopback: el CORS del backend solo admite los orígenes de `CORS_ALLOWED_ORIGINS`. Los usuarios de prueba y su clave están en el catálogo de historias de usuario (`docs/qa/HISTORIAS_DE_USUARIO.md` §2.1). Swagger UI: `http://localhost:8080/swagger-ui.html` (en la plantilla local, `SWAGGER_ENABLED=true`). Para detener sin borrar datos: `docker compose -f docker-compose.local.yml --env-file .env.local down`; para recrear desde cero, `down -v` y volver al paso 2. Respaldo y restauración de la base local: [`docs/TRASPASO.md`](docs/TRASPASO.md) §5.

Nunca cargar datos reales en el ambiente local, en la VM ni en el repositorio.

## Documentos vigentes

| Documento | Para qué |
|---|---|
| [`docs/TRASPASO.md`](docs/TRASPASO.md) | Índice operativo de la entrega a TIC HUAP: estado, despliegue, pruebas, decisiones, incidente, deuda técnica, fe de erratas del manual y transición |
| [`docs/DESPLIEGUE_VM.md`](docs/DESPLIEGUE_VM.md) | Instalación y operación de la VM de demostración (sin construir en la VM) |
| [`docs/qa/HISTORIAS_DE_USUARIO.md`](docs/qa/HISTORIAS_DE_USUARIO.md) | Catálogo de 77 historias de usuario con criterios, estado según el código, decisiones (§5) y orden de pruebas (§6) |
| [`docs/qa/pruebas-integrales/`](docs/qa/pruebas-integrales/README.md) | 32 historias y 249 casos de prueba basados en reglas, su plan de ejecución, supuestos y resultados |
| [`requerimientos/README.md`](requerimientos/README.md) | Índice de R1–R18: qué se cambió, por qué y cómo probarlo |
| [`docs/desktop/GUIA-DESKTOP.md`](docs/desktop/GUIA-DESKTOP.md) | Reglas para adaptar o crear pantallas desktop sin tocar el móvil |
| [`docs/security/NOTA_INCIDENTE_DATOS_PERSONAL_GIT_2026-08-10.md`](docs/security/NOTA_INCIDENTE_DATOS_PERSONAL_GIT_2026-08-10.md) | Incidente de datos de agosto y sus pendientes |
| [`docs/security/INTERNET_DEPLOYMENT_SECURITY_CHECKLIST.md`](docs/security/INTERNET_DEPLOYMENT_SECURITY_CHECKLIST.md) y [`RESIDUAL_RISK_REGISTER.md`](docs/security/RESIDUAL_RISK_REGISTER.md) | Lista de lo que falta para exponer el sistema a internet (su estado al 22 oct está en `docs/TRASPASO.md` §6.2 y §11) |
| [`Archivo de funcionalidades.md`](Archivo%20de%20funcionalidades.md) | Funciones (FUN-SGT) y reglas de negocio (RN-SGT). Referencia con contradicciones: donde difiere del código, manda el catálogo |
| [`docs/api/`](docs/api/README.md) | API REST. La especificación versionada está desactualizada: se regenera con el backend arriba y `SWAGGER_ENABLED=true` |

Son históricos y se conservan como trazabilidad: `docs/qa/` (auditoría QA de julio), el resto de `docs/security/`, `REVISION_POST_CORRECCIONES_SGT.md`, `docs/BRIEF-MODO-DESKTOP.md` y `requerimientos/TRASPASO.md` (solo vale para R1–R9). `IMPLEMENTAR_DEV.MD` y `docs/AMBIENTE_DEV.md` describen el DEV contra las bases reales y solo sirven dentro de la red del hospital. La tabla completa de documentos, con su estado, está en `docs/TRASPASO.md` §2.

## Scripts

| Script | Qué hace | Dónde se corre |
|---|---|---|
| `scripts/generar_turnos_demo.sh` | Genera turnos vigentes de Urgencias (7 semanas desde el lunes actual) con la propia Planificación, entrando a la API como administrador del seed | Local y VM, con el seed ficticio |
| `scripts/generar_rotativa_urgencias.sh` | Genera la rotativa completa de Urgencias (por defecto, del 1 oct al 31 dic de 2026) con el ciclo de 42 días anclado para que «Lunes Turno (T III)» calce con el calendario real. Completa los cupos libres del molde, respalda el molde y verifica contra la API. `SIMULAR=1` solo muestra qué haría; pide RUT y clave del administrador | En la VM, desde `/opt/sgt` |
| `scripts/desplegar_frontend_hetzner.sh` | Construye la imagen del frontend en el equipo de desarrollo desde el último commit subido a GitHub y recrea solo ese contenedor en la VM. Con `DATOS_DEMO=1` genera además turnos vigentes | Equipo de desarrollo |
| `scripts/desplegar_backend_hetzner.sh` | Lo mismo para el backend; se detiene si hay migraciones nuevas sin aplicar (`MIGRACIONES_APLICADAS=1` después de aplicarlas) | Equipo de desarrollo |
| `scripts/_hetzner_comun.sh` | Piezas comunes de los dos scripts de despliegue; no se ejecuta solo | |
| `scripts/init_db.sh` | Inicializa las dos bases en el contenedor MySQL de la VM: esquema, V2, V3, bootstrap, `innhosp` y, con `SEED_DEMO=1`, el poblado de demostración. Se puede volver a correr | VM |
| `scripts/mysql.sh` | Consola y carga de SQL con el charset correcto (no usar `mysql` a mano) | VM |
| `scripts/crear_usuario_padron_demo.sh` | Crea el usuario MySQL del simulador del padrón (solo demo): `SELECT`/`INSERT` y `UPDATE` de `estado` y `clave` solo sobre `innhosp.personalAux`. Toma la clave de `PADRON_DB_PASSWORD`; `vm` o `local` como argumento. Ver `simulador-padron/README.md` | VM y local |
| `scripts/backup_mysql.sh` | Respaldo comprimido de las dos bases, con rotación por días | VM |
| `scripts/diagnostico_login.sh` | Diagnostica por qué un RUT puede o no iniciar sesión | VM |

Detalle, variables y advertencias de cada uno: su encabezado, `docs/DESPLIEGUE_VM.md` y `docs/TRASPASO.md` §4 y §6.

## Configuración

La configuración del backend está en [`huap_backend/src/main/resources/application.properties`](huap_backend/src/main/resources/application.properties) y toma todos sus valores de variables de entorno. Las plantillas, sin secretos, son `.env.local.example` (ambiente local), `.env.hetzner.example` (VM) y `.env.example` (producción de referencia y DEV); los archivos reales (`.env.local`, `.env.hetzner`, `.env`, `.env.dev`) no se versionan.

| Variable | Descripción |
|----------|-------------|
| `DB_URL`, `DB_USERNAME`, `DB_PASSWORD` | Base `gestionturnos`, lectura y escritura. Obligatorias |
| `HOSPITAL_DB_URL`, `HOSPITAL_DB_USERNAME`, `HOSPITAL_DB_PASSWORD` | Vista `viewPersonal` del hospital, solo lectura (en producción, un usuario con `SELECT` solo sobre esa vista). Obligatorias |
| `JWT_SECRET` | Secreto de firma de los JWT: 32 caracteres o más, aleatorio y distinto por ambiente. Obligatoria |
| `DDL_AUTO` | Estrategia de Hibernate: `validate` en todos los ambientes (el esquema debe existir antes de arrancar). Obligatoria |
| `CORS_ALLOWED_ORIGINS` | Orígenes exactos, separados por coma. Obligatoria en los compose de producción y de la VM |
| `SWAGGER_ENABLED` | Swagger UI y la especificación OpenAPI. Por defecto `false` |

El token JWT dura 24 h y el datasource del hospital se abre en solo lectura. La imagen del backend fija `TZ=America/Santiago`. Todas las variables (backend, compose, scripts, frontend y pruebas) están en `docs/TRASPASO.md` §4.

## Pruebas

```bash
# Backend, unitarias (495 pruebas; sin Docker)
cd huap_backend
./mvnw test -Dtest='!*IntegrationTest,!*ConcurrencyTest,!LockBenchmark'

# Backend, todo (requiere Docker: Testcontainers). Hoy fallan 26 pruebas de integración, ya documentadas
./mvnw test

# Frontend: lint y build
cd ../sgt-huap_frontend
npm run lint
npm run build

# E2E (con el ambiente local arriba y el frontend en http://localhost:5173)
npx playwright install chromium
TMPDIR=~/.cache/sgt-pw-tmp npx playwright test e2e/hu/ --project=movil --project=desktop          # solo lectura
SGT_MUTA=1 npx playwright test e2e/hu-muta/ --project=movil --project=desktop                       # escribe en la base local
```

`e2e/hu-muta/` escribe: después hay que restaurar la base local y reiniciar el backend. El estado de cada suite, las reglas de las pruebas E2E y las pruebas integrales basadas en reglas están en `docs/TRASPASO.md` §7.

## Estructura del repositorio

```
.
├── huap_backend/            # API REST Spring Boot (Java 21)
│   └── src/main/java/com/pingeso/HUAP/
│       ├── Controller/  Service/  Repository/  Entity/  DTO/
│       ├── Security/    Config/   Utils/
├── sgt-huap_frontend/       # SPA React 19 + Vite + Tailwind
│   ├── src/{components,services,context,utils,config}/
│   └── e2e/                 # Pruebas Playwright (hu/, hu-muta/, visual/)
├── BaseDatosMySQL/          # SQL: desarrollo/ (seed ficticio), despliegue/ (VM y base nueva), migraciones/ (V2, V3)
├── scripts/                 # Generación de turnos, despliegue y operación de la VM
├── requerimientos/          # R1–R18 y paquete de traspaso de R1–R9
├── docs/                    # Traspaso, despliegue de la VM, QA (catálogo y pruebas integrales), seguridad, API, desktop
├── apache/  nginx/          # Balanceador Apache (en uso) y alternativa Nginx (sin uso)
├── docker-compose.local.yml     # Ambiente local autocontenido
├── docker-compose.hetzner.yml   # VM de demostración
├── docker-compose.yml           # Producción de referencia (3+3 y balanceador; bases externas)
├── docker-compose.dev.yml       # DEV del equipo anterior (bases reales de la red del hospital)
└── .env.example  .env.local.example  .env.hetzner.example   # Plantillas de variables, sin secretos
```
