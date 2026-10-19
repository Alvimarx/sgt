// HU de aprobar, rechazar y elegir entre postulantes, fase 4 del catálogo
// docs/qa/HISTORIAS_DE_USUARIO.md (§6.2): flujos de dos o tres usuarios con
// aprobación, que mueven turnos, en móvil y en desktop.
//  - HU-SOL-09 (aprobar o rechazar): criterios 1 y 3 a 8. El 2 se prueba tipo por
//    tipo en la HU de cada tipo (ver su entrada). Del 8, aquí están la parte de la
//    interfaz y el intercambio de otro servicio; la solicitud de otro servicio que no
//    es intercambio es de la fase 2a (permisos.spec.js) y la negativa por API del
//    médico, de la 2b. Desde el 17 oct (§5.1) asignar, reasignar o liberar a mano un
//    turno rechaza las solicitudes pendientes que lo tienen: el criterio 5 se prueba como
//    ese rechazo automático, y la segunda mitad del 6 (dueña del turno) ya no se produce.
//  - HU-SOL-10 (varios postulantes al mismo turno, R10): criterios 1 a 4.
//  - Lo que la fase 3 dejó para esta: HU-SOL-03 (criterio 5), HU-SOL-04 y HU-SOL-05
//    (criterio 2, «al aprobarse») y HU-SOL-13 (criterio 3, «si rechazaron»). HU-SOL-11
//    (criterio 5, en móvil) volvió a la fase 3 (cancelar-modificar.spec.js): desde
//    P-01 (17 oct) la tarjeta móvil se comporta como la desktop, sin botones.
//
// Datos: turnos y cupos de Urgencias desde mañana y sin trámites encima
// (fotoDelDia), del médico 369, de los médicos de apoyo 368 y 341 y de la jefatura
// 305, que es quien decide (en el criterio 7, también el administrador, por API).
// El punto de partida se crea por API (fixture `muta`); lo que se prueba, por la
// interfaz. Lo que la aprobación mueve se devuelve al final con la asignación
// directa de la jefatura (muta.devolverTurnos, que cierra las solicitudes pendientes de
// esos turnos: la prueba cancela antes lo que quiera cancelar) y lo pendiente se cancela. Quedan,
// y lo dice la anotación «no se deshace» de cada prueba: las solicitudes aprobadas,
// rechazadas o canceladas y los eventos de bitácora.
import {
  test, testMuta, expect, ID, SERVICIO, APOYO, esDesktop, soloPorApi, hoyChile, sumarDias, hhmm,
  entrar, abrirSolicitudes, elegirPestana, leerSolicitud, esperarSolicitudes, fechaCL,
  nuevaSolicitud, campoAsistente, elegirTurnoAsistente, escribirMotivo, enviarYCrear, leerOpcionesTurno, claveOpcionTurno,
  apiComo, calendarioDe, solicitudesDe, estadoSolicitud, cupoDelSelector,
  motivoF4, duenoDe, fotoDelDia, cuposLibresPara, intercambiosLibres, decidirEnPantalla, avisoSolicitudes,
  leerPostulaciones, botonPostulante, pulsarYEsperar, comprobarMensajeR13,
  sinNombre,
} from '../helpers/hu.js';
import { inicioDe, choquesR13 } from '../helpers/datos.js';

const DECIDIR = ['Aprobar', 'Rechazar'];
const botonesDecision = (vista) => vista.botones.filter((b) => DECIDIR.includes(b));
const RECHAZO_AUTOMATICO = 'Rechazo automático: Otra solicitud para este turno fue aprobada.';
// §5.1 (17 oct): asignar, reasignar o liberar a mano un turno rechaza las solicitudes pendientes que lo tienen
// (SolicitudService.rechazarPendientesPorCambioManual); el motivo original queda detrás.
const RECHAZO_MANUAL = {
  asignado: 'Rechazo automático: El turno fue asignado manualmente.',
  reasignado: 'Rechazo automático: El turno fue reasignado manualmente.',
};
const YA_NO_PENDIENTE = 'Esta solicitud ya no está pendiente (probablemente otra jefatura ya la resolvió)';
const PARTICIPAS_NOTA = 'Participas en esta solicitud: por segregación de funciones, la decisión corresponde a otra jefatura.';
const PARTICIPAS_ERROR = 'No puedes aprobar ni rechazar una solicitud en la que participas directamente';
const RUTA_DECIDIR = /\/api\/v2\/solicitudes\/\d+\/estado$/;
const franja = (t) => `${inicioDe(t)}|${hhmm(t.horaFin)}`;
// Desde C-04 (17 oct) la asignación a mano también aplica R13: para pasarle un turno a alguien, que no choque de ninguna forma.
const sinChoque = (turno, calendario) => choquesR13(turno, calendario).length === 0;

/** Entra como `quien`, abre Solicitudes (y la pestaña, si se pide) y lee la solicitud con `motivo`. */
async function verSolicitud(page, testInfo, quien, motivo, pestana) {
  await entrar(page, quien);
  await abrirSolicitudes(page, testInfo);
  if (pestana) await elegirPestana(page, testInfo, pestana);
  return leerSolicitud(page, testInfo, motivo);
}

/** La jefatura aprueba (o rechaza) por la interfaz la solicitud con `motivo`. Devuelve la respuesta del backend. */
async function decidirComoJefatura(page, testInfo, motivo, accion = 'Aprobar') {
  const vista = await verSolicitud(page, testInfo, 'jefatura', motivo);
  expect(botonesDecision(vista), 'la jefatura puede decidirla').toEqual(['Rechazar', 'Aprobar']);
  const r = await decidirEnPantalla(page, vista, accion);
  await esperarSolicitudes(page);
  return r;
}

