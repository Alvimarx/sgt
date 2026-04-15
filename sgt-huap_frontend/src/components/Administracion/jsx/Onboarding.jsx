import React, { useEffect, useState } from 'react'
import OnboardingLayout from './primerosPasos/OnboardingLayout.jsx'

const Onboarding = () => {
  const [loading, setLoading] = useState(true)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    let mounted = true

    // Increment progress every 100ms and stop at 100
    const interval = setInterval(() => {
      setProgress((p) => Math.min(100, p + 2))
    }, 100)

    // After 5s hide the loading screen and show the stepper layout
    const timeout = setTimeout(() => {
      if (mounted) setLoading(false)
    }, 5000)

    return () => {
      mounted = false
      clearInterval(interval)
      clearTimeout(timeout)
    }
  }, [])

  if (loading) {
    return (
      <div style={{
        position: 'fixed',
        inset: 0,
        background: 'white',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 9999,
        padding: 20
      }}>
        <div style={{
          maxWidth: 600,
          width: '100%',
          textAlign: 'center',
          padding: 24,
          borderRadius: 12,
          boxShadow: '0 8px 30px rgba(0,0,0,0.08)'
        }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🏥</div>
          <h2 style={{ margin: 0, fontSize: 22, color: '#1f2937' }}>Configuración inicial</h2>
          <p style={{ color: '#4b5563', marginTop: 8, marginBottom: 18 }}>
            Estamos preparando todo para que puedas gestionar tus turnos. Esto solo toma unos segundos.
          </p>

          <div style={{ height: 12, background: '#e6e6e6', borderRadius: 8, overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${progress}%`,
              background: 'linear-gradient(90deg, #4facfe 0%, #00f2fe 100%)',
              transition: 'width 0.12s linear'
            }} />
          </div>

          <div style={{ marginTop: 10, color: '#6b7280', fontSize: 13 }}>{progress}%</div>
        </div>
      </div>
    )
  }

  return <OnboardingLayout />
}

export default Onboarding