// Asistente "Nueva solicitud" — presentación desktop (R18), en panel lateral.
//
// El estado del asistente (paso, tipo, formulario, pickers, cargas) y el envío
// viven en CrearSolicitudSheet (SolicitudesView.jsx), con las mismas reglas que
// el móvil (R12, R14, R15). Aquí solo se dibuja: paso 1 (tipo), paso 2
// (formulario) y paso 3 (lista para elegir un turno o una persona).
import React, { useState } from 'react';
import './turnos.css';
import { SGTIcon } from '../../Style/UIPrimitives';
import { AvisoDesktop, BotonDesktop, BuscadorDesktop, CampoDesktop, EstadoVacioDesktop } from '../ui';

const normalizar = (t) => String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

const PasoTipo = ({ tipos, onElegir }) => (
  <div className="sgt-dt-asistente__cuerpo">
    <p className="sgt-dt-asistente__ayuda">¿Qué tipo de solicitud necesitas?</p>
    <div className="sgt-dt-tipos">
      {tipos.map((t) => (
        <button key={t.id} type="button" className="sgt-dt-tipo" style={{ borderLeftColor: t.color }} onClick={() => onElegir(t.id)}>
          <span className="sgt-dt-tipo__icono" aria-hidden="true">
            <SGTIcon name={t.icon} size={17} strokeWidth={2.2} />
          </span>
          <span className="sgt-dt-tipo__texto">
            <span className="sgt-dt-tipo__titulo">{t.label}</span>
            <span className="sgt-dt-tipo__detalle">{t.desc}</span>
          </span>
          <SGTIcon name="chevron-right" size={14} color="var(--ink3)" />
        </button>
      ))}
    </div>
  </div>
);

// Botón con aspecto de campo que abre la lista del paso 3. Su nombre accesible
// junta la etiqueta y el valor ("Turno a cubrir: Seleccionar turno disponible").
const Selector = ({ id, etiqueta, valor, placeholder, onAbrir }) => (
  <button
    id={id}
    type="button"
    className={`sgt-dt-selector${valor ? ' sgt-dt-selector--lleno' : ''}`}
    onClick={onAbrir}
    aria-label={`${String(etiqueta).replace(/\s*\*$/, '')}: ${valor || placeholder}`}
  >
    <span className="sgt-dt-selector__valor">{valor || placeholder}</span>
    <SGTIcon name="chevron-right" size={14} color="var(--ink3)" />
  </button>
);

const PasoFormulario = ({ campos, cargandoOpciones, motivo, onMotivo, error }) => (
  <div className="sgt-dt-asistente__cuerpo">
    {cargandoOpciones && <div className="sgt-dt-asistente__ayuda" role="status">Cargando opciones...</div>}
    <div className="sgt-d-formulario" style={{ '--d-columnas-form': 1 }}>
      {campos.map((c) => (
        <CampoDesktop key={c.clave} etiqueta={c.etiqueta} htmlFor={c.tipo === 'fecha' ? `sgt-dt-campo-${c.clave}` : undefined} ayuda={c.ayuda}>
          {c.tipo === 'fecha' ? (
            <input
              id={`sgt-dt-campo-${c.clave}`}
              type="date"
              className="sgt-d-input"
              value={c.valor || ''}
              min={c.min}
              max={c.max}
              onChange={(e) => c.onFecha(e.target.value)}
              required
            />
          ) : (
            <Selector id={`sgt-dt-campo-${c.clave}`} etiqueta={c.etiqueta} valor={c.valor} placeholder={c.placeholder} onAbrir={c.onAbrir} />
          )}
          {c.nota && <div className="sgt-d-campo__ayuda" style={{ marginTop: 2 }}>{c.nota}</div>}
        </CampoDesktop>
      ))}
      <CampoDesktop etiqueta="Motivo" htmlFor="sgt-dt-campo-motivo">
        <textarea
          id="sgt-dt-campo-motivo"
          className="sgt-d-textarea"
          rows={3}
          value={motivo}
          onChange={(e) => onMotivo(e.target.value)}
          placeholder="Describe el motivo..."
        />
      </CampoDesktop>
    </div>
    {error && <AvisoDesktop tono="alerta"><span role="alert">{error}</span></AvisoDesktop>}
  </div>
);

