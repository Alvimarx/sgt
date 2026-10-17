// HU de proponer y responder intercambios y ofertas particulares, fase 4 del
// catálogo docs/qa/HISTORIAS_DE_USUARIO.md (§6.2): flujos de dos o tres usuarios
// con aprobación, en móvil y en desktop.
//  - HU-SOL-06 (intercambio, R14): criterios 1 a 4 y 6. El 5 es una falla conocida
//    que ya prueba la fase 3 (ver su entrada).
//  - HU-SOL-07 (oferta particular): criterios 1 a 3.
//  - HU-SOL-08 (responder una propuesta recibida): criterios 1 a 3. El 4 es de la
//    fase 2a (permisos.spec.js).
//  - HU-SOL-14 (R13), criterio 4: la revalidación al aceptar está en HU-SOL-08
//    (criterio 3) y al aprobar, en HU-SOL-07 (criterio 3); al seleccionar al
//    postulante de una oferta, en ofertas-generales.spec.js (HU-OFE-04, criterio 3).
//
// Datos: turnos de Urgencias desde mañana sin trámites encima, del médico 369 y de
// los médicos de apoyo 368 y 341; decide la jefatura 305. Lo que mueve una
// aprobación se devuelve al final con la asignación directa (muta.devolverTurnos)
// y lo pendiente se cancela. Para que una regla falle al aceptar o al aprobar, la
// jefatura le asigna a mano al receptor un cupo que choca (la asignación directa
// solo mira el solape, C-04) y al final lo deja libre otra vez.
import {
  test, testMuta, expect, ID, APOYO, esDesktop, ahoraChile, hhmm,
  entrar, abrirSolicitudes, elegirPestana, leerSolicitud, esperarSolicitudes,
  nuevaSolicitud, campoAsistente, valorCampo, elegirTurnoAsistente, elegirPersonaAsistente, escribirMotivo,
  enviarYCrear, leerOpcionesTurno, claveOpcionTurno, apiComo, calendarioDe, personaDe, estadoSolicitud, idDe,
  motivoF4, duenoDe, fotoDelDia, intercambiosLibres, casoR13PorAsignacion, decidirEnPantalla, responderEnPantalla,
  avisoSolicitudes, comprobarMensajeR13,
  sinNombre,
} from '../helpers/hu.js';
import { inicioDe, choquesR13 } from '../helpers/datos.js';

const DECIDIR = ['Aprobar', 'Rechazar'];
const RESPONDER = ['Aceptar', 'Rechazar'];
const ESPERANDO = '⏳ Esperando respuesta del receptor';
const RECEPTOR_RECHAZO = '✕ Receptor rechazó el intercambio';
// El backend corre en UTC (§2.3): ve la hora de Chile adelantada hasta 4 horas.
// Un turno que empieza en ese margen puede faltar en sus listas sin ser un error.
const MARGEN_UTC = 4;
const sumarHoras = (instante, horas) => new Date(Date.parse(`${instante}:00Z`) + horas * 3_600_000).toISOString().slice(0, 16);
// Pares [dueño del turno, receptor] con que se buscan los casos de R13, en orden.
const PARES_R13 = [
  ['medico', 'segundoMedico'], ['medico', 'tercerMedico'], ['segundoMedico', 'medico'],
  ['tercerMedico', 'medico'], ['segundoMedico', 'tercerMedico'], ['tercerMedico', 'segundoMedico'],
];

/** Entra como `quien`, abre Solicitudes (y la pestaña, si se pide) y lee la solicitud con `motivo`. */
async function verSolicitud(page, testInfo, quien, motivo, pestana) {
  await entrar(page, quien);
  await abrirSolicitudes(page, testInfo);
  if (pestana) await elegirPestana(page, testInfo, pestana);
  return leerSolicitud(page, testInfo, motivo);
}

/** Un intercambio PENDIENTE del 369 con el 368, por API. Devuelve el par de turnos, la solicitud y su motivo. */
async function intercambioPendiente(request, muta, etiqueta) {
  const [par] = await intercambiosLibres(request, 'medico', 'segundoMedico');
  expect(par, 'hay un intercambio posible entre los médicos 369 y 368').toBeTruthy();
  const motivo = motivoF4(etiqueta);
  const sol = await muta.crear('medico', {
    idTipoSolicitud: 4, idTurno: par.deseado.id, idTurnoIntercambio: par.propio.id, idFuncionarioReceptor: APOYO.segundoMedico.id, motivo,
  });
  return { ...par, sol, motivo };
}

