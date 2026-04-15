import React, { useState, useEffect, useMemo, useRef } from "react";
import { useMediaQuery } from "react-responsive";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import Menu from "../../Menu/jsx/Menu.jsx";
import dayjs from "dayjs";
import "dayjs/locale/es";
import { getPasilloColor, getTextColor, groupTurnosByPasillo, lightenColor } from "../../../utils/pasilloColors";
import { useAuth } from "../../../context/AuthContext";
import axiosInstance from "../../../utils/axiosConfig";
import localizedFormat from 'dayjs/plugin/localizedFormat';

// Configure dayjs to use Spanish locale
dayjs.extend(localizedFormat);
dayjs.locale("es");

// Estilos (Se asume que estos archivos existen)
import "../../shared/css/Base-Calendario-Turnos.css";
import "../css/pc/Turnos-PC.css";
import "../css/tablet/Turnos-Tablet.css";
import "../css/movil/Turnos-Movil.css";

export default function Turnos() {
    const [activeSection, setActiveSection] = useState("misTurnos");
    const [currentDate, setCurrentDate] = useState(dayjs());
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuth();

    const [misTurnos, setMisTurnos] = useState([]);
    const [turnosDisponibles, setTurnosDisponibles] = useState([]);
    const [turnosSinAsignar, setTurnosSinAsignar] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [isDropdownSinAsignarOpen, setIsDropdownSinAsignarOpen] = useState(false);
    const [pisoColors, setPisoColors] = useState({});
    const [pisoNames, setPisoNames] = useState({}); // Dynamic mapping for floor names
    const [alertMessage, setAlertMessage] = useState(null);

    // Filter states for "Mis turnos"
    const [selectedDays, setSelectedDays] = useState([]);
    const [selectedMonths, setSelectedMonths] = useState([]);
    const [selectedTimeRanges, setSelectedTimeRanges] = useState([]);
    const [isFiltersOpen, setIsFiltersOpen] = useState(false);

    // Filter options

    const DAYS_OF_WEEK = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
    const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    const TIME_RANGES = [
        { label: '00:00-05:59', start: '00:00', end: '05:59' },
        { label: '06:00-11:59', start: '06:00', end: '11:59' },
        { label: '12:00-17:59', start: '12:00', end: '17:59' },
        { label: '18:00-23:59', start: '18:00', end: '23:59' }
    ];

    // Transform backend turno data to component format
    const transformBackendTurno = (backendTurno, pisoColorsMap, pisoNamesMap) => {
        // Format the section/piso using the dynamic mapping
        // Fallback to 'SIN ASIGNAR' if not found
        const seccion = backendTurno.idPiso && pisoNamesMap[backendTurno.idPiso]
            ? pisoNamesMap[backendTurno.idPiso].toUpperCase()
            : 'SIN ASIGNAR';

        // Format time (remove seconds from HH:MM:SS)
        const formatTime = (time) => {
            if (!time) return '00:00';
            return time.substring(0, 5); // "09:00:00" -> "09:00"
        };

        // Get color from pisoColors mapping based on idPiso
        const colorHexa = pisoColorsMap[backendTurno.idPiso] || '#6c757d'; // Default gray if no color

        return {
            Seccion: seccion, // Now holds the dynamic name
            idPiso: backendTurno.idPiso, // Keep the ID for reference
            Dia: backendTurno.diaInicioTurno,
            Hora_inicio: formatTime(backendTurno.horaInicio),
            Hora_fin: formatTime(backendTurno.horaFin),
            TipoTurno: backendTurno.tipoTurno || 'Sin tipo',
            RepeticionSemanas: 1, // Default to 1 week repetition
            ColorHexa: colorHexa,
            _original: backendTurno // Store original backend data
        };
    };

    useEffect(() => {
        const fetchData = async () => {
            if (!user?.userId) {
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                setError(null);

                // First, fetch pisos to get the colors AND names
                const pisosResponse = await axiosInstance.get('/pisos');

                // Create a mapping of piso ID to color AND name
                const colorsMap = {};
                const namesMap = {};
                (pisosResponse.data || []).forEach(piso => {
                    colorsMap[piso.id] = piso.colorHexa;
                    namesMap[piso.id] = piso.nombre;
                });
                setPisoColors(colorsMap);
                setPisoNames(namesMap);

                // Fetch user's turnos from the endpoint
                const turnosResponse = await axiosInstance.get(`/turnos/get-turnos-by-user/${user.userId}`);

                // Transform backend data to component format with colors and names
                const transformedTurnos = (turnosResponse.data || []).map(turno =>
                    transformBackendTurno(turno, colorsMap, namesMap)
                );
                setMisTurnos(transformedTurnos);

                // Use the same data for the list (no separate disponibles endpoint needed)
                setTurnosDisponibles(transformedTurnos);

                // Fetch turnos sin asignar if user has a serviceId
                if (user?.servicioId) {
                    const turnosSinAsignarResponse = await axiosInstance.get(`/turnos/servicio/${user.servicioId}/sin-asignar`);

                    // Transform backend data to component format with colors and names
                    const transformedTurnosSinAsignar = (turnosSinAsignarResponse.data || []).map(turno =>
                        transformBackendTurno(turno, colorsMap, namesMap)
                    );
                    setTurnosSinAsignar(transformedTurnosSinAsignar);
                }
            } catch (err) {
                console.error("Error fetching data:", err);
                setError(err.message || "Error al cargar los datos");
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [user?.userId, user?.servicioId]);

    // 1. Lógica para capturar la alerta al redirigir (BUSCA instructionMessage)
    useEffect(() => {
        const incomingMessage = location.state?.message || location.state?.instructionMessage;

        if (incomingMessage) {
            setAlertMessage(incomingMessage);

            // Limpiamos el estado de la URL
            navigate(location.pathname, { replace: true, state: {} });
        }
    }, [location.state, navigate, location.pathname]);

    // 2. Lógica para auto-eliminar la alerta después de 5 segundos
    useEffect(() => {
        if (alertMessage) {
            const timer = setTimeout(() => {
                setAlertMessage(null); // Ocultar después de 5 segundos
            }, 3000);

            return () => clearTimeout(timer); // Limpieza
        }
    }, [alertMessage]);

    // --------------------------
    // Generar calendario (Mis Turnos)
    // --------------------------
    const startOfMonth = currentDate.startOf("month");
    const endOfMonth = currentDate.endOf("month");
    const startDate = startOfMonth.startOf("week");
    const endDate = endOfMonth.endOf("week");

    const days = [];
    let day = startDate.clone();
    while (day.isBefore(endDate, "day") || day.isSame(endDate, "day")) {
        days.push(day);
        day = day.add(1, "day");
    }

    // Expandir turnos con repetición
    const expandTurnos = () => {
        let expanded = [];
        misTurnos.forEach((t) => {
            const baseDate = dayjs(t.Dia);
            expanded.push({ ...t, Dia: baseDate });
            if (t.RepeticionSemanas && t.RepeticionSemanas > 1) {
                for (let i = 1; i < t.RepeticionSemanas; i++) {
                    expanded.push({ ...t, Dia: baseDate.add(i, "week") });
                }
            }
        });
        return expanded;
    };
    const allMisTurnos = expandTurnos();

    // Indexar turnos por día
    const turnosMap = {};
    allMisTurnos.forEach((t) => {
        const key = dayjs(t.Dia).format("YYYY-MM-DD");
        if (!turnosMap[key]) turnosMap[key] = [];
        turnosMap[key].push(t);
    });

    const prevMonth = () => setCurrentDate(currentDate.subtract(1, "month"));
    const nextMonth = () => setCurrentDate(currentDate.add(1, "month"));
    // ----------------------------------------------------------------------------------

    const renderCalendar = () => (
        <div className="calendar-container">
            <div className="calendar-header">
                <button onClick={prevMonth}>&lt;</button>
                <h3>{currentDate.format("MMMM YYYY").charAt(0).toUpperCase() + currentDate.format("MMMM YYYY").slice(1)}</h3>
                <button onClick={nextMonth}>&gt;</button>
            </div>

            <div className="calendar-scroll">
                <div className="calendar-grid">
                    {/* Headers de días integrados en la malla (Sticky) */}
                    {["LUN", "MAR", "MIE", "JUE", "VIE", "SAB", "DOM"].map((d, idx) => (
                        <div key={idx} className="calendar-weekday-sticky">{d}</div>
                    ))}

                    {days.map((day, idx) => (
                        <div key={idx} className={`calendar-cell ${day.month() === currentDate.month() ? "current-month" : "other-month"}`}>
                            <span className="day-number">{day.format("D")}</span>
                            {groupTurnosByPasillo(turnosMap[day.format("YYYY-MM-DD")], pisoNames).map((grupo) => {
                                const baseColor = grupo.turnos[0]?.ColorHexa || getPasilloColor(grupo.label);
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
                                                    key={`turno-${grupo.key}-${turnoIdx}`}
                                                    className="turno-box-entry"
                                                    style={{ backgroundColor: itemBackground, color: itemText }}
                                                >
                                                    <span className="turno-horario">{turno.Hora_inicio} - {turno.Hora_fin}</span>
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
                    ))}
                </div>
            </div>
        </div>
    );

    const toggleDropdown = () => {
        const newState = !isDropdownOpen;
        setIsDropdownOpen(newState);
        // Close the other dropdown if this one is opening
        if (newState) {
            setIsDropdownSinAsignarOpen(false);
        }
    };

    const toggleDropdownSinAsignar = () => {
        const newState = !isDropdownSinAsignarOpen;
        setIsDropdownSinAsignarOpen(newState);
        // Close the other dropdown if this one is opening
        if (newState) {
            setIsDropdownOpen(false);
        }
    };

    const toggleDayFilter = (day) => {
        if (day === 'Todos') {
            setSelectedDays(DAYS_OF_WEEK);
        } else if (day === 'Ninguno') {
            setSelectedDays([]);
        } else {
            setSelectedDays(prev =>
                prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
            );
        }
    };

    const toggleMonthFilter = (month) => {
        if (month === 'Todos') {
            setSelectedMonths(MONTHS);
        } else if (month === 'Ninguno') {
            setSelectedMonths([]);
        } else {
            setSelectedMonths(prev =>
                prev.includes(month) ? prev.filter(m => m !== month) : [...prev, month]
            );
        }
    };

    const toggleTimeRangeFilter = (timeRange) => {
        setSelectedTimeRanges(prev =>
            prev.includes(timeRange) ? prev.filter(t => t !== timeRange) : [...prev, timeRange]
        );
    };

    const toggleFilters = () => {
        setIsFiltersOpen(!isFiltersOpen);
    };

    const handlePostularTurno = (turno) => {
        navigate('/solicitudes/turno', {
            state: { turnoDisponible: turno._original }
        });
    };

    const handleSoltarTurno = (turno) => {
        navigate('/solicitudes/botar-turno', {
            state: { turnoALiberar: turno._original }
        });
    };

    const handleOfrecerIntercambio = (turno) => {
        navigate('/solicitudes/cambio', {
            state: { turnoPropio: turno._original }
        });
    };

    const handleOfrecerTurno = (turno) => {
        navigate('/solicitudes/ofrecer', {
            state: { turnoPropio: turno._original }
        });
    };

    // Apply filters helper function
    const applyFilters = (turnos) => {
        let filtered = [...turnos];

        // Apply day filter
        if (selectedDays.length > 0) {
            filtered = filtered.filter(t => {
                const dayOfWeek = DAYS_OF_WEEK[dayjs(t.Dia).day() === 0 ? 6 : dayjs(t.Dia).day() - 1];
                return selectedDays.includes(dayOfWeek);
            });
        }

        // Apply month filter
        if (selectedMonths.length > 0) {
            filtered = filtered.filter(t => {
                const month = MONTHS[dayjs(t.Dia).month()];
                return selectedMonths.includes(month);
            });
        }

        // Apply time range filter
        if (selectedTimeRanges.length > 0) {
            filtered = filtered.filter(t => {
                const startTime = t.Hora_inicio;
                return selectedTimeRanges.some(range => {
                    const timeRange = TIME_RANGES.find(tr => tr.label === range);
                    return startTime >= timeRange.start && startTime <= timeRange.end;
                });
            });
        }

        return filtered;
    };

    const renderFilters = () => (
        <div className="filter-container light-scrollbar">
            <div className="filter-toggle-header" onClick={toggleFilters}>
                <h4>Filtros</h4>
                <span
                    className="filter-arrow"
                    style={{
                        transform: isFiltersOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 0.3s ease'
                    }}
                >
                    ▼
                </span>
            </div>
            {isFiltersOpen && (
                <div className="filter-section light-scrollbar">
                    <div className="filter-group">
                        <label className="filter-label">Dia</label>
                        <div className="filter-dropdown">
                            <select
                                multiple
                                value={selectedDays}
                                onChange={(e) => {
                                    const options = Array.from(e.target.selectedOptions, option => option.value);
                                    const lastSelected = options[options.length - 1];

                                    if (lastSelected === 'Todos') {
                                        setSelectedDays(DAYS_OF_WEEK);
                                    } else if (lastSelected === 'Ninguno') {
                                        setSelectedDays([]);
                                    } else {
                                        setSelectedDays(options.filter(opt => opt !== 'Todos' && opt !== 'Ninguno'));
                                    }
                                }}
                                className="filter-select light-scrollbar"
                            >
                                <option value="Todos">✓ Todos</option>
                                <option value="Ninguno">✗ Ninguno</option>
                                <option disabled>──────────</option>
                                {DAYS_OF_WEEK.map(day => (
                                    <option key={day} value={day}>{day}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="filter-group">
                        <label className="filter-label">Mes</label>
                        <div className="filter-dropdown">
                            <select
                                multiple
                                value={selectedMonths}
                                onChange={(e) => {
                                    const options = Array.from(e.target.selectedOptions, option => option.value);
                                    const lastSelected = options[options.length - 1];

                                    if (lastSelected === 'Todos') {
                                        setSelectedMonths(MONTHS);
                                    } else if (lastSelected === 'Ninguno') {
                                        setSelectedMonths([]);
                                    } else {
                                        setSelectedMonths(options.filter(opt => opt !== 'Todos' && opt !== 'Ninguno'));
                                    }
                                }}
                                className="filter-select light-scrollbar"
                            >
                                <option value="Todos">✓ Todos</option>
                                <option value="Ninguno">✗ Ninguno</option>
                                <option disabled>──────────</option>
                                {MONTHS.map(month => (
                                    <option key={month} value={month}>{month}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="filter-group">
                        <label className="filter-label">Hora de comienzo</label>
                        <div className="filter-dropdown">
                            <select
                                multiple
                                value={selectedTimeRanges}
                                onChange={(e) => {
                                    const options = Array.from(e.target.selectedOptions, option => option.value);
                                    setSelectedTimeRanges(options);
                                }}
                                className="filter-select light-scrollbar"
                            >
                                {TIME_RANGES.map(range => (
                                    <option key={range.label} value={range.label}>{range.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );

    const renderTurnosDisponibles = () => {
        // Sort shifts by date (most recent first)
        let sortedTurnos = [...turnosDisponibles].sort((a, b) => {
            return dayjs(a.Dia).valueOf() - dayjs(b.Dia).valueOf();
        });

        // Apply filters
        sortedTurnos = applyFilters(sortedTurnos);

        return (
            <div className={`turnos-dropdown-container ${isDropdownOpen ? 'dropdown-expanded' : 'dropdown-collapsed'}`}>
                <div className="turnos-dropdown-header" onClick={toggleDropdown}>
                    <h3>Mis turnos ({sortedTurnos.length})</h3>
                    <span
                        className="dropdown-arrow"
                        style={{
                            transform: isDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                            transition: 'transform 0.3s ease'
                        }}
                    >
                        ▼
                    </span>
                </div>
                {isDropdownOpen && (
                    <ul className="turnos-disponibles-list">
                        {sortedTurnos.length > 0 ? (
                            sortedTurnos.map((t, idx) => {
                                // Apply a light shade of the piso color to the container
                                const containerColor = lightenColor(t.ColorHexa, 0.7);
                                return (
                                    <li
                                        key={idx}
                                        className="turno-disponible"
                                        style={{
                                            backgroundColor: containerColor,
                                            border: `2px solid ${t.ColorHexa}`
                                        }}
                                    >
                                        <div className="turno-disponible-info">
                                            <div className="turno-info-badges">
                                                <span className="turno-badge">
                                                    <strong>Piso:</strong> {t.Seccion}
                                                </span>
                                                <span className="turno-badge">
                                                    <strong>Día:</strong> {dayjs(t.Dia).format("DD/MM/YYYY")}
                                                </span>
                                                <span className="turno-badge">
                                                    <strong>Hora:</strong> {t.Hora_inicio} - {t.Hora_fin}
                                                </span>
                                                <span className="turno-badge">
                                                    <strong>Tipo de turno:</strong> {t.TipoTurno}
                                                </span>
                                            </div>
                                            <div className="turno-disponible-actions">
                                                <button
                                                    className="btn-soltar-turno"
                                                    onClick={() => handleSoltarTurno(t)}
                                                >
                                                    Eliminar turno
                                                </button>
                                                <button
                                                    className="btn-ofrecer-intercambio"
                                                    onClick={() => handleOfrecerIntercambio(t)}
                                                >
                                                    Intercambiar turno
                                                </button>
                                                <button
                                                    className="btn-ofrecer-turno"
                                                    onClick={() => handleOfrecerTurno(t)}
                                                >
                                                    Ofrecer turno
                                                </button>
                                            </div>
                                        </div>
                                    </li>
                                );
                            })
                        ) : (
                            <li className="turno-disponible">
                                <div className="turno-disponible-info">
                                    <p>No tienes turnos asignados</p>
                                </div>
                            </li>
                        )}
                    </ul>
                )}
            </div>
        );
    };

    const renderTurnosSinAsignar = () => {
        // Sort shifts by date (most recent first)
        let sortedTurnos = [...turnosSinAsignar].sort((a, b) => {
            return dayjs(a.Dia).valueOf() - dayjs(b.Dia).valueOf();
        });

        // Apply filters
        sortedTurnos = applyFilters(sortedTurnos);

        return (
            <div className={`turnos-dropdown-container ${isDropdownSinAsignarOpen ? 'dropdown-expanded' : 'dropdown-collapsed'}`}>
                <div className="turnos-dropdown-header" onClick={toggleDropdownSinAsignar}>
                    <h3>Turnos Disponibles ({sortedTurnos.length})</h3>
                    <span
                        className="dropdown-arrow"
                        style={{
                            transform: isDropdownSinAsignarOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                            transition: 'transform 0.3s ease'
                        }}
                    >
                        ▼
                    </span>
                </div>
                {isDropdownSinAsignarOpen && (
                    <ul className="turnos-disponibles-list">
                        {sortedTurnos.length > 0 ? (
                            sortedTurnos.map((t, idx) => {
                                // Apply a light shade of green to the container
                                const containerColor = '#d4edda'; // Light green shade
                                const borderColor = '#28a745'; // Actual green color
                                return (
                                    <li
                                        key={idx}
                                        className="turno-disponible turno-sin-asignar"
                                        style={{
                                            backgroundColor: containerColor,
                                            border: `2px solid ${borderColor}`
                                        }}
                                    >
                                        <div className="turno-disponible-info">
                                            <div className="turno-info-badges">
                                                <span className="turno-badge">
                                                    <strong>Piso:</strong> {t.Seccion}
                                                </span>
                                                <span className="turno-badge">
                                                    <strong>Día:</strong> {dayjs(t.Dia).format("DD/MM/YYYY")}
                                                </span>
                                                <span className="turno-badge">
                                                    <strong>Hora:</strong> {t.Hora_inicio} - {t.Hora_fin}
                                                </span>
                                                <span className="turno-badge">
                                                    <strong>Tipo de turno:</strong> {t.TipoTurno}
                                                </span>
                                            </div>
                                            <div className="turno-disponible-actions">
                                                <button
                                                    className="btn-postular-turno"
                                                    onClick={() => handlePostularTurno(t)}
                                                >
                                                    Postular a turno
                                                </button>
                                                <button
                                                    className="btn-ofrecer-turno"
                                                    onClick={() => handleOfrecerTurno(t)}
                                                >
                                                    Ofrecer turno
                                                </button>
                                            </div>
                                        </div>
                                    </li>
                                );
                            })
                        ) : (
                            <li className="turno-disponible">
                                <div className="turno-disponible-info">
                                    <p>No hay turnos disponibles</p>
                                </div>
                            </li>
                        )}
                    </ul>
                )}
            </div>
        );
    };

    // --------------------------
    // Render principal
    // --------------------------
    const isMobile = useMediaQuery({ maxWidth: 768 });
    const isTablet = useMediaQuery({ minWidth: 769, maxWidth: 1024 });
    const isDesktop = useMediaQuery({ minWidth: 1025 });

    return (
        <React.Fragment>
            <Menu />
            <div className={`turnos-root ${isMobile ? "mobile" : "desktop"}`}>
                <header className="turnos-header">
                    <h2>Gestión de Turnos</h2>
                </header>

                {/* Bloque de Alerta: Solo se muestra si hay alertMessage */}
                {alertMessage && (
                    <div className="custom-warning-box">
                        <span className="warning-icon">⚠️</span>
                        <span className="warning-text">{alertMessage}</span>
                        <button className="close-warning-btn" onClick={() => setAlertMessage(null)}>
                            &times;
                        </button>
                    </div>
                )}

                {loading && (
                    <div style={{ padding: "20px", textAlign: "center" }}>
                        Cargando turnos...
                    </div>
                )}

                {error && (
                    <div style={{ padding: "20px", textAlign: "center", color: "red" }}>
                        Error: {error}
                    </div>
                )}

                {!loading && !error && (
                    <React.Fragment>

                        {(isDesktop || isTablet) && (
                            <div className="turnos-layout">
                                <div className="mis-turnos">
                                    {renderCalendar()}
                                </div>
                                <div className="turnos-disponibles">
                                    {renderFilters()}
                                    {renderTurnosDisponibles()}
                                    {renderTurnosSinAsignar()}
                                </div>
                            </div>
                        )}
                        {isMobile && (
                            <div className="turnos-mobile">
                                <div className="turnos-tabs">
                                    <button
                                        className={activeSection === "misTurnos" ? "active" : ""}
                                        onClick={() => setActiveSection("misTurnos")}
                                    >
                                        Mis Turnos
                                    </button>
                                    <button
                                        className={activeSection === "disponibles" ? "active" : ""}
                                        onClick={() => setActiveSection("disponibles")}
                                    >
                                        Lista de Turnos
                                    </button>
                                </div>

                                <div className="turnos-mobile-content">
                                    {activeSection === "misTurnos" && renderCalendar()}
                                    {activeSection === "disponibles" && (
                                        <React.Fragment>
                                            {renderFilters()}
                                            {renderTurnosDisponibles()}
                                            {renderTurnosSinAsignar()}
                                        </React.Fragment>
                                    )}
                                </div>
                            </div>
                        )}
                    </React.Fragment>
                )}
            </div>
        </React.Fragment>
    );
}