/** Un turno futuro de `quien` sin trámites encima, en orden de inicio, que cumpla `filtro`. */
async function turnoSinTramites(request, quien, filtro = () => true) {
  const foto = await fotoDelDia(request);
  return foto.turnosDe(quien).find(filtro) ?? null;
}

// ═════════════════════════════════════════════════════════════════════════════
// HU-SOL-09 · Aprobar o rechazar solicitudes
// ═════════════════════════════════════════════════════════════════════════════

testMuta('HU-SOL-09 · criterio 1: «Aprobar» y «Rechazar» aparecen solo en solicitudes PENDIENTES y, en un intercambio, después de que el receptor acepta', async ({ page, request, muta }, testInfo) => {
  const [par] = await intercambiosLibres(request, 'medico', 'segundoMedico');
  expect(par, 'hay un intercambio posible entre los médicos 369 y 368').toBeTruthy();
  const motivoInt = motivoF4('HU-SOL-09 · criterio 1 · intercambio');
  const intercambio = await muta.crear('medico', {
    idTipoSolicitud: 4, idTurno: par.deseado.id, idTurnoIntercambio: par.propio.id, idFuncionarioReceptor: APOYO.segundoMedico.id, motivo: motivoInt,
  });
  // Control: una cobertura pendiente, que no espera a nadie, sí tiene los botones.
  const [cupo] = await cuposLibresPara(request, 'medico');
  expect(cupo, 'hay un cupo libre que el médico puede pedir').toBeTruthy();
  const motivoCob = motivoF4('HU-SOL-09 · criterio 1 · cobertura');
  const cobertura = await muta.crear('medico', { idTipoSolicitud: 3, idTurno: cupo.id, motivo: motivoCob });

  expect(botonesDecision(await verSolicitud(page, testInfo, 'jefatura', motivoCob)), 'control: cobertura pendiente').toEqual(['Rechazar', 'Aprobar']);
  let vista = await leerSolicitud(page, testInfo, motivoInt);
  expect(vista.estado).toBe('PENDIENTE');
  expect(vista.notas.some((n) => n.startsWith('⏳ Esperando respuesta del receptor')), 'espera al receptor').toBe(true);
  expect(botonesDecision(vista), 'intercambio que el receptor no ha respondido').toEqual([]);

  // El receptor acepta (por API): ahora la jefatura puede decidirlo.
  expect((await muta.responder('segundoMedico', intercambio, true)).status, 'el 368 acepta').toBe(200);
  vista = await verSolicitud(page, testInfo, 'jefatura', motivoInt);
  expect(vista.estado).toBe('Pend. jefatura');
  expect(botonesDecision(vista), 'intercambio aceptado por el receptor').toEqual(['Rechazar', 'Aprobar']);

  // Ya resueltas (las cancela su emisor), en «Historial» y sin botones.
  for (const s of [intercambio, cobertura]) expect((await muta.cancelar('medico', s.idSolicitud)).status, 'deshacer').toBe(200);
  for (const m of [motivoInt, motivoCob]) {
    const resuelta = await verSolicitud(page, testInfo, 'jefatura', m, 'Historial');
    expect(resuelta.estado).toBe('CANCELADA');
    expect(botonesDecision(resuelta), 'solicitud resuelta').toEqual([]);
  }
});

test('HU-SOL-09 · criterio 2: al aprobar, cada tipo mueve (o no) los turnos como corresponde', async () => {
  test.skip(true, 'Se prueba tipo por tipo, con la aprobación por la interfaz: Permiso en HU-SOL-03 (criterio 5), Botar turno en HU-SOL-04 (criterio 2) y '
    + 'Cobertura en HU-SOL-05 (criterio 2), en este archivo; Intercambio en HU-SOL-06 (criterio 6) y Oferta particular en HU-SOL-07 (criterio 2), en propuestas.spec.js.');
});

/**
 * Caso de R15 para el criterio 3: un turno T del médico 369 que él puede entregar
 * en un intercambio con el 368 (a cambio de D) y que el 341 le puede pedir en otro
 * intercambio (a cambio de X). Todo sin trámites encima.
 */
async function casoR15(request) {
  const foto = await fotoDelDia(request);
  for (const x of foto.turnosDe('tercerMedico')) {
    const pedibles = (await apiComo(request, 'tercerMedico', `/turnos/intercambiables?idTurnoPropio=${x.id}&idFuncionarioReceptor=${ID.medico}`))
      .filter((t) => !foto.enTramite.has(t.id));
    for (const t of pedibles) {
      const [d] = (await apiComo(request, 'medico', `/turnos/intercambiables?idTurnoPropio=${t.id}&idFuncionarioReceptor=${APOYO.segundoMedico.id}`))
        .filter((c) => !foto.enTramite.has(c.id));
      if (d) return { t, x, d };
    }
  }
  return null;
}

