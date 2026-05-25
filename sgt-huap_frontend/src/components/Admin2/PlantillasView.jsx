import { useState, useCallback, useEffect, useRef } from 'react';
import {
    CalendarDays, Plus, Copy, Trash2, X, Check,
    ChevronDown, AlertCircle, RotateCcw, Clock,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { plantillasService, tiposTurnoService, formatHora } from '../../services/plantillasService';
import { SGTIcon } from './UIPrimitives';

// ─── Paleta ─────────────────────────────────────────────────────────────────
const PA = {
    primary: 'var(--primary)', primarySoft: 'var(--primary-soft)',
    accent:  'var(--accent)',  accentSoft:  'var(--accent-soft)',
    warn:    'var(--warn)',    warnSoft:    'var(--warn-soft)',
    success: 'var(--success)',
    ink: 'var(--ink)', ink2: 'var(--ink2)', ink3: 'var(--ink3)',
    line: 'var(--line)', line2: 'var(--line2)',
    surface: 'var(--surface)', surface2: 'var(--surface2)',
};

// Paleta de colores por tipo de turno (asignada por índice en la lista)
const HUES = [250, 150, 30, 85, 320, 200, 45, 170];
const turnoColor = (index) => {
    if (index == null) return null;
    const h = HUES[index % HUES.length];
    return { bg: `oklch(0.93 0.05 ${h})`, ink: `oklch(0.28 0.10 ${h})`, border: `oklch(0.78 0.09 ${h})` };
};

const DIAS_LABEL = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

// ─── Utilidades ──────────────────────────────────────────────────────────────

/** Construye la secuenciaDias a partir del array de idsTurno (null = libre). */
const buildSecuenciaDias = (idsDias) =>
    idsDias.map((id, i) => ({
        diaIndex: i,
        turno: id != null ? { idPlantillaTurno: id } : null,
    }));

/** Extrae el array de IDs desde la secuencia del backend. */
const parseSecuenciaFromBackend = (secuenciaDias) =>
    (secuenciaDias ?? []).map(d => d?.turno?.idPlantillaTurno ?? null);

// ─── Sub: chip de una celda del calendario ───────────────────────────────────
function DayCell({ diaIndex, idTurno, tipos, active, onClick }) {
    const tipoIdx   = tipos.findIndex(t => t.idPlantillaTurno === idTurno);
    const tipo      = tipoIdx >= 0 ? tipos[tipoIdx] : null;
    const color     = tipo ? turnoColor(tipoIdx) : null;
    const semanaNum = Math.floor(diaIndex / 7) + 1;
    const dayPos    = diaIndex % 7;

    return (
        <button
            onClick={() => onClick(diaIndex)}
            title={`Semana ${semanaNum} — ${DIAS_LABEL[dayPos]} (día ${diaIndex + 1})`}
            style={{
                width: '100%', minHeight: 56, padding: '6px 8px',
                borderRadius: 8, cursor: 'pointer', textAlign: 'center',
                border: active ? `2px solid ${PA.primary}` : `1px solid ${color ? color.border : PA.line}`,
                background: active
                    ? PA.primarySoft
                    : (color ? color.bg : PA.surface2),
                color: active ? PA.primary : (color ? color.ink : PA.ink3),
                fontSize: 11, fontWeight: tipo ? 700 : 400,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                gap: 2, transition: 'border-color 0.15s, background 0.15s',
                boxShadow: active ? `0 0 0 3px ${PA.primarySoft}` : 'none',
            }}
        >
            <span style={{ fontSize: 9, opacity: 0.65 }}>{DIAS_LABEL[dayPos]}</span>
            <span style={{ fontSize: 12 }}>{tipo ? tipo.nombre : 'Libre'}</span>
            {tipo && (
                <span style={{ fontSize: 9, opacity: 0.7 }}>
                    {formatHora(tipo.horaInicio)}–{formatHora(tipo.horaTermino)}
                </span>
            )}
        </button>
    );
}

// ─── Sub: picker flotante al hacer click en una celda ────────────────────────
function TurnoPicker({ tipos, onSelect, onClose, anchorRef }) {
    const pickerRef = useRef(null);

    // Cierra al hacer clic fuera
    useEffect(() => {
        const handler = (e) => {
            if (
                pickerRef.current && !pickerRef.current.contains(e.target) &&
                anchorRef.current && !anchorRef.current.contains(e.target)
            ) {
                onClose();
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [onClose, anchorRef]);

    return (
        <div ref={pickerRef} style={{
            position: 'absolute', zIndex: 200, top: '100%', left: 0,
            background: PA.surface, border: `1px solid ${PA.line}`,
            borderRadius: 10, boxShadow: '0 6px 24px rgba(0,0,0,0.15)',
            minWidth: 200, padding: 6,
        }}>
            {/* Opción: Libre */}
            <button
                onClick={() => onSelect(null)}
                style={{
                    width: '100%', padding: '8px 12px', borderRadius: 7,
                    background: 'none', border: 'none', textAlign: 'left',
                    fontSize: 13, color: PA.ink3, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 8,
                }}
                onMouseEnter={e => e.currentTarget.style.background = PA.surface2}
                onMouseLeave={e => e.currentTarget.style.background = 'none'}
            >
                <span style={{
                    width: 10, height: 10, borderRadius: '50%',
                    border: `1.5px solid ${PA.line}`, display: 'inline-block'
                }} />
                Día libre
            </button>

            {tipos.length > 0 && <div style={{ height: 1, background: PA.line, margin: '4px 0' }} />}

            {tipos.map((t, i) => {
                const c = turnoColor(i);
                return (
                    <button
                        key={t.idPlantillaTurno}
                        onClick={() => onSelect(t.idPlantillaTurno)}
                        style={{
                            width: '100%', padding: '8px 12px', borderRadius: 7,
                            background: 'none', border: 'none', textAlign: 'left',
                            fontSize: 13, color: PA.ink, cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: 8,
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = c.bg}
                        onMouseLeave={e => e.currentTarget.style.background = 'none'}
                    >
                        <span style={{
                            width: 10, height: 10, borderRadius: '50%',
                            background: c.ink, display: 'inline-block', flexShrink: 0
                        }} />
                        <span style={{ flex: 1 }}>{t.nombre}</span>
                        <span style={{ fontSize: 11, color: PA.ink3, fontFamily: 'monospace' }}>
                            {formatHora(t.horaInicio)}–{formatHora(t.horaTermino)}
                        </span>
                    </button>
                );
            })}
        </div>
    );
}

// ─── Sub: grid interactivo de días ───────────────────────────────────────────
function DayGrid({ semanas, idsDias, tipos, onChange }) {
    const [activeCell, setActiveCell] = useState(null);
    const cellRefs   = useRef({});
    const totalDias  = semanas * 7;

    const handleCellClick = (idx) => {
        setActiveCell(prev => (prev === idx ? null : idx));
    };

    const handleSelect = (idx, idTurno) => {
        const next = [...idsDias];
        next[idx] = idTurno;
        onChange(next);
        setActiveCell(null);
    };

    return (
        <div>
            {Array.from({ length: semanas }, (_, semIdx) => (
                <div key={semIdx} style={{ marginBottom: 12 }}>
                    <div style={{
                        fontSize: 11, fontWeight: 700, color: PA.ink3,
                        textTransform: 'uppercase', letterSpacing: '0.07em',
                        marginBottom: 6,
                    }}>
                        Semana {semIdx + 1}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6 }}>
                        {Array.from({ length: 7 }, (_, dayIdx) => {
                            const globalIdx = semIdx * 7 + dayIdx;
                            if (globalIdx >= totalDias) return null;
                            const idTurno = idsDias[globalIdx] ?? null;
                            const isActive = activeCell === globalIdx;

                            return (
                                <div
                                    key={globalIdx}
                                    ref={el => cellRefs.current[globalIdx] = el}
                                    style={{ position: 'relative' }}
                                >
                                    <DayCell
                                        diaIndex={globalIdx}
                                        idTurno={idTurno}
                                        tipos={tipos}
                                        active={isActive}
                                        onClick={handleCellClick}
                                    />
                                    {isActive && (
                                        <TurnoPicker
                                            tipos={tipos}
                                            onSelect={(id) => handleSelect(globalIdx, id)}
                                            onClose={() => setActiveCell(null)}
                                            anchorRef={{ current: cellRefs.current[globalIdx] }}
                                        />
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            ))}
        </div>
    );
}

// ─── Sub: panel editor (crear o editar plantilla) ────────────────────────────
function PlantillaEditor({ plantilla, tipos, servicioId, onSaved, onCancel }) {
    const isNew = !plantilla?.idPlantilla;

    const [nombre,   setNombre]   = useState(plantilla?.nombre   ?? '');
    const [semanas,  setSemanas]  = useState(plantilla?.semanas  ?? 2);
    const [idsDias,  setIdsDias]  = useState(() => {
        if (plantilla?.secuenciaDias?.length > 0)
            return parseSecuenciaFromBackend(plantilla.secuenciaDias);
        const total = (plantilla?.semanas ?? 2) * 7;
        return Array(total).fill(null);
    });
    const [saving,   setSaving]   = useState(false);
    const [err,      setErr]      = useState('');

    // Ajusta el array cuando cambia el número de semanas
    const handleSemanasChange = (val) => {
        const n = Math.max(1, Math.min(12, Number(val) || 1));
        setSemanas(n);
        setIdsDias(prev => {
            const next = Array(n * 7).fill(null);
            for (let i = 0; i < Math.min(prev.length, next.length); i++) next[i] = prev[i];
            return next;
        });
    };

    const handleSave = async () => {
        if (!nombre.trim()) return setErr('El nombre es obligatorio.');
        if (semanas < 1)    return setErr('Las semanas deben ser ≥ 1.');
        setErr('');
        setSaving(true);
        try {
            const secuenciaDias = buildSecuenciaDias(idsDias);
            let result;
            if (isNew) {
                result = await plantillasService.create({
                    nombre: nombre.trim(),
                    semanas: Number(semanas),
                    idServicio: servicioId,
                    secuenciaDias,
                });
            } else {
                // Actualizar la secuencia en una plantilla existente
                result = await plantillasService.setSecuencia(
                    plantilla.idPlantilla,
                    idsDias,
                );
            }
            onSaved(result);
        } catch (e) {
            setErr(e?.response?.data || e.message || 'Error al guardar la plantilla.');
        } finally {
            setSaving(false);
        }
    };

    const inputStyle = {
        padding: '8px 12px', borderRadius: 8, border: `1px solid ${PA.line}`,
        fontSize: 14, color: PA.ink, background: PA.surface, outline: 'none',
        boxSizing: 'border-box',
    };

    const completadas = idsDias.filter(id => id !== null).length;
    const porcentaje  = idsDias.length > 0 ? Math.round((completadas / idsDias.length) * 100) : 0;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Cabecera del formulario */}
            <div style={{
                background: PA.surface2, borderRadius: 12, padding: 18,
                border: `1px solid ${PA.line}`, display: 'flex', flexDirection: 'column', gap: 14,
            }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: PA.ink }}>
                    {isNew ? 'Nueva plantilla' : `Editando: ${plantilla.nombre}`}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, alignItems: 'end' }}>
                    <div>
                        <label style={{ fontSize: 12, color: PA.ink3, marginBottom: 4, display: 'block' }}>
                            Nombre de la plantilla
                        </label>
                        <input
                            value={nombre}
                            onChange={e => setNombre(e.target.value)}
                            placeholder="ej. Rotativa 4 semanas — Medicina"
                            style={{ ...inputStyle, width: '100%' }}
                            disabled={!isNew}
                        />
                    </div>
                    <div>
                        <label style={{ fontSize: 12, color: PA.ink3, marginBottom: 4, display: 'block' }}>
                            Semanas
                        </label>
                        <input
                            type="number" min={1} max={12}
                            value={semanas}
                            onChange={e => handleSemanasChange(e.target.value)}
                            style={{ ...inputStyle, width: 80, textAlign: 'center' }}
                            disabled={!isNew}
                        />
                    </div>
                </div>

                {err && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: PA.warn, fontSize: 13 }}>
                        <AlertCircle size={14} /> {err}
                    </div>
                )}
            </div>

            {/* Barra de progreso de días asignados */}
            <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: PA.ink3, marginBottom: 6 }}>
                    <span>Días configurados: <strong style={{ color: PA.ink }}>{completadas}</strong> / {idsDias.length}</span>
                    <span style={{ color: porcentaje === 100 ? PA.success : PA.ink3 }}>
                        {porcentaje}%
                    </span>
                </div>
                <div style={{ height: 6, background: PA.surface2, borderRadius: 99, overflow: 'hidden' }}>
                    <div style={{
                        width: `${porcentaje}%`, height: '100%', borderRadius: 99,
                        background: porcentaje === 100 ? PA.success : PA.primary,
                        transition: 'width 0.3s',
                    }} />
                </div>
            </div>

            {/* Leyenda de tipos de turno */}
            {tipos.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {tipos.map((t, i) => {
                        const c = turnoColor(i);
                        return (
                            <span key={t.idPlantillaTurno} style={{
                                display: 'flex', alignItems: 'center', gap: 5,
                                background: c.bg, color: c.ink, border: `1px solid ${c.border}`,
                                borderRadius: 99, padding: '3px 10px', fontSize: 12,
                            }}>
                                <span style={{ width: 8, height: 8, borderRadius: '50%', background: c.ink }} />
                                {t.nombre}
                                <span style={{ opacity: 0.65, fontFamily: 'monospace', fontSize: 10 }}>
                                    {formatHora(t.horaInicio)}–{formatHora(t.horaTermino)}
                                </span>
                            </span>
                        );
                    })}
                    <span style={{
                        display: 'flex', alignItems: 'center', gap: 5,
                        background: PA.surface2, color: PA.ink3, border: `1px solid ${PA.line}`,
                        borderRadius: 99, padding: '3px 10px', fontSize: 12,
                    }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', border: `1.5px solid ${PA.line}` }} />
                        Libre
                    </span>
                </div>
            )}

            {/* Instrucción */}
            <p style={{ margin: 0, fontSize: 12, color: PA.ink3 }}>
                Haz clic en cada celda para asignar un tipo de turno o marcar el día como libre.
            </p>

            {/* Grid interactivo */}
            <DayGrid
                semanas={semanas}
                idsDias={idsDias}
                tipos={tipos}
                onChange={setIdsDias}
            />

            {/* Acciones */}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 8 }}>
                <button onClick={onCancel} style={{
                    padding: '8px 18px', borderRadius: 9, border: `1px solid ${PA.line}`,
                    background: 'none', color: PA.ink2, fontSize: 14, cursor: 'pointer',
                }}>
                    Cancelar
                </button>
                <button onClick={handleSave} disabled={saving} style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '8px 20px', borderRadius: 9,
                    background: PA.primary, color: '#fff', border: 'none',
                    fontSize: 14, fontWeight: 600,
                    cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1,
                }}>
                    <Check size={15} />
                    {saving ? 'Guardando…' : 'Guardar plantilla'}
                </button>
            </div>
        </div>
    );
}

