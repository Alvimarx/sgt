import React, { useEffect, useMemo, useRef, useState } from 'react';
import dayjs from 'dayjs';
import { eventosService } from '../../services/adminService';
import { SGT_DATA } from './data';
import { SGTBadge, SGTIcon } from './UIPrimitives';

// ──────────────────────────────────────────────
// Mapeo de enums
// ──────────────────────────────────────────────

const TIPO_LABEL = {
  SOLICITUD_CREADA:             'Solicitud creada',
  CAMBIO_ESTADO_APROBADA:       'Aprobada',
  CAMBIO_ESTADO_RECHAZADA:      'Rechazada',
  RECHAZO_AUTOMATICO:           'Rechazo automático',
  OFERTA_ACEPTADA_POR_RECEPTOR: 'Oferta aceptada',
  OFERTA_RECHAZADA_POR_RECEPTOR:'Oferta rechazada',
  ASIGNACION:                   'Asignación',
  DESASIGNACION:                'Desasignación',
  PERMISO:                      'Permiso',
  INTERCAMBIO:                  'Intercambio',
  COBERTURA:                    'Cobertura',
};

const TIPO_TONE = {
  SOLICITUD_CREADA:             'primary',
  CAMBIO_ESTADO_APROBADA:       'success',
  CAMBIO_ESTADO_RECHAZADA:      'accent',
  RECHAZO_AUTOMATICO:           'accent',
  OFERTA_ACEPTADA_POR_RECEPTOR: 'success',
  OFERTA_RECHAZADA_POR_RECEPTOR:'accent',
  ASIGNACION:                   'primary',
  DESASIGNACION:                'accent',
  PERMISO:                      'warn',
  INTERCAMBIO:                  'neutral',
  COBERTURA:                    'success',
};

function labelParaTipo(tipo) {
  if (!tipo) return 'Evento';
  return TIPO_LABEL[tipo] || tipo.toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}
function toneParaTipo(tipo) {
  if (!tipo) return 'neutral';
  return TIPO_TONE[tipo] || 'neutral';
}

// ──────────────────────────────────────────────
// Helpers de formato
// ──────────────────────────────────────────────

function fmtFecha(val) {
  if (!val) return null;
  return dayjs(val).format('D MMM YYYY');
}
function fmtFechaHora(val) {
  if (!val) return null;
  return dayjs(val).format('D MMM YYYY · HH:mm');
}
function fmtHora(val) {
  if (!val) return null;
  return val.slice(0, 5);
}
function fmtTurno(dia, horaIni, horaFin, piso) {
  if (!dia) return null;
  const d = fmtFecha(dia);
  const h = horaIni && horaFin ? ` · ${fmtHora(horaIni)}–${fmtHora(horaFin)}` : '';
  const p = piso ? ` (${piso})` : '';
  return `${d}${h}${p}`;
}
function fmtRango(ini, fin) {
  if (!ini) return null;
  const a = fmtFecha(ini);
  if (!fin) return a;
  const b = fmtFecha(fin);
  return a === b ? a : `${a} – ${b}`;
}

// ──────────────────────────────────────────────
// Primitivas de UI para las cards
// ──────────────────────────────────────────────

const PA = () => SGT_DATA.PALETTE;

const Row = ({ label, value }) => {
  if (!value) return null;
  const p = PA();
  return (
    <div style={{ fontSize: 12, color: p.ink3, fontWeight: 600, lineHeight: 1.5, textAlign: 'left', width: '100%' }}>
      <span style={{ color: p.ink2, fontWeight: 700 }}>{label}: </span>
      {value}
    </div>
  );
};

const Divider = () => (
  <div style={{ height: 1, background: SGT_DATA.PALETTE.line2, margin: '2px 0' }} />
);

// ──────────────────────────────────────────────
// Bloques de contenido por tipo de solicitud
// ──────────────────────────────────────────────

const BloquePermiso = ({ ev }) => (
  <>
    <Row label="Solicitante"     value={ev.nombreFuncionarioEmisor || ev.nombreFuncionario} />
    <Row label="Rango de permiso" value={fmtRango(ev.fechaInicioPermiso, ev.fechaTerminoPermiso)} />
    <Row label="Motivo"          value={ev.motivoSolicitud || ev.motivo} />
    <Row label="Estado"          value={ev.estadoSolicitud} />
    {ev.nombreFuncionario && ev.nombreFuncionario !== ev.nombreFuncionarioEmisor && (
      <Row label="Decisión por"  value={ev.nombreFuncionario} />
    )}
  </>
);

const BloqueBotarTurno = ({ ev }) => (
  <>
    <Row label="Solicitante"  value={ev.nombreFuncionarioEmisor || ev.nombreFuncionario} />
    <Row label="Turno a botar" value={fmtTurno(ev.diaInicioTurnoSolicitud, ev.horaInicioTurnoSolicitud, ev.horaFinTurnoSolicitud, ev.nombrePisoSolicitud)} />
    <Row label="Motivo"        value={ev.motivoSolicitud || ev.motivo} />
    <Row label="Estado"        value={ev.estadoSolicitud} />
    {ev.nombreFuncionario && ev.nombreFuncionario !== ev.nombreFuncionarioEmisor && (
      <Row label="Decisión por" value={ev.nombreFuncionario} />
    )}
  </>
);

