# Registro de defectos — SGT HUAP (Auditoría funcional/QA)

Formato por defecto: ID, severidad, módulo, descripción, evidencia reproducible, causa raíz, impacto funcional, propuesta de corrección (**no implementada en esta fase** — requiere autorización explícita posterior, ver `QA_REMEDIATION_PLAN.md`).

Severidades: **Crítica** (pérdida/exposición de datos sensibles o bloqueo total de una función documentada) · **Alta** (autorización insuficiente con impacto acotado, o función documentada inoperante para un rol) · **Media** (comportamiento incorrecto sin exposición de datos sensibles) · **Baja** (cosmético o de bajo impacto).

---

## BUG-001 — HTTP 401 devuelto en vez de 403 ante denegación por rol

- **Severidad:** Alta
- **Módulo:** Transversal (afecta todo endpoint protegido por `hasRole`/`hasAnyRole` en `SecurityConfig.java`)
- **Descripción:** Cuando un usuario autenticado con un token JWT **válido y no expirado** intenta una acción para la que no tiene el rol requerido, el sistema responde HTTP 401 ("No autorizado") en lugar de HTTP 403 ("Prohibido"). Evidencia: T-07, T-09, T-10, T-11 en `API_FUNCTIONAL_TEST_RESULTS.md`.
- **Causa raíz:** `SecurityConfig.java` registra `.exceptionHandling(exception -> exception.authenticationEntryPoint(unauthorizedHandler))` pero **no registra un `accessDeniedHandler`**. Spring Security, sin un `AccessDeniedHandler` explícito, delega las denegaciones de autorización (`AccessDeniedException`) al mismo `authenticationEntryPoint`, que siempre devuelve 401.
- **Impacto funcional:** el interceptor Axios del frontend (`axiosConfig.js`) trata cualquier 401 como "sesión inválida" y **fuerza un logout automático**. Un Jefatura/Subrogante/Médico que intenta una acción fuera de su permiso (incluso por error de UI, o al copiar una URL) es expulsado de la sesión en vez de recibir un mensaje de "no tienes permiso para esto" — confunde un problema de permisos con un problema de sesión expirada.
- **Propuesta de corrección (no implementada):** registrar un `AccessDeniedHandler` propio que devuelva HTTP 403 con un cuerpo JSON análogo al de `unauthorizedHandler`, y ajustar el interceptor del frontend para no cerrar sesión ante un 403 (sólo ante 401).

---

## BUG-002 — IDOR: `SolicitudController` expone todas las solicitudes del sistema sin filtrar por rol/servicio/propiedad

- **Severidad:** Crítica
- **Módulo:** Solicitudes
- **Descripción:** Los 5 endpoints `GET` de `SolicitudController` (`/solicitudes`, `/funcionario/{id}`, `/receptor/{id}`, `/tipo/{id}`, `/turno/{id}`) no aplican ningún filtro de autorización más allá de "tener un JWT válido". Evidencia: T-19 — el usuario M (rol MEDICO, servicio Medicina Interna/Cirugía) obtuvo 42.291 bytes de JSON con solicitudes de **todos** los servicios y funcionarios del sistema al llamar `GET /solicitudes`.
- **Causa raíz:** `SolicitudController.java` (líneas ~103-134) no valida `idFuncionario`/servicio del solicitante contra el `Authentication` de Spring Security antes de devolver los resultados; `SecurityConfig.java` solo protege `PUT /solicitudes/*/estado` e `/intercambio` por rol, dejando todos los `GET` bajo la regla genérica `anyRequest().authenticated()`.
- **Impacto funcional:** cualquier funcionario, incluyendo un Médico de base, puede leer motivos de permisos, solicitudes de intercambio/cobertura y datos personales de solicitantes de servicios ajenos — contradice explícitamente el manual (MF-027: solo Admin/Jefatura/Subrogante evalúan/acceden a estas listas).
- **Propuesta de corrección (no implementada):** filtrar `findAllSolicitudes()` por servicio del solicitante autenticado cuando el rol es MEDICO/USUARIO (solo debe ver las suyas propias y las dirigidas a él), y restringir el listado global sin filtro a roles de gestión (ADMINISTRADOR/JEFATURA/SUBROGANTE) del servicio correspondiente.

---

## BUG-003 — Manual documenta permisos de Jefatura/Subrogante para crear tipos de turno, rotativas y planificaciones mensuales que el sistema nunca otorga

