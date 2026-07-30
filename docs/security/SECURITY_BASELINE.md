# Línea base de seguridad — SGT HUAP

**Fecha:** 2026-07-30
**Rama de trabajo:** `security/internet-hardening` (creada desde `Sprint3`)
**Commit base:** `e764b5b` ("fix: acceso al frontend de dev por IP de red (no solo localhost)")
**Autor:** Auditoría de seguridad (sesión asistida)

---

## 1. Estado inicial del repositorio

- Repositorio Git válido, rama de trabajo previa `Sprint3`.
- Al iniciar esta auditoría existían cambios **no relacionados y ya en curso** de una sesión anterior (rediseño visual de `AgendaView`/`calendarView` y una funcionalidad de "eliminar turnos generados" en `Planificacion`), sin commitear. Se conservaron intactos; no se sobrescribieron. La rama `security/internet-hardening` se creó a partir de ese estado exacto.
- Remotos configurados: `gitlab` (gitlab.com/lmoyag-max/sgt-2.0) y `origin` (github.com/Diego9028/Sistema-de-gestion-de-turnos-v2). No se hizo push en ningún momento de esta auditoría.

## 2. Stack tecnológico detectado

| Componente | Tecnología | Versión |
|---|---|---|
| Backend | Spring Boot | **4.0.0-SNAPSHOT** (⚠️ ver SEC-006) |
| Backend | Java | 21 |
| Backend | Spring Security | incluido vía starter (no fijado explícito) |
| Backend | JJWT | 0.12.5 |
| Backend | Lombok | 1.18.38 |
| Backend | Base de datos propia | MySQL 8.0 (`gestionturnos`) |
| Backend | Base de datos hospital | MySQL 8.0 (`innhosp`, solo lectura, vista `viewPersonal`) |
| Frontend | React | 19.1.1 |
| Frontend | React Router DOM | 7.8.2 (⚠️ ver SEC-005) |
| Frontend | Vite | 7.1.2 |
| Frontend | Axios | 1.11.0 |
| Proxy | Apache httpd | 2.4-alpine (load balancer + reverse proxy) |
| Contenedores | Docker / docker-compose | 3 réplicas backend, 3 réplicas frontend, 1 Apache LB |

## 3. Componentes principales

- **apache-lb**: balanceador/reverse-proxy Apache, único punto expuesto a Internet (puertos 5173→80 y 443).
- **backend-1/2/3**: instancias Spring Boot idénticas, red interna (`expose`, sin publicación directa de puertos al host).
- **frontend-1/2/3**: build estático de React servido por Apache, red interna.
- **BD propia (`gestionturnos`)**: MySQL, gestionada por el equipo SGT, no incluida en el `docker-compose.yml` de producción ("BD ya creada en la PC").
- **BD hospital (`innhosp`)**: MySQL externa, propiedad del hospital, acceso de **solo lectura** mediante usuario `personal_view_user` sobre la vista `viewPersonal` (fuente de verdad de credenciales del personal).

## 4. Pruebas disponibles y resultado inicial

Se ejecutó `mvn test` (Maven 3.9.6 / Temurin 21, vía contenedor aislado — el host solo tiene JRE 8) sobre el backend:

```
Tests run: 209, Failures: 0, Errors: 26, Skipped: 0
```

- **183 pruebas pasan** (unitarias y de servicio): `PlanificacionServiceTest`, `TurnoServiceTest`, `FuncionarioServiceTest`, `SolicitudServiceTest`, `OfertaGeneralServiceTest`, `BitacoraServiceTest`, `RotativaServiceTest`, `PuestoServiceTest`, `ReglaServicioServiceTest`, `ServicioServiceTest`, `TipoTurnoServiceTest`, etc.
- **26 pruebas con error** — **todas** por la misma causa raíz: `AbstractContainerTest` usa **Testcontainers** para levantar una BD real, y este entorno de análisis no expone un socket Docker utilizable al contenedor Maven anidado (`Could not find a valid Docker environment` / Ryuk no alcanzable). Se intentó montar `/var/run/docker.sock` sin éxito (limitación de Docker Desktop en Windows con contenedores anidados).
  - Afectadas: `TurnoRepositoryIntegrationTest` (8), `BitacoraIntegrationTest` (4), `GestionTurnoConcurrencyTest` (1), `OfertaGeneralConcurrencyTest` (1), `OfertaGeneralIntegrationTest` (6), `SolicitudConcurrencyTest` (2), `SolicitudIntegrationTest` (3), `TurnoConcurrencyTest` (1).
  - **`Requiere validación adicional`**: estas 26 pruebas deben ejecutarse en un entorno con Docker accesible de forma nativa (CI, o el host directamente) para confirmar que también pasan. No se puede afirmar su resultado desde este entorno.
