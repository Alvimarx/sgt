// HU de las reglas al crear una solicitud, fase 3 del catálogo
// docs/qa/HISTORIAS_DE_USUARIO.md (§6.2): mutaciones de un solo usuario que se
// deshacen en la misma prueba, en móvil y en desktop.
//  - HU-SOL-13 (R12 y R15): no pedir dos veces el mismo turno ni comprometerlo
//    en dos solicitudes. Criterios 1 a 4; del 3 queda fuera «si rechazaron mi
//    solicitud» (la rechaza la jefatura: fase 4, aprobaciones.spec.js).
//  - HU-SOL-14 (R13, descanso post nocturno): criterios 1 a 3. El 4 (revalidar al
//    aceptar, aprobar y seleccionar) y el 5 (asignación manual, C-04) son de la
//    fase 4 (propuestas.spec.js, ofertas-generales.spec.js y asignacion.spec.js).
//    La regla de 12 horas de RN-SGT-039 no se prueba: R13 la reemplazó (C-04).
//
// Los casos se buscan en los datos del día (turnos generados de Urgencias, desde
// mañana): primero con el médico 369 y, si ya no tiene el caso, con los médicos de
// apoyo 368 y 341 (catálogo §2.1). Lo que el backend rechaza no crea nada; lo que
// crea se cancela al final. Los segundos usuarios solo crean y cancelan lo suyo:
// nadie aprueba ni responde. Los mensajes de R13 nombran a la persona: las
// aserciones los comparan con el nombre oculto (sinNombre) y comprueban aparte,
// sin escribirlo, que sea el de quien pide.
import {
  testMuta, expect, SERVICIO, APOYO, soloPorApi, hoyChile,
  entrar, vistaActual, esperarQuieta, nuevaSolicitud, asistente, campoAsistente, elegirTurnoAsistente, elegirPersonaAsistente,
  escribirMotivo, enviarSolicitud, enviarYCrear, enviarYRechazar, errorAsistente, leerSolicitud, abrirCancelacion, confirmarCancelacion,
  esperarSolicitudes, motivoPrueba, idDe, apiComo, solicitudesDe, calendarioDe, comprometidosDe, personaDe,
  cuposParaPedir, cupoDelSelector, intercambioPosible, hhmm, comprobarMensajeR13, leerOpcionesTurno, claveOpcionTurno,
} from '../helpers/hu.js';
import { inicioDe, esNoche, choquesR13, encadenamientoR13 } from '../helpers/datos.js';

const YA_SOLICITO = 'Ud. ya solicitó este turno. Cancele la solicitud pendiente desde Solicitudes si desea cambiarla.';
const COMPROMETIDO = 'Ese turno ya está comprometido en otra solicitud pendiente suya. Cancélela desde Solicitudes para pedir otra cosa sobre él.';
const ENTREGA_COMPROMETIDA = 'El turno que ofreces entregar ya está comprometido en otra solicitud pendiente suya. Cancélela desde Solicitudes para crear esta.';
// Médicos de Urgencias con los que se buscan los casos de R13, en este orden.
const QUIENES = ['medico', 'segundoMedico', 'tercerMedico'];

const franja = (t) => `${inicioDe(t)}|${hhmm(t.horaFin)}`;
const pendientesSobre = async (request, quien, idTurno) => (await solicitudesDe(request, quien))
  .filter((s) => s.estado === 'PENDIENTE' && [s.turno?.idTurno, s.turnoReceptor?.idTurno].includes(idTurno));

/** Un intercambio PENDIENTE del médico 369 con el 368, por API: el turno «propio» queda comprometido (R15). */
async function intercambioPendiente(request, muta, etiqueta) {
  const par = await intercambioPosible(request, 'medico', 'segundoMedico');
  expect(par, 'hay un intercambio posible entre los médicos 369 y 368').toBeTruthy();
  const sol = await muta.crear('medico', {
    idTipoSolicitud: 4, idTurno: par.deseado.id, idTurnoIntercambio: par.propio.id, idFuncionarioReceptor: APOYO.segundoMedico.id,
    motivo: motivoPrueba(etiqueta),
  });
  return { ...par, sol };
}

