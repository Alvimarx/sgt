import React from "react";
import PropTypes from "prop-types";
import "../css/Calendario-Semanal.css";
import { getTextColor, lightenColor } from "../../../utils/pasilloColors";

export default function CalendarioSemanal({
    diasSemana = [],
    weekDays = [],
    pasillosSeleccionados = [],
    today,
    getTurnoData,
    handleDayClick,
    isMobile,
    pisoColorMap = {},
}) {
    // ✅ Verificaciones de seguridad
    if (!weekDays || weekDays.length === 0) {
        return <div>Cargando calendario semanal...</div>;
    }

    if (!diasSemana || diasSemana.length === 0) {
        return <div>Error: No se pudieron cargar los días de la semana</div>;
    }

    return (
        <div className="calendario-semana">
            <div className="semana-pasillos">
                <div className="pasillo-header-space" />
                {weekDays.map((day, idx) => {
                    const isToday =
                        today &&
                        day.getFullYear() === today.getFullYear() &&
                        day.getMonth() === today.getMonth() &&
                        day.getDate() === today.getDate();

                    // ✅ Verificación adicional para diasSemana[idx]
                    const label = diasSemana[idx]
                        ? (isMobile ? diasSemana[idx].substring(0, 1) : diasSemana[idx])
                        : `Día ${idx + 1}`;

                    return (
                        <div key={`semana-dia-header-${idx}`} className={`semana-dia-header ${isToday ? 'today' : ''}`}>
                            <span className="dia-nombre">{label} {day.getDate()}</span>
                        </div>
                    );
                })}
            </div>

            {pasillosSeleccionados.map((pasillo, pasilloIdx) => {
                // Get color from API data instead of hardcoded function
                const normalizedPasillo = pasillo.replace(/_/g, ' ').trim().toUpperCase();
                const pisoData = pisoColorMap[normalizedPasillo];
                const baseColor = pisoData?.color || '#CBD5F5';
                const labelTextColor = getTextColor(baseColor);
                const softBackground = lightenColor(baseColor, 0.85);
                const borderColor = lightenColor(baseColor, 0.6);
                const pasilloDisplayName = pisoData?.nombre || pasillo;

                return (
                    <div
                        key={`semana-fila-${pasilloIdx}`}
                        className="semana-fila"
                        style={{
                            "--pasillo-color": baseColor,
                            "--pasillo-text-color": labelTextColor,
                            "--pasillo-soft-bg": softBackground,
                            "--pasillo-border-color": borderColor,
                        }}
                    >
                        <div className="pasillo-label-cell">{pasilloDisplayName}</div>
                        {weekDays.map((day, dayIdx) => {
                            const isToday =
                                today &&
                                day.getFullYear() === today.getFullYear() &&
                                day.getMonth() === today.getMonth() &&
                                day.getDate() === today.getDate();

                            const turnoData = getTurnoData ? getTurnoData(day, pasillo) : null;

                            return (
                                <div
                                    key={`semana-dia-${pasilloIdx}-${dayIdx}`}
                                    className={`semana-dia ${isToday ? 'today' : ''}`}
                                    onClick={() => handleDayClick && handleDayClick(day)}
                                >
                                    {turnoData && turnoData.turnos && (
                                        <div className="turnos-semana">
                                            {turnoData.turnos.map((turno, turnoIdx) => {
                                                const rawTipo = turno?.nombre ?? turno?.Nombre ?? turno?.tipo ?? turno?.Horario ?? turno?.horario ?? "";
                                                const is24h = String(rawTipo).replace(/\D/g, "") === "24";
                                                const bg = turno?.color ?? turno?.Color ?? "#888";
                                                const doctorRaw = turno?.doctor ?? turno?.Doctor ?? "";
                                                const doctorClean = typeof doctorRaw === "string" ? doctorRaw.trim() : String(doctorRaw || "");
                                                const maxLength = is24h ? 30 : 10;
                                                const doctorLabelBase = doctorClean.length > maxLength
                                                    ? `${doctorClean.slice(0, maxLength)}.`
                                                    : doctorClean;
                                                const doctorLabel = doctorLabelBase
                                                    .split(/(\s+)/)
                                                    .map(segment => {
                                                        if (!segment.trim()) return segment;
                                                        const plainSegment = segment;
                                                        if (plainSegment.length <= 4) return plainSegment;
                                                        const mid = Math.ceil(plainSegment.length / 2);
                                                        return `${plainSegment.slice(0, mid)}­${plainSegment.slice(mid)}`;
                                                    })
                                                    .join('');

                                                return (
                                                    <div
                                                        key={`turno-${pasilloIdx}-${dayIdx}-${turnoIdx}`}
                                                        className={`turno-semana ${is24h ? "turno-24h" : ""}`}
                                                        style={{ backgroundColor: bg }}
                                                    >
                                                        <span className="turno-doctor-semana">{doctorLabel}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                );
            })}
        </div>
    );
}

CalendarioSemanal.propTypes = {
    diasSemana: PropTypes.arrayOf(PropTypes.string),
    weekDays: PropTypes.arrayOf(PropTypes.instanceOf(Date)),
    pasillosSeleccionados: PropTypes.arrayOf(PropTypes.string),
    today: PropTypes.instanceOf(Date),
    getTurnoData: PropTypes.func,
    handleDayClick: PropTypes.func,
    isMobile: PropTypes.bool,
};