// ─── Sub: tarjeta de plantilla en la lista ────────────────────────────────────
function PlantillaCard({ plantilla, onEdit, onDuplicate, onDelete }) {
    const completadas = (plantilla.secuenciaDias ?? []).filter(d => d.turno !== null).length;
    const total       = plantilla.semanas * 7;
    const pct         = total > 0 ? Math.round((completadas / total) * 100) : 0;

    return (
        <div style={{
            background: PA.surface, border: `1px solid ${PA.line}`,
            borderRadius: 12, padding: 18, display: 'flex', flexDirection: 'column', gap: 10,
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <div style={{ fontWeight: 700, fontSize: 15, color: PA.ink }}>{plantilla.nombre}</div>
                    <div style={{ fontSize: 12, color: PA.ink3, marginTop: 2 }}>
                        {plantilla.semanas} semana{plantilla.semanas !== 1 ? 's' : ''} · {total} días
                    </div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                    <button
                        onClick={() => onDuplicate(plantilla.idPlantilla)}
                        title="Duplicar plantilla"
                        style={{
                            padding: '5px 8px', borderRadius: 7, border: `1px solid ${PA.line}`,
                            background: PA.surface2, color: PA.ink2, cursor: 'pointer',
                        }}
                    >
                        <Copy size={14} />
                    </button>
                    <button
                        onClick={() => onDelete(plantilla)}
                        title="Eliminar plantilla"
                        style={{
                            padding: '5px 8px', borderRadius: 7, border: `1px solid ${PA.warnSoft}`,
                            background: PA.warnSoft, color: PA.warn, cursor: 'pointer',
                        }}
                    >
                        <Trash2 size={14} />
                    </button>
                </div>
            </div>

            {/* Mini barra de progreso */}
            <div style={{ height: 5, background: PA.surface2, borderRadius: 99, overflow: 'hidden' }}>
                <div style={{
                    width: `${pct}%`, height: '100%', borderRadius: 99,
                    background: pct === 100 ? PA.success : PA.primary,
                }} />
            </div>
            <div style={{ fontSize: 11, color: PA.ink3 }}>
                {completadas} turnos asignados · {total - completadas} libres
            </div>

            <button
                onClick={() => onEdit(plantilla)}
                style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    padding: '7px 14px', borderRadius: 8,
                    background: PA.primarySoft, color: PA.primary, border: 'none',
                    fontSize: 13, fontWeight: 600, cursor: 'pointer',
                }}
            >
                <CalendarDays size={14} />
                Configurar secuencia
            </button>
        </div>
    );
}

