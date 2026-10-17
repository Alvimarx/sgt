// ProfileView.jsx
import React from 'react';
import { SGT_DATA } from '../Admin2/data';
import { SGTAvatar, SGTIcon, SGTBadge, IconBadge3D as IconBadge3DKit } from '../Style/UIPrimitives';
import { useAuth } from '../../context/AuthContext';
import { useLayout } from '../../layout/layout';
import { EncabezadoDesktop, PaginaDesktop, PanelDesktop, BotonDesktop, ChipDesktop } from '../Desktop/ui';
import '../Desktop/gestion/gestion.css';

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



// Iniciales del avatar, en móvil (SGTAvatar) y en desktop.
const inicialesDe = (nombre) => {
  const partes = String(nombre || '').trim().split(/\s+/);
  return ((partes[0]?.[0] || '') + (partes[1]?.[0] || '')).toUpperCase() || '·';
};

// Fila de herramienta en desktop: mismo ícono, color, título y subtítulo que
// la ToolCard móvil, compacta.
const HerramientaDesktop = ({ icon, theme, title, sub, onClick }) => (
  <button type="button" className="sgt-dg-herramienta" onClick={onClick}>
    <IconBadge3DKit icon={icon} theme={theme} size={36} iconSize={18} radius={11} />
    <span style={{ flex: 1, minWidth: 0 }}>
      <span className="sgt-dg-herramienta__titulo">{title}</span>
      <span className="sgt-dg-herramienta__sub">{sub}</span>
    </span>
    <SGTIcon name="chevron-right" size={15} color="#7486A0" strokeWidth={2.5} />
  </button>
);

const ProfileView = ({ onGoAdmin,onGoJefatura, onGoSubrogante, onBack, onGoPersonalDash, onChangeService }) => {
  const PA = SGT_DATA.PALETTE;
  const { esDesktop } = useLayout();

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

  // Desktop (R18): vista raíz del menú (sin volver). Página angosta en dos
  // columnas: los datos de la sesión y los mismos accesos que en móvil, más
  // "Cambiar servicio" (el mismo flujo del menú lateral).
  if (esDesktop) {
    const servicios = Array.isArray(user?.servicios) ? user.servicios : [];
    return (
      <>
        <EncabezadoDesktop titulo="Mi Perfil" subtitulo={`${nombreServicioActivo} · ${me.rol || 'Sin rol'}`} />
        <PaginaDesktop ancho="angosto">
          <div className="sgt-d-columnas" style={{ '--d-columnas': 'minmax(0, 1fr) minmax(0, 1fr)' }}>
            <PanelDesktop titulo="Mis datos" icono="user">
              <div className="sgt-dg-perfil">
                <div className="sgt-dg-perfil__avatar" aria-hidden="true">{inicialesDe(me.nombre)}</div>
                <div style={{ minWidth: 0 }}>
                  <div className="sgt-dg-perfil__nombre">{me.nombre}</div>
                  <div style={{ marginTop: 5 }}><SGTRoleChip role={me.rol} /></div>
                </div>
              </div>
              <dl className="sgt-dg-datos">
                {user?.rutCompleto && (<><dt>RUT</dt><dd className="sgt-dg-num">{user.rutCompleto}</dd></>)}
                <dt>Servicio activo</dt><dd>{nombreServicioActivo}</dd>
                <dt>Rol en el servicio</dt><dd>{me.rol || '—'}</dd>
                {servicios.length > 1 && (
                  <>
                    <dt>Mis servicios</dt>
                    <dd style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {servicios.map((s) => (
                        <ChipDesktop key={s.idServicio ?? s.servicioId ?? s.nombreServicio} tono={s.nombreServicio === nombreServicioActivo ? 'primario' : 'neutral'}>
                          {s.nombreServicio ?? s.nombre}
                        </ChipDesktop>
                      ))}
                    </dd>
                  </>
                )}
              </dl>
            </PanelDesktop>

            <PanelDesktop titulo="Herramientas especiales" icono="sliders">
              <div className="sgt-dg-herramientas">
                <HerramientaDesktop icon="sliders" theme={TOOL_THEMES.dashboard} title="Mi Dashboard" sub="Tus horas, turnos y estadísticas" onClick={onGoPersonalDash} />
                {isAdmin && (
                  <HerramientaDesktop icon="crown" theme={TOOL_THEMES.admin} title="Panel de Administración" sub="Configura servicios y rotativas" onClick={onGoAdmin} />
                )}
                {isJefatura && (
                  <HerramientaDesktop icon="shield-check" theme={TOOL_THEMES.jefatura} title="Panel de Jefatura" sub="Gestiona turnos y personal" onClick={onGoJefatura} />
                )}
                {isSubrogante && (
                  <HerramientaDesktop icon="user-gear" theme={TOOL_THEMES.subrogante} title="Panel de Subrogante" sub="Gestiona tus subrogancias" onClick={onGoSubrogante} />
                )}
              </div>
              {onChangeService && (
                <div className="sgt-dg-pie-form">
                  <span className="sgt-dg-pie-form__nota">¿Trabajas en otro servicio?</span>
                  <BotonDesktop variante="secundario" icono="swap" onClick={onChangeService}>Cambiar servicio</BotonDesktop>
                </div>
              )}
            </PanelDesktop>
          </div>
        </PaginaDesktop>
      </>
    );
  }

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
        {/* El usuario de la sesión no trae `iniciales` (SGTAvatar las espera): sin esto el avatar salía vacío. */}
        <SGTAvatar person={{ ...me, iniciales: me.iniciales || inicialesDe(me.nombre) }} size={88} style={{ fontSize: 34, boxShadow: '0 8px 18px rgba(15,23,42,0.18)' }} />
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