- **0 fallas reales de aserciones** — ninguna prueba falló por lógica incorrecta, solo por imposibilidad de arrancar su infraestructura.

Frontend: no existe script `"test"` en `package.json` (no hay pruebas automatizadas de frontend). Se usa `npm run build` y `npm run lint` como controles de calidad disponibles.

## 5. Cómo se inicia el sistema localmente

- Desarrollo autocontenido: `docker compose -f docker-compose.dev.yml up --build` (MySQL dev en `13307`, backend único en `8080`, frontend único en `5173`, seeder de datos).
- Producción (referencia): `docker-compose.yml` con 3 réplicas backend + 3 réplicas frontend detrás de `apache-lb`, requiere `.env` con `DB_URL`, `DB_USERNAME`, `DB_PASSWORD`, `JWT_SECRET`, `HOSPITAL_DB_*` (fallan al arrancar si faltan, vía `:?`).

## 6. Puertos expuestos

| Entorno | Puerto host | Servicio | Alcance |
|---|---|---|---|
| Dev | 13307 → 3306 | MySQL dev | Host local (no Internet) |
| Dev | 8080 | Backend único | Host local |
| Dev | 5173 → 80 | Frontend/Apache | Host local |
| Prod | 5173 → 80 | apache-lb | **Destinado a Internet** |
| Prod | 443 → 443 | apache-lb (HTTPS) | **Destinado a Internet — sin TLS configurado, ver SEC-001** |
| Prod | (interno) 8080 ×3 | backend-1/2/3 | Solo red `huap-network` |
| Prod | (interno) 80 ×3 | frontend-1/2/3 | Solo red `huap-network` |
| Prod | — | BD `gestionturnos` | Fuera del compose; alcance depende de dónde corra el host MySQL (requiere validación adicional en el servidor real) |
| Prod | 3307 | BD hospital `innhosp` | Gestionada por el hospital, fuera de nuestro control directo |

**Servicios que deben ser exclusivamente internos:** backend-1/2/3, frontend-1/2/3, ambas bases de datos. Ninguno se publica directamente al host en `docker-compose.yml` de producción — correcto por diseño. El único punto de entrada público debe ser `apache-lb`.

## 7. Dependencias principales (ver auditoría completa en `SECURITY_AUDIT_REPORT.md`)

- `npm audit` (frontend): **2 vulnerabilidades HIGH** en dependencias de producción (`react-router` / `react-router-dom`, CVE de bypass de CSRF en modo RSC) + 5 HIGH adicionales en la cadena de devDependencies (`eslint`/`minimatch`/`brace-expansion`, solo build-time).
- Backend: no se pudo ejecutar `mvn dependency-check` (plugin OWASP Dependency-Check no configurado en `pom.xml` y no se instaló una herramienta nueva sin justificarlo primero). **Requiere validación adicional** con una herramienta SCA en CI (Dependabot/Snyk/OWASP Dependency-Check).
- `spring-boot-starter-parent` fijado en **`4.0.0-SNAPSHOT`** — versión de pre-lanzamiento, no reproducible de forma determinista (ver SEC-006).

## 8. Riesgos preliminares identificados (detalle completo en el informe de auditoría)

1. TLS/HTTPS no configurado pese a exponer el puerto 443.
2. CORS permisivo (patrones de red privada completos + credentials).
3. Sin rate limiting real en el borde (Apache); mitigación de fuerza bruta solo en memoria de cada instancia backend.
4. Endpoints de `funcionarios` sin control de autorización por rol/servicio (exposición de PII — RUT completo).
5. Dependencia de producción `react-router-dom` con CVE HIGH conocido.
6. Versión SNAPSHOT de Spring Boot como parent.
7. Hashes de contraseña heredados (`viewPersonal` del hospital) en SHA-512 sin sal — fuera del control directo del equipo SGT.
8. Contenedor backend corre como `root` (sin `USER` en el Dockerfile).
9. Endpoint público `/api/v2/info` filtra versión de Java, SO y memoria sin autenticación.

## 9. Limitaciones de este análisis

- No se ejecutaron pruebas dinámicas (DAST) contra ningún ambiente desplegado; todo el análisis fue estático (lectura de código/configuración) más pruebas unitarias locales.
- No se dispuso de acceso a la base de datos de producción real, ni al servidor donde corre `gestionturnos` en producción, ni a las credenciales reales del hospital — todo lo referido a esos entornos se marca `Requiere validación adicional`.
- No se instalaron herramientas SAST/SCA adicionales no presentes en el proyecto, siguiendo la instrucción de no incorporar herramientas invasivas sin justificarlo; se documenta como limitación en vez de improvisar un escaneo parcial.
- Las 26 pruebas de integración/concurrencia no pudieron ejecutarse por falta de Docker-en-Docker funcional en este entorno de análisis.
