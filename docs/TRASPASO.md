# Traspaso del SGT-HUAP a TIC HUAP

> Estado al 22 de octubre de 2026, sobre el commit `dedb478` de la rama `desktop-todas-las-pantallas`. Cada comando, ruta, puerto y variable de este documento sale de un archivo de este repositorio; lo que no se pudo comprobar leyendo el repositorio lo dice el texto. Los documentos que enlaza tienen el detalle.

| | |
|---|---|
| Sistema | SGT-HUAP: Sistema de Gestión de Turnos del Hospital de Urgencia Asistencia Pública |
| Quién entrega | Álvaro, autor de la etapa actual del sistema |
| Quién recibe | Arturo, TIC HUAP: queda a cargo de operarlo y mantenerlo |
| Congelamiento del código | vie 30 oct 2026 |
| Fecha de entrega | mar 3 nov 2026, a distancia |
| Rama y commit de la entrega | `main`, que se adelanta (avance rápido) hasta `desktop-todas-las-pantallas`. commit: se anota al congelar (30 oct) |

Este documento es un índice operativo: dice dónde está cada cosa, en qué estado quedó y qué falta.

---

## 0. En una pantalla

- **Estado funcional:** 77 historias de usuario catalogadas: 69 implementadas, 1 parcial, 3 sin pantalla (solo por API), 3 no disponibles en la entrega (las de notificaciones, con la bandeja oculta) y 1 retirada (§8).
- **Requerimientos:** R1–R9 aprobados; R10–R17 pendientes de visto bueno; R18 (desktop en todas las pantallas) implementado y sin revisión (`requerimientos/README.md`).
- **Decisiones:** Álvaro respondió 33 de las 34 con ID el 17 oct; la 34.ª (S-02, las direcciones de red del repositorio) la decide TIC. Se implementaron del 17 al 19 oct, y el 22 oct salieron tres correcciones más de las pruebas integrales (§9).
- **VM de demostración:** corre el cierre desde el 19 oct y las correcciones del 22 oct. El servidor no se entrega: sigue a cargo de Álvaro como demostración hasta que TIC tenga su propio ambiente (§6.1).
- **Pruebas:** 495 pruebas unitarias del backend pasan (23 oct); siguen fallando 26 de integración, ya documentadas; el lint del frontend está sin problemas; las E2E de solo lectura quedaron en verde el 19 oct. De las pruebas integrales basadas en reglas (32 historias, 249 casos) se ejecutaron 20 en la VM; el resto lo corre TIC con el plan (§7).
- **Seguridad, pendiente ya:** la cuenta de administrador de arranque de la demostración usa la clave común de desarrollo, que está en este repositorio público, y la VM se abre desde internet por HTTP. Hay que cambiar esa clave o desactivar la cuenta (§6.1, §11).
- **No está listo para datos reales ni para internet.** Antes hay que cerrar, al menos: TLS, rate limiting, el filtro del administrador en solicitudes, las 26 pruebas de integración y el hash heredado de claves (§6.2, §11).
- **Incidente de datos de agosto:** todos sus pendientes pasan a TIC HUAP (§10).

---

## 1. Qué es y qué se entrega

El SGT-HUAP planifica los turnos del personal por servicio, puesto y rotativa (un molde de planificación genera los turnos reales), muestra la agenda propia y el calendario del servicio, y gestiona los cambios: permiso, botar turno, cobertura de un cupo libre, intercambio, oferta particular y oferta general con postulaciones. La jefatura aprueba o rechaza, asigna turnos a mano y lleva bitácora, auditoría de asistencia, estadísticas y exportaciones CSV. El login usa RUT y clave, validados contra la vista de personal del hospital (`innhosp.viewPersonal`, solo lectura), en dos pasos: credenciales y elección de servicio. Bajo 1200 px de ancho la app se ve como móvil; desde 1200 px, con menú lateral (R16–R18). Las notificaciones existen en el código, pero la bandeja está oculta en la entrega (C-09, §11).

| Rol | Tipo | Qué hace |
|---|---|---|
| Funcionario (`MEDICO`) | rol de servicio | Ve su agenda y el calendario, pide y responde cambios, postula a ofertas, exporta sus turnos y ve el historial del turno que tiene |
| Jefatura (`JEFATURA`) | rol de servicio | Lo anterior, más: decide solicitudes y ofertas, asigna turnos, suma personal a su servicio como Médico, designa y quita subrogantes (no jefaturas), gestiona puestos y ve estadísticas, bitácora y auditoría de su servicio |
| Subrogante (`SUBROGANTE`) | rol de servicio | Decide solicitudes y ofertas, asigna turnos, gestiona puestos y ve estadísticas, bitácora y auditoría. No designa jerarquía ni suma personal, y el backend se lo niega (C-03) |
| Administrador (`ADMINISTRADOR`) | rol de sistema | Administración global: servicios, personal del sistema, asignación a servicios, jerarquía (también designa jefaturas), tipos de turno, rotativas, planificación y reglas de horario |

Menús y paneles por rol: `docs/qa/HISTORIAS_DE_USUARIO.md` §2.2.

### Qué se entrega

| Pieza | Estado |
|---|---|
| Código | Repositorio git público con backend, frontend, SQL, scripts y documentación. Rama y commit: tabla de arriba |
| Forma de entrega | El enlace del repositorio en GitHub y este documento. TIC lo clona o hace un fork (decisión del 22 oct). Una copia para el HUAP, si se hace, sale de un clon nuevo de GitHub y no de la carpeta de trabajo del autor (P-03) |
| Documentación | Este índice y los documentos vigentes del §2 |
| VM de demostración | No se entrega el servidor. Sigue a cargo de Álvaro como demostración hasta que TIC tenga su propio ambiente (§6.1) |
| Accesos | No se traspasa ninguno. El repositorio es público, y no se entregan claves de servidores. Las claves de las bases, el secreto JWT y los archivos `.env` los crea nuevos quien levanta cada ambiente (§4) |
| Licencia | El repo no tiene archivo LICENSE |

Ramas en GitHub: `main` (la entrega), `desktop-todas-las-pantallas` (donde se hizo el trabajo, con el historial de R1–R18) y `claude/gitlab-repo-clone-mmcq8a` (histórica, R1–R17 al 28 ago; no se usa). Un clon nuevo de GitHub no trae `upstream/main` (el repositorio del equipo original, con los archivos del incidente de agosto, §10) ni `.pilot/` (notas de las sesiones de agosto, retirado del árbol el 17 oct por P-03 y presente en el historial), ni el trabajo sin versionar de la carpeta del autor.

**Otro repositorio con datos reales.** `requerimientos/README.md` y `requerimientos/TRASPASO.md` describen otro repositorio donde el mismo sistema corre conectado a la base real de `innhosp`, y traen un paquete de traspaso solo para R1–R9 (`requerimientos/traspaso/`). R10–R18 no tienen paquete. Dónde está ese repositorio, quién lo administra y si se le aplicó R1–R9 no consta en este repositorio. TIC decide si porta R10–R18 a ese repositorio o si este pasa a ser la base (decisión del 22 oct).

---

## 2. Mapa del repositorio

| Ruta | Qué es |
|---|---|
| `huap_backend/` | API REST, Java 21 y Spring Boot `4.0.0-SNAPSHOT`. Paquetes `Controller`, `Service`, `Repository`, `Entity`, `DTO`, `Security`, `Config`, `Utils`; `hospital/` lee la vista de personal (solo lectura). `Security/SeguridadServicio` y `Security/AlcanceServicio` acotan lecturas y escrituras por servicio y dueño (C-17); `JwtAccessDeniedHandler` responde 403 (C-20) |
| `huap_backend/src/main/resources/application.properties` | Toda la configuración; los valores vienen de variables de entorno (§4) |
| `huap_backend/src/test/` | 28 clases de pruebas unitarias (495 pruebas, Mockito y JUnit), 8 de integración y concurrencia con Testcontainers y `LockBenchmark` (§7) |
| `sgt-huap_frontend/` | SPA React 19, Vite 7 y Tailwind 3 |
| `sgt-huap_frontend/src/components/Admin2/Prop4.jsx` | Navegación: no hay rutas, la app cambia de vista con `currentView` y lista blanca por rol |
| `sgt-huap_frontend/src/components/Desktop/`, `src/layout/` | Modo desktop (R16–R18) y el umbral de 1200 px |
| `sgt-huap_frontend/src/services/`, `src/utils/axiosConfig.js` | Llamadas a la API y cliente Axios (base `/api/v2`) |
| `sgt-huap_frontend/src/utils/` (`reglasTurno.js`, `reglasSolicitud.js`, `roles.js`, `rolesServicio.js`, `errores.js`) | Reglas del backend que la interfaz repite (solape, R13, vigencia de ofertas, segregación de funciones) y los mensajes de error. Si cambia una regla, cambia en los dos lados |
| `sgt-huap_frontend/src/config/funciones.js` | Interruptores de funciones: hoy solo `NOTIFICACIONES_HABILITADAS` (`false`, C-09) |
| `sgt-huap_frontend/e2e/`, `playwright.config.js` | Pruebas E2E y visuales con Playwright (§7) |
| `BaseDatosMySQL/desarrollo/` | Seed ficticio del ambiente local: esquema y datos de `gestionturnos` e `innhosp`, y `03_fechas_relativas.sql` |
| `BaseDatosMySQL/despliegue/` | SQL para una base nueva (esquema, bootstrap) y los datos de demostración de la VM |
| `BaseDatosMySQL/migraciones/` | `V2__planificacion_vigencia.sql` (no idempotente) y `V3__oferta_retirada.sql` (idempotente; estado `RETIRADA` de las ofertas, C-16) |
| `scripts/` | `generar_turnos_demo.sh` (local y VM), `generar_rotativa_urgencias.sh` (VM), `desplegar_frontend_hetzner.sh` y `desplegar_backend_hetzner.sh` con sus piezas comunes `_hetzner_comun.sh`, y `init_db.sh`, `mysql.sh`, `backup_mysql.sh` y `diagnostico_login.sh`, que leen `.env.hetzner` y el compose de la VM |
| `simulador-padron/` | Herramienta **solo de demostración**: página que agrega y saca personas de `innhosp.personalAux` en la copia ficticia de la VM y la pila local, para mostrar que al hospital entran y salen personas. En el hospital el padrón lo mantiene quien administra `innhosp`; no se despliega en producción. Perfil `demo` de los compose; ver su `README.md` |
| `docker-compose.local.yml` | Ambiente local autocontenido: MySQL con las dos bases, backend y, opcional, frontend |
| `docker-compose.hetzner.yml` | VM de demostración: MySQL interno, 1 backend y 1 frontend |
| `docker-compose.dev.yml` | DEV del equipo anterior: backend y frontend contra las dos bases reales de la red del hospital |
| `docker-compose.yml` | Producción de referencia: balanceador Apache, 3 frontends y 3 backends, bases externas |
| `apache/` | `httpd.conf` y `conf.d/` del balanceador de `docker-compose.yml`; `apache/dev/httpd.conf` es el proxy `/api/v2` del contenedor frontend (dev, local y VM) |
| `nginx/` | Alternativa sin uso en ningún compose |
| `.env.example`, `.env.local.example`, `.env.hetzner.example` | Plantillas de variables, sin secretos (§4) |
| `requerimientos/` | Un documento por requerimiento (R1–R18), índice y paquete de traspaso de R1–R9 |
| `docs/` | Traspaso, despliegue de la VM, QA, seguridad, API y desktop (tabla de abajo) |
| `node_modules/`, `package.json` y `package-lock.json` de la raíz, `.idea/`, `huap_backend/huap_run.log`, `sgt-huap_frontend/.scannerwork/` | Residuos versionados sin uso (§11) |

