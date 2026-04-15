import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useMediaQuery } from "react-responsive";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import Menu from "../../Menu/jsx/Menu.jsx";
import { useAuth, Roles } from "../../../context/AuthContext";
import axiosInstance from "../../../utils/axiosConfig";
import adminService from '../../../services/adminService'

// Estilos según dispositivo
import "../css/movil/Solicitud-General-Movil.css";
import "../css/pc/Solicitud-General-Pc.css";
import "../css/tablet/Solicitud-General-Tablet.css";

// Definir los tipos de solicitud de permiso
const TIPOS_PERMISO = [
    "Permiso",
    "Motivos personales",
    "Feriado legal",
    "Licencia médica",
    "Licencia medica",
    "Permiso administrativo"
];

async function fetchSolicitudes(idUsuario, filtro = "todas") {
    let url;
    try {
        const endpoint = "/solicitudes";

        if (idUsuario) {
            if (filtro === "todas") {
                url = `${endpoint}/usuario/${idUsuario}`;
            } else {
                url = `${endpoint}/usuario/${filtro}/${idUsuario}`;
            }
        }
        else {
            const filtroPath = filtro === "todas" ? "/todas" : `/${filtro}`;
            url = `${endpoint}${filtroPath}`;
        }

        const response = await axiosInstance.get(url);

        // Verificar que response.data sea un array antes de ordenar
        let solicitudes = response.data;
        if (!Array.isArray(solicitudes)) {
            // Si no es array, intentar extraer datos de diferentes formatos posibles
            if (solicitudes && typeof solicitudes === 'object') {
                // Si es un objeto con una propiedad que contiene el array
                const keys = Object.keys(solicitudes);
                for (const key of keys) {
                    if (Array.isArray(solicitudes[key])) {
                        solicitudes = solicitudes[key];
                        break;
                    }
                }
            }

            // Si aún no es array, convertirlo en array vacío
            if (!Array.isArray(solicitudes)) {
                console.warn('La respuesta de la API no contiene un array de solicitudes:', solicitudes);
                solicitudes = [];
            }
        }

        return solicitudes.sort(
            (a, b) => new Date(b.fechaCreacion) - new Date(a.fechaCreacion)
        );
    } catch (error) {
        console.error(`No se pudo obtener solicitudes del backend. Falló URL: ${url || 'N/A'}`, error);
        return [];
    }
}

//HELPER 
const renderMotivoContent = (motivo) => {
    if (!motivo) return { motivoUsuario: 'N/A', turnosSerializados: '' };

    // Buscamos el separador "Turnos Afectados:"
    const separator = 'Turnos Afectados:';
    const rawSplitIndex = motivo.indexOf(separator);

    if (rawSplitIndex === -1) {
        return { motivoUsuario: motivo, turnosSerializados: '' };
    }

    // El motivo es lo que está antes del separador, limpiando saltos de línea y "Motivo:"
    const motivoUsuario = motivo.substring(0, rawSplitIndex).trim().replace('Motivo:', '').trim();

    // La lista serializada comienza despues del separador
    const turnosSerializados = motivo.substring(rawSplitIndex + separator.length).trim();

    // Si el motivoUsuario quedó vacío, usamos 'N/A' o 'Sin motivo adicional'
    const finalMotivo = motivoUsuario || 'N/A';

    return { motivoUsuario: finalMotivo, turnosSerializados };
};

// =========================================================================
// COMPONENTE PRINCIPAL
// =========================================================================

