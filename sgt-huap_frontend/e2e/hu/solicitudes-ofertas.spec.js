// HU de solicitudes y ofertas, fase 1 del catálogo (§6.2), solo lectura, en
// móvil y en desktop:
//  - HU-SOL-01 con GET simulados: el médico 369 no tiene solicitudes en el
//    seed, así que sus listas se responden en el navegador con solicitudes
//    armadas con personas y turnos reales de Urgencias (nada se guarda). El
//    criterio 5 (lista vacía) usa los datos reales;
//  - HU-SOL-02, lectura: la bandeja de la jefatura de Urgencias con los datos
//    del seed (solicitudes 13 a 18); los casos que el seed no tiene se simulan;
//  - HU-OFE-05: ofertas vigentes en el Centro y en «Ofertas generales».
import {
  test, expect, fallaConocida, ID, SERVICIO, esDesktop, hoyChile, sumarDias,
  entrar, itemMenu, barraInferior, esperarQuieta,
} from '../helpers/hu.js';
import { solicitudSimulada, ofertaSimulada, nombreSolicitud } from '../helpers/datos.js';

const URGENCIAS = { idServicio: SERVICIO.urgencias, nombre: 'Urgencias' };
const TIPO = { 1: 'Permiso', 2: 'Botar turno', 3: 'Cobertura', 4: 'Intercambio', 5: 'Oferta particular' };
const ETIQUETA_TURNO = { 2: 'Turno a liberar', 3: 'Turno a cubrir', 4: 'Turno a recibir', 5: 'Turno ofrecido' };
const hhmm = (h) => String(h).slice(0, 5);
const numDia = (iso) => String(Number(iso.slice(8, 10)));

// ── Vista de solicitudes ─────────────────────────────────────────────────────
async function abrirSolicitudes(page, testInfo) {
  if (esDesktop(testInfo)) await itemMenu(page, 'Solicitudes').click();
  else await barraInferior(page, 'Solicitudes').click();
  await expect(page.getByText('Cargando solicitudes...')).toHaveCount(0, { timeout: 15_000 });
  await esperarQuieta(page);
}

const pestana = (page, testInfo, nombre) => (esDesktop(testInfo)
  ? page.getByRole('tablist', { name: 'Vista de solicitudes' }).getByRole('tab', { name: new RegExp(`^${nombre}( \\d+)?$`) })
  : page.getByRole('button', { name: new RegExp(`^${nombre}( \\d+)?$`) }));

async function elegirPestana(page, testInfo, nombre) {
  await pestana(page, testInfo, nombre).click();
  await esperarQuieta(page);
}

// Fecha corta como la muestran las tarjetas («15 oct 2026»), con el Intl del navegador.
const fechaCL = (page, valor) => page.evaluate((v) => {
  const s = String(v);
  const d = /^\d{4}-\d{2}-\d{2}$/.test(s) ? new Date(...s.split('-').map((n, i) => Number(n) - (i === 1 ? 1 : 0))) : new Date(s.replace(' ', 'T'));
  return d.toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' });
}, valor);

