// Piezas de presentación del modo desktop (R18) para PLANIFICACIÓN Y ROTATIVAS.
//
// Solo dibujan: la carga, las validaciones y las llamadas al backend siguen en
// Planificacion.jsx y PlantillasView.jsx (una sola lógica por pantalla). Clases
// con prefijo sgt-dp- (planificacion.css), que el layout móvil no usa.
import React, { useEffect, useId, useRef } from 'react';
import { SGTIcon } from '../../Style/UIPrimitives';
import { BotonDesktop } from '../ui';
import { DIAS_CORTOS } from './formato';
import './planificacion.css';

const cx = (...clases) => clases.filter(Boolean).join(' ');

// Bloque "☀ Día 15/15" de una celda (como en el calendario y el Centro).
export const BloqueTipo = ({ tono, nombre, detalle, cobertura, completo, className, title }) => (
  <span className={cx('sgt-dp-bloque', `sgt-dp-bloque--${tono?.clase || 'dia'}`, className)} style={tono?.estilo} title={title}>
    <SGTIcon name={tono?.icono || 'sun'} size={10} strokeWidth={2.4} />
    <span className="sgt-dp-bloque__nombre">{nombre}</span>
    {detalle && <span className="sgt-dp-bloque__detalle">{detalle}</span>}
    {cobertura != null && (
      <span className={cx('sgt-dp-bloque__cob', completo ? 'sgt-dp-bloque__cob--ok' : 'sgt-dp-bloque__cob--falta')}>{cobertura}</span>
    )}
  </span>
);

// ── Grilla de semanas × 7 días (ciclo del molde, vista previa, secuencia) ────
// renderDia(diaIndex, posicionEnSemana) dibuja cada celda.
export const GrillaSemanas = ({ semanas, renderDia, etiquetaSemana = (w) => `Semana ${w + 1}`, className, ariaLabel }) => (
  <div className={cx('sgt-dp-semanas', className)} role="group" aria-label={ariaLabel}>
    <span className="sgt-dp-semanas__esquina" aria-hidden="true" />
    {DIAS_CORTOS.map((d, i) => (
      <span key={d} className={cx('sgt-dp-semanas__cabecera', i >= 5 && 'sgt-dp-semanas__cabecera--finde')} aria-hidden="true">{d}</span>
    ))}
    {Array.from({ length: Math.max(0, semanas) }, (_, w) => (
      <React.Fragment key={w}>
        <span className="sgt-dp-semanas__semana">{etiquetaSemana(w)}</span>
        {Array.from({ length: 7 }, (_, d) => (
          <React.Fragment key={d}>{renderDia(w * 7 + d, d, w)}</React.Fragment>
        ))}
      </React.Fragment>
    ))}
  </div>
);

// ── Formulario dentro de un panel lateral: cuerpo + pie fijo abajo ───────────
export const FormularioPanel = ({ children, pie, className }) => (
  <div className={cx('sgt-dp-form', className)}>
    <div className="sgt-dp-form__cuerpo">{children}</div>
    {pie && <div className="sgt-dp-form__pie">{pie}</div>}
  </div>
);

// ── Diálogo de confirmación centrado en la ventana ───────────────────────────
// Escape cancela SOLO este diálogo (se escucha en captura y no se propaga: el
// panel lateral de abajo no se cierra). Mientras `ocupado`, ni Escape ni el
// fondo lo cierran. El foco parte en Cancelar.
export const ConfirmacionPlan = ({
  titulo, children, icono, tono = 'primario',
  etiquetaConfirmar = 'Confirmar', etiquetaCancelar = 'Cancelar', etiquetaOcupado,
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

  const peligro = tono === 'peligro';
  return (
    <div className="sgt-dp-confirmacion">
      <div className="sgt-dp-confirmacion__fondo" onClick={ocupado ? undefined : onCancelar} />
      <div className="sgt-dp-confirmacion__tarjeta" role="alertdialog" aria-modal="true" aria-labelledby={idTitulo}>
        <div className="sgt-dp-confirmacion__cabecera">
          {icono && (
            <span className={cx('sgt-dp-confirmacion__icono', peligro && 'sgt-dp-confirmacion__icono--peligro')} aria-hidden="true">
              {typeof icono === 'string' ? <SGTIcon name={icono} size={16} strokeWidth={2.2} /> : icono}
            </span>
          )}
          <div id={idTitulo} className="sgt-dp-confirmacion__titulo">{titulo}</div>
        </div>
        <div className="sgt-dp-confirmacion__texto">{children}</div>
        <div className="sgt-dp-acciones" style={{ marginTop: 16 }}>
          <button ref={cancelarRef} type="button" className="sgt-d-btn sgt-d-btn--secundario" onClick={onCancelar} disabled={ocupado}>
            {etiquetaCancelar}
          </button>
          <BotonDesktop variante={peligro ? 'peligro-solido' : 'primario'} onClick={onConfirmar} disabled={ocupado}>
            {ocupado ? (etiquetaOcupado || 'Procesando…') : etiquetaConfirmar}
          </BotonDesktop>
        </div>
      </div>
    </div>
  );
};

// Aviso con botón para cerrarlo (errores que quedan hasta que se descartan).
export const AvisoCerrable = ({ tono = 'alerta', children, onCerrar }) => (
  <div className={cx('sgt-d-aviso', `sgt-d-aviso--${tono}`, 'sgt-dp-aviso')} role="alert">
    <SGTIcon name="alert" size={14} strokeWidth={2.2} />
    <span className="sgt-dp-aviso__texto">{children}</span>
    {onCerrar && (
      <button type="button" className="sgt-dp-aviso__cerrar" onClick={onCerrar} aria-label="Cerrar mensaje">
        <SGTIcon name="close" size={13} strokeWidth={2.4} />
      </button>
    )}
  </div>
);

// Mensaje breve que flota abajo (lo que en el móvil es la franja verde). La
// zona viva existe siempre para que el lector de pantalla anuncie el cambio.
export const AvisoFlotante = ({ children }) => (
  <div className="sgt-dp-toast-zona" role="status" aria-live="polite">
    {children ? (
      <div className="sgt-dp-toast">
        <SGTIcon name="check-circle" size={14} color="#fff" strokeWidth={2.4} />
        <span>{children}</span>
      </div>
    ) : null}
  </div>
);
