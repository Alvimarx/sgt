// reglasTurno.js
// Reglas de un turno que la interfaz necesita conocer antes de pedirle algo al
// backend, escritas con el mismo criterio que el backend
// (ValidadorAsignacionTurnoService): así la agenda y los selectores no ofrecen
// lo que el backend va a rechazar. Las usan el móvil y el desktop por igual.
//
// Aceptan los dos formatos de turno que circulan en la app:
//  - el del backend (/turnos/...): diaInicioTurno, diaFinalTurno, horaInicio y
//    horaFin ('HH:mm:ss');
//  - el ya mapeado de la agenda y el calendario (funcionarioService y
//    turnosService): fecha, fechaFin, inicio y fin ('HH:mm').
// Fechas y horas se comparan como texto 'YYYY-MM-DDTHH:mm', sin zona horaria:
// son las del hospital, igual que en el backend.
import { ahoraISOEnZonaHospital } from './dateUtils';

const hhmm = (hora) => String(hora || '').slice(0, 5);

const idDe = (t) => {
  const id = t?.id ?? t?.idTurno;
  return id == null ? null : String(id);
};

/** Día de inicio ('YYYY-MM-DD'). */
export const fechaInicioDe = (t) => String(t?.diaInicioTurno ?? t?.fecha ?? '').slice(0, 10);

/** Día de término ('YYYY-MM-DD'); un turno sin fecha de término termina el día que empieza. */
export const fechaFinDe = (t) => String(t?.diaFinalTurno ?? t?.fechaFin ?? '').slice(0, 10) || fechaInicioDe(t);

/** Inicio como 'YYYY-MM-DDTHH:mm'. */
export const inicioDe = (t) => `${fechaInicioDe(t)}T${hhmm(t?.horaInicio ?? t?.inicio)}`;

/** Término como 'YYYY-MM-DDTHH:mm'. */
export const finDe = (t) => `${fechaFinDe(t)}T${hhmm(t?.horaFin ?? t?.fin)}`;

const tieneHorario = (t) => Boolean(fechaInicioDe(t) && hhmm(t?.horaInicio ?? t?.inicio) && hhmm(t?.horaFin ?? t?.fin));

/** Turno de noche: cruza la medianoche (termina un día después del que empieza). */
export const esNocturno = (t) => fechaInicioDe(t) < fechaFinDe(t);

/** ¿Ya empezó? `ahora` en el mismo formato, en la zona horaria del hospital. */
export const yaEmpezo = (t, ahora = ahoraISOEnZonaHospital()) => inicioDe(t) <= ahora;

/** Dos turnos se cruzan en el tiempo ([inicio, fin)); tocarse en el borde no es cruzarse. */
export const seSolapan = (a, b) => inicioDe(a) < finDe(b) && inicioDe(b) < finDe(a);

/**
 * Descanso post nocturno (R13): una noche que termina la mañana del día D no
 * puede ir con un turno de día que empieza ese mismo día D, sin importar cuál
 * de los dos ya estaba. Un día seguido de la noche de ese día (24 horas
 * corridas) y dos noches seguidas sí se permiten. Mismo criterio que
 * ValidadorAsignacionTurnoService.esDescansoPostNocturnoViolado.
 */
export const violaDescansoPostNocturno = (a, b) =>
  (esNocturno(a) && !esNocturno(b) && fechaFinDe(a) === fechaInicioDe(b))
  || (esNocturno(b) && !esNocturno(a) && fechaFinDe(b) === fechaInicioDe(a));

/**
 * Primer choque de darle `candidato` a quien tiene `calendario` (sus turnos):
 * { regla: 'solape' | 'descanso', turno } o null. Son las dos reglas con que el
 * backend valida una asignación; el turno se compara contra todos los de la
 * persona, salvo contra sí mismo.
 */
export function choqueConCalendario(candidato, calendario = []) {
  if (!tieneHorario(candidato)) return null;
  const idCandidato = idDe(candidato);
  for (const turno of calendario) {
    if (!tieneHorario(turno)) continue;
    if (idCandidato != null && idDe(turno) === idCandidato) continue;
    if (seSolapan(candidato, turno)) return { regla: 'solape', turno };
    if (violaDescansoPostNocturno(candidato, turno)) return { regla: 'descanso', turno };
  }
  return null;
}

// Bloque día/noche de un turno (R9): su día de inicio y su tipo de turno. Es la
// misma clave que el teamKey de la agenda (funcionarioService.mapTurnoForAgenda).
const claveBloque = (t) => `${fechaInicioDe(t)}|${t?.idTipoTurno ?? 'sin-tipo'}`;

/** Los dos turnos son del mismo bloque (mismo día y mismo tipo de turno). */
export const mismoBloque = (a, b) => claveBloque(a) === claveBloque(b);

/**
 * ¿Puede tomar este cupo libre quien tiene `misTurnos`? No, si ya trabaja en
 * ese bloque (R9) o si el cupo choca con alguno de sus turnos: solape o
 * descanso post nocturno (R13) en los dos sentidos. Es la regla de
 * «Disponibles» y la del selector de Cobertura. `misTurnos` debería traer
 * todos los turnos de la persona: el backend valida contra todos.
 */
export const puedeTomarCupo = (cupo, misTurnos = []) =>
  !misTurnos.some((t) => mismoBloque(cupo, t)) && !choqueConCalendario(cupo, misTurnos);

const minutosDesdeEpoca = (fecha, hora) => {
  const [y, m, d] = fecha.split('-').map(Number);
  const [hh, mm] = hora.split(':').map(Number);
  return Date.UTC(y, m - 1, d, hh, mm) / 60000;
};

/**
 * Duración en horas. Usa las fechas cuando las hay (un turno de 24 horas da 24);
 * si no, solo las horas, y si termina antes de la hora en que empieza, cruza la
 * medianoche. Si el backend ya trae `horas`, manda ese valor.
 */
export function horasDeTurno(t) {
  if (t?.horas != null) return Number(t.horas);
  const inicio = hhmm(t?.horaInicio ?? t?.hora_inicio ?? t?.inicio);
  const fin = hhmm(t?.horaFin ?? t?.hora_fin ?? t?.fin);
  if (!inicio || !fin) return null;
  const desde = fechaInicioDe(t);
  const hasta = String(t?.diaFinalTurno ?? t?.fechaFin ?? '').slice(0, 10);
  if (desde && hasta) {
    const minutos = minutosDesdeEpoca(hasta, fin) - minutosDesdeEpoca(desde, inicio);
    if (minutos > 0) return minutos / 60;
  }
  const [hi, mi] = inicio.split(':').map(Number);
  const [hf, mf] = fin.split(':').map(Number);
  const ini = hi * 60 + mi;
  const fi = hf * 60 + mf;
  return (fi >= ini ? fi - ini : 24 * 60 - ini + fi) / 60;
}
