// AdminDashboard.jsx
import React from 'react';
import { SGT_DATA, DASHBOARD_ICON_THEMES, DASHBOARD_CARD_THEME_BY_TITLE } from './data';
import { SGTIcon, TopHeader } from '../Style/UIPrimitives';

const AdminCard = ({ icon, title, desc, onClick, delay = 0 }) => {
  const PA = SGT_DATA.PALETTE;
  const theme = DASHBOARD_ICON_THEMES[DASHBOARD_CARD_THEME_BY_TITLE[title]] || DASHBOARD_ICON_THEMES.blue;

  return (
    <button
      className="sgt-list-row"
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'flex-start', gap: 14, background: '#fff', border: 'none',
        borderRadius: 16, padding: 16, cursor: 'pointer', textAlign: 'left', boxShadow: '0 4px 16px rgba(15,23,42,0.08)',
        animation: `sgtCardIn .4s cubic-bezier(.22,1,.36,1) ${delay}s both`,
      }}
    >
      <div style={{
        width: 44, height: 44, borderRadius: 14, background: theme.grad, display: 'grid', placeItems: 'center', flexShrink: 0,
        boxShadow: `0 6px 14px ${theme.glow}, inset 0 1.5px 0 rgba(255,255,255,0.55), inset 0 -3px 5px rgba(0,0,0,0.18)`,
      }}>
        <SGTIcon name={icon} size={22} color="#fff" strokeWidth={2.2} />
      </div>
      <div>
        <div style={{ fontSize: 16, fontWeight: 800, color: PA.ink }}>{title}</div>
        <div style={{ fontSize: 13, color: PA.ink3, fontWeight: 600, marginTop: 4, lineHeight: 1.4 }}>{desc}</div>
      </div>
    </button>
  );
};

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
        <AdminCard
          icon="building"
          title="Crear Servicio"
          desc="Agrega y configura nuevas unidades de trabajo."
          onClick={onGoServicios}
          delay={0}
        />
        <AdminCard
          icon="users"
          title="Asignación de Funcionarios"
          desc="Asigna funcionarios a servicios y rotativas."
          onClick={onGoAsignacion}
          delay={0.03}
        />
        <AdminCard
          icon="user"
          title="Personal del Sistema"
          desc="Visualiza el personal asociado al servicio."
          onClick={onGoFuncionariosSistema}
          delay={0.06}
        />
        <AdminCard
          icon="org-chart"
          title="Jerarquía de Funcionarios"
          desc="Designa nuevas jefaturas al sistema."
          onClick={onGoFuncionarios}
          delay={0.09}
        />
        <AdminCard
          icon="home"
          title="Gestionar Puestos"
          desc="Crea, edita y elimina puestos del sistema."
          onClick={onGoPuestos}
          delay={0.12}
        />

        <SectionLabel>Gestión de Turnos</SectionLabel>
        <AdminCard
          icon="users"
          title="Asignación de turnos"
          desc="Asigna o quita funcionarios de turnos"
          onClick={onGoAsignacionTurnos}
          delay={0.15}
        />
        <AdminCard
          icon="calendar"
          title="Crear tipo de Turno"
          desc="Diseña un nuevo tipo de turno."
          onClick={onGoTiposTurno}
          delay={0.18}
        />
        <AdminCard
          icon="rotate"
          title="Crear Rotativa"
          desc="Diseña una nueva rotativa."
          onClick={onGoPlantillas}
          delay={0.21}
        />
        <AdminCard
          icon="calendar"
          title="Crear Planificación Mensual"
          desc="Diseña una nueva planificación mensual."
          onClick={onGoPlanificacion}
          delay={0.24}
        />
        <AdminCard
          icon="sliders"
          title="Reglas de Horario del Servicio"
          desc="Ajuste automático de horas en fines de semana y feriados."
          onClick={onGoReglas}
          delay={0.27}
        />

        <SectionLabel>Gestión Operacional</SectionLabel>
        <AdminCard
          icon="alert"
          title="Evaluar Solicitudes"
          desc="Acepta o rechaza solicitudes de cambio de turno, vacaciones o permisos."
          onClick={onGoSolitudes}
          delay={0.3}
        />
        <AdminCard
          icon="sliders"
          title="Estadísticas del Servicio"
          desc="Cobertura, turnos vacantes y horas cubiertas."
          onClick={onGoStats}
          delay={0.33}
        />

        <SectionLabel>Control y Auditoría</SectionLabel>
        <AdminCard
          icon="history"
          title="Bitácora de Cambios"
          desc="Registro cronológico de todos los eventos del sistema."
          onClick={onGoBitacora}
          delay={0.36}
        />
        <AdminCard
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
