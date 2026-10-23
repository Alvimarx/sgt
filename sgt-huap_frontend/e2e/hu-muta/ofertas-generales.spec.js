// HU de las ofertas generales con su apertura, postulación y selección, fase 4 del
// catálogo docs/qa/HISTORIAS_DE_USUARIO.md (§6.2): flujos de dos o tres usuarios,
// en móvil y en desktop.
//  - HU-OFE-01, criterio 2, con la apertura real (la fase 3 lo probó con una
//    respuesta simulada). Criterios 3 y 4: el ofertor retira su oferta abierta
//    hasta que alguien postule (decisión del 20 oct sobre C-16).
//  - HU-OFE-02 (abrir o rechazar), criterio 1. El 2 y el 3 son de la fase 2a
//    (permisos.spec.js).
//  - HU-OFE-03 (postular y retirar): criterios 1 a 3.
//  - HU-OFE-04 (seleccionar al postulante): criterios 1 a 4. El 3 es también
//    HU-SOL-14, criterio 4 («la regla se revalida al seleccionar al postulante»).
//
// Datos: el ofertor es el médico de apoyo 341 (o el 368 en el caso de R13), nunca
// el 369: la fase 3 publica ofertas sobre sus turnos y las elige entre los que no
// tienen una oferta suya. Cada oferta se crea por API sobre un turno sin trámites y,
// salvo la que se rechaza, termina CERRADA: si quedó abierta, el 368 postula y la
// jefatura lo elige (cerrarOferta), y el turno vuelve a su dueño con la asignación
// directa. Así el turno sirve otra vez en la corrida siguiente. Las ofertas no se
// borran: quedan CERRADAS, RECHAZADAS o RETIRADAS («no se deshace»); las que
// retira su ofertor (criterios 3 y 4 de HU-OFE-01) no mueven ningún turno.
import {
  test, testMuta, expect, ID, APOYO, esDesktop, soloPorApi, hhmm,
  entrar, abrirSolicitudes, elegirPestana, leerSolicitud, esperarSolicitudes, fechaCL, idDe,
  motivoF4, duenoDe, fotoDelDia, ofertasDeUrgencias, casoR13PorAsignacion, pulsarYEsperar, RUTA_OFERTA,
  abrirSeleccion, avisoSolicitudes, comprobarMensajeR13, itemMenu, esperarQuieta,
  abrirRetiroOferta, confirmarRetiroOferta,
  sinNombre,
} from '../helpers/hu.js';
import { choquesR13, nombreSolicitud } from '../helpers/datos.js';

const DECIDIR = ['Aprobar', 'Rechazar'];
const OFERTA_ABIERTA_TEXTO = /^Tu oferta está abierta · /;

/** Entra como `quien`, abre «Ofertas generales» en Solicitudes y lee la oferta con `motivo`. */
async function verOferta(page, testInfo, quien, motivo) {
  await entrar(page, quien);
  await abrirSolicitudes(page, testInfo);
  await elegirPestana(page, testInfo, 'Ofertas generales');
  return leerSolicitud(page, testInfo, motivo);
}

/** Un turno del `ofertor` sin trámites que cada uno de `postulantes` puede tomar hoy (sin solape ni R13). */
async function turnoParaOfertar(request, { ofertor = 'tercerMedico', postulantes = ['segundoMedico'], excepto = [] } = {}) {
  const foto = await fotoDelDia(request, postulantes);
  return foto.turnosDe(ofertor).find((t) => !excepto.includes(t.id) && postulantes.every((p) => choquesR13(t, foto.calendario[p]).length === 0)) ?? null;
}

/** Oferta general del 341 sobre un turno suyo, publicada y abierta por API. Devuelve { oferta, turno, motivo }. */
async function ofertaAbierta(request, muta, etiqueta, opciones) {
  const turno = await turnoParaOfertar(request, opciones);
  expect(turno, 'el 341 tiene un turno sin trámites que los postulantes pueden tomar').toBeTruthy();
  const motivo = motivoF4(etiqueta);
  const oferta = await muta.ofertar('tercerMedico', turno.id, motivo);
  expect((await muta.abrirOferta('jefatura', oferta.idOfertaGeneral)).status, 'la jefatura la abre').toBe(200);
  return { oferta, turno, motivo };
}

