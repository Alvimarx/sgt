// Tabla de "Personal del servicio" en desktop (R18). Recibe el personal ya
// filtrado por la búsqueda de la vista (FuncionariosServicioJetaturaView) y
// suma un filtro por rol en el servicio, solo de presentación.
import React, { useState } from 'react';
import { PanelDesktop, TablaDesktop, BuscadorDesktop, SegmentosDesktop, ChipDesktop, PersonaDesktop } from '../ui';
import './gestion.css';

const TODOS = '__todos__';

// Rol del servicio (como viene del backend) → etiqueta del filtro.
const ETIQUETA_ROL = { JEFATURA: 'Jefatura', SUBROGANTE: 'Subrogante', MEDICO: 'Médico' };
const etiquetaRol = (r) => ETIQUETA_ROL[String(r).toUpperCase()] || r;

// Colores de avatar del Centro de operaciones: jefatura, urgenciólogo, médico.
const AVATAR = {
  jefatura: ['#E9D9C2', '#6E4E1F'],
  urgenciologo: ['#D5E3EE', '#2B4E6B'],
  medico: ['#E8E2EE', '#4E3A6F'],
};
const coloresAvatar = (f) => {
  if (String(f.rol).toUpperCase().includes('JEFATURA')) return AVATAR.jefatura;
  if (String(f.profesion).toLowerCase().includes('urgenci')) return AVATAR.urgenciologo;
  return AVATAR.medico;
};

// filas: [{ id, nombre, iniciales, rut, profesion, rol, tonoRol }] (ya filtradas por la búsqueda)
// roles: los roles presentes en el servicio, para las opciones del filtro.
export const PersonalServicioDesktop = ({ filas, roles, total, cargando, busqueda, onBusqueda, deshabilitado }) => {
  const [rol, setRol] = useState(TODOS);

  const conteoPorRol = filas.reduce((acc, f) => { acc[f.rol] = (acc[f.rol] || 0) + 1; return acc; }, {});
  const rolValido = rol === TODOS || roles.includes(rol) ? rol : TODOS;
  const visibles = rolValido === TODOS ? filas : filas.filter((f) => f.rol === rolValido);

  const subtitulo = cargando
    ? 'Cargando nómina de personal...'
    : visibles.length === total
      ? `${total} ${total === 1 ? 'funcionario' : 'funcionarios'}`
      : `${visibles.length} de ${total} funcionarios`;

  return (
    <PanelDesktop
      llena
      titulo="Funcionarios del servicio"
      subtitulo={subtitulo}
      icono="stethoscope"
      iconoColor="var(--success)"
      iconoFondo="var(--success-soft)"
      sinPadding
      acciones={
        <div className="sgt-d-toolbar">
          {roles.length > 1 && (
            <SegmentosDesktop
              ariaLabel="Filtrar por rol en el servicio"
              valor={rolValido}
              onChange={setRol}
              opciones={[
                { id: TODOS, etiqueta: 'Todos', conteo: filas.length },
                ...roles.map((r) => ({ id: r, etiqueta: etiquetaRol(r), conteo: conteoPorRol[r] || 0 })),
              ]}
            />
          )}
          <BuscadorDesktop
            value={busqueda}
            onChange={onBusqueda}
            placeholder="Buscar por nombre o RUT..."
            disabled={deshabilitado}
            style={{ width: 260 }}
          />
        </div>
      }
    >
      <TablaDesktop
        ariaLabel="Personal del servicio"
        cargando={cargando}
        filas={visibles}
        claveFila={(f) => f.id}
        vacio="No se encontraron funcionarios asignados a este servicio."
        columnas={[
          {
            id: 'nombre', titulo: 'Funcionario',
            render: (f) => {
              const [fondo, tinta] = coloresAvatar(f);
              return <PersonaDesktop nombre={f.nombre} iniciales={f.iniciales} fondo={fondo} tinta={tinta} />;
            },
          },
          { id: 'rut', titulo: 'RUT', ancho: 130, render: (f) => <span className="sgt-dg-num">{f.rut}</span> },
          { id: 'profesion', titulo: 'Profesión', render: (f) => f.profesion },
          { id: 'rol', titulo: 'Rol en el servicio', ancho: 170, render: (f) => <ChipDesktop tono={f.tonoRol} mayus>{f.rol}</ChipDesktop> },
        ]}
      />
    </PanelDesktop>
  );
};
