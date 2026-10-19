// HU de gestión del servicio y del sistema, fase 1 del catálogo (§6.2), solo
// lectura, en móvil y en desktop:
//  - HU-PER-01 (criterios 1 a 3; el 4 es un negativo por API de la fase 2a);
//  - HU-EST-01, HU-BIT-01 y HU-AUD-01 con la jefatura de Urgencias;
//  - HU-ADM-03 con el administrador;
//  - HU-REG-02: desde C-10 (17 oct) las reglas de horario son del administrador; se guarda que
//    la jefatura y el subrogante no llegan a la vista.
// Lo esperado sale de la API del día. Las ventanas de la bitácora no abren
// ningún evento del seed ligado al funcionario 4 (eventos 3 y 8): solo se abre
// la generación de turnos más reciente o un evento simulado.
import {
  test, expect, fallaConocida, ID, SERVICIO, MESES, esDesktop,
  hoyChile, ahoraChile, mesDe, anioDe, diasDelMes, mesRelativo, tokenRol, apiGet, vistaActual,
  entrar, irA, itemMenu, barraInferior,
  abrirDesdePanel, abrirBitacora, filtrarBitacoraPorEstado,
} from '../helpers/hu.js';
import { nombreResumen, inicioDe } from '../helpers/datos.js';