/**
 * Cierra una oferta abierta: `postulante` postula (si no lo había hecho) y la
 * jefatura lo selecciona, por API; el turno, que pasa a él, vuelve a su dueño con
 * la asignación directa (devolverTurnos). La oferta queda CERRADA.
 */
async function cerrarOferta(request, muta, { oferta, turno }, postulante = 'segundoMedico') {
  await muta.recordarTurnos(turno);
  const actual = (await ofertasDeUrgencias(request)).get(oferta.idOfertaGeneral);
  let postulacion = actual.postulaciones.find((p) => p.postulante?.idFuncionario === idDe(postulante));
  if (!postulacion) {
    const r = await muta.postular(postulante, oferta.idOfertaGeneral);
    expect(r.status, `el ${idDe(postulante)} postula para cerrarla`).toBe(200);
    postulacion = r.cuerpo;
  }
  expect((await muta.seleccionar('jefatura', oferta.idOfertaGeneral, postulacion.idPostulacion)).status, 'la jefatura la cierra').toBe(200);
  expect(await muta.devolverTurnos(), 'deshacer: el turno vuelve al ofertor').toContain(turno.id);
}

/** Postulantes de la oferta en pantalla de la gestión: el título «Postulantes (N)» y los botones «Seleccionar». */
const seccionPostulantes = (vista, testInfo) => (esDesktop(testInfo)
  ? vista.zona.locator('section[aria-label^="Postulantes ("]')
  : vista.zona.getByText(/^Postulantes \(\d+\)$/).locator('xpath=..'));

// ═════════════════════════════════════════════════════════════════════════════
// HU-OFE-01 · Publicar una oferta general de mi turno (apertura real)
// ═════════════════════════════════════════════════════════════════════════════

testMuta('HU-OFE-01 · criterio 2: abierta por la jefatura, en mi oferta no veo «Postular» y veo «Tu oferta está abierta · N postulantes»', async ({ page, request, muta }, testInfo) => {
  const caso = await ofertaAbierta(request, muta, 'HU-OFE-01 · criterio 2');
  let vista = await verOferta(page, testInfo, 'tercerMedico', caso.motivo);
  expect(vista.estado).toBe('Abierta');
  expect(vista.botones, 'el ofertor no postula a su oferta').not.toContain('Postular');
  await expect(vista.zona.getByText(OFERTA_ABIERTA_TEXTO)).toHaveText('Tu oferta está abierta · 0 postulantes');

  expect((await muta.postular('segundoMedico', caso.oferta.idOfertaGeneral)).status, 'postula el 368').toBe(200);
  vista = await verOferta(page, testInfo, 'tercerMedico', caso.motivo);
  await expect(vista.zona.getByText(OFERTA_ABIERTA_TEXTO)).toHaveText('Tu oferta está abierta · 1 postulante');

  await cerrarOferta(request, muta, caso);
});

testMuta('HU-OFE-01 · criterio 3: abierta y sin postulantes, el ofertor la retira: queda RETIRADA y el turno sigue siendo suyo', async ({ page, request, muta }, testInfo) => {
  // Decisión del 20 oct (sobre C-16): se retira hasta que alguien postule, no solo mientras espera apertura.
  const caso = await ofertaAbierta(request, muta, 'HU-OFE-01 · criterio 3');
  const vista = await verOferta(page, testInfo, 'tercerMedico', caso.motivo);
  expect(vista.estado).toBe('Abierta');
  expect(vista.botones, 'nadie ha postulado: el ofertor puede retirarla').toContain('Retirar oferta');
  const { dialogo, texto } = await abrirRetiroOferta(page, testInfo, vista);
  expect(texto).toContain('Se retirará tu oferta general: dejará de estar abierta, nadie podrá postular y el turno sigue siendo tuyo.');
  const r = await confirmarRetiroOferta(page, dialogo);
  expect(r.status(), 'PUT /retirar').toBe(200);
  await esperarSolicitudes(page);

  expect((await ofertasDeUrgencias(request)).get(caso.oferta.idOfertaGeneral)?.estado, 'la oferta queda RETIRADA').toBe('RETIRADA');
  expect(await duenoDe(request, caso.turno.id), 'el turno sigue siendo del ofertor').toBe(idDe('tercerMedico'));
});

