// Calendario mensual — presentación desktop (R18).
//
// Solo dibuja: la carga del mes, la cobertura (getCoverageStats), los permisos
// y las acciones viven en calendarView.jsx y llegan por props. Grilla mensual
// a lo ancho con la cobertura Día/Noche de cada día y, al lado, el detalle del
// día elegido siempre visible (equipo y cupos libres). El detalle de un turno y
// la gestión de asignación se abren en el panel lateral (Sheet) desde la vista.
import React, { useRef } from 'react';
import './turnos.css';
import { SGTIcon } from '../../Style/UIPrimitives';
import { AvisoDesktop, BotonDesktop, ChipDesktop, EncabezadoDesktop, PaginaDesktop, PanelDesktop } from '../ui';

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const DIAS_LARGO = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const DIAS_CORTO = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

const claveDia = (anio, mes, dia) => `${anio}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
const indiceSemana = (anio, mes, dia) => (new Date(anio, mes - 1, dia).getDay() + 6) % 7; // 0 = lunes

// Colores por rotativa: los mismos del Centro de operaciones (eqColor), para
// que una rotativa se vea igual en el home y en el calendario.
const EQ_COLORES = [
  ['oklch(0.94 0.04 250)', 'oklch(0.35 0.08 250)'],
  ['oklch(0.94 0.04 150)', 'oklch(0.35 0.08 150)'],
  ['oklch(0.94 0.04 30)', 'oklch(0.4 0.09 30)'],
  ['oklch(0.94 0.04 85)', 'oklch(0.38 0.08 85)'],
  ['oklch(0.94 0.04 300)', 'oklch(0.38 0.08 300)'],
  ['oklch(0.94 0.04 190)', 'oklch(0.35 0.08 190)'],
];
const colorRotativa = (idRotativa, nombre) => {
  let h = Number(idRotativa);
  if (!Number.isFinite(h)) {
    h = 0;
    const s = String(nombre || '');
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  }
  return EQ_COLORES[Math.abs(h) % EQ_COLORES.length];
};

// "Miercoles Turno (T I)" → "T I". Sin código entre paréntesis, el nombre tal cual.
const rotativaCorta = (nombre) => {
  const m = String(nombre || '').match(/\(([^)]+)\)\s*$/);
  return m ? m[1] : (nombre || '');
};

const iniciales = (nombre) => {
  const partes = String(nombre || '').trim().split(/\s+/).filter(Boolean);
  return ((partes[0]?.[0] || '') + (partes[1]?.[0] || '')).toUpperCase() || '·';
};

// Orden del equipo como en el Centro: coordinación, urgenciólogos, médicos;
// dentro de cada grupo, por número de puesto.
const grupoPuesto = (puesto) => {
  const p = String(puesto || '').toLowerCase();
  if (p.includes('coordina')) return 'coord';
  if (p.includes('urgenci')) return 'urg';
  return 'med';
};
const ORDEN_GRUPO = { coord: 0, urg: 1, med: 2 };
const numeroPuesto = (puesto) => Number(String(puesto || '').match(/(\d+)\s*$/)?.[1] ?? 0);
const porPuesto = (a, b) =>
  (ORDEN_GRUPO[grupoPuesto(a.nombrePuesto)] - ORDEN_GRUPO[grupoPuesto(b.nombrePuesto)])
  || (numeroPuesto(a.nombrePuesto) - numeroPuesto(b.nombrePuesto))
  || String(a.nombrePuesto || '').localeCompare(String(b.nombrePuesto || ''), 'es');

// Nombre de puesto abreviado para la celda ("Médico General 8" → "MG 8").
const puestoCorto = (nombre) => String(nombre || 'Sin puesto')
  .replace(/^m[ée]dico general\s*/i, 'MG ')
  .replace(/^urgenci[óo]logo\s*/i, 'Urg. ')
  .replace(/^coordinador(a)?$/i, 'Coord.')
  .trim();

const ordenTipo = (g) => (g.tipo === 'noche' ? 1 : 0);
const esVacante = (t) => t.idFuncionario == null || t.turnoLibre;

const idRotativaDe = (grupo) => grupo.turnos.find((t) => t.nombreRotativa === grupo.nombreRotativa)?.idRotativa;

const IconoTipo = ({ tipo, size = 11 }) => (
  <SGTIcon name={tipo === 'noche' ? 'moon' : 'sun'} size={size} strokeWidth={2.4} />
);

// ── Celda de un día ──────────────────────────────────────────────────────────
const CeldaDia = ({ dia, clave, mesNombre, esHoy, esFinde, seleccionado, tabulable, stats, turnos, puedeGestionar, cargando, onSeleccionar, registrar }) => {
  if (!dia) return <div className="sgt-dt-dia sgt-dt-dia--fuera" aria-hidden="true" />;

  const tieneTurnos = (turnos?.length || 0) > 0;
  const grupos = (stats?.groups || []).slice().sort((a, b) => ordenTipo(a) - ordenTipo(b));
  const vacantes = stats?.vacantes || 0;
  const tengoTurno = Boolean(stats?.hasMy);
  // Marca del backend (R11): el usuario ya pidió uno de los cupos de este día.
  const solicitado = !puedeGestionar && (turnos || []).some((t) => esVacante(t) && t.solicitudPendiente);

  const clases = [
    'sgt-dt-dia',
    esHoy && 'sgt-dt-dia--hoy',
    esFinde && 'sgt-dt-dia--finde',
    !tieneTurnos && !cargando && 'sgt-dt-dia--sin-turnos',
  ].filter(Boolean).join(' ');

  const grupoMio = grupos.find((g) => g.hasMy);
  const cabecera = (
    <div className="sgt-dt-dia__cabecera">
      <span className="sgt-dt-dia__num">{dia}</span>
      {esHoy && <span className="sgt-dt-pill-hoy">HOY</span>}
      {grupoMio && (
        <span className="sgt-dt-dia__marca" title={`Tu turno: ${grupoMio.nombre}`}>
          <IconoTipo tipo={grupoMio.tipo} size={8} />TÚ
        </span>
      )}
    </div>
  );

  if (cargando && !tieneTurnos) {
    return (
      <div className={clases} aria-hidden="true">
        {cabecera}
        <div className="sgt-dt-cargando-celda" style={{ width: '82%' }} />
        <div className="sgt-dt-cargando-celda" style={{ width: '64%' }} />
      </div>
    );
  }
  if (!tieneTurnos) {
    return <div className={clases} aria-label={`${dia} de ${mesNombre}: sin turnos`}>{cabecera}</div>;
  }

  // Detalle que solo aparece cuando la celda es ancha (container query en turnos.css).
  const miTurno = (turnos || []).find((t) => t.miTurno);
  const puestosLibres = (turnos || []).filter(esVacante).slice().sort(porPuesto).map((t) => t.nombrePuesto || 'Sin puesto');

  const partesAria = grupos.map((g) => `${g.tipo === 'noche' ? 'noche' : 'día'} ${g.asignados} de ${g.total}`);
  if (vacantes > 0) partesAria.push(`${vacantes} ${vacantes === 1 ? 'cupo libre' : 'cupos libres'}`);
  if (tengoTurno) partesAria.push('tienes turno');
  if (solicitado) partesAria.push('ya solicitaste un cupo');

  return (
    <button
      ref={registrar}
      type="button"
      className={clases}
      aria-pressed={seleccionado}
      aria-label={`${dia} de ${mesNombre}: ${partesAria.join(', ')}`}
      tabIndex={tabulable ? 0 : -1}
      data-dia={dia}
      onClick={() => onSeleccionar(clave)}
    >
      {cabecera}
      {grupos.slice(0, 2).map((g) => (
        <div
          key={g.key}
          className={`sgt-dt-bloque sgt-dt-bloque--${g.tipo === 'noche' ? 'noche' : 'dia'}${g.hasMy ? ' sgt-dt-bloque--mio' : ''}`}
          title={`${g.nombre}${g.nombreRotativa ? ` · ${g.nombreRotativa}` : ''} · ${g.asignados}/${g.total}`}
        >
          <IconoTipo tipo={g.tipo} size={10} />
          {g.nombreRotativa && <span className="sgt-dt-bloque__rot">{rotativaCorta(g.nombreRotativa)}</span>}
          <span className={`sgt-dt-bloque__cob ${g.completo ? 'sgt-dt-bloque__cob--ok' : 'sgt-dt-bloque__cob--falta'}`}>
            {g.asignados}/{g.total}
          </span>
        </div>
      ))}
      {miTurno && (
        <div className="sgt-dt-dia__extra sgt-dt-dia__extra--mio" title={`Tu turno: ${miTurno.inicio}–${miTurno.fin}${miTurno.nombrePuesto ? ` · ${miTurno.nombrePuesto}` : ''}`}>
          Tú · {miTurno.inicio}–{miTurno.fin}{miTurno.nombrePuesto ? ` · ${puestoCorto(miTurno.nombrePuesto)}` : ''}
        </div>
      )}
      {(vacantes > 0 || solicitado || grupos.length > 2) && (
        <div className="sgt-dt-dia__pie" title={puestosLibres.length ? `Cupos libres: ${puestosLibres.join(', ')}` : undefined}>
          {vacantes > 0 && <span className="sgt-dt-dia__libres">{vacantes} {vacantes === 1 ? 'libre' : 'libres'}</span>}
          {puestosLibres.length > 0 && (
            <span className="sgt-dt-dia__libres-puestos">· {puestosLibres.map(puestoCorto).join(', ')}</span>
          )}
          {solicitado && <span className="sgt-dt-dia__solicitado">· Solicitado</span>}
          {grupos.length > 2 && <span style={{ color: 'var(--ink3)' }}>+{grupos.length - 2}</span>}
        </div>
      )}
    </button>
  );
};

// ── Bloque Día/Noche del panel del día ───────────────────────────────────────
const BloqueTurno = ({ grupo, puedeGestionar, onAbrirTurno, onAsignar, onSolicitar }) => {
  const esNoche = grupo.tipo === 'noche';
  const asignados = grupo.turnos.filter((t) => !esVacante(t)).slice().sort(porPuesto);
  const libres = grupo.turnos.filter(esVacante).slice().sort(porPuesto);
  const [eqBg, eqInk] = colorRotativa(idRotativaDe(grupo), grupo.nombreRotativa);
  const pct = grupo.total > 0 ? Math.round((grupo.asignados / grupo.total) * 100) : 0;
  const horario = grupo.inicio && grupo.fin ? `${grupo.inicio}–${grupo.fin}` : 'Horario no definido';

  return (
    <section className={`sgt-dt-turno${esNoche ? ' sgt-dt-turno--noche' : ''}`} aria-label={`${grupo.nombre} ${horario}`}>
      <div className="sgt-dt-turno__cabecera">
        <IconoTipo tipo={grupo.tipo} size={13} />
        <span className="sgt-dt-turno__titulo">{String(grupo.nombre || '').toUpperCase()} · {horario}</span>
        {grupo.nombreRotativa && (
          <span className="sgt-dt-turno__rot" style={{ background: eqBg, color: eqInk }} title={grupo.nombreRotativa}>
            {grupo.nombreRotativa}
          </span>
        )}
        <span
          className="sgt-dt-turno__cob"
          style={{ color: grupo.completo ? 'var(--success)' : 'var(--d-coral-ink)' }}
          aria-label={`${grupo.asignados} de ${grupo.total} asignados`}
        >
          {grupo.asignados}/{grupo.total}
        </span>
      </div>
      <div className="sgt-dt-turno__cuerpo">
        <div className="sgt-dt-barra" aria-hidden="true">
          <span style={{ width: `${pct}%`, background: grupo.completo ? 'var(--success)' : 'var(--accent)' }} />
        </div>
        <div className="sgt-dt-equipo">
          {libres.map((t) => {
            const puesto = t.nombrePuesto || 'Sin posición';
            // Misma regla que la tarjeta de vacante del detalle (ShiftDetail): quien no
            // gestiona y ya lo pidió (marca del backend, R11/R12) ve "Solicitado".
            const yaSolicitada = !puedeGestionar && Boolean(t.solicitudPendiente);
            return (
              <div key={`libre-${t.id}`} className="sgt-dt-libre">
                <button type="button" className="sgt-dt-libre__abrir" aria-label={`Cupo libre: ${puesto}`} onClick={() => onAbrirTurno(t)}>
                  <span className="sgt-dt-libre__mas" aria-hidden="true"><SGTIcon name="plus" size={11} strokeWidth={2.6} /></span>
                  <span className="sgt-dt-libre__texto">
                    <span className="sgt-dt-libre__titulo">Cupo libre</span>
                    <span className="sgt-dt-libre__puesto">{puesto}</span>
                  </span>
                </button>
                {puedeGestionar ? (
                  <BotonDesktop variante="primario" tamano="sm" icono="user-plus" aria-label={`Asignar cupo libre: ${puesto}`} onClick={() => onAsignar(t)}>
                    Asignar
                  </BotonDesktop>
                ) : yaSolicitada ? (
                  <ChipDesktop tono="aviso" mayus>Solicitado</ChipDesktop>
                ) : (
                  <BotonDesktop variante="secundario" tamano="sm" icono="hand-raised" aria-label={`Solicitar cupo libre: ${puesto}`} onClick={() => onSolicitar(t)}>
                    Solicitar
                  </BotonDesktop>
                )}
              </div>
            );
          })}
          {asignados.map((t) => {
            const g = grupoPuesto(t.nombrePuesto);
            return (
              <button
                key={t.id}
                type="button"
                className="sgt-dt-persona"
                aria-label={`Ver detalle de ${t.nombreFuncionario || 'funcionario'}`}
                title={`${t.nombreFuncionario || 'Sin nombre'}${t.nombrePuesto ? ` · ${t.nombrePuesto}` : ''}`}
                onClick={() => onAbrirTurno(t)}
              >
                <span className={`sgt-dt-avatar ${t.miTurno ? 'sgt-dt-avatar--yo' : `sgt-dt-avatar--${g}`}`} aria-hidden="true">
                  {iniciales(t.nombreFuncionario)}
                </span>
                <span className="sgt-dt-persona__texto">
                  <span className="sgt-dt-persona__nombre">
                    {t.nombreFuncionario || 'Sin nombre'}
                    {t.miTurno && <span className="sgt-dt-tu"> (tú)</span>}
                  </span>
                  {t.nombrePuesto && <span className="sgt-dt-persona__puesto">{t.nombrePuesto}</span>}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
};

// ── Panel del día ────────────────────────────────────────────────────────────
const PanelDia = ({ clave, anio, mes, dia, esHoy, stats, cargando, puedeGestionar, onAbrirTurno, onAsignar, onSolicitar }) => {
  const idx = indiceSemana(anio, mes, dia);
  const titulo = `${DIAS_LARGO[idx]} ${dia} de ${MESES[mes - 1]}`;
  const grupos = (stats?.groups || []).slice().sort((a, b) => ordenTipo(a) - ordenTipo(b));
  const total = stats?.total || 0;

  return (
    <PanelDesktop
      className="sgt-dt-diapanel"
      titulo={<span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>{titulo}{esHoy && <span className="sgt-dt-pill-hoy">HOY</span>}</span>}
      subtitulo={total > 0
        ? (stats.vacantes > 0 ? `${stats.vacantes} ${stats.vacantes === 1 ? 'cupo libre' : 'cupos libres'} por cubrir` : 'Cobertura completa')
        : 'Sin turnos programados'}
      icono="calendar"
      scroll
      aria-label={`Detalle del ${titulo}`}
      data-dia={clave}
    >
      {cargando && total === 0 ? (
        <>
          <div className="sgt-d-cargando" style={{ width: '70%' }} />
          <div className="sgt-d-cargando" style={{ width: '90%' }} />
          <div className="sgt-d-cargando" style={{ width: '55%' }} />
        </>
      ) : total === 0 ? (
        <div className="sgt-d-vacio" style={{ padding: '28px 10px' }}>
          <SGTIcon name="calendar" size={24} color="var(--ink3)" />
          <div className="sgt-d-vacio__texto">Sin turnos para este día.</div>
        </div>
      ) : (
        <>
          <div className="sgt-dt-diapanel__cobertura">
            <div className="sgt-dt-mini"><div className="sgt-dt-mini__etiqueta">Asignados</div><div className="sgt-dt-mini__valor">{stats.asignados}</div></div>
            <div className="sgt-dt-mini"><div className="sgt-dt-mini__etiqueta">Total</div><div className="sgt-dt-mini__valor">{stats.total}</div></div>
            <div className={`sgt-dt-mini${stats.vacantes > 0 ? ' sgt-dt-mini--alerta' : ''}`}><div className="sgt-dt-mini__etiqueta">Vacantes</div><div className="sgt-dt-mini__valor">{stats.vacantes}</div></div>
          </div>
          {grupos.map((g) => (
            <BloqueTurno
              key={g.key}
              grupo={g}
              puedeGestionar={puedeGestionar}
              onAbrirTurno={onAbrirTurno}
              onAsignar={onAsignar}
              onSolicitar={onSolicitar}
            />
          ))}
        </>
      )}
    </PanelDesktop>
  );
};

// ── Vista ────────────────────────────────────────────────────────────────────
const CalendarioDesktop = ({
  titulo, subtitulo, resumen,
  anio, mes, celdas, hoyKey, diaKey,
  turnosPorDia, statsPorDia,
  cargando, error, puedeGestionar,
  onMesAnterior, onMesSiguiente, onHoy, esMesActual, onExportar,
  onSeleccionarDia, onAbrirTurno, onAsignar, onSolicitar,
}) => {
  const mesNombre = MESES[mes - 1];
  const prefijoMes = `${anio}-${String(mes).padStart(2, '0')}-`;
  const hayDatosDelMes = Object.keys(turnosPorDia || {}).some((k) => k.startsWith(prefijoMes));
  const cargandoMes = cargando && !hayDatosDelMes;
  const diaPanel = Number(String(diaKey).slice(8, 10));

  // Teclado en la grilla (roving tabindex): un solo día en el orden de tabulación
  // (el abierto) y las flechas se mueven entre días con turnos (←/→ un día,
  // ↑/↓ una semana; Inicio/Fin, primer y último día del mes).
  const celdasRef = useRef(new Map());
  const diasConTurnos = celdas.filter((d) => d && (turnosPorDia?.[claveDia(anio, mes, d)]?.length || 0) > 0);
  const onTecla = (e) => {
    const paso = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[e.key];
    let destino = null;
    if (paso) {
      for (let d = diaPanel + paso; d >= 1 && d <= 31; d += paso) {
        if (diasConTurnos.includes(d)) { destino = d; break; }
      }
    } else if (e.key === 'Home') destino = diasConTurnos[0];
    else if (e.key === 'End') destino = diasConTurnos[diasConTurnos.length - 1];
    else return;
    e.preventDefault();
    if (!destino) return;
    onSeleccionarDia(claveDia(anio, mes, destino));
    requestAnimationFrame(() => celdasRef.current.get(destino)?.focus());
  };
  // Si el día abierto no tiene turnos (mes vacío), el primer día con turnos
  // recibe el foco de tabulación para que la grilla siga siendo alcanzable.
  const diaTabulable = diasConTurnos.includes(diaPanel) ? diaPanel : diasConTurnos[0];

  return (
    <>
      <EncabezadoDesktop
        titulo={titulo}
        subtitulo={subtitulo}
        acciones={(
          <>
            {resumen && (
              <>
                {resumen.mios != null && (
                  <span className="sgt-dt-resumen sgt-dt-resumen--mio">{resumen.mios} {resumen.mios === 1 ? 'turno tuyo' : 'turnos tuyos'}</span>
                )}
                <span className={`sgt-dt-resumen${resumen.vacantes === 0 ? ' sgt-dt-resumen--ok' : ''}`}>{resumen.asignados}/{resumen.total} asignados</span>
                {resumen.vacantes > 0 && (
                  <span className="sgt-dt-resumen sgt-dt-resumen--libres">{resumen.vacantes} {resumen.vacantes === 1 ? 'cupo libre' : 'cupos libres'}</span>
                )}
              </>
            )}
            <div className="sgt-dt-nav" role="group" aria-label="Mes">
              <button type="button" className="sgt-dt-nav__btn" aria-label="Mes anterior" onClick={onMesAnterior}>
                <SGTIcon name="chevron-left" size={13} strokeWidth={2.4} />
              </button>
              <button type="button" className="sgt-dt-nav__btn sgt-dt-nav__btn--texto" onClick={onHoy} disabled={esMesActual && diaKey === hoyKey} aria-label="Ir a hoy">
                Hoy
              </button>
              <button type="button" className="sgt-dt-nav__btn" aria-label="Mes siguiente" onClick={onMesSiguiente}>
                <SGTIcon name="chevron-right" size={13} strokeWidth={2.4} />
              </button>
            </div>
            <BotonDesktop variante="secundario" icono="download" onClick={onExportar}>Exportar CSV</BotonDesktop>
          </>
        )}
      />
      <PaginaDesktop className="sgt-dt-pagina-fija">
        {error && !cargando && <AvisoDesktop tono="alerta"><span role="alert">{error}</span></AvisoDesktop>}
        <div className="sgt-dt-cal">
          <PanelDesktop className="sgt-dt-cal__panel" aria-label={`Calendario de ${mesNombre} ${anio}`} sinPadding scroll>
            <div className="sgt-dt-cal__grilla">
              <div className="sgt-dt-cal__semana" aria-hidden="true">
                {DIAS_CORTO.map((d) => <span key={d}>{d}</span>)}
              </div>
              <div className="sgt-dt-cal__dias" onKeyDown={onTecla}>
                {celdas.map((dia, idx) => {
                  const clave = dia ? claveDia(anio, mes, dia) : `vacio-${idx}`;
                  return (
                    <CeldaDia
                      key={clave}
                      dia={dia}
                      clave={clave}
                      mesNombre={mesNombre}
                      esHoy={clave === hoyKey}
                      esFinde={idx % 7 >= 5}
                      seleccionado={clave === diaKey}
                      tabulable={dia === diaTabulable}
                      stats={dia ? statsPorDia[clave] : null}
                      turnos={dia ? turnosPorDia[clave] : null}
                      puedeGestionar={puedeGestionar}
                      cargando={cargandoMes}
                      onSeleccionar={onSeleccionarDia}
                      registrar={(el) => { if (el) celdasRef.current.set(dia, el); else celdasRef.current.delete(dia); }}
                    />
                  );
                })}
              </div>
              <div className="sgt-dt-cal__pie" aria-hidden="true">
                <span className="sgt-dt-cal__pie-item"><SGTIcon name="sun" size={11} color="var(--dt-dia-ink)" strokeWidth={2.4} /> Día</span>
                <span className="sgt-dt-cal__pie-item"><SGTIcon name="moon" size={10} color="var(--dt-noche-ink)" strokeWidth={2.4} /> Noche</span>
                <span className="sgt-dt-cal__pie-item"><b style={{ color: 'var(--success)' }}>15/15</b> completo</span>
                <span className="sgt-dt-cal__pie-item"><b style={{ color: 'var(--d-coral-ink)' }}>13/15</b> faltan personas</span>
                <span className="sgt-dt-cal__pie-item"><span className="sgt-dt-dia__marca" style={{ marginLeft: 0 }}>TÚ</span> tu turno</span>
              </div>
            </div>
          </PanelDesktop>

          <PanelDia
            clave={diaKey}
            anio={anio}
            mes={mes}
            dia={diaPanel}
            esHoy={diaKey === hoyKey}
            stats={statsPorDia[diaKey]}
            cargando={cargandoMes}
            puedeGestionar={puedeGestionar}
            onAbrirTurno={onAbrirTurno}
            onAsignar={onAsignar}
            onSolicitar={onSolicitar}
          />
        </div>
      </PaginaDesktop>
    </>
  );
};

export default CalendarioDesktop;
