# Informe de auditoría de seguridad — SGT HUAP

**Alcance:** `huap_backend/`, `sgt-huap_frontend/`, `apache/`, `docker-compose*.yml`, Dockerfiles, configuración y dependencias. Commit base `e764b5b`, rama `security/internet-hardening`.
**Metodología:** revisión estática de código y configuración + pruebas unitarias locales + `npm audit`. Sin pruebas dinámicas contra un ambiente desplegado en Internet (no autorizado/no aplicable en esta sesión).

Resumen de conteo: **1 crítico**, **6 altos**, **6 medios**, **3 bajos/informativos**.

De los 6 altos: 2 corregidos en esta sesión (SEC-002, SEC-011 es medio en realidad — ver detalle por hallazgo), 1 bloqueado por decisión de negocio pendiente (SEC-004), 1 bloqueado por planificación de mayor esfuerzo (SEC-006), 1 no corregible desde este repositorio (SEC-007, externo al hospital), y 1 **no se pudo corregir por no existir aún la versión parcheada publicada** (SEC-005). El detalle de qué se corrigió realmente está en `SECURITY_CHANGELOG.md`, no en este resumen.

---

## SEC-001 — Sin TLS/HTTPS configurado pese a exponer el puerto 443

- **Categoría:** Configuración de servidor web / criptografía en tránsito
- **Severidad:** Crítica
- **Estado:** Confirmado
- **Componente:** Apache (reverse proxy / load balancer)
- **Archivo:** `apache/httpd.conf`
- **Línea o función:** único bloque `<VirtualHost *:80>` (líneas 192–224); no existe `<VirtualHost *:443>`, ni `LoadModule ssl_module`, ni directivas `SSLEngine`/`SSLCertificateFile`
- **Endpoint o flujo afectado:** todo el tráfico público (login, JWT, datos de personal)
- **Evidencia:** `docker-compose.yml` publica `"443:443"` en `apache-lb`, pero `httpd.conf` no define ningún virtual host HTTPS ni carga `mod_ssl`. El puerto 443 está expuesto en Docker pero no atendido por configuración TLS real.
- **Descripción técnica:** Todo el tráfico (credenciales de login, JWT Bearer, datos de personal médico) viajaría en texto claro sobre HTTP si se publica tal cual.
- **Escenario de explotación:** Interceptación de tráfico (MITM) en cualquier punto de la red entre el cliente e Internet — captura de RUT, contraseña y JWT.
- **Prerrequisitos:** posición de red intermedia (Wi-Fi público, ISP comprometido, proxy malicioso).
- **Impacto técnico:** compromiso total de credenciales y sesión.
- **Impacto para la organización:** exposición de datos de personal de salud (dato sensible institucional/potencialmente asimilable a datos personales bajo Ley 19.628 en Chile).
- **Datos potencialmente afectados:** RUT, contraseñas, JWT de cualquier usuario.
- **Causa raíz:** configuración de Apache incompleta para el entorno de producción/Internet.
- **Control existente:** ninguno.
- **Control faltante:** certificado TLS (Let's Encrypt u otro), `VirtualHost *:443`, redirección 301 de HTTP→HTTPS, HSTS (una vez validado el funcionamiento).
- **Recomendación:** No publicar el sistema en Internet sin TLS terminado en `apache-lb` (o en un balanceador/CDN delante con TLS). Bloqueante.
- **Corrección propuesta:** requiere un certificado real y decisión de dónde se origina (Let's Encrypt vía Certbot, certificado corporativo, o TLS terminado en un CDN/WAF delante de Apache) — **requiere validación/decisión de infraestructura del equipo**, no se implementó en esta sesión por depender de un certificado y dominio reales.
- **Riesgo de regresión:** bajo si se hace correctamente con redirección; medio si se fuerza HSTS antes de confirmar que HTTPS funciona en todos los clientes.
- **Prueba para validar la corrección:** `curl -I http://dominio` debe responder 301 a `https://`; `curl -I https://dominio` debe responder 200 con certificado válido (`openssl s_client -connect dominio:443`).
- **Prioridad:** 1 (bloqueante antes de publicar)
- **Estado de remediación:** **Pendiente — requiere decisión/recursos de infraestructura (dominio + certificado) fuera del alcance de este repositorio.**

---

## SEC-002 — CORS excesivamente permisivo (comodines de red privada + credenciales)

- **Categoría:** CORS
- **Severidad:** Alta
- **Estado:** Confirmado — corregido en esta sesión
- **Componente:** Backend, configuración global
- **Archivo:** `huap_backend/src/main/java/com/pingeso/HUAP/Config/CorsConfig.java`
- **Línea o función:** `corsConfigurationSource()`, líneas 32–44
- **Endpoint o flujo afectado:** todas las rutas (`registerCorsConfiguration("/**", ...)`)
- **Evidencia:**
  ```java
  configuration.setAllowedOriginPatterns(Arrays.asList(
      "http://localhost", "http://localhost:*",
      "http://200.30.242.110", "http://200.30.242.110:*",
      "http://192.168.*.*", "http://192.168.*.*:*"
  ));
  configuration.setAllowedHeaders(Arrays.asList("*"));
  configuration.setAllowCredentials(true);
  ```
- **Descripción técnica:** `192.168.*.*` con cualquier puerto abarca **toda** la red privada clase C típica de hogares/oficinas — cualquier servicio corriendo en esa IP/puerto en la misma LAN que un usuario autenticado queda habilitado como origen confiable con credenciales. Además, no diferencia entornos: el mismo bean se usa en producción.
- **Escenario de explotación:** un actor en la misma red Wi-Fi/LAN que un usuario autenticado sirve una página desde su propia IP `192.168.x.y` y realiza peticiones cross-origin con `credentials: 'include'` que el navegador permite por el CORS abierto. El impacto directo de exfiltración de JWT es limitado porque el token vive en `localStorage` (aislado por origen, no en cookie), pero la superficie es innecesariamente amplia y facilita otros abusos (p. ej. si en el futuro se introduce alguna cookie o flujo que sí dependa de credenciales cross-origin).
- **Impacto técnico:** ampliación innecesaria de la superficie de confianza cross-origin.
- **Causa raíz:** patrón de desarrollo (permitir cualquier IP de LAN para pruebas en dispositivos) llevado sin cambios a la configuración que también correría en producción.
- **Control faltante:** origen(es) de producción explícitos y parametrizados por entorno.
- **Corrección propuesta (implementada):** externalizar los orígenes permitidos a una propiedad de configuración (`app.cors.allowed-origins`, variable de entorno `CORS_ALLOWED_ORIGINS`), con un valor por defecto solo para desarrollo (`localhost`) y sin comodines de red privada completos. Ver `SECURITY_CHANGELOG.md`.
- **Riesgo de regresión:** medio — si el valor de producción no se configura correctamente en el `.env` del servidor, el frontend en producción no podrá llamar al backend. **Se requiere fijar `CORS_ALLOWED_ORIGINS` en el `.env` real de despliegue con el dominio público definitivo.**
- **Prueba para validar la corrección:** request `OPTIONS` con `Origin: http://evil.example` debe **no** recibir `Access-Control-Allow-Origin`; con el origen configurado, sí.
- **Prioridad:** 2
- **Estado de remediación:** **Corregido** (ver `SECURITY_CHANGELOG.md` — SEC-002).

---

## SEC-003 — Ausencia de rate limiting real en el borde (Apache)

- **Categoría:** Disponibilidad / fuerza bruta
- **Severidad:** Alta
- **Estado:** Confirmado
- **Componente:** Apache (reverse proxy)
- **Archivo:** `apache/conf.d/rate_limiting.conf`, `apache/conf.d/locations/api.conf`
- **Línea o función:** todo el archivo `rate_limiting.conf` está comentado/documentado, sin una sola directiva activa; `mod_evasive`/`mod_qos` no están cargados en `httpd.conf`
- **Endpoint o flujo afectado:** `POST /api/v2/funcionarios/login` y cualquier endpoint público
- **Evidencia:** el propio archivo lo documenta: *"NOTA: Apache no tiene rate limiting nativo... Se necesitaría compilar con mod_evasive o mod_qos"* — y ninguna de las dos está habilitada.
- **Descripción técnica:** el único control de fuerza bruta activo es `LoginAttemptService` (aplicación), que además es **por instancia** (ver SEC-009) — con 3 réplicas de backend detrás del balanceador, un atacante distribuido a través de las 3 instancias puede triplicar el número efectivo de intentos antes de que cualquiera de las tres lo bloquee.
- **Escenario de explotación:** ataque de fuerza bruta/credential stuffing contra `/login`, o flood de requests contra endpoints costosos (exportación CSV, generación de planificación) para agotar recursos.
- **Impacto técnico:** más intentos de login antes del bloqueo; posible degradación de servicio.
- **Causa raíz:** Apache base no trae rate limiting por request; no se agregó `mod_evasive` ni una capa externa (WAF/CDN).
- **Control existente:** `LoginAttemptService` a nivel de aplicación (parcial).
- **Control faltante:** rate limiting por IP en el borde.
- **Recomendación:** agregar `mod_evasive` a la imagen de `apache-lb` (o colocar Cloudflare/otro proxy con rate limiting delante), limitando especialmente `/api/v2/funcionarios/login`.
- **Corrección propuesta:** requiere reconstruir la imagen base de Apache con un módulo no incluido en `httpd:2.4-alpine` por defecto, o introducir un componente nuevo (WAF/CDN) — **cambio de infraestructura, no solo de código; se documenta y prioriza en el plan de remediación en vez de implementarlo a ciegas en esta sesión.**
- **Riesgo de regresión:** bajo (aditivo), pero requiere pruebas de carga para calibrar umbrales sin bloquear tráfico legítimo.
- **Prueba para validar la corrección:** script que envíe >N requests/segundo a `/login` desde una IP y confirme HTTP 429 antes de agotar los intentos de aplicación.
- **Prioridad:** 3
- **Estado de remediación:** **Pendiente — requiere cambio de infraestructura (módulo Apache o WAF/CDN delante), documentado en el plan de remediación.**

---

## SEC-004 — Autorización insuficiente en endpoints de `funcionarios` (BOLA / exposición de PII entre servicios)

- **Categoría:** Autorización (Broken Object/Function Level Authorization)
- **Severidad:** Alta
- **Estado:** Confirmado — **requiere validación de negocio antes de corregir** (ver nota)
- **Componente:** Backend
- **Archivo:** `huap_backend/src/main/java/com/pingeso/HUAP/Controller/FuncionarioController.java`
- **Línea o función:** `getAllSummary` (línea ~192), `getSummary` (línea ~204), `getDisponibilidad` (línea ~215), `checkFuncionario`/`/status/{rut}` (línea ~170)
- **Endpoint o flujo afectado:** `GET /api/v2/funcionarios/summary?servicioId=X`, `GET /api/v2/funcionarios/{id}/summary`, `GET /api/v2/funcionarios/disponibilidad/{servicioId}`, `GET /api/v2/funcionarios/status/{rut}`
- **Evidencia:** `SecurityConfig.java` no incluye `/api/v2/funcionarios/**` ni en `GLOBAL_ADMIN_PATHS` ni en `SERVICE_ADMIN_PATHS`; cae en `anyRequest().authenticated()`, es decir, **cualquier usuario con JWT válido de cualquier rol y cualquier servicio** puede invocar estos GET sin restricción adicional en el controller. `FuncionarioSummaryDTO` expone `nombre`, `apellidoPaterno`, `apellidoMaterno`, `rut`, `dv`, `rutCompleto`, `estado`, `profesion`, `idRolSistema`, servicios y roles.
- **Descripción técnica:** un MEDICO del servicio "Cirugía" puede consultar el RUT completo, nombre y profesión de cualquier funcionario de "Urgencias" (o de cualquier otro servicio), y puede además usar `/status/{rut}` para verificar si un RUT arbitrario está registrado y obtener su ID interno.
- **Escenario de explotación:** un usuario autenticado de bajo privilegio itera `idFuncionario` (1, 2, 3…) contra `/summary` para construir un directorio completo de personal con RUT, o prueba RUTs conocidos/generados contra `/status/{rut}` para confirmar cuáles pertenecen a personal real del hospital.
- **Prerrequisitos:** cualquier cuenta válida (rol MEDICO basta).
- **Impacto técnico:** exposición masiva de PII (RUT es identificador nacional sensible en Chile).
- **Impacto para la organización:** posible incumplimiento de buenas prácticas de protección de datos personales del personal; riesgo reputacional/legal.
- **Datos potencialmente afectados:** RUT completo, nombre, profesión y rol de todo el personal registrado.
- **Causa raíz:** el modelo de autorización de esta ruta nunca se definió más allá de "estar autenticado"; no hay evidencia en el código de que el diseño previsto sea "todo el personal puede ver el directorio completo de cualquier servicio" ni de lo contrario.
- **Control existente:** requiere JWT válido (no es anónimo).
- **Control faltante:** restricción por rol y/o por servicio propio del usuario.
- **Recomendación:** decidir el modelo de negocio correcto — ¿es intencional que cualquier funcionario vea el directorio completo del hospital (común en algunos sistemas hospitalarios para ubicar colegas de otros servicios), o debería limitarse a JEFATURA/ADMINISTRADOR o al propio servicio del usuario? **Esta es precisamente el tipo de decisión que la instrucción de la auditoría pide validar antes de tocar, porque podría ser una regla de negocio intencional (directorio institucional) y no un descuido.**
- **Corrección propuesta:** **no implementada en esta sesión** — se deja documentada y priorizada en el plan de remediación con dos opciones concretas de corrección (restringir por servicio propio, o restringir a roles de gestión) para que el equipo/producto confirme cuál corresponde antes de aplicarla, conforme a la sección 4.1 de las instrucciones ("si una corrección pudiera alterar una regla de negocio, detente y solicita validación").
- **Riesgo de regresión:** alto si se restringe incorrectamente (podría romper una función de directorio institucional legítima usada hoy por el frontend, p. ej. para mostrar nombres de compañeros de equipo en `AgendaView`/`ShiftDetail`).
- **Prueba para validar la corrección (una vez decidida):** usuario MEDICO de servicio A recibe 403 al pedir `/funcionarios/summary?servicioId=B` (si se decide restringir por servicio), o 403 si no es JEFATURA/ADMINISTRADOR (si se decide restringir por rol).
- **Prioridad:** 4 (alta, pero bloqueada por decisión de negocio pendiente)
- **Estado de remediación:** **Pendiente de validación de negocio — no corregido en esta sesión.**

---

## SEC-005 — Dependencia de producción `react-router-dom` con CVE de severidad alta

- **Categoría:** Dependencias / cadena de suministro
- **Severidad:** Alta
- **Estado:** Confirmado — **NO corregible todavía** (corrección intentada y verificada como no disponible; ver nota de honestidad abajo)
- **Componente:** Frontend
- **Archivo:** `sgt-huap_frontend/package.json` (`"react-router-dom": "^7.8.2"`, resuelto a `7.18.1`)
- **Evidencia:** `npm audit` (contenedor `node:22` aislado):
  ```
  react-router  7.12.0 - 8.2.0
  Severity: high
  React Router: RSC Mode CSRF Bypass Allows Action Execution Before 400 Response
  https://github.com/advisories/GHSA-qwww-vcr4-c8h2
  ```
  Consultado el advisory original en GitHub: rango afectado real `>= 7.12.0, < 8.3.0`, **parcheado en `8.3.0`**. `npm view react-router-dom versions` (contra el registro npm accesible desde este entorno) solo lista hasta `7.18.2` — **no existe ninguna versión `8.x` publicada todavía en el registro consultado**, por lo que la versión parcheada no está disponible para instalar en este momento.
- **Descripción técnica:** toda la línea 7.x desde 7.12.0 en adelante (incluida la resuelta, 7.18.1) está dentro del rango vulnerable. Es una dependencia de producción (llega al bundle).
- **Nota de aplicabilidad:** esta SPA es 100% cliente (Vite, sin RSC/SSR — se confirmó que el único uso de la librería en todo el código es `BrowserRouter`, `Routes`, `Route`, `Navigate` en `App.jsx`, sin `loader`/`action`/APIs de datos que activarían el modo RSC afectado), lo que reduce fuertemente la explotabilidad práctica hoy. Igual se documenta como pendiente de actualizar por higiene de cadena de suministro.
- **Nota de honestidad del proceso:** en un primer intento se registró este hallazgo como "corregido" tras ejecutar `npm audit fix`, basándose en el mensaje genérico de npm ("fix available via `npm audit fix`"). Al verificar el resultado real (`npm audit` after) el advisory **seguía presente** y `npm ls react-router-dom` confirmó que la versión no cambió. Se corrige aquí la afirmación inicial: **no se debe declarar una vulnerabilidad como solucionada sin comprobarla**, y esta no pudo comprobarse como corregida porque el fix no está disponible para instalar todavía.
- **Corrección propuesta:** actualizar a `react-router-dom@8.3.0` o superior en cuanto esté disponible en el registro npm usado por el equipo. Mientras tanto, mitigación compensatoria: no adoptar APIs de RSC/data-loading de React Router (ya no se usan hoy) hasta confirmar la actualización.
- **Riesgo de regresión (para cuando se pueda aplicar):** medio — v8 es un cambio de versión mayor; el uso actual en el código es mínimo (4 símbolos básicos, sin APIs avanzadas), lo que sugiere riesgo de regresión bajo en la práctica, pero debe verificarse con un build y prueba manual de navegación tras actualizar.
- **Prueba para validar la corrección (pendiente, a futuro):** `npm audit` sin el advisory GHSA-qwww-vcr4-c8h2; `npm run build` exitoso; navegación manual por las rutas `/`, `/login`, `/agenda-demo`.
- **Prioridad:** 5
- **Estado de remediación:** **No corregido — bloqueado por disponibilidad de la versión parcheada en el registro; monitorear y actualizar en cuanto `react-router-dom@8.3.0`+ esté publicado.**

---

## SEC-006 — `spring-boot-starter-parent` fijado a una versión SNAPSHOT (4.0.0-SNAPSHOT)

- **Categoría:** Dependencias / cadena de suministro / estabilidad del build
- **Severidad:** Alta
- **Estado:** Confirmado — **no corregido, requiere validación**
- **Componente:** Backend
- **Archivo:** `huap_backend/pom.xml`, línea ~5 (`<version>4.0.0-SNAPSHOT</version>` del parent)
- **Descripción técnica:** un SNAPSHOT es un artefacto de desarrollo activo, no versionado de forma inmutable — el mismo número de versión puede cambiar de contenido en el repositorio remoto en cualquier momento, y puede desaparecer. Construir producción sobre él implica: (a) build no reproducible de forma determinista, (b) depender de código de Spring Boot que no ha pasado por el ciclo de estabilización de una versión GA, con superficie de seguridad no auditada de la misma forma que una release estable.
- **Escenario de explotación:** no es una vulnerabilidad explotable directamente por un atacante externo, pero es un riesgo de cadena de suministro/estabilidad: un build futuro puede fallar, comportarse distinto, o traer una regresión de seguridad de Spring sin que el equipo lo note (no hay changelog de un SNAPSHOT).
- **Impacto para la organización:** riesgo de indisponibilidad del pipeline de build, y de heredar vulnerabilidades no documentadas de una rama de desarrollo de un framework de seguridad central (Spring Security es parte de este starter).
- **Causa raíz:** `Requiere validación adicional` — no se encontró en el historial de commits ni en la documentación (`README.md`, `CLAUDE.md`) una justificación explícita de por qué se fijó una versión pre-lanzamiento; parece una elección temprana del proyecto que quedó sin revisar.
- **Recomendación:** migrar a la última versión GA estable de la línea Spring Boot 3.x compatible con Java 21 (p. ej. 3.3.x/3.4.x al momento de esta auditoría) tan pronto se valide que el código no depende de una API específica de Spring Boot 4 todavía no estabilizada.
- **Corrección propuesta:** **no implementada en esta sesión** — bajar la versión mayor del framework completo es un cambio de alto impacto (puede afectar auto-configuración, nombres de propiedades, comportamiento de Spring Security, JPA, etc.) que requiere una ronda completa de pruebas de regresión y no corresponde a un "cambio mínimo" seguro de aplicar sin que el equipo lo planifique y lo pruebe explícitamente. Se documenta como bloqueante de alto esfuerzo en el plan de remediación.
- **Riesgo de regresión:** alto (cambio de versión mayor de framework).
- **Prueba para validar la corrección:** suite completa de tests backend en verde + arranque exitoso en los tres perfiles (dev/prod) tras el cambio de versión.
- **Prioridad:** 6
- **Estado de remediación:** **Pendiente — requiere planificación y ronda de pruebas dedicada del equipo; no se cambió en esta sesión por su alto riesgo de regresión.**

---

## SEC-007 — Hash de contraseña heredado (SHA-512 sin sal) para cuentas provenientes del hospital

- **Categoría:** Autenticación / almacenamiento de credenciales
- **Severidad:** Alta (riesgo real) — **pero fuera del control directo del equipo SGT**
- **Estado:** Confirmado — **no corregible desde este repositorio**
- **Componente:** Backend (lectura) / Base de datos del hospital (origen del dato)
- **Archivo:** `huap_backend/src/main/java/com/pingeso/HUAP/Service/FuncionarioService.java`, método `normalizeEncodedPassword` (líneas 110–138); `huap_backend/src/main/java/com/pingeso/HUAP/Config/SecurityConfig.java`, método `passwordEncoder()` (líneas 59–68)
- **Evidencia:**
  ```java
  DelegatingPasswordEncoder delegating = new DelegatingPasswordEncoder("bcrypt", encoders);
  delegating.setDefaultPasswordEncoderForMatches(new MessageDigestPasswordEncoder("SHA-512"));
  ```
  y en `normalizeEncodedPassword`: hashes de 64 bytes se tratan como "binario real" (consistente con la salida cruda de SHA-512) sin evidencia de sal por usuario.
- **Descripción técnica:** `MessageDigestPasswordEncoder("SHA-512")` de Spring Security, sin una fuente de sal configurada explícitamente, produce hashes deterministas — dos usuarios con la misma contraseña tendrían el mismo hash, y el esquema es vulnerable a ataques de diccionario/rainbow table con hardware moderno (SHA-512 es rápido de calcular por diseño, lo opuesto a lo que se necesita para contraseñas).
- **Escenario de explotación:** si la base de datos `innhosp` o un respaldo de ella se filtran, los hashes heredados son crackeables de forma mucho más eficiente que un hash BCrypt/Argon2 equivalente.
- **Datos potencialmente afectados:** contraseñas de todo el personal cuya cuenta se originó en el sistema del hospital (`viewPersonal`).
- **Causa raíz:** el esquema de hash fue definido y es mantenido por el sistema del hospital (`innhosp`), sobre el cual SGT **solo tiene acceso de lectura** (`hospital.datasource.hikari.read-only=true`, confirmado en `application.properties`). SGT no puede escribir ni re-hashear esa tabla.
- **Control existente:** las contraseñas **nuevas**, creadas directamente en el sistema SGT (no heredadas del hospital), sí usan BCrypt correctamente vía el mismo `DelegatingPasswordEncoder`.
- **Control faltante:** no aplica a SGT — el control debe implementarse en el sistema del hospital.
- **Recomendación:** comunicar formalmente al equipo/proveedor responsable de `innhosp` la necesidad de migrar `viewPersonal.clave` a un esquema de hash moderno con sal (BCrypt/Argon2/scrypt). Mientras tanto, mitigar con: contraseñas fuertes exigidas en el sistema origen, MFA si el hospital lo soporta, y monitoreo de intentos de acceso a esa base.
- **Corrección propuesta:** ninguna posible desde este repositorio — **este hallazgo se traslada íntegro al registro de riesgos residuales** (`RESIDUAL_RISK_REGISTER.md`).
- **Riesgo de regresión:** no aplica (no se modifica nada).
- **Prueba para validar la corrección:** no aplicable hasta que el hospital confirme una migración de esquema.
- **Prioridad:** alta pero no accionable por el equipo SGT.
- **Estado de remediación:** **No corregible desde este repositorio — riesgo residual aceptado, responsable sugerido: equipo de TI del hospital / dueño de `innhosp`.**

---

## SEC-008 — Contenedor del backend corre como `root`

- **Categoría:** Docker / infraestructura
- **Severidad:** Media
- **Estado:** Confirmado — corregido en esta sesión
- **Componente:** `huap_backend/Dockerfile`
- **Archivo:** `huap_backend/Dockerfile`, etapa final (`FROM eclipse-temurin:21-jdk-alpine`)
- **Evidencia:** no existe ninguna directiva `USER` en el Dockerfile; el proceso Java corre como `root` (UID 0) dentro del contenedor.
- **Descripción técnica:** si un atacante lograra ejecución de código dentro del proceso Java (p. ej. vía una dependencia vulnerable con deserialización insegura, no encontrada hoy pero posible a futuro), tendría privilegios de root **dentro del contenedor**, ampliando el impacto de cualquier técnica de escape de contenedor.
- **Recomendación:** ejecutar como usuario no privilegiado dedicado.
- **Corrección propuesta (implementada):** se agregó un usuario `spring` no root en el Dockerfile y `USER spring:spring` antes del `ENTRYPOINT`.
- **Riesgo de regresión:** bajo — Spring Boot no requiere privilegios de root para escuchar en el puerto 8080 (no es un puerto <1024).
- **Prueba para validar la corrección:** `docker exec huap-backend whoami` debe devolver `spring`, no `root`; el healthcheck y el arranque deben seguir funcionando.
- **Prioridad:** 8
- **Estado de remediación:** **Corregido** (ver `SECURITY_CHANGELOG.md`).

---

## SEC-009 — Bloqueo de fuerza bruta con ventana de producción incorrecta y sin compartir entre réplicas

- **Categoría:** Autenticación / disponibilidad
- **Severidad:** Media
- **Estado:** Confirmado — corregido parcialmente en esta sesión (ventana), documentado el resto
- **Componente:** Backend
- **Archivo:** `huap_backend/src/main/java/com/pingeso/HUAP/Security/LoginAttemptService.java`, línea 20
- **Evidencia:**
  ```java
  // Pruebas: 1 minuto. Producción recomendada: 15 * 60 * 1000L (15 min).
  private static final long LOCK_TIME_MS = 60 * 1000L; // 1 minuto
  ```
  El propio comentario del código documenta el valor de producción recomendado, que nunca se aplicó.
- **Descripción técnica:** (1) la ventana de bloqueo de 1 minuto es demasiado corta para producción, permitiendo reintentos rápidos tras cada bloqueo; (2) el contador es un `ConcurrentHashMap` en memoria de **cada instancia**, y hay 3 réplicas de backend detrás del balanceador — un atacante que reciba respuestas de las 3 instancias de forma rotativa puede efectivamente triplicar los intentos antes de agotar el límite en todas.
- **Corrección propuesta (implementada):** se externalizó la ventana de bloqueo a una propiedad configurable (`app.security.login.lock-duration-ms`, default 15 minutos) en vez del valor de prueba hardcodeado.
- **Corrección pendiente (no implementada):** compartir el estado de intentos entre las 3 réplicas requiere un almacén centralizado (Redis u otro) — cambio de infraestructura, se documenta en el plan de remediación, no implementado en esta sesión.
- **Riesgo de regresión:** bajo (el valor por defecto ahora es el que el propio equipo ya había documentado como el correcto para producción).
- **Prueba para validar la corrección:** tras 5 fallos, el sexto intento debe rechazarse por 15 minutos por defecto (o el valor configurado), no 1 minuto.
- **Prioridad:** 9
- **Estado de remediación:** **Parcialmente corregido** (ventana externalizada); **pendiente** compartir el estado entre réplicas.

---

## SEC-010 — Cabeceras de seguridad HTTP incompletas

- **Categoría:** Servidor web / hardening HTTP
- **Severidad:** Media
- **Estado:** Confirmado — corregido parcialmente en esta sesión
- **Componente:** Apache
- **Archivo:** `apache/httpd.conf`, líneas 160–165
- **Evidencia:** presentes `X-Frame-Options`, `X-Content-Type-Options`, `X-XSS-Protection` (obsoleta, inofensiva mantenerla), `Referrer-Policy`. **Ausentes:** `Content-Security-Policy`, `Permissions-Policy`, `Strict-Transport-Security` (esta última correctamente ausente hasta que TLS esté activo — activarla antes rompería el tráfico HTTP).
- **Corrección propuesta (implementada):** se agregó `Permissions-Policy` restrictiva y una `Content-Security-Policy` conservadora (permite estilos/scripts propios e inline —imprescindible porque el frontend usa extensivamente `style` inline de React— bloquea `object-src`, `frame-ancestors` y orígenes de script externos no listados). `Strict-Transport-Security` se deja documentada en el checklist de despliegue para activarla **después** de confirmar TLS funcionando (SEC-001), no antes.
- **Riesgo de regresión:** medio — una CSP mal calibrada puede bloquear recursos legítimos (fuentes de Google Fonts, por ejemplo). Se incluyó `fonts.googleapis.com`/`fonts.gstatic.com` en la política ya que `style.css` los usa.
- **Prueba para validar la corrección:** `curl -I` al frontend debe mostrar las cabeceras nuevas; verificación manual en navegador de que la app carga sin errores de CSP en consola.
- **Prioridad:** 10
- **Estado de remediación:** **Corregido** (CSP y Permissions-Policy); **HSTS pendiente de la resolución de SEC-001**.

---

## SEC-011 — Endpoint público `/api/v2/info` filtra detalles del entorno de ejecución

- **Categoría:** Exposición de información
- **Severidad:** Media
- **Estado:** Confirmado — corregido en esta sesión
- **Componente:** Backend
- **Archivo:** `huap_backend/src/main/java/com/pingeso/HUAP/Controller/HealthController.java`, método `serverInfo()` (líneas 47–60)
- **Evidencia:** `SecurityConfig.java` línea 92 marca `/api/v2/info` como `permitAll()`. La respuesta incluye `javaVersion`, `osName`, `availableProcessors`, `maxMemory`, `freeMemory`.
- **Descripción técnica:** cualquier visitante anónimo puede fingerprintear la versión exacta de Java y el sistema operativo del servidor sin autenticarse, información útil para elegir exploits conocidos de esa versión específica.
- **Corrección propuesta (implementada):** se removieron `javaVersion`, `osName`, `availableProcessors`, `maxMemory` y `freeMemory` de la respuesta pública; se conserva `serverId`, `application` y `timestamp` (necesarios para depurar cuál instancia del balanceador respondió, su propósito documentado original).
- **Riesgo de regresión:** bajo — el health-check y la utilidad de depuración "qué instancia respondió" se mantienen intactos; solo se retira información sensible del entorno.
- **Prueba para validar la corrección:** `curl http://.../api/v2/info` ya no debe incluir `javaVersion`/`osName`/`maxMemory`/`freeMemory`.
- **Prioridad:** 11
- **Estado de remediación:** **Corregido** (ver `SECURITY_CHANGELOG.md`).

---

## SEC-012 — JWT almacenado en `localStorage`

- **Categoría:** Frontend / gestión de sesión
- **Severidad:** Media (aceptado como decisión de arquitectura, con matices)
- **Estado:** Confirmado — no corregido (cambio arquitectónico mayor)
- **Componente:** Frontend
- **Archivo:** `sgt-huap_frontend/src/utils/tokenManager.js`, líneas 6–23
- **Descripción técnica:** un token en `localStorage` es legible por cualquier JavaScript que corra en el origen de la página, incluyendo scripts inyectados por XSS. No se encontraron sumideros de XSS activos hoy (`dangerouslySetInnerHTML`, `innerHTML=`, `eval` — cero resultados en todo `src/`), lo que reduce el riesgo actual, pero es una defensa en profundidad ausente: si a futuro se introduce cualquier XSS (propio o vía una dependencia comprometida), el JWT completo (con rol y servicio) queda inmediatamente robable.
- **Alternativa:** cookie `HttpOnly` + `Secure` + `SameSite=Strict` para el token, lo que requeriría además reintroducir protección CSRF (hoy deshabilitada porque no hay cookies de sesión) y cambiar el flujo de autenticación del backend (emitir `Set-Cookie` en vez de devolver el JWT en el cuerpo).
- **Recomendación:** no se implementa en esta sesión por ser un cambio de arquitectura de autenticación con alto riesgo de regresión y que además modificaría el contrato de la API de login (contrato público que las instrucciones piden no tocar salvo vulnerabilidad crítica insalvable de otro modo). Se deja como recomendación de hardening a mediano plazo en el checklist de despliegue.
- **Mitigación complementaria ya vigente:** no se hallaron sumideros de XSS; se recomienda mantener esa disciplina y agregar la CSP de SEC-010 como capa adicional.
- **Riesgo de regresión:** alto si se migra a cookies sin planificación.
- **Prioridad:** 12 (mediano plazo)
- **Estado de remediación:** **No corregido — recomendación de hardening a mediano plazo, registrada en riesgos residuales.**

---

## SEC-013 — Posible enumeración de usuarios por diferencia de tiempo de respuesta en login

- **Categoría:** Autenticación / canal lateral
- **Severidad:** Baja-Media
- **Estado:** Confirmado — corregido en esta sesión
- **Componente:** Backend
- **Archivo:** `huap_backend/src/main/java/com/pingeso/HUAP/Service/FuncionarioService.java`, método `authenticateWithPassword`, líneas 85–103
- **Evidencia:** cuando el RUT no existe (`usuario.isEmpty()`), el método lanza la excepción **inmediatamente**, sin invocar `passwordEncoder.matches(...)`; cuando el RUT sí existe pero la contraseña es incorrecta, sí se invoca `matches()` (que toma tiempo medible, sobre todo con BCrypt). El mensaje de error final es idéntico en ambos casos ("Credenciales incorrectas") — correcto — pero el **tiempo de respuesta difiere**.
- **Descripción técnica:** un atacante que mida el tiempo de respuesta puede distinguir estadísticamente "RUT no existe" (rápido) de "RUT existe, contraseña incorrecta" (más lento), permitiendo enumerar RUTs válidos sin depender del mensaje de error.
- **Corrección propuesta (implementada):** cuando el usuario no existe, se ejecuta igualmente una comparación `passwordEncoder.matches()` contra un hash señuelo fijo antes de lanzar la misma excepción, para equiparar el tiempo aproximado de ambas rutas. No cambia ningún mensaje ni código de estado — el comportamiento observable para el cliente es idéntico.
- **Riesgo de regresión:** muy bajo — es una operación adicional de solo cómputo (hash dummy), no altera el resultado ni el flujo.
- **Prueba para validar la corrección:** prueba unitaria que mide/mockea que `passwordEncoder.matches` se invoca tanto para RUT inexistente como para contraseña incorrecta.
- **Prioridad:** 13
- **Estado de remediación:** **Corregido** (ver `SECURITY_CHANGELOG.md`).

---

## SEC-014 — Archivos `.env` del frontend versionados en Git con detalles de infraestructura

- **Categoría:** Secretos y configuración
- **Severidad:** Baja
- **Estado:** Confirmado — documentado (no se modifica el historial de Git)
- **Componente:** Frontend
- **Archivo:** `sgt-huap_frontend/.env`, `sgt-huap_frontend/.env production` (nombre con un espacio, tracked en Git)
- **Evidencia:** `git ls-files | grep -i env` confirma ambos archivos versionados. Contenido actual: `VITE_API_BASE_URL=/api/v2` y `VITE_API_BASE_URL=http://200.30.242.110:8080/api/v1` respectivamente.
- **Descripción técnica:** no contienen secretos (son variables `VITE_*`, que de todas formas quedan embebidas en el bundle público al compilar, por lo que versionarlas no agrega exposición real de secreto), pero sí: (a) revelan una IP pública real y un puerto de backend expuesto directamente (8080) fuera del balanceador, y (b) referencian `/api/v1`, una versión de API distinta a la `v2` auditada — **requiere validación adicional** sobre si `v1` sigue viva, y si tiene los mismos controles de seguridad que `v2` (SecurityConfig, rate limiting de login, etc.) o si es un endpoint heredado sin mantener.
- **Recomendación:** no versionar archivos `.env` de ningún tipo (incluir `sgt-huap_frontend/.env*` en `.gitignore`, salvo `.env.example`); corregir el nombre de archivo con espacio; confirmar si `/api/v1` sigue activo y, si es así, auditarlo con el mismo nivel de detalle que `v2` o retirarlo si es legado sin uso.
- **Corrección propuesta:** se documenta aquí; **no se eliminó el archivo del historial de Git en esta sesión** (reescribir historia de Git es una operación destructiva que requiere autorización explícita y coordinación con todo el equipo, fuera del alcance de "cambios mínimos y reversibles"). Se recomienda como acción de seguimiento.
- **Riesgo de regresión:** ninguno si solo se ajusta `.gitignore` hacia adelante.
- **Prioridad:** 14
- **Estado de remediación:** **Documentado — acción de limpieza de repositorio recomendada, no ejecutada (requiere decisión del equipo sobre reescribir o no el historial).**

---

## SEC-015 — Vulnerabilidades en dependencias de desarrollo del frontend (`eslint`/`minimatch`/`brace-expansion`)

- **Categoría:** Dependencias (cadena de suministro, build-time)
- **Severidad:** Baja (no llega a producción)
- **Estado:** Confirmado — no corregido (requiere breaking change opcional)
- **Componente:** Frontend, `devDependencies`
- **Evidencia:** `npm audit` completo reporta 5 vulnerabilidades HIGH adicionales en la cadena `eslint → @eslint/config-array → minimatch → brace-expansion` (DoS por expansión de patrones). Todas son dependencias de **desarrollo** (linting), no se incluyen en el bundle servido a usuarios.
- **Recomendación:** `npm audit fix --force` actualiza `eslint` a una versión mayor (breaking change en reglas de lint, no en la app en sí). Se deja como tarea de mantenimiento no urgente, ya que no afecta el artefacto de producción.
- **Corrección propuesta:** no implementada en esta sesión (evitar un `--force` que cambie de mayor versión el linter sin que el equipo revise las reglas nuevas/removidas).
- **Riesgo de regresión:** bajo para el runtime, medio para el pipeline de lint (podría cambiar qué reglas fallan).
- **Prioridad:** 15 (mantenimiento)
- **Estado de remediación:** **Pendiente — no urgente, no afecta producción.**

---

## SEC-016 — Utilidad de generación de hash bundleada en el artefacto de producción

- **Categoría:** Higiene de build / superficie de ataque
- **Severidad:** Informativa
- **Estado:** Confirmado — no corregido
- **Componente:** Backend
- **Archivo:** `huap_backend/src/main/java/com/pingeso/HUAP/Utils/PasswordHashGenerator.java`
- **Descripción técnica:** clase con su propio `main()` para generar hashes BCrypt manualmente desde línea de comandos; vive en `src/main/java` y por lo tanto se empaqueta dentro del JAR de producción. No es un `@Component` ni se expone vía HTTP, por lo que no es alcanzable por un atacante remoto sin ejecución de código previa (en cuyo caso ya habría compromiso total). Su valor como hallazgo es de higiene: revela convenciones de esquema (`UPDATE personal SET clave = ...`) si el JAR llegara a filtrarse, y aumenta innecesariamente la superficie del artefacto productivo.
- **Recomendación:** mover a un módulo/herramienta separada fuera de `src/main` (p. ej. un script Maven en `src/tools` excluido del JAR final, o un `main class` bajo `src/test` con scope de test).
- **Corrección propuesta:** no implementada en esta sesión (bajo impacto, se prioriza el tiempo en hallazgos de mayor severidad).
- **Prioridad:** 16 (mantenimiento)
- **Estado de remediación:** **Pendiente — informativo.**

---

## SEC-017 — `X-Forwarded-For` reenviado sin normalizar desde el cliente

- **Categoría:** Proxy / integridad de metadatos de red
- **Severidad:** Baja — **Requiere validación adicional**
- **Estado:** Requiere validación adicional
- **Componente:** Apache
- **Archivo:** `apache/conf.d/locations/api.conf`, línea 47
- **Evidencia:** `RequestHeader set X-Forwarded-For "%{X-Forwarded-For}s"` — reenvía el valor que el **cliente** ya trae en ese header, en vez de fijarlo/agregarle la IP real vista por Apache. `X-Real-IP` sí se fija correctamente desde `%{REMOTE_ADDR}s` en la misma sección.
- **Descripción técnica:** un cliente puede enviar su propio `X-Forwarded-For` falso; si algún control de seguridad (logging de auditoría, bloqueo por IP) confiara en `X-Forwarded-For` en lugar de `X-Real-IP`, sería spoofeable.
- **Recomendación:** no se encontró, en el código revisado, ningún lugar del backend que lea `X-Forwarded-For` para tomar decisiones de seguridad (Bitácora y logs usan el RUT/usuario autenticado, no la IP) — **pero no se descartó exhaustivamente cada log/consumidor**, de modo que se marca como *Requiere validación adicional* en vez de afirmarlo con certeza. Recomendación preventiva: cambiar a `RequestHeader set X-Forwarded-For "%{REMOTE_ADDR}s"` (sobrescribir, no reenviar) para eliminar la ambigüedad sin costo.
- **Corrección propuesta:** no implementada en esta sesión (bajo impacto confirmado, y el cambio podría afectar herramientas de log externas que sí esperen encadenar `X-Forwarded-For` legítimamente en topologías con más de un proxy — se prefiere no tocarlo sin confirmar la topología real de despliegue).
- **Prioridad:** 17
- **Estado de remediación:** **Pendiente — requiere validación adicional sobre consumidores de ese header antes de cambiarlo.**

---

## SEC-018 — Pruebas de integración/concurrencia no ejecutables en este entorno de análisis

- **Categoría:** Aseguramiento de calidad
- **Severidad:** Informativa
- **Estado:** Requiere validación adicional
- **Descripción:** 26 pruebas (`*IntegrationTest`, `*ConcurrencyTest`) dependen de Testcontainers y no pudieron ejecutarse en este entorno sandboxeado (ver `SECURITY_BASELINE.md`, sección 4). No se puede afirmar que pasen o fallen desde aquí.
- **Recomendación:** ejecutar `mvn test` en CI o en un entorno con Docker nativo antes de aprobar el paso a producción, y tratar cualquier falla real como bloqueante independientemente de este informe.
- **Prioridad:** verificación obligatoria antes de producción.
- **Estado de remediación:** **Requiere validación adicional en un entorno con Docker funcional.**
