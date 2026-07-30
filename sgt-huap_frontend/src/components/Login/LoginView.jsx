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

// onLoginSuccess(response) — Prop4 decide si pasa a SelectServiceView o a la vista de aviso
const LoginView = ({ onLoginSuccess }) => {
  const PA = SGT_DATA.PALETTE;

  const [rutDisplay, setRutDisplay] = useState('');
  const [rutClean, setRutClean] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [shake, setShake] = useState(false);

  const rutRef = useRef(null);
  const shakeTimerRef = useRef(null);
  const successTimerRef = useRef(null);

  useEffect(() => {
    rutRef.current?.focus();
    return () => {
      if (shakeTimerRef.current) clearTimeout(shakeTimerRef.current);
      if (successTimerRef.current) clearTimeout(successTimerRef.current);
    };
  }, []);

  const triggerShake = (message) => {
    setError(message);
    setShake(true);
    if (shakeTimerRef.current) clearTimeout(shakeTimerRef.current);
    shakeTimerRef.current = setTimeout(() => setShake(false), 400);
  };

  const handleRutChange = (e) => {
    const clean = cleanRut(e.target.value);
    setRutClean(clean);
    setRutDisplay(formatRutDisplay(clean));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!rutClean || rutClean.length < 2) {
      triggerShake('Ingresa un RUT válido');
      rutRef.current?.focus();
      return;
    }
    const nums = rutClean.slice(0, -1);
    if (nums.length < 7) {
      triggerShake('RUT incompleto');
      rutRef.current?.focus();
      return;
    }
    if (!password) {
      triggerShake('Ingresa tu contraseña');
      return;
    }

    setLoading(true);
    const rutParam = buildRutParam(rutClean);
    const result = await login(rutParam, password);
    setLoading(false);

    if (!result.success) {
      triggerShake(result.error || 'Credenciales inválidas');
      return;
    }

    // Pequeño efecto de bienvenida antes de continuar el flujo real (paso 1
    // exitoso sube la respuesta al padre, que decide la siguiente pantalla).
    setSuccess(true);
    successTimerRef.current = setTimeout(() => {
      onLoginSuccess(result);
    }, 550);
  };

  return (
    <div
      className="login-gradient-bg"
      style={{
        position: 'relative', flex: 1, display: 'flex', flexDirection: 'column',
        padding: 24, justifyContent: 'center', overflow: 'hidden',
      }}
    >
      {/* Formas decorativas flotantes — puramente cosméticas */}
      <div className="login-blob" style={{ width: 220, height: 220, top: -70, right: -60, animationDelay: '0s' }} aria-hidden="true" />
      <div className="login-blob" style={{ width: 150, height: 150, bottom: -50, left: -40, animationDelay: '1.2s' }} aria-hidden="true" />
      <div className="login-blob" style={{ width: 90, height: 90, top: '18%', left: '8%', animationDelay: '2.4s', background: 'rgba(255,255,255,0.09)' }} aria-hidden="true" />

      {/* Logo y Encabezado — sobre el degradado, en blanco */}
      <div className="login-logo-pop" style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 28 }}>
        <div style={{ background: '#fff', borderRadius: 20, padding: 14, boxShadow: '0 10px 24px rgba(15,23,42,0.25)', marginBottom: 18 }}>
          <img src={huapLogo} alt="Logo HUAP" style={{ width: 82, height: 'auto', display: 'block' }} />
        </div>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#fff', textAlign: 'center', textShadow: '0 2px 8px rgba(0,0,0,0.15)' }}>
          Sistema de Gestión de Turnos
        </h1>
        <p style={{ margin: '6px 0 0', fontSize: 13.5, color: 'rgba(255,255,255,0.85)', fontWeight: 600, textAlign: 'center' }}>
          Ingresa tus credenciales para continuar
        </p>
      </div>

      {/* Tarjeta del formulario */}
      <div
        className={`login-card-in ${shake ? 'login-shake' : ''}`}
        style={{
          position: 'relative', background: '#fff', borderRadius: 20, padding: 24,
          boxShadow: '0 16px 40px rgba(15,23,42,0.22)',
        }}
      >
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
                className="sgt-login-input"
                type="text"
                inputMode="text"
                autoComplete="username"
                placeholder="Ej: 12.345.678-9"
                value={rutDisplay}
                onChange={handleRutChange}
                disabled={loading}
                style={{
                  width: '100%', boxSizing: 'border-box', background: '#fff', border: `1px solid ${PA.line}`,
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
                className="sgt-login-input"
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
          {error && !success && (
            <div style={{
              background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10,
              padding: '10px 14px', fontSize: 13, fontWeight: 600, color: '#B91C1C'
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || success}
            style={{
              marginTop: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              background: success ? PA.success : loading ? PA.ink3 : PA.primary, color: '#fff', border: 'none',
              padding: '16px', borderRadius: 12, fontSize: 16, fontWeight: 800,
              cursor: (loading || success) ? 'not-allowed' : 'pointer',
              boxShadow: `0 4px 14px ${success ? 'rgba(46,125,87,0.32)' : 'rgba(23, 65, 108, 0.25)'}`,
              transition: 'background 0.25s ease, box-shadow 0.25s ease'
            }}
          >
            {success ? (
              <>
                <span className="login-check-pop" style={{ display: 'inline-flex' }}>
                  <SGTIcon name="check-circle" size={18} color="#fff" />
                </span>
                ¡Bienvenido!
              </>
            ) : loading ? (
              <>
                <span className="login-spinner" aria-hidden="true" />
                Verificando...
              </>
            ) : (
              'Iniciar Sesión'
            )}
          </button>

        </form>
      </div>
    </div>
  );
};

export default LoginView;