testMuta('HU-OFE-01 · criterio 4: con una postulación el ofertor ya no puede retirarla (409); si quien postuló se retira, vuelve a poder', async ({ page, request, muta }, testInfo) => {
  const caso = await ofertaAbierta(request, muta, 'HU-OFE-01 · criterio 4');
  const id = caso.oferta.idOfertaGeneral;
  const postulacion = await muta.postular('segundoMedico', id);
  expect(postulacion.status, 'postula el 368').toBe(200);

  // Con una postulación: la pantalla no ofrece «Retirar oferta» y el backend lo niega, sin tocar la oferta.
  let vista = await verOferta(page, testInfo, 'tercerMedico', caso.motivo);
  await expect(vista.zona.getByText(OFERTA_ABIERTA_TEXTO)).toHaveText('Tu oferta está abierta · 1 postulante');
  expect(vista.botones, 'con una postulación no puede retirarla').not.toContain('Retirar oferta');
  const negada = await muta.retirarOferta('tercerMedico', id);
  expect([negada.status, negada.cuerpo?.error], 'el ofertor por API').toEqual([409, 'La oferta ya tiene postulaciones: no se puede retirar']);
  expect((await ofertasDeUrgencias(request)).get(id).estado, 'sigue abierta').toBe('ABIERTA');

  // Si la única postulación se retira, la oferta queda sin postulaciones y vuelve a poder retirarse.
  expect((await muta.retirarPostulacion('segundoMedico', id, postulacion.cuerpo.idPostulacion)).status, 'el 368 se retira').toBe(204);
  vista = await verOferta(page, testInfo, 'tercerMedico', caso.motivo);
  expect(vista.botones, 'sin postulaciones puede retirarla otra vez').toContain('Retirar oferta');

  // Deshacer: la retira su ofertor.
  expect((await muta.retirarOferta('tercerMedico', id)).status, 'deshacer: la retira su ofertor').toBe(200);
  expect((await ofertasDeUrgencias(request)).get(id).estado, 'queda RETIRADA').toBe('RETIRADA');
});

// ═════════════════════════════════════════════════════════════════════════════
// HU-OFE-02 · Abrir o rechazar una oferta (gestión)
// ═════════════════════════════════════════════════════════════════════════════

testMuta('HU-OFE-02 · criterio 1: en una oferta «Pend. apertura», «Aprobar» la deja «Abierta» y «Rechazar» la deja RECHAZADA (y fuera de la lista, C-16)', async ({ page, request, muta }, testInfo) => {
  const t1 = await turnoParaOfertar(request);
  const t2 = await turnoParaOfertar(request, { excepto: [t1?.id] });
  expect(t1 && t2, 'el 341 tiene dos turnos sin trámites').toBeTruthy();
  const [abrir, rechazar] = [motivoF4('HU-OFE-02 · criterio 1 · se abre'), motivoF4('HU-OFE-02 · criterio 1 · se rechaza')];
  const ofertaAbrir = await muta.ofertar('tercerMedico', t1.id, abrir);
  const ofertaRechazar = await muta.ofertar('tercerMedico', t2.id, rechazar);

  for (const [motivo, accion] of [[abrir, 'Aprobar'], [rechazar, 'Rechazar']]) {
    const vista = await verOferta(page, testInfo, 'jefatura', motivo);
    expect(vista.estado).toBe('Pend. apertura');
    expect(vista.botones.filter((b) => DECIDIR.includes(b))).toEqual(['Rechazar', 'Aprobar']);
    const r = await pulsarYEsperar(page, vista.zona.getByRole('button', { name: accion, exact: true }), RUTA_OFERTA);
    expect(r.status, accion).toBe(200);
    await esperarSolicitudes(page);
  }
  // Aprobada: queda «Abierta» y sin los botones de apertura.
  const abierta = await leerSolicitud(page, testInfo, abrir);
  expect(abierta.estado, 'después de Aprobar').toBe('Abierta');
  expect(abierta.botones.filter((b) => DECIDIR.includes(b)), 'solo en ofertas pendientes de apertura').toEqual([]);
  // Rechazada: queda RECHAZADA y, desde C-16 (17 oct), la pestaña ya no la muestra
  // (las rechazadas no son ofertas vigentes; antes se veía como «Rechazada»).
  const estados = await ofertasDeUrgencias(request);
  expect([estados.get(ofertaAbrir.idOfertaGeneral).estado, estados.get(ofertaRechazar.idOfertaGeneral).estado]).toEqual(['ABIERTA', 'RECHAZADA']);
  if (esDesktop(testInfo)) {
    await page.getByRole('searchbox').fill(rechazar);
    await expect(page.getByRole('listbox').getByRole('option'), 'la rechazada no se lista').toHaveCount(0);
  } else {
    await expect(page.locator('.sgt-list-row').filter({ hasText: rechazar }), 'la rechazada no se lista').toHaveCount(0);
  }

  await cerrarOferta(request, muta, { oferta: ofertaAbrir, turno: t1 });
});

