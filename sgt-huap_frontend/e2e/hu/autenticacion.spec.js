// HU de autenticación y servicio (HU-AUT-01 a 06) y registro pendiente
// (HU-PEN-01), fase 1 del catálogo docs/qa/HISTORIAS_DE_USUARIO.md (§6.2):
// solo lectura, en móvil y en desktop.
//
// Fuera de esta fase: el bloqueo por intentos (AUT-01, criterio 5) y el
// negativo por API de select-service (AUT-02, criterio 6, fase 2a).
//
// La clave incorrecta se prueba con 30000072-2 (catálogo §2.1), con un RUT
// inexistente distinto en cada corrida y, para PEN-01, con 12345677-0 (padrón
// sin registro, de apoyo). Después de cada intento fallido se hace un login
// correcto por API, que deja el contador de ese RUT en cero: así ninguna
// corrida acerca un RUT a los 5 intentos que lo bloquean 15 minutos.
import {
  test, expect, APOYO, ID, SERVICIO, USUARIOS, CLAVE_DEV, MESES, esDesktop,
  loginApi, limpiarIntentos, rutInexistente, tokenDe, apiGet, hoyChile, lunesDe, sumarDias, mesDe, anioDe,
  entrar, vistaActual, usuarioSesion, itemMenu, menuLateral, barraInferior, esperarQuieta,
} from '../helpers/hu.js';
import { diasVisiblesAgenda } from '../helpers/datos.js';

const campoRut = (page) => page.getByPlaceholder('Ej: 12.345.678-9');
const campoClave = (page) => page.getByPlaceholder('••••••••');
const botonIngresar = (page) => page.locator('button[type="submit"]');
const tituloElegir = (page) => page.getByRole('heading', { name: 'Selecciona un servicio' });
const avisoPendiente = (page) => page.getByRole('heading', { name: 'Cuenta no registrada aún' });

async function escribirCredenciales(page, rut, clave = CLAVE_DEV) {
  await page.goto('/');
  await campoRut(page).fill(rut);
  if (clave != null) await campoClave(page).fill(clave);
}

// Textos que solo duran un instante (la animación de éxito dura 450–550 ms):
// se esperan con requestAnimationFrame, armando la espera ANTES de la acción.
const verFugaz = (page, texto) => page.waitForFunction(
  (t) => document.body.innerText.includes(t), texto, { polling: 'raf', timeout: 15_000 },
);

// Encabezado del inicio: en desktop, el título del Centro de operaciones; en
// móvil, la cabecera «Agenda».
async function esperarInicio(page, testInfo) {
  await expect.poll(() => vistaActual(page), { timeout: 15_000 }).toBe('agenda');
  if (esDesktop(testInfo)) await expect(page.getByRole('heading', { name: /^Centro de turnos · Semana/ })).toBeVisible();
  else await expect(page.locator('.top-header__title', { hasText: 'Agenda' })).toBeVisible();
}

// Servicio activo tal como lo muestra la app: el menú lateral (desktop) o Mi
// Perfil (móvil). El catálogo dice que en móvil queda «en el encabezado», pero
// el inicio móvil nunca lo mostró y ningún documento lo pide (§2.2 describe ese
// encabezado sin el servicio): error del catálogo, informado en la fase 1.
async function servicioVisible(page, testInfo) {
  if (esDesktop(testInfo)) {
    // textContent: el menú lo muestra en mayúsculas solo por CSS.
    return (await menuLateral(page).locator('.sgt-desktop__marca-servicio').textContent()).trim();
  }
  await barraInferior(page, 'Perfil').click();
  await expect(page.getByText('Mi Perfil', { exact: true })).toBeVisible();
  const servicio = (await page.locator('h2 + p').first().textContent()).trim();
  await barraInferior(page, 'Inicio').click();
  return servicio;
}

async function botonCambiarServicio(page, testInfo) {
  return esDesktop(testInfo)
    ? menuLateral(page).getByRole('button', { name: 'Cambiar servicio' })
    : page.getByRole('button', { name: 'Volver a selección de servicio' });
}

