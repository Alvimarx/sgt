// AgendaView.jsx
import React, { useEffect, useMemo, useState } from "react";
import { SGT_DATA } from "./data";
import { getTurnosServicio } from "../../services/funcionarioService";

import {
  AlertBanner,
  IconBtn,
  SGTAvatar,
  SGTBadge,
  SGTIcon,
  Sheet,
  TopHeader,
} from "./UIPrimitives";
import { SGTRoleChip } from "./Perfil";
import { useNotifications } from "../../context/NotificationContext";

// ---------------------------------------------------------------------------
// HELPERS DE PRESENTACIÓN (solo usados en esta vista)
// ---------------------------------------------------------------------------


const buildInitials = (name = "") =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("") || "?";

const TEAM_COLORS = [
  { bg: "#b0baee", soft: "#D7E2FF", ink: "#183b6b" },
  { bg: "rgb(166, 231, 180)", soft: "#D2E9D6", ink: "#24513A" },
  { bg: "rgb(245, 223, 188)", soft: "#F5E0B7", ink: "#6B4D15" },
  { bg: "rgb(225, 188, 245)", soft: "#E3D1F3", ink: "#5A3A72" },
  { bg: "rgb(248, 208, 223)", soft: "#F2D1D5", ink: "#8C3F44" },
  { bg: "rgb(173, 224, 231)", soft: "#CFE9F0", ink: "#2C6270" },
];

const hashString = (value = "") => {
  let hash = 0;
  const seed = String(value);
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return hash;
};

const getTeamColor = (shift) => {
  const seed =
    shift?.teamGroup?.key ||
    shift?.teamKey ||
    `${shift?.tipo || "sin-tipo"}-${shift?.idPiso ?? shift?.raw?.idPiso ?? "sin-piso"}`;

  return TEAM_COLORS[hashString(seed) % TEAM_COLORS.length];
};

/**
 * Devuelve el objeto team del turno.
 * Si ya viene construido (mock o API enriquecida) lo usa directamente.
 * Si solo hay nombreFuncionario en raw, construye un team mínimo.
 * Si no hay datos suficientes, retorna null (el JSX lo protege).
 */
const getAgendaTeam = (shift) => {
  if (shift?.teamGroup?.integrantes?.length) {
    const integrantes = shift.teamGroup.integrantes;
    return {
      jefe: integrantes[0],
      integrantes,
      urgenciologos: integrantes.slice(1, 3),
      medicos: integrantes.slice(3),
      total: integrantes.length,
    };
  }

  if (shift?.team) return shift.team;
  const nombreFuncionario = shift?.raw?.nombreFuncionario;
  if (!nombreFuncionario) return null;
  return {
    jefe: {
      id: shift?.raw?.idFuncionario ?? shift?.id ?? "sin-asignar",
      nombre: nombreFuncionario,
      rol: "MEDICO",
      iniciales: buildInitials(nombreFuncionario),
      esYo: Boolean(shift?.miTurno),
    },
    urgenciologos: [],
    medicos: [],
    total: 1,
  };
};

/** Datos de fallback mientras carga o si la API falla. */
const buildAgendaFallback = () => ({
  todayKey: SGT_DATA.TODAY_KEY,
  weekDays: SGT_DATA.WEEK_DAYS,
  shiftsByDay: SGT_DATA.SHIFTS_BY_DAY,
  turnos: [],
});

// Acceso directo a la paleta sin re-crear objetos en cada render
const P2 = () => SGT_DATA.PALETTE;

// ---------------------------------------------------------------------------
// AGENDAVIEW — contenedor principal
// ---------------------------------------------------------------------------

