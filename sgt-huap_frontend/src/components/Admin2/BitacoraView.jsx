import { useEffect, useMemo, useRef, useState } from 'react';
import dayjs from 'dayjs';
import { eventosService } from '../../services/adminService';
import { mensajeDeError } from '../../utils/errores';
import { SGT_DATA, STATUS_TONE_MAP } from './data';
import { SGTBadge, SGTIcon, TopHeader, StatusBadge, Sheet } from '../Style/UIPrimitives';
import { ListEmptyState, LoadingState } from '../Style/ListControls';
import { formatShiftLabel } from '../Comun/turnoPresentacion';
import PeriodoSelector from '../Style/PeriodoSelector';
import { buildSemanasDelMes, rangoPeriodo } from '../Style/periodo';
import { useLayout } from '../../layout/layout';
import { EncabezadoDesktop, PaginaDesktop, PanelDesktop, CampoDesktop, BotonDesktop, AvisoDesktop } from '../Desktop/ui';
import { PeriodoDesktop } from '../Desktop/gestion/PeriodoDesktop';
import { TablaBitacoraDesktop } from '../Desktop/gestion/BitacoraDesktop';

// Tonos de SGTBadge → tonos de ChipDesktop (desktop, R18).
const TONO_DESKTOP = { primary: 'primario', success: 'exito', accent: 'alerta', warn: 'aviso', neutral: 'neutral', libre: 'aviso' };

// ──────────────────────────────────────────────
// Mapeo de enums
// ──────────────────────────────────────────────

const TIPO_LABEL = {
  SOLICITUD_CREADA:             'Solicitud creada',
  CAMBIO_ESTADO_APROBADA:       'Aprobada',
  CAMBIO_ESTADO_RECHAZADA:      'Rechazada',
  RECHAZO_AUTOMATICO:           'Rechazo automático',
  SOLICITUD_CANCELADA:          'Cancelada por el solicitante',
  OFERTA_ACEPTADA_POR_RECEPTOR: 'Oferta aceptada',
  OFERTA_RECHAZADA_POR_RECEPTOR:'Oferta rechazada',
  ASIGNACION:                   'Asignación',
  DESASIGNACION:                'Desasignación',
  PERMISO:                      'Permiso',
  INTERCAMBIO:                  'Intercambio',
  COBERTURA:                    'Cobertura',
};

const TIPO_TONE = {
  SOLICITUD_CREADA:                          'primary',
  CAMBIO_ESTADO_APROBADA:                    'success',
  CAMBIO_ESTADO_RECHAZADA:                   'accent',
  RECHAZO_AUTOMATICO:                        'accent',
  SOLICITUD_CANCELADA:                       'neutral',
  OFERTA_ACEPTADA_POR_RECEPTOR:              'warn',
  OFERTA_RECHAZADA_POR_RECEPTOR:             'accent',
  OFERTA_PARTICULAR_ACEPTADA_POR_RECEPTOR:   'warn',
  OFERTA_PARTICULAR_RECHAZADA_POR_RECEPTOR:  'accent',
  ASIGNACION:                                'primary',
  DESASIGNACION:                             'accent',
  REASIGNACION:                              'warn',
  MODIFICACION_HORARIO:                      'warn',
  // Asignación directa de la gestión (GestionTurnoService).
  ASIGNACION_MANUAL_TURNO:                   'primary',
  REASIGNACION_MANUAL_TURNO:                 'warn',
  LIBERACION_MANUAL_TURNO:                   'accent',
  PERMISO:                                   'warn',
  INTERCAMBIO:                               'neutral',
  COBERTURA:                                 'success',
  OFERTA_GENERAL_CREADA:                     'primary',
  OFERTA_GENERAL_APROBADA:                   'warn',
  OFERTA_GENERAL_RECHAZADA:                  'accent',
  OFERTA_GENERAL_CERRADA:                    'success',
};

function labelParaTipo(tipo) {
  if (!tipo) return 'Evento';
  return TIPO_LABEL[tipo] || tipo.toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}
function toneParaTipo(tipo) {
  if (!tipo) return 'neutral';
  return TIPO_TONE[tipo] || 'neutral';
}

