// ShiftDetail.jsx
// Componente compartido entre AgendaView y CalendarView.
// Muestra el detalle completo de un turno dentro de un Sheet.

import React from "react";
import { SGT_DATA } from "../Admin2/data";
import { SGTAvatar, SGTBadge, SGTIcon } from "../Style/UIPrimitives";

// ---------------------------------------------------------------------------
// HELPERS
// ---------------------------------------------------------------------------

// Color por identidad de tipo de turno (no por día/noche): cada tipo de turno (idTipoTurno)
// recibe siempre el mismo color de la paleta de equipos, consistente en Agenda, Calendario y Detalle.
const TEAM_COLOR_LIST = Object.values(SGT_DATA.TEAMS);

const colorIndexForKey = (value) => {
    const numeric = Number(value);
    if (Number.isFinite(numeric)) return Math.abs(Math.trunc(numeric)) % TEAM_COLOR_LIST.length;
    const str = String(value ?? "");
    let acc = 0;
    for (let i = 0; i < str.length; i++) acc = (acc + str.charCodeAt(i) * (i + 1)) % 997;
    return acc % TEAM_COLOR_LIST.length;
};

export const getTipoTurnoColor = (shift) => {
    const key = shift?.idTipoTurno ?? shift?.nombreTipoTurno ?? shift?.tipo ?? "sin-tipo";
    return TEAM_COLOR_LIST[colorIndexForKey(key)];
};

const buildInitials = (name = "") =>
    String(name || "?")
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((p) => p[0]?.toUpperCase() || "")
        .join("") || "?";

export const getAgendaTeam = (shift) => {
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

    return null;
};

export const formatShiftLabel = (shift) => {
    if (!shift) return "";

    const tipoLabel =
        shift.nombreTipoTurno ||
        shift.nombreTipo ||
        shift.nombre ||
        (shift.tipo === "dia" ? "Turno día" : "Turno noche");

    const fecha = shift.fecha || shift.raw?.diaInicioTurno || "";
    const inicio = shift.inicio || shift.horaInicio || shift.raw?.horaInicio || "";
    const fin = shift.fin || shift.horaFin || shift.raw?.horaFin || "";

    return `${tipoLabel} · ${fecha} ${inicio}–${fin}`.trim();
};

const P2 = () => SGT_DATA.PALETTE;

const isTurnoLibre = (shift) =>
    Boolean(shift?.turnoLibre || shift?.idFuncionario == null);

const mismoPuesto = (turno, puesto) => {
    const idTurnoPuesto = turno?.idPuesto ?? turno?.raw?.idPuesto ?? "sin-puesto";
    const idPuesto = puesto?.idPuesto ?? "sin-puesto";

    return String(idTurnoPuesto) === String(idPuesto);
};

const isSinAsignarMember = (member) => {
    const nombre = String(member?.nombre ?? "").trim().toLowerCase();
    return nombre === "sin asignar" || nombre === "sin-asignar" || nombre === "sin asignado";
};

// ---------------------------------------------------------------------------
// SHIFTDETAIL
// ---------------------------------------------------------------------------

/**
 * Contenido del Sheet de detalle de un turno.
 *
 * Props principales:
 *   shift                       turno normalizado
 *   onAction(actionId, shift)   callback para acciones
 *   exchangeSelection           estado de selección de intercambio
 *   onSelectTargetFuncionario   callback al seleccionar receptor
 *   canManageTurnAssignment     true para admin/flujo gestión asignación
 *   canAssignFreeTurn           compatibilidad con flujo antiguo
 */