const MESES_MIN = MESES.map((m) => m.toLowerCase());
const norm = (t) => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const semanasDelMes = (anio, mes) => {
  const total = diasDelMes(anio, mes);
  const out = [];
  for (let i = 1, k = 1; i <= total; i += 7, k += 1) out.push({ clave: `S${k}`, desde: i, hasta: Math.min(i + 6, total) });
  return out;
};
const iso = (anio, mes, dia) => `${anio}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;

// abrirDesdePanel, abrirBitacora y filtrarBitacoraPorEstado viven en helpers/hu.js (los usa también la fase 3).

// Selector de período (PeriodoSelector en móvil, PeriodoDesktop en desktop).
const etiquetaPeriodo = (page, testInfo) => (esDesktop(testInfo)
  ? page.locator('.sgt-dg-mes__nombre')
  : page.locator('span', { hasText: new RegExp(`^(${MESES_MIN.join('|')}) \\d{4}$`) }).first());
const botonSemana = (page, testInfo, clave) => (esDesktop(testInfo)
  ? page.getByRole('tablist', { name: 'Semana del mes' }).getByRole('tab', { name: new RegExp(`^${clave}\\b`) })
  : page.locator('button.sgt-week-pill', { hasText: new RegExp(`^${clave}`) }));
const botonMesAnterior = (page, testInfo) => (esDesktop(testInfo)
  ? page.getByRole('button', { name: 'Mes anterior' })
  : page.locator('.sgt-nav-arrow').first());
const botonMesSiguiente = (page, testInfo) => (esDesktop(testInfo)
  ? page.getByRole('button', { name: 'Mes siguiente' })
  : page.locator('.sgt-nav-arrow').nth(1));

// ═════════════════════════════════════════════════════════════════════════════
// HU-PER-01 · Ver el personal de mi servicio
// ═════════════════════════════════════════════════════════════════════════════

const abrirPersonal = (page, testInfo) => abrirDesdePanel(page, testInfo, { menu: 'Personal del servicio', panel: 'Panel de Jefatura', modulo: 'Personal del Servicio' });

// Personas tal como las muestra la vista: nombre, RUT, profesión y rol.
const leerPersonal = (page, testInfo) => (esDesktop(testInfo)
  ? page.getByRole('table', { name: 'Personal del servicio' }).locator('tbody tr').evaluateAll((trs) => trs.filter((tr) => tr.children.length === 4).map((tr) => ({
    nombre: tr.querySelector('.sgt-d-persona__nombre').textContent.trim(),
    rut: tr.children[1].textContent.trim(),
    profesion: tr.children[2].textContent.trim(),
    rol: tr.children[3].textContent.trim(),
    botones: tr.querySelectorAll('button, input, a').length,
  })))
  : page.locator('.sgt-list-row').evaluateAll((filas) => filas.map((f) => {
    const datos = f.children[1];
    const [profesion, rut] = datos.children[1].textContent.split(' · ').map((x) => x.trim());
    return { nombre: datos.children[0].textContent.trim().replace(/\s+/g, ' '), rut, profesion, rol: f.children[2].textContent.trim(), botones: f.querySelectorAll('button, input, a').length };
  })));

const personaEsperada = (f) => ({
  nombre: nombreResumen(f).replace(/\s+/g, ' ').trim(),
  rut: f.rutCompleto || f.rut,
  profesion: f.profesion || 'No especificada',
  rol: f.servicios.find((s) => s.idServicio === SERVICIO.urgencias)?.rolServicioNombre || 'Sin rol asignado',
});
const ordenarPorRut = (lista) => [...lista].sort((a, b) => a.rut.localeCompare(b.rut));

test('HU-PER-01 · criterio 1: cada persona con nombre, RUT, profesión y rol en el servicio', async ({ page, api }, testInfo) => {
  await entrar(page, 'jefatura');
  const personal = await api.get(`/funcionarios/summary?servicioId=${SERVICIO.urgencias}`);
  await abrirPersonal(page, testInfo);
  await expect(page.getByText('Cargando nómina de personal...')).toHaveCount(0);
  if (esDesktop(testInfo)) await expect(page.getByRole('table', { name: 'Personal del servicio' })).toBeVisible();
  const vistas = (await leerPersonal(page, testInfo)).map((p) => { const persona = { ...p }; delete persona.botones; return persona; });
  expect(ordenarPorRut(vistas)).toEqual(ordenarPorRut(personal.map(personaEsperada)));
});

test('HU-PER-01 · criterio 2: buscar por nombre o RUT; en desktop, filtrar por rol', async ({ page, api }, testInfo) => {
  await entrar(page, 'jefatura');
  const personal = await api.get(`/funcionarios/summary?servicioId=${SERVICIO.urgencias}`);
  await abrirPersonal(page, testInfo);
  const buscador = page.getByPlaceholder('Buscar por nombre o RUT...');

  // Por RUT: el del médico de prueba.
  await buscador.fill('30000070');
  await expect.poll(async () => (await leerPersonal(page, testInfo)).map((p) => p.rut)).toEqual(['30000070-0']);

  // Por nombre: el nombre de pila del médico, leído de la API.
  const nombre = personal.find((f) => f.idFuncionario === ID.medico).nombre;
  const coinciden = personal.filter((f) => `${f.nombre || ''} ${f.apellidoPaterno || ''} ${f.apellidoMaterno || ''}`.toLowerCase().includes(nombre.toLowerCase()));
  await buscador.fill(nombre);
  await expect.poll(async () => (await leerPersonal(page, testInfo)).map((p) => p.rut).sort()).toEqual(coinciden.map((f) => f.rutCompleto).sort());

  if (esDesktop(testInfo)) {
    await buscador.fill('');
    const jefaturas = personal.filter((f) => f.servicios.some((s) => s.idServicio === SERVICIO.urgencias && s.rolServicioNombre === 'JEFATURA'));
    const filtro = page.getByRole('tablist', { name: 'Filtrar por rol en el servicio' });
    await expect(filtro.getByRole('tab', { name: /^Jefatura/ })).toHaveText(`Jefatura${jefaturas.length}`);
    await filtro.getByRole('tab', { name: /^Jefatura/ }).click();
    await expect.poll(async () => (await leerPersonal(page, testInfo)).map((p) => p.rut).sort()).toEqual(jefaturas.map((f) => f.rutCompleto).sort());
  }
});

test('HU-PER-01 · criterio 3: la vista es solo de lectura', async ({ page }, testInfo) => {
  await entrar(page, 'jefatura');
  await abrirPersonal(page, testInfo);
  const filas = await leerPersonal(page, testInfo);
  expect(filas.length).toBeGreaterThan(0);
  expect(filas.filter((f) => f.botones > 0), 'ninguna persona tiene acciones').toEqual([]);
  // Lo único editable es el buscador.
  const zona = esDesktop(testInfo) ? page.getByRole('main') : page.locator('.phone-shell');
  await expect(zona.locator('input:not([type="search"]):not([placeholder="Buscar por nombre o RUT..."]), textarea, select')).toHaveCount(0);
});

// ═════════════════════════════════════════════════════════════════════════════
// HU-EST-01 · Ver estadísticas de cobertura del servicio
// ═════════════════════════════════════════════════════════════════════════════

const abrirEstadisticas = async (page, testInfo) => {
  await abrirDesdePanel(page, testInfo, { menu: 'Estadísticas', panel: 'Panel de Jefatura', modulo: 'Estadísticas del Servicio' });
  await expect(page.getByText('Cargando estadísticas...')).toHaveCount(0, { timeout: 15_000 });
};

// Lo que muestran las tarjetas de cobertura.
async function leerEstadisticas(page, testInfo) {
  if (esDesktop(testInfo)) {
    const kpi = async (etiqueta) => (await page.locator('.sgt-d-kpi', { has: page.locator('.sgt-d-kpi__etiqueta', { hasText: new RegExp(`^${etiqueta}$`) }) })
      .locator('.sgt-d-kpi__valor').textContent()).trim();
    const puesto = page.locator('.sgt-d-kpi', { has: page.locator('.sgt-d-kpi__etiqueta', { hasText: /^Puesto con más vacantes$/ }) });
    return {
      cobertura: await kpi('Cobertura'),
      total: await kpi('Turnos totales'),
      asignados: await kpi('Asignados'),
      vacantes: await kpi('Vacantes'),
      funcionarios: (await page.getByRole('region', { name: 'Funcionarios con turno' }).locator('.sgt-dg-indicador__valor').textContent()).trim(),
      puesto: (await puesto.locator('.sgt-d-kpi__valor').textContent()).trim(),
      puestoDetalle: (await puesto.locator('.sgt-d-kpi__detalle').textContent()).trim(),
    };
  }
  const tarjeta = (titulo) => page.locator('.sgt-list-row', { has: page.getByText(titulo, { exact: true }) });
  const stat = async (etiqueta) => (await page.locator('.sgt-list-row', { has: page.getByText(etiqueta, { exact: true }) }).locator('> div').nth(1).textContent()).trim();
  return {
    cobertura: (await tarjeta('Cobertura de turnos').locator('> div').first().locator('span').nth(1).textContent()).trim(),
    total: await stat('Turnos totales'),
    asignados: await stat('Asignados'),
    vacantes: await stat('Vacantes'),
    funcionarios: (await tarjeta('Funcionarios con turno').locator('> div').first().locator('span').nth(1).textContent()).trim(),
  };
}

async function esperadoEstadisticas(api, desde, hasta) {
  const q = `fechaInicio=${desde}&fechaFin=${hasta}`;
  const stats = await api.get(`/turnos/servicio/${SERVICIO.urgencias}/stats?${q}`);
  const funcs = await api.get(`/turnos/servicio/${SERVICIO.urgencias}/funcionarios-stats?${q}`);
  const vacantes = await api.get(`/turnos/servicio/${SERVICIO.urgencias}/sin-asignar/periodo?${q}`);
  const porPuesto = new Map();
  vacantes.forEach((t) => porPuesto.set(t.nombrePuesto || 'Sin puesto', (porPuesto.get(t.nombrePuesto || 'Sin puesto') || 0) + 1));
  const max = Math.max(0, ...porPuesto.values());
  return {
    stats, funcs,
    vista: {
      cobertura: `${stats.porcentajeCobertura}%`,
      total: String(stats.totalTurnos),
      asignados: String(stats.turnosAsignados),
      vacantes: String(stats.turnosVacantes),
      funcionarios: `${funcs.funcionariosConTurno} / ${funcs.totalFuncionarios}`,
    },
    puestosMasVacantes: [...porPuesto].filter(([, n]) => n === max).map(([p]) => p),
    maxVacantes: max,
  };
}

test('HU-EST-01 · criterio 1: moverse entre meses y elegir una semana (S1 a S5) o el mes completo', async ({ page }, testInfo) => {
  await entrar(page, 'jefatura');
  await abrirEstadisticas(page, testInfo);
  const hoy = hoyChile();
  const [anio, mes] = [anioDe(hoy), mesDe(hoy)];
  const pedidos = [];
  page.on('request', (r) => { const u = new URL(r.url()); if (u.pathname.endsWith(`/turnos/servicio/${SERVICIO.urgencias}/stats`)) pedidos.push(`${u.searchParams.get('fechaInicio')}…${u.searchParams.get('fechaFin')}`); });

  await expect(etiquetaPeriodo(page, testInfo)).toHaveText(`${MESES_MIN[mes - 1]} ${anio}`);
  const semanas = semanasDelMes(anio, mes);
  for (const s of semanas) await expect(botonSemana(page, testInfo, s.clave), s.clave).toBeVisible();
  await botonSemana(page, testInfo, 'S2').click();
  await expect.poll(() => pedidos.at(-1)).toBe(`${iso(anio, mes, semanas[1].desde)}…${iso(anio, mes, semanas[1].hasta)}`);

  await botonMesAnterior(page, testInfo).click();
  const anterior = mesRelativo(hoy, -1);
  const [aa, ma] = anterior.split('-').map(Number);
  await expect(etiquetaPeriodo(page, testInfo)).toHaveText(`${MESES_MIN[ma - 1]} ${aa}`);
  await expect.poll(() => pedidos.at(-1), { message: 'al cambiar de mes vuelve al mes completo' }).toBe(`${iso(aa, ma, 1)}…${iso(aa, ma, diasDelMes(aa, ma))}`);
  await botonMesSiguiente(page, testInfo).click();
  await expect(etiquetaPeriodo(page, testInfo)).toHaveText(`${MESES_MIN[mes - 1]} ${anio}`);
  await expect.poll(() => pedidos.at(-1)).toBe(`${iso(anio, mes, 1)}…${iso(anio, mes, diasDelMes(anio, mes))}`);
});

test('HU-EST-01 · criterio 2: cobertura, asignados, vacantes, funcionarios con turno y, en desktop, el puesto con más vacantes', async ({ page, api }, testInfo) => {
  await entrar(page, 'jefatura');
  const hoy = hoyChile();
  const [anio, mes] = [anioDe(hoy), mesDe(hoy)];
  const esperado = await esperadoEstadisticas(api, iso(anio, mes, 1), iso(anio, mes, diasDelMes(anio, mes)));
  expect(esperado.stats.turnosAsignados + esperado.stats.turnosVacantes).toBe(esperado.stats.totalTurnos);
  await abrirEstadisticas(page, testInfo);
  const visto = await leerEstadisticas(page, testInfo);
  expect({ ...visto, puesto: undefined, puestoDetalle: undefined }).toEqual({ ...esperado.vista, puesto: undefined, puestoDetalle: undefined });
  if (esDesktop(testInfo)) {
    expect(esperado.puestosMasVacantes, 'el puesto con más vacantes').toContain(visto.puesto);
    expect(visto.puestoDetalle).toBe(`${esperado.maxVacantes} ${esperado.maxVacantes === 1 ? 'vacante' : 'vacantes'}`);
  }
});

test('HU-EST-01 · criterio 3: el detalle de cobertura se filtra por tipo, puesto, fecha y rotativa', async ({ page, api }, testInfo) => {
  await entrar(page, 'jefatura');
  const hoy = hoyChile();
  const [anio, mes] = [anioDe(hoy), mesDe(hoy)];
  const detalle = await api.get(`/turnos/servicio/${SERVICIO.urgencias}/todos-detalle?fechaInicio=${iso(anio, mes, 1)}&fechaFin=${iso(anio, mes, diasDelMes(anio, mes))}`);
  await abrirEstadisticas(page, testInfo);
  const desktop = esDesktop(testInfo);
  if (desktop) await page.getByRole('button', { name: 'Ver detalle de la cobertura' }).click();
  else await page.getByText('Cobertura de turnos', { exact: true }).click();
  const resumen = page.getByText(/^\d+ asignados · \d+ vacantes · \d+ totales$/);
  const texto = (lista) => `${lista.filter((t) => t.asignado).length} asignados · ${lista.filter((t) => !t.asignado).length} vacantes · ${lista.length} totales`;
  await expect(resumen).toHaveText(texto(detalle));

  const muestra = detalle.find((t) => !t.asignado) || detalle[0];
  const filtros = [
    { etiqueta: 'Tipo de turno', id: 'tipo', valor: muestra.tipoTurno, campo: 'tipoTurno' },
    { etiqueta: 'Puesto', id: 'puesto', valor: muestra.nombrePuesto, campo: 'nombrePuesto' },
    { etiqueta: 'Fecha', id: 'fecha', valor: muestra.fecha, campo: 'fecha' },
    { etiqueta: 'Rotativa', id: 'plantilla', valor: muestra.nombreRotativa, campo: 'nombreRotativa' },
  ];
  for (const f of filtros) {
    if (desktop) {
      await page.locator(`#cobertura-${f.id}`).selectOption(f.valor);
    } else {
      if (!(await page.getByRole('button', { name: new RegExp(`^${f.etiqueta}`) }).count())) await page.getByRole('button', { name: /^Filtrar por/ }).click();
      await page.getByRole('button', { name: new RegExp(`^${f.etiqueta}`) }).click();
      // Opciones de la fila abierta; la fecha se muestra como «lun 5 oct».
      const opciones = page.locator('.sgt-scroll-clean .sgt-scroll-clean > button');
      const opcion = f.id === 'fecha'
        ? opciones.filter({ hasText: new RegExp(`^\\S+ ${Number(f.valor.slice(8, 10))} `) })
        : opciones.filter({ hasText: new RegExp(`^${f.valor.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`) });
      await opcion.first().click();
    }
    await expect(resumen, `filtro ${f.etiqueta}`).toHaveText(texto(detalle.filter((t) => t[f.campo] === f.valor)));
    // Se vuelve a «Todos» antes del siguiente filtro.
    if (desktop) await page.locator(`#cobertura-${f.id}`).selectOption('');
    else {
      await page.getByRole('button', { name: new RegExp(`^${f.etiqueta}`) }).click();
      await page.locator('.sgt-scroll-clean .sgt-scroll-clean > button').filter({ hasText: /^Todos$/ }).first().click();
    }
    await expect(resumen).toHaveText(texto(detalle));
  }
});

