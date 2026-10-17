// Tabla de la auditoría de asistencia en desktop (R18): los turnos pasados del
// mes que ya filtró la vista (AuditoriaView), con un filtro de presentación
// por estado (todos, asignados, vacantes).
import React, { useState } from 'react';
import { PanelDesktop, TablaDesktop, SegmentosDesktop, ChipDesktop, PersonaDesktop } from '../ui';
import './gestion.css';

// filas: [{ id, fecha, turno, horario, puesto, asignado, funcionario }]
export const TablaAuditoriaDesktop = ({ filas, cargando, titulo, vacio }) => {
  const [estado, setEstado] = useState('todos');
  const asignados = filas.filter((f) => f.asignado).length;
  const visibles = estado === 'todos' ? filas : filas.filter((f) => (estado === 'asignados' ? f.asignado : !f.asignado));

  return (
    <PanelDesktop
      llena
      titulo={titulo}
      subtitulo={cargando ? 'Cargando turnos...' : `${visibles.length} ${visibles.length === 1 ? 'turno' : 'turnos'}`}
      icono="shield-search"
      iconoColor="#0F766E"
      iconoFondo="#E2F4F1"
      sinPadding
      acciones={
        <SegmentosDesktop
          ariaLabel="Filtrar por estado"
          valor={estado}
          onChange={setEstado}
          opciones={[
            { id: 'todos', etiqueta: 'Todos', conteo: filas.length },
            { id: 'asignados', etiqueta: 'Asignados', conteo: asignados },
            { id: 'vacantes', etiqueta: 'Vacantes', conteo: filas.length - asignados },
          ]}
        />
      }
    >
      <TablaDesktop
        ariaLabel={titulo}
        cargando={cargando}
        filas={visibles}
        claveFila={(f) => f.id}
        vacio={vacio}
        columnas={[
          { id: 'fecha', titulo: 'Fecha', ancho: 120, render: (f) => <span className="sgt-dg-mayus-cap" style={{ display: 'inline-block' }}>{f.fecha}</span> },
          { id: 'turno', titulo: 'Turno', ancho: 130, render: (f) => (f.turno ? <span className="sgt-dg-nowrap" style={{ fontWeight: 800, textTransform: 'uppercase', fontSize: 10.5, letterSpacing: 0.4 }}>{f.turno}</span> : <span className="sgt-dg-sec">—</span>) },
          { id: 'horario', titulo: 'Horario', ancho: 130, render: (f) => <span className="sgt-dg-num">{f.horario}</span> },
          { id: 'puesto', titulo: 'Puesto', render: (f) => f.puesto },
          {
            id: 'funcionario', titulo: 'Funcionario',
            render: (f) => (f.asignado ? <PersonaDesktop nombre={f.funcionario} fondo="var(--success-soft)" tinta="var(--success)" /> : <span className="sgt-dg-sec">Sin funcionario</span>),
          },
          {
            id: 'estado', titulo: 'Estado', ancho: 110,
            render: (f) => <ChipDesktop tono={f.asignado ? 'exito' : 'alerta'} mayus>{f.asignado ? 'Asignado' : 'Vacante'}</ChipDesktop>,
          },
        ]}
      />
    </PanelDesktop>
  );
};
