// Piezas de presentación del modo desktop (R18) para los mantenedores de
// Administración: Servicios, Personal del sistema, Asignación a servicios,
// Jerarquía de funcionarios, Tipos de turno y Reglas de horario.
//
// Solo dibujan: cada vista sigue siendo dueña de su estado, sus llamadas, sus
// validaciones y sus mensajes, y les pasa datos y callbacks.
import React from 'react';
import { SGTIcon } from '../../Style/UIPrimitives';
import { BotonDesktop, ChipDesktop } from '../ui';
import './mantenedores.css';

const cx = (...clases) => clases.filter(Boolean).join(' ');

const inicialesDe = (nombre) => {
  const partes = String(nombre || '').trim().split(/\s+/);
  return ((partes[0]?.[0] || '') + (partes[1]?.[0] || '')).toUpperCase() || '·';
};

// Aviso (error o confirmación) con botón opcional para descartarlo.
// `tono`: 'alerta' | 'aviso' | 'exito' | undefined (azul). `rol`: 'alert'
// para errores, 'status' para confirmaciones.
export const AvisoMantenedorDesktop = ({ tono, icono, rol = 'alert', onCerrar, children }) => (
  <div className={cx('sgt-d-aviso', tono && `sgt-d-aviso--${tono}`, 'sgt-da-mant-aviso')} role={rol}>
    {icono && (
      <span className="sgt-da-mant-aviso__icono" aria-hidden="true">
        <SGTIcon name={icono} size={14} strokeWidth={2.4} />
      </span>
    )}
    <span className="sgt-da-mant-aviso__texto">{children}</span>
    {onCerrar && (
      <button type="button" className="sgt-da-mant-aviso__cerrar" onClick={onCerrar} aria-label="Descartar mensaje">
        <SGTIcon name="close" size={14} strokeWidth={2.4} />
      </button>
    )}
  </div>
);

// Opciones excluyentes en tarjetas, con radio nativo: Tab entra al grupo y
// las flechas cambian la opción.
//   opciones: [{ id, titulo, descripcion? }]
export const OpcionesTarjetaDesktop = ({ nombre, opciones, valor, onCambiar, etiquetadoPor }) => (
  <div className="sgt-da-mant-tarjetas" role="radiogroup" aria-labelledby={etiquetadoPor} style={{ '--da-mant-tarjetas': opciones.length }}>
    {opciones.map((o) => {
      const marcada = valor === o.id;
      return (
        <label key={o.id} className={cx('sgt-da-mant-tarjeta', marcada && 'sgt-da-mant-tarjeta--sel')}>
          <input type="radio" className="sgt-da-mant-tarjeta__input" name={nombre} value={o.id} checked={marcada} onChange={() => onCambiar(o.id)} />
          <span className="sgt-da-mant-tarjeta__marca" aria-hidden="true" />
          <span className="sgt-da-mant-tarjeta__texto">
            <span className="sgt-da-mant-tarjeta__titulo">{o.titulo}</span>
            {o.descripcion && <span className="sgt-da-mant-tarjeta__desc">{o.descripcion}</span>}
          </span>
        </label>
      );
    })}
  </div>
);

// Rol en el servicio (como viene del backend) → variante del chip.
const varianteRol = (rel) => {
  const r = String(rel.rolServicioNombre || '').toUpperCase();
  // Un ADMINISTRADOR del sistema aparece como JEFATURA en todos los servicios;
  // donde no tiene asignación, el backend no manda rol de servicio (null).
  if (rel.idRolServicio == null && r.includes('JEF')) return 'acceso';
  if (r.includes('JEF')) return 'jefatura';
  if (r.includes('SUBROG')) return 'subrogante';
  return null;
};
const ETIQUETA_ROL = { JEFATURA: 'Jefatura', SUBROGANTE: 'Subrogante', MEDICO: 'Médico' };
const etiquetaRol = (rol) => ETIQUETA_ROL[String(rol || '').toUpperCase()] || rol || 'Personal';