### Documentos: vigentes e históricos

| Documento | Último cambio | Estado | Por qué |
|---|---|---|---|
| `docs/TRASPASO.md` | 22 oct | **Vigente, principal** | Este índice |
| `docs/qa/HISTORIAS_DE_USUARIO.md` | 22 oct | **Vigente** | Estado de cada HU al 22 oct, decisiones (§5), orden de pruebas (§6) y limpieza del seed (§7). Los «Código hoy» de su §5 conservan lo que decía el código al 17 oct |
| `docs/qa/pruebas-integrales/` | 22 oct | **Vigente** | 32 historias y 249 casos basados en reglas, su plan de ejecución, supuestos y resultados (§7.3) |
| `requerimientos/README.md` y R1–R18 | 16 oct | **Vigente** | Qué se cambió, por qué y cómo probarlo. R18 trae los hallazgos del lote |
| `docs/desktop/GUIA-DESKTOP.md` | 16 oct | **Vigente** | Reglas para adaptar o crear pantallas desktop sin tocar el móvil |
| `docs/DESPLIEGUE_VM.md` | 17 oct | **Vigente** | Instalación y operación de la VM de demostración, sin construir en la VM |
| `docs/security/NOTA_INCIDENTE_DATOS_PERSONAL_GIT_2026-08-10.md` | 10 ago | **Vigente** | Pendientes del incidente (§10) |
| `docs/security/INTERNET_DEPLOYMENT_SECURITY_CHECKLIST.md`, `RESIDUAL_RISK_REGISTER.md` | 30 jul | **Vigentes como lista de pendientes** | Su estado al 22 oct está en §6.2 y §11 |
| `README.md` | 22 oct | **Vigente** | Arranque rápido, mapa de documentos y de scripts |
| `Archivo de funcionalidades.md` | 3 ago (C-05, 17 oct) | **Referencia con contradicciones** | Funciones (FUN-SGT) y reglas (RN-SGT). Donde contradice al código, manda el catálogo. Todavía dice que el médico aprueba solicitudes (C-02, §11) |
| `docs/api/README.md`, `openapi.json` | 26–29 jul | **Desactualizado** | La especificación versionada no trae `GET /turnos/intercambiables`, `PUT /solicitudes/{id}/cancelar`, `PUT /ofertas-generales/{id}/retirar` ni `PUT /funcionarios/{id}/quitar-subrogancia`. Regenerarla con el backend arriba (`docs/api/README.md` §Regenerar); las descripciones de los endpoints en el código sí están al día |
| `IMPLEMENTAR_DEV.MD`, `docs/AMBIENTE_DEV.md` | 31 jul | **Vigentes solo dentro de la red del hospital** | DEV contra las bases reales. Sin uso desde el 31 jul; si TIC mantiene ese ambiente lo sabe TIC, porque este repositorio no lo dice |
| `BaseDatosMySQL/README.md` | 17 oct | **Parcialmente desactualizado** | Suma V3, pero cita archivos que no existen y un flujo de dev que ya no aplica (§11) |
| `requerimientos/TRASPASO.md`, `requerimientos/traspaso/` | 23–25 ago | **Vigente solo para R1–R9** | Cómo llevar R1–R9 al otro repositorio (§1) |
| `REVISION_POST_CORRECCIONES_SGT.md` | 10 ago | **Histórico** | Informe de la corrección de seguridad del 6–10 ago. Sus abiertos están en §11 |
| `docs/security/` (auditoría fase 1, audit report, baseline, changelog, remediation plan, test results) | 30 jul–10 ago | **Históricos** | Fotos de la auditoría de julio y agosto. `SECURITY_ARCHITECTURE.md` y `THREAT_MODEL.md` sirven de contexto |
| `docs/qa/` (DEFECT_REGISTER, matrices, inventarios, casos de prueba, baseline, planes) | 30 jul–10 ago | **Históricos** | Auditoría QA de julio. Sus IDs (MF, IF, TC, BUG) siguen como trazabilidad del catálogo. `DEFECT_REGISTER.md` dice que ningún defecto se corrigió; el estado al 22 oct está en §11 |
| `docs/BRIEF-MODO-DESKTOP.md` | 26 ago | **Histórico** | Brief de diseño de R16 |
| `sgt-huap_frontend/README.md` | 14 abr | **Histórico** | Plantilla de Vite |

---

## 3. Levantar en local

Requisitos:

- Docker con Compose.
- Node `^20.19.0 || >=22.12.0`, que exige Vite 7 (la imagen del frontend usa Node 22).
- Java 21 solo para correr el backend o sus pruebas fuera de Docker.
- Puertos libres: 3306 (MySQL), 8080 (backend) y 5173 (frontend).

Pasos, desde la raíz del repo:

1. Crear el archivo de variables y completarlo:
   ```bash
   cp .env.local.example .env.local
   ```
   - `MYSQL_ROOT_PASSWORD`: una clave propia.
   - `DB_PASSWORD` y `HOSPITAL_DB_PASSWORD`: la misma clave, porque la plantilla conecta los dos datasources como `root`.
   - `JWT_SECRET`: generarlo con `openssl rand -base64 48`.
   - `.env.local` no se versiona.
2. Levantar la base y el backend:
   ```bash
   docker compose -f docker-compose.local.yml --env-file .env.local up -d db backend
   ```
   La primera vez construye la imagen del backend (Maven dentro de Docker, sin pruebas). MySQL 8.0 ejecuta los scripts de init una sola vez, al crear el volumen, en este orden:

   | Orden | Script |
   |---|---|
   | 10, 11 | `BaseDatosMySQL/desarrollo/innhosp/01_esquema.sql`, `02_datos.sql` |
   | 20, 21 | `BaseDatosMySQL/desarrollo/gestionturnos/01_esquema.sql`, `02_datos.sql` |
   | 30 | `BaseDatosMySQL/migraciones/V2__planificacion_vigencia.sql` |
   | 31 | `BaseDatosMySQL/migraciones/V3__oferta_retirada.sql` (el esquema base ya trae el cambio; es idempotente) |
   | 40 | `BaseDatosMySQL/desarrollo/gestionturnos/03_fechas_relativas.sql`: mueve el seed en semanas completas para que su primera semana quede como la semana pasada |

   El backend espera a que el healthcheck de la base vea la última tabla del init.
3. Comprobar el backend:
   ```bash
   curl http://localhost:8080/api/v2/health
   ```
4. Generar turnos vigentes (7 semanas de Urgencias desde el lunes actual, por la API, como el administrador del seed; fueron 1.470 turnos el 16 oct):
   ```bash
   bash scripts/generar_turnos_demo.sh
   ```
   Una vez por volumen: una segunda vigencia que se cruce con la primera se rechaza. Variables opcionales: `API`, `ORIGEN`, `RUT`, `CLAVE`, `SERVICIO`, `MOLDE`, `SEMANAS`.
5. Levantar el frontend:
   ```bash
   cd sgt-huap_frontend
   npm ci          # respeta el lockfile, como el Dockerfile
   npm run dev
   ```
6. Abrir **`http://localhost:5173`**. Usuarios de prueba y su clave: catálogo §2.1.

Notas:

