// Detalle del turno — presentación desktop (R18), dentro del panel lateral.
//
// ShiftDetail.jsx calcula todo (estado, equipo por puesto, quién puede
// gestionar o solicitar, acciones) con las mismas reglas que el móvil y lo
// entrega aquí ya resuelto, con sus callbacks. Este componente solo dibuja.
import React from 'react';
import './turnos.css';
import { SGTIcon } from '../../Style/UIPrimitives';
import { AvisoDesktop, BotonDesktop, ChipDesktop } from '../ui';

const iniciales = (nombre) => {
  const partes = String(nombre || '').trim().split(/\s+/).filter(Boolean);
  return ((partes[0]?.[0] || '') + (partes[1]?.[0] || '')).toUpperCase() || '·';
};

const VARIANTE_ACCION = { primary: 'primario', ghost: 'secundario', danger: 'peligro' };

const Integrante = ({ fila, sePuedeElegir }) => {
  const { p, puedeGestionar, seleccionado, esReceptor, onClick } = fila;
  const interactivo = puedeGestionar || sePuedeElegir;
  const contenido = (
    <>
      <span className={`sgt-dt-avatar${p.esYo ? ' sgt-dt-avatar--yo' : ''}`} aria-hidden="true">{iniciales(p.nombre)}</span>
      <span className="sgt-dt-equipo-fila__nombre">
        {p.nombre}
        {p.esYo && <span className="sgt-dt-tu"> (tú)</span>}
      </span>
      {puedeGestionar && (
        <span className="sgt-dt-equipo-fila__accion">Editar<SGTIcon name="chevron-right" size={11} strokeWidth={2.4} /></span>
      )}
      {!puedeGestionar && esReceptor && <ChipDesktop tono="primario" mayus>Receptor</ChipDesktop>}
    </>
  );
  if (!interactivo) return <div className="sgt-dt-equipo-fila__persona">{contenido}</div>;
  return (
    <button
      type="button"
      className={`sgt-dt-equipo-fila__persona sgt-dt-equipo-fila__persona--boton${seleccionado ? ' sgt-dt-equipo-fila__persona--sel' : ''}`}
      onClick={onClick}
      aria-pressed={puedeGestionar ? undefined : Boolean(esReceptor)}
    >
      {contenido}
    </button>
  );
};

const Vacante = ({ v, puedeGestionar }) => {
  if (puedeGestionar) {
    return (
      <div className="sgt-dt-equipo-fila__libre">
        <span className="sgt-dt-libre__mas" aria-hidden="true"><SGTIcon name="plus" size={11} strokeWidth={2.6} /></span>
        <span className="sgt-dt-equipo-fila__libre-texto">Cupo libre</span>
        <BotonDesktop variante="primario" tamano="sm" icono="user-plus" onClick={v.onClick}>Asignar funcionario a este cupo</BotonDesktop>
      </div>
    );
  }
  if (v.yaSolicitada) {
    return (
      <div className="sgt-dt-equipo-fila__libre sgt-dt-equipo-fila__libre--hecho">
        <span className="sgt-dt-libre__mas" aria-hidden="true"><SGTIcon name="check" size={11} strokeWidth={2.6} /></span>
        <span className="sgt-dt-equipo-fila__libre-texto">Ya solicitaste este turno</span>
      </div>
    );
  }
  return (
    <div className="sgt-dt-equipo-fila__libre">
      <span className="sgt-dt-libre__mas" aria-hidden="true"><SGTIcon name="plus" size={11} strokeWidth={2.6} /></span>
      <span className="sgt-dt-equipo-fila__libre-texto">Cupo libre</span>
      <BotonDesktop variante="secundario" tamano="sm" icono="hand-raised" onClick={v.onClick}>Solicitar este turno</BotonDesktop>
    </div>
  );
};