test('HU-EST-01 · criterio 3: el detalle de funcionarios muestra cuántos turnos tiene cada uno', async ({ page, api }, testInfo) => {
  await entrar(page, 'jefatura');
  const hoy = hoyChile();
  const [anio, mes] = [anioDe(hoy), mesDe(hoy)];
  const turnos = await api.get(`/turnos/servicio/${SERVICIO.urgencias}/calendario/${anio}/${mes}`);
  const porPersona = new Map();
  turnos.filter((t) => t.idFuncionario != null).forEach((t) => porPersona.set(t.nombreFuncionario, (porPersona.get(t.nombreFuncionario) || 0) + 1));
  await abrirEstadisticas(page, testInfo);
  if (esDesktop(testInfo)) await page.getByRole('button', { name: 'Ver detalle de funcionarios con turno' }).click();
  else await page.getByText('Funcionarios con turno', { exact: true }).click();
  await expect(page.getByText(/de \d+ funcionarios con turno en este período/)).toBeVisible();

  const vistos = esDesktop(testInfo)
    ? await page.locator('.sgt-dg-acordeon__boton').evaluateAll((bs) => bs.map((b) => [b.querySelector('.sgt-dg-acordeon__nombre').textContent.trim(), b.querySelector('.sgt-d-chip').textContent.trim()]))
    : await page.getByText(/de \d+ funcionarios con turno en este período/).locator('xpath=following-sibling::div[2]/div/button')
      .evaluateAll((bs) => bs.map((b) => [b.children[1].textContent.trim(), b.children[2].textContent.trim()]));
  const conTurno = vistos.filter(([, n]) => !n.startsWith('0 '));
  expect(Object.fromEntries(conTurno)).toEqual(Object.fromEntries([...porPersona].map(([n, k]) => [n, `${k} ${k === 1 ? 'turno' : 'turnos'}`])));
});

