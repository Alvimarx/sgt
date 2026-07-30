// SelectServiceView.jsx
import React, { useEffect, useRef, useState } from 'react';
import { SGT_DATA } from '../Admin2/data';
import { SGTIcon, TopHeader } from '../Style/UIPrimitives';
import { selectService } from '../../services/authService';
import { switchService } from '../../services/authService';

// Props:
//   servicios     — Array<{ servicioId, nombre, rol }> que viene del Paso 1 (login)
//   preAuthToken  — string, el token temporal de 5 min del Paso 1
//   onServiceSelected(userData) — Prop4 lo recibe y actualiza el AuthContext
const SelectServiceView = ({ servicios = [], preAuthToken, onServiceSelected, onLogout }) => {
  const PA = SGT_DATA.PALETTE;
  const [loadingId, setLoadingId] = useState(null);
  const [successId, setSuccessId] = useState(null);
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);

  const shakeTimerRef = useRef(null);
  const successTimerRef = useRef(null);

  useEffect(() => () => {
    if (shakeTimerRef.current) clearTimeout(shakeTimerRef.current);
    if (successTimerRef.current) clearTimeout(successTimerRef.current);
  }, []);

  const handleSelect = async (srv) => {
    if (loadingId || successId) return; // evitar doble click mientras carga
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

    setLoadingId(null);

    if (!result.success) {
      setError(result.error || 'No se pudo seleccionar el servicio');
      setShake(true);
      if (shakeTimerRef.current) clearTimeout(shakeTimerRef.current);
      shakeTimerRef.current = setTimeout(() => setShake(false), 400);
      return;
    }

    // Paso 2 exitoso: mismo pequeño efecto de bienvenida que en el Login
    // antes de subir userData (con JWT final ya guardado) al padre.
    localStorage.setItem('sgt_servicio_activo_nombre', srv.nombre);
    setSuccessId(srv.servicioId);
    successTimerRef.current = setTimeout(() => {
      onServiceSelected(result.userData);
    }, 450);
  };

  return (
    <div
      className="login-gradient-bg"
      style={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column', padding: 24, overflow: 'hidden' }}
    >
      {/* Formas decorativas flotantes — mismo tratamiento que el Login */}
      <div className="login-blob" style={{ width: 200, height: 200, top: -70, right: -60, animationDelay: '0s' }} aria-hidden="true" />
      <div className="login-blob" style={{ width: 140, height: 140, bottom: -50, left: -40, animationDelay: '1.2s' }} aria-hidden="true" />

      <div className="login-logo-pop" style={{ position: 'relative', display: 'flex', alignItems: 'flex-start', gap: 12, justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ minWidth: 0 }}>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#fff', textShadow: '0 2px 8px rgba(0,0,0,0.15)' }}>Selecciona un servicio</h2>
          <p style={{ margin: '6px 0 0', fontSize: 13.5, color: 'rgba(255,255,255,0.85)', fontWeight: 600 }}>
            Elige el área de trabajo a la que deseas ingresar hoy.
          </p>
        </div>

        <button
          onClick={onLogout}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            height: 36, padding: '0 12px', borderRadius: 10,
            border: 'none', background: 'rgba(255,255,255,0.18)',
            color: '#fff', fontSize: 12, fontWeight: 800,
            cursor: 'pointer', flexShrink: 0
          }}
        >
          <SGTIcon name="close" size={15} color="#fff" />
          Salir
        </button>
      </div>

      <div
        className={`login-card-in ${shake ? 'login-shake' : ''}`}
        style={{
          position: 'relative', flex: 1, minHeight: 0, background: '#fff', borderRadius: 20,
          padding: 20, boxShadow: '0 16px 40px rgba(15,23,42,0.22)',
          overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12,
        }}
      >

        {servicios.map((srv) => {
          const isLoading = loadingId === srv.servicioId;
          const isSuccess = successId === srv.servicioId;
          const disabled = !!loadingId || !!successId;
          return (
            <button
              key={srv.servicioId}
              onClick={() => handleSelect(srv)}
              disabled={disabled}
              style={{
                display: 'flex', alignItems: 'center', gap: 14,
                background: isSuccess ? PA.successSoft : '#fff',
                border: `1px solid ${isSuccess ? PA.success : PA.line}`, borderRadius: 14, padding: 16,
                cursor: disabled ? 'not-allowed' : 'pointer', textAlign: 'left',
                transition: 'all 0.2s ease', boxShadow: '0 2px 8px rgba(15,23,42,0.04)',
                opacity: disabled && !isLoading && !isSuccess ? 0.5 : 1
              }}
            >
              <div style={{
                width: 44, height: 44, borderRadius: 12,
                background: isSuccess ? PA.success : PA.primarySoft,
                display: 'grid', placeItems: 'center', color: isSuccess ? '#fff' : PA.primary, flexShrink: 0,
                transition: 'background 0.2s ease',
              }}>
                <SGTIcon name={isSuccess ? 'check-circle' : 'briefcase'} size={20} color={isSuccess ? '#fff' : PA.primary} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: PA.ink }}>{srv.nombre}</div>
                <div style={{ fontSize: 13, color: PA.ink3, fontWeight: 600, marginTop: 4 }}>{srv.rol}</div>
              </div>
              {isSuccess ? (
                <span style={{ fontSize: 12, color: PA.success, fontWeight: 800 }}>¡Listo!</span>
              ) : isLoading ? (
                <span className="login-spinner" style={{ borderColor: 'rgba(23,65,108,0.2)', borderTopColor: PA.primary }} aria-hidden="true" />
              ) : (
                <SGTIcon name="chevron-right" size={18} color={PA.ink3} strokeWidth={2.5} />
              )}
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
