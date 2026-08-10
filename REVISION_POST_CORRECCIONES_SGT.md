# REVISIÓN POST-CORRECCIONES — SGT

**Fecha:** 2026-08-06
**Alcance:** Corrección controlada de bloqueantes y brechas residuales identificadas en la Fase 1 de auditoría (`docs/security/AUDITORIA_SEGURIDAD_FASE1_2026-08-06.md`).
**Sin commit, sin push, sin cambio de rama, sin despliegue, sin bases de datos productivas, sin rotación de secretos.**

---

## 1. Cambios realizados

### 1.1 BLOQUEANTE — Firmas obsoletas en tests (build roto)

| Archivo | Método(s) | Problema | Justificación | Test asociado |
|---|---|---|---|---|
| `AbstractContainerTest.java` | (nuevo) `autenticarComo`, `autenticarComoAdministrador`, `@AfterEach limpiarSecurityContext` | Los tests de integración/concurrencia llamaban servicios que ahora exigen `SecurityContext` autenticado, pero no tenían forma de simularlo | Helper único, reutilizado por las 6 subclases afectadas, evita duplicar lógica de autenticación de prueba | N/A (infraestructura de test) |
| `SolicitudIntegrationTest.java` | 3 métodos de test | Llamaban `cambiarEstado(id, estado, idUsuarioAsignador)` — firma eliminada en una fase previa | Se quitó el 3er parámetro (actor obsoleto) y se autentica al actor real vía `SecurityContext` antes de cada llamada | Los 3 tests de esa clase |
| `SolicitudConcurrencyTest.java` | `solicitudCobertura()` + 2 tests de concurrencia | Mismo problema; además el `SecurityContext` es `ThreadLocal` y no cruza hilos del pool | Autenticación dentro de cada `Runnable` sometido al pool, con `clearContext()` en `finally` | Los 2 tests de concurrencia |
| `OfertaGeneralIntegrationTest.java` | Varios métodos | Firmas obsoletas de `aprobarOferta`/`seleccionarPostulante`/`postular` | Igual patrón: autenticación explícita antes de cada llamada | Todos los tests de la clase |
| `OfertaGeneralConcurrencyTest.java` | Test de concurrencia de `seleccionarPostulante` | Mismo problema de `ThreadLocal` | Autenticación dentro de cada hilo | El test de concurrencia |

**Resultado:** `mvn clean test-compile` → 0 errores (antes: 4 archivos con errores de compilación por firmas obsoletas). Confirmado que no se reutilizaron `.class` obsoletos (se usó `clean` en cada verificación, nunca build incremental).

---

### 1.2 BLOQUEANTE — Regresión de capacidades Docker (Apache workers como root)

| Archivo | Servicios | Problema | Justificación | Verificación |
|---|---|---|---|---|
| `docker-compose.yml` | `apache-lb`, `frontend-1`, `frontend-2`, `frontend-3` | `cap_drop: [ALL]` + `cap_add: [NET_BIND_SERVICE]` — faltaban `SETUID`/`SETGID`, necesarias para que el proceso maestro (root, para bindear el puerto 80) pueda bajar privilegios a `daemon` en los workers | Apache arranca como root y llama a `setuid()/setgid()` internamente para los workers según `User/Group daemon` en `httpd.conf`; sin esas capabilities, `setgid` fallaba con "Operation not permitted" y los workers quedaban como root | Empírica: `docker exec ps aux`, `docker top`, `httpd -t` (ver §2 y §1.4) |

`backend-1/2/3` **no** se tocaron: ya corren con `USER spring:spring` (Dockerfile) y no necesitan `SETUID`/`SETGID`.

---

### 1.3 ALTO — Alcance de intercambio + autoaprobación en `SolicitudService.cambiarEstado`