// ═════════════════════════════════════════════════════════════════════════════
// HU-SOL-13 · No pedir dos veces el mismo turno ni comprometerlo en dos solicitudes (R12, R15)
// ═════════════════════════════════════════════════════════════════════════════

testMuta('HU-SOL-13 · criterio 1: si ya pedí un cupo, pedirlo de nuevo por «Nueva solicitud» muestra el mensaje de R12 y no crea nada', async ({ page, request, muta }, testInfo) => {
  const [franjaLibre] = await cuposParaPedir(request, 'medico');
  expect(franjaLibre, 'hay un cupo libre que el médico puede pedir').toBeTruthy();
  const cupo = await cupoDelSelector(request, franjaLibre);
  const primera = await muta.crear('medico', { idTipoSolicitud: 3, idTurno: cupo.id, motivo: motivoPrueba('HU-SOL-13 · criterio 1') });
  const antes = (await solicitudesDe(request, 'medico')).length;

  await entrar(page, 'medico');
  const a = await nuevaSolicitud(page, testInfo, 'Cobertura');
  await elegirTurnoAsistente(page, testInfo, 'Turno a cubrir', cupo);
  await escribirMotivo(a, motivoPrueba('HU-SOL-13 · no se crea'));
  const enviado = await enviarYRechazar(page, testInfo, YA_SOLICITO);
  expect(enviado.idTurno, 'se pidió el mismo cupo').toBe(cupo.id);
  expect((await solicitudesDe(request, 'medico')).length, 'no se creó nada').toBe(antes);

  expect((await muta.cancelar('medico', primera.idSolicitud)).status, 'deshacer').toBe(200);
});

testMuta('HU-SOL-13 · criterio 2: con mi turno ofrecido en un intercambio, botarlo u ofrecerlo muestra el mensaje de turno comprometido', async ({ page, request, muta }, testInfo) => {
  const { propio, sol } = await intercambioPendiente(request, muta, 'HU-SOL-13 · criterio 2');
  const antes = (await solicitudesDe(request, 'medico')).length;
  await entrar(page, 'medico');

  // Botar el turno comprometido.
  let a = await nuevaSolicitud(page, testInfo, 'Botar turno');
  await elegirTurnoAsistente(page, testInfo, 'Turno a liberar', propio);
  await escribirMotivo(a, motivoPrueba('HU-SOL-13 · no se crea'));
  await enviarYRechazar(page, testInfo, COMPROMETIDO);

  // Ofrecerlo a otra persona (oferta particular).
  await page.reload();
  await esperarQuieta(page);
  a = await nuevaSolicitud(page, testInfo, 'Oferta particular');
  await elegirTurnoAsistente(page, testInfo, 'Tu turno a ofrecer', propio);
  await elegirPersonaAsistente(page, testInfo, 'Ofrecer a', await personaDe(request, 'tercerMedico'));
  await escribirMotivo(a, motivoPrueba('HU-SOL-13 · no se crea'));
  await enviarYRechazar(page, testInfo, COMPROMETIDO);
  expect((await solicitudesDe(request, 'medico')).length, 'no se creó nada').toBe(antes);

  expect((await muta.cancelar('medico', sol.idSolicitud)).status, 'deshacer el intercambio').toBe(200);
});