/** Un turno del 369 sin trámites que el 368 puede recibir (sin solape ni R13). */
async function turnoParaOfrecer(request) {
  const foto = await fotoDelDia(request, ['segundoMedico']);
  return foto.turnosDe('medico').find((t) => choquesR13(t, foto.calendario.segundoMedico).length === 0) ?? null;
}

// ═════════════════════════════════════════════════════════════════════════════
// HU-SOL-06 · Proponer un intercambio (R14)
// ═════════════════════════════════════════════════════════════════════════════

testMuta('HU-SOL-06 · criterio 1: el tercer selector aparece después de elegir receptor y lista solo los turnos del receptor que se pueden canjear', async ({ page, request, muta }, testInfo) => {
  // Lo esperado se calcula aparte del backend: turnos del receptor de Urgencias que
  // no han empezado, sin solape ni R13 para ninguno de los dos después del canje, y
  // que no estén en otra solicitud pendiente mía. Para que esto último cuente, antes
  // se crea (por API) un intercambio pendiente con otro turno mío y otro del receptor.
  const [previo] = await intercambiosLibres(request, 'medico', 'segundoMedico');
  expect(previo, 'hay un intercambio posible entre los médicos 369 y 368').toBeTruthy();
  // Otro turno mío con el que el turno del receptor ya pedido también sería canjeable.
  let propio = null;
  for (const t of (await fotoDelDia(request)).turnosDe('medico').filter((x) => x.id !== previo.propio.id)) {
    const lista = await apiComo(request, 'medico', `/turnos/intercambiables?idTurnoPropio=${t.id}&idFuncionarioReceptor=${APOYO.segundoMedico.id}`);
    if (lista.some((c) => c.id === previo.deseado.id)) { propio = t; break; }
  }
  expect(propio, 'otro turno del 369 con el que el turno ya pedido del 368 sería canjeable').toBeTruthy();
  const pendiente = await muta.crear('medico', {
    idTipoSolicitud: 4, idTurno: previo.deseado.id, idTurnoIntercambio: previo.propio.id, idFuncionarioReceptor: APOYO.segundoMedico.id,
    motivo: motivoF4('HU-SOL-06 · criterio 1 · intercambio previo'),
  });
  const [calEmisor, calReceptor, urgencias] = await Promise.all([
    calendarioDe(request, 'medico'), calendarioDe(request, 'segundoMedico'), apiComo(request, 'jefatura', '/turnos/servicio/4'),
  ]);
  const deUrgencias = new Set(urgencias.map((t) => t.id));
  const ahora = ahoraChile();
  const limite = sumarHoras(ahora, MARGEN_UTC);
  const canjeable = (c) => choquesR13(c, calEmisor.filter((t) => t.id !== propio.id)).length === 0
    && choquesR13(propio, calReceptor.filter((t) => t.id !== c.id)).length === 0;
  const candidatos = calReceptor.filter((c) => deUrgencias.has(c.id) && inicioDe(c) > limite);
  const esperados = candidatos.filter((c) => c.id !== previo.deseado.id && canjeable(c));
  expect(esperados.length, 'el receptor tiene turnos canjeables que mostrar').toBeGreaterThan(0);
  expect(canjeable(previo.deseado), 'control: el turno ya pedido sería canjeable si no estuviera comprometido').toBe(true);
  const claves = (lista) => Promise.all(lista.map((t) => claveOpcionTurno(page, t)));
  const enMargen = await claves(calReceptor.filter((c) => inicioDe(c) > ahora && inicioDe(c) <= limite));
  const yaEmpezados = await claves(calReceptor.filter((c) => inicioDe(c) <= ahora));

  await entrar(page, 'medico');
  const a = await nuevaSolicitud(page, testInfo, 'Intercambio');
  const tercero = campoAsistente(a, testInfo, 'Turno del receptor que quieres');
  await expect(tercero, 'antes de elegir nada').toHaveCount(0);
  await elegirTurnoAsistente(page, testInfo, 'Tu turno a entregar', propio);
  await expect(tercero, 'con mi turno, pero sin receptor').toHaveCount(0);
  await elegirPersonaAsistente(page, testInfo, 'Con quién intercambiar', await personaDe(request, 'segundoMedico'));
  await expect(tercero, 'después de elegir receptor').toBeVisible();
  await tercero.click();
  const vistos = await leerOpcionesTurno(page, testInfo);
  expect(vistos.filter((v) => !enMargen.includes(v)).sort(), 'turnos del receptor que se pueden canjear').toEqual((await claves(esperados)).sort());
  expect(vistos, 'el turno del receptor que ya pedí en otra solicitud').not.toContain(await claveOpcionTurno(page, previo.deseado));
  for (const pasado of yaEmpezados) expect(vistos, 'un turno que ya empezó').not.toContain(pasado);
  testInfo.annotations.push({ type: 'datos', description: `turnos futuros del receptor: ${candidatos.length}; canjeables: ${esperados.length}; `
    + `descartados por solape o R13: ${candidatos.filter((c) => !canjeable(c)).length}; ya pedido en otra solicitud: 1` });

  expect((await muta.cancelar('medico', pendiente.idSolicitud)).status, 'deshacer').toBe(200);
});

