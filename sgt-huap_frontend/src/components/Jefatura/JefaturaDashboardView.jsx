import React from 'react';
import { SGT_DATA } from '../Admin2/data';
import { SGTIcon } from '../Style/UIPrimitives';

const JefaturaCard = ({ icon, title, desc, tone, onClick }) => {
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

const JefaturaDashboard = ({ onBack, onGoFuncionariosJefatura, onGoSolitudes, onGoPuestos, onGoStats, onGoBitacora, onGoAuditoria, onGoTiposTurno, onGoPlantillas, onGoPlanificacion }) => {
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
        <JefaturaCard 
          icon="users" 
          title="Asignación de turnos" 
          desc="Asigna o quita funcionarios de turnos" 
          tone="accent" 
          onClick={onGoSolitudes} 
        />
        <JefaturaCard 
          icon="user" 
          title="Jerarquía de Funcionarios" 
          desc="Designa nuevas jefaturas al sistema." 
          tone="primary" 
          onClick={onGoFuncionariosJefatura}
        />
        <JefaturaCard 
          icon="calendar" 
          title="Crear tipo de Turno" 
          desc="Diseña un nuevo tipo de turno." 
          tone="accent" 
          onClick={onGoTiposTurno} 
        />
        <JefaturaCard 
          icon="calendar" 
          title="Crear Rotativa" 
          desc="Diseña una nueva rotativa." 
          tone="accent" 
          onClick={onGoPlantillas} 
        />
        <JefaturaCard 
          icon="calendar" 
          title="Crear Planificación Mensual" 
          desc="Diseña una nueva planificación mensual." 
          tone="accent" 
          onClick={onGoPlanificacion} 
        />

        <JefaturaCard 
          icon="alert" 
          title="Evaluar Solicitudes" 
          desc="Acepta o rechaza solicitudes de cambio de turno, vacaciones o permisos." 
          tone="accent" 
          onClick={onGoSolitudes} 
        />
        <JefaturaCard
          icon="home"
          title="Gestionar Puestos"
          desc="Crea, edita y elimina puestos del sistema."
          tone="primary"
          onClick={onGoPuestos}
        />
        <JefaturaCard
          icon="sliders"
          title="Estadísticas del Servicio"
          desc="Cobertura, turnos vacantes y horas cubiertas."
          tone="primary"
          onClick={onGoStats}
        />
        <JefaturaCard
          icon="history"
          title="Bitácora de Cambios"
          desc="Registro cronológico de todos los eventos del sistema."
          tone="accent"
          onClick={onGoBitacora}
        />
        <JefaturaCard
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

export default JefaturaDashboard;