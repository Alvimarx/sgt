// HU de crear solicitudes y ofertas, fase 3 del catálogo
// docs/qa/HISTORIAS_DE_USUARIO.md (§6.2): mutaciones de un solo usuario que se
// deshacen en la misma prueba, en móvil y en desktop.
//  - HU-SOL-03 (permiso), HU-SOL-04 (botar turno), HU-SOL-05 (cobertura) y
//    HU-OFE-01 (oferta general).
//  - Lo que no escribe (los tipos del paso 1, los límites de fechas, los
//    selectores) usa el `test` de solo lectura: su guarda corta cualquier envío.
//  - Lo que crea usa `testMuta` y lo deshace al final cancelando por API. La
//    oferta general no se puede retirar (no hay endpoint para el ofertor): queda
//    pendiente de apertura y la prueba elige cada vez un turno sin oferta suya.
//  - Fuera, en la fase 4 (necesitan que la jefatura apruebe): HU-SOL-03
//    (criterio 5), la segunda mitad de HU-SOL-04 y HU-SOL-05 (criterio 2, «al
//    aprobarse…»), en aprobaciones.spec.js, y la apertura real de HU-OFE-01
//    (criterio 2, aquí simulada), en ofertas-generales.spec.js.
//
// Los turnos y cupos se eligen con la API del día (desde mañana: el backend corre
// en UTC, §2.3); nada de ids fijos. Las personas van por id.
import {
  test, testMuta, expect, fallaConocida, ID, SERVICIO, APOYO, esDesktop, MESES,
  hoyChile, ahoraChile, sumarDias, anioDe, mesDe, diasDelMes,
  entrar, abrirSolicitudes, elegirPestana, leerSolicitud, fechaCL, hhmm,
  asistente, abrirNuevaSolicitud, nuevaSolicitud, campoAsistente, elegirTurnoAsistente, escribirMotivo,
  enviarYCrear, enviarYRechazar, errorAsistente, leerOpcionesTurno, claveOpcionTurno, motivoPrueba,
  TIPOS_SOLICITUD, apiComo, calendarioDe, comprometidosDe, cuposParaPedir, intercambioPosible, solicitudesDe,
} from '../helpers/hu.js';
import { inicioDe, choquesR13, ofertaSimulada } from '../helpers/datos.js';

const URGENCIAS = { idServicio: SERVICIO.urgencias, nombre: 'Urgencias' };
const MESES_CORTOS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const FALTAN_CAMPOS = 'Rellena todos los campos requeridos.';
const YA_SOLICITO = 'Ud. ya solicitó este turno. Cancele la solicitud pendiente desde Solicitudes si desea cambiarla.';
const COMPROMETIDO = 'Ese turno ya está comprometido en otra solicitud pendiente suya. Cancélela desde Solicitudes para pedir otra cosa sobre él.';

// 'YYYY-MM-DDTHH:mm' más `horas` (sin zona: se usa para comparar con inicioDe).
const sumarHoras = (instante, horas) => new Date(Date.parse(`${instante}:00Z`) + horas * 3_600_000).toISOString().slice(0, 16);
// El backend corre en UTC (§2.3): ve la hora de Chile adelantada hasta 4 horas.
// Un turno que empieza en ese margen puede faltar en sus listas sin ser un error.
const MARGEN_UTC = 4;

// Fechas del permiso: en desktop, los campos de fecha; en móvil, año → mes → día.
async function elegirFechaMovil(a, iso) {
  await a.getByRole('button', { name: String(anioDe(iso)), exact: true }).click();
  await a.getByRole('button', { name: MESES_CORTOS[mesDe(iso) - 1], exact: true }).click();
  await a.getByRole('button', { name: String(Number(iso.slice(8, 10))), exact: true }).click();
}
async function elegirFechasPermiso(page, testInfo, desde, hasta) {
  const a = asistente(page, testInfo);
  if (esDesktop(testInfo)) {
    await page.locator('#sgt-dt-campo-fechaInicio').fill(desde);
    await page.locator('#sgt-dt-campo-fechaFin').fill(hasta);
    return;
  }
  await campoAsistente(a, testInfo, 'Fecha inicio').click();
  await elegirFechaMovil(a, desde);
  await campoAsistente(a, testInfo, 'Fecha término').click();
  await elegirFechaMovil(a, hasta);
}

