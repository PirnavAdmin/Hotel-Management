import { ThemeToggle } from '../common/ThemeToggle';
import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Calendar, Clock, Utensils, Wine, Bell, ChefHat, CheckCircle2, Trash2, CheckCheck, Menu, X } from "lucide-react";
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
  onToggleSidebar,
  isSidebarOpen = false,
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
  const [dropdownCoords, setDropdownCoords] = useState(null);
  const notifRef = useRef(null);

  // Keep dropdown securely positioned in front of viewport and within visible screen bounds
  useEffect(() => {
    if (isNotifOpen && notifRef.current) {
      const updatePosition = () => {
        if (!notifRef.current) return;
        const rect = notifRef.current.getBoundingClientRect();
        const width = Math.min(340, window.innerWidth - 24);

        let left = rect.right - width;
        if (left < 12) {
          left = Math.max(12, rect.left);
        }
        if (left + width > window.innerWidth - 12) {
          left = Math.max(12, window.innerWidth - width - 12);
        }

        setDropdownCoords({
          top: rect.bottom + 8,
          left,
          width,
        });
      };

      updatePosition();
      window.addEventListener("resize", updatePosition);
      window.addEventListener("scroll", updatePosition);
      return () => {
        window.removeEventListener("resize", updatePosition);
        window.removeEventListener("scroll", updatePosition);
      };
    }
  }, [isNotifOpen]);

  // Listen to kitchen notifications
  useEffect(() => {
    const syncNotifsFromStorage = () => {
      try {
        const saved = localStorage.getItem("avsr_kitchen_notifications");
        const parsed = saved ? JSON.parse(saved) : [];
        if (Array.isArray(parsed)) setNotifications(parsed);
      } catch {
        setNotifications([]);
      }
    };

    const handleStorage = (e) => {
      if (e.key === "avsr_kitchen_notifications") {
        try {
          const parsed = e.newValue ? JSON.parse(e.newValue) : [];
          if (Array.isArray(parsed)) setNotifications(parsed);
          else setNotifications([]);
        } catch {
          setNotifications([]);
        }
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

    const handleCleared = () => {
      setNotifications([]);
      setActiveToast(null);
    };

    const handleReadAll = () => {
      setNotifications((prev) => (Array.isArray(prev) ? prev.map((n) => ({ ...n, read: true })) : []));
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener("focus", syncNotifsFromStorage);
    window.addEventListener("avsr-kitchen-alert", handleCustomAlert);
    window.addEventListener("avsr-kitchen-notifications-cleared", handleCleared);
    window.addEventListener("avsr-kitchen-notifications-read-all", handleReadAll);

    // Click outside to close notification panel
    const handleClickOutside = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setIsNotifOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("focus", syncNotifsFromStorage);
      window.removeEventListener("avsr-kitchen-alert", handleCustomAlert);
      window.removeEventListener("avsr-kitchen-notifications-cleared", handleCleared);
      window.removeEventListener("avsr-kitchen-notifications-read-all", handleReadAll);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleClearAll = () => {
    setNotifications([]);
    setActiveToast(null);
    try {
      localStorage.setItem("avsr_kitchen_notifications", "[]");
      localStorage.removeItem("avsr_latest_kitchen_alert");
    } catch {}
    window.dispatchEvent(new CustomEvent("avsr-kitchen-notifications-cleared"));
    window.dispatchEvent(new Event("storage"));
  };

  const handleMarkAllRead = () => {
    setNotifications((prev) => {
      const updated = (Array.isArray(prev) ? prev : []).map((n) => ({ ...n, read: true }));
      try {
        localStorage.setItem("avsr_kitchen_notifications", JSON.stringify(updated));
      } catch {}
      return updated;
    });
    window.dispatchEvent(new CustomEvent("avsr-kitchen-notifications-read-all"));
    window.dispatchEvent(new Event("storage"));
  };

  const handleMarkSingleRead = (notifId) => {
    setNotifications((prev) => {
      const updated = (Array.isArray(prev) ? prev : []).map((n) =>
        String(n.id) === String(notifId) ? { ...n, read: true } : n
      );
      try {
        localStorage.setItem("avsr_kitchen_notifications", JSON.stringify(updated));
      } catch {}
      return updated;
    });
    window.dispatchEvent(new Event("storage"));
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

  const unreadNotifications = (Array.isArray(notifications) ? notifications : []).filter((n) => !n.read);
  const unreadCount = unreadNotifications.length;

  return (
    <header
      className={`admin-header no-print${showModeToggle ? " has-mode-toggle" : ""}`}
      style={{
        height: "76px",
        minHeight: "76px",
        boxSizing: "border-box",
        padding: "0 1.75rem",
        borderBottom: "1px solid var(--border-subtle)",
        background: "var(--bg-secondary)",
        display: "grid",
        gridTemplateColumns: "minmax(0, 1fr) auto minmax(0, 1fr)",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "nowrap",
        gap: "1rem",
        flexShrink: 0,
        zIndex: 100,
        position: "relative",
        overflow: "visible",
      }}
    >
      {/* ── RESTAURANT THEME BACKGROUND ANIMATION ── */}
      <div
        className="restaurant-header-bg-animation"
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          overflow: "hidden",
          zIndex: 0,
          userSelect: "none",
        }}
      >
        <style>{`
          @keyframes culinaryAmbientFlow {
            0% { transform: translateX(-4%) scaleY(1); opacity: 0.55; }
            50% { transform: translateX(4%) scaleY(1.12); opacity: 0.85; }
            100% { transform: translateX(-4%) scaleY(1); opacity: 0.55; }
          }
          @keyframes culinaryFloatA {
            0% { transform: translateY(0px) rotate(0deg); opacity: 0.50; filter: drop-shadow(0 0 4px rgba(245, 158, 11, 0.35)); }
            50% { transform: translateY(-8px) rotate(4deg); opacity: 0.85; filter: drop-shadow(0 0 10px rgba(245, 158, 11, 0.65)); }
            100% { transform: translateY(0px) rotate(0deg); opacity: 0.50; filter: drop-shadow(0 0 4px rgba(245, 158, 11, 0.35)); }
          }
          @keyframes culinaryFloatB {
            0% { transform: translateY(0px) rotate(0deg); opacity: 0.45; filter: drop-shadow(0 0 4px rgba(251, 191, 36, 0.35)); }
            50% { transform: translateY(-9px) rotate(-4deg); opacity: 0.80; filter: drop-shadow(0 0 10px rgba(251, 191, 36, 0.65)); }
            100% { transform: translateY(0px) rotate(0deg); opacity: 0.45; filter: drop-shadow(0 0 4px rgba(251, 191, 36, 0.35)); }
          }
          @keyframes steamWispRiseA {
            0% { transform: translateY(4px) scale(0.9); opacity: 0; }
            25% { opacity: 0.70; filter: drop-shadow(0 0 4px rgba(251, 191, 36, 0.6)); }
            65% { opacity: 0.50; filter: drop-shadow(0 0 6px rgba(251, 191, 36, 0.4)); }
            100% { transform: translateY(-16px) scale(1.2); opacity: 0; }
          }
          @keyframes steamWispRiseB {
            0% { transform: translateY(4px) scale(0.85); opacity: 0; }
            25% { opacity: 0.65; filter: drop-shadow(0 0 4px rgba(245, 158, 11, 0.6)); }
            65% { opacity: 0.45; filter: drop-shadow(0 0 6px rgba(245, 158, 11, 0.4)); }
            100% { transform: translateY(-18px) scale(1.25); opacity: 0; }
          }
          @keyframes culinarySparkle {
            0%, 100% { transform: scale(0.75); opacity: 0.35; filter: drop-shadow(0 0 3px rgba(251, 191, 36, 0.5)); }
            50% { transform: scale(1.35); opacity: 0.95; filter: drop-shadow(0 0 8px rgba(251, 191, 36, 0.9)); }
          }
        `}</style>

        {/* Ambient Warm Golden/Amber Culinary Glow Waves */}
        <div
          style={{
            position: "absolute",
            width: "55%",
            height: "120%",
            left: "10%",
            top: "-10%",
            background: "radial-gradient(ellipse at center, rgba(245, 158, 11, 0.22) 0%, rgba(234, 88, 12, 0.08) 50%, transparent 75%)",
            filter: "blur(20px)",
            animation: "culinaryAmbientFlow 14s ease-in-out infinite",
          }}
        />
        <div
          style={{
            position: "absolute",
            width: "50%",
            height: "120%",
            right: "8%",
            bottom: "-10%",
            background: "radial-gradient(ellipse at center, rgba(251, 191, 36, 0.20) 0%, rgba(245, 158, 11, 0.07) 55%, transparent 80%)",
            filter: "blur(22px)",
            animation: "culinaryAmbientFlow 18s ease-in-out infinite reverse",
          }}
        />

        {/* Floating Culinary Motif: Cloche Serving Dome */}
        <div
          style={{
            position: "absolute",
            left: "17%",
            top: "22px",
            color: "#fbbf24",
            animation: "culinaryFloatA 12s ease-in-out infinite",
          }}
        >
          <svg width="34" height="26" viewBox="0 0 24 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 4a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z" />
            <path d="M3 15a9 9 0 0 1 18 0H3z" />
            <path d="M2 17h20" />
          </svg>
        </div>

        {/* Rising Gourmet Steam Wisp 1 */}
        <div
          style={{
            position: "absolute",
            left: "19%",
            top: "5px",
            color: "#fde68a",
            animation: "steamWispRiseA 4.2s ease-out infinite",
          }}
        >
          <svg width="16" height="24" viewBox="0 0 24 36" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <path d="M8 32c4-6 0-10 4-16s-2-8 2-14" />
          </svg>
        </div>

        {/* Floating Culinary Motif: Crossed Cutlery / Utensils */}
        <div
          style={{
            position: "absolute",
            left: "32%",
            top: "24px",
            color: "#f59e0b",
            animation: "culinaryFloatB 11s ease-in-out infinite 1.5s",
          }}
        >
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 2v6a3 3 0 0 1-3 3 3 3 0 0 1-3-3V2" />
            <path d="M15 2v18" />
            <path d="M5 2h4a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5V2z" />
            <path d="M7 13v9" />
          </svg>
        </div>

        {/* Floating Culinary Motif: Chef Hat */}
        <div
          style={{
            position: "absolute",
            left: "48%",
            top: "22px",
            color: "#fbbf24",
            animation: "culinaryFloatA 13s ease-in-out infinite 0.7s",
          }}
        >
          <svg width="28" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 13.87A4 4 0 0 1 7.41 6a5.11 5.11 0 0 1 1.05-1.54 5 5 0 0 1 7.08 0A5.11 5.11 0 0 1 16.59 6 4 4 0 0 1 18 13.87V21H6Z" />
            <line x1="6" y1="17" x2="18" y2="17" />
          </svg>
        </div>

        {/* Floating Culinary Motif: Coffee / Beverage Cup */}
        <div
          style={{
            position: "absolute",
            left: "63%",
            top: "25px",
            color: "#f59e0b",
            animation: "culinaryFloatB 10.5s ease-in-out infinite 2s",
          }}
        >
          <svg width="26" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 8h1a4 4 0 1 1 0 8h-1" />
            <path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z" />
          </svg>
        </div>

        {/* Rising Gourmet Steam Wisp 2 */}
        <div
          style={{
            position: "absolute",
            left: "65%",
            top: "7px",
            color: "#fde68a",
            animation: "steamWispRiseB 4.8s ease-out infinite 1.8s",
          }}
        >
          <svg width="16" height="24" viewBox="0 0 24 36" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <path d="M8 32c4-6 0-10 4-16s-2-8 2-14" />
          </svg>
        </div>

        {/* Floating Culinary Motif: Wine / Beverage Goblet */}
        <div
          style={{
            position: "absolute",
            left: "77%",
            top: "23px",
            color: "#fbbf24",
            animation: "culinaryFloatA 14s ease-in-out infinite 2.5s",
          }}
        >
          <svg width="24" height="25" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 22h8" />
            <path d="M12 15v7" />
            <path d="m19 3-7 8-7-8Z" />
          </svg>
        </div>

        {/* Subtle Culinary Garnish Sparkles */}
        <div style={{ position: "absolute", left: "10%", top: "32px", color: "#fde047", animation: "culinarySparkle 3.5s ease-in-out infinite" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.4 7.4L22 12l-7.6 2.6L12 22l-2.4-7.4L2 12l7.6-2.6z"/></svg>
        </div>
        <div style={{ position: "absolute", left: "26%", top: "16px", color: "#fbbf24", animation: "culinarySparkle 4.2s ease-in-out infinite 1s" }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.4 7.4L22 12l-7.6 2.6L12 22l-2.4-7.4L2 12l7.6-2.6z"/></svg>
        </div>
        <div style={{ position: "absolute", left: "41%", top: "36px", color: "#fde047", animation: "culinarySparkle 3.8s ease-in-out infinite 1.7s" }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.4 7.4L22 12l-7.6 2.6L12 22l-2.4-7.4L2 12l7.6-2.6z"/></svg>
        </div>
        <div style={{ position: "absolute", left: "56%", top: "14px", color: "#fbbf24", animation: "culinarySparkle 4.6s ease-in-out infinite 0.5s" }}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.4 7.4L22 12l-7.6 2.6L12 22l-2.4-7.4L2 12l7.6-2.6z"/></svg>
        </div>
        <div style={{ position: "absolute", left: "71%", top: "34px", color: "#fde047", animation: "culinarySparkle 3.9s ease-in-out infinite 2.2s" }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.4 7.4L22 12l-7.6 2.6L12 22l-2.4-7.4L2 12l7.6-2.6z"/></svg>
        </div>
        <div style={{ position: "absolute", left: "85%", top: "18px", color: "#fbbf24", animation: "culinarySparkle 4.1s ease-in-out infinite 1.2s" }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.4 7.4L22 12l-7.6 2.6L12 22l-2.4-7.4L2 12l7.6-2.6z"/></svg>
        </div>
      </div>

      {/* Restaurant title */}
      <div
        className="admin-header-left"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 0,
          minWidth: 0,
          position: "relative",
          zIndex: 2,
        }}
      >
        <button
          type="button"
          className="admin-mobile-menu-toggle"
          onClick={onToggleSidebar}
          aria-label={isSidebarOpen ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={isSidebarOpen}
        >
          {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
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

      {/* Dine vs Bar Mode Toggle (or spacer to maintain 3-column grid) */}
      {showModeToggle ? (
        <div
          className="admin-header-center"
          style={{
            display: "inline-flex",
            alignItems: "center",
            background: "var(--bg-tertiary)",
            border: "1.5px solid var(--border-subtle)",
            borderRadius: "30px",
            padding: "3px",
            gap: "4px",
            boxShadow: "inset 0 1px 3px rgba(0,0,0,0.12)",
            position: "relative",
            zIndex: 2,
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
      ) : (
        <div className="admin-header-spacer" aria-hidden="true" style={{ gridColumn: 2 }} />
      )}

      {/* Right Controls Row (Date/Time, Theme Toggle, Profile Avatar) */}
      <div
        className="admin-header-right"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.85rem",
          flexShrink: 0,
          marginLeft: "auto",
          justifyContent: "flex-end",
          gridColumn: 3,
          position: "relative",
          zIndex: 2,
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
              color: unreadCount > 0 ? "var(--accent-amber)" : "var(--text-muted)",
              transition: "all 0.15s ease",
            }}
            title="Kitchen KOT Notifications"
          >
            <Bell size={17} />
            {unreadCount > 0 && (
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
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>

          {/* Notifications Dropdown Panel - Portaled to document.body to guarantee 100% topmost layer */}
          {isNotifOpen && typeof document !== "undefined" && createPortal(
            <div
              style={{
                position: "fixed",
                top: dropdownCoords ? `${dropdownCoords.top}px` : "76px",
                left: dropdownCoords ? `${dropdownCoords.left}px` : "auto",
                right: dropdownCoords ? "auto" : "20px",
                width: dropdownCoords ? `${dropdownCoords.width}px` : "340px",
                maxWidth: "calc(100vw - 24px)",
                maxHeight: "420px",
                background: "var(--bg-secondary)",
                border: "1px solid var(--border-card)",
                borderRadius: "14px",
                boxShadow: "0 20px 50px rgba(0,0,0,0.7), 0 0 20px rgba(245, 158, 11, 0.2)",
                zIndex: 9999999,
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
                animation: "fadeIn 0.15s ease",
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
                    Kitchen Live Alerts
                  </span>
                  {unreadCount > 0 && (
                    <span
                      style={{
                        background: "rgba(245, 158, 11, 0.2)",
                        color: "var(--accent-amber-light)",
                        border: "1px solid rgba(245, 158, 11, 0.4)",
                        padding: "1px 6px",
                        borderRadius: "10px",
                        fontSize: "0.66rem",
                        fontWeight: 800,
                      }}
                    >
                      {unreadCount} new
                    </span>
                  )}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  {unreadCount > 0 && (
                    <button
                      type="button"
                      onClick={handleMarkAllRead}
                      style={{
                        background: "rgba(16, 185, 129, 0.12)",
                        border: "1px solid rgba(16, 185, 129, 0.35)",
                        color: "var(--success)",
                        fontSize: "0.72rem",
                        fontWeight: 800,
                        padding: "2px 7px",
                        borderRadius: "6px",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "3px",
                      }}
                      title="Mark all notifications as read"
                    >
                      <CheckCheck size={12} /> Mark Read
                    </button>
                  )}
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
                      title="Clear all alerts"
                    >
                      <Trash2 size={12} /> Clear
                    </button>
                  )}
                </div>
              </div>

              <div style={{ overflowY: "auto", flex: 1, maxHeight: "340px", padding: "0.5rem" }}>
                {notifications.length === 0 ? (
                  <div style={{ padding: "2rem 1rem", textAlign: "center", color: "var(--text-muted)", fontSize: "0.78rem" }}>
                    No kitchen alerts right now. When chef accepts or prepares dishes, live updates appear here.
                  </div>
                ) : (
                  notifications.map((n, idx) => {
                    const isUnread = !n.read;
                    return (
                      <div
                        key={n.id || idx}
                        onClick={() => handleMarkSingleRead(n.id)}
                        style={{
                          padding: "0.65rem 0.75rem",
                          borderRadius: "8px",
                          background: isUnread ? "rgba(245, 158, 11, 0.08)" : "var(--bg-tertiary)",
                          border: isUnread ? "1px solid rgba(245, 158, 11, 0.3)" : "1px solid var(--border-subtle)",
                          marginBottom: "0.45rem",
                          display: "flex",
                          flexDirection: "column",
                          gap: "2px",
                          cursor: "pointer",
                          opacity: isUnread ? 1 : 0.65,
                          transition: "all 0.15s ease",
                        }}
                        title={isUnread ? "Click to mark as read" : undefined}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                            {isUnread && (
                              <span
                                style={{
                                  width: "6px",
                                  height: "6px",
                                  borderRadius: "50%",
                                  background: "#f59e0b",
                                  display: "inline-block",
                                }}
                              />
                            )}
                            <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-main)" }}>
                              {n.title || n.tableName || "Kitchen Alert"}
                            </span>
                          </div>
                          <span style={{ fontSize: "0.68rem", color: "var(--text-dim)" }}>
                            {n.timestamp || "Just now"}
                          </span>
                        </div>
                        <div style={{ fontSize: "0.74rem", color: "var(--text-muted)", lineHeight: 1.3 }}>
                          {n.message}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>,
            document.body
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
