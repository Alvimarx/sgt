// Lecturas sin control por servicio o por dueño (catálogo §5, C-17), fase 2a
// (§6.2). Hoy responden 200: cada prueba exige lo correcto y deja constancia de
// la fuga con fallaConocida('C-17: …'). Lo correcto sale de la recomendación de
// C-17 («GET /solicitudes filtrado por rol y servicio, exigirMismoServicio en
// los GET por servicio, y control de dueño en las notificaciones») y de BUG-002,
// que C-17 cita: un médico ve solo las solicitudes en las que participa.
//  - Un recurso de otro servicio o de otra persona, pedido por su id: 403.
//  - Un listado: se niega (403) o no trae nada ajeno; se aceptan las dos formas
//    de corregirlo.
// Las lecturas que la fase 2a sumó a C-17 (encontradas por estas pruebas) van al final.
//
// Quién lee qué:
//  - de otro servicio: el subrogante de Enfermería (101) lee datos de Urgencias;
//  - de otra persona: el médico 369 lee solicitudes y notificaciones de colegas
//    de Urgencias en las que no participa;
//  - de la bandeja de gestión: la jefatura de Urgencias lee GET /solicitudes.
// Antes de marcar la falla, cada prueba hace una lectura legítima de control
// (lo propio, o lo mismo con quien sí puede verlo). Si la ruta cambiara o
// fallara por otra causa, la prueba falla de verdad en vez de quedar escondida
// en la falla esperada.
//
// Solo GET (y el login por API, que no escribe): no muta. Corren una vez, en el
// proyecto desktop. Ninguna prueba elige datos de Medicina Interna ni de
// Cirugía, donde está el funcionario 4 (§7): los listados generales que hoy los
// entregan solo se cuentan. Tampoco se imprimen nombres ni RUT: ids y conteos.
import {
  test, expect, fallaConocida, ID, SERVICIO, APOYO, soloPorApi, hoyChile, mesDe, anioDe,
  tokenRol, apiLlamar, solicitudesDeUrgencias,
} from '../helpers/hu.js';
import { participantesSolicitud } from '../helpers/datos.js';

// Solicitudes del seed de Urgencias en las que el médico 369 no participa.
const SOL = { pendiente: 15, intercambio: 16 };
const OFERTA_ABIERTA = 1;

const leer = async (request, quien, ruta) => apiLlamar(
  request, await tokenRol(request, quien, quien === 'admin' ? SERVICIO.urgencias : null), 'GET', ruta,
);

/** Lectura legítima de control: responde 200. Devuelve el cuerpo. */
async function control(request, quien, ruta) {
  const r = await leer(request, quien, ruta);
  expect(r.status, `control: GET ${ruta} con ${quien}`).toBe(200);
  return r.cuerpo;
}

/** Lo correcto ante un recurso de otro servicio o de otra persona: 403. */
async function exigirNegada(request, quien, ruta) {
  const r = await leer(request, quien, ruta);
  expect(r.status, `GET ${ruta} con ${quien}`).toBe(403);
}

/** Lo correcto ante un listado: se niega (403) o no trae nada ajeno. Solo cuenta. */
async function exigirSinAjenos(request, quien, ruta, esAjeno) {
  const r = await leer(request, quien, ruta);
  if (r.status === 403) return;
  expect(r.status, `GET ${ruta} con ${quien}`).toBe(200);
  expect(Array.isArray(r.cuerpo), `GET ${ruta} devuelve una lista`).toBe(true);
  expect(r.cuerpo.filter(esAjeno).length, `GET ${ruta} con ${quien}: elementos ajenos, de ${r.cuerpo.length}`).toBe(0);
}

const ajenaAlMedico = (s) => !participantesSolicitud(s).includes(ID.medico);

async function solicitudAjena(request, id) {
  const s = (await solicitudesDeUrgencias(request)).get(id);
  expect(s, `la solicitud ${id} está en el seed de Urgencias`).toBeTruthy();
  expect(ajenaAlMedico(s), `el médico 369 no participa en la solicitud ${id}`).toBe(true);
  return s;
}