// ═════════════════════════════════════════════════════════════════════════════
// HU-SOL-03 · Pedir un permiso
// ═════════════════════════════════════════════════════════════════════════════

test('HU-SOL-03 · criterio 1: el paso 1 ofrece los seis tipos de solicitud', async ({ page }, testInfo) => {
  await entrar(page, 'medico');
  await abrirSolicitudes(page, testInfo);
  const a = await abrirNuevaSolicitud(page, testInfo);
  const tipos = esDesktop(testInfo)
    ? await a.locator('.sgt-dt-tipo__titulo').allTextContents()
    : await a.locator('button:has(> div)').evaluateAll((bs) => bs.map((b) => b.children[1]?.children[0]?.textContent.trim()));
  expect(tipos).toEqual(TIPOS_SOLICITUD);
});

test('HU-SOL-03 · criterio 2: las fechas van de hoy al 31 de diciembre del año siguiente y el término no es anterior al inicio', async ({ page }, testInfo) => {
  await entrar(page, 'medico');
  const a = await nuevaSolicitud(page, testInfo, 'Permiso');
  const hoy = hoyChile();
  const [anio, mes, dia] = [anioDe(hoy), mesDe(hoy), Number(hoy.slice(8, 10))];
  const maximo = `${anio + 1}-12-31`;

  if (esDesktop(testInfo)) {
    // Desktop: campos de fecha con los mismos límites.
    const inicio = page.locator('#sgt-dt-campo-fechaInicio');
    const termino = page.locator('#sgt-dt-campo-fechaFin');
    await expect(inicio).toHaveAttribute('type', 'date');
    for (const campo of [inicio, termino]) {
      await expect(campo).toHaveAttribute('min', hoy);
      await expect(campo).toHaveAttribute('max', maximo);
    }
    // Fuera del rango no se acepta (el campo vuelve a quedar vacío).
    for (const fuera of [sumarDias(hoy, -1), `${anio + 2}-01-01`]) {
      await inicio.fill(fuera);
      await expect(inicio, `inicio ${fuera}`).toHaveValue('');
    }
    await inicio.fill(maximo);
    await expect(inicio).toHaveValue(maximo);
    const desde = sumarDias(hoy, 10);
    await inicio.fill(desde);
    await expect(inicio).toHaveValue(desde);
    // El término no puede ser anterior al inicio.
    await expect(termino).toHaveAttribute('min', desde);
    await termino.fill(sumarDias(desde, -1));
    await expect(termino).toHaveValue('');
    await termino.fill(desde);
    await expect(termino).toHaveValue(desde);
    // Si el inicio pasa a ser posterior al término, el término se borra.
    await inicio.fill(sumarDias(desde, 1));
    await expect(termino).toHaveValue('');
    return;
  }

  // Móvil: año → mes → día. Solo este año y el siguiente.
  await campoAsistente(a, testInfo, 'Fecha inicio').click();
  await expect(a.getByRole('button', { name: /^\d{4}$/ })).toHaveText([String(anio), String(anio + 1)]);
  await a.getByRole('button', { name: String(anio), exact: true }).click();
  for (const [i, m] of MESES_CORTOS.entries()) {
    const boton = a.getByRole('button', { name: m, exact: true });
    if (i + 1 < mes) await expect(boton, `${m} ${anio}`).toBeDisabled();
    else await expect(boton, `${m} ${anio}`).toBeEnabled();
  }
  await a.getByRole('button', { name: MESES_CORTOS[mes - 1], exact: true }).click();
  for (let d = 1; d <= diasDelMes(anio, mes); d += 1) {
    const boton = a.getByRole('button', { name: String(d), exact: true });
    if (d < dia) await expect(boton, `${d} de ${MESES[mes - 1]}`).toBeDisabled();
    else await expect(boton, `${d} de ${MESES[mes - 1]}`).toBeEnabled();
  }
  // El último día posible: 31 de diciembre del año siguiente.
  await a.getByRole('button', { name: 'Volver', exact: true }).click();
  await a.getByRole('button', { name: 'Volver', exact: true }).click();
  await a.getByRole('button', { name: String(anio + 1), exact: true }).click();
  for (const m of MESES_CORTOS) await expect(a.getByRole('button', { name: m, exact: true }), `${m} ${anio + 1}`).toBeEnabled();
  await a.getByRole('button', { name: 'Dic', exact: true }).click();
  await expect(a.getByRole('button', { name: '31', exact: true })).toBeEnabled();
  await a.getByRole('button', { name: '31', exact: true }).click();
  await expect(campoAsistente(a, testInfo, 'Fecha inicio')).toHaveText(await fechaCL(page, maximo));

  // El término no puede ser anterior al inicio (31 de diciembre del año siguiente).
  await campoAsistente(a, testInfo, 'Fecha término').click();
  await a.getByRole('button', { name: String(anio), exact: true }).click();
  for (const m of MESES_CORTOS) await expect(a.getByRole('button', { name: m, exact: true }), `${m} ${anio}`).toBeDisabled();
  await a.getByRole('button', { name: 'Volver', exact: true }).click();
  await a.getByRole('button', { name: String(anio + 1), exact: true }).click();
  for (const m of MESES_CORTOS.slice(0, 11)) await expect(a.getByRole('button', { name: m, exact: true }), `${m} ${anio + 1}`).toBeDisabled();
  await a.getByRole('button', { name: 'Dic', exact: true }).click();
  await expect(a.getByRole('button', { name: '30', exact: true })).toBeDisabled();
  await expect(a.getByRole('button', { name: '31', exact: true })).toBeEnabled();
});