test('HU-SOL-06 · criterio 2: si la lista queda vacía, veo «No hay turnos intercambiables con el que elegiste: …» (lista vacía simulada)', async ({ page, request }, testInfo) => {
  // La respuesta de /turnos/intercambiables se reemplaza por una lista vacía (nada se
  // guarda). El caso real, con mi turno comprometido, lo prueba la fase 3
  // (reglas-solicitud.spec.js, HU-SOL-13 criterio 2 por la interfaz).
  const [par] = await intercambiosLibres(request, 'medico', 'segundoMedico');
  expect(par, 'hay un intercambio posible entre los médicos 369 y 368').toBeTruthy();
  await entrar(page, 'medico');
  await page.route(/\/api\/v2\/turnos\/intercambiables(\?|$)/, (route) => route.fulfill({ json: [] }));
  const a = await nuevaSolicitud(page, testInfo, 'Intercambio');
  await elegirTurnoAsistente(page, testInfo, 'Tu turno a entregar', par.propio);
  await elegirPersonaAsistente(page, testInfo, 'Con quién intercambiar', await personaDe(request, 'segundoMedico'));
  const nota = esDesktop(testInfo) ? a.locator('.sgt-d-campo__ayuda') : a.getByText(/^No hay turnos intercambiables/);
  await expect(nota).toBeVisible();
  expect((await nota.textContent()).replace(/\s+/g, ' ').trim().startsWith('No hay turnos intercambiables con el que elegiste: ')).toBe(true);
});

test('HU-SOL-06 · criterio 3: si cambio mi turno o el receptor, se borra el turno del receptor que ya había elegido', async ({ page, request }, testInfo) => {
  const pares = await intercambiosLibres(request, 'medico', 'segundoMedico', 2);
  expect(pares, 'hay dos intercambios posibles entre los médicos 369 y 368').toHaveLength(2);
  const [[p1, d1], [p2, d2]] = pares.map((p) => [p.propio, p.deseado]);
  const VACIO = 'Seleccionar turno';
  await entrar(page, 'medico');
  const a = await nuevaSolicitud(page, testInfo, 'Intercambio');
  const elegido = () => valorCampo(a, testInfo, 'Turno del receptor que quieres');
  const turnoMostrado = async (t) => `${await claveOpcionTurno(page, t)}`.replace('|', ' ');

  await elegirTurnoAsistente(page, testInfo, 'Tu turno a entregar', p1);
  await elegirPersonaAsistente(page, testInfo, 'Con quién intercambiar', await personaDe(request, 'segundoMedico'));
  await elegirTurnoAsistente(page, testInfo, 'Turno del receptor que quieres', d1);
  await expect.poll(elegido).toBe(await turnoMostrado(d1));
  // Cambio mi turno: se borra.
  await elegirTurnoAsistente(page, testInfo, 'Tu turno a entregar', p2);
  await expect.poll(elegido, { message: 'después de cambiar mi turno' }).toBe(VACIO);
  // Lo vuelvo a elegir y cambio el receptor: se borra otra vez.
  await elegirTurnoAsistente(page, testInfo, 'Turno del receptor que quieres', d2);
  await expect.poll(elegido).toBe(await turnoMostrado(d2));
  await elegirPersonaAsistente(page, testInfo, 'Con quién intercambiar', await personaDe(request, 'tercerMedico'));
  await expect.poll(elegido, { message: 'después de cambiar el receptor' }).toBe(VACIO);
});

