// planificacionService.js
// Moldes de planificación (rotativas + funcionarios + puestos) y generación de turnos.
//
// asignaciones: [{ idPlantilla, idFuncionario|null, idPuesto|null }]

import axiosInstance from '../utils/axiosConfig';

const API_BASE = '/planificaciones';

export const planificacionService = {

    /** GET /planificaciones/servicio/{id} — moldes del servicio. */
    getByServicio: async (servicioId) => {
        const res = await axiosInstance.get(`${API_BASE}/servicio/${servicioId}`);
        return res.data;
    },

    /** GET /planificaciones/{id} — un molde con sus asignaciones. */
    getById: async (id) => {
        const res = await axiosInstance.get(`${API_BASE}/${id}`);
        return res.data;
    },

    /** POST /planificaciones — crea un molde. */
    create: async ({ idServicio, nombre, asignaciones = [] }) => {
        const res = await axiosInstance.post(API_BASE, {
            idServicio: Number(idServicio),
            nombre,
            asignaciones,
        });
        return res.data;
    },

    /** PUT /planificaciones/{id} — reemplaza nombre y asignaciones. */
    update: async (id, { nombre, asignaciones = [] }) => {
        const res = await axiosInstance.put(`${API_BASE}/${id}`, { nombre, asignaciones });
        return res.data;
    },

    /** DELETE /planificaciones/{id} */
    remove: async (id) => {
        const res = await axiosInstance.delete(`${API_BASE}/${id}`);
        return res.data;
    },

    /**
     * POST /planificaciones/{id}/conflictos — pre-chequeo de choques de horario contra
     * turnos existentes (cualquier servicio). No crea nada. fechaInicio debe ser un lunes.
     * @returns {Array<{idFuncionario, nombreFuncionario, fecha, horaInicio, horaFin, nombreRotativa, servicioEnConflicto}>}
     */
    conflictos: async (id, fechaInicio) => {
        const res = await axiosInstance.post(`${API_BASE}/${id}/conflictos`, { fechaInicio });
        return Array.isArray(res.data) ? res.data : [];
    },

    /**
     * POST /planificaciones/{id}/generar — expande el molde a turnos desde fechaInicio (lunes).
     * Omite los turnos en conflicto de horario. @returns {{ generados, omitidos }}
     */
    generar: async (id, fechaInicio) => {
        const res = await axiosInstance.post(`${API_BASE}/${id}/generar`, { fechaInicio });
        return res.data;
    },
};

export default planificacionService;
