// Prop4.jsx
import React, { useEffect, useState } from "react";

//Importaciones Style
import "../Style/style.css";
import { PhoneShell, TabBar } from "../Style/UIPrimitives";
import AvisoSinPermiso from "../Style/AvisoSinPermiso";

import { useAuth } from "../../context/AuthContext";
import { selectService } from "../../services/authService";
import { useLayout } from "../../layout/layout";
import { esAdministrador } from "../../utils/roles";
import { useSolicitudesPendientes } from "../../hooks/useSolicitudesPendientes";

//Importaciones de Comun
import AgendaView from "../Comun/AgendaView";
import CalendarView from "../Comun/calendarView";
import NotificationView from "../Comun/NotificationView";
import SelectServiceView from "../Comun/SelectServiceView";
import ProfileView from "../Comun/Perfil";
import PersonalDashboard from "../Comun/PersonalDashboard";
import CentroOperacionesDesktop from "../Desktop/CentroOperacionesDesktop";
import DesktopShell from "../Desktop/DesktopShell";
import { itemActivo, panelDeGestion } from "../Desktop/navegacion";

//Importaciones de ComunAdministracion
import PuestosView from "../ComunAdministracion/PuestosView";
import AdminStats from "../ComunAdministracion/AdminStats";

//Importaciones Administrador
import FuncionariosSistemaView from "./FuncionariosSistemaView";

//Importaciones Jefatura
import JefaturaDashboard from "../Jefatura/JefaturaDashboardView";
import JerarquiaJefaturaView from "../Jefatura/JerarquiaJefaturaView";
import JerarquiaAsignacionView from "../Jefatura/AsignacionJefaturaView";
import FuncinariosServicioJefaturaView from "../Jefatura/FuncionariosServicioJetaturaView";

//Importaciones Subrogante
import SubroganteDashboard from "../Subrogante/SubroganteDashboardView";


import AdminDashboard from "./AdminDashboard";
import ReglasServicioView from "./ReglasServicioView";


import AsignacionView from "./AsignacionView";
import AuditoriaView from "./AuditoriaView";
import BitacoraView from "./BitacoraView";

import JerarquiaView from "./JerarquiaView";
import LoginView from "../Login/LoginView";
import PendingRegistrationView from "../Login/PendingRegistrationView";


import PlantillasView from "./PlantillasView";


import ServiciosView from "./ServiciosView";
import SolicitudesView from "./SolicitudesView";
import TiposTurnoView from "./TiposTurnoView";
import PlanificacionView from "./Planificacion";

// ---------------------------------------------------------------------------
// Persistencia de navegación (sgt_nav_state, sessionStorage — por pestaña).
// El JWT y user_data ya sobreviven al refresh en localStorage (AuthContext los
// rehidrata ANTES del primer render, bloqueando con "Cargando..."), pero la
// vista vivía solo en useState y todo refresh caía al login. Aquí se restaura.
// Las vistas del flujo de autenticación no se restauran: dependen de estado en
// memoria (preAuthToken dura ~5 min y no se persiste, por diseño).
// ---------------------------------------------------------------------------
const NAV_STORAGE_KEY = "sgt_nav_state";

// Vistas por nivel de acceso. La restauración usa WHITELIST: una vista que no
// esté en ninguna lista (renombrada en un deploy, o sessionStorage manipulado)
// NO se restaura — cae a "agenda" en vez de dejar la pantalla en blanco.
const VISTAS_COMUNES = [
  "agenda", "calendar_view", "perfil", "personal_dashboard",
  "notifications", "solicitudes", "bitacora",
];
// C-10 (17 oct 2026): las reglas de horario son del administrador, como los
// tipos de turno (C-01); el backend exige ADMINISTRADOR para escribirlas.
const VISTAS_SOLO_ADMIN = [
  "admin", "funcionarios_sistema", "planificacion", "servicios",
  "asignacion", "jerarquia", "tipos_turno", "plantillas", "reglas",
];
const VISTAS_SOLO_JEFATURA = [
  "jefatura", "funcionarios_servicio_jefatura", "asignacionJefatura", "jerarquiaJefatura",
];
const VISTAS_SOLO_SUBROGANTE = ["subrogante"];
const VISTAS_GESTION = ["admin_stats", "puestos", "auditoria"];