test('HU-SOL-03 · criterio 3: si falta una fecha, «Enviar solicitud» muestra «Rellena todos los campos requeridos.»', async ({ page }, testInfo) => {
  // La guarda de solo lectura confirma que no sale ningún envío al backend.
  await entrar(page, 'medico');
  const a = await nuevaSolicitud(page, testInfo, 'Permiso');
  const desde = sumarDias(hoyChile(), 30);
  if (esDesktop(testInfo)) await page.locator('#sgt-dt-campo-fechaInicio').fill(desde);
  else {
    await campoAsistente(a, testInfo, 'Fecha inicio').click();
    await elegirFechaMovil(a, desde);
  }
  await a.getByRole('button', { name: 'Enviar solicitud' }).click();
  expect(await errorAsistente(page, testInfo, FALTAN_CAMPOS)).toBe(FALTAN_CAMPOS);
});

testMuta('HU-SOL-03 · criterio 4: al enviar, el permiso queda PENDIENTE en «Mis solicitudes» y en la bandeja de la jefatura', async ({ page, muta }, testInfo) => {
  await entrar(page, 'medico');
  const motivo = motivoPrueba('HU-SOL-03');
  const [desde, hasta] = [sumarDias(hoyChile(), 40), sumarDias(hoyChile(), 41)];
  const a = await nuevaSolicitud(page, testInfo, 'Permiso');
  await elegirFechasPermiso(page, testInfo, desde, hasta);
  await escribirMotivo(a, motivo);
  const creada = await enviarYCrear(page, testInfo);
  expect(creada.turno, 'el permiso no lleva turno').toBeNull();

  const propia = await leerSolicitud(page, testInfo, motivo);
  expect(propia.titulo).toBe('Permiso');
  expect(propia.estado).toBe('PENDIENTE');
  expect(propia.filas['Período']).toBe(`${await fechaCL(page, desde)} → ${await fechaCL(page, hasta)}`);

  await entrar(page, 'jefatura');
  await abrirSolicitudes(page, testInfo);
  const enBandeja = await leerSolicitud(page, testInfo, motivo);
  expect(enBandeja.titulo).toBe('Permiso');
  expect(enBandeja.estado).toBe('PENDIENTE');

  expect((await muta.cancelar('medico', creada.idSolicitud)).status, 'deshacer: cancelar el permiso').toBe(200);
});

// ═════════════════════════════════════════════════════════════════════════════
// HU-SOL-04 · Botar (liberar) un turno propio
// ═════════════════════════════════════════════════════════════════════════════