testMuta('HU-SOL-13 · criterio 2: con mi turno ofrecido en un intercambio, proponer otro intercambio con él muestra el mensaje de turno comprometido que menciona cancelar', async ({ page, request, muta }, testInfo) => {
  // P-01 (17 oct): el asistente reconoce el turno propio comprometido, lo dice bajo «Turno del
  // receptor que quieres» y al enviar muestra el mensaje de R15 (antes, falla conocida).
  const { propio, sol } = await intercambioPendiente(request, muta, 'HU-SOL-13 · criterio 2 · interfaz');
  await entrar(page, 'medico');
  const a = await nuevaSolicitud(page, testInfo, 'Intercambio');
  await elegirTurnoAsistente(page, testInfo, 'Tu turno a entregar', propio);
  await elegirPersonaAsistente(page, testInfo, 'Con quién intercambiar', await personaDe(request, 'segundoMedico'));
  await expect(campoAsistente(a, testInfo, 'Turno del receptor que quieres')).toBeVisible();
  await expect(a).toContainText('No hay turnos intercambiables con el que elegiste');
  await a.getByRole('button', { name: 'Enviar solicitud' }).click();
  // Lo esperado (criterio 2): un mensaje que diga que el turno está comprometido y
  // que mencione cancelar. Se leen los textos del asistente que no son botones
  // (el pie tiene un botón «Cancelar» que no cuenta). Mientras falle, el
  // intercambio lo cancela la limpieza de testMuta.
  const mensajes = await a.evaluate((el) => [...el.querySelectorAll('div, span, p')]
    .filter((n) => !n.closest('button') && [...n.childNodes].some((c) => c.nodeType === 3 && c.textContent.trim()))
    .map((n) => n.textContent.replace(/\s+/g, ' ').trim()));
  expect(mensajes.filter((m) => /comprometid/.test(m) && /[Cc]anc[eé]l/.test(m)), `mensajes del asistente: ${mensajes.join(' | ')}`).not.toEqual([]);
  expect((await muta.cancelar('medico', sol.idSolicitud)).status, 'deshacer el intercambio').toBe(200);
});

testMuta('HU-SOL-13 · criterio 2: por API, botar, ofrecer o intercambiar un turno ya ofrecido en un intercambio se rechaza con el mensaje que menciona cancelar', async ({ request, muta }, testInfo) => {
  soloPorApi(testInfo);
  // SolicitudService.crearSolicitud (:129-138): la garantía de R15 está en el backend.
  const { propio, deseado, sol } = await intercambioPendiente(request, muta, 'HU-SOL-13 · criterio 2 · API');
  const comprometidos = await comprometidosDe(request, 'medico');
  const otroDelReceptor = (await calendarioDe(request, 'segundoMedico'))
    .find((t) => t.diaInicioTurno > hoyChile() && t.id !== deseado.id && !comprometidos.has(t.id));
  expect(otroDelReceptor, 'el médico 368 tiene otro turno futuro').toBeTruthy();
  const motivo = motivoPrueba('HU-SOL-13 · no se crea');
  const casos = [
    ['botar', { idTipoSolicitud: 2, idTurno: propio.id, motivo }, COMPROMETIDO],
    ['ofrecer', { idTipoSolicitud: 5, idTurno: propio.id, idFuncionarioReceptor: APOYO.tercerMedico.id, motivo }, COMPROMETIDO],
    ['intercambiar', { idTipoSolicitud: 4, idTurno: otroDelReceptor.id, idTurnoIntercambio: propio.id, idFuncionarioReceptor: APOYO.segundoMedico.id, motivo }, ENTREGA_COMPROMETIDA],
  ];
  for (const [accion, dto, mensaje] of casos) {
    const r = await muta.solicitar('medico', dto);
    expect(r.status, accion).toBe(400);
    expect(r.cuerpo.error, accion).toBe(mensaje);
  }
  expect((await muta.cancelar('medico', sol.idSolicitud)).status, 'deshacer el intercambio').toBe(200);
});

