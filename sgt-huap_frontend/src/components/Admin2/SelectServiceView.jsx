// SelectServiceView.jsx
import React from 'react';
import { SGT_DATA } from './data';
import { SGTIcon, TopHeader } from './UIPrimitives';

const SelectServiceView = ({ onServiceSelected }) => {
  const PA = SGT_DATA.PALETTE;

  // Mock de los servicios a los que pertenece el usuario logueado
  const userServices = [
    { id: 'urgencia', nombre: 'Urgencia HUAP', rol: 'Médico Turnante' },
    { id: 'upc', nombre: 'Unidad de Paciente Crítico', rol: 'Jefatura Subrogante' }
  ];

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: PA.surface2, animation: 'sgtSlideLeft .3s ease' }}>
      
      <div style={{ padding: '24px 20px 10px' }}>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: PA.ink }}>Selecciona un servicio</h2>
        <p style={{ margin: '6px 0 0', fontSize: 14, color: PA.ink3, fontWeight: 600 }}>
          Elige el área de trabajo a la que deseas ingresar hoy.
        </p>
      </div>

      <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {userServices.map((srv) => (
          <button 
            key={srv.id} 
            onClick={() => onServiceSelected(srv.id)} 
            style={{
              display: 'flex', alignItems: 'center', gap: 14, background: '#fff', 
              border: `1px solid ${PA.line}`, borderRadius: 14, padding: 16, 
              cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s ease',
              boxShadow: '0 2px 8px rgba(15,23,42,0.04)'
            }}
          >
            <div style={{ width: 44, height: 44, borderRadius: 12, background: PA.primarySoft, display: 'grid', placeItems: 'center', color: PA.primary, flexShrink: 0 }}>
              <SGTIcon name="briefcase" size={20} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: PA.ink }}>{srv.nombre}</div>
              <div style={{ fontSize: 13, color: PA.ink3, fontWeight: 600, marginTop: 4 }}>{srv.rol}</div>
            </div>
            <SGTIcon name="chevron-right" size={18} color={PA.ink3} strokeWidth={2.5}/>
          </button>
        ))}
      </div>

    </div>
  );
};

export default SelectServiceView;