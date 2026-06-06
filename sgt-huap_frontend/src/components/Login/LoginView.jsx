// LoginView.jsx
import React, { useState, useRef, useEffect } from 'react';
import { SGT_DATA } from '../Admin2/data';
import { SGTIcon } from '../Style/UIPrimitives';
import { login } from '../../services/authService';
import huapLogo from "../../assets/huap_logo.png";

// Deja solo dígitos y K mayúscula
function cleanRut(value) {
  return value.toUpperCase().replace(/[^0-9K]/g, '');
}

// Formatea para mostrar: 12.345.678-9
function formatRutDisplay(clean) {
  if (!clean || clean.length < 2) return clean;
  const dv = clean.slice(-1);
  const nums = clean.slice(0, -1);
  if (!nums) return dv;
  const reversed = nums.split('').reverse().join('');
  const chunks = reversed.match(/.{1,3}/g) || [];
  const withDots = chunks.join('.').split('').reverse().join('');
  return `${withDots}-${dv}`;
}

// Arma el RUT para el backend: "12345678-9"
function buildRutParam(clean) {
  const nums = clean.slice(0, -1);
  const dv = clean.slice(-1);
  return `${nums}-${dv}`;
}

// onLoginSuccess({ preAuthToken, servicios }) — Prop4 lo captura y pasa a SelectServiceView
const LoginView = ({ onLoginSuccess }) => {
  const PA = SGT_DATA.PALETTE;

  const [rutDisplay, setRutDisplay] = useState('');
  const [rutClean, setRutClean] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const rutRef = useRef(null);

  useEffect(() => {
    rutRef.current?.focus();
  }, []);

  const handleRutChange = (e) => {
    const clean = cleanRut(e.target.value);
    setRutClean(clean);
    setRutDisplay(formatRutDisplay(clean));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!rutClean || rutClean.length < 2) {
      setError('Ingresa un RUT válido');
      rutRef.current?.focus();
      return;
    }
    const nums = rutClean.slice(0, -1);
    if (nums.length < 7) {
      setError('RUT incompleto');
      rutRef.current?.focus();
      return;
    }
    if (!password) {
      setError('Ingresa tu contraseña');
      return;
    }

    setLoading(true);
    const rutParam = buildRutParam(rutClean);
    const result = await login(rutParam, password);
    setLoading(false);

    if (!result.success) {
      setError(result.error || 'Credenciales inválidas');
      return;
    }

    // Paso 1 exitoso: sube preAuthToken y lista de servicios al padre (Prop4)
    onLoginSuccess({ preAuthToken: result.preAuthToken, servicios: result.servicios });
  };

  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      background: PA.surface2, padding: 24, justifyContent: 'center',
      animation: 'sgtFade .4s ease'
    }}>

      {/* Logo y Encabezado */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 40 }}>
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
            RUT
          </label>
          <div style={{ position: 'relative' }}>
            <div style={{ position: 'absolute', top: 14, left: 14, color: PA.ink3 }}>
              <SGTIcon name="user" size={18} />
            </div>
            <input
              ref={rutRef}
              type="text"
              inputMode="text"
              autoComplete="username"
              placeholder="Ej: 12.345.678-9"
              value={rutDisplay}
              onChange={handleRutChange}
              disabled={loading}
              style={{
                width: '100%', boxSizing: 'border-box', background: '#fff', border: `1px solid ${error && !password ? PA.line : PA.line}`,
                padding: '14px 14px 14px 42px', borderRadius: 12, fontSize: 15, color: PA.ink, outline: 'none',
                fontWeight: 600, fontFamily: 'inherit', opacity: loading ? 0.6 : 1
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
              <SGTIcon name="alert" size={18} />
            </div>
            <input
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              style={{
                width: '100%', boxSizing: 'border-box', background: '#fff', border: `1px solid ${PA.line}`,
                padding: '14px 14px 14px 42px', borderRadius: 12, fontSize: 15, color: PA.ink, outline: 'none',
                fontWeight: 600, fontFamily: 'inherit', opacity: loading ? 0.6 : 1
              }}
            />
          </div>
        </div>

        {/* Mensaje de error */}
        {error && (
          <div style={{
            background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10,
            padding: '10px 14px', fontSize: 13, fontWeight: 600, color: '#B91C1C'
          }}>
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          style={{
            marginTop: 10, background: loading ? PA.ink3 : PA.primary, color: '#fff', border: 'none',
            padding: '16px', borderRadius: 12, fontSize: 16, fontWeight: 800,
            cursor: loading ? 'not-allowed' : 'pointer',
            boxShadow: '0 4px 14px rgba(23, 65, 108, 0.25)', transition: 'background 0.2s ease'
          }}
        >
          {loading ? 'Verificando...' : 'Iniciar Sesión'}
        </button>

      </form>
    </div>
  );
};

export default LoginView;
