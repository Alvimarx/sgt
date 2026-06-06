// ShiftDetail.jsx
// Componente compartido entre AgendaView y CalendarView.
// Muestra el detalle completo de un turno dentro de un Sheet.

import React, { useState } from "react";
import { SGT_DATA } from "./data";
import { SGTAvatar, SGTBadge, SGTIcon } from "./UIPrimitives";

// ---------------------------------------------------------------------------
// HELPERS (duplicados mínimos para que este archivo sea autocontenido)
// ---------------------------------------------------------------------------

const TEAM_COLORS = [
    { bg: "#b0baee",              soft: "#D7E2FF", ink: "#183b6b" },
    { bg: "rgb(166,231,180)",     soft: "#D2E9D6", ink: "#24513A" },
    { bg: "rgb(245,223,188)",     soft: "#F5E0B7", ink: "#6B4D15" },
    { bg: "rgb(225,188,245)",     soft: "#E3D1F3", ink: "#5A3A72" },
    { bg: "rgb(248,208,223)",     soft: "#F2D1D5", ink: "#8C3F44" },
    { bg: "rgb(173,224,231)",     soft: "#CFE9F0", ink: "#2C6270" },
];

const hashStr = (value = "") => {
    let h = 0;
    const s = String(value);
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    return h;
};

export const getTeamColor = (shift) => {
    const seed =
        shift?.teamGroup?.key ||
        shift?.teamKey ||
        `${shift?.tipo || "sin-tipo"}-${shift?.idPuesto ?? shift?.raw?.idPuesto ?? "sin-puesto"}`;
    return TEAM_COLORS[hashStr(seed) % TEAM_COLORS.length];
};

const buildInitials = (name = "") =>
    name.split(/\s+/).filter(Boolean).slice(0, 2)
        .map((p) => p[0]?.toUpperCase() || "").join("") || "?";

export const getAgendaTeam = (shift) => {
    if (shift?.teamGroup?.integrantes?.length) {
        const integrantes = shift.teamGroup.integrantes;
        return { jefe: integrantes[0], integrantes, urgenciologos: integrantes.slice(1, 3), medicos: integrantes.slice(3), total: integrantes.length };
    }
    if (shift?.team) return shift.team;
    return null;
};

export const formatShiftLabel = (shift) => {
    if (!shift) return "";
    return `${shift.tipo === "dia" ? "Turno día" : "Turno noche"} · ${shift.fecha || ""} ${shift.inicio}–${shift.fin}`.trim();
};

const P2 = () => SGT_DATA.PALETTE;

// ---------------------------------------------------------------------------
// SHIFTDETAIL
// ---------------------------------------------------------------------------

/**
 * Contenido del Sheet de detalle de un turno.
 *
 * Props:
 *   shift                      — turno normalizado (salida de mapTurnoForAgenda / mapTurnoCalendario)
 *   onAction(actionId, shift)  — callback para acciones (cambio, historial, etc.)
 *   exchangeSelection          — { targetTurn, targetFuncionario } estado de selección de intercambio
 *   onSelectTargetFuncionario  — callback al seleccionar un integrante del equipo como receptor
 */