const PasoLista = ({ picker }) => {
  const [filtro, setFiltro] = useState('');
  const q = normalizar(filtro.trim());
  const items = q ? picker.items.filter((i) => normalizar(`${i.principal} ${i.secundario}`).includes(q)) : picker.items;
  return (
    <div className="sgt-dt-asistente__cuerpo">
      {picker.items.length > 6 && (
        <BuscadorDesktop value={filtro} onChange={setFiltro} placeholder={picker.placeholderBusqueda} />
      )}
      {picker.cargando ? (
        <div className="sgt-dt-opciones-lista" aria-busy="true">
          {[70, 55].map((w) => <div key={w} className="sgt-dt-opcion-lista"><div className="sgt-d-cargando" style={{ width: `${w}%` }} /></div>)}
        </div>
      ) : items.length === 0 ? (
        <EstadoVacioDesktop icono="search" titulo="Sin opciones" texto={q ? 'Nada coincide con la búsqueda.' : 'No hay opciones disponibles.'} />
      ) : (
        <div className="sgt-dt-opciones-lista" role="list">
          {items.map((i) => (
            <button key={i.clave} type="button" role="listitem" className="sgt-dt-opcion-lista" onClick={() => picker.onElegir(i.item)}>
              <span style={{ minWidth: 0, flex: 1 }}>
                <span className="sgt-dt-opcion-lista__principal">{i.principal}</span>
                {i.secundario && <span className="sgt-dt-opcion-lista__secundario">{i.secundario}</span>}
              </span>
              <SGTIcon name="chevron-right" size={14} color="var(--ink3)" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const NuevaSolicitudDesktop = ({
  paso, tipos, onElegirTipo,
  tipoEtiqueta, onVolverATipos,
  campos, cargandoOpciones, motivo, onMotivo, error,
  enviando, onEnviar, onCancelar,
  picker,
}) => (
  <div className="sgt-dt-asistente">
    <ol className="sgt-dt-pasos" aria-label="Pasos">
      {['Tipo', 'Detalle', 'Elegir'].map((nombre, i) => (
        <li key={nombre} className={`sgt-dt-paso${paso === i + 1 ? ' sgt-dt-paso--activo' : ''}${paso > i + 1 ? ' sgt-dt-paso--hecho' : ''}`}
          aria-current={paso === i + 1 ? 'step' : undefined}>
          <span className="sgt-dt-paso__num">{paso > i + 1 ? <SGTIcon name="check" size={10} strokeWidth={3} /> : i + 1}</span>
          {nombre}
        </li>
      ))}
    </ol>

    {paso === 2 && (
      <div className="sgt-dt-asistente__volver">
        <BotonDesktop variante="fantasma" tamano="sm" icono="chevron-left" onClick={onVolverATipos}>{tipoEtiqueta}</BotonDesktop>
      </div>
    )}
    {paso === 3 && picker && (
      <div className="sgt-dt-asistente__volver">
        <BotonDesktop variante="fantasma" tamano="sm" icono="chevron-left" onClick={picker.onVolver}>Volver</BotonDesktop>
      </div>
    )}

    {paso === 1 && <PasoTipo tipos={tipos} onElegir={onElegirTipo} />}
    {paso === 2 && (
      <PasoFormulario campos={campos} cargandoOpciones={cargandoOpciones} motivo={motivo} onMotivo={onMotivo} error={error} />
    )}
    {paso === 3 && picker && <PasoLista key={picker.clave} picker={picker} />}

    {paso === 2 && (
      <div className="sgt-dt-asistente__pie">
        <BotonDesktop variante="secundario" onClick={onCancelar} disabled={enviando}>Cancelar</BotonDesktop>
        <BotonDesktop variante="primario" icono="check" onClick={onEnviar} disabled={enviando}>
          {enviando ? 'Enviando...' : 'Enviar solicitud'}
        </BotonDesktop>
      </div>
    )}
  </div>
);

export default NuevaSolicitudDesktop;
