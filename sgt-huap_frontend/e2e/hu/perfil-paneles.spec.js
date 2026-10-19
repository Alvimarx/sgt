// HU de Mi Perfil (HU-PRF-01), paneles de gestión (HU-PAN-01 a 03), Panel de
// Administración (HU-ADM-01) y Mi dashboard (HU-DSH-01), fase 1 del catálogo
// (§6.2): solo lectura, en móvil y en desktop.
import {
  test, expect, ID, MESES, esMovil, esDesktop, hoyChile, ahoraChile, mesDe, anioDe, diasDelMes, mesRelativo,
  entrar, irA, vistaActual, usuarioSesion, itemMenu, menuLateral, barraInferior, volverMovil, esperarQuieta,
} from '../helpers/hu.js';
import { horasDe, inicioDe } from '../helpers/datos.js';

const HERRAMIENTAS = ['Mi Dashboard', 'Panel de Administración', 'Panel de Jefatura', 'Panel de Subrogante'];

async function abrirPerfil(page, testInfo) {
  if (esDesktop(testInfo)) await itemMenu(page, 'Perfil').click();
  else await barraInferior(page, 'Perfil').click();
  if (esDesktop(testInfo)) await expect(page.getByRole('heading', { name: 'Mi Perfil' })).toBeVisible();
  else await expect(page.getByText('Mi Perfil', { exact: true })).toBeVisible();
}

// Herramientas de Mi Perfil, en el orden en que la app las dibuja.
async function herramientasVisibles(page) {
  const vistas = [];
  for (const h of HERRAMIENTAS) {
    if (await page.getByRole('button', { name: new RegExp(`^${h}\\b`) }).count()) vistas.push(h);
  }
  return vistas;
}

// Título de cada vista de gestión (móvil y desktop dicen lo mismo, salvo el
// calendario). En móvil casi todas usan la cabecera común (TopHeader); el panel
// de subrogante tiene una propia.
const tituloVista = (page, testInfo, titulo) => {
  if (esDesktop(testInfo)) return page.getByRole('heading', { name: titulo, exact: true });
  if (titulo === 'Administración') return page.getByText(titulo, { exact: true });
  return page.locator('.top-header__title', { hasText: new RegExp(`^${titulo}$`) });
};

// ═════════════════════════════════════════════════════════════════════════════
// HU-PRF-01 · Ver mi perfil y mis herramientas
// ═════════════════════════════════════════════════════════════════════════════

const PERFILES = [
  { rol: 'medico', herramientas: ['Mi Dashboard'] },
  { rol: 'jefatura', herramientas: ['Mi Dashboard', 'Panel de Jefatura'] },
  { rol: 'subrogante', herramientas: ['Mi Dashboard', 'Panel de Subrogante'] },
  { rol: 'admin', herramientas: ['Mi Dashboard', 'Panel de Administración', 'Panel de Jefatura'] },
];

for (const { rol } of [...PERFILES, { rol: 'multiservicio' }]) {
  test(`HU-PRF-01 · criterio 1: nombre, servicio activo y rol (${rol})`, async ({ page }, testInfo) => {
    await entrar(page, rol, rol === 'multiservicio' ? { servicio: 'Cirugía' } : {});
    const usuario = await usuarioSesion(page);
    const servicio = await page.evaluate(() => localStorage.getItem('sgt_servicio_activo_nombre'));
    await abrirPerfil(page, testInfo);

    if (esDesktop(testInfo)) {
      const datos = page.getByRole('region', { name: 'Mis datos' });
      await expect(datos.locator('.sgt-dg-perfil__nombre')).toHaveText(usuario.nombreCompleto);
      await expect(datos.getByRole('term').filter({ hasText: 'RUT' }).locator('xpath=following-sibling::dd[1]')).toHaveText(usuario.rutCompleto);
      await expect(datos.getByRole('term').filter({ hasText: 'Servicio activo' }).locator('xpath=following-sibling::dd[1]')).toHaveText(servicio);
      await expect(datos.getByRole('term').filter({ hasText: 'Rol en el servicio' }).locator('xpath=following-sibling::dd[1]')).toHaveText(usuario.rol);
      const misServicios = datos.getByRole('term').filter({ hasText: 'Mis servicios' });
      if (usuario.servicios.length > 1) {
        const chips = misServicios.locator('xpath=following-sibling::dd[1]').locator('.sgt-d-chip');
        await expect(chips).toHaveText(usuario.servicios.map((s) => s.nombreServicio));
      } else {
        await expect(misServicios).toHaveCount(0);
      }
      await expect(page.getByRole('main').getByRole('button', { name: 'Cambiar servicio' })).toBeVisible();
    } else {
      await expect(page.getByRole('heading', { level: 2, name: usuario.nombreCompleto })).toBeVisible();
      await expect(page.locator('h2 + p')).toHaveText(servicio);
      await expect(page.getByText(usuario.rol, { exact: true })).toBeVisible();
    }
  });
}

