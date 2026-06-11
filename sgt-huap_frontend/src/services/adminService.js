// adminService.js
// Servicio centralizado para todas las peticiones de administración

import axiosInstance from '../utils/axiosConfig';
import { getServicioId as getServicioIdFromToken, getUserId as getUserIdFromToken } from '../utils/tokenManager';

const getServicioId = () => getServicioIdFromToken() || localStorage.getItem('servicioId');
const getUserId    = () => getUserIdFromToken()    || localStorage.getItem('userId');

// ─────────────────────────────────────────────────────────────────────────────
// FUNCIONARIOS  →  /api/v2/funcionarios
// ─────────────────────────────────────────────────────────────────────────────
export const usuariosService = {

    // GET /funcionarios/summary?servicioId=
    getAll: async (servicioId = null) => {
        const sId = servicioId || getServicioId();
        const url = `/funcionarios/summary${sId ? `?servicioId=${sId}` : ''}`;
        const response = await axiosInstance.get(url);
        return response.data;
    },

    // GET /funcionarios/{id}/summary
    getById: async (id) => {
        const response = await axiosInstance.get(`/funcionarios/${id}/summary`);
        return response.data;
    },

    // PUT /funcionarios/{id}
    update: async (id, userData) => {
        const payload = {
            nombre:           userData.primerNombre    || userData.nombre,
            apellidoPaterno:  userData.primerApellido  || userData.apellidoPaterno,
            apellidoMaterno:  userData.segundoApellido || userData.apellidoMaterno,
            rut:              userData.rut,
            email:            userData.email,
            telefono:         userData.telefono,
            estado:           userData.estado,
            horasAsignadas:   userData.horasAsignadas,
            tipoTurno:        userData.tipoTurno || userData.tipoDeTurnoFijoOReemplazo,
            diaDeTurno:       userData.diaDeTurno || userData.turnoFijo?.day,
            rol:              mapRolToBackend(userData.rol)
        };
        const response = await axiosInstance.put(`/funcionarios/${id}`, payload);
        return response.data;
    },

    // Marcar como inactivo vía PUT /funcionarios/{id}
    delete: async (id) => {
        return usuariosService.update(id, { estado: 'inactivo' });
    },

    // GET /funcionarios/disponibilidad/{servicioId}
    getDisponibilidad: async (servicioId = null) => {
        const sId = servicioId || getServicioId();
        if (!sId) throw new Error('servicioId es requerido');
        const response = await axiosInstance.get(`/funcionarios/disponibilidad/${sId}`);
        return response.data;
    }
    // getHorasStats eliminado — sin equivalente en el backend v2
};

function mapRolToBackend(rol) {
    if (!rol) return 'MEDICO';
    const r = String(rol).toLowerCase();
    if (r.includes('subrogante')) return 'SUBROGANTE';
    if (r.includes('jefatura'))   return 'JEFATURA';
    return 'MEDICO';
}

