// Interacciones del grupo TURNOS Y SOLICITUDES (R18): calendario, detalle del
// turno, gestión de asignación, solicitudes y notificaciones.
//
// pantallas.spec.js fotografía cada vista recién abierta; esta prueba fija los
// estados INTERNOS que esa foto no cubre (día abierto, detalle del turno,
// asignación con su confirmación, asistente de nueva solicitud y sus pickers,
// pestañas, orden, confirmaciones de ofertas y cancelaciones), por rol y en
// cada tamaño de pantalla (proyectos movil / desktop / desktop-fhd).
//
// SOLO LECTURA: todo panel o diálogo que se abre se cancela, y además una
// guarda de red aborta cualquier escritura a la API (todo lo que no sea GET,
// salvo el login). Los estados que la base de desarrollo no tiene (postulaciones
// agrupadas R10, una solicitud propia pendiente, una propuesta recibida, ofertas
// generales de turnos que no han terminado) se simulan respondiendo esas
// consultas GET con datos ficticios fijos.
//
// También falla si el navegador registra errores en la consola o excepciones
// no capturadas durante el recorrido.
//
//   PW_CHROMIUM_PATH=/usr/bin/chromium npx playwright test e2e/visual/interacciones-turnos.spec.js --project=movil
import { test, expect } from '@playwright/test';
import { iniciarSesion, irAVista, esperarQuieta } from '../helpers/sesion.js';

const HOY = process.env.SGT_HOY || '2026-10-16T12:00:00-03:00';

let errores = [];
let escriturasBloqueadas = [];

const esDesktop = (testInfo) => testInfo.project.name !== 'movil';

