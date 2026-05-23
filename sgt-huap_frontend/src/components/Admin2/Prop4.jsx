// Prop4.jsx
import React, { useMemo, useState } from "react";
import { SGT_DATA } from "./data";
import "./style.css";

import {
  AlertBanner,
  IconBtn,
  PhoneShell,
  SGTAvatar,
  SGTBadge,
  SGTIcon,
  Sheet,
  TabBar,
  TopHeader,
} from "./UIPrimitives";

// Importamos las nuevas vistas separadas
import { useAuth } from "../../context/AuthContext";
import AdminDashboard from "./AdminDashboard";
import AsignacionView from "./AsignacionView";
import JerarquiaView from "./JerarquiaView";
import LoginView from "./LoginView";
import ProfileView, { SGTRoleChip } from "./Perfil";
import PisosView from "./PisosView";
import RotativaWizard from "./Rotativa";
import SelectServiceView from "./SelectServiceView";
import ServiciosView from "./ServiciosView";
import SolicitudesView from "./SolicitudesView";
import CalendarView from "./calendarView";

const Prop4 = ({ tweaks = {} }) => {
  const auth = useAuth();
  const [currentView, setCurrentView] = useState("login");
  const [activeTab, setActiveTab] = useState("home");

  // Estado puente entre Paso 1 (LoginView) y Paso 2 (SelectServiceView)
  const [preAuthToken, setPreAuthToken] = useState(null);
  const [serviciosDisponibles, setServiciosDisponibles] = useState([]);
  const [solicitudesReturn, setSolicitudesReturn] = useState("agenda");

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    if (tabId === "home") setCurrentView("agenda");
    if (tabId === "calendar") setCurrentView("calendar_view");
    if (tabId === "me") setCurrentView("perfil");
    if (tabId === "requests") {
      setSolicitudesReturn("agenda");
      setCurrentView("solicitudes");
    }
  };

  // Paso 1 completado
  const handleLoginSuccess = ({ preAuthToken, servicios }) => {
    setPreAuthToken(preAuthToken);
    setServiciosDisponibles(servicios);
    setCurrentView("select_service");
  };

  // Paso 2 completado
  const handleServiceSelected = (userData) => {
    if (serviciosDisponibles.length > 0 && userData.servicioId) {
      const servicioReal = serviciosDisponibles.find(
        (s) =>
          Number(s.servicioId || s.idServicio) === Number(userData.servicioId),
      );
      if (servicioReal) {
        localStorage.setItem(
          "sgt_servicio_activo_nombre",
          servicioReal.nombre || servicioReal.nombreServicio,
        );
      }
    }

    if (auth?.updateUser) {
      auth.updateUser(userData);
    }

    setPreAuthToken(null);
    setCurrentView("agenda");
    setActiveTab("home");
  };

  // Volver a seleccionar servicio
  const handleBackToServiceSelection = () => {
    // PROTECCIÓN CONTRA NULOS AQUÍ
    const servicios = auth?.user?.servicios || serviciosDisponibles;
    if (servicios && servicios.length > 0) {
      setServiciosDisponibles(servicios);
      setPreAuthToken(null);
      setCurrentView("select_service");
    }
  };

  return (
    <PhoneShell>
      <style>{`
        @keyframes sgtFade { from { opacity:0 } to { opacity:1 } }
        @keyframes sgtSlideUp { from { transform:translateY(40px); opacity:0.6 } to { transform:translateY(0); opacity:1 } }
        @keyframes sgtSlideLeft { from { transform:translateX(100%); } to { transform:translateX(0); } }
      `}</style>

      {/* FLUJOS */}
      {currentView === "login" && (
        <LoginView onLoginSuccess={handleLoginSuccess} />
      )}

      {currentView === "select_service" && (
        <SelectServiceView
          preAuthToken={preAuthToken}
          servicios={serviciosDisponibles}
          onServiceSelected={handleServiceSelected}
        />
      )}

      {currentView === "agenda" && (
        <AgendaView
          tweaks={tweaks}
          // PROTECCIÓN CONTRA NULOS AQUÍ
          userName={auth?.user?.nombre || "Usuario"}
          onSwitchService={handleBackToServiceSelection}
        />
      )}

      {currentView === "calendar_view" && (
        <CalendarView
          onBack={() => {
            setCurrentView("agenda");
            setActiveTab("home");
          }}
        />
      )}

      {currentView === "perfil" && (
        <ProfileView
          onGoAdmin={() => setCurrentView("admin")}
          onBack={() => {
            setCurrentView("agenda");
            setActiveTab("home");
          }}
          onChangeService={handleBackToServiceSelection}
        />
      )}

      {currentView === "admin" && (
        <AdminDashboard
          onBack={() => setCurrentView("perfil")}
          onGoRotativa={() => setCurrentView("rotativa_wizard")}
          onGoServicios={() => setCurrentView("servicios")}
          onGoAsignacion={() => setCurrentView("asignacion")}
          onGoFuncionarios={() => setCurrentView("jerarquia")}
          onGoPisos={() => setCurrentView("pisos")}
          onGoSolitudes={() => {
            setSolicitudesReturn("admin");
            setCurrentView("solicitudes");
          }}
        />
      )}

      {/* RUTAS SECUNDARIAS DEL ADMIN */}
      {currentView === "rotativa_wizard" && (
        <RotativaWizard onExit={() => setCurrentView("admin")} />
      )}
      {currentView === "servicios" && (
        <ServiciosView onBack={() => setCurrentView("admin")} />
      )}
      {currentView === "asignacion" && (
        <AsignacionView onBack={() => setCurrentView("admin")} />
      )}
      {currentView === "jerarquia" && (
        <JerarquiaView onBack={() => setCurrentView("admin")} />
      )}
      {currentView === "pisos" && (
        <PisosView onBack={() => setCurrentView("admin")} />
      )}
      {currentView === "solicitudes" && (
        <SolicitudesView onBack={() => setCurrentView(solicitudesReturn)} />
      )}

      {/* TAB BAR: Solo se muestra en las vistas principales */}
      {["agenda", "perfil", "calendar_view", "solicitudes"].includes(
        currentView,
      ) && <TabBar active={activeTab} onChange={handleTabChange} />}
    </PhoneShell>
  );
};