// Lee todas las solicitudes u ofertas de la pestaña abierta: en móvil, las
// tarjetas; en desktop, el detalle de cada ítem de la lista (se abre uno por uno).
async function leerLista(page, testInfo) {
  if (esDesktop(testInfo)) {
    const opciones = page.getByRole('listbox').getByRole('option');
    const n = await opciones.count();
    const items = [];
    for (let i = 0; i < n; i += 1) {
      await opciones.nth(i).click();
      const det = page.getByRole('region', { name: 'Detalle' });
      await expect(opciones.nth(i)).toHaveAttribute('aria-selected', 'true');
      items.push(await det.evaluate((el) => ({
        titulo: el.querySelector('h2')?.textContent.trim(),
        fecha: el.querySelector('.sgt-dt-detalle-sol__subtitulo')?.textContent.trim().replace(/^(Creada|Publicada) el /, ''),
        estado: el.querySelector('.sgt-dt-detalle-sol__cabecera .sgt-d-chip')?.textContent.trim(),
        filas: Object.fromEntries([...el.querySelectorAll('.sgt-dt-ficha__fila')].map((f) => [f.querySelector('dt').textContent.trim(), f.querySelector('dd').textContent.trim()])),
        motivo: el.querySelector('.sgt-dt-motivo__texto')?.textContent.trim(),
        notas: [...el.querySelectorAll('.sgt-d-aviso')].map((a) => a.textContent.trim()),
        botones: [...el.querySelectorAll('button')].map((b) => b.textContent.trim()),
      })));
    }
    return items;
  }
  return page.locator('.sgt-list-row').evaluateAll((tarjetas) => tarjetas.map((el) => {
    const [cabecera, ...resto] = el.children;
    const textos = cabecera.children[1];
    const filas = {};
    resto.filter((c) => c.tagName === 'DIV' && c.children.length === 2 && [...c.children].every((x) => x.tagName === 'SPAN'))
      .forEach((c) => { filas[c.children[0].textContent.trim()] = c.children[1].textContent.trim(); });
    const caja = resto.find((c) => c.firstElementChild?.textContent.trim() === 'Motivo');
    return {
      titulo: textos?.children[0]?.textContent.trim(),
      fecha: textos?.children[1]?.textContent.trim(),
      estado: cabecera.children[2]?.textContent.trim(),
      filas,
      motivo: caja?.children[1]?.textContent.trim(),
      notas: resto.filter((c) => /^(⏳|✕)/.test(c.textContent.trim())).map((c) => c.textContent.trim()),
      botones: [...el.querySelectorAll('button')].map((b) => b.textContent.trim()),
    };
  }));
}

// ── Datos simulados del médico ───────────────────────────────────────────────
async function escenarioMedico(api) {
  const hoy = hoyChile();
  const turnos = await api.get(`/turnos/servicio/${SERVICIO.urgencias}`);
  const personal = await api.get(`/funcionarios/summary?servicioId=${SERVICIO.urgencias}`);
  const persona = (id) => personal.find((f) => f.idFuncionario === id);
  const futuros = (id) => turnos.filter((t) => t.idFuncionario === id && t.diaInicioTurno > hoy);
  const libre = turnos.find((t) => t.idFuncionario == null && t.diaInicioTurno > hoy);
  const [mio1, mio2, mio3] = futuros(ID.medico);
  const yo = persona(ID.medico);
  const creada = (dias) => `${sumarDias(hoy, -dias)}T10:00:00`;
  const base = { servicio: URGENCIAS };
  const propias = [
    solicitudSimulada({ ...base, id: 990101, tipo: 3, funcionario: yo, turno: libre, motivo: 'Simulada: cubro el cupo libre', fechaCreacion: creada(1) }),
    solicitudSimulada({ ...base, id: 990102, tipo: 1, estado: 'APROBADA', funcionario: yo, motivo: 'Simulada: permiso aprobado', fechaCreacion: creada(9),
      fechaInicioPermiso: `${sumarDias(hoy, 20)}T00:00:00`, fechaTerminoPermiso: `${sumarDias(hoy, 21)}T00:00:00` }),
    solicitudSimulada({ ...base, id: 990103, tipo: 2, estado: 'RECHAZADA', funcionario: yo, turno: mio1, motivo: 'Simulada: botar rechazado', fechaCreacion: creada(7) }),
    solicitudSimulada({ ...base, id: 990104, tipo: 4, funcionario: yo, receptor: persona(368), turno: futuros(368)[0], turnoReceptor: mio2, motivo: 'Simulada: intercambio esperando', fechaCreacion: creada(2) }),
    solicitudSimulada({ ...base, id: 990105, tipo: 5, funcionario: yo, receptor: persona(341), turno: mio3, aceptadoReceptor: true, motivo: 'Simulada: oferta aceptada', fechaCreacion: creada(3) }),
    solicitudSimulada({ ...base, id: 990106, tipo: 4, estado: 'RECHAZADA', funcionario: yo, receptor: persona(371), turno: futuros(371)[0], turnoReceptor: mio1, aceptadoReceptor: false, motivo: 'Simulada: intercambio rechazado', fechaCreacion: creada(5) }),
    solicitudSimulada({ ...base, id: 990107, tipo: 3, estado: 'RECHAZADA', funcionario: yo, turno: libre, motivo: 'Cancelada por el solicitante · motivo original: Simulada: ya no puedo', fechaCreacion: creada(4) }),
  ];
  const recibidas = [
    solicitudSimulada({ ...base, id: 990201, tipo: 4, funcionario: persona(368), receptor: yo, turno: mio2, turnoReceptor: futuros(368)[1], motivo: 'Simulada: me piden cambio', fechaCreacion: creada(1) }),
    solicitudSimulada({ ...base, id: 990202, tipo: 5, funcionario: persona(341), receptor: yo, turno: futuros(341)[0], aceptadoReceptor: true, motivo: 'Simulada: me ofrecen turno', fechaCreacion: creada(2) }),
  ];
  return { yo, propias, recibidas };
}

