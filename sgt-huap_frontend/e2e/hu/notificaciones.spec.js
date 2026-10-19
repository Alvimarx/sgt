// HU-NOT-01 · Ver mi bandeja de notificaciones, fase 1 del catálogo (§6.2), solo lectura,
// en móvil y en desktop.
//
// C-09 (decidido el 19 oct 2026): las notificaciones no se implementan para la entrega, porque
// el backend todavía no genera avisos (HU-NOT-03) y la bandeja solo mostraba datos del seed.
// La interfaz la oculta con un interruptor (src/config/funciones.js, NOTIFICACIONES_HABILITADAS
// = false): sin ícono ni contador en el encabezado móvil, sin el ítem «Notificaciones» del menú
// desktop, sin el aviso «N notificaciones sin leer» del inicio, con la vista `notifications`
// cayendo al inicio y sin consultar /notificaciones/usuario/{id} ni /sin-leer/{id}. Los cuatro
// criterios de la fase 1 (HU-NOT-01, 1 a 4) quedan en pausa mientras esté apagado; esta prueba
// guarda la decisión. El criterio 5, un negativo por API, sigue en permisos.spec.js.
//
// Usuaria 312, con una notificación sin leer en el seed (la 16): con la bandeja
// encendida se vería su contador.
import {
  test, expect, esDesktop, entrar, irA, itemMenu, vistaActual, esperarQuieta, ICONO_BANDEJA,
} from '../helpers/hu.js';

test('HU-NOT-01 · C-09: la bandeja no se ofrece en la entrega', async ({ page }, testInfo) => {
  const consultas = [];
  page.on('request', (r) => {
    if (/\/api\/v2\/notificaciones\/(usuario|sin-leer)\//.test(r.url())) consultas.push(`${r.method()} ${new URL(r.url()).pathname}`);
  });
  await entrar(page, 'notificaciones');
  await esperarQuieta(page);

  // Sin ícono ni contador (móvil), sin ítem (desktop) y sin el aviso de «sin leer» del inicio.
  if (esDesktop(testInfo)) await expect(itemMenu(page, 'Notificaciones')).toHaveCount(0);
  else await expect(page.locator(`button:has(${ICONO_BANDEJA})`)).toHaveCount(0);
  await expect(page.getByText(/notificaci(o|ó)n(es)? sin leer/)).toHaveCount(0);

  // La vista guardada o forzada cae al inicio.
  await irA(page, 'notifications');
  await expect.poll(() => vistaActual(page), { timeout: 15_000 }).toBe('agenda');
  await expect(page.getByRole('heading', { name: 'Notificaciones' })).toHaveCount(0);
  await expect(page.locator('.top-header__title', { hasText: /^Bandeja$/ })).toHaveCount(0);

  expect(consultas, 'la app no consulta la bandeja ni su contador (sin polling)').toEqual([]);
});
