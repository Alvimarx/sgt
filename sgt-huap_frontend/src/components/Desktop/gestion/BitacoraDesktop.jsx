// Tabla de la bitácora en desktop (R18): eventos ya filtrados por la vista
// (BitacoraView), paginados de a 50, con el detalle de cada evento en un panel
// lateral. Solo presentación: las etiquetas, tonos, estados y el bloque de
// detalle los arma BitacoraView con sus propias funciones.
import React, { useRef, useState } from 'react';
import { PanelLateral, SGTIcon } from '../../Style/UIPrimitives';
import { TablaDesktop, ChipDesktop } from '../ui';
import { PaginacionDesktop } from './PaginacionDesktop';
import './gestion.css';

const POR_PAGINA = 50;

// filas: [{ id, fecha, etiqueta, tono, extra: { texto, tono } | null, estado: { texto, tono } | null,
//           solicitante, accionPor, evento }]
// renderDetalle(evento): el bloque de detalle de la vista para ese evento.
// La vista monta este componente con `key` = filtros activos: al cambiar un
// filtro vuelve a la página 1 y cierra el detalle.
export const TablaBitacoraDesktop = ({ filas, cargando, renderDetalle }) => {
  const [pagina, setPagina] = useState(1);
  const [abierta, setAbierta] = useState(null);
  const contenedorRef = useRef(null);

  // Al cambiar de página, la tabla vuelve arriba (si no, la página nueva
  // aparece desplazada donde quedó la anterior).
  const cambiarPagina = (p) => {
    setPagina(p);
    const envoltura = contenedorRef.current?.querySelector('.sgt-d-tabla-envoltura');
    if (envoltura) envoltura.scrollTop = 0;
  };

  const totalPaginas = Math.max(1, Math.ceil(filas.length / POR_PAGINA));
  const paginaSegura = Math.min(pagina, totalPaginas);
  const visibles = filas.slice((paginaSegura - 1) * POR_PAGINA, paginaSegura * POR_PAGINA);
  const fila = abierta != null ? filas.find((f) => f.id === abierta) : null;

  const chipsEvento = (f) => (
    <span className="sgt-dg-evento-chips">
      <ChipDesktop tono={f.tono} mayus>{f.etiqueta}</ChipDesktop>
      {f.extra && <ChipDesktop tono={f.extra.tono} mayus>{f.extra.texto}</ChipDesktop>}
    </span>
  );

  return (
    <>
      {/* display: contents: el contenedor no genera caja y la tabla sigue
          siendo hija flexible del cuerpo del panel. */}
      <div ref={contenedorRef} style={{ display: 'contents' }}>
        <TablaDesktop
          ariaLabel="Registros de la bitácora"
          cargando={cargando}
          filas={visibles}
          claveFila={(f) => f.id}
          onFila={(f) => setAbierta(f.id)}
          filaSeleccionada={abierta}
          vacio="No hay eventos para mostrar con los filtros seleccionados."
          columnas={[
            { id: 'fecha', titulo: 'Fecha', ancho: 150, render: (f) => <span className="sgt-dg-num sgt-dg-nowrap">{f.fecha}</span> },
            { id: 'evento', titulo: 'Evento', render: chipsEvento },
            { id: 'estado', titulo: 'Estado', ancho: 110, render: (f) => (f.estado ? <ChipDesktop tono={f.estado.tono} mayus>{f.estado.texto}</ChipDesktop> : <span className="sgt-dg-sec">—</span>) },
            { id: 'solicitante', titulo: 'Solicitante', render: (f) => f.solicitante || <span className="sgt-dg-sec">—</span> },
            { id: 'accionPor', titulo: 'Acción por', render: (f) => f.accionPor || <span className="sgt-dg-sec">—</span> },
            {
              id: 'ver', titulo: <span className="sgt-dg-sr">Detalle</span>, ancho: 40, alinear: 'derecha',
              render: () => <span style={{ color: 'var(--ink3)', display: 'inline-flex', verticalAlign: 'middle' }} aria-hidden="true"><SGTIcon name="chevron-right" size={14} /></span>,
            },
          ]}
        />
      </div>
      <PaginacionDesktop
        pagina={paginaSegura}
        totalPaginas={totalPaginas}
        total={filas.length}
        porPagina={POR_PAGINA}
        onCambiar={cambiarPagina}
      />

      {fila && (
        <PanelLateral title="Detalle del evento" ancho="md" onClose={() => setAbierta(null)}>
          <div className="sgt-dg-lateral">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              {chipsEvento(fila)}
              <span className="sgt-dg-sec" style={{ marginLeft: 'auto' }}>{fila.fecha}</span>
            </div>
            <dl className="sgt-dg-datos">
              <dt>Estado</dt>
              <dd>{fila.estado ? <ChipDesktop tono={fila.estado.tono} mayus>{fila.estado.texto}</ChipDesktop> : '—'}</dd>
              {fila.solicitante && (<><dt>Solicitante</dt><dd>{fila.solicitante}</dd></>)}
              {fila.accionPor && (<><dt>Acción por</dt><dd>{fila.accionPor}</dd></>)}
            </dl>
            <div className="sgt-d-seccion-titulo" style={{ marginBottom: 0 }}>Detalle</div>
            <div className="sgt-dg-ficha">{renderDetalle(fila.evento)}</div>
          </div>
        </PanelLateral>
      )}
    </>
  );
};