- **`localhost`, no la dirección numérica de loopback.** El backend solo acepta los orígenes de `CORS_ALLOWED_ORIGINS` (en la plantilla local, `http://localhost:5173` y `http://localhost:8080`). El proxy de Vite reenvía `/api` a `localhost:8080` con el origen del navegador, así que una página abierta con la dirección numérica de loopback en el puerto 5173 recibe 403 del backend.
- Sin `.env` en `sgt-huap_frontend/`, Axios usa `/api/v2` y el proxy de Vite hace el resto.
- El servicio `frontend` de `docker-compose.local.yml` también publica el 5173 (Apache con proxy a `backend:8080`). Usar ese o `npm run dev`, no los dos.
- Swagger UI: `http://localhost:8080/swagger-ui.html` (la plantilla local trae `SWAGGER_ENABLED=true`).
- Hora: la imagen del backend fija `TZ=America/Santiago` (P-01), así que «hoy» y los turnos pasados se calculan en hora de Chile también de noche. Fuera de Docker, la JVM usa la zona del equipo, que debe ser la de Chile.
- Memoria: el compose fija la JVM en `-Xmx512m` y el buffer de InnoDB en 64 MB.
- Detener sin borrar datos: `docker compose -f docker-compose.local.yml --env-file .env.local down`. Recrear desde cero: §5.

---

## 4. Configuración y secretos

Backend (`application.properties`, por variables de entorno):

| Variable | Uso | Valor por defecto |
|---|---|---|
| `DB_URL`, `DB_USERNAME`, `DB_PASSWORD` | Base `gestionturnos`, lectura y escritura | Ninguno: obligatorias |
| `HOSPITAL_DB_URL`, `HOSPITAL_DB_USERNAME`, `HOSPITAL_DB_PASSWORD` | Base `innhosp`, vista `viewPersonal`, solo lectura | Ninguno: obligatorias |
| `DDL_AUTO` | Estrategia de Hibernate; todas las plantillas usan `validate` | Ninguno en `application.properties`; `docker-compose.yml` pone `validate` |
| `JWT_SECRET` | Firma de los JWT: 32 caracteres o más, aleatorio y distinto por ambiente | Ninguno: obligatoria |
| `CORS_ALLOWED_ORIGINS` | Orígenes exactos, separados por coma | Lista de `localhost`. Obligatoria en `docker-compose.yml` y en el compose de la VM |
| `LOGIN_LOCK_DURATION_MS` | Bloqueo del RUT tras 5 intentos fallidos | `900000` (15 min) |
| `SWAGGER_ENABLED` | Swagger UI y `/v3/api-docs` | `false` |
| `SERVER_ID` | Identificador de instancia en `/api/v2/health` | `backend-unknown` |

Fijos en el código: el JWT dura 24 h; la propiedad `huap.concurrencia.lock-pesimista` (bloqueo pesimista al tocar turnos) vale `true`; la imagen del backend fija `TZ=America/Santiago`.

Compose, scripts y frontend:

| Variable | Dónde |
|---|---|
| `MYSQL_ROOT_PASSWORD` | Compose local y de la VM |
| `JAVA_TOOL_OPTIONS` | La fijan los compose (memoria de la JVM) |
| `PUBLIC_BIND`, `PUBLIC_PORT` | Compose de la VM: dónde se publica el frontend |
| `BACKUP_DIR`, `RETENTION_DAYS` | `scripts/backup_mysql.sh` |
| `SEED_DEMO` | `scripts/init_db.sh`: carga el poblado de demostración |
| `SSH_HOST`, `DIR_REMOTO` | Los dos scripts de despliegue de la VM (por `scripts/_hetzner_comun.sh`) |
| `URL_PUBLICA`, `DATOS_DEMO` | `scripts/desplegar_frontend_hetzner.sh` |
| `MIGRACIONES_APLICADAS` | `scripts/desplegar_backend_hetzner.sh`: `1` = ya aplicaste a mano las migraciones nuevas en la base de la VM |
| `API`, `ORIGEN`, `RUT`, `CLAVE`, `SERVICIO`, `MOLDE`, `SEMANAS` | `scripts/generar_turnos_demo.sh` (el valor por defecto de `CLAVE` es la clave común de desarrollo; no se copia aquí) |
| `API`, `RUT`, `CLAVE`, `SERVICIO_NOMBRE`, `MOLDE_NOMBRE`, `DESDE`, `HASTA`, `ANCLA`, `PORCENTAJE`, `SIMULAR`, `REEMPLAZAR`, `EXCLUIR`, `REGLAS`, `ESPERA`, `ORIGEN`, `RESTAURAR_MOLDE`, `T3_*` | `scripts/generar_rotativa_urgencias.sh` (`RUT` y `CLAVE` sin valor por defecto: los pide) |
| `VITE_API_BASE_URL` | Base de la API, fijada al construir el frontend; por defecto `/api/v2` |
| `VITE_DEBUG` | Logs de Axios en la consola del navegador |
| `VITE_SOCKET_URL` | Está en las plantillas, pero ningún código la usa |
| `SGT_BASE_URL`, `PW_CHROMIUM_PATH`, `SGT_MUTA`, `SGT_VER_FALLAS`, `SGT_CLAVE_DEV`, `SGT_HOY`, `SGT_VISTAS` | Pruebas E2E (§7) |

Plantillas y archivos reales:

| Plantilla (versionada) | Archivo real (no versionado) | Lo usa |
|---|---|---|
| `.env.local.example` | `.env.local` | `docker-compose.local.yml` |
| `.env.hetzner.example` | `.env.hetzner` (vive en la VM) | `docker-compose.hetzner.yml` y los scripts de la VM |
| `.env.example` | `.env` y `.env.dev` | `docker-compose.yml` y `docker-compose.dev.yml` |

Nunca se versionan (`.gitignore`): `.env`, `.env.dev`, `.env.*.local`, `.env.local`, `.env.hetzner`, `backups/` y `.claude`. En el frontend (`sgt-huap_frontend/.gitignore`): `.env`, `.env.*`, `.env production`, y los resultados de Playwright (`e2e-results*/`, `e2e-report/`, `e2e/__pantallas__/`).

Reglas: secretos nuevos en cada ambiente; nunca reutilizar en el HUAP los del ambiente local ni los de la VM. La clave común de los usuarios ficticios del seed es de desarrollo: no va a ningún ambiente con datos reales.

**Datos de red publicados en el repo, que es público (S-02).** La IP de la VM de demostración (`.env.hetzner.example`, `scripts/desplegar_frontend_hetzner.sh`; hasta el 17 oct también en `.pilot/`, que sigue en el historial), direcciones de la red interna del hospital (`docker-compose.local.yml`, `docker-compose.hetzner.yml`, `IMPLEMENTAR_DEV.MD`, `docs/AMBIENTE_DEV.md`) y otra IP pública en `docs/security/SECURITY_AUDIT_REPORT.md`. Si se limpian antes de entregar y si se purga el historial lo decide TIC (Arturo, decisión del 17 oct); este documento no las repite.

---

## 5. Bases de datos

| Base | Para qué | Conexión | En local | En la VM |
|---|---|---|---|---|
| `gestionturnos` | Datos del SGT: servicios, funcionarios, turnos, rotativas, planificación, solicitudes, ofertas, notificaciones, bitácora | Datasource primario, lectura y escritura (`DB_*`) | `desarrollo/gestionturnos/01_esquema.sql` + `02_datos.sql` + V2 + V3 + `03_fechas_relativas.sql` | `despliegue/schema_gestionturnos.sql` + V2 + V3 + `bootstrap_inicial.sql` + poblado de demostración |
| `innhosp` | Padrón del hospital: login y alta de personal, por la vista `viewPersonal` | Datasource secundario de solo lectura (`hikari.read-only=true`, pool de 3; `HOSPITAL_DB_*`). En producción, un usuario con `SELECT` solo sobre `viewPersonal` | Stand-in: `desarrollo/innhosp/` (tabla `personalAux` y la vista) | Stand-in: `despliegue/setup_innhosp.sql`, solo si `innhosp` no existe |

- **Esquema:** sin Flyway ni Liquibase. Con `DDL_AUTO=validate` el esquema debe existir antes de arrancar el backend. Base nueva: esquema (los dos esquemas base ya traen el cambio de V3), luego `migraciones/` en orden (V2 no es idempotente; V3 sí) y luego `despliegue/bootstrap_inicial.sql` (roles, servicio inicial y un administrador de arranque con RUT de ejemplo; con una persona real se hace a mano y no se versiona). `scripts/init_db.sh` (VM) y `docker-compose.local.yml` aplican V2 y V3 solos. Hibernate con `validate` no revisa los valores de un enum: una migración como V3 va antes de desplegar el backend que la usa.
- **Login:** siempre contra `innhosp.viewPersonal`. Solo acepta SHA-512 sin sal (hex de 128 caracteres o binario de 64 bytes); un hash BCrypt se rechaza antes de comparar (`FuncionarioService.normalizeEncodedPassword`, comprobado el 23 oct). Pasar a un hash con sal es RR-001 (§11).
- **Seed local:** ficticio, con una clave común; usuarios de prueba en el catálogo §2.1. Las pruebas no usan al funcionario 4 ni sus datos (catálogo §7).
- **Datos de la VM:** `despliegue/poblado_urgencias_gestionturnos.sql` (lo carga `init_db.sh` con `SEED_DEMO=1`), más `personal_urgencias_innhosp.sql`, `turnos_agosto2026_urgencias.sql` y `fix_ruts_duplicados_innhosp.sql`, que se cargan a mano según sus encabezados. Los turnos de octubre a diciembre de 2026 de Urgencias se generaron el 20 oct con `scripts/generar_rotativa_urgencias.sh` (§6.1).

Recrear la base local desde cero (los scripts de init solo corren al crear el volumen; esto también recentra las fechas del seed en la semana actual):

```bash
docker compose -f docker-compose.local.yml --env-file .env.local down -v
docker compose -f docker-compose.local.yml --env-file .env.local up -d db backend
bash scripts/generar_turnos_demo.sh
```

