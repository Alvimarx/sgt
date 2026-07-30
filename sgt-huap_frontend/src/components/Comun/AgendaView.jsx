import React, { useEffect, useMemo, useRef, useState } from "react";
import { SGT_DATA } from "../Admin2/data";
import { getTurnosServicio } from "../../services/funcionarioService";
import ShiftDetail, { getTipoTurnoColor, getAgendaTeam, formatShiftLabel } from "../Comun/ShiftDetail";
import AsignarTurnoLibreSheet from "./AsignarTurnoLibreSheet";

import {
  AlertBanner,
  IconBtn,
  SGTAvatar,
  SGTBadge,
  SGTIcon,
  Sheet,
  TopHeader,
} from "../Style/UIPrimitives";
import { useNotifications } from "../../context/NotificationContext";

// ---------------------------------------------------------------------------
// ESTADO INICIAL
// Estado vacío que se usa antes de que la API responda y en caso de error.
// No usamos datos estáticos de fallback para evitar mostrar información falsa.
// ---------------------------------------------------------------------------
const emptyAgendaState = {
  todayKey: "",
  weekDays: [],
  shiftsByDay: {},
  turnos: [],
};

// Nombres de mes para los separadores de la lista de días (day.key = "YYYY-MM-DD").
const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

// ---------------------------------------------------------------------------
// AGENDAVIEW — componente raíz de la vista
// Props:
//   tweaks              — ajustes visuales opcionales (ej: density)
//   user                — usuario autenticado desde AuthContext
//   onSwitchService     — navega de vuelta a selección de servicio
//   onLogout            — cierra sesión
//   onOpenNotifications — abre la bandeja de notificaciones
//   onOpenSolicitudes   — abre el flujo de solicitudes, opcionalmente con preset
//   onOpenBitacora      — abre la bitácora desde el detalle de turno
// ---------------------------------------------------------------------------
const AgendaView = ({ tweaks = {}, user, onSwitchService, onLogout, onOpenNotifications, onOpenSolicitudes, onOpenBitacora }) => {
  const [filter, setFilter] = useState("miTurno");
  const [detailShift, setDetailShift] = useState(null);
  const [bannerCollapsed, setBannerCollapsed] = useState(false);
  const [agendaData, setAgendaData] = useState(emptyAgendaState);
  const [loadingAgenda, setLoadingAgenda] = useState(true);
  const [agendaError, setAgendaError] = useState("");
  const [assignShift, setAssignShift] = useState(null);
  const [refreshTick, setRefreshTick] = useState(0);
  const [exchangeSelection, setExchangeSelection] = useState({
    ownTurn: null,
    targetTurn: null,
    targetFuncionario: null,
  });
  const [selectionToast, setSelectionToast] = useState(null);
  // useRef para el timer del toast — evita el antipatrón de propiedad estática en función
  const toastTimerRef = useRef(null);

  const PA = SGT_DATA.PALETTE;
  const agendaDays = agendaData.weekDays || [];
  const shiftsByDay = agendaData.shiftsByDay || {};
  const todayKey = agendaData.todayKey || "";
  const { unreadCount } = useNotifications();

  // Validación defensiva del id de usuario — Number(undefined) = NaN (OWASP A03)
  const myUserId = (() => {
    const raw = Number(user?.id ?? user?.userId);
    return !Number.isNaN(raw) && raw > 0 ? raw : null;
  })();

  const canSeeFreeTurnsInBanner = user?.rol === "JEFATURA" || user?.rol === "SUBROGANTE";
  const canAssignFreeTurns =
    user?.rol === "JEFATURA" ||
    user?.rol === "SUBROGANTE" ||
    ["ADMIN", "ADMINISTRADOR"].includes(String(user?.rolSistema || "").toUpperCase());

  const freeTurnsCount = useMemo(
    () => (agendaData.turnos || []).filter((t) => t.turnoLibre).length,
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

  // Toast con useRef — seguro entre renders y sin memory leaks
  const showSelectionToast = (message) => {
    setSelectionToast(message);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setSelectionToast(null), 2500);
  };

  // ---------------------------------------------------------------------------
  // FLUJO DE CAMBIO DE TURNO
  // ---------------------------------------------------------------------------

  const handleSelectTargetFuncionario = (sourceShift, targetShift) => {
    const isSelf = Boolean(targetShift?.miTurno);

    if (!isSelf) {
      const targetDate = targetShift?.fecha || sourceShift?.fecha;
      const targetTipo = targetShift?.tipo || sourceShift?.tipo;
      const turnosDelDia = shiftsByDay[targetDate] || [];
      const yaTiene = turnosDelDia.some((t) => t.miTurno && t.tipo === targetTipo);
      if (yaTiene) {
        showSelectionToast("Ya tienes un turno asignado en ese horario.");
        return;
      }
    }

    const targetFuncionario = {
      id: targetShift?.idFuncionario ?? targetShift?.raw?.idFuncionario ?? targetShift?.id ?? null,
      nombre:
        targetShift?.nombreFuncionario ||
        targetShift?.raw?.nombreFuncionario ||
        targetShift?.nombre ||
        "Funcionario",
    };

    setExchangeSelection((prev) => ({
      ...prev,
      ownTurn: isSelf ? (targetShift || sourceShift) : prev.ownTurn,
      targetTurn: isSelf ? prev.targetTurn : targetShift,
      targetFuncionario: isSelf ? prev.targetFuncionario : targetFuncionario,
    }));

    showSelectionToast(
      isSelf
        ? `Turno propio: ${formatShiftLabel(targetShift || sourceShift)}`
        : `Receptor: ${targetFuncionario.nombre}`
    );
  };

  const handleOpenExchangeRequest = (currentShift) => {
    const ownTurn = currentShift?.miTurno ? currentShift : exchangeSelection.ownTurn;
    const targetTurn = currentShift?.miTurno ? exchangeSelection.targetTurn : currentShift;
    const targetFuncionario = exchangeSelection.targetFuncionario;

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

    if (!targetTurn || !targetFuncionario) {
      showSelectionToast(
        !targetFuncionario ? "Selecciona el funcionario antes de continuar" : "Selecciona el turno objetivo"
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

  const openAssignShift = (shift) => {
    if (!canAssignFreeTurns || !shift) return;
    setAssignShift(shift);
  };

  // ---------------------------------------------------------------------------
  // CARGA DE DATOS
  // ---------------------------------------------------------------------------
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoadingAgenda(true);
      setAgendaError("");
      const result = await getTurnosServicio(user?.servicioId, myUserId);
      if (!mounted) return;
      if (result.success && result.data) {
        setAgendaData(result.data);
      } else {
        setAgendaData(emptyAgendaState);
        setAgendaError(result.error || "No se pudieron cargar los turnos.");
      }
      setLoadingAgenda(false);
    };
    load();
    return () => { mounted = false; };
  }, [user?.id, user?.userId, user?.servicioId, refreshTick]);

  // Limpieza del timer al desmontar
  useEffect(() => () => { if (toastTimerRef.current) clearTimeout(toastTimerRef.current); }, []);

  // ---------------------------------------------------------------------------
  // CONTADORES DE FILTROS — sin overlap entre "pendientes" y "aprobados"
  // ---------------------------------------------------------------------------
  const countMisTurnos = useMemo(
    () => agendaDays.filter((day) => getShifts(day.key).some((s) => s.miTurno)).length,
    [agendaDays, shiftsByDay]
  );
  const countPendientes = useMemo(
    // TO DO: Lógica correcta para ver turnos pendientes
    () => agendaDays.reduce(
      (acc, day) => acc + getShifts(day.key).filter((s) => s.solicitudPendiente && !s.cambioAprobado).length, 0
    ),
    [agendaDays, shiftsByDay]
  );
  const countLibres = useMemo(
    () => agendaDays.reduce((acc, day) => acc + getShifts(day.key).filter((s) => s.turnoLibre).length, 0),
    [agendaDays, shiftsByDay]
  );
  const countAprobados = useMemo(
    () => agendaDays.reduce((acc, day) => acc + getShifts(day.key).filter((s) => s.cambioAprobado).length, 0),
    [agendaDays, shiftsByDay]
  );

  const FILTERS = [
    { id: "todos",      label: "Todos"      },
    { id: "miTurno",   label: "Mis turnos", count: countMisTurnos  },
    { id: "pendientes", label: "Pendientes", count: countPendientes },
    { id: "libres",    label: "Libres",     count: countLibres     },
    { id: "aprobados", label: "Aprobados",  count: countAprobados  },
  ];

  const visibleDays = useMemo(() => {
    return agendaDays.filter((day) => {
      const shifts = getShifts(day.key);
      if (filter === "todos")      return true;
      if (filter === "miTurno")    return shifts.some((s) => s.miTurno);
      if (filter === "pendientes") return shifts.some((s) => s.solicitudPendiente && !s.cambioAprobado);
      if (filter === "libres")     return shifts.some((s) => s.turnoLibre);
      if (filter === "aprobados")  return shifts.some((s) => s.cambioAprobado);
      return true;
    });
  }, [agendaDays, filter, shiftsByDay]);

  // ---------------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------------
  return (
    <>
      <TopHeader
        title="Agenda"
        subtitle={`Hola, ${user?.nombre || "Usuario"}`}
        leftSlot={
          <button
            className="agenda-back-button"
            onClick={onSwitchService}
            aria-label="Volver a selección de servicio"
          >
            <SGTIcon name="chevron-left" size={24} color={PA.ink} />
          </button>
        }
        rightSlot={
          <div className="agenda-header-actions">
            <IconBtn icon="tray" badge={unreadCount} onClick={onOpenNotifications} aria-label={`Notificaciones${unreadCount > 0 ? `, ${unreadCount} sin leer` : ""}`} />
            <button
              className="logout-button"
              onClick={onLogout}
              aria-label="Cerrar sesión"
            >
              <SGTIcon name="close" size={17} color={PA.ink2} />
              <span className="logout-button__label">Salir</span>
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

      {/* Error de carga — lenguaje humano, sin detalles técnicos (Nielsen #9, OWASP A09) */}
      {agendaError && !loadingAgenda && (
        <div
          role="alert"
          style={{ margin: "8px 14px 0", padding: "10px 12px", borderRadius: 12, background: PA.accentSoft, color: "#8C3F44", border: "1px solid #F3D2D5", fontSize: 12.5, fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}
        >
          <SGTIcon name="exclamation-circle" size={15} color="#8C3F44" />
          {agendaError}
        </div>
      )}

      {/* Barra de filtros — scrolleable en horizontal, sin barra visible */}
      <div
        className="agenda-filters"
        role="tablist"
        aria-label="Filtros de agenda"
      >
        {FILTERS.map((f) => (
          <button
            key={f.id}
            className={`agenda-filter ${
              filter === f.id ? "agenda-filter--active" : ""
            }`}
            role="tab"
            aria-selected={filter === f.id}
            onClick={() => setFilter(f.id)}
            style={{
              background: filter === f.id ? PA.primary : "#fff",
              color: filter === f.id ? "#fff" : PA.ink2,
              border: `1.5px solid ${
                filter === f.id ? PA.primary : PA.line
              }`,
            }}
          >
            {f.label}
            {f.count != null && f.count > 0 && (
              <span style={{
                background: filter === f.id ? "rgba(255,255,255,0.25)" : PA.line2,
                color: filter === f.id ? "#fff" : PA.ink3,
                padding: "1px 6px", borderRadius: 99, fontSize: 10.5, fontWeight: 800,
              }}>
                {f.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Lista de días */}
      <div className="agenda-days-list">
        {loadingAgenda ? (
          <div style={{ padding: 48, textAlign: "center", color: PA.ink3, fontSize: 13, fontWeight: 600 }}>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 8 }}>
              <SGTIcon name="calendar" size={22} color={PA.ink3} />
            </div>
            Cargando agenda…
          </div>
        ) : (
          <>
            {visibleDays.map((day, i) => {
              // Separador "Mayo 2026" cada vez que cambia el mes respecto al día visible anterior.
              const prev = visibleDays[i - 1];
              const cambiaMes = !prev || prev.key.slice(0, 7) !== day.key.slice(0, 7);
              return (
                <React.Fragment key={day.key}>
                  {cambiaMes && (
                    <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "14px 2px 10px" }}>
                      <span style={{ flex: 1, height: 1, background: PA.line }} aria-hidden="true" />
                      <span style={{ fontSize: 11, fontWeight: 900, letterSpacing: 1, textTransform: "uppercase", color: PA.ink2 }}>
                        {MESES[Number(day.key.slice(5, 7)) - 1]} {day.key.slice(0, 4)}
                      </span>
                      <span style={{ flex: 1, height: 1, background: PA.line }} aria-hidden="true" />
                    </div>
                  )}
                  <DayRow
                    day={day}
                    shifts={getShifts(day.key)}
                    todayKey={todayKey}
                    density={tweaks.density}
                    defaultExpanded={day.key === todayKey && filter === "todos"}
                    onOpen={(s) => setDetailShift(s)}
                  />
                </React.Fragment>
              );
            })}
            {visibleDays.length === 0 && !loadingAgenda && (
              <div style={{ padding: 48, textAlign: "center", color: PA.ink3, fontSize: 13, fontWeight: 600 }}>
                <div style={{ display: "flex", justifyContent: "center", marginBottom: 8 }}>
                  <SGTIcon name="calendar" size={22} color={PA.ink3} />
                </div>
                Sin turnos en esta categoría.
              </div>
            )}
          </>
        )}
      </div>

      {/* Sheet de detalle del turno */}
      <Sheet open={!!detailShift} onClose={() => setDetailShift(null)} title="Detalle del turno" maxHeight="88%">
        {detailShift && (
          <ShiftDetail
            shift={detailShift}
            exchangeSelection={exchangeSelection}
            currentUserId={myUserId}
            onSelectTargetFuncionario={handleSelectTargetFuncionario}
            canAssignFreeTurn={canAssignFreeTurns}
            onAction={(actionId, shift) => {
              if (actionId === "historial") {
                onOpenBitacora?.();
                return;
              }

              if (actionId === "asignar-turno-libre" || actionId === "editar-asignacion-turno") {
                openAssignShift(shift);
                return;
              }

              if (!onOpenSolicitudes) return;

              if (actionId === "cambio") {
                handleOpenExchangeRequest(shift);
                return;
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

      {/* Toast flotante — position fixed para funcionar dentro de cualquier contenedor */}
      {selectionToast && (
        <div className="agenda-toast">
          <div style={{ background: "rgba(23,65,108,0.96)", color: "#fff", borderRadius: 999, padding: "10px 16px", fontSize: 12.5, fontWeight: 700, boxShadow: "0 10px 24px rgba(15,23,42,0.2)", maxWidth: 340, textAlign: "center", animation: "sgtFade .2s ease" }}>
            {selectionToast}
          </div>
        </div>
      )}

      <AsignarTurnoLibreSheet
        open={!!assignShift}
        shift={assignShift}
        servicioId={user?.servicioId || localStorage.getItem("servicioId")}
        adminUserId={myUserId}
        onClose={() => setAssignShift(null)}
        onAssigned={() => {
          setAssignShift(null);
          setDetailShift(null);
          setRefreshTick((v) => v + 1);
        }}
      />
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
  //const vpad = density === "compact" ? "8px 12px" : "11px 14px";

  const miShift = shifts.find((s) => s.miTurno) || null;
  const libres = shifts.filter((s) => s.turnoLibre);
  const tc = miShift ? getTipoTurnoColor(miShift) : null;
  const miTeam = miShift ? getAgendaTeam(miShift) : null;
  const soloLibres = !miShift && libres.length > 0;
  const vacio = !miShift && libres.length === 0;

  const dayTeams = useMemo(() => {
    const seen = new Map();
    shifts.forEach((s) => {
      const key = s.teamKey || `solo-${s.id}`;
      if (!seen.has(key)) seen.set(key, { key, group: s.teamGroup ?? null, rep: s, shifts: [] });
      const entry = seen.get(key);
      entry.shifts.push(s);
      if (s.miTurno) entry.rep = s;
    });
    return Array.from(seen.values());
  }, [shifts]);

  return (
    <div
      className={`day-row ${hoy ? "day-row--today" : ""}`}
      style={{
        borderColor: hoy ? PA.primary : PA.line,
        borderStyle: !hoy && vacio ? "dashed" : "solid",
        borderLeftWidth: 4,
        borderLeftColor: hoy ? PA.primary : tc ? tc.ink : soloLibres ? PA.accent : PA.line,
        opacity: !hoy && vacio ? 0.75 : 1,
      }}
    >
      <button
        className={`day-header-btn ${
          density === "compact" ? "day-header-btn--compact" : ""
        }`}
        onClick={() => setExpanded((e) => !e)}
        aria-expanded={expanded}
        aria-label={`${day.dia} ${day.num}${
          hoy ? ", hoy" : ""
        }${
          miShift
            ? `, turno ${miShift.inicio}–${miShift.fin}`
            : ", sin turno"
        }`}
      >
        {/* Fecha */}
        <div
          className="day-row__date"
          style={
            !hoy && miShift ? { background: tc.bg, borderRadius: 10, padding: "4px 2px" }
            : !hoy && soloLibres ? { background: PA.accentSoft, borderRadius: 10, padding: "4px 2px" }
            : undefined
          }
        >
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 0.6, textTransform: "uppercase", color: hoy ? PA.primary : miShift ? tc.ink : soloLibres ? "#B85A60" : day.findesemana ? PA.ink3 : PA.ink2 }}>
            {day.dia}
          </div>
          <div style={{ fontSize: 24, fontWeight: 900, lineHeight: 1, marginTop: 1, color: hoy ? PA.primary : miShift ? tc.ink : soloLibres ? "#B85A60" : day.findesemana ? PA.ink3 : PA.ink }}>
            {day.num}
          </div>
          {hoy && (
            <div style={{ marginTop: 3, fontSize: 8, fontWeight: 900, color: "#fff", background: PA.primary, borderRadius: 99, padding: "1px 5px", display: "inline-block", letterSpacing: 0.5 }}>
              HOY
            </div>
          )}
        </div>

        {/* Resumen */}
        <div className="day-row__summary">
          {miShift ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                  <div style={{ padding: "3px 9px", borderRadius: 99, background: tc.bg, color: tc.ink, fontSize: 11, fontWeight: 800, display: "inline-flex", alignItems: "center", gap: 4 }}>
                    <SGTIcon name={miShift.tipo === "dia" ? "sun" : "moon"} size={11} color={tc.ink} />
                    {miShift.tipo === "dia" ? "Día" : "Noche"}
                  </div>
                  {day.resumen?.tieneMultiplesTurnos && (
                    <span style={{ fontSize: 11, color: PA.ink3, fontWeight: 700 }}>+{day.resumen.misTurnos.length - 1} más</span>
                  )}
                </div>
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                  {miShift.cambioAprobado && <SGTBadge tone="success" size="xs">✓ Aprobado</SGTBadge>}
                  {miShift.solicitudPendiente && !miShift.cambioAprobado && <SGTBadge tone="warn" size="xs">Pendiente</SGTBadge>}
                </div>
                {miTeam && (
                  <div style={{ display: "flex", alignItems: "center", gap: 6, background: PA.surface2, borderRadius: 8, padding: "4px 6px", marginTop: 1 }}>
                    <SGTAvatar person={miTeam.jefe} size={20} ring="#E9D9C2" />
                    <span style={{ fontSize: 10.5, fontWeight: 700, color: PA.ink, flex: 1, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {miTeam.jefe.nombre.split(" ").slice(0, 2).join(" ")}
                    </span>
                    <div style={{ display: "flex" }}>
                      {miTeam.urgenciologos?.slice(0, 2).map((p, i) => (
                        <div key={p.id} style={{ marginLeft: i === 0 ? 0 : -5 }}>
                          <SGTAvatar person={p} size={18} ring="#fff" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              <span style={{ fontSize: 13, color: PA.ink2, fontWeight: 700 }}>Sin turno asignado</span>
              {libres.length > 0 && (
                <span style={{ fontSize: 11.5, color: "#B85A60", fontWeight: 700 }}>
                  {libres.length} cupo{libres.length > 1 ? "s" : ""} libre disponible
                </span>
              )}
            </div>
          )}
        </div>

        {/* Indicadores */}
        <div className="day-row__indicators">
          {libres.length > 0 && miShift && (
            <span style={{ padding: "2px 7px", borderRadius: 99, background: PA.accentSoft, color: "#B85A60", fontSize: 10, fontWeight: 800, border: "1px solid #F3D2D5", display: "inline-flex", alignItems: "center", gap: 3 }}>
              <SGTIcon name="hand-raised" size={10} color="#B85A60" />
              {libres.length} libre
            </span>
          )}
          <SGTIcon name={expanded ? "chevron-up" : "chevron-down"} size={16} color={PA.ink3} />
        </div>
      </button>

      {/* Contenido expandido */}
      {expanded && (
        <div
          className="day-row__expanded"
          style={{ borderTopColor: PA.line2 }}
        >
          {shifts.length === 0 ? (
            <p style={{ fontSize: 12, color: PA.ink3, margin: "10px 0 0", fontWeight: 600 }}>No hay turnos este día.</p>
          ) : (
            dayTeams.map(({ key, group, rep, shifts: teamShifts }) => {
              const t = getTipoTurnoColor(rep);
              const team = getAgendaTeam(rep);
              const total = group?.totalTurnos ?? teamShifts.length;
              const asignados = group?.asignados ?? teamShifts.filter((x) => x.idFuncionario != null).length;
              const vacantes = total - asignados;
              const hayMiTurno = teamShifts.some((x) => x.miTurno);

              return (
                <div
                  key={key}
                  onClick={() => onOpen(rep)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === "Enter" && onOpen(rep)}
                  aria-label={`Ver detalle: ${rep.nombreTipoTurno || (rep.tipo === "dia" ? "Turno día" : "Turno noche")}`}
                  style={{ marginTop: 10, background: t.bg, border: `1.5px solid ${t.soft}`, borderRadius: 12, padding: 10, cursor: "pointer", transition: "opacity 0.15s" }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: team ? 8 : 0, flexWrap: "wrap" }}>
                    <SGTIcon name={rep.tipo === "dia" ? "sun" : "moon"} size={14} color={t.ink} />
                    <span style={{ fontSize: 12.5, fontWeight: 800, color: t.ink, flex: 1, minWidth: 0 }}>
                      {rep.nombreTipoTurno || (rep.tipo === "dia" ? "Turno día" : "Turno noche")}
                    </span>
                    {hayMiTurno && <SGTBadge tone="primary" size="xs">Tu turno</SGTBadge>}
                    <SGTBadge tone={vacantes > 0 ? "accent" : "success"} size="xs">
                      {vacantes > 0 ? `${asignados}/${total} · ${vacantes} libre` : `Completo ${asignados}/${total}`}
                    </SGTBadge>
                  </div>

                  {team && (
                    <div style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,0.72)", padding: "6px 8px", borderRadius: 8 }}>
                      <SGTAvatar person={team.jefe} size={22} ring="#E9D9C2" />
                      <span style={{ fontSize: 11.5, fontWeight: 700, color: PA.ink, flex: 1, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {team.jefe.nombre.split(" ").slice(0, 2).join(" ")}
                      </span>
                      <div style={{ display: "flex" }}>
                        {team.urgenciologos?.slice(0, 2).map((p, i) => (
                          <div key={p.id} style={{ marginLeft: i === 0 ? 0 : -5 }}>
                            <SGTAvatar person={p} size={20} ring="#fff" />
                          </div>
                        ))}
                      </div>
                      <span style={{ fontSize: 10.5, color: PA.ink3, fontWeight: 700 }}>Ver detalle →</span>
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