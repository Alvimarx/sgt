// HU de pedir un cupo desde el detalle del turno y de ver en el inicio lo que
// pedí, fase 3 del catálogo docs/qa/HISTORIAS_DE_USUARIO.md (§6.2): mutaciones de
// un solo usuario que se deshacen en la misma prueba.
//  - HU-DET-02 (pedir un cupo libre tocándolo, R4): en móvil desde la agenda del
//    inicio; en desktop, donde el inicio es el Centro de operaciones, desde el
//    calendario. El criterio 2 desde el calendario era una falla conocida hasta
//    P-01 (17 oct: mapTurnoCalendario ya copia solicitudPendiente). El criterio 3 no
//    se automatiza (ver su prueba). El 4 (jefatura) no escribe.
//  - HU-CAL-03 («Solicitudes» del inicio, R11): solo móvil, porque la agenda es
//    el inicio móvil (en desktop el inicio es el Centro, HU-CAL-05).
//
// Los cupos se eligen con la API del día (desde mañana) entre los que el médico
// 369 puede pedir; lo creado se cancela al final. El intercambio de HU-CAL-03 se
// crea por API con el médico 368 como receptor, que no hace nada.
import {
  test, testMuta, expect, SERVICIO, APOYO, esMovil, esDesktop, hoyChile,
  entrar, barraInferior, abrirCalendario, abrirDia, abrirDetalle, detalle, puestoDetalle, accionesDetalle,
  esperarAgenda, filtro, filaDia, leerAgenda, etiquetaDia, asistente, campoAsistente, valorCampo, escribirMotivo,
  nuevaSolicitud, elegirTurnoAsistente, enviarYCrear, leerSolicitud, motivoPrueba, fechaCL, hhmm,
  apiComo, cuposParaPedir, cupoDelSelector, intercambioPosible,
} from '../helpers/hu.js';
import { inicioDe, diasVisiblesAgenda, rotativaDelBloque } from '../helpers/datos.js';

const SOLO_MOVIL = 'HU-CAL-03 es solo móvil: la agenda es el inicio móvil; en desktop el inicio es el Centro de operaciones (HU-CAL-05).';
const SOLICITAR = { movil: 'Cupo libre — tocar para solicitar', desktop: 'Solicitar este turno' };
const plataforma = (testInfo) => (esMovil(testInfo) ? 'movil' : 'desktop');

/**
 * Un cupo que el médico puede pedir hoy y que se toca sin ambigüedad: en el
 * calendario desktop su botón «Cupo libre: {puesto}» es el único con ese nombre
 * en el día. Devuelve el cupo y su bloque (mismo día y mismo tipo de turno).
 */
async function cupoParaTocar(request) {
  const turnos = await apiComo(request, 'medico', `/turnos/servicio/${SERVICIO.urgencias}`);
  const unico = (t) => turnos.filter((x) => x.idFuncionario == null && x.diaInicioTurno === t.diaInicioTurno && x.nombrePuesto === t.nombrePuesto).length === 1;
  const cupo = (await cuposParaPedir(request, 'medico')).find(unico);
  expect(cupo, 'hay un cupo libre que el médico puede pedir').toBeTruthy();
  const bloque = turnos.filter((t) => t.diaInicioTurno === cupo.diaInicioTurno && t.idTipoTurno === cupo.idTipoTurno);
  return { cupo, bloque };
}

/** Abre el detalle del turno donde está el cupo: en móvil, la tarjeta de su bloque en la agenda; en desktop, el cupo en el calendario. */
async function abrirDetalleDelCupo(page, testInfo, { cupo, bloque }) {
  if (esDesktop(testInfo)) {
    await abrirCalendario(page, testInfo);
    await abrirDia(page, testInfo, cupo.diaInicioTurno);
    return abrirDetalle(page, testInfo, cupo);
  }
  await esperarAgenda(page);
  await filtro(page, 'Todos').click();
  const fila = filaDia(page, cupo.diaInicioTurno);
  await fila.locator('.day-header-btn').click();
  await fila.getByRole('button', { name: `Ver detalle: ${cupo.nombreTipoTurno}: ${rotativaDelBloque(bloque)}`, exact: true }).click();
  await expect(detalle(page, testInfo)).toBeVisible();
  return detalle(page, testInfo);
}

