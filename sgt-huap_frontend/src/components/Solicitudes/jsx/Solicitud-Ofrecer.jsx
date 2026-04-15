import React, { useState, useMemo, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import dayjs from "dayjs";
import { useAuth, Roles } from "../../../context/AuthContext";
import { useNotifications } from '../../../context/NotificationContext';
import axiosInstance from "../../../utils/axiosConfig";
import "../../shared/css/Base-Calendario-Turnos.css";
// estilos por dispositivo
import "../css/movil/Solicitud-Ofrecer-Movil.css";
import "../css/pc/Solicitud-Ofrecer-Pc.css";
import "../css/tablet/Solicitud-Ofrecer-Tablet.css";
import { getPasilloColor, getTextColor, groupTurnosByPasillo, lightenColor } from "../../../utils/pasilloColors";


// -------------------------------------
//  Formatters
// -------------------------------------
const formatTurnoResumen = (turno, pisosMap = {}) =>
    //Fecha en negrita
    `Piso: ${pisosMap[turno.Seccion] || "Sin piso"} | Día: <strong>${dayjs(turno.Dia).format('DD/MM/YYYY')}</strong> | ${(turno.Hora_inicio || "").slice(0, 5)}-${(turno.Hora_fin || "").slice(0, 5)}`;

const formatTurnoDetalle = (turno, medicosMap = {}, pisosMap = {}) => {
    const medicoId = turno.ID_Medico;

    let nombreMedico;
    if (!medicoId || medicoId === 0) {
        nombreMedico = "(NO ASIGNADO)";
    } else {
        nombreMedico = medicosMap[medicoId]
            ? medicosMap[medicoId]
            : `ID ${medicoId} (Desconocido)`;
    }

    const pisoNombre = pisosMap[turno.Seccion] || "Sin piso";
    //Fecha en negrita
    const fechaTurno = `<strong>${dayjs(turno.Dia).format('DD/MM/YYYY')}</strong>`;

    return `${fechaTurno} (${(turno.Hora_inicio || "").slice(0, 5)}-${(turno.Hora_fin || "").slice(0, 5)}) | Tipo: ${turno.TipoTurno} | Médico: ${nombreMedico} | Piso: ${pisoNombre} `;
};


// -------------------------------------
//   COMPONENTE TurnoSelector
// -------------------------------------
// -------------------------------------
//   COMPONENTE TurnoSelector
// -------------------------------------
function TurnoSelector({ label, turnoSeleccionado, onSelect, turnos, isSubmitting, formatDetail, pisosMap, mapaColores }) {
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
                disabled={isSubmitting || !turnos || turnos.length === 0}
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
                <div className="menu-turnos"><p>No hay turnos disponibles para ofrecer/publicar.</p></div>
            )}
        </div>
    );
}



