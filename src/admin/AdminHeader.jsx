import React, { useState, useEffect } from "react";
import { ChefHat, Calendar, Clock, Moon, Sun } from "lucide-react";
import { ProfileDropdown } from "../common/ProfileDropdown";

export function AdminHeader({
  currentSession,
  onLogout,
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
    if (onChangeTheme) {
      onChangeTheme(nextTheme);
    } else {
      document.documentElement.setAttribute("data-theme", nextTheme);
      try {
        localStorage.setItem("gourmet_pos_theme_v2", nextTheme);
      } catch {}
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

  return (
    <header
      style={{
        padding: "0.85rem 1.75rem",
        borderBottom: "1px solid rgba(255, 255, 255, 0.07)",
        background: "#080d1a",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "nowrap",
        gap: "1rem",
        flexShrink: 0,
        zIndex: 40,
      }}
    >
      {/* Left Brand Title with Orange Chef Hat Squircle */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.85rem",
          minWidth: 0,
        }}
      >
        <div
          style={{
            width: "44px",
            height: "44px",
            borderRadius: "12px",
            background: "linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 4px 14px rgba(245, 158, 11, 0.35)",
            flexShrink: 0,
          }}
        >
          <ChefHat size={24} color="#ffffff" strokeWidth={2.3} />
        </div>
        <div style={{ minWidth: 0 }}>
          <h1
            style={{
              fontSize: "1.2rem",
              fontWeight: 800,
              color: "#ffffff",
              lineHeight: 1.2,
              margin: 0,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            Restaurant Admin & Management Portal
          </h1>
          <p
            style={{
              fontSize: "0.78rem",
              color: "#94a3b8",
              margin: 0,
              marginTop: "2px",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            Configure menu items, dining tables, staff and operations
          </p>
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
            background: "rgba(255, 255, 255, 0.03)",
            border: "1.5px solid rgba(245, 158, 11, 0.28)",
            padding: "0.45rem 0.95rem",
            borderRadius: "10px",
            fontSize: "0.78rem",
            fontFamily: "monospace",
            whiteSpace: "nowrap",
            boxShadow: "inset 0 1px 3px rgba(0,0,0,0.2)",
          }}
        >
          <Calendar size={14} color="#f59e0b" style={{ flexShrink: 0 }} />
          <span style={{ color: "#ffffff", fontWeight: 700 }}>
            {formattedDate}
          </span>
          <span style={{ color: "#64748b", margin: "0 2px" }}>|</span>
          <span style={{ color: "#fbbf24", fontWeight: 800 }}>
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
            background: "rgba(255, 255, 255, 0.04)",
            border: "1.5px solid rgba(255, 255, 255, 0.12)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            transition: "all 0.2s ease",
            boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
            flexShrink: 0,
          }}
          title={
            currentTheme === "light-bistro"
              ? "Switch to Dark Theme"
              : "Switch to Light Theme"
          }
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(255, 255, 255, 0.08)";
            e.currentTarget.style.borderColor = "rgba(245, 158, 11, 0.4)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(255, 255, 255, 0.04)";
            e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.12)";
          }}
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
          role="admin"
        />
      </div>
    </header>
  );
}
