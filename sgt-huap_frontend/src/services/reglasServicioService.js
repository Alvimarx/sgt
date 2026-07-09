// reglasServicioService.js
// Reglas de ajuste de horario por servicio (fin de semana / feriado).
// DTO: { idRegla, idServicio, nombre, aplicaFinDeSemana, aplicaFeriado,
//        tiempoMinutos, idTipoTurnoInicio|null, idTipoTurnoFin|null,
//        nombreTipoTurnoInicio, nombreTipoTurnoFin }

import axiosInstance from '../utils/axiosConfig';

const API_BASE = '/reglas-servicio';

export const reglasServicioService = {

    /** GET /reglas-servicio/servicio/{id} — reglas vigentes del servicio. */
    getByServicio: async (servicioId) => {
        const res = await axiosInstance.get(`${API_BASE}/servicio/${servicioId}`);
        return Array.isArray(res.data) ? res.data : [];
    },

    /** POST /reglas-servicio — crea una regla. */
    create: async (dto) => {
        const res = await axiosInstance.post(API_BASE, dto);
        return res.data;
    },

    /** PUT /reglas-servicio/{id} — actualiza una regla. */
    update: async (id, dto) => {
        const res = await axiosInstance.put(`${API_BASE}/${id}`, dto);
        return res.data;
    },

    /** DELETE /reglas-servicio/{id} — soft-delete. */
    remove: async (id) => {
        const res = await axiosInstance.delete(`${API_BASE}/${id}`);
        return res.data;
    },
};

export default reglasServicioService;
