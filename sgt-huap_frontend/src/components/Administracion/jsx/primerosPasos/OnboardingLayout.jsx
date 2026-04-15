import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import OnboardingStepper from './OnboardingStepper';
import '../../css/primerosPasos/OnboardingLayout.css'; 
import Paso1CrearPisos from './Paso1CrearPisos';
import Paso2CrearTiposTurno from './Paso2CrearTiposTurno';
import Paso3TurnosBase from './Paso3TurnosBase';
import Paso4Plantilla from './Paso4Plantilla';
import Paso5GeneradorCalendario from './Paso5GeneradorCalendario';
import Paso6AsignarTurnos from './Paso6AsignarTurnos';
import Paso7Finalizar from './Paso7Finalizar';

const OnboardingLayout = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [canAdvance, setCanAdvance] = useState(false);

  const steps = [
    "Pisos", "Tipos Turno", "Turnos Base", "Plantilla", 
    "Calendario", "Asignar", "Finalizar"
  ];

  const enableNextStep = () => setCanAdvance(true);

  // Función para avanzar
  const handleNext = () => {
    if (currentStep < 7) {
      setCurrentStep(prev => prev + 1);
      setCanAdvance(false); // Reseteamos para que el siguiente paso valide de nuevo
    } else {
      navigate('/administracion');
      window.location.reload();
    }
  };

  // NUEVA: Función para retroceder
  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
      setCanAdvance(false); // Reseteamos, el componente anterior validará al montarse
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1: return <Paso1CrearPisos onDataSaved={enableNextStep} />;
      case 2: return <Paso2CrearTiposTurno onDataSaved={enableNextStep} />;
      case 3: return <Paso3TurnosBase onDataSaved={enableNextStep} />;
      case 4: return <Paso4Plantilla onDataSaved={enableNextStep} />;
      case 5: return <Paso5GeneradorCalendario onDataSaved={enableNextStep} />;
      case 6: return <Paso6AsignarTurnos onDataSaved={enableNextStep} />;
      case 7: return <Paso7Finalizar onDataSaved={enableNextStep} />;
      default: return null;
    }
  };

  return (
    <div className="onboarding-container">
      <h1 className="onboarding-title">Configuración Inicial HUAP</h1>
      
      <div className="stepper-wrapper">
        <OnboardingStepper currentStep={currentStep} steps={steps} />
      </div>

      <div className="step-content-card">
        {renderStepContent()}
      </div>

      <div className="onboarding-footer">
        <div className="footer-info">
          Paso {currentStep} de {steps.length}: <strong>{steps[currentStep - 1]}</strong>
        </div>

        {/* Contenedor de Botones (Atrás y Siguiente) */}
        <div className="footer-actions">
            {/* Solo mostramos "Volver" si no estamos en el paso 1 */}
            {currentStep > 1 && (
                <button 
                    className="footer-btn btn-secondary" 
                    onClick={handleBack}
                >
                    ← Volver
                </button>
            )}

            <button
                className={`footer-btn ${canAdvance || currentStep === 7 ? 'btn-active' : 'btn-disabled'}`}
                onClick={handleNext}
                disabled={!canAdvance && currentStep < 7}
            >
                {currentStep === 7 ? 'Ir al Panel de Control' : 'Siguiente Paso →'}
            </button>
        </div>
      </div>
    </div>
  );
};

export default OnboardingLayout;