import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { solicitudesService, turnosService, usuariosService, ofertasGeneralesService, serviciosService } from '../../services/adminService';
import { ofertaVisible, participaEnSolicitud, turnosComprometidos } from '../../utils/reglasSolicitud';
import { puedeTomarCupo, yaEmpezo } from '../../utils/reglasTurno';
import { ahoraISOEnZonaHospital, hoyISOEnZonaHospital } from '../../utils/dateUtils';
import { mensajeDeError } from '../../utils/errores';
import { SGT_DATA } from './data';
import { TopHeader, Sheet, SGTIcon, SGTBadge } from '../Style/UIPrimitives';
import { ListEmptyState, LoadingState } from '../Style/ListControls';
import '../Style/style.css';
import { useLayout } from '../../layout/layout';
import SolicitudesDesktop, { EditarMotivoDesktop } from '../Desktop/turnos/SolicitudesDesktop';
import NuevaSolicitudDesktop from '../Desktop/turnos/NuevaSolicitudDesktop';
import ConfirmacionDesktop from '../Desktop/turnos/ConfirmacionDesktop';

const PA = SGT_DATA.PALETTE;

// El 6 (oferta general) no es una solicitud: es el tipo del asistente que crea
// una oferta. Se nombra aquí para que su paso 2 diga «Oferta general» en el
// botón de volver (sin él, en móvil quedaba solo la flecha, sin nombre).
const TIPO_LABEL  = { 1: 'Permiso', 2: 'Botar turno', 3: 'Cobertura', 4: 'Intercambio', 5: 'Oferta particular', 6: 'Oferta general' };
// Tipos de las solicitudes propiamente tales (filtro por tipo en desktop).
const TIPOS_SOLICITUD = [1, 2, 3, 4, 5];
const TIPO_COLOR  = { 1: '#94B8E0', 2: '#D4888D', 3: '#88C4A8', 4: '#B89FD8', 5: '#E0B87A' };
const MESES_CORTO = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
const MESES_FULL  = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const TIPO_ICON  = { 1: 'calendar', 2: 'close', 3: 'hand-raised', 4: 'swap', 5: 'hand-raised' };
const ESTADO_TONE = { PENDIENTE: 'warn', APROBADA: 'success', RECHAZADA: 'accent' };

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtFecha(str) {
  if (!str) return '—';
  try {
    const s = String(str);
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
      const [y, m, d] = s.split('-').map(Number);
      return new Date(y, m - 1, d).toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' });
    }
    return new Date(String(str).replace(' ', 'T')).toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch { return str; }
}

function fmtHora(str) {
  if (!str) return '';
  return str.substring(0, 5);
}

// "2026-10-07" → "mié 7 oct 2026" (desktop: el día de la semana ayuda a ubicar el turno).
const DIAS_CORTOS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
function fmtFechaConDia(str) {
  const m = String(str || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return fmtFecha(str);
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return `${DIAS_CORTOS[d.getDay()]} ${fmtFecha(`${m[1]}-${m[2]}-${m[3]}`)}`;
}

function nombreFuncionario(f) {
  if (!f) return '—';
  return [f.nombre, f.apelPat, f.apelMat].filter(Boolean).join(' ');
}

function tipoLabel(s) {
  return TIPO_LABEL[s?.tipoSolicitud?.tipo] || 'Solicitud';
}

const Row = ({ label, value }) => (
  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 4 }}>
    <span style={{ fontSize: 11.5, fontWeight: 800, color: PA.ink3, width: 112, flexShrink: 0, textAlign: 'left' }}>{label}</span>
    <span style={{ fontSize: 12.5, color: PA.ink, fontWeight: 600, flex: 1, textAlign: 'left' }}>{value}</span>
  </div>
);

function btnStyle(tone) {
  if (tone === 'primary') return {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
    background: PA.primary, color: '#fff', border: 'none',
    borderRadius: 10, padding: '10px 14px', fontSize: 13, fontWeight: 700, cursor: 'pointer',
  };
  if (tone === 'accent') return {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
    background: PA.accentSoft, color: '#B85A60', border: '1px solid #F3D2D5',
    borderRadius: 10, padding: '10px 14px', fontSize: 13, fontWeight: 700, cursor: 'pointer',
  };
  if (tone === 'success') return {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
    background: PA.success, color: '#fff', border: 'none',
    borderRadius: 10, padding: '10px 14px', fontSize: 13, fontWeight: 700, cursor: 'pointer',
  };
  if (tone === 'danger') return {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
    background: '#D14343', color: '#fff', border: 'none',
    borderRadius: 10, padding: '10px 14px', fontSize: 13, fontWeight: 700, cursor: 'pointer',
  };
  return {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
    background: '#fff', color: PA.ink2, border: `1px solid ${PA.line}`,
    borderRadius: 10, padding: '10px 14px', fontSize: 13, fontWeight: 700, cursor: 'pointer',
  };
}

// ── Reglas compartidas por la presentación móvil y la desktop (R18) ───────────

// Texto que reemplaza a Aprobar y Rechazar cuando quien mira participa en la solicitud.
const NOTA_PARTICIPAS = 'Participas en esta solicitud: por segregación de funciones, la decisión corresponde a otra jefatura.';

// Estado de una solicitud para quien la mira: badge y qué puede hacer con ella.
function evaluarSolicitud(solicitud, { canDecide, esMiReceptor, esMiSolicitud, puedeEditarMotivo, puedeCancelar, userId }) {
  const tipo  = solicitud?.tipoSolicitud?.tipo;
  const estado = solicitud?.estado;

  const esBifasico = tipo === 4 || tipo === 5;
  const esperandoReceptor = esBifasico && solicitud.aceptadoReceptor == null;
  const receptorAcepto    = esBifasico && solicitud.aceptadoReceptor === true;
  const receptorRechazo   = esBifasico && solicitud.aceptadoReceptor === false;

  // Segregación de funciones: quien participa en la solicitud (emisor, receptor o
  // dueño de alguno de sus turnos) no la decide; el backend lo rechazaría
  // (SolicitudService.participantesDirectos). En vez de ofrecer Aprobar y
  // Rechazar, la vista lo explica. Igual en móvil y desktop.
  const decisionPosible = canDecide && estado === 'PENDIENTE' && !esperandoReceptor && !receptorRechazo;
  const participa = canDecide && participaEnSolicitud(solicitud, userId);
  const canDecideThis = decisionPosible && !participa;
  const bloqueadaPorParticipar = decisionPosible && participa;
  const canRespond    = esMiReceptor && esBifasico && esperandoReceptor && estado === 'PENDIENTE';
  const canEditMotivo = !canDecide && !esMiReceptor && estado === 'PENDIENTE' && puedeEditarMotivo;
  // Cancelar la propia solicitud pendiente: es lo que libera el turno comprometido para
  // poder pedir otra cosa sobre él (el backend bloquea mientras siga pendiente). El gate
  // es por IDENTIDAD (soy el emisor), no por rol: una jefatura que emitió una solicitud
  // no puede resolverla (segregación de funciones) pero SÍ debe poder cancelarla, o su
  // turno quedaría comprometido hasta que otra jefatura la toque.
  const canCancelar = Boolean(esMiSolicitud) && estado === 'PENDIENTE' && puedeCancelar;
  // Cancelada por el propio solicitante: mismo estado RECHAZADA en la base, pero el badge
  // no debe confundirse con un rechazo de jefatura.
  const esCancelada = estado === 'RECHAZADA' && String(solicitud.motivo || '').startsWith('Cancelada por el solicitante');

  // Badge contextual para tipos bifásicos (4 y 5)
  let badgeLabel = esCancelada ? 'CANCELADA' : estado;
  let badgeTone  = esCancelada ? 'neutral' : (ESTADO_TONE[estado] || 'neutral');
  if (esBifasico && estado === 'PENDIENTE') {
    if (esMiReceptor && esperandoReceptor) {
      badgeLabel = 'Requiere tu respuesta';
      badgeTone  = 'warn';
    } else if (esMiReceptor && receptorAcepto) {
      badgeLabel = 'Aceptada · Pend. jefatura';
      badgeTone  = 'neutral';
    } else if (!esMiReceptor && receptorAcepto) {
      badgeLabel = 'Pend. jefatura';
      badgeTone  = 'neutral';
    }
  }

  return {
    tipo, estado, esBifasico, esperandoReceptor, receptorAcepto, receptorRechazo,
    canDecideThis, bloqueadaPorParticipar, canRespond, canEditMotivo, canCancelar, esCancelada, badgeLabel, badgeTone,
  };
}

// Filas de datos de una solicitud (qué se muestra y con qué etiqueta).
function filasSolicitud(solicitud) {
  const tipo = solicitud?.tipoSolicitud?.tipo;
  const filas = [{ clase: 'persona', label: 'Solicitante', persona: solicitud.funcionario }];
  if (solicitud.funcionarioReceptor) filas.push({ clase: 'persona', label: 'Receptor', persona: solicitud.funcionarioReceptor });
  if (solicitud.turno) {
    filas.push({
      clase: 'turno',
      label: tipo === 2 ? 'Turno a liberar' : tipo === 3 ? 'Turno a cubrir' : tipo === 4 ? 'Turno a recibir' : tipo === 5 ? 'Turno ofrecido' : 'Turno',
      turno: solicitud.turno,
    });
  }
  if (solicitud.turnoReceptor) filas.push({ clase: 'turno', label: 'Turno a entregar', turno: solicitud.turnoReceptor });
  if (solicitud.fechaInicioPermiso) filas.push({ clase: 'periodo', label: 'Período', desde: solicitud.fechaInicioPermiso, hasta: solicitud.fechaTerminoPermiso });
  return filas;
}

// Texto de una fila tal como lo muestra la tarjeta móvil.
function valorFilaMovil(f) {
  if (f.clase === 'persona') return nombreFuncionario(f.persona);
  if (f.clase === 'turno') return `${fmtFecha(f.turno.diaInicioTurno)}  ${fmtHora(f.turno.horaInicio)}–${fmtHora(f.turno.horaFin)}`;
  return `${fmtFecha(f.desde)} → ${fmtFecha(f.hasta)}`;
}

// R10 — datos del turno en disputa y postulantes por orden de llegada.
function datosGrupoPostulacion(grupo) {
  const turno = grupo[0]?.turno || {};
  return {
    turno,
    nombreTipoTurno: turno.tipoTurno?.nombre || null,
    posicion: turno.puesto?.nombre || null,
    ordenadas: [...grupo].sort((a, b) => new Date(a.fechaCreacion) - new Date(b.fechaCreacion)),
  };
}

// Estado de una oferta general para quien la mira.
function evaluarOferta(oferta, userId, canDecide) {
  const estado = oferta?.estado;
  const esOfertor = String(oferta?.ofertor?.idFuncionario) === String(userId);
  const miPostulacion = oferta?.postulaciones?.find(p => String(p.postulante?.idFuncionario) === String(userId));
  const postulaciones = oferta?.postulaciones || [];
  return {
    estado,
    esOfertor,
    miPostulacion,
    yaPostulado: !!miPostulacion,
    postulaciones,
    seleccionado: postulaciones.find(p => p.seleccionado),
    badgeTone: estado === 'ABIERTA' ? 'success' : estado === 'PENDIENTE_APROBACION' ? 'warn' : estado === 'CERRADA' ? 'neutral' : 'accent',
    badgeLabel: estado === 'PENDIENTE_APROBACION' ? 'Pend. apertura' : estado === 'ABIERTA' ? 'Abierta' : estado === 'CERRADA' ? 'Cerrada' : 'Rechazada',
    puedeDecidirApertura: canDecide && estado === 'PENDIENTE_APROBACION',
    puedeSeleccionar: canDecide && estado === 'ABIERTA',
    puedePostularORetirar: !canDecide && !esOfertor && estado === 'ABIERTA',
    esMiOfertaAbierta: !canDecide && esOfertor && estado === 'ABIERTA',
  };
}

// ── SolicitudCard ─────────────────────────────────────────────────────────────