// ═════════════════════════════════════════════════════════════════════════════
// HU-AUT-01 · Iniciar sesión con RUT y clave
// ═════════════════════════════════════════════════════════════════════════════

test('HU-AUT-01 · criterio 1: el RUT se formatea al escribirlo', async ({ page }) => {
  await page.goto('/');
  await campoRut(page).pressSequentially('123456789');
  await expect(campoRut(page)).toHaveValue('12.345.678-9');

  await campoRut(page).fill('');
  await campoRut(page).pressSequentially('9876543k');
  await expect(campoRut(page)).toHaveValue('9.876.543-K');
});

test('HU-AUT-01 · criterio 2: validaciones del formulario sin llamar al backend', async ({ page }) => {
  const llamadas = [];
  page.on('request', (r) => { if (/\/funcionarios\/login$/.test(new URL(r.url()).pathname)) llamadas.push(r.url()); });
  await page.goto('/');

  // Vacío y un solo carácter: menos de 2.
  await botonIngresar(page).click();
  await expect(page.getByText('Ingresa un RUT válido', { exact: true })).toBeVisible();
  await campoRut(page).fill('1');
  await botonIngresar(page).click();
  await expect(page.getByText('Ingresa un RUT válido', { exact: true })).toBeVisible();

  // Menos de 7 dígitos antes del verificador.
  await campoRut(page).fill('123456');
  await botonIngresar(page).click();
  await expect(page.getByText('RUT incompleto', { exact: true })).toBeVisible();

  // RUT completo, sin clave.
  await campoRut(page).fill(APOYO.claveIncorrecta.rut);
  await botonIngresar(page).click();
  await expect(page.getByText('Ingresa tu contraseña', { exact: true })).toBeVisible();

  expect(llamadas, 'las validaciones no deben llamar a POST /funcionarios/login').toEqual([]);
});

test('HU-AUT-01 · criterio 3: credenciales correctas, varios servicios → elección de servicio', async ({ page }) => {
  await escribirCredenciales(page, USUARIOS.multiservicio.rut);
  const bienvenida = verFugaz(page, '¡Bienvenido!');
  await botonIngresar(page).click();
  await bienvenida;
  await expect(tituloElegir(page)).toBeVisible();
});

test('HU-AUT-01 · criterio 3: credenciales correctas, un servicio → directo al inicio', async ({ page }, testInfo) => {
  await escribirCredenciales(page, USUARIOS.medico.rut);
  const bienvenida = verFugaz(page, '¡Bienvenido!');
  await botonIngresar(page).click();
  await bienvenida;
  await esperarInicio(page, testInfo);
});

test('HU-AUT-01 · criterio 4: clave incorrecta', async ({ page, request }) => {
  try {
    await escribirCredenciales(page, APOYO.claveIncorrecta.rut, 'clave-incorrecta');
    await botonIngresar(page).click();
    await expect(page.getByText('Credenciales inválidas.', { exact: true })).toBeVisible();
    await expect(campoRut(page)).toBeVisible();
    expect(await page.evaluate(() => localStorage.getItem('jwt_token'))).toBeNull();
  } finally {
    await limpiarIntentos(request, APOYO.claveIncorrecta.rut);
  }
});

test('HU-AUT-01 · criterio 4: RUT que no existe, mismo mensaje', async ({ page, request }) => {
  const rut = rutInexistente();
  expect((await loginApi(request, rut)).status, 'el RUT de prueba no debe existir').toBe(401);
  await escribirCredenciales(page, rut);
  await botonIngresar(page).click();
  await expect(page.getByText('Credenciales inválidas.', { exact: true })).toBeVisible();
  await expect(campoRut(page)).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('jwt_token'))).toBeNull();
});

test('HU-AUT-01 · criterio 6: funcionario sin servicios asignados', async () => {
  test.skip(true, 'No automatizable en la fase 1: el seed no tiene un funcionario registrado sin filas en Servicios_Funcionario y crearlo muta la base (catálogo, HU-AUT-01 «Prueba E2E»).');
});

// ═════════════════════════════════════════════════════════════════════════════
// HU-AUT-02 · Elegir el servicio cuando tengo varios
// ═════════════════════════════════════════════════════════════════════════════

