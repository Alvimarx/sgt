// calendarView.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { SGT_DATA } from '../Admin2/data';
import { SGTAvatar, SGTBadge, SGTIcon, Sheet } from '../Style/UIPrimitives';
import { useAuth } from '../../context/AuthContext';
import { getTurnosCalendario } from '../../services/turnosService';
import ShiftDetail, { getTeamColor, formatShiftLabel } from '../Comun/ShiftDetail';
import { exportarTurnosCsv } from '../../services/exportacionService';
// ---------------------------------------------------------------------------
// HELPERS DE PRESENTACIÓN
// ---------------------------------------------------------------------------

const MONTH_NAMES = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];
const DAY_LABELS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

const TEAM_COLORS = [
    { bg: '#b0baee', soft: '#D7E2FF', ink: '#183b6b' },
    { bg: 'rgb(166,231,180)', soft: '#D2E9D6', ink: '#24513A' },
    { bg: 'rgb(245,223,188)', soft: '#F5E0B7', ink: '#6B4D15' },
    { bg: 'rgb(225,188,245)', soft: '#E3D1F3', ink: '#5A3A72' },
    { bg: 'rgb(248,208,223)', soft: '#F2D1D5', ink: '#8C3F44' },
    { bg: 'rgb(173,224,231)', soft: '#CFE9F0', ink: '#2C6270' },
];

const hashStr = (value = '') => {
    let h = 0;
    const s = String(value);
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    return h;
};

// getTeamColor importado desde ShiftDetail — color determinista por tipo+puesto

const formatTime = (v) => (v ? String(v).slice(0, 5) : null);

/** Devuelve el día de la semana para el 1ro del mes (0=Lun … 6=Dom) */
const firstDayOfMonth = (year, month) => {
    const d = new Date(year, month - 1, 1).getDay(); // 0=Dom
    return d === 0 ? 6 : d - 1; // convierte a Lun=0
};

const daysInMonth = (year, month) => new Date(year, month, 0).getDate();

