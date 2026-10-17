import React from 'react';
import { SGT_DATA, DASHBOARD_ICON_THEMES, DASHBOARD_CARD_THEME_BY_TITLE } from '../Admin2/data';
import { SGTIcon } from '../Style/UIPrimitives';
import { useLayout } from '../../layout/layout';
import { EncabezadoDesktop, PaginaDesktop, BotonDesktop } from '../Desktop/ui';
import { GrillaModulosDesktop } from '../Desktop/gestion/ModulosDesktop';

const SubroganteCard = ({ icon, title, desc, onClick }) => {
  const PA = SGT_DATA.PALETTE;
  const theme = DASHBOARD_ICON_THEMES[DASHBOARD_CARD_THEME_BY_TITLE[title]] || DASHBOARD_ICON_THEMES.blue;

  return (
    <button onClick={onClick} style={{
      display: 'flex', alignItems: 'flex-start', gap: 14, background: '#fff', border: 'none',
      borderRadius: 16, padding: 16, cursor: 'pointer', textAlign: 'left', boxShadow: '0 4px 16px rgba(15,23,42,0.08)',
    }}>
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

// C-01 (17 oct 2026): tipos de turno, rotativas y planificación son solo del
// administrador; C-03: el subrogante tampoco designa jerarquía ni suma personal.
// Este panel no ofrece ninguno de esos módulos.
const SubroganteDashboard = ({ onBack, onGoSolitudes, onGoPuestos, onGoStats, onGoBitacora, onGoAuditoria, onGoAsignacionTurnos}) => {
  const PA = SGT_DATA.PALETTE;
  const { esDesktop } = useLayout();

  // Desktop (R18): los mismos módulos, con las mismas condiciones y acciones,
  // en una grilla. Se llega desde Mi Perfil, así que conserva su "volver".
  if (esDesktop) {
    const modulos = [
      onGoSolitudes && { icono: 'users', titulo: 'Asignación de turnos', descripcion: 'Asigna o quita funcionarios de turnos', onClick: onGoAsignacionTurnos },
      onGoSolitudes && { icono: 'alert', titulo: 'Evaluar Solicitudes', descripcion: 'Acepta o rechaza solicitudes de cambio de turno, vacaciones o permisos.', onClick: onGoSolitudes },
      onGoPuestos && { icono: 'home', titulo: 'Gestionar Puestos', descripcion: 'Crea, edita y elimina puestos del sistema.', onClick: onGoPuestos },
      onGoStats && { icono: 'sliders', titulo: 'Estadísticas del Servicio', descripcion: 'Cobertura, turnos vacantes y horas cubiertas.', onClick: onGoStats },
      onGoBitacora && { icono: 'history', titulo: 'Bitácora de Cambios', descripcion: 'Registro cronológico de todos los eventos del sistema.', onClick: onGoBitacora },
      onGoAuditoria && { icono: 'check-circle', titulo: 'Auditoría de Asistencia', descripcion: 'Revisa qué turnos pasados tuvieron cobertura o quedaron vacantes.', onClick: onGoAuditoria },
    ].filter(Boolean);
    const servicio = localStorage.getItem('sgt_servicio_activo_nombre');
    return (
      <>
        <EncabezadoDesktop
          titulo="Administración"
          subtitulo={servicio ? `${servicio} · Selecciona un módulo de tu servicio.` : 'Selecciona un módulo de tu servicio.'}
          izquierda={<BotonDesktop variante="secundario" icono="chevron-left" aria-label="Volver a Mi Perfil" title="Volver a Mi Perfil" onClick={onBack} />}
        />
        <PaginaDesktop ancho="amplio">
          <GrillaModulosDesktop modulos={modulos} ariaLabel="Módulos de administración del servicio" />
        </PaginaDesktop>
      </>
    );
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: PA.surface2, animation: 'sgtSlideLeft .3s ease', overflow: 'hidden' }}>
      <div style={{ padding: '16px', background: '#fff', borderBottom: `1px solid ${PA.line2}`, display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={onBack} style={{ background: 'transparent', border: 'none', padding: 4, cursor: 'pointer', display: 'flex' }}>
          <SGTIcon name="chevron-left" size={24} color={PA.ink} />
        </button>
        <div style={{ fontSize: 19, fontWeight: 800, color: PA.ink }}>Administración</div>
      </div>

      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12, overflow: 'auto', flex: 1 }}>
        <p style={{ margin: '0 0 10px', fontSize: 14, color: PA.ink3, fontWeight: 600 }}>Selecciona un módulo de tu servicio.</p>

        {/* Solo se muestran las acciones habilitadas (handler provisto). */}
        {onGoSolitudes && (
          <SubroganteCard
            icon="users"
            title="Asignación de turnos"
            desc="Asigna o quita funcionarios de turnos"
            tone="accent"
            onClick={onGoAsignacionTurnos}
          />
        )}
        {onGoSolitudes && (
          <SubroganteCard
            icon="alert"
            title="Evaluar Solicitudes"
            desc="Acepta o rechaza solicitudes de cambio de turno, vacaciones o permisos."
            tone="accent"
            onClick={onGoSolitudes}
          />
        )}
        {onGoPuestos && (
          <SubroganteCard
            icon="home"
            title="Gestionar Puestos"
            desc="Crea, edita y elimina puestos del sistema."
            tone="primary"
            onClick={onGoPuestos}
          />
        )}
        {onGoStats && (
          <SubroganteCard
            icon="sliders"
            title="Estadísticas del Servicio"
            desc="Cobertura, turnos vacantes y horas cubiertas."
            tone="primary"
            onClick={onGoStats}
          />
        )}
        {onGoBitacora && (
          <SubroganteCard
            icon="history"
            title="Bitácora de Cambios"
            desc="Registro cronológico de todos los eventos del sistema."
            tone="accent"
            onClick={onGoBitacora}
          />
        )}
        {onGoAuditoria && (
          <SubroganteCard
            icon="check-circle"
            title="Auditoría de Asistencia"
            desc="Revisa qué turnos pasados tuvieron cobertura o quedaron vacantes."
            tone="accent"
            onClick={onGoAuditoria}
          />
        )}
      </div>

      
    </div>
  );
};

export default SubroganteDashboard;