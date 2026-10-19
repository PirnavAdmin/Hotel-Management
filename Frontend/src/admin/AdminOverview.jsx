import React, { useState, useEffect } from "react";
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
  ShoppingBag,
} from "lucide-react";
import { formatCurrency } from "../utils/formatCurrency";
import { getMenuItemImage, handleDishImageError } from "../utils/menuImageHelper";

import { dedupeOrders, parseOrderToYMD } from "../utils/orderDedupe";

export function AdminOverview({
  menuItems = [],
  tables = [],
  staffList = [],
  pastOrders = [],
  onNavigateTab,
  onOpenKOTView,
  onOpenItemModal,
}) {
  // Dynamically load orders from localStorage or props with deduplication
  const [ordersList, setOrdersList] = useState(() => {
    try {
      const saved = localStorage.getItem("gourmet_pos_past_orders_v2_inr");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return dedupeOrders(parsed);
      }
    } catch {}
    return Array.isArray(pastOrders) && pastOrders.length > 0 ? dedupeOrders(pastOrders) : [];
  });

  useEffect(() => {
    setOrdersList(dedupeOrders(Array.isArray(pastOrders) ? pastOrders : []));
  }, [pastOrders]);

  useEffect(() => {
    const syncFromStorage = () => {
      try {
        const saved = localStorage.getItem("gourmet_pos_past_orders_v2_inr");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            setOrdersList(dedupeOrders(parsed));
          }
        }
      } catch {}
    };

    window.addEventListener("storage", syncFromStorage);
    window.addEventListener("focus", syncFromStorage);
    return () => {
      window.removeEventListener("storage", syncFromStorage);
      window.removeEventListener("focus", syncFromStorage);
    };
  }, []);

  const cleanOrders = dedupeOrders(
    ordersList && ordersList.length > 0 ? ordersList : pastOrders,
  );
  const now = new Date();
  const todayYMD = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  const todayOrders = cleanOrders.filter((o) => parseOrderToYMD(o) === todayYMD);
  const todayRevenue = todayOrders.reduce(
    (sum, order) => sum + (Number(order.grandTotal ?? order.total) || 0),
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
                color: "var(--text-main)",
                margin: 0,
              }}
            >
              Restaurant Dashboard
            </h2>
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
              background: "var(--bg-card)",
              border: "1px solid var(--border-card)",
              color: "var(--text-main)",
              borderRadius: "8px",
              padding: "0.42rem 0.85rem",
              fontSize: "0.76rem",
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: "0.35rem",
              cursor: "pointer",
              height: "32px",
              boxShadow: "var(--shadow-sm)",
            }}
          >
            <Armchair size={14} color="var(--accent-amber)" />
            <span>Floor Plan</span>
          </button>
        </div>
      </div>

      {/* 4 Core Metric Cards (Aligned) */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "0.65rem",
        }}
      >
        {/* Today Orders */}
        <div
          onClick={() => onNavigateTab("reports")}
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border-card)",
            borderRadius: "10px",
            padding: "0.75rem 0.85rem",
            cursor: "pointer",
            transition: "all 0.15s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "var(--accent-amber)";
            e.currentTarget.style.transform = "translateY(-2px)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "var(--border-card)";
            e.currentTarget.style.transform = "translateY(0)";
          }}
          title="Click to view today's sales and order analytics"
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "0.45rem",
            }}
          >
            <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: 700 }}>
              Today Orders
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
              <ShoppingBag size={13} color="#f59e0b" />
            </div>
          </div>
          <div style={{ fontSize: "1.2rem", fontWeight: 800, color: "var(--accent-amber)" }}>
            {todayOrders.length} {todayOrders.length === 1 ? "Order" : "Orders"}
          </div>
          <div
            style={{
              fontSize: "0.68rem",
              color: "var(--text-muted)",
              marginTop: "2px",
            }}
          >
            Settled customer bills
          </div>
        </div>

        {/* Menu Items */}
        <div
          onClick={() => onNavigateTab("menu")}
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border-card)",
            borderRadius: "10px",
            padding: "0.75rem 0.85rem",
            cursor: "pointer",
            transition: "all 0.15s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "var(--accent-amber)";
            e.currentTarget.style.transform = "translateY(-2px)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "var(--border-card)";
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
            <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: 700 }}>
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
          <div style={{ fontSize: "1.2rem", fontWeight: 800, color: "var(--text-main)" }}>
            {menuItems.length} Dishes
          </div>
          <div
            style={{
              fontSize: "0.68rem",
              color: "var(--text-muted)",
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
            background: "var(--bg-card)",
            border: "1px solid var(--border-card)",
            borderRadius: "10px",
            padding: "0.75rem 0.85rem",
            cursor: "pointer",
            transition: "all 0.15s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "var(--accent-amber)";
            e.currentTarget.style.transform = "translateY(-2px)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "var(--border-card)";
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
            <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: 700 }}>
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
          <div style={{ fontSize: "1.2rem", fontWeight: 800, color: "var(--text-main)" }}>
            {tables.length} Tables
          </div>
          <div
            style={{
              fontSize: "0.68rem",
              color: "var(--status-vacant)",
              fontWeight: 600,
              marginTop: "2px",
            }}
          >
            {occupiedTables.length} occupied ({occupiedChairs}/{totalChairs} seats)
          </div>
        </div>

        {/* Staff on Duty */}
        <div
          onClick={() => onNavigateTab("staff")}
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border-card)",
            borderRadius: "10px",
            padding: "0.75rem 0.85rem",
            cursor: "pointer",
            transition: "all 0.15s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "var(--accent-amber)";
            e.currentTarget.style.transform = "translateY(-2px)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "var(--border-card)";
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
            <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: 700 }}>
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
          <div style={{ fontSize: "1.2rem", fontWeight: 800, color: "var(--text-main)" }}>
            {staffList.length} Persons
          </div>
          <div
            style={{
              fontSize: "0.68rem",
              color: "var(--text-muted)",
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
            background: "var(--bg-card)",
            border: "1px solid var(--border-card)",
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
                  color: "var(--text-main)",
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
                color: "var(--accent-amber)",
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
                      ? "rgba(245, 158, 11, 0.12)"
                      : "var(--bg-tertiary)",
                    border: isOccupied
                      ? "1px solid rgba(245, 158, 11, 0.35)"
                      : "1px solid var(--border-subtle)",
                    borderRadius: "8px",
                    padding: "0.45rem 0.4rem",
                    textAlign: "center",
                  }}
                >
                  <div
                    style={{
                      fontSize: "0.8rem",
                      fontWeight: 800,
                      color: isOccupied ? "var(--accent-amber)" : "var(--text-main)",
                    }}
                  >
                    {tbl.name}
                  </div>
                  <div
                    style={{
                      fontSize: "0.64rem",
                      color: isOccupied ? "var(--status-occupied)" : "var(--text-muted)",
                      marginTop: "1px",
                      textTransform: "capitalize",
                      fontWeight: 600,
                    }}
                  >
                    {isOccupied ? `${tbl.guests || 2} Guests` : "Vacant"}
                  </div>
                  <div
                    style={{
                      fontSize: "0.6rem",
                      color: "var(--text-muted)",
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
            background: "var(--bg-card)",
            border: "1px solid var(--border-card)",
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
                  color: "var(--text-main)",
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
                  background: "var(--bg-tertiary)",
                  border: "1px solid var(--border-subtle)",
                }}
              >
                <img
                  src={getMenuItemImage(dish)}
                  alt={dish.name}
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "7px",
                    objectFit: "cover",
                  }}
                  onError={(e) => handleDishImageError(e, dish)}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: "0.8rem",
                      fontWeight: 700,
                      color: "var(--text-main)",
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
                      color: "var(--text-dim)",
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
                    color: "var(--accent-amber)",
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
