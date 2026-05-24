import React, { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { useAuth } from '../../context/AuthContext';
import { turnosService } from '../../services/adminService';
import { SGT_DATA } from './data';
import { SGTBadge, SGTIcon } from './UIPrimitives';

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

function meses() {
  const hoy = dayjs();
  return [0, 1, 2].map(offset => {
    const m = hoy.subtract(offset, 'month');
    return { label: m.format('MMMM YYYY'), value: m.format('YYYY-MM'), year: m.year(), month: m.month() + 1 };
  });
}

function turnosDelMes(turnos, año, mes) {
  return turnos.filter(t => {
    if (!t.diaInicioTurno) return false;
    const d = dayjs(t.diaInicioTurno);
    return d.year() === año && d.month() + 1 === mes && d.isBefore(dayjs());
  });
}

// ──────────────────────────────────────────────
// Subcomponentes
// ──────────────────────────────────────────────

const TurnoAuditoriaItem = ({ turno }) => {
  const PA       = SGT_DATA.PALETTE;
  const asignado = turno.idFuncionario != null;
  const fecha    = turno.diaInicioTurno ? dayjs(turno.diaInicioTurno).format('ddd D MMM') : '—';
  const horas    = `${(turno.horaInicio || '?').slice(0,5)} – ${(turno.horaFin || '?').slice(0,5)}`;
  const colorBorde = asignado ? PA.success : '#D9626A';
  const bgTinte    = asignado ? `${PA.success}10` : '#FDF2F3';

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      background: bgTinte,
      border: `1px solid ${PA.line}`,
      borderLeft: `4px solid ${colorBorde}`,
      borderRadius: 14, padding: '10px 12px',
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        {turno.nombre && (
          <div style={{ fontSize: 11, fontWeight: 700, color: asignado ? PA.success : '#D9626A', marginBottom: 2, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            {turno.nombre}
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 800, color: PA.ink }}>{fecha}</span>
          <span style={{ fontSize: 12, color: PA.ink3, fontWeight: 600 }}>· {horas}</span>
        </div>
        <div style={{ fontSize: 11, color: PA.ink3, fontWeight: 600, marginTop: 2 }}>
          {turno.nombrePiso || 'Sin piso'}
        </div>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        {asignado
          ? <SGTBadge tone="success" size="xs">{turno.nombreFuncionario}</SGTBadge>
          : <SGTBadge tone="accent" size="xs">Vacante</SGTBadge>
        }
      </div>
    </div>
  );
};

// ──────────────────────────────────────────────
// Componente principal
// ──────────────────────────────────────────────

const AuditoriaView = ({ onBack }) => {
  const PA = SGT_DATA.PALETTE;
  const { user } = useAuth();

  const opcionesMes = useMemo(() => meses(), []);
  const [mesSeleccionado, setMesSeleccionado] = useState(opcionesMes[0]);
  const [todosTurnos, setTodosTurnos]         = useState([]);
  const [loading, setLoading]                 = useState(true);
  const [error, setError]                     = useState(null);

  const servicioId = user?.servicioId;

  useEffect(() => {
    if (!servicioId) return;
    setLoading(true);
    setError(null);
    turnosService.getByServicio(servicioId)
      .then(data => setTodosTurnos(data || []))
      .catch(() => setError('No se pudieron cargar los turnos.'))
      .finally(() => setLoading(false));
  }, [servicioId]);

  const turnosFiltrados = useMemo(
    () => turnosDelMes(todosTurnos, mesSeleccionado.year, mesSeleccionado.month)
          .sort((a, b) => dayjs(b.diaInicioTurno).diff(dayjs(a.diaInicioTurno))),
    [todosTurnos, mesSeleccionado],
  );

  const totalAsignados = turnosFiltrados.filter(t => t.idFuncionario != null).length;
  const totalVacantes  = turnosFiltrados.filter(t => t.idFuncionario == null).length;

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: PA.surface2, animation: 'sgtSlideLeft .3s ease', overflow: 'hidden' }}>
      <div style={{ padding: '16px', background: '#fff', borderBottom: `1px solid ${PA.line2}`, display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={onBack} style={{ background: 'transparent', border: 'none', padding: 4, cursor: 'pointer', display: 'flex' }}>
          <SGTIcon name="chevron-left" size={24} color={PA.ink} />
        </button>
        <div style={{ fontSize: 19, fontWeight: 800, color: PA.ink }}>Auditoría de Asistencia</div>
      </div>

      {/* Selector de mes */}
      <div style={{ padding: '10px 14px 8px', background: '#fff', borderBottom: `1px solid ${PA.line2}`, overflowX: 'auto', display: 'flex', gap: 6 }}>
        {opcionesMes.map(m => (
          <button key={m.value} onClick={() => setMesSeleccionado(m)} style={{
            background: mesSeleccionado.value === m.value ? PA.primary : '#fff',
            color: mesSeleccionado.value === m.value ? '#fff' : PA.ink2,
            border: `1px solid ${mesSeleccionado.value === m.value ? PA.primary : PA.line}`,
            borderRadius: 999, padding: '6px 14px', fontSize: 12, fontWeight: 800,
            cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
            textTransform: 'capitalize',
          }}>{m.label}</button>
        ))}
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {loading && (
          <div style={{ textAlign: 'center', padding: 40, color: PA.ink3, fontSize: 13, fontWeight: 600 }}>
            Cargando turnos...
          </div>
        )}

        {error && (
          <div style={{ background: PA.accentSoft, border: `1px solid #F3D2D5`, borderRadius: 12, padding: 14, fontSize: 13, color: '#8C3F44', fontWeight: 700 }}>
            {error}
          </div>
        )}

        {!loading && !error && (
          <>
            {/* Resumen del mes */}
            {turnosFiltrados.length > 0 && (
              <div style={{ display: 'flex', gap: 10 }}>
                <div style={{
                  flex: 1, background: PA.successSoft, border: `1px solid ${PA.success}20`,
                  borderRadius: 12, padding: '10px 14px', textAlign: 'center',
                }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: PA.success }}>{totalAsignados}</div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: PA.success }}>Asignados</div>
                </div>
                <div style={{
                  flex: 1, background: PA.accentSoft, border: `1px solid #F3D2D5`,
                  borderRadius: 12, padding: '10px 14px', textAlign: 'center',
                }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: '#B85A60' }}>{totalVacantes}</div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#B85A60' }}>Vacantes</div>
                </div>
                <div style={{
                  flex: 1, background: PA.primarySoft, border: `1px solid #CFDCEA`,
                  borderRadius: 12, padding: '10px 14px', textAlign: 'center',
                }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: PA.primary }}>{turnosFiltrados.length}</div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: PA.primary }}>Total</div>
                </div>
              </div>
            )}

            {/* Lista de turnos */}
            {turnosFiltrados.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, color: PA.ink3, fontSize: 13, fontWeight: 600 }}>
                Sin turnos pasados en {mesSeleccionado.label}.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {turnosFiltrados.map(t => <TurnoAuditoriaItem key={t.id} turno={t} />)}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default AuditoriaView;
