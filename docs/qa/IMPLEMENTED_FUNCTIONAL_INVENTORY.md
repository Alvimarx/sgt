# Inventario funcional implementado (código real) — SGT HUAP

Construido leyendo directamente los controladores backend (`huap_backend/src/main/java/com/pingeso/HUAP/Controller/*.java`), la configuración de seguridad (`SecurityConfig.java`), los servicios frontend (`sgt-huap_frontend/src/services/*.js`) y los componentes de administración (`sgt-huap_frontend/src/components/Admin2/*.jsx`). No se basa en el manual — es el inventario del **código tal como existe hoy**, para comparar después contra `MANUAL_FUNCTIONAL_INVENTORY.md` en `FUNCTIONAL_TRACEABILITY_MATRIX.md`.

Estados posibles: **Implementada** · **Parcial** · **No accesible** · **Con error** · **No implementada** · **No verificable** (requiere navegador) · **No documentada** (existe en código pero no en manual).

---

## 1. Autenticación (`FuncionarioController`)

| ID | Endpoint | Protección Spring Security | Enforcement adicional en código | Estado | Frontend |
|---|---|---|---|---|---|
| IF-001 | `POST /api/v2/funcionarios/login` | Público | Contra `innhosp.viewPersonal` (solo lectura) + `gestionturnos.Funcionario`; `LoginAttemptService` (5 intentos, bloqueo 15 min) | Implementada | `authService.js` |
| IF-002 | `POST /api/v2/funcionarios/login/select-service` | Público | Emite JWT final con `rol`/`rolSistema` tras validar el pre-auth token | Implementada | `authService.js` |
| IF-003 | `POST /api/v2/funcionarios/switch-service` | Autenticado | Reutiliza `SecurityContextHolder` para identidad | Implementada | `authService.js` |
| IF-004 | `POST /api/v2/funcionarios/register/{rut}` | `@PreAuthorize hasAnyRole('ROLE_JEFATURA','ROLE_ADMINISTRADOR')` | — | Implementada | usado desde `AsignacionView.jsx` |
| IF-005 | `GET /api/v2/funcionarios/status/{rut}` | Autenticado (cualquier rol) | **Sin filtrado por rol/servicio** | Implementada, pero **sin autorización granular** (RR-004/SEC-004, ver `DEFECT_REGISTER.md`) | — |

## 2. Servicios (`ServicioController`)

| ID | Endpoint | Protección | Estado |
|---|---|---|---|
| IF-006 | `GET /api/v2/servicios` | Público (necesario para pantalla de selección de servicio) | Implementada — corresponde a MF-002 |
| IF-007 | `GET /api/v2/servicios/inactivos`, `/{id}`, `/nombre/{nombre}`, `/buscar`, `/paginado` | Autenticado | Implementada |
| IF-008 | `POST /api/v2/servicios`, `PUT /{id}`, `DELETE /{id}` | `hasRole('ADMINISTRADOR')` (vía `GLOBAL_ADMIN_PATHS`) | Implementada — corresponde a MF-019 |
| IF-009 | `GET /{id}/turnos-asociados`, `/{id}/dependencias` | Autenticado | Implementada — soporte para el CRUD de MF-019 (validación antes de inhabilitar) |

## 3. Personal / Jerarquía / Asignación (`FuncionarioController`, más lógica en `AsignacionView.jsx`/`JerarquiaView.jsx`)

| ID | Funcionalidad | Estado | Notas |
|---|---|---|---|
| IF-010 | Asignación de funcionario a servicio (MF-020) | Implementada | Vía `AsignacionView.jsx` + endpoints de `Personal` (`SERVICE_ADMIN_PATHS`) |
| IF-011 | Panel "Personal del sistema" (MF-021) | Implementada | `GET /api/v2/funcionarios/summary` |
| IF-012 | Designar Jefatura/Subrogante (MF-023) | Implementada | `JerarquiaView.jsx` → `asignarRolJerarquia` |
| IF-013 | Regla "un subrogante no puede designar nuevos subrogantes" | **No verificable solo con código** — requiere prueba de API dirigida (pendiente en Fase 8) | — |

