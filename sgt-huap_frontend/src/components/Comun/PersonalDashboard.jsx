import React, { useEffect, useMemo, useRef, useState } from 'react';
import dayjs from 'dayjs';
import { useAuth } from '../../context/AuthContext';
import { turnosService } from '../../services/adminService';
import { SGT_DATA, DASHBOARD_ICON_THEMES } from '../Admin2/data';
import { SGTBadge, SGTIcon, IconBadge3D } from '../Style/UIPrimitives';
import PeriodoSelector, { buildSemanasDelMes, rangoPeriodo } from '../Style/PeriodoSelector';

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

function calcHoras(t) {
  if (!t.diaInicioTurno || !t.horaInicio || !t.diaFinalTurno || !t.horaFin) return 0;
  const inicio = dayjs(`${t.diaInicioTurno}T${t.horaInicio}`);
  const fin    = dayjs(`${t.diaFinalTurno}T${t.horaFin}`);
  const diff   = fin.diff(inicio, 'hour', true);
  return diff > 0 ? diff : 0;
}

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

// Anima un número entero desde 0 hasta `value` (puramente visual, no altera el dato).
function useCountUp(value, duration = 650) {
  const [display, setDisplay] = useState(prefersReducedMotion() ? value : 0);
  const raf = useRef(null);

  useEffect(() => {
    if (prefersReducedMotion()) { setDisplay(value); return; }
    const start = performance.now();
    const from = 0;
    cancelAnimationFrame(raf.current);
    const tick = (now) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.round(from + (value - from) * eased));
      if (p < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return display;
}

// ──────────────────────────────────────────────
// Subcomponentes
// ──────────────────────────────────────────────

const KPICard = ({ icon, label, value, suffix = '', sub, theme = 'blue', delay = 0 }) => {
  const PA = SGT_DATA.PALETTE;
  const t = DASHBOARD_ICON_THEMES[theme] || DASHBOARD_ICON_THEMES.blue;
  const numeric = typeof value === 'number' ? value : parseInt(value, 10) || 0;
  const shown = useCountUp(numeric);

  return (
    <div className="kpi-card" style={{
      position: 'relative', overflow: 'hidden',
      background: '#fff', border: `1px solid ${PA.line}`, borderRadius: 18,
      padding: '16px 14px', display: 'flex', flexDirection: 'column', gap: 8,
      boxShadow: '0 2px 10px rgba(15,23,42,0.05)',
      animation: `sgtCardIn .45s cubic-bezier(.22,1,.36,1) ${delay}s both`,
    }}>
      <div aria-hidden="true" style={{
        position: 'absolute', top: -30, right: -30, width: 90, height: 90, borderRadius: '50%',
        background: t.grad, opacity: 0.08, filter: 'blur(2px)',
      }} />
      <div className="kpi-icon-wrap" style={{ display: 'inline-flex' }}>
        <IconBadge3D icon={icon} theme={theme} size={40} iconSize={20} radius={12} />
      </div>
      <div style={{ fontSize: 30, fontWeight: 900, color: PA.ink, lineHeight: 1, letterSpacing: -0.5, fontVariantNumeric: 'tabular-nums' }}>
        {shown}{suffix}
      </div>
      <div style={{ fontSize: 12.5, fontWeight: 800, color: PA.ink2 }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: PA.ink3, fontWeight: 600 }}>{sub}</div>}
    </div>
  );
};

