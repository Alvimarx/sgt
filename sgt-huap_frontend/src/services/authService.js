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
    getUserData,
    decodeToken
} from '../utils/tokenManager';

/**
 * Paso 1 del login: valida credenciales y retorna el preAuthToken + servicios disponibles.
 * NO guarda nada en storage — el token definitivo se obtiene en selectService().
 * @param {string} rut
 * @param {string} password
 * @returns {Promise<{ success, preAuthToken, servicios }>}
 *   servicios: Array<{ servicioId, nombre, rol }>
 */
export const login = async (rut, password) => {
    try {
        const response = await axiosInstance.post('/funcionarios/login', { rut, password });
        const { preAuthToken, servicios } = response.data;

        return { success: true, preAuthToken, servicios };
    } catch (error) {
        const mensaje = error.response?.data?.error || error.message || 'Error al iniciar sesión';
        return { success: false, error: mensaje };
    }
};

/**
 * Paso 2 del login: el usuario elige un servicio y se obtiene el JWT definitivo.
 * Guarda el token y los datos del usuario en storage.
 * @param {string} preAuthToken - Token de pre-autorización del paso 1
 * @param {number} servicioId   - ID del servicio elegido por el usuario
 * @returns {Promise<{ success, userData }>}
 */
export const selectService = async (preAuthToken, servicioId) => {
    try {
        const response = await axiosInstance.post('/funcionarios/login/select-service', {
            preAuthToken,
            servicioId
        });

        const { token, servicioActivo, rolActivo, perfil } = response.data;

        saveToken(token);

        // 💡 Convertimos a String para evitar fallos de tipo (===) y usamos el fallback si no existe la lista
        const servicioEncontrado = perfil.servicios?.find(
            s => Number(s.idServicio) === Number(servicioActivo)
        );

        const userData = {
            userId: perfil.idFuncionario,
            servicioId: servicioActivo,
            rol: rolActivo,
            rolSistema: decodeToken(token)?.rolSistema ?? 'USUARIO',
            nombre: perfil.nombre || 'Usuario',
            apellidoPaterno: perfil.apellidoPaterno || '',
            apellidoMaterno: perfil.apellidoMaterno || '',
            nombreCompleto: `${perfil.nombre || ''} ${perfil.apellidoPaterno || ''} ${perfil.apellidoMaterno || ''}`.trim(),
            rut: perfil.rut,
            rutCompleto: perfil.rutCompleto,
            servicios: perfil.servicios || [],
            servicioNombre: servicioEncontrado ? servicioEncontrado.nombreServicio : 'Servicio Asignado'
        };

        console.log("🚨 DATA DESDE AUTH SERVICE:", userData);

        saveUserData(userData);

        return { success: true, userData };
    } catch (error) {
        const mensaje = error.response?.data?.error || error.message || 'Error al seleccionar servicio';
        return { success: false, error: mensaje };
    }
};

/**
 * Cambia el servicio activo de un usuario ya autenticado.
 * Reemplaza el JWT actual por uno nuevo con el servicio elegido.
 * Requiere que el usuario ya tenga un JWT válido (se envía automáticamente vía axiosConfig).
 * @param {number} servicioId
 * @returns {Promise<{ success, userData }>}
 */
export const switchService = async (servicioId) => {
    try {
        const response = await axiosInstance.post('/funcionarios/switch-service', { servicioId });

        const { token, servicioActivo, rolActivo, perfil } = response.data;

        saveToken(token);

        const servicioEncontrado = perfil.servicios?.find(
            s => Number(s.idServicio) === Number(servicioActivo)
        );

        const userData = {
            userId: perfil.idFuncionario,
            servicioId: servicioActivo,
            rol: rolActivo,
            rolSistema: decodeToken(token)?.rolSistema ?? 'USUARIO',
            nombre: perfil.nombre || 'Usuario',
            apellidoPaterno: perfil.apellidoPaterno || '',
            apellidoMaterno: perfil.apellidoMaterno || '',
            nombreCompleto: `${perfil.nombre || ''} ${perfil.apellidoPaterno || ''} ${perfil.apellidoMaterno || ''}`.trim(),
            rut: perfil.rut,
            rutCompleto: perfil.rutCompleto,
            servicios: perfil.servicios || [],
            servicioNombre: servicioEncontrado ? servicioEncontrado.nombreServicio : 'Servicio Asignado'
        };

        saveUserData(userData);

        return { success: true, userData };
    } catch (error) {
        const mensaje = error.response?.data?.error || error.message || 'Error al cambiar de servicio';
        return { success: false, error: mensaje };
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
    selectService,
    switchService,
    logout,
    isAuthenticated,
    getCurrentUser,
    getCurrentToken,
    hasRole,
    isJefatura,
    isMedico
};
