// NotificationView.jsx
import React, { useEffect } from "react";
import { useNotifications } from "../../context/NotificationContext";
import { SGTBadge, SGTIcon, TopHeader } from "../Style/UIPrimitives";
import { SGT_DATA } from "../Admin2/data";

const P = () => SGT_DATA.PALETTE;

const toneForNotification = (notification) => {
  if (!notification.isRead) return "accent";
  if (notification.tipo?.includes("success") || notification.tipo?.includes("ok")) return "success";
  if (notification.tipo?.includes("warn") || notification.tipo?.includes("pend")) return "warn";
  return "neutral";
};

const NotificationCard = ({ notification, onMarkAsRead, onDelete }) => {
  const unread = notification.isRead !== true;

  return (
    <div
      style={{
        background: unread ? "#fff" : P().surface2,
        border: `1px solid ${unread ? P().line : P().line2}`,
        borderRadius: 16,
        padding: 14,
        boxShadow: unread ? "0 4px 14px rgba(23,65,108,0.06)" : "none",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        <div
          style={{
            width: 38,
            height: 38,
            borderRadius: 12,
            background: unread ? P().primarySoft : P().line2,
            color: unread ? P().primary : P().ink3,
            display: "grid",
            placeItems: "center",
            flexShrink: 0,
          }}
        >
          <SGTIcon name="tray" size={18} color="currentColor" />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: P().ink }}>
              {notification.titulo || "Notificación"}
            </div>
            <SGTBadge tone={toneForNotification(notification)} size="xs">
              {unread ? "Nueva" : "Leída"}
            </SGTBadge>
          </div>

          <div style={{ marginTop: 6, fontSize: 13.5, color: P().ink2, lineHeight: 1.45 }}>
            {notification.texto}
          </div>

          <div style={{ marginTop: 8, fontSize: 11.5, color: P().ink3, fontWeight: 600 }}>
            {notification.fecha || "Fecha no disponible"}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 12, justifyContent: "flex-end" }}>
        {notification.isRead !== true && (
          <button
            onClick={() => onMarkAsRead(notification.id)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              border: `1px solid ${P().line}`,
              background: "#fff",
              color: P().ink,
              padding: "8px 11px",
              borderRadius: 10,
              cursor: "pointer",
              fontSize: 12.5,
              fontWeight: 800,
            }}
          >
            <SGTIcon name="check" size={15} color={P().primary} />
            Marcar leída
          </button>
        )}

        <button
          onClick={() => onDelete(notification.id)}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            border: `1px solid ${P().line}`,
            background: P().surface2,
            color: P().ink2,
            padding: "8px 11px",
            borderRadius: 10,
            cursor: "pointer",
            fontSize: 12.5,
            fontWeight: 800,
          }}
        >
          <SGTIcon name="close" size={15} color={P().ink2} />
          Eliminar
        </button>
      </div>
    </div>
  );
};

const NotificationView = ({ onBack }) => {
  const { notifications, unreadCount, refresh, markAsRead, deleteNotification } = useNotifications();

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const unreadItems = notifications.filter((notification) => !notification.isRead);

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", background: P().surface2 }}>
      <TopHeader
        title="Bandeja"
        subtitle={unreadCount > 0 ? `${unreadCount} sin leer` : "Todo al día"}
        leftSlot={
          <button
            onClick={onBack}
            style={{
              background: "transparent",
              border: "none",
              padding: "4px 8px 4px 0",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
            }}
          >
            <SGTIcon name="chevron-left" size={24} color={P().ink} />
          </button>
        }
        rightSlot={
          <SGTBadge tone="primary" size="sm">
            {notifications.length} total
          </SGTBadge>
        }
        dense
      />

      <div style={{ padding: "14px 14px 10px", display: "flex", gap: 8, flexWrap: "wrap" }}>
        <SGTBadge tone="accent" size="sm">{unreadCount} sin leer</SGTBadge>
        <SGTBadge tone="neutral" size="sm">{notifications.length} recibidas</SGTBadge>
      </div>

      <div style={{ flex: 1, overflow: "auto", padding: "0 14px 16px" }}>
        {notifications.length === 0 ? (
          <div
            style={{
              marginTop: 16,
              background: "#fff",
              border: `1px solid ${P().line}`,
              borderRadius: 16,
              padding: 28,
              textAlign: "center",
              color: P().ink3,
              fontSize: 13.5,
              fontWeight: 600,
            }}
          >
            No tienes notificaciones en este momento.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {unreadItems.length > 0 && (
              <div style={{ fontSize: 12, fontWeight: 800, color: P().ink3, textTransform: "uppercase", marginTop: 4 }}>
                Sin leer
              </div>
            )}
            {notifications.map((notification) => (
              <NotificationCard
                key={notification.id}
                notification={notification}
                onMarkAsRead={markAsRead}
                onDelete={deleteNotification}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationView;