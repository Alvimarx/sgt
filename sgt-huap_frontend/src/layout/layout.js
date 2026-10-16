// Modo de presentación: ¿la app se está mostrando en modo desktop o en móvil?
//
// Una sola fuente de verdad para el breakpoint del modo desktop (R16/R18).
// Bajo el umbral la app se ve exactamente como siempre (marco de teléfono y
// TabBar); desde el umbral, todas las vistas logueadas se montan en el marco
// desktop (DesktopShell) y las piezas compartidas cambian de presentación:
// los Sheet pasan a panel lateral, los diálogos se centran en la ventana.
//
// Las vistas leen el modo con useLayout() y bifurcan SOLO la presentación;
// la lógica de datos y de negocio es una sola para ambos modos.
// El estado lo mantiene <LayoutProvider> (LayoutProvider.jsx).
import { createContext, useContext } from 'react';

// 1200 px: cubre los monitores de los servicios (1280, 1366, 1920) y deja
// tablets y ventanas angostas en el layout móvil (decisión del 16 oct 2026).
export const BREAKPOINT_DESKTOP = 1200;
export const QUERY_DESKTOP = `(min-width: ${BREAKPOINT_DESKTOP}px)`;

export const LayoutContext = createContext({ esDesktop: false });

export const useLayout = () => useContext(LayoutContext);
