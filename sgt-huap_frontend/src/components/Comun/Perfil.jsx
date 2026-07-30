// ProfileView.jsx
import React from 'react';
import { SGT_DATA } from '../Admin2/data';
import { SGTAvatar, SGTIcon, SGTBadge } from '../Style/UIPrimitives';
import { useAuth } from '../../context/AuthContext';

// Exportamos el chip de roles por si lo necesitas en otras vistas
export const SGTRoleChip = ({ role }) => {
  const tones = {
    JEFATURA: 'warn',
    SUBROGANTE: 'warn', // <-- Agregado para que tenga el mismo color que Jefatura
    URGENCIOLOGO: 'primary',
    MEDICO: 'neutral'
  };
  return <SGTBadge tone={tones[role] || 'neutral'} size="xs">{role}</SGTBadge>;
};

// Paleta viva por herramienta — solo para los badges 3D de este módulo (no afecta al resto de la app).
const TOOL_THEMES = {
  dashboard:  { grad: 'linear-gradient(150deg, #6C8BFF 0%, #2B3FA0 100%)', glow: 'rgba(43,63,160,0.35)' },
  admin:      { grad: 'linear-gradient(150deg, #FFC24B 0%, #D97706 100%)', glow: 'rgba(217,119,6,0.32)' },
  jefatura:   { grad: 'linear-gradient(150deg, #34D399 0%, #0F7A45 100%)', glow: 'rgba(15,122,69,0.32)' },
  subrogante: { grad: 'linear-gradient(150deg, #F472B6 0%, #A21CAF 100%)', glow: 'rgba(162,28,175,0.32)' },
};

// Badge de ícono con relieve tipo "3D" (gradiente + brillo superior + sombra inferior), solo CSS.
const IconBadge3D = ({ icon, theme, size = 44 }) => (
  <div style={{
    width: size, height: size, borderRadius: 14, flexShrink: 0,
    background: theme.grad,
    display: 'grid', placeItems: 'center',
    boxShadow: `0 6px 14px ${theme.glow}, inset 0 1.5px 0 rgba(255,255,255,0.55), inset 0 -3px 5px rgba(0,0,0,0.18)`,
  }}>
    <SGTIcon name={icon} size={22} color="#fff" strokeWidth={2.2} />
  </div>
);

const ToolCard = ({ icon, theme, title, sub, onClick }) => (
  <button onClick={onClick} style={{
    width: '100%', display: 'flex', alignItems: 'center', gap: 12,
    background: '#fff', border: 'none', borderRadius: 16,
    padding: '14px 16px', cursor: 'pointer', textAlign: 'left',
    boxShadow: '0 4px 16px rgba(15,23,42,0.08)',
  }}>
    <IconBadge3D icon={icon} theme={theme} />
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 15, fontWeight: 800, color: '#0F1B2D' }}>{title}</div>
      <div style={{ fontSize: 12, color: '#7486A0', fontWeight: 600, marginTop: 2 }}>{sub}</div>
    </div>
    <SGTIcon name="chevron-right" size={16} color="#7486A0" strokeWidth={2.5} />
  </button>
);



const ProfileView = ({ onGoAdmin,onGoJefatura, onGoSubrogante, onBack, onGoPersonalDash }) => {
  const PA = SGT_DATA.PALETTE;

  const { user } = useAuth();
    
    // Usamos el usuario de la sesión, con fallback a data local por seguridad
  const me = user || SGT_DATA.PEOPLE.me;
  

  const nombreServicioActivo = localStorage.getItem('sgt_servicio_activo_nombre') || 'Servicio Asignado';

  const storedUser = JSON.parse(localStorage.getItem("user_data") || "{}");
  const rol = user?.rol ?? storedUser?.rol;                       // rol de servicio
  const rolSistema = user?.rolSistema ?? storedUser?.rolSistema;  // rol de sistema

  const isAdmin = rolSistema === 'ADMINISTRADOR';   // Panel de Administración (global)
  const isJefatura = rol === 'JEFATURA';
  const isSubrogante = rol === 'SUBROGANTE';

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: PA.surface2, animation: 'sgtFade .3s ease' }}>
      {/* Header — degradado vivo, del alto justo de la barra (sin cubrir el avatar de abajo) */}
      <div style={{ position: 'relative', flexShrink: 0, overflow: 'hidden', background: 'linear-gradient(120deg, #17416C 0%, #3E6FA1 48%, #2E7D57 100%)' }}>
        <div style={{ position: 'absolute', width: 90, height: 90, borderRadius: '50%', background: 'rgba(255,255,255,0.12)', top: -50, right: -30 }} aria-hidden="true" />
        <div style={{ position: 'relative', padding: '16px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={onBack} style={{ background: 'rgba(255,255,255,0.18)', border: 'none', borderRadius: 999, padding: 6, cursor: 'pointer', display: 'flex' }}>
            <SGTIcon name="chevron-left" size={22} color="#fff" />
          </button>
          <div style={{ fontSize: 19, fontWeight: 800, color: '#fff' }}>Mi Perfil</div>
        </div>
      </div>

      {/* Contenedor con scroll propio: evita que el contenido comprima el TabBar inferior */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
      <div style={{ padding: '20px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
        <SGTAvatar person={me} size={88} style={{ fontSize: 34, boxShadow: '0 8px 18px rgba(15,23,42,0.18)' }} />
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: PA.ink }}>{me.nombre}</h2>
          <p style={{ margin: '4px 0 0 0', fontSize: 14, color: PA.ink3, fontWeight: 600 }}>{nombreServicioActivo}</p>
          <div style={{ marginTop: 8 }}><SGTRoleChip role={me.rol} /></div>
        </div>
      </div>

      <div style={{ padding: '0 16px', marginTop: 10, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: PA.ink3, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 2 }}>
          Herramientas Especiales
        </div>

        <ToolCard
          icon="sliders"
          theme={TOOL_THEMES.dashboard}
          title="Mi Dashboard"
          sub="Tus horas, turnos y estadísticas"
          onClick={onGoPersonalDash}
        />
        {/* Mostramos el menu tan solo si tiene las facultades para este*/}
        {isAdmin && (
          <ToolCard
            icon="crown"
            theme={TOOL_THEMES.admin}
            title="Panel de Administración"
            sub="Configura servicios y rotativas"
            onClick={onGoAdmin}
          />
        )}
        {isJefatura && (
          <ToolCard
            icon="shield-check"
            theme={TOOL_THEMES.jefatura}
            title="Panel de Jefatura"
            sub="Gestiona turnos y personal"
            onClick={onGoJefatura}
          />
        )}
        {isSubrogante && (
          <ToolCard
            icon="user-gear"
            theme={TOOL_THEMES.subrogante}
            title="Panel de Subrogante"
            sub="Gestiona tus subrogancias"
            onClick={onGoSubrogante}
          />
        )}
      </div>
      </div>
    </div>
  );
};

export default ProfileView;