testMuta('HU-OFE-02 · criterio 1: en el Centro, «Aprobar apertura» la abre con «Oferta abierta al servicio.»', async ({ page, request, muta }, testInfo) => {
  test.skip(!esDesktop(testInfo), 'El Centro de operaciones es el inicio de desktop.');
  const turno = await turnoParaOfertar(request);
  expect(turno, 'el 341 tiene un turno sin trámites').toBeTruthy();
  const motivo = motivoF4('HU-OFE-02 · criterio 1 · Centro');
  const oferta = await muta.ofertar('tercerMedico', turno.id, motivo);
  await entrar(page, 'jefatura');
  await itemMenu(page, 'Centro de turnos').click();
  await esperarQuieta(page);
  const tarjeta = page.getByRole('region', { name: 'Disponibles' }).getByText(`“${motivo}”`, { exact: true }).locator('xpath=..');
  await expect(tarjeta).toContainText('Pend. apertura');
  const r = await pulsarYEsperar(page, tarjeta.getByRole('button', { name: 'Aprobar apertura' }), RUTA_OFERTA);
  expect(r.status).toBe(200);
  await expect(page.getByText('Oferta abierta al servicio.', { exact: true })).toBeVisible();
  await expect(tarjeta).toContainText('Abierta');
  expect((await ofertasDeUrgencias(request)).get(oferta.idOfertaGeneral).estado).toBe('ABIERTA');

  await cerrarOferta(request, muta, { oferta, turno });
});

// ═════════════════════════════════════════════════════════════════════════════
// HU-OFE-03 · Postular y retirar mi postulación
// ═════════════════════════════════════════════════════════════════════════════

/** Botón «Postular» o «Retirar» de una oferta leída con leerSolicitud. */
const boton = (vista, nombre) => vista.zona.getByRole('button', { name: nombre, exact: true });
/** ¿La oferta muestra la marca «Postulado»? (en desktop es una nota; en móvil, una etiqueta). */
const marcaPostulado = (vista) => vista.zona.getByText('Postulado', { exact: true });

testMuta('HU-OFE-03 · criterio 1: en una oferta abierta de otra persona veo «Postular»; al postular veo «Postulado» y «Retirar»', async ({ page, request, muta }, testInfo) => {
  const caso = await ofertaAbierta(request, muta, 'HU-OFE-03 · criterio 1', { postulantes: ['medico', 'segundoMedico'] });
  let vista = await verOferta(page, testInfo, 'medico', caso.motivo);
  expect(vista.estado).toBe('Abierta');
  await expect(boton(vista, 'Postular')).toBeVisible();
  await expect(marcaPostulado(vista)).toHaveCount(0);
  const r = await pulsarYEsperar(page, boton(vista, 'Postular'), RUTA_OFERTA);
  expect(r.status, 'postular').toBe(200);
  await esperarSolicitudes(page);
  vista = await leerSolicitud(page, testInfo, caso.motivo);
  await expect(marcaPostulado(vista)).toBeVisible();
  await expect(boton(vista, 'Retirar')).toBeVisible();
  await expect(boton(vista, 'Postular')).toHaveCount(0);
  const postulantes = (await ofertasDeUrgencias(request)).get(caso.oferta.idOfertaGeneral).postulaciones.map((p) => p.postulante?.idFuncionario);
  expect(postulantes, 'en la base').toEqual([ID.medico]);

  expect((await muta.retirarPostulacion('medico', caso.oferta.idOfertaGeneral, r.cuerpo.idPostulacion)).status, 'deshacer: se retira').toBe(204);
  await cerrarOferta(request, muta, caso);
});

