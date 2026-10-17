// Kit de componentes del modo desktop (R18).
//
// Envoltorios finos sobre las clases sgt-d-* de desktop.css, con el lenguaje
// visual de la "Propuesta C" (Centro de operaciones). Úsalos en la rama
// desktop de cada vista (const { esDesktop } = useLayout()) para que todas
// las pantallas se vean como un mismo producto. Guía: docs/desktop/GUIA-DESKTOP.md
import React from 'react';
import { SGTIcon } from '../Style/UIPrimitives';
// El kit trae su CSS: así carga antes que el CSS de cada grupo (que se importa
// después del kit) y una regla de grupo le gana a la del kit en un empate.
import './desktop.css';

const cx = (...clases) => clases.filter(Boolean).join(' ');

// Área con scroll propio dentro del marco. `ancho`: 'completo' | 'amplio'
// (1440) | 'medio' (1120) | 'angosto' (760); con ancho máximo, el contenido
// queda alineado a la izquierda, bajo el título. `llena`: la página ocupa el
// alto disponible para que un PanelDesktop `llena` crezca con su tabla hasta
// ese alto y desde ahí la tabla scrollee por dentro con el encabezado fijo.
export const PaginaDesktop = ({ ancho = 'completo', llena = false, children, className, style }) => (
  <div className={cx('sgt-d-pagina', llena && 'sgt-d-pagina--llena', className)} style={style}>
    <div className={cx('sgt-d-contenido', ancho !== 'completo' && `sgt-d-contenido--${ancho}`)}>{children}</div>
  </div>
);

// Encabezado de página: título y subtítulo a la izquierda, acciones a la
// derecha. `izquierda` admite un botón volver (solo en sub-pantallas).
export const EncabezadoDesktop = ({ titulo, subtitulo, acciones, izquierda }) => (
  <header className="sgt-d-encabezado">
    {izquierda}
    <div style={{ minWidth: 0 }}>
      <h1 className="sgt-d-encabezado__titulo">{titulo}</h1>
      {subtitulo && <div className="sgt-d-encabezado__subtitulo">{subtitulo}</div>}
    </div>
    {acciones && <div className="sgt-d-encabezado__acciones">{acciones}</div>}
  </header>
);

// Tarjeta blanca. Con `titulo` lleva cabecera (ícono opcional + acciones).
// `scroll`: el cuerpo ocupa el alto disponible y scrollea solo.
export const PanelDesktop = ({
  titulo, subtitulo, icono, iconoColor = 'var(--primary)', iconoFondo,
  acciones, children, sinPadding = false, scroll = false, llena = false, className, style, ...rest
}) => (
  <section className={cx('sgt-d-panel', llena && 'sgt-d-panel--llena', className)} style={style} aria-label={typeof titulo === 'string' ? titulo : undefined} {...rest}>
    {titulo && (
      <div className="sgt-d-panel__cabecera">
        {icono && (
          <span className="sgt-d-panel__icono" style={iconoFondo ? { background: iconoFondo } : undefined}>
            <SGTIcon name={icono} size={13} color={iconoColor} strokeWidth={2.2} />
          </span>
        )}
        <div style={{ minWidth: 0 }}>
          <div className="sgt-d-panel__titulo">{titulo}</div>
          {subtitulo && <div className="sgt-d-panel__subtitulo">{subtitulo}</div>}
        </div>
        {acciones && <div className="sgt-d-panel__acciones">{acciones}</div>}
      </div>
    )}
    <div className={cx('sgt-d-panel__cuerpo', sinPadding && 'sgt-d-panel__cuerpo--sin-padding', scroll && 'sgt-d-panel__cuerpo--scroll')}>
      {children}
    </div>
  </section>
);

// Botón. `variante`: 'primario' | 'exito' | 'peligro' | 'peligro-solido' |
// 'secundario' | 'fantasma'. `tamano="sm"` para acciones dentro de filas.
// Sin `children` y con `icono` queda cuadrado (dar `aria-label`).
export const BotonDesktop = ({ variante = 'secundario', tamano, icono, children, className, type = 'button', ...props }) => (
  <button
    type={type}
    className={cx('sgt-d-btn', `sgt-d-btn--${variante}`, tamano === 'sm' && 'sgt-d-btn--sm', !children && icono && 'sgt-d-btn--icono', className)}
    {...props}
  >
    {icono && <SGTIcon name={icono} size={tamano === 'sm' ? 12 : 14} strokeWidth={2.2} />}
    {children}
  </button>
);

// Chip de estado. `tono`: 'neutral' | 'primario' | 'exito' | 'aviso' |
// 'alerta' | 'solido'. `mayus` para badges de estado (PENDIENTE, ABIERTA…).
export const ChipDesktop = ({ tono = 'neutral', mayus = false, children, className, ...props }) => (
  <span className={cx('sgt-d-chip', tono !== 'neutral' && `sgt-d-chip--${tono}`, mayus && 'sgt-d-chip--mayus', className)} {...props}>
    {children}
  </span>
);

export const BuscadorDesktop = ({ value, onChange, placeholder = 'Buscar…', ariaLabel, style, ...props }) => (
  <div className="sgt-d-buscador" style={style}>
    <span className="sgt-d-buscador__icono"><SGTIcon name="search" size={14} /></span>
    <input
      type="search"
      className="sgt-d-input"
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      placeholder={placeholder}
      aria-label={ariaLabel || placeholder}
      {...props}
    />
  </div>
);