// ─── Vista principal ─────────────────────────────────────────────────────────
export default function PlantillasView({ onBack }) {
    const { user } = useAuth();

    const [plantillas,  setPlantillas]  = useState([]);
    const [tipos,       setTipos]       = useState([]);
    const [loading,     setLoading]     = useState(false);
    const [error,       setError]       = useState('');
    const [editing,     setEditing]     = useState(null);  // plantilla o 'new'
    const [confirmDel,  setConfirmDel]  = useState(null);
    const [deleting,    setDeleting]    = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const [pList, tList] = await Promise.all([
                plantillasService.getByServicio(user?.servicioId),
                tiposTurnoService.getByServicio(user?.servicioId),
            ]);
            setPlantillas(Array.isArray(pList) ? pList : []);
            setTipos(Array.isArray(tList) ? tList : []);
        } catch (e) {
            setError(e?.response?.data || e.message || 'Error al cargar datos.');
        } finally {
            setLoading(false);
        }
    }, [user?.servicioId]);

    useEffect(() => { load(); }, [load]);

    const handleSaved = useCallback(async () => {
        setEditing(null);
        await load();
    }, [load]);

    const handleDuplicate = useCallback(async (id) => {
        try {
            await plantillasService.duplicar(id);
            await load();
        } catch (e) {
            setError(e?.response?.data || e.message || 'Error al duplicar.');
        }
    }, [load]);

    const handleDelete = useCallback(async () => {
        if (!confirmDel) return;
        setDeleting(true);
        try {
            await plantillasService.delete(confirmDel.idPlantilla);
            setConfirmDel(null);
            await load();
        } catch (e) {
            setError(e?.response?.data || e.message || 'Error al eliminar.');
            setConfirmDel(null);
        } finally {
            setDeleting(false);
        }
    }, [confirmDel, load]);

    // Modo editor abierto
    if (editing !== null) {
        return (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: PA.surface2, animation: 'sgtSlideLeft .3s ease' }}>
                <div style={{ padding: '16px', background: '#fff', borderBottom: `1px solid ${PA.line2}`, display: 'flex', alignItems: 'center', gap: 12 }}>
                    <button onClick={() => setEditing(null)} style={{ background: 'transparent', border: 'none', padding: 4, cursor: 'pointer', display: 'flex' }}>
                        <SGTIcon name="chevron-left" size={24} color={PA.ink} />
                    </button>
                    <div style={{ fontSize: 19, fontWeight: 800, color: PA.ink }}>
                        {editing === 'new' ? 'Nueva rotativa' : `Editando: ${editing.nombre}`}
                    </div>
                </div>
                <div style={{ flex: 1, overflow: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {tipos.length === 0 && (
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: 8,
                            background: PA.warnSoft, color: PA.warn, borderRadius: 10, padding: '10px 16px', fontSize: 13,
                        }}>
                            <AlertCircle size={14} />
                            No hay tipos de turno definidos para este servicio. Créalos primero en «Tipos de Turno».
                        </div>
                    )}
                    <PlantillaEditor
                        plantilla={editing === 'new' ? null : editing}
                        tipos={tipos}
                        servicioId={user?.servicioId}
                        onSaved={handleSaved}
                        onCancel={() => setEditing(null)}
                    />
                </div>
            </div>
        );
    }

    // Vista de lista
    return (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: PA.surface2, animation: 'sgtSlideLeft .3s ease' }}>

            {/* Header con botón volver */}
            <div style={{ padding: '16px', background: '#fff', borderBottom: `1px solid ${PA.line2}`, display: 'flex', alignItems: 'center', gap: 12 }}>
                <button onClick={onBack} style={{ background: 'transparent', border: 'none', padding: 4, cursor: 'pointer', display: 'flex' }}>
                    <SGTIcon name="chevron-left" size={24} color={PA.ink} />
                </button>
                <div style={{ fontSize: 19, fontWeight: 800, color: PA.ink, flex: 1 }}>Rotativas</div>
                <button
                    onClick={() => setEditing('new')}
                    style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        padding: '9px 18px', borderRadius: 10,
                        background: PA.primary, color: '#fff', border: 'none',
                        fontSize: 14, fontWeight: 600, cursor: 'pointer',
                    }}
                >
                    <Plus size={16} /> Nueva rotativa
                </button>
            </div>

            {/* Contenido scrollable */}
            <div style={{ flex: 1, overflow: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>

                {/* Error global */}
                {error && (
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        background: PA.warnSoft, color: PA.warn, borderRadius: 10, padding: '10px 16px', fontSize: 13,
                    }}>
                        <AlertCircle size={15} />
                        {error}
                        <button onClick={() => setError('')} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: PA.warn }}>
                            <X size={14} />
                        </button>
                    </div>
                )}

                {/* Lista de plantillas */}
                {loading ? (
                    <div style={{ padding: 48, textAlign: 'center', color: PA.ink3, fontSize: 14 }}>
                        Cargando…
                    </div>
                ) : plantillas.length === 0 ? (
                    <div style={{
                        background: PA.surface, border: `1px solid ${PA.line}`, borderRadius: 14,
                        padding: 56, textAlign: 'center',
                    }}>
                        <CalendarDays size={40} style={{ color: PA.ink3, marginBottom: 14 }} />
                        <p style={{ margin: '0 0 16px', color: PA.ink3, fontSize: 14 }}>
                            No hay rotativas definidas para este servicio.
                        </p>
                        <button
                            onClick={() => setEditing('new')}
                            style={{
                                padding: '9px 20px', borderRadius: 10,
                                background: PA.primary, color: '#fff', border: 'none',
                                fontSize: 14, fontWeight: 600, cursor: 'pointer',
                            }}
                        >
                            Crear la primera rotativa
                        </button>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
                        {plantillas.map(p => (
                            <PlantillaCard
                                key={p.idPlantilla}
                                plantilla={p}
                                onEdit={setEditing}
                                onDuplicate={handleDuplicate}
                                onDelete={setConfirmDel}
                            />
                        ))}
                    </div>
                )}

            </div>

            {/* Diálogo de confirmación de eliminación (overlay fijo, fuera del scroll) */}
            {confirmDel && (
                <div style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
                }}>
                    <div style={{
                        background: PA.surface, borderRadius: 16, padding: 28,
                        maxWidth: 380, width: '90%', boxShadow: '0 12px 40px rgba(0,0,0,0.2)',
                    }}>
                        <div style={{ fontWeight: 700, fontSize: 17, color: PA.ink, marginBottom: 10 }}>
                            ¿Eliminar rotativa?
                        </div>
                        <p style={{ fontSize: 14, color: PA.ink2, margin: 0, lineHeight: 1.5 }}>
                            Se eliminará <strong>{confirmDel.nombre}</strong> y toda su secuencia de días configurada.
                            Esta acción no se puede deshacer.
                        </p>
                        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20 }}>
                            <button onClick={() => setConfirmDel(null)} style={{
                                padding: '7px 16px', borderRadius: 8, border: `1px solid ${PA.line}`,
                                background: 'none', color: PA.ink2, fontSize: 13, cursor: 'pointer',
                            }}>
                                Cancelar
                            </button>
                            <button onClick={handleDelete} disabled={deleting} style={{
                                padding: '7px 16px', borderRadius: 8, border: 'none',
                                background: PA.warn, color: '#fff', fontSize: 13,
                                cursor: deleting ? 'not-allowed' : 'pointer', opacity: deleting ? 0.7 : 1,
                            }}>
                                {deleting ? 'Eliminando…' : 'Sí, eliminar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
