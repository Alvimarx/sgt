// Contexto de las notificaciones. El proveedor (NotificationProvider) vive en
// NotificationProvider.jsx para que este archivo no mezcle componentes con el
// hook (fast refresh de Vite).
import { createContext, useContext } from "react";

/**
 * NOTIFICATION CONTEXT
 * 
 * Este contexto SOLO utiliza datos proporcionados por el backend.
 * NO utiliza datos mock, datos de prueba, ni datos por defecto.
 * Todas las notificaciones y contadores se obtienen de la API del servidor.
 */

const NotificationContext = createContext(null);

// Hook para usar el context
export const useNotifications = () => useContext(NotificationContext);

export default NotificationContext;
