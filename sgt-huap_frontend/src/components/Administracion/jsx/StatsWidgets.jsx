import React, { useState, useEffect } from 'react'
import adminService from '../../../services/adminService'
import { useAuth } from '../../../context/AuthContext'
import '../css/StatsWidgets.css'

function ProgressBar({ value }) {
  const pct = Math.max(0, Math.min(100, Math.round(value)))
  return (
    <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
      <div style={{ width: pct + '%', backgroundColor: '#17416C' }} className="h-3"></div>
    </div>
  )
}

export default function StatsWidgets({ data }) {
  const auth = useAuth()
  const [statsData, setStatsData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [pisos, setPisos] = useState([])
  const [currentPage, setCurrentPage] = useState(0)
  const [pageSize, setPageSize] = useState(10)
  const [totalPages, setTotalPages] = useState(0)
  const [totalElements, setTotalElements] = useState(0)

  const currentDate = new Date()
  const monthNames = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
  const currentMonth = monthNames[currentDate.getMonth()] + ' ' + currentDate.getFullYear()

  useEffect(() => {
    const loadStats = async () => {
      try {
        setLoading(true)
        // Cargar estadísticas de turnos y horas en paralelo
        // load pisos for the user's servicio first
        const servicioId = auth?.servicioId || localStorage.getItem('servicioId')
        let pisosList = []
        try {
          pisosList = await adminService.pisos.getByServicio(servicioId)
        } catch (e) {
          console.warn('No se pudieron cargar pisos por servicio:', e)
          pisosList = []
        }

        // Obtener cobertura por piso para el mes actual y estadísticas de horas
        const [coberturaMesActual, horasStats] = await Promise.all([
          adminService.turnos.getCoveragePerPisoCurrentMonth(servicioId),
          adminService.usuarios.getHorasStats(servicioId, currentPage, pageSize)
        ])

        const porPisoMap = (coberturaMesActual && coberturaMesActual.porPiso) ? coberturaMesActual.porPiso : {}
        const totalPisos = coberturaMesActual && coberturaMesActual.totalPisos ? coberturaMesActual.totalPisos : Object.keys(porPisoMap).length

        // determinar daysPerPiso
        let daysPerPiso = 0
        const anyKey = Object.keys(porPisoMap)[0]
        if (anyKey && porPisoMap[anyKey] && typeof porPisoMap[anyKey].total === 'number') {
          daysPerPiso = porPisoMap[anyKey].total
        } else if (coberturaMesActual && coberturaMesActual.fechaInicio && coberturaMesActual.fechaFin) {
          const s = new Date(coberturaMesActual.fechaInicio)
          const f = new Date(coberturaMesActual.fechaFin)
          daysPerPiso = Math.floor((f - s) / (1000 * 60 * 60 * 24)) + 1
        }

        const byPiso = []

        if (Array.isArray(pisosList) && pisosList.length > 0) {
          pisosList.forEach(pObj => {
            const candidates = [pObj.nombre, String(pObj.id), (pObj.nombre || '').toUpperCase(), (pObj.nombre || '').toLowerCase()]
            let counts = null
            for (const c of candidates) {
              if (c && porPisoMap[c]) { counts = porPisoMap[c]; break }
            }
            if (!counts) counts = { total: daysPerPiso || 0, asignados: 0 }
            const total = counts.total || (daysPerPiso || 0)
            const asignados = counts.asignados || 0
            byPiso.push({
              piso: pObj.nombre,
              turnos_totales: total,
              turnos_asignados: asignados,
              fill_rate: total > 0 ? Math.round((asignados / total) * 100) : 0
            })
          })
        } else {
          Object.entries(porPisoMap).forEach(([piso, counts]) => {
            const total = counts.total || (daysPerPiso || 0)
            const asignados = counts.asignados || 0
            byPiso.push({
              piso,
              turnos_totales: total,
              turnos_asignados: asignados,
              fill_rate: total > 0 ? Math.round((asignados / total) * 100) : 0
            })
          })
        }

        setPisos(pisosList || [])

        const medicos = horasStats.medicos || []
        setTotalPages(horasStats.totalPages || 0)
        setTotalElements(horasStats.totalElements || 0)

        // calcular totales globales
        const total = (daysPerPiso || 0) * (totalPisos || byPiso.length || 0)
        const asignados = byPiso.reduce((acc, x) => acc + (x.turnos_asignados || 0), 0)
        const fillRate = total > 0 ? Math.round((asignados / total) * 1000) / 10 : 0

        setStatsData({
          fillRate,
          byPiso,
          medicos,
          avg_mensual: medicos.length > 0
            ? Math.round(medicos.reduce((sum, m) => sum + (m.horas_mensuales || 0), 0) / medicos.length * 10) / 10
            : 0
        })
      } catch (error) {
        console.warn('Error al cargar estadísticas:', error)
        // No usar datos mock - mostrar sin datos hasta que se implemente el backend
        setStatsData(null)
      } finally {
        setLoading(false)
      }
    }

    loadStats()
  }, [currentPage, pageSize])

  // Datos de ejemplo para fallback
  const sampleData = () => ({
    fillRate: 87.5,
    byPiso: [
      { piso: '6TO A', turnos_totales: 120, turnos_asignados: 108, fill_rate: 90 },
      { piso: '5TO B', turnos_totales: 80, turnos_asignados: 56, fill_rate: 70 },
      { piso: '4TO C', turnos_totales: 60, turnos_asignados: 54, fill_rate: 90 }
    ],
    medicos: [
      { id: 12, nombre: 'María Fernández', horas_asignadas: 160, horas_contratadas: 160, utilization: 100 },
      { id: 7, nombre: 'José Ramírez', horas_asignadas: 120, horas_contratadas: 160, utilization: 75 },
      { id: 3, nombre: 'Ana López', horas_asignadas: 96, horas_contratadas: 120, utilization: 80 }
    ],
    avg_utilization: 85.0
  })

  const sample = data || statsData || {
    fillRate: 0,
    byPiso: [],
    medicos: [],
    avg_utilization: 0
  }

  if (loading) {
    return (
      <div className="stats-container">
        <div className="text-center py-8">
          <p className="text-gray-500">Cargando estadísticas...</p>
        </div>
      </div>
    )
  }

  if (!statsData) {
    return (
      <div className="stats-container">
        <div className="stats-empty-state">
          <div className="stats-empty-icon">📊</div>
          <div className="stats-empty-message">
            No hay datos de estadísticas disponibles
          </div>
          <div className="stats-empty-description">
            Los datos se mostrarán cuando estén disponibles desde el backend
          </div>
        </div>
      </div>
    )
  }

  // Para la sección de utilización: mostrar solo 5 médicos (sin botón 'Ver todos')
  const filteredMedicos = sample.medicos.filter(m => {
    if (!searchTerm || searchTerm.trim() === '') return true
    const q = String(searchTerm).toLowerCase()
    const name = (m.nombre || '').toString().toLowerCase()
    const rut = (m.rut || '').toString().toLowerCase()
    return name.includes(q) || rut.includes(q)
  })
  // Mostrar todos los médicos filtrados, permitiendo scroll/deslizamiento en la lista
  const medicosParaMostrar = filteredMedicos

  return (
    <div className="stats-container">
      <div className="stats-grid-main">
        <div className="stats-card stats-card-large">
          <div className="stats-header">
            <div>
              <h3 className="stats-title">
                <svg className="stats-title-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Tasa de ocupación — turnos asignados ({currentMonth})
              </h3>
              <p className="stats-subtitle">Porcentaje de turnos asignados en el periodo seleccionado</p>
            </div>
            <div className="stats-value">
              <div className="stats-value-number">{sample.fillRate}%</div>
              <div className="stats-value-label">Asignados / Planificados</div>
            </div>
          </div>

          <div className="progress-bar-container">
            <ProgressBar value={sample.fillRate} />
          </div>

          <div className="piso-grid" style={{ maxHeight: 260, overflowY: 'auto', paddingRight: 8 }}>
            {sample.byPiso.map(p => (
              <div key={p.piso} className="piso-card">
                <div className="piso-name">{p.piso}</div>
                <div className="piso-value">{p.fill_rate}%</div>
                <div className="piso-stats">{p.turnos_asignados} / {p.turnos_totales}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="stats-card">
          <div className="stats-header">
            <div>
              <h3 className="stats-title">
                <svg className="stats-title-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Horas de médicos
              </h3>
              <p className="stats-subtitle">Horas semanales y mensuales realizadas</p>
            </div>
            <div className="stats-value">
              <div className="stats-value-number-large">{sample.avg_mensual}h</div>
              <div className="stats-value-label">Promedio mensual</div>
            </div>
          </div>

          <div className="medicos-search" style={{ marginBottom: 8 }}>
            <input
              type="search"
              placeholder="Buscar por nombre o RUT..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: '100%', padding: '8px', borderRadius: 6, border: '1px solid #e5e7eb' }}
            />
          </div>

          <div className="medicos-list" style={{ maxHeight: 260, overflowY: 'auto', paddingRight: 8, WebkitOverflowScrolling: 'touch' }}>
            {medicosParaMostrar.map(m => (
              <div key={m.id} className="medico-item">
                <div>
                  <div className="medico-name">{m.nombre}</div>
                  <div className="medico-hours">
                    <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '2px' }}>
                      {m.horas_semanales ?? '—'}h semanales · {m.horas_mensuales ?? '—'}h mensuales
                    </div>
                    <div style={{ fontSize: '11px', color: '#9ca3af' }}>
                      {m.horas_trabajadas ?? '—'}h totales · {m.rut ? m.rut : ''}
                    </div>
                  </div>
                </div>
                <div className="medico-progress">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '100%' }}>
                    {/* Barra semanal */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <div style={{ fontSize: '10px', color: '#6b7280', textAlign: 'left' }}>Semanal</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ flex: 1 }}>
                          <ProgressBar value={Math.min((m.horas_semanales / 40) * 100, 100)} />
                        </div>
                        <div className="medico-progress-value" style={{ fontSize: '11px', minWidth: '35px', textAlign: 'right' }}>
                          {m.horas_semanales ?? '—'}h
                        </div>
                      </div>
                    </div>
                    {/* Barra mensual */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <div style={{ fontSize: '10px', color: '#6b7280', textAlign: 'left' }}>Mensual</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ flex: 1 }}>
                          <ProgressBar value={Math.min((m.horas_mensuales / 160) * 100, 100)} />
                        </div>
                        <div className="medico-progress-value" style={{ fontSize: '11px', minWidth: '35px', textAlign: 'right' }}>
                          {m.horas_mensuales ?? '—'}h
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Paginación */}
          {totalPages > 1 && (
            <div className="pagination-controls" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', marginTop: '16px' }}>
              <button
                onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                disabled={currentPage === 0}
                style={{ padding: '4px 8px', border: '1px solid #d1d5db', borderRadius: '4px', background: currentPage === 0 ? '#f3f4f6' : '#ffffff', cursor: currentPage === 0 ? 'not-allowed' : 'pointer' }}
              >
                Anterior
              </button>
              <span style={{ fontSize: '14px', color: '#6b7280' }}>
                Página {currentPage + 1} de {totalPages} ({totalElements} médicos)
              </span>
              <button
                onClick={() => setCurrentPage(Math.min(totalPages - 1, currentPage + 1))}
                disabled={currentPage >= totalPages - 1}
                style={{ padding: '4px 8px', border: '1px solid #d1d5db', borderRadius: '4px', background: currentPage >= totalPages - 1 ? '#f3f4f6' : '#ffffff', cursor: currentPage >= totalPages - 1 ? 'not-allowed' : 'pointer' }}
              >
                Siguiente
              </button>
            </div>
          )}

          {/* 'Ver todos' eliminado: mostramos los primeros 5 resultados filtrados */}
        </div>
      </div>

      <div className="rankings-container">
        {/* Rankings removidos por petición: "Ranking médico con más horas" y "Ranking médico con menos horas" */}
      </div>

      {/* Full ranking UI removed */}
    </div>
  )
}
