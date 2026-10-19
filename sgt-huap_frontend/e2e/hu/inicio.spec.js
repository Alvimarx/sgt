// HU del inicio, fase 1 del catálogo (§6.2), solo lectura:
//  - agenda móvil: HU-CAL-01 (todos sus criterios) y HU-CAL-02 (criterio 1),
//    que son solo móvil;
//  - Centro de operaciones: HU-CAL-05 (navegación), que es solo desktop. Las
//    acciones del Centro (aprobar, responder, asignar, seleccionar) se prueban
//    en la HU de cada acción (fases 3 y 4); aquí solo se abren y se cancelan.
//
// Lo esperado sale de la API del día (las fechas cambian: nada en duro). Los
// estados que la base de desarrollo no tiene (un turno comprometido, una
// propuesta recibida, postulaciones agrupadas, ofertas vigentes) se simulan
// respondiendo esas consultas GET en el navegador: nada se guarda.
import {
  test, expect, ID, SERVICIO, APOYO, MESES, esMovil, esDesktop,
  hoyChile, sumarDias, lunesDe, diaSemana, mesDe, anioDe,
  entrar, usuarioSesion, esperarQuieta, etiquetaDia, filtros, filtro, filaDia, esperarAgenda, leerAgenda,
} from '../helpers/hu.js';
import {
  diasVisiblesAgenda, turnosPorDia, cuposDisponiblesR9, rotativaDelBloque, esNoche, horasDe,
  solicitudSimulada, ofertaSimulada,
} from '../helpers/datos.js';

const SOLO_MOVIL = 'HU-CAL-01 y HU-CAL-02 son solo móvil: en desktop el inicio es el Centro de operaciones (HU-CAL-05).';
const SOLO_DESKTOP = 'HU-CAL-05 es solo desktop (Centro de operaciones).';
const URGENCIAS = { idServicio: SERVICIO.urgencias, nombre: 'Urgencias' };

const DIAS_LARGOS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const numDia = (iso) => Number(iso.slice(8, 10));
const hhmm = (h) => String(h).slice(0, 5);

// ── Agenda móvil ─────────────────────────────────────────────────────────────
// filtros, filtro, filaDia, esperarAgenda, leerAgenda y etiquetaDia viven en
// helpers/hu.js (los usa también la fase 3).

// Secuencia esperada a partir de una lista de días.
const secuencia = (dias) => {
  const out = [];
  let mes = null;
  for (const d of dias) {
    if (d.slice(0, 7) !== mes) { out.push(`M:${MESES[mesDe(d) - 1]} ${anioDe(d)}`); mes = d.slice(0, 7); }
    out.push(`D:${etiquetaDia(d)}`);
  }
  return out;
};

async function datosAgenda(api, idFuncionario, servicioId = SERVICIO.urgencias) {
  const turnos = await api.get(`/turnos/servicio/${servicioId}`);
  const hoy = hoyChile();
  const dias = diasVisiblesAgenda(turnos, hoy);
  const visibles = new Set(dias);
  const porDia = turnosPorDia(turnos);
  const mios = turnos.filter((t) => t.idFuncionario === idFuncionario && visibles.has(t.diaInicioTurno));
  return { turnos, hoy, dias, visibles, porDia, mios, misDias: [...new Set(mios.map((t) => t.diaInicioTurno))].sort() };
}

// ═════════════════════════════════════════════════════════════════════════════
// HU-CAL-01 · Ver mi agenda en el inicio (móvil)
// ═════════════════════════════════════════════════════════════════════════════

test('HU-CAL-01 · criterio 1: filtro inicial «Mis turnos» y los cuatro chips con su contador', async ({ page, api }, testInfo) => {
  test.skip(!esMovil(testInfo), SOLO_MOVIL);
  await entrar(page, 'medico');
  const { turnos, hoy, visibles, misDias } = await datosAgenda(api, ID.medico);
  const solicitudes = turnos.filter((t) => visibles.has(t.diaInicioTurno) && t.solicitudPendiente).length;
  const { disponibles } = cuposDisponiblesR9(turnos, ID.medico, hoy);
  const conContador = (base, n) => (n > 0 ? `${base} ${n}` : base);
  const esperados = ['Todos', conContador('Mis turnos', misDias.length), conContador('Solicitudes', solicitudes), conContador('Disponibles', disponibles.length)];

  await esperarAgenda(page);
  await expect(filtros(page).getByRole('tab')).toHaveCount(4);
  for (const nombre of esperados) await expect(filtros(page).getByRole('tab', { name: nombre, exact: true }), nombre).toBeVisible();
  await expect(filtros(page).getByRole('tab', { selected: true })).toHaveAccessibleName(esperados[1]);
});

test('HU-CAL-01 · criterio 2: días de hoy en adelante, separador por mes y marca «HOY»', async ({ page, api }, testInfo) => {
  test.skip(!esMovil(testInfo), SOLO_MOVIL);
  await entrar(page, 'medico');
  const { hoy, dias, porDia } = await datosAgenda(api, ID.medico);
  // Antes de hoy solo puede quedar un día con un turno que termina hoy o después.
  for (const d of dias.filter((x) => x < hoy)) {
    expect(porDia.get(d).some((t) => (t.diaFinalTurno || t.diaInicioTurno) >= hoy), `${d} aparece solo por una noche que termina hoy`).toBe(true);
  }

  await esperarAgenda(page);
  await filtro(page, 'Todos').click();
  const lista = await leerAgenda(page);
  expect(lista.map((x) => x.clave)).toEqual(secuencia(dias));
  const conHoy = lista.filter((x) => x.hoy);
  expect(conHoy.map((x) => x.clave), 'solo hoy lleva la marca').toEqual([`D:${etiquetaDia(hoy)}`]);
  await expect(filaDia(page, hoy).getByText('HOY', { exact: true })).toBeVisible();
});

