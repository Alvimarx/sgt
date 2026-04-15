import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { useMediaQuery } from "react-responsive";
import { useNavigate } from "react-router-dom";
import { useLocation } from 'react-router-dom';
import { useAuth } from "../../../context/AuthContext";
import Menu from "../../Menu/jsx/Menu.jsx";
import CalendarioMensual from "./CalendarioMensual";
import CalendarioSemanal from "./CalendarioSemanal";
import CalendarioDiario from "./CalendarioDiario";
import dayView from "/day_view.svg";
import weeklyView from "/weekly_view.svg";
import monthlyView from "/monthly_view.svg";
import { getTextColor } from "../../../utils/pasilloColors";
import { fetchAndTransformTurnos, deleteTurno } from "../../../services/turnosService";
import { usuariosService, pisosService } from "../../../services/adminService";
import { Roles } from '../../../context/AuthContext';
import AsignarTurnoModal from '../../Administracion/jsx/AsignarTurnoModal';


import "../css/Calendario-Base.css";

const DIAS_SEMANA = ["LUN", "MAR", "MIE", "JUE", "VIE", "SAB", "DOM"];
const DIAS_SEMANA_COMPLETO = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const MESES_ESP = [
    "ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO",
    "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE",
];
const PASILLOS = ["6to A", "6to C", "4to A", "4to B", "4to C", "3er", "R1"];

const removeEmojis = (str) => {
    if (!str) return str;
    return str.replace(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F700}-\u{1F77F}]|[\u{1F780}-\u{1F7FF}]|[\u{1F800}-\u{1F8FF}]|[\u{1F900}-\u{1F9FF}]|[\u{1FA00}-\u{1FA6F}]|[\u{1FA70}-\u{1FAFF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '').trim();
};

const createInitialZoomState = (scale = 1, translateX = 0, translateY = 0) => ({ scale, translateX, translateY });
const MIN_ZOOM = 0.2;
const MAX_ZOOM = 2.5;
const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
const distanceBetween = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const midpointOf = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