testMuta('HU-SOL-13 · criterio 3: otro postulante al mismo cupo no me bloquea y, si cancelé mi solicitud, puedo volver a pedir', async ({ page, request, muta }, testInfo) => {
  testInfo.annotations.push({ type: 'fase 4', description: '«Si rechazaron mi solicitud, puedo volver a pedir» necesita que la jefatura la rechace.' });
  // Un cupo que pueden pedir el médico 369 y el 368, el que muestra primero el selector en su franja.
  const delOtro = new Set((await cuposParaPedir(request, 'segundoMedico')).map((t) => t.id));
  let cupo = null;
  for (const t of await cuposParaPedir(request, 'medico')) {
    const elegido = await cupoDelSelector(request, t);
    if (delOtro.has(elegido.id) && elegido.id === t.id) { cupo = elegido; break; }
  }
  expect(cupo, 'hay un cupo libre que pueden pedir los médicos 369 y 368').toBeTruthy();
  const delSegundo = await muta.crear('segundoMedico', { idTipoSolicitud: 3, idTurno: cupo.id, motivo: motivoPrueba('HU-SOL-13 · otro postulante') });

  await entrar(page, 'medico');
  const pedir = async (etiqueta) => {
    const a = await nuevaSolicitud(page, testInfo, 'Cobertura');
    await elegirTurnoAsistente(page, testInfo, 'Turno a cubrir', cupo);
    const motivo = motivoPrueba(etiqueta);
    await escribirMotivo(a, motivo);
    const creada = await enviarYCrear(page, testInfo);
    expect(creada.turno?.idTurno, 'el mismo cupo').toBe(cupo.id);
    expect((await leerSolicitud(page, testInfo, motivo)).estado).toBe('PENDIENTE');
    return { creada, motivo };
  };
  const primera = await pedir('HU-SOL-13 · criterio 3 · primera');
  const { dialogo } = await abrirCancelacion(page, testInfo, await leerSolicitud(page, testInfo, primera.motivo));
  expect((await confirmarCancelacion(page, dialogo)).status(), 'cancelo la mía').toBe(200);
  await esperarSolicitudes(page);
  const segunda = await pedir('HU-SOL-13 · criterio 3 · otra vez');
  expect((await pendientesSobre(request, 'segundoMedico', cupo.id)).length, 'la postulación del 368 sigue pendiente').toBe(1);

  expect((await muta.cancelar('medico', segunda.creada.idSolicitud)).status, 'deshacer').toBe(200);
  expect((await muta.cancelar('segundoMedico', delSegundo.idSolicitud)).status, 'deshacer (368)').toBe(200);
});

testMuta('HU-SOL-13 · criterio 4: con dos pestañas abiertas, la segunda solicitud igual se rechaza', async ({ page, request, muta }, testInfo) => {
  const [franjaLibre] = await cuposParaPedir(request, 'medico');
  expect(franjaLibre, 'hay un cupo libre que el médico puede pedir').toBeTruthy();
  const cupo = await cupoDelSelector(request, franjaLibre);
  await entrar(page, 'medico');
  // Segunda pestaña con la misma sesión (localStorage compartido).
  const otra = await page.context().newPage();
  await otra.goto('/');
  await expect.poll(() => vistaActual(otra), { timeout: 15_000 }).toBe('agenda');
  await esperarQuieta(otra);

  // Las dos pestañas llenan la misma cobertura antes de enviar.
  for (const p of [page, otra]) {
    const a = await nuevaSolicitud(p, testInfo, 'Cobertura');
    await elegirTurnoAsistente(p, testInfo, 'Turno a cubrir', cupo);
    await escribirMotivo(a, motivoPrueba('HU-SOL-13 · dos pestañas'));
  }
  const primera = await enviarSolicitud(page, testInfo);
  expect(primera.status, 'la primera pestaña crea la solicitud').toBe(200);
  const segunda = await enviarSolicitud(otra, testInfo);
  expect(segunda.status, 'la segunda la rechaza el backend').toBe(400);
  expect(segunda.cuerpo.error).toBe(YA_SOLICITO);
  expect(await errorAsistente(otra, testInfo, /^Ud\. ya solicitó/)).toBe(YA_SOLICITO);
  expect((await pendientesSobre(request, 'medico', cupo.id)).length, 'una sola solicitud pendiente sobre el cupo').toBe(1);
  await expect(asistente(page, testInfo), 'la primera pestaña cerró el asistente').toHaveCount(0);

  expect((await muta.cancelar('medico', primera.cuerpo.idSolicitud)).status, 'deshacer').toBe(200);
});

// ═════════════════════════════════════════════════════════════════════════════
// HU-SOL-14 · Respetar el descanso post nocturno (R13)
// ═════════════════════════════════════════════════════════════════════════════

/**
 * El primer caso del día para `clasificar(cupo, calendario)` entre los cupos
 * libres de Urgencias desde mañana: primero con el médico 369, después con los
 * médicos de apoyo. Se saltan las franjas con un cupo ya pedido por la persona
 * (el backend respondería antes por R12).
 */
