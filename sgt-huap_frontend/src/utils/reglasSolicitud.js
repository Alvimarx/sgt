// reglasSolicitud.js
// Reglas de solicitudes y ofertas generales que comparten varias vistas
// (Solicitudes, Centro de operaciones y el asistente «Nueva solicitud»), para
// que el móvil y el desktop no puedan decidir distinto. Trabajan sobre las
// entidades tal como las entrega el backend (GET /solicitudes y
// /ofertas-generales): el turno trae su funcionario como { idFuncionario }.

import { yaEmpezo } from './reglasTurno';

const mismoId = (a, b) => a != null && b != null && String(a) === String(b);

/**
 * Prefijo del motivo con que el backend cierra solo una solicitud u oferta pendiente cuyo turno ya
 * empezó (decisión del 23 oct 2026: «Venció: el turno ya comenzó»). Quedan RECHAZADAS; así se
 * reconocen como vencidas y no como un rechazo de la jefatura.
 */
export const PREFIJO_MOTIVO_VENCIDA = 'Venció:';

const turnoEmpezado = (turno, ahora) => Boolean(turno?.diaInicioTurno && turno?.horaInicio) && yaEmpezo(turno, ahora);

/**
 * ¿La solicitud venció? Ya la cerró el backend (RECHAZADA con el motivo de vencimiento) o sigue
 * PENDIENTE pero su turno, o el que entrega en un intercambio, ya empezó: la pantalla estuvo abierta
 * mientras el turno empezaba y el backend la cerrará en cuanto se recargue. Una vencida se muestra
 * como cerrada y sin acciones. `ahora` en la hora del hospital (por defecto, la de ahora).
 */
export function esSolicitudVencida(solicitud, ahora) {
  if (!solicitud) return false;
  if (solicitud.estado === 'RECHAZADA') return String(solicitud.motivo || '').startsWith(PREFIJO_MOTIVO_VENCIDA);
  return solicitud.estado === 'PENDIENTE'
    && (turnoEmpezado(solicitud.turno, ahora) || turnoEmpezado(solicitud.turnoReceptor, ahora));
}

/** Pendiente y todavía vigente: lo que cuenta como «pendiente» en las listas y los contadores. */
export const solicitudPendienteVigente = (solicitud, ahora) =>
  solicitud?.estado === 'PENDIENTE' && !esSolicitudVencida(solicitud, ahora);

/**
 * ¿La oferta general venció? Ya la cerró el backend (RECHAZADA con el motivo de vencimiento) o sigue
 * pendiente de apertura o abierta pero su turno ya empezó.
 */
export function esOfertaVencida(oferta, ahora) {
  if (!oferta) return false;
  if (oferta.estado === 'RECHAZADA') return String(oferta.motivo || '').startsWith(PREFIJO_MOTIVO_VENCIDA);
  return (oferta.estado === 'PENDIENTE_APROBACION' || oferta.estado === 'ABIERTA')
    && turnoEmpezado(oferta.turno, ahora);
}

/**
 * Ids (como texto) de los turnos que `userId` tiene comprometidos en sus propias
 * solicitudes pendientes, los que pide y los que entrega (R15). Mismo criterio
 * que el backend usa para /turnos/intercambiables y al crear una solicitud.
 */
export function turnosComprometidos(solicitudes = [], userId) {
  const ids = new Set();
  (solicitudes || []).forEach((s) => {
    if (s?.estado !== 'PENDIENTE' || !mismoId(s?.funcionario?.idFuncionario, userId)) return;
    [s.turno?.idTurno, s.turnoReceptor?.idTurno].forEach((id) => { if (id != null) ids.add(String(id)); });
  });
  return ids;
}

/**
 * ¿`userId` participa en la solicitud? Es el emisor, el receptor o el dueño
 * actual de alguno de sus turnos. Quien participa no puede aprobarla ni
 * rechazarla (segregación de funciones; SolicitudService.participantesDirectos).
 */
export function participaEnSolicitud(solicitud, userId) {
  if (userId == null || !solicitud) return false;
  return [
    solicitud.funcionario?.idFuncionario,
    solicitud.funcionarioReceptor?.idFuncionario,
    solicitud.turno?.funcionario?.idFuncionario,
    solicitud.turnoReceptor?.funcionario?.idFuncionario,
  ].some((id) => mismoId(id, userId));
}

