// Aviso de acción sin permiso (C-20, 17 oct 2026).
//
// Cuando el backend responde 403 (falta el permiso, la sesión es válida),
// axiosConfig emite EVENTO_SIN_PERMISO y este aviso lo muestra unos segundos
// abajo, sin sacar al usuario de la vista: la vista sigue mostrando su propio
// error. Un 401 (sesión inválida o vencida) sigue cerrando la sesión.
// Usa el contenedor .agenda-toast: en móvil queda sobre la barra inferior y en
// desktop se corre junto al menú lateral (desktop.css).
import React, { useEffect, useRef, useState } from 'react';
import { EVENTO_SIN_PERMISO } from '../../utils/axiosConfig';
import { SGTIcon } from './UIPrimitives';

const DURACION_MS = 4500;

const AvisoSinPermiso = () => {
  const [visible, setVisible] = useState(false);
  const temporizador = useRef(null);

  useEffect(() => {
    const alNegar = () => {
      setVisible(true);
      if (temporizador.current) clearTimeout(temporizador.current);
      temporizador.current = setTimeout(() => setVisible(false), DURACION_MS);
    };
    window.addEventListener(EVENTO_SIN_PERMISO, alNegar);
    return () => {
      window.removeEventListener(EVENTO_SIN_PERMISO, alNegar);
      if (temporizador.current) clearTimeout(temporizador.current);
    };
  }, []);

  if (!visible) return null;
  return (
    <div className="agenda-toast" role="status" aria-live="polite">
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 8,
        background: 'rgba(23,65,108,0.96)', color: '#fff', borderRadius: 999,
        padding: '10px 16px', fontSize: 12.5, fontWeight: 700,
        boxShadow: '0 10px 24px rgba(15,23,42,0.2)', maxWidth: 360, textAlign: 'left',
        animation: 'sgtFade .2s ease',
      }}>
        <SGTIcon name="alert" size={15} color="#fff" />
        No tienes permiso para realizar esta acción.
      </div>
    </div>
  );
};

export default AvisoSinPermiso;
