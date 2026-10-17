// Diálogo de confirmación del modo desktop (R18) para el grupo de turnos y
// solicitudes: centrado en la ventana, sobre cualquier panel lateral.
//
// Escape cancela SOLO este diálogo (se escucha en captura y no se propaga, para
// que el panel lateral de abajo no se cierre también). Mientras `ocupado`, ni
// Escape ni el fondo lo cierran.
import React, { useEffect, useId, useRef } from 'react';
import './turnos.css';
import { BotonDesktop } from '../ui';

const ConfirmacionDesktop = ({
  titulo, children, tono = 'primario',
  etiquetaConfirmar = 'Confirmar', etiquetaCancelar = 'Cancelar',
  ocupado = false, onConfirmar, onCancelar,
}) => {
  const idTitulo = useId();
  const cancelarRef = useRef(null);
  const estado = useRef({ ocupado, onCancelar });
  estado.current = { ocupado, onCancelar };

  useEffect(() => {
    cancelarRef.current?.focus();
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      e.stopImmediatePropagation();
      if (!estado.current.ocupado) estado.current.onCancelar?.();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, []);

  return (
    <div className="sgt-dt-confirmacion">
      <div className="sgt-dt-confirmacion__fondo" onClick={ocupado ? undefined : onCancelar} />
      <div className="sgt-dt-confirmacion__tarjeta" role="alertdialog" aria-modal="true" aria-labelledby={idTitulo}>
        <div id={idTitulo} className="sgt-dt-confirmacion__titulo">{titulo}</div>
        <div className="sgt-dt-confirmacion__texto">{children}</div>
        <div className="sgt-dt-acciones" style={{ marginTop: 16 }}>
          <button ref={cancelarRef} type="button" className="sgt-d-btn sgt-d-btn--secundario" onClick={onCancelar} disabled={ocupado}>
            {etiquetaCancelar}
          </button>
          <BotonDesktop variante={tono === 'peligro' ? 'peligro-solido' : 'primario'} onClick={onConfirmar} disabled={ocupado}>
            {ocupado ? 'Guardando…' : etiquetaConfirmar}
          </BotonDesktop>
        </div>
      </div>
    </div>
  );
};

export default ConfirmacionDesktop;