// ═════════════════════════════════════════════════════════════════════════════
// HU-DET-02 · Pedir un cupo libre tocándolo (R4)
// ═════════════════════════════════════════════════════════════════════════════

testMuta('HU-DET-02 · criterio 1: tocar un cupo libre abre «Nueva solicitud» en el paso 2, tipo Cobertura, con el turno; al enviar queda PENDIENTE', async ({ page, request, muta }, testInfo) => {
  const caso = await cupoParaTocar(request);
  const { cupo } = caso;
  await entrar(page, 'medico');
  const det = await abrirDetalleDelCupo(page, testInfo, caso);
  await puestoDetalle(det, testInfo, cupo.nombrePuesto).getByRole('button', { name: SOLICITAR[plataforma(testInfo)] }).click();

  // «Nueva solicitud» en el paso 2 (Detalle), tipo Cobertura, con el turno precargado.
  const a = asistente(page, testInfo);
  await expect(campoAsistente(a, testInfo, 'Turno a cubrir')).toBeVisible();
  await expect(a.getByRole('button', { name: 'Cobertura', exact: true }), 'el tipo elegido').toBeVisible();
  if (esDesktop(testInfo)) await expect(a.locator('[aria-current="step"]')).toContainText('Detalle');
  const turnoMostrado = `${await fechaCL(page, cupo.diaInicioTurno)} ${hhmm(cupo.horaInicio)}–${hhmm(cupo.horaFin)}`;
  await expect.poll(() => valorCampo(a, testInfo, 'Turno a cubrir'), { message: 'turno precargado' }).toBe(turnoMostrado);

  const motivo = motivoPrueba('HU-DET-02 · criterio 1');
  await escribirMotivo(a, motivo);
  const creada = await enviarYCrear(page, testInfo);
  expect(creada.tipoSolicitud?.tipo, 'cobertura').toBe(3);
  expect(creada.turno?.idTurno, 'el cupo tocado').toBe(cupo.id);
  expect((await leerSolicitud(page, testInfo, motivo)).estado).toBe('PENDIENTE');

  expect((await muta.cancelar('medico', creada.idSolicitud)).status, 'deshacer').toBe(200);
});

testMuta('HU-DET-02 · criterio 2: en la agenda, el cupo que ya pedí dice «Ya solicitaste este turno» y no se puede tocar', async ({ page, request, muta }, testInfo) => {
  test.skip(!esMovil(testInfo), 'En desktop el detalle del turno se abre desde el calendario: lo prueba el caso siguiente.');
  const caso = await cupoParaTocar(request);
  const sol = await muta.crear('medico', { idTipoSolicitud: 3, idTurno: caso.cupo.id, motivo: motivoPrueba('HU-DET-02 · criterio 2 · agenda') });
  await entrar(page, 'medico');
  const det = await abrirDetalleDelCupo(page, testInfo, caso);
  const puesto = puestoDetalle(det, testInfo, caso.cupo.nombrePuesto);
  await expect(puesto.getByRole('button', { name: 'Ya solicitaste este turno' })).toBeDisabled();
  await expect(puesto.getByRole('button', { name: SOLICITAR.movil })).toHaveCount(0);
  // Abierta desde la agenda, la ficha es la del bloque (un turno asignado), no la del cupo:
  // «Desaparece Solicitar turno y solo queda Ver historial» se ve abriendo el cupo, en el calendario.
  expect((await muta.cancelar('medico', sol.idSolicitud)).status, 'deshacer').toBe(200);
});