test('HU-SOL-04 · criterio 1: «Turno a liberar» lista solo mis turnos que no han empezado, hasta 12 meses', async ({ page, request }, testInfo) => {
  await entrar(page, 'medico');
  const ahora = ahoraChile();
  const tope = `${anioDe(ahora) + 1}${ahora.slice(4, 10)}`;
  const mios = await calendarioDe(request, 'medico');
  const claves = async (lista) => Promise.all(lista.map((t) => claveOpcionTurno(page, t)));
  const esperados = await claves(mios.filter((t) => inicioDe(t) > sumarHoras(ahora, MARGEN_UTC) && t.diaInicioTurno <= tope));
  const enMargen = await claves(mios.filter((t) => inicioDe(t) > ahora && inicioDe(t) <= sumarHoras(ahora, MARGEN_UTC)));
  const yaEmpezados = await claves(mios.filter((t) => inicioDe(t) <= ahora));
  expect(esperados.length, 'el médico tiene turnos futuros').toBeGreaterThan(0);
  expect(yaEmpezados.length, 'y turnos que ya empezaron').toBeGreaterThan(0);

  const a = await nuevaSolicitud(page, testInfo, 'Botar turno');
  await campoAsistente(a, testInfo, 'Turno a liberar').click();
  const vistos = await leerOpcionesTurno(page, testInfo);
  expect(vistos.filter((v) => !enMargen.includes(v)).sort()).toEqual(esperados.sort());
  for (const pasado of yaEmpezados) expect(vistos, 'un turno que ya empezó').not.toContain(pasado);
});

testMuta('HU-SOL-04 · criterio 2: al enviar, «Botar turno» queda PENDIENTE y el turno sigue siendo mío', async ({ page, request, muta }, testInfo) => {
  testInfo.annotations.push({ type: 'fase 4', description: 'La otra mitad del criterio («al aprobarse, el turno queda sin funcionario») necesita que la jefatura apruebe.' });
  await entrar(page, 'medico');
  const comprometidos = await comprometidosDe(request, 'medico');
  const turno = (await calendarioDe(request, 'medico'))
    .filter((t) => t.diaInicioTurno > hoyChile() && !comprometidos.has(t.id))
    .sort((x, y) => inicioDe(x).localeCompare(inicioDe(y))).at(-1);
  expect(turno, 'el médico tiene un turno futuro sin solicitudes pendientes').toBeTruthy();
  const motivo = motivoPrueba('HU-SOL-04');

  const a = await nuevaSolicitud(page, testInfo, 'Botar turno');
  await elegirTurnoAsistente(page, testInfo, 'Turno a liberar', turno);
  await escribirMotivo(a, motivo);
  const creada = await enviarYCrear(page, testInfo);
  expect(creada.turno?.idTurno, 'la solicitud lleva el turno elegido').toBe(turno.id);

  const vista = await leerSolicitud(page, testInfo, motivo);
  expect(vista.titulo).toBe('Botar turno');
  expect(vista.estado).toBe('PENDIENTE');
  expect(vista.filas['Turno a liberar']).toContain(await fechaCL(page, turno.diaInicioTurno));
  expect(vista.filas['Turno a liberar']).toContain(`${hhmm(turno.horaInicio)}–${hhmm(turno.horaFin)}`);
  const sigue = (await calendarioDe(request, 'medico')).find((t) => t.id === turno.id);
  expect(sigue?.idFuncionario, 'mientras no se apruebe, el turno sigue siendo del médico').toBe(ID.medico);

  expect((await muta.cancelar('medico', creada.idSolicitud)).status, 'deshacer').toBe(200);
});

testMuta('HU-SOL-04 · criterio 3: si el turno ya está ofrecido en un intercambio pendiente mío, veo el mensaje de turno comprometido', async ({ page, request, muta }, testInfo) => {
  await entrar(page, 'medico');
  const par = await intercambioPosible(request, 'medico', 'segundoMedico');
  expect(par, 'hay un intercambio posible con el médico 368').toBeTruthy();
  const intercambio = await muta.crear('medico', {
    idTipoSolicitud: 4, idTurno: par.deseado.id, idTurnoIntercambio: par.propio.id, idFuncionarioReceptor: APOYO.segundoMedico.id,
    motivo: motivoPrueba('HU-SOL-04 · intercambio previo'),
  });
  const antes = (await solicitudesDe(request, 'medico')).length;

  const a = await nuevaSolicitud(page, testInfo, 'Botar turno');
  await elegirTurnoAsistente(page, testInfo, 'Turno a liberar', par.propio);
  await escribirMotivo(a, motivoPrueba('HU-SOL-04 · no se crea'));
  await enviarYRechazar(page, testInfo, COMPROMETIDO);
  expect((await solicitudesDe(request, 'medico')).length, 'no se creó nada').toBe(antes);

  expect((await muta.cancelar('medico', intercambio.idSolicitud)).status, 'deshacer el intercambio').toBe(200);
});

