// plantillasService.js
// Tipos de Turno (catálogo por servicio) y Plantillas (rotativas)

import axiosInstance from '../utils/axiosConfig';
import { getServicioId as getServicioIdFromToken } from '../utils/tokenManager';

const getServicioId = () => getServicioIdFromToken() || localStorage.getItem('servicioId');

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
// PLANTILLAS (ROTATIVAS)  →  /api/v2/plantillas
// ─────────────────────────────────────────────────────────────────────────────
export const plantillasService = {

    /** GET /plantillas/servicio/{id} — lista de plantillas del servicio. */
    getByServicio: async (servicioId = null) => {
        const sId = servicioId || getServicioId();
        if (!sId) throw new Error('servicioId es requerido');
        const res = await axiosInstance.get(`/plantillas/servicio/${sId}`);
        return res.data;
    },

    /** GET /plantillas/{id} — una plantilla con su secuencia completa. */
    getById: async (id) => {
        const res = await axiosInstance.get(`/plantillas/${id}`);
        return res.data;
    },

    /**
     * POST /plantillas — crea plantilla y opcionalmente establece su secuencia.
     * dto: { nombre, semanas, idServicio, secuenciaDias?: [{diaIndex, turno: {idPlantillaTurno}|null}] }
     */
    create: async (dto) => {
        const sId = dto.idServicio || getServicioId();
        const res = await axiosInstance.post('/plantillas', { ...dto, idServicio: Number(sId) });
        return res.data;
    },

    /** PUT /plantillas/{id} — actualiza nombre y semanas (no la secuencia). */
    update: async (id, { nombre, semanas }) => {
        const res = await axiosInstance.put(`/plantillas/${id}`, {
            nombre,
            semanas: Number(semanas),
        });
        return res.data;
    },

    /** DELETE /plantillas/{id} */
    delete: async (id) => {
        const res = await axiosInstance.delete(`/plantillas/${id}`);
        return res.data;
    },

    /** GET /plantillas/{id}/secuencia — secuencia ordenada de días. */
    getSecuencia: async (id) => {
        const res = await axiosInstance.get(`/plantillas/${id}/secuencia`);
        return res.data;
    },

    /**
     * PUT /plantillas/{id}/secuencia — reemplaza la secuencia completa.
     * dias: (Long[])[] — una lista de tipos de turno por día (varios = jornada
     * compuesta como día + noche). Lista interior vacía = día libre.
     */
    setSecuencia: async (id, dias) => {
        const res = await axiosInstance.put(`/plantillas/${id}/secuencia`, dias);
        return res.data;
    },

    /** POST /plantillas/{id}/duplicar — crea una copia de la plantilla. */
    duplicar: async (id) => {
        const res = await axiosInstance.post(`/plantillas/${id}/duplicar`);
        return res.data;
    },

    /** GET /plantillas/{id}/validar — valida coherencia semanas/secuencia. */
    validar: async (id) => {
        const res = await axiosInstance.get(`/plantillas/${id}/validar`);
        return res.data;
    },
};

export default { tiposTurno: tiposTurnoService, plantillas: plantillasService, formatHora, toLocalTime };