async function simularMedico(page, { propias, recibidas }) {
  await page.route(new RegExp(`/api/v2/solicitudes/funcionario/${ID.medico}$`), (route) => route.fulfill({ json: propias }));
  await page.route(new RegExp(`/api/v2/solicitudes/receptor/${ID.medico}$`), (route) => route.fulfill({ json: recibidas }));
}

// Estado que debe mostrar cada solicitud (catálogo HU-SOL-01, criterios 2 y 3).
function estadoEsperado(s, idYo) {
  const bifasico = [4, 5].includes(s.tipoSolicitud.tipo);
  const soyReceptor = s.funcionarioReceptor?.idFuncionario === idYo;
  if (s.estado === 'RECHAZADA' && s.motivo.startsWith('Cancelada por el solicitante')) return 'CANCELADA';
  if (bifasico && s.estado === 'PENDIENTE') {
    if (soyReceptor && s.aceptadoReceptor == null) return 'Requiere tu respuesta';
    if (soyReceptor && s.aceptadoReceptor === true) return 'Aceptada · Pend. jefatura';
    if (!soyReceptor && s.aceptadoReceptor === true) return 'Pend. jefatura';
  }
  return s.estado;
}

// ═════════════════════════════════════════════════════════════════════════════
// HU-SOL-01 · Ver mis solicitudes, las recibidas y las ofertas (médico)
// ═════════════════════════════════════════════════════════════════════════════

test('HU-SOL-01 · criterio 1: pestañas «Mis solicitudes», «Recibidas» con contador y «Ofertas generales»', async ({ page, api }, testInfo) => {
  await entrar(page, 'medico');
  const escenario = await escenarioMedico(api);
  await simularMedico(page, escenario);
  await abrirSolicitudes(page, testInfo);
  const pendientesRecibidas = escenario.recibidas.filter((s) => s.estado === 'PENDIENTE').length;
  await expect(pestana(page, testInfo, 'Mis solicitudes')).toHaveText(/^Mis solicitudes$/);
  await expect(pestana(page, testInfo, 'Recibidas')).toHaveAccessibleName(`Recibidas ${pendientesRecibidas}`);
  await expect(pestana(page, testInfo, 'Ofertas generales')).toHaveText(/^Ofertas generales$/);
});