## 4. Tipos de turno (`TipoTurnoController`) — MF-024

| ID | Endpoint | Estado |
|---|---|---|
| IF-014 | `POST/GET/PUT/DELETE /api/v2/tipos-turno/**` | Implementada (CRUD completo) — protegido como `GLOBAL_ADMIN_PATHS` → **solo ADMINISTRADOR**, pese a que el manual (MF-024) dice "Admin/Jefatura/Subrogancia" |
| IF-015 | `GET /{id}/rotativas-afectadas` | Implementada — valida antes de inhabilitar |

**Nota:** esta es una discrepancia manual-vs-código detectada (permiso más restrictivo en código que en el manual) — se documenta en `MANUAL_SYSTEM_GAP_ANALYSIS.md`.

## 5. Rotativas (`RotativaController`) — MF-025

| ID | Endpoint | Estado |
|---|---|---|
| IF-016 | `POST/GET/PUT/DELETE /api/v2/rotativas/**` | Implementada — mismo hallazgo que IF-014: `GLOBAL_ADMIN_PATHS` exige `ADMINISTRADOR`, el manual dice Jefatura/Subrogante también pueden |
| IF-017 | `POST /{id}/duplicar` | Implementada, **no documentada en el manual** (funcionalidad extra) |
| IF-018 | `GET /{id}/validar` | Implementada, no documentada — valida la rotativa (probablemente la regla de 24h/semana de MF-025) |
| IF-019 | `PUT/GET /{id}/secuencia` | Implementada — el "pincel por día" del manual |

## 6. Planificaciones (`PlanificacionController`) — MF-026

| ID | Endpoint | Estado |
|---|---|---|
| IF-020 | `POST/GET/PUT/DELETE /api/v2/planificaciones/**` | Implementada — `GLOBAL_ADMIN_PATHS`: **solo ADMINISTRADOR**, aunque el manual (MF-026) dice "Admin/Jefatura" pueden crear planificaciones — **discrepancia de permisos** (Jefatura no podría generar planificaciones mensuales según el código, contradiciendo el manual) |
| IF-021 | `POST /{id}/generar` | Implementada — expansión de turnos reales; corregida en esta sesión (fase A) para evitar duplicados |
| IF-022 | `DELETE /{id}/turnos` | Implementada — **funcionalidad nueva agregada en esta sesión** (fase A, "Borrar todos los turnos asignados"), no documentada en el manual (el manual es anterior a este cambio) |
| IF-023 | `POST /{id}/conflictos` | Implementada, no documentada — pre-chequeo de solapes antes de generar |

## 7. Turnos (`TurnoController`)

| ID | Endpoint | Protección | Estado |
|---|---|---|---|
| IF-024 | `POST/PUT/DELETE /api/v2/turnos/**` | `SERVICE_ADMIN_PATHS` → Admin/Jefatura/Subrogante | Implementada |
| IF-025 | `POST /alterar` | `@PreAuthorize hasAnyRole('ADMINISTRADOR','JEFATURA','SUBROGANTE')` (doble capa, redundante con el matcher de arriba) | Implementada |
| IF-026 | `GET /api/v2/turnos/**` (listados, calendario, stats, cobertura, por funcionario/puesto/servicio) | **Solo `anyRequest().authenticated()`** — SERVICE_ADMIN_PATHS únicamente cubre POST/PUT/DELETE, no GET | Implementada funcionalmente, pero **cualquier usuario autenticado de cualquier rol/servicio puede consultar turnos, stats y cobertura de un servicio ajeno** (mismo patrón de autorización insuficiente que RR-004; ver `DEFECT_REGISTER.md`) |
| IF-027 | `GET /asignacion` | Autenticado | Implementada, respalda MF-022 |