| Archivo | Método | Problema | Justificación | Tests asociados |
|---|---|---|---|---|
| `SolicitudService.java` | `cambiarEstado` | (a) En intercambio (tipo 4) solo se validaba el servicio del turno deseado, no el del `turnoReceptor` — una JEFATURA podía aprobar un intercambio donde el turno que se **entrega** era de otro servicio. (b) La autoaprobación solo se bloqueaba para el emisor, no para el receptor, dueño del turno deseado, dueño del turno entregado, ni para un ADMINISTRADOR que fuera él mismo participante | (a) Ahora, para no-ADMINISTRADOR, se exige que **ambos** turnos (deseado y receptor) pertenezcan al servicio de la sesión. (b) Se calcula el conjunto de "participantes directos" (emisor, receptor, dueño turno deseado, dueño turno entregado) y se rechaza con 403 si el actor autenticado (siempre desde `SecurityContext`, nunca de parámetros) pertenece a ese conjunto — sin excepción de rol, ni para ADMINISTRADOR | `SolicitudServiceTest`: 11 tests nuevos (ver detalle abajo) |
| `SolicitudService.java` | (nuevos privados) `servicioDe`, `participantesDirectos`, `agregarIdSiPresente` | — | Extraídos para evitar duplicar la lógica de resolución de servicio/participantes | — |

Tests nuevos en `SolicitudServiceTest` (11, todos verdes):
- `cambiarEstado_intercambio_turnoDeseadoDeA_turnoReceptorDeB_lanzaAccessDenied`
- `cambiarEstado_intercambio_turnoDeseadoEsDeOtroServicio_lanzaAccessDenied`
- `cambiarEstado_intercambio_ambosTurnosDelServicioDelActor_permitido`
- `cambiarEstado_intercambio_administradorNoParticipante_permitido`
- `cambiarEstado_emisorIntentaAprobarSuPropiaSolicitud_lanza403_aunqueSeaJefatura`
- `cambiarEstado_receptorJefaturaIntentaAprobarLaOfertaQueLoBeneficia_lanza403`
- `cambiarEstado_receptorSubroganteIntentaAprobar_lanza403`
- `cambiarEstado_receptorAdministradorIntentaAprobarSuPropiaOferta_lanza403`
- `cambiarEstado_jefaturaAutorizadaNoParticipante_apruebaYQuedaRegistradaComoAprobadorReal`
- `cambiarEstado_administradorNoParticipante_apruebaYQuedaRegistradaComoAprobadorReal`
- `cambiarEstado_dueñoActualDelTurnoDeseadoIntentaAprobar_lanza403`

`SolicitudServiceTest`: **59/59 tests pasan** (48 originales + 11 nuevos).

---

### 1.4 ALTO — Edición entre servicios en `FuncionarioController.update`

| Archivo | Método | Problema | Justificación | Tests asociados |
|---|---|---|---|---|
| `FuncionarioController.java` | `update` | JEFATURA/SUBROGANTE de un servicio podía editar (nombre, estado, rol, relación de servicio) a un funcionario de **otro** servicio con solo cambiar el `id` en la URL | Se verifica en BD (`FuncionarioService.perteneceAServicio`, nunca por lo que envíe el cliente) que el funcionario objetivo pertenezca al servicio autenticado del actor, salvo ADMINISTRADOR. SUBROGANTE se equiparó a JEFATURA (antes solo podía editar su propio registro, inconsistente con el resto del sistema) | `FuncionarioControllerTest` (nuevo archivo): 14 tests |
| `FuncionarioService.java` | (nuevo) `perteneceAServicio(idFuncionario, idServicio)` | — | Consulta la relación real `Servicios_Funcionario`, ignorando relaciones eliminadas | — |

**Limitación documentada (no resuelta por diseño, fuera de alcance autorizado):** `nombre`, `apellidoPaterno`, `apellidoMaterno` y `estado` son atributos de la persona, no de una relación servicio-específica. Si el funcionario pertenece a más de un servicio, una JEFATURA de cualquiera de ellos (verificada como perteneciente) puede modificar esos campos y el cambio se refleja en todos los servicios donde participa. Cerrarlo requeriría un cambio de modelo de datos (campos por-servicio). Documentado en el código (Javadoc de `update`) y aquí.

`FuncionarioControllerTest`: **20/20 tests pasan** (14 de alcance por servicio + 6 de Bean Validation, ver §1.6).

---

### 1.5 Tests de concurrencia con `SecurityContext` de prueba

