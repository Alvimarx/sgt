// Componente: AdminPage
// Descripción: Vista principal del área de administración de médicos.
// - Orquesta la visualización de la lista, creación, edición y detalle.
// - Gestiona paneles de acción (volantes, solicitudes) y carga hojas de estilo
//   específicas según el tamaño de dispositivo (móvil / tablet / pc).
import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMediaQuery } from 'react-responsive'
import DoctorsTable from './DoctorsTable.jsx'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
import DoctorDetail from './DoctorDetail.jsx'
import ShiftAssignment from './ShiftAssignment.jsx'
import ShiftRequests from './ShiftRequests.jsx'
import CalendarView from './CalendarView.jsx'
import StatsWidgets from './StatsWidgets.jsx'
import adminService from '../../../services/adminService'
import { useAuth, Roles } from '../../../context/AuthContext'
import { getServicioId } from '../../../utils/tokenManager'
import Toast from './toast/Toast.jsx'
import '../css/AdminActionButtons.css'
import '../css/AdminPage.css'
// Importar estilos de modal del calendario
import '../../Calendario/css/Calendario-Base.css'
// Importar estilos específicos para modales de administración
import '../css/AdminModals.css'
import { mapRoleToDisplay, mapDisplayToBackend } from '../../../constants/roles'

