// HU de cancelar una solicitud y de modificar su motivo, fase 3 del catálogo
// docs/qa/HISTORIAS_DE_USUARIO.md (§6.2): mutaciones de un solo usuario que se
// deshacen en la misma prueba, en móvil y en desktop.
//  - HU-SOL-11 (cancelar, R15): criterios 1 a 6. El 6 («ya resuelta») es por API
//    y corre una vez, en desktop; la parte «solicitud ajena» la cubre la fase 2a.
//    El 5 se prueba también en móvil: desde P-01 (17 oct) la tarjeta móvil oculta
//    Aprobar y Rechazar a quien participa, como la desktop.
//  - HU-SOL-12 (modificar el motivo): criterios 1 a 3 por la interfaz y, por API,
//    la excepción del administrador del criterio 4 (el resto del 4 es de la 2a).
//
// Cada prueba parte de una cobertura propia PENDIENTE creada por API (fixture
// `muta`) sobre un cupo libre de Urgencias que el usuario puede pedir hoy, y
// termina cancelándola. Cancelar no borra la fila: queda RECHAZADA con el motivo
// «Cancelada por el solicitante · …». La jefatura entra solo a mirar su bandeja y
// la bitácora, y a cancelar una solicitud suya: nadie aprueba ni responde (fase 4).
import {
  testMuta, expect, ID, SERVICIO, APOYO, esDesktop, soloPorApi, hoyChile,
  entrar, abrirSolicitudes, elegirPestana, leerSolicitud, esperarSolicitudes,
  abrirCancelacion, confirmarCancelacion, abrirModificarMotivo, abrirBitacora, filtrarBitacoraPorEstado,
  coberturaPorApi, estadoSolicitud, motivoPrueba, apiComo, calendarioDe, comprometidosDe,
} from '../helpers/hu.js';
import { inicioDe, choquesR13 } from '../helpers/datos.js';

const CANCELADA_POR = 'Cancelada por el solicitante · motivo original: ';
// Lo que responde el backend al motivo de una solicitud que ya no está pendiente (SolicitudService.modificarMotivo).
const SOLO_PENDIENTE = 'Solo se puede modificar el motivo si la solicitud está en estado PENDIENTE';

// Chip del estado de una solicitud leída con leerSolicitud, y si tiene el tono
// neutro: en desktop, sin clase de tono; en móvil, los colores de SGTBadge neutral.
const chipEstado = (vista, testInfo) => (esDesktop(testInfo)
  ? vista.zona.locator('.sgt-dt-detalle-sol__cabecera .sgt-d-chip')
  : vista.zona.locator(':scope > div').first().locator(':scope > span'));
const esTonoNeutro = (chip, testInfo) => (esDesktop(testInfo)
  ? chip.evaluate((el) => [...el.classList].every((c) => !c.startsWith('sgt-d-chip--') || c === 'sgt-d-chip--mayus'))
  : chip.evaluate((el) => {
    const muestra = document.createElement('span');
    muestra.style.color = 'var(--ink2)';
    muestra.style.background = 'var(--line2)';
    document.body.append(muestra);
    const [a, b] = [getComputedStyle(el), getComputedStyle(muestra)];
    const igual = a.color === b.color && a.backgroundColor === b.backgroundColor;
    muestra.remove();
    return igual;
  }));

// ═════════════════════════════════════════════════════════════════════════════
// HU-SOL-11 · Cancelar mi solicitud pendiente (R15)
// ═════════════════════════════════════════════════════════════════════════════

testMuta('HU-SOL-11 · criterio 1: «Cancelar solicitud» aparece solo en mis solicitudes PENDIENTES', async ({ page, request, muta }, testInfo) => {
  const { sol, motivo } = await coberturaPorApi(request, muta, 'medico', 'HU-SOL-11 · criterio 1');
  await entrar(page, 'medico');
  await abrirSolicitudes(page, testInfo);
  expect((await leerSolicitud(page, testInfo, motivo)).botones, 'mi solicitud pendiente').toContain('Cancelar solicitud');

  // En la bandeja de la jefatura la misma solicitud está pendiente, pero no es suya.
  await entrar(page, 'jefatura');
  await abrirSolicitudes(page, testInfo);
  const ajena = await leerSolicitud(page, testInfo, motivo);
  expect(ajena.estado).toBe('PENDIENTE');
  expect(ajena.botones, 'pendiente, pero ajena').not.toContain('Cancelar solicitud');

  // Ya resuelta (cancelada), deja de ofrecerse.
  expect((await muta.cancelar('medico', sol.idSolicitud)).status, 'deshacer').toBe(200);
  await entrar(page, 'medico');
  await abrirSolicitudes(page, testInfo);
  const resuelta = await leerSolicitud(page, testInfo, motivo);
  expect(resuelta.estado).toBe('CANCELADA');
  expect(resuelta.botones, 'mi solicitud ya resuelta').not.toContain('Cancelar solicitud');
});

