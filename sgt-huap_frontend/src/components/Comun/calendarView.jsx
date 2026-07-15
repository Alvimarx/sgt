import React, { useEffect, useMemo, useRef, useState } from 'react';
import { SGT_DATA } from '../Admin2/data';
import { SGTIcon, Sheet } from '../Style/UIPrimitives';
import { useAuth } from '../../context/AuthContext';
import { getTurnosCalendario } from '../../services/turnosService';
import ShiftDetail, { getTeamColor, formatShiftLabel } from '../Comun/ShiftDetail';
import AsignarTurnoLibreSheet from './AsignarTurnoLibreSheet';
import { exportarTurnosCsv } from '../../services/exportacionService';

// ---------------------------------------------------------------------------
// CONSTANTES Y HELPERS DE PRESENTACIÓN
// ---------------------------------------------------------------------------

const MONTH_NAMES = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];
const DAY_LABELS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

const firstDayOfMonth = (year, month) => {
    const d = new Date(year, month - 1, 1).getDay();
    return d === 0 ? 6 : d - 1;
};
const daysInMonth = (year, month) => new Date(year, month, 0).getDate();
const todayKey = () => new Date().toISOString().slice(0, 10);
const dateKey = (year, month, day) =>
    `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

const buildInitials = (nombre = '') =>
    String(nombre || '?').split(/\s+/).filter(Boolean).slice(0, 2)
        .map((p) => p[0]?.toUpperCase() || '').join('') || '?';

// ---------------------------------------------------------------------------
// LÓGICA DE AGRUPACIÓN
// ---------------------------------------------------------------------------

const getShiftName = (shift) =>
    shift?.nombreTipoTurno || shift?.nombreTipo || shift?.nombre ||
    (shift?.tipo === 'noche' ? 'Turno noche' : 'Turno día');

const buildDayGroups = (shifts = []) => {
    const map = new Map();
    shifts.forEach((shift) => {
        // Usar idRotativa como key para consistencia de color con AgendaView
        const key =
            shift.teamKey ||
            `${shift.idRotativa ?? shift.idTipoTurno ?? getShiftName(shift)}-${shift.inicio ?? ''}-${shift.fin ?? ''}`;

        if (!map.has(key)) map.set(key, { key, sample: shift, turnos: [] });
        map.get(key).turnos.push(shift);
    });

    return Array.from(map.values()).map((group) => {
        const sample = group.sample;
        const total = group.turnos.length;
        const asignados = group.turnos.filter(t => t.idFuncionario != null && !t.turnoLibre).length;
        const vacantes = Math.max(total - asignados, 0);
        return {
            key: group.key, sample,
            turnos: group.turnos,
            nombre: getShiftName(sample),
            tipo: sample.tipo,
            inicio: sample.inicio,
            fin: sample.fin,
            total, asignados, vacantes,
            completo: total > 0 && vacantes === 0,
            hasMy: group.turnos.some(t => t.miTurno),
        };
    });
};

const getCoverageStats = (shifts = []) => {
    const groups = buildDayGroups(shifts);
    const total = groups.reduce((a, g) => a + g.total, 0);
    const asignados = groups.reduce((a, g) => a + g.asignados, 0);
    const vacantes = groups.reduce((a, g) => a + g.vacantes, 0);
    return {
        groups, total, asignados, vacantes,
        cobertura: total > 0 ? Math.round((asignados / total) * 100) : 0,
        hasTurns: total > 0,
        hasMy: shifts.some(s => s.miTurno),
    };
};

// ---------------------------------------------------------------------------
// CALENDARVIEW — componente principal
// ---------------------------------------------------------------------------

const CalendarView = ({ 
    onBack, 
    onOpenBitacora, 
    onOpenSolicitudes,
    modoAsignacionAdmin = false,
}) => {
    const { user } = useAuth();
    const PA = SGT_DATA.PALETTE;

    // Validación defensiva del id — Number(undefined) = NaN (OWASP A03)
    const myUserId = (() => {
        const raw = Number(user?.id ?? user?.userId);
        return !Number.isNaN(raw) && raw > 0 ? raw : null;
    })();

    const rol = String(user?.rol || user?.role || '').toUpperCase();

    const rolSistema = String(
        user?.rolSistema ||
        user?.roleSistema ||
        user?.rol_sistema ||
        ''
    ).toUpperCase();

    const esAdmin =
        rolSistema === 'ADMIN' ||
        rolSistema === 'ADMINISTRADOR' ||
        rol === 'ADMIN' ||
        rol === 'ADMINISTRADOR';

    const esJefatura =
        rol === 'JEFATURA' ||
        rolSistema === 'JEFATURA';

    const esSubrogante =
        rol === 'SUBROGANTE' ||
        rolSistema === 'SUBROGANTE';

    const puedeEditarAsignacionTurnos =
        esAdmin ||
        esJefatura ||
        esSubrogante;

    const servicioIdActivo = user?.servicioId || localStorage.getItem('servicioId');

    const puedeExportarServicioCompleto = puedeEditarAsignacionTurnos;

    const canManageTurnAssignments = Boolean(
        modoAsignacionAdmin ||
        puedeEditarAsignacionTurnos
    );

    const now = new Date();
    const [viewYear, setViewYear] = useState(now.getFullYear());
    const [viewMonth, setViewMonth] = useState(now.getMonth() + 1);

    const [shiftsByDay, setShiftsByDay] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedDay, setSelectedDay] = useState(null);
    const [detailShift, setDetailShift] = useState(null);
    const [assignmentShift, setAssignmentShift] = useState(null);
    const [refreshTick, setRefreshTick] = useState(0);

    const [exportSheetOpen, setExportSheetOpen] = useState(false);
    const [exportMonthValue, setExportMonthValue] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
    const [exportScope, setExportScope] = useState('mios');
    const [exporting, setExporting] = useState(false);
    const [exportError, setExportError] = useState('');

    const [exchangeSelection, setExchangeSelection] = useState({ ownTurn: null, targetTurn: null, targetFuncionario: null });
    const [selectionToast, setSelectionToast] = useState(null);
    const toastTimerRef = useRef(null);

    const showSelectionToast = (message) => {
        setSelectionToast(message);
        if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
        toastTimerRef.current = setTimeout(() => setSelectionToast(null), 2500);
    };

    useEffect(() => () => { if (toastTimerRef.current) clearTimeout(toastTimerRef.current); }, []);

    // Carga al cambiar mes
    useEffect(() => {
        let mounted = true;
        setLoading(true);
        setError('');
        setSelectedDay(null);

        getTurnosCalendario({
            servicioId: servicioIdActivo,
            funcionarioId: myUserId,
            year: viewYear,
            month: viewMonth,
            esJefatura: true, // Siempre traemos todos para mostrar cobertura; el filtrado es en componente
        }).then((result) => {
            if (!mounted) return;
            if (result.success) {
                setShiftsByDay(result.data.shiftsByDay || {});
            } else {
                // No exponemos error técnico del backend (OWASP A09)
                setError('No se pudieron cargar los turnos del mes. Intenta de nuevo.');
                setShiftsByDay({});
            }
            setLoading(false);
        });

        return () => { mounted = false; };
    }, [viewYear, viewMonth, myUserId, servicioIdActivo, refreshTick]);

    const handleSelectTargetFuncionario = (sourceShift, targetShift) => {
        const isSelf = Boolean(targetShift?.miTurno);
        if (!isSelf) {
            const targetDate = targetShift?.fecha || sourceShift?.fecha;
            const targetTipo = targetShift?.tipo || sourceShift?.tipo;
            const turnosDelDia = shiftsByDay[targetDate] || [];
            if (turnosDelDia.some((t) => t.miTurno && t.tipo === targetTipo)) {
                showSelectionToast('Ya tienes un turno asignado en ese horario.');
                return;
            }
        }
        const targetFuncionario = {
            id: targetShift?.idFuncionario ?? targetShift?.raw?.idFuncionario ?? targetShift?.id ?? null,
            nombre: targetShift?.nombreFuncionario || targetShift?.raw?.nombreFuncionario || targetShift?.nombre || 'Funcionario',
        };
        setExchangeSelection((prev) => ({
            ...prev,
            ownTurn: isSelf ? (targetShift || sourceShift) : prev.ownTurn,
            targetTurn: isSelf ? prev.targetTurn : targetShift,
            targetFuncionario: isSelf ? prev.targetFuncionario : targetFuncionario,
        }));
        showSelectionToast(
            isSelf ? `Turno propio: ${formatShiftLabel(targetShift || sourceShift)}` : `Receptor: ${targetFuncionario.nombre}`
        );
    };

    const handleOpenExchangeRequest = (currentShift) => {
        const ownTurn = currentShift?.miTurno ? currentShift : exchangeSelection.ownTurn;
        const targetTurn = currentShift?.miTurno ? exchangeSelection.targetTurn : currentShift;
        const targetFuncionario = exchangeSelection.targetFuncionario;

        if (currentShift?.miTurno || exchangeSelection.ownTurn) {
            const preset = {
                tipoSolicitudId: 4,
                idTurnoPropio: (ownTurn && ownTurn.id) || currentShift?.id,
                turnoPropioLabel: formatShiftLabel(ownTurn || currentShift),
            };
            if (targetTurn && targetFuncionario) {
                preset.idTurnoDeseado = targetTurn.id;
                preset.idTurno = targetTurn.id;
                preset.turnoDeseadoLabel = formatShiftLabel(targetTurn);
                preset.idReceptor = targetFuncionario.id;
                preset.receptorLabel = targetFuncionario.nombre;
            }
            onOpenSolicitudes?.(preset);
            return;
        }
        if (!targetTurn || !targetFuncionario) {
            showSelectionToast(!targetFuncionario ? 'Selecciona el funcionario primero' : 'Selecciona el turno objetivo');
            return;
        }
        onOpenSolicitudes?.({
            tipoSolicitudId: 4,
            idTurnoDeseado: targetTurn.id, idTurno: targetTurn.id,
            turnoDeseadoLabel: formatShiftLabel(targetTurn),
            idReceptor: targetFuncionario.id, receptorLabel: targetFuncionario.nombre,
            ...(ownTurn ? { idTurnoPropio: ownTurn.id, turnoPropioLabel: formatShiftLabel(ownTurn) } : {}),
        });
    };

    const openAssignShift = (shift) => {
        if (!canManageTurnAssignments || !shift) return;
        setAssignmentShift(shift);
    };

    const cells = useMemo(() => {
        const leading = firstDayOfMonth(viewYear, viewMonth);
        const days = daysInMonth(viewYear, viewMonth);
        const arr = Array(leading).fill(null);
        for (let d = 1; d <= days; d++) arr.push(d);
        while (arr.length % 7 !== 0) arr.push(null);
        return arr;
    }, [viewYear, viewMonth]);

    const handleExportCsv = async () => {
        setExportError('');
        if (!servicioIdActivo) { setExportError('No hay servicio seleccionado.'); return; }
        if (!exportMonthValue) { setExportError('Selecciona un mes.'); return; }
        const [anioStr, mesStr] = exportMonthValue.split('-');
        const anio = Number(anioStr);
        const mes = Number(mesStr);
        if (!Number.isFinite(anio) || !Number.isFinite(mes)) { setExportError('Mes inválido.'); return; }
        const exportarSoloMios = !puedeExportarServicioCompleto || exportScope === 'mios';
        setExporting(true);
        const result = await exportarTurnosCsv({
            anio, mes, idServicio: servicioIdActivo,
            idFuncionario: exportarSoloMios ? myUserId : null,
        });
        setExporting(false);
        if (!result.success) {
            // No exponemos el error técnico (OWASP A09)
            setExportError('No se pudo exportar. Intenta de nuevo.');
            return;
        }
        setExportSheetOpen(false);
    };

    const today = todayKey();
    const goToPrevMonth = () => { if (viewMonth === 1) { setViewYear(y => y - 1); setViewMonth(12); } else setViewMonth(m => m - 1); };
    const goToNextMonth = () => { if (viewMonth === 12) { setViewYear(y => y + 1); setViewMonth(1); } else setViewMonth(m => m + 1); };

    const selectedKey = selectedDay ? dateKey(viewYear, viewMonth, selectedDay) : null;
    const selectedShifts = selectedKey ? (shiftsByDay[selectedKey] || []) : [];
    const selectedStats = useMemo(() => getCoverageStats(selectedShifts), [selectedShifts]);
    const sheetTitle = selectedDay
        ? `${DAY_LABELS[(new Date(viewYear, viewMonth - 1, selectedDay).getDay() + 6) % 7]} ${selectedDay} ${MONTH_NAMES[viewMonth - 1].slice(0, 3)}`
        : '';

    // ---------------------------------------------------------------------------
    // RENDER
    // ---------------------------------------------------------------------------
    return (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: PA.surface2, overflow: 'hidden' }}>

            {/* Header */}
            <div style={{ padding: '14px 16px', background: '#fff', borderBottom: `1px solid ${PA.line2}`, display: 'flex', alignItems: 'center', gap: 8 }}>
                <button onClick={onBack} aria-label="Volver" style={{ background: 'transparent', border: 'none', padding: 6, cursor: 'pointer', display: 'flex', borderRadius: 8 }}>
                    <SGTIcon name="chevron-left" size={22} color={PA.ink} />
                </button>
                <button onClick={goToPrevMonth} aria-label="Mes anterior" style={{ background: 'transparent', border: 'none', padding: 6, cursor: 'pointer', display: 'flex', borderRadius: 8 }}>
                    <SGTIcon name="chevron-left" size={17} color={PA.ink2} />
                </button>
                <div style={{ flex: 1, textAlign: 'center', fontSize: 16, fontWeight: 900, color: PA.ink }}>
                    {modoAsignacionAdmin ? 'Asignación de turnos · ' : ''}{MONTH_NAMES[viewMonth - 1]} {viewYear}
                </div>
                <button onClick={goToNextMonth} aria-label="Mes siguiente" style={{ background: 'transparent', border: 'none', padding: 6, cursor: 'pointer', display: 'flex', borderRadius: 8 }}>
                    <SGTIcon name="chevron-right" size={17} color={PA.ink2} />
                </button>
            </div>

            <div style={{ flex: 1, overflow: 'auto' }}>

                {/* Error — lenguaje humano (Nielsen #9, OWASP A09) */}
                {error && !loading && (
                    <div role="alert" style={{ margin: '10px 14px 0', padding: '10px 12px', borderRadius: 12, background: '#FFF4F5', color: '#8C3F44', border: '1px solid #F3D2D5', fontSize: 12.5, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <SGTIcon name="exclamation-circle" size={15} color="#8C3F44" />
                        {error}
                    </div>
                )}

                {/* Grilla del calendario */}
                <div style={{ padding: '14px 12px 0' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: 8 }}>
                        {DAY_LABELS.map((l, i) => (
                            <div key={l} style={{ textAlign: 'center', fontSize: 11, fontWeight: 800, color: i >= 5 ? PA.ink3 : PA.ink2 }}>
                                {l}
                            </div>
                        ))}
                    </div>

                    {loading ? (
                        <div style={{ padding: '40px 0', textAlign: 'center', color: PA.ink3, fontSize: 13, fontWeight: 600 }}>
                            <div style={{ fontSize: 20, marginBottom: 8 }}>📅</div>
                            Cargando…
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px 2px' }}>
                            {cells.map((day, idx) => {
                                if (!day) return <div key={`e-${idx}`} />;
                                const key = dateKey(viewYear, viewMonth, day);
                                const shifts = shiftsByDay[key] || [];
                                const miShift = shifts.find(s => s.miTurno);
                                const hasLibre = shifts.some(s => s.turnoLibre || !s.idFuncionario);
                                const hasAjeno = shifts.some(s => !s.turnoLibre && s.idFuncionario && !s.miTurno);
                                const isToday = key === today;
                                const isSel = selectedDay === day;
                                const isWknd = idx % 7 >= 5;
                                const tappable = shifts.length > 0;

                                return (
                                    <button
                                        key={idx}
                                        type="button"
                                        aria-label={`${day} de ${MONTH_NAMES[viewMonth - 1]}${miShift ? ', tienes turno' : ''}${hasLibre ? ', cupo libre' : ''}`}
                                        aria-pressed={isSel}
                                        onClick={() => tappable && setSelectedDay(isSel ? null : day)}
                                        style={{
                                            all: 'unset',
                                            textAlign: 'center', padding: '6px 2px', borderRadius: 10,
                                            cursor: tappable ? 'pointer' : 'default',
                                            background: isToday ? PA.primary : isSel ? PA.primarySoft : 'transparent',
                                            transition: 'background 0.15s',
                                            display: 'block',
                                        }}
                                    >
                                        <div style={{
                                            fontSize: 14, lineHeight: 1,
                                            fontWeight: isToday || isSel ? 900 : 500,
                                            color: isToday ? '#fff' : isSel ? PA.primary : isWknd ? PA.ink3 : PA.ink,
                                            marginBottom: 4,
                                        }}>
                                            {day}
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'center', gap: 2, minHeight: 6 }}>
                                            {miShift && <Dot color={isToday ? 'rgba(255,255,255,0.9)' : PA.primary} />}
                                            {hasLibre && <Dot color={isToday ? 'rgba(255,255,255,0.65)' : PA.accent} />}
                                            {hasAjeno && <Dot color={isToday ? 'rgba(255,255,255,0.5)' : 'rgba(240,178,43,0.9)'} />}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Leyenda */}
                <div style={{ display: 'flex', gap: 14, padding: '12px 16px 8px', borderTop: `1px solid ${PA.line2}`, marginTop: 12, flexWrap: 'wrap' }}>
                    <LegendDot color={PA.primary} label="Mi turno" />
                    <LegendDot color={PA.accent} label="Cupo libre" />
                    <LegendDot color="rgba(240,178,43,0.9)" label="Turno del servicio" />
                </div>

                {/* Botón de exportación */}
                <div style={{ padding: '4px 14px 12px' }}>
                    <button
                        type="button"
                        onClick={() => { setExportMonthValue(`${viewYear}-${String(viewMonth).padStart(2, '0')}`); setExportScope('mios'); setExportError(''); setExportSheetOpen(true); }}
                        style={{ width: '100%', border: `1px solid ${PA.line2}`, background: '#fff', color: PA.ink, borderRadius: 12, padding: '10px 14px', fontSize: 13, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                    >
                        <SGTIcon name="download" size={15} color={PA.ink} />
                        Exportar turnos CSV
                    </button>
                </div>

                {!selectedDay && !loading && (
                    <div style={{ padding: '16px 24px 24px', textAlign: 'center' }}>
                        <span style={{ fontSize: 12, color: PA.ink3, fontWeight: 600 }}>
                            Toca un día con punto para ver sus turnos
                        </span>
                    </div>
                )}
            </div>

            {/* Sheet del día seleccionado */}
            <Sheet open={!!selectedDay} onClose={() => setSelectedDay(null)} title={sheetTitle} maxHeight="72%">
                <div style={{ padding: '4px 16px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {selectedShifts.length === 0 ? (
                        <p style={{ fontSize: 13, color: PA.ink3, fontWeight: 600, textAlign: 'center', padding: '20px 0' }}>
                            Sin turnos para mostrar.
                        </p>
                    ) : (
                        <DayDetailOverview
                            stats={selectedStats}
                            onOpen={(shift) => setDetailShift(shift)}
                        />
                    )}
                </div>
            </Sheet>

            {/* Sheet de detalle de turno */}
            <Sheet open={!!detailShift} onClose={() => setDetailShift(null)} title="Detalle del turno" maxHeight="88%">
                {detailShift && (
                    <ShiftDetail
                        shift={detailShift}
                        exchangeSelection={exchangeSelection}
                        currentUserId={myUserId}
                        onSelectTargetFuncionario={handleSelectTargetFuncionario}
                        canManageTurnAssignment={canManageTurnAssignments}
                        canAssignFreeTurn={canManageTurnAssignments}
                        onAction={(actionId, shift) => {
                            if (actionId === 'historial') {
                                onOpenBitacora?.();
                                return;
                            }

                            if (actionId === 'editar-asignacion-turno' || actionId === 'asignar-turno-libre') {
                                openAssignShift(shift);
                                return;
                            }

                            if (!onOpenSolicitudes) return;

                            if (actionId === 'cambio') {
                                handleOpenExchangeRequest(shift);
                            }

                            if (actionId === 'solicitar-turno') {
                                onOpenSolicitudes?.({
                                    tipoSolicitudId: 3,
                                    idTurno: shift.id,
                                    turnoLabel: formatShiftLabel(shift),
                                });
                            }
                        }}
                    />
                )}
            </Sheet>

            <AsignarTurnoLibreSheet
                open={!!assignmentShift}
                shift={assignmentShift}
                servicioId={servicioIdActivo}
                adminUserId={myUserId}
                onClose={() => setAssignmentShift(null)}
                onAssigned={() => {
                    setAssignmentShift(null);
                    setDetailShift(null);
                    setSelectedDay(null);
                    setRefreshTick((v) => v + 1);
                }}
            />

            {/* Toast — fixed para funcionar dentro de cualquier contenedor */}
            {selectionToast && (
                <div style={{ position: 'fixed', left: 14, right: 14, bottom: 82, zIndex: 200, display: 'flex', justifyContent: 'center', pointerEvents: 'none' }}>
                    <div style={{ background: 'rgba(23,65,108,0.96)', color: '#fff', borderRadius: 999, padding: '10px 16px', fontSize: 12.5, fontWeight: 700, boxShadow: '0 10px 24px rgba(15,23,42,0.2)', maxWidth: 340, textAlign: 'center' }}>
                        {selectionToast}
                    </div>
                </div>
            )}

            {/* Sheet de exportación CSV */}
            <Sheet open={exportSheetOpen} onClose={() => !exporting && setExportSheetOpen(false)} title="Exportar turnos CSV" maxHeight="60%">
                <div style={{ padding: '8px 16px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div>
                        <label style={{ display: 'block', fontSize: 12, fontWeight: 800, color: PA.ink2, marginBottom: 8 }}>
                            Mes a exportar
                        </label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <button type="button" aria-label="Mes anterior" onClick={() => { const [y, m] = exportMonthValue.split('-').map(Number); const nm = m - 1 < 1 ? 12 : m - 1; const ny = m - 1 < 1 ? y - 1 : y; setExportMonthValue(`${ny}-${String(nm).padStart(2,'0')}`); }} disabled={exporting} style={{ width: 36, height: 36, border: `1px solid ${PA.line2}`, background: '#fff', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: exporting ? 0.5 : 1, cursor: exporting ? 'not-allowed' : 'pointer' }}>
                                <SGTIcon name="chevron-left" size={16} color={PA.ink} />
                            </button>
                            <div style={{ flex: 1, border: `1px solid ${PA.line2}`, borderRadius: 12, padding: '10px 12px', textAlign: 'center', fontSize: 14, fontWeight: 700, color: PA.ink, background: '#fff' }}>
                                {MONTH_NAMES[Number(exportMonthValue.split('-')[1]) - 1]} {exportMonthValue.split('-')[0]}
                            </div>
                            <button type="button" aria-label="Mes siguiente" onClick={() => { const [y, m] = exportMonthValue.split('-').map(Number); const nm = m + 1 > 12 ? 1 : m + 1; const ny = m + 1 > 12 ? y + 1 : y; setExportMonthValue(`${ny}-${String(nm).padStart(2,'0')}`); }} disabled={exporting} style={{ width: 36, height: 36, border: `1px solid ${PA.line2}`, background: '#fff', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: exporting ? 0.5 : 1, cursor: exporting ? 'not-allowed' : 'pointer' }}>
                                <SGTIcon name="chevron-right" size={16} color={PA.ink} />
                            </button>
                        </div>
                    </div>

                    {puedeExportarServicioCompleto && (
                        <div>
                            <div style={{ fontSize: 12, fontWeight: 800, color: PA.ink2, marginBottom: 8 }}>¿Qué exportar?</div>
                            {[{ val: 'mios', label: 'Solo mis turnos' }, { val: 'servicio', label: 'Todo el servicio' }].map(({ val, label }) => (
                                <label key={val} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', fontSize: 13, fontWeight: 700, color: PA.ink, cursor: 'pointer' }}>
                                    <input type="radio" name="exportScope" value={val} checked={exportScope === val} onChange={() => setExportScope(val)} disabled={exporting} />
                                    {label}
                                </label>
                            ))}
                        </div>
                    )}

                    {!puedeExportarServicioCompleto && (
                        <div style={{ fontSize: 12.5, fontWeight: 600, color: PA.ink2, background: PA.surface2, border: `1px solid ${PA.line2}`, borderRadius: 12, padding: '10px 12px' }}>
                            Se exportarán solo tus turnos del servicio actual.
                        </div>
                    )}

                    {exportError && (
                        <div role="alert" style={{ padding: '10px 12px', borderRadius: 12, background: '#FFF4F5', color: '#8C3F44', border: '1px solid #F3D2D5', fontSize: 12.5, fontWeight: 700 }}>
                            {exportError}
                        </div>
                    )}

                    <button type="button" onClick={handleExportCsv} disabled={exporting} style={{ width: '100%', border: 'none', background: exporting ? PA.ink3 : PA.primary, color: '#fff', borderRadius: 14, padding: '13px 14px', fontSize: 13.5, fontWeight: 900, cursor: exporting ? 'not-allowed' : 'pointer' }}>
                        {exporting ? 'Exportando…' : 'Descargar CSV'}
                    </button>
                </div>
            </Sheet>
        </div>
    );
};

// ---------------------------------------------------------------------------
// DAY DETAIL OVERVIEW — resumen del día seleccionado
// ---------------------------------------------------------------------------

const DayDetailOverview = ({ stats, onOpen }) => {
    const PA = SGT_DATA.PALETTE;
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Mini resumen de cobertura */}
            <div style={{ background: '#fff', border: `1px solid ${PA.line2}`, borderRadius: 14, padding: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: PA.ink3, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 8 }}>
                    Cobertura del día
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                    <MiniStat label="Asignados" value={stats.asignados} />
                    <MiniStat label="Total" value={stats.total} />
                    <MiniStat label="Vacantes" value={stats.vacantes} danger={stats.vacantes > 0} />
                </div>
            </div>

            {/* Grupos de turno */}
            {stats.groups.map(group => {
                const color = getTeamColor(group.sample);
                const asignados = group.turnos.filter(t => t.idFuncionario != null && !t.turnoLibre);
                const vacantes = group.turnos.filter(t => t.idFuncionario == null || t.turnoLibre);

                return (
                    <div key={group.key} style={{ background: color.bg, border: `1.5px solid ${color.soft}`, borderRadius: 14, padding: 12 }}>
                        {/* Header del grupo */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                            <SGTIcon name={group.tipo === 'noche' ? 'moon' : 'sun'} size={15} color={color.ink} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 13, fontWeight: 900, color: color.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {group.nombre}
                                </div>
                                <div style={{ fontSize: 11, fontWeight: 700, color: color.ink, opacity: 0.8 }}>
                                    {group.inicio && group.fin ? `${group.inicio}–${group.fin}` : 'Horario no definido'}
                                </div>
                            </div>
                            <span style={{ background: 'rgba(255,255,255,0.78)', borderRadius: 999, padding: '4px 8px', fontSize: 11, fontWeight: 900, color: group.vacantes > 0 ? '#9A3412' : '#166534', flexShrink: 0 }}>
                                {group.asignados}/{group.total}
                            </span>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {/* Asignados */}
                            {asignados.length > 0 && (
                                <div style={{ background: 'rgba(255,255,255,0.72)', borderRadius: 10, padding: '8px 10px' }}>
                                    <div style={{ fontSize: 10.5, fontWeight: 800, color: PA.ink3, textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 6 }}>
                                        Asignados
                                    </div>
                                    {asignados.map(turno => (
                                        <button
                                            key={turno.id}
                                            type="button"
                                            onClick={() => onOpen?.(turno)}
                                            aria-label={`Ver detalle de ${turno.nombreFuncionario || 'funcionario'}`}
                                            style={{ width: '100%', border: 'none', background: 'transparent', padding: '6px 0', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', textAlign: 'left' }}
                                        >
                                            <div style={{ width: 28, height: 28, borderRadius: 99, background: PA.surface2, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10.5, fontWeight: 900, color: PA.ink, flexShrink: 0 }}>
                                                {buildInitials(turno.nombreFuncionario)}
                                            </div>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ fontSize: 12.5, fontWeight: turno.miTurno ? 900 : 700, color: PA.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                    {turno.nombreFuncionario || 'Sin nombre'}
                                                    {turno.miTurno && <span style={{ marginLeft: 5, fontSize: 11, color: PA.primary, fontWeight: 800 }}>(tú)</span>}
                                                </div>
                                                {turno.nombrePuesto && (
                                                    <div style={{ fontSize: 10.5, fontWeight: 600, color: PA.ink3 }}>
                                                        {turno.nombrePuesto}
                                                    </div>
                                                )}
                                            </div>
                                            <SGTIcon name="chevron-right" size={13} color={PA.ink3} />
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* Vacantes */}
                            {vacantes.length > 0 && (
                                <div style={{ background: '#FFF7ED', border: '1px solid #FDBA74', borderRadius: 10, padding: '8px 10px' }}>
                                    <div style={{ fontSize: 10.5, fontWeight: 800, color: '#9A3412', textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 6 }}>
                                        {vacantes.length} vacante{vacantes.length > 1 ? 's' : ''} por cubrir
                                    </div>
                                    {vacantes.map(turno => (
                                        <button
                                            key={turno.id}
                                            type="button"
                                            onClick={() => onOpen?.(turno)}
                                            aria-label={`Cupo libre: ${turno.nombrePuesto || 'Sin posición'}`}
                                            style={{ width: '100%', border: 'none', background: 'transparent', padding: '6px 0', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', textAlign: 'left' }}
                                        >
                                            <div style={{ width: 28, height: 28, borderRadius: 99, border: '1.5px dashed #FDBA74', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                <SGTIcon name="plus" size={13} color="#9A3412" />
                                            </div>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ fontSize: 12.5, fontWeight: 800, color: '#9A3412' }}>
                                                    {turno.nombrePuesto || 'Posición sin asignar'}
                                                </div>
                                                <div style={{ fontSize: 10.5, fontWeight: 600, color: '#C2460A' }}>
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

// ---------------------------------------------------------------------------
// SUB-COMPONENTES ATÓMICOS
// ---------------------------------------------------------------------------

const MiniStat = ({ label, value, danger = false }) => {
    const PA = SGT_DATA.PALETTE;
    return (
        <div style={{ background: danger ? '#FFF7ED' : PA.surface2, border: `1px solid ${danger ? '#FDBA74' : PA.line2}`, borderRadius: 10, padding: '8px 6px', textAlign: 'center' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: PA.ink3, marginBottom: 3, textTransform: 'uppercase' }}>{label}</div>
            <div style={{ fontSize: 18, fontWeight: 900, color: danger ? '#9A3412' : PA.ink }}>{value}</div>
        </div>
    );
};

const Dot = ({ color }) => (
    <div style={{ width: 5, height: 5, borderRadius: 99, background: color, flexShrink: 0 }} />
);

const LegendDot = ({ color, label }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        <div style={{ width: 8, height: 8, borderRadius: 99, background: color }} />
        <span style={{ fontSize: 10.5, fontWeight: 700, color: SGT_DATA.PALETTE.ink2 }}>{label}</span>
    </div>
);

export default CalendarView;