test('HU-AUT-02 · criterio 1: «Selecciona un servicio» con cada servicio y mi rol', async ({ page, request }) => {
  const { body } = await loginApi(request, USUARIOS.multiservicio.rut);
  expect(body.servicios.length).toBeGreaterThanOrEqual(2);

  await escribirCredenciales(page, USUARIOS.multiservicio.rut);
  await botonIngresar(page).click();
  await expect(tituloElegir(page)).toBeVisible();
  await expect(page.getByRole('button').filter({ hasText: /JEFATURA|SUBROGANTE|MEDICO/ })).toHaveCount(body.servicios.length);
  for (const s of body.servicios) {
    await expect(page.getByRole('button', { name: `${s.nombre} ${s.rol}`, exact: true })).toBeVisible();
  }
});

test('HU-AUT-02 · criterio 2: elegir un servicio entra al inicio con ese servicio', async ({ page, request }, testInfo) => {
  const { body } = await loginApi(request, USUARIOS.multiservicio.rut);
  const elegido = body.servicios.find((s) => s.servicioId === SERVICIO.medicinaInterna);

  await escribirCredenciales(page, USUARIOS.multiservicio.rut);
  await botonIngresar(page).click();
  await expect(tituloElegir(page)).toBeVisible();
  const listo = verFugaz(page, '¡Listo!');
  await page.getByRole('button', { name: new RegExp(`^${elegido.nombre}`) }).click();
  await listo;
  await esperarInicio(page, testInfo);
  expect((await usuarioSesion(page)).servicioId).toBe(elegido.servicioId);
  expect(await servicioVisible(page, testInfo)).toBe(elegido.nombre);
});

test('HU-AUT-02 · criterio 3: «Salir» vuelve al login', async ({ page }) => {
  await escribirCredenciales(page, USUARIOS.multiservicio.rut);
  await botonIngresar(page).click();
  await expect(tituloElegir(page)).toBeVisible();
  await page.getByRole('button', { name: 'Salir' }).click();
  await expect(campoRut(page)).toBeVisible();
  await expect(tituloElegir(page)).toHaveCount(0);
});

test('HU-AUT-02 · criterio 4: el administrador ve todos los servicios vigentes; donde no es miembro, JEFATURA', async ({ page, request }) => {
  const token = await tokenDe(request, USUARIOS.admin.rut, SERVICIO.urgencias);
  const vigentes = await apiGet(request, token, '/servicios');
  const perfil = await apiGet(request, token, `/funcionarios/${ID.admin}/summary`);
  const rolPropio = new Map((perfil.servicios || []).map((s) => [s.idServicio, s.rolServicioNombre]));

  await escribirCredenciales(page, USUARIOS.admin.rut);
  await botonIngresar(page).click();
  await expect(tituloElegir(page)).toBeVisible();
  for (const s of vigentes) {
    const rol = rolPropio.get(s.id) || 'JEFATURA';
    await expect(page.getByRole('button', { name: `${s.nombre} ${rol}`, exact: true }), `${s.nombre} (${rolPropio.has(s.id) ? 'miembro' : 'no miembro'})`).toBeVisible();
  }
  await expect(page.getByRole('button').filter({ hasText: /JEFATURA|SUBROGANTE|MEDICO/ })).toHaveCount(vigentes.length);
});

test('HU-AUT-02 · criterio 5: token de pre-autorización vencido', async () => {
  test.skip(true, 'No automatizable en la fase 1: exige esperar más de 5 minutos reales; el vencimiento lo controla el backend, no el reloj del navegador (catálogo, HU-AUT-02).');
});

// ═════════════════════════════════════════════════════════════════════════════
// HU-AUT-03 · Entrar directo cuando tengo un solo servicio (R8)
// ═════════════════════════════════════════════════════════════════════════════