// ═════════════════════════════════════════════════════════════════════════════
// De otra persona: el médico 369
// ═════════════════════════════════════════════════════════════════════════════

test('C-17 · GET /solicitudes: el médico recibe solo las solicitudes en las que participa', async ({ request }, testInfo) => {
  soloPorApi(testInfo);
  const bandeja = await solicitudesDeUrgencias(request);
  expect([...bandeja.values()].filter(ajenaAlMedico).length, 'hay solicitudes de Urgencias ajenas al médico').toBeGreaterThan(0);
  fallaConocida('C-17 y BUG-002: SolicitudController.getAllSolicitud (:116) entrega todas las solicitudes del hospital a cualquier autenticado.');
  await exigirSinAjenos(request, 'medico', '/solicitudes', ajenaAlMedico);
});

test('C-17 · GET /solicitudes/funcionario/{id}: el médico no lee las solicitudes que emitió otra persona', async ({ request }, testInfo) => {
  soloPorApi(testInfo);
  const emisor = (await solicitudAjena(request, SOL.pendiente)).funcionario.idFuncionario;
  await control(request, 'medico', `/solicitudes/funcionario/${ID.medico}`);
  fallaConocida('C-17 y BUG-002: SolicitudController.getAllSolicitudFuncionario (:122) no compara el id pedido con el de la sesión.');
  await exigirSinAjenos(request, 'medico', `/solicitudes/funcionario/${emisor}`, ajenaAlMedico);
});

test('C-17 · GET /solicitudes/receptor/{id}: el médico no lee las solicitudes dirigidas a otra persona', async ({ request }, testInfo) => {
  soloPorApi(testInfo);
  const receptor = (await solicitudAjena(request, SOL.intercambio)).funcionarioReceptor?.idFuncionario;
  expect(receptor, `la solicitud ${SOL.intercambio} tiene receptor`).toBeTruthy();
  await control(request, 'medico', `/solicitudes/receptor/${ID.medico}`);
  fallaConocida('C-17 y BUG-002: SolicitudController.getAllSolicitudReceptor (:129) no compara el id pedido con el de la sesión.');
  await exigirSinAjenos(request, 'medico', `/solicitudes/receptor/${receptor}`, ajenaAlMedico);
});

test('C-17 · GET /solicitudes/tipo/{id}: el médico recibe solo las solicitudes en las que participa', async ({ request }, testInfo) => {
  soloPorApi(testInfo);
  const tipo = (await solicitudAjena(request, SOL.pendiente)).tipoSolicitud.idTipoSolicitud;
  await control(request, 'jefatura', `/solicitudes/tipo/${tipo}`);
  fallaConocida('C-17 y BUG-002: SolicitudController.getAllSolicitudByTipo (:137) entrega las solicitudes de ese tipo de todo el hospital.');
  await exigirSinAjenos(request, 'medico', `/solicitudes/tipo/${tipo}`, ajenaAlMedico);
});

test('C-17 · GET /solicitudes/turno/{id}: el médico no lee las solicitudes de un turno en las que no participa', async ({ request }, testInfo) => {
  soloPorApi(testInfo);
  const turno = (await solicitudAjena(request, SOL.pendiente)).turno.idTurno;
  const sobreElTurno = await control(request, 'jefatura', `/solicitudes/turno/${turno}`);
  expect(sobreElTurno.map((s) => s.idSolicitud), `la solicitud ${SOL.pendiente} es sobre ese turno`).toContain(SOL.pendiente);
  fallaConocida('C-17 y BUG-002: SolicitudController.getAllSolicitudTurno (:143) no filtra por participante ni por servicio.');
  await exigirSinAjenos(request, 'medico', `/solicitudes/turno/${turno}`, ajenaAlMedico);
});

