import React, { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { useAuth } from '../../context/AuthContext';
import { turnosService } from '../../services/adminService';
import { SGT_DATA } from '../Admin2/data';
import { SGTBadge, SGTIcon } from '../Style/UIPrimitives';
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

// ──────────────────────────────────────────────
// Subcomponentes
// ──────────────────────────────────────────────

const KPICard = ({ icon, label, value, sub, color }) => {
  const PA = SGT_DATA.PALETTE;
  return (
    <div style={{
      background: '#fff', border: `1px solid ${PA.line}`, borderRadius: 14,
      padding: '14px 12px', display: 'flex', flexDirection: 'column', gap: 6,
    }}>
      <div style={{ width: 34, height: 34, borderRadius: 10, background: PA.primarySoft, display: 'grid', placeItems: 'center', alignSelf: 'center' }}>
        <SGTIcon name={icon} size={18} color={color || PA.primary} />
      </div>
      <div style={{ fontSize: 24, fontWeight: 800, color: PA.ink, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 12, fontWeight: 700, color: PA.ink3 }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: PA.ink3, fontWeight: 600 }}>{sub}</div>}
    </div>
  );
};

const TurnoProximoItem = ({ turno }) => {
  const PA = SGT_DATA.PALETTE;
  const horas  = `${turno.horaInicio || '?'} – ${turno.horaFin || '?'}`;
  const puesto = turno.nombrePuesto || 'Sin puesto';
  const esHoy  = turno.diaInicioTurno && dayjs(turno.diaInicioTurno).isSame(dayjs(), 'day');

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      background: '#fff', border: `1px solid ${PA.line}`, borderRadius: 12, padding: '10px 12px',
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

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: PA.surface2, animation: 'sgtSlideLeft .3s ease', overflow: 'hidden' }}>
      <div style={{ padding: '16px', background: '#fff', borderBottom: `1px solid ${PA.line2}`, display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={onBack} style={{ background: 'transparent', border: 'none', padding: 4, cursor: 'pointer', display: 'flex' }}>
          <SGTIcon name="chevron-left" size={24} color={PA.ink} />
        </button>
        <div style={{ fontSize: 19, fontWeight: 800, color: PA.ink }}>Mi Dashboard</div>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>

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
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <KPICard
                icon="calendar"
                label="Turnos"
                value={turnosFiltrados.length}
                sub={esSemana ? `semana ${semanaKey}` : mesActual.format('MMMM')}
              />
              <KPICard
                icon="clock"
                label="Horas trabajadas"
                value={`${horasTrabajadas}h`}
                sub={`límite ${limiteHoras}h`}
                color={horasTrabajadas > limiteHoras ? PA.accent : PA.primary}
              />
              <KPICard
                icon="sun"
                label="Días sin turno"
                value={diasLibres}
                sub={`de ${diasPeriodo} días`}
              />
              <KPICard
                icon="check-circle"
                label="Días con turno"
                value={diasConTurno}
                color={PA.success}
              />
            </div>

            {/* Barra de carga horaria */}
            <div style={{ background: '#fff', border: `1px solid ${PA.line}`, borderRadius: 14, padding: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 800, color: PA.ink }}>
                  {esSemana ? 'Carga horaria semanal' : 'Carga horaria mensual'}
                </span>
                <span style={{ fontSize: 13, fontWeight: 800, color: horasTrabajadas > limiteHoras ? PA.accent : PA.primary }}>
                  {horasTrabajadas}h / {limiteHoras}h
                </span>
              </div>
              <div style={{ height: 8, background: PA.line2, borderRadius: 99, overflow: 'hidden' }}>
                <div style={{
                  height: '100%', borderRadius: 99,
                  background: horasTrabajadas > limiteHoras ? PA.accent : PA.primary,
                  width: `${Math.min(100, (horasTrabajadas / limiteHoras) * 100)}%`,
                  transition: 'width .4s ease',
                }} />
              </div>
              {horasTrabajadas > limiteHoras && (
                <div style={{ fontSize: 11, color: PA.accent, fontWeight: 700, marginTop: 6 }}>
                  Superaste el límite de {limiteHoras}h
                </div>
              )}
            </div>

            {/* Próximos turnos */}
            {futuros.length > 0 && (
              <div>
                <div style={{ fontSize: 12, fontWeight: 800, color: PA.ink3, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 }}>
                  Próximos turnos
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {futuros.map(t => <TurnoProximoItem key={t.id} turno={t} />)}
                </div>
              </div>
            )}

            {futuros.length === 0 && (
              <div style={{ textAlign: 'center', padding: '24px 0', color: PA.ink3, fontSize: 13, fontWeight: 600 }}>
                Sin turnos próximos asignados.
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default PersonalDashboard;