for (const rol of ['medico', 'jefatura', 'subrogante']) {
  test(`HU-AUT-03 · criterio 1: entra directo al inicio de su servicio (${rol})`, async ({ page, request }, testInfo) => {
    const { body } = await loginApi(request, USUARIOS[rol].rut);
    expect(body.servicios, 'el usuario tiene un solo servicio').toHaveLength(1);
    const [unico] = body.servicios;

    // Registra si en algún momento aparece la elección de servicio.
    await page.addInitScript(() => {
      window.__vioEleccion = false;
      new MutationObserver(() => {
        if (document.body?.innerText.includes('Selecciona un servicio')) window.__vioEleccion = true;
      }).observe(document, { childList: true, subtree: true, characterData: true });
    });
    // El canje automático se demora un poco para poder ver «Entrando…».
    await page.route('**/api/v2/funcionarios/login/select-service', async (route) => {
      await new Promise((r) => setTimeout(r, 1200));
      return route.fallback();
    });
    const pedidosTurnos = [];
    page.on('request', (r) => { const m = new URL(r.url()).pathname.match(/\/turnos\/servicio\/(\d+)$/); if (m) pedidosTurnos.push(Number(m[1])); });

    await escribirCredenciales(page, USUARIOS[rol].rut);
    await botonIngresar(page).click();
    await expect(page.getByRole('status').filter({ hasText: 'Entrando…' })).toBeVisible();
    await esperarInicio(page, testInfo);
    expect(await page.evaluate(() => window.__vioEleccion), 'no debió mostrarse la elección de servicio').toBe(false);
    expect((await usuarioSesion(page)).servicioId).toBe(unico.servicioId);
    expect(pedidosTurnos, 'el inicio carga los turnos de su servicio').toContain(unico.servicioId);
    expect(new Set(pedidosTurnos)).toEqual(new Set([unico.servicioId]));
  });
}

test('HU-AUT-03 · criterio 2: si el canje automático falla, elijo el servicio y puedo reintentar', async ({ page, request }, testInfo) => {
  const { body } = await loginApi(request, USUARIOS.medico.rut);
  const [unico] = body.servicios;
  let cortes = 2; // el canje automático y el primer reintento fallan
  await page.route('**/api/v2/funcionarios/login/select-service', (route) => {
    if (cortes > 0) { cortes -= 1; return route.abort('connectionfailed'); }
    return route.fallback();
  });

  await escribirCredenciales(page, USUARIOS.medico.rut);
  await botonIngresar(page).click();
  await expect(tituloElegir(page)).toBeVisible();
  const tarjeta = page.getByRole('button', { name: new RegExp(`^${unico.nombre}`) });
  await expect(tarjeta).toHaveCount(1);
  await expect(page.getByRole('button').filter({ hasText: unico.rol })).toHaveCount(1);
  await expect(page.getByText('No se pudo conectar con el servidor')).toHaveCount(0);

  // Reintento que vuelve a fallar: el error aparece en la misma pantalla.
  await tarjeta.click();
  await expect(page.getByText('No se pudo conectar con el servidor')).toBeVisible();
  await expect(tituloElegir(page)).toBeVisible();

  // Nuevo reintento, con la red de vuelta: entra.
  await tarjeta.click();
  await esperarInicio(page, testInfo);
  expect((await usuarioSesion(page)).servicioId).toBe(unico.servicioId);
});

// ═════════════════════════════════════════════════════════════════════════════
// HU-AUT-04 · Refrescar la página sin perder la pantalla (R5)
// ═════════════════════════════════════════════════════════════════════════════

test('HU-AUT-04 · criterio 1: refrescar en el calendario y en Mi Perfil conserva la pantalla', async ({ page }, testInfo) => {
  await entrar(page, 'medico');
  const desktop = esDesktop(testInfo);
  const hoy = hoyChile();
  const mesTitulo = `${MESES[mesDe(hoy) - 1]} ${anioDe(hoy)}`;
  const calendario = desktop
    ? page.getByRole('heading', { name: `Calendario · ${mesTitulo}` })
    : page.getByText(mesTitulo, { exact: true });
  const perfil = desktop ? page.getByRole('heading', { name: 'Mi Perfil' }) : page.getByText('Mi Perfil', { exact: true });

  if (desktop) await itemMenu(page, 'Calendario').click(); else await barraInferior(page, 'Calendario').click();
  await expect(calendario).toBeVisible();
  await page.reload();
  await esperarQuieta(page);
  await expect(calendario).toBeVisible();
  expect(await vistaActual(page)).toBe('calendar_view');

  if (desktop) await itemMenu(page, 'Perfil').click(); else await barraInferior(page, 'Perfil').click();
  await expect(perfil).toBeVisible();
  await page.reload();
  await esperarQuieta(page);
  await expect(perfil).toBeVisible();
  expect(await vistaActual(page)).toBe('perfil');
});