test('C-17 · GET /notificaciones/{id}: el médico no lee una notificación ajena', async ({ request }, testInfo) => {
  soloPorApi(testInfo);
  // La notificación es de 30000013-3 (312, de apoyo), que la lee; el médico no la tiene en su bandeja.
  const deElla = await control(request, 'notificaciones', `/notificaciones/usuario/${APOYO.notificaciones.id}`);
  expect(deElla.length, 'la usuaria de apoyo tiene notificaciones').toBeGreaterThan(0);
  const id = deElla[0].idNotificacion;
  await control(request, 'notificaciones', `/notificaciones/${id}`);
  const delMedico = await control(request, 'medico', `/notificaciones/usuario/${ID.medico}`);
  expect(delMedico.map((n) => n.idNotificacion), 'no está en la bandeja del médico').not.toContain(id);
  fallaConocida('C-17 y BUG-006: NotificacionController.getNotificacion (:61) no comprueba el dueño de la notificación.');
  await exigirNegada(request, 'medico', `/notificaciones/${id}`);
});

test('C-17 · GET /Personal/summary: el médico no lee el padrón del hospital', async ({ request }, testInfo) => {
  soloPorApi(testInfo);
  // La jefatura lo usa para sumar personal a su servicio (HU-PER-02); el médico no tiene pantalla que lo pida.
  await control(request, 'jefatura', '/Personal/summary');
  fallaConocida('C-17: ViewPersonalController.getAllPersonal (:45) entrega el padrón del hospital, con RUT, a cualquier autenticado.');
  await exigirNegada(request, 'medico', '/Personal/summary');
});

// ═════════════════════════════════════════════════════════════════════════════
// La bandeja de gestión: la jefatura de Urgencias
// ═════════════════════════════════════════════════════════════════════════════

test('C-17 · GET /solicitudes: la jefatura recibe solo las solicitudes de su servicio', async ({ request }, testInfo) => {
  soloPorApi(testInfo);
  // Una solicitud sin turno (un permiso) es del servicio si su emisor pertenece a él.
  const personal = await control(request, 'jefatura', `/funcionarios/summary?servicioId=${SERVICIO.urgencias}`);
  const delServicio = new Set(personal.map((f) => f.idFuncionario));
  const deOtroServicio = (s) => (s.turno ? s.turno.servicio?.idServicio !== SERVICIO.urgencias : !delServicio.has(s.funcionario?.idFuncionario));
  fallaConocida('C-17 y BUG-002: SolicitudController.getAllSolicitud (:116) no filtra por servicio; la bandeja depende del filtro del navegador (HU-SOL-02).');
  await exigirSinAjenos(request, 'jefatura', '/solicitudes', deOtroServicio);
});

// ═════════════════════════════════════════════════════════════════════════════
// De otro servicio: el subrogante de Enfermería lee Urgencias
// ═════════════════════════════════════════════════════════════════════════════

const RUTAS_POR_SERVICIO = [
  '', '/calendario/{anio}/{mes}', '/dia/{hoy}', '/dia/{hoy}/sin-asignar', '/sin-asignar', '/sin-asignar/periodo',
  '/stats', '/todos-detalle', '/funcionarios-detalle', '/funcionarios-stats', '/cobertura',
];
const completar = (plantilla) => {
  const hoy = hoyChile();
  return plantilla.replace('{anio}', anioDe(hoy)).replace('{mes}', mesDe(hoy)).replace('{hoy}', hoy);
};

for (const plantilla of RUTAS_POR_SERVICIO) {
  test(`C-17 · GET /turnos/servicio/{id}${plantilla}: otro servicio responde 403`, async ({ request }, testInfo) => {
    soloPorApi(testInfo);
    const resto = completar(plantilla);
    await control(request, 'subrogante', `/turnos/servicio/${SERVICIO.enfermeria}${resto}`);
    fallaConocida('C-17 y BUG-004: los GET por servicio de TurnoController no llaman a exigirMismoServicio.');
    await exigirNegada(request, 'subrogante', `/turnos/servicio/${SERVICIO.urgencias}${resto}`);
  });
}

