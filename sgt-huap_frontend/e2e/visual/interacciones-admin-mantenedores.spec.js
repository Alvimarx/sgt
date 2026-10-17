// Estados internos de las vistas del grupo "Mantenedores de administración"
// (R18: servicios, personal del sistema, asignación a servicios, jerarquía de
// funcionarios, tipos de turno y reglas de horario) que la foto base de
// pantallas.spec.js no cubre: formularios de creación y edición, validaciones,
// diálogos de confirmación, búsquedas, filtros, selección de servicio y
// páginas. Planificación y Rotativas están en interacciones-planificacion.spec.js.
//
// Todo se abre y se CANCELA: ninguna prueba crea, guarda, asigna, designa ni
// borra nada en la base (otros agentes y pruebas fotografían la misma base).
// Lo único que llega al backend son lecturas (listas y el impacto de una
// eliminación). Las dos pruebas del final, solo desktop, sí guardan, pero
// interceptan en el navegador toda petición que no sea GET: no llega ninguna
// escritura al backend.
//
// Sirve como regresión visual en los tres proyectos (movil, desktop,
// desktop-fhd): la primera corrida con --update-snapshots fija la referencia y
// las siguientes fallan si un estado cambió. Además falla si el navegador
// registra errores en la consola o excepciones no capturadas.
//
// Las acciones difieren entre el layout móvil y el desktop (otra presentación,
// mismos datos): `enDesktop(testInfo)` elige el camino. Las fotos se llaman
// admin-mant-<vista>-<estado>.png.
import { test as base, expect } from '@playwright/test';
import { iniciarSesion, irAVista, esperarQuieta } from '../helpers/sesion.js';

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

const foto = (page, nombre) => expect.soft(page, nombre).toHaveScreenshot(`admin-mant-${nombre}.png`);

// Espera a que un diálogo de confirmación termine su animación de entrada.
async function esperarDialogo(page, titulo) {
  await expect(page.getByText(titulo, { exact: true })).toBeVisible();
  await page.waitForTimeout(300);
}

// Espera a que un formulario o panel lateral termine de entrar.
const esperarPanel = (page) => page.waitForTimeout(350);

// ── Servicios ────────────────────────────────────────────────────────────────
test('servicios: crear, editar y desactivar cancelados, y paginación', async ({ page }, testInfo) => {
  await iniciarSesion(page, 'admin');
  await irAVista(page, 'servicios');
  const desktop = enDesktop(testInfo);

  // Crear → diálogo de confirmación → Cancelar.
  const nuevo = page.getByPlaceholder('Ej: Urgencias, Pediatría…');
  await nuevo.fill('Servicio de prueba');
  await page.getByRole('button', { name: 'Agregar', exact: true }).click();
  await esperarDialogo(page, '¿Agregar nuevo servicio?');
  await foto(page, 'servicios-crear-confirmar');
  await page.getByRole('button', { name: 'Cancelar' }).click();
  await expect(page.getByText('¿Agregar nuevo servicio?', { exact: true })).toBeHidden();
  await nuevo.fill('');

  // Editar en línea → Escape.
  if (desktop) await page.getByRole('button', { name: 'Editar Medicina Interna' }).click();
  else await page.locator('.sgt-list-row').first().locator('button').first().click();
  await page.waitForTimeout(250);
  await foto(page, 'servicios-editar');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(250);

  // Desactivar → diálogo con las dependencias (solo lectura) → Cancelar.
  if (desktop) await page.getByRole('button', { name: 'Desactivar Medicina Interna' }).click();
  else await page.locator('.sgt-list-row').first().locator('button').nth(1).click();
  await esperarDialogo(page, '¿Desactivar servicio?');
  await expect(page.getByText('Verificando registros asociados…')).toBeHidden();
  await page.waitForTimeout(200);
  await foto(page, 'servicios-desactivar-confirmar');
  await page.getByRole('button', { name: 'Cancelar' }).click();
  await expect(page.getByText('¿Desactivar servicio?', { exact: true })).toBeHidden();

  // Segunda página (en desktop la tabla muestra todos los servicios).
  if (!desktop) {
    await page.getByRole('button', { name: 'Página siguiente' }).click();
    await page.waitForTimeout(250);
    await foto(page, 'servicios-pagina-2');
  }
});