testMuta('HU-SOL-09 · criterio 3: al aprobar, la solicitud pendiente que ofrece ese mismo turno queda RECHAZADA con el rechazo automático (R15)', async ({ page, request, muta }, testInfo) => {
  // El turno T del 369 está en dos solicitudes pendientes: el 369 lo ofrece en un
  // intercambio con el 368, y el 341 lo pide en un intercambio con el 369. Al
  // aprobar la del 341, la del 369 queda sin sustento. Las coberturas que compiten
  // por un mismo cupo (la otra mitad del criterio) están en HU-SOL-10, criterio 2.
  const caso = await casoR15(request);
  expect(caso, 'hay un turno del 369 que él puede ofrecer al 368 y que el 341 le puede pedir').toBeTruthy();
  const { t, x, d } = caso;
  const ofrece = await muta.crear('medico', {
    idTipoSolicitud: 4, idTurno: d.id, idTurnoIntercambio: t.id, idFuncionarioReceptor: APOYO.segundoMedico.id, motivo: motivoF4('HU-SOL-09 · criterio 3 · el 369 ofrece T'),
  });
  const motivoPide = motivoF4('HU-SOL-09 · criterio 3 · el 341 pide T');
  const pide = await muta.crear('tercerMedico', {
    idTipoSolicitud: 4, idTurno: t.id, idTurnoIntercambio: x.id, idFuncionarioReceptor: ID.medico, motivo: motivoPide,
  });
  expect((await muta.responder('medico', pide, true)).status, 'el 369 acepta el intercambio del 341').toBe(200);
  await muta.recordarTurnos(t, x, d);

  const r = await decidirComoJefatura(page, testInfo, motivoPide);
  expect(r.status, 'la jefatura aprueba el intercambio del 341').toBe(200);
  expect([await duenoDe(request, t.id), await duenoDe(request, x.id)], 'los turnos se cruzaron').toEqual([APOYO.tercerMedico.id, ID.medico]);
  const sinSustento = await estadoSolicitud(request, 'medico', ofrece.idSolicitud);
  expect([sinSustento.estado, sinSustento.motivo], 'la que ofrecía T').toEqual(['RECHAZADA', RECHAZO_AUTOMATICO]);
  expect((await verSolicitud(page, testInfo, 'jefatura', motivoPide, 'Historial')).estado).toBe('APROBADA');

  expect((await muta.devolverTurnos()).sort(), 'deshacer: T y X vuelven a su dueño').toEqual([t.id, x.id].sort());
});

/** Dos cupos libres de la misma franja (día y horario) que `quien` puede tomar: el segundo, asignado a mano, se cruza con el primero. */
async function dosCuposMismaFranja(request, quien) {
  const porFranja = new Map();
  (await cuposLibresPara(request, quien)).forEach((c) => porFranja.set(franja(c), [...(porFranja.get(franja(c)) || []), c]));
  return [...porFranja.values()].find((l) => l.length >= 2)?.slice(0, 2) ?? null;
}

testMuta('HU-SOL-09 · criterio 4: la aprobación revalida el solape: si falla, veo el mensaje y la solicitud sigue PENDIENTE', async ({ page, request, muta }, testInfo) => {
  // La cobertura de un cupo era válida al crearla; después la jefatura le asigna a
  // mano otro cupo del mismo horario. La revalidación de R13 al aprobar está en
  // HU-SOL-07, criterio 3 (propuestas.spec.js).
  const par = await dosCuposMismaFranja(request, 'medico');
  expect(par, 'hay dos cupos libres de la misma franja que el médico puede tomar').toBeTruthy();
  const [pedido, cruzado] = par;
  const motivo = motivoF4('HU-SOL-09 · criterio 4');
  const sol = await muta.crear('medico', { idTipoSolicitud: 3, idTurno: pedido.id, motivo });
  await muta.recordarTurnos(pedido);
  expect((await muta.alterar('jefatura', { idTurno: cruzado.id, accion: 'ASIGNAR', idNuevoMedico: ID.medico })).status, 'asignación directa del otro cupo').toBe(200);

  const r = await decidirComoJefatura(page, testInfo, motivo);
  expect(r.status, 'el backend rechaza la aprobación').toBe(400);
  await comprobarMensajeR13(request, r.cuerpo.error, 'medico', 'solape', cruzado);
  expect(sinNombre(await avisoSolicitudes(page, testInfo, /^No es posible asignar el turno a /)), 'la vista muestra el mensaje').toBe(sinNombre(r.cuerpo.error));
  expect((await estadoSolicitud(request, 'medico', sol.idSolicitud)).estado, 'la solicitud sigue pendiente').toBe('PENDIENTE');
  expect(await duenoDe(request, pedido.id), 'el cupo sigue libre').toBeNull();

  expect((await muta.devolverTurnos()), 'deshacer la asignación directa').toEqual([cruzado.id]);
  expect((await muta.cancelar('medico', sol.idSolicitud)).status, 'deshacer').toBe(200);
});

testMuta('HU-SOL-09 · criterio 5: si la jefatura llena a mano el cupo que pide una cobertura, la solicitud se rechaza sola y no queda nada que aprobar', async ({ page, request, muta }, testInfo) => {
  // §5.1 (17 oct): asignar a mano un turno rechaza las solicitudes pendientes que lo tienen, así que «Este turno ya fue
  // asignado a otra persona» y la marca «Turno ya cubierto» ya no se alcanzan con una cobertura pendiente: queda
  // RECHAZADA, con su motivo y sin botones. La garantía del backend al aprobar sigue ahí por si la solicitud se
  // resolviera de otra forma; aquí se prueba contra la solicitud ya cerrada.
  const calOtro = await calendarioDe(request, 'segundoMedico');
  const cupo = (await cuposLibresPara(request, 'medico')).find((c) => sinChoque(c, calOtro));
  expect(cupo, 'hay un cupo libre que el 369 puede pedir y que se le puede asignar al 368').toBeTruthy();
  const motivo = motivoF4('HU-SOL-09 · criterio 5 · cobertura');
  const sol = await muta.crear('medico', { idTipoSolicitud: 3, idTurno: cupo.id, motivo });
  expect((await muta.alterar('jefatura', { idTurno: cupo.id, accion: 'ASIGNAR', idNuevoMedico: APOYO.segundoMedico.id })).status, 'la jefatura llena el cupo a mano').toBe(200);

  const cerrada = await estadoSolicitud(request, 'medico', sol.idSolicitud);
  expect([cerrada.estado, cerrada.motivo], 'la cobertura queda rechazada, con el motivo original detrás')
    .toEqual(['RECHAZADA', `${RECHAZO_MANUAL.asignado} · motivo original: ${motivo}`]);
  // La jefatura la ve en el historial, sin botones.
  const vista = await verSolicitud(page, testInfo, 'jefatura', motivo, 'Historial');
  expect(vista.estado).toBe('RECHAZADA');
  expect(botonesDecision(vista), 'sin Aprobar ni Rechazar').toEqual([]);
  await expect(vista.zona).toContainText(RECHAZO_MANUAL.asignado);
  // Quien la emitió la ve igual, y ya no puede cancelarla.
  const propia = await verSolicitud(page, testInfo, 'medico', motivo);
  expect(propia.estado).toBe('RECHAZADA');
  expect(propia.botones).not.toContain('Cancelar solicitud');
  // Por API, aprobarla responde que ya no está pendiente.
  const r = await muta.decidir('jefatura', sol.idSolicitud, 'APROBADA');
  expect([r.status, r.cuerpo?.error], 'el backend, por API').toEqual([400, YA_NO_PENDIENTE]);
  expect(await duenoDe(request, cupo.id), 'el cupo sigue con quien lo asignó la jefatura').toBe(APOYO.segundoMedico.id);

  expect(await muta.devolverTurnos(), 'deshacer la asignación directa').toEqual([cupo.id]);
});

