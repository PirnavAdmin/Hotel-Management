import React, { useState, useEffect } from "react";
import { Calendar, Clock, Moon, Sun } from "lucide-react";
import { ProfileDropdown } from "../common/ProfileDropdown";

export function AdminHeader({
  currentSession,
  onLogout,
  onClose,
  currentTheme = "royal-saffron",
  onChangeTheme,
}) {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleToggleTheme = () => {
    const nextTheme =
      currentTheme === "light-bistro" ? "royal-saffron" : "light-bistro";
    document.documentElement.setAttribute("data-theme", nextTheme);
    try {
      localStorage.setItem("gourmet_pos_theme_v2", nextTheme);
    } catch {}
    if (onChangeTheme) {
      onChangeTheme(nextTheme);
    }
  };

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
      style={{
        padding: "0.85rem 1.75rem",
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

        {/* Circular Theme Toggle Button (Moon / Sun) */}
        <button
          onClick={handleToggleTheme}
          style={{
            width: "38px",
            height: "38px",
            borderRadius: "50%",
            background: "var(--bg-tertiary)",
            border: "1.5px solid var(--border-subtle)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            transition: "all 0.2s ease",
            boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
            flexShrink: 0,
          }}
          title={
            currentTheme === "light-bistro"
              ? "Switch to Dark Theme"
              : "Switch to Light Theme"
          }
        >
          {currentTheme === "light-bistro" ? (
            <Sun size={17} color="#ea580c" />
          ) : (
            <Moon size={17} color="#fbbf24" />
          )}
        </button>

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
