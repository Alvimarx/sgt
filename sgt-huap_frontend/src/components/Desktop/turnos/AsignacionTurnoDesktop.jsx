// Gestión de asignación de un turno — presentación desktop (R18), dentro del
// panel lateral. La carga del personal, el filtro, la selección y las llamadas
// (asignar, reasignar, quitar) viven en AsignarTurnoLibreSheet.jsx; aquí solo
// se dibuja con el lenguaje del kit desktop.
import React from 'react';
import './turnos.css';
import { SGTIcon } from '../../Style/UIPrimitives';
import { AvisoDesktop, BotonDesktop, ChipDesktop } from '../ui';

const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

// "2026-10-14" → "Miércoles 14 de octubre de 2026"
const fechaLarga = (fecha) => {
  const m = String(fecha || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  const dia = DIAS[d.getDay()];
  return `${dia.charAt(0).toUpperCase()}${dia.slice(1)} ${d.getDate()} de ${MESES[d.getMonth()]} de ${d.getFullYear()}`;
};

const avatarDe = (rol) => {
  const r = String(rol || '').toLowerCase();
  if (r.includes('jefatura') || r.includes('coordina')) return 'sgt-dt-avatar--coord';
  if (r.includes('urgenci')) return 'sgt-dt-avatar--urg';
  return '';
};

const AsignacionTurnoDesktop = ({
  turnoLibre, etiquetaTurno, turno, funcionarioActual,
  etiquetaBusqueda, query, onQuery, maxLength,
  cargando, guardando, error,
  resultados, seleccionadoId, onSeleccionar,
  motivo, onMotivo, maxMotivo = 180,
  puedeQuitar, onQuitar,
  textoPrincipal, puedeConfirmar, onConfirmar, onCancelar,
}) => {
  const fecha = fechaLarga(turno?.fecha);
  const esNoche = turno?.tipo === 'noche';
  return (
    <div className="sgt-dt-asignar">
      <div className="sgt-dt-asignar__resumen">
        <div className="sgt-dt-asignar__chips">
          <ChipDesktop tono={turnoLibre ? 'alerta' : 'neutral'} mayus>{turnoLibre ? 'Cupo libre' : 'Turno asignado'}</ChipDesktop>
          <span className="sgt-dt-asignar__gestion">Gestión de asignación</span>
        </div>
        <div className="sgt-dt-asignar__turno">
          <SGTIcon name={esNoche ? 'moon' : 'sun'} size={14} color={esNoche ? 'var(--dt-noche-ink)' : 'var(--dt-dia-ink)'} strokeWidth={2.4} />
          <span>{etiquetaTurno}</span>
        </div>
        {(fecha || turno?.puesto) && (
          <div className="sgt-dt-asignar__detalle">{[fecha, turno?.puesto].filter(Boolean).join(' · ')}</div>
        )}
        {funcionarioActual && (
          <div className="sgt-dt-asignar__actual">
            <SGTIcon name="user" size={14} color="var(--ink2)" />
            <div style={{ minWidth: 0 }}>
              <div className="sgt-d-seccion-titulo" style={{ margin: 0 }}>Funcionario actual</div>
              <div className="sgt-dt-asignar__actual-nombre">{funcionarioActual}</div>
            </div>
          </div>
        )}
      </div>

      <div className="sgt-d-campo">
        <label className="sgt-d-campo__etiqueta" htmlFor="sgt-dt-buscar-funcionario">{etiquetaBusqueda}</label>
        <div className="sgt-d-buscador">
          <span className="sgt-d-buscador__icono"><SGTIcon name="search" size={14} /></span>
          <input
            id="sgt-dt-buscar-funcionario"
            type="search"
            className="sgt-d-input"
            value={query}
            onChange={onQuery}
            disabled={guardando || cargando}
            placeholder="Nombre o RUT..."
            maxLength={maxLength}
            autoComplete="off"
          />
        </div>
      </div>

      {error && <AvisoDesktop tono="alerta"><span role="alert">{error}</span></AvisoDesktop>}

      <div className="sgt-dt-asignar__lista-cabecera">
        <span className="sgt-d-seccion-titulo" style={{ margin: 0 }}>Resultados ({resultados.length})</span>
        {seleccionadoId != null && <ChipDesktop tono="primario">1 seleccionado</ChipDesktop>}
      </div>
      <div className="sgt-dt-asignar__lista" role="group" aria-label="Personal del servicio">
        {cargando ? (
          <div className="sgt-dt-asignar__vacio">Cargando personal...</div>
        ) : resultados.length === 0 ? (
          <div className="sgt-dt-asignar__vacio">No hay resultados para tu búsqueda.</div>
        ) : resultados.map((f) => {
          const sel = String(f.id) === String(seleccionadoId);
          return (
            <button
              key={f.id}
              type="button"
              className={`sgt-dt-asignar__fila${sel ? ' sgt-dt-asignar__fila--sel' : ''}`}
              aria-pressed={sel}
              onClick={() => onSeleccionar(f.id)}
              disabled={guardando}
            >
              <span className="sgt-dt-asignar__radio" aria-hidden="true">{sel && <SGTIcon name="check" size={11} color="#fff" strokeWidth={3} />}</span>
              <span className={`sgt-dt-avatar ${avatarDe(f.rol)}`} aria-hidden="true">{f.iniciales}</span>
              <span className="sgt-dt-asignar__nombre">{f.nombre}</span>
              <span className="sgt-dt-asignar__meta">{f.rol}{f.rut ? ` · ${f.rut}` : ''}</span>
            </button>
          );
        })}
      </div>

      <div className="sgt-d-campo">
        <label className="sgt-d-campo__etiqueta" htmlFor="sgt-dt-motivo-asignacion" style={{ display: 'flex' }}>
          Observación (opcional)
          <span style={{ marginLeft: 'auto', fontWeight: 700, color: 'var(--ink3)' }}>{motivo.length}/{maxMotivo}</span>
        </label>
        <textarea
          id="sgt-dt-motivo-asignacion"
          className="sgt-d-textarea"
          value={motivo}
          onChange={(e) => onMotivo(e.target.value)}
          disabled={guardando}
          rows={2}
          placeholder="Ej: Ajuste manual por administración..."
          style={{ minHeight: 58, resize: 'none' }}
        />
      </div>

      <div className="sgt-dt-asignar__pie">
        {puedeQuitar && (
          <BotonDesktop variante="peligro" icono="close" className="sgt-dt-acciones__izq" onClick={onQuitar} disabled={guardando}>
            Quitar funcionario y dejar vacante
          </BotonDesktop>
        )}
        <BotonDesktop variante="secundario" onClick={onCancelar} disabled={guardando} style={puedeQuitar ? undefined : { marginLeft: 'auto' }}>Cancelar</BotonDesktop>
        <BotonDesktop variante="primario" icono="check" onClick={onConfirmar} disabled={!puedeConfirmar}>{textoPrincipal}</BotonDesktop>
      </div>
    </div>
  );
};

export default AsignacionTurnoDesktop;