for (const [pestanaLista, cual] of [['Mis solicitudes', 'propias'], ['Recibidas', 'recibidas']]) {
  test(`HU-SOL-01 · criterio 2: cada solicitud muestra tipo, fecha, estado, personas, turnos, período y motivo (${pestanaLista})`, async ({ page, api }, testInfo) => {
    await entrar(page, 'medico');
    const escenario = await escenarioMedico(api);
    await simularMedico(page, escenario);
    await abrirSolicitudes(page, testInfo);
    await elegirPestana(page, testInfo, pestanaLista);
    const vistas = await leerLista(page, testInfo);
    const desktop = esDesktop(testInfo);
    const conTu = (f) => `${nombreSolicitud(f)}${desktop && f.idFuncionario === ID.medico ? ' (tú)' : ''}`;

    expect(vistas).toHaveLength(escenario[cual].length);
    for (const s of escenario[cual]) {
      const v = vistas.find((x) => x.motivo === s.motivo);
      const contexto = `${TIPO[s.tipoSolicitud.tipo]} #${s.idSolicitud}`;
      expect(v, contexto).toBeTruthy();
      expect(v.titulo, contexto).toBe(TIPO[s.tipoSolicitud.tipo]);
      expect(v.fecha, contexto).toBe(await fechaCL(page, s.fechaCreacion));
      expect(v.estado, contexto).toBe(estadoEsperado(s, ID.medico));
      expect(v.filas.Solicitante, contexto).toBe(conTu(s.funcionario));
      if (s.funcionarioReceptor) expect(v.filas.Receptor, contexto).toBe(conTu(s.funcionarioReceptor));
      else expect(v.filas.Receptor, contexto).toBeUndefined();
      if (s.turno) {
        const valor = v.filas[ETIQUETA_TURNO[s.tipoSolicitud.tipo]];
        expect(valor, `${contexto}: «${ETIQUETA_TURNO[s.tipoSolicitud.tipo]}»`).toContain(`${hhmm(s.turno.horaInicio)}–${hhmm(s.turno.horaFin)}`);
        expect(valor, contexto).toContain(await fechaCL(page, s.turno.diaInicioTurno));
      }
      if (s.turnoReceptor) expect(v.filas['Turno a entregar'], contexto).toContain(await fechaCL(page, s.turnoReceptor.diaInicioTurno));
      else expect(v.filas['Turno a entregar'], contexto).toBeUndefined();
      if (s.fechaInicioPermiso) {
        expect(v.filas['Período'], contexto).toBe(`${await fechaCL(page, s.fechaInicioPermiso)} → ${await fechaCL(page, s.fechaTerminoPermiso)}`);
      }
    }
  });
}

test('HU-SOL-01 · criterio 3: marcas de intercambios y ofertas particulares', async ({ page, api }, testInfo) => {
  await entrar(page, 'medico');
  const escenario = await escenarioMedico(api);
  await simularMedico(page, escenario);
  await abrirSolicitudes(page, testInfo);
  const propias = await leerLista(page, testInfo);
  await elegirPestana(page, testInfo, 'Recibidas');
  const recibidas = await leerLista(page, testInfo);
  const porMotivo = (lista, texto) => lista.find((v) => v.motivo.includes(texto));

  expect(porMotivo(recibidas, 'me piden cambio').estado).toBe('Requiere tu respuesta');
  expect(porMotivo(recibidas, 'me ofrecen turno').estado).toBe('Aceptada · Pend. jefatura');
  expect(porMotivo(propias, 'oferta aceptada').estado).toBe('Pend. jefatura');
  expect(porMotivo(propias, 'intercambio esperando').notas.join(' ')).toMatch(/^⏳ Esperando respuesta del receptor/);
  expect(porMotivo(propias, 'intercambio rechazado').notas).toEqual(['✕ Receptor rechazó el intercambio']);
});

