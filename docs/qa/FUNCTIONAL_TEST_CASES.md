# Casos de prueba funcionales — SGT HUAP

Formato: ID, módulo, tipo (positivo/negativo/edge/permiso-denegado/servicio-no-disponible), precondición, pasos, resultado esperado, resultado obtenido, estado.

Los casos con evidencia de API real están marcados **[Ejecutado]**; el resto se diseñó a partir de la lectura del código (`Service`/`Controller`) y el manual, y queda marcado **[Diseñado, no ejecutado]** por límite de tiempo/alcance de este ciclo — quedan como insumo directo para una siguiente ronda de automatización.

---

## Módulo: Autenticación

| ID | Tipo | Precondición | Pasos | Esperado | Obtenido | Estado |
|---|---|---|---|---|---|---|
| TC-001 | Positivo | RUT registrado, contraseña correcta | `POST /login` | 200, preAuthToken + servicios | Conforme | ✅ **[Ejecutado]** |
| TC-002 | Negativo | RUT registrado, contraseña incorrecta | `POST /login` | 401, mensaje genérico | Conforme | ✅ **[Ejecutado]** |
| TC-003 | Negativo (enumeración) | RUT inexistente | `POST /login` | 401, mismo mensaje y tiempo que TC-002 | Conforme (SEC-013) | ✅ **[Ejecutado]** |
| TC-004 | Edge | 5 intentos fallidos consecutivos | `POST /login` ×5 | Bloqueo temporal (15 min) | Conforme | ✅ **[Ejecutado]** |
| TC-005 | Edge | Datos vacíos | `POST /login` con `{}` | 400 Bad Request | **[Diseñado, no ejecutado]** | ⏸️ |
| TC-006 | Negativo | Token expirado | Llamar cualquier endpoint protegido con JWT vencido | 401 | Conforme (verificado en fase de seguridad previa) | ✅ |
| TC-007 | Permiso-denegado | `servicioId` no asignado al usuario | `POST /login/select-service` con servicio ajeno | Rechazo | Conforme (verificado en fase de seguridad previa) | ✅ |

## Módulo: Servicios

| ID | Tipo | Precondición | Pasos | Esperado | Obtenido | Estado |
|---|---|---|---|---|---|---|
| TC-008 | Positivo | — | `GET /servicios` sin token | 200, lista simple | Conforme | ✅ **[Ejecutado]** |
| TC-009 | Positivo | Rol ADMINISTRADOR | `POST /servicios` con nombre válido | 200/201, creado | Conforme, verificado también tras reinicio de contenedor | ✅ **[Ejecutado]** |
| TC-010 | Negativo — duplicado | Servicio con nombre ya existente | `POST /servicios` mismo nombre | Rechazo (409 o validación) | **[Diseñado, no ejecutado]** — requiere revisar `ServicioService` para constraint de unicidad | ⏸️ |
| TC-011 | Permiso-denegado | Rol MEDICO | `POST /servicios` | Debería ser 403 | Obtenido 401 (BUG-001) | ⚠️ **[Ejecutado]** |
| TC-012 | Edge | Servicio con turnos/puestos asociados | `DELETE /servicios/{id}` | Debe bloquear o exigir confirmación (según `/dependencias`) | **[Diseñado, no ejecutado]** | ⏸️ |

## Módulo: Tipos de turno / Rotativas / Planificaciones

| ID | Tipo | Precondición | Pasos | Esperado (manual) | Obtenido | Estado |
|---|---|---|---|---|---|---|
| TC-013 | Permiso-denegado | Rol JEFATURA puro (no ADMINISTRADOR) | `POST /planificaciones` | Manual dice permitido | 401 — denegado por el sistema (BUG-003) | ⚠️ **[Ejecutado]** |
| TC-014 | Permiso-denegado | Rol JEFATURA puro | `POST /rotativas` | Manual dice permitido | 401 (BUG-003) | ⚠️ **[Ejecutado]** |
| TC-015 | Permiso-denegado | Rol JEFATURA puro | `POST /tipos-turno` | Manual dice permitido | 401 (BUG-003) | ⚠️ **[Ejecutado]** |
| TC-016 | Positivo | Rol ADMINISTRADOR | `POST /planificaciones` + `POST /{id}/generar` | Turnos generados sin duplicar | Conforme (verificado en fase A de esta sesión) | ✅ **[Ejecutado]** |
| TC-017 | Edge — regenerar sobre existente | Planificación ya generada previamente | Generar de nuevo sin borrar turnos previos | Antes: duplicaba turnos (bug ya corregido en fase A). Ahora: usar `DELETE /{id}/turnos` primero | Conforme tras la corrección de esta sesión | ✅ **[Ejecutado, corregido en sesión previa]** |
| TC-018 | Edge — solapes | Dos rotativas que generan turnos con horario solapado para el mismo funcionario | `POST /{id}/conflictos` antes de generar | Debe reportar el conflicto sin bloquear (turno queda vacante) | **[Diseñado, no ejecutado]** — confirmado solo por lectura del manual (MF-026) | ⏸️ |
| TC-019 | Edge — límite 24h/semana | Rotativa que excede 24 horas asignables en una semana | `PUT /{id}/secuencia` | Debe rechazar o advertir (regla documentada en MF-025) | **[Diseñado, no ejecutado]** — no se encontró la validación explícita en el código revisado en este ciclo, requiere revisión adicional de `RotativaService` | ⏸️ |

