import { useState, useCallback, useEffect, useRef } from 'react';
import { Clock, Plus, Pencil, Trash2, X, Check, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { tiposTurnoService, formatHora } from '../../services/rotativasService';
import { SGTIcon, TopHeader, Sheet, ConfirmDialog } from '../Style/UIPrimitives';
import { ListEmptyState, LoadingState } from '../Style/ListControls';
import { SGT_DATA } from './data';
import { useLayout } from '../../layout/layout';
import { EncabezadoDesktop, PaginaDesktop, PanelDesktop, TablaDesktop, CampoDesktop, BotonDesktop, ChipDesktop, AvisoDesktop } from '../Desktop/ui';
import { AvisoMantenedorDesktop } from '../Desktop/admin/PiezasMantenedoresDesktop';

// ─── Paleta de colores compartida con el resto de la app ───────────────────
const PA = SGT_DATA.PALETTE;

// Asigna un color distinto a cada tipo de turno según su posición en la lista
const HUES = [250, 150, 30, 85, 320, 200, 45, 170];
const turnoColor = (index) => {
    const h = HUES[index % HUES.length];
    return {
        bg: `oklch(0.93 0.05 ${h})`, ink: `oklch(0.30 0.10 ${h})`, border: `oklch(0.80 0.08 ${h})`,
        grad: `linear-gradient(150deg, oklch(0.72 0.12 ${h}) 0%, oklch(0.42 0.12 ${h}) 100%)`,
        glow: `oklch(0.55 0.12 ${h} / 0.35)`,
    };
};

// Duración de un horario "HH:MM"–"HH:MM" en minutos (cruza medianoche si el
// término es anterior o igual al inicio). Solo para mostrar en desktop.
const duracionMinutos = (inicio, termino) => {
    const aMin = (h) => { const [hh, mm] = String(h || '').split(':').map(Number); return (hh || 0) * 60 + (mm || 0); };
    const dur = (aMin(termino) - aMin(inicio) + 1440) % 1440;
    return dur === 0 ? 1440 : dur;
};
const fmtDuracion = (min) => {
    const h = Math.floor(min / 60);
    const m = min % 60;
    return m ? `${h} h ${m} min` : `${h} h`;
};

// ─── Sub-componente: card de tipo de turno ──────────────────────────────────
function TurnoCard({ turno, index, onEdit, onDelete }) {
    const c = turnoColor(index);
    return (
        <div className="sgt-list-row" style={{
            background: '#fff', borderRadius: 16,
            border: 'none', boxShadow: '0 2px 10px rgba(15,23,42,0.06)', overflow: 'hidden',
        }}>
            <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                    width: 44, height: 44, borderRadius: 12,
                    background: c.grad, display: 'grid', placeItems: 'center', flexShrink: 0,
                    boxShadow: `0 6px 14px ${c.glow}, inset 0 1.5px 0 rgba(255,255,255,0.55), inset 0 -3px 5px rgba(0,0,0,0.18)`,
                }}>
                    <Clock size={20} color="#fff" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 15, color: c.ink, marginBottom: 4 }}>
                        {turno.nombre}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: PA.ink3, fontWeight: 600 }}>
                        <Clock size={11} />
                        <span style={{ fontFamily: 'monospace' }}>{formatHora(turno.horaInicio)}</span>
                        <span>–</span>
                        <span style={{ fontFamily: 'monospace' }}>{formatHora(turno.horaTermino)}</span>
                    </div>
                </div>
            </div>
            <div style={{ display: 'flex', borderTop: `1px solid ${PA.line}` }}>
                <button
                    onClick={() => onEdit(turno)}
                    style={{
                        flex: 1, padding: '11px 0',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                        background: 'none', border: 'none', borderRight: `1px solid ${PA.line}`,
                        cursor: 'pointer', fontSize: 13, fontWeight: 600, color: PA.ink2,
                    }}
                >
                    <Pencil size={14} /> Editar
                </button>
                <button
                    onClick={() => onDelete(turno)}
                    style={{
                        flex: 1, padding: '11px 0',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                        background: 'none', border: 'none',
                        cursor: 'pointer', fontSize: 13, fontWeight: 600, color: PA.warn,
                    }}
                >
                    <Trash2 size={14} /> Eliminar
                </button>
            </div>
        </div>
    );
}

