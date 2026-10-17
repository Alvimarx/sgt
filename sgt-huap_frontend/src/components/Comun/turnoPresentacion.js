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

const DIAS_CORTOS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
const MESES_CORTOS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

// "2026-10-19" → "lun 19 oct 2026", el formato de las fechas de turno en
// Solicitudes (desktop). Sin Intl, para que no dependa del navegador.
export const fechaLegible = (fecha) => {
    const m = String(fecha || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!m) return fecha ? String(fecha) : "";
    const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    return `${DIAS_CORTOS[d.getDay()]} ${d.getDate()} ${MESES_CORTOS[d.getMonth()]} ${d.getFullYear()}`;
};

const hora = (valor) => String(valor || "").slice(0, 5);

// Etiqueta de un turno: «Día · lun 19 oct 2026 · 08:00–20:00». La usan las
// confirmaciones de asignación, el encabezado de «Gestión de asignación», los
// avisos del intercambio y las etiquetas que el inicio y el calendario le pasan
// al asistente de solicitudes. Antes mostraba la fecha en ISO.
export const formatShiftLabel = (shift) => {
    if (!shift) return "";

    const tipoLabel =
        shift.nombreTipoTurno ||
        shift.nombreTipo ||
        shift.nombre ||
        (shift.tipo === "dia" ? "Turno día" : "Turno noche");

    const fecha = fechaLegible(shift.fecha || shift.raw?.diaInicioTurno || "");
    const inicio = hora(shift.inicio || shift.horaInicio || shift.raw?.horaInicio);
    const fin = hora(shift.fin || shift.horaFin || shift.raw?.horaFin);
    const horario = inicio || fin ? `${inicio}–${fin}` : "";

    return [tipoLabel, fecha, horario].filter(Boolean).join(" · ");
};
