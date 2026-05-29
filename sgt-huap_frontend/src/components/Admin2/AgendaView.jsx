// AgendaView.jsx
import React, { useEffect, useMemo, useState } from "react";
import { SGT_DATA } from "./data";
import { getTurnosServicio } from "../../services/funcionarioService";
import ShiftDetail, { getTeamColor, getAgendaTeam, formatShiftLabel } from "./ShiftDetail";

import {
  AlertBanner,
  IconBtn,
  SGTAvatar,
  SGTBadge,
  SGTIcon,
  Sheet,
  TopHeader,
} from "./UIPrimitives";
import { useNotifications } from "../../context/NotificationContext";

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

const AgendaView = ({ tweaks = {}, user, onSwitchService, onLogout, onOpenNotifications, onOpenSolicitudes, onOpenBitacora }) => {
  const [filter, setFilter] = useState("miTurno");
  const [detailShift, setDetailShift] = useState(null);
  const [bannerCollapsed, setBannerCollapsed] = useState(false);
  const [agendaData, setAgendaData] = useState(() => buildAgendaFallback());
  const [loadingAgenda, setLoadingAgenda] = useState(true);
  const [agendaError, setAgendaError] = useState("");
  const [exchangeSelection, setExchangeSelection] = useState({ ownTurn: null, targetTurn: null, targetFuncionario: null });
  const [selectionToast, setSelectionToast] = useState(null);

  const D = SGT_DATA;
  const PA = D.PALETTE;
  const agendaDays = agendaData.weekDays || D.WEEK_DAYS || [];
  const shiftsByDay = agendaData.shiftsByDay || D.SHIFTS_BY_DAY || {};
  const todayKey = agendaData.todayKey || D.TODAY_KEY;
  const { unreadCount } = useNotifications();

  const canSeeFreeTurnsInBanner = user?.rol === "JEFATURA" || user?.rol === "SUBROGANTE";

  const freeTurnsCount = useMemo(
    () => (agendaData.turnos || []).filter((turno) => turno.turnoLibre).length,
    [agendaData.turnos]
  );

  const pendientes = useMemo(() => {
    const items = [];

    if (unreadCount > 0) {
      items.push({
        id: "notificaciones-sin-leer",
        tipo: "notificacion",
        titulo: `${unreadCount} notificacion${unreadCount > 1 ? "es" : ""} sin leer`,
        sub: "Revisa tu bandeja",
        urgencia: "info",
      });
    }

    if (canSeeFreeTurnsInBanner && freeTurnsCount > 0) {
      items.push({
        id: "turnos-libres",
        tipo: "turno_libre",
        titulo: `${freeTurnsCount} turno${freeTurnsCount > 1 ? "s" : ""} libre${freeTurnsCount > 1 ? "s" : ""} en agenda`,
        sub: "Revisa y asigna los cupos disponibles",
        urgencia: "baja",
      });
    }

    return items;
  }, [unreadCount, canSeeFreeTurnsInBanner, freeTurnsCount]);

  const getShifts = (dayKey) => shiftsByDay[dayKey] || [];

  const showSelectionToast = (message) => {
    setSelectionToast(message);
    if (showSelectionToast.timer) {
      clearTimeout(showSelectionToast.timer);
    }
    showSelectionToast.timer = setTimeout(() => setSelectionToast(null), 2600);
  };

  const handleSelectTargetFuncionario = (sourceShift, targetShift) => {
    const isSelf = Boolean(targetShift?.miTurno || targetShift?.esYo);

    const targetFuncionario = {
      id: targetShift?.idFuncionario ?? targetShift?.raw?.idFuncionario ?? targetShift?.id ?? null,
      nombre: targetShift?.nombreFuncionario || targetShift?.raw?.nombreFuncionario || targetShift?.nombre || "Funcionario",
    };

    setExchangeSelection((prev) => ({
      ...prev,
      // if the selected item corresponds to the current user (own turno), store it as ownTurn
      ownTurn: isSelf ? (targetShift || sourceShift) : prev.ownTurn,
      // otherwise store as the receptor/target
      targetTurn: isSelf ? prev.targetTurn : targetShift,
      targetFuncionario: isSelf ? prev.targetFuncionario : targetFuncionario,
    }));

    showSelectionToast(
      isSelf
        ? `Seleccionaste tu turno: ${formatShiftLabel(targetShift || sourceShift)}`
        : `Seleccionaste ${formatShiftLabel(targetShift)} de ${targetFuncionario.nombre}`
    );
  };

  const handleOpenExchangeRequest = (currentShift) => {
    const ownTurn = currentShift?.miTurno ? currentShift : exchangeSelection.ownTurn;
    const targetTurn = currentShift?.miTurno ? exchangeSelection.targetTurn : currentShift;
    const targetFuncionario = exchangeSelection.targetFuncionario;

    // If we're viewing our own turno (or user explicitly selected their own turno),
    // allow opening the create-solicitud flow prefilled with the offered turno (idTurnoPropio),
    // and include receptor info only if present.
    if (currentShift?.miTurno || exchangeSelection.ownTurn) {
      const preset = {
        tipoSolicitudId: 4,
        idTurnoPropio: (ownTurn && ownTurn.id) || currentShift?.id,
        turnoPropioLabel: formatShiftLabel(ownTurn || currentShift),
      };

      if (targetTurn && targetFuncionario) {
        preset.idTurnoDeseado = targetTurn.id;
        preset.idTurno = targetTurn.id;
        preset.turnoDeseadoLabel = formatShiftLabel(targetTurn);
        preset.idReceptor = targetFuncionario.id;
        preset.receptorLabel = targetFuncionario.nombre;
      }

      onOpenSolicitudes?.(preset);
      return;
    }

    // Otherwise (viewing someone else's turno), require a receptor/target selection
    if (!targetTurn || !targetFuncionario) {
      showSelectionToast(
        !targetFuncionario
          ? "Selecciona el funcionario antes de continuar"
          : "Selecciona el turno objetivo para continuar"
      );
      return;
    }

    const preset = {
      tipoSolicitudId: 4,
      idTurnoDeseado: targetTurn.id,
      idTurno: targetTurn.id,
      turnoDeseadoLabel: formatShiftLabel(targetTurn),
      idReceptor: targetFuncionario.id,
      receptorLabel: targetFuncionario.nombre,
    };

    if (ownTurn) {
      preset.idTurnoPropio = ownTurn.id;
      preset.turnoPropioLabel = formatShiftLabel(ownTurn);
    }

    onOpenSolicitudes?.(preset);
  };

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
        {detailShift && (
          <ShiftDetail
            shift={detailShift}
            exchangeSelection={exchangeSelection}
            onSelectTargetFuncionario={handleSelectTargetFuncionario}
            onAction={(actionId, shift) => {
              if (actionId === "historial") {
                onOpenBitacora?.();
                return;
              }

              if (!onOpenSolicitudes) return;

              if (actionId === "cambio") {
                handleOpenExchangeRequest(shift);
              }

              if (actionId === "solicitar-turno") {
                onOpenSolicitudes({
                  tipoSolicitudId: 3,
                  idTurno: shift.id,
                  turnoLabel: formatShiftLabel(shift),
                });
              }
            }}
          />
        )}
      </Sheet>

      {selectionToast && (
        <div style={{ position: "absolute", left: 14, right: 14, bottom: 76, zIndex: 110, display: "flex", justifyContent: "center", pointerEvents: "none" }}>
          <div style={{ background: "rgba(23,65,108,0.96)", color: "#fff", borderRadius: 999, padding: "10px 14px", fontSize: 12.5, fontWeight: 700, boxShadow: "0 10px 24px rgba(15,23,42,0.18)", maxWidth: "100%", textAlign: "center" }}>
            {selectionToast}
          </div>
        </div>
      )}
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
                        · Ver detalle →
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

export default AgendaView;