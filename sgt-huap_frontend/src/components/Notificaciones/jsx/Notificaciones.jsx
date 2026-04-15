import React, { useState } from "react";
import { useAuth } from "../../../context/AuthContext";
import { useMediaQuery } from "react-responsive";
import Menu from "../../Menu/jsx/Menu.jsx";
import { useNotifications } from "../../../context/NotificationContext";

// Estilos por dispositivo
import "../css/pc/Notificaciones-PC.css";
import "../css/tablet/Notificaciones-Tablet.css";
import "../css/movil/Notificaciones-Movil.css";

/**
 * COMPONENTE NOTIFICACIONES
 * 
 * Este componente SOLO utiliza datos proporcionados por el backend.
 * NO utiliza datos mock, datos de prueba, ni datos por defecto.
 * Todas las notificaciones se obtienen de la API del servidor.
 * 
 * ORDENAMIENTO INTELIGENTE:
 * 1. No leídas primero (prioridad máxima)
 * 2. Por importancia y urgencia:
 *    - Críticas: Rechazadas (acción inmediata requerida)
 *    - Altas: Aprobadas (feedback positivo)
 *    - Medias: Pendientes/Cambio/Oferta (requieren respuesta)
 *    - Bajas: Permiso/Licencia/Cobertura (informativas)
 *    - Muy bajas: Notificaciones generales
 * 3. Dentro de cada grupo: más recientes primero
 */

// Función helper para determinar si una notificación es urgente
const isNotificationUrgent = (notif) => {
    const mensaje = notif.mensaje ? notif.mensaje.toUpperCase() : '';
    const estado = notif.estado ? notif.estado.toLowerCase() : '';
    const fechaEnvio = new Date(notif.fechaEnvio);
    const ahora = new Date();
    const horasTranscurridas = (ahora - fechaEnvio) / (1000 * 60 * 60);

    // Urgente si es rechazada Y tiene menos de 24 horas
    return (mensaje.includes('RECHAZADA') || mensaje.includes('RECHAZADO') || estado === 'rechazada')
           && horasTranscurridas < 24;
};

// Función helper para obtener la prioridad de una notificación (menor número = mayor prioridad)
const getNotificationPriority = (notif) => {
    const tipo = notif.tipoSolicitud ? notif.tipoSolicitud.toLowerCase() : '';
    const estado = notif.estado ? notif.estado.toLowerCase() : '';
    const mensaje = notif.mensaje ? notif.mensaje.toUpperCase() : '';

    // Sistema de prioridades (1 = máxima prioridad, 5 = mínima prioridad)
    // 1. Críticas: Rechazadas (acción inmediata requerida)
    if (estado === 'rechazada' || mensaje.includes('RECHAZADA') || mensaje.includes('RECHAZADO')) {
        return 1;
    }
    
    // 2. Altas: Aprobadas (feedback positivo)
    if (estado === 'aprobada' || mensaje.includes('APROBADA') || mensaje.includes('APROBADO')) {
        return 2;
    }
    
    // 3. Medias: Pendientes, Cambios, Ofertas (requieren respuesta)
    if (estado === 'pendiente' || tipo === 'cambio' || tipo === 'oferta' || 
        mensaje.includes('PENDIENTE') || mensaje.includes('CAMBIO') || mensaje.includes('OFERTA')) {
        return 3;
    }
    
    // 4. Bajas: Permisos, Licencias, Coberturas (informativas)
    if (tipo === 'permiso' || tipo === 'licencia' || tipo === 'cobertura' ||
        mensaje.includes('PERMISO') || mensaje.includes('LICENCIA') || mensaje.includes('COBERTURA')) {
        return 4;
    }
    
    // 5. Muy bajas: Notificaciones generales u otros tipos
    return 5;
};

