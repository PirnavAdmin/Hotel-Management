import { ThemeToggle } from '../common/ThemeToggle';
import React, { useState, useEffect } from "react";
import { Calendar, Clock, Utensils, Wine } from "lucide-react";
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
