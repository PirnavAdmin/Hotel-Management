import React, { useState, useEffect } from "react";
import { detectImageBgColor } from "../utils/logoHelper";
import {
  ChefHat,
  LayoutDashboard,
  Utensils,
  ShoppingBag,
  Armchair,
  Users,
  Package,
  FileText,
  BarChart3,
  CalendarDays,
  ShieldCheck,
  Settings,
  Wine,
  Beer,
  Martini,
  GlassWater,
  Sparkles,
  ReceiptText,
  Clock,
} from "lucide-react";

export const BAR_ICON_MAP = {
  Wine,
  Beer,
  Martini,
  GlassWater,
  Package,
  Armchair,
  FileText,
  Sparkles,
  Utensils,
};

export function AdminSidebar({
  activeTab,
  setActiveTab,
  currentSession,
  onClose,
  onLogout,
  menuCount = 0,
  takeawayCount = 0,
  tablesCount = 0,
  staffCount = 0,
  activeKOTCount = 0,
  restaurantLogo = "",
  restaurantName = "Restaurant",
  restaurantTagline = "",
  portalMode = "dine",
  activeBarTab = "",
  setActiveBarTab,
  onNavigate,
}) {
  const getStoredSettings = () => {
    try {
      return JSON.parse(localStorage.getItem("gourmet_pos_settings_v1") || "{}");
    } catch {
      return {};
    }
  };

  const [liveLogo, setLiveLogo] = useState(() => restaurantLogo || getStoredSettings().logo || "/restaurant-logo.png");
  const [liveLogoBg, setLiveLogoBg] = useState(() => getStoredSettings().logoBg || "");
  const [liveName, setLiveName] = useState(() => {
    const sName = getStoredSettings().restaurantName;
    if (sName && sName.trim() && sName.trim().toLowerCase() !== "restaurant" && !/bhanu|avsr/i.test(sName)) return sName.trim();
    if (restaurantName && restaurantName.trim() && restaurantName.trim().toLowerCase() !== "restaurant" && !/bhanu|avsr/i.test(restaurantName)) return restaurantName.trim();
    return "The Rustic Spin";
  });
  const [liveTagline, setLiveTagline] = useState(() => {
    const tag = getStoredSettings().tagline || restaurantTagline;
    return tag && !/bhanu/i.test(tag) ? tag : "Restaurant Management and Fine Dining";
  });

  useEffect(() => {
    if (restaurantLogo) setLiveLogo(restaurantLogo);
    else setLiveLogo(getStoredSettings().logo || "/restaurant-logo.png");

    if (restaurantName && restaurantName.trim().toLowerCase() !== "restaurant") {
      setLiveName(restaurantName.trim());
    }
    if (restaurantTagline) setLiveTagline(restaurantTagline);
  }, [restaurantLogo, restaurantName, restaurantTagline]);

  useEffect(() => {
    const handleUpdate = (e) => {
      const fresh = e?.detail || getStoredSettings();
      if (fresh?.logo) setLiveLogo(fresh.logo);
      else setLiveLogo(getStoredSettings().logo || restaurantLogo || "/restaurant-logo.png");

      if (fresh?.logoBg !== undefined) setLiveLogoBg(fresh.logoBg || "");
      else setLiveLogoBg(getStoredSettings().logoBg || "");

      if (fresh?.restaurantName && fresh.restaurantName.trim().toLowerCase() !== "restaurant") {
        setLiveName(fresh.restaurantName.trim());
      }
      if (fresh?.tagline) setLiveTagline(fresh.tagline);
    };
    window.addEventListener("storage", handleUpdate);
    window.addEventListener("restaurant-settings-updated", handleUpdate);
    window.addEventListener("avsr-settings-updated", handleUpdate);
    return () => {
      window.removeEventListener("storage", handleUpdate);
      window.removeEventListener("restaurant-settings-updated", handleUpdate);
      window.removeEventListener("avsr-settings-updated", handleUpdate);
    };
  }, [restaurantLogo, restaurantName, restaurantTagline]);
  const navSections = [
    {
      title: "MAIN MENU",
      items: [
        {
          id: "overview",
          label: "Overview",
          icon: LayoutDashboard,
        },
        {
          id: "menu",
          label: "Dine Menu",
          icon: Utensils,
          badge: menuCount,
        },
        {
          id: "tables",
          label: "Tables & Chairs",
          icon: Armchair,
          badge: tablesCount,
        },
        {
          id: "staff",
          label: "Staff & Persons",
          icon: Users,
          badge: staffCount,
        },
        {
          id: "takeaway",
          label: "Takeaway Orders",
          icon: ShoppingBag,
          badge: takeawayCount > 0 ? takeawayCount : null,
        },
        {
          id: "reservations",
          label: "Table Reservations",
          icon: CalendarDays,
        },
        {
          id: "kot",
          label: "Kitchen KOT",
          icon: ChefHat,
          badge: activeKOTCount > 0 ? activeKOTCount : null,
          badgeAlert: activeKOTCount > 0,
        },
      ],
    },
    {
      title: "OPERATIONS",
      items: [
        {
          id: "inventory",
          label: "Inventory",
          icon: Package,
        },
        {
          id: "invoices",
          label: "Invoices",
          icon: ReceiptText,
        },
        {
          id: "reports",
          label: "Reports",
          icon: BarChart3,
        },
      ],
    },
    {
      title: "MANAGEMENT",
      items: [
        {
          id: "customers",
          label: "Customers",
          icon: Users,
        },
        {
          id: "logins",
          label: "Login Management",
          icon: ShieldCheck,
        },
        {
          id: "settings",
          label: "Settings",
          icon: Settings,
        },
      ],
    },
  ];

  // ================= BAR SIDEBAR NAVIGATION =================
  const barNavSections = [
    {
      title: "MAIN MENU",
      items: [
        { id: "bar-overview", label: "Overview", icon: LayoutDashboard },
        { id: "bar-drinks", label: "Drinks Menu", icon: Wine },
        { id: "bar-tables", label: "Tables", icon: Armchair },
        { id: "bar-staff", label: "Staff & Persons", icon: Users },
        { id: "bar-kot", label: "Bar BOT", icon: ChefHat },
      ],
    },
    {
      title: "OPERATIONS",
      items: [
        { id: "bar-inventory", label: "Inventory", icon: Package },
        { id: "bar-invoices", label: "Invoices", icon: ReceiptText },
        { id: "bar-reports", label: "Reports", icon: BarChart3 },
      ],
    },
  ];

  return (
    <aside
      className="admin-sidebar no-print"
      aria-label="Application navigation"
      style={{
        width: "250px",
        minWidth: "250px",
        maxWidth: "250px",
        height: "100%",
        background: "var(--bg-secondary)",
        borderRight: "1px solid var(--border-subtle)",
        display: "flex",
        flexDirection: "column",
        padding: "0 0.95rem 1.25rem",
        boxSizing: "border-box",
        userSelect: "none",
        position: "relative",
        overflow: "hidden",
        zIndex: 50,
      }}
    >
      {/* ── RESTAURANT THEME SIDEBAR BACKGROUND ANIMATION ── */}
      <div
        className="restaurant-sidebar-bg-animation"
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
          @keyframes sidebarAmbientFlow {
            0% { transform: translateY(-6%) scale(1); opacity: 0.5; }
            50% { transform: translateY(6%) scale(1.15); opacity: 0.85; }
            100% { transform: translateY(-6%) scale(1); opacity: 0.5; }
          }
          @keyframes sidebarFloatA {
            0% { transform: translateY(0px) rotate(0deg); opacity: 0.22; filter: drop-shadow(0 0 4px color-mix(in srgb, var(--accent-amber) 35%, transparent)); }
            50% { transform: translateY(-10px) rotate(5deg); opacity: 0.45; filter: drop-shadow(0 0 10px color-mix(in srgb, var(--accent-amber) 65%, transparent)); }
            100% { transform: translateY(0px) rotate(0deg); opacity: 0.22; filter: drop-shadow(0 0 4px color-mix(in srgb, var(--accent-amber) 35%, transparent)); }
          }
          @keyframes sidebarFloatB {
            0% { transform: translateY(0px) rotate(0deg); opacity: 0.20; filter: drop-shadow(0 0 4px color-mix(in srgb, var(--accent-amber-light) 35%, transparent)); }
            50% { transform: translateY(-12px) rotate(-5deg); opacity: 0.42; filter: drop-shadow(0 0 10px color-mix(in srgb, var(--accent-amber-light) 65%, transparent)); }
            100% { transform: translateY(0px) rotate(0deg); opacity: 0.20; filter: drop-shadow(0 0 4px color-mix(in srgb, var(--accent-amber-light) 35%, transparent)); }
          }
          @keyframes sidebarSteamRise {
            0% { transform: translateY(6px) scale(0.9); opacity: 0; }
            25% { opacity: 0.45; filter: drop-shadow(0 0 4px color-mix(in srgb, var(--accent-amber-light) 60%, transparent)); }
            65% { opacity: 0.30; filter: drop-shadow(0 0 6px color-mix(in srgb, var(--accent-amber-light) 40%, transparent)); }
            100% { transform: translateY(-20px) scale(1.25); opacity: 0; }
          }
          @keyframes sidebarSparkle {
            0%, 100% { transform: scale(0.75); opacity: 0.25; filter: drop-shadow(0 0 3px color-mix(in srgb, var(--accent-amber-light) 50%, transparent)); }
            50% { transform: scale(1.3); opacity: 0.65; filter: drop-shadow(0 0 8px color-mix(in srgb, var(--accent-amber-light) 90%, transparent)); }
          }
        `}</style>

        {/* Ambient Warm Golden/Amber Glow Orbs along sidebar */}
        <div
          style={{
            position: "absolute",
            width: "280px",
            height: "280px",
            left: "-40px",
            top: "5%",
            background: "radial-gradient(circle, color-mix(in srgb, var(--accent-amber) 18%, transparent) 0%, color-mix(in srgb, var(--accent-saffron) 6%, transparent) 55%, transparent 75%)",
            filter: "blur(24px)",
            animation: "sidebarAmbientFlow 14s ease-in-out infinite",
          }}
        />
        <div
          style={{
            position: "absolute",
            width: "260px",
            height: "260px",
            right: "-50px",
            top: "45%",
            background: "radial-gradient(circle, color-mix(in srgb, var(--accent-amber-light) 16%, transparent) 0%, color-mix(in srgb, var(--accent-amber) 6%, transparent) 50%, transparent 75%)",
            filter: "blur(26px)",
            animation: "sidebarAmbientFlow 18s ease-in-out infinite reverse",
          }}
        />
        <div
          style={{
            position: "absolute",
            width: "260px",
            height: "260px",
            left: "-30px",
            bottom: "8%",
            background: "radial-gradient(circle, color-mix(in srgb, var(--accent-amber) 15%, transparent) 0%, color-mix(in srgb, var(--accent-saffron) 5%, transparent) 55%, transparent 75%)",
            filter: "blur(24px)",
            animation: "sidebarAmbientFlow 16s ease-in-out infinite 3s",
          }}
        />

        {/* Floating Culinary Motif: Cloche Serving Dome (Top area) */}
        <div
          style={{
            position: "absolute",
            right: "18px",
            top: "105px",
            color: "var(--accent-amber-light)",
            animation: "sidebarFloatA 12s ease-in-out infinite",
          }}
        >
          <svg width="28" height="22" viewBox="0 0 24 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 4a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z" />
            <path d="M3 15a9 9 0 0 1 18 0H3z" />
            <path d="M2 17h20" />
          </svg>
        </div>

        {/* Rising Gourmet Steam Wisp (Near Cloche) */}
        <div
          style={{
            position: "absolute",
            right: "26px",
            top: "85px",
            color: "#fde68a",
            animation: "sidebarSteamRise 4.5s ease-out infinite",
          }}
        >
          <svg width="14" height="22" viewBox="0 0 24 36" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M8 32c4-6 0-10 4-16s-2-8 2-14" />
          </svg>
        </div>

        {/* Floating Culinary Motif: Crossed Cutlery / Utensils (Upper Middle) */}
        <div
          style={{
            position: "absolute",
            left: "16px",
            top: "245px",
            color: "var(--accent-amber)",
            animation: "sidebarFloatB 11s ease-in-out infinite 1.5s",
          }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 2v6a3 3 0 0 1-3 3 3 3 0 0 1-3-3V2" />
            <path d="M15 2v18" />
            <path d="M5 2h4a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5V2z" />
            <path d="M7 13v9" />
          </svg>
        </div>

        {/* Floating Culinary Motif: Chef Hat (Middle area) */}
        <div
          style={{
            position: "absolute",
            right: "22px",
            top: "390px",
            color: "var(--accent-amber-light)",
            animation: "sidebarFloatA 13s ease-in-out infinite 0.7s",
          }}
        >
          <svg width="24" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 13.87A4 4 0 0 1 7.41 6a5.11 5.11 0 0 1 1.05-1.54 5 5 0 0 1 7.08 0A5.11 5.11 0 0 1 16.59 6 4 4 0 0 1 18 13.87V21H6Z" />
            <line x1="6" y1="17" x2="18" y2="17" />
          </svg>
        </div>

        {/* Floating Culinary Motif: Coffee Cup / Beverage (Lower Middle) */}
        <div
          style={{
            position: "absolute",
            left: "18px",
            top: "530px",
            color: "var(--accent-amber)",
            animation: "sidebarFloatB 10.5s ease-in-out infinite 2s",
          }}
        >
          <svg width="22" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 8h1a4 4 0 1 1 0 8h-1" />
            <path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z" />
          </svg>
        </div>

        {/* Floating Culinary Motif: Wine Goblet (Bottom area) */}
        <div
          style={{
            position: "absolute",
            right: "24px",
            bottom: "75px",
            color: "var(--accent-amber-light)",
            animation: "sidebarFloatA 14s ease-in-out infinite 2.5s",
          }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 22h8" />
            <path d="M12 15v7" />
            <path d="m19 3-7 8-7-8Z" />
          </svg>
        </div>

        {/* Subtle Culinary Garnish Sparkles */}
        <div style={{ position: "absolute", right: "45px", top: "180px", color: "#fde047", animation: "sidebarSparkle 3.8s ease-in-out infinite" }}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.4 7.4L22 12l-7.6 2.6L12 22l-2.4-7.4L2 12l7.6-2.6z"/></svg>
        </div>
        <div style={{ position: "absolute", left: "28px", top: "460px", color: "var(--accent-amber-light)", animation: "sidebarSparkle 4.4s ease-in-out infinite 1.2s" }}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.4 7.4L22 12l-7.6 2.6L12 22l-2.4-7.4L2 12l7.6-2.6z"/></svg>
        </div>
        <div style={{ position: "absolute", right: "32px", bottom: "160px", color: "var(--accent-amber)", animation: "sidebarSparkle 4s ease-in-out infinite 2s" }}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.4 7.4L22 12l-7.6 2.6L12 22l-2.4-7.4L2 12l7.6-2.6z"/></svg>
        </div>
      </div>

      {/* Brand Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
          height: "76px",
          minHeight: "76px",
          boxSizing: "border-box",
          padding: "0 0.5rem 0.1rem",
          borderBottom: "1px solid var(--border-subtle)",
          position: "relative",
          zIndex: 1,
        }}
      >
        <div
          style={{
            width: "40px",
            height: "40px",
            borderRadius: "10px",
            background: liveLogoBg || (liveLogo ? "#ffffff" : "linear-gradient(135deg, var(--accent-amber) 0%, var(--accent-saffron) 100%)"),
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: liveLogo ? "0 2px 8px rgba(0,0,0,0.25)" : "0 4px 14px color-mix(in srgb, var(--accent-saffron) 45%, transparent)",
            flexShrink: 0,
            overflow: "hidden",
            padding: "0",
            transition: "background-color 0.2s ease",
          }}
        >
          {liveLogo ? (
            <img
              src={liveLogo}
              alt={liveName || "Restaurant logo"}
              onLoad={(e) => {
                if (!liveLogoBg) {
                  const detected = detectImageBgColor(e.target);
                  if (detected && detected !== "transparent") {
                    e.target.parentElement.style.backgroundColor = detected;
                    setLiveLogoBg(detected);
                  }
                }
              }}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "contain",
                borderRadius: "8px",
                display: "block",
              }}
            />
          ) : portalMode === "bar" ? (
            <Wine size={22} color="#ffffff" strokeWidth={2.3} />
          ) : (
            <ChefHat size={22} color="#ffffff" strokeWidth={2.3} />
          )}
        </div>
        <div style={{ minWidth: 0, flex: 1, overflow: "hidden" }}>
          <div
            style={{
              fontSize: "0.88rem",
              fontWeight: 800,
              lineHeight: 1.15,
              whiteSpace: "nowrap",
            }}
          >
            <span style={{ color: "var(--text-main)", letterSpacing: "0.2px" }}>
              {liveName || "AVSR FOOD COURT"}
            </span>
          </div>
          <div
            style={{
              fontSize: "0.72rem",
              color: "var(--text-dim)",
              fontWeight: 500,
              marginTop: "2px",
              whiteSpace: "nowrap",
            }}
          >
            {portalMode === "bar"
              ? `${liveTagline || "BAR & CAFE"} \u2022 Bar`
              : liveTagline || "BAR & CAFE"}
          </div>
        </div>
      </div>

      {/* Navigation Sections */}
      <nav
        aria-label={portalMode === "bar" ? "Bar sections" : "Restaurant sections"}
        className="no-scrollbar"
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          scrollbarWidth: "none",
          msOverflowStyle: "none",
          marginTop: "0.85rem",
          display: "flex",
          flexDirection: "column",
          gap: "1.1rem",
          position: "relative",
          zIndex: 1,
        }}
      >
        {(portalMode === "bar" ? barNavSections : navSections).map(
          (section) => (
            <div key={section.title} style={{ marginBottom: "0.15rem" }}>
              <div
                style={{
                  fontSize: "0.68rem",
                  fontWeight: 700,
                  color: "var(--text-dim)",
                  letterSpacing: "1px",
                  padding: "0 0.65rem 0.45rem 0.65rem",
                  textTransform: "uppercase",
                }}
              >
                {section.title}
              </div>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.25rem",
                }}
              >
                {section.items.map((item) => {
                  const IconComponent = item.icon || Wine;
                  const isActive =
                    portalMode === "bar"
                      ? activeBarTab === item.id
                      : activeTab === item.id;

                  return (
                    <button
                      key={item.id}
                      onClick={() =>
                        {
                          portalMode === "bar"
                            ? setActiveBarTab?.(item.id)
                            : setActiveTab(item.id);
                          onNavigate?.();
                        }
                      }
                      aria-current={isActive ? "page" : undefined}
                      style={{
                        width: "100%",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.75rem",
                        padding: "0.65rem 0.85rem",
                        borderRadius: "10px",
                        border: "none",
                        cursor: "pointer",
                        fontSize: "0.85rem",
                        fontWeight: isActive ? 700 : 500,
                        textAlign: "left",
                        transition: "all 0.15s ease",
                        background: isActive
                          ? "var(--primary-gradient)"
                          : "transparent",
                        color: isActive ? "#ffffff" : "var(--text-muted)",
                        boxShadow: isActive
                          ? "0 4px 14px var(--accent-amber-glow)"
                          : "none",
                      }}
                      onMouseEnter={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.background =
                            "var(--bg-tertiary)";
                          e.currentTarget.style.color = "var(--text-main)";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.background = "transparent";
                          e.currentTarget.style.color = "var(--text-muted)";
                        }
                      }}
                    >
                      <IconComponent
                        size={18}
                        color={isActive ? "#ffffff" : "currentColor"}
                        strokeWidth={isActive ? 2.3 : 1.9}
                        style={{ flexShrink: 0 }}
                      />
                      <span
                        style={{
                          flex: 1,
                          minWidth: 0,
                          whiteSpace: "normal",
                          lineHeight: 1.25,
                          overflowWrap: "anywhere",
                        }}
                      >
                        {item.label}
                      </span>

                      {/* Optional alert badge for KOT pending orders */}
                      {item.badgeAlert && (
                        <span
                          style={{
                            background: isActive
                              ? "rgba(0,0,0,0.3)"
                              : "var(--accent-saffron)",
                            color: "#ffffff",
                            fontSize: "0.68rem",
                            fontWeight: 800,
                            padding: "1px 6px",
                            borderRadius: "10px",
                          }}
                        >
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ),
        )}
      </nav>
    </aside>
  );
}
