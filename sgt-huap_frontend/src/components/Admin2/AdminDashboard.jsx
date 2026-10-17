// AdminDashboard.jsx
import React from 'react';
import { SGT_DATA } from './data';
import { SGTIcon, TopHeader, DashboardCard } from '../Style/UIPrimitives';
import { useLayout } from '../../layout/layout';
import { EncabezadoDesktop, PaginaDesktop, BotonDesktop } from '../Desktop/ui';
import { GrillaModulosDesktop } from '../Desktop/gestion/ModulosDesktop';
import '../Desktop/admin/mantenedores.css';

const SectionLabel = ({ children }) => {
  const PA = SGT_DATA.PALETTE;
  return (
    <div style={{
      fontSize: 11.5, fontWeight: 800, color: PA.ink3, letterSpacing: 1,
      textTransform: 'uppercase', margin: '18px 2px 2px',
    }}>{children}</div>
  );
};

const AdminDashboard = ({ onBack, onGoFuncionariosSistema, onGoServicios, onGoAsignacion, onGoFuncionarios, onGoSolitudes, onGoPuestos, onGoStats, onGoBitacora, onGoAuditoria, onGoTiposTurno, onGoPlantillas, onGoPlanificacion, onGoReglas, onGoAsignacionTurnos }) => {
  const PA = SGT_DATA.PALETTE;
  const { esDesktop } = useLayout();

  // Desktop (R18): los mismos módulos, con los mismos textos, íconos, colores
  // y acciones que las tarjetas móviles, en una columna por área con la misma
  // grilla de módulos que los paneles de Jefatura y Subrogante. Se llega desde
  // Mi Perfil (no es un ítem del menú), así que conserva su "volver".
  if (esDesktop) {
    const grupos = [
      {
        titulo: 'Gestión Organizacional',
        modulos: [
          { icono: 'building', titulo: 'Crear Servicio', descripcion: 'Agrega y configura nuevas unidades de trabajo.', onClick: onGoServicios },
          { icono: 'users', titulo: 'Asignación de Funcionarios', descripcion: 'Asigna funcionarios a servicios y rotativas.', onClick: onGoAsignacion },
          { icono: 'user', titulo: 'Personal del Sistema', descripcion: 'Visualiza el personal asociado al servicio.', onClick: onGoFuncionariosSistema },
          { icono: 'org-chart', titulo: 'Jerarquía de Funcionarios', descripcion: 'Designa nuevas jefaturas al sistema.', onClick: onGoFuncionarios },
          { icono: 'home', titulo: 'Gestionar Puestos', descripcion: 'Crea, edita y elimina puestos del sistema.', onClick: onGoPuestos },
        ],
      },
      {
        titulo: 'Gestión de Turnos',
        modulos: [
          { icono: 'users', titulo: 'Asignación de turnos', descripcion: 'Asigna o quita funcionarios de turnos', onClick: onGoAsignacionTurnos },
          { icono: 'calendar', titulo: 'Crear tipo de Turno', descripcion: 'Diseña un nuevo tipo de turno.', onClick: onGoTiposTurno },
          { icono: 'rotate', titulo: 'Crear Rotativa', descripcion: 'Diseña una nueva rotativa.', onClick: onGoPlantillas },
          { icono: 'calendar', titulo: 'Crear Planificación Mensual', descripcion: 'Diseña una nueva planificación mensual.', onClick: onGoPlanificacion },
          { icono: 'sliders', titulo: 'Reglas de Horario del Servicio', descripcion: 'Ajuste automático de horas en fines de semana y feriados.', onClick: onGoReglas },
        ],
      },
      {
        titulo: 'Gestión Operacional',
        modulos: [
          { icono: 'alert', titulo: 'Evaluar Solicitudes', descripcion: 'Acepta o rechaza solicitudes de cambio de turno, vacaciones o permisos.', onClick: onGoSolitudes },
          { icono: 'sliders', titulo: 'Estadísticas del Servicio', descripcion: 'Cobertura, turnos vacantes y horas cubiertas.', onClick: onGoStats },
        ],
      },
      {
        titulo: 'Control y Auditoría',
        modulos: [
          { icono: 'history', titulo: 'Bitácora de Cambios', descripcion: 'Registro cronológico de todos los eventos del sistema.', onClick: onGoBitacora },
          { icono: 'shield-search', titulo: 'Auditoría de Asistencia', descripcion: 'Revisa qué turnos pasados tuvieron cobertura o quedaron vacantes.', onClick: onGoAuditoria },
        ],
      },
    ];
    const servicio = localStorage.getItem('sgt_servicio_activo_nombre');
    return (
      <>
        <EncabezadoDesktop
          titulo="Administración"
          subtitulo={servicio ? `${servicio} · Selecciona un módulo para configurar la plataforma.` : 'Selecciona un módulo para configurar la plataforma.'}
          izquierda={<BotonDesktop variante="secundario" icono="chevron-left" aria-label="Volver a Mi Perfil" title="Volver a Mi Perfil" onClick={onBack} />}
        />
        <PaginaDesktop ancho="amplio">
          <div className="sgt-da-mant-modulos">
            {grupos.map((g, i) => (
              <section key={g.titulo} className="sgt-da-mant-grupo" aria-labelledby={`admin-grupo-${i}`}>
                <h2 id={`admin-grupo-${i}`} className="sgt-da-mant-grupo__titulo">{g.titulo}</h2>
                <GrillaModulosDesktop modulos={g.modulos} ariaLabel={`Módulos de ${g.titulo}`} />
              </section>
            ))}
          </div>
        </PaginaDesktop>
      </>
    );
  }

  return (
    <div className="dash-page-bg" style={{ flex: 1, display: 'flex', flexDirection: 'column', animation: 'sgtSlideLeft .3s ease', overflow: 'hidden' }}>
      <TopHeader
        title="Administración"
        subtitle="Selecciona un módulo para configurar la plataforma."
        leftSlot={
          <button onClick={onBack} style={{ background: 'transparent', border: 'none', padding: 4, cursor: 'pointer', display: 'flex' }}>
            <SGTIcon name="chevron-left" size={24} color={PA.ink} />
          </button>
        }
      />

      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12, overflow: 'auto', flex: 1 }}>

        <SectionLabel>Gestión Organizacional</SectionLabel>
        <DashboardCard
          icon="building"
          title="Crear Servicio"
          desc="Agrega y configura nuevas unidades de trabajo."
          onClick={onGoServicios}
          delay={0}
        />
        <DashboardCard
          icon="users"
          title="Asignación de Funcionarios"
          desc="Asigna funcionarios a servicios y rotativas."
          onClick={onGoAsignacion}
          delay={0.03}
        />
        <DashboardCard
          icon="user"
          title="Personal del Sistema"
          desc="Visualiza el personal asociado al servicio."
          onClick={onGoFuncionariosSistema}
          delay={0.06}
        />
        <DashboardCard
          icon="org-chart"
          title="Jerarquía de Funcionarios"
          desc="Designa nuevas jefaturas al sistema."
          onClick={onGoFuncionarios}
          delay={0.09}
        />
        <DashboardCard
          icon="home"
          title="Gestionar Puestos"
          desc="Crea, edita y elimina puestos del sistema."
          onClick={onGoPuestos}
          delay={0.12}
        />

        <SectionLabel>Gestión de Turnos</SectionLabel>
        <DashboardCard
          icon="users"
          title="Asignación de turnos"
          desc="Asigna o quita funcionarios de turnos"
          onClick={onGoAsignacionTurnos}
          delay={0.15}
        />
        <DashboardCard
          icon="calendar"
          title="Crear tipo de Turno"
          desc="Diseña un nuevo tipo de turno."
          onClick={onGoTiposTurno}
          delay={0.18}
        />
        <DashboardCard
          icon="rotate"
          title="Crear Rotativa"
          desc="Diseña una nueva rotativa."
          onClick={onGoPlantillas}
          delay={0.21}
        />
        <DashboardCard
          icon="calendar"
          title="Crear Planificación Mensual"
          desc="Diseña una nueva planificación mensual."
          onClick={onGoPlanificacion}
          delay={0.24}
        />
        <DashboardCard
          icon="sliders"
          title="Reglas de Horario del Servicio"
          desc="Ajuste automático de horas en fines de semana y feriados."
          onClick={onGoReglas}
          delay={0.27}
        />

        <SectionLabel>Gestión Operacional</SectionLabel>
        <DashboardCard
          icon="alert"
          title="Evaluar Solicitudes"
          desc="Acepta o rechaza solicitudes de cambio de turno, vacaciones o permisos."
          onClick={onGoSolitudes}
          delay={0.3}
        />
        <DashboardCard
          icon="sliders"
          title="Estadísticas del Servicio"
          desc="Cobertura, turnos vacantes y horas cubiertas."
          onClick={onGoStats}
          delay={0.33}
        />

        <SectionLabel>Control y Auditoría</SectionLabel>
        <DashboardCard
          icon="history"
          title="Bitácora de Cambios"
          desc="Registro cronológico de todos los eventos del sistema."
          onClick={onGoBitacora}
          delay={0.36}
        />
        <DashboardCard
          icon="shield-search"
          title="Auditoría de Asistencia"
          desc="Revisa qué turnos pasados tuvieron cobertura o quedaron vacantes."
          onClick={onGoAuditoria}
          delay={0.39}
        />
      </div>
    </div>
  );
};

export default AdminDashboard;
