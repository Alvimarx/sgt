// HU de la asignación directa de turnos, fase 4 del catálogo
// docs/qa/HISTORIAS_DE_USUARIO.md (§6.2), en móvil y en desktop.
//  - HU-ASG-02 (asignar a un cupo libre): criterios 1 a 4 y, por API, la excepción
//    del administrador del criterio 5 (la negación por servicio es de la fase 2a).
//  - HU-ASG-03 (reasignar o liberar): criterios 1 a 4.
//  - HU-SOL-14, criterio 5 (la asignación manual aplica R13 y responde 409): C-04, corregida el 17 oct.
//
// La jefatura 305 entra por el calendario: el día, el detalle del turno y el panel
// «Asignar turno libre» o «Editar asignación de turno». Lo que solo abre el panel y
// lo cancela usa el `test` de solo lectura, cuya guarda corta cualquier envío. Lo
// que asigna, reasigna o libera usa `testMuta`, anota antes el dueño del turno y lo
// devuelve al final con la asignación directa (muta.devolverTurnos). Quedan los
// eventos de bitácora y las notificaciones del sistema que crea cada asignación
// («no se deshace»). Se asigna a los médicos de apoyo 368 y 341 y al médico 369;
// las personas se eligen en el panel por RUT, leído de la API (no se escribe).
import {
  test, testMuta, expect, ID, APOYO, SERVICIO, esDesktop, soloPorApi, idDe, etiquetaTurno,
  entrar, abrirCalendario, abrirDia, abrirDetalle, puestoDetalle, apiComo, calendarioDe, personaDe,
  motivoF4, duenoDe, fotoDelDia, bitacoraDeTurno, panelAsignacion, filasAsignacion, rutsAsignacion, buscadorAsignacion,
  confirmacionAsignacion, pulsarYEsperar, RUTA_ALTERAR, comprobarMensajeR13,
  sinNombre,
} from '../helpers/hu.js';
import { choquesR13 } from '../helpers/datos.js';

/** Nombre completo como lo arma el panel de asignación (nombre y apellidos, de /funcionarios/summary). */
const nombrePanel = (f) => `${f.nombre || ''} ${f.apellidoPaterno || ''} ${f.apellidoMaterno || ''}`.replace(/\s+/g, ' ').trim();
const rutDe = (f) => f.rutCompleto || f.rut;

/** Turnos del mismo día y puesto que `t` entre `turnos` (para tocar en pantalla uno que no se confunda con otro). */
const mismoDiaYPuesto = (turnos, t) => turnos.filter((x) => x.diaInicioTurno === t.diaInicioTurno && x.nombrePuesto === t.nombrePuesto);

/**
 * Un cupo libre sin trámites que se toca sin ambigüedad en el calendario (el único
 * cupo libre de su puesto ese día) y que cumple `filtro`. null si no hay.
 */
async function cupoParaAsignar(request, filtro = () => true, quienes = []) {
  const foto = await fotoDelDia(request, quienes);
  const libres = foto.turnos.filter((t) => t.idFuncionario == null);
  return foto.cupos.find((c) => mismoDiaYPuesto(libres, c).length === 1 && filtro(c, foto)) ?? null;
}

/**
 * Un turno de `quien` sin trámites que se reconoce sin ambigüedad en el detalle: es
 * su único turno del día y el único turno asignado de su puesto en su bloque (mismo
 * día y tipo de turno), así que en «Integrantes del equipo por puesto» la fila de su
 * puesto tiene una sola persona.
 */
async function turnoParaEditar(request, quien, filtro = () => true, quienes = []) {
  const foto = await fotoDelDia(request, quienes);
  const asignados = foto.turnos.filter((t) => t.idFuncionario != null);
  const unicoDelDia = (t) => asignados.filter((x) => x.idFuncionario === t.idFuncionario && x.diaInicioTurno === t.diaInicioTurno).length === 1;
  const soloEnSuFila = (t) => mismoDiaYPuesto(asignados, t).filter((x) => x.idTipoTurno === t.idTipoTurno).length === 1;
  return foto.turnosDe(quien).find((t) => unicoDelDia(t) && soloEnSuFila(t) && filtro(t, foto)) ?? null;
}