// ¿Puede este usuario (ya rehidratado) ver esta vista? Mismos gates que usa
// Perfil.jsx para mostrar los paneles. Importante en multi-pestaña: si en otra
// pestaña se cambió a un servicio donde el rol es MEDICO, aquí no se restaura
// un panel de jefatura con el token nuevo.
function vistaPermitida(view, user) {
  const esAdmin = esAdministrador(user);
  const esJefatura = user?.rol === "JEFATURA";
  const esSubrogante = user?.rol === "SUBROGANTE";
  if (VISTAS_COMUNES.includes(view)) return true;
  if (VISTAS_SOLO_ADMIN.includes(view)) return esAdmin;
  if (VISTAS_SOLO_JEFATURA.includes(view)) return esJefatura;
  if (VISTAS_SOLO_SUBROGANTE.includes(view)) return esSubrogante;
  if (VISTAS_GESTION.includes(view)) return esAdmin || esJefatura || esSubrogante;
  return false;
}

const RETURNS_DEFAULT = {
  solicitudes: "agenda",
  calendar: "agenda",
  stats: "admin",
  puestos: "admin",
  bitacora: "admin",
  auditoria: "admin",
  reglas: "admin",
};

function leerNavGuardada(user) {
  const isLogged = !!user;
  // Los returns por defecto también pasan por la whitelist: para un médico,
  // "admin" como destino de retorno no es válido y cae a "agenda".
  const returnsBase = {};
  for (const [k, v] of Object.entries(RETURNS_DEFAULT)) {
    returnsBase[k] = vistaPermitida(v, user) ? v : "agenda";
  }
  const base = { view: isLogged ? "agenda" : "login", tab: "home", returns: returnsBase };
  if (!isLogged) return base;
  try {
    const saved = JSON.parse(sessionStorage.getItem(NAV_STORAGE_KEY) || "null");
    if (saved?.view && vistaPermitida(saved.view, user)) {
      const returns = { ...returnsBase };
      for (const k of Object.keys(RETURNS_DEFAULT)) {
        const v = saved.returns?.[k];
        if (typeof v === "string" && vistaPermitida(v, user)) returns[k] = v;
      }
      return { view: saved.view, tab: saved.tab || "home", returns };
    }
  } catch {
    // JSON corrupto o storage bloqueado: se cae al home logueado.
  }
  return base;
}

