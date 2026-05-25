import { useState, useCallback, useEffect, useRef } from 'react';
import { Clock, Plus, Pencil, Trash2, X, Check, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { tiposTurnoService, formatHora } from '../../services/plantillasService';
import { SGTIcon } from './UIPrimitives';

// ─── Paleta de colores reutilizable ────────────────────────────────────────
const PA = {
    primary:     'var(--primary)',
    primarySoft: 'var(--primary-soft)',
    accent:      'var(--accent)',
    accentSoft:  'var(--accent-soft)',
    warn:        'var(--warn)',
    warnSoft:    'var(--warn-soft)',
    success:     'var(--success)',
    ink:         'var(--ink)',
    ink2:        'var(--ink2)',
    ink3:        'var(--ink3)',
    line:        'var(--line)',
    surface:     'var(--surface)',
    surface2:    'var(--surface2)',
};

// Asigna un color distinto a cada tipo de turno según su posición en la lista
const HUES = [250, 150, 30, 85, 320, 200, 45, 170];
const turnoColor = (index) => {
    const h = HUES[index % HUES.length];
    return { bg: `oklch(0.93 0.05 ${h})`, ink: `oklch(0.30 0.10 ${h})`, border: `oklch(0.80 0.08 ${h})` };
};

// ─── Sub-componente: fila de tabla ──────────────────────────────────────────
function TurnoRow({ turno, index, onEdit, onDelete }) {
    const c = turnoColor(index);
    return (
        <tr style={{ borderBottom: `1px solid ${PA.line}` }}>
            <td style={{ padding: '12px 16px' }}>
                <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    background: c.bg, color: c.ink, border: `1px solid ${c.border}`,
                    borderRadius: 6, padding: '3px 10px', fontSize: 13, fontWeight: 600
                }}>
                    <Clock size={13} />
                    {turno.nombre}
                </span>
            </td>
            <td style={{ padding: '12px 16px', fontSize: 14, color: PA.ink2, fontFamily: 'monospace' }}>
                {formatHora(turno.horaInicio)}
            </td>
            <td style={{ padding: '12px 16px', fontSize: 14, color: PA.ink2, fontFamily: 'monospace' }}>
                {formatHora(turno.horaTermino)}
            </td>
            <td style={{ padding: '12px 16px' }}>
                <div style={{ display: 'flex', gap: 8 }}>
                    <button
                        onClick={() => onEdit(turno)}
                        style={{
                            display: 'flex', alignItems: 'center', gap: 4,
                            padding: '5px 10px', borderRadius: 6, border: `1px solid ${PA.line}`,
                            background: PA.surface2, color: PA.ink2, fontSize: 12,
                            cursor: 'pointer'
                        }}
                    >
                        <Pencil size={13} /> Editar
                    </button>
                    <button
                        onClick={() => onDelete(turno)}
                        style={{
                            display: 'flex', alignItems: 'center', gap: 4,
                            padding: '5px 10px', borderRadius: 6, border: `1px solid ${PA.warnSoft}`,
                            background: PA.warnSoft, color: PA.warn, fontSize: 12,
                            cursor: 'pointer'
                        }}
                    >
                        <Trash2 size={13} /> Eliminar
                    </button>
                </div>
            </td>
        </tr>
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

// ─── Sub-componente: diálogo de confirmación de eliminación ─────────────────
function ConfirmDelete({ turno, onConfirm, onCancel, deleting }) {
    return (
        <div style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        }}>
            <div style={{
                background: PA.surface, borderRadius: 16, padding: 28, maxWidth: 380, width: '90%',
                boxShadow: '0 12px 40px rgba(0,0,0,0.2)',
            }}>
                <div style={{ fontWeight: 700, fontSize: 17, color: PA.ink, marginBottom: 10 }}>
                    ¿Eliminar tipo de turno?
                </div>
                <p style={{ fontSize: 14, color: PA.ink2, margin: 0, lineHeight: 1.5 }}>
                    Se eliminará <strong>{turno.nombre}</strong> del catálogo.
                    Esta acción no se puede deshacer. Si el turno ya está asignado
                    a alguna rotativa, el sistema rechazará la eliminación.
                </p>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20 }}>
                    <button onClick={onCancel} style={{
                        padding: '7px 16px', borderRadius: 8, border: `1px solid ${PA.line}`,
                        background: 'none', color: PA.ink2, fontSize: 13, cursor: 'pointer'
                    }}>
                        Cancelar
                    </button>
                    <button onClick={onConfirm} disabled={deleting} style={{
                        padding: '7px 16px', borderRadius: 8, border: 'none',
                        background: PA.warn, color: '#fff', fontSize: 13,
                        cursor: deleting ? 'not-allowed' : 'pointer', opacity: deleting ? 0.7 : 1
                    }}>
                        {deleting ? 'Eliminando…' : 'Sí, eliminar'}
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
                await tiposTurnoService.update(editing.idPlantillaTurno, { nombre, horaInicio, horaTermino });
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

    const handleDelete = useCallback(async () => {
        if (!confirmDel) return;
        setDeleting(true);
        try {
            await tiposTurnoService.delete(confirmDel.idPlantillaTurno);
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
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: PA.surface2, animation: 'sgtSlideLeft .3s ease' }}>

            {/* Header con botón volver */}
            <div style={{ padding: '16px', background: '#fff', borderBottom: `1px solid ${PA.line}`, display: 'flex', alignItems: 'center', gap: 12 }}>
                <button onClick={onBack} style={{ background: 'transparent', border: 'none', padding: 4, cursor: 'pointer', display: 'flex' }}>
                    <SGTIcon name="chevron-left" size={24} color={PA.ink} />
                </button>
                <div style={{ fontSize: 19, fontWeight: 800, color: PA.ink, flex: 1 }}>Tipos de Turno</div>
                <button
                    onClick={openCreate}
                    style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        padding: '9px 18px', borderRadius: 10,
                        background: PA.primary, color: '#fff', border: 'none',
                        fontSize: 14, fontWeight: 600, cursor: 'pointer',
                    }}
                >
                    <Plus size={16} /> Nuevo tipo
                </button>
            </div>

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

                {/* Tabla de tipos */}
                <div style={{ background: PA.surface, borderRadius: 14, border: `1px solid ${PA.line}`, overflow: 'hidden' }}>
                    {loading ? (
                        <div style={{ padding: 40, textAlign: 'center', color: PA.ink3, fontSize: 14 }}>
                            Cargando…
                        </div>
                    ) : tipos.length === 0 ? (
                        <div style={{ padding: 48, textAlign: 'center' }}>
                            <Clock size={36} style={{ color: PA.ink3, marginBottom: 12 }} />
                            <p style={{ margin: 0, color: PA.ink3, fontSize: 14 }}>
                                No hay tipos de turno definidos para este servicio.
                            </p>
                            <button
                                onClick={openCreate}
                                style={{
                                    marginTop: 14, padding: '8px 18px', borderRadius: 8,
                                    background: PA.primary, color: '#fff', border: 'none',
                                    fontSize: 13, cursor: 'pointer'
                                }}
                            >
                                Crear el primero
                            </button>
                        </div>
                    ) : (
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ background: PA.surface2, borderBottom: `1px solid ${PA.line}` }}>
                                    {['Turno', 'Hora inicio', 'Hora término', 'Acciones'].map(h => (
                                        <th key={h} style={{
                                            padding: '10px 16px', textAlign: 'left',
                                            fontSize: 11, fontWeight: 700, color: PA.ink3,
                                            textTransform: 'uppercase', letterSpacing: '0.05em'
                                        }}>
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {tipos.map((t, i) => (
                                    <TurnoRow
                                        key={t.idPlantillaTurno}
                                        turno={t}
                                        index={i}
                                        onEdit={openEdit}
                                        onDelete={setConfirmDel}
                                    />
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

            </div>

            {/* Diálogo de confirmación (overlay fijo, fuera del scroll) */}
            {confirmDel && (
                <ConfirmDelete
                    turno={confirmDel}
                    onConfirm={handleDelete}
                    onCancel={() => setConfirmDel(null)}
                    deleting={deleting}
                />
            )}
        </div>
    );
}
