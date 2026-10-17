import React from 'react';
import { SGT_DATA } from '../Admin2/data';
import { SGTIcon, TopHeader, DashboardCard } from '../Style/UIPrimitives';
import { useLayout } from '../../layout/layout';
import { EncabezadoDesktop, PaginaDesktop, BotonDesktop } from '../Desktop/ui';
import { GrillaModulosDesktop } from '../Desktop/gestion/ModulosDesktop';

const JefaturaDashboard = ({ onBack,onGoAsignacionJefatura, onGoFuncionariosServicioJefatura ,onGoFuncionariosJefatura, onGoSolitudes, onGoPuestos, onGoStats, onGoBitacora, onGoAuditoria, onGoTiposTurno, onGoPlantillas, onGoPlanificacion,onGoAsignacionTurnos}) => {
  const PA = SGT_DATA.PALETTE;
  const { esDesktop } = useLayout();

  // Desktop (R18): los mismos módulos, con las mismas condiciones y acciones,
  // en una grilla. Se llega desde Mi Perfil, así que conserva su "volver".
  if (esDesktop) {
    const modulos = [
      onGoSolitudes && { icono: 'users', titulo: 'Asignación de turnos', descripcion: 'Asigna o quita funcionarios de turnos', onClick: onGoAsignacionTurnos },
      onGoAsignacionJefatura && { icono: 'users', titulo: 'Asignación de Funcionarios', descripcion: 'Asigna funcionarios a servicios y rotativas.', onClick: onGoAsignacionJefatura },
      onGoFuncionariosServicioJefatura && { icono: 'briefcase', titulo: 'Personal del Servicio', descripcion: 'Visualiza y gestiona el personal asociado a tu servicio.', onClick: onGoFuncionariosServicioJefatura },
      onGoFuncionariosJefatura && { icono: 'org-chart', titulo: 'Jerarquía de Funcionarios', descripcion: 'Designa nuevos subrogantes al sistema.', onClick: onGoFuncionariosJefatura },
      onGoTiposTurno && { icono: 'calendar', titulo: 'Crear tipo de Turno', descripcion: 'Diseña un nuevo tipo de turno.', onClick: onGoTiposTurno },
      onGoPlantillas && { icono: 'rotate', titulo: 'Crear Rotativa', descripcion: 'Diseña una nueva rotativa.', onClick: onGoPlantillas },
      onGoPlanificacion && { icono: 'calendar', titulo: 'Crear Planificación Mensual', descripcion: 'Diseña una nueva planificación mensual.', onClick: onGoPlanificacion },
      onGoSolitudes && { icono: 'alert', titulo: 'Evaluar Solicitudes', descripcion: 'Acepta o rechaza solicitudes de cambio de turno, vacaciones o permisos.', onClick: onGoSolitudes },
      onGoPuestos && { icono: 'home', titulo: 'Gestionar Puestos', descripcion: 'Crea, edita y elimina puestos del sistema.', onClick: onGoPuestos },
      onGoStats && { icono: 'sliders', titulo: 'Estadísticas del Servicio', descripcion: 'Cobertura, turnos vacantes y horas cubiertas.', onClick: onGoStats },
      onGoBitacora && { icono: 'history', titulo: 'Bitácora de Cambios', descripcion: 'Registro cronológico de todos los eventos del sistema.', onClick: onGoBitacora },
      onGoAuditoria && { icono: 'shield-search', titulo: 'Auditoría de Asistencia', descripcion: 'Revisa qué turnos pasados tuvieron cobertura o quedaron vacantes.', onClick: onGoAuditoria },
    ].filter(Boolean);
    const servicio = localStorage.getItem('sgt_servicio_activo_nombre');
    return (
      <>
        <EncabezadoDesktop
          titulo="Centro de Gestión del Servicio"
          subtitulo={servicio ? `${servicio} · Selecciona un módulo de tu servicio.` : 'Selecciona un módulo de tu servicio.'}
          izquierda={<BotonDesktop variante="secundario" icono="chevron-left" aria-label="Volver a Mi Perfil" title="Volver a Mi Perfil" onClick={onBack} />}
        />
        <PaginaDesktop ancho="amplio">
          <GrillaModulosDesktop modulos={modulos} ariaLabel="Módulos de gestión del servicio" />
        </PaginaDesktop>
      </>
    );
  }

  return (
    <div className="dash-page-bg" style={{ flex: 1, display: 'flex', flexDirection: 'column', animation: 'sgtSlideLeft .3s ease', overflow: 'hidden' }}>
      <TopHeader
        title="Centro de Gestión del Servicio"
        subtitle="Selecciona un módulo de tu servicio."
        leftSlot={
          <button onClick={onBack} style={{ background: 'transparent', border: 'none', padding: 4, cursor: 'pointer', display: 'flex' }}>
            <SGTIcon name="chevron-left" size={24} color={PA.ink} />
          </button>
        }
      />

      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12, overflow: 'auto', flex: 1 }}>

        {/* Cada tarjeta se muestra solo si su acción está habilitada (handler provisto).
            Las acciones globales (servicios, tipos de turno, rotativas, planificación) son
            exclusivas de ADMINISTRADOR y no se cablean aquí, por lo que quedan ocultas. */}
        {onGoSolitudes && (
          <DashboardCard
            icon="users"
            title="Asignación de turnos"
            desc="Asigna o quita funcionarios de turnos"
            onClick={onGoAsignacionTurnos}
            delay={0}
          />
        )}
        {onGoAsignacionJefatura && (
          <DashboardCard
            icon="users"
            title="Asignación de Funcionarios"
            desc="Asigna funcionarios a servicios y rotativas."
            onClick={onGoAsignacionJefatura}
            delay={0.03}
          />
        )}
        {onGoFuncionariosServicioJefatura && (
          <DashboardCard
            icon="briefcase"
            title="Personal del Servicio"
            desc="Visualiza y gestiona el personal asociado a tu servicio."
            onClick={onGoFuncionariosServicioJefatura}
            delay={0.06}
          />
        )}
        {onGoFuncionariosJefatura && (
          <DashboardCard
            icon="org-chart"
            title="Jerarquía de Funcionarios"
            desc="Designa nuevos subrogantes al sistema."
            onClick={onGoFuncionariosJefatura}
            delay={0.09}
          />
        )}
        {onGoTiposTurno && (
          <DashboardCard
            icon="calendar"
            title="Crear tipo de Turno"
            desc="Diseña un nuevo tipo de turno."
            onClick={onGoTiposTurno}
            delay={0.12}
          />
        )}
        {onGoPlantillas && (
          <DashboardCard
            icon="rotate"
            title="Crear Rotativa"
            desc="Diseña una nueva rotativa."
            onClick={onGoPlantillas}
            delay={0.15}
          />
        )}
        {onGoPlanificacion && (
          <DashboardCard
            icon="calendar"
            title="Crear Planificación Mensual"
            desc="Diseña una nueva planificación mensual."
            onClick={onGoPlanificacion}
            delay={0.18}
          />
        )}
        {onGoSolitudes && (
          <DashboardCard
            icon="alert"
            title="Evaluar Solicitudes"
            desc="Acepta o rechaza solicitudes de cambio de turno, vacaciones o permisos."
            onClick={onGoSolitudes}
            delay={0.21}
          />
        )}
        {onGoPuestos && (
          <DashboardCard
            icon="home"
            title="Gestionar Puestos"
            desc="Crea, edita y elimina puestos del sistema."
            onClick={onGoPuestos}
            delay={0.24}
          />
        )}
        {onGoStats && (
          <DashboardCard
            icon="sliders"
            title="Estadísticas del Servicio"
            desc="Cobertura, turnos vacantes y horas cubiertas."
            onClick={onGoStats}
            delay={0.27}
          />
        )}
        {onGoBitacora && (
          <DashboardCard
            icon="history"
            title="Bitácora de Cambios"
            desc="Registro cronológico de todos los eventos del sistema."
            onClick={onGoBitacora}
            delay={0.3}
          />
        )}
        {onGoAuditoria && (
          <DashboardCard
            icon="shield-search"
            title="Auditoría de Asistencia"
            desc="Revisa qué turnos pasados tuvieron cobertura o quedaron vacantes."
            onClick={onGoAuditoria}
            delay={0.33}
          />
        )}
      </div>
    </div>
  );
};

export default JefaturaDashboard;
