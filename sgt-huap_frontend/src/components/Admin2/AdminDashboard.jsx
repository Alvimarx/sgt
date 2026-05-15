// AdminDashboard.jsx
import React from 'react';
import { SGT_DATA } from './data';
import { SGTIcon } from './UIPrimitives';

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

// AÑADIDO: onGoServicios a los props
const AdminDashboard = ({ onBack, onGoRotativa, onGoServicios, onGoAsignacion, onGoFuncionarios, onGoSolitudes }) => {
  const PA = SGT_DATA.PALETTE;

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: PA.surface2, animation: 'sgtSlideLeft .3s ease' }}>
      <div style={{ padding: '16px', background: '#fff', borderBottom: `1px solid ${PA.line2}`, display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={onBack} style={{ background: 'transparent', border: 'none', padding: 4, cursor: 'pointer', display: 'flex' }}>
          <SGTIcon name="chevron-left" size={24} color={PA.ink} />
        </button>
        <div style={{ fontSize: 19, fontWeight: 800, color: PA.ink }}>Administración</div>
      </div>

      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
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
          tone="accent" 
          onClick={onGoAsignacion}
        />
        <AdminCard 
          icon="user" 
          title="Jerarquía de Funcionarios" 
          desc="Designa nuevas jefaturas al sistema." 
          tone="accent" 
          onClick={onGoFuncionarios}
        />
        <AdminCard 
          icon="calendar" 
          title="Crear Rotativa" 
          desc="Diseña un nuevo patrón de turnos rotativos en 6 pasos." 
          tone="accent" 
          onClick={onGoRotativa} 
        />
        <AdminCard 
          icon="alert" 
          title="Evaluar Solicitudes" 
          desc="Acepta o rechaza solicitudes de cambio de turno, vacaciones o permisos." 
          tone="accent" 
          onClick={onGoSolitudes} 
        />
      </div>

      
    </div>
  );
};

export default AdminDashboard;