test('HU-AUT-04 · criterio 2: pestaña nueva con sesión abierta → inicio; tras cerrar sesión, refrescar → login', async ({ page, context }, testInfo) => {
  await entrar(page, 'medico');
  if (esDesktop(testInfo)) await itemMenu(page, 'Perfil').click(); else await barraInferior(page, 'Perfil').click();

  const otra = await context.newPage();
  await otra.goto('/');
  await esperarInicio(otra, testInfo);
  await otra.close();

  if (esDesktop(testInfo)) await itemMenu(page, 'Centro de turnos').click(); else await barraInferior(page, 'Inicio').click();
  if (esDesktop(testInfo)) await menuLateral(page).getByRole('button', { name: 'Cerrar sesión' }).click();
  else await page.getByRole('button', { name: 'Cerrar sesión' }).click();
  await expect(campoRut(page)).toBeVisible();
  await page.reload();
  await expect(campoRut(page)).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('jwt_token'))).toBeNull();
});

test('HU-AUT-04 · criterio 3: un médico que fuerza la vista «admin» cae en el inicio', async ({ page }, testInfo) => {
  await entrar(page, 'medico');
  await page.evaluate(() => sessionStorage.setItem('sgt_nav_state', '{"view":"admin"}'));
  await page.reload();
  await esperarInicio(page, testInfo);
  await expect(page.getByText('Administración', { exact: true })).toHaveCount(0);
});

test('HU-AUT-04 · criterio 4: login, elección de servicio y registro pendiente nunca se restauran', async ({ page }, testInfo) => {
  // Con sesión: forzar cualquiera de las tres pantallas lleva al inicio.
  await entrar(page, 'medico');
  for (const vista of ['login', 'select_service', 'pending_registration']) {
    await page.evaluate((v) => sessionStorage.setItem('sgt_nav_state', JSON.stringify({ view: v })), vista);
    await page.reload();
    await esperarInicio(page, testInfo);
  }

  // Sin sesión: refrescar en la elección de servicio o en el registro pendiente vuelve al login.
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
  await escribirCredenciales(page, USUARIOS.multiservicio.rut);
  await botonIngresar(page).click();
  await expect(tituloElegir(page)).toBeVisible();
  await page.reload();
  await expect(campoRut(page)).toBeVisible();
  await expect(tituloElegir(page)).toHaveCount(0);

  await escribirCredenciales(page, USUARIOS.noRegistrado.rut);
  await botonIngresar(page).click();
  await expect(avisoPendiente(page)).toBeVisible();
  await page.reload();
  await expect(campoRut(page)).toBeVisible();
  await expect(avisoPendiente(page)).toHaveCount(0);
});

// ═════════════════════════════════════════════════════════════════════════════
// HU-AUT-05 · Cambiar de servicio sin volver a escribir la clave
// ═════════════════════════════════════════════════════════════════════════════