test('HU-SOL-01 · criterio 4: ordenar por más reciente, más antigua o tipo; en desktop, buscar y filtrar con lista y detalle', async ({ page, api }, testInfo) => {
  await entrar(page, 'medico');
  const escenario = await escenarioMedico(api);
  await simularMedico(page, escenario);
  await abrirSolicitudes(page, testInfo);
  const desktop = esDesktop(testInfo);
  const clave = async (s) => `${TIPO[s.tipoSolicitud.tipo]}|${await fechaCL(page, s.fechaCreacion)}`;
  const esperado = async (orden) => {
    const lista = [...escenario.propias];
    if (orden === 'reciente') lista.sort((a, b) => b.fechaCreacion.localeCompare(a.fechaCreacion));
    if (orden === 'antigua') lista.sort((a, b) => a.fechaCreacion.localeCompare(b.fechaCreacion));
    if (orden === 'tipo') lista.sort((a, b) => a.tipoSolicitud.tipo - b.tipoSolicitud.tipo);
    return Promise.all(lista.map(clave));
  };
  const vista = () => (desktop
    ? page.getByRole('listbox').getByRole('option').evaluateAll((os) => os.map((o) => `${o.querySelector('.sgt-dt-bandeja__fila-titulo').textContent.trim()}|${o.querySelector('.sgt-dt-bandeja__fila-fecha').textContent.trim()}`))
    : page.locator('.sgt-list-row').evaluateAll((ts) => ts.map((t) => { const x = t.children[0].children[1]; return `${x.children[0].textContent.trim()}|${x.children[1].textContent.trim()}`; })));
  const ordenar = async (id, etiqueta) => {
    if (desktop) await page.getByLabel('Ordenar').selectOption(id);
    else {
      // Botón de orden: el ícono de controles sin texto («Modificar motivo» usa el mismo ícono).
      await page.locator('button:has(path[d^="M4 21V14"])').filter({ hasNotText: /\S/ }).click();
      await expect(page.getByText('Ordenar por', { exact: true })).toBeVisible();
      await page.getByRole('button', { name: new RegExp(`^${etiqueta}`) }).click();
    }
  };

  expect(await vista(), 'por defecto, más reciente').toEqual(await esperado('reciente'));
  await ordenar('antigua', 'Más antigua');
  expect(await vista()).toEqual(await esperado('antigua'));
  await ordenar('tipo', 'Por tipo');
  expect(await vista()).toEqual(await esperado('tipo'));
  await ordenar('reciente', 'Más reciente');
  expect(await vista()).toEqual(await esperado('reciente'));

  if (desktop) {
    const opciones = page.getByRole('listbox').getByRole('option');
    // Lista a la izquierda y detalle a la derecha.
    const lista = await page.getByRole('listbox').boundingBox();
    const det = await page.getByRole('region', { name: 'Detalle' }).boundingBox();
    expect(lista.x + lista.width).toBeLessThanOrEqual(det.x + 1);
    // Buscar por motivo y por nombre.
    const buscador = page.getByRole('searchbox', { name: 'Buscar por nombre o motivo…' });
    await buscador.fill('botar rechazado');
    await expect(opciones).toHaveCount(1);
    await expect(opciones.first()).toContainText('Botar turno');
    const receptor = escenario.propias.find((s) => s.idSolicitud === 990104).funcionarioReceptor;
    const norm = (t) => String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    await buscador.fill(receptor.nombre);
    const coinciden = escenario.propias.filter((s) => [nombreSolicitud(s.funcionario), s.funcionarioReceptor ? nombreSolicitud(s.funcionarioReceptor) : '', s.motivo]
      .some((t) => norm(t).includes(norm(receptor.nombre))));
    expect(coinciden.length).toBeGreaterThan(0);
    await expect(opciones).toHaveCount(coinciden.length);
    await buscador.fill('');
    // Filtrar por tipo.
    await page.getByLabel('Tipo de solicitud').selectOption('3');
    await expect(opciones).toHaveCount(escenario.propias.filter((s) => s.tipoSolicitud.tipo === 3).length);
    for (const t of await opciones.allTextContents()) expect(t).toMatch(/^Cobertura/);
  }
});

for (const pestanaLista of ['Mis solicitudes', 'Recibidas']) {
  test(`HU-SOL-01 · criterio 5: sin datos, «Sin solicitudes» (${pestanaLista})`, async ({ page, api }, testInfo) => {
    await entrar(page, 'medico');
    const ruta = pestanaLista === 'Mis solicitudes' ? 'funcionario' : 'receptor';
    expect(await api.get(`/solicitudes/${ruta}/${ID.medico}`), 'el médico 369 no tiene solicitudes en el seed').toEqual([]);
    await abrirSolicitudes(page, testInfo);
    await elegirPestana(page, testInfo, pestanaLista);
    await expect(page.getByText('Sin solicitudes', { exact: true })).toBeVisible();
    await expect(page.getByText('No hay solicitudes aquí por el momento.', { exact: true })).toBeVisible();
  });
}

// ═════════════════════════════════════════════════════════════════════════════
// HU-SOL-02 · Bandeja de solicitudes del servicio (gestión), lectura
// ═════════════════════════════════════════════════════════════════════════════