testMuta('HU-SOL-09 · criterio 5: si en un intercambio uno de los turnos cambia de dueño a mano, la solicitud se rechaza sola y no queda obsoleta', async ({ page, request, muta }, testInfo) => {
  // §5.1 (17 oct): reasignar a mano uno de los turnos rechaza el intercambio pendiente («… reasignado manualmente»), así
  // que «El turno solicitado (u ofrecido) ya cambió de dueño: el intercambio quedó obsoleto» ya no se alcanza con una
  // solicitud pendiente. Cada turno, el pedido y el ofrecido, con su propio intercambio: después de que el 368 acepta,
  // la jefatura pasa ese turno al 341.
  const calTercero = await calendarioDe(request, 'tercerMedico');
  const par = (await intercambiosLibres(request, 'medico', 'segundoMedico', 6))
    .find((p) => sinChoque(p.deseado, calTercero) && sinChoque(p.propio, calTercero));
  expect(par, 'hay un intercambio 369-368 cuyos dos turnos se le pueden asignar al 341').toBeTruthy();

  for (const [turno, cual] of [[par.deseado, 'solicitado'], [par.propio, 'ofrecido']]) {
    const motivo = motivoF4(`HU-SOL-09 · criterio 5 · intercambio · turno ${cual}`);
    const sol = await muta.crear('medico', {
      idTipoSolicitud: 4, idTurno: par.deseado.id, idTurnoIntercambio: par.propio.id, idFuncionarioReceptor: APOYO.segundoMedico.id, motivo,
    });
    expect((await muta.responder('segundoMedico', sol, true)).status, 'el 368 acepta').toBe(200);
    expect((await muta.alterar('jefatura', { idTurno: turno.id, accion: 'REASIGNAR', idNuevoMedico: APOYO.tercerMedico.id })).status, `el turno ${cual} pasa al 341`).toBe(200);

    const cerrada = await estadoSolicitud(request, 'medico', sol.idSolicitud);
    expect([cerrada.estado, cerrada.motivo], `turno ${cual}`).toEqual(['RECHAZADA', `${RECHAZO_MANUAL.reasignado} · motivo original: ${motivo}`]);
    const vista = await verSolicitud(page, testInfo, 'jefatura', motivo, 'Historial');
    expect(vista.estado, `turno ${cual}`).toBe('RECHAZADA');
    expect(botonesDecision(vista), 'sin Aprobar ni Rechazar').toEqual([]);
    const r = await muta.decidir('jefatura', sol.idSolicitud, 'APROBADA');
    expect([r.status, r.cuerpo?.error], `aprobarla (turno ${cual})`).toEqual([400, YA_NO_PENDIENTE]);
    expect(await muta.devolverTurnos(), `deshacer: el turno ${cual} vuelve a su dueño`).toEqual([turno.id]);
  }
});

testMuta('HU-SOL-09 · criterio 6: si soy la solicitante, no veo «Aprobar» ni «Rechazar» y leo la nota de segregación; el backend responde que participo', async ({ page, request, muta }, testInfo) => {
  // P-01 (17 oct): la segregación es igual en móvil y desktop (antes, en móvil la
  // tarjeta ofrecía los botones y solo el backend la negaba). La negativa del
  // backend se comprueba por API.
  const turno = await turnoSinTramites(request, 'jefatura');
  expect(turno, 'la jefatura tiene un turno futuro sin trámites').toBeTruthy();
  const motivo = motivoF4('HU-SOL-09 · criterio 6 · solicitante');
  const sol = await muta.crear('jefatura', { idTipoSolicitud: 2, idTurno: turno.id, motivo });
  await muta.recordarTurnos(turno);

  const vista = await verSolicitud(page, testInfo, 'jefatura', motivo);
  expect(botonesDecision(vista), 'sin Aprobar ni Rechazar').toEqual([]);
  await expect(vista.zona, 'la nota de segregación').toContainText(PARTICIPAS_NOTA);
  for (const estado of ['APROBADA', 'RECHAZADA']) {
    const r = await muta.decidir('jefatura', sol.idSolicitud, estado);
    expect([r.status, r.cuerpo?.error], `${estado} por API`).toEqual([403, PARTICIPAS_ERROR]);
  }
  expect((await estadoSolicitud(request, 'jefatura', sol.idSolicitud)).estado, 'sigue pendiente').toBe('PENDIENTE');
  expect(await duenoDe(request, turno.id), 'el turno sigue siendo de la jefatura').toBe(ID.jefatura);
  expect((await muta.cancelar('jefatura', sol.idSolicitud)).status, 'deshacer').toBe(200);
});

