// Paneles laterales de Estadísticas del servicio en desktop (R18). Reemplazan
// a los dos overlays hechos a mano del móvil (cobertura de turnos y
// funcionarios con turno), que se dibujaban con position:absolute contra el
// teléfono. Solo presentación: los datos, los filtros y lo expandido son el
// estado de AdminStats.
import React from 'react';
import { PanelLateral, SGTIcon } from '../../Style/UIPrimitives';
import { TablaDesktop, ChipDesktop, CampoDesktop, BotonDesktop, AvisoDesktop, EstadoVacioDesktop } from '../ui';
import './gestion.css';

// filtros: [{ id, etiqueta, valor, opciones: [{ value, label }], onChange }]
// filas: [{ clave, tipo, puesto, fecha, funcionario, asignado }]
export const CoberturaLateralDesktop = ({
  periodo, cargando, hayDatos, resumen, filtros, filtrosActivos, onLimpiar, filas, onClose,
}) => (
  <PanelLateral title="Cobertura de turnos" ancho="lg" onClose={onClose}>
    <div className="sgt-dg-lateral sgt-dg-lateral--llena">
      <div className="sgt-dg-lateral__sub sgt-dg-mayus-cap">{periodo}</div>
      {hayDatos && (
        <AvisoDesktop>
          {resumen.asignados} asignados · {resumen.vacantes} vacantes · {resumen.total} totales
        </AvisoDesktop>
      )}
      {hayDatos && (
        <div>
          <div className="sgt-dg-filtros">
            {filtros.map((f) => (
              <CampoDesktop key={f.id} etiqueta={f.etiqueta} htmlFor={`cobertura-${f.id}`}>
                <select
                  id={`cobertura-${f.id}`}
                  className="sgt-d-select"
                  value={f.valor ?? ''}
                  onChange={(e) => f.onChange(e.target.value || null)}
                >
                  <option value="">Todos</option>
                  {f.opciones.map((op) => <option key={op.value} value={op.value}>{op.label}</option>)}
                </select>
              </CampoDesktop>
            ))}
          </div>
          {filtrosActivos > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
              <span className="sgt-dg-sec">
                Filtrar por · {filtrosActivos} activo{filtrosActivos > 1 ? 's' : ''}
              </span>
              <BotonDesktop tamano="sm" variante="fantasma" icono="close" onClick={onLimpiar}>Limpiar filtros</BotonDesktop>
            </div>
          )}
        </div>
      )}
      <div className="sgt-dg-lateral__tabla">
        <TablaDesktop
          ariaLabel="Turnos del período"
          cargando={cargando}
          filas={cargando ? [] : filas}
          claveFila={(f) => f.clave}
          vacio="No hay turnos para este filtro."
          columnas={[
            { id: 'tipo', titulo: 'Turno', render: (f) => <span style={{ fontWeight: 800 }}>{f.tipo}</span> },
            { id: 'puesto', titulo: 'Puesto', render: (f) => f.puesto },
            { id: 'fecha', titulo: 'Fecha', ancho: 96, render: (f) => <span className="sgt-dg-mayus-cap sgt-dg-nowrap" style={{ display: 'inline-block' }}>{f.fecha}</span> },
            { id: 'funcionario', titulo: 'Funcionario', render: (f) => (f.funcionario ? <span style={{ color: 'var(--success)', fontWeight: 700 }}>{f.funcionario}</span> : <span className="sgt-dg-sec">—</span>) },
            { id: 'estado', titulo: 'Estado', ancho: 92, render: (f) => <ChipDesktop tono={f.asignado ? 'exito' : 'alerta'}>{f.asignado ? 'Asignado' : 'Vacante'}</ChipDesktop> },
          ]}
        />
      </div>
    </div>
  </PanelLateral>
);

// funcionarios: el detalle tal como llega ({ idFuncionario, nombre, cantidadTurnos, turnos[] })
export const FuncionariosLateralDesktop = ({
  periodo, cargando, funcionarios, expandidos, onAlternar, colorDe, inicialesDe, formatoFecha, onClose,
}) => (
  <PanelLateral title="Funcionarios con turno" ancho="lg" onClose={onClose}>
    <div className="sgt-dg-lateral">
      <div className="sgt-dg-lateral__sub sgt-dg-mayus-cap">{periodo}</div>
      {!cargando && funcionarios && (
        <AvisoDesktop>
          {funcionarios.filter((f) => f.cantidadTurnos > 0).length} de {funcionarios.length} funcionarios con turno en este período
        </AvisoDesktop>
      )}
      {cargando && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }} aria-busy="true">
          {[0, 1, 2, 3].map((i) => <div key={i} className="sgt-d-cargando" style={{ height: 34 }} />)}
        </div>
      )}
      {!cargando && (!funcionarios || funcionarios.length === 0) && (
        <EstadoVacioDesktop icono="user" titulo="Sin funcionarios" texto="No hay funcionarios en este servicio." />
      )}
      {!cargando && funcionarios?.length > 0 && (
        <div className="sgt-dg-acordeon">
          {funcionarios.map((func, idx) => {
            const abierto = expandidos.has(func.idFuncionario);
            const tieneTurnos = func.cantidadTurnos > 0;
            const color = colorDe(idx);
            const nTurnos = `${func.cantidadTurnos} ${func.cantidadTurnos === 1 ? 'turno' : 'turnos'}`;
            return (
              <div key={func.idFuncionario} className="sgt-dg-acordeon__item">
                <button
                  type="button"
                  className="sgt-dg-acordeon__boton"
                  onClick={() => onAlternar(func.idFuncionario)}
                  aria-expanded={abierto}
                  aria-label={`${func.nombre}: ${nTurnos} en el período`}
                >
                  <span
                    className="sgt-dg-acordeon__avatar"
                    style={{ background: tieneTurnos ? color : 'var(--line2)', color: tieneTurnos ? '#fff' : 'var(--ink3)' }}
                    aria-hidden="true"
                  >
                    {inicialesDe(func.nombre)}
                  </span>
                  <span className="sgt-dg-acordeon__nombre">{func.nombre}</span>
                  <span
                    className="sgt-d-chip"
                    style={{ background: tieneTurnos ? `${color}18` : 'var(--line2)', color: tieneTurnos ? color : 'var(--ink3)' }}
                  >
                    {nTurnos}
                  </span>
                  <SGTIcon name={abierto ? 'chevron-up' : 'chevron-down'} size={14} color="var(--ink3)" />
                </button>
                {abierto && (
                  <div className="sgt-dg-acordeon__cuerpo">
                    {func.turnos.length === 0 ? (
                      <div className="sgt-dg-sec" style={{ padding: '8px 0' }}>Sin turnos en este período</div>
                    ) : func.turnos.map((t, i) => (
                      <div key={i} className="sgt-dg-acordeon__turno">
                        <span style={{ flex: 1, minWidth: 0 }}>
                          {t.tipoTurno ?? '—'}
                          <span className="sgt-dg-sec" style={{ display: 'block' }}>{t.nombrePuesto ?? '—'}</span>
                        </span>
                        <ChipDesktop>
                          <span className="sgt-dg-mayus-cap" style={{ display: 'inline-block' }}>{t.fecha ? formatoFecha(t.fecha) : '—'}</span>
                        </ChipDesktop>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  </PanelLateral>
);
