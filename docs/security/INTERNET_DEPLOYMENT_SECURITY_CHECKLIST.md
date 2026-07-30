# Checklist de seguridad para publicación en Internet — SGT HUAP

Estado: ☐ pendiente · ☑ hecho/verificado en esta auditoría · ⚠ bloqueante

## Red y exposición

- ☑ Solo `apache-lb` se publica al host (`5173`, `443`); backend/frontend/BD permanecen en la red Docker interna (arquitectura ya correcta, verificada en `docker-compose.yml`).
- ☐ Firewall del host/proveedor cloud configurado para exponer únicamente 80/443 (y SSH restringido a IPs de administración) — **requiere validación en el servidor real de producción, fuera de este repositorio**.
- ☐ Confirmar que la BD propia (`gestionturnos`) **no** queda accesible desde Internet en el servidor real (el compose de producción no la publica, pero corre "ya creada en la PC" — validar el firewall de esa máquina).
- ☐ Restringir acceso SSH al servidor de producción (clave pública, sin contraseña, IP allowlist si es posible).
- ☐ Deshabilitar cualquier servicio de desarrollo (Swagger, consolas) — ya con `SWAGGER_ENABLED=false` por defecto en producción (verificado en `docker-compose.yml`); confirmar que el `.env` real no lo sobreescribe a `true`.

## HTTPS y certificados

