import axiosInstance from '../utils/axiosConfig';

const API_BASE = '/turnos';

/**
 * Obtiene todos los turnos disponibles en el sistema
 */
export const getTurnos = async () => {
    try {
        const response = await axiosInstance.get(API_BASE);
        return { success: true, data: response.data };
    } catch (error) {
        const mensaje = error.response?.data?.error || 'Error al obtener los turnos';
        return { success: false, error: mensaje };
    }
};

/**
 * Obtiene todos los turnos de un servicio disponibles en el sistema
 * @param {number} idServicio
 */
export const getTurnosPorServicio = async (idServicio) => {
    try {
        const response = await axiosInstance.get(`${API_BASE}/servicio/${idServicio}`);
        return { success: true, data: response.data };
    } catch (error) {
        const mensaje = error.response?.data?.error || 'Error al obtener los turnos';
        return { success: false, error: mensaje };
    }
};

/**
 * Ejecuta una alteración de turno en el backend.
 */
export const alterarTurno = async (payload) => {
    try {
        const response = await axiosInstance.post(`${API_BASE}/alterar`, payload);
        return { success: true, data: response.data };
    } catch (error) {
        const mensaje = error.response?.data?.error || 'Error al alterar el turno';
        return { success: false, error: mensaje };
    }
};

/**
 * Asigna un turno libre a un funcionario del servicio activo.
 */
export const asignarTurnoLibre = async ({ idTurno, idNuevoMedico, idAdministrador, motivo = '' }) => {
    return alterarTurno({
        idTurno,
        accion: 'ASIGNAR',
        idNuevoMedico,
        idAdministrador,
        motivo,
    });
};

// ---------------------------------------------------------------------------
// HELPERS DE MAPEO (reutiliza la misma lógica que funcionarioService)
// ---------------------------------------------------------------------------

const formatTime = (value) => {
    if (!value) return null;
    return String(value).slice(0, 5);
};

const parseDateKey = (value) => {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return date.toISOString().slice(0, 10);
};

const inferirTipo = (nombre, horaInicio) => {
    
    const hora = formatTime(horaInicio);
    if (!hora) return 'dia';
    const h = parseInt(hora.split(':')[0], 10);
    return h >= 18 || h < 6 ? 'noche' : 'dia';
};

const buildTeamMember = (turno, funcionarioId) => {
    const nombre = turno?.nombreFuncionario || turno?.raw?.nombreFuncionario || null;
    if (!nombre) return null;

    return {
        id: turno?.idFuncionario ?? turno?.raw?.idFuncionario ?? 'sin-asignar',
        nombre,
        rol: 'MEDICO',
        iniciales: nombre
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 2)
            .map((part) => part[0]?.toUpperCase() || '')
            .join('') || '?',
        esYo: Boolean(
            (funcionarioId != null && Number(turno?.idFuncionario) === Number(funcionarioId))
        ),
    };
};

/**
 * Mapea un turno crudo del endpoint de calendario al formato de vista.
 * turnoLibre = idFuncionario es null (Sin Asignar en el JSON).
 */
const mapTurnoCalendario = (turno, funcionarioId) => {
    const fecha = parseDateKey(turno?.diaInicioTurno || turno?.fecha);
    const inicio = formatTime(turno?.horaInicio);
    const fin = formatTime(turno?.horaFin);
    const tipo = inferirTipo(turno?.nombre, turno?.horaInicio);
    const miTurno = funcionarioId != null && Number(turno?.idFuncionario) === Number(funcionarioId);
    const turnoLibre = turno?.idFuncionario == null;
    const teamKey = `${fecha || 'sin-fecha'}-tipo-${turno?.idTipoTurno ?? 'sin-tipo'}`;

    return {
        id: turno?.id,
        fecha,
        tipo,
        nombreTipo: turno?.nombre ?? null,
        inicio,
        fin,
        nombrePuesto: turno?.nombrePuesto ?? null,
        idPuesto: turno?.idPuesto ?? null,
        idTipoTurno: turno?.idTipoTurno ?? null,
        idPlantilla: turno?.idPlantilla ?? 1,
        nombreTipoTurno: turno?.nombreTipoTurno ?? null,
        nombreFuncionario: turnoLibre ? null : (turno?.nombreFuncionario ?? null),
        idFuncionario: turno?.idFuncionario ?? null,
        miTurno,
        turnoLibre,
        teamKey,
        raw: turno,
    };
};

const buildTurnoTeams = (turnos, funcionarioId) => {
    const teamsByKey = turnos.reduce((acc, turno) => {
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
        const grupoTurnos = group.turnos ?? [];
        group.totalTurnos = grupoTurnos.length;
        group.asignados = grupoTurnos.filter((t) => t.idFuncionario != null).length;
        group.completo = group.totalTurnos > 0 && group.asignados === group.totalTurnos;

        const porPuestoMap = grupoTurnos.reduce((acc, t) => {
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

    turnos.forEach((turno) => {
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

    return turnos;
};

/**
 * Agrupa un array plano de turnos en { 'YYYY-MM-DD': [turno, ...] }
 */
const agruparPorFecha = (turnos) =>
    turnos.reduce((acc, t) => {
        if (!t.fecha) return acc;
        if (!acc[t.fecha]) acc[t.fecha] = [];
        acc[t.fecha].push(t);
        return acc;
    }, {});

// ---------------------------------------------------------------------------
// FUNCIÓN PRINCIPAL DEL CALENDARIO
// ---------------------------------------------------------------------------

/**
 * Obtiene los turnos del mes para el calendario.
 * - Personal normal: solo sus turnos + turnos libres del servicio.
 * - Jefatura/subrogante: todos los turnos del servicio.
 *
 * @param {object} params
 * @param {number}  params.servicioId
 * @param {number}  params.funcionarioId
 * @param {number}  params.year
 * @param {number}  params.month
 * @param {boolean} params.esJefatura  - true si rol es JEFATURA o SUBROGANTE
 */
export const getTurnosCalendario = async ({ servicioId, funcionarioId, year, month, esJefatura = false }) => {
    try {
        if (!servicioId) throw new Error('servicioId requerido');

        const response = await axiosInstance.get(
            `${API_BASE}/servicio/${servicioId}/calendario/${year}/${month}`
        );

        const raw = Array.isArray(response.data) ? response.data : [];

        const todos = raw
            .map((t) => mapTurnoCalendario(t, funcionarioId))
            .filter((t) => t.fecha);

        buildTurnoTeams(todos, funcionarioId);

        // Filtro según rol: jefatura ve todo, personal solo ve los suyos y los libres
        const visibles = esJefatura
            ? todos
            : todos.filter((t) => t.miTurno || t.turnoLibre);

        return {
            success: true,
            data: {
                shiftsByDay: agruparPorFecha(visibles),
                // Para jefatura también exponemos los agrupados sin filtro (puede ser útil)
                allShiftsByDay: esJefatura ? agruparPorFecha(todos) : null,
                year,
                month,
            },
        };
    } catch (error) {
        const mensaje = error.response?.data?.error || 'No se pudo cargar el calendario. Intenta de nuevo.';
        return { success: false, error: mensaje };
    }
};


