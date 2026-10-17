// Sesión y navegación para las pruebas e2e.
//
// Los usuarios son los del seed de DESARROLLO (BaseDatosMySQL/desarrollo/):
// personas inventadas, con la clave común de desarrollo. Nunca apuntar estas
// pruebas a una base con datos reales.
import { expect } from '@playwright/test';

export const CLAVE_DEV = process.env.SGT_CLAVE_DEV || 'huap2025';

export const USUARIOS = {
  // ADMINISTRADOR de sistema: entra a cualquier servicio como JEFATURA, así
  // que pasa por la elección de servicio (se usa Urgencias, el de más datos).
  admin: { rut: '11111111-1', servicio: 'Urgencias' },
  // JEFATURA de Urgencias, rol de sistema USUARIO.
  jefatura: { rut: '30000006-6' },
  // SUBROGANTE de Enfermería.
  subrogante: { rut: '12345678-9' },
  // MÉDICO de Urgencias.
  medico: { rut: '30000070-0' },
  // MÉDICO en Medicina Interna y en Cirugía: pasa por la elección de servicio.
  multiservicio: { rut: '11111113-3' },
  // Existe en el hospital (viewPersonal) pero no en el SGT.
  noRegistrado: { rut: '12345687-2' },
};

// Espera a que la pantalla deje de cargar: red quieta, fuentes listas y un
// respiro para el render. La app consulta notificaciones cada cierto tiempo,
// así que "networkidle" puede no llegar nunca: se acota.
export async function esperarQuieta(page) {
  await page.waitForLoadState('networkidle', { timeout: 6_000 }).catch(() => {});
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(350);
}

// Login por la interfaz (paso 1: RUT + clave; paso 2: servicio si tiene
// varios). Deja el JWT en localStorage como lo haría una persona.
export async function iniciarSesion(page, quien, { servicio = USUARIOS[quien].servicio } = {}) {
  const { rut } = USUARIOS[quien];
  await page.goto('/');
  await page.getByPlaceholder('Ej: 12.345.678-9').fill(rut);
  await page.getByPlaceholder('••••••••').fill(CLAVE_DEV);
  await page.locator('button[type="submit"]').click();
  if (servicio) {
    await page.getByRole('button', { name: new RegExp(servicio, 'i') }).click();
  }
  await expect.poll(() => page.evaluate(() => !!localStorage.getItem('jwt_token')), { timeout: 15_000 }).toBe(true);
  // El login y la elección de servicio pasan al home con un temporizador (la
  // animación de éxito). Hasta que la app guarde que está en el home, un
  // irAVista posterior podría ser pisado por ese cambio de vista.
  await expect.poll(
    () => page.evaluate(() => JSON.parse(sessionStorage.getItem('sgt_nav_state') || '{}').view),
    { timeout: 15_000 },
  ).toBe('agenda');
  await esperarQuieta(page);
}

// Salta directo a una vista usando la restauración de navegación (R5): se
// escribe el estado en sessionStorage y se recarga. La whitelist por rol de
// Prop4 sigue aplicando: una vista no permitida cae al home.
export async function irAVista(page, view, { tab = 'home', returns = {} } = {}) {
  await page.evaluate(([v, t, r]) => {
    sessionStorage.setItem('sgt_nav_state', JSON.stringify({ view: v, tab: t, returns: r }));
  }, [view, tab, returns]);
  await page.reload();
  await esperarQuieta(page);
}
