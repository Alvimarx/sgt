// Menú lateral del modo desktop (R18): qué ve cada rol y qué ítem queda
// marcado según la vista abierta. La navegación sigue siendo la máquina de
// vistas de Prop4 (currentView); este archivo solo describe el menú.
//
// Los permisos replican lo que hoy cablean los paneles móviles (Perfil →
// Administración / Centro de gestión / Subrogancia): el menú no habilita
// nada que el móvil no ofrezca.

const esAdminSistema = (user) => ['ADMIN', 'ADMINISTRADOR'].includes(String(user?.rolSistema || '').toUpperCase());

export const permisosDe = (user) => {
  const admin = esAdminSistema(user);
  const jefatura = user?.rol === 'JEFATURA';
  const subrogante = user?.rol === 'SUBROGANTE';
  return { admin, jefatura, subrogante, gestion: admin || jefatura || subrogante };
};

// Panel móvil que corresponde al rol: destino del "volver" de las vistas de
// gestión cuando se entra desde el menú lateral.
export const panelDeGestion = (user) => {
  const p = permisosDe(user);
  if (p.jefatura) return 'jefatura';
  if (p.subrogante) return 'subrogante';
  if (p.admin) return 'admin';
  return 'agenda';
};

// `permiso`: sin permiso = todos; 'gestion' = jefatura, subrogante o admin;
// 'jefatura' = solo jefatura; 'admin' = administrador de sistema.
export const ITEMS_DESKTOP = [
  { id: 'inicio', grupo: 'Turnos', etiqueta: 'Centro de turnos', icono: 'home' },
  { id: 'calendario', grupo: 'Turnos', etiqueta: 'Calendario', icono: 'calendar' },
  { id: 'solicitudes', grupo: 'Turnos', etiqueta: 'Solicitudes', icono: 'swap', badge: 'solicitudes' },
  { id: 'notificaciones', grupo: 'Turnos', etiqueta: 'Notificaciones', icono: 'bell', badge: 'notificaciones' },

  { id: 'asignacion_turnos', grupo: 'Gestión del servicio', etiqueta: 'Asignación de turnos', icono: 'users', permiso: 'gestion' },
  { id: 'personal_servicio', grupo: 'Gestión del servicio', etiqueta: 'Personal del servicio', icono: 'stethoscope', permiso: 'jefatura' },
  { id: 'asignacion_funcionarios', grupo: 'Gestión del servicio', etiqueta: 'Asignación de funcionarios', icono: 'user-plus', permiso: 'jefatura' },
  { id: 'jerarquia_servicio', grupo: 'Gestión del servicio', etiqueta: 'Jerarquía del servicio', icono: 'org-chart', permiso: 'jefatura' },
  { id: 'puestos', grupo: 'Gestión del servicio', etiqueta: 'Puestos', icono: 'tray', permiso: 'gestion' },
  { id: 'estadisticas', grupo: 'Gestión del servicio', etiqueta: 'Estadísticas', icono: 'sliders', permiso: 'gestion' },
  { id: 'bitacora', grupo: 'Gestión del servicio', etiqueta: 'Bitácora', icono: 'history', permiso: 'gestion' },
  { id: 'auditoria', grupo: 'Gestión del servicio', etiqueta: 'Auditoría de asistencia', icono: 'shield-search', permiso: 'gestion' },

  { id: 'servicios', grupo: 'Administración', etiqueta: 'Servicios', icono: 'building', permiso: 'admin' },
  { id: 'personal_sistema', grupo: 'Administración', etiqueta: 'Personal del sistema', icono: 'user-gear', permiso: 'admin' },
  { id: 'asignacion_servicios', grupo: 'Administración', etiqueta: 'Asignación a servicios', icono: 'shield-check', permiso: 'admin' },
  { id: 'jerarquia_sistema', grupo: 'Administración', etiqueta: 'Jerarquía de funcionarios', icono: 'crown', permiso: 'admin' },
  { id: 'tipos_turno', grupo: 'Administración', etiqueta: 'Tipos de turno', icono: 'clock', permiso: 'admin' },
  { id: 'rotativas', grupo: 'Administración', etiqueta: 'Rotativas', icono: 'rotate', permiso: 'admin' },
  { id: 'planificacion', grupo: 'Administración', etiqueta: 'Planificación', icono: 'briefcase', permiso: 'admin' },
  { id: 'reglas', grupo: 'Administración', etiqueta: 'Reglas de horario', icono: 'filter', permiso: 'admin' },

  { id: 'mi_dashboard', grupo: 'Mi cuenta', etiqueta: 'Mi dashboard', icono: 'check-circle' },
  { id: 'perfil', grupo: 'Mi cuenta', etiqueta: 'Perfil', icono: 'user' },
];

export const itemsParaUsuario = (user) => {
  const p = permisosDe(user);
  return ITEMS_DESKTOP.filter((it) => !it.permiso || p[it.permiso]);
};

// currentView → ítem del menú. Los paneles de gestión (admin, jefatura,
// subrogante) no tienen ítem: se llega a ellos desde Perfil.
const VISTA_A_ITEM = {
  agenda: 'inicio',
  solicitudes: 'solicitudes',
  notifications: 'notificaciones',
  personal_dashboard: 'mi_dashboard',
  perfil: 'perfil',
  funcionarios_servicio_jefatura: 'personal_servicio',
  asignacionJefatura: 'asignacion_funcionarios',
  jerarquiaJefatura: 'jerarquia_servicio',
  puestos: 'puestos',
  admin_stats: 'estadisticas',
  bitacora: 'bitacora',
  auditoria: 'auditoria',
  servicios: 'servicios',
  funcionarios_sistema: 'personal_sistema',
  asignacion: 'asignacion_servicios',
  jerarquia: 'jerarquia_sistema',
  tipos_turno: 'tipos_turno',
  plantillas: 'rotativas',
  planificacion: 'planificacion',
  reglas: 'reglas',
};

export const itemActivo = (view, calendarReturn) => {
  if (view === 'calendar_view') {
    return ['admin', 'jefatura', 'subrogante'].includes(calendarReturn) ? 'asignacion_turnos' : 'calendario';
  }
  return VISTA_A_ITEM[view] || null;
};