// ─── Sub-componente: formulario de creación/edición ─────────────────────────
function TurnoForm({ inicial, onSave, onCancel, saving, desktop = false, errorGuardado = '' }) {
    const [nombre, setNombre]           = useState(inicial?.nombre        ?? '');
    const [horaInicio, setHoraInicio]   = useState(formatHora(inicial?.horaInicio)  || '');
    const [horaTermino, setHoraTermino] = useState(formatHora(inicial?.horaTermino) || '');
    const [err, setErr]                 = useState('');
    const nombreRef = useRef(null);

    useEffect(() => { nombreRef.current?.focus(); }, []);
    // Desktop: el panel lateral toma el foco al abrirse (después que este
    // efecto); se devuelve al nombre en el tick siguiente.
    useEffect(() => {
        if (!desktop) return undefined;
        const t = setTimeout(() => nombreRef.current?.focus(), 0);
        return () => clearTimeout(t);
    }, [desktop]);
    // Desktop: el panel lateral tapa la página, donde la vista muestra el error
    // de un guardado fallido; se repite aquí el del último intento hecho con el
    // panel abierto (no uno anterior que ya estaba en la página).
    const [errorIntento, setErrorIntento] = useState('');
    const guardandoAntes = useRef(saving);
    useEffect(() => {
        if (!desktop) return;
        if (saving) setErrorIntento('');
        else if (guardandoAntes.current) setErrorIntento(errorGuardado || '');
        guardandoAntes.current = saving;
    }, [desktop, saving, errorGuardado]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!nombre.trim())     return setErr('El nombre es obligatorio.');
        if (!horaInicio)        return setErr('Indica la hora de inicio.');
        if (!horaTermino)       return setErr('Indica la hora de término.');
        if (horaInicio === horaTermino) return setErr('Inicio y término no pueden ser iguales.');
        setErr('');
        onSave({ nombre: nombre.trim(), horaInicio, horaTermino });
    };

    const inputStyle = {
        padding: '8px 12px', borderRadius: 8, border: `1px solid ${PA.line}`,
        fontSize: 14, color: PA.ink, background: PA.surface, width: '100%',
        outline: 'none', boxSizing: 'border-box',
    };
    const labelStyle = { fontSize: 12, color: PA.ink3, marginBottom: 4, display: 'block' };

    // Desktop (R18): el mismo formulario y la misma validación, dentro del
    // panel lateral (el título lo pone el panel).
    if (desktop) {
        const completo = horaInicio && horaTermino && horaInicio !== horaTermino;
        const cruza = completo && horaTermino <= horaInicio;
        return (
            <form onSubmit={handleSubmit} className="sgt-da-mant-form" noValidate>
                <div className="sgt-da-mant-form__cuerpo">
                    <CampoDesktop etiqueta="Nombre del turno" htmlFor="tipo-turno-nombre">
                        <input
                            id="tipo-turno-nombre"
                            ref={nombreRef}
                            className="sgt-d-input"
                            value={nombre}
                            onChange={e => setNombre(e.target.value)}
                            placeholder="ej. Diurno, Nocturno, Guardia…"
                        />
                    </CampoDesktop>
                    <div className="sgt-d-formulario">
                        <CampoDesktop etiqueta="Hora inicio" htmlFor="tipo-turno-inicio">
                            <input id="tipo-turno-inicio" type="time" className="sgt-d-input" value={horaInicio} onChange={e => setHoraInicio(e.target.value)} />
                        </CampoDesktop>
                        <CampoDesktop etiqueta="Hora término" htmlFor="tipo-turno-termino">
                            <input id="tipo-turno-termino" type="time" className="sgt-d-input" value={horaTermino} onChange={e => setHoraTermino(e.target.value)} />
                        </CampoDesktop>
                    </div>
                    {completo && (
                        <AvisoDesktop>
                            Duración: <strong>{fmtDuracion(duracionMinutos(horaInicio, horaTermino))}</strong>
                            {cruza ? ' · termina al día siguiente.' : '.'}
                        </AvisoDesktop>
                    )}
                    {err && <AvisoMantenedorDesktop tono="alerta" icono="alert">{err}</AvisoMantenedorDesktop>}
                    {!err && errorIntento && <AvisoMantenedorDesktop tono="alerta" icono="alert">{errorIntento}</AvisoMantenedorDesktop>}
                </div>
                <div className="sgt-da-mant-form__pie">
                    <BotonDesktop variante="secundario" onClick={onCancel}>Cancelar</BotonDesktop>
                    <BotonDesktop type="submit" variante="primario" icono="check" disabled={saving}>
                        {saving ? 'Guardando…' : 'Guardar'}
                    </BotonDesktop>
                </div>
            </form>
        );
    }

    return (
        <form onSubmit={handleSubmit} style={{
            background: PA.surface2, border: `1px solid ${PA.line}`,
            borderRadius: 12, padding: 20, display: 'flex', flexDirection: 'column', gap: 14,
        }}>
            <div style={{ fontWeight: 600, color: PA.ink, fontSize: 15 }}>
                {inicial ? 'Editar tipo de turno' : 'Nuevo tipo de turno'}
            </div>

            <div>
                <label style={labelStyle}>Nombre del turno</label>
                <input
                    ref={nombreRef}
                    value={nombre}
                    onChange={e => setNombre(e.target.value)}
                    placeholder="ej. Diurno, Nocturno, Guardia…"
                    style={inputStyle}
                />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                    <label style={labelStyle}>Hora inicio</label>
                    <input
                        type="time"
                        value={horaInicio}
                        onChange={e => setHoraInicio(e.target.value)}
                        style={inputStyle}
                    />
                </div>
                <div>
                    <label style={labelStyle}>Hora término</label>
                    <input
                        type="time"
                        value={horaTermino}
                        onChange={e => setHoraTermino(e.target.value)}
                        style={inputStyle}
                    />
                </div>
            </div>

            {err && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: PA.warn, fontSize: 13 }}>
                    <AlertCircle size={14} /> {err}
                </div>
            )}

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button type="button" onClick={onCancel} style={{
                    padding: '7px 16px', borderRadius: 8, border: `1px solid ${PA.line}`,
                    background: 'none', color: PA.ink2, fontSize: 13, cursor: 'pointer'
                }}>
                    <X size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                    Cancelar
                </button>
                <button type="submit" disabled={saving} style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '7px 16px', borderRadius: 8,
                    background: PA.primary, color: '#fff', border: 'none',
                    fontSize: 13, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1
                }}>
                    <Check size={13} />
                    {saving ? 'Guardando…' : 'Guardar'}
                </button>
            </div>
        </form>
    );
}

