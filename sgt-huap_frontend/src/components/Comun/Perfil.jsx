// ProfileView.jsx
import React from 'react';
import { SGT_DATA } from '../Admin2/data';
import { TopHeader, SGTAvatar, SGTIcon, SGTBadge } from '../Style/UIPrimitives';
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
      <TopHeader title="Mi Perfil" dense />

      {/* Nuevo Header con botón Volver */}
      <div style={{ padding: '16px', background: '#fff', borderBottom: `1px solid ${PA.line2}`, display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={onBack} style={{ background: 'transparent', border: 'none', padding: 4, cursor: 'pointer', display: 'flex' }}>
          <SGTIcon name="chevron-left" size={24} color={PA.ink} />
        </button>
        <div style={{ fontSize: 19, fontWeight: 800, color: PA.ink }}>Mi Perfil</div>
      </div>
      
      <div style={{ padding: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
        <SGTAvatar person={me} size={80} style={{ fontSize: 32 }} />
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: PA.ink }}>{me.nombre}</h2>
          <p style={{ margin: '4px 0 0 0', fontSize: 14, color: PA.ink3, fontWeight: 600 }}>{nombreServicioActivo}</p>
          <div style={{ marginTop: 8 }}><SGTRoleChip role={me.rol} /></div>
        </div>
      </div>

      <div style={{ padding: '0 16px', marginTop: 10, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: PA.ink3, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>
          Herramientas Especiales
        </div>

        <button onClick={onGoPersonalDash} style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 12,
          background: '#fff', border: `1px solid ${PA.primary}`, borderRadius: 14,
          padding: '16px', cursor: 'pointer', textAlign: 'left',
          boxShadow: '0 4px 12px rgba(23,65,108,0.08)'
        }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: PA.primarySoft, display: 'grid', placeItems: 'center', color: PA.primary }}>
            <SGTIcon name="sliders" size={20} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: PA.ink }}>Mi Dashboard</div>
            <div style={{ fontSize: 12, color: PA.ink3, fontWeight: 600, marginTop: 2 }}>Tus horas, turnos y estadísticas</div>
          </div>
          <SGTIcon name="chevron-right" size={16} color={PA.primary} strokeWidth={2.5}/>
        </button>
        {/* Mostramos el menu tan solo si tiene las facultades para este*/}
        {isAdmin && (
          <button onClick={onGoAdmin} style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 12,
            background: '#fff', border: `1px solid ${PA.warn}`, borderRadius: 14,
            padding: '16px', cursor: 'pointer', textAlign: 'left',
            boxShadow: '0 4px 12px rgba(200, 135, 0, 0.1)'
          }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: PA.warnSoft, display: 'grid', placeItems: 'center', color: PA.warn }}>
              <SGTIcon name="crown" size={20} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: PA.ink }}>Panel de Administración</div>
              <div style={{ fontSize: 12, color: PA.ink3, fontWeight: 600, marginTop: 2 }}>Configura servicios y rotativas</div>
            </div>
            <SGTIcon name="chevron-right" size={16} color={PA.warn} strokeWidth={2.5}/>
          </button>
        )}
        {isJefatura && (
          <button onClick={onGoJefatura} style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 12,
              background: '#fff', border: `1px solid ${PA.primary}`, borderRadius: 14,
              padding: '16px', cursor: 'pointer', textAlign: 'left',
              boxShadow: '0 4px 12px rgba(23,65,108,0.08)'
            }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: PA.primarySoft, display: 'grid', placeItems: 'center', color: PA.primary }}>
                <SGTIcon name="shield-check" size={20} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 800, color: PA.ink }}>Panel de Jefatura</div>
                <div style={{ fontSize: 12, color: PA.ink3, fontWeight: 600, marginTop: 2 }}>Gestiona turnos y personal</div>
              </div>
            <SGTIcon name="chevron-right" size={16} color={PA.primary} strokeWidth={2.5}/>
          </button>
        )}
        {isSubrogante && (
          <button onClick={onGoSubrogante} style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 12,
              background: '#fff', border: `1px solid ${PA.warn}`, borderRadius: 14,
              padding: '16px', cursor: 'pointer', textAlign: 'left',
              boxShadow: '0 4px 12px rgba(200, 135, 0, 0.1)'
            }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: PA.warnSoft, display: 'grid', placeItems: 'center', color: PA.warn }}>
                <SGTIcon name="user-gear" size={20} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 800, color: PA.ink }}>Panel de Subrogante</div>
                <div style={{ fontSize: 12, color: PA.ink3, fontWeight: 600, marginTop: 2 }}>Gestiona tus subrogancias</div>
              </div>
            <SGTIcon name="chevron-right" size={16} color={PA.warn} strokeWidth={2.5}/>
          </button>
        )}
      </div>
    </div>
  );
};

export default ProfileView;