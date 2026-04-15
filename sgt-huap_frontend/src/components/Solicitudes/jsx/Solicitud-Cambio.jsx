import React, { useState, useMemo, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import dayjs from "dayjs";
import { useAuth, Roles } from "../../../context/AuthContext";
import { getPasilloColor, getTextColor, groupTurnosByPasillo, lightenColor } from "../../../utils/pasilloColors";
import axiosInstance from "../../../utils/axiosConfig";
import { useNotifications } from '../../../context/NotificationContext';
import "../../shared/css/Base-Calendario-Turnos.css";
// estilos por dispositivo
import "../css/movil/Solicitud-Cambio-Movil.css";
import "../css/pc/Solicitud-Cambio-Pc.css";
import "../css/tablet/Solicitud-Cambio-Tablet.css";

// Formatos de texto
const formatTurnoResumen = (turno, pisosMap = {}) => {
    //Fecha en negrita
    const pisoNombre = pisosMap[turno.Seccion] || "Sin piso";
    return `Piso: ${pisoNombre} | Dia: <strong>${dayjs(turno.Dia).format('DD/MM/YYYY')}</strong> | ${(turno.Hora_inicio || "").slice(0, 5)}-${(turno.Hora_fin || "").slice(0, 5)}`;
};


const formatTurnoDetalle = (turno, medicosMap = {}, pisosMap = {}) => {
    const medicoId = turno.ID_Medico;

    const nombreMedico = medicosMap[medicoId]
        ? medicosMap[medicoId]
        : `ID ${medicoId} (Desconocido)`;

    const pisoNombre = pisosMap[turno.Seccion] || "Sin piso";
    //Fecha en negrita
    const fechaTurno = `<strong>${dayjs(turno.Dia).format('DD/MM/YYYY')}</strong>`;

    return `${fechaTurno} (${(turno.Hora_inicio || "").slice(0, 5)}-${(turno.Hora_fin || "").slice(0, 5)}) | Médico: ${nombreMedico} | Piso: ${pisoNombre}`;
};


function TurnoSelector({ label, turnoSeleccionado, onSelect, turnos, formatDetail, pisosMap = {}, mapaColores }) {
    const [mostrarMenu, setMostrarMenu] = useState(false);
    const [vista, setVista] = useState("Listado");
    const [currentDate, setCurrentDate] = useState(dayjs());

    const days = useMemo(() => {
        const startOfMonth = currentDate.startOf("month");
        const endOfMonth = currentDate.endOf("month");
        const startDate = startOfMonth.startOf("week");
        const endDate = endOfMonth.endOf("week");
        const result = [];
        let cursor = startDate.clone();

        while (cursor.isBefore(endDate, "day") || cursor.isSame(endDate, "day")) {
            result.push(cursor.clone());
            cursor = cursor.add(1, "day");
        }
        return result;
    }, [currentDate]);

    const turnosMap = useMemo(() => {
        return (turnos || []).reduce((acc, turno) => {
            const key = dayjs(turno.Dia).format("YYYY-MM-DD");
            if (!acc[key]) {
                acc[key] = [];
            }
            acc[key].push(turno);
            return acc;
        }, {});
    }, [turnos]);


    const handleSeleccion = (turno) => {
        onSelect(turno);
        setMostrarMenu(false);
    };

    const prevMonth = () => setCurrentDate((value) => value.subtract(1, "month"));
    const nextMonth = () => setCurrentDate((value) => value.add(1, "month"));

    const renderCalendar = () => (
        <div className="calendar-container">
            <div className="calendar-header">
                <button type="button" onClick={prevMonth}>&lt;</button>
                <h3>{currentDate.format("MMMM YYYY").toUpperCase()}</h3>
                <button type="button" onClick={nextMonth}>&gt;</button>
            </div>

            <div className="calendar-scroll">
                <div className="calendar-grid">
                    {/* Headers de días integrados en la malla (Sticky) */}
                    {["LUN", "MAR", "MIE", "JUE", "VIE", "SAB", "DOM"].map((dayLabel) => (
                        <div key={dayLabel} className="calendar-weekday-sticky">{dayLabel}</div>
                    ))}

                    {days.map((dayItem, index) => {
                        const dateKey = dayItem.format("YYYY-MM-DD");
                        const listaTurnos = turnosMap[dateKey] || [];
                        const cellClass = dayItem.month() === currentDate.month() ? "current-month" : "other-month";

                        return (
                            <div key={`${dateKey}-${index}`} className={`calendar-cell ${cellClass}`}>
                                <span className="day-number">{dayItem.format("D")}</span>
                                {groupTurnosByPasillo(listaTurnos, pisosMap).map((grupo) => {
                                    const baseColor = (mapaColores && grupo.turnos[0] && (mapaColores[grupo.turnos[0].Seccion] || mapaColores[String(grupo.turnos[0].Seccion)])) || getPasilloColor(grupo.label);
                                    const headerText = getTextColor(baseColor);
                                    const itemBackground = lightenColor(baseColor, 0.45);
                                    const itemText = getTextColor(itemBackground);

                                    return (
                                        <div
                                            key={`grupo-${grupo.key}`}
                                            className="turno-box"
                                            style={{ borderColor: baseColor }}
                                        >
                                            <div
                                                className="turno-box-header"
                                                style={{ backgroundColor: baseColor, color: headerText }}
                                            >
                                                {grupo.label}
                                            </div>
                                            <div className="turno-box-content">
                                                {grupo.turnos.map((turno, turnoIdx) => (
                                                    <div
                                                        key={`${grupo.key}-${turno.id ?? turnoIdx}`}
                                                        className={`turno-box-entry ${turnoSeleccionado && turnoSeleccionado.id === turno.id ? 'selected-turno' : ''}`}
                                                        style={{ backgroundColor: itemBackground, color: itemText }}
                                                        onClick={() => handleSeleccion(turno)}
                                                    >
                                                        <span className="turno-horario">{`${(turno.Hora_inicio || "").slice(0, 5)}`}</span>
                                                        {turno.TipoTurno && (
                                                            <span className="turno-tipo">{turno.TipoTurno}</span>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );

    return (
        <div className="form-section turno-selector">
            <label>{label}</label>
            <button
                type="button"
                className="btn-seleccionar-turno"
                onClick={() => setMostrarMenu((value) => !value)}
                disabled={!turnos || turnos.length === 0}
            >
                {turnoSeleccionado ? (
                    <span dangerouslySetInnerHTML={{ __html: formatTurnoResumen(turnoSeleccionado, pisosMap) }} />
                ) : (
                    "Seleccionar turno"
                )}
            </button>

            {mostrarMenu && turnos && turnos.length > 0 && (
                <div className="menu-turnos">
                    <div className="menu-vista">
                        <button
                            type="button"
                            className={`vista-btn ${vista === "Listado" ? "activo" : ""}`}
                            onClick={() => setVista("Listado")}
                        >
                            Listado
                        </button>
                        <button
                            type="button"
                            className={`vista-btn ${vista === "Calendario" ? "activo" : ""}`}
                            onClick={() => setVista("Calendario")}
                        >
                            Calendario
                        </button>
                    </div>

                    {vista === "Listado" && (
                        <ul className="lista-turnos">
                            {turnos.map((turno) => (
                                <li
                                    key={turno.id}
                                    className={`turno-item ${turnoSeleccionado && turnoSeleccionado.id === turno.id ? 'seleccionado' : ''}`}
                                    onClick={() => handleSeleccion(turno)}
                                >
                                    <span dangerouslySetInnerHTML={{ __html: formatDetail(turno) }} />
                                </li>
                            ))}
                        </ul>
                    )}

                    {vista === "Calendario" && renderCalendar()}
                </div>
            )}
            {mostrarMenu && (!turnos || turnos.length === 0) && (
                <div className="menu-turnos"><p>No hay turnos disponibles.</p></div>
            )}
        </div>
    );
}

// --- Componente SolicitudesCambio 

function SolicitudesCambio() {
    const navigate = useNavigate();
    const location = useLocation();
    const auth = useAuth();
    const { refresh } = useNotifications();
    const [pisosMap, setPisosMap] = useState({});
    const [pisosColorMap, setPisosColorMap] = useState({});

    const isJefatura = auth.hasRole([Roles.JEFATURA, Roles.JEFATURA_SUB]);
    let medicoId = auth?.user?.id;

    if (!medicoId) {
        const rawUserId = localStorage.getItem('userId');
        medicoId = rawUserId ? parseInt(rawUserId, 10) : null;
    }

    const [allTurnos, setAllTurnos] = useState([]);
    const [medicosMap, setMedicosMap] = useState({});
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    const [turnoDeseado, setTurnoDeseado] = useState(null);
    const [turnoAIntercambiar, setTurnoAIntercambiar] = useState(null);
    const [motivo, setMotivo] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const fetchTurnosYMedicos = useCallback(async () => {
        if (!medicoId) {
            setError("Error: ID de usuario no disponible para cargar turnos.");
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const [turnosResponse, medicosResponse] = await Promise.all([
                axiosInstance.get(`/turnos/`),
                axiosInstance.get(`/usuarios`)
            ]);

            const medicoMap = medicosResponse.data.reduce((acc, medico) => {
                acc[medico.id] = `${medico.nombre} ${medico.apellidoPaterno}`;
                return acc;
            }, {});
            setMedicosMap(medicoMap);

            const turnosFromApi = turnosResponse.data.map((turno) => ({
                id: turno.id,
                id_medico: turno.idMedico,
                Seccion: turno.idPiso, // Usado como ID de piso
                Dia: turno.diaInicioTurno,
                Hora_inicio: turno.horaInicio,
                Hora_fin: turno.horaFin,
                TipoTurno: turno.tipoTurno || "Asignado",
                ID_Medico: turno.idMedico
            }));

            // Solo turnos con médico asignado son válidos para intercambio
            const turnosValidos = turnosFromApi.filter(t => t.ID_Medico && t.ID_Medico !== 0);

            setAllTurnos(turnosValidos);

        } catch (err) {
            console.error("Error al cargar datos:", err);
            if (err.response && err.response.status === 401) {
                setError("Error de autenticación (401). Asegúrese de haber iniciado sesión y que su token sea válido.");
            } else {
                setError("No se pudieron cargar los turnos o la información de los médicos.");
            }
        } finally {
            setIsLoading(false);
        }
    }, [medicoId]);

    useEffect(() => {
        fetchTurnosYMedicos();
    }, [fetchTurnosYMedicos]);

    useEffect(() => {
        axiosInstance.get("/pisos")
            .then((res) => {
                const map = {};
                const mapColores = {};
                res.data.forEach((p) => {
                    map[p.id] = p.nombre;   // ID → Nombre
                    mapColores[p.id] = p.colorHexa || "#999999";
                });
                setPisosMap(map);
                setPisosColorMap(mapColores);
            })
            .catch((err) => {
                console.error("Error cargando pisos:", err);
            });
    }, []);

    const getFormattedDetail = useCallback((turno) => {
        return formatTurnoDetalle(turno, medicosMap, pisosMap);
    }, [medicosMap, pisosMap]);

    // ----------------------------------------------------
    // Función genérica de filtrado y ordenamiento
    const filterAndSortTurnos = useCallback((turnosList) => {
        const today = dayjs().startOf('day');

        // 1. FILTRAR: Quitar turnos pasados
        const futurosYHoy = turnosList.filter(turno =>
            dayjs(turno.Dia).isSame(today, 'day') || dayjs(turno.Dia).isAfter(today, 'day')
        );

        // 2. ORDENAR: Por día (ascendente) y luego por Piso (Seccion)
        const ordenados = futurosYHoy.sort((a, b) => {
            // Ordenar por fecha (Dia)
            const dateA = dayjs(a.Dia);
            const dateB = dayjs(b.Dia);
            if (dateA.isBefore(dateB, 'day')) return -1;
            if (dateA.isAfter(dateB, 'day')) return 1;

            // Si el día es el mismo, ordenar por Piso 
            if (a.Seccion < b.Seccion) return -1;
            if (a.Seccion > b.Seccion) return 1;

            // Si el día y el piso son iguales, ordenar por hora de inicio
            if (a.Hora_inicio < b.Hora_inicio) return -1;
            if (a.Hora_inicio > b.Hora_inicio) return 1;

            return 0;
        });

        return ordenados;
    }, []);

    // ----------------------------------------------------
    // Turnos Propios Filtrados
    // ----------------------------------------------------
    const turnosPropios = useMemo(() => {
        if (!medicoId) return [];
        const propios = allTurnos.filter(turno => turno.ID_Medico === medicoId);
        return propios;
    }, [medicoId, allTurnos]);

    const turnosPropiosFiltrados = useMemo(() => {
        return filterAndSortTurnos(turnosPropios);
    }, [turnosPropios, filterAndSortTurnos]);

    // ----------------------------------------------------
    // Turnos Deseados (Otros) Filtrados
    // ----------------------------------------------------
    const turnosOtros = useMemo(() => {
        if (!medicoId) return allTurnos;
        return allTurnos.filter(turno => turno.ID_Medico !== medicoId);
    }, [medicoId, allTurnos]);

    const turnosOtrosFiltrados = useMemo(() => {
        return filterAndSortTurnos(turnosOtros);
    }, [turnosOtros, filterAndSortTurnos]);


    // Handle incoming data from navigation state (e.g., from TurnosDisponibles)
    useEffect(() => {
        //Lógica para pre-seleccionar Turno a Intercambiar (Propio)
        if (location.state?.turnoPropio && allTurnos.length > 0) {
            const turnoPropio = location.state.turnoPropio;

            // Buscamos la coincidencia en la lista completa de turnos
            const turnoMatch = allTurnos.find(t =>
                t.id === turnoPropio.id ||
                (t.Dia === turnoPropio.diaInicioTurno &&
                    t.Hora_inicio === turnoPropio.horaInicio &&
                    t.Hora_fin === turnoPropio.horaFin &&
                    t.Seccion === turnoPropio.idPiso)
            );

            if (turnoMatch) {
                setTurnoAIntercambiar(turnoMatch);
                // Set a default motivo message
                setMotivo("Solicitud de intercambio de turno generada desde Mis Turnos.");
            }
        }
        //Lógica para pre-seleccionar Turno Deseado (Del colega)
        else if (location.state?.turnoDeseado && allTurnos.length > 0) {
            const turnoDeseadoData = location.state.turnoDeseado;

            // Buscamos la coincidencia en la lista completa de turnos
            const turnoMatch = allTurnos.find(t =>
                t.id === turnoDeseadoData.id ||
                (t.Dia === turnoDeseadoData.diaInicioTurno &&
                    t.Hora_inicio === turnoDeseadoData.horaInicio &&
                    t.Hora_fin === turnoDeseadoData.horaFin &&
                    t.Seccion === turnoDeseadoData.idPiso)
            );

            if (turnoMatch) {
                setTurnoDeseado(turnoMatch);
                // Establecer un motivo que refleje la pre-selección
                const medicoNombre = medicosMap[turnoMatch.ID_Medico] || `ID ${turnoMatch.ID_Medico}`;
                setMotivo(`Solicito intercambio por el turno del Dr(a). ${medicoNombre}.`);
            }
        }
    }, [location.state, allTurnos, medicosMap]);

    const handleCancelar = () => {
        navigate("/solicitudes");
    };

    const handleSolicitar = async () => {
        if (!medicoId) {
            alert("Error: ID de médico no disponible.");
            return;
        }

        if (isSubmitting) return;

        if (!turnoDeseado || !turnoAIntercambiar) {
            alert("Debe seleccionar ambos turnos antes de enviar la solicitud.");
            return;
        }

        if (turnoDeseado.id === turnoAIntercambiar.id) {
            alert("Error: No puedes intercambiar un turno consigo mismo.");
            return;
        }

        // 1. El turno que deseo NO debe ser mío
        if (turnoDeseado.ID_Medico === medicoId) {
            alert("Error: El turno deseado ya es tuyo. Debes seleccionar un turno de un colega.");
            return;
        }

        // 2. El turno que ofrezco SÍ debe ser mío
        if (turnoAIntercambiar.ID_Medico !== medicoId) {
            alert("Error: El turno a intercambiar no es tuyo.");
            return;
        }

        setIsSubmitting(true);

        const motivoParaEnviar = motivo.trim() || "Solicitud de cambio generada sin motivo explícito.";

        const medicoReceptorId = turnoDeseado.ID_Medico;

        const solicitudDTO = {
            turnoDeseadoId: Number(turnoDeseado.id),
            turnoPropioId: Number(turnoAIntercambiar.id),
            motivo: motivoParaEnviar,
            medicoReceptorId: Number(medicoReceptorId),
        };

        try {
            await axiosInstance.post(`/solicitudes/intercambio/${medicoId}`, solicitudDTO);

            alert('Solicitud de cambio de turno enviada con éxito.');
            try { await refresh(); } catch (e) { console.warn('refresh failed', e); }
            navigate('/solicitudes');
        } catch (error) {
            console.error("Error al enviar solicitud de cambio:", error);

            const errorMessage = error.response?.data?.message
                || error.response?.data
                || error.message
                || 'Error al enviar la solicitud de cambio';

            alert(`Error al enviar la solicitud: ${errorMessage}`);
        } finally {
            setIsSubmitting(false);
        }
    };


    if (isLoading) {
        return (
            <div className="formulario-overlay root-solicitud-cambio">
                <div className="formulario-card">
                    <div className="formulario-header"><h3>Cargando Turnos...</h3></div>
                    <div className="formulario-body"><p>Por favor espere mientras cargamos los turnos disponibles.</p></div>
                </div>
            </div>
        );
    }

    // Usamos la lista filtrada de turnos propios para determinar si se puede iniciar la solicitud
    if (turnosPropiosFiltrados.length === 0) {
        return (
            <div className="formulario-overlay root-solicitud-cambio">
                <div className="formulario-card">
                    <div className="formulario-header"><h3>Solicitar Cambio</h3></div>
                    <div className="formulario-body">
                        <p>No tienes **turnos propios futuros o de hoy** asignados para iniciar una solicitud de intercambio.</p>
                    </div>
                    <div className="formulario-footer"><button className="btn-cancelar" onClick={handleCancelar}>Volver</button></div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="formulario-overlay root-solicitud-cambio">
                <div className="formulario-card">
                    <div className="formulario-header"><h3>Error de Carga</h3></div>
                    <div className="formulario-body"><p>{error}</p></div>
                    <div className="formulario-footer"><button className="btn-cancelar" onClick={fetchTurnosYMedicos}>Reintentar</button><button className="btn-cancelar" onClick={handleCancelar}>Volver</button></div>
                </div>
            </div>
        );
    }

    return (
        <div className="formulario-overlay root-solicitud-cambio root-solicitud-cambio-movil">
            <div className="formulario-card">
                <div className="formulario-header">
                    <h3>Solicitar Cambio</h3>
                    <button className="close-btn" onClick={handleCancelar} disabled={isSubmitting}>&times;</button>
                </div>

                <div className="formulario-body">
                    {/* Turno Deseado (Turnos de otros) */}
                    <TurnoSelector
                        label="Turno Deseado (Del colega)"
                        turnoSeleccionado={turnoDeseado}
                        onSelect={setTurnoDeseado}
                        turnos={turnosOtrosFiltrados}
                        formatDetail={getFormattedDetail}
                        pisosMap={pisosMap}
                        mapaColores={pisosColorMap}
                    />

                    {/* Turno a Intercambiar (Turnos Propios) */}
                    <TurnoSelector
                        label="Turno a Intercambiar (Propio)"
                        turnoSeleccionado={turnoAIntercambiar}
                        onSelect={setTurnoAIntercambiar}
                        turnos={turnosPropiosFiltrados}
                        formatDetail={getFormattedDetail}
                        pisosMap={pisosMap}
                        mapaColores={pisosColorMap}
                    />

                    <div className="form-section">
                        <label htmlFor="motivo">Motivo del cambio</label>
                        <textarea
                            id="motivo"
                            value={motivo}
                            onChange={(event) => setMotivo(event.target.value)}
                            rows="4"
                            placeholder="Explica por que necesitas este cambio..."
                            disabled={isSubmitting}
                        ></textarea>
                    </div>
                </div>

                <div className="formulario-footer">
                    <button className="btn-cancelar" onClick={handleCancelar} disabled={isSubmitting}>CANCELAR</button>
                    <button
                        className="btn-solicitar"
                        onClick={handleSolicitar}
                        disabled={isSubmitting || !turnoDeseado || !turnoAIntercambiar}
                    >
                        {isSubmitting ? 'SOLICITANDO...' : 'SOLICITAR CAMBIO'}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default SolicitudesCambio;