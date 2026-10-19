// Negativos de permiso, fases 2a y 2b del catálogo docs/qa/HISTORIAS_DE_USUARIO.md
// (§6.2).
//  - 2a, lo que niega el controller o el service: responde 403 o 400 sin cerrar la
//    sesión.
//    · Por API, una vez y en el proyecto desktop: AUT-02 (criterio 6), CAL-08 (4),
//      NOT-01 (5), PER-01 (4), SOL-08 (4), SOL-11 (6, solicitud ajena), SOL-12 (4),
//      OFE-02 (2 y 3), ASG-02 (5), DET-04 (2, el permiso del historial del turno), JER-02 (2) y
//      la mitad «otro servicio» de SOL-09 (8).
//      Las dos que se sumaron después (OFE-02, criterio 2, y SOL-09, criterio 8) son de
//      la fase 4: caben aquí porque el backend las niega antes de escribir.
//    · Por la interfaz, en móvil y en desktop: AUT-07 (criterio 3, con el 403
//      simulado) y la parte de OFE-02 (criterio 3) que se ve en pantalla.
//  - 2b, lo que niega el filtro de seguridad (SecurityConfig), al final del archivo:
//    AUT-07 (criterio 4), ASG-05 (2), SOL-09 (8, el médico), PUE-01 (5), ADM-02 (4),
//    ADM-06 (4) y, de C-10, REG-02. Desde C-20 (17 oct) el filtro responde 403, ya no 401, y no cierra
//    la sesión; antes de eso la fila pedía entrar de nuevo en cada caso (BUG-001).
//  - JER-02 (criterio 2) ya no muta: desde C-03 (17 oct) el backend lo niega antes de
//    escribir.
//
// No muta la base. Cada escritura (PUT, PATCH o POST) va a una ruta que el
// backend niega HOY antes de guardar, confirmado en el código (cada prueba cita
// dónde), y antes de mandarla la prueba comprueba por lectura que los datos son
// los que supone. Donde se pudo, el dato tiene una segunda red: si el permiso
// fallara, otra regla también frenaría la escritura antes de guardar (la oferta
// 1 no está pendiente de apertura; el médico 369 no es de Enfermería; en la 2b, el
// recurso no existe). Si una escritura respondiera 2xx, la base cambió: restaurarla.
//
// Datos del seed de Urgencias, ninguno del médico 369: las solicitudes 14
// (APROBADA, botar turno), 15 (PENDIENTE, cobertura), 16 (intercambio), 17
// (oferta particular) y 18 (oferta particular RECHAZADA), las ofertas generales 1
// (ABIERTA), 2 (CERRADA) y 3 (RECHAZADA) y, de Enfermería, un cupo libre. Las
// personas van por id; los listados con nombres solo se cuentan.
import {
  test, expect, ID, SERVICIO, APOYO, USUARIOS, esDesktop, soloPorApi, hoyChile, mesDe, anioDe,
  loginApi, apiGet, tokenRol, apiLlamar, solicitudesDeUrgencias, entrar, vistaActual, menuLateral,
  itemMenu, barraInferior, abrirSolicitudes, elegirPestana, leerLista,
} from '../helpers/hu.js';
import { ofertaSimulada, participantesSolicitud } from '../helpers/datos.js';

const URGENCIAS = { idServicio: SERVICIO.urgencias, nombre: 'Urgencias' };
const OTRO_SERVICIO = 'No tienes acceso a datos de otro servicio';
// Lo que responde el backend al que tiene sesión pero no el rol (JwtAccessDeniedHandler) o el permiso (GlobalExceptionHandler).
const SIN_PERMISO = 'No tienes permiso para realizar esta acción';
const SOL = { aprobada: 14, pendiente: 15, intercambio: 16, ofertaParticular: 17, rechazada: 18 };
const OFERTA_ABIERTA = 1;
const OFERTAS_RESUELTAS = { 2: 'CERRADA', 3: 'RECHAZADA' };
const MOTIVO_PRUEBA = 'Prueba E2E fase 2a: el backend debe negarlo';
const MOTIVO_2B = 'Prueba E2E fase 2b: el filtro de seguridad debe negarlo';

// Precondición de toda escritura que debe ser negada: la solicitud está en el
// seed, con el estado y el tipo que la prueba supone, y el médico no participa.
function comprobarAjena(solicitudes, id, { estado, tipo } = {}) {
  const s = solicitudes.get(id);
  expect(s, `la solicitud ${id} está en el seed de Urgencias`).toBeTruthy();
  if (estado) expect(s.estado, `estado de la solicitud ${id}`).toBe(estado);
  if (tipo) expect(s.tipoSolicitud?.tipo, `tipo de la solicitud ${id}`).toBe(tipo);
  expect(participantesSolicitud(s), `el médico 369 no participa en la solicitud ${id}`).not.toContain(ID.medico);
  return s;
}

// ═════════════════════════════════════════════════════════════════════════════
// HU-AUT-02 · Elegir el servicio cuando tengo varios
// ═════════════════════════════════════════════════════════════════════════════