// ── Personal del sistema ─────────────────────────────────────────────────────
test('personal del sistema: búsqueda, filtro por servicio y página', async ({ page }, testInfo) => {
  await iniciarSesion(page, 'admin');
  await irAVista(page, 'funcionarios_sistema');
  const desktop = enDesktop(testInfo);

  const buscador = page.getByPlaceholder('Buscar por nombre, apellidos o RUT...');
  await buscador.fill('Gal');
  await page.waitForTimeout(250);
  await foto(page, 'personal-sistema-busqueda');
  await buscador.fill('zzzz');
  await page.waitForTimeout(250);
  await foto(page, 'personal-sistema-sin-resultados');
  await buscador.fill('');

  // Filtro por servicio: recarga el personal de ese servicio.
  await page.locator('select').first().selectOption({ label: 'Cirugía' });
  await esperarQuieta(page);
  await page.waitForTimeout(250);
  await foto(page, 'personal-sistema-cirugia');

  // Segunda página (móvil: de a 10; desktop: de a 50).
  await page.locator('select').first().selectOption({ label: 'Todos los Servicios (Global)' });
  await esperarQuieta(page);
  await page.getByRole('button', { name: desktop ? 'Siguiente' : 'Página siguiente', exact: true }).click();
  await page.waitForTimeout(250);
  await foto(page, 'personal-sistema-pagina-2');
});

// ── Asignación a servicios ───────────────────────────────────────────────────
test('asignación a servicios: búsqueda, selección y confirmación cancelada', async ({ page }, testInfo) => {
  await iniciarSesion(page, 'admin');
  await irAVista(page, 'asignacion');
  const desktop = enDesktop(testInfo);

  const buscador = page.getByPlaceholder('Nombre o RUT del funcionario');
  await buscador.fill('G');
  await page.waitForTimeout(250);
  await foto(page, 'asignacion-minimo');
  await buscador.fill('Gal');
  await expect(page.getByText('Valery Gallardo')).toBeVisible();
  await page.waitForTimeout(250);
  await foto(page, 'asignacion-resultados');

  // Solo desktop: la lista se recorre con las flechas del teclado.
  if (desktop) {
    await buscador.press('ArrowDown');
    await buscador.press('ArrowDown');
    await page.waitForTimeout(150);
    await foto(page, 'asignacion-teclado');
  }

  await page.locator('#lista-funcionarios').getByRole('option', { name: /Mario Galarce/ }).click();
  await page.locator('#select-servicio').selectOption({ label: 'Urgencias' });
  await page.waitForTimeout(250);
  await foto(page, 'asignacion-seleccionado');
  await page.getByRole('button', { name: 'Guardar asignación' }).click();
  await esperarDialogo(page, 'Confirmar asignación');
  await foto(page, 'asignacion-confirmar');
  await page.getByRole('button', { name: 'Cancelar' }).click();
  await expect(page.getByText('Confirmar asignación', { exact: true })).toBeHidden();
});

// ── Jerarquía de funcionarios ────────────────────────────────────────────────
test('jerarquía de funcionarios: servicio, búsqueda, nivel y confirmación cancelada', async ({ page }, testInfo) => {
  await iniciarSesion(page, 'admin');
  await irAVista(page, 'jerarquia');
  const desktop = enDesktop(testInfo);

  await page.locator('#select-servicio').selectOption({ label: 'Cirugía' });
  await page.waitForTimeout(250);
  await foto(page, 'jerarquia-servicio');

  const buscador = page.getByPlaceholder('Nombre o RUT del funcionario');
  await buscador.fill('Gal');
  const lista = page.locator('#lista-funcionarios');
  await expect(lista.getByRole('option').first()).toBeVisible();
  await page.waitForTimeout(250);
  await foto(page, 'jerarquia-resultados');
  await lista.getByRole('option', { name: /Joaquin Galvez/ }).click();
  // Nivel: dos botones en móvil; opciones excluyentes (radio) en desktop.
  if (desktop) await page.getByRole('radio', { name: /^Subrogante/ }).click();
  else await page.getByRole('button', { name: 'Subrogante', exact: true }).click();
  await page.waitForTimeout(300);
  await foto(page, 'jerarquia-seleccionado');
  await page.getByRole('button', { name: 'Designar Autoridad' }).click();
  await esperarDialogo(page, 'Confirmar jerarquía');
  await foto(page, 'jerarquia-confirmar');
  await page.getByRole('button', { name: 'Cancelar' }).click();
  await expect(page.getByText('Confirmar jerarquía', { exact: true })).toBeHidden();
});

