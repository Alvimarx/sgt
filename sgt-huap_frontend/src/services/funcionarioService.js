// src/services/funcionarioService.js
import axiosInstance from '../utils/axiosConfig';
import { getUserId as getUserIdFromToken ,
    getServicioId as getUserServiceIdFromToken
} from '../utils/tokenManager';


const API_BASE = '/funcionarios';
const getUserId = () => getUserIdFromToken() || localStorage.getItem('userId');

const DAY_NAMES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

// ---------------------------------------------------------------------------
// HELPERS DE PARSEO Y CÁLCULO
// ---------------------------------------------------------------------------

const parseDateKey = (value) => {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return date.toISOString().slice(0, 10);
};

const formatTime = (value) => {
    if (!value) return null;
    return String(value).slice(0, 5);
};

const normalizeDateString = (value) => {
    if (!value) return null;

    if (typeof value === 'string') {
        return value.slice(0, 10);
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return date.toISOString().slice(0, 10);
};

const getHoursFromTurno = (turno) => {
    if (turno?.horas != null) return Number(turno.horas);
    const inicio = formatTime(turno?.horaInicio || turno?.hora_inicio);
    const fin = formatTime(turno?.horaFin || turno?.hora_fin);
    if (!inicio || !fin) return null;

    const [inicioHoras, inicioMinutos] = inicio.split(':').map(Number);
    const [finHoras, finMinutos] = fin.split(':').map(Number);
    const inicioTotal = inicioHoras * 60 + inicioMinutos;
    const finTotal = finHoras * 60 + finMinutos;
    const diferencia = finTotal >= inicioTotal
        ? finTotal - inicioTotal
        : (24 * 60 - inicioTotal) + finTotal;

    return diferencia / 60;
};

// ---------------------------------------------------------------------------
// CONSTRUCCIÓN DE TEAM
// ---------------------------------------------------------------------------

/**
 * Intenta construir un objeto team desde los datos crudos de la API.
 * Retorna null si no hay suficiente información (el JSX lo protege con && antes de acceder).
 */
const buildTeamMember = (turno, funcionarioId) => {
    const nombre = turno?.nombreFuncionario || turno?.raw?.nombreFuncionario || null;
    if (!nombre) return null;

    return {
        id: turno?.idFuncionario ?? turno?.raw?.idFuncionario ?? turno?.id ?? 'sin-asignar',
        nombre,
        rol: 'MEDICO',
        iniciales: nombre
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 2)
            .map((part) => part[0]?.toUpperCase() || '')
            .join('') || '?',
        esYo: Boolean(
            turno?.miTurno ||
            turno?.esMiTurno ||
            (funcionarioId != null && Number(turno?.idFuncionario) === Number(funcionarioId))
        ),
    };
};

// ---------------------------------------------------------------------------
// MAPEO DE TURNO INDIVIDUAL
// ---------------------------------------------------------------------------

/**
 * Normaliza un turno crudo (API o mock) al formato que consume la vista de agenda.
 * - Si no, intenta construirlo desde los campos crudos con buildTeamFromRaw.
 * - Si no hay datos de equipo, team queda null (la vista lo maneja con &&).
 */
const mapTurnoForAgenda = (turno, funcionarioId) => {
    const fechaInicio = normalizeDateString(turno?.diaInicioTurno);
    const tipo = normalizeDateString(turno?.diaInicioTurno) === normalizeDateString(turno?.diaFinalTurno)
        ? 'dia'
        : 'noche';
    const teamKey = `${fechaInicio || 'sin-fecha'}-tipo-${turno?.idTipoTurno ?? 'sin-tipo'}`;

    return {
        id: turno?.id ?? null,
        fecha: fechaInicio,
        tipo,
        horaInicio: formatTime(turno?.horaInicio) ?? null,
        horaFin: formatTime(turno?.horaFin) ?? null,
        inicio: formatTime(turno?.diaInicioTurno) ?? null,
        fin: formatTime(turno?.diaFinalTurno) ?? null,
        horas: getHoursFromTurno(turno),
        equipo: null,
        nombrePuesto: turno?.nombrePuesto || null,
        idPuesto: turno?.idPuesto || null,
        idTipoTurno: turno?.idTipoTurno ?? null,
        nombreTipoTurno: turno?.nombreTipoTurno ?? null,
        miTurno: Boolean(
            (funcionarioId != null && Number(turno?.idFuncionario) === Number(funcionarioId))
        ),
        turnoLibre: turno?.idFuncionario == null,
        idFuncionario: turno?.idFuncionario ?? null,
        nombreFuncionario: turno?.nombreFuncionario || turno?.raw?.nombreFuncionario || null,
        motivoLibre: turno?.motivoLibre ?? null,
        cuposLibres: turno?.cuposLibres ?? null,
        solicitudPendiente: Boolean(turno?.solicitudPendiente),
        solicitudTipo: turno?.solicitudTipo ?? null,
        solicitudCon: turno?.solicitudCon ?? null,
        cambioAprobado: Boolean(turno?.cambioAprobado),
        cambioAprobadoCon: turno?.cambioAprobadoCon ?? null,
        cruzaMedianoche: Boolean(turno?.cruzaMedianoche),
        idPlantilla: turno?.idPlantilla ?? null,
        teamKey,
        raw: turno,
    };
};