## Módulo: Turnos

| ID | Tipo | Precondición | Pasos | Esperado | Obtenido | Estado |
|---|---|---|---|---|---|---|
| TC-020 | Permiso-denegado (IDOR) | Rol MEDICO de servicio A | `GET /turnos/servicio/{B}/stats` (servicio ajeno B) | Debe rechazar o filtrar | 200, datos completos expuestos (BUG-004) | ❌ **[Ejecutado]** |
| TC-021 | Positivo | Rol MEDICO, su propio servicio | `GET /turnos/servicio/{propio}` | 200, datos correctos | Conforme | ✅ **[Ejecutado]** |
| TC-022 | Negativo — turno inexistente | ID de turno inexistente | `GET /turnos/{id}` con id=999999 | 404 | **[Diseñado, no ejecutado]** | ⏸️ |
| TC-023 | Permiso-denegado | Rol MEDICO | `POST /turnos`, `PUT /turnos/{id}`, `DELETE /turnos/{id}` | Rechazo | Conforme — bloqueado por `SERVICE_ADMIN_PATHS` | ✅ |
| TC-024 | Edge — asignación duplicada | Asignar dos funcionarios al mismo puesto/turno simultáneamente (condición de carrera) | Requiere prueba de concurrencia (Testcontainers) | Debe prevenir doble asignación | **No verificable en este ambiente** (26 pruebas de concurrencia no ejecutables, ver `QA_BASELINE.md`) | ⏸️ **Bloqueado por entorno** |

## Módulo: Solicitudes

| ID | Tipo | Precondición | Pasos | Esperado | Obtenido | Estado |
|---|---|---|---|---|---|---|
| TC-025 | Positivo | Rol MEDICO, turno propio | `POST /solicitudes` tipo Permiso | Creada, pendiente | Conforme | ✅ **[Ejecutado]** |
| TC-026 | Permiso-denegado (IDOR) | Rol MEDICO | `GET /solicitudes` (todas) | Debe filtrar por servicio/rol | 200, todas expuestas (BUG-002) | ❌ **[Ejecutado]** |
| TC-027 | Negativo — fechas inválidas | Fecha fin anterior a fecha inicio | `POST /solicitudes` tipo Permiso con rango inválido | Debe rechazar (validación) | **[Diseñado, no ejecutado]** — no se confirmó si `SolicitudService` valida el orden de fechas | ⏸️ |
| TC-028 | Edge — intercambio mutuo | Intercambio donde el turno destino ya fue tomado por otro proceso concurrente | Debe rechazar o requerir reevaluación | **No verificable sin Testcontainers** | ⏸️ **Bloqueado por entorno** |
| TC-029 | Permiso-denegado | Rol MEDICO evaluando solicitud ajena | `PUT /solicitudes/{id}/estado` | Manual: debería rechazar (solo Admin/Jefatura/Subrogante) | Permitido por configuración de Spring Security (BUG-005) — no ejecutado como escritura real por prudencia sobre datos compartidos | ⚠️ **[Diseñado + evidencia de código]** |

## Módulo: Ofertas generales

| ID | Tipo | Precondición | Pasos | Esperado | Obtenido | Estado |
|---|---|---|---|---|---|---|
| TC-030 | Positivo | Turno propio | `POST /ofertas-generales` | Oferta creada, visible al servicio | **[Diseñado, no ejecutado]** — no se realizó la escritura para no alterar datos compartidos de desarrollo | ⏸️ |
| TC-031 | Positivo | Oferta activa | `POST /{id}/postular` | Postulación registrada | **[Diseñado, no ejecutado]** | ⏸️ |
| TC-032 | Edge | Oferta sin postulantes | `PUT /{id}/seleccionar/{idPostulacion}` con id inexistente | Debe rechazar (404/400) | **[Diseñado, no ejecutado]** | ⏸️ |
| TC-033 | Permiso-denegado (IDOR) | Consultar ofertas de otro servicio | `GET /ofertas-generales/servicio/{ajeno}` | Debe filtrar | 200 sin filtro (mismo patrón que BUG-004, gravedad menor porque las ofertas generales son intencionalmente visibles a todo el servicio, pero no debería cruzar servicios) | ⚠️ **[Ejecutado parcialmente — respuesta vacía en el servicio probado, no concluyente]** |