testMuta('HU-SOL-04 · criterio 3: si el turno ya está en otro «Botar turno» pendiente mío, se rechaza con el mensaje de R12', async ({ page, request, muta }, testInfo) => {
  // Error del catálogo: el criterio 3 cita para todo caso el mensaje de turno
  // comprometido (R15), pero si el turno ya es el pedido de otra solicitud
  // pendiente del mismo funcionario, el backend responde antes con el de R12
  // (SolicitudService.crearSolicitud, :124-128). Ambos mencionan cancelar.
  await entrar(page, 'medico');
  const comprometidos = await comprometidosDe(request, 'medico');
  const turno = (await calendarioDe(request, 'medico'))
    .filter((t) => t.diaInicioTurno > hoyChile() && !comprometidos.has(t.id))
    .sort((x, y) => inicioDe(x).localeCompare(inicioDe(y)))[0];
  expect(turno, 'el médico tiene un turno futuro sin solicitudes pendientes').toBeTruthy();
  const previa = await muta.crear('medico', { idTipoSolicitud: 2, idTurno: turno.id, motivo: motivoPrueba('HU-SOL-04 · botar previo') });
  const antes = (await solicitudesDe(request, 'medico')).length;

  const a = await nuevaSolicitud(page, testInfo, 'Botar turno');
  await elegirTurnoAsistente(page, testInfo, 'Turno a liberar', turno);
  await escribirMotivo(a, motivoPrueba('HU-SOL-04 · no se crea'));
  await enviarYRechazar(page, testInfo, YA_SOLICITO);
  expect((await solicitudesDe(request, 'medico')).length, 'no se creó nada').toBe(antes);

  expect((await muta.cancelar('medico', previa.idSolicitud)).status, 'deshacer').toBe(200);
});

// ═════════════════════════════════════════════════════════════════════════════
// HU-SOL-05 · Ofrecerme para cubrir un cupo (Cobertura)
// ═════════════════════════════════════════════════════════════════════════════

// Cupos libres de Urgencias según la API del día, separados por lo que el
// selector debería hacer con ellos (criterio 1): los que puedo tomar (no
// empezaron y no chocan con mi calendario: ni solape ni R13, que incluye «Disponibles», R9),
// los que ya empezaron y los que no puedo tomar.
async function cuposDelSelector(page, request) {
  const ahora = ahoraChile();
  const [turnos, mios] = await Promise.all([apiComo(request, 'medico', `/turnos/servicio/${SERVICIO.urgencias}`), calendarioDe(request, 'medico')]);
  const libres = turnos.filter((t) => t.idFuncionario == null);
  const claves = async (lista) => Promise.all(lista.map((t) => claveOpcionTurno(page, t)));
  const futuros = libres.filter((t) => inicioDe(t) > sumarHoras(ahora, MARGEN_UTC));
  return {
    tomables: await claves(futuros.filter((t) => choquesR13(t, mios).length === 0)),
    noTomables: await claves(futuros.filter((t) => choquesR13(t, mios).length > 0)),
    pasados: await claves(libres.filter((t) => inicioDe(t) <= ahora)),
  };
}

async function abrirSelectorCobertura(page, testInfo) {
  const a = await nuevaSolicitud(page, testInfo, 'Cobertura');
  await campoAsistente(a, testInfo, 'Turno a cubrir').click();
  return leerOpcionesTurno(page, testInfo);
}

test('HU-SOL-05 · criterio 1: el selector lista todos los cupos libres que todavía puedo tomar', async ({ page, request }, testInfo) => {
  await entrar(page, 'medico');
  const { tomables } = await cuposDelSelector(page, request);
  expect(tomables.length, 'hay cupos libres que el médico puede tomar').toBeGreaterThan(0);
  const vistos = await abrirSelectorCobertura(page, testInfo);
  const faltan = [...tomables];
  vistos.forEach((v) => { const i = faltan.indexOf(v); if (i >= 0) faltan.splice(i, 1); });
  expect(faltan, 'cupos que se pueden tomar y no aparecen').toEqual([]);
});

