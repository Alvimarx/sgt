// Utilidades de presentación del modo desktop (R18) para PLANIFICACIÓN Y
// ROTATIVAS: fechas en español de Chile, iniciales, colores por puesto y el
// tono (día / noche) de cada tipo de turno. Sin JSX: los componentes están en
// piezas.jsx.

// ── Fechas y textos ──────────────────────────────────────────────────────────
export const DIAS_CORTOS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
export const DIAS_LARGOS = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];
export const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
export const MESES_LARGOS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

const aFecha = (iso) => {
  const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
};

// "2026-10-12" → "12 oct 2026"
export const fechaCorta = (iso) => {
  const d = aFecha(iso);
  return d ? `${d.getDate()} ${MESES_CORTOS[d.getMonth()]} ${d.getFullYear()}` : (iso || '—');
};

// "2026-10-16T20:10:32" → "16 oct 2026 · 20:10"
export const fechaHora = (texto) => {
  const s = String(texto || '');
  if (!aFecha(s)) return s || '—';
  const hora = s.slice(11, 16);
  return `${fechaCorta(s.slice(0, 10))}${hora ? ` · ${hora}` : ''}`;
};

export const mayusculaInicial = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

export const normalizar = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

export const inicialesDeNombre = (nombre) => {
  const p = String(nombre || '').trim().split(/\s+/).filter(Boolean);
  return ((p[0]?.[0] || '') + (p[1]?.[0] || '')).toUpperCase() || '·';
};

export const formatoNumero = (n) => Number(n || 0).toLocaleString('es-CL');

// Un error guardado tal cual llegó (texto o el cuerpo { error } del backend)
// se muestra como texto: nunca se dibuja un objeto.
export const textoError = (err) => {
  if (!err) return '';
  if (typeof err === 'string') return err;
  return err.error || err.message || 'Ocurrió un error.';
};

// Color del avatar según el puesto (mismo criterio que el Centro de operaciones).
export const claseAvatar = (puesto) => {
  const p = normalizar(puesto);
  if (p.includes('coordina')) return 'sgt-dp-avatar--coord';
  if (p.includes('urgenci')) return 'sgt-dp-avatar--urg';
  return '';
};

// ── Tipos de turno: día (sol, verde) o noche (luna, rosado) ──────────────────
// La guía desktop usa día verde / noche rosado con íconos sol y luna. Un tipo
// es "noche" si empieza entre las 18:00 y las 06:00. Si un servicio tiene más
// de un tipo de día (o de noche), del segundo en adelante se usa el color por
// índice del móvil para que se distingan en la grilla.
const minutosDe = (hora) => {
  if (Array.isArray(hora)) return (Number(hora[0]) || 0) * 60 + (Number(hora[1]) || 0);
  const m = String(hora || '').match(/^(\d{1,2}):(\d{2})/);
  return m ? Number(m[1]) * 60 + Number(m[2]) : 0;
};
const HUES = [250, 150, 30, 85, 320, 200, 45, 170, 110, 300];
export const esNocturno = (tipo) => {
  const ini = minutosDe(tipo?.horaInicio);
  return ini >= 18 * 60 || ini < 6 * 60;
};
export const crearTonoTipo = (tipos) => {
  const lista = Array.isArray(tipos) ? tipos : [];
  const porId = new Map();
  let hayDia = false;
  let hayNoche = false;
  lista.forEach((t, i) => {
    const noche = esNocturno(t);
    let tono;
    if (noche && !hayNoche) { hayNoche = true; tono = { clase: 'noche', icono: 'moon' }; }
    else if (!noche && !hayDia) { hayDia = true; tono = { clase: 'dia', icono: 'sun' }; }
    else {
      const h = HUES[i % HUES.length];
      tono = { clase: 'otro', icono: noche ? 'moon' : 'sun', estilo: { background: `oklch(0.95 0.035 ${h})`, color: `oklch(0.38 0.10 ${h})` } };
    }
    porId.set(String(t.idTipoTurno), tono);
  });
  return (tipoOId) => {
    const id = typeof tipoOId === 'object' && tipoOId ? tipoOId.idTipoTurno : tipoOId;
    const encontrado = porId.get(String(id));
    if (encontrado) return encontrado;
    const t = typeof tipoOId === 'object' ? tipoOId : null;
    return t && esNocturno(t) ? { clase: 'noche', icono: 'moon' } : { clase: 'dia', icono: 'sun' };
  };
};