// Servicios de un funcionario con su rol en cada uno (mismo dato y mismo
// texto que la tarjeta móvil).
//   servicios: [{ idServicio, nombreServicio, idRolServicio, rolServicioNombre }]
export const RolesServicioDesktop = ({ servicios }) => {
  if (!servicios || servicios.length === 0) {
    return <span className="sgt-da-mant-sec">Sin servicios asignados actualmente</span>;
  }
  return (
    <span className="sgt-da-mant-roles">
      {servicios.map((rel, i) => {
        const variante = varianteRol(rel);
        return (
          <span
            key={rel.idServicio ?? i}
            className={cx('sgt-da-mant-rol', variante && `sgt-da-mant-rol--${variante}`)}
            title={variante === 'acceso' ? 'Acceso como administrador del sistema, sin asignación en el servicio' : undefined}
          >
            {rel.nombreServicio}
            <span className="sgt-da-mant-rol__cargo">{etiquetaRol(rel.rolServicioNombre)}</span>
          </span>
        );
      })}
    </span>
  );
};

// Personas de un nivel de la jerarquía (jefatura o subrogantes).
//   personas: [{ clave, nombre, accion?: { etiqueta, ariaLabel, onClick } }]
// Si alguna trae acción (por ejemplo, «Quitar subrogancia»), van una por fila,
// con el botón a la derecha; si no, como chips seguidos.
export const PersonasNivelDesktop = ({ titulo, icono, nivel, personas, vacio }) => {
  const chip = (p) => (
    <span className={cx('sgt-da-mant-persona', nivel && `sgt-da-mant-persona--${nivel}`)} title={p.nombre}>
      <span className="sgt-da-mant-persona__avatar" aria-hidden="true">{inicialesDe(p.nombre)}</span>
      <span className="sgt-da-mant-persona__nombre">{p.nombre}</span>
    </span>
  );
  const conAcciones = personas.some((p) => p.accion);
  return (
    <div>
      <div className="sgt-da-mant-nivel__cabecera">
        <SGTIcon name={icono} size={13} color="var(--ink3)" strokeWidth={2.2} />
        <span className="sgt-da-mant-nivel__titulo">{titulo}</span>
      </div>
      {personas.length === 0 && <div className="sgt-da-mant-nivel__vacio">{vacio}</div>}
      {personas.length > 0 && !conAcciones && (
        <div className="sgt-da-mant-personas">
          {personas.map((p) => <React.Fragment key={p.clave}>{chip(p)}</React.Fragment>)}
        </div>
      )}
      {personas.length > 0 && conAcciones && (
        <div className="sgt-da-mant-personas sgt-da-mant-personas--filas">
          {personas.map((p) => (
            <div key={p.clave} className="sgt-da-mant-persona-fila">
              {chip(p)}
              {p.accion && (
                <BotonDesktop variante="peligro" tamano="sm" aria-label={p.accion.ariaLabel} onClick={p.accion.onClick}>
                  {p.accion.etiqueta}
                </BotonDesktop>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Una línea "Entrada · Día 08:00–20:00 → 09:00–20:00" de una regla de horario,
// con el extremo que cambia resaltado. Las horas las calcula la vista.
//   bound: 'inicio' (entrada) | 'fin' (salida); hi/hf: horario base o null.
export const CambioHorarioDesktop = ({ bound, nombre, hi, hf, nuevoInicio, nuevoFin }) => {
  const esEntrada = bound === 'inicio';
  return (
    <div className="sgt-da-mant-cambio-linea">
      <ChipDesktop tono={esEntrada ? 'primario' : 'alerta'} mayus>{esEntrada ? 'Entrada' : 'Salida'}</ChipDesktop>
      <span className="sgt-da-mant-cambio-linea__tipo">{nombre}</span>
      {hi != null && hf != null ? (
        <>
          <span className="sgt-da-mant-cambio-linea__base">{hi}–{hf}</span>
          <SGTIcon name="arrow-right" size={12} color="var(--ink3)" />
          <span className="sgt-da-mant-sr">pasa a</span>
          <span className="sgt-da-mant-cambio-linea__nuevo">
            {esEntrada ? <strong>{nuevoInicio}</strong> : nuevoInicio}–{esEntrada ? nuevoFin : <strong>{nuevoFin}</strong>}
          </span>
        </>
      ) : (
        <span className="sgt-da-mant-cambio-linea__base">(horario no disponible)</span>
      )}
    </div>
  );
};