testMuta('HU-SOL-06 · criterio 4: al enviar queda PENDIENTE «Esperando respuesta del receptor», y el receptor la ve en «Recibidas» con «Requiere tu respuesta»', async ({ page, request, muta }, testInfo) => {
  const [par] = await intercambiosLibres(request, 'medico', 'segundoMedico');
  expect(par, 'hay un intercambio posible entre los médicos 369 y 368').toBeTruthy();
  await entrar(page, 'medico');
  const a = await nuevaSolicitud(page, testInfo, 'Intercambio');
  await elegirTurnoAsistente(page, testInfo, 'Tu turno a entregar', par.propio);
  await elegirPersonaAsistente(page, testInfo, 'Con quién intercambiar', await personaDe(request, 'segundoMedico'));
  await elegirTurnoAsistente(page, testInfo, 'Turno del receptor que quieres', par.deseado);
  const motivo = motivoF4('HU-SOL-06 · criterio 4');
  await escribirMotivo(a, motivo);
  const creada = await enviarYCrear(page, testInfo);
  expect([creada.tipoSolicitud?.tipo, creada.turno?.idTurno, creada.turnoReceptor?.idTurno, creada.funcionarioReceptor?.idFuncionario],
    'intercambio: pido el turno del receptor y entrego el mío').toEqual([4, par.deseado.id, par.propio.id, APOYO.segundoMedico.id]);

  const mia = await leerSolicitud(page, testInfo, motivo);
  expect([mia.titulo, mia.estado]).toEqual(['Intercambio', 'PENDIENTE']);
  expect(mia.notas.some((n) => n.startsWith(ESPERANDO)), `nota «${ESPERANDO}»`).toBe(true);

  const recibida = await verSolicitud(page, testInfo, 'segundoMedico', motivo, 'Recibidas');
  expect(recibida.estado).toBe('Requiere tu respuesta');
  expect(recibida.botones.filter((b) => RESPONDER.includes(b))).toEqual(['Rechazar', 'Aceptar']);

  expect((await muta.cancelar('medico', creada.idSolicitud)).status, 'deshacer').toBe(200);
});

test('HU-SOL-06 · criterio 5: si mi turno ya está comprometido, veo el mensaje de R15 que pide cancelar', async () => {
  test.skip(true, 'Falla conocida (HU-SOL-06, Estado; §5.1 y §6.3) que ya prueba la fase 3 por la interfaz y por API: reglas-solicitud.spec.js, HU-SOL-13 criterio 2.');
});

testMuta('HU-SOL-06 · criterio 6: al aprobarse, los turnos se cruzan entre los dos', async ({ page, request, muta }, testInfo) => {
  const { propio, deseado, sol, motivo } = await intercambioPendiente(request, muta, 'HU-SOL-06 · criterio 6');
  expect((await muta.responder('segundoMedico', sol, true)).status, 'el 368 acepta').toBe(200);
  await muta.recordarTurnos(propio, deseado);

  const vista = await verSolicitud(page, testInfo, 'jefatura', motivo);
  const r = await decidirEnPantalla(page, vista, 'Aprobar');
  expect(r.status, 'la jefatura lo aprueba').toBe(200);
  await esperarSolicitudes(page);
  expect([await duenoDe(request, deseado.id), await duenoDe(request, propio.id)], 'el 369 recibe el turno pedido y el 368 el entregado')
    .toEqual([ID.medico, APOYO.segundoMedico.id]);
  expect((await verSolicitud(page, testInfo, 'medico', motivo)).estado, 'el 369 lo ve aprobado').toBe('APROBADA');

  expect((await muta.devolverTurnos()).sort(), 'deshacer: cada turno vuelve a su dueño').toEqual([propio.id, deseado.id].sort());
});

// ═════════════════════════════════════════════════════════════════════════════
// HU-SOL-07 · Ceder un turno a una persona (Oferta particular)
// ═════════════════════════════════════════════════════════════════════════════