| Archivo | Problema | Justificación | Estado |
|---|---|---|---|
| `TurnoConcurrencyTest.java` | Llama `TurnoService.saveTurno` directamente (8 hilos), que ahora exige `SecurityContext` vía `SeguridadServicio.exigirMismoServicio` | Se autentica **dentro de cada hilo** del pool (JEFATURA del servicio de la fixture) antes de `saveTurno`, con `clearContext()` en `finally` | Compila limpio (`mvn clean test-compile`, exit 0). Ejecución bloqueada por brecha preexistente (ver abajo) |
| `GestionTurnoConcurrencyTest.java` | Igual, sobre `GestionTurnoService.alterarTurno` (6 hilos) | Igual patrón; se agregó campo `servicioId` (antes solo local a `setUp()`) para poder autenticar dentro de los hilos | Igual |

**No se desactivó `SeguridadServicio` ni se agregó ningún bypass de seguridad ni excepción especial de test en código productivo** — la autenticación se preparó exclusivamente en el lado del test, usando el mismo mecanismo (`SecurityContextHolder` + `AuthenticatedUser`) que usa producción.

**Bloqueante preexistente, no introducido por estos cambios:** ambas clases heredan de `AbstractContainerTest` (`@SpringBootTest` con Testcontainers), y **el mismo contexto de Spring falla al cargar** para las 8 clases de esa familia (`BitacoraIntegrationTest`, `GestionTurnoConcurrencyTest`, `OfertaGeneralConcurrencyTest`, `OfertaGeneralIntegrationTest`, `SolicitudConcurrencyTest`, `SolicitudIntegrationTest`, `TurnoConcurrencyTest`, `TurnoRepositoryIntegrationTest`) por una causa raíz única: `HospitalDataSourceConfig.hospitalEntityManagerFactory` no puede determinar el dialecto JDBC porque las propiedades `hospital.datasource.*` nunca se configuran para el entorno de test. Confirmado que es la MISMA causa en las 8 clases (mismo stack trace root, mismo mensaje "Unable to determine Dialect without JDBC metadata"). No se ocultó ni se "arregló" este error para que los tests pasen — se documenta como hallazgo abierto (ver §4).

---

### 1.6 Bean Validation mínima (solo en lo tocado esta etapa)

| Archivo | Cambio | Justificación |
|---|---|---|
| `SolicitudController.java` | `@Validated` en la clase; `@Positive` en el `id` de `cambiarEstado`, `responderOfertaParticular`, `responderIntercambio`; `@NotNull` en `nuevoEstado` | Estos 3 endpoints enrutan a la lógica de `cambiarEstado`/`responderOferta*` modificada en §1.3. IDs negativos/cero se rechazan con 400 antes de tocar negocio |
| `GlobalExceptionHandler.java` | Nuevo `@ExceptionHandler(ConstraintViolationException.class)` | `@Validated` a nivel de método lanza `ConstraintViolationException` (no `MethodArgumentNotValidException`, que ya estaba cubierto para `@Valid` sobre bodies) — sin este handler, la violación caería al catch-all genérico (500 en vez de 400) |
| `FuncionarioController.java` | `update`: valida `id<=0` y `payload` nulo/vacío ANTES de tocar seguridad; el parseo de `servicioId` ahora captura `NumberFormatException` y valida `<=0`, devolviendo 400 en vez de dejar que un tipo incorrecto se cuele como 500 genérico | Mismo endpoint corregido en §1.4; cierra los casos "tipo incorrecto"/"ID negativo o cero" de este método sin tocar el contrato para los payloads válidos existentes |

**No se realizó el barrido general de los ~40 endpoints restantes (M-01)** — queda pendiente, documentado en §4.

Cobertura: 6 tests nuevos en `FuncionarioControllerTest` (`idCeroONegativo_lanza400_antesDeTocarSeguridad`, `idNegativo_lanza400`, `payloadVacio_lanza400`, `payloadNulo_lanza400`, `servicioIdConTipoInvalido_lanza400_noExcepcionSinControlar`, `servicioIdCeroONegativo_lanza400`). Las anotaciones `@Positive`/`@Validated` de `SolicitudController` se verificaron por compilación e inspección (requieren el proxy AOP de Spring — este proyecto no tiene ningún `@WebMvcTest` existente; no se introdujo ese patrón nuevo solo para esto, para no ampliar el alcance de la etapa).