for (const resto of ['', '/futuros']) {
  test(`C-17 · GET /turnos/funcionario/{id}${resto}: los turnos de una persona de otro servicio responden 403`, async ({ request }, testInfo) => {
    soloPorApi(testInfo);
    await control(request, 'subrogante', `/turnos/funcionario/${ID.subrogante}${resto}`);
    const suyos = await control(request, 'medico', `/turnos/funcionario/${ID.medico}${resto}`);
    expect(suyos.length, 'el médico 369 tiene turnos').toBeGreaterThan(0);
    fallaConocida('C-17 y BUG-004: TurnoController.getTurnosByFuncionario (:351) y getTurnosFuturos (:377) no comprueban el servicio ni el dueño.');
    await exigirNegada(request, 'subrogante', `/turnos/funcionario/${ID.medico}${resto}`);
  });
}

test('C-17 · GET /ofertas-generales/servicio/{id}: otro servicio responde 403', async ({ request }, testInfo) => {
  soloPorApi(testInfo);
  await control(request, 'subrogante', `/ofertas-generales/servicio/${SERVICIO.enfermeria}`);
  fallaConocida('C-17: OfertaGeneralController.getByServicio (:87) no llama a exigirMismoServicio.');
  await exigirNegada(request, 'subrogante', `/ofertas-generales/servicio/${SERVICIO.urgencias}`);
});

test('C-17 · GET /funcionarios/{id}/summary: una persona de otro servicio responde 403', async ({ request }, testInfo) => {
  soloPorApi(testInfo);
  await control(request, 'subrogante', `/funcionarios/${ID.subrogante}/summary`);
  fallaConocida('C-17: FuncionarioController.getSummary (:217) no comprueba el servicio ni el dueño.');
  await exigirNegada(request, 'subrogante', `/funcionarios/${ID.medico}/summary`);
});

// ── Bitácora: exige rol de gestión, pero no filtra por servicio ──────────────
// Lo que es de Urgencias, según las lecturas de la jefatura de ese servicio.
async function deUrgencias(request) {
  const turnos = await control(request, 'jefatura', `/turnos/servicio/${SERVICIO.urgencias}`);
  return { turnos: new Set(turnos.map((t) => t.id)), solicitudes: new Set((await solicitudesDeUrgencias(request)).keys()) };
}

const LISTAS_BITACORA = [
  { ruta: '/bitacoras/dto', turno: (e) => e.idTurno, solicitud: (e) => e.idSolicitud },
  { ruta: '/bitacoras', turno: (e) => e.turno?.idTurno, solicitud: (e) => e.solicitud?.idSolicitud },
  { ruta: '/bitacoras/tipo/SOLICITUD_CREADA', turno: (e) => e.turno?.idTurno, solicitud: (e) => e.solicitud?.idSolicitud },
];

for (const lista of LISTAS_BITACORA) {
  test(`C-17 · GET ${lista.ruta}: el subrogante de Enfermería no recibe eventos de Urgencias`, async ({ request }, testInfo) => {
    soloPorApi(testInfo);
    const u = await deUrgencias(request);
    const esDeUrgencias = (e) => u.turnos.has(lista.turno(e)) || u.solicitudes.has(lista.solicitud(e));
    const vistos = await control(request, 'jefatura', lista.ruta);
    expect(vistos.filter(esDeUrgencias).length, 'hay eventos de Urgencias en la bitácora').toBeGreaterThan(0);
    fallaConocida('C-17 y BUG-007: BitacoraController exige rol de gestión, pero no filtra por servicio (HU-BIT-01, criterio 3).');
    await exigirSinAjenos(request, 'subrogante', lista.ruta, esDeUrgencias);
  });
}

