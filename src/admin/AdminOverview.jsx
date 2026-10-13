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
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Overview Header Banner */}
      <div
        style={{
          background: "linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, rgba(234, 88, 12, 0.08) 100%)",
          border: "1px solid rgba(245, 158, 11, 0.25)",
          borderRadius: "16px",
          padding: "1.5rem 1.75rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <div
            style={{
              width: "50px",
              height: "50px",
              borderRadius: "14px",
              background: "linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 4px 16px rgba(245, 158, 11, 0.4)",
            }}
          >
            <LayoutDashboard size={26} color="#ffffff" />
          </div>
          <div>
            <h2
              style={{
                fontSize: "1.4rem",
                fontWeight: 800,
                color: "#ffffff",
                margin: 0,
              }}
            >
              Restaurant Dashboard
            </h2>
            <p
              style={{
                fontSize: "0.85rem",
                color: "#94a3b8",
                margin: "4px 0 0 0",
              }}
            >
              Real-time snapshot of AVSR Food Court dining floor, kitchen, and menu
            </p>
          </div>
        </div>

        <div style={{ display: "flex", gap: "0.6rem" }}>
          <button
            onClick={() => onNavigateTab("menu")}
            style={{
              background: "linear-gradient(135deg, #f59e0b, #ea580c)",
              color: "#ffffff",
              border: "none",
              borderRadius: "10px",
              padding: "0.6rem 1.1rem",
              fontSize: "0.82rem",
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              gap: "0.45rem",
              cursor: "pointer",
              boxShadow: "0 3px 12px rgba(245, 158, 11, 0.35)",
            }}
          >
            <Utensils size={15} />
            <span>Manage Menu</span>
          </button>
          <button
            onClick={() => onNavigateTab("tables")}
            style={{
              background: "rgba(255, 255, 255, 0.08)",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              color: "#ffffff",
              borderRadius: "10px",
              padding: "0.6rem 1.1rem",
              fontSize: "0.82rem",
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: "0.45rem",
              cursor: "pointer",
            }}
          >
            <Armchair size={15} />
            <span>Floor Plan</span>
          </button>
        </div>
      </div>

      {/* 5 Core Metric Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
          gap: "1rem",
        }}
      >
        {/* Total Revenue */}
        <div
          onClick={() => onNavigateTab("invoices")}
          style={{
            background: "#0d1527",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: "14px",
            padding: "1.25rem",
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
              marginBottom: "0.6rem",
            }}
          >
            <span style={{ fontSize: "0.78rem", color: "#94a3b8", fontWeight: 600 }}>
              Settled Collections
            </span>
            <div
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "8px",
                background: "rgba(245, 158, 11, 0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <TrendingUp size={16} color="#f59e0b" />
            </div>
          </div>
          <div style={{ fontSize: "1.45rem", fontWeight: 800, color: "#f59e0b" }}>
            {formatCurrency(totalRevenue)}
          </div>
          <div
            style={{
              fontSize: "0.72rem",
              color: "#64748b",
              marginTop: "4px",
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
            borderRadius: "14px",
            padding: "1.25rem",
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
              marginBottom: "0.6rem",
            }}
          >
            <span style={{ fontSize: "0.78rem", color: "#94a3b8", fontWeight: 600 }}>
              Active Menu Catalog
            </span>
            <div
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "8px",
                background: "rgba(234, 88, 12, 0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Utensils size={16} color="#ea580c" />
            </div>
          </div>
          <div style={{ fontSize: "1.45rem", fontWeight: 800, color: "#ffffff" }}>
            {menuItems.length} Dishes
          </div>
          <div
            style={{
              fontSize: "0.72rem",
              color: "#64748b",
              marginTop: "4px",
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
            borderRadius: "14px",
            padding: "1.25rem",
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
              marginBottom: "0.6rem",
            }}
          >
            <span style={{ fontSize: "0.78rem", color: "#94a3b8", fontWeight: 600 }}>
              Dining Tables & Chairs
            </span>
            <div
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "8px",
                background: "rgba(16, 185, 129, 0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Armchair size={16} color="#10b981" />
            </div>
          </div>
          <div style={{ fontSize: "1.45rem", fontWeight: 800, color: "#ffffff" }}>
            {tables.length} Tables
          </div>
          <div
            style={{
              fontSize: "0.72rem",
              color: "#10b981",
              marginTop: "4px",
            }}
          >
            {occupiedTables.length} currently occupied ({occupiedChairs}/{totalChairs} seats)
          </div>
        </div>

        {/* Kitchen KOT */}
        <div
          onClick={() => onNavigateTab("kot")}
          style={{
            background: "#0d1527",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: "14px",
            padding: "1.25rem",
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
              marginBottom: "0.6rem",
            }}
          >
            <span style={{ fontSize: "0.78rem", color: "#94a3b8", fontWeight: 600 }}>
              Kitchen KOT Status
            </span>
            <div
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "8px",
                background: "rgba(239, 68, 68, 0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <ChefHat size={16} color="#ef4444" />
            </div>
          </div>
          <div style={{ fontSize: "1.45rem", fontWeight: 800, color: "#ffffff" }}>
            {pendingKOTCount} Active Orders
          </div>
          <div
            style={{
              fontSize: "0.72rem",
              color: pendingKOTCount > 0 ? "#ef4444" : "#10b981",
              marginTop: "4px",
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
            borderRadius: "14px",
            padding: "1.25rem",
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
              marginBottom: "0.6rem",
            }}
          >
            <span style={{ fontSize: "0.78rem", color: "#94a3b8", fontWeight: 600 }}>
              Staff & Waiters
            </span>
            <div
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "8px",
                background: "rgba(99, 102, 241, 0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Users size={16} color="#818cf8" />
            </div>
          </div>
          <div style={{ fontSize: "1.45rem", fontWeight: 800, color: "#ffffff" }}>
            {staffList.length} Persons
          </div>
          <div
            style={{
              fontSize: "0.72rem",
              color: "#64748b",
              marginTop: "4px",
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
          gridTemplateColumns: "repeat(auto-fit, minmax(380px, 1fr))",
          gap: "1.25rem",
        }}
      >
        {/* Floor Tables Status Card */}
        <div
          style={{
            background: "#0d1527",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: "16px",
            padding: "1.25rem 1.5rem",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "1rem",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Armchair size={18} color="#f59e0b" />
              <h3
                style={{
                  fontSize: "1rem",
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
                fontSize: "0.78rem",
                fontWeight: 700,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "2px",
              }}
            >
              <span>View All</span>
              <ArrowRight size={13} />
            </button>
          </div>

          <div
            className="no-scrollbar"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(105px, 1fr))",
              gap: "0.65rem",
              maxHeight: "260px",
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
                    borderRadius: "10px",
                    padding: "0.6rem 0.5rem",
                    textAlign: "center",
                  }}
                >
                  <div
                    style={{
                      fontSize: "0.85rem",
                      fontWeight: 800,
                      color: isOccupied ? "#fbbf24" : "#ffffff",
                    }}
                  >
                    {tbl.name}
                  </div>
                  <div
                    style={{
                      fontSize: "0.68rem",
                      color: isOccupied ? "#f59e0b" : "#64748b",
                      marginTop: "2px",
                      textTransform: "capitalize",
                    }}
                  >
                    {isOccupied ? `${tbl.guests || 2} Guests` : "Vacant"}
                  </div>
                  <div
                    style={{
                      fontSize: "0.62rem",
                      color: "#94a3b8",
                      marginTop: "3px",
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
            borderRadius: "16px",
            padding: "1.25rem 1.5rem",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "1rem",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Utensils size={18} color="#ea580c" />
              <h3
                style={{
                  fontSize: "1rem",
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
                fontSize: "0.78rem",
                fontWeight: 700,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "2px",
              }}
            >
              <span>Manage Menu</span>
              <ArrowRight size={13} />
            </button>
          </div>

          <div
            className="no-scrollbar"
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "0.65rem",
              maxHeight: "260px",
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
                  gap: "0.75rem",
                  padding: "0.55rem 0.65rem",
                  borderRadius: "10px",
                  background: "rgba(255, 255, 255, 0.02)",
                  border: "1px solid rgba(255, 255, 255, 0.05)",
                }}
              >
                <img
                  src={dish.image}
                  alt={dish.name}
                  style={{
                    width: "42px",
                    height: "42px",
                    borderRadius: "8px",
                    objectFit: "cover",
                  }}
                  onError={(e) => (e.target.style.display = "none")}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: "0.85rem",
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
                      fontSize: "0.7rem",
                      color: "#64748b",
                      marginTop: "1px",
                    }}
                  >
                    {dish.prepTime || "15 mins"} • {dish.category}
                  </div>
                </div>
                <div
                  style={{
                    fontSize: "0.88rem",
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