// ------------------------------------------------------------------
// AGENDA Y COMPONENTES RELACIONADOS
// ------------------------------------------------------------------

const AgendaView = ({ tweaks, userName, onSwitchService }) => {
  const [filter, setFilter] = useState("todos");
  const [detailShift, setDetailShift] = useState(null);
  const [bannerCollapsed, setBannerCollapsed] = useState(false);
  const D = SGT_DATA;
  const PA = D.PALETTE;
  const getShifts = (dayKey) => D.SHIFTS_BY_DAY[dayKey] || [];
  const countMisTurnos = D.WEEK_DAYS.filter((d) =>
    getShifts(d.key).some((s) => s.miTurno),
  ).length;

  const FILTERS = [
    { id: "todos", label: "Todos los días" },
    { id: "miTurno", label: "Mis turnos", count: countMisTurnos },
  ];

  const visibleDays = useMemo(() => {
    return D.WEEK_DAYS.filter((day) => {
      const shifts = getShifts(day.key);
      if (filter === "todos") return true;
      if (filter === "miTurno") return shifts.some((s) => s.miTurno);
      return true;
    });
  }, [filter]);

  return (
    <>
      {/* SINTAXIS REPARADA EN TopHeader */}
      <TopHeader
        title="Agenda"
        subtitle={`Hola ${userName}`}
        leftSlot={
          <button
            onClick={onSwitchService}
            style={{
              background: "transparent",
              border: "none",
              padding: "4px 8px 4px 0",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
            }}
          >
            <SGTIcon
              name="chevron-left"
              size={24}
              color={SGT_DATA.PALETTE.ink}
            />
          </button>
        }
        rightSlot={
          <div style={{ display: "flex", gap: 6 }}>
            <IconBtn icon="bell" badge={D.PENDIENTES?.length || 0} />
          </div>
        }
        dense
      />
      <AlertBanner
        pendientes={D.PENDIENTES}
        collapsed={bannerCollapsed}
        onToggle={() => setBannerCollapsed(!bannerCollapsed)}
      />

      <div
        style={{
          display: "flex",
          gap: 6,
          padding: "10px 14px 6px",
          overflowX: "auto",
        }}
      >
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            style={{
              background: filter === f.id ? PA.primary : "#fff",
              color: filter === f.id ? "#fff" : PA.ink2,
              border: `1px solid ${filter === f.id ? PA.primary : PA.line}`,
              borderRadius: 999,
              padding: "7px 12px",
              fontSize: 12.5,
              fontWeight: 800,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}
          >
            {f.label}
            {f.count != null && (
              <span
                style={{
                  background:
                    filter === f.id ? "rgba(255,255,255,0.22)" : PA.line2,
                  color: filter === f.id ? "#fff" : PA.ink3,
                  padding: "1px 6px",
                  borderRadius: 99,
                  fontSize: 10.5,
                  fontWeight: 800,
                }}
              >
                {f.count}
              </span>
            )}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, overflow: "auto", padding: "6px 14px 16px" }}>
        {visibleDays.map((day) => (
          <Prop4DayRow
            key={day.key}
            day={day}
            density={tweaks.density}
            defaultExpanded={day.key === D.TODAY_KEY && filter === "todos"}
            onOpen={(s) => setDetailShift(s)}
          />
        ))}
        {visibleDays.length === 0 && (
          <div
            style={{
              padding: 40,
              textAlign: "center",
              color: PA.ink3,
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            Sin turnos en esta categoría.
          </div>
        )}
      </div>

      <Sheet
        open={!!detailShift}
        onClose={() => setDetailShift(null)}
        title="Detalle del turno"
        maxHeight="88%"
      >
        {detailShift && <ShiftDetail shift={detailShift} />}
      </Sheet>
    </>
  );
};

const Prop4DayRow = ({ day, defaultExpanded, onOpen, density }) => {
  const [expanded, setExpanded] = useState(!!defaultExpanded);
  const shifts = SGT_DATA.SHIFTS_BY_DAY[day.key] || [];
  const miShift = shifts.find((s) => s.miTurno);
  const hoy = day.key === SGT_DATA.TODAY_KEY;
  const team = miShift ? SGT_DATA.TEAMS[miShift.equipo] : null;
  const PA = SGT_DATA.PALETTE;
  const D = SGT_DATA;
  const libres = shifts.filter((s) => s.turnoLibre);
  const vpad = density === "compact" ? "8px 12px" : "11px 14px";

  return (
    <div
      style={{
        background: "#fff",
        border: `1px solid ${hoy ? PA.primary : PA.line}`,
        borderRadius: 14,
        marginBottom: 8,
        overflow: "hidden",
        boxShadow: hoy ? "0 4px 14px rgba(23,65,108,0.08)" : "none",
      }}
    >
      <button
        onClick={() => setExpanded((e) => !e)}
        style={{
          width: "100%",
          background: "transparent",
          border: "none",
          padding: vpad,
          cursor: "pointer",
          textAlign: "left",
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <div
          style={{
            minWidth: 40,
            textAlign: "center",
            color: hoy ? PA.accent : day.findesemana ? PA.ink3 : PA.ink,
          }}
        >
          <div
            style={{
              fontSize: 10,
              fontWeight: 800,
              letterSpacing: 0.5,
              textTransform: "uppercase",
            }}
          >
            {day.dia}
          </div>
          <div
            style={{
              fontSize: 22,
              fontWeight: 800,
              lineHeight: 1,
              marginTop: 2,
            }}
          >
            {day.num}
          </div>
          {hoy && (
            <div
              style={{
                fontSize: 8,
                fontWeight: 800,
                color: PA.accent,
                marginTop: 2,
                letterSpacing: 0.4,
              }}
            >
              HOY
            </div>
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          {miShift ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  flexWrap: "wrap",
                }}
              >
                <div
                  style={{
                    padding: "3px 8px",
                    borderRadius: 99,
                    background: team.bg,
                    color: team.ink,
                    fontSize: 11,
                    fontWeight: 800,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  <SGTIcon
                    name={miShift.tipo === "dia" ? "sun" : "moon"}
                    size={11}
                    color={team.ink}
                  />{" "}
                  {miShift.tipo === "dia" ? "Día" : "Noche"}
                </div>
                <span style={{ fontSize: 13, fontWeight: 800, color: PA.ink }}>
                  {miShift.inicio}–{miShift.fin}
                </span>
              </div>
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                {miShift.cambioAprobado && (
                  <SGTBadge tone="success" size="xs">
                    ✓ Aprobado
                  </SGTBadge>
                )}
                {miShift.solicitudPendiente && (
                  <SGTBadge tone="warn" size="xs">
                    Pendiente
                  </SGTBadge>
                )}
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              <span style={{ fontSize: 13, color: PA.ink2, fontWeight: 700 }}>
                Sin turno
              </span>
              {libres.length > 0 && (
                <span
                  style={{ fontSize: 11.5, color: "#B85A60", fontWeight: 700 }}
                >
                  {libres.length} turno libre disponible
                </span>
              )}
            </div>
          )}
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
            gap: 4,
          }}
        >
          {libres.length > 0 && miShift && (
            <span
              style={{
                padding: "2px 7px",
                borderRadius: 99,
                background: PA.accentSoft,
                color: "#B85A60",
                fontSize: 10,
                fontWeight: 800,
                border: "1px solid #F3D2D5",
                display: "inline-flex",
                alignItems: "center",
                gap: 3,
              }}
            >
              <SGTIcon name="hand-raised" size={10} color="#B85A60" />{" "}
              {libres.length} libre
            </span>
          )}
          <SGTIcon
            name={expanded ? "chevron-up" : "chevron-down"}
            size={16}
            color={PA.ink3}
          />
        </div>
      </button>

      {expanded && (
        <div
          style={{ padding: "0 14px 12px", borderTop: `1px solid ${PA.line2}` }}
        >
          {shifts.length === 0 ? (
            <p
              style={{
                fontSize: 12,
                color: PA.ink3,
                margin: "10px 0 0",
                fontWeight: 600,
              }}
            >
              No hay turnos este día.
            </p>
          ) : (
            shifts.map((s) => {
              const t = D.TEAMS[s.equipo];
              return (
                <div
                  key={s.id}
                  onClick={() => onOpen(s)}
                  style={{
                    marginTop: 10,
                    background: t.bg,
                    border: `1px solid ${t.soft}`,
                    borderRadius: 10,
                    padding: 10,
                    cursor: "pointer",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 7,
                      marginBottom: 7,
                    }}
                  >
                    <SGTIcon
                      name={s.tipo === "dia" ? "sun" : "moon"}
                      size={14}
                      color={t.ink}
                    />
                    <span
                      style={{
                        fontSize: 12.5,
                        fontWeight: 800,
                        color: t.ink,
                        flex: 1,
                      }}
                    >
                      {s.tipo === "dia" ? "Turno día" : "Turno noche"} ·{" "}
                      {s.inicio}–{s.fin}
                    </span>
                    {s.miTurno && (
                      <SGTBadge tone="primary" size="xs">
                        Tu turno
                      </SGTBadge>
                    )}
                    {s.turnoLibre && (
                      <SGTBadge tone="accent" size="xs">
                        Cupo libre
                      </SGTBadge>
                    )}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      background: "rgba(255,255,255,0.7)",
                      padding: "6px 8px",
                      borderRadius: 8,
                    }}
                  >
                    <SGTAvatar person={s.team.jefe} size={22} ring="#E9D9C2" />
                    <span
                      style={{
                        fontSize: 11.5,
                        fontWeight: 700,
                        color: PA.ink,
                        flex: 1,
                        minWidth: 0,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {s.team.jefe.nombre.split(" ").slice(0, 2).join(" ")}
                    </span>
                    <div style={{ display: "flex" }}>
                      {s.team.urgenciologos &&
                        s.team.urgenciologos.slice(0, 2).map((p, i) => (
                          <div
                            key={p.id}
                            style={{ marginLeft: i === 0 ? 0 : -5 }}
                          >
                            <SGTAvatar person={p} size={20} ring="#fff" />
                          </div>
                        ))}
                    </div>
                    <span
                      style={{
                        fontSize: 10.5,
                        color: PA.ink3,
                        fontWeight: 700,
                      }}
                    >
                      +{Math.max(0, s.team.total - 3)} · Ver detalle →
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

const P2 = () => SGT_DATA.PALETTE;
const TeamComposition = ({ team, density = "cozy" }) => {
  const [expanded, ReactSetExpanded] = React.useState(false);
  const totalSinJefe =
    (team.urgenciologos?.length || 0) + (team.medicos?.length || 0);
  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: density === "compact" ? "8px 10px" : "10px 12px",
          background: P2().surface2,
          borderRadius: 10,
          border: `1px solid ${P2().line}`,
        }}
      >
        <SGTAvatar person={team.jefe} size={32} ring="#E9D9C2" />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13.5, fontWeight: 800, color: P2().ink }}>
            {team.jefe.nombre}
          </div>
          <div style={{ marginTop: 2 }}>
            <SGTRoleChip role="JEFATURA" />
          </div>
        </div>
      </div>
      <button
        onClick={() => ReactSetExpanded(!expanded)}
        style={{
          width: "100%",
          marginTop: 8,
          background: "transparent",
          border: `1px dashed ${P2().line}`,
          borderRadius: 10,
          padding: "8px 10px",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          color: P2().ink2,
          fontSize: 12.5,
          fontWeight: 700,
        }}
      >
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <SGTIcon name="users" size={14} color={P2().ink2} /> Equipo ·{" "}
          {totalSinJefe} de 8
        </span>
        <SGTIcon
          name={expanded ? "chevron-up" : "chevron-down"}
          size={14}
          color={P2().ink2}
        />
      </button>
      {expanded && (
        <div
          style={{
            marginTop: 8,
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          <RoleGroup
            title="Urgenciólogos"
            role="URGENCIOLOGO"
            people={team.urgenciologos || []}
            ideal={4}
          />
          <RoleGroup
            title="Médicos generales"
            role="MEDICO"
            people={team.medicos || []}
            ideal={4}
          />
        </div>
      )}
    </div>
  );
};

const RoleGroup = ({ title, role, people, ideal }) => {
  return (
    <div
      style={{
        border: `1px solid ${P2().line}`,
        borderRadius: 10,
        background: "#fff",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "7px 10px",
          borderBottom: `1px solid ${P2().line2}`,
        }}
      >
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          <SGTRoleChip role={role} />
          <span style={{ fontSize: 12, color: P2().ink2, fontWeight: 700 }}>
            {people.length}/{ideal}
          </span>
        </div>
      </div>
      <div
        style={{ padding: 8, display: "flex", flexDirection: "column", gap: 4 }}
      >
        {people.map((p) => (
          <div
            key={p.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "4px 6px",
              background: p.esYo ? P2().primarySoft : "transparent",
              borderRadius: 6,
            }}
          >
            <SGTAvatar person={p} size={24} />
            <span
              style={{
                fontSize: 13,
                color: P2().ink,
                fontWeight: p.esYo ? 800 : 500,
                flex: 1,
              }}
            >
              {p.nombre}
              {p.esYo ? " (tú)" : ""}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

const ShiftActions = ({ shift }) => {
  const actions = [];
  if (shift.miTurno && !shift.solicitudPendiente) {
    actions.push({
      id: "cambio",
      label: "Solicitar cambio",
      icon: "swap",
      tone: "primary",
    });
  }
  actions.push({
    id: "historial",
    label: "Ver historial",
    icon: "history",
    tone: "ghost",
  });
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {actions.map((a) => (
        <ActionBtn key={a.id} {...a} />
      ))}
    </div>
  );
};

const ActionBtn = ({ label, icon, tone = "primary" }) => {
  const tones = {
    primary: { bg: P2().primary, ink: "#fff", bd: P2().primary },
    ghost: { bg: "#fff", ink: P2().ink, bd: P2().line },
  };
  const t = tones[tone] || tones.primary;
  return (
    <button
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        background: t.bg,
        color: t.ink,
        border: `1px solid ${t.bd}`,
        padding: "12px 14px",
        borderRadius: 12,
        fontSize: 14,
        fontWeight: 700,
        cursor: "pointer",
        textAlign: "left",
      }}
    >
      <SGTIcon name={icon} size={17} color={t.ink} />
      <span style={{ flex: 1 }}>{label}</span>
      <SGTIcon name="chevron-right" size={14} color={t.ink} strokeWidth={2.4} />
    </button>
  );
};

const ShiftDetail = ({ shift }) => {
  const team = SGT_DATA.TEAMS[shift.equipo];
  return (
    <div
      style={{
        padding: "0 16px 20px",
        display: "flex",
        flexDirection: "column",
        gap: 14,
      }}
    >
      <div
        style={{
          background: team.bg,
          border: `1px solid ${team.soft}`,
          borderRadius: 14,
          padding: 14,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginBottom: 6,
          }}
        >
          <SGTIcon
            name={shift.tipo === "dia" ? "sun" : "moon"}
            size={18}
            color={team.ink}
          />
          <span
            style={{
              fontSize: 13,
              fontWeight: 800,
              color: team.ink,
              textTransform: "uppercase",
            }}
          >
            {shift.tipo === "dia" ? "Turno día" : "Turno noche"}
          </span>
        </div>
        <div style={{ fontSize: 22, fontWeight: 800, color: team.ink }}>
          {shift.inicio} – {shift.fin}
        </div>
      </div>
      <div>
        <div
          style={{
            fontSize: 12,
            fontWeight: 800,
            color: P2().ink3,
            textTransform: "uppercase",
            marginBottom: 8,
          }}
        >
          Composición del turno
        </div>
        <TeamComposition team={shift.team} />
      </div>
      <div>
        <div
          style={{
            fontSize: 12,
            fontWeight: 800,
            color: P2().ink3,
            textTransform: "uppercase",
            marginBottom: 8,
          }}
        >
          Acciones
        </div>
        <ShiftActions shift={shift} />
      </div>
    </div>
  );
};

export default Prop4;
