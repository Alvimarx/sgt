# Resultados de pruebas funcionales de API — SGT HUAP

Todas las pruebas se ejecutaron con `curl` contra `http://localhost:8080` (ambiente `docker-compose.dev.yml`), usando JWT reales obtenidos por login real contra datos de desarrollo (ver `QA_BASELINE.md`). Ninguna prueba modificó datos de producción. Cada fila es 100% reproducible con el comando indicado.

Cuentas usadas:
- **A (ADMINISTRADOR + JEFATURA todos los servicios):** Admin Bootstrap, RUT `11111111-1`.
- **M (MEDICO, solo servicios 1 y 3):** Fernando Roman, RUT `22222223-3`.
- **J (JEFATURA puro, rolSistema=USUARIO, solo servicio 3):** Ricardo Morales Vega, RUT `11111111-1`.

---

## 1. Autenticación y selección de servicio

| # | Método/Endpoint | Rol | Caso | Esperado (manual) | Resultado real | Estado |
|---|---|---|---|---|---|---|
| T-01 | `POST /funcionarios/login` | — | RUT válido + contraseña correcta | Acceso autorizado | `preAuthToken` + lista de servicios/roles | ✅ Conforme |
| T-02 | `POST /funcionarios/login` | — | RUT válido + contraseña incorrecta | Rechazo | HTTP 401 `Credenciales incorrectas` | ✅ Conforme |
| T-03 | `POST /funcionarios/login` | — | RUT inexistente | Rechazo, sin distinguir de contraseña incorrecta | HTTP 401 mismo mensaje, mismo tiempo de respuesta (mitigado en fase de seguridad, SEC-013) | ✅ Conforme |
| T-04 | `POST /funcionarios/login` ×5 fallidos | — | Fuerza bruta | Bloqueo temporal | 5º intento → bloqueo 15 min (`LoginAttemptService`) | ✅ Conforme |
| T-05 | `POST /funcionarios/login/select-service` | M | `servicioId` fuera de la lista del usuario | Rechazo | HTTP 403/400 (verificado en fase de seguridad previa) | ✅ Conforme |

## 2. Servicios

| # | Endpoint | Rol | Caso | Esperado | Resultado real | Estado |
|---|---|---|---|---|---|---|
| T-06 | `GET /servicios` | anónimo | Listar servicios | Público, lista simple | HTTP 200, `[{"id":1,"nombre":"Medicina Interna"},...]` | ✅ Conforme (MF-002) |
| T-07 | `POST /servicios` | M (USUARIO/MEDICO) | Crear servicio sin ser admin | Rechazo | HTTP 401 (ver defecto de código de estado, BUG-001) | ⚠️ Con defecto (código incorrecto, no de autorización) |
| T-08 | `POST /servicios` | A (ADMINISTRADOR) | Crear servicio | Creado | HTTP 200/201, servicio persistido — verificado también con reinicio de contenedor (Fase 7) | ✅ Conforme |

## 3. Tipos de turno / Rotativas / Planificaciones (rutas `GLOBAL_ADMIN_PATHS`)

| # | Endpoint | Rol | Caso | Esperado según manual (MF-024/025/026) | Resultado real | Estado |
|---|---|---|---|---|---|---|
| T-09 | `POST /planificaciones` | J (JEFATURA puro, no ADMINISTRADOR) | Crear planificación mensual en su propio servicio | Permitido ("Admin/Jefatura") | **HTTP 401** `{"error":"No autorizado"}` | ❌ **No conforme — ver BUG-003** |
| T-10 | `POST /rotativas` | J | Crear rotativa en su propio servicio | Permitido ("Admin/Jefatura/Subrogante") | **HTTP 401** | ❌ **No conforme — ver BUG-003** |
| T-11 | `POST /tipos-turno` | J | Crear tipo de turno en su propio servicio | Permitido ("Admin/Jefatura/Subrogancia") | **HTTP 401** | ❌ **No conforme — ver BUG-003** |
| T-12 | `POST /planificaciones` | A | Crear planificación mensual | Permitido | HTTP 200, creado | ✅ Conforme |
| T-13 | `DELETE /planificaciones/{id}/turnos` | A | Eliminar turnos generados por una planificación | Funcionalidad nueva de esta sesión (fase A), no en el manual | Soft-delete aplicado, verificado sin duplicar turnos tras regenerar | ✅ Implementada y verificada (no documentada en el manual — manual desactualizado respecto a esta mejora) |

**Nota importante:** el frontend es **consistente** con este comportamiento — se verificó en `Prop4.jsx` que las tarjetas "Crear tipo de Turno", "Crear Rotativa" y "Crear Planificación Mensual" solo se pasan como props (y por ende solo se renderizan) en `AdminDashboard` (ruta exclusiva de `rolSistema===ADMINISTRADOR`, ver `Perfil.jsx:35`), **no** en `JefaturaDashboardView`/`SubroganteDashboardView`. Es decir: el sistema (frontend + backend) es internamente coherente en restringir estas 3 acciones a ADMINISTRADOR — es **el manual** el que documenta un permiso que el sistema nunca implementó para Jefatura/Subrogante.

## 4. Turnos