// ---------------------------------------------------------------------------
// RESUMEN POR DÍA
// ---------------------------------------------------------------------------

/**
 * Consolida los turnos de un día en un objeto resumen para el card de la agenda.
 * Permite mostrar información agregada sin exponer cada turno en el header.
 */
const buildDaySummary = (turnosDelDia = []) => {
    if (turnosDelDia.length === 0) return null;

    const misTurnos = turnosDelDia.filter((t) => t.miTurno);
    const hayLibres = turnosDelDia.some((t) => t.turnoLibre);
    const haySolicitudPendiente = turnosDelDia.some((t) => t.solicitudPendiente);
    const hayCambioAprobado = turnosDelDia.some((t) => t.cambioAprobado);

    const horasTotales = misTurnos.reduce((sum, t) => {
        return t.horas != null ? sum + t.horas : sum;
    }, 0);

    const inicios = misTurnos.map((t) => t.inicio).filter(Boolean).sort();
    const fines = misTurnos.map((t) => t.fin).filter(Boolean).sort();

    return {
        cantidadTurnos: turnosDelDia.length,
        misTurnos,
        hayLibres,
        haySolicitudPendiente,
        hayCambioAprobado,
        horasTotales: horasTotales || null,
        inicioDelDia: inicios[0] ?? null,
        finDelDia: fines[fines.length - 1] ?? null,
        // La vista usa esto para mostrar "+N más" en el header del día
        tieneMultiplesTurnos: misTurnos.length > 1,
    };
};

// ---------------------------------------------------------------------------
// CONSTRUCCIÓN DEL OBJETO AGENDA COMPLETO
// ---------------------------------------------------------------------------

const buildAgendaData = (turnos, funcionarioId) => {
    const mappedTurnos = Array.isArray(turnos)
        ? turnos
            .map((turno) => mapTurnoForAgenda(turno, funcionarioId))
            .filter((turno) => turno.fecha)
        : [];

    const teamsByKey = mappedTurnos.reduce((acc, turno) => {
        if (!turno.teamKey) return acc;

        if (!acc[turno.teamKey]) {
            acc[turno.teamKey] = {
                key: turno.teamKey,
                fecha: turno.fecha,
                tipo: turno.tipo,
                idTipoTurno: turno.idTipoTurno ?? null,
                nombreTipoTurno: turno.nombreTipoTurno ?? null,
                inicio: turno.inicio ?? null,
                fin: turno.fin ?? null,
                integrantes: [],
                turnos: [],
            };
        }

        const group = acc[turno.teamKey];
        group.turnos.push(turno);

        const miembro = buildTeamMember(turno, funcionarioId);
        if (miembro && !group.integrantes.some((item) => Number(item.id) === Number(miembro.id))) {
            group.integrantes.push(miembro);
        }

        return acc;
    }, {});

    // Enriquecimiento de cada equipo: cobertura (asignados/total) y desglose por puesto.
    Object.values(teamsByKey).forEach((group) => {
        const turnos = group.turnos ?? [];
        group.totalTurnos = turnos.length;
        group.asignados = turnos.filter((t) => t.idFuncionario != null).length;
        group.completo = group.totalTurnos > 0 && group.asignados === group.totalTurnos;

        const porPuestoMap = turnos.reduce((acc, t) => {
            const idPuesto = t.idPuesto ?? 'sin-puesto';
            if (!acc[idPuesto]) {
                acc[idPuesto] = {
                    idPuesto: t.idPuesto ?? null,
                    nombrePuesto: t.nombrePuesto ?? 'Sin puesto',
                    integrantes: [],
                    vacantes: 0,
                };
            }
            if (t.idFuncionario != null) {
                acc[idPuesto].integrantes.push({
                    id: t.idFuncionario,
                    nombre: t.nombreFuncionario,
                    turnoId: t.id,
                    esYo: Boolean(t.miTurno),
                });
            } else {
                acc[idPuesto].vacantes += 1;
            }
            return acc;
        }, {});
        group.porPuesto = Object.values(porPuestoMap);
    });

    mappedTurnos.forEach((turno) => {
        if (!turno.teamKey || !teamsByKey[turno.teamKey]) return;
        const group = teamsByKey[turno.teamKey];
        const integrantes = group.integrantes;
        const jefe = integrantes[0] || null;

        turno.teamGroup = group;
        turno.team = jefe
            ? {
                jefe,
                urgenciologos: integrantes.slice(1, 3),
                medicos: integrantes.slice(3),
                total: integrantes.length,
                integrantes,
            }
            : null;
    });

    const grouped = mappedTurnos.reduce((acc, turno) => {
        if (!acc[turno.fecha]) acc[turno.fecha] = [];
        acc[turno.fecha].push(turno);
        return acc;
    }, {});

    const todayKey = new Date().toISOString().slice(0, 10);

    const weekDays = Object.keys(grouped)
        .sort()
        .map((key) => {
            const date = new Date(`${key}T00:00:00`);
            const turnosDelDia = grouped[key] ?? [];
            return {
                key,
                dia: DAY_NAMES[date.getDay()],
                num: date.getDate(),
                hoy: key === todayKey,
                findesemana: date.getDay() === 0 || date.getDay() === 6,
                resumen: buildDaySummary(turnosDelDia),
            };
        });

    return {
        todayKey,
        weekDays,
        shiftsByDay: grouped,
        turnos: mappedTurnos,
    };
};

