// Estados internos de las vistas del grupo "Gestión del servicio, Mi cuenta y
// Entrada" (R18) que la foto base de pantallas.spec.js no cubre: búsquedas,
// desplegables, diálogos de confirmación, paneles de detalle, filtros, páginas
// y errores de validación del login.
//
// Todo se abre y se CANCELA: ninguna prueba crea, aprueba, asigna ni borra
// nada en la base (otros agentes y pruebas fotografían la misma base).
//
// Sirve como regresión visual en los tres proyectos (movil, desktop,
// desktop-fhd): la primera corrida con --update-snapshots fija la referencia y
// las siguientes fallan si un estado cambió. Además falla si el navegador
// registra errores en la consola o excepciones no capturadas.
//
// Las acciones difieren entre el layout móvil y el desktop (otra presentación,
// mismos datos): `enDesktop(testInfo)` elige el camino.
import { test as base, expect } from '@playwright/test';
import { iniciarSesion, irAVista, esperarQuieta, CLAVE_DEV } from '../helpers/sesion.js';

const HOY = process.env.SGT_HOY || '2026-10-16T12:00:00-03:00';
const enDesktop = (testInfo) => testInfo.project.name !== 'movil';

// Cada prueba vigila la consola del navegador: un error o una excepción no
// capturada la hace fallar al terminar.
const test = base.extend({
  consolaLimpia: [async ({ page }, use) => {
    const errores = [];
    page.on('console', (msg) => { if (msg.type() === 'error') errores.push(`console.error: ${msg.text()}`); });
    page.on('pageerror', (err) => errores.push(`pageerror: ${err.message}`));
    await use(errores);
    expect(errores, 'errores en la consola del navegador').toEqual([]);
  }, { auto: true }],
});

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date(HOY));
});

const foto = (page, nombre) => expect.soft(page, nombre).toHaveScreenshot(`gestion-${nombre}.png`);

// Espera a que un diálogo de confirmación termine su animación de entrada.
async function esperarDialogo(page, titulo) {
  await expect(page.getByText(titulo, { exact: true })).toBeVisible();
  await page.waitForTimeout(300);
}

// ── Personal del servicio ────────────────────────────────────────────────────
test('personal del servicio: búsqueda y sin resultados', async ({ page }, testInfo) => {
  await iniciarSesion(page, 'jefatura');
  await irAVista(page, 'funcionarios_servicio_jefatura');
  const buscador = page.getByPlaceholder('Buscar por nombre o RUT...');
  await buscador.fill('Gal');
  await page.waitForTimeout(250);
  await foto(page, 'personal-busqueda');
  await buscador.fill('zzzz');
  await page.waitForTimeout(250);
  await foto(page, 'personal-sin-resultados');

  // Solo desktop: filtro por rol en el servicio.
  if (enDesktop(testInfo)) {
    await buscador.fill('');
    await page.getByRole('tab', { name: /^Jefatura/ }).click();
    await page.waitForTimeout(250);
    await foto(page, 'personal-rol-jefatura');
  }
});

// ── Asignación de funcionarios ───────────────────────────────────────────────
test('asignación de funcionarios: búsqueda, selección y confirmación cancelada', async ({ page }, testInfo) => {
  await iniciarSesion(page, 'jefatura');
  await irAVista(page, 'asignacionJefatura');
  const buscador = page.getByPlaceholder('Nombre o RUT del funcionario...');
  await buscador.fill('G');
  await page.waitForTimeout(250);
  await foto(page, 'asignacion-minimo');
  await buscador.fill('Gal');
  await expect(page.getByText('Valery Gallardo')).toBeVisible();
  await page.waitForTimeout(250);
  await foto(page, 'asignacion-resultados');

  // Solo desktop: la lista se recorre con las flechas del teclado.
  if (enDesktop(testInfo)) {
    await buscador.press('ArrowDown');
    await buscador.press('ArrowDown');
    await page.waitForTimeout(150);
    await foto(page, 'asignacion-teclado');
  }

  await page.getByText('Mario Galarce').click();
  await page.waitForTimeout(250);
  await foto(page, 'asignacion-seleccionado');
  await page.getByRole('button', { name: 'Guardar Asignación' }).click();
  await esperarDialogo(page, 'Confirmar asignación');
  await foto(page, 'asignacion-confirmar');
  await page.getByRole('button', { name: 'Cancelar' }).click();
  await expect(page.getByText('Confirmar asignación', { exact: true })).toBeHidden();
});

// ── Jerarquía del servicio ───────────────────────────────────────────────────
test('jerarquía del servicio: búsqueda, selección y confirmación cancelada', async ({ page }) => {
  await iniciarSesion(page, 'jefatura');
  await irAVista(page, 'jerarquiaJefatura');
  const buscador = page.getByPlaceholder('Nombre o RUT del funcionario');
  await buscador.fill('Gal');
  await expect(page.getByRole('option').first()).toBeVisible();
  await page.waitForTimeout(250);
  await foto(page, 'jerarquia-resultados');
  await page.getByRole('option', { name: /Mario Galarce/ }).click();
  await page.getByRole('button', { name: 'Subrogante', exact: true }).click();
  await page.waitForTimeout(300);
  await foto(page, 'jerarquia-seleccionado');
  await page.getByRole('button', { name: 'Designar Autoridad' }).click();
  await esperarDialogo(page, 'Confirmar jerarquía');
  await foto(page, 'jerarquia-confirmar');
  await page.getByRole('button', { name: 'Cancelar' }).click();
  await expect(page.getByText('Confirmar jerarquía', { exact: true })).toBeHidden();
});

