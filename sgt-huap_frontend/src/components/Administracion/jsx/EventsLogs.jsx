import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import '../css/EventsLogs.css'
import { eventosService, usuariosService } from '../../../services/adminService'
import { FileText, CheckCircle, XCircle, Trash2, RefreshCw, Ban, Handshake, ThumbsDown, Clock, Minus, Clipboard } from 'lucide-react'

export default function EventsLogs() {
    const [events, setEvents] = useState([])
    const [filteredEvents, setFilteredEvents] = useState([])
    const [selectedUser, setSelectedUser] = useState('')
    const [selectedEventType, setSelectedEventType] = useState('')
    const [users, setUsers] = useState([])
    const navigate = useNavigate()

    // Tipos de eventos disponibles (coinciden con los tipos registrados en backend)
    const eventTypes = [
        { value: '', label: 'Todos los eventos' },
        { value: 'SOLICITUD_CREADA', label: 'Solicitud creada', icon: FileText },
        { value: 'SOLICITUD_ACEPTADA', label: 'Solicitud aceptada', icon: CheckCircle },
        { value: 'SOLICITUD_RECHAZADA', label: 'Solicitud rechazada', icon: XCircle },
        { value: 'SOLICITUD_ELIMINADA', label: 'Solicitud eliminada', icon: Trash2 },
        { value: 'INTERCAMBIO_ACEPTADO', label: 'Intercambio aceptado', icon: RefreshCw },
        { value: 'INTERCAMBIO_RECHAZADO', label: 'Intercambio rechazado', icon: Ban },
        { value: 'OFERTA_ACEPTADA', label: 'Oferta aceptada', icon: Handshake },
        { value: 'OFERTA_RECHAZADA', label: 'Oferta rechazada', icon: ThumbsDown },
        { value: 'REASIGNACION', label: 'Turno reasignado', icon: RefreshCw },
        { value: 'MODIFICACION_HORARIO', label: 'Horario modificado', icon: Clock },
        { value: 'DESASIGNACION', label: 'Turno desasignado', icon: Minus }
    ]

    // Cargar eventos al montar el componente
    useEffect(() => {
        loadEvents()
        loadUsers()
    }, [])

    // Escuchar eventos globales para recargar la bitácora en tiempo real
    useEffect(() => {
        const handler = (e) => {
            try {
                // Recargar la lista de eventos cuando se detecte una modificación relevante
                loadEvents().catch(err => console.warn('EventsLogs: error recargando tras evento global', err))
            } catch (err) {
                console.warn('EventsLogs: handler error', err)
            }
        }

        if (typeof window !== 'undefined' && window.addEventListener) {
            window.addEventListener('solicitud:updated', handler)
            window.addEventListener('medico:updated', handler)
        }

        return () => {
            if (typeof window !== 'undefined' && window.removeEventListener) {
                window.removeEventListener('solicitud:updated', handler)
                window.removeEventListener('medico:updated', handler)
            }
        }
    }, [])

    // Aplicar filtros cuando cambian los valores
    useEffect(() => {
        applyFilters()
    }, [selectedUser, selectedEventType, events])

    const loadEvents = async () => {
        try {
            const data = await eventosService.getAll()
            
            //Ordenamos primero por fechaEvento (más reciente primero)
            const sortedData = (data || []).sort((a, b) => new Date(b.fechaEvento) - new Date(a.fechaEvento));

            // Mapear respuesta del backend a la forma que espera la UI
            const mapped = sortedData.map(e => ({
                id: e.idEvento,
                tipo: e.tipoEvento,
                descripcion: e.descripcion,
                fecha: e.fechaEvento ? new Date(e.fechaEvento).toLocaleString() : '',
                usuario: e.usuario ? `${e.usuario.nombre || ''} ${e.usuario.apel_pat || e.usuario.apellidoPaterno || ''}`.trim() : 'Sistema',
                usuarioId: e.usuario ? (e.usuario.idPersonal || e.usuario.id) : null,
                detalle: buildDetalle(e)
            }))
            
            setEvents(mapped)
            setFilteredEvents(mapped) 
        } catch (error) {
            console.error('Error al cargar eventos:', error)
            setEvents([])
            setFilteredEvents([])
        }
    }

    const loadUsers = async () => {
        try {
            const data = await usuariosService.getAll()
            // Mapear a { id, nombre }
            const mapped = (data || []).map(u => ({ id: u.idPersonal || u.id, nombre: `${u.nombre || ''} ${u.apel_pat || u.apellidoPaterno || ''}`.trim() }))
            setUsers(mapped)
        } catch (error) {
            console.error('Error al cargar usuarios:', error)
            setUsers([])
        }
    }

    function buildDetalle(e) {
        const parts = []
        if (e.estadoAnterior) parts.push(`Estado anterior: ${e.estadoAnterior}`)
        if (e.estadoNuevo) parts.push(`Estado nuevo: ${e.estadoNuevo}`)
        if (e.motivo) parts.push(`Motivo: ${e.motivo}`)
        if (e.observaciones) parts.push(`Observaciones: ${e.observaciones}`)
        if (e.fechaInicioAfectada) parts.push(`Inicio afectado: ${e.fechaInicioAfectada}`)
        if (e.fechaFinAfectada) parts.push(`Fin afectado: ${e.fechaFinAfectada}`)
        return parts.join(' · ')
    }

    const applyFilters = () => {
        let filtered = [...events] // Coge la lista ya ordenada

        // Filtrar por usuario (por nombre)
        if (selectedUser) {
            // Se filtra por el nombre ya que 'selectedUser' contiene el nombre (ver renderizado)
            // Se puede mejorar si el select guarda el ID en lugar del nombre.
            filtered = filtered.filter(event => event.usuario.includes(selectedUser))
        }

        // Filtrar por tipo de evento
        if (selectedEventType) {
            filtered = filtered.filter(event => event.tipo === selectedEventType)
        }

        setFilteredEvents(filtered)
    }

    const getEventTypeLabel = (tipo) => {
        const eventType = eventTypes.find(et => et.value === tipo)
        return eventType ? eventType.label : tipo
    }

    const getEventTypeIcon = (tipo) => {
        const eventType = eventTypes.find(et => et.value === tipo)
        const IconComponent = eventType ? eventType.icon : Clipboard
        return <IconComponent size={16} />
    }

    const clearFilters = () => {
        setSelectedUser('')
        setSelectedEventType('')
    }

    return (
        <div className="events-logs-container">
            <div className="events-logs-header">
                <h2>Bitácora de eventos</h2>
                <p className="events-logs-description">
                    Visualiza y filtra los eventos del sistema
                </p>
            </div>

            <div className="events-logs-navigation">
                <button
                    onClick={() => navigate('/administracion')}
                    className="back-to-admin-btn"
                    title="Volver al panel de administración"
                >
                    ← Volver al panel
                </button>
            </div>

            {/* Filtros */}
            <div className="events-filters">
                <div className="filter-group">
                    <label htmlFor="user-filter">Usuario involucrado:</label>
                    <select
                        id="user-filter"
                        value={selectedUser}
                        onChange={(e) => setSelectedUser(e.target.value)}
                        className="filter-select"
                    >
                        <option value="">Todos los usuarios</option>
                        {users.map((user) => (
                            <option key={user.id} value={user.nombre}>
                                {user.nombre}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="filter-group">
                    <label htmlFor="event-type-filter">Tipo de evento:</label>
                    <select
                        id="event-type-filter"
                        value={selectedEventType}
                        onChange={(e) => setSelectedEventType(e.target.value)}
                        className="filter-select"
                    >
                        {eventTypes.map((type) => (
                            <option key={type.value} value={type.value}>
                                {type.label}
                            </option>
                        ))}
                    </select>
                </div>

                {(selectedUser || selectedEventType) && (
                    <button
                        onClick={clearFilters}
                        className="clear-filters-btn"
                        title="Limpiar filtros"
                    >
                        Limpiar filtros
                    </button>
                )}
            </div>

            {/* Lista de eventos */}
            <div className="events-list">
                {filteredEvents.length === 0 ? (
                    <div className="no-events-message">
                        <p>No se encontraron eventos con los filtros seleccionados.</p>
                    </div>
                ) : (
                    <div className="events-table">
                        {filteredEvents.map((event, index) => (
                            <div
                                key={event.id}
                                className={`event-row ${index % 2 === 0 ? 'even' : 'odd'}`}
                            >
                                <div className="event-main-info">
                                    <div className="event-header-row">
                                        <span className="event-user">{event.usuario}</span>
                                        <span className="event-date">{event.fecha}</span>
                                    </div>
                                    <div className="event-type-badge">
                                        <span className="event-icon">{getEventTypeIcon(event.tipo)}</span>
                                        {getEventTypeLabel(event.tipo)}
                                    </div>
                                    <div className="event-description">
                                        {event.descripcion}
                                    </div>
                                    {event.detalle && (
                                        <div className="event-detail">
                                            {event.detalle}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="events-footer">
                <p className="events-count">
                    Mostrando {filteredEvents.length} de {events.length} eventos
                </p>
            </div>
        </div>
    )
}