const ShiftDetail = ({ shift, onAction, exchangeSelection, onSelectTargetFuncionario }) => {
    const teamColor = getTeamColor(shift);
    const fecha = shift.fecha || shift.raw?.diaInicioTurno || null;

    const groupData = shift.teamGroup ?? null;
    const legacyTeam = shift.team ? getAgendaTeam(shift) : null;
    const selectedTargetTurn = exchangeSelection?.targetTurn ?? null;
    const selectedTargetFuncionario = exchangeSelection?.targetFuncionario ?? null;

    const isTargetSelection = Boolean(
        !shift.miTurno &&
        selectedTargetTurn?.id === shift.id &&
        selectedTargetFuncionario
    );

    const canRequestExchange = Boolean(
        shift.miTurno ||
        (!shift.miTurno && selectedTargetTurn && selectedTargetFuncionario && selectedTargetTurn.id === shift.id)
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
        <div style={{ padding: "0 16px 20px", display: "flex", flexDirection: "column", gap: 14 }}>

            {/* Header con tipo y horario */}
            <div style={{ background: teamColor.bg, border: `1px solid ${teamColor.soft}`, borderRadius: 14, padding: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                    <SGTIcon name={shift.tipo === "dia" ? "sun" : "moon"} size={18} color={teamColor.ink} />
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

            {/* Badge de selección de intercambio (si aplica) */}
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
                <div style={{ border: `1px solid ${P2().line}`, borderRadius: 12, background: "#fff", padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
                    <DetailRow label="Puesto" value={shift.nombrePuesto || shift.raw?.nombrePuesto || "Sin puesto"} />
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
                    {shift.horas != null && (
                        <DetailRow label="Duración" value={`${shift.horas} horas`} />
                    )}
                    {/* Para turnos ajenos en vista de jefatura mostramos el funcionario */}
                    {!shift.miTurno && shift.nombreFuncionario && (
                        <DetailRow label="Asignado a" value={shift.nombreFuncionario} />
                    )}
                </div>
            </div>

            {/* Equipo — datos reales de API agrupados por puesto+tipo */}
            {groupData && (
                <div>
                    <SectionLabel>Integrantes del mismo puesto y horario</SectionLabel>
                    <TeamGroup
                        group={groupData}
                        onSelectMember={onSelectTargetFuncionario ? handleSelectTarget : undefined}
                        selectedMemberId={selectedTargetFuncionario?.id}
                    />
                </div>
            )}

            {/* Equipo legacy — datos del mock */}
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
                    onAction={(actionId, currentShift) => {
                        if (actionId === "cambio") { handleExchangeAction(); return; }
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
    <div style={{ fontSize: 12, fontWeight: 800, color: P2().ink3, textTransform: "uppercase", marginBottom: 8 }}>
        {children}
    </div>
);

const DetailRow = ({ label, value }) => (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
        <span style={{ color: P2().ink3, fontSize: 12, fontWeight: 700 }}>{label}</span>
        <span style={{ color: P2().ink, fontSize: 12.5, fontWeight: 800, textAlign: "right" }}>{value}</span>
    </div>
);

const isSinAsignarMember = (member) => {
    const nombre = String(member?.nombre ?? "").trim().toLowerCase();
    return nombre === "sin asignar" || nombre === "sin-asignar" || nombre === "sin asignado";
};

const TeamGroup = ({ group, onSelectMember, selectedMemberId = null }) => {
    const { integrantes = [] } = group;
    const visibles = integrantes.length > 0 && isSinAsignarMember(integrantes[0]) ? [] : integrantes;
    return (
        <div style={{ border: `1px solid ${P2().line}`, borderRadius: 12, background: "#fff", overflow: "hidden" }}>
            <div style={{ padding: "8px 12px", borderBottom: `1px solid ${P2().line2}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700, color: P2().ink2 }}>
                    <SGTIcon name="users" size={13} color={P2().ink2} />
                    {visibles.length} persona{visibles.length !== 1 ? "s" : ""}
                </span>
            </div>
            <div style={{ padding: "4px 8px 8px" }}>
                {integrantes.map((p) => (
                    <button
                        key={p.id}
                        type="button"
                        onClick={() => onSelectMember?.(p)}
                        style={{
                            display: "flex", alignItems: "center", gap: 10,
                            padding: "7px 6px", borderRadius: 8, marginTop: 2,
                            background: p.esYo || String(p.id) === String(selectedMemberId) ? P2().primarySoft : "transparent",
                            border: "none", width: "100%", textAlign: "left",
                            cursor: onSelectMember ? "pointer" : "default",
                        }}
                    >
                        <SGTAvatar person={p} size={28} />
                        <span style={{ fontSize: 13, fontWeight: p.esYo || String(p.id) === String(selectedMemberId) ? 800 : 500, color: P2().ink, flex: 1 }}>
                            {p.nombre}
                            {p.esYo && <span style={{ marginLeft: 6, fontSize: 11, fontWeight: 700, color: P2().primary }}>(tú)</span>}
                        </span>
                    </button>
                ))}
            </div>
        </div>
    );
};

const ShiftActions = ({ shift, onAction, canRequestExchange = false }) => {
    const actions = [];
    if (shift.turnoLibre && !shift.solicitudPendiente) {
        actions.push({ id: "solicitar-turno", label: "Solicitar turno", icon: "plus", tone: "primary" });
    } else if (!shift.solicitudPendiente) {
        actions.push({
            id: "cambio",
            label: canRequestExchange ? "Solicitar cambio" : "Selecciona receptor y su turno",
            icon: "swap",
            tone: canRequestExchange ? "primary" : "ghost",
            disabled: !canRequestExchange,
        });
    }
    actions.push({ id: "historial", label: "Ver historial", icon: "history", tone: "ghost" });

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {actions.map((a) => <ActionBtn key={a.id} {...a} onClick={() => onAction?.(a.id, shift)} />)}
        </div>
    );
};

const ActionBtn = ({ label, icon, tone = "primary", onClick, disabled = false }) => {
    const tones = {
        primary: { bg: P2().primary, ink: "#fff", bd: P2().primary },
        ghost:   { bg: "#fff",       ink: P2().ink, bd: P2().line },
    };
    const t = tones[tone] || tones.primary;
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            style={{
                display: "flex", alignItems: "center", gap: 10,
                background: t.bg, color: disabled ? P2().ink3 : t.ink,
                border: `1px solid ${disabled ? P2().line2 : t.bd}`,
                padding: "12px 14px", borderRadius: 12, fontSize: 14,
                fontWeight: 700, cursor: disabled ? "not-allowed" : "pointer",
                textAlign: "left", opacity: disabled ? 0.7 : 1,
            }}
        >
            <SGTIcon name={icon} size={17} color={disabled ? P2().ink3 : t.ink} />
            <span style={{ flex: 1 }}>{label}</span>
            <SGTIcon name="chevron-right" size={14} color={disabled ? P2().ink3 : t.ink} strokeWidth={2.4} />
        </button>
    );
};

export default ShiftDetail;