// ---------------------------------------------------------------------------
// EXPORTS PÚBLICOS
// ---------------------------------------------------------------------------

/**
 * Obtiene los turnos de un funcionario y los transforma al formato de agenda.
 * Maneja errores internamente devolviendo { success: false, error: string }
 * en lenguaje humano, sin exponer detalles técnicos al usuario.
 *        !!!! Quizas sea mejor idea colocar en backend !!!!
 *
 * @param {number|null} funcionarioId - Si no se pasa, usa el id del token.
 * @param {number|null} year  - Filtro opcional de año para el backend.
 * @param {number|null} month - Filtro opcional de mes para el backend.
 * @returns {{ success: boolean, data?: AgendaData, error?: string }}
 */
export const getTurnos = async (funcionarioId = null, year = null, month = null) => {
    try {
        const id = Number(funcionarioId || getUserId());
        if (!id) throw new Error('No se encontró el id del funcionario');
        const params = [];
        if (year) params.push(`year=${year}`);
        if (month) params.push(`month=${month}`);
        const qs = params.length ? `?${params.join('&')}` : '';

        const response = await axiosInstance.get(`/turnos/funcionario/${id}${qs}`);

        return {
            success: true,
            data: buildAgendaData(response.data,id),
        };
    } catch (error) {
        const mensaje = error.response?.data?.error || 'No se pudieron cargar los turnos. Intenta de nuevo.';
        return { success: false, error: mensaje };
    }
};

/**
 * Obtiene todos los turnos de un servicio y los transforma al formato de agenda.
 * Se usa para que la vista pueda construir el equipo completo por puesto/tipo
 * y filtrar "Mis turnos" únicamente en el frontend.
 */
export const getTurnosServicio = async (servicioId = null, funcionarioId = null) => {
    try {
        const idServicio = Number(servicioId || getUserServiceIdFromToken());
        if (!idServicio) throw new Error('No se encontró el id del servicio');

        const response = await axiosInstance.get(`/turnos/servicio/${idServicio}`);

        return {
            success: true,
            data: buildAgendaData(response.data, funcionarioId ?? getUserId()),
        };
    } catch (error) {
        const mensaje = error.response?.data?.error || 'No se pudieron cargar los turnos del servicio. Intenta de nuevo.';
        return { success: false, error: mensaje };
    }
};

/**
 * Obtiene un resumen de los funcionarios.
 * @param {number|null} servicioId - Si se envía, filtra por servicio.
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
 * Asigna un servicio a un funcionario con rol Médico (ID 3) por defecto.
 */
export const asignarServicio = async (idServicio, rut) => {
    try {
        const exist = await axiosInstance.get(`${API_BASE}/status/${rut}`);
        if (exist.data != -1){
            console.log(exist.data);
            const response = await axiosInstance.put(`${API_BASE}/${exist.data}`, {
                servicioId: Number(idServicio),
                rol: 3,
            });
            return { success: true, data: response.data };
        } else {
            const mensaje = 'Usuario no registrado';
            return { success: false, error: mensaje };
        }

    } catch (error) {
        const mensaje = error.response?.data?.error || 'Error al asignar el servicio';
        return { success: false, error: mensaje };
    }
};

/**
 * Asigna un rol jerárquico a un funcionario dentro de un servicio.
 */
export const asignarRolJerarquia = async (funcionarioId, idServicio, idRol) => {
    try {
        const response = await axiosInstance.put(`${API_BASE}/${funcionarioId}`, {
            servicioId: Number(idServicio),
            rol: Number(idRol),
        });
        return { success: true, data: response.data };
    } catch (error) {
        const mensaje = error.response?.data?.error || 'Error al asignar el rol jerárquico';
        return { success: false, error: mensaje };
    }
};


/**
 * Obtener al personal del hospital
 */
export const getPersonal = async () => {
    try {
        const response = await axiosInstance.get(`Personal/summary`);
        return { success: true, data: response.data };
    } catch (error) {
        const mensaje = error.response?.data?.error || 'Error al obtener los funcionarios';
        return { success: false, error: mensaje };
    }
};