function accionDesdeEvento(ev) {
  switch (ev.tipoEvento) {
    case 'SOLICITUD_CREADA':                          return 'Creación';
    case 'OFERTA_PARTICULAR_ACEPTADA_POR_RECEPTOR':
    case 'OFERTA_ACEPTADA_POR_RECEPTOR':              return 'Aceptación del receptor';
    case 'OFERTA_PARTICULAR_RECHAZADA_POR_RECEPTOR':
    case 'OFERTA_RECHAZADA_POR_RECEPTOR':             return 'Rechazo del receptor';
    case 'CAMBIO_ESTADO_APROBADA':                    return 'Aprobación';
    case 'CAMBIO_ESTADO_RECHAZADA':                   return 'Rechazo';
    case 'RECHAZO_AUTOMATICO':                        return 'Rechazo automático';
    case 'SOLICITUD_CANCELADA':                       return 'Cancelación por el solicitante';
    case 'ASIGNACION':
    case 'ASIGNACION_MANUAL_TURNO':                   return 'Asignación de turno';
    case 'DESASIGNACION':                             return 'Desasignación de turno';
    case 'LIBERACION_MANUAL_TURNO':                   return 'Liberación de turno';
    case 'REASIGNACION':
    case 'REASIGNACION_MANUAL_TURNO':                 return 'Reasignación de turno';
    case 'MODIFICACION_HORARIO':                      return 'Modificación de horario';
    case 'OFERTA_GENERAL_CREADA':                     return 'Ofrecimiento creado';
    case 'OFERTA_GENERAL_APROBADA':                   return 'Aprobación de oferta';
    case 'OFERTA_GENERAL_RECHAZADA':                  return 'Rechazo de oferta';
    case 'OFERTA_GENERAL_CERRADA':                    return 'Turno asignado';
    default:                                          return null;
  }
}

// Una cancelación queda RECHAZADA en la base, pero se muestra (y se filtra)
// como CANCELADA, igual que en Solicitudes: no es un rechazo de la jefatura.
function estadoDesdeEvento(ev) {
  switch (ev.tipoEvento) {
    case 'SOLICITUD_CREADA':
    case 'OFERTA_PARTICULAR_ACEPTADA_POR_RECEPTOR':
    case 'OFERTA_ACEPTADA_POR_RECEPTOR':              return 'PENDIENTE';
    case 'CAMBIO_ESTADO_APROBADA':                    return 'APROBADA';
    case 'SOLICITUD_CANCELADA':                       return 'CANCELADA';
    case 'CAMBIO_ESTADO_RECHAZADA':
    case 'RECHAZO_AUTOMATICO':
    case 'OFERTA_PARTICULAR_RECHAZADA_POR_RECEPTOR':
    case 'OFERTA_RECHAZADA_POR_RECEPTOR':             return 'RECHAZADA';
    case 'OFERTA_GENERAL_CREADA':
    case 'OFERTA_GENERAL_APROBADA':                   return 'PENDIENTE';
    case 'OFERTA_GENERAL_RECHAZADA':                  return 'RECHAZADA';
    case 'OFERTA_GENERAL_CERRADA':                    return 'APROBADA';
    default:                                          return null;
  }
}

const TIPO_SOLICITUD_BADGE = {
  'Permiso':           'Solicitud de permiso',
  'Botar turno':       'Solicitud de botar turno',
  'Cobertura':         'Solicitud de cobertura',
  'Intercambio':       'Solicitud de intercambio',
  'Oferta particular': 'Solicitud de oferta particular',
};

const esGeneracionTurno = (ev) => ev.tipoEvento === 'GENERACION_TURNO';

// Estado actual de la solicitud del evento: una cancelada por quien la emitió
// queda RECHAZADA en la base con ese motivo; se muestra como CANCELADA (mismo
// criterio que evaluarSolicitud en Solicitudes).
function estadoSolicitudVisible(ev) {
  const estado = ev.estadoSolicitud;
  if (estado === 'RECHAZADA' && String(ev.motivoSolicitud || '').startsWith('Cancelada por el solicitante')) return 'CANCELADA';
  return estado;
}

// Fecha con que se ordena y se filtra un evento.
const fechaDeEvento = (ev) => ev.fechaModificacion || ev.fechaInicioAfectada || null;

// Del más reciente al más antiguo; los eventos del mismo instante, del último
// en llegar al primero (por id). Los que no traen fecha van al final.
function ordenarPorFechaDesc(eventos) {
  return [...eventos].sort((a, b) => {
    const fa = fechaDeEvento(a) ? dayjs(fechaDeEvento(a)).valueOf() : -Infinity;
    const fb = fechaDeEvento(b) ? dayjs(fechaDeEvento(b)).valueOf() : -Infinity;
    if (fa !== fb) return fb - fa;
    return Number(b.idEvento || 0) - Number(a.idEvento || 0);
  });
}

