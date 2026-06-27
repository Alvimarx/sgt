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
// LOGICA DE AGRUPACIÓN
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

// ---------------------------------------------------------------------------
// COMPONENTE PRINCIPAL: CALENDARVIEW
// ---------------------------------------------------------------------------

const CalendarView = ({ onBack, onOpenBitacora, onOpenSolicitudes }) => {
    const { user } = useAuth();
    const PA = SGT_DATA.PALETTE;

    // Control de permisos de exportación
    const esJefatura = user?.rol === 'JEFATURA' || user?.rol === 'SUBROGANTE';
    const rolSistema = String(user?.rolSistema || '').toUpperCase();
    const esAdmin = rolSistema === 'ADMIN' || rolSistema === 'ADMINISTRADOR';
    const puedeExportarServicioCompleto = esJefatura || esAdmin;

    // Mes visible — arranca en el mes actual
    const now = new Date();
    const [viewYear, setViewYear] = useState(now.getFullYear());
    const [viewMonth, setViewMonth] = useState(now.getMonth() + 1);

    const [shiftsByDay, setShiftsByDay] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedDay, setSelectedDay] = useState(null);
    const [detailShift, setDetailShift] = useState(null);
    
    // Exportación
    const [exportSheetOpen, setExportSheetOpen] = useState(false);
    const [exportMonthValue, setExportMonthValue] = useState(`${viewYear}-${String(viewMonth).padStart(2, '0')}`);
    const [exportScope, setExportScope] = useState('mios');
    const [exporting, setExporting] = useState(false);
    const [exportError, setExportError] = useState('');

    const [exchangeSelection, setExchangeSelection] = useState({
        ownTurn: null,
        targetTurn: null,
        targetFuncionario: null,
    });

    
    const [selectionToast, setSelectionToast] = useState(null);
    
    const showSelectionToast = (message) => {
    setSelectionToast(message);
        if (showSelectionToast.timer) clearTimeout(showSelectionToast.timer);
        showSelectionToast.timer = setTimeout(() => setSelectionToast(null), 2500);
    };

    /**
     * Maneja la seleccion de un funcionario para distintos flujos de solicitud
     * 
     * @param {object} sourceShift 
     * @param {object} targetShift 
     * @returns 
     */
    const handleSelectTargetFuncionario = (sourceShift, targetShift) => {
        const isSelf = targetShift?.miTurno;

        
        if (!isSelf) {
            
            const targetDate = targetShift?.fecha || sourceShift?.fecha;
            const targetTipo = targetShift?.tipo || sourceShift?.tipo;
            
            
            const turnosDelDia = shiftsByDay[targetDate] || [];

            
            const yaTieneTurnoEseDia = turnosDelDia.some(
                (t) => t.miTurno && t.tipo === targetTipo
            );

            
            if (yaTieneTurnoEseDia) {
                showSelectionToast("No puedes solicitar este turno porque ya tienes uno asignado este día.");
                return;
            }
        }
        // --------------------------------------------------------------
    
        const targetFuncionario = {
          id: targetShift?.idFuncionario ?? targetShift?.raw?.idFuncionario ?? targetShift?.id ?? null,
          nombre:
            targetShift?.nombreFuncionario ||
            targetShift?.raw?.nombreFuncionario ||
            targetShift?.nombre ||
            "Funcionario",
        };
    
        setExchangeSelection((prev) => ({
          ...prev,
          ownTurn: isSelf ? (targetShift || sourceShift) : prev.ownTurn,
          targetTurn: isSelf ? prev.targetTurn : targetShift,
          targetFuncionario: isSelf ? prev.targetFuncionario : targetFuncionario,
        }));
    
        showSelectionToast(
          isSelf
            ? `Seleccionaste tu turno: ${formatShiftLabel(targetShift || sourceShift)}`
            : `Seleccionaste ${formatShiftLabel(targetShift)} de ${targetFuncionario.nombre}`
        );
    };

    const handleOpenExchangeRequest = (currentShift) => {
        const ownTurn = currentShift?.miTurno ? currentShift : exchangeSelection.ownTurn;
        const targetTurn = currentShift?.miTurno ? exchangeSelection.targetTurn : currentShift;
        const targetFuncionario = exchangeSelection.targetFuncionario;
    
        // Caso A: el usuario tiene un turno propio seleccionado
        if (currentShift?.miTurno || exchangeSelection.ownTurn) {
          const preset = {
            tipoSolicitudId: 4,
            idTurnoPropio: (ownTurn && ownTurn.id) || currentShift?.id,
            turnoPropioLabel: formatShiftLabel(ownTurn || currentShift),
          };
    
          // Si además ya hay un receptor seleccionado, lo incluimos en el preset
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
    
        // Caso B: el usuario está viendo un turno ajeno pero no ha seleccionado receptor aún
        if (!targetTurn || !targetFuncionario) {
          showSelectionToast(
            !targetFuncionario
              ? "Selecciona el funcionario antes de continuar"
              : "Selecciona el turno objetivo para continuar"
          );
          return;
        }
    
        // Caso B completo: tenemos turno ajeno + receptor
        const preset = {
          tipoSolicitudId: 4,
          idTurnoDeseado: targetTurn.id,
          idTurno: targetTurn.id,
          turnoDeseadoLabel: formatShiftLabel(targetTurn),
          idReceptor: targetFuncionario.id,
          receptorLabel: targetFuncionario.nombre,
        };
    
        // Si el usuario también seleccionó su propio turno previamente, lo adjuntamos
        if (ownTurn) {
          preset.idTurnoPropio = ownTurn.id;
          preset.turnoPropioLabel = formatShiftLabel(ownTurn);
        }
    
        onOpenSolicitudes?.(preset);
    };

    // Carga al cambiar mes
    useEffect(() => {
        let mounted = true;
        setLoading(true);
        setError('');
        setSelectedDay(null);

        const servicioId = user?.servicioId || localStorage.getItem('servicioId');
        const myUserId = Number(user?.id ?? user?.userId);

        getTurnosCalendario({
            servicioId,
            funcionarioId: myUserId,
            year: viewYear,
            month: viewMonth,
            esJefatura: true, // Forzamos esto para que el backend traiga todos los turnos del servicio
        }).then((result) => {
            if (!mounted) return;
            if (result.success) {
                const rawShifts = result.data.shiftsByDay || {};
                
                // Mapeamos dinámicamente qué turnos son "míos" según el ID del usuario
                Object.keys(rawShifts).forEach(dateKey => {
                    rawShifts[dateKey] = rawShifts[dateKey].map(shift => ({
                        ...shift,
                        miTurno: Number(shift.idFuncionario) === myUserId || shift.miTurno
                    }));
                });

                setShiftsByDay(rawShifts);
            } else {
                setError(result.error);
                setShiftsByDay({});
            }
            setLoading(false);
        });

        return () => { mounted = false; };
    }, [viewYear, viewMonth, user?.id, user?.userId, user?.servicioId]);

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
        if (!user?.servicioId) return setExportError('No hay servicio seleccionado para exportar.');
        if (!exportMonthValue) return setExportError('Debes seleccionar un mes.');

        const [anioStr, mesStr] = exportMonthValue.split('-');
        const anio = Number(anioStr);
        const mes = Number(mesStr);
        const funcionarioId = Number(user?.id ?? user?.userId);
        const exportarSoloMisTurnos = !puedeExportarServicioCompleto || exportScope === 'mios';

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
    const goToPrevMonth = () => { if (viewMonth === 1) { setViewYear(y => y - 1); setViewMonth(12); } else setViewMonth(m => m - 1); };
    const goToNextMonth = () => { if (viewMonth === 12) { setViewYear(y => y + 1); setViewMonth(1); } else setViewMonth(m => m + 1); };

    const selectedKey = selectedDay ? dateKey(viewYear, viewMonth, selectedDay) : null;
    const selectedShifts = selectedKey ? (shiftsByDay[selectedKey] || []) : [];
    const selectedStats = useMemo(() => getCoverageStats(selectedShifts), [selectedShifts]);
    
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
                {error && !loading && (
                    <div style={{ margin: '10px 14px 0', padding: '10px 12px', borderRadius: 12, background: '#FFF4F5', color: '#8C3F44', border: '1px solid #F3D2D5', fontSize: 12.5, fontWeight: 700 }}>
                        {error}
                    </div>
                )}

                {/* Grilla del calendario */}
                <div style={{ padding: '14px 14px 0' }}>
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
                                const hasLibre = shifts.some(s => s.turnoLibre || !s.idFuncionario);
                                const hasAjeno = shifts.some(s => !s.turnoLibre && s.idFuncionario && !s.miTurno);
                                
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
                                            {hasAjeno && (
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

                {/* Leyenda unificada para todos */}
                <div style={{ display: 'flex', gap: 14, padding: '10px 18px', borderTop: `1px solid ${PA.line2}`, marginTop: 10, flexWrap: 'wrap' }}>
                    <LegendDot color={PA.primary} label="Mi turno" />
                    <LegendDot color={PA.accent} label="Cupo libre" />
                    <LegendDot color='rgba(240, 178, 43, 0.85)' label="Turno del servicio" />
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
                        <DayDetailOverview
                            PA={PA}
                            stats={selectedStats}
                            onOpen={(shift) => setDetailShift(shift)}
                        />
                    )}
                </div>
            </Sheet>

            {/* Sheet de detalle completo del turno */}
            <Sheet
                open={!!detailShift}
                onClose={() => setDetailShift(null)}
                title="Detalle del turno"
                maxHeight="88%"
            >
                {detailShift && (
                    <ShiftDetail
                        shift={detailShift}
                        exchangeSelection={exchangeSelection}
                        onSelectTargetFuncionario={handleSelectTargetFuncionario}
                        onAction={(actionId, shift) => {
                            if (actionId === "historial") {
                                onOpenBitacora?.();
                                return;
                            }
                            if (!onOpenSolicitudes) return;

                            // "cambio" inicia el flujo de solicitud de cambio de turno
                            if (actionId === "cambio") handleOpenExchangeRequest(shift);

                            if (actionId === "solicitar-turno") {
                                onOpenSolicitudes?.({ 
                                    tipoSolicitudId: 3, 
                                    idTurno: shift.id, 
                                    turnoLabel: formatShiftLabel(shift) });
                                return;
                            }
                        }}
                    />
                )}
            </Sheet>

            {/* Toast flotante de confirmación de selección en el flujo de cambio */}
            {selectionToast && (
                <div style={{ position: "absolute", left: 14, right: 14, bottom: 76, zIndex: 110, display: "flex", justifyContent: "center", pointerEvents: "none" }}>
                <div style={{ background: "rgba(23,65,108,0.96)", color: "#fff", borderRadius: 999, padding: "10px 14px", fontSize: 12.5, fontWeight: 700, boxShadow: "0 10px 24px rgba(15,23,42,0.18)", maxWidth: "100%", textAlign: "center" }}>
                    {selectionToast}
                </div>
                </div>
            )}

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
                                    let newMonth = month - 1; let newYear = year;
                                    if (newMonth < 1) { newMonth = 12; newYear -= 1; }
                                    setExportMonthValue(`${newYear}-${String(newMonth).padStart(2, '0')}`);
                                }}
                                disabled={exporting}
                                style={{ width: 36, height: 36, border: `1px solid ${PA.line2}`, background: '#fff', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: exporting ? 0.5 : 1 }}
                            >
                                <SGTIcon name="chevron-left" size={18} color={PA.ink} />
                            </button>

                            <div style={{ flex: 1, border: `1px solid ${PA.line2}`, borderRadius: 12, padding: '10px 12px', textAlign: 'center', fontSize: 14, fontWeight: 700, color: PA.ink, background: '#fff' }}>
                                {MONTH_NAMES[Number(exportMonthValue.split('-')[1]) - 1]} {exportMonthValue.split('-')[0]}
                            </div>

                            <button
                                onClick={() => {
                                    const [year, month] = exportMonthValue.split('-').map(Number);
                                    let newMonth = month + 1; let newYear = year;
                                    if (newMonth > 12) { newMonth = 1; newYear += 1; }
                                    setExportMonthValue(`${newYear}-${String(newMonth).padStart(2, '0')}`);
                                }}
                                disabled={exporting}
                                style={{ width: 36, height: 36, border: `1px solid ${PA.line2}`, background: '#fff', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: exporting ? 0.5 : 1 }}
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
                                <input type="radio" name="exportScope" value="mios" checked={exportScope === 'mios'} onChange={() => setExportScope('mios')} disabled={exporting} />
                                Solo mis turnos
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700, color: PA.ink }}>
                                <input type="radio" name="exportScope" value="servicio" checked={exportScope === 'servicio'} onChange={() => setExportScope('servicio')} disabled={exporting} />
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
                        style={{ width: '100%', border: 'none', background: exporting ? PA.ink3 : PA.primary, color: '#fff', borderRadius: 14, padding: '12px 14px', fontSize: 13.5, fontWeight: 900, cursor: exporting ? 'default' : 'pointer' }}
                    >
                        {exporting ? 'Exportando…' : 'Descargar CSV'}
                    </button>
                </div>
            </Sheet>
        </div>
    );
};


// ---------------------------------------------------------------------------
// DAY DETAIL OVERVIEW — Muestra el resumen de todos los turnos del día
// ---------------------------------------------------------------------------

const DayDetailOverview = ({ PA, stats, onOpen }) => {
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
                                                <div style={{ fontSize: 12.5, fontWeight: turno.miTurno ? 850 : 700, color: PA.ink }}>
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
// LEGENDDOT — item de leyenda
// ---------------------------------------------------------------------------

const LegendDot = ({ color, label }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        <div style={{ width: 8, height: 8, borderRadius: 99, background: color }} />
        <span style={{ fontSize: 10.5, fontWeight: 700, color: SGT_DATA.PALETTE.ink2 }}>{label}</span>
    </div>
);

export default CalendarView;