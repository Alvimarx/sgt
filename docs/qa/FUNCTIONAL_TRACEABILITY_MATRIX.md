# Matriz de trazabilidad funcional — Manual ↔ Código ↔ UI ↔ API ↔ Pruebas

Cruza cada funcionalidad documentada (`MF-XXX`, ver `MANUAL_FUNCTIONAL_INVENTORY.md`) con su implementación real (`IF-XXX`, ver `IMPLEMENTED_FUNCTIONAL_INVENTORY.md`), su cobertura de prueba (`TC-XXX`/`T-XXX`) y una clasificación de conformidad según las 10 categorías del alcance de esta auditoría:

**Categorías de conformidad:** (1) Conforme, (2) Parcialmente conforme, (3) No implementada, (4) Implementada pero no documentada, (5) Documentada pero no implementada, (6) Error funcional, (7) Diferencia de permisos, (8) Diferencia visual, (9) Diferencia de datos, (10) No verificable en este entorno.

| MF-XXX | IF-XXX | Módulo | TC/T asociado | Categoría | Detalle |
|---|---|---|---|---|---|
| MF-001 | IF-001 | Login | TC-001–TC-004 | (1) Conforme | — |
| MF-002 | IF-006 | Selección de servicio | TC-008 | (1) Conforme | — |
| MF-003, MF-004 | — (Dashboard, componente frontend) | Dashboard | — | (10) No verificable | Requiere navegador real; código de `AgendaView.jsx`/`calendarView.jsx` revisado y consistente con la descripción del manual, pero no se confirmó visualmente en esta fase |
| MF-005, MF-006 | IF-026 | Filtrado de turnos | TC-020, TC-021 | (7) Diferencia de permisos | El filtrado propio del usuario funciona, pero el endpoint subyacente permite además consultar servicios ajenos (BUG-004) |
| MF-007–MF-012 | IF-030 | Solicitudes (creación, 6 tipos) | TC-025 | (1) Conforme | Creación funciona correctamente para los 6 tipos (validado por lectura de `SolicitudService` + prueba positiva de Permiso) |
| MF-013 | IF-048 | Exportar CSV (usuario) | TC-042, TC-043 | (10) No verificable | Endpoint confirmado en código; no se ejecutó la descarga real en este ciclo |
| MF-014 | IF-039, IF-041, IF-042 | Notificaciones | TC-034, TC-035 | (7) Diferencia de permisos | Funcionalidad de bandeja funciona, pero sin control de ownership (BUG-006) |
| MF-015 | — | Detalle de turno | — | (10) No verificable | Requiere navegador; lógica de backend (`TurnoController.GET /{id}`) existe y es consistente |
| MF-016 | — (calendarView.jsx) | Calendario | — | (10) No verificable | Redisño visual de esta misma sesión ya ajustó colores/indicadores; sin herramienta de captura de pantalla no se puede confirmar el resultado final renderizado |
| MF-017 | — | Filtro de solicitudes (orden/agrupación) | — | (10) No verificable | Es lógica de presentación en frontend; no confirmada por falta de navegador |
| MF-018 | — | Acceso al panel de administración | — | (1) Conforme | Confirmado en `Perfil.jsx`: `isAdmin` gate correcto |
| MF-019 | IF-008, IF-009 | Crear servicios | TC-009–TC-012 | (1) Conforme (parcial: TC-010/TC-012 no ejecutados) | — |
| MF-020 | IF-010 | Asignación de funcionarios | TC-041 | (10) No verificable | Regla "admin no puede auto-asignarse" no se probó con escritura real en este ciclo |
| MF-021 | IF-011 | Personal del sistema | — | (1) Conforme | Confirmado por lectura de código (`GET /funcionarios/summary`) |
| MF-022 | IF-027 | Asignación de turnos | — | (1) Conforme | Endpoint y protección (`SERVICE_ADMIN_PATHS`) correctos |
| MF-023 | IF-012, IF-013 | Jerarquía de funcionarios | TC-039, TC-040 | (10) No verificable | La regla "subrogante no designa subrogantes" no se pudo probar por escritura real en este ciclo — pendiente |
| MF-024 | IF-014, IF-015 | Crear tipo de turno | TC-015 | **(7) Diferencia de permisos** | El manual dice Admin/Jefatura/Subrogancia; el sistema solo permite ADMINISTRADOR (BUG-003) |
| MF-025 | IF-016–IF-019 | Crear rotativa | TC-014, TC-019 | **(7) Diferencia de permisos** + **(10) no verificable la regla de 24h** | BUG-003; regla de horas máximas no confirmada en código en este ciclo |
| MF-026 | IF-020–IF-023 | Crear planificación mensual | TC-013, TC-016, TC-017, TC-018 | **(7) Diferencia de permisos** (BUG-003) + **(4) Implementada, no documentada** (la función de borrar turnos generados, IF-022, es una mejora de esta sesión que el manual no refleja) | — |
| MF-027 | IF-032 | Evaluar solicitudes | TC-029 | **(7) Diferencia de permisos** | Rol MEDICO habilitado por Spring Security para aprobar/rechazar, el manual no lo contempla (BUG-005) |
| MF-028 | IF-028 | Gestionar puestos | — | (1) Conforme (CRUD); GET sin restricción adicional (menor impacto, PII no involucrada) | — |
| MF-029 | IF-029 | Reglas de horario del servicio | — | (1) Conforme | — |
| MF-030 | IF-046 | Estadística del servicio | T-14 (indirecta) | (7) Diferencia de permisos | Mismo patrón que BUG-004: filtrado por servicio ausente a nivel de API |
| MF-031 | IF-043, IF-044 | Bitácora de cambios | TC-036, TC-037 | **(7) Diferencia de permisos + (6) Error funcional (falta de paginación)** | BUG-007 |
| MF-032 | IF-045 | Auditoría de asistencia | — | (7) Diferencia de permisos (indirecta, mismo patrón que turnos) | — |
| MF-033 | IF-047, IF-048 | Exportar CSV (admin) | — | (10) No verificable | Endpoints confirmados en código; no se ejecutó la descarga real |
| — | IF-017, IF-018 | Duplicar rotativa / Validar rotativa | — | **(4) Implementada, no documentada** | Funcionalidad extra encontrada en código, sin mención en el manual |
| — | IF-033 | `PATCH /solicitudes/{id}/motivo` | — | **(4) Implementada, no documentada** | — |
| — | IF-049 | Feriados (`FeriadoController`) | — | **(4) Implementada, no documentada** | Respalda la regla de feriados de MF-029 pero su origen de datos no está descrito en ningún manual |
| — | Transversal | HTTP 401 vs 403 | T-07, T-09–T-11 | **(6) Error funcional** | BUG-001 |
| — | Transversal | Ruta inexistente → 500 en vez de 404 | T-22b | **(6) Error funcional (menor)** | BUG-008 |

---

## Resumen de categorías de conformidad

| Categoría | Cantidad de MF/IF afectados |
|---|---|
| (1) Conforme | 12 |
| (4) Implementada, no documentada | 4 |
| (6) Error funcional | 3 |
| (7) Diferencia de permisos | 8 |
| (10) No verificable en este entorno | 8 |
| (3) No implementada | 0 (no se encontró ninguna funcionalidad documentada que esté completamente ausente del código) |
| (5) Documentada pero no implementada | 0 (coincide con lo anterior) |
| (2) Parcialmente conforme | incluido dentro de (7) donde aplica doble clasificación |
| (8) Diferencia visual | 0 confirmadas (todo lo visual cae en "no verificable" por falta de navegador, no en "diferente" — no se puede afirmar diferencia sin evidencia visual) |
| (9) Diferencia de datos | 0 detectadas |

**Nota metodológica:** ninguna funcionalidad documentada resultó "no implementada" — el manual y el código están alineados en cuanto a *qué* funciones existen; las discrepancias encontradas son todas de *quién puede usarlas* (permisos) o de *cómo se comporta un caso límite* (errores funcionales menores), no de ausencia de funcionalidad.