// ─────────────────────────────────────────────────────────────────────────────
// TURNOS  →  /api/v2/turnos  |  /api/v2/gestion-turnos
// ─────────────────────────────────────────────────────────────────────────────
export const turnosService = {

    // POST /turnos
    create: async (turnoData) => {
        const response = await axiosInstance.post('/turnos', turnoData);
        return response.data;
    },

    // GET /turnos/servicio/{id}
    getByServicio: async (servicioId = null) => {
        const sId = servicioId || getServicioId();
        if (!sId) throw new Error('servicioId es requerido');
        const response = await axiosInstance.get(`/turnos/servicio/${sId}`);
        return response.data;
    },

    // GET /turnos/servicio/{id}/calendario/{year}/{month}
    getCalendario: async (servicioId = null, year, month) => {
        const sId = servicioId || getServicioId();
        if (!sId) throw new Error('servicioId es requerido');
        const response = await axiosInstance.get(`/turnos/servicio/${sId}/calendario/${year}/${month}`);
        return response.data;
    },

    // GET /turnos/servicio/{id}/dia/{fecha}
    getByServicioAndDia: async (servicioId = null, fecha) => {
        const sId = servicioId || getServicioId();
        if (!sId) throw new Error('servicioId es requerido');
        if (!fecha) throw new Error('fecha es requerida');
        const response = await axiosInstance.get(`/turnos/servicio/${sId}/dia/${fecha}`);
        return response.data;
    },

    // GET /turnos/servicio/{id}/dia/{fecha}/sin-asignar
    getSinAsignarByDia: async (servicioId = null, fecha) => {
        const sId = servicioId || getServicioId();
        if (!sId) throw new Error('servicioId es requerido');
        if (!fecha) throw new Error('fecha es requerida');
        const response = await axiosInstance.get(`/turnos/servicio/${sId}/dia/${fecha}/sin-asignar`);
        return response.data;
    },

    // GET /turnos/servicio/{id}/sin-asignar
    getSinAsignar: async (servicioId = null) => {
        const sId = servicioId || getServicioId();
        if (!sId) throw new Error('servicioId es requerido');
        const response = await axiosInstance.get(`/turnos/servicio/${sId}/sin-asignar`);
        return response.data;
    },

    // GET /turnos/servicio/{id}/sin-asignar/periodo?fechaInicio=&fechaFin=
    getSinAsignarPorPeriodo: async (servicioId = null, fechaInicio = null, fechaFin = null) => {
        const sId = servicioId || getServicioId();
        if (!sId) throw new Error('servicioId es requerido');
        const params = [];
        if (fechaInicio) params.push(`fechaInicio=${fechaInicio}`);
        if (fechaFin)    params.push(`fechaFin=${fechaFin}`);
        const qs = params.length ? `?${params.join('&')}` : '';
        const response = await axiosInstance.get(`/turnos/servicio/${sId}/sin-asignar/periodo${qs}`);
        return response.data;
    },

    // GET /turnos/servicio/{id}/stats?fechaInicio=&fechaFin=
    getStats: async (servicioId = null, fechaInicio = null, fechaFin = null) => {
        const sId = servicioId || getServicioId();
        if (!sId) throw new Error('servicioId es requerido');
        const params = [];
        if (fechaInicio) params.push(`fechaInicio=${fechaInicio}`);
        if (fechaFin)    params.push(`fechaFin=${fechaFin}`);
        const qs = params.length ? `?${params.join('&')}` : '';
        const response = await axiosInstance.get(`/turnos/servicio/${sId}/stats${qs}`);
        return response.data;
    },

    // GET /turnos/servicio/{id}/todos-detalle?fechaInicio=&fechaFin=
    getTodosDetalle: async (servicioId = null, fechaInicio = null, fechaFin = null) => {
        const sId = servicioId || getServicioId();
        if (!sId) throw new Error('servicioId es requerido');
        const params = [];
        if (fechaInicio) params.push(`fechaInicio=${fechaInicio}`);
        if (fechaFin)    params.push(`fechaFin=${fechaFin}`);
        const qs = params.length ? `?${params.join('&')}` : '';
        const response = await axiosInstance.get(`/turnos/servicio/${sId}/todos-detalle${qs}`);
        return response.data;
    },

    // GET /turnos/servicio/{id}/funcionarios-detalle?fechaInicio=&fechaFin=
    getFuncionariosDetalle: async (servicioId = null, fechaInicio = null, fechaFin = null) => {
        const sId = servicioId || getServicioId();
        if (!sId) throw new Error('servicioId es requerido');
        const params = [];
        if (fechaInicio) params.push(`fechaInicio=${fechaInicio}`);
        if (fechaFin)    params.push(`fechaFin=${fechaFin}`);
        const qs = params.length ? `?${params.join('&')}` : '';
        const response = await axiosInstance.get(`/turnos/servicio/${sId}/funcionarios-detalle${qs}`);
        return response.data;
    },

    // GET /turnos/servicio/{id}/funcionarios-stats?fechaInicio=&fechaFin=
    getFuncionariosStats: async (servicioId = null, fechaInicio = null, fechaFin = null) => {
        const sId = servicioId || getServicioId();
        if (!sId) throw new Error('servicioId es requerido');
        const params = [];
        if (fechaInicio) params.push(`fechaInicio=${fechaInicio}`);
        if (fechaFin)    params.push(`fechaFin=${fechaFin}`);
        const qs = params.length ? `?${params.join('&')}` : '';
        const response = await axiosInstance.get(`/turnos/servicio/${sId}/funcionarios-stats${qs}`);
        return response.data;
    },

    // GET /turnos/servicio/{id}/cobertura?fechaInicio=&fechaFin=
    getCobertura: async (servicioId = null, fechaInicio = null, fechaFin = null) => {
        const sId = servicioId || getServicioId();
        if (!sId) throw new Error('servicioId es requerido');
        const params = [];
        if (fechaInicio) params.push(`fechaInicio=${fechaInicio}`);
        if (fechaFin)    params.push(`fechaFin=${fechaFin}`);
        const qs = params.length ? `?${params.join('&')}` : '';
        const response = await axiosInstance.get(`/turnos/servicio/${sId}/cobertura${qs}`);
        return response.data;
    },

    // GET /turnos/funcionario/{id}?year=&month=
    getByMedico: async (funcionarioId, year = null, month = null) => {
        if (!funcionarioId) throw new Error('funcionarioId es requerido');
        const params = [];
        if (year)  params.push(`year=${year}`);
        if (month) params.push(`month=${month}`);
        const qs = params.length ? `?${params.join('&')}` : '';
        const response = await axiosInstance.get(`/turnos/funcionario/${funcionarioId}${qs}`);
        return response.data;
    },

    // GET /turnos/funcionario/{id}/futuros
    getFuturos: async (funcionarioId) => {
        if (!funcionarioId) throw new Error('funcionarioId es requerido');
        const response = await axiosInstance.get(`/turnos/funcionario/${funcionarioId}/futuros`);
        return response.data;
    },

    // GET /turnos/puesto/{puestoId}
    getByPuesto: async (puestoId) => {
        if (!puestoId) throw new Error('puestoId es requerido');
        const response = await axiosInstance.get(`/turnos/puesto/${puestoId}`);
        return response.data;
    },

    // GET /turnos/asignacion?puestoId=&fechaInicio=&fechaFin=
    getParaAsignacion: async (puestoId, fechaInicio, fechaFin) => {
        const response = await axiosInstance.get(
            `/turnos/asignacion?puestoId=${puestoId}&fechaInicio=${fechaInicio}&fechaFin=${fechaFin}`
        );
        return response.data;
    },

    // POST /gestion-turnos/alterar  (movido de /turnos/alterar en v2)
    alterar: async (alterarRequest) => {
        const response = await axiosInstance.post('/gestion-turnos/alterar', alterarRequest);
        return response.data;
    }

    // getCoveragePerPuesto* eliminados — sin equivalente en el backend v2
};

