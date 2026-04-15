import React from "react";
import PropTypes from "prop-types";
import "../css/Calendario-Mensual.css";
import { getTextColor } from "../../../utils/pasilloColors";

// Función para convertir hex a rgba con opacidad
const hexToRgba = (hex, opacity) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return hex;

    const r = parseInt(result[1], 16);
    const g = parseInt(result[2], 16);
    const b = parseInt(result[3], 16);

    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};

export default function CalendarioMensual({
                                              diasSemana,
                                              monthMatrix,
                                              today,
                                              pasillosSeleccionados,
                                              getTurnoData,
                                              handleDayClick,
                                              weekdaysRef,
                                              gridRef,
                                              pisoColorMap = {},
                                          }) {

    return (
        <div>
            <div
                className="calendario-grid"
                ref={gridRef}
                style={{ "--pasillos-count": pasillosSeleccionados.length }}
            >
                {diasSemana.map((dia) => (
                    <div
                        key={dia}
                        className="calendario-weekday"
                        style={{ position: 'sticky', top: 0, zIndex: 10, background: '#fff' }}
                    >
                        {dia}
                    </div>
                ))}

                {monthMatrix.map((cell, idx) => {
                    const isToday =
                        cell.date.getFullYear() === today.getFullYear() &&
                        cell.date.getMonth() === today.getMonth() &&
                        cell.date.getDate() === today.getDate();

                    return (
                        <div
                            key={`month-cell-${idx}`}
                            className={`calendario-cell ${isToday ? "hoy" : ""} ${!cell.inMonth ? "out-month" : ""}`}
                            onClick={() => handleDayClick(cell.date)}
                        >
                            <div className="cell-header">
                                <div className={`day-number ${isToday ? "day-number-today" : ""} ${!cell.inMonth ? "out-month-day" : ""}`}>
                                    {cell.day}
                                </div>
                            </div>

                            <div className="pasillos-container">
                                {pasillosSeleccionados.map((pasillo, pasilloIndex) => {
                                    const turnoData = getTurnoData(cell.date, pasillo);
                                    const normalizedPasillo = pasillo.replace(/_/g, ' ').trim().toUpperCase();
                                    const pisoData = pisoColorMap[normalizedPasillo];
                                    const pasilloColor = pisoData?.color || '#CBD5F5';
                                    const pasilloTextColor = getTextColor(pasilloColor);
                                    const pasilloDisplayName = pisoData?.nombre || pasillo;

                                    return (
                                        <div
                                            key={`pasillo-section-${idx}-${pasilloIndex}`}
                                            className="pasillo-section"
                                            style={{
                                                borderColor: pasilloColor,
                                                borderWidth: '2px',
                                                borderStyle: 'solid'
                                            }}
                                        >
                                            <div
                                                className="pasillo-header"
                                                style={{
                                                    backgroundColor: pasilloColor,
                                                    color: pasilloTextColor
                                                }}
                                            >
                                                {pasilloDisplayName}
                                            </div>
                                            <div className="pasillo-content">
                                                {turnoData ? (
                                                    turnoData.turnos.map((turno, turnoIdx) => {
                                                        const rawTipo = turno?.tipo ?? turno?.Horario ?? turno?.horario ?? "";
                                                        const is24h = String(rawTipo).replace(/\D/g, "") === "24";
                                                        const rawDoctor = turno?.doctor ?? turno?.Doctor ?? "";
                                                        const doctorClean = typeof rawDoctor === "string" ? rawDoctor.trim() : String(rawDoctor || "");
                                                        const maxLength = is24h ? 30 : 15;
                                                        const doctorLabelBase = doctorClean.length > maxLength
                                                            ? `${doctorClean.slice(0, maxLength)}.`
                                                            : doctorClean;

                                                        const doctorLabel = doctorLabelBase
                                                            .split(/(\s+)/)
                                                            .map(segment => {
                                                                if (!segment.trim()) return segment;
                                                                const plainSegment = segment;
                                                                if (plainSegment.length <= 6) return plainSegment;
                                                                const mid = Math.ceil(plainSegment.length / 2);
                                                                return `${plainSegment.slice(0, mid)}­${plainSegment.slice(mid)}`;
                                                            })
                                                            .join('');

                                                        // --- AJUSTE DE OPACIDAD ---
                                                        // Subimos a 0.3 para que el color sea más evidente
                                                        const turnoBgColor = hexToRgba(pasilloColor, 0.3);
                                                        const turnoTextColor = pasilloColor;

                                                        return (
                                                            <div
                                                                key={`${idx}-${pasilloIndex}-${turnoIdx}`}
                                                                className={`turno-item ${is24h ? "turno-24h" : ""}`}
                                                                style={{
                                                                    backgroundColor: turnoBgColor,
                                                                    color: turnoTextColor,
                                                                    // Aumentamos también la opacidad del borde para definir mejor la caja
                                                                    border: `1px solid ${hexToRgba(pasilloColor, 0.5)}`,
                                                                    fontWeight: '700'
                                                                }}
                                                            >
                                                                {doctorLabel}
                                                            </div>
                                                        );
                                                    })
                                                ) : (
                                                    <div className="turno-vacio">-</div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

CalendarioMensual.propTypes = {
    diasSemana: PropTypes.arrayOf(PropTypes.string).isRequired,
    monthMatrix: PropTypes.arrayOf(
        PropTypes.shape({
            day: PropTypes.number.isRequired,
            date: PropTypes.instanceOf(Date).isRequired,
            inMonth: PropTypes.bool.isRequired,
        })
    ).isRequired,
    today: PropTypes.instanceOf(Date).isRequired,
    pasillosSeleccionados: PropTypes.arrayOf(PropTypes.string).isRequired,
    getTurnoData: PropTypes.func.isRequired,
    handleDayClick: PropTypes.func.isRequired,
    weekdaysRef: PropTypes.shape({ current: PropTypes.any }).isRequired,
    gridRef: PropTypes.shape({ current: PropTypes.any }).isRequired,
};