const todayKey = () => new Date().toISOString().slice(0, 10);
const dateKey = (year, month, day) =>
    `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

// ---------------------------------------------------------------------------
// CALENDARVIEW
// ---------------------------------------------------------------------------

const getShiftName = (shift) =>
    shift?.nombreTipoTurno ||
    shift?.nombreTipo ||
    shift?.nombre ||
    (shift?.tipo === 'noche' ? 'Turno noche' : 'Turno día');

const buildDayGroups = (shifts = []) => {
    const map = new Map();

    shifts.forEach((shift) => {
        const key =
            shift.teamKey ||
            `${shift.idTipoTurno ?? getShiftName(shift)}-${shift.inicio ?? ''}-${shift.fin ?? ''}`;

        if (!map.has(key)) {
            map.set(key, {
                key,
                sample: shift,
                turnos: [],
            });
        }

        map.get(key).turnos.push(shift);
    });

    return Array.from(map.values()).map((group) => {
        const sample = group.sample;
        const total = group.turnos.length;
        const asignados = group.turnos.filter(t => t.idFuncionario != null && !t.turnoLibre).length;
        const vacantes = Math.max(total - asignados, 0);

        return {
            key: group.key,
            sample,
            turnos: group.turnos,
            nombre: getShiftName(sample),
            tipo: sample.tipo,
            inicio: sample.inicio,
            fin: sample.fin,
            total,
            asignados,
            vacantes,
            completo: total > 0 && vacantes === 0,
            hasMy: group.turnos.some(t => t.miTurno),
        };
    });
};

const getCoverageStats = (shifts = []) => {
    const groups = buildDayGroups(shifts);

    const total = groups.reduce((acc, g) => acc + g.total, 0);
    const asignados = groups.reduce((acc, g) => acc + g.asignados, 0);
    const vacantes = groups.reduce((acc, g) => acc + g.vacantes, 0);

    return {
        groups,
        total,
        asignados,
        vacantes,
        cobertura: total > 0 ? Math.round((asignados / total) * 100) : 0,
        hasTurns: total > 0,
        hasMy: shifts.some(s => s.miTurno),
        completos: groups.filter(g => g.completo).length,
        conVacantes: groups.filter(g => g.vacantes > 0).length,
    };
};

const getStatusVisual = (stats, PA) => {
    if (!stats.hasTurns) {
        return {
            label: 'Sin turnos',
            bg: '#fff',
            border: PA.line2,
            ink: PA.ink3,
            badgeBg: '#F3F4F6',
            badgeInk: PA.ink3,
        };
    }

    if (stats.vacantes > 0) {
        return {
            label: `${stats.vacantes} vacante${stats.vacantes === 1 ? '' : 's'}`,
            bg: '#FFF7ED',
            border: '#FDBA74',
            ink: '#9A3412',
            badgeBg: '#FFEDD5',
            badgeInk: '#9A3412',
        };
    }

    return {
        label: 'Cubierto',
        bg: '#F0FDF4',
        border: '#86EFAC',
        ink: '#166534',
        badgeBg: '#DCFCE7',
        badgeInk: '#166534',
    };
};

const CalendarView = ({ onBack, onOpenBitacora, onOpenSolicitudes }) => {
    const { user } = useAuth();
    const PA = SGT_DATA.PALETTE;

    const esJefatura = user?.rol === 'JEFATURA' || user?.rol === 'SUBROGANTE';

    const rolSistema = String(user?.rolSistema || '').toUpperCase();
    const esAdmin = rolSistema === 'ADMIN' || rolSistema === 'ADMINISTRADOR';

    const vistaPanoramica = esJefatura || esAdmin;

    // Mes visible — arranca en el mes actual
    const now = new Date();
    const [viewYear, setViewYear] = useState(now.getFullYear());
    const [viewMonth, setViewMonth] = useState(now.getMonth() + 1); // 1-12

    const [shiftsByDay, setShiftsByDay] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedDay, setSelectedDay] = useState(null);
    const [detailShift, setDetailShift] = useState(null);
    const [jefaturaFilter, setJefaturaFilter] = useState('todos');
    
    //relacionado a exportacion
    const [exportSheetOpen, setExportSheetOpen] = useState(false);
    const [exportMonthValue, setExportMonthValue] = useState(
        `${viewYear}-${String(viewMonth).padStart(2, '0')}`
    );
    const [exportScope, setExportScope] = useState('mios');
    const [exporting, setExporting] = useState(false);
    const [exportError, setExportError] = useState('');
    const puedeExportarServicioCompleto = vistaPanoramica;

    // Carga al cambiar mes
    useEffect(() => {
        let mounted = true;
        setLoading(true);
        setError('');
        setSelectedDay(null);

        const servicioId = user?.servicioId || localStorage.getItem('servicioId');
        const funcionarioId = Number(user?.id ?? user?.userId);

        getTurnosCalendario({
            servicioId,
            funcionarioId,
            year: viewYear,
            month: viewMonth,
            esJefatura: vistaPanoramica,
        }).then((result) => {
            if (!mounted) return;
            if (result.success) {
                setShiftsByDay(result.data.shiftsByDay);
            } else {
                setError(result.error);
                setShiftsByDay({});
            }
            setLoading(false);
        });

        return () => { mounted = false; };
    }, [viewYear, viewMonth, user?.id, user?.userId, user?.servicioId, vistaPanoramica]);

    // Grilla de celdas del mes
    const cells = useMemo(() => {
        const leading = firstDayOfMonth(viewYear, viewMonth);
        const days = daysInMonth(viewYear, viewMonth);
        const arr = Array(leading).fill(null);
        for (let d = 1; d <= days; d++) arr.push(d);
        while (arr.length % 7 !== 0) arr.push(null);
        return arr;
    }, [viewYear, viewMonth]);

    const openExportSheet = () => {
        setExportMonthValue(`${viewYear}-${String(viewMonth).padStart(2, '0')}`);
        setExportScope('mios');
        setExportError('');
        setExportSheetOpen(true);
    };

    const handleExportCsv = async () => {
        setExportError('');

        if (!user?.servicioId) {
            setExportError('No hay servicio seleccionado para exportar.');
            return;
        }

        if (!exportMonthValue) {
            setExportError('Debes seleccionar un mes.');
            return;
        }

        const [anioStr, mesStr] = exportMonthValue.split('-');
        const anio = Number(anioStr);
        const mes = Number(mesStr);

        const funcionarioId = Number(user?.id ?? user?.userId);

        const exportarSoloMisTurnos =
            !puedeExportarServicioCompleto || exportScope === 'mios';

        setExporting(true);

        const result = await exportarTurnosCsv({
            anio,
            mes,
            idServicio: user.servicioId,
            idFuncionario: exportarSoloMisTurnos ? funcionarioId : null,
        });

        setExporting(false);

        if (!result.success) {
            setExportError(result.error);
            return;
        }

        setExportSheetOpen(false);
    };

    const today = todayKey();

    const goToPrevMonth = () => {
        if (viewMonth === 1) { setViewYear(y => y - 1); setViewMonth(12); }
        else setViewMonth(m => m - 1);
    };
    const goToNextMonth = () => {
        if (viewMonth === 12) { setViewYear(y => y + 1); setViewMonth(1); }
        else setViewMonth(m => m + 1);
    };

    const selectedKey = selectedDay ? dateKey(viewYear, viewMonth, selectedDay) : null;
    const selectedShifts = selectedKey ? (shiftsByDay[selectedKey] || []) : [];
    const jefaturaDays = useMemo(() => {
        const totalDays = daysInMonth(viewYear, viewMonth);

        return Array.from({ length: totalDays }, (_, index) => {
            const day = index + 1;
            const key = dateKey(viewYear, viewMonth, day);
            const shifts = shiftsByDay[key] || [];
            const stats = getCoverageStats(shifts);

            return {
                day,
                key,
                shifts,
                stats,
            };
        });
    }, [viewYear, viewMonth, shiftsByDay]);

    const monthSummary = useMemo(() => {
        const total = jefaturaDays.reduce((acc, d) => acc + d.stats.total, 0);
        const asignados = jefaturaDays.reduce((acc, d) => acc + d.stats.asignados, 0);
        const vacantes = jefaturaDays.reduce((acc, d) => acc + d.stats.vacantes, 0);

        return {
            total,
            asignados,
            vacantes,
            cobertura: total > 0 ? Math.round((asignados / total) * 100) : 0,
            diasConTurnos: jefaturaDays.filter(d => d.stats.hasTurns).length,
            diasConVacantes: jefaturaDays.filter(d => d.stats.vacantes > 0).length,
        };
    }, [jefaturaDays]);

    const visibleJefaturaDays = useMemo(() => {
        if (jefaturaFilter === 'vacantes') {
            return jefaturaDays.filter(d => d.stats.vacantes > 0);
        }

        return jefaturaDays;
    }, [jefaturaDays, jefaturaFilter]);

    const selectedStats = useMemo(() => {
        return getCoverageStats(selectedShifts);
    }, [selectedShifts]);
    const sheetTitle = selectedDay
        ? `${DAY_LABELS[(new Date(viewYear, viewMonth - 1, selectedDay).getDay() + 6) % 7]} ${selectedDay} ${MONTH_NAMES[viewMonth - 1].slice(0, 3)}`
        : '';

    return (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: PA.surface2, overflow: 'hidden' }}>

            {/* Header */}
            <div style={{ padding: '16px', background: '#fff', borderBottom: `1px solid ${PA.line2}`, display: 'flex', alignItems: 'center', gap: 12 }}>
                <button onClick={onBack} style={{ background: 'transparent', border: 'none', padding: 4, cursor: 'pointer', display: 'flex' }}>
                    <SGTIcon name="chevron-left" size={24} color={PA.ink} />
                </button>

                {/* Navegación de mes */}
                <button onClick={goToPrevMonth} style={{ background: 'transparent', border: 'none', padding: 4, cursor: 'pointer', display: 'flex' }}>
                    <SGTIcon name="chevron-left" size={18} color={PA.ink2} />
                </button>
                <div style={{ flex: 1, textAlign: 'center', fontSize: 17, fontWeight: 800, color: PA.ink }}>
                    {MONTH_NAMES[viewMonth - 1]} {viewYear}
                </div>
                <button onClick={goToNextMonth} style={{ background: 'transparent', border: 'none', padding: 4, cursor: 'pointer', display: 'flex' }}>
                    <SGTIcon name="chevron-right" size={18} color={PA.ink2} />
                </button>
            </div>

            <div style={{ flex: 1, overflow: 'auto' }}>


                {vistaPanoramica ? (
                    <JefaturaCalendarOverview
                        PA={PA}
                        loading={loading}
                        days={visibleJefaturaDays}
                        monthSummary={monthSummary}
                        filter={jefaturaFilter}
                        onFilterChange={setJefaturaFilter}
                        selectedDay={selectedDay}
                        onSelectDay={setSelectedDay}
                    />
                ) : (
                    <>
                        {/* Error */}
                        {error && !loading && (
                            <div style={{ margin: '10px 14px 0', padding: '10px 12px', borderRadius: 12, background: '#FFF4F5', color: '#8C3F44', border: '1px solid #F3D2D5', fontSize: 12.5, fontWeight: 700 }}>
                                {error}
                            </div>
                        )}

                        {/* Grilla del calendario */}
                        <div style={{ padding: '14px 14px 0' }}>
                            {/* Cabecera de días */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: 6 }}>
                                {DAY_LABELS.map((l, i) => (
                                    <div key={l} style={{ textAlign: 'center', fontSize: 11, fontWeight: 800, color: i >= 5 ? PA.ink3 : PA.ink2 }}>
                                        {l}
                                    </div>
                                ))}
                            </div>

                            {loading ? (
                                <div style={{ padding: '40px 0', textAlign: 'center', color: PA.ink3, fontSize: 13, fontWeight: 600 }}>
                                    Cargando…
                                </div>
                            ) : (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '3px 2px' }}>
                                    {cells.map((day, idx) => {
                                        if (!day) return <div key={idx} />;

                                        const key = dateKey(viewYear, viewMonth, day);
                                        const shifts = shiftsByDay[key] || [];
                                        const miShift = shifts.find(s => s.miTurno);
                                        const hasLibre = shifts.some(s => s.turnoLibre);
                                        const isToday = key === today;
                                        const isSel = selectedDay === day;
                                        const isWknd = idx % 7 >= 5;
                                        const tappable = shifts.length > 0;

                                        return (
                                            <div
                                                key={idx}
                                                onClick={() => tappable && setSelectedDay(isSel ? null : day)}
                                                style={{
                                                    textAlign: 'center',
                                                    padding: '5px 2px',
                                                    borderRadius: 10,
                                                    cursor: tappable ? 'pointer' : 'default',
                                                    background: isToday ? PA.primary : isSel ? PA.primarySoft : 'transparent',
                                                    transition: 'background 0.15s',
                                                }}
                                            >
                                                <div style={{
                                                    fontSize: 14,
                                                    lineHeight: 1,
                                                    fontWeight: isToday || isSel ? 800 : 500,
                                                    color: isToday ? '#fff' : isSel ? PA.primary : isWknd ? PA.ink3 : PA.ink,
                                                    marginBottom: 4,
                                                }}>
                                                    {day}
                                                </div>

                                                {/* Puntos indicadores */}
                                                <div style={{ display: 'flex', justifyContent: 'center', gap: 2, minHeight: 6 }}>
                                                    {miShift && (
                                                        <div style={{
                                                            width: 5, height: 5, borderRadius: 99,
                                                            background: isToday ? 'rgba(255,255,255,0.85)' : PA.primary,
                                                        }} />
                                                    )}
                                                    {hasLibre && (
                                                        <div style={{
                                                            width: 5, height: 5, borderRadius: 99,
                                                            background: isToday ? 'rgba(255,255,255,0.6)' : PA.accent,
                                                        }} />
                                                    )}
                                                    {/* Jefatura: punto gris por cada turno ajeno */}
                                                    {esJefatura && !miShift && shifts.filter(s => !s.turnoLibre).length > 0 && (
                                                        <div style={{
                                                            width: 5, height: 5, borderRadius: 99,
                                                            background: isToday ? 'rgba(255,255,255,0.5)' : 'rgba(240, 178, 43, 0.85)',
                                                        }} />
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>              
                    </>
                )}

                {/* Exportación CSV */}
                <div style={{ padding: '14px 18px 4px' }}>
                    <button
                        onClick={openExportSheet}
                        style={{
                            width: '100%',
                            border: `1px solid ${PA.line2}`,
                            background: '#fff',
                            color: PA.ink,
                            borderRadius: 14,
                            padding: '11px 14px',
                            fontSize: 13,
                            fontWeight: 800,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 8,
                            boxShadow: '0 2px 8px rgba(15, 23, 42, 0.04)',
                        }}
                    >
                        <SGTIcon name="download" size={16} color={PA.ink} />
                        Exportar turnos CSV
                    </button>
                </div>

                {/* Leyenda */}
                <div style={{ display: 'flex', gap: 14, padding: '10px 18px', borderTop: `1px solid ${PA.line2}`, marginTop: 10, flexWrap: 'wrap' }}>
                    <LegendDot color={PA.primary} label="Mi turno" />
                    <LegendDot color={PA.accent} label="Cupo libre" />
                    {esJefatura && <LegendDot color='rgba(240, 178, 43, 0.85)' label="Turno del servicio" />}
                </div>

                {!selectedDay && !loading && (
                    <div style={{ padding: '24px', textAlign: 'center' }}>
                        <span style={{ fontSize: 12, color: PA.ink3, fontWeight: 600 }}>
                            Toca un día con punto para ver sus turnos
                        </span>
                    </div>
                )}
            </div>

            {/* Sheet de detalle del día */}
            <Sheet
                open={!!selectedDay}
                onClose={() => setSelectedDay(null)}
                title={sheetTitle}
                maxHeight="72%"
            >
                <div style={{ padding: '4px 16px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {selectedShifts.length === 0 ? (
                        <p style={{ fontSize: 13, color: SGT_DATA.PALETTE.ink3, fontWeight: 600, textAlign: 'center', padding: '20px 0' }}>
                            Sin turnos para mostrar.
                        </p>
                    ) : vistaPanoramica ? (
                        <JefaturaDayDetail
                            PA={PA}
                            stats={selectedStats}
                            onOpen={(shift) => setDetailShift(shift)}
                        />
                    ) : (
                        selectedShifts.map(s => (
                            <ShiftCard
                                key={s.id}
                                shift={s}
                                esJefatura={false}
                                onOpen={(shift) => setDetailShift(shift)}
                            />
                        ))
                    )}
                </div>
            </Sheet>

            {/* Sheet de detalle completo del turno — igual que en AgendaView */}
            <Sheet
                open={!!detailShift}
                onClose={() => setDetailShift(null)}
                title="Detalle del turno"
                maxHeight="88%"
            >
                {detailShift && (
                    <ShiftDetail
                        shift={detailShift}
                        onAction={(actionId, shift) => {
                            if (actionId === "historial") {
                                onOpenBitacora?.();
                                return;
                            }
                            if (actionId === "solicitar-turno") {
                                onOpenSolicitudes?.({ tipoSolicitudId: 3, idTurno: shift.id, turnoLabel: formatShiftLabel(shift) });
                                return;
                            }
                        }}
                    />
                )}
            </Sheet>

            {/* Sheet de exportación CSV */}
            <Sheet
                open={exportSheetOpen}
                onClose={() => !exporting && setExportSheetOpen(false)}
                title="Exportar turnos CSV"
                maxHeight="60%"
            >
                <div style={{ padding: '8px 16px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>

                    <div>
                        <label style={{ display: 'block', fontSize: 12, fontWeight: 800, color: PA.ink2, marginBottom: 6 }}>
                            Mes a exportar
                        </label>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <button
                                onClick={() => {
                                    const [year, month] = exportMonthValue.split('-').map(Number);
                                    let newMonth = month - 1;
                                    let newYear = year;
                                    if (newMonth < 1) {
                                        newMonth = 12;
                                        newYear -= 1;
                                    }
                                    setExportMonthValue(`${newYear}-${String(newMonth).padStart(2, '0')}`);
                                }}
                                disabled={exporting}
                                style={{
                                    width: 36,
                                    height: 36,
                                    border: `1px solid ${PA.line2}`,
                                    background: '#fff',
                                    borderRadius: 10,
                                    cursor: exporting ? 'default' : 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    opacity: exporting ? 0.5 : 1,
                                }}
                            >
                                <SGTIcon name="chevron-left" size={18} color={PA.ink} />
                            </button>

                            <div style={{
                                flex: 1,
                                border: `1px solid ${PA.line2}`,
                                borderRadius: 12,
                                padding: '10px 12px',
                                textAlign: 'center',
                                fontSize: 14,
                                fontWeight: 700,
                                color: PA.ink,
                                background: '#fff',
                            }}>
                                {MONTH_NAMES[Number(exportMonthValue.split('-')[1]) - 1]} {exportMonthValue.split('-')[0]}
                            </div>

                            <button
                                onClick={() => {
                                    const [year, month] = exportMonthValue.split('-').map(Number);
                                    let newMonth = month + 1;
                                    let newYear = year;
                                    if (newMonth > 12) {
                                        newMonth = 1;
                                        newYear += 1;
                                    }
                                    setExportMonthValue(`${newYear}-${String(newMonth).padStart(2, '0')}`);
                                }}
                                disabled={exporting}
                                style={{
                                    width: 36,
                                    height: 36,
                                    border: `1px solid ${PA.line2}`,
                                    background: '#fff',
                                    borderRadius: 10,
                                    cursor: exporting ? 'default' : 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    opacity: exporting ? 0.5 : 1,
                                }}
                            >
                                <SGTIcon name="chevron-right" size={18} color={PA.ink} />
                            </button>
                        </div>
                    </div>

                    {puedeExportarServicioCompleto && (
                        <div>
                            <div style={{ fontSize: 12, fontWeight: 800, color: PA.ink2, marginBottom: 8 }}>
                                ¿Qué turnos quieres exportar?
                            </div>

                            <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, fontSize: 13, fontWeight: 700, color: PA.ink }}>
                                <input
                                    type="radio"
                                    name="exportScope"
                                    value="mios"
                                    checked={exportScope === 'mios'}
                                    onChange={() => setExportScope('mios')}
                                    disabled={exporting}
                                />
                                Solo mis turnos
                            </label>

                            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700, color: PA.ink }}>
                                <input
                                    type="radio"
                                    name="exportScope"
                                    value="servicio"
                                    checked={exportScope === 'servicio'}
                                    onChange={() => setExportScope('servicio')}
                                    disabled={exporting}
                                />
                                Todos los turnos del servicio actual
                            </label>
                        </div>
                    )}

                    {!puedeExportarServicioCompleto && (
                        <div style={{ fontSize: 12.5, fontWeight: 700, color: PA.ink3, background: '#fff', border: `1px solid ${PA.line2}`, borderRadius: 12, padding: 10 }}>
                            Se exportarán solo tus turnos del servicio actual.
                        </div>
                    )}

                    {exportError && (
                        <div style={{ padding: '10px 12px', borderRadius: 12, background: '#FFF4F5', color: '#8C3F44', border: '1px solid #F3D2D5', fontSize: 12.5, fontWeight: 700 }}>
                            {exportError}
                        </div>
                    )}

                    <button
                        onClick={handleExportCsv}
                        disabled={exporting}
                        style={{
                            width: '100%',
                            border: 'none',
                            background: exporting ? PA.ink3 : PA.primary,
                            color: '#fff',
                            borderRadius: 14,
                            padding: '12px 14px',
                            fontSize: 13.5,
                            fontWeight: 900,
                            cursor: exporting ? 'default' : 'pointer',
                        }}
                    >
                        {exporting ? 'Exportando…' : 'Descargar CSV'}
                    </button>
                </div>
            </Sheet>
        </div>
    );
};

// ---------------------------------------------------------------------------
// JEFATURACALENDAROVERVIEW — vista panorámica para jefes/admins
// ---------------------------------------------------------------------------

const JefaturaCalendarOverview = ({
    PA,
    loading,
    days,
    monthSummary,
    filter,
    onFilterChange,
    selectedDay,
    onSelectDay,
}) => {
    if (loading) {
        return (
            <div style={{ padding: '40px 0', textAlign: 'center', color: PA.ink3, fontSize: 13, fontWeight: 600 }}>
                Cargando…
            </div>
        );
    }

    const filters = [
        { id: 'todos', label: 'Todos' },
        { id: 'vacantes', label: 'Con vacantes' },
    ];

    return (
        <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>

            {/* Resumen mensual */}
            <div style={{
                background: '#fff',
                border: `1px solid ${PA.line2}`,
                borderRadius: 18,
                padding: 14,
                boxShadow: '0 2px 10px rgba(15,23,42,0.04)',
            }}>
                <div style={{ fontSize: 13, fontWeight: 900, color: PA.ink, marginBottom: 10 }}>
                    Cobertura del mes
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                    <SummaryTile label="Cobertura" value={`${monthSummary.cobertura}%`} PA={PA} />
                    <SummaryTile label="Vacantes" value={monthSummary.vacantes} PA={PA} danger={monthSummary.vacantes > 0} />
                    <SummaryTile label="Asignados" value={`${monthSummary.asignados}/${monthSummary.total}`} PA={PA} />
                    <SummaryTile label="Días críticos" value={monthSummary.diasConVacantes} PA={PA} danger={monthSummary.diasConVacantes > 0} />
                </div>
            </div>

            {/* Filtros */}
            <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 2 }}>
                {filters.map(item => {
                    const active = filter === item.id;

                    return (
                        <button
                            key={item.id}
                            onClick={() => onFilterChange(item.id)}
                            style={{
                                border: `1px solid ${active ? PA.primary : PA.line2}`,
                                background: active ? PA.primary : '#fff',
                                color: active ? '#fff' : PA.ink2,
                                borderRadius: 999,
                                padding: '8px 12px',
                                fontSize: 12,
                                fontWeight: 900,
                                whiteSpace: 'nowrap',
                                cursor: 'pointer',
                            }}
                        >
                            {item.label}
                        </button>
                    );
                })}
            </div>

            {/* Lista vertical del mes */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {days.length === 0 ? (
                    <div style={{
                        background: '#fff',
                        border: `1px solid ${PA.line2}`,
                        borderRadius: 16,
                        padding: 18,
                        textAlign: 'center',
                        color: PA.ink3,
                        fontSize: 12.5,
                        fontWeight: 700,
                    }}>
                        No hay días para mostrar con este filtro.
                    </div>
                ) : (
                    days.map(item => (
                        <JefaturaDayCard
                            key={item.key}
                            PA={PA}
                            item={item}
                            selected={selectedDay === item.day}
                            onSelect={() => item.stats.hasTurns && onSelectDay(selectedDay === item.day ? null : item.day)}
                        />
                    ))
                )}
            </div>
        </div>
    );
};

const SummaryTile = ({ label, value, PA, danger = false }) => (
    <div style={{
        background: danger ? '#FFF7ED' : PA.surface2,
        border: `1px solid ${danger ? '#FDBA74' : PA.line2}`,
        borderRadius: 14,
        padding: 10,
    }}>
        <div style={{ fontSize: 10.5, fontWeight: 800, color: PA.ink3, marginBottom: 4 }}>
            {label}
        </div>
        <div style={{ fontSize: 18, fontWeight: 950, color: danger ? '#9A3412' : PA.ink }}>
            {value}
        </div>
    </div>
);

const JefaturaDayCard = ({ PA, item, selected, onSelect }) => {
    const { day, stats } = item;
    const visual = getStatusVisual(stats, PA);
    const date = new Date(item.key + 'T00:00:00');
    const weekday = date.toLocaleDateString('es-CL', { weekday: 'long' });

    return (
        <div
            onClick={onSelect}
            style={{
                background: selected ? PA.primarySoft : visual.bg,
                border: `1px solid ${selected ? PA.primary : visual.border}`,
                borderRadius: 18,
                padding: 13,
                cursor: stats.hasTurns ? 'pointer' : 'default',
                boxShadow: stats.vacantes > 0 ? '0 2px 10px rgba(154,52,18,0.08)' : '0 2px 8px rgba(15,23,42,0.03)',
            }}
        >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <div style={{
                    width: 42,
                    minWidth: 42,
                    height: 42,
                    borderRadius: 14,
                    background: stats.hasMy ? PA.primary : '#fff',
                    color: stats.hasMy ? '#fff' : PA.ink,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: `1px solid ${stats.hasMy ? PA.primary : PA.line2}`,
                }}>
                    <div style={{ fontSize: 16, fontWeight: 950, lineHeight: 1 }}>{day}</div>
                    <div style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', marginTop: 2 }}>
                        {weekday.slice(0, 3)}
                    </div>
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7 }}>
                        <span style={{
                            background: visual.badgeBg,
                            color: visual.badgeInk,
                            borderRadius: 999,
                            padding: '4px 8px',
                            fontSize: 10.5,
                            fontWeight: 900,
                        }}>
                            {visual.label}
                        </span>

                        {stats.hasMy && (
                            <span style={{
                                background: PA.primarySoft,
                                color: PA.primary,
                                borderRadius: 999,
                                padding: '4px 8px',
                                fontSize: 10.5,
                                fontWeight: 900,
                            }}>
                                Tu turno
                            </span>
                        )}
                    </div>

                    {stats.hasTurns ? (
                        <>
                            <div style={{ fontSize: 12, fontWeight: 800, color: PA.ink2, marginBottom: 8 }}>
                                Cobertura {stats.asignados}/{stats.total} · {stats.cobertura}%
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                {stats.groups.slice(0, 3).map(group => {
                                    const color = getTeamColor(group.sample);

                                    return (
                                        <div
                                            key={group.key}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 8,
                                                background: 'rgba(255,255,255,0.72)',
                                                borderRadius: 10,
                                                padding: '7px 8px',
                                            }}
                                        >
                                            <div style={{
                                                width: 8,
                                                height: 8,
                                                borderRadius: 99,
                                                background: color.bg,
                                                border: `1px solid ${color.soft}`,
                                            }} />

                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ fontSize: 11.5, fontWeight: 900, color: PA.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    {group.nombre}
                                                </div>
                                                <div style={{ fontSize: 10.5, fontWeight: 700, color: PA.ink3 }}>
                                                    {group.inicio && group.fin ? `${group.inicio}–${group.fin}` : 'Horario no definido'}
                                                </div>
                                            </div>

                                            <div style={{
                                                fontSize: 11,
                                                fontWeight: 950,
                                                color: group.vacantes > 0 ? '#9A3412' : '#166534',
                                            }}>
                                                {group.asignados}/{group.total}
                                            </div>
                                        </div>
                                    );
                                })}

                                {stats.groups.length > 3 && (
                                    <div style={{ fontSize: 11, fontWeight: 800, color: PA.ink3, paddingLeft: 4 }}>
                                        +{stats.groups.length - 3} turno(s) más
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        <div style={{ fontSize: 12, fontWeight: 700, color: PA.ink3 }}>
                            No hay turnos registrados para este día.
                        </div>
                    )}
                </div>

                {stats.hasTurns && (
                    <SGTIcon name="chevron-right" size={16} color={PA.ink3} />
                )}
            </div>
        </div>
    );
};

// ---------------------------------------------------------------------------
// JEFATURADAY DETAIL — detalle de día para jefes/admins en sheet
// ---------------------------------------------------------------------------

const JefaturaDayDetail = ({ PA, stats, onOpen }) => {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{
                background: '#fff',
                border: `1px solid ${PA.line2}`,
                borderRadius: 16,
                padding: 12,
            }}>
                <div style={{ fontSize: 12, fontWeight: 900, color: PA.ink2, marginBottom: 6 }}>
                    Resumen del día
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                    <MiniStat label="Asignados" value={stats.asignados} PA={PA} />
                    <MiniStat label="Total" value={stats.total} PA={PA} />
                    <MiniStat label="Vacantes" value={stats.vacantes} PA={PA} danger={stats.vacantes > 0} />
                </div>
            </div>

            {stats.groups.map(group => {
                const color = getTeamColor(group.sample);
                const asignados = group.turnos.filter(t => t.idFuncionario != null && !t.turnoLibre);
                const vacantes = group.turnos.filter(t => t.idFuncionario == null || t.turnoLibre);

                return (
                    <div
                        key={group.key}
                        style={{
                            background: color.bg,
                            border: `1px solid ${color.soft}`,
                            borderRadius: 16,
                            padding: 12,
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                            <SGTIcon
                                name={group.tipo === 'noche' ? 'moon' : 'sun'}
                                size={15}
                                color={color.ink}
                            />

                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: 13.5, fontWeight: 950, color: color.ink }}>
                                    {group.nombre}
                                </div>
                                <div style={{ fontSize: 11.5, fontWeight: 700, color: color.ink }}>
                                    {group.inicio && group.fin ? `${group.inicio}–${group.fin}` : 'Horario no definido'}
                                </div>
                            </div>

                            <span style={{
                                background: 'rgba(255,255,255,0.75)',
                                borderRadius: 999,
                                padding: '5px 8px',
                                fontSize: 11,
                                fontWeight: 950,
                                color: group.vacantes > 0 ? '#9A3412' : '#166534',
                            }}>
                                {group.asignados}/{group.total}
                            </span>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {asignados.length > 0 && (
                                <div style={{
                                    background: 'rgba(255,255,255,0.72)',
                                    borderRadius: 12,
                                    padding: 10,
                                }}>
                                    <div style={{ fontSize: 11, fontWeight: 950, color: PA.ink2, marginBottom: 7 }}>
                                        Asignados
                                    </div>

                                    {asignados.map(turno => (
                                        <button
                                            key={turno.id}
                                            onClick={() => onOpen?.(turno)}
                                            style={{
                                                width: '100%',
                                                border: 'none',
                                                background: 'transparent',
                                                padding: '7px 0',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 8,
                                                cursor: 'pointer',
                                                textAlign: 'left',
                                            }}
                                        >
                                            <div style={{
                                                width: 28,
                                                height: 28,
                                                borderRadius: 99,
                                                background: PA.surface2,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                fontSize: 11,
                                                fontWeight: 950,
                                                color: PA.ink,
                                            }}>
                                                {(turno.nombreFuncionario || '?')
                                                    .split(/\s+/)
                                                    .filter(Boolean)
                                                    .slice(0, 2)
                                                    .map(p => p[0])
                                                    .join('')
                                                    .toUpperCase()}
                                            </div>

                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ fontSize: 12.5, fontWeight: 850, color: PA.ink }}>
                                                    {turno.nombreFuncionario}
                                                    {turno.miTurno ? ' (tú)' : ''}
                                                </div>
                                                <div style={{ fontSize: 11, fontWeight: 650, color: PA.ink3 }}>
                                                    Posición: {turno.nombrePuesto || 'Sin posición'}
                                                </div>
                                            </div>

                                            <SGTIcon name="chevron-right" size={13} color={PA.ink3} />
                                        </button>
                                    ))}
                                </div>
                            )}

                            {vacantes.length > 0 && (
                                <div style={{
                                    background: '#FFF7ED',
                                    border: '1px solid #FDBA74',
                                    borderRadius: 12,
                                    padding: 10,
                                }}>
                                    <div style={{ fontSize: 11, fontWeight: 950, color: '#9A3412', marginBottom: 7 }}>
                                        Vacantes por cubrir
                                    </div>

                                    {vacantes.map(turno => (
                                        <button
                                            key={turno.id}
                                            onClick={() => onOpen?.(turno)}
                                            style={{
                                                width: '100%',
                                                border: 'none',
                                                background: 'transparent',
                                                padding: '6px 0',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 8,
                                                cursor: 'pointer',
                                                textAlign: 'left',
                                            }}
                                        >
                                            <SGTIcon name="alert-circle" size={14} color="#9A3412" />

                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontSize: 12.5, fontWeight: 850, color: '#9A3412' }}>
                                                    {turno.nombrePuesto || 'Posición sin asignar'}
                                                </div>
                                                <div style={{ fontSize: 11, fontWeight: 650, color: '#9A3412' }}>
                                                    Cupo libre disponible
                                                </div>
                                            </div>

                                            <SGTIcon name="chevron-right" size={13} color="#9A3412" />
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

const MiniStat = ({ label, value, PA, danger = false }) => (
    <div style={{
        background: danger ? '#FFF7ED' : PA.surface2,
        border: `1px solid ${danger ? '#FDBA74' : PA.line2}`,
        borderRadius: 12,
        padding: 8,
        textAlign: 'center',
    }}>
        <div style={{ fontSize: 10, fontWeight: 800, color: PA.ink3, marginBottom: 3 }}>
            {label}
        </div>
        <div style={{ fontSize: 16, fontWeight: 950, color: danger ? '#9A3412' : PA.ink }}>
            {value}
        </div>
    </div>
);

// ---------------------------------------------------------------------------
// SHIFTCARD — card de turno dentro del Sheet del día
// ---------------------------------------------------------------------------

const ShiftCard = ({ shift, esJefatura, onOpen }) => {
    const PA = SGT_DATA.PALETTE;
    const color = getTeamColor(shift);

    return (
        <div
            onClick={() => onOpen?.(shift)}
            style={{
                background: color.bg,
                border: `1px solid ${color.soft}`,
                borderRadius: 12,
                padding: 12,
                cursor: 'pointer',
            }}
        >
            {/* Fila principal: icono + tipo + horario + badge */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: shift.nombreFuncionario || shift.nombrePuesto ? 8 : 0 }}>
                <SGTIcon
                    name={shift.tipo === 'dia' ? 'sun' : 'moon'}
                    size={15}
                    color={color.ink}
                />
                <span style={{ fontSize: 13.5, fontWeight: 800, color: color.ink, flex: 1 }}>
                    {shift.nombreTipo || (shift.tipo === 'dia' ? 'Turno día' : 'Turno noche')}
                    {shift.inicio && shift.fin ? ` · ${shift.inicio}–${shift.fin}` : ''}
                </span>
                {shift.miTurno && <SGTBadge tone="primary" size="xs">Tu turno</SGTBadge>}
                {shift.turnoLibre && <SGTBadge tone="accent" size="xs">Cupo libre</SGTBadge>}
            </div>

            {/* Fila secundaria: puesto + funcionario (jefatura ve quién está asignado) */}
            {(shift.nombrePuesto || (esJefatura && shift.nombreFuncionario)) && (
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    background: 'rgba(255,255,255,0.72)',
                    padding: '6px 10px',
                    borderRadius: 8,
                }}>
                    {shift.nombrePuesto && (
                        <span style={{ fontSize: 11.5, fontWeight: 700, color: color.ink, flex: 1 }}>
                            {shift.nombrePuesto}
                        </span>
                    )}
                    {esJefatura && shift.nombreFuncionario && (
                        <span style={{ fontSize: 11.5, fontWeight: shift.miTurno ? 800 : 600, color: PA.ink }}>
                            {shift.nombreFuncionario}
                            {shift.miTurno ? ' (tú)' : ''}
                        </span>
                    )}
                    <SGTIcon name="chevron-right" size={13} color={PA.ink3} />
                </div>
            )}
        </div>
    );
};

// ---------------------------------------------------------------------------
// LEGENDDOT — item de leyenda
// ---------------------------------------------------------------------------

const LegendDot = ({ color, label }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        <div style={{ width: 8, height: 8, borderRadius: 99, background: color }} />
        <span style={{ fontSize: 10.5, fontWeight: 700, color: SGT_DATA.PALETTE.ink2 }}>{label}</span>
    </div>
);

export default CalendarView;