const Prop4 = ({ tweaks = {} }) => {
  const auth = useAuth();
  // Navegación inicial: la última vista guardada si hay sesión, o login. Se
  // calcula una sola vez, al montar; auth.user ya está rehidratado en ese punto.
  const [navInicial] = useState(() => leerNavGuardada(auth?.user));

  const [currentView, setCurrentView] = useState(navInicial.view);
  const [activeTab, setActiveTab] = useState(navInicial.tab);

  const [preAuthToken, setPreAuthToken] = useState(null);
  const [entrandoDirecto, setEntrandoDirecto] = useState(false);
  const [serviciosDisponibles, setServiciosDisponibles] = useState([]);
  const [pendingRegistrationMessage, setPendingRegistrationMessage] = useState('');
  const [solicitudesReturn, setSolicitudesReturn] = useState(navInicial.returns.solicitudes);
  const [solicitudesCreatePreset, setSolicitudesCreatePreset] = useState(null);
  const [calendarReturn, setCalendarReturn] = useState(navInicial.returns.calendar);

  //Para Jefatura y subrogacia es lo mismo por lo cual es mejor compartir la vista
  const [statsReturn, setStatsReturn] = useState(navInicial.returns.stats);
  const[puestosReturn, setPuestosReturn] = useState(navInicial.returns.puestos);
  const [bitacoraReturn, setBitacoraReturn] = useState(navInicial.returns.bitacora);
  const [auditoriaReturn, setAuditoriaReturn] = useState(navInicial.returns.auditoria);
  const [reglasReturn, setReglasReturn] = useState(navInicial.returns.reglas);

  // Cada cambio de vista queda guardado para que refrescar no expulse al login.
  useEffect(() => {
    try {
      sessionStorage.setItem(NAV_STORAGE_KEY, JSON.stringify({
        view: currentView,
        tab: activeTab,
        returns: {
          solicitudes: solicitudesReturn,
          calendar: calendarReturn,
          stats: statsReturn,
          puestos: puestosReturn,
          bitacora: bitacoraReturn,
          auditoria: auditoriaReturn,
          reglas: reglasReturn,
        },
      }));
    } catch {
      // Storage lleno o bloqueado: la app sigue funcionando, solo sin restauración.
    }
  }, [currentView, activeTab, solicitudesReturn, calendarReturn, statsReturn,
      puestosReturn, bitacoraReturn, auditoriaReturn, reglasReturn]);

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    if (tabId === "home") setCurrentView("agenda");
    if (tabId === "calendar") {
      setCalendarReturn("agenda");
      setCurrentView("calendar_view");
    }
    if (tabId === "me") setCurrentView("perfil");
    if (tabId === "requests") {
      setSolicitudesReturn("agenda");
      setSolicitudesCreatePreset(null);
      setCurrentView("solicitudes");
    }
  };

  const handleOpenSolicitudes = (preset = null) => {
    setSolicitudesReturn("agenda");
    setSolicitudesCreatePreset(preset);
    setActiveTab("requests");
    setCurrentView("solicitudes");
  };

  const handleLoginSuccess = async ({ preAuthToken, servicios = [], registeredInSystem, message }) => {
    if (!registeredInSystem) {
      setPreAuthToken(null);
      setServiciosDisponibles([]);
      setPendingRegistrationMessage(message || 'Tu cuenta aún no ha sido registrada en el sistema.');
      setCurrentView('pending_registration');
      return;
    }

    setPendingRegistrationMessage('');

    // Con UN solo servicio no hay nada que elegir: se canjea el preAuthToken al vuelo
    // y se entra directo al home. Si el canje falla, se cae al flujo normal para que
    // el usuario vea el error y pueda reintentar.
    if (preAuthToken && servicios.length === 1) {
      const unico = servicios[0];
      setEntrandoDirecto(true);
      const result = await selectService(preAuthToken, unico.servicioId);
      setEntrandoDirecto(false);

      if (result.success) {
        setServiciosDisponibles(servicios);
        if (unico.nombre) {
          localStorage.setItem("sgt_servicio_activo_nombre", unico.nombre);
        }
        handleServiceSelected(result.userData);
        return;
      }
    }

    setPreAuthToken(preAuthToken);
    setServiciosDisponibles(servicios);
    setCurrentView("select_service");
  };

  const handleServiceSelected = (userData) => {
    if (serviciosDisponibles.length > 0 && userData.servicioId) {
      const servicioReal = serviciosDisponibles.find(
        (s) => Number(s.servicioId || s.idServicio) === Number(userData.servicioId)
      );
      if (servicioReal) {
        localStorage.setItem(
          "sgt_servicio_activo_nombre",
          servicioReal.nombre || servicioReal.nombreServicio
        );
      }
    }
    if (auth?.updateUser) auth.updateUser(userData);
    setPreAuthToken(null);
    setCurrentView("agenda");
    setActiveTab("home");
  };

  const handleBackToServiceSelection = () => {
    // Tras un refresh la lista en memoria está vacía, pero user_data (localStorage,
    // rehidratado por AuthContext) conserva perfil.servicios. Se normalizan las dos
    // formas: {servicioId, nombre, rol} (paso 1 del login) e {idServicio,
    // nombreServicio, rolServicioNombre} (perfil persistido) — SelectServiceView
    // espera servicioId/nombre/rol. Sin rolServicioNombre, después de refrescar la
    // lista salía sin el rol de cada servicio.
    const crudos = (serviciosDisponibles?.length > 0 ? serviciosDisponibles : auth?.user?.servicios) || [];
    const servicios = crudos
      .map((s) => ({
        servicioId: s.servicioId ?? s.idServicio,
        nombre: s.nombre ?? s.nombreServicio,
        rol: s.rol ?? s.rolServicioNombre ?? null,
      }))
      .filter((s) => s.servicioId != null);
    if (servicios.length > 0) {
      setServiciosDisponibles(servicios);
      setPreAuthToken(null);
      setCurrentView("select_service");
    }
  };

  const handleLogout = () => {
    auth?.logout?.();
    localStorage.removeItem("sgt_servicio_activo_nombre");
    sessionStorage.removeItem(NAV_STORAGE_KEY);
    setPreAuthToken(null);
    setServiciosDisponibles([]);
    setPendingRegistrationMessage('');
    setSolicitudesReturn("agenda");
    setActiveTab("home");
    setCurrentView("login");
  };

  const handleOpenNotifications = () => {
    setCurrentView("notifications");
  };

  // Modo desktop (R16/R18): el breakpoint vive en layout/layout.js. En pantallas
  // anchas las vistas logueadas se montan en el DesktopShell (menú lateral) y
  // el home "agenda" es el Centro de operaciones; bajo el umbral todo sigue
  // en el PhoneShell, exactamente como antes.
  const { esDesktop } = useLayout();
  const conteoSolicitudes = useSolicitudesPendientes(
    esDesktop && auth?.isLogged ? auth.user : null,
    currentView
  );

  // Destinos del menú lateral (navegacion.js) → vista de Prop4. Cada destino
  // fija el "volver" de la vista igual que lo haría el panel móvil del rol.
  const navegarDesktop = (dest) => {
    const panel = panelDeGestion(auth?.user);
    switch (dest) {
      case "inicio": setActiveTab("home"); setCurrentView("agenda"); return;
      case "calendario": setCalendarReturn("agenda"); setActiveTab("calendar"); setCurrentView("calendar_view"); return;
      case "solicitudes": setSolicitudesReturn("agenda"); setSolicitudesCreatePreset(null); setActiveTab("requests"); setCurrentView("solicitudes"); return;
      case "notificaciones": setCurrentView("notifications"); return;
      case "mi_dashboard": setCurrentView("personal_dashboard"); return;
      case "perfil": setActiveTab("me"); setCurrentView("perfil"); return;
      case "asignacion_turnos": setCalendarReturn(panel); setCurrentView("calendar_view"); return;
      case "personal_servicio": setCurrentView("funcionarios_servicio_jefatura"); return;
      case "asignacion_funcionarios": setCurrentView("asignacionJefatura"); return;
      case "jerarquia_servicio": setCurrentView("jerarquiaJefatura"); return;
      case "puestos": setPuestosReturn(panel); setCurrentView("puestos"); return;
      case "estadisticas": setStatsReturn(panel); setCurrentView("admin_stats"); return;
      case "bitacora": setBitacoraReturn(panel); setCurrentView("bitacora"); return;
      case "auditoria": setAuditoriaReturn(panel); setCurrentView("auditoria"); return;
      case "servicios": setCurrentView("servicios"); return;
      case "personal_sistema": setCurrentView("funcionarios_sistema"); return;
      case "asignacion_servicios": setCurrentView("asignacion"); return;
      case "jerarquia_sistema": setCurrentView("jerarquia"); return;
      case "tipos_turno": setCurrentView("tipos_turno"); return;
      case "rotativas": setCurrentView("plantillas"); return;
      case "planificacion": setCurrentView("planificacion"); return;
      case "reglas": setReglasReturn("admin"); setCurrentView("reglas"); return;
      default: return;
    }
  };

  const animaciones = (
    <style>{`
        @keyframes sgtFade { from { opacity:0 } to { opacity:1 } }
        @keyframes sgtSlideUp { from { transform:translateY(40px); opacity:0.6 } to { transform:translateY(0); opacity:1 } }
        @keyframes sgtSlideLeft { from { transform:translateX(100%); } to { transform:translateX(0); } }
      `}</style>
  );

  const vistas = (
    <>
      {currentView === "login" && !entrandoDirecto && (
        <LoginView onLoginSuccess={handleLoginSuccess} />
      )}
      {currentView === "login" && entrandoDirecto && (
        <div
          className="login-gradient-bg"
          role="status"
          style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 800, color: "#17416C" }}
        >
          Entrando…
        </div>
      )}
      {currentView === "select_service" && (
        <SelectServiceView
          preAuthToken={preAuthToken}
          servicios={serviciosDisponibles}
          onServiceSelected={handleServiceSelected}
          onLogout={handleLogout}
        />
      )}
      {currentView === "pending_registration" && (
        <PendingRegistrationView
          message={pendingRegistrationMessage}
          onBackToLogin={handleLogout}
        />
      )}
      {currentView === "agenda" && (
        <AgendaView
          tweaks={tweaks}
          user={auth?.user}
          onSwitchService={handleBackToServiceSelection}
          onLogout={handleLogout}
          onOpenNotifications={handleOpenNotifications}
          onOpenSolicitudes={handleOpenSolicitudes}
          onOpenBitacora={() => { setBitacoraReturn("agenda"); setCurrentView("bitacora"); }}
        />
      )}
      {currentView === "notifications" && (
        <NotificationView onBack={() => setCurrentView("agenda")} />
      )}
      {currentView === "calendar_view" && (
        <CalendarView
          modoAsignacionAdmin={
            calendarReturn === "admin" ||
            calendarReturn === "jefatura" ||
            calendarReturn === "subrogante"
          }
          onBack={() => {
            setCurrentView(calendarReturn);

            if (calendarReturn === "agenda") {
              setActiveTab("home");
            }

            if (calendarReturn === "admin") {
              setActiveTab("me");
            }
          }}
          onOpenSolicitudes={handleOpenSolicitudes}
          onOpenBitacora={() => {
            setBitacoraReturn("calendar_view");
            setCurrentView("bitacora");
          }}
        />
      )}
      {currentView === "perfil" && (
        <ProfileView
          onGoAdmin={() => setCurrentView("admin")}
          onGoJefatura={() => setCurrentView("jefatura")}
          onGoSubrogante={() => setCurrentView("subrogante")}
          onGoPersonalDash={() => setCurrentView("personal_dashboard")}
          onBack={() => { setCurrentView("agenda"); setActiveTab("home"); }}
          onChangeService={handleBackToServiceSelection}
        />
      )}
      {currentView === "personal_dashboard" && (
        <PersonalDashboard onBack={() => setCurrentView("perfil")} />
      )}
      {currentView === "admin" && (
        <AdminDashboard
          onBack={() => setCurrentView("perfil")}
          onGoServicios={() => setCurrentView("servicios")}
          onGoAsignacion={() => setCurrentView("asignacion")}
          onGoAsignacionTurnos={() => {setCalendarReturn("admin"); setCurrentView("calendar_view"); }}
          onGoFuncionarios={() => setCurrentView("jerarquia")}
          onGoFuncionariosSistema={() => setCurrentView("funcionarios_sistema")}
          onGoPuestos={() => { setPuestosReturn("admin"); setCurrentView("puestos"); }}
          onGoSolitudes={() => { setSolicitudesReturn("admin"); setCurrentView("solicitudes"); }}
          onGoStats={() => { setStatsReturn("admin"); setCurrentView("admin_stats"); }}
          onGoBitacora={() => { setBitacoraReturn("admin"); setCurrentView("bitacora"); }}
          onGoAuditoria={() => { setAuditoriaReturn("admin"); setCurrentView("auditoria"); }}
          onGoTiposTurno={() => setCurrentView("tipos_turno")}
          onGoPlantillas={() => setCurrentView("plantillas")}
          onGoPlanificacion={() => setCurrentView("planificacion")}
          onGoReglas={() => { setReglasReturn("admin"); setCurrentView("reglas"); }}
        />
      )}
      {currentView === "jefatura" && (
        <JefaturaDashboard
          onBack={() => setCurrentView("perfil")}
          onGoFuncionariosJefatura={() => setCurrentView("jerarquiaJefatura")}
          onGoPuestos={() => { setPuestosReturn("jefatura"); setCurrentView("puestos"); }}
          onGoStats={() => { setStatsReturn("jefatura"); setCurrentView("admin_stats"); }}
          onGoFuncionariosServicioJefatura={() => setCurrentView("funcionarios_servicio_jefatura")}
          onGoAsignacionJefatura={() => setCurrentView("asignacionJefatura")}
          onGoSolitudes={() => { setSolicitudesReturn("jefatura"); setCurrentView("solicitudes"); }}
          onGoBitacora={() => { setBitacoraReturn("jefatura"); setCurrentView("bitacora"); }}
          onGoAuditoria={() => { setAuditoriaReturn("jefatura"); setCurrentView("auditoria"); }}
          onGoAsignacionTurnos={() => {setCalendarReturn("jefatura"); setCurrentView("calendar_view");}}
          />
      )}

      {currentView === "funcionarios_servicio_jefatura" && <FuncinariosServicioJefaturaView onBack={() => setCurrentView("jefatura")} />}
      {currentView === "asignacionJefatura" && <JerarquiaAsignacionView onBack={() => setCurrentView("jefatura")} />}
      {currentView === "jerarquiaJefatura" && <JerarquiaJefaturaView onBack={() => setCurrentView("jefatura")} />}
      {currentView === "admin_stats" && <AdminStats onBack={() => setCurrentView(statsReturn)} />}
      {currentView === "puestos" && <PuestosView onBack={() => setCurrentView(puestosReturn)} />}

      {currentView === "subrogante" && (
        <SubroganteDashboard
          onBack={() => setCurrentView("perfil")}
          onGoStats={() => { setStatsReturn("subrogante"); setCurrentView("admin_stats"); }}
          onGoPuestos={() => { setPuestosReturn("subrogante"); setCurrentView("puestos"); }}
          onGoSolitudes={() => { setSolicitudesReturn("subrogante"); setCurrentView("solicitudes"); }}
          onGoBitacora={() => { setBitacoraReturn("subrogante"); setCurrentView("bitacora"); }}
          onGoAuditoria={() => { setAuditoriaReturn("subrogante"); setCurrentView("auditoria"); }}
          onGoAsignacionTurnos={() => {setCalendarReturn("subrogante"); setCurrentView("calendar_view"); }}
          />
      )}


      {currentView === "funcionarios_sistema" && <FuncionariosSistemaView onBack={() => setCurrentView("admin")} />}
      {currentView === "planificacion" && <PlanificacionView onBack={() => setCurrentView("admin")} />}
      {currentView === "servicios" && <ServiciosView onBack={() => setCurrentView("admin")} />}
      {currentView === "asignacion" && <AsignacionView onBack={() => setCurrentView("admin")} />}
      {currentView === "jerarquia" && <JerarquiaView onBack={() => setCurrentView("admin")} />}
      {currentView === "solicitudes" && (
        <SolicitudesView
          onBack={() => setCurrentView(solicitudesReturn)}
          initialCreatePreset={solicitudesCreatePreset}
          onInitialCreatePresetConsumed={() => setSolicitudesCreatePreset(null)}
        />
      )}
      
      {currentView === "bitacora" && <BitacoraView onBack={() => setCurrentView(bitacoraReturn)} />}
      {currentView === "auditoria" && <AuditoriaView onBack={() => setCurrentView(auditoriaReturn)} />}
      {currentView === "tipos_turno" && <TiposTurnoView onBack={() => setCurrentView("admin")} />}
      {currentView === "plantillas" && <PlantillasView onBack={() => setCurrentView("admin")} />}
      {currentView === "reglas" && <ReglasServicioView onBack={() => setCurrentView(reglasReturn)} />}
    </>
  );

  if (esDesktop) {
    // Login, elección de servicio y registro pendiente: pantalla completa,
    // sin menú (aún no hay sesión con servicio).
    const esEntrada = !auth?.isLogged || ["login", "select_service", "pending_registration"].includes(currentView);
    if (esEntrada) {
      return (
        <div className="sgt-entrada">
          {animaciones}
          {vistas}
        </div>
      );
    }
    return (
      <DesktopShell
        user={auth?.user}
        activo={itemActivo(currentView, calendarReturn)}
        onNavigate={navegarDesktop}
        onLogout={handleLogout}
        onSwitchService={handleBackToServiceSelection}
        conteoSolicitudes={conteoSolicitudes}
      >
        {animaciones}
        <AvisoSinPermiso />
        {currentView === "agenda" ? (
          <CentroOperacionesDesktop
            user={auth?.user}
            onNavigate={navegarDesktop}
            onOpenSolicitudes={handleOpenSolicitudes}
          />
        ) : vistas}
      </DesktopShell>
    );
  }

  return (
    <PhoneShell>
      {animaciones}
      {vistas}
      <AvisoSinPermiso />

      {[
        "agenda",
        "perfil",
        "solicitudes",
      ].includes(currentView) && (
        <TabBar active={activeTab} onChange={handleTabChange} />
      )}

      {currentView === "calendar_view" && calendarReturn === "agenda" && (
        <TabBar active={activeTab} onChange={handleTabChange} />
      )}
    </PhoneShell>
  );
};

export default Prop4;
