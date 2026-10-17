// Rotativas — presentación desktop de la lista (R18).
//
// PlantillasView.jsx carga las rotativas y los tipos de turno, decide qué hace
// cada acción (editar, eliminar) y calcula el resumen de cada rotativa; aquí
// solo se dibuja. Patrón maestro-detalle: la lista a la izquierda (flechas del
// teclado para recorrerla) y, a la derecha, la secuencia de la elegida en una
// grilla semanas × 7 días con sus horas. "Editar secuencia" abre el editor,
// que es una sub-pantalla con su volver.
import React, { useRef } from 'react';
import { Trash2 } from 'lucide-react';
import { SGTIcon } from '../../Style/UIPrimitives';
import {
  BotonDesktop, ChipDesktop, EncabezadoDesktop, EstadoVacioDesktop, PaginaDesktop, PanelDesktop,
} from '../ui';
import { AvisoCerrable, BloqueTipo, GrillaSemanas } from './piezas';
import { DIAS_LARGOS } from './formato';
import './planificacion.css';

// ── Lista ────────────────────────────────────────────────────────────────────
const ListaRotativas = ({ items, seleccion, onSeleccionar, formatoHoras }) => {
  const nodos = useRef(new Map());
  const moverA = (indice) => {
    const destino = items[Math.max(0, Math.min(items.length - 1, indice))];
    if (!destino) return;
    onSeleccionar(destino.id);
    requestAnimationFrame(() => nodos.current.get(destino.id)?.focus());
  };
  const onKeyDown = (e) => {
    const actual = items.findIndex((i) => i.id === seleccion);
    if (e.key === 'ArrowDown') { e.preventDefault(); moverA(actual + 1); }
    if (e.key === 'ArrowUp') { e.preventDefault(); moverA(actual - 1); }
    if (e.key === 'Home') { e.preventDefault(); moverA(0); }
    if (e.key === 'End') { e.preventDefault(); moverA(items.length - 1); }
  };
  return (
    <div role="listbox" aria-label="Rotativas del servicio" className="sgt-dp-rlista" onKeyDown={onKeyDown}>
      {items.map((r) => {
        const sel = r.id === seleccion;
        return (
          <div
            key={r.id}
            ref={(el) => { if (el) nodos.current.set(r.id, el); else nodos.current.delete(r.id); }}
            role="option"
            aria-selected={sel}
            tabIndex={sel ? 0 : -1}
            className="sgt-dp-rfila"
            onClick={() => onSeleccionar(r.id)}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSeleccionar(r.id); } }}
          >
            <div className="sgt-dp-rfila__titulo">
              <span className="sgt-dp-rfila__nombre">{r.nombre}</span>
              <span className={`sgt-dp-rfila__horas${r.excede ? ' sgt-dp-rfila__horas--excede' : ''}`}>{formatoHoras(r.horasSemana)} h/sem</span>
            </div>
            <div className="sgt-dp-rfila__detalle">{r.semanas} semana{r.semanas === 1 ? '' : 's'} · {r.diasConTurno} días con turno · {r.libres} libres</div>
            <div className="sgt-dp-barra" aria-hidden="true"><span style={{ width: `${r.pct}%` }} /></div>
          </div>
        );
      })}
    </div>
  );
};

// ── Detalle: la secuencia de una rotativa ────────────────────────────────────
const SecuenciaRotativa = ({ rotativa, tipos, tonoTipo, formatoRango }) => {
  const porId = new Map((tipos || []).map((t) => [String(t.idTipoTurno), t]));
  return (
    <GrillaSemanas
      semanas={rotativa.semanas}
      ariaLabel={`Secuencia de ${rotativa.nombre}`}
      renderDia={(di, d, w) => {
        if (di >= rotativa.total) return <span />;
        const ids = rotativa.matriz[di] || [];
        const lista = ids.map((id) => porId.get(String(id))).filter(Boolean);
        const etiqueta = `Semana ${w + 1}, ${DIAS_LARGOS[d]}: ${lista.length ? lista.map((t) => t.nombre).join(' y ') : 'libre'}`;
        return (
          <div className={`sgt-dp-diasec${lista.length ? '' : ' sgt-dp-diasec--libre'}`} role="img" aria-label={etiqueta} title={etiqueta}>
            {lista.length === 0 ? (
              <span className="sgt-dp-diasec__libre">Libre</span>
            ) : lista.map((t) => (
              <BloqueTipo key={t.idTipoTurno} tono={tonoTipo(t)} nombre={t.nombre} detalle={formatoRango(t)} />
            ))}
          </div>
        );
      }}
    />
  );
};

const LeyendaTipos = ({ tipos, tonoTipo, formatoRango }) => (
  <div className="sgt-dp-leyenda">
    {(tipos || []).map((t) => {
      const tono = tonoTipo(t);
      return (
        <span key={t.idTipoTurno} className="sgt-dp-leyenda__item">
          <span className={`sgt-dp-leyenda__muestra sgt-dp-bloque--${tono.clase}`} style={tono.estilo}><SGTIcon name={tono.icono} size={9} strokeWidth={2.6} /></span>
          {t.nombre} {formatoRango(t)}
        </span>
      );
    })}
    <span className="sgt-dp-leyenda__item"><span className="sgt-dp-leyenda__muestra sgt-dp-leyenda__muestra--libre" />Libre</span>
  </div>
);