testMuta('HU-SOL-07 · criterio 1: al enviar, la oferta particular queda PENDIENTE, esperando al receptor', async ({ page, request, muta }, testInfo) => {
  const turno = await turnoParaOfrecer(request);
  expect(turno, 'el 369 tiene un turno que el 368 puede recibir').toBeTruthy();
  await entrar(page, 'medico');
  const a = await nuevaSolicitud(page, testInfo, 'Oferta particular');
  await elegirTurnoAsistente(page, testInfo, 'Tu turno a ofrecer', turno);
  await elegirPersonaAsistente(page, testInfo, 'Ofrecer a', await personaDe(request, 'segundoMedico'));
  const motivo = motivoF4('HU-SOL-07 · criterio 1');
  await escribirMotivo(a, motivo);
  const creada = await enviarYCrear(page, testInfo);
  expect([creada.tipoSolicitud?.tipo, creada.turno?.idTurno, creada.funcionarioReceptor?.idFuncionario, creada.aceptadoReceptor])
    .toEqual([5, turno.id, APOYO.segundoMedico.id, null]);

  const vista = await leerSolicitud(page, testInfo, motivo);
  expect([vista.titulo, vista.estado]).toEqual(['Oferta particular', 'PENDIENTE']);
  expect(vista.notas.some((n) => n.startsWith(ESPERANDO)), `nota «${ESPERANDO}»`).toBe(true);
  expect(vista.filas['Turno ofrecido']).toContain(`${hhmm(turno.horaInicio)}–${hhmm(turno.horaFin)}`);

  expect((await muta.cancelar('medico', creada.idSolicitud)).status, 'deshacer').toBe(200);
});

testMuta('HU-SOL-07 · criterio 2: cuando el receptor acepta queda «Pend. jefatura» y, cuando la jefatura aprueba, el turno pasa al receptor', async ({ page, request, muta }, testInfo) => {
  const turno = await turnoParaOfrecer(request);
  expect(turno, 'el 369 tiene un turno que el 368 puede recibir').toBeTruthy();
  const motivo = motivoF4('HU-SOL-07 · criterio 2');
  await muta.crear('medico', { idTipoSolicitud: 5, idTurno: turno.id, idFuncionarioReceptor: APOYO.segundoMedico.id, motivo });
  await muta.recordarTurnos(turno);

  // El receptor acepta en su pantalla.
  const recibida = await verSolicitud(page, testInfo, 'segundoMedico', motivo, 'Recibidas');
  expect((await responderEnPantalla(page, recibida, 'Aceptar')).status, 'el 368 acepta').toBe(200);
  await esperarSolicitudes(page);
  expect((await leerSolicitud(page, testInfo, motivo)).estado, 'el receptor la ve aceptada').toBe('Aceptada · Pend. jefatura');
  expect((await verSolicitud(page, testInfo, 'medico', motivo)).estado, 'el emisor la ve pendiente de la jefatura').toBe('Pend. jefatura');

  // La jefatura aprueba: el turno pasa al receptor.
  const vista = await verSolicitud(page, testInfo, 'jefatura', motivo);
  expect(vista.estado).toBe('Pend. jefatura');
  expect((await decidirEnPantalla(page, vista, 'Aprobar')).status, 'la jefatura la aprueba').toBe(200);
  await esperarSolicitudes(page);
  expect(await duenoDe(request, turno.id), 'el turno pasa al 368').toBe(APOYO.segundoMedico.id);

  expect(await muta.devolverTurnos(), 'deshacer: el turno vuelve al 369').toEqual([turno.id]);
});

