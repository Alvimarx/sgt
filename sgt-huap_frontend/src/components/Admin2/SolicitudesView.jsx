import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { solicitudesService, turnosService, usuariosService, ofertasGeneralesService, serviciosService } from '../../services/adminService';
import { SGT_DATA } from './data';
import { TopHeader, Sheet, SGTIcon, SGTBadge } from '../Style/UIPrimitives';
import '../Style/style.css';

const PA = SGT_DATA.PALETTE;

const TIPO_LABEL  = { 1: 'Permiso', 2: 'Botar turno', 3: 'Cobertura', 4: 'Intercambio', 5: 'Oferta particular' };
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
  return {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
    background: '#fff', color: PA.ink2, border: `1px solid ${PA.line}`,
    borderRadius: 10, padding: '10px 14px', fontSize: 13, fontWeight: 700, cursor: 'pointer',
  };
}

// ── SolicitudCard ─────────────────────────────────────────────────────────────

const SolicitudCard = ({ solicitud, canDecide, onAprobar, onRechazar, onEditMotivo, onResponderIntercambio, onResponderOfertaParticular, esMiReceptor }) => {
  const tipo  = solicitud?.tipoSolicitud?.tipo;
  const estado = solicitud?.estado;

  const esBifasico = tipo === 4 || tipo === 5;
  const esperandoReceptor = esBifasico && solicitud.aceptadoReceptor == null;
  const receptorAcepto    = esBifasico && solicitud.aceptadoReceptor === true;
  const receptorRechazo   = esBifasico && solicitud.aceptadoReceptor === false;

  const canDecideThis = canDecide && estado === 'PENDIENTE' && !esperandoReceptor && !receptorRechazo;
  const canRespond    = esMiReceptor && esBifasico && esperandoReceptor && estado === 'PENDIENTE';
  const canEditMotivo = !canDecide && !esMiReceptor && estado === 'PENDIENTE' && !!onEditMotivo;

  // Badge contextual para tipos bifásicos (4 y 5)
  let badgeLabel = estado;
  let badgeTone  = ESTADO_TONE[estado] || 'neutral';
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

  return (
    <div style={{ background: '#fff', border: `1px solid ${PA.line}`, borderLeft: `4px solid ${TIPO_COLOR[tipo] || PA.line}`, borderRadius: 14, padding: 14, marginBottom: 10 }}>
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
      <Row label="Solicitante" value={nombreFuncionario(solicitud.funcionario)} />
      {solicitud.funcionarioReceptor && (
        <Row label="Receptor" value={nombreFuncionario(solicitud.funcionarioReceptor)} />
      )}
      {solicitud.turno && (
        <Row
          label={tipo === 2 ? 'Turno a liberar' : tipo === 3 ? 'Turno a cubrir' : tipo === 4 ? 'Turno a recibir' : tipo === 5 ? 'Turno ofrecido' : 'Turno'}
          value={`${fmtFecha(solicitud.turno.diaInicioTurno)}  ${fmtHora(solicitud.turno.horaInicio)}–${fmtHora(solicitud.turno.horaFin)}`}
        />
      )}
      {solicitud.turnoReceptor && (
        <Row
          label="Turno a entregar"
          value={`${fmtFecha(solicitud.turnoReceptor.diaInicioTurno)}  ${fmtHora(solicitud.turnoReceptor.horaInicio)}–${fmtHora(solicitud.turnoReceptor.horaFin)}`}
        />
      )}
      {solicitud.fechaInicioPermiso && (
        <Row label="Período" value={`${fmtFecha(solicitud.fechaInicioPermiso)} → ${fmtFecha(solicitud.fechaTerminoPermiso)}`} />
      )}

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

      {/* Acciones jefatura/subrogante */}
      {canDecideThis && (
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <button onClick={() => onRechazar(solicitud.idSolicitud)} style={btnStyle('accent')}>
            <SGTIcon name="close" size={13} color="#B85A60" /> Rechazar
          </button>
          <button onClick={() => onAprobar(solicitud.idSolicitud)} style={{ ...btnStyle('primary'), flex: 1 }}>
            <SGTIcon name="check" size={13} color="#fff" /> Aprobar
          </button>
        </div>
      )}

      {/* Acciones receptor intercambio (tipo 4) */}
      {canRespond && tipo === 4 && (
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <button onClick={() => onResponderIntercambio(solicitud.idSolicitud, false)} style={btnStyle('accent')}>
            <SGTIcon name="close" size={13} color="#B85A60" /> Rechazar
          </button>
          <button onClick={() => onResponderIntercambio(solicitud.idSolicitud, true)} style={{ ...btnStyle('primary'), flex: 1 }}>
            <SGTIcon name="check" size={13} color="#fff" /> Aceptar
          </button>
        </div>
      )}

      {/* Acciones receptor oferta particular (tipo 5) */}
      {canRespond && tipo === 5 && (
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <button onClick={() => onResponderOfertaParticular(solicitud.idSolicitud, false)} style={btnStyle('accent')}>
            <SGTIcon name="close" size={13} color="#B85A60" /> Rechazar
          </button>
          <button onClick={() => onResponderOfertaParticular(solicitud.idSolicitud, true)} style={{ ...btnStyle('primary'), flex: 1 }}>
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
    </div>
  );
};

// ── OfertaGeneralCard ─────────────────────────────────────────────────────────

const COLOR_OFERTA = '#E0A040';
const COLOR_OFERTA_SOFT = '#FDF3E3';

const OfertaGeneralCard = ({ oferta, userId, canDecide, onAprobar, onRechazar, onPostular, onRetirar, onSeleccionar }) => {
  const estado = oferta?.estado;
  const esOfertor = String(oferta?.ofertor?.idFuncionario) === String(userId);
  const miPostulacion = oferta?.postulaciones?.find(p => String(p.postulante?.idFuncionario) === String(userId));
  const yaPostulado = !!miPostulacion;
  const postulaciones = oferta?.postulaciones || [];
  const seleccionado = postulaciones.find(p => p.seleccionado);

  const [confirmando, setConfirmando] = useState(null); // { idPostulacion, nombrePostulante }

  return (
    <div style={{ background: '#fff', border: `1px solid ${COLOR_OFERTA}`, borderLeft: `4px solid ${COLOR_OFERTA}`, borderRadius: 14, padding: 14, marginBottom: 10 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <div style={{ width: 38, height: 38, borderRadius: 10, background: COLOR_OFERTA_SOFT, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
          <SGTIcon name="hand-raised" size={18} color={COLOR_OFERTA} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: PA.ink }}>Oferta general</div>
          <div style={{ fontSize: 11, color: PA.ink3, fontWeight: 600 }}>{fmtFecha(oferta.fechaCreacion)}</div>
        </div>
        <SGTBadge tone={estado === 'ABIERTA' ? 'success' : estado === 'PENDIENTE_APROBACION' ? 'warn' : estado === 'CERRADA' ? 'neutral' : 'accent'} size="xs">
          {estado === 'PENDIENTE_APROBACION' ? 'Pend. apertura' : estado === 'ABIERTA' ? 'Abierta' : estado === 'CERRADA' ? 'Cerrada' : 'Rechazada'}
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
      {canDecide && estado === 'PENDIENTE_APROBACION' && (
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <button onClick={() => onRechazar(oferta.idOfertaGeneral)} style={btnStyle('accent')}>
            <SGTIcon name="close" size={13} color="#B85A60" /> Rechazar
          </button>
          <button onClick={() => onAprobar(oferta.idOfertaGeneral)} style={{ ...btnStyle('primary'), flex: 1 }}>
            <SGTIcon name="check" size={13} color="#fff" /> Aprobar
          </button>
        </div>
      )}

      {/* Jefatura: lista de postulantes si abierta */}
      {canDecide && estado === 'ABIERTA' && (
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
      {!canDecide && !esOfertor && estado === 'ABIERTA' && (
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
      {!canDecide && esOfertor && estado === 'ABIERTA' && (
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

const CrearSolicitudSheet = ({ open, onClose, userId, servicioId, onCreated, initialPreset }) => {
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
      fetches.push(turnosService.getByMedico(userId).then(d => setMisTurnos(Array.isArray(d) ? d : [])).catch(() => {}));
    if (tipoSel === 3)
      fetches.push(turnosService.getSinAsignar(servicioId).then(d => setTurnosLibres(Array.isArray(d) ? d : [])).catch(() => {}));
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

  useEffect(() => {
    if (!form.idReceptor) return;
    turnosService.getByMedico(form.idReceptor).then(d => setTurnosReceptor(Array.isArray(d) ? d : [])).catch(() => {});
  }, [form.idReceptor]);

  const reset = () => { setStep(1); setTipoSel(null); setForm({}); setError(null); setPickerKey(null); setDpStep('year'); setDpYear(null); setDpMonth(null); setMisTurnos([]); setTurnosLibres([]); setFuncionarios([]); setTurnosReceptor([]); };
  const handleClose = () => { reset(); onClose(); };

  const buildDTO = () => {
    const base = { idFuncionario: Number(userId), idTipoSolicitud: tipoSel, motivo: form.motivo };
    if (!base.motivo?.trim()) return null;
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

  const handleSubmit = async () => {
    setLoading(true); setError(null);
    try {
      if (tipoSel === 6) {
        if (!form.idTurno || !form.motivo?.trim()) { setError('Rellena todos los campos requeridos.'); setLoading(false); return; }
        await ofertasGeneralesService.crear({ idFuncionario: Number(userId), idTurno: Number(form.idTurno), motivo: form.motivo });
      } else {
        const dto = buildDTO();
        if (!dto) { setError('Rellena todos los campos requeridos.'); setLoading(false); return; }
        await solicitudesService.crear(dto);
      }
      onCreated?.(); handleClose();
    } catch { setError('No se pudo crear la solicitud.'); }
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
    turnoPropio:    { title: 'Tu turno a entregar',     items: misTurnos,                  keyFn: t => t.id,           row: turnoRow, onSel: t => setForm(f => ({ ...f, idTurnoPropio: t.id })) },
    receptor:       { title: 'Funcionario receptor',    items: funcionarios,                keyFn: f => f.idFuncionario, row: funcRow,  onSel: f => setForm(prev => ({ ...prev, idReceptor: f.idFuncionario, idTurnoDeseado: undefined })) },
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
  const canSubmit = !!form.motivo?.trim() && !loading;

  return (
    <Sheet open={open} onClose={handleClose} title={sheetTitle} maxHeight="90%">
      <div style={{ padding: '8px 16px 28px' }}>

        {/* PASO 1 — elegir tipo */}
        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <p style={{ fontSize: 13, color: PA.ink2, fontWeight: 600, margin: '0 0 4px' }}>¿Qué tipo de solicitud necesitás?</p>
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
              <div><label style={lbl}>Fecha inicio</label><PickerBtn label="Seleccionar fecha" value={form.fechaInicio ? fmtFecha(form.fechaInicio) : null} pkey="fechaInicio" /></div>
              <div><label style={lbl}>Fecha término</label><PickerBtn label="Seleccionar fecha" value={form.fechaFin ? fmtFecha(form.fechaFin) : null} pkey="fechaFin" /></div>
            </>)}

            {tipoSel === 2 && (
              <div><label style={lbl}>Turno a liberar</label><PickerBtn label="Seleccionar turno" value={turnoLabel(misTurnos, form.idTurno, form.turnoLabel)} pkey="turnoBotar" /></div>
            )}

            {tipoSel === 3 && (
              <div><label style={lbl}>Turno a cubrir</label><PickerBtn label="Seleccionar turno disponible" value={turnoLabel(turnosLibres, form.idTurno, form.turnoLabel)} pkey="turnoCobertura" /></div>
            )}

            {tipoSel === 4 && (<>
              <div><label style={lbl}>Tu turno a entregar</label><PickerBtn label="Seleccionar tu turno" value={turnoLabel(misTurnos, form.idTurnoPropio, form.turnoPropioLabel)} pkey="turnoPropio" /></div>
              <div><label style={lbl}>Con quién intercambiar</label><PickerBtn label="Seleccionar funcionario" value={funcLabel(form.idReceptor, form.receptorLabel)} pkey="receptor" /></div>
              {form.idReceptor && (
                <div><label style={lbl}>Turno del receptor que quieres</label><PickerBtn label="Seleccionar turno" value={turnoLabel(turnosReceptor, form.idTurnoDeseado, form.turnoDeseadoLabel)} pkey="turnoDeseado" /></div>
              )}
            </>)}

            {tipoSel === 5 && (<>
              <div><label style={lbl}>Tu turno a ofrecer</label><PickerBtn label="Seleccionar tu turno" value={turnoLabel(misTurnos, form.idTurno, form.turnoLabel)} pkey="turnoOferta" /></div>
              <div><label style={lbl}>Ofrecer a</label><PickerBtn label="Seleccionar funcionario" value={funcLabel(form.idReceptor, form.receptorLabel)} pkey="receptorOferta" /></div>
            </>)}

            {tipoSel === 6 && (
              <div><label style={lbl}>Tu turno a ofrecer</label><PickerBtn label="Seleccionar tu turno" value={turnoLabel(misTurnos, form.idTurno, form.turnoLabel)} pkey="turnoOfertaGeneral" /></div>
            )}

            <div>
              <label style={lbl}>Motivo *</label>
              <textarea rows={3} value={form.motivo || ''} onChange={e => setForm(f => ({ ...f, motivo: e.target.value }))} placeholder="Describí el motivo..." style={{ ...inp, resize: 'vertical' }} />
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
            {loadingData && <div style={{ textAlign: 'center', padding: 24, color: PA.ink3, fontSize: 13, fontWeight: 600 }}>Cargando...</div>}
            {!loadingData && activePicker.items.length === 0 && (
              <div style={{ textAlign: 'center', padding: 32, color: PA.ink3, fontSize: 13, fontWeight: 600 }}>Sin opciones disponibles.</div>
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
    } catch { setError('No se pudo guardar. Intentá de nuevo.'); }
    finally { setSaving(false); }
  };

  const canSave = !!motivo.trim() && !saving;

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
  const isMedico  = user?.rol === 'MEDICO';
  const canDecide = user?.rol === 'JEFATURA' || user?.rol === 'SUBROGANTE';

  const [tab, setTab]           = useState(isMedico ? 'mis' : 'pendientes');
  const [solicitudes, setSolicitudes] = useState([]);
  const [recibidas, setRecibidas]     = useState([]);
  const [ofertas, setOfertas]         = useState([]);
  const [servicioNombre, setServicioNombre] = useState('');
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [showCrear, setShowCrear]     = useState(false);
  const [editSolicitud, setEditSolicitud] = useState(null);
  const [crearPreset, setCrearPreset] = useState(null);
  const [sortBy, setSortBy]     = useState('reciente');
  const [showSort, setShowSort] = useState(false);

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

  const handleAprobar = async (id) => {
    try {
      await solicitudesService.updateEstado(id, 'APROBADA', user.id);
      load();
    } catch { setError('Error al aprobar la solicitud.'); }
  };

  const handleRechazar = async (id) => {
    try {
      await solicitudesService.updateEstado(id, 'RECHAZADA', user.id);
      load();
    } catch { setError('Error al rechazar la solicitud.'); }
  };

  const handleResponder = async (id, acepta) => {
    try {
      await solicitudesService.responderIntercambio(id, user.id, acepta);
      load();
    } catch { setError('Error al responder el intercambio.'); }
  };

  const handleResponderOfertaParticular = async (id, acepta) => {
    try {
      await solicitudesService.responderOfertaParticular(id, user.id, acepta);
      load();
    } catch { setError('Error al responder la oferta.'); }
  };

  const handleOfertaAprobar = async (id) => {
    try { await ofertasGeneralesService.aprobar(id, user.id); load(); }
    catch { setError('Error al aprobar la oferta.'); }
  };

  const handleOfertaRechazar = async (id) => {
    try { await ofertasGeneralesService.rechazar(id, user.id); load(); }
    catch { setError('Error al rechazar la oferta.'); }
  };

  const handlePostular = async (idOferta) => {
    try { await ofertasGeneralesService.postular(idOferta, user.id); load(); }
    catch { setError('Error al postular.'); }
  };

  const handleRetirar = async (idOferta, idPostulacion) => {
    try { await ofertasGeneralesService.retirarPostulacion(idOferta, idPostulacion, user.id); load(); }
    catch (err) { console.error('[Retirar]', err); setError('Error al retirar la postulación.'); }
  };

  const handleSeleccionar = async (idOferta, idPostulacion) => {
    try { await ofertasGeneralesService.seleccionar(idOferta, idPostulacion, user.id); load(); }
    catch { setError('Error al seleccionar postulante.'); }
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

  const pendienteCount = solicitudes.filter(s => s.estado === 'PENDIENTE').length;
  const recibidasCount = recibidas.filter(s => s.estado === 'PENDIENTE').length;

  const ofertasPendientes = ofertas.filter(o => o.estado === 'PENDIENTE_APROBACION').length;

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

  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', background: PA.surface2, animation: 'sgtFade .3s ease' }}>
      <TopHeader
        title="Solicitudes"
        leftSlot={
          <button onClick={onBack} style={{ background: 'transparent', border: 'none', padding: 4, cursor: 'pointer', display: 'flex' }}>
            <SGTIcon name="chevron-left" size={24} color={PA.ink} />
          </button>
        }
        rightSlot={
          isMedico && (
            <button onClick={() => setShowCrear(true)} style={{ background: PA.primary, color: '#fff', border: 'none', borderRadius: 10, width: 36, height: 36, display: 'grid', placeItems: 'center', cursor: 'pointer' }}>
              <SGTIcon name="plus" size={18} color="#fff" />
            </button>
          )
        }
      />

      {/* Tabs + botón orden */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 14px 8px', background: '#fff', borderBottom: `1px solid ${PA.line2}` }}>
        <div className="sgt-no-scrollbar" style={{ display: 'flex', gap: 6, flex: 1, overflowX: 'auto' }}>
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
        {loading && (
          <div style={{ textAlign: 'center', padding: 40, color: PA.ink3, fontSize: 13, fontWeight: 600 }}>Cargando...</div>
        )}
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
            {ofertas.length === 0 && (
              <div style={{ textAlign: 'center', padding: 48, color: PA.ink3, fontSize: 13, fontWeight: 600 }}>
                <SGTIcon name="check-circle" size={32} color={PA.line} />
                <div style={{ marginTop: 10 }}>Sin ofertas en este servicio.</div>
              </div>
            )}
            {ofertas.map(o => (
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
        {!loading && tab !== 'ofertas' && !error && currentList.length === 0 && (
          <div style={{ textAlign: 'center', padding: 48, color: PA.ink3, fontSize: 13, fontWeight: 600 }}>
            <SGTIcon name="check-circle" size={32} color={PA.line} />
            <div style={{ marginTop: 10 }}>Sin solicitudes aquí.</div>
          </div>
        )}
        {!loading && tab !== 'ofertas' && currentList.map(s => (
          <SolicitudCard
            key={s.idSolicitud}
            solicitud={s}
            canDecide={canDecide}
            onAprobar={handleAprobar}
            onRechazar={handleRechazar}
            onEditMotivo={isMedico ? setEditSolicitud : null}
            onResponderIntercambio={handleResponder}
            onResponderOfertaParticular={handleResponderOfertaParticular}
            esMiReceptor={tab === 'recibidas'}
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
      />

      <EditMotivoSheet
        solicitud={editSolicitud}
        onClose={() => setEditSolicitud(null)}
        onSaved={load}
      />
    </div>
  );
};

export default SolicitudesView;
