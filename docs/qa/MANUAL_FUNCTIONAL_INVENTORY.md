# Inventario funcional documentado en los manuales — SGT HUAP

Fuente: `MANUAL_DE_USUARIO.pdf` (37 págs.) y `MANUAL_DE_ADMINISTRACION.pdf` (101 págs.), ambos fechados como desarrollados durante PINGESO, primer semestre 2026.

| ID | Manual | Pág. | Módulo | Funcionalidad | Rol | Precondiciones | Resultado esperado |
|---|---|---:|---|---|---|---|---|
| MF-001 | Usuario | 2 | Ingreso al sistema | Login con RUT + contraseña | Cualquiera registrado | Estar registrado por un admin/jefatura/subrogante | Acceso autorizado; si no está registrado, popup pidiendo registro |
| MF-002 | Usuario | 4 | Selección de servicio | Elegir con qué servicio ingresar | Cualquiera con servicio(s) asignado(s) | Login exitoso + tener servicios asignados | Se listan los servicios; se puede volver a login |
| MF-003 | Usuario | 5 | Dashboard | Acceso vía Perfil → "Mi Dashboard" | Cualquiera | Login + servicio | Se abre resumen de turnos/horas |
| MF-004 | Usuario | 8 | Dashboard | Navegación por mes y por semana (S1–S5) | Cualquiera | — | Turnos, horas trabajadas, días sin/con turno, carga horaria mensual |
| MF-005 | Usuario | 8 | Filtrado de turnos | Filtros "Todos / Mis turnos / Pendientes / Libres" | Cualquiera | — | Lista de turnos filtrada por categoría, con contador |
| MF-006 | Usuario | 10 | Filtrado de turnos | Abrir detalle de un turno desde la lista | Cualquiera | — | Detalle con funcionarios asignados |
| MF-007 | Usuario | 13 | Solicitudes — Permiso | Crear solicitud de permiso (fecha inicio/fin, motivo opcional) | Cualquiera | — | Solicitud creada, pendiente |
| MF-008 | Usuario | 15 | Solicitudes — Botar turno | Liberar un turno propio ya asignado | Cualquiera con turno propio | Tener turno asignado | Solicitud creada |
| MF-009 | Usuario | 16 | Solicitudes — Cobertura | Ofrecerse a cubrir un turno vacante | Cualquiera | Debe existir turno libre | Solicitud creada |
| MF-010 | Usuario | 18 | Solicitudes — Intercambio | Intercambiar turno propio por turno de otro funcionario | Cualquiera con turno propio | El turno destino debe estar asignado a otro | Solicitud creada |
| MF-011 | Usuario | 20 | Solicitudes — Oferta particular | Ceder turno propio a un funcionario específico | Cualquiera con turno propio | — | Solicitud creada |
| MF-012 | Usuario | 22 | Solicitudes — Oferta general | Ofrecer turno propio a todo el servicio | Cualquiera con turno propio | — | Solicitud creada, visible para todo el servicio |
| MF-013 | Usuario | 24 | Exportar CSV | Descargar turnos del mes en CSV (columnas detalladas: ID turno, tipo, fechas, horas, RUT, funcionario, profesión, servicio, puesto, origen/trazabilidad) | Cualquiera | — | Archivo descargado con datos vigentes al momento |
| MF-014 | Usuario | 29 | Notificaciones | Ver bandeja de notificaciones, separadas por leídas/recibidas | Cualquiera | — | Lista de notificaciones |
| MF-015 | Usuario | 31 | Detalle de turno | Ver info del turno + solicitar cambios/turno si aplica | Cualquiera | — | Panel de detalle con acciones contextuales |
| MF-016 | Usuario | 32 | Calendario | Ver calendario mensual con puntos (mi turno/cupo libre/turno del servicio) | Cualquiera | — | Al tocar un día con punto, se despliega resumen de cobertura del día |
| MF-017 | Usuario | 35 | Filtro de solicitudes | Ordenar por más reciente/más antigua/agrupar por tipo | Cualquiera | — | Lista reordenada/agrupada |
| MF-018 | Admin | 3 | Panel de administración | Acceso vía Perfil → "Panel de Administración" | Cuenta de administración | Cuenta admin + servicio asignado | Menú con 16 módulos |
| MF-019 | Admin | 6–16 | Crear servicios | Agregar / Editar / Inhabilitar un servicio | Administrador | — | CRUD de servicios; inhabilitar es soft-delete (conserva historial/bitácora) |
| MF-020 | Admin | 17–21 | Asignación de funcionarios | Asociar un funcionario (buscado por nombre/RUT) a un servicio | Administrador | Funcionario y servicio activos | Asignación guardada; **el admin no puede auto-asignarse** |
| MF-021 | Admin | 22–24 | Personal del sistema | Panel global de personal con búsqueda y filtro por servicio | Administrador | — | Lista paginada de funcionarios con sus servicios/roles |
| MF-022 | Admin | 25–33 | Asignación de turnos | Ver vacantes en calendario mensual, asignar un funcionario a un cupo libre con observación opcional | Admin / Jefatura / Subrogante | Deben existir tipos de turno; turno debe tener cupos | Confirmación con detalle "¿Deseas asignar a X al turno Y?" |
| MF-023 | Admin | 33–41 | Jerarquía de funcionarios | Designar Jefatura o Subrogante de un servicio | Administrador (cualquier servicio) / Jefatura (solo subrogantes de su propio servicio) | — | Jerarquía designada; **un subrogante no puede designar nuevos subrogantes** |
| MF-024 | Admin | 42–49 | Crear tipo de turno | Agregar / Editar / Inhabilitar tipo de turno (nombre + hora inicio/fin) | Admin/Jefatura/Subrogancia | — | CRUD de tipos de turno; inhabilitar exige que no esté asignado a ninguna rotativa |
| MF-025 | Admin | 49–55 | Crear rotativa | Definir secuencia de turnos por semana(s) mediante "pincel" por día | Admin/Jefatura/Subrogante | Deben existir tipos de turno | Rotativa guardada; **máximo 24 h asignables por semana** |
| MF-026 | Admin | 55–66 | Crear planificación mensual | Armar molde (rotativa + puesto + funcionario), guardarlo, elegir lunes de inicio y generar los turnos reales | Admin/Jefatura | Tipos de turno, rotativas, puestos y funcionarios ya creados | Turnos generados; conflictos de horario → turno vacante (no bloquea); reglas de fin de semana/feriado opcionales |
| MF-027 | Admin | 66–67 | Evaluar solicitudes | Aprobar/Rechazar solicitudes pendientes | Admin/Jefatura/Subrogante | Debe haber solicitudes; en intercambios, el receptor debe aceptar antes | Estado actualizado |
| MF-028 | Admin | 67–77 | Gestionar puestos | Agregar / Editar / Inhabilitar puestos del servicio | Admin/Jefatura/Subrogancia | — | CRUD; inhabilitar un puesto con turnos asociados lo oculta de la gestión pero conserva el histórico |
| MF-029 | Admin | 77–82 | Reglas de horario del servicio | Ajuste automático de horas de entrada/salida en fin de semana y/o feriado, por tipo de turno | Admin/Jefatura/Subrogante | Deben existir tipos de turno | Regla creada/editada/eliminada; desplazamiento máximo ±5 h |
| MF-030 | Admin | 82–87 | Estadística del servicio | Cobertura de turnos y funcionarios con turno, por mes o semana, con detalle filtrable (tipo, puesto, fecha, rotativa) | Admin/Jefatura/Subrogante | — | Porcentajes y listados de cobertura |
| MF-031 | Admin | 87–93 | Bitácora de cambios | Historial cronológico de solicitudes y turnos, filtrable por categoría/tipo/estado/encargado | Admin/Jefatura/Subrogante | — | Registro con detalle expandible por evento |
| MF-032 | Admin | 93–97 | Auditoría de asistencia | Turnos totales/asignados/vacantes por mes, con el encargado de cada asignación | Admin/Jefatura/Subrogante | — | Listado por turno con funcionario o "VACANTE" |
| MF-033 | Admin | 97–100 | Exportar CSV (admin) | Igual que MF-013 pero con alcance "Solo mis turnos" o "Todo el servicio" | Admin/Jefatura/Subrogante | — | Archivo CSV descargado |

**Total de funcionalidades documentadas: 33** (17 en el manual de usuario, 16 en el de administración — el manual de administración no numera "Exportar CSV" como módulo aparte en su índice de 16 puntos porque la UI la embebe dentro de "Calendario", pero sí la describe como sección 16 con su propio detalle; se cuenta aquí como ítem propio por tener contenido y permisos distintos del CSV de usuario).
