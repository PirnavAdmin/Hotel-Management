import React from "react";
import {
  LayoutDashboard,
  Utensils,
  Armchair,
  ChefHat,
  TrendingUp,
  Users,
  Package,
  FileText,
  Clock,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  IndianRupee,
} from "lucide-react";
import { formatCurrency } from "../utils/formatCurrency";

export function AdminOverview({
  menuItems = [],
  tables = [],
  staffList = [],
  pastOrders = [],
  onNavigateTab,
  onOpenKOTView,
  onOpenItemModal,
}) {
  // Financial calculations
  const totalRevenue = pastOrders.reduce(
    (sum, order) => sum + (Number(order.grandTotal) || 0),
    0
  );

  const occupiedTables = tables.filter((t) => t.status !== "vacant");
  const totalChairs = tables.reduce(
    (sum, t) => sum + (Number(t.capacity) || 0),
    0
  );
  const occupiedChairs = occupiedTables.reduce(
    (sum, t) => sum + (Number(t.guests) || 0),
    0
  );

  const tablesWithOrders = tables.filter((t) => t.items && t.items.length > 0);
  const pendingKOTCount = tablesWithOrders.filter(
    (t) =>
      !t.items.every(
        (i) => i.kotStatus === "served" || i.kotStatus === "ready"
      )
  ).length;

  const vegCount = menuItems.filter((i) => i.isVeg).length;
  const nonVegCount = menuItems.filter((i) => !i.isVeg).length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
      {/* Overview Header Banner */}
      <div
        style={{
          background: "linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, rgba(234, 88, 12, 0.08) 100%)",
          border: "1px solid rgba(245, 158, 11, 0.25)",
          borderRadius: "12px",
          padding: "0.85rem 1.15rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "0.75rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <div
            style={{
              width: "38px",
              height: "38px",
              borderRadius: "10px",
              background: "linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 3px 12px rgba(245, 158, 11, 0.35)",
              flexShrink: 0,
            }}
          >
            <LayoutDashboard size={20} color="#ffffff" />
          </div>
          <div>
            <h2
              style={{
                fontSize: "1.15rem",
                fontWeight: 800,
                color: "#ffffff",
                margin: 0,
              }}
            >
              Restaurant Dashboard
            </h2>
            <p
              style={{
                fontSize: "0.76rem",
                color: "#94a3b8",
                margin: "2px 0 0 0",
              }}
            >
              Real-time snapshot of AVSR Food Court dining floor, kitchen, and menu
            </p>
          </div>
        </div>

        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button
            onClick={() => onNavigateTab("menu")}
            style={{
              background: "linear-gradient(135deg, #f59e0b, #ea580c)",
              color: "#ffffff",
              border: "none",
              borderRadius: "8px",
              padding: "0.42rem 0.85rem",
              fontSize: "0.76rem",
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              gap: "0.35rem",
              cursor: "pointer",
              boxShadow: "0 2px 8px rgba(245, 158, 11, 0.3)",
              height: "32px",
            }}
          >
            <Utensils size={14} />
            <span>Manage Menu</span>
          </button>
          <button
            onClick={() => onNavigateTab("tables")}
            style={{
              background: "rgba(255, 255, 255, 0.08)",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              color: "#ffffff",
              borderRadius: "8px",
              padding: "0.42rem 0.85rem",
              fontSize: "0.76rem",
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: "0.35rem",
              cursor: "pointer",
              height: "32px",
            }}
          >
            <Armchair size={14} />
            <span>Floor Plan</span>
          </button>
        </div>
      </div>

      {/* 5 Core Metric Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
          gap: "0.65rem",
        }}
      >
        {/* Total Revenue */}
        <div
          onClick={() => onNavigateTab("invoices")}
          style={{
            background: "#0d1527",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: "10px",
            padding: "0.75rem 0.85rem",
            cursor: "pointer",
            transition: "all 0.15s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "rgba(245, 158, 11, 0.4)";
            e.currentTarget.style.transform = "translateY(-2px)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.08)";
            e.currentTarget.style.transform = "translateY(0)";
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "0.45rem",
            }}
          >
            <span style={{ fontSize: "0.72rem", color: "#94a3b8", fontWeight: 600 }}>
              Settled Collections
            </span>
            <div
              style={{
                width: "26px",
                height: "26px",
                borderRadius: "6px",
                background: "rgba(245, 158, 11, 0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <TrendingUp size={13} color="#f59e0b" />
            </div>
          </div>
          <div style={{ fontSize: "1.2rem", fontWeight: 800, color: "#f59e0b" }}>
            {formatCurrency(totalRevenue)}
          </div>
          <div
            style={{
              fontSize: "0.68rem",
              color: "#64748b",
              marginTop: "2px",
            }}
          >
            {pastOrders.length} completed customer bills
          </div>
        </div>

        {/* Menu Items */}
        <div
          onClick={() => onNavigateTab("menu")}
          style={{
            background: "#0d1527",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: "10px",
            padding: "0.75rem 0.85rem",
            cursor: "pointer",
            transition: "all 0.15s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "rgba(245, 158, 11, 0.4)";
            e.currentTarget.style.transform = "translateY(-2px)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.08)";
            e.currentTarget.style.transform = "translateY(0)";
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "0.45rem",
            }}
          >
            <span style={{ fontSize: "0.72rem", color: "#94a3b8", fontWeight: 600 }}>
              Active Menu Catalog
            </span>
            <div
              style={{
                width: "26px",
                height: "26px",
                borderRadius: "6px",
                background: "rgba(234, 88, 12, 0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Utensils size={13} color="#ea580c" />
            </div>
          </div>
          <div style={{ fontSize: "1.2rem", fontWeight: 800, color: "#ffffff" }}>
            {menuItems.length} Dishes
          </div>
          <div
            style={{
              fontSize: "0.68rem",
              color: "#64748b",
              marginTop: "2px",
            }}
          >
            {nonVegCount} Non-Veg • {vegCount} Veg
          </div>
        </div>

        {/* Dining Tables */}
        <div
          onClick={() => onNavigateTab("tables")}
          style={{
            background: "#0d1527",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: "10px",
            padding: "0.75rem 0.85rem",
            cursor: "pointer",
            transition: "all 0.15s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "rgba(245, 158, 11, 0.4)";
            e.currentTarget.style.transform = "translateY(-2px)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.08)";
            e.currentTarget.style.transform = "translateY(0)";
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "0.45rem",
            }}
          >
            <span style={{ fontSize: "0.72rem", color: "#94a3b8", fontWeight: 600 }}>
              Dining Tables & Chairs
            </span>
            <div
              style={{
                width: "26px",
                height: "26px",
                borderRadius: "6px",
                background: "rgba(16, 185, 129, 0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Armchair size={13} color="#10b981" />
            </div>
          </div>
          <div style={{ fontSize: "1.2rem", fontWeight: 800, color: "#ffffff" }}>
            {tables.length} Tables
          </div>
          <div
            style={{
              fontSize: "0.68rem",
              color: "#10b981",
              marginTop: "2px",
            }}
          >
            {occupiedTables.length} occupied ({occupiedChairs}/{totalChairs} seats)
          </div>
        </div>

        {/* Kitchen KOT */}
        <div
          onClick={() => onNavigateTab("kot")}
          style={{
            background: "#0d1527",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: "10px",
            padding: "0.75rem 0.85rem",
            cursor: "pointer",
            transition: "all 0.15s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "rgba(245, 158, 11, 0.4)";
            e.currentTarget.style.transform = "translateY(-2px)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.08)";
            e.currentTarget.style.transform = "translateY(0)";
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "0.45rem",
            }}
          >
            <span style={{ fontSize: "0.72rem", color: "#94a3b8", fontWeight: 600 }}>
              Kitchen KOT Status
            </span>
            <div
              style={{
                width: "26px",
                height: "26px",
                borderRadius: "6px",
                background: "rgba(239, 68, 68, 0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <ChefHat size={13} color="#ef4444" />
            </div>
          </div>
          <div style={{ fontSize: "1.2rem", fontWeight: 800, color: "#ffffff" }}>
            {pendingKOTCount} Active Orders
          </div>
          <div
            style={{
              fontSize: "0.68rem",
              color: pendingKOTCount > 0 ? "#ef4444" : "#10b981",
              marginTop: "2px",
            }}
          >
            {pendingKOTCount > 0
              ? "Live kitchen preparation in progress"
              : "All kitchen orders clear"}
          </div>
        </div>

        {/* Staff on Duty */}
        <div
          onClick={() => onNavigateTab("staff")}
          style={{
            background: "#0d1527",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: "10px",
            padding: "0.75rem 0.85rem",
            cursor: "pointer",
            transition: "all 0.15s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "rgba(245, 158, 11, 0.4)";
            e.currentTarget.style.transform = "translateY(-2px)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.08)";
            e.currentTarget.style.transform = "translateY(0)";
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "0.45rem",
            }}
          >
            <span style={{ fontSize: "0.72rem", color: "#94a3b8", fontWeight: 600 }}>
              Staff & Waiters
            </span>
            <div
              style={{
                width: "26px",
                height: "26px",
                borderRadius: "6px",
                background: "rgba(99, 102, 241, 0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Users size={13} color="#818cf8" />
            </div>
          </div>
          <div style={{ fontSize: "1.2rem", fontWeight: 800, color: "#ffffff" }}>
            {staffList.length} Persons
          </div>
          <div
            style={{
              fontSize: "0.68rem",
              color: "#64748b",
              marginTop: "2px",
            }}
          >
            Assigned to dining halls & service
          </div>
        </div>
      </div>

      {/* Two Column Grid: Floor Tables Monitor & Top Dishes */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: "0.75rem",
        }}
      >
        {/* Floor Tables Status Card */}
        <div
          style={{
            background: "#0d1527",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: "12px",
            padding: "0.85rem 1rem",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "0.65rem",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
              <Armchair size={16} color="#f59e0b" />
              <h3
                style={{
                  fontSize: "0.92rem",
                  fontWeight: 700,
                  color: "#ffffff",
                  margin: 0,
                }}
              >
                Live Dining Tables Grid
              </h3>
            </div>
            <button
              onClick={() => onNavigateTab("tables")}
              style={{
                background: "transparent",
                border: "none",
                color: "#f59e0b",
                fontSize: "0.74rem",
                fontWeight: 700,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "2px",
              }}
            >
              <span>View All</span>
              <ArrowRight size={12} />
            </button>
          </div>

          <div
            className="no-scrollbar"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(95px, 1fr))",
              gap: "0.5rem",
              maxHeight: "220px",
              overflowY: "auto",
              scrollbarWidth: "none",
              msOverflowStyle: "none",
            }}
          >
            {tables.slice(0, 15).map((tbl) => {
              const isOccupied = tbl.status !== "vacant";
              return (
                <div
                  key={tbl.id}
                  style={{
                    background: isOccupied
                      ? "rgba(245, 158, 11, 0.08)"
                      : "rgba(255, 255, 255, 0.03)",
                    border: isOccupied
                      ? "1px solid rgba(245, 158, 11, 0.3)"
                      : "1px solid rgba(255, 255, 255, 0.06)",
                    borderRadius: "8px",
                    padding: "0.45rem 0.4rem",
                    textAlign: "center",
                  }}
                >
                  <div
                    style={{
                      fontSize: "0.8rem",
                      fontWeight: 800,
                      color: isOccupied ? "#fbbf24" : "#ffffff",
                    }}
                  >
                    {tbl.name}
                  </div>
                  <div
                    style={{
                      fontSize: "0.64rem",
                      color: isOccupied ? "#f59e0b" : "#64748b",
                      marginTop: "1px",
                      textTransform: "capitalize",
                    }}
                  >
                    {isOccupied ? `${tbl.guests || 2} Guests` : "Vacant"}
                  </div>
                  <div
                    style={{
                      fontSize: "0.6rem",
                      color: "#94a3b8",
                      marginTop: "2px",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {tbl.server || "Waiter"}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top Biryanis & Popular Items */}
        <div
          style={{
            background: "#0d1527",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: "12px",
            padding: "0.85rem 1rem",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "0.65rem",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
              <Utensils size={16} color="#ea580c" />
              <h3
                style={{
                  fontSize: "0.92rem",
                  fontWeight: 700,
                  color: "#ffffff",
                  margin: 0,
                }}
              >
                Signature Dishes Preview
              </h3>
            </div>
            <button
              onClick={() => onNavigateTab("menu")}
              style={{
                background: "transparent",
                border: "none",
                color: "#ea580c",
                fontSize: "0.74rem",
                fontWeight: 700,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "2px",
              }}
            >
              <span>Manage Menu</span>
              <ArrowRight size={12} />
            </button>
          </div>

          <div
            className="no-scrollbar"
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "0.5rem",
              maxHeight: "220px",
              overflowY: "auto",
              scrollbarWidth: "none",
              msOverflowStyle: "none",
            }}
          >
            {menuItems.slice(0, 5).map((dish) => (
              <div
                key={dish.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.65rem",
                  padding: "0.42rem 0.55rem",
                  borderRadius: "8px",
                  background: "rgba(255, 255, 255, 0.02)",
                  border: "1px solid rgba(255, 255, 255, 0.05)",
                }}
              >
                <img
                  src={dish.image}
                  alt={dish.name}
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "7px",
                    objectFit: "cover",
                  }}
                  onError={(e) => (e.target.style.display = "none")}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: "0.8rem",
                      fontWeight: 700,
                      color: "#ffffff",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {dish.name}
                  </div>
                  <div
                    style={{
                      fontSize: "0.66rem",
                      color: "#64748b",
                      marginTop: "1px",
                    }}
                  >
                    {dish.prepTime || "15 mins"} • {dish.category}
                  </div>
                </div>
                <div
                  style={{
                    fontSize: "0.82rem",
                    fontWeight: 800,
                    color: "#f59e0b",
                    whiteSpace: "nowrap",
                  }}
                >
                  ₹{Number(dish.price).toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
