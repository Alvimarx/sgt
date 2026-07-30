# Registro de riesgos residuales — SGT HUAP

Riesgos identificados que **no** se eliminaron en esta auditoría, con la razón por la que permanecen.

---

## RR-001 (SEC-007) — Hash de contraseña heredado (SHA-512 sin sal) en `viewPersonal` del hospital

- **Severidad:** Alta
- **Motivo por el que permanece:** el esquema de hash de `innhosp.viewPersonal.clave` es propiedad y responsabilidad del sistema del hospital; SGT tiene acceso de **solo lectura** confirmado (`hospital.datasource.hikari.read-only=true`). No es técnicamente posible re-hashear o migrar ese esquema desde este repositorio.
- **Compensación existente:** las contraseñas creadas directamente en SGT (no heredadas del hospital) sí usan BCrypt correctamente vía `DelegatingPasswordEncoder`.
- **Acción pendiente:** escalar formalmente al equipo de TI/proveedor del hospital la necesidad de migrar a un esquema de hash con sal (BCrypt/Argon2/scrypt).
- **Responsable sugerido:** equipo de TI del hospital, dueño de `innhosp`.
- **Requisito para cerrarlo:** confirmación del hospital de que `viewPersonal.clave` fue migrado a un hash moderno con sal.
- **Impacto de publicar sin resolverlo:** si la BD del hospital o un respaldo se filtran, las contraseñas heredadas son crackeables con hardware moderno de forma significativamente más rápida que un hash adecuado. El impacto recae sobre cuentas de personal de salud, no sobre datos exclusivos de SGT.

---

## RR-002 (SEC-001) — Sin TLS/HTTPS configurado

