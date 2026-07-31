import React, { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import 'dayjs/locale/es';
import { useAuth } from '../../context/AuthContext';
import { turnosService } from '../../services/adminService';
import { SGT_DATA, DASHBOARD_ICON_THEMES } from '../Admin2/data';
import { SGTBadge, SGTIcon, TopHeader, IconBadge3D, CoverageBar } from '../Style/UIPrimitives';
import { ListEmptyState, LoadingState } from '../Style/ListControls';
import PeriodoSelector, { buildSemanasDelMes, rangoPeriodo } from '../Style/PeriodoSelector';

dayjs.locale('es');

// ──────────────────────────────────────────────
// Subcomponentes
// ──────────────────────────────────────────────

const STAT_TONE_THEME = {
  primary: 'blue',
  accent:  'red',
  success: 'green',
  warn:    'amber',
};

const StatCard = ({ icon, label, value, tone }) => {
  const PA = SGT_DATA.PALETTE;
  return (
    <div className="sgt-list-row" style={{
      background: '#fff', border: 'none', boxShadow: '0 2px 10px rgba(15,23,42,0.06)', borderRadius: 16,
      padding: '14px 12px', display: 'flex', flexDirection: 'column', gap: 6, flex: 1,
    }}>
      <div style={{ alignSelf: 'center' }}>
        <IconBadge3D icon={icon} theme={STAT_TONE_THEME[tone] || 'blue'} size={34} radius={10} iconSize={17} />
      </div>
      <div style={{ fontSize: 22, fontWeight: 800, color: PA.ink, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 11, fontWeight: 700, color: PA.ink3 }}>{label}</div>
    </div>
  );
};

const TurnoLibreItem = ({ turno }) => {
  const PA = SGT_DATA.PALETTE;
  const fecha = turno.diaInicioTurno ? dayjs(turno.diaInicioTurno).format('ddd D MMM') : '—';
  return (
    <div className="sgt-list-row" style={{
      display: 'flex', alignItems: 'center', gap: 10,
      background: '#fff', border: 'none', boxShadow: '0 2px 10px rgba(15,23,42,0.06)', borderRadius: 16, padding: '10px 12px',
    }}>
      <IconBadge3D icon="calendar" theme="red" size={36} radius={10} iconSize={16} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: PA.ink }}>{fecha}</div>
        <div style={{ fontSize: 11, color: PA.ink3, fontWeight: 600, marginTop: 1 }}>
          {turno.horaInicio || '?'} – {turno.horaFin || '?'} · {turno.nombrePuesto || 'Sin puesto'}
        </div>
      </div>
      <SGTBadge tone="accent" size="xs">Vacante</SGTBadge>
    </div>
  );
};

// ──────────────────────────────────────────────
// Componente principal
// ──────────────────────────────────────────────