---

### 1.7 Hallazgo adicional descubierto y corregido durante la verificación (no en las 12 secciones originales)

| Archivo | Problema | Justificación |
|---|---|---|
| `apache/httpd.conf` | `apache-lb` entraba en **crash-loop** en Docker: `AH00526: Syntax error ... Unknown Authz provider: local` | `health.conf` usa `Require local` / `Require ip` (fix H-09 de una fase anterior, restringe `/server-status` y `/balancer-manager` a red interna) pero el módulo que provee esos providers (`mod_authz_host`) nunca se cargaba en `httpd.conf` (solo estaba `mod_authz_core`, que no basta). Se agregó `LoadModule authz_host_module modules/mod_authz_host.so`. Es una línea de configuración que restaura una regla YA autorizada en una fase previa; no es una regla de negocio nueva, no es rate limiting de infraestructura, no es TLS |

Verificado empíricamente: tras el fix + reinicio del contenedor, `httpd -t` → `Syntax OK`, ya no aparecen errores `AH00526` en los logs.

---

## 2. Resultados de build (todos desde limpio, en el orden pedido)

| Paso | Comando | Resultado |
|---|---|---|
| Backend compile | `mvn clean test-compile` | **Exit 0**, 0 errores |
| Backend test | `mvn clean test` | **285 tests, 0 failures, 26 errors** — los 26 errores están en 8 clases `@SpringBootTest` (ver §1.5), misma causa raíz preexistente, no relacionada con los cambios de esta etapa |
| Docker backend | `docker build --no-cache -t sgt-backend-security-check ./huap_backend` | **BUILD SUCCESS** (imagen construida en 1:24 min) |
| Frontend | `npm ci` | OK (253 paquetes; `npm audit` reporta 2 vulnerabilidades "high" en dependencias — no se tocaron versiones, ver §4) |
| Frontend | `npm run build` | **OK**, build en 23.2s (aviso no bloqueante: un chunk >500kB) |
| Apache config | `httpd -t` (dentro del contenedor `apache-lb` corriendo) | **Syntax OK** |
| Docker Compose | `docker compose config --env-file <placeholders>` | Válido, exit 0. Capacidades confirmadas: `apache-lb`/`frontend-1/2/3` → `cap_add: [NET_BIND_SERVICE, SETUID, SETGID]` + `cap_drop: [ALL]`; `backend-1/2/3` → solo `cap_drop: [ALL]` (sin cambios) |
| Apache containers | `docker compose up -d` (apache-lb + frontend-1/2/3 + backend-1/2/3, valores placeholder, sin BD real) | Levantados; ver §2.1 para detalle de verificación empírica |
| Git | `git status --short`, `git diff --stat`, `git diff --check` | Sin conflictos, sin trailing whitespace. Sin cambios de rama. Sin commit. Sin push |

Contenedores de verificación detenidos (`docker compose stop`) al finalizar, sin remover, dejando el resto del entorno Docker (contenedores huérfanos preexistentes de una sesión anterior, no relacionados) intacto.

### 2.1 Verificación empírica de Apache (capacidades + healthcheck)

```
docker exec huap-apache-lb ps aux
PID   USER     COMMAND
1     root     httpd -DFOREGROUND      <- maestro: root (necesario para bindear :80)
8     daemon   httpd -DFOREGROUND      <- workers: daemon (NO root)
9     daemon   httpd -DFOREGROUND
10    daemon   httpd -DFOREGROUND
98    daemon   httpd -DFOREGROUND

docker top huap-apache-lb   (vista desde el host, mismo UID, distinta resolución de nombre por /etc/passwd del host)
UID    COMMAND
root   httpd -DFOREGROUND   <- maestro
bin    httpd -DFOREGROUND   <- workers (mismo UID que "daemon" en el contenedor)
bin    httpd -DFOREGROUND
bin    httpd -DFOREGROUND
```

`httpd -t` → `Syntax OK`. Ningún worker corre como root — la regresión de §1.2 queda cerrada y reverificada.

