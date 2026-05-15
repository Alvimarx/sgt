// ServiciosView.jsx
import React, { useState } from 'react';
import { SGT_DATA } from './data';
import { SGTIcon } from './UIPrimitives';

const ServiciosView = ({ onBack }) => {
  const PA = SGT_DATA.PALETTE;
  
  // Estado inicial con algunos servicios de ejemplo
  const [servicios, setServicios] = useState([
    'Urgencia HUAP',
    'Unidad de Paciente Crítico',
    'Cirugía Menor'
  ]);
  const [nuevoServicio, setNuevoServicio] = useState('');

  const handleCrear = (e) => {
    e.preventDefault();
    if (nuevoServicio.trim() !== '') {
      setServicios([...servicios, nuevoServicio.trim()]);
      setNuevoServicio(''); // Limpiar el input
    }
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: PA.surface2, animation: 'sgtSlideLeft .3s ease' }}>
      
      {/* Header con botón volver */}
      <div style={{ padding: '16px', background: '#fff', borderBottom: `1px solid ${PA.line2}`, display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={onBack} style={{ background: 'transparent', border: 'none', padding: 4, cursor: 'pointer', display: 'flex' }}>
          <SGTIcon name="chevron-left" size={24} color={PA.ink} />
        </button>
        <div style={{ fontSize: 19, fontWeight: 800, color: PA.ink }}>Servicios</div>
      </div>

      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
        
        {/* Formulario para crear un servicio nuevo */}
        <form onSubmit={handleCrear} style={{
          display: 'flex', gap: 10, background: '#fff', padding: 12, 
          borderRadius: 14, border: `1px solid ${PA.line}`,
          boxShadow: '0 4px 12px rgba(15,23,42,0.03)'
        }}>
          <input 
            type="text" 
            placeholder="Nombre del nuevo servicio..." 
            value={nuevoServicio}
            onChange={(e) => setNuevoServicio(e.target.value)}
            style={{
              flex: 1, border: 'none', background: PA.surface2, padding: '12px 14px',
              borderRadius: 10, fontSize: 14, color: PA.ink, outline: 'none',
              fontWeight: 600, fontFamily: 'inherit'
            }}
          />
          <button type="submit" disabled={!nuevoServicio.trim()} style={{
            background: nuevoServicio.trim() ? PA.primary : PA.line, 
            color: '#fff', border: 'none', borderRadius: 10, padding: '0 16px',
            fontSize: 14, fontWeight: 800, cursor: nuevoServicio.trim() ? 'pointer' : 'not-allowed',
            transition: 'all 0.2s ease'
          }}>
            Crear
          </button>
        </form>

        {/* Lista de Servicios */}
        <div>
          <div style={{ fontSize: 12, fontWeight: 800, color: PA.ink3, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10, marginLeft: 4 }}>
            Servicios Activos ({servicios.length})
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {servicios.map((srv, index) => (
              <div key={index} style={{
                background: '#fff', border: `1px solid ${PA.line}`, padding: '14px 16px',
                borderRadius: 12, display: 'flex', alignItems: 'center', gap: 12
              }}>
                <div style={{ width: 8, height: 8, borderRadius: 99, background: PA.primarySoft, border: `2px solid ${PA.primary}` }} />
                <span style={{ fontSize: 15, fontWeight: 700, color: PA.ink, flex: 1 }}>{srv}</span>
                <button style={{ background: 'transparent', border: 'none', color: PA.ink3, cursor: 'pointer', display: 'flex' }}>
                  <SGTIcon name="more" size={18} />
                </button>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};

export default ServiciosView;