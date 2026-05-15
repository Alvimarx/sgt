// data.js

export const SGT_PALETTE = {
  // Colores de equipos
  equipoA: { bg: 'oklch(0.94 0.04 250)', ink: 'oklch(0.35 0.08 250)', soft: 'oklch(0.97 0.02 250)' },
  equipoB: { bg: 'oklch(0.94 0.04 150)', ink: 'oklch(0.35 0.08 150)', soft: 'oklch(0.97 0.02 150)' },
  equipoC: { bg: 'oklch(0.94 0.04 30)',  ink: 'oklch(0.4 0.09 30)',   soft: 'oklch(0.97 0.02 30)' },
  equipoD: { bg: 'oklch(0.94 0.04 85)',  ink: 'oklch(0.38 0.08 85)',  soft: 'oklch(0.97 0.02 85)' },
  
  // Referencias a variables CSS para que UIPrimitives no falle
  primary: 'var(--primary)',
  primarySoft: 'var(--primary-soft)',
  accent: 'var(--accent)',
  accentSoft: 'var(--accent-soft)',
  warn: 'var(--warn)',
  warnSoft: 'var(--warn-soft)',
  success: 'var(--success)',
  successSoft: 'var(--success-soft)',
  ink: 'var(--ink)',
  ink2: 'var(--ink2)',
  ink3: 'var(--ink3)',
  line: 'var(--line)',
  line2: 'var(--line2)',
  surface: 'var(--surface)',
  surface2: 'var(--surface2)'
};

const PEOPLE = {
  me:    { id: 'me', nombre: 'Jorge Muñoz',     rol: 'MEDICO',        iniciales: 'JM', esYo: true },
  j1:    { id: 'j1', nombre: 'Carmen Valdés',   rol: 'JEFATURA',      iniciales: 'CV' },
  j2:    { id: 'j2', nombre: 'Rodrigo Pérez',   rol: 'JEFATURA',      iniciales: 'RP' },
  j3:    { id: 'j3', nombre: 'Patricia Soto',   rol: 'JEFATURA',      iniciales: 'PS' },
  u1:    { id: 'u1', nombre: 'Andrés Fuentes',  rol: 'URGENCIOLOGO',  iniciales: 'AF' },
  u2:    { id: 'u2', nombre: 'Lucía Herrera',   rol: 'URGENCIOLOGO',  iniciales: 'LH' },
  u3:    { id: 'u3', nombre: 'Felipe Tapia',    rol: 'URGENCIOLOGO',  iniciales: 'FT' },
  u4:    { id: 'u4', nombre: 'María Jara',      rol: 'URGENCIOLOGO',  iniciales: 'MJ' },
  u5:    { id: 'u5', nombre: 'Diego Ríos',      rol: 'URGENCIOLOGO',  iniciales: 'DR' },
  u6:    { id: 'u6', nombre: 'Sofía Cárcamo',   rol: 'URGENCIOLOGO',  iniciales: 'SC' },
  u7:    { id: 'u7', nombre: 'Cristián León',   rol: 'URGENCIOLOGO',  iniciales: 'CL' },
  u8:    { id: 'u8', nombre: 'Valeria Pinto',   rol: 'URGENCIOLOGO',  iniciales: 'VP' },
  m1:    { id: 'm1', nombre: 'Tomás Gómez',     rol: 'MEDICO',        iniciales: 'TG' },
  m2:    { id: 'm2', nombre: 'Ana Reyes',       rol: 'MEDICO',        iniciales: 'AR' },
  m3:    { id: 'm3', nombre: 'Javier Urzúa',    rol: 'MEDICO',        iniciales: 'JU' },
  m4:    { id: 'm4', nombre: 'Paula Vergara',   rol: 'MEDICO',        iniciales: 'PV' },
  m5:    { id: 'm5', nombre: 'Nicolás Arce',    rol: 'MEDICO',        iniciales: 'NA' },
  m6:    { id: 'm6', nombre: 'Camila Bravo',    rol: 'MEDICO',        iniciales: 'CB' },
  m7:    { id: 'm7', nombre: 'Ignacio Molina',  rol: 'MEDICO',        iniciales: 'IM' },
};

