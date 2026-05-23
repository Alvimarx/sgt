import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { solicitudesService, turnosService, usuariosService } from '../../services/adminService';
import { SGT_DATA } from './data';
import { TopHeader, Sheet, SGTIcon, SGTBadge } from './UIPrimitives';

const PA = SGT_DATA.PALETTE;

const TIPO_LABEL  = { 1: 'Permiso', 2: 'Botar turno', 3: 'Cobertura', 4: 'Intercambio' };
const TIPO_COLOR  = { 1: '#94B8E0', 2: '#D4888D', 3: '#88C4A8', 4: '#B89FD8' };
const MESES_CORTO = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
const MESES_FULL  = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const TIPO_ICON  = { 1: 'calendar', 2: 'close', 3: 'hand-raised', 4: 'swap' };
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

const SolicitudCard = ({ solicitud, canDecide, onAprobar, onRechazar, onEditMotivo, onResponderIntercambio, esMiReceptor }) => {
  const tipo  = solicitud?.tipoSolicitud?.tipo;
  const estado = solicitud?.estado;
  const esperandoReceptor = tipo === 4 && solicitud.aceptadoReceptor == null;
  const receptorAcepto    = tipo === 4 && solicitud.aceptadoReceptor === true;
  const receptorRechazo   = tipo === 4 && solicitud.aceptadoReceptor === false;

  const canDecideThis = canDecide && estado === 'PENDIENTE' && !esperandoReceptor && !receptorRechazo;
  const canRespond    = esMiReceptor && tipo === 4 && esperandoReceptor && estado === 'PENDIENTE';
  const canEditMotivo = !canDecide && !esMiReceptor && estado === 'PENDIENTE' && !!onEditMotivo;

  // Badge contextual para intercambio tipo=4
  let badgeLabel = estado;
  let badgeTone  = ESTADO_TONE[estado] || 'neutral';
  if (tipo === 4 && estado === 'PENDIENTE') {
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
          label={tipo === 2 ? 'Turno a liberar' : tipo === 3 ? 'Turno a cubrir' : tipo === 4 ? 'Turno a recibir' : 'Turno'}
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

      {/* Acciones receptor intercambio */}
      {canRespond && (
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <button onClick={() => onResponderIntercambio(solicitud.idSolicitud, false)} style={btnStyle('accent')}>
            <SGTIcon name="close" size={13} color="#B85A60" /> Rechazar
          </button>
          <button onClick={() => onResponderIntercambio(solicitud.idSolicitud, true)} style={{ ...btnStyle('primary'), flex: 1 }}>
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

// ── CrearSolicitudSheet ───────────────────────────────────────────────────────

const CrearSolicitudSheet = ({ open, onClose, userId, servicioId, onCreated }) => {
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
    if (!open || !tipoSel || step !== 2) return;
    setLoadingData(true);
    const fetches = [];
    if (tipoSel === 2 || tipoSel === 4)
      fetches.push(turnosService.getByMedico(userId).then(d => setMisTurnos(Array.isArray(d) ? d : [])).catch(() => {}));
    if (tipoSel === 3)
      fetches.push(turnosService.getSinAsignar(servicioId).then(d => setTurnosLibres(Array.isArray(d) ? d : [])).catch(() => {}));
    if (tipoSel === 4)
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
    return null;
  };

  const handleSubmit = async () => {
    setLoading(true); setError(null);
    try {
      const dto = buildDTO();
      if (!dto) { setError('Rellena todos los campos requeridos.'); setLoading(false); return; }
      await solicitudesService.crear(dto);
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
    turnoBotar:     { title: 'Turno a liberar',        items: misTurnos,                  keyFn: t => t.id,           row: turnoRow, onSel: t => setForm(f => ({ ...f, idTurno: t.id })) },
    turnoCobertura: { title: 'Turno a cubrir',          items: turnosLibres,                keyFn: t => t.id,           row: turnoRow, onSel: t => setForm(f => ({ ...f, idTurno: t.id })) },
    turnoPropio:    { title: 'Tu turno a entregar',     items: misTurnos,                  keyFn: t => t.id,           row: turnoRow, onSel: t => setForm(f => ({ ...f, idTurnoPropio: t.id })) },
    receptor:       { title: 'Funcionario receptor',    items: funcionarios,                keyFn: f => f.idFuncionario, row: funcRow,  onSel: f => setForm(prev => ({ ...prev, idReceptor: f.idFuncionario, idTurnoDeseado: undefined })) },
    turnoDeseado:   { title: 'Turno del receptor',      items: turnosReceptor,             keyFn: t => t.id,           row: turnoRow, onSel: t => setForm(f => ({ ...f, idTurnoDeseado: t.id })) },
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
  const turnoLabel = (list, id) => { const t = list.find(x => String(x.id) === String(id)); return t ? `${fmtFecha(t.diaInicioTurno)} ${fmtHora(t.horaInicio)}–${fmtHora(t.horaFin)}` : null; };
  const funcLabel  = (id) => { const f = funcionarios.find(x => String(x.idFuncionario) === String(id)); return f ? [f.nombre, f.apellidoPaterno].filter(Boolean).join(' ') : null; };

  const PickerBtn = ({ label, value, pkey }) => (
    <button onClick={() => openPicker(pkey)} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderRadius: 10, border: `1px solid ${value ? PA.primary : PA.line}`, background: '#fff', cursor: 'pointer' }}>
      <span style={{ fontSize: 14, color: value ? PA.ink : PA.ink3, fontWeight: value ? 700 : 500 }}>{value || label}</span>
      <SGTIcon name="chevron-right" size={16} color={PA.ink3} />
    </button>
  );

  const tipos = [
    { id: 1, label: 'Permiso',     desc: 'Solicitar un permiso o licencia',            icon: 'calendar'    },
    { id: 2, label: 'Botar turno', desc: 'Liberar un turno ya asignado',               icon: 'close'       },
    { id: 3, label: 'Cobertura',   desc: 'Ofrecerse a cubrir un turno disponible',     icon: 'hand-raised' },
    { id: 4, label: 'Intercambio', desc: 'Intercambiar un turno con otro funcionario', icon: 'swap'        },
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
              <div><label style={lbl}>Turno a liberar</label><PickerBtn label="Seleccionar turno" value={turnoLabel(misTurnos, form.idTurno)} pkey="turnoBotar" /></div>
            )}

            {tipoSel === 3 && (
              <div><label style={lbl}>Turno a cubrir</label><PickerBtn label="Seleccionar turno disponible" value={turnoLabel(turnosLibres, form.idTurno)} pkey="turnoCobertura" /></div>
            )}

            {tipoSel === 4 && (<>
              <div><label style={lbl}>Tu turno a entregar</label><PickerBtn label="Seleccionar tu turno" value={turnoLabel(misTurnos, form.idTurnoPropio)} pkey="turnoPropio" /></div>
              <div><label style={lbl}>Con quién intercambiar</label><PickerBtn label="Seleccionar funcionario" value={funcLabel(form.idReceptor)} pkey="receptor" /></div>
              {form.idReceptor && (
                <div><label style={lbl}>Turno del receptor que quieres</label><PickerBtn label="Seleccionar turno" value={turnoLabel(turnosReceptor, form.idTurnoDeseado)} pkey="turnoDeseado" /></div>
              )}
            </>)}

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

const SolicitudesView = ({ onBack }) => {
  const { user } = useAuth();
  const isMedico  = user?.rol === 'MEDICO';
  const canDecide = user?.rol === 'JEFATURA' || user?.rol === 'SUBROGANTE';

  const [tab, setTab]           = useState(isMedico ? 'mis' : 'pendientes');
  const [solicitudes, setSolicitudes] = useState([]);
  const [recibidas, setRecibidas]     = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [showCrear, setShowCrear]     = useState(false);
  const [editSolicitud, setEditSolicitud] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (isMedico) {
        const [mis, recv] = await Promise.all([
          solicitudesService.getByFuncionario(user.id),
          solicitudesService.getByReceptor(user.id),
        ]);
        setSolicitudes(Array.isArray(mis) ? mis : []);
        setRecibidas(Array.isArray(recv) ? recv : []);
      } else {
        const all = await solicitudesService.getAll();
        const arr = Array.isArray(all) ? all : [];
        // Filtrar por servicio: incluir si el turno pertenece al servicio activo o si no tiene turno (permiso)
        const filtered = arr.filter(s => !s.turno || String(s.turno.servicio?.idServicio) === String(user.servicioId));
        setSolicitudes(filtered);
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

  const currentList = (() => {
    if (tab === 'recibidas')  return recibidas;
    if (tab === 'mis')        return solicitudes;
    if (tab === 'pendientes') return solicitudes.filter(s => s.estado === 'PENDIENTE');
    if (tab === 'historial')  return solicitudes.filter(s => s.estado !== 'PENDIENTE');
    return solicitudes;
  })();

  const pendienteCount = solicitudes.filter(s => s.estado === 'PENDIENTE').length;
  const recibidasCount = recibidas.filter(s => s.estado === 'PENDIENTE').length;

  const TABS = isMedico
    ? [{ id: 'mis', label: 'Mis solicitudes', badge: null }, { id: 'recibidas', label: 'Recibidas', badge: recibidasCount }]
    : [{ id: 'pendientes', label: 'Pendientes', badge: pendienteCount }, { id: 'historial', label: 'Historial', badge: null }];

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

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 6, padding: '10px 14px 8px', background: '#fff', borderBottom: `1px solid ${PA.line2}` }}>
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

      {/* Lista */}
      <div style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: '12px 14px 24px' }}>
        {loading && (
          <div style={{ textAlign: 'center', padding: 40, color: PA.ink3, fontSize: 13, fontWeight: 600 }}>Cargando...</div>
        )}
        {!loading && error && (
          <div style={{ background: PA.accentSoft, color: '#B85A60', borderRadius: 10, padding: '10px 14px', fontSize: 13, fontWeight: 600, marginBottom: 12 }}>{error}</div>
        )}
        {!loading && !error && currentList.length === 0 && (
          <div style={{ textAlign: 'center', padding: 48, color: PA.ink3, fontSize: 13, fontWeight: 600 }}>
            <SGTIcon name="check-circle" size={32} color={PA.line} />
            <div style={{ marginTop: 10 }}>Sin solicitudes aquí.</div>
          </div>
        )}
        {!loading && currentList.map(s => (
          <SolicitudCard
            key={s.idSolicitud}
            solicitud={s}
            canDecide={canDecide}
            onAprobar={handleAprobar}
            onRechazar={handleRechazar}
            onEditMotivo={isMedico ? setEditSolicitud : null}
            onResponderIntercambio={handleResponder}
            esMiReceptor={tab === 'recibidas'}
          />
        ))}
      </div>

      <CrearSolicitudSheet
        open={showCrear}
        onClose={() => setShowCrear(false)}
        userId={user?.id}
        servicioId={user?.servicioId}
        onCreated={load}
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