Entre corridas de pruebas que escriben hay una vía más rápida: un respaldo de `gestionturnos` e `innhosp` tomado recién generados los turnos, que se restaura y después se reinicia el backend, porque guarda datos en una caché en memoria. Estos comandos (contenedores `huap-db-local` y `huap-backend-local` de `docker-compose.local.yml`) se usaron entre las corridas E2E del 17 al 19 oct, y el respaldo se volvió a comprobar el 22 oct:

```bash
# respaldo
docker exec huap-db-local sh -c 'exec mysqldump -uroot -p"$MYSQL_ROOT_PASSWORD" --databases gestionturnos innhosp --skip-dump-date 2>/dev/null' > base-pristina.sql
# restaurar y reiniciar el backend
docker exec -i huap-db-local sh -c 'exec mysql -uroot -p"$MYSQL_ROOT_PASSWORD" 2>/dev/null' < base-pristina.sql
docker restart huap-backend-local
```

`scripts/backup_mysql.sh` es el equivalente para la VM y apunta al compose de la VM. El volcado trae los datos del seed: no se versiona.

Reglas de datos:

- Nunca cargar datos reales en el ambiente local, en la VM ni en el repo. Las pruebas corren solo contra el seed ficticio.
- Nunca correr `setup_innhosp.sql` ni `poblado_urgencias_gestionturnos.sql` contra una base real: el primero vacía `personalAux` y el segundo vacía 20 tablas.
- Limpieza pendiente del seed: catálogo §7. D-01 a D-03 se dejan como están (§9).

---

## 6. Despliegue

### 6.1 VM de demostración (estado al 22 oct)

- **Topología** (`docker-compose.hetzner.yml`): MySQL con las dos bases, sin puertos publicados; 1 backend interno; 1 frontend Apache como única entrada, con proxy de `/api/v2` al backend. Límites de memoria por contenedor. La VM tiene 2 vCPU y unos 4 GB, y la comparte otro sistema.
- **Instalación desde cero y operación:** `docs/DESPLIEGUE_VM.md`: swap, clonar, `.env.hetzner`, `SEED_DEMO=1 bash scripts/init_db.sh`, subir las imágenes con los scripts, exponer y respaldos.
- **Desplegar:** `bash scripts/desplegar_frontend_hetzner.sh` y `bash scripts/desplegar_backend_hetzner.sh`. Cada uno exige que lo desplegado esté subido a GitHub, construye la imagen en el equipo de desarrollo desde el último commit, pone al día el checkout de la VM con GitHub, recrea solo su contenedor, guarda la imagen anterior como `previo-<fecha>` e imprime el comando para volver atrás. El del backend se detiene si hay migraciones nuevas sin aplicar (`MIGRACIONES_APLICADAS=1` después de aplicarlas a mano) y corta la API 1 a 2 minutos. Con `DATOS_DEMO=1`, el del frontend genera además turnos vigentes. La regla es no construir en la VM (`docs/DESPLIEGUE_VM.md`).
- **Operación:** `bash scripts/mysql.sh` (consola con utf8mb4; no usar `mysql` a mano), `bash scripts/backup_mysql.sh` (respaldo de las dos bases, comprimido y con rotación; cron sugerido en su encabezado) y `bash scripts/diagnostico_login.sh <rut>`.
- **Rotativa de Urgencias:** `scripts/generar_rotativa_urgencias.sh` (se corre en la VM, desde `/opt/sgt`) hace por la API, como administrador, lo que haría una persona en Planificación: completa los cupos libres del molde «Rotativa 2026» con médicos de Urgencias, genera los turnos de las seis rotativas para el rango pedido (por defecto, del 1 oct al 31 dic de 2026) con el ciclo de 42 días anclado para que «Lunes Turno (T III)» calce con el calendario real, y verifica contra la API. `SIMULAR=1` solo muestra qué haría; si en el rango ya hay turnos o vigencias, se detiene (`REEMPLAZAR=1` rehace solo desde mañana y nunca borra turnos empezados ni con solicitudes u ofertas); respalda el molde en `backups/` (se restaura con `RESTAURAR_MOLDE`). Pide RUT y clave del administrador y no trae claves. Se deshace anulando la vigencia desde Planificación.
- Sirve por HTTP, sin TLS, en un puerto público, con los datos de demostración.

**Qué ocurrió hasta el 22 oct** (registro de Álvaro):

| Fecha | Hecho |
|---|---|
| 17 oct | Álvaro respondió las 33 decisiones del cierre (§9) |
| 19 oct | Se desplegó en la VM todo el cierre. Se compiló en la VM porque al equipo de desarrollo no le alcanzaba la RAM (excepción a la regla de `docs/DESPLIEGUE_VM.md`). Antes se hizo un respaldo y después se aplicó la migración V3. Resultado, según Álvaro: «salió excelente» |
| 20 oct | Rotativa de Urgencias de octubre a diciembre de 2026 generada con `scripts/generar_rotativa_urgencias.sh`: 2760 turnos, 96,6 % con médico. El turno III calza con el calendario real |
| 20 oct | Ejecución de las pruebas integrales en la VM (20 casos; §7.3). Los turnos que movió volvieron a sus titulares |
| 22 oct | Se desplegaron las tres correcciones que salieron de las pruebas integrales: A1-07 (el aviso de choque de horario nombra el turno), O-1 (el historial muestra a quien tenía el turno al crearse) y O-2 (la auditoría cuenta un turno como pasado cuando ya terminó) |

- **Versión que corre hoy:** el cierre del 17 al 19 oct más las tres correcciones del 22 oct, es decir, el código de la rama hasta `dedb478`. Este documento lo toma del registro de Álvaro: no se comprobó entrando a la VM.
- **Respaldos:** antes del 19 oct la carpeta de respaldos tenía uno solo, del 21 ago. No hay evidencia de un cron diario: hay que tratar el respaldo automático como no activo hasta confirmarlo (`docs/DESPLIEGUE_VM.md` §Instalación, paso 7).
- **Clave de la cuenta de arranque (pendiente):** el administrador de arranque de la demostración (`bootstrap_inicial.sql`) usa la clave común de desarrollo, que está en el repositorio público, y la VM se abre desde internet. Hay que cambiar esa clave o desactivar la cuenta, y lo mismo con los usuarios ficticios del seed de despliegue cuando ya no se usen para demostrar. La clave no se escribe en este documento.

### 6.2 Qué falta para desplegar en infraestructura del HUAP

Base: `docs/security/INTERNET_DEPLOYMENT_SECURITY_CHECKLIST.md` y `RESIDUAL_RISK_REGISTER.md`, revisados contra el código al 22 oct.

| # | Qué falta | Referencia | Estado al 22 oct |
|---|---|---|---|
| 1 | TLS/HTTPS. Bloqueante | Checklist «HTTPS», RR-002 | Abierto: ninguna configuración de Apache tiene `VirtualHost *:443` ni `mod_ssl` |
| 2 | Lecturas sin control por servicio o por dueño | C-17, RR-004, BUG-002/004/006/007 | Corregido el 17 oct (`6cf4e00`). Queda el filtro del administrador en solicitudes (§11) |
| 3 | Las demás brechas de autorización | C-03, C-11, C-20, S-01 | Corregidas el 17 oct (§9) |
| 4 | `CORS_ALLOWED_ORIGINS` con el dominio definitivo | Checklist «Aplicación» | Pendiente del despliegue |
| 5 | Rate limiting en el borde o un WAF | RR-003 | Abierto: `apache/conf.d/rate_limiting.conf` solo tiene un `<IfModule>` vacío, el resto está comentado |
| 6 | Topología: `docker-compose.yml` (3+3 y balanceador, bases externas) o reducida. Con más de un backend, el bloqueo de login no se comparte | RR-008 | Por decidir |
| 7 | Bases: crear `gestionturnos` (esquema, V2, V3, bootstrap), un usuario de lectura y escritura solo en `gestionturnos` y uno con `SELECT` solo sobre `viewPersonal` real. Nada de los scripts stand-in | `BaseDatosMySQL/README.md` «Hospital real», `scripts/init_db.sh` paso 6 | Pendiente |
| 8 | Hash SHA-512 sin sal de las claves heredadas en `viewPersonal` | RR-001 | Abierto. Depende del dueño de `innhosp` |
| 9 | Secretos nuevos para el ambiente (JWT y bases), y ninguna cuenta con la clave común de desarrollo | Checklist «Secretos», §6.1 | Pendiente |
| 10 | Zona horaria | P-01 | Corregido el 17 oct: la imagen del backend fija `TZ=America/Santiago`. Los registros guardados antes de eso (en la VM, antes del 19 oct) quedaron con la hora UTC, unas horas adelantada; con una base con datos reales habría que revisarlos |
| 11 | Spring Boot GA en vez de `4.0.0-SNAPSHOT` | RR-006 | Abierto |
| 12 | Pruebas de integración en verde | RR-010, §7 | Abierto: fallan 26 |
| 13 | Respaldos cifrados, con restauración probada y copia fuera del servidor | Checklist «Base de datos», `docs/DESPLIEGUE_VM.md` (respaldos) | Pendiente. `backup_mysql.sh` es solo para la VM, y allí no hay evidencia de un cron |
| 14 | Firewall, SSH restringido, MySQL no expuesta, TLS en JDBC | Checklist «Red» y «Base de datos» | Pendiente, de infraestructura |
| 15 | Monitoreo y alertas, procedimiento de incidentes, plan de reversión | Checklist «Monitoreo» y «Continuidad» | Pendiente. Solo los scripts de despliegue de la VM (frontend y backend) dejan la imagen anterior para volver atrás |
| 16 | Healthchecks del balanceador de `docker-compose.yml` | `REVISION_POST_CORRECCIONES_SGT.md` §4 | Abierto, por lectura de la configuración (no se probó con el balanceador levantado): el `ProxyPass "/"` global de `frontend.conf` intercepta `/health` y `/apache-health`, y `/ready` apunta a `/api/v1/health`, que el backend no sirve |
| 17 | JWT en `localStorage` | RR-007 | Abierto, a evaluar |
| 18 | MFA para administradores | Checklist «Aplicación» | No implementado, a evaluar |
| 19 | Dependencias del frontend con avisos de `npm audit` | RR-005, §11 | Abierto: 17 vulnerabilidades en el `npm audit` del 22 oct |