// ── Tipos de turno ───────────────────────────────────────────────────────────
test('tipos de turno: nuevo con validación, editar y eliminar cancelados', async ({ page }, testInfo) => {
  await iniciarSesion(page, 'admin');
  await irAVista(page, 'tipos_turno');
  const desktop = enDesktop(testInfo);

  // Nuevo → validación (sin nombre) → Cancelar.
  await page.getByRole('button', { name: /^Nuevo/ }).click();
  await expect(page.getByText('Nuevo tipo de turno', { exact: true }).last()).toBeVisible();
  await esperarPanel(page);
  await foto(page, 'tipos-turno-nuevo');
  await page.getByRole('button', { name: 'Guardar', exact: true }).click();
  await expect(page.getByText('El nombre es obligatorio.')).toBeVisible();
  await page.waitForTimeout(200);
  await foto(page, 'tipos-turno-validacion');
  await page.getByRole('button', { name: 'Cancelar' }).click();
  await expect(page.getByText('El nombre es obligatorio.')).toBeHidden();

  // Editar el primero → Cancelar.
  if (desktop) await page.getByRole('button', { name: 'Editar Día' }).click();
  else await page.getByRole('button', { name: 'Editar' }).first().click();
  await expect(page.getByText('Editar tipo de turno', { exact: true }).last()).toBeVisible();
  await esperarPanel(page);
  await foto(page, 'tipos-turno-editar');
  await page.getByRole('button', { name: 'Cancelar' }).click();
  await expect(page.getByText('Editar tipo de turno', { exact: true })).toHaveCount(0);

  // Eliminar → diálogo con las rotativas afectadas (solo lectura) → Cancelar.
  if (desktop) await page.getByRole('button', { name: 'Eliminar Día' }).click();
  else await page.getByRole('button', { name: 'Eliminar' }).first().click();
  await esperarDialogo(page, '¿Eliminar tipo de turno?');
  await expect(page.getByText('Verificando uso en rotativas…')).toBeHidden();
  await page.waitForTimeout(200);
  await foto(page, 'tipos-turno-eliminar');
  await page.getByRole('button', { name: 'Cancelar' }).click();
  await expect(page.getByText('¿Eliminar tipo de turno?', { exact: true })).toBeHidden();
});

// ── Reglas de horario (administrador) ────────────────────────────────────────
test('reglas: nueva con validación, editar y eliminar cancelados', async ({ page }, testInfo) => {
  await iniciarSesion(page, 'admin');
  await irAVista(page, 'reglas', { returns: { reglas: 'admin' } });
  const desktop = enDesktop(testInfo);

  // Nueva → horas fuera de rango → Cancelar.
  await page.getByRole('button', { name: 'Nueva regla' }).click();
  await esperarPanel(page);
  await foto(page, 'reglas-nueva');
  await page.getByRole('spinbutton').fill('9');
  await expect(page.getByText(/El ajuste debe ser un número entero de horas/)).toBeVisible();
  await page.waitForTimeout(200);
  await foto(page, 'reglas-horas-invalidas');
  await page.getByRole('button', { name: 'Cancelar' }).click();
  await expect(page.getByText(/El ajuste debe ser un número entero de horas/)).toBeHidden();

  // Editar la regla existente → Cancelar.
  if (desktop) await page.getByRole('button', { name: 'Editar Regla urgencias' }).click();
  else await page.getByRole('button', { name: 'Editar' }).first().click();
  await expect(page.getByText('Editar regla', { exact: true })).toBeVisible();
  await esperarPanel(page);
  await foto(page, 'reglas-editar');
  await page.getByRole('button', { name: 'Cancelar' }).click();
  await expect(page.getByText('Editar regla', { exact: true })).toBeHidden();

  // Eliminar → diálogo → Cancelar.
  if (desktop) await page.getByRole('button', { name: 'Eliminar Regla urgencias' }).click();
  else await page.getByRole('button', { name: 'Eliminar' }).first().click();
  await esperarDialogo(page, 'Eliminar regla');
  await foto(page, 'reglas-eliminar');
  await page.getByRole('button', { name: 'Cancelar' }).click();
  await expect(page.getByText('Eliminar regla', { exact: true })).toBeHidden();
});