// ── Vista ────────────────────────────────────────────────────────────────────
const RotativasDesktop = ({
  servicioNombre, items, tipos, cargando, error, onCerrarError,
  seleccion, onSeleccionar, onNueva, onEditar, onEliminar,
  tonoTipo, formatoHoras, formatoRango, horasReferencia,
}) => {
  const sel = items.find((r) => r.id === seleccion) || items[0] || null;
  return (
    <>
      <EncabezadoDesktop
        titulo="Rotativas"
        subtitulo={[servicioNombre, cargando ? 'Cargando…' : `${items.length} rotativa${items.length === 1 ? '' : 's'}: el patrón de turnos por semana que usa la Planificación`].filter(Boolean).join(' · ')}
        acciones={<BotonDesktop variante="primario" icono="plus" onClick={onNueva}>Nueva rotativa</BotonDesktop>}
      />
      <PaginaDesktop llena className="sgt-dp-pagina-fija">
        {error && <AvisoCerrable onCerrar={onCerrarError}>{error}</AvisoCerrable>}

        {cargando && items.length === 0 ? (
          <div className="sgt-d-split sgt-dp-rotativas">
            <PanelDesktop titulo="Rotativas del servicio" icono="rotate">
              <div className="sgt-dp-cargando" role="status" aria-busy="true">
                {[78, 62, 70, 54].map((w) => <div key={w} className="sgt-d-cargando" style={{ width: `${w}%` }} />)}
                <span className="sgt-dp-visualmente-oculto">Cargando rotativas…</span>
              </div>
            </PanelDesktop>
            <PanelDesktop titulo="Secuencia" icono="calendar"><div className="sgt-d-cargando" style={{ width: '40%' }} /></PanelDesktop>
          </div>
        ) : items.length === 0 ? (
          <PanelDesktop>
            <EstadoVacioDesktop
              icono="rotate"
              titulo="Sin rotativas"
              texto="No hay rotativas definidas en este servicio. Una rotativa es el patrón de turnos (día, noche, libre) que se repite cada cierta cantidad de semanas."
              accion={<BotonDesktop variante="primario" icono="plus" onClick={onNueva} style={{ marginTop: 6 }}>Crear la primera rotativa</BotonDesktop>}
            />
          </PanelDesktop>
        ) : (
          <div className="sgt-d-split sgt-dp-rotativas">
            <PanelDesktop
              titulo="Rotativas del servicio"
              subtitulo="Flechas ↑ ↓ para recorrerlas"
              icono="rotate"
              acciones={<ChipDesktop>{items.length}</ChipDesktop>}
              sinPadding
              scroll
              className="sgt-dp-rotativas__lista"
            >
              <ListaRotativas items={items} seleccion={sel?.id} onSeleccionar={onSeleccionar} formatoHoras={formatoHoras} />
            </PanelDesktop>

            {sel && (
              <PanelDesktop
                key={sel.id}
                titulo={sel.nombre}
                subtitulo={`${sel.semanas} semana${sel.semanas === 1 ? '' : 's'} · ${sel.total} días · ${sel.diasConTurno} con turno · ${sel.libres} libres`}
                icono="calendar"
                scroll
                className="sgt-dp-rotativas__detalle"
                acciones={(
                  <>
                    <BotonDesktop variante="peligro" onClick={() => onEliminar(sel.plantilla)} aria-label={`Eliminar rotativa ${sel.nombre}`} title="Eliminar rotativa">
                      <Trash2 size={13} strokeWidth={2.2} aria-hidden="true" />Eliminar
                    </BotonDesktop>
                    <BotonDesktop variante="primario" icono="calendar" onClick={() => onEditar(sel.plantilla)}>Editar secuencia</BotonDesktop>
                  </>
                )}
              >
                <div className="sgt-dp-minis sgt-dp-minis--4c">
                  <div className={`sgt-dp-mini${sel.excede ? ' sgt-dp-mini--aviso' : ''}`}>
                    <div className="sgt-dp-mini__etiqueta">Horas por semana</div>
                    <div className="sgt-dp-mini__valor">{formatoHoras(sel.horasSemana)} h</div>
                  </div>
                  <div className="sgt-dp-mini"><div className="sgt-dp-mini__etiqueta">Horas por ciclo</div><div className="sgt-dp-mini__valor">{formatoHoras(sel.horasCiclo)} h</div></div>
                  <div className="sgt-dp-mini"><div className="sgt-dp-mini__etiqueta">Turnos por ciclo</div><div className="sgt-dp-mini__valor">{sel.turnos}</div></div>
                  <div className="sgt-dp-mini"><div className="sgt-dp-mini__etiqueta">Días libres</div><div className="sgt-dp-mini__valor">{sel.libres}</div></div>
                </div>
                {sel.excede && (
                  <div className="sgt-d-aviso sgt-d-aviso--aviso" role="note">Supera las {horasReferencia} h semanales de referencia.</div>
                )}
                <SecuenciaRotativa rotativa={sel} tipos={tipos} tonoTipo={tonoTipo} formatoRango={formatoRango} />
                <LeyendaTipos tipos={tipos} tonoTipo={tonoTipo} formatoRango={formatoRango} />
              </PanelDesktop>
            )}
          </div>
        )}
      </PaginaDesktop>
    </>
  );
};

export default RotativasDesktop;