## 8. Puestos (`PuestoController`) — MF-028

| ID | Endpoint | Estado |
|---|---|---|
| IF-028 | CRUD completo | Implementada — `SERVICE_ADMIN_PATHS` (POST/PUT/DELETE); GET sin restricción adicional (mismo patrón que IF-026, menor severidad porque puestos no es PII) |

## 9. Reglas de horario del servicio (`ReglaServicioController`) — MF-029

| ID | Endpoint | Estado |
|---|---|---|
| IF-029 | CRUD completo | Implementada — `SERVICE_ADMIN_PATHS` |

## 10. Solicitudes (`SolicitudController`) — MF-007 a MF-012, MF-027

| ID | Endpoint | Protección | Estado |
|---|---|---|---|
| IF-030 | `POST /api/v2/solicitudes` | Autenticado | Implementada — creación de cualquiera de los 6 tipos (discriminados por `tipoSolicitud`) |
| IF-031 | `PUT /{id}/oferta-particular`, `/{id}/intercambio` | `/intercambio` restringido a `hasAnyRole('JEFATURA','SUBROGANTE','MEDICO')`; `/oferta-particular` solo `anyRequest().authenticated()` | Implementada |
| IF-032 | `PUT /{id}/estado` (aprobar/rechazar) | `hasAnyRole('JEFATURA','SUBROGANTE','MEDICO')` — **incluye MEDICO**, contradiciendo MF-027 que dice que solo Admin/Jefatura/Subrogante evalúan solicitudes | Implementada, pero con **permiso más amplio que el documentado** (un funcionario con rol de servicio MEDICO puede aprobar/rechazar solicitudes de terceros vía API, aunque la UI no le muestre esa opción) |
| IF-033 | `PATCH /{id}/motivo` | Autenticado, sin más restricción visible en `SecurityConfig` | Implementada, no documentada en el manual |
| IF-034 | `GET` (todas), `/funcionario/{id}`, `/receptor/{id}`, `/tipo/{id}`, `/turno/{id}` | **Solo `anyRequest().authenticated()`, sin ningún filtro de propiedad/rol/servicio** | Implementada funcionalmente, pero con **IDOR confirmado por prueba real** (ver hallazgo BUG-002 en `DEFECT_REGISTER.md`): cualquier funcionario autenticado puede leer solicitudes de cualquier otro funcionario y de cualquier servicio |

## 11. Ofertas generales (`OfertaGeneralController`) — MF-012

| ID | Endpoint | Estado |
|---|---|---|
| IF-035 | `POST` (crear oferta), `PUT /{id}/aprobar`, `/{id}/rechazar` | Implementada — autenticado, sin restricción de rol visible en `SecurityConfig` (no está en ninguna lista de paths) |
| IF-036 | `POST /{id}/postular`, `DELETE /{id}/postular/{idPostulacion}` | Implementada |
| IF-037 | `PUT /{id}/seleccionar/{idPostulacion}` | Implementada |
| IF-038 | `GET /servicio/{idServicio}`, `/ofertor/{idFuncionario}` | Implementada, mismo patrón de falta de filtrado por autorización que IF-026/IF-034 |

## 12. Notificaciones (`NotificacionController`) — MF-014

| ID | Endpoint | Estado |
|---|---|---|
| IF-039 | `GET /sin-leer/{idFuncionario}`, `/usuario/{idFuncionario}` | Implementada, **sin verificar que `idFuncionario` sea el propio usuario autenticado** (mismo patrón IDOR: cualquiera puede leer notificaciones de otro id) |
| IF-040 | `PUT /{id}/leer`, `DELETE /{id}` | Implementada, mismo patrón — no verifica ownership de la notificación |
| IF-041 | `POST` (crear notificación) | Implementada |
| IF-042 | `GET` (todas), `/{id}`, `/solicitud/{id}` | Implementada — el `GET` sin filtro permite listar notificaciones de todo el sistema a cualquier autenticado |

