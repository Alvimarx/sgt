import '../css/CalendarView.css'
import { useState, useEffect } from 'react'
import { formatDisplayDate } from '../../../utils/dateUtils'
import adminService from '../../../services/adminService.js'
import { useAuth } from '../../../context/AuthContext.jsx'

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

// Función helper para calcular días de duración del permiso
const calcularDuracionPermiso = (fechaInicio, fechaFin) => {
    if (!fechaInicio || !fechaFin) return null;

    try {
        const inicio = new Date(fechaInicio);
        const fin = new Date(fechaFin);
        const diffTime = Math.abs(fin - inicio);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 porque incluye el día de inicio

        if (diffDays === 1) return '1 día';
        return `${diffDays} días`;
    } catch (error) {
        return null;
    }
};


export default function ShiftRequests({ initialTipo = '', excludePermisos = false }) {
    const { user } = useAuth()
    const servicioId = user?.servicioId || user?.id_servicio || 722

    console.log('Debug - User:', user)
    console.log('Debug - Servicio ID:', servicioId)
    console.log('Debug - User servicioId:', user?.servicioId)
    console.log('Debug - User id_servicio:', user?.id_servicio)

    const [solicitudesData, setSolicitudesData] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    // Estados de filtros
    const [filterQuery, setFilterQuery] = useState('')
    const [filterTipo, setFilterTipo] = useState(initialTipo || '')
    const [filterEstado, setFilterEstado] = useState('')

    // Estado para expandir detalles
    const [expandedId, setExpandedId] = useState(null)

    // Cargar solicitudes al montar el componente
    useEffect(() => {
        const loadSolicitudes = async () => {
            setLoading(true)
            setError(null)
            try {
                let solicitudes = await adminService.solicitudes.getByServicio(servicioId)

                // Si no hay solicitudes para el servicio, intentar cargar todas (para debugging)
                if (!solicitudes || solicitudes.length === 0) {
                    console.log('No hay solicitudes para el servicio', servicioId, '- intentando cargar todas')
                    solicitudes = await adminService.solicitudes.getAll()
                }

                // Normalizar solicitudes del backend al formato UI
                const solicitudesNormalizadas = (solicitudes || []).map(s => {
                    const normalized = adminService.normalizeSolicitud(s)
                    if (!normalized) {
                        console.warn('No se pudo normalizar solicitud:', s)
                    }
                    return normalized
                }).filter(Boolean) // Filtrar nulls

                console.log(`Cargadas ${solicitudes?.length || 0} solicitudes, normalizadas ${solicitudesNormalizadas.length}`)

                setSolicitudesData(solicitudesNormalizadas)
            } catch (err) {
                console.error('Error al cargar solicitudes:', err)
                setError('No se pudieron cargar las solicitudes')
                setSolicitudesData([])
            } finally {
                setLoading(false)
            }
        }

        loadSolicitudes()
    }, [servicioId])

    // Función helper para determinar si un tipo es de permiso
    const isTipoPermiso = (tipo) => {
        const tiposPermiso = ['Permiso', 'Motivos personales', 'Licencia médica', 'Feriado legal', 'Permiso administrativo'];
        return tiposPermiso.includes(tipo);
    };

    // Aplicar filtros
    const filteredReqs = solicitudesData.filter(r => {
        if (filterTipo) {
            if (filterTipo === 'Permiso') {
                // Para "Permiso", incluir todos los tipos de permiso
                if (!isTipoPermiso(r.tipo)) return false;
            } else if (r.tipo !== filterTipo) {
                return false;
            }
        }

        // Si excludePermisos está activo, filtrar los que sean de tipo permiso
        if (excludePermisos && isTipoPermiso(r.tipo)) {
            return false;
        }

        // Ocultar "Cambio de turno" pendientes hasta que el receptor acepte
        // Esto se detecta por el campo estadoReceptor o receptor_aceptado
        if (r.tipo === 'Cambio de turno' && r.estado === 'Pendiente') {
            // Solo mostrar si el receptor ya aceptó (estadoReceptor === 'Aceptado')
            const receptorAcepto = r.estadoReceptor === 'Aceptado' ||
                r.receptor_aceptado === true ||
                r.receptorAceptado === true;
            if (!receptorAcepto) {
                return false;
            }
        }

        if (filterEstado && r.estado !== filterEstado) return false
        if (filterQuery) {
            const q = filterQuery.toLowerCase()
            if (!(
                String(r.motivo || '').toLowerCase().includes(q) ||
                String(r.tipo || '').toLowerCase().includes(q) ||
                String(r.id || '').toLowerCase().includes(q) ||
                String(r.solicitante?.nombre || '').toLowerCase().includes(q)
            )) return false
        }
        return true
    })

    // Debug logging
    console.log('Debug - Total solicitudes:', solicitudesData.length, 'Filtradas:', filteredReqs.length)
    console.log('Debug - Filtros activos:', { filterTipo, filterEstado, filterQuery })

    // Actualizar estado de una solicitud
    const updateRequestState = async (id, newState) => {
        // Normalizar a lo que espera el backend
        const payloadState = newState === 'Aprobada' ? 'Aprobado' : newState === 'Rechazado' ? 'Rechazado' : newState
        try {
            await adminService.solicitudes.updateEstado(id, payloadState)
            // Actualizar estado local tras éxito
            setSolicitudesData(prev => prev.map(item =>
                item.id === id ? { ...item, estado: payloadState } : item
            ))
        } catch (err) {
            console.error('Error al actualizar solicitud:', err)
            alert('No se pudo actualizar la solicitud en el servidor.')
        }
    }

    // Función para obtener iniciales de nombre
    const getInitials = (name) => {
        if (!name) return '??'
        const parts = name.trim().split(/\s+/)
        if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase()
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    }

    if (loading) {
        return (
            <div className="calview-empty-state">
                <div className="calview-empty-title">Cargando solicitudes...</div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="calview-empty-state">
                <div className="calview-empty-icon" aria-hidden="true">⚠️</div>
                <div className="calview-empty-title">Error al cargar</div>
                <div className="calview-empty-subtitle">{error}</div>
            </div>
        )
    }

    return (
        <div className="shift-requests-container">
            {/* Filtros */}
            <div className="calview-filters-container">
                <input
                    value={filterQuery}
                    onChange={e => setFilterQuery(e.target.value)}
                    placeholder="Buscar por solicitante, tipo o motivo..."
                    className="calview-filter-input"
                />
                <div className="calview-filters-row">
                    <select
                        value={filterTipo}
                        onChange={e => setFilterTipo(e.target.value)}
                        className="calview-filter-select"
                    >
                        <option value="">Todos los tipos</option>
                        <option value="Intercambio">Intercambio</option>
                        <option value="Solicitud">Solicitud</option>
                        <option value="Solicitud de cobertura">Solicitud de cobertura</option>
                        <option value="Cambio de turno">Cambio de turno</option>
                        <option value="Oferta de turno">Oferta de turno</option>
                        {!excludePermisos && <option value="Permiso">Solicitudes de Permiso</option>}
                        <option value="Botar turno">Botar turno</option>
                        <option value="Renuncia">Renuncia</option>
                    </select>
                    <select
                        value={filterEstado}
                        onChange={e => setFilterEstado(e.target.value)}
                        className="calview-filter-select"
                    >
                        <option value="">Todos los estados</option>
                        <option value="Pendiente">Pendiente</option>
                        <option value="Aprobada">Aprobada</option>
                        <option value="Rechazado">Rechazado</option>
                    </select>
                    <button
                        onClick={() => { setFilterQuery(''); setFilterTipo(''); setFilterEstado('') }}
                        className="calview-filter-clear"
                        title="Limpiar todos los filtros"
                    >
                        Limpiar filtros
                    </button>
                </div>
            </div>

            {/* Contador de resultados */}
            {solicitudesData.length > 0 && (
                <div className="calview-modal-subtitle" style={{ marginBottom: '1rem', color: '#6b7280' }}>
                    Mostrando {filteredReqs.length} de {solicitudesData.length} solicitudes
                </div>
            )}

            {/* Lista de solicitudes */}
            <div className="calview-requests-list">
                {filteredReqs.length === 0 && (
                    <div className="calview-empty-state">
                        <div className="calview-empty-icon" aria-hidden="true">📋</div>
                        <div className="calview-empty-title">No hay solicitudes</div>
                        <div className="calview-empty-subtitle">
                            {solicitudesData.length === 0
                                ? 'No se encontraron solicitudes para este servicio.'
                                : 'No se encontraron solicitudes con los filtros seleccionados.'}
                        </div>
                    </div>
                )}

                {filteredReqs.map((r) => {
                    const isExpanded = expandedId === r.id
                    const nombreSolicitante = r.solicitante?.nombre || 'Desconocido'

                    // Debug: verificar que la solicitud tenga los campos necesarios
                    if (!r.id || !r.tipo) {
                        console.warn('Solicitud inválida:', r)
                        return null
                    }

                    // Llama al helper para extraer los turnos serializados
                    const { turnosSerializados, motivoUsuario } = renderMotivoContent(r.motivo);

                    // Usamos las propiedades que deberian venir de la normalización
                    const fechaInicioPermiso = r.fechaInicioPermiso || r.fecha_inicio_permiso;
                    const fechaTerminoPermiso = r.fechaTerminoPermiso || r.fecha_termino_permiso;


                    return (
                        <article key={r.id} className={`calview-request-card ${isExpanded ? 'expanded' : ''}`}>
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
                                        <span className="calview-motivo-text">{motivoUsuario}</span>
                                    </div>
                                )}
                                <div className="calview-request-date">
                                    <span className="calview-date-icon" aria-hidden="true">📅</span>
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
                                        <button
                                            className="calview-btn-accept"
                                            onClick={() => {
                                                if (window.confirm('¿Estás seguro de que quieres aceptar esta solicitud?')) {
                                                    updateRequestState(r.id, 'Aprobada');
                                                }
                                            }}
                                            title="Aceptar solicitud de turno"
                                        >
                                            Aceptar
                                        </button>
                                        <button
                                            className="calview-btn-reject"
                                            onClick={() => {
                                                if (window.confirm('¿Estás seguro de que quieres rechazar esta solicitud?')) {
                                                    updateRequestState(r.id, 'Rechazado');
                                                }
                                            }}
                                            title="Rechazar solicitud de turno"
                                        >
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
                                                <div className="calview-turno-label">Información del Permiso</div>
                                                <div className="calview-turno-details">
                                                    <div><span className="calview-turno-field">Tipo de Permiso:</span> {r.tipoAutorizacion || 'Permiso general'}</div>
                                                    <div><span className="calview-turno-field">Solicitante:</span> {nombreSolicitante}</div>
                                                    <div style={{ marginTop: '10px', padding: '8px', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
                                                        <div style={{ fontWeight: 'bold', color: '#374151', marginBottom: '4px' }}>Periodo del Permiso</div>
                                                        <div><span className="calview-turno-field">Desde:</span> {formatDisplayDate(fechaInicioPermiso) || 'N/A'}</div>
                                                        <div><span className="calview-turno-field">Hasta:</span> {formatDisplayDate(fechaTerminoPermiso) || 'N/A'}</div>
                                                        {calcularDuracionPermiso(fechaInicioPermiso, fechaTerminoPermiso) && (
                                                            <div style={{ marginTop: '4px', fontSize: '0.9em', color: '#6b7280' }}>
                                                                <span className="calview-turno-field">Duración:</span> {calcularDuracionPermiso(fechaInicioPermiso, fechaTerminoPermiso)}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="calview-turno-box">
                                                <div className="calview-turno-label">Turnos Afectados</div>
                                                <div className="calview-turno-details">
                                                    {turnosSerializados ? (
                                                        <div style={{ maxHeight: '150px', overflowY: 'auto', backgroundColor: '#f8f9fa', padding: '8px', borderRadius: '4px', fontSize: '0.9em' }}>
                                                            <div style={{ fontWeight: 'bold', color: '#374151', marginBottom: '8px' }}>Turnos que serán afectados:</div>
                                                            <div style={{ whiteSpace: 'pre-line', lineHeight: '1.4' }}>
                                                                {turnosSerializados}
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="calview-turno-empty" style={{ padding: '16px', textAlign: 'center', color: '#6b7280' }}>
                                                            <div>📋 No hay turnos específicos afectados</div>
                                                            <div style={{ fontSize: '0.8em', marginTop: '4px' }}>El permiso cubre el periodo completo</div>
                                                        </div>
                                                    )}
                                                </div>
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
                                    ) : r.tipo === 'Oferta de turno' ? (
                                        // DISEÑO ESPECÍFICO PARA OFERTA DE TURNO
                                        <div className="calview-turnos-grid">
                                            <div className="calview-turno-box">
                                                <div className="calview-turno-label">Turno Ofrecido</div>
                                                {r.turno_origen ? (
                                                    <div className="calview-turno-details">
                                                        <div><span className="calview-turno-field">Solicitante:</span> {nombreSolicitante}</div>
                                                        <div><span className="calview-turno-field">Sección:</span> {r.turno_origen.seccion}</div>
                                                        <div><span className="calview-turno-field">Fecha Turno:</span> {formatDisplayDate(r.turno_origen.fecha) || r.turno_origen.fecha}</div>
                                                        <div><span className="calview-turno-field">Horario:</span> {r.turno_origen.hora_inicio} - {r.turno_origen.hora_fin}</div>
                                                        <div><span className="calview-turno-field">Tipo:</span> {r.turno_origen.tipoTurno}</div>
                                                    </div>
                                                ) : (
                                                    <div className="calview-turno-empty">No se encontró información del turno ofrecido.</div>
                                                )}
                                            </div>
                                            <div className="calview-turno-box">
                                                <div className="calview-turno-label">Destinatario de la Oferta</div>
                                                {r.receptor ? (
                                                    <div className="calview-turno-details">
                                                        <div><span className="calview-turno-field">Médico Receptor:</span> {r.receptor.nombre}</div>
                                                        <div><span className="calview-turno-field">Estado:</span> {r.estado}</div>
                                                        <div style={{ marginTop: '10px' }}><span className="calview-turno-field">Acción requerida:</span> El receptor debe aceptar la oferta</div>
                                                    </div>
                                                ) : (
                                                    <div className="calview-turno-empty">Oferta enviada a múltiples médicos</div>
                                                )}
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
                                                        <div><span className="calview-turno-field">Fecha Turno:</span> {formatDisplayDate(r.turno_origen.fecha) || r.turno_origen.fecha}</div>
                                                        <div><span className="calview-turno-field">Horario:</span> {r.turno_origen.hora_inicio} - {r.turno_origen.hora_fin}</div>
                                                        <div><span className="calview-turno-field">Tipo:</span> {r.turno_origen.tipoTurno}</div>
                                                    </div>
                                                ) : (
                                                    <div className="calview-turno-empty">No aplica</div>
                                                )}
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
                                                ) : (
                                                    <div className="calview-turno-empty">No aplica</div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* MUESTRA EL MOTIVO DE COMENTARIO BAJO LA INFORMACIÓN DE LOS TURNOS */}
                                    {r.tipo === 'Permiso' && r.motivo && renderMotivoContent(r.motivo).motivoUsuario && (
                                        <div className="calview-motivo-section" style={{ marginTop: '16px', padding: '12px', backgroundColor: '#f0f9ff', borderRadius: '6px', border: '1px solid #e0f2fe' }}>
                                            <div className="calview-motivo-title" style={{ fontWeight: 'bold', color: '#0369a1', marginBottom: '8px' }}>Justificación del Permiso</div>
                                            <div className="calview-motivo-content" style={{ color: '#374151', lineHeight: '1.5' }}>{renderMotivoContent(r.motivo).motivoUsuario}</div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </article>
                    )
                })}
            </div>
        </div>
    )
}