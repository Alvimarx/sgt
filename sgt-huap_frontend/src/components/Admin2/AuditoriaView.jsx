import React, { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { useAuth } from '../../context/AuthContext';
import { turnosService } from '../../services/adminService';
import { SGT_DATA } from './data';
import { SGTBadge, SGTIcon, TopHeader, IconBadge3D } from '../Style/UIPrimitives';
import { ListEmptyState, LoadingState } from '../Style/ListControls';

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
  const bgTinte    = asignado ? PA.successSoft : '#FDF2F3';

  return (
    <div className="sgt-list-row" style={{
      display: 'flex', alignItems: 'center', gap: 12,
      background: bgTinte,
      border: 'none',
      borderLeft: `4px solid ${colorBorde}`,
      borderRadius: 14, padding: '10px 12px',
      boxShadow: '0 2px 8px rgba(15,23,42,0.06)',
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
          {turno.nombrePuesto || 'Sin puesto'}
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
    <div className="dash-page-bg" style={{ flex: 1, display: 'flex', flexDirection: 'column', animation: 'sgtSlideLeft .3s ease', overflow: 'hidden' }}>
      <TopHeader
        title="Auditoría de Asistencia"
        leftSlot={
          <button onClick={onBack} style={{ background: 'transparent', border: 'none', padding: 4, cursor: 'pointer', display: 'flex' }}>
            <SGTIcon name="chevron-left" size={24} color={PA.ink} />
          </button>
        }
      />

      {/* Selector de mes */}
      <div style={{ padding: '10px 14px 8px', background: '#fff', borderBottom: `1px solid ${PA.line2}`, overflowX: 'auto', display: 'flex', gap: 6 }}>
        {opcionesMes.map(m => {
          const activo = mesSeleccionado.value === m.value;
          return (
            <button key={m.value} className="sgt-week-pill" onClick={() => setMesSeleccionado(m)} style={{
              background: activo ? 'linear-gradient(150deg, #6C8BFF 0%, #2B3FA0 100%)' : '#fff',
              color: activo ? '#fff' : PA.ink2,
              border: activo ? 'none' : `1px solid ${PA.line}`,
              borderRadius: 999, padding: '6px 14px', fontSize: 12, fontWeight: 800,
              cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
              textTransform: 'capitalize',
              boxShadow: activo ? '0 4px 12px rgba(43,63,160,0.28)' : 'none',
            }}>{m.label}</button>
          );
        })}
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {loading && <LoadingState label="Cargando turnos..." />}

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
                <div className="sgt-list-row" style={{
                  flex: 1, background: '#fff', border: `1px solid ${PA.line}`,
                  borderRadius: 14, padding: '12px 10px', textAlign: 'center',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                }}>
                  <IconBadge3D icon="check-circle" theme="green" size={32} iconSize={16} radius={10} />
                  <div style={{ fontSize: 20, fontWeight: 900, color: PA.ink, lineHeight: 1 }}>{totalAsignados}</div>
                  <div style={{ fontSize: 10.5, fontWeight: 700, color: PA.ink3 }}>Asignados</div>
                </div>
                <div className="sgt-list-row" style={{
                  flex: 1, background: '#fff', border: `1px solid ${PA.line}`,
                  borderRadius: 14, padding: '12px 10px', textAlign: 'center',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                }}>
                  <IconBadge3D icon="alert" theme="red" size={32} iconSize={16} radius={10} />
                  <div style={{ fontSize: 20, fontWeight: 900, color: PA.ink, lineHeight: 1 }}>{totalVacantes}</div>
                  <div style={{ fontSize: 10.5, fontWeight: 700, color: PA.ink3 }}>Vacantes</div>
                </div>
                <div className="sgt-list-row" style={{
                  flex: 1, background: '#fff', border: `1px solid ${PA.line}`,
                  borderRadius: 14, padding: '12px 10px', textAlign: 'center',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                }}>
                  <IconBadge3D icon="calendar" theme="blue" size={32} iconSize={16} radius={10} />
                  <div style={{ fontSize: 20, fontWeight: 900, color: PA.ink, lineHeight: 1 }}>{turnosFiltrados.length}</div>
                  <div style={{ fontSize: 10.5, fontWeight: 700, color: PA.ink3 }}>Total</div>
                </div>
              </div>
            )}

            {/* Lista de turnos */}
            {turnosFiltrados.length === 0 ? (
              <ListEmptyState
                icon="shield-search"
                theme="slate"
                title="Sin turnos pasados"
                message={`No se encontraron turnos en ${mesSeleccionado.label}.`}
              />
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
