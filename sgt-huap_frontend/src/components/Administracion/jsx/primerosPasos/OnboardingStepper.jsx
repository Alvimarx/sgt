import React from 'react';
import '../../css/primerosPasos/OnboardingStepper.css'; // Asegúrate de la ruta de tu CSS

const OnboardingStepper = ({ currentStep, steps }) => {
  return (
    <div className="stepper-container">
      {steps.map((step, index) => {
        const stepNum = index + 1;
        const isCompleted = stepNum < currentStep;
        const isActive = stepNum === currentStep;
        
        return (
          <div key={index} className={`stepper-item ${index === steps.length - 1 ? 'last-item' : ''}`}>
            
            {/* Círculo y Texto */}
            <div className="step-wrapper">
              <div className={`step-circle ${isCompleted ? 'completed' : ''} ${isActive ? 'active' : ''}`}>
                {isCompleted ? '✓' : stepNum}
              </div>
              
              <div className={`step-label ${isActive ? 'active-label' : ''}`}>
                {step}
              </div>
            </div>

            {/* Línea conectora */}
            {index !== steps.length - 1 && (
              <div className={`step-line ${isCompleted ? 'line-completed' : ''}`} />
            )}
          </div>
        );
      })}
    </div>
  );
};

export default OnboardingStepper;