// ── Estadísticas ─────────────────────────────────────────────────────────────
test('estadísticas: detalle de cobertura, filtros, funcionarios y semana', async ({ page }, testInfo) => {
  await iniciarSesion(page, 'jefatura');
  await irAVista(page, 'admin_stats', { returns: { stats: 'jefatura' } });
  const desktop = enDesktop(testInfo);

  // Detalle de cobertura (overlay en móvil, panel lateral en desktop).
  if (desktop) await page.getByRole('button', { name: 'Ver detalle de la cobertura' }).click();
  else await page.getByText('Cobertura de turnos', { exact: true }).click();
  await expect(page.getByText(/\d+ asignados · \d+ vacantes · \d+ totales/)).toBeVisible();
  await esperarQuieta(page);
  await foto(page, 'estadisticas-cobertura');

  if (desktop) {
    const tipo = page.getByLabel('Tipo de turno');
    const segunda = await tipo.locator('option').nth(1).getAttribute('value');
    await tipo.selectOption(segunda);
  } else {
    await page.getByRole('button', { name: /^Filtrar por/ }).click();
    await page.waitForTimeout(250);
    await foto(page, 'estadisticas-cobertura-filtros');
    await page.getByRole('button', { name: /^Tipo de turno/ }).click();
    await page.locator('.sgt-scroll-clean .sgt-scroll-clean > button').nth(1).click();
  }
  await page.waitForTimeout(300);
  await foto(page, 'estadisticas-cobertura-filtrada');

  // Cerrar: Escape en desktop (PanelLateral), clic en el fondo en móvil.
  if (desktop) await page.keyboard.press('Escape');
  else await page.mouse.click(195, 40);
  await expect(page.getByText(/\d+ asignados · \d+ vacantes · \d+ totales/)).toBeHidden();

  // Detalle de funcionarios con turno.
  if (desktop) await page.getByRole('button', { name: 'Ver detalle de funcionarios con turno' }).click();
  else await page.getByText('Funcionarios con turno', { exact: true }).click();
  await expect(page.getByText(/de \d+ funcionarios con turno en este período/)).toBeVisible();
  await esperarQuieta(page);
  await foto(page, 'estadisticas-funcionarios');
  if (desktop) await page.getByRole('button', { name: /turnos? en el período/ }).first().click();
  else await page.getByText(/^\d+ turnos?$/).first().click();
  await page.waitForTimeout(500);
  await foto(page, 'estadisticas-funcionario-expandido');
  if (desktop) await page.keyboard.press('Escape');
  else await page.mouse.click(195, 40);
  await expect(page.getByText(/de \d+ funcionarios con turno en este período/)).toBeHidden();

  // Otra semana del mes.
  await page.getByRole(desktop ? 'tab' : 'button', { name: /^S3/ }).click();
  await esperarQuieta(page);
  await page.waitForTimeout(300);
  await foto(page, 'estadisticas-semana');
});

// ── Puestos ──────────────────────────────────────────────────────────────────
test('puestos: crear, editar y eliminar cancelados, y paginación', async ({ page }, testInfo) => {
  await iniciarSesion(page, 'jefatura');
  await irAVista(page, 'puestos', { returns: { puestos: 'jefatura' } });
  const desktop = enDesktop(testInfo);

  // Crear → diálogo de confirmación → Cancelar.
  await page.getByPlaceholder('Ej: Reanimación, Box 1, Triage…').fill('Box de prueba');
  await page.getByRole('button', { name: 'Agregar' }).click();
  await esperarDialogo(page, '¿Agregar nuevo puesto?');
  await foto(page, 'puestos-crear-confirmar');
  await page.getByRole('button', { name: 'Cancelar' }).click();
  await expect(page.getByText('¿Agregar nuevo puesto?', { exact: true })).toBeHidden();

  // Editar en línea → Escape.
  if (desktop) await page.getByRole('button', { name: 'Editar Coordinador' }).click();
  else await page.locator('.sgt-list-row').first().locator('button').first().click();
  await page.waitForTimeout(250);
  await foto(page, 'puestos-editar');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(250);

  // Eliminar → diálogo con el impacto (solo lectura) → Cancelar.
  if (desktop) await page.getByRole('button', { name: 'Eliminar Coordinador' }).click();
  else await page.locator('.sgt-list-row').first().locator('button').nth(1).click();
  await esperarDialogo(page, '¿Eliminar puesto?');
  await expect(page.getByText('Verificando turnos asociados…')).toBeHidden();
  await foto(page, 'puestos-eliminar-confirmar');
  await page.getByRole('button', { name: 'Cancelar' }).click();
  await expect(page.getByText('¿Eliminar puesto?', { exact: true })).toBeHidden();

  // Segunda página (en desktop la tabla muestra todos los puestos).
  if (!desktop) {
    await page.getByRole('button', { name: 'Página siguiente' }).click();
    await page.waitForTimeout(250);
    await foto(page, 'puestos-pagina-2');
  }
});