export const TEAMS = {
  A: { key: 'A', ...SGT_PALETTE.equipoA, nombre: 'Equipo Turno A' },
  B: { key: 'B', ...SGT_PALETTE.equipoB, nombre: 'Equipo Turno B' },
  C: { key: 'C', ...SGT_PALETTE.equipoC, nombre: 'Equipo Turno C' },
  D: { key: 'D', ...SGT_PALETTE.equipoD, nombre: 'Equipo Turno D' },
};

function team(jefe, urgs, meds) {
  return { jefe, urgenciologos: urgs, medicos: meds, total: 1 + urgs.length + meds.length };
}

const SHIFTS_BY_DAY = {
  // Lun 16
  '2026-11-16': [
    { id: 's1', tipo: 'dia', inicio: '08:00', fin: '20:00', horas: 12, equipo: 'A', team: team(PEOPLE.j1, [PEOPLE.u1, PEOPLE.u2, PEOPLE.u3, PEOPLE.u4], [PEOPLE.m1, PEOPLE.m2, PEOPLE.m3, PEOPLE.m4]), miTurno: false },
    { id: 's2', tipo: 'noche', inicio: '20:00', fin: '08:00', horas: 12, equipo: 'B', team: team(PEOPLE.j2, [PEOPLE.u5, PEOPLE.u6, PEOPLE.u7, PEOPLE.u8], [PEOPLE.m5, PEOPLE.m6, PEOPLE.m7, PEOPLE.me]), miTurno: true, cruzaMedianoche: true },
  ],
  // Mar 17 — libre para mí
  '2026-11-17': [
    { id: 's3', tipo: 'dia', inicio: '08:00', fin: '20:00', horas: 12, equipo: 'C', team: team(PEOPLE.j3, [PEOPLE.u1, PEOPLE.u5, PEOPLE.u3, PEOPLE.u7], [PEOPLE.m1, PEOPLE.m5, PEOPLE.m3, PEOPLE.m7]), miTurno: false },
    { id: 's4', tipo: 'noche', inicio: '20:00', fin: '08:00', horas: 12, equipo: 'D', team: team(PEOPLE.j1, [PEOPLE.u2, PEOPLE.u4, PEOPLE.u6, PEOPLE.u8], [PEOPLE.m2, PEOPLE.m4, PEOPLE.m6]), miTurno: false, turnoLibre: true, motivoLibre: 'Vacaciones Dr. Arce' },
  ],
  // Mié 18
  '2026-11-18': [
    { id: 's5', tipo: 'dia', inicio: '08:00', fin: '20:00', horas: 12, equipo: 'A', team: team(PEOPLE.j1, [PEOPLE.u1, PEOPLE.u2, PEOPLE.u3, PEOPLE.u4], [PEOPLE.m1, PEOPLE.m2, PEOPLE.m3, PEOPLE.me]), miTurno: true, cambioAprobado: true, cambioAprobadoCon: 'Dra. Jara' },
    { id: 's6', tipo: 'noche', inicio: '20:00', fin: '08:00', horas: 12, equipo: 'B', team: team(PEOPLE.j2, [PEOPLE.u5, PEOPLE.u6, PEOPLE.u7, PEOPLE.u8], [PEOPLE.m5, PEOPLE.m6, PEOPLE.m7, PEOPLE.m4]), miTurno: false },
  ],
  // Jue 19 — HOY, turno día
  '2026-11-19': [
    { id: 's7', tipo: 'dia', inicio: '08:00', fin: '20:00', horas: 12, equipo: 'C', team: team(PEOPLE.j3, [PEOPLE.u1, PEOPLE.u5, PEOPLE.u3, PEOPLE.u7], [PEOPLE.m1, PEOPLE.m5, PEOPLE.m3, PEOPLE.me]), miTurno: true, esHoy: true },
    { id: 's8', tipo: 'noche', inicio: '20:00', fin: '08:00', horas: 12, equipo: 'D', team: team(PEOPLE.j1, [PEOPLE.u2, PEOPLE.u4, PEOPLE.u6, PEOPLE.u8], [PEOPLE.m2, PEOPLE.m4, PEOPLE.m6, PEOPLE.m7]), miTurno: false },
  ],
  // Vie 20 — solicitud pendiente (yo pedí cambio con Dra. Reyes)
  '2026-11-20': [
    { id: 's9', tipo: 'dia', inicio: '08:00', fin: '20:00', horas: 12, equipo: 'A', team: team(PEOPLE.j1, [PEOPLE.u1, PEOPLE.u2, PEOPLE.u3, PEOPLE.u4], [PEOPLE.me, PEOPLE.m2, PEOPLE.m3, PEOPLE.m4]), miTurno: true, solicitudPendiente: true, solicitudTipo: 'cambio', solicitudCon: 'Dra. Reyes' },
    { id: 's10', tipo: 'noche', inicio: '20:00', fin: '08:00', horas: 12, equipo: 'B', team: team(PEOPLE.j2, [PEOPLE.u5, PEOPLE.u6, PEOPLE.u7, PEOPLE.u8], [PEOPLE.m5, PEOPLE.m6, PEOPLE.m7, PEOPLE.m1]), miTurno: false },
  ],
  // Sáb 21 — libre personal, pero hay un turno libre disponible
  '2026-11-21': [
    { id: 's11', tipo: 'dia', inicio: '08:00', fin: '20:00', horas: 12, equipo: 'C', team: team(PEOPLE.j3, [PEOPLE.u1, PEOPLE.u5, PEOPLE.u3, PEOPLE.u7], [PEOPLE.m1, PEOPLE.m5, PEOPLE.m3]), miTurno: false, turnoLibre: true, motivoLibre: 'Permiso Dr. Urzúa', cuposLibres: 1 },
    { id: 's12', tipo: 'noche', inicio: '20:00', fin: '08:00', horas: 12, equipo: 'D', team: team(PEOPLE.j1, [PEOPLE.u2, PEOPLE.u4, PEOPLE.u6, PEOPLE.u8], [PEOPLE.m2, PEOPLE.m4, PEOPLE.m6, PEOPLE.m7]), miTurno: false },
  ],
  // Dom 22
  '2026-11-22': [
    { id: 's13', tipo: 'dia', inicio: '08:00', fin: '20:00', horas: 12, equipo: 'A', team: team(PEOPLE.j1, [PEOPLE.u1, PEOPLE.u2, PEOPLE.u3, PEOPLE.u4], [PEOPLE.m1, PEOPLE.m2, PEOPLE.m3, PEOPLE.me]), miTurno: true },
    { id: 's14', tipo: 'noche', inicio: '20:00', fin: '08:00', horas: 12, equipo: 'B', team: team(PEOPLE.j2, [PEOPLE.u5, PEOPLE.u6, PEOPLE.u7, PEOPLE.u8], [PEOPLE.m5, PEOPLE.m6, PEOPLE.m7, PEOPLE.m4]), miTurno: false },
  ],
};