---

## 7. Pruebas

### 7.1 Estado por suite

| Suite | Qué hay | Cómo se corre | Estado |
|---|---|---|---|
| Backend, unitarias | 28 clases (Mockito y JUnit), sin base ni contexto de Spring: 495 pruebas | `cd huap_backend && ./mvnw test -Dtest='!*IntegrationTest,!*ConcurrencyTest,!LockBenchmark'` | **495 pasan, 0 fallan** (23 oct; Maven 3.9.6 y Java 21). Es el filtro con que se obtuvo ese resultado |
| Backend, integración y concurrencia | 8 clases que heredan de `AbstractContainerTest` (MySQL 8.0 con Testcontainers y contexto completo de Spring), más `LockBenchmark`, que no calza con el patrón de nombres por defecto de Surefire. Requieren Docker | `./mvnw test` (corre todo, también estas) | **26 pruebas fallan, sin diagnosticar** (documentadas desde agosto). Pista, sin confirmar: `REVISION_POST_CORRECCIONES_SGT.md` §1.5 atribuye los errores a una causa común (el datasource del hospital no se configura en las pruebas) |
| Frontend, lint | ESLint | `cd sgt-huap_frontend && npm run lint` | **0 problemas** en todo el árbol (22 oct) |
| Frontend, build | Vite | `npm run build` | Pasa. Aviso de un chunk sobre 500 kB: el bundle principal pesa unos 980 kB (263 kB gzip, build del 19 oct; 965 kB el 16 oct) |
| Frontend, unitarias | No hay | | Sin pruebas unitarias |
| E2E visual | `e2e/visual/` (5 specs): una foto por pantalla y rol, e interacciones que abren y cancelan. No escriben en la base | `PW_CHROMIUM_PATH=/usr/bin/chromium npx playwright test e2e/visual --project=movil` | Las fotos de referencia no se versionan (dependen de los datos): en un equipo nuevo, generarlas primero con `--update-snapshots`. Las del autor están al día, pero **no hay una corrida final válida** (la del 19 oct se cortó por una caída de la red). Detalle: `docs/desktop/GUIA-DESKTOP.md` §8 |
| E2E por historia, solo lectura | `e2e/hu/` (9 specs): lecturas, negativos de permiso (fases 1, 2a y 2b) y las lecturas de C-17. Una guarda corta en el navegador toda escritura a la API | `TMPDIR=~/.cache/sgt-pw-tmp npx playwright test e2e/hu/ --project=movil --project=desktop --reporter=line` | **En verde el 19 oct**: desktop 191 y móvil 129 pasan, con las fallas esperadas marcadas. Después solo cambiaron las pruebas de HU-CAL-01 y HU-AUD-01 junto con sus correcciones |
| E2E por historia, que escriben | `e2e/hu-muta/` (9 specs): fase 3 (crear y cancelar con un solo usuario) y fase 4 (flujos de dos o tres usuarios con aprobación) | `SGT_MUTA=1 TMPDIR=~/.cache/sgt-pw-tmp npx playwright test e2e/hu-muta/ --project=movil --project=desktop --reporter=line` | **No hubo una corrida completa en verde con el código final.** La completa del 19 oct tuvo 5 fallas por proyecto, previstas porque las pruebas aún no recogían los cambios del cierre; se reescribieron y pasan al repetirlas por separado, pero después cambiaron un helper y la prueba de HU-ASG-02 criterio 4 (A1-07, 22 oct), y la suite completa no se volvió a correr. Falta una corrida completa (móvil y desktop, unos 25 min) y restaurar la base después |
| E2E, fases 5 y 6 | Mantenedores del servicio y administración global (catálogo §6.2) | | **No se automatizaron** (§11) |

### 7.2 Reglas de las pruebas E2E (cabecera de `playwright.config.js` y de `e2e/helpers/hu.js`)

- Requieren el ambiente local arriba (§3, con la hora de Chile) y el frontend en `http://localhost:5173` (`SGT_BASE_URL` lo cambia). Navegador: `npx playwright install chromium`, o uno del sistema con `PW_CHROMIUM_PATH`.
- Una prueba a la vez (`workers: 1`). Proyectos: `movil` (390×844), `desktop` (1366×768) y `desktop-fhd` (1920×1080, solo para fotos).
- `e2e/hu/` con barra final: el filtro es una expresión regular y `e2e/hu` también toma `e2e/hu-muta/`.
- `e2e/hu-muta/` escribe en la base: corre solo con `SGT_MUTA=1` y solo contra `localhost` o la dirección de loopback (IPv4 o IPv6); si no, se omite o falla. Después hay que restaurar la base y reiniciar el backend (§5).
- Las fallas conocidas se marcan con `fallaConocida('C-xx: …')` y las nuevas con `fallaNueva(…)`: la suite queda verde y avisa cuando una se corrige. `SGT_VER_FALLAS=1` las corre como pruebas normales. Quedan dos marcas (§11).
- Las pruebas de notificaciones están omitidas (`test.skip`) mientras la bandeja siga oculta (C-09).
- Si `/tmp` es un tmpfs chico, `TMPDIR` tiene que apuntar a disco: Chromium guarda ahí su memoria compartida.
- Resultados en `e2e-results/` y `e2e-report/` (no versionados).

### 7.3 Pruebas integrales basadas en reglas

Están en `docs/qa/pruebas-integrales/` (su `README.md` explica cómo usarlas): 32 historias y 249 casos de cinco flujos (asignación manual de la jefatura de Urgencias, cobertura, intercambio y ofertas, alta del servicio Medicina desde cero, y permisos, separación entre servicios y trazabilidad). Se diseñaron según las reglas que debe cumplir el sistema (inventario de los manuales, requerimientos R1–R18 y decisiones del 17 oct), **no según lo que el sistema hace hoy**: si hace algo distinto del resultado esperado, el caso es FALLA aunque «siempre haya funcionado así».

| Resultado al 22 oct | Casos |
|---|---|
| Ejecutados en la VM el 20 oct | 20: 18 pasan, 1 falla (A1-07, ya corregida el 22 oct) y 1 no aplica (A4-07: la auditoría solo ofrece meses pasados) |
| No aplican, por lectura del caso | 24 más (solo consola, o dependientes de una decisión) |
| No ejecutados | 205 (BLOQUEADO) |
| **Total** | **249** |

- **Por qué no se corrió el resto:** los agentes de navegador no pueden iniciar sesión (para entrar con cada actor hay que escribir su RUT y su clave), así que TIC las corre con el plan (`PLAN_EJECUCION.md`).
- **Hallazgos de la ejecución**, corregidos y desplegados el 22 oct: A1-07 (el aviso de choque no nombraba el turno), O-1 (el historial de creación del turno mostraba a quien lo ocupa ahora) y O-2 (la auditoría contaba como pasado el turno de hoy que aún no empezaba).
- Los turnos que la ejecución movió en la VM volvieron a sus titulares (diciembre quedó en 896 de 930 turnos asignados, como antes). Quedan como registro los eventos de la bitácora y una solicitud rechazada automáticamente. No queda nada pendiente ni a medio hacer.

---

## 8. Historias de usuario

Catálogo: **`docs/qa/HISTORIAS_DE_USUARIO.md`** (77 HU, criterios Dado/Cuando/Entonces, estado según el código, trazabilidad y prueba E2E de cada una). Sus estados están al día al 22 oct; el conteo se recalculó con un script a partir de su matriz.

Conteo por módulo y estado (§4.1 del catálogo):

| Módulo | HU | Implementada | Parcial | No implementada | No disponible en la entrega | Retirada | Contradicción |
|---|---|---|---|---|---|---|---|
| AUT Autenticación y servicio | 7 | 7 | 0 | 0 | 0 | 0 | 0 |
| CAL Calendario y turnos propios | 9 | 8 | 0 | 0 | 0 | 1 | 0 |
| DET Detalle de turno | 4 | 4 | 0 | 0 | 0 | 0 | 0 |
| SOL Solicitudes | 14 | 13 | 1 | 0 | 0 | 0 | 0 |
| OFE Ofertas y postulaciones | 5 | 5 | 0 | 0 | 0 | 0 | 0 |
| NOT Notificaciones | 3 | 0 | 0 | 0 | 3 | 0 | 0 |
| PAN Paneles de jefatura y subrogante | 3 | 3 | 0 | 0 | 0 | 0 | 0 |
| ASG Asignación de turnos | 5 | 4 | 0 | 1 | 0 | 0 | 0 |
| PER Personal del servicio | 2 | 2 | 0 | 0 | 0 | 0 | 0 |
| JER Jerarquía | 3 | 3 | 0 | 0 | 0 | 0 | 0 |
| PUE Puestos | 1 | 1 | 0 | 0 | 0 | 0 | 0 |
| EST Estadísticas | 1 | 1 | 0 | 0 | 0 | 0 | 0 |
| BIT Bitácora | 1 | 1 | 0 | 0 | 0 | 0 | 0 |
| AUD Auditoría | 1 | 1 | 0 | 0 | 0 | 0 | 0 |
| REG Reglas del servicio | 2 | 2 | 0 | 0 | 0 | 0 | 0 |
| ADM Administración | 13 | 11 | 0 | 2 | 0 | 0 | 0 |
| PRF Perfil | 1 | 1 | 0 | 0 | 0 | 0 | 0 |
| DSH Dashboard personal | 1 | 1 | 0 | 0 | 0 | 0 | 0 |
| PEN Registro pendiente | 1 | 1 | 0 | 0 | 0 | 0 | 0 |
| **Total** | **77** | **69** | **1** | **3** | **3** | **1** | **0** |