// ── Auditoría de asistencia ──────────────────────────────────────────────────
test('auditoría: filtro por estado y otro mes', async ({ page }, testInfo) => {
  await iniciarSesion(page, 'jefatura');
  await irAVista(page, 'auditoria', { returns: { auditoria: 'jefatura' } });

  // Solo desktop: filtro por estado del turno (en el mes actual, que tiene vacantes).
  if (enDesktop(testInfo)) {
    await page.getByRole('tab', { name: /^Vacantes/ }).click();
    await page.waitForTimeout(250);
    await foto(page, 'auditoria-vacantes');
    await page.getByRole('tab', { name: /^Todos/ }).click();
  }

  await page.getByRole(enDesktop(testInfo) ? 'tab' : 'button', { name: /septiembre 2026/i }).click();
  await page.waitForTimeout(300);
  await foto(page, 'auditoria-septiembre');
});

// ── Bitácora ─────────────────────────────────────────────────────────────────
test('bitácora: filtros y detalle de un evento', async ({ page }, testInfo) => {
  await iniciarSesion(page, 'jefatura');
  await irAVista(page, 'bitacora', { returns: { bitacora: 'jefatura' } });
  const desktop = enDesktop(testInfo);

  // Solo desktop: la tabla se pagina de a 50 registros.
  if (desktop) {
    await page.getByRole('button', { name: 'Siguiente', exact: true }).click();
    await page.waitForTimeout(250);
    await foto(page, 'bitacora-pagina-2');
  }

  if (desktop) {
    await page.getByLabel('Categoría').selectOption('SOLICITUDES');
  } else {
    await page.getByRole('button', { name: /^Filtrar/ }).click();
    await page.waitForTimeout(250);
    await foto(page, 'bitacora-filtros');
    await page.getByRole('button', { name: /^Categoría/ }).click();
    await page.getByRole('button', { name: 'Solicitudes', exact: true }).click();
  }
  await page.waitForTimeout(300);
  await foto(page, 'bitacora-filtrada');

  if (desktop) await page.locator('.sgt-d-tabla tbody tr').first().click();
  else await page.locator('.sgt-list-row').first().locator('> div').first().click();
  await page.waitForTimeout(600);
  await foto(page, 'bitacora-detalle');
  if (desktop) await page.keyboard.press('Escape');
});

// ── Mi dashboard ─────────────────────────────────────────────────────────────
test('mi dashboard: semana y mes anterior', async ({ page }, testInfo) => {
  await iniciarSesion(page, 'medico');
  await irAVista(page, 'personal_dashboard');
  const desktop = enDesktop(testInfo);

  await page.getByRole(desktop ? 'tab' : 'button', { name: /^S3/ }).click();
  await page.waitForTimeout(900);
  await foto(page, 'dashboard-semana');

  if (desktop) await page.getByRole('button', { name: 'Mes anterior' }).click();
  else await page.locator('.sgt-nav-arrow').first().click();
  await esperarQuieta(page);
  await page.waitForTimeout(900);
  await foto(page, 'dashboard-mes-anterior');
});

// ── Entrada: validaciones del login (no llegan al backend) ───────────────────
test('login: errores de validación', async ({ page }) => {
  await page.goto('/');
  await esperarQuieta(page);
  await page.locator('button[type="submit"]').click();
  await expect(page.getByText('Ingresa un RUT válido')).toBeVisible();
  await page.waitForTimeout(500);
  await foto(page, 'login-error-rut');

  await page.getByPlaceholder('Ej: 12.345.678-9').fill('30000006-6');
  await page.locator('button[type="submit"]').click();
  await expect(page.getByText('Ingresa tu contraseña')).toBeVisible();
  await page.waitForTimeout(500);
  await foto(page, 'login-error-clave');
});

// ── Entrada: elegir servicio, con la clave de desarrollo ─────────────────────
test('elegir servicio: volver al login con Salir', async ({ page }) => {
  await page.goto('/');
  await page.getByPlaceholder('Ej: 12.345.678-9').fill('11111113-3');
  await page.getByPlaceholder('••••••••').fill(CLAVE_DEV);
  await page.locator('button[type="submit"]').click();
  await expect(page.getByRole('button', { name: /Medicina Interna/ })).toBeVisible();
  await esperarQuieta(page);
  // Las animaciones de entrada (logo y tarjeta, 0,7 s) mueven los elementos:
  // si el hover llega antes, Playwright desplaza la vista para alcanzarlos.
  await page.waitForTimeout(900);
  await page.getByRole('button', { name: /Medicina Interna/ }).hover();
  await page.waitForTimeout(250);
  await foto(page, 'elegir-servicio-hover');
  await page.getByRole('button', { name: 'Salir' }).click();
  await expect(page.getByPlaceholder('Ej: 12.345.678-9')).toBeVisible();
});