test('HU-SOL-02 · criterio 1: «Pendientes» con contador, «Historial» y «Ofertas generales» con las ofertas por abrir', async ({ page, api }, testInfo) => {
  await entrar(page, 'jefatura');
  const todas = await api.get('/solicitudes');
  const delServicio = todas.filter((s) => !s.turno || s.turno.servicio?.idServicio === SERVICIO.urgencias);
  const pendientes = delServicio.filter((s) => s.estado === 'PENDIENTE').length;
  const ofertas = await api.get(`/ofertas-generales/servicio/${SERVICIO.urgencias}`);
  const porAbrir = ofertas.filter((o) => o.estado === 'PENDIENTE_APROBACION').length;
  await abrirSolicitudes(page, testInfo);
  await expect(pestana(page, testInfo, 'Pendientes')).toHaveAccessibleName(`Pendientes ${pendientes}`);
  await expect(pestana(page, testInfo, 'Historial')).toHaveAccessibleName('Historial');
  await expect(pestana(page, testInfo, 'Ofertas generales')).toHaveAccessibleName(porAbrir ? `Ofertas generales ${porAbrir}` : 'Ofertas generales');

  // Con una oferta por abrir (simulada), la pestaña la cuenta.
  const turnos = await api.get(`/turnos/servicio/${SERVICIO.urgencias}`);
  const personal = await api.get(`/funcionarios/summary?servicioId=${SERVICIO.urgencias}`);
  const ofertor = personal.find((f) => f.idFuncionario === 341);
  const suTurno = turnos.find((t) => t.idFuncionario === 341 && t.diaInicioTurno > hoyChile());
  await page.route(/\/api\/v2\/ofertas-generales\/servicio\/4$/, async (route) => {
    const r = await route.fetch();
    return route.fulfill({ response: r, json: [...await r.json(), ofertaSimulada({ id: 9911, estado: 'PENDIENTE_APROBACION', ofertor, turno: suTurno, servicio: URGENCIAS })] });
  });
  await page.reload();
  await expect(page.getByText('Cargando solicitudes...')).toHaveCount(0, { timeout: 15_000 });
  await expect(pestana(page, testInfo, 'Ofertas generales')).toHaveAccessibleName(`Ofertas generales ${porAbrir + 1}`);
});

test('HU-SOL-02 · criterio 2: solo aparecen las solicitudes cuyo turno es del servicio', async ({ page, api }, testInfo) => {
  await entrar(page, 'jefatura');
  const todas = await api.get('/solicitudes');
  const deOtro = todas.filter((s) => s.turno && s.turno.servicio?.idServicio !== SERVICIO.urgencias);
  expect(deOtro.length, 'hay solicitudes de otros servicios en la respuesta').toBeGreaterThan(0);
  const delServicio = todas.filter((s) => s.turno?.servicio?.idServicio === SERVICIO.urgencias);
  const clave = (titulo, solicitante) => `${titulo}|${solicitante}`;
  await abrirSolicitudes(page, testInfo);

  for (const [nombre, pendiente] of [['Pendientes', true], ['Historial', false]]) {
    await elegirPestana(page, testInfo, nombre);
    const vistas = (await leerLista(page, testInfo)).map((v) => clave(v.titulo, v.filas.Solicitante.replace(/ \(tú\)$/, '')));
    const esperadas = delServicio.filter((s) => (s.estado === 'PENDIENTE') === pendiente)
      .map((s) => clave(TIPO[s.tipoSolicitud.tipo], nombreSolicitud(s.funcionario)));
    expect(vistas.sort(), nombre).toEqual(esperadas.sort());
  }
});

