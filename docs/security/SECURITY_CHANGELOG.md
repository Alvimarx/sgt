# Changelog de seguridad — SGT HUAP

Rama `security/internet-hardening`. Todos los cambios son aditivos/configurables y reversibles (ver "Forma de reversión" en cada entrada).

---

### SEC-002 — CORS restringido a orígenes explícitos

- **Archivo modificado:** `huap_backend/src/main/java/com/pingeso/HUAP/Config/CorsConfig.java`, `huap_backend/src/main/resources/application.properties`, `.env.example`, `docker-compose.yml`
- **Comportamiento anterior:** `allowedOriginPatterns` incluía comodines de red privada completos (`http://192.168.*.*` con cualquier puerto) y una IP pública hardcodeada, con `allowCredentials(true)` y `allowedHeaders("*")`.
- **Riesgo anterior:** cualquier origen dentro de una red privada `192.168.0.0/16` quedaba habilitado como origen confiable con credenciales; configuración de desarrollo reutilizada tal cual en producción.
- **Cambio realizado:** orígenes permitidos externalizados a `app.cors.allowed-origins` (env `CORS_ALLOWED_ORIGINS`), lista explícita separada por comas, sin comodines de red privada; `allowedHeaders` acotado a `Authorization, Content-Type` (los únicos que el frontend envía realmente). Producción exige la variable (`:?` en `docker-compose.yml`) — no arranca sin configurarla explícitamente.
- **Motivo del cambio:** reducir la superficie de confianza cross-origin al mínimo necesario.
- **Pruebas ejecutadas:** `curl OPTIONS` con origen no listado → 403 sin cabeceras CORS; con origen configurado → 200 con `Access-Control-Allow-Origin` correcto. Suite completa de backend (188 pruebas) sin regresiones.
- **Resultado:** corregido y verificado.
- **Posible impacto:** si el `.env` de producción real no define `CORS_ALLOWED_ORIGINS` con el dominio correcto, el backend **no arrancará** (fail-safe intencional) o el frontend en producción no podrá llamar a la API. Acción requerida del equipo de despliegue: fijar esa variable con el dominio público definitivo antes de desplegar.
- **Forma de reversión:** `git revert` del commit, o restaurar el bean anterior en `CorsConfig.java`.
- **Estado final:** Corregido.

---

### SEC-011 — `/api/v2/info` ya no expone detalles del entorno

- **Archivo modificado:** `huap_backend/src/main/java/com/pingeso/HUAP/Controller/HealthController.java`
- **Comportamiento anterior:** el endpoint público devolvía `javaVersion`, `osName`, `availableProcessors`, `maxMemory`, `freeMemory`.
- **Riesgo anterior:** fingerprinting no autenticado del entorno de ejecución (CWE-200).
- **Cambio realizado:** la respuesta ahora solo incluye `serverId`, `application` y `timestamp` (lo necesario para depurar cuál instancia del balanceador respondió).
- **Motivo del cambio:** eliminar información innecesaria de un endpoint intencionalmente público.
- **Pruebas ejecutadas:** `curl /api/v2/info` verificado manualmente tras el cambio; healthcheck de Docker sigue en verde.
- **Resultado:** corregido y verificado.
- **Posible impacto:** ninguno — ningún consumidor del sistema (frontend, healthchecks) usa los campos removidos.
- **Forma de reversión:** restaurar los campos en `serverInfo()`.
- **Estado final:** Corregido.

---

### SEC-013 — Mitigación de enumeración de usuarios por temporización en login

- **Archivo modificado:** `huap_backend/src/main/java/com/pingeso/HUAP/Service/FuncionarioService.java`
- **Comportamiento anterior:** cuando el RUT no existía, el método retornaba inmediatamente sin invocar `passwordEncoder.matches()`, lo que hacía esa rama medible/más rápida que la de "contraseña incorrecta".
- **Riesgo anterior:** posible enumeración de RUTs válidos midiendo el tiempo de respuesta del login.
- **Cambio realizado:** se invoca `passwordEncoder.matches()` contra un hash BCrypt señuelo fijo antes de lanzar la misma excepción ("Credenciales incorrectas"), para equiparar el costo computacional de ambas rutas. **No cambia ningún mensaje, código de estado, ni resultado observable.**
- **Motivo del cambio:** cerrar un canal lateral de temporización sin alterar el comportamiento funcional del login.
- **Pruebas ejecutadas:** nueva prueba unitaria `authenticateWithPassword_rutNoExiste_igualInvocaPasswordEncoder_paraEvitarEnumeracionPorTiempo`, más las 5 pruebas preexistentes de `FuncionarioServiceTest` (sin cambios en sus aserciones, todas en verde).
- **Resultado:** corregido y verificado.
- **Posible impacto:** ninguno funcional; agrega un cómputo de hash adicional (mismo orden de magnitud que una verificación BCrypt normal) solo en la rama de RUT inexistente.
- **Forma de reversión:** quitar la llamada a `passwordEncoder.matches()` en esa rama.
- **Estado final:** Corregido.

---

### SEC-009 (parcial) — Ventana de bloqueo de login configurable (15 min por defecto)

