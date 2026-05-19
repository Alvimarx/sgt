// src/services/servicioService.js
import axiosInstance from '../utils/axiosConfig';

const API_BASE = '/servicios';

/**
 * Obtiene la lista de todos los servicios
 */
export const getServicios = async () => {
    try {
        const response = await axiosInstance.get(API_BASE);
        return { success: true, data: response.data };
    } catch (error) {
        const mensaje = error.response?.data?.error || 'Error al obtener los servicios';
        return { success: false, error: mensaje };
    }
};

/**
 * Crea un nuevo servicio
 * @param {string} nombre 
 */
export const createServicio = async (nombre) => {
    try {
        // Asumimos que el backend espera el campo "nombre" o "nombreServicio"
        const response = await axiosInstance.post(API_BASE, { nombre });
        return { success: true, data: response.data };
    } catch (error) {
        const mensaje = error.response?.data?.error || 'Error al crear el servicio';
        return { success: false, error: mensaje };
    }
};

/**
 * Actualiza el nombre de un servicio existente
 * @param {number} id 
 * @param {string} nombre 
 */
export const updateServicio = async (id, nombre) => {
    try {
        const response = await axiosInstance.put(`${API_BASE}/${id}`, { nombre });
        return { success: true, data: response.data };
    } catch (error) {
        const mensaje = error.response?.data?.error || 'Error al actualizar el servicio';
        return { success: false, error: mensaje };
    }
};

/**
 * Elimina un servicio
 * @param {number} id 
 */
export const deleteServicio = async (id) => {
    try {
        await axiosInstance.delete(`${API_BASE}/${id}`);
        return { success: true };
    } catch (error) {
        const mensaje = error.response?.data?.error || 'Error al eliminar el servicio';
        return { success: false, error: mensaje };
    }
};