test('HU-EST-01 · criterio 4: los números coinciden con el calendario del mismo período', async ({ page, api }, testInfo) => {
  await entrar(page, 'jefatura');
  const hoy = hoyChile();
  const [anio, mes] = [anioDe(hoy), mesDe(hoy)];
  const calendario = await api.get(`/turnos/servicio/${SERVICIO.urgencias}/calendario/${anio}/${mes}`);
  const asignados = calendario.filter((t) => t.idFuncionario != null).length;
  await abrirEstadisticas(page, testInfo);
  const visto = await leerEstadisticas(page, testInfo);
  expect([visto.total, visto.asignados, visto.vacantes]).toEqual([String(calendario.length), String(asignados), String(calendario.length - asignados)]);
  if (esDesktop(testInfo)) {
    // Y con el resumen del mes que muestra la vista del calendario.
    await itemMenu(page, 'Calendario').click();
    await expect(page.locator('.sgt-dt-cargando-celda')).toHaveCount(0, { timeout: 15_000 });
    await expect(page.locator('.sgt-d-encabezado__acciones').getByText(`${visto.asignados}/${visto.total} asignados`, { exact: true })).toBeVisible();
    await expect(page.locator('.sgt-d-encabezado__acciones').getByText(`${visto.vacantes} cupos libres`, { exact: true })).toBeVisible();
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// HU-BIT-01 · Consultar la bitácora de cambios
// ═════════════════════════════════════════════════════════════════════════════

// Cuántos registros dice la vista y la fecha de cada uno, en orden.
const conteoBitacora = async (page, testInfo) => {
  const texto = esDesktop(testInfo)
    ? await page.getByRole('region', { name: 'Registros' }).locator('.sgt-d-panel__subtitulo').textContent()
    : await page.getByRole('button', { name: /^Filtrar/ }).textContent();
  return Number(texto.match(/([\d.]+) registros?/)[1].replace(/\./g, ''));
};
const fechasBitacora = (page, testInfo) => (esDesktop(testInfo)
  ? page.locator('table[aria-label="Registros de la bitácora"] tbody tr td:first-child').allTextContents()
  : page.locator('.sgt-list-row > div:first-child > div:first-child').evaluateAll((filas) => filas.map((f) => f.querySelector(':scope > span:last-of-type').textContent)));

// Eventos que deben verse en un período (la vista oculta las postulaciones).
const fechaEvento = (e) => (e.fechaModificacion || e.fechaInicioAfectada || '').slice(0, 10);
const enPeriodo = (eventos, desde, hasta) => eventos.filter((e) => !String(e.tipoEvento).startsWith('POSTULACION_')
  && (!fechaEvento(e) || (fechaEvento(e) >= desde && fechaEvento(e) <= hasta)));

const MES_CORTO = { ene: 1, feb: 2, mar: 3, abr: 4, may: 5, jun: 6, jul: 7, ago: 8, sept: 9, sep: 9, oct: 10, nov: 11, dic: 12 };
// «16 oct 2026 · 20:10» → «2026-10-16T20:10» (formato de la bitácora, dayjs en español).
const fechaDeBitacora = (t) => {
  const m = t.trim().match(/^(\d{1,2}) ([a-zé]+)\.? (\d{4}) · (\d{2}:\d{2})$/i);
  return m ? `${m[3]}-${String(MES_CORTO[m[2].toLowerCase()]).padStart(2, '0')}-${m[1].padStart(2, '0')}T${m[4]}` : t;
};

test('HU-BIT-01 · criterio 1: elegir mes y semana filtra los eventos del período', async ({ page, api }, testInfo) => {
  await entrar(page, 'jefatura');
  const eventos = await api.get('/bitacoras/dto');
  const hoy = hoyChile();
  const [anio, mes] = [anioDe(hoy), mesDe(hoy)];
  await abrirBitacora(page, testInfo);
  await expect.poll(() => conteoBitacora(page, testInfo), { message: 'mes actual' })
    .toBe(enPeriodo(eventos, iso(anio, mes, 1), iso(anio, mes, diasDelMes(anio, mes))).length);
  for (const s of semanasDelMes(anio, mes).slice(0, 3)) {
    await botonSemana(page, testInfo, s.clave).click();
    await expect.poll(() => conteoBitacora(page, testInfo), { message: s.clave }).toBe(enPeriodo(eventos, iso(anio, mes, s.desde), iso(anio, mes, s.hasta)).length);
  }
  await botonMesAnterior(page, testInfo).click();
  const [aa, ma] = mesRelativo(hoy, -1).split('-').map(Number);
  await expect(etiquetaPeriodo(page, testInfo)).toHaveText(`${MESES_MIN[ma - 1]} ${aa}`);
  await expect.poll(() => conteoBitacora(page, testInfo), { message: 'mes anterior' }).toBe(enPeriodo(eventos, iso(aa, ma, 1), iso(aa, ma, diasDelMes(aa, ma))).length);
});

test('HU-BIT-01 · criterio 1: los eventos se ordenan del más reciente al más antiguo', async ({ page }, testInfo) => {
  // P-01 (17 oct): la vista ordena por fecha (antes invertía el orden de llegada; falla conocida).
  await entrar(page, 'jefatura');
  await abrirBitacora(page, testInfo);
  // Solo los eventos de solicitudes: caben en la primera página de desktop (la
  // generación de turnos llena varias páginas con el mismo minuto).
  if (esDesktop(testInfo)) await page.locator('#bitacora-categoria').selectOption('SOLICITUDES');
  else {
    await page.getByRole('button', { name: /^Filtrar/ }).click();
    await page.getByRole('button', { name: /^Categoría/ }).click();
    await page.locator('button.sgt-filter-chip', { hasText: /^Solicitudes$/ }).click();
  }
  await expect.poll(() => conteoBitacora(page, testInfo)).toBeLessThan(50);
  const fechas = (await fechasBitacora(page, testInfo)).map(fechaDeBitacora);
  expect(fechas.length).toBeGreaterThan(1);
  const desordenadas = fechas.filter((f, i) => i > 0 && f > fechas[i - 1]);
  expect(desordenadas, 'fechas que aparecen después de una más antigua').toEqual([]);
});

test('HU-BIT-01 · criterio 2: filtros por categoría, tipo de solicitud, estado y encargado; en desktop, páginas de 50 y detalle lateral', async ({ page, api }, testInfo) => {
  await entrar(page, 'jefatura');
  const eventos = await api.get('/bitacoras/dto');
  const hoy = hoyChile();
  const [anio, mes] = [anioDe(hoy), mesDe(hoy)];
  const delMes = enPeriodo(eventos, iso(anio, mes, 1), iso(anio, mes, diasDelMes(anio, mes)));
  const esOferta = (e) => String(e.tipoEvento).startsWith('OFERTA_GENERAL');
  const ESTADO = {
    SOLICITUD_CREADA: 'PENDIENTE', OFERTA_ACEPTADA_POR_RECEPTOR: 'PENDIENTE', OFERTA_PARTICULAR_ACEPTADA_POR_RECEPTOR: 'PENDIENTE',
    // P-01 (17 oct): la cancelación del solicitante se muestra como CANCELADA, con su propio filtro.
    CAMBIO_ESTADO_APROBADA: 'APROBADA', CAMBIO_ESTADO_RECHAZADA: 'RECHAZADA', RECHAZO_AUTOMATICO: 'RECHAZADA', SOLICITUD_CANCELADA: 'CANCELADA',
    OFERTA_RECHAZADA_POR_RECEPTOR: 'RECHAZADA', OFERTA_PARTICULAR_RECHAZADA_POR_RECEPTOR: 'RECHAZADA',
    OFERTA_GENERAL_CREADA: 'PENDIENTE', OFERTA_GENERAL_APROBADA: 'PENDIENTE', OFERTA_GENERAL_RECHAZADA: 'RECHAZADA', OFERTA_GENERAL_CERRADA: 'APROBADA',
  };
  const encargado = delMes.find((e) => e.tipoEvento === 'GENERACION_TURNO')?.nombreFuncionario;
  const tipo = delMes.find((e) => e.tipoSolicitud)?.tipoSolicitud;
  const casos = [
    { etiqueta: 'Categoría', valor: 'SOLICITUDES', texto: 'Solicitudes', espera: delMes.filter((e) => e.idSolicitud || esOferta(e)) },
    { etiqueta: 'Categoría', valor: 'TURNOS', texto: 'Turnos', espera: delMes.filter((e) => !e.idSolicitud && !esOferta(e)) },
    { etiqueta: 'Tipo de solicitud', valor: tipo, texto: tipo, espera: delMes.filter((e) => e.tipoSolicitud === tipo) },
    { etiqueta: 'Estado', valor: 'PENDIENTE', texto: 'Pendiente', espera: delMes.filter((e) => ESTADO[e.tipoEvento] === 'PENDIENTE') },
    { etiqueta: 'Encargado', valor: encargado, texto: encargado, espera: delMes.filter((e) => e.nombreFuncionario === encargado) },
  ];
  await abrirBitacora(page, testInfo);
  const desktop = esDesktop(testInfo);
  const idSelect = { Categoría: 'bitacora-categoria', 'Tipo de solicitud': 'bitacora-tipo', Estado: 'bitacora-estado', Encargado: 'bitacora-encargado' };
  const elegir = async (etiqueta, valor, texto) => {
    if (desktop) { await page.locator(`#${idSelect[etiqueta]}`).selectOption(valor ?? ''); return; }
    if (!(await page.getByRole('button', { name: new RegExp(`^${etiqueta}`) }).count())) await page.getByRole('button', { name: /^Filtrar/ }).click();
    await page.getByRole('button', { name: new RegExp(`^${etiqueta}`) }).click();
    await page.locator('button.sgt-filter-chip', { hasText: new RegExp(`^${texto ?? 'Todo'}$`) }).click();
  };
  for (const c of casos) {
    expect(c.valor, `hay datos para el filtro ${c.etiqueta}`).toBeTruthy();
    await elegir(c.etiqueta, c.valor, c.texto);
    await expect.poll(() => conteoBitacora(page, testInfo), { message: `${c.etiqueta}: ${c.texto}` }).toBe(c.espera.length);
    await elegir(c.etiqueta, null, null);
    await expect.poll(() => conteoBitacora(page, testInfo)).toBe(delMes.length);
  }

  if (desktop) {
    const filas = page.locator('table[aria-label="Registros de la bitácora"] tbody tr');
    await expect(filas).toHaveCount(Math.min(50, delMes.length));
    await expect(page.getByText(`1–${Math.min(50, delMes.length)} de ${delMes.length.toLocaleString('es-CL')} registros`, { exact: true })).toBeVisible();
    // Detalle en panel lateral: se abre la fila de arriba, el último evento en
    // llegar (la generación de la planificación demo, no un evento del seed).
    const fecha = (await filas.first().locator('td').first().textContent()).trim();
    await filas.first().click();
    const panel = page.getByRole('dialog', { name: 'Detalle del evento' });
    await expect(panel).toBeVisible();
    await expect(panel).toContainText(fecha);
    await page.keyboard.press('Escape');
    await expect(panel).toHaveCount(0);
  }
});

test('HU-BIT-01 · criterio 3: solo se ven los eventos de mi servicio', async ({ page, api, request }, testInfo) => {
  // C-17 (17 oct): el backend acota la bitácora al servicio de la sesión (antes, falla conocida). Los eventos de otros
  // servicios se toman con el administrador, que los recibe todos; la jefatura no debe recibirlos ni verlos en pantalla.
  // Solo ids y conteos: son datos de otros servicios.
  const admin = await tokenRol(request, 'admin', SERVICIO.urgencias);
  const todos = await apiGet(request, admin, '/bitacoras/dto');
  const solicitudes = await apiGet(request, admin, '/solicitudes');
  const deOtroServicio = new Set(solicitudes.filter((s) => s.turno && s.turno.servicio?.idServicio !== SERVICIO.urgencias).map((s) => s.idSolicitud));
  const ajenos = new Set(todos.filter((e) => deOtroServicio.has(e.idSolicitud)).map((e) => e.idEvento));
  expect(ajenos.size, 'hay eventos de otros servicios en el sistema').toBeGreaterThan(0);

  await entrar(page, 'jefatura');
  const suyos = await api.get('/bitacoras/dto');
  expect(suyos.filter((e) => ajenos.has(e.idEvento)).length, 'eventos de otros servicios en la respuesta de la jefatura').toBe(0);
  const hoy = hoyChile();
  const [anio, mes] = [anioDe(hoy), mesDe(hoy)];
  const delMes = enPeriodo(suyos, iso(anio, mes, 1), iso(anio, mes, diasDelMes(anio, mes)));
  await abrirBitacora(page, testInfo);
  await expect.poll(() => conteoBitacora(page, testInfo), { timeout: 5_000 }).toBe(delMes.length);
});

test('HU-BIT-01 · criterio 4: las cancelaciones aparecen como CANCELADA, con «Cancelada por el solicitante» y su propio filtro (evento simulado)', async ({ page, api }, testInfo) => {
  await entrar(page, 'jefatura');
  const eventos = await api.get('/bitacoras/dto');
  const solicitudes = await api.get('/solicitudes');
  // Lo que registraría el backend si el emisor cancela su cobertura pendiente
  // del seed (SolicitudService.cancelarSolicitud): mismo evento DTO, otro tipo.
  const cobertura = solicitudes.find((s) => s.tipoSolicitud.tipo === 3 && s.estado === 'PENDIENTE' && s.turno?.servicio?.idServicio === SERVICIO.urgencias);
  const base = eventos.find((e) => e.idSolicitud === cobertura.idSolicitud && e.tipoEvento === 'SOLICITUD_CREADA');
  const motivo = `Cancelada por el solicitante · motivo original: ${cobertura.motivo}`;
  const cancelado = {
    ...base, idEvento: 999001, tipoEvento: 'SOLICITUD_CANCELADA', estadoSolicitud: 'RECHAZADA', motivoSolicitud: motivo,
    fechaModificacion: `${hoyChile()}T${ahoraChile().slice(11)}:00`, fechaInicioAfectada: null,
  };
  await page.route(/\/api\/v2\/bitacoras\/dto$/, (route) => route.fulfill({ json: [...eventos, cancelado] }));
  await abrirBitacora(page, testInfo);

  // P-01 (17 oct): la cancelación se muestra como CANCELADA y tiene su propio filtro
  // («Rechazada» ya no la incluye). En la base, la solicitud sigue RECHAZADA.
  await filtrarBitacoraPorEstado(page, testInfo, { valor: 'CANCELADA', texto: 'Cancelada' });
  // Es el evento más reciente: la vista lo muestra primero.
  const filas = esDesktop(testInfo) ? page.locator('table[aria-label="Registros de la bitácora"] tbody tr') : page.locator('.sgt-list-row');
  await expect(filas.first()).toContainText('CANCELADA');
  if (esDesktop(testInfo)) {
    await filas.first().click();
    await expect(page.getByRole('dialog', { name: 'Detalle del evento' })).toContainText('Cancelada por el solicitante');
    await page.keyboard.press('Escape');
    // Con «Rechazada» ya no aparece.
    await page.locator('#bitacora-estado').selectOption('RECHAZADA');
  } else {
    await filas.first().locator('> div').first().click();
    await expect(filas.first()).toContainText('Cancelada por el solicitante');
    // Con «Rechazada» ya no aparece (el panel de filtros sigue abierto).
    if (!(await page.getByRole('button', { name: /^Estado/ }).count())) await page.getByRole('button', { name: /^Filtrar/ }).click();
    await page.getByRole('button', { name: /^Estado/ }).click();
    await page.locator('button.sgt-filter-chip', { hasText: /^Rechazada$/ }).click();
  }
  await expect(filas.filter({ hasText: 'CANCELADA' }), 'la cancelación no está entre las rechazadas').toHaveCount(0);
});

// ═════════════════════════════════════════════════════════════════════════════
// HU-AUD-01 · Revisar la auditoría de asistencia
// ═════════════════════════════════════════════════════════════════════════════

const abrirAuditoria = async (page, testInfo) => {
  await abrirDesdePanel(page, testInfo, { menu: 'Auditoría de asistencia', panel: 'Panel de Jefatura', modulo: 'Auditoría de Asistencia' });
  await expect(page.getByText('Cargando turnos...')).toHaveCount(0, { timeout: 15_000 });
};
const opcionesMes = (page, testInfo) => (esDesktop(testInfo)
  ? page.getByRole('tablist', { name: 'Mes' }).getByRole('tab')
  : page.locator('button.sgt-week-pill'));

// Turnos listados: día del mes, horario, puesto y funcionario (o «Vacante»).
const leerAuditoria = (page, testInfo) => (esDesktop(testInfo)
  ? page.getByRole('table', { name: 'Turnos pasados del mes' }).locator('tbody tr').evaluateAll((trs) => trs.filter((tr) => tr.children.length === 6).map((tr) => ({
    dia: Number(tr.children[0].textContent.match(/\d+/)[0]),
    horario: tr.children[2].textContent.trim(),
    puesto: tr.children[3].textContent.trim(),
    quien: tr.children[5].textContent.trim() === 'Vacante' ? 'Vacante' : tr.children[4].querySelector('.sgt-d-persona__nombre').textContent.trim(),
    texto: tr.textContent,
  })))
  : page.locator('.sgt-list-row').filter({ has: page.locator('span', { hasText: /^· / }) }).evaluateAll((items) => items.map((it) => {
    const datos = it.children[0];
    const linea = [...datos.children].find((c) => c.querySelector(':scope > span'));
    return {
      dia: Number(linea.children[0].textContent.match(/\d+/)[0]),
      horario: linea.children[1].textContent.replace(/^·\s*/, '').trim(),
      puesto: datos.lastElementChild.textContent.trim(),
      quien: it.children[1].textContent.trim(),
      texto: it.textContent,
    };
  })));

test('HU-AUD-01 · criterio 1: el mes actual o uno de los dos anteriores', async ({ page }, testInfo) => {
  await entrar(page, 'jefatura');
  await abrirAuditoria(page, testInfo);
  const hoy = hoyChile();
  const esperados = [0, -1, -2].map((d) => { const [a, m] = mesRelativo(hoy, d).split('-').map(Number); return `${MESES_MIN[m - 1]} ${a}`; });
  await expect(opcionesMes(page, testInfo)).toHaveText(esperados);
  for (const [i, etiqueta] of esperados.entries()) {
    await opcionesMes(page, testInfo).nth(i).click();
    if (esDesktop(testInfo)) await expect(page.locator('.sgt-d-kpi', { has: page.locator('.sgt-d-kpi__etiqueta', { hasText: /^Total$/ }) })).toContainText(`turnos pasados de ${etiqueta}`);
    else await expect(page.getByText(/^(Asignados|Vacantes|Total)$/).first().or(page.getByText(`No se encontraron turnos en ${etiqueta}.`))).toBeVisible();
  }
});

// Turnos del mes que se audita: el actual o, si todavía no empieza ninguno
// (el día 1 de madrugada), el anterior. `indice`: su posición en el selector.
async function turnosAuditables(api) {
  const hoy = hoyChile();
  const turnos = await api.get(`/turnos/servicio/${SERVICIO.urgencias}`);
  for (const [indice, delta] of [[0, 0], [1, -1]]) {
    const ym = mesRelativo(hoy, delta);
    const delMes = turnos.filter((t) => t.diaInicioTurno.slice(0, 7) === ym);
    const empezados = delMes.filter((t) => inicioDe(t) <= ahoraChile());
    if (empezados.length) return { hoy, indice, delMes, empezados };
  }
  throw new Error('No hay turnos ya empezados en este mes ni en el anterior');
}
async function elegirMesAuditoria(page, testInfo, indice) {
  if (indice > 0) await opcionesMes(page, testInfo).nth(indice).click();
}
const claveAud = (t) => `${Number(t.diaInicioTurno.slice(8, 10))}|${String(t.horaInicio).slice(0, 5)} – ${String(t.horaFin).slice(0, 5)}|${t.nombrePuesto}`;

test('HU-AUD-01 · criterio 2: los turnos del mes que ya empezaron, del más reciente al más antiguo, con funcionario o «Vacante»', async ({ page, api }, testInfo) => {
  await entrar(page, 'jefatura');
  const { delMes, empezados, indice } = await turnosAuditables(api);
  await abrirAuditoria(page, testInfo);
  await elegirMesAuditoria(page, testInfo, indice);
  const vistos = await leerAuditoria(page, testInfo);
  const porClave = new Map(delMes.map((t) => [claveAud(t), t]));
  // Todo lo listado es del mes, con su funcionario o «Vacante».
  for (const v of vistos) {
    const t = porClave.get(`${v.dia}|${v.horario}|${v.puesto}`);
    expect(t, `turno listado ${v.dia} ${v.horario} ${v.puesto} es del mes`).toBeTruthy();
    expect(v.quien).toBe(t.idFuncionario == null ? 'Vacante' : t.nombreFuncionario);
  }
  // Del más reciente al más antiguo.
  expect(vistos.map((v) => v.dia)).toEqual([...vistos.map((v) => v.dia)].sort((a, b) => b - a));
  // Están todos los que ya empezaron.
  const listados = new Set(vistos.map((v) => `${v.dia}|${v.horario}|${v.puesto}`));
  expect(empezados.filter((t) => !listados.has(claveAud(t))).map(claveAud), 'turnos ya empezados que faltan').toEqual([]);
});

test('HU-AUD-01 · criterio 2: no aparecen los turnos que todavía no empiezan', async ({ page, api }, testInfo) => {
  fallaConocida('HU-AUD-01, Estado (observación del criterio 2): la vista compara solo la fecha de inicio con el momento actual (AuditoriaView, turnosDelMes) e incluye los turnos de hoy que todavía no empiezan.');
  await entrar(page, 'jefatura');
  const { hoy, delMes } = await turnosAuditables(api);
  const sinEmpezar = new Set(delMes.filter((t) => inicioDe(t) > ahoraChile()).map(claveAud));
  // La falla se ve solo mientras hoy queda algún turno por empezar (hasta las 20:00).
  test.skip(!delMes.some((t) => t.diaInicioTurno === hoy && inicioDe(t) > ahoraChile()),
    'Ya empezaron todos los turnos de hoy: la falla anotada no se puede observar a esta hora.');
  await abrirAuditoria(page, testInfo);
  const vistos = await leerAuditoria(page, testInfo);
  expect(vistos.filter((v) => sinEmpezar.has(`${v.dia}|${v.horario}|${v.puesto}`)).map((v) => `${v.dia} ${v.horario} ${v.puesto}`), 'turnos listados que no han empezado').toEqual([]);
});

test('HU-AUD-01 · criterio 3: totales de asignados, vacantes y total; en desktop, filtro por estado', async ({ page, api }, testInfo) => {
  await entrar(page, 'jefatura');
  const { indice } = await turnosAuditables(api);
  await abrirAuditoria(page, testInfo);
  await elegirMesAuditoria(page, testInfo, indice);
  const vistos = await leerAuditoria(page, testInfo);
  const vacantes = vistos.filter((v) => v.quien === 'Vacante').length;
  const asignados = vistos.length - vacantes;
  if (esDesktop(testInfo)) {
    const kpi = (etiqueta) => page.locator('.sgt-d-kpi', { has: page.locator('.sgt-d-kpi__etiqueta', { hasText: new RegExp(`^${etiqueta}$`) }) }).locator('.sgt-d-kpi__valor');
    await expect(kpi('Asignados')).toHaveText(String(asignados));
    await expect(kpi('Vacantes')).toHaveText(String(vacantes));
    await expect(kpi('Total')).toHaveText(String(vistos.length));
    const filtro = page.getByRole('tablist', { name: 'Filtrar por estado' });
    await expect(filtro.getByRole('tab')).toHaveText([`Todos${vistos.length}`, `Asignados${asignados}`, `Vacantes${vacantes}`]);
    await filtro.getByRole('tab', { name: /^Vacantes/ }).click();
    await expect.poll(async () => (await leerAuditoria(page, testInfo)).map((v) => v.quien)).toEqual(Array(vacantes).fill('Vacante'));
  } else {
    const valor = (etiqueta) => page.getByText(etiqueta, { exact: true }).locator('xpath=preceding-sibling::div[1]');
    await expect(valor('Asignados')).toHaveText(String(asignados));
    await expect(valor('Vacantes')).toHaveText(String(vacantes));
    await expect(valor('Total')).toHaveText(String(vistos.length));
  }
});

test('HU-AUD-01 · criterio 4: cada turno asignado muestra quién hizo la asignación', async ({ page, api }, testInfo) => {
  fallaConocida('C-14 (decidida el 17 oct: se corrige el manual, no la pantalla): la auditoría no muestra al encargado de cada asignación (AuditoriaView, TurnoAuditoriaItem). El criterio queda por retirar del catálogo.');
  await entrar(page, 'jefatura');
  const { indice } = await turnosAuditables(api);
  await abrirAuditoria(page, testInfo);
  await elegirMesAuditoria(page, testInfo, indice);
  const asignados = (await leerAuditoria(page, testInfo)).filter((v) => v.quien !== 'Vacante');
  expect(asignados.length).toBeGreaterThan(0);
  expect(asignados.filter((v) => !/asignad[oa] por|encargad[oa]/i.test(v.texto)).length, 'turnos asignados sin el encargado de la asignación').toBe(0);
});

// ═════════════════════════════════════════════════════════════════════════════
// HU-ADM-03 · Ver el personal del sistema
// ═════════════════════════════════════════════════════════════════════════════

const abrirPersonalSistema = async (page, testInfo) => {
  await abrirDesdePanel(page, testInfo, { menu: 'Personal del sistema', panel: 'Panel de Administración', modulo: 'Personal del Sistema' });
  await expect(page.getByText('Cargando registros del sistema...')).toHaveCount(0, { timeout: 15_000 });
};
// RUT de cada persona de la página visible.
const rutsVisibles = (page, testInfo) => (esDesktop(testInfo)
  ? page.getByRole('table', { name: 'Personal registrado en el sistema' }).locator('tbody tr td:nth-child(2)').allTextContents()
  : page.locator('.sgt-list-row').evaluateAll((fs) => fs.map((f) => f.children[0].children[1].children[1].textContent.split(' · ').pop().trim())));

test('HU-ADM-03 · criterio 1: filtrar por servicio y buscar por nombre o RUT', async ({ page, api }, testInfo) => {
  await entrar(page, 'admin');
  const deUrgencias = await api.get(`/funcionarios/summary?servicioId=${SERVICIO.urgencias}`);
  await abrirPersonalSistema(page, testInfo);
  const filtro = esDesktop(testInfo) ? page.getByLabel('Filtrar por servicio') : page.locator('select').first();
  await filtro.selectOption({ label: 'Urgencias' });
  await expect(page.getByText('Cargando registros del sistema...')).toHaveCount(0);
  if (esDesktop(testInfo)) await expect(page.getByRole('region', { name: 'Personal registrado' }).locator('.sgt-d-panel__subtitulo')).toHaveText(`${deUrgencias.length} funcionarios · Urgencias`);
  else await expect(page.getByText(`1 / ${Math.ceil(deUrgencias.length / 10)}`, { exact: true })).toBeVisible();

  const buscador = page.getByPlaceholder('Buscar por nombre, apellidos o RUT...');
  await buscador.fill('30000070');
  await expect.poll(() => rutsVisibles(page, testInfo)).toEqual(['30000070-0']);
  const nombre = deUrgencias.find((f) => f.idFuncionario === ID.medico).apellidoPaterno;
  await buscador.fill(nombre);
  const coinciden = deUrgencias.filter((f) => `${f.nombre || ''} ${f.apellidoPaterno || ''} ${f.apellidoMaterno || ''}`.toLowerCase().includes(nombre.toLowerCase()));
  const porPagina = esDesktop(testInfo) ? 50 : 10;
  await expect.poll(async () => (await rutsVisibles(page, testInfo)).length).toBe(Math.min(coinciden.length, porPagina));
  const ruts = new Set(coinciden.map((f) => f.rutCompleto));
  expect((await rutsVisibles(page, testInfo)).filter((r) => !ruts.has(r)), 'personas que no coinciden con la búsqueda').toEqual([]);
});

test('HU-ADM-03 · criterio 2: páginas de 10 en móvil y de 50 en desktop', async ({ page, api }, testInfo) => {
  await entrar(page, 'admin');
  const todos = await api.get('/funcionarios/summary');
  const porPagina = esDesktop(testInfo) ? 50 : 10;
  const paginas = Math.ceil(todos.length / porPagina);
  expect(paginas).toBeGreaterThan(1);
  await abrirPersonalSistema(page, testInfo);
  await expect.poll(async () => (await rutsVisibles(page, testInfo)).length).toBe(porPagina);
  if (esDesktop(testInfo)) {
    await expect(page.getByText(`1–${porPagina} de ${todos.length.toLocaleString('es-CL')} funcionarios`, { exact: true })).toBeVisible();
    await expect(page.getByText(`Página 1 de ${paginas}`, { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Siguiente', exact: true }).click();
  } else {
    await expect(page.getByText(`1 / ${paginas}`, { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Página siguiente' }).click();
  }
  await expect.poll(async () => (await rutsVisibles(page, testInfo)).length).toBe(Math.min(porPagina, todos.length - porPagina));
});

test('HU-ADM-03 · criterio 3: cada persona muestra sus servicios y su rol en cada uno; solo lectura', async ({ page, api }, testInfo) => {
  await entrar(page, 'admin');
  const todos = await api.get('/funcionarios/summary');
  const multi = todos.find((f) => f.idFuncionario === ID.multiservicio);
  expect(multi.servicios.length).toBeGreaterThan(1);
  await abrirPersonalSistema(page, testInfo);
  await page.getByPlaceholder('Buscar por nombre, apellidos o RUT...').fill(multi.rut);
  const fila = esDesktop(testInfo)
    ? page.getByRole('table', { name: 'Personal registrado en el sistema' }).locator('tbody tr')
    : page.locator('.sgt-list-row');
  await expect(fila).toHaveCount(1);
  // El rol puede venir con formato («Médico» por MEDICO): se compara sin tildes ni mayúsculas.
  const texto = norm(await fila.textContent());
  for (const s of multi.servicios) {
    expect(texto, `${s.nombreServicio} · ${s.rolServicioNombre}`).toContain(norm(`${s.nombreServicio}`));
    expect(texto, `${s.nombreServicio} · ${s.rolServicioNombre}`).toContain(norm(s.rolServicioNombre));
  }
  await expect(fila.locator('button, input, select, a')).toHaveCount(0);
});

// ═════════════════════════════════════════════════════════════════════════════
// HU-REG-02 · Reglas de horario para jefatura y subrogante: retiradas por C-10
// ═════════════════════════════════════════════════════════════════════════════
// C-10 (decidido el 17 oct): las reglas de horario son solo del administrador. El backend cierra sus escrituras
// (GLOBAL_ADMIN_PATHS; la 2b de permisos.spec.js las prueba por API) y la vista `reglas` pasó a las vistas del
// administrador (Prop4). El criterio 1 del catálogo, «la jefatura llega a Reglas de Horario del Servicio desde su
// panel o desde el menú y las edita», queda por retirar: estas pruebas guardan la decisión. El recorrido de
// abrir y cancelar nueva regla, edición y eliminación es ahora del administrador (HU-REG-01), en
// e2e/visual/interacciones-admin-mantenedores.spec.js.

for (const rol of ['jefatura', 'subrogante']) {
  test(`HU-REG-02 · C-10: ni el panel ni el menú llevan a «Reglas de Horario del Servicio» (${rol})`, async ({ page }, testInfo) => {
    await entrar(page, rol);
    const enMenu = esDesktop(testInfo) ? await itemMenu(page, 'Reglas de horario').count() : 0;
    await barraInferior(page, 'Perfil').or(itemMenu(page, 'Perfil')).first().click();
    await page.getByRole('button', { name: new RegExp(`^Panel de ${rol === 'jefatura' ? 'Jefatura' : 'Subrogante'}`) }).click();
    const enPanel = await page.getByRole('button', { name: /^Reglas de Horario del Servicio\b/ }).count();
    expect(enMenu + enPanel, 'ningún acceso a las reglas de horario').toBe(0);
  });

  test(`HU-REG-02 · C-10: forzar la vista «reglas» lleva al inicio (${rol})`, async ({ page }) => {
    await entrar(page, rol);
    await irA(page, 'reglas');
    await expect.poll(() => vistaActual(page), { timeout: 15_000 }).toBe('agenda');
    await expect(page.getByText('Reglas de Horario del Servicio', { exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Nueva regla' })).toHaveCount(0);
  });
}
