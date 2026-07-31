import { useState, useCallback, useEffect, useRef } from 'react';
import { Clock, Plus, Pencil, Trash2, X, Check, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { tiposTurnoService, formatHora } from '../../services/rotativasService';
import { SGTIcon, TopHeader } from '../Style/UIPrimitives';
import { SGT_DATA } from './data';

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

// ─── Sub-componente: card de tipo de turno ──────────────────────────────────
function TurnoCard({ turno, index, onEdit, onDelete }) {
    const c = turnoColor(index);
    return (
        <div style={{
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
function TurnoForm({ inicial, onSave, onCancel, saving }) {
    const [nombre, setNombre]           = useState(inicial?.nombre        ?? '');
    const [horaInicio, setHoraInicio]   = useState(formatHora(inicial?.horaInicio)  || '');
    const [horaTermino, setHoraTermino] = useState(formatHora(inicial?.horaTermino) || '');
    const [err, setErr]                 = useState('');
    const nombreRef = useRef(null);

    useEffect(() => { nombreRef.current?.focus(); }, []);

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

    return (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: PA.surface2, animation: 'sgtSlideLeft .3s ease', overflow: 'hidden' }}>

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
                    <div style={{ padding: 40, textAlign: 'center', color: PA.ink3, fontSize: 14 }}>
                        Cargando…
                    </div>
                ) : tipos.length === 0 ? (
                    <div style={{
                        background: '#fff', borderRadius: 16, border: 'none',
                        boxShadow: '0 2px 10px rgba(15,23,42,0.06)', padding: 48, textAlign: 'center',
                    }}>
                        <Clock size={36} style={{ color: PA.ink3, marginBottom: 12 }} />
                        <p style={{ margin: '0 0 14px', color: PA.ink3, fontSize: 14 }}>
                            No hay tipos de turno definidos para este servicio.
                        </p>
                        <button
                            onClick={openCreate}
                            style={{
                                padding: '9px 20px', borderRadius: 10,
                                background: PA.primary, color: '#fff', border: 'none',
                                fontSize: 13, fontWeight: 600, cursor: 'pointer',
                            }}
                        >
                            Crear el primero
                        </button>
                    </div>
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
