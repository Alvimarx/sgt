// calendarView.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { SGT_DATA } from '../Admin2/data';
import { SGTAvatar, SGTBadge, SGTIcon, Sheet } from '../Style/UIPrimitives';
import { useAuth } from '../../context/AuthContext';
import { getTurnosCalendario } from '../../services/turnosService';
import ShiftDetail, { getTeamColor, formatShiftLabel } from '../Comun/ShiftDetail';

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

const CalendarView = ({ onBack, onOpenBitacora, onOpenSolicitudes }) => {
    const { user } = useAuth();
    const PA = SGT_DATA.PALETTE;

    const esJefatura = user?.rol === 'JEFATURA' || user?.rol === 'SUBROGANTE';

    // Mes visible — arranca en el mes actual
    const now = new Date();
    const [viewYear, setViewYear] = useState(now.getFullYear());
    const [viewMonth, setViewMonth] = useState(now.getMonth() + 1); // 1-12

    const [shiftsByDay, setShiftsByDay] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedDay, setSelectedDay] = useState(null);
    const [detailShift, setDetailShift] = useState(null);

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
            esJefatura,
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
    }, [viewYear, viewMonth, user?.id, user?.servicioId]);

    // Grilla de celdas del mes
    const cells = useMemo(() => {
        const leading = firstDayOfMonth(viewYear, viewMonth);
        const days = daysInMonth(viewYear, viewMonth);
        const arr = Array(leading).fill(null);
        for (let d = 1; d <= days; d++) arr.push(d);
        while (arr.length % 7 !== 0) arr.push(null);
        return arr;
    }, [viewYear, viewMonth]);

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
                    ) : (
                        selectedShifts.map(s => (
                            <ShiftCard
                                key={s.id}
                                shift={s}
                                esJefatura={esJefatura}
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
        </div>
    );
};

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
