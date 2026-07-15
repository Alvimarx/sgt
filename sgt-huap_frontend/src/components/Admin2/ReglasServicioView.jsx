import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { SGT_DATA } from './data';
import { SGTBadge, SGTIcon } from '../Style/UIPrimitives';
import { reglasServicioService } from '../../services/reglasServicioService';
import { tiposTurnoService, formatHora, shiftHora, formatDesplazamientoHoras } from '../../services/rotativasService';

const HORAS_MIN = -5;
const HORAS_MAX = 5;

const FORM_VACIO = {
  idRegla: null,
  nombre: '',
  aplicaFinDeSemana: true,
  aplicaFeriado: true,
  horasDesplazar: '1',
  idTipoTurnoInicio: '',
  idTipoTurnoFin: '',
};

const ReglasServicioView = ({ onBack }) => {
  const PA = SGT_DATA.PALETTE;
  const { user } = useAuth();
  const servicioId = user?.servicioId;

  const [reglas, setReglas] = useState([]);
  const [tipos, setTipos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(FORM_VACIO);
  const [guardando, setGuardando] = useState(false);
  const [confirmDel, setConfirmDel] = useState(null);
  const [eliminando, setEliminando] = useState(false);

  const cargar = useCallback(async () => {
    if (!servicioId) { setError('No hay un servicio activo.'); setLoading(false); return; }
    setLoading(true); setError('');
    try {
      const [rs, ts] = await Promise.all([
        reglasServicioService.getByServicio(servicioId),
        tiposTurnoService.getByServicio(servicioId),
      ]);
      setReglas(Array.isArray(rs) ? rs : []);
      setTipos(Array.isArray(ts) ? ts : []);
    } catch {
      setError('No se pudieron cargar las reglas.');
    } finally {
      setLoading(false);
    }
  }, [servicioId]);

  useEffect(() => { cargar(); }, [cargar]);

  const abrirNueva = () => { setForm(FORM_VACIO); setFormOpen(true); };
  const abrirEdicion = (r) => {
    setForm({
      idRegla: r.idRegla,
      nombre: r.nombre ?? '',
      aplicaFinDeSemana: !!r.aplicaFinDeSemana,
      aplicaFeriado: !!r.aplicaFeriado,
      horasDesplazar: String((r.tiempoMinutos ?? 0) / 60),
      idTipoTurnoInicio: r.idTipoTurnoInicio ?? '',
      idTipoTurnoFin: r.idTipoTurnoFin ?? '',
    });
    setFormOpen(true);
  };
  const cerrarForm = () => { setFormOpen(false); setForm(FORM_VACIO); };

  const horasDesplazarNum = Number(form.horasDesplazar);
  const horasEnRango = Number.isInteger(horasDesplazarNum)
    && horasDesplazarNum >= HORAS_MIN && horasDesplazarNum <= HORAS_MAX;

  const puedeGuardar = form.nombre.trim() !== ''
    && (form.aplicaFinDeSemana || form.aplicaFeriado)
    && (form.idTipoTurnoInicio !== '' || form.idTipoTurnoFin !== '')
    && horasEnRango
    && !guardando;

  const guardar = async () => {
    setGuardando(true); setError('');
    const dto = {
      idServicio: Number(servicioId),
      nombre: form.nombre.trim(),
      aplicaFinDeSemana: form.aplicaFinDeSemana,
      aplicaFeriado: form.aplicaFeriado,
      tiempoMinutos: Math.round(horasDesplazarNum * 60),
      idTipoTurnoInicio: form.idTipoTurnoInicio !== '' ? Number(form.idTipoTurnoInicio) : null,
      idTipoTurnoFin: form.idTipoTurnoFin !== '' ? Number(form.idTipoTurnoFin) : null,
    };
    try {
      if (form.idRegla) await reglasServicioService.update(form.idRegla, dto);
      else await reglasServicioService.create(dto);
      cerrarForm();
      await cargar();
    } catch (e) {
      setError(e?.response?.data?.error || 'No se pudo guardar la regla.');
    } finally {
      setGuardando(false);
    }
  };

  const eliminar = async () => {
    if (!confirmDel) return;
    setEliminando(true);
    try {
      await reglasServicioService.remove(confirmDel.idRegla);
      setConfirmDel(null);
      await cargar();
    } catch (e) {
      setError(e?.response?.data?.error || 'No se pudo eliminar la regla.');
    } finally {
      setEliminando(false);
    }
  };

  const inputStyle = {
    width: '100%', padding: '12px 14px', borderRadius: 12, border: `1px solid ${PA.line}`,
    background: '#fff', fontSize: 15, color: PA.ink, fontWeight: 600,
    appearance: 'none', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
  };
  const labelStyle = { fontSize: 12, fontWeight: 800, color: PA.ink2, marginBottom: 6, display: 'block' };
  const checkRow = (checked, onClick, texto) => (
    <button onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 10, width: '100%', background: '#fff',
      border: `1px solid ${PA.line}`, borderRadius: 12, padding: '11px 14px', cursor: 'pointer', fontFamily: 'inherit',
    }}>
      <span style={{
        width: 20, height: 20, borderRadius: 6, flexShrink: 0, display: 'grid', placeItems: 'center',
        border: `2px solid ${checked ? PA.primary : PA.line}`, background: checked ? PA.primary : '#fff',
      }}>{checked && <SGTIcon name="check" size={13} color="#fff" />}</span>
      <span style={{ fontSize: 14, fontWeight: 700, color: PA.ink, textAlign: 'left' }}>{texto}</span>
    </button>
  );

  const selectTipo = (campo) => (
    <select
      value={form[campo]}
      onChange={e => setForm(f => ({ ...f, [campo]: e.target.value }))}
      style={inputStyle}
      disabled={tipos.length === 0}
    >
      <option value="">— Ninguno —</option>
      {tipos.map(t => (
        <option key={t.idTipoTurno} value={t.idTipoTurno}>
          {t.nombre} ({formatHora(t.horaInicio)}–{formatHora(t.horaTermino)})
        </option>
      ))}
    </select>
  );

  // Datos de un tipo de turno (horas base) para mostrar antes→después.
  const infoTipo = (idTipo, fallbackNombre) => {
    const t = tipos.find(x => x.idTipoTurno === idTipo);
    if (t) return { nombre: t.nombre, hi: t.horaInicio, hf: t.horaTermino };
    return { nombre: fallbackNombre || `#${idTipo}`, hi: null, hf: null };
  };

  // Una fila "Entrada/Salida · Tipo · HH:MM–HH:MM → HH:MM–HH:MM" con el extremo cambiado resaltado.
  const filaCambio = (idTipo, fallbackNombre, bound, tiempo) => {
    const { nombre, hi, hf } = infoTipo(idTipo, fallbackNombre);
    const tieneHoras = hi != null && hf != null;
    const despInicio = bound === 'inicio' ? shiftHora(hi, tiempo) : formatHora(hi);
    const despFin = bound === 'fin' ? shiftHora(hf, tiempo) : formatHora(hf);
    return (
      <div key={`${idTipo}-${bound}`} style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', fontSize: 12, fontWeight: 600 }}>
        <SGTBadge tone={bound === 'inicio' ? 'primary' : 'accent'} size="xs">{bound === 'inicio' ? 'Entrada' : 'Salida'}</SGTBadge>
        <span style={{ color: PA.ink, fontWeight: 700 }}>{nombre}</span>
        {tieneHoras ? (
          <>
            <span style={{ color: PA.ink3 }}>{formatHora(hi)}–{formatHora(hf)}</span>
            <SGTIcon name="arrow-right" size={12} color={PA.ink3} />
            <span>
              <span style={{ color: bound === 'inicio' ? PA.primary : PA.ink2, fontWeight: bound === 'inicio' ? 800 : 600 }}>{despInicio}</span>
              <span style={{ color: PA.ink3 }}>–</span>
              <span style={{ color: bound === 'fin' ? PA.primary : PA.ink2, fontWeight: bound === 'fin' ? 800 : 600 }}>{despFin}</span>
            </span>
          </>
        ) : (
          <span style={{ color: PA.ink3 }}>(horario no disponible)</span>
        )}
      </div>
    );
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: PA.surface2, animation: 'sgtFade .3s ease', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '16px', background: '#fff', borderBottom: `1px solid ${PA.line2}`, display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={onBack} style={{ background: 'transparent', border: 'none', padding: 4, cursor: 'pointer', display: 'flex' }}>
          <SGTIcon name="chevron-left" size={24} color={PA.ink} />
        </button>
        <div style={{ fontSize: 19, fontWeight: 800, color: PA.ink }}>Reglas de Horario del Servicio</div>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <p style={{ margin: 0, fontSize: 13, color: PA.ink3, fontWeight: 600, lineHeight: 1.5 }}>
          Ajusta automáticamente las horas de los turnos en fines de semana y feriados. Una regla puede
          correr la <strong>entrada</strong> de un tipo de turno y/o la <strong>salida</strong> de otro.
        </p>

        {error && (
          <div style={{ background: PA.accentSoft, border: '1px solid #F3D2D5', borderRadius: 12, padding: 12, fontSize: 13, color: '#8C3F44', fontWeight: 700 }}>
            {error}
          </div>
        )}

        {!formOpen && (
          <button onClick={abrirNueva} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '13px 0',
            borderRadius: 12, border: 'none', background: PA.primary, color: '#fff', fontSize: 14.5,
            fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit',
          }}>
            <SGTIcon name="plus" size={17} color="#fff" /> Nueva regla
          </button>
        )}

        {/* Formulario */}
        {formOpen && (
          <div style={{ background: '#fff', border: `1px solid ${PA.line}`, borderRadius: 14, padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: PA.ink }}>{form.idRegla ? 'Editar regla' : 'Nueva regla'}</div>

            <div>
              <label style={labelStyle}>Nombre de la regla</label>
              <input type="text" value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                placeholder="Ej.: Ajuste mañana finde/feriado" style={inputStyle} />
            </div>

            <div>
              <label style={labelStyle}>Condición</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {checkRow(form.aplicaFinDeSemana, () => setForm(f => ({ ...f, aplicaFinDeSemana: !f.aplicaFinDeSemana })), 'Fines de semana (sáb. y dom.)')}
                {checkRow(form.aplicaFeriado, () => setForm(f => ({ ...f, aplicaFeriado: !f.aplicaFeriado })), 'Feriados')}
              </div>
            </div>

            <div>
              <label style={labelStyle}>Tiempo a desplazar (horas)</label>
              <input
                type="number" step="1" min={HORAS_MIN} max={HORAS_MAX}
                value={form.horasDesplazar}
                onChange={e => setForm(f => ({ ...f, horasDesplazar: e.target.value }))}
                style={inputStyle}
              />
              <div style={{ fontSize: 11.5, color: PA.ink3, fontWeight: 600, marginTop: 6, lineHeight: 1.5 }}>
                Se suma a la entrada del tipo elegido en "inicio" y a la salida del tipo elegido en "fin".
                Ej.: +1 h corre la entrada del día de 08:00 a 09:00 y la salida de la noche a 09:00.
                Máximo ±{HORAS_MAX} h.
              </div>
              {!horasEnRango && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, fontSize: 12, color: '#8C3F44', fontWeight: 700 }}>
                  <SGTIcon name="alert" size={13} color="#8C3F44" />
                  El ajuste debe ser un número entero de horas, entre {HORAS_MIN} y {HORAS_MAX}.
                </div>
              )}
            </div>

            <div>
              <label style={labelStyle}>Tipo de turno cuya <strong>entrada</strong> se ajusta</label>
              {selectTipo('idTipoTurnoInicio')}
            </div>

            <div>
              <label style={labelStyle}>Tipo de turno cuya <strong>salida</strong> se ajusta</label>
              {selectTipo('idTipoTurnoFin')}
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={cerrarForm} disabled={guardando} style={{
                flex: '0 0 auto', padding: '13px 18px', borderRadius: 12, background: '#fff', color: PA.ink2,
                border: `1.5px solid ${PA.line}`, fontSize: 14, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit',
              }}>Cancelar</button>
              <button onClick={guardar} disabled={!puedeGuardar} style={{
                flex: 1, padding: '13px 0', borderRadius: 12, border: 'none',
                background: puedeGuardar ? PA.primary : PA.line, color: puedeGuardar ? '#fff' : PA.ink3,
                fontSize: 14.5, fontWeight: 800, cursor: puedeGuardar ? 'pointer' : 'not-allowed', fontFamily: 'inherit',
              }}>{guardando ? 'Guardando…' : 'Guardar regla'}</button>
            </div>
          </div>
        )}

        {/* Lista */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: 30, color: PA.ink3, fontSize: 13, fontWeight: 600 }}>Cargando…</div>
        ) : reglas.length === 0 && !formOpen ? (
          <div style={{ textAlign: 'center', padding: 30, color: PA.ink3, fontSize: 13, fontWeight: 600 }}>
            Aún no hay reglas configuradas.
          </div>
        ) : (
          reglas.map(r => (
            <div key={r.idRegla} style={{ background: '#fff', border: `1px solid ${PA.line2}`, borderRadius: 12, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 14, fontWeight: 800, color: PA.ink, flex: 1 }}>{r.nombre}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                {r.aplicaFinDeSemana && <SGTBadge tone="primary" size="xs">Fin de semana</SGTBadge>}
                {r.aplicaFeriado && <SGTBadge tone="primary" size="xs">Feriado</SGTBadge>}
                <SGTBadge tone="accent" size="xs">{formatDesplazamientoHoras(r.tiempoMinutos)}</SGTBadge>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {r.idTipoTurnoInicio != null && filaCambio(r.idTipoTurnoInicio, r.nombreTipoTurnoInicio, 'inicio', r.tiempoMinutos)}
                {r.idTipoTurnoFin != null && filaCambio(r.idTipoTurnoFin, r.nombreTipoTurnoFin, 'fin', r.tiempoMinutos)}
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button onClick={() => abrirEdicion(r)} style={{ display: 'flex', alignItems: 'center', gap: 5, background: PA.surface2, border: `1px solid ${PA.line}`, borderRadius: 9, padding: '7px 12px', fontSize: 12.5, fontWeight: 700, color: PA.ink2, cursor: 'pointer', fontFamily: 'inherit' }}>
                  <SGTIcon name="sliders" size={13} color={PA.ink2} /> Editar
                </button>
                <button onClick={() => setConfirmDel(r)} style={{ display: 'flex', alignItems: 'center', gap: 5, background: PA.accentSoft, border: '1px solid #F3D2D5', borderRadius: 9, padding: '7px 12px', fontSize: 12.5, fontWeight: 700, color: '#8C3F44', cursor: 'pointer', fontFamily: 'inherit' }}>
                  <SGTIcon name="close" size={13} color="#8C3F44" /> Eliminar
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Confirmación de borrado */}
      {confirmDel && (
        <div onClick={() => !eliminando && setConfirmDel(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.4)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 300 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: '20px 20px 0 0', padding: '24px 20px 32px', width: '100%', maxWidth: 480 }}>
            <div style={{ fontSize: 17, fontWeight: 800, color: PA.ink, marginBottom: 8 }}>Eliminar regla</div>
            <p style={{ fontSize: 13.5, color: PA.ink3, fontWeight: 600, margin: '0 0 20px', lineHeight: 1.5 }}>
              La regla "{confirmDel.nombre}" dejará de aplicarse en las próximas generaciones. Los turnos ya creados no se modifican.
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setConfirmDel(null)} disabled={eliminando} style={{ flex: 1, padding: '13px 0', borderRadius: 12, background: '#fff', color: PA.ink2, border: `1.5px solid ${PA.line}`, fontSize: 14, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit' }}>Cancelar</button>
              <button onClick={eliminar} disabled={eliminando} style={{ flex: 1, padding: '13px 0', borderRadius: 12, background: '#B85A60', color: '#fff', border: 'none', fontSize: 14, fontWeight: 800, cursor: eliminando ? 'not-allowed' : 'pointer', opacity: eliminando ? 0.7 : 1, fontFamily: 'inherit' }}>{eliminando ? 'Eliminando…' : 'Eliminar'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReglasServicioView;