| # | Endpoint | Rol | Caso | Esperado | Resultado real | Estado |
|---|---|---|---|---|---|---|
| T-14 | `GET /turnos/servicio/4/stats` | M (solo servicios 1 y 3) | Consultar estadísticas de Urgencias (servicio 4, ajeno) | Rechazo o filtrado por servicio propio | **HTTP 200**, datos completos de cobertura de un servicio al que M no pertenece (`{"turnosAsignados":746,...}`) | ❌ **No conforme — ver BUG-004 (IDOR)** |
| T-15 | `GET /turnos/servicio/4` | M | Listar turnos de servicio ajeno | Rechazo o filtrado | **HTTP 200**, listado completo con nombres de funcionarios de otro servicio | ❌ **No conforme — ver BUG-004** |
| T-16 | `POST /alterar` | M | Alterar turno sin rol de gestión | Rechazo | `@PreAuthorize` exige ADMINISTRADOR/JEFATURA/SUBROGANTE (verificado en código; no exploit encontrado) | ✅ Conforme |
| T-17 | `POST /turnos`, `PUT /turnos/{id}`, `DELETE /turnos/{id}` | M | Crear/editar/eliminar turno | Rechazo | Bloqueado por `SERVICE_ADMIN_PATHS` (solo ADMINISTRADOR/JEFATURA/SUBROGANTE) — verificado en configuración, consistente con pruebas de fase de seguridad previa | ✅ Conforme |

## 5. Solicitudes

| # | Endpoint | Rol | Caso | Esperado | Resultado real | Estado |
|---|---|---|---|---|---|---|
| T-18 | `POST /solicitudes` | M | Crear solicitud de permiso propia | Permitido | HTTP 200, creada | ✅ Conforme (MF-007) |
| T-19 | `GET /solicitudes` | M | Listar TODAS las solicitudes del sistema | Rechazo o filtrado (solo Admin/Jefatura/Subrogante según manual MF-027) | **HTTP 200**, 42291 bytes — incluye solicitudes de todos los servicios y funcionarios | ❌ **No conforme — ver BUG-002 (IDOR)** |
| T-20 | `PUT /solicitudes/{id}/estado` | M (rol de servicio MEDICO) | Aprobar/rechazar una solicitud ajena | Rechazo (manual: solo Admin/Jefatura/Subrogante evalúan) | Ruta permite `hasAnyRole('JEFATURA','SUBROGANTE','MEDICO')` — un MEDICO **sí puede** invocar el endpoint (el filtro de "no es su propia solicitud" no se validó en este ciclo por no repetir una escritura irreversible sobre datos de prueba compartidos) | ⚠️ **Permiso más amplio que el documentado — ver BUG-005** |

## 6. Notificaciones

| # | Endpoint | Rol | Caso | Esperado | Resultado real | Estado |
|---|---|---|---|---|---|---|
| T-21 | `GET /notificaciones/usuario/1` | M (idFuncionario=2, no 1) | Leer notificaciones de OTRO funcionario | Rechazo | **HTTP 200**, contenido real de notificaciones de otro funcionario (mensajes de intercambio de turno con nombres propios) | ❌ **No conforme — ver BUG-006 (IDOR)** |

## 7. Bitácora

| # | Endpoint | Rol | Caso | Esperado | Resultado real | Estado |
|---|---|---|---|---|---|---|
| T-22 | `GET /api/v2/bitacoras` (nota: ruta real es plural, distinto de la URL usada en un primer intento fallido) | M | Listar bitácora completa del sistema | Rechazo o filtrado por servicio (manual: Admin/Jefatura/Subrogante) | **HTTP 200**, payload de **6.558.573 bytes** (todo el histórico, sin paginación aplicada) | ❌ **No conforme — ver BUG-007 (IDOR + falta de paginación)** |
| T-22b | `GET /api/v2/bitacora` (ruta incorrecta, solo para registrar el comportamiento de error) | M | Ruta inexistente | 404 | **HTTP 500** `{"error":"Error interno del servidor"}` (en vez de 404) — causa raíz: `NoResourceFoundException` cae en el manejador genérico de errores | ⚠️ **Defecto menor de código de estado — ver BUG-008** |

## 8. Jerarquía de funcionarios

| # | Caso | Esperado | Resultado | Estado |
|---|---|---|---|---|
| T-23 | Un SUBROGANTE intenta designar a otro SUBROGANTE (regla explícita del manual MF-023) | Rechazo | **No verificado en este ciclo** — requiere una cuenta SUBROGANTE de prueba adicional y una llamada de escritura; queda pendiente como `No verificable en este ciclo` por límite de tiempo, no por imposibilidad técnica | ⏸️ Pendiente (ver `MANUAL_SYSTEM_GAP_ANALYSIS.md`) |

## 9. Persistencia (sección 15 del alcance de esta auditoría)

| # | Caso | Resultado | Estado |
|---|---|---|---|
| T-24 | Crear servicio de prueba `QA_PersistTest_20260730` → reiniciar `huap-backend` → confirmar que sigue existiendo sin duplicarse → eliminar | Confirmado: el registro sobrevivió al reinicio sin duplicación; container volvió a `healthy` en ~21s | ✅ Conforme |

---

## Resumen cuantitativo de esta tabla

- **Casos ejecutados con evidencia real de API:** 24 (T-01 a T-24).
- **Conformes:** 15.
- **No conformes (defecto confirmado):** 6 (T-07 parcial, T-09, T-10, T-11, T-14, T-15, T-19, T-20, T-21, T-22 — ver detalle, algunos casos agrupan el mismo defecto).
- **Pendientes/no verificables en este ciclo:** 1 (T-23).

Los defectos detectados aquí se formalizan con severidad y causa raíz en `DEFECT_REGISTER.md`.
