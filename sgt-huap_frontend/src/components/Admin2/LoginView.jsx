// LoginView.jsx
import React, { useState } from 'react';
import { SGT_DATA } from './data';
import { SGTIcon } from './UIPrimitives';

// Ajusta la ruta de la imagen según dónde la guardes en tu proyecto
import huapLogo from "../../assets/huap_logo.png";

const LoginView = ({ onLoginSuccess }) => {
  const PA = SGT_DATA.PALETTE;
  const [rut, setRut] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // ====================================================================
    // 🔴 AQUÍ VA TU MÉTODO DE LOGIN REAL 🔴
    // ====================================================================
    // Ejemplo: 
    // authProvider.login(rut, password)
    //   .then((user) => onLoginSuccess())
    //   .catch((err) => console.error(err));
    // ====================================================================
    
    // Por ahora, como es un mockup, simplemente avanzamos al siguiente paso
    if (rut && password) {
      onLoginSuccess();
    }
  };

  return (
    <div style={{ 
      flex: 1, display: 'flex', flexDirection: 'column', 
      background: PA.surface2, padding: 24, justifyContent: 'center',
      animation: 'sgtFade .4s ease'
    }}>
      
      {/* Logo y Encabezado */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 40 }}>
        {/* Si import huapLogo no funciona, puedes usar src="/huap_logo.png" si está en la carpeta public */}
        <img src={huapLogo} alt="Logo HUAP" style={{ width: 110, height: 'auto', marginBottom: 20 }} />
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: PA.ink, textAlign: 'center' }}>
          Sistema de Gestión de Turnos
        </h1>
        <p style={{ margin: '8px 0 0', fontSize: 14, color: PA.ink3, fontWeight: 600, textAlign: 'center' }}>
          Ingresa tus credenciales para continuar
        </p>
      </div>

      {/* Formulario */}
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={{ fontSize: 12, fontWeight: 800, color: PA.ink2, textTransform: 'uppercase', letterSpacing: 0.5, marginLeft: 4 }}>
            RUT o Correo
          </label>
          <div style={{ position: 'relative' }}>
            <div style={{ position: 'absolute', top: 14, left: 14, color: PA.ink3 }}>
              <SGTIcon name="user" size={18} />
            </div>
            <input 
              type="text" 
              placeholder="Ej: 12.345.678-9"
              value={rut}
              onChange={(e) => setRut(e.target.value)}
              style={{
                width: '100%', boxSizing: 'border-box', background: '#fff', border: `1px solid ${PA.line}`,
                padding: '14px 14px 14px 42px', borderRadius: 12, fontSize: 15, color: PA.ink, outline: 'none',
                fontWeight: 600, fontFamily: 'inherit'
              }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={{ fontSize: 12, fontWeight: 800, color: PA.ink2, textTransform: 'uppercase', letterSpacing: 0.5, marginLeft: 4 }}>
            Contraseña
          </label>
          <div style={{ position: 'relative' }}>
            <div style={{ position: 'absolute', top: 14, left: 14, color: PA.ink3 }}>
              <SGTIcon name="alert" size={18} /> {/* Asumiendo que 'alert' o similar sirve como candado por ahora */}
            </div>
            <input 
              type="password" 
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                width: '100%', boxSizing: 'border-box', background: '#fff', border: `1px solid ${PA.line}`,
                padding: '14px 14px 14px 42px', borderRadius: 12, fontSize: 15, color: PA.ink, outline: 'none',
                fontWeight: 600, fontFamily: 'inherit'
              }}
            />
          </div>
        </div>

        <button type="submit" style={{
          marginTop: 10, background: PA.primary, color: '#fff', border: 'none',
          padding: '16px', borderRadius: 12, fontSize: 16, fontWeight: 800, cursor: 'pointer',
          boxShadow: '0 4px 14px rgba(23, 65, 108, 0.25)', transition: 'transform 0.1s ease'
        }}>
          Iniciar Sesión
        </button>

      </form>
    </div>
  );
};

export default LoginView;