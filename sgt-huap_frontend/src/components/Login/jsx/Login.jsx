import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from 'react-router-dom';
import { useAuth, Roles } from '../../../context/AuthContext';
import { login as authLogin, getServiciosPorRut} from '../../../services/authService';
import adminService from '../../../services/adminService';
import '../css/Login.css';
import '../css/movil/Login-Movil.css';
import '../css/tablet/Login-Tablet.css';
import '../css/pc/Login-PC.css';

function formatRut(value) {
  // Keep only digits and K, uppercase; better RUT formatting can be added later
  return value.toUpperCase().replace(/[^0-9K]/g, '');
}

function formatRutDisplay(clean) {
  // clean: only digits and possible trailing K, uppercase
  if (!clean) return '';
  const upper = clean.toUpperCase();
  const dv = upper.slice(-1);
  let nums = upper.slice(0, -1);
  if (nums.length === 0) {
    return dv;
  }
  // insert dots every 3 digits from the right
  let reversed = nums.split('').reverse().join('');
  let chunks = reversed.match(/.{1,3}/g) || [];
  let withDots = chunks.join('.').split('').reverse().join('');
  return withDots + '-' + dv;
}

export default function Login() {
  const [rut, setRut] = useState('');
  // store the internal cleaned rut (digits + possible K) without formatting
  const [rutCleanInternal, setRutCleanInternal] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [remember, setRemember] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [currentLogoIndex, setCurrentLogoIndex] = useState(0);

  const navigate = useNavigate();
  const rutRef = useRef(null);
  const auth = useAuth()

  const logos = [
    '/gif/Caduceus-white.svg',
    '/gif/logo_huap.png'
  ];

  useEffect(() => {
    rutRef.current?.focus();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentLogoIndex((prevIndex) => (prevIndex + 1) % logos.length);
    }, 3000); // Change image every 3 seconds

    return () => clearInterval(interval);
  }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        // Validar RUT
        if (!rut) {
            setError('Por favor ingresa RUT');
            rutRef.current?.focus();
            return;
        }

        // Validar contraseña
        if (!password) {
            setError('Por favor ingresa tu contraseña');
            return;
        }

        // Validar formato de RUT
        const clean = rutCleanInternal || formatRut(rut);
        if (!clean || clean.length < 2) {
            setError('RUT inválido');
            return;
        }

        const nums = clean.slice(0, -1);
        const dv = clean.slice(-1);

        if (nums.length < 7) {
            setError('RUT incompleto');
            return;
        }

        // Construir RUT con formato para el login (ej: 12345678-9)
        const rutParam = `${nums}-${dv}`;
        console.log('Login: enviando credenciales...');

        try {
            // 1. Autenticar credenciales
            const result = await authLogin(rutParam, password);

            if (result.success) {
                console.log('Login exitoso:', result.userData);

                // 2. Verificar multiplicidad de servicios usando solo el cuerpo del RUT (nums)
                const serviciosAsociados = await getServiciosPorRut(nums);

                if (serviciosAsociados && serviciosAsociados.length > 1) {
                    // CASO MULTI-SERVICIO: Guardar datos temporalmente y redirigir al selector
                    console.log('Usuario con múltiples perfiles detectado.');

                    sessionStorage.setItem('pendingUserData', JSON.stringify(result.userData));
                    sessionStorage.setItem('availableServices', JSON.stringify(serviciosAsociados));

                    localStorage.setItem('user_services_list', JSON.stringify(serviciosAsociados));

                    navigate('/seleccionar-servicio');
                } else {
                    // CASO SERVICIO ÚNICO: Proceder con el flujo normal
                    if (auth && typeof auth.updateUser === 'function') {
                        auth.updateUser(result.userData);
                    }

                    // Guardar en localStorage para compatibilidad con código legacy
                    localStorage.setItem('userId', String(result.userData.userId));
                    localStorage.setItem('servicioId', String(result.userData.servicioId));

                    navigate('/calendario');
                }
            } else {
                setError(result.error || 'Credenciales inválidas');
            }
        } catch (err) {
            console.error('Error en login:', err);
            setError('Error de conexión con el servidor');
        }
    };

  const quickLogin = (role) => {
    auth.loginMock({ nombre: role === Roles.MEDICO ? 'Dr. Demo' : 'Jefatura Demo', rol: role, rotativa: 'Rotativa A' })
    navigate('/calendario')
  }

  return (
    <div className="login-page">
      <div className="login-card enhanced" role="main" aria-labelledby="login-title">
        <aside className="login-visual" aria-hidden="true">
          <div className="visual-inner">
            {logos.map((logo, index) => (
              <img
                key={logo}
                src={logo}
                alt="HUAP"
                className={`visual-logo ${index === currentLogoIndex ? 'active' : ''}`}
                style={{
                  position: index === 0 ? 'relative' : 'absolute',
                  top: index === 0 ? 'auto' : '50%',
                  left: index === 0 ? 'auto' : '50%',
                  transform: index === 0 ? 'none' : 'translate(-50%, -50%)'
                }}
              />
            ))}
          </div>
        </aside>

        <section className="login-panel">
          <h1 id="login-title" className="login-title" style={{
            lineHeight: '1.4',
            marginBottom: '24px',
            textAlign: 'center',
            fontSize: 'clamp(18px, 4vw, 24px)'
          }}>
            <span style={{
              fontStyle: 'italic',
              color: '#7f1d1d',
              fontWeight: '600'
            }}>Bienvenido</span> al{' '}
            <span style={{
              fontWeight: '700',
              color: '#991b1b'
            }}>sistema</span> para la{' '}
            <span style={{
              fontWeight: '700',
              color: '#b91c1c'
            }}>gestión de turnos</span> del{' '}
            <span style={{
              fontWeight: '700',
              color: '#dc2626'
            }}>Hospital de Urgencia</span>{' '}
            <span style={{
              fontStyle: 'italic',
              fontWeight: '700',
              color: '#991b1b'
            }}>Asistencia Pública</span>
          </h1>

          <form className="login-form" onSubmit={handleSubmit} noValidate>
            <label htmlFor="rut" className="login-label">RUT</label>
            <input
              id="rut"
              name="rut"
              ref={rutRef}
              inputMode="text"
              autoComplete="username"
              className="login-input"
              value={rut}
              onChange={(e) => {
                // User types into the input which shows the formatted RUT.
                const raw = e.target.value || '';
                const clean = raw.toUpperCase().replace(/[^0-9K]/g, '');
                // update the internal clean value for submission
                setRutCleanInternal(clean);
                // display the formatted version (dots + dash)
                setRut(formatRutDisplay(clean));
              }}
              placeholder="Ej: 12345678K"
              aria-describedby="rut-desc"
            />
            <div id="rut-desc" className="sr-only">Ingrese su RUT sin puntos ni guión</div>

            <label htmlFor="password" className="login-label">Contraseña</label>
            <div className="password-row">
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                className="login-input login-input-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Contraseña"
              />
              <button
                type="button"
                className="show-pass-btn"
                aria-pressed={showPassword}
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                onClick={() => setShowPassword(s => !s)}
              >
                {showPassword ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                    <path d="M3 3l18 18" stroke="#222" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M10.58 10.58A3 3 0 0 0 13.42 13.42" stroke="#222" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M9.88 5.63C11.4 5.24 12.95 5 14.5 5c4 0 7.5 3.5 7.5 7s-3.5 7-7.5 7c-2.01 0-3.9-.6-5.45-1.62" stroke="#222" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z" stroke="#222" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    <circle cx="12" cy="12" r="3" stroke="#222" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </button>
            </div>

            <div className="form-row space-between">
              <label className="remember">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                />
                Recordarme
              </label>

            </div>

            {error && <div role="alert" className="login-error">{error}</div>}

            <button type="submit" className="login-btn">Ingresar</button>
          </form>



          <div className="login-footer small">Acceso autorizado sólo para personal. Contacte a soporte si tiene problemas.</div>
        </section>
      </div>

      {/* Registration Modal */}

    </div>
  );
}