test('HU-AUT-02 · criterio 6: select-service con un servicio que no es mío responde 403 «Acceso denegado al servicio indicado»', async ({ request }, testInfo) => {
  soloPorApi(testInfo);
  // FuncionarioController.selectService (403 con el mensaje de FuncionarioService.resolverAccesoServicio). No escribe: emite tokens.
  for (const [quien, ajeno] of [['multiservicio', SERVICIO.urgencias], ['medico', SERVICIO.enfermeria]]) {
    const { status, body } = await loginApi(request, USUARIOS[quien].rut);
    expect(status, `login de ${quien}`).toBe(200);
    expect(body.servicios.map((s) => s.servicioId), `el servicio ${ajeno} no es de ${quien}`).not.toContain(ajeno);
    const r = await request.post('/api/v2/funcionarios/login/select-service', { data: { preAuthToken: body.preAuthToken, servicioId: ajeno } });
    expect(r.status(), `${quien} elige el servicio ${ajeno}`).toBe(403);
    const cuerpo = await r.json();
    expect(cuerpo.error).toBe('Acceso denegado al servicio indicado');
    expect(cuerpo.token, 'no entrega un JWT').toBeUndefined();
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// HU-AUT-07 · Sesión vencida y acciones sin permiso
// ═════════════════════════════════════════════════════════════════════════════

test('HU-AUT-07 · criterio 3: ante un 403 sigo dentro, veo el aviso «No tienes permiso…» y la vista muestra su error (403 simulado)', async ({ page, api }, testInfo) => {
  await entrar(page, 'medico');
  // El 403 real que daba la bitácora general ya no se alcanza: desde C-06 (17 oct) el médico no llega a esa
  // vista (el menú no la ofrece y una vista guardada o forzada cae al inicio) y su historial del turno sí le
  // responde. El 403 se simula en otra lectura, la del calendario, con la respuesta del backend
  // (JwtAccessDeniedHandler y GlobalExceptionHandler: {"error": "No tienes permiso para realizar esta acción"}).
  await page.route(/\/api\/v2\/turnos\/servicio\/4\/calendario\/\d+\/\d+$/, (route) => route.fulfill({
    status: 403, json: { error: SIN_PERMISO },
  }));
  if (esDesktop(testInfo)) await itemMenu(page, 'Calendario').click();
  else await barraInferior(page, 'Calendario').click();
  await expect(page.getByText('No se pudieron cargar los turnos del mes. Intenta de nuevo.', { exact: true })).toBeVisible();
  // C-20 (17 oct): el 403 muestra un aviso unos segundos; la vista conserva su propio error.
  await expect(page.getByRole('status').filter({ hasText: `${SIN_PERMISO}.` })).toBeVisible();

  // Sigo dentro: la misma vista, el JWT en su lugar, sin login, y la API me sigue respondiendo.
  expect(await vistaActual(page)).toBe('calendar_view');
  expect(await page.evaluate(() => localStorage.getItem('jwt_token')), 'la sesión sigue guardada').toBeTruthy();
  await expect(page.getByPlaceholder('Ej: 12.345.678-9')).toHaveCount(0);
  if (esDesktop(testInfo)) await expect(menuLateral(page)).toBeVisible();
  expect(typeof await api.get(`/notificaciones/sin-leer/${ID.medico}`), 'la API responde con la misma sesión').toBe('number');
});

// ═════════════════════════════════════════════════════════════════════════════
// HU-CAL-08 · Exportar los turnos de todo el servicio (CSV)
// ═════════════════════════════════════════════════════════════════════════════

test('HU-CAL-08 · criterio 4: exportar los turnos de otro servicio responde 403, salvo al administrador', async ({ request }, testInfo) => {
  soloPorApi(testInfo);
  // ExportacionController.exportarTurnosCsv: exigirMismoServicio (SeguridadServicio), que exime al administrador. Solo GET.
  const hoy = hoyChile();
  const csv = (idServicio) => `/exportaciones/turnos/csv?anio=${anioDe(hoy)}&mes=${mesDe(hoy)}&idServicio=${idServicio}`;
  const jefatura = await tokenRol(request, 'jefatura');
  expect((await apiLlamar(request, jefatura, 'GET', csv(SERVICIO.urgencias))).status, 'control: la jefatura exporta su servicio').toBe(200);

  const negada = await apiLlamar(request, jefatura, 'GET', csv(SERVICIO.enfermeria));
  expect(negada.status, 'la jefatura de Urgencias exporta Enfermería').toBe(403);
  expect(negada.cuerpo.error).toBe(OTRO_SERVICIO);

  const admin = await apiLlamar(request, await tokenRol(request, 'admin', SERVICIO.urgencias), 'GET', csv(SERVICIO.enfermeria));
  expect(admin.status, 'el administrador, en Urgencias, exporta Enfermería').toBe(200);
  expect(String(admin.cuerpo)).toContain('Origen Turno');
});

// ═════════════════════════════════════════════════════════════════════════════
// HU-NOT-01 · Ver mi bandeja de notificaciones
// ═════════════════════════════════════════════════════════════════════════════

test('HU-NOT-01 · criterio 5: pedir la bandeja o el contador de otro funcionario responde 403', async ({ request }, testInfo) => {
  soloPorApi(testInfo);
  // NotificacionController.exigirPropiaONadaBandeja, en getBandeja y contarSinLeer. Solo GET.
  const otra = APOYO.notificaciones.id;
  for (const quien of ['medico', 'jefatura']) {
    const token = await tokenRol(request, quien);
    expect((await apiLlamar(request, token, 'GET', `/notificaciones/sin-leer/${ID[quien]}`)).status, `control: el contador propio de ${quien}`).toBe(200);
    for (const ruta of [`/notificaciones/usuario/${otra}`, `/notificaciones/sin-leer/${otra}`]) {
      const r = await apiLlamar(request, token, 'GET', ruta);
      expect(r.status, `${quien}: GET ${ruta}`).toBe(403);
      expect(r.cuerpo.error).toBe('No puedes consultar la bandeja de otro funcionario');
    }
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// HU-PER-01 · Ver el personal de mi servicio
// ═════════════════════════════════════════════════════════════════════════════

test('HU-PER-01 · criterio 4: pedir el personal de otro servicio responde 403, salvo al administrador', async ({ request }, testInfo) => {
  soloPorApi(testInfo);
  // FuncionarioController.getAllSummary: exigirMismoServicio salvo al administrador. Solo GET.
  const personal = (idServicio) => `/funcionarios/summary?servicioId=${idServicio}`;
  const jefatura = await tokenRol(request, 'jefatura');
  expect((await apiLlamar(request, jefatura, 'GET', personal(SERVICIO.urgencias))).status, 'control: la jefatura ve su servicio').toBe(200);

  const negada = await apiLlamar(request, jefatura, 'GET', personal(SERVICIO.enfermeria));
  expect(negada.status, 'la jefatura de Urgencias pide Enfermería').toBe(403);
  expect(negada.cuerpo.error).toBe(OTRO_SERVICIO);

  const admin = await apiLlamar(request, await tokenRol(request, 'admin', SERVICIO.urgencias), 'GET', personal(SERVICIO.enfermeria));
  expect(admin.status, 'el administrador, en Urgencias, ve el personal de Enfermería').toBe(200);
  expect(admin.cuerpo.length).toBeGreaterThan(0);
});

// ═════════════════════════════════════════════════════════════════════════════
// HU-SOL-08 · Responder una propuesta recibida
// ═════════════════════════════════════════════════════════════════════════════

test('HU-SOL-08 · criterio 4: si responde quien no es el receptor, 400 «No eres el receptor de esta solicitud»', async ({ request }, testInfo) => {
  soloPorApi(testInfo);
  // SolicitudService.responderOfertaIntercambio (:306) y responderOfertaParticular (:275):
  // el receptor sale del token y se compara antes de guardar. El filtro de seguridad deja
  // pasar al médico por /intercambio (SecurityConfig) y /oferta-particular no tiene regla.
  const casos = [
    { id: SOL.intercambio, tipo: 4, ruta: 'intercambio' },
    { id: SOL.ofertaParticular, tipo: 5, ruta: 'oferta-particular' },
  ];
  const solicitudes = await solicitudesDeUrgencias(request);
  for (const c of casos) {
    const s = comprobarAjena(solicitudes, c.id, { tipo: c.tipo });
    expect(s.funcionarioReceptor?.idFuncionario, `la solicitud ${c.id} está dirigida a otra persona`).toBeTruthy();
  }
  const token = await tokenRol(request, 'medico');
  for (const c of casos) {
    const r = await apiLlamar(request, token, 'PUT', `/solicitudes/${c.id}/${c.ruta}?respuesta=true`);
    expect(r.status, `PUT /solicitudes/${c.id}/${c.ruta}`).toBe(400);
    expect(r.cuerpo.error).toBe('No eres el receptor de esta solicitud');
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// HU-SOL-09 · Aprobar o rechazar solicitudes
// ═════════════════════════════════════════════════════════════════════════════

test('HU-SOL-09 · criterio 8: aprobar una solicitud de otro servicio responde 403 «No tienes acceso a solicitudes de otro servicio»', async ({ request }, testInfo) => {
  soloPorApi(testInfo);
  // SolicitudService.cambiarEstado (:370-395): fuera del intercambio, la solicitud es del
  // servicio de la sesión si su turno o su emisor lo son; si no, AccessDeniedException (403)
  // antes de bloquear turnos o guardar. El subrogante es de Enfermería; la solicitud 18, de
  // Urgencias. Segunda red: está RECHAZADA, así que si el permiso fallara la aprobación
  // igual se cortaría al releerla («Esta solicitud ya no está pendiente…», :411-414).
  const s = (await solicitudesDeUrgencias(request)).get(SOL.rechazada);
  expect(s, `la solicitud ${SOL.rechazada} está en el seed de Urgencias`).toBeTruthy();
  expect(s.estado, 'segunda red: ya está resuelta').toBe('RECHAZADA');
  expect(s.tipoSolicitud?.tipo, 'no es un intercambio (su negación tiene otro mensaje)').not.toBe(4);
  const subrogante = await tokenRol(request, 'subrogante');
  const enfermeria = (await apiGet(request, subrogante, `/funcionarios/summary?servicioId=${SERVICIO.enfermeria}`)).map((f) => f.idFuncionario);
  expect(enfermeria.includes(s.funcionario?.idFuncionario), 'el emisor no es de Enfermería').toBe(false);
  expect([...participantesSolicitud(s), s.turno?.funcionario?.idFuncionario, s.turnoReceptor?.funcionario?.idFuncionario], 'el subrogante no participa').not.toContain(ID.subrogante);

  const r = await apiLlamar(request, subrogante, 'PUT', `/solicitudes/${SOL.rechazada}/estado?nuevoEstado=APROBADA`);
  expect(r.status).toBe(403);
  expect(r.cuerpo.error).toBe('No tienes acceso a solicitudes de otro servicio');
  expect((await solicitudesDeUrgencias(request)).get(SOL.rechazada).estado, 'sin cambios').toBe('RECHAZADA');
});

// ═════════════════════════════════════════════════════════════════════════════
// HU-SOL-11 · Cancelar mi solicitud pendiente (R15)
// ═════════════════════════════════════════════════════════════════════════════

test('HU-SOL-11 · criterio 6: cancelar una solicitud ajena responde 403 «Solo puedes cancelar tus propias solicitudes»', async ({ request }, testInfo) => {
  soloPorApi(testInfo);
  // SolicitudService.cancelarSolicitud (:241-245): compara el emisor con el token antes de
  // mirar el estado y de guardar.
  comprobarAjena(await solicitudesDeUrgencias(request), SOL.pendiente, { estado: 'PENDIENTE' });
  const r = await apiLlamar(request, await tokenRol(request, 'medico'), 'PUT', `/solicitudes/${SOL.pendiente}/cancelar`);
  expect(r.status).toBe(403);
  expect(r.cuerpo.error).toBe('Solo puedes cancelar tus propias solicitudes');
});

test('HU-SOL-11 · criterio 6: cancelar una solicitud propia ya resuelta', async () => {
  test.skip(true, 'Fuera de la fase 2a: «Esta solicitud ya fue resuelta: no se puede cancelar» solo lo recibe su emisor, ningún usuario de §2.1 emitió una solicitud resuelta en el seed y crearla muta la base (fase 3).');
});

// ═════════════════════════════════════════════════════════════════════════════
// HU-SOL-12 · Modificar el motivo de mi solicitud
// ═════════════════════════════════════════════════════════════════════════════

test('HU-SOL-12 · criterio 4: el motivo de una solicitud ajena responde 403 «Solo quien emitió la solicitud puede modificar su motivo»', async ({ request }, testInfo) => {
  soloPorApi(testInfo);
  // SolicitudService.modificarMotivo (:574-577): compara el emisor con el token antes de guardar.
  comprobarAjena(await solicitudesDeUrgencias(request), SOL.pendiente, { estado: 'PENDIENTE' });
  const r = await apiLlamar(request, await tokenRol(request, 'medico'), 'PATCH',
    `/solicitudes/${SOL.pendiente}/motivo?motivo=${encodeURIComponent(MOTIVO_PRUEBA)}`);
  expect(r.status).toBe(403);
  expect(r.cuerpo.error).toBe('Solo quien emitió la solicitud puede modificar su motivo');
});

test('HU-SOL-12 · criterio 4: el motivo de una solicitud que ya no está pendiente responde 400', async ({ request }, testInfo) => {
  soloPorApi(testInfo);
  // SolicitudService.modificarMotivo (:566-568): el estado se revisa primero, para cualquiera.
  comprobarAjena(await solicitudesDeUrgencias(request), SOL.aprobada, { estado: 'APROBADA' });
  const r = await apiLlamar(request, await tokenRol(request, 'medico'), 'PATCH',
    `/solicitudes/${SOL.aprobada}/motivo?motivo=${encodeURIComponent(MOTIVO_PRUEBA)}`);
  expect(r.status).toBe(400);
  expect(r.cuerpo.error).toBe('Solo se puede modificar el motivo si la solicitud está en estado PENDIENTE');
});

// ═════════════════════════════════════════════════════════════════════════════
// HU-OFE-02 · Abrir o rechazar una oferta (gestión)
// ═════════════════════════════════════════════════════════════════════════════

// La oferta 1 del seed (Urgencias) no está pendiente de apertura: si el permiso
// fallara, aprobarOferta y rechazarOferta igual la rechazarían por su estado
// antes de guardar (OfertaGeneralService, «La oferta no está en estado …»).
async function comprobarOfertaNoPendiente(request) {
  const ofertas = await apiGet(request, await tokenRol(request, 'jefatura'), `/ofertas-generales/servicio/${SERVICIO.urgencias}`);
  const oferta = ofertas.find((o) => o.idOfertaGeneral === OFERTA_ABIERTA);
  expect(oferta, `la oferta ${OFERTA_ABIERTA} está en el seed de Urgencias`).toBeTruthy();
  expect(oferta.estado, 'segunda red: no está pendiente de apertura').not.toBe('PENDIENTE_APROBACION');
}

test('HU-OFE-02 · criterio 2: abrir o rechazar una oferta que no está pendiente de apertura responde «La oferta no está en estado PENDIENTE_APROBACION»', async ({ request }, testInfo) => {
  soloPorApi(testInfo);
  // OfertaGeneralService.aprobarOferta (:90-92) y rechazarOferta (:109-111): la jefatura es del
  // servicio de la oferta, así que pasa el permiso, y el estado se revisa antes de guardar
  // (RuntimeException, 400). Aquí no hay segunda red: el estado es la única guarda, y se
  // confirma antes de cada llamada. Si respondiera 2xx, la base cambió: restaurarla.
  const jefatura = await tokenRol(request, 'jefatura');
  const ofertas = await apiGet(request, jefatura, `/ofertas-generales/servicio/${SERVICIO.urgencias}`);
  for (const [id, estado] of Object.entries(OFERTAS_RESUELTAS)) {
    expect(ofertas.find((o) => o.idOfertaGeneral === Number(id))?.estado, `la oferta ${id} está ${estado} en el seed de Urgencias`).toBe(estado);
  }
  for (const [id, estado] of Object.entries(OFERTAS_RESUELTAS)) {
    for (const accion of ['aprobar', 'rechazar']) {
      const r = await apiLlamar(request, jefatura, 'PUT', `/ofertas-generales/${id}/${accion}`);
      expect(r.status, `${accion} la oferta ${id} (${estado})`).toBe(400);
      expect(r.cuerpo.error).toBe('La oferta no está en estado PENDIENTE_APROBACION');
    }
  }
  const despues = await apiGet(request, jefatura, `/ofertas-generales/servicio/${SERVICIO.urgencias}`);
  for (const [id, estado] of Object.entries(OFERTAS_RESUELTAS)) {
    expect(despues.find((o) => o.idOfertaGeneral === Number(id))?.estado, `la oferta ${id} sigue ${estado}`).toBe(estado);
  }
});

test('HU-OFE-02 · criterio 3: el médico que aprueba o rechaza una oferta por API recibe 403', async ({ request }, testInfo) => {
  soloPorApi(testInfo);
  // OfertaGeneralController.aprobar y rechazar: @PreAuthorize de gestión (:47 y :55), negado
  // dentro del controller (403).
  await comprobarOfertaNoPendiente(request);
  const token = await tokenRol(request, 'medico');
  for (const accion of ['aprobar', 'rechazar']) {
    const r = await apiLlamar(request, token, 'PUT', `/ofertas-generales/${OFERTA_ABIERTA}/${accion}`);
    expect(r.status, `PUT /ofertas-generales/${OFERTA_ABIERTA}/${accion}`).toBe(403);
  }
});

test('HU-OFE-02 · criterio 3: una oferta de otro servicio responde 403', async ({ request }, testInfo) => {
  soloPorApi(testInfo);
  // OfertaGeneralService.exigirMismoServicioQueOferta (:87 y :106), antes del estado y de
  // guardar. El subrogante es de Enfermería; la oferta, de Urgencias.
  await comprobarOfertaNoPendiente(request);
  const token = await tokenRol(request, 'subrogante');
  for (const accion of ['aprobar', 'rechazar']) {
    const r = await apiLlamar(request, token, 'PUT', `/ofertas-generales/${OFERTA_ABIERTA}/${accion}`);
    expect(r.status, `PUT /ofertas-generales/${OFERTA_ABIERTA}/${accion}`).toBe(403);
    expect(r.cuerpo.error).toBe(OTRO_SERVICIO);
  }
});

test('HU-OFE-02 · criterio 3: el médico no ve «Aprobar» ni «Rechazar» en una oferta pendiente de apertura', async ({ page, api }, testInfo) => {
  // El seed no tiene ofertas pendientes de apertura: se agrega una simulada a la
  // respuesta GET (nada se guarda). La jefatura, que sí ve los botones, es el control.
  await entrar(page, 'jefatura');
  const turnos = await api.get(`/turnos/servicio/${SERVICIO.urgencias}`);
  const personal = await api.get(`/funcionarios/summary?servicioId=${SERVICIO.urgencias}`);
  const ofertor = personal.find((f) => f.idFuncionario === 341);
  const suTurno = turnos.find((t) => t.idFuncionario === 341 && t.diaInicioTurno > hoyChile());
  expect(ofertor && suTurno, 'el médico 341 tiene un turno futuro para ofrecer').toBeTruthy();
  const simulada = ofertaSimulada({ id: 9921, estado: 'PENDIENTE_APROBACION', ofertor, turno: suTurno, servicio: URGENCIAS, motivo: 'Simulada: oferta por abrir' });
  await page.route(new RegExp(`/api/v2/ofertas-generales/servicio/${SERVICIO.urgencias}$`), async (route) => {
    const r = await route.fetch();
    return route.fulfill({ response: r, json: [...await r.json(), simulada] });
  });
  const verOfertas = async () => {
    await abrirSolicitudes(page, testInfo);
    await elegirPestana(page, testInfo, 'Ofertas generales');
    return leerLista(page, testInfo);
  };

  const porAbrir = (await verOfertas()).filter((v) => v.estado === 'Pend. apertura');
  expect(porAbrir, 'control: la jefatura ve la oferta simulada por abrir').toHaveLength(1);
  expect(porAbrir[0].botones).toEqual(expect.arrayContaining(['Aprobar', 'Rechazar']));

  await entrar(page, 'medico');
  const botones = (await verOfertas()).flatMap((v) => v.botones);
  expect(botones, 'botones del médico en «Ofertas generales»').not.toContain('Aprobar');
  expect(botones).not.toContain('Rechazar');
});

// ═════════════════════════════════════════════════════════════════════════════
// HU-ASG-02 · Asignar un funcionario a un cupo libre
// ═════════════════════════════════════════════════════════════════════════════

// Cupo libre de Enfermería desde hoy, leído por el subrogante (es su servicio).
// Segunda red: el médico 369 no es de Enfermería, así que si faltara la negación
// por servicio, GestionTurnoService.validarFuncionarioAsignable (:287-289)
// rechazaría la asignación antes de guardar.
async function cupoDeEnfermeria(request) {
  const token = await tokenRol(request, 'subrogante');
  const personal = await apiGet(request, token, `/funcionarios/summary?servicioId=${SERVICIO.enfermeria}`);
  expect(personal.map((f) => f.idFuncionario), 'segunda red: el médico 369 no es de Enfermería').not.toContain(ID.medico);
  const hoy = hoyChile();
  const cupos = (await apiGet(request, token, `/turnos/servicio/${SERVICIO.enfermeria}`))
    .filter((t) => t.idFuncionario == null && t.diaInicioTurno >= hoy)
    .sort((a, b) => a.diaInicioTurno.localeCompare(b.diaInicioTurno));
  expect(cupos.length, 'Enfermería tiene un cupo libre desde hoy').toBeGreaterThan(0);
  return cupos[0];
}

// La jefatura de Urgencias intenta poner al médico 369 en ese cupo de Enfermería.
// GestionTurnoService.alterarTurno (:68) exige el mismo servicio antes de la acción.
const asignarEnOtroServicio = async (request, cupo) => apiLlamar(request, await tokenRol(request, 'jefatura'), 'POST', '/turnos/alterar', {
  data: { idTurno: cupo.id, accion: 'ASIGNAR', idNuevoMedico: ID.medico, motivo: MOTIVO_PRUEBA },
});

test('HU-ASG-02 · criterio 5: asignar en un cupo de otro servicio se rechaza con «No tienes acceso a datos de otro servicio»', async ({ request }, testInfo) => {
  soloPorApi(testInfo);
  const r = await asignarEnOtroServicio(request, await cupoDeEnfermeria(request));
  expect(r.status, 'si fuera 2xx, la asignación pasó y la base cambió').toBeGreaterThanOrEqual(400);
  expect(r.cuerpo.error).toBe(OTRO_SERVICIO);
});

test('HU-ASG-02 · criterio 5: un turno de otro servicio responde 403', async ({ request }, testInfo) => {
  soloPorApi(testInfo);
  // C-20 (17 oct): TurnoController.alterarTurno deja pasar la AccessDeniedException de SeguridadServicio
  // (antes la capturaba con toda RuntimeException y respondía 400).
  const cupo = await cupoDeEnfermeria(request);
  const r = await asignarEnOtroServicio(request, cupo);
  expect([r.status, r.cuerpo?.error]).toEqual([403, OTRO_SERVICIO]);
});

// ═════════════════════════════════════════════════════════════════════════════
// HU-DET-04 · Ver el historial desde el detalle (permiso de GET /bitacoras/turno/{id})
// ═════════════════════════════════════════════════════════════════════════════

test('HU-DET-04 · criterio 2: el médico lee el historial del turno que tiene; el de un cupo o el de un turno ajeno responde 403', async ({ request }, testInfo) => {
  soloPorApi(testInfo);
  // BitacoraService.historialDelTurno (C-06, 17 oct): la gestión lo lee en los turnos de su servicio, también en un cupo;
  // el médico, solo en el turno que tiene hoy («Solo puedes ver el historial de tus turnos»). La bitácora general sigue
  // siendo solo de gestión. Solo GET.
  const medico = await tokenRol(request, 'medico');
  const hoy = hoyChile();
  const turnos = (await apiGet(request, medico, `/turnos/servicio/${SERVICIO.urgencias}`)).filter((t) => t.diaInicioTurno > hoy);
  const suyo = turnos.find((t) => t.idFuncionario === ID.medico);
  const ajeno = turnos.find((t) => t.idFuncionario != null && t.idFuncionario !== ID.medico);
  const cupo = turnos.find((t) => t.idFuncionario == null);
  expect(suyo && ajeno && cupo, 'hay un turno del médico, uno ajeno y un cupo, de hoy en adelante').toBeTruthy();

  const propio = await apiLlamar(request, medico, 'GET', `/bitacoras/turno/${suyo.id}`);
  expect(propio.status, 'su turno').toBe(200);
  expect(Array.isArray(propio.cuerpo), 'una lista de eventos').toBe(true);
  for (const [t, que] of [[ajeno, 'un turno ajeno'], [cupo, 'un cupo']]) {
    const r = await apiLlamar(request, medico, 'GET', `/bitacoras/turno/${t.id}`);
    expect([r.status, r.cuerpo?.error], que).toEqual([403, 'Solo puedes ver el historial de tus turnos']);
  }
  expect((await apiLlamar(request, medico, 'GET', '/bitacoras/dto')).status, 'la bitácora general sigue siendo de gestión').toBe(403);

  // Control: la jefatura lo lee en los tres.
  const jefatura = await tokenRol(request, 'jefatura');
  for (const [t, que] of [[suyo, 'el turno del médico'], [ajeno, 'un turno ajeno'], [cupo, 'un cupo']]) {
    expect((await apiLlamar(request, jefatura, 'GET', `/bitacoras/turno/${t.id}`)).status, `jefatura: ${que}`).toBe(200);
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// HU-JER-02 · El subrogante no designa jerarquía
// ═════════════════════════════════════════════════════════════════════════════

test('HU-JER-02 · criterio 2: el subrogante que cambia el rol de una persona de Enfermería por API recibe 403', async ({ request }, testInfo) => {
  soloPorApi(testInfo);
  // FuncionarioController.update (C-03, 17 oct): al subrogante que manda «rol» o «servicioId» lo niega con 403 al
  // comienzo, antes de tocar a nadie, también sobre su propio registro. Va primero con él mismo, que ya es
  // SUBROGANTE de Enfermería: si faltara la negación, pedir su propio rol no cambiaría nada; recién después, con
  // otra persona del servicio (un médico de Enfermería, rol 3 → pediría el 2).
  const token = await tokenRol(request, 'subrogante');
  const personal = await apiGet(request, token, `/funcionarios/summary?servicioId=${SERVICIO.enfermeria}`);
  const rolEn = (f) => f?.servicios?.find((x) => x.idServicio === SERVICIO.enfermeria)?.rolServicioNombre;
  expect(rolEn(personal.find((f) => f.idFuncionario === ID.subrogante)), 'el 101 es SUBROGANTE de Enfermería').toBe('SUBROGANTE');
  const persona = personal.find((f) => rolEn(f) === 'MEDICO');
  expect(persona, 'Enfermería tiene un médico').toBeTruthy();

  for (const idPersona of [ID.subrogante, persona.idFuncionario]) {
    const r = await apiLlamar(request, token, 'PUT', `/funcionarios/${idPersona}`, { data: { servicioId: SERVICIO.enfermeria, rol: 2 } });
    expect([r.status, r.cuerpo?.error], `PUT /funcionarios/${idPersona}`)
      .toEqual([403, 'El subrogante no puede designar jerarquía ni sumar funcionarios al servicio']);
  }
  const despues = await apiGet(request, token, `/funcionarios/summary?servicioId=${SERVICIO.enfermeria}`);
  expect(rolEn(despues.find((f) => f.idFuncionario === persona.idFuncionario)), 'sin cambios: sigue siendo MEDICO').toBe('MEDICO');
});

// ═════════════════════════════════════════════════════════════════════════════
// Fase 2b · Lo que niega el filtro de seguridad (SecurityConfig), después de C-20
// ═════════════════════════════════════════════════════════════════════════════
//
// Desde C-20 el filtro responde 403 {"error": "No tienes permiso para realizar esta acción"} a
// quien tiene sesión y le falta el rol (JwtAccessDeniedHandler), y 401 solo sin sesión o con un
// token inválido (JwtAuthenticationEntryPoint): la interfaz no cierra la sesión ante un 403.
// Antes del arreglo estas negaciones respondían 401 (BUG-001) y la fila 2b del catálogo pedía
// iniciar sesión de nuevo en cada caso; ya no hace falta.
//
// Ninguna escribe: cada escritura va a un recurso que no existe (o con el cuerpo vacío), así que,
// si el filtro la dejara pasar, el controller la rechazaría antes de guardar (404 o 400).
// El mensaje exacto de 403 distingue al filtro de las negaciones de los services, que dicen otra
// cosa («No tienes acceso a datos de otro servicio»).
const NO_EXISTE = 2_000_000_000;

/** Exige que el filtro niegue `metodo ruta` a `quien` con 403 y el mensaje fijo. */
async function negadaPorElFiltro(request, quien, metodo, ruta, data) {
  const r = await apiLlamar(request, await tokenRol(request, quien), metodo, ruta, { data });
  expect([r.status, r.cuerpo?.error], `${quien}: ${metodo} ${ruta}`).toEqual([403, SIN_PERMISO]);
}

/** Con el mismo token, una lectura propia sigue respondiendo 200: la negación no cerró la sesión. */
async function sesionVigente(request, quien) {
  const r = await apiLlamar(request, await tokenRol(request, quien), 'GET', `/notificaciones/sin-leer/${ID[quien]}`);
  expect(r.status, `${quien}: la sesión sigue vigente después de la negación`).toBe(200);
}

test('HU-AUT-07 · criterio 4: lo que el filtro niega por rol (el médico llama a POST /servicios) responde 403 y no cierra la sesión', async ({ request }, testInfo) => {
  soloPorApi(testInfo);
  // SecurityConfig: POST /servicios/** es solo del ADMINISTRADOR (GLOBAL_ADMIN_PATHS). Segunda red: el
  // cuerpo no trae nombre, así que si el filtro la dejara pasar, ServicioService.createServicio la rechazaría.
  await sesionVigente(request, 'medico'); // control: el token del médico sirve
  await negadaPorElFiltro(request, 'medico', 'POST', '/servicios', {});
  await sesionVigente(request, 'medico'); // 403 y no 401: sigue sirviendo, sin volver a entrar

  // El 401 queda para quien no tiene sesión: sin token o con uno inválido.
  const sinSesion = await request.fetch('/api/v2/servicios', { method: 'POST', data: {} });
  expect(sinSesion.status(), 'sin token').toBe(401);
  const invalido = await apiLlamar(request, 'no.es.un.jwt', 'POST', '/servicios', { data: {} });
  expect(invalido.status, 'con un token inválido').toBe(401);
});

test('HU-ASG-05 · criterio 2: el médico no asigna ni edita turnos por API: alterar, crear, editar y eliminar responden 403', async ({ request }, testInfo) => {
  soloPorApi(testInfo);
  // SecurityConfig: POST, PUT y DELETE sobre /turnos/** son de ADMINISTRADOR, JEFATURA y SUBROGANTE
  // (SERVICE_ADMIN_PATHS). Segunda red: el turno no existe y el cuerpo de POST /turnos va vacío.
  await sesionVigente(request, 'medico');
  await negadaPorElFiltro(request, 'medico', 'POST', '/turnos/alterar', { idTurno: NO_EXISTE, accion: 'ASIGNAR', idNuevoMedico: ID.medico, motivo: MOTIVO_2B });
  await negadaPorElFiltro(request, 'medico', 'POST', '/turnos', {});
  await negadaPorElFiltro(request, 'medico', 'PUT', `/turnos/${NO_EXISTE}`, { horaInicio: '08:00' });
  await negadaPorElFiltro(request, 'medico', 'DELETE', `/turnos/${NO_EXISTE}`);
  await sesionVigente(request, 'medico');
});

test('HU-SOL-09 · criterio 8: el médico que aprueba o rechaza una solicitud por API recibe 403', async ({ request }, testInfo) => {
  soloPorApi(testInfo);
  // SecurityConfig: PUT /solicitudes/*/estado es de ADMINISTRADOR, JEFATURA y SUBROGANTE. Segunda red: la
  // solicitud 18 ya está RECHAZADA (aprobarla se cortaría con «ya no está pendiente») y la otra no existe.
  const s = (await solicitudesDeUrgencias(request)).get(SOL.rechazada);
  expect(s?.estado, `la solicitud ${SOL.rechazada} está RECHAZADA`).toBe('RECHAZADA');
  await negadaPorElFiltro(request, 'medico', 'PUT', `/solicitudes/${SOL.rechazada}/estado?nuevoEstado=APROBADA`);
  await negadaPorElFiltro(request, 'medico', 'PUT', `/solicitudes/${NO_EXISTE}/estado?nuevoEstado=RECHAZADA`);
  expect((await solicitudesDeUrgencias(request)).get(SOL.rechazada).estado, 'sin cambios').toBe('RECHAZADA');
  await sesionVigente(request, 'medico');
});

test('HU-PUE-01 · criterio 5: el médico no escribe puestos por API: crear, renombrar y eliminar responden 403', async ({ request }, testInfo) => {
  soloPorApi(testInfo);
  // SecurityConfig: POST, PUT y DELETE sobre /puestos/** son de ADMINISTRADOR, JEFATURA y SUBROGANTE. Segunda
  // red: el servicio y el puesto no existen (crear exigiría el mismo servicio de la sesión, renombrar y eliminar, un puesto del servicio).
  await sesionVigente(request, 'medico');
  await negadaPorElFiltro(request, 'medico', 'POST', '/puestos', { idServicio: NO_EXISTE, nombre: '' });
  await negadaPorElFiltro(request, 'medico', 'PUT', `/puestos/${NO_EXISTE}?nombre=${encodeURIComponent(MOTIVO_2B)}`);
  await negadaPorElFiltro(request, 'medico', 'DELETE', `/puestos/${NO_EXISTE}`);
  await sesionVigente(request, 'medico');
});

test('HU-ADM-02 · criterio 4: con otro rol, crear, editar o desactivar un servicio responde 403', async ({ request }, testInfo) => {
  soloPorApi(testInfo);
  // SecurityConfig: POST, PUT y DELETE sobre /servicios/** son solo del ADMINISTRADOR. Segunda red: el cuerpo de
  // POST no trae nombre y el servicio de PUT y DELETE no existe.
  for (const quien of ['medico', 'jefatura', 'subrogante']) {
    await sesionVigente(request, quien);
    await negadaPorElFiltro(request, quien, 'POST', '/servicios', {});
    await negadaPorElFiltro(request, quien, 'PUT', `/servicios/${NO_EXISTE}`, { nombre: MOTIVO_2B });
    await negadaPorElFiltro(request, quien, 'DELETE', `/servicios/${NO_EXISTE}`);
    await sesionVigente(request, quien);
  }
});

test('HU-ADM-06 · criterio 4: la jefatura y el subrogante no escriben tipos de turno por API: crear, editar y eliminar responden 403', async ({ request }, testInfo) => {
  soloPorApi(testInfo);
  // SecurityConfig: POST, PUT y DELETE sobre /tipos-turno/** son solo del ADMINISTRADOR (C-01). Segunda red: el
  // tipo de turno no existe y el de POST apunta a un servicio que tampoco.
  for (const quien of ['jefatura', 'subrogante']) {
    await sesionVigente(request, quien);
    await negadaPorElFiltro(request, quien, 'POST', '/tipos-turno', { servicioId: NO_EXISTE, nombre: MOTIVO_2B, horaInicio: '08:00', horaFin: '20:00' });
    await negadaPorElFiltro(request, quien, 'PUT', `/tipos-turno/${NO_EXISTE}`, { nombre: MOTIVO_2B });
    await negadaPorElFiltro(request, quien, 'DELETE', `/tipos-turno/${NO_EXISTE}`);
    await sesionVigente(request, quien);
  }
});

test('HU-REG-02 · C-10: la jefatura y el subrogante no escriben reglas de horario por API: crear, editar y eliminar responden 403', async ({ request }, testInfo) => {
  soloPorApi(testInfo);
  // SecurityConfig: POST, PUT y DELETE sobre /reglas-servicio/** son solo del ADMINISTRADOR desde C-10 (decidido el
  // 17 oct; antes eran de la gestión del servicio). Segunda red: el cuerpo de POST va vacío y la regla de PUT y DELETE no existe.
  for (const quien of ['jefatura', 'subrogante']) {
    await sesionVigente(request, quien);
    await negadaPorElFiltro(request, quien, 'POST', '/reglas-servicio', {});
    await negadaPorElFiltro(request, quien, 'PUT', `/reglas-servicio/${NO_EXISTE}`, { nombre: MOTIVO_2B });
    await negadaPorElFiltro(request, quien, 'DELETE', `/reglas-servicio/${NO_EXISTE}`);
    await sesionVigente(request, quien);
  }
});
