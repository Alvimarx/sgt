// Base común de las pruebas de historias de usuario (e2e/hu/).
//
// - `test`: el test de Playwright con una guarda de SOLO LECTURA automática.
//   Toda petición a /api/v2 que no sea GET se corta en el navegador (salvo el
//   login, la elección y el cambio de servicio, que no escriben en la base) y
//   la prueba falla al terminar si intentó escribir o si la página lanzó una
//   excepción no capturada. Además omite las pruebas en desktop-fhd y no deja
//   correr entre las 21:00 y las 24:00 de Chile (el backend usa UTC, R18).
// - `entrar`: sesión por la interfaz (iniciarSesion de sesion.js). La primera
//   vez que un rol entra en una corrida, entra por la pantalla de login; las
//   siguientes reusa su JWT y user_data, como quien refresca la pestaña (R5).
//   Siempre termina con un refresco, para que toda prueba parta del mismo
//   estado (el de una pestaña refrescada).
// - `api`: lecturas de la API con el JWT de la página, para calcular lo
//   esperado a partir de los datos del día (las fechas cambian: nada en duro).
//
// Los usuarios son los del seed de desarrollo (catálogo §2.1). Las pruebas no
// escriben nombres de personas: identifican a cada una por RUT o por id y, si
// necesitan un nombre, lo leen de la sesión o de la API durante la prueba.
import { test as base, expect } from '@playwright/test';
import { CLAVE_DEV, USUARIOS, iniciarSesion, esperarQuieta } from './sesion.js';

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
export const horaChile = () => Number(partesChile().hour);
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
    if (horaChile() >= 21 && !process.env.SGT_IGNORAR_HORA) {
      throw new Error('Son más de las 21:00 en Chile: el backend (UTC) ya cree que es mañana. Correr de día (catálogo §2.3).');
    }
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
      items.push(await det.evaluate((el) => ({
        titulo: el.querySelector('h2')?.textContent.trim(),
        fecha: el.querySelector('.sgt-dt-detalle-sol__subtitulo')?.textContent.trim().replace(/^(Creada|Publicada) el /, ''),
        estado: el.querySelector('.sgt-dt-detalle-sol__cabecera .sgt-d-chip')?.textContent.trim(),
        filas: Object.fromEntries([...el.querySelectorAll('.sgt-dt-ficha__fila')].map((f) => [f.querySelector('dt').textContent.trim(), f.querySelector('dd').textContent.trim()])),
        motivo: el.querySelector('.sgt-dt-motivo__texto')?.textContent.trim(),
        notas: [...el.querySelectorAll('.sgt-d-aviso')].map((a) => a.textContent.trim()),
        botones: [...el.querySelectorAll('button')].map((b) => b.textContent.trim()),
      })));
    }
    return items;
  }
  return page.locator('.sgt-list-row').evaluateAll((tarjetas) => tarjetas.map((el) => {
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
      notas: resto.filter((c) => /^(⏳|✕)/.test(c.textContent.trim())).map((c) => c.textContent.trim()),
      botones: [...el.querySelectorAll('button')].map((b) => b.textContent.trim()),
    };
  }));
}