- **Severidad:** Alta
- **Módulo:** Tipos de turno / Rotativas / Planificaciones
- **Descripción:** El manual de administración indica que "Admin/Jefatura/Subrogancia" (MF-024), "Admin/Jefatura/Subrogante" (MF-025) y "Admin/Jefatura" (MF-026) pueden crear tipos de turno, rotativas y planificaciones mensuales respectivamente. En la implementación real, `SecurityConfig.java` clasifica `/api/v2/tipos-turno/**`, `/api/v2/rotativas/**` y `/api/v2/planificaciones/**` como `GLOBAL_ADMIN_PATHS`, exigiendo `hasRole('ADMINISTRADOR')` para POST/PUT/DELETE.
- **Evidencia:** T-09, T-10, T-11 — una cuenta JEFATURA pura (Ricardo Morales Vega, RUT 11111111-1, `rolSistema=USUARIO`, sin ADMINISTRADOR) recibió HTTP 401 al intentar `POST /planificaciones`, `POST /rotativas` y `POST /tipos-turno` en su propio servicio. Se confirmó además que el **frontend es consistente** con esta restricción: en `Prop4.jsx` los props `onGoTiposTurno`/`onGoPlantillas`/`onGoPlanificacion` solo se pasan a `AdminDashboard` (exclusivo de `rolSistema===ADMINISTRADOR`, ver `Perfil.jsx:35`), nunca a `JefaturaDashboardView`/`SubroganteDashboardView` — por lo que un Jefatura ni siquiera ve estas opciones en la UI real.
- **Causa raíz:** decisión de diseño en `SecurityConfig.java` (agrupar estos 3 recursos como "administración global") que no corresponde con lo que el manual promete a Jefatura/Subrogante. No es un bug de autorización rota (el sistema es coherente internamente) sino una **discrepancia manual-vs-sistema**: o el manual está desactualizado, o al sistema le falta la funcionalidad que promete.
- **Impacto funcional:** una Jefatura de servicio, siguiendo el manual, no puede diseñar sus propios tipos de turno/rotativas/planificaciones mensuales — debe pedirle a un ADMINISTRADOR que lo haga por ella, lo cual es una limitación operativa real si el manual refleja la intención de negocio original.
- **Propuesta de corrección (no implementada):** requiere **decisión de negocio** (no solo técnica): confirmar si Jefatura/Subrogante deben poder crear estos recursos para su propio servicio (en cuyo caso, mover estas rutas a `SERVICE_ADMIN_PATHS` con una restricción adicional por servicio) o si el manual debe corregirse para reflejar que es exclusivo de ADMINISTRADOR.

---

## BUG-004 — IDOR: `TurnoController` permite consultar turnos/estadísticas/cobertura de un servicio ajeno

- **Severidad:** Alta
- **Módulo:** Turnos
- **Descripción:** Todos los `GET` de `TurnoController` (listados por servicio, calendario, stats, cobertura, funcionarios-detalle, etc.) solo requieren `anyRequest().authenticated()` — `SERVICE_ADMIN_PATHS` únicamente cubre POST/PUT/DELETE de `/api/v2/turnos/**`, no los GET.
- **Evidencia:** T-14, T-15 — el usuario M (MEDICO, solo servicios 1 y 3) obtuvo HTTP 200 con datos completos de cobertura (`{"turnosAsignados":746,"porcentajeCobertura":95.64,...}`) y el listado detallado de turnos (incluyendo nombres y RUT de funcionarios) del servicio 4 (Urgencias), al que no pertenece.
- **Causa raíz:** mismo patrón que BUG-002: la configuración de seguridad protege por método HTTP (escritura) pero no por lectura ni por servicio del solicitante; no hay verificación a nivel de controlador/servicio de que el `servicioId` consultado coincida con alguno de los servicios del `Authentication` actual.
- **Impacto funcional:** cualquier funcionario puede reconstruir la dotación de personal, cobertura y RUTs de un servicio ajeno — exposición de datos organizacionales y PII (RUT, nombre completo) de terceros.
- **Propuesta de corrección (no implementada):** agregar verificación de pertenencia al servicio (o rol ADMINISTRADOR) en cada endpoint `GET` de `TurnoController` que reciba `servicioId`, `funcionarioId` o `puestoId` como parámetro.

---

## BUG-005 — Rol MEDICO habilitado para aprobar/rechazar solicitudes de terceros, contradiciendo el manual

- **Severidad:** Media
- **Módulo:** Solicitudes
- **Descripción:** `SecurityConfig.java` protege `PUT /solicitudes/{id}/estado` con `hasAnyRole('JEFATURA','SUBROGANTE','MEDICO')` — es decir, cualquier funcionario con rol de servicio MEDICO puede invocar el endpoint de aprobación/rechazo, mientras que el manual (MF-027) especifica que solo Admin/Jefatura/Subrogante evalúan solicitudes.
- **Evidencia:** confirmado por lectura directa de `SecurityConfig.java` líneas 111-114; **no se ejecutó** la escritura real (aprobar/rechazar) para no alterar datos de solicitudes compartidas de desarrollo de forma irreversible en este ciclo — la evidencia de código es suficientemente concluyente sobre qué roles el filtro de Spring Security permite invocar.
- **Causa raíz:** posiblemente intencional para un caso de uso no documentado (ej. un médico jefe de turno aprobando cambios de sus pares sin ostentar el rol formal de Jefatura), pero no está reflejado en el manual ni se encontró lógica adicional en `SolicitudController`/`SolicitudService` que restrinja el MEDICO a solo aprobar solicitudes de su propio servicio.
- **Impacto funcional:** posible aprobación de solicitudes fuera del flujo de gobernanza documentado.
- **Propuesta de corrección (no implementada):** confirmar con negocio si es intencional; si no, retirar `MEDICO` de ese `hasAnyRole` o acotarlo con una verificación adicional de que el solicitante y el aprobador comparten servicio y que el aprobador es efectivamente subrogante designado.

