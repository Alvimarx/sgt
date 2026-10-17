// Cálculo de lo ESPERADO a partir de los datos crudos de la API, para las
// pruebas de historias de usuario (e2e/hu/). Cada función sigue la regla del
// catálogo o del requerimiento que cita, escrita aparte del código de la app:
// si la app se equivoca, la prueba no se equivoca con ella.

/**
 * Días que muestra la agenda móvil (HU-CAL-01, criterio 2; FUN-SGT-053): los
 * días con turnos de hoy en adelante, más un día anterior solo si tiene un
 * turno que sigue vigente hoy (la noche de ayer que termina hoy).
 * `turnos`: GET /turnos/servicio/{id}. Devuelve las fechas ordenadas.
 */
export function diasVisiblesAgenda(turnos, hoy) {
  const porDia = new Map();
  turnos.forEach((t) => {
    if (!porDia.has(t.diaInicioTurno)) porDia.set(t.diaInicioTurno, []);
    porDia.get(t.diaInicioTurno).push(t);
  });
  return [...porDia.keys()]
    .filter((dia) => dia >= hoy || porDia.get(dia).some((t) => (t.diaFinalTurno || t.diaInicioTurno) >= hoy))
    .sort();
}

/** Turnos agrupados por fecha de inicio. */
export function turnosPorDia(turnos) {
  const mapa = new Map();
  turnos.forEach((t) => {
    if (!mapa.has(t.diaInicioTurno)) mapa.set(t.diaInicioTurno, []);
    mapa.get(t.diaInicioTurno).push(t);
  });
  return mapa;
}

/** Un turno es de noche si termina otro día (cruza la medianoche). */
export const esNoche = (t) => (t.diaFinalTurno || t.diaInicioTurno) !== t.diaInicioTurno;

/**
 * Cupos que el usuario puede tomar según R9 («Disponibles»), dentro de los días
 * visibles de la agenda:
 *  - no cuentan los cupos de un bloque (misma fecha y mismo tipo de turno) en
 *    el que ya tiene turno (HU-CAL-02, criterio 1);
 *  - no cuentan los cupos de día de la mañana en que sale de su noche
 *    (HU-CAL-02, criterio 2).
 */
export function cuposDisponiblesR9(turnos, idFuncionario, hoy) {
  const visibles = new Set(diasVisiblesAgenda(turnos, hoy));
  const mios = turnos.filter((t) => t.idFuncionario === idFuncionario);
  const misBloques = new Set(mios.map((t) => `${t.diaInicioTurno}|${t.idTipoTurno}`));
  const salidasDeNoche = new Set(mios.filter(esNoche).map((t) => t.diaFinalTurno));
  const libres = turnos.filter((t) => t.idFuncionario == null && visibles.has(t.diaInicioTurno));
  const enMiBloque = libres.filter((t) => misBloques.has(`${t.diaInicioTurno}|${t.idTipoTurno}`));
  const disponibles = libres.filter((t) => !misBloques.has(`${t.diaInicioTurno}|${t.idTipoTurno}`)
    && !(!esNoche(t) && salidasDeNoche.has(t.diaInicioTurno)));
  return { libres, enMiBloque, disponibles, misBloques };
}

/** Fecha + hora de inicio de un turno como 'YYYY-MM-DDTHH:mm'. */
export const inicioDe = (t) => `${t.diaInicioTurno}T${String(t.horaInicio).slice(0, 5)}`;

/** Horas de un turno (12 para los turnos del seed). */
export function horasDe(t) {
  const [hi, mi] = String(t.horaInicio).split(':').map(Number);
  const [hf, mf] = String(t.horaFin).split(':').map(Number);
  const ini = hi * 60 + mi;
  const fin = hf * 60 + mf;
  return ((fin > ini ? fin - ini : 24 * 60 - ini + fin) / 60);
}

/** Nombre completo como lo arman las vistas de solicitudes: nombre, apelPat y apelMat. */
export const nombreSolicitud = (f) => [f?.nombre, f?.apelPat, f?.apelMat].filter(Boolean).join(' ');
/** Nombre completo desde /funcionarios/summary. */
export const nombreResumen = (f) => [f?.nombre, f?.apellidoPaterno, f?.apellidoMaterno].filter(Boolean).join(' ');

/**
 * Rotativa del bloque (R7): la que cubre la mayoría de sus turnos; no cuentan
 * los turnos sin rotativa (el backend manda «Sin Rotativa»).
 */