testMuta('HU-DET-02 · criterio 2: desde el calendario, el cupo que ya pedí dice «Ya solicitaste este turno» y no queda ninguna acción', async ({ page, request, muta }, testInfo) => {
  // P-01 (17 oct): mapTurnoCalendario copia solicitudPendiente (antes, falla conocida).
  const caso = await cupoParaTocar(request);
  const sol = await muta.crear('medico', { idTipoSolicitud: 3, idTurno: caso.cupo.id, motivo: motivoPrueba('HU-DET-02 · criterio 2 · calendario') });
  await entrar(page, 'medico');
  await abrirCalendario(page, testInfo);
  await abrirDia(page, testInfo, caso.cupo.diaInicioTurno);
  const det = await abrirDetalle(page, testInfo, caso.cupo);
  const puesto = puestoDetalle(det, testInfo, caso.cupo.nombrePuesto);
  await expect(puesto, 'la fila del puesto del cupo').toHaveCount(1);
  await expect(puesto.getByText('Ya solicitaste este turno', { exact: true })).toBeVisible({ timeout: 5_000 });
  // C-06 (17 oct): «Ver historial» ya no se ofrece al médico en un cupo, así que sin «Solicitar turno» no queda
  // ninguna acción, y el detalle ya no dibuja la sección «Acciones» vacía.
  await expect(accionesDetalle(det, testInfo)).toHaveCount(0);
  expect((await muta.cancelar('medico', sol.idSolicitud)).status, 'deshacer').toBe(200);
});

test('HU-DET-02 · criterio 3: un cupo conocido solo por conteo («Cupo libre — falta cubrir») no se puede tocar', async () => {
  test.skip(true, 'No automatizable: el estado no existe. La rama «Cupo libre — falta cubrir» (vacantes conocidas solo por conteo) se retiró del detalle '
    + 'móvil y desktop (P-01, 17 oct): la agenda y el calendario cuentan las vacantes con los mismos turnos que listan, así que nunca se dibujaba.');
});

