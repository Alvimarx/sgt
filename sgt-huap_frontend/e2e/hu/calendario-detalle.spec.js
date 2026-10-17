// HU del calendario y del detalle del turno, fase 1 del catálogo (§6.2), solo
// lectura, en móvil y en desktop:
//  - HU-CAL-06 (calendario mensual) y HU-CAL-08 (exportar todo el servicio,
//    criterios 1 a 3; el 4 es un negativo por API de la fase 2a);
//  - HU-DET-01 (detalle del turno) y HU-DET-03 (elegir receptor, sin enviar);
//  - HU-ASG-01 (abrir la asignación de turnos).
// Lo esperado sale de la API del día; nada se envía (la guarda de hu.js corta
// cualquier escritura). Las descargas del CSV son GET.
import fs from 'node:fs';
import {
  test, expect, fallaConocida, ID, SERVICIO, MESES, esMovil, esDesktop,
  hoyChile, sumarDias, diaSemana, mesDe, anioDe, mesRelativo,
  entrar, usuarioSesion, itemMenu, barraInferior, esperarQuieta,
} from '../helpers/hu.js';
import { turnosPorDia, rotativaDelBloque, horasDe } from '../helpers/datos.js';

const DIAS_LARGOS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const DIAS_CAL = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];
const mesMin = (m) => MESES[m - 1].toLowerCase();
const capital = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const numDia = (iso) => Number(iso.slice(8, 10));
const hhmm = (h) => String(h).slice(0, 5);
// El calendario decide día o noche por la hora de inicio (turnosService.inferirTipo).
const deNoche = (t) => { const h = Number(hhmm(t.horaInicio).slice(0, 2)); return h >= 18 || h < 6; };
const limpiarRot = (r) => (r && !/^sin rotativa$/i.test(String(r).trim()) ? r : null);
const nombreSesion = (u) => u.nombreCompleto;

const verFugaz = (page, texto) => page.waitForFunction(
  (t) => document.body.innerText.includes(t), texto, { polling: 'raf', timeout: 15_000 },
);

// ── Calendario ───────────────────────────────────────────────────────────────
async function esperarCalendario(page, testInfo) {
  if (esDesktop(testInfo)) await expect(page.locator('.sgt-dt-cargando-celda')).toHaveCount(0, { timeout: 15_000 });
  else await expect(page.getByText('Cargando turnos del mes…')).toHaveCount(0, { timeout: 15_000 });
  await esperarQuieta(page);
}

async function abrirCalendario(page, testInfo) {
  if (esDesktop(testInfo)) await itemMenu(page, 'Calendario').click();
  else await barraInferior(page, 'Calendario').click();
  await esperarCalendario(page, testInfo);
}

const textoMes = (ym) => `${MESES[Number(ym.slice(5, 7)) - 1]} ${ym.slice(0, 4)}`;
const tituloCalendario = (page, testInfo) => (esDesktop(testInfo)
  ? page.getByRole('heading', { level: 1 })
  : page.getByText(new RegExp(`^(Asignación de turnos · )?(${MESES.join('|')}) \\d{4}$`)));
const botonMesCal = (page, sentido) => page.getByRole('button', { name: sentido < 0 ? 'Mes anterior' : 'Mes siguiente' }).first();

async function mesMostrado(page, testInfo) {
  const texto = (await tituloCalendario(page, testInfo).textContent()).trim();
  const [, mes, anio] = texto.match(new RegExp(`(${MESES.join('|')}) (\\d{4})$`));
  return `${anio}-${String(MESES.indexOf(mes) + 1).padStart(2, '0')}`;
}

async function irAMes(page, testInfo, ym) {
  const actual = await mesMostrado(page, testInfo);
  const delta = (Number(ym.slice(0, 4)) - Number(actual.slice(0, 4))) * 12 + Number(ym.slice(5, 7)) - Number(actual.slice(5, 7));
  for (let i = 0; i < Math.abs(delta); i += 1) {
    await botonMesCal(page, delta).click();
    await esperarCalendario(page, testInfo);
  }
  await expect(tituloCalendario(page, testInfo)).toHaveText(new RegExp(`${textoMes(ym)}$`));
}

const celdaDia = (page, testInfo, iso) => (esDesktop(testInfo)
  ? page.getByRole('button', { name: new RegExp(`^${numDia(iso)} de ${mesMin(mesDe(iso))}:`) })
  : page.getByRole('button', { name: new RegExp(`^${numDia(iso)} de ${MESES[mesDe(iso) - 1]}(,|$)`) }));
const panelDiaDesktop = (page, iso) => page.getByRole('region', { name: `Detalle del ${capital(DIAS_LARGOS[diaSemana(iso)])} ${numDia(iso)} de ${mesMin(mesDe(iso))}` });

async function abrirDia(page, testInfo, iso) {
  await irAMes(page, testInfo, iso.slice(0, 7));
  await celdaDia(page, testInfo, iso).click();
  if (esDesktop(testInfo)) await expect(panelDiaDesktop(page, iso)).toBeVisible();
  else await expect(page.getByText('Cobertura del día', { exact: true })).toBeVisible();
}

// Detalle del turno (sheet en móvil, panel lateral en desktop).
const detalle = (page, testInfo) => (esDesktop(testInfo)
  ? page.getByRole('dialog', { name: 'Detalle del turno' })
  : page.getByText('Detalle del turno', { exact: true }).locator('xpath=../..'));

async function abrirDetalle(page, testInfo, turno) {
  const nombre = turno.idFuncionario == null ? `Cupo libre: ${turno.nombrePuesto}` : `Ver detalle de ${turno.nombreFuncionario}`;
  const zona = esDesktop(testInfo) ? panelDiaDesktop(page, turno.diaInicioTurno) : page;
  await zona.getByRole('button', { name: nombre, exact: true }).first().click();
  await expect(detalle(page, testInfo)).toBeVisible();
  return detalle(page, testInfo);
}

async function cerrarDetalle(page, testInfo) {
  if (esDesktop(testInfo)) await page.keyboard.press('Escape');
  else await page.mouse.click(195, 24); // el fondo oscuro del sheet de más arriba
  await expect(detalle(page, testInfo)).toHaveCount(0);
}

