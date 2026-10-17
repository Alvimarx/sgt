// Marco de las pantallas de entrada en desktop (R18): login, elección de
// servicio y registro pendiente. Pantalla completa dividida: a la izquierda el
// panel de marca con el degradado institucional (el mismo del login móvil) y a
// la derecha el formulario en una tarjeta. Solo presentación: cada vista sigue
// teniendo su lógica y sus textos.
import React from 'react';
import { SGTIcon } from '../../Style/UIPrimitives';
import huapLogo from '../../../assets/huap_logo.png';
import './gestion.css';

const RASGOS = [
  { icono: 'calendar', texto: 'Turnos y cobertura de cada servicio' },
  { icono: 'swap', texto: 'Solicitudes, intercambios y ofertas' },
  { icono: 'history', texto: 'Bitácora de todos los cambios' },
];

export const MarcoEntradaDesktop = ({ children }) => (
  <div className="sgt-dg-entrada">
    <aside className="sgt-dg-entrada__marca login-gradient-bg" aria-label="Sistema de Gestión de Turnos">
      {/* Formas decorativas: las mismas del login móvil, solo cosméticas. */}
      <div className="login-blob" style={{ width: 300, height: 300, top: -110, right: -90, animationDelay: '0s' }} aria-hidden="true" />
      <div className="login-blob" style={{ width: 190, height: 190, bottom: -70, left: -60, animationDelay: '1.2s' }} aria-hidden="true" />
      <div className="login-blob" style={{ width: 90, height: 90, top: '58%', right: '12%', animationDelay: '2.4s', background: 'rgba(255,255,255,0.09)' }} aria-hidden="true" />

      <div className="sgt-dg-entrada__marca-arriba">
        <span className="sgt-dg-entrada__sello" aria-hidden="true">S</span>
        SGT · HUAP
      </div>

      <div className="sgt-dg-entrada__marca-centro login-logo-pop">
        <div className="sgt-dg-entrada__logo">
          <img src={huapLogo} alt="Logo HUAP" />
        </div>
        <h1 className="sgt-dg-entrada__titulo">Sistema de Gestión de Turnos</h1>
        <p className="sgt-dg-entrada__hospital">Hospital de Urgencia Asistencia Pública</p>
        <ul className="sgt-dg-entrada__rasgos">
          {RASGOS.map((r) => (
            <li key={r.icono} className="sgt-dg-entrada__rasgo">
              <span className="sgt-dg-entrada__rasgo-icono" aria-hidden="true">
                <SGTIcon name={r.icono} size={14} color="#fff" strokeWidth={2.2} />
              </span>
              {r.texto}
            </li>
          ))}
        </ul>
      </div>

      <div className="sgt-dg-entrada__pie">Uso interno del personal del hospital</div>
    </aside>

    <main className="sgt-dg-entrada__zona">{children}</main>
  </div>
);

// Candado para el campo de contraseña (no está en el set de SGTIcon).
export const IconoCandado = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="4" y="11" width="16" height="10" rx="2" />
    <path d="M8 11V7a4 4 0 0 1 8 0v4" />
  </svg>
);