async function casoCobertura(request, clasificar) {
  const hoy = hoyChile();
  const libres = (await apiComo(request, 'medico', `/turnos/servicio/${SERVICIO.urgencias}/sin-asignar`))
    .filter((t) => t.diaInicioTurno > hoy).sort((x, y) => inicioDe(x).localeCompare(inicioDe(y)));
  for (const quien of QUIENES) {
    const [calendario, comprometidos] = await Promise.all([calendarioDe(request, quien), comprometidosDe(request, quien)]);
    const pedidas = new Set(libres.filter((t) => comprometidos.has(t.id)).map(franja));
    for (const cupo of libres) {
      if (pedidas.has(franja(cupo))) continue;
      const caso = clasificar(cupo, calendario);
      if (caso) return { quien, cupo, ...caso };
    }
  }
  return null;
}

/** Choque único de una regla de R13 (sin solape ni otra regla). */
const soloLaRegla = (regla) => (cupo, calendario) => {
  const choques = choquesR13(cupo, calendario);
  return choques.length === 1 && choques[0].regla === regla ? { choque: choques[0] } : null;
};

for (const [criterio, regla, descripcion] of [
  [1, 'noche-dia', 'pedir el cupo de día de la mañana en que salgo de mi noche'],
  [2, 'dia-noche', 'pedir una noche que termina la mañana en que empieza mi turno de día'],
]) {
  testMuta(`HU-SOL-14 · criterio ${criterio}: ${descripcion} (cobertura): el selector no lo ofrece y el backend lo rechaza con el mensaje de R13`, async ({ page, request, muta }, testInfo) => {
    // P-01 (17 oct): el selector de Cobertura aplica R13 en los dos sentidos, como
    // «Disponibles» (HU-SOL-05, criterio 1), así que el cupo ya no se ofrece y el
    // mensaje no se alcanza por la interfaz. La garantía es la del backend, por API.
    const caso = await casoCobertura(request, soloLaRegla(regla));
    expect(caso, `hay un cupo libre desde mañana con el caso «${regla}» para alguno de los médicos 369, 368 o 341`).toBeTruthy();
    const antes = (await solicitudesDe(request, caso.quien)).length;

    await entrar(page, caso.quien);
    const a = await nuevaSolicitud(page, testInfo, 'Cobertura');
    await campoAsistente(a, testInfo, 'Turno a cubrir').click();
    const opciones = await leerOpcionesTurno(page, testInfo);
    expect(opciones.length, 'el selector lista otros cupos').toBeGreaterThan(0);
    expect(opciones, 'el selector no ofrece el cupo').not.toContain(await claveOpcionTurno(page, caso.cupo));

    const r = await muta.solicitar(caso.quien, { idTipoSolicitud: 3, idTurno: caso.cupo.id, motivo: motivoPrueba(`HU-SOL-14 · criterio ${criterio}`) });
    expect(r.status, 'el backend rechaza la cobertura').toBe(400);
    await comprobarMensajeR13(request, r.cuerpo.error, caso.quien, regla, caso.choque.turno);
    expect((await solicitudesDe(request, caso.quien)).length, 'no se creó nada').toBe(antes);
  });
}

// Por API: el turno de día de la mañana en que una persona sale de su noche,
// recibido por intercambio u oferta particular. `emisor` es quien crea la
// solicitud; la regla se evalúa sobre `conNoche`.
async function casoEntreDos(request) {
  const hoy = hoyChile();
  const calendarios = Object.fromEntries(await Promise.all(QUIENES.map(async (q) => [q, await calendarioDe(request, q)])));
  const comprometidos = Object.fromEntries(await Promise.all(QUIENES.map(async (q) => [q, await comprometidosDe(request, q)])));
  for (const conNoche of QUIENES) {
    for (const otro of QUIENES.filter((q) => q !== conNoche)) {
      for (const turnoDia of calendarios[otro].filter((t) => !esNoche(t) && t.diaInicioTurno > hoy).sort((x, y) => inicioDe(x).localeCompare(inicioDe(y)))) {
        const choques = choquesR13(turnoDia, calendarios[conNoche]);
        if (choques.length !== 1 || choques[0].regla !== 'noche-dia') continue;
        if (comprometidos[conNoche].has(turnoDia.id) || comprometidos[otro].has(turnoDia.id)) continue;
        // Para el intercambio, un turno propio de quien sale de la noche que no sea esa noche.
        const propio = calendarios[conNoche].find((t) => t.diaInicioTurno > hoy && t.id !== choques[0].turno.id
          && !comprometidos[conNoche].has(t.id) && !esNoche(t));
        if (propio) return { conNoche, otro, turnoDia, noche: choques[0].turno, propio };
      }
    }
  }
  return null;
}