test('C-17 · GET /bitacoras/solicitud/{id}: los eventos de una solicitud de otro servicio responden 403', async ({ request }, testInfo) => {
  soloPorApi(testInfo);
  await solicitudAjena(request, SOL.pendiente);
  expect((await control(request, 'jefatura', `/bitacoras/solicitud/${SOL.pendiente}`)).length, 'la solicitud tiene eventos').toBeGreaterThan(0);
  fallaConocida('C-17: BitacoraController.getBySolicitud no comprueba el servicio de la solicitud.');
  await exigirNegada(request, 'subrogante', `/bitacoras/solicitud/${SOL.pendiente}`);
});

test('C-17 · GET /bitacoras/turno/{id}: los eventos de un turno de otro servicio responden 403', async ({ request }, testInfo) => {
  soloPorApi(testInfo);
  // Un turno futuro del médico 369 con su evento de generación (lo lee la jefatura de Urgencias).
  const hoy = hoyChile();
  const futuros = (await control(request, 'medico', `/turnos/funcionario/${ID.medico}`)).filter((t) => t.diaInicioTurno >= hoy);
  let turno = null;
  for (const t of futuros.slice(0, 5)) {
    if ((await control(request, 'jefatura', `/bitacoras/turno/${t.id}`)).length > 0) { turno = t.id; break; }
  }
  expect(turno, 'un turno futuro del médico 369 con eventos en la bitácora').not.toBeNull();
  fallaConocida('C-17: BitacoraController.getByTurno no comprueba el servicio del turno.');
  await exigirNegada(request, 'subrogante', `/bitacoras/turno/${turno}`);
});

test('C-17 · GET /bitacoras/funcionario/{id}: los eventos de una persona de otro servicio responden 403', async ({ request }, testInfo) => {
  soloPorApi(testInfo);
  const actor = (await solicitudAjena(request, SOL.pendiente)).funcionario.idFuncionario;
  expect((await control(request, 'jefatura', `/bitacoras/funcionario/${actor}`)).length, 'la persona tiene eventos').toBeGreaterThan(0);
  fallaConocida('C-17: BitacoraController.getByFuncionario no comprueba el servicio de la persona.');
  await exigirNegada(request, 'subrogante', `/bitacoras/funcionario/${actor}`);
});

for (const prefijo of ['/bitacoras', '/bitacoras/dto']) {
  test(`C-17 · GET ${prefijo}/{id}: un evento de otro servicio responde 403`, async ({ request }, testInfo) => {
    soloPorApi(testInfo);
    await solicitudAjena(request, SOL.pendiente);
    const [evento] = await control(request, 'jefatura', `/bitacoras/solicitud/${SOL.pendiente}`);
    expect(evento, 'la solicitud tiene un evento').toBeTruthy();
    await control(request, 'jefatura', `${prefijo}/${evento.idEvento}`);
    fallaConocida(`C-17: BitacoraController (${prefijo}/{id}) no comprueba el servicio del evento.`);
    await exigirNegada(request, 'subrogante', `${prefijo}/${evento.idEvento}`);
  });
}

// ═════════════════════════════════════════════════════════════════════════════
// Misma clase que C-17, no listadas en el catálogo
// ═════════════════════════════════════════════════════════════════════════════

test('C-17 (sumada el 17 oct) · GET /turnos: el subrogante de Enfermería no recibe turnos de otro servicio', async ({ request }, testInfo) => {
  soloPorApi(testInfo);
  await control(request, 'admin', '/turnos');
  fallaConocida('C-17: GET /turnos (TurnoController.getAllTurnos, :80) entrega los turnos de todo el hospital, con su funcionario, a cualquier autenticado.');
  await exigirSinAjenos(request, 'subrogante', '/turnos', (t) => t.servicio?.idServicio !== SERVICIO.enfermeria);
});