**Hallazgo abierto encontrado durante esta verificación (no corregido, fuera del alcance de esta etapa):** el healthcheck de `apache-lb`/`frontend-N` (`/apache-health`, `/health`) devuelve `500 Proxy Error` porque el `ProxyPass "/" "balancer://frontend_servers/"` global de `frontend.conf` intercepta esas rutas antes de que las `<Location>` específicas de `health.conf` puedan responder localmente (no proxiadas). Es un problema de **orden/exclusión de reglas de proxy preexistente**, no relacionado con capacidades ni con los cambios de esta etapa. Ver §4.

---

## 3. Hallazgos cerrados

1. **Build roto** (firmas obsoletas en 4 archivos de test) — cerrado, `mvn clean test-compile` y `mvn clean test` verificados desde limpio.
2. **Regresión Apache/Docker** (workers corriendo como root) — cerrado y reverificado empíricamente.
3. **Alcance de intercambio** (`turnoReceptor` no validado) — cerrado, 11 tests nuevos.
4. **Autoaprobación por receptor/dueño de turno/ADMINISTRADOR participante** — cerrado, mismos 11 tests.
5. **Edición entre servicios en `FuncionarioController.update`** — cerrado, 14 tests nuevos (`FuncionarioControllerTest`).
6. **Tests de concurrencia sin `SecurityContext`** — cerrado a nivel de código (compila y el contexto queda correctamente preparado); ejecución completa bloqueada por brecha preexistente documentada (no oculta).
7. **Bean Validation mínima** en los 2 controllers tocados esta etapa — cerrado, 6 tests nuevos + verificación por compilación.
8. **Crash-loop de `apache-lb`** por módulo Apache faltante (`mod_authz_host`) — hallazgo nuevo, cerrado y reverificado.
9. **Batería mínima de seguridad (14 puntos, ver mapeo abajo)** — mapeada y verificada, con 10 tests nuevos adicionales (`SeguridadServicioTest` ×8, `TurnoServiceTest` ×2) para cubrir los puntos sin test directo previo.

### Mapeo de los 14 puntos de la batería mínima de seguridad

| # | Punto | Cubierto por |
|---|---|---|
| 1 | JEFATURA A no puede operar sobre funcionario B | `FuncionarioControllerTest.jefaturaA_editaFuncionarioExclusivoDeB_lanza403` (+3 variantes) |
| 2 | JEFATURA A no puede operar sobre turno B | `TurnoServiceTest.save_turnoDeOtroServicio_noAdministrador_lanzaAccessDenied` (nuevo) + `SeguridadServicioTest` (mecanismo central) |
| 3 | JEFATURA A no puede aprobar intercambio que afecta turno B | `SolicitudServiceTest.cambiarEstado_intercambio_turnoDeseadoDeA_turnoReceptorDeB_lanzaAccessDenied` (+ variantes) |
| 4 | Emisor no puede aprobar su propia solicitud | `SolicitudServiceTest.cambiarEstado_emisorIntentaAprobarSuPropiaSolicitud_lanza403_aunqueSeaJefatura` |
| 5 | Receptor no puede aprobar una solicitud que lo beneficia | `cambiarEstado_receptorJefaturaIntentaAprobarLaOfertaQueLoBeneficia_lanza403`, `..._receptorSubroganteIntentaAprobar_lanza403` |
| 6 | ADMIN participante tampoco puede autoaprobarse | `cambiarEstado_receptorAdministradorIntentaAprobarSuPropiaOferta_lanza403` |
| 7 | ADMIN no participante conserva permiso global | `cambiarEstado_administradorNoParticipante_apruebaYQuedaRegistradaComoAprobadorReal`, `..._intercambio_administradorNoParticipante_permitido` |
| 8 | Actor enviado por body/query se ignora/rechaza | Garantizado estructuralmente: `cambiarEstado`/`responderOferta*` ya no aceptan ningún parámetro de actor en su firma (removido en §1.1) — no hay forma de que un cliente lo inyecte |
| 9 | Bitácora registra al actor autenticado | `cambiarEstado_jefaturaAutorizadaNoParticipante_...` y `..._administradorNoParticipante_...` verifican explícitamente `verify(bitacoraService).registrarEvento(..., idDelActorAutenticado)` |
| 10 | `SecurityContext` ausente produce 401/403 | `SeguridadServicioTest.sinSecurityContext_actual_lanzaAccessDenied` (+2 variantes); `FuncionarioController.update` devuelve 401 explícito si `auth == null` |
| 11 | `servicioId` ausente en recurso que lo requiere → rechazo | `SeguridadServicioTest.noAdministrador_recursoSinServicio_exigirMismoServicio_lanzaAccessDenied` |
| 12 | `servicioId` distinto al del recurso → 403 | `SeguridadServicioTest.noAdministrador_servicioDelRecursoDistintoAlDeLaSesion_lanzaAccessDenied` |
| 13 | Workers Apache no corren como root | Verificado empíricamente, §2.1 |
| 14 | Backend compila desde repo limpio | `mvn clean test-compile` exit 0, §2 |