testMuta('HU-SOL-07 · criterio 3: si al aprobar el receptor quedaría con una noche seguida de día, veo el mensaje de la regla y sigue PENDIENTE', async ({ page, request, muta }, testInfo) => {
  // También es HU-SOL-14, criterio 4 («la regla se revalida al aprobar»). La oferta
  // era válida al crearla y al aceptarla; después la jefatura le asigna a mano al
  // receptor un cupo que choca por R13 con el turno ofrecido.
  const caso = await casoR13PorAsignacion(request, PARES_R13);
  expect(caso, 'hay un turno de un médico y un cupo libre que, asignado a otro médico, le choca por R13').toBeTruthy();
  const { dueno, receptor, turno, cupo, regla } = caso;
  const motivo = motivoF4('HU-SOL-07 · criterio 3');
  const sol = await muta.crear(dueno, { idTipoSolicitud: 5, idTurno: turno.id, idFuncionarioReceptor: idDe(receptor), motivo });
  expect((await muta.responder(receptor, sol, true)).status, 'el receptor acepta').toBe(200);
  await muta.recordarTurnos(turno);
  expect((await muta.alterar('jefatura', { idTurno: cupo.id, accion: 'ASIGNAR', idNuevoMedico: idDe(receptor) })).status, 'asignación directa del cupo que choca').toBe(200);

  const vista = await verSolicitud(page, testInfo, 'jefatura', motivo);
  const r = await decidirEnPantalla(page, vista, 'Aprobar');
  expect(r.status, 'el backend rechaza la aprobación').toBe(400);
  await comprobarMensajeR13(request, r.cuerpo.error, receptor, regla, cupo);
  expect(sinNombre(await avisoSolicitudes(page, testInfo, /^No es posible asignar el turno a /)), 'la vista muestra el mensaje').toBe(sinNombre(r.cuerpo.error));
  expect((await estadoSolicitud(request, dueno, sol.idSolicitud)).estado, 'sigue pendiente').toBe('PENDIENTE');
  expect(await duenoDe(request, turno.id), 'el turno sigue con su dueño').toBe(idDe(dueno));

  expect(await muta.devolverTurnos(), 'deshacer: el cupo vuelve a quedar libre').toEqual([cupo.id]);
  expect((await muta.cancelar(dueno, sol.idSolicitud)).status, 'deshacer').toBe(200);
});

// ═════════════════════════════════════════════════════════════════════════════
// HU-SOL-08 · Responder una propuesta recibida
// ═════════════════════════════════════════════════════════════════════════════

testMuta('HU-SOL-08 · criterio 1: solo el receptor ve «Aceptar» y «Rechazar», y solo mientras está PENDIENTE y sin respuesta', async ({ page, request, muta }, testInfo) => {
  const { sol, motivo } = await intercambioPendiente(request, muta, 'HU-SOL-08 · criterio 1');
  const responder = (v) => v.botones.filter((b) => RESPONDER.includes(b));

  expect(responder(await verSolicitud(page, testInfo, 'segundoMedico', motivo, 'Recibidas')), 'el receptor').toEqual(['Rechazar', 'Aceptar']);
  expect(responder(await verSolicitud(page, testInfo, 'medico', motivo)), 'el emisor').toEqual([]);
  const jefatura = await verSolicitud(page, testInfo, 'jefatura', motivo);
  expect(jefatura.botones.filter((b) => [...RESPONDER, ...DECIDIR].includes(b)), 'la jefatura (espera al receptor)').toEqual([]);

  // Ya respondida (acepta por API), el receptor no vuelve a ver los botones.
  expect((await muta.responder('segundoMedico', sol, true)).status, 'el 368 acepta').toBe(200);
  const respondida = await verSolicitud(page, testInfo, 'segundoMedico', motivo, 'Recibidas');
  expect(respondida.estado).toBe('Aceptada · Pend. jefatura');
  expect(responder(respondida), 'ya respondida').toEqual([]);

  expect((await muta.cancelar('medico', sol.idSolicitud)).status, 'deshacer').toBe(200);
});

