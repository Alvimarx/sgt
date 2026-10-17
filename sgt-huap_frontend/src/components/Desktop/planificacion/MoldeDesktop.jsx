// Planificación — presentación desktop del molde (R18).
//
// Planificacion.jsx carga los datos del servicio, arma el molde (instancias:
// una rotativa en un puesto, con o sin funcionario) y decide qué hace cada
// acción; aquí solo se dibuja. Patrón "editor": encabezado con las acciones,
// KPIs, y el molde a lo ancho en dos vistas del mismo dato:
//   - Asignaciones: tabla puesto × rotativa; cada celda es el funcionario de
//     esa instancia (o la vacante) y abre la asignación en el panel lateral.
//   - Ciclo: semanas × 7 días con la cobertura por tipo de turno; cada día
//     abre su detalle en el panel lateral.
import React, { useMemo, useState } from 'react';
import { FolderOpen, Trash2, CalendarCheck2 } from 'lucide-react';
import { SGTIcon } from '../../Style/UIPrimitives';
import {
  BotonDesktop, ChipDesktop, EncabezadoDesktop, KpiDesktop, PaginaDesktop, PanelDesktop, SegmentosDesktop,
} from '../ui';
import { AvisoCerrable, AvisoFlotante, BloqueTipo, GrillaSemanas } from './piezas';
import { DIAS_LARGOS, claseAvatar, formatoNumero, inicialesDeNombre } from './formato';
import './planificacion.css';

const turnosDe = (inst) => (inst.secuencia || []).reduce((s, d) => s + d.length, 0);
const nombreDe = (f) => (f ? `${f.nombre} ${f.apellidoPaterno || ''}`.trim() : '');