export function rotativaDelBloque(turnos) {
  const cuenta = new Map();
  turnos.forEach((t) => {
    const r = t.nombreRotativa;
    if (!r || /^sin rotativa$/i.test(String(r).trim())) return;
    cuenta.set(r, (cuenta.get(r) || 0) + 1);
  });
  let mejor = null;
  cuenta.forEach((n, r) => { if (!mejor || n > mejor.n) mejor = { r, n }; });
  return mejor?.r ?? null;
}

/**
 * Ids de quienes participan en una solicitud (forma de GET /solicitudes): el
 * emisor y, en intercambios y ofertas particulares, el receptor. BUG-002: un
 * médico solo debería ver las solicitudes en las que participa.
 */
export const participantesSolicitud = (s) => [s?.funcionario?.idFuncionario, s?.funcionarioReceptor?.idFuncionario]
  .filter((id) => id != null);

// ── Formas de entidad para respuestas GET simuladas ──────────────────────────
// Las solicitudes y las ofertas traen el turno y las personas como entidades
// (con apelPat, servicio, puesto…), no como los DTO de /turnos/servicio.

/** Persona de /funcionarios/summary → entidad Funcionario. */
export const personaEntidad = (f) => ({
  idFuncionario: f.idFuncionario, nombre: f.nombre, apelPat: f.apellidoPaterno || '', apelMat: f.apellidoMaterno || '',
  rut: f.rut, dv: f.dv, estado: 1, eliminado: false,
});

/** Turno de /turnos/servicio/{id} → entidad Turno. */
export const turnoEntidad = (t, servicio) => ({
  idTurno: t.id, diaInicioTurno: t.diaInicioTurno, diaFinalTurno: t.diaFinalTurno,
  horaInicio: `${String(t.horaInicio).slice(0, 5)}:00`, horaFin: `${String(t.horaFin).slice(0, 5)}:00`, eliminado: false,
  servicio: { idServicio: servicio.idServicio, nombre: servicio.nombre, eliminado: false },
  puesto: t.idPuesto ? { idPuesto: t.idPuesto, nombre: t.nombrePuesto } : null,
  rotativa: t.idRotativa ? { idRotativa: t.idRotativa, nombre: t.nombreRotativa } : null,
  tipoTurno: { idTipoTurno: t.idTipoTurno, nombre: t.nombreTipoTurno },
  funcionario: t.idFuncionario ? { idFuncionario: t.idFuncionario } : null,
});

const ahoraISO = () => new Date().toISOString().slice(0, 19);

/**
 * Solicitud con la forma de GET /solicitudes, para simular respuestas (nada
 * se guarda). `funcionario` y `receptor`: personas de /funcionarios/summary;
 * `turno` y `turnoReceptor`: turnos de /turnos/servicio/{id}.
 */
export const solicitudSimulada = ({
  id, tipo, estado = 'PENDIENTE', funcionario, receptor = null, turno = null, turnoReceptor = null,
  servicio, motivo = 'Solicitud simulada en la prueba', aceptadoReceptor = null, fechaCreacion = ahoraISO(),
  fechaInicioPermiso = null, fechaTerminoPermiso = null,
}) => ({
  idSolicitud: id,
  tipoSolicitud: { idTipoSolicitud: tipo, tipo },
  estado,
  fechaCreacion,
  motivo,
  aceptadoReceptor,
  funcionario: personaEntidad(funcionario),
  funcionarioReceptor: receptor ? personaEntidad(receptor) : null,
  turno: turno ? turnoEntidad(turno, servicio) : null,
  turnoReceptor: turnoReceptor ? turnoEntidad(turnoReceptor, servicio) : null,
  fechaInicioPermiso,
  fechaTerminoPermiso,
});

/** Oferta general con la forma de GET /ofertas-generales/servicio/{id}. */
export const ofertaSimulada = ({ id, estado, ofertor, turno, servicio, postulantes = [], motivo = 'Oferta simulada en la prueba' }) => ({
  idOfertaGeneral: id,
  estado,
  motivo,
  fechaCreacion: ahoraISO(),
  ofertor: personaEntidad(ofertor),
  turno: turnoEntidad(turno, servicio),
  postulaciones: postulantes.map((p, i) => ({
    idPostulacion: id * 10 + i, postulante: personaEntidad(p), seleccionado: false, fechaPostulacion: ahoraISO(),
  })),
});