const BloqueCobertura = ({ ev }) => (
  <>
    <Row label="Turno a cubrir"       value={fmtTurno(ev.diaInicioTurnoSolicitud, ev.horaInicioTurnoSolicitud, ev.horaFinTurnoSolicitud, ev.nombrePisoSolicitud)} />
    <Row label="Funcionario que cubre" value={ev.nombreFuncionarioEmisor || ev.nombreFuncionario} />
    <Row label="Motivo"                value={ev.motivoSolicitud || ev.motivo} />
    <Row label="Estado"                value={ev.estadoSolicitud} />
    {ev.nombreFuncionario && ev.nombreFuncionario !== ev.nombreFuncionarioEmisor && (
      <Row label="Decisión por" value={ev.nombreFuncionario} />
    )}
  </>
);

const BloqueIntercambio = ({ ev }) => {
  const receptorAcepto = ev.aceptadoReceptor === true
    ? 'Aceptó'
    : ev.aceptadoReceptor === false
      ? 'Rechazó'
      : 'Pendiente';

  return (
    <>
      <Row label="Solicitante" value={ev.nombreFuncionarioEmisor} />
      <Row label="Su turno"    value={fmtTurno(ev.diaInicioTurnoSolicitud, ev.horaInicioTurnoSolicitud, ev.horaFinTurnoSolicitud, ev.nombrePisoSolicitud)} />
      <Divider />
      <Row label="Receptor"    value={ev.nombreFuncionarioReceptor} />
      <Row label="Su turno"    value={fmtTurno(ev.diaInicioTurnoReceptor, ev.horaInicioTurnoReceptor, ev.horaFinTurnoReceptor, ev.nombrePisoReceptor)} />
      <Row label="Respuesta receptor" value={receptorAcepto} />
      <Divider />
      <Row label="Estado final"  value={ev.estadoSolicitud} />
      {ev.nombreFuncionario && (
        <Row label="Decisión por" value={ev.nombreFuncionario} />
      )}
    </>
  );
};

const BloqueGenerico = ({ ev }) => (
  <>
    <Row label="Actor"          value={ev.nombreFuncionario} />
    <Row label="Turno"          value={fmtTurno(ev.diaInicioTurnoSolicitud, ev.horaInicioTurnoSolicitud, ev.horaFinTurnoSolicitud, ev.nombrePisoSolicitud)} />
    <Row label="Rango afectado" value={fmtRango(ev.fechaInicioAfectada, ev.fechaFinAfectada)} />
    <Row label="Motivo"         value={ev.motivoSolicitud || ev.motivo} />
    <Row label="Observaciones"  value={ev.observaciones} />
    <Row label="Estado"         value={ev.estadoSolicitud} />
  </>
);

function bloqueParaTipo(tipoSolicitud, ev) {
  switch (tipoSolicitud) {
    case 'Permiso':      return <BloquePermiso ev={ev} />;
    case 'Botar turno':  return <BloqueBotarTurno ev={ev} />;
    case 'Cobertura':    return <BloqueCobertura ev={ev} />;
    case 'Intercambio':  return <BloqueIntercambio ev={ev} />;
    default:             return <BloqueGenerico ev={ev} />;
  }
}

// ──────────────────────────────────────────────
// Dropdown de filtro
// ──────────────────────────────────────────────