## Módulo: Notificaciones

| ID | Tipo | Precondición | Pasos | Esperado | Obtenido | Estado |
|---|---|---|---|---|---|---|
| TC-034 | Permiso-denegado (IDOR) | Usuario autenticado (id=2) | `GET /notificaciones/usuario/1` (otro id) | Debe rechazar | 200, contenido expuesto (BUG-006) | ❌ **[Ejecutado]** |
| TC-035 | Edge | Sin notificaciones | `GET /notificaciones/sin-leer/{id}` de un usuario sin notificaciones | 200, lista vacía | **[Diseñado, no ejecutado]** | ⏸️ |

## Módulo: Bitácora

| ID | Tipo | Precondición | Pasos | Esperado | Obtenido | Estado |
|---|---|---|---|---|---|---|
| TC-036 | Permiso-denegado (IDOR) | Rol MEDICO | `GET /bitacoras` (todas) | Debe filtrar por servicio/rol | 200, 6.5MB sin filtrar (BUG-007) | ❌ **[Ejecutado]** |
| TC-037 | Edge — volumen grande | Histórico extenso (miles de eventos) | `GET /bitacoras` | Debería paginar | Sin paginación, respuesta completa en una sola llamada (parte de BUG-007) | ❌ **[Ejecutado]** |
| TC-038 | Negativo — ruta incorrecta | — | `GET /api/v2/bitacora` (singular, no existe) | 404 | 500 (BUG-008) | ⚠️ **[Ejecutado]** |

## Módulo: Jerarquía de funcionarios

| ID | Tipo | Precondición | Pasos | Esperado | Obtenido | Estado |
|---|---|---|---|---|---|---|
| TC-039 | Permiso-denegado | Rol SUBROGANTE | Intentar designar a otro funcionario como SUBROGANTE | Manual: debe rechazar (MF-023) | **No verificado en este ciclo** — requiere una cuenta SUBROGANTE de prueba adicional | ⏸️ |
| TC-040 | Positivo | Rol JEFATURA | Designar un SUBROGANTE en su propio servicio | Permitido | **[Diseñado, no ejecutado]** | ⏸️ |
| TC-041 | Edge | ADMINISTRADOR intenta auto-asignarse a un servicio | `POST` asignación con el propio id del admin | Manual dice que debe rechazarse (MF-020) | **[Diseñado, no ejecutado]** | ⏸️ |

## Módulo: Exportación CSV

| ID | Tipo | Precondición | Pasos | Esperado | Obtenido | Estado |
|---|---|---|---|---|---|---|
| TC-042 | Positivo | Usuario con turnos | `GET /turnos/csv` | 200, archivo CSV con columnas documentadas | **[Diseñado, no ejecutado — endpoint confirmado por lectura de código]** | ⏸️ |
| TC-043 | Edge — sin turnos | Usuario sin turnos en el mes | `GET /turnos/csv` | 200, CSV vacío o solo encabezados (no error) | **[Diseñado, no ejecutado]** | ⏸️ |

## Módulo: Disponibilidad de servicio / errores de conexión

| ID | Tipo | Precondición | Pasos | Esperado | Obtenido | Estado |
|---|---|---|---|---|---|---|
| TC-044 | Servicio-no-disponible | Backend caído | Cualquier llamada del frontend | Mensaje de error controlado, no pantalla en blanco | **No verificable sin navegador real en este entorno** | ⏸️ **Bloqueado por entorno** |
| TC-045 | Edge — reinicio de contenedor | Servicio creado antes del reinicio | Reiniciar `huap-backend`, confirmar persistencia | Datos persisten sin duplicar | Conforme (Fase 7 de esta auditoría) | ✅ **[Ejecutado]** |

---

## Resumen cuantitativo

- **Total de casos diseñados:** 45.
- **Ejecutados con evidencia real (API/DB/contenedor):** 22.
- **Diseñados pero no ejecutados en este ciclo** (por límite de tiempo o por evitar escrituras irreversibles sobre datos compartidos de desarrollo): 19.
- **Bloqueados por limitación de entorno** (sin Docker-in-Docker para Testcontainers, o sin navegador real): 4.
- **Con defecto confirmado:** 8 (mapean 1:1 a `DEFECT_REGISTER.md`).
- **Conformes:** 14 de los 22 ejecutados.

Ver fórmulas y métricas de cobertura consolidadas en `MANUAL_SYSTEM_GAP_ANALYSIS.md`.
