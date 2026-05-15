// src/components/AgendaMockup/UIPrimitives.jsx
import React from 'react';
import { SGT_DATA } from './data';

const P = () => SGT_DATA.PALETTE;

export const SGTIcon = ({ name, size = 18, color = 'currentColor', strokeWidth = 2 }) => {
  const common = {
    width: size, height: size, viewBox: '0 0 24 24', fill: 'none',
    stroke: color, strokeWidth, strokeLinecap: 'round', strokeLinejoin: 'round',
  };
  switch (name) {
    case 'chevron-left':  return <svg {...common}><path d="M15 18l-6-6 6-6"/></svg>;
    case 'chevron-right': return <svg {...common}><path d="M9 18l6-6-6-6"/></svg>;
    case 'chevron-down':  return <svg {...common}><path d="M6 9l6 6 6-6"/></svg>;
    case 'chevron-up':    return <svg {...common}><path d="M18 15l-6-6-6 6"/></svg>;
    case 'close':         return <svg {...common}><path d="M18 6L6 18M6 6l12 12"/></svg>;
    case 'filter':        return <svg {...common}><path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z"/></svg>;
    case 'bell':          return <svg {...common}><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>;
    case 'user':          return <svg {...common}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
    case 'users':         return <svg {...common}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
    case 'clock':         return <svg {...common}><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>;
    case 'sun':           return <svg {...common}><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M5 5l1.5 1.5M17.5 17.5L19 19M2 12h2M20 12h2M5 19l1.5-1.5M17.5 6.5L19 5"/></svg>;
    case 'moon':          return <svg {...common}><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>;
    case 'swap':          return <svg {...common}><path d="M7 16V4M3 8l4-4 4 4M17 8v12M13 16l4 4 4-4"/></svg>;
    case 'plus':          return <svg {...common}><path d="M12 5v14M5 12h14"/></svg>;
    case 'hand-raised':   return <svg {...common}><path d="M18 11V6a2 2 0 0 0-4 0v5M14 10V4a2 2 0 0 0-4 0v6M10 10V6a2 2 0 0 0-4 0v8M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4-1-5.5-2.5L2 15s1-2 3-1l2 1"/></svg>;
    case 'check':         return <svg {...common}><path d="M20 6L9 17l-5-5"/></svg>;
    case 'check-circle':  return <svg {...common}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="M22 4L12 14.01l-3-3"/></svg>;
    case 'alert':         return <svg {...common}><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>;
    case 'history':       return <svg {...common}><path d="M3 3v5h5"/><path d="M3.05 13A9 9 0 1 0 6 5.3L3 8"/><path d="M12 7v5l4 2"/></svg>;
    case 'calendar':      return <svg {...common}><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>;
    case 'briefcase':     return <svg {...common}><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>;
    case 'search':        return <svg {...common}><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>;
    case 'arrow-right':   return <svg {...common}><path d="M5 12h14M12 5l7 7-7 7"/></svg>;
    case 'dot':           return <svg {...common} fill={color} stroke="none"><circle cx="12" cy="12" r="4"/></svg>;
    case 'sliders':       return <svg {...common}><path d="M4 21V14M4 10V3M12 21V12M12 8V3M20 21V16M20 12V3M1 14h6M9 8h6M17 16h6"/></svg>;
    case 'more':          return <svg {...common}><circle cx="12" cy="12" r="1" fill={color}/><circle cx="19" cy="12" r="1" fill={color}/><circle cx="5" cy="12" r="1" fill={color}/></svg>;
    case 'crown':         return <svg {...common}><path d="M3 18h18M3 8l4 4 5-7 5 7 4-4-2 10H5L3 8z"/></svg>;
    case 'stethoscope':   return <svg {...common}><path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3"/><path d="M8 15v1a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6v-4"/><circle cx="20" cy="10" r="2"/></svg>;
    default: return null;
  }
};

export const SGTBadge = ({ children, tone = 'neutral', size = 'sm' }) => {
  const tones = {
    neutral: { bg: P().line2, ink: P().ink2 },
    primary: { bg: P().primarySoft, ink: P().primary },
    accent:  { bg: P().accentSoft, ink: '#B85A60' },
    warn:    { bg: P().warnSoft, ink: P().warn },
    success: { bg: P().successSoft, ink: P().success },
    libre:   { bg: '#F3EFE7', ink: '#8B6F3E' },
  };
  const t = tones[tone] || tones.neutral;
  const sz = size === 'xs' ? { fs: 10, pad: '2px 6px' } : { fs: 11, pad: '3px 8px' };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      background: t.bg, color: t.ink,
      padding: sz.pad, borderRadius: 999,
      fontSize: sz.fs, fontWeight: 700,
      letterSpacing: 0.2, textTransform: 'uppercase',
      whiteSpace: 'nowrap',
    }}>{children}</span>
  );
};

export const SGTAvatar = ({ person, size = 28, style = {}, ring = null }) => {
  const isMe = person.esYo;
  const role = person.rol;
  const bg = role === 'JEFATURA' ? '#E9D9C2' : role === 'URGENCIOLOGO' ? '#D5E3EE' : '#E8E2EE';
  const ink = role === 'JEFATURA' ? '#6E4E1F' : role === 'URGENCIOLOGO' ? '#2B4E6B' : '#4E3A6F';
  return (
    <div style={{
      width: size, height: size, borderRadius: 999,
      background: isMe ? P().primary : bg,
      color: isMe ? '#fff' : ink,
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      fontWeight: 700, fontSize: size * 0.38,
      letterSpacing: 0.3, flexShrink: 0,
      boxShadow: ring ? `0 0 0 2px ${ring}` : 'none',
      ...style,
    }}>{person.iniciales}</div>
  );
};