/** Abre el detalle del cupo en el calendario de la jefatura y, con «Asignar funcionario», el panel «Asignar turno libre». */
async function abrirAsignar(page, testInfo, cupo) {
  await entrar(page, 'jefatura');
  await abrirCalendario(page, testInfo);
  await abrirDia(page, testInfo, cupo.diaInicioTurno);
  const det = await abrirDetalle(page, testInfo, cupo);
  await det.getByRole('button', { name: 'Asignar funcionario', exact: true }).click();
  const panel = panelAsignacion(page, testInfo, 'Asignar turno libre');
  await expect(panel.getByText('Cargando personal...')).toHaveCount(0, { timeout: 15_000 });
  await expect(filasAsignacion(panel, testInfo).first()).toBeVisible();
  return panel;
}

/** Abre el detalle del turno asignado y, con la persona («Editar»), el panel «Editar asignación de turno». */
async function abrirEditar(page, testInfo, turno) {
  await entrar(page, 'jefatura');
  await abrirCalendario(page, testInfo);
  await abrirDia(page, testInfo, turno.diaInicioTurno);
  const det = await abrirDetalle(page, testInfo, turno);
  const editar = puestoDetalle(det, testInfo, turno.nombrePuesto).getByRole('button').filter({ hasText: 'Editar' });
  await expect(editar, 'una sola persona en la fila de su puesto').toHaveCount(1);
  await editar.click();
  const panel = panelAsignacion(page, testInfo, 'Editar asignación de turno');
  await expect(panel.getByText('Cargando personal...')).toHaveCount(0, { timeout: 15_000 });
  await expect(filasAsignacion(panel, testInfo).first()).toBeVisible();
  return panel;
}

/** Busca a `quien` por su RUT en el panel y lo elige (la única fila que queda). */
async function elegirEnPanel(panel, testInfo, persona) {
  await buscadorAsignacion(panel).fill(rutDe(persona));
  await expect(filasAsignacion(panel, testInfo), 'una sola persona con ese RUT').toHaveCount(1);
  await filasAsignacion(panel, testInfo).first().click();
}

/** Texto del turno en las confirmaciones del panel: «{tipo} · {lun 19 oct 2026} · {hh:mm}–{hh:mm}» (P-01, 17 oct: antes, la fecha en ISO). */
const turnoEnConfirmacion = (t) => etiquetaTurno(t);

// ═════════════════════════════════════════════════════════════════════════════
// HU-ASG-02 · Asignar un funcionario a un cupo libre
// ═════════════════════════════════════════════════════════════════════════════

test('HU-ASG-02 · criterio 1: «Asignar turno libre» lista a todo el personal del servicio, ordenado, con buscador por nombre o RUT', async ({ page, request }, testInfo) => {
  const cupo = await cupoParaAsignar(request);
  expect(cupo, 'hay un cupo libre que se toca sin ambigüedad').toBeTruthy();
  const personal = await apiComo(request, 'jefatura', `/funcionarios/summary?servicioId=${SERVICIO.urgencias}`);
  const idPorRut = new Map(personal.map((f) => [rutDe(f), f.idFuncionario]));
  const idsEnPanel = async (panel) => (await rutsAsignacion(panel, testInfo)).map((r) => idPorRut.get(r) ?? 'desconocido');
  const ordenados = [...personal].sort((a, b) => nombrePanel(a).localeCompare(nombrePanel(b), 'es', { sensitivity: 'base' }));

  const panel = await abrirAsignar(page, testInfo, cupo);
  await expect(buscadorAsignacion(panel)).toBeVisible();
  expect(await idsEnPanel(panel), 'todo el personal de Urgencias, por nombre').toEqual(ordenados.map((f) => f.idFuncionario));

  // Por RUT: solo esa persona.
  const otro = await personaDe(request, 'segundoMedico');
  await buscadorAsignacion(panel).fill(rutDe(otro));
  expect(await idsEnPanel(panel), 'buscar por RUT').toEqual([APOYO.segundoMedico.id]);
  // Por nombre: quienes lo contienen en el nombre completo (o en el RUT).
  const fragmento = String(otro.apellidoPaterno || otro.nombre).toLowerCase().slice(0, 5);
  await buscadorAsignacion(panel).fill(fragmento);
  const esperados = ordenados.filter((f) => nombrePanel(f).toLowerCase().includes(fragmento) || String(rutDe(f)).toLowerCase().includes(fragmento));
  expect(await idsEnPanel(panel), 'buscar por parte del apellido').toEqual(esperados.map((f) => f.idFuncionario));
  expect(esperados.map((f) => f.idFuncionario), 'el apellido buscado trae al 368').toContain(APOYO.segundoMedico.id);
});