test('HU-SOL-09 · criterio 6: si soy dueña de uno de los turnos (sin ser solicitante ni receptora), no veo «Aprobar» ni «Rechazar» y leo la nota', async () => {
  test.skip(true, 'No automatizable: el estado ya no se produce. Era una solicitud pendiente cuyo turno había pasado a mano a la jefatura; desde el 17 oct asignar, '
    + 'reasignar o liberar a mano un turno rechaza las solicitudes pendientes que lo tienen (§5.1), y el backend exige que el turno pedido en un intercambio sea del receptor. '
    + 'La regla de la vista (participaEnSolicitud) y la del backend (SolicitudService.participantesDirectos) siguen, sin un camino para probarlas de punta a punta.');
});

testMuta('HU-SOL-09 · criterio 7: si otra jefatura ya la aprobó, veo «Esta solicitud ya no está pendiente (probablemente otra jefatura ya la resolvió)»', async ({ page, muta }, testInfo) => {
  // Un permiso del 369 (no mueve turnos). La jefatura 305 lo tiene en pantalla;
  // mientras tanto lo aprueba el administrador (rol JEFATURA en Urgencias), por API.
  const motivo = motivoF4('HU-SOL-09 · criterio 7');
  const [desde, hasta] = [sumarDias(hoyChile(), 60), sumarDias(hoyChile(), 61)];
  const sol = await muta.crear('medico', { idTipoSolicitud: 1, fechaInicioPermiso: `${desde}T00:00:00`, fechaTerminoPermiso: `${hasta}T00:00:00`, motivo });
  const vista = await verSolicitud(page, testInfo, 'jefatura', motivo);
  expect(botonesDecision(vista)).toEqual(['Rechazar', 'Aprobar']);

  expect((await muta.decidir('admin', sol.idSolicitud, 'APROBADA', { servicioId: SERVICIO.urgencias })).status, 'el administrador la aprueba antes').toBe(200);
  const r = await decidirEnPantalla(page, vista, 'Aprobar');
  const mensaje = 'Esta solicitud ya no está pendiente (probablemente otra jefatura ya la resolvió)';
  expect([r.status, r.cuerpo?.error]).toEqual([400, mensaje]);
  expect(await avisoSolicitudes(page, testInfo, /^Esta solicitud ya no está pendiente/)).toBe(mensaje);
});

testMuta('HU-SOL-09 · criterio 8: el médico no ve «Aprobar» ni «Rechazar», ni en sus solicitudes ni en las que recibió', async ({ page, request, muta }, testInfo) => {
  const [cupo] = await cuposLibresPara(request, 'medico');
  expect(cupo, 'hay un cupo libre que el médico puede pedir').toBeTruthy();
  const motivoPropia = motivoF4('HU-SOL-09 · criterio 8 · propia');
  const propia = await muta.crear('medico', { idTipoSolicitud: 3, idTurno: cupo.id, motivo: motivoPropia });
  // Una oferta particular del 368 al 369, que el 369 ya aceptó (queda pendiente de la jefatura).
  const calMedico = await calendarioDe(request, 'medico');
  const turno = await turnoSinTramites(request, 'segundoMedico', (t) => choquesR13(t, calMedico).length === 0 && t.id !== cupo.id);
  expect(turno, 'el 368 tiene un turno que el 369 puede recibir').toBeTruthy();
  const motivoRecibida = motivoF4('HU-SOL-09 · criterio 8 · recibida');
  const recibida = await muta.crear('segundoMedico', { idTipoSolicitud: 5, idTurno: turno.id, idFuncionarioReceptor: ID.medico, motivo: motivoRecibida });
  expect((await muta.responder('medico', recibida, true)).status, 'el 369 acepta').toBe(200);

  const vista = await verSolicitud(page, testInfo, 'medico', motivoPropia);
  expect(vista.estado).toBe('PENDIENTE');
  expect(botonesDecision(vista), 'su solicitud pendiente').toEqual([]);
  await elegirPestana(page, testInfo, 'Recibidas');
  const vistaRecibida = await leerSolicitud(page, testInfo, motivoRecibida);
  expect(vistaRecibida.estado).toBe('Aceptada · Pend. jefatura');
  expect(vistaRecibida.botones.filter((b) => [...DECIDIR, 'Aceptar'].includes(b)), 'la que recibió y aceptó').toEqual([]);

  expect((await muta.cancelar('medico', propia.idSolicitud)).status, 'deshacer').toBe(200);
  expect((await muta.cancelar('segundoMedico', recibida.idSolicitud)).status, 'deshacer (la cancela su emisor, 368)').toBe(200);
});