const ShiftDetail = ({
    shift,
    onAction,
    exchangeSelection,
    onSelectTargetFuncionario,
    canManageTurnAssignment = false,
    canAssignFreeTurn = false,
}) => {
    if (!shift) {
        return null;
    }

    const teamColor = getTipoTurnoColor(shift);
    const fecha = shift.fecha || shift.raw?.diaInicioTurno || null;
    const turnoLibre = isTurnoLibre(shift);

    const groupData = shift.teamGroup ?? null;
    const legacyTeam = shift.team ? getAgendaTeam(shift) : null;

    const canManageAssignments = Boolean(canManageTurnAssignment || canAssignFreeTurn);
    const turnosGrupo = groupData?.turnos || [];

    const firstVacantShift =
        turnosGrupo.find(isTurnoLibre) ||
        (turnoLibre ? shift : null);

    const handleAssignVacancy = (vacantShift) => {
        if (!vacantShift || !onAction) return;
        onAction("asignar-turno-libre", vacantShift);
    };

    const handleManageAssignedTurn = (targetShift) => {
        if (!targetShift || !onAction) return;
        onAction("editar-asignacion-turno", targetShift);
    };

    const handleRequestVacancy = (vacantShift) => {
        if (!vacantShift || !onAction) return;
        onAction("solicitar-turno", vacantShift);
    };

    const totalTurnos = groupData?.totalTurnos ?? null;
    const asignados = groupData?.asignados ?? null;
    const equipoCompleto = groupData?.completo ?? false;
    const faltanPorCubrir =
        totalTurnos != null && asignados != null
            ? Math.max(totalTurnos - asignados, 0)
            : null;

    const selectedTargetTurn = exchangeSelection?.targetTurn ?? null;
    const selectedTargetFuncionario = exchangeSelection?.targetFuncionario ?? null;

    const isTargetSelection = Boolean(
        !shift.miTurno &&
        selectedTargetTurn?.id === shift.id &&
        selectedTargetFuncionario
    );

    const canRequestExchange = Boolean(
        shift.miTurno ||
        (!shift.miTurno &&
            selectedTargetTurn &&
            selectedTargetFuncionario &&
            selectedTargetTurn.id === shift.id)
    );

    const handleExchangeAction = () => {
        if (!canRequestExchange || !onAction) return;
        onAction("cambio", shift);
    };

    const handleSelectTarget = (member) => {
        const targetTurn =
            groupData?.turnos?.find((t) =>
                String(t.id) === String(member?.turnoId ?? member?.id ?? "") ||
                String(t.idFuncionario) === String(member?.id ?? "")
            ) || null;

        onSelectTargetFuncionario?.(shift, targetTurn || member);
    };

    return (
        <div
            style={{
                padding: "0 16px 20px",
                display: "flex",
                flexDirection: "column",
                gap: 14,
            }}
        >
            {/* Header con tipo y horario */}
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

                    <span
                        style={{
                            fontSize: 13,
                            fontWeight: 800,
                            color: teamColor.ink,
                            textTransform: "uppercase",
                        }}
                    >
                        {(shift.nombreTipoTurno ||
                            shift.nombreTipo ||
                            shift.nombre ||
                            (shift.tipo === "dia" ? "Turno día" : "Turno noche")) +
                            (shift.nombreRotativa || groupData?.nombreRotativa
                                ? `: ${shift.nombreRotativa || groupData.nombreRotativa}`
                                : "")}
                    </span>
                </div>

                <div style={{ fontSize: 22, fontWeight: 800, color: teamColor.ink }}>
                    {shift.inicio || "—"} – {shift.fin || "—"}
                </div>

                <div style={{ marginTop: 8, fontSize: 12.5, color: teamColor.ink }}>
                    {fecha ? `Fecha: ${fecha}` : "Fecha no disponible"}
                </div>

                {totalTurnos != null && (
                    <div
                        style={{
                            marginTop: 10,
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 6,
                            background: "rgba(255,255,255,0.7)",
                            borderRadius: 999,
                            padding: "5px 10px",
                        }}
                    >
                        <SGTIcon
                            name={equipoCompleto ? "check-circle" : "users"}
                            size={13}
                            color={teamColor.ink}
                        />

                        <span style={{ fontSize: 12, fontWeight: 800, color: teamColor.ink }}>
                            {equipoCompleto
                                ? `Equipo completo · ${asignados}/${totalTurnos}`
                                : `${asignados}/${totalTurnos} asignados · faltan ${faltanPorCubrir}`}
                        </span>
                    </div>
                )}
            </div>

            {/* Badge de selección de intercambio */}
            {selectedTargetTurn && selectedTargetFuncionario && (
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <SGTBadge tone={isTargetSelection ? "accent" : "neutral"} size="xs">
                        Receptor: {selectedTargetFuncionario.nombre} · {formatShiftLabel(selectedTargetTurn)}
                    </SGTBadge>
                </div>
            )}

            {/* Información del turno */}
            <div>
                <SectionLabel>Información del turno</SectionLabel>

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
                    <DetailRow
                        label="Estado"
                        value={
                            shift.solicitudPendiente
                                ? `Solicitud pendiente${shift.solicitudCon ? ` con ${shift.solicitudCon}` : ""}`
                                : shift.cambioAprobado
                                    ? `Cambio aprobado${shift.cambioAprobadoCon ? ` con ${shift.cambioAprobadoCon}` : ""}`
                                    : turnoLibre
                                        ? `Cupo libre${shift.motivoLibre ? ` · ${shift.motivoLibre}` : ""}`
                                        : shift.miTurno
                                            ? "Tu turno"
                                            : "Asignado"
                        }
                    />

                    {!turnoLibre && shift.nombreFuncionario && (
                        <DetailRow label="Funcionario" value={shift.nombreFuncionario} />
                    )}

                    {shift.nombrePuesto && (
                        <DetailRow label="Puesto" value={shift.nombrePuesto} />
                    )}

                    {shift.horas != null && (
                        <DetailRow label="Duración" value={`${shift.horas} horas`} />
                    )}
                </div>
            </div>

            {/* Equipo agrupado por puesto */}
            {groupData?.porPuesto?.length > 0 && (
                <div>
                    <SectionLabel>Integrantes del equipo por puesto</SectionLabel>

                    <TeamByPuesto
                        porPuesto={groupData.porPuesto}
                        turnosGrupo={turnosGrupo}
                        canManageAssignments={canManageAssignments}
                        onAssignVacancy={handleAssignVacancy}
                        onRequestVacancy={handleRequestVacancy}
                        onManageAssignedTurn={handleManageAssignedTurn}
                        onSelectMember={onSelectTargetFuncionario ? handleSelectTarget : undefined}
                        selectedMemberId={selectedTargetFuncionario?.id}
                    />
                </div>
            )}

            {/* Equipo legacy */}
            {!groupData && legacyTeam && (
                <div>
                    <SectionLabel>Integrantes del mismo puesto y tipo</SectionLabel>

                    <TeamGroup
                        group={{
                            nombrePuesto: null,
                            integrantes: [
                                legacyTeam.jefe,
                                ...(legacyTeam.urgenciologos || []),
                                ...(legacyTeam.medicos || []),
                            ].filter(Boolean),
                        }}
                        onSelectMember={onSelectTargetFuncionario ? handleSelectTarget : undefined}
                        selectedMemberId={selectedTargetFuncionario?.id}
                    />
                </div>
            )}

            {/* Acciones */}
            <div>
                <SectionLabel>Acciones</SectionLabel>

                <ShiftActions
                    shift={shift}
                    canRequestExchange={canRequestExchange}
                    canManageTurnAssignment={canManageTurnAssignment}
                    canAssignFreeTurn={canAssignFreeTurn}
                    assignableVacancyShift={firstVacantShift}
                    onAction={(actionId, currentShift) => {
                        if (actionId === "cambio") {
                            handleExchangeAction();
                            return;
                        }

                        onAction?.(actionId, currentShift);
                    }}
                />
            </div>
        </div>
    );
};

