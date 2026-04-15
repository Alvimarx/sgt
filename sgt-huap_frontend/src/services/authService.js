/**
 * authService.js
 * Servicio centralizado para autenticación con JWT
 */

import axiosInstance from '../utils/axiosConfig';
import { 
    saveToken, 
    saveUserData, 
    clearAuth, 
    getToken, 
    isTokenValid,
    getUserData 
} from '../utils/tokenManager';

/**
 * Realiza el login con RUT y password
 * @param {string} rut - RUT del usuario (con o sin formato)
 * @param {string} password - Contraseña del usuario
 * @returns {Promise<Object>} Datos del usuario y token
 */
export const login = async (rut, password) => {
    try {
        const response = await axiosInstance.post('/usuarios/login', {
            rut,
            password
        });

        const { token, userId, servicioId, rol, nombre, apellidoPaterno, apellidoMaterno } = response.data;

        // Guardar token
        saveToken(token);

        // Guardar datos del usuario
        const userData = {
            userId,
            servicioId,
            rol,
            nombre: nombre || 'Usuario',
            apellidoPaterno: apellidoPaterno || '',
            apellidoMaterno: apellidoMaterno || '',
            nombreCompleto: `${nombre || ''} ${apellidoPaterno || ''} ${apellidoMaterno || ''}`.trim()
        };
        
        saveUserData(userData);

        return { success: true, userData };
    } catch (error) {
        console.error('Error en login:', error);
        
        return {
            success: false,
            error: error.message || 'Error al iniciar sesión'
        };
    }
};

/**
 * Cierra la sesión del usuario
 */
export const logout = () => {
    clearAuth();
};

/**
 * Verifica si el usuario está autenticado
 * @returns {boolean}
 */
export const isAuthenticated = () => {
    return isTokenValid();
};

/**
 * Obtiene los datos del usuario actual
 * @returns {Object|null}
 */
export const getCurrentUser = () => {
    if (!isAuthenticated()) {
        return null;
    }
    return getUserData();
};

/**
 * Obtiene el token actual
 * @returns {string|null}
 */
export const getCurrentToken = () => {
    return getToken();
};

/**
 * Verifica si el usuario tiene un rol específico
 * @param {string|string[]} roles - Rol o array de roles a verificar
 * @returns {boolean}
 */
export const hasRole = (roles) => {
    const userData = getCurrentUser();
    if (!userData || !userData.rol) return false;

    const allowedRoles = Array.isArray(roles) ? roles : [roles];
    return allowedRoles.includes(userData.rol);
};

/**
 * Obtiene todos los servicios y roles asociados a un RUT
 * @param {string} rut - Cuerpo del RUT (sin puntos ni DV)
 */
export const getServiciosPorRut = async (rut) => {
    try {
        const response = await axiosInstance.get(`/usuarios/rut/${rut}/servicios`);
        return response.data; // Retorna el array de servicios/roles
    } catch (error) {
        console.error('Error al obtener servicios por RUT:', error);
        return [];
    }
};

/**
 * Verifica si el usuario es jefatura (JEFATURA o SUBROGANTE)
 * @returns {boolean}
 */
export const isJefatura = () => {
    return hasRole(['JEFATURA', 'SUBROGANTE']);
};

/**
 * Verifica si el usuario es médico
 * @returns {boolean}
 */
export const isMedico = () => {
    return hasRole('MEDICO');
};

export default {
    login,
    logout,
    isAuthenticated,
    getCurrentUser,
    getCurrentToken,
    hasRole,
    isJefatura,
    isMedico
};