testMuta('HU-SOL-08 · criterio 2: aceptar la deja PENDIENTE «Aceptada · Pend. jefatura»; rechazar la deja RECHAZADA con «Receptor rechazó el intercambio»', async ({ page, request, muta }, testInfo) => {
  const pares = await intercambiosLibres(request, 'medico', 'segundoMedico', 2);
  expect(pares, 'hay dos intercambios posibles entre los médicos 369 y 368').toHaveLength(2);
  const creadas = [];
  for (const [i, par] of pares.entries()) {
    const motivo = motivoF4(`HU-SOL-08 · criterio 2 · ${i === 0 ? 'acepta' : 'rechaza'}`);
    creadas.push({ motivo, sol: await muta.crear('medico', {
      idTipoSolicitud: 4, idTurno: par.deseado.id, idTurnoIntercambio: par.propio.id, idFuncionarioReceptor: APOYO.segundoMedico.id, motivo,
    }) });
  }
  const [aceptada, rechazada] = creadas;

  let vista = await verSolicitud(page, testInfo, 'segundoMedico', aceptada.motivo, 'Recibidas');
  expect((await responderEnPantalla(page, vista, 'Aceptar')).status, 'aceptar').toBe(200);
  await esperarSolicitudes(page);
  vista = await leerSolicitud(page, testInfo, aceptada.motivo);
  expect(vista.estado).toBe('Aceptada · Pend. jefatura');
  const enBaseA = await estadoSolicitud(request, 'medico', aceptada.sol.idSolicitud);
  expect([enBaseA.estado, enBaseA.aceptadoReceptor]).toEqual(['PENDIENTE', true]);

  vista = await leerSolicitud(page, testInfo, rechazada.motivo);
  expect((await responderEnPantalla(page, vista, 'Rechazar')).status, 'rechazar').toBe(200);
  await esperarSolicitudes(page);
  vista = await leerSolicitud(page, testInfo, rechazada.motivo);
  expect(vista.estado).toBe('RECHAZADA');
  expect(vista.notas, `nota «${RECEPTOR_RECHAZO}»`).toContain(RECEPTOR_RECHAZO);
  const enBaseR = await estadoSolicitud(request, 'medico', rechazada.sol.idSolicitud);
  expect([enBaseR.estado, enBaseR.aceptadoReceptor]).toEqual(['RECHAZADA', false]);
  // El emisor también lo ve.
  expect((await verSolicitud(page, testInfo, 'medico', rechazada.motivo)).notas).toContain(RECEPTOR_RECHAZO);

  expect((await muta.cancelar('medico', aceptada.sol.idSolicitud)).status, 'deshacer').toBe(200);
});

testMuta('HU-SOL-08 · criterio 3: aceptar revalida R13: si falla, veo el mensaje del backend y la propuesta sigue sin respuesta', async ({ page, request, muta }, testInfo) => {
  // También es HU-SOL-14, criterio 4 («la regla se revalida al aceptar»). La oferta
  // particular era válida al crearla; después la jefatura le asigna a mano al
  // receptor un cupo que choca por R13 con el turno ofrecido.
  const caso = await casoR13PorAsignacion(request, PARES_R13);
  expect(caso, 'hay un turno de un médico y un cupo libre que, asignado a otro médico, le choca por R13').toBeTruthy();
  const { dueno, receptor, turno, cupo, regla } = caso;
  const motivo = motivoF4('HU-SOL-08 · criterio 3');
  const sol = await muta.crear(dueno, { idTipoSolicitud: 5, idTurno: turno.id, idFuncionarioReceptor: idDe(receptor), motivo });
  await muta.recordarTurnos(turno);
  expect((await muta.alterar('jefatura', { idTurno: cupo.id, accion: 'ASIGNAR', idNuevoMedico: idDe(receptor) })).status, 'asignación directa del cupo que choca').toBe(200);

  const vista = await verSolicitud(page, testInfo, receptor, motivo, 'Recibidas');
  const r = await responderEnPantalla(page, vista, 'Aceptar');
  expect(r.status, 'el backend rechaza la aceptación').toBe(400);
  await comprobarMensajeR13(request, r.cuerpo.error, receptor, regla, cupo);
  expect(sinNombre(await avisoSolicitudes(page, testInfo, /^No es posible asignar el turno a /)), 'la vista muestra el mensaje').toBe(sinNombre(r.cuerpo.error));
  const enBase = await estadoSolicitud(request, dueno, sol.idSolicitud);
  expect([enBase.estado, enBase.aceptadoReceptor], 'sigue pendiente y sin respuesta').toEqual(['PENDIENTE', null]);

  expect(await muta.devolverTurnos(), 'deshacer: el cupo vuelve a quedar libre').toEqual([cupo.id]);
  expect((await muta.cancelar(dueno, sol.idSolicitud)).status, 'deshacer').toBe(200);
});

// ═════════════════════════════════════════════════════════════════════════════
// HU-SOL-14 · Respetar el descanso post nocturno (R13)
// ═════════════════════════════════════════════════════════════════════════════

test('HU-SOL-14 · criterio 4: la regla se revalida al aceptar, al aprobar y al seleccionar al postulante', async () => {
  test.skip(true, 'Se prueba en cada punto, con un cupo que la jefatura asigna a mano después de crear: al aceptar en HU-SOL-08 (criterio 3) y al aprobar en '
    + 'HU-SOL-07 (criterio 3), en este archivo; al seleccionar al postulante en HU-OFE-04 (criterio 3), en ofertas-generales.spec.js.');
});