// ---------------------------------------------------------------------------
// SUB-COMPONENTES
// ---------------------------------------------------------------------------

const SectionLabel = ({ children }) => (
    <div
        style={{
            fontSize: 12,
            fontWeight: 800,
            color: P2().ink3,
            textTransform: "uppercase",
            marginBottom: 8,
        }}
    >
        {children}
    </div>
);

const DetailRow = ({ label, value }) => (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
        <span style={{ color: P2().ink3, fontSize: 12, fontWeight: 700 }}>
            {label}
        </span>

        <span
            style={{
                color: P2().ink,
                fontSize: 12.5,
                fontWeight: 800,
                textAlign: "right",
            }}
        >
            {value}
        </span>
    </div>
);

const TeamGroup = ({ group, onSelectMember, selectedMemberId = null }) => {
    const { integrantes = [] } = group;
    const visibles =
        integrantes.length > 0 && isSinAsignarMember(integrantes[0])
            ? []
            : integrantes;

    return (
        <div
            style={{
                border: `1px solid ${P2().line}`,
                borderRadius: 12,
                background: "#fff",
                overflow: "hidden",
            }}
        >
            <div
                style={{
                    padding: "8px 12px",
                    borderBottom: `1px solid ${P2().line2}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                }}
            >
                <span
                    style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        fontSize: 12,
                        fontWeight: 700,
                        color: P2().ink2,
                    }}
                >
                    <SGTIcon name="users" size={13} color={P2().ink2} />
                    {visibles.length} persona{visibles.length !== 1 ? "s" : ""}
                </span>
            </div>

            <div style={{ padding: "4px 8px 8px" }}>
                {integrantes.map((p) => (
                    <button
                        key={p.turnoId ?? p.id}
                        type="button"
                        onClick={() => onSelectMember?.(p)}
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                            padding: "7px 6px",
                            borderRadius: 8,
                            marginTop: 2,
                            background:
                                p.esYo || String(p.id) === String(selectedMemberId)
                                    ? P2().primarySoft
                                    : "transparent",
                            border: "none",
                            width: "100%",
                            textAlign: "left",
                            cursor: onSelectMember ? "pointer" : "default",
                        }}
                    >
                        <SGTAvatar person={p} size={28} />

                        <span
                            style={{
                                fontSize: 13,
                                fontWeight:
                                    p.esYo || String(p.id) === String(selectedMemberId)
                                        ? 800
                                        : 500,
                                color: P2().ink,
                                flex: 1,
                            }}
                        >
                            {p.nombre}
                            {p.esYo && (
                                <span
                                    style={{
                                        marginLeft: 6,
                                        fontSize: 11,
                                        fontWeight: 700,
                                        color: P2().primary,
                                    }}
                                >
                                    (tú)
                                </span>
                            )}
                        </span>
                    </button>
                ))}
            </div>
        </div>
    );
};

const TeamByPuesto = ({
    porPuesto = [],
    turnosGrupo = [],
    onSelectMember,
    selectedMemberId = null,
    canManageAssignments = false,
    onAssignVacancy,
    onRequestVacancy,
    onManageAssignedTurn,
}) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {porPuesto.map((puesto) => {
            const vacantesDelPuesto = turnosGrupo.filter(
                (turno) => isTurnoLibre(turno) && mismoPuesto(turno, puesto)
            );

            const cantidadVacantes = vacantesDelPuesto.length || puesto.vacantes || 0;

            return (
                <div
                    key={puesto.idPuesto ?? "sin-puesto"}
                    style={{
                        border: `1px solid ${P2().line}`,
                        borderRadius: 12,
                        background: "#fff",
                        overflow: "hidden",
                    }}
                >
                    <div
                        style={{
                            padding: "8px 12px",
                            borderBottom: `1px solid ${P2().line2}`,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: 8,
                        }}
                    >
                        <span
                            style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 6,
                                fontSize: 12.5,
                                fontWeight: 800,
                                color: P2().ink,
                            }}
                        >
                            <SGTIcon name="home" size={13} color={P2().ink2} />
                            {puesto.nombrePuesto}
                        </span>

                        {cantidadVacantes > 0 && (
                            <SGTBadge tone="accent" size="xs">
                                Falta cubrir{cantidadVacantes > 1 ? ` ×${cantidadVacantes}` : ""}
                            </SGTBadge>
                        )}
                    </div>

                    <div style={{ padding: "4px 8px 8px" }}>
                        {(puesto.integrantes || []).map((p) => {
                            const turnoAsociado = turnosGrupo.find((turno) => {
                                const mismoTurno =
                                    p.turnoId != null &&
                                    String(turno?.id) === String(p.turnoId);

                                const mismoFuncionarioYPuesto =
                                    p.id != null &&
                                    String(turno?.idFuncionario) === String(p.id) &&
                                    mismoPuesto(turno, puesto);

                                return !isTurnoLibre(turno) && (mismoTurno || mismoFuncionarioYPuesto);
                            });

                            const puedeGestionarEsteIntegrante =
                                canManageAssignments && Boolean(turnoAsociado);

                            const estaSeleccionado =
                                p.esYo || String(p.id) === String(selectedMemberId);

                            return (
                                <button
                                    key={p.turnoId ?? p.id}
                                    type="button"
                                    onClick={() => {
                                        if (puedeGestionarEsteIntegrante) {
                                            onManageAssignedTurn?.(turnoAsociado);
                                            return;
                                        }

                                        onSelectMember?.(p);
                                    }}
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 10,
                                        padding: "7px 6px",
                                        borderRadius: 8,
                                        marginTop: 2,
                                        background: puedeGestionarEsteIntegrante
                                            ? P2().primarySoft
                                            : estaSeleccionado
                                                ? P2().primarySoft
                                                : "transparent",
                                        border: puedeGestionarEsteIntegrante
                                            ? `1px solid ${P2().line2}`
                                            : "none",
                                        width: "100%",
                                        textAlign: "left",
                                        cursor: puedeGestionarEsteIntegrante || onSelectMember
                                            ? "pointer"
                                            : "default",
                                    }}
                                >
                                    <SGTAvatar person={p} size={28} />

                                    <span
                                        style={{
                                            fontSize: 13,
                                            fontWeight: puedeGestionarEsteIntegrante || estaSeleccionado ? 800 : 500,
                                            color: P2().ink,
                                            flex: 1,
                                        }}
                                    >
                                        {p.nombre}
                                        {p.esYo && (
                                            <span
                                                style={{
                                                    marginLeft: 6,
                                                    fontSize: 11,
                                                    fontWeight: 700,
                                                    color: P2().primary,
                                                }}
                                            >
                                                (tú)
                                            </span>
                                        )}
                                    </span>

                                    {puedeGestionarEsteIntegrante && (
                                        <span
                                            style={{
                                                display: "inline-flex",
                                                alignItems: "center",
                                                gap: 4,
                                                fontSize: 11,
                                                fontWeight: 800,
                                                color: P2().primary,
                                            }}
                                        >
                                            Editar
                                            <SGTIcon name="chevron-right" size={12} color={P2().primary} />
                                        </span>
                                    )}
                                </button>
                            );
                        })}

                        {vacantesDelPuesto.length > 0 ? (
                            vacantesDelPuesto.map((vacante, i) => (
                                <button
                                    key={`vacante-${vacante.id ?? i}`}
                                    type="button"
                                    onClick={() => {
                                        if (canManageAssignments) {
                                            onAssignVacancy?.(vacante);
                                        } else {
                                            onRequestVacancy?.(vacante);
                                        }
                                    }}
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 10,
                                        padding: "8px 6px",
                                        borderRadius: 8,
                                        marginTop: 4,
                                        border: canManageAssignments
                                            ? `1px dashed ${P2().primary}`
                                            : `1px dashed ${P2().accent}`,
                                        background: canManageAssignments
                                            ? P2().primarySoft
                                            : P2().accentSoft,
                                        width: "100%",
                                        textAlign: "left",
                                        cursor: "pointer",
                                    }}
                                >
                                    <div
                                        style={{
                                            width: 28,
                                            height: 28,
                                            borderRadius: 99,
                                            border: `1.5px dashed ${
                                                canManageAssignments ? P2().primary : P2().accent
                                            }`,
                                            display: "grid",
                                            placeItems: "center",
                                            flexShrink: 0,
                                        }}
                                    >
                                        <SGTIcon
                                            name={canManageAssignments ? "user-plus" : "hand-raised"}
                                            size={13}
                                            color={canManageAssignments ? P2().primary : "#B85A60"}
                                        />
                                    </div>

                                    <span
                                        style={{
                                            fontSize: 12.5,
                                            fontWeight: 800,
                                            color: canManageAssignments ? P2().primary : "#B85A60",
                                            flex: 1,
                                        }}
                                    >
                                        {canManageAssignments
                                            ? "Asignar funcionario a este cupo"
                                            : "Cupo libre — tocar para solicitar"}
                                    </span>

                                    <SGTIcon
                                        name="chevron-right"
                                        size={13}
                                        color={canManageAssignments ? P2().primary : "#B85A60"}
                                    />
                                </button>
                            ))
                        ) : (
                            Array.from({ length: puesto.vacantes || 0 }).map((_, i) => (
                                <div
                                    key={`vacante-${puesto.idPuesto ?? "sin-puesto"}-${i}`}
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 10,
                                        padding: "7px 6px",
                                        borderRadius: 8,
                                        marginTop: 2,
                                    }}
                                >
                                    <div
                                        style={{
                                            width: 28,
                                            height: 28,
                                            borderRadius: 99,
                                            border: `1.5px dashed ${P2().line}`,
                                            display: "grid",
                                            placeItems: "center",
                                        }}
                                    >
                                        <SGTIcon
                                            name="hand-raised"
                                            size={13}
                                            color={P2().ink3}
                                        />
                                    </div>

                                    <span
                                        style={{
                                            fontSize: 12.5,
                                            fontWeight: 700,
                                            color: P2().ink3,
                                            flex: 1,
                                            fontStyle: "italic",
                                        }}
                                    >
                                        Cupo libre — falta cubrir
                                    </span>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            );
        })}
    </div>
);

const ShiftActions = ({
    shift,
    onAction,
    canRequestExchange = false,
    canManageTurnAssignment = false,
    canAssignFreeTurn = false,
    assignableVacancyShift = null,
}) => {
    const actions = [];
    const turnoLibre = isTurnoLibre(shift);

    const canManageAssignments = Boolean(canManageTurnAssignment || canAssignFreeTurn);

    if (!shift?.solicitudPendiente) {
        if (canManageAssignments && turnoLibre) {
            actions.push({
                id: "asignar-turno-libre",
                label: "Asignar funcionario",
                icon: "user-plus",
                tone: "primary",
                targetShift: shift,
            });
        }

        if (turnoLibre) {
            actions.push({
                id: "solicitar-turno",
                label: "Solicitar turno",
                icon: "plus",
                tone: canManageAssignments ? "ghost" : "primary",
                targetShift: shift,
            });
        }

        if (!turnoLibre && !canManageAssignments) {
            actions.push({
                id: "cambio",
                label: canRequestExchange ? "Solicitar cambio" : "Selecciona receptor y su turno",
                icon: "swap",
                tone: canRequestExchange ? "primary" : "ghost",
                disabled: !canRequestExchange,
                targetShift: shift,
            });
        }

        if (!turnoLibre && canManageAssignments && canRequestExchange) {
            actions.push({
                id: "cambio",
                label: "Solicitar cambio",
                icon: "swap",
                tone: "ghost",
                disabled: false,
                targetShift: shift,
            });
        }
    }

    actions.push({
        id: "historial",
        label: "Ver historial",
        icon: "history",
        tone: "ghost",
        targetShift: shift,
    });

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {actions.map((a) => (
                <ActionBtn
                    key={`${a.id}-${a.targetShift?.id ?? "actual"}`}
                    {...a}
                    onClick={() => onAction?.(a.id, a.targetShift || shift)}
                />
            ))}
        </div>
    );
};

const ActionBtn = ({ label, icon, tone = "primary", onClick, disabled = false }) => {
    const tones = {
        primary: { bg: P2().primary, ink: "#fff", bd: P2().primary },
        ghost: { bg: "#fff", ink: P2().ink, bd: P2().line },
        danger: { bg: "#FFF4F5", ink: "#B42318", bd: "#FDA29B" },
    };

    const t = tones[tone] || tones.primary;

    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                background: t.bg,
                color: disabled ? P2().ink3 : t.ink,
                border: `1px solid ${disabled ? P2().line2 : t.bd}`,
                padding: "12px 14px",
                borderRadius: 12,
                fontSize: 14,
                fontWeight: 700,
                cursor: disabled ? "not-allowed" : "pointer",
                textAlign: "left",
                opacity: disabled ? 0.7 : 1,
                width: "100%",
            }}
        >
            <SGTIcon name={icon} size={17} color={disabled ? P2().ink3 : t.ink} />

            <span style={{ flex: 1 }}>{label}</span>

            <SGTIcon
                name="chevron-right"
                size={14}
                color={disabled ? P2().ink3 : t.ink}
                strokeWidth={2.4}
            />
        </button>
    );
};

export default ShiftDetail;
