// Componente: CalendarView
// Descripción: Vista resumen mensual que muestra estado de cobertura por día
// LÓGICA DE COLORES ACTUALIZADA:
// - Verde: Todos los pisos están cubiertos (24h completas)
// - Amarillo: Falta cobertura en el mes actual o meses futuros (cobertura parcial)
// - Rojo: Días sin cubrir de meses pasados al actual (cobertura incompleta en el pasado)
// FUNCIONALIDAD DE SOLICITUDES:
// - Los badges en el calendario muestran el número de solicitudes PENDIENTES por día
// - Al presionar "Ver solicitudes" se filtran y muestran solo las solicitudes PENDIENTES del día seleccionado
// - El usuario puede cambiar el estado de las solicitudes a Aprobada o Rechazada
import React, { useState, useRef, useEffect } from 'react'
import { useAuth } from '../../../context/AuthContext'
import adminService from '../../../services/adminService'
import DoctorDetail from './DoctorDetail.jsx'
import AlterarHorarioModal from './AlterarHorarioModal'
import AsignarTurnoModal from './AsignarTurnoModal'
import { UserPlus, X, AlertTriangle } from 'lucide-react'
import { formatDisplayDate } from '../../../utils/dateUtils'
import '../css/CalendarView.css'
import '../css/movil/CalendarView-Movil.css'

// 💡 HELPER: Copiado de SolicitudesGeneral para extraer el motivo y los turnos serializados
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

// Helper: Formatea hora en formato HH:MM a HH:MM AM/PM
function formatTimeWithAMPM(timeString) {
    if (!timeString) return '';
    const [hours, minutes] = timeString.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const hours12 = hours % 12 || 12; // Convertir 0 a 12
    return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
}

// Devuelve objetos Date para cada día del mes indicado
function getMonthDays(year, month) {
    const date = new Date(year, month, 1)
    const days = []
    while (date.getMonth() === month) {
        days.push(new Date(date))
        date.setDate(date.getDate() + 1)
    }
    return days
}

// Devuelve iniciales a partir de un nombre completo
function getInitials(name) {
    if (!name) return ''
    const parts = name.trim().split(/\s+/)
    const first = parts[0] ? parts[0][0] : ''
    const second = parts.length > 1 ? parts[parts.length - 1][0] : ''
    return (first + second).toUpperCase()
}

// Convierte una clave 'YYYY-MM-DD' a Date en zona local (evita problemas de parsing como UTC)
function parseKeyToLocalDate(key) {
    if (!key || typeof key !== 'string') return new Date(key)
    const m = key.match(/^(\d{4})-(\d{2})-(\d{2})$/)
    if (!m) return new Date(key)
    const y = Number(m[1])
    const mm = Number(m[2]) - 1
    const dd = Number(m[3])
    return new Date(y, mm, dd)
}

// Formatea un Date (o cadena aceptable por Date) a clave 'YYYY-MM-DD' en zona local
function formatDateKey(d) {
    const date = d instanceof Date ? d : new Date(d)
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
}

// Normaliza distintos formatos de entrada a la clave local 'YYYY-MM-DD'
function parseToLocalDateKey(input) {
    if (!input) return null
    // Si ya es 'YYYY-MM-DD' usar parseKeyToLocalDate para crear Date en zona local
    if (typeof input === 'string') {
        const m = input.match(/^(\d{4})-(\d{2})-(\d{2})$/)
        if (m) {
            return formatDateKey(parseKeyToLocalDate(input))
        }
    }
    // Para otros formatos (ISO con timezone o Date objects) usar Date y formatear en zona local
    const d = (input instanceof Date) ? input : new Date(input)
    if (isNaN(d.getTime())) return null
    return formatDateKey(d)
}

// Determina el estado de cobertura basándose en la nueva lógica:
// Verde = todos los pisos cubiertos
// Amarillo = cobertura parcial (mes actual o futuro)
// Rojo = sin cubrir o incompleto (meses pasados)
function getDayStatus(dateKey, coverageData, isPast) {
    const coverage = coverageData[dateKey]

    if (!coverage) {
        // Sin datos de cobertura
        return isPast ? 'empty' : 'partial' // Rojo si es pasado, amarillo si es futuro
    }

    // Revisar si TODOS los pisos tienen cobertura completa (24h)
    const pisosCubiertos = Object.values(coverage).filter(pasilloAssignments => {
        if (!pasilloAssignments || pasilloAssignments.length === 0) return false
        // Un piso está cubierto si tiene al menos un turno de 24h o turno fijo
        return pasilloAssignments.some(assignment =>
            assignment.turno === '24h' ||
            assignment.turno === '00:00-24:00' ||
            assignment.turnoFijo?.day // Turno fijo implica cobertura
        )
    })

    const totalPisos = Object.keys(coverage).length
    const allCovered = pisosCubiertos.length === totalPisos && totalPisos > 0

    if (allCovered) {
        return 'full' // Verde: TODOS los pisos cubiertos
    }

    // Cobertura parcial o sin cobertura
    if (isPast) {
        return 'empty' // Rojo: días sin cubrir de meses pasados
    } else {
        return 'partial' // Amarillo: falta cobertura en mes actual o futuro
    }
}

// Transforma los datos de cobertura del backend al formato esperado por el calendario
// Recibe también la lista de pisos del servicio para verificar cobertura completa
function transformCoberturaToMap(coberturaData, pisosList) {
    const map = {}

    // Obtener nombres de todos los pisos del servicio
    const todosLosPisos = pisosList.map(p => p.nombre || p.id?.toString() || p)

    for (const [fecha, turnosRaw] of Object.entries(coberturaData)) {
        // Normalizar posibles formas de respuesta del backend:
        // - Array de turnos: [{...}, {...}]
        // - Objeto por piso: { '6TO A': [{...}], '4TO B': [{...}] }
        // - Null/undefined
        let turnos = []
        if (!turnosRaw) {
            turnos = []
        } else if (Array.isArray(turnosRaw)) {
            turnos = turnosRaw
        } else if (typeof turnosRaw === 'object') {
            // Intentar aplanar valores que puedan ser arrays por piso
            const values = Object.values(turnosRaw)
            if (values.every(v => Array.isArray(v))) {
                turnos = values.flat()
            } else {
                // Si no es una estructura reconocida, convertir a array con un único elemento
                turnos = [turnosRaw]
            }
        } else {
            // Formato inesperado, log y continuar
            console.warn('CalendarView: formato de turnos no reconocido para fecha', fecha, turnosRaw)
            turnos = []
        }
        // Si el backend nos entregó una estructura agregada por día (con porPiso / isCovered / totalHoras)
        if (turnosRaw && typeof turnosRaw === 'object' && (turnosRaw.isCovered !== undefined || turnosRaw.porPiso !== undefined)) {
            const porPisoRaw = turnosRaw.porPiso || {}

            // Crear lista de pisos conocidos (con id/nombre) a partir de pisosList
            const pisosMeta = pisosList.map(p => ({ key: p.id != null ? String(p.id) : (p.nombre || p.id || p), nombre: p.nombre || String(p.id || p) }))

            // Si no tenemos pisos conocidos, usar las claves devueltas por el backend
            let keysToCheck = pisosMeta.length > 0 ? pisosMeta : Object.keys(porPisoRaw).map(k => ({ key: k, nombre: porPisoRaw[k]?.nombre || k }))

            let allCovered = true
            let anyCovered = false

            keysToCheck.forEach(pm => {
                const entry = porPisoRaw[pm.key] || Object.values(porPisoRaw).find(v => v && (v.nombre === pm.nombre || v.nombre === pm.key))
                const horas = entry && (entry.horas !== undefined) ? Number(entry.horas) : 0
                const pisoCovered = (entry && entry.isCovered === true) || (horas >= 23.95)
                if (pisoCovered) anyCovered = true
                if (!pisoCovered) allCovered = false
            })

            // Determinar el estado final
            if (allCovered && keysToCheck.length > 0) map[fecha] = 'full'
            else if (anyCovered) map[fecha] = 'partial'
            else map[fecha] = 'empty'
            continue
        }

        // Agrupar turnos por piso (antiguo fallback cuando recibimos lista de turnos)
        const turnosPorPiso = {}
        turnos.forEach(turno => {
            const piso = turno.piso || turno.idPiso || 'Sin piso'
            if (!turnosPorPiso[piso]) turnosPorPiso[piso] = []
            turnosPorPiso[piso].push(turno)
        })

        // Verificar que TODOS los pisos del servicio tengan al menos una persona asignada
        let pisosCubiertos = 0
        let pisosConPersonas = 0

        todosLosPisos.forEach(piso => {
            const turnosPiso = turnosPorPiso[piso] || []
            const tienePersona = turnosPiso.some(t =>
                t.medico != null ||
                t.medicoAsignado != null ||
                t.idPersonal != null
            )

            if (tienePersona) {
                pisosCubiertos++
                pisosConPersonas++
            }
        })

        // Un día está completo (full) solo si TODOS los pisos tienen al menos una persona
        const allCoveredFallback = pisosCubiertos === todosLosPisos.length && todosLosPisos.length > 0
        const anyCoveredFallback = pisosConPersonas > 0

        map[fecha] = allCoveredFallback ? 'full' : (anyCoveredFallback ? 'partial' : 'empty')
    }

    return map
}