async function leerInfo(det, testInfo) {
  if (esDesktop(testInfo)) {
    return Object.fromEntries(await det.getByRole('region', { name: 'Información del turno' }).locator('.sgt-dt-ficha__fila')
      .evaluateAll((filas) => filas.map((f) => [f.querySelector('dt').textContent.trim(), f.querySelector('dd').textContent.trim()])));
  }
  return Object.fromEntries(await det.getByText('Información del turno', { exact: true }).locator('xpath=following-sibling::div[1]/div')
    .evaluateAll((filas) => filas.map((f) => [...f.querySelectorAll(':scope > span')].map((s) => s.textContent.trim()))));
}

// Integrantes por puesto, tal como los dibuja cada presentación.
async function leerEquipo(det, testInfo) {
  if (esDesktop(testInfo)) {
    return det.getByRole('region', { name: 'Integrantes del equipo por puesto' }).locator('.sgt-dt-equipo-fila').evaluateAll((filas) => filas.map((f) => ({
      puesto: f.querySelector('.sgt-dt-equipo-fila__puesto > span').textContent.trim(),
      chip: f.querySelector('.sgt-dt-equipo-fila__puesto .sgt-d-chip')?.textContent.trim() ?? null,
      personas: [...f.querySelectorAll('.sgt-dt-equipo-fila__nombre')].map((n) => n.textContent.trim().replace(/\s*\(tú\)$/, ' (tú)')).sort(),
      vacantes: f.querySelectorAll('.sgt-dt-equipo-fila__libre').length,
    })));
  }
  return det.getByText('Integrantes del equipo por puesto', { exact: true }).locator('xpath=following-sibling::div[1]/div').evaluateAll((tarjetas) => tarjetas.map((t) => {
    const [cabecera, cuerpo] = t.children;
    const spans = cabecera.querySelectorAll(':scope > span');
    const items = [...cuerpo.children];
    const esVacante = (el) => /Cupo libre|Asignar funcionario a este cupo|Ya solicitaste este turno/.test(el.textContent);
    return {
      puesto: spans[0].textContent.trim(),
      chip: spans[1]?.textContent.trim() ?? null,
      personas: items.filter((el) => !esVacante(el)).map((el) => el.querySelector(':scope > span').textContent.trim().replace(/\s*\(tú\)$/, ' (tú)')).sort(),
      vacantes: items.filter(esVacante).length,
    };
  }));
}

// Equipo esperado de un bloque (misma fecha y tipo de turno), por puesto.
function equipoEsperado(bloque, idYo) {
  const porPuesto = new Map();
  bloque.forEach((t) => {
    const k = t.nombrePuesto || 'Sin puesto';
    if (!porPuesto.has(k)) porPuesto.set(k, { puesto: k, personas: [], vacantes: 0 });
    if (t.idFuncionario == null) porPuesto.get(k).vacantes += 1;
    else porPuesto.get(k).personas.push(`${t.nombreFuncionario}${t.idFuncionario === idYo ? ' (tú)' : ''}`);
  });
  return [...porPuesto.values()].map((p) => ({
    ...p,
    personas: p.personas.sort(),
    chip: p.vacantes > 0 ? `Falta cubrir${p.vacantes > 1 ? ` ×${p.vacantes}` : ''}` : null,
  }));
}

async function datosMes(api, servicioId, ym) {
  const [y, m] = ym.split('-').map(Number);
  const turnos = await api.get(`/turnos/servicio/${servicioId}/calendario/${y}/${m}`);
  return { turnos, porDia: turnosPorDia(turnos) };
}
const bloqueDe = (turnos, t) => turnos.filter((x) => x.diaInicioTurno === t.diaInicioTurno && x.idTipoTurno === t.idTipoTurno);

// ═════════════════════════════════════════════════════════════════════════════
// HU-CAL-06 · Ver el calendario mensual del servicio
// ═════════════════════════════════════════════════════════════════════════════

test('HU-CAL-06 · criterio 1: ← y → cambian el mes del título', async ({ page }, testInfo) => {
  await entrar(page, 'medico');
  await abrirCalendario(page, testInfo);
  const hoy = hoyChile().slice(0, 7);
  const prefijo = esDesktop(testInfo) ? 'Calendario · ' : '';
  await expect(tituloCalendario(page, testInfo)).toHaveText(`${prefijo}${textoMes(hoy)}`);
  await botonMesCal(page, +1).click();
  await expect(tituloCalendario(page, testInfo)).toHaveText(`${prefijo}${textoMes(mesRelativo(`${hoy}-01`, 1))}`);
  await botonMesCal(page, -1).click();
  await botonMesCal(page, -1).click();
  await expect(tituloCalendario(page, testInfo)).toHaveText(`${prefijo}${textoMes(mesRelativo(`${hoy}-01`, -1))}`);
  await botonMesCal(page, +1).click();
  await expect(tituloCalendario(page, testInfo)).toHaveText(`${prefijo}${textoMes(hoy)}`);
});