const AgendaView = ({ tweaks = {}, user, onSwitchService, onLogout, onOpenNotifications }) => {
  const [filter, setFilter] = useState("miTurno");
  const [detailShift, setDetailShift] = useState(null);
  const [bannerCollapsed, setBannerCollapsed] = useState(false);
  const [agendaData, setAgendaData] = useState(() => buildAgendaFallback());
  const [loadingAgenda, setLoadingAgenda] = useState(true);
  const [agendaError, setAgendaError] = useState("");

  const D = SGT_DATA;
  const PA = D.PALETTE;
  const agendaDays = agendaData.weekDays || D.WEEK_DAYS || [];
  const shiftsByDay = agendaData.shiftsByDay || D.SHIFTS_BY_DAY || {};
  const todayKey = agendaData.todayKey || D.TODAY_KEY;
  const pendientes = D.PENDIENTES || [];
  const { unreadCount } = useNotifications();

  const getShifts = (dayKey) => shiftsByDay[dayKey] || [];

  // Carga de turnos — se re-ejecuta si cambia el usuario o su servicio activo
  useEffect(() => {
    let mounted = true;

    const loadAgenda = async () => {
      setLoadingAgenda(true);
      setAgendaError("");

      const result = await getTurnosServicio(user?.servicioId, user?.id ?? user?.userId);

      if (!mounted) return;

      if (result.success && result.data) {
        setAgendaData(result.data);
      } else {
        setAgendaData(buildAgendaFallback());
        setAgendaError(result.error || "No se pudieron cargar los turnos.");
      }

      setLoadingAgenda(false);
    };

    loadAgenda();

    return () => { mounted = false; };
  }, [user?.id, user?.userId, user?.servicioId]);

  const countMisTurnos = useMemo(
    () => agendaDays.filter((day) => getShifts(day.key).some((s) => s.miTurno)).length,
    [agendaDays, shiftsByDay]
  );

  const FILTERS = [
    { id: "todos", label: "Todos los días" },
    { id: "miTurno", label: "Mis turnos", count: countMisTurnos },
  ];

  const visibleDays = useMemo(() => {
    return agendaDays.filter((day) => {
      const shifts = getShifts(day.key);
      if (filter === "todos") return true;
      if (filter === "miTurno") return shifts.some((s) => s.miTurno);
      return true;
    });
  }, [agendaDays, filter, shiftsByDay]);

  return (
    <>
      <TopHeader
        title="Agenda"
        subtitle={`Hola ${user?.nombre || "Usuario"}`}
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
            <SGTIcon name="chevron-left" size={24} color={PA.ink} />
          </button>
        }
        rightSlot={
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <IconBtn icon="tray" badge={unreadCount} onClick={onOpenNotifications} />
            <button
              onClick={onLogout}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                height: 36,
                padding: "0 10px",
                borderRadius: 10,
                border: `1px solid ${PA.line}`,
                background: "#fff",
                color: PA.ink2,
                fontSize: 12,
                fontWeight: 800,
                cursor: "pointer",
                flexShrink: 0,
              }}
            >
              <SGTIcon name="close" size={15} color={PA.ink2} />
              Salir
            </button>
          </div>
        }
        dense
      />

      <AlertBanner
        pendientes={pendientes}
        collapsed={bannerCollapsed}
        onToggle={() => setBannerCollapsed(!bannerCollapsed)}
      />

      {/* Error de carga — en lenguaje humano, sin detalles técnicos */}
      {agendaError && !loadingAgenda && (
        <div
          style={{
            margin: "8px 14px 0",
            padding: "10px 12px",
            borderRadius: 12,
            background: "#FFF4F5",
            color: "#8C3F44",
            border: "1px solid #F3D2D5",
            fontSize: 12.5,
            fontWeight: 700,
          }}
        >
          {agendaError}
        </div>
      )}

      {/* Filtros */}
      <div style={{ display: "flex", gap: 6, padding: "10px 14px 6px", overflowX: "auto" }}>
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
                  background: filter === f.id ? "rgba(255,255,255,0.22)" : PA.line2,
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

      {/* Lista de días */}
      <div style={{ flex: 1, overflow: "auto", padding: "6px 14px 16px" }}>
        {loadingAgenda ? (
          <div style={{ padding: 40, textAlign: "center", color: PA.ink3, fontSize: 13, fontWeight: 600 }}>
            Cargando agenda...
          </div>
        ) : (
          <>
            {visibleDays.map((day) => (
              <DayRow
                key={day.key}
                day={day}
                shifts={getShifts(day.key)}
                todayKey={todayKey}
                density={tweaks.density}
                defaultExpanded={day.key === todayKey && filter === "todos"}
                onOpen={(s) => setDetailShift(s)}
              />
            ))}
            {visibleDays.length === 0 && (
              <div style={{ padding: 40, textAlign: "center", color: PA.ink3, fontSize: 13, fontWeight: 600 }}>
                Sin turnos en esta categoría.
              </div>
            )}
          </>
        )}
      </div>

      {/* Sheet de detalle */}
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

