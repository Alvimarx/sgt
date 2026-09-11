# BRIEF — SGT-HUAP (Fase 1: Comprensión)

## Qué es
Sistema de Gestión de Turnos del Hospital de Urgencia Asistencia Pública (HUAP, Santiago de Chile).
Planifica/asigna turnos del personal por servicio y puesto; intercambios y ofertas de turnos;
notificaciones; bitácora de auditoría; estadísticas y exportación CSV. Autenticación JWT,
autorización por rol de sistema (ADMINISTRADOR/USUARIO) + rol por servicio.

## Stack
- **Backend**: Java 21, Spring Boot 4, Spring Data JPA, Spring Security + JWT (jjwt),
  spring-mail (sin config SMTP visible → probablemente inerte), Maven. API REST `/api/v2`.
  Swagger opcional (`SWAGGER_ENABLED`).
- **Frontend**: React 19 + Vite 7 + Tailwind 3; build estático servido por Apache httpd.
- **BD**: MySQL 8.0 — DOS datasources independientes (dos pools, dos EntityManagerFactory):
  1. `gestionturnos` — BD propia del SGT, R/W (datasource primario).
  2. `innhosp` — BD del hospital, SOLO LECTURA (hikari read-only, pool máx 3);
     la app solo consulta la vista `viewPersonal`.
- **Infra**: Docker Compose. Prod: Apache LB (`5173:80`, `443`) → 3 frontends + 3 backends.
  Dev: 1 backend + 1 frontend con proxy `/api/v2`.

## Flujo "sacar gente" (corazón del dominio)
- `innhosp` tiene el personal del hospital; la app ve solo la vista `viewPersonal`
  (rut, dv, nombres, estado, clave bcrypt…).
- **LOGIN**: cada login busca el RUT en `viewPersonal` y valida la clave contra esa vista
  → `innhosp` NO es opcional: se consulta en cada autenticación.
- **ALTA**: al registrar un funcionario en el SGT se lee de `viewPersonal` y se copia a
  `gestionturnos.Funcionario` (FuncionarioService). Luego toda la operación diaria
  (turnos, solicitudes, ofertas…) es solo contra `gestionturnos`.
- Fuera del hospital se usa el stand-in: `BaseDatosMySQL/despliegue/setup_innhosp.sql`
  (esquema + vista) y `BaseDatosMySQL/desarrollo/innhosp/02_datos.sql` (usuarios de prueba,
  clave universal `huap2025`).

## Esquema y migraciones
- Sin Flyway/Liquibase. `DDL_AUTO=validate` → el esquema debe existir ANTES de arrancar.
- Orden para BD nueva:
  1. `despliegue/schema_gestionturnos.sql`
  2. `migraciones/V2__planificacion_vigencia.sql`
  3. `despliegue/bootstrap_inicial.sql` (roles, servicio "Administración", admin de arranque;
     sus credenciales viven en innhosp)
  4. `despliegue/setup_innhosp.sql` (+ `desarrollo/innhosp/02_datos.sql` si es demo)
  5. (demo) `despliegue/poblado_urgencias_gestionturnos.sql`
- Drift de docs: el README de BaseDatosMySQL menciona `datos_gestionturnos.sql`;
  el archivo real es `poblado_urgencias_gestionturnos.sql`.

## Configuración (todo por variables de entorno)
`DB_URL/DB_USERNAME/DB_PASSWORD` · `HOSPITAL_DB_URL/USERNAME/PASSWORD` · `DDL_AUTO=validate`
· `JWT_SECRET` (≥32 chars) · `CORS_ALLOWED_ORIGINS` (orígenes exactos, coma)
· `LOGIN_LOCK_DURATION_MS` · `SWAGGER_ENABLED` · `SERVER_ID`
· Frontend: `VITE_API_BASE_URL=/api/v2` (build arg) · `VITE_SOCKET_URL` (residual).

## Estado actual de ambientes
El DEV del equipo apunta a BDs en **10.6.15.193** (`:3309` gestionturnos, `:3307` innhosp)
— IP PRIVADA de su red local → **inaccesible desde Hetzner o cualquier nube**.
El despliegue propio debe hostear ambas BDs (gestionturnos real + innhosp stand-in).

## Recursos estimados (versión reducida: 1 backend + 1 frontend + MySQL)
- Backend JVM: 500–768 MB (fijar `-Xmx`/`MaxRAMPercentage`)
- MySQL 8: 350–500 MB tuneado (`innodb_buffer_pool_size` 128–256M)
- Frontend httpd (+ LB si se usa): ~30 MB
- **Total: ~1.0–1.3 GB RAM**; disco: ~2–3 GB imágenes + datos.
- El compose de prod tal cual (3+3+LB) requiere ~3–4 GB solo para esta app → sobredimensionado
  para una VM compartida; usar topología reducida.

## Deudas / riesgos visibles
- `node_modules/` e `.idea/` VERSIONADOS en la raíz (282 archivos, ~la mitad del repo) +
  `package.json` raíz con `socket.io-client` residual (el frontend ya no tiene socket.js).
- spring-boot-starter-mail sin propiedades → correo probablemente inerte.
- Tests de integración usan Testcontainers (necesitan Docker daemon).
- Seguridad ya trabajada (SEC-00x: caps drop, usuario no root, CORS estricto, lock de fuerza
  bruta, JWT externalizado). Pendiente en despliegue real: TLS (termina fuera de la app),
  JWT_SECRET nuevo por ambiente, usuario de BD sin privilegios root.

## Puntos de entrada
- `huap_backend/src/main/java/com/pingeso/HUAP/` — Controller/Service/Repository/Entity,
  `hospital/` (viewPersonal), `Security/`.
- `sgt-huap_frontend/src/` — components/services/context/utils.
- `docker-compose.yml` (prod 3+3+LB) · `docker-compose.dev.yml` (1+1) · `apache/`.
