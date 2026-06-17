import { useEffect, useMemo, useRef, useState } from 'react';
import dayjs from 'dayjs';
import { eventosService } from '../../services/adminService';
import { SGT_DATA } from './data';
import { SGTBadge, SGTIcon } from '../Style/UIPrimitives';
import PeriodoSelector, { buildSemanasDelMes, rangoPeriodo } from '../Style/PeriodoSelector';

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

function estadoTone(estado) {
  if (estado === 'APROBADA') return 'success';
  if (estado === 'RECHAZADA') return 'accent';
  return 'warn';
}

const esGeneracionTurno = (ev) => ev.tipoEvento === 'GENERACION_TURNO';

// Label legible para el header del item colapsado
function labelEvento(ev) {
  if (ev.tipoSolicitud) return ev.tipoSolicitud;
  if (esGeneracionTurno(ev)) return 'Creación de turno';
  if (!ev.idSolicitud) return 'Turno';
  return labelParaTipo(ev.tipoEvento);
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
function fmtTurno(dia, horaIni, horaFin, puesto) {
  if (!dia) return null;
  const d = fmtFecha(dia);
  const h = horaIni && horaFin ? ` · ${fmtHora(horaIni)}–${fmtHora(horaFin)}` : '';
  const p = puesto ? ` (${puesto})` : '';
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
    <Row label="Inicio permiso"  value={fmtFechaHora(ev.fechaInicioPermiso)} />
    <Row label="Término permiso" value={fmtFechaHora(ev.fechaTerminoPermiso)} />
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
    <Row label="Turno a botar" value={fmtTurno(ev.diaInicioTurnoSolicitud, ev.horaInicioTurnoSolicitud, ev.horaFinTurnoSolicitud, ev.nombrePuestoSolicitud)} />
    <Row label="Motivo"        value={ev.motivoSolicitud || ev.motivo} />
    <Row label="Estado"        value={ev.estadoSolicitud} />
    {ev.nombreFuncionario && ev.nombreFuncionario !== ev.nombreFuncionarioEmisor && (
      <Row label="Decisión por" value={ev.nombreFuncionario} />
    )}
  </>
);

const BloqueCobertura = ({ ev }) => (
  <>
    <Row label="Turno a cubrir"       value={fmtTurno(ev.diaInicioTurnoSolicitud, ev.horaInicioTurnoSolicitud, ev.horaFinTurnoSolicitud, ev.nombrePuestoSolicitud)} />
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
      <Row label="Su turno"    value={fmtTurno(ev.diaInicioTurnoSolicitud, ev.horaInicioTurnoSolicitud, ev.horaFinTurnoSolicitud, ev.nombrePuestoSolicitud)} />
      <Divider />
      <Row label="Receptor"    value={ev.nombreFuncionarioReceptor} />
      <Row label="Su turno"    value={fmtTurno(ev.diaInicioTurnoReceptor, ev.horaInicioTurnoReceptor, ev.horaFinTurnoReceptor, ev.nombrePuestoReceptor)} />
      <Row label="Respuesta receptor" value={receptorAcepto} />
      <Divider />
      <Row label="Estado final"  value={ev.estadoSolicitud} />
      {ev.nombreFuncionario && (
        <Row label="Decisión por" value={ev.nombreFuncionario} />
      )}
    </>
  );
};

const BloqueGenerico = ({ ev }) => {
  const diaInicio  = ev.diaInicioTurnoSolicitud  || ev.diaInicioTurno;
  const horaInicio = ev.horaInicioTurnoSolicitud || ev.horaInicioTurno;
  const horaFin    = ev.horaFinTurnoSolicitud    || ev.horaFinTurno;
  const puesto     = ev.nombrePuestoSolicitud    || ev.nombrePuesto;
  return (
    <>
      <Row label="Actor"          value={ev.nombreFuncionario} />
      <Row label="Turno"          value={fmtTurno(diaInicio, horaInicio, horaFin, puesto)} />
      <Row label="Rango afectado" value={fmtRango(ev.fechaInicioAfectada, ev.fechaFinAfectada)} />
      <Row label="Motivo"         value={ev.motivoSolicitud || ev.motivo} />
      <Row label="Observaciones"  value={ev.observaciones} />
      <Row label="Estado"         value={ev.estadoSolicitud} />
    </>
  );
};