test('HU-CAL-01 · criterio 3: un día con turno propio muestra horario, horas y «Tienes turno {tipo}: {rotativa}»', async ({ page, api }, testInfo) => {
  test.skip(!esMovil(testInfo), SOLO_MOVIL);
  await entrar(page, 'medico');
  const { mios, misDias } = await datosAgenda(api, ID.medico);
  expect(misDias.length).toBeGreaterThan(0);

  await esperarAgenda(page);
  const lista = await leerAgenda(page); // filtro «Mis turnos»
  expect(lista.filter((x) => x.clave.startsWith('D:')).map((x) => x.clave)).toEqual(misDias.map((d) => `D:${etiquetaDia(d)}`));
  for (const d of misDias) {
    const t = mios.find((x) => x.diaInicioTurno === d);
    const fila = lista.find((x) => x.clave === `D:${etiquetaDia(d)}`);
    expect(fila.texto, d).toContain(`${hhmm(t.horaInicio)} – ${hhmm(t.horaFin)}`);
    expect(fila.texto, d).toContain(`· ${horasDe(t)}h`);
    expect(fila.texto, d).toContain(`Tienes turno ${t.nombreTipoTurno}: ${t.nombreRotativa}`);
  }
});

test('HU-CAL-01 · criterio 3: turno propio sin rotativa → solo «Tienes turno {tipo}» (datos simulados)', async ({ page, api }, testInfo) => {
  test.skip(!esMovil(testInfo), SOLO_MOVIL);
  await entrar(page, 'medico');
  const { misDias, mios } = await datosAgenda(api, ID.medico);
  const elegido = mios.find((t) => t.diaInicioTurno === misDias[0]);
  // El backend manda «Sin Rotativa» cuando el turno no tiene (p. ej. una asignación manual).
  await page.route(/\/api\/v2\/turnos\/servicio\/4$/, async (route) => {
    const r = await route.fetch();
    const datos = (await r.json()).map((t) => (t.id === elegido.id ? { ...t, nombreRotativa: 'Sin Rotativa', idRotativa: null } : t));
    return route.fulfill({ response: r, json: datos });
  });
  await page.reload();
  await esperarAgenda(page);
  const texto = await filaDia(page, elegido.diaInicioTurno).locator('.day-header-btn').textContent();
  expect(texto).toContain(`Tienes turno ${elegido.nombreTipoTurno}`);
  expect(texto).not.toContain(`Tienes turno ${elegido.nombreTipoTurno}:`);
});

test('HU-CAL-01 · criterio 4: un día sin turno propio dice «Sin turno asignado» y sus cupos libres', async ({ page, api }, testInfo) => {
  test.skip(!esMovil(testInfo), SOLO_MOVIL);
  await entrar(page, 'medico');
  const { dias, porDia, misDias } = await datosAgenda(api, ID.medico);
  const sinTurno = dias.filter((d) => !misDias.includes(d));
  expect(sinTurno.some((d) => porDia.get(d).some((t) => t.idFuncionario == null)), 'hay días sin turno propio con cupos libres').toBe(true);

  await esperarAgenda(page);
  await filtro(page, 'Todos').click();
  const lista = await leerAgenda(page);
  for (const d of sinTurno) {
    const fila = lista.find((x) => x.clave === `D:${etiquetaDia(d)}`);
    const libres = porDia.get(d).filter((t) => t.idFuncionario == null).length;
    expect(fila.texto, d).toContain('Sin turno asignado');
    if (libres > 0) expect(fila.texto, d).toContain(`${libres} cupo${libres > 1 ? 's' : ''} libre${libres > 1 ? 's' : ''}`);
    else expect(fila.texto, d).not.toMatch(/cupos? libres?/);
  }
});

test('HU-CAL-01 · criterio 5: al expandir un día, una tarjeta por bloque con rotativa, «Tu turno» y cobertura', async ({ page, api }, testInfo) => {
  test.skip(!esMovil(testInfo), SOLO_MOVIL);
  await entrar(page, 'medico');
  const { hoy, dias, porDia, misDias } = await datosAgenda(api, ID.medico);
  const conTurno = misDias[0];
  const sinTurno = dias.find((d) => d > hoy && !misDias.includes(d));

  await esperarAgenda(page);
  await filtro(page, 'Todos').click();
  // Con «Todos», hoy aparece expandido y el resto no.
  const lista = await leerAgenda(page);
  expect(lista.filter((x) => x.expandido).map((x) => x.clave)).toEqual([`D:${etiquetaDia(hoy)}`]);

  for (const d of [conTurno, sinTurno]) {
    const fila = filaDia(page, d);
    await fila.locator('.day-header-btn').click();
    const bloques = new Map();
    porDia.get(d).forEach((t) => {
      const k = t.idTipoTurno;
      if (!bloques.has(k)) bloques.set(k, []);
      bloques.get(k).push(t);
    });
    const tarjetas = fila.locator('[role="button"][aria-label^="Ver detalle: "]');
    await expect(tarjetas).toHaveCount(bloques.size);
    for (const turnos of bloques.values()) {
      const titulo = `${turnos[0].nombreTipoTurno}: ${rotativaDelBloque(turnos)}`;
      const tarjeta = fila.getByRole('button', { name: `Ver detalle: ${titulo}`, exact: true });
      const total = turnos.length;
      const asignados = turnos.filter((t) => t.idFuncionario != null).length;
      const vacantes = total - asignados;
      await expect(tarjeta, `${d} · ${titulo}`).toContainText(vacantes > 0 ? `${asignados}/${total} · ${vacantes} libre` : `Completo ${asignados}/${total}`);
      const mio = turnos.some((t) => t.idFuncionario === ID.medico);
      await expect(tarjeta.getByText('Tu turno', { exact: true }), `${d} · ${titulo} «Tu turno»`).toHaveCount(mio ? 1 : 0);
    }
  }
});

