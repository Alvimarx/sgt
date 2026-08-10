// rotativasService.js
// Tipos de Turno (catálogo por servicio) y Rotativas

import axiosInstance from '../utils/axiosConfig';
import { getServicioId as getServicioIdFromToken } from '../utils/tokenManager';

// SEC (H-11): sin respaldo a localStorage crudo (manipulable) — ver adminService.js.
const getServicioId = () => getServicioIdFromToken();

// ─────────────────────────────────────────────────────────────────────────────
// UTILIDADES DE FORMATO
// LocalTime se serializa como array [H, M] o [H, M, S] cuando
// spring.jackson.serialization.write-dates-as-timestamps no está en false.
// ─────────────────────────────────────────────────────────────────────────────

/** Convierte LocalTime del backend ([H,M] | "HH:MM:SS") a string "HH:MM". */
export const formatHora = (hora) => {
    if (!hora) return '';
    if (Array.isArray(hora)) {
        const [h, m] = hora;
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    }
    return String(hora).substring(0, 5);
};

/** Convierte "HH:MM" (input type=time) a "HH:MM:00" para enviar al backend. */
export const toLocalTime = (timeStr) => (timeStr ? `${timeStr}:00` : null);

/**
 * Desplaza una hora ([H,M] | "HH:MM[:SS]") N minutos y devuelve "HH:MM" (envuelve en 24h).
 * Útil para mostrar el "después" de una regla de ajuste de horario.
 */
export const shiftHora = (hora, minutos) => {
    const base = formatHora(hora); // "HH:MM" o ""
    if (!base) return '';
    const [h, m] = base.split(':').map(Number);
    const total = ((h * 60 + m + (Number(minutos) || 0)) % 1440 + 1440) % 1440;
    const hh = Math.floor(total / 60);
    const mm = total % 60;
    return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
};

/** Formatea un desplazamiento en minutos (tiempoMinutos de una regla) como horas: "+1.5 h", "-2 h". */
export const formatDesplazamientoHoras = (minutos) => {
    const horas = (Number(minutos) || 0) / 60;
    const signo = horas > 0 ? '+' : '';
    const valor = Number.isInteger(horas) ? horas : horas.toFixed(1);
    return `${signo}${valor} h`;
};

// ─────────────────────────────────────────────────────────────────────────────
// TIPOS DE TURNO  →  /api/v2/tipos-turno
// ─────────────────────────────────────────────────────────────────────────────
export const tiposTurnoService = {

    /** GET /tipos-turno/servicio/{id} — catálogo filtrado por servicio. */
    getByServicio: async (servicioId = null) => {
        const sId = servicioId || getServicioId();
        if (!sId) throw new Error('servicioId es requerido');
        const res = await axiosInstance.get(`/tipos-turno/servicio/${sId}`);
        return res.data;
    },

    /** POST /tipos-turno — crea un nuevo tipo de turno. */
    create: async ({ nombre, horaInicio, horaTermino, idServicio = null }) => {
        const sId = idServicio || getServicioId();
        const res = await axiosInstance.post('/tipos-turno', {
            nombre,
            horaInicio: toLocalTime(horaInicio),
            horaTermino: toLocalTime(horaTermino),
            idServicio: Number(sId),
        });
        return res.data;
    },

    /** PUT /tipos-turno/{id} — actualiza nombre y horario. */
    update: async (id, { nombre, horaInicio, horaTermino }) => {
        const res = await axiosInstance.put(`/tipos-turno/${id}`, {
            nombre,
            horaInicio: toLocalTime(horaInicio),
            horaTermino: toLocalTime(horaTermino),
        });
        return res.data;
    },

    /**
     * GET /tipos-turno/{id}/rotativas-afectadas — nombres de las rotativas cuyos días
     * pasarán a ser libres si se elimina este tipo de turno. Array vacío = no está en uso.
     */
    getRotativasAfectadas: async (id) => {
        const res = await axiosInstance.get(`/tipos-turno/${id}/rotativas-afectadas`);
        return Array.isArray(res.data) ? res.data : [];
    },

    /**
     * DELETE /tipos-turno/{id} — elimina el tipo de turno. Si está en uso, libera
     * sus referencias en las rotativas (los días quedan libres) y luego lo borra.
     */
    delete: async (id) => {
        const res = await axiosInstance.delete(`/tipos-turno/${id}`);
        return res.data;
    },
};

// ─────────────────────────────────────────────────────────────────────────────
// PLANTILLAS (ROTATIVAS)  →  /api/v2/rotativas
// ─────────────────────────────────────────────────────────────────────────────
export const plantillasService = {

    /** GET /rotativas/servicio/{id} — lista de plantillas del servicio. */
    getByServicio: async (servicioId = null) => {
        const sId = servicioId || getServicioId();
        if (!sId) throw new Error('servicioId es requerido');
        const res = await axiosInstance.get(`/rotativas/servicio/${sId}`);
        return res.data;
    },

    /** GET /rotativas/{id} — una plantilla con su secuencia completa. */
    getById: async (id) => {
        const res = await axiosInstance.get(`/rotativas/${id}`);
        return res.data;
    },

    /**
     * POST /rotativas — crea plantilla y opcionalmente establece su secuencia.
     * dto: { nombre, semanas, idServicio, secuenciaDias?: [{diaIndex, turno: {idTipoTurno}|null}] }
     */
    create: async (dto) => {
        const sId = dto.idServicio || getServicioId();
        const res = await axiosInstance.post('/rotativas', { ...dto, idServicio: Number(sId) });
        return res.data;
    },

    /** PUT /rotativas/{id} — actualiza nombre y semanas (no la secuencia). */
    update: async (id, { nombre, semanas }) => {
        const res = await axiosInstance.put(`/rotativas/${id}`, {
            nombre,
            semanas: Number(semanas),
        });
        return res.data;
    },

    /** DELETE /rotativas/{id} */
    delete: async (id) => {
        const res = await axiosInstance.delete(`/rotativas/${id}`);
        return res.data;
    },

    /** GET /rotativas/{id}/secuencia — secuencia ordenada de días. */
    getSecuencia: async (id) => {
        const res = await axiosInstance.get(`/rotativas/${id}/secuencia`);
        return res.data;
    },

    /**
     * PUT /rotativas/{id}/secuencia — reemplaza la secuencia completa.
     * dias: (Long[])[] — una lista de tipos de turno por día (varios = jornada
     * compuesta como día + noche). Lista interior vacía = día libre.
     */
    setSecuencia: async (id, dias) => {
        const res = await axiosInstance.put(`/rotativas/${id}/secuencia`, dias);
        return res.data;
    },

    /** POST /rotativas/{id}/duplicar — crea una copia de la plantilla. */
    duplicar: async (id) => {
        const res = await axiosInstance.post(`/rotativas/${id}/duplicar`);
        return res.data;
    },

    /** GET /rotativas/{id}/validar — valida coherencia semanas/secuencia. */
    validar: async (id) => {
        const res = await axiosInstance.get(`/rotativas/${id}/validar`);
        return res.data;
    },
};

export default { tiposTurno: tiposTurnoService, plantillas: plantillasService, formatHora, toLocalTime };