// Componente para la matriz de botones de administración
const AdminActionButtons = ({ actionPanel, setActionPanel, setMode, setSelected, auth, requestCounts = { turnos: 0, permisos: 0 } }) => {
    const navigate = useNavigate()
    const isMobile = useMediaQuery({ maxWidth: 768 })
    const isTablet = useMediaQuery({ minWidth: 769, maxWidth: 1024 })
    const isDesktop = useMediaQuery({ minWidth: 1025 })
    const [isActionsOpen, setIsActionsOpen] = useState(false)
    const [showHelp, setShowHelp] = useState(false)
    const helpBtnRef = useRef(null)
    const helpPanelRef = useRef(null)

    // Mantener abierto por defecto en pantallas no móviles y contraído en móvil
    useEffect(() => {
        setIsActionsOpen(!isMobile)
    }, [isMobile])

    // Cerrar el panel de ayuda cuando se hace click fuera del botón o del panel
    useEffect(() => {
        if (!showHelp) return
        const onDocClick = (e) => {
            const btn = helpBtnRef.current
            const panel = helpPanelRef.current
            if (panel && btn && !panel.contains(e.target) && !btn.contains(e.target)) {
                setShowHelp(false)
            }
        }
        document.addEventListener('mousedown', onDocClick)
        return () => document.removeEventListener('mousedown', onDocClick)
    }, [showHelp])

    // Configuración de botones disponibles según el rol
    const getAvailableButtons = () => {
        const buttons = []

        // --- NUEVO: Botón Maestro de Flujo de Rotativas ---
        if (auth && auth.hasRole([Roles.JEFATURA, Roles.JEFATURA_SUB])) {
            buttons.push({
                id: 'rotativaFlow',
                label: 'Gestión de rotativas',
                shortLabel: 'Rotativas',
                icon: (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M9 5H7C5.89543 5 5 5.89543 5 7V19C5 20.1046 5.89543 21 7 21H17C18.1046 21 19 20.1046 19 19V7C19 5.89543 18.1046 5 17 5H15M9 5C9 6.10457 9.89543 7 11 7H13C14.1046 7 15 6.10457 15 5M9 5C9 3.89543 9.89543 3 11 3H13C14.1046 3 15 3.89543 15 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                ),
                action: () => {
                    setActionPanel(actionPanel === 'rotativaFlow' ? '' : 'rotativaFlow')
                },
                isActive: actionPanel === 'rotativaFlow',
                permissions: [Roles.JEFATURA, Roles.JEFATURA_SUB],
                // Opcional: Estilo destacado inline si no quieres tocar CSS
                style: { borderLeft: '4px solid #17416c', fontWeight: '700' },
                description: 'Flujo maestro para crear rotativas paso a paso (plantillas, calendario y asignación).'
            })
        }

        buttons.push({
            id: 'requests',
            label: 'Solicitudes de turno',
            shortLabel: 'Turnos',
            icon: (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M9 12H15M9 16H15M17 8H7C5.89543 8 5 8.89543 5 10V18C5 19.1046 5.89543 20 7 20H17C18.1046 20 19 19.1046 19 18V10C19 8.89543 18.1046 8 17 8Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            ),
            action: () => {
                setActionPanel(actionPanel === 'requests' ? '' : 'requests')
            },
            isActive: actionPanel === 'requests',
            permissions: [Roles.JEFATURA, Roles.JEFATURA_SUB, Roles.MEDICO],
            description: 'Ver y gestionar todas las solicitudes relacionadas con cambios y coberturas de turnos.',
            badge: requestCounts.turnos
        })

        // Botón adicional: Solicitudes de permiso
        buttons.push({
            id: 'requestsPermiso',
            label: 'Solicitudes de permiso',
            shortLabel: 'Permisos',
            icon: (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            ),
            action: () => {
                setActionPanel(actionPanel === 'requestsPermiso' ? '' : 'requestsPermiso')
            },
            isActive: actionPanel === 'requestsPermiso',
            permissions: [Roles.JEFATURA, Roles.JEFATURA_SUB, Roles.MEDICO],
            description: 'Ver y gestionar solicitudes de permisos (licencias, feriados y ausencias).',
            badge: requestCounts.permisos
        })

        buttons.push({
            id: 'eventsLogs',
            label: 'Bitácora de eventos',
            shortLabel: 'Bitácora',
            icon: (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 6V4M12 6C10.8954 6 10 6.89543 10 8C10 9.10457 10.8954 10 12 10M12 6C13.1046 6 14 6.89543 14 8C14 9.10457 13.1046 10 12 10M12 10V18M12 18H9M12 18H15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            ),
            action: () => {
                navigate('/administracion/bitacora-eventos')
            },
            isActive: false,
            permissions: [Roles.JEFATURA, Roles.JEFATURA_SUB, Roles.MEDICO]
        })

        if (auth && auth.hasRole([Roles.JEFATURA, Roles.JEFATURA_SUB])) {
            // Nota: botones de creación/edición de tipos de turno eliminados por requerimiento.
            // (Si se necesita restaurarlos, añadir aquí los objetos de configuración.)
        }

        return buttons
    }

    const availableButtons = getAvailableButtons()

    // En móviles, mostrar un solo botón con menú desplegable
    if (isMobile) {
        return (
            <React.Fragment>
                <div className="admin-tools-dropdown">
                    <button
                        onClick={() => setIsActionsOpen(!isActionsOpen)}
                        className={`admin-action-btn admin-tools-main-btn ${isActionsOpen ? 'active' : ''}`}
                        aria-expanded={isActionsOpen}
                        title="Herramientas de administración"
                    >
                        <div className="admin-action-btn-content">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            <span>Herramientas de administración</span>
                            <svg
                                width="16" height="16"
                                viewBox="0 0 24 24"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                                className={`admin-tools-chevron ${isActionsOpen ? 'rotated' : ''}`}
                            >
                                <path d="M6 9L12 15L18 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </div>
                    </button>

                    {isActionsOpen && (
                        <div className="admin-tools-menu">
                            {availableButtons.map((button) => (
                                <button
                                    key={button.id}
                                    onClick={() => {
                                        button.action()
                                        setIsActionsOpen(false) // Cerrar menú después de seleccionar
                                    }}
                                    className={`admin-tools-menu-item ${button.isActive ? 'active' : ''}`}
                                    title={button.label}
                                    style={button.style || {}}
                                >
                                    <div className="admin-tools-menu-item-content">
                                        {button.icon}
                                        <span>{button.label}</span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </React.Fragment>
        )
    }

    // En desktop/tablet, mostrar botones individuales
    return (
        <React.Fragment>
            {availableButtons.map((button) => {
                // Usar etiqueta corta en tablet y móvil, completa en desktop
                const displayLabel = isDesktop ? button.label : (button.shortLabel || button.label)
                return (
                    <button
                        key={button.id}
                        onClick={button.action}
                        className={`admin-action-btn ${button.isActive ? 'active' : ''}`}
                        aria-pressed={button.isActive}
                        title={button.label}
                        style={button.style || {}}
                    >
                        <div className="admin-action-btn-content">
                            {button.icon}
                            <span>{displayLabel}</span>
                            {button.badge > 0 && (
                                <span className="admin-btn-badge">{button.badge}</span>
                            )}
                        </div>
                    </button>
                )
            })}
        </React.Fragment>
    )
}

export default function AdminPage() {
    const [selected, setSelected] = useState(null)
    const [mode, setMode] = useState('list')
    const [activeRotativaStep, setActiveRotativaStep] = useState(null)
    const [activeTab, setActiveTab] = useState('calendario') // Nuevo: tabs principales (default: calendario)

    const [kpis, setKpis] = useState({ total: 0, activos: 0, avgHoras: 0 })
    const [doctorsList, setDoctorsList] = useState([])
    const [doctorsCache, setDoctorsCache] = useState(null)
    const [disponibilidad, setDisponibilidad] = useState({ activos: 0, inactivos: 0, total: 0, porcentajeActivos: 0 })
    const [coverageLastMonth, setCoverageLastMonth] = useState({ total: 0, asignados: 0, porcentaje: 0, pisosAfectados: [], porPiso: {}, loading: true })
    // Estado para el mes seleccionado en la cobertura (por defecto: mes actual)
    const [selectedCoverageMonth, setSelectedCoverageMonth] = useState(() => {
        const now = new Date()
        const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1)
        return { year: currentMonth.getFullYear(), month: currentMonth.getMonth() + 1 }
    })
    const [isLoadingDoctors, setIsLoadingDoctors] = useState(false)
    const [actionPanel, setActionPanel] = useState('')
    const isMobile = useMediaQuery({ maxWidth: 768 })
    const isTablet = useMediaQuery({ minWidth: 769, maxWidth: 1024 })
    const isDesktop = useMediaQuery({ minWidth: 1025 })
    const auth = useAuth()
    const [showStats, setShowStats] = useState(false)
    const [toast, setToast] = useState({ message: '', type: 'info' })
    const [requestCounts, setRequestCounts] = useState({ turnos: 0, permisos: 0 })

    // --- LÓGICA DE LIMPIEZA DE SERVICIO ---
    const [showCleanConfirm, setShowCleanConfirm] = useState(false)
    const [showCaptcha, setShowCaptcha] = useState(false)
    const [captchaData, setCaptchaData] = useState({ target: null, options: [] })
    const FIGURES = ['⭐', '🔴', '🟦', '🔺', '❤️']

    const handleGenerateCaptcha = () => {
        const target = FIGURES[Math.floor(Math.random() * FIGURES.length)]
        const options = [...FIGURES].sort(() => Math.random() - 0.5)
        setCaptchaData({ target, options })
        setShowCleanConfirm(false)
        setShowCaptcha(true)
    }

    const handleVerifyCaptcha = async (selected) => {
        if (selected === captchaData.target) {
            try {
                const sId = getServicioId() || (auth && auth.servicioId)
                await adminService.servicios.limpiar(sId)
                setToast({ message: 'Servicio limpiado correctamente. Se han eliminado todos los datos.', type: 'success' })
                setShowCaptcha(false)
                setActionPanel('')
                // Recargar datos básicos
                preloadDoctorsData()
                setKpis({ total: 0, activos: 0, avgHoras: 0 })
            } catch (error) {
                console.error(error)
                setToast({ message: 'Error al limpiar servicio.', type: 'error' })
            }
        } else {
            setToast({ message: 'Figura incorrecta. Inténtalo de nuevo.', type: 'error' })
            handleGenerateCaptcha()
        }
    }
    // ----------------------------------------

    // Helper para identificar tipos de permiso (copy de ShiftRequests.jsx)
    const isTipoPermiso = (tipo) => {
        const tiposPermiso = ['Permiso', 'Motivos personales', 'Licencia médica', 'Feriado legal', 'Permiso administrativo'];
        return tiposPermiso.includes(tipo);
    };

    // POLLING: Contar solicitudes pendientes
    useEffect(() => {
        let isMounted = true;

        const fetchCounts = async () => {
            try {
                // Usamos adminService que ya tiene manejo de token
                const allReqs = await adminService.solicitudes.getByServicio()
                if (!isMounted) return

                if (Array.isArray(allReqs)) {
                    const pendientes = allReqs.filter(r => r.estado === 'Pendiente')

                    const permisosCount = pendientes.filter(r => isTipoPermiso(r.tipo)).length
                    const turnosCount = pendientes.length - permisosCount

                    setRequestCounts({
                        turnos: turnosCount,
                        permisos: permisosCount
                    })
                }
            } catch (error) {
                console.warn('Silent poll for counts failed:', error)
            }
        }

        // Carga inicial
        fetchCounts()

        // Polling cada 10s
        const intervalId = setInterval(fetchCounts, 10000);

        return () => {
            isMounted = false;
            clearInterval(intervalId);
        }
    }, []) // Se ejecuta una vez y mantiene el polling

    const navigate = useNavigate(); // Hook necesario para navegar desde el modal

    // Función para scroll suave a secciones
    const scrollToSection = (id) => {
        const element = document.getElementById(id);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
        }
    };

    const preloadDoctorsData = async () => {
        if (doctorsCache || isLoadingDoctors) return doctorsCache

        setIsLoadingDoctors(true)
        try {
            // Buscar servicioId en localStorage (guardado en el login) o en el contexto auth
            const servicioId = getServicioId() || (auth && auth.servicioId)

            // Si existe servicioId, consultar el endpoint por servicio; si no, intentar el endpoint genérico
            // Usar el servicio centralizado que añade token automáticamente
            const data = await adminService.usuarios.getAll(servicioId)
            const mapped = data.map(u => ({
                id: u.id,
                nombre: (u.primerNombre || u.nombre || '').trim(),
                apellidos: [u.primerApellido, u.segundoApellido].filter(Boolean).join(' '),
                rut: u.rut,
                especialidad: u.servicio || u.especialidad || '—',
                turno: u.turno || u.tipoTurno || '—',
                horasAsignadas: u.horasAsignadas || 0,
                horasSemanales: u.horasSemanales || u.horasTrabajadas || 0,
                // Map backend enum values (e.g. 'SUBROGANTE') to human-friendly labels
                rol: (function (r) {
                    if (!r) return '—'
                    const code = (typeof r === 'string') ? r : (r.name || String(r))
                    if (code === 'SUBROGANTE') return 'Jefatura Subrogante'
                    if (code === 'JEFATURA') return 'Jefatura'
                    if (code === 'MEDICO') return 'Médico'
                    return code
                })(u.rol) || '—',
                estado: u.estado || '—',
                volante: u.volante || false,
                __raw: u
            }))

            setDoctorsCache(mapped)
            setDoctorsList(mapped)
            return mapped
        } catch (error) {
            console.warn('Error al cargar doctores:', error)
            // No usar datos mock - mostrar lista vacía hasta que se implemente el backend
            setDoctorsCache([])
            setDoctorsList([])
            return []
        } finally {
            setIsLoadingDoctors(false)
        }
    }

    // Cargar disponibilidad (activos/inactivos) para el servicio del usuario
    const loadDisponibilidad = async () => {
        try {
            const servicioId = getServicioId() || (auth && auth.servicioId)
            if (!servicioId) return
            const data = await adminService.usuarios.getDisponibilidad(servicioId)
            setDisponibilidad({
                activos: data.activos || 0,
                inactivos: data.inactivos || 0,
                total: data.total || 0,
                porcentajeActivos: data.porcentajeActivos || 0
            })
        } catch (e) {
            console.warn('No se pudo cargar disponibilidad:', e)
        }
    }

    useEffect(() => {
        // Cargar disponibilidad al montar o cuando cambie servicio en auth
        loadDisponibilidad()
    }, [auth && auth.servicioId])

    // Cargar cobertura del mes seleccionado
    const loadCoverageByMonth = async (year, month) => {
        try {
            setCoverageLastMonth(c => ({ ...c, loading: true }))
            const servicioId = (localStorage.getItem('servicioId') || (auth && auth.servicioId))
            if (!servicioId) return setCoverageLastMonth({ total: 0, asignados: 0, porcentaje: 0, pisosAfectados: [], loading: false })

            // Usar el nuevo endpoint con parámetros de mes
            const detalle = await adminService.turnos.getCoveragePerPisoByMonth(servicioId, year, month)
            if (detalle && detalle.porPiso) {
                const porPiso = detalle.porPiso || {}
                const keys = Object.keys(porPiso)
                const totalPisos = detalle.totalPisos || keys.length || 0

                // Calcular totales globales: días por piso * cantidad de pisos
                let daysPerPiso = 0
                if (keys.length > 0 && porPiso[keys[0]] && typeof porPiso[keys[0]].total === 'number') {
                    daysPerPiso = porPiso[keys[0]].total
                } else if (detalle.fechaInicio && detalle.fechaFin) {
                    const s = new Date(detalle.fechaInicio)
                    const f = new Date(detalle.fechaFin)
                    daysPerPiso = Math.floor((f - s) / (1000 * 60 * 60 * 24)) + 1
                }

                const total = daysPerPiso * totalPisos
                const asignados = keys.reduce((acc, k) => acc + (Number(porPiso[k].asignados || 0)), 0)
                const porcentaje = total > 0 ? Math.round((asignados / total) * 100) : 0

                setCoverageLastMonth({
                    fechaInicio: detalle.fechaInicio,
                    fechaFin: detalle.fechaFin,
                    total,
                    asignados,
                    porcentaje,
                    porPiso: porPiso,
                    loading: false
                })
            } else {
                setCoverageLastMonth({ total: 0, asignados: 0, porcentaje: 0, pisosAfectados: [], porPiso: {}, loading: false })
            }
        } catch (err) {
            console.warn('No se pudo obtener cobertura del mes seleccionado:', err)
            setCoverageLastMonth({ total: 0, asignados: 0, porcentaje: 0, pisosAfectados: [], loading: false })
        }
    }

    // Handler para mostrar detalle: siempre hace fetch al endpoint de usuario por id
    const handleViewDoctor = async (d, closePanel = false) => {
        // d puede ser el objeto mapeado; d.__raw puede contener payload original
        const raw = d && d.__raw ? d.__raw : d
        const id = raw && raw.id
        if (!id) {
            // fallback: si no hay id, usar lo que tengamos
            setSelected(raw)
            setMode('detail')
            if (closePanel) setActionPanel('')
            return
        }

        try {
            // mostrar vista detalle (loading puede implementarse en DoctorDetail si se desea)
            setSelected(null)
            setMode('detail')
            const user = await adminService.usuarios.getById(id)
            setSelected(user)
        } catch (err) {
            console.warn('Error al obtener detalle de usuario, usando datos locales', err)
            // fallback: mostrar los datos ya disponibles
            setSelected(raw)
        } finally {
            if (closePanel) setActionPanel('')
        }
    }

    useEffect(() => {
        if (!actionPanel) return
        const onKey = (e) => { if (e.key === 'Escape') setActionPanel('') }
        document.addEventListener('keydown', onKey)
        return () => document.removeEventListener('keydown', onKey)
    }, [actionPanel])

    useEffect(() => {
        preloadDoctorsData()
    }, [])

    const prevMonthLabel = (() => {
        const now = new Date()
        const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        return prev.toLocaleString(undefined, { month: 'long', year: 'numeric' })
    })()

    const formatIsoDate = (iso) => {
        if (!iso) return ''
        try {
            const d = new Date(iso)
            return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })
        } catch (e) {
            return iso
        }
    }

    const coverageRangeLabel = (() => {
        if (coverageLastMonth && coverageLastMonth.fechaInicio && coverageLastMonth.fechaFin) {
            return `${formatIsoDate(coverageLastMonth.fechaInicio)} — ${formatIsoDate(coverageLastMonth.fechaFin)}`
        }
        return null
    })()

    useEffect(() => {
        setKpis({ total: 24, activos: 18, avgHoras: 38 })
    }, [])

    useEffect(() => {
        if (isMobile) {
            import('../css/movil/Admin-Movil.css').catch(() => { })
            import('../../Solicitudes/css/movil/Solicitud-Turno-Movil.css').catch(() => { })
        } else if (isTablet) {
            import('../css/tablet/Admin-Tablet.css').catch(() => { })
            import('../../Solicitudes/css/tablet/Solicitud-Turno-Tablet.css').catch(() => { })
        } else if (isDesktop) {
            import('../css/pc/Admin-PC.css').catch(() => { })
            import('../../Solicitudes/css/pc/Solicitud-Turno-Pc.css').catch(() => { })
        }
    }, [isMobile, isTablet, isDesktop])

    // Reset active rotativa step when modal closes
    useEffect(() => {
        if (actionPanel !== 'rotativaFlow' && activeRotativaStep) {
            setActiveRotativaStep(null)
        }
    }, [actionPanel])

    // Nota: el estado inicial de `showStats` se mantiene en `false` para
    // que las estadísticas no se muestren hasta que el usuario las abra.

    // Efecto para cargar cobertura cuando cambia el mes seleccionado
    useEffect(() => {
        loadCoverageByMonth(selectedCoverageMonth.year, selectedCoverageMonth.month)
    }, [selectedCoverageMonth, auth && auth.servicioId])

    // Funciones para navegar entre meses
    const goToPreviousMonth = () => {
        setSelectedCoverageMonth(prev => {
            const newMonth = prev.month === 1 ? 12 : prev.month - 1
            const newYear = prev.month === 1 ? prev.year - 1 : prev.year
            return { year: newYear, month: newMonth }
        })
    }

    const goToNextMonth = () => {
        setSelectedCoverageMonth(prev => {
            const newMonth = prev.month === 12 ? 1 : prev.month + 1
            const newYear = prev.month === 12 ? prev.year + 1 : prev.year
            return { year: newYear, month: newMonth }
        })
    }

    return (
        <React.Fragment>
            <div className="admin-page-container admin-page-redesign">
                {/* Header fijo con título y acciones rápidas */}
                <header className="admin-header-fixed">
                    <div className="admin-header-content">
                        <div className="admin-header-left">
                            <div className="admin-header-icon">
                                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M19 21V5C19 3.89543 18.1046 3 17 3H7C5.89543 3 5 3.89543 5 5V21M19 21L21 21M19 21H14M5 21L3 21M5 21H10M9 6.99998H10M9 11H10M14 6.99998H15M14 11H15M10 21V16C10 15.4477 10.4477 15 11 15H13C13.5523 15 14 15.4477 14 16V21M10 21H14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </div>
                            <h1 className="admin-header-title">Panel de Administración</h1>
                        </div>
                        <AdminActionButtons
                            actionPanel={actionPanel}
                            setActionPanel={setActionPanel}
                            setMode={setMode}
                            setSelected={setSelected}
                            auth={auth}
                            requestCounts={requestCounts}
                        />
                    </div>

                    {/* Tabs de navegación principal */}
                    <nav className="admin-tabs-nav">
                        <button
                            className={`admin-tab-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
                            onClick={() => setActiveTab('dashboard')}
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect x="3" y="3" width="7" height="7" rx="1" />
                                <rect x="14" y="3" width="7" height="7" rx="1" />
                                <rect x="14" y="14" width="7" height="7" rx="1" />
                                <rect x="3" y="14" width="7" height="7" rx="1" />
                            </svg>
                            <span>Dashboard</span>
                        </button>
                        <button
                            className={`admin-tab-btn ${activeTab === 'calendario' ? 'active' : ''}`}
                            onClick={() => setActiveTab('calendario')}
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                                <line x1="16" y1="2" x2="16" y2="6" />
                                <line x1="8" y1="2" x2="8" y2="6" />
                                <line x1="3" y1="10" x2="21" y2="10" />
                            </svg>
                            <span>Calendario</span>
                        </button>
                        <button
                            className={`admin-tab-btn ${activeTab === 'medicos' ? 'active' : ''}`}
                            onClick={() => setActiveTab('medicos')}
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                                <circle cx="9" cy="7" r="4" />
                                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                            </svg>
                            <span>Médicos</span>
                        </button>
                    </nav>
                </header>

                {/* Contenido principal con tabs */}
                <main className="admin-main-content">

                    {/* TAB: Dashboard */}
                    {activeTab === 'dashboard' && (
                        <div className="admin-tab-panel admin-tab-dashboard animate-fade-in">
                            <div className="admin-dashboard-grid">
                                {/* Columna derecha: StatsWidgets y acceso rápido */}
                                <div className="admin-dashboard-widgets">
                                    <h2 className="admin-section-heading admin-section-heading--monthly">
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                                            <line x1="16" y1="2" x2="16" y2="6" />
                                            <line x1="8" y1="2" x2="8" y2="6" />
                                            <line x1="3" y1="10" x2="21" y2="10" />
                                            <line x1="8" y1="14" x2="8" y2="14" />
                                            <line x1="12" y1="14" x2="12" y2="14" />
                                            <line x1="16" y1="14" x2="16" y2="14" />
                                            <line x1="8" y1="18" x2="8" y2="18" />
                                            <line x1="12" y1="18" x2="12" y2="18" />
                                            <line x1="16" y1="18" x2="16" y2="18" />
                                        </svg>
                                        Resumen mensual actual
                                    </h2>
                                    <StatsWidgets />
                                </div>

                                {/* Columna izquierda: Stats rápidos */}
                                <div className="admin-dashboard-stats">
                                    <h2 className="admin-section-heading admin-section-heading--general">
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M3 3v18h18" />
                                            <path d="M18.7 8l-5.1 5.2-2.8-3.3L7 13.3" />
                                            <path d="M13 6h8v8" />
                                        </svg>
                                        Resumen general
                                    </h2>

                                    {/* Contenedor de widgets en paralelo */}
                                    <div className="admin-stats-widgets-grid">
                                        {/* Widget de Cobertura */}
                                        <div className="admin-widget admin-widget--coverage">
                                            <div className="coverage-widget-header">
                                                <div className="coverage-widget-title">
                                                    <svg className="coverage-widget-title-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                        <path d="M9 12L11 14L15 10M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                    </svg>
                                                    Cobertura de Turnos
                                                </div>
                                                <div className="month-navigation">
                                                    <button onClick={goToPreviousMonth} className="month-nav-button" title="Mes anterior">
                                                        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                                        </svg>
                                                    </button>
                                                    <div className="month-current">
                                                        {new Date(selectedCoverageMonth.year, selectedCoverageMonth.month - 1).toLocaleDateString('es-ES', { year: 'numeric', month: 'long' })}
                                                    </div>
                                                    <button onClick={goToNextMonth} className="month-nav-button" title="Mes siguiente">
                                                        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                        </svg>
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="coverage-widget-metric">
                                                <div className="coverage-widget-details">
                                                    <div className="coverage-widget-detail">
                                                        <span className="coverage-widget-detail-label">Días cubiertos</span>
                                                        <span className="coverage-widget-detail-value text-green-600">{coverageLastMonth.loading ? '—' : `${coverageLastMonth.asignados}/${coverageLastMonth.total}`}</span>
                                                    </div>
                                                    <div className="coverage-widget-detail">
                                                        <span className="coverage-widget-detail-label">Días sin cubrir</span>
                                                        <span className="coverage-widget-detail-value text-red-600">{coverageLastMonth.loading ? '—' : Math.max(0, coverageLastMonth.total - coverageLastMonth.asignados)}</span>
                                                    </div>
                                                </div>
                                                <div className="coverage-widget-value">{coverageLastMonth.loading ? '—' : `${coverageLastMonth.porcentaje}%`}</div>
                                            </div>

                                            <div className="admin-widget-progress-bar">
                                                <div className="admin-widget-progress-fill" style={{ width: coverageLastMonth.loading ? '0%' : `${coverageLastMonth.porcentaje}%` }}></div>
                                            </div>
                                        </div>

                                        {/* Widget de Disponibilidad */}
                                        <div className="admin-widget admin-widget--disponibilidad">
                                            <div className="disponibilidad-widget-header">
                                                <div className="disponibilidad-widget-icon">
                                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                        <path d="M9 12L11 14L15 10M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                    </svg>
                                                </div>
                                                <div className="disponibilidad-widget-title">Disponibilidad</div>
                                            </div>

                                            <div className="disponibilidad-widget-metric">
                                                <div className="disponibilidad-widget-details">
                                                    <div className="disponibilidad-widget-subtitle">Activos / Total</div>
                                                </div>
                                                <div className="disponibilidad-widget-value">{disponibilidad.porcentajeActivos}%</div>
                                            </div>

                                            <div className="disponibilidad-widget-stats">
                                                <div className="disponibilidad-widget-stat">
                                                    <div className="disponibilidad-widget-stat-label">Activos</div>
                                                    <div className="disponibilidad-widget-stat-value">{disponibilidad.activos}</div>
                                                </div>
                                                <div className="disponibilidad-widget-stat">
                                                    <div className="disponibilidad-widget-stat-label">Inactivos</div>
                                                    <div className="disponibilidad-widget-stat-value">{disponibilidad.inactivos}</div>
                                                </div>
                                            </div>

                                            <div className="admin-widget-progress-bar">
                                                <div className="admin-widget-progress-fill" style={{ width: `${disponibilidad.porcentajeActivos}%` }}></div>
                                            </div>
                                        </div>

                                        {/* Cobertura por Piso */}
                                        {coverageLastMonth.porPiso && Object.keys(coverageLastMonth.porPiso).length > 0 && (
                                            <div className="admin-widget admin-widget--pisos">
                                                <div className="coverage-widget-header">
                                                    <div className="coverage-widget-title">
                                                        <svg className="coverage-widget-title-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                            <path d="M19 21V5C19 3.89543 18.1046 3 17 3H7C5.89543 3 5 3.89543 5 5V21M19 21L17 21M19 21H21M5 21L7 21M5 21H3M9 9H15M9 13H15M9 17H15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                        </svg>
                                                        Cobertura por Piso
                                                    </div>
                                                </div>
                                                <div className="coverage-table-container">
                                                    <table className="coverage-table">
                                                        <thead>
                                                            <tr>
                                                                <th>Piso</th>
                                                                <th>Cubiertos</th>
                                                                <th>%</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {Object.entries(coverageLastMonth.porPiso).map(([piso, stats]) => {
                                                                const displayName = (stats && stats.nombre) ? stats.nombre : piso
                                                                const color = (stats && stats.colorHexa) ? stats.colorHexa : '#cbd5e1'
                                                                const asignados = stats.asignados || 0
                                                                const total = stats.total || 0
                                                                const porcentaje = stats.porcentaje || 0
                                                                const percentageClass = porcentaje >= 80 ? 'excellent' : porcentaje >= 60 ? 'good' : 'poor'
                                                                return (
                                                                    <tr key={piso}>
                                                                        <td>
                                                                            <div className="coverage-table-floor-name">
                                                                                <span className="coverage-table-floor-dot" style={{ backgroundColor: color }}></span>
                                                                                <span>{displayName}</span>
                                                                            </div>
                                                                        </td>
                                                                        <td className="text-center">{asignados}/{total}</td>
                                                                        <td className="text-center">
                                                                            <span className={`coverage-table-percentage ${percentageClass}`}>{porcentaje}%</span>
                                                                        </td>
                                                                    </tr>
                                                                )
                                                            })}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB: Calendario */}
                    {activeTab === 'calendario' && (
                        <div className="admin-tab-panel admin-tab-calendario animate-fade-in">
                            <div className="admin-calendar-fullview">
                                <CalendarView />
                            </div>
                        </div>
                    )}

                    {/* TAB: Médicos */}
                    {activeTab === 'medicos' && (
                        <div className="admin-tab-panel admin-tab-medicos animate-fade-in">
                            <div className="admin-medicos-container">
                                <DoctorsTable onView={(d) => handleViewDoctor(d)} onDoctorsLoaded={(list) => setDoctorsList(list)} />
                            </div>
                        </div>
                    )}
                </main>

                {/* --- PANELES MODALES (se mantienen igual) --- */}
                {/* MODAL: Flujo de Rotativas */}
                {actionPanel === 'rotativaFlow' && (
                    <div className="admin-modal-overlay" onClick={() => setActionPanel('')}>
                        <div className="admin-modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
                            <div className="admin-modal-header">
                                <div className="modal-header-left">
                                    <div className="modal-header-icon" aria-hidden>
                                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M8 7V3M16 7V3M3 11H21M5 21H19C20.1046 21 21 20.1046 21 19V8C21 6.89543 20.1046 6 19 6H5C3.89543 6 3 6.89543 3 8V19C3 20.1046 3.89543 21 5 21Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                    </div>
                                    <div className="modal-header-text">
                                        <h3>Gestión de Rotativas</h3>
                                        <p className="modal-header-subtitle">Selecciona el paso que quieras gestionar.</p>
                                    </div>
                                </div>
                                <button type="button" className="admin-modal-close" onClick={() => setActionPanel('')} aria-label="Cerrar">×</button>
                            </div>
                            <div className="admin-modal-body">
                                <div className="rotativa-steps">
                                    <button className="rotativa-step" onClick={() => { setActiveRotativaStep('piso'); navigate('/administracion/creador-piso') }}>
                                        <span className="rotativa-step-number">1</span>
                                        <div className="rotativa-step-body"><strong>Crear Pisos</strong><span>Configura los pisos y servicios.</span></div>
                                        <span className="rotativa-step-chevron">→</span>
                                    </button>
                                    <button className="rotativa-step" onClick={() => { setActiveRotativaStep('tipo'); navigate('/administracion/creador-tipo-turno') }}>
                                        <span className="rotativa-step-number">2</span>
                                        <div className="rotativa-step-body"><strong>Crear Tipos</strong><span>Configura patrones de turno.</span></div>
                                        <span className="rotativa-step-chevron">→</span>
                                    </button>
                                    <button className="rotativa-step" onClick={() => { setActiveRotativaStep('turnos-base'); navigate('/administracion/creador-turno-base') }}>
                                        <span className="rotativa-step-number">3</span>
                                        <div className="rotativa-step-body"><strong>Crear Turnos Base</strong><span>Define los horarios base.</span></div>
                                        <span className="rotativa-step-chevron">→</span>
                                    </button>
                                    <button className="rotativa-step" onClick={() => { setActiveRotativaStep('plantilla'); navigate('/administracion/creador-plantilla-turno') }}>
                                        <span className="rotativa-step-number">4</span>
                                        <div className="rotativa-step-body"><strong>Crear Plantilla</strong><span>Asigna turnos a patrones.</span></div>
                                        <span className="rotativa-step-chevron">→</span>
                                    </button>
                                    <button className="rotativa-step" onClick={() => { setActiveRotativaStep('calendario'); navigate('/administracion/generador-calendario') }}>
                                        <span className="rotativa-step-number">5</span>
                                        <div className="rotativa-step-body"><strong>Generar Calendario</strong><span>Crea los turnos en fechas reales.</span></div>
                                        <span className="rotativa-step-chevron">→</span>
                                    </button>
                                    <button className="rotativa-step" onClick={() => { setActiveRotativaStep('asignar'); navigate('/administracion/asignador-turnos') }}>
                                        <span className="rotativa-step-number">6</span>
                                        <div className="rotativa-step-body"><strong>Asignar Turnos</strong><span>Asigna médicos a los turnos.</span></div>
                                        <span className="rotativa-step-chevron">→</span>
                                    </button>
                                </div>
                            </div>
                            <div className="admin-modal-footer" style={{ flexDirection: 'column', gap: '10px' }}>
                                <button
                                    type="button"
                                    className="admin-modal-done-btn"
                                    style={{
                                        backgroundColor: '#ef4444',
                                        borderColor: '#ef4444',
                                        width: '100%',
                                        color: 'white',
                                        marginBottom: '5px'
                                    }}
                                    onClick={() => setShowCleanConfirm(true)}
                                >
                                    Limpiar servicio
                                </button>
                                <button type="button" className="admin-modal-done-btn" style={{ width: '100%' }} onClick={() => setActionPanel('')}>Cerrar</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* MODAL: Solicitudes de turno */}
                {actionPanel === 'requests' && (
                    <div className="admin-modal-overlay" onClick={() => setActionPanel('')}>
                        <div className="admin-modal-content admin-modal-large" onClick={(e) => e.stopPropagation()}>
                            <div className="admin-modal-header">
                                <h3>Solicitudes de Turno</h3>
                                <button type="button" className="admin-modal-close" onClick={() => setActionPanel('')} aria-label="Cerrar">×</button>
                            </div>
                            <div className="admin-modal-body">
                                <ShiftRequests excludePermisos={true} />
                            </div>
                            <div className="admin-modal-footer">
                                <button type="button" className="admin-modal-done-btn" onClick={() => setActionPanel('')}>Cerrar</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* MODAL: Solicitudes de permiso */}
                {actionPanel === 'requestsPermiso' && (
                    <div className="admin-modal-overlay" onClick={() => setActionPanel('')}>
                        <div className="admin-modal-content" onClick={(e) => e.stopPropagation()}>
                            <div className="admin-modal-header">
                                <h3>Solicitudes de Permiso</h3>
                                <button type="button" className="admin-modal-close" onClick={() => setActionPanel('')} aria-label="Cerrar">×</button>
                            </div>
                            <div className="admin-modal-body">
                                <ShiftRequests initialTipo="Permiso" />
                            </div>
                            <div className="admin-modal-footer">
                                <button type="button" className="admin-modal-done-btn" onClick={() => setActionPanel('')}>Cerrar</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* MODAL: Detalle del médico */}
                {mode === 'detail' && selected && (
                    <div className="admin-modal-overlay" onClick={() => { setSelected(null); setMode('list') }}>
                        <div className="admin-modal-content" onClick={(e) => e.stopPropagation()}>
                            <div className="admin-modal-header">
                                <h3>Detalle del Médico</h3>
                                <button type="button" className="admin-modal-close" onClick={() => { setSelected(null); setMode('list') }} aria-label="Cerrar">×</button>
                            </div>
                            <div className="admin-modal-body">
                                <DoctorDetail doctor={selected} />
                            </div>
                            <div className="admin-modal-footer">
                                <button type="button" className="admin-modal-done-btn" onClick={() => { setSelected(null); setMode('list') }}>Cerrar</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* MODAL: Asignar turnos */}
                {mode === 'shifts' && selected && (
                    <div className="admin-modal-overlay" onClick={() => { setSelected(null); setMode('list') }}>
                        <div className="admin-modal-content admin-modal-large" onClick={(e) => e.stopPropagation()}>
                            <div className="admin-modal-header">
                                <h3>Asignar Turnos</h3>
                                <button type="button" className="admin-modal-close" onClick={() => { setSelected(null); setMode('list') }} aria-label="Cerrar">×</button>
                            </div>
                            <div className="admin-modal-body">
                                <ShiftAssignment doctor={selected} />
                            </div>
                            <div className="admin-modal-footer">
                                <button type="button" className="admin-modal-done-btn" onClick={() => { setSelected(null); setMode('list') }}>Cerrar</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* MODAL: Confirmación Limpieza 1 */}
            {showCleanConfirm && (
                <div className="admin-modal-overlay" style={{ zIndex: 1100 }}>
                    <div className="admin-modal-content" style={{ maxWidth: '500px' }} onClick={(e) => e.stopPropagation()}>
                        <div className="admin-modal-header" style={{ borderBottom: '2px solid #ef4444' }}>
                            <h3 style={{ color: '#ef4444' }}>⚠️ ADVERTENCIA IMPORANTE</h3>
                            <button type="button" className="admin-modal-close" onClick={() => setShowCleanConfirm(false)}>×</button>
                        </div>
                        <div className="admin-modal-body">
                            <p style={{ fontWeight: 'bold', marginBottom: '10px' }}>¿ESTÁS SEGURO QUE DESEAS LIMPIAR EL SERVICIO?</p>
                            <p>Esta acción es <strong>IRREVERSIBLE</strong>. Se borrarán permanentemente:</p>
                            <ul style={{ listStyle: 'disc', marginLeft: '20px', marginTop: '10px', marginBottom: '10px' }}>
                                <li>Todos los pisos y configuraciones.</li>
                                <li>Todos los turnos asignados (plantillas y reales).</li>
                                <li>Todas las solicitudes y registros.</li>
                            </ul>
                            <p>Solo se conservarán los usuarios y la definición básica del servicio.</p>
                        </div>
                        <div className="admin-modal-footer">
                            <button className="admin-modal-done-btn" style={{ backgroundColor: '#6b7280', borderColor: '#6b7280' }} onClick={() => setShowCleanConfirm(false)}>Cancelar</button>
                            <button className="admin-modal-done-btn" style={{ backgroundColor: '#ef4444', borderColor: '#ef4444' }} onClick={handleGenerateCaptcha}>ENTIENDO, CONTINUAR</button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL: Captcha Limpieza 2 */}
            {showCaptcha && (
                <div className="admin-modal-overlay" style={{ zIndex: 1100 }}>
                    <div className="admin-modal-content" style={{ maxWidth: '400px' }} onClick={(e) => e.stopPropagation()}>
                        <div className="admin-modal-header">
                            <h3>Verificación de Seguridad</h3>
                            <button type="button" className="admin-modal-close" onClick={() => setShowCaptcha(false)}>×</button>
                        </div>
                        <div className="admin-modal-body" style={{ textAlign: 'center' }}>
                            <p style={{ fontSize: '1.1rem', marginBottom: '20px' }}>
                                Para confirmar, selecciona la figura: <span style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{captchaData.target}</span>
                            </p>
                            <div style={{ display: 'flex', justifyContent: 'center', gap: '15px' }}>
                                {captchaData.options.map((fig, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => handleVerifyCaptcha(fig)}
                                        style={{
                                            fontSize: '2rem',
                                            padding: '10px',
                                            cursor: 'pointer',
                                            border: '1px solid #e5e7eb',
                                            borderRadius: '8px',
                                            backgroundColor: 'white',
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        {fig}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="admin-modal-footer">
                            <button className="admin-modal-done-btn" style={{ backgroundColor: '#6b7280', borderColor: '#6b7280' }} onClick={() => setShowCaptcha(false)}>Cancelar</button>
                        </div>
                    </div>
                </div>
            )}

            {toast.message && <Toast message={toast.message} type={toast.type} />}
        </React.Fragment>
    )
}