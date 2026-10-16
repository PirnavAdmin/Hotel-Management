import React from "react";
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
  restaurantLogo = "",
  restaurantName = "Restaurant",
  restaurantTagline = "",
}) {
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

  return (
    <aside
      style={{
        width: "250px",
        minWidth: "250px",
        maxWidth: "250px",
        height: "100%",
        background: "var(--bg-secondary)",
        borderRight: "1px solid var(--border-subtle)",
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
          borderBottom: "1px solid var(--border-subtle)",
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
          {restaurantLogo ? (
            <img
              src={restaurantLogo}
              alt="Restaurant logo"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "contain",
                borderRadius: "10px",
                padding: "3px",
              }}
            />
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
              {restaurantName}
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
            {restaurantTagline}
          </div>
        </div>
      </div>

      {/* Navigation Sections */}
      <div
        className="no-scrollbar"
        style={{
          flex: 1,
          overflowY: "auto",
          scrollbarWidth: "none",
          msOverflowStyle: "none",
          marginTop: "0.85rem",
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
                      color: isActive ? "#ffffff" : "var(--text-muted)",
                      boxShadow: isActive
                        ? "0 4px 14px rgba(245, 158, 11, 0.38)"
                        : "none",
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.background = "var(--bg-tertiary)";
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
                          background: isActive ? "rgba(0,0,0,0.3)" : "#ea580c",
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
        ))}
      </div>
    </aside>
  );
}