testMuta('HU-OFE-03 · criterio 2: al retirarme, vuelve «Postular»', async ({ page, request, muta }, testInfo) => {
  const caso = await ofertaAbierta(request, muta, 'HU-OFE-03 · criterio 2', { postulantes: ['medico', 'segundoMedico'] });
  expect((await muta.postular('medico', caso.oferta.idOfertaGeneral)).status, 'el 369 postula (por API)').toBe(200);
  let vista = await verOferta(page, testInfo, 'medico', caso.motivo);
  await expect(marcaPostulado(vista)).toBeVisible();
  const r = await pulsarYEsperar(page, boton(vista, 'Retirar'), RUTA_OFERTA);
  expect(r.status, 'retirar').toBe(204);
  await esperarSolicitudes(page);
  vista = await leerSolicitud(page, testInfo, caso.motivo);
  await expect(boton(vista, 'Postular')).toBeVisible();
  await expect(marcaPostulado(vista)).toHaveCount(0);
  await expect(boton(vista, 'Retirar')).toHaveCount(0);
  expect((await ofertasDeUrgencias(request)).get(caso.oferta.idOfertaGeneral).postulaciones, 'sin postulaciones en la base').toEqual([]);

  await cerrarOferta(request, muta, caso);
});

testMuta('HU-OFE-03 · criterio 3: no puedo postular a mi propia oferta ni dos veces a la misma', async ({ page, request, muta }, testInfo) => {
  const caso = await ofertaAbierta(request, muta, 'HU-OFE-03 · criterio 3', { postulantes: ['medico', 'segundoMedico'] });
  const id = caso.oferta.idOfertaGeneral;
  // Mi propia oferta: la pantalla no ofrece «Postular» y el backend lo niega.
  const propia = await verOferta(page, testInfo, 'tercerMedico', caso.motivo);
  await expect(boton(propia, 'Postular')).toHaveCount(0);
  const r1 = await muta.postular('tercerMedico', id);
  expect([r1.status, r1.cuerpo?.error], 'el ofertor por API').toEqual([400, 'El ofertor no puede postular a su propia oferta']);
  // Dos veces: después de postular, la pantalla ya no ofrece «Postular» y el backend niega la segunda.
  expect((await muta.postular('medico', id)).status, 'primera postulación del 369').toBe(200);
  const vista = await verOferta(page, testInfo, 'medico', caso.motivo);
  await expect(marcaPostulado(vista)).toBeVisible();
  await expect(boton(vista, 'Postular')).toHaveCount(0);
  const r2 = await muta.postular('medico', id);
  expect([r2.status, r2.cuerpo?.error], 'segunda postulación por API').toEqual([400, 'Ya existe una postulación para esta oferta']);
  expect((await ofertasDeUrgencias(request)).get(id).postulaciones.map((p) => p.postulante?.idFuncionario), 'una sola postulación').toEqual([ID.medico]);

  await cerrarOferta(request, muta, caso);
});

// ═════════════════════════════════════════════════════════════════════════════
// HU-OFE-04 · Seleccionar al postulante
// ═════════════════════════════════════════════════════════════════════════════

/** Una oferta abierta del 341 con una postulación del 368 (por API). Devuelve el caso y la postulación. */
async function ofertaConPostulante(request, muta, etiqueta) {
  const caso = await ofertaAbierta(request, muta, etiqueta);
  const r = await muta.postular('segundoMedico', caso.oferta.idOfertaGeneral);
  expect(r.status, 'postula el 368').toBe(200);
  return { ...caso, postulacion: r.cuerpo };
}

