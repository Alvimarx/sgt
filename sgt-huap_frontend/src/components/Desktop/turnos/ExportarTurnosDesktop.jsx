// Exportar turnos CSV — contenido del panel lateral en desktop (R18).
// El estado (mes, alcance, error, éxito) y la exportación viven en
// calendarView.jsx (handleExportCsv); aquí solo se dibuja.
import React from 'react';
import './turnos.css';
import { AvisoDesktop, BotonDesktop, CampoDesktop } from '../ui';

const ALCANCES = [
  { valor: 'mios', etiqueta: 'Solo mis turnos', detalle: 'Tus turnos del mes en este servicio.' },
  { valor: 'servicio', etiqueta: 'Todo el servicio', detalle: 'Todos los turnos del mes, con su personal.' },
];

const ExportarTurnosDesktop = ({
  mesEtiqueta, onMesAnterior, onMesSiguiente,
  puedeExportarServicio, alcance, onAlcance,
  error, exportando, exito, sacudir,
  onDescargar, onCancelar,
}) => (
  <div className={`sgt-dt-form${sacudir ? ' login-shake' : ''}`}>
    <CampoDesktop etiqueta="Mes a exportar">
      <div className="sgt-dt-mes">
        <BotonDesktop variante="secundario" icono="chevron-left" aria-label="Mes anterior" onClick={onMesAnterior} disabled={exportando} />
        <div className="sgt-dt-mes__valor" aria-live="polite">{mesEtiqueta}</div>
        <BotonDesktop variante="secundario" icono="chevron-right" aria-label="Mes siguiente" onClick={onMesSiguiente} disabled={exportando} />
      </div>
    </CampoDesktop>

    {puedeExportarServicio ? (
      <fieldset className="sgt-dt-opciones">
        <legend className="sgt-d-campo__etiqueta">¿Qué exportar?</legend>
        {ALCANCES.map((o) => (
          <label key={o.valor} className={`sgt-dt-opcion${alcance === o.valor ? ' sgt-dt-opcion--activa' : ''}`}>
            <input
              type="radio"
              name="alcanceExportacion"
              value={o.valor}
              checked={alcance === o.valor}
              onChange={() => onAlcance(o.valor)}
              disabled={exportando}
            />
            <span>
              <span className="sgt-dt-opcion__titulo">{o.etiqueta}</span>
              <span className="sgt-dt-opcion__detalle">{o.detalle}</span>
            </span>
          </label>
        ))}
      </fieldset>
    ) : (
      <AvisoDesktop>Se exportarán solo tus turnos del servicio actual.</AvisoDesktop>
    )}

    {error && <AvisoDesktop tono="alerta"><span role="alert">{error}</span></AvisoDesktop>}

    <div className="sgt-dt-acciones">
      <BotonDesktop variante="secundario" onClick={onCancelar} disabled={exportando}>Cancelar</BotonDesktop>
      <BotonDesktop
        variante={exito ? 'exito' : 'primario'}
        icono={exito ? 'check-circle' : 'download'}
        onClick={onDescargar}
        disabled={exportando || exito}
      >
        {exito ? '¡Descargado!' : exportando ? 'Exportando…' : 'Descargar CSV'}
      </BotonDesktop>
    </div>
  </div>
);

export default ExportarTurnosDesktop;
