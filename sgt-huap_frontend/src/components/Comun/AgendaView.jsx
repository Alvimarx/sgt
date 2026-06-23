// AgendaView.jsx
// Vista principal de la agenda del funcionario.
// Muestra los turnos del servicio agrupados por día, con filtros, detalle y flujo de solicitud de cambio.

import React, { useEffect, useMemo, useState } from "react";
import { SGT_DATA } from "../Admin2/data";
import { getTurnosServicio } from "../../services/funcionarioService";
// ShiftDetail es un componente compartido con CalendarView.
// También exporta helpers de presentación usados en DayRow.
import ShiftDetail, { getTeamColor, getAgendaTeam, formatShiftLabel } from "./ShiftDetail";

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

// ---------------------------------------------------------------------------
// AGENDAVIEW — componente raíz de la vista
// Props:
//   tweaks            — ajustes visuales opcionales (ej: density)
//   user              — usuario autenticado desde AuthContext
//   onSwitchService   — navega de vuelta a selección de servicio
//   onLogout          — cierra sesión
//   onOpenNotifications — abre la bandeja de notificaciones
//   onOpenSolicitudes — abre el flujo de solicitudes, opcionalmente con preset
//   onOpenBitacora    — abre la bitácora desde el detalle de turno
// ---------------------------------------------------------------------------
const AgendaView = ({ tweaks = {}, user, onSwitchService, onLogout, onOpenNotifications, onOpenSolicitudes, onOpenBitacora }) => {
  // Filtro activo de la barra de chips ("todos", "miTurno", "cambios", etc.)
  const [filter, setFilter] = useState("miTurno");

  // Turno seleccionado para mostrar en el Sheet de detalle
  const [detailShift, setDetailShift] = useState(null);

  // Controla si el banner de alertas está colapsado
  const [bannerCollapsed, setBannerCollapsed] = useState(false);

  // Datos de agenda normalizados que llegan del servicio
  const [agendaData, setAgendaData] = useState(emptyAgendaState);
  const [loadingAgenda, setLoadingAgenda] = useState(true);
  const [agendaError, setAgendaError] = useState("");

  // Estado del flujo de solicitud de cambio de turno.
  // ownTurn: el turno propio que se ofrece.
  // targetTurn: el turno ajeno que se desea obtener.
  // targetFuncionario: el funcionario dueño del turno deseado.
  const [exchangeSelection, setExchangeSelection] = useState({
    ownTurn: null,
    targetTurn: null,
    targetFuncionario: null,
  });

  // Mensaje flotante temporal que confirma una selección en el flujo de cambio
  const [selectionToast, setSelectionToast] = useState(null);

  const PA = SGT_DATA.PALETTE;

  // Derivamos listas desde agendaData (nunca desde datos estáticos)
  const agendaDays = agendaData.weekDays || [];
  const shiftsByDay = agendaData.shiftsByDay || {};
  const todayKey = agendaData.todayKey || "";

  // Conteo de notificaciones sin leer desde el contexto global
  const { unreadCount } = useNotifications();

  // Solo jefatura y subrogante ven el aviso de turnos libres en el banner
  const canSeeFreeTurnsInBanner = user?.rol === "JEFATURA" || user?.rol === "SUBROGANTE";

  // Cantidad de turnos sin asignar en la agenda actual
  const freeTurnsCount = useMemo(
    () => (agendaData.turnos || []).filter((turno) => turno.turnoLibre).length,
    [agendaData.turnos]
  );

  // Items del banner de alertas: notificaciones sin leer + turnos libres (solo jefatura)
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

  // Helper para obtener los turnos de un día dado su key "YYYY-MM-DD"
  const getShifts = (dayKey) => shiftsByDay[dayKey] || [];

  // Muestra un toast flotante durante 2.5 segundos.
  // Cancela el timer anterior si se llama de nuevo antes de que expire.
  const showSelectionToast = (message) => {
    setSelectionToast(message);
    if (showSelectionToast.timer) clearTimeout(showSelectionToast.timer);
    showSelectionToast.timer = setTimeout(() => setSelectionToast(null), 2500);
  };

  // ---------------------------------------------------------------------------
  // FLUJO DE CAMBIO DE TURNO
  // El usuario puede iniciar un cambio desde su propio turno (caso A) o desde
  // el turno de un compañero (caso B). En ambos casos necesitamos identificar:
  //   - ownTurn: el turno que el usuario ofrece
  //   - targetTurn + targetFuncionario: el turno y funcionario receptor
  // ---------------------------------------------------------------------------

  // Callback que llega desde ShiftDetail cuando el usuario toca un integrante del equipo.
  // Determina si el miembro seleccionado es el propio usuario (isSelf) o un compañero,
  // y actualiza el estado de selección en consecuencia.
  const handleSelectTargetFuncionario = (sourceShift, targetShift) => {
    const isSelf = Boolean(targetShift?.esYo);

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
      // Si el miembro es el propio usuario, lo guardamos como el turno ofrecido
      ownTurn: isSelf ? (targetShift || sourceShift) : prev.ownTurn,
      // Si es un compañero, lo guardamos como el objetivo del intercambio
      targetTurn: isSelf ? prev.targetTurn : targetShift,
      targetFuncionario: isSelf ? prev.targetFuncionario : targetFuncionario,
    }));

    showSelectionToast(
      isSelf
        ? `Seleccionaste tu turno: ${formatShiftLabel(targetShift || sourceShift)}`
        : `Seleccionaste ${formatShiftLabel(targetShift)} de ${targetFuncionario.nombre}`
    );
  };

  // Abre el flujo de solicitud de cambio con los datos precompletados.
  // Caso A: el usuario está viendo su propio turno → lo ofrece, puede tener receptor ya seleccionado.
  // Caso B: el usuario está viendo el turno de un compañero → necesita receptor y turno objetivo.
  const handleOpenExchangeRequest = (currentShift) => {
    const ownTurn = currentShift?.miTurno ? currentShift : exchangeSelection.ownTurn;
    const targetTurn = currentShift?.miTurno ? exchangeSelection.targetTurn : currentShift;
    const targetFuncionario = exchangeSelection.targetFuncionario;

    // Caso A: el usuario tiene un turno propio seleccionado
    if (currentShift?.miTurno || exchangeSelection.ownTurn) {
      const preset = {
        tipoSolicitudId: 4,
        idTurnoPropio: (ownTurn && ownTurn.id) || currentShift?.id,
        turnoPropioLabel: formatShiftLabel(ownTurn || currentShift),
      };

      // Si además ya hay un receptor seleccionado, lo incluimos en el preset
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

    // Caso B: el usuario está viendo un turno ajeno pero no ha seleccionado receptor aún
    if (!targetTurn || !targetFuncionario) {
      showSelectionToast(
        !targetFuncionario
          ? "Selecciona el funcionario antes de continuar"
          : "Selecciona el turno objetivo para continuar"
      );
      return;
    }

    // Caso B completo: tenemos turno ajeno + receptor
    const preset = {
      tipoSolicitudId: 4,
      idTurnoDeseado: targetTurn.id,
      idTurno: targetTurn.id,
      turnoDeseadoLabel: formatShiftLabel(targetTurn),
      idReceptor: targetFuncionario.id,
      receptorLabel: targetFuncionario.nombre,
    };

    // Si el usuario también seleccionó su propio turno previamente, lo adjuntamos
    if (ownTurn) {
      preset.idTurnoPropio = ownTurn.id;
      preset.turnoPropioLabel = formatShiftLabel(ownTurn);
    }

    onOpenSolicitudes?.(preset);
  };

  // ---------------------------------------------------------------------------
  // CARGA DE DATOS
  // Se re-ejecuta si cambia el id del usuario o su servicio activo.
  // Usa un flag `mounted` para evitar actualizar estado en componentes desmontados.
  // ---------------------------------------------------------------------------
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
        setAgendaData(emptyAgendaState);
        setAgendaError(result.error || "No se pudieron cargar los turnos.");
      }

      setLoadingAgenda(false);
    };

    loadAgenda();

    return () => { mounted = false; };
  }, [user?.id, user?.userId, user?.servicioId]);

  // ---------------------------------------------------------------------------
  // CONTADORES DE FILTROS
  // Calculados con useMemo para no recorrer el mapa en cada render.
  // ---------------------------------------------------------------------------

  // Días en que el usuario tiene al menos un turno propio
  const countMisTurnos = useMemo(
    () => agendaDays.filter((day) => getShifts(day.key).some((s) => s.miTurno)).length,
    [agendaDays, shiftsByDay]
  );

  // Total de turnos con solicitud pendiente o cambio aprobado
  const countCambios = useMemo(
    () => agendaDays.reduce(
      (acc, day) => acc + getShifts(day.key).filter((s) => s.solicitudPendiente || s.cambioAprobado).length,
      0
    ),
    [agendaDays, shiftsByDay]
  );

  // Total de cupos libres en la agenda visible
  const countLibres = useMemo(
    () => agendaDays.reduce(
      (acc, day) => acc + getShifts(day.key).filter((s) => s.turnoLibre).length,
      0
    ),
    [agendaDays, shiftsByDay]
  );

  // Total de cambios ya aprobados
  const countAprobados = useMemo(
    () => agendaDays.reduce(
      (acc, day) => acc + getShifts(day.key).filter((s) => s.cambioAprobado).length,
      0
    ),
    [agendaDays, shiftsByDay]
  );

  const FILTERS = [
    { id: "todos",     label: "Todos los días" },
    { id: "miTurno",  label: "Mis turnos",  count: countMisTurnos },
    { id: "cambios",  label: "Cambios",     count: countCambios   },
    { id: "libres",   label: "Libres",      count: countLibres    },
    { id: "aprobados",label: "Aprobados",   count: countAprobados },
  ];

  // Días que pasan el filtro activo — se recalcula solo cuando cambian los datos o el filtro
  const visibleDays = useMemo(() => {
    return agendaDays.filter((day) => {
      const shifts = getShifts(day.key);
      if (filter === "todos")      return true;
      if (filter === "miTurno")    return shifts.some((s) => s.miTurno);
      if (filter === "cambios")    return shifts.some((s) => s.solicitudPendiente || s.cambioAprobado);
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
      {/* Header fijo con saludo, botón de volver al servicio, notificaciones y salida */}
      <TopHeader
        title="Agenda"
        subtitle={`Hola ${user?.nombre || "Usuario"}`}
        leftSlot={
          <button
            onClick={onSwitchService}
            style={{ background: "transparent", border: "none", padding: "4px 8px 4px 0", cursor: "pointer", display: "flex", alignItems: "center" }}
          >
            <SGTIcon name="chevron-left" size={24} color={PA.ink} />
          </button>
        }
        rightSlot={
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <IconBtn icon="tray" badge={unreadCount} onClick={onOpenNotifications} />
            <button
              onClick={onLogout}
              style={{ display: "inline-flex", alignItems: "center", gap: 6, height: 36, padding: "0 10px", borderRadius: 10, border: `1px solid ${PA.line}`, background: "#fff", color: PA.ink2, fontSize: 12, fontWeight: 800, cursor: "pointer", flexShrink: 0 }}
            >
              <SGTIcon name="close" size={15} color={PA.ink2} />
              Salir
            </button>
          </div>
        }
        dense
      />

      {/* Banner colapsable de alertas activas (notificaciones + turnos libres para jefatura) */}
      <AlertBanner
        pendientes={pendientes}
        collapsed={bannerCollapsed}
        onToggle={() => setBannerCollapsed(!bannerCollapsed)}
      />

      {/* Mensaje de error en lenguaje humano, sin detalles técnicos (Nielsen heuristic #9) */}
      {agendaError && !loadingAgenda && (
        <div style={{ margin: "8px 14px 0", padding: "10px 12px", borderRadius: 12, background: "#FFF4F5", color: "#8C3F44", border: "1px solid #F3D2D5", fontSize: 12.5, fontWeight: 700 }}>
          {agendaError}
        </div>
      )}

      {/* Barra de filtros horizontal scrolleable */}
      <div style={{ display: "flex", gap: 6, padding: "10px 14px 6px", overflowX: "auto" }}>
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            style={{
              background: filter === f.id ? PA.primary : "#fff",
              color: filter === f.id ? "#fff" : PA.ink2,
              border: `1px solid ${filter === f.id ? PA.primary : PA.line}`,
              borderRadius: 999, padding: "7px 12px", fontSize: 12.5, fontWeight: 800,
              cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 5,
              whiteSpace: "nowrap", flexShrink: 0,
            }}
          >
            {f.label}
            {/* Badge con el conteo — fondo semitransparente cuando el filtro está activo */}
            {f.count != null && (
              <span style={{ background: filter === f.id ? "rgba(255,255,255,0.22)" : PA.line2, color: filter === f.id ? "#fff" : PA.ink3, padding: "1px 6px", borderRadius: 99, fontSize: 10.5, fontWeight: 800 }}>
                {f.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Lista de días scrolleable */}
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
                // El día de hoy empieza expandido solo en vista "Todos"
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

      {/* Sheet de detalle del turno seleccionado */}
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
              // "historial" redirige a la bitácora del sistema
              if (actionId === "historial") {
                onOpenBitacora?.();
                return;
              }
              if (!onOpenSolicitudes) return;
              // "cambio" inicia el flujo de solicitud de cambio de turno
              if (actionId === "cambio") handleOpenExchangeRequest(shift);
              // "solicitar-turno" abre solicitud directa de un cupo libre
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

      {/* Toast flotante de confirmación de selección en el flujo de cambio */}
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
// DAYROW — card colapsable que representa un día de la agenda
//
// En estado colapsado muestra: fecha, turno propio (si existe) y cupos libres.
// En estado expandido muestra una tarjeta por EQUIPO (no por turno individual):
// los turnos del mismo tipo y piso se consolidan en un grupo con su representante.
// ---------------------------------------------------------------------------
const DayRow = ({ day, shifts, todayKey, defaultExpanded, onOpen, density }) => {
  const [expanded, setExpanded] = useState(!!defaultExpanded);

  const hoy = day.key === todayKey;
  const PA = SGT_DATA.PALETTE;
  const vpad = density === "compact" ? "8px 12px" : "11px 14px";

  // Turno propio del usuario en este día (para el resumen colapsado)
  const miShift = shifts.find((s) => s.miTurno) || null;
  // Turnos sin asignar en este día (para mostrar cupos disponibles)
  const libres = shifts.filter((s) => s.turnoLibre);

  // Agrupamos los turnos del día por equipo (teamGroup.key o teamKey).
  // Cada grupo tiene un representante (preferimos el turno propio si existe)
  // y la lista completa de turnos del grupo.
  const dayTeams = useMemo(() => {
    const seen = new Map();
    shifts.forEach((s) => {
      const key = s.teamKey || `solo-${s.id}`;
      if (!seen.has(key)) {
        seen.set(key, { key, group: s.teamGroup ?? null, rep: s, shifts: [] });
      }
      const entry = seen.get(key);
      entry.shifts.push(s);
      // El representante del grupo es el turno propio cuando existe,
      // así el card siempre muestra los datos más relevantes para el usuario
      if (s.miTurno) entry.rep = s;
    });
    return Array.from(seen.values());
  }, [shifts]);

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
      {/* ---- HEADER COLAPSABLE ---- */}
      <button
        onClick={() => setExpanded((e) => !e)}
        style={{ width: "100%", background: "transparent", border: "none", padding: vpad, cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: 12 }}
      >
        {/* Columna de fecha: abreviatura del día + número + "HOY" si corresponde */}
        <div style={{ minWidth: 40, textAlign: "center", color: hoy ? PA.accent : day.findesemana ? PA.ink3 : PA.ink }}>
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 0.5, textTransform: "uppercase" }}>{day.dia}</div>
          <div style={{ fontSize: 22, fontWeight: 800, lineHeight: 1, marginTop: 2 }}>{day.num}</div>
          {hoy && <div style={{ fontSize: 8, fontWeight: 800, color: PA.accent, marginTop: 2, letterSpacing: 0.4 }}>HOY</div>}
        </div>

        {/* Resumen central: muestra el turno propio o "Sin turno" + cupos libres */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {miShift ? (
            (() => {
              // Calculamos el color del equipo solo si hay turno propio
              const teamColor = getTeamColor(miShift);
              return (
                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                    {/* Chip de tipo de turno (día/noche) con color del equipo */}
                    <div style={{ padding: "3px 8px", borderRadius: 99, background: teamColor.bg, color: teamColor.ink, fontSize: 11, fontWeight: 800, display: "inline-flex", alignItems: "center", gap: 4 }}>
                      <SGTIcon name={miShift.tipo === "dia" ? "sun" : "moon"} size={11} color={teamColor.ink} />
                      {miShift.tipo === "dia" ? "Día" : "Noche"}
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 800, color: PA.ink }}>{miShift.inicio}–{miShift.fin}</span>
                    {/* Si el resumen detectó múltiples turnos propios en el día, lo indicamos */}
                    {day.resumen?.tieneMultiplesTurnos && (
                      <span style={{ fontSize: 11, color: PA.ink3, fontWeight: 700 }}>
                        +{day.resumen.misTurnos.length - 1} más
                      </span>
                    )}
                  </div>
                  {/* Badges de estado del turno */}
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                    {miShift.cambioAprobado && <SGTBadge tone="success" size="xs">✓ Aprobado</SGTBadge>}
                    {miShift.solicitudPendiente && <SGTBadge tone="warn" size="xs">Pendiente</SGTBadge>}
                  </div>
                </div>
              );
            })()
          ) : (
            // Sin turno propio: indicamos disponibilidad de cupos si los hay
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

        {/* Indicadores derecha: badge de cupos libres + chevron de expansión */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
          {/* Solo mostramos el badge de libres si el usuario ya tiene turno propio ese día */}
          {libres.length > 0 && miShift && (
            <span style={{ padding: "2px 7px", borderRadius: 99, background: PA.accentSoft, color: "#B85A60", fontSize: 10, fontWeight: 800, border: "1px solid #F3D2D5", display: "inline-flex", alignItems: "center", gap: 3 }}>
              <SGTIcon name="hand-raised" size={10} color="#B85A60" />
              {libres.length} libre
            </span>
          )}
          <SGTIcon name={expanded ? "chevron-up" : "chevron-down"} size={16} color={PA.ink3} />
        </div>
      </button>

      {/* ---- CONTENIDO EXPANDIDO ---- */}
      {expanded && (
        <div style={{ padding: "0 14px 12px", borderTop: `1px solid ${PA.line2}` }}>
          {shifts.length === 0 ? (
            <p style={{ fontSize: 12, color: PA.ink3, margin: "10px 0 0", fontWeight: 600 }}>
              No hay turnos este día.
            </p>
          ) : (
            // Una tarjeta por grupo de equipo (no por turno individual)
            dayTeams.map(({ key, group, rep, shifts: teamShifts }) => {
              const t = getTeamColor(rep);
              const team = getAgendaTeam(rep);

              // Estadísticas del grupo: cuántos puestos hay y cuántos están cubiertos
              const total = group?.totalTurnos ?? teamShifts.length;
              const asignados = group?.asignados ?? teamShifts.filter((x) => x.idFuncionario != null).length;
              const vacantes = total - asignados;
              const hayMiTurno = teamShifts.some((x) => x.miTurno);
              const inicio = group?.inicio ?? rep.inicio;
              const fin = group?.fin ?? rep.fin;

              return (
                // Al tocar la tarjeta, abrimos el Sheet de detalle con el turno representante
                <div
                  key={key}
                  onClick={() => onOpen(rep)}
                  style={{ marginTop: 10, background: t.bg, border: `1px solid ${t.soft}`, borderRadius: 10, padding: 10, cursor: "pointer" }}
                >
                  {/* Fila principal: icono + nombre del tipo de turno + horario + badges */}
                  <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: team ? 7 : 0, flexWrap: "wrap" }}>
                    <SGTIcon name={rep.tipo === "dia" ? "sun" : "moon"} size={14} color={t.ink} />
                    <span style={{ fontSize: 12.5, fontWeight: 800, color: t.ink, flex: 1, minWidth: 0 }}>
                      {rep.nombreTipoTurno || (rep.tipo === "dia" ? "Turno día" : "Turno noche")} · {inicio}–{fin}
                    </span>
                    {hayMiTurno && <SGTBadge tone="primary" size="xs">Tu turno</SGTBadge>}
                    {/* Badge de cobertura: rojo si hay vacantes, verde si está completo */}
                    <SGTBadge tone={vacantes > 0 ? "accent" : "success"} size="xs">
                      {vacantes > 0 ? `${asignados}/${total} · ${vacantes} libre` : `Completo ${asignados}/${total}`}
                    </SGTBadge>
                  </div>

                  {/* Fila del equipo: avatar del representante + avatares secundarios + "Ver detalle" */}
                  {team && (
                    <div style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,0.7)", padding: "6px 8px", borderRadius: 8 }}>
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
                      <span style={{ fontSize: 10.5, color: PA.ink3, fontWeight: 700 }}>· Ver detalle →</span>
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
