import axiosInstance from '../utils/axiosConfig';

const API_BASE = '/puestos';

/**
 * Crea un nuevo puesto en el sistema
 * @param {number} idServicio
 * @param {string} nombre
 */
export const crearPuesto = async (idServicio, nombre) => {
    try {
        const payload = { idServicio: Number(idServicio), nombre };
        const response = await axiosInstance.post(API_BASE, payload);
        return { success: true, data: response.data };
    } catch (error) {
        const mensaje = error.response?.data?.error || 'Error al crear el puesto';
        return { success: false, error: mensaje };
    }
};

/**
 * Obtiene un puesto por su ID
 * @param {number} idPuesto
 */
export const getPuestoPorId = async (idPuesto) => {
    try {
        const response = await axiosInstance.get(`${API_BASE}/${idPuesto}`);
        return { success: true, data: response.data };
    } catch (error) {
        const mensaje = error.response?.data?.error || 'Error al obtener el puesto';
        return { success: false, error: mensaje };
    }
};

/**
 * Obtiene todos los puestos
 */
export const getPuestos = async () => {
    try {
        const response = await axiosInstance.get(API_BASE);
        return { success: true, data: response.data };
    } catch (error) {
        const mensaje = error.response?.data?.error || 'Error al obtener los puestos';
        return { success: false, error: mensaje };
    }
};

/**
 * Obtiene los puestos de un servicio específico
 * @param {number} idServicio
 */
export const getPuestosPorServicio = async (idServicio) => {
    try {
        const response = await axiosInstance.get(`${API_BASE}/servicio/${idServicio}`);
        return { success: true, data: response.data };
    } catch (error) {
        const mensaje = error.response?.data?.error || 'Error al obtener los puestos';
        return { success: false, error: mensaje };
    }
};

/**
 * Actualiza el nombre de un puesto.
 * El backend recibe el nombre como query param (?nombre=...).
 * @param {number} idPuesto
 * @param {string} nombre
 */
export const actualizarPuesto = async (idPuesto, nombre) => {
    try {
        const response = await axiosInstance.put(`${API_BASE}/${idPuesto}`, null, {
            params: { nombre },
        });
        return { success: true, data: response.data };
    } catch (error) {
        const mensaje = error.response?.data?.error || error.response?.data?.message
            || 'Error al actualizar el puesto';
        return { success: false, error: mensaje };
    }
};

/**
 * Devuelve cuántos turnos están asociados a un puesto.
 * Si es > 0, el puesto no se puede eliminar.
 * @param {number} idPuesto
 */
export const getTurnosAsociados = async (idPuesto) => {
    try {
        const response = await axiosInstance.get(`${API_BASE}/${idPuesto}/turnos-asociados`);
        return { success: true, data: Number(response.data) || 0 };
    } catch (error) {
        const mensaje = error.response?.data?.error || 'Error al consultar turnos asociados';
        return { success: false, error: mensaje };
    }
};

/**
 * Elimina un puesto por su ID
 * @param {number} idPuesto
 */
export const eliminarPuesto = async (idPuesto) => {
    try {
        const response = await axiosInstance.delete(`${API_BASE}/${idPuesto}`);
        return { success: true, data: response.data };
    }
    catch (error) {
        const mensaje = error.response?.data?.error || error.response?.data?.message
            || 'Error al eliminar el puesto';
        return { success: false, error: mensaje };
    }
};