test('HU-AUT-05 · criterio 1: multiservicio cambia de Cirugía a Medicina Interna', async ({ page, api }, testInfo) => {
  await entrar(page, 'multiservicio', { servicio: 'Cirugía' });
  expect((await usuarioSesion(page)).servicioId).toBe(SERVICIO.cirugia);
  expect(await servicioVisible(page, testInfo)).toBe('Cirugía');

  const pedidos = [];
  page.on('request', (r) => { const m = new URL(r.url()).pathname.match(/\/turnos\/servicio\/(\d+)$/); if (m) pedidos.push(Number(m[1])); });
  await (await botonCambiarServicio(page, testInfo)).click();
  await expect(tituloElegir(page)).toBeVisible();
  const turnosMI = page.waitForResponse((r) => new URL(r.url()).pathname.endsWith(`/turnos/servicio/${SERVICIO.medicinaInterna}`));
  await page.getByRole('button', { name: /^Medicina Interna/ }).click();
  await turnosMI;
  await esperarInicio(page, testInfo);

  expect((await usuarioSesion(page)).servicioId).toBe(SERVICIO.medicinaInterna);
  expect(pedidos.filter((id) => id !== SERVICIO.medicinaInterna), 'después del cambio solo se cargan turnos de Medicina Interna').toEqual([]);
  // Los turnos del inicio son los de Medicina Interna: lo que muestra coincide con la API.
  const turnos = await api.get(`/turnos/servicio/${SERVICIO.medicinaInterna}`);
  const hoy = hoyChile();
  if (esDesktop(testInfo)) {
    await expect(page.getByText(/^Medicina Interna · /)).toBeVisible();
    const lunes = lunesDe(hoy);
    const semana = turnos.filter((t) => t.diaInicioTurno >= lunes && t.diaInicioTurno <= sumarDias(lunes, 6));
    const asignados = semana.filter((t) => t.idFuncionario != null).length;
    await expect(page.getByText(`${asignados}/${semana.length} asignados`, { exact: true })).toBeVisible();
  } else {
    const visibles = new Set(diasVisiblesAgenda(turnos, hoy));
    const mios = new Set(turnos.filter((t) => t.idFuncionario === ID.multiservicio && visibles.has(t.diaInicioTurno)).map((t) => t.diaInicioTurno));
    await expect(page.getByRole('tab', { name: mios.size ? `Mis turnos ${mios.size}` : 'Mis turnos', exact: true })).toBeVisible();
  }
  expect(await servicioVisible(page, testInfo)).toBe('Medicina Interna');
});

test('HU-AUT-05 · criterio 2: el administrador sigue con JEFATURA y con el Panel de Administración', async ({ page }, testInfo) => {
  await entrar(page, 'admin');
  await (await botonCambiarServicio(page, testInfo)).click();
  await expect(tituloElegir(page)).toBeVisible();
  await page.getByRole('button', { name: /^Medicina Interna/ }).click();
  await esperarInicio(page, testInfo);

  const usuario = await usuarioSesion(page);
  expect(usuario.servicioId).toBe(SERVICIO.medicinaInterna);
  expect(usuario.rol).toBe('JEFATURA');
  if (esDesktop(testInfo)) await itemMenu(page, 'Perfil').click(); else await barraInferior(page, 'Perfil').click();
  await expect(page.getByRole('button', { name: /^Panel de Administración/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /^Panel de Jefatura/ })).toBeVisible();
});

test('HU-AUT-05 · criterio 3: después de refrescar, cambiar de servicio sigue funcionando', async ({ page }, testInfo) => {
  await entrar(page, 'multiservicio', { servicio: 'Cirugía' });
  await page.reload();
  await esperarInicio(page, testInfo);
  await (await botonCambiarServicio(page, testInfo)).click();
  await expect(tituloElegir(page)).toBeVisible();
  await expect(page.getByRole('button', { name: /^Cirugía/ })).toBeVisible();
  await page.getByRole('button', { name: /^Medicina Interna/ }).click();
  await esperarInicio(page, testInfo);
  expect((await usuarioSesion(page)).servicioId).toBe(SERVICIO.medicinaInterna);
});

test('HU-AUT-05 · criterio 4: con un solo servicio el botón se ve y muestra solo ese servicio', async ({ page }, testInfo) => {
  await entrar(page, 'medico');
  const boton = await botonCambiarServicio(page, testInfo);
  await expect(boton).toBeVisible();
  await boton.click();
  await expect(tituloElegir(page)).toBeVisible();
  // La lista sale de user_data (sesión reusada, como tras refrescar): trae el
  // servicio sin el rol (ver informe de la fase 1).
  await expect(page.getByRole('button', { name: /^Urgencias( MEDICO)?$/ })).toBeVisible();
  await expect(page.getByRole('button').filter({ hasNotText: 'Salir' })).toHaveCount(1);
});

