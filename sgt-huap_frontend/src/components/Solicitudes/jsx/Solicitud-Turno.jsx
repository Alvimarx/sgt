import React, { useState, useMemo, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import dayjs from "dayjs";
import { useAuth, Roles } from "../../../context/AuthContext";
import { useNotifications } from '../../../context/NotificationContext';
import axiosInstance from "../../../utils/axiosConfig";
// Importamos solo las funciones matemáticas, ya no colores fijos
import { getTextColor, groupTurnosByPasillo, lightenColor } from "../../../utils/pasilloColors";

// Estilos segun dispositivo
import "../../shared/css/Base-Calendario-Turnos.css";
import "../css/movil/Solicitud-Turno-Movil.css";
import "../css/pc/Solicitud-Turno-Pc.css";
import "../css/tablet/Solicitud-Turno-Tablet.css";

// Formatos de texto
const formatTurnoResumen = (turno, pisosMap = {}) => {
    const pisoNombre = pisosMap[turno.rawIdPiso] || turno.Seccion || "Sin piso";
    //Fecha en negrita
    return `Piso: ${pisoNombre} | Dia: <strong>${dayjs(turno.Dia).format('DD/MM/YYYY')}</strong> | ${(turno.Hora_inicio || "").slice(0, 5)}-${(turno.Hora_fin || "").slice(0, 5)}`;
};

const formatTurnoCoberturaDetalle = (turno, pisosMap = {}) => {
    //Fecha en negrita
    const fechaTurno = `<strong>${dayjs(turno.Dia).format('DD-MM-YYYY')}</strong>`;
    const tipoTurno = turno.TipoTurno || "Sin Especificar";
    const pisoNombre = pisosMap[turno.rawIdPiso] || turno.Seccion || "Sin Piso";
    return `${fechaTurno} (${(turno.Hora_inicio || "").slice(0, 5)} ) | ${tipoTurno} | Piso: ${pisoNombre}`;
};

// ==========================
//  COMPONENTE SELECTOR
// ==========================
function TurnoSelector({ label, turnoSeleccionado, onSelect, turnos, formatDetail, mapaColores, pisosNombresMap = {} }) {
    const [mostrarMenu, setMostrarMenu] = useState(false);
    const [vista, setVista] = useState("Listado");
    const [currentDate, setCurrentDate] = useState(dayjs());

    const safeTurnos = turnos || [];

    // Generar días del calendario
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

    // Agrupar turnos por fecha para el calendario
    const turnosMap = useMemo(() => {
        return safeTurnos.reduce((acc, turno) => {
            const key = dayjs(turno.Dia).format("YYYY-MM-DD");
            if (!acc[key]) acc[key] = [];
            acc[key].push(turno);
            return acc;
        }, {});
    }, [safeTurnos]);

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
                    {["LUN", "MAR", "MIE", "JUE", "VIE", "SAB", "DOM"].map((d) => (
                        <div key={d} className="calendar-weekday-sticky">{d}</div>
                    ))}

                    {days.map((dayItem, index) => {
                        const dateKey = dayItem.format("YYYY-MM-DD");
                        const listaTurnos = turnosMap[dateKey] || [];
                        const cellClass = dayItem.month() === currentDate.month() ? "current-month" : "other-month";

                        return (
                            <div key={`${dateKey}-${index}`} className={`calendar-cell ${cellClass}`}>
                                <span className="day-number">{dayItem.format("D")}</span>
                                {groupTurnosByPasillo(listaTurnos, pisosNombresMap).map((grupo) => {
                                    const primerTurno = grupo.turnos[0];
                                    const colorHex = mapaColores[primerTurno.rawIdPiso] || "#999999";

                                    const headerText = getTextColor(colorHex);
                                    const itemBackground = lightenColor(colorHex, 0.45);
                                    const itemText = getTextColor(itemBackground);

                                    return (
                                        <div key={`grupo-${grupo.key}`} className="turno-box" style={{ borderColor: colorHex }}>
                                            <div className="turno-box-header" style={{ backgroundColor: colorHex, color: headerText }}>
                                                {grupo.label}
                                            </div>
                                            <div className="turno-box-content">
                                                {grupo.turnos.map((turno, turnoIdx) => (
                                                    <div
                                                        key={`${grupo.key}-${turno.id ?? turnoIdx}`}
                                                        className={`turno-box-entry ${turnoSeleccionado?.id === turno.id ? 'selected-turno' : ''}`}
                                                        style={{ backgroundColor: itemBackground, color: itemText }}
                                                        onClick={() => handleSeleccion(turno)}
                                                    >
                                                        <span className="turno-horario">{`${(turno.Hora_inicio || "").slice(0, 5)}`}</span>
                                                        {turno.TipoTurno && <span className="turno-tipo">{turno.TipoTurno}</span>}
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
            <button type="button" className="btn-seleccionar-turno" onClick={() => setMostrarMenu(!mostrarMenu)} disabled={safeTurnos.length === 0}>
                {turnoSeleccionado ? (
                    <span dangerouslySetInnerHTML={{ __html: formatTurnoResumen(turnoSeleccionado, pisosNombresMap) }} />
                ) : (
                    "Seleccionar turno"
                )}
            </button>
            {mostrarMenu && safeTurnos.length > 0 && (
                <div className="menu-turnos">
                    <div className="menu-vista">
                        <button type="button" className={`vista-btn ${vista === "Listado" ? "activo" : ""}`} onClick={() => setVista("Listado")}>Listado</button>
                        <button type="button" className={`vista-btn ${vista === "Calendario" ? "activo" : ""}`} onClick={() => setVista("Calendario")}>Calendario</button>
                    </div>
                    {vista === "Listado" && (
                        <ul className="lista-turnos">
                            {safeTurnos.map((turno, index) => (
                                <li
                                    key={turno.id || index}
                                    className={`turno-item ${turnoSeleccionado?.id === turno.id ? 'seleccionado' : ''}`}
                                    onClick={() => handleSeleccion(turno)}
                                >
                                    <span dangerouslySetInnerHTML={{
                                        __html: formatDetail ? formatDetail(turno, pisosNombresMap) : formatTurnoResumen(turno, pisosNombresMap)
                                    }} />
                                </li>
                            ))}
                        </ul>
                    )}
                    {vista === "Calendario" && renderCalendar()}
                </div>
            )}
            {mostrarMenu && safeTurnos.length === 0 && <div className="menu-turnos"><p>No hay turnos disponibles.</p></div>}
        </div>
    );
}

// ==========================
//  COMPONENTE PRINCIPAL
// ==========================
function SolicitudTurno() {
    const navigate = useNavigate();
    const location = useLocation();
    const auth = useAuth();

    let medicoId = auth?.user?.id;
    if (!medicoId) {
        const rawUserId = localStorage.getItem('userId');
        medicoId = rawUserId ? parseInt(rawUserId, 10) : null;
    }

    // OBTENER SERVICIO ID DEL LOCAL STORAGE
    const servicioId = localStorage.getItem('servicioId');

    const [allTurnos, setAllTurnos] = useState([]);

    // Este mapa guardará ID_PISO -> NOMBRE PISO
    const [pisosNombresMap, setPisosNombresMap] = useState({});
    // Este mapa guardará ID_PISO -> COLOR HEXA (NUEVO)
    const [pisosColorMap, setPisosColorMap] = useState({});

    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [turnoSeleccionado, setTurnoSeleccionado] = useState(null);
    const [motivo, setMotivo] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // ----------------------------------------------------
    // Filtrado y ordenamiento de turnos (Hoy y Futuros, por Día y Piso)
    // ----------------------------------------------------
    const turnosFiltradosYOrdenados = useMemo(() => {
        const today = dayjs().startOf('day');

        // 1. FILTRAR: Quitar turnos pasados
        const futurosYHoy = allTurnos.filter(turno =>
            dayjs(turno.Dia).isSame(today, 'day') || dayjs(turno.Dia).isAfter(today, 'day')
        );

        // 2. ORDENAR: Por día (ascendente) y luego por Piso
        const ordenados = futurosYHoy.sort((a, b) => {
            // Ordenar por fecha (Dia)
            const dateA = dayjs(a.Dia);
            const dateB = dayjs(b.Dia);
            if (dateA.isBefore(dateB, 'day')) return -1;
            if (dateA.isAfter(dateB, 'day')) return 1;

            // Si el día es el mismo, ordenar por Piso
            if (a.rawIdPiso < b.rawIdPiso) return -1;
            if (a.rawIdPiso > b.rawIdPiso) return 1;

            // Si el día y el piso son iguales, ordenar por hora de inicio
            if (a.Hora_inicio < b.Hora_inicio) return -1;
            if (a.Hora_inicio > b.Hora_inicio) return 1;

            return 0;
        });

        return ordenados;
    }, [allTurnos]);
    // ----------------------------------------------------

    // 1. Cargar Pisos del Servicio (Con Colores)
    useEffect(() => {
        const fetchPisos = async () => {
            if (!servicioId) {
                console.error("No se encontró servicioId en localStorage");
                return;
            }
            try {
                const response = await axiosInstance.get(`/pisos/servicio/${servicioId}`);

                const mapNombres = {};
                const mapColores = {};

                response.data.forEach(piso => {
                    const idStr = String(piso.id);
                    mapNombres[idStr] = piso.nombre;
                    mapColores[idStr] = piso.colorHexa || "#CCCCCC";
                });

                setPisosNombresMap(mapNombres);
                setPisosColorMap(mapColores);

            } catch (error) {
                console.error("Error al cargar pisos:", error);
            }
        };

        fetchPisos();
    }, [servicioId]);

    const { refresh } = useNotifications();

    // 2. Cargar Turnos del Servicio
    const fetchAllTurnos = useCallback(async () => {
        if (!servicioId) return;

        setIsLoading(true);
        setError(null);

        try {
            // Usamos endpoint filtrado por servicio
            const turnosResponse = await axiosInstance.get(`/turnos/servicio/${servicioId}/sin-asignar`);

            const turnosFromApi = turnosResponse.data.map((turno) => ({
                id: turno.id,
                id_medico: turno.idMedico,
                rawIdPiso: String(turno.idPiso), // <--- IMPORTANTE: Siempre string
                Seccion: pisosNombresMap[turno.idPiso] || `Piso ${turno.idPiso}`,
                Dia: turno.diaInicioTurno,
                Hora_inicio: turno.horaInicio,
                Hora_fin: turno.horaFin,
                TipoTurno: turno.tipoTurno || "Asignado",
                ID_Medico: turno.idMedico
            }));

            setAllTurnos(turnosFromApi);

        } catch (err) {
            console.error("Error al cargar turnos disponibles:", err);
            setError("No se pudieron cargar los turnos del servicio.");
        } finally {
            setIsLoading(false);
        }
    }, [servicioId, pisosNombresMap]);

    // Esperar a tener los pisos antes de cargar turnos
    useEffect(() => {
        if (Object.keys(pisosNombresMap).length > 0) {
            fetchAllTurnos();
        }
    }, [pisosNombresMap, fetchAllTurnos, servicioId]);

    // Pre-seleccionar turno desde la navegación
    useEffect(() => {
        // Verificamos si hay datos en el state y si los turnos ya cargaron de la API
        if (location.state?.turnoDisponible && allTurnos.length > 0) {
            const dataCale = location.state.turnoDisponible;

            const turnoMatch = allTurnos.find(t => {
                //Intentar por ID 
                if (t.id && dataCale.id && Number(t.id) === Number(dataCale.id)) return true;

                const fechaCale = dataCale.dia_inicio_turno || dataCale.diaInicioTurno || dataCale.Dia;
                const mismaFecha = dayjs(t.Dia).format('YYYY-MM-DD') === dayjs(fechaCale).format('YYYY-MM-DD');

                const mismoPiso = String(t.rawIdPiso) === String(dataCale.id_piso || dataCale.idPiso || dataCale.rawIdPiso);
                const mismaHora = String(t.Hora_inicio).trim() === String(dataCale.hora_inicio || dataCale.horaInicio || dataCale.Hora_inicio).trim();

                return mismaFecha && mismoPiso && mismaHora;
            });

            if (turnoMatch) {
                setTurnoSeleccionado(turnoMatch);
                setMotivo("Solicitud de cobertura generada desde el Calendario.");

                // Limpiamos el state para evitar que se quede pegado al recargar
                navigate(location.pathname, { replace: true, state: {} });
            }
        }
    }, [location.state, allTurnos, navigate, location.pathname]);

    const handleCancelar = () => navigate('/solicitudes');

    const handleSolicitar = async () => {
        if (!medicoId) { alert("Error: ID de médico no disponible."); return; }
        if (isSubmitting) return;
        if (!turnoSeleccionado?.id) { alert("Debe seleccionar un turno."); return; }

        setIsSubmitting(true);
        const motivoParaEnviar = motivo.trim() || "Solicito cobertura para este turno.";
        const solicitudDTO = { turnoSolicitadoId: Number(turnoSeleccionado.id), motivo: motivoParaEnviar };

        try {
            await axiosInstance.post(`/solicitudes/cobertura/${medicoId}`, solicitudDTO);
            alert('Solicitud enviada con éxito.');
            try { await refresh(); } catch (e) { console.warn('refresh failed', e); }
            navigate('/solicitudes');
        } catch (error) {
            const msg = error.response?.data?.message || error.message || 'Error al enviar';
            alert(`Error: ${msg}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading) return <div className="formulario-overlay"><div className="formulario-card"><h3>Cargando...</h3></div></div>;
    if (error) return <div className="formulario-overlay"><div className="formulario-card"><h3>Error</h3><p>{error}</p><button onClick={handleCancelar}>Volver</button></div></div>;
    // Usamos la lista filtrada para el conteo de turnos visibles
    if (turnosFiltradosYOrdenados.length === 0) return <div className="formulario-overlay"><div className="formulario-card"><h3>Sin Turnos</h3><p>No hay turnos disponibles ni futuros en este servicio.</p><button className="btn-cancelar" onClick={handleCancelar}>Volver</button></div></div>;

    return (
        <div className="formulario-overlay root-solicitud-turno-pc root-solicitud-turno-movil">
            <div className="formulario-card">
                <div className="formulario-header">
                    <h3>Solicitud de turnos disponibles</h3>
                    <button className="close-btn" onClick={handleCancelar} disabled={isSubmitting}>&times;</button>
                </div>
                <div className="formulario-body">
                    <TurnoSelector
                        label="Seleccione un turno"
                        turnoSeleccionado={turnoSeleccionado}
                        onSelect={setTurnoSeleccionado}
                        // ✅ PASAMOS LA LISTA FILTRADA Y ORDENADA
                        turnos={turnosFiltradosYOrdenados}
                        formatDetail={(turno) => formatTurnoCoberturaDetalle(turno, pisosNombresMap)}
                        mapaColores={pisosColorMap}
                        pisosNombresMap={pisosNombresMap}
                    />
                    <div className="form-section">
                        <label htmlFor="motivo">Motivo (opcional)</label>
                        <textarea id="motivo" value={motivo} onChange={(e) => setMotivo(e.target.value)} rows="4" disabled={isSubmitting}></textarea>
                    </div>
                </div>
                <div className="formulario-footer">
                    <button className="btn-cancelar" onClick={handleCancelar} disabled={isSubmitting}>CANCELAR</button>
                    <button className="btn-solicitar" onClick={handleSolicitar} disabled={isSubmitting || !turnoSeleccionado}>
                        {isSubmitting ? 'ENVIANDO...' : 'ENVIAR'}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default SolicitudTurno;