test('HU-CAL-06 · criterio 2: móvil: puntos «Mi turno» y «Cupo libre», leyenda y resumen «Cobertura del día»', async ({ page, api }, testInfo) => {
  test.skip(!esMovil(testInfo), 'El criterio 2 describe el calendario móvil (el 3 es el desktop).');
  await entrar(page, 'medico');
  const ym = hoyChile().slice(0, 7);
  const { porDia } = await datosMes(api, SERVICIO.urgencias, ym);
  await abrirCalendario(page, testInfo);

  // Leyenda: solo las dos entradas.
  const leyenda = page.getByText('Mi turno', { exact: true }).locator('xpath=../..');
  await expect(leyenda.locator(':scope > div')).toHaveText(['Mi turno', 'Cupo libre']);

  // A lo más dos puntos por día, y los que corresponden según la API.
  const celdas = await page.locator('button.cal-day-cell').evaluateAll((bs) => bs.map((b) => ({
    etiqueta: b.getAttribute('aria-label'), puntos: b.querySelector(':scope > div:nth-child(2)').children.length,
  })));
  const [y, m] = ym.split('-').map(Number);
  for (let d = 1; d <= new Date(Date.UTC(y, m, 0)).getUTCDate(); d += 1) {
    const iso = `${ym}-${String(d).padStart(2, '0')}`;
    const ts = porDia.get(iso) || [];
    const mio = ts.some((t) => t.idFuncionario === ID.medico);
    const libre = ts.some((t) => t.idFuncionario == null);
    const celda = celdas.find((c) => c.etiqueta.startsWith(`${d} de ${MESES[m - 1]}`));
    expect(celda.etiqueta, iso).toBe(`${d} de ${MESES[m - 1]}${mio ? ', tienes turno' : ''}${libre ? ', cupo libre' : ''}`);
    expect(celda.puntos, iso).toBe((mio ? 1 : 0) + (libre ? 1 : 0));
  }

  // Un día con turnos pero sin puntos (completo y sin turno propio) abre el resumen.
  const sinPuntos = [...porDia.keys()].sort().find((iso) => iso.startsWith(ym)
    && porDia.get(iso).every((t) => t.idFuncionario != null && t.idFuncionario !== ID.medico));
  expect(sinPuntos, 'hay un día con turnos y sin puntos').toBeTruthy();
  await celdaDia(page, testInfo, sinPuntos).click();
  const resumen = page.getByText('Cobertura del día', { exact: true }).locator('xpath=following-sibling::div[1]/div');
  const ts = porDia.get(sinPuntos);
  const asignados = ts.filter((t) => t.idFuncionario != null).length;
  await expect(resumen).toHaveText([`Asignados${asignados}`, `Total${ts.length}`, `Vacantes${ts.length - asignados}`]);
  for (const nocturno of [false, true]) {
    const bloque = ts.filter((t) => deNoche(t) === nocturno);
    if (!bloque.length) continue;
    await expect(page.getByText(`${bloque[0].nombreTipoTurno}: ${rotativaDelBloque(bloque)}`, { exact: true }), `${sinPuntos} ${nocturno ? 'noche' : 'día'}`).toBeVisible();
  }
  await page.mouse.click(195, 24);
  await expect(page.getByText('Cobertura del día', { exact: true })).toHaveCount(0);

  // Un día sin turnos no responde.
  const vacio = [...Array(28).keys()].map((i) => `${ym}-${String(i + 1).padStart(2, '0')}`).find((iso) => !porDia.has(iso));
  if (vacio) {
    await celdaDia(page, testInfo, vacio).click();
    await page.waitForTimeout(300);
    await expect(page.getByText('Cobertura del día', { exact: true })).toHaveCount(0);
    await expect(celdaDia(page, testInfo, vacio)).toHaveAttribute('aria-pressed', 'false');
  }
});

test('HU-CAL-06 · criterio 3: desktop: cobertura Día/Noche por día, «TÚ», panel del día, teclado y «Hoy»', async ({ page, api }, testInfo) => {
  test.skip(!esDesktop(testInfo), 'El criterio 3 describe el calendario desktop (el 2 es el móvil).');
  await entrar(page, 'medico');
  const hoy = hoyChile();
  const ym = hoy.slice(0, 7);
  const { porDia } = await datosMes(api, SERVICIO.urgencias, ym);
  await abrirCalendario(page, testInfo);

  const celdas = await page.locator('.sgt-dt-cal__dias button.sgt-dt-dia').evaluateAll((bs) => bs.map((b) => ({
    dia: Number(b.dataset.dia),
    tu: Boolean(b.querySelector('.sgt-dt-dia__marca')),
    bloques: [...b.querySelectorAll('.sgt-dt-bloque')].map((x) => ({
      noche: x.classList.contains('sgt-dt-bloque--noche'),
      cob: x.querySelector('.sgt-dt-bloque__cob').textContent.trim(),
      ok: x.querySelector('.sgt-dt-bloque__cob').classList.contains('sgt-dt-bloque__cob--ok'),
      color: getComputedStyle(x.querySelector('.sgt-dt-bloque__cob')).color,
    })),
  })));
  const conTurnos = [...porDia.keys()].filter((iso) => iso.startsWith(ym)).sort();
  expect(celdas.map((c) => c.dia)).toEqual(conTurnos.map(numDia));
  for (const iso of conTurnos) {
    const ts = porDia.get(iso);
    const celda = celdas.find((c) => c.dia === numDia(iso));
    expect(celda.tu, `${iso}: «TÚ» en mis turnos`).toBe(ts.some((t) => t.idFuncionario === ID.medico));
    const esperados = [false, true].map((noche) => ts.filter((t) => deNoche(t) === noche)).filter((b) => b.length).map((b) => {
      const a = b.filter((t) => t.idFuncionario != null).length;
      return { noche: deNoche(b[0]), cob: `${a}/${b.length}`, ok: a === b.length, color: a === b.length ? 'rgb(46, 125, 87)' : 'rgb(184, 90, 96)' };
    });
    expect(celda.bloques, iso).toEqual(esperados);
  }

  // El panel del día está siempre visible: parte en hoy.
  const panelHoy = panelDiaDesktop(page, hoy);
  await expect(panelHoy).toBeVisible();
  await expect(page.getByRole('button', { name: 'Ir a hoy' })).toBeDisabled();

  // Las flechas mueven el día (entre días con turnos).
  const dias = conTurnos.map(numDia);
  const siguiente = dias.find((d) => d > numDia(hoy));
  const anterior = [...dias].reverse().find((d) => d < numDia(hoy));
  const semanaDespues = dias.find((d) => d >= numDia(hoy) + 7);
  await celdaDia(page, testInfo, hoy).focus();
  const [ida, vuelta, otro] = siguiente ? ['ArrowRight', 'ArrowLeft', siguiente] : ['ArrowLeft', 'ArrowRight', anterior];
  await page.keyboard.press(ida);
  await expect(panelDiaDesktop(page, `${ym}-${String(otro).padStart(2, '0')}`)).toBeVisible();
  await page.keyboard.press(vuelta);
  await expect(panelHoy).toBeVisible();
  if (semanaDespues === numDia(hoy) + 7) {
    await page.keyboard.press('ArrowDown');
    await expect(panelDiaDesktop(page, sumarDias(hoy, 7))).toBeVisible();
  }

  // «Hoy» vuelve al día actual, también desde otro mes.
  await botonMesCal(page, +1).click();
  await esperarCalendario(page, testInfo);
  await page.getByRole('button', { name: 'Ir a hoy' }).click();
  await expect(tituloCalendario(page, testInfo)).toHaveText(`Calendario · ${textoMes(ym)}`);
  await expect(panelHoy).toBeVisible();
});

