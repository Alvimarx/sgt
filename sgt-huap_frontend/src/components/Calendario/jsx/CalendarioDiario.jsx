import React from "react";
import "../css/Calendario-Diario.css";
import { getTextColor } from "../../../utils/pasilloColors";

const MESES_ESP = [
    "ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO",
    "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE",
];

const DIAS_SEMANA_COMPLETO = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

export default function CalendarioDiario({
                                             currentDay,
                                             pasillosSeleccionados,
                                             getTurnoData,
                                             handleDayClick,
                                             pisoColorMap = {},
                                         }) {

    const renderTurnosForPasillo = (pasillo) => {
        const turnoData = getTurnoData(currentDay, pasillo);

        if (!turnoData || !turnoData.turnos || turnoData.turnos.length === 0) {
            return (
                <div className="dia-turno-vacio">Sin turnos</div>
            );
        }

        const turnos = turnoData.turnos;

        return turnos.map((turno, idx) => {
            const rawTipo = turno?.tipo ?? turno?.Horario ?? turno?.horario ?? "";
            const is24h = String(rawTipo).replace(/\D/g, "") === "24";
            const rawDoctor = turno?.doctor ?? turno?.Doctor ?? "";
            const doctorClean = typeof rawDoctor === "string" ? rawDoctor.trim() : String(rawDoctor || "");

            return (
                <div
                    key={idx}
                    className={`dia-turno-item ${is24h ? "dia-turno-24h" : ""}`}
                    style={{
                        backgroundColor: turno.color,
                        color: getTextColor(turno.color)
                    }}
                >
                    <div className="dia-turno-tipo-badge">{rawTipo}</div>
                    <div className="dia-turno-doctor-name">{doctorClean}</div>
                </div>
            );
        });
    };

    return (
        <div className="calendario-diario">
            {/* Grid de pasillos en 2 columnas */}
            <div className="dia-pasillos-container">
                {pasillosSeleccionados.length === 0 ? (
                    <div className="dia-no-selection">
                        <p>Selecciona al menos un pasillo para ver los turnos</p>
                    </div>
                ) : (
                    pasillosSeleccionados.map((pasillo) => {
                        // Get color from API data instead of hardcoded function
                        const normalizedPasillo = pasillo.replace(/_/g, ' ').trim().toUpperCase();
                        const pisoData = pisoColorMap[normalizedPasillo];
                        const pasilloColor = pisoData?.color || '#CBD5F5';
                        const pasilloTextColor = getTextColor(pasilloColor);
                        const pasilloDisplayName = pisoData?.nombre || pasillo;

                        return (
                            <div
                                key={pasillo}
                                className="dia-pasillo-section"
                                style={{
                                    borderColor: pasilloColor,
                                    borderWidth: '2px',
                                    borderStyle: 'solid'
                                }}
                                onClick={() => handleDayClick(currentDay)}
                            >
                                <div
                                    className="dia-pasillo-header"
                                    style={{
                                        backgroundColor: pasilloColor,
                                        color: pasilloTextColor
                                    }}
                                >
                                    {pasilloDisplayName}
                                </div>
                                <div className="dia-pasillo-content">
                                    {renderTurnosForPasillo(pasillo)}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Leyenda */}
            <div className="dia-leyenda">
                <div className="dia-leyenda-item">
                    <div className="dia-leyenda-box" style={{ backgroundColor: "#5C5CFF" }}></div>
                    <span>Turno 24h</span>
                </div>
                <div className="dia-leyenda-item">
                    <div className="dia-leyenda-box" style={{ backgroundColor: "#FFB85C" }}></div>
                    <span>Turno Día (12h)</span>
                </div>
                <div className="dia-leyenda-item">
                    <div className="dia-leyenda-box" style={{ backgroundColor: "#AAAAAA" }}></div>
                    <span>Turno Tarde (12h)</span>
                </div>
                <div className="dia-leyenda-item">
                    <div className="dia-leyenda-box" style={{ backgroundColor: "#FF0000" }}></div>
                    <span>Sin asignar</span>
                </div>
            </div>
        </div>
    );
}
