// src/services/funcionarioService.js
import axiosInstance from '../utils/axiosConfig';

const API_BASE = '/funcionarios';

/**
 * Obtiene un resumen de los funcionarios.
 * @param {number|null} servicioId - (Opcional) Si se envía, trae los funcionarios de ese servicio. Si no, trae todos.
 */
export const getFuncionariosSummary = async (servicioId = null) => {
    try {
        const params = servicioId ? { servicioId } : {};
        const response = await axiosInstance.get(`${API_BASE}/summary`, { params });
        return { success: true, data: response.data };
    } catch (error) {
        const mensaje = error.response?.data?.error || 'Error al obtener los funcionarios';
        return { success: false, error: mensaje };
    }
};

/**
 * Asigna un nuevo servicio a un funcionario y le otorga el rol de Médico (ID 3) por defecto.
 * @param {number} funcionarioId 
 * @param {number} idServicio 
 */
export const asignarServicio = async (funcionarioId, idServicio) => {
    try {
        // Enviamos el servicio seleccionado en la vista y forzamos el rol 3 (Médico)
        const payload = {
            servicioId: Number(idServicio),
            rol: 3 
        };

        const response = await axiosInstance.put(`${API_BASE}/${funcionarioId}`, payload);
        return { success: true, data: response.data };
    } catch (error) {
        const mensaje = error.response?.data?.error || 'Error al asignar el servicio';
        return { success: false, error: mensaje };
    }
};

/**
 * Asigna un rol a un funcionario dentro de un servicio existente
 * @param {number} funcionarioId 
 * @param {number} idServicio 
 * @param {number} idRol 
 */
export const asignarRolJerarquia = async (funcionarioId, idServicio, idRol) => {
    try {
        const payload = {
            servicioId: Number(idServicio),
            rol: Number(idRol)
        };
        const response = await axiosInstance.put(`${API_BASE}/${funcionarioId}`, payload);
        return { success: true, data: response.data };
    } catch (error) {
        const mensaje = error.response?.data?.error || 'Error al asignar el rol jerárquico';
        return { success: false, error: mensaje };
    }
};