// ═════════════════════════════════════════════════════════════════════════════
// HU-AUT-06 · Cerrar sesión
// ═════════════════════════════════════════════════════════════════════════════

test('HU-AUT-06 · criterio 1: cerrar sesión vuelve al login y borra la sesión del navegador', async ({ page }, testInfo) => {
  await entrar(page, 'medico');
  if (esDesktop(testInfo)) await menuLateral(page).getByRole('button', { name: 'Cerrar sesión' }).click();
  else await page.getByRole('button', { name: 'Cerrar sesión' }).click(); // «Salir» del encabezado
  await expect(campoRut(page)).toBeVisible();
  const restos = await page.evaluate(() => ({
    jwt_token: localStorage.getItem('jwt_token'),
    user_data: localStorage.getItem('user_data'),
    servicio: localStorage.getItem('sgt_servicio_activo_nombre'),
    nav: sessionStorage.getItem('sgt_nav_state'),
  }));
  // La navegación de la sesión se borra; al montar el login la app vuelve a
  // escribir sgt_nav_state, pero solo con la vista «login», que nunca se restaura.
  expect({ ...restos, nav: restos.nav && JSON.parse(restos.nav).view !== 'login' ? restos.nav : null })
    .toEqual({ jwt_token: null, user_data: null, servicio: null, nav: null });
});

test('HU-AUT-06 · criterio 2: después de cerrar sesión, refrescar deja en el login', async ({ page }, testInfo) => {
  await entrar(page, 'medico');
  if (esDesktop(testInfo)) await menuLateral(page).getByRole('button', { name: 'Cerrar sesión' }).click();
  else await page.getByRole('button', { name: 'Cerrar sesión' }).click();
  await expect(campoRut(page)).toBeVisible();
  await page.reload();
  await expect(campoRut(page)).toBeVisible();
  expect(await vistaActual(page)).toBe('login');
});

// ═════════════════════════════════════════════════════════════════════════════
// HU-PEN-01 · Aviso de cuenta no registrada
// ═════════════════════════════════════════════════════════════════════════════

test('HU-PEN-01 · criterio 1: aviso «Cuenta no registrada aún»', async ({ page }) => {
  await escribirCredenciales(page, USUARIOS.noRegistrado.rut);
  await botonIngresar(page).click();
  await expect(avisoPendiente(page)).toBeVisible();
  await expect(page.getByText('Tu cuenta aún no ha sido registrada en el sistema', { exact: true })).toBeVisible();
  await expect(page.getByText('Si crees que esto es un error, contacta a jefatura o al equipo de soporte para que te creen el registro correspondiente.', { exact: true })).toBeVisible();
  await expect(menuLateral(page)).toHaveCount(0);
});

test('HU-PEN-01 · criterio 2: «Volver al inicio» lleva al login sin dejar sesión', async ({ page }) => {
  await escribirCredenciales(page, USUARIOS.noRegistrado.rut);
  await botonIngresar(page).click();
  await expect(avisoPendiente(page)).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('jwt_token'))).toBeNull();
  await page.getByRole('button', { name: 'Volver al inicio' }).click();
  await expect(campoRut(page)).toBeVisible();
  await page.reload();
  await expect(campoRut(page)).toBeVisible();
  expect(await page.evaluate(() => [localStorage.getItem('jwt_token'), localStorage.getItem('user_data')])).toEqual([null, null]);
});

test('HU-PEN-01 · criterio 3: con clave incorrecta, «Credenciales inválidas.» y no el aviso', async ({ page, request }) => {
  // 12345677-0 está, como el usuario «no registrado», en el padrón y no en el SGT.
  expect((await loginApi(request, APOYO.padronSinRegistro.rut)).body.registeredInSystem).toBe(false);
  try {
    await escribirCredenciales(page, APOYO.padronSinRegistro.rut, 'clave-incorrecta');
    await botonIngresar(page).click();
    await expect(page.getByText('Credenciales inválidas.', { exact: true })).toBeVisible();
    await expect(avisoPendiente(page)).toHaveCount(0);
  } finally {
    await limpiarIntentos(request, APOYO.padronSinRegistro.rut);
  }
});