testMuta('HU-SOL-11 · criterio 2: la confirmación explica qué pasa con el turno y ofrece «Volver» y «Cancelar solicitud»', async ({ page, request, muta }, testInfo) => {
  const { sol, motivo } = await coberturaPorApi(request, muta, 'medico', 'HU-SOL-11 · criterio 2');
  await entrar(page, 'medico');
  await abrirSolicitudes(page, testInfo);
  const { dialogo, texto } = await abrirCancelacion(page, testInfo, await leerSolicitud(page, testInfo, motivo));
  expect(texto).toBe('Se cancelará tu solicitud de Cobertura. El turno involucrado queda libre para que pidas otra cosa sobre él.');
  await expect(dialogo.getByRole('button', { name: 'Volver', exact: true })).toBeVisible();
  await expect(dialogo.getByRole('button', { name: 'Cancelar solicitud' })).toBeVisible();

  // «Volver» cierra sin cancelar.
  await dialogo.getByRole('button', { name: 'Volver', exact: true }).click();
  await expect(dialogo).toHaveCount(0);
  expect((await estadoSolicitud(request, 'medico', sol.idSolicitud)).estado, 'después de «Volver»').toBe('PENDIENTE');

  expect((await muta.cancelar('medico', sol.idSolicitud)).status, 'deshacer').toBe(200);
});

testMuta('HU-SOL-11 · criterio 3: al confirmar queda CANCELADA (neutra), con el motivo del solicitante, y el turno se puede volver a pedir', async ({ page, request, muta }, testInfo) => {
  const { sol, motivo } = await coberturaPorApi(request, muta, 'medico', 'HU-SOL-11 · criterio 3');
  await entrar(page, 'medico');
  await abrirSolicitudes(page, testInfo);
  const { dialogo } = await abrirCancelacion(page, testInfo, await leerSolicitud(page, testInfo, motivo));
  expect((await confirmarCancelacion(page, dialogo)).status(), 'PUT /cancelar').toBe(200);
  await esperarSolicitudes(page);

  const vista = await leerSolicitud(page, testInfo, motivo);
  expect(vista.estado).toBe('CANCELADA');
  expect(vista.motivo).toBe(`${CANCELADA_POR}${motivo}`);
  expect(await esTonoNeutro(chipEstado(vista, testInfo), testInfo), 'la marca CANCELADA es neutra').toBe(true);
  const enBase = await estadoSolicitud(request, 'medico', sol.idSolicitud);
  expect([enBase.estado, enBase.motivo], 'en la base queda RECHAZADA con el motivo del solicitante').toEqual(['RECHAZADA', `${CANCELADA_POR}${motivo}`]);

  // El turno se puede volver a pedir.
  const otra = await muta.crear('medico', { idTipoSolicitud: 3, idTurno: sol.turno.idTurno, motivo: motivoPrueba('HU-SOL-11 · otra vez') });
  expect(otra.estado).toBe('PENDIENTE');
  expect((await muta.cancelar('medico', otra.idSolicitud)).status, 'deshacer').toBe(200);
});