// ─────────────────────────────────────────────────────────────────────────────
// SOLICITUDES  →  /api/v2/solicitudes
// ─────────────────────────────────────────────────────────────────────────────
export const solicitudesService = {

    // GET /solicitudes
    getAll: async () => {
        const response = await axiosInstance.get('/solicitudes');
        return response.data;
    },

    // GET /solicitudes/funcionario/{id}  (solicitante)
    getByFuncionario: async (funcionarioId) => {
        const response = await axiosInstance.get(`/solicitudes/funcionario/${funcionarioId}`);
        return response.data;
    },

    // Alias para compatibilidad con código que llama getByMedico
    getByMedico: async (funcionarioId) => solicitudesService.getByFuncionario(funcionarioId),

    // GET /solicitudes/receptor/{id}
    getByReceptor: async (receptorId) => {
        const response = await axiosInstance.get(`/solicitudes/receptor/${receptorId}`);
        return response.data;
    },

    // GET /solicitudes/tipo/{id}
    getByTipo: async (tipoId) => {
        const response = await axiosInstance.get(`/solicitudes/tipo/${tipoId}`);
        return response.data;
    },

    // GET /solicitudes/turno/{id}
    getByTurno: async (turnoId) => {
        const response = await axiosInstance.get(`/solicitudes/turno/${turnoId}`);
        return response.data;
    },

    // POST /solicitudes  — payload: CrearSolicitudDTO
    // { idFuncionario, idFuncionarioReceptor?, idTipoSolicitud, idTurno?,
    //   idTurnoIntercambio?, fechaInicioPermiso?, fechaTerminoPermiso?, motivo }
    crear: async (dto) => {
        const response = await axiosInstance.post('/solicitudes', dto);
        return response.data;
    },

    // Atajos semánticos que construyen el DTO según el tipo de solicitud
    createCobertura: async (funcionarioId, { idTipoSolicitud, idTurno, motivo }) => {
        return solicitudesService.crear({ idFuncionario: funcionarioId, idTipoSolicitud, idTurno, motivo });
    },

    createPermiso: async (funcionarioId, { idTipoSolicitud, fechaInicioPermiso, fechaTerminoPermiso, motivo }) => {
        return solicitudesService.crear({ idFuncionario: funcionarioId, idTipoSolicitud, fechaInicioPermiso, fechaTerminoPermiso, motivo });
    },

    createIntercambio: async (funcionarioId, { idTipoSolicitud, idTurno, idTurnoIntercambio, idFuncionarioReceptor, motivo }) => {
        return solicitudesService.crear({ idFuncionario: funcionarioId, idFuncionarioReceptor, idTipoSolicitud, idTurno, idTurnoIntercambio, motivo });
    },

    createOferta: async (funcionarioId, { idTipoSolicitud, idTurno, motivo }) => {
        return solicitudesService.crear({ idFuncionario: funcionarioId, idTipoSolicitud, idTurno, motivo });
    },

    // PUT /solicitudes/{id}/estado?nuevoEstado=&idUsuarioAsignador=
    // IMPORTANTE: el backend usa @RequestParam, no @RequestBody
    updateEstado: async (solicitudId, nuevoEstado, idUsuarioAsignador) => {
        const userId = idUsuarioAsignador || getUserId();
        const response = await axiosInstance.put(
            `/solicitudes/${solicitudId}/estado?nuevoEstado=${nuevoEstado}&idUsuarioAsignador=${userId}`
        );
        try {
            window.dispatchEvent(new CustomEvent('solicitud:updated', {
                detail: { id: solicitudId, estado: nuevoEstado, response: response.data }
            }));
        } catch (_) {}
        return response.data;
    },

    // PUT /solicitudes/{id}/oferta-particular?idReceptor=&respuesta=
    responderOfertaParticular: async (solicitudId, idReceptor, respuesta) => {
        const response = await axiosInstance.put(
            `/solicitudes/${solicitudId}/oferta-particular?idReceptor=${idReceptor}&respuesta=${respuesta}`
        );
        return response.data;
    },

    // PUT /solicitudes/{id}/intercambio?idReceptor=&respuesta=
    responderIntercambio: async (solicitudId, idReceptor, respuesta) => {
        const response = await axiosInstance.put(
            `/solicitudes/${solicitudId}/intercambio?idReceptor=${idReceptor}&respuesta=${respuesta}`
        );
        return response.data;
    },

    // PATCH /solicitudes/{id}/motivo?motivo=
    modificarMotivo: async (solicitudId, motivo) => {
        const response = await axiosInstance.patch(
            `/solicitudes/${solicitudId}/motivo?motivo=${encodeURIComponent(motivo)}`
        );
        return response.data;
    }

    // delete y getByServicio eliminados — sin equivalente en el backend v2
    // getFechas eliminado — sin equivalente en el backend v2
    // getByEstado eliminado — filtrar en frontend sobre getAll() o getByFuncionario()
};