// Label legible para el header del item colapsado
function labelEvento(ev) {
  if (ev.tipoSolicitud) return TIPO_SOLICITUD_BADGE[ev.tipoSolicitud] || ev.tipoSolicitud;
  if (esGeneracionTurno(ev)) return 'Creación de turno';
  if (ev.tipoEvento?.startsWith('OFERTA_GENERAL') || ev.tipoEvento?.startsWith('POSTULACION')) return 'Oferta general';
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
    <Row label="Inicio permiso"  value={fmtFechaHora(ev.fechaInicioPermiso)} />
    <Row label="Término permiso" value={fmtFechaHora(ev.fechaTerminoPermiso)} />
    <Row label="Motivo"          value={ev.motivoSolicitud || ev.motivo} />
    <Row label="Estado"          value={estadoSolicitudVisible(ev)} />
    <Divider />
    <Row label="Acción"          value={accionDesdeEvento(ev)} />
  </>
);

const BloqueBotarTurno = ({ ev }) => (
  <>
    <Row label="Turno a botar" value={fmtTurno(ev.diaInicioTurnoSolicitud, ev.horaInicioTurnoSolicitud, ev.horaFinTurnoSolicitud, ev.nombrePuestoSolicitud)} />
    <Row label="Motivo"        value={ev.motivoSolicitud || ev.motivo} />
    <Row label="Estado"        value={estadoSolicitudVisible(ev)} />
    <Divider />
    <Row label="Acción"        value={accionDesdeEvento(ev)} />
  </>
);

const BloqueCobertura = ({ ev }) => (
  <>
    <Row label="Turno a cubrir" value={fmtTurno(ev.diaInicioTurnoSolicitud, ev.horaInicioTurnoSolicitud, ev.horaFinTurnoSolicitud, ev.nombrePuestoSolicitud)} />
    <Row label="Motivo"         value={ev.motivoSolicitud || ev.motivo} />
    <Row label="Estado"         value={estadoSolicitudVisible(ev)} />
    <Divider />
    <Row label="Acción"         value={accionDesdeEvento(ev)} />
  </>
);

const BloqueIntercambio = ({ ev }) => {
  const receptorAcepto = ev.aceptadoReceptor === true
    ? 'Aceptó'
    : ev.aceptadoReceptor === false
      ? 'Rechazó'
      : null;

  return (
    <>
      <Row label="Turno solicitante"   value={fmtTurno(ev.diaInicioTurnoSolicitud, ev.horaInicioTurnoSolicitud, ev.horaFinTurnoSolicitud, ev.nombrePuestoSolicitud)} />
      <Divider />
      <Row label="Receptor"            value={ev.nombreFuncionarioReceptor} />
      <Row label="Turno receptor"      value={fmtTurno(ev.diaInicioTurnoReceptor, ev.horaInicioTurnoReceptor, ev.horaFinTurnoReceptor, ev.nombrePuestoReceptor)} />
      <Row label="Respuesta receptor"  value={receptorAcepto} />
      <Divider />
      <Row label="Estado final"        value={estadoSolicitudVisible(ev)} />
      <Row label="Acción"              value={accionDesdeEvento(ev)} />
    </>
  );
};

const BloqueOfertaParticular = ({ ev }) => {
  const respuesta = ev.aceptadoReceptor === true
    ? 'Aceptó'
    : ev.aceptadoReceptor === false
      ? 'Rechazó'
      : null;
  return (
    <>
      <Row label="Turno ofrecido"      value={fmtTurno(ev.diaInicioTurnoSolicitud, ev.horaInicioTurnoSolicitud, ev.horaFinTurnoSolicitud, ev.nombrePuestoSolicitud)} />
      <Row label="Receptor"            value={ev.nombreFuncionarioReceptor} />
      <Row label="Respuesta receptor"  value={respuesta} />
      <Divider />
      <Row label="Estado"              value={estadoSolicitudVisible(ev)} />
      <Row label="Acción"              value={accionDesdeEvento(ev)} />
    </>
  );
};

const BloqueOfertaGeneral = ({ ev }) => (
  <>
    <Row label="Turno ofertado" value={fmtTurno(ev.diaInicioTurnoOferta, ev.horaInicioTurnoOferta, ev.horaFinTurnoOferta, ev.nombrePuestoTurnoOferta)} />
    {ev.tipoEvento === 'OFERTA_GENERAL_CERRADA' && <Row label="Asignado a" value={ev.nombreAsignado} />}
    <Divider />
    <Row label="Acción" value={accionDesdeEvento(ev)} />
  </>
);