for (const { rol, herramientas } of PERFILES) {
  test(`HU-PRF-01 · criterio 2: herramientas según el rol (${rol})`, async ({ page }, testInfo) => {
    await entrar(page, rol);
    await abrirPerfil(page, testInfo);
    expect(await herramientasVisibles(page)).toEqual(herramientas);
  });
}

// ═════════════════════════════════════════════════════════════════════════════
// HU-PAN-01 · Centro de Gestión del Servicio (jefatura)
// ═════════════════════════════════════════════════════════════════════════════

const MODULOS_JEFATURA = [
  'Asignación de turnos', 'Asignación de Funcionarios', 'Personal del Servicio', 'Jerarquía de Funcionarios',
  'Evaluar Solicitudes', 'Gestionar Puestos', 'Estadísticas del Servicio', 'Bitácora de Cambios', 'Auditoría de Asistencia',
];
const MODULOS_SUBROGANTE = [
  'Asignación de turnos', 'Evaluar Solicitudes', 'Gestionar Puestos', 'Estadísticas del Servicio',
  'Bitácora de Cambios', 'Auditoría de Asistencia',
];
const MODULOS_SOLO_ADMIN = ['Crear tipo de Turno', 'Crear Rotativa', 'Crear Planificación Mensual', 'Reglas de Horario del Servicio'];
const TITULO_MODULO = {
  'Asignación de turnos': null, // el calendario en modo asignación, ver abajo
  'Asignación de Funcionarios': 'Asignación de Funcionarios',
  'Personal del Servicio': 'Personal del Servicio',
  'Jerarquía de Funcionarios': 'Jerarquía de Funcionarios',
  'Evaluar Solicitudes': 'Solicitudes',
  'Gestionar Puestos': 'Puestos del Servicio',
  'Estadísticas del Servicio': 'Estadísticas del Servicio',
  'Bitácora de Cambios': 'Bitácora de Cambios',
  'Auditoría de Asistencia': 'Auditoría de Asistencia',
};
// Tarjeta de módulo del panel; no los ítems del menú lateral desktop, que se
// llaman parecido.
const tarjetaModulo = (page, titulo) => page.getByRole('button', { name: new RegExp(`^${titulo}\\b`) })
  .and(page.locator(':not(.sgt-desktop__item)'));

async function abrirPanel(page, testInfo, nombrePanel) {
  await abrirPerfil(page, testInfo);
  await page.getByRole('button', { name: new RegExp(`^${nombrePanel}`) }).click();
}

async function modulosVisibles(page, candidatos) {
  const vistos = [];
  for (const m of candidatos) if (await tarjetaModulo(page, m).count()) vistos.push(m);
  return vistos;
}

for (const rol of ['jefatura', 'admin']) {
  test(`HU-PAN-01 · criterio 1: el panel de jefatura muestra sus 9 módulos (${rol})`, async ({ page }, testInfo) => {
    await entrar(page, rol);
    await abrirPanel(page, testInfo, 'Panel de Jefatura');
    await expect(tituloVista(page, testInfo, 'Centro de Gestión del Servicio')).toBeVisible();
    for (const m of MODULOS_JEFATURA) await expect(tarjetaModulo(page, m), m).toBeVisible();
    expect(await modulosVisibles(page, [...MODULOS_JEFATURA, ...MODULOS_SOLO_ADMIN])).toEqual(MODULOS_JEFATURA);
  });
}