test('HU-DET-02 · criterio 4: para la jefatura, la vacante dice «Asignar funcionario a este cupo» y abre la asignación directa', async ({ page, request }, testInfo) => {
  // No escribe: abre la asignación y la cierra (la guarda de solo lectura corta cualquier envío).
  const caso = await cupoParaTocar(request);
  await entrar(page, 'jefatura');
  const det = await abrirDetalleDelCupo(page, testInfo, caso);
  const puesto = puestoDetalle(det, testInfo, caso.cupo.nombrePuesto);
  await expect(puesto.getByRole('button', { name: SOLICITAR[plataforma(testInfo)] })).toHaveCount(0);
  await puesto.getByRole('button', { name: 'Asignar funcionario a este cupo' }).click();
  if (esDesktop(testInfo)) {
    await expect(page.getByRole('dialog', { name: 'Asignar turno libre' })).toBeVisible();
    await page.keyboard.press('Escape');
  } else {
    await expect(page.getByText('Asignar turno libre', { exact: true })).toBeVisible();
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// HU-CAL-03 · Ver en el inicio los turnos que ya pedí («Solicitudes», R11)
// ═════════════════════════════════════════════════════════════════════════════

/** Cuántos turnos de los días que muestra la agenda marca el backend con una solicitud pendiente del usuario. */
async function marcadosEnAgenda(api) {
  const turnos = await api.get(`/turnos/servicio/${SERVICIO.urgencias}`);
  const visibles = new Set(diasVisiblesAgenda(turnos, hoyChile()));
  return { turnos, cuenta: turnos.filter((t) => visibles.has(t.diaInicioTurno) && t.solicitudPendiente).length };
}

/** Un intercambio PENDIENTE del médico 369 con el 368, por API: el turno propio queda comprometido (R15). */
async function intercambioPendiente(request, muta, etiqueta) {
  const par = await intercambioPosible(request, 'medico', 'segundoMedico');
  expect(par, 'hay un intercambio posible entre los médicos 369 y 368').toBeTruthy();
  const sol = await muta.crear('medico', {
    idTipoSolicitud: 4, idTurno: par.deseado.id, idTurnoIntercambio: par.propio.id, idFuncionarioReceptor: APOYO.segundoMedico.id,
    motivo: motivoPrueba(etiqueta),
  });
  return { ...par, sol };
}

testMuta('HU-CAL-03 · criterio 1: después de pedir un cupo, el chip «Solicitudes» del inicio lo cuenta y, al elegirlo, lista ese día', async ({ page, request, api, muta }, testInfo) => {
  test.skip(!esMovil(testInfo), SOLO_MOVIL);
  const [franjaLibre] = await cuposParaPedir(request, 'medico');
  expect(franjaLibre, 'hay un cupo libre que el médico puede pedir').toBeTruthy();
  const cupo = await cupoDelSelector(request, franjaLibre);
  await entrar(page, 'medico');
  const a = await nuevaSolicitud(page, testInfo, 'Cobertura');
  await elegirTurnoAsistente(page, testInfo, 'Turno a cubrir', cupo);
  await escribirMotivo(a, motivoPrueba('HU-CAL-03 · criterio 1'));
  const creada = await enviarYCrear(page, testInfo);

  // Vuelvo al inicio.
  await barraInferior(page, 'Inicio').click();
  await esperarAgenda(page);
  const { turnos, cuenta } = await marcadosEnAgenda(api);
  expect(turnos.find((t) => t.id === cupo.id)?.solicitudPendiente, 'el backend marca el cupo pedido').toBe(true);
  expect(cuenta).toBeGreaterThanOrEqual(1);
  await expect(filtro(page, 'Solicitudes')).toHaveAccessibleName(`Solicitudes ${cuenta}`);
  await filtro(page, 'Solicitudes').click();
  expect((await leerAgenda(page)).map((x) => x.clave)).toContain(`D:${etiquetaDia(cupo.diaInicioTurno)}`);

  expect((await muta.cancelar('medico', creada.idSolicitud)).status, 'deshacer').toBe(200);
});

testMuta('HU-CAL-03 · criterio 2: el turno que ofrecí en un intercambio cuenta como comprometido y su tarjeta muestra «Pendiente»', async ({ page, request, api, muta }, testInfo) => {
  test.skip(!esMovil(testInfo), SOLO_MOVIL);
  const { propio, sol } = await intercambioPendiente(request, muta, 'HU-CAL-03 · criterio 2');
  await entrar(page, 'medico');
  await esperarAgenda(page);
  // Filtro inicial «Mis turnos»: la tarjeta del día del turno ofrecido.
  await expect(filaDia(page, propio.diaInicioTurno).locator('.day-header-btn').getByText('Pendiente', { exact: true })).toBeVisible();
  const { turnos, cuenta } = await marcadosEnAgenda(api);
  expect(turnos.find((t) => t.id === propio.id)?.solicitudPendiente, 'el backend marca el turno ofrecido').toBe(true);
  await expect(filtro(page, 'Solicitudes')).toHaveAccessibleName(`Solicitudes ${cuenta}`);
  await filtro(page, 'Solicitudes').click();
  expect((await leerAgenda(page)).map((x) => x.clave)).toContain(`D:${etiquetaDia(propio.diaInicioTurno)}`);

  expect((await muta.cancelar('medico', sol.idSolicitud)).status, 'deshacer').toBe(200);
});

testMuta('HU-CAL-03 · criterio 3: el aviso superior muestra «Cambio de turno pendiente» con la fecha y «Esperando respuesta»', async ({ page, request, api, muta }, testInfo) => {
  test.skip(!esMovil(testInfo), SOLO_MOVIL);
  const { propio, sol } = await intercambioPendiente(request, muta, 'HU-CAL-03 · criterio 3');
  await entrar(page, 'medico');
  await esperarAgenda(page);
  // Un aviso por cada turno propio comprometido que muestra la agenda.
  const { turnos } = await marcadosEnAgenda(api);
  const visibles = new Set(diasVisiblesAgenda(turnos, hoyChile()));
  const propiosMarcados = turnos.filter((t) => t.idFuncionario === propio.idFuncionario && t.solicitudPendiente && visibles.has(t.diaInicioTurno))
    .sort((x, y) => inicioDe(x).localeCompare(inicioDe(y)));
  expect(propiosMarcados.map((t) => t.id), 'el turno ofrecido es un turno propio comprometido').toContain(propio.id);
  const avisos = page.getByText('Cambio de turno pendiente', { exact: true });
  await expect(avisos).toHaveCount(propiosMarcados.length);
  const conFecha = new RegExp(`\\b${Number(propio.diaInicioTurno.slice(8, 10))}\\b.* · Esperando respuesta$`);
  const subtitulos = (await avisos.locator('xpath=following-sibling::div[1]').allTextContents()).map((t) => t.trim());
  expect(subtitulos.filter((t) => conFecha.test(t)), `avisos: ${subtitulos.join(' | ')}`).toHaveLength(1);

  expect((await muta.cancelar('medico', sol.idSolicitud)).status, 'deshacer').toBe(200);
});
