// adminService.js
// Servicio centralizado para todas las peticiones de administración
// Todas las peticiones dependen de servicioId para filtrar por servicio

import axiosInstance from '../utils/axiosConfig';
import { getServicioId as getServicioIdFromToken, getUserId as getUserIdFromToken, getToken } from '../utils/tokenManager';

// Base completa tomada desde la variable de entorno (ej. http://localhost:8080/api/v1)
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

// Para llamadas con axiosInstance (ya configurado con baseURL=VITE_API_BASE_URL) usamos rutas relativas
// Para llamadas que usan fetch() conservamos la URL completa usando API_BASE_URL

/**
 * Helper: fetch() con Authorization header si existe token
 * Esto permite mantener llamadas legacy que usan fetch sin reescribirlas todas a axios.
 */
const fetchWithAuth = async (url, options = {}) => {
    const token = getToken();
    const headers = options.headers ? { ...options.headers } : {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const resp = await fetch(url, { ...options, headers });
    return resp;
};

/**
 * Obtiene el servicioId del token JWT o localStorage (fallback)
 */
const getServicioId = () => {
    return getServicioIdFromToken() || localStorage.getItem('servicioId');
};

/**
 * Obtiene el userId del token JWT o localStorage (fallback)
 */
const getUserId = () => {
    return getUserIdFromToken() || localStorage.getItem('userId');
};

/**
 * USUARIOS
 */
export const usuariosService = {
    // Obtener todos los usuarios del servicio
    getAll: async (servicioId = null) => {
        const sId = servicioId || getServicioId();
        const url = `/usuarios${sId ? `?servicioId=${sId}` : ''}`;
        const response = await axiosInstance.get(url);
        return response.data;
    },

    // Obtener un usuario por ID
    getById: async (id) => {
        const response = await axiosInstance.get(`/usuarios/${id}`);
        return response.data;
    },

    // Crear nuevo usuario
    create: async (userData) => {
        // Creación de usuarios deshabilitada en frontend. Lanzar error claro.
        throw new Error('Creación de usuarios deshabilitada');
    },

    // Actualizar usuario
    update: async (id, userData) => {
        // Normalizar el payload para el backend
        const payload = {
            nombre: userData.primerNombre || userData.nombre,
            apellidoPaterno: userData.primerApellido || userData.apellidoPaterno,
            apellidoMaterno: userData.segundoApellido || userData.apellidoMaterno,
            rut: userData.rut,
            email: userData.email,
            telefono: userData.telefono,
            estado: userData.estado,
            horasAsignadas: userData.horasAsignadas,
            tipoTurno: userData.tipoTurno || userData.tipoDeTurnoFijoOReemplazo,
            diaDeTurno: userData.diaDeTurno || userData.turnoFijo?.day,
            rol: mapRolToBackend(userData.rol)
        };

        const response = await axiosInstance.put(`/usuarios/${id}`, payload);
        return response.data;
    },

    // Eliminar usuario (marcar como inactivo)
    delete: async (id) => {
        // En lugar de eliminar, marcamos como inactivo
        return usuariosService.update(id, { estado: 'inactivo' });
    },

    // Obtener disponibilidad por servicio (activos/inactivos)
    getDisponibilidad: async (servicioId = null) => {
        const sId = servicioId || getServicioId();
        if (!sId) throw new Error('servicioId es requerido');
        const response = await axiosInstance.get(`/usuarios/servicio/${sId}/disponibilidad`);
        return response.data;
    },

    // Obtener estadísticas de horas por servicio
    getHorasStats: async (servicioId = null, page = 0, size = 10) => {
        const sId = servicioId || getServicioId();
        if (!sId) throw new Error('servicioId es requerido');
        const response = await axiosInstance.get(`/usuarios/servicio/${sId}/stats/horas?page=${page}&size=${size}`);
        return response.data;
    }
};

/**
 * Mapea el rol del frontend al formato del backend
 */
function mapRolToBackend(rol) {
    if (!rol) return 'MEDICO';
    const rolStr = String(rol).toLowerCase();
    if (rolStr.includes('jefatura subrogante') || rolStr.includes('subrogante')) return 'SUBROGANTE';
    if (rolStr.includes('jefatura')) return 'JEFATURA';
    return 'MEDICO';
}

/**
 * TURNOS
 */
export const turnosService = {
    // Crear turno
    create: async (turnoData) => {
        const response = await axiosInstance.post(`/turnos`, turnoData);
        return response.data;
    },

    // Obtener todos los turnos del servicio
    getByServicio: async (servicioId = null) => {
        const sId = servicioId || getServicioId();
        if (!sId) throw new Error('servicioId es requerido');
        const response = await axiosInstance.get(`/turnos/servicio/${sId}`);
        return response.data;
    },

    // Obtener turnos del servicio para un día específico
    getByServicioAndDia: async (servicioId = null, fecha) => {
        const sId = servicioId || getServicioId();
        if (!sId) throw new Error('servicioId es requerido');
        if (!fecha) throw new Error('fecha es requerida');
        const response = await axiosInstance.get(`/turnos/servicio/${sId}/dia/${fecha}`);
        return response.data;
    },

    // Obtener estadísticas de turnos por servicio
    getStats: async (servicioId = null) => {
        const sId = servicioId || getServicioId();
        if (!sId) throw new Error('servicioId es requerido');
        const response = await axiosInstance.get(`/turnos/servicio/${sId}/stats`);
        return response.data;
    },

    // Obtener cobertura de turnos para el calendario
    getCobertura: async (servicioId = null, fechaInicio = null, fechaFin = null) => {
        const sId = servicioId || getServicioId();
        if (!sId) throw new Error('servicioId es requerido');

        let url = `/turnos/servicio/${sId}/cobertura`;
        const params = [];
        if (fechaInicio) params.push(`fechaInicio=${fechaInicio}`);
        if (fechaFin) params.push(`fechaFin=${fechaFin}`);
        if (params.length > 0) url += `?${params.join('&')}`;

        const response = await axiosInstance.get(url);
        return response.data;
    },

    // Obtener porcentaje de cobertura por piso para el mes anterior
    getCoveragePerPisoPreviousMonth: async (servicioId = null) => {
        const sId = servicioId || getServicioId();
        if (!sId) throw new Error('servicioId es requerido');
        const response = await axiosInstance.get(`/turnos/servicio/${sId}/stats/piso/mes-anterior`);
        return response.data;
    },

    // Alias para compatibilidad con código que usa el nombre antiguo
    getCoveragePerPisoLastMonth: async (servicioId = null) => {
        const sId = servicioId || getServicioId();
        if (!sId) throw new Error('servicioId es requerido');
        const response = await axiosInstance.get(`/turnos/servicio/${sId}/stats/piso/mes-anterior`);
        return response.data;
    },

    // Obtener porcentaje de cobertura por piso para el mes actual
    getCoveragePerPisoCurrentMonth: async (servicioId = null) => {
        const sId = servicioId || getServicioId();
        if (!sId) throw new Error('servicioId es requerido');
        const response = await axiosInstance.get(`/turnos/servicio/${sId}/stats/piso/mes-actual`);
        return response.data;
    },

    // Obtener porcentaje de cobertura por piso para un mes específico
    getCoveragePerPisoByMonth: async (servicioId = null, year, month) => {
        const sId = servicioId || getServicioId();
        if (!sId) throw new Error('servicioId es requerido');
        if (!year || !month) throw new Error('year y month son requeridos');
        const response = await axiosInstance.get(`/turnos/servicio/${sId}/stats/piso/mes?year=${year}&month=${month}`);
        return response.data;
    },

    // Obtener turnos por médico
    getByMedico: async (medicoId, year = null, month = null) => {
        if (!medicoId) throw new Error('medicoId es requerido');
        let url = `/turnos/medico/${medicoId}`;
        const params = [];
        if (year) params.push(`year=${year}`);
        if (month) params.push(`month=${month}`);
        if (params.length > 0) url += `?${params.join('&')}`;
        const response = await axiosInstance.get(url);
        return response.data;
    },

    // Obtener turnos futuros de un médico
    getFuturos: async (medicoId) => {
        if (!medicoId) throw new Error('medicoId es requerido');
        const response = await axiosInstance.get(`/turnos/medico/${medicoId}/futuros`);
        return response.data;
    },

    // Alterar un turno (desasignar, reasignar, cambiar horas)
    alterar: async (alterarRequest) => {
        const response = await axiosInstance.post(`/turnos/alterar`, alterarRequest);
        return response.data;
    },

    // Obtener turnos sin asignar para un día específico
    getSinAsignarByDia: async (servicioId = null, fecha) => {
        const sId = servicioId || getServicioId();
        if (!sId) throw new Error('servicioId es requerido');
        if (!fecha) throw new Error('fecha es requerida');
        const response = await axiosInstance.get(`/turnos/servicio/${sId}/dia/${fecha}/sin-asignar`);
        return response.data;
    }
};

/**
 * SOLICITUDES
 */
export const solicitudesService = {
    // Obtener todas las solicitudes del servicio
    getByServicio: async (servicioId = null) => {
        const sId = servicioId || getServicioId();
        if (!sId) throw new Error('servicioId es requerido');
        const response = await axiosInstance.get(`/usuarios/servicio/${sId}/solicitudes`);
        return response.data;
    },

    // Obtener todas las solicitudes globales
    getAll: async () => {
        const response = await axiosInstance.get(`/solicitudes/todas`);
        return response.data;
    },

    // Obtener solicitudes por médico
    getByMedico: async (medicoId) => {
        const response = await axiosInstance.get(`/solicitudes/usuario/${medicoId}`);
        return response.data;
    },

    // Obtener solicitudes filtradas por estado
    getByEstado: async (filtro, medicoId = null) => {
        let url;
        if (medicoId) {
            url = `/solicitudes/usuario/${filtro}/${medicoId}`;
        } else {
            url = `/solicitudes/todas/${filtro}`;
        }
        const response = await axiosInstance.get(url);
        return response.data;
    },

    // Crear solicitud de cobertura
    createCobertura: async (medicoId, solicitudData) => {
        const response = await fetchWithAuth(`${API_BASE_URL}/solicitudes/cobertura/${medicoId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(solicitudData)
        });
        if (!response.ok) throw new Error('Error al crear solicitud de cobertura');
        return response.json();
    },

    // Crear solicitud de permiso
    createPermiso: async (medicoId, solicitudData) => {
        const response = await fetchWithAuth(`${API_BASE_URL}/solicitudes/permiso/${medicoId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(solicitudData)
        });
        if (!response.ok) throw new Error('Error al crear solicitud de permiso');
        return response.json();
    },

    // Crear solicitud de intercambio
    createIntercambio: async (medicoId, solicitudData) => {
        const response = await fetchWithAuth(`${API_BASE_URL}/solicitudes/intercambio/${medicoId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(solicitudData)
        });
        if (!response.ok) throw new Error('Error al crear solicitud de intercambio');
        return response.json();
    },

    // Crear solicitud de oferta
    createOferta: async (medicoId, solicitudData) => {
        const response = await fetchWithAuth(`${API_BASE_URL}/solicitudes/oferta/${medicoId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(solicitudData)
        });
        if (!response.ok) throw new Error('Error al crear solicitud de oferta');
        return response.json();
    },

    // Actualizar estado de solicitud (aprobar/rechazar)
    updateEstado: async (solicitudId, nuevoEstado) => {
        const response = await axiosInstance.put(`/solicitudes/${solicitudId}/estado`, { estado: nuevoEstado });
        const data = response.data;
        // Emitir evento global para que componentes interesados (ej. CalendarView) recarguen datos en tiempo real
        try {
            if (typeof window !== 'undefined' && window.dispatchEvent) {
                window.dispatchEvent(new CustomEvent('solicitud:updated', { detail: { id: solicitudId, estado: nuevoEstado, response: data } }));
            }
        } catch (e) {
            console.warn('adminService: no se pudo emitir evento solicitud:updated', e)
        }
        return data;
    },

    // Eliminar solicitud
    delete: async (solicitudId) => {
        const response = await fetchWithAuth(`${API_BASE_URL}/solicitudes/${solicitudId}`, {
            method: 'DELETE'
        });
        if (!response.ok) throw new Error('Error al eliminar solicitud');
        return response.text();
    },

    // Obtener conteos de solicitudes por fecha (para calendario)
    getFechas: async (servicioId = null) => {
        const sId = servicioId || getServicioId();
        if (!sId) throw new Error('servicioId es requerido');
        const response = await fetchWithAuth(`${API_BASE_URL}/usuarios/servicio/${sId}/solicitudes/fechas`);
        if (!response.ok) throw new Error('Error al obtener fechas de solicitudes');
        return response.json();
    }
};

/**
 * NOTIFICACIONES
 */
export const notificacionesService = {
    // Obtener todas las notificaciones
    getAll: async () => {
        const response = await fetchWithAuth(`${API_BASE_URL}/notificacion`);
        if (!response.ok) throw new Error('Error al obtener notificaciones');
        return response.json();
    },

    // Obtener notificaciones por usuario
    getByUsuario: async (usuarioId = null) => {
        const uId = usuarioId || getUserId();
        if (!uId) throw new Error('usuarioId es requerido');
        const response = await fetchWithAuth(`${API_BASE_URL}/notificacion/usuario/${uId}`);
        if (!response.ok) throw new Error('Error al obtener notificaciones del usuario');
        return response.json();
    },

    // Obtener notificaciones no leídas
    getNoLeidas: async (usuarioId = null) => {
        const uId = usuarioId || getUserId();
        if (!uId) throw new Error('usuarioId es requerido');
        const response = await fetchWithAuth(`${API_BASE_URL}/notificacion/no-leidas/${uId}`);
        if (!response.ok) throw new Error('Error al obtener notificaciones no leídas');
        return response.json();
    },

    // Marcar notificación como leída
    marcarLeida: async (notificacionId) => {
        const response = await fetchWithAuth(`${API_BASE_URL}/notificacion/leido/${notificacionId}`, {
            method: 'PUT'
        });
        if (!response.ok) throw new Error('Error al marcar notificación como leída');
        return response;
    },

    // Eliminar notificación
    eliminar: async (notificacionId) => {
        const response = await fetchWithAuth(`${API_BASE_URL}/notificacion/eliminado/${notificacionId}`, {
            method: 'PUT'
        });
        if (!response.ok) throw new Error('Error al eliminar notificación');
        return response;
    }
};

/**
 * PISOS
 */
export const pisosService = {
    // Obtener todos los pisos
    getAll: async (servicioId = null) => {
        const sId = servicioId || getServicioId();
        const url = `/pisos${sId ? `?servicioId=${sId}` : ''}`;
        const response = await axiosInstance.get(url);
        return response.data;
    },

    // Obtener piso por ID
    getById: async (id) => {
        const response = await axiosInstance.get(`/pisos/${id}`);
        return response.data;
    },

    // Obtener pisos por servicio
    getByServicio: async (servicioId = null) => {
        const sId = servicioId || getServicioId();
        if (!sId) throw new Error('servicioId es requerido');
        const response = await axiosInstance.get(`/pisos/servicio/${sId}`);
        return response.data;
    },

    // Crear piso
    create: async (pisoData) => {
        const response = await axiosInstance.post('/pisos', pisoData);
        return response.data;
    },

    // Actualizar piso
    update: async (id, pisoData) => {
        const response = await axiosInstance.put(`/pisos/${id}`, pisoData);
        return response.data;
    },

    // Eliminar piso
    delete: async (id) => {
        const response = await axiosInstance.delete(`/pisos/${id}`);
        return response.data;
    }
};

/**
 * EVENTOS / BITÁCORA
 */
export const eventosService = {
    // Obtener todos los eventos
    getAll: async () => {
        const response = await axiosInstance.get('/evento');
        return response.data;
    },

    // Filtrar por tipo de evento
    getByTipo: async (tipo) => {
        const response = await axiosInstance.get(`/evento/tipo/${encodeURIComponent(tipo)}`);
        return response.data;
    },

    // Filtrar por usuario (idPersonal)
    getByUsuario: async (usuarioId) => {
        const response = await axiosInstance.get(`/evento/usuario/${usuarioId}`);
        return response.data;
    },

    // Filtrar por turno
    getByTurno: async (turnoId) => {
        const response = await axiosInstance.get(`/evento/turno/${turnoId}`);
        return response.data;
    },

    // Filtrar por solicitud
    getBySolicitud: async (solicitudId) => {
        const response = await axiosInstance.get(`/evento/solicitud/${solicitudId}`);
        return response.data;
    }
};

/**
 * FUNCIÓN HELPER: Normalizar solicitud del backend a formato UI
 */
export const normalizeSolicitud = (s) => {
    if (!s) return null;

    const solicitante = s.medicoSolicitante ? {
        id_medico: s.medicoSolicitante.id || s.medicoSolicitante.idPersonal,
        nombre: ((s.medicoSolicitante.nombre || s.medicoSolicitante.primerNombre || '') + ' ' +
            (s.medicoSolicitante.apellidoPaterno || s.medicoSolicitante.primerApellido || '')).trim(),
        email: s.medicoSolicitante.email
    } : null;

    const receptor = s.medicoReceptor ? {
        id_medico: s.medicoReceptor.id || s.medicoReceptor.idPersonal,
        nombre: ((s.medicoReceptor.nombre || s.medicoReceptor.primerNombre || '') + ' ' +
            (s.medicoReceptor.apellidoPaterno || s.medicoReceptor.primerApellido || '')).trim(),
        email: s.medicoReceptor.email
    } : null;

    const turno = s.turno || null;

    // Determinar la fecha objetivo (fecha del turno o fecha de inicio del permiso)
    // Para solicitudes de intercambio/oferta podemos recibir objetos separados: turnoPropio / turnoDeseado
    const turnoPropio = s.turnoPropio || s.turno_propio || s.turno_origen || s.turnoOrigen || null;
    const turnoDeseado = s.turnoDeseado || s.turno_deseado || s.turno_destino || s.turnoDestino || null;

    // Preferir la fecha del turno propio (día que se ofrece) para mostrar la solicitud en el calendario
    const fechaFromPropio = turnoPropio ? (turnoPropio.diaInicioTurno || turnoPropio.diaInicio || turnoPropio.fecha || null) : null;
    const fechaFromTurno = turno ? (turno.diaInicioTurno || turno.diaInicio || turno.fecha || null) : null;
    const fechaObjetivo = s.fechaInicioPermiso || fechaFromPropio || fechaFromTurno || null;

    // Helper para mapear un objeto turno del backend al formato UI esperado
    const mapTurno = (t) => {
        if (!t) return null;
        return {
            id_turno: t.id || t.idTurno || t.id_turno || null,
            seccion: t.idPiso || t.piso || t.seccion || t.id_piso || null,
            fecha: t.diaInicioTurno || t.diaInicio || t.fecha || null,
            hora_inicio: t.horaInicio || t.hora_inicio || t.hora || null,
            hora_fin: t.horaFin || t.hora_fin || null,
            tipoTurno: t.tipoTurno || t.tipo_turno || t.turno || null
        };
    };

    // Preferir mapeo específico para intercambios/ofertas
    const turno_origen = mapTurno(turnoPropio || turno);
    const turno_destino = mapTurno(turnoDeseado || (turnoPropio ? turno : null));

    return {
        id: s.id,
        tipo: s.tipo || 'Solicitud',
        solicitante,
        receptor,
        estado: s.estado || 'Pendiente',
        fecha_solicitud: s.fechaCreacion ? new Date(s.fechaCreacion).getTime() : null,
        fecha: fechaObjetivo,
        fecha_objetivo: fechaObjetivo,
        date: fechaObjetivo,
        turno_origen,
        turno_destino,
        motivo: s.motivo || '',
        tipoAutorizacion: s.tipoAutorizacion || null,
        fechaInicioPermiso: s.fechaInicioPermiso || null,
        fechaTerminoPermiso: s.fechaTerminoPermiso || null
    };
};

/**
 * FERIADOS
 * Servicio para gestionar feriados usando la API de Boostr
 */
export const holidaysService = {
    // Verificar si una fecha específica es feriado
    checkHoliday: async (year, month, day) => {
        const response = await axiosInstance.get(`/holidays/check/${year}/${month}/${day}`);
        return response.data;
    },

    // Obtener todos los feriados cacheados
    getAll: async () => {
        const response = await axiosInstance.get('/holidays/all');
        return response.data;
    },

    // Obtener feriados por año
    getByYear: async (year) => {
        const response = await axiosInstance.get(`/holidays/year/${year}`);
        return response.data;
    },

    // Forzar recarga de feriados desde la API
    refresh: async () => {
        const response = await axiosInstance.post('/holidays/refresh');
        return response.data;
    },

    // Obtener estadísticas de feriados
    getStats: async () => {
        const response = await axiosInstance.get('/holidays/stats');
        return response.data;
    }
};

/**
 * SERVICIOS
 */
export const serviciosService = {
    // Limpiar (resetear) un servicio: borra todos los datos asociados excepto usuarios
    limpiar: async (id) => {
        const response = await axiosInstance.delete(`/servicios/${id}/limpiar`);
        return response.data;
    }
};

export default {
    usuarios: usuariosService,
    servicios: serviciosService,
    turnos: turnosService,
    solicitudes: solicitudesService,
    notificaciones: notificacionesService,
    pisos: pisosService,
    holidays: holidaysService,
    normalizeSolicitud
};