// Componente para cada notificación individual
const Notificacion = ({ nombre, texto, fecha, tipo, isRead, isUrgent, onMarkAsRead, onDelete }) => {
    const [isDeleting, setIsDeleting] = useState(false);
    
    // Lógica de colores e iconos (SVG) mejorada
    const getNotificacionConfig = () => {
        const mensaje = texto ? texto.toUpperCase() : "";
        const estado = tipo ? tipo.toLowerCase() : "";

        // Helpers: iconos SVG
        const IconCheck = (
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6L9 17l-5-5" />
            </svg>
        );
        const IconX = (
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
        );
        const IconClock = (
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 6v6l4 2" />
            </svg>
        );
        const IconSolicitud = (
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <path d="M14 2v6h6" />
                <path d="M8 12h8" />
                <path d="M8 16h8" />
                <circle cx="9" cy="7" r="0.8" />
            </svg>
        );
        const IconUmbrella = (
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 12a8 8 0 0 1 16 0" />
                <path d="M12 12v8" />
            </svg>
        );
        const IconPencil = (
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
            </svg>
        );
        const IconHandshake = (
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15l-5-5" />
                <path d="M3 11l7 7" />
                <path d="M7 7l5 5" />
            </svg>
        );
        const IconSwap = (
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 1l4 4-4 4" />
                <path d="M3 11v-1a4 4 0 0 1 4-4h14" />
                <path d="M7 23l-4-4 4-4" />
                <path d="M21 13v1a4 4 0 0 1-4 4H3" />
            </svg>
        );
        const IconShield = (
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2l7 4v6c0 5-3.58 9.74-7 10-3.42-.26-7-5-7-10V6l7-4z" />
            </svg>
        );
        const IconBell = (
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
        );

        // Prioridad: Buscar palabras clave en el mensaje
        if (mensaje.includes("APROBADA") || mensaje.includes("APROBADO") || mensaje.includes("ACEPTADA")) {
            return {
                clase: "solicitud-aprobada",
                icono: IconCheck,
                color: "#22c55e",
                titulo: "Aprobada"
            };
        }
        if (mensaje.includes("RECHAZADA") || mensaje.includes("RECHAZADO")) {
            return {
                clase: "solicitud-rechazada",
                icono: IconX,
                color: "#ef4444",
                titulo: "Rechazada"
            };
        }
        if (mensaje.includes("PENDIENTE")) {
            return {
                clase: "solicitud-pendiente",
                icono: IconClock,
                color: "#f59e0b",
                titulo: "Pendiente"
            };
        }

        // Fallback: usar el 'tipo' del estado
        switch (estado) {
            case "solicitud":
            case "pendiente":
                return {
                    clase: "solicitud-default",
                    icono: IconSolicitud,
                    color: "#3b82f6",
                    titulo: "Solicitud"
                };
            case "rechazada":
                return {
                    clase: "solicitud-rechazada",
                    icono: IconX,
                    color: "#ef4444",
                    titulo: "Rechazada"
                };
            case "aprobado":
            case "aprobada":
                return {
                    clase: "solicitud-aprobada",
                    icono: IconCheck,
                    color: "#22c55e",
                    titulo: "Aprobada"
                };
            case "licencia":
                return {
                    clase: "solicitud-licencia",
                    icono: IconUmbrella,
                    color: "#8b5cf6",
                    titulo: "Licencia"
                };
            case "permiso":
                return {
                    clase: "solicitud-permiso",
                    icono: IconPencil,
                    color: "#06b6d4",
                    titulo: "Permiso"
                };
            case "oferta":
                return {
                    clase: "solicitud-oferta",
                    icono: IconHandshake,
                    color: "#10b981",
                    titulo: "Oferta"
                };
            case "cambio":
                return {
                    clase: "solicitud-cambio",
                    icono: IconSwap,
                    color: "#f97316",
                    titulo: "Cambio"
                };
            case "cobertura":
                return {
                    clase: "solicitud-cobertura",
                    icono: IconShield,
                    color: "#6366f1",
                    titulo: "Cobertura"
                };
            default:
                return {
                    clase: "solicitud-default",
                    icono: IconBell,
                    color: "#6b7280",
                    titulo: "Notificación"
                };
        }
    };

    const config = getNotificacionConfig();

    const handleDelete = () => {
        setIsDeleting(true);
        setTimeout(() => onDelete(), 300);
    };

    return (
        <div className={`notificacion-item ${config.clase} ${isRead ? "read" : "unread"} ${isDeleting ? "deleting" : ""}`}>
            <div className="notificacion-header">
                <div className="notificacion-icon" style={{backgroundColor: config.color}}>
                    {config.icono}
                    {isUrgent && (
                        <div className="urgente-indicator">
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                                <line x1="12" y1="9" x2="12" y2="13" />
                                <line x1="12" y1="17" x2="12.01" y2="17" />
                            </svg>
                        </div>
                    )}
                </div>
                <div className="notificacion-meta">
                    <div className="notificacion-tipo">
                        {config.titulo}
                        {isUrgent && <span className="urgente-badge">URGENTE</span>}
                    </div>
                    <div className="notificacion-fecha">{fecha}</div>
                </div>
            </div>
            
            <div className="notificacion-content">
                <div className="notificacion-texto">
                    <strong>{nombre}</strong> {texto}
                </div>
            </div>
            
            <div className="notificacion-actions">
                {!isRead && (
                    <button className="marcar-leido-btn" onClick={onMarkAsRead}>
                        <span className="btn-icon">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M20 6L9 17l-5-5" />
                            </svg>
                        </span>
                        Marcar como leído
                    </button>
                )}
                {isRead && (
                    <button className="eliminar-btn" onClick={handleDelete}>
                        <span className="btn-icon">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="3 6 5 6 21 6" />
                                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                                <path d="M10 11v6" />
                                <path d="M14 11v6" />
                            </svg>
                        </span>
                        Eliminar
                    </button>
                )}
            </div>
        </div>
    );
};

