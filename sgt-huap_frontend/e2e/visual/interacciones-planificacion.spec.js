// Interacciones del grupo PLANIFICACIÓN Y ROTATIVAS (R18): molde de
// planificación (Planificacion.jsx) y rotativas (PlantillasView.jsx).
//
// pantallas.spec.js fotografía cada vista recién abierta (el molde vacío y la
// lista de rotativas); esta prueba fija los estados INTERNOS que esa foto no
// cubre: moldes guardados, molde "Rotativa 2026" cargado, asignación de un
// funcionario, detalle de un día del ciclo, agregar rotativa, vigencias,
// eliminar turnos, el asistente "Generar planificación" con su confirmación, y
// en rotativas el editor de la secuencia, el día, el pincel, la nueva rotativa
// y la eliminación. Corre en los tres proyectos (movil, desktop, desktop-fhd).
//
// SOLO LECTURA: todo panel o diálogo que se abre se cancela. Cargar un molde es
// un GET y queda solo en la memoria de la pantalla; el pre-chequeo de
// conflictos de "Generar" es un POST que no crea nada (PlanificacionController
// /{id}/conflictos). Una guarda de red aborta cualquier otra escritura a la API.
// También falla si el navegador registra errores en la consola o excepciones
// no capturadas durante el recorrido.
//
//   PW_CHROMIUM_PATH=/usr/bin/chromium npx playwright test e2e/visual/interacciones-planificacion.spec.js --project=movil
import { test, expect } from '@playwright/test';
import { iniciarSesion, irAVista, esperarQuieta } from '../helpers/sesion.js';

const HOY = process.env.SGT_HOY || '2026-10-16T12:00:00-03:00';

let errores = [];
let escriturasBloqueadas = [];

const esDesktop = (testInfo) => testInfo.project.name !== 'movil';

// Escrituras permitidas: el login y el pre-chequeo de conflictos (no crea nada).
const permitida = (req) => req.method() === 'GET'
  || /\/funcionarios\/login/.test(req.url())
  || (req.method() === 'POST' && /\/planificaciones\/\d+\/conflictos$/.test(req.url()));

test.beforeEach(async ({ page }) => {
  errores = [];
  escriturasBloqueadas = [];
  await page.clock.setFixedTime(new Date(HOY));
  page.on('console', (msg) => { if (msg.type() === 'error') errores.push(msg.text()); });
  page.on('pageerror', (err) => errores.push(`pageerror: ${err.message}`));
  await page.route('**/api/v2/**', (route) => {
    const req = route.request();
    if (permitida(req)) return route.fallback();
    escriturasBloqueadas.push(`${req.method()} ${req.url()}`);
    return route.abort();
  });
});

test.afterEach(async () => {
  expect(escriturasBloqueadas, 'la prueba intentó escribir en la API').toEqual([]);
  expect(errores, 'errores en la consola del navegador').toEqual([]);
});

const foto = async (page, estado) => {
  await esperarQuieta(page);
  await expect.soft(page, estado).toHaveScreenshot(`planificacion-${estado}.png`);
};

// Cierra el sheet o panel de más arriba: en móvil tocando el fondo oscuro sobre
// el sheet (como una persona); en desktop con Escape (panel lateral).
const cerrarPanel = async (page, desktop) => {
  if (desktop) await page.keyboard.press('Escape');
  else await page.mouse.click(195, 24);
  await esperarQuieta(page);
};

// ── Planificación ────────────────────────────────────────────────────────────
const abrirPlanificacion = async (page) => {
  await iniciarSesion(page, 'admin');
  await irAVista(page, 'planificacion');
  await expect(page.getByText('Cargando datos del servicio…')).toBeHidden();
};

const abrirMoldes = async (page, desktop) => {
  await page.getByRole('button', { name: 'Moldes', exact: true }).click();
  // La lista de moldes se pide al abrir: se espera a que llegue.
  if (desktop) await expect(page.getByText('90 rotativas · 86 asignadas')).toBeVisible();
  else await expect(page.getByRole('button', { name: 'Cargar (1)' })).toBeVisible();
  await esperarQuieta(page);
};

// Carga el molde "Rotativa 2026" de Urgencias (GET; queda en la memoria de la
// pantalla, no se guarda nada) y espera a que se vaya el aviso de carga.
const cargarMolde = async (page, desktop) => {
  await abrirMoldes(page, desktop);
  if (desktop) {
    await page.getByRole('button', { name: 'Cargar molde Rotativa 2026' }).click();
  } else {
    await page.getByRole('button', { name: 'Cargar (1)' }).click();
    await page.getByRole('button', { name: /^Rotativa 2026/ }).click();
  }
  const aviso = page.getByText('Molde "Rotativa 2026" cargado');
  await expect(aviso).toBeVisible();
  await expect(aviso).toBeHidden({ timeout: 10_000 });
  await esperarQuieta(page);
};