test('HU-SOL-02 · criterio 3: un permiso sin turno de otro servicio no aparece', async ({ page }, testInfo) => {
  fallaConocida('C-17 y §6.3: el filtro `!s.turno || turno.servicio = servicio activo` deja pasar los permisos sin turno de todos los servicios (SolicitudesView.load).');
  await entrar(page, 'jefatura');
  const hoy = hoyChile();
  // Un permiso sin turno del funcionario multiservicio (Cirugía y Medicina Interna, no Urgencias).
  const ajeno = { idFuncionario: ID.multiservicio, nombre: 'Funcionario', apellidoPaterno: `id ${ID.multiservicio}`, apellidoMaterno: '' };
  const permiso = solicitudSimulada({ id: 990301, tipo: 1, funcionario: ajeno, servicio: URGENCIAS, motivo: 'Simulada: permiso de otro servicio',
    fechaInicioPermiso: `${sumarDias(hoy, 10)}T00:00:00`, fechaTerminoPermiso: `${sumarDias(hoy, 11)}T00:00:00` });
  await page.route(/\/api\/v2\/solicitudes$/, async (route) => {
    const r = await route.fetch();
    return route.fulfill({ response: r, json: [...await r.json(), permiso] });
  });
  await abrirSolicitudes(page, testInfo);
  const vistas = await leerLista(page, testInfo);
  expect(vistas.find((v) => v.motivo === permiso.motivo), 'el permiso de otro servicio no debe estar en la bandeja').toBeUndefined();
});

