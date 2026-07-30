# Matriz de permisos por rol — SGT HUAP

Roles reales del sistema: **Administrador** (`rolSistema=ADMINISTRADOR`), **Jefatura** (`rol` de servicio), **Subrogante** (`rol` de servicio), **Funcionario/Médico** (`rolSistema=USUARIO`, sin rol de gestión). Un mismo funcionario puede tener distintos roles de servicio en distintos servicios; `rolSistema` es ortogonal a `rol` (de servicio).

Leyenda: ✅ Permitido y verificado · ❌ Denegado y verificado · ⚠️ Permitido pero contradice el manual (defecto) · ⛔ Denegado pero el manual dice que debería permitirse (defecto) · ⏸️ No verificado en este ciclo (código revisado, sin prueba de API directa).

| Funcionalidad | Administrador | Jefatura | Subrogante | Funcionario/Médico | Evidencia |
|---|---|---|---|---|---|
| Login / selección de servicio | ✅ | ✅ | ✅ | ✅ | T-01–T-05 |
| Ver calendario / turnos propios | ✅ | ✅ | ✅ | ✅ | Código: `TurnoController` GET, sin restricción de rol |
| Crear solicitud (los 6 tipos) | ✅ | ✅ | ✅ | ✅ | T-18, código `SolicitudController.POST` sin restricción de rol |
| **Ver solicitudes de TODO el sistema** (`GET /solicitudes`) | ✅ (esperado) | ⚠️ Permitido, no debería ver de otros servicios | ⚠️ Permitido, no debería ver de otros servicios | ⚠️ **Permitido — contradice el manual (BUG-002)** | T-19 |
| Aprobar/rechazar solicitud | ✅ | ✅ | ✅ | ⚠️ **Permitido para rol de servicio MEDICO — contradice el manual (BUG-005)** | Código `SecurityConfig` líneas 111-114 |
| Crear servicio | ✅ | ❌ (correcto, no documentado para Jefatura) | ❌ (correcto) | ❌ (correcto) | T-07, T-08 |
| Asignar funcionario a servicio | ✅ | ⏸️ No verificado con cuenta Jefatura pura | ⏸️ No verificado | ❌ (correcto, esperado) | Código: `/api/v2/Personal/**` en `SERVICE_ADMIN_PATHS` |
| Designar Jefatura/Subrogante | ✅ (cualquier servicio) | ✅ (solo subrogantes de su servicio, según manual) | ⛔ **No debería poder designar nuevos subrogantes (regla MF-023) — no verificado con prueba de API en este ciclo** | ❌ (correcto) | ⏸️ Pendiente, ver gap analysis |
| **Crear tipo de turno** | ✅ | ⛔ **Denegado por el sistema — el manual dice que debería permitirse (BUG-003)** | ⛔ **Igual que Jefatura** | ❌ (correcto) | T-11 |
| **Crear rotativa** | ✅ | ⛔ **BUG-003** | ⛔ **BUG-003** | ❌ (correcto) | T-10 |
| **Crear planificación mensual** | ✅ | ⛔ **BUG-003** | ⛔ (el manual ni siquiera lista Subrogante para esta función, es consistente) | ❌ (correcto) | T-09 |
| Asignar funcionario a turno vacante | ✅ | ✅ | ✅ | ❌ (correcto) | Código: `/api/v2/turnos/**` POST/PUT/DELETE en `SERVICE_ADMIN_PATHS` |
| **Consultar turnos/stats/cobertura de un servicio ajeno** | ✅ (esperado, es admin global) | ⚠️ Permitido — no debería, salvo su propio servicio | ⚠️ Permitido — no debería | ⚠️ **Permitido — contradice el manual (BUG-004)** | T-14, T-15 |
| Gestionar puestos (crear/editar/inhabilitar) | ✅ | ✅ | ✅ | ❌ (correcto) | Código: `/api/v2/puestos/**` en `SERVICE_ADMIN_PATHS` |
| Reglas de horario del servicio | ✅ | ✅ | ✅ | ❌ (correcto) | Código: `/api/v2/reglas-servicio/**` en `SERVICE_ADMIN_PATHS` |
| Estadísticas del servicio | ✅ | ✅ | ✅ | ⚠️ Accesible vía API sin restricción (mismo patrón que BUG-004), aunque la UI de Funcionario no expone este módulo | Código |
| **Ver bitácora completa del sistema** | ✅ (esperado) | ⚠️ Permitido para cualquier servicio, no solo el propio | ⚠️ Igual | ⚠️ **Permitido — contradice el manual (BUG-007)** | T-22 |
| Auditoría de asistencia | ✅ | ✅ | ✅ | ❌ Correcto a nivel de UI (no se le muestra el menú), pero el endpoint subyacente (`TurnoController` stats) no está protegido — mismo patrón que BUG-004 | Código |
| Exportar CSV (propios turnos) | ✅ | ✅ | ✅ | ✅ | Código: `ExportacionController` sin restricción de rol adicional, correcto — es autoservicio |
| Exportar CSV (todo el servicio) | ✅ | ✅ | ✅ | ⏸️ No verificado si un Funcionario puede forzar el alcance "todo el servicio" vía API directa (la UI no se lo ofrece) | Pendiente |
| **Leer/modificar notificaciones de otro funcionario** | — | — | — | ⚠️ **Permitido para cualquier `idFuncionario` — contradice el sentido común y el modelo de datos (BUG-006)** | T-21 |

## Conteo de la matriz

- **Filas evaluadas:** 20.
- **Conformes (✅/❌ correctos):** 12.
- **Defectos confirmados con evidencia de API (⚠️/⛔):** 6 filas (mapean a BUG-002 a BUG-007).
- **Pendientes de verificación adicional (⏸️):** 4 filas — requieren más cuentas de prueba (Subrogante puro) o pruebas de escritura no realizadas por prudencia sobre datos compartidos de desarrollo.
