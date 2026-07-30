# Modelado de amenazas — SGT HUAP

**Metodología:** STRIDE aplicado a los componentes y flujos descritos en `SECURITY_ARCHITECTURE.md`.

## Actores

| Actor | Descripción |
|---|---|
| Usuario anónimo | Cualquiera en Internet, sin cuenta |
| Usuario autenticado (MEDICO) | Personal de salud con cuenta y turnos asignados |
| JEFATURA / SUBROGANTE | Jefatura de un servicio, gestiona turnos de su equipo |
| ADMINISTRADOR | Súper-admin del sistema completo |
| Hospital (sistema externo) | Dueño de `innhosp.viewPersonal`, fuente de credenciales |
| Atacante externo | Actor malicioso desde Internet, sin credenciales válidas |
| Atacante interno / insider | Usuario autenticado con rol bajo que intenta escalar u obtener datos de otros |
| Atacante en la misma red | Alguien en el mismo segmento LAN/Wi-Fi (relevante por el CORS de `192.168.*.*`, ver SEC-002) |

## Datos sensibles

- Credenciales (RUT + hash de clave) — en BD hospital y BD propia.
- JWT (portador de identidad y rol por 24 h).
- `JWT_SECRET`, credenciales de BD (`.env`, variables de entorno de contenedor).
- Datos personales del personal de salud (nombre, RUT completo, profesión, rol) vía `FuncionarioSummaryDTO`.
- Bitácora de auditoría (`Bitacora_eventos`).

## Análisis STRIDE