const AdminStats = ({ onBack }) => {
  const PA = SGT_DATA.PALETTE;
  const { user } = useAuth();

  const [mesOffset, setMesOffset]               = useState(0);
  const [semanaKey, setSemanaKey]               = useState(null);
  const [stats, setStats]                       = useState(null);
  const [vacantes, setVacantes]                 = useState([]);
  const [funcsStats, setFuncsStats]             = useState(null);
  const [puestoMasCritico, setPuestoMasCritico] = useState(null);
  const [loading, setLoading]                   = useState(true);
  const [error, setError]                       = useState(null);

  const [showDetalle, setShowDetalle]               = useState(false);
  const [detalle, setDetalle]                       = useState(null);
  const [loadingDetalle, setLoadingDetalle]         = useState(false);
  const [expandedIds, setExpandedIds]               = useState(new Set());

  const [showCobertura, setShowCobertura]           = useState(false);
  const [showPuestos, setShowPuestos]               = useState(false);
  const [todosDetalle, setTodosDetalle]             = useState(null);
  const [loadingTodos, setLoadingTodos]             = useState(false);
  const [expandedPuestosIds, setExpandedPuestosIds] = useState(new Set());

  const [filtroOpen, setFiltroOpen]           = useState(false);
  const [filtroActivo, setFiltroActivo]       = useState(new Set());
  const [filtroTipo, setFiltroTipo]           = useState(null);
  const [filtroPuesto, setFiltroPuesto]       = useState(null);
  const [filtroFecha, setFiltroFecha]         = useState(null);
  const [filtroPlantilla, setFiltroPlantilla] = useState(null);

  const servicioId = user?.servicioId;

  useEffect(() => {
    if (!servicioId) return;
    setLoading(true);
    setError(null);
    setDetalle(null);
    setTodosDetalle(null);
    setFiltroTipo(null);
    setFiltroPuesto(null);
    setFiltroFecha(null);
    setFiltroPlantilla(null);
    setFiltroOpen(false);
    setFiltroActivo(new Set());

    const mesActual = dayjs().subtract(mesOffset, 'month');
    const semanas   = buildSemanasDelMes(mesActual.year(), mesActual.month() + 1);
    const { inicio, fin } = rangoPeriodo(mesOffset, semanaKey, semanas);
    const fmt = d => d.format('YYYY-MM-DD');

    Promise.all([
      turnosService.getStats(servicioId, fmt(inicio), fmt(fin)),
      turnosService.getSinAsignarPorPeriodo(servicioId, fmt(inicio), fmt(fin)),
      turnosService.getFuncionariosStats(servicioId, fmt(inicio), fmt(fin)),
    ])
      .then(([s, v, f]) => {
        setStats(s || {});
        setFuncsStats(f || {});
        const counts = {};
        (v || []).forEach(t => {
          const p = t.nombrePuesto || 'Sin puesto';
          counts[p] = (counts[p] || 0) + 1;
        });
        const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
        setPuestoMasCritico(entries.length > 0 ? { nombre: entries[0][0], vacantes: entries[0][1] } : null);
        setVacantes((v || []).slice(0, 8));
      })
      .catch(() => setError('No se pudieron cargar las estadísticas.'))
      .finally(() => setLoading(false));
  }, [servicioId, mesOffset, semanaKey]);

  const pct = stats?.porcentajeCobertura ?? 0;

  const mesActualForDetalle = dayjs().subtract(mesOffset, 'month');
  const semanasForDetalle   = buildSemanasDelMes(mesActualForDetalle.year(), mesActualForDetalle.month() + 1);
  const { inicio: inicioDetalle, fin: finDetalle } = rangoPeriodo(mesOffset, semanaKey, semanasForDetalle);
  const fmt = d => d.format('YYYY-MM-DD');

  const periodoLabel = (() => {
    const mesLabel = mesActualForDetalle.format('MMMM YYYY');
    if (semanaKey) {
      const s = semanasForDetalle.find(s => s.key === semanaKey);
      return s ? `${s.key} · ${mesLabel}` : mesLabel;
    }
    return mesLabel;
  })();

  // Colores literales (no var(--...)) porque más abajo se les concatena un sufijo de alpha ("18").
  const avatarColores = ['#17416C', '#B85A60', '#2E7D57', '#C88700', '#7C6FCD', '#2E9E8A'];
  const getAvatarColor = (idx) => avatarColores[idx % avatarColores.length];
  const getInitials = (nombre) => {
    const parts = nombre.trim().split(' ').filter(Boolean);
    return parts.length >= 2
      ? (parts[0][0] + parts[1][0]).toUpperCase()
      : (parts[0]?.[0] ?? '?').toUpperCase();
  };

  const handleAbrirDetalle = () => {
    setShowDetalle(true);
    setExpandedIds(new Set());
    if (!detalle) {
      setLoadingDetalle(true);
      turnosService.getFuncionariosDetalle(servicioId, fmt(inicioDetalle), fmt(finDetalle))
        .then(d => setDetalle(d || []))
        .catch(() => setDetalle([]))
        .finally(() => setLoadingDetalle(false));
    }
  };

  const cargarTodosDetalle = () => {
    if (!todosDetalle) {
      setLoadingTodos(true);
      turnosService.getTodosDetalle(servicioId, fmt(inicioDetalle), fmt(finDetalle))
        .then(d => setTodosDetalle(d || []))
        .catch(() => setTodosDetalle([]))
        .finally(() => setLoadingTodos(false));
    }
  };

  const handleAbrirCobertura = () => { setShowCobertura(true); cargarTodosDetalle(); };
  const handleAbrirPuestos   = () => { setShowPuestos(true); setExpandedPuestosIds(new Set()); cargarTodosDetalle(); };

  const togglePuesto = (nombre) => setExpandedPuestosIds(prev => {
    const next = new Set(prev);
    next.has(nombre) ? next.delete(nombre) : next.add(nombre);
    return next;
  });

  const opcionesTipo      = React.useMemo(() => [...new Set((todosDetalle || []).map(t => t.tipoTurno).filter(Boolean))].sort(), [todosDetalle]);
  const opcionesPuesto    = React.useMemo(() => [...new Set((todosDetalle || []).map(t => t.nombrePuesto).filter(Boolean))].sort(), [todosDetalle]);
  const opcionesFecha     = React.useMemo(() => [...new Set((todosDetalle || []).map(t => t.fecha).filter(Boolean))].sort(), [todosDetalle]);
  const opcionesPlantilla = React.useMemo(() => [...new Set((todosDetalle || []).map(t => t.nombreRotativa).filter(Boolean))].sort(), [todosDetalle]);

  const turnosFiltrados = React.useMemo(() => {
    if (!todosDetalle) return [];
    return todosDetalle.filter(t => {
      if (filtroTipo      && t.tipoTurno      !== filtroTipo)      return false;
      if (filtroPuesto    && t.nombrePuesto   !== filtroPuesto)    return false;
      if (filtroFecha     && t.fecha          !== filtroFecha)     return false;
      if (filtroPlantilla && t.nombreRotativa !== filtroPlantilla) return false;
      return true;
    });
  }, [todosDetalle, filtroTipo, filtroPuesto, filtroFecha, filtroPlantilla]);

  const puestosAgrupados = React.useMemo(() => {
    if (!todosDetalle) return null;
    const map = {};
    todosDetalle.forEach(t => {
      const p = t.nombrePuesto || 'Sin puesto';
      if (!map[p]) map[p] = { nombre: p, turnos: [], total: 0, asignados: 0 };
      map[p].turnos.push(t);
      map[p].total++;
      if (t.asignado) map[p].asignados++;
    });
    return Object.values(map).sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [todosDetalle]);

  return (
    <div className="dash-page-bg" style={{ flex: 1, display: 'flex', flexDirection: 'column', animation: 'sgtSlideLeft .3s ease', overflow: 'hidden', position: 'relative' }}>

      <TopHeader
        title="Estadísticas del Servicio"
        leftSlot={
          <button onClick={onBack} style={{ background: 'transparent', border: 'none', padding: 4, cursor: 'pointer', display: 'flex' }}>
            <SGTIcon name="chevron-left" size={24} color={PA.ink} />
          </button>
        }
      />

      <div style={{ flex: 1, overflow: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>

        <PeriodoSelector
          mesOffset={mesOffset} setMesOffset={setMesOffset}
          semanaKey={semanaKey} setSemanaKey={setSemanaKey}
        />

        {loading && <LoadingState label="Cargando estadísticas..." />}

        {error && (
          <div style={{ background: PA.accentSoft, border: `1px solid #F3D2D5`, borderRadius: 12, padding: 14, fontSize: 13, color: '#8C3F44', fontWeight: 700 }}>
            {error}
          </div>
        )}

        {!loading && !error && stats && (
          <>
            <div
              className="sgt-list-row"
              onClick={handleAbrirCobertura}
              style={{ background: '#fff', border: 'none', boxShadow: '0 2px 10px rgba(15,23,42,0.06)', borderRadius: 16, padding: 16, cursor: 'pointer' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <span style={{ fontSize: 14, fontWeight: 800, color: PA.ink }}>Cobertura de turnos</span>
                <span style={{ fontSize: 22, fontWeight: 800, color: pct >= 80 ? PA.success : pct >= 50 ? PA.warn : PA.accent }}>
                  {pct}%
                </span>
              </div>
              <CoverageBar
                value={stats.turnosAsignados ?? 0} max={stats.totalTurnos ?? 0}
                tone={pct >= 80 ? 'success' : pct >= 50 ? 'warn' : 'danger'}
                showPercent={false}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                <span style={{ fontSize: 11, color: PA.ink3, fontWeight: 600 }}>
                  {stats.turnosAsignados ?? '—'} asignados de {stats.totalTurnos ?? '—'} totales
                </span>
                <span style={{ fontSize: 11, fontWeight: 800, color: pct >= 80 ? PA.success : pct >= 50 ? PA.warn : PA.accent }}>Ver detalle →</span>
              </div>
            </div>

            {funcsStats && (
              <div
                className="sgt-list-row"
                onClick={handleAbrirDetalle}
                style={{ background: '#fff', border: 'none', boxShadow: '0 2px 10px rgba(15,23,42,0.06)', borderRadius: 16, padding: 16, cursor: 'pointer' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <span style={{ fontSize: 14, fontWeight: 800, color: PA.ink }}>Funcionarios con turno</span>
                  <span style={{ fontSize: 20, fontWeight: 800, color: PA.primary }}>
                    {funcsStats.funcionariosConTurno ?? '—'} / {funcsStats.totalFuncionarios ?? '—'}
                  </span>
                </div>
                <CoverageBar
                  value={funcsStats.funcionariosConTurno ?? 0} max={funcsStats.totalFuncionarios ?? 0}
                  tone="primary" showPercent={false}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                  <span style={{ fontSize: 11, color: PA.ink3, fontWeight: 600 }}>
                    {funcsStats.totalFuncionarios > 0
                      ? `${Math.round((funcsStats.funcionariosConTurno / funcsStats.totalFuncionarios) * 100)}% del equipo activo en este período`
                      : 'Sin datos de equipo'}
                  </span>
                  <span style={{ fontSize: 11, fontWeight: 800, color: PA.primary }}>Ver detalle →</span>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: 10 }}>
              <StatCard icon="calendar"     label="Turnos totales" value={stats.totalTurnos ?? '—'}     tone="primary" />
              <StatCard icon="check-circle" label="Asignados"      value={stats.turnosAsignados ?? '—'} tone="success" />
              <StatCard icon="alert"        label="Vacantes"       value={stats.turnosVacantes ?? '—'}  tone="accent"  />
            </div>


            {vacantes.length > 0 && (
              <div>
                <div style={{ fontSize: 12, fontWeight: 800, color: PA.ink3, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 }}>
                  Turnos vacantes
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {vacantes.map(t => <TurnoLibreItem key={t.id} turno={t} />)}
                </div>
              </div>
            )}

            {vacantes.length === 0 && (
              <ListEmptyState
                icon="calendar" theme="slate"
                title="Sin turnos vacantes"
                message="No hay turnos vacantes en este período."
              />
            )}
          </>
        )}
      </div>

    {/* ── Bottom sheet: Cobertura de turnos ── */}
    {showCobertura && (() => {
      const filtrosActivos = [filtroTipo, filtroPuesto, filtroFecha, filtroPlantilla].filter(Boolean).length;
      const asignados = turnosFiltrados.filter(t => t.asignado).length;
      const vacantesF = turnosFiltrados.filter(t => !t.asignado).length;

      const FilaFiltro = ({ id, label, opciones, valor, onSelect }) => {
        const abierto = filtroActivo.has(id);
        const scrollRef = React.useRef(null);
        const [tieneOverflow, setTieneOverflow] = React.useState(false);

        React.useEffect(() => {
          if (abierto && scrollRef.current) {
            setTieneOverflow(scrollRef.current.scrollHeight > scrollRef.current.clientHeight);
          } else {
            setTieneOverflow(false);
          }
        }, [abierto, opciones]);

        const toggleFila = () => setFiltroActivo(prev => {
          const next = new Set(prev);
          next.has(id) ? next.delete(id) : next.add(id);
          return next;
        });
        const seleccionar = (v) => {
          onSelect(v);
          setFiltroActivo(prev => { const next = new Set(prev); next.delete(id); return next; });
        };
        return (
          <div>
            <button
              onClick={toggleFila}
              style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', gap: 8 }}
            >
              <span style={{ fontSize: 13, fontWeight: 700, color: PA.ink }}>{label}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{
                  fontSize: 11, fontWeight: 700, borderRadius: 20, padding: '2px 10px',
                  color: valor ? PA.primary : PA.ink3,
                  background: valor ? PA.primarySoft : PA.line2,
                }}>
                  {id === 'fecha' && valor ? dayjs(valor).format('ddd D MMM') : (valor || 'Todos')}
                </span>
                <SGTIcon name={abierto ? 'chevron-up' : 'chevron-down'} size={13} color={PA.ink3} />
              </div>
            </button>
            {abierto && (
              <div style={{ position: 'relative' }}>
                <div ref={scrollRef} className="sgt-scroll-clean" style={{ paddingBottom: 6, maxHeight: 180, overflowY: 'auto' }}>
                  {[{ v: null, label: 'Todos' }, ...opciones.map(o => ({ v: o, label: id === 'fecha' ? dayjs(o).format('ddd D MMM') : o }))].map(({ v, label: lbl }) => (
                    <button
                      key={v ?? '__todos__'}
                      onClick={() => seleccionar(v)}
                      style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, padding: '8px 4px', borderRadius: 8 }}
                    >
                      <div style={{ width: 16, height: 16, borderRadius: '50%', border: `2px solid ${valor === v ? PA.primary : PA.line}`, background: valor === v ? PA.primary : 'transparent', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {valor === v && <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff' }} />}
                      </div>
                      <span style={{ fontSize: 13, fontWeight: valor === v ? 700 : 500, color: valor === v ? PA.primary : PA.ink }}>{lbl}</span>
                    </button>
                  ))}
                </div>
                {tieneOverflow && (
                  <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 32, background: 'linear-gradient(to bottom, transparent, #F7F9FC)', pointerEvents: 'none', borderRadius: '0 0 8px 8px' }} />
                )}
              </div>
            )}
          </div>
        );
      };

      return (
        <div onClick={() => setShowCobertura(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'flex-end', zIndex: 200, animation: 'sgtFade .2s ease' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: '20px 20px 0 0', width: '100%', maxHeight: '78%', display: 'flex', flexDirection: 'column', boxShadow: '0 -12px 40px rgba(15,23,42,0.16)', animation: 'sgtSlideUp .28s cubic-bezier(.2,.9,.2,1)' }}>
            <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 10, paddingBottom: 2, flexShrink: 0 }}>
              <div style={{ width: 40, height: 4, background: PA.line, borderRadius: 99 }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', padding: '10px 16px 12px', flexShrink: 0 }}>
              <div style={{ width: 28, flexShrink: 0 }} />
              <div style={{ flex: 1, textAlign: 'center' }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: PA.ink }}>Cobertura de turnos</div>
                <div style={{ fontSize: 12, fontWeight: 600, color: PA.ink3, marginTop: 2, textTransform: 'capitalize' }}>{periodoLabel}</div>
              </div>
              <button onClick={() => setShowCobertura(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex', flexShrink: 0 }}>
                <SGTIcon name="close" size={20} color={PA.ink3} />
              </button>
            </div>

            <div className="sgt-scroll-clean" style={{ flex: 1, overflowY: 'auto' }}>

              {/* Resumen dinámico */}
              {!loadingTodos && todosDetalle && (
                <div style={{ margin: '0 16px', padding: '8px 12px', background: PA.primarySoft, borderRadius: 10, fontSize: 12, fontWeight: 700, color: PA.primary }}>
                  {asignados} asignados · {vacantesF} vacantes · {turnosFiltrados.length} totales
                </div>
              )}

              {/* Filtros */}
              {!loadingTodos && todosDetalle && (
                <div style={{ margin: '8px 16px 0', background: PA.primarySoft, borderRadius: 10, overflow: 'hidden', boxShadow: '0 2px 10px rgba(23,65,108,0.13)' }}>
                  <button
                    onClick={() => { setFiltroOpen(o => !o); setFiltroActivo(new Set()); }}
                    style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px' }}
                  >
                    <span style={{ fontSize: 12, fontWeight: 700, color: PA.primary }}>
                      Filtrar por{filtrosActivos > 0 ? ` · ${filtrosActivos} activo${filtrosActivos > 1 ? 's' : ''}` : ''}
                    </span>
                    <SGTIcon name={filtroOpen ? 'chevron-up' : 'chevron-down'} size={13} color={PA.primary} />
                  </button>
                  {filtroOpen && (
                    <div style={{ background: '#fff', borderTop: `1px solid ${PA.line}`, padding: '4px 12px 8px' }}>
                      <FilaFiltro id="tipo"      label="Tipo de turno" opciones={opcionesTipo}      valor={filtroTipo}      onSelect={setFiltroTipo} />
                      <div style={{ height: 1, background: PA.line2 }} />
                      <FilaFiltro id="puesto"    label="Puesto"        opciones={opcionesPuesto}    valor={filtroPuesto}    onSelect={setFiltroPuesto} />
                      <div style={{ height: 1, background: PA.line2 }} />
                      <FilaFiltro id="fecha"     label="Fecha"         opciones={opcionesFecha}     valor={filtroFecha}     onSelect={setFiltroFecha} />
                      <div style={{ height: 1, background: PA.line2 }} />
                      <FilaFiltro id="plantilla" label="Rotativa"      opciones={opcionesPlantilla} valor={filtroPlantilla} onSelect={setFiltroPlantilla} />
                    </div>
                  )}
                </div>
              )}

              <div style={{ height: 1, background: PA.line2, marginTop: 10 }} />

              {loadingTodos && <div style={{ padding: '16px 16px 0' }}><LoadingState label="Cargando..." /></div>}
              {!loadingTodos && turnosFiltrados.length === 0 && (
                <div style={{ padding: '16px 16px 0' }}>
                  <ListEmptyState icon="search" theme="slate" title="Sin resultados" message="No hay turnos para este filtro." />
                </div>
              )}
              {!loadingTodos && turnosFiltrados.map((t, idx) => (
                <div key={t.idTurno ?? idx} style={{ display: 'flex', alignItems: 'center', padding: '11px 16px', gap: 12, borderBottom: `1px solid ${PA.line2}` }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: t.asignado ? PA.successSoft : PA.accentSoft, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                    <SGTIcon name="calendar" size={16} color={t.asignado ? PA.success : '#B85A60'} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: PA.ink }}>{t.tipoTurno ?? '—'}</div>
                    <div style={{ fontSize: 11, color: PA.ink3, fontWeight: 600, marginTop: 1 }}>
                      {t.nombrePuesto ?? '—'} · {t.fecha ? dayjs(t.fecha).format('ddd D MMM') : '—'}
                    </div>
                    {t.asignado && t.nombreFuncionario && (
                      <div style={{ fontSize: 11, color: PA.success, fontWeight: 700, marginTop: 2 }}>{t.nombreFuncionario}</div>
                    )}
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 800, borderRadius: 20, padding: '3px 10px', flexShrink: 0, color: t.asignado ? PA.success : '#B85A60', background: t.asignado ? PA.successSoft : PA.accentSoft }}>
                    {t.asignado ? 'Asignado' : 'Vacante'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    })()}

    {showDetalle && (
      <div
        onClick={() => setShowDetalle(false)}
        style={{
          position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)',
          display: 'flex', alignItems: 'flex-end',
          zIndex: 200, animation: 'sgtFade .2s ease',
        }}
      >
        <div
          onClick={e => e.stopPropagation()}
          style={{
            background: '#fff', borderRadius: '20px 20px 0 0',
            width: '100%', maxHeight: '78%',
            display: 'flex', flexDirection: 'column',
            boxShadow: '0 -12px 40px rgba(15,23,42,0.16)',
            animation: 'sgtSlideUp .28s cubic-bezier(.2,.9,.2,1)',
          }}
        >
          {/* Pastilla de arrastre */}
          <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 10, paddingBottom: 2, flexShrink: 0 }}>
            <div style={{ width: 40, height: 4, background: PA.line, borderRadius: 99 }} />
          </div>

          {/* Header */}
          <div style={{
            display: 'flex', alignItems: 'center',
            padding: '10px 16px 12px', flexShrink: 0,
          }}>
            <div style={{ width: 28, flexShrink: 0 }} />
            <div style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: PA.ink }}>Funcionarios con turno</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: PA.ink3, marginTop: 2, textTransform: 'capitalize' }}>
                {periodoLabel}
              </div>
            </div>
            <button
              onClick={() => setShowDetalle(false)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex', flexShrink: 0 }}
            >
              <SGTIcon name="close" size={20} color={PA.ink3} />
            </button>
          </div>

          {/* Resumen */}
          {!loadingDetalle && detalle && (
            <div style={{
              margin: '0 16px 10px', padding: '8px 12px',
              background: PA.primarySoft, borderRadius: 10,
              fontSize: 12, fontWeight: 700, color: PA.primary, flexShrink: 0,
            }}>
              {detalle.filter(f => f.cantidadTurnos > 0).length} de {detalle.length} funcionarios con turno en este período
            </div>
          )}

          <div style={{ height: 1, background: PA.line2, flexShrink: 0 }} />

          {/* Body */}
          <div className="sgt-scroll-clean" style={{ flex: 1, overflowY: 'auto' }}>
            {loadingDetalle && (
              <div style={{ padding: '16px 16px 0' }}><LoadingState label="Cargando..." /></div>
            )}
            {!loadingDetalle && (!detalle || detalle.length === 0) && (
              <div style={{ padding: '16px 16px 0' }}>
                <ListEmptyState icon="user" theme="slate" title="Sin funcionarios" message="No hay funcionarios en este servicio." />
              </div>
            )}
            {!loadingDetalle && detalle?.map((func, idx) => {
              const abierto = expandedIds.has(func.idFuncionario);
              const tieneTurnos = func.cantidadTurnos > 0;
              const avatarColor = getAvatarColor(idx);
              const toggleFuncionario = (id) => setExpandedIds(prev => {
                const next = new Set(prev);
                next.has(id) ? next.delete(id) : next.add(id);
                return next;
              });
              return (
                <div key={func.idFuncionario} style={{ borderBottom: `1px solid ${PA.line2}` }}>
                  <button
                    onClick={() => toggleFuncionario(func.idFuncionario)}
                    style={{
                      width: '100%', background: 'none', border: 'none', cursor: 'pointer',
                      display: 'flex', alignItems: 'center',
                      padding: '11px 16px', gap: 12,
                    }}
                  >
                    {/* Avatar */}
                    <div style={{
                      width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                      background: tieneTurnos ? avatarColor : PA.line2,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <span style={{ fontSize: 13, fontWeight: 800, color: tieneTurnos ? '#fff' : PA.ink3 }}>
                        {getInitials(func.nombre)}
                      </span>
                    </div>

                    {/* Nombre */}
                    <span style={{ flex: 1, fontSize: 14, fontWeight: 700, color: PA.ink, textAlign: 'left' }}>
                      {func.nombre}
                    </span>

                    {/* Badge turnos */}
                    <span style={{
                      fontSize: 11, fontWeight: 800, borderRadius: 20, padding: '3px 10px', flexShrink: 0,
                      color: tieneTurnos ? avatarColor : PA.ink3,
                      background: tieneTurnos ? `${avatarColor}18` : PA.line2,
                    }}>
                      {func.cantidadTurnos} {func.cantidadTurnos === 1 ? 'turno' : 'turnos'}
                    </span>

                    <SGTIcon name={abierto ? 'chevron-up' : 'chevron-down'} size={15} color={PA.ink3} />
                  </button>

                  {/* Accordion */}
                  {abierto && (
                    <div style={{ background: PA.surface2, paddingBottom: 4 }}>
                      {func.turnos.length === 0 ? (
                        <div style={{ padding: '10px 16px 10px 64px', fontSize: 12, color: PA.ink3, fontWeight: 600 }}>
                          Sin turnos en este período
                        </div>
                      ) : func.turnos.map((t, i) => (
                        <div key={i} style={{
                          display: 'flex', alignItems: 'center',
                          padding: '8px 16px 8px 64px',
                          borderTop: `1px solid ${PA.line2}`,
                        }}>
                          <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: PA.ink }}>
                              {t.tipoTurno ?? '—'}
                            </div>
                            <div style={{ fontSize: 11, color: PA.ink3, fontWeight: 600, marginTop: 1 }}>
                              {t.nombrePuesto ?? '—'}
                            </div>
                          </div>
                          <span style={{
                            fontSize: 11, fontWeight: 700, color: PA.ink2, flexShrink: 0,
                            background: PA.line2, borderRadius: 8, padding: '2px 8px',
                          }}>
                            {t.fecha ? dayjs(t.fecha).format('ddd D MMM') : '—'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    )}
  </div>
  );
};

export default AdminStats;