const DetalleTurnoDesktop = ({
  tipo, titulo, horario, fecha, cobertura,
  receptor, info, equipo, equipoLegado, acciones,
  puedeGestionar, sePuedeElegirReceptor,
}) => {
  const esNoche = tipo !== 'dia';
  return (
    <div className="sgt-dt-detalle">
      <div className={`sgt-dt-detalle__cabecera${esNoche ? ' sgt-dt-detalle__cabecera--noche' : ''}`}>
        <span className="sgt-dt-detalle__icono" aria-hidden="true">
          <SGTIcon name={esNoche ? 'moon' : 'sun'} size={16} strokeWidth={2.3} />
        </span>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div className="sgt-dt-detalle__tipo">{titulo}</div>
          <div className="sgt-dt-detalle__horario">{horario}</div>
          <div className="sgt-dt-detalle__fecha">{fecha}</div>
        </div>
        {cobertura && (
          <ChipDesktop tono={cobertura.completo ? 'exito' : 'alerta'}>
            <SGTIcon name={cobertura.completo ? 'check-circle' : 'users'} size={12} strokeWidth={2.3} />
            {cobertura.completo
              ? `Equipo completo · ${cobertura.asignados}/${cobertura.total}`
              : `${cobertura.asignados}/${cobertura.total} · faltan ${cobertura.faltan}`}
          </ChipDesktop>
        )}
      </div>

      <div className="sgt-dt-detalle__cuerpo">
        {receptor && (
          <AvisoDesktop tono={receptor.activo ? 'alerta' : undefined}>
            Receptor: {receptor.texto}
          </AvisoDesktop>
        )}

        <section aria-label="Información del turno">
          <div className="sgt-d-seccion-titulo">Información del turno</div>
          <dl className="sgt-dt-ficha">
            {info.map((f) => (
              <div key={f.etiqueta} className="sgt-dt-ficha__fila">
                <dt>{f.etiqueta}</dt>
                <dd>{f.valor}</dd>
              </div>
            ))}
          </dl>
        </section>

        {equipo && equipo.length > 0 && (
          <section aria-label="Integrantes del equipo por puesto">
            <div className="sgt-d-seccion-titulo">Integrantes del equipo por puesto</div>
            {sePuedeElegirReceptor && (
              <div className="sgt-dt-detalle__ayuda">Toca a una persona para elegirla como receptora de un intercambio.</div>
            )}
            <div className="sgt-dt-equipo-tabla">
              {equipo.map((fila) => (
                <div key={fila.clave} className="sgt-dt-equipo-fila">
                  <div className="sgt-dt-equipo-fila__puesto">
                    <span>{fila.nombrePuesto}</span>
                    {fila.cantidadVacantes > 0 && (
                      <ChipDesktop tono="alerta" mayus>Falta cubrir{fila.cantidadVacantes > 1 ? ` ×${fila.cantidadVacantes}` : ''}</ChipDesktop>
                    )}
                  </div>
                  <div className="sgt-dt-equipo-fila__personas">
                    {fila.integrantes.map((i) => (
                      <Integrante key={i.clave} fila={i} sePuedeElegir={sePuedeElegirReceptor} />
                    ))}
                    {fila.vacantes.map((v) => <Vacante key={v.clave} v={v} puedeGestionar={puedeGestionar} />)}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {equipoLegado && (
          <section aria-label="Integrantes del mismo puesto y tipo">
            <div className="sgt-d-seccion-titulo">Integrantes del mismo puesto y tipo · {equipoLegado.visibles} persona{equipoLegado.visibles !== 1 ? 's' : ''}</div>
            <div className="sgt-dt-equipo-tabla">
              <div className="sgt-dt-equipo-fila">
                <div className="sgt-dt-equipo-fila__personas" style={{ gridColumn: '1 / -1' }}>
                  {equipoLegado.integrantes.map((i) => (
                    <Integrante key={i.clave} fila={i} sePuedeElegir={Boolean(i.onClick)} />
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}
      </div>

      {/* Sin acciones (por ejemplo, el cupo que el médico ya pidió), sin barra. */}
      {acciones.length > 0 && (
        <div className="sgt-dt-detalle__acciones" role="group" aria-label="Acciones">
          {acciones.map((a) => (
            <BotonDesktop
              key={a.clave}
              variante={VARIANTE_ACCION[a.tone] || 'secundario'}
              icono={a.icon}
              disabled={a.disabled}
              onClick={a.onClick}
            >
              {a.label}
            </BotonDesktop>
          ))}
        </div>
      )}
    </div>
  );
};

export default DetalleTurnoDesktop;