test('HU-CAL-06 · criterio 4: cada persona y cada cupo del día abren el detalle del turno', async ({ page, api }, testInfo) => {
  await entrar(page, 'medico');
  const hoy = hoyChile();
  const turnos = await turnosDosMeses(api);
  const porDia = turnosPorDia(turnos);
  const dia = [...porDia.keys()].sort().find((iso) => iso >= hoy && porDia.get(iso).some((t) => t.idFuncionario == null));
  expect(dia, 'hay un día con cupos libres de hoy en adelante').toBeTruthy();
  await abrirCalendario(page, testInfo);
  await abrirDia(page, testInfo, dia);

  const delDia = turnos.filter((x) => x.diaInicioTurno === dia);
  const zona = esDesktop(testInfo) ? panelDiaDesktop(page, dia) : page;
  const botones = zona.getByRole('button', { name: /^(Ver detalle de |Cupo libre: )/ });
  await expect(botones).toHaveCount(delDia.length);
  const nombres = await botones.evaluateAll((bs) => bs.map((b) => b.getAttribute('aria-label')));
  for (const [i, nombre] of nombres.entries()) {
    // Puestos posibles para ese botón (una persona puede tener día y noche).
    const candidatos = delDia.filter((t) => (t.idFuncionario == null ? `Cupo libre: ${t.nombrePuesto}` : `Ver detalle de ${t.nombreFuncionario}`) === nombre);
    expect(candidatos.length, `${dia}: «${nombre}» corresponde a un turno del día`).toBeGreaterThan(0);
    await botones.nth(i).click();
    const info = await leerInfo(detalle(page, testInfo), testInfo);
    if (nombre.startsWith('Cupo libre: ')) expect(info.Estado, `${dia} · ${nombre}`).toBe('Cupo libre');
    else expect(info.Funcionario, `${dia} · ${nombre}`).toBe(candidatos[0].nombreFuncionario);
    expect(candidatos.map((t) => t.nombrePuesto), `${dia} · ${nombre}`).toContain(info.Puesto);
    await cerrarDetalle(page, testInfo);
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// HU-CAL-08 · Exportar los turnos de todo el servicio (CSV)
// ═════════════════════════════════════════════════════════════════════════════

const ORIGENES = ['Rotativa habitual', 'Asignación manual', 'Solicitud', 'Cambio / intercambio', 'Oferta particular', 'Oferta general', 'Sin información'];

function leerCsv(texto) {
  expect(texto.charCodeAt(0), 'UTF-8 con BOM').toBe(0xFEFF);
  const lineas = texto.slice(1).split(/\r?\n/).filter((l) => l.trim() !== '');
  const campos = (linea) => {
    const out = [];
    let actual = '';
    let comillas = false;
    for (const c of linea) {
      if (c === '"') comillas = !comillas;
      else if (c === ';' && !comillas) { out.push(actual); actual = ''; } else actual += c;
    }
    out.push(actual);
    return out;
  };
  const [cabecera, ...filas] = lineas.map(campos);
  return { cabecera, filas: filas.map((f) => Object.fromEntries(cabecera.map((h, i) => [h, f[i]]))) };
}

async function abrirExportar(page, testInfo) {
  await page.getByRole('button', { name: /^Exportar( turnos)? CSV$/ }).click();
  const hoja = esDesktop(testInfo)
    ? page.getByRole('dialog', { name: 'Exportar turnos CSV' })
    : page.getByText('Mes a exportar', { exact: true }).locator('xpath=../..');
  await expect(hoja).toBeVisible();
  return hoja;
}

async function descargar(page, hoja, { alcance, mesesAdelante = 0, mes }) {
  for (let i = 0; i < mesesAdelante; i += 1) await hoja.getByRole('button', { name: 'Mes siguiente' }).click();
  if (mes) await expect(hoja).toContainText(textoMes(mes));
  await hoja.getByRole('radio', { name: new RegExp(`^${alcance}`) }).check();
  const descarga = page.waitForEvent('download');
  const exito = verFugaz(page, '¡Descargado!');
  await hoja.getByRole('button', { name: 'Descargar CSV' }).click();
  const archivo = await descarga;
  await exito;
  return leerCsv(fs.readFileSync(await archivo.path(), 'utf8'));
}

test('HU-CAL-08 · criterio 1: «Todo el servicio» trae todos los turnos del mes con origen y detalle', async ({ page, api }, testInfo) => {
  await entrar(page, 'jefatura');
  const ym = hoyChile().slice(0, 7);
  const { turnos } = await datosMes(api, SERVICIO.urgencias, ym);
  await abrirCalendario(page, testInfo);
  const hoja = await abrirExportar(page, testInfo);
  const { cabecera, filas } = await descargar(page, hoja, { alcance: 'Todo el servicio', mes: ym });

  expect(cabecera).toEqual(expect.arrayContaining(['ID Turno', 'ID Funcionario', 'Origen Turno', 'Detalle Origen']));
  expect(filas.map((f) => Number(f['ID Turno'])).sort((a, b) => a - b)).toEqual(turnos.map((t) => t.id).sort((a, b) => a - b));
  for (const f of filas) {
    expect(ORIGENES, `turno ${f['ID Turno']}: origen «${f['Origen Turno']}»`).toContain(f['Origen Turno']);
    expect(f['Detalle Origen'], `turno ${f['ID Turno']}: detalle del origen`).toBeTruthy();
  }
});

test('HU-CAL-08 · criterio 2: «Solo mis turnos» trae solo los míos', async ({ page, api }, testInfo) => {
  await entrar(page, 'jefatura');
  const ym = hoyChile().slice(0, 7);
  const { turnos } = await datosMes(api, SERVICIO.urgencias, ym);
  const mios = turnos.filter((t) => t.idFuncionario === ID.jefatura);
  expect(mios.length, 'la jefatura tiene turnos este mes').toBeGreaterThan(0);
  await abrirCalendario(page, testInfo);
  const { filas } = await descargar(page, await abrirExportar(page, testInfo), { alcance: 'Solo mis turnos', mes: ym });
  expect(filas.map((f) => Number(f['ID Turno'])).sort((a, b) => a - b)).toEqual(mios.map((t) => t.id).sort((a, b) => a - b));
  expect(new Set(filas.map((f) => f['ID Funcionario']))).toEqual(new Set([String(ID.jefatura)]));
});

test('HU-CAL-08 · criterio 3: un mes sin turnos genera un archivo con solo los encabezados', async ({ page, api }, testInfo) => {
  await entrar(page, 'jefatura');
  const hoy = hoyChile();
  const todos = await api.get(`/turnos/servicio/${SERVICIO.urgencias}`);
  const conTurnos = new Set(todos.map((t) => t.diaInicioTurno.slice(0, 7)));
  let delta = 1;
  while (conTurnos.has(mesRelativo(hoy, delta))) delta += 1;
  await abrirCalendario(page, testInfo);
  const hoja = await abrirExportar(page, testInfo);
  const { cabecera, filas } = await descargar(page, hoja, { alcance: 'Todo el servicio', mesesAdelante: delta, mes: mesRelativo(hoy, delta) });
  expect(cabecera).toContain('Origen Turno');
  expect(filas).toEqual([]);
  await expect(page.getByText('No se pudo exportar. Intenta de nuevo.')).toHaveCount(0);
});

// ═════════════════════════════════════════════════════════════════════════════
// HU-DET-01 · Ver el detalle de un turno
// ═════════════════════════════════════════════════════════════════════════════

// Turnos del mes actual y del siguiente: cerca de fin de mes quedan pocos días.
async function turnosDosMeses(api) {
  const hoy = hoyChile();
  const meses = await Promise.all([hoy.slice(0, 7), mesRelativo(hoy, 1)].map((ym) => datosMes(api, SERVICIO.urgencias, ym)));
  return meses.flatMap((m) => m.turnos);
}

// Tres turnos desde hoy: uno mío (en un bloque con vacantes), uno de otra
// persona en un bloque completo y un cupo libre.
async function turnosParaDetalle(api) {
  const hoy = hoyChile();
  const turnos = await turnosDosMeses(api);
  const futuros = turnos.filter((t) => t.diaInicioTurno >= hoy);
  const completo = (t) => bloqueDe(turnos, t).every((x) => x.idFuncionario != null);
  // El botón del día se busca por su nombre («Ver detalle de …» o «Cupo libre: …»):
  // se eligen turnos cuyo botón no se repite ese día (alguien con día y noche).
  const nombreBoton = (t) => (t.idFuncionario == null ? `L:${t.nombrePuesto}` : `P:${t.nombreFuncionario}`);
  const unico = (t) => turnos.filter((x) => x.diaInicioTurno === t.diaInicioTurno && nombreBoton(x) === nombreBoton(t)).length === 1;
  return {
    turnos,
    mio: futuros.find((t) => t.idFuncionario === ID.medico && !completo(t) && unico(t)),
    ajeno: futuros.find((t) => t.idFuncionario != null && t.idFuncionario !== ID.medico && completo(t) && unico(t)),
    libre: futuros.find((t) => t.idFuncionario == null && unico(t)),
  };
}

test('HU-DET-01 · criterio 1: encabezado con tipo y rotativa, horario, fecha y cobertura', async ({ page, api }, testInfo) => {
  await entrar(page, 'medico');
  const { turnos, mio, ajeno, libre } = await turnosParaDetalle(api);
  await abrirCalendario(page, testInfo);
  for (const t of [mio, ajeno, libre]) {
    const bloque = bloqueDe(turnos, t);
    const a = bloque.filter((x) => x.idFuncionario != null).length;
    const rot = limpiarRot(t.nombreRotativa) || rotativaDelBloque(bloque);
    const [y, m, d] = [anioDe(t.diaInicioTurno), mesDe(t.diaInicioTurno), numDia(t.diaInicioTurno)];
    await abrirDia(page, testInfo, t.diaInicioTurno);
    const det = await abrirDetalle(page, testInfo, t);
    const contexto = `${t.diaInicioTurno} · ${t.nombrePuesto}`;
    if (esDesktop(testInfo)) {
      await expect(det.locator('.sgt-dt-detalle__tipo'), contexto).toHaveText(`${t.nombreTipoTurno} · ${rot}`);
      await expect(det.locator('.sgt-dt-detalle__horario')).toHaveText(`${hhmm(t.horaInicio)} – ${hhmm(t.horaFin)}`);
      await expect(det.locator('.sgt-dt-detalle__fecha')).toHaveText(`${capital(DIAS_LARGOS[diaSemana(t.diaInicioTurno)])} ${d} de ${mesMin(m)} de ${y}`);
      await expect(det.locator('.sgt-dt-detalle__cabecera .sgt-d-chip'), contexto)
        .toHaveText(a === bloque.length ? `Equipo completo · ${a}/${bloque.length}` : `${a}/${bloque.length} · faltan ${bloque.length - a}`);
    } else {
      await expect(det, contexto).toContainText(`${t.nombreTipoTurno}: ${rot}`);
      await expect(det).toContainText(`${hhmm(t.horaInicio)} – ${hhmm(t.horaFin)}`);
      await expect(det).toContainText(`Fecha: ${t.diaInicioTurno}`);
      await expect(det, contexto).toContainText(a === bloque.length
        ? `Equipo completo · ${a}/${bloque.length}` : `${a}/${bloque.length} asignados · faltan ${bloque.length - a}`);
    }
    await cerrarDetalle(page, testInfo);
    if (esMovil(testInfo)) await page.mouse.click(195, 24); // cierra el sheet del día
  }
});

test('HU-DET-01 · criterio 2: Estado, Funcionario, Puesto y Duración, desde la agenda', async ({ page, api }, testInfo) => {
  test.skip(!esMovil(testInfo), 'En desktop el inicio es el Centro de operaciones: el detalle del turno se abre desde el calendario.');
  await entrar(page, 'medico');
  const turnos = await api.get(`/turnos/servicio/${SERVICIO.urgencias}`);
  const yo = await usuarioSesion(page);
  const hoy = hoyChile();
  const mio = turnos.filter((t) => t.idFuncionario === ID.medico && t.diaInicioTurno >= hoy).sort((a, b) => a.diaInicioTurno.localeCompare(b.diaInicioTurno))[0];
  const abrirDesdeAgenda = async () => {
    await page.locator('.day-row').filter({ has: page.locator('.day-header-btn[aria-label*="turno"]') }).first().locator('.day-header-btn').click();
    await page.getByRole('button', { name: /^Ver detalle: / }).filter({ hasText: 'Tu turno' }).first().click();
    return detalle(page, testInfo);
  };

  let det = await abrirDesdeAgenda();
  expect(await leerInfo(det, testInfo)).toEqual({
    Estado: 'Tu turno', Funcionario: nombreSesion(yo), Puesto: mio.nombrePuesto, Duración: `${horasDe(mio)} horas`,
  });
  await cerrarDetalle(page, testInfo);

  // «Solicitud pendiente»: el backend marca los turnos con una solicitud del usuario (simulado).
  await page.route(/\/api\/v2\/turnos\/servicio\/4$/, async (route) => {
    const r = await route.fetch();
    return route.fulfill({ response: r, json: (await r.json()).map((t) => (t.id === mio.id ? { ...t, solicitudPendiente: true } : t)) });
  });
  await page.reload();
  await esperarQuieta(page);
  det = await abrirDesdeAgenda();
  expect((await leerInfo(det, testInfo)).Estado).toBe('Solicitud pendiente');
});

test('HU-DET-01 · criterio 2: estados «Tu turno», «Asignado» y «Cupo libre», con funcionario y puesto, desde el calendario', async ({ page, api }, testInfo) => {
  await entrar(page, 'medico');
  const { mio, ajeno, libre } = await turnosParaDetalle(api);
  const yo = await usuarioSesion(page);
  await abrirCalendario(page, testInfo);
  for (const [t, estado, funcionario] of [[mio, 'Tu turno', nombreSesion(yo)], [ajeno, 'Asignado', ajeno.nombreFuncionario], [libre, 'Cupo libre', undefined]]) {
    await abrirDia(page, testInfo, t.diaInicioTurno);
    const info = await leerInfo(await abrirDetalle(page, testInfo, t), testInfo);
    expect(info.Estado, `${t.diaInicioTurno} · ${t.nombrePuesto}`).toBe(estado);
    expect(info.Funcionario).toBe(funcionario);
    expect(info.Puesto).toBe(t.nombrePuesto);
    await cerrarDetalle(page, testInfo);
    if (esMovil(testInfo)) await page.mouse.click(195, 24);
  }
});

test('HU-DET-01 · criterio 2: la Duración, desde el calendario', async ({ page, api }, testInfo) => {
  fallaConocida('§5.1: el calendario arma sus turnos sin las horas (turnosService.mapTurnoCalendario no copia «horas»), así que su detalle no muestra «Duración» (ShiftDetail la muestra solo si shift.horas != null).');
  await entrar(page, 'medico');
  const { mio, ajeno } = await turnosParaDetalle(api);
  await abrirCalendario(page, testInfo);
  for (const t of [mio, ajeno]) {
    await abrirDia(page, testInfo, t.diaInicioTurno);
    const info = await leerInfo(await abrirDetalle(page, testInfo, t), testInfo);
    expect(info['Duración'], `${t.diaInicioTurno} · ${t.nombrePuesto}`).toBe(`${horasDe(t)} horas`);
    await cerrarDetalle(page, testInfo);
    if (esMovil(testInfo)) await page.mouse.click(195, 24);
  }
});

test('HU-DET-01 · criterio 2: «Solicitud pendiente», desde el calendario (marca del backend simulada)', async ({ page, api }, testInfo) => {
  fallaConocida('§5.1: el backend marca solicitudPendiente en GET /turnos/servicio/{id}/calendario (TurnoService.getTurnosCalendario), pero turnosService.mapTurnoCalendario no la copia: desde el calendario nunca se ve «Solicitud pendiente».');
  await entrar(page, 'medico');
  const { mio } = await turnosParaDetalle(api);
  await page.route(/\/api\/v2\/turnos\/servicio\/4\/calendario\/\d+\/\d+$/, async (route) => {
    const r = await route.fetch();
    return route.fulfill({ response: r, json: (await r.json()).map((t) => (t.id === mio.id ? { ...t, solicitudPendiente: true } : t)) });
  });
  await abrirCalendario(page, testInfo);
  await abrirDia(page, testInfo, mio.diaInicioTurno);
  expect((await leerInfo(await abrirDetalle(page, testInfo, mio), testInfo)).Estado).toBe('Solicitud pendiente');
});

test('HU-DET-01 · criterio 3: integrantes por puesto, «(tú)» y las vacantes con «Falta cubrir»', async ({ page, api }, testInfo) => {
  await entrar(page, 'medico');
  const { turnos, mio, ajeno } = await turnosParaDetalle(api);
  await abrirCalendario(page, testInfo);
  for (const t of [mio, ajeno]) {
    await abrirDia(page, testInfo, t.diaInicioTurno);
    const det = await abrirDetalle(page, testInfo, t);
    const visto = await leerEquipo(det, testInfo);
    const esperado = equipoEsperado(bloqueDe(turnos, t), ID.medico);
    const ordenar = (lista) => [...lista].sort((x, y) => x.puesto.localeCompare(y.puesto));
    expect(ordenar(visto), `${t.diaInicioTurno} · ${t.nombreTipoTurno}`).toEqual(ordenar(esperado));
    await cerrarDetalle(page, testInfo);
    if (esMovil(testInfo)) await page.mouse.click(195, 24);
  }
});

test('HU-DET-01 · criterio 3: «Falta cubrir ×n» con varias vacantes en el mismo puesto (datos simulados)', async ({ page, api }, testInfo) => {
  await entrar(page, 'medico');
  const { turnos, mio } = await turnosParaDetalle(api);
  const bloque = bloqueDe(turnos, mio);
  // Otra persona del bloque pasa a ser una segunda vacante del puesto de una vacante real.
  const vacante = bloque.find((t) => t.idFuncionario == null);
  const otro = bloque.find((t) => t.idFuncionario != null && t.idFuncionario !== ID.medico);
  await page.route(/\/api\/v2\/turnos\/servicio\/4\/calendario\/\d+\/\d+$/, async (route) => {
    const r = await route.fetch();
    return route.fulfill({
      response: r,
      json: (await r.json()).map((t) => (t.id === otro.id
        ? { ...t, idFuncionario: null, nombreFuncionario: 'Sin Asignar', rutFuncionario: null, idPuesto: vacante.idPuesto, nombrePuesto: vacante.nombrePuesto }
        : t)),
    });
  });
  await abrirCalendario(page, testInfo);
  await abrirDia(page, testInfo, mio.diaInicioTurno);
  const visto = await leerEquipo(await abrirDetalle(page, testInfo, mio), testInfo);
  const fila = visto.find((f) => f.puesto === vacante.nombrePuesto);
  expect(fila.chip).toBe(`Falta cubrir ×${bloque.filter((t) => t.idFuncionario == null && t.nombrePuesto === vacante.nombrePuesto).length + 1}`);
  expect(fila.vacantes).toBeGreaterThanOrEqual(2);
});

test('HU-DET-01 · criterio 4: siempre está «Ver historial»', async ({ page, api }, testInfo) => {
  await entrar(page, 'medico');
  const { mio, ajeno, libre } = await turnosParaDetalle(api);
  await abrirCalendario(page, testInfo);
  for (const t of [mio, ajeno, libre]) {
    await abrirDia(page, testInfo, t.diaInicioTurno);
    const det = await abrirDetalle(page, testInfo, t);
    await expect(det.getByRole('button', { name: 'Ver historial' }), `${t.diaInicioTurno} · ${t.nombrePuesto}`).toBeVisible();
    await cerrarDetalle(page, testInfo);
    if (esMovil(testInfo)) await page.mouse.click(195, 24);
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// HU-DET-03 · Elegir receptor y su turno para pedir un intercambio (sin enviar)
// ═════════════════════════════════════════════════════════════════════════════

const RECEPTOR = 368; // segundo médico de Urgencias (catálogo §2.1)
const formatoTurno = (t) => `${t.nombreTipoTurno} · ${t.diaInicioTurno} ${hhmm(t.horaInicio)}–${hhmm(t.horaFin)}`;

// Un turno propio y, del receptor, uno intercambiable y otro no (según la API),
// en días y bloques donde el médico no tiene turno.
async function casoIntercambio(api) {
  const hoy = hoyChile();
  const turnos = await turnosDosMeses(api);
  const mios = turnos.filter((t) => t.idFuncionario === ID.medico && t.diaInicioTurno > hoy);
  const libreDeMi = (t) => !turnos.some((x) => x.idFuncionario === ID.medico && x.diaInicioTurno === t.diaInicioTurno && x.idTipoTurno === t.idTipoTurno);
  for (const propio of mios) {
    const ids = new Set((await api.get(`/turnos/intercambiables?idTurnoPropio=${propio.id}&idFuncionarioReceptor=${RECEPTOR}`)).map((t) => t.id));
    const suyos = turnos.filter((t) => t.idFuncionario === RECEPTOR && t.diaInicioTurno > hoy && libreDeMi(t));
    const si = suyos.find((t) => ids.has(t.id));
    const no = suyos.find((t) => !ids.has(t.id));
    if (si && no) return { turnos, propio, si, no };
  }
  throw new Error('No se encontró un caso de intercambio en este mes ni en el siguiente');
}

async function marcarReceptor(page, testInfo, turnoReceptor) {
  await abrirDia(page, testInfo, turnoReceptor.diaInicioTurno);
  const det = await abrirDetalle(page, testInfo, turnoReceptor);
  await det.getByRole('button', { name: turnoReceptor.nombreFuncionario, exact: true }).click();
  return det;
}

const avisoReceptor = (page, testInfo, nombre) => (esDesktop(testInfo)
  ? page.locator('.sgt-dt-toast', { hasText: `Receptor: ${nombre}` })
  : page.getByText(`Receptor: ${nombre}`, { exact: true }));

test('HU-DET-03 · criterio 1: tocar a otra persona la marca como receptor, con aviso y marca', async ({ page, api }, testInfo) => {
  await entrar(page, 'medico');
  const { si } = await casoIntercambio(api);
  await abrirCalendario(page, testInfo);
  const det = await marcarReceptor(page, testInfo, si);
  await expect(avisoReceptor(page, testInfo, si.nombreFuncionario)).toBeVisible();
  await expect(det.getByText(`Receptor: ${si.nombreFuncionario} · ${formatoTurno(si)}`, { exact: true })).toBeVisible();
  if (esDesktop(testInfo)) {
    await expect(det.getByRole('button', { name: new RegExp(`^${si.nombreFuncionario}`) })).toHaveAttribute('aria-pressed', 'true');
  }
});

test('HU-DET-03 · criterio 2: si ya tengo turno en ese bloque, «Ya tienes un turno asignado en ese horario.» y no se marca', async ({ page, api }, testInfo) => {
  await entrar(page, 'medico');
  const { turnos, propio } = await casoIntercambio(api);
  const companero = bloqueDe(turnos, propio).find((t) => t.idFuncionario != null && t.idFuncionario !== ID.medico);
  await abrirCalendario(page, testInfo);
  const det = await marcarReceptor(page, testInfo, companero);
  const aviso = esDesktop(testInfo) ? page.locator('.sgt-dt-toast') : page.getByText('Ya tienes un turno asignado en ese horario.', { exact: true });
  await expect(aviso).toHaveText('Ya tienes un turno asignado en ese horario.');
  await expect(det.getByText(/^Receptor: /)).toHaveCount(0);
});

test('HU-DET-03 · criterio 3: en un turno ajeno sin receptor, «Selecciona receptor y su turno» deshabilitado', async ({ page, api }, testInfo) => {
  await entrar(page, 'medico');
  const { si } = await casoIntercambio(api);
  await abrirCalendario(page, testInfo);
  await abrirDia(page, testInfo, si.diaInicioTurno);
  const det = await abrirDetalle(page, testInfo, si);
  await expect(det.getByRole('button', { name: 'Selecciona receptor y su turno' })).toBeDisabled();
  await expect(det.getByRole('button', { name: 'Solicitar cambio' })).toHaveCount(0);
});

// Campos del intercambio precargado en «Nueva solicitud» (sin enviar): el
// valor que muestra cada selector, o null si no está.
async function camposIntercambio(page, testInfo) {
  if (esDesktop(testInfo)) {
    const panel = page.getByRole('dialog', { name: 'Nueva solicitud' });
    await expect(panel).toBeVisible();
    await expect(panel.getByRole('button', { name: 'Intercambio', exact: true })).toBeVisible();
    return {
      valor: async (etiqueta) => {
        const b = panel.getByRole('button', { name: new RegExp(`^${etiqueta}: `) });
        return (await b.count()) ? (await b.getAttribute('aria-label')).replace(new RegExp(`^${etiqueta}: `), '') : null;
      },
      cerrar: () => panel.getByRole('button', { name: 'Cancelar', exact: true }).click(),
    };
  }
  await expect(page.getByText('Intercambio', { exact: true })).toBeVisible();
  return {
    valor: async (etiqueta) => {
      const b = page.locator('label', { hasText: new RegExp(`^${etiqueta} \\*$`) }).locator('xpath=following-sibling::button[1]');
      return (await b.count()) ? (await b.textContent()).trim() : null;
    },
    cerrar: () => page.mouse.click(195, 24),
  };
}

// «19 oct 2026»: la fecha corta de los selectores, con el Intl del navegador.
const fechaCorta = (page, t) => page.evaluate((iso) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' });
}, t.diaInicioTurno);

for (const caso of ['intercambiable', 'no intercambiable']) {
  test(`HU-DET-03 · criterio 4: «Solicitar cambio» en mi turno precarga el intercambio (turno del receptor ${caso})`, async ({ page, api }, testInfo) => {
    await entrar(page, 'medico');
    const { propio, si, no } = await casoIntercambio(api);
    const suyo = caso === 'intercambiable' ? si : no;
    await abrirCalendario(page, testInfo);
    await marcarReceptor(page, testInfo, suyo);
    await cerrarDetalle(page, testInfo);
    if (esMovil(testInfo)) await page.mouse.click(195, 24);

    await abrirDia(page, testInfo, propio.diaInicioTurno);
    const det = await abrirDetalle(page, testInfo, propio);
    await det.getByRole('button', { name: 'Solicitar cambio' }).click();
    const campos = await camposIntercambio(page, testInfo);
    const persona = (await api.get(`/funcionarios/summary?servicioId=${SERVICIO.urgencias}`)).find((f) => f.idFuncionario === RECEPTOR);
    await expect.poll(() => campos.valor('Tu turno a entregar'), { message: 'tu turno a entregar' })
      .toBe(`${await fechaCorta(page, propio)} ${hhmm(propio.horaInicio)}–${hhmm(propio.horaFin)}`);
    await expect.poll(() => campos.valor('Con quién intercambiar'), { message: 'receptor' })
      .toBe([persona.nombre, persona.apellidoPaterno].filter(Boolean).join(' '));
    await expect.poll(() => campos.valor('Turno del receptor que quieres'), { message: caso === 'intercambiable' ? 'turno del receptor' : 'el turno no intercambiable se descarta (R14)' })
      .toBe(caso === 'intercambiable' ? `${await fechaCorta(page, suyo)} ${hhmm(suyo.horaInicio)}–${hhmm(suyo.horaFin)}` : 'Seleccionar turno');
    await campos.cerrar();
  });
}

// ═════════════════════════════════════════════════════════════════════════════
// HU-ASG-01 · Abrir la asignación de turnos
// ═════════════════════════════════════════════════════════════════════════════

const PANEL_DE = {
  jefatura: { boton: 'Panel de Jefatura', titulo: 'Centro de Gestión del Servicio' },
  subrogante: { boton: 'Panel de Subrogante', titulo: 'Administración' },
  admin: { boton: 'Panel de Administración', titulo: 'Administración' },
};

async function abrirAsignacion(page, testInfo, rol) {
  if (esDesktop(testInfo)) {
    await itemMenu(page, 'Asignación de turnos').click();
  } else {
    await barraInferior(page, 'Perfil').click();
    await page.getByRole('button', { name: new RegExp(`^${PANEL_DE[rol].boton}`) }).click();
    await page.getByRole('button', { name: /^Asignación de turnos\b/ }).click();
  }
  await esperarCalendario(page, testInfo);
}

for (const rol of ['jefatura', 'subrogante', 'admin']) {
  test(`HU-ASG-01 · criterio 1: título «Asignación de turnos · {Mes} {Año}» y ayuda en desktop (${rol})`, async ({ page }, testInfo) => {
    await entrar(page, rol);
    await abrirAsignacion(page, testInfo, rol);
    await expect(tituloCalendario(page, testInfo)).toHaveText(`Asignación de turnos · ${textoMes(hoyChile().slice(0, 7))}`);
    if (esDesktop(testInfo)) {
      await expect(page.locator('.sgt-d-encabezado__subtitulo')).toContainText('Elige un día para ver su equipo, asignar cupos libres o editar asignaciones');
    }
  });

  test(`HU-ASG-01 · criterio 2: el resumen del mes muestra asignados, total y vacantes, sin «mis turnos» (${rol})`, async ({ page, api }, testInfo) => {
    test.skip(esMovil(testInfo), 'El calendario móvil no tiene resumen del mes (solo el resumen de cada día): el criterio aplica a desktop (ver informe).');
    await entrar(page, rol);
    const { servicioId } = await usuarioSesion(page);
    const { turnos } = await datosMes(api, servicioId, hoyChile().slice(0, 7));
    const asignados = turnos.filter((t) => t.idFuncionario != null).length;
    await abrirAsignacion(page, testInfo, rol);
    const encabezado = page.locator('.sgt-d-encabezado__acciones');
    await expect(encabezado.getByText(`${asignados}/${turnos.length} asignados`, { exact: true })).toBeVisible();
    const vacantes = turnos.length - asignados;
    await expect(encabezado.getByText(`${vacantes} ${vacantes === 1 ? 'cupo libre' : 'cupos libres'}`, { exact: true })).toHaveCount(vacantes > 0 ? 1 : 0);
    await expect(encabezado.getByText(/turnos? tuyos?/)).toHaveCount(0);
  });

  test(`HU-ASG-01 · criterio 3: el volver regresa al panel del rol; en desktop, desde el menú, no hay volver (${rol})`, async ({ page }, testInfo) => {
    await entrar(page, rol);
    await abrirAsignacion(page, testInfo, rol);
    if (esDesktop(testInfo)) {
      await expect(page.getByRole('main').getByRole('button', { name: /^Volver/ })).toHaveCount(0);
      await expect(itemMenu(page, 'Asignación de turnos')).toHaveAttribute('aria-current', 'page');
    } else {
      await page.getByRole('button', { name: 'Volver', exact: true }).click();
      await expect(page.getByText(PANEL_DE[rol].titulo, { exact: true })).toBeVisible();
      await expect(page.getByRole('button', { name: /^Asignación de turnos\b/ })).toBeVisible();
    }
  });
}
