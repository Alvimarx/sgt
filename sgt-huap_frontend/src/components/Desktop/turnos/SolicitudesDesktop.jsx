// Bandeja de solicitudes — presentación desktop (R18).
//
// SolicitudesView.jsx carga, ordena, agrupa (R10) y decide qué acciones tiene
// cada solicitud u oferta con las mismas reglas que el móvil; aquí llega una
// lista de ítems ya resueltos (textos, chips, notas y acciones con su callback).
// Patrón: segmentos + barra de búsqueda/filtro/orden + lista densa a la
// izquierda y el detalle con todas las acciones a la derecha (sgt-d-split).
import React, { useRef } from 'react';
import './turnos.css';
import { SGTIcon } from '../../Style/UIPrimitives';
import {
  AvisoDesktop, BotonDesktop, BuscadorDesktop, CampoDesktop, ChipDesktop, EncabezadoDesktop,
  EstadoVacioDesktop, PaginaDesktop, PanelDesktop, SegmentosDesktop,
} from '../ui';

const iniciales = (nombre) => {
  const partes = String(nombre || '').trim().split(/\s+/).filter(Boolean);
  return ((partes[0]?.[0] || '') + (partes[1]?.[0] || '')).toUpperCase() || '·';
};

// ── Lista ────────────────────────────────────────────────────────────────────
const FilaLista = ({ item, seleccionada, onSeleccionar, registrar }) => (
  <div
    ref={registrar}
    role="option"
    aria-selected={seleccionada}
    tabIndex={seleccionada ? 0 : -1}
    className="sgt-dt-bandeja__fila"
    onClick={() => onSeleccionar(item.key)}
    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSeleccionar(item.key); } }}
  >
    <span className="sgt-dt-bandeja__color" style={{ background: item.color }} aria-hidden="true" />
    <div className="sgt-dt-bandeja__fila-cuerpo">
      <div className="sgt-dt-bandeja__fila-linea">
        <span className="sgt-dt-bandeja__fila-titulo">{item.titulo}</span>
        {item.fecha && <span className="sgt-dt-bandeja__fila-fecha">{item.fecha}</span>}
        {item.chip && <ChipDesktop tono={item.chip.tono} mayus className="sgt-dt-bandeja__fila-chip">{item.chip.texto}</ChipDesktop>}
      </div>
      {item.linea1 && <div className="sgt-dt-bandeja__fila-personas">{item.linea1}</div>}
      {item.linea2 && <div className="sgt-dt-bandeja__fila-turno">{item.linea2}</div>}
    </div>
  </div>
);

const ListaBandeja = ({ items, seleccion, onSeleccionar, cargando, etiqueta }) => {
  const nodos = useRef(new Map());
  const moverA = (indice) => {
    const destino = items[Math.max(0, Math.min(items.length - 1, indice))];
    if (!destino) return;
    onSeleccionar(destino.key);
    requestAnimationFrame(() => nodos.current.get(destino.key)?.focus());
  };
  const onKeyDown = (e) => {
    const actual = items.findIndex((i) => i.key === seleccion);
    if (e.key === 'ArrowDown') { e.preventDefault(); moverA(actual + 1); }
    if (e.key === 'ArrowUp') { e.preventDefault(); moverA(actual - 1); }
    if (e.key === 'Home') { e.preventDefault(); moverA(0); }
    if (e.key === 'End') { e.preventDefault(); moverA(items.length - 1); }
  };

  if (cargando && items.length === 0) {
    return (
      <div className="sgt-dt-bandeja__cargando" aria-busy="true">
        {[78, 62, 70, 54].map((w) => (
          <div key={w} className="sgt-dt-bandeja__esqueleto">
            <div className="sgt-d-cargando" style={{ width: `${w}%` }} />
            <div className="sgt-d-cargando" style={{ width: `${w - 22}%`, height: 10, marginTop: 7 }} />
          </div>
        ))}
      </div>
    );
  }
  return (
    <div role="listbox" aria-label={etiqueta} className="sgt-dt-bandeja__lista" onKeyDown={onKeyDown}>
      {items.map((item) => (
        <FilaLista
          key={item.key}
          item={item}
          seleccionada={item.key === seleccion}
          onSeleccionar={onSeleccionar}
          registrar={(el) => { if (el) nodos.current.set(item.key, el); else nodos.current.delete(item.key); }}
        />
      ))}
    </div>
  );
};