testMuta('HU-SOL-11 · criterio 4: la bitácora registra «Cancelada por el solicitante» y la muestra como CANCELADA, con su propio filtro', async ({ page, request, muta }, testInfo) => {
  // P-01 (17 oct): la bitácora muestra la cancelación como CANCELADA y el filtro por
  // estado suma «Cancelada» («Rechazada» ya no la incluye). En la base sigue RECHAZADA.
  const { sol, motivo } = await coberturaPorApi(request, muta, 'medico', 'HU-SOL-11 · criterio 4');
  expect((await muta.cancelar('medico', sol.idSolicitud)).status, 'cancelar').toBe(200);

  // La bitácora la consulta la gestión (al médico se la niega, C-06).
  const eventos = await apiComo(request, 'jefatura', '/bitacoras/dto');
  const evento = eventos.find((e) => e.idSolicitud === sol.idSolicitud && e.tipoEvento === 'SOLICITUD_CANCELADA');
  expect(evento, 'evento SOLICITUD_CANCELADA de la solicitud').toBeTruthy();
  expect(evento.motivoSolicitud).toBe(`${CANCELADA_POR}${motivo}`);

  await entrar(page, 'jefatura');
  await abrirBitacora(page, testInfo);
  await filtrarBitacoraPorEstado(page, testInfo, { valor: 'CANCELADA', texto: 'Cancelada' });
  // Es el evento más reciente: la vista lo muestra primero.
  if (esDesktop(testInfo)) {
    const fila = page.locator('table[aria-label="Registros de la bitácora"] tbody tr').first();
    await expect(fila).toContainText('CANCELADA');
    await fila.click();
    const panel = page.getByRole('dialog', { name: 'Detalle del evento' });
    await expect(panel).toContainText(`${CANCELADA_POR}${motivo}`);
    await expect(panel).toContainText('Cancelación por el solicitante');
  } else {
    const item = page.locator('.sgt-list-row').first();
    await expect(item).toContainText('CANCELADA');
    await item.locator('> div').first().click();
    await expect(item).toContainText(`${CANCELADA_POR}${motivo}`);
    await expect(item).toContainText('Cancelación por el solicitante');
  }
});

testMuta('HU-SOL-11 · criterio 5: la jefatura cancela una solicitud propia aunque no pueda decidirla', async ({ page, request, muta }, testInfo) => {
  // Un «Botar turno» de un turno futuro de la jefatura 305, creado por API.
  const comprometidos = await comprometidosDe(request, 'jefatura');
  const turno = (await calendarioDe(request, 'jefatura'))
    .filter((t) => t.diaInicioTurno > hoyChile() && !comprometidos.has(t.id))
    .sort((x, y) => inicioDe(x).localeCompare(inicioDe(y))).at(-1);
  expect(turno, 'la jefatura tiene un turno futuro sin solicitudes pendientes').toBeTruthy();
  const motivo = motivoPrueba('HU-SOL-11 · criterio 5');
  await muta.crear('jefatura', { idTipoSolicitud: 2, idTurno: turno.id, motivo });

  await entrar(page, 'jefatura');
  await abrirSolicitudes(page, testInfo);
  const vista = await leerSolicitud(page, testInfo, motivo);
  expect(vista.estado).toBe('PENDIENTE');
  expect(vista.botones).toContain('Cancelar solicitud');
  // P-01 (17 oct): igual en móvil y desktop, sin Aprobar ni Rechazar y con la nota.
  expect(vista.botones.filter((b) => /^(Aprobar|Rechazar)$/.test(b)), 'no puede decidirla').toEqual([]);
  await expect(vista.zona).toContainText('Participas en esta solicitud: por segregación de funciones, la decisión corresponde a otra jefatura.');

  const { dialogo } = await abrirCancelacion(page, testInfo, vista);
  expect((await confirmarCancelacion(page, dialogo)).status(), 'PUT /cancelar').toBe(200);
  await esperarSolicitudes(page);
  await elegirPestana(page, testInfo, 'Historial');
  expect((await leerSolicitud(page, testInfo, motivo)).estado).toBe('CANCELADA');
});

testMuta('HU-SOL-11 · criterio 6: cancelar una solicitud propia ya resuelta responde 400 «Esta solicitud ya fue resuelta: no se puede cancelar»', async ({ request, muta }, testInfo) => {
  soloPorApi(testInfo);
  const { sol, motivo } = await coberturaPorApi(request, muta, 'medico', 'HU-SOL-11 · criterio 6');
  expect((await muta.cancelar('medico', sol.idSolicitud)).status, 'primera cancelación').toBe(200);

  const r = await muta.cancelar('medico', sol.idSolicitud);
  expect(r.status).toBe(400);
  expect(r.cuerpo.error).toBe('Esta solicitud ya fue resuelta: no se puede cancelar');
  const enBase = await estadoSolicitud(request, 'medico', sol.idSolicitud);
  expect([enBase.estado, enBase.motivo], 'sin cambios: sigue la primera cancelación').toEqual(['RECHAZADA', `${CANCELADA_POR}${motivo}`]);

  // Ajena y ya resuelta: el backend revisa primero quién la emitió (SolicitudService.java:241-245).
  const ajena = await muta.cancelar('jefatura', sol.idSolicitud);
  expect(ajena.status).toBe(403);
  expect(ajena.cuerpo.error).toBe('Solo puedes cancelar tus propias solicitudes');
});