test('HU-ASG-02 · criterio 2: al elegir a alguien y pulsar «Asignar turno», veo «Confirmar asignación»: «¿Deseas asignar a {nombre} al turno {tipo · fecha hh:mm–hh:mm}?»', async ({ page, request }, testInfo) => {
  // Solo abre la confirmación y la cancela: la guarda de solo lectura corta cualquier envío.
  const cupo = await cupoParaAsignar(request);
  expect(cupo, 'hay un cupo libre que se toca sin ambigüedad').toBeTruthy();
  const persona = await personaDe(request, 'segundoMedico');
  const panel = await abrirAsignar(page, testInfo, cupo);
  await expect(panel.getByRole('button', { name: 'Asignar turno', exact: true }), 'sin elegir a nadie').toBeDisabled();
  await elegirEnPanel(panel, testInfo, persona);
  await panel.getByRole('button', { name: 'Asignar turno', exact: true }).click();
  const { dialogo, texto } = await confirmacionAsignacion(page, testInfo, 'Confirmar asignación');
  const m = /^¿Deseas asignar a (.+) al turno (.+)\?$/.exec(texto);
  expect(m, 'el texto de la confirmación').toBeTruthy();
  expect(m[1] === nombrePanel(persona), 'nombra a la persona elegida (368)').toBe(true);
  expect(m[2], 'el turno').toBe(turnoEnConfirmacion(cupo));
  await expect(dialogo.getByRole('button', { name: 'Confirmar', exact: true })).toBeVisible();
  await dialogo.getByRole('button', { name: 'Cancelar', exact: true }).click();
  await expect(dialogo.getByRole('button', { name: 'Confirmar', exact: true })).toHaveCount(0);
});