// ── Detalle ──────────────────────────────────────────────────────────────────
const Acciones = ({ acciones, className }) => (acciones?.length ? (
  <div className={`sgt-dt-acciones ${className || ''}`}>
    {acciones.map((a) => (
      <BotonDesktop
        key={a.clave}
        variante={a.variante}
        icono={a.icono}
        tamano={a.tamano}
        onClick={a.onClick}
        disabled={a.disabled}
        className={a.izquierda ? 'sgt-dt-acciones__izq' : undefined}
        aria-label={a.ariaLabel}
      >
        {a.etiqueta}
      </BotonDesktop>
    ))}
  </div>
) : null);

const DetalleItem = ({ item }) => (
  <div className="sgt-dt-detalle-sol">
    <div className="sgt-dt-detalle-sol__cabecera">
      <span className="sgt-dt-detalle-sol__icono" style={{ background: item.colorSuave, color: item.colorTinta }} aria-hidden="true">
        <SGTIcon name={item.icono} size={17} strokeWidth={2.2} />
      </span>
      <div style={{ minWidth: 0, flex: 1 }}>
        <h2 className="sgt-dt-detalle-sol__titulo">{item.tituloDetalle || item.titulo}</h2>
        {item.subtitulo && <div className="sgt-dt-detalle-sol__subtitulo">{item.subtitulo}</div>}
      </div>
      {item.chip && <ChipDesktop tono={item.chip.tono} mayus>{item.chip.texto}</ChipDesktop>}
    </div>

    <div className="sgt-dt-detalle-sol__cuerpo">
      {item.filas?.length > 0 && (
        <dl className="sgt-dt-ficha sgt-dt-ficha--solicitud">
          {item.filas.map((f) => (
            <div key={f.etiqueta} className={`sgt-dt-ficha__fila${f.ancho ? ' sgt-dt-ficha__fila--ancha' : ''}`}>
              <dt>{f.etiqueta}</dt>
              <dd>{f.valor}</dd>
            </div>
          ))}
        </dl>
      )}

      {item.motivo !== undefined && (
        <div className="sgt-dt-motivo">
          <div className="sgt-d-seccion-titulo" style={{ margin: '0 0 3px' }}>Motivo</div>
          <div className="sgt-dt-motivo__texto">{item.motivo || '—'}</div>
        </div>
      )}

      {item.notas?.map((n) => (
        <AvisoDesktop key={n.clave} tono={n.tono}>{n.texto}</AvisoDesktop>
      ))}

      {item.postulantes && (
        <section aria-label={item.postulantesTitulo}>
          <div className="sgt-d-seccion-titulo">{item.postulantesTitulo}</div>
          {item.postulantes.length === 0 ? (
            <div className="sgt-dt-postulantes__vacio">{item.sinPostulantes || 'Sin postulantes aún.'}</div>
          ) : (
            <div className="sgt-dt-postulantes">
              {item.postulantes.map((p) => (
                <div key={p.clave} className="sgt-dt-postulante">
                  <span className="sgt-dt-avatar" aria-hidden="true">{iniciales(p.nombre)}</span>
                  <div className="sgt-dt-postulante__texto">
                    <div className="sgt-dt-postulante__nombre">{p.nombre}</div>
                    {p.detalle && <div className="sgt-dt-postulante__detalle">{p.detalle}</div>}
                    {p.motivo && <div className="sgt-dt-postulante__motivo">“{p.motivo}”</div>}
                  </div>
                  {p.chip && <ChipDesktop tono={p.chip.tono} mayus>{p.chip.texto}</ChipDesktop>}
                  <Acciones acciones={p.acciones} className="sgt-dt-postulante__acciones" />
                </div>
              ))}
            </div>
          )}
          {item.pie && <div className="sgt-dt-detalle-sol__pie">{item.pie}</div>}
        </section>
      )}
    </div>

    <Acciones acciones={item.acciones} className="sgt-dt-detalle-sol__acciones" />
  </div>
);

