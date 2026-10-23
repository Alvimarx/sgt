// Base común de las pruebas de historias de usuario (e2e/hu/).
//
// - `test`: el test de Playwright con una guarda de SOLO LECTURA automática.
//   Toda petición a /api/v2 que no sea GET se corta en el navegador (salvo el
//   login, la elección y el cambio de servicio, que no escriben en la base) y
//   la prueba falla al terminar si intentó escribir o si la página lanzó una
//   excepción no capturada. Además omite las pruebas en desktop-fhd.
// - `entrar`: sesión por la interfaz (iniciarSesion de sesion.js). La primera
//   vez que un rol entra en una corrida, entra por la pantalla de login; las
//   siguientes reusa su JWT y user_data, como quien refresca la pestaña (R5).
//   Siempre termina con un refresco, para que toda prueba parta del mismo
//   estado (el de una pestaña refrescada).
// - `api`: lecturas de la API con el JWT de la página, para calcular lo
//   esperado a partir de los datos del día (las fechas cambian: nada en duro).
// - `testMuta` (fases 3 y 4, e2e/hu-muta/): el mismo `test`, pero deja escribir.
//   Ver su comentario más abajo.
// - Piezas de la interfaz que comparten varias fases: calendario y detalle del
//   turno, agenda móvil, paneles y bitácora, solicitudes y el asistente «Nueva
//   solicitud», decidir y responder, postulaciones, ofertas, el panel de
//   asignación y la bandeja de notificaciones.
//
// Los usuarios son los del seed de desarrollo (catálogo §2.1). Las pruebas no
// escriben nombres de personas: identifican a cada una por RUT o por id y, si
// necesitan un nombre, lo leen de la sesión o de la API durante la prueba.
import { test as base, expect } from '@playwright/test';
import { CLAVE_DEV, USUARIOS, iniciarSesion, esperarQuieta } from './sesion.js';
import { choquesR13, inicioDe, nombreMensajeR13, patronMensajeR13, patronMensajeSolape } from './datos.js';

export { expect, esperarQuieta, USUARIOS, CLAVE_DEV };

// Usuarios de apoyo del catálogo (§2.1) que no están en sesion.js.
export const APOYO = {
  // Médica de Urgencias con una notificación sin leer en el seed (la 16).
  notificaciones: { rut: '30000013-3', id: 312 },
  // Médico de Urgencias que ninguna otra prueba usa: para la clave incorrecta.
  claveIncorrecta: { rut: '30000072-2', id: 371 },
  // En el padrón del hospital (innhosp) y no en el SGT, como el usuario
  // «no registrado», pero sin gastar a ese usuario principal.
  padronSinRegistro: { rut: '12345677-0' },
  // Segundo médico de Urgencias: recibe intercambios y es la segunda postulación (fase 3).
  segundoMedico: { rut: '30000069-9', id: 368 },
  // Tercer médico de Urgencias (ofertor de la oferta general 1 del seed, que no se toca).
  tercerMedico: { rut: '30000042-2', id: 341 },
};

// Ids del seed (catálogo §2.1).
export const ID = { medico: 369, jefatura: 305, subrogante: 101, admin: 1, multiservicio: 202 };
export const SERVICIO = { medicinaInterna: 1, enfermeria: 2, cirugia: 3, urgencias: 4 };