const BloqueGenerico = ({ ev }) => {
  const diaInicio  = ev.diaInicioTurnoSolicitud || ev.diaInicioTurno;
  const horaInicio = ev.horaInicioTurnoSolicitud || ev.horaInicioTurno;
  const horaFin    = ev.horaFinTurnoSolicitud    || ev.horaFinTurno;
  const puesto     = ev.nombrePuestoSolicitud    || ev.nombrePuesto;
  return (
    <>
      <Row label="Turno"          value={fmtTurno(diaInicio, horaInicio, horaFin, puesto)} />
      <Row label="Rango afectado" value={fmtRango(ev.fechaInicioAfectada, ev.fechaFinAfectada)} />
      <Row label="Motivo"         value={ev.motivoSolicitud || ev.motivo} />
      <Row label="Observaciones"  value={ev.observaciones} />
      <Row label="Estado"         value={estadoSolicitudVisible(ev)} />
      <Row label="Acción"         value={accionDesdeEvento(ev)} />
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
  if (ev.tipoEvento?.startsWith('OFERTA_GENERAL')) return <BloqueOfertaGeneral ev={ev} />;
  switch (tipoSolicitud) {
    case 'Permiso':           return <BloquePermiso ev={ev} />;
    case 'Botar turno':       return <BloqueBotarTurno ev={ev} />;
    case 'Cobertura':         return <BloqueCobertura ev={ev} />;
    case 'Intercambio':       return <BloqueIntercambio ev={ev} />;
    case 'Oferta particular': return <BloqueOfertaParticular ev={ev} />;
    default:                  return <BloqueGenerico ev={ev} />;
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
    <div className="sgt-filter-row" style={{ borderBottom: `1px solid ${p.line2}` }}>
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
                className="sgt-filter-chip"
                onClick={() => { onSelect(op.value); setOpen(false); }}
                style={{
                  padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700,
                  border: `1.5px solid ${activo ? p.primary : p.line}`,
                  background: activo ? 'linear-gradient(150deg, #6C8BFF 0%, #2B3FA0 100%)' : '#fff',
                  color: activo ? '#fff' : p.ink2,
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

// `etiqueta`: el título del evento cuando la vista quiere otro que el de la
// bitácora general (el historial de un turno dice qué le pasó al turno).
const EventoItem = ({ evento, etiqueta }) => {
  const p = SGT_DATA.PALETTE;
  const [expandido, setExpandido] = useState(false);
  const expandedRef = useRef(null);

  const tipo       = evento.tipoEvento || 'Evento';
  const tone       = toneParaTipo(tipo);
  const label      = etiqueta || labelEvento(evento);
  const fecha      = fmtFechaHora(evento.fechaModificacion) || fmtFechaHora(evento.fechaInicioAfectada) || '—';
  const estado     = estadoDesdeEvento(evento);
  const solicitante = evento.nombreFuncionarioEmisor || evento.nombreOferente || null;
  const accionPor  = evento.nombreFuncionario;

  useEffect(() => {
    if (expandido && expandedRef.current) {
      expandedRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [expandido]);

  return (
    <div className="sgt-list-row" style={{ background: '#fff', border: 'none', borderRadius: 16, boxShadow: '0 2px 10px rgba(15,23,42,0.06)' }}>
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
          <span style={{ fontSize: 12, color: p.ink3, fontWeight: 600, marginLeft: 'auto' }}>{fecha}</span>
          <SGTIcon name={expandido ? 'chevron-up' : 'chevron-down'} size={14} color={p.ink3} />
        </div>
        {estado && (
          <div style={{ alignSelf: 'flex-start' }}>
            <StatusBadge status={estado} size="xs" />
          </div>
        )}
        {solicitante && (
          <span style={{ fontSize: 12, color: p.ink3, fontWeight: 600, textAlign: 'left' }}>
            Solicitante: {solicitante}
          </span>
        )}
        {accionPor && (
          <span style={{ fontSize: 12, color: p.ink3, fontWeight: 600, textAlign: 'left' }}>
            Acción por: {accionPor}
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
// Historial de un turno (C-06)
// ──────────────────────────────────────────────

// GET /bitacoras/turno/{id} entrega la entidad de cada evento, con el actor,
// el turno y la solicitud anidados; la bitácora general usa el DTO plano de
// /bitacoras/dto. Para dibujar los dos igual, la entidad se lleva a la forma
// del DTO (BitacoraService.convertToDTO). Si el backend ya entrega el DTO,
// pasa tal cual.
const TIPO_SOLICITUD_NOMBRE = { 1: 'Permiso', 2: 'Botar turno', 3: 'Cobertura', 4: 'Intercambio', 5: 'Oferta particular' };
const nombreDe = (f) => (f ? [f.nombre, f.apelPat].filter(Boolean).join(' ') || null : null);
// Campos del DTO para un turno: los del turno del evento sin sufijo, los de la
// solicitud con «Solicitud» y los del turno del receptor con «Receptor».
const turnoComoDTO = (t, sufijo = '') => ({
  [`idTurno${sufijo}`]:        t?.idTurno ?? null,
  [`diaInicioTurno${sufijo}`]: t?.diaInicioTurno ?? null,
  [`diaFinalTurno${sufijo}`]:  t?.diaFinalTurno ?? null,
  [`horaInicioTurno${sufijo}`]: t?.horaInicio ?? null,
  [`horaFinTurno${sufijo}`]:   t?.horaFin ?? null,
  [`nombrePuesto${sufijo}`]:   t?.puesto?.nombre ?? null,
});

function comoEventoDeBitacora(e) {
  if (!e || typeof e !== 'object') return null;
  if (!['funcionario', 'turno', 'solicitud'].some((k) => k in e)) return e;
  const s = e.solicitud || null;
  return {
    idEvento: e.idEvento,
    tipoEvento: e.tipoEvento,
    motivo: e.motivo,
    observaciones: e.observaciones,
    fechaModificacion: e.fechaModificacion,
    fechaInicioAfectada: e.fechaInicioAfectada,
    fechaFinAfectada: e.fechaFinAfectada,
    activo: e.activo,
    idFuncionario: e.funcionario?.idFuncionario ?? null,
    nombreFuncionario: nombreDe(e.funcionario),
    ...turnoComoDTO(e.turno),
    idFuncionarioTurno: e.turno?.funcionario?.idFuncionario ?? null,
    nombreFuncionarioTurno: nombreDe(e.turno?.funcionario),
    idSolicitud: s?.idSolicitud ?? null,
    tipoSolicitud: TIPO_SOLICITUD_NOMBRE[s?.tipoSolicitud?.tipo] ?? null,
    estadoSolicitud: s?.estado ?? null,
    motivoSolicitud: s?.motivo ?? null,
    aceptadoReceptor: s?.aceptadoReceptor ?? null,
    fechaInicioPermiso: s?.fechaInicioPermiso ?? null,
    fechaTerminoPermiso: s?.fechaTerminoPermiso ?? null,
    idFuncionarioEmisor: s?.funcionario?.idFuncionario ?? null,
    nombreFuncionarioEmisor: nombreDe(s?.funcionario),
    ...turnoComoDTO(s?.turno, 'Solicitud'),
    idFuncionarioReceptor: s?.funcionarioReceptor?.idFuncionario ?? null,
    nombreFuncionarioReceptor: nombreDe(s?.funcionarioReceptor),
    ...turnoComoDTO(s?.turnoReceptor, 'Receptor'),
  };
}

// Qué le pasó al turno: el título de esos eventos en su historial. En la
// bitácora general se rotulan «Turno», la categoría; aquí todos lo son.
const EVENTO_DE_TURNO = {
  ASIGNACION_MANUAL_TURNO:   'Asignación manual',
  REASIGNACION_MANUAL_TURNO: 'Reasignación manual',
  LIBERACION_MANUAL_TURNO:   'Liberación manual',
  MODIFICACION_HORARIO:      'Cambio de horario',
};

// Contenido del historial. Se monta de nuevo para cada turno (key), así que
// nunca muestra, ni por un instante, los eventos de otro.
const HistorialDelTurno = ({ turno }) => {
  const p = SGT_DATA.PALETTE;
  const [estado, setEstado] = useState({ cargando: true, error: null, eventos: [] });

  useEffect(() => {
    let vigente = true;
    eventosService.getByTurno(turno.id)
      .then((data) => {
        if (!vigente) return;
        const eventos = (Array.isArray(data) ? data : []).map(comoEventoDeBitacora).filter(Boolean);
        setEstado({ cargando: false, error: null, eventos: ordenarPorFechaDesc(eventos) });
      })
      .catch((e) => {
        if (vigente) setEstado({ cargando: false, error: mensajeDeError(e, 'No se pudo cargar el historial del turno.'), eventos: [] });
      });
    return () => { vigente = false; };
  }, [turno.id]);

  const { cargando, error, eventos } = estado;
  const detalle = [turno.nombrePuesto, turno.turnoLibre ? 'Cupo libre' : turno.nombreFuncionario].filter(Boolean).join(' · ');

  return (
    <div style={{ padding: '4px 16px 24px', display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ background: p.surface2, border: `1px solid ${p.line2}`, borderRadius: 12, padding: '10px 12px', textAlign: 'left' }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: p.ink }}>{formatShiftLabel(turno)}</div>
        {detalle && <div style={{ fontSize: 12, fontWeight: 600, color: p.ink3, marginTop: 2 }}>{detalle}</div>}
        <div style={{ fontSize: 11.5, fontWeight: 600, color: p.ink3, marginTop: 6 }}>
          Cambios registrados en este turno, del más reciente al más antiguo.
        </div>
      </div>
      {cargando && <LoadingState label="Cargando historial..." />}
      {!cargando && error && (
        <div role="alert" style={{ background: p.accentSoft, border: '1px solid #F3D2D5', borderRadius: 12, padding: 14, fontSize: 13, color: '#8C3F44', fontWeight: 700 }}>
          {error}
        </div>
      )}
      {!cargando && !error && eventos.length === 0 && (
        <ListEmptyState
          icon="history" theme="slate"
          title="Sin cambios registrados"
          message="Este turno no tiene eventos en la bitácora."
        />
      )}
      {!cargando && !error && eventos.map((ev) => (
        <EventoItem key={ev.idEvento} evento={ev} etiqueta={EVENTO_DE_TURNO[ev.tipoEvento]} />
      ))}
    </div>
  );
};

/**
 * Historial de UN turno (C-06, 17 oct 2026). Lo abre «Ver historial» del
 * detalle del turno, en el inicio y en el calendario, en móvil y desktop (en
 * desktop, como panel lateral sobre el detalle). Pide GET
 * /bitacoras/turno/{id}: la gestión ve el de los turnos de su servicio y el
 * médico solo el de los suyos (el backend responde 403 en los demás, y el
 * detalle no le ofrece «Ver historial» en ellos). No es la bitácora general,
 * que sigue siendo solo de gestión.
 * `turno`: el turno del detalle (null = cerrado).
 */
export const HistorialTurnoSheet = ({ turno, onClose }) => (
  <Sheet open={turno?.id != null} onClose={onClose} title="Historial del turno" maxHeight="88%" anchoDesktop={560}>
    {turno?.id != null && <HistorialDelTurno key={turno.id} turno={turno} />}
  </Sheet>
);

// ──────────────────────────────────────────────
// Componente principal
// ──────────────────────────────────────────────

const BitacoraView = ({ onBack }) => {
  const p = SGT_DATA.PALETTE;
  const { esDesktop } = useLayout();

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
  const [filtroEncargado,      setFiltroEncargado]      = useState(null);
  const [filtrosOpen,          setFiltrosOpen]          = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(null);
    eventosService.getAllDTO()
      .then(data => setEventos(ordenarPorFechaDesc(Array.isArray(data) ? data : [])))
      .catch(() => setError('No se pudo cargar la bitácora.'))
      .finally(() => setLoading(false));
  }, []);

  // Rango del período seleccionado. Se calcula solo cuando cambia el período:
  // si se rehiciera en cada render, el filtro de abajo también se recalcularía.
  const { mesActual, rango } = useMemo(() => {
    const mes = dayjs().subtract(mesOffset, 'month');
    const semanas = buildSemanasDelMes(mes.year(), mes.month() + 1);
    return { mesActual: mes, rango: rangoPeriodo(mesOffset, semanaKey, semanas) };
  }, [mesOffset, semanaKey]);

  const opcionesTipoSolicitud = [
    { value: 'Permiso',           label: 'Permiso' },
    { value: 'Botar turno',       label: 'Botar turno' },
    { value: 'Cobertura',         label: 'Cobertura' },
    { value: 'Intercambio',       label: 'Intercambio' },
    { value: 'Oferta particular', label: 'Oferta particular' },
    { value: 'Oferta general',    label: 'Oferta general' },
  ];

  const opcionesEstado = [
    { value: 'PENDIENTE',  label: 'Pendiente' },
    { value: 'APROBADA',   label: 'Aprobada' },
    { value: 'RECHAZADA',  label: 'Rechazada' },
    { value: 'CANCELADA',  label: 'Cancelada' },
  ];

  const opcionesEncargado = useMemo(() => {
    const set = new Set(eventos.map(e => e.nombreFuncionario).filter(Boolean));
    return Array.from(set).sort().map(n => ({ value: n, label: n }));
  }, [eventos]);

  // Eventos filtrados
  const eventosFiltrados = useMemo(() => {
    return eventos.filter(ev => {
      // Ocultar postulaciones
      if (ev.tipoEvento === 'POSTULACION_CREADA' || ev.tipoEvento === 'POSTULACION_RETIRADA') return false;
      // Filtro por período
      const fechaStr = fechaDeEvento(ev);
      if (fechaStr) {
        const ms = dayjs(fechaStr).valueOf();
        if (ms < rango.inicio.startOf('day').valueOf()) return false;
        if (ms > rango.fin.endOf('day').valueOf())     return false;
      }
      // Filtro por categoría (oferta general cuenta como solicitud aunque no tenga idSolicitud)
      const esOfertaGeneral = ev.tipoEvento?.startsWith('OFERTA_GENERAL');
      if (filtroCategoria === 'SOLICITUDES' && !ev.idSolicitud && !esOfertaGeneral) return false;
      if (filtroCategoria === 'TURNOS'      && (ev.idSolicitud || esOfertaGeneral))  return false;
      // Filtro por tipo de solicitud
      if (filtroTipoSolicitud) {
        if (filtroTipoSolicitud === 'Oferta general') {
          if (!ev.tipoEvento?.startsWith('OFERTA_GENERAL')) return false;
        } else {
          if (ev.tipoSolicitud !== filtroTipoSolicitud) return false;
        }
      }
      // Filtro por estado (derivado del tipoEvento)
      if (filtroEstado && estadoDesdeEvento(ev) !== filtroEstado) return false;
      // Filtro por encargado
      if (filtroEncargado && ev.nombreFuncionario !== filtroEncargado) return false;
      return true;
    });
  }, [eventos, rango, filtroCategoria, filtroTipoSolicitud, filtroEstado, filtroEncargado]);

  const filtrosActivos = [filtroCategoria, filtroTipoSolicitud, filtroEstado, filtroEncargado].filter(Boolean).length;

  // Desktop (R18): vista raíz del menú (sin volver). Los mismos filtros, a la
  // vista como selects; los mismos eventos filtrados en una tabla paginada y
  // el mismo bloque de detalle en un panel lateral.
  if (esDesktop) {
    const filas = eventosFiltrados.map((ev) => {
      const estado = estadoDesdeEvento(ev);
      const generacion = esGeneracionTurno(ev);
      return {
        id: ev.idEvento,
        fecha: fmtFechaHora(ev.fechaModificacion) || fmtFechaHora(ev.fechaInicioAfectada) || '—',
        etiqueta: labelEvento(ev),
        tono: TONO_DESKTOP[toneParaTipo(ev.tipoEvento || 'Evento')] || 'neutral',
        extra: generacion
          ? { texto: ev.nombreFuncionarioTurno || 'Libre', tono: ev.nombreFuncionarioTurno ? 'exito' : 'neutral' }
          : null,
        estado: estado ? { texto: estado, tono: TONO_DESKTOP[STATUS_TONE_MAP[estado]] || 'neutral' } : null,
        solicitante: ev.nombreFuncionarioEmisor || ev.nombreOferente || null,
        accionPor: ev.nombreFuncionario || null,
        evento: ev,
      };
    });
    const renderDetalle = (ev) => (esGeneracionTurno(ev) ? <BloqueGeneracionTurno ev={ev} /> : bloqueParaTipo(ev.tipoSolicitud, ev));
    const claveFiltros = [mesOffset, semanaKey, filtroCategoria, filtroTipoSolicitud, filtroEstado, filtroEncargado].join('|');
    const periodoTexto = semanaKey ? `${semanaKey} · ${mesActual.format('MMMM YYYY')}` : mesActual.format('MMMM YYYY');
    const limpiarFiltros = () => {
      setFiltroCategoria(null);
      setFiltroTipoSolicitud(null);
      setFiltroEstado(null);
      setFiltroEncargado(null);
    };
    const selectFiltro = (id, etiqueta, opciones, valor, onSelect) => (
      <CampoDesktop etiqueta={etiqueta} htmlFor={id}>
        <select
          id={id}
          className="sgt-d-select"
          value={valor ?? ''}
          disabled={loading}
          onChange={(e) => onSelect(e.target.value || null)}
        >
          <option value="">Todo</option>
          {opciones.map((op) => <option key={op.value} value={op.value}>{op.label}</option>)}
        </select>
      </CampoDesktop>
    );
    const nRegistros = eventosFiltrados.length;

    return (
      <>
        <EncabezadoDesktop
          titulo="Bitácora de Cambios"
          subtitulo="Registro cronológico de todos los eventos del sistema."
          acciones={<PeriodoDesktop mesOffset={mesOffset} setMesOffset={setMesOffset} semanaKey={semanaKey} setSemanaKey={setSemanaKey} />}
        />
        <PaginaDesktop llena>
          {error && <AvisoDesktop tono="alerta">{error}</AvisoDesktop>}
          {!error && (
            <PanelDesktop
              llena
              titulo="Registros"
              subtitulo={
                <span className="sgt-dg-mayus-cap" style={{ display: 'inline-block' }}>
                  {loading ? 'Cargando bitácora...' : `${nRegistros.toLocaleString('es-CL')} ${nRegistros === 1 ? 'registro' : 'registros'} · ${periodoTexto}`}
                  {filtrosActivos > 0 && ` · ${filtrosActivos} ${filtrosActivos === 1 ? 'filtro activo' : 'filtros activos'}`}
                </span>
              }
              icono="history"
              iconoColor="#6D28D9"
              iconoFondo="#EFEAFB"
              acciones={filtrosActivos > 0 && (
                <BotonDesktop tamano="sm" variante="fantasma" icono="close" onClick={limpiarFiltros}>Limpiar filtros</BotonDesktop>
              )}
              sinPadding
            >
              <div className="sgt-dg-filtros" style={{ padding: '10px 15px 12px', borderBottom: '1px solid var(--line2)' }}>
                {selectFiltro('bitacora-categoria', 'Categoría', [
                  { value: 'SOLICITUDES', label: 'Solicitudes' },
                  { value: 'TURNOS', label: 'Turnos' },
                ], filtroCategoria, setFiltroCategoria)}
                {selectFiltro('bitacora-tipo', 'Tipo de solicitud', opcionesTipoSolicitud, filtroTipoSolicitud, setFiltroTipoSolicitud)}
                {selectFiltro('bitacora-estado', 'Estado', opcionesEstado, filtroEstado, setFiltroEstado)}
                {selectFiltro('bitacora-encargado', 'Encargado', opcionesEncargado, filtroEncargado, setFiltroEncargado)}
              </div>
              <TablaBitacoraDesktop key={claveFiltros} filas={filas} cargando={loading} renderDetalle={renderDetalle} />
            </PanelDesktop>
          )}
        </PaginaDesktop>
      </>
    );
  }

  return (
    <div className="dash-page-bg" style={{ flex: 1, display: 'flex', flexDirection: 'column', animation: 'sgtSlideLeft .3s ease', overflow: 'hidden' }}>

      {/* Header */}
      <TopHeader
        title="Bitácora de Cambios"
        leftSlot={
          <button onClick={onBack} style={{ background: 'transparent', border: 'none', padding: 4, cursor: 'pointer', display: 'flex' }}>
            <SGTIcon name="chevron-left" size={24} color={p.ink} />
          </button>
        }
      />

      {/* Selector de período */}
      <div style={{ padding: '10px 14px', background: '#fff', borderBottom: `1px solid ${p.line2}` }}>
        <PeriodoSelector
          mesOffset={mesOffset} setMesOffset={setMesOffset}
          semanaKey={semanaKey}  setSemanaKey={setSemanaKey}
        />
      </div>

      {/* Panel de filtros */}
      {!loading && !error && (
        <div style={{ background: '#fff', borderBottom: `1px solid ${p.line2}` }}>
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
              <FilaFiltro
                label="Encargado"
                opciones={opcionesEncargado}
                valor={filtroEncargado}
                onSelect={setFiltroEncargado}
              />
            </div>
          )}
        </div>
      )}

      {/* Lista de eventos */}
      <div style={{ flex: 1, overflow: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {loading && <LoadingState label="Cargando bitácora..." />}
        {error && (
          <div style={{ background: p.accentSoft, border: '1px solid #F3D2D5', borderRadius: 12, padding: 14, fontSize: 13, color: '#8C3F44', fontWeight: 700 }}>
            {error}
          </div>
        )}
        {!loading && !error && eventosFiltrados.length === 0 && (
          <ListEmptyState
            icon="history" theme="slate"
            title="Sin registros"
            message="No hay eventos para mostrar con los filtros seleccionados."
          />
        )}
        {!loading && !error && eventosFiltrados.map(ev => (
          <EventoItem key={ev.idEvento} evento={ev} />
        ))}
      </div>
    </div>
  );
};

export default BitacoraView;