- **Parcial (1):** HU-SOL-02, criterio 3: el administrador ve permisos sin turno de otros servicios (§11).
- **Sin pantalla (3, solo por API):** HU-ASG-04 (cambiar el horario de un turno), HU-ADM-08 (duplicar una rotativa) y HU-ADM-12 (extender una vigencia).
- **No disponibles en la entrega (3):** HU-NOT-01 a HU-NOT-03, con la bandeja oculta (C-09).
- **Retirada (1):** HU-CAL-04, el aviso de cambio aprobado (C-05).
- Se agregó HU-JER-03, «Quitar la subrogancia» (`PUT /funcionarios/{id}/quitar-subrogancia?servicioId=`, decisión C-19).
- Las fases 5 y 6 de las pruebas E2E no se automatizaron (§7.1, §11).

---

## 9. Decisiones del cierre

Álvaro las respondió el 17 oct 2026 (33 de las 34 con ID; S-02 la decide TIC) y la implementación se hizo del 17 al 19 oct. El detalle de cada C-xx, con su decisión, está en el catálogo §5; de P-01, en R18 «Hallazgos» y en el catálogo §5.1. La última columna dice qué se hizo, con los commits (`git show <hash>`).

| ID | Decisión | Respuesta de Álvaro (17 oct) | Estado al 22 oct |
|---|---|---|---|
| D-01 | Un RUT del seed (funcionario 4) con dígito verificador válido, en los seeds de desarrollo y de despliegue | Se deja como está | Sin cambios |
| D-02 | Nombres del bloque de Urgencias del seed (ids 300–379) que podrían ser de personas reales | Son ficticios: se dejan | Sin cambios |
| D-03 | Un RUT que el encabezado de `BaseDatosMySQL/despliegue/turnos_agosto2026_urgencias.sql` declara real | Es el del autor del sistema: se deja | Sin cambios. Sigue en el historial de git |
| C-17 | Lecturas sin control por servicio o por dueño. Era el mayor riesgo abierto | Se corrige antes de entregar | Hecho (`6cf4e00`). Queda el filtro del administrador en solicitudes (§11) |
| C-03 | Facultades del subrogante | Decide solicitudes y ofertas, asigna turnos y gestiona puestos; no designa jerarquía ni suma personal, y el backend se lo niega | Hecho (`2c40015`, `3ff5adf`) |
| C-11 | Aprobación de intercambios sin que el backend revise la aceptación del receptor | El backend lo revisa al aprobar intercambios y ofertas particulares | Hecho (`9851953ffa`) |
| C-20 | Falta de permiso respondía 401 y cerraba la sesión (BUG-001) | 403 con aviso, sin cerrar la sesión | Hecho (`b9f237c`, `bd7e14e`, `64f6d35`) |
| S-01 | Verificaciones del dueño del turno al crear y aprobar solicitudes y ofertas | Se agregan; en las ofertas, quien participa no decide | Hecho (`130cf03`; interfaz: `a86d3f5`, `53266e1`) |
| S-02 | Direcciones de red en el repo público (bases del hospital en la red interna, IP de la VM, otra IP pública) | Lo decide TIC (Arturo) | **Pendiente de TIC** (§4, §11) |
| C-01 | Quién crea tipos de turno, rotativas y planificación (BUG-003) | Solo el administrador; se corrige el manual y se retiran las tarjetas ocultas | Hecho (`12cef0d`, `f5990c8`). Manual: §12 |
| C-02 | Confirmar que el médico no aprueba solicitudes (BUG-005) | Confirmado; se cierra BUG-005 y se corrigen el Archivo y la API | La API está corregida (`0131a5c`). **El Archivo de funcionalidades sigue diciendo que el médico aprueba** (§11) |
| C-04 | Descanso post nocturno (R13) en la asignación manual y en la planificación | R13 también en la asignación manual; la planificación queda como limitación conocida | Hecho en la asignación manual (`948e7bb`); la planificación sigue sin R13 |
| C-07 | Una o varias jefaturas por servicio, y qué designa la jefatura | La jefatura solo designa subrogantes; cuántas jefaturas por servicio lo decide TIC | Hecho (`94e8543`, `3ff5adf`). Cuántas jefaturas: **pendiente de TIC** |
| C-19 | Asignar a un servicio a quien ya pertenece le bajaba el rol a Médico sin aviso | Se resuelve con C-23; después se agregó la acción «Quitar subrogancia» | Hecho (`2c40015`, `91a8ee1`, `a1ca63b`) |
| C-23 | Si la jefatura suma funcionarios a su servicio | Suma a su servicio, como Médico, a quien no está; si ya pertenece, se avisa y no se cambia el rol | Hecho (`2c40015`) |
| C-15 | Aprobar un permiso no libera los turnos del período | El permiso es un registro: la jefatura libera a mano; se documenta | Documentado (§12) |
| C-13 | Tope de horas de una rotativa: aviso de 44 h en la pantalla, 24 h en el manual | Solo aviso sobre 44 h, sin bloquear; se corrige el manual | Sin cambio de código. Manual: §12 |
| C-12 | Eliminar un tipo de turno que usan rotativas | Se permite con aviso; se corrige el manual | Sin cambio de código. Manual: §12 |
| C-09 | Notificaciones: el sistema no las genera | Se implementan; si no alcanzan al 28 oct, se oculta la bandeja | **Bandeja oculta** el 19 oct (`50dce53`); no se implementaron (§11) |
| C-06 | «Ver historial» del médico | El médico ve el historial de sus turnos; la gestión, el del turno | Hecho (`15ed8f0`, `ed3bd09`, `d8f98f1`) |
| C-08 | El médico que exporta sus turnos | Exporta solo sus turnos (lo fuerza el backend) | Hecho (`7a6765e`) |
| C-10 | Reglas de horario para jefatura y subrogante | Solo el administrador; se cierra el backend | Hecho (`7dedd02`, `676acd2`). Manual: §12 |
| C-05 | Inicio en «Mis turnos» y aviso de cambio aprobado que nunca aparece | Queda «Mis turnos» y se retira el código del aviso | Hecho (`f73c691`). Manual: §12 |
| C-16 | Ofertas y cupos pasados a la vista; el ofertor no podía retirar su oferta | Mismo filtro de vigencia; el médico ve solo las abiertas; el ofertor retira mientras nadie la abra. **Ajustada el 20 oct:** el ofertor retira hasta que alguien postule | Hecho (`39549e5`, `e688fa1`, `3711dce`, `f33982d`, `18e8b28`). El ajuste del 20 oct también: la oferta se retira pendiente o abierta y sin postulaciones (409 si tiene una); sin migración, `RETIRADA` ya existía |
| C-14 | Auditoría de asistencia sin quién asignó | Se corrige el manual | Manual: §12. La pantalla no cambió |
| C-21 | Exportar la nómina del servicio: existía en el backend, sin pantalla | Se agrega el botón en Personal del servicio | Hecho (`c3166a6`) |
| C-22 | «Eliminar turnos generados»: la pantalla promete algo que el backend no cumple | Se corrige el texto; limitar el borrado queda para TIC | Texto corregido (`9224f80`). Limitar el borrado: **pendiente de TIC** |
| C-18 | Cómo se reconoce al administrador (`ADMIN` y `ADMINISTRADOR`) | Se unifica en `ADMINISTRADOR` | Hecho (`78d1590`, `8d390d2`) |
| R18-11 | Mostrar en el calendario qué cupos no puede tomar el médico | Después de la entrega | **Pendiente** (§11) |
| R18-6e | Confirmaciones en el molde de planificación | Se agregan las confirmaciones propuestas | Hecho (`bbf1563`): «Eliminar molde» en móvil y «Molde nuevo» con cambios sin guardar |
| R18-15 | Llevar al móvil las protecciones del Centro de operaciones (doble clic y turno ya cubierto) | Se llevan al móvil | Hecho (`d0f3064`) |
| P-01 | Corregir las fallas que no piden decisión (R18 «Hallazgos» y catálogo §5.1), incluida la zona horaria | Se corrigen todas, en móvil y desktop | Hecho el 17 oct, con la hora de Chile en la imagen del backend (`b684863`). Quedan dos: el seed de notificaciones y que `crearOferta` no revise si el turno está comprometido (§11) |
| P-02 | Cuándo subir a GitHub el catálogo y las pruebas E2E | Suben junto con las correcciones de seguridad | Hecho: están en GitHub |
| P-03 | Entregar desde un clon nuevo de `origin` y sin `.pilot/` | Clon nuevo y sin `.pilot/` | Hecho: `.pilot/` se retiró el 17 oct (`efede38`) |

Decisiones del traspaso (22 y 23 oct):

