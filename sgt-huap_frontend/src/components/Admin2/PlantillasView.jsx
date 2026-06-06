import { useState, useCallback, useEffect } from 'react';
import {
    CalendarDays, Plus, Trash2, X, Check, AlertCircle, Clock, Brush,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { plantillasService, tiposTurnoService, formatHora } from '../../services/plantillasService';
import { SGTIcon } from '../Style/UIPrimitives';

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
    if (index == null || index < 0) return { bg: PA.surface2, ink: PA.ink3, border: PA.line };
    const h = HUES[index % HUES.length];
    return { bg: `oklch(0.93 0.05 ${h})`, ink: `oklch(0.28 0.10 ${h})`, border: `oklch(0.78 0.09 ${h})` };
};

const DIAS_LABEL = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

// ─── Utilidades de secuencia (matriz: un array de tipos de turno por día) ─────

/** Matriz vacía de semanas*7 días, cada día = lista vacía (libre). */
const matrizVacia = (semanas) => Array.from({ length: semanas * 7 }, () => []);

/** Reconstruye la matriz desde la secuencia del backend (filas {diaIndex, turno}). */
const parseSecuenciaFromBackend = (secuenciaDias, semanas) => {
    const matriz = matrizVacia(semanas);
    for (const d of (secuenciaDias ?? [])) {
        const idx = d?.diaIndex;
        const tid = d?.turno?.idPlantillaTurno;
        if (idx != null && idx >= 0 && idx < matriz.length && tid != null) {
            matriz[idx].push(tid);
        }
    }
    return matriz;
};

// ─── Utilidades de horario / superposición ────────────────────────────────────

/** "HH:MM" | [H,M] → minutos desde 00:00. */
const horaAMin = (hora) => {
    const [hh, mm] = formatHora(hora).split(':').map(Number);
    return (hh || 0) * 60 + (mm || 0);
};

/** Intervalo [inicio, fin) en minutos, anclado al inicio del día (maneja cruce de medianoche). */
const intervaloTurno = (tipo) => {
    const s = horaAMin(tipo.horaInicio);
    const e = horaAMin(tipo.horaTermino);
    let dur = (e - s + 1440) % 1440;
    if (dur === 0) dur = 1440;
    return [s, s + dur];
};

/** ¿Se superponen dos turnos en el mismo día? (tocarse en el borde no es superponer). */
const seSuperponen = (a, b) => {
    const [as, ae] = intervaloTurno(a);
    const [bs, be] = intervaloTurno(b);
    return as < be && bs < ae;
};

const rangoHoras = (t) => `${formatHora(t.horaInicio)}–${formatHora(t.horaTermino)}`;

/** Duración de un turno en minutos (maneja cruce de medianoche). */
const duracionMin = (tipo) => {
    const [s, e] = intervaloTurno(tipo);
    return e - s;
};

/** Formatea horas: 42 → "42", 42.5 → "42,5". */
const fmtHoras = (h) => {
    const r = Math.round(h * 10) / 10;
    return (Number.isInteger(r) ? String(r) : r.toFixed(1)).replace('.', ',');
};

// Límite legal de referencia (jornada semanal, Chile).
const HORAS_SEMANALES_REF = 44;