---

## BUG-006 — IDOR: `NotificacionController` permite leer y modificar notificaciones de otro funcionario

- **Severidad:** Alta
- **Módulo:** Notificaciones
- **Descripción:** `GET /notificaciones/usuario/{idFuncionario}`, `GET /notificaciones/sin-leer/{idFuncionario}`, `PUT /{id}/leer` y `DELETE /{id}` no verifican que `idFuncionario` (o el propietario de la notificación `{id}`) coincida con el usuario autenticado.
- **Evidencia:** T-21 — el usuario M (`idFuncionario=2`) obtuvo HTTP 200 con el contenido real de notificaciones del funcionario `idFuncionario=1`, incluyendo el texto completo del mensaje ("Ha recibido una propuesta de intercambio de turno... de parte de María José Espinoza").
- **Causa raíz:** ausencia total de verificación de ownership en `NotificacionController`/`NotificacionService`; `/api/v2/notificaciones/**` no aparece en ninguna lista de `SecurityConfig.java`, cae en `anyRequest().authenticated()`.
- **Impacto funcional:** exposición de contenido personal/interno (motivos de solicitudes, nombres de otros funcionarios) a cualquier usuario autenticado; adicionalmente, un tercero podría marcar como leída o **eliminar** notificaciones ajenas (posible ocultamiento de evidencia o denegación de servicio dirigida a un usuario específico).
- **Propuesta de corrección (no implementada):** validar en el controlador que `idFuncionario` del path coincide con el `Authentication.getPrincipal()` (o que el rol sea ADMINISTRADOR), antes de leer/modificar/eliminar.

---

## BUG-007 — `GET /api/v2/bitacoras` sin autorización por rol/servicio y sin paginación

- **Severidad:** Alta
- **Módulo:** Bitácora de cambios
- **Descripción:** El endpoint devuelve el histórico completo de eventos del sistema a cualquier usuario autenticado, sin filtrar por servicio ni exigir rol de gestión (el manual MF-031 dice que es para Admin/Jefatura/Subrogante).
- **Evidencia:** T-22 — el usuario M obtuvo HTTP 200 con una respuesta de **6.558.573 bytes** (todo el histórico de eventos de bitácora del sistema completo de desarrollo).
- **Causa raíz:** `/api/v2/bitacoras/**` no está en ninguna lista de `SecurityConfig.java`; adicionalmente, `BitacoraController.getAllBitacora()` no aplica paginación ni límite de resultados.
- **Impacto funcional:** exposición de auditoría interna a roles no autorizados; el tamaño de la respuesta (sin paginar) representa además un riesgo de disponibilidad/rendimiento a medida que crece el histórico (una sola consulta sin filtro puede degradar el servicio para todos los usuarios concurrentes).
- **Propuesta de corrección (no implementada):** restringir `/api/v2/bitacoras/**` a roles de gestión y al servicio del solicitante; agregar paginación obligatoria (`Pageable`) al endpoint `GET` general.

---

## BUG-008 — Ruta inexistente devuelve HTTP 500 en vez de 404

- **Severidad:** Baja
- **Módulo:** Transversal (`GlobalExceptionHandler`)
- **Descripción:** Al solicitar una ruta bajo `/api/v2/**` que no existe (ej. `/api/v2/bitacora`, singular, en vez de `/api/v2/bitacoras`), el sistema responde HTTP 500 `{"error":"Error interno del servidor"}` en vez de HTTP 404.
- **Evidencia:** T-22b.
- **Causa raíz:** `GlobalExceptionHandler` captura `NoResourceFoundException` (lanzada por Spring cuando ningún controlador ni recurso estático coincide con la ruta) dentro de un manejador genérico de "Error no controlado", en vez de tratarla específicamente como 404.
- **Impacto funcional:** bajo — no expone información sensible (el manejador genérico ya oculta detalles), pero dificulta el diagnóstico de errores de URL por parte de clientes/integradores y ensucia las métricas de errores 5xx con casos que en realidad son 404 (errores del cliente, no del servidor).
- **Propuesta de corrección (no implementada):** agregar un `@ExceptionHandler(NoResourceFoundException.class)` específico que devuelva HTTP 404.

---

## Resumen por severidad

| Severidad | Cantidad | IDs |
|---|---|---|
| Crítica | 1 | BUG-002 |
| Alta | 5 | BUG-001, BUG-003, BUG-004, BUG-006, BUG-007 |
| Media | 1 | BUG-005 |
| Baja | 1 | BUG-008 |
| **Total** | **8** | |

Ningún defecto de esta lista fue corregido en esta fase, conforme a la instrucción explícita de la auditoría de no implementar correcciones sin autorización posterior. Ver propuestas detalladas en `QA_REMEDIATION_PLAN.md`.