// ── Fechas en la zona horaria del hospital ───────────────────────────────────
export const ZONA = 'America/Santiago';
const partesChile = (d = new Date()) => Object.fromEntries(
  new Intl.DateTimeFormat('en-CA', {
    timeZone: ZONA, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(d).map((p) => [p.type, p.value]),
);
/** Fecha de hoy en Chile, 'YYYY-MM-DD'. */
export const hoyChile = () => { const p = partesChile(); return `${p.year}-${p.month}-${p.day}`; };
/** Instante actual en Chile como 'YYYY-MM-DDTHH:mm' (comparable con fecha+hora de un turno). */
export const ahoraChile = () => { const p = partesChile(); return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`; };
/** Suma días a una fecha 'YYYY-MM-DD' (sin zona horaria). */
export const sumarDias = (iso, n) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
};
/** 0 = domingo … 6 = sábado. */
export const diaSemana = (iso) => new Date(`${iso}T12:00:00Z`).getUTCDay();
/** Lunes de la semana de una fecha. */
export const lunesDe = (iso) => sumarDias(iso, -((diaSemana(iso) + 6) % 7));
export const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
export const mesDe = (iso) => Number(iso.slice(5, 7));
export const anioDe = (iso) => Number(iso.slice(0, 4));
/** 'YYYY-MM' del mes que está `delta` meses después del de `iso`. */
export const mesRelativo = (iso, delta) => {
  const total = anioDe(iso) * 12 + (mesDe(iso) - 1) + delta;
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, '0')}`;
};
export const diasDelMes = (anio, mes) => new Date(Date.UTC(anio, mes, 0)).getUTCDate();
export const escaparRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Marca la prueba como falla conocida del catálogo (C-xx, §5.1, §6.3, BUG-xxx
 * o la observación de una HU): la suite queda verde y avisa cuando se corrija
 * (la prueba pasa a «unexpected pass»). Con SGT_VER_FALLAS=1 corre como una
 * prueba normal, para ver el error real y confirmar que es el anotado.
 */
export const fallaConocida = (motivo) => base.fail(!process.env.SGT_VER_FALLAS, motivo);

/**
 * Falla NUEVA de la app: la encontró esta suite, se confirmó leyendo el código
 * y el catálogo todavía no la anota (informe de la fase 1, 17 oct 2026). Queda
 * aparte de las conocidas para que se vea qué falta agregar al catálogo.
 */
export const fallaNueva = (motivo) => base.fail(!process.env.SGT_VER_FALLAS, `Falla nueva, no catalogada: ${motivo}`);

export const esMovil = (testInfo) => testInfo.project.name === 'movil';
export const esDesktop = (testInfo) => testInfo.project.name !== 'movil';

/** Una prueba que solo usa la API corre una vez, en el proyecto desktop (fase 2a). */
export const soloPorApi = (testInfo) => base.skip(esMovil(testInfo), 'Prueba solo por API: corre una vez, en el proyecto desktop.');

// Peticiones POST que no escriben en la base: el paso 1 del login, la elección
// del servicio y el cambio de servicio (solo emiten tokens).
const POST_SIN_ESCRITURA = /\/api\/v2\/funcionarios\/(login|login\/select-service|switch-service)$/;

export const test = base.extend({
  soloLectura: [async ({ page }, usar, testInfo) => {
    testInfo.skip(testInfo.project.name === 'desktop-fhd',
      'Las pruebas de HU corren en movil (390 px) y desktop (1366 px); desktop-fhd queda para las fotos de e2e/visual.');
    const escrituras = [];
    const erroresPagina = [];
    page.on('pageerror', (err) => erroresPagina.push(err.message));
    await page.route('**/api/v2/**', (route) => {
      const req = route.request();
      const ruta = new URL(req.url()).pathname;
      if (['GET', 'HEAD', 'OPTIONS'].includes(req.method()) || (req.method() === 'POST' && POST_SIN_ESCRITURA.test(ruta))) {
        return route.fallback();
      }
      escrituras.push(`${req.method()} ${ruta}`);
      return route.abort('blockedbyclient');
    });
    await usar({ escrituras, erroresPagina });
    expect(escrituras, 'la prueba intentó escribir en la API (el navegador lo cortó)').toEqual([]);
    expect(erroresPagina, 'excepciones no capturadas en la página').toEqual([]);
  }, { auto: true }],

  // Lecturas con el JWT que tiene la página en ese momento.
  api: async ({ page }, usar) => {
    await usar({
      get: async (ruta) => {
        const token = await page.evaluate(() => localStorage.getItem('jwt_token'));
        expect(token, `no hay sesión para leer ${ruta}`).toBeTruthy();
        return apiGet(page.request, token, ruta);
      },
    });
  },
});

// ── Fase 3: pruebas que escriben (e2e/hu-muta/) ─────────────────────────────
// Rutas que crean algo que la prueba debe deshacer (o anotar si no se puede).
const RUTA_CREA = /^\/api\/v2\/(solicitudes|ofertas-generales)$/;

/**
 * Oculta el nombre en los mensajes de R13 del backend («No es posible asignar el
 * turno a {nombre} porque …»): las aserciones y las anotaciones no llevan nombres.
 */
export const sinNombre = (texto) => String(texto ?? '').replace(/(asignar el turno a ).+?( porque )/, '$1{nombre}$2');

/**
 * `testMuta`: el `test` de arriba para las pruebas que escriben. Conserva lo demás
 * (omite desktop-fhd y falla ante excepciones no capturadas de la
 * página, también en pestañas nuevas) y, en vez
 * de cortar las escrituras del navegador, las deja pasar y las registra con su
 * respuesta en la anotación «escrituras» de la prueba.
 *
 * El fixture `muta` crea y cancela por API con el JWT de cada usuario (preparar
 * datos de una prueba) y lleva la cuenta de lo que la prueba creó, por la
 * interfaz o por API. Al terminar cancela las solicitudes que hayan quedado
 * PENDIENTES (la red por si la prueba se cae a medio camino) y, si la prueba pasó
 * igual, la hace fallar: cada prueba deshace lo suyo. Lo que no se puede
 * deshacer queda en la anotación «no se deshace»: las solicitudes canceladas
 * siguen en la base como RECHAZADAS, y las ofertas generales retiradas por su
 * ofertor, como RETIRADAS (C-16, 17 oct; antes quedaban pendientes de apertura
 * porque no había cómo retirarlas). La red de seguridad también retira las
 * ofertas de la prueba que sigan pendientes de apertura o abiertas sin
 * postulaciones (desde el 20 oct el ofertor las retira hasta que alguien postule).
 *
 * Fase 4 (flujos con aprobación): `muta` también decide, responde, abre y
 * rechaza ofertas, postula, selecciona, asigna a mano y crea notificaciones. Lo
 * que mueve turnos se anota antes (recordarTurnos) y se devuelve a su dueño con
 * la asignación directa de la jefatura (devolverTurnos). Ojo: asignar, reasignar o
 * liberar a mano un turno rechaza las solicitudes pendientes que lo tengan (desde
 * el 17 oct, «Rechazo automático: El turno fue … manualmente»), así que devolverTurnos
 * las cierra: si una prueba quiere cancelarlas, tiene que hacerlo antes. La red de
 * seguridad además retira las ofertas que sigan pendientes de apertura o abiertas
 * sin postulaciones, devuelve los turnos anotados que no volvieron y elimina las notificaciones de
 * muta.notificar que queden; si tuvo que hacerlo y la prueba pasó, la hace fallar.
 * Quedan los eventos de bitácora y las notificaciones del sistema que crea cada
 * asignación directa.
 *
 * Como dejan filas en la base, corren solo si se piden (SGT_MUTA=1) y solo
 * contra el ambiente local: sin la variable se omiten, así que
 * `npx playwright test` («todo») no escribe. Ojo con el filtro de archivos:
 * Playwright lo toma como expresión regular, así que `e2e/hu` abarca también
 * e2e/hu-muta/. La suite de solo lectura se corre con `e2e/hu/` (con barra);
 * esta, con `SGT_MUTA=1 … e2e/hu-muta/`, y después se restaura la base.
 */
const HOSTS_LOCALES = ['localhost', '127.0.0.1', '[::1]'];

/** Motivo de la asignación directa con que la fase 4 devuelve un turno a su dueño (queda en la bitácora). */
const MOTIVO_DEVOLVER = 'E2E fase 4: devolver el turno a su dueño de antes de la prueba';

export const testMuta = test.extend({
  // La guarda de solo lectura no aplica: estas pruebas escriben.
  // eslint-disable-next-line no-empty-pattern
  soloLectura: [async ({}, usar) => { await usar(null); }, { auto: true }],

  guardaMuta: [async ({ baseURL }, usar, testInfo) => {
    testInfo.skip(!process.env.SGT_MUTA,
      'Escribe en la base: correr con SGT_MUTA=1, contra la base local, y restaurarla después (catálogo §6.2).');
    const host = new URL(baseURL).hostname;
    if (!HOSTS_LOCALES.includes(host)) {
      throw new Error(`e2e/hu-muta/ escribe en la base: solo corre contra el ambiente local, no contra ${host}.`);
    }
    await usar(null);
  }, { auto: true }],

  muta: [async ({ page, request }, usar, testInfo) => {
    testInfo.skip(testInfo.project.name === 'desktop-fhd',
      'Las pruebas de HU corren en movil (390 px) y desktop (1366 px); desktop-fhd queda para las fotos de e2e/visual.');
    const escrituras = [];
    const erroresPagina = [];
    const solicitudes = new Map(); // idSolicitud → { token, emisor }
    const ofertas = []; // ids de las ofertas generales que la prueba creó, por la interfaz o por API
    const tokensOferta = new Map(); // idOferta → JWT de su ofertor, que es quien la retira (C-16)
    const lecturas = [];
    const registrar = (ruta, cuerpo, token) => {
      if (ruta.endsWith('/solicitudes') && cuerpo?.idSolicitud) {
        solicitudes.set(cuerpo.idSolicitud, { token, emisor: cuerpo.funcionario?.idFuncionario });
      }
      if (ruta.endsWith('/ofertas-generales') && cuerpo?.idOfertaGeneral) {
        ofertas.push(cuerpo.idOfertaGeneral);
        tokensOferta.set(cuerpo.idOfertaGeneral, token);
      }
    };

    const contexto = page.context();
    // La tipografía de Google (el @import de index.css y style.css) no es parte de
    // lo que se prueba: se responde vacía. Si la red externa se cuelga, el evento
    // «load» no llega y cada page.goto agota el tiempo (pasó al armar esta fase).
    await contexto.route(/^https:\/\/fonts\.(googleapis|gstatic)\.com\//, (route) => route.fulfill({ status: 200, contentType: 'text/css', body: '' }));
    // Solo el backend local: si la página llamara a la API de otro servidor (una
    // VITE_API_BASE_URL absoluta), la llamada se corta antes de salir.
    const remotas = [];
    await contexto.route((url) => url.pathname.startsWith('/api/') && !HOSTS_LOCALES.includes(url.hostname), (route) => {
      remotas.push(`${route.request().method()} ${route.request().url()}`);
      return route.abort('blockedbyclient');
    });
    const vigilar = (p) => p.on('pageerror', (err) => erroresPagina.push(err.message));
    vigilar(page);
    contexto.on('page', vigilar);
    contexto.on('response', (resp) => {
      const req = resp.request();
      const ruta = new URL(req.url()).pathname;
      if (!ruta.startsWith('/api/v2/') || ['GET', 'HEAD', 'OPTIONS'].includes(req.method())) return;
      if (req.method() === 'POST' && POST_SIN_ESCRITURA.test(ruta)) return;
      escrituras.push(`${req.method()} ${ruta} → ${resp.status()}`);
      if (req.method() === 'POST' && resp.ok() && RUTA_CREA.test(ruta)) {
        lecturas.push((async () => {
          const token = (await req.allHeaders()).authorization?.replace(/^Bearer /, '');
          registrar(ruta, await resp.json(), token);
        })().catch(() => {}));
      }
    });

    const llamar = async (quien, metodo, ruta, { data, servicioId } = {}) => {
      const token = await tokenRol(request, quien, servicioId);
      const r = await apiLlamar(request, token, metodo, ruta, { data });
      escrituras.push(`API ${metodo} /api/v2${ruta} (${quien}) → ${r.status}`);
      return { ...r, token };
    };

    // Fase 4: lo que mueve turnos se devuelve con la asignación directa de la
    // jefatura (POST /turnos/alterar), y lo que abre ofertas o crea notificaciones
    // se cierra. La prueba anota antes de moverlos los turnos que va a tocar
    // (recordarTurnos); al terminar, devolverTurnos los deja con su dueño de antes.
    const turnosOriginales = new Map(); // idTurno → dueño antes de la prueba (null: cupo libre)
    const turnosMovidos = new Set();
    const notificaciones = new Map(); // idNotificación → quien la creó (muta.notificar)
    const duenoActual = async (idTurno) => {
      const r = await apiLlamar(request, await tokenRol(request, 'jefatura'), 'GET', `/turnos/${idTurno}`);
      expect(r.status, `GET /turnos/${idTurno}`).toBe(200);
      return r.cuerpo?.funcionario?.idFuncionario ?? null;
    };
    const alterarComoJefatura = (data) => llamar('jefatura', 'POST', '/turnos/alterar', { data: { motivo: MOTIVO_DEVOLVER, ...data } });
    const devolver = async () => {
      const actuales = new Map();
      for (const id of turnosOriginales.keys()) actuales.set(id, await duenoActual(id));
      const cambiados = [...turnosOriginales.keys()].filter((id) => actuales.get(id) !== turnosOriginales.get(id));
      const fallas = [];
      // Primero se liberan todos y después se asignan a su dueño de antes: así un
      // canje (dos turnos cruzados) se deshace sin que la asignación choque con el
      // turno que la persona todavía tiene.
      for (const id of cambiados.filter((x) => actuales.get(x) != null)) {
        const r = await alterarComoJefatura({ idTurno: id, accion: 'DESASIGNAR' });
        if (r.status !== 200) fallas.push(`liberar el turno ${id} → ${r.status} ${sinNombre(r.cuerpo?.error)}`);
      }
      for (const id of cambiados.filter((x) => turnosOriginales.get(x) != null)) {
        const r = await alterarComoJefatura({ idTurno: id, accion: 'ASIGNAR', idNuevoMedico: turnosOriginales.get(id) });
        if (r.status !== 200) fallas.push(`devolver el turno ${id} al funcionario ${turnosOriginales.get(id)} → ${r.status} ${sinNombre(r.cuerpo?.error)}`);
      }
      cambiados.forEach((id) => turnosMovidos.add(id));
      if (fallas.length) throw new Error(`No se pudo devolver un turno a su dueño: ${fallas.join(' · ')}`);
      return cambiados;
    };

    const muta = {
      /** POST /solicitudes con el JWT de `quien` (USUARIOS o APOYO). Devuelve { status, cuerpo }; si se creó, queda registrada. */
      async solicitar(quien, dto, { servicioId } = {}) {
        const r = await llamar(quien, 'POST', '/solicitudes', { data: dto, servicioId });
        if (r.status === 200) registrar('/solicitudes', r.cuerpo, r.token);
        return { status: r.status, cuerpo: r.cuerpo };
      },
      /** Como `solicitar`, pero exige que se cree. Devuelve la solicitud creada. */
      async crear(quien, dto, opciones) {
        const r = await muta.solicitar(quien, dto, opciones);
        expect(r.status, `${quien} crea la solicitud de tipo ${dto.idTipoSolicitud} (${sinNombre(r.cuerpo?.error)})`).toBe(200);
        return r.cuerpo;
      },
      /** PUT /solicitudes/{id}/cancelar con el JWT de `quien`. Devuelve { status, cuerpo }. */
      async cancelar(quien, id) {
        const { status, cuerpo } = await llamar(quien, 'PUT', `/solicitudes/${id}/cancelar`);
        return { status, cuerpo };
      },
      /** PATCH /solicitudes/{id}/motivo con el JWT de `quien`. Devuelve { status, cuerpo }. */
      async cambiarMotivo(quien, id, motivo, { servicioId } = {}) {
        const { status, cuerpo } = await llamar(quien, 'PATCH', `/solicitudes/${id}/motivo?motivo=${encodeURIComponent(motivo)}`, { servicioId });
        return { status, cuerpo };
      },

      // ── Fase 4 ──
      /** Cualquier llamada con el JWT de `quien`, anotada en «escrituras». Devuelve { status, cuerpo }. */
      async api(quien, metodo, ruta, { data, servicioId } = {}) {
        const { status, cuerpo } = await llamar(quien, metodo, ruta, { data, servicioId });
        return { status, cuerpo };
      },
      /** PUT /solicitudes/{id}/estado (APROBADA o RECHAZADA) con el JWT de `quien`. */
      decidir: (quien, id, estado, opciones) => muta.api(quien, 'PUT', `/solicitudes/${id}/estado?nuevoEstado=${estado}`, opciones),
      /** Respuesta del receptor a una propuesta (intercambio u oferta particular, según el tipo de `sol`). */
      responder: (quien, sol, acepta) => muta.api(quien, 'PUT',
        `/solicitudes/${sol.idSolicitud}/${sol.tipoSolicitud?.tipo === 4 ? 'intercambio' : 'oferta-particular'}?respuesta=${acepta}`),
      /** POST /ofertas-generales: exige que se cree. La limpieza la retira (la ofertora) si sigue pendiente de apertura o abierta sin postulaciones. */
      async ofertar(quien, idTurno, motivo) {
        const r = await llamar(quien, 'POST', '/ofertas-generales', { data: { idTurno, motivo } });
        expect(r.status, `${quien} publica la oferta general del turno ${idTurno}`).toBe(200);
        registrar('/ofertas-generales', r.cuerpo, r.token);
        return r.cuerpo;
      },
      /** PUT /ofertas-generales/{id}/aprobar|rechazar con el JWT de `quien` (gestión). */
      abrirOferta: (quien, id) => muta.api(quien, 'PUT', `/ofertas-generales/${id}/aprobar`),
      rechazarOferta: (quien, id) => muta.api(quien, 'PUT', `/ofertas-generales/${id}/rechazar`),
      /**
       * PUT /ofertas-generales/{id}/retirar con el JWT del ofertor: la oferta pendiente de apertura, o abierta y sin
       * postulaciones, queda RETIRADA (C-16, 17 oct; hasta que alguien postule, 20 oct). Con una postulación responde 409.
       */
      retirarOferta: (quien, id) => muta.api(quien, 'PUT', `/ofertas-generales/${id}/retirar`),
      /** POST /ofertas-generales/{id}/postular con el JWT de `quien`. El cuerpo es la postulación. */
      postular: (quien, idOferta) => muta.api(quien, 'POST', `/ofertas-generales/${idOferta}/postular`),
      retirarPostulacion: (quien, idOferta, idPostulacion) => muta.api(quien, 'DELETE', `/ofertas-generales/${idOferta}/postular/${idPostulacion}`),
      seleccionar: (quien, idOferta, idPostulacion) => muta.api(quien, 'PUT', `/ofertas-generales/${idOferta}/seleccionar/${idPostulacion}`),
      /** POST /turnos/alterar con el JWT de `quien`. Anota antes el dueño del turno, para devolverlo al terminar. */
      async alterar(quien, data, { servicioId } = {}) {
        await muta.recordarTurnos(data.idTurno);
        return muta.api(quien, 'POST', '/turnos/alterar', { data: { motivo: motivoPrueba('asignación directa', 4), ...data }, servicioId });
      },
      /** Anota el dueño actual de estos turnos (ids o turnos de la API): devolverTurnos los deja así. Llamar ANTES de moverlos. */
      async recordarTurnos(...turnos) {
        for (const t of turnos.flat()) {
          const id = typeof t === 'object' ? (t.id ?? t.idTurno) : t;
          if (id != null && !turnosOriginales.has(id)) turnosOriginales.set(id, await duenoActual(id));
        }
      },
      /** Devuelve cada turno anotado a su dueño de antes (asignación directa de la jefatura). Devuelve los ids que hubo que mover. */
      devolverTurnos: () => devolver(),
      /** POST /notificaciones (sin pantalla, §1.5): una notificación ligada a una solicitud. La limpieza la elimina si queda. */
      async notificar(quien, idSolicitud, mensaje) {
        const r = await llamar(quien, 'POST', '/notificaciones', { data: { idSolicitud, mensaje } });
        expect(r.status, `${quien} crea la notificación de la solicitud ${idSolicitud}`).toBe(200);
        notificaciones.set(r.cuerpo.idNotificacion, quien);
        return r.cuerpo;
      },
    };

    await usar(muta);

    // Red de seguridad: lo que la prueba creó y siga PENDIENTE se cancela aquí.
    await Promise.all(lecturas);
    const porToken = new Map();
    solicitudes.forEach(({ token, emisor }, id) => {
      if (!porToken.has(token)) porToken.set(token, { emisor, ids: [] });
      porToken.get(token).ids.push(id);
    });
    const sinDeshacer = [];
    const estadoFinal = new Map(); // idSolicitud → estado con que queda
    for (const [token, { emisor, ids }] of porToken) {
      const propias = await apiLlamar(request, token, 'GET', `/solicitudes/funcionario/${emisor}`);
      const delaPrueba = (Array.isArray(propias.cuerpo) ? propias.cuerpo : []).filter((s) => ids.includes(s.idSolicitud));
      for (const s of delaPrueba) {
        estadoFinal.set(s.idSolicitud, s.estado);
        if (s.estado !== 'PENDIENTE') continue;
        const r = await apiLlamar(request, token, 'PUT', `/solicitudes/${s.idSolicitud}/cancelar`);
        escrituras.push(`limpieza PUT /api/v2/solicitudes/${s.idSolicitud}/cancelar → ${r.status}`);
        sinDeshacer.push(`solicitud ${s.idSolicitud} PENDIENTE (la canceló)`);
        estadoFinal.set(s.idSolicitud, 'RECHAZADA');
      }
    }
    // Ofertas generales de la prueba que sigan pendientes de apertura, o abiertas y sin postulaciones: su ofertor las
    // retira (C-16, 17 oct; hasta que alguien postule, 20 oct). Con postulaciones no se puede: hay que cerrarla.
    const estadoOfertas = new Map();
    const conPostulaciones = new Set();
    if (ofertas.length) {
      const jefatura = await tokenRol(request, 'jefatura');
      const leer = async () => {
        const r = await apiLlamar(request, jefatura, 'GET', `/ofertas-generales/servicio/${SERVICIO.urgencias}`);
        (Array.isArray(r.cuerpo) ? r.cuerpo : []).filter((o) => ofertas.includes(o.idOfertaGeneral)).forEach((o) => {
          estadoOfertas.set(o.idOfertaGeneral, o.estado);
          if ((o.postulaciones || []).length) conPostulaciones.add(o.idOfertaGeneral);
          else conPostulaciones.delete(o.idOfertaGeneral);
        });
      };
      await leer();
      for (const id of ofertas) {
        const estado = estadoOfertas.get(id);
        if (estado === 'PENDIENTE_APROBACION' || (estado === 'ABIERTA' && !conPostulaciones.has(id))) {
          const r = await apiLlamar(request, tokensOferta.get(id), 'PUT', `/ofertas-generales/${id}/retirar`);
          escrituras.push(`limpieza PUT /api/v2/ofertas-generales/${id}/retirar → ${r.status}`);
          sinDeshacer.push(`oferta ${id} ${estado === 'ABIERTA' ? 'abierta sin postulaciones' : 'pendiente de apertura'} (la retiró su ofertor)`);
        } else if (estado === 'ABIERTA') {
          sinDeshacer.push(`oferta ${id} ABIERTA con postulaciones (sigue abierta: hay que elegir a un postulante para cerrarla)`);
        }
      }
      await leer();
    }
    // Fase 4: turnos movidos que no volvieron a su dueño.
    let errorDevolver = null;
    if (turnosOriginales.size) {
      try {
        const cambiados = await devolver();
        cambiados.forEach((id) => sinDeshacer.push(`turno ${id} (lo devolvió a su dueño)`));
      } catch (e) { errorDevolver = e; }
    }
    // Fase 4: notificaciones creadas que no quedaron eliminadas.
    for (const [id, quien] of notificaciones) {
      const token = await tokenRol(request, quien);
      const r = await apiLlamar(request, token, 'GET', `/notificaciones/${id}`);
      if (r.cuerpo?.estado === 'ELIMINADO') continue;
      const borrar = await apiLlamar(request, token, 'DELETE', `/notificaciones/${id}`);
      escrituras.push(`limpieza DELETE /api/v2/notificaciones/${id} → ${borrar.status}`);
      sinDeshacer.push(`notificación ${id} (la eliminó)`);
    }

    testInfo.annotations.push({ type: 'escrituras', description: escrituras.join(' · ') || 'ninguna' });
    const quedan = [];
    const porEstado = (mapa) => {
      const grupos = new Map();
      mapa.forEach((estado, id) => grupos.set(estado, [...(grupos.get(estado) || []), id]));
      return [...grupos].map(([estado, ids]) => `${ids.join(', ')}: ${estado}`).join('; ');
    };
    if (solicitudes.size) quedan.push(`solicitudes ${porEstado(estadoFinal)} (una cancelada queda RECHAZADA)`);
    if (ofertas.length) quedan.push(`ofertas generales ${porEstado(estadoOfertas)}`);
    if (turnosMovidos.size) quedan.push(`turnos ${[...turnosMovidos].join(', ')}: movidos y devueltos con la asignación directa (quedan sus eventos de bitácora y las notificaciones del sistema)`);
    if (notificaciones.size) quedan.push(`notificaciones ${[...notificaciones.keys()].join(', ')}: quedan ELIMINADO`);
    if (quedan.length) testInfo.annotations.push({ type: 'no se deshace', description: quedan.join(' · ') });

    if (errorDevolver) throw errorDevolver;
    expect(remotas, 'la página llamó a la API de otro servidor (se cortó)').toEqual([]);
    expect(erroresPagina, 'excepciones no capturadas en la página').toEqual([]);
    if (sinDeshacer.length && testInfo.status === 'passed' && testInfo.expectedStatus === 'passed') {
      throw new Error(`La prueba no deshizo todo lo suyo (lo hizo la limpieza): ${sinDeshacer.join(' · ')}. Cada prueba deshace lo que crea o mueve.`);
    }
  }, { auto: true }],
});

// ── API (solo lectura) ───────────────────────────────────────────────────────
export async function apiGet(request, token, ruta) {
  const r = await request.get(`/api/v2${ruta}`, { headers: { Authorization: `Bearer ${token}` } });
  expect(r.ok(), `GET ${ruta} → ${r.status()}`).toBe(true);
  const tipo = r.headers()['content-type'] || '';
  return tipo.includes('json') ? r.json() : r.text();
}

/** Paso 1 del login por API (no escribe). Devuelve el cuerpo y el estado. */
export async function loginApi(request, rut, clave = CLAVE_DEV) {
  const r = await request.post('/api/v2/funcionarios/login', { data: { rut, password: clave } });
  return { status: r.status(), body: await r.json().catch(() => ({})) };
}

/** JWT de un usuario para un servicio (login + select-service; no escriben). */
export async function tokenDe(request, rut, servicioId = null) {
  const { body } = await loginApi(request, rut);
  const sid = servicioId ?? body.servicios?.[0]?.servicioId;
  const r = await request.post('/api/v2/funcionarios/login/select-service', { data: { preAuthToken: body.preAuthToken, servicioId: sid } });
  expect(r.ok(), `select-service ${rut} → ${r.status()}`).toBe(true);
  return (await r.json()).token;
}

/**
 * Deja en cero el contador de intentos fallidos de un RUT: un login correcto
 * lo limpia (LoginAttemptService.loginSucceeded). Se usa después de probar la
 * clave incorrecta, para que corridas sucesivas no lleguen a los 5 intentos que
 * bloquean el RUT por 15 minutos.
 */
export async function limpiarIntentos(request, rut) {
  const { status } = await loginApi(request, rut);
  expect(status, `login correcto de ${rut} para limpiar sus intentos`).toBe(200);
}

/** Un RUT que no existe ni en el SGT ni en el padrón (rango 40.000.000 a 49.999.999, distinto en cada llamada). */
export const rutInexistente = () => `4${String(Math.floor(Math.random() * 1e7)).padStart(7, '0')}-${Math.floor(Math.random() * 10)}`;

// ── Sesión ───────────────────────────────────────────────────────────────────
export const vistaActual = (page) => page.evaluate(() => {
  try { return JSON.parse(sessionStorage.getItem('sgt_nav_state') || '{}').view ?? null; } catch { return null; }
});

const sesiones = new Map();
const vencido = (jwt) => {
  try { return JSON.parse(Buffer.from(jwt.split('.')[1], 'base64url').toString()).exp * 1000 < Date.now() + 60_000; } catch { return true; }
};
const leerSesion = (page) => page.evaluate(() => ({
  jwt_token: localStorage.getItem('jwt_token'),
  user_data: localStorage.getItem('user_data'),
  sgt_servicio_activo_nombre: localStorage.getItem('sgt_servicio_activo_nombre'),
}));

/** Login por la interfaz con un RUT cualquiera (mismo flujo que iniciarSesion). */
export async function iniciarSesionRut(page, rut, { servicio } = {}) {
  await page.goto('/');
  await page.getByPlaceholder('Ej: 12.345.678-9').fill(rut);
  await page.getByPlaceholder('••••••••').fill(CLAVE_DEV);
  await page.locator('button[type="submit"]').click();
  if (servicio) await page.getByRole('button', { name: new RegExp(escaparRegex(servicio), 'i') }).click();
  await expect.poll(() => page.evaluate(() => !!localStorage.getItem('jwt_token')), { timeout: 15_000 }).toBe(true);
  await expect.poll(() => vistaActual(page), { timeout: 15_000 }).toBe('agenda');
  await esperarQuieta(page);
}

/**
 * Entra con un rol de USUARIOS (sesion.js) o de APOYO. Deja la app en el inicio.
 * `servicio`: para quien elige servicio (admin, multiservicio).
 */
export async function entrar(page, quien, { servicio } = {}) {
  const datos = USUARIOS[quien] || APOYO[quien];
  if (!datos) throw new Error(`usuario desconocido: ${quien}`);
  const serv = servicio ?? datos.servicio;
  const clave = `${quien}|${serv || ''}`;
  const guardada = sesiones.get(clave);
  // Sin restos de otra sesión en esta página (una prueba puede entrar con varios roles).
  await page.goto('/');
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
  if (guardada && !vencido(guardada.jwt_token)) {
    await page.evaluate((s) => { Object.entries(s).forEach(([k, v]) => { if (v != null) localStorage.setItem(k, v); }); }, guardada);
    await page.reload();
    await expect.poll(() => vistaActual(page), { timeout: 15_000 }).toBe('agenda');
    await esperarQuieta(page);
    return;
  }
  if (USUARIOS[quien]) await iniciarSesion(page, quien, { servicio: serv });
  else await iniciarSesionRut(page, datos.rut, { servicio: serv });
  sesiones.set(clave, await leerSesion(page));
  // Mismo punto de partida que la sesión reusada (estado en memoria vacío).
  await page.reload();
  await expect.poll(() => vistaActual(page), { timeout: 15_000 }).toBe('agenda');
  await esperarQuieta(page);
}

/** Usuario de la sesión (user_data de localStorage). */
export const usuarioSesion = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('user_data') || 'null'));

/** Salta a una vista por la restauración de navegación (R5), como irAVista. */
export async function irA(page, view, { tab = 'home', returns = {} } = {}) {
  await page.evaluate(([v, t, r]) => {
    sessionStorage.setItem('sgt_nav_state', JSON.stringify({ view: v, tab: t, returns: r }));
  }, [view, tab, returns]);
  await page.reload();
  await esperarQuieta(page);
}

// ── API: negativos de permiso (fase 2a) ──────────────────────────────────────
const tokens = new Map();

/**
 * JWT de un rol de USUARIOS o de APOYO para un servicio (login y select-service
 * por API, que no escriben), guardado mientras no venza. Sin `servicioId`, el
 * primer servicio del usuario: el administrador y el multiservicio lo indican.
 */
export async function tokenRol(request, quien, servicioId = null) {
  const datos = USUARIOS[quien] || APOYO[quien];
  if (!datos) throw new Error(`usuario desconocido: ${quien}`);
  const clave = `${quien}|${servicioId ?? ''}`;
  if (tokens.has(clave) && !vencido(tokens.get(clave))) return tokens.get(clave);
  const token = await tokenDe(request, datos.rut, servicioId);
  tokens.set(clave, token);
  return token;
}

/**
 * Llamada a la API con un JWT que NO exige una respuesta 2xx: es para los
 * negativos de permiso. Devuelve el estado y el cuerpo (JSON o, si no lo es,
 * texto). Una escritura solo se manda a una ruta que el backend niega HOY,
 * confirmado en el código (cada prueba cita dónde): si respondiera 2xx, la
 * base cambió y hay que restaurarla.
 */
export async function apiLlamar(request, token, metodo, ruta, { data } = {}) {
  const r = await request.fetch(`/api/v2${ruta}`, { method: metodo, headers: { Authorization: `Bearer ${token}` }, data });
  const texto = await r.text();
  let cuerpo = texto;
  try { cuerpo = JSON.parse(texto); } catch { /* texto plano, como un CSV */ }
  return { status: r.status(), cuerpo };
}

/** Solicitudes de Urgencias por id, como las ve la jefatura de ese servicio en su bandeja (GET /solicitudes). */
export async function solicitudesDeUrgencias(request) {
  const todas = await apiGet(request, await tokenRol(request, 'jefatura'), '/solicitudes');
  return new Map(todas.filter((s) => s.turno?.servicio?.idServicio === SERVICIO.urgencias).map((s) => [s.idSolicitud, s]));
}

// ── Piezas de la interfaz ────────────────────────────────────────────────────
/** Menú lateral (desktop). */
export const menuLateral = (page) => page.getByRole('complementary', { name: 'Navegación principal' });
/** Ítem del menú lateral por su etiqueta (con o sin contador). */
export const itemMenu = (page, etiqueta) => menuLateral(page)
  .getByRole('button', { name: new RegExp(`^${escaparRegex(etiqueta)}(\\s+\\d+)?$`) });
/** Botón de la barra inferior (móvil): Inicio, Calendario, Solicitudes o Perfil. */
export const barraInferior = (page, etiqueta) => page.getByRole('button', { name: etiqueta, exact: true });

/** Botón «volver» de la cabecera móvil (TopHeader), que no tiene nombre accesible. */
export const volverMovil = (page) => page.locator('.top-header__left button').first();

// ── Vista de solicitudes ─────────────────────────────────────────────────────
/** Abre Solicitudes (menú en desktop, barra inferior en móvil) y espera la carga. */
export async function abrirSolicitudes(page, testInfo) {
  if (esDesktop(testInfo)) await itemMenu(page, 'Solicitudes').click();
  else await barraInferior(page, 'Solicitudes').click();
  await expect(page.getByText('Cargando solicitudes...')).toHaveCount(0, { timeout: 15_000 });
  await esperarQuieta(page);
}

/** Pestaña de Solicitudes por su nombre, con o sin contador. */
export const pestana = (page, testInfo, nombre) => (esDesktop(testInfo)
  ? page.getByRole('tablist', { name: 'Vista de solicitudes' }).getByRole('tab', { name: new RegExp(`^${nombre}( \\d+)?$`) })
  : page.getByRole('button', { name: new RegExp(`^${nombre}( \\d+)?$`) }));

export async function elegirPestana(page, testInfo, nombre) {
  await pestana(page, testInfo, nombre).click();
  await esperarQuieta(page);
}

// Datos de una solicitud u oferta tal como los dibuja cada presentación: el
// detalle desktop (región «Detalle») y las tarjetas móviles (.sgt-list-row).
// Corren en el navegador (evaluate), así que no usan nada de fuera.
const extraerDetalleDesktop = (el) => ({
  titulo: el.querySelector('h2')?.textContent.trim(),
  fecha: el.querySelector('.sgt-dt-detalle-sol__subtitulo')?.textContent.trim().replace(/^(Creada|Publicada) el /, ''),
  estado: el.querySelector('.sgt-dt-detalle-sol__cabecera .sgt-d-chip')?.textContent.trim(),
  filas: Object.fromEntries([...el.querySelectorAll('.sgt-dt-ficha__fila')].map((f) => [f.querySelector('dt').textContent.trim(), f.querySelector('dd').textContent.trim()])),
  motivo: el.querySelector('.sgt-dt-motivo__texto')?.textContent.trim(),
  notas: [...el.querySelectorAll('.sgt-d-aviso')].map((a) => a.textContent.trim()),
  botones: [...el.querySelectorAll('button')].map((b) => b.textContent.trim()),
});
const extraerTarjetasMovil = (tarjetas) => tarjetas.map((el) => {
  const [cabecera, ...resto] = el.children;
  const textos = cabecera.children[1];
  const filas = {};
  resto.filter((c) => c.tagName === 'DIV' && c.children.length === 2 && [...c.children].every((x) => x.tagName === 'SPAN'))
    .forEach((c) => { filas[c.children[0].textContent.trim()] = c.children[1].textContent.trim(); });
  const caja = resto.find((c) => c.firstElementChild?.textContent.trim() === 'Motivo');
  return {
    titulo: textos?.children[0]?.textContent.trim(),
    fecha: textos?.children[1]?.textContent.trim(),
    estado: cabecera.children[2]?.textContent.trim(),
    filas,
    motivo: caja?.children[1]?.textContent.trim(),
    // Avisos de la tarjeta: la espera del receptor (⏳), el rechazo del receptor (✕) y,
    // desde P-01 (17 oct), la nota de segregación de funciones, igual que en desktop.
    notas: resto.filter((c) => /^(⏳|✕|Participas en esta solicitud)/.test(c.textContent.trim())).map((c) => c.textContent.trim()),
    botones: [...el.querySelectorAll('button')].map((b) => b.textContent.trim()),
  };
});

/**
 * Lee todas las solicitudes u ofertas de la pestaña abierta: en móvil, las
 * tarjetas; en desktop, el detalle de cada ítem de la lista (se abre uno por uno).
 */
export async function leerLista(page, testInfo) {
  if (esDesktop(testInfo)) {
    const opciones = page.getByRole('listbox').getByRole('option');
    const n = await opciones.count();
    const items = [];
    for (let i = 0; i < n; i += 1) {
      await opciones.nth(i).click();
      const det = page.getByRole('region', { name: 'Detalle' });
      await expect(opciones.nth(i)).toHaveAttribute('aria-selected', 'true');
      items.push(await det.evaluate(extraerDetalleDesktop));
    }
    return items;
  }
  return page.locator('.sgt-list-row').evaluateAll(extraerTarjetasMovil);
}

/**
 * Lee UNA solicitud u oferta de la pestaña abierta por un texto suyo, como el
 * motivo que la prueba le puso (único en cada prueba): en desktop la busca con el
 * buscador de la barra y abre su detalle; en móvil, toma su tarjeta. Devuelve los
 * mismos campos que leerLista y `zona`: dónde están sus botones (el detalle en
 * desktop, la tarjeta en móvil).
 */
export async function leerSolicitud(page, testInfo, texto) {
  if (esDesktop(testInfo)) {
    await page.getByRole('searchbox').fill(texto);
    const opciones = page.getByRole('listbox').getByRole('option');
    await expect(opciones, `un solo ítem con «${texto}»`).toHaveCount(1);
    await opciones.first().click();
    await expect(opciones.first()).toHaveAttribute('aria-selected', 'true');
    const zona = page.getByRole('region', { name: 'Detalle' });
    await expect(zona.locator('.sgt-dt-motivo__texto')).toContainText(texto);
    return { ...(await zona.evaluate(extraerDetalleDesktop)), zona };
  }
  const zona = page.locator('.sgt-list-row').filter({ hasText: texto });
  await expect(zona, `una sola tarjeta con «${texto}»`).toHaveCount(1);
  const [datos] = await zona.evaluateAll(extraerTarjetasMovil);
  return { ...datos, zona };
}

// ── Calendario mensual y detalle del turno ───────────────────────────────────
// De la fase 1 (calendario-detalle.spec.js); los usa también la fase 3.
const DIAS_LARGOS_MIN = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const mesMinuscula = (m) => MESES[m - 1].toLowerCase();
const conMayuscula = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const numeroDia = (iso) => Number(iso.slice(8, 10));
/** 'HH:mm' de una hora de la API ('20:00' o '20:00:00'). */
export const hhmm = (h) => String(h).slice(0, 5);

export async function esperarCalendario(page, testInfo) {
  if (esDesktop(testInfo)) await expect(page.locator('.sgt-dt-cargando-celda')).toHaveCount(0, { timeout: 15_000 });
  else await expect(page.getByText('Cargando turnos del mes…')).toHaveCount(0, { timeout: 15_000 });
  await esperarQuieta(page);
}

export async function abrirCalendario(page, testInfo) {
  if (esDesktop(testInfo)) await itemMenu(page, 'Calendario').click();
  else await barraInferior(page, 'Calendario').click();
  await esperarCalendario(page, testInfo);
}

export const textoMes = (ym) => `${MESES[Number(ym.slice(5, 7)) - 1]} ${ym.slice(0, 4)}`;
export const tituloCalendario = (page, testInfo) => (esDesktop(testInfo)
  ? page.getByRole('heading', { level: 1 })
  : page.getByText(new RegExp(`^(Asignación de turnos · )?(${MESES.join('|')}) \\d{4}$`)));
export const botonMesCal = (page, sentido) => page.getByRole('button', { name: sentido < 0 ? 'Mes anterior' : 'Mes siguiente' }).first();

export async function mesMostrado(page, testInfo) {
  const texto = (await tituloCalendario(page, testInfo).textContent()).trim();
  const [, mes, anio] = texto.match(new RegExp(`(${MESES.join('|')}) (\\d{4})$`));
  return `${anio}-${String(MESES.indexOf(mes) + 1).padStart(2, '0')}`;
}

export async function irAMes(page, testInfo, ym) {
  const actual = await mesMostrado(page, testInfo);
  const delta = (Number(ym.slice(0, 4)) - Number(actual.slice(0, 4))) * 12 + Number(ym.slice(5, 7)) - Number(actual.slice(5, 7));
  for (let i = 0; i < Math.abs(delta); i += 1) {
    await botonMesCal(page, delta).click();
    await esperarCalendario(page, testInfo);
  }
  await expect(tituloCalendario(page, testInfo)).toHaveText(new RegExp(`${textoMes(ym)}$`));
}

export const celdaDia = (page, testInfo, iso) => (esDesktop(testInfo)
  ? page.getByRole('button', { name: new RegExp(`^${numeroDia(iso)} de ${mesMinuscula(mesDe(iso))}:`) })
  : page.getByRole('button', { name: new RegExp(`^${numeroDia(iso)} de ${MESES[mesDe(iso) - 1]}(,|$)`) }));
export const panelDiaDesktop = (page, iso) => page.getByRole('region', { name: `Detalle del ${conMayuscula(DIAS_LARGOS_MIN[diaSemana(iso)])} ${numeroDia(iso)} de ${mesMinuscula(mesDe(iso))}` });

export async function abrirDia(page, testInfo, iso) {
  await irAMes(page, testInfo, iso.slice(0, 7));
  await celdaDia(page, testInfo, iso).click();
  if (esDesktop(testInfo)) await expect(panelDiaDesktop(page, iso)).toBeVisible();
  else await expect(page.getByText('Cobertura del día', { exact: true })).toBeVisible();
}

// Detalle del turno (sheet en móvil, panel lateral en desktop).
export const detalle = (page, testInfo) => (esDesktop(testInfo)
  ? page.getByRole('dialog', { name: 'Detalle del turno' })
  : page.getByText('Detalle del turno', { exact: true }).locator('xpath=../..'));

export async function abrirDetalle(page, testInfo, turno) {
  const nombre = turno.idFuncionario == null ? `Cupo libre: ${turno.nombrePuesto}` : `Ver detalle de ${turno.nombreFuncionario}`;
  const zona = esDesktop(testInfo) ? panelDiaDesktop(page, turno.diaInicioTurno) : page;
  await zona.getByRole('button', { name: nombre, exact: true }).first().click();
  await expect(detalle(page, testInfo)).toBeVisible();
  return detalle(page, testInfo);
}

export async function cerrarDetalle(page, testInfo) {
  if (esDesktop(testInfo)) await page.keyboard.press('Escape');
  else await page.mouse.click(195, 24); // el fondo oscuro del sheet de más arriba
  await expect(detalle(page, testInfo)).toHaveCount(0);
}

export async function leerInfo(det, testInfo) {
  if (esDesktop(testInfo)) {
    return Object.fromEntries(await det.getByRole('region', { name: 'Información del turno' }).locator('.sgt-dt-ficha__fila')
      .evaluateAll((filas) => filas.map((f) => [f.querySelector('dt').textContent.trim(), f.querySelector('dd').textContent.trim()])));
  }
  return Object.fromEntries(await det.getByText('Información del turno', { exact: true }).locator('xpath=following-sibling::div[1]/div')
    .evaluateAll((filas) => filas.map((f) => [...f.querySelectorAll(':scope > span')].map((s) => s.textContent.trim()))));
}

/** Botones de «Acciones» del detalle del turno, en orden. */
export const accionesDetalle = (det, testInfo) => (esDesktop(testInfo)
  ? det.getByRole('group', { name: 'Acciones' }).getByRole('button')
  : det.getByText('Acciones', { exact: true }).locator('xpath=following-sibling::div[1]').getByRole('button'));

/**
 * Fila de un puesto en «Integrantes del equipo por puesto» del detalle: ahí
 * están las personas y las vacantes de ese puesto en el bloque.
 */
export const puestoDetalle = (det, testInfo, nombrePuesto) => (esDesktop(testInfo)
  ? det.getByRole('region', { name: 'Integrantes del equipo por puesto' }).locator('.sgt-dt-equipo-fila')
    .filter({ has: det.page().locator('.sgt-dt-equipo-fila__puesto > span').getByText(nombrePuesto, { exact: true }) })
  : det.getByText('Integrantes del equipo por puesto', { exact: true }).locator('xpath=following-sibling::div[1]/div')
    .filter({ has: det.page().getByText(nombrePuesto, { exact: true }) }));

// ── Agenda móvil (inicio) ────────────────────────────────────────────────────
// De la fase 1 (inicio.spec.js); los usa también la fase 3.
const DIAS_CORTOS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
/** Etiqueta del día en la agenda («Lun 19»). */
export const etiquetaDia = (iso) => `${DIAS_CORTOS[diaSemana(iso)]} ${numeroDia(iso)}`;
export const filtros = (page) => page.getByRole('tablist', { name: 'Filtros de agenda' });
export const filtro = (page, nombre) => filtros(page).getByRole('tab', { name: new RegExp(`^${nombre}( \\d+)?$`) });
export const filaDia = (page, iso) => page.locator('.day-row').filter({
  has: page.locator(`.day-header-btn[aria-label^="${etiquetaDia(iso)},"]`),
});

export async function esperarAgenda(page) {
  await expect(page.getByText('Cargando agenda…')).toHaveCount(0, { timeout: 15_000 });
}

// La lista en orden: separadores de mes («M:…») y días («D:Lun 19»).
export const leerAgenda = (page) => page.evaluate(() => [...document.querySelector('.agenda-days-list').children].map((el) => {
  const btn = el.querySelector(':scope > .day-header-btn');
  if (el.classList.contains('day-row') && btn) {
    return {
      clave: `D:${btn.getAttribute('aria-label').split(',')[0]}`,
      texto: btn.textContent,
      hoy: el.classList.contains('day-row--today'),
      expandido: btn.getAttribute('aria-expanded') === 'true',
    };
  }
  return { clave: `M:${el.textContent.trim()}` };
}));

// ── Paneles de gestión y bitácora ────────────────────────────────────────────
// De la fase 1 (gestion.spec.js); los usa también la fase 3.
export async function abrirDesdePanel(page, testInfo, { menu, panel, modulo }) {
  if (esDesktop(testInfo)) {
    await itemMenu(page, menu).click();
  } else {
    await barraInferior(page, 'Perfil').click();
    await page.getByRole('button', { name: new RegExp(`^${panel}`) }).click();
    await page.getByRole('button', { name: new RegExp(`^${modulo}\\b`) }).click();
  }
  await esperarQuieta(page);
}

export const abrirBitacora = async (page, testInfo) => {
  await abrirDesdePanel(page, testInfo, { menu: 'Bitácora', panel: 'Panel de Jefatura', modulo: 'Bitácora de Cambios' });
  await expect(page.getByText('Cargando bitácora...')).toHaveCount(0, { timeout: 20_000 });
};

/** Filtra la bitácora por estado: en desktop con el select; en móvil, Filtrar → Estado → chip. */
export async function filtrarBitacoraPorEstado(page, testInfo, { valor, texto }) {
  if (esDesktop(testInfo)) await page.locator('#bitacora-estado').selectOption(valor);
  else {
    await page.getByRole('button', { name: /^Filtrar/ }).click();
    await page.getByRole('button', { name: /^Estado/ }).click();
    await page.locator('button.sgt-filter-chip', { hasText: new RegExp(`^${texto}$`) }).click();
  }
}

// ── Fechas como las muestra la interfaz ──────────────────────────────────────
// Fecha corta de las tarjetas y de los selectores («15 oct 2026»), con el Intl del navegador.
export const fechaCL = (page, valor) => page.evaluate((v) => {
  const s = String(v);
  const d = /^\d{4}-\d{2}-\d{2}$/.test(s) ? new Date(...s.split('-').map((n, i) => Number(n) - (i === 1 ? 1 : 0))) : new Date(s.replace(' ', 'T'));
  return d.toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' });
}, valor);

// ── Fase 3: asistente «Nueva solicitud» y solicitudes propias ───────────────
/** La hoja (Sheet) móvil abierta más arriba: Nueva solicitud, Modificar motivo, Cancelar solicitud, Detalle del turno… */
export const hojaMovil = (page) => page.locator('div[style*="sgtSlideUp"]').last();

/** El asistente «Nueva solicitud» abierto: panel lateral en desktop (cambia de título en el paso 3), hoja en móvil. */
export const asistente = (page, testInfo) => (esDesktop(testInfo)
  ? page.getByRole('dialog').filter({ has: page.locator('.sgt-dt-asistente') })
  : hojaMovil(page));

/** Los seis tipos del paso 1, en orden (HU-SOL-03, criterio 1). */
export const TIPOS_SOLICITUD = ['Permiso', 'Botar turno', 'Cobertura', 'Intercambio', 'Oferta particular', 'Oferta general'];

/** Abre «Nueva solicitud» desde Solicitudes («Nueva solicitud» en desktop, «+» en móvil) y espera el paso 1. */
export async function abrirNuevaSolicitud(page, testInfo) {
  if (esDesktop(testInfo)) await page.getByRole('button', { name: 'Nueva solicitud' }).click();
  else await page.locator('button:has(path[d="M12 5v14M5 12h14"])').first().click();
  const a = asistente(page, testInfo);
  await expect(a.getByText(/^¿Qué tipo de solicitud necesit(a|á)s\?$/)).toBeVisible();
  return a;
}

export const elegirTipoSolicitud = (a, tipo) => a.getByRole('button', { name: new RegExp(`^${escaparRegex(tipo)}`) }).click();

/** Campo de selección del paso 2 por su etiqueta, sin el asterisco («Turno a cubrir»). */
export const campoAsistente = (a, testInfo, etiqueta) => (esDesktop(testInfo)
  ? a.getByRole('button', { name: new RegExp(`^${escaparRegex(etiqueta)}: `) })
  : a.locator('label', { hasText: new RegExp(`^${escaparRegex(etiqueta)} \\*$`) }).locator('xpath=following-sibling::button[1]'));

/** Lo que muestra un campo de selección: el valor elegido o, si está vacío, su texto de ayuda. */
export async function valorCampo(a, testInfo, etiqueta) {
  const campo = campoAsistente(a, testInfo, etiqueta);
  if (esDesktop(testInfo)) return (await campo.getAttribute('aria-label')).replace(new RegExp(`^${escaparRegex(etiqueta)}: `), '');
  return (await campo.textContent()).trim();
}

/** Opciones de la lista del paso 3 (turnos o personas). */
export const opcionesAsistente = (a, testInfo) => (esDesktop(testInfo) ? a.locator('button.sgt-dt-opcion-lista') : a.locator('button:has(> div)'));

/** La opción del paso 3 que corresponde a un turno: su fecha exacta y su horario. */
export async function opcionTurno(page, testInfo, turno) {
  const a = asistente(page, testInfo);
  const fecha = await fechaCL(page, turno.diaInicioTurno);
  const horario = `${hhmm(turno.horaInicio)}–${hhmm(turno.horaFin)}`;
  const conFecha = esDesktop(testInfo)
    ? page.locator('.sgt-dt-opcion-lista__principal', { hasText: new RegExp(` ${escaparRegex(fecha)}$`) })
    : page.getByText(fecha, { exact: true });
  return opcionesAsistente(a, testInfo).filter({ has: conFecha }).filter({ hasText: horario });
}

/**
 * Turnos de la lista abierta del paso 3, como `fecha|horario` («19 oct 2026|08:00–20:00»),
 * en el orden en que aparecen. Espera a que la lista termine de cargar.
 */
export async function leerOpcionesTurno(page, testInfo) {
  const a = asistente(page, testInfo);
  if (esDesktop(testInfo)) {
    await expect(a.locator('.sgt-dt-opciones-lista[aria-busy="true"]')).toHaveCount(0, { timeout: 15_000 });
    return opcionesAsistente(a, testInfo).evaluateAll((items) => items.map((i) => {
      const fecha = i.querySelector('.sgt-dt-opcion-lista__principal').textContent.trim().replace(/^\S+ /, '');
      const horario = i.querySelector('.sgt-dt-opcion-lista__secundario').textContent.trim().split(' · ')[0];
      return `${fecha}|${horario}`;
    }));
  }
  await expect(a.getByText('Cargando...', { exact: true })).toHaveCount(0, { timeout: 15_000 });
  return opcionesAsistente(a, testInfo).evaluateAll((botones) => botones.map((b) => {
    const [fecha, horario] = [...b.firstElementChild.children].map((d) => d.textContent.trim());
    return `${fecha}|${horario.split(' · ')[0]}`;
  }));
}

// Fecha de un turno como la escriben las etiquetas de la interfaz desde P-01 (17 oct),
// «lun 19 oct 2026» (antes, en ISO). Se arma aparte del código de la app.
const DIAS_ETIQUETA = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
const MESES_ETIQUETA = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
export const fechaLegible = (iso) => `${DIAS_ETIQUETA[diaSemana(iso)]} ${Number(iso.slice(8, 10))} ${MESES_ETIQUETA[mesDe(iso) - 1]} ${anioDe(iso)}`;
/** Etiqueta de un turno de la API: «Día · lun 19 oct 2026 · 08:00–20:00» (avisos del receptor, confirmaciones de asignación). */
export const etiquetaTurno = (t) => `${t.nombreTipoTurno} · ${fechaLegible(t.diaInicioTurno)} · ${hhmm(t.horaInicio)}–${hhmm(t.horaFin)}`;

/** Clave `fecha|horario` de un turno de la API, como la arma leerOpcionesTurno. */
export const claveOpcionTurno = async (page, t) => `${await fechaCL(page, t.diaInicioTurno)}|${hhmm(t.horaInicio)}–${hhmm(t.horaFin)}`;

/** Abre un campo de turno del paso 2 y elige ese turno en la lista. */
export async function elegirTurnoAsistente(page, testInfo, etiqueta, turno) {
  const a = asistente(page, testInfo);
  await campoAsistente(a, testInfo, etiqueta).click();
  await (await opcionTurno(page, testInfo, turno)).first().click();
  await expect(campoAsistente(a, testInfo, etiqueta)).toBeVisible();
}

/** Abre un campo de persona del paso 2 y elige a esa persona (de /funcionarios/summary) por su RUT. */
export async function elegirPersonaAsistente(page, testInfo, etiqueta, persona) {
  const a = asistente(page, testInfo);
  await campoAsistente(a, testInfo, etiqueta).click();
  await opcionesAsistente(a, testInfo).filter({ hasText: persona.rutCompleto || persona.rut }).first().click();
  await expect(campoAsistente(a, testInfo, etiqueta)).toBeVisible();
}

/** Escribe el motivo del paso 2. */
export const escribirMotivo = (a, motivo) => a.locator('textarea').fill(motivo);

/** «Enviar solicitud» cuando el envío llega al backend: espera su respuesta y devuelve { status, cuerpo, enviado }. */
export async function enviarSolicitud(page, testInfo) {
  const respuesta = page.waitForResponse((r) => r.request().method() === 'POST' && RUTA_CREA.test(new URL(r.url()).pathname));
  await asistente(page, testInfo).getByRole('button', { name: 'Enviar solicitud' }).click();
  const r = await respuesta;
  return { status: r.status(), cuerpo: await r.json().catch(() => null), enviado: r.request().postDataJSON() };
}

/** Abre Solicitudes y el asistente, y elige el tipo. Devuelve el asistente. */
export async function nuevaSolicitud(page, testInfo, tipo) {
  await abrirSolicitudes(page, testInfo);
  const a = await abrirNuevaSolicitud(page, testInfo);
  await elegirTipoSolicitud(a, tipo);
  return a;
}

/** Envía y exige que el backend lo cree; espera que el asistente se cierre y la lista recargue. Devuelve lo creado. */
export async function enviarYCrear(page, testInfo) {
  const r = await enviarSolicitud(page, testInfo);
  expect(r.status, `el backend crea lo enviado (${sinNombre(r.cuerpo?.error)})`).toBe(200);
  await expect(asistente(page, testInfo)).toHaveCount(0);
  await esperarSolicitudes(page);
  return r.cuerpo;
}

/** Envía y exige que el backend lo rechace con `mensaje` (400) y que el asistente lo muestre. Devuelve lo enviado. */
export async function enviarYRechazar(page, testInfo, mensaje) {
  const r = await enviarSolicitud(page, testInfo);
  expect(r.status, 'el backend rechaza lo enviado').toBe(400);
  expect(r.cuerpo?.error).toBe(mensaje);
  expect(await errorAsistente(page, testInfo, new RegExp(`^${escaparRegex(mensaje.slice(0, 20))}`))).toBe(mensaje);
  return r.enviado;
}

/** Texto del aviso de error del paso 2 (en móvil se ubica por su comienzo, `patron`). */
export async function errorAsistente(page, testInfo, patron) {
  const a = asistente(page, testInfo);
  const caja = esDesktop(testInfo) ? a.getByRole('alert') : a.getByText(patron);
  await expect(caja).toBeVisible();
  return (await caja.textContent()).trim();
}

/** Espera que Solicitudes termine de cargar (después de crear, cancelar o guardar recarga la lista). */
export async function esperarSolicitudes(page) {
  await expect(page.getByText('Cargando solicitudes...')).toHaveCount(0, { timeout: 15_000 });
  await esperarQuieta(page);
}

/** Abre la confirmación de «Cancelar solicitud» de una solicitud leída con leerSolicitud. Devuelve el diálogo y su texto. */
export async function abrirCancelacion(page, testInfo, sol) {
  await sol.zona.getByRole('button', { name: 'Cancelar solicitud' }).click();
  const dialogo = esDesktop(testInfo) ? page.getByRole('alertdialog', { name: 'Cancelar solicitud' }) : hojaMovil(page);
  const texto = esDesktop(testInfo) ? dialogo.locator('.sgt-dt-confirmacion__texto') : dialogo.locator('p');
  await expect(texto).toBeVisible();
  return { dialogo, texto: (await texto.textContent()).replace(/\s+/g, ' ').trim() };
}

/** Confirma la cancelación abierta y espera la respuesta del backend. */
export async function confirmarCancelacion(page, dialogo) {
  const respuesta = page.waitForResponse((r) => r.request().method() === 'PUT' && /\/api\/v2\/solicitudes\/\d+\/cancelar$/.test(new URL(r.url()).pathname));
  await dialogo.getByRole('button', { name: 'Cancelar solicitud' }).click();
  return respuesta;
}

/**
 * Abre la confirmación de «Retirar oferta» (C-16, 17 oct) de una oferta general propia, leída con leerSolicitud en
 * «Ofertas generales», pendiente de apertura o abierta y sin postulaciones (20 oct). Devuelve el diálogo y su texto.
 */
export async function abrirRetiroOferta(page, testInfo, oferta) {
  await oferta.zona.getByRole('button', { name: 'Retirar oferta' }).click();
  const dialogo = esDesktop(testInfo) ? page.getByRole('alertdialog', { name: 'Retirar oferta' }) : hojaMovil(page);
  const texto = esDesktop(testInfo) ? dialogo.locator('.sgt-dt-confirmacion__texto') : dialogo.locator('p');
  await expect(texto).toBeVisible();
  return { dialogo, texto: (await texto.textContent()).replace(/\s+/g, ' ').trim() };
}

/** Confirma el retiro abierto y espera la respuesta del backend (PUT /ofertas-generales/{id}/retirar). */
export async function confirmarRetiroOferta(page, dialogo) {
  const respuesta = page.waitForResponse((r) => r.request().method() === 'PUT' && /\/api\/v2\/ofertas-generales\/\d+\/retirar$/.test(new URL(r.url()).pathname));
  await dialogo.getByRole('button', { name: 'Retirar oferta' }).click();
  return respuesta;
}

/** Abre «Modificar motivo» de una solicitud leída con leerSolicitud. Devuelve la hoja (móvil) o el panel (desktop). */
export async function abrirModificarMotivo(page, testInfo, sol) {
  await sol.zona.getByRole('button', { name: 'Modificar motivo' }).click();
  const hoja = esDesktop(testInfo) ? page.getByRole('dialog', { name: 'Modificar motivo' }) : hojaMovil(page);
  await expect(hoja.locator('textarea')).toBeVisible();
  return hoja;
}

/** Motivo único para reconocer en la interfaz lo que crea la prueba (`fase`: la del catálogo que la escribe). */
export const motivoPrueba = (etiqueta, fase = 3) => `E2E fase ${fase} · ${etiqueta} · ${Date.now().toString(36)}${Math.floor(Math.random() * 1296).toString(36)}`;

// ── Fase 3: datos del día por API (solo lectura) ─────────────────────────────
/** Id en el SGT de un usuario de USUARIOS o de APOYO. */
export const idDe = (quien) => ID[quien] ?? APOYO[quien]?.id;

/** GET con el JWT de `quien` (USUARIOS o APOYO). */
export const apiComo = async (request, quien, ruta, servicioId = null) => apiGet(request, await tokenRol(request, quien, servicioId), ruta);

/** Solicitudes que emitió `quien`. */
export const solicitudesDe = (request, quien) => apiComo(request, quien, `/solicitudes/funcionario/${idDe(quien)}`);

/** Ids de los turnos que `quien` tiene comprometidos en solicitudes PENDIENTES suyas, pedidos o entregados (R12, R15). */
export async function comprometidosDe(request, quien) {
  const propias = await solicitudesDe(request, quien);
  return new Set(propias.filter((s) => s.estado === 'PENDIENTE')
    .flatMap((s) => [s.turno?.idTurno, s.turnoReceptor?.idTurno]).filter((id) => id != null));
}

/** Todos los turnos de `quien`, de cualquier servicio: el calendario con que el backend valida R13. */
export const calendarioDe = (request, quien) => apiComo(request, quien, `/turnos/funcionario/${idDe(quien)}`);

/** Datos de `quien` en /funcionarios/summary de Urgencias (para elegirlo en un selector, sin escribir su nombre). */
export async function personaDe(request, quien) {
  const personal = await apiComo(request, 'jefatura', `/funcionarios/summary?servicioId=${SERVICIO.urgencias}`);
  const persona = personal.find((f) => f.idFuncionario === idDe(quien));
  expect(persona, `${quien} es de Urgencias`).toBeTruthy();
  return persona;
}

/**
 * Cupos libres de Urgencias, desde mañana, que `quien` puede pedir hoy sin que el
 * backend lo rechace: sin solape ni regla de R13 con su calendario (choquesR13) y
 * sin una solicitud pendiente suya encima. Desde mañana y no desde hoy: un turno
 * de hoy puede haber empezado ya, o empezar mientras corre la prueba. Quedan fuera las franjas (día
 * y horario) con algún cupo que no cumpla: en los selectores, los cupos de una
 * misma franja se ven iguales. En orden de inicio.
 */
export async function cuposParaPedir(request, quien) {
  const [turnos, calendario, comprometidos] = await Promise.all([
    apiComo(request, quien, `/turnos/servicio/${SERVICIO.urgencias}`), calendarioDe(request, quien), comprometidosDe(request, quien),
  ]);
  const hoy = hoyChile();
  const libres = turnos.filter((t) => t.idFuncionario == null && t.diaInicioTurno > hoy);
  const sePuede = (t) => !comprometidos.has(t.id) && choquesR13(t, calendario).length === 0;
  const franja = (t) => `${inicioDe(t)}|${hhmm(t.horaFin)}`;
  const franjasMalas = new Set(libres.filter((t) => !sePuede(t)).map(franja));
  return libres.filter((t) => sePuede(t) && !franjasMalas.has(franja(t)))
    .sort((a, b) => inicioDe(a).localeCompare(inicioDe(b)));
}

/**
 * El cupo que el selector «Turno a cubrir» elige al tocar la franja (día y
 * horario) de `cupo`: el primero de esa franja en GET /turnos/servicio/{id}/sin-asignar,
 * que es la lista del selector. Los cupos de una misma franja se ven iguales.
 */
export async function cupoDelSelector(request, cupo) {
  const libres = await apiComo(request, 'medico', `/turnos/servicio/${SERVICIO.urgencias}/sin-asignar`);
  return libres.find((t) => t.diaInicioTurno === cupo.diaInicioTurno && hhmm(t.horaInicio) === hhmm(cupo.horaInicio) && hhmm(t.horaFin) === hhmm(cupo.horaFin));
}

/**
 * Dato de partida de una prueba: una cobertura PENDIENTE de `quien`, creada por API
 * con el fixture `muta` sobre el primer cupo que puede pedir. Devuelve { sol, cupo, motivo }.
 */
export async function coberturaPorApi(request, muta, quien, etiqueta, { fase = 3 } = {}) {
  const [cupo] = await cuposParaPedir(request, quien);
  expect(cupo, `hay un cupo libre que ${quien} puede pedir`).toBeTruthy();
  const motivo = motivoPrueba(etiqueta, fase);
  return { sol: await muta.crear(quien, { idTipoSolicitud: 3, idTurno: cupo.id, motivo }), cupo, motivo };
}

/** Estado de una solicitud de `quien` según la API (null si no está). */
export async function estadoSolicitud(request, quien, id) {
  return (await solicitudesDe(request, quien)).find((s) => s.idSolicitud === id) ?? null;
}

/**
 * Un intercambio que `quien` puede proponerle hoy a `receptor`: un turno suyo
 * desde mañana, sin solicitudes pendientes, y uno del receptor que
 * /turnos/intercambiables acepta para ese turno (el backend aplica ahí las
 * mismas reglas que al crear). null si no hay.
 */
export async function intercambioPosible(request, quien, receptor) {
  const hoy = hoyChile();
  const comprometidos = await comprometidosDe(request, quien);
  const propios = (await calendarioDe(request, quien))
    .filter((t) => t.diaInicioTurno > hoy && !comprometidos.has(t.id))
    .sort((a, b) => inicioDe(a).localeCompare(inicioDe(b)));
  for (const propio of propios) {
    const ofrecidos = await apiComo(request, quien, `/turnos/intercambiables?idTurnoPropio=${propio.id}&idFuncionarioReceptor=${idDe(receptor)}`);
    if (ofrecidos.length) return { propio, deseado: ofrecidos[0] };
  }
  return null;
}

// ── Fase 4: datos del día por API (solo lectura) ─────────────────────────────
// Los flujos de dos o tres usuarios (fase 4) eligen turnos sin trámites encima:
// sin solicitudes pendientes de nadie y sin una oferta general pendiente de
// apertura o abierta. Así aprobar o mover un turno no toca nada ajeno a la
// prueba, y lo que deja una corrida (todo resuelto, los turnos devueltos a su
// dueño) no cambia lo que elige la siguiente.

/** Motivo único de lo que crea la fase 4. */
export const motivoF4 = (etiqueta) => motivoPrueba(etiqueta, 4);

/** Dueño actual (id) de un turno, o null si es un cupo libre (GET /turnos/{id}, como la jefatura). */
export const duenoDe = async (request, idTurno) => (await apiComo(request, 'jefatura', `/turnos/${idTurno}`)).funcionario?.idFuncionario ?? null;

/** Ids de los turnos con algún trámite vivo: solicitudes PENDIENTES de cualquiera y ofertas generales pendientes de apertura o abiertas. */
export async function turnosEnTramite(request) {
  const [solicitudes, ofertas] = await Promise.all([
    apiComo(request, 'jefatura', '/solicitudes'),
    apiComo(request, 'jefatura', `/ofertas-generales/servicio/${SERVICIO.urgencias}`),
  ]);
  return new Set([
    ...solicitudes.filter((s) => s.estado === 'PENDIENTE').flatMap((s) => [s.turno?.idTurno, s.turnoReceptor?.idTurno]),
    ...ofertas.filter((o) => ['PENDIENTE_APROBACION', 'ABIERTA'].includes(o.estado)).map((o) => o.turno?.idTurno),
  ].filter((id) => id != null));
}

const porInicio = (a, b) => inicioDe(a).localeCompare(inicioDe(b));

// Personas cuyo calendario completo lee siempre la foto del día, para saber qué turnos se pueden devolver a su dueño.
const PERSONAS_DE_LA_FOTO = ['medico', 'segundoMedico', 'tercerMedico', 'jefatura'];

/**
 * Foto del día: los turnos de Urgencias, los cupos libres y los turnos de cada
 * persona desde mañana (los de hoy pueden haber empezado ya) y sin trámites encima, y
 * el calendario completo de las personas de `quienes` (todos sus turnos, de
 * cualquier servicio: con ellos valida el backend el solape y R13).
 *
 * `turnosDe` deja fuera los turnos que ya chocan (solape o R13) con el calendario de su
 * dueño: el seed los genera sin aplicar R13, y desde C-04 (17 oct) la asignación directa
 * sí la aplica, así que devolver uno de esos turnos a su dueño al terminar la prueba
 * (devolverTurnos) respondería 409. `devolvible(turno, quien)` es esa misma comprobación.
 */
export async function fotoDelDia(request, quienes = []) {
  const todos = [...new Set([...PERSONAS_DE_LA_FOTO, ...quienes])];
  const [turnos, enTramite, ...calendarios] = await Promise.all([
    apiComo(request, 'jefatura', `/turnos/servicio/${SERVICIO.urgencias}`),
    turnosEnTramite(request),
    ...todos.map((q) => calendarioDe(request, q)),
  ]);
  const calendarioDePersona = Object.fromEntries(todos.map((q, i) => [q, calendarios[i]]));
  const devolvible = (turno, quien) => choquesR13(turno, calendarioDePersona[quien] ?? []).length === 0;
  const hoy = hoyChile();
  const futuros = turnos.filter((t) => t.diaInicioTurno > hoy && !enTramite.has(t.id)).sort(porInicio);
  return {
    turnos,
    enTramite,
    cupos: futuros.filter((t) => t.idFuncionario == null),
    calendario: Object.fromEntries(quienes.map((q) => [q, calendarioDePersona[q]])),
    devolvible,
    turnosDe: (quien) => futuros.filter((t) => t.idFuncionario === idDe(quien) && devolvible(t, quien)),
  };
}

/** Cupos libres sin trámites que `quien` puede tomar hoy sin choque (ni solape ni R13), en orden de inicio. */
export async function cuposLibresPara(request, quien) {
  const foto = await fotoDelDia(request, [quien]);
  return foto.cupos.filter((c) => choquesR13(c, foto.calendario[quien]).length === 0);
}

/**
 * Hasta `n` intercambios disjuntos que `quien` puede proponerle hoy a `receptor`:
 * un turno suyo sin trámites y uno del receptor, también sin trámites, que
 * /turnos/intercambiables acepta para él (el backend aplica ahí las mismas reglas
 * que al crear y al aprobar). Cada par: { propio, deseado }.
 */
export async function intercambiosLibres(request, quien, receptor, n = 1) {
  const foto = await fotoDelDia(request);
  const pares = [];
  const usados = new Set();
  for (const propio of foto.turnosDe(quien)) {
    if (usados.has(propio.id)) continue;
    const ofrecidos = (await apiComo(request, quien, `/turnos/intercambiables?idTurnoPropio=${propio.id}&idFuncionarioReceptor=${idDe(receptor)}`))
      .filter((t) => !foto.enTramite.has(t.id) && !usados.has(t.id) && foto.devolvible(t, receptor));
    if (!ofrecidos.length) continue;
    pares.push({ propio, deseado: ofrecidos[0] });
    [propio.id, ofrecidos[0].id].forEach((id) => usados.add(id));
    if (pares.length === n) break;
  }
  return pares;
}

/**
 * Caso para la revalidación de R13 (HU-SOL-14, criterio 4): un turno `turno` de
 * `dueno` que `receptor` puede recibir hoy, y un cupo libre `cupo` que se le puede
 * asignar a mano a `receptor` (desde C-04, 17 oct, la asignación directa también aplica
 * R13: el cupo no debe chocar de ninguna forma con su calendario) y que, ya asignado,
 * deja a `turno` en choque de R13 con su calendario: una noche que sale la mañana de
 * ese día ('noche-dia') o un día que empieza la mañana en que sale de esa noche
 * ('dia-noche'). Prueba los pares [dueno, receptor] en orden. null si no hay.
 */
export async function casoR13PorAsignacion(request, pares) {
  const foto = await fotoDelDia(request, [...new Set(pares.flat())]);
  for (const [dueno, receptor] of pares) {
    const calendario = foto.calendario[receptor];
    for (const turno of foto.turnosDe(dueno)) {
      if (choquesR13(turno, calendario).length) continue;
      for (const cupo of foto.cupos) {
        if (choquesR13(cupo, calendario).length) continue;
        const choques = choquesR13(turno, [...calendario, cupo]);
        if (choques.length === 1 && choques[0].regla !== 'solape') return { dueno, receptor, turno, cupo, regla: choques[0].regla };
      }
    }
  }
  return null;
}

/** Eventos de bitácora de un turno (GET /bitacoras/turno/{id}, como la jefatura), del más nuevo al más antiguo. */
export const bitacoraDeTurno = async (request, idTurno) => (await apiComo(request, 'jefatura', `/bitacoras/turno/${idTurno}`))
  .sort((a, b) => b.idEvento - a.idEvento);

/** Ofertas generales de Urgencias por id (como la jefatura). */
export const ofertasDeUrgencias = async (request) => new Map((await apiComo(request, 'jefatura', `/ofertas-generales/servicio/${SERVICIO.urgencias}`))
  .map((o) => [o.idOfertaGeneral, o]));

// ── Fase 4: decidir y responder en Solicitudes ───────────────────────────────
const RUTA_DECIDIR = /\/api\/v2\/solicitudes\/\d+\/estado$/;
const RUTA_RESPONDER = /\/api\/v2\/solicitudes\/\d+\/(intercambio|oferta-particular)$/;
/** Rutas de las acciones sobre una oferta general (abrir, rechazar, retirar la oferta, postular, retirar la postulación, seleccionar). */
export const RUTA_OFERTA = /\/api\/v2\/ofertas-generales\/\d+\/(aprobar|rechazar|retirar|postular|seleccionar)(\/\d+)?$/;

/** Pulsa `boton` y espera la respuesta del backend a la escritura cuya ruta calza con `ruta`. Devuelve { status, cuerpo }. */
export async function pulsarYEsperar(page, boton, ruta) {
  const respuesta = page.waitForResponse((r) => !['GET', 'HEAD', 'OPTIONS'].includes(r.request().method()) && ruta.test(new URL(r.url()).pathname));
  await boton.click();
  const r = await respuesta;
  return { status: r.status(), cuerpo: await r.json().catch(() => null) };
}

/** «Aprobar» o «Rechazar» de la gestión en una solicitud leída con leerSolicitud. Devuelve la respuesta del backend. */
export const decidirEnPantalla = (page, sol, accion) => pulsarYEsperar(page, sol.zona.getByRole('button', { name: accion, exact: true }), RUTA_DECIDIR);

/** «Aceptar» o «Rechazar» del receptor en una propuesta recibida, leída con leerSolicitud. Devuelve la respuesta del backend. */
export const responderEnPantalla = (page, sol, accion) => pulsarYEsperar(page, sol.zona.getByRole('button', { name: accion, exact: true }), RUTA_RESPONDER);

/**
 * Aviso de error de la vista Solicitudes: en desktop, el aviso con role=alert de
 * arriba de la lista; en móvil, el recuadro sobre las tarjetas, que se ubica por su
 * comienzo (`patron`). Devuelve el texto.
 */
export async function avisoSolicitudes(page, testInfo, patron) {
  const caja = esDesktop(testInfo) ? page.locator('.sgt-d-aviso').getByRole('alert') : page.getByText(patron);
  await expect(caja).toBeVisible();
  return (await caja.textContent()).trim();
}

/**
 * Lee la tarjeta (móvil) o el detalle (desktop) «Postulaciones al mismo turno»
 * (R10) que incluye la postulación con `motivo`. Devuelve sus textos, los
 * postulantes en el orden en que se muestran (motivo, «Postuló el …» y botones) y
 * `fila(motivo)`: la zona de un postulante, donde están «Elegir» y «Rechazar».
 */
export async function leerPostulaciones(page, testInfo, motivo) {
  if (esDesktop(testInfo)) {
    await page.getByRole('searchbox').fill(motivo);
    const opciones = page.getByRole('listbox').getByRole('option');
    await expect(opciones, `un solo ítem con «${motivo}»`).toHaveCount(1);
    await opciones.first().click();
    const zona = page.getByRole('region', { name: 'Detalle' });
    await expect(zona.locator('h2')).toHaveText('Postulaciones al mismo turno');
    const datos = await zona.evaluate((el) => ({
      titulo: el.querySelector('h2').textContent.trim(),
      subtitulo: el.querySelector('.sgt-dt-detalle-sol__subtitulo')?.textContent.trim(),
      chip: el.querySelector('.sgt-dt-detalle-sol__cabecera .sgt-d-chip')?.textContent.trim(),
      filas: Object.fromEntries([...el.querySelectorAll('.sgt-dt-ficha__fila')].map((f) => [f.querySelector('dt').textContent.trim(), f.querySelector('dd').textContent.trim()])),
      seccion: el.querySelector('section')?.getAttribute('aria-label'),
      postulantes: [...el.querySelectorAll('.sgt-dt-postulante')].map((p) => ({
        motivo: p.querySelector('.sgt-dt-postulante__motivo')?.textContent.trim().replace(/^“|”$/g, ''),
        detalle: p.querySelector('.sgt-dt-postulante__detalle')?.textContent.trim(),
        botones: [...p.querySelectorAll('button')].map((b) => b.textContent.trim()),
      })),
      pie: el.querySelector('.sgt-dt-detalle-sol__pie')?.textContent.trim(),
    }));
    return { ...datos, zona, fila: (m) => zona.locator('.sgt-dt-postulante').filter({ hasText: m }) };
  }
  const zona = page.locator('.sgt-list-row').filter({ hasText: 'Postulaciones al mismo turno' }).filter({ hasText: motivo });
  await expect(zona, `una sola tarjeta de postulaciones con «${motivo}»`).toHaveCount(1);
  const datos = await zona.evaluate((el) => {
    const [cabecera, ...resto] = el.children;
    const filas = {};
    resto.filter((c) => c.tagName === 'DIV' && c.children.length === 2 && [...c.children].every((x) => x.tagName === 'SPAN'))
      .forEach((c) => { filas[c.children[0].textContent.trim()] = c.children[1].textContent.trim(); });
    const lista = resto.find((c) => c.querySelector('button'));
    return {
      titulo: cabecera.children[1].children[0].textContent.trim(),
      subtitulo: cabecera.children[1].children[1].textContent.trim(),
      chip: cabecera.children[2].textContent.trim(),
      filas,
      postulantes: [...lista.children].map((p) => ({
        motivo: p.children[1]?.textContent.trim().replace(/^“|”$/g, ''),
        detalle: p.children[0].children[0].children[1]?.textContent.trim(),
        botones: [...p.querySelectorAll('button')].map((b) => b.textContent.trim()),
      })),
      pie: resto.at(-1).textContent.trim(),
    };
  });
  return { ...datos, zona, fila: (m) => zona.getByText(`“${m}”`, { exact: true }).locator('xpath=..') };
}

/**
 * «Elegir» o «Rechazar» de un postulante (zona de leerPostulaciones().fila). En
 * desktop los dos llevan el nombre en su etiqueta («Elegir a …»); en móvil, «Elegir»
 * es texto y «Rechazar», un ícono con la etiqueta «Rechazar a …» (P-01, 17 oct).
 */
export const botonPostulante = (fila, testInfo, accion) => {
  if (accion === 'Elegir' && !esDesktop(testInfo)) return fila.getByRole('button', { name: 'Elegir', exact: true });
  return fila.getByRole('button', { name: new RegExp(`^${accion} a `) });
};

// ── Fase 4: ofertas generales en pantalla ────────────────────────────────────
/**
 * «Seleccionar» del único postulante de una oferta abierta (leída con
 * leerSolicitud por la gestión) y espera la confirmación «Confirmar selección».
 * Devuelve el diálogo (alertdialog en desktop, la hoja en móvil) y su texto.
 */
export async function abrirSeleccion(page, testInfo, vista) {
  const boton = esDesktop(testInfo)
    ? vista.zona.getByRole('button', { name: /^Seleccionar a / })
    : vista.zona.getByRole('button', { name: 'Seleccionar', exact: true });
  await expect(boton, 'un solo postulante').toHaveCount(1);
  await boton.click();
  const dialogo = esDesktop(testInfo) ? page.getByRole('alertdialog', { name: 'Confirmar selección' }) : hojaMovil(page);
  const texto = esDesktop(testInfo) ? dialogo.locator('.sgt-dt-confirmacion__texto') : dialogo.locator('p');
  await expect(texto).toBeVisible();
  // En desktop el recuadro «Turno» va dentro del mismo texto: la frase se lee sin él.
  const frase = await texto.evaluate((el) => [...el.childNodes].filter((n) => !(n.nodeType === 1 && n.classList.contains('sgt-dt-motivo')))
    .map((n) => n.textContent).join(''));
  return { dialogo, texto: frase.replace(/\s+/g, ' ').trim(), turno: (await dialogo.textContent()).replace(/\s+/g, ' ').trim() };
}

// ── Fase 4: asignación de turnos (detalle del turno → panel de asignación) ───
/** Panel «Asignar turno libre» o «Editar asignación de turno»: el panel lateral en desktop, la hoja en móvil. */
export const panelAsignacion = (page, testInfo, titulo) => (esDesktop(testInfo)
  ? page.getByRole('dialog', { name: titulo })
  : hojaMovil(page).filter({ hasText: titulo }));

/** Filas de personas del panel de asignación (un botón por persona, con nombre, rol y RUT), en orden. */
export const filasAsignacion = (panel, testInfo) => (esDesktop(testInfo)
  ? panel.locator('button.sgt-dt-asignar__fila')
  : panel.getByText(/^Resultados \(\d+\)$/).locator('xpath=following-sibling::div[1]').locator('button'));

/** RUT de cada fila del panel de asignación, en orden (el último dato de la fila; solo para cruzarlo con la API: las pruebas no lo escriben). */
export const rutsAsignacion = (panel, testInfo) => filasAsignacion(panel, testInfo)
  .evaluateAll((bs) => bs.map((b) => b.textContent.split('·').at(-1).trim()));

/** Buscador del panel de asignación («Nombre o RUT...»). */
export const buscadorAsignacion = (panel) => panel.getByPlaceholder('Nombre o RUT...');

/**
 * Confirmación del panel de asignación (asignar, reasignar o quitar): el
 * alertdialog en desktop; en móvil, el recuadro centrado con ese título. Devuelve
 * el diálogo y su texto (la pregunta).
 */
export async function confirmacionAsignacion(page, testInfo, titulo) {
  const dialogo = esDesktop(testInfo)
    ? page.getByRole('alertdialog', { name: titulo })
    : page.getByText(titulo, { exact: true }).locator('xpath=..');
  const texto = esDesktop(testInfo) ? dialogo.locator('.sgt-dt-confirmacion__texto') : dialogo.locator('p');
  await expect(texto).toBeVisible();
  return { dialogo, texto: (await texto.textContent()).replace(/\s+/g, ' ').trim() };
}

/** Ruta de la asignación directa. */
export const RUTA_ALTERAR = /\/api\/v2\/turnos\/alterar$/;

// ── Bandeja de notificaciones ────────────────────────────────────────────────
// De la fase 1 (notificaciones.spec.js); los usa también la fase 4 (HU-NOT-02).
/** Ícono de la bandeja en el encabezado del inicio móvil (su botón lleva el contador). */
export const ICONO_BANDEJA = 'path[d="M3 7h5l2 3h4l2-3h5"]';

export async function abrirBandeja(page, testInfo) {
  if (esDesktop(testInfo)) await itemMenu(page, 'Notificaciones').click();
  else await page.locator(`button:has(${ICONO_BANDEJA})`).first().click();
  if (esDesktop(testInfo)) await expect(page.getByRole('heading', { name: 'Notificaciones' })).toBeVisible();
  else await expect(page.locator('.top-header__title', { hasText: /^Bandeja$/ })).toBeVisible();
  await esperarQuieta(page);
}

/** Cada notificación de la bandeja abierta: texto, fecha y marca, como la dibuja cada presentación. */
export const leerNotificaciones = (page, testInfo) => (esDesktop(testInfo)
  ? page.locator('li.sgt-dt-notif').evaluateAll((lis) => lis.map((li) => ({
    texto: li.querySelector('.sgt-dt-notif__texto').textContent.trim(),
    fecha: li.querySelector('.sgt-dt-notif__fecha').textContent.trim(),
    marca: li.querySelector('.sgt-dt-notif__linea .sgt-d-chip').textContent.trim(),
  })))
  : page.getByRole('button', { name: 'Eliminar' }).evaluateAll((bs) => bs.map((b) => {
    const tarjeta = b.parentElement.parentElement;
    const cuerpo = tarjeta.firstElementChild.lastElementChild;
    return {
      texto: cuerpo.children[1].textContent.trim(),
      fecha: cuerpo.children[2].textContent.trim(),
      marca: cuerpo.children[0].lastElementChild.textContent.trim(),
    };
  })));

/** La notificación con ese texto en la bandeja abierta: su fila (desktop) o su tarjeta (móvil), con «Marcar leída» y «Eliminar». */
export const notificacionEnBandeja = (page, testInfo, texto) => (esDesktop(testInfo)
  ? page.locator('li.sgt-dt-notif').filter({ hasText: texto })
  : page.getByText(texto, { exact: true }).locator('xpath=ancestor::div[3]'));

/**
 * Compara un mensaje del validador de asignación (R13 o solape) con el del
 * catálogo, con el nombre oculto, y comprueba aparte, sin escribirlo, que nombre a
 * `quien`. `regla`: 'noche-dia', 'dia-noche' o 'solape'; `turno`: el que cita.
 * De la fase 3 (reglas-solicitud.spec.js); la usa también la fase 4.
 */
export async function comprobarMensajeR13(request, texto, quien, regla, turno) {
  expect(sinNombre(texto)).toMatch(regla === 'solape' ? patronMensajeSolape(turno) : patronMensajeR13(regla, turno));
  const nombre = nombreMensajeR13(await personaDe(request, quien));
  expect(texto.startsWith(`No es posible asignar el turno a ${nombre} porque `), `el mensaje nombra al funcionario ${idDe(quien)}`).toBe(true);
}
