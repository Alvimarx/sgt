// Recorrido visual: una foto de cada pantalla, por rol, en cada tamaño de
// pantalla (proyectos movil / desktop / desktop-fhd de playwright.config.js).
//
// Sirve como prueba de regresión visual: la primera corrida con
// `--update-snapshots` guarda las fotos de referencia en e2e/__pantallas__/
// (fuera de git) y las corridas siguientes fallan si una pantalla cambió.
// Uso típico: fijar la referencia del layout MÓVIL antes de un refactor y
// comprobar después que quedó idéntico.
//
// Las fotos dependen de los datos: correr siempre contra la base de desarrollo
// recién creada (o restaurada desde el mismo respaldo) y con el mismo "hoy"
// (SGT_HOY fija el reloj del navegador).
//
// SGT_VISTAS limita el recorrido a ciertas vistas (nombres separados por coma,
// p. ej. SGT_VISTAS=solicitudes,calendar_view-gestion). "entrada" incluye
// login, elección de servicio y registro pendiente.
import { test, expect } from '@playwright/test';
import { iniciarSesion, irAVista, esperarQuieta } from '../helpers/sesion.js';

const HOY = process.env.SGT_HOY || '2026-10-16T12:00:00-03:00';
const FILTRO = (process.env.SGT_VISTAS || '').split(',').map((v) => v.trim()).filter(Boolean);
const incluida = (nombre) => FILTRO.length === 0 || FILTRO.includes(nombre);

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date(HOY));
});

// Vistas de Prop4 (currentView) por rol. `returns` reproduce desde dónde se
// llegó cuando la vista cambia según el origen (calendario en modo gestión).
const COMUNES = ['agenda', 'calendar_view', 'perfil', 'personal_dashboard', 'notifications', 'solicitudes', 'bitacora'];
const GESTION = ['admin_stats', 'puestos', 'auditoria', 'reglas'];

const RECORRIDO = {
  medico: [...COMUNES],
  jefatura: [
    ...COMUNES,
    'jefatura', 'funcionarios_servicio_jefatura', 'asignacionJefatura', 'jerarquiaJefatura',
    ...GESTION,
    { view: 'calendar_view', nombre: 'calendar_view-gestion', returns: { calendar: 'jefatura' } },
  ],
  subrogante: [
    ...COMUNES,
    'subrogante',
    ...GESTION,
    { view: 'calendar_view', nombre: 'calendar_view-gestion', returns: { calendar: 'subrogante' } },
  ],
  admin: [
    ...COMUNES,
    'admin', 'funcionarios_sistema', 'planificacion', 'servicios', 'asignacion', 'jerarquia', 'tipos_turno', 'plantillas',
    ...GESTION,
    { view: 'calendar_view', nombre: 'calendar_view-gestion', returns: { calendar: 'admin' } },
  ],
};

for (const [rol, vistas] of Object.entries(RECORRIDO)) {
  const items = vistas
    .map((item) => (typeof item === 'string' ? { view: item } : item))
    .map((item) => ({ ...item, nombre: item.nombre || item.view }))
    .filter((item) => incluida(item.nombre));
  if (items.length === 0) continue;
  test(`pantallas de ${rol}`, async ({ page }) => {
    await iniciarSesion(page, rol);
    for (const { view, nombre, returns } of items) {
      await irAVista(page, view, { returns });
      await expect.soft(page, `${rol} · ${nombre}`).toHaveScreenshot(`${rol}-${nombre}.png`);
    }
  });
}

test('pantallas de entrada', async ({ page }) => {
  test.skip(!incluida('entrada'), 'fuera de SGT_VISTAS');
  await page.goto('/');
  await esperarQuieta(page);
  await expect.soft(page).toHaveScreenshot('entrada-login.png');

  // Usuario con dos servicios: se detiene en la elección de servicio.
  await page.getByPlaceholder('Ej: 12.345.678-9').fill('11111113-3');
  await page.getByPlaceholder('••••••••').fill(process.env.SGT_CLAVE_DEV || 'huap2025');
  await page.locator('button[type="submit"]').click();
  // Se espera a que aparezcan los servicios: antes, el login muestra un
  // instante su animación de éxito.
  await page.getByRole('button', { name: /Medicina Interna/i }).waitFor();
  await esperarQuieta(page);
  await expect.soft(page).toHaveScreenshot('entrada-elegir-servicio.png');
});

test('pantalla de registro pendiente', async ({ page }) => {
  test.skip(!incluida('entrada'), 'fuera de SGT_VISTAS');
  await page.goto('/');
  await page.getByPlaceholder('Ej: 12.345.678-9').fill('12345687-2');
  await page.getByPlaceholder('••••••••').fill(process.env.SGT_CLAVE_DEV || 'huap2025');
  await page.locator('button[type="submit"]').click();
  await esperarQuieta(page);
  await expect.soft(page).toHaveScreenshot('entrada-registro-pendiente.png');
});
