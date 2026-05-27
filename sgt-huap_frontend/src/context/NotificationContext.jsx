import React, { createContext, useState, useEffect, useContext } from "react";
import { useAuth } from "./AuthContext";
import {
  eliminarNotificacion,
  getNotificacionesSinLeer,
  getNotificacionesUsuario,
  marcarNotificacionLeida,
} from "../services/notificationService";

/**
 * NOTIFICATION CONTEXT
 * 
 * Este contexto SOLO utiliza datos proporcionados por el backend.
 * NO utiliza datos mock, datos de prueba, ni datos por defecto.
 * Todas las notificaciones y contadores se obtienen de la API del servidor.
 */

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);

  const { user } = useAuth();
  const userId = user?.userId || localStorage.getItem("userId");
  // Obtener número de notificaciones no leídas
  const fetchUnreadCount = async () => {
    if (!userId) return;

    const result = await getNotificacionesSinLeer(userId);
    setUnreadCount(result.success ? result.data : 0);
  };

  // Obtener lista de notificaciones
  const fetchNotifications = async () => {
    if (!userId) return;

    const result = await getNotificacionesUsuario(userId);
    if (!result.success) {
      setNotifications([]);
      return;
    }

    const mapped = (result.data || [])
      .filter((n) => !n.eliminado)
      .map((n) => ({
        id: n.id,
        titulo: n.titulo || n.asunto || "Notificación",
        texto: n.texto || n.mensaje || "",
        fecha: n.fechaLabel || n.fechaEnvio || n.fecha || null,
        tipo: (n.estado || "neutral").toLowerCase(),
        isRead: n.isRead === true || n.leido === true || String(n.estado).toUpperCase() === "LEIDO",
        raw: n,
      }));

    setNotifications(mapped);
  };

  // Marcar como leído
  const markAsRead = async (id) => {
    const result = await marcarNotificacionLeida(id);
    if (!result.success) {
      console.error("Error marcando notificación como leída", result.error);
      return;
    }

    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
    fetchUnreadCount();
  };

  //Eliminar notificación
  const deleteNotification = async (id) => {
    const result = await eliminarNotificacion(id);
    if (!result.success) {
      console.error("Error eliminando notificación", result.error);
      return;
    }

    setNotifications((prev) => prev.filter((n) => n.id !== id));
    fetchUnreadCount();
  };

  // 🔹 Refrescar manualmente desde otros componentes
  const refresh = async () => {
    try {
      await Promise.all([fetchNotifications(), fetchUnreadCount()]);
    } catch (e) {
      console.warn('Error refreshing notifications', e);
    }
  };

  useEffect(() => {
    // Solo intentar si tenemos un userId concreto
    if (!userId) return;
    fetchNotifications();
    fetchUnreadCount();

    // Short-polling: refrescar cada X segundos para captar cambios que vienen de acciones externas (p.ej. aprobación por otro usuario)
    const POLL_INTERVAL = 15000; // 15s

    let interval = null;
    const tick = async () => {
      try {
        // Solo refrescar si la pestaña está visible para evitar carga innecesaria
        if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
        await Promise.all([fetchUnreadCount(), fetchNotifications()]);
      } catch (e) {
        // Silenciar errores para no romper la UI
        console.warn('Error polling notifications', e);
      }
    };

    interval = setInterval(tick, POLL_INTERVAL);

    // También forzar un refresh inmediato cuando la pestaña vuelva a estar visible
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        tick();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      if (interval) clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibility);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  return (
    <NotificationContext.Provider
      value={{ notifications, markAsRead, deleteNotification, unreadCount, refresh }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

// Hook para usar el context
export const useNotifications = () => useContext(NotificationContext);