testMuta('HU-SOL-09 · criterio 8: aprobar un intercambio de otro servicio responde 403 «El intercambio involucra un turno de otro servicio»', async ({ request, muta }, testInfo) => {
  soloPorApi(testInfo);
  // Error del catálogo: el criterio 8 cita «No tienes acceso a solicitudes de otro servicio»
  // para toda solicitud de otro servicio, pero en un intercambio el backend exige que los dos
  // turnos sean del servicio de la sesión y responde con otro mensaje
  // (SolicitudService.cambiarEstado, :372-385). Con una solicitud que no es intercambio, el
  // criterio se prueba sin escribir en la fase 2a (permisos.spec.js). Aquí el subrogante, que
  // es de Enfermería, intenta aprobar un intercambio de Urgencias ya aceptado por el receptor.
  const [par] = await intercambiosLibres(request, 'medico', 'segundoMedico');
  expect(par, 'hay un intercambio posible entre los médicos 369 y 368').toBeTruthy();
  const sol = await muta.crear('medico', {
    idTipoSolicitud: 4, idTurno: par.deseado.id, idTurnoIntercambio: par.propio.id, idFuncionarioReceptor: APOYO.segundoMedico.id,
    motivo: motivoF4('HU-SOL-09 · criterio 8 · otro servicio'),
  });
  expect((await muta.responder('segundoMedico', sol, true)).status, 'el 368 acepta').toBe(200);
  // Red: si el permiso fallara, la aprobación cruzaría los turnos; la limpieza los devolvería.
  await muta.recordarTurnos(par.propio, par.deseado);

  const r = await muta.decidir('subrogante', sol.idSolicitud, 'APROBADA');
  expect([r.status, r.cuerpo?.error]).toEqual([403, 'El intercambio involucra un turno de otro servicio']);
  expect((await estadoSolicitud(request, 'medico', sol.idSolicitud)).estado, 'sigue pendiente').toBe('PENDIENTE');
  expect(await muta.devolverTurnos(), 'ningún turno se movió').toEqual([]);
  expect((await muta.cancelar('medico', sol.idSolicitud)).status, 'deshacer').toBe(200);
});

// ═════════════════════════════════════════════════════════════════════════════
// HU-SOL-10 · Elegir entre varios postulantes al mismo turno (R10)
// ═════════════════════════════════════════════════════════════════════════════

/** Dos coberturas PENDIENTES del mismo cupo: primero la del 369 y después la del 368. Devuelve el cupo y las dos solicitudes con su motivo. */
async function dosPostulaciones(request, muta, etiqueta) {
  const delOtro = new Set((await cuposLibresPara(request, 'segundoMedico')).map((c) => c.id));
  const cupo = (await cuposLibresPara(request, 'medico')).find((c) => delOtro.has(c.id));
  expect(cupo, 'hay un cupo libre que pueden pedir los médicos 369 y 368').toBeTruthy();
  const [m1, m2] = [motivoF4(`${etiqueta} · 369`), motivoF4(`${etiqueta} · 368`)];
  const primera = await muta.crear('medico', { idTipoSolicitud: 3, idTurno: cupo.id, motivo: m1 });
  const segunda = await muta.crear('segundoMedico', { idTipoSolicitud: 3, idTurno: cupo.id, motivo: m2 });
  return { cupo, primera: { ...primera, motivo: m1 }, segunda: { ...segunda, motivo: m2 } };
}

testMuta('HU-SOL-10 · criterio 1: dos coberturas del mismo turno se ven en una sola tarjeta «Postulaciones al mismo turno · 2 postulantes», con el turno, la posición y los postulantes por orden de llegada', async ({ page, request, muta }, testInfo) => {
  const { cupo, primera, segunda } = await dosPostulaciones(request, muta, 'HU-SOL-10 · criterio 1');
  await entrar(page, 'jefatura');
  await abrirSolicitudes(page, testInfo);
  const grupo = await leerPostulaciones(page, testInfo, primera.motivo);
  expect(grupo.titulo).toBe('Postulaciones al mismo turno');
  expect(grupo.subtitulo).toBe('Cobertura · elige a una persona');
  expect(grupo.chip).toBe('2 postulantes');
  const turno = grupo.filas['Turno a cubrir'];
  expect(turno).toContain(await fechaCL(page, cupo.diaInicioTurno));
  expect(turno).toContain(`${hhmm(cupo.horaInicio)}–${hhmm(cupo.horaFin)}`);
  expect(turno.endsWith(` · ${cupo.nombreTipoTurno}`), 'con el tipo de turno').toBe(true);
  expect(grupo.filas['Posición']).toBe(cupo.nombrePuesto);
  expect(grupo.postulantes.map((p) => p.motivo), 'por orden de llegada, cada uno con su motivo').toEqual([primera.motivo, segunda.motivo]);
  const fechaHoy = await fechaCL(page, hoyChile());
  expect(grupo.postulantes.map((p) => p.detalle)).toEqual([`Postuló el ${fechaHoy}`, `Postuló el ${fechaHoy}`]);
  if (esDesktop(testInfo)) expect(grupo.seccion).toBe('Postulantes · 2');
  expect(grupo.pie).toBe('Al elegir a una persona, las demás postulaciones de este turno se rechazan automáticamente.');

  for (const [quien, s] of [['medico', primera], ['segundoMedico', segunda]]) expect((await muta.cancelar(quien, s.idSolicitud)).status, 'deshacer').toBe(200);
});

testMuta('HU-SOL-10 · criterio 2: al elegir a una persona, su solicitud queda APROBADA, el turno pasa a su nombre y la otra queda RECHAZADA con el rechazo automático', async ({ page, request, muta }, testInfo) => {
  const { cupo, primera, segunda } = await dosPostulaciones(request, muta, 'HU-SOL-10 · criterio 2');
  await muta.recordarTurnos(cupo);
  await entrar(page, 'jefatura');
  await abrirSolicitudes(page, testInfo);
  const grupo = await leerPostulaciones(page, testInfo, primera.motivo);
  const r = await pulsarYEsperar(page, botonPostulante(grupo.fila(primera.motivo), testInfo, 'Elegir'), RUTA_DECIDIR);
  expect(r.status, 'elegir al 369').toBe(200);
  await esperarSolicitudes(page);

  expect((await estadoSolicitud(request, 'medico', primera.idSolicitud)).estado).toBe('APROBADA');
  expect(await duenoDe(request, cupo.id), 'el turno pasa al 369').toBe(ID.medico);
  const otra = await estadoSolicitud(request, 'segundoMedico', segunda.idSolicitud);
  expect([otra.estado, otra.motivo], 'la postulación del 368').toEqual(['RECHAZADA', RECHAZO_AUTOMATICO]);
  expect((await verSolicitud(page, testInfo, 'jefatura', primera.motivo, 'Historial')).estado).toBe('APROBADA');

  expect(await muta.devolverTurnos(), 'deshacer: el cupo vuelve a quedar libre').toEqual([cupo.id]);
});

