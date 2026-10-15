import React, { useEffect, useRef, useState } from "react";
import { NotificationAPI } from "../api/client.js";
import { formatDate } from "../utils/formatDate.js";

export default function NotificationDropdown() {
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const containerRef = useRef(null);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000); // refresh every 30s
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpen(false);
      }
    }

    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  function fetchNotifications() {
    NotificationAPI.list()
      .then((data) => {
        setUnreadCount(data.unread_count || 0);
        setNotifications(data.notifications || []);
      })
      .catch(() => {});
  }

  function handleMarkRead(id) {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
    NotificationAPI.markRead(id).catch(() => fetchNotifications());
  }

  function handleMarkAllRead() {
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, read_at: n.read_at || new Date().toISOString() }))
    );
    setUnreadCount(0);
    NotificationAPI.markAllRead().catch(() => fetchNotifications());
  }

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      <button
        type="button"
        className="notification-bell-btn"
        onClick={() => setOpen(!open)}
        title="Notifications"
      >
        🔔
        {unreadCount > 0 && (
          <span
            style={{
              position: "absolute",
              top: "-5px",
              right: "-5px",
              background: "#ef4444",
              color: "#fff",
              borderRadius: "50%",
              padding: "2px 6px",
              fontSize: "0.7rem",
              fontWeight: "bold",
            }}
          >
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          className="card"
          style={{
            position: "absolute",
            right: 0,
            top: "2.5rem",
            width: "320px",
            maxHeight: "400px",
            overflowY: "auto",
            zIndex: 100,
            boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)",
            padding: "1rem",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.8rem" }}>
            <h4 style={{ margin: 0 }}>Notifications</h4>
            {unreadCount > 0 && (
              <button
                type="button"
                className="notification-mark-all-btn"
                onClick={handleMarkAllRead}
              >
                Mark all read
              </button>
            )}
          </div>

          {!notifications.length && (
            <p style={{ fontSize: "0.85rem", color: "#6b7280", margin: 0 }}>No notifications available.</p>
          )}

          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {notifications.map((n) => (
              <li
                key={n.id}
                onClick={() => !n.read_at && handleMarkRead(n.id)}
                style={{
                  padding: "0.5rem 0",
                  borderBottom: "1px solid #e5e7eb",
                  cursor: n.read_at ? "default" : "pointer",
                  opacity: n.read_at ? 0.65 : 1,
                }}
              >
                <div style={{ fontWeight: "bold", fontSize: "0.85rem" }}>{n.title}</div>
                <div style={{ fontSize: "0.8rem", color: "#4b5563" }}>{n.message}</div>
                <small style={{ color: "#9ca3af", fontSize: "0.75rem" }}>{formatDate(n.created_at)}</small>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