// ─────────────────────────────────────────────────────────────────────────────
// OFERTAS GENERALES  →  /api/v2/ofertas-generales
// ─────────────────────────────────────────────────────────────────────────────
export const ofertasGeneralesService = {

    // POST /ofertas-generales
    crear: async ({ idFuncionario, idTurno, motivo }) => {
        const response = await axiosInstance.post('/ofertas-generales', { idFuncionario, idTurno, motivo });
        return response.data;
    },

    // PUT /ofertas-generales/{id}/aprobar?idJefatura=
    aprobar: async (idOferta, idJefatura) => {
        const response = await axiosInstance.put(`/ofertas-generales/${idOferta}/aprobar?idJefatura=${idJefatura}`);
        return response.data;
    },

    // PUT /ofertas-generales/{id}/rechazar?idJefatura=
    rechazar: async (idOferta, idJefatura) => {
        const response = await axiosInstance.put(`/ofertas-generales/${idOferta}/rechazar?idJefatura=${idJefatura}`);
        return response.data;
    },

    // POST /ofertas-generales/{id}/postular?idFuncionario=
    postular: async (idOferta, idFuncionario) => {
        const response = await axiosInstance.post(`/ofertas-generales/${idOferta}/postular?idFuncionario=${idFuncionario}`);
        return response.data;
    },

    // DELETE /ofertas-generales/{id}/postular/{idPostulacion}?idFuncionario=
    retirarPostulacion: async (idOferta, idPostulacion, idFuncionario) => {
        await axiosInstance.delete(`/ofertas-generales/${idOferta}/postular/${idPostulacion}?idFuncionario=${idFuncionario}`);
    },

    // PUT /ofertas-generales/{id}/seleccionar/{idPostulacion}?idJefatura=
    seleccionar: async (idOferta, idPostulacion, idJefatura) => {
        const response = await axiosInstance.put(`/ofertas-generales/${idOferta}/seleccionar/${idPostulacion}?idJefatura=${idJefatura}`);
        return response.data;
    },

    // GET /ofertas-generales/servicio/{idServicio}
    getByServicio: async (idServicio) => {
        const response = await axiosInstance.get(`/ofertas-generales/servicio/${idServicio}`);
        return response.data;
    },

    // GET /ofertas-generales/ofertor/{idFuncionario}
    getByOfertor: async (idFuncionario) => {
        const response = await axiosInstance.get(`/ofertas-generales/ofertor/${idFuncionario}`);
        return response.data;
    },
};