export default function SolicitudesGeneral() {
    const [solicitudes, setSolicitudes] = useState([]);

    //Inicializar en "pendiente" en lugar de "todas"
    const [filtro, setFiltro] = useState("pendiente");

    const [selectedMonth, setSelectedMonth] = useState("");
    const [selectedYear, setSelectedYear] = useState("");

    const añosDinamicos = useMemo(() => {
        const añoInicio = 2025;
        const añoActual = new Date().getFullYear();
        const proximoAño = añoActual + 2;

        const lista = [];
        for (let i = proximoAño; i >= añoInicio; i--) {
            lista.push(i);
        }
        return lista;
    }, []);

    const navigate = useNavigate();
    const [menuAbierto, setMenuAbierto] = useState(false);

    const auth = useAuth();
    const isMobile = useMediaQuery({ maxWidth: 768 });
    const location = useLocation();

    // LÓGICA DE ROLES
    const isJefatura = auth.hasRole([Roles.JEFATURA, Roles.JEFATURA_SUB]);
    const isMedico = !isJefatura; // Asumimos que cualquier usuario no Jefatura es un médico/usuario base

    // OBTENCIÓN ROBUSTA DEL ID
    const currentUserId = auth?.user?.id ? String(auth.user.id) : (localStorage.getItem('userId') ? String(localStorage.getItem('userId')) : null);

    const idParaFetch = isJefatura ? null : currentUserId;

    const refreshSolicitudes = useCallback(() => {
        const authReady = isJefatura || (currentUserId && currentUserId !== "0");

        if (!authReady) {
            console.warn("Autenticación no lista o ID no encontrado. Evitando fetch.");
            return;
        }

        fetchSolicitudes(idParaFetch, filtro).then((data) => {
            // Se asume que los filtros de Mes/Año se aplican después por useMemo
            setSolicitudes(data);
        });
    }, [idParaFetch, filtro, isJefatura, currentUserId]);

    // 1. useEffect principal para cargar la data cuando cambian los filtros/ID
    useEffect(() => {
        refreshSolicitudes();
    }, [refreshSolicitudes, selectedMonth, selectedYear]);

    useEffect(() => {
        // Si no hay ID de usuario y no es Jefatura
        if (!currentUserId && !isJefatura) return;

        // Jefatura: 5 segundos
        const JEFATURA_INTERVAL = 3000;
        // Médico: 5 segundos
        const MEDICO_INTERVAL = 3000;

        const intervalTime = isJefatura ? JEFATURA_INTERVAL : MEDICO_INTERVAL;

        const intervalId = setInterval(() => {
            refreshSolicitudes();
        }, intervalTime);

        // Función de limpieza
        return () => {
            clearInterval(intervalId);
        };

    }, [isJefatura, currentUserId, refreshSolicitudes]);

    //Manejador de navegación para el Calendario
    const handleNavigation = (path, state = {}) => {
        navigate(path, { state: state });
        if (isMobile) setMenuAbierto(false);
    };

    const toggleMenu = () => setMenuAbierto(!menuAbierto);
    const [filterOpen, setFilterOpen] = useState(false);
    const filterRef = useRef(null);
    const toggleFilter = () => setFilterOpen(!filterOpen);

    useEffect(() => {
        const handler = (e) => {
            if (!filterRef.current) return;
            if (e.type === 'keydown' && e.key === 'Escape') {
                setFilterOpen(false);
                return;
            }
            if (e.type === 'click' && filterOpen && !filterRef.current.contains(e.target)) {
                setFilterOpen(false);
            }
        };

        window.addEventListener('click', handler);
        window.addEventListener('keydown', handler);
        return () => {
            window.removeEventListener('click', handler);
            window.removeEventListener('keydown', handler);
        };
    }, [filterOpen]);

    const solicitudesFiltered = useMemo(() => {
        let filtered = solicitudes;

        if (selectedMonth) {
            filtered = filtered.filter(s => {
                const date = new Date(s.fechaCreacion);
                return date.getMonth() + 1 === parseInt(selectedMonth);
            });
        }
        if (selectedYear) {
            filtered = filtered.filter(s => {
                const date = new Date(s.fechaCreacion);
                return date.getFullYear() === parseInt(selectedYear);
            });
        }
        return filtered;
    }, [solicitudes, selectedMonth, selectedYear]);

    const totalSolicitudes = useMemo(() => solicitudesFiltered.length, [solicitudesFiltered]);

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        try {
            const date = new Date(dateString);
            if (isNaN(date)) return 'Fecha Inválida';
            // Usamos 'es-CL' o 'es' para asegurar el formato DD/MM/YYYY
            const options = { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'UTC' };
            return date.toLocaleDateString('es-CL', options);
        } catch (e) {
            console.error("Error al formatear fecha:", e);
            return 'Fecha Inválida';
        }
    };

    const getMedicoName = (medico) => {
        if (!medico) return 'Pendiente / N/A';
        if (typeof medico === 'object') {
            return `${medico.primerNombre} ${medico.primerApellido}`;
        }
        return "ID: " + medico;
    };

    const renderTurnoSummary = (turno) => {
        if (!turno) return 'No aplica';
        const fecha = formatDate(turno.diaInicioTurno);
        const hora = turno.horaInicio ? `[${turno.horaInicio} - ${turno.horaFin}]` : '';
        const dia = turno.diaSemana ? `(${turno.diaSemana})` : '';

        return `${turno.idPiso || 'Sin Piso'} - ${fecha} ${dia} ${hora}`;
    };

    const getCardTitle = (s) => {
        if (s.tipo === "Permiso") {
            // Usa el subtipo como título (Licencia médica, Feriado, etc.)
            if (s.tipoAutorizacion === "Licencia médica" || s.tipoAutorizacion === "Licencia medica") return "Licencia Médica";
            if (s.tipoAutorizacion === "Motivos personales") return "Motivos Personales";
            if (s.tipoAutorizacion === "Feriado legal") return "Feriado Legal";
            if (s.tipoAutorizacion === "Permiso administrativo") return "Permiso Administrativo";
            return s.tipoAutorizacion || "Solicitud de Permiso";
        }
        // Si es un Botar Turno, el título es fijo "Botar turno"
        if (s.tipo === "Eliminar turno" || s.tipo === "Botar turno") {
            return "Botar turno";
        }
        return s.tipo;
    };

    // =========================================================================
    // LÓGICA DE APROBACIÓN/RECHAZO 
    // =========================================================================

    const updateSolicitudEstado = async (s, nuevoEstado, esAprobacionMedico, event) => {
        if (event) event.stopPropagation();

        if (!s.id || !s.estado || s.estado.toLowerCase() !== 'pendiente') {
            console.warn("La solicitud no está pendiente o no tiene ID válido.");
            return;
        }

        let endpoint;
        let body = {};

        //CASO 1: Médico respondiendo (Intercambio u Oferta)
        if (esAprobacionMedico) {
            const tipoLower = s.tipo ? s.tipo.toLowerCase() : "";
            const esOferta = tipoLower.includes("oferta");
            const esIntercambio = tipoLower.includes("cambio") || tipoLower.includes("intercambio");

            if (esIntercambio || esOferta) {
                if (esOferta) {
                    endpoint = `/solicitudes/oferta/respuesta/${s.id}`;
                } else {
                    endpoint = `/solicitudes/intercambio/respuesta/${s.id}`;
                }

                body = { aceptado: nuevoEstado === 'Aprobado' };

                try {
                    await axiosInstance.put(endpoint, body);
                    refreshSolicitudes();
                    alert(`Respuesta enviada: ${nuevoEstado === 'Aprobado' ? 'Aceptado' : 'Rechazado'} con éxito.`);
                    return;
                } catch (error) {
                    console.error("Error al responder solicitud:", error);
                    alert(`Error al responder la solicitud.`);
                    return;
                }
            }
        }

        //CASO 2: Jefatura aprobando/rechazando
        if (isJefatura && !esAprobacionMedico) {

            if (nuevoEstado === 'Aprobada' || nuevoEstado === 'Aprobado') {
                const confirmar = window.confirm(
                    "¿Estás seguro de APROBAR esta solicitud?\n\n" +
                    "NOTA: Si existen otras solicitudes pendientes compitiendo por este mismo turno, " +
                    "el sistema las RECHAZARÁ automáticamente."
                );
                if (!confirmar) return;
            }

            try {
                // Aquí el estado es 'Aprobado' o 'Rechazado'
                await adminService.solicitudes.updateEstado(s.id, nuevoEstado === 'Aprobada' ? 'Aprobado' : nuevoEstado)
                refreshSolicitudes();
                alert(`Solicitud ${nuevoEstado} correctamente.`);
                return;
            } catch (error) {
                console.error('Error al actualizar la solicitud:', error);
                alert(`Error al actualizar la solicitud.`);
                return;
            }
        }
    };

    // Función para renderizar los botones
    const renderCardActions = (s) => {
        if (!s.estado || s.estado.toLowerCase() !== 'pendiente') {
            return null;
        }

        // 1. LÓGICA DE MÉDICO RECEPTOR
        const tipoLower = s.tipo ? s.tipo.toLowerCase() : "";
        const esIntercambioOOferta = tipoLower.includes("cambio") || tipoLower.includes("intercambio") || tipoLower.includes("oferta");

        let idReceptorStr = null;
        if (s.medicoReceptor) {
            idReceptorStr = typeof s.medicoReceptor === 'object' ? String(s.medicoReceptor.id) : String(s.medicoReceptor);
        }

        const miIdStr = currentUserId ? String(currentUserId) : null;
        const soyElReceptor = (idReceptorStr && miIdStr) && (idReceptorStr === miIdStr);
        const aunNoRespondo = s.aceptadoMedico === null || s.aceptadoMedico === undefined;

        if (esIntercambioOOferta && soyElReceptor && aunNoRespondo) {
            return (
                <div className="card-actions-medico" style={{ marginTop: '15px', display: 'flex', gap: '10px', justifyContent: 'center' }}>
                    <button className="btn-rechazar" onClick={(e) => updateSolicitudEstado(s, 'Rechazado', true, e)}>Rechazar</button>
                    <button className="btn-aprobar" onClick={(e) => updateSolicitudEstado(s, 'Aprobado', true, e)}>Aceptar</button>
                </div>
            );
        }

        // 2. LÓGICA DE JEFATURA
        if (isJefatura) {
            // Esperando respuesta del colega
            if (esIntercambioOOferta && idReceptorStr && s.aceptadoMedico == null) {
                return <p style={{ fontSize: '0.85rem', color: '#666', fontStyle: 'italic', marginTop: '10px', textAlign: 'right' }}>Esperando respuesta del colega...</p>;
            }
            // Rechazado por colega
            if (esIntercambioOOferta && s.aceptadoMedico === false) {
                return <p style={{ fontSize: '0.85rem', color: '#d32f2f', fontStyle: 'italic', marginTop: '10px', textAlign: 'right' }}>Rechazado por el colega.</p>;
            }

            return (
                <div className="card-actions-jefatura" style={{ marginTop: '15px', display: 'flex', gap: '10px', justifyContent: 'center' }}>
                    <button className="btn-rechazar" onClick={(e) => updateSolicitudEstado(s, 'Rechazado', false, e)}>Rechazar</button>
                    <button className="btn-aprobar" onClick={(e) => updateSolicitudEstado(s, 'Aprobada', false, e)}>Aprobar</button>
                </div>
            );
        }

        return null;
    };


    // -------------------------
    // 4. Renderizado
    // -------------------------
    return (
        <React.Fragment>
            <Menu />

            <div className={`solicitudes-root ${isMobile ? "mobile" : "desktop"}`}>

                <header className="solicitudes-main-header">
                    <h1>Solicitud de Turnos</h1>
                </header>

                <div className="solicitudes-menu-container">
                    {isMobile ? (
                        <>
                            <button className="menu-principal-btn" onClick={toggleMenu} aria-expanded={menuAbierto} aria-controls="submenu-solicitudes-mobile">
                                Formularios de solicitud
                                <svg className={`menu-icon ${menuAbierto ? "abierto" : ""}`} width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M5 7.5L10 12.5L15 7.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </button>

                            {menuAbierto && (
                                <div id="submenu-solicitudes-mobile" className="submenu-solicitudes dropdown">
                                    <button className="submenu-btn turno-btn" title="Solicitud de cobertura" onClick={() => handleNavigation("turno")}>
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                            <line x1="16" y1="2" x2="16" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                            <line x1="8" y1="2" x2="8" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                            <line x1="3" y1="10" x2="21" y2="10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                        Pedir un Turno
                                    </button>
                                    <button className="submenu-btn permiso-btn" title="Solicitud de permiso" onClick={() => handleNavigation("permiso")}>
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                            <polyline points="14 2 14 8 20 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                            <line x1="16" y1="13" x2="8" y2="13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                            <line x1="16" y1="17" x2="8" y2="17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                            <polyline points="10 9 9 9 8 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                        Permiso
                                    </button>
                                    <button className="submenu-btn cambio-btn" title="Cambio de turno" onClick={() => handleNavigation("cambio")}>
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M23 4V10H17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                            <path d="M1 20V14H7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                            <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10M23 14L18.36 18.36A9 9 0 0 1 3.51 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                        Intercambio
                                    </button>
                                    <button className="submenu-btn ofrecer-btn" title="Oferta de turno" onClick={() => handleNavigation("ofrecer")}>
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <line x1="22" y1="2" x2="11" y2="13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                            <polygon points="22 2 15 22 11 13 2 9 22 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                        Ofrecer un Turno
                                    </button>
                                    {/*BOTÓN MÓVIL */}
                                    <button
                                        className="submenu-btn botar-btn"
                                        title="Devolver turno"
                                        onClick={() => handleNavigation("/turnos", {
                                            instructionMessage: "Seleccione UN turno que desea eliminar, mediante la opción de eliminar turno."
                                        })}
                                    >
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <polyline points="3 6 5 6 21 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                            <path d="M19 6V20C19 20.5304 18.7893 21.0391 18.4142 21.4142C18.0391 21.7893 17.5304 22 17 22H7C6.46957 22 5.96086 21.7893 5.58579 21.4142C5.21071 21.0391 5 20.5304 5 20V6M8 6V4C8 3.46957 8.21071 2.96086 8.58579 2.58579C8.96086 2.21071 9.46957 2 10 2H14C14.5304 2 15.0391 2.21071 15.4142 2.58579C15.7893 2.96086 16 3.46957 16 4V6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                            <line x1="10" y1="11" x2="10" y2="17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                            <line x1="14" y1="11" x2="14" y2="17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                        Eliminar Turno
                                    </button>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="submenu-solicitudes">
                            <button className="submenu-btn turno-btn" title="Solicitud de cobertura" onClick={() => handleNavigation("turno")}>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    <line x1="16" y1="2" x2="16" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    <line x1="8" y1="2" x2="8" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    <line x1="3" y1="10" x2="21" y2="10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                                Pedir un Turno
                            </button>
                            <button className="submenu-btn permiso-btn" title="Solicitud de permiso" onClick={() => handleNavigation("permiso")}>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    <polyline points="14 2 14 8 20 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    <line x1="16" y1="13" x2="8" y2="13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    <line x1="16" y1="17" x2="8" y2="17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    <polyline points="10 9 9 9 8 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                                Permiso
                            </button>
                            <button className="submenu-btn cambio-btn" title="Cambio de turno" onClick={() => handleNavigation("cambio")}>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M23 4V10H17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    <path d="M1 20V14H7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10M23 14L18.36 18.36A9 9 0 0 1 3.51 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                                Intercambio
                            </button>
                            <button className="submenu-btn ofrecer-btn" title="Oferta de turno" onClick={() => handleNavigation("ofrecer")}>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <line x1="22" y1="2" x2="11" y2="13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    <polygon points="22 2 15 22 11 13 2 9 22 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                                Ofrecer un Turno
                            </button>
                            {/*BOTÓN ESCRITORIO */}
                            <button
                                className="submenu-btn botar-btn"
                                title="Devolver turno"
                                onClick={() => handleNavigation("/turnos", {
                                    instructionMessage: "Seleccione UN turno que desea eliminar, mediante la opción de eliminar turno."
                                })}
                            >
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <polyline points="3 6 5 6 21 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    <path d="M19 6V20C19 20.5304 18.7893 21.0391 18.4142 21.4142C18.0391 21.7893 17.5304 22 17 22H7C6.46957 22 5.96086 21.7893 5.58579 21.4142C5.21071 21.0391 5 20.5304 5 20V6M8 6V4C8 3.46957 8.21071 2.96086 8.58579 2.58579C8.96086 2.21071 9.46957 2 10 2H14C14.5304 2 15.0391 2.21071 15.4142 2.58579C15.7893 2.96086 16 3.46957 16 4V6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    <line x1="10" y1="11" x2="10" y2="17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    <line x1="14" y1="11" x2="14" y2="17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                                Eliminar Turno
                            </button>
                        </div>
                    )}
                </div>

                <div className="mis-solicitudes-header">
                    <h2>{isJefatura ? 'Todas las Solicitudes' : 'Mis Solicitudes'}</h2>
                    <span className="total-solicitudes">Total: {totalSolicitudes}</span>
                </div>

                <div className="filter-container" ref={filterRef}>
                    <div className="filter-dropdown">
                        <button className="filter-toggle" aria-haspopup="true" aria-expanded={filterOpen} aria-controls="filter-menu" onClick={toggleFilter}>
                            Tipos de solicitudes
                            <svg className={`filter-caret ${filterOpen ? 'open' : ''}`} width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M5 7.5L10 12.5L15 7.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </button>

                        {filterOpen && (
                            <div id="filter-menu" className="filter-menu" role="menu">
                                <button role="menuitem" className={`filter-item ${filtro === 'todas' ? 'active' : ''}`} onClick={() => { setFiltro('todas'); setFilterOpen(false); }}>Todas</button>
                                <button role="menuitem" className={`filter-item ${filtro === 'pendiente' ? 'active' : ''}`} onClick={() => { setFiltro('pendiente'); setFilterOpen(false); }}>Pendientes</button>
                                <button role="menuitem" className={`filter-item ${filtro === 'aprobado' ? 'active' : ''}`} onClick={() => { setFiltro('aprobado'); setFilterOpen(false); }}>Aprobadas</button>
                                <button role="menuitem" className={`filter-item ${filtro === 'rechazado' ? 'active' : ''}`} onClick={() => { setFiltro('rechazado'); setFilterOpen(false); }}>Rechazadas</button>
                            </div>
                        )}
                    </div>
                </div>

                <div className="date-filters">
                    <label>
                        Mes:
                        <select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)}>
                            <option value="">Todos</option>
                            <option value="1">Enero</option>
                            <option value="2">Febrero</option>
                            <option value="3">Marzo</option>
                            <option value="4">Abril</option>
                            <option value="5">Mayo</option>
                            <option value="6">Junio</option>
                            <option value="7">Julio</option>
                            <option value="8">Agosto</option>
                            <option value="9">Septiembre</option>
                            <option value="10">Octubre</option>
                            <option value="11">Noviembre</option>
                            <option value="12">Diciembre</option>
                        </select>
                    </label>
                    <label>
                        Año:
                        <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)}>
                            <option value="">Todos</option>
                            {añosDinamicos.map((año) => (
                                <option key={año} value={año}>
                                    {año}
                                </option>
                            ))}
                        </select>
                    </label>
                </div>

                {/* Listado de solicitudes */}
                <div className="solicitudes-list">
                    {solicitudesFiltered.length === 0 ? (
                        <div className="sin-solicitudes">
                            <p>No hay solicitudes {filtro !== "todas" ? `en estado ${filtro}` : ""} {selectedMonth ? `en el mes ${selectedMonth}` : ""} {selectedYear ? `en el año ${selectedYear}` : ""}.</p>
                        </div>
                    ) : (
                        solicitudesFiltered.map((s) => {
                            // Separar el motivo del usuario de la lista de turnos
                            const { motivoUsuario, turnosSerializados } = renderMotivoContent(s.motivo);

                            return (
                                <div
                                    key={s.id}
                                    className={`solicitud-card estado-${s.estado}`}
                                >
                                    <h4>{getCardTitle(s)}</h4>

                                    <div className="card-content-container">
                                        <div className="card-basic-info">

                                            {/* MOTIVO DEL USUARIO - Condicionalmente oculto para Botar turno */}
                                            {(s.tipo !== "Botar turno" && s.tipo !== "Eliminar turno") && (
                                                <>
                                                    <p><strong>Motivo:</strong></p>
                                                    <p style={{ marginBottom: '10px' }}>{motivoUsuario}</p>
                                                </>
                                            )}
                                            {/* Si es Botar Turno, mostramos el motivo directamente en línea para ahorrar espacio */}
                                            {(s.tipo === "Botar turno" || s.tipo === "Eliminar turno") && (
                                                <p style={{ marginBottom: '10px' }}><strong>Motivo:</strong> {motivoUsuario}</p>


                                            )}

                                            <p><strong>Estado:</strong> {s.estado}</p>
                                            <p><strong>Fecha Creación:</strong> {formatDate(s.fechaCreacion)}</p>
                                        </div>

                                        {/* BLOQUE GENERAL DE TURNO */}
                                        {s.turno && s.tipo !== "Permiso" && s.tipo !== "Oferta de turno" && s.tipo !== "Cambio de turno" && s.tipo !== "Eliminar turno" && (
                                            <div className="turno-info">
                                                <p><strong>Piso/Sección:</strong> {s.turno.idPiso}</p>
                                                <p><strong>Fecha Turno:</strong> {formatDate(s.turno.diaInicioTurno)} {s.turno.diaSemana ? `(${s.turno.diaSemana})` : ''}</p>
                                                <p><strong>Horario:</strong> {s.turno.horaInicio} - {s.turno.horaFin}</p>
                                                <p><strong>Tipo Turno:</strong> {s.turno.tipoTurno}</p>
                                                <p><strong>Médico solicitante:</strong> {getMedicoName(s.medicoSolicitante)}</p>
                                            </div>
                                        )}


                                        {/* BLOQUE BOTAR TURNO (Solo Tipo de permiso y Médico Solicitante) */}
                                        {(s.tipo === "Botar turno" || s.tipo === "Eliminar turno") && (
                                            <div className="extra-info">

                                                <p><strong>Tipo de permiso:</strong> {s.tipoAutorizacion}</p>

                                                {/* 2. Médico Solicitante (REQUERIDO) */}
                                                <p><strong>Médico solicitante:</strong> {getMedicoName(s.medicoSolicitante)}</p>
                                            </div>
                                        )}

                                        {/* Bloque Permiso (Ajustado para el formato solicitado) */}
                                        {(TIPOS_PERMISO.includes(s.tipo)) && (
                                            <div className="extra-info">

                                                {/* 1. Fechas */}
                                                <p><strong>Fecha de inicio:</strong> {formatDate(s.fechaInicioPermiso)}</p>
                                                <p><strong>Fecha de término:</strong> {formatDate(s.fechaTerminoPermiso)}</p>

                                                {/* 2. LISTA DE TURNOS AFECTADOS */}
                                                {turnosSerializados && (
                                                    <div style={{
                                                        marginTop: '5px',
                                                        marginBottom: '10px',
                                                        padding: '8px',
                                                        borderRadius: '4px'
                                                    }}>
                                                        <p style={{ margin: '0 0 5px 0', fontWeight: 'bold', color: '#333', textAlign: 'center' }}>
                                                            Turnos Afectados:
                                                        </p>
                                                        {/* Forzamos el color del texto a negro/gris oscuro */}
                                                        <pre style={{
                                                            whiteSpace: 'pre-wrap',
                                                            fontFamily: 'inherit',
                                                            margin: 0,
                                                            padding: 0,
                                                            fontSize: '0.9rem',
                                                            lineHeight: '1.4',
                                                            color: '#333'
                                                        }}>
                                                            {turnosSerializados}
                                                        </pre>
                                                    </div>
                                                )}

                                                {/* 3. Médico Solicitante (Al final del bloque extra-info) */}
                                                <p><strong>Médico solicitante:</strong> {getMedicoName(s.medicoSolicitante)}</p>
                                            </div>
                                        )}

                                        {/* Bloque Cambio de turno */}
                                        {s.tipo === "Cambio de turno" && (
                                            <div className="intercambio-info extra-info">
                                                <div style={{ marginBottom: '10px', background: 'rgba(0,0,0,0.02)', padding: '5px', borderRadius: '4px' }}>
                                                    <p style={{ marginBottom: '2px', color: '#555' }}><strong>Turno Actual (Propio):</strong></p>
                                                    <p style={{ margin: '0' }}>{renderTurnoSummary(s.turnoPropio)}</p>
                                                </div>
                                                <div style={{ marginBottom: '10px', background: 'rgba(0,0,0,0.02)', padding: '5px', borderRadius: '4px' }}>
                                                    <p style={{ marginBottom: '2px', color: '#555' }}><strong>Turno Deseado:</strong></p>
                                                    <p style={{ margin: '0' }}>{renderTurnoSummary(s.turnoDeseado)}</p>
                                                </div>

                                                <div style={{ marginTop: '10px' }}>
                                                    <p><strong>Médico solicitante:</strong> {getMedicoName(s.medicoSolicitante)}</p>
                                                    <p><strong>Médico receptor:</strong> {getMedicoName(s.medicoReceptor)}</p>
                                                    <p><strong>Aceptado Médico:</strong> {s.aceptadoMedico !== null ? (s.aceptadoMedico ? "Sí" : "No") : "Pendiente"}</p>
                                                </div>
                                            </div>
                                        )}

                                        {/* Bloque Oferta de Turno */}
                                        {s.tipo === "Oferta de turno" && (
                                            <div className="oferta-info extra-info">
                                                {s.turnoPropio ? (
                                                    <div className="turno-ofrecido-detalle" style={{ marginBottom: '10px', padding: '8px', borderRadius: '4px' }}>
                                                        <p style={{ margin: '0 0 4px 0', fontSize: '0.9rem' }}><strong>SE OFRECE EL TURNO:</strong></p>
                                                        <p style={{ margin: '2px 0' }}><strong>Fecha:</strong> {formatDate(s.turnoPropio.diaInicioTurno)} {s.turnoPropio.diaSemana ? `(${s.turnoPropio.diaSemana})` : ''}</p>
                                                        <p style={{ margin: '2px 0' }}><strong>Piso:</strong> {s.turnoPropio.idPiso}</p>
                                                        <p style={{ margin: '2px 0' }}><strong>Horario:</strong> {s.turnoPropio.horaInicio} - {s.turnoPropio.horaFin}</p>
                                                    </div>
                                                ) : (
                                                    <p><em>Error: Información del turno ofrecido no disponible</em></p>
                                                )}

                                                <p><strong>Médico oferente:</strong> {getMedicoName(s.medicoSolicitante)}</p>
                                                {s.medicoReceptor && <p><strong>Médico candidato:</strong> {getMedicoName(s.medicoReceptor)}</p>}
                                                {s.aceptadoMedico !== undefined && <p><strong>Respuesta del colega:</strong> {s.aceptadoMedico !== null ? (s.aceptadoMedico ? "Aceptada" : "Rechazada") : "Pendiente"}</p>}
                                            </div>
                                        )}
                                    </div>

                                    {/* --- BOTONES DE ACCIÓN --- */}
                                    {renderCardActions(s)}
                                </div>
                            )
                        })
                    )}
                </div>

                <div className="solicitudes-list-container">
                    <Outlet />
                </div>
            </div>
        </React.Fragment>
    );
}