// Campo de formulario: etiqueta + control (children) + ayuda o error.
export const CampoDesktop = ({ etiqueta, ayuda, error, children, anchoCompleto = false, htmlFor }) => (
  <div className={cx('sgt-d-campo', anchoCompleto && 'sgt-d-formulario__ancho-completo')}>
    {etiqueta && <label className="sgt-d-campo__etiqueta" htmlFor={htmlFor}>{etiqueta}</label>}
    {children}
    {error ? <div className="sgt-d-campo__error">{error}</div> : ayuda ? <div className="sgt-d-campo__ayuda">{ayuda}</div> : null}
  </div>
);

// Pestañas tipo segmento. opciones: [{ id, etiqueta, conteo? }]
export const SegmentosDesktop = ({ opciones, valor, onChange, ariaLabel }) => (
  <div className="sgt-d-segmentos" role="tablist" aria-label={ariaLabel}>
    {opciones.map((o) => (
      <button
        key={o.id}
        type="button"
        role="tab"
        aria-selected={valor === o.id}
        className="sgt-d-segmento"
        onClick={() => onChange?.(o.id)}
      >
        {o.etiqueta}
        {o.conteo != null && <span className="sgt-d-segmento__conteo">{o.conteo}</span>}
      </button>
    ))}
  </div>
);

// Tabla densa.
//   columnas: [{ id, titulo, ancho?, alinear?: 'derecha', render?: (fila) => nodo }]
//   filas: datos; claveFila(fila) → key; onFila(fila) hace la fila interactiva
//   (clic y Enter); filaSeleccionada: key de la fila resaltada.
export const TablaDesktop = ({
  columnas, filas, claveFila = (f, i) => f?.id ?? i, onFila, filaSeleccionada,
  vacio = 'Sin registros.', cargando = false, ariaLabel, className,
}) => (
  <div className="sgt-d-tabla-envoltura">
    <table className={cx('sgt-d-tabla', onFila && 'sgt-d-tabla--interactiva', className)} aria-label={ariaLabel}>
      <thead>
        <tr>
          {columnas.map((c) => (
            <th key={c.id} style={{ width: c.ancho, textAlign: c.alinear === 'derecha' ? 'right' : undefined }}>{c.titulo}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {cargando && filas.length === 0 && [0, 1, 2].map((i) => (
          <tr key={`cargando-${i}`}>
            <td colSpan={columnas.length}><div className="sgt-d-cargando" style={{ width: `${70 - i * 15}%` }} /></td>
          </tr>
        ))}
        {!cargando && filas.length === 0 && (
          <tr><td colSpan={columnas.length}><div className="sgt-d-vacio"><div className="sgt-d-vacio__texto">{vacio}</div></div></td></tr>
        )}
        {filas.map((f, i) => {
          const clave = claveFila(f, i);
          return (
            <tr
              key={clave}
              aria-selected={filaSeleccionada != null ? filaSeleccionada === clave : undefined}
              tabIndex={onFila ? 0 : undefined}
              onClick={onFila ? () => onFila(f) : undefined}
              onKeyDown={onFila ? (e) => { if (e.key === 'Enter') onFila(f); } : undefined}
            >
              {columnas.map((c) => (
                <td key={c.id} className={c.alinear === 'derecha' ? 'sgt-d-tabla__num' : undefined}>
                  {c.render ? c.render(f) : f?.[c.id]}
                </td>
              ))}
            </tr>
          );
        })}
      </tbody>
    </table>
  </div>
);

export const EstadoVacioDesktop = ({ icono = 'tray', titulo, texto, accion }) => (
  <div className="sgt-d-vacio">
    <SGTIcon name={icono} size={26} color="var(--ink3)" />
    {titulo && <div className="sgt-d-vacio__titulo">{titulo}</div>}
    {texto && <div className="sgt-d-vacio__texto">{texto}</div>}
    {accion}
  </div>
);

export const KpiDesktop = ({ valor, etiqueta, detalle, color }) => (
  <div className="sgt-d-kpi">
    <div className="sgt-d-kpi__etiqueta">{etiqueta}</div>
    <div className="sgt-d-kpi__valor" style={color ? { color } : undefined}>{valor}</div>
    {detalle && <div className="sgt-d-kpi__detalle">{detalle}</div>}
  </div>
);

const inicialesDe = (nombre) => {
  const partes = String(nombre || '').trim().split(/\s+/);
  return ((partes[0]?.[0] || '') + (partes[1]?.[0] || '')).toUpperCase() || '·';
};

// Avatar con iniciales + nombre (+ detalle, p. ej. RUT o puesto).
export const PersonaDesktop = ({ nombre, detalle, iniciales, fondo, tinta, esYo = false }) => (
  <div className="sgt-d-persona">
    <span
      className="sgt-d-persona__avatar"
      style={esYo ? { background: 'var(--primary)', color: '#fff' } : (fondo || tinta) ? { background: fondo, color: tinta } : undefined}
    >
      {iniciales || inicialesDe(nombre)}
    </span>
    <span style={{ minWidth: 0 }}>
      <span className="sgt-d-persona__nombre" style={{ display: 'block' }}>{nombre}</span>
      {detalle && <span className="sgt-d-tabla__secundario">{detalle}</span>}
    </span>
  </div>
);

export const AvisoDesktop = ({ tono, children, style }) => (
  <div className={cx('sgt-d-aviso', tono && `sgt-d-aviso--${tono}`)} style={style}>{children}</div>
);