// R10 — Tarjeta de POSTULACIONES AGRUPADAS: 2+ solicitudes de Cobertura PENDIENTES
// sobre el MISMO turno se presentan como una sola disputa, y la jefatura elige a la
// persona. Al aprobar una, el backend rechaza automáticamente a las demás
// (rechazarSolicitudesCompetitivas), así que aquí no hay lógica extra de limpieza.
const PostulacionesGrupoCard = ({ grupo, onAprobar, onRechazar, userId }) => {
  const { turno, nombreTipoTurno, posicion, ordenadas } = datosGrupoPostulacion(grupo);

  return (
    <div className="sgt-list-row" style={{ background: '#fff', border: `1px solid ${PA.line}`, borderLeft: `4px solid ${TIPO_COLOR[3]}`, borderRadius: 14, padding: 14, marginBottom: 10 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <div style={{ width: 38, height: 38, borderRadius: 10, background: PA.primarySoft, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
          <SGTIcon name="users" size={18} color={PA.primary} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: PA.ink }}>Postulaciones al mismo turno</div>
          <div style={{ fontSize: 11, color: PA.ink3, fontWeight: 600 }}>Cobertura · elige a una persona</div>
        </div>
        <SGTBadge tone="warn" size="xs">{grupo.length} postulantes</SGTBadge>
      </div>

      {/* Turno en disputa */}
      <Row
        label="Turno a cubrir"
        value={`${fmtFecha(turno.diaInicioTurno)} · ${fmtHora(turno.horaInicio)}–${fmtHora(turno.horaFin)}${nombreTipoTurno ? ` · ${nombreTipoTurno}` : ''}`}
      />
      {posicion && <Row label="Posición" value={posicion} />}

      {/* Postulantes */}
      <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {ordenadas.map((sol) => (
          <div key={sol.idSolicitud} style={{ border: `1px solid ${PA.line2}`, borderRadius: 10, padding: '8px 10px', background: PA.surface2 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12.5, fontWeight: 800, color: PA.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {nombreFuncionario(sol.funcionario)}
                </div>
                <div style={{ fontSize: 10.5, color: PA.ink3, fontWeight: 600 }}>Postuló el {fmtFecha(sol.fechaCreacion)}</div>
              </div>
              {participaEnSolicitud(sol, userId) ? (
                // Su propia postulación: la decide otra jefatura (segregación de funciones).
                <SGTBadge tone="neutral" size="xs">Tu postulación</SGTBadge>
              ) : (
                <>
                  <button onClick={() => onRechazar(sol.idSolicitud)} aria-label={`Rechazar a ${nombreFuncionario(sol.funcionario)}`} style={{ ...btnStyle('danger'), padding: '7px 10px', fontSize: 12 }}>
                    <SGTIcon name="close" size={12} color="#fff" />
                  </button>
                  <button onClick={() => onAprobar(sol.idSolicitud)} style={{ ...btnStyle('success'), padding: '7px 12px', fontSize: 12 }}>
                    <SGTIcon name="check" size={12} color="#fff" /> Elegir
                  </button>
                </>
              )}
            </div>
            {sol.motivo && (
              <div style={{ marginTop: 5, fontSize: 11.5, color: PA.ink2, fontWeight: 600, fontStyle: 'italic' }}>
                “{sol.motivo}”
              </div>
            )}
          </div>
        ))}
      </div>

      <div style={{ marginTop: 10, fontSize: 11, color: PA.ink3, fontWeight: 600 }}>
        Al elegir a una persona, las demás postulaciones de este turno se rechazan automáticamente.
      </div>
    </div>
  );
};

const SolicitudCard = ({ solicitud, canDecide, onAprobar, onRechazar, onEditMotivo, onResponderIntercambio, onResponderOfertaParticular, onCancelar, esMiReceptor, esMiSolicitud, userId }) => {
  const {
    tipo, estado, esperandoReceptor, receptorRechazo,
    canDecideThis, bloqueadaPorParticipar, canRespond, canEditMotivo, canCancelar, badgeLabel, badgeTone,
  } = evaluarSolicitud(solicitud, {
    canDecide, esMiReceptor, esMiSolicitud, puedeEditarMotivo: !!onEditMotivo, puedeCancelar: !!onCancelar, userId,
  });

  return (
    <div className="sgt-list-row" style={{ background: '#fff', border: `1px solid ${PA.line}`, borderLeft: `4px solid ${TIPO_COLOR[tipo] || PA.line}`, borderRadius: 14, padding: 14, marginBottom: 10 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <div style={{ width: 38, height: 38, borderRadius: 10, background: PA.primarySoft, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
          <SGTIcon name={TIPO_ICON[tipo] || 'alert'} size={18} color={PA.primary} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: PA.ink }}>{tipoLabel(solicitud)}</div>
          <div style={{ fontSize: 11, color: PA.ink3, fontWeight: 600 }}>{fmtFecha(solicitud.fechaCreacion)}</div>
        </div>
        <SGTBadge tone={badgeTone} size="xs">{badgeLabel}</SGTBadge>
      </div>

      {/* Datos */}
      {filasSolicitud(solicitud).map((f) => (
        <Row key={f.label} label={f.label} value={valorFilaMovil(f)} />
      ))}

      {/* Motivo */}
      <div style={{ marginTop: 8, background: PA.surface2, borderRadius: 8, padding: '8px 10px' }}>
        <div style={{ fontSize: 10.5, fontWeight: 800, color: PA.ink3, marginBottom: 3, textTransform: 'uppercase', letterSpacing: 0.4 }}>Motivo</div>
        <div style={{ fontSize: 13, color: PA.ink, fontWeight: 600, lineHeight: 1.45 }}>{solicitud.motivo || '—'}</div>
      </div>

      {/* Badges de estado intercambio */}
      {esperandoReceptor && estado === 'PENDIENTE' && !esMiReceptor && (
        <div style={{ marginTop: 8, padding: '6px 10px', background: PA.warnSoft, borderRadius: 8, fontSize: 12, color: PA.warn, fontWeight: 700 }}>
          ⏳ Esperando respuesta del receptor
        </div>
      )}
      {receptorRechazo && (
        <div style={{ marginTop: 8, padding: '6px 10px', background: PA.accentSoft, borderRadius: 8, fontSize: 12, color: '#B85A60', fontWeight: 700 }}>
          ✕ Receptor rechazó el intercambio
        </div>
      )}

      {bloqueadaPorParticipar && (
        <div style={{ marginTop: 8, padding: '6px 10px', background: PA.primarySoft, borderRadius: 8, fontSize: 12, color: PA.primary, fontWeight: 700, lineHeight: 1.4 }}>
          {NOTA_PARTICIPAS}
        </div>
      )}

      {/* Acciones jefatura/subrogante */}
      {canDecideThis && (
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <button onClick={() => onRechazar(solicitud.idSolicitud)} style={btnStyle('danger')}>
            <SGTIcon name="close" size={13} color="#fff" /> Rechazar
          </button>
          <button onClick={() => onAprobar(solicitud.idSolicitud)} style={{ ...btnStyle('success'), flex: 1 }}>
            <SGTIcon name="check" size={13} color="#fff" /> Aprobar
          </button>
        </div>
      )}

      {/* Acciones receptor intercambio (tipo 4) */}
      {canRespond && tipo === 4 && (
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <button onClick={() => onResponderIntercambio(solicitud.idSolicitud, false)} style={btnStyle('danger')}>
            <SGTIcon name="close" size={13} color="#fff" /> Rechazar
          </button>
          <button onClick={() => onResponderIntercambio(solicitud.idSolicitud, true)} style={{ ...btnStyle('success'), flex: 1 }}>
            <SGTIcon name="check" size={13} color="#fff" /> Aceptar
          </button>
        </div>
      )}

      {/* Acciones receptor oferta particular (tipo 5) */}
      {canRespond && tipo === 5 && (
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <button onClick={() => onResponderOfertaParticular(solicitud.idSolicitud, false)} style={btnStyle('danger')}>
            <SGTIcon name="close" size={13} color="#fff" /> Rechazar
          </button>
          <button onClick={() => onResponderOfertaParticular(solicitud.idSolicitud, true)} style={{ ...btnStyle('success'), flex: 1 }}>
            <SGTIcon name="check" size={13} color="#fff" /> Aceptar
          </button>
        </div>
      )}

      {/* Editar motivo (médico, solicitud propia PENDIENTE) */}
      {canEditMotivo && (
        <button onClick={() => onEditMotivo(solicitud)} style={{ ...btnStyle('ghost'), marginTop: 10, width: '100%' }}>
          <SGTIcon name="sliders" size={14} color={PA.ink2} /> Modificar motivo
        </button>
      )}

      {canCancelar && (
        <button onClick={() => onCancelar(solicitud)} style={{ ...btnStyle('danger'), marginTop: 8, width: '100%' }}>
          <SGTIcon name="close" size={13} color="#fff" /> Cancelar solicitud
        </button>
      )}
    </div>
  );
};

// ── OfertaGeneralCard ─────────────────────────────────────────────────────────

const COLOR_OFERTA = '#E0A040';
const COLOR_OFERTA_SOFT = '#FDF3E3';

const OfertaGeneralCard = ({ oferta, userId, canDecide, onAprobar, onRechazar, onPostular, onRetirar, onSeleccionar }) => {
  const {
    estado, miPostulacion, yaPostulado, postulaciones, seleccionado, badgeTone, badgeLabel,
    puedeDecidirApertura, puedeSeleccionar, puedePostularORetirar, esMiOfertaAbierta,
  } = evaluarOferta(oferta, userId, canDecide);

  const [confirmando, setConfirmando] = useState(null); // { idPostulacion, nombrePostulante }

  return (
    <div className="sgt-list-row" style={{ background: '#fff', border: `1px solid ${COLOR_OFERTA}`, borderLeft: `4px solid ${COLOR_OFERTA}`, borderRadius: 14, padding: 14, marginBottom: 10 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <div style={{ width: 38, height: 38, borderRadius: 10, background: COLOR_OFERTA_SOFT, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
          <SGTIcon name="hand-raised" size={18} color={COLOR_OFERTA} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: PA.ink }}>Oferta general</div>
          <div style={{ fontSize: 11, color: PA.ink3, fontWeight: 600 }}>{fmtFecha(oferta.fechaCreacion)}</div>
        </div>
        <SGTBadge tone={badgeTone} size="xs">
          {badgeLabel}
        </SGTBadge>
      </div>

      {/* Datos */}
      <Row label="Ofertor" value={nombreFuncionario(oferta.ofertor)} />
      {oferta.turno && (
        <Row label="Turno ofertado" value={`${fmtFecha(oferta.turno.diaInicioTurno)}  ${fmtHora(oferta.turno.horaInicio)}–${fmtHora(oferta.turno.horaFin)}`} />
      )}
      {estado === 'CERRADA' && seleccionado && (
        <Row label="Asignado a" value={nombreFuncionario(seleccionado.postulante)} />
      )}
      <div style={{ marginTop: 8, background: PA.surface2, borderRadius: 8, padding: '8px 10px' }}>
        <div style={{ fontSize: 10.5, fontWeight: 800, color: PA.ink3, marginBottom: 3, textTransform: 'uppercase', letterSpacing: 0.4 }}>Motivo</div>
        <div style={{ fontSize: 13, color: PA.ink, fontWeight: 600, lineHeight: 1.45 }}>{oferta.motivo || '—'}</div>
      </div>

      {/* Jefatura: aprobar/rechazar si pendiente */}
      {puedeDecidirApertura && (
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <button onClick={() => onRechazar(oferta.idOfertaGeneral)} style={btnStyle('danger')}>
            <SGTIcon name="close" size={13} color="#fff" /> Rechazar
          </button>
          <button onClick={() => onAprobar(oferta.idOfertaGeneral)} style={{ ...btnStyle('success'), flex: 1 }}>
            <SGTIcon name="check" size={13} color="#fff" /> Aprobar
          </button>
        </div>
      )}

      {/* Jefatura: lista de postulantes si abierta */}
      {puedeSeleccionar && (
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: PA.ink3, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 6 }}>
            Postulantes ({postulaciones.length})
          </div>
          {postulaciones.length === 0 && (
            <div style={{ fontSize: 13, color: PA.ink3, fontWeight: 600 }}>Sin postulantes aún.</div>
          )}
          {postulaciones.map(p => (
            <div key={p.idPostulacion} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', background: PA.surface2, borderRadius: 8, marginBottom: 6 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: PA.ink }}>{nombreFuncionario(p.postulante)}</div>
              <button
                onClick={() => setConfirmando({ idPostulacion: p.idPostulacion, nombrePostulante: nombreFuncionario(p.postulante) })}
                style={{ background: COLOR_OFERTA, color: '#fff', border: 'none', borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 800, cursor: 'pointer' }}
              >
                Seleccionar
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Médico: postular / retirar */}
      {puedePostularORetirar && (
        <div style={{ marginTop: 12 }}>
          {!yaPostulado ? (
            <button onClick={() => onPostular(oferta.idOfertaGeneral)} style={{ ...btnStyle('primary'), width: '100%' }}>
              <SGTIcon name="hand-raised" size={13} color="#fff" /> Postular
            </button>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <SGTBadge tone="success" size="xs">Postulado</SGTBadge>
              <button onClick={() => onRetirar(oferta.idOfertaGeneral, miPostulacion.idPostulacion)} style={btnStyle('accent')}>
                <SGTIcon name="close" size={13} color="#B85A60" /> Retirar
              </button>
            </div>
          )}
        </div>
      )}

      {/* Médico ofertor: indicar que está en proceso */}
      {esMiOfertaAbierta && (
        <div style={{ marginTop: 8, padding: '6px 10px', background: COLOR_OFERTA_SOFT, borderRadius: 8, fontSize: 12, color: COLOR_OFERTA, fontWeight: 700 }}>
          Tu oferta está abierta · {postulaciones.length} postulante{postulaciones.length !== 1 ? 's' : ''}
        </div>
      )}

      {/* Diálogo de confirmación selección */}
      <Sheet open={!!confirmando} onClose={() => setConfirmando(null)} title="Confirmar selección">
        <div style={{ padding: '8px 16px 32px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <p style={{ fontSize: 14, color: PA.ink, fontWeight: 600, lineHeight: 1.5, margin: 0 }}>
            Se asignará el turno de <strong>{nombreFuncionario(oferta.ofertor)}</strong> a <strong>{confirmando?.nombrePostulante}</strong>.
          </p>
          {oferta.turno && (
            <div style={{ background: PA.surface2, borderRadius: 10, padding: '10px 14px', fontSize: 13, color: PA.ink2, fontWeight: 600 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: PA.ink3, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 4 }}>Turno</div>
              <div>{fmtFecha(oferta.turno.diaInicioTurno)}</div>
              <div style={{ color: PA.ink3 }}>{fmtHora(oferta.turno.horaInicio)} – {fmtHora(oferta.turno.horaFin)}</div>
            </div>
          )}
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setConfirmando(null)} style={{ ...btnStyle('ghost'), flex: 1 }}>Cancelar</button>
            <button
              onClick={() => { onSeleccionar(oferta.idOfertaGeneral, confirmando.idPostulacion); setConfirmando(null); }}
              style={{ ...btnStyle('primary'), flex: 1 }}
            >
              <SGTIcon name="check" size={13} color="#fff" /> Confirmar
            </button>
          </div>
        </div>
      </Sheet>
    </div>
  );
};

// ── CrearSolicitudSheet ───────────────────────────────────────────────────────

const SIN_TURNOS = new Set();

// R15: el turno propio de un intercambio ya está en otra solicitud pendiente de
// quien pide. /turnos/intercambiables devuelve entonces una lista vacía sin decir
// por qué; el asistente lo sabe por las solicitudes propias y lo dice.
const NOTA_PROPIO_COMPROMETIDO = 'No hay turnos intercambiables con el que elegiste: ese turno ya está comprometido en otra solicitud pendiente tuya. Cancélala desde Solicitudes para proponer este intercambio.';
const ERROR_PROPIO_COMPROMETIDO = 'El turno que ofreces entregar ya está comprometido en otra solicitud pendiente tuya. Cancélala desde Solicitudes para crear esta.';
const NOTA_SIN_INTERCAMBIABLES = 'No hay turnos intercambiables con el que elegiste: el turno que entregas ya empezó o está comprometido en otra solicitud tuya, esa persona no tiene turnos futuros de este servicio, o el canje dejaría turnos incompatibles.';

// turnosComprometidos: ids (texto) de los turnos que quien pide ya comprometió en
// sus solicitudes pendientes (utils/reglasSolicitud.js, turnosComprometidos).
const CrearSolicitudSheet = ({ open, onClose, userId, servicioId, onCreated, initialPreset, turnosComprometidos: comprometidos = SIN_TURNOS }) => {
  const { esDesktop } = useLayout();
  const [step, setStep]         = useState(1); // 1=tipo, 2=form, 3=picker
  const [tipoSel, setTipoSel]   = useState(null);
  const [form, setForm]         = useState({});
  const [misTurnos, setMisTurnos]         = useState([]);
  const [turnosLibres, setTurnosLibres]   = useState([]);
  const [funcionarios, setFuncionarios]   = useState([]);
  const [turnosReceptor, setTurnosReceptor] = useState([]);
  const [pickerKey, setPickerKey] = useState(null);
  const [dpStep, setDpStep]     = useState('year'); // 'year' | 'month' | 'day'
  const [dpYear, setDpYear]     = useState(null);
  const [dpMonth, setDpMonth]   = useState(null);
  const [loading, setLoading]   = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [loadingReceptor, setLoadingReceptor] = useState(false);
  const [error, setError]       = useState(null);

  useEffect(() => {
    if (!open || !initialPreset) return;

    setStep(initialPreset.tipoSolicitudId ? 2 : 1);
    setTipoSel(initialPreset.tipoSolicitudId || null);
    setForm((prev) => ({
      ...prev,
      ...(initialPreset.idReceptor != null ? { idReceptor: initialPreset.idReceptor, receptorLabel: initialPreset.receptorLabel || null } : null),
      ...(initialPreset.idTurno != null ? { idTurno: initialPreset.idTurno, turnoLabel: initialPreset.turnoLabel || null } : null),
      ...(initialPreset.idTurnoPropio != null ? { idTurnoPropio: initialPreset.idTurnoPropio, turnoPropioLabel: initialPreset.turnoPropioLabel || null } : null),
      ...(initialPreset.idTurnoDeseado != null ? { idTurnoDeseado: initialPreset.idTurnoDeseado, turnoDeseadoLabel: initialPreset.turnoDeseadoLabel || null } : null),
    }));
  }, [open, initialPreset]);

  useEffect(() => {
    if (!open || !tipoSel || step !== 2) return;
    setLoadingData(true);
    const fetches = [];
    if (tipoSel === 2 || tipoSel === 4 || tipoSel === 5 || tipoSel === 6)
      // getFuturos y no getByMedico: liberar, ofrecer o entregar un turno YA PASADO no tiene
      // sentido y además ensuciaba el picker con todo el historial de la persona.
      fetches.push(turnosService.getFuturos(userId).then(d => setMisTurnos(Array.isArray(d) ? d : [])).catch(() => {}));
    if (tipoSel === 3)
      // Solo los cupos que se pueden tomar, con la misma regla que «Disponibles»
      // (utils/reglasTurno.js, puedeTomarCupo): fuera los de un bloque donde ya
      // trabaja y los que chocan con sus turnos (solape o R13, en los dos
      // sentidos). Se compara con todos sus turnos, de cualquier servicio, como
      // el backend; si no se pueden traer, el selector no filtra por ellos.
      fetches.push(Promise.all([
        turnosService.getSinAsignar(servicioId),
        turnosService.getByMedico(userId).catch(() => []),
      ]).then(([libres, mios]) => {
        const misTurnos = Array.isArray(mios) ? mios : [];
        // C-16: el mismo filtro de vigencia que las ofertas: fuera los cupos que ya empezaron.
        const ahora = ahoraISOEnZonaHospital();
        setTurnosLibres((Array.isArray(libres) ? libres : [])
          .filter((cupo) => !yaEmpezo(cupo, ahora) && puedeTomarCupo(cupo, misTurnos)));
      }).catch(() => {}));
    if (tipoSel === 4 || tipoSel === 5)
      fetches.push(usuariosService.getAll(servicioId).then(d => {
        const lista = (Array.isArray(d) ? d : [])
          .filter(f => String(f.idFuncionario) !== String(userId))
          .sort((a, b) => {
            const na = [a.nombre, a.apellidoPaterno].filter(Boolean).join(' ');
            const nb = [b.nombre, b.apellidoPaterno].filter(Boolean).join(' ');
            return na.localeCompare(nb, 'es');
          });
        setFuncionarios(lista);
      }).catch(() => {}));
    Promise.all(fetches).finally(() => setLoadingData(false));
  }, [open, tipoSel, step, userId, servicioId]);

  // Turnos del receptor ofrecidos en el picker de intercambio. Con el turno propio ya elegido
  // se piden los INTERCAMBIABLES (el backend descarta pasados, choques, "24 invertido" para
  // ambos, otros servicios y turnos ya comprometidos); sin él no hay canje que validar, así
  // que se cae a los turnos futuros de esa persona.
  useEffect(() => {
    if (!form.idReceptor) { setTurnosReceptor([]); return; }
    let vigente = true;
    setTurnosReceptor([]);          // nunca servir la lista del receptor/turno anterior
    setLoadingReceptor(true);
    const peticion = form.idTurnoPropio
      ? turnosService.getIntercambiables(form.idTurnoPropio, form.idReceptor)
      : turnosService.getFuturos(form.idReceptor);
    peticion
      .then(d => {
        if (!vigente) return;
        const lista = Array.isArray(d) ? d : [];
        setTurnosReceptor(lista);
        // Una preselección (p. ej. del preset de la agenda) que ya no es intercambiable
        // se purga: dejarla "seleccionada" anularía el filtrado justo donde más importa.
        setForm(prev => (
          prev.idTurnoDeseado != null && !lista.some(t => String(t.id) === String(prev.idTurnoDeseado))
            ? { ...prev, idTurnoDeseado: undefined, turnoDeseadoLabel: null }
            : prev
        ));
      })
      .catch(() => { if (vigente) setTurnosReceptor([]); })
      .finally(() => { if (vigente) setLoadingReceptor(false); });
    return () => { vigente = false; };
  }, [form.idReceptor, form.idTurnoPropio]);

  const reset = () => { setStep(1); setTipoSel(null); setForm({}); setError(null); setPickerKey(null); setDpStep('year'); setDpYear(null); setDpMonth(null); setMisTurnos([]); setTurnosLibres([]); setFuncionarios([]); setTurnosReceptor([]); };
  const handleClose = () => { reset(); onClose(); };

  const buildDTO = () => {
    const base = { idFuncionario: Number(userId), idTipoSolicitud: tipoSel, motivo: form.motivo };
    if (tipoSel === 1) {
      if (!form.fechaInicio || !form.fechaFin) return null;
      return { ...base, fechaInicioPermiso: form.fechaInicio + 'T00:00:00', fechaTerminoPermiso: form.fechaFin + 'T00:00:00' };
    }
    if (tipoSel === 2) { if (!form.idTurno) return null; return { ...base, idTurno: Number(form.idTurno) }; }
    if (tipoSel === 3) { if (!form.idTurno) return null; return { ...base, idTurno: Number(form.idTurno) }; }
    if (tipoSel === 4) {
      if (!form.idTurnoDeseado || !form.idTurnoPropio || !form.idReceptor) return null;
      return { ...base, idTurno: Number(form.idTurnoDeseado), idTurnoIntercambio: Number(form.idTurnoPropio), idFuncionarioReceptor: Number(form.idReceptor) };
    }
    if (tipoSel === 5) {
      if (!form.idTurno || !form.idReceptor) return null;
      return { ...base, idTurno: Number(form.idTurno), idFuncionarioReceptor: Number(form.idReceptor) };
    }
    return null;
  };

  const propioComprometido = tipoSel === 4 && form.idTurnoPropio != null && comprometidos.has(String(form.idTurnoPropio));
  const notaSinIntercambiables = propioComprometido ? NOTA_PROPIO_COMPROMETIDO : NOTA_SIN_INTERCAMBIABLES;

  const handleSubmit = async () => {
    setLoading(true); setError(null);
    try {
      if (propioComprometido) { setError(ERROR_PROPIO_COMPROMETIDO); setLoading(false); return; }
      if (tipoSel === 6) {
        if (!form.idTurno) { setError('Rellena todos los campos requeridos.'); setLoading(false); return; }
        await ofertasGeneralesService.crear({ idFuncionario: Number(userId), idTurno: Number(form.idTurno), motivo: form.motivo });
      } else {
        const dto = buildDTO();
        if (!dto) { setError('Rellena todos los campos requeridos.'); setLoading(false); return; }
        await solicitudesService.crear(dto);
      }
      onCreated?.(); handleClose();
    } catch (e) { setError(mensajeDeError(e, 'No se pudo crear la solicitud.')); }
    finally { setLoading(false); }
  };

  // ── Pickers config ────────────────────────────────────────────────────────
  const turnoRow = (t) => (
    <div>
      <div style={{ fontSize: 13, fontWeight: 800, color: PA.ink }}>{fmtFecha(t.diaInicioTurno)}</div>
      <div style={{ fontSize: 12, color: PA.ink3, fontWeight: 600 }}>{fmtHora(t.horaInicio)}–{fmtHora(t.horaFin)}{t.nombre ? ` · ${t.nombre}` : ''}</div>
    </div>
  );
  const funcRow = (f) => (
    <div>
      <div style={{ fontSize: 13, fontWeight: 800, color: PA.ink }}>{[f.nombre, f.apellidoPaterno, f.apellidoMaterno].filter(Boolean).join(' ')}</div>
      <div style={{ fontSize: 12, color: PA.ink3, fontWeight: 600 }}>{f.rutCompleto || f.rut}</div>
    </div>
  );

  const PICKERS = {
    turnoOfertaGeneral: { title: 'Tu turno a ofrecer', items: misTurnos,                  keyFn: t => t.id,           row: turnoRow, onSel: t => setForm(f => ({ ...f, idTurno: t.id, turnoLabel: null })) },
    turnoOferta:    { title: 'Tu turno a ofrecer',      items: misTurnos,                  keyFn: t => t.id,           row: turnoRow, onSel: t => setForm(f => ({ ...f, idTurno: t.id, turnoLabel: null })) },
    receptorOferta: { title: 'Funcionario destinatario', items: funcionarios,               keyFn: f => f.idFuncionario, row: funcRow,  onSel: f => setForm(prev => ({ ...prev, idReceptor: f.idFuncionario })) },
    turnoBotar:     { title: 'Turno a liberar',        items: misTurnos,                  keyFn: t => t.id,           row: turnoRow, onSel: t => setForm(f => ({ ...f, idTurno: t.id, turnoLabel: null })) },
    turnoCobertura: { title: 'Turno a cubrir',          items: turnosLibres,                keyFn: t => t.id,           row: turnoRow, onSel: t => setForm(f => ({ ...f, idTurno: t.id, turnoLabel: null })) },
    turnoPropio:    { title: 'Tu turno a entregar',     items: misTurnos,                  keyFn: t => t.id,           row: turnoRow, onSel: t => setForm(f => ({ ...f, idTurnoPropio: t.id, turnoPropioLabel: null, idTurnoDeseado: undefined, turnoDeseadoLabel: null })) },
    receptor:       { title: 'Funcionario receptor',    items: funcionarios,                keyFn: f => f.idFuncionario, row: funcRow,  onSel: f => setForm(prev => ({ ...prev, idReceptor: f.idFuncionario, idTurnoDeseado: undefined, turnoDeseadoLabel: null })) },
    turnoDeseado:   { title: 'Turno del receptor',      items: turnosReceptor,             keyFn: t => t.id,           row: turnoRow, onSel: t => setForm(f => ({ ...f, idTurnoDeseado: t.id, turnoDeseadoLabel: null })) },
    fechaInicio:    { title: 'Fecha de inicio',  isDatePicker: true, onSel: (s) => setForm(prev => ({ ...prev, fechaInicio: s, fechaFin: prev.fechaFin && prev.fechaFin < s ? undefined : prev.fechaFin })) },
    fechaFin:       { title: 'Fecha de término', isDatePicker: true, onSel: (s) => setForm(prev => ({ ...prev, fechaFin: s })) },
  };

  const openPicker = (key) => {
    setPickerKey(key);
    if (PICKERS[key]?.isDatePicker) { setDpStep('year'); setDpYear(null); setDpMonth(null); }
    setStep(3);
  };
  const activePicker = pickerKey ? PICKERS[pickerKey] : null;

  const sheetTitle = (() => {
    if (step !== 3 || !activePicker) return 'Nueva solicitud';
    if (!activePicker.isDatePicker) return activePicker.title;
    if (dpStep === 'year')  return activePicker.title;
    if (dpStep === 'month') return String(dpYear);
    return `${MESES_FULL[dpMonth - 1]} ${dpYear}`;
  })();

  // ── Labels para mostrar selección ─────────────────────────────────────────
  const turnoLabel = (list, id, fallback = null) => { const t = list.find(x => String(x.id) === String(id)); return t ? `${fmtFecha(t.diaInicioTurno)} ${fmtHora(t.horaInicio)}–${fmtHora(t.horaFin)}` : fallback; };
  const funcLabel  = (id, fallback = null) => { const f = funcionarios.find(x => String(x.idFuncionario) === String(id)); return f ? [f.nombre, f.apellidoPaterno].filter(Boolean).join(' ') : fallback; };

  const PickerBtn = ({ label, value, pkey }) => (
    <button onClick={() => openPicker(pkey)} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderRadius: 10, border: `1px solid ${value ? PA.primary : PA.line}`, background: '#fff', cursor: 'pointer' }}>
      <span style={{ fontSize: 14, color: value ? PA.ink : PA.ink3, fontWeight: value ? 700 : 500 }}>{value || label}</span>
      <SGTIcon name="chevron-right" size={16} color={PA.ink3} />
    </button>
  );

  const tipos = [
    { id: 1, label: 'Permiso',            desc: 'Solicitar un permiso o licencia',                    icon: 'calendar'    },
    { id: 2, label: 'Botar turno',        desc: 'Liberar un turno ya asignado',                       icon: 'close'       },
    { id: 3, label: 'Cobertura',          desc: 'Ofrecerse a cubrir un turno disponible',             icon: 'hand-raised' },
    { id: 4, label: 'Intercambio',        desc: 'Intercambiar un turno con otro funcionario',         icon: 'swap'        },
    { id: 5, label: 'Oferta particular',  desc: 'Ceder un turno propio a un funcionario específico',  icon: 'hand-raised' },
    { id: 6, label: 'Oferta general',     desc: 'Ofrecer tu turno a todos los funcionarios del servicio', icon: 'hand-raised' },
  ];
  const lbl = { fontSize: 12, fontWeight: 800, color: PA.ink3, display: 'block', marginBottom: 4 };
  const inp = { width: '100%', padding: '12px 14px', borderRadius: 10, border: `1px solid ${PA.line}`, fontSize: 14, color: PA.ink, fontWeight: 600, background: '#fff', outline: 'none', boxSizing: 'border-box' };
  const canSubmit = !loading;

  // Rama desktop (R18): mismo estado, mismos pickers y mismo envío; el panel
  // lateral muestra el paso 2 como formulario y las fechas como campos de fecha
  // con los mismos límites del selector móvil (desde hoy, o desde el inicio
  // para el término, hasta fin del año siguiente).
  if (esDesktop) {
    const hoy = new Date();
    const hoyStr = `${hoy.getFullYear()}-${String(hoy.getMonth()+1).padStart(2,'0')}-${String(hoy.getDate()).padStart(2,'0')}`;
    const fechaMaxima = `${hoy.getFullYear() + 1}-12-31`;
    const fechaValida = (valor, minimo) => /^\d{4}-\d{2}-\d{2}$/.test(valor) && valor >= minimo && valor <= fechaMaxima;
    const minimoTermino = form.fechaInicio || hoyStr;
    const selector = (pkey, etiqueta, valor, placeholder, extra = {}) => ({
      clave: pkey, etiqueta, tipo: 'selector', valor, placeholder, onAbrir: () => openPicker(pkey), ...extra,
    });

    const campos = [];
    if (tipoSel === 1) {
      // La ayuda repite la fecha elegida en palabras: el formato del campo depende
      // del idioma del navegador.
      campos.push({
        clave: 'fechaInicio', etiqueta: 'Fecha inicio *', tipo: 'fecha', valor: form.fechaInicio, min: hoyStr, max: fechaMaxima,
        ayuda: form.fechaInicio ? fmtFechaConDia(form.fechaInicio) : 'Desde hoy.',
        onFecha: (v) => { if (fechaValida(v, hoyStr)) PICKERS.fechaInicio.onSel(v); },
      });
      campos.push({
        clave: 'fechaFin', etiqueta: 'Fecha término *', tipo: 'fecha', valor: form.fechaFin, min: minimoTermino, max: fechaMaxima,
        ayuda: form.fechaFin ? fmtFechaConDia(form.fechaFin) : form.fechaInicio ? 'Igual o posterior a la fecha de inicio.' : 'Desde hoy.',
        onFecha: (v) => { if (fechaValida(v, minimoTermino)) PICKERS.fechaFin.onSel(v); },
      });
    }
    if (tipoSel === 2) campos.push(selector('turnoBotar', 'Turno a liberar *', turnoLabel(misTurnos, form.idTurno, form.turnoLabel), 'Seleccionar turno'));
    if (tipoSel === 3) campos.push(selector('turnoCobertura', 'Turno a cubrir *', turnoLabel(turnosLibres, form.idTurno, form.turnoLabel), 'Seleccionar turno disponible'));
    if (tipoSel === 4) {
      campos.push(selector('turnoPropio', 'Tu turno a entregar *', turnoLabel(misTurnos, form.idTurnoPropio, form.turnoPropioLabel), 'Seleccionar tu turno'));
      campos.push(selector('receptor', 'Con quién intercambiar *', funcLabel(form.idReceptor, form.receptorLabel), 'Seleccionar funcionario'));
      if (form.idReceptor) {
        campos.push(selector('turnoDeseado', 'Turno del receptor que quieres *', turnoLabel(turnosReceptor, form.idTurnoDeseado, form.turnoDeseadoLabel), 'Seleccionar turno', {
          nota: form.idTurnoPropio && turnosReceptor.length === 0 && !loadingReceptor ? notaSinIntercambiables : null,
        }));
      }
    }
    if (tipoSel === 5) {
      campos.push(selector('turnoOferta', 'Tu turno a ofrecer *', turnoLabel(misTurnos, form.idTurno, form.turnoLabel), 'Seleccionar tu turno'));
      campos.push(selector('receptorOferta', 'Ofrecer a *', funcLabel(form.idReceptor, form.receptorLabel), 'Seleccionar funcionario'));
    }
    if (tipoSel === 6) campos.push(selector('turnoOfertaGeneral', 'Tu turno a ofrecer *', turnoLabel(misTurnos, form.idTurno, form.turnoLabel), 'Seleccionar tu turno'));

    const pickerLista = step === 3 && activePicker && !activePicker.isDatePicker ? activePicker : null;
    const esListaDePersonas = pickerLista?.row === funcRow;
    const picker = pickerLista ? {
      clave: pickerKey,
      cargando: loadingData || (pickerKey === 'turnoDeseado' && loadingReceptor),
      placeholderBusqueda: esListaDePersonas ? 'Buscar por nombre o RUT…' : 'Buscar por fecha, horario o tipo…',
      items: pickerLista.items.map((item) => ({
        clave: pickerLista.keyFn(item),
        item,
        principal: esListaDePersonas
          ? [item.nombre, item.apellidoPaterno, item.apellidoMaterno].filter(Boolean).join(' ')
          : fmtFechaConDia(item.diaInicioTurno),
        secundario: esListaDePersonas
          ? (item.rutCompleto || item.rut)
          : `${fmtHora(item.horaInicio)}–${fmtHora(item.horaFin)}${item.nombre ? ` · ${item.nombre}` : ''}`,
      })),
      onElegir: (item) => { pickerLista.onSel(item); setStep(2); setPickerKey(null); },
      onVolver: () => { setStep(2); setPickerKey(null); },
    } : null;
    const tipoActual = tipos.find((t) => t.id === tipoSel);

    return (
      <Sheet open={open} onClose={handleClose} title={sheetTitle} anchoDesktop="lg">
        <NuevaSolicitudDesktop
          paso={step === 3 && !picker ? 2 : step}
          tipos={tipos.map((t) => ({ ...t, color: t.id === 6 ? COLOR_OFERTA : (TIPO_COLOR[t.id] || PA.primary), colorSuave: t.id === 6 ? COLOR_OFERTA_SOFT : PA.primarySoft }))}
          onElegirTipo={(id) => { setTipoSel(id); setStep(2); }}
          tipoEtiqueta={tipoActual?.label || TIPO_LABEL[tipoSel] || 'Tipo'}
          onVolverATipos={() => { setStep(1); setForm({}); setError(null); }}
          campos={campos}
          cargandoOpciones={loadingData}
          motivo={form.motivo || ''}
          onMotivo={(v) => setForm(f => ({ ...f, motivo: v }))}
          error={error}
          enviando={loading}
          onEnviar={handleSubmit}
          onCancelar={handleClose}
          picker={picker}
        />
      </Sheet>
    );
  }

  return (
    <Sheet open={open} onClose={handleClose} title={sheetTitle} maxHeight="90%">
      <div style={{ padding: '8px 16px 28px' }}>

        {/* PASO 1 — elegir tipo */}
        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <p style={{ fontSize: 13, color: PA.ink2, fontWeight: 600, margin: '0 0 4px' }}>¿Qué tipo de solicitud necesitas?</p>
            {tipos.map(t => (
              <button key={t.id} onClick={() => { setTipoSel(t.id); setStep(2); }} style={{ display: 'flex', alignItems: 'center', gap: 14, background: '#fff', border: `1px solid ${PA.line}`, borderRadius: 14, padding: 14, cursor: 'pointer', textAlign: 'left' }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: PA.primarySoft, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                  <SGTIcon name={t.icon} size={20} color={PA.primary} />
                </div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: PA.ink }}>{t.label}</div>
                  <div style={{ fontSize: 12, color: PA.ink3, fontWeight: 600, marginTop: 2 }}>{t.desc}</div>
                </div>
                <SGTIcon name="chevron-right" size={16} color={PA.ink3} style={{ marginLeft: 'auto' }} />
              </button>
            ))}
          </div>
        )}

        {/* PASO 2 — formulario */}
        {step === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <button onClick={() => { setStep(1); setForm({}); setError(null); }} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'transparent', border: 'none', color: PA.ink2, fontSize: 13, fontWeight: 700, cursor: 'pointer', padding: 0 }}>
              <SGTIcon name="chevron-left" size={16} color={PA.ink2} /> {TIPO_LABEL[tipoSel]}
            </button>
            {loadingData && <div style={{ fontSize: 12, color: PA.ink3, fontWeight: 600 }}>Cargando opciones...</div>}

            {tipoSel === 1 && (<>
              <div><label style={lbl}>Fecha inicio *</label><PickerBtn label="Seleccionar fecha" value={form.fechaInicio ? fmtFecha(form.fechaInicio) : null} pkey="fechaInicio" /></div>
              <div><label style={lbl}>Fecha término *</label><PickerBtn label="Seleccionar fecha" value={form.fechaFin ? fmtFecha(form.fechaFin) : null} pkey="fechaFin" /></div>
            </>)}

            {tipoSel === 2 && (
              <div><label style={lbl}>Turno a liberar *</label><PickerBtn label="Seleccionar turno" value={turnoLabel(misTurnos, form.idTurno, form.turnoLabel)} pkey="turnoBotar" /></div>
            )}

            {tipoSel === 3 && (
              <div><label style={lbl}>Turno a cubrir *</label><PickerBtn label="Seleccionar turno disponible" value={turnoLabel(turnosLibres, form.idTurno, form.turnoLabel)} pkey="turnoCobertura" /></div>
            )}

            {tipoSel === 4 && (<>
              <div><label style={lbl}>Tu turno a entregar *</label><PickerBtn label="Seleccionar tu turno" value={turnoLabel(misTurnos, form.idTurnoPropio, form.turnoPropioLabel)} pkey="turnoPropio" /></div>
              <div><label style={lbl}>Con quién intercambiar *</label><PickerBtn label="Seleccionar funcionario" value={funcLabel(form.idReceptor, form.receptorLabel)} pkey="receptor" /></div>
              {form.idReceptor && (
                <div>
                  <label style={lbl}>Turno del receptor que quieres *</label>
                  <PickerBtn label="Seleccionar turno" value={turnoLabel(turnosReceptor, form.idTurnoDeseado, form.turnoDeseadoLabel)} pkey="turnoDeseado" />
                  {form.idTurnoPropio && turnosReceptor.length === 0 && !loadingReceptor && (
                    <div style={{ marginTop: 6, fontSize: 11.5, color: PA.ink3, fontWeight: 600 }}>
                      {notaSinIntercambiables}
                    </div>
                  )}
                </div>
              )}
            </>)}

            {tipoSel === 5 && (<>
              <div><label style={lbl}>Tu turno a ofrecer *</label><PickerBtn label="Seleccionar tu turno" value={turnoLabel(misTurnos, form.idTurno, form.turnoLabel)} pkey="turnoOferta" /></div>
              <div><label style={lbl}>Ofrecer a *</label><PickerBtn label="Seleccionar funcionario" value={funcLabel(form.idReceptor, form.receptorLabel)} pkey="receptorOferta" /></div>
            </>)}

            {tipoSel === 6 && (
              <div><label style={lbl}>Tu turno a ofrecer *</label><PickerBtn label="Seleccionar tu turno" value={turnoLabel(misTurnos, form.idTurno, form.turnoLabel)} pkey="turnoOfertaGeneral" /></div>
            )}

            <div>
              <label style={lbl}>Motivo</label>
              <textarea rows={3} value={form.motivo || ''} onChange={e => setForm(f => ({ ...f, motivo: e.target.value }))} placeholder="Describe el motivo..." style={{ ...inp, resize: 'vertical' }} />
            </div>
            {error && <div style={{ background: PA.accentSoft, color: '#B85A60', borderRadius: 8, padding: '8px 12px', fontSize: 13, fontWeight: 600 }}>{error}</div>}
            <button onClick={handleSubmit} disabled={!canSubmit} style={{ background: canSubmit ? PA.primary : PA.line, color: canSubmit ? '#fff' : PA.ink3, border: 'none', borderRadius: 12, padding: 14, fontSize: 15, fontWeight: 800, cursor: canSubmit ? 'pointer' : 'not-allowed' }}>
              {loading ? 'Enviando...' : 'Enviar solicitud'}
            </button>
          </div>
        )}

        {/* PASO 3 — picker list */}
        {step === 3 && activePicker && !activePicker.isDatePicker && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button onClick={() => { setStep(2); setPickerKey(null); }} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'transparent', border: 'none', color: PA.ink2, fontSize: 13, fontWeight: 700, cursor: 'pointer', padding: '0 0 8px' }}>
              <SGTIcon name="chevron-left" size={16} color={PA.ink2} /> Volver
            </button>
            {loadingData && <LoadingState label="Cargando..." rows={2} />}
            {!loadingData && activePicker.items.length === 0 && (
              <ListEmptyState icon="search" theme="slate" title="Sin opciones" message="No hay opciones disponibles." />
            )}
            {!loadingData && activePicker.items.map(item => (
              <button key={activePicker.keyFn(item)} onClick={() => { activePicker.onSel(item); setStep(2); setPickerKey(null); }} style={{ display: 'flex', alignItems: 'flex-start', background: '#fff', border: `1px solid ${PA.line}`, borderRadius: 12, padding: '12px 14px', cursor: 'pointer', textAlign: 'left', width: '100%' }}>
                {activePicker.row(item)}
              </button>
            ))}
          </div>
        )}

        {/* PASO 3 — date picker (año → mes → día) */}
        {step === 3 && activePicker?.isDatePicker && (() => {
          const hoy = new Date();
          const hoyStr = `${hoy.getFullYear()}-${String(hoy.getMonth()+1).padStart(2,'0')}-${String(hoy.getDate()).padStart(2,'0')}`;
          const minDate = pickerKey === 'fechaFin' && form.fechaInicio ? form.fechaInicio : hoyStr;

          const goBack = () => {
            if (dpStep === 'year')  { setStep(2); setPickerKey(null); }
            if (dpStep === 'month') { setDpStep('year'); }
            if (dpStep === 'day')   { setDpStep('month'); }
          };

          const gridBtn = (content, onClick, disabled = false, active = false) => (
            <button
              key={content}
              onClick={onClick}
              disabled={disabled}
              style={{
                padding: '10px 4px', borderRadius: 10, border: 'none', fontSize: 14, fontWeight: 700,
                background: active ? PA.primary : disabled ? 'transparent' : '#fff',
                color: active ? '#fff' : disabled ? PA.line : PA.ink,
                cursor: disabled ? 'default' : 'pointer',
              }}
            >{content}</button>
          );

          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <button onClick={goBack} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'transparent', border: 'none', color: PA.ink2, fontSize: 13, fontWeight: 700, cursor: 'pointer', padding: '0 0 4px' }}>
                <SGTIcon name="chevron-left" size={16} color={PA.ink2} /> Volver
              </button>

              {/* AÑO */}
              {dpStep === 'year' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {[hoy.getFullYear(), hoy.getFullYear() + 1].map(y => (
                    <button key={y} onClick={() => { setDpYear(y); setDpStep('month'); }}
                      style={{ padding: '16px', borderRadius: 12, border: `1px solid ${PA.line}`, background: '#fff', fontSize: 16, fontWeight: 800, color: PA.ink, cursor: 'pointer' }}>
                      {y}
                    </button>
                  ))}
                </div>
              )}

              {/* MES */}
              {dpStep === 'month' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                  {MESES_CORTO.map((m, i) => {
                    const mesStr = `${dpYear}-${String(i+1).padStart(2,'0')}-01`;
                    const disabled = mesStr < minDate.substring(0, 7) + '-01';
                    return (
                      <button key={m} onClick={() => { if (!disabled) { setDpMonth(i+1); setDpStep('day'); } }}
                        disabled={disabled}
                        style={{ padding: '12px 4px', borderRadius: 10, border: `1px solid ${disabled ? PA.line2 : PA.line}`, background: disabled ? PA.surface2 : '#fff', fontSize: 14, fontWeight: 700, color: disabled ? PA.ink3 : PA.ink, cursor: disabled ? 'default' : 'pointer' }}>
                        {m}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* DÍA */}
              {dpStep === 'day' && (() => {
                const diasEnMes = new Date(dpYear, dpMonth, 0).getDate();
                const primerDia = (new Date(dpYear, dpMonth - 1, 1).getDay() + 6) % 7; // 0=Lun
                const dias = ['L','M','X','J','V','S','D'];
                const cells = [];
                for (let i = 0; i < primerDia; i++) cells.push(null);
                for (let d = 1; d <= diasEnMes; d++) cells.push(d);

                return (
                  <div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 6 }}>
                      {dias.map(d => <div key={d} style={{ textAlign: 'center', fontSize: 11, fontWeight: 800, color: PA.ink3, padding: '4px 0' }}>{d}</div>)}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
                      {cells.map((d, i) => {
                        if (!d) return <div key={`e-${i}`} />;
                        const dateStr = `${dpYear}-${String(dpMonth).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
                        const disabled = dateStr < minDate;
                        const active = dateStr === (pickerKey === 'fechaInicio' ? form.fechaInicio : form.fechaFin);
                        return gridBtn(d, () => { if (!disabled) { activePicker.onSel(dateStr); setStep(2); setPickerKey(null); } }, disabled, active);
                      })}
                    </div>
                  </div>
                );
              })()}
            </div>
          );
        })()}
      </div>
    </Sheet>
  );
};

// ── EditMotivoSheet ───────────────────────────────────────────────────────────

const EditMotivoSheet = ({ solicitud, onClose, onSaved }) => {
  const { esDesktop } = useLayout();
  const [motivo, setMotivo]   = useState(solicitud?.motivo || '');
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState(null);

  useEffect(() => { setMotivo(solicitud?.motivo || ''); }, [solicitud]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await solicitudesService.modificarMotivo(solicitud.idSolicitud, motivo);
      onSaved?.();
      onClose();
    } catch (e) { setError(mensajeDeError(e, 'No se pudo guardar. Intenta de nuevo.')); }
    finally { setSaving(false); }
  };

  const canSave = !!motivo.trim() && !saving;

  if (esDesktop) {
    return (
      <Sheet open={!!solicitud} onClose={onClose} title="Modificar motivo" anchoDesktop="md">
        <EditarMotivoDesktop
          motivo={motivo}
          onMotivo={setMotivo}
          error={error}
          guardando={saving}
          puedeGuardar={canSave}
          onGuardar={handleSave}
          onCancelar={onClose}
        />
      </Sheet>
    );
  }

  return (
    <Sheet open={!!solicitud} onClose={onClose} title="Modificar motivo">
      <div style={{ padding: '8px 16px 28px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <textarea rows={4} value={motivo} onChange={e => setMotivo(e.target.value)} style={{ width: '100%', padding: '12px 14px', borderRadius: 10, border: `1px solid ${PA.line}`, fontSize: 14, color: PA.ink, fontWeight: 600, resize: 'vertical', boxSizing: 'border-box', outline: 'none' }} />
        {error && <div style={{ background: PA.accentSoft, color: '#B85A60', borderRadius: 8, padding: '8px 12px', fontSize: 13, fontWeight: 600 }}>{error}</div>}
        <button onClick={handleSave} disabled={!canSave} style={{ background: canSave ? PA.primary : PA.line, color: canSave ? '#fff' : PA.ink3, border: 'none', borderRadius: 12, padding: 14, fontSize: 15, fontWeight: 800, cursor: canSave ? 'pointer' : 'not-allowed' }}>
          {saving ? 'Guardando...' : 'Guardar cambios'}
        </button>
      </div>
    </Sheet>
  );
};

// ── SolicitudesView ───────────────────────────────────────────────────────────

const SolicitudesView = ({ onBack, initialCreatePreset = null, onInitialCreatePresetConsumed }) => {
  const { user } = useAuth();
  const { esDesktop } = useLayout();
  const isMedico  = user?.rol === 'MEDICO';
  const canDecide = user?.rol === 'JEFATURA' || user?.rol === 'SUBROGANTE';

  const [tab, setTab]           = useState(isMedico ? 'mis' : 'pendientes');
  const tabsScrollRef           = useRef(null);
  const [tabsOverflow, setTabsOverflow] = useState(false);
  const [solicitudes, setSolicitudes] = useState([]);
  const [recibidas, setRecibidas]     = useState([]);
  const [ofertas, setOfertas]         = useState([]);
  const [servicioNombre, setServicioNombre] = useState('');
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [showCrear, setShowCrear]     = useState(false);
  const [editSolicitud, setEditSolicitud] = useState(null);
  const [cancelando, setCancelando] = useState(null);
  const [crearPreset, setCrearPreset] = useState(null);
  const [sortBy, setSortBy]     = useState('reciente');
  const [showSort, setShowSort] = useState(false);
  // Solo presentación desktop (R18): ítem abierto en el detalle, búsqueda y
  // filtro por tipo de la barra, y la oferta cuya selección se está confirmando.
  const [seleccionDesktop, setSeleccionDesktop] = useState(null);
  const [busquedaDesktop, setBusquedaDesktop] = useState('');
  const [tipoDesktop, setTipoDesktop] = useState('todos');
  const [ofertaPorConfirmar, setOfertaPorConfirmar] = useState(null);

  useEffect(() => {
    if (!initialCreatePreset) return;
    setCrearPreset(initialCreatePreset);
    setShowCrear(true);
    onInitialCreatePresetConsumed?.();
  }, [initialCreatePreset, onInitialCreatePresetConsumed]);

  const handleCloseCrear = () => {
    setShowCrear(false);
    setCrearPreset(null);
  };

  useEffect(() => {
    if (!user?.servicioId) return;
    serviciosService.getById(user.servicioId)
      .then(s => setServicioNombre(s?.nombre || ''))
      .catch(() => {});
  }, [user?.servicioId]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (isMedico) {
        const [mis, recv, ofs] = await Promise.all([
          solicitudesService.getByFuncionario(user.id),
          solicitudesService.getByReceptor(user.id),
          ofertasGeneralesService.getByServicio(user.servicioId),
        ]);
        setSolicitudes(Array.isArray(mis) ? mis : []);
        setRecibidas(Array.isArray(recv) ? recv : []);
        setOfertas(Array.isArray(ofs) ? ofs : []);
      } else {
        const [all, ofs] = await Promise.all([
          solicitudesService.getAll(),
          ofertasGeneralesService.getByServicio(user.servicioId),
        ]);
        const arr = Array.isArray(all) ? all : [];
        const filtered = arr.filter(s => !s.turno || String(s.turno.servicio?.idServicio) === String(user.servicioId));
        setSolicitudes(filtered);
        setOfertas(Array.isArray(ofs) ? ofs : []);
      }
    } catch {
      setError('No se pudieron cargar las solicitudes.');
    } finally {
      setLoading(false);
    }
  }, [user, isMedico]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const el = tabsScrollRef.current;
    if (!el) return;
    const check = () => setTabsOverflow(el.scrollWidth > el.clientWidth && el.scrollLeft < el.scrollWidth - el.clientWidth - 1);
    check();
    el.addEventListener('scroll', check);
    return () => el.removeEventListener('scroll', check);
  }, [isMedico]);

  const handleAprobar = async (id) => {
    try {
      await solicitudesService.updateEstado(id, 'APROBADA', user.id);
      load();
    } catch (e) { setError(mensajeDeError(e, 'Error al aprobar la solicitud.')); }
  };

  const handleRechazar = async (id) => {
    try {
      await solicitudesService.updateEstado(id, 'RECHAZADA', user.id);
      load();
    } catch (e) { setError(mensajeDeError(e, 'Error al rechazar la solicitud.')); }
  };

  const handleCancelar = async (solicitud) => {
    setCancelando(solicitud);
  };

  const confirmarCancelacion = async () => {
    const solicitud = cancelando;
    setCancelando(null);
    if (!solicitud) return;
    try {
      await solicitudesService.cancelar(solicitud.idSolicitud);
      load();
    } catch (e) { setError(mensajeDeError(e, 'No se pudo cancelar la solicitud.')); }
  };

  const handleResponder = async (id, acepta) => {
    try {
      await solicitudesService.responderIntercambio(id, user.id, acepta);
      load();
    } catch (e) { setError(mensajeDeError(e, 'Error al responder el intercambio.')); }
  };

  const handleResponderOfertaParticular = async (id, acepta) => {
    try {
      await solicitudesService.responderOfertaParticular(id, user.id, acepta);
      load();
    } catch (e) { setError(mensajeDeError(e, 'Error al responder la oferta.')); }
  };

  const handleOfertaAprobar = async (id) => {
    try { await ofertasGeneralesService.aprobar(id, user.id); load(); }
    catch (e) { setError(mensajeDeError(e, 'Error al aprobar la oferta.')); }
  };

  const handleOfertaRechazar = async (id) => {
    try { await ofertasGeneralesService.rechazar(id, user.id); load(); }
    catch (e) { setError(mensajeDeError(e, 'Error al rechazar la oferta.')); }
  };

  const handlePostular = async (idOferta) => {
    try { await ofertasGeneralesService.postular(idOferta, user.id); load(); }
    catch (e) { setError(mensajeDeError(e, 'Error al postular.')); }
  };

  const handleRetirar = async (idOferta, idPostulacion) => {
    try { await ofertasGeneralesService.retirarPostulacion(idOferta, idPostulacion, user.id); load(); }
    catch (e) { setError(mensajeDeError(e, 'Error al retirar la postulación.')); }
  };

  const handleSeleccionar = async (idOferta, idPostulacion) => {
    try { await ofertasGeneralesService.seleccionar(idOferta, idPostulacion, user.id); load(); }
    catch (e) { setError(mensajeDeError(e, 'Error al seleccionar postulante.')); }
  };

  const SORT_OPTIONS = [
    { id: 'reciente', label: 'Más reciente', desc: 'De la más nueva a la más antigua' },
    { id: 'antigua',  label: 'Más antigua',  desc: 'De la más antigua a la más nueva' },
    { id: 'tipo',     label: 'Por tipo',      desc: 'Agrupa por tipo de solicitud'     },
  ];

  const applySort = (list) => {
    const copy = [...list];
    if (sortBy === 'reciente') return copy.sort((a, b) => new Date(b.fechaCreacion) - new Date(a.fechaCreacion));
    if (sortBy === 'antigua')  return copy.sort((a, b) => new Date(a.fechaCreacion) - new Date(b.fechaCreacion));
    if (sortBy === 'tipo')     return copy.sort((a, b) => (a.tipoSolicitud?.tipo ?? 0) - (b.tipoSolicitud?.tipo ?? 0));
    return copy;
  };

  const currentList = applySort((() => {
    if (tab === 'recibidas')  return recibidas;
    if (tab === 'mis')        return solicitudes;
    if (tab === 'pendientes') return solicitudes.filter(s => s.estado === 'PENDIENTE');
    if (tab === 'historial')  return solicitudes.filter(s => s.estado !== 'PENDIENTE');
    return solicitudes;
  })());

  // R10 — En el tab "pendientes" de jefatura, las coberturas que compiten por el
  // mismo turno (2+) salen agrupadas; el resto sigue como tarjetas individuales.
  const esPostulacionCobertura = (s) =>
    s.tipoSolicitud?.tipo === 3 && s.estado === 'PENDIENTE' && s.turno?.idTurno != null;

  let gruposPostulacion = [];
  let listaSinAgrupar = currentList;
  if (canDecide && tab === 'pendientes') {
    const porTurno = new Map();
    currentList.filter(esPostulacionCobertura).forEach((sol) => {
      const k = String(sol.turno.idTurno);
      if (!porTurno.has(k)) porTurno.set(k, []);
      porTurno.get(k).push(sol);
    });
    gruposPostulacion = Array.from(porTurno.values())
      .filter((g) => g.length >= 2)
      .sort((a, b) => String(a[0].turno?.diaInicioTurno || '').localeCompare(String(b[0].turno?.diaInicioTurno || '')));
    const agrupadas = new Set(gruposPostulacion.flat().map((sol) => sol.idSolicitud));
    listaSinAgrupar = currentList.filter((sol) => !agrupadas.has(sol.idSolicitud));
  }

  // Turnos que el usuario ya comprometió en sus solicitudes pendientes (R15): el
  // asistente de intercambio los reconoce y dice que hay que cancelar la otra.
  const misTurnosComprometidos = useMemo(() => turnosComprometidos(solicitudes, user?.id), [solicitudes, user?.id]);

  const pendienteCount = solicitudes.filter(s => s.estado === 'PENDIENTE').length;
  const recibidasCount = recibidas.filter(s => s.estado === 'PENDIENTE').length;

  // C-16 (17 oct 2026): el mismo filtro de vigencia que el Centro de
  // operaciones (utils/reglasSolicitud.js, ofertaVisible). Nunca las ofertas de
  // turnos que ya terminaron ni las rechazadas; la gestión ve además las que
  // esperan apertura y las cerradas con un elegido; el médico, solo las
  // abiertas (y las suyas).
  const hoy = hoyISOEnZonaHospital();
  const ofertasVisibles = ofertas.filter((o) => ofertaVisible(o, { hoy, puedeDecidir: canDecide, userId: user?.id }));
  const ofertasPendientes = ofertasVisibles.filter(o => o.estado === 'PENDIENTE_APROBACION').length;

  const TABS = isMedico
    ? [
        { id: 'mis',     label: 'Mis solicitudes',   badge: null },
        { id: 'recibidas', label: 'Recibidas',        badge: recibidasCount },
        { id: 'ofertas', label: 'Ofertas generales',  badge: null },
      ]
    : [
        { id: 'pendientes', label: 'Pendientes',      badge: pendienteCount },
        { id: 'historial',  label: 'Historial',       badge: null },
        { id: 'ofertas',    label: 'Ofertas generales', badge: ofertasPendientes || null },
      ];

  if (esDesktop) {
    const userId = user?.id;
    const TONO = { warn: 'aviso', success: 'exito', accent: 'alerta', neutral: 'neutral', primary: 'primario' };
    const normalizar = (t) => String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const q = normalizar(busquedaDesktop.trim());
    const coincide = (...textos) => !q || textos.some((t) => normalizar(t).includes(q));
    const pasaTipo = (tipo) => tipoDesktop === 'todos' || String(tipo) === tipoDesktop;
    const turnoTexto = (t) => (t ? `${fmtFechaConDia(t.diaInicioTurno)} · ${fmtHora(t.horaInicio)}–${fmtHora(t.horaFin)}` : '');
    const conTu = (persona) => `${nombreFuncionario(persona)}${persona && String(persona.idFuncionario) === String(userId) ? ' (tú)' : ''}`;
    const valorFila = (f) => {
      if (f.clase === 'persona') return conTu(f.persona);
      if (f.clase === 'turno') return `${turnoTexto(f.turno)}${f.turno.puesto?.nombre ? ` · ${f.turno.puesto.nombre}` : ''}`;
      return `${fmtFecha(f.desde)} → ${fmtFecha(f.hasta)}`;
    };

    const itemSolicitud = (sol) => {
      const esMiReceptor = String(sol.funcionarioReceptor?.idFuncionario) === String(userId);
      const esMiSolicitud = String(sol.funcionario?.idFuncionario) === String(userId);
      const ev = evaluarSolicitud(sol, { canDecide, esMiReceptor, esMiSolicitud, puedeEditarMotivo: isMedico, puedeCancelar: true, userId });
      const acciones = [];
      if (ev.canDecideThis) {
        acciones.push({ clave: 'rechazar', etiqueta: 'Rechazar', variante: 'peligro', icono: 'close', onClick: () => handleRechazar(sol.idSolicitud) });
        acciones.push({ clave: 'aprobar', etiqueta: 'Aprobar', variante: 'exito', icono: 'check', onClick: () => handleAprobar(sol.idSolicitud) });
      }
      if (ev.canRespond && ev.tipo === 4) {
        acciones.push({ clave: 'rechazar-int', etiqueta: 'Rechazar', variante: 'peligro', icono: 'close', onClick: () => handleResponder(sol.idSolicitud, false) });
        acciones.push({ clave: 'aceptar-int', etiqueta: 'Aceptar', variante: 'exito', icono: 'check', onClick: () => handleResponder(sol.idSolicitud, true) });
      }
      if (ev.canRespond && ev.tipo === 5) {
        acciones.push({ clave: 'rechazar-of', etiqueta: 'Rechazar', variante: 'peligro', icono: 'close', onClick: () => handleResponderOfertaParticular(sol.idSolicitud, false) });
        acciones.push({ clave: 'aceptar-of', etiqueta: 'Aceptar', variante: 'exito', icono: 'check', onClick: () => handleResponderOfertaParticular(sol.idSolicitud, true) });
      }
      if (ev.canCancelar) acciones.push({ clave: 'cancelar', etiqueta: 'Cancelar solicitud', variante: 'peligro', icono: 'close', izquierda: true, onClick: () => handleCancelar(sol) });
      if (ev.canEditMotivo) acciones.push({ clave: 'motivo', etiqueta: 'Modificar motivo', variante: 'secundario', icono: 'sliders', onClick: () => setEditSolicitud(sol) });

      const notas = [];
      if (ev.esperandoReceptor && ev.estado === 'PENDIENTE' && !esMiReceptor) {
        notas.push({ clave: 'espera', tono: 'aviso', texto: `⏳ Esperando respuesta del receptor${sol.funcionarioReceptor ? ` (${nombreFuncionario(sol.funcionarioReceptor)})` : ''}` });
      }
      if (ev.receptorRechazo) notas.push({ clave: 'rechazo', tono: 'alerta', texto: '✕ Receptor rechazó el intercambio' });
      if (ev.bloqueadaPorParticipar) notas.push({ clave: 'segregacion', texto: NOTA_PARTICIPAS });

      const turnoPrincipal = sol.turno ? turnoTexto(sol.turno) : sol.fechaInicioPermiso ? `${fmtFecha(sol.fechaInicioPermiso)} → ${fmtFecha(sol.fechaTerminoPermiso)}` : '';
      return {
        key: `sol-${sol.idSolicitud}`,
        color: TIPO_COLOR[ev.tipo] || PA.line,
        colorSuave: PA.primarySoft,
        colorTinta: PA.primary,
        icono: TIPO_ICON[ev.tipo] || 'alert',
        titulo: tipoLabel(sol),
        fecha: fmtFecha(sol.fechaCreacion),
        subtitulo: `Creada el ${fmtFecha(sol.fechaCreacion)}`,
        chip: { texto: ev.badgeLabel, tono: TONO[ev.badgeTone] || 'neutral' },
        linea1: sol.funcionarioReceptor ? `${conTu(sol.funcionario)} → ${conTu(sol.funcionarioReceptor)}` : conTu(sol.funcionario),
        linea2: turnoPrincipal,
        filas: filasSolicitud(sol).map((f) => ({ etiqueta: f.label, valor: valorFila(f) })),
        motivo: sol.motivo || '',
        notas,
        acciones,
      };
    };

    const itemGrupo = (grupo) => {
      const { turno, nombreTipoTurno, posicion, ordenadas } = datosGrupoPostulacion(grupo);
      return {
        key: `grupo-turno-${turno.idTurno}`,
        color: TIPO_COLOR[3],
        colorSuave: PA.primarySoft,
        colorTinta: PA.primary,
        icono: 'users',
        titulo: 'Postulaciones al mismo turno',
        subtitulo: 'Cobertura · elige a una persona',
        chip: { texto: `${grupo.length} postulantes`, tono: 'aviso' },
        linea1: ordenadas.map((sol) => nombreFuncionario(sol.funcionario)).join(', '),
        linea2: `${turnoTexto(turno)}${posicion ? ` · ${posicion}` : ''}`,
        filas: [
          { etiqueta: 'Turno a cubrir', valor: `${turnoTexto(turno)}${nombreTipoTurno ? ` · ${nombreTipoTurno}` : ''}` },
          ...(posicion ? [{ etiqueta: 'Posición', valor: posicion }] : []),
        ],
        postulantesTitulo: `Postulantes · ${grupo.length}`,
        postulantes: ordenadas.map((sol) => {
          const nombre = nombreFuncionario(sol.funcionario);
          // Su propia postulación: la decide otra jefatura (segregación de funciones).
          const propia = participaEnSolicitud(sol, userId);
          return {
            clave: sol.idSolicitud,
            nombre,
            detalle: `Postuló el ${fmtFecha(sol.fechaCreacion)}`,
            motivo: sol.motivo,
            chip: propia ? { texto: 'Tu postulación', tono: 'neutral' } : undefined,
            acciones: propia ? [] : [
              { clave: 'rechazar', etiqueta: 'Rechazar', variante: 'peligro', tamano: 'sm', icono: 'close', ariaLabel: `Rechazar a ${nombre}`, onClick: () => handleRechazar(sol.idSolicitud) },
              { clave: 'elegir', etiqueta: 'Elegir', variante: 'exito', tamano: 'sm', icono: 'check', ariaLabel: `Elegir a ${nombre}`, onClick: () => handleAprobar(sol.idSolicitud) },
            ],
          };
        }),
        pie: 'Al elegir a una persona, las demás postulaciones de este turno se rechazan automáticamente.',
      };
    };

    const itemOferta = (oferta) => {
      const ev = evaluarOferta(oferta, userId, canDecide);
      const acciones = [];
      if (ev.puedeDecidirApertura) {
        acciones.push({ clave: 'rechazar', etiqueta: 'Rechazar', variante: 'peligro', icono: 'close', onClick: () => handleOfertaRechazar(oferta.idOfertaGeneral) });
        acciones.push({ clave: 'aprobar', etiqueta: 'Aprobar', variante: 'exito', icono: 'check', onClick: () => handleOfertaAprobar(oferta.idOfertaGeneral) });
      }
      if (ev.puedePostularORetirar && !ev.yaPostulado) {
        acciones.push({ clave: 'postular', etiqueta: 'Postular', variante: 'primario', icono: 'hand-raised', onClick: () => handlePostular(oferta.idOfertaGeneral) });
      }
      if (ev.puedePostularORetirar && ev.yaPostulado) {
        acciones.push({ clave: 'retirar', etiqueta: 'Retirar', variante: 'peligro', icono: 'close', onClick: () => handleRetirar(oferta.idOfertaGeneral, ev.miPostulacion.idPostulacion) });
      }
      const notas = [];
      if (ev.puedePostularORetirar && ev.yaPostulado) notas.push({ clave: 'postulado', tono: 'exito', texto: 'Postulado' });
      if (ev.esMiOfertaAbierta) {
        notas.push({ clave: 'mia', tono: 'aviso', texto: `Tu oferta está abierta · ${ev.postulaciones.length} postulante${ev.postulaciones.length !== 1 ? 's' : ''}` });
      }
      const filas = [{ etiqueta: 'Ofertor', valor: conTu(oferta.ofertor) }];
      if (oferta.turno) filas.push({ etiqueta: 'Turno ofertado', valor: `${turnoTexto(oferta.turno)}${oferta.turno.puesto?.nombre ? ` · ${oferta.turno.puesto.nombre}` : ''}` });
      if (ev.estado === 'CERRADA' && ev.seleccionado) filas.push({ etiqueta: 'Asignado a', valor: nombreFuncionario(ev.seleccionado.postulante) });

      return {
        key: `oferta-${oferta.idOfertaGeneral}`,
        color: COLOR_OFERTA,
        colorSuave: COLOR_OFERTA_SOFT,
        colorTinta: '#996520',
        icono: 'hand-raised',
        titulo: 'Oferta general',
        fecha: fmtFecha(oferta.fechaCreacion),
        subtitulo: `Publicada el ${fmtFecha(oferta.fechaCreacion)}`,
        chip: { texto: ev.badgeLabel, tono: TONO[ev.badgeTone] || 'neutral' },
        linea1: conTu(oferta.ofertor),
        linea2: `${turnoTexto(oferta.turno)}${ev.estado === 'ABIERTA' ? ` · ${ev.postulaciones.length} postulante${ev.postulaciones.length !== 1 ? 's' : ''}` : ''}`,
        filas,
        motivo: oferta.motivo || '',
        notas,
        acciones,
        ...(ev.puedeSeleccionar ? {
          postulantesTitulo: `Postulantes (${ev.postulaciones.length})`,
          postulantes: ev.postulaciones.map((p) => {
            const nombre = nombreFuncionario(p.postulante);
            return {
              clave: p.idPostulacion,
              nombre,
              acciones: [{
                clave: 'seleccionar', etiqueta: 'Seleccionar', variante: 'primario', tamano: 'sm', ariaLabel: `Seleccionar a ${nombre}`,
                onClick: () => setOfertaPorConfirmar({ oferta, idPostulacion: p.idPostulacion, nombrePostulante: nombre }),
              }],
            };
          }),
        } : {}),
      };
    };

    const esOfertas = tab === 'ofertas';
    const items = esOfertas
      ? ofertasVisibles
        .filter((o) => coincide(nombreFuncionario(o.ofertor), o.motivo, ...(o.postulaciones || []).map((p) => nombreFuncionario(p.postulante))))
        .map(itemOferta)
      : [
        ...gruposPostulacion
          .filter((g) => pasaTipo(3) && g.some((sol) => coincide(nombreFuncionario(sol.funcionario), sol.motivo)))
          .map(itemGrupo),
        ...listaSinAgrupar
          .filter((sol) => pasaTipo(sol.tipoSolicitud?.tipo) && coincide(nombreFuncionario(sol.funcionario), nombreFuncionario(sol.funcionarioReceptor), sol.motivo))
          .map(itemSolicitud),
      ];
    const hayFiltros = Boolean(q) || (!esOfertas && tipoDesktop !== 'todos');
    // Un grupo R10 cuenta todas sus postulaciones, para que cuadre con el contador de la pestaña.
    const totalLista = esOfertas
      ? items.length
      : items.reduce((n, it) => n + (it.postulantes && it.key.startsWith('grupo-') ? it.postulantes.length : 1), 0);
    const resumenLista = esOfertas
      ? `${totalLista} ${totalLista === 1 ? 'oferta' : 'ofertas'}`
      : `${totalLista} ${totalLista === 1 ? 'solicitud' : 'solicitudes'}`;
    const etiquetaPestana = TABS.find((t) => t.id === tab)?.label || 'Solicitudes';
    const subtitulo = isMedico
      ? [servicioNombre, 'Tus solicitudes, las que te enviaron y las ofertas del servicio'].filter(Boolean).join(' · ')
      : [servicioNombre, `${pendienteCount} ${pendienteCount === 1 ? 'pendiente' : 'pendientes'}`, ofertasPendientes ? `${ofertasPendientes} ${ofertasPendientes === 1 ? 'oferta por abrir' : 'ofertas por abrir'}` : null].filter(Boolean).join(' · ');
    const confirmarOferta = ofertaPorConfirmar;

    return (
      <>
        <SolicitudesDesktop
          titulo="Solicitudes"
          subtitulo={subtitulo}
          onNueva={() => setShowCrear(true)}
          pestanas={TABS.map((t) => ({ id: t.id, etiqueta: t.label, conteo: t.badge > 0 ? t.badge : undefined }))}
          pestana={tab}
          onPestana={setTab}
          busqueda={busquedaDesktop}
          onBusqueda={setBusquedaDesktop}
          placeholderBusqueda={esOfertas ? 'Buscar ofertor o postulante…' : 'Buscar por nombre o motivo…'}
          tipos={esOfertas ? null : [{ id: 'todos', etiqueta: 'Todos los tipos' }, ...TIPOS_SOLICITUD.map((id) => ({ id: String(id), etiqueta: TIPO_LABEL[id] }))]}
          tipo={tipoDesktop}
          onTipo={setTipoDesktop}
          ordenes={esOfertas ? null : SORT_OPTIONS}
          orden={sortBy}
          onOrden={setSortBy}
          cargando={loading}
          error={error}
          tituloLista={etiquetaPestana}
          subtituloLista={esOfertas && servicioNombre ? `Turnos ofertados en ${servicioNombre} · ${resumenLista}` : resumenLista}
          items={items}
          seleccion={seleccionDesktop}
          onSeleccionar={setSeleccionDesktop}
          vacio={esOfertas
            ? { titulo: 'Sin ofertas', texto: 'No hay ofertas vigentes en este servicio.' }
            : { titulo: 'Sin solicitudes', texto: 'No hay solicitudes aquí por el momento.' }}
          hayFiltros={hayFiltros}
          onLimpiarFiltros={() => { setBusquedaDesktop(''); setTipoDesktop('todos'); }}
        />

        <CrearSolicitudSheet
          open={showCrear}
          onClose={handleCloseCrear}
          userId={user?.id}
          servicioId={user?.servicioId}
          onCreated={load}
          initialPreset={crearPreset}
          turnosComprometidos={misTurnosComprometidos}
        />

        <EditMotivoSheet
          solicitud={editSolicitud}
          onClose={() => setEditSolicitud(null)}
          onSaved={load}
        />

        {cancelando && (
          <ConfirmacionDesktop
            titulo="Cancelar solicitud"
            tono="peligro"
            etiquetaCancelar="Volver"
            etiquetaConfirmar="Cancelar solicitud"
            onCancelar={() => setCancelando(null)}
            onConfirmar={confirmarCancelacion}
          >
            Se cancelará tu solicitud de <strong>{tipoLabel(cancelando)}</strong>.
            {cancelando.turno ? ' El turno involucrado queda libre para que pidas otra cosa sobre él.' : ''}
          </ConfirmacionDesktop>
        )}

        {confirmarOferta && (
          <ConfirmacionDesktop
            titulo="Confirmar selección"
            onCancelar={() => setOfertaPorConfirmar(null)}
            onConfirmar={() => { handleSeleccionar(confirmarOferta.oferta.idOfertaGeneral, confirmarOferta.idPostulacion); setOfertaPorConfirmar(null); }}
          >
            Se asignará el turno de <strong>{nombreFuncionario(confirmarOferta.oferta.ofertor)}</strong> a <strong>{confirmarOferta.nombrePostulante}</strong>.
            {confirmarOferta.oferta.turno && (
              <div className="sgt-dt-motivo" style={{ marginTop: 10 }}>
                <div className="sgt-d-seccion-titulo" style={{ margin: '0 0 2px' }}>Turno</div>
                <div className="sgt-dt-motivo__texto">{turnoTexto(confirmarOferta.oferta.turno)}</div>
              </div>
            )}
          </ConfirmacionDesktop>
        )}
      </>
    );
  }

  return (
    <div className="dash-page-bg" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', animation: 'sgtFade .3s ease' }}>
      <TopHeader
        title="Solicitudes"
        leftSlot={
          <button onClick={onBack} style={{ background: 'transparent', border: 'none', padding: 4, cursor: 'pointer', display: 'flex' }}>
            <SGTIcon name="chevron-left" size={24} color={PA.ink} />
          </button>
        }
        rightSlot={
          <button onClick={() => setShowCrear(true)} style={{ background: PA.primary, color: '#fff', border: 'none', borderRadius: 10, width: 36, height: 36, display: 'grid', placeItems: 'center', cursor: 'pointer' }}>
            <SGTIcon name="plus" size={18} color="#fff" />
          </button>
        }
      />

      {/* Tabs + botón orden */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 14px 8px', background: '#fff', borderBottom: `1px solid ${PA.line2}` }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 0 }}>
          <div ref={tabsScrollRef} className="sgt-no-scrollbar" style={{ display: 'flex', gap: 6, overflowX: 'auto' }}>
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)} style={{
                background: tab === t.id ? PA.primary : 'transparent',
                color: tab === t.id ? '#fff' : PA.ink2,
                border: `1px solid ${tab === t.id ? PA.primary : PA.line}`,
                borderRadius: 999, padding: '7px 14px', fontSize: 12.5, fontWeight: 800,
                cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5, flexShrink: 0,
              }}>
                {t.label}
                {t.badge != null && t.badge > 0 && (
                  <span style={{ background: tab === t.id ? 'rgba(255,255,255,0.25)' : PA.line2, color: tab === t.id ? '#fff' : PA.ink3, padding: '1px 6px', borderRadius: 99, fontSize: 10.5, fontWeight: 800 }}>{t.badge}</span>
                )}
              </button>
            ))}
          </div>
          {tabsOverflow && (
            <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: 32, background: 'linear-gradient(to right, transparent, #fff)', pointerEvents: 'none' }} />
          )}
        </div>
        <button
          onClick={() => setShowSort(true)}
          style={{ flexShrink: 0, width: 34, height: 34, borderRadius: 10, border: `1px solid ${sortBy !== 'reciente' ? PA.primary : PA.line}`, background: sortBy !== 'reciente' ? PA.primarySoft : '#fff', display: 'grid', placeItems: 'center', cursor: 'pointer' }}
        >
          <SGTIcon name="sliders" size={16} color={sortBy !== 'reciente' ? PA.primary : PA.ink2} />
        </button>
      </div>

      {/* Mini bottom sheet de orden */}
      <Sheet open={showSort} onClose={() => setShowSort(false)} title="Ordenar por">
        <div style={{ padding: '4px 16px 32px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {SORT_OPTIONS.map(opt => (
            <button
              key={opt.id}
              onClick={() => { setSortBy(opt.id); setShowSort(false); }}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '14px 16px', borderRadius: 12,
                border: `1.5px solid ${sortBy === opt.id ? PA.primary : PA.line}`,
                background: sortBy === opt.id ? PA.primarySoft : '#fff',
                cursor: 'pointer', textAlign: 'left',
              }}
            >
              <div>
                <div style={{ fontSize: 14, fontWeight: 800, color: sortBy === opt.id ? PA.primary : PA.ink }}>{opt.label}</div>
                <div style={{ fontSize: 12, color: PA.ink3, fontWeight: 600, marginTop: 2 }}>{opt.desc}</div>
              </div>
              {sortBy === opt.id && <SGTIcon name="check" size={16} color={PA.primary} />}
            </button>
          ))}
        </div>
      </Sheet>

      {/* Lista */}
      <div className="sgt-no-scrollbar" style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: '12px 14px 24px' }}>
        {loading && <LoadingState label="Cargando solicitudes..." />}
        {!loading && error && (
          <div style={{ background: PA.accentSoft, color: '#B85A60', borderRadius: 10, padding: '10px 14px', fontSize: 13, fontWeight: 600, marginBottom: 12 }}>{error}</div>
        )}

        {/* Tab: Ofertas generales */}
        {!loading && tab === 'ofertas' && (
          <>
            <div style={{ background: '#FDF3E3', border: `1px solid ${COLOR_OFERTA}`, borderRadius: 12, padding: '10px 14px', marginBottom: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: '#996520' }}>Ofertas generales</div>
              <div style={{ fontSize: 12, color: '#996520', fontWeight: 600, marginTop: 2 }}>
                Turnos ofertados por funcionarios en el servicio de <strong>{servicioNombre}</strong>
              </div>
            </div>
            {ofertasVisibles.length === 0 && (
              <ListEmptyState
                icon="check-circle" theme="slate"
                title="Sin ofertas"
                message="No hay ofertas vigentes en este servicio."
              />
            )}
            {ofertasVisibles.map(o => (
              <OfertaGeneralCard
                key={o.idOfertaGeneral}
                oferta={o}
                userId={user?.id}
                canDecide={canDecide}
                onAprobar={handleOfertaAprobar}
                onRechazar={handleOfertaRechazar}
                onPostular={handlePostular}
                onRetirar={handleRetirar}
                onSeleccionar={handleSeleccionar}
              />
            ))}
          </>
        )}

        {/* Tabs de solicitudes normales */}
        {!loading && tab !== 'ofertas' && !error && currentList.length === 0 && gruposPostulacion.length === 0 && (
          <ListEmptyState
            icon="check-circle" theme="slate"
            title="Sin solicitudes"
            message="No hay solicitudes aquí por el momento."
          />
        )}
        {!loading && tab !== 'ofertas' && gruposPostulacion.map(g => (
          <PostulacionesGrupoCard
            key={`grupo-turno-${g[0].turno.idTurno}`}
            grupo={g}
            onAprobar={handleAprobar}
            onRechazar={handleRechazar}
            userId={user?.id}
          />
        ))}
        {!loading && tab !== 'ofertas' && listaSinAgrupar.map(s => (
          <SolicitudCard
            key={s.idSolicitud}
            solicitud={s}
            canDecide={canDecide}
            onAprobar={handleAprobar}
            onRechazar={handleRechazar}
            onEditMotivo={isMedico ? setEditSolicitud : null}
            onCancelar={handleCancelar}
            esMiSolicitud={String(s.funcionario?.idFuncionario) === String(user?.id)}
            onResponderIntercambio={handleResponder}
            onResponderOfertaParticular={handleResponderOfertaParticular}
            esMiReceptor={String(s.funcionarioReceptor?.idFuncionario) === String(user?.id)}
            userId={user?.id}
          />
        ))}
      </div>

      <CrearSolicitudSheet
        open={showCrear}
        onClose={handleCloseCrear}
        userId={user?.id}
        servicioId={user?.servicioId}
        onCreated={load}
        initialPreset={crearPreset}
        turnosComprometidos={misTurnosComprometidos}
      />

      <EditMotivoSheet
        solicitud={editSolicitud}
        onClose={() => setEditSolicitud(null)}
        onSaved={load}
      />

      <Sheet open={!!cancelando} onClose={() => setCancelando(null)} title="Cancelar solicitud">
        <div style={{ padding: '8px 16px 32px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <p style={{ fontSize: 14, color: PA.ink, fontWeight: 600, lineHeight: 1.5, margin: 0 }}>
            Se cancelará tu solicitud de <strong>{cancelando ? tipoLabel(cancelando) : ''}</strong>.
            {cancelando?.turno ? ' El turno involucrado queda libre para que pidas otra cosa sobre él.' : ''}
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setCancelando(null)} style={{ ...btnStyle('ghost'), flex: 1 }}>Volver</button>
            <button onClick={confirmarCancelacion} style={{ ...btnStyle('danger'), flex: 1 }}>
              <SGTIcon name="close" size={13} color="#fff" /> Cancelar solicitud
            </button>
          </div>
        </div>
      </Sheet>
    </div>
  );
};

export default SolicitudesView;