const TurnoProximoItem = ({ turno, delay = 0 }) => {
  const PA = SGT_DATA.PALETTE;
  const horas  = `${turno.horaInicio || '?'} – ${turno.horaFin || '?'}`;
  const puesto = turno.nombrePuesto || 'Sin puesto';
  const esHoy  = turno.diaInicioTurno && dayjs(turno.diaInicioTurno).isSame(dayjs(), 'day');

  return (
    <div className="turno-proximo-item" style={{
      display: 'flex', alignItems: 'center', gap: 12,
      background: '#fff', border: `1px solid ${esHoy ? PA.primary : PA.line}`, borderRadius: 14, padding: '11px 12px',
      borderLeft: `3px solid ${esHoy ? PA.primary : PA.line}`,
      boxShadow: esHoy ? '0 4px 14px rgba(23,65,108,0.10)' : '0 1px 3px rgba(15,23,42,0.04)',
      animation: `sgtCardIn .4s cubic-bezier(.22,1,.36,1) ${delay}s both`,
    }}>
      <div style={{ width: 40, minWidth: 40, textAlign: 'center' }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: PA.ink3, textTransform: 'uppercase' }}>
          {turno.diaInicioTurno ? dayjs(turno.diaInicioTurno).format('ddd') : '—'}
        </div>
        <div style={{ fontSize: 20, fontWeight: 800, color: esHoy ? PA.primary : PA.ink, lineHeight: 1.1 }}>
          {turno.diaInicioTurno ? dayjs(turno.diaInicioTurno).format('D') : '—'}
        </div>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: PA.ink }}>{horas}</div>
        <div style={{ fontSize: 11, color: PA.ink3, fontWeight: 600, marginTop: 2 }}>{puesto}</div>
      </div>
      {esHoy && <SGTBadge tone="primary" size="xs">Hoy</SGTBadge>}
    </div>
  );
};

// ──────────────────────────────────────────────
// Componente principal
// ──────────────────────────────────────────────

