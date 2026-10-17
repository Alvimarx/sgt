// Marco del modo desktop (R18): menú lateral persistente + área principal.
//
// Reemplaza al PhoneShell y a la TabBar en pantallas anchas. El menú nació
// incrustado en el Centro de operaciones (R16, "Propuesta C"); aquí se
// extrajo para que lo compartan todas las vistas, con secciones según el rol
// (navegacion.js).
import React, { useEffect, useMemo, useRef } from 'react';
import './desktop.css';
import { SGTIcon } from '../Style/UIPrimitives';
import { useNotifications } from '../../context/NotificationContext';
import { itemsParaUsuario } from './navegacion';

const iniciales = (nombre) => {
  const partes = String(nombre || '').trim().split(/\s+/);
  return ((partes[0]?.[0] || '') + (partes[1]?.[0] || '')).toUpperCase() || '·';
};

const DesktopShell = ({ user, activo, onNavigate, onLogout, onSwitchService, conteoSolicitudes = 0, children }) => {
  const { unreadCount } = useNotifications();
  const servicioNombre = localStorage.getItem('sgt_servicio_activo_nombre') || 'Servicio';

  // La página completa no scrollea en desktop: cada zona tiene su scroll.
  useEffect(() => {
    document.documentElement.classList.add('sgt-modo-desktop');
    return () => document.documentElement.classList.remove('sgt-modo-desktop');
  }, []);

  const grupos = useMemo(() => {
    const orden = [];
    const porGrupo = new Map();
    itemsParaUsuario(user).forEach((it) => {
      if (!porGrupo.has(it.grupo)) { porGrupo.set(it.grupo, []); orden.push(it.grupo); }
      porGrupo.get(it.grupo).push(it);
    });
    return orden.map((g) => ({ nombre: g, items: porGrupo.get(g) }));
  }, [user]);

  const badges = { solicitudes: conteoSolicitudes, notificaciones: unreadCount };

  // Con muchos ítems (administrador) el menú scrollea y el ítem activo puede
  // quedar fuera de la vista a 768 px de alto: se acerca lo justo para que se
  // vea, con aire para el título de su grupo. Si ya se ve, no se mueve nada.
  const navRef = useRef(null);
  useEffect(() => {
    const nav = navRef.current;
    const item = nav?.querySelector('[aria-current="page"]');
    if (!nav || !item) return;
    const n = nav.getBoundingClientRect();
    const i = item.getBoundingClientRect();
    if (i.top < n.top + 28) nav.scrollTop -= n.top + 28 - i.top;
    else if (i.bottom > n.bottom - 8) nav.scrollTop += i.bottom - (n.bottom - 8);
  }, [activo, grupos]);

  return (
    <div className="sgt-desktop">
      <aside className="sgt-desktop__sidebar" aria-label="Navegación principal">
        <div className="sgt-desktop__marca">
          <div className="sgt-desktop__logo" aria-hidden="true">S</div>
          <div style={{ minWidth: 0 }}>
            <div className="sgt-desktop__marca-nombre">SGT · HUAP</div>
            <div className="sgt-desktop__marca-servicio">{servicioNombre}</div>
          </div>
        </div>

        <nav className="sgt-desktop__nav" ref={navRef}>
          {grupos.map((g) => (
            <React.Fragment key={g.nombre}>
              <div className="sgt-desktop__grupo">{g.nombre}</div>
              {g.items.map((it) => {
                const badge = it.badge ? badges[it.badge] : null;
                return (
                  <button
                    key={it.id}
                    type="button"
                    className="sgt-desktop__item"
                    aria-current={activo === it.id ? 'page' : undefined}
                    onClick={() => onNavigate?.(it.id)}
                    title={it.etiqueta}
                  >
                    <SGTIcon name={it.icono} size={15} />
                    <span className="sgt-desktop__item-texto">{it.etiqueta}</span>
                    {badge > 0 && <span className="sgt-desktop__badge">{badge}</span>}
                  </button>
                );
              })}
            </React.Fragment>
          ))}
        </nav>

        <div className="sgt-desktop__usuario">
          <div className="sgt-desktop__usuario-fila">
            <div className="sgt-desktop__avatar" aria-hidden="true">{iniciales(user?.nombre)}</div>
            <div style={{ minWidth: 0 }}>
              <div className="sgt-desktop__usuario-nombre" title={user?.nombre}>{user?.nombre || 'Usuario'}</div>
              {user?.rutCompleto && <div className="sgt-desktop__usuario-rut">{user.rutCompleto}</div>}
            </div>
          </div>
          <div className="sgt-desktop__usuario-acciones">
            <span className="sgt-desktop__rol">{(user?.rol || '').toLowerCase()}</span>
            <button type="button" className="sgt-desktop__link" onClick={() => onSwitchService?.()}>Cambiar servicio</button>
          </div>
          <button type="button" className="sgt-desktop__salir" onClick={() => onLogout?.()}>Cerrar sesión</button>
        </div>
      </aside>

      <main className="sgt-desktop__main">
        <div className="sgt-desktop__vista">{children}</div>
      </main>
    </div>
  );
};

export default DesktopShell;
