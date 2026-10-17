// HU-NOT-01 · Ver mi bandeja de notificaciones, fase 1 del catálogo (§6.2),
// solo lectura, en móvil y en desktop. Criterios 1 a 4 (el 5 es un negativo
// por API de la fase 2a).
//
// Usuaria: 30000013-3 (312), con una notificación sin leer en el seed (la 16).
// No se usa la bandeja del administrador: sus notificaciones de Medicina
// Interna usan estados que el código no reconoce e incluyen la 8, ligada al
// funcionario 4 (catálogo §2.3 y §7). La bandeja vacía es la del médico 369.
// Una notificación leída no está en el seed para esta usuaria: se simula
// respondiendo la consulta GET (nada se guarda).
import {
  test, expect, APOYO, ID, esMovil, esDesktop, hoyChile, sumarDias, entrar, itemMenu,
  ICONO_BANDEJA, abrirBandeja, leerNotificaciones,
} from '../helpers/hu.js';

// Fecha de envío como la formatea la bandeja (es-CL, fecha y hora cortas).
const fechaEnvio = (page, iso) => page.evaluate((v) => new Date(v).toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short' }), iso);

// Agrega a la respuesta real una copia LEÍDA de la primera notificación,
// enviada dos semanas antes de hoy.
async function simularLeida(page) {
  const leida = { mensaje: 'Notificación simulada ya leída', estado: 'LEIDO', fechaEnvio: `${sumarDias(hoyChile(), -14)}T09:15:00` };
  await page.route(new RegExp(`/api/v2/notificaciones/usuario/${APOYO.notificaciones.id}$`), async (route) => {
    const r = await route.fetch();
    const reales = await r.json();
    return route.fulfill({ response: r, json: [...reales, { ...reales[0], idNotificacion: 990016, ...leida }] });
  });
  return leida;
}

test('HU-NOT-01 · criterio 1: cada notificación muestra el texto, la fecha y «Nueva» o «Leída»', async ({ page, api }, testInfo) => {
  await entrar(page, 'notificaciones');
  const reales = await api.get(`/notificaciones/usuario/${APOYO.notificaciones.id}`);
  expect(reales.length, 'la usuaria tiene notificaciones en el seed').toBeGreaterThan(0);
  const leida = await simularLeida(page);
  await abrirBandeja(page, testInfo);

  const vistas = await leerNotificaciones(page, testInfo);
  expect(vistas).toHaveLength(reales.length + 1);
  for (const n of reales) {
    const v = vistas.find((x) => x.texto === n.mensaje);
    expect(v, `notificación ${n.idNotificacion}`).toBeTruthy();
    expect(v.fecha).toBe(await fechaEnvio(page, n.fechaEnvio));
    expect(v.marca).toBe(String(n.estado).toUpperCase() === 'LEIDO' ? 'Leída' : 'Nueva');
  }
  const v = vistas.find((x) => x.texto === leida.mensaje);
  expect(v.marca).toBe('Leída');
  expect(v.fecha).toBe(await fechaEnvio(page, leida.fechaEnvio));
});

test('HU-NOT-01 · criterio 2: título y marcas de la bandeja (móvil) o segmentos con conteos (desktop)', async ({ page, api }, testInfo) => {
  await entrar(page, 'notificaciones');
  const sinLeer = await api.get(`/notificaciones/sin-leer/${APOYO.notificaciones.id}`);
  const reales = await api.get(`/notificaciones/usuario/${APOYO.notificaciones.id}`);
  await simularLeida(page);
  await abrirBandeja(page, testInfo);
  const total = reales.length + 1;

  if (esDesktop(testInfo)) {
    const segmentos = page.getByRole('tablist', { name: 'Filtrar notificaciones' }).getByRole('tab');
    await expect(segmentos).toHaveText([`Todas${total}`, `Sin leer${sinLeer}`, `Leídas${total - sinLeer}`]);
    await segmentos.nth(2).click();
    await expect(page.locator('li.sgt-dt-notif')).toHaveCount(total - sinLeer);
    await segmentos.nth(1).click();
    await expect(page.locator('li.sgt-dt-notif')).toHaveCount(sinLeer);
  } else {
    await expect(page.locator('.top-header__subtitle')).toHaveText(sinLeer > 0 ? `${sinLeer} sin leer` : 'Todo al día');
    await expect(page.getByText(`${sinLeer} sin leer`, { exact: true }).last()).toBeVisible();
    await expect(page.getByText(`${total} recibidas`, { exact: true })).toBeVisible();
  }
});

test('HU-NOT-01 · criterio 2: sin notificaciones por leer, «Todo al día»', async ({ page }, testInfo) => {
  await entrar(page, 'medico');
  await abrirBandeja(page, testInfo);
  if (esDesktop(testInfo)) await expect(page.locator('.sgt-d-encabezado__subtitulo')).toHaveText('Todo al día');
  else await expect(page.locator('.top-header__subtitle')).toHaveText('Todo al día');
});

test('HU-NOT-01 · criterio 3: el contador del menú, el del encabezado y las marcas «Nueva» coinciden', async ({ page, api }, testInfo) => {
  await entrar(page, 'notificaciones');
  const sinLeer = await api.get(`/notificaciones/sin-leer/${APOYO.notificaciones.id}`);
  expect(sinLeer).toBeGreaterThan(0);

  // Contador del menú (desktop) o del ícono de la bandeja en el inicio (móvil).
  if (esDesktop(testInfo)) await expect(itemMenu(page, 'Notificaciones')).toHaveAccessibleName(`Notificaciones ${sinLeer}`);
  else await expect(page.locator(`button:has(${ICONO_BANDEJA})`).first().locator('span')).toHaveText(String(sinLeer));

  await abrirBandeja(page, testInfo);
  if (esDesktop(testInfo)) await expect(page.locator('.sgt-d-encabezado__subtitulo')).toHaveText(new RegExp(`^${sinLeer} sin leer · `));
  else await expect(page.locator('.top-header__subtitle')).toHaveText(`${sinLeer} sin leer`);
  const marcas = (await leerNotificaciones(page, testInfo)).map((n) => n.marca);
  expect(marcas.filter((m) => m === 'Nueva')).toHaveLength(sinLeer);
});

test('HU-NOT-01 · criterio 4: sin notificaciones, «No tienes notificaciones en este momento.»', async ({ page, api }, testInfo) => {
  await entrar(page, 'medico');
  expect(await api.get(`/notificaciones/usuario/${ID.medico}`)).toEqual([]);
  await abrirBandeja(page, testInfo);
  await expect(page.getByText('No tienes notificaciones en este momento.', { exact: true })).toBeVisible();
  if (esMovil(testInfo)) await expect(page.getByText('0 recibidas', { exact: true })).toBeVisible();
});
