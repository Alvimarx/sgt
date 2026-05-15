// RotativaWizard.jsx
import React, { useState } from 'react';
import { SGT_DATA } from './data';
import { SGTIcon } from './UIPrimitives';

const RotativaWizard = ({ onExit }) => {
  const PA = SGT_DATA.PALETTE;
  const [step, setStep] = useState(1);
  const totalSteps = 6;

  const handleNext = () => {
    if (step < totalSteps) setStep(step + 1);
    else onExit();
  };

  const handlePrev = () => {
    if (step > 1) setStep(step - 1);
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: PA.surface2, animation: 'sgtSlideLeft .3s ease' }}>
      
      <div style={{ padding: '16px', background: '#fff', borderBottom: `1px solid ${PA.line2}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button onClick={onExit} style={{ background: 'transparent', border: 'none', padding: 4, cursor: 'pointer', display: 'flex', color: PA.ink3 }}>
          <SGTIcon name="close" size={24} />
        </button>
        <div style={{ fontSize: 16, fontWeight: 800, color: PA.ink }}>Crear Rotativa</div>
        <div style={{ fontSize: 14, fontWeight: 800, color: PA.primary }}>{step} / {totalSteps}</div>
      </div>

      <div style={{ height: 4, background: PA.line, width: '100%' }}>
        <div style={{ height: '100%', background: PA.primary, width: `${(step / totalSteps) * 100}%`, transition: 'width 0.3s ease' }} />
      </div>

      <div style={{
        flex: 1, background: '#fff', margin: 20, borderRadius: 16, border: `1px solid ${PA.line}`,
        boxShadow: '0 10px 30px rgba(15,23,42,0.05)', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', padding: 20, textAlign: 'center'
      }}>
        <div style={{ width: 60, height: 60, borderRadius: 99, background: PA.primarySoft, display: 'grid', placeItems: 'center', color: PA.primary, marginBottom: 16 }}>
          <SGTIcon name="sliders" size={28} />
        </div>
        <h3 style={{ margin: '0 0 10px', color: PA.ink, fontSize: 20, fontWeight: 800 }}>Paso {step}</h3>
        <p style={{ margin: 0, color: PA.ink2, fontSize: 14, fontWeight: 600 }}>
          {step === 1 && "Configuración inicial de la rotativa."}
          {step === 2 && "Definición de turnos base."}
          {step === 3 && "Asignación de equipos."}
          {step === 4 && "Patrón de repetición."}
          {step === 5 && "Reglas de descanso."}
          {step === 6 && "Revisión final y confirmación."}
        </p>
      </div>

      <div style={{ padding: '16px 20px 30px', background: '#fff', borderTop: `1px solid ${PA.line2}`, display: 'flex', gap: 12 }}>
        {step > 1 && (
          <button onClick={handlePrev} style={{
            flex: 1, padding: '14px', borderRadius: 12, background: '#fff', border: `1px solid ${PA.line}`,
            color: PA.ink2, fontSize: 15, fontWeight: 800, cursor: 'pointer'
          }}>
            Atrás
          </button>
        )}
        <button onClick={handleNext} style={{
          flex: step === 1 ? 1 : 2, padding: '14px', borderRadius: 12, background: PA.primary, border: 'none',
          color: '#fff', fontSize: 15, fontWeight: 800, cursor: 'pointer',
          boxShadow: '0 4px 12px rgba(23, 65, 108, 0.2)'
        }}>
          {step === totalSteps ? 'Finalizar' : 'Siguiente'}
        </button>
      </div>
    </div>
  );
};

export default RotativaWizard;