// ── Tabla puesto × rotativa ──────────────────────────────────────────────────
const MatrizMolde = ({ instancias, puestos, funcionariosPorId, onAsignar }) => {
  const { columnas, filas } = useMemo(() => {
    // Columnas: las rotativas del molde, en el orden en que aparecen.
    const cols = [];
    const idxCol = new Map();
    instancias.forEach((inst) => {
      const k = String(inst.idRotativa);
      if (!idxCol.has(k)) {
        idxCol.set(k, cols.length);
        cols.push({ clave: k, nombre: inst.nombreRotativa || 'Rotativa', total: 0, asignadas: 0, semanas: inst.semanas, turnos: turnosDe(inst) });
      }
      const c = cols[idxCol.get(k)];
      c.total += 1;
      if (inst.idFuncionario) c.asignadas += 1;
    });
    // Filas: los puestos en el orden del servicio; los que ya no están en la
    // lista van después y "Sin puesto" al final.
    const orden = new Map((puestos || []).map((p, i) => [String(p.idPuesto), i]));
    const porPuesto = new Map();
    instancias.forEach((inst, i) => {
      const k = inst.idPuesto != null ? String(inst.idPuesto) : 'sin-puesto';
      if (!porPuesto.has(k)) {
        const rango = k === 'sin-puesto' ? Number.MAX_SAFE_INTEGER : (orden.has(k) ? orden.get(k) : 100000 + i);
        porPuesto.set(k, { clave: k, nombre: k === 'sin-puesto' ? 'Sin puesto' : (inst.nombrePuesto || `Puesto ${k}`), rango, celdas: new Map() });
      }
      const fila = porPuesto.get(k);
      const ck = String(inst.idRotativa);
      if (!fila.celdas.has(ck)) fila.celdas.set(ck, []);
      fila.celdas.get(ck).push(inst);
    });
    return { columnas: cols, filas: [...porPuesto.values()].sort((a, b) => a.rango - b.rango) };
  }, [instancias, puestos]);

  return (
    <div className="sgt-d-tabla-envoltura sgt-dp-matriz-envoltura">
      <table className="sgt-dp-matriz" aria-label="Asignaciones del molde por puesto y rotativa" style={{ minWidth: 150 + columnas.length * 124 }}>
        <colgroup>
          <col style={{ width: 150 }} />
          {columnas.map((c) => <col key={c.clave} />)}
        </colgroup>
        <thead>
          <tr>
            <th scope="col" className="sgt-dp-matriz__puesto">Puesto</th>
            {columnas.map((c) => {
              const completo = c.asignadas === c.total;
              return (
                <th key={c.clave} scope="col" title={`${c.nombre} · ${c.semanas} semanas · ${c.turnos} turnos por ciclo`}>
                  <span className="sgt-dp-matriz__col-nombre">{c.nombre}</span>
                  <span className="sgt-dp-matriz__col-meta">
                    <span className={`sgt-dp-cob ${completo ? 'sgt-dp-cob--ok' : 'sgt-dp-cob--falta'}`}>{c.asignadas}/{c.total}</span>
                    {completo ? 'completa' : `${c.total - c.asignadas} vacante${c.total - c.asignadas === 1 ? '' : 's'}`}
                  </span>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {filas.map((f) => (
            <tr key={f.clave}>
              <th scope="row" className="sgt-dp-matriz__puesto">{f.nombre}</th>
              {columnas.map((c) => {
                const lista = f.celdas.get(c.clave) || [];
                return (
                  <td key={c.clave}>
                    {lista.length === 0 ? (
                      <span className="sgt-dp-matriz__nada" title="Esta rotativa no tiene este puesto en el molde">—</span>
                    ) : lista.map((inst) => {
                      const func = funcionariosPorId.get(Number(inst.idFuncionario));
                      const nombre = func ? nombreDe(func) : inst.nombreFuncionario;
                      const asignado = Boolean(inst.idFuncionario);
                      const etiqueta = `${f.nombre} en ${c.nombre}: ${asignado ? nombre : 'vacante'} (${inst.label})`;
                      return asignado ? (
                        <button
                          key={inst.id}
                          type="button"
                          className="sgt-dp-celda"
                          onClick={() => onAsignar(inst)}
                          aria-label={etiqueta}
                          title={`${inst.label} · ${nombre}${func?.rutCompleto ? ` · RUT ${func.rutCompleto}` : ''}${func?.profesion ? ` · ${func.profesion}` : ''}`}
                        >
                          <span className={`sgt-dp-avatar sgt-dp-avatar--sm ${claseAvatar(f.nombre)}`} aria-hidden="true">{inicialesDeNombre(nombre)}</span>
                          <span className="sgt-dp-celda__nombre">{nombre}</span>
                        </button>
                      ) : (
                        <button
                          key={inst.id}
                          type="button"
                          className="sgt-dp-celda sgt-dp-celda--vacante"
                          onClick={() => onAsignar(inst)}
                          aria-label={etiqueta}
                          title={`${inst.label} · vacante: asignar funcionario`}
                        >
                          <span className="sgt-dp-celda__mas" aria-hidden="true"><SGTIcon name="plus" size={11} strokeWidth={2.8} /></span>
                          <span className="sgt-dp-celda__nombre">Vacante</span>
                          <span className="sgt-dp-celda__accion">Asignar</span>
                        </button>
                      );
                    })}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// ── Ciclo de semanas: cobertura por día ──────────────────────────────────────
const CicloMolde = ({ maxSemanas, daysIndex, coberturaDia, tonoTipo, tipos, onDia, formatoRango }) => {
  const tiposUsados = useMemo(() => {
    const vistos = new Map();
    Object.values(daysIndex || {}).forEach((entradas) => entradas.forEach(({ tipo }) => {
      if (!vistos.has(String(tipo.idTipoTurno))) vistos.set(String(tipo.idTipoTurno), tipo);
    }));
    const orden = new Map((tipos || []).map((t, i) => [String(t.idTipoTurno), i]));
    return [...vistos.values()].sort((a, b) => (orden.get(String(a.idTipoTurno)) ?? 99) - (orden.get(String(b.idTipoTurno)) ?? 99));
  }, [daysIndex, tipos]);

  return (
    <div className="sgt-dp-ciclo">
      <GrillaSemanas
        semanas={Math.max(1, maxSemanas || 0)}
        ariaLabel="Ciclo del molde"
        renderDia={(di, d, w) => {
          const entradas = daysIndex[di] || [];
          if (entradas.length === 0) {
            return <div className="sgt-dp-diaciclo sgt-dp-diaciclo--libre" aria-label={`Semana ${w + 1} · ${DIAS_LARGOS[d]}: sin turnos`}>Sin turnos</div>;
          }
          const grupos = coberturaDia(entradas);
          const vacantes = grupos.reduce((a, g) => a + g.pendientes.length, 0);
          const resumen = grupos.map((g) => `${g.tipo.nombre} ${g.asignadas.length} de ${g.asignadas.length + g.pendientes.length}`).join(', ');
          return (
            <button
              type="button"
              className="sgt-dp-diaciclo"
              onClick={() => onDia(di)}
              aria-label={`Semana ${w + 1} · ${DIAS_LARGOS[d]}: ${resumen}${vacantes ? `, ${vacantes} vacante${vacantes === 1 ? '' : 's'}` : ''}`}
            >
              {grupos.map((g) => {
                const total = g.asignadas.length + g.pendientes.length;
                return (
                  <BloqueTipo
                    key={g.tipo.idTipoTurno}
                    tono={tonoTipo(g.tipo)}
                    nombre={g.tipo.nombre}
                    cobertura={`${g.asignadas.length}/${total}`}
                    completo={g.pendientes.length === 0}
                    title={`${g.tipo.nombre} ${formatoRango(g.tipo)}`}
                  />
                );
              })}
              {vacantes > 0 && <span className="sgt-dp-diaciclo__vacantes">{vacantes} vacante{vacantes === 1 ? '' : 's'}</span>}
            </button>
          );
        }}
      />
      <div className="sgt-dp-leyenda">
        {tiposUsados.map((t) => {
          const tono = tonoTipo(t);
          return (
            <span key={t.idTipoTurno} className="sgt-dp-leyenda__item">
              <span className={`sgt-dp-leyenda__muestra sgt-dp-bloque--${tono.clase}`} style={tono.estilo}><SGTIcon name={tono.icono} size={9} strokeWidth={2.6} /></span>
              {t.nombre} {formatoRango(t)}
            </span>
          );
        })}
        <span className="sgt-dp-leyenda__item"><b className="sgt-dp-bloque__cob--ok">15/15</b> completo</span>
        <span className="sgt-dp-leyenda__item"><b className="sgt-dp-bloque__cob--falta">13/15</b> con vacantes</span>
        <span className="sgt-dp-leyenda__item sgt-dp-leyenda__ayuda">Haz clic en un día para ver su equipo y asignar.</span>
      </div>
    </div>
  );
};

// ── Vista ────────────────────────────────────────────────────────────────────
const MoldeDesktop = ({
  servicioNombre, planNombre, planActualId,
  instancias, puestos, funcionarios, tipos,
  daysIndex, maxSemanas, coberturaDia, tonoTipo, formatoRango,
  error, onCerrarError, toast,
  onNuevoMolde, onMoldes, onVigencias, onEliminarTurnos, onAgregar, onGenerar,
  onAsignar, onDia,
}) => {
  const [pestana, setPestana] = useState('asignaciones');
  const funcionariosPorId = useMemo(() => new Map((funcionarios || []).map((f) => [Number(f.idFuncionario), f])), [funcionarios]);

  const kpi = useMemo(() => {
    const total = instancias.reduce((a, i) => a + turnosDe(i), 0);
    const cubiertos = instancias.reduce((a, i) => a + (i.idFuncionario ? turnosDe(i) : 0), 0);
    const conFuncionario = instancias.filter((i) => i.idFuncionario).length;
    const rotativas = new Set(instancias.map((i) => String(i.idRotativa))).size;
    const puestosUsados = new Set(instancias.map((i) => String(i.idPuesto ?? 'sin-puesto'))).size;
    return { total, cubiertos, vacantes: total - cubiertos, conFuncionario, sinFuncionario: instancias.length - conFuncionario, rotativas, puestosUsados };
  }, [instancias]);

  const vacio = instancias.length === 0;
  const subtitulo = [
    servicioNombre,
    planNombre ? `Molde «${planNombre}»` : (vacio ? 'Arma un molde de rotativas y genera los turnos' : 'Molde sin guardar'),
  ].filter(Boolean).join(' · ');

  return (
    <>
      <EncabezadoDesktop
        titulo="Planificación"
        subtitulo={(
          <span className="sgt-dp-subtitulo">
            {subtitulo}
            {!vacio && !planActualId && <ChipDesktop tono="aviso" mayus>Sin guardar</ChipDesktop>}
          </span>
        )}
        acciones={(
          <>
            <BotonDesktop variante="fantasma" onClick={onNuevoMolde} title="Molde nuevo: vacía la pantalla para armar otro molde">Molde nuevo</BotonDesktop>
            <BotonDesktop variante="secundario" onClick={onMoldes} title="Guardar el molde o cargar uno guardado">
              <FolderOpen size={14} strokeWidth={2.2} aria-hidden="true" />Moldes
            </BotonDesktop>
            <BotonDesktop variante="secundario" icono="clock" onClick={onVigencias} title="Vigencias del servicio: eliminar desde una fecha, anular o editar">Vigencias</BotonDesktop>
            <BotonDesktop
              variante="peligro"
              className="sgt-d-btn--icono"
              onClick={onEliminarTurnos}
              aria-label="Eliminar turnos generados"
              title="Eliminar turnos generados por este molde (legado)"
            >
              <Trash2 size={14} strokeWidth={2.2} aria-hidden="true" />
            </BotonDesktop>
            <span className="sgt-dp-separador" aria-hidden="true" />
            <BotonDesktop variante="secundario" icono="plus" onClick={onAgregar}>Agregar rotativa</BotonDesktop>
            <BotonDesktop variante="primario" onClick={onGenerar} disabled={vacio}>
              <CalendarCheck2 size={14} strokeWidth={2.2} aria-hidden="true" />Generar planificación
            </BotonDesktop>
          </>
        )}
      />
      <PaginaDesktop llena={!vacio}>
        {error && <AvisoCerrable onCerrar={onCerrarError}>{error}</AvisoCerrable>}

        {/* Con el molde vacío los KPIs serían todos cero: se omiten. */}
        {!vacio && (
          <div className="sgt-d-kpis sgt-dp-kpis">
            <KpiDesktop etiqueta="Rotativas" valor={kpi.rotativas} detalle={`${instancias.length} asignaciones · ${kpi.puestosUsados} puestos`} />
            <KpiDesktop etiqueta="Ciclo" valor={maxSemanas ? `${maxSemanas} sem.` : '—'} detalle={maxSemanas ? `${maxSemanas * 7} días por ciclo` : 'Según la rotativa más larga'} />
            <KpiDesktop etiqueta="Turnos por ciclo" valor={formatoNumero(kpi.total)} detalle={maxSemanas ? `≈${formatoNumero(Math.round(kpi.total / maxSemanas))} por semana` : 'Suma de las secuencias'} />
            <KpiDesktop etiqueta="Cubiertos" valor={formatoNumero(kpi.cubiertos)} color="var(--success)" detalle={`${kpi.conFuncionario}/${instancias.length} asignaciones con funcionario`} />
            <KpiDesktop etiqueta="Vacantes" valor={formatoNumero(kpi.vacantes)} color={kpi.vacantes ? 'var(--d-coral-ink)' : undefined} detalle={kpi.sinFuncionario ? `${kpi.sinFuncionario} asignaci${kpi.sinFuncionario === 1 ? 'ón' : 'ones'} sin funcionario` : 'Todas con funcionario'} />
          </div>
        )}

        {vacio ? (
          <PanelDesktop className="sgt-dp-vacio">
            <div className="sgt-dp-vacio__icono" aria-hidden="true"><SGTIcon name="calendar" size={24} color="var(--primary)" /></div>
            <h2 className="sgt-dp-vacio__titulo">Arma tu molde de planificación</h2>
            <ol className="sgt-dp-pasos">
              <li><span className="sgt-dp-pasos__num">1</span><span><b>Agrega rotativas</b> y asócialas a un puesto, o carga un molde guardado.</span></li>
              <li><span className="sgt-dp-pasos__num">2</span><span><b>Asigna funcionarios</b> a cada rotativa del molde.</span></li>
              <li><span className="sgt-dp-pasos__num">3</span><span><b>Guarda el molde y genera</b> la planificación desde un lunes.</span></li>
            </ol>
            <div className="sgt-dp-acciones sgt-dp-acciones--centro">
              <BotonDesktop variante="secundario" onClick={onMoldes}><FolderOpen size={14} strokeWidth={2.2} aria-hidden="true" />Cargar molde guardado</BotonDesktop>
              <BotonDesktop variante="primario" icono="plus" onClick={onAgregar}>Agregar rotativa</BotonDesktop>
            </div>
          </PanelDesktop>
        ) : (
          <PanelDesktop
            llena
            sinPadding
            icono={pestana === 'asignaciones' ? 'users' : 'calendar'}
            titulo={pestana === 'asignaciones' ? 'Asignaciones por puesto y rotativa' : `Ciclo de ${maxSemanas} semana${maxSemanas === 1 ? '' : 's'}`}
            subtitulo={pestana === 'asignaciones'
              ? `${kpi.puestosUsados} puestos × ${kpi.rotativas} rotativas · haz clic en una celda para asignar o cambiar`
              : 'Cobertura de cada día del ciclo, por tipo de turno'}
            acciones={(
              <SegmentosDesktop
                ariaLabel="Vista del molde"
                valor={pestana}
                onChange={setPestana}
                opciones={[
                  { id: 'asignaciones', etiqueta: 'Asignaciones', conteo: instancias.length },
                  { id: 'ciclo', etiqueta: 'Ciclo', conteo: `${maxSemanas} sem.` },
                ]}
              />
            )}
          >
            {pestana === 'asignaciones' ? (
              <MatrizMolde instancias={instancias} puestos={puestos} funcionariosPorId={funcionariosPorId} onAsignar={onAsignar} />
            ) : (
              <div className="sgt-dp-scroll">
                <CicloMolde
                  maxSemanas={maxSemanas}
                  daysIndex={daysIndex}
                  coberturaDia={coberturaDia}
                  tonoTipo={tonoTipo}
                  tipos={tipos}
                  onDia={onDia}
                  formatoRango={formatoRango}
                />
              </div>
            )}
          </PanelDesktop>
        )}
      </PaginaDesktop>
      <AvisoFlotante>{toast}</AvisoFlotante>
    </>
  );
};

// Carga inicial de los datos del servicio.
export const MoldeCargandoDesktop = () => (
  <>
    <EncabezadoDesktop titulo="Planificación" subtitulo="Cargando datos del servicio…" />
    <PaginaDesktop>
      <div className="sgt-d-kpis sgt-dp-kpis" aria-hidden="true">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="sgt-d-kpi"><div className="sgt-d-cargando" style={{ width: '45%', height: 10 }} /><div className="sgt-d-cargando" style={{ width: '30%', height: 20, marginTop: 6 }} /></div>
        ))}
      </div>
      <PanelDesktop titulo="Molde" icono="users">
        <div role="status" aria-busy="true" className="sgt-dp-cargando">
          {[82, 64, 74, 58].map((w) => <div key={w} className="sgt-d-cargando" style={{ width: `${w}%` }} />)}
          <span className="sgt-dp-visualmente-oculto">Cargando datos del servicio…</span>
        </div>
      </PanelDesktop>
    </PaginaDesktop>
  </>
);

export default MoldeDesktop;