// ─── Sub: celda de un día del calendario (puede mostrar varios turnos) ─────────
function DayCell({ diaIndex, turnoIds, tipos, active, onClick }) {
    const dayPos = diaIndex % 7;
    const items = turnoIds
        .map(id => {
            const idx = tipos.findIndex(t => t.idPlantillaTurno === id);
            return idx >= 0 ? { tipo: tipos[idx], color: turnoColor(idx) } : null;
        })
        .filter(Boolean);

    return (
        <button
            onClick={() => onClick(diaIndex)}
            title={`Semana ${Math.floor(diaIndex / 7) + 1} — ${DIAS_LABEL[dayPos]}`}
            style={{
                width: '100%', minWidth: 0, minHeight: 96, padding: '8px 6px',
                borderRadius: 12, cursor: 'pointer', overflow: 'hidden',
                border: active ? `2px solid ${PA.primary}` : `1px solid ${PA.line}`,
                background: active ? PA.primarySoft : (items.length ? '#fff' : PA.surface2),
                display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: 4,
                boxShadow: active ? `0 0 0 3px ${PA.primarySoft}` : 'none',
            }}
        >
            {items.length === 0 ? (
                <span style={{ fontSize: 12, color: PA.ink3, textAlign: 'center', margin: 'auto 0' }}>
                    Libre
                </span>
            ) : (
                items.map(({ tipo, color }, i) => (
                    <span
                        key={i}
                        style={{
                            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1,
                            fontSize: 11, fontWeight: 700, lineHeight: 1.2,
                            borderRadius: 7, padding: '4px 4px',
                            background: color.bg, color: color.ink,
                            overflow: 'hidden',
                        }}
                    >
                        <span style={{ maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {tipo.nombre}
                        </span>
                        <span style={{ fontSize: 9, fontWeight: 600, opacity: 0.75, fontFamily: 'monospace' }}>
                            {formatHora(tipo.horaInicio)}–{formatHora(tipo.horaTermino)}
                        </span>
                    </span>
                ))
            )}
        </button>
    );
}

// ─── Sub: bottom-sheet para editar los turnos de un día ───────────────────────
function TurnoSheet({ diaIndex, tipos, turnoIds, onToggle, onLibre, onClose }) {
    const semana = Math.floor(diaIndex / 7) + 1;
    const dia = DIAS_LABEL[diaIndex % 7];
    const esLibre = turnoIds.length === 0;

    return (
        <div
            onClick={onClose}
            style={{
                position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
                display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 1000,
            }}
        >
            <div
                onClick={e => e.stopPropagation()}
                style={{
                    background: '#fff', borderRadius: '20px 20px 0 0',
                    padding: '8px 16px 28px', width: '100%', maxWidth: 480,
                    boxShadow: '0 -8px 40px rgba(0,0,0,0.18)', maxHeight: '80vh', overflowY: 'auto',
                }}
            >
                <div style={{ display: 'flex', justifyContent: 'center', paddingBottom: 12 }}>
                    <div style={{ width: 40, height: 4, background: PA.line, borderRadius: 99 }} />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                    <div>
                        <div style={{ fontWeight: 800, fontSize: 17, color: PA.ink }}>Semana {semana} · {dia}</div>
                        <div style={{ fontSize: 12, color: PA.ink3, marginTop: 2 }}>
                            {esLibre ? 'Día libre' : `${turnoIds.length} turno${turnoIds.length === 1 ? '' : 's'} en este día`}
                        </div>
                    </div>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: PA.ink3, display: 'flex', padding: 4 }}>
                        <X size={20} />
                    </button>
                </div>

                <button
                    onClick={onLibre}
                    style={{
                        width: '100%', padding: '12px 14px', borderRadius: 10, marginBottom: 10,
                        border: `1.5px solid ${esLibre ? PA.primary : PA.line}`,
                        background: esLibre ? PA.primarySoft : PA.surface,
                        color: esLibre ? PA.primary : PA.ink2, fontSize: 14, fontWeight: 700,
                        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
                    }}
                >
                    <span style={{ width: 12, height: 12, borderRadius: '50%', border: `1.5px solid currentColor` }} />
                    Día libre
                </button>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {tipos.map((t, i) => {
                        const c = turnoColor(i);
                        const selected = turnoIds.includes(t.idPlantillaTurno);
                        return (
                            <button
                                key={t.idPlantillaTurno}
                                onClick={() => onToggle(t.idPlantillaTurno)}
                                style={{
                                    width: '100%', padding: '12px 14px', borderRadius: 10, textAlign: 'left',
                                    border: `1.5px solid ${selected ? c.ink : PA.line}`,
                                    background: selected ? c.bg : PA.surface,
                                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10,
                                }}
                            >
                                <span style={{ width: 12, height: 12, borderRadius: '50%', background: c.ink, flexShrink: 0 }} />
                                <span style={{ flex: 1, minWidth: 0, fontSize: 14, fontWeight: 700, color: PA.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {t.nombre}
                                </span>
                                <span style={{ fontSize: 12, color: PA.ink3, fontFamily: 'monospace' }}>
                                    {rangoHoras(t)}
                                </span>
                                {selected && <Check size={18} color={c.ink} style={{ flexShrink: 0 }} />}
                            </button>
                        );
                    })}
                    {tipos.length === 0 && (
                        <div style={{ fontSize: 13, color: PA.ink3, textAlign: 'center', padding: '12px 0' }}>
                            No hay tipos de turno en este servicio.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// ─── Sub: grid interactivo de días ───────────────────────────────────────────
function DayGrid({ semanas, diasMatrix, tipos, brush, onChange, onError }) {
    const [activeCell, setActiveCell] = useState(null);
    const totalDias = semanas * 7;

    // Agrega o quita un turno de un día, validando superposición al agregar.
    const aplicarTurno = (idx, idTurno) => {
        const dia = diasMatrix[idx] ?? [];

        if (dia.includes(idTurno)) {
            onChange(diasMatrix.map((d, i) => (i === idx ? d.filter(id => id !== idTurno) : d)));
            onError('');
            return;
        }

        const nuevo = tipos.find(t => t.idPlantillaTurno === idTurno);
        const conflicto = dia
            .map(id => tipos.find(t => t.idPlantillaTurno === id))
            .filter(Boolean)
            .find(existente => seSuperponen(existente, nuevo));

        if (conflicto) {
            onError(
                `"${nuevo.nombre}" (${rangoHoras(nuevo)}) se superpone con ` +
                `"${conflicto.nombre}" (${rangoHoras(conflicto)}) en ese día. ` +
                `Ajusta los horarios para que no se solapen.`
            );
            return;
        }

        onChange(diasMatrix.map((d, i) => (i === idx ? [...d, idTurno] : d)));
        onError('');
    };

    const marcarLibre = (idx) => {
        onChange(diasMatrix.map((d, i) => (i === idx ? [] : d)));
        onError('');
    };

    // Tap en un día: con pincel activo aplica directo; sin pincel abre el sheet.
    const handleCellTap = (idx) => {
        if (brush == null) {
            setActiveCell(prev => (prev === idx ? null : idx));
        } else if (brush === 'libre') {
            marcarLibre(idx);
        } else {
            aplicarTurno(idx, brush);
        }
    };

    return (
        <div>
            {/* Cabecera de días (una sola vez) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 6, marginBottom: 8 }}>
                {DIAS_LABEL.map(d => (
                    <div key={d} style={{ textAlign: 'center', fontSize: 11, fontWeight: 800, color: PA.ink3, letterSpacing: '0.03em' }}>
                        {d}
                    </div>
                ))}
            </div>

            {Array.from({ length: semanas }, (_, semIdx) => (
                <div key={semIdx} style={{ marginBottom: 12 }}>
                    <div style={{
                        fontSize: 11, fontWeight: 700, color: PA.ink3,
                        textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6,
                    }}>
                        Semana {semIdx + 1}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 6 }}>
                        {Array.from({ length: 7 }, (_, dayIdx) => {
                            const globalIdx = semIdx * 7 + dayIdx;
                            if (globalIdx >= totalDias) return null;
                            return (
                                <div key={globalIdx} style={{ minWidth: 0 }}>
                                    <DayCell
                                        diaIndex={globalIdx}
                                        turnoIds={diasMatrix[globalIdx] ?? []}
                                        tipos={tipos}
                                        active={activeCell === globalIdx}
                                        onClick={handleCellTap}
                                    />
                                </div>
                            );
                        })}
                    </div>
                </div>
            ))}

            {activeCell != null && (
                <TurnoSheet
                    diaIndex={activeCell}
                    tipos={tipos}
                    turnoIds={diasMatrix[activeCell] ?? []}
                    onToggle={(id) => aplicarTurno(activeCell, id)}
                    onLibre={() => { marcarLibre(activeCell); setActiveCell(null); }}
                    onClose={() => setActiveCell(null)}
                />
            )}
        </div>
    );
}

// ─── Sub: panel editor (crear o editar plantilla) ────────────────────────────
function PlantillaEditor({ plantilla, tipos, servicioId, onSaved, onCancel }) {
    const isNew = !plantilla?.idPlantilla;

    const [nombre, setNombre]   = useState(plantilla?.nombre ?? '');
    const [semanas, setSemanas] = useState(plantilla?.semanas ?? 2);
    const [diasMatrix, setDiasMatrix] = useState(() => {
        if (plantilla?.secuenciaDias?.length > 0)
            return parseSecuenciaFromBackend(plantilla.secuenciaDias, plantilla?.semanas ?? 2);
        return matrizVacia(plantilla?.semanas ?? 2);
    });
    const [saving, setSaving] = useState(false);
    const [err, setErr]       = useState('');
    const [gridError, setGridError] = useState('');
    const [brush, setBrush]   = useState(null);   // null | 'libre' | idPlantillaTurno

    const handleSemanasChange = (val) => {
        const n = Math.max(1, Math.min(12, Number(val) || 1));
        setSemanas(n);
        setDiasMatrix(prev => {
            const next = matrizVacia(n);
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
            let result;
            if (isNew) {
                const creada = await plantillasService.create({
                    nombre: nombre.trim(),
                    semanas: Number(semanas),
                    idServicio: servicioId,
                });
                await plantillasService.setSecuencia(creada.idPlantilla, diasMatrix);
                result = creada;
            } else {
                await plantillasService.update(plantilla.idPlantilla, {
                    nombre: nombre.trim(),
                    semanas: Number(semanas),
                });
                result = await plantillasService.setSecuencia(plantilla.idPlantilla, diasMatrix);
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

    // Horas totales del patrón y promedio semanal que haría la persona.
    const totalMin = diasMatrix.reduce((acc, dia) => acc + dia.reduce((a, id) => {
        const t = tipos.find(tt => tt.idPlantillaTurno === id);
        return a + (t ? duracionMin(t) : 0);
    }, 0), 0);
    const horasTotales  = totalMin / 60;
    const horasSemana   = semanas > 0 ? horasTotales / semanas : 0;
    const excedeRef     = horasSemana > HORAS_SEMANALES_REF;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

            {/* Cabecera del formulario */}
            <div style={{
                background: PA.surface2, borderRadius: 12, padding: 16,
                border: `1px solid ${PA.line}`, display: 'flex', flexDirection: 'column', gap: 14,
            }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: PA.ink }}>
                    {isNew ? 'Nueva rotativa' : 'Editar rotativa'}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, alignItems: 'end' }}>
                    <div style={{ minWidth: 0 }}>
                        <label style={{ fontSize: 12, color: PA.ink3, marginBottom: 4, display: 'block' }}>
                            Nombre
                        </label>
                        <input
                            value={nombre}
                            onChange={e => setNombre(e.target.value)}
                            placeholder="ej. Rotativa 4 semanas — Medicina"
                            style={{ ...inputStyle, width: '100%' }}
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
                            style={{ ...inputStyle, width: 72, textAlign: 'center' }}
                        />
                    </div>
                </div>

                {err && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: PA.warn, fontSize: 13 }}>
                        <AlertCircle size={14} /> {err}
                    </div>
                )}
            </div>

            {/* Estadística de horas semanales */}
            <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                background: excedeRef ? PA.warnSoft : PA.surface2,
                border: `1px solid ${excedeRef ? PA.warn : PA.line}`,
                borderRadius: 12, padding: '12px 16px',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                    <div style={{
                        width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                        background: excedeRef ? PA.warn : PA.primary,
                        display: 'grid', placeItems: 'center',
                    }}>
                        <Clock size={20} color="#fff" />
                    </div>
                    <div>
                        <div style={{ fontSize: 11, color: PA.ink3, fontWeight: 600 }}>Horas por semana</div>
                        <div style={{ fontSize: 22, fontWeight: 800, color: excedeRef ? PA.warn : PA.ink, lineHeight: 1.1 }}>
                            {fmtHoras(horasSemana)} h
                        </div>
                    </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 11, color: PA.ink3, fontWeight: 600 }}>
                        Total · {semanas} sem.
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: PA.ink2 }}>
                        {fmtHoras(horasTotales)} h
                    </div>
                </div>
            </div>

            {excedeRef && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: PA.warn, marginTop: -8 }}>
                    <AlertCircle size={13} /> Supera las {HORAS_SEMANALES_REF} h semanales de referencia.
                </div>
            )}

            {/* Pincel rápido: elige un turno y toca los días para aplicarlo */}
            {tipos.length > 0 && (
                <div>
                    <div style={{ fontSize: 12, color: PA.ink3, fontWeight: 600, marginBottom: 8 }}>
                        Pincel rápido — elige un turno y toca los días para aplicarlo
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {tipos.map((t, i) => {
                            const c = turnoColor(i);
                            const activo = brush === t.idPlantillaTurno;
                            return (
                                <button
                                    key={t.idPlantillaTurno}
                                    onClick={() => setBrush(activo ? null : t.idPlantillaTurno)}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: 5,
                                        background: c.bg, color: c.ink,
                                        border: `1.5px solid ${activo ? c.ink : c.border}`,
                                        boxShadow: activo ? `0 0 0 3px ${c.bg}` : 'none',
                                        borderRadius: 99, padding: '5px 11px', fontSize: 11.5,
                                        fontWeight: 700, cursor: 'pointer',
                                    }}
                                >
                                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: c.ink }} />
                                    {t.nombre}
                                    <span style={{ opacity: 0.65, fontFamily: 'monospace', fontSize: 10, fontWeight: 600 }}>
                                        {rangoHoras(t)}
                                    </span>
                                    {activo && <Check size={12} />}
                                </button>
                            );
                        })}
                        {/* Pincel de día libre */}
                        <button
                            onClick={() => setBrush(brush === 'libre' ? null : 'libre')}
                            style={{
                                display: 'flex', alignItems: 'center', gap: 5,
                                background: brush === 'libre' ? PA.primarySoft : PA.surface2,
                                color: brush === 'libre' ? PA.primary : PA.ink3,
                                border: `1.5px solid ${brush === 'libre' ? PA.primary : PA.line}`,
                                borderRadius: 99, padding: '5px 11px', fontSize: 11.5,
                                fontWeight: 700, cursor: 'pointer',
                            }}
                        >
                            <span style={{ width: 8, height: 8, borderRadius: '50%', border: `1.5px solid currentColor` }} />
                            Libre
                            {brush === 'libre' && <Check size={12} />}
                        </button>
                    </div>

                    {brush != null && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: PA.primary, marginTop: 8, fontWeight: 600 }}>
                            <Brush size={13} /> Modo pincel: toca los días para aplicar. Tócalo de nuevo en un día para quitarlo. Sin pincel, toca un día para ver todas las opciones.
                        </div>
                    )}
                </div>
            )}

            {/* Error de superposición */}
            {gridError && (
                <div style={{
                    display: 'flex', alignItems: 'flex-start', gap: 8,
                    background: PA.warnSoft, color: PA.warn, borderRadius: 10, padding: '10px 14px', fontSize: 13,
                }}>
                    <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
                    <span style={{ flex: 1 }}>{gridError}</span>
                    <button onClick={() => setGridError('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: PA.warn, display: 'flex' }}>
                        <X size={14} />
                    </button>
                </div>
            )}

            {/* Grid interactivo */}
            <DayGrid
                semanas={semanas}
                diasMatrix={diasMatrix}
                tipos={tipos}
                brush={brush}
                onChange={setDiasMatrix}
                onError={setGridError}
            />

            {/* Acciones */}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 8 }}>
                <button onClick={onCancel} style={{
                    padding: '9px 18px', borderRadius: 9, border: `1px solid ${PA.line}`,
                    background: 'none', color: PA.ink2, fontSize: 14, cursor: 'pointer',
                }}>
                    Cancelar
                </button>
                <button onClick={handleSave} disabled={saving} style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '9px 20px', borderRadius: 9,
                    background: PA.primary, color: '#fff', border: 'none',
                    fontSize: 14, fontWeight: 600,
                    cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1,
                }}>
                    <Check size={15} />
                    {saving ? 'Guardando…' : 'Guardar rotativa'}
                </button>
            </div>
        </div>
    );
}

