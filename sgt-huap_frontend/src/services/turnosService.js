// Importar axios configurado con interceptores JWT
import axiosInstance from '../utils/axiosConfig';

// Usamos la base desde la variable de entorno configurada en axiosInstance
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

/**
 * Fetches all turnos from the backend
 */
export const fetchTurnos = async (servicioId = null, year = null, month = null) => {
    try {
        let url = '/turnos/';

        if (servicioId && year && month) {
            url = `/turnos/servicio/${servicioId}/calendario/${year}/${month}`;
        } else if (servicioId) {
            url = `/turnos/servicio/${servicioId}/entities`;
        }

        const response = await axiosInstance.get(url);
        return response.data;
    } catch (error) {
        console.error('Error fetching turnos:', error);
        throw error;
    }
};

/**
 * Transforms backend turno data to the format expected by the calendar component
 */
export const transformTurnoForCalendar = (backendTurno, userMap = null) => {

    // --- LÓGICA DE NOMBRE DE PISO ---
    // Prioridad 1: 'nombrePiso' (viene de nuestra corrección en Java)
    // Prioridad 2: 'Seccion' (viene de nuestra corrección en Java)
    // Prioridad 3: 'idPiso' (Si es texto como "6A")

    let rawName = backendTurno.nombrePiso || backendTurno.Seccion || backendTurno.idPiso;

    // Convertir a mayúsculas para asegurar coincidencia con el calendario
    const seccion = rawName ? String(rawName).toUpperCase().trim() : 'SIN ASIGNAR';

    // Format doctor name
    let doctor = 'Sin asignar';

    if (userMap && backendTurno.idMedico) {
        const user = userMap.get(backendTurno.idMedico);
        if (user) {
            const { nombre, apellidoPaterno, apellidoMaterno } = user;
            if (nombre && apellidoPaterno) {
                const nombreParts = nombre.trim().split(' ');
                const primerNombre = nombreParts[0];
                const inicial = primerNombre.charAt(0).toUpperCase();
                const apellido = apellidoMaterno ? `${apellidoPaterno} ${apellidoMaterno}` : apellidoPaterno;
                doctor = `${inicial}. ${apellido}`;
            }
        }
    } else if (backendTurno.personalEntity) {
        const { nombre, apellidoPaterno, apellidoMaterno } = backendTurno.personalEntity;
        if (nombre && apellidoPaterno) {
            const nombreParts = nombre.trim().split(' ');
            const primerNombre = nombreParts[0];
            const inicial = primerNombre.charAt(0).toUpperCase();
            const apellido = apellidoMaterno ? `${apellidoPaterno} ${apellidoMaterno}` : apellidoPaterno;
            doctor = `${inicial}. ${apellido}`;
        }
    }

    // Format schedule
    const tipoDeTurno = backendTurno.tipoDeTurnoCantidad || '12h';
    const tipoDeTurnoUpper = tipoDeTurno.toUpperCase();
    let horario;

    if (tipoDeTurnoUpper.includes('24')) {
        horario = '24h';
    } else if (tipoDeTurnoUpper.includes('12')) {
        if (tipoDeTurnoUpper.includes('DIA')) {
            horario = '12-DIA';
        } else if (tipoDeTurnoUpper.includes('TARDE')) {
            horario = '12-TARDE';
        } else {
            const horaInicio = backendTurno.horaInicio || '00:00:00';
            const hora = parseInt(horaInicio.split(':')[0]);
            horario = hora < 14 ? '12-DIA' : '12-TARDE';
        }
    } else {
        horario = tipoDeTurno.toLowerCase();
    }

    // Determine color
    let color;
    if (doctor === 'Sin asignar') {
        color = '#FF5C5C';
    } else if (tipoDeTurnoUpper.includes('24')) {
        color = '#5C5CFF';
    } else if (tipoDeTurnoUpper.includes('12')) {
        if (tipoDeTurnoUpper.includes('DIA')) {
            color = '#FFB85C';
        } else if (tipoDeTurnoUpper.includes('TARDE')) {
            color = '#AAAAAA';
        } else {
            const horaInicio = backendTurno.horaInicio || '00:00:00';
            const hora = parseInt(horaInicio.split(':')[0]);
            color = hora < 14 ? '#FFB85C' : '#AAAAAA';
        }
    } else {
        color = '#5C5CFF';
    }

    const dia = backendTurno.diaInicioTurno || new Date().toISOString().split('T')[0];

    return {
        Seccion: seccion,
        Dia: dia,
        Horario: horario,
        Doctor: doctor,
        Color: color,
        _original: backendTurno
    };
};

export const fetchAndTransformTurnos = async (userMap = null, servicioId = null, year = null, month = null) => {
    try {
        const backendTurnos = await fetchTurnos(servicioId, year, month);
        const transformedTurnos = backendTurnos.map(turno =>
            transformTurnoForCalendar(turno, userMap)
        );
        return transformedTurnos;
    } catch (error) {
        console.error('Error fetching and transforming turnos:', error);
        throw error;
    }
};

export const deleteTurno = async (id) => {
    try {
        await axiosInstance.delete(`/turnos/${id}`);
        return true;
    } catch (error) {
        console.error('Error deleting turno:', error);
        throw error;
    }
};