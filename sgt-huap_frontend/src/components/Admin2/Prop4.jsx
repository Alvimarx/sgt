// Prop4.jsx
import React, { useState } from "react";
import "./style.css";

import { PhoneShell, TabBar } from "./UIPrimitives";
import { useAuth } from "../../context/AuthContext";

import AdminDashboard from "./AdminDashboard";
import AdminStats from "./AdminStats";
import AgendaView from "./AgendaView";
import AsignacionView from "./AsignacionView";
import AuditoriaView from "./AuditoriaView";
import BitacoraView from "./BitacoraView";
import CalendarView from "./calendarView";
import JerarquiaView from "./JerarquiaView";
import LoginView from "./LoginView";
import PersonalDashboard from "./PersonalDashboard";
import PisosView from "./PisosView";
import PlantillasView from "./PlantillasView";
import NotificationView from "./NotificationView";
import ProfileView from "./Perfil";
import RotativaWizard from "./Rotativa";
import SelectServiceView from "./SelectServiceView";
import ServiciosView from "./ServiciosView";
import SolicitudesView from "./SolicitudesView";
import TiposTurnoView from "./TiposTurnoView";
import PlanificacionView from "./Planificacion";

const Prop4 = ({ tweaks = {} }) => {
  const auth = useAuth();
  const [currentView, setCurrentView] = useState("login");
  const [activeTab, setActiveTab] = useState("home");

  const [preAuthToken, setPreAuthToken] = useState(null);
  const [serviciosDisponibles, setServiciosDisponibles] = useState([]);
  const [solicitudesReturn, setSolicitudesReturn] = useState("agenda");
  const [solicitudesCreatePreset, setSolicitudesCreatePreset] = useState(null);

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    if (tabId === "home") setCurrentView("agenda");
    if (tabId === "calendar") setCurrentView("calendar_view");
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

  const handleLoginSuccess = ({ preAuthToken, servicios }) => {
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
    const servicios = auth?.user?.servicios || serviciosDisponibles;
    if (servicios && servicios.length > 0) {
      setServiciosDisponibles(servicios);
      setPreAuthToken(null);
      setCurrentView("select_service");
    }
  };

  const handleLogout = () => {
    auth?.logout?.();
    localStorage.removeItem("sgt_servicio_activo_nombre");
    setPreAuthToken(null);
    setServiciosDisponibles([]);
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
      {currentView === "agenda" && (
        <AgendaView
          tweaks={tweaks}
          user={auth?.user}
          onSwitchService={handleBackToServiceSelection}
          onLogout={handleLogout}
          onOpenNotifications={handleOpenNotifications}
          onOpenSolicitudes={handleOpenSolicitudes}
          onOpenBitacora={() => setCurrentView("bitacora")}
        />
      )}
      {currentView === "notifications" && (
        <NotificationView onBack={() => setCurrentView("agenda")} />
      )}
      {currentView === "calendar_view" && (
        <CalendarView
          onBack={() => { setCurrentView("agenda"); setActiveTab("home"); }}
          onOpenBitacora={() => setCurrentView("bitacora")}
        />
      )}
      {currentView === "perfil" && (
        <ProfileView
          onGoAdmin={() => setCurrentView("admin")}
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
          onGoRotativa={() => setCurrentView("rotativa_wizard")}
          onGoServicios={() => setCurrentView("servicios")}
          onGoAsignacion={() => setCurrentView("asignacion")}
          onGoFuncionarios={() => setCurrentView("jerarquia")}
          onGoPisos={() => setCurrentView("pisos")}
          onGoSolitudes={() => { setSolicitudesReturn("admin"); setCurrentView("solicitudes"); }}
          onGoStats={() => setCurrentView("admin_stats")}
          onGoBitacora={() => setCurrentView("bitacora")}
          onGoAuditoria={() => setCurrentView("auditoria")}
          onGoTiposTurno={() => setCurrentView("tipos_turno")}
          onGoPlantillas={() => setCurrentView("plantillas")}
          onGoPlanificacion={() => setCurrentView("planificacion")}
        />
      )}
      {currentView === "planificacion" && <PlanificacionView onBack={() => setCurrentView("admin")} />}
      {currentView === "rotativa_wizard" && <RotativaWizard onExit={() => setCurrentView("admin")} />}
      {currentView === "servicios" && <ServiciosView onBack={() => setCurrentView("admin")} />}
      {currentView === "asignacion" && <AsignacionView onBack={() => setCurrentView("admin")} />}
      {currentView === "jerarquia" && <JerarquiaView onBack={() => setCurrentView("admin")} />}
      {currentView === "pisos" && <PisosView onBack={() => setCurrentView("admin")} />}
      {currentView === "solicitudes" && (
        <SolicitudesView
          onBack={() => setCurrentView(solicitudesReturn)}
          initialCreatePreset={solicitudesCreatePreset}
          onInitialCreatePresetConsumed={() => setSolicitudesCreatePreset(null)}
        />
      )}
      {currentView === "admin_stats" && <AdminStats onBack={() => setCurrentView("admin")} />}
      {currentView === "bitacora" && <BitacoraView onBack={() => setCurrentView("admin")} />}
      {currentView === "auditoria" && <AuditoriaView onBack={() => setCurrentView("admin")} />}
      {currentView === "tipos_turno" && <TiposTurnoView onBack={() => setCurrentView("admin")} />}
      {currentView === "plantillas" && <PlantillasView onBack={() => setCurrentView("admin")} />}

      {["agenda", "perfil", "calendar_view", "solicitudes"].includes(currentView) && (
        <TabBar active={activeTab} onChange={handleTabChange} />
      )}
    </PhoneShell>
  );
};

export default Prop4;