| Tema | Decisión |
|---|---|
| Rama de entrega | `main`, que se adelanta hasta `desktop-todas-las-pantallas`. El commit es el del congelamiento (vie 30 oct) |
| VM de demostración | Sigue a cargo de Álvaro como demostración hasta que TIC tenga su propio ambiente. El servidor no se entrega |
| Accesos | No se traspasa ninguno: el repositorio es público y TIC lo clona o hace un fork. No se entregan claves de servidores |
| Repositorio con la base real de `innhosp` | Lo decide TIC: si porta R10–R18 a ese repositorio o si este pasa a ser la base |
| Transición | Álvaro responde dudas hasta el 30 nov 2026, por correo |
| Vencimiento (23 oct) | «No deberían estar vigentes las solicitudes ocurridas en el pasado»: toda solicitud pendiente y toda oferta general pendiente o abierta cuyo turno ya empezó se cierra sola (RECHAZADA, «Venció: el turno ya comenzó»; sin migración). Tarea programada cada 3 minutos (`huap.vencimiento.intervalo-ms`) y, además, al leer las listas y antes de resolver; evento de sistema en la bitácora, sin actor. Catálogo C-24. Efecto en la VM: las solicitudes y ofertas pendientes del seed (turnos de mayo) vencen en la primera lectura |
| Turno pasado (23 oct) | «Sí yo podría poder cambiar en el sistema de turnos quién hizo el turno en el pasado como jefatura y admin»: en un turno ya terminado, la jefatura del servicio, el subrogante y el administrador asignan, quitan o cambian al médico (en uno empezado ya se podía, decisión del 20 oct). Se mantienen el choque de horario y la separación por servicio; el descanso posterior a una noche (R13) avisa y no bloquea; el médico común no puede. Bitácora: evento `CORRECCION_TURNO_PASADO` con quién lo hizo, el titular anterior y el nuevo. La auditoría y las estadísticas leen el titular del turno y reflejan la corrección. Sin migración. Catálogo C-24 |

---

## 10. Incidente de datos de agosto

Fuente: `docs/security/NOTA_INCIDENTE_DATOS_PERSONAL_GIT_2026-08-10.md`. En resumen: archivos con datos de personal y credenciales quedaron recuperables desde el historial git de tres repositorios públicos entre el 14 abr y el 10 ago de 2026. La remediación quedó parcial.

**Responsable de todos los pendientes desde la entrega: Arturo (TIC HUAP), por decisión de Álvaro.** Al 16 oct, TIC ya estaba eliminando la información expuesta (según Álvaro). Este repositorio no registra el estado actual de cada pendiente: lo confirma TIC. La tabla muestra el estado que registró la nota el 10 ago.

| Pendiente | Estado según la nota (10 ago) | Qué falta hacer |
|---|---|---|
| Rotar las 85 contraseñas afectadas | Pendiente: requiere acceso al sistema de autenticación del hospital | Coordinar con el dueño de ese sistema. La purga no revierte la exposición |
| Purgar el historial en el repositorio GitHub del equipo original | Pendiente, bloqueado por permisos (403) | Que el dueño de esa cuenta ejecute el push forzado o dé acceso. Comando en la nota §5 |
| Purgar el historial en el GitLab del hospital | Pendiente, bloqueado por la protección de ramas | Que un Maintainer u Owner habilite temporalmente el push forzado. Comando en la nota §5 |
| Avisar a quien tenga clones del GitLab ya purgado | Pendiente | Que vuelvan a clonar (no `git pull`): los hashes cambiaron |
| Evaluación formal por Legal o el DPO (Leyes 19.628 y 21.719) | Pendiente | Llevarles la nota, que está escrita para eso |
| Buscar otras copias de esos archivos (repos, respaldos, ambientes) | Recomendación de la nota §6 | Inventariarlas |

Lo que se ve desde el clon del autor (22 oct). Ojo con los nombres de remotos: en la nota, `origin` es el GitHub del equipo original; en el clon del autor, ese repositorio es `upstream` y `origin` es el GitHub del autor.

- El repositorio del autor en GitHub (remoto `origin`) no trae los archivos del incidente; donde el historial tenía el secreto JWT y la contraseña literales, hay marcadores de purga.
- **La purga en el repositorio del equipo original no se hizo.** Se comprobó el 22 oct con `git ls-remote upstream`: su rama principal sigue en el mismo commit del 14 abr que trae esos archivos en su árbol (el mismo que la ref local, traída el 11 sep).
- Relacionado: D-01 a D-03 se dejan como están (§9). Las direcciones de red publicadas en el repo las decide TIC (S-02). Si se confirma que son datos reales, se suman a la nota y a la purga. `.pilot/`, retirado el 17 oct, sigue en el historial de GitHub con la IP de la VM y el RUT de D-03.

---

## 11. Deuda técnica y pendientes para TIC

### 11.1 Lo que dejó el cierre

| Tema | Detalle | Estado |
|---|---|---|
| Notificaciones (C-09) | La bandeja está oculta tras el interruptor `NOTIFICACIONES_HABILITADAS` (`false`) en `sgt-huap_frontend/src/config/funciones.js`. El backend no genera avisos: los services de solicitudes y ofertas no crean ninguno, y `GestionTurnoService` llama a `crearNotificacionSistema` sin destinatario. El seed de Medicina Interna usa estados (`NO_LEIDA`, `LEIDA`) que el código no reconoce. Las pruebas están omitidas | Decidido el 19 oct. Para activarlas: crear los avisos con destinatario, corregir el seed, poner el interruptor en `true` y reactivar las pruebas (HU-NOT-01 a HU-NOT-03) |
| Filtro del administrador en solicitudes (C-17) | `SolicitudService.findAllSolicitudes` (cerca de la línea 52) le entrega todas al administrador, y el filtro de la vista, `!s.turno \|\| servicio activo`, deja pasar los permisos sin turno de otros servicios (la respuesta no trae los servicios del solicitante). Marca E2E en HU-SOL-02 criterio 3 | Abierto. Arreglo: acotar al servicio activo también para el administrador y quitar el `!s.turno \|\|` de la vista |
| `saveTurno` | `TurnoService.saveTurno` (`POST` y `PUT /turnos`, y `CAMBIAR_HORAS`) busca choques por fecha (`findConflictosByFuncionario` compara días, no horas): marca choque con cualquier turno de esos días aunque las horas no se crucen. La asignación manual sí compara horas (`validarSolape`) | Abierto |
| R13: 400 y 409 | En la asignación manual, R13 y el cruce de horario responden 409. Al crear o aprobar solicitudes y ofertas, la misma regla (`ConflictoAsignacionException`, una `RuntimeException`) sale por el manejador general como 400 | Abierto: unificar en 409 |
| Aviso de R13 | El mensaje de descanso post nocturno no nombra el tipo ni el servicio del turno que choca; el de cruce de horario sí (A1-07, 22 oct) | Abierto |
| Planificación sin R13 (C-04) | La generación de la planificación no aplica R13 | Limitación conocida (decisión del 17 oct) |
| Ofertas generales sin bloqueo (R12, R15) | `OfertaGeneralService.crearOferta` exige que el turno sea del ofertor, pero no que esté libre de otras solicitudes: un turno en oferta general se puede además botar o intercambiar | Abierto |
| `GET /turnos/intercambiables` | Con el turno propio comprometido devuelve una lista vacía sin decir por qué. La interfaz lo detecta con las solicitudes que ya cargó (`turnosComprometidos`) | Abierto, opcional |
| Calendario y cupos que el médico no puede tomar (R18-11) | Mostrar en el calendario qué cupos libres no puede tomar el médico y por qué (R9, R13), en móvil y desktop, en vez de que el backend rechace la solicitud | Decidido: queda para después de la entrega |
| «Eliminar turnos generados» (C-22) | Borra por las rotativas del molde dentro del rango, también turnos de otros moldes y manuales, y no anula la vigencia. La pantalla ya lo dice | Limitar el borrado a los turnos sin vigencia queda para TIC |
| Jefaturas por servicio (C-07) | El administrador puede dejar más de una jefatura por servicio sin aviso | Cuántas admite un servicio lo decide TIC |
| Editar o inactivar funcionarios | No hay pantalla para editar los datos de un funcionario ni para inactivarlo. En las pruebas integrales, A1-12, la parte de MX de A3-07 y E1-14 quedan como no aplicables | Abierto |
| Componentes de confirmación duplicados | `ConfirmacionDesktop` (`Desktop/turnos/ConfirmacionDesktop.jsx`) y `ConfirmacionPlan` (`Desktop/planificacion/piezas.jsx`) | Abierto: unificar |
| Bundle del frontend | El bundle principal pesa unos 980 kB (263 kB gzip; 965 kB el 16 oct). Aviso de Vite por un chunk sobre 500 kB | Abierto: dividir el código |
| Pruebas de integración | Fallan 26: todas las de las 8 clases que heredan de `AbstractContainerTest` (RR-010) | Abierto, sin diagnosticar (§7.1) |
| E2E: fases 5 y 6 | Mantenedores del servicio y administración global, sin automatizar | Abierto |
| E2E: corridas que faltan | `e2e/hu-muta/` completa en verde con el código final (después, restaurar la base) y la visual final (3 proyectos, sin actualizar las fotos) | Abierto |
| E2E: marcas que quedan | `fallaConocida` en HU-SOL-02 criterio 3 (`e2e/hu/solicitudes-ofertas.spec.js`) y en HU-AUD-01 criterio 4 (`e2e/hu/gestion.spec.js`; el criterio se retiró por C-14, así que esa prueba se retira o se invierte) | Abierto |
| Archivo de funcionalidades (C-02) | Sigue diciendo que el rol MEDICO aprueba solicitudes (§6.11, RN-SGT-019, RN-SGT-029, FUN-SGT-028 y flujo 19.6). El código y la descripción de la API dicen que no | Abierto: corregir el Archivo, como decidió C-02 |
| Clave de demostración | La cuenta de administrador de arranque de la VM usa la clave común de desarrollo, publicada en este repositorio | **Pendiente:** cambiar la clave o desactivar la cuenta (§6.1) |
| Direcciones de red en el repo público (S-02) | §4 | Lo decide TIC (Arturo) |