- **Severidad:** Crítica
- **Motivo por el que permanece:** requiere un dominio y certificado reales, y una decisión de dónde se termina TLS (Apache directo vs. CDN/WAF delante) — recursos de infraestructura que no existen dentro de este repositorio de código.
- **Compensación existente:** ninguna.
- **Acción pendiente:** provisionar certificado (Let's Encrypt u otro), configurar `VirtualHost *:443`, redirección HTTP→HTTPS.
- **Responsable sugerido:** equipo de infraestructura/DevOps.
- **Requisito para cerrarlo:** `curl -I https://dominio` responde 200 con certificado válido; `curl -I http://dominio` redirige 301 a HTTPS.
- **Impacto de publicar sin resolverlo:** **no debe publicarse.** Todo el tráfico (credenciales, JWT, datos de personal) viajaría en texto claro.

---

## RR-003 (SEC-003) — Sin rate limiting real en el borde

- **Severidad:** Alta
- **Motivo por el que permanece:** Apache base (`httpd:2.4-alpine`) no incluye `mod_evasive`/`mod_qos`; agregarlo requiere reconstruir la imagen con paquetes adicionales y calibrar umbrales con pruebas de carga, un esfuerzo mayor a un "cambio mínimo" de esta sesión.
- **Compensación existente:** `LoginAttemptService` a nivel de aplicación (5 intentos, bloqueo ahora de 15 min por defecto tras esta auditoría).
- **Acción pendiente:** agregar `mod_evasive` a la imagen de `apache-lb` o colocar un WAF/CDN (Cloudflare u otro) delante, calibrado con pruebas de carga.
- **Responsable sugerido:** equipo de infraestructura/DevSecOps.
- **Requisito para cerrarlo:** prueba de flood controlada que confirme HTTP 429 antes de agotar los intentos de aplicación.
- **Impacto de publicar sin resolverlo:** mayor ventana para fuerza bruta distribuida entre las 3 réplicas de backend y para ataques de agotamiento de recursos.

---

## RR-004 (SEC-004) — Autorización insuficiente en endpoints de `funcionarios`

- **Severidad:** Alta
- **Motivo por el que permanece:** corregirlo sin conocer la intención de negocio real (¿debe cualquier funcionario ver el directorio completo del hospital, o debe restringirse por servicio/rol?) arriesga romper una función legítima. Se detuvo la corrección conforme a la instrucción explícita de la auditoría de no alterar posibles reglas de negocio sin validación.
- **Compensación existente:** requiere JWT válido (no es anónimo); el ownership de `PUT /funcionarios/{id}` sí está correctamente protegido.
- **Acción pendiente:** el equipo de producto/negocio debe confirmar el modelo de autorización deseado para los endpoints de lectura (`summary`, `disponibilidad`, `status`); luego implementar la restricción correspondiente.
- **Responsable sugerido:** Product Owner / equipo funcional de SGT, junto con el equipo de desarrollo para la implementación.
- **Requisito para cerrarlo:** decisión documentada + implementación con prueba de que un usuario sin el permiso adecuado recibe 403.
- **Impacto de publicar sin resolverlo:** cualquier cuenta autenticada (incluso de bajo privilegio) puede recolectar RUT completo, nombre y profesión de todo el personal registrado, y enumerar qué RUTs están registrados.

---

## RR-005 (SEC-005) — Dependencia `react-router-dom` con CVE sin versión parcheada disponible

- **Severidad:** Alta
- **Motivo por el que permanece:** la versión parcheada (`8.3.0` según el advisory oficial) no está publicada en el registro npm consultado desde este entorno al momento de la auditoría.
- **Compensación existente:** el uso de la librería en el código es mínimo (solo `BrowserRouter`/`Routes`/`Route`/`Navigate`, sin APIs de RSC/data-loading que activarían la vulnerabilidad específica reportada).
- **Acción pendiente:** monitorear la publicación de `react-router-dom@8.3.0`+ y actualizar en cuanto esté disponible; ejecutar `npm audit` periódicamente (recomendado integrarlo a un pipeline CI).
- **Responsable sugerido:** equipo de frontend.
- **Requisito para cerrarlo:** `npm audit` sin el advisory GHSA-qwww-vcr4-c8h2.
- **Impacto de publicar sin resolverlo:** bajo dado el patrón de uso actual, pero la dependencia vulnerable de todas formas se distribuye a los usuarios.

---

## RR-006 (SEC-006) — `spring-boot-starter-parent` en versión SNAPSHOT

- **Severidad:** Alta
- **Motivo por el que permanece:** migrar de una versión mayor de framework (incluso "hacia atrás" a una GA estable) requiere una ronda de pruebas de regresión completa que excede el alcance de "cambios mínimos" de esta sesión, y puede tener efectos no triviales sobre Spring Security/JPA/auto-configuración.
- **Compensación existente:** ninguna — el build funciona hoy, pero sobre una base no reproducible de forma determinista.
- **Acción pendiente:** planificar la migración a la última GA de Spring Boot 3.x compatible con Java 21, con una ronda de pruebas dedicada.
- **Responsable sugerido:** equipo de backend.
- **Requisito para cerrarlo:** build reproducible en una versión GA, suite completa en verde en los 3 perfiles.
- **Impacto de publicar sin resolverlo:** riesgo de que el build deje de ser reproducible (el SNAPSHOT puede cambiar o desaparecer del repositorio de Spring), y de heredar código de una rama de desarrollo activa de un framework de seguridad central sin el mismo nivel de escrutinio que una release estable.

---

## RR-007 (SEC-012) — JWT almacenado en `localStorage`

- **Severidad:** Media
- **Motivo por el que permanece:** migrar a cookies `HttpOnly` requiere cambiar el contrato de la API de login (emitir `Set-Cookie` en vez de devolver el JWT en el cuerpo) y reintroducir protección CSRF — un cambio arquitectónico que las instrucciones de esta auditoría piden no hacer salvo vulnerabilidad crítica insalvable de otra forma, y no se encontró evidencia de explotación activa (no hay sumideros de XSS en el código hoy).
- **Compensación existente:** no se hallaron sumideros de XSS (`dangerouslySetInnerHTML`, `innerHTML=`, `eval`) en todo `sgt-huap_frontend/src`; se agregó una CSP (SEC-010) como capa adicional de defensa en profundidad.
- **Acción pendiente:** evaluar la migración a cookies como mejora de mediano plazo, con planificación dedicada.
- **Responsable sugerido:** equipo de frontend + backend (cambio conjunto).
- **Requisito para cerrarlo:** decisión explícita del equipo + implementación con regresión completa del flujo de login/sesión.
- **Impacto de publicar sin resolverlo:** si a futuro se introduce cualquier XSS, el JWT completo (con rol y servicio) sería robable de inmediato. Riesgo latente, no explotado hoy.

---

## RR-008 (SEC-009, parcial) — Contador de intentos de login no compartido entre réplicas

- **Severidad:** Media
- **Motivo por el que permanece:** cerrarlo requiere un almacén compartido (Redis u otro), un componente de infraestructura nuevo, fuera del alcance de "cambios mínimos".
- **Compensación existente:** la ventana de bloqueo ya se corrigió a 15 minutos (antes 1 minuto); cada instancia individual sí aplica el límite de 5 intentos.
- **Acción pendiente:** evaluar introducir Redis (u otro almacén compartido) si el volumen de tráfico/ataques lo justifica.
- **Responsable sugerido:** equipo de backend/infraestructura.
- **Requisito para cerrarlo:** prueba que demuestre bloqueo consistente aun alternando entre las 3 instancias de backend.
- **Impacto de publicar sin resolverlo:** un atacante distribuido a través del balanceador puede obtener hasta ~3× los intentos efectivos antes de quedar bloqueado en las tres instancias.

---

## RR-009 (SEC-014) — Archivos `.env` del frontend versionados en Git

- **Severidad:** Baja
- **Motivo por el que permanece:** no contienen secretos reales, pero limpiarlos del historial de Git (no solo hacia adelante) requiere reescribir la historia, una operación destructiva que necesita coordinación explícita de todo el equipo — fuera del alcance de un cambio unilateral en esta sesión.
- **Compensación existente:** el contenido actual no incluye secretos (son variables `VITE_*` públicas por diseño).
- **Acción pendiente:** agregar `sgt-huap_frontend/.env*` a `.gitignore` hacia adelante; decidir en equipo si vale la pena reescribir el historial.
- **Responsable sugerido:** equipo de frontend + quien administre el repositorio Git.
- **Requisito para cerrarlo:** `.gitignore` actualizado; decisión explícita sobre el historial.
- **Impacto de publicar sin resolverlo:** exposición menor de topología de red (IP pública, puerto de backend directo) — no de secretos.

---

## RR-010 (SEC-018) — Pruebas de integración/concurrencia no verificadas en este ciclo

- **Severidad:** Informativa/bloqueante de proceso
- **Motivo por el que permanece:** requieren Testcontainers con Docker nativo, no disponible en este entorno de análisis sandboxeado.
- **Compensación existente:** las 183 pruebas unitarias/de servicio sí se ejecutaron y pasan.
- **Acción pendiente:** ejecutar `mvn test` completo en CI o en un host con Docker nativo antes de aprobar el paso a producción.
- **Responsable sugerido:** equipo de backend / CI.
- **Requisito para cerrarlo:** las 26 pruebas en verde en un entorno con Docker funcional.
- **Impacto de publicar sin resolverlo:** no se puede afirmar con certeza que la lógica de concurrencia (dobles reservas, condiciones de carrera en asignación de turnos) esté libre de regresiones — **verificación obligatoria antes de producción**, independientemente del resultado de esta auditoría de seguridad.
