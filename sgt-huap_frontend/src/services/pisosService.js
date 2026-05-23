import axiosInstance from '../utils/axiosConfig';

const API_BASE = '/pisos';

/**
 * Crea un nuevo piso en el sistema
 * @param {number} idServicio 
 * @param {string} nombre 
 */
export const crearPiso = async (idServicio, nombre) => {
    try {
        const payload = { idServicio: Number(idServicio), nombre };
        const response = await axiosInstance.post(API_BASE, payload);
        return { success: true, data: response.data };
    } catch (error) {
        const mensaje = error.response?.data?.error || 'Error al crear el piso';
        return { success: false, error: mensaje };
    }
};

/**    
 * Obtiene un piso por su ID
 * @param {number} idPiso 
 */
export const getPisoPorId = async (idPiso) => {
    try {
        const response = await axiosInstance.get(`${API_BASE}/${idPiso}`);
        return { success: true, data: response.data };
    } catch (error) {
        const mensaje = error.response?.data?.error || 'Error al obtener el piso';
        return { success: false, error: mensaje };
    }
};

/**
 * Obtiene todos los pisos
 * */
export const getPisos = async () => {
    try {
        const response = await axiosInstance.get(API_BASE);
        return { success: true, data: response.data };
    } catch (error) {
        const mensaje = error.response?.data?.error || 'Error al obtener los pisos';
        return { success: false, error: mensaje };
    }
};

/**
 * Obtiene los pisos de un servicio específico
 * @param {number} idServicio 
 */
export const getPisosPorServicio = async (idServicio) => {
    try {
        const response = await axiosInstance.get(`${API_BASE}/servicio/${idServicio}`);
        return { success: true, data: response.data };
    } catch (error) {
        const mensaje = error.response?.data?.error || 'Error al obtener los pisos';
        return { success: false, error: mensaje };
    }
};

/**
 * Elimina un piso por su ID
 * @param {number} idPiso
 */
export const eliminarPiso = async (idPiso) => {
    try {
        const response = await axiosInstance.delete(`${API_BASE}/${idPiso}`);
        return { success: true, data: response.data };
    }
    catch (error) {
        const mensaje = error.response?.data?.error || 'Error al eliminar el piso';
        return { success: false, error: mensaje };
    }
};