- ⚠ **HTTPS obligatorio — bloqueante (SEC-001).** No se encontró `VirtualHost *:443` ni `mod_ssl` configurado en `apache/httpd.conf` pese a que el puerto 443 se publica. **No publicar el sistema sin resolver esto.**
- ☐ Obtener certificado válido (Let's Encrypt/Certbot u otro) para el dominio real de producción.
- ☐ Configurar `VirtualHost *:443` con el certificado y redirección `301` desde `:80`.
- ☐ Verificar protocolos/cifrados (TLS 1.2+ únicamente, sin SSLv3/TLS 1.0/1.1).
- ☐ Configurar renovación automática del certificado (cron/systemd timer de Certbot).
- ☐ Activar `Strict-Transport-Security` **solo después** de confirmar que HTTPS funciona de forma estable (se dejó fuera intencionalmente en esta sesión, ver SEC-010).
- ☐ Confirmar que ninguna clave privada de TLS queda dentro de una imagen Docker versionada o en el repositorio.

## Proxy inverso (Apache)

- ☑ `LimitRequestBody` (50 MB), `LimitRequestFieldSize`/`LimitRequestFields`, timeouts configurados.
- ☑ Cabeceras de seguridad: `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, y ahora `Content-Security-Policy`, `Permissions-Policy` (agregadas en esta auditoría).
- ☑ `ServerTokens Prod` / `ServerSignature Off` — versión de Apache oculta.
- ☐ **Rate limiting real por IP (SEC-003)** — hoy solo hay mitigación a nivel de aplicación (`LoginAttemptService`); agregar `mod_evasive` a la imagen de Apache o colocar un WAF/CDN delante antes de publicar, especialmente para `/api/v2/funcionarios/login`.
- ☐ Confirmar que no se listan directorios (`Options -Indexes` — no se encontró `Options Indexes` habilitado explícitamente en las locations revisadas, pero **requiere validación adicional** en `apache/conf.d/locations/frontend.conf`, no auditado línea por línea en esta sesión).
- ☐ Bloquear acceso directo a archivos de configuración/backup si llegaran a copiarse accidentalmente al `DocumentRoot` (`.env`, `.git`, `*.sql`).

## Aplicación (backend)

- ☑ Modo producción vía `DDL_AUTO=validate` (no modifica el esquema en producción).
- ☑ Swagger deshabilitado por defecto en producción (`SWAGGER_ENABLED=false`).
- ☑ CORS restringido a orígenes explícitos (corregido en esta auditoría, SEC-002) — **acción pendiente del equipo:** fijar `CORS_ALLOWED_ORIGINS` en el `.env` real con el dominio público definitivo antes de desplegar.
- ☑ Sin cookies de sesión (JWT en `Authorization` header) — CSRF correctamente no aplicable, verificado.
- ☑ Bloqueo de fuerza bruta en login, ventana ahora configurable (15 min por defecto) — **acción pendiente:** considerar compartir el contador entre réplicas (Redis) si el volumen de tráfico lo justifica (SEC-003/SEC-009).
- ☐ **Autorización por rol/servicio en endpoints de `funcionarios` (SEC-004)** — requiere que el equipo de producto confirme el modelo de negocio correcto antes de restringir.
- ☐ MFA para cuentas `ADMINISTRADOR` — no implementado; evaluar viabilidad (depende de si el hospital lo soporta para las cuentas heredadas).
- ☑ Manejo de errores sin fuga de stack traces/SQL (`GlobalExceptionHandler`, verificado como control ya existente y correcto).
- ☑ `/api/v2/info` ya no expone versión de Java/SO/memoria (corregido, SEC-011).

## Base de datos

- ☑ La BD propia y la del hospital no se publican directamente a Internet en la arquitectura de contenedores revisada.
- ☐ Confirmar en el servidor real que el proceso MySQL de `gestionturnos` escucha solo en `127.0.0.1`/red interna, no en `0.0.0.0` con el puerto expuesto al exterior.
- ☑ Acceso de solo lectura correctamente aplicado para la BD del hospital (`hospital.datasource.hikari.read-only=true`, verificado en `application.properties`).
- ☐ Confirmar cifrado de conexión JDBC (TLS) hacia ambas bases de datos — no se pudo verificar `useSSL`/`sslMode` en las cadenas de conexión reales de producción (dependen del `.env`, no versionado). **Requiere validación adicional.**
- ☐ Respaldos cifrados y con prueba de restauración documentada — no se encontró evidencia de un procedimiento de respaldo en el repositorio. **Requiere validación adicional con el equipo de infraestructura.**
- ⚠ El hash de contraseñas heredado del hospital (SHA-512 sin sal, SEC-007) es un riesgo que **no se puede cerrar desde este repositorio** — ver `RESIDUAL_RISK_REGISTER.md`.

## Secretos

- ☑ `.env` real (con secretos) **no está versionado** en Git (confirmado con `git ls-files`); solo `.env.example` (con placeholders) está trackeado.
- ☑ `JWT_SECRET`/`DB_PASSWORD`/`HOSPITAL_DB_PASSWORD` sin valores por defecto en el código — el backend falla al arrancar si no se configuran (`:?` en `docker-compose.yml`), comportamiento correcto de "fail closed".
- ⚠ `sgt-huap_frontend/.env` y `sgt-huap_frontend/.env production` **sí están versionados** (SEC-014) — no contienen secretos reales (son `VITE_*`, públicos por diseño de Vite), pero sí una IP pública y una ruta `/api/v1` sin auditar; se recomienda dejar de versionarlos hacia adelante.
- ☐ Confirmar que ningún log de aplicación o de Apache registre contraseñas o tokens completos — se revisó el código de logging del flujo de login y **no se encontró** que se registre la contraseña (solo si está presente o no); **no se auditó el 100% de los `logger.info/debug` del resto del backend línea por línea**, se marca como `Requiere validación adicional` para una revisión exhaustiva adicional.
- ☐ Rotar `JWT_SECRET` y las credenciales de BD reales antes del primer despliegue a Internet si el `.env` actual del servidor de desarrollo/pruebas se reutilizara en producción (no se pudo confirmar cuál es el valor real usado hoy, correctamente fuera del alcance de este repositorio).

## Monitoreo

- ☑ Bitácora de auditoría de aplicación existente (`BitacoraService`/`Bitacora_eventos`) para eventos de negocio (generación/eliminación de turnos, solicitudes, ofertas).
- ☐ Alertas de seguridad (múltiples logins fallidos, picos de error 401/403/429) — no se encontró integración de alertas (Sentry, Prometheus Alertmanager, etc.) en el repositorio. **Requiere validación adicional / trabajo de infraestructura.**
- ☐ Sincronización horaria (NTP) del servidor de producción — fuera del alcance de este repositorio.
- ☐ Procedimiento de respuesta a incidentes documentado — no se encontró en `docs/`; se recomienda crear uno antes de publicar.

## Continuidad operacional

- ☑ Healthchecks definidos para todos los servicios en `docker-compose.yml` (backend, frontend, apache-lb).
- ☑ `restart: always` configurado para reinicio automático ante caídas.
- ☐ Límites de recursos (`mem_limit`/`cpus`) por contenedor — no se encontraron límites explícitos en `docker-compose.yml`; recomendable agregarlos para evitar que un contenedor comprometido/con fuga de memoria afecte a los demás.
- ☐ Plan de reversión documentado para un despliegue fallido (rollback de imagen) — no se encontró en el repositorio.
- ☐ Ventana de mantenimiento y contactos responsables — a definir por el equipo, fuera del alcance técnico de este repositorio.

---

## Resumen: bloqueantes antes de publicar en Internet

1. **TLS/HTTPS real (SEC-001)** — sin esto, no publicar.
2. **`CORS_ALLOWED_ORIGINS` configurado con el dominio real** antes de desplegar (la corrección de esta auditoría exige la variable; sin ella, el backend no arranca).
3. **Rate limiting de borde (SEC-003)** — fuertemente recomendado antes de publicar, no estrictamente bloqueante si se acepta el riesgo residual documentado.
4. **Decisión de negocio sobre autorización de `/funcionarios/**` (SEC-004)** — recomendado resolver antes de publicar, dado que expone PII (RUT) sin distinción de rol/servicio hoy.
