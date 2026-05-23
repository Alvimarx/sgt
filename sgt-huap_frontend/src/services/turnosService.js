import axiosInstance from '../utils/axiosConfig';

const API_BASE = '/turnos';


/**
 * Obtiene todos los turnos disponibles en el sistema
 */
export const getTurnos = async () => {
    try {
        const response = await axiosInstance.get(API_BASE);
        return { success: true, data: response.data };
    } catch (error) {
        const mensaje = error.response?.data?.error || 'Error al obtener los turnos';
        return { success: false, error: mensaje };
    }
};

/**
 * Obtiene todos los turnos de un servicio disponibles en el sistema
 * @param {number} idServicio 
 */
export const getTurnosPorServicio = async (idServicio) => {
    try {
        const response = await axiosInstance.get(`${API_BASE}/servicio/${idServicio}`);
        return { success: true, data: response.data };
    } catch (error) {
        const mensaje = error.response?.data?.error || 'Error al obtener los turnos';
        return { success: false, error: mensaje };
    }
};
