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
 * Actualiza el nombre de un piso.
 * El backend recibe el nombre como query param (?nombre=...).
 * @param {number} idPiso
 * @param {string} nombre
 */
export const actualizarPiso = async (idPiso, nombre) => {
    try {
        const response = await axiosInstance.put(`${API_BASE}/${idPiso}`, null, {
            params: { nombre },
        });
        return { success: true, data: response.data };
    } catch (error) {
        const mensaje = error.response?.data?.error || error.response?.data?.message
            || 'Error al actualizar el piso';
        return { success: false, error: mensaje };
    }
};

/**
 * Devuelve cuántos turnos están asociados a un piso.
 * Si es > 0, el piso no se puede eliminar.
 * @param {number} idPiso
 */
export const getTurnosAsociados = async (idPiso) => {
    try {
        const response = await axiosInstance.get(`${API_BASE}/${idPiso}/turnos-asociados`);
        return { success: true, data: Number(response.data) || 0 };
    } catch (error) {
        const mensaje = error.response?.data?.error || 'Error al consultar turnos asociados';
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
        const mensaje = error.response?.data?.error || error.response?.data?.message
            || 'Error al eliminar el piso';
        return { success: false, error: mensaje };
    }
};