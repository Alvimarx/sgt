// Componente: DoctorDetail
// Descripción: Muestra información detallada de un médico con diseño moderno
import React, { useState, useEffect } from 'react'
import '../css/DoctorDetail.css'
import adminService from '../../../services/adminService'
import { mapDisplayToBackend, mapRoleToDisplay } from '../../../constants/roles'
import { useAuth, Roles } from '../../../context/AuthContext'
import AlterarHorarioModal from './AlterarHorarioModal'

export default function DoctorDetail({ doctor }) {
  if (!doctor) return null
  // Preferir valores normalizados, luego raw; soportar múltiples nombres de campo que devuelve el backend
  const raw = doctor.__raw || doctor

  const displayNombre = doctor.nombre || raw.nombre || raw.nombres || raw.firstName || ''
  const displayApellidos = doctor.apellidos || raw.apellidos || `${raw.apellidoPaterno || ''} ${raw.apellidoMaterno || ''}`.trim() || raw.lastName || ''

  // Estados para el historial de turnos
  const [showHistorial, setShowHistorial] = useState(false)
  const [turnosHistorial, setTurnosHistorial] = useState([])
  const [loadingHistorial, setLoadingHistorial] = useState(false)
  const [pisosMap, setPisosMap] = useState({}) // Mapa de ID -> Nombre de piso
  const [currentRole, setCurrentRole] = useState(mapRoleToDisplay(doctor.rol || raw.rol) || 'Médico')
  const [updatingRole, setUpdatingRole] = useState(false)
  const [roleUpdateMessage, setRoleUpdateMessage] = useState('')
  const [showConfirmSubrogancia, setShowConfirmSubrogancia] = useState(false)
  const [showAlterarHorario, setShowAlterarHorario] = useState(false)
  const { user } = useAuth() // Desestructuramos el usuario logueado

  // Estados para filtros
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())

  // Cargar turnos del médico cuando se abre el historial
  useEffect(() => {
    const loadTurnosHistorial = async () => {
      if (!showHistorial || !doctor.id) return
      try {
        setLoadingHistorial(true)

        // Cargar pisos si no están cargados (para mapear nombres)
        if (Object.keys(pisosMap).length === 0) {
          try {
            const pisos = await adminService.pisos.getAll()
            const map = {}
            if (Array.isArray(pisos)) {
              pisos.forEach(p => {
                if (p.id) map[p.id] = p.nombre
              })
              setPisosMap(map)
            }
          } catch (err) {
            console.warn('Error cargando pisos para historial:', err)
          }
        }

        const turnos = await adminService.turnos.getByMedico(doctor.id, selectedYear, selectedMonth)
        setTurnosHistorial(turnos || [])
      } catch (e) {
        console.warn('Error cargando historial de turnos:', e)
        setTurnosHistorial([])
      } finally {
        setLoadingHistorial(false)
      }
    }
    loadTurnosHistorial()
  }, [showHistorial, doctor.id, selectedYear, selectedMonth])

  // Calcular iniciales a partir del nombre y apellidos normalizados
  const getInitials = () => {
    const nombre = (displayNombre || '').trim()
    const apellidos = (displayApellidos || '').trim()
    const firstLetter = nombre ? nombre.charAt(0) : ''
    const secondLetter = apellidos ? apellidos.split(' ')[0].charAt(0) : ''
    return (firstLetter + secondLetter).toUpperCase() || 'M'
  }

  const servicio = doctor.servicio || raw.servicio || raw.department || '—'
  const fechaIngreso = doctor.fechaIngreso || raw.fechaIngreso || raw.dateAdded || '—'
  const especialidad = doctor.especialidad || raw.especialidad || raw.profesionNombre || '—'
  const tipoContrato = doctor.tipoContratoNombre || raw.tipoContratoNombre || '—'
  const esJefatura = doctor.jefatura || raw.jefatura || 0
  const esRRHH = doctor.rrhh || raw.rrhh || 0
  const tipoTurno = doctor.tipoCargoNombre || raw.tipoCargoNombre || doctor.tipoCargo || '—'

  return (
    <div className="doctor-detail-container">
      {/* Header con avatar e info principal */}
      <div className="doctor-detail-header">
        <div className="doctor-detail-avatar-section">
          <div className="doctor-detail-avatar">
            {getInitials()}
          </div>
          <div className="doctor-detail-main-info">
            <h3 className="doctor-detail-name">{displayNombre} {displayApellidos}</h3>
            <div className="doctor-detail-meta">
              <span className="doctor-detail-rut">RUT: {doctor.rut || raw.rut || raw.rutSinDv || ''}</span>
              {currentRole && currentRole !== '—' && (
                <>
                  <span className="doctor-meta-separator">·</span>
                  <span className={`doctor-detail-role-badge role-${(currentRole).toLowerCase().replace(/\s+/g, '-')}`}>
                    {currentRole}
                  </span>
                </>
              )}
              {(doctor.estado || raw.estado) && (doctor.estado || raw.estado) !== '—' && (
                <>
                  <span className="doctor-meta-separator">·</span>
                  <span className={`doctor-detail-status-badge status-${(doctor.estado || raw.estado).toLowerCase()}`}>
                    {doctor.estado || raw.estado}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Grid de información detallada */}
      <div className="doctor-detail-info-grid">
        <div className="doctor-detail-info-section">
          <h4 className="doctor-detail-section-title">Información profesional</h4>
          <div className="doctor-detail-info-cards">
            <div className="doctor-detail-info-card">
              <div className="doctor-detail-info-card-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </div>
              <div className="doctor-detail-info-card-content">
                <span className="doctor-detail-info-card-label">Especialidad</span>
                <span className="doctor-detail-info-card-value">{especialidad}</span>
              </div>
            </div>
            <div className="doctor-detail-info-card">
              <div className="doctor-detail-info-card-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div className="doctor-detail-info-card-content">
                <span className="doctor-detail-info-card-label">Servicio</span>
                <span className="doctor-detail-info-card-value">{servicio}</span>
              </div>
            </div>
            <div className="doctor-detail-info-card">
              <div className="doctor-detail-info-card-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12,6 12,12 16,14" />
                </svg>
              </div>
              <div className="doctor-detail-info-card-content">
                <span className="doctor-detail-info-card-label">Tipo de turno</span>
                <span className="doctor-detail-info-card-value">{tipoTurno}</span>
              </div>
            </div>
            <div className="doctor-detail-info-card">
              <div className="doctor-detail-info-card-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
              </div>
              <div className="doctor-detail-info-card-content">
                <span className="doctor-detail-info-card-label">Fecha de ingreso</span>
                <span className="doctor-detail-info-card-value">{fechaIngreso}</span>
              </div>
            </div>
            <div className="doctor-detail-info-card">
              <div className="doctor-detail-info-card-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                  <polyline points="14,2 14,8 20,8" />
                </svg>
              </div>
              <div className="doctor-detail-info-card-content">
                <span className="doctor-detail-info-card-label">Tipo de Contrato</span>
                <span className="doctor-detail-info-card-value">{tipoContrato}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="doctor-detail-info-section">
          <h4 className="doctor-detail-section-title">Permisos y roles</h4>
          <div className="doctor-detail-info-cards">
            <div className="doctor-detail-info-card">
              <div className="doctor-detail-info-card-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                  <circle cx="8.5" cy="7" r="4" />
                  <path d="M20 8v6M23 11h-6" />
                </svg>
              </div>
              <div className="doctor-detail-info-card-content">
                <span className="doctor-detail-info-card-label">Jefatura</span>
                <span className="doctor-detail-info-card-value">{esJefatura === 1 ? 'Sí' : 'No'}</span>
              </div>
            </div>
            <div className="doctor-detail-info-card">
              <div className="doctor-detail-info-card-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
                </svg>
              </div>
              <div className="doctor-detail-info-card-content">
                <span className="doctor-detail-info-card-label">Acceso RRHH</span>
                <span className="doctor-detail-info-card-value">{esRRHH === 1 ? 'Sí' : 'No'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Acciones */}
      <div className="doctor-detail-actions">
        <button className="doctor-detail-action-btn" onClick={() => setShowHistorial(!showHistorial)} title={showHistorial ? 'Ocultar historial de turnos' : 'Ver historial de turnos'}>
          <svg className="doctor-detail-action-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5.586a1 1 0 0 1 .707.293l5.414 5.414a1 1 0 0 1 .293.707V19a2 2 0 0 1-2 2z" />
          </svg>
          {showHistorial ? 'Ocultar Historial' : 'Ver Historial de Turnos'}
          {turnosHistorial.length > 0 && !showHistorial && (
            <span className="doctor-detail-turnos-count">({turnosHistorial.length})</span>
          )}
          {turnosHistorial.length > 0 && !showHistorial && (
            <span className="doctor-detail-turnos-indicator"></span>
          )}
        </button>

        <button
          className="doctor-detail-action-btn alterar-horario-btn"
          onClick={() => setShowAlterarHorario(true)}
          title="Gestionar turnos futuros"
        >
          <svg className="doctor-detail-action-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 6v6l4 2" />
          </svg>
          Alterar Horario
        </button>

        {/*RENDERIZAR EL BOTÓN SI EL USUARIO LOGUEADO ES LA JEFATURA PRINCIPAL */}
        {/* BOTÓN OCULTO - Subrogancia deshabilitada
        {user?.rol === Roles.JEFATURA && (
          <>
            <button
              className="doctor-detail-action-btn subrogancia-btn"
              disabled={updatingRole}
              onClick={() => setShowConfirmSubrogancia(true)}
              title={currentRole === 'Jefatura Subrogante' ? 'Quitar Subrogancia' : 'Dar Subrogancia'}
            >
              {updatingRole ? 'Actualizando...' : (currentRole === 'Jefatura Subrogante' ? 'Quitar Subrogancia' : 'Dar Subrogancia')}
            </button>
          </>
        )}
        */}
        {roleUpdateMessage && <div className="doctor-detail-roletoast">{roleUpdateMessage}</div>}
      </div>      {/* Confirmación modal para subrogancia - OCULTO */}
      {/* showConfirmSubrogancia && (
        <div className="admin-modal-overlay" onClick={() => setShowConfirmSubrogancia(false)}>
          <div className="admin-modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <div className="admin-modal-header">
              <h3>Confirmar acción</h3>
            </div>
            <div className="admin-modal-body">
              <p className="text-xs text-gray-500 mb-4">{currentRole === 'Jefatura Subrogante'
                ? `¿Está seguro que desea quitar la subrogancia a ${displayNombre} ${displayApellidos}?`
                : `¿Está seguro que desea otorgar la subrogancia a ${displayNombre} ${displayApellidos}?`}</p>
            </div>
            <div className="admin-modal-footer" style={{ display: 'flex', gap: '8px' }}>
              <button type="button" className="doctor-detail-action-btn" onClick={() => setShowConfirmSubrogancia(false)}>Cancelar</button>
              <button type="button" className="admin-modal-done-btn" onClick={async () => {
                setShowConfirmSubrogancia(false)
                try {
                  setUpdatingRole(true)
                  const currentDisplay = currentRole || mapRoleToDisplay(doctor.rol || doctor.__raw?.rol) || 'Médico'
                  const newRoleDisplay = currentDisplay === 'Jefatura Subrogante' ? 'Médico' : 'Jefatura Subrogante'
                  const backendRole = mapDisplayToBackend(newRoleDisplay)
                  const updated = await adminService.usuarios.update(doctor.id || doctor.userId || doctor.idUsuario, { rol: backendRole })
                  const displayRole = mapRoleToDisplay(updated.rol || backendRole)
                  try { window.dispatchEvent(new Event('medico:updated')) } catch (e) { }
                  setRoleUpdateMessage(`Rol actualizado a ${displayRole}`)
                  setCurrentRole(displayRole)
                  setTimeout(() => setRoleUpdateMessage(''), 3000)
                } catch (err) {
                  console.error('Error actualizando subrogancia', err)
                  setRoleUpdateMessage('Error actualizando rol')
                } finally {
                  setUpdatingRole(false)
                }
              }}>
                Confirmar
              </button>
            </div>
          </div>
        </div>
      ) */}

      {/* Historial de turnos */}
      {showHistorial && (
        <div className="doctor-detail-historial">
          <div className="doctor-detail-historial-header">
            <div className="doctor-detail-historial-title">
              <svg className="doctor-detail-historial-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 19v-6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2zm0 0V9a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v10m-6 0a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2m0 0V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2z" />
              </svg>
              <h4>Historial de Turnos</h4>
            </div>
            <div className="doctor-detail-historial-controls">
              <div className="doctor-detail-filter-group">
                <label className="doctor-detail-filter-label">Mes:</label>
                <select
                  className="doctor-detail-filter-select"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                >
                  <option value={1}>Enero</option>
                  <option value={2}>Febrero</option>
                  <option value={3}>Marzo</option>
                  <option value={4}>Abril</option>
                  <option value={5}>Mayo</option>
                  <option value={6}>Junio</option>
                  <option value={7}>Julio</option>
                  <option value={8}>Agosto</option>
                  <option value={9}>Septiembre</option>
                  <option value={10}>Octubre</option>
                  <option value={11}>Noviembre</option>
                  <option value={12}>Diciembre</option>
                </select>
              </div>
              <div className="doctor-detail-filter-group">
                <label className="doctor-detail-filter-label">Año:</label>
                <select
                  className="doctor-detail-filter-select"
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                >
                  {Array.from({ length: 11 }, (_, i) => {
                    const year = new Date().getFullYear() - 5 + i
                    return <option key={year} value={year}>{year}</option>
                  })}
                </select>
              </div>
              <div className="doctor-detail-historial-stats">
                <span className="doctor-detail-historial-count">{turnosHistorial.length} turno{turnosHistorial.length !== 1 ? 's' : ''}</span>
              </div>
            </div>
          </div>

          {loadingHistorial ? (
            <div className="doctor-detail-loading">
              <div className="doctor-detail-loading-spinner"></div>
              <span>Cargando historial...</span>
            </div>
          ) : turnosHistorial.length === 0 ? (
            <div className="doctor-detail-no-data">
              <svg className="doctor-detail-no-data-icon" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
              <p>
                No hay turnos realizados en {new Date(selectedYear, selectedMonth - 1).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}.
              </p>
            </div>
          ) : (
            <div className="doctor-detail-turnos-timeline">
              {turnosHistorial.map((turno, index) => (
                <div key={turno.id || index} className="doctor-detail-turno-card">
                  <div className="doctor-detail-turno-card-header">
                    <div className="doctor-detail-turno-date-badge">
                      <svg className="doctor-detail-turno-date-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                        <line x1="16" y1="2" x2="16" y2="6" />
                        <line x1="8" y1="2" x2="8" y2="6" />
                        <line x1="3" y1="10" x2="21" y2="10" />
                      </svg>
                      <span className="doctor-detail-turno-date-text">
                        {new Date(turno.diaInicioTurno || turno.fecha).toLocaleDateString('es-ES', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </span>
                    </div>
                    <div className="doctor-detail-turno-status-indicator">
                      <span className={`doctor-detail-turno-status-dot status-${(turno.estado || 'activo').toLowerCase()}`}></span>
                      <span className="doctor-detail-turno-status-text">{turno.estado || 'Activo'}</span>
                    </div>
                  </div>

                  <div className="doctor-detail-turno-card-body">
                    <div className="doctor-detail-turno-time-info">
                      <div className="doctor-detail-turno-time-block">
                        <span className="doctor-detail-turno-time-label">Inicio</span>
                        <span className="doctor-detail-turno-time-value">
                          {turno.horaInicio || turno.inicio}
                        </span>
                      </div>
                      <div className="doctor-detail-turno-time-separator">→</div>
                      <div className="doctor-detail-turno-time-block">
                        <span className="doctor-detail-turno-time-label">Fin</span>
                        <span className="doctor-detail-turno-time-value">
                          {turno.horaFin || turno.fin}
                        </span>
                      </div>
                    </div>

                    <div className="doctor-detail-turno-floor-info">
                      <svg className="doctor-detail-turno-floor-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polygon points="13,2 3,14 12,14 11,22 15,22 14,14 23,14" />
                      </svg>
                      <span className="doctor-detail-turno-floor-label">Piso</span>
                      <span className="doctor-detail-turno-floor-value">
                        {pisosMap[turno.piso || turno.idPiso] || turno.piso || turno.idPiso || 'No especificado'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      {/* Modal Alterar Horario */}
      <AlterarHorarioModal
        isOpen={showAlterarHorario}
        onClose={() => {
          setShowAlterarHorario(false);
          if (showHistorial) {
            const loadTurnosHistorial = async () => {
              try {
                setLoadingHistorial(true);
                const turnos = await adminService.turnos.getByMedico(doctor.id, selectedYear, selectedMonth);
                setTurnosHistorial(turnos || []);
              } catch (e) {
                console.warn('Error recargando historial:', e);
              } finally {
                setLoadingHistorial(false);
              }
            };
            loadTurnosHistorial();
          }
        }}
        doctorId={doctor.idPersonal || doctor.id || raw.idPersonal || raw.id}
        doctorNombre={`${displayNombre} ${displayApellidos}`}
      />
    </div>
  )
}
