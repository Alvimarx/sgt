import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import '../css/TurnTypeCreator.css'; // Reusing general admin styles or create specific one

// Map of steps in order
const STEPS = [
    { name: 'Crear Pisos', path: '/administracion/creador-piso' },
    { name: 'Crear Tipos', path: '/administracion/creador-tipo-turno' },
    { name: 'Crear Turnos Base', path: '/administracion/creador-turno-base' },
    { name: 'Crear Plantilla', path: '/administracion/creador-plantilla-turno' },
    { name: 'Generar Calendario', path: '/administracion/generador-calendario' },
    { name: 'Asignar Turnos', path: '/administracion/asignador-turnos' }
];

export default function StepNavigator({
    onNext,
    onBack,
    nextDisabled = false,
    nextLabel = "Siguiente Paso →",
    backLabel = "← Volver a Administración",
    showStepMenu = true,
    showBackButton = true,
    children
}) {
    const navigate = useNavigate();
    const location = useLocation();
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    // Identify current index
    const currentIndex = STEPS.findIndex(s => s.path === location.pathname);
    const prevStep = currentIndex > 0 ? STEPS[currentIndex - 1] : null;
    const nextStep = currentIndex < STEPS.length - 1 ? STEPS[currentIndex + 1] : null;

    const handleBack = () => {
        if (onBack) {
            onBack();
        } else if (prevStep) {
            navigate(prevStep.path);
        } else {
            navigate('/administracion');
        }
    };

    const handleNext = () => {
        if (onNext) {
            onNext();
        } else if (nextStep) {
            navigate(nextStep.path);
        }
    };

    return (
        <div className="ctt-actions-section" style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #eee', paddingTop: '20px', marginTop: '20px' }}>
            {/* LEFT ACTIONS */}
            <div className="ctt-actions-left" style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <button
                    type="button"
                    className="ctt-btn secondary"
                    onClick={() => navigate('/administracion')}
                >
                    {backLabel}
                </button>

                {showStepMenu && (
                    <div className="step-menu-container" style={{ position: 'relative' }}>
                        <button
                            type="button"
                            className="ctt-btn secondary"
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                        >
                            Ir a otro paso ▾
                        </button>
                        {isMenuOpen && (
                            <div className="step-menu-dropdown" style={{
                                position: 'absolute', bottom: '100%', left: 0,
                                backgroundColor: 'white', border: '1px solid #ddd',
                                boxShadow: '0 -2px 10px rgba(0,0,0,0.1)', borderRadius: '8px',
                                padding: '8px 0', minWidth: '200px', zIndex: 100, marginBottom: '8px'
                            }}>
                                {STEPS.map((step, idx) => (
                                    <div
                                        key={idx}
                                        className={`step-menu-item ${idx === currentIndex ? 'active' : ''}`}
                                        onClick={() => { navigate(step.path); setIsMenuOpen(false); }}
                                        style={{
                                            padding: '8px 16px', cursor: 'pointer',
                                            backgroundColor: idx === currentIndex ? '#f0f9ff' : 'transparent',
                                            color: idx === currentIndex ? '#0369a1' : '#333'
                                        }}
                                        onMouseEnter={(e) => { if (idx !== currentIndex) e.target.style.backgroundColor = '#f5f5f5' }}
                                        onMouseLeave={(e) => { if (idx !== currentIndex) e.target.style.backgroundColor = 'transparent' }}
                                    >
                                        {idx + 1}. {step.name}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* RIGHT ACTIONS */}
            <div className="ctt-actions-right" style={{ display: 'flex', gap: '12px' }}>
                {children}
                {prevStep && showBackButton && (
                    <button
                        type="button"
                        className="ctt-btn secondary"
                        onClick={() => navigate(prevStep.path)}
                    >
                        ← Paso Anterior
                    </button>
                )}

                <button
                    type="button"
                    className="ctt-btn secondary"
                    style={{ borderColor: '#22c55e', color: '#15803d', backgroundColor: '#f0fdf4' }}
                    onClick={handleNext}
                    disabled={nextDisabled}
                >
                    {nextStep ? nextStep.name + ' →' : nextLabel}
                </button>
            </div>

            {/* Click outside to close (simplified) */}
            {isMenuOpen && <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 99 }} onClick={() => setIsMenuOpen(false)}></div>}
        </div>
    );
}