// ── Vista ────────────────────────────────────────────────────────────────────
const SolicitudesDesktop = ({
  titulo, subtitulo, onNueva,
  pestanas, pestana, onPestana,
  busqueda, onBusqueda, placeholderBusqueda,
  tipos, tipo, onTipo,
  ordenes, orden, onOrden,
  cargando, error,
  tituloLista, subtituloLista, items, seleccion, onSeleccionar,
  vacio, hayFiltros, onLimpiarFiltros,
}) => {
  const itemSel = items.find((i) => i.key === seleccion) || items[0] || null;

  return (
    <>
      <EncabezadoDesktop
        titulo={titulo}
        subtitulo={subtitulo}
        acciones={<BotonDesktop variante="primario" icono="plus" onClick={onNueva}>Nueva solicitud</BotonDesktop>}
      />
      <PaginaDesktop className="sgt-dt-pagina-fija">
        <div className="sgt-d-toolbar">
          <SegmentosDesktop opciones={pestanas} valor={pestana} onChange={onPestana} ariaLabel="Vista de solicitudes" />
          <div className="sgt-d-toolbar__espacio" />
          <BuscadorDesktop value={busqueda} onChange={onBusqueda} placeholder={placeholderBusqueda} style={{ width: 250 }} />
          {tipos && (
            <select className="sgt-d-select sgt-dt-select" aria-label="Tipo de solicitud" value={tipo} onChange={(e) => onTipo(e.target.value)}>
              {tipos.map((t) => <option key={t.id} value={t.id}>{t.etiqueta}</option>)}
            </select>
          )}
          {ordenes && (
            <select className="sgt-d-select sgt-dt-select" aria-label="Ordenar" value={orden} onChange={(e) => onOrden(e.target.value)}>
              {ordenes.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
            </select>
          )}
        </div>

        {error && !cargando && <AvisoDesktop tono="alerta"><span role="alert">{error}</span></AvisoDesktop>}

        {!cargando && items.length === 0 ? (
          <PanelDesktop className="sgt-dt-bandeja__vacia">
            <EstadoVacioDesktop
              icono={hayFiltros ? 'search' : 'check-circle'}
              titulo={hayFiltros ? 'Sin resultados' : vacio.titulo}
              texto={hayFiltros ? 'Nada coincide con la búsqueda o el filtro de tipo.' : vacio.texto}
              accion={hayFiltros ? <BotonDesktop variante="secundario" tamano="sm" onClick={onLimpiarFiltros}>Limpiar filtros</BotonDesktop> : null}
            />
          </PanelDesktop>
        ) : (
          <div className="sgt-d-split sgt-dt-bandeja">
            <PanelDesktop titulo={tituloLista} subtitulo={subtituloLista} sinPadding scroll className="sgt-dt-bandeja__panel-lista">
              <ListaBandeja items={items} seleccion={itemSel?.key} onSeleccionar={onSeleccionar} cargando={cargando} etiqueta={tituloLista} />
            </PanelDesktop>
            <PanelDesktop sinPadding scroll className="sgt-dt-bandeja__panel-detalle" aria-label="Detalle">
              {itemSel ? <DetalleItem key={itemSel.key} item={itemSel} /> : (
                <EstadoVacioDesktop icono="tray" titulo="Cargando…" />
              )}
            </PanelDesktop>
          </div>
        )}
      </PaginaDesktop>
    </>
  );
};

// Contenido del panel "Modificar motivo" (la carga y el guardado viven en EditMotivoSheet).
export const EditarMotivoDesktop = ({ motivo, onMotivo, error, guardando, puedeGuardar, onGuardar, onCancelar }) => (
  <div className="sgt-dt-form">
    <CampoDesktop etiqueta="Motivo" htmlFor="sgt-dt-editar-motivo">
      <textarea
        id="sgt-dt-editar-motivo"
        className="sgt-d-textarea"
        rows={5}
        value={motivo}
        onChange={(e) => onMotivo(e.target.value)}
      />
    </CampoDesktop>
    {error && <AvisoDesktop tono="alerta"><span role="alert">{error}</span></AvisoDesktop>}
    <div className="sgt-dt-acciones">
      <BotonDesktop variante="secundario" onClick={onCancelar} disabled={guardando}>Cancelar</BotonDesktop>
      <BotonDesktop variante="primario" icono="check" onClick={onGuardar} disabled={!puedeGuardar}>
        {guardando ? 'Guardando...' : 'Guardar cambios'}
      </BotonDesktop>
    </div>
  </div>
);

export default SolicitudesDesktop;
