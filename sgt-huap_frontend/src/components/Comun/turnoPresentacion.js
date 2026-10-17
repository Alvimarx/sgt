// turnoPresentacion.js
// Cómo se presenta un turno en la agenda, el calendario y el detalle: su color
// (por tipo de turno), su equipo y su etiqueta. Vive aparte de ShiftDetail.jsx
// para que ese archivo exporte solo componentes (fast refresh de Vite).
import { SGT_DATA } from "../Admin2/data";

// Color por identidad de tipo de turno (no por día/noche): cada tipo de turno (idTipoTurno)
// recibe siempre el mismo color de la paleta de equipos, consistente en Agenda, Calendario y Detalle.
const TEAM_COLOR_LIST = Object.values(SGT_DATA.TEAMS);

const colorIndexForKey = (value) => {
    const numeric = Number(value);
    if (Number.isFinite(numeric)) return Math.abs(Math.trunc(numeric)) % TEAM_COLOR_LIST.length;
    const str = String(value ?? "");
    let acc = 0;
    for (let i = 0; i < str.length; i++) acc = (acc + str.charCodeAt(i) * (i + 1)) % 997;
    return acc % TEAM_COLOR_LIST.length;
};

export const getTipoTurnoColor = (shift) => {
    const key = shift?.idTipoTurno ?? shift?.nombreTipoTurno ?? shift?.tipo ?? "sin-tipo";
    return TEAM_COLOR_LIST[colorIndexForKey(key)];
};

export const getAgendaTeam = (shift) => {
    if (shift?.teamGroup?.integrantes?.length) {
        const integrantes = shift.teamGroup.integrantes;

        return {
            jefe: integrantes[0],
            integrantes,
            urgenciologos: integrantes.slice(1, 3),
            medicos: integrantes.slice(3),
            total: integrantes.length,
        };
    }

    if (shift?.team) return shift.team;

    return null;
};

export const formatShiftLabel = (shift) => {
    if (!shift) return "";

    const tipoLabel =
        shift.nombreTipoTurno ||
        shift.nombreTipo ||
        shift.nombre ||
        (shift.tipo === "dia" ? "Turno día" : "Turno noche");

    const fecha = shift.fecha || shift.raw?.diaInicioTurno || "";
    const inicio = shift.inicio || shift.horaInicio || shift.raw?.horaInicio || "";
    const fin = shift.fin || shift.horaFin || shift.raw?.horaFin || "";

    return `${tipoLabel} · ${fecha} ${inicio}–${fin}`.trim();
};