- **Archivo modificado:** `huap_backend/src/main/java/com/pingeso/HUAP/Security/LoginAttemptService.java`, `application.properties`, `.env.example`, `docker-compose.yml`
- **Comportamiento anterior:** `LOCK_TIME_MS` hardcodeado a 1 minuto, con un comentario explícito del propio equipo indicando que 15 minutos era el valor recomendado para producción, nunca aplicado.
- **Riesgo anterior:** ventana de bloqueo demasiado corta para producción, facilitando reintentos rápidos de fuerza bruta.
- **Cambio realizado:** ventana externalizada a `app.security.login.lock-duration-ms` (env `LOGIN_LOCK_DURATION_MS`), con 900000 ms (15 min) por defecto.
- **Motivo del cambio:** aplicar el valor que el propio código ya documentaba como correcto para producción, y permitir ajustarlo sin recompilar.
- **Pruebas ejecutadas:** 4 pruebas nuevas en `LoginAttemptServiceTest` (bajo el límite no bloquea; alcanzar el máximo bloquea por la ventana configurada; la ventana expira; un login exitoso limpia el contador).
- **Resultado:** corregido (la externalización); **pendiente** compartir el contador entre las 3 réplicas de backend (requiere almacén centralizado, ver `RESIDUAL_RISK_REGISTER.md`).
- **Posible impacto:** un usuario legítimo que falle 5 veces esperará ahora 15 minutos en vez de 1 — cambio de comportamiento **intencional** y ya documentado como el valor correcto por el propio equipo previamente.
- **Forma de reversión:** volver a la constante hardcodeada de 60000 ms.
- **Estado final:** Parcialmente corregido.

---

### SEC-008 — Contenedor backend ya no corre como root

- **Archivo modificado:** `huap_backend/Dockerfile`
- **Comportamiento anterior:** sin directiva `USER`; el proceso Java corría como `root` (UID 0).
- **Riesgo anterior:** mayor impacto de una eventual ejecución de código dentro del contenedor.
- **Cambio realizado:** se agregó un usuario `spring` sin privilegios y `USER spring:spring` antes del `ENTRYPOINT`.
- **Motivo del cambio:** principio de mínimo privilegio en contenedores.
- **Pruebas ejecutadas:** `docker compose build backend` (éxito); `docker compose up -d backend` (contenedor healthy); `docker exec huap-backend whoami`/`id` → `spring`/`uid=100`, no root; `curl /api/v2/health` responde normalmente.
- **Resultado:** corregido y verificado end-to-end (build + arranque + healthcheck + respuesta HTTP).
- **Posible impacto:** ninguno detectado — Spring Boot no requiere privilegios de root para el puerto 8080 ni para ninguna otra operación observada.
- **Forma de reversión:** quitar las líneas `RUN addgroup...`/`USER spring:spring`.
- **Estado final:** Corregido.

---

### SEC-010 (parcial) — Cabeceras `Content-Security-Policy` y `Permissions-Policy` agregadas

- **Archivo modificado:** `apache/httpd.conf`
- **Comportamiento anterior:** solo `X-Frame-Options`, `X-Content-Type-Options`, `X-XSS-Protection`, `Referrer-Policy`.
- **Riesgo anterior:** sin CSP, un XSS (si llegara a introducirse) tendría vía libre para cargar/ejecutar recursos arbitrarios; sin `Permissions-Policy`, APIs sensibles del navegador (geolocalización, cámara, micrófono) quedan implícitamente permitidas.
- **Cambio realizado:** se agregó una CSP conservadora (`script-src 'self'` sin `unsafe-inline`; `style-src` con `unsafe-inline` porque React usa estilos inline extensivamente y se carga la hoja de Google Fonts; `object-src 'none'`; `frame-ancestors 'self'`) y una `Permissions-Policy` que deshabilita `geolocation`, `microphone`, `camera`, `payment`, `usb`. **No se agregó `Strict-Transport-Security`** intencionalmente hasta resolver SEC-001 (TLS), para no romper el acceso HTTP actual.
- **Motivo del cambio:** defensa en profundidad ante XSS y reducción de superficie de APIs del navegador.
- **Pruebas ejecutadas:** verificación manual de que el frontend sigue sirviendo assets vía Apache sin cambios (misma imagen de frontend, sin rebuild necesario para esta corrección ya que vive en `httpd.conf` del load balancer); revisión de que ningún script/estilo del build de Vite requiere un origen externo no listado (solo Google Fonts, ya incluido).
- **Resultado:** corregido para las cabeceras agregadas; HSTS queda pendiente y documentado en el checklist de despliegue.
- **Posible impacto:** si en el futuro se agrega un recurso externo nuevo (script, iframe, fuente) sin actualizar la CSP, el navegador lo bloqueará — comportamiento esperado y deseable, pero requiere que el equipo recuerde actualizar la política al agregar dependencias externas.
- **Forma de reversión:** quitar las dos líneas `Header always set` agregadas.
- **Estado final:** Parcialmente corregido (falta HSTS, bloqueado por SEC-001).

---

### SEC-005 — Intento de actualizar `react-router-dom` (no aplicado)

- **Archivo:** `sgt-huap_frontend/package.json`, `package-lock.json`
- **Cambio realizado:** **ninguno real** — se ejecutó `npm audit fix` y se verificó con `npm audit`/`npm ls` que la versión vulnerable no cambió, porque la versión parcheada (`8.3.0`, confirmada en el advisory oficial) no está publicada todavía en el registro npm consultado desde este entorno.
- **Motivo de no aplicar el cambio:** no existe versión instalable que corrija el hallazgo en este momento.
- **Pruebas ejecutadas:** `npm audit` antes/después (sin cambio en el hallazgo); `npm ls react-router-dom` confirma versión sin cambios (7.18.1).
- **Resultado:** **no corregido** — ver nota de honestidad del proceso en `SECURITY_AUDIT_REPORT.md` (se había registrado inicialmente como corregido por error, y se corrigió esa afirmación al comprobarla).
- **Estado final:** Abierto — monitorear disponibilidad de `react-router-dom@8.3.0`+.