test('HU-CAL-01 · criterio 6: el aviso muestra «Cambio de turno pendiente» por cada turno comprometido (datos simulados)', async ({ page, api }, testInfo) => {
  test.skip(!esMovil(testInfo), SOLO_MOVIL);
  await entrar(page, 'medico');
  const { mios } = await datosAgenda(api, ID.medico);
  const comprometidos = mios.filter((t) => t.diaInicioTurno >= hoyChile()).slice(0, 2);
  await page.route(/\/api\/v2\/turnos\/servicio\/4$/, async (route) => {
    const r = await route.fetch();
    const ids = new Set(comprometidos.map((t) => t.id));
    return route.fulfill({ response: r, json: (await r.json()).map((t) => (ids.has(t.id) ? { ...t, solicitudPendiente: true } : t)) });
  });
  await page.reload();
  await esperarAgenda(page);
  const items = page.getByText('Cambio de turno pendiente', { exact: true });
  await expect(items).toHaveCount(comprometidos.length);
  for (const [i, t] of comprometidos.entries()) {
    await expect(items.nth(i).locator('xpath=following-sibling::div[1]')).toHaveText(new RegExp(`\\b${numDia(t.diaInicioTurno)}\\b.* · Esperando respuesta$`));
  }
});

for (const rol of ['jefatura', 'subrogante']) {
  test(`HU-CAL-01 · criterio 6: «N turnos libres en agenda» con rol de gestión (${rol})`, async ({ page, api }, testInfo) => {
    test.skip(!esMovil(testInfo), SOLO_MOVIL);
    await entrar(page, rol);
    const { servicioId } = await usuarioSesion(page);
    const { turnos, visibles } = await datosAgenda(api, ID[rol], servicioId);
    const libresVisibles = turnos.filter((t) => t.idFuncionario == null && visibles.has(t.diaInicioTurno)).length;
    expect(libresVisibles).toBeGreaterThan(0);

    await esperarAgenda(page);
    const aviso = page.getByText(/^\d+ turnos? libres? en agenda$/);
    await expect(aviso).toBeVisible();
    const n = Number((await aviso.textContent()).match(/^\d+/)[0]);
    expect(n, 'cuenta al menos los cupos libres que muestra la agenda').toBeGreaterThanOrEqual(libresVisibles);
  });
}

test('HU-CAL-01 · criterio 6: el médico no ve el aviso de turnos libres', async ({ page }, testInfo) => {
  test.skip(!esMovil(testInfo), SOLO_MOVIL);
  await entrar(page, 'medico');
  await esperarAgenda(page);
  await expect(page.getByText(/turnos? libres? en agenda/)).toHaveCount(0);
});

test('HU-CAL-01 · criterio 6: «N turnos libres en agenda» cuenta solo los cupos de la agenda (de hoy en adelante)', async ({ page, api }, testInfo) => {
  test.skip(!esMovil(testInfo), SOLO_MOVIL);
  // P-01 (17 oct): el aviso cuenta solo los cupos de la agenda (antes, falla conocida).
  await entrar(page, 'jefatura');
  const { turnos, visibles } = await datosAgenda(api, ID.jefatura);
  const libresVisibles = turnos.filter((t) => t.idFuncionario == null && visibles.has(t.diaInicioTurno)).length;
  await esperarAgenda(page);
  await expect(page.getByText(`${libresVisibles} turno${libresVisibles > 1 ? 's' : ''} libre${libresVisibles > 1 ? 's' : ''} en agenda`, { exact: true })).toBeVisible({ timeout: 5_000 });
});

test('HU-CAL-01 · criterio 6 (C-09): el aviso ya no cuenta notificaciones sin leer', async ({ page, api }, testInfo) => {
  test.skip(!esMovil(testInfo), SOLO_MOVIL);
  // C-09 (19 oct): la bandeja está oculta para la entrega (src/config/funciones.js, NOTIFICACIONES_HABILITADAS),
  // así que el aviso del inicio no dice «N notificaciones sin leer»; el backend sigue contando la del seed.
  await entrar(page, 'notificaciones');
  expect(await api.get(`/notificaciones/sin-leer/${APOYO.notificaciones.id}`), 'el backend sigue contando la notificación sin leer').toBe(1);
  await esperarAgenda(page);
  await expect(page.getByText(/notificaci(o|ó)n(es)? sin leer/)).toHaveCount(0);
});

