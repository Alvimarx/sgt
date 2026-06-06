import React, { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { useAuth } from '../../context/AuthContext';
import { turnosService } from '../../services/adminService';
import { SGT_DATA } from './data';
import { SGTBadge, SGTIcon } from './UIPrimitives';

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

function rangoPeriodo(periodo) {
  const hoy = dayjs();
  if (periodo === 'mes_anterior') {
    const mes = hoy.subtract(1, 'month');
    return { inicio: mes.startOf('month'), fin: mes.endOf('month') };
  }
  return { inicio: hoy.startOf('month'), fin: hoy.endOf('month') };
}

// ──────────────────────────────────────────────
// Subcomponentes
// ──────────────────────────────────────────────

const StatCard = ({ icon, label, value, tone }) => {
  const PA = SGT_DATA.PALETTE;
  const toneMap = {
    primary: { bg: PA.primarySoft, color: PA.primary },
    accent:  { bg: PA.accentSoft,  color: '#B85A60' },
    success: { bg: PA.successSoft, color: PA.success },
    warn:    { bg: PA.warnSoft,    color: PA.warn },
  };
  const t = toneMap[tone] || toneMap.primary;
  return (
    <div style={{
      background: '#fff', border: `1px solid ${PA.line}`, borderRadius: 14,
      padding: '14px 12px', display: 'flex', flexDirection: 'column', gap: 6, flex: 1,
    }}>
      <div style={{ width: 34, height: 34, borderRadius: 10, background: t.bg, display: 'grid', placeItems: 'center' }}>
        <SGTIcon name={icon} size={18} color={t.color} />
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
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      background: '#fff', border: `1px solid ${PA.line}`, borderRadius: 12, padding: '10px 12px',
    }}>
      <div style={{ width: 36, height: 36, borderRadius: 10, background: PA.accentSoft, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
        <SGTIcon name="calendar" size={16} color="#B85A60" />
      </div>
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

  const [periodo, setPeriodo]     = useState('este_mes');
  const [stats, setStats]         = useState(null);
  const [cobertura, setCobertura] = useState(null);
  const [vacantes, setVacantes]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);

  const servicioId = user?.servicioId;

  useEffect(() => {
    if (!servicioId) return;
    setLoading(true);
    setError(null);

    const { inicio, fin } = rangoPeriodo(periodo);
    const fmt = d => d.format('YYYY-MM-DD');

    Promise.all([
      turnosService.getStats(servicioId, fmt(inicio), fmt(fin)),
      turnosService.getCobertura(servicioId, fmt(inicio), fmt(fin)),
      turnosService.getSinAsignar(servicioId),
    ])
      .then(([s, c, v]) => {
        setStats(s || {});
        setCobertura(c || {});
        setVacantes((v || []).slice(0, 8));
      })
      .catch(() => setError('No se pudieron cargar las estadísticas.'))
      .finally(() => setLoading(false));
  }, [servicioId, periodo]);

  const pct = stats?.porcentajeCobertura ?? 0;

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: PA.surface2, animation: 'sgtSlideLeft .3s ease', overflow: 'hidden' }}>
      <div style={{ padding: '16px', background: '#fff', borderBottom: `1px solid ${PA.line2}`, display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={onBack} style={{ background: 'transparent', border: 'none', padding: 4, cursor: 'pointer', display: 'flex' }}>
          <SGTIcon name="chevron-left" size={24} color={PA.ink} />
        </button>
        <div style={{ fontSize: 19, fontWeight: 800, color: PA.ink }}>Estadísticas del Servicio</div>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Selector de período */}
        <div style={{ display: 'flex', gap: 8 }}>
          {[{ id: 'este_mes', label: 'Este mes' }, { id: 'mes_anterior', label: 'Mes anterior' }].map(p => (
            <button key={p.id} onClick={() => setPeriodo(p.id)} style={{
              background: periodo === p.id ? PA.primary : '#fff',
              color: periodo === p.id ? '#fff' : PA.ink2,
              border: `1px solid ${periodo === p.id ? PA.primary : PA.line}`,
              borderRadius: 999, padding: '7px 16px', fontSize: 13, fontWeight: 800, cursor: 'pointer',
            }}>{p.label}</button>
          ))}
        </div>

        {loading && (
          <div style={{ textAlign: 'center', padding: 40, color: PA.ink3, fontSize: 13, fontWeight: 600 }}>
            Cargando estadísticas...
          </div>
        )}

        {error && (
          <div style={{ background: PA.accentSoft, border: `1px solid #F3D2D5`, borderRadius: 12, padding: 14, fontSize: 13, color: '#8C3F44', fontWeight: 700 }}>
            {error}
          </div>
        )}

        {!loading && !error && stats && (
          <>
            {/* Cobertura principal */}
            <div style={{ background: '#fff', border: `1px solid ${PA.line}`, borderRadius: 14, padding: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <span style={{ fontSize: 14, fontWeight: 800, color: PA.ink }}>Cobertura de turnos</span>
                <span style={{ fontSize: 22, fontWeight: 800, color: pct >= 80 ? PA.success : pct >= 50 ? PA.warn : PA.accent }}>
                  {pct}%
                </span>
              </div>
              <div style={{ height: 10, background: PA.line2, borderRadius: 99, overflow: 'hidden' }}>
                <div style={{
                  height: '100%', borderRadius: 99, transition: 'width .5s ease',
                  background: pct >= 80 ? PA.success : pct >= 50 ? PA.warn : PA.accent,
                  width: `${Math.min(100, pct)}%`,
                }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                <span style={{ fontSize: 11, color: PA.ink3, fontWeight: 600 }}>
                  {stats.turnosAsignados ?? '—'} asignados de {stats.totalTurnos ?? '—'} totales
                </span>
                <span style={{ fontSize: 11, color: PA.ink3, fontWeight: 600 }}>
                  {cobertura.horasRealesCubiertas != null ? `${cobertura.horasRealesCubiertas}h cubiertas` : ''}
                </span>
              </div>
            </div>

            {/* Tarjetas de stats */}
            <div style={{ display: 'flex', gap: 10 }}>
              <StatCard icon="calendar"    label="Turnos totales"   value={stats.totalTurnos ?? '—'}     tone="primary" />
              <StatCard icon="check-circle" label="Asignados"       value={stats.turnosAsignados ?? '—'} tone="success" />
              <StatCard icon="alert"        label="Vacantes"        value={stats.turnosVacantes ?? '—'}  tone="accent"  />
            </div>

            {/* Horas cubiertas */}
            {cobertura.horasRealesCubiertas != null && (
              <div style={{
                background: PA.primarySoft, border: `1px solid #CFDCEA`, borderRadius: 14,
                padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12,
              }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: PA.primary, display: 'grid', placeItems: 'center' }}>
                  <SGTIcon name="clock" size={20} color="#fff" />
                </div>
                <div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: PA.primary }}>
                    {cobertura.horasRealesCubiertas}h
                  </div>
                  <div style={{ fontSize: 12, color: PA.ink3, fontWeight: 700 }}>Horas reales cubiertas</div>
                </div>
              </div>
            )}

            {/* Turnos libres próximos */}
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
              <div style={{ textAlign: 'center', padding: '16px 0', color: PA.ink3, fontSize: 13, fontWeight: 600 }}>
                Sin turnos vacantes actualmente.
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default AdminStats;