testMuta('HU-OFE-04 · criterio 1: la confirmación dice «Se asignará el turno de {ofertor} a {postulante}.», con el turno', async ({ page, request, muta }, testInfo) => {
  const caso = await ofertaConPostulante(request, muta, 'HU-OFE-04 · criterio 1');
  const vista = await verOferta(page, testInfo, 'jefatura', caso.motivo);
  await expect(seccionPostulantes(vista, testInfo)).toContainText('Postulantes (1)');
  const { dialogo, texto, turno } = await abrirSeleccion(page, testInfo, vista);
  // Los nombres se comparan sin escribirlos: los del ofertor y del postulante según la API.
  const enBase = (await ofertasDeUrgencias(request)).get(caso.oferta.idOfertaGeneral);
  const m = /^Se asignará el turno de (.+) a (.+)\.$/.exec(texto);
  expect(m, 'el texto de la confirmación').toBeTruthy();
  expect(m[1] === nombreSolicitud(enBase.ofertor), 'nombra al ofertor (341)').toBe(true);
  expect(m[2] === nombreSolicitud(enBase.postulaciones[0].postulante), 'nombra al postulante (368)').toBe(true);
  expect(turno, 'con la fecha del turno').toContain(await fechaCL(page, caso.turno.diaInicioTurno));
  expect(turno, 'y su horario').toMatch(new RegExp(`${hhmm(caso.turno.horaInicio)}\\s*–\\s*${hhmm(caso.turno.horaFin)}`));

  // «Cancelar» cierra sin seleccionar.
  await dialogo.getByRole('button', { name: 'Cancelar', exact: true }).click();
  await expect(esDesktop(testInfo) ? dialogo : dialogo.getByText('Confirmar selección')).toHaveCount(0);
  expect((await ofertasDeUrgencias(request)).get(caso.oferta.idOfertaGeneral).estado, 'sigue abierta').toBe('ABIERTA');

  await cerrarOferta(request, muta, caso);
});

testMuta('HU-OFE-04 · criterio 2: al confirmar, la oferta queda «Cerrada», el turno pasa al postulante y la tarjeta muestra «Asignado a»', async ({ page, request, muta }, testInfo) => {
  const caso = await ofertaConPostulante(request, muta, 'HU-OFE-04 · criterio 2');
  await muta.recordarTurnos(caso.turno);
  let vista = await verOferta(page, testInfo, 'jefatura', caso.motivo);
  const { dialogo } = await abrirSeleccion(page, testInfo, vista);
  const r = await pulsarYEsperar(page, dialogo.getByRole('button', { name: 'Confirmar', exact: true }), RUTA_OFERTA);
  expect(r.status, 'seleccionar').toBe(200);
  await esperarSolicitudes(page);

  vista = await leerSolicitud(page, testInfo, caso.motivo);
  expect(vista.estado).toBe('Cerrada');
  const enBase = (await ofertasDeUrgencias(request)).get(caso.oferta.idOfertaGeneral);
  expect(enBase.estado).toBe('CERRADA');
  expect(enBase.postulaciones.filter((p) => p.seleccionado).map((p) => p.postulante?.idFuncionario), 'postulación seleccionada').toEqual([APOYO.segundoMedico.id]);
  expect(vista.filas['Asignado a'] === nombreSolicitud(enBase.postulaciones[0].postulante), '«Asignado a» nombra al postulante (368)').toBe(true);
  expect(await duenoDe(request, caso.turno.id), 'el turno pasa al 368').toBe(APOYO.segundoMedico.id);

  expect(await muta.devolverTurnos(), 'deshacer: el turno vuelve al 341').toEqual([caso.turno.id]);
});

// Pares [ofertor, postulante] para el caso de R13 (nunca el 369 como ofertor).
const PARES_OFERTA_R13 = [['tercerMedico', 'segundoMedico'], ['tercerMedico', 'medico'], ['segundoMedico', 'medico'], ['segundoMedico', 'tercerMedico']];

/**
 * Oferta abierta con un postulante que, después de postular, recibe a mano un
 * cupo que le choca por R13 con el turno ofrecido (la asignación directa solo mira
 * el solape, C-04). Devuelve el caso de R13, la oferta y la postulación.
 */
async function ofertaConChoqueR13(request, muta, etiqueta) {
  const caso = await casoR13PorAsignacion(request, PARES_OFERTA_R13);
  expect(caso, 'hay un turno de un médico y un cupo libre que, asignado a otro médico, le choca por R13').toBeTruthy();
  const motivo = motivoF4(etiqueta);
  const oferta = await muta.ofertar(caso.dueno, caso.turno.id, motivo);
  expect((await muta.abrirOferta('jefatura', oferta.idOfertaGeneral)).status, 'la jefatura la abre').toBe(200);
  const r = await muta.postular(caso.receptor, oferta.idOfertaGeneral);
  expect(r.status, `postula el ${idDe(caso.receptor)}`).toBe(200);
  await muta.recordarTurnos(caso.turno);
  expect((await muta.alterar('jefatura', { idTurno: caso.cupo.id, accion: 'ASIGNAR', idNuevoMedico: idDe(caso.receptor) })).status, 'asignación directa del cupo que choca').toBe(200);
  return { ...caso, oferta, motivo, postulacion: r.cuerpo };
}

