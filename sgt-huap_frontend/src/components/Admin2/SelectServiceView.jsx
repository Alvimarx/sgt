// SelectServiceView.jsx
import React, { useState } from 'react';
import { SGT_DATA } from './data';
import { SGTIcon, TopHeader } from './UIPrimitives';
import { selectService } from '../../services/authService';
import { switchService } from '../../services/authService';

// Props:
//   servicios     — Array<{ servicioId, nombre, rol }> que viene del Paso 1 (login)
//   preAuthToken  — string, el token temporal de 5 min del Paso 1
//   onServiceSelected(userData) — Prop4 lo recibe y actualiza el AuthContext
const SelectServiceView = ({ servicios = [], preAuthToken, onServiceSelected }) => {
  const PA = SGT_DATA.PALETTE;
  const [loadingId, setLoadingId] = useState(null);
  const [error, setError] = useState('');

  const handleSelect = async (srv) => {
    if (loadingId) return; // evitar doble click mientras carga
    setError('');
    setLoadingId(srv.servicioId);

    let result;
    
    // 💡 LÓGICA DINÁMICA:
    if (preAuthToken) {
      // Si hay token temporal, es el flujo de Login inicial
      result = await selectService(preAuthToken, srv.servicioId);
    } else {
      // Si NO hay preAuthToken, es que el usuario ya estaba dentro y pidió "volver"
      result = await switchService(srv.servicioId);
    }

    if (!result.success) {
      setError(result.error || 'No se pudo seleccionar el servicio');
      return;
    }

    // Paso 2 exitoso: sube userData (con JWT final ya guardado) al padre
    localStorage.setItem('sgt_servicio_activo_nombre', srv.nombre);
    console.log("Servicio seleccionado:", result.userData);
    onServiceSelected(result.userData);
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: PA.surface2, animation: 'sgtSlideLeft .3s ease' }}>

      <div style={{ padding: '24px 20px 10px' }}>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: PA.ink }}>Selecciona un servicio</h2>
        <p style={{ margin: '6px 0 0', fontSize: 14, color: PA.ink3, fontWeight: 600 }}>
          Elige el área de trabajo a la que deseas ingresar hoy.
        </p>
      </div>

      <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>

        {servicios.map((srv) => {
          const isLoading = loadingId === srv.servicioId;
          return (
            <button
              key={srv.servicioId}
              onClick={() => handleSelect(srv)}
              disabled={!!loadingId}
              style={{
                display: 'flex', alignItems: 'center', gap: 14, background: '#fff',
                border: `1px solid ${PA.line}`, borderRadius: 14, padding: 16,
                cursor: loadingId ? 'not-allowed' : 'pointer', textAlign: 'left',
                transition: 'all 0.2s ease', boxShadow: '0 2px 8px rgba(15,23,42,0.04)',
                opacity: loadingId && !isLoading ? 0.5 : 1
              }}
            >
              <div style={{
                width: 44, height: 44, borderRadius: 12, background: PA.primarySoft,
                display: 'grid', placeItems: 'center', color: PA.primary, flexShrink: 0
              }}>
                <SGTIcon name="briefcase" size={20} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: PA.ink }}>{srv.nombre}</div>
                <div style={{ fontSize: 13, color: PA.ink3, fontWeight: 600, marginTop: 4 }}>{srv.rol}</div>
              </div>
              {isLoading
                ? <div style={{ fontSize: 12, color: PA.ink3, fontWeight: 700 }}>Ingresando...</div>
                : <SGTIcon name="chevron-right" size={18} color={PA.ink3} strokeWidth={2.5} />
              }
            </button>
          );
        })}

        {servicios.length === 0 && (
          <div style={{ textAlign: 'center', padding: 32, color: PA.ink3, fontSize: 14, fontWeight: 600 }}>
            No hay servicios disponibles para este usuario.
          </div>
        )}

        {/* Mensaje de error */}
        {error && (
          <div style={{
            background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10,
            padding: '10px 14px', fontSize: 13, fontWeight: 600, color: '#B91C1C'
          }}>
            {error}
          </div>
        )}

      </div>
    </div>
  );
};

export default SelectServiceView;
