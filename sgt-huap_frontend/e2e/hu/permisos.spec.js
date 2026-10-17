// Negativos de permiso que niega el controller, fase 2a del catálogo
// docs/qa/HISTORIAS_DE_USUARIO.md (§6.2). Hoy responden 403 o 400 sin cerrar la
// sesión: no pasan por el filtro de seguridad, así que BUG-001 (C-20) no los toca.
//  - Por API, una vez y en el proyecto desktop: AUT-02 (criterio 6), CAL-08 (4),
//    NOT-01 (5), PER-01 (4), SOL-08 (4), SOL-11 (6, solicitud ajena), SOL-12 (4),
//    OFE-02 (3) y ASG-02 (5).
//  - Por la interfaz, en móvil y en desktop: AUT-07 (criterio 3) y la parte de
//    OFE-02 (criterio 3) que se ve en pantalla.
//  - Omitida: JER-02 (criterio 2). Hoy el backend lo permite y la prueba
//    cambiaría el rol de una persona (C-03).
//
// No muta la base. Cada escritura (PUT, PATCH o POST) va a una ruta que el
// backend niega HOY antes de guardar, confirmado en el código (cada prueba cita
// dónde), y antes de mandarla la prueba comprueba por lectura que los datos son
// los que supone. Donde se pudo, el dato tiene una segunda red: si el permiso
// fallara, otra regla también frenaría la escritura antes de guardar (la oferta
// 1 no está pendiente de apertura; el médico 369 no es de Enfermería). Si una
// escritura respondiera 2xx, la base cambió: restaurarla.
//
// Datos del seed de Urgencias, ninguno del médico 369: las solicitudes 14
// (APROBADA, botar turno), 15 (PENDIENTE, cobertura), 16 (intercambio) y 17
// (oferta particular), la oferta general 1 (ABIERTA) y, de Enfermería, un cupo
// libre. Las personas van por id; los listados con nombres solo se cuentan.
import {
  test, expect, fallaConocida, ID, SERVICIO, APOYO, USUARIOS, esDesktop, soloPorApi, hoyChile, mesDe, anioDe,
  loginApi, apiGet, tokenRol, apiLlamar, solicitudesDeUrgencias, entrar, irA, vistaActual, menuLateral,
  abrirSolicitudes, elegirPestana, leerLista,
} from '../helpers/hu.js';
import { ofertaSimulada, participantesSolicitud } from '../helpers/datos.js';

const URGENCIAS = { idServicio: SERVICIO.urgencias, nombre: 'Urgencias' };
const OTRO_SERVICIO = 'No tienes acceso a datos de otro servicio';
const SOL = { aprobada: 14, pendiente: 15, intercambio: 16, ofertaParticular: 17 };
const OFERTA_ABIERTA = 1;
const MOTIVO_PRUEBA = 'Prueba E2E fase 2a: el backend debe negarlo';

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

test('HU-AUT-07 · criterio 3: ante un 403 (el médico abre la bitácora) sigo dentro y la vista muestra su error', async ({ page, api }, testInfo) => {
  await entrar(page, 'medico');
  // BitacoraController.getAllDTO exige rol de gestión con @PreAuthorize: la negación es
  // dentro del controller y GlobalExceptionHandler responde 403. La bitácora está entre
  // las vistas comunes (C-06): el médico llega con «Ver historial» o al refrescar ahí.
  const respuesta = page.waitForResponse((r) => new URL(r.url()).pathname === '/api/v2/bitacoras/dto');
  await irA(page, 'bitacora');
  expect((await respuesta).status(), 'GET /bitacoras/dto con el token del médico').toBe(403);
  await expect(page.getByText('No se pudo cargar la bitácora.', { exact: true })).toBeVisible();

  // Sigo dentro: la misma vista, el JWT en su lugar, sin login, y la API me sigue respondiendo.
  expect(await vistaActual(page)).toBe('bitacora');
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
  const cupo = await cupoDeEnfermeria(request);
  fallaConocida('§5.1 y §6.3: TurnoController.alterarTurno (:145) captura toda RuntimeException, también la AccessDeniedException de SeguridadServicio, y responde 400.');
  const r = await asignarEnOtroServicio(request, cupo);
  expect(r.status).toBe(403);
});

// ═════════════════════════════════════════════════════════════════════════════
// HU-JER-02 · El subrogante no designa jerarquía
// ═════════════════════════════════════════════════════════════════════════════

test('HU-JER-02 · criterio 2: el subrogante que cambia el rol de una persona de Enfermería por API recibe 403', async () => {
  test.skip(true, 'C-03: hoy el backend lo permite (FuncionarioController.update trata al SUBROGANTE como gestión del servicio) y la prueba cambiaría el rol de esa persona: muta la base. Correr después del arreglo o en la fase 5, con restauración.');
});