test('HU-SOL-02 · criterio 4: mis propias solicitudes aparecen; puedo cancelarlas pero no decidirlas', async ({ page, api }, testInfo) => {
  await entrar(page, 'jefatura');
  const turnos = await api.get(`/turnos/servicio/${SERVICIO.urgencias}`);
  const personal = await api.get(`/funcionarios/summary?servicioId=${SERVICIO.urgencias}`);
  const yo = personal.find((f) => f.idFuncionario === ID.jefatura);
  const miTurno = turnos.find((t) => t.idFuncionario === ID.jefatura && t.diaInicioTurno > hoyChile());
  const propia = solicitudSimulada({ id: 990401, tipo: 2, funcionario: yo, turno: miTurno, servicio: URGENCIAS, motivo: 'Simulada: botar mi turno' });
  await page.route(/\/api\/v2\/solicitudes$/, async (route) => {
    const r = await route.fetch();
    return route.fulfill({ response: r, json: [...await r.json(), propia] });
  });
  await abrirSolicitudes(page, testInfo);
  const vistas = await leerLista(page, testInfo);
  const mia = vistas.find((v) => v.motivo === propia.motivo);
  expect(mia, 'la solicitud propia aparece junto a las del servicio').toBeTruthy();
  expect(vistas.length, 'junto a las del servicio').toBeGreaterThan(1);
  expect(mia.botones, 'puede cancelarla').toContain('Cancelar solicitud');
  if (esDesktop(testInfo)) {
    expect(mia.botones.filter((b) => /^(Aprobar|Rechazar)$/.test(b)), 'no puede decidirla').toEqual([]);
    expect(mia.notas).toContain('Participas en esta solicitud: por segregación de funciones, la decisión corresponde a otra jefatura.');
  } else {
    // En móvil la tarjeta sí ofrece Aprobar y Rechazar, y la negativa la da el
    // backend al decidir (HU-SOL-09, criterio 6): eso escribe y queda para la fase 4.
    testInfo.annotations.push({ type: 'fase 4', description: 'En móvil, «no decidirlas» lo garantiza el backend al aprobar o rechazar (HU-SOL-09, criterio 6).' });
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// HU-OFE-05 · Ver solo las ofertas vigentes
// ═════════════════════════════════════════════════════════════════════════════

const terminoDe = (o) => o.turno.diaFinalTurno || o.turno.diaInicioTurno;
const tarjetasCentro = (page) => page.getByRole('region', { name: 'Disponibles' }).locator(':scope > div:nth-child(2) > div');

async function ofertasConVigentes(page, api, estados) {
  const hoy = hoyChile();
  const reales = await api.get(`/ofertas-generales/servicio/${SERVICIO.urgencias}`);
  const turnos = await api.get(`/turnos/servicio/${SERVICIO.urgencias}`);
  const personal = await api.get(`/funcionarios/summary?servicioId=${SERVICIO.urgencias}`);
  const ofertor = personal.find((f) => f.idFuncionario === 341);
  const futuros = turnos.filter((t) => t.idFuncionario === 341 && t.diaInicioTurno > hoy);
  const simuladas = estados.map((estado, i) => ofertaSimulada({ id: 9921 + i, estado, ofertor, turno: futuros[i], servicio: URGENCIAS }));
  await page.route(/\/api\/v2\/ofertas-generales\/servicio\/4$/, (route) => route.fulfill({ json: [...reales, ...simuladas] }));
  return { hoy, reales, simuladas };
}

test('HU-OFE-05 · criterio 1: en el Centro no aparecen las ofertas de turnos ya terminados', async ({ page, api }, testInfo) => {
  test.skip(!esDesktop(testInfo), 'El Centro de operaciones es la vista desktop; en móvil las ofertas están solo en Solicitudes.');
  await entrar(page, 'medico');
  const { hoy, reales, simuladas } = await ofertasConVigentes(page, api, ['ABIERTA']);
  const pasadas = reales.filter((o) => terminoDe(o) < hoy && ['ABIERTA', 'PENDIENTE_APROBACION'].includes(o.estado));
  expect(pasadas.length, 'el seed tiene una oferta abierta de un turno pasado').toBeGreaterThan(0);
  await page.reload();
  await esperarQuieta(page);
  await expect(tarjetasCentro(page)).toHaveCount(simuladas.length);
  await expect(tarjetasCentro(page).first()).toContainText(numDia(simuladas[0].turno.diaInicioTurno));
});

test('HU-OFE-05 · criterio 2: en el Centro las ofertas rechazadas no aparecen como disponibles', async ({ page, api }, testInfo) => {
  test.skip(!esDesktop(testInfo), 'El Centro de operaciones es la vista desktop; en móvil las ofertas están solo en Solicitudes.');
  await entrar(page, 'medico');
  const { simuladas } = await ofertasConVigentes(page, api, ['ABIERTA', 'RECHAZADA']);
  await page.reload();
  await esperarQuieta(page);
  await expect(tarjetasCentro(page)).toHaveCount(simuladas.filter((o) => o.estado !== 'RECHAZADA').length);
  await expect(page.getByRole('region', { name: 'Disponibles' }).getByText('Rechazada', { exact: true })).toHaveCount(0);
});

test('HU-OFE-05 · criterio 1: en «Ofertas generales» no aparecen las ofertas de turnos ya terminados', async ({ page, api }, testInfo) => {
  fallaConocida('C-16: la pestaña «Ofertas generales» de Solicitudes muestra todas las ofertas, también las de turnos pasados (la oferta 1 del seed).');
  await entrar(page, 'medico');
  const hoy = hoyChile();
  const ofertas = await api.get(`/ofertas-generales/servicio/${SERVICIO.urgencias}`);
  const pasadas = ofertas.filter((o) => terminoDe(o) < hoy);
  expect(pasadas.length).toBeGreaterThan(0);
  await abrirSolicitudes(page, testInfo);
  await elegirPestana(page, testInfo, 'Ofertas generales');
  const vistas = await leerLista(page, testInfo);
  const fechasPasadas = await Promise.all(pasadas.map((o) => fechaCL(page, o.turno.diaInicioTurno)));
  const conTurnoPasado = vistas.filter((v) => fechasPasadas.some((f) => (v.filas['Turno ofertado'] || '').includes(f)));
  expect(conTurnoPasado, 'ofertas de turnos ya terminados en la lista').toEqual([]);
});

test('HU-OFE-05 · criterio 2: en «Ofertas generales» las ofertas rechazadas no aparecen como disponibles', async ({ page, api }, testInfo) => {
  fallaConocida('C-16: la pestaña «Ofertas generales» de Solicitudes también lista las ofertas rechazadas (la oferta 3 del seed).');
  await entrar(page, 'medico');
  const ofertas = await api.get(`/ofertas-generales/servicio/${SERVICIO.urgencias}`);
  expect(ofertas.some((o) => o.estado === 'RECHAZADA'), 'el seed tiene una oferta rechazada').toBe(true);
  await abrirSolicitudes(page, testInfo);
  await elegirPestana(page, testInfo, 'Ofertas generales');
  const vistas = await leerLista(page, testInfo);
  expect(vistas.filter((v) => v.estado === 'Rechazada'), 'ofertas rechazadas en la lista').toEqual([]);
});