// ─────────────────────────────────────────────────────────────────────────────
// NOTIFICACIONES  →  /api/v2/notificaciones
// ─────────────────────────────────────────────────────────────────────────────
export const notificacionesService = {

    // GET /notificaciones/
    getAll: async () => {
        const response = await axiosInstance.get('/notificaciones/');
        return response.data;
    },

    // GET /notificaciones/usuario/{id}
    getByUsuario: async (usuarioId = null) => {
        const uId = usuarioId || getUserId();
        if (!uId) throw new Error('usuarioId es requerido');
        const response = await axiosInstance.get(`/notificaciones/usuario/${uId}`);
        return response.data;
    },

    // GET /notificaciones/sin-leer/{id}   (era no-leidas)
    getNoLeidas: async (usuarioId = null) => {
        const uId = usuarioId || getUserId();
        if (!uId) throw new Error('usuarioId es requerido');
        const response = await axiosInstance.get(`/notificaciones/sin-leer/${uId}`);
        return response.data;
    },

    // PUT /notificaciones/{id}/leer
    marcarLeida: async (notificacionId) => {
        const response = await axiosInstance.put(`/notificaciones/${notificacionId}/leer`);
        return response.data;
    },

    // DELETE /notificaciones/{id}   (era PUT /notificacion/eliminado)
    eliminar: async (notificacionId) => {
        const response = await axiosInstance.delete(`/notificaciones/${notificacionId}`);
        return response.data;
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// PISOS  →  /api/v2/puestos
// ─────────────────────────────────────────────────────────────────────────────
export const puestosService = {

    getAll: async (servicioId = null) => {
        const sId = servicioId || getServicioId();
        const url = `/puestos${sId ? `?servicioId=${sId}` : ''}`;
        const response = await axiosInstance.get(url);
        return response.data;
    },

    getById: async (id) => {
        const response = await axiosInstance.get(`/puestos/${id}`);
        return response.data;
    },

    getByServicio: async (servicioId = null) => {
        const sId = servicioId || getServicioId();
        if (!sId) throw new Error('servicioId es requerido');
        const response = await axiosInstance.get(`/puestos/servicio/${sId}`);
        return response.data;
    },

    create: async (puestoData) => {
        const response = await axiosInstance.post('/puestos', puestoData);
        return response.data;
    },

    update: async (id, puestoData) => {
        const response = await axiosInstance.put(`/puestos/${id}`, puestoData);
        return response.data;
    },

    delete: async (id) => {
        const response = await axiosInstance.delete(`/puestos/${id}`);
        return response.data;
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// BITÁCORA  →  /api/v2/bitacoras  (era /evento)
// ─────────────────────────────────────────────────────────────────────────────
export const eventosService = {

    // GET /bitacoras/
    getAll: async () => {
        const response = await axiosInstance.get('/bitacoras');
        return response.data;
    },

    // GET /bitacoras/dto  (sin circular serialization)
    getAllDTO: async () => {
        const response = await axiosInstance.get('/bitacoras/dto');
        return response.data;
    },

    // GET /bitacoras/tipo/{tipo}
    getByTipo: async (tipo) => {
        const response = await axiosInstance.get(`/bitacoras/tipo/${encodeURIComponent(tipo)}`);
        return response.data;
    },

    // GET /bitacoras/funcionario/{id}  (era /evento/usuario)
    getByUsuario: async (usuarioId) => {
        const response = await axiosInstance.get(`/bitacoras/funcionario/${usuarioId}`);
        return response.data;
    },

    // GET /bitacoras/turno/{id}
    getByTurno: async (turnoId) => {
        const response = await axiosInstance.get(`/bitacoras/turno/${turnoId}`);
        return response.data;
    },

    // GET /bitacoras/solicitud/{id}
    getBySolicitud: async (solicitudId) => {
        const response = await axiosInstance.get(`/bitacoras/solicitud/${solicitudId}`);
        return response.data;
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// SERVICIOS  →  /api/v2/servicios
// ─────────────────────────────────────────────────────────────────────────────
export const serviciosService = {

    getAll: async () => {
        const response = await axiosInstance.get('/servicios/');
        return response.data;
    },

    getById: async (id) => {
        const response = await axiosInstance.get(`/servicios/${id}`);
        return response.data;
    },

    create: async (data) => {
        const response = await axiosInstance.post('/servicios/', data);
        return response.data;
    },

    update: async (id, data) => {
        const response = await axiosInstance.put(`/servicios/${id}`, data);
        return response.data;
    },

    delete: async (id) => {
        const response = await axiosInstance.delete(`/servicios/${id}`);
        return response.data;
    }
    // limpiar eliminado — sin equivalente en el backend v2
};

// ─────────────────────────────────────────────────────────────────────────────
// NORMALIZACIÓN  (sin cambios — adapta respuesta del backend al formato UI)
// ─────────────────────────────────────────────────────────────────────────────
export const normalizeSolicitud = (s) => {
    if (!s) return null;

    const solicitante = s.medicoSolicitante ? {
        id_medico: s.medicoSolicitante.id || s.medicoSolicitante.idPersonal,
        nombre: ((s.medicoSolicitante.nombre || '') + ' ' + (s.medicoSolicitante.apellidoPaterno || '')).trim(),
        email: s.medicoSolicitante.email
    } : null;

    const receptor = s.medicoReceptor ? {
        id_medico: s.medicoReceptor.id || s.medicoReceptor.idPersonal,
        nombre: ((s.medicoReceptor.nombre || '') + ' ' + (s.medicoReceptor.apellidoPaterno || '')).trim(),
        email: s.medicoReceptor.email
    } : null;

    const mapTurno = (t) => {
        if (!t) return null;
        return {
            id_turno:    t.id || t.idTurno || null,
            seccion:     t.idPuesto || t.puesto || t.seccion || null,
            fecha:       t.diaInicioTurno || t.diaInicio || t.fecha || null,
            hora_inicio: t.horaInicio || t.hora_inicio || null,
            hora_fin:    t.horaFin || t.hora_fin || null,
            tipoTurno:   t.tipoTurno || t.tipo_turno || null
        };
    };

    const turnoPropio   = s.turnoPropio   || s.turno_propio   || s.turnoOrigen  || null;
    const turnoDeseado  = s.turnoDeseado  || s.turno_deseado  || s.turnoDestino || null;
    const fechaObjetivo = s.fechaInicioPermiso
        || (turnoPropio  ? (turnoPropio.diaInicioTurno  || turnoPropio.diaInicio  || turnoPropio.fecha  || null) : null)
        || (s.turno      ? (s.turno.diaInicioTurno      || s.turno.diaInicio      || s.turno.fecha      || null) : null);

    return {
        id:                  s.id,
        tipo:                s.tipo || 'Solicitud',
        solicitante,
        receptor,
        estado:              s.estado || 'Pendiente',
        fecha_solicitud:     s.fechaCreacion ? new Date(s.fechaCreacion).getTime() : null,
        fecha:               fechaObjetivo,
        fecha_objetivo:      fechaObjetivo,
        date:                fechaObjetivo,
        turno_origen:        mapTurno(turnoPropio || s.turno),
        turno_destino:       mapTurno(turnoDeseado),
        motivo:              s.motivo || '',
        tipoAutorizacion:    s.tipoAutorizacion || null,
        fechaInicioPermiso:  s.fechaInicioPermiso || null,
        fechaTerminoPermiso: s.fechaTerminoPermiso || null
    };
};

// ─────────────────────────────────────────────────────────────────────────────
// EXPORT DEFAULT
// ─────────────────────────────────────────────────────────────────────────────
export default {
    usuarios:           usuariosService,
    funcionarios:       usuariosService,   // alias explícito con el nombre nuevo
    turnos:             turnosService,
    solicitudes:        solicitudesService,
    ofertasGenerales:   ofertasGeneralesService,
    notificaciones:     notificacionesService,
    puestos:            puestosService,
    eventos:            eventosService,    // mantiene nombre externo para no romper imports
    bitacoras:          eventosService,    // alias explícito con el nombre nuevo
    servicios:          serviciosService,
    normalizeSolicitud
};