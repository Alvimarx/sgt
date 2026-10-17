// Buscador de funcionario con lista de resultados, para los formularios de
// Asignación de funcionarios y Jerarquía del servicio en desktop (R18).
//
// Solo presentación: la búsqueda, el filtrado, la selección y el cierre al
// hacer clic afuera (wrapperRef) siguen siendo los de cada vista. A diferencia
// del móvil, en desktop no se usa la capa fija transparente para cerrar la
// lista (taparía el menú lateral): basta el listener de clic afuera de la
// vista. Suma teclado: flechas para recorrer, Enter para elegir y Escape para
// cerrar.
import React, { useState } from 'react';
import { SGTIcon } from '../../Style/UIPrimitives';
import './gestion.css';

// resultados: [{ clave, nombre, detalle, iniciales, seleccionado, onElegir }]
export const BusquedaFuncionarioDesktop = ({
  id, listaId, etiqueta, placeholder, valor, onChange, onFocus, onCerrar,
  disabled, abierto, resultados, vacio, ayuda, wrapperRef, maxLength,
}) => {
  const [activo, setActivo] = useState(-1);
  const indiceActivo = abierto && activo < resultados.length ? activo : -1;

  const onKeyDown = (e) => {
    if (!abierto) return;
    if (e.key === 'ArrowDown' && resultados.length > 0) {
      e.preventDefault();
      setActivo((i) => (i + 1) % resultados.length);
    } else if (e.key === 'ArrowUp' && resultados.length > 0) {
      e.preventDefault();
      setActivo((i) => (i <= 0 ? resultados.length - 1 : i - 1));
    } else if (e.key === 'Enter' && indiceActivo >= 0) {
      e.preventDefault();
      resultados[indiceActivo].onElegir();
      setActivo(-1);
    } else if (e.key === 'Escape') {
      onCerrar?.();
      setActivo(-1);
    }
  };

  return (
    <div className="sgt-d-campo" ref={wrapperRef}>
      <label className="sgt-d-campo__etiqueta" htmlFor={id}>{etiqueta}</label>
      <div className="sgt-dg-busqueda">
        <div className="sgt-d-buscador" style={{ minWidth: 0 }}>
          <span className="sgt-d-buscador__icono"><SGTIcon name="search" size={14} /></span>
          <input
            id={id}
            type="search"
            className="sgt-d-input"
            autoComplete="off"
            maxLength={maxLength}
            placeholder={placeholder}
            value={valor}
            disabled={disabled}
            onChange={(e) => { setActivo(-1); onChange(e); }}
            onFocus={onFocus}
            onKeyDown={onKeyDown}
            role="combobox"
            aria-autocomplete="list"
            aria-controls={listaId}
            aria-expanded={abierto}
            aria-activedescendant={indiceActivo >= 0 ? `${listaId}-${indiceActivo}` : undefined}
          />
        </div>
        {abierto && (
          <div id={listaId} role="listbox" className="sgt-dg-resultados" aria-label="Resultados de la búsqueda">
            {resultados.length > 0 ? resultados.map((r, i) => (
              <button
                key={r.clave}
                id={`${listaId}-${i}`}
                type="button"
                role="option"
                tabIndex={-1}
                aria-selected={Boolean(r.seleccionado)}
                className={`sgt-dg-resultado${i === indiceActivo ? ' sgt-dg-resultado--activo' : ''}`}
                onMouseEnter={() => setActivo(i)}
                onClick={() => { r.onElegir(); setActivo(-1); }}
              >
                <span className="sgt-dg-resultado__avatar" aria-hidden="true">{r.iniciales}</span>
                <span style={{ minWidth: 0 }}>
                  <span className="sgt-dg-resultado__nombre">{r.nombre}</span>
                  {r.detalle && <span className="sgt-dg-sec">{r.detalle}</span>}
                </span>
                {r.seleccionado && (
                  <span style={{ marginLeft: 'auto', display: 'grid' }} aria-hidden="true">
                    <SGTIcon name="check" size={14} color="var(--primary)" strokeWidth={2.6} />
                  </span>
                )}
              </button>
            )) : (
              <div className="sgt-dg-resultados__vacio">{vacio}</div>
            )}
          </div>
        )}
      </div>
      {ayuda}
    </div>
  );
};