// Componente principal
export default function Notificaciones() {
    const isMobile = useMediaQuery({ maxWidth: 768 });
    const { notifications, markAsRead: ctxMarkAsRead, deleteNotification: ctxDeleteNotification, unreadCount } = useNotifications();
    const { user } = useAuth();

    // Use context implementations so Menu badge updates immediately
    const markAsRead = async (id) => {
        try {
            await ctxMarkAsRead(id);
        } catch (e) {
            console.error('Error marcando notificación desde UI:', e);
        }
    };

    const deleteNotification = async (id) => {
        try {
            await ctxDeleteNotification(id);
        } catch (e) {
            console.error('Error eliminando notificación desde UI:', e);
        }
    };

    // No loading local state: NotificationContext carga los datos y actualiza el provider.

    return (
        <React.Fragment>
            <Menu />
            <div className={`main-content ${isMobile ? "mobile" : "desktop"}`}>
                <div className="notificaciones-header">
                    <h2 className="titulo-notificaciones">NOTIFICACIONES</h2>
                    {notifications.filter(n => !n.isRead).length > 0 && (
                        <span className="notificaciones-count">
                            {notifications.filter(n => !n.isRead).length} sin leer
                        </span>
                    )}
                </div>
                <div className="lista-notificaciones">
                    {notifications.length > 0 ? (
                        notifications.map((notificacion, index) => {
                            // Agregar separador visual entre no leídas y leídas
                            const showSeparator = index > 0 && 
                                !notificacion.isRead && 
                                notifications[index - 1].isRead;

                            return (
                                <React.Fragment key={notificacion.id}>
                                    {showSeparator && (
                                        <div className="notificaciones-separator">
                                            <span>Notificaciones leídas</span>
                                        </div>
                                    )}
                                    <Notificacion
                                        nombre={notificacion.nombre}
                                        texto={notificacion.texto}
                                        fecha={notificacion.fecha}
                                        tipo={notificacion.tipo}
                                        isRead={notificacion.isRead}
                                        isUrgent={notificacion.isUrgent}
                                        onMarkAsRead={() => markAsRead(notificacion.id)}
                                        onDelete={() => deleteNotification(notificacion.id)}
                                    />
                                </React.Fragment>
                            );
                        })
                    ) : (
                        <p className="sin-notificaciones" style={{textAlign: 'center', color: '#666', marginTop: '20px'}}>
                            No tienes notificaciones nuevas
                        </p>
                    )}
                </div>
            </div>
        </React.Fragment>
    );
}