// ── Reglas de horario (jefatura de Urgencias y subrogante de Enfermería) ─────
for (const rol of ['jefatura', 'subrogante']) {
  test(`reglas (${rol}): formulario de nueva regla cancelado`, async ({ page }) => {
    await iniciarSesion(page, rol);
    await irAVista(page, 'reglas');
    await page.getByRole('button', { name: 'Nueva regla' }).click();
    await page.getByPlaceholder('Ej.: Ajuste mañana finde/feriado').fill('Regla de prueba');
    await esperarPanel(page);
    await foto(page, `reglas-${rol}-nueva`);
    await page.getByRole('button', { name: 'Cancelar' }).click();
    // El formulario se cierra (en desktop vuelve el panel de horarios base).
    await expect.poll(() => page.getByPlaceholder('Ej.: Ajuste mañana finde/feriado')
      .evaluateAll((campos) => campos.map((c) => c.value))).not.toContain('Regla de prueba');
  });
}

// ── Después de guardar, con el backend simulado (solo desktop) ───────────────
// Estados que solo aparecen tras guardar. Después de iniciar sesión, toda
// petición que no sea GET (cualquier URL) la responde o la corta el navegador.
const interceptarEscrituras = (page, responder) => page.route('**/*', (route) => (
  route.request().method() === 'GET' ? route.continue() : responder(route)
));

test('tipos de turno: guardado sin conexión, el error se ve dentro del panel', async ({ page, consolaLimpia }, testInfo) => {
  test.skip(!enDesktop(testInfo), 'el panel lateral es del layout desktop');
  await iniciarSesion(page, 'admin');
  await irAVista(page, 'tipos_turno');
  await interceptarEscrituras(page, (route) => route.abort('connectionrefused'));

  await page.getByRole('button', { name: 'Nuevo tipo de turno' }).click();
  await page.getByLabel('Nombre del turno').fill('Turno de prueba');
  await page.getByLabel('Hora inicio').fill('08:00');
  await page.getByLabel('Hora término').fill('20:00');
  await page.getByRole('button', { name: 'Guardar', exact: true }).click();
  // El mensaje queda en la página (tapada por el panel) y dentro del panel.
  await expect(page.locator('.sgt-panel-lateral').getByText('No se pudo conectar con el servidor')).toBeVisible();
  await esperarPanel(page);
  await foto(page, 'tipos-turno-error-guardado');

  // Errores esperados del intento sin conexión: el recurso que no cargó y el
  // aviso de axiosConfig.
  const esperados = [/Failed to load resource/, /No se recibió respuesta del servidor/];
  for (let i = consolaLimpia.length - 1; i >= 0; i -= 1) {
    if (esperados.some((re) => re.test(consolaLimpia[i]))) consolaLimpia.splice(i, 1);
  }
});

test('jerarquía: tras designar, la jerarquía actual avisa que no la incluye', async ({ page }, testInfo) => {
  test.skip(!enDesktop(testInfo), 'la jerarquía actual es del layout desktop');
  await iniciarSesion(page, 'admin');
  await irAVista(page, 'jerarquia');
  let escrituras = 0;
  await interceptarEscrituras(page, (route) => {
    escrituras += 1;
    return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });

  await page.locator('#select-servicio').selectOption({ label: 'Cirugía' });
  await page.getByPlaceholder('Nombre o RUT del funcionario').fill('Gal');
  await page.locator('#lista-funcionarios').getByRole('option', { name: /Joaquin Galvez/ }).click();
  await page.getByRole('radio', { name: /^Subrogante/ }).click();
  await page.getByRole('button', { name: 'Designar Autoridad' }).click();
  await esperarDialogo(page, 'Confirmar jerarquía');
  await page.getByRole('button', { name: 'Confirmar' }).click();
  await expect(page.getByText('Jerarquía designada con éxito.')).toBeVisible();
  expect(escrituras, 'la designación se respondió en el navegador').toBe(1);

  // El formulario se limpia. Se descarta el mensaje (se iría solo a los 5 s):
  // el aviso no depende de él y aparece al volver a elegir el servicio.
  await page.getByRole('button', { name: 'Descartar mensaje' }).click();
  await page.locator('#select-servicio').selectOption({ label: 'Cirugía' });
  await expect(page.getByText(/Muestra la jerarquía como estaba al abrir esta pantalla/)).toBeVisible();
  await page.waitForTimeout(250);
  await foto(page, 'jerarquia-tras-designar');
});