testMuta('HU-ASG-02 · criterio 3: al confirmar, el cupo queda asignado, la vista se recarga y la bitácora registra la asignación con la observación', async ({ page, request, muta }, testInfo) => {
  const cupo = await cupoParaAsignar(request, (c, foto) => choquesR13(c, foto.calendario.segundoMedico).length === 0, ['segundoMedico']);
  expect(cupo, 'hay un cupo libre que se le puede asignar al 368').toBeTruthy();
  await muta.recordarTurnos(cupo);
  const panel = await abrirAsignar(page, testInfo, cupo);
  await elegirEnPanel(panel, testInfo, await personaDe(request, 'segundoMedico'));
  const observacion = motivoF4('HU-ASG-02 · criterio 3');
  await panel.locator('textarea').fill(observacion);
  await panel.getByRole('button', { name: 'Asignar turno', exact: true }).click();
  const { dialogo } = await confirmacionAsignacion(page, testInfo, 'Confirmar asignación');
  const recarga = page.waitForResponse((r) => r.request().method() === 'GET' && /\/api\/v2\/turnos\/servicio\/\d+\/calendario\//.test(new URL(r.url()).pathname));
  const r = await pulsarYEsperar(page, dialogo.getByRole('button', { name: 'Confirmar', exact: true }), RUTA_ALTERAR);
  expect(r.status, 'asignar').toBe(200);
  await recarga;
  await expect(panel, 'el panel se cierra').toHaveCount(0);

  expect(await duenoDe(request, cupo.id), 'el cupo queda con el 368').toBe(APOYO.segundoMedico.id);
  const [evento] = await bitacoraDeTurno(request, cupo.id);
  expect([evento?.tipoEvento, evento?.motivo, evento?.idFuncionario], 'último evento del turno: asignación manual, con la observación, de la jefatura')
    .toEqual(['ASIGNACION_MANUAL_TURNO', observacion, ID.jefatura]);

  expect(await muta.devolverTurnos(), 'deshacer: el cupo vuelve a quedar libre').toEqual([cupo.id]);
});

testMuta('HU-ASG-02 · criterio 4: si la persona ya tiene un turno que se cruza, veo «El funcionario ya tiene otro turno asignado en este rango horario.»', async ({ page, request, muta }, testInfo) => {
  // Un cupo libre que se cruza con un turno del 368, del 341 o del 369.
  let caso = null;
  for (const quien of ['segundoMedico', 'tercerMedico', 'medico']) {
    const cupo = await cupoParaAsignar(request, (c, foto) => choquesR13(c, foto.calendario[quien]).some((x) => x.regla === 'solape'), [quien]);
    if (cupo) { caso = { quien, cupo }; break; }
  }
  expect(caso, 'hay un cupo libre que se cruza con un turno del 368, del 341 o del 369').toBeTruthy();
  const { quien, cupo } = caso;
  await muta.recordarTurnos(cupo);
  const panel = await abrirAsignar(page, testInfo, cupo);
  await elegirEnPanel(panel, testInfo, await personaDe(request, quien));
  await panel.getByRole('button', { name: 'Asignar turno', exact: true }).click();
  const { dialogo } = await confirmacionAsignacion(page, testInfo, 'Confirmar asignación');
  const r = await pulsarYEsperar(page, dialogo.getByRole('button', { name: 'Confirmar', exact: true }), RUTA_ALTERAR);
  testInfo.annotations.push({ type: 'código de respuesta', description: `${r.status} (C-04: el cruce de horario responde 409 con su mensaje)` });
  expect(r.status, 'el backend lo rechaza (conflicto con el calendario)').toBe(409);
  const mensaje = 'El funcionario ya tiene otro turno asignado en este rango horario.';
  expect(r.cuerpo?.error).toBe(mensaje);
  await expect(panel.getByRole('alert')).toHaveText(mensaje);
  expect(await duenoDe(request, cupo.id), 'el cupo sigue libre').toBeNull();
});

testMuta('HU-ASG-02 · criterio 4: por API, asignar a alguien que no es del servicio responde «El funcionario seleccionado no pertenece al servicio del turno.»', async ({ request, muta }, testInfo) => {
  soloPorApi(testInfo);
  // Por la interfaz no se puede: el panel lista solo al personal del servicio. El
  // subrogante 101 es de Enfermería (GestionTurnoService.validarFuncionarioAsignable, :287-289).
  const cupo = await cupoParaAsignar(request);
  expect(cupo, 'hay un cupo libre de Urgencias').toBeTruthy();
  const personal = (await apiComo(request, 'jefatura', `/funcionarios/summary?servicioId=${SERVICIO.urgencias}`)).map((f) => f.idFuncionario);
  expect(personal, 'el subrogante no es de Urgencias').not.toContain(ID.subrogante);
  const r = await muta.alterar('jefatura', { idTurno: cupo.id, accion: 'ASIGNAR', idNuevoMedico: ID.subrogante });
  expect([r.status, r.cuerpo?.error]).toEqual([400, 'El funcionario seleccionado no pertenece al servicio del turno.']);
  expect(await duenoDe(request, cupo.id), 'el cupo sigue libre').toBeNull();
});

testMuta('HU-ASG-02 · criterio 5: el administrador sí asigna un cupo de un servicio que no es el de su sesión (queda exento)', async ({ request, muta }, testInfo) => {
  soloPorApi(testInfo);
  // SeguridadServicio.exigirMismoServicio exime al administrador. Su sesión es de
  // Enfermería y el cupo, de Urgencias (lo que se escribe es de Urgencias). La
  // negación a la jefatura la prueba la fase 2a (permisos.spec.js).
  const cupo = await cupoParaAsignar(request, (c, foto) => choquesR13(c, foto.calendario.segundoMedico).length === 0, ['segundoMedico']);
  expect(cupo, 'hay un cupo libre que se le puede asignar al 368').toBeTruthy();
  const r = await muta.alterar('admin', { idTurno: cupo.id, accion: 'ASIGNAR', idNuevoMedico: APOYO.segundoMedico.id }, { servicioId: SERVICIO.enfermeria });
  expect(r.status, 'el administrador, con sesión en Enfermería').toBe(200);
  expect(await duenoDe(request, cupo.id)).toBe(APOYO.segundoMedico.id);
  expect(await muta.devolverTurnos(), 'deshacer: el cupo vuelve a quedar libre').toEqual([cupo.id]);
});

// ═════════════════════════════════════════════════════════════════════════════
// HU-ASG-03 · Reasignar o liberar un turno asignado
// ═════════════════════════════════════════════════════════════════════════════

test('HU-ASG-03 · criterio 1: el panel muestra a la persona actual y la lista no la incluye', async ({ page, request }, testInfo) => {
  const turno = await turnoParaEditar(request, 'segundoMedico');
  expect(turno, 'el 368 tiene un turno que se reconoce sin ambigüedad en el detalle').toBeTruthy();
  const [personal, actual] = await Promise.all([apiComo(request, 'jefatura', `/funcionarios/summary?servicioId=${SERVICIO.urgencias}`), personaDe(request, 'segundoMedico')]);
  const panel = await abrirEditar(page, testInfo, turno);
  const nombreActual = esDesktop(testInfo)
    ? panel.locator('.sgt-dt-asignar__actual-nombre')
    : panel.getByText('Funcionario actual', { exact: true }).locator('xpath=following-sibling::div[1]');
  expect((await nombreActual.textContent()).trim() === turno.nombreFuncionario, '«Funcionario actual» nombra al 368').toBe(true);
  const ruts = await rutsAsignacion(panel, testInfo);
  expect(ruts.length, 'todo el personal menos la persona actual').toBe(personal.length - 1);
  expect(ruts.includes(rutDe(actual)), 'la persona actual no está en la lista').toBe(false);
});

test('HU-ASG-03 · criterio 2: «Reasignar turno» pide «Confirmar reasignación»: «¿Deseas reemplazar a {actual} por {nuevo} en el turno {…}?»', async ({ page, request }, testInfo) => {
  const turno = await turnoParaEditar(request, 'segundoMedico');
  expect(turno, 'el 368 tiene un turno que se reconoce sin ambigüedad en el detalle').toBeTruthy();
  const nuevo = await personaDe(request, 'tercerMedico');
  const panel = await abrirEditar(page, testInfo, turno);
  await elegirEnPanel(panel, testInfo, nuevo);
  await panel.getByRole('button', { name: 'Reasignar turno', exact: true }).click();
  const { dialogo, texto } = await confirmacionAsignacion(page, testInfo, 'Confirmar reasignación');
  const m = /^¿Deseas reemplazar a (.+) por (.+) en el turno (.+)\?$/.exec(texto);
  expect(m, 'el texto de la confirmación').toBeTruthy();
  expect(m[1] === turno.nombreFuncionario, 'nombra a la persona actual (368)').toBe(true);
  expect(m[2] === nombrePanel(nuevo), 'y a la nueva (341)').toBe(true);
  expect(m[3]).toBe(turnoEnConfirmacion(turno));
  await expect(dialogo.getByRole('button', { name: 'Reasignar', exact: true })).toBeVisible();
  await dialogo.getByRole('button', { name: 'Cancelar', exact: true }).click();
  await expect(dialogo.getByRole('button', { name: 'Reasignar', exact: true })).toHaveCount(0);
});

test('HU-ASG-03 · criterio 3: «Quitar funcionario y dejar vacante» pide «Confirmar liberación», avisa que quedará como cupo libre y ofrece «Quitar funcionario»', async ({ page, request }, testInfo) => {
  const turno = await turnoParaEditar(request, 'segundoMedico');
  expect(turno, 'el 368 tiene un turno que se reconoce sin ambigüedad en el detalle').toBeTruthy();
  const panel = await abrirEditar(page, testInfo, turno);
  await panel.getByRole('button', { name: 'Quitar funcionario y dejar vacante' }).click();
  const { dialogo, texto } = await confirmacionAsignacion(page, testInfo, 'Confirmar liberación');
  // Las dos frases van separadas por un salto de línea (<br>), sin espacio en el texto.
  const m = /^¿Deseas quitar a (.+) del turno (.+)\?\s*El turno quedará como cupo libre\.$/.exec(texto);
  expect(m, 'el texto de la confirmación').toBeTruthy();
  expect(m[1] === turno.nombreFuncionario, 'nombra a la persona actual (368)').toBe(true);
  expect(m[2]).toBe(turnoEnConfirmacion(turno));
  await expect(dialogo.getByRole('button', { name: 'Quitar funcionario', exact: true })).toBeVisible();
  await dialogo.getByRole('button', { name: 'Cancelar', exact: true }).click();
  await expect(dialogo.getByRole('button', { name: 'Quitar funcionario', exact: true })).toHaveCount(0);
});

testMuta('HU-ASG-03 · criterio 4: al confirmar la reasignación, la vista se recarga y la bitácora la registra', async ({ page, request, muta }, testInfo) => {
  const turno = await turnoParaEditar(request, 'segundoMedico', (t, foto) => !choquesR13(t, foto.calendario.tercerMedico).some((x) => x.regla === 'solape'), ['tercerMedico']);
  expect(turno, 'el 368 tiene un turno que se le puede asignar al 341').toBeTruthy();
  await muta.recordarTurnos(turno);
  const panel = await abrirEditar(page, testInfo, turno);
  await elegirEnPanel(panel, testInfo, await personaDe(request, 'tercerMedico'));
  const observacion = motivoF4('HU-ASG-03 · criterio 4 · reasignar');
  await panel.locator('textarea').fill(observacion);
  await panel.getByRole('button', { name: 'Reasignar turno', exact: true }).click();
  const { dialogo } = await confirmacionAsignacion(page, testInfo, 'Confirmar reasignación');
  const recarga = page.waitForResponse((r) => r.request().method() === 'GET' && /\/api\/v2\/turnos\/servicio\/\d+\/calendario\//.test(new URL(r.url()).pathname));
  const r = await pulsarYEsperar(page, dialogo.getByRole('button', { name: 'Reasignar', exact: true }), RUTA_ALTERAR);
  expect(r.status, 'reasignar').toBe(200);
  await recarga;
  await expect(panel, 'el panel se cierra').toHaveCount(0);

  expect(await duenoDe(request, turno.id), 'el turno pasa al 341').toBe(APOYO.tercerMedico.id);
  const [evento] = await bitacoraDeTurno(request, turno.id);
  expect([evento?.tipoEvento, evento?.motivo, evento?.idFuncionario]).toEqual(['REASIGNACION_MANUAL_TURNO', observacion, ID.jefatura]);

  expect(await muta.devolverTurnos(), 'deshacer: el turno vuelve al 368').toEqual([turno.id]);
});

testMuta('HU-ASG-03 · criterio 4: al confirmar la liberación, el turno queda como cupo libre, la vista se recarga y la bitácora la registra', async ({ page, request, muta }, testInfo) => {
  const turno = await turnoParaEditar(request, 'segundoMedico');
  expect(turno, 'el 368 tiene un turno que se reconoce sin ambigüedad en el detalle').toBeTruthy();
  await muta.recordarTurnos(turno);
  const panel = await abrirEditar(page, testInfo, turno);
  const observacion = motivoF4('HU-ASG-03 · criterio 4 · liberar');
  await panel.locator('textarea').fill(observacion);
  await panel.getByRole('button', { name: 'Quitar funcionario y dejar vacante' }).click();
  const { dialogo } = await confirmacionAsignacion(page, testInfo, 'Confirmar liberación');
  const recarga = page.waitForResponse((r) => r.request().method() === 'GET' && /\/api\/v2\/turnos\/servicio\/\d+\/calendario\//.test(new URL(r.url()).pathname));
  const r = await pulsarYEsperar(page, dialogo.getByRole('button', { name: 'Quitar funcionario', exact: true }), RUTA_ALTERAR);
  expect(r.status, 'liberar').toBe(200);
  await recarga;
  await expect(panel, 'el panel se cierra').toHaveCount(0);

  expect(await duenoDe(request, turno.id), 'el turno queda como cupo libre').toBeNull();
  const [evento] = await bitacoraDeTurno(request, turno.id);
  expect([evento?.tipoEvento, evento?.motivo, evento?.idFuncionario]).toEqual(['LIBERACION_MANUAL_TURNO', observacion, ID.jefatura]);

  expect(await muta.devolverTurnos(), 'deshacer: el turno vuelve al 368').toEqual([turno.id]);
});

// ═════════════════════════════════════════════════════════════════════════════
// HU-SOL-14 · Respetar el descanso post nocturno (R13), criterio 5
// ═════════════════════════════════════════════════════════════════════════════

testMuta('HU-SOL-14 · criterio 5: la jefatura no puede asignar a mano un turno de día a quien sale esa mañana de su noche', async ({ page, request, muta }, testInfo) => {
  // Un cupo de día libre la mañana en que un médico (369, 368 o 341) sale de su noche.
  let caso = null;
  for (const quien of ['medico', 'segundoMedico', 'tercerMedico']) {
    const cupo = await cupoParaAsignar(request, (c, foto) => {
      const choques = choquesR13(c, foto.calendario[quien]);
      return choques.length === 1 && choques[0].regla === 'noche-dia';
    }, [quien]);
    if (cupo) { caso = { quien, cupo }; break; }
  }
  expect(caso, 'hay un cupo de día libre la mañana en que el 369, el 368 o el 341 sale de su noche').toBeTruthy();
  const { quien, cupo } = caso;
  const noche = choquesR13(cupo, await calendarioDe(request, quien))[0].turno;
  await muta.recordarTurnos(cupo);
  const panel = await abrirAsignar(page, testInfo, cupo);
  await elegirEnPanel(panel, testInfo, await personaDe(request, quien));
  await panel.getByRole('button', { name: 'Asignar turno', exact: true }).click();
  const { dialogo } = await confirmacionAsignacion(page, testInfo, 'Confirmar asignación');
  const r = await pulsarYEsperar(page, dialogo.getByRole('button', { name: 'Confirmar', exact: true }), RUTA_ALTERAR);
  const quedo = await duenoDe(request, cupo.id);
  // Por si la asignación pasara (regresión de C-04): se deshace antes de comparar.
  await muta.devolverTurnos();

  // C-04 (17 oct): la asignación a mano aplica R13 con el mismo validador y mensaje que las
  // solicitudes, y es un conflicto de estado: 409 (antes pasaba, y era una falla conocida).
  expect(r.status, 'el backend rechaza la asignación').toBe(409);
  await comprobarMensajeR13(request, r.cuerpo?.error ?? '', quien, 'noche-dia', noche);
  expect(sinNombre(await panel.getByRole('alert').textContent({ timeout: 5_000 }).catch(() => '')), 'el panel muestra el mensaje').toBe(sinNombre(r.cuerpo?.error));
  expect(quedo, `el cupo no queda con el funcionario ${idDe(quien)}`).toBeNull();
});