testMuta('HU-SOL-14 · criterio 1: por API, recibir por intercambio el turno de día de la mañana en que salgo de mi noche se rechaza con el mensaje de R13', async ({ request, muta }, testInfo) => {
  soloPorApi(testInfo);
  // Por la interfaz el caso ni se ofrece: /turnos/intercambiables lo descarta (R14). La garantía es la del backend.
  const caso = await casoEntreDos(request);
  expect(caso, 'hay un turno de día de un médico a la mañana en que otro sale de su noche').toBeTruthy();
  const r = await muta.solicitar(caso.conNoche, {
    idTipoSolicitud: 4, idTurno: caso.turnoDia.id, idTurnoIntercambio: caso.propio.id, idFuncionarioReceptor: idDe(caso.otro),
    motivo: motivoPrueba('HU-SOL-14 · intercambio'),
  });
  expect(r.status).toBe(400);
  await comprobarMensajeR13(request, r.cuerpo.error, caso.conNoche, 'noche-dia', caso.noche);
});

testMuta('HU-SOL-14 · criterio 1: por API, que me ofrezcan (oferta particular) el turno de día de la mañana en que salgo de mi noche se rechaza con el mensaje de R13', async ({ request, muta }, testInfo) => {
  soloPorApi(testInfo);
  const caso = await casoEntreDos(request);
  expect(caso, 'hay un turno de día de un médico a la mañana en que otro sale de su noche').toBeTruthy();
  const r = await muta.solicitar(caso.otro, {
    idTipoSolicitud: 5, idTurno: caso.turnoDia.id, idFuncionarioReceptor: idDe(caso.conNoche), motivo: motivoPrueba('HU-SOL-14 · oferta particular'),
  });
  expect(r.status).toBe(400);
  await comprobarMensajeR13(request, r.cuerpo.error, caso.conNoche, 'noche-dia', caso.noche);
});

for (const [encadenamiento, descripcion] of [
  ['24h', 'el día y la noche del mismo día (24 horas corridas)'],
  ['dos-noches', 'dos noches seguidas'],
]) {
  testMuta(`HU-SOL-14 · criterio 3: se permite pedir ${descripcion}`, async ({ page, request, muta }, testInfo) => {
    const caso = await casoCobertura(request, (cupo, calendario) => (choquesR13(cupo, calendario).length === 0
      && encadenamientoR13(cupo, calendario) === encadenamiento ? {} : null));
    expect(caso, `hay un cupo libre desde mañana que forma «${encadenamiento}» para alguno de los médicos 369, 368 o 341`).toBeTruthy();
    const cupo = await cupoDelSelector(request, caso.cupo);

    await entrar(page, caso.quien);
    const a = await nuevaSolicitud(page, testInfo, 'Cobertura');
    await elegirTurnoAsistente(page, testInfo, 'Turno a cubrir', cupo);
    const motivo = motivoPrueba(`HU-SOL-14 · criterio 3 · ${encadenamiento}`);
    await escribirMotivo(a, motivo);
    const creada = await enviarYCrear(page, testInfo);
    expect(creada.estado).toBe('PENDIENTE');
    expect((await leerSolicitud(page, testInfo, motivo)).estado).toBe('PENDIENTE');

    expect((await muta.cancelar(caso.quien, creada.idSolicitud)).status, 'deshacer').toBe(200);
  });
}