test('C-17 (sumada el 17 oct) · GET /turnos/{id}: un turno de otro servicio responde 403', async ({ request }, testInfo) => {
  soloPorApi(testInfo);
  const deEnfermeria = await control(request, 'subrogante', `/turnos/servicio/${SERVICIO.enfermeria}`);
  await control(request, 'subrogante', `/turnos/${deEnfermeria[0].id}`);
  const suyos = await control(request, 'medico', `/turnos/funcionario/${ID.medico}`);
  fallaConocida('C-17: GET /turnos/{id} (TurnoController.getTurnoById, :95) no comprueba el servicio del turno.');
  await exigirNegada(request, 'subrogante', `/turnos/${suyos[0].id}`);
});

test('C-17 (sumada el 17 oct) · GET /turnos/puesto/{id}: los turnos de un puesto de otro servicio responden 403', async ({ request }, testInfo) => {
  soloPorApi(testInfo);
  const puestoPropio = (await control(request, 'subrogante', `/turnos/servicio/${SERVICIO.enfermeria}`)).find((t) => t.idPuesto)?.idPuesto;
  await control(request, 'subrogante', `/turnos/puesto/${puestoPropio}`);
  const puestoAjeno = (await control(request, 'medico', `/turnos/funcionario/${ID.medico}`)).find((t) => t.idPuesto)?.idPuesto;
  expect(puestoAjeno, 'un puesto de Urgencias').toBeTruthy();
  fallaConocida('C-17: GET /turnos/puesto/{id} (TurnoController.getTurnosByPuesto, :388) no comprueba el servicio del puesto.');
  await exigirNegada(request, 'subrogante', `/turnos/puesto/${puestoAjeno}`);
});

test('C-17 (sumada el 17 oct) · GET /ofertas-generales/ofertor/{id}: las ofertas de una persona de otro servicio no se entregan', async ({ request }, testInfo) => {
  soloPorApi(testInfo);
  await control(request, 'subrogante', `/ofertas-generales/ofertor/${ID.subrogante}`);
  const ofertas = await control(request, 'jefatura', `/ofertas-generales/servicio/${SERVICIO.urgencias}`);
  const ofertor = ofertas.find((o) => o.idOfertaGeneral === OFERTA_ABIERTA)?.ofertor?.idFuncionario;
  expect(ofertor, `la oferta ${OFERTA_ABIERTA} tiene ofertor`).toBeTruthy();
  fallaConocida('C-17: GET /ofertas-generales/ofertor/{id} (OfertaGeneralController.getByOfertor, :93) no comprueba el servicio ni el dueño.');
  await exigirSinAjenos(request, 'subrogante', `/ofertas-generales/ofertor/${ofertor}`, (o) => o.turno?.servicio?.idServicio !== SERVICIO.enfermeria);
});

test('C-17 (sumada el 17 oct) · GET /planificaciones/servicio/{id}: el molde de otro servicio responde 403', async ({ request }, testInfo) => {
  soloPorApi(testInfo);
  await control(request, 'subrogante', `/planificaciones/servicio/${SERVICIO.enfermeria}`);
  fallaConocida('C-17: GET /planificaciones/servicio/{id} (PlanificacionController.obtenerPorServicio, :50) entrega el molde de cualquier servicio, con los nombres de su personal: GLOBAL_ADMIN_PATHS solo protege las escrituras.');
  await exigirNegada(request, 'subrogante', `/planificaciones/servicio/${SERVICIO.urgencias}`);
});

test('C-17 (sumada el 17 oct) · GET /notificaciones/solicitud/{id}: el médico no lee la notificación de una solicitud ajena', async ({ request }, testInfo) => {
  soloPorApi(testInfo);
  // La solicitud 16 es de 30000013-3 (312, de apoyo), que lee su notificación.
  await solicitudAjena(request, SOL.intercambio);
  await control(request, 'notificaciones', `/notificaciones/solicitud/${SOL.intercambio}`);
  fallaConocida('C-17: GET /notificaciones/solicitud/{id} (NotificacionController.getNotificacionSolicitud, :73) no comprueba que quien pide participe en la solicitud.');
  await exigirNegada(request, 'medico', `/notificaciones/solicitud/${SOL.intercambio}`);
});