---

## 4. Hallazgos aún abiertos

- **Spring Boot 4.0.0-SNAPSHOT**: no se migró (explícitamente fuera de alcance esta etapa).
- **Rotación de `JWT_SECRET`**: no realizada (fuera de alcance).
- **Rotación de contraseñas**: no realizada (fuera de alcance).
- **TLS**: no implementado (fuera de alcance).
- **Rate limiting compartido / Redis / mod_evasive / mod_qos**: no implementado (fuera de alcance).
- **Purga de historial Git**: no realizada (fuera de alcance).
- **GETs restantes sin scoping por servicio**: no auditados exhaustivamente esta etapa — la corrección se limitó a los endpoints de escritura mencionados en las 12 secciones.
- **Bean Validation general (M-01, ~40 endpoints)**: pendiente, se aplicó solo en lo tocado esta etapa (§1.6).
- **Healthcheck de Apache roto por orden de `ProxyPass`** (§2.1): `/health` y `/apache-health` son interceptados por el `ProxyPass "/"` global de `frontend.conf` en vez de responder localmente. Preexistente, no introducido esta etapa, no corregido (requiere decidir la estrategia de exclusión de proxy — p. ej. `ProxyPass "/apache-health" !` antes del catch-all — que toca reglas de enrutamiento no autorizadas explícitamente en esta corrección).
- **Brecha `hospital.datasource` en tests `@SpringBootTest`** (§1.5): 8 clases de test no pueden ejecutar su cuerpo por falta de configuración del datasource de solo-lectura en el entorno de test. Preexistente a esta etapa, requiere decidir si se configura un datasource de prueba (Testcontainers/mocks, nunca BD real) — fuera del alcance mínimo autorizado.
- **2 vulnerabilidades "high" reportadas por `npm audit`** en dependencias del frontend: no se tocaron versiones (instrucción explícita), quedan pendientes de una revisión de dependencias fuera de esta etapa.
- **Contenedores huérfanos preexistentes** (`huap-frontend`, `huap-backend`, corriendo ~6h antes de esta sesión) causando conflicto de puerto 5173 en el entorno Docker local: no se tocaron (no se sabe su origen/propósito); si se desea limpiar, requiere `docker compose up --remove-orphans` o remoción manual explícita, decisión del usuario.

---

## 5. Resultado final

1. **¿Listo para commit?** **SÍ**, con las salvedades documentadas arriba (hallazgos abiertos son pre-existentes o explícitamente fuera de alcance, no bloqueantes de código). Build limpio, 285/285 tests sin fallos (26 errores, todos con causa raíz preexistente y ya documentada, no nueva), Docker backend build exitoso, frontend build exitoso, `git diff --check` limpio.
2. **¿Listo para staging?** **NO todavía** — el healthcheck de Apache está roto por el problema de `ProxyPass` (§4) y la brecha `hospital.datasource` impide validar el comportamiento completo de 8 suites de test contra un entorno real. Ambos deben resolverse antes de un despliegue a staging.
3. **¿Listo para exposición a Internet?** **NO** — TLS, rotación de secretos, rate limiting de infraestructura y la migración de Spring Boot SNAPSHOT siguen pendientes, todos explícitamente fuera del alcance autorizado en esta etapa.
