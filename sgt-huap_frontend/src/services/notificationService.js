/**
 * notificationService.js
 * Servicio de notificaciones del usuario: consulta, conteo de no leídas, marcado como
 * leída y eliminación. Normaliza la forma de las notificaciones que devuelve la API a un
 * modelo estable para la UI.
 */
import axiosInstance from '../utils/axiosConfig';
import { getUserId as getUserIdFromToken } from '../utils/tokenManager';

/** Obtiene el ID del funcionario autenticado (del token o del storage). @returns {number|string|null} */
const getUserId = () => getUserIdFromToken() || localStorage.getItem('userId');

/**
 * Normaliza una notificación cruda de la API a la forma que consume la UI.
 * @param {Object} notificacion - Notificación tal como llega del backend.
 * @returns {Object|null} Notificación normalizada, o null si la entrada es vacía.
 */
const normalizeNotification = (notificacion) => {
    if (!notificacion) return null;

    const estado = notificacion.estado ?? null;
    const leido = notificacion.leido === true || String(estado).toUpperCase() === 'LEIDO';
    const eliminado = notificacion.eliminado === true || String(estado).toUpperCase() === 'ELIMINADO';
    const fechaRaw = notificacion.fechaEnvio || null;
    const fecha = fechaRaw ? new Date(fechaRaw) : null;

    return {
        id: notificacion.idNotificacion ?? null,
        mensaje: notificacion.mensaje ?? '',
        texto: notificacion.texto ?? notificacion.mensaje ?? '',
        estado,
        leido,
        isRead: leido,
        eliminado,
        fechaEnvio: fechaRaw,
        fechaLabel: fecha && !Number.isNaN(fecha.getTime())
            ? fecha.toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short' })
            : null,
        raw: notificacion,
    };
};

/**
 * Normaliza una lista de notificaciones.
 * @param {Array<Object>} items
 * @returns {Array<Object>} Lista normalizada (vacía si la entrada no es un array).
 */
const normalizeNotificationList = (items) => {
    if (!Array.isArray(items)) return [];
    return items.map(normalizeNotification).filter(Boolean);
};

/**
 * Obtiene las notificaciones de un funcionario.
 * @async
 * @param {number|null} [funcionarioId] - ID del funcionario; si se omite, se usa el autenticado.
 * @returns {Promise<{success: boolean, data?: Array<Object>, error?: string}>}
 */
export const getNotificacionesUsuario = async (funcionarioId = null) => {
    try {
        const id = Number(funcionarioId || getUserId());
        if (!id) throw new Error('No se encontró el id del funcionario');

        const response = await axiosInstance.get(`/notificaciones/usuario/${id}`);

        return {
            success: true,
            data: normalizeNotificationList(response.data),
        };
    } catch (error) {
        const mensaje = error.response?.data?.error || 'No se pudieron cargar las notificaciones. Intenta de nuevo.';
        return { success: false, error: mensaje };
    }
};

/**
 * Obtiene el número de notificaciones sin leer de un funcionario.
 * @async
 * @param {number|null} [funcionarioId] - ID del funcionario; si se omite, se usa el autenticado.
 * @returns {Promise<{success: boolean, data?: number, error?: string}>}
 */
export const getNotificacionesSinLeer = async (funcionarioId = null) => {
    try {
        const id = Number(funcionarioId || getUserId());
        if (!id) throw new Error('No se encontró el id del funcionario');

        const response = await axiosInstance.get(`/notificaciones/sin-leer/${id}`);

        return {
            success: true,
            data: Number(response.data ?? 0),
        };
    } catch (error) {
        const mensaje = error.response?.data?.error || 'No se pudo obtener el número de notificaciones no leídas.';
        return { success: false, error: mensaje };
    }
};

/**
 * Marca una notificación como leída.
 * @async
 * @param {number} notificacionId
 * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
 */
export const marcarNotificacionLeida = async (notificacionId) => {
    try {
        if (!notificacionId) throw new Error('notificacionId es requerido');

        const response = await axiosInstance.put(`/notificaciones/${notificacionId}/leer`);

        return { success: true, data: response.data ?? null };
    } catch (error) {
        const mensaje = error.response?.data?.error || 'No se pudo marcar la notificación como leída.';
        return { success: false, error: mensaje };
    }
};

/**
 * Elimina una notificación.
 * @async
 * @param {number} notificacionId
 * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
 */
export const eliminarNotificacion = async (notificacionId) => {
    try {
        if (!notificacionId) throw new Error('notificacionId es requerido');

        const response = await axiosInstance.delete(`/notificaciones/${notificacionId}`);

        return { success: true, data: response.data ?? null };
    } catch (error) {
        const mensaje = error.response?.data?.error || 'No se pudo eliminar la notificación.';
        return { success: false, error: mensaje };
    }
};

export default {
    getNotificacionesUsuario,
    getNotificacionesSinLeer,
    marcarNotificacionLeida,
    eliminarNotificacion,
};