const BloqueGeneracionTurno = ({ ev }) => (
  <>
    <Row label="Asignado a"     value={ev.nombreFuncionarioTurno || 'Libre'} />
    <Row label="Turno"          value={fmtTurno(ev.diaInicioTurno, ev.horaInicioTurno, ev.horaFinTurno, ev.nombrePuesto)} />
    <Row label="Rango afectado" value={fmtRango(ev.fechaInicioAfectada, ev.fechaFinAfectada)} />
    <Row label="Planificación"  value={ev.motivo} />
    <Row label="Generado por"   value={ev.nombreFuncionario} />
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
// FilaFiltro
// ──────────────────────────────────────────────

const FilaFiltro = ({ label, opciones, valor, onSelect }) => {
  const p = SGT_DATA.PALETTE;
  const [open, setOpen] = useState(false);

  const todasOpciones = [{ value: null, label: 'Todo' }, ...opciones];

  return (
    <div style={{ borderBottom: `1px solid ${p.line2}` }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 8,
          padding: '11px 14px', background: 'none', border: 'none', cursor: 'pointer',
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 700, color: p.ink, flex: 1, textAlign: 'left' }}>{label}</span>
        {valor && <SGTBadge tone="primary" size="xs">{valor}</SGTBadge>}
        <SGTIcon name={open ? 'chevron-up' : 'chevron-down'} size={14} color={p.ink3} />
      </button>

      {open && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: '0 14px 12px' }}>
          {todasOpciones.map(op => {
            const activo = valor === op.value;
            return (
              <button
                key={op.value ?? '__todo__'}
                onClick={() => { onSelect(op.value); setOpen(false); }}
                style={{
                  padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700,
                  border: `1.5px solid ${activo ? p.primary : p.line}`,
                  background: activo ? p.primary : '#fff',
                  color: activo ? '#fff' : p.ink2,
                  cursor: 'pointer',
                }}
              >
                {op.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ──────────────────────────────────────────────
// Item de evento (colapsable)
// ──────────────────────────────────────────────

const EventoItem = ({ evento }) => {
  const p = SGT_DATA.PALETTE;
  const [expandido, setExpandido] = useState(false);
  const expandedRef = useRef(null);

  const tipo      = evento.tipoEvento || 'Evento';
  const tone      = toneParaTipo(tipo);
  const label     = labelEvento(evento);
  const fecha     = fmtFechaHora(evento.fechaModificacion) || fmtFechaHora(evento.fechaInicioAfectada) || '—';
  const encargado = evento.nombreFuncionario;

  useEffect(() => {
    if (expandido && expandedRef.current) {
      expandedRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [expandido]);

  return (
    <div style={{ background: '#fff', border: `1px solid ${p.line}`, borderRadius: 12 }}>
      {/* Cabecera colapsada — siempre visible */}
      <div
        onClick={() => setExpandido(e => !e)}
        style={{
          padding: '12px 14px', cursor: 'pointer',
          display: 'flex', flexDirection: 'column', gap: 5,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <SGTBadge tone={tone} size="xs">{label}</SGTBadge>
          {esGeneracionTurno(evento) && (
            <SGTBadge tone={evento.nombreFuncionarioTurno ? 'success' : 'neutral'} size="xs">
              {evento.nombreFuncionarioTurno || 'Libre'}
            </SGTBadge>
          )}
          {evento.estadoSolicitud && (
            <SGTBadge tone={estadoTone(evento.estadoSolicitud)} size="xs">{evento.estadoSolicitud}</SGTBadge>
          )}
          <span style={{ fontSize: 12, color: p.ink3, fontWeight: 600, marginLeft: 'auto' }}>{fecha}</span>
          <SGTIcon name={expandido ? 'chevron-up' : 'chevron-down'} size={14} color={p.ink3} />
        </div>
        {encargado && (
          <span style={{ fontSize: 12, color: p.ink2, fontWeight: 600, textAlign: 'left' }}>
            Encargado Evento: {encargado}
          </span>
        )}
      </div>

      {/* Contenido expandido */}
      {expandido && (
        <div
          ref={expandedRef}
          style={{
            padding: '8px 14px 12px',
            borderTop: `1px solid ${p.line2}`,
            display: 'flex', flexDirection: 'column', gap: 4,
          }}
        >
          {esGeneracionTurno(evento)
            ? <BloqueGeneracionTurno ev={evento} />
            : bloqueParaTipo(evento.tipoSolicitud, evento)}
        </div>
      )}
    </div>
  );
};

// ──────────────────────────────────────────────
// Componente principal
// ──────────────────────────────────────────────

const BitacoraView = ({ onBack }) => {
  const p = SGT_DATA.PALETTE;

  const [eventos, setEventos]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);

  // Período
  const [mesOffset, setMesOffset] = useState(0);
  const [semanaKey, setSemanaKey] = useState(null);

  // Filtros de contenido
  const [filtroCategoria,      setFiltroCategoria]      = useState(null);
  const [filtroTipoSolicitud,  setFiltroTipoSolicitud]  = useState(null);
  const [filtroEstado,         setFiltroEstado]         = useState(null);
  const [filtrosOpen,          setFiltrosOpen]          = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(null);
    eventosService.getAllDTO()
      .then(data => setEventos((data || []).reverse()))
      .catch(() => setError('No se pudo cargar la bitácora.'))
      .finally(() => setLoading(false));
  }, []);

  // Rango del período seleccionado
  const mesActual = dayjs().subtract(mesOffset, 'month');
  const semanas   = buildSemanasDelMes(mesActual.year(), mesActual.month() + 1);
  const rango     = rangoPeriodo(mesOffset, semanaKey, semanas);

  // Opciones dinámicas para filtros
  const opcionesTipoSolicitud = useMemo(() => {
    const set = new Set(eventos.map(e => e.tipoSolicitud).filter(Boolean));
    return Array.from(set).map(t => ({ value: t, label: t }));
  }, [eventos]);

  const opcionesEstado = useMemo(() => {
    const set = new Set(eventos.map(e => e.estadoSolicitud).filter(Boolean));
    return Array.from(set).map(t => ({ value: t, label: t }));
  }, [eventos]);

  // Eventos filtrados
  const eventosFiltrados = useMemo(() => {
    return eventos.filter(ev => {
      // Filtro por período
      const fechaStr = ev.fechaModificacion || ev.fechaInicioAfectada;
      if (fechaStr) {
        const ms = dayjs(fechaStr).valueOf();
        if (ms < rango.inicio.startOf('day').valueOf()) return false;
        if (ms > rango.fin.endOf('day').valueOf())     return false;
      }
      // Filtro por categoría
      if (filtroCategoria === 'SOLICITUDES' && !ev.idSolicitud)  return false;
      if (filtroCategoria === 'TURNOS'      &&  ev.idSolicitud)  return false;
      // Filtro por tipo de solicitud
      if (filtroTipoSolicitud && ev.tipoSolicitud !== filtroTipoSolicitud) return false;
      // Filtro por estado
      if (filtroEstado && ev.estadoSolicitud !== filtroEstado) return false;
      return true;
    });
  }, [eventos, rango, filtroCategoria, filtroTipoSolicitud, filtroEstado]);

  const filtrosActivos = [filtroCategoria, filtroTipoSolicitud, filtroEstado].filter(Boolean).length;

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: p.surface2, animation: 'sgtSlideLeft .3s ease', overflow: 'hidden' }}>

      {/* Header */}
      <div style={{ padding: '16px', background: '#fff', borderBottom: `1px solid ${p.line2}`, display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={onBack} style={{ background: 'transparent', border: 'none', padding: 4, cursor: 'pointer', display: 'flex' }}>
          <SGTIcon name="chevron-left" size={24} color={p.ink} />
        </button>
        <div style={{ fontSize: 19, fontWeight: 800, color: p.ink }}>Bitácora de Cambios</div>
      </div>

      {/* Selector de período */}
      <div style={{ padding: '10px 14px', background: '#fff', borderBottom: `1px solid ${p.line2}` }}>
        <PeriodoSelector
          mesOffset={mesOffset} setMesOffset={setMesOffset}
          semanaKey={semanaKey}  setSemanaKey={setSemanaKey}
        />
      </div>

      {/* Panel de filtros */}
      {!loading && !error && (
        <div style={{ background: '#fff', borderBottom: `2px solid #b0b8c4` }}>
          <button
            onClick={() => setFiltrosOpen(o => !o)}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 8,
              padding: '10px 14px', background: 'none', border: 'none', cursor: 'pointer',
            }}
          >
            <SGTIcon name="filter" size={14} color={filtrosActivos > 0 ? p.primary : p.ink3} />
            <span style={{ fontSize: 13, fontWeight: 700, color: filtrosActivos > 0 ? p.primary : p.ink, flex: 1, textAlign: 'left' }}>
              Filtrar{filtrosActivos > 0 ? ` (${filtrosActivos})` : ''}
            </span>
            <span style={{ fontSize: 12, color: p.ink3, fontWeight: 600 }}>
              {eventosFiltrados.length} {eventosFiltrados.length === 1 ? 'registro' : 'registros'}
            </span>
            <SGTIcon name={filtrosOpen ? 'chevron-up' : 'chevron-down'} size={14} color={p.ink3} />
          </button>

          {filtrosOpen && (
            <div style={{ background: p.surface2 }}>
              <FilaFiltro
                label="Categoría"
                opciones={[
                  { value: 'SOLICITUDES', label: 'Solicitudes' },
                  { value: 'TURNOS',      label: 'Turnos' },
                ]}
                valor={filtroCategoria}
                onSelect={setFiltroCategoria}
              />
              <FilaFiltro
                label="Tipo de solicitud"
                opciones={opcionesTipoSolicitud}
                valor={filtroTipoSolicitud}
                onSelect={setFiltroTipoSolicitud}
              />
              <FilaFiltro
                label="Estado"
                opciones={opcionesEstado}
                valor={filtroEstado}
                onSelect={setFiltroEstado}
              />
            </div>
          )}
        </div>
      )}

      {/* Lista de eventos */}
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
