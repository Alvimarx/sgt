// Notificaciones — presentación desktop (R18).
//
// La bandeja (lista, marcar leída, eliminar) vive en NotificationContext y
// NotificationView.jsx; aquí solo se dibuja: página de ancho medio, segmentos
// Todas / Sin leer / Leídas y una lista densa con las acciones en cada fila.
import React from 'react';
import './turnos.css';
import { SGTIcon } from '../../Style/UIPrimitives';
import { BotonDesktop, ChipDesktop, EncabezadoDesktop, EstadoVacioDesktop, PaginaDesktop, PanelDesktop, SegmentosDesktop } from '../ui';

const NotificacionesDesktop = ({
  subtitulo, filtros, filtro, onFiltro,
  items, cargando, vacio,
  onMarcarLeida, onEliminar,
}) => (
  <>
    <EncabezadoDesktop titulo="Notificaciones" subtitulo={subtitulo} />
    <PaginaDesktop ancho="medio">
      <div className="sgt-d-toolbar">
        <SegmentosDesktop opciones={filtros} valor={filtro} onChange={onFiltro} ariaLabel="Filtrar notificaciones" />
      </div>
      <PanelDesktop sinPadding aria-label="Bandeja de notificaciones">
        {cargando && items.length === 0 ? (
          <div aria-busy="true">
            {[72, 58, 66].map((w) => (
              <div key={w} className="sgt-dt-notif sgt-dt-notif--cargando">
                <span />
                <span className="sgt-dt-notif__icono" />
                <div>
                  <div className="sgt-d-cargando" style={{ width: `${w}%` }} />
                  <div className="sgt-d-cargando" style={{ width: `${w - 20}%`, height: 10, marginTop: 7 }} />
                </div>
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <EstadoVacioDesktop icono="bell" titulo={vacio.titulo} texto={vacio.texto} />
        ) : (
          <ul className="sgt-dt-notifs">
            {items.map((n) => (
              <li key={n.id} className={`sgt-dt-notif${n.noLeida ? ' sgt-dt-notif--nueva' : ''}`}>
                <span className="sgt-dt-notif__punto" aria-hidden="true" />
                <span className="sgt-dt-notif__icono" aria-hidden="true"><SGTIcon name="tray" size={15} /></span>
                <div className="sgt-dt-notif__cuerpo">
                  <div className="sgt-dt-notif__linea">
                    <span className="sgt-dt-notif__titulo">{n.titulo}</span>
                    <ChipDesktop tono={n.chip.tono} mayus>{n.chip.texto}</ChipDesktop>
                  </div>
                  <div className="sgt-dt-notif__texto">{n.texto}</div>
                </div>
                <time className="sgt-dt-notif__fecha">{n.fecha}</time>
                <div className="sgt-dt-notif__acciones">
                  {n.noLeida && (
                    <BotonDesktop variante="secundario" tamano="sm" icono="check" onClick={() => onMarcarLeida(n.id)}>
                      Marcar leída
                    </BotonDesktop>
                  )}
                  <BotonDesktop variante="fantasma" tamano="sm" icono="close" onClick={() => onEliminar(n.id)} aria-label={`Eliminar notificación: ${n.texto}`}>
                    Eliminar
                  </BotonDesktop>
                </div>
              </li>
            ))}
          </ul>
        )}
      </PanelDesktop>
    </PaginaDesktop>
  </>
);

export default NotificacionesDesktop;
