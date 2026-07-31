// AdminDashboard.jsx
import React from 'react';
import { SGT_DATA } from './data';
import { SGTIcon, TopHeader, DashboardCard } from '../Style/UIPrimitives';

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