// ---------------------------------------------------------------------------
// DAYROW — card colapsable por día
// ---------------------------------------------------------------------------

const DayRow = ({ day, shifts, todayKey, defaultExpanded, onOpen, density }) => {
  const [expanded, setExpanded] = useState(!!defaultExpanded);

  const hoy = day.key === todayKey;
  const PA = SGT_DATA.PALETTE;
  const D = SGT_DATA;
  const vpad = density === "compact" ? "8px 12px" : "11px 14px";

  // Usamos el resumen precalculado por buildDaySummary si existe,
  // y derivamos miShift y libres desde los turnos del día.
  const miShift = shifts.find((s) => s.miTurno) || null;
  const libres = shifts.filter((s) => s.turnoLibre);


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
      {/* Header colapsable */}
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
        {/* Fecha */}
        <div
          style={{
            minWidth: 40,
            textAlign: "center",
            color: hoy ? PA.accent : day.findesemana ? PA.ink3 : PA.ink,
          }}
        >
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 0.5, textTransform: "uppercase" }}>
            {day.dia}
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, lineHeight: 1, marginTop: 2 }}>
            {day.num}
          </div>
          {hoy && (
            <div style={{ fontSize: 8, fontWeight: 800, color: PA.accent, marginTop: 2, letterSpacing: 0.4 }}>
              HOY
            </div>
          )}
        </div>

        {/* Resumen del día */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {miShift ? (
            (() => {
              const teamColor = getTeamColor(miShift);

              return (
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                {/* Badge turno día/noche */}
                <div
                  style={{
                    padding: "3px 8px",
                    borderRadius: 99,
                    background: teamColor.bg,
                    color: teamColor.ink,
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
                    color={teamColor.ink}
                  />
                  {miShift.tipo === "dia" ? "Día" : "Noche"}
                </div>
                <span style={{ fontSize: 13, fontWeight: 800, color: PA.ink }}>
                  {miShift.inicio}–{miShift.fin}
                </span>
                {/* Si hay más de un turno propio ese día, lo indicamos */}
                {day.resumen?.tieneMultiplesTurnos && (
                  <span style={{ fontSize: 11, color: PA.ink3, fontWeight: 700 }}>
                    +{day.resumen.misTurnos.length - 1} más
                  </span>
                )}
              </div>
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                {miShift.cambioAprobado && (
                  <SGTBadge tone="success" size="xs">✓ Aprobado</SGTBadge>
                )}
                {miShift.solicitudPendiente && (
                  <SGTBadge tone="warn" size="xs">Pendiente</SGTBadge>
                )}
              </div>
            </div>
              );
            })()
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              <span style={{ fontSize: 13, color: PA.ink2, fontWeight: 700 }}>Sin turno</span>
              {libres.length > 0 && (
                <span style={{ fontSize: 11.5, color: "#B85A60", fontWeight: 700 }}>
                  {libres.length} turno{libres.length > 1 ? "s" : ""} libre disponible
                </span>
              )}
            </div>
          )}
        </div>

        {/* Indicadores lado derecho */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
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
              <SGTIcon name="hand-raised" size={10} color="#B85A60" />
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

      {/* Detalle expandido: lista de todos los turnos del día */}
      {expanded && (
        <div style={{ padding: "0 14px 12px", borderTop: `1px solid ${PA.line2}` }}>
          {shifts.length === 0 ? (
            <p style={{ fontSize: 12, color: PA.ink3, margin: "10px 0 0", fontWeight: 600 }}>
              No hay turnos este día.
            </p>
          ) : (
            shifts.map((s) => {
              const t = getTeamColor(s);
              // team puede ser null si la API no devuelve datos de equipo
              const team = getAgendaTeam(s);

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
                  {/* Fila superior: icono + horario + badges */}
                  <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: team ? 7 : 0 }}>
                    <SGTIcon
                      name={s.tipo === "dia" ? "sun" : "moon"}
                      size={14}
                      color={t.ink}
                    />
                    <span style={{ fontSize: 12.5, fontWeight: 800, color: t.ink, flex: 1 }}>
                      {s.tipo === "dia" ? "Turno día" : "Turno noche"} · {s.inicio}–{s.fin}
                    </span>
                    {s.miTurno && <SGTBadge tone="primary" size="xs">Tu turno</SGTBadge>}
                    {s.turnoLibre && <SGTBadge tone="accent" size="xs">Cupo libre</SGTBadge>}
                  </div>

                  {/* Fila del equipo — solo si hay datos */}
                  {team && (
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
                      <SGTAvatar person={team.jefe} size={22} ring="#E9D9C2" />
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
                        {team.jefe.nombre.split(" ").slice(0, 2).join(" ")}
                      </span>
                      <div style={{ display: "flex" }}>
                        {team.urgenciologos?.slice(0, 2).map((p, i) => (
                          <div key={p.id} style={{ marginLeft: i === 0 ? 0 : -5 }}>
                            <SGTAvatar person={p} size={20} ring="#fff" />
                          </div>
                        ))}
                      </div>
                      <span style={{ fontSize: 10.5, color: PA.ink3, fontWeight: 700 }}>
                        +{Math.max(0, team.total - 3)} · Ver detalle →
                      </span>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// SHIFTDETAIL — contenido del Sheet de detalle
// ---------------------------------------------------------------------------

const ShiftDetail = ({ shift }) => {
  const teamColor = getTeamColor(shift);
  const fecha = shift.fecha || shift.raw?.diaInicioTurno || null;

  // teamGroup viene del servicio (datos reales de API, agrupados por piso+tipo)
  // team viene del mock (objeto completo con jefe/urgenciologos/medicos)
  // Mostramos teamGroup si existe, si no intentamos con team legacy
  const groupData = shift.teamGroup ?? null;
  const legacyTeam = shift.team ? getAgendaTeam(shift) : null;

  return (
    <div style={{ padding: "0 16px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Header con horario */}
      <div
        style={{
          background: teamColor.bg,
          border: `1px solid ${teamColor.soft}`,
          borderRadius: 14,
          padding: 14,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
          <SGTIcon
            name={shift.tipo === "dia" ? "sun" : "moon"}
            size={18}
            color={teamColor.ink}
          />
          <span style={{ fontSize: 13, fontWeight: 800, color: teamColor.ink, textTransform: "uppercase" }}>
            {shift.nombreTipo || (shift.tipo === "dia" ? "Turno día" : "Turno noche")}
          </span>
        </div>
        <div style={{ fontSize: 22, fontWeight: 800, color: teamColor.ink }}>
          {shift.inicio} – {shift.fin}
        </div>
        <div style={{ marginTop: 8, fontSize: 12.5, color: teamColor.ink }}>
          {fecha ? `Fecha: ${fecha}` : "Fecha no disponible"}
        </div>
      </div>

      {/* Información del turno */}
      <div>
        <div style={{ fontSize: 12, fontWeight: 800, color: P2().ink3, textTransform: "uppercase", marginBottom: 8 }}>
          Información del turno
        </div>
        <div
          style={{
            border: `1px solid ${P2().line}`,
            borderRadius: 12,
            background: "#fff",
            padding: 12,
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          <DetailRow label="Piso" value={shift.nombrePiso || shift.raw?.nombrePiso || "Sin piso"} />
          <DetailRow
            label="Estado"
            value={
              shift.solicitudPendiente
                ? `Solicitud pendiente${shift.solicitudCon ? ` con ${shift.solicitudCon}` : ""}`
                : shift.cambioAprobado
                ? `Cambio aprobado${shift.cambioAprobadoCon ? ` con ${shift.cambioAprobadoCon}` : ""}`
                : shift.turnoLibre
                ? `Cupo libre${shift.motivoLibre ? ` · ${shift.motivoLibre}` : ""}`
                : shift.miTurno
                ? "Tu turno"
                : "Asignado"
            }
          />
          {shift.horas && (
            <DetailRow label="Duración" value={`${shift.horas} horas`} />
          )}
        </div>
      </div>

      {/* Equipo del turno — datos reales de API */}
      {groupData && groupData.integrantes.length > 0 && (
        <div>
          <div style={{ fontSize: 12, fontWeight: 800, color: P2().ink3, textTransform: "uppercase", marginBottom: 8 }}>
            Integrantes del mismo piso y horario
          </div>
          <TeamGroup group={groupData} />
        </div>
      )}

      {/* Equipo legacy — datos del mock */}
      {!groupData && legacyTeam && (
        <div>
          <div style={{ fontSize: 12, fontWeight: 800, color: P2().ink3, textTransform: "uppercase", marginBottom: 8 }}>
            Integrantes del mismo piso y tipo
          </div>
          <TeamGroup
            group={{
              nombrePiso: legacyTeam.jefe?.nombre ? null : null,
              integrantes: [
                legacyTeam.jefe,
                ...(legacyTeam.urgenciologos || []),
                ...(legacyTeam.medicos || []),
              ].filter(Boolean),
            }}
          />
        </div>
      )}

      {/* Acciones */}
      <div>
        <div style={{ fontSize: 12, fontWeight: 800, color: P2().ink3, textTransform: "uppercase", marginBottom: 8 }}>
          Acciones
        </div>
        <ShiftActions shift={shift} />
      </div>
    </div>
  );
};

/** Fila label/valor reutilizable */
const DetailRow = ({ label, value }) => (
  <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
    <span style={{ color: P2().ink3, fontSize: 12, fontWeight: 700 }}>{label}</span>
    <span style={{ color: P2().ink, fontSize: 12.5, fontWeight: 800, textAlign: "right" }}>{value}</span>
  </div>
);

// ---------------------------------------------------------------------------
// TEAMGROUP — lista simple de integrantes del equipo (sin roles)
// ---------------------------------------------------------------------------

/**
 * Muestra la lista plana de integrantes del turno agrupados por piso+tipo.
 * El usuario autenticado aparece destacado con fondo y "(tú)".
 */
const TeamGroup = ({ group }) => {
  const { integrantes = [] } = group;

  return (
    <div style={{ border: `1px solid ${P2().line}`, borderRadius: 12, background: "#fff", overflow: "hidden" }}>
      {/* Encabezado con conteo */}
      <div
        style={{
          padding: "8px 12px",
          borderBottom: `1px solid ${P2().line2}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700, color: P2().ink2 }}>
          <SGTIcon name="users" size={13} color={P2().ink2} />
          {integrantes.length} persona{integrantes.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Lista de integrantes */}
      <div style={{ padding: "4px 8px 8px" }}>
        {integrantes.map((p) => (
          <div
            key={p.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "7px 6px",
              borderRadius: 8,
              background: p.esYo ? P2().primarySoft : "transparent",
              marginTop: 2,
            }}
          >
            <SGTAvatar person={p} size={28} />
            <span
              style={{
                fontSize: 13,
                fontWeight: p.esYo ? 800 : 500,
                color: P2().ink,
                flex: 1,
              }}
            >
              {p.nombre}
              {p.esYo && (
                <span style={{ marginLeft: 6, fontSize: 11, fontWeight: 700, color: P2().primary }}>
                  (tú)
                </span>
              )}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// SHIFTACTIONS y ACTIONBTN
// ---------------------------------------------------------------------------

const ShiftActions = ({ shift }) => {
  const actions = [];
  if (shift.turnoLibre && !shift.solicitudPendiente) {
    actions.push({ id: "solicitar-turno", label: "Solicitar turno", icon: "plus", tone: "primary" });
  } else if (!shift.miTurno && !shift.solicitudPendiente) {
    actions.push({ id: "cambio", label: "Solicitar cambio", icon: "swap", tone: "primary" });
  }
  actions.push({ id: "historial", label: "Ver historial", icon: "history", tone: "ghost" });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {actions.map((a) => <ActionBtn key={a.id} {...a} />)}
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

export default AgendaView;