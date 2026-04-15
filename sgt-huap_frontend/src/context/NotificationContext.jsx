import React, { createContext, useState, useEffect, useContext } from "react";
import axiosInstance from "../utils/axiosConfig";
import { useAuth } from "./AuthContext";

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
  const API_BASE = "/notificacion";

  // 🔹 Obtener número de notificaciones no leídas
  // SOLO usa datos del backend - NO datos mock
  const fetchUnreadCount = async () => {
    if (!userId) return;

    try {
      const response = await axiosInstance.get(`${API_BASE}/no-leidas/${userId}`);
      setUnreadCount(response.data);
    } catch (error) {
      console.error("Error al obtener notificaciones no leídas", error?.message || error);
      // En caso de error, mantener contador en 0 - NO usar datos mock
      setUnreadCount(0);
    }
  };

  // 🔹 Obtener lista de notificaciones
  // SOLO usa datos del backend - NO datos mock
  const fetchNotifications = async () => {
    if (!userId) return;

    try {
      const response = await axiosInstance.get(`${API_BASE}/usuario/${userId}`);
      const data = response.data || [];

      // Validar que los datos vengan del backend
      if (!Array.isArray(data)) {
        console.error("Los datos del backend no son un array válido");
        setNotifications([]);
        return;
      }

      const mapped = data
        .filter((n) => !n.eliminado)
        .map((n) => ({
          id: n.id,
          nombre: "",

          texto: n.mensaje,
          fecha: new Date(n.fechaEnvio).toLocaleString("es-CL", {
            dateStyle: "short",
            timeStyle: "short",
          }),
          tipo: n.estado.toLowerCase(),
          isRead: n.leido,
        }));

      setNotifications(mapped);
    } catch (error) {
      console.error("Error al obtener notificaciones", error?.message || error);
      // En caso de error, mantener array vacío - NO usar datos mock
      setNotifications([]);
    }
  };

  // 🔹 Marcar como leído
  const markAsRead = async (id) => {
    try {
      await axiosInstance.put(`${API_BASE}/leido/${id}`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
      // Actualizar contador
      fetchUnreadCount();
    } catch (error) {
      console.error("Error marcando notificación como leída", error?.message || error);
    }
  };

  // 🔹 Eliminar notificación
  const deleteNotification = async (id) => {
    try {
      await axiosInstance.put(`${API_BASE}/eliminado/${id}`);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      // Actualizar contador
      fetchUnreadCount();
    } catch (error) {
      console.error("Error eliminando notificación", error?.message || error);
    }
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