// ═════════════════════════════════════════════════════════════════════════════
// HU-SOL-12 · Modificar el motivo de mi solicitud
// ═════════════════════════════════════════════════════════════════════════════

testMuta('HU-SOL-12 · criterio 1: «Modificar motivo» aparece en mis solicitudes PENDIENTES y no en las resueltas', async ({ page, request, muta }, testInfo) => {
  const { sol, motivo } = await coberturaPorApi(request, muta, 'medico', 'HU-SOL-12 · criterio 1');
  await entrar(page, 'medico');
  await abrirSolicitudes(page, testInfo);
  expect((await leerSolicitud(page, testInfo, motivo)).botones, 'mi solicitud pendiente').toContain('Modificar motivo');

  expect((await muta.cancelar('medico', sol.idSolicitud)).status, 'deshacer').toBe(200);
  await entrar(page, 'medico');
  await abrirSolicitudes(page, testInfo);
  expect((await leerSolicitud(page, testInfo, motivo)).botones, 'mi solicitud ya resuelta').not.toContain('Modificar motivo');
});

testMuta('HU-SOL-12 · criterio 1: «Modificar motivo» no aparece en las solicitudes recibidas', async ({ page, request, muta }, testInfo) => {
  // El médico 368 le ofrece al médico 369 un turno suyo que este puede recibir
  // (oferta particular, por API). El 369 solo mira; 368 la cancela al final.
  const [suyos, mios, comprometidos] = await Promise.all([
    calendarioDe(request, 'segundoMedico'), calendarioDe(request, 'medico'), comprometidosDe(request, 'segundoMedico'),
  ]);
  const turno = suyos.filter((t) => t.diaInicioTurno > hoyChile() && !comprometidos.has(t.id) && choquesR13(t, mios).length === 0)
    .sort((x, y) => inicioDe(x).localeCompare(inicioDe(y)))[0];
  expect(turno, 'el médico 368 tiene un turno que el 369 puede recibir').toBeTruthy();
  const motivo = motivoPrueba('HU-SOL-12 · recibida');
  const sol = await muta.crear('segundoMedico', { idTipoSolicitud: 5, idTurno: turno.id, idFuncionarioReceptor: ID.medico, motivo });

  await entrar(page, 'medico');
  await abrirSolicitudes(page, testInfo);
  await elegirPestana(page, testInfo, 'Recibidas');
  const recibida = await leerSolicitud(page, testInfo, motivo);
  expect(recibida.estado).toBe('Requiere tu respuesta');
  expect(recibida.botones, 'control: es la vista del receptor').toEqual(expect.arrayContaining(['Aceptar', 'Rechazar']));
  expect(recibida.botones).not.toContain('Modificar motivo');
  expect(recibida.botones).not.toContain('Cancelar solicitud');

  expect((await muta.cancelar('segundoMedico', sol.idSolicitud)).status, `deshacer (la cancela su emisor, ${APOYO.segundoMedico.id})`).toBe(200);
});

testMuta('HU-SOL-12 · criterio 2: «Guardar cambios» se deshabilita sin texto y, al guardar, el motivo nuevo se ve en la tarjeta', async ({ page, request, muta }, testInfo) => {
  const { sol, motivo } = await coberturaPorApi(request, muta, 'medico', 'HU-SOL-12 · criterio 2');
  await entrar(page, 'medico');
  await abrirSolicitudes(page, testInfo);
  const hoja = await abrirModificarMotivo(page, testInfo, await leerSolicitud(page, testInfo, motivo));
  const texto = hoja.locator('textarea');
  const guardar = hoja.getByRole('button', { name: 'Guardar cambios' });
  await expect(texto).toHaveValue(motivo);
  for (const vacio of ['', '   ']) {
    await texto.fill(vacio);
    await expect(guardar, `motivo «${vacio}»`).toBeDisabled();
  }
  const nuevo = motivoPrueba('HU-SOL-12 · motivo nuevo');
  await texto.fill(nuevo);
  await expect(guardar).toBeEnabled();
  const respuesta = page.waitForResponse((r) => r.request().method() === 'PATCH' && /\/api\/v2\/solicitudes\/\d+\/motivo$/.test(new URL(r.url()).pathname));
  await guardar.click();
  expect((await respuesta).status(), 'PATCH /motivo').toBe(200);
  await expect(hoja).toHaveCount(0);
  await esperarSolicitudes(page);

  expect((await leerSolicitud(page, testInfo, nuevo)).motivo).toBe(nuevo);
  expect((await estadoSolicitud(request, 'medico', sol.idSolicitud)).motivo, 'en la base').toBe(nuevo);
  expect((await muta.cancelar('medico', sol.idSolicitud)).status, 'deshacer').toBe(200);
});

