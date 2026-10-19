// HU-NOT-02 · Marcar como leída y eliminar, fase 4 del catálogo
// docs/qa/HISTORIAS_DE_USUARIO.md (§6.2), en móvil y en desktop.
//
// OMITIDAS desde el 19 oct 2026 (C-09): la bandeja de notificaciones queda oculta para la entrega
// (src/config/funciones.js, NOTIFICACIONES_HABILITADAS = false), así que no hay ícono, ítem ni vista que probar.
// Los cuerpos se conservan: con el interruptor en `true`, quitar la línea test.skip de cada prueba.
//
// No se toca la notificación 16 del seed (la leen las fases 1 y 2a). Como el
// backend no crea notificaciones con las solicitudes (HU-NOT-03, C-09), cada prueba
// crea la suya: el médico 369 pide un cupo (por API) y se crea una notificación
// ligada a esa solicitud con POST /notificaciones (sin pantalla, §1.5). La bandeja
// del 369 está vacía en el seed, así que el contador parte de ese 1. Al final la
// notificación queda ELIMINADO (la bandeja no la muestra) y la solicitud, cancelada.
import {
  test, testMuta, expect, ID, esDesktop, entrar, itemMenu, esperarQuieta, apiComo, vistaActual,
  abrirBandeja, leerNotificaciones, notificacionEnBandeja, ICONO_BANDEJA,
  motivoF4, cuposLibresPara, pulsarYEsperar,
} from '../helpers/hu.js';

/** Una notificación nueva en la bandeja del 369, ligada a una cobertura suya creada por API. */
async function notificacionNueva(request, muta, etiqueta) {
  const [cupo] = await cuposLibresPara(request, 'medico');
  expect(cupo, 'hay un cupo libre que el médico puede pedir').toBeTruthy();
  const sol = await muta.crear('medico', { idTipoSolicitud: 3, idTurno: cupo.id, motivo: motivoF4(`${etiqueta} · solicitud`) });
  const mensaje = motivoF4(`${etiqueta} · notificación`);
  const notificacion = await muta.notificar('medico', sol.idSolicitud, mensaje);
  return { sol, mensaje, id: notificacion.idNotificacion };
}

const sinLeer = (request) => apiComo(request, 'medico', `/notificaciones/sin-leer/${ID.medico}`);
const marcaDe = async (page, testInfo, mensaje) => (await leerNotificaciones(page, testInfo)).find((n) => n.texto === mensaje)?.marca;

/** El contador de no leídas como lo muestra la presentación: el ítem del menú (desktop) o el ícono del encabezado del inicio (móvil). */
async function contadorInicio(page, testInfo) {
  if (esDesktop(testInfo)) return (await itemMenu(page, 'Notificaciones').textContent()).replace('Notificaciones', '').trim() || '0';
  return ((await page.locator(`button:has(${ICONO_BANDEJA})`).first().locator('span').allTextContents())[0] ?? '0').trim() || '0';
}

/** El encabezado de la bandeja abierta: «N sin leer · …» o «Todo al día…» (desktop), o el subtítulo «N sin leer» / «Todo al día» (móvil). */
const encabezadoBandeja = (page, testInfo) => (esDesktop(testInfo) ? page.locator('.sgt-d-encabezado__subtitulo') : page.locator('.top-header__subtitle'));

testMuta('HU-NOT-02 · criterio 1: «Marcar leída» la pasa a «Leída» y baja el contador', async ({ page, request, muta }, testInfo) => {
  test.skip(true, 'C-09: bandeja oculta para la entrega (19 oct)');
  const { sol, mensaje, id } = await notificacionNueva(request, muta, 'HU-NOT-02 · criterio 1');
  const antes = await sinLeer(request);
  expect(antes, 'la notificación creada está sin leer').toBeGreaterThanOrEqual(1);

  await entrar(page, 'medico');
  expect(await contadorInicio(page, testInfo), 'contador antes de marcar').toBe(String(antes));
  await abrirBandeja(page, testInfo);
  expect(await marcaDe(page, testInfo, mensaje)).toBe('Nueva');
  await expect(encabezadoBandeja(page, testInfo)).toHaveText(new RegExp(`^${antes} sin leer`));

  const fila = notificacionEnBandeja(page, testInfo, mensaje);
  const r = await pulsarYEsperar(page, fila.getByRole('button', { name: 'Marcar leída' }), /\/api\/v2\/notificaciones\/\d+\/leer$/);
  expect(r.status, 'PUT /leer').toBe(200);
  await expect.poll(() => marcaDe(page, testInfo, mensaje), { message: 'la marca pasa a «Leída»' }).toBe('Leída');
  await expect(fila.getByRole('button', { name: 'Marcar leída' })).toHaveCount(0);
  const despues = antes - 1;
  await expect(encabezadoBandeja(page, testInfo)).toHaveText(despues > 0 ? new RegExp(`^${despues} sin leer`) : /^Todo al día/);
  if (esDesktop(testInfo)) await expect(itemMenu(page, 'Notificaciones')).toHaveAccessibleName(despues > 0 ? `Notificaciones ${despues}` : 'Notificaciones');
  else await expect(page.getByText(`${despues} sin leer`, { exact: true }).last()).toBeVisible();
  expect(await sinLeer(request), 'contador del backend').toBe(despues);
  expect((await apiComo(request, 'medico', `/notificaciones/${id}`)).estado).toBe('LEIDO');

  expect((await muta.api('medico', 'DELETE', `/notificaciones/${id}`)).status, 'deshacer: eliminarla').toBe(200);
  expect((await muta.cancelar('medico', sol.idSolicitud)).status, 'deshacer').toBe(200);
});

testMuta('HU-NOT-02 · criterio 2: «Eliminar» la quita de la lista; queda ELIMINADO y no vuelve al refrescar', async ({ page, request, muta }, testInfo) => {
  test.skip(true, 'C-09: bandeja oculta para la entrega (19 oct)');
  const { sol, mensaje, id } = await notificacionNueva(request, muta, 'HU-NOT-02 · criterio 2');
  await entrar(page, 'medico');
  await abrirBandeja(page, testInfo);
  const fila = notificacionEnBandeja(page, testInfo, mensaje);
  await expect(fila).toHaveCount(1);
  const r = await pulsarYEsperar(page, fila.getByRole('button', { name: /^Eliminar/ }), /\/api\/v2\/notificaciones\/\d+$/);
  expect(r.status, 'DELETE /notificaciones/{id}').toBe(200);
  await expect(page.getByText(mensaje, { exact: true }), 'ya no está en la lista').toHaveCount(0);

  await page.reload();
  await esperarQuieta(page);
  if ((await vistaActual(page)) !== 'notifications') await abrirBandeja(page, testInfo);
  await expect(encabezadoBandeja(page, testInfo)).toBeVisible();
  await expect(page.getByText(mensaje, { exact: true }), 'no vuelve al refrescar').toHaveCount(0);
  expect((await apiComo(request, 'medico', `/notificaciones/${id}`)).estado).toBe('ELIMINADO');
  expect((await apiComo(request, 'medico', `/notificaciones/usuario/${ID.medico}`)).map((n) => n.idNotificacion), 'la bandeja del backend no la trae').not.toContain(id);

  expect((await muta.cancelar('medico', sol.idSolicitud)).status, 'deshacer').toBe(200);
});
