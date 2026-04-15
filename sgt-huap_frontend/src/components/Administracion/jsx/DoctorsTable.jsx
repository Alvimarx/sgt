// Componente: DoctorsTable
// Descripción: Lista de médicos con filtros y vista adaptativa (tabla en
// escritorio y tarjetas en móvil).
import React, { useEffect, useState } from 'react'
import { useMediaQuery } from 'react-responsive'
import { useAuth, Roles } from '../../../context/AuthContext'
import { getServicioId } from '../../../utils/tokenManager'
import '../css/pc/DoctorsTable-PC.css'
import '../css/movil/DoctorsTable-Movil.css'
import '../css/tablet/DoctorsTable-Tablet.css'
import { mapRoleToDisplay } from '../../../constants/roles'
import { usuariosService } from '../../../services/adminService'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export default function DoctorsTable({ onView, onAssignShifts, onDoctorsLoaded, preloadedDoctors }) {
  const auth = useAuth()
  const [doctors, setDoctors] = useState(preloadedDoctors || [])
  const [filter, setFilter] = useState({ nombre: '', especialidad: '', estado: '', turno: '' })
  const [isLoading, setIsLoading] = useState(!preloadedDoctors)
  const [error, setError] = useState(null)
  const isMobile = useMediaQuery({ maxWidth: 768 })
  // Auto-refresh interval in ms (default 60s)
  const AUTO_REFRESH_MS = 60000

  // Estados de paginación
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10 // Número de médicos por página

  useEffect(() => {
    let mounted = true

    // Preferir la API por servicio si existe servicioId guardado (login almacena servicioId)
    const servicioId = (getServicioId() || (auth && auth.servicioId))
    const url = `${API_BASE_URL}/usuarios` + (servicioId ? `?servicioId=${servicioId}` : '')

    const load = async () => {
      try {
        if (mounted) setIsLoading(true)
        const data = await usuariosService.getAll(servicioId);
        if (!mounted) return
        const mapped = (data || []).map(u => {
          // Normalizar identificadores y nombres según el backend
          const id = u.idPersonal || u.id || null
          const nombreFromParts = (u.primerNombre || u.nombre || '').toString().trim()
          const nombreSimple = (u.primerNombre && u.primerNombre.toString().split(' ')[0]) || (u.nombre ? u.nombre.toString().split(' ')[0] : '') || ''
          const apellidoPat = u.apel_pat || u.apellidoPaterno || u.primerApellido || ''
          const apellidoMat = u.apel_mat || u.apellidoMaterno || u.segundoApellido || ''
          const apellidosCombined = [apellidoPat, apellidoMat].filter(Boolean).join(' ')

          const especialidad = (u.servicio || u.especialidad || u.area || '—')
          const tipoCargo = (u.tipoCargoNombre || u.tipoCargo || '—')

          // Mapear estado numérico a texto
          const mapEstado = (st) => {
            if (st === 1 || st === '1') return 'activo'
            if (st === 0 || st === '0') return 'inactivo'
            if (typeof st === 'string') return st.toLowerCase()
            return '—'
          }

          return {
            id: id,
            nombre: nombreSimple || nombreFromParts || '',
            apellidos: apellidosCombined || (u.apellidos || ''),
            rut: u.rut || u.rutCompleto || '',
            especialidad: especialidad,
            tipoCargo: tipoCargo,
            horasAsignadas: u.horasAsignadas || 0,
            horasSemanales: u.horasSemanales || u.horasTrabajadas || 0,
            rol: mapRoleToDisplay(u.rol) || '—',
            estado: mapEstado(u.estado),
            volante: u.volante || false,
            __raw: u
          }
        })
        if (!mounted) return
        setDoctors(mapped)
        setError(null)
        onDoctorsLoaded && onDoctorsLoaded(mapped)
      } catch (err) {
        console.warn('Fallo al cargar usuarios desde backend', err)
        if (!mounted) return
        setDoctors([])
        setError('No se pudo cargar la lista de médicos desde el servidor. Intenta más tarde.')
      } finally {
        if (mounted) setIsLoading(false)
      }
    }

    // If preloadedDoctors provided, use them and skip auto-refresh
    if (preloadedDoctors && preloadedDoctors.length > 0) {
      setDoctors(preloadedDoctors)
      setIsLoading(false)
      onDoctorsLoaded && onDoctorsLoaded(preloadedDoctors)
      return () => { mounted = false }
    }

    // initial load
    load()

    // auto-refresh interval
    const intervalId = setInterval(() => { load() }, AUTO_REFRESH_MS)

    // listen for manual updates dispatched elsewhere
    const onMedicoUpdated = () => { load() }
    window.addEventListener('medico:updated', onMedicoUpdated)

    return () => { mounted = false; clearInterval(intervalId); window.removeEventListener('medico:updated', onMedicoUpdated) }
  }, [preloadedDoctors, auth && auth.servicioId])

  const filtered = doctors.filter(d => {
    if (filter.nombre && !(((d.nombre || '') + ' ' + (d.apellidos || '')).toLowerCase().includes((filter.nombre || '').toLowerCase()))) return false
    if (filter.especialidad && String((d.especialidad || '')).toLowerCase() !== String(filter.especialidad).toLowerCase()) return false
    if (filter.estado && String((d.estado || '')).toLowerCase() !== String(filter.estado).toLowerCase()) return false
    if (filter.turno && String((d.tipoCargo || '')).toLowerCase() !== String(filter.turno).toLowerCase()) return false
    return true
  })

  // Resetear a página 1 cuando cambian los filtros
  useEffect(() => {
    setCurrentPage(1)
  }, [filter])

  // Calcular paginación
  const totalPages = Math.ceil(filtered.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedDoctors = filtered.slice(startIndex, endIndex)

  // Funciones de navegación
  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page)
    }
  }

  const goToNextPage = () => goToPage(currentPage + 1)
  const goToPrevPage = () => goToPage(currentPage - 1)

  // Mostrar loading mientras se cargan los datos
  if (isLoading) {
    return (
      <div className="doctors-loading-container">
        <div className="doctors-loading-content">
          <div className="doctors-loading-spinner"></div>
          <p className="doctors-loading-text">Cargando lista de médicos...</p>
        </div>
      </div>
    )
  }

  // Mostrar mensaje de error si la carga falló
  if (error) {
    return (
      <div className="doctors-error-container">
        <div className="doctors-error-box">
          <h3>Error al cargar médicos</h3>
          <p>{error}</p>
        </div>
      </div>
    )
  }

  if (isMobile) {
    // Móvil: renderizar como lista de tarjetas con botones visibles para
    // acciones rápidas (ver / editar). Los filtros se apilan verticalmente
    // para una mejor experiencia en pantallas pequeñas.
    return (
      <div className="doctors-table-container">
        <div className="doctors-filters-container">
          <input value={filter.nombre} onChange={(e) => setFilter({ ...filter, nombre: e.target.value })} placeholder="Buscar por nombre" className="doctors-filter-input" />
          <div className="doctors-filter-selects">
            <select value={filter.especialidad} onChange={(e) => setFilter({ ...filter, especialidad: e.target.value })} className="doctors-filter-select">
              <option value="">Todas las especialidades</option>
              {[...new Set(doctors.map(d => d.especialidad))].map(s => (<option key={s} value={s}>{s}</option>))}
            </select>
            <select value={filter.turno} onChange={(e) => setFilter({ ...filter, turno: e.target.value })} className="doctors-filter-select">
              <option value="">Todos los cargos</option>
              {[...new Set(doctors.map(d => d.tipoCargo).filter(Boolean))].map(s => (<option key={s} value={s}>{s}</option>))}
            </select>
            <select value={filter.estado} onChange={(e) => setFilter({ ...filter, estado: e.target.value })} className="doctors-filter-select">
              <option value="">Todos</option>
              <option value="activo">Activo</option>
              <option value="inactivo">Inactivo</option>
            </select>
          </div>
          <div className="doctors-results-text">
            Resultados: <span className="doctors-results-count">{filtered.length}</span>
            <div className="doctors-help" title="Listado completo de médicos con información detallada, especialidades, estado y herramientas de gestión">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                <path d="M12 17h.01" />
              </svg>
            </div>
          </div>
        </div>

        <div className="doctors-card-list">
          {paginatedDoctors.map(doc => (
            <div key={doc.id} className="doctors-card">
              <div className="doctors-card-avatar-section">
                <div className="doctors-card-avatar">
                  {(() => {
                    const nombre = (doc.nombre || '').toString().trim()
                    const apellidos = (doc.apellidos || '').toString().trim()
                    const first = nombre ? nombre.charAt(0) : ''
                    const primerApellido = apellidos.split(' ')[0] || ''
                    const second = primerApellido ? primerApellido.charAt(0) : ''
                    const initials = (first + second).toUpperCase()
                    return initials || (nombre.charAt(0) || '') || (doc.rut && doc.rut.charAt(0)) || 'M'
                  })()}
                </div>
                <div className="doctors-card-status-indicator">
                  <span className={`doctors-card-status-dot status-${(doc.estado || 'activo').toLowerCase()}`}></span>
                </div>
              </div>

              <div className="doctors-card-content">
                <div className="doctors-card-header">
                  <div className="doctors-card-name-section">
                    <h3 className="doctors-card-name">{doc.nombre} {doc.apellidos}</h3>
                    <span className="doctors-card-rut">{doc.rut}</span>
                  </div>
                  <span className={`doctors-card-role-badge role-${(doc.rol || '').toLowerCase().replace(/\s+/g, '-')}`}>
                    {doc.rol || 'Médico'}
                  </span>
                </div>

                <div className="doctors-card-details">
                  <div className="doctors-card-detail-item">
                    <svg className="doctors-card-detail-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                    <span>{doc.especialidad}</span>
                  </div>
                  <div className="doctors-card-detail-item">
                    <svg className="doctors-card-detail-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12,6 12,12 16,14" />
                    </svg>
                    <span>{doc.tipoCargo || 'Sin cargo'}</span>
                  </div>
                </div>
              </div>

              <div className="doctors-card-actions">
                <button type="button" aria-label={`Ver perfil de ${doc.nombre} ${doc.apellidos}`} onClick={() => onView && onView(doc)} className="doctors-btn-view">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  Ver
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Controles de paginación */}
        {totalPages > 1 && (
          <div className="doctors-pagination">
            <button
              onClick={goToPrevPage}
              disabled={currentPage === 1}
              className="doctors-pagination-btn"
            >
              ‹ Anterior
            </button>
            <span className="doctors-pagination-info">
              Página {currentPage} de {totalPages}
            </span>
            <button
              onClick={goToNextPage}
              disabled={currentPage === totalPages}
              className="doctors-pagination-btn"
            >
              Siguiente ›
            </button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="doctors-table-container">
      <div className="doctors-filters-container">
        <div className="doctors-filters-group">
          <input value={filter.nombre} onChange={(e) => setFilter({ ...filter, nombre: e.target.value })} placeholder="Buscar por nombre" className="doctors-filter-input" />
          <select value={filter.especialidad} onChange={(e) => setFilter({ ...filter, especialidad: e.target.value })} className="doctors-filter-select">
            <option value="">Todas las especialidades</option>
            {[...new Set(doctors.map(d => d.especialidad))].map(s => (<option key={s} value={s}>{s}</option>))}
          </select>
          <select value={filter.estado} onChange={(e) => setFilter({ ...filter, estado: e.target.value })} className="doctors-filter-select">
            <option value="">Todos los estados</option>
            <option value="activo">Activo</option>
            <option value="inactivo">Inactivo</option>
          </select>
        </div>
        <div className="doctors-results-container">
          <div className="doctors-results-text">Resultados: <span className="doctors-results-count">{filtered.length}</span></div>
        </div>
      </div>

      <div className="doctors-table-wrapper">
        <table className="doctors-table">
          <thead>
            <tr>
              <th scope="col">Nombre</th>
              <th scope="col">Especialidad</th>
              <th scope="col">Estado</th>
              <th scope="col">Tipo Cargo</th>
              <th scope="col">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {paginatedDoctors.map((doc, idx) => (
              <tr key={doc.id}>
                <td>
                  <div className="doctors-name-cell">
                    <div className="doctors-avatar">
                      {(() => {
                        // Compute initials: first char of nombre + first char of first apellido
                        const nombre = (doc.nombre || '').toString().trim()
                        const apellidos = (doc.apellidos || '').toString().trim()
                        const first = nombre ? nombre.charAt(0) : ''
                        // apellidos may contain multiple parts; take first part
                        const primerApellido = apellidos.split(' ')[0] || ''
                        const second = primerApellido ? primerApellido.charAt(0) : ''
                        const initials = (first + second).toUpperCase()
                        return initials || (nombre.charAt(0) || '') || (doc.rut && doc.rut.charAt(0)) || ''
                      })()}
                    </div>
                    <div className="doctors-name-info">
                      <div className="doctors-name">{doc.nombre} {doc.apellidos}</div>
                      <div className="doctors-rut">{doc.rut}</div>
                    </div>
                  </div>
                </td>
                <td>
                  <div className="doctors-especialidad-cell">
                    <svg className="doctors-especialidad-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                    <span>{doc.especialidad}</span>
                  </div>
                </td>
                <td>
                  <div className="doctors-status-cell">
                    <span className={`doctors-status-badge ${doc.estado === 'activo' ? 'doctors-status-active' : 'doctors-status-inactive'}`}>{doc.estado}</span>
                    <span className="doctors-role-badge">{doc.rol || '—'}</span>
                  </div>
                </td>
                <td>
                  <div className="doctors-turno-cell">
                    <svg className="doctors-turno-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12,6 12,12 16,14" />
                    </svg>
                    <span>{doc.tipoCargo || 'Sin asignar'}</span>
                  </div>
                </td>
                <td>
                  <div className="doctors-actions-cell">
                    <button type="button" aria-label={`Ver perfil de ${doc.nombre} ${doc.apellidos}`} onClick={() => onView && onView(doc)} className="doctors-btn-view">Ver</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Controles de paginación */}
      {totalPages > 1 && (
        <div className="doctors-pagination">
          <button
            onClick={goToPrevPage}
            disabled={currentPage === 1}
            className="doctors-pagination-btn"
          >
            ‹ Anterior
          </button>
          <div className="doctors-pagination-pages">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
              <button
                key={page}
                onClick={() => goToPage(page)}
                className={`doctors-pagination-page ${page === currentPage ? 'active' : ''}`}
              >
                {page}
              </button>
            ))}
          </div>
          <button
            onClick={goToNextPage}
            disabled={currentPage === totalPages}
            className="doctors-pagination-btn"
          >
            Siguiente ›
          </button>
        </div>
      )}
    </div>
  )
}