// Abre la asignación de una instancia del molde (R1, R27…). En móvil se
// despliega su rotativa en la lista y se toca la flecha de la fila; en desktop
// es una celda de la tabla puesto × rotativa.
const abrirInstancia = async (page, desktop, { label, rotativa }) => {
  if (desktop) {
    await page.getByRole('button', { name: new RegExp(`\\(${label}\\)$`) }).click();
  } else {
    const grupo = page.getByRole('button', { name: new RegExp(`^${rotativa.replace(/[()]/g, '\\$&')}`) });
    await grupo.scrollIntoViewIfNeeded();
    await grupo.click();
    await page.locator(`xpath=//span[normalize-space(.)='${label}']/../../following-sibling::button[1]`).click();
  }
  await esperarQuieta(page);
};

test('planificación: moldes guardados y molde cargado', async ({ page }, testInfo) => {
  const desktop = esDesktop(testInfo);
  await abrirPlanificacion(page);

  await abrirMoldes(page, desktop);
  await foto(page, 'moldes');
  if (!desktop) {
    await page.getByRole('button', { name: 'Cargar (1)' }).click();
    await foto(page, 'moldes-cargar');
    await cerrarPanel(page, desktop);
  } else {
    await cerrarPanel(page, desktop);
  }
  await expect(page.getByText('Moldes de planificación')).toBeHidden();

  await cargarMolde(page, desktop);
  await foto(page, 'molde-cargado');

  if (desktop) {
    // La otra pestaña del molde: el ciclo de semanas con la cobertura por día.
    await page.getByRole('tab', { name: /^Ciclo/ }).click();
    await foto(page, 'molde-ciclo');
  } else {
    // Una rotativa desplegada en la lista del molde.
    const grupo = page.getByRole('button', { name: /^Miercoles Turno \(T I\)/ });
    await grupo.scrollIntoViewIfNeeded();
    await grupo.click();
    await page.getByText('R27', { exact: true }).scrollIntoViewIfNeeded();
    await foto(page, 'molde-rotativa-desplegada');
  }
});