/**
 * ¿`userId` participa en la oferta general? La publicó, es el dueño actual de
 * su turno o postuló a ella. Quien participa no la abre, no la rechaza ni elige
 * al postulante: la misma segregación de funciones que las solicitudes (H-07).
 * Hoy la aplica solo la interfaz: OfertaGeneralService.aprobarOferta y
 * seleccionarPostulante no la exigen (§5.1).
 */
export function participaEnOferta(oferta, userId) {
  if (userId == null || !oferta) return false;
  return mismoId(oferta.ofertor?.idFuncionario, userId)
    || mismoId(oferta.turno?.funcionario?.idFuncionario, userId)
    || (oferta.postulaciones || []).some((p) => mismoId(p.postulante?.idFuncionario, userId));
}

/**
 * Cobertura pendiente sobre un turno que ya tiene dueño: quedó obsoleta (el
 * backend rechazaría aprobarla) y se muestra sin acciones, como «Turno ya
 * cubierto».
 */
export const esCoberturaDeTurnoCubierto = (solicitud) =>
  solicitud?.tipoSolicitud?.tipo === 3
  && solicitud?.estado === 'PENDIENTE'
  && solicitud?.turno?.funcionario?.idFuncionario != null;

/**
 * Oferta general cuyo turno todavía no termina (`hoy`: 'YYYY-MM-DD' del
 * hospital). Se usa la fecha de término: un nocturno sigue vigente su segundo día.
 */
export const ofertaVigente = (oferta, hoy) =>
  String(oferta?.turno?.diaFinalTurno || oferta?.turno?.diaInicioTurno || '9999-12-31') >= hoy;

/**
 * Etiqueta y tono del badge del estado de una oferta general, los mismos en
 * Solicitudes y en el Centro de operaciones. RETIRADA: la retiró quien la
 * publicó, antes de que alguien postulara (C-16).
 */
export const ESTADO_OFERTA = {
  PENDIENTE_APROBACION: { etiqueta: 'Pend. apertura', tono: 'warn' },
  ABIERTA:              { etiqueta: 'Abierta',        tono: 'success' },
  CERRADA:              { etiqueta: 'Cerrada',        tono: 'neutral' },
  RECHAZADA:            { etiqueta: 'Rechazada',      tono: 'accent' },
  RETIRADA:             { etiqueta: 'Retirada',       tono: 'neutral' },
};

/**
 * ¿`userId` puede retirar la oferta? Solo quien la publicó, mientras esté
 * pendiente de apertura o abierta y no tenga ninguna postulación: PUT
 * /ofertas-generales/{id}/retirar (C-16, 17 oct 2026; el 20 oct pasó de
 * «mientras nadie la abra» a «hasta que alguien postule»). Con una postulación,
 * o cerrada, rechazada o ya retirada, no se ofrece. El backend revisa lo mismo
 * y responde 409.
 */
export const puedeRetirarOferta = (oferta, userId) =>
  (oferta?.estado === 'PENDIENTE_APROBACION' || oferta?.estado === 'ABIERTA')
  && (oferta?.postulaciones || []).length === 0
  && mismoId(oferta?.ofertor?.idFuncionario, userId);

/**
 * ¿Se muestra la oferta? (R17 y C-16, el mismo filtro en el Centro y en
 * Solicitudes):
 *  - nunca las de turnos que ya terminaron, las rechazadas (también las vencidas:
 *    el turno ya empezó, 23 oct) ni las retiradas por quien las publicó;
 *  - la gestión (y quien la publicó) ve las abiertas, las que esperan apertura
 *    y las cerradas con un postulante elegido;
 *  - el resto ve solo las abiertas, que son a las que puede postular.
 */
export function ofertaVisible(oferta, { hoy, puedeDecidir = false, userId = null } = {}) {
  if (!oferta || !ofertaVigente(oferta, hoy) || esOfertaVencida(oferta)) return false;
  const estado = oferta.estado;
  if (estado === 'RECHAZADA' || estado === 'RETIRADA') return false;
  if (estado === 'ABIERTA') return true;
  const propia = mismoId(oferta.ofertor?.idFuncionario, userId);
  if (!puedeDecidir && !propia) return false;
  if (estado === 'PENDIENTE_APROBACION') return true;
  return estado === 'CERRADA' && (oferta.postulaciones || []).some((p) => p.seleccionado);
}