testMuta('HU-SOL-12 · criterio 3: si no se puede guardar, veo el mensaje del backend y el panel sigue abierto', async ({ page, request, muta }, testInfo) => {
  // Falla real: mientras el panel está abierto, la solicitud deja de estar
  // pendiente (se cancela por API) y el backend rechaza el cambio con 400. Desde
  // P-01 (17 oct) el aviso dice el motivo del backend; antes era genérico («No se
  // pudo guardar. Intentá de nuevo.»), que queda solo si el backend no da uno.
  const { sol, motivo } = await coberturaPorApi(request, muta, 'medico', 'HU-SOL-12 · criterio 3');
  await entrar(page, 'medico');
  await abrirSolicitudes(page, testInfo);
  const hoja = await abrirModificarMotivo(page, testInfo, await leerSolicitud(page, testInfo, motivo));
  expect((await muta.cancelar('medico', sol.idSolicitud)).status, 'cancelar mientras se edita (y deshacer)').toBe(200);

  await hoja.locator('textarea').fill(motivoPrueba('HU-SOL-12 · no se guarda'));
  const respuesta = page.waitForResponse((r) => r.request().method() === 'PATCH' && /\/api\/v2\/solicitudes\/\d+\/motivo$/.test(new URL(r.url()).pathname));
  await hoja.getByRole('button', { name: 'Guardar cambios' }).click();
  const r = await respuesta;
  expect(r.status(), 'PATCH /motivo de una solicitud ya resuelta').toBe(400);
  const mensaje = (await r.json()).error;
  expect(mensaje).toBe(SOLO_PENDIENTE);
  const aviso = esDesktop(testInfo) ? hoja.getByRole('alert') : hoja.getByText(SOLO_PENDIENTE, { exact: true });
  await expect(aviso).toHaveText(SOLO_PENDIENTE);
  await expect(hoja.locator('textarea'), 'el panel sigue abierto').toBeVisible();
  expect((await estadoSolicitud(request, 'medico', sol.idSolicitud)).motivo, 'el motivo no cambió').toBe(`${CANCELADA_POR}${motivo}`);
});

testMuta('HU-SOL-12 · criterio 4: el administrador sí modifica el motivo de una solicitud ajena (queda exento)', async ({ request, muta }, testInfo) => {
  soloPorApi(testInfo);
  // SolicitudService.modificarMotivo (:574): la exención del administrador. La fase 2a
  // probó la negativa (403 a una solicitud ajena, 400 a una que no está pendiente).
  const { sol } = await coberturaPorApi(request, muta, 'medico', 'HU-SOL-12 · criterio 4');
  const nuevo = motivoPrueba('HU-SOL-12 · motivo del administrador');
  const r = await muta.cambiarMotivo('admin', sol.idSolicitud, nuevo, { servicioId: SERVICIO.urgencias });
  expect(r.status, 'el administrador, en Urgencias').toBe(200);
  expect((await estadoSolicitud(request, 'medico', sol.idSolicitud)).motivo).toBe(nuevo);

  // Control: una jefatura que no es administradora, no.
  const negada = await muta.cambiarMotivo('jefatura', sol.idSolicitud, motivoPrueba('HU-SOL-12 · no se guarda'));
  expect(negada.status).toBe(403);
  expect(negada.cuerpo.error).toBe('Solo quien emitió la solicitud puede modificar su motivo');

  expect((await muta.cancelar('medico', sol.idSolicitud)).status, 'deshacer').toBe(200);
});
