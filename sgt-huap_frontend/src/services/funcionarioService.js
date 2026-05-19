// src/services/funcionarioService.js
import axiosInstance from '../utils/axiosConfig';

const API_BASE = '/funcionarios';

/**
 * Obtiene la lista de todos los funcionarios para el buscador
 */
export const getFuncionarios = async () => {
    try {
        const response = await axiosInstance.get(API_BASE);
        return { success: true, data: response.data };
    } catch (error) {
        const mensaje = error.response?.data?.error || 'Error al obtener los funcionarios';
        return { success: false, error: mensaje };
    }
};

/**
 * Asigna un nuevo servicio a un funcionario existente
 * @param {number} funcionarioId 
 * @param {number} idServicio 
 * @param {number} idRolServicio 
 */
export const asignarServicio = async (funcionarioId, idServicio, idRolServicio) => {
    try {
        // Dependiendo de cómo tu backend procese el Map<String, Object>, 
        // aquí enviamos los datos del nuevo servicio y rol.
        const payload = {
            nuevoServicio: {
                idServicio: Number(idServicio),
                idRolServicio: Number(idRolServicio)
            }
        };

        const response = await axiosInstance.put(`${API_BASE}/${funcionarioId}`, payload);
        return { success: true, data: response.data };
    } catch (error) {
        const mensaje = error.response?.data?.error || 'Error al asignar el servicio';
        return { success: false, error: mensaje };
    }
};