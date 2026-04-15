// Componente: CoverageLastMonth
// Descripción: Visualización moderna de la cobertura por piso del mes pasado
import React, { useState, useEffect } from 'react'

export default function CoverageLastMonth({ servicioId }) {
  const [coverageData, setCoverageData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Simular carga de datos - en producción esto vendría del backend
    const loadCoverageData = async () => {
      try {
        // Aquí iría la llamada real al backend
        // const response = await adminService.getCoverageLastMonth(servicioId)

        // No usar datos mock - mostrar sin datos hasta que se implemente el backend
        setTimeout(() => {
          setCoverageData(null)
          setLoading(false)
        }, 1000)
      } catch (error) {
        console.error('Error cargando datos de cobertura:', error)
        setLoading(false)
      }
    }

    loadCoverageData()
  }, [servicioId])

  if (loading) {
    return (
      <div className="coverage-loading">
        <div className="coverage-loading-spinner"></div>
        <p>Cargando cobertura del mes pasado...</p>
      </div>
    )
  }

  if (!coverageData) {
    return (
      <div className="coverage-error">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM13 17H11V11H13V17ZM13 9H11V7H13V9Z" fill="#64748b"/>
        </svg>
        <p>No se pudieron cargar los datos de cobertura</p>
      </div>
    )
  }

  const getCoverageColor = (percentage) => {
    if (percentage >= 95) return '#10b981' // Verde
    if (percentage >= 85) return '#f59e0b' // Amarillo
    return '#ef4444' // Rojo
  }

  const getCoverageIcon = (percentage) => {
    if (percentage >= 95) return '✅'
    if (percentage >= 85) return '⚠️'
    return '❌'
  }

  return (
    <div className="coverage-container">
      <div className="coverage-header">
        <svg className="coverage-header-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M19 3H5C3.9 3 3.01 3.9 3.01 5L3 19C3 20.1 3.89 21 4.99 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3ZM19 19H5V7H19V19Z" fill="currentColor"/>
          <path d="M8.5 14L12 17.5L18.5 11L17.09 9.59L12 14.67L9.91 12.59L8.5 14Z" fill="currentColor"/>
        </svg>
        <h3 className="coverage-title">
          Cobertura por Piso - {coverageData && coverageData.fechaInicio ? new Date(coverageData.fechaInicio).toLocaleDateString('es-ES', {
            month: 'long',
            year: 'numeric'
          }) : 'Mes Anterior'}
        </h3>
      </div>

      {!coverageData || !coverageData.porPiso || Object.keys(coverageData.porPiso).length === 0 ? (
        <div className="coverage-empty-state">
          <div className="coverage-empty-icon">📊</div>
          <div className="coverage-empty-message">
            No hay datos de cobertura disponibles para el mes anterior
          </div>
          <div className="coverage-empty-description">
            Los datos se mostrarán cuando estén disponibles desde el backend
          </div>
        </div>
      ) : (
        <>
          <div className="coverage-summary">
            <div className="coverage-summary-card">
              <div className="coverage-summary-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2L13.09 8.26L22 9.27L16.77 14.14L18.18 21.02L12 17.77L5.82 21.02L7.23 14.14L2 9.27L10.91 8.26L12 2Z" fill="#10b981"/>
                </svg>
              </div>
              <div className="coverage-summary-content">
                <div className="coverage-summary-value">
                  {coverageData.totalPisos || 0}
                </div>
                <div className="coverage-summary-label">Total Pisos</div>
              </div>
            </div>

            <div className="coverage-summary-card">
              <div className="coverage-summary-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM13 17H11V11H13V17ZM13 9H11V7H13V9Z" fill="#3b82f6"/>
                </svg>
              </div>
              <div className="coverage-summary-content">
                <div className="coverage-summary-value">
                  {coverageData.totalPisos ? Math.round(Object.values(coverageData.porPiso).reduce((acc, piso) => acc + piso.porcentaje, 0) / coverageData.totalPisos) : 0}%
                </div>
                <div className="coverage-summary-label">Promedio General</div>
              </div>
            </div>
          </div>

          <div className="coverage-grid">
            {Object.entries(coverageData.porPiso).map(([pisoNombre, datos]) => (
              <div key={pisoNombre} className="coverage-floor-card">
                <div className="coverage-floor-header">
                  <div className="coverage-floor-name">
                    <span className="coverage-floor-icon">🏥</span>
                    {pisoNombre}
                  </div>
                  <div className="coverage-floor-status">
                    <span className="coverage-floor-status-icon">
                      {getCoverageIcon(datos.porcentaje)}
                    </span>
                  </div>
                </div>

                <div className="coverage-floor-metric">
                  <div className="coverage-floor-percentage"
                       style={{ color: getCoverageColor(datos.porcentaje) }}>
                    {datos.porcentaje.toFixed(1)}%
                  </div>
                  <div className="coverage-floor-label">Cobertura</div>
                </div>

                <div className="coverage-floor-progress">
                  <div className="coverage-floor-progress-bar">
                    <div
                      className="coverage-floor-progress-fill"
                      style={{
                        width: `${datos.porcentaje}%`,
                        backgroundColor: getCoverageColor(datos.porcentaje)
                      }}
                    ></div>
                  </div>
                </div>

                <div className="coverage-floor-details">
                  <div className="coverage-floor-detail">
                    <span className="coverage-floor-detail-label">Horas cubiertas:</span>
                    <span className="coverage-floor-detail-value">{datos.horasCubiertas}h</span>
                  </div>
                  <div className="coverage-floor-detail">
                    <span className="coverage-floor-detail-label">Total horas:</span>
                    <span className="coverage-floor-detail-value">{datos.horasTotales}h</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}