test('HU-SOL-05 · criterio 1: el selector no lista cupos que ya empezaron', async ({ page, request }, testInfo) => {
  fallaConocida('HU-SOL-05, §5.1 y §6.3: el selector trae todos los cupos sin funcionario, también los ya pasados (TurnoRepository.findUnassignedTurnosByServicio no filtra por fecha).');
  await entrar(page, 'medico');
  const { pasados } = await cuposDelSelector(page, request);
  expect(pasados.length, 'hay cupos libres que ya pasaron (seed y vigencia desde el lunes)').toBeGreaterThan(0);
  const vistos = await abrirSelectorCobertura(page, testInfo);
  expect(vistos.filter((v) => pasados.includes(v)), 'cupos ya empezados en el selector').toEqual([]);
});

test('HU-SOL-05 · criterio 1: el selector no lista cupos que no puedo tomar (mi bloque, R9 y R13)', async ({ page, request }, testInfo) => {
  fallaConocida('HU-SOL-05, Estado: el selector no aplica la elegibilidad de «Disponibles» (R9): lista también los cupos de los bloques donde ya tengo turno.');
  await entrar(page, 'medico');
  const { noTomables } = await cuposDelSelector(page, request);
  expect(noTomables.length, 'hay cupos futuros que el médico no puede tomar').toBeGreaterThan(0);
  const vistos = await abrirSelectorCobertura(page, testInfo);
  expect(vistos.filter((v) => noTomables.includes(v)), 'cupos que no puedo tomar en el selector').toEqual([]);
});

testMuta('HU-SOL-05 · criterio 2: al enviar, la cobertura queda PENDIENTE y el cupo sigue libre', async ({ page, request, muta }, testInfo) => {
  testInfo.annotations.push({ type: 'fase 4', description: 'La otra mitad del criterio («al aprobarse, el turno queda a mi nombre») necesita que la jefatura apruebe.' });
  await entrar(page, 'medico');
  const [cupo] = await cuposParaPedir(request, 'medico');
  expect(cupo, 'hay un cupo libre que el médico puede pedir').toBeTruthy();
  const motivo = motivoPrueba('HU-SOL-05');

  const a = await nuevaSolicitud(page, testInfo, 'Cobertura');
  await elegirTurnoAsistente(page, testInfo, 'Turno a cubrir', cupo);
  await escribirMotivo(a, motivo);
  const creada = await enviarYCrear(page, testInfo);
  const pedido = creada.turno;
  expect([pedido?.diaInicioTurno, hhmm(pedido?.horaInicio)], 'la solicitud lleva un cupo de la franja elegida').toEqual([cupo.diaInicioTurno, hhmm(cupo.horaInicio)]);

  const vista = await leerSolicitud(page, testInfo, motivo);
  expect(vista.titulo).toBe('Cobertura');
  expect(vista.estado).toBe('PENDIENTE');
  expect(vista.filas['Turno a cubrir']).toContain(await fechaCL(page, cupo.diaInicioTurno));
  expect(vista.filas['Turno a cubrir']).toContain(`${hhmm(cupo.horaInicio)}–${hhmm(cupo.horaFin)}`);
  const turnos = await apiComo(request, 'medico', `/turnos/servicio/${SERVICIO.urgencias}`);
  expect(turnos.find((t) => t.id === pedido.idTurno)?.idFuncionario, 'mientras no se apruebe, el cupo sigue libre').toBeNull();

  expect((await muta.cancelar('medico', creada.idSolicitud)).status, 'deshacer').toBe(200);
});

test('HU-SOL-05 · criterio 3: al crear se aplican R12 y R13', async () => {
  test.skip(true, 'Cubierto en reglas-solicitud.spec.js, también por «Nueva solicitud → Cobertura»: R12 en HU-SOL-13 (criterio 1) y R13 en HU-SOL-14 (criterios 1 a 3).');
});

// ═════════════════════════════════════════════════════════════════════════════
// HU-OFE-01 · Publicar una oferta general de mi turno
// ═════════════════════════════════════════════════════════════════════════════