test('HU-CAL-01 · criterio 7: un filtro sin resultados dice «Sin turnos en esta categoría.»', async ({ page, api }, testInfo) => {
  test.skip(!esMovil(testInfo), SOLO_MOVIL);
  await entrar(page, 'medico');
  const { turnos, visibles } = await datosAgenda(api, ID.medico);
  expect(turnos.filter((t) => visibles.has(t.diaInicioTurno) && t.solicitudPendiente), 'el médico no tiene solicitudes pendientes').toHaveLength(0);
  await esperarAgenda(page);
  await filtro(page, 'Solicitudes').click();
  await expect(page.getByText('Sin turnos en esta categoría.', { exact: true })).toBeVisible();
  await expect(page.locator('.day-row')).toHaveCount(0);
});

test('HU-CAL-01 · criterio 7: si la carga falla, un mensaje sin detalles técnicos', async ({ page }, testInfo) => {
  test.skip(!esMovil(testInfo), SOLO_MOVIL);
  await entrar(page, 'medico');
  await page.route(/\/api\/v2\/turnos\/servicio\/4$/, (route) => route.abort('connectionrefused'));
  await page.reload();
  const alerta = page.getByRole('alert');
  await expect(alerta).toHaveText('No se pudieron cargar los turnos del servicio. Intenta de nuevo.');
  await expect(alerta).not.toHaveText(/error|axios|network|status|http|500|exception/i);
});

// ═════════════════════════════════════════════════════════════════════════════
// HU-CAL-02 · Ver solo los cupos que puedo tomar («Disponibles», R9)
// ═════════════════════════════════════════════════════════════════════════════

test('HU-CAL-02 · criterio 1: los cupos de un bloque donde ya tengo turno no cuentan ni aparecen en «Disponibles»', async ({ page, api }, testInfo) => {
  test.skip(!esMovil(testInfo), SOLO_MOVIL);
  await entrar(page, 'medico');
  const { turnos, hoy } = await datosAgenda(api, ID.medico);
  const { enMiBloque, disponibles } = cuposDisponiblesR9(turnos, ID.medico, hoy);
  expect(enMiBloque.length, 'hay cupos libres en bloques donde el médico tiene turno').toBeGreaterThan(0);
  const diasDisponibles = [...new Set(disponibles.map((t) => t.diaInicioTurno))].sort();
  // Días cuyos únicos cupos libres están en un bloque del médico: no deben aparecer.
  const soloMiBloque = [...new Set(enMiBloque.map((t) => t.diaInicioTurno))].filter((d) => !diasDisponibles.includes(d));
  expect(soloMiBloque.length).toBeGreaterThan(0);

  await esperarAgenda(page);
  await expect(filtros(page).getByRole('tab', { name: `Disponibles ${disponibles.length}`, exact: true })).toBeVisible();
  await filtro(page, 'Disponibles').click();
  const lista = await leerAgenda(page);
  const diasListados = lista.filter((x) => x.clave.startsWith('D:')).map((x) => x.clave);
  expect(diasListados).toEqual(diasDisponibles.map((d) => `D:${etiquetaDia(d)}`));
  for (const d of soloMiBloque) expect(diasListados, `${d}: sus cupos libres son del bloque del médico`).not.toContain(`D:${etiquetaDia(d)}`);
});

// ═════════════════════════════════════════════════════════════════════════════
// HU-CAL-05 · Centro de operaciones (inicio en desktop), navegación
// ═════════════════════════════════════════════════════════════════════════════

const semana = (page) => page.getByRole('region', { name: 'Semana completa' });
// Tarjetas de los paneles inferiores: hijos directos de la lista de cada panel.
const tarjetasDe = (region) => region.locator(':scope > div:nth-child(2) > div');
const diaExpandido = (page) => semana(page).locator(':scope > div');
const tituloSemana = (lunes) => {
  const fin = sumarDias(lunes, 6);
  return mesDe(lunes) === mesDe(fin)
    ? `Semana ${numDia(lunes)}–${numDia(fin)} ${MESES_CORTOS[mesDe(lunes) - 1]}`
    : `Semana ${numDia(lunes)} ${MESES_CORTOS[mesDe(lunes) - 1]} – ${numDia(fin)} ${MESES_CORTOS[mesDe(fin) - 1]}`;
};
const turnosSemana = (turnos, lunes) => turnos.filter((t) => t.diaInicioTurno >= lunes && t.diaInicioTurno <= sumarDias(lunes, 6));

async function abrirDiaCentro(page, iso) {
  const exp = diaExpandido(page);
  if ((await exp.locator('span').first().textContent())?.trim() === `${DIAS_LARGOS[diaSemana(iso)]} ${numDia(iso)}`) return;
  await semana(page).getByRole('button', { name: `Expandir ${DIAS_LARGOS[diaSemana(iso)]} ${numDia(iso)}`, exact: true }).click();
  await expect(exp.locator('span').first()).toHaveText(`${DIAS_LARGOS[diaSemana(iso)]} ${numDia(iso)}`);
}