test('planificación: asignar funcionario y detalle de un día', async ({ page }, testInfo) => {
  const desktop = esDesktop(testInfo);
  await abrirPlanificacion(page);
  await cargarMolde(page, desktop);

  // Instancia con funcionario: Lunes Turno (T III) · Coordinador (R1).
  await abrirInstancia(page, desktop, { label: 'R1', rotativa: 'Lunes Turno (T III)' });
  await expect(page.getByText('Asignar a R1', { exact: true })).toBeVisible();
  await foto(page, 'asignar');
  await cerrarPanel(page, desktop);
  await expect(page.getByText('Asignar a R1', { exact: true })).toBeHidden();

  // Instancia vacante: Miercoles Turno (T I) · Urgenciólogo 4 (R27). Asignar
  // sin elegir a nadie muestra la validación (no llega al backend).
  await abrirInstancia(page, desktop, { label: 'R27', rotativa: 'Miercoles Turno (T I)' });
  await expect(page.getByText('Asignar a R27', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Asignar', exact: true }).click();
  await expect(page.getByText('Selecciona un funcionario.')).toBeVisible();
  await foto(page, 'asignar-vacante-error');
  await cerrarPanel(page, desktop);
  await expect(page.getByText('Asignar a R27', { exact: true })).toBeHidden();

  // Detalle de un día del ciclo (semana 1, lunes).
  if (desktop) {
    await page.getByRole('tab', { name: /^Ciclo/ }).click();
    await page.getByRole('button', { name: /^Semana 1 · lunes/ }).click();
  } else {
    await page.getByText('Semana 1', { exact: true }).locator('xpath=following-sibling::div[1]/div[1]').click();
  }
  await expect(page.getByText('Semana 1 · Lunes', { exact: true })).toBeVisible();
  await foto(page, 'detalle-dia');
  await cerrarPanel(page, desktop);
  await expect(page.getByText('Semana 1 · Lunes', { exact: true })).toBeHidden();
});

test('planificación: agregar rotativa (validación)', async ({ page }, testInfo) => {
  const desktop = esDesktop(testInfo);
  await abrirPlanificacion(page);
  await cargarMolde(page, desktop);

  await page.getByRole('button', { name: desktop ? 'Agregar rotativa' : 'Agregar', exact: true }).click();
  await expect(page.getByText('Agregar rotativa', { exact: true }).last()).toBeVisible();
  await foto(page, 'agregar');
  // Elegir rotativa sin puesto: la validación local lo pide (no se agrega nada).
  await page.getByRole('button', { name: /^Lunes Turno \(T III\)\s*6 semanas/ }).click();
  await page.getByRole('button', { name: 'Agregar al molde' }).click();
  await expect(page.getByText('Selecciona el puesto.')).toBeVisible();
  await page.getByText('Selecciona el puesto.').scrollIntoViewIfNeeded();
  await foto(page, 'agregar-error');
  await cerrarPanel(page, desktop);
  await expect(page.getByText('Selecciona el puesto.')).toBeHidden();
});

test('planificación: vigencias y eliminar turnos, cancelados', async ({ page }, testInfo) => {
  const desktop = esDesktop(testInfo);
  await abrirPlanificacion(page);
  await cargarMolde(page, desktop);

  // Vigencias del servicio (GET de las ejecuciones).
  await page.getByRole('button', { name: desktop ? 'Vigencias' : /^Ver vigencias del servicio/, exact: desktop }).click();
  await expect(page.getByText('Vigencias del servicio', { exact: true })).toBeVisible();
  await expect(page.getByText('Cargando vigencias…')).toBeHidden();
  await foto(page, 'vigencias');
  await page.getByRole('button', { name: 'Eliminar desde fecha', exact: true }).click();
  await foto(page, 'vigencias-acortar');
  await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
  await page.getByRole('button', { name: 'Anular todo', exact: true }).click();
  await expect(page.getByText('¿Anular esta vigencia?')).toBeVisible();
  await foto(page, 'vigencias-anular');
  await page.getByRole('button', { name: 'Cancelar', exact: true }).last().click();
  await expect(page.getByText('¿Anular esta vigencia?')).toBeHidden();
  await cerrarPanel(page, desktop);
  await expect(page.getByText('Vigencias del servicio', { exact: true })).toBeHidden();

  // Eliminar turnos generados (legado): rango y confirmación, cancelada.
  // C-22 (17 oct): el botón se llama igual en móvil y desktop.
  await page.getByRole('button', { name: 'Eliminar turnos generados', exact: true }).click();
  await expect(page.getByText('Eliminar turnos generados', { exact: true }).last()).toBeVisible();
  await foto(page, 'eliminar-turnos');
  await page.locator('input[type="date"]').nth(0).fill('2026-12-01');
  await page.locator('input[type="date"]').nth(1).fill('2026-12-07');
  await page.getByRole('button', { name: 'Eliminar turnos del rango' }).click();
  await expect(page.getByText('¿Eliminar estos turnos?')).toBeVisible();
  await foto(page, 'eliminar-turnos-confirmar');
  await page.getByRole('button', { name: 'Cancelar', exact: true }).last().click();
  await expect(page.getByText('¿Eliminar estos turnos?')).toBeHidden();
  await cerrarPanel(page, desktop);
});

test('planificación: generar (vista previa y confirmación cancelada)', async ({ page }, testInfo) => {
  const desktop = esDesktop(testInfo);
  await abrirPlanificacion(page);
  await cargarMolde(page, desktop);

  await page.getByRole('button', { name: 'Generar planificación' }).click();
  await expect(page.getByText('Generar planificación', { exact: true }).first()).toBeVisible();
  await foto(page, 'generar');

  // Noviembre 2026: el lunes 23 choca con la vigencia activa (hasta el 29 nov),
  // el lunes 30 no. El pre-chequeo de conflictos no crea nada.
  if (desktop) await page.getByRole('button', { name: 'Mes siguiente' }).click();
  else await page.locator('button:has(path[d="M9 18l6-6-6-6"])').click();
  const lunes = (dia) => (desktop
    ? page.getByRole('button', { name: `Lunes ${dia} de noviembre de 2026` })
    : page.getByRole('button', { name: String(dia), exact: true, disabled: false }));

  await lunes(23).click();
  await expect(page.getByText(/quedarán vacantes por conflicto/)).toBeVisible({ timeout: 15_000 });
  await page.getByText(/quedarán vacantes por conflicto/).scrollIntoViewIfNeeded();
  await foto(page, 'generar-conflictos');

  await lunes(30).click();
  await expect(page.getByText('Sin conflictos: todos los turnos se asignarán.')).toBeVisible({ timeout: 15_000 });
  await page.getByText('Sin conflictos: todos los turnos se asignarán.').scrollIntoViewIfNeeded();
  await foto(page, 'generar-sin-conflictos');

  // Reglas de horario: en móvil es una pestaña; en desktop están a la vista.
  if (!desktop) {
    await page.getByRole('button', { name: /^Reglas activas/ }).click();
    await foto(page, 'generar-reglas');
    await page.getByRole('button', { name: 'Calendario', exact: true }).click();
  }

  await page.getByRole('button', { name: 'Confirmar y generar' }).click();
  await expect(page.getByText('¿Generar la planificación?')).toBeVisible();
  await foto(page, 'generar-confirmar');
  await page.getByRole('button', { name: 'Cancelar', exact: true }).last().click();
  await expect(page.getByText('¿Generar la planificación?')).toBeHidden();

  // Volver al molde sin generar.
  await page.getByRole('button', { name: 'Cancelar', exact: true }).first().click();
  await expect(page.getByRole('button', { name: 'Moldes', exact: true })).toBeVisible();
});

// ── Rotativas ────────────────────────────────────────────────────────────────
test('rotativas: editor, día, pincel, nueva y eliminar, cancelados', async ({ page }, testInfo) => {
  const desktop = esDesktop(testInfo);
  await iniciarSesion(page, 'admin');
  await irAVista(page, 'plantillas');
  await expect(page.getByText('Miercoles Turno (T I)').first()).toBeVisible();

  // Solo desktop: otra rotativa en el detalle de la derecha.
  if (desktop) {
    await page.getByRole('option', { name: /^Lunes Turno \(T III\)/ }).click();
    await foto(page, 'rotativas-seleccion');
    await page.getByRole('option', { name: /^Miercoles Turno \(T I\)/ }).click();
  }

  // Eliminar → confirmación → Cancelar.
  if (desktop) await page.getByRole('button', { name: 'Eliminar rotativa Miercoles Turno (T I)' }).click();
  else await page.getByRole('button', { name: 'Eliminar rotativa' }).first().click();
  await expect(page.getByText('¿Eliminar rotativa?')).toBeVisible();
  await foto(page, 'rotativas-eliminar');
  await page.getByRole('button', { name: 'Cancelar', exact: true }).last().click();
  await expect(page.getByText('¿Eliminar rotativa?')).toBeHidden();

  // Editor de la secuencia de la primera rotativa.
  if (desktop) await page.getByRole('button', { name: 'Editar secuencia' }).click();
  else await page.getByRole('button', { name: 'Configurar secuencia' }).first().click();
  await expect(page.getByText('Editar: Miercoles Turno (T I)', { exact: true })).toBeVisible();
  await foto(page, 'rotativas-editor');

  // Un día sin pincel: el panel con todas las opciones del día.
  await page.locator('button[title="Semana 1 — Mié"]').click();
  await expect(page.getByText('Semana 1 · Mié', { exact: true })).toBeVisible();
  await foto(page, 'rotativas-dia');
  await cerrarPanel(page, desktop);
  await expect(page.getByText('Semana 1 · Mié', { exact: true })).toBeHidden();

  // Pincel activo (no se pinta nada).
  if (desktop) {
    await page.getByRole('button', { name: /^Pincel Día/ }).click();
  } else {
    await page.getByText('Pincel rápido — elige un turno y toca los días para aplicarlo')
      .locator('xpath=following-sibling::div[1]').getByRole('button').first().click();
  }
  await expect(page.getByText('Modo pincel: toca los días para aplicar.')).toBeVisible();
  await foto(page, 'rotativas-pincel');

  // Volver sin guardar.
  await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
  await expect(page.getByText('Editar: Miercoles Turno (T I)', { exact: true })).toBeHidden();

  // Nueva rotativa: guardar sin nombre muestra la validación (no llega al backend).
  await page.getByRole('button', { name: desktop ? 'Nueva rotativa' : 'Nueva', exact: true }).click();
  await expect(page.getByText('Nueva rotativa', { exact: true }).first()).toBeVisible();
  await foto(page, 'rotativas-nueva');
  await page.getByRole('button', { name: 'Guardar rotativa' }).click();
  await expect(page.getByText('El nombre es obligatorio.')).toBeVisible();
  await foto(page, 'rotativas-nueva-error');
  await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
  await expect(page.getByText('El nombre es obligatorio.')).toBeHidden();
});