/** Deshace el caso de R13: el cupo vuelve a quedar libre y la oferta se cierra con el mismo postulante (ya sin choque). */
async function deshacerChoqueR13(request, muta, caso) {
  expect(await muta.devolverTurnos(), 'el cupo vuelve a quedar libre').toEqual([caso.cupo.id]);
  await cerrarOferta(request, muta, { oferta: caso.oferta, turno: caso.turno }, caso.receptor);
}

testMuta('HU-OFE-04 · criterio 3: por API, si el postulante quedaría con una noche seguida de día, la selección se rechaza con el mensaje de la regla y la oferta sigue abierta', async ({ request, muta }, testInfo) => {
  soloPorApi(testInfo);
  // También es HU-SOL-14, criterio 4 («al seleccionar al postulante»), en el backend.
  const caso = await ofertaConChoqueR13(request, muta, 'HU-OFE-04 · criterio 3 · API');
  const r = await muta.seleccionar('jefatura', caso.oferta.idOfertaGeneral, caso.postulacion.idPostulacion);
  expect(r.status).toBe(400);
  await comprobarMensajeR13(request, r.cuerpo.error, caso.receptor, caso.regla, caso.cupo);
  expect((await ofertasDeUrgencias(request)).get(caso.oferta.idOfertaGeneral).estado, 'la oferta sigue abierta').toBe('ABIERTA');
  expect(await duenoDe(request, caso.turno.id), 'el turno sigue con el ofertor').toBe(idDe(caso.dueno));
  await deshacerChoqueR13(request, muta, caso);
});

testMuta('HU-OFE-04 · criterio 3: si el postulante quedaría con una noche seguida de día, veo el mensaje de la regla y la oferta sigue abierta', async ({ page, request, muta }, testInfo) => {
  const caso = await ofertaConChoqueR13(request, muta, 'HU-OFE-04 · criterio 3');
  let vista = await verOferta(page, testInfo, 'jefatura', caso.motivo);
  const { dialogo } = await abrirSeleccion(page, testInfo, vista);
  const r = await pulsarYEsperar(page, dialogo.getByRole('button', { name: 'Confirmar', exact: true }), RUTA_OFERTA);
  expect(r.status, 'el backend rechaza la selección').toBe(400);
  await comprobarMensajeR13(request, r.cuerpo.error, caso.receptor, caso.regla, caso.cupo);
  const aviso = await avisoSolicitudes(page, testInfo, /^(No es posible asignar el turno a |Error al seleccionar)/);
  await esperarSolicitudes(page);
  vista = await leerSolicitud(page, testInfo, caso.motivo);
  expect(vista.estado, 'la oferta sigue abierta').toBe('Abierta');
  expect((await ofertasDeUrgencias(request)).get(caso.oferta.idOfertaGeneral).estado).toBe('ABIERTA');
  // Se deshace antes de comparar el aviso: si fallara, la oferta no queda abierta ni el cupo asignado.
  await deshacerChoqueR13(request, muta, caso);
  // P-01 (17 oct): el aviso muestra el mensaje del backend (antes, «Error al seleccionar postulante.»).
  expect(sinNombre(aviso), 'el aviso muestra el mensaje de la regla').toBe(sinNombre(r.cuerpo.error));
});

testMuta('HU-OFE-04 · criterio 4: una oferta abierta sin postulantes muestra «Sin postulantes aún.»', async ({ page, request, muta }, testInfo) => {
  const caso = await ofertaAbierta(request, muta, 'HU-OFE-04 · criterio 4');
  const vista = await verOferta(page, testInfo, 'jefatura', caso.motivo);
  expect(vista.estado).toBe('Abierta');
  const seccion = seccionPostulantes(vista, testInfo);
  await expect(seccion).toContainText('Postulantes (0)');
  await expect(seccion.getByText('Sin postulantes aún.', { exact: true })).toBeVisible();
  await expect(seccion.getByRole('button', { name: /^Seleccionar/ })).toHaveCount(0);

  await cerrarOferta(request, muta, caso);
});