testMuta('HU-SOL-10 · criterio 3: puedo rechazar a un postulante sin elegir a otro', async ({ page, request, muta }, testInfo) => {
  const { cupo, primera, segunda } = await dosPostulaciones(request, muta, 'HU-SOL-10 · criterio 3');
  await muta.recordarTurnos(cupo);
  await entrar(page, 'jefatura');
  await abrirSolicitudes(page, testInfo);
  const grupo = await leerPostulaciones(page, testInfo, segunda.motivo);
  const r = await pulsarYEsperar(page, botonPostulante(grupo.fila(segunda.motivo), testInfo, 'Rechazar'), RUTA_DECIDIR);
  expect(r.status, 'rechazar al 368').toBe(200);
  await esperarSolicitudes(page);

  const rechazada = await estadoSolicitud(request, 'segundoMedico', segunda.idSolicitud);
  expect([rechazada.estado, rechazada.motivo], 'la del 368, con su motivo').toEqual(['RECHAZADA', segunda.motivo]);
  expect((await estadoSolicitud(request, 'medico', primera.idSolicitud)).estado, 'la del 369 sigue pendiente').toBe('PENDIENTE');
  expect(await duenoDe(request, cupo.id), 'el cupo sigue libre').toBeNull();
  // Con un solo postulante ya no hay grupo: la del 369 se ve como una solicitud más.
  const sola = await verSolicitud(page, testInfo, 'jefatura', primera.motivo);
  expect([sola.titulo, sola.estado]).toEqual(['Cobertura', 'PENDIENTE']);

  expect((await muta.cancelar('medico', primera.idSolicitud)).status, 'deshacer').toBe(200);
});

testMuta('HU-SOL-10 · criterio 4: en desktop la decisión se toma en el detalle, persona por persona', async ({ page, request, muta }, testInfo) => {
  test.skip(!esDesktop(testInfo), 'Criterio de desktop. En móvil se elige y se rechaza en la misma tarjeta (criterios 2 y 3).');
  const { primera, segunda } = await dosPostulaciones(request, muta, 'HU-SOL-10 · criterio 4');
  await entrar(page, 'jefatura');
  await abrirSolicitudes(page, testInfo);
  // Las dos postulaciones son un solo ítem de la lista, con la cuenta en el chip.
  for (const m of [primera.motivo, segunda.motivo]) {
    await page.getByRole('searchbox').fill(m);
    await expect(page.getByRole('listbox').getByRole('option'), `un solo ítem con «${m}»`).toHaveCount(1);
    await expect(page.getByRole('listbox').getByRole('option').first()).toContainText('Postulaciones al mismo turno');
  }
  const grupo = await leerPostulaciones(page, testInfo, primera.motivo);
  expect(grupo.postulantes).toHaveLength(2);
  for (const m of [primera.motivo, segunda.motivo]) {
    for (const accion of ['Rechazar', 'Elegir']) await expect(botonPostulante(grupo.fila(m), testInfo, accion), `${accion} en la fila de «${m}»`).toHaveCount(1);
  }
  await expect(grupo.zona.locator('.sgt-dt-detalle-sol__acciones button'), 'sin botones generales: se decide por persona').toHaveCount(0);

  for (const [quien, s] of [['medico', primera], ['segundoMedico', segunda]]) expect((await muta.cancelar(quien, s.idSolicitud)).status, 'deshacer').toBe(200);
});

// ═════════════════════════════════════════════════════════════════════════════
// Lo que la fase 3 dejó para esta: SOL-03, SOL-04, SOL-05 y SOL-13
// ═════════════════════════════════════════════════════════════════════════════

testMuta('HU-SOL-03 · criterio 5: al aprobar el permiso no cambia ningún turno', async ({ page, request, muta }, testInfo) => {
  testInfo.annotations.push({ type: 'contradicción', description: 'C-15: no está decidido si aprobar un permiso debe liberar los turnos del período. El criterio sigue lo que hace hoy el código (el permiso de la interfaz no lleva turno).' });
  // El período cubre los dos primeros días con turnos futuros del 369.
  const turno = await turnoSinTramites(request, 'medico');
  expect(turno, 'el 369 tiene un turno futuro').toBeTruthy();
  const [desde, hasta] = [turno.diaInicioTurno, sumarDias(turno.diaInicioTurno, 1)];
  const duenos = async () => new Map((await apiComo(request, 'jefatura', `/turnos/servicio/${SERVICIO.urgencias}`)).map((t) => [t.id, t.idFuncionario]));
  const antes = await duenos();
  const motivo = motivoF4('HU-SOL-03 · criterio 5');
  const sol = await muta.crear('medico', { idTipoSolicitud: 1, fechaInicioPermiso: `${desde}T00:00:00`, fechaTerminoPermiso: `${hasta}T00:00:00`, motivo });
  expect(sol.turno, 'el permiso no lleva turno').toBeNull();

  const r = await decidirComoJefatura(page, testInfo, motivo);
  expect(r.status, 'la jefatura lo aprueba').toBe(200);
  expect((await estadoSolicitud(request, 'medico', sol.idSolicitud)).estado).toBe('APROBADA');
  const despues = await duenos();
  const cambiados = [...antes].filter(([id, dueno]) => despues.get(id) !== dueno).map(([id]) => id);
  expect(cambiados, 'turnos de Urgencias que cambiaron de dueño').toEqual([]);
  expect((await calendarioDe(request, 'medico')).filter((t) => t.diaInicioTurno >= desde && t.diaInicioTurno <= hasta).length,
    'el 369 sigue con sus turnos del período').toBeGreaterThan(0);
});

