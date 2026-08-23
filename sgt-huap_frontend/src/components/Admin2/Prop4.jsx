// Prop4.jsx
import React, { useEffect, useMemo, useState } from "react";

//Importaciones Style
import "../Style/style.css";
import { PhoneShell, TabBar } from "../Style/UIPrimitives";

import { useAuth } from "../../context/AuthContext";

//Importaciones de Comun
import AgendaView from "../Comun/AgendaView";
import CalendarView from "../Comun/calendarView";
import NotificationView from "../Comun/NotificationView";
import SelectServiceView from "../Comun/SelectServiceView";
import ProfileView from "../Comun/Perfil";
import PersonalDashboard from "../Comun/PersonalDashboard";

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
const VISTAS_SOLO_ADMIN = [
  "admin", "funcionarios_sistema", "planificacion", "servicios",
  "asignacion", "jerarquia", "tipos_turno", "plantillas",
];
const VISTAS_SOLO_JEFATURA = [
  "jefatura", "funcionarios_servicio_jefatura", "asignacionJefatura", "jerarquiaJefatura",
];
const VISTAS_SOLO_SUBROGANTE = ["subrogante"];
const VISTAS_GESTION = ["admin_stats", "puestos", "auditoria", "reglas"];

// ¿Puede este usuario (ya rehidratado) ver esta vista? Mismos gates que usa
// Perfil.jsx para mostrar los paneles. Importante en multi-pestaña: si en otra
// pestaña se cambió a un servicio donde el rol es MEDICO, aquí no se restaura
// un panel de jefatura con el token nuevo.
function vistaPermitida(view, user) {
  const esAdmin = ["ADMIN", "ADMINISTRADOR"].includes(String(user?.rolSistema || "").toUpperCase());
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
  // Navegación inicial: la última vista guardada si hay sesión, o login.
  // useMemo con [] = solo al montar; auth.user ya está rehidratado en ese punto.
  const navInicial = useMemo(() => leerNavGuardada(auth?.user), []);

  const [currentView, setCurrentView] = useState(navInicial.view);
  const [activeTab, setActiveTab] = useState(navInicial.tab);

  const [preAuthToken, setPreAuthToken] = useState(null);
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

  const handleLoginSuccess = ({ preAuthToken, servicios = [], registeredInSystem, message }) => {
    if (!registeredInSystem) {
      setPreAuthToken(null);
      setServiciosDisponibles([]);
      setPendingRegistrationMessage(message || 'Tu cuenta aún no ha sido registrada en el sistema.');
      setCurrentView('pending_registration');
      return;
    }

    setPendingRegistrationMessage('');
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
    // formas: {servicioId, nombre} (paso 1 del login) e {idServicio, nombreServicio}
    // (perfil persistido) — SelectServiceView espera servicioId/nombre.
    const crudos = (serviciosDisponibles?.length > 0 ? serviciosDisponibles : auth?.user?.servicios) || [];
    const servicios = crudos
      .map((s) => ({
        servicioId: s.servicioId ?? s.idServicio,
        nombre: s.nombre ?? s.nombreServicio,
        rol: s.rol,
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

  return (
    <PhoneShell>
      <style>{`
        @keyframes sgtFade { from { opacity:0 } to { opacity:1 } }
        @keyframes sgtSlideUp { from { transform:translateY(40px); opacity:0.6 } to { transform:translateY(0); opacity:1 } }
        @keyframes sgtSlideLeft { from { transform:translateX(100%); } to { transform:translateX(0); } }
      `}</style>

      {currentView === "login" && (
        <LoginView onLoginSuccess={handleLoginSuccess} />
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