const PersonalDashboard = ({ onBack }) => {
  const PA = SGT_DATA.PALETTE;
  const { user } = useAuth();

  const [mesOffset, setMesOffset] = useState(0);
  const [semanaKey, setSemanaKey] = useState(null);
  const [turnos, setTurnos]       = useState([]);
  const [futuros, setFuturos]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);

  const mesActual = dayjs().subtract(mesOffset, 'month');
  const semanas   = buildSemanasDelMes(mesActual.year(), mesActual.month() + 1);
  const { inicio, fin } = rangoPeriodo(mesOffset, semanaKey, semanas);
  const fmt = d => d.format('YYYY-MM-DD');

  useEffect(() => {
    if (!user?.id) return;
    setLoading(true);
    setError(null);

    Promise.all([
      turnosService.getByMedico(user.id, mesActual.year(), mesActual.month() + 1),
      turnosService.getFuturos(user.id),
    ])
      .then(([mes, fut]) => {
        setTurnos(mes || []);
        setFuturos((fut || []).slice(0, 5));
      })
      .catch(() => setError('No se pudieron cargar los turnos.'))
      .finally(() => setLoading(false));
  }, [user?.id, mesOffset]);

  const turnosFiltrados = useMemo(() => {
    return turnos.filter(t => {
      if (!t.diaInicioTurno) return false;
      const d = dayjs(t.diaInicioTurno);
      return (d.isAfter(inicio, 'day') || d.isSame(inicio, 'day')) &&
             (d.isBefore(fin, 'day')   || d.isSame(fin, 'day'));
    });
  }, [turnos, inicio, fin]);

  const horasTrabajadas = useMemo(
    () => Math.round(turnosFiltrados.reduce((acc, t) => acc + calcHoras(t), 0)),
    [turnosFiltrados],
  );

  const diasConTurno = useMemo(() => {
    return new Set(turnosFiltrados.map(t => t.diaInicioTurno)).size;
  }, [turnosFiltrados]);

  const esSemana    = semanaKey !== null;
  const diasPeriodo = esSemana ? fin.diff(inicio, 'day') + 1 : mesActual.daysInMonth();
  const diasLibres  = Math.max(0, diasPeriodo - diasConTurno);
  const limiteHoras = esSemana ? 40 : 160;

  const sobreLimite = horasTrabajadas > limiteHoras;
  const pctCarga = Math.min(100, Math.round((horasTrabajadas / limiteHoras) * 100));
  const cargaTheme = sobreLimite ? DASHBOARD_ICON_THEMES.red : DASHBOARD_ICON_THEMES.violet;

  return (
    <div className="dash-page-bg" style={{ flex: 1, display: 'flex', flexDirection: 'column', animation: 'sgtSlideLeft .3s ease', overflow: 'hidden' }}>
      <div style={{ padding: '16px', background: '#fff', borderBottom: `1px solid ${PA.line2}`, display: 'flex', alignItems: 'center', gap: 12, boxShadow: '0 1px 0 rgba(15,23,42,0.02)', zIndex: 1 }}>
        <button onClick={onBack} style={{ background: 'transparent', border: 'none', padding: 4, cursor: 'pointer', display: 'flex' }}>
          <SGTIcon name="chevron-left" size={24} color={PA.ink} />
        </button>
        <div style={{ fontSize: 19, fontWeight: 800, color: PA.ink }}>Mi Dashboard</div>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 18 }}>

        <PeriodoSelector
          mesOffset={mesOffset} setMesOffset={setMesOffset}
          semanaKey={semanaKey} setSemanaKey={setSemanaKey}
        />

        {loading && (
          <div style={{ textAlign: 'center', padding: 40, color: PA.ink3, fontSize: 13, fontWeight: 600 }}>
            Cargando datos...
          </div>
        )}

        {error && (
          <div style={{ background: PA.accentSoft, border: `1px solid #F3D2D5`, borderRadius: 12, padding: 14, fontSize: 13, color: '#8C3F44', fontWeight: 700 }}>
            {error}
          </div>
        )}

        {!loading && !error && (
          <>
            {/* KPIs */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <KPICard
                icon="calendar"
                label="Turnos"
                value={turnosFiltrados.length}
                sub={esSemana ? `semana ${semanaKey}` : mesActual.format('MMMM')}
                theme="blue"
                delay={0}
              />
              <KPICard
                icon="clock"
                label="Horas trabajadas"
                value={horasTrabajadas}
                suffix="h"
                sub={`límite ${limiteHoras}h`}
                theme={sobreLimite ? 'red' : 'violet'}
                delay={0.05}
              />
              <KPICard
                icon="sun"
                label="Días sin turno"
                value={diasLibres}
                sub={`de ${diasPeriodo} días`}
                theme="amber"
                delay={0.1}
              />
              <KPICard
                icon="check-circle"
                label="Días con turno"
                value={diasConTurno}
                theme="teal"
                delay={0.15}
              />
            </div>

            {/* Barra de carga horaria */}
            <div style={{ background: '#fff', border: `1px solid ${PA.line}`, borderRadius: 18, padding: 16, boxShadow: '0 2px 10px rgba(15,23,42,0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <IconBadge3D icon="clock" theme={sobreLimite ? 'red' : 'violet'} size={30} iconSize={15} radius={9} />
                <span style={{ fontSize: 13.5, fontWeight: 800, color: PA.ink, flex: 1 }}>
                  {esSemana ? 'Carga horaria semanal' : 'Carga horaria mensual'}
                </span>
                <span style={{ fontSize: 13.5, fontWeight: 800, color: sobreLimite ? PA.accent : PA.primary, fontVariantNumeric: 'tabular-nums' }}>
                  {horasTrabajadas}h / {limiteHoras}h
                </span>
              </div>
              <div className="sgt-progress-track" style={{ height: 10, background: PA.line2, borderRadius: 99 }}>
                <div className="sgt-progress-fill" style={{
                  height: '100%', borderRadius: 99,
                  background: cargaTheme.grad,
                  boxShadow: `0 0 10px ${cargaTheme.glow}`,
                  width: `${pctCarga}%`,
                  transition: 'width .5s cubic-bezier(.22,1,.36,1)',
                }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 800, color: sobreLimite ? PA.accent : PA.ink3 }}>
                  {pctCarga}%
                </span>
                {sobreLimite && (
                  <span style={{ fontSize: 11, color: PA.accent, fontWeight: 700 }}>
                    Superaste el límite de {limiteHoras}h
                  </span>
                )}
              </div>
            </div>

            {/* Próximos turnos */}
            {futuros.length > 0 && (
              <div>
                <div style={{ fontSize: 12, fontWeight: 800, color: PA.ink3, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 }}>
                  Próximos turnos
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {futuros.map((t, i) => <TurnoProximoItem key={t.id} turno={t} delay={i * 0.05} />)}
                </div>
              </div>
            )}

            {futuros.length === 0 && (
              <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                textAlign: 'center', padding: '36px 20px', gap: 12,
                background: '#fff', border: `1px dashed ${PA.line}`, borderRadius: 18,
              }}>
                <div className="sgt-empty-icon">
                  <IconBadge3D icon="calendar" theme="slate" size={54} iconSize={26} radius={16} />
                </div>
                <div style={{ fontSize: 15, fontWeight: 800, color: PA.ink }}>
                  Sin turnos próximos
                </div>
                <div style={{ fontSize: 13, color: PA.ink3, fontWeight: 600, maxWidth: 240 }}>
                  Actualmente no tienes turnos programados.
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default PersonalDashboard;