const FiltroDropdown = ({ tipos, filtroTipo, onChange }) => {
  const p = SGT_DATA.PALETTE;
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const labelActivo = filtroTipo === 'TODOS' ? 'Todos los tipos' : labelParaTipo(filtroTipo);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: filtroTipo !== 'TODOS' ? p.primary : '#fff',
          color: filtroTipo !== 'TODOS' ? '#fff' : p.ink2,
          border: `1px solid ${filtroTipo !== 'TODOS' ? p.primary : p.line}`,
          borderRadius: 10, padding: '8px 12px', fontSize: 13, fontWeight: 700,
          cursor: 'pointer', whiteSpace: 'nowrap',
        }}
      >
        <SGTIcon name="filter" size={14} color={filtroTipo !== 'TODOS' ? '#fff' : p.ink3} />
        {labelActivo}
        <SGTIcon name={open ? 'chevron-up' : 'chevron-down'} size={14} color={filtroTipo !== 'TODOS' ? '#fff' : p.ink3} />
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 50,
          background: '#fff', border: `1px solid ${p.line}`, borderRadius: 12,
          boxShadow: '0 8px 24px rgba(15,23,42,0.12)', minWidth: 220, overflow: 'hidden',
        }}>
          {tipos.map(tipo => {
            const activo = filtroTipo === tipo;
            const label  = tipo === 'TODOS' ? 'Todos los tipos' : labelParaTipo(tipo);
            const tone   = tipo !== 'TODOS' ? toneParaTipo(tipo) : null;
            return (
              <button
                key={tipo}
                onClick={() => { onChange(tipo); setOpen(false); }}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 14px', background: activo ? p.primarySoft : 'transparent',
                  border: 'none', cursor: 'pointer', textAlign: 'left',
                  borderBottom: `1px solid ${p.line2}`,
                }}
              >
                {tone && <SGTBadge tone={tone} size="xs">{label}</SGTBadge>}
                {!tone && <span style={{ fontSize: 13, fontWeight: 700, color: p.ink }}>{label}</span>}
                {activo && <SGTIcon name="check" size={14} color={p.primary} style={{ marginLeft: 'auto' }} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ──────────────────────────────────────────────
// Item de evento
// ──────────────────────────────────────────────

const EventoItem = ({ evento }) => {
  const p     = SGT_DATA.PALETTE;
  const tipo  = evento.tipoEvento || 'Evento';
  const tone  = toneParaTipo(tipo);
  const label = labelParaTipo(tipo);
  const fecha = fmtFechaHora(evento.fechaModificacion) || fmtFechaHora(evento.fechaInicioAfectada) || '—';

  return (
    <div style={{
      background: '#fff', border: `1px solid ${p.line}`, borderRadius: 12,
      padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8,
    }}>
      {/* Cabecera */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        <SGTBadge tone={tone} size="xs">{label}</SGTBadge>
        {evento.tipoSolicitud && (
          <SGTBadge tone="neutral" size="xs">{evento.tipoSolicitud}</SGTBadge>
        )}
        <span style={{ fontSize: 12, color: p.ink3, fontWeight: 600, marginLeft: 'auto' }}>{fecha}</span>
      </div>

      {/* Contenido según tipo de solicitud */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {bloqueParaTipo(evento.tipoSolicitud, evento)}
      </div>
    </div>
  );
};

// ──────────────────────────────────────────────
// Componente principal
// ──────────────────────────────────────────────

const BitacoraView = ({ onBack }) => {
  const p = SGT_DATA.PALETTE;

  const [eventos, setEventos]       = useState([]);
  const [filtroTipo, setFiltroTipo] = useState('TODOS');
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    eventosService.getAllDTO()
      .then(data => setEventos((data || []).reverse()))
      .catch(() => setError('No se pudo cargar la bitácora.'))
      .finally(() => setLoading(false));
  }, []);

  const tiposUnicos = useMemo(() => {
    const set = new Set(eventos.map(e => e.tipoEvento).filter(Boolean));
    return ['TODOS', ...Array.from(set)];
  }, [eventos]);

  const eventosFiltrados = useMemo(() => {
    if (filtroTipo === 'TODOS') return eventos;
    return eventos.filter(e => e.tipoEvento === filtroTipo);
  }, [eventos, filtroTipo]);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: p.surface2, animation: 'sgtSlideLeft .3s ease', overflow: 'hidden' }}>

      {/* Header */}
      <div style={{ padding: '16px', background: '#fff', borderBottom: `1px solid ${p.line2}`, display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={onBack} style={{ background: 'transparent', border: 'none', padding: 4, cursor: 'pointer', display: 'flex' }}>
          <SGTIcon name="chevron-left" size={24} color={p.ink} />
        </button>
        <div style={{ fontSize: 19, fontWeight: 800, color: p.ink }}>Bitácora de Cambios</div>
      </div>

      {/* Filtro + contador */}
      {!loading && !error && (
        <div style={{ padding: '10px 14px', background: '#fff', borderBottom: `1px solid ${p.line2}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          {tiposUnicos.length > 1
            ? <FiltroDropdown tipos={tiposUnicos} filtroTipo={filtroTipo} onChange={setFiltroTipo} />
            : <div />
          }
          <span style={{ fontSize: 12, color: p.ink3, fontWeight: 600, flexShrink: 0 }}>
            {eventosFiltrados.length} {eventosFiltrados.length === 1 ? 'registro' : 'registros'}
            {filtroTipo !== 'TODOS' && ` · ${labelParaTipo(filtroTipo)}`}
          </span>
        </div>
      )}

      <div style={{ flex: 1, overflow: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {loading && (
          <div style={{ textAlign: 'center', padding: 40, color: p.ink3, fontSize: 13, fontWeight: 600 }}>
            Cargando bitácora...
          </div>
        )}
        {error && (
          <div style={{ background: p.accentSoft, border: '1px solid #F3D2D5', borderRadius: 12, padding: 14, fontSize: 13, color: '#8C3F44', fontWeight: 700 }}>
            {error}
          </div>
        )}
        {!loading && !error && eventosFiltrados.length === 0 && (
          <div style={{ textAlign: 'center', padding: 40, color: p.ink3, fontSize: 13, fontWeight: 600 }}>
            Sin registros para mostrar.
          </div>
        )}
        {!loading && !error && eventosFiltrados.map(ev => (
          <EventoItem key={ev.idEvento} evento={ev} />
        ))}
      </div>
    </div>
  );
};

export default BitacoraView;
