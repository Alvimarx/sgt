/**
 * tokenManager.js
 * Gestión centralizada de tokens JWT en el frontend
 */

const TOKEN_KEY = 'jwt_token';
const USER_DATA_KEY = 'user_data';

/**
 * Guarda el token JWT en localStorage
 */
export const saveToken = (token) => {
    if (token) {
        localStorage.setItem(TOKEN_KEY, token);
    }
};

/**
 * Obtiene el token JWT desde localStorage
 */
export const getToken = () => {
    return localStorage.getItem(TOKEN_KEY);
};

/**
 * Elimina el token JWT de localStorage
 */
export const removeToken = () => {
    localStorage.removeItem(TOKEN_KEY);
};

/**
 * Guarda los datos del usuario en localStorage
 */
export const saveUserData = (userData) => {
    if (userData) {
        localStorage.setItem(USER_DATA_KEY, JSON.stringify(userData));
    }
};

/**
 * Obtiene los datos del usuario desde localStorage
 */
export const getUserData = () => {
    const data = localStorage.getItem(USER_DATA_KEY);
    return data ? JSON.parse(data) : null;
};

/**
 * Elimina los datos del usuario de localStorage
 */
export const removeUserData = () => {
    localStorage.removeItem(USER_DATA_KEY);
};

/**
 * Decodifica un token JWT (sin validar firma)
 * Solo para leer el payload en el cliente
 */
export const decodeToken = (token) => {
    if (!token) return null;
    
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
            atob(base64)
                .split('')
                .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                .join('')
        );
        return JSON.parse(jsonPayload);
    } catch (error) {
        console.error('Error decoding token:', error);
        return null;
    }
};

/**
 * Verifica si el token ha expirado
 */
export const isTokenExpired = (token) => {
    const decoded = decodeToken(token);
    if (!decoded || !decoded.exp) return true;
    
    const expirationTime = decoded.exp * 1000; // Convertir a milisegundos
    return Date.now() >= expirationTime;
};

/**
 * Verifica si hay un token válido
 */
export const isTokenValid = () => {
    const token = getToken();
    if (!token) return false;
    return !isTokenExpired(token);
};

/**
 * Limpia toda la información de autenticación
 */
export const clearAuth = () => {
    removeToken();
    removeUserData();
    // Limpiar también las claves legacy por si acaso
    localStorage.removeItem('auth');
    localStorage.removeItem('userId');
    localStorage.removeItem('servicioId');
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    localStorage.removeItem('userRole');
};

/**
 * Obtiene el userId del token o de userData
 */
export const getUserId = () => {
    const userData = getUserData();
    return userData?.userId || null;
};

/**
 * Obtiene el servicioId del token o de userData
 */
export const getServicioId = () => {
    const userData = getUserData();
    return userData?.servicioId || null;
};

/**
 * Obtiene el rol del token o de userData
 */
export const getUserRole = () => {
    const userData = getUserData();
    return userData?.rol || null;
};