testMuta('HU-OFE-01 · criterio 1: al enviar, la oferta aparece en «Ofertas generales» con la marca «Pend. apertura»', async ({ page, request }, testInfo) => {
  // No se puede deshacer: el ofertor no tiene cómo retirar la oferta (OfertaGeneralController
  // solo deja aprobarla o rechazarla a la gestión). Por eso se elige un turno sin oferta suya.
  await entrar(page, 'medico');
  const ofertas = await apiComo(request, 'medico', `/ofertas-generales/servicio/${SERVICIO.urgencias}`);
  const ofrecidos = new Set(ofertas.filter((o) => o.ofertor?.idFuncionario === ID.medico).map((o) => o.turno?.idTurno));
  const turno = (await calendarioDe(request, 'medico'))
    .filter((t) => t.diaInicioTurno > hoyChile() && !ofrecidos.has(t.id))
    .sort((x, y) => inicioDe(x).localeCompare(inicioDe(y))).at(-1);
  expect(turno, 'el médico tiene un turno futuro sin oferta suya (si no, restaurar la base)').toBeTruthy();
  const motivo = motivoPrueba('HU-OFE-01');

  const a = await nuevaSolicitud(page, testInfo, 'Oferta general');
  await elegirTurnoAsistente(page, testInfo, 'Tu turno a ofrecer', turno);
  await escribirMotivo(a, motivo);
  const creada = await enviarYCrear(page, testInfo);
  expect(creada.estado).toBe('PENDIENTE_APROBACION');
  expect(creada.turno?.idTurno).toBe(turno.id);

  await elegirPestana(page, testInfo, 'Ofertas generales');
  const vista = await leerSolicitud(page, testInfo, motivo);
  expect(vista.titulo).toBe('Oferta general');
  expect(vista.estado).toBe('Pend. apertura');
  expect(vista.filas['Turno ofertado']).toContain(await fechaCL(page, turno.diaInicioTurno));
  expect(vista.botones, 'nadie postula a una oferta sin abrir').not.toContain('Postular');
});

test('HU-OFE-01 · criterio 2: en mi oferta no veo «Postular» y, abierta, veo «Tu oferta está abierta · N postulantes» (apertura simulada)', async ({ page, api }, testInfo) => {
  // Abrir la oferta de verdad es de la jefatura (HU-OFE-02, fase 4): aquí la
  // respuesta GET trae, además de las reales, una oferta del médico ya abierta y
  // con dos postulantes. Nada se guarda.
  await entrar(page, 'medico');
  const hoy = hoyChile();
  const turnos = await api.get(`/turnos/servicio/${SERVICIO.urgencias}`);
  const personal = await api.get(`/funcionarios/summary?servicioId=${SERVICIO.urgencias}`);
  const persona = (id) => personal.find((f) => f.idFuncionario === id);
  const miTurno = turnos.find((t) => t.idFuncionario === ID.medico && t.diaInicioTurno > hoy);
  const motivo = 'Simulada: mi oferta ya abierta';
  const mia = ofertaSimulada({
    id: 9931, estado: 'ABIERTA', ofertor: persona(ID.medico), turno: miTurno, servicio: URGENCIAS, motivo,
    postulantes: [persona(APOYO.segundoMedico.id), persona(APOYO.tercerMedico.id)],
  });
  let reales = [];
  await page.route(new RegExp(`/api/v2/ofertas-generales/servicio/${SERVICIO.urgencias}$`), async (route) => {
    const r = await route.fetch();
    reales = await r.json();
    return route.fulfill({ response: r, json: [...reales, mia] });
  });
  await abrirSolicitudes(page, testInfo);
  await elegirPestana(page, testInfo, 'Ofertas generales');

  const vista = await leerSolicitud(page, testInfo, motivo);
  expect(vista.estado).toBe('Abierta');
  expect(vista.botones).not.toContain('Postular');
  await expect(vista.zona).toContainText('Tu oferta está abierta · 2 postulantes');

  // Control: en una oferta abierta de otra persona sí aparece «Postular».
  const ajena = reales.find((o) => o.estado === 'ABIERTA' && o.ofertor?.idFuncionario !== ID.medico);
  expect(ajena, 'el seed tiene una oferta abierta de otra persona').toBeTruthy();
  expect((await leerSolicitud(page, testInfo, ajena.motivo)).botones).toContain('Postular');
});