// Paneles DÍA y NOCHE del día expandido, leídos del DOM.
const leerPaneles = (page) => page.evaluate(() => {
  const spans = [...document.querySelectorAll('section[aria-label="Semana completa"] > div span')]
    .filter((s) => /^(DÍA|NOCHE) · /.test(s.textContent.trim()));
  return spans.map((s) => {
    const cabecera = s.parentElement;
    const cuerpo = cabecera.nextElementSibling;
    const partes = [...cabecera.children].filter((c) => c.tagName === 'SPAN');
    const barra = cuerpo.querySelector(':scope > div:first-child > div');
    const grilla = cuerpo.querySelector(':scope > div:nth-child(2)');
    const celdas = grilla ? [...grilla.children] : [];
    const libres = celdas.filter((c) => /libre$/i.test(c.textContent.trim()));
    return {
      titulo: partes[0].textContent.trim(),
      rotativa: partes.length === 3 ? partes[1].textContent.trim() : null,
      cobertura: partes.length === 3 ? partes[2].textContent.trim() : null,
      colorCobertura: partes.length === 3 ? getComputedStyle(partes[2]).color : null,
      barra: barra ? { ancho: barra.style.width, color: getComputedStyle(barra).backgroundColor } : null,
      personas: celdas.length - libres.length,
      libres: libres.map((c) => c.textContent.trim()),
    };
  });
});
const VERDE = 'rgb(46, 125, 87)';
const CORAL_TINTA = 'rgb(184, 90, 96)';
const CORAL_BARRA = 'rgb(229, 127, 132)';

test('HU-CAL-05 · criterio 1: encabezado de la semana con asignados, cupos libres y navegación ← Hoy →', async ({ page, api }, testInfo) => {
  test.skip(!esDesktop(testInfo), SOLO_DESKTOP);
  await entrar(page, 'medico');
  const turnos = await api.get('/turnos/servicio/4');
  const lunes = lunesDe(hoyChile());
  const verSemana = async (l) => {
    const ts = turnosSemana(turnos, l);
    const asignados = ts.filter((t) => t.idFuncionario != null).length;
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(`Centro de turnos · ${tituloSemana(l)}`);
    await expect(page.getByText(`${asignados}/${ts.length} asignados`, { exact: true })).toBeVisible();
    await expect(page.getByText(`${ts.length - asignados} cupos libres`, { exact: true })).toBeVisible();
  };
  await verSemana(lunes);
  await page.getByRole('button', { name: 'Semana siguiente' }).click();
  await verSemana(sumarDias(lunes, 7));
  await page.getByRole('button', { name: 'Semana anterior' }).click();
  await page.getByRole('button', { name: 'Semana anterior' }).click();
  await verSemana(sumarDias(lunes, -7));
  await page.getByRole('button', { name: 'Hoy', exact: true }).click();
  await verSemana(lunes);
});