### 11.2 Seguridad y operación: estado de los registros de julio y agosto

| Registro | Tema | Estado al 22 oct |
|---|---|---|
| BUG-001 | Falta de permiso respondía 401 y cerraba la sesión | Corregido (C-20): `JwtAccessDeniedHandler` y `/error` público |
| BUG-002, 004, 006, 007; RR-004 | Lecturas sin control por servicio o dueño | Corregidos el 17 oct (C-17), salvo el filtro del administrador (11.1). La bitácora se filtra por servicio; el backend no pagina |
| BUG-003 | Permisos de tipos de turno, rotativas y planificación | Cerrado por decisión (C-01): solo el administrador. Manual: §12 |
| BUG-005 | El médico aprobaba solicitudes | Corregido en el código desde agosto (H-07) y en la descripción de la API; falta el Archivo (11.1) |
| BUG-008 | Una ruta inexistente responde 500 en vez de 404 | Abierto. Se observó en la auditoría de julio (T-22b); `GlobalExceptionHandler` sigue sin un manejador para rutas inexistentes (`NoResourceFoundException`) y su captura general responde 500 |
| RR-001 | Hash SHA-512 sin sal de claves heredadas | Abierto, depende del hospital |
| RR-002, RR-003 | Sin TLS; sin rate limiting en el borde | Abierto (§6.2) |
| RR-005 | Dependencias del frontend | `npm audit` del 22 oct sobre `package-lock.json`: 17 vulnerabilidades (15 altas, 2 moderadas, 0 críticas). Directas: `axios`, `react-router-dom`, `vite` y `tailwindcss`; el resto son transitivas, sobre todo de herramientas de build. Para `axios`, `react-router-dom` y `vite` npm informa una versión corregida; `tailwindcss` exige una versión mayor. El aviso de React Router es del modo RSC, que esta aplicación no usa (`App.jsx` usa `BrowserRouter`). No se aplicó ningún `npm audit fix` |
| RR-006 | Spring Boot `4.0.0-SNAPSHOT` con repositorio de snapshots (`huap_backend/pom.xml`) | Abierto: build no reproducible |
| RR-007 | JWT en `localStorage` (`src/utils/tokenManager.js`) | Abierto |
| RR-008 | Bloqueo de login en memoria por instancia | Abierto con varios backends; en la VM hay uno solo |
| RR-009 | `.env` del frontend versionados | Cerrado en este repo; siguen en el repositorio del equipo original |
| M-01 | Validación de entrada general (Bean Validation) | Abierto: `@Valid` aparece solo en `SolicitudController` (1 uso) de unos 129 mapeos |
| Healthchecks del balanceador | §6.2, punto 16 | Abierto |
| Respaldos de la VM | §6.1 | Sin cron comprobado |

### 11.3 Limpieza y documentación

| Tema | Evidencia | Estado |
|---|---|---|
| Seed por limpiar | Catálogo §7 (funcionario 4, bloque de Medicina Interna sin verificar, 9 RUT de Urgencias con dígito válido por azar, nombres de Urgencias), notificaciones con estados `NO_LEIDA` y `LEIDA`, RUT declarado real en un SQL de despliegue | D-01 a D-03 se dejan (§9); lo demás de §7 del catálogo sigue abierto |
| Especificación OpenAPI versionada | §2 | Abierto: regenerar |
| Sin CI, sin herramienta de migraciones, frontend sin pruebas unitarias | No hay configuración de CI versionada; `BaseDatosMySQL/README.md` («Migraciones incrementales»); `sgt-huap_frontend/package.json` sin script de pruebas | Abierto |
| Residuos versionados | `node_modules/` de la raíz (276 archivos) y su `package.json` con `socket.io-client`; `.idea/`; `huap_backend/huap_run.log`; `sgt-huap_frontend/.scannerwork/`; `VITE_SOCKET_URL` sin uso; `spring-boot-starter-mail` sin uso; `PasswordHashGenerator` con `main()` dentro del JAR (SEC-016) | Abierto |
| Documentación desalineada | `BaseDatosMySQL/README.md` cita `despliegue/datos_gestionturnos.sql` y `setup_*.sql` que no existen; encabezados de SQL que citan scripts inexistentes; `docs/AMBIENTE_DEV.md` se presenta como guía «local» pero exige la red del hospital; `docs/qa/DEFECT_REGISTER.md` dice que ningún defecto se corrigió | Abierto |
| Restos de `/api/v1` | `apache/conf.d/locations/health.conf` y `nginx/conf.d/locations/health.conf` apuntan `/ready` a `/api/v1/health`; `sgt-huap_frontend/Dockerfile` trae `/api/v1` como valor por defecto. El backend solo sirve `/api/v2` | Abierto |
| Zona horaria de los datos viejos | §6.2, punto 10 | Abierto, solo si se conservan datos anteriores al 17 oct |

---

## 12. Fe de erratas del manual

Los manuales de usuario y de administración de PINGESO no están en este repositorio. Las citas «MF-nnn» son las filas de `docs/qa/MANUAL_FUNCTIONAL_INVENTORY.md`, que a su vez cita los manuales; «Archivo» es `Archivo de funcionalidades.md`. «Qué hace el sistema» es el código al 22 oct. La decisión es la del 17 oct y sale de las líneas «Decisión» del catálogo §5.

| ID | Qué dice el manual | Qué hace el sistema | Decisión |
|---|---|---|---|
| C-01 | MF-024: agregar, editar e inhabilitar tipos de turno, «Admin/Jefatura/Subrogancia». MF-025: definir la secuencia de una rotativa, «Admin/Jefatura/Subrogante». MF-026: armar el molde, guardarlo y generar los turnos, «Admin/Jefatura» | Solo el administrador crea, edita y elimina tipos de turno, rotativas y planificación: el backend exige `ADMINISTRADOR` para `POST`, `PUT`, `DELETE` y `PATCH`, y el único acceso es el Panel de Administración y su menú. Los paneles de jefatura y subrogante ya no tienen esas tarjetas | Solo el administrador; corregir el manual |
| C-05 | MF-005: filtros del inicio «Todos / Mis turnos / Pendientes / Libres» | Los filtros son «Todos», «Mis turnos», «Solicitudes» y «Disponibles» (R1, R9), y el inicio abre en «Mis turnos». No existe «Aprobados» ni el aviso de cambio aprobado (el código se retiró) | Dejar «Mis turnos», documentarlo y actualizar el manual |
| C-12 | MF-024: inhabilitar un tipo de turno «exige que no esté asignado a ninguna rotativa» | Se puede eliminar un tipo de turno que usan rotativas. La pantalla avisa cuántas lo usan, y sus días en esas rotativas quedan libres | Permitir con aviso, como hoy; corregir el manual |
| C-13 | MF-025: «máximo 24 h asignables por semana» | Solo la interfaz avisa cuando el promedio de horas semanales del patrón pasa de 44 (`HORAS_SEMANALES_REF = 44`), y no bloquea. El backend no tiene tope | Que no bloquee y solo avise sobre las 44 horas; corregir el manual |
| C-14 | MF-032: la auditoría muestra los turnos totales, asignados y vacantes por mes «con el encargado de cada asignación» | Muestra el funcionario o «Vacante» y los totales, no quién hizo la asignación (eso está en la bitácora) | Corregir el manual |
| C-15 | Archivo, RN-SGT-017: «al aprobarse: Permiso/Botar turno liberan el turno». MF-007: crear un permiso con fecha de inicio y término deja «solicitud creada, pendiente» | El asistente de Permiso envía solo las fechas, sin turno. Aprobar un permiso creado desde la interfaz no cambia ningún turno (`cambiarEstado` libera el turno solo si la solicitud trae uno, como los permisos del seed) | El permiso es un registro: la jefatura libera a mano los turnos que correspondan, y se documenta |
| C-22 | La pantalla «Eliminar turnos generados» decía «No afecta otros moldes ni turnos fuera del rango». Archivo, RN-SGT-013, ya advertía el riesgo | Borra por las rotativas del molde dentro del rango: también turnos de otros moldes que usen esas rotativas y turnos manuales o del seed, y no anula la vigencia activa (que después impide volver a generar en ese rango). La pantalla ya lo dice (17 oct) | Corregir el texto y anotarlo como limitación; limitar el borrado queda para TIC |

Otras correcciones de documentación pendientes: el Archivo de funcionalidades sobre quién aprueba solicitudes (C-02, §11) y la especificación OpenAPI versionada (§2).

---

## 13. Transición

- Álvaro responde dudas hasta el **30 nov 2026**, por correo.
- Congelamiento del código: vie 30 oct 2026. Después de esa fecha, lo que no alcance queda en este documento como pendiente.
- La VM de demostración sigue a cargo de Álvaro hasta que TIC tenga su propio ambiente. Si TIC levanta uno, parte de un ambiente nuevo (§3 a §6) y con secretos nuevos.
- Primeros pasos sugeridos para TIC:
  1. Clonar `main` (o hacer un fork) y levantar el ambiente local (§3).
  2. Correr las pruebas (§7.1) y confirmar el punto de partida: unitarias del backend, lint y build del frontend.
  3. Leer el catálogo (§5 y §6.3), las decisiones del cierre y su estado (§9).
  4. Tomar los pendientes del incidente (§10) y las direcciones de red del repositorio (S-02, §4).
  5. Decidir cuál repositorio pasa a ser la base, este o el que corre con la base real (§1), y cuándo levantar un ambiente propio que reemplace a la VM de demostración, que mientras tanto sigue a cargo de Álvaro (§6.1).
  6. Correr las pruebas integrales con su plan (`docs/qa/pruebas-integrales/`) y repartir la lista de §11.