export default function Calendario({ initialDate = new Date() }) {
    const navigate = useNavigate();
    const location = useLocation();
    const auth = useAuth();
    const currentUserId = auth?.user?.id;

    const [currentMonth, setCurrentMonth] = useState(() => new Date(initialDate.getFullYear(), initialDate.getMonth(), 1));
    const [currentWeek, setCurrentWeek] = useState(initialDate);
    const [view, setView] = useState("mes"); // "mes" | "semana"
    const [selectedDate, setSelectedDate] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [pasilloActual, setPasilloActual] = useState("6to A");
    const [currentDay, setCurrentDay] = useState(initialDate);
    const [showPasillos, setShowPasillos] = useState(false);
    const [showSearch, setShowSearch] = useState(false);
    const [pasillosSeleccionados, setPasillosSeleccionados] = useState([]);
    const [zoomState, setZoomState] = useState(createInitialZoomState);
    const zoomStateRef = useRef(createInitialZoomState());
    const [searchNombre, setSearchNombre] = useState('');
    const [mostrarSinAsignar, setMostrarSinAsignar] = useState(false);
    const defaultZoomRef = useRef(1);
    const [isAsignarModalOpen, setIsAsignarModalOpen] = useState(false);
    const [turnoAAsignar, setTurnoAAsignar] = useState(null);

    // Helper para verificar rol JEFATURA
    const isJefatura = useMemo(() => {
        try {
            const userData = JSON.parse(localStorage.getItem('user_data'));
            return userData?.rol === 'JEFATURA';
        } catch { return false; }
    }, []);

    // 🌟 ESTADO PARA EL MENSAJE DE INSTRUCCIÓN 🌟
    const [mensajeInstruccion, setMensajeInstruccion] = useState(null);

    // API data states
    const [turnos, setTurnos] = useState([]);
    const [users, setUsers] = useState([]);
    const [pisos, setPisos] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [initialLoadDone, setInitialLoadDone] = useState(false);
    const zoomContainerRef = useRef(null);
    const zoomContentRef = useRef(null);
    const swipeStateRef = useRef({ startX: 0, startY: 0, isSwiping: false, active: false });
    const gestureRef = useRef({
        pointers: new Map(),
        initialDistance: null,
        initialScale: 1,
        initialMidpoint: null,
        contentPivot: { x: 0, y: 0 },
        startTranslate: { x: 0, y: 0 },
        isPanning: false,
        panStartPoint: null,
    });
    const baseDimensionsRef = useRef({ width: 0, height: 0 });
    const allowInteractiveZoom = true;

    // 🌟 EFECTO PARA LEER EL MENSAJE DE INSTRUCCIÓN DE LA URL 🌟
    useEffect(() => {
        if (location.state && location.state.instructionMessage) {
            setMensajeInstruccion(location.state.instructionMessage);
        } else if (mensajeInstruccion) {
            // Limpiar si el mensaje existe pero el estado de la URL ya no lo contiene
            setMensajeInstruccion(null);
        }
    }, [location.state]);
    // ----------------------------------------------------------------------


    // Fetch users and turnos from API on component mount and when month changes
    useEffect(() => {
        const loadData = async () => {
            try {
                if (!initialLoadDone) setLoading(true);
                setError(null);

                const usersData = await usuariosService.getAll();
                setUsers(usersData);

                const currentUser = usersData.find(user => user.idPersonal === currentUserId);
                const servicioId = currentUser?.idServicio;

                if (!servicioId) {
                    setError('No se pudo obtener el servicio del usuario');
                    setLoading(false);
                    return;
                }

                try {
                    const pisosData = await pisosService.getAll();
                    setPisos(pisosData);
                } catch (pisosErr) {
                    console.warn('Error loading pisos:', pisosErr);
                    setPisos([]);
                }

                const userMap = new Map();
                usersData.forEach(user => {
                    if (user.idPersonal) {
                        userMap.set(user.idPersonal, user);
                    }
                });

                const year = currentMonth.getFullYear();
                const month = currentMonth.getMonth() + 1;

                const turnosData = await fetchAndTransformTurnos(userMap, servicioId, year, month);
                setTurnos(turnosData);
            } catch (err) {
                console.error('Error loading data:', err);
                setError(err.message || 'Error al cargar los datos');
            } finally {
                setLoading(false);
                setInitialLoadDone(true);
            }
        };

        loadData();

        // Listener para recargar calendario cuando una solicitud es modificada
        // (ej. aprobada/rechazada) en otra parte de la app (Admin/CalendarView)
        const onSolicitudUpdated = (e) => {
            try {
                // Forzar recarga de datos (set initialLoadDone false provoca re-fetch)
                setInitialLoadDone(false)
            } catch (err) {
                console.warn('Calendario: error manejando evento solicitud:updated', err)
            }
        }

        if (typeof window !== 'undefined' && window.addEventListener) {
            window.addEventListener('solicitud:updated', onSolicitudUpdated)
        }

        return () => {
            if (typeof window !== 'undefined' && window.removeEventListener) {
                window.removeEventListener('solicitud:updated', onSolicitudUpdated)
            }
        }
    }, [currentUserId, currentMonth, initialLoadDone]);

    // Update selected pasillos when pisos change
    useEffect(() => {
        if (pisos.length > 0) {
            const pisoNames = pisos.map(piso => piso.nombre);
            setPasillosSeleccionados(currentSelected => {
                // Keep only the pasillos that still exist in the new pisos list
                const validSelected = currentSelected.filter(pasillo => pisoNames.includes(pasillo));
                if (validSelected.length > 0) return validSelected;

                // If no valid selections remain, try to select the preferred current pasillo
                // otherwise pick the first available piso
                const preferred = pisoNames.includes(pasilloActual) ? pasilloActual : pisoNames[0];
                return preferred ? [preferred] : [];
            });
        } else {
            setPasillosSeleccionados([]);
        }
    }, [pisos, pasilloActual]);

    const turnosByDay = useMemo(() => {
        const grouped = {};
        turnos.forEach((item) => {
            if (!item?.Dia || !item?.Seccion) {
                return;
            }

            // Apply search filter by doctor name
            if (searchNombre.trim() !== '') {
                const searchLower = searchNombre.toLowerCase();
                const doctorName = item.Doctor?.toLowerCase() || '';
                if (!doctorName.includes(searchLower)) {
                    return; // Skip this turno if it doesn't match the search
                }
            }

            // Apply filter for unassigned shifts
            if (mostrarSinAsignar) {
                const isUnassigned = !item.Doctor ||
                    item.Doctor.toLowerCase() === 'sin asignar' ||
                    (item._original && !item._original.idMedico);
                if (!isUnassigned) {
                    return; // Skip this turno if it's assigned (when filter is active)
                }
            }

            const parts = item.Dia.split('-');
            if (parts.length !== 3) {
                return;
            }
            const [yearStr, monthStr, dayStr] = parts;
            const year = Number(yearStr);
            const monthIndex = Number(monthStr) - 1;
            const day = Number(dayStr);
            if (!Number.isInteger(year) || !Number.isInteger(monthIndex) || !Number.isInteger(day)) {
                return;
            }
            if (monthIndex < 0 || monthIndex > 11 || day < 1 || day > 31) {
                return;
            }
            const parsedDate = new Date(year, monthIndex, day);
            if (Number.isNaN(parsedDate.getTime())) {
                return;
            }
            // Usar formato consistente 'YYYY-MM-DD' (mes 1-based, con padding) para que coincida con el resto de la app
            const dayKey = `${parsedDate.getFullYear()}-${String(parsedDate.getMonth() + 1).padStart(2, '0')}-${String(parsedDate.getDate()).padStart(2, '0')}`;
            // Normalizar el nombre del piso: reemplazar underscores por espacios y convertir a mayúsculas
            const pasilloKey = item.Seccion.replace(/_/g, ' ').trim().toUpperCase();
            if (!grouped[dayKey]) {
                grouped[dayKey] = {};
            }
            if (!grouped[dayKey][pasilloKey]) {
                grouped[dayKey][pasilloKey] = { turnos: [] };
            }
            grouped[dayKey][pasilloKey].turnos.push({
                tipo: item.Horario ?? 'SIN HORARIO',
                doctor: item.Doctor ?? 'SIN ASIGNAR',
                color: item.Color ?? '#CBD5F5',
                originalData: item._original || null,
            });
        });
        return grouped;
    }, [turnos, searchNombre, mostrarSinAsignar]);

    // Create a mapping from piso nombre to piso data (including colorHexa)
    const pisoColorMap = useMemo(() => {
        const map = {};
        pisos.forEach((piso) => {
            if (piso.nombre && piso.colorHexa) {
                // Normalize the nombre to match how it's used in the calendar
                const normalizedNombre = piso.nombre.replace(/_/g, ' ').trim().toUpperCase();
                map[normalizedNombre] = {
                    color: piso.colorHexa,
                    nombre: piso.nombre
                };
            }
        });
        return map;
    }, [pisos]);



    // Referencias para la sincronización del scroll
    const weekdaysRef = useRef(null);
    const gridRef = useRef(null);

    // Detectamos tipo de dispositivo
    const isMobile = useMediaQuery({ maxWidth: 768 });
    const isTablet = useMediaQuery({ minWidth: 769, maxWidth: 1024 });
    const isDesktop = useMediaQuery({ minWidth: 1025 });
    const enableSwipeNavigation = isMobile || isTablet;
    const VIEW_SEQUENCE = useMemo(() => ["mes", "semana", "dia"], []);
    const pasillosKey = useMemo(() => pasillosSeleccionados.join('|'), [pasillosSeleccionados]);
    const monthKey = useMemo(() => `${currentMonth.getFullYear()}-${currentMonth.getMonth()}`, [currentMonth]);
    const weekKey = useMemo(() => `${currentWeek.getFullYear()}-${currentWeek.getMonth()}-${currentWeek.getDate()}`, [currentWeek]);

    const getDefaultZoomState = useCallback(() => {
        const container = zoomContainerRef.current;
        const base = baseDimensionsRef.current;
        let baseScale = 1;

        if (isMobile && container && base.width) {
            const widthRatio = container.offsetWidth / base.width;
            if (Number.isFinite(widthRatio) && widthRatio > 0) {
                baseScale = Math.min(1, widthRatio);
            }
        }

        if (baseScale < MIN_ZOOM) {
            baseScale = MIN_ZOOM;
        }

        return createInitialZoomState(baseScale);
    }, [isMobile]);

    // Efecto para sincronizar el scroll horizontal entre weekdays y grid
    useEffect(() => {
        if (!isMobile || view !== "mes") return;

        const weekdaysElement = weekdaysRef.current;
        const gridElement = gridRef.current;

        if (!weekdaysElement || !gridElement) return;

        let isScrolling = false;

        const syncScrollFromWeekdays = () => {
            if (!isScrolling) {
                isScrolling = true;
                gridElement.scrollLeft = weekdaysElement.scrollLeft;
                requestAnimationFrame(() => {
                    isScrolling = false;
                });
            }
        };

        const syncScrollFromGrid = () => {
            if (!isScrolling) {
                isScrolling = true;
                weekdaysElement.scrollLeft = gridElement.scrollLeft;
                requestAnimationFrame(() => {
                    isScrolling = false;
                });
            }
        };

        // Agregar event listeners
        weekdaysElement.addEventListener('scroll', syncScrollFromWeekdays, { passive: true });
        gridElement.addEventListener('scroll', syncScrollFromGrid, { passive: true });

        // Cleanup
        return () => {
            weekdaysElement?.removeEventListener('scroll', syncScrollFromWeekdays);
            gridElement?.removeEventListener('scroll', syncScrollFromGrid);
        };
    }, [isMobile, view]);

    useEffect(() => {
        zoomStateRef.current = zoomState;
    }, [zoomState]);

    useEffect(() => {
        if (!zoomContentRef.current) return;
        baseDimensionsRef.current = {
            width: zoomContentRef.current.offsetWidth,
            height: zoomContentRef.current.offsetHeight,
        };
    }, [view, pasillosKey, monthKey, weekKey, isMobile]);

    useEffect(() => {
        const next = getDefaultZoomState();
        setZoomState(next);
        zoomStateRef.current = next;
        defaultZoomRef.current = next.scale;
        gestureRef.current.pointers.clear();
        gestureRef.current.initialDistance = null;
        gestureRef.current.initialScale = next.scale;
        gestureRef.current.initialMidpoint = null;
        gestureRef.current.contentPivot = { x: 0, y: 0 };
        gestureRef.current.startTranslate = { x: next.translateX, y: next.translateY };
        gestureRef.current.isPanning = false;
        gestureRef.current.panStartPoint = null;
    }, [view, pasillosKey, monthKey, weekKey, getDefaultZoomState]);


    useEffect(() => {
        if (!isMobile) {
            return;
        }

        const handleResize = () => {
            if (zoomContentRef.current) {
                baseDimensionsRef.current = {
                    width: zoomContentRef.current.offsetWidth,
                    height: zoomContentRef.current.offsetHeight,
                };
            }

            const next = getDefaultZoomState();
            const deltaScale = Math.abs(next.scale - zoomStateRef.current.scale);
            const deltaTranslateX = Math.abs(next.translateX - zoomStateRef.current.translateX);
            const deltaTranslateY = Math.abs(next.translateY - zoomStateRef.current.translateY);

            if (deltaScale > 0.01 || deltaTranslateX > 0.5 || deltaTranslateY > 0.5) {
                setZoomState(next);
                zoomStateRef.current = next;
                defaultZoomRef.current = next.scale;
            }
        };

        window.addEventListener('resize', handleResize);
        return () => {
            window.removeEventListener('resize', handleResize);
        };
    }, [isMobile, getDefaultZoomState]);

    //función simple para cambiar vista
    const handleViewChange = (newView) => {
        setView(newView);
    };

    const cycleView = useCallback((direction) => {
        setView((prevView) => {
            const currentIndex = VIEW_SEQUENCE.indexOf(prevView);
            if (currentIndex === -1) {
                return prevView;
            }
            const nextIndex = (currentIndex + direction + VIEW_SEQUENCE.length) % VIEW_SEQUENCE.length;
            const nextView = VIEW_SEQUENCE[nextIndex];
            return nextView;
        });
    }, [VIEW_SEQUENCE]);

    const handleTouchStart = useCallback((event) => {
        if (!enableSwipeNavigation) {
            return;
        }
        if (!event.touches || event.touches.length !== 1) {
            swipeStateRef.current = { startX: 0, startY: 0, isSwiping: false, active: false };
            return;
        }

        const touch = event.touches[0];
        swipeStateRef.current = {
            startX: touch.clientX,
            startY: touch.clientY,
            isSwiping: false,
            active: true,
        };
    }, [enableSwipeNavigation]);

    const handleTouchMove = useCallback((event) => {
        if (!enableSwipeNavigation) {
            return;
        }
        const state = swipeStateRef.current;
        if (!state.active || !event.touches || event.touches.length !== 1) {
            return;
        }

        const touch = event.touches[0];
        const deltaX = touch.clientX - state.startX;
        const deltaY = touch.clientY - state.startY;

        if (!state.isSwiping) {
            if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > 20) {
                swipeStateRef.current.active = false;
                return;
            }

            if (Math.abs(deltaX) > 20 && Math.abs(deltaX) > Math.abs(deltaY)) {
                swipeStateRef.current.isSwiping = true;
            }
        }

        if (swipeStateRef.current.isSwiping) {
            event.preventDefault();
        }
    }, [enableSwipeNavigation]);

    const resetSwipeState = useCallback(() => {
        swipeStateRef.current = { startX: 0, startY: 0, isSwiping: false, active: false };
    }, []);

    const handleTouchEnd = useCallback((event) => {
        if (!enableSwipeNavigation) {
            return;
        }
        const state = swipeStateRef.current;
        if (!state.active) {
            resetSwipeState();
            return;
        }

        const touch = event.changedTouches && event.changedTouches.length > 0
            ? event.changedTouches[0]
            : null;

        if (touch) {
            const deltaX = touch.clientX - state.startX;
            const deltaY = touch.clientY - state.startY;

            if (state.isSwiping && Math.abs(deltaX) > 60 && Math.abs(deltaX) > Math.abs(deltaY)) {
                if (deltaX < 0) {
                    cycleView(1); // swipe left -> siguiente
                } else {
                    cycleView(-1); // swipe right -> anterior
                }
            }
        }

        resetSwipeState();
    }, [enableSwipeNavigation, cycleView, resetSwipeState]);

    const handleTouchCancel = useCallback(() => {
        resetSwipeState();
    }, [resetSwipeState]);

    const resetZoom = useCallback(() => {
        const next = getDefaultZoomState();
        setZoomState(next);
        zoomStateRef.current = next;
        defaultZoomRef.current = next.scale;
        gestureRef.current.pointers.clear();
        gestureRef.current.initialDistance = null;
        gestureRef.current.initialScale = next.scale;
        gestureRef.current.initialMidpoint = null;
        gestureRef.current.contentPivot = { x: 0, y: 0 };
        gestureRef.current.startTranslate = { x: next.translateX, y: next.translateY };
        gestureRef.current.isPanning = false;
        gestureRef.current.panStartPoint = null;
    }, [getDefaultZoomState]);

    const computeBounds = useCallback((scale) => {
        const container = zoomContainerRef.current;
        if (!container) {
            return { minX: 0, maxX: 0, minY: 0, maxY: 0 };
        }

        const containerRect = container.getBoundingClientRect();
        const base = baseDimensionsRef.current;
        const baseWidth = base.width || containerRect.width;
        const baseHeight = base.height || containerRect.height;
        const contentWidth = baseWidth * scale;
        const contentHeight = baseHeight * scale;
        const minTranslateX = Math.min(0, containerRect.width - contentWidth);
        const minTranslateY = Math.min(0, containerRect.height - contentHeight);

        return {
            minX: minTranslateX,
            maxX: 0,
            minY: minTranslateY,
            maxY: 0,
        };
    }, []);

    const handlePointerDown = useCallback((event) => {
        if (!allowInteractiveZoom || !isMobile || event.pointerType !== 'touch') {
            return;
        }

        const container = zoomContainerRef.current;
        const content = zoomContentRef.current;
        if (!container || !content) {
            return;
        }

        const captureTarget = event.currentTarget;
        const supportsPointerCapture = typeof captureTarget.setPointerCapture === 'function';
        const supportsHasPointerCapture = typeof captureTarget.hasPointerCapture === 'function';

        const point = { x: event.clientX, y: event.clientY };
        gestureRef.current.pointers.set(event.pointerId, point);

        baseDimensionsRef.current = {
            width: content.offsetWidth,
            height: content.offsetHeight,
        };

        const activePointers = gestureRef.current.pointers.size;
        const requiresCapture = supportsPointerCapture && (activePointers >= 2 || zoomStateRef.current.scale > defaultZoomRef.current + 0.01);

        if (requiresCapture) {
            for (const pointerId of gestureRef.current.pointers.keys()) {
                try {
                    captureTarget.setPointerCapture(pointerId);
                } catch (err) {
                    // ignore environments without capture support
                }
            }
        } else if (supportsPointerCapture && supportsHasPointerCapture && captureTarget.hasPointerCapture(event.pointerId)) {
            try {
                captureTarget.releasePointerCapture(event.pointerId);
            } catch (err) {
                // ignore
            }
        }

        if (activePointers === 2) {
            const [p1, p2] = Array.from(gestureRef.current.pointers.values());
            const initialDistance = distanceBetween(p1, p2);

            if (!initialDistance) {
                return;
            }

            gestureRef.current.initialDistance = initialDistance;
            gestureRef.current.initialScale = zoomStateRef.current.scale;
            gestureRef.current.startTranslate = {
                x: zoomStateRef.current.translateX,
                y: zoomStateRef.current.translateY,
            };

            const mid = midpointOf(p1, p2);
            gestureRef.current.initialMidpoint = mid;

            const containerRect = container.getBoundingClientRect();
            const relativeMid = {
                x: mid.x - containerRect.left,
                y: mid.y - containerRect.top,
            };

            const initialScale = gestureRef.current.initialScale || MIN_ZOOM;
            gestureRef.current.contentPivot = {
                x: (relativeMid.x - gestureRef.current.startTranslate.x) / initialScale,
                y: (relativeMid.y - gestureRef.current.startTranslate.y) / initialScale,
            };
            gestureRef.current.isPanning = false;
        } else if (activePointers === 1) {
            gestureRef.current.panStartPoint = point;
            gestureRef.current.startTranslate = {
                x: zoomStateRef.current.translateX,
                y: zoomStateRef.current.translateY,
            };
            gestureRef.current.isPanning = zoomStateRef.current.scale > defaultZoomRef.current + 0.01;
        }
    }, [isMobile]);


    const handlePointerMove = useCallback((event) => {
        if (!allowInteractiveZoom || !isMobile) {
            return;
        }

        const container = zoomContainerRef.current;
        if (!container) {
            return;
        }

        if (!gestureRef.current.pointers.has(event.pointerId)) {
            return;
        }

        const point = { x: event.clientX, y: event.clientY };
        gestureRef.current.pointers.set(event.pointerId, point);

        if (gestureRef.current.pointers.size === 2 && gestureRef.current.initialDistance) {
            event.preventDefault();
            const [p1, p2] = Array.from(gestureRef.current.pointers.values());
            const distance = distanceBetween(p1, p2);

            if (!distance) {
                return;
            }

            let scale = gestureRef.current.initialScale * (distance / gestureRef.current.initialDistance);
            const minScale = Math.max(defaultZoomRef.current, MIN_ZOOM);
            scale = clamp(scale, minScale, MAX_ZOOM);

            const mid = midpointOf(p1, p2);
            const containerRect = container.getBoundingClientRect();
            const relativeMid = {
                x: mid.x - containerRect.left,
                y: mid.y - containerRect.top,
            };

            const pivot = gestureRef.current.contentPivot;
            let translateX = relativeMid.x - pivot.x * scale;
            let translateY = relativeMid.y - pivot.y * scale;

            const bounds = computeBounds(scale);
            translateX = clamp(translateX, bounds.minX, bounds.maxX);
            translateY = clamp(translateY, bounds.minY, bounds.maxY);

            setZoomState((prev) => {
                const next = { ...prev, scale, translateX, translateY };
                zoomStateRef.current = next;
                return next;
            });
        } else if (gestureRef.current.pointers.size === 1 && gestureRef.current.isPanning) {
            event.preventDefault();
            const startPoint = gestureRef.current.panStartPoint || point;
            const deltaX = point.x - startPoint.x;
            const deltaY = point.y - startPoint.y;

            const bounds = computeBounds(zoomStateRef.current.scale);
            let translateX = gestureRef.current.startTranslate.x + deltaX;
            let translateY = gestureRef.current.startTranslate.y + deltaY;

            translateX = clamp(translateX, bounds.minX, bounds.maxX);
            translateY = clamp(translateY, bounds.minY, bounds.maxY);

            setZoomState((prev) => {
                const next = { ...prev, translateX, translateY };
                zoomStateRef.current = next;
                return next;
            });
        }
    }, [isMobile, computeBounds, getDefaultZoomState]);

    const handlePointerUp = useCallback((event) => {
        if (!allowInteractiveZoom || !isMobile) {
            return;
        }

        const captureTarget = event.currentTarget;
        const supportsRelease = captureTarget && typeof captureTarget.releasePointerCapture === 'function';
        const supportsHasPointerCapture = captureTarget && typeof captureTarget.hasPointerCapture === 'function';
        if (supportsRelease && supportsHasPointerCapture && captureTarget.hasPointerCapture(event.pointerId)) {
            try {
                captureTarget.releasePointerCapture(event.pointerId);
            } catch (err) {
                // ignore
            }
        }

        gestureRef.current.pointers.delete(event.pointerId);

        if (gestureRef.current.pointers.size < 2) {
            gestureRef.current.initialDistance = null;
            gestureRef.current.initialScale = zoomStateRef.current.scale;
            gestureRef.current.initialMidpoint = null;
        }

        if (gestureRef.current.pointers.size === 1) {
            const [remainingPointer] = gestureRef.current.pointers.values();
            gestureRef.current.panStartPoint = remainingPointer;
            gestureRef.current.startTranslate = {
                x: zoomStateRef.current.translateX,
                y: zoomStateRef.current.translateY,
            };
            gestureRef.current.isPanning = zoomStateRef.current.scale > defaultZoomRef.current + 0.01;
        }

        if (gestureRef.current.pointers.size === 0) {
            gestureRef.current.isPanning = false;
            gestureRef.current.panStartPoint = null;
            gestureRef.current.startTranslate = {
                x: zoomStateRef.current.translateX,
                y: zoomStateRef.current.translateY,
            };

            const bounds = computeBounds(zoomStateRef.current.scale);
            const clampedX = clamp(zoomStateRef.current.translateX, bounds.minX, bounds.maxX);
            const clampedY = clamp(zoomStateRef.current.translateY, bounds.minY, bounds.maxY);

            const shouldReset = Math.abs(zoomStateRef.current.scale - defaultZoomRef.current) <= 0.05;
            if (shouldReset) {
                const next = getDefaultZoomState();
                setZoomState(next);
                zoomStateRef.current = next;
                defaultZoomRef.current = next.scale;
            } else if (clampedX !== zoomStateRef.current.translateX || clampedY !== zoomStateRef.current.translateY) {
                const next = {
                    ...zoomStateRef.current,
                    translateX: clampedX,
                    translateY: clampedY,
                };
                setZoomState(next);
                zoomStateRef.current = next;
            }
        }
    }, [isMobile, computeBounds, getDefaultZoomState]);

    function addMonths(date, delta) {
        return new Date(date.getFullYear(), date.getMonth() + delta, 1);
    }
    function prevMonth() { setCurrentMonth((s) => addMonths(s, -1)); }
    function nextMonth() { setCurrentMonth((s) => addMonths(s, 1)); }

    function addDays(date, delta) {
        const d = new Date(date);
        d.setDate(d.getDate() + delta);
        return d;
    }
    function prevDay() { setCurrentDay((s) => addDays(s, -1)); }
    function nextDay() { setCurrentDay((s) => addDays(s, 1)); }

    function addWeeks(date, delta) {
        const d = new Date(date);
        d.setDate(d.getDate() + delta * 7);
        return d;
    }
    function prevWeek() { setCurrentWeek((s) => addWeeks(s, -1)); }
    function nextWeek() { setCurrentWeek((s) => addWeeks(s, 1)); }

    const monthMatrix = useMemo(() => {
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();
        const firstDay = new Date(year, month, 1);
        const firstWeekday = (firstDay.getDay() + 6) % 7;
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        const cells = [];
        const prevMonthDays = firstWeekday;
        const prevMonthLastDate = new Date(year, month, 0).getDate();

        for (let i = prevMonthDays - 1; i >= 0; i--) {
            const dayNumber = prevMonthLastDate - i;
            const dateObj = new Date(year, month - 1, dayNumber);
            cells.push({ day: dayNumber, date: dateObj, inMonth: false });
        }
        for (let d = 1; d <= daysInMonth; d++) {
            const dateObj = new Date(year, month, d);
            cells.push({ day: d, date: dateObj, inMonth: true });
        }
        const remaining = (7 - (cells.length % 7)) % 7;
        for (let i = 1; i <= remaining; i++) {
            const dateObj = new Date(year, month + 1, i);
            cells.push({ day: i, date: dateObj, inMonth: false });
        }
        return cells;
    }, [currentMonth]);

    function getWeekDays(date) {
        const monday = new Date(date);
        monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
        const days = [];
        for (let i = 0; i < 7; i++) {
            const d = new Date(monday);
            d.setDate(monday.getDate() + i);
            days.push(d);
        }
        return days;
    }

    const handleDayClick = (date) => {
        setSelectedDate(date);
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setSelectedDate(null);
    };

    const togglePasillos = () => {
        setShowPasillos(!showPasillos);
    };

    const selectPasillo = (pasillo) => {
        // Si ya está seleccionado, lo quitamos, si no, lo añadimos
        if (pasillosSeleccionados.includes(pasillo)) {
            setPasillosSeleccionados(pasillosSeleccionados.filter(p => p !== pasillo));
        } else {
            setPasillosSeleccionados([...pasillosSeleccionados, pasillo]);
        }
    };

    // Función para seleccionar todos los pisos
    const selectTodosPisos = () => {
        const todosLosPisos = pisos.map(p => p.nombre);
        setPasillosSeleccionados(todosLosPisos);
    };

    // Función para deseleccionar todos los pisos
    const selectNingunPiso = () => {
        setPasillosSeleccionados([]);
    };

    // Función para obtener datos de turno para un día específico
    const getTurnoData = (date, pasillo) => {
        if (!date || !pasillo) {
            return null;
        }
        // Normalizar clave a 'YYYY-MM-DD' (mes 1-based, con padding)
        const dayKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        // Normalizar el nombre del piso: reemplazar underscores por espacios y convertir a mayúsculas
        const pasilloKey = pasillo.replace(/_/g, ' ').trim().toUpperCase();
        return turnosByDay[dayKey]?.[pasilloKey] || null;
    };

    // Función para manejar el clic en el botón de solicitar cambio
    const handleSolicitarCambio = (turno) => {
        closeModal(); // Cierra el modal antes de navegar
        navigate('/solicitudes/cambio', {
            state: { turnoDeseado: turno.originalData }
        });
    };

    // Función para manejar el clic en el botón de ofrecer turno
    const handleOfrecerTurno = (turno) => {
        closeModal();
        navigate('/solicitudes/ofrecer', {
            state: { turnoPropio: turno.originalData }
        });
    };

    const handleSolicitarTurno = (turno) => {
        closeModal();
        navigate('/solicitudes/turno', {
            state: {
                turnoDisponible: turno.originalData,
                idPreseleccionado: turno.originalData.id
            }
        });
    }

    // Función para manejar el clic en el botón de soltar turno
    const handleSoltarTurno = (turno) => {
        closeModal();
        navigate('/solicitudes/botar-turno', {
            state: { turnoALiberar: turno.originalData }
        });
    }

    useEffect(() => {
        const handleScroll = () => {
            if (window.scrollY > 50) {
                document.querySelector(".sticky-controls")?.classList.add("scrolled");
            } else {
                document.querySelector(".sticky-controls")?.classList.remove("scrolled");
            }
        };

        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);


    const weekDays = getWeekDays(currentWeek);
    const today = new Date();

    const titleMes = MESES_ESP[currentMonth.getMonth()];
    const titleSemana = `Semana del ${weekDays[0].getDate()} al ${weekDays[6].getDate()} de ${MESES_ESP[weekDays[0].getMonth()]}`;

    const titleDia = (
        <>
            {DIAS_SEMANA_COMPLETO[currentDay.getDay()]}
            <br />
            {currentDay.getDate()} de {MESES_ESP[currentDay.getMonth()].toLowerCase()}
        </>
    );
    const currentTitle = view === "mes" ? titleMes : view === "semana" ? titleSemana : titleDia;


    const handlePrev = view === "mes" ? prevMonth : view === "semana" ? prevWeek : prevDay;
    const handleNext = view === "mes" ? nextMonth : view === "semana" ? nextWeek : nextDay;

    const isZoomedBeyondBase = allowInteractiveZoom && (zoomState.scale > defaultZoomRef.current + 0.01);
    const showResetZoom = allowInteractiveZoom && isMobile && isZoomedBeyondBase;

    const zoomContentStyle = allowInteractiveZoom
        ? {
            transform: `translate(${zoomState.translateX}px, ${zoomState.translateY}px) scale(${zoomState.scale})`,
            touchAction: isZoomedBeyondBase ? 'none' : 'pan-y pinch-zoom',
            cursor: isZoomedBeyondBase ? 'grab' : 'auto',
        }
        : undefined;

    const formatDate = (date) => {
        return `${date.getDate()} de ${MESES_ESP[date.getMonth()]} de ${date.getFullYear()}`;
    };

    return (
        <React.Fragment>
            <Menu />

            {/* Loading state */}
            {loading && (
                <div className="calendario-loading">
                    <div className="loading-spinner"></div>
                    <p>Cargando turnos...</p>
                </div>
            )}

            {/* Error state */}
            {error && !loading && (
                <div className="calendario-error">
                    <p>Error: {error}</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="error-retry-btn"
                    >
                        Reintentar
                    </button>
                </div>
            )}

            {/* Calendar content - only show when not loading and no error */}
            {!loading && !error && (
                <>
                    {/* 🌟 BANNER DE INSTRUCCIÓN FLOTANTE (Toast) 🌟 */}
                    {mensajeInstruccion && (
                        <div className="instruction-toast-container" style={{
                            position: 'fixed',
                            top: '55px', /* Ubicación bajo el header */
                            left: '50%',
                            transform: 'translateX(-50%)',
                            zIndex: 1000,
                            padding: '10px 15px',
                            backgroundColor: '#ffe0b2',
                            color: '#e65100',
                            border: '1px solid #ffcc80',
                            borderRadius: '8px',
                            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)'
                        }}>
                            <p style={{ margin: '0', fontWeight: '600', display: 'inline-block' }}>
                                ⚠️ {mensajeInstruccion}
                            </p>
                            <button
                                onClick={() => {
                                    // Limpiar el estado de la URL y el estado local al cerrar
                                    navigate('/calendario', { replace: true, state: {} });
                                    setMensajeInstruccion(null);
                                }}
                                style={{
                                    marginLeft: '15px',
                                    backgroundColor: 'transparent',
                                    border: 'none',
                                    color: '#e65100',
                                    fontSize: '1.2rem',
                                    cursor: 'pointer'
                                }}
                            >
                                &times;
                            </button>
                        </div>
                    )}
                    {/* ----------------------------- */}


                    <div className="calendario-root">

                        {/* Botones de vista: se van al hacer scroll */}
                        <div className="calendario-controls top-container">
                            <div className="view-toggle-container">
                                <button
                                    type="button"
                                    className={"view-btn " + (view === "mes" ? "active" : "")}
                                    onClick={() => handleViewChange("mes")}
                                >
                                    <img src={monthlyView} alt="Vista Mensual" className="view-icon" />
                                    <span>Vista Mensual</span>
                                </button>
                                <button
                                    type="button"
                                    className={"view-btn " + (view === "semana" ? "active" : "")}
                                    onClick={() => handleViewChange("semana")}
                                >
                                    <img src={weeklyView} alt="Vista Semanal" className="view-icon" />
                                    <span>Vista Semanal</span>
                                </button>
                                <button
                                    type="button"
                                    className={"view-btn " + (view === "dia" ? "active" : "")}
                                    onClick={() => handleViewChange("dia")}
                                >
                                    <img src={dayView} alt="Vista Diaria" className="view-icon" />
                                    <span>Vista Diaria</span>
                                </button>
                            </div>
                        </div>

                        {/* Controles sticky: siempre visibles al scrollear */}
                        <div className="sticky-controls">
                            <div className="filtros-container">
                                {/* Botón de filtros */}
                                <div className="pasillo-selector">
                                    <span className="pasillo-label">Filtros:</span>
                                    <button type="button" className="filtros-btn" onClick={togglePasillos}>
                                        {pasillosSeleccionados.length > 0
                                            ? `${pasillosSeleccionados.length} pisos seleccionados`
                                            : "Seleccionar filtros"}
                                    </button>
                                </div>
                            </div>

                            <header className="calendario-header">
                                <button type="button" className="nav-btn" onClick={handlePrev}>{"‹"}</button>
                                <h2 className="calendario-title">{currentTitle}</h2>
                                <button type="button" className="nav-btn" onClick={handleNext}>{"›"}</button>
                            </header>
                        </div>



                        {/* Calendario */}
                        <div className="calendario-interactive">
                            <div
                                className="calendario-zoom-container"
                                ref={zoomContainerRef}
                                onTouchStart={handleTouchStart}
                                onTouchMove={handleTouchMove}
                                onTouchEnd={handleTouchEnd}
                                onTouchCancel={handleTouchCancel}
                            >
                                <div
                                    className="calendario-zoom-content"
                                    ref={zoomContentRef}
                                    onPointerDown={handlePointerDown}
                                    onPointerMove={handlePointerMove}
                                    onPointerUp={handlePointerUp}
                                    onPointerCancel={handlePointerUp}
                                    onPointerLeave={handlePointerUp}
                                    style={zoomContentStyle}
                                >
                                    {view === "mes" ? (
                                        <CalendarioMensual
                                            diasSemana={DIAS_SEMANA}
                                            monthMatrix={monthMatrix}
                                            today={today}
                                            pasillosSeleccionados={pasillosSeleccionados}
                                            getTurnoData={getTurnoData}
                                            handleDayClick={handleDayClick}
                                            weekdaysRef={weekdaysRef}
                                            gridRef={gridRef}
                                            pisoColorMap={pisoColorMap}
                                        />
                                    ) : view === "semana" ? (
                                        <CalendarioSemanal
                                            diasSemana={DIAS_SEMANA}
                                            weekDays={weekDays}
                                            pasillosSeleccionados={pasillosSeleccionados}
                                            today={today}
                                            getTurnoData={getTurnoData}
                                            handleDayClick={handleDayClick}
                                            isMobile={isMobile}
                                            pisoColorMap={pisoColorMap}
                                        />
                                    ) : (
                                        <CalendarioDiario
                                            currentDay={currentDay}
                                            pasillosSeleccionados={pasillosSeleccionados}
                                            getTurnoData={getTurnoData}
                                            handleDayClick={handleDayClick}
                                            pisoColorMap={pisoColorMap}
                                        />
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {showResetZoom && (
                        <button type="button" className="calendario-reset-zoom" onClick={resetZoom}>
                            Restablecer zoom
                        </button>
                    )}

                    {/* Modal de filtros */}
                    {showPasillos && (
                        <div className="modal-overlay" onClick={togglePasillos}>
                            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                                <div className="modal-header">
                                    <h3>Filtros personalizados</h3>
                                    <button type="button" className="modal-close" onClick={togglePasillos}>✕</button>
                                </div>
                                <div className="modal-body">
                                    {/* Selección rápida: Todos / Ninguno */}
                                    <div className="quick-select-section">
                                        <button
                                            type="button"
                                            className="quick-select-btn"
                                            onClick={selectTodosPisos}
                                        >
                                            Todos los pisos
                                        </button>
                                        <button
                                            type="button"
                                            className="quick-select-btn quick-select-btn-outline"
                                            onClick={selectNingunPiso}
                                        >
                                            Ninguno
                                        </button>
                                    </div>

                                    {/* Separador */}
                                    <div className="modal-divider"></div>

                                    {/* Grid de pasillos 2 columnas */}
                                    <div className="pasillos-grid">
                                        {pisos.length > 0 ? (
                                            pisos.map((piso) => (
                                                <label key={piso.idPiso || piso.nombre} className="checkbox-option">
                                                    <input
                                                        type="checkbox"
                                                        checked={pasillosSeleccionados.includes(piso.nombre)}
                                                        onChange={() => selectPasillo(piso.nombre)}
                                                    />
                                                    <span className="checkbox-label">{removeEmojis(piso.nombre)}</span>
                                                </label>
                                            ))
                                        ) : (
                                            <div className="no-pisos-message">
                                                {initialLoadDone ? 'No hay pisos disponibles para este servicio' : 'Cargando pisos...'}
                                            </div>
                                        )}
                                    </div>

                                    {/* Separador */}
                                    <div className="modal-divider"></div>

                                    {/* Buscador por nombre */}
                                    <div className="search-section">
                                        <label className="search-label">Buscar por nombre:</label>
                                        <input
                                            type="text"
                                            className="search-input"
                                            placeholder="Nombre de medico"
                                            value={searchNombre}
                                            onChange={(e) => setSearchNombre(e.target.value)}
                                        />
                                    </div>

                                    {/* Checkbox para mostrar turnos sin asignar */}
                                    <div className="unassigned-section">
                                        <label className="checkbox-option">
                                            <input
                                                type="checkbox"
                                                checked={mostrarSinAsignar}
                                                onChange={(e) => setMostrarSinAsignar(e.target.checked)}
                                            />
                                            <span className="checkbox-label">Turnos sin asignar</span>
                                        </label>
                                    </div>
                                </div>
                                <div className="modal-footer">
                                    <button type="button" className="modal-done-btn" onClick={togglePasillos}>
                                        Aplicar Filtros
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Modal para mostrar los turnos del día */}
                    {showModal && selectedDate && (
                        <div className="turnos-modal-overlay" onClick={closeModal}>
                            <div className="turnos-modal-container" onClick={(e) => e.stopPropagation()}>
                                <div className="turnos-modal-header">
                                    <h3>Turnos del día {formatDate(selectedDate)}</h3>
                                    <button className="turnos-modal-close" onClick={closeModal}>×</button>
                                </div>

                                <div className="turnos-modal-content">
                                    {pasillosSeleccionados.map((pasillo) => {
                                        const turnoData = getTurnoData(selectedDate, pasillo);
                                        // Get color from API data instead of hardcoded function
                                        // Normalize pasillo name to match the map keys
                                        const normalizedPasillo = pasillo.replace(/_/g, ' ').trim().toUpperCase();
                                        const pisoData = pisoColorMap[normalizedPasillo];
                                        const pasilloColor = pisoData?.color || '#CBD5F5'; // fallback color if not found
                                        const pasilloTextColor = getTextColor(pasilloColor);
                                        const pasilloDisplayName = pisoData?.nombre || pasillo;

                                        return (
                                            <div
                                                key={pasillo}
                                                className="turno-pasillo-section"
                                                style={{
                                                    borderColor: pasilloColor,
                                                    borderWidth: '2px',
                                                    borderStyle: 'solid'
                                                }}
                                            >
                                                <div
                                                    className="turno-pasillo-header"
                                                    style={{
                                                        backgroundColor: pasilloColor,
                                                        color: pasilloTextColor
                                                    }}
                                                >
                                                    {pasilloDisplayName}
                                                </div>
                                                <div className="turno-pasillo-content">
                                                    {turnoData && turnoData.turnos && turnoData.turnos.length > 0 ? (
                                                        (() => {
                                                            // Apply filters to turnos
                                                            let filteredTurnos = turnoData.turnos;

                                                            // Filter by doctor name (search)
                                                            if (searchNombre.trim() !== '') {
                                                                const searchLower = searchNombre.toLowerCase();
                                                                filteredTurnos = filteredTurnos.filter(turno =>
                                                                    turno.doctor?.toLowerCase().includes(searchLower)
                                                                );
                                                            }

                                                            // Filter by unassigned shifts
                                                            if (mostrarSinAsignar) {
                                                                filteredTurnos = filteredTurnos.filter(turno => {
                                                                    const isUnassigned = turno.doctor?.toLowerCase() === 'sin asignar' ||
                                                                        (turno.originalData && !turno.originalData.idMedico);
                                                                    return isUnassigned;
                                                                });
                                                            }

                                                            // If no turnos match the filters, show a message
                                                            if (filteredTurnos.length === 0) {
                                                                return <p className="no-turnos-message">No se encontraron turnos con los filtros aplicados.</p>;
                                                            }

                                                            return filteredTurnos.map((turno, idx) => {
                                                                const isUnassigned = turno.doctor?.toLowerCase() === 'sin asignar' ||
                                                                    (turno.originalData && !turno.originalData.idMedico);
                                                                const isOwnShift = turno.originalData &&
                                                                    turno.originalData.idMedico &&
                                                                    currentUserId &&
                                                                    turno.originalData.idMedico === currentUserId;

                                                                return (
                                                                    <div key={idx} className="turno-detail-card">
                                                                        <div className="turno-detail-info">
                                                                            <p className="turno-detail-label">
                                                                                <strong>Turno:</strong> {turno.tipo}
                                                                            </p>
                                                                            <p className="turno-detail-label">
                                                                                <strong>Médico asignado:</strong> {turno.doctor}
                                                                            </p>
                                                                        </div>
                                                                        <div className="turno-detail-actions">
                                                                            {isUnassigned ? (
                                                                                <>
                                                                                    <button
                                                                                        className="turno-action-btn turno-btn-postular"
                                                                                        onClick={() => {
                                                                                            if (turno.originalData) {
                                                                                                navigate('/solicitudes/turno', {
                                                                                                    //Unificamos a 'turnoDisponible' para que coincida con el useEffect del formulario
                                                                                                    state: { turnoDisponible: turno.originalData }
                                                                                                });
                                                                                            }
                                                                                        }}
                                                                                    >
                                                                                        Postular al turno
                                                                                    </button>
                                                                                    {auth.hasRole([Roles.JEFATURA, Roles.JEFATURA_SUB]) && (
                                                                                        <button
                                                                                            className="turno-action-btn turno-btn-ofrecer"
                                                                                            onClick={() => {
                                                                                                if (turno.originalData) {
                                                                                                    setTurnoAAsignar(turno.originalData);
                                                                                                    setIsAsignarModalOpen(true);
                                                                                                } else {
                                                                                                    setTurnoAAsignar(turno);
                                                                                                    setIsAsignarModalOpen(true);
                                                                                                }
                                                                                            }}
                                                                                        >
                                                                                            Asignar Turno
                                                                                        </button>
                                                                                    )}
                                                                                </>
                                                                            ) : isOwnShift ? (
                                                                                <>
                                                                                    <button
                                                                                        className="turno-action-btn turno-btn-soltar"
                                                                                        onClick={() => handleSoltarTurno(turno)}
                                                                                    >
                                                                                        Eliminar turno
                                                                                    </button>
                                                                                    <button
                                                                                        className="turno-action-btn turno-btn-ofrecer"
                                                                                        onClick={() => handleOfrecerTurno(turno)}
                                                                                    >
                                                                                        Ofrecer turno
                                                                                    </button>
                                                                                </>
                                                                            ) : (
                                                                                <>
                                                                                    <button
                                                                                        className="turno-action-btn turno-btn-intercambio"
                                                                                        onClick={() => handleSolicitarCambio(turno)}
                                                                                    >
                                                                                        Solicitar intercambio de turno
                                                                                    </button>
                                                                                </>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                );
                                                            });
                                                        })()
                                                    ) : (
                                                        <div className="turno-sin-asignar">
                                                            <p>No hay turnos asignados</p>

                                                            {/*Botón para Solicitar Turno */}
                                                            <div className="turno-detail-actions single-action">
                                                                <button
                                                                    className="turno-action-btn turno-btn-solicitar-nuevo"
                                                                    onClick={handleSolicitarTurno}
                                                                >
                                                                    Solicitar turno
                                                                </button>
                                                            </div>
                                                        </div>
                                                    )}
                                                    <AsignarTurnoModal
                                                        isOpen={isAsignarModalOpen}
                                                        onClose={() => setIsAsignarModalOpen(false)}
                                                        turno={turnoAAsignar}
                                                        onSuccess={async () => {
                                                            //Cerramos el modal de asignación
                                                            setIsAsignarModalOpen(false);
                                                            //Cerramos el modal del calendario
                                                            setShowModal(false);
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}
        </React.Fragment>
    );

}