// ─── Sub: tarjeta de plantilla en la lista ────────────────────────────────────
function PlantillaCard({ plantilla, onEdit, onDelete }) {
    const total       = plantilla.semanas * 7;
    // Días distintos con al menos un turno asignado.
    const diasConTurno = new Set(
        (plantilla.secuenciaDias ?? [])
            .filter(d => d.turno !== null && d.turno !== undefined)
            .map(d => d.diaIndex)
    ).size;
    const pct = total > 0 ? Math.round((diasConTurno / total) * 100) : 0;

    return (
        <div style={{
            background: PA.surface, border: `1px solid ${PA.line}`,
            borderRadius: 12, padding: 16, display: 'flex', flexDirection: 'column', gap: 10,
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 15, color: PA.ink, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {plantilla.nombre}
                    </div>
                    <div style={{ fontSize: 12, color: PA.ink3, marginTop: 2 }}>
                        {plantilla.semanas} semana{plantilla.semanas !== 1 ? 's' : ''} · {total} días
                    </div>
                </div>
                <button
                    onClick={() => onDelete(plantilla)}
                    title="Eliminar rotativa"
                    style={{
                        padding: '6px 9px', borderRadius: 8, border: `1px solid ${PA.warnSoft}`,
                        background: PA.warnSoft, color: PA.warn, cursor: 'pointer', flexShrink: 0,
                    }}
                >
                    <Trash2 size={15} />
                </button>
            </div>

            {/* Mini barra de progreso */}
            <div style={{ height: 5, background: PA.surface2, borderRadius: 99, overflow: 'hidden' }}>
                <div style={{
                    width: `${pct}%`, height: '100%', borderRadius: 99,
                    background: pct === 100 ? PA.success : PA.primary,
                }} />
            </div>
            <div style={{ fontSize: 11, color: PA.ink3 }}>
                {diasConTurno} días con turno · {total - diasConTurno} libres
            </div>

            <button
                onClick={() => onEdit(plantilla)}
                style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    padding: '9px 14px', borderRadius: 8,
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

    const [plantillas, setPlantillas] = useState([]);
    const [tipos,      setTipos]      = useState([]);
    const [loading,    setLoading]    = useState(false);
    const [error,      setError]      = useState('');
    const [editing,    setEditing]    = useState(null);   // plantilla o 'new'
    const [confirmDel, setConfirmDel] = useState(null);
    const [deleting,   setDeleting]   = useState(false);

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
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: PA.surface2, animation: 'sgtSlideLeft .3s ease', overflow: 'hidden' }}>
                <div style={{ padding: '16px', background: '#fff', borderBottom: `1px solid ${PA.line2}`, display: 'flex', alignItems: 'center', gap: 12 }}>
                    <button onClick={() => setEditing(null)} style={{ background: 'transparent', border: 'none', padding: 4, cursor: 'pointer', display: 'flex' }}>
                        <SGTIcon name="chevron-left" size={24} color={PA.ink} />
                    </button>
                    <div style={{ fontSize: 19, fontWeight: 800, color: PA.ink, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {editing === 'new' ? 'Nueva rotativa' : `Editar: ${editing.nombre}`}
                    </div>
                </div>
                <div style={{ flex: 1, overflow: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {tipos.length === 0 && (
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: 8,
                            background: PA.warnSoft, color: PA.warn, borderRadius: 10, padding: '10px 16px', fontSize: 13,
                        }}>
                            <AlertCircle size={14} />
                            No hay tipos de turno en este servicio. Créalos primero en «Tipos de Turno».
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
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: PA.surface2, animation: 'sgtSlideLeft .3s ease', overflow: 'hidden' }}>

            {/* Header */}
            <div style={{ padding: '16px', background: '#fff', borderBottom: `1px solid ${PA.line2}`, display: 'flex', alignItems: 'center', gap: 12 }}>
                <button onClick={onBack} style={{ background: 'transparent', border: 'none', padding: 4, cursor: 'pointer', display: 'flex' }}>
                    <SGTIcon name="chevron-left" size={24} color={PA.ink} />
                </button>
                <div style={{ fontSize: 19, fontWeight: 800, color: PA.ink, flex: 1 }}>Rotativas</div>
                <button
                    onClick={() => setEditing('new')}
                    style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        padding: '9px 16px', borderRadius: 10,
                        background: PA.primary, color: '#fff', border: 'none',
                        fontSize: 14, fontWeight: 600, cursor: 'pointer', flexShrink: 0,
                    }}
                >
                    <Plus size={16} /> Nueva
                </button>
            </div>

            {/* Contenido scrollable */}
            <div style={{ flex: 1, overflow: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>

                {error && (
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        background: PA.warnSoft, color: PA.warn, borderRadius: 10, padding: '10px 16px', fontSize: 13,
                    }}>
                        <AlertCircle size={15} />
                        <span style={{ flex: 1 }}>{error}</span>
                        <button onClick={() => setError('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: PA.warn, display: 'flex' }}>
                            <X size={14} />
                        </button>
                    </div>
                )}

                {loading ? (
                    <div style={{ padding: 48, textAlign: 'center', color: PA.ink3, fontSize: 14 }}>
                        Cargando…
                    </div>
                ) : plantillas.length === 0 ? (
                    <div style={{
                        background: PA.surface, border: `1px solid ${PA.line}`, borderRadius: 14,
                        padding: 48, textAlign: 'center',
                    }}>
                        <CalendarDays size={40} style={{ color: PA.ink3, marginBottom: 14 }} />
                        <p style={{ margin: '0 0 16px', color: PA.ink3, fontSize: 14 }}>
                            No hay rotativas en este servicio.
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
                    plantillas.map(p => (
                        <PlantillaCard
                            key={p.idPlantilla}
                            plantilla={p}
                            onEdit={setEditing}
                            onDelete={setConfirmDel}
                        />
                    ))
                )}

            </div>

            {/* Confirmación de eliminación (bottom-sheet) */}
            {confirmDel && (
                <div
                    onClick={() => setConfirmDel(null)}
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
                        <div style={{ display: 'flex', justifyContent: 'center', paddingBottom: 16 }}>
                            <div style={{ width: 40, height: 4, background: PA.line, borderRadius: 99 }} />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}>
                            <div style={{ width: 56, height: 56, borderRadius: 16, background: PA.warnSoft, display: 'grid', placeItems: 'center' }}>
                                <Trash2 size={26} color={PA.warn} />
                            </div>
                        </div>
                        <div style={{ fontWeight: 800, fontSize: 18, color: PA.ink, textAlign: 'center', marginBottom: 10 }}>
                            ¿Eliminar rotativa?
                        </div>
                        <p style={{ fontSize: 14, color: PA.ink2, margin: '0 0 24px', lineHeight: 1.5, textAlign: 'center' }}>
                            Se eliminará <strong style={{ color: PA.ink }}>{confirmDel.nombre}</strong> y toda su
                            secuencia de días. Esta acción no se puede deshacer.
                        </p>
                        <div style={{ display: 'flex', gap: 10 }}>
                            <button onClick={() => setConfirmDel(null)} style={{
                                flex: 1, padding: '13px 0', borderRadius: 12, border: `1.5px solid ${PA.line}`,
                                background: 'none', color: PA.ink2, fontSize: 15, fontWeight: 700, cursor: 'pointer',
                            }}>
                                Cancelar
                            </button>
                            <button onClick={handleDelete} disabled={deleting} style={{
                                flex: 1, padding: '13px 0', borderRadius: 12, border: 'none',
                                background: PA.warn, color: '#fff', fontSize: 15, fontWeight: 700,
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