test.beforeEach(async ({ page }) => {
  errores = [];
  escriturasBloqueadas = [];
  await page.clock.setFixedTime(new Date(HOY));
  page.on('console', (msg) => { if (msg.type() === 'error') errores.push(msg.text()); });
  page.on('pageerror', (err) => errores.push(`pageerror: ${err.message}`));
  // Guarda de solo lectura: nada de este recorrido puede escribir en la base.
  await page.route('**/api/v2/**', (route) => {
    const req = route.request();
    if (req.method() === 'GET' || /\/funcionarios\/login/.test(req.url())) return route.fallback();
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
  await expect.soft(page, estado).toHaveScreenshot(`turnos-${estado}.png`);
};

// Cierra el panel o sheet de más arriba: en móvil, tocando el fondo oscuro sobre
// el sheet (como una persona); en desktop, con el botón Cerrar del panel lateral.
const cerrarPanel = async (page, desktop) => {
  if (desktop) await page.getByRole('button', { name: 'Cerrar', exact: true }).last().click();
  else await page.mouse.click(195, 24);
  await esperarQuieta(page);
};

// Día del calendario de octubre 2026 (móvil: abre el sheet del día; desktop:
// lo muestra en el panel del día).
const abrirDia = async (page, dia) => {
  await page.getByRole('button', { name: new RegExp(`^${dia} de octubre\\b`, 'i') }).click();
  await esperarQuieta(page);
};

const abrirExportar = async (page) => {
  await page.getByRole('button', { name: /^Exportar/ }).click();
  await esperarQuieta(page);
};

// ── Solicitudes: controles que cambian de forma entre móvil y desktop ─────────
const iconoSliders = 'path[d^="M4 21V14"]';
const iconoMas = 'path[d="M12 5v14M5 12h14"]';

const abrirNuevaSolicitud = async (page, desktop) => {
  if (desktop) await page.getByRole('button', { name: 'Nueva solicitud' }).click();
  else await page.locator(`button:has(${iconoMas})`).first().click();
  await esperarQuieta(page);
};

const elegirPestana = async (page, desktop, nombre) => {
  if (desktop) await page.getByRole('tab', { name: new RegExp(`^${nombre}`) }).click();
  else await page.getByRole('button', { name: new RegExp(`^${nombre}`) }).click();
  await esperarQuieta(page);
};

// Orden: en móvil es un sheet ("Ordenar por"); en desktop, un selector en la barra.
const fotoOrden = async (page, desktop, estado) => {
  if (desktop) {
    await page.getByLabel('Ordenar').selectOption('antigua');
    await foto(page, estado);
    await page.getByLabel('Ordenar').selectOption('reciente');
  } else {
    await page.locator(`button:has(${iconoSliders})`).click();
    await foto(page, estado);
    await page.getByRole('button', { name: /^Más reciente/ }).click();
  }
  await esperarQuieta(page);
};

// ── Datos simulados (solo GET, nada se guarda) ────────────────────────────────
const SERVICIO_URG = { idServicio: 4, nombre: 'Urgencias' };
const turnoFicticio = (idTurno, dia, inicio, fin, puesto, rotativa) => ({
  idTurno, diaInicioTurno: dia, diaFinalTurno: inicio === '20:00:00' ? null : dia, horaInicio: inicio, horaFin: fin,
  servicio: SERVICIO_URG, puesto: { idPuesto: 900 + idTurno % 50, nombre: puesto },
  tipoTurno: { nombre: inicio === '20:00:00' ? 'Noche' : 'Día' }, rotativa: { nombre: rotativa },
});
const persona = (idFuncionario, nombre, apelPat, apelMat = '') => ({ idFuncionario, nombre, apelPat, apelMat });
const PABLO = persona(369, 'Pablo', 'Garrido');

const solicitudesMedicoSimuladas = {
  propias: [
    {
      idSolicitud: 9101, tipoSolicitud: { tipo: 3 }, estado: 'PENDIENTE', fechaCreacion: '2026-10-15T09:40:00',
      funcionario: PABLO, funcionarioReceptor: null, aceptadoReceptor: null,
      turno: turnoFicticio(1518, '2026-10-21', '08:00:00', '20:00:00', 'Médico General 10', 'Miercoles Turno (T I)'),
      turnoReceptor: null, fechaInicioPermiso: null, fechaTerminoPermiso: null,
      motivo: 'Puedo cubrir el diurno del miércoles 21 completo.',
    },
    {
      idSolicitud: 9102, tipoSolicitud: { tipo: 1 }, estado: 'APROBADA', fechaCreacion: '2026-10-02T11:00:00',
      funcionario: PABLO, funcionarioReceptor: null, aceptadoReceptor: null, turno: null, turnoReceptor: null,
      fechaInicioPermiso: '2026-10-09T00:00:00', fechaTerminoPermiso: '2026-10-10T00:00:00',
      motivo: 'Trámite personal impostergable.',
    },
    {
      idSolicitud: 9103, tipoSolicitud: { tipo: 2 }, estado: 'RECHAZADA', fechaCreacion: '2026-09-30T18:20:00',
      funcionario: PABLO, funcionarioReceptor: null, aceptadoReceptor: null,
      turno: turnoFicticio(1272, '2026-10-13', '08:00:00', '20:00:00', 'Médico General 7', 'Volante (T VOL)'),
      turnoReceptor: null, fechaInicioPermiso: null, fechaTerminoPermiso: null,
      motivo: 'Cancelada por el solicitante · motivo original: control médico.',
    },
  ],
  recibidas: [
    {
      idSolicitud: 9104, tipoSolicitud: { tipo: 4 }, estado: 'PENDIENTE', fechaCreacion: '2026-10-14T16:05:00',
      funcionario: persona(312, 'Camila', 'Alegria'), funcionarioReceptor: PABLO, aceptadoReceptor: null,
      turno: turnoFicticio(1290, '2026-10-24', '08:00:00', '20:00:00', 'Médico General 7', 'Volante (T VOL)'),
      turnoReceptor: turnoFicticio(1309, '2026-10-22', '20:00:00', '08:00:00', 'Urgenciólogo 2', 'Miercoles Turno (T I)'),
      fechaInicioPermiso: null, fechaTerminoPermiso: null,
      motivo: 'Me acomoda cambiar el sábado 24 por mi noche del jueves 22.',
    },
  ],
};

const simularSolicitudesMedico = async (page) => {
  await page.route(/\/api\/v2\/solicitudes\/funcionario\/369$/, (route) => route.fulfill({ json: solicitudesMedicoSimuladas.propias }));
  await page.route(/\/api\/v2\/solicitudes\/receptor\/369$/, (route) => route.fulfill({ json: solicitudesMedicoSimuladas.recibidas }));
};

// R10: una segunda y una tercera cobertura sobre el MISMO turno que la de
// Montserrat Cunill (#15, turno 102) para que jefatura vea el grupo.
const simularPostulacionesAgrupadas = async (page) => {
  await page.route(/\/api\/v2\/solicitudes$/, async (route) => {
    const respuesta = await route.fetch();
    const todas = await respuesta.json();
    const base = todas.find((s) => s.idSolicitud === 15);
    if (!base) return route.fulfill({ response: respuesta });
    const postulante = (idSolicitud, quien, creada, motivo) => ({ ...base, idSolicitud, funcionario: quien, fechaCreacion: creada, motivo });
    return route.fulfill({
      response: respuesta,
      json: [
        ...todas,
        postulante(9201, persona(341, 'Joaquin', 'Galvez'), '2026-10-03T08:15:00', 'Tengo el día libre y conozco el puesto.'),
        postulante(9202, persona(353, 'Tania', 'Machado'), '2026-10-04T19:45:00', 'Puedo tomarlo; vengo de libre.'),
      ],
    });
  });
};

// C-16 (17 oct): «Ofertas generales» deja fuera las ofertas de turnos que ya
// terminaron, y las de la base de desarrollo son del lunes 5 oct. Para seguir
// viendo una oferta abierta con postulantes (y la cerrada con su elegido), sus
// turnos se corren al miércoles 28 oct, solo en la respuesta del GET.
const correrTurnoAl28 = (turno) => {
  if (!turno?.diaInicioTurno) return turno;
  const nocturno = Boolean(turno.diaFinalTurno) && turno.diaFinalTurno !== turno.diaInicioTurno;
  const diaFinalTurno = turno.diaFinalTurno ? (nocturno ? '2026-10-29' : '2026-10-28') : turno.diaFinalTurno;
  return { ...turno, diaInicioTurno: '2026-10-28', diaFinalTurno };
};
const simularOfertasVigentes = async (page) => {
  await page.route(new RegExp(`/api/v2/ofertas-generales/servicio/${SERVICIO_URG.idServicio}$`), async (route) => {
    const respuesta = await route.fetch();
    const ofertas = await respuesta.json();
    if (!Array.isArray(ofertas)) return route.fulfill({ response: respuesta });
    return route.fulfill({ response: respuesta, json: ofertas.map((o) => ({ ...o, turno: correrTurnoAl28(o.turno) })) });
  });
};

// ═════════════════════════════════════════════════════════════════════════════
// CALENDARIO
// ═════════════════════════════════════════════════════════════════════════════

test('calendario · médico: día, detalle, cupo libre, intercambio y exportar', async ({ page }, testInfo) => {
  const desktop = esDesktop(testInfo);
  await iniciarSesion(page, 'medico');
  await irAVista(page, 'calendar_view', { tab: 'calendar', returns: { calendar: 'agenda' } });

  // Día con turno propio y cupos libres en el mismo bloque.
  await abrirDia(page, 13);
  await foto(page, 'medico-cal-dia');

  await page.getByRole('button', { name: 'Ver detalle de Pablo Garrido' }).click();
  await foto(page, 'medico-detalle-propio');
  await cerrarPanel(page, desktop);

  await page.getByRole('button', { name: 'Cupo libre: Médico General 10', exact: true }).click();
  await foto(page, 'medico-detalle-libre');
  await cerrarPanel(page, desktop);
  if (!desktop) await cerrarPanel(page, desktop); // sheet del día

  // Intercambio: elegir receptor en un turno ajeno (día sin turno propio)…
  await abrirDia(page, 21);
  await page.getByRole('button', { name: 'Ver detalle de Cristina Rauchfuss' }).click();
  await esperarQuieta(page);
  await page.getByRole('button', { name: /^Jose Molero/ }).click();
  await expect(page.getByText('Receptor: Jose Molero', { exact: true })).toBeHidden({ timeout: 6_000 });
  await foto(page, 'medico-detalle-receptor');
  await cerrarPanel(page, desktop);
  if (!desktop) await cerrarPanel(page, desktop);

  // …y pedir el cambio desde el turno propio: abre el asistente precargado.
  await abrirDia(page, 19);
  await page.getByRole('button', { name: 'Ver detalle de Pablo Garrido' }).click();
  await esperarQuieta(page);
  await page.getByRole('button', { name: /^Solicitar cambio/ }).click();
  await foto(page, 'medico-crear-intercambio-precargado');
  await cerrarPanel(page, desktop);
  await foto(page, 'medico-sol-tras-cancelar');
});

test('calendario · médico: exportar CSV', async ({ page }, testInfo) => {
  const desktop = esDesktop(testInfo);
  await iniciarSesion(page, 'medico');
  await irAVista(page, 'calendar_view', { tab: 'calendar', returns: { calendar: 'agenda' } });
  await abrirExportar(page);
  await foto(page, 'medico-exportar');
  await cerrarPanel(page, desktop);
});

test('calendario · jefatura en asignación: detalle, editar, confirmar, cupo libre y exportar', async ({ page }, testInfo) => {
  const desktop = esDesktop(testInfo);
  await iniciarSesion(page, 'jefatura');
  await irAVista(page, 'calendar_view', { returns: { calendar: 'jefatura' } });

  await abrirDia(page, 14);
  await foto(page, 'jefatura-gestion-dia');

  await page.getByRole('button', { name: 'Ver detalle de Cristina Rauchfuss' }).click();
  await foto(page, 'jefatura-detalle');

  // Editar la asignación de un integrante (desde el detalle).
  await page.getByRole('button', { name: /^Cristina Rauchfuss.*Editar/ }).click();
  await foto(page, 'jefatura-asignar-editar');

  // Elegir a alguien y abrir la confirmación… y cancelarla.
  await page.getByRole('button', { name: /Alejandro Núñez .*· 3/ }).click();
  await page.getByRole('button', { name: 'Reasignar turno' }).click();
  await foto(page, 'jefatura-asignar-confirmar');
  await page.getByRole('button', { name: 'Cancelar', exact: true }).last().click();
  await esperarQuieta(page);
  // Cerrar la gestión con su propio botón Cancelar.
  await page.getByRole('button', { name: 'Cancelar', exact: true }).last().click();
  await esperarQuieta(page);
  if (await page.getByText('Detalle del turno', { exact: true }).isVisible()) await cerrarPanel(page, desktop);

  // Cupo libre → detalle → asignar funcionario.
  await page.getByRole('button', { name: 'Cupo libre: Urgenciólogo 4', exact: true }).click();
  await foto(page, 'jefatura-detalle-libre');
  await page.getByRole('button', { name: /^Asignar funcionario$/ }).click();
  await foto(page, 'jefatura-asignar-libre');
  await page.getByRole('button', { name: 'Cancelar', exact: true }).last().click();
  await esperarQuieta(page);
  if (await page.getByText('Detalle del turno', { exact: true }).isVisible()) await cerrarPanel(page, desktop);
  if (!desktop) await cerrarPanel(page, desktop);

  await abrirExportar(page);
  await foto(page, 'jefatura-exportar');
  await cerrarPanel(page, desktop);
});

test('calendario · subrogante en asignación (Enfermería): día con cupo libre', async ({ page }, testInfo) => {
  const desktop = esDesktop(testInfo);
  await iniciarSesion(page, 'subrogante');
  await irAVista(page, 'calendar_view', { returns: { calendar: 'subrogante' } });
  await abrirDia(page, 21);
  await foto(page, 'subrogante-gestion-dia');
  await page.getByRole('button', { name: /^Cupo libre:/ }).first().click();
  await foto(page, 'subrogante-detalle-libre');
  await cerrarPanel(page, desktop);
});

test('calendario · admin en asignación (Urgencias): noviembre', async ({ page }) => {
  await iniciarSesion(page, 'admin');
  await irAVista(page, 'calendar_view', { returns: { calendar: 'admin' } });
  await page.getByRole('button', { name: 'Mes siguiente' }).first().click();
  await foto(page, 'admin-gestion-noviembre');
});

// ═════════════════════════════════════════════════════════════════════════════
// SOLICITUDES
// ═════════════════════════════════════════════════════════════════════════════

test('solicitudes · médico: pestañas, orden y asistente de nueva solicitud', async ({ page }, testInfo) => {
  const desktop = esDesktop(testInfo);
  // Con ofertas vigentes (simuladas), el médico ve solo la abierta (C-16).
  await simularOfertasVigentes(page);
  await iniciarSesion(page, 'medico');
  await irAVista(page, 'solicitudes', { tab: 'requests' });

  await elegirPestana(page, desktop, 'Recibidas');
  await foto(page, 'medico-sol-recibidas');
  await elegirPestana(page, desktop, 'Ofertas generales');
  await foto(page, 'medico-sol-ofertas');
  await elegirPestana(page, desktop, 'Mis solicitudes');
  await fotoOrden(page, desktop, 'medico-sol-orden');

  // Asistente: paso 1 (tipo).
  await abrirNuevaSolicitud(page, desktop);
  await foto(page, 'medico-crear-paso1');

  // Permiso: formulario y fechas (móvil: selector año → mes → día; desktop:
  // campos de fecha con los mismos límites).
  await page.getByRole('button', { name: /^Permiso/ }).click();
  await foto(page, 'medico-crear-permiso');
  if (desktop) {
    await page.getByLabel('Fecha inicio *').fill('2026-10-20');
  } else {
    await page.getByRole('button', { name: /Seleccionar fecha/ }).first().click();
    await foto(page, 'medico-crear-fecha-anio');
    await page.getByRole('button', { name: '2026', exact: true }).click();
    await foto(page, 'medico-crear-fecha-mes');
    await page.getByRole('button', { name: 'Oct', exact: true }).click();
    await foto(page, 'medico-crear-fecha-dia');
    await page.getByRole('button', { name: '20', exact: true }).click();
  }
  await foto(page, 'medico-crear-permiso-con-fecha');
  await cerrarPanel(page, desktop);

  // Cobertura: lista de turnos disponibles.
  await abrirNuevaSolicitud(page, desktop);
  await page.getByRole('button', { name: /^Cobertura/ }).click();
  await esperarQuieta(page);
  await page.getByRole('button', { name: /Seleccionar turno disponible/ }).click();
  await foto(page, 'medico-crear-cobertura-turnos');
  await cerrarPanel(page, desktop);

  // Intercambio: formulario y lista de funcionarios.
  await abrirNuevaSolicitud(page, desktop);
  await page.getByRole('button', { name: /^Intercambio/ }).click();
  await foto(page, 'medico-crear-intercambio');
  await page.getByRole('button', { name: /Seleccionar funcionario/ }).click();
  await foto(page, 'medico-crear-receptor');
  await cerrarPanel(page, desktop);
});

test('solicitudes · médico con solicitudes (simuladas): propia pendiente, motivo, cancelar y recibida', async ({ page }, testInfo) => {
  const desktop = esDesktop(testInfo);
  await simularSolicitudesMedico(page);
  await iniciarSesion(page, 'medico');
  await irAVista(page, 'solicitudes', { tab: 'requests' });
  await foto(page, 'medico-sol-mis-simuladas');

  if (desktop) await page.getByRole('listbox').getByRole('option', { name: /Cobertura/ }).first().click();
  await page.getByRole('button', { name: /Modificar motivo/ }).click();
  await foto(page, 'medico-sol-modificar-motivo');
  await cerrarPanel(page, desktop);

  await page.getByRole('button', { name: /Cancelar solicitud/ }).first().click();
  await foto(page, 'medico-sol-cancelar');
  await page.getByRole('button', { name: 'Volver', exact: true }).click();
  await esperarQuieta(page);

  await elegirPestana(page, desktop, 'Recibidas');
  await foto(page, 'medico-sol-recibida-pendiente');
});

test('solicitudes · jefatura: historial, ofertas, selección de postulante y orden', async ({ page }, testInfo) => {
  const desktop = esDesktop(testInfo);
  // Con ofertas vigentes (simuladas), la jefatura ve la abierta y la cerrada con
  // su elegido, no la rechazada (C-16).
  await simularOfertasVigentes(page);
  await iniciarSesion(page, 'jefatura');
  await irAVista(page, 'solicitudes', { tab: 'requests' });

  await elegirPestana(page, desktop, 'Historial');
  await foto(page, 'jefatura-sol-historial');
  await elegirPestana(page, desktop, 'Ofertas generales');
  await foto(page, 'jefatura-sol-ofertas');
  if (desktop) await page.getByRole('button', { name: /^Seleccionar a / }).first().click();
  else await page.getByRole('button', { name: 'Seleccionar', exact: true }).first().click();
  await foto(page, 'jefatura-sol-oferta-confirmar');
  await page.getByRole('button', { name: 'Cancelar', exact: true }).last().click();
  await esperarQuieta(page);

  await elegirPestana(page, desktop, 'Pendientes');
  await fotoOrden(page, desktop, 'jefatura-sol-orden');
  await abrirNuevaSolicitud(page, desktop);
  await foto(page, 'jefatura-crear-paso1');
  await cerrarPanel(page, desktop);
});

test('solicitudes · jefatura: postulaciones agrupadas (R10, simuladas)', async ({ page }) => {
  await simularPostulacionesAgrupadas(page);
  await iniciarSesion(page, 'jefatura');
  await irAVista(page, 'solicitudes', { tab: 'requests' });
  await foto(page, 'jefatura-sol-postulaciones');
});

test('solicitudes · admin en Medicina Interna: propuesta recibida y cancelar la propia', async ({ page }, testInfo) => {
  const desktop = esDesktop(testInfo);
  await iniciarSesion(page, 'admin', { servicio: 'Medicina Interna' });
  await irAVista(page, 'solicitudes', { tab: 'requests' });
  await foto(page, 'admin-mi-sol-pendientes');
  if (desktop) await page.getByRole('listbox').getByRole('option', { name: /Permiso/ }).filter({ hasText: 'Admin Bootstrap' }).first().click();
  await page.getByRole('button', { name: /Cancelar solicitud/ }).first().click();
  await foto(page, 'admin-mi-sol-cancelar');
  await page.getByRole('button', { name: 'Volver', exact: true }).click();
  await esperarQuieta(page);
});

test('solicitudes · subrogante (Enfermería): historial y ofertas vacíos', async ({ page }, testInfo) => {
  const desktop = esDesktop(testInfo);
  await iniciarSesion(page, 'subrogante');
  await irAVista(page, 'solicitudes', { tab: 'requests' });
  await elegirPestana(page, desktop, 'Historial');
  await foto(page, 'subrogante-sol-historial');
  await elegirPestana(page, desktop, 'Ofertas generales');
  await foto(page, 'subrogante-sol-ofertas');
});