// -------------------------------------------------------
//      COMPONENTE PRINCIPAL — SolicitudOfrecer
// -------------------------------------------------------
function SolicitudOfrecer() {
    const navigate = useNavigate();
    const location = useLocation();
    const auth = useAuth();
    const { refresh } = useNotifications();

    const isJefatura = auth.hasRole ? auth.hasRole([Roles.JEFATURA, Roles.JEFATURA_SUB]) : false;
    let medicoId = auth?.user?.id;

    if (!medicoId && !isJefatura) {
        const rawUserId = localStorage.getItem('userId');
        medicoId = rawUserId ? parseInt(rawUserId, 10) : null;
    }

    const [allTurnos, setAllTurnos] = useState([]);
    const [medicosMap, setMedicosMap] = useState({});
    const [medicosDisponibles, setMedicosDisponibles] = useState([]);
    const [pisosMap, setPisosMap] = useState({});
    const [pisosColorMap, setPisosColorMap] = useState({});
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    const [turnoSeleccionado, setTurnoSeleccionado] = useState(null);
    const [condiciones, setCondiciones] = useState("");
    const [medicoSeleccionado, setMedicoSeleccionado] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);


    // ----------------------------------------------------
    // Función genérica de filtrado y ordenamiento (Hoy y Futuros, por Día y Piso)
    // ----------------------------------------------------
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


    // -------------------------------------------------------
    //   Turnos propios o no asignados, FILTRADOS
    // -------------------------------------------------------
    const turnosParaOfrecerSinFiltro = useMemo(() => {
        if (isJefatura) {
            // Jefatura solo puede publicar turnos no asignados (ID_Medico = 0 o null)
            return allTurnos.filter(turno => !turno.ID_Medico || turno.ID_Medico === 0);
        }
        if (medicoId) {
            // Médico solo puede ofrecer sus propios turnos
            return allTurnos.filter(turno => turno.ID_Medico === medicoId);
        }
        return [];
    }, [medicoId, allTurnos, isJefatura]);

    // Aplicar el filtro de fecha (Hoy/Futuro) y ordenamiento
    const turnosFiltradosYOrdenados = useMemo(() => {
        return filterAndSortTurnos(turnosParaOfrecerSinFiltro);
    }, [turnosParaOfrecerSinFiltro, filterAndSortTurnos]);



    // -------------------------------------------------------
    //  PRE–CARGAR TURNO RECIBIDO DESDE EL CALENDARIO O TURNOS DISPONIBLES
    // -------------------------------------------------------
    useEffect(() => {
        if (location.state?.turnoPropio && allTurnos.length > 0) {
            const turnoPropio = location.state.turnoPropio;

            // Find the matching turno in allTurnos by comparing key fields
            const turnoMatch = allTurnos.find(t =>
                t.id === turnoPropio.id ||
                (t.Dia === turnoPropio.diaInicioTurno &&
                    t.Hora_inicio === turnoPropio.horaInicio &&
                    t.Hora_fin === turnoPropio.horaFin &&
                    t.Seccion === turnoPropio.idPiso)
            );

            if (turnoMatch) {
                setTurnoSeleccionado(turnoMatch);
                // Set a default message for condiciones
                setCondiciones("Turno ofrecido generado desde Mis Turnos. Puede aceptar cualquier médico interesado.");
            }
        }
    }, [location.state, allTurnos]);


    // -------------------------------------------------------
    //   FETCH de turnos y médicos
    // -------------------------------------------------------
    useEffect(() => {
        const cargarDatos = async () => {
            setIsLoading(true);
            setError(null);

            try {
                // Peticiones en paralelo para mayor eficiencia
                const [resUsuarios, resPisos] = await Promise.all([
                    axiosInstance.get(`/usuarios`).catch(() => ({ data: [] })),
                    axiosInstance.get(`/pisos`).catch(() => ({ data: [] }))
                ]);

                const usuarios = Array.isArray(resUsuarios.data) ? resUsuarios.data : [];
                const pisos = Array.isArray(resPisos.data) ? resPisos.data : [];

                //Identificar el servicio del médico actual para el filtrado
                const yo = usuarios.find(u => (u.id == medicoId || u.idPersonal == medicoId));
                const miServicioId = yo?.idServicio || yo?.id_servicio || yo?.idUnidad;

                //Mapeo de Pisos y Colores
                const mapPisos = {};
                const mapColores = {};
                pisos.forEach(p => {
                    if (p.id) {
                        mapPisos[p.id] = p.nombre;
                        mapColores[p.id] = p.colorHexa || "#999999";
                    }
                });
                setPisosMap(mapPisos);
                setPisosColorMap(mapColores);

                //Mapeo Global de Médicos
                const mapMedicos = {};
                usuarios.forEach(m => {
                    const id = m.id || m.idPersonal;
                    if (id) {
                        mapMedicos[id] = `${m.nombre || ''} ${m.apellidoPaterno || m.apel_pat || ''}`.trim();
                    }
                });
                setMedicosMap(mapMedicos);

                //Filtrar médicos: Mismo servicio y excluir al usuario actual
                const disponibles = usuarios
                    .filter(m => {
                        const mId = m.id || m.idPersonal;
                        const mServicioId = m.idServicio || m.id_servicio || m.idUnidad;

                        const noSoyYo = (mId != medicoId);
                        // Si no se detecta servicio, se muestran todos por seguridad
                        const esMismoServicio = miServicioId ? (mServicioId == miServicioId) : true;

                        return noSoyYo && esMismoServicio;
                    })
                    .map(m => ({
                        id: m.id || m.idPersonal,
                        nombre: `${m.nombre || ''} ${m.apellidoPaterno || m.apel_pat || ''}`.trim()
                    }));

                setMedicosDisponibles(disponibles);

                //Cargar Turnos si el usuario tiene permiso
                if (medicoId || isJefatura) {
                    const resTurnos = await axiosInstance.get(`/turnos/`);
                    const turnosData = Array.isArray(resTurnos.data) ? resTurnos.data : [];

                    const turnosMapeados = turnosData.map(t => ({
                        id: t.id,
                        id_medico: t.idMedico,
                        Seccion: t.idPiso,
                        Dia: t.diaInicioTurno,
                        Hora_inicio: t.horaInicio,
                        Hora_fin: t.horaFin,
                        TipoTurno: t.tipoTurno || "Asignado",
                        ID_Medico: t.idMedico
                    }));

                    setAllTurnos(turnosMapeados.filter(t => t.ID_Medico !== undefined));
                } else {
                    setAllTurnos([]);
                }

            } catch (err) {
                setError("Error al cargar la información de turnos y médicos.");
            } finally {
                setIsLoading(false);
            }
        };

        cargarDatos();
    }, [medicoId, isJefatura]);


    // -------------------------------------------------------
    //   Obtener detalle de turno
    // -------------------------------------------------------
    const getFormattedDetail = useCallback((turno) => {
        return formatTurnoDetalle(turno, medicosMap, pisosMap);
    }, [medicosMap, pisosMap]);


    // -------------------------------------------------------
    //   Cancelar
    // -------------------------------------------------------
    const handleCancelar = () => {
        navigate("/solicitudes");
    };


    // -------------------------------------------------------
    //   ENVIAR FORMULARIO
    // -------------------------------------------------------
    const handlePublicar = async (event) => {
        event.preventDefault();

        if (!medicoId && !isJefatura) {
            alert("Error: ID de médico no disponible y rol no autorizado.");
            return;
        }

        if (isSubmitting) return;

        if (!turnoSeleccionado) {
            alert("Debe seleccionar el turno que desea ofrecer.");
            return;
        }

        if (!isJefatura && turnoSeleccionado.ID_Medico !== medicoId) {
            alert("Error: El turno seleccionado no es tuyo. No puedes ofrecer el turno de un colega.");
            return;
        }

        if (isJefatura && (turnoSeleccionado.ID_Medico !== 0 && turnoSeleccionado.ID_Medico !== null)) {
            alert("Error: Como Jefatura, solo puedes publicar turnos que aún no tienen un médico asignado.");
            return;
        }

        setIsSubmitting(true);

        const solicitanteId = medicoId;

        const condicionesParaEnviar = condiciones.trim() || "Turno ofrecido sin condiciones adicionales.";
        const receptorId = medicoSeleccionado ? Number(medicoSeleccionado) : null;

        const solicitudDTO = {
            turnoOfrecidoId: Number(turnoSeleccionado.id),
            medicoReceptorId: receptorId,
            condiciones: condicionesParaEnviar,
        };

        try {
            await axiosInstance.post(`/solicitudes/oferta/${solicitanteId}`, solicitudDTO);
            alert('Oferta de turno publicada con éxito.');
            try { await refresh(); } catch (e) { console.warn('refresh failed', e); }
            navigate('/solicitudes');
        } catch (error) {
            console.error("Error al publicar oferta:", error);

            const errorMessage = error.response?.data?.message
                || error.response?.data
                || error.message
                || 'Error al publicar la oferta';

            alert(`Error al publicar la oferta: ${errorMessage}`);
        } finally {
            setIsSubmitting(false);
        }
    };


    // -------------------------------------------------------
    //   RENDERING: estados cargando / error / vacíos
    // -------------------------------------------------------
    if (isLoading) {
        return (
            <div className="formulario-overlay root-solicitud-ofrecer">
                <div className="formulario-card">
                    <div className="formulario-header"><h3>Cargando Turnos...</h3></div>
                    <div className="formulario-body"><p>Por favor espere mientras cargamos los turnos disponibles.</p></div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="formulario-overlay root-solicitud-ofrecer">
                <div className="formulario-card">
                    <div className="formulario-header"><h3>Error de Carga</h3></div>
                    <div className="formulario-body"><p>{error}</p></div>
                    <div className="formulario-footer">
                        <button className="btn-cancelar" onClick={fetchTurnosYMedicos}>Reintentar</button>
                        <button className="btn-cancelar" onClick={handleCancelar}>Volver</button>
                    </div>
                </div>
            </div>
        );
    }

    // Usamos la lista filtrada y ordenada
    if (turnosFiltradosYOrdenados.length === 0) {
        const mensaje = isJefatura
            ? "No hay turnos no asignados futuros o de hoy que puedas publicar en este momento."
            : "No tienes turnos propios futuros o de hoy asignados para ofrecer.";

        return (
            <div className="formulario-overlay root-solicitud-ofrecer">
                <div className="formulario-card">
                    <div className="formulario-header"><h3>Ofrecer Turno</h3></div>
                    <div className="formulario-body">
                        <p>{mensaje}</p>
                    </div>
                    <div className="formulario-footer">
                        <button className="btn-cancelar" onClick={handleCancelar}>Volver</button>
                    </div>
                </div>
            </div>
        );
    }



    // -------------------------------------------------------
    //                 RENDERING PRINCIPAL
    // -------------------------------------------------------
    return (
        <div className="formulario-overlay root-solicitud-ofrecer root-solicitud-ofrecer-movil">
            <div className="formulario-card">
                <div className="formulario-header">
                    <h3>Ofrecer Turno</h3>
                    <button className="close-btn" onClick={handleCancelar} disabled={isSubmitting}>
                        &times;
                    </button>
                </div>

                <div className="formulario-body">

                    {/* Turno pre-seleccionado automáticamente si viene desde Calendar */}
                    <TurnoSelector
                        label={isJefatura ? "Turno a Publicar (No Asignado)" : "Turno a ofrecer (Propio)"}
                        turnoSeleccionado={turnoSeleccionado}
                        onSelect={setTurnoSeleccionado}
                        // Usamos la lista filtrada y ordenada
                        turnos={turnosFiltradosYOrdenados}
                        isSubmitting={isSubmitting}
                        formatDetail={getFormattedDetail}
                        pisosMap={pisosMap}
                        mapaColores={pisosColorMap}
                    />

                    <div className="form-section">
                        <label htmlFor="dirigidoA">Dirigido a</label>
                        <select
                            className="form-input-field"
                            id="dirigidoA"
                            value={medicoSeleccionado}
                            onChange={(event) => setMedicoSeleccionado(event.target.value)}
                            disabled={isSubmitting}
                        >
                            <option value="">Todos los doctores</option>
                            {medicosDisponibles.map((medico) => (
                                <option key={medico.id} value={String(medico.id)}>
                                    {medico.nombre}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="form-section">
                        <label htmlFor="condiciones">Condiciones o preferencias</label>
                        <textarea
                            className="form-input-field"
                            id="condiciones"
                            value={condiciones}
                            onChange={(event) => setCondiciones(event.target.value)}
                            rows="4"
                            placeholder="Especifica cualquier condición para el intercambio o cesión..."
                            disabled={isSubmitting}
                        />
                    </div>
                </div>

                <div className="formulario-footer">
                    <button className="btn-cancelar" onClick={handleCancelar} disabled={isSubmitting}>
                        CANCELAR
                    </button>

                    <button
                        className="btn-publicar"
                        onClick={handlePublicar}
                        disabled={isSubmitting || !turnoSeleccionado}
                    >
                        {isSubmitting ? 'PUBLICANDO...' : 'PUBLICAR OFERTA'}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default SolicitudOfrecer;