test('HU-PAN-01 · criterio 2: el panel de jefatura no tiene los módulos del administrador', async ({ page }, testInfo) => {
  await entrar(page, 'jefatura');
  await abrirPanel(page, testInfo, 'Panel de Jefatura');
  await expect(tituloVista(page, testInfo, 'Centro de Gestión del Servicio')).toBeVisible();
  for (const m of MODULOS_SOLO_ADMIN) await expect(tarjetaModulo(page, m), m).toHaveCount(0);
});

test('HU-PAN-01 · criterio 3: cada módulo abre su vista y se vuelve al panel; el panel vuelve a Mi Perfil', async ({ page }, testInfo) => {
  await entrar(page, 'jefatura');
  await abrirPanel(page, testInfo, 'Panel de Jefatura');
  const panel = tituloVista(page, testInfo, 'Centro de Gestión del Servicio');
  await expect(panel).toBeVisible();
  const hoy = hoyChile();

  for (const modulo of MODULOS_JEFATURA) {
    await tarjetaModulo(page, modulo).click();
    const titulo = TITULO_MODULO[modulo];
    if (titulo) await expect(tituloVista(page, testInfo, titulo), modulo).toBeVisible();
    else {
      const asignacion = `Asignación de turnos · ${MESES[mesDe(hoy) - 1]} ${anioDe(hoy)}`;
      if (esDesktop(testInfo)) await expect(page.getByRole('heading', { name: asignacion })).toBeVisible();
      else await expect(page.getByText(asignacion, { exact: true })).toBeVisible();
    }
    if (esDesktop(testInfo)) {
      // En desktop las vistas de gestión son raíz del menú y no tienen volver
      // (docs/desktop/GUIA-DESKTOP.md, «Volver»): se vuelve al panel por Mi Perfil.
      await abrirPanel(page, testInfo, 'Panel de Jefatura');
    } else {
      await (titulo ? volverMovil(page) : page.getByRole('button', { name: 'Volver', exact: true })).click();
    }
    await expect(panel, `volver desde ${modulo}`).toBeVisible();
  }

  if (esDesktop(testInfo)) await page.getByRole('button', { name: 'Volver a Mi Perfil' }).click();
  else await volverMovil(page).click();
  if (esDesktop(testInfo)) await expect(page.getByRole('heading', { name: 'Mi Perfil' })).toBeVisible();
  else await expect(page.getByText('Mi Perfil', { exact: true })).toBeVisible();
});

// ═════════════════════════════════════════════════════════════════════════════
// HU-PAN-02 · Panel de subrogante
// ═════════════════════════════════════════════════════════════════════════════

test('HU-PAN-02 · criterio 1: el panel de subrogante muestra sus 6 módulos', async ({ page }, testInfo) => {
  await entrar(page, 'subrogante');
  await abrirPanel(page, testInfo, 'Panel de Subrogante');
  await expect(tituloVista(page, testInfo, 'Administración')).toBeVisible();
  for (const m of MODULOS_SUBROGANTE) await expect(tarjetaModulo(page, m), m).toBeVisible();
  expect(await modulosVisibles(page, [...MODULOS_JEFATURA, ...MODULOS_SOLO_ADMIN])).toEqual(MODULOS_SUBROGANTE);
});