test('HU-CAL-05 · criterio 2: hoy se resalta y se expande; en otra semana se expande el lunes', async ({ page }, testInfo) => {
  test.skip(!esDesktop(testInfo), SOLO_DESKTOP);
  await entrar(page, 'medico');
  const hoy = hoyChile();
  const lunes = lunesDe(hoy);
  const exp = diaExpandido(page);
  await expect(exp).toHaveCount(1);
  await expect(exp.locator('span').first()).toHaveText(`${DIAS_LARGOS[diaSemana(hoy)]} ${numDia(hoy)}`);
  await expect(exp.getByText('HOY', { exact: true })).toBeVisible();
  await expect(semana(page).getByRole('button', { name: /^Expandir / })).toHaveCount(6);

  await page.getByRole('button', { name: 'Semana siguiente' }).click();
  const lunesSig = sumarDias(lunes, 7);
  await expect(exp.locator('span').first()).toHaveText(`Lunes ${numDia(lunesSig)}`);
  await expect(semana(page).getByText('HOY', { exact: true })).toHaveCount(0);

  await page.getByRole('button', { name: 'Hoy', exact: true }).click();
  await expect(exp.locator('span').first()).toHaveText(`${DIAS_LARGOS[diaSemana(hoy)]} ${numDia(hoy)}`);
  // Elegir otro día y volver con «Hoy» deja hoy expandido otra vez.
  const otro = diaSemana(hoy) === 1 ? sumarDias(hoy, 1) : lunes;
  await abrirDiaCentro(page, otro);
  await expect(semana(page).getByRole('button', { name: `Expandir ${DIAS_LARGOS[diaSemana(hoy)]} ${numDia(hoy)}` }).getByText('HOY', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Hoy', exact: true }).click();
  await expect(exp.locator('span').first()).toHaveText(`${DIAS_LARGOS[diaSemana(hoy)]} ${numDia(hoy)}`);
});

test('HU-CAL-05 · criterio 3: el día expandido muestra DÍA y NOCHE con rotativa, cobertura, personas y cupos libres', async ({ page, api }, testInfo) => {
  test.skip(!esDesktop(testInfo), SOLO_DESKTOP);
  await entrar(page, 'medico');
  const turnos = await api.get('/turnos/servicio/4');
  const porDia = turnosPorDia(turnos);
  const lunes = lunesDe(hoyChile());
  // Un día completo y uno con cupos libres de esta semana (o de la siguiente).
  const dias = [...Array(14).keys()].map((i) => sumarDias(lunes, i)).filter((d) => porDia.has(d));
  const conLibres = dias.find((d) => porDia.get(d).some((t) => t.idFuncionario == null));
  const completo = dias.find((d) => porDia.get(d).every((t) => t.idFuncionario != null));
  expect(conLibres && completo, 'hay un día con cupos libres y uno completo').toBeTruthy();

  for (const d of [conLibres, completo]) {
    if (d >= sumarDias(lunes, 7)) await page.getByRole('button', { name: 'Semana siguiente' }).click();
    await abrirDiaCentro(page, d);
    const paneles = await leerPaneles(page);
    expect(paneles.map((p) => p.titulo.split(' · ')[0])).toEqual(['DÍA', 'NOCHE']);
    for (const [i, nocturno] of [false, true].entries()) {
      const bloque = porDia.get(d).filter((t) => esNoche(t) === nocturno);
      const asignados = bloque.filter((t) => t.idFuncionario != null).length;
      const completoBloque = asignados === bloque.length;
      const p = paneles[i];
      const contexto = `${d} ${nocturno ? 'noche' : 'día'}`;
      expect(p.titulo, contexto).toBe(`${nocturno ? 'NOCHE' : 'DÍA'} · ${hhmm(bloque[0].horaInicio)}–${hhmm(bloque[0].horaFin)}`);
      expect(p.rotativa, contexto).toBe(rotativaDelBloque(bloque));
      expect(p.cobertura, contexto).toBe(`${asignados}/${bloque.length}`);
      expect(p.colorCobertura, `${contexto}: verde si está completo, coral si faltan`).toBe(completoBloque ? VERDE : CORAL_TINTA);
      expect(p.barra, contexto).toEqual({ ancho: `${Math.round((asignados / bloque.length) * 100)}%`, color: completoBloque ? VERDE : CORAL_BARRA });
      expect(p.personas, contexto).toBe(asignados);
      expect(p.libres.map((x) => x.replace(/^\+(Solicitar|Solicitado|Asignar)/, '')).sort(), contexto)
        .toEqual(bloque.filter((t) => t.idFuncionario == null).map((t) => `${t.nombrePuesto} libre`).sort());
    }
    if (d >= sumarDias(lunes, 7)) await page.getByRole('button', { name: 'Hoy', exact: true }).click();
  }
});

// Primer día (desde hoy, en esta semana o la siguiente) con un cupo libre.
async function diaConCupo(api) {
  const turnos = await api.get('/turnos/servicio/4');
  const hoy = hoyChile();
  const lunes = lunesDe(hoy);
  const libre = turnos.filter((t) => t.idFuncionario == null && t.diaInicioTurno >= hoy && t.diaInicioTurno <= sumarDias(lunes, 13))
    .sort((a, b) => a.diaInicioTurno.localeCompare(b.diaInicioTurno))[0];
  expect(libre, 'hay un cupo libre en las próximas dos semanas').toBeTruthy();
  return { turnos, libre, otraSemana: libre.diaInicioTurno > sumarDias(lunes, 6) };
}

test('HU-CAL-05 · criterio 4: médico: «Solicitar» en un cupo abre la Cobertura precargada', async ({ page, api }, testInfo) => {
  test.skip(!esDesktop(testInfo), SOLO_DESKTOP);
  await entrar(page, 'medico');
  const { libre, otraSemana } = await diaConCupo(api);
  if (otraSemana) await page.getByRole('button', { name: 'Semana siguiente' }).click();
  await abrirDiaCentro(page, libre.diaInicioTurno);
  await diaExpandido(page).getByRole('button', { name: `+ Solicitar ${libre.nombrePuesto} libre` }).first().click();

  const panel = page.getByRole('dialog', { name: 'Nueva solicitud' });
  await expect(panel).toBeVisible();
  await expect(panel.locator('[aria-current="step"]')).toContainText('Detalle');
  await expect(panel.getByRole('button', { name: 'Cobertura', exact: true })).toBeVisible();
  await expect(panel.getByRole('button', { name: new RegExp(`^Turno a cubrir: .*${hhmm(libre.horaInicio)}–${hhmm(libre.horaFin)}`) })).toBeVisible();
  await panel.getByRole('button', { name: 'Cancelar', exact: true }).click();
  await expect(panel).toHaveCount(0);
});

test('HU-CAL-05 · criterio 4: médico: un cupo que ya pedí dice «Solicitado» y está deshabilitado (datos simulados)', async ({ page, api }, testInfo) => {
  test.skip(!esDesktop(testInfo), SOLO_DESKTOP);
  await entrar(page, 'medico');
  const { libre, otraSemana } = await diaConCupo(api);
  await page.route(/\/api\/v2\/turnos\/servicio\/4$/, async (route) => {
    const r = await route.fetch();
    return route.fulfill({ response: r, json: (await r.json()).map((t) => (t.id === libre.id ? { ...t, solicitudPendiente: true } : t)) });
  });
  await page.reload();
  await esperarQuieta(page);
  if (otraSemana) await page.getByRole('button', { name: 'Semana siguiente' }).click();
  await abrirDiaCentro(page, libre.diaInicioTurno);
  const pedido = diaExpandido(page).getByRole('button', { name: `+ Solicitado ${libre.nombrePuesto} libre` });
  await expect(pedido).toHaveCount(1);
  await expect(pedido).toBeDisabled();
});

test('HU-CAL-05 · criterio 4: médico: una propuesta recibida muestra «Aceptar» y «Rechazar» (datos simulados)', async ({ page, api }, testInfo) => {
  test.skip(!esDesktop(testInfo), SOLO_DESKTOP);
  await entrar(page, 'medico');
  const turnos = await api.get('/turnos/servicio/4');
  const personal = await api.get('/funcionarios/summary?servicioId=4');
  const hoy = hoyChile();
  const yo = personal.find((f) => f.idFuncionario === ID.medico);
  const otro = personal.find((f) => f.idFuncionario === 368);
  const suTurno = turnos.find((t) => t.idFuncionario === 368 && t.diaInicioTurno > hoy);
  const miTurno = turnos.find((t) => t.idFuncionario === ID.medico && t.diaInicioTurno > hoy);
  const propuesta = solicitudSimulada({ id: 990001, tipo: 4, funcionario: otro, receptor: yo, turno: miTurno, turnoReceptor: suTurno, servicio: URGENCIAS });
  await page.route(new RegExp(`/api/v2/solicitudes/receptor/${ID.medico}$`), (route) => route.fulfill({ json: [propuesta] }));
  await page.reload();
  await esperarQuieta(page);

  const panel = page.getByRole('region', { name: 'Solicitudes pendientes' });
  const tarjeta = tarjetasDe(panel).filter({ hasText: 'Requiere tu respuesta' });
  await expect(tarjeta).toHaveCount(1);
  await expect(tarjeta.getByText('Intercambio', { exact: true })).toBeVisible();
  await expect(tarjeta.getByRole('button', { name: 'Aceptar', exact: true })).toBeEnabled();
  await expect(tarjeta.getByRole('button', { name: 'Rechazar', exact: true })).toBeEnabled();
  await expect(panel.getByRole('button', { name: 'Aprobar' })).toHaveCount(0);
});

test('HU-CAL-05 · criterio 5: jefatura: una persona abre «Editar asignación de turno» y un cupo «Asignar turno libre»', async ({ page, api }, testInfo) => {
  test.skip(!esDesktop(testInfo), SOLO_DESKTOP);
  await entrar(page, 'jefatura');
  const { libre, otraSemana } = await diaConCupo(api);
  if (otraSemana) await page.getByRole('button', { name: 'Semana siguiente' }).click();
  await abrirDiaCentro(page, libre.diaInicioTurno);

  await diaExpandido(page).locator('button.sgt-persona').first().click();
  const editar = page.getByRole('dialog', { name: 'Editar asignación de turno' });
  await expect(editar).toBeVisible();
  await expect(page.locator('.sgt-panel-lateral')).toHaveCount(1);
  await page.keyboard.press('Escape');
  await expect(editar).toHaveCount(0);

  await diaExpandido(page).getByRole('button', { name: `+ Asignar ${libre.nombrePuesto} libre` }).first().click();
  const asignar = page.getByRole('dialog', { name: 'Asignar turno libre' });
  await expect(asignar).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(asignar).toHaveCount(0);
});

test('HU-CAL-05 · criterio 6: panel de solicitudes: postulaciones agrupadas, turno ya cubierto y solicitud propia (datos simulados)', async ({ page, api }, testInfo) => {
  test.skip(!esDesktop(testInfo), SOLO_DESKTOP);
  await entrar(page, 'jefatura');
  const turnos = await api.get('/turnos/servicio/4');
  const personal = await api.get('/funcionarios/summary?servicioId=4');
  const persona = (id) => personal.find((f) => f.idFuncionario === id);
  const hoy = hoyChile();
  const cupo = turnos.find((t) => t.idFuncionario == null && t.diaInicioTurno > hoy);
  const ocupado = turnos.find((t) => t.idFuncionario === 341 && t.diaInicioTurno > hoy);
  const mio = turnos.find((t) => t.idFuncionario === ID.jefatura && t.diaInicioTurno > hoy);
  const simuladas = [
    // R10: tres coberturas sobre el mismo cupo libre.
    ...[368, 369, 371].map((id, i) => solicitudSimulada({ id: 990010 + i, tipo: 3, funcionario: persona(id), turno: cupo, servicio: URGENCIAS, fechaCreacion: `${hoy}T0${i + 1}:00:00` })),
    // Cobertura sobre un turno que ya tiene dueño.
    solicitudSimulada({ id: 990020, tipo: 3, funcionario: persona(312), turno: ocupado, servicio: URGENCIAS }),
    // Solicitud de la propia jefatura (botar su turno).
    solicitudSimulada({ id: 990030, tipo: 2, funcionario: persona(ID.jefatura), turno: mio, servicio: URGENCIAS }),
  ];
  await page.route(/\/api\/v2\/solicitudes$/, async (route) => {
    const r = await route.fetch();
    return route.fulfill({ response: r, json: [...await r.json(), ...simuladas] });
  });
  await page.reload();
  await esperarQuieta(page);
  const panel = page.getByRole('region', { name: 'Solicitudes pendientes' });

  const grupo = tarjetasDe(panel).filter({ hasText: 'Postulantes · 3' });
  await expect(grupo).toHaveCount(1);
  await expect(grupo).toContainText(/^Cobertura/);
  await expect(grupo.getByRole('button', { name: 'Elegir', exact: true })).toHaveCount(3);
  for (const id of [368, 369, 371]) {
    const { nombre, apellidoPaterno, apellidoMaterno } = persona(id);
    await expect(grupo.getByText([nombre, apellidoPaterno, apellidoMaterno].filter(Boolean).join(' '), { exact: true })).toBeVisible();
  }

  const cubierta = tarjetasDe(panel).filter({ hasText: 'Turno ya cubierto' });
  await expect(cubierta).toHaveCount(1);
  await expect(cubierta).toContainText(/^Cobertura/);
  await expect(cubierta.getByRole('button')).toHaveCount(0);

  const propia = tarjetasDe(panel).filter({ hasText: 'Participas en esta solicitud: por segregación de funciones, la decisión corresponde a otra jefatura.' });
  await expect(propia).toHaveCount(1);
  await expect(propia).toContainText(/^Botar turno/);
  await expect(propia.getByRole('button', { name: /Aprobar|Rechazar/ })).toHaveCount(0);
});

for (const rol of ['jefatura', 'medico']) {
  test(`HU-CAL-05 · criterio 7: panel de ofertas: sin pasadas ni rechazadas; abrir y seleccionar solo la jefatura (${rol}, datos simulados)`, async ({ page, api }, testInfo) => {
    test.skip(!esDesktop(testInfo), SOLO_DESKTOP);
    await entrar(page, rol);
    const turnos = await api.get('/turnos/servicio/4');
    const personal = await api.get('/funcionarios/summary?servicioId=4');
    const persona = (id) => personal.find((f) => f.idFuncionario === id);
    const hoy = hoyChile();
    const futuros = turnos.filter((t) => t.idFuncionario === 341 && t.diaInicioTurno > hoy);
    const simuladas = [
      ofertaSimulada({ id: 9901, estado: 'ABIERTA', ofertor: persona(341), turno: futuros[0], servicio: URGENCIAS, postulantes: [persona(368)] }),
      ofertaSimulada({ id: 9902, estado: 'PENDIENTE_APROBACION', ofertor: persona(341), turno: futuros[1], servicio: URGENCIAS }),
      ofertaSimulada({ id: 9903, estado: 'RECHAZADA', ofertor: persona(341), turno: futuros[2], servicio: URGENCIAS }),
    ];
    let reales = [];
    await page.route(/\/api\/v2\/ofertas-generales\/servicio\/4$/, async (route) => {
      const r = await route.fetch();
      reales = await r.json();
      return route.fulfill({ response: r, json: [...reales, ...simuladas] });
    });
    await page.reload();
    await esperarQuieta(page);
    expect(reales.length, 'las ofertas del seed siguen en la respuesta').toBeGreaterThan(0);
    expect(reales.every((o) => (o.turno.diaFinalTurno || o.turno.diaInicioTurno) < hoy), 'las ofertas del seed son de turnos pasados').toBe(true);

    const panel = page.getByRole('region', { name: 'Disponibles' });
    const tarjetas = tarjetasDe(panel);
    // C-16 (17 oct): al médico, solo las ofertas abiertas (y las suyas); la gestión ve
    // además las que esperan apertura. Antes, el médico veía también la pendiente.
    await expect(tarjetas).toHaveCount(rol === 'jefatura' ? 2 : 1);
    await expect(tarjetas.nth(0)).toContainText('Abierta');
    if (rol === 'jefatura') await expect(tarjetas.nth(1)).toContainText('Pend. apertura');
    else await expect(panel.getByText('Pend. apertura', { exact: true })).toHaveCount(0);
    await expect(panel.getByText('Rechazada', { exact: true })).toHaveCount(0);
    await expect(panel.getByRole('button', { name: /Postular/ })).toHaveCount(0);

    if (rol === 'jefatura') {
      await expect(tarjetas.nth(1).getByRole('button', { name: 'Aprobar apertura' })).toBeVisible();
      await tarjetas.nth(0).getByRole('button', { name: 'Seleccionar' }).click();
      const { nombre, apellidoPaterno, apellidoMaterno } = persona(368);
      await expect(tarjetas.nth(0)).toContainText(`→ ${[nombre, apellidoPaterno, apellidoMaterno].filter(Boolean).join(' ')}`);
      await expect(tarjetas.nth(0).getByRole('button', { name: 'Confirmar' })).toBeVisible();
      await tarjetas.nth(0).getByRole('button', { name: 'Cancelar' }).click();
      await expect(tarjetas.nth(0).getByRole('button', { name: 'Confirmar' })).toHaveCount(0);
    } else {
      await expect(panel.getByRole('button', { name: 'Aprobar apertura' })).toHaveCount(0);
      await expect(panel.getByRole('button', { name: 'Seleccionar' })).toHaveCount(0);
    }
  });
}

test('HU-CAL-05 · criterio 8: sin scroll horizontal entre 1200 y 1920 px', async ({ page }, testInfo) => {
  test.skip(!esDesktop(testInfo), SOLO_DESKTOP);
  await entrar(page, 'jefatura');
  for (const ancho of [1200, 1280, 1366, 1600, 1920]) {
    await page.setViewportSize({ width: ancho, height: 900 });
    await page.waitForTimeout(300);
    const desborde = await page.evaluate(() => ['html', '.sgt-desktop__main', 'section[aria-label="Semana completa"]'].map((sel) => {
      const el = sel === 'html' ? document.documentElement : document.querySelector(sel);
      return { sel, sobra: el ? el.scrollWidth - el.clientWidth : null };
    }));
    for (const { sel, sobra } of desborde) expect(sobra, `${ancho} px · ${sel}`).toBeLessThanOrEqual(1);
  }
});
