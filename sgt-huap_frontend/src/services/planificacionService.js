// planificacionService.js
// Moldes de planificación (rotativas + funcionarios + puestos) y generación de turnos.
//
// asignaciones: [{ idRotativa, idFuncionario|null, idPuesto|null }]

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
     * POST /planificaciones/{id}/conflictos — pre-chequeo de choques de horario contra turnos
     * existentes (cualquier servicio). No crea nada. Usa exactamente el mismo cálculo que
     * `generar` (mismo ancla, misma vigencia efectiva), por lo que nunca puede diferir del
     * resultado real de la generación.
     * @param {string} fechaInicioRotativa ancla de la rotativa (debe ser lunes)
     * @param {string} fechaInicioEfectiva primer día con turnos reales (puede ser cualquier día, igual o posterior al ancla)
     * @param {string} fechaFinEfectiva último día con turnos reales (inclusive)
     * @returns {Array<{idFuncionario, nombreFuncionario, fecha, horaInicio, horaFin, nombreRotativa, servicioEnConflicto}>}
     */
    conflictos: async (id, fechaInicioRotativa, fechaInicioEfectiva, fechaFinEfectiva) => {
        const res = await axiosInstance.post(`${API_BASE}/${id}/conflictos`,
            { fechaInicioRotativa, fechaInicioEfectiva, fechaFinEfectiva });
        return Array.isArray(res.data) ? res.data : [];
    },

    /**
     * POST /planificaciones/{id}/generar — expande el molde a turnos reales para el rango
     * efectivo indicado (de longitud arbitraria, no limitada a un mes ni al ciclo de la rotativa),
     * anclando la fase de cada rotativa a `fechaInicioRotativa` (debe ser lunes). Omite los turnos
     * en conflicto de horario (quedan vacantes). Aplica solo las reglas de ajuste cuyos ids se
     * pasen en idsReglas (vacío = sin ajuste de horario). Rechaza si la vigencia se superpone con
     * otra ya activa del mismo servicio.
     * @returns {{ generados, vacantesPorConflicto, idEjecucion }}
     *
     * Timeout propio más alto que el default (30s): un rango grande puede generar miles de
     * turnos y tardar más que una petición normal.
     */
    generar: async (id, fechaInicioRotativa, fechaInicioEfectiva, fechaFinEfectiva, idsReglas = []) => {
        const res = await axiosInstance.post(`${API_BASE}/${id}/generar`,
            { fechaInicioRotativa, fechaInicioEfectiva, fechaFinEfectiva, idsReglas }, { timeout: 120000 });
        return res.data;
    },

    /**
     * POST /planificaciones/{id}/extender — agrega una nueva vigencia contigua a la última
     * ejecución activa del servicio (mismo ancla, mismas asignaciones actuales del molde), desde
     * el día siguiente a su fin hasta `fechaFinEfectiva`. No reemplaza nada, solo agrega.
     */
    extender: async (id, fechaFinEfectiva, idsReglas = []) => {
        const res = await axiosInstance.post(`${API_BASE}/${id}/extender`,
            { fechaFinEfectiva, idsReglas }, { timeout: 120000 });
        return res.data;
    },

    /**
     * POST /planificaciones/{id}/editar-desde — trunca/anula la vigencia activa que cubre
     * `fechaDesde` y genera una nueva desde esa fecha (mismo ancla de rotativa), permitiendo
     * cambiar asignaciones (funcionarios/puestos/roles) hacia adelante sin alterar el historial.
     */
    editarDesde: async (id, { fechaDesde, fechaFinEfectiva, asignaciones, idsReglas = [] }) => {
        const res = await axiosInstance.post(`${API_BASE}/${id}/editar-desde`,
            { fechaDesde, fechaFinEfectiva, asignaciones, idsReglas }, { timeout: 120000 });
        return res.data;
    },

    /** GET /planificaciones/{id}/ejecuciones — vigencias (versiones) de este molde, más recientes primero. */
    getEjecuciones: async (id) => {
        const res = await axiosInstance.get(`${API_BASE}/${id}/ejecuciones`);
        return Array.isArray(res.data) ? res.data : [];
    },

    /**
     * GET /planificaciones/servicio/{idServicio}/ejecuciones — TODAS las vigencias del servicio
     * (de cualquier molde), más recientes primero. Permite ver y actuar sobre cualquier
     * planificación vigente del servicio sin depender de tener cargado el molde que la generó.
     */
    getEjecucionesServicio: async (idServicio) => {
        const res = await axiosInstance.get(`${API_BASE}/servicio/${idServicio}/ejecuciones`);
        return Array.isArray(res.data) ? res.data : [];
    },

    /**
     * PUT /planificaciones/ejecuciones/{idEjecucion}/acortar — elimina los turnos de una vigencia
     * desde `fechaDesde` en adelante (acorta su fin efectivo al día anterior). Rechaza fechas
     * retroactivas (anteriores a hoy) y fechas no posteriores al inicio efectivo de la vigencia.
     */
    acortarEjecucion: async (idEjecucion, fechaDesde) => {
        const res = await axiosInstance.put(`${API_BASE}/ejecuciones/${idEjecucion}/acortar`, { fechaDesde });
        return res.data;
    },

    /**
     * DELETE /planificaciones/ejecuciones/{idEjecucion} — anula por completo una ejecución
     * (deshacer generación con origen inequívoco): nunca afecta otra ejecución, planificación o
     * turnos manuales/legado. Preferir esto sobre `eliminarTurnosGenerados` para generaciones nuevas.
     */
    anularEjecucion: async (idEjecucion) => {
        const res = await axiosInstance.delete(`${API_BASE}/ejecuciones/${idEjecucion}`);
        return res.data;
    },

    /**
     * DELETE /planificaciones/{id}/turnos?fechaInicio=&fechaFin= — deshace una generación LEGADA
     * (turnos generados antes de introducirse el modelo de ejecuciones, identificados por rotativa
     * compartida). Se conserva por compatibilidad histórica; para generaciones nuevas usar
     * `anularEjecucion`. @returns {{ eliminados: number }}
     */
    eliminarTurnosGenerados: async (id, fechaInicio, fechaFin) => {
        const res = await axiosInstance.delete(`${API_BASE}/${id}/turnos`, {
            params: { fechaInicio, fechaFin },
        });
        return res.data;
    },
};

export default planificacionService;