export default function CalendarView({ coverageMap, requests = null }) {
    const [displayDate, setDisplayDate] = useState(new Date())
    const [coberturaData, setCoberturaData] = useState(null)
    const [solicitudesData, setSolicitudesData] = useState([])
    const [pisos, setPisos] = useState([]) // Pisos cargados desde backend
    const [medicos, setMedicos] = useState([]) // Médicos del servicio
    const [loading, setLoading] = useState(true)
    const { user } = useAuth()

    const year = displayDate.getFullYear()
    const month = displayDate.getMonth()
    const days = getMonthDays(year, month)

    // Fecha actual para determinar pasado/futuro
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Cargar pisos del servicio del usuario (fallback a localStorage.servicioId si user.servicioId no está presente)
    useEffect(() => {
        let mounted = true
        const loadPisos = async () => {
            try {
                // Priorizar user.servicioId, sino leer de localStorage (compatibilidad con adminService.getServicioId())
                const servicioId = (user && user.servicioId) || localStorage.getItem('servicioId')
                if (!servicioId) {
                    console.warn('Usuario no tiene servicioId asociado (ni en localStorage)')
                    // No usar datos mock - dejar vacío hasta que se configure el servicio
                    setPisos([])
                    return
                }

                const data = await adminService.pisos.getByServicio(Number(servicioId))
                if (!mounted) return

                if (Array.isArray(data) && data.length > 0) {
                    setPisos(data)
                } else {
                    setPisos(['6TO A', '6TO C', '4TO A', '4TO B', '4TO C'].map(n => ({ nombre: n })))
                }
            } catch (err) {
                console.warn('Error al cargar pisos, usando fallback:', err)
                setPisos(['6TO A', '6TO C', '4TO A', '4TO B', '4TO C'].map(n => ({ nombre: n })))
            }
        }
        loadPisos()
        return () => { mounted = false }
    }, [user])

    // Cargar médicos del servicio para mapear IDs a nombres
    useEffect(() => {
        let mounted = true
        const loadMedicos = async () => {
            try {
                const servicioId = (user && user.servicioId) || localStorage.getItem('servicioId')
                if (!servicioId) {
                    return
                }

                const data = await adminService.usuarios.getAll(Number(servicioId))
                if (!mounted) return

                if (Array.isArray(data)) {
                    setMedicos(data)
                }
            } catch (err) {
                console.warn('Error al cargar médicos:', err)
            }
        }
        loadMedicos()
        return () => { mounted = false }
    }, [user])

    // Cargar datos de cobertura y solicitudes cuando cambia el mes
    const loadCalendarData = async () => {
        try {
            setLoading(true)
            const fechaInicio = formatDateKey(days[0])
            const fechaFin = formatDateKey(days[days.length - 1])

            // Cargar cobertura y solicitudes completas en paralelo
            const [cobertura, solicitudes] = await Promise.all([
                adminService.turnos.getCobertura(null, fechaInicio, fechaFin),
                adminService.solicitudes.getByServicio()
            ])

            const data = cobertura?.cobertura || {}
            // Log when coverage has an unexpected shape to help debugging
            if (data && typeof data === 'object' && !Object.keys(data).length) {
                // empty object is fine
            } else if (data && typeof data !== 'object') {
                console.warn('CalendarView: formato inesperado de cobertura recibido (no es object):', cobertura)
            }
            setCoberturaData(data)
            // Normalizar solicitudes del backend al formato UI
            const solicitudesNormalizadas = (solicitudes || []).map(s => adminService.normalizeSolicitud(s))
            setSolicitudesData(solicitudesNormalizadas)
            // Incrementar refreshKey para forzar re-render de modales
            setRefreshKey(prev => prev + 1)
        } catch (error) {
            console.warn('Error al cargar datos del calendario:', error)
            // No usar datos mock en caso de error
            setCoberturaData(null)
            setSolicitudesData([])
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        let mounted = true
        const run = async () => {
            if (!mounted) return
            await loadCalendarData()
        }
        run()
        return () => { mounted = false }
    }, [displayDate])

    // Usar datos reales si están disponibles, sino dejar vacío
    const map = coverageMap || (coberturaData ? transformCoberturaToMap(coberturaData, pisos) : {})
    const [selected, setSelected] = useState(null)
    const [alterarHorarioDoctor, setAlterarHorarioDoctor] = useState(null)
    const [turnosSinAsignar, setTurnosSinAsignar] = useState({})
    const [asignarTurnoModal, setAsignarTurnoModal] = useState(null)
    const [showTurnosSinAsignar, setShowTurnosSinAsignar] = useState(false)

    // Usar solicitudes del backend (solicitudesData) si están disponibles, sino usar requests prop
    const [reqListState, setReqListState] = useState(requests || [])

    // Actualizar reqListState cuando lleguen las solicitudes del backend
    useEffect(() => {
        if (solicitudesData) { // Simplificado: usa solicitudesData directamente si existe (array vacío es válido)
            setReqListState(solicitudesData)
        } else if (requests && requests.length > 0) {
            setReqListState(requests)
        } else {
            setReqListState([])
        }
    }, [solicitudesData, requests])

    // POLLING: Actualización silenciosa de solicitudes cada 10 segundos
    useEffect(() => {
        let isMounted = true;

        const pollRequests = async () => {
            try {
                // Fetch silencioso (sin cambiar loading state)
                const solicitudes = await adminService.solicitudes.getByServicio()
                if (!isMounted) return

                // Normalizar
                const solicitudesNormalizadas = (solicitudes || []).map(s => adminService.normalizeSolicitud(s))

                // Actualizar estado solo si hay cambios (opcional, pero React maneja bien el diffing)
                setSolicitudesData(solicitudesNormalizadas)
            } catch (error) {
                // Fail silently para no molestar al usuario con errores de red intermitentes en background
                console.warn('Silent poll failed:', error)
            }
        }

        // Ejecutar inmediatamente al montar (ya lo hace loadCalendarData, pero el intervalo espera 10s)
        // const id = setInterval(pollRequests, 10000); 
        // Mejor dejar que loadCalendarData haga la carga inicial y usar intervalo para subsiguientes
        const intervalId = setInterval(pollRequests, 10000);

        return () => {
            isMounted = false;
            clearInterval(intervalId);
        }
    }, []) // Empty dependency array: run once on mount (setup interval)

    // Mapa de solicitudes PENDIENTES por día (para badges)
    const requestsMap = {}
    reqListState.forEach(r => {
        if (!r) return
        // Solo contar solicitudes pendientes
        if (r.estado !== 'Pendiente') return

        let key
        if (r.fecha) key = parseToLocalDateKey(r.fecha)
        else if (r.fecha_objetivo) key = parseToLocalDateKey(r.fecha_objetivo)
        else if (r.date) key = parseToLocalDateKey(r.date)
        else key = null
        if (!key) return
        requestsMap[key] = (requestsMap[key] || 0) + 1
    })

    const scrollRef = useRef(null)

    useEffect(() => {
        const el = scrollRef.current
        if (!el) return
        if (window.innerWidth > 1024) return
        const center = Math.max(0, (el.scrollWidth - el.clientWidth) / 2)
        const handle = requestAnimationFrame(() => { el.scrollLeft = center })
        const onResize = () => {
            if (window.innerWidth > 1024) return
            const c = Math.max(0, (el.scrollWidth - el.clientWidth) / 2)
            el.scrollLeft = c
        }
        window.addEventListener('resize', onResize)
        return () => { window.removeEventListener('resize', onResize); cancelAnimationFrame(handle) }
    }, [displayDate])

    const prevMonth = () => {
        setDisplayDate(d => {
            const y = d.getFullYear()
            const m = d.getMonth()
            const nd = new Date(y, m - 1, 1)
            return nd
        })
        setSelected(null)
    }

    const nextMonth = () => {
        setDisplayDate(d => {
            const y = d.getFullYear()
            const m = d.getMonth()
            const nd = new Date(y, m + 1, 1)
            return nd
        })
        setSelected(null)
    }

    const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

    // Determinar clase CSS basada en pasado/futuro y cobertura
    const getCellClass = (date, isOutMonth, status) => {
        const isPast = date < today

        if (isOutMonth) {
            if (status === undefined) return 'calview-cell calview-cell-empty calview-out-month'
            if (status === 'full') return 'calview-cell calview-cell-full calview-out-month'
            if (status === 'partial' || status === 'empty') return 'calview-cell calview-cell-prev-uncompleted calview-out-month'
            return 'calview-cell calview-cell-empty calview-out-month'
        }

        // Días del mes actual
        if (status === 'full') {
            return 'calview-cell calview-cell-full' // Verde (cubierto)
        }

        if (status === 'partial') {
            if (isPast) {
                return 'calview-cell calview-cell-empty' // Rojo (pasado incompleto)
            } else {
                return 'calview-cell calview-cell-partial' // Amarillo (futuro incompleto)
            }
        }

        // Sin cobertura
        if (isPast) {
            return 'calview-cell calview-cell-empty' // Rojo (pasado sin cubrir)
        } else {
            return 'calview-cell calview-cell-partial' // Amarillo (futuro sin cubrir)
        }
    }

    // Construir asignaciones desde datos reales del backend
    const buildAssignments = () => {
        const out = {}

        // Si no hay pisos cargados, retornar objeto vacío
        if (!pisos || pisos.length === 0) {
            return out
        }

        const pisosNombres = pisos.map(p => p.nombre || p.id?.toString() || p)

        // Crear mapa de ID de piso a nombre (el backend devuelve id_piso como string)
        const pisoIdToNombre = {}
        pisos.forEach(p => {
            const id = p.id?.toString()
            const nombre = p.nombre || id
            if (id) pisoIdToNombre[id] = nombre
        })

        // Crear mapa de ID de médico a nombre
        const medicoIdToNombre = {}
        medicos.forEach(m => {
            const id = m.id || m.idPersonal
            const nombre = m.nombre || `${m.nombre} ${m.apellidoPaterno || ''}`.trim()
            if (id) medicoIdToNombre[id] = { nombre, rol: m.rol }
        })

        // Si hay datos de cobertura del backend, usarlos
        if (coberturaData && Object.keys(coberturaData).length > 0) {
            days.forEach((d) => {
                const key = formatDateKey(d)
                out[key] = {}

                // Inicializar arrays vacíos para cada piso (por nombre)
                pisosNombres.forEach(p => out[key][p] = [])

                // Si hay datos para esta fecha, procesarlos
                let turnosDiaRaw = coberturaData[key]
                let turnosDia = []
                if (!turnosDiaRaw) turnosDia = []
                else if (Array.isArray(turnosDiaRaw)) turnosDia = turnosDiaRaw
                else if (typeof turnosDiaRaw === 'object') {
                    const vals = Object.values(turnosDiaRaw)
                    if (vals.every(v => Array.isArray(v))) turnosDia = vals.flat()
                    else turnosDia = [turnosDiaRaw]
                } else {
                    console.warn('CalendarView: formato inesperado de cobertura para clave', key, turnosDiaRaw)
                    turnosDia = []
                }

                turnosDia.forEach(turno => {
                    // Mostrar únicamente turnos con médico asignado.
                    // El backend puede exponer el id como `idMedico` o `id_medico` y/o un campo `medicoNombre`.
                    const hasAssigned = !!(turno.idMedico || turno.id_medico || turno.medico || turno.medicoNombre || turno.medicoAsignado)
                    if (!hasAssigned) return // ignorar turnos sin médico asignado

                    // El backend devuelve el ID o nombre del piso; normalizamos
                    const pisoId = turno.piso || turno.idPiso
                    const pisoNombre = pisoIdToNombre[pisoId] || pisoId || 'Sin piso'

                    // Solo agregar si el piso está en nuestra lista
                    if (out[key][pisoNombre]) {
                        // Buscar información del médico (no usar creador como fallback)
                        const medicoId = turno.medico || turno.idMedico || turno.usuario_id || turno.id_medico
                        const medicoInfo = medicoIdToNombre[medicoId]
                        const medicoNombre = medicoInfo?.nombre || turno.medicoNombre || turno.medico?.nombre || turno.medicoAsignado?.nombre || (`Médico ID ${medicoId}`)

                        const rol = medicoInfo?.rol || turno.rol || turno.medico?.rol || 'Médico'
                        const horario = turno.horaInicio && turno.horaFin
                            ? `${turno.horaInicio}-${turno.horaFin}`
                            : turno.turno || '24h'

                        // Resolver asignador (quien asignó/aceptó el turno) si viene en la respuesta
                        let asignadorNombre = null
                        if (turno.asignador) {
                            asignadorNombre = turno.asignador.nombre || `${turno.asignador.nombre || ''} ${turno.asignador.apellidoPaterno || ''} ${turno.asignador.apellidoMaterno || ''}`.trim()
                        } else if (turno.asignadorNombre) {
                            asignadorNombre = turno.asignadorNombre
                        }

                        out[key][pisoNombre].push({
                            name: medicoNombre,
                            piso: pisoNombre,
                            turno: horario,
                            horaInicio: turno.horaInicio || turno.hora_inicio || turno.horaInicioTurno || null,
                            horaFin: turno.horaFin || turno.hora_fin || turno.horaFinTurno || null,
                            role: rol,
                            turnoFijo: turno.turnoFijo || (turno.tipoTurno === 'fijo' ? { day: 'Fijo' } : null),
                            idTurno: turno.id || turno.idTurno,
                            medicoId: medicoId,
                            asignador: asignadorNombre
                        })
                    }
                })
            })
        } else {
            // No usar datos mock - dejar vacío si no hay datos del backend
            days.forEach((d, i) => {
                const key = formatDateKey(d)
                out[key] = {}
                pisosNombres.forEach(p => out[key][p] = [])
            })
        }

        return out
    }

    const [extraAssignments, setExtraAssignments] = useState({})
    const [refreshKey, setRefreshKey] = useState(0)

    const assignments = { ...buildAssignments(), ...extraAssignments }

    // Función para recargar datos de un día específico
    const recargarDiaSeleccionado = async (fecha) => {
        if (!fecha) return

        // Limpiar el caché de ese día para forzar recarga
        setExtraAssignments(prev => {
            const newState = { ...prev }
            delete newState[fecha]
            return newState
        })

        // Incrementar refreshKey para forzar re-render
        setRefreshKey(prev => prev + 1)
    }
    const [showDoctorModal, setShowDoctorModal] = useState(false)
    const [doctorLoading, setDoctorLoading] = useState(false)
    const [doctorDetail, setDoctorDetail] = useState(null)

    const openDoctorProfile = async (medicoId, fallbackName = '') => {
        // Try to recover medicoId from local medicos list if not provided
        let idToUse = medicoId
        if (!idToUse && fallbackName && Array.isArray(medicos) && medicos.length > 0) {
            const normalizedFallback = (fallbackName || '').trim().toLowerCase()
            const found = medicos.find(m => {
                const fullname = `${(m.nombre || '').trim()} ${(m.apellidoPaterno || '').trim()} ${(m.apellidoMaterno || '').trim()}`.replace(/\s+/g, ' ').trim().toLowerCase()
                const short = `${(m.nombre || '').trim()} ${(m.apellidoPaterno || '').trim()}`.replace(/\s+/g, ' ').trim().toLowerCase()
                return fullname === normalizedFallback || short === normalizedFallback
            })
            if (found) {
                idToUse = found.id || found.idPersonal
            }
        }

        // Si no hay ID definitivo, abrir modal con información mínima construida desde el nombre
        if (!idToUse) {
            const parts = (fallbackName || '').trim().split(/\s+/)
            const nombre = parts[0] || ''
            const apellidos = parts.slice(1).join(' ') || ''
            setDoctorDetail({ nombre, apellidos })
            setShowDoctorModal(true)
            return
        }

        setDoctorLoading(true)
        setShowDoctorModal(true)
        try {
            const data = await adminService.usuarios.getById(idToUse)
            // Normalizar campos comunes para DoctorDetail
            const raw = data || {}
            const nombre = raw.nombre || raw.primerNombre || raw.nombres || raw.firstName || ''
            const apellidos = raw.apellidoPaterno || raw.apellidoMaterno || raw.apellidos || raw.lastName || ''
            const rut = raw.rut || raw.rutNumber || raw.run || ''
            const servicio = raw.servicio || raw.especialidad || raw.department || ''
            const especialidad = raw.especialidad || raw.servicio || ''
            const telefono = raw.telefono || raw.telefonoContacto || raw.phone || ''
            const email = raw.email || raw.correo || ''
            const horasTrabajadas = raw.horasAsignadas || raw.horasSemanales || raw.horasTrabajadas || ''
            const tipoTurno = raw.tipoTurno || raw.turno || ''

            const normalized = {
                __raw: raw,
                nombre: nombre || fallbackName.split(' ')[0] || raw.nombre || '',
                apellidos: apellidos || fallbackName.split(' ').slice(1).join(' ') || '',
                rut,
                servicio,
                especialidad,
                telefono,
                correo: email,
                email,
                horasTrabajadas,
                tipoTurno,
                rol: raw.rol || raw.role || ''
            }

            setDoctorDetail(normalized)
        } catch (e) {
            console.error('CalendarView: error cargando detalle de médico', e)
            const parts = (fallbackName || '').trim().split(/\s+/)
            setDoctorDetail({ __error: 'No fue posible cargar el perfil (ver consola)', nombre: parts[0] || 'Médico', apellidos: parts.slice(1).join(' ') || '' })
        } finally {
            setDoctorLoading(false)
        }
    }
    const [showAllRequests, setShowAllRequests] = useState(false)
    const [filterQuery, setFilterQuery] = useState('')
    const [filterTipo, setFilterTipo] = useState('')
    const [filterEstado, setFilterEstado] = useState('')

    // Función helper para determinar si un tipo es de permiso
    const isTipoPermiso = (tipo) => {
        const tiposPermiso = ['Permiso', 'Motivos personales', 'Licencia médica', 'Feriado legal', 'Permiso administrativo'];
        return tiposPermiso.includes(tipo);
    };

    const selectedKey = selected
    // Filtrar por día seleccionado Y solo solicitudes pendientes
    const baseList = selectedKey ? reqListState.filter(r => {
        if (!r) return false

        let key = null
        // Usar formatDateKey para consistencia con requestsMap
        if (r.fecha) key = parseToLocalDateKey(r.fecha)
        else if (r.fecha_objetivo) key = parseToLocalDateKey(r.fecha_objetivo)
        else if (r.date) key = parseToLocalDateKey(r.date)

        // Solo mostrar solicitudes del día seleccionado Y que estén pendientes
        const matches = key === selectedKey && r.estado === 'Pendiente'
        return matches
    }) : []

    const filteredReqs = baseList.filter(r => {
        if (filterTipo) {
            if (filterTipo === 'Permiso') {
                // Para "Permiso", incluir todos los tipos de permiso
                if (!isTipoPermiso(r.tipo)) return false;
            } else if (r.tipo !== filterTipo) {
                return false;
            }
        }
        if (filterEstado && r.estado !== filterEstado) return false
        if (filterQuery) {
            const q = filterQuery.toLowerCase()
            if (!(String(r.motivo || r.detalle || '').toLowerCase().includes(q) || String(r.tipo || '').toLowerCase().includes(q) || String(r.id || '').toLowerCase().includes(q) || String(r.solicitante?.nombre || '').toLowerCase().includes(q))) return false
        }
        return true
    })

    const [expandedId, setExpandedId] = useState(null)

    const updateRequestState = async (id, newState) => {
        // Normalizar el estado para enviarlo al backend (backend espera 'Aprobado'/'Rechazado')
        const payloadState = newState === 'Aprobada' ? 'Aprobado' : newState === 'Rechazado' ? 'Rechazado' : newState

        try {
            // Llamada al backend para persistir el cambio
            await adminService.solicitudes.updateEstado(id, payloadState)

            // Actualizar estado localmente tras éxito
            setReqListState(prev => prev.map(item => item.id === id ? { ...item, estado: payloadState } : item))
            // Si la solicitud corresponde al día actualmente seleccionado, eliminar cualquier extraAssignment
            // asociado para forzar recarga de turnos crudos y reflejar la asignación en "Detalle del día"
            try {
                const req = reqListState.find(r => r && r.id === id)
                if (req) {
                    const key = parseToLocalDateKey(req.fecha || req.fecha_objetivo || req.date)
                    if (key) {
                        setExtraAssignments(prev => {
                            if (!prev) return prev
                            const copy = { ...prev }
                            if (copy[key]) delete copy[key]
                            return copy
                        })
                    }
                }
            } catch (e) {
                // No crítico si falla; seguir con la recarga global
                console.warn('CalendarView: no se pudo limpiar extraAssignments para la solicitud actualizada', e)
            }

            // Recargar datos del calendario para que cobertura y asignaciones se actualicen en tiempo real
            try {
                await loadCalendarData()
            } catch (e) {
                console.warn('CalendarView: error recargando calendario tras actualizar solicitud', e)
            }
        } catch (err) {
            console.error('Error al actualizar la solicitud en backend:', err)
            alert('No se pudo actualizar la solicitud en el servidor. Intenta de nuevo.')
        }
    }

    // Si la cobertura del backend es solo agregada (p.ej. { totalHoras, isCovered })
    // y no contiene la lista de turnos, al seleccionar un día intentamos
    // recuperar los turnos crudos del servicio y construir asignaciones para ese día.
    useEffect(() => {
        let mounted = true
        const fetchTurnosForSelected = async () => {
            if (!selected) return
            // Si ya tenemos asignaciones extras para este día, no volver a cargar
            if (extraAssignments[selected]) return

            const clave = selected
            const coberturaParaDia = coberturaData ? coberturaData[clave] : null

            // Detectar formato agregado (no es arreglo ni objeto por piso)
            const pareceAgregado = coberturaParaDia && (coberturaParaDia.totalHoras !== undefined || coberturaParaDia.isCovered !== undefined)
            if (!pareceAgregado) return

            try {
                const servicioId = (user && user.servicioId) || localStorage.getItem('servicioId')
                if (!servicioId) return

                // Usar el nuevo endpoint optimizado que obtiene directamente los turnos del día
                const turnosDia = await adminService.turnos.getByServicioAndDia(Number(servicioId), clave)
                if (!mounted) return

                // Construir estructura parecida a buildAssignments solo para esta fecha
                const pisosNombres = pisos.map(p => p.nombre || p.id?.toString() || p)
                const pisoIdToNombre = {}
                pisos.forEach(p => { const id = p.id?.toString(); const nombre = p.nombre || id; if (id) pisoIdToNombre[id] = nombre })
                const medicoIdToNombre = {}
                medicos.forEach(m => { const id = m.id || m.idPersonal; const nombre = m.nombre || `${m.nombre} ${m.apellidoPaterno || ''}`.trim(); if (id) medicoIdToNombre[id] = { nombre, rol: m.rol } })

                const outForDay = {}
                pisosNombres.forEach(p => outForDay[p] = [])

                turnosDia.forEach(turno => {
                    // Ignorar turnos sin médico asignado
                    const hasAssigned = !!(turno.idMedico || turno.id_medico || turno.medico || turno.medicoNombre || turno.medicoAsignado)
                    if (!hasAssigned) return

                    // FILTRO: Solo mostrar turnos que EMPIEZAN en el día seleccionado
                    // Ignorar turnos que empezaron el día anterior y terminan hoy
                    const diaInicioTurno = turno.diaInicioTurno || turno.dia_inicio_turno || turno.fechaInicio
                    if (diaInicioTurno && diaInicioTurno !== clave) return

                    const pisoId = turno.piso || turno.idPiso
                    const pisoNombre = pisoIdToNombre[pisoId] || pisoId || 'Sin piso'
                    if (!outForDay[pisoNombre]) return

                    const medicoId = turno.medico || turno.idMedico || turno.usuario_id || turno.id_medico
                    const medicoInfo = medicoIdToNombre[medicoId]
                    // No usar creador como fallback; mostrar solamente nombre del médico asignado
                    const medicoNombre = medicoInfo?.nombre || turno.medicoNombre || turno.medico?.nombre || turno.medicoAsignado?.nombre || (`Médico ID ${medicoId}`)
                    const rol = medicoInfo?.rol || turno.rol || turno.medico?.rol || 'Médico'
                    const horario = (turno.horaInicio && turno.horaFin) ? `${turno.horaInicio}-${turno.horaFin}` : (turno.turno || '24h')

                    let asignadorNombre = null
                    if (turno.asignador) asignadorNombre = turno.asignador.nombre || `${turno.asignador.nombre || ''} ${turno.asignador.apellidoPaterno || ''} ${turno.asignador.apellidoMaterno || ''}`.trim()
                    else if (turno.asignadorNombre) asignadorNombre = turno.asignadorNombre

                    outForDay[pisoNombre].push({
                        name: medicoNombre,
                        piso: pisoNombre,
                        turno: horario,
                        horaInicio: turno.horaInicio || turno.hora_inicio || turno.horaInicioTurno || null,
                        horaFin: turno.horaFin || turno.hora_fin || turno.horaFinTurno || null,
                        role: rol,
                        turnoFijo: turno.turnoFijo || (turno.tipoTurno === 'fijo' ? { day: 'Fijo' } : null),
                        idTurno: turno.id || turno.idTurno,
                        medicoId: medicoId,
                        asignador: asignadorNombre
                    })
                })

                setExtraAssignments(prev => ({ ...prev, [selected]: outForDay }))
            } catch (err) {
                console.warn('CalendarView: no se pudieron cargar turnos crudos para la fecha seleccionada', err)
            }
        }

        fetchTurnosForSelected()
        return () => { mounted = false }
    }, [selected, coberturaData, pisos, medicos, extraAssignments, user])

    // Cargar turnos sin asignar cuando se selecciona un día
    useEffect(() => {
        let mounted = true
        const fetchTurnosSinAsignar = async () => {
            if (!selected) return
            // Si ya tenemos datos para este día, no recargar
            if (turnosSinAsignar[selected]) return

            try {
                const servicioId = (user && user.servicioId) || localStorage.getItem('servicioId')
                if (!servicioId) return

                const turnos = await adminService.turnos.getSinAsignarByDia(Number(servicioId), selected)
                if (!mounted) return

                if (turnos && turnos.length > 0) {
                    setTurnosSinAsignar(prev => ({ ...prev, [selected]: turnos }))
                } else {
                    setTurnosSinAsignar(prev => ({ ...prev, [selected]: [] }))
                }
            } catch (err) {
                console.warn('CalendarView: error cargando turnos sin asignar', err)
                setTurnosSinAsignar(prev => ({ ...prev, [selected]: [] }))
            }
        }

        fetchTurnosSinAsignar()
        return () => { mounted = false }
    }, [selected, user, turnosSinAsignar])

    // Escuchar eventos globales cuando una solicitud es actualizada en cualquier componente
    // Esto permite que "Calendario — vista resumen" se recargue en tiempo real aunque la acción
    // de aprobación se realice desde otro componente
    useEffect(() => {
        const handler = (e) => {
            try {
                // Limpiar asignaciones extra del día seleccionado para forzar recarga del detalle
                setExtraAssignments(prev => {
                    if (!prev) return prev
                    const copy = { ...prev }
                    if (selected && copy[selected]) delete copy[selected]
                    return copy
                })
                // Recargar datos del calendario
                loadCalendarData().catch(err => console.warn('CalendarView: error recargando tras evento solicitud:updated', err))
            } catch (err) {
                console.warn('CalendarView: handler solicitud:updated error', err)
            }
        }

        if (typeof window !== 'undefined' && window.addEventListener) {
            window.addEventListener('solicitud:updated', handler)
        }
        return () => {
            if (typeof window !== 'undefined' && window.removeEventListener) {
                window.removeEventListener('solicitud:updated', handler)
            }
        }
    }, [selected, displayDate])

    const getStatusText = (date, status) => {
        const isPast = date < today

        if (status === 'full') return 'Completo'
        if (status === 'partial') {
            return isPast ? 'Incompleto' : 'Parcial'
        }
        return isPast ? 'Sin cubrir' : 'Pendiente'
    }

    // Helper to check if a specific floor has unassigned turns
    const floorHasUnassigned = (floorName) => {
        const turns = turnosSinAsignar[selected]
        if (!turns || turns.length === 0) return false

        // Check direct match with name or ID presented as name
        const matchName = turns.some(t => (t.nombrePiso || String(t.idPiso)) === floorName)
        if (matchName) return true

        // Check deep ID match
        const floorObj = pisos.find(p => (p.nombre || String(p.id)) === floorName)
        if (!floorObj) return false
        return turns.some(t => String(t.idPiso) === String(floorObj.id))
    }

    return (
        <div className="calview-container">
            <header className="calview-header">
                <button type="button" className="calview-nav-btn" onClick={prevMonth} aria-label="Mes anterior">‹</button>
                <h3 className="calview-title">Calendario — vista resumen: {monthNames[month]} {year}</h3>
                <button type="button" className="calview-nav-btn" onClick={nextMonth} aria-label="Mes siguiente">›</button>
            </header>

            <div className="calview-content">
                <div>
                    <div className="calview-panel">
                        <div ref={scrollRef} className="calview-scroll-wrapper">
                            <div className="calview-weekdays">
                                {['LUN', 'MAR', 'MIE', 'JUE', 'VIE', 'SAB', 'DOM'].map((h, idx) => (
                                    <div key={`${h}-${idx}`} className="calview-weekday">{h}</div>
                                ))}
                            </div>

                            <div className="calview-grid">
                                {(() => {
                                    const firstDay = new Date(year, month, 1)
                                    const blanks = (firstDay.getDay() + 6) % 7
                                    const prevMonthLast = new Date(year, month, 0).getDate()
                                    const prevMonthIndex = month - 1 < 0 ? 11 : month - 1
                                    const prevYear = month - 1 < 0 ? year - 1 : year
                                    const arr = []
                                    for (let i = 0; i < blanks; i++) {
                                        const dayNum = prevMonthLast - (blanks - 1 - i)
                                        const dateObj = new Date(prevYear, prevMonthIndex, dayNum)
                                        const key = formatDateKey(dateObj)
                                        arr.push(
                                            <div key={`prev-${key}`} className={getCellClass(dateObj, true, map[key])} title={`(${key})`} aria-hidden="true">
                                                <div className="calview-cell-header">
                                                    <div className="calview-day-number">{dayNum}</div>
                                                </div>
                                            </div>
                                        )
                                    }
                                    return arr
                                })()}

                                {days.map(d => {
                                    const key = formatDateKey(d)
                                    const status = map[key] || 'empty'
                                    const isSelected = selected === key
                                    const isToday = d.getTime() === today.getTime()
                                    const cellClass = getCellClass(d, false, status) + (isSelected ? ' calview-selected' : '') + (isToday ? ' calview-today' : '')
                                    const isPast = d < today

                                    return (
                                        <button key={key} onClick={() => { setSelected(key); setShowTurnosSinAsignar(false); }} className={cellClass} title={`${key} — ${getStatusText(d, status)}`}>
                                            <div className="calview-cell-header">
                                                <div className="calview-day-number">{d.getDate()}</div>
                                            </div>
                                            {requestsMap[key] ? (
                                                (() => {
                                                    const count = requestsMap[key]
                                                    const display = count > 9 ? '9+' : String(count)
                                                    const danger = count >= 5
                                                    const warn = !danger && count >= 2
                                                    const extraClass = danger ? 'calview-badge-danger' : warn ? 'calview-badge-warn' : 'calview-badge-info'
                                                    return (
                                                        <span
                                                            role="status"
                                                            aria-label={`${count} solicitudes`}
                                                            title={`${count} solicitud${count > 1 ? 'es' : ''}`}
                                                            className={`calview-requests-badge ${extraClass}`}
                                                        >
                                                            {display}
                                                        </span>
                                                    )
                                                })()
                                            ) : null}
                                            <div className="calview-status-container">
                                                <div className="calview-status-text">{getStatusText(d, status)}</div>
                                            </div>
                                        </button>
                                    )
                                })}
                            </div>
                        </div>
                    </div>

                </div>

                {/* Modal: Detalle del día seleccionado */}
                {selected && !showAllRequests && !showTurnosSinAsignar && (
                    <div key={`detail-${selected}-${refreshKey}`} className="calview-modal-overlay" role="dialog" aria-modal="true">
                        <div className="calview-modal-container">
                            <div className="calview-modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                    <h3 className="calview-modal-title">Detalle del día</h3>
                                    <div className="calview-modal-subtitle">{parseKeyToLocalDate(selected).toLocaleDateString('es-CL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
                                </div>

                                {/* Botón de ver solicitudes ahora en el header (arriba) */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 12 }}>
                                    <button
                                        disabled={!requestsMap[selected]}
                                        onClick={() => { setFilterQuery(''); setFilterTipo(''); setFilterEstado(''); setShowAllRequests(true) }}
                                        className={`calview-requests-button ${requestsMap[selected] ? 'calview-requests-button-active' : 'calview-requests-button-disabled'}`}
                                        title={`Ver solicitudes pendientes (${requestsMap[selected] || 0})`}
                                        style={{ whiteSpace: 'nowrap' }}
                                    >
                                        {`Ver solicitudes pendientes (${requestsMap[selected] || 0})`}
                                    </button>
                                    <button className="calview-modal-close" aria-label="Cerrar" onClick={() => { setSelected(null); setShowAllRequests(false); setShowTurnosSinAsignar(false); }}>×</button>
                                </div>
                            </div>

                            <div className="calview-modal-content">
                                {assignments[selected] ? (
                                    // Siempre mostrar la estructura de pisos, incluso si están vacíos
                                    Object.keys(assignments[selected]).length === 0 ? (
                                        <div className="calview-no-assignments">No hay información de pisos disponible</div>
                                    ) : (
                                        Object.keys(assignments[selected]).map(piso => {
                                            const list = assignments[selected][piso]
                                            return (
                                                <section key={piso} className="calview-pasillo-section">
                                                    <h4 className="calview-pasillo-title">{piso} <span className="calview-count-badge">· {list.length} asignación{list.length !== 1 ? 'es' : ''}</span></h4>
                                                    {list.length === 0 ? (
                                                        <div className="calview-no-assignments">Sin asignaciones en este piso (incompleto)</div>
                                                    ) : (
                                                        <div className="calview-assignments-list">
                                                            {list.map((a, idx) => (
                                                                <div key={idx} className="calview-assignment-card">
                                                                    <div className="calview-piso-badge">{piso.split(' ')[0]}</div>
                                                                    <div className="calview-assignment-details">
                                                                        <div className="calview-assignment-info">
                                                                            <p className="calview-assignment-name"><strong>{a.name}</strong></p>
                                                                            <p className="calview-assignment-hours">
                                                                                {a.horaInicio && a.horaFin ? `Horario: ${formatTimeWithAMPM(a.horaInicio)} - ${formatTimeWithAMPM(a.horaFin)}` : (a.turnoFijo ? (`Fijo • ${a.turnoFijo.day || '24h'}`) : (a.turno || '—'))}
                                                                            </p>
                                                                            {a.asignador ? (
                                                                                <p className="calview-assignment-asignador">Asignado por: {a.asignador}</p>
                                                                            ) : null}
                                                                        </div>
                                                                        <div className="calview-assignment-actions">
                                                                            <button
                                                                                className="calview-btn-profile"
                                                                                onClick={() => openDoctorProfile(a.medicoId, a.name)}
                                                                                aria-label={`Ver perfil de ${a.name}`}
                                                                            >
                                                                                Ver perfil
                                                                            </button>
                                                                            <button
                                                                                className="calview-btn-profile"
                                                                                onClick={() => { setAlterarHorarioDoctor({ id: a.medicoId, nombre: a.name, fecha: selected }) }}
                                                                                aria-label={`Alterar horario de ${a.name}`}
                                                                                style={{ marginLeft: '8px', backgroundColor: '#7c3aed' }}
                                                                            >
                                                                                Alterar Horario
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                    {/* Botón de asignación manual - aparece solo si hay turnos sin asignar para este piso */}
                                                    {floorHasUnassigned(piso) && (
                                                        <div style={{ marginTop: '12px', textAlign: 'center' }}>
                                                            <button
                                                                onClick={() => setShowTurnosSinAsignar(!showTurnosSinAsignar)}
                                                                style={{
                                                                    padding: '8px 16px',
                                                                    backgroundColor: showTurnosSinAsignar ? '#dc2626' : '#f59e0b',
                                                                    color: 'white',
                                                                    border: 'none',
                                                                    borderRadius: '6px',
                                                                    fontSize: '13px',
                                                                    fontWeight: '600',
                                                                    cursor: 'pointer',
                                                                    display: 'inline-flex',
                                                                    alignItems: 'center',
                                                                    gap: '6px',
                                                                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                                                                }}
                                                            >
                                                                {showTurnosSinAsignar ? <X size={16} /> : <UserPlus size={16} />}
                                                                {showTurnosSinAsignar ? 'Ocultar turnos disponibles' : `Asignar de forma manual (${turnosSinAsignar[selected].length})`}
                                                            </button>
                                                        </div>
                                                    )}
                                                </section>
                                            )
                                        })
                                    )
                                ) : (
                                    <div className="calview-no-assignments">No hay información disponible para {selected}</div>
                                )}

                                {/* El botón de ver solicitudes fue movido al header para aparecer arriba */}

                                {/* Sección: Turnos Sin Asignar (solo visible al hacer clic en "Asignar de forma manual") */}
                                { /* Sección eliminada: Ahora se muestra en un modal dedicado */}
                            </div>
                        </div>
                    </div>
                )}

                {/* MODAL: ASIGNACIÓN MANUAL (Apartado dedicado) */}
                {selected && showTurnosSinAsignar && (
                    <div className="calview-modal-overlay" role="dialog" aria-modal="true">
                        <div className="calview-modal-container">
                            <div className="calview-modal-header">
                                <h3 className="calview-modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#f59e0b' }}>
                                    <AlertTriangle size={20} />
                                    Asignación Manual de Turnos
                                </h3>
                                <button className="calview-modal-close" aria-label="Cerrar" onClick={() => { setShowTurnosSinAsignar(false); setSelected(null); }}>×</button>
                            </div>

                            <div className="calview-modal-content">
                                <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <h4 style={{ margin: 0, fontSize: '1.1rem', color: '#1f2937' }}>{parseKeyToLocalDate(selected).toLocaleDateString('es-CL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</h4>
                                        <p style={{ margin: '4px 0 0', fontSize: '0.9rem', color: '#6b7280' }}>
                                            Hay <strong>{turnosSinAsignar[selected]?.length || 0}</strong> turnos disponibles para asignar.
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => setShowTurnosSinAsignar(false)}
                                        style={{
                                            padding: '8px 16px',
                                            backgroundColor: '#e5e7eb',
                                            color: '#374151',
                                            border: 'none',
                                            borderRadius: '6px',
                                            fontWeight: '600',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        ← Volver al detalle
                                    </button>
                                </div>

                                {turnosSinAsignar[selected] && turnosSinAsignar[selected].length > 0 ? (
                                    <div className="calview-assignments-list">
                                        {turnosSinAsignar[selected].map((turno, idx) => (
                                            <div key={idx} className="calview-assignment-card" style={{ borderLeft: '4px solid #f59e0b', backgroundColor: '#fffbeb' }}>
                                                <div className="calview-piso-badge" style={{ backgroundColor: '#f59e0b' }}>
                                                    {(turno.nombrePiso || turno.idPiso || 'N/A').toString().split(' ')[0]}
                                                </div>
                                                <div className="calview-assignment-details">
                                                    <div className="calview-assignment-info">
                                                        <p className="calview-assignment-name" style={{ color: '#92400e' }}>
                                                            <strong>{turno.nombrePiso || turno.idPiso || 'Piso sin definir'}</strong>
                                                        </p>
                                                        <p className="calview-assignment-hours">
                                                            {turno.horaInicio && turno.horaFin
                                                                ? `Horario: ${formatTimeWithAMPM(turno.horaInicio)} - ${formatTimeWithAMPM(turno.horaFin)}`
                                                                : 'Horario no definido'}
                                                        </p>
                                                        <p style={{ fontSize: '11px', color: '#d97706', marginTop: '4px' }}>
                                                            Estado: {turno.estado || 'DISPONIBLE'}
                                                        </p>
                                                    </div>
                                                    <div className="calview-assignment-actions">
                                                        <button
                                                            className="calview-btn-profile"
                                                            onClick={() => setAsignarTurnoModal({ turno, fecha: selected })}
                                                            aria-label={`Asignar turno del piso ${turno.nombrePiso || turno.idPiso}`}
                                                            style={{
                                                                backgroundColor: '#16a34a',
                                                                color: 'white',
                                                                fontWeight: '600',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: '6px'
                                                            }}
                                                        >
                                                            <UserPlus size={14} />
                                                            Asignar Médico
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="calview-no-assignments">
                                        No hay turnos sin asignar para este día.
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Modal: lista completa de solicitudes */}
                {selected && showAllRequests && (
                    <div className="calview-modal-overlay" role="dialog" aria-modal="true">
                        <div className="calview-modal-container calview-requests-modal">
                            <div className="calview-modal-header">
                                <div>
                                    <h3 className="calview-modal-title">Solicitudes pendientes del día</h3>
                                    <div className="calview-modal-subtitle">
                                        {parseKeyToLocalDate(selected).toLocaleDateString('es-CL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                        {filteredReqs.length > 0 && <span className="calview-count-badge"> · {filteredReqs.length} solicitud{filteredReqs.length !== 1 ? 'es' : ''}</span>}
                                    </div>
                                </div>
                                <button className="calview-modal-close" aria-label="Cerrar" onClick={() => setShowAllRequests(false)}>×</button>
                            </div>

                            <div className="calview-modal-content">
                                {/* Filtros */}
                                <div className="calview-filters-container">
                                    <input
                                        value={filterQuery}
                                        onChange={e => setFilterQuery(e.target.value)}
                                        placeholder="Buscar por solicitante, tipo o motivo..."
                                        className="calview-filter-input"
                                    />
                                    <div className="calview-filters-row">
                                        <select value={filterTipo} onChange={e => setFilterTipo(e.target.value)} className="calview-filter-select">
                                            <option value="">Todos los tipos</option>
                                            <option value="Intercambio">Intercambio</option>
                                            <option value="Solicitud">Solicitud</option>
                                            <option value="Solicitud de cobertura">Solicitud de cobertura</option>
                                            <option value="Cambio de turno">Cambio de turno</option>
                                            <option value="Permiso">Solicitudes de Permiso</option>
                                            <option value="Renuncia">Renuncia</option>
                                        </select>
                                        <select value={filterEstado} onChange={e => setFilterEstado(e.target.value)} className="calview-filter-select">
                                            <option value="">Todos los estados</option>
                                            <option value="Pendiente">Pendiente</option>
                                            <option value="Aprobada">Aprobada</option>
                                            <option value="Rechazado">Rechazado</option>
                                        </select>
                                        <button onClick={() => { setFilterQuery(''); setFilterTipo(''); setFilterEstado('') }} className="calview-filter-clear">
                                            Limpiar filtros
                                        </button>
                                    </div>
                                </div>

                                {/* Lista de solicitudes */}
                                <div className="calview-requests-list">
                                    {filteredReqs.length === 0 && (
                                        <div className="calview-empty-state">
                                            <div className="calview-empty-icon" aria-hidden="true" />
                                            <div className="calview-empty-title">No hay solicitudes</div>
                                            <div className="calview-empty-subtitle">No se encontraron solicitudes para este día con los filtros seleccionados.</div>
                                        </div>
                                    )}

                                    {filteredReqs.map((r, idx) => {
                                        const isExpanded = expandedId === r.id
                                        const nombreSolicitante = r.solicitante?.nombre || 'Desconocido'

                                        return (
                                            <article key={idx} className={`calview-request-card ${isExpanded ? 'expanded' : ''}`}>
                                                <div className="calview-request-main">
                                                    <div className="calview-request-user">
                                                        <div className="calview-request-avatar">{getInitials(nombreSolicitante)}</div>
                                                        <div className="calview-request-user-info">
                                                            <div className="calview-request-name">{nombreSolicitante}</div>
                                                            <div className="calview-request-meta">
                                                                <span className="calview-request-id">#{r.id}</span>
                                                                <span className="calview-meta-separator">·</span>
                                                                <span className="calview-request-type">{r.tipo}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="calview-request-status">
                                                        <span className={`calview-status-badge status-${r.estado.toLowerCase()}`}>
                                                            {r.estado}
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className="calview-request-content">
                                                    {r.motivo && (
                                                        <div className="calview-request-motivo">
                                                            <span className="calview-motivo-label">Motivo:</span>
                                                            <span className="calview-motivo-text">{renderMotivoContent(r.motivo).motivoUsuario}</span>
                                                        </div>
                                                    )}
                                                    <div className="calview-request-date">
                                                        <span className="calview-date-icon" aria-hidden="true" />
                                                        <span>{formatDisplayDate(r.fecha_objetivo || r.fecha || r.date) || 'Fecha no disponible'}</span>
                                                    </div>
                                                </div>

                                                <div className="calview-request-footer">
                                                    <button
                                                        className={`calview-btn-detail ${isExpanded ? 'active' : ''}`}
                                                        onClick={() => setExpandedId(expandedId === r.id ? null : r.id)}
                                                    >
                                                        {isExpanded ? '▲ Ocultar detalles' : '▼ Ver detalles'}
                                                    </button>

                                                    {r.estado === 'Pendiente' && (
                                                        <div className="calview-request-actions">
                                                            <button className="calview-btn-accept" onClick={() => updateRequestState(r.id, 'Aprobada')}>
                                                                Aceptar
                                                            </button>
                                                            <button className="calview-btn-reject" onClick={() => updateRequestState(r.id, 'Rechazado')}>
                                                                Rechazar
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Detalles expandidos */}
                                                {isExpanded && (
                                                    <div className="calview-request-expanded">

                                                        {r.tipo === 'Permiso' ? (
                                                            // DISEÑO ESPECÍFICO PARA PERMISO
                                                            <div className="calview-turnos-grid">
                                                                <div className="calview-turno-box">
                                                                    <div className="calview-turno-label">Periodo de Permiso</div>
                                                                    <div className="calview-turno-details">
                                                                        <div><span className="calview-turno-field">Inicio:</span> {formatDisplayDate(r.fechaInicioPermiso) || 'N/A'}</div>
                                                                        <div><span className="calview-turno-field">Término:</span> {formatDisplayDate(r.fechaTerminoPermiso) || 'N/A'}</div>
                                                                        {/* Usamos r.tipoAutorizacion, que es donde viene el subtipo (Feriado, Licencia, etc.) */}
                                                                        <div style={{ marginTop: '10px' }}><span className="calview-turno-field">Tipo:</span> {r.tipoAutorizacion || r.tipo}</div>
                                                                        <div style={{ marginTop: '5px' }}><span className="calview-turno-field">Solicitante:</span> {nombreSolicitante}</div>
                                                                    </div>
                                                                </div>
                                                                <div className="calview-turno-box calview-turno-afectado-summary">
                                                                    <div className="calview-turno-label">Turnos Afectados ({renderMotivoContent(r.motivo).turnosSerializados ? 'Sí' : 'No'})</div>
                                                                    {renderMotivoContent(r.motivo).turnosSerializados ? (
                                                                        <pre className="calview-turnos-list-pre" style={{ maxHeight: '120px', overflowY: 'auto' }}>
                                                                            {renderMotivoContent(r.motivo).turnosSerializados}
                                                                        </pre>
                                                                    ) : (
                                                                        <div className="calview-turno-empty">No se encontraron turnos serializados.</div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        ) : r.tipo === 'Botar turno' ? (
                                                            // DISEÑO ESPECÍFICO PARA BOTAR TURNO
                                                            <div className="calview-turnos-grid">
                                                                <div className="calview-turno-box">
                                                                    <div className="calview-turno-label">Turno a Botar</div>
                                                                    {r.turno_origen ? (
                                                                        <div className="calview-turno-details">
                                                                            <div><span className="calview-turno-field">Solicitante:</span> {nombreSolicitante}</div>
                                                                            <div><span className="calview-turno-field">Sección:</span> {r.turno_origen.seccion}</div>
                                                                            <div><span className="calview-turno-field">Fecha Turno:</span> {formatDisplayDate(r.turno_origen.fecha) || r.turno_origen.fecha}</div>
                                                                            <div><span className="calview-turno-field">Horario:</span> {r.turno_origen.hora_inicio} - {r.turno_origen.hora_fin}</div>
                                                                            <div><span className="calview-turno-field">Tipo:</span> {r.turno_origen.tipoTurno}</div>
                                                                            {r.tipoAutorizacion && (
                                                                                <div style={{ marginTop: '10px' }}><span className="calview-turno-field">Tipo de Autorización:</span> {r.tipoAutorizacion}</div>
                                                                            )}
                                                                        </div>
                                                                    ) : (
                                                                        <div className="calview-turno-empty">No se encontró información del turno a botar.</div>
                                                                    )}
                                                                </div>
                                                                <div className="calview-turno-box">
                                                                    <div className="calview-turno-label">Información Adicional</div>
                                                                    <div className="calview-turno-details">
                                                                        <div><span className="calview-turno-field">Estado del Turno:</span> Se liberará al aprobar</div>
                                                                        <div><span className="calview-turno-field">Disponible para:</span> Cualquier médico</div>
                                                                        {r.fechaInicioPermiso && (
                                                                            <div style={{ marginTop: '10px' }}><span className="calview-turno-field">Periodo Afectado:</span> {formatDisplayDate(r.fechaInicioPermiso)} - {formatDisplayDate(r.fechaTerminoPermiso)}</div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            // DISEÑO PARA INTERCAMBIO, COBERTURA, ETC.
                                                            <div className="calview-turnos-grid">
                                                                {/* Turno Origen */}
                                                                <div className="calview-turno-box">
                                                                    <div className="calview-turno-label">Turno origen</div>
                                                                    {r.turno_origen ? (
                                                                        <div className="calview-turno-details">
                                                                            <div><span className="calview-turno-field">Solicitante:</span> {nombreSolicitante}</div>
                                                                            <div><span className="calview-turno-field">Sección:</span> {r.turno_origen.seccion}</div>
                                                                            <div><span className="calview-turno-field">Fecha:</span> {formatDisplayDate(r.turno_origen.fecha) || r.turno_origen.fecha}</div>
                                                                            <div><span className="calview-turno-field">Horario:</span> {r.turno_origen.hora_inicio} - {r.turno_origen.hora_fin}</div>
                                                                            <div><span className="calview-turno-field">Tipo:</span> {r.turno_origen.tipoTurno}</div>
                                                                        </div>
                                                                    ) : (<div className="calview-turno-empty">No aplica</div>)}
                                                                </div>
                                                                {/* Turno Destino */}
                                                                <div className="calview-turno-box">
                                                                    <div className="calview-turno-label">Turno destino</div>
                                                                    {r.turno_destino ? (
                                                                        <div className="calview-turno-details">
                                                                            <div><span className="calview-turno-field">Receptor:</span> {r.receptor?.nombre || 'Colega/No asignado'}</div>
                                                                            <div><span className="calview-turno-field">Sección:</span> {r.turno_destino.seccion}</div>
                                                                            <div><span className="calview-turno-field">Fecha:</span> {formatDisplayDate(r.turno_destino.fecha) || r.turno_destino.fecha}</div>
                                                                            <div><span className="calview-turno-field">Horario:</span> {r.turno_destino.hora_inicio} - {r.turno_destino.hora_fin}</div>
                                                                            <div><span className="calview-turno-field">Tipo:</span> {r.turno_destino.tipoTurno}</div>
                                                                        </div>
                                                                    ) : (<div className="calview-turno-empty">No aplica</div>)}
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* MUESTRA EL MOTIVO DE COMENTARIO BAJO LA INFORMACIÓN DE LOS TURNOS */}
                                                        {r.motivo && (
                                                            <div className="calview-motivo-section">
                                                                <div className="calview-motivo-title">Motivo / Comentario</div>
                                                                <div className="calview-motivo-content">{renderMotivoContent(r.motivo).motivoUsuario}</div>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </article>
                                        )
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
                {/* Modal: detalle de médico (abierto desde tarjetas de asignación) */}
                {showDoctorModal && (
                    <div className="calview-modal-overlay" role="dialog" aria-modal="true">
                        <div className="calview-modal-container calview-doctor-modal">
                            <div className="calview-modal-header">
                                <div>
                                    <h3 className="calview-modal-title">Detalle del médico</h3>
                                    <div className="calview-modal-subtitle">Información del profesional</div>
                                </div>
                                <button className="calview-modal-close" aria-label="Cerrar" onClick={() => { setShowDoctorModal(false); setDoctorDetail(null); }}>×</button>
                            </div>
                            <div className="calview-modal-content">
                                {doctorLoading ? (
                                    <div className="calview-loading">Cargando...</div>
                                ) : (
                                    <div className="calview-doctor-detail">
                                        {doctorDetail && doctorDetail.__error ? (
                                            <div className="calview-doctor-error">{doctorDetail.__error}</div>
                                        ) : (
                                            <DoctorDetail doctor={doctorDetail} />
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Modal: Alterar Horario desde calendario */}
                {alterarHorarioDoctor && (
                    <AlterarHorarioModal
                        isOpen={true}
                        onClose={async () => {
                            setAlterarHorarioDoctor(null);
                            // Recargar el día específico y el calendario completo
                            await recargarDiaSeleccionado(selected);
                            await loadCalendarData();
                        }}
                        onSuccess={async () => {
                            // Callback cuando se altera un turno exitosamente
                            // Recargar el día seleccionado y el calendario completo para ver cambios inmediatos
                            await recargarDiaSeleccionado(alterarHorarioDoctor.fecha);
                            await loadCalendarData();
                        }}
                        doctorId={alterarHorarioDoctor.id}
                        doctorNombre={alterarHorarioDoctor.nombre}
                        fechaSeleccionada={alterarHorarioDoctor.fecha}
                    />
                )}

                {/* Modal: Asignar Turno Sin Asignar */}
                {asignarTurnoModal && (
                    <AsignarTurnoModal
                        isOpen={true}
                        onClose={() => setAsignarTurnoModal(null)}
                        turno={asignarTurnoModal.turno}
                        fechaSeleccionada={asignarTurnoModal.fecha}
                        onSuccess={async () => {
                            // Limpiar caché de turnos sin asignar para este día
                            setTurnosSinAsignar(prev => {
                                const copy = { ...prev }
                                delete copy[asignarTurnoModal.fecha]
                                return copy
                            })
                            // Recargar el día y el calendario
                            await recargarDiaSeleccionado(asignarTurnoModal.fecha);
                            await loadCalendarData();
                        }}
                    />
                )}
            </div>
        </div>
    )
}