export const WEEK_DAYS = [
  { key: '2026-11-16', dia: 'Lun', num: 16 },
  { key: '2026-11-17', dia: 'Mar', num: 17 },
  { key: '2026-11-18', dia: 'Mié', num: 18 },
  { key: '2026-11-19', dia: 'Jue', num: 19, hoy: true },
  { key: '2026-11-20', dia: 'Vie', num: 20 },
  { key: '2026-11-21', dia: 'Sáb', num: 21, findesemana: true },
  { key: '2026-11-22', dia: 'Dom', num: 22, findesemana: true },
];

// Resumen de horas mes
const HOURS_SUMMARY = {
  mes: 'Noviembre 2026',
  acumuladas: 108,
  programadas: 180,
  objetivo: 180,
  turnosCompletados: 9,
  turnosProgramados: 15,
};

// Notificaciones / pendientes
const PENDIENTES = [
  { id: 'n1', tipo: 'cambio_pendiente', titulo: 'Cambio pendiente con Dra. Reyes', sub: 'Vie 20 nov • Esperando su respuesta', urgencia: 'media' },
  { id: 'n2', tipo: 'turno_libre', titulo: 'Turno libre disponible', sub: 'Sáb 21 nov • Día 08:00–20:00 • 1 cupo', urgencia: 'baja' },
  { id: 'n3', tipo: 'cambio_aprobado', titulo: 'Cambio aprobado', sub: 'Mié 18 nov • con Dra. Jara', urgencia: 'info' },
];

// AQUÍ ESTABA EL ERROR: Ahora sí le pasamos las constantes reales en lugar de objetos vacíos
export const SGT_DATA = {
  PALETTE: SGT_PALETTE,
  PEOPLE: PEOPLE,
  TEAMS: TEAMS,
  SHIFTS_BY_DAY: SHIFTS_BY_DAY,
  WEEK_DAYS: WEEK_DAYS,
  TODAY_KEY: '2026-11-19',
  HOURS_SUMMARY: {},
  PENDIENTES: PENDIENTES,
};