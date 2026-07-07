// AdminDashboard.jsx
import React from 'react';
import { SGT_DATA } from './data';
import { SGTIcon } from '../Style/UIPrimitives';

const AdminCard = ({ icon, title, desc, tone, onClick }) => {
  const PA = SGT_DATA.PALETTE;
  const isPrimary = tone === 'primary';
  const color = isPrimary ? PA.primary : '#B85A60';
  const bg = isPrimary ? PA.primarySoft : PA.accentSoft;

  return (
    <button onClick={onClick} style={{
      display: 'flex', alignItems: 'flex-start', gap: 14, background: '#fff', border: `1px solid ${PA.line}`,
      borderRadius: 14, padding: 16, cursor: 'pointer', textAlign: 'left'
    }}>
      <div style={{ width: 44, height: 44, borderRadius: 12, background: bg, display: 'grid', placeItems: 'center', color: color, flexShrink: 0 }}>
        <SGTIcon name={icon} size={22} />
      </div>
      <div>
        <div style={{ fontSize: 16, fontWeight: 800, color: PA.ink }}>{title}</div>
        <div style={{ fontSize: 13, color: PA.ink3, fontWeight: 600, marginTop: 4, lineHeight: 1.4 }}>{desc}</div>
      </div>
    </button>
  );
};

const AdminDashboard = ({ onBack, onGoRotativa,onGoFuncionariosSistema, onGoServicios, onGoAsignacion, onGoFuncionarios, onGoSolitudes, onGoPuestos, onGoStats, onGoBitacora, onGoAuditoria, onGoTiposTurno, onGoPlantillas, onGoPlanificacion, onGoReglas, onGoAsignacionTurnos }) => {
  const PA = SGT_DATA.PALETTE;

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: PA.surface2, animation: 'sgtSlideLeft .3s ease', overflow: 'hidden' }}>
      <div style={{ padding: '16px', background: '#fff', borderBottom: `1px solid ${PA.line2}`, display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={onBack} style={{ background: 'transparent', border: 'none', padding: 4, cursor: 'pointer', display: 'flex' }}>
          <SGTIcon name="chevron-left" size={24} color={PA.ink} />
        </button>
        <div style={{ fontSize: 19, fontWeight: 800, color: PA.ink }}>Administración</div>
      </div>

      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12, overflow: 'auto', flex: 1 }}>
        <p style={{ margin: '0 0 10px', fontSize: 14, color: PA.ink3, fontWeight: 600 }}>Selecciona un módulo para configurar la plataforma.</p>

        {/* AÑADIDO: onClick={onGoServicios} */}
        <AdminCard 
          icon="briefcase" 
          title="Crear Servicio" 
          desc="Agrega y configura nuevas unidades de trabajo." 
          tone="primary" 
          onClick={onGoServicios}
        />
        <AdminCard 
          icon="users" 
          title="Asignación de Funcionarios" 
          desc="Asigna funcionarios a servicios y rotativas." 
          tone="primary" 
          onClick={onGoAsignacion}
        />
        <AdminCard
        
          icon="user" 
          title="Personal del Sistema"
          desc="Visualiza el personal asociado al servicio."
          tone="primary"
          onClick={onGoFuncionariosSistema}
        />
        <AdminCard 
          icon="users" 
          title="Asignación de turnos" 
          desc="Asigna o quita funcionarios de turnos" 
          tone="accent" 
          onClick={onGoAsignacionTurnos} 
        />
        <AdminCard 
          icon="user" 
          title="Jerarquía de Funcionarios" 
          desc="Designa nuevas jefaturas al sistema." 
          tone="primary" 
          onClick={onGoFuncionarios}
        />
        <AdminCard 
          icon="calendar" 
          title="Crear tipo de Turno" 
          desc="Diseña un nuevo tipo de turno." 
          tone="accent" 
          onClick={onGoTiposTurno} 
        />
        <AdminCard 
          icon="calendar" 
          title="Crear Rotativa" 
          desc="Diseña una nueva rotativa." 
          tone="accent" 
          onClick={onGoPlantillas} 
        />
        <AdminCard 
          icon="calendar" 
          title="Crear Planificación Mensual" 
          desc="Diseña una nueva planificación mensual." 
          tone="accent" 
          onClick={onGoPlanificacion} 
        />

        <AdminCard 
          icon="alert" 
          title="Evaluar Solicitudes" 
          desc="Acepta o rechaza solicitudes de cambio de turno, vacaciones o permisos." 
          tone="accent" 
          onClick={onGoSolitudes} 
        />
        <AdminCard
          icon="home"
          title="Gestionar Puestos"
          desc="Crea, edita y elimina puestos del sistema."
          tone="primary"
          onClick={onGoPuestos}
        />
        <AdminCard
          icon="sliders"
          title="Reglas de Servicio"
          desc="Ajuste automático de horas en fines de semana y feriados."
          tone="accent"
          onClick={onGoReglas}
        />
        <AdminCard
          icon="sliders"
          title="Estadísticas del Servicio"
          desc="Cobertura, turnos vacantes y horas cubiertas."
          tone="primary"
          onClick={onGoStats}
        />
        <AdminCard
          icon="history"
          title="Bitácora de Cambios"
          desc="Registro cronológico de todos los eventos del sistema."
          tone="accent"
          onClick={onGoBitacora}
        />
        <AdminCard
          icon="check-circle"
          title="Auditoría de Asistencia"
          desc="Revisa qué turnos pasados tuvieron cobertura o quedaron vacantes."
          tone="accent"
          onClick={onGoAuditoria}
        />
      </div>

      
    </div>
  );
};

export default AdminDashboard;