testMuta('HU-SOL-04 · criterio 2: al aprobarse «Botar turno», el turno queda sin funcionario y aparece como cupo libre', async ({ page, request, muta }, testInfo) => {
  const turno = await turnoSinTramites(request, 'medico');
  expect(turno, 'el 369 tiene un turno futuro sin trámites').toBeTruthy();
  // Cupos libres de su misma franja antes de aprobar: en el selector de Cobertura se ven iguales.
  const sinAsignar = async () => apiComo(request, 'medico', `/turnos/servicio/${SERVICIO.urgencias}/sin-asignar`);
  const mismaFranja = (lista) => lista.filter((t) => franja(t) === franja(turno)).length;
  const antes = mismaFranja(await sinAsignar());
  const motivo = motivoF4('HU-SOL-04 · criterio 2');
  await muta.crear('medico', { idTipoSolicitud: 2, idTurno: turno.id, motivo });
  await muta.recordarTurnos(turno);

  const r = await decidirComoJefatura(page, testInfo, motivo);
  expect(r.status, 'la jefatura lo aprueba').toBe(200);
  expect(await duenoDe(request, turno.id), 'el turno queda sin funcionario').toBeNull();
  expect((await sinAsignar()).map((t) => t.id), 'entre los cupos libres').toContain(turno.id);
  // Aparece en el selector de Cobertura, que lista los cupos libres del servicio: uno más en su franja.
  await entrar(page, 'medico');
  const a = await nuevaSolicitud(page, testInfo, 'Cobertura');
  await campoAsistente(a, testInfo, 'Turno a cubrir').click();
  const clave = await claveOpcionTurno(page, turno);
  expect((await leerOpcionesTurno(page, testInfo)).filter((o) => o === clave).length, 'cupos de su franja en «Turno a cubrir»').toBe(antes + 1);

  expect(await muta.devolverTurnos(), 'deshacer: el turno vuelve al 369').toEqual([turno.id]);
});

testMuta('HU-SOL-05 · criterio 2: al aprobarse la cobertura, el turno queda a mi nombre', async ({ page, request, muta }, testInfo) => {
  const [cupo] = await cuposLibresPara(request, 'medico');
  expect(cupo, 'hay un cupo libre que el médico puede pedir').toBeTruthy();
  const motivo = motivoF4('HU-SOL-05 · criterio 2');
  await muta.crear('medico', { idTipoSolicitud: 3, idTurno: cupo.id, motivo });
  await muta.recordarTurnos(cupo);

  const r = await decidirComoJefatura(page, testInfo, motivo);
  expect(r.status, 'la jefatura la aprueba').toBe(200);
  expect(await duenoDe(request, cupo.id), 'el turno queda a nombre del 369').toBe(ID.medico);
  expect((await calendarioDe(request, 'medico')).map((t) => t.id), 'en el calendario del 369').toContain(cupo.id);
  expect((await verSolicitud(page, testInfo, 'medico', motivo)).estado, 'el médico la ve aprobada').toBe('APROBADA');

  expect(await muta.devolverTurnos(), 'deshacer: el cupo vuelve a quedar libre').toEqual([cupo.id]);
});

testMuta('HU-SOL-13 · criterio 3: si rechazaron mi solicitud, puedo volver a pedir el turno', async ({ page, request, muta }, testInfo) => {
  // Un cupo que el selector de Cobertura elige al tocar su franja (el primero de ella).
  let cupo = null;
  for (const c of await cuposLibresPara(request, 'medico')) {
    if ((await cupoDelSelector(request, c))?.id === c.id) { cupo = c; break; }
  }
  expect(cupo, 'hay un cupo libre que el médico puede pedir y que el selector elige').toBeTruthy();
  const motivo = motivoF4('HU-SOL-13 · criterio 3 · primera');
  const primera = await muta.crear('medico', { idTipoSolicitud: 3, idTurno: cupo.id, motivo });
  const r = await decidirComoJefatura(page, testInfo, motivo, 'Rechazar');
  expect(r.status, 'la jefatura la rechaza').toBe(200);
  expect((await estadoSolicitud(request, 'medico', primera.idSolicitud)).estado).toBe('RECHAZADA');

  await entrar(page, 'medico');
  const a = await nuevaSolicitud(page, testInfo, 'Cobertura');
  await elegirTurnoAsistente(page, testInfo, 'Turno a cubrir', cupo);
  const otraVez = motivoF4('HU-SOL-13 · criterio 3 · otra vez');
  await escribirMotivo(a, otraVez);
  const creada = await enviarYCrear(page, testInfo);
  expect(creada.turno?.idTurno, 'el mismo cupo').toBe(cupo.id);
  expect((await leerSolicitud(page, testInfo, otraVez)).estado).toBe('PENDIENTE');
  expect((await solicitudesDe(request, 'medico')).filter((s) => s.turno?.idTurno === cupo.id && s.estado === 'PENDIENTE')).toHaveLength(1);

  expect((await muta.cancelar('medico', creada.idSolicitud)).status, 'deshacer').toBe(200);
});