test('HU-PAN-02 · criterio 2: sin personal, asignación de funcionarios ni jerarquía (panel y menú)', async ({ page }, testInfo) => {
  await entrar(page, 'subrogante');
  if (esDesktop(testInfo)) {
    for (const item of ['Personal del servicio', 'Asignación de funcionarios', 'Jerarquía del servicio']) {
      await expect(itemMenu(page, item), `menú: ${item}`).toHaveCount(0);
    }
  }
  await abrirPanel(page, testInfo, 'Panel de Subrogante');
  await expect(tituloVista(page, testInfo, 'Administración')).toBeVisible();
  for (const m of ['Asignación de Funcionarios', 'Personal del Servicio', 'Jerarquía de Funcionarios']) {
    await expect(tarjetaModulo(page, m), m).toHaveCount(0);
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// HU-PAN-03 · El médico no ve paneles de gestión
// ═════════════════════════════════════════════════════════════════════════════

test('HU-PAN-03 · criterio 1: Mi Perfil del médico muestra solo «Mi Dashboard»', async ({ page }, testInfo) => {
  await entrar(page, 'medico');
  await abrirPerfil(page, testInfo);
  expect(await herramientasVisibles(page)).toEqual(['Mi Dashboard']);
});

test('HU-PAN-03 · criterio 2: el menú desktop del médico tiene solo Turnos y Mi cuenta (5 ítems, sin «Notificaciones»)', async ({ page }, testInfo) => {
  test.skip(esMovil(testInfo), 'El menú lateral existe solo en desktop.');
  await entrar(page, 'medico');
  const nav = menuLateral(page).getByRole('navigation');
  await expect(nav.locator('.sgt-desktop__grupo')).toHaveText(['Turnos', 'Mi cuenta']);
  // C-09 (19 oct): la bandeja está oculta para la entrega, así que el menú no trae «Notificaciones».
  await expect(nav.getByRole('button')).toHaveText([/^Centro de turnos/, /^Calendario/, /^Solicitudes/, /^Mi dashboard/, /^Perfil/]);
});

test('HU-PAN-03 · criterio 3: forzar «jefatura», «admin» o «puestos» lleva al inicio', async ({ page }) => {
  await entrar(page, 'medico');
  for (const vista of ['jefatura', 'admin', 'puestos']) {
    await irA(page, vista);
    expect(await vistaActual(page), vista).toBe('agenda');
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// HU-ADM-01 · Abrir el Panel de Administración
// ═════════════════════════════════════════════════════════════════════════════

const GRUPOS_ADMIN = {
  'Gestión Organizacional': ['Crear Servicio', 'Asignación de Funcionarios', 'Personal del Sistema', 'Jerarquía de Funcionarios', 'Gestionar Puestos'],
  'Gestión de Turnos': ['Asignación de turnos', 'Crear tipo de Turno', 'Crear Rotativa', 'Crear Planificación Mensual', 'Reglas de Horario del Servicio'],
  'Gestión Operacional': ['Evaluar Solicitudes', 'Estadísticas del Servicio'],
  'Control y Auditoría': ['Bitácora de Cambios', 'Auditoría de Asistencia'],
};

test('HU-ADM-01 · criterio 1: 14 módulos en cuatro grupos', async ({ page }, testInfo) => {
  await entrar(page, 'admin');
  await abrirPanel(page, testInfo, 'Panel de Administración');
  await expect(tituloVista(page, testInfo, 'Administración')).toBeVisible();
  const todos = Object.values(GRUPOS_ADMIN).flat();
  expect(todos).toHaveLength(14);

  if (esDesktop(testInfo)) {
    for (const [grupo, modulos] of Object.entries(GRUPOS_ADMIN)) {
      const nav = page.getByRole('navigation', { name: `Módulos de ${grupo}` });
      await expect(page.getByRole('heading', { name: grupo, level: 2 })).toBeVisible();
      await expect(nav.getByRole('button')).toHaveCount(modulos.length);
      for (const m of modulos) await expect(nav.getByRole('button', { name: new RegExp(`^${m}\\b`) }), `${grupo}: ${m}`).toBeVisible();
    }
  } else {
    // Móvil: una sola columna con cada rótulo de grupo seguido de sus
    // tarjetas; se lee en orden (rótulo → «grupo», tarjeta → «·módulo»).
    const lista = await page.evaluate((primerGrupo) => {
      const rotulo = [...document.querySelectorAll('div')].find((d) => d.children.length === 0 && d.textContent.trim() === primerGrupo);
      return [...rotulo.parentElement.children].map((el) => (el.tagName === 'BUTTON'
        ? `·${el.querySelector(':scope > div:nth-child(2) > div').textContent.trim()}`
        : el.textContent.trim()));
    }, Object.keys(GRUPOS_ADMIN)[0]);
    const esperada = Object.entries(GRUPOS_ADMIN).flatMap(([g, ms]) => [g, ...ms.map((m) => `·${m}`)]);
    expect(lista).toEqual(esperada);
  }
});

test('HU-ADM-01 · criterio 2: el panel solo aparece con rol de sistema ADMINISTRADOR', async ({ page }, testInfo) => {
  for (const rol of ['medico', 'jefatura', 'subrogante', 'multiservicio', 'admin']) {
    await entrar(page, rol, rol === 'multiservicio' ? { servicio: 'Cirugía' } : {});
    const { rolSistema } = await usuarioSesion(page);
    await abrirPerfil(page, testInfo);
    await expect(page.getByRole('button', { name: /^Panel de Administración/ }), `${rol} (${rolSistema})`)
      .toHaveCount(rolSistema === 'ADMINISTRADOR' ? 1 : 0);
    if (rolSistema !== 'ADMINISTRADOR') {
      await irA(page, 'admin');
      expect(await vistaActual(page), `${rol}: la vista admin no se restaura`).toBe('agenda');
    }
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// HU-DSH-01 · Ver mi dashboard de horas
// ═════════════════════════════════════════════════════════════════════════════

// S1 = días 1–7, S2 = 8–14… (PeriodoSelector.buildSemanasDelMes).
const semanasDelMes = (anio, mes) => {
  const total = diasDelMes(anio, mes);
  const semanas = [];
  for (let i = 1, k = 1; i <= total; i += 7, k += 1) semanas.push({ clave: `S${k}`, desde: i, hasta: Math.min(i + 6, total) });
  return semanas;
};
const enDias = (t, desde, hasta) => { const d = Number(t.diaInicioTurno.slice(8, 10)); return d >= desde && d <= hasta; };
const MESES_MIN = MESES.map((m) => m.toLowerCase());

async function abrirDashboard(page, testInfo) {
  if (esDesktop(testInfo)) await itemMenu(page, 'Mi dashboard').click();
  else {
    await barraInferior(page, 'Perfil').click();
    await page.getByRole('button', { name: /^Mi Dashboard/ }).click();
  }
  if (esDesktop(testInfo)) await expect(page.getByRole('heading', { name: 'Mi Dashboard' })).toBeVisible();
  else await expect(page.getByText('Mi Dashboard', { exact: true })).toBeVisible();
  await esperarQuieta(page);
}

const etiquetaMes = (page, testInfo) => (esDesktop(testInfo)
  ? page.locator('.sgt-dg-mes__nombre')
  : page.locator('span', { hasText: new RegExp(`^(${MESES_MIN.join('|')}) \\d{4}$`) }).first());
const botonMes = (page, testInfo, sentido) => (esDesktop(testInfo)
  ? page.getByRole('button', { name: sentido < 0 ? 'Mes anterior' : 'Mes siguiente' })
  : page.locator('.sgt-nav-arrow').nth(sentido < 0 ? 0 : 1));
const botonSemana = (page, testInfo, clave) => (esDesktop(testInfo)
  ? page.getByRole('tablist', { name: 'Semana del mes' }).getByRole('tab', { name: new RegExp(`^${clave}\\b`) })
  : page.locator('button.sgt-week-pill', { hasText: new RegExp(`^${clave}`) }));

// KPI por etiqueta: el número grande de cada tarjeta.
async function kpi(page, testInfo, etiqueta) {
  if (esDesktop(testInfo)) {
    return (await page.locator('.sgt-d-kpi', { has: page.locator('.sgt-d-kpi__etiqueta', { hasText: new RegExp(`^${etiqueta}$`) }) })
      .locator('.sgt-d-kpi__valor').textContent()).trim();
  }
  // Tarjeta móvil: [adorno, ícono, valor, etiqueta, detalle].
  return (await page.locator('.kpi-card', { has: page.getByText(etiqueta, { exact: true }) }).locator('> div').nth(2).textContent()).trim();
}

test('HU-DSH-01 · criterio 1: moverse entre meses y elegir una semana', async ({ page }, testInfo) => {
  await entrar(page, 'medico');
  await abrirDashboard(page, testInfo);
  const hoy = hoyChile();
  const texto = (iso) => `${MESES_MIN[mesDe(iso) - 1]} ${anioDe(iso)}`;

  await expect(etiquetaMes(page, testInfo)).toHaveText(texto(hoy));
  await botonMes(page, testInfo, -1).click();
  const anterior = `${mesRelativo(hoy, -1)}-01`;
  await expect(etiquetaMes(page, testInfo)).toHaveText(texto(anterior));
  await botonMes(page, testInfo, +1).click();
  await expect(etiquetaMes(page, testInfo)).toHaveText(texto(hoy));

  const semanas = semanasDelMes(anioDe(hoy), mesDe(hoy));
  for (const s of semanas) await expect(botonSemana(page, testInfo, s.clave), s.clave).toBeVisible();
  await expect(botonSemana(page, testInfo, `S${semanas.length + 1}`)).toHaveCount(0);
  await botonSemana(page, testInfo, 'S3').click();
  if (esDesktop(testInfo)) await expect(botonSemana(page, testInfo, 'S3')).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByText('semana S3', { exact: true })).toBeVisible();
});

test('HU-DSH-01 · criterio 2: turnos, horas, días con y sin turno del período', async ({ page, api }, testInfo) => {
  await entrar(page, 'medico');
  const hoy = hoyChile();
  const [anio, mes] = [anioDe(hoy), mesDe(hoy)];
  const delMes = await api.get(`/turnos/funcionario/${ID.medico}?year=${anio}&month=${mes}`);
  await abrirDashboard(page, testInfo);

  const esperado = (turnos, dias) => {
    const conTurno = new Set(turnos.map((t) => t.diaInicioTurno)).size;
    return {
      Turnos: String(turnos.length),
      // P-01 (17 oct): el KPI se llama «Horas programadas» (antes, «Horas trabajadas»).
      'Horas programadas': `${Math.round(turnos.reduce((a, t) => a + horasDe(t), 0))}h`,
      'Días con turno': String(conTurno),
      'Días sin turno': String(dias - conTurno),
    };
  };
  const leer = async () => Object.fromEntries(await Promise.all(
    ['Turnos', 'Horas programadas', 'Días con turno', 'Días sin turno'].map(async (k) => [k, await kpi(page, testInfo, k)]),
  ));

  await expect.poll(leer, { message: 'mes completo' }).toEqual(esperado(delMes, diasDelMes(anio, mes)));
  const s3 = semanasDelMes(anio, mes)[2];
  await botonSemana(page, testInfo, 'S3').click();
  await expect.poll(leer, { message: 'semana S3' })
    .toEqual(esperado(delMes.filter((t) => enDias(t, s3.desde, s3.hasta)), s3.hasta - s3.desde + 1));
});

test('HU-DSH-01 · criterio 3: carga contra 160 h (mes) o 40 h (semana) y tabla del período en desktop', async ({ page, api }, testInfo) => {
  await entrar(page, 'medico');
  const hoy = hoyChile();
  const [anio, mes] = [anioDe(hoy), mesDe(hoy)];
  const delMes = await api.get(`/turnos/funcionario/${ID.medico}?year=${anio}&month=${mes}`);
  await abrirDashboard(page, testInfo);
  const horasMes = Math.round(delMes.reduce((a, t) => a + horasDe(t), 0));

  await expect(page.getByText(`${horasMes}h / 160h`, { exact: true })).toBeVisible();
  await expect(page.getByText(/Superaste el límite de/)).toHaveCount(horasMes > 160 ? 1 : 0);
  if (esDesktop(testInfo)) {
    const tabla = page.getByRole('table', { name: 'Turnos del período' });
    await expect(tabla.locator('tbody tr')).toHaveCount(delMes.length);
  }
  await botonSemana(page, testInfo, 'S3').click();
  const s3 = semanasDelMes(anio, mes)[2];
  const horasS3 = Math.round(delMes.filter((t) => enDias(t, s3.desde, s3.hasta)).reduce((a, t) => a + horasDe(t), 0));
  await expect(page.getByText(`${horasS3}h / 40h`, { exact: true })).toBeVisible();
  await expect(page.getByText(/Superaste el límite de/)).toHaveCount(horasS3 > 40 ? 1 : 0);
});

test('HU-DSH-01 · criterio 3: aviso «Superaste el límite» al pasar las 40 h de la semana (datos simulados)', async ({ page, api }, testInfo) => {
  await entrar(page, 'medico');
  const hoy = hoyChile();
  const [anio, mes] = [anioDe(hoy), mesDe(hoy)];
  const delMes = await api.get(`/turnos/funcionario/${ID.medico}?year=${anio}&month=${mes}`);
  const s3 = semanasDelMes(anio, mes)[2];
  // Se completa la semana S3 con turnos ficticios de 12 h (copias de uno real)
  // hasta pasar las 40 h. Solo se responde la consulta GET: nada se guarda.
  const base = delMes[0] ?? { nombre: 'Día', nombreTipoTurno: 'Día', nombrePuesto: 'Sin puesto', idFuncionario: ID.medico };
  const dias = [];
  for (let d = s3.desde; d <= s3.hasta; d += 1) dias.push(`${anio}-${String(mes).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
  const libres = dias.filter((d) => !delMes.some((t) => t.diaInicioTurno === d));
  const enS3 = delMes.filter((t) => enDias(t, s3.desde, s3.hasta)).length;
  const extra = libres.slice(0, Math.max(0, 4 - enS3)).map((d, i) => ({
    ...base, id: 990000 + i, diaInicioTurno: d, diaFinalTurno: d, horaInicio: '08:00', horaFin: '20:00',
  }));
  const simulados = [...delMes, ...extra];
  const horasS3 = Math.round(simulados.filter((t) => enDias(t, s3.desde, s3.hasta)).reduce((a, t) => a + horasDe(t), 0));
  expect(horasS3, 'la semana simulada pasa las 40 h').toBeGreaterThan(40);
  await page.route(new RegExp(`/api/v2/turnos/funcionario/${ID.medico}\\?year=${anio}&month=${mes}$`), (route) => route.fulfill({ json: simulados }));

  await abrirDashboard(page, testInfo);
  await botonSemana(page, testInfo, 'S3').click();
  await expect(page.getByText(`${horasS3}h / 40h`, { exact: true })).toBeVisible();
  await expect(page.getByText(/^Superaste el límite de 40 ?h$/)).toBeVisible();
});

test('HU-DSH-01 · criterio 4: «Próximos turnos» lista hasta cinco turnos que aún no empiezan', async ({ page, api }, testInfo) => {
  await entrar(page, 'medico');
  const todos = await api.get(`/turnos/funcionario/${ID.medico}`);
  const ahora = ahoraChile();
  const proximos = todos.filter((t) => inicioDe(t) > ahora).sort((a, b) => inicioDe(a).localeCompare(inicioDe(b))).slice(0, 5);
  await abrirDashboard(page, testInfo);

  const filas = esDesktop(testInfo) ? page.locator('.sgt-dg-proximo') : page.locator('.turno-proximo-item');
  await expect(filas).toHaveCount(proximos.length);
  for (const [i, t] of proximos.entries()) {
    const dia = String(Number(t.diaInicioTurno.slice(8, 10)));
    const horario = `${t.horaInicio.slice(0, 5)} – ${t.horaFin.slice(0, 5)}`;
    await expect(filas.nth(i), `próximo ${i + 1}: ${t.diaInicioTurno}`).toContainText(horario);
    await expect(filas.nth(i).getByText(dia, { exact: true })).toBeVisible();
  }
});
