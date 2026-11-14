import { ThemeToggle } from '../common/ThemeToggle';
import React, { useState, useEffect, useRef } from "react";
import { Calendar, Clock, Utensils, Wine, Bell, ChefHat, CheckCircle2, Trash2 } from "lucide-react";
import { ProfileDropdown } from "../common/ProfileDropdown";

export function AdminHeader({
  currentSession,
  onLogout,
  onClose,
  currentTheme = "royal-saffron",
  onChangeTheme,
  activeMode = "dine",
  onModeChange,
  showModeToggle = true,
}) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [notifications, setNotifications] = useState(() => {
    try {
      const saved = localStorage.getItem("avsr_kitchen_notifications");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [activeToast, setActiveToast] = useState(null);
  const notifRef = useRef(null);

  // Listen to kitchen notifications
  useEffect(() => {
    const handleStorage = (e) => {
      if (e.key === "avsr_kitchen_notifications" && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) setNotifications(parsed);
        } catch {}
      } else if (e.key === "avsr_latest_kitchen_alert" && e.newValue) {
        try {
          const alertObj = JSON.parse(e.newValue);
          if (alertObj) {
            setActiveToast(alertObj);
            setTimeout(() => setActiveToast(null), 5500);
          }
        } catch {}
      }
    };

    const handleCustomAlert = (e) => {
      if (e.detail) {
        setActiveToast(e.detail);
        setTimeout(() => setActiveToast(null), 5500);
      }
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener("avsr-kitchen-alert", handleCustomAlert);

    // Click outside to close notification panel
    const handleClickOutside = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setIsNotifOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("avsr-kitchen-alert", handleCustomAlert);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleClearAll = () => {
    setNotifications([]);
    try {
      localStorage.removeItem("avsr_kitchen_notifications");
    } catch {}
  };

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formattedDate = currentTime.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  const formattedTime = currentTime.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
  const hour = currentTime.getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const userName = String(currentSession?.name || currentSession?.username || "Admin").trim();

  return (
    <header
      className="admin-header no-print"
      style={{
        height: "76px",
        minHeight: "76px",
        boxSizing: "border-box",
        padding: "0 1.75rem",
        borderBottom: "1px solid var(--border-subtle)",
        background: "var(--bg-secondary)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "nowrap",
        gap: "1rem",
        flexShrink: 0,
        zIndex: 40,
      }}
    >
      {/* Restaurant title */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 0,
          minWidth: 0,
        }}
      >
        <div style={{ minWidth: 0 }}>
          <h1
            style={{
              fontSize: "1.2rem",
              fontWeight: 800,
              color: "var(--text-main)",
              lineHeight: 1.2,
              margin: 0,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {greeting}, {userName}
          </h1>
        </div>
      </div>

      {/* Dine vs Bar Mode Toggle */}
      {showModeToggle && (
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            background: "var(--bg-tertiary)",
            border: "1.5px solid var(--border-subtle)",
            borderRadius: "30px",
            padding: "3px",
            gap: "4px",
            boxShadow: "inset 0 1px 3px rgba(0,0,0,0.12)",
          }}
        >
          <button
            onClick={() => onModeChange?.("dine")}
            aria-pressed={activeMode === "dine"}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "5px 16px",
              borderRadius: "24px",
              fontSize: "0.82rem",
              fontWeight: 700,
              cursor: "pointer",
              border: "none",
              outline: "none",
              transition: "all 0.18s ease",
              background:
                activeMode === "dine"
                  ? "linear-gradient(135deg, #f59e0b, #ea580c)"
                  : "transparent",
              color: activeMode === "dine" ? "#ffffff" : "var(--text-muted)",
              boxShadow:
                activeMode === "dine"
                  ? "0 2px 10px rgba(245, 158, 11, 0.4)"
                  : "none",
            }}
          >
            <Utensils size={14} />
            <span>Dine</span>
          </button>

          <button
            onClick={() => onModeChange?.("bar")}
            aria-pressed={activeMode === "bar"}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "5px 16px",
              borderRadius: "24px",
              fontSize: "0.82rem",
              fontWeight: 700,
              cursor: "pointer",
              border: "none",
              outline: "none",
              transition: "all 0.18s ease",
              background:
                activeMode === "bar"
                  ? "linear-gradient(135deg, #f59e0b, #ea580c)"
                  : "transparent",
              color: activeMode === "bar" ? "#ffffff" : "var(--text-muted)",
              boxShadow:
                activeMode === "bar"
                  ? "0 2px 10px rgba(245, 158, 11, 0.4)"
                  : "none",
            }}
          >
            <Wine size={14} />
            <span>Bar</span>
          </button>
        </div>
      )}

      {/* Right Controls Row (Date/Time, Theme Toggle, Profile Avatar) */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.85rem",
          flexShrink: 0,
        }}
      >
        {/* Sleek Date & Time Pill Card (Calendar Tue, 13 Oct 2026 | 11:02:12 AM) */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.55rem",
            background: "var(--bg-tertiary)",
            border: "1.5px solid var(--border-subtle)",
            padding: "0.45rem 0.95rem",
            borderRadius: "10px",
            fontSize: "0.78rem",
            fontFamily: "monospace",
            whiteSpace: "nowrap",
            boxShadow: "inset 0 1px 3px rgba(0,0,0,0.1)",
          }}
        >
          <Calendar size={14} color="#f59e0b" style={{ flexShrink: 0 }} />
          <span style={{ color: "var(--text-main)", fontWeight: 700 }}>
            {formattedDate}
          </span>
          <span style={{ color: "var(--text-dim)", margin: "0 2px" }}>|</span>
          <span style={{ color: "var(--accent-amber-light)", fontWeight: 800 }}>
            {formattedTime}
          </span>
        </div>

        {/* Kitchen KOT Real-Time Notifications Bell */}
        <div style={{ position: "relative" }} ref={notifRef}>
          <button
            type="button"
            onClick={() => setIsNotifOpen((prev) => !prev)}
            style={{
              position: "relative",
              width: "36px",
              height: "36px",
              borderRadius: "10px",
              background: "var(--bg-tertiary)",
              border: "1px solid var(--border-subtle)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: notifications.length > 0 ? "var(--accent-amber)" : "var(--text-muted)",
              transition: "all 0.15s ease",
            }}
            title="Kitchen KOT Notifications"
          >
            <Bell size={17} />
            {notifications.length > 0 && (
              <span
                style={{
                  position: "absolute",
                  top: "-4px",
                  right: "-4px",
                  background: "#ef4444",
                  color: "#ffffff",
                  fontSize: "0.65rem",
                  fontWeight: 800,
                  borderRadius: "10px",
                  minWidth: "16px",
                  height: "16px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "0 3px",
                  boxShadow: "0 0 6px rgba(239, 68, 68, 0.6)",
                }}
              >
                {notifications.length}
              </span>
            )}
          </button>

          {/* Notifications Dropdown Panel */}
          {isNotifOpen && (
            <div
              style={{
                position: "absolute",
                top: "calc(100% + 8px)",
                right: 0,
                width: "320px",
                maxHeight: "420px",
                background: "var(--bg-secondary)",
                border: "1px solid var(--border-card)",
                borderRadius: "14px",
                boxShadow: "0 10px 30px rgba(0,0,0,0.4)",
                zIndex: 1000,
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  padding: "0.75rem 1rem",
                  borderBottom: "1px solid var(--border-subtle)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  background: "var(--bg-tertiary)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <ChefHat size={15} color="#f59e0b" />
                  <span style={{ fontSize: "0.82rem", fontWeight: 800, color: "var(--text-main)" }}>
                    Kitchen Live Alerts ({notifications.length})
                  </span>
                </div>
                {notifications.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearAll}
                    style={{
                      background: "transparent",
                      border: "none",
                      color: "var(--text-dim)",
                      fontSize: "0.72rem",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "3px",
                    }}
                  >
                    <Trash2 size={12} /> Clear
                  </button>
                )}
              </div>

              <div style={{ overflowY: "auto", flex: 1, maxHeight: "340px", padding: "0.5rem" }}>
                {notifications.length === 0 ? (
                  <div style={{ padding: "2rem 1rem", textAlign: "center", color: "var(--text-muted)", fontSize: "0.78rem" }}>
                    No kitchen alerts right now. When chef accepts or prepares dishes, live updates appear here.
                  </div>
                ) : (
                  notifications.map((n, idx) => (
                    <div
                      key={n.id || idx}
                      style={{
                        padding: "0.65rem 0.75rem",
                        borderRadius: "8px",
                        background: idx === 0 ? "rgba(245, 158, 11, 0.08)" : "var(--bg-tertiary)",
                        border: "1px solid var(--border-subtle)",
                        marginBottom: "0.45rem",
                        display: "flex",
                        flexDirection: "column",
                        gap: "2px",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-main)" }}>
                          {n.title || n.tableName || "Kitchen Alert"}
                        </span>
                        <span style={{ fontSize: "0.68rem", color: "var(--text-dim)" }}>
                          {n.timestamp || "Just now"}
                        </span>
                      </div>
                      <div style={{ fontSize: "0.74rem", color: "var(--text-muted)", lineHeight: 1.3 }}>
                        {n.message}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Live Floating Toast Alert in Admin Header */}
        {activeToast && (
          <div
            style={{
              position: "fixed",
              top: "84px",
              right: "24px",
              zIndex: 99999,
              background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
              border: "1.5px solid #f59e0b",
              borderRadius: "12px",
              padding: "0.75rem 1rem",
              boxShadow: "0 8px 25px rgba(0,0,0,0.5)",
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              gap: "10px",
              maxWidth: "360px",
              animation: "fadeIn 0.25s ease-out",
            }}
          >
            <div
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "8px",
                background: "rgba(245, 158, 11, 0.2)",
                color: "#f59e0b",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <ChefHat size={18} />
            </div>
            <div>
              <div style={{ fontSize: "0.82rem", fontWeight: 800, color: "#f59e0b" }}>
                {activeToast.title || "Kitchen Update"}
              </div>
              <div style={{ fontSize: "0.75rem", color: "#cbd5e1", marginTop: "2px" }}>
                {activeToast.message}
              </div>
            </div>
          </div>
        )}

        <ThemeToggle currentTheme={currentTheme} onChangeTheme={onChangeTheme}/>

        {/* Profile Avatar Pill & Dropdown */}
        <ProfileDropdown
          currentSession={currentSession}
          onLogout={onLogout}
          onReturnToPOS={onClose}
          role="admin"
        />
      </div>
    </header>
  );
}