## 13. Bitácora de cambios (`BitacoraController`) — MF-031

| ID | Endpoint | Estado |
|---|---|---|
| IF-043 | `GET` (todas), `/{id}`, `/tipo/{tipo}`, `/funcionario/{id}`, `/turno/{id}`, `/solicitud/{id}`, `/dto`, `/dto/{id}` | Implementada — filtros documentados en el manual (MF-031) sí existen a nivel de endpoint; **autorización**: cualquier autenticado puede ver bitácora de cualquier servicio (el manual dice que es para Admin/Jefatura/Subrogante, pero no hay restricción de rol en `SecurityConfig` para `/api/v2/bitacora/**`) |
| IF-044 | `POST` (registrar evento) | Implementada — usado internamente por otros servicios, no una acción manual de usuario final |

## 14. Auditoría de asistencia (MF-032)

| ID | Funcionalidad | Estado |
|---|---|---|
| IF-045 | Turnos totales/asignados/vacantes con encargado | Implementada — se sirve con combinaciones de `TurnoController` (`/stats`, `/todos-detalle`, `/cobertura`) consumidas por `AuditoriaView.jsx` (confirmado en fase previa de esta sesión vía grep de imports) |

## 15. Estadísticas del servicio (MF-030)

| ID | Funcionalidad | Estado |
|---|---|---|
| IF-046 | Cobertura por mes/semana con filtros | Implementada — `GET /api/v2/turnos/servicio/{id}/stats`, `/cobertura`, `/funcionarios-stats` |

## 16. Exportación CSV (`ExportacionController`) — MF-013, MF-033

| ID | Endpoint | Estado |
|---|---|---|
| IF-047 | `GET /servicios/{idServicio}/funcionarios/csv` | Implementada, no documentada explícitamente con este nombre pero corresponde al alcance "Todo el servicio" de MF-033 |
| IF-048 | `GET /turnos/csv` | Implementada — corresponde a MF-013/MF-033 (alcance "Mis turnos") |

## 17. Feriados (sin correspondencia directa en el manual)

| ID | Endpoint | Estado |
|---|---|---|
| IF-049 | `GET /api/v2/feriados` (`FeriadoController`) | Implementada, **no documentada** en ningún manual — respalda la "regla de feriado" mencionada en MF-029, pero el manual no describe de dónde salen los feriados (¿API externa, tabla propia?) — requiere revisión de código adicional en Fase 8 |

## 18. Salud / info (`HealthController`)

| ID | Endpoint | Estado |
|---|---|---|
| IF-050 | `GET /api/v2/health`, `/api/v2/info` | Implementada — no es funcionalidad de negocio, es operacional; ya cubierta en la auditoría de seguridad (SEC-011) |

---

## Resumen de hallazgos de autorización detectados en esta fase (código, no aún BUG-XXX formal)

Todos comparten el mismo patrón raíz: **`SecurityConfig.java` protege por `HttpMethod` + prefijo de ruta a nivel de escritura (POST/PUT/DELETE), pero dejó los `GET` de varios módulos cubiertos únicamente por `anyRequest().authenticated()`**, es decir "cualquier rol, de cualquier servicio, con sesión válida" — sin distinguir servicio propio ni ownership:

- Turnos (IF-026), Puestos (IF-028 GET), Solicitudes (IF-034 — ya conocido de la fase de evidencia previa), Ofertas generales (IF-038), Notificaciones (IF-039/IF-042), Bitácora (IF-043).

Esto se documentará formalmente como defectos en `DEFECT_REGISTER.md` (Fase 9), priorizando por sensibilidad del dato expuesto: Solicitudes y Notificaciones (datos personales/motivos) > Turnos/Bitácora (organizacional) > Puestos (bajo impacto).