export const PhoneShell = ({ children }) => (
  <div style={{
    width: 390, height: 800, background: P().surface2, borderRadius: 36, border: `1px solid ${P().line}`,
    boxShadow: '0 30px 80px rgba(15, 23, 42, 0.18), 0 8px 24px rgba(15,23,42,0.08)',
    overflow: 'hidden', fontFamily: "'Raleway', system-ui, sans-serif", color: P().ink,
    display: 'flex', flexDirection: 'column', position: 'relative',
  }}>{children}</div>
);

export const Sheet = ({ open, onClose, children, title, maxHeight = '85%' }) => {
  if (!open) return null;
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 100, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(15, 23, 42, 0.35)', backdropFilter: 'blur(2px)', animation: 'sgtFade .2s ease' }} />
      <div style={{ position: 'relative', background: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight, display: 'flex', flexDirection: 'column', boxShadow: '0 -12px 40px rgba(15,23,42,0.16)', animation: 'sgtSlideUp .28s cubic-bezier(.2,.9,.2,1)' }}>
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 10 }}><div style={{ width: 40, height: 4, background: P().line, borderRadius: 99 }} /></div>
        {title && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 18px 8px' }}>
            <div style={{ fontSize: 17, fontWeight: 800, color: P().ink }}>{title}</div>
            <button onClick={onClose} style={{ background: P().line2, border: 'none', borderRadius: 999, width: 30, height: 30, display: 'grid', placeItems: 'center', cursor: 'pointer' }}>
              <SGTIcon name="close" size={16} color={P().ink2}/>
            </button>
          </div>
        )}
        <div style={{ overflow: 'auto', flex: 1 }}>{children}</div>
      </div>
    </div>
  );
};

export const TopHeader = ({ title, subtitle, rightSlot, dense }) => (
  <div style={{ padding: dense ? '14px 16px 10px' : '16px 18px 12px', background: '#fff', borderBottom: `1px solid ${P().line2}`, display: 'flex', alignItems: 'center', gap: 12 }}>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 19, fontWeight: 800, color: P().ink, lineHeight: 1.15, letterSpacing: -0.2 }}>{title}</div>
      {subtitle && <div style={{ fontSize: 12, color: P().ink3, marginTop: 2, fontWeight: 600 }}>{subtitle}</div>}
    </div>
    {rightSlot}
  </div>
);

export const IconBtn = ({ icon, onClick, badge }) => (
  <button onClick={onClick} style={{ position: 'relative', background: '#fff', color: P().ink2, border: `1px solid ${P().line}`, width: 36, height: 36, borderRadius: 10, display: 'grid', placeItems: 'center', cursor: 'pointer', flexShrink: 0 }}>
    <SGTIcon name={icon} size={17}/>
    {badge != null && badge > 0 && (
      <span style={{ position: 'absolute', top: -4, right: -4, minWidth: 16, height: 16, padding: '0 4px', background: P().accent, color: '#fff', borderRadius: 99, fontSize: 10, fontWeight: 800, display: 'grid', placeItems: 'center', border: '2px solid #fff' }}>{badge}</span>
    )}
  </button>
);

export const AlertBanner = ({ pendientes, collapsed, onToggle }) => {
  if (!pendientes || pendientes.length === 0) return null;
  const critical = pendientes.filter(p => p.urgencia === 'alta' || p.urgencia === 'media').length;
  return (
    <div style={{ margin: '10px 14px 0', background: critical > 0 ? P().accentSoft : P().primarySoft, border: `1px solid ${critical > 0 ? '#F3D2D5' : '#CFDCEA'}`, borderRadius: 14, overflow: 'hidden' }}>
      <button onClick={onToggle} style={{ width: '100%', background: 'transparent', border: 'none', padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', textAlign: 'left' }}>
        <div style={{ width: 28, height: 28, borderRadius: 999, background: critical > 0 ? P().accent : P().primary, color: '#fff', display: 'grid', placeItems: 'center', flexShrink: 0 }}><SGTIcon name="bell" size={14} color="#fff"/></div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: critical > 0 ? '#8C3F44' : P().primary }}>{pendientes.length} novedades en tu agenda</div>
          {collapsed && <div style={{ fontSize: 11, color: P().ink3, marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{pendientes.map(p => p.titulo).join(' · ')}</div>}
        </div>
        <SGTIcon name={collapsed ? 'chevron-down' : 'chevron-up'} size={16} color={critical > 0 ? '#8C3F44' : P().primary}/>
      </button>
    </div>
  );
};

export const TabBar = ({ active, onChange }) => {
  const tabs = [
    { id: 'calendar', label: 'Calendario', icon: 'calendar' },
    { id: 'requests', label: 'Solicitudes', icon: 'swap' },
    { id: 'hours',    label: 'Mis horas', icon: 'clock' },
    { id: 'me',       label: 'Perfil',    icon: 'user' },
  ];
  return (
    <div style={{ display: 'flex', borderTop: `1px solid ${P().line}`, background: 'rgba(255,255,255,0.96)', backdropFilter: 'blur(8px)', padding: '6px 6px 10px' }}>
      {tabs.map(t => (
        <button key={t.id} onClick={() => onChange && onChange(t.id)} style={{ flex: 1, background: 'transparent', border: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, padding: '6px 2px', cursor: 'pointer', color: active === t.id ? P().primary : P().ink3 }}>
          <SGTIcon name={t.icon} size={20} color={active === t.id ? P().primary : P().ink3} strokeWidth={active === t.id ? 2.4 : 2}/>
          <span style={{ fontSize: 10, fontWeight: active === t.id ? 800 : 600 }}>{t.label}</span>
        </button>
      ))}
    </div>
  );
};