| # | Amenaza (STRIDE) | Componente | Escenario de ataque | Prob. | Impacto | Controles existentes | Controles faltantes | Prioridad |
|---|---|---|---|---|---|---|---|---|
| T1 | **S**poofing — credential stuffing / fuerza bruta | `POST /login` | Atacante prueba pares RUT+password masivamente | Alta (sin TLS ni rate limit de borde) | Alto (toma de cuentas) | `LoginAttemptService` (5 intentos, bloqueo 1 min, por instancia) | Rate limiting en el proxy; bloqueo compartido entre las 3 réplicas; ventana de bloqueo de producción (15 min) | **Alta** (SEC-003, SEC-009) |
| T2 | **S**poofing — IP spoofing vía `X-Forwarded-For` | `apache-lb` → backend | El proxy reenvía el `X-Forwarded-For` tal cual lo envía el cliente, sin sobrescribirlo con la IP real | Media | Bajo–Medio (si algo del backend usara esa IP para decisiones de seguridad) | `X-Real-IP` sí se fija correctamente desde `REMOTE_ADDR` | Confirmar que ningún control de seguridad confíe en `X-Forwarded-For` en vez de `X-Real-IP` | Media (SEC-017, *Requiere validación adicional*) |
| T3 | **T**ampering — manipulación de CORS para peticiones cross-origin con credenciales | Frontend↔Backend | Página maliciosa servida desde cualquier IP `192.168.*.*` en la misma LAN que la víctima logueada | Media (requiere estar en la misma red privada) | Medio (dado que el token vive en `localStorage`, no en cookie, el impacto directo de robo de sesión vía CORS es bajo; el riesgo real es la superficie innecesariamente amplia) | Ninguno más allá del propio CORS (mal configurado) | Restringir `allowedOriginPatterns` al dominio real de producción; evitar comodines de red privada completos | **Alta** (SEC-002) |
| T4 | **T**ampering — IDOR / cambio de rol propio | `PUT /funcionarios/{id}` | Usuario de bajo privilegio intenta cambiar su propio rol o el de otro | Baja | Alto (escalamiento de privilegios) | El controller valida ownership y bloquea cambio de `rol`/`estado` salvo JEFATURA/ADMINISTRADOR | Ninguno detectado — **control ya presente y correcto** | Informativo (control positivo, no acción) |
| T5 | **R**epudiation — negar haber generado/eliminado turnos | `PlanificacionService`, `TurnoService` | Un JEFATURA niega haber generado una planificación duplicada o haber eliminado turnos | Baja | Medio | `BitacoraService.registrarTurnoGenerado` registra generación con actor; **el nuevo endpoint `DELETE /planificaciones/{id}/turnos` (agregado en sesión previa) no registra bitácora** | Agregar registro de bitácora a la eliminación masiva de turnos generados | Media (mejora sugerida, no vulnerabilidad de seguridad per se) |
| T6 | **I**nfo Disclosure — enumeración de usuarios / PII cruzada entre servicios | `GET /funcionarios/summary`, `/funcionarios/{id}/summary`, `/funcionarios/status/{rut}` | Cualquier usuario autenticado (incluso de otro servicio) consulta RUT completo, nombre y profesión de cualquier funcionario | Alta (solo requiere estar logueado, cualquier rol) | Alto (RUT es identificador nacional sensible en Chile; permite mapear personal completo del hospital) | Requiere JWT válido (no es anónimo) | Falta control por rol/servicio — cualquier autenticado ve todo | **Alta** (SEC-004) |
| T7 | **I**nfo Disclosure — fingerprinting del servidor | `GET /api/v2/info` (público) | Atacante anónimo obtiene versión de Java, SO, memoria disponible | Alta (endpoint público, sin fricción) | Bajo–Medio (facilita elegir exploits específicos de versión) | Ninguno (`permitAll`) | Restringir datos sensibles de la respuesta o exigir autenticación | Media (SEC-011) |
| T8 | **I**nfo Disclosure — errores con detalle interno | Cualquier endpoint | Provocar excepción para ver stack trace / SQL | Baja | Medio | `GlobalExceptionHandler` genérico ya implementado — **control positivo confirmado** | Ninguno detectado | Informativo |
| T9 | **D**oS — agotamiento de recursos sin límite de tasa | `apache-lb` | Flood de requests a `/login` o a endpoints de exportación (`ExportacionController`) | Media | Medio–Alto (servicio hospitalario, disponibilidad importa) | `LimitRequestBody` 50 MB, timeouts básicos | Rate limiting real (mod_evasive/mod_qos o WAF), límites específicos para exportaciones masivas | **Alta** (SEC-003) |
| T10 | **E**levation of Privilege — SNAPSHOT inestable como dependencia raíz | `pom.xml` | Un cambio/retiro del artefacto `spring-boot-starter-parent:4.0.0-SNAPSHOT` rompe builds reproducibles, o introduce código no auditado de una rama de desarrollo activa de Spring | Media (fuera del control del equipo; depende del repositorio de Spring) | Alto (toda la superficie de seguridad de Spring Security/Web hereda de código pre-release) | Ninguno | Fijar a una versión GA estable de Spring Boot 3.x | **Alta** (SEC-006) |
| T11 | **E**levation of Privilege / Tampering — CVE conocido en dependencia de frontend | `react-router-dom` | Explotar el bypass de CSRF documentado en modo RSC | Media (depende de si la app usa RSC — *requiere validación adicional*, pero el paquete vulnerable está presente igual) | Alto (bypass de protección, ejecución de acciones) | Ninguno | Actualizar a la versión parcheada | **Alta** (SEC-005) |
| T12 | **I**nfo Disclosure — hash de contraseña débil heredado | BD hospital `viewPersonal` | Si la BD del hospital o un respaldo se filtran, los hashes SHA-512 sin sal son crackeables con GPU/rainbow tables | Baja (requiere brecha en sistema externo) | Alto | `DelegatingPasswordEncoder` ya usa BCrypt para cuentas **nuevas** propias de SGT | El hash heredado es responsabilidad del hospital (SGT solo tiene lectura); no se puede re-hashear desde este sistema | Alta, pero **fuera del control directo del equipo SGT** — va al registro de riesgos residuales (SEC-007) |
| T13 | **D**oS/Tampering — sin TLS, tráfico en claro | Internet → apache-lb | Ataque MITM en red no confiable intercepta RUT/contraseña/JWT en tránsito | Alta si se publica tal cual hoy | Crítico | Ninguno (sin `VirtualHost *:443`, sin `mod_ssl`) | Certificado TLS, redirección HTTP→HTTPS, HSTS | **Crítica — bloqueante para publicación** (SEC-001) |

## Superficie de ataque — inventario

- **Externo:** `POST /login`, `POST /login/select-service`, `GET /health`, `GET /info`, `GET /servicios`, todo `/api/v2/**` autenticado, SPA estática.
- **Interno:** red Docker `huap-network` entre apache-lb↔backend↔frontend; JDBC hacia ambas bases de datos.
- **Datos:** MySQL `gestionturnos` (lectura/escritura), MySQL `innhosp.viewPersonal` (solo lectura), logs de Apache y de Spring Boot, bitácora de auditoría en BD.
- **Infraestructura:** Docker Compose (build local de imágenes, sin registry propio detectado), sin pipeline CI/CD encontrado en el repositorio (`Requiere validación adicional` — no se halló carpeta `.github/workflows` ni `.gitlab-ci.yml` en este checkout).
- **Cadena de suministro:** dependencias npm (`react-router-dom` vulnerable) y Maven (`spring-boot-starter-parent` SNAPSHOT); imágenes base Docker (`maven:3.9.6-eclipse-temurin-21`, `eclipse-temurin:21-jdk-alpine`, `node:22`, `httpd:alpine`, `mysql:8.0`) — todas con tag razonablemente específico, ninguna en `latest` (**control positivo**).
