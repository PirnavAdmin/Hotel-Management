import React, { useState } from "react";
import {
  ChefHat,
  LayoutDashboard,
  Utensils,
  Armchair,
  Users,
  Package,
  FileText,
  BarChart3,
  ShieldCheck,
  Settings,
  ChevronRight,
  ArrowLeft,
  LogOut,
} from "lucide-react";

export function AdminSidebar({
  activeTab,
  setActiveTab,
  currentSession,
  onClose,
  onLogout,
  menuCount = 0,
  tablesCount = 0,
  staffCount = 0,
  activeKOTCount = 0,
}) {
  const [showProfileMenu, setShowProfileMenu] = useState(false);

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
          label: "Menu Items",
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
          icon: FileText,
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

  const adminName =
    currentSession?.name ||
    currentSession?.username ||
    "PirnavAdmin";
  const adminRole =
    currentSession?.role === "admin"
      ? "Admin"
      : currentSession?.role || "Admin";

  return (
    <aside
      style={{
        width: "250px",
        minWidth: "250px",
        maxWidth: "250px",
        height: "100%",
        background: "#0b111e",
        borderRight: "1px solid rgba(255, 255, 255, 0.08)",
        display: "flex",
        flexDirection: "column",
        padding: "1.25rem 0.95rem",
        boxSizing: "border-box",
        userSelect: "none",
        position: "relative",
        zIndex: 50,
      }}
    >
      {/* Brand Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
          padding: "0.25rem 0.5rem 1.25rem 0.5rem",
          borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
        }}
      >
        <div
          style={{
            width: "40px",
            height: "40px",
            borderRadius: "10px",
            background: "linear-gradient(135deg, #f97316 0%, #ea580c 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 4px 14px rgba(234, 88, 12, 0.45)",
            flexShrink: 0,
          }}
        >
          <ChefHat size={22} color="#ffffff" strokeWidth={2.3} />
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
            <span style={{ color: "#ffffff", letterSpacing: "0.2px" }}>
              AVSR{" "}
            </span>
            <span
              style={{
                color: "#f59e0b",
                letterSpacing: "0.2px",
                fontWeight: 900,
              }}
            >
              FOOD COURT
            </span>
          </div>
          <div
            style={{
              fontSize: "0.72rem",
              color: "#64748b",
              fontWeight: 500,
              marginTop: "2px",
              whiteSpace: "nowrap",
            }}
          >
            Restaurant Management
          </div>
        </div>
      </div>

      {/* Navigation Sections */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          marginTop: "0.85rem",
          paddingRight: "4px",
          display: "flex",
          flexDirection: "column",
          gap: "1.1rem",
        }}
      >
        {navSections.map((section) => (
          <div key={section.title}>
            <div
              style={{
                fontSize: "0.68rem",
                fontWeight: 700,
                color: "#64748b",
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
                const IconComponent = item.icon;
                const isActive = activeTab === item.id;

                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.75rem",
                      padding: "0.65rem 0.85rem",
                      borderRadius: "10px",
                      border: "none",
                      outline: "none",
                      cursor: "pointer",
                      fontSize: "0.85rem",
                      fontWeight: isActive ? 700 : 500,
                      textAlign: "left",
                      transition: "all 0.15s ease",
                      background: isActive
                        ? "linear-gradient(90deg, #f59e0b 0%, #ea580c 100%)"
                        : "transparent",
                      color: isActive ? "#ffffff" : "#94a3b8",
                      boxShadow: isActive
                        ? "0 4px 14px rgba(245, 158, 11, 0.38)"
                        : "none",
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.background =
                          "rgba(255, 255, 255, 0.05)";
                        e.currentTarget.style.color = "#ffffff";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.background = "transparent";
                        e.currentTarget.style.color = "#94a3b8";
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
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
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
                            : "#ea580c",
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

                    {/* Active chevron indicator matching design */}
                    {isActive && (
                      <ChevronRight
                        size={16}
                        color="#ffffff"
                        strokeWidth={2.5}
                        style={{ flexShrink: 0, marginLeft: "auto" }}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Return to POS Quick Link Button */}
      {onClose && (
        <button
          onClick={onClose}
          style={{
            margin: "0.75rem 0 0.5rem 0",
            padding: "0.55rem 0.85rem",
            background: "rgba(255, 255, 255, 0.04)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: "9px",
            color: "#94a3b8",
            fontSize: "0.78rem",
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.45rem",
            cursor: "pointer",
            transition: "all 0.15s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(255, 255, 255, 0.08)";
            e.currentTarget.style.color = "#ffffff";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(255, 255, 255, 0.04)";
            e.currentTarget.style.color = "#94a3b8";
          }}
          title="Return to dining tables & order floor"
        >
          <ArrowLeft size={14} />
          <span>Go to User POS</span>
        </button>
      )}

      {/* Bottom Profile Card */}
      <div style={{ position: "relative" }}>
        <div
          onClick={() => setShowProfileMenu((prev) => !prev)}
          style={{
            background: "rgba(255, 255, 255, 0.03)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: "13px",
            padding: "0.55rem 0.75rem",
            display: "flex",
            alignItems: "center",
            gap: "0.65rem",
            cursor: "pointer",
            transition: "all 0.15s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(255, 255, 255, 0.06)";
            e.currentTarget.style.borderColor = "rgba(245, 158, 11, 0.3)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(255, 255, 255, 0.03)";
            e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.08)";
          }}
        >
          {/* Avatar with active green dot */}
          <div style={{ position: "relative", flexShrink: 0 }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "50%",
                background: "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#ffffff",
                fontWeight: 800,
                fontSize: "0.95rem",
                boxShadow: "0 2px 8px rgba(99, 102, 241, 0.4)",
              }}
            >
              {adminName.charAt(0).toUpperCase()}
            </div>
            {/* Green Online Dot */}
            <div
              style={{
                position: "absolute",
                bottom: "-1px",
                right: "-1px",
                width: "10px",
                height: "10px",
                borderRadius: "50%",
                background: "#10b981",
                border: "2px solid #0b111e",
              }}
            />
          </div>

          {/* Name & Role */}
          <div style={{ minWidth: 0, flex: 1, overflow: "hidden" }}>
            <div
              style={{
                fontSize: "0.82rem",
                fontWeight: 700,
                color: "#ffffff",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                lineHeight: 1.2,
              }}
            >
              {adminName}
            </div>
            <div
              style={{
                fontSize: "0.7rem",
                color: "#64748b",
                fontWeight: 500,
              }}
            >
              {adminRole}
            </div>
          </div>

          <ChevronRight size={15} color="#64748b" style={{ flexShrink: 0 }} />
        </div>

        {/* Profile Popover Menu */}
        {showProfileMenu && (
          <div
            style={{
              position: "absolute",
              bottom: "110%",
              left: 0,
              right: 0,
              background: "#111827",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              borderRadius: "10px",
              padding: "0.5rem",
              boxShadow: "0 10px 25px rgba(0,0,0,0.5)",
              zIndex: 100,
              display: "flex",
              flexDirection: "column",
              gap: "4px",
            }}
          >
            {onClose && (
              <button
                onClick={() => {
                  setShowProfileMenu(false);
                  onClose();
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  padding: "0.5rem 0.65rem",
                  background: "transparent",
                  border: "none",
                  borderRadius: "6px",
                  color: "#e2e8f0",
                  fontSize: "0.78rem",
                  cursor: "pointer",
                  textAlign: "left",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background =
                    "rgba(255, 255, 255, 0.08)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "transparent")
                }
              >
                <ArrowLeft size={14} color="#f59e0b" />
                <span>Return to POS Floor</span>
              </button>
            )}

            {onLogout && (
              <button
                onClick={() => {
                  setShowProfileMenu(false);
                  onLogout();
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  padding: "0.5rem 0.65rem",
                  background: "transparent",
                  border: "none",
                  borderRadius: "6px",
                  color: "#ef4444",
                  fontSize: "0.78rem",
                  cursor: "pointer",
                  textAlign: "left",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background =
                    "rgba(239, 68, 68, 0.12)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "transparent")
                }
              >
                <LogOut size={14} color="#ef4444" />
                <span>Logout Session</span>
              </button>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
