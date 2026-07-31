# SGT-HUAP — Sistema de Gestión de Turnos

**Plataforma web para la gestión de turnos del personal del Hospital de Urgencia Asistencia Pública (HUAP).**

![Java](https://img.shields.io/badge/Java-21-orange)
![Spring Boot](https://img.shields.io/badge/Spring%20Boot-4.0-brightgreen)
![React](https://img.shields.io/badge/React-19-blue)
![Vite](https://img.shields.io/badge/Vite-7-purple)
![MySQL](https://img.shields.io/badge/MySQL-8.0-blue)
![Docker](https://img.shields.io/badge/Docker-Compose-blue)

El sistema permite planificar, asignar y gestionar los turnos del personal por servicio y puesto, gestionar solicitudes de intercambio y ofertas de turnos, notificaciones, bitácora de auditoría y estadísticas, con autenticación y autorización basada en roles.

---

## Índice

- [Características](#características)
- [Arquitectura](#arquitectura)
- [Stack tecnológico](#stack-tecnológico)
- [Requisitos previos](#requisitos-previos)
- [Inicio rápido (desarrollo)](#inicio-rápido-desarrollo)
- [Despliegue (producción)](#despliegue-producción)
- [Desarrollo local sin Docker](#desarrollo-local-sin-docker)
- [Configuración](#configuración)
- [Tests](#tests)
- [Documentación](#documentación)
- [Estructura del repositorio](#estructura-del-repositorio)

---

## Características

- 🗓️ **Planificación de turnos** por servicio, puesto y tipo de turno, con rotativas.
- 👥 **Gestión de personal** (funcionarios) y asignación a servicios con roles por servicio.
- 🔄 **Solicitudes** de intercambio y **ofertas** de turnos (generales y particulares).
- 🔔 **Notificaciones** internas.
- 📋 **Bitácora** de auditoría de acciones.
- 📊 **Estadísticas** y **exportación** a CSV.
- 📆 **Feriados** y reglas de horarios por servicio.
- 🔐 **Autenticación JWT** y autorización por rol de sistema y rol de servicio.

## Arquitectura

Despliegue de referencia con balanceo de carga: un **balanceador Apache httpd** enruta el tráfico a **3 instancias de frontend** (build de React servido con Apache httpd) y **3 instancias de backend** (Spring Boot). Cada backend usa **dos conexiones a base de datos**: la **BD propia del SGT** (`gestionturnos`, lectura/escritura) y la **vista de personal del hospital** (`viewPersonal`, **solo lectura**, para el login y el alta de personal).

```
Cliente ──▶ Apache LB (:5173) ──┬──▶ Frontend ×3 (Apache httpd + build React)
                                └──▶ /api/v2/* ──▶ Backend ×3 (Spring Boot :8080) ──┬──▶ MySQL gestionturnos (R/W)
                                                                                    └──▶ MySQL hospital · viewPersonal (solo lectura)
```

## Stack tecnológico

| Capa | Tecnologías |
|------|-------------|
| **Backend** | Java 21, Spring Boot 4, Spring Data JPA, Spring Security + JWT (jjwt), Spring Mail, Maven |
| **Frontend** | React 19, Vite 7, Tailwind CSS 3, React Router 7, Axios, dayjs |
| **Base de datos** | MySQL 8.0 — dos datasources: `gestionturnos` (app, R/W) y `viewPersonal` del hospital (solo lectura) |
| **Infraestructura** | Docker, Docker Compose, Apache httpd (balanceador de carga y servido de estáticos del frontend) |

## Requisitos previos

- **Docker** y **Docker Compose** (vía cualquiera de los flujos con contenedores).
- Para desarrollo sin Docker: **JDK 21**, **Node.js 18+** y **MySQL 8.0**.

## Inicio rápido (desarrollo)

El backend se conecta a las **dos bases de datos externas reales** (no se levanta ninguna BD local). Necesitas un archivo `.env.dev` con las credenciales reales (no versionado — pide una copia a tu equipo o generá una a partir de `.env.example`):

```bash
cp .env.example .env.dev   # y completa los valores reales
docker compose -f docker-compose.dev.yml --env-file .env.dev up -d --build
```

Esto levanta:
- **Backend** en `http://localhost:8080` (API bajo `/api/v2`; Swagger UI habilitado en dev en `/swagger-ui.html`), conectado a la BD `gestionturnos` externa y a la vista `viewPersonal` del hospital (externa, solo lectura).
- **Frontend** en `http://localhost:5173`.

Verifica el backend:

```bash
curl http://localhost:8080/api/v2/health
```

Detalle completo (arquitectura, variables, troubleshooting de conectividad): [`docs/AMBIENTE_DEV.md`](docs/AMBIENTE_DEV.md).

## Despliegue (producción)

El compose de producción (`docker-compose.yml`) levanta **solo la app** (3 backends + 3 frontends detrás del balanceador Apache); **no incluye ninguna base de datos**. Cada backend recibe por `.env` las **dos conexiones**: la BD propia del SGT (`gestionturnos`) y la vista de personal del hospital (`viewPersonal`, solo lectura).

```bash
# 1. Crea el archivo .env a partir de la plantilla y completa los valores reales
cp .env.example .env
#    (DB_URL/USERNAME/PASSWORD de gestionturnos, HOSPITAL_DB_* de la conexión del hospital,
#     JWT_SECRET y DDL_AUTO — ver la sección Configuración)

# 2. Asegura que la BD de la app existe con su esquema.
#    Si aún no está creada, cárgala con el script de solo estructura:
#    mysql -u <user> -p < BaseDatosMySQL/despliegue/schema_gestionturnos.sql

# 3. Construir y levantar
docker compose up -d --build

# 4. Verificar
docker compose ps
curl http://localhost:5173/api/v2/health
```

La aplicación queda disponible en `http://localhost:5173` (puerto externo del balanceador; el `80` interno se mapea a `5173` porque el `80` del router suele estar bloqueado).

> 📱 Para acceder desde el celular u otro equipo de la red local, entra a `http://<IP-de-tu-PC>:5173` (misma Wi‑Fi) y abre el puerto `5173` en el firewall de Windows.

> ⚠️ **Seguridad:** las credenciales y el secreto JWT se externalizan en un archivo `.env` (ignorado por Git; ver `.env.example`). Antes de un despliegue real, rota el secreto JWT y usa un usuario de BD sin privilegios de `root`.

## Desarrollo local sin Docker

**Backend** (requiere MySQL corriendo con la BD `gestionturnos` y acceso a la vista `viewPersonal` del hospital):

El backend exige **ambos** datasources configurados por variables de entorno (no traen valor por defecto). Defínelas antes de arrancar; por ejemplo, apuntando a un MySQL local con los dos esquemas:

```bash
cd huap_backend
export DB_URL="jdbc:mysql://localhost:3306/gestionturnos"
export DB_USERNAME="root" DB_PASSWORD="tu_clave"
export HOSPITAL_DB_URL="jdbc:mysql://localhost:3306/innhosp"
export HOSPITAL_DB_USERNAME="root" HOSPITAL_DB_PASSWORD="tu_clave"
export DDL_AUTO="update" JWT_SECRET="secreto-largo-de-desarrollo-min-32-chars"
./mvnw spring-boot:run
```

Para desarrollo lo más simple es usar el compose de dev, que ya apunta a las BD externas reales (ver [Inicio rápido](#inicio-rápido-desarrollo)). Si necesitas trabajar sin conectividad a esas BD, puedes levantar tu propio MySQL local con los scripts de `BaseDatosMySQL/desarrollo/` (ya no se orquesta automáticamente vía Docker) y apuntar `DB_URL`/`HOSPITAL_DB_URL` a él. Detalle de variables en [Configuración](#configuración).

**Frontend**:

```bash
cd sgt-huap_frontend
npm install
npm run dev
```

## Configuración

La configuración del backend está en [`huap_backend/src/main/resources/application.properties`](huap_backend/src/main/resources/application.properties) y toma todos sus valores de variables de entorno. En producción se cargan desde un archivo `.env` (ignorado por Git; plantilla en [`.env.example`](.env.example)).

| Variable | Descripción | Obligatoria |
|----------|-------------|-------------|
| `DB_URL` | URL JDBC de la BD de la app (`gestionturnos`), R/W | Sí |
| `DB_USERNAME` / `DB_PASSWORD` | Credenciales de la BD de la app | Sí |
| `HOSPITAL_DB_URL` | URL JDBC de la BD del hospital (vista `viewPersonal`), solo lectura | Sí |
| `HOSPITAL_DB_USERNAME` / `HOSPITAL_DB_PASSWORD` | Credenciales del hospital (usuario con solo `SELECT`) | Sí |
| `DDL_AUTO` | Estrategia de esquema de Hibernate — `validate` tanto en dev como en prod (ambas BD son externas/compartidas; `update` solo si se apunta a una BD local desechable) | Sí |
| `JWT_SECRET` | Secreto de firma de los JWT (≥ 32 caracteres, aleatorio) | Sí |
| `SWAGGER_ENABLED` | Expone Swagger UI y la spec OpenAPI (`true` en dev, `false` en prod) | No (por defecto `false`) |
| `SERVER_ID` | Identificador de la instancia (para health/info) | No |

> El datasource del hospital se abre en **solo lectura** (`hikari.read-only=true`) con un pool pequeño: la app nunca escribe en la BD del hospital. El token JWT expira a las 24 h (`app.jwt.expiration=86400000`).

## Tests

```bash
cd huap_backend
./mvnw test
```

La suite incluye tests unitarios de *services* (Mockito), de integración de repositorios (`@DataJpaTest` + Testcontainers MySQL) y pruebas de concurrencia.

## Documentación

La documentación sigue un modelo por **capas**:

| Capa | Qué responde | Dónde |
|------|--------------|-------|
| **API** | Cómo consumir la API REST | Swagger UI en `/swagger-ui.html` (solo en desarrollo); spec en [docs/api/](docs/api/) |
| **Código** | Qué hace cada clase/función | Javadoc (`./mvnw javadoc:javadoc` → `target/reports/apidocs/`) y JSDoc en el frontend |
| **Manuales de usuario** | Cómo usar el sistema | [docs/manuales-usuario/](docs/manuales-usuario/) |

Documentos adicionales: [docs/AMBIENTE_DEV.md](docs/AMBIENTE_DEV.md) (guía completa del ambiente de desarrollo) e [INFORME_PROYECTO.md](docs/INFORME_PROYECTO.md) (informe técnico histórico).

## Estructura del repositorio

```
.
├── huap_backend/          # API REST Spring Boot (Java 21)
│   └── src/main/java/com/pingeso/HUAP/
│       ├── Controller/  Service/  Repository/  Entity/  DTO/
│       ├── Security/    Config/   Utils/
├── sgt-huap_frontend/     # SPA React 19 + Vite + Tailwind
│   └── src/{components,services,context,utils}/
├── apache/                # Configuración del balanceador Apache (en uso)
├── nginx/                 # Configuración Nginx alternativa (histórica, no usada por el compose)
├── BaseDatosMySQL/        # Scripts SQL: desarrollo/ (fuente) y despliegue/ (generados)
├── docs/                  # Documentación (API/OpenAPI, manuales, informe técnico, AMBIENTE_DEV.md)
├── .env.example           # Plantilla de variables (base de .env y .env.dev), sin secretos
├── .env.dev               # Variables reales de DEV (NO versionado, ver .gitignore)
├── docker-compose.yml     # Despliegue producción (3+3 + LB, solo app; BDs externas por .env)
└── docker-compose.dev.yml # Desarrollo (solo app; BDs externas reales por .env.dev)
```