// ─── Sub-componente: confirmación de eliminación (bottom-sheet) ─────────────
function ConfirmDelete({ turno, rotativas = [], loadingImpacto = false, onConfirm, onCancel, deleting }) {
    const hayImpacto = rotativas.length > 0;
    return (
        <div
            onClick={onCancel}
            style={{
                position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
                display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 1000,
            }}
        >
            <div
                onClick={e => e.stopPropagation()}
                style={{
                    background: '#fff', borderRadius: '20px 20px 0 0',
                    padding: '8px 20px 36px', width: '100%', maxWidth: 480,
                    boxShadow: '0 -8px 40px rgba(0,0,0,0.18)',
                }}
            >
                {/* Handle */}
                <div style={{ display: 'flex', justifyContent: 'center', paddingBottom: 16 }}>
                    <div style={{ width: 40, height: 4, background: PA.line, borderRadius: 99 }} />
                </div>

                {/* Ícono de advertencia */}
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}>
                    <div style={{
                        width: 56, height: 56, borderRadius: 16,
                        background: PA.warnSoft, display: 'grid', placeItems: 'center',
                    }}>
                        <Trash2 size={26} color={PA.warn} />
                    </div>
                </div>

                <div style={{ fontWeight: 800, fontSize: 18, color: PA.ink, textAlign: 'center', marginBottom: 10 }}>
                    ¿Eliminar tipo de turno?
                </div>

                <p style={{ fontSize: 14, color: PA.ink2, margin: '0 0 6px', lineHeight: 1.55, textAlign: 'center' }}>
                    Estás a punto de eliminar <strong style={{ color: PA.ink }}>{turno.nombre}</strong> del catálogo.
                </p>

                {loadingImpacto ? (
                    <p style={{ fontSize: 13, color: PA.ink3, margin: '0 0 24px', lineHeight: 1.5, textAlign: 'center' }}>
                        Verificando uso en rotativas…
                    </p>
                ) : hayImpacto ? (
                    <div style={{
                        background: PA.warnSoft, borderRadius: 12, padding: '12px 14px',
                        margin: '4px 0 22px', textAlign: 'left',
                    }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
                            <AlertCircle size={16} color={PA.warn} style={{ flexShrink: 0, marginTop: 1 }} />
                            <div style={{ fontSize: 13, color: PA.ink2, lineHeight: 1.5 }}>
                                Este turno está en uso en{' '}
                                <strong style={{ color: PA.ink }}>
                                    {rotativas.length} rotativa{rotativas.length === 1 ? '' : 's'}
                                </strong>. Esos días pasarán a quedar <strong style={{ color: PA.ink }}>libres</strong>.
                            </div>
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, paddingLeft: 24 }}>
                            {rotativas.map((nombre) => (
                                <span key={nombre} style={{
                                    fontSize: 12, fontWeight: 600, color: PA.warn,
                                    background: '#fff', borderRadius: 999, padding: '3px 10px',
                                    border: `1px solid ${PA.line}`,
                                }}>
                                    {nombre}
                                </span>
                            ))}
                        </div>
                    </div>
                ) : (
                    <p style={{ fontSize: 13, color: PA.ink3, margin: '0 0 24px', lineHeight: 1.5, textAlign: 'center' }}>
                        No está asignado a ninguna rotativa. Esta acción no se puede deshacer.
                    </p>
                )}

                <div style={{ display: 'flex', gap: 10 }}>
                    <button
                        onClick={onCancel}
                        style={{
                            flex: 1, padding: '13px 0', borderRadius: 12,
                            border: `1.5px solid ${PA.line}`, background: 'none',
                            color: PA.ink2, fontSize: 15, fontWeight: 700, cursor: 'pointer',
                        }}
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={deleting || loadingImpacto}
                        style={{
                            flex: 1, padding: '13px 0', borderRadius: 12,
                            border: 'none', background: PA.warn, color: '#fff',
                            fontSize: 15, fontWeight: 700,
                            cursor: (deleting || loadingImpacto) ? 'not-allowed' : 'pointer',
                            opacity: (deleting || loadingImpacto) ? 0.7 : 1,
                        }}
                    >
                        {deleting ? 'Eliminando…' : hayImpacto ? 'Sí, eliminar igual' : 'Sí, eliminar'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Vista principal ─────────────────────────────────────────────────────────
export default function TiposTurnoView({ onBack }) {
    const { user } = useAuth();
    const { esDesktop } = useLayout();

    const [tipos,       setTipos]       = useState([]);
    const [loading,     setLoading]     = useState(false);
    const [error,       setError]       = useState('');
    const [showForm,    setShowForm]    = useState(false);
    const [editing,     setEditing]     = useState(null);   // TurnoDTO siendo editado
    const [confirmDel,  setConfirmDel]  = useState(null);   // TurnoDTO a eliminar
    const [afectadas,   setAfectadas]   = useState([]);     // nombres de rotativas afectadas
    const [loadingImpacto, setLoadingImpacto] = useState(false);
    const [saving,      setSaving]      = useState(false);
    const [deleting,    setDeleting]    = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const data = await tiposTurnoService.getByServicio(user?.servicioId);
            setTipos(Array.isArray(data) ? data : []);
        } catch (e) {
            setError(e?.response?.data || e.message || 'Error al cargar los tipos de turno.');
        } finally {
            setLoading(false);
        }
    }, [user?.servicioId]);

    useEffect(() => { load(); }, [load]);

    const handleSave = useCallback(async ({ nombre, horaInicio, horaTermino }) => {
        setSaving(true);
        try {
            if (editing) {
                await tiposTurnoService.update(editing.idTipoTurno, { nombre, horaInicio, horaTermino });
            } else {
                await tiposTurnoService.create({ nombre, horaInicio, horaTermino, idServicio: user?.servicioId });
            }
            setShowForm(false);
            setEditing(null);
            await load();
        } catch (e) {
            setError(e?.response?.data || e.message || 'Error al guardar.');
        } finally {
            setSaving(false);
        }
    }, [editing, user?.servicioId, load]);

    const openConfirmDelete = useCallback(async (turno) => {
        setConfirmDel(turno);
        setAfectadas([]);
        setLoadingImpacto(true);
        try {
            const rotativas = await tiposTurnoService.getRotativasAfectadas(turno.idTipoTurno);
            setAfectadas(rotativas);
        } catch {
            // Si no se pudo consultar el impacto, se permite eliminar igual sin la advertencia.
            setAfectadas([]);
        } finally {
            setLoadingImpacto(false);
        }
    }, []);

    const handleDelete = useCallback(async () => {
        if (!confirmDel) return;
        setDeleting(true);
        try {
            await tiposTurnoService.delete(confirmDel.idTipoTurno);
            setConfirmDel(null);
            await load();
        } catch (e) {
            setError(e?.response?.data || e.message || 'Error al eliminar.');
            setConfirmDel(null);
        } finally {
            setDeleting(false);
        }
    }, [confirmDel, load]);

    const openCreate = () => { setEditing(null); setShowForm(true); };
    const openEdit   = (t) => { setEditing(t);   setShowForm(true); };
    const closeForm  = () => { setEditing(null); setShowForm(false); };

    // ─── Desktop (R18) ───────────────────────────────────────────────────────
    // Vista raíz del menú (sin volver). Tabla con el horario y la duración de
    // cada tipo; crear y editar con el mismo TurnoForm en un panel lateral;
    // eliminar con la misma consulta de rotativas afectadas, en ConfirmDialog.
    if (esDesktop) {
        const hayImpacto = afectadas.length > 0;
        const servicio = localStorage.getItem('sgt_servicio_activo_nombre');
        return (
            <>
                <EncabezadoDesktop
                    titulo="Tipos de Turno"
                    subtitulo={`${servicio ? `${servicio} · ` : ''}Horarios que usan las rotativas y la planificación del servicio.`}
                    acciones={<BotonDesktop variante="primario" icono="plus" onClick={openCreate}>Nuevo tipo de turno</BotonDesktop>}
                />
                <PaginaDesktop ancho="medio" llena>
                    {error && (
                        <AvisoMantenedorDesktop tono="alerta" icono="alert" onCerrar={() => setError('')}>{error}</AvisoMantenedorDesktop>
                    )}
                    <PanelDesktop
                        llena
                        titulo="Catálogo de tipos de turno"
                        subtitulo={loading ? 'Cargando tipos de turno…' : `${tipos.length} ${tipos.length === 1 ? 'tipo' : 'tipos'} en el servicio`}
                        icono="clock"
                        iconoColor="#0F766E"
                        iconoFondo="#E0F2EF"
                        sinPadding
                    >
                        <TablaDesktop
                            ariaLabel="Tipos de turno del servicio"
                            cargando={loading}
                            filas={loading ? [] : tipos}
                            claveFila={(t) => t.idTipoTurno}
                            filaSeleccionada={showForm && editing ? editing.idTipoTurno : undefined}
                            vacio="No hay tipos de turno definidos para este servicio. Crea el primero con «Nuevo tipo de turno»."
                            columnas={[
                                {
                                    id: 'nombre', titulo: 'Tipo de turno',
                                    render: (t) => {
                                        const c = turnoColor(tipos.indexOf(t));
                                        return (
                                            <span className="sgt-da-mant-celda">
                                                <span className="sgt-da-mant-icono" style={{ background: c.bg, color: c.ink }} aria-hidden="true"><Clock size={14} /></span>
                                                <span className="sgt-da-mant-celda__nombre">{t.nombre}</span>
                                            </span>
                                        );
                                    },
                                },
                                {
                                    id: 'horario', titulo: 'Horario', ancho: 150,
                                    render: (t) => <span className="sgt-da-mant-horario">{formatHora(t.horaInicio)} – {formatHora(t.horaTermino)}</span>,
                                },
                                {
                                    id: 'duracion', titulo: 'Duración', ancho: 200,
                                    render: (t) => {
                                        const hi = formatHora(t.horaInicio);
                                        const ht = formatHora(t.horaTermino);
                                        return (
                                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                                                <span className="sgt-da-mant-num">{fmtDuracion(duracionMinutos(hi, ht))}</span>
                                                {ht <= hi && <ChipDesktop>Cruza medianoche</ChipDesktop>}
                                            </span>
                                        );
                                    },
                                },
                                {
                                    id: 'acciones', titulo: 'Acciones', ancho: 220, alinear: 'derecha',
                                    render: (t) => (
                                        <span className="sgt-da-mant-acciones">
                                            <BotonDesktop tamano="sm" variante="secundario" onClick={() => openEdit(t)} aria-label={`Editar ${t.nombre}`}>
                                                <Pencil size={12} aria-hidden="true" />Editar
                                            </BotonDesktop>
                                            <BotonDesktop tamano="sm" variante="peligro" onClick={() => openConfirmDelete(t)} aria-label={`Eliminar ${t.nombre}`}>
                                                <Trash2 size={12} aria-hidden="true" />Eliminar
                                            </BotonDesktop>
                                        </span>
                                    ),
                                },
                            ]}
                        />
                    </PanelDesktop>
                </PaginaDesktop>

                <Sheet open={showForm} onClose={closeForm} title={editing ? 'Editar tipo de turno' : 'Nuevo tipo de turno'} anchoDesktop="md">
                    <TurnoForm
                        key={editing ? editing.idTipoTurno : 'nuevo'}
                        desktop
                        inicial={editing}
                        onSave={handleSave}
                        onCancel={closeForm}
                        saving={saving}
                        errorGuardado={error}
                    />
                </Sheet>

                <ConfirmDialog
                    open={!!confirmDel}
                    icon="alert" tone="danger"
                    title="¿Eliminar tipo de turno?"
                    busy={deleting || loadingImpacto}
                    confirmLabel={deleting ? 'Eliminando…' : hayImpacto ? 'Sí, eliminar igual' : 'Sí, eliminar'}
                    onConfirm={handleDelete}
                    onCancel={() => setConfirmDel(null)}
                >
                    <div style={{ marginBottom: 8 }}>
                        Estás a punto de eliminar <strong style={{ color: PA.ink }}>{confirmDel?.nombre}</strong> del catálogo.
                    </div>
                    {loadingImpacto ? (
                        <div style={{ fontSize: 12.5, color: PA.ink3 }}>Verificando uso en rotativas…</div>
                    ) : hayImpacto ? (
                        <div style={{ background: PA.warnSoft, borderRadius: 12, padding: '10px 12px', textAlign: 'left' }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
                                <AlertCircle size={16} color={PA.warn} style={{ flexShrink: 0, marginTop: 1 }} />
                                <div style={{ fontSize: 12.5, color: PA.ink2, lineHeight: 1.5 }}>
                                    Este turno está en uso en{' '}
                                    <strong style={{ color: PA.ink }}>{afectadas.length} rotativa{afectadas.length === 1 ? '' : 's'}</strong>.
                                    Esos días pasarán a quedar <strong style={{ color: PA.ink }}>libres</strong>.
                                </div>
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, paddingLeft: 24 }}>
                                {afectadas.map((nombre) => (
                                    <span key={nombre} style={{ fontSize: 11.5, fontWeight: 700, color: PA.warn, background: '#fff', borderRadius: 999, padding: '2px 9px', border: `1px solid ${PA.line}` }}>
                                        {nombre}
                                    </span>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div style={{ fontSize: 12.5, color: PA.ink3 }}>No está asignado a ninguna rotativa. Esta acción no se puede deshacer.</div>
                    )}
                </ConfirmDialog>
            </>
        );
    }

    return (
        <div className="dash-page-bg" style={{ flex: 1, display: 'flex', flexDirection: 'column', animation: 'sgtSlideLeft .3s ease', overflow: 'hidden' }}>

            {/* Header con botón volver */}
            <TopHeader
                title="Tipos de Turno"
                leftSlot={
                    <button onClick={onBack} style={{ background: 'transparent', border: 'none', padding: 4, cursor: 'pointer', display: 'flex' }}>
                        <SGTIcon name="chevron-left" size={24} color={PA.ink} />
                    </button>
                }
                rightSlot={
                    <button
                        onClick={openCreate}
                        style={{
                            display: 'flex', alignItems: 'center', gap: 6,
                            padding: '9px 14px', borderRadius: 10,
                            background: PA.primary, color: '#fff', border: 'none',
                            fontSize: 13, fontWeight: 700, cursor: 'pointer',
                        }}
                    >
                        <Plus size={15} /> Nuevo
                    </button>
                }
            />

            {/* Contenido scrollable */}
            <div style={{ flex: 1, overflow: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>

                {/* Error global */}
                {error && (
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        background: PA.warnSoft, color: PA.warn, borderRadius: 10, padding: '10px 16px', fontSize: 13
                    }}>
                        <AlertCircle size={15} />
                        {error}
                        <button onClick={() => setError('')} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: PA.warn }}>
                            <X size={14} />
                        </button>
                    </div>
                )}

                {/* Formulario de creación/edición */}
                {showForm && (
                    <TurnoForm
                        inicial={editing}
                        onSave={handleSave}
                        onCancel={closeForm}
                        saving={saving}
                    />
                )}

                {/* Lista de tipos de turno */}
                {loading ? (
                    <LoadingState label="Cargando tipos de turno…" />
                ) : tipos.length === 0 ? (
                    <ListEmptyState
                        icon="clock" theme="teal"
                        title="Sin tipos de turno"
                        message="No hay tipos de turno definidos para este servicio."
                        action={
                            <button
                                onClick={openCreate}
                                style={{
                                    padding: '9px 20px', borderRadius: 10, marginTop: 4,
                                    background: PA.primary, color: '#fff', border: 'none',
                                    fontSize: 13, fontWeight: 600, cursor: 'pointer',
                                }}
                            >
                                Crear el primero
                            </button>
                        }
                    />
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {tipos.map((t, i) => (
                            <TurnoCard
                                key={t.idTipoTurno}
                                turno={t}
                                index={i}
                                onEdit={openEdit}
                                onDelete={openConfirmDelete}
                            />
                        ))}
                    </div>
                )}

            </div>

            {/* Diálogo de confirmación (overlay fijo, fuera del scroll) */}
            {confirmDel && (
                <ConfirmDelete
                    turno={confirmDel}
                    rotativas={afectadas}
                    loadingImpacto={loadingImpacto}
                    onConfirm={handleDelete}
                    onCancel={() => setConfirmDel(null)}
                    deleting={deleting}
                />
            )}
        </div>
    );
}
