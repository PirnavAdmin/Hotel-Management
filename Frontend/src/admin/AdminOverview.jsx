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
  Boxes,
  Receipt,
  Plus,
  Sparkles,
  Smartphone,
  Banknote,
  CreditCard,
  Flame,
  Eye,
} from "lucide-react";
import { formatCurrency } from "../utils/formatCurrency";
import { getMenuItemImage, handleDishImageError } from "../utils/menuImageHelper";
import { dedupeOrders, parseOrderToYMD } from "../utils/orderDedupe";
import { SkeletonDashboard } from "../common/Skeletons";

const BAR_MENU_CATEGORIES = new Set([
  "cocktails", "mocktails", "beers", "whiskey", "vodka & gin", "rum & brandy",
  "wine & champagne", "shots & shooters", "juices & shakes", "soft drinks & soda", "tea & coffee",
]);

const isBarMenuItem = (item) => {
  const category = String(item?.category ?? item?.categoryName ?? "").trim().toLowerCase();
  const section = String(item?.section ?? item?.menuSection ?? item?.itemType ?? "").trim().toLowerCase();
  return Boolean(item?.drinkType) || section.includes("bar") || section === "beverage" || BAR_MENU_CATEGORIES.has(category);
};

export function AdminOverview({
  menuItems = [],
  tables = [],
  staffList = [],
  pastOrders = [],
  onNavigateTab,
  onOpenKOTView,
  onOpenItemModal,
  sharedRecordLoad = { tables: "ready", staff: "ready" },
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

  // Track inventory items and low stock
  const [inventoryList, setInventoryList] = useState(() => {
    try {
      const raw = localStorage.getItem("gourmet_pos_inventory_v1");
      if (raw) return JSON.parse(raw);
    } catch {}
    return [];
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

    const syncInventory = (e) => {
      if (Array.isArray(e.detail)) {
        setInventoryList(e.detail);
      } else {
        try {
          const raw = localStorage.getItem("gourmet_pos_inventory_v1");
          if (raw) setInventoryList(JSON.parse(raw));
        } catch {}
      }
    };

    window.addEventListener("storage", syncFromStorage);
    window.addEventListener("focus", syncFromStorage);
    window.addEventListener("avsr-inventory-updated", syncInventory);

    return () => {
      window.removeEventListener("storage", syncFromStorage);
      window.removeEventListener("focus", syncFromStorage);
      window.removeEventListener("avsr-inventory-updated", syncInventory);
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

  // Cash / UPI breakdown for today
  const todayCashRevenue = todayOrders
    .filter((o) => String(o.paymentMethod || o.paymentMode || "").toLowerCase() === "cash")
    .reduce((sum, o) => sum + (Number(o.grandTotal ?? o.total) || 0), 0);

  const todayUpiRevenue = todayOrders
    .filter((o) => String(o.paymentMethod || o.paymentMode || "").toLowerCase() === "upi")
    .reduce((sum, o) => sum + (Number(o.grandTotal ?? o.total) || 0), 0);

  const occupiedTables = tables.filter((t) => t.status !== "vacant" && Array.isArray(t.items) && t.items.some((i) => i && i.status !== "cancelled" && i.kotStatus !== "cancelled"));
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

  const dineInMenuItems = menuItems.filter((item) => !isBarMenuItem(item));
  const vegCount = dineInMenuItems.filter((i) => i.isVeg).length;
  const nonVegCount = dineInMenuItems.filter((i) => !i.isVeg).length;

  const lowStockItems = inventoryList.filter(
    (item) => Number(item.stock ?? item.currentStock ?? 0) <= Number(item.minThreshold ?? item.minimumThreshold ?? 5)
  );

  const averageOrderValue = todayOrders.length > 0 ? todayRevenue / todayOrders.length : 0;

  if (
    (sharedRecordLoad.tables === "loading" && tables.length === 0) ||
    (sharedRecordLoad.staff === "loading" && staffList.length === 0)
  ) {
    return <SkeletonDashboard cards={4} />;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      {/* 1. Overview Header Banner */}
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
            <div style={{ fontSize: "0.74rem", color: "var(--text-muted)", marginTop: "2px" }}>
              Live overview of sales, kitchen, dining floor, and inventory health
            </div>
          </div>
        </div>

        {/* Quick Action Navigation Buttons */}
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
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

          {typeof onOpenKOTView === "function" && (
            <button
              onClick={onOpenKOTView}
              style={{
                background: pendingKOTCount > 0 ? "rgba(239, 68, 68, 0.15)" : "var(--bg-card)",
                border: pendingKOTCount > 0 ? "1px solid rgba(239, 68, 68, 0.4)" : "1px solid var(--border-card)",
                color: pendingKOTCount > 0 ? "var(--danger)" : "var(--text-main)",
                borderRadius: "8px",
                padding: "0.42rem 0.85rem",
                fontSize: "0.76rem",
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                gap: "0.35rem",
                cursor: "pointer",
                height: "32px",
              }}
            >
              <ChefHat size={14} color={pendingKOTCount > 0 ? "#ef4444" : "var(--text-main)"} />
              <span>Live KOT ({pendingKOTCount})</span>
            </button>
          )}

          <button
            onClick={() => onNavigateTab("invoices")}
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
            }}
          >
            <Receipt size={14} color="#3b82f6" />
            <span>Invoices</span>
          </button>
        </div>
      </div>

      {/* 2. Five Operational Metric Cards - 1 Clean Row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
          gap: "0.55rem",
          width: "100%",
        }}
      >
        {/* Card 1: Today's Revenue & Orders */}
        <div
          onClick={() => onNavigateTab("reports")}
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border-card)",
            borderRadius: "10px",
            padding: "0.65rem 0.75rem",
            cursor: "pointer",
            transition: "all 0.15s ease",
            minWidth: 0,
            overflow: "hidden",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "var(--accent-amber)";
            e.currentTarget.style.transform = "translateY(-2px)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "var(--border-card)";
            e.currentTarget.style.transform = "translateY(0)";
          }}
          title="Click to view today's revenue & sales reports"
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "0.35rem",
            }}
          >
            <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              Today's Sales
            </span>
            <div
              style={{
                width: "24px",
                height: "24px",
                borderRadius: "6px",
                background: "rgba(245, 158, 11, 0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <IndianRupee size={12} color="#f59e0b" />
            </div>
          </div>
          <div style={{ fontSize: "1.15rem", fontWeight: 800, color: "var(--accent-amber)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            ₹{todayRevenue.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div
            style={{
              fontSize: "0.66rem",
              color: "var(--text-muted)",
              marginTop: "2px",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            <span>{todayOrders.length} Bills</span>
            <span style={{ margin: "0 3px" }}>•</span>
            <span style={{ color: "var(--success)" }}>₹{todayCashRevenue.toFixed(0)}</span>
            <span style={{ margin: "0 2px" }}>/</span>
            <span style={{ color: "#3b82f6" }}>₹{todayUpiRevenue.toFixed(0)}</span>
          </div>
        </div>

        {/* Card 2: Kitchen KOT Orders Live */}
        <div
          onClick={() => {
            if (typeof onOpenKOTView === "function") onOpenKOTView();
            else onNavigateTab("kot");
          }}
          style={{
            background: "var(--bg-card)",
            border: pendingKOTCount > 0 ? "1px solid rgba(239, 68, 68, 0.4)" : "1px solid var(--border-card)",
            borderRadius: "10px",
            padding: "0.65rem 0.75rem",
            cursor: "pointer",
            transition: "all 0.15s ease",
            minWidth: 0,
            overflow: "hidden",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "var(--danger)";
            e.currentTarget.style.transform = "translateY(-2px)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = pendingKOTCount > 0 ? "rgba(239, 68, 68, 0.4)" : "var(--border-card)";
            e.currentTarget.style.transform = "translateY(0)";
          }}
          title="Click to view Kitchen KOT display"
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "0.35rem",
            }}
          >
            <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              Kitchen KOT Live
            </span>
            <div
              style={{
                width: "24px",
                height: "24px",
                borderRadius: "6px",
                background: pendingKOTCount > 0 ? "rgba(239, 68, 68, 0.15)" : "rgba(100, 116, 139, 0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <ChefHat size={12} color={pendingKOTCount > 0 ? "#ef4444" : "var(--text-dim)"} />
            </div>
          </div>
          <div style={{ fontSize: "1.15rem", fontWeight: 800, color: pendingKOTCount > 0 ? "var(--danger)" : "var(--text-main)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {pendingKOTCount} {pendingKOTCount === 1 ? "Active KOT" : "Active KOTs"}
          </div>
          <div
            style={{
              fontSize: "0.66rem",
              color: pendingKOTCount > 0 ? "var(--danger)" : "var(--text-muted)",
              fontWeight: 600,
              marginTop: "2px",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {pendingKOTCount > 0 ? `${tablesWithOrders.length} tables cooking` : "Kitchen all caught up"}
          </div>
        </div>

        {/* Card 3: Dining Tables & Seating */}
        <div
          onClick={() => onNavigateTab("tables")}
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border-card)",
            borderRadius: "10px",
            padding: "0.65rem 0.75rem",
            cursor: "pointer",
            transition: "all 0.15s ease",
            minWidth: 0,
            overflow: "hidden",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "var(--accent-amber)";
            e.currentTarget.style.transform = "translateY(-2px)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "var(--border-card)";
            e.currentTarget.style.transform = "translateY(0)";
          }}
          title="Click to view Dining Floor Plan"
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "0.35rem",
            }}
          >
            <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              Floor Occupancy
            </span>
            <div
              style={{
                width: "24px",
                height: "24px",
                borderRadius: "6px",
                background: "rgba(16, 185, 129, 0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Armchair size={12} color="var(--success)" />
            </div>
          </div>
          <div style={{ fontSize: "1.15rem", fontWeight: 800, color: "var(--text-main)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {occupiedTables.length} / {tables.length} Tables
          </div>
          <div
            style={{
              fontSize: "0.66rem",
              color: occupiedTables.length > 0 ? "var(--accent-amber-light)" : "var(--status-vacant)",
              fontWeight: 600,
              marginTop: "2px",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {occupiedChairs} seated ({totalChairs} seats)
          </div>
        </div>

        {/* Card 4: Inventory & Stock Status */}
        <div
          onClick={() => onNavigateTab("inventory")}
          style={{
            background: "var(--bg-card)",
            border: lowStockItems.length > 0 ? "1px solid rgba(239, 68, 68, 0.4)" : "1px solid var(--border-card)",
            borderRadius: "10px",
            padding: "0.65rem 0.75rem",
            cursor: "pointer",
            transition: "all 0.15s ease",
            minWidth: 0,
            overflow: "hidden",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = lowStockItems.length > 0 ? "#ef4444" : "var(--accent-amber)";
            e.currentTarget.style.transform = "translateY(-2px)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = lowStockItems.length > 0 ? "rgba(239, 68, 68, 0.4)" : "var(--border-card)";
            e.currentTarget.style.transform = "translateY(0)";
          }}
          title="Click to view Inventory & Stock Management"
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "0.35rem",
            }}
          >
            <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              Inventory Health
            </span>
            <div
              style={{
                width: "24px",
                height: "24px",
                borderRadius: "6px",
                background: lowStockItems.length > 0 ? "rgba(239, 68, 68, 0.15)" : "rgba(16, 185, 129, 0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Package size={12} color={lowStockItems.length > 0 ? "#ef4444" : "#10b981"} />
            </div>
          </div>
          <div style={{ fontSize: "1.15rem", fontWeight: 800, color: lowStockItems.length > 0 ? "var(--danger)" : "var(--text-main)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {inventoryList.length} Items
          </div>
          <div
            style={{
              fontSize: "0.66rem",
              color: lowStockItems.length > 0 ? "var(--danger)" : "var(--text-muted)",
              fontWeight: 600,
              marginTop: "2px",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {lowStockItems.length > 0
              ? `⚠️ ${lowStockItems.length} Low Stock`
              : "All stock healthy"}
          </div>
        </div>

        {/* Card 5: Menu Catalog & Staff */}
        <div
          onClick={() => onNavigateTab("menu")}
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border-card)",
            borderRadius: "10px",
            padding: "0.65rem 0.75rem",
            cursor: "pointer",
            transition: "all 0.15s ease",
            minWidth: 0,
            overflow: "hidden",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "var(--accent-amber)";
            e.currentTarget.style.transform = "translateY(-2px)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "var(--border-card)";
            e.currentTarget.style.transform = "translateY(0)";
          }}
          title="Click to view Active Menu Catalog"
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "0.35rem",
            }}
          >
            <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              Menu & Staff
            </span>
            <div
              style={{
                width: "24px",
                height: "24px",
                borderRadius: "6px",
                background: "rgba(234, 88, 12, 0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Utensils size={12} color="#ea580c" />
            </div>
          </div>
          <div style={{ fontSize: "1.15rem", fontWeight: 800, color: "var(--text-main)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {dineInMenuItems.length} Dishes
          </div>
          <div
            style={{
              fontSize: "0.66rem",
              color: "var(--text-muted)",
              marginTop: "2px",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {vegCount}V • {nonVegCount}NV • {staffList.length} Staff
          </div>
        </div>
      </div>

      {/* 3. Two Column Grid: Floor Tables Monitor & Signature Dishes */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
          gap: "0.75rem",
        }}
      >
        {/* Floor Tables Status Card */}
        <div
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border-card)",
            borderRadius: "12px",
            padding: "0.9rem 1rem",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "0.75rem",
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
              <span
                style={{
                  fontSize: "0.68rem",
                  fontWeight: 700,
                  background: occupiedTables.length > 0 ? "rgba(245, 158, 11, 0.15)" : "rgba(16, 185, 129, 0.15)",
                  color: occupiedTables.length > 0 ? "var(--accent-amber-light)" : "var(--success)",
                  padding: "1px 6px",
                  borderRadius: "10px",
                }}
              >
                {occupiedTables.length} Occupied
              </span>
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
              <span>View All Floor</span>
              <ArrowRight size={12} />
            </button>
          </div>

          {/* Clean Tables Grid - Shows Tables starting from Table 1 without cutoffs */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))",
              gap: "0.5rem",
              maxHeight: "260px",
              overflowY: "auto",
              paddingRight: "2px",
            }}
          >
            {tables
              .slice()
              .sort((a, b) => Number(a.id || 0) - Number(b.id || 0))
              .map((tbl) => {
                const isOccupied = tbl.status !== "vacant" && Array.isArray(tbl.items) && tbl.items.some((i) => i && i.status !== "cancelled" && i.kotStatus !== "cancelled");
                return (
                  <div
                    key={tbl.id}
                    onClick={() => onNavigateTab("tables")}
                    style={{
                      background: isOccupied
                        ? "rgba(245, 158, 11, 0.12)"
                        : "var(--bg-tertiary)",
                      border: isOccupied
                        ? "1px solid rgba(245, 158, 11, 0.4)"
                        : "1px solid var(--border-subtle)",
                      borderRadius: "8px",
                      padding: "0.5rem 0.4rem",
                      textAlign: "center",
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = "var(--accent-amber)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = isOccupied
                        ? "rgba(245, 158, 11, 0.4)"
                        : "var(--border-subtle)";
                    }}
                  >
                    <div
                      style={{
                        fontSize: "0.82rem",
                        fontWeight: 800,
                        color: isOccupied ? "var(--accent-amber)" : "var(--text-main)",
                      }}
                    >
                      {tbl.name}
                    </div>
                    <div
                      style={{
                        fontSize: "0.64rem",
                        color: isOccupied ? "var(--accent-amber-light)" : "var(--status-vacant)",
                        marginTop: "2px",
                        fontWeight: 700,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "3px",
                      }}
                    >
                      <span
                        style={{
                          width: "5px",
                          height: "5px",
                          borderRadius: "50%",
                          background: isOccupied ? "#f59e0b" : "#10b981",
                        }}
                      />
                      <span>{isOccupied ? `${tbl.guests || 2} Guests` : "Vacant"}</span>
                    </div>
                    <div
                      style={{
                        fontSize: "0.62rem",
                        color: "var(--text-muted)",
                        marginTop: "2px",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {tbl.server || "Unassigned"}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>

        {/* Top Signature Dishes */}
        <div
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border-card)",
            borderRadius: "12px",
            padding: "0.9rem 1rem",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "0.75rem",
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
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
              {typeof onOpenItemModal === "function" && (
                <button
                  onClick={() => onOpenItemModal(null)}
                  style={{
                    background: "rgba(245, 158, 11, 0.15)",
                    border: "1px solid rgba(245, 158, 11, 0.35)",
                    color: "var(--accent-amber-light)",
                    borderRadius: "6px",
                    padding: "0.25rem 0.55rem",
                    fontSize: "0.72rem",
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "2px",
                  }}
                >
                  <Plus size={11} />
                  <span>Add Dish</span>
                </button>
              )}
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
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "0.5rem",
              maxHeight: "260px",
              overflowY: "auto",
              paddingRight: "2px",
            }}
          >
            {dineInMenuItems.slice(0, 5).map((dish) => (
              <div
                key={dish.id}
                onClick={() => onNavigateTab("menu")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.65rem",
                  padding: "0.45rem 0.65rem",
                  borderRadius: "8px",
                  background: "var(--bg-tertiary)",
                  border: "1px solid var(--border-subtle)",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "var(--accent-amber)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "var(--border-subtle)";
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
                      fontSize: "0.82rem",
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
                      fontSize: "0.68rem",
                      color: "var(--text-dim)",
                      marginTop: "1px",
                    }}
                  >
                    {dish.prepTime || "15 mins"} • {dish.category}
                    {Array.isArray(dish.recipe) && dish.recipe.length > 0 && (
                      <span style={{ color: "var(--accent-amber-light)", marginLeft: "4px" }}>
                        ({dish.recipe.length} ingr.)
                      </span>
                    )}
                  </div>
                </div>
                <div
                  style={{
                    fontSize: "0.84rem",
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

      {/* 4. Recent Settlement Invoices & Live Billing Feed */}
      <div
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border-card)",
          borderRadius: "12px",
          padding: "0.9rem 1.1rem",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "0.75rem",
            flexWrap: "wrap",
            gap: "0.5rem",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Receipt size={17} color="#3b82f6" />
            <h3
              style={{
                fontSize: "0.94rem",
                fontWeight: 700,
                color: "var(--text-main)",
                margin: 0,
              }}
            >
              Recent Customer Billing Invoices
            </h3>
            <span
              style={{
                fontSize: "0.68rem",
                fontWeight: 700,
                background: "rgba(59, 130, 246, 0.15)",
                color: "#3b82f6",
                padding: "2px 7px",
                borderRadius: "10px",
              }}
            >
              {cleanOrders.length} Total Settled
            </span>
          </div>

          <button
            onClick={() => onNavigateTab("invoices")}
            style={{
              background: "transparent",
              border: "none",
              color: "#3b82f6",
              fontSize: "0.74rem",
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "3px",
            }}
          >
            <span>View All Invoices in Detail</span>
            <ArrowRight size={13} />
          </button>
        </div>

        {cleanOrders.length === 0 ? (
          <div
            style={{
              padding: "1.5rem",
              textAlign: "center",
              background: "var(--bg-tertiary)",
              borderRadius: "8px",
              border: "1px dashed var(--border-subtle)",
              color: "var(--text-muted)",
              fontSize: "0.8rem",
            }}
          >
            No settled customer bills yet. Real-time payments from tables and takeaway orders will display here automatically.
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <div style={{ minWidth: "640px" }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1.3fr 1.1fr 1fr 1fr 1.2fr 1fr",
                  padding: "0.45rem 0.75rem",
                  background: "var(--bg-tertiary)",
                  borderRadius: "6px",
                  fontSize: "0.72rem",
                  fontWeight: 700,
                  color: "var(--text-muted)",
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                  marginBottom: "0.4rem",
                }}
              >
                <div>Invoice #</div>
                <div>Table / Source</div>
                <div>Items</div>
                <div>Payment Mode</div>
                <div style={{ textAlign: "right" }}>Total Amount</div>
                <div style={{ textAlign: "right" }}>Status</div>
              </div>

              {cleanOrders.slice(0, 5).map((order) => {
                const mode = String(order.paymentMethod || order.paymentMode || "UPI").toUpperCase();
                const total = Number(order.grandTotal ?? order.total ?? 0);
                const invNumber = order.invoiceNumber || order.invoiceNo || order.id || "INV-001";
                const tableName = order.tableName || (order.tableId ? `Table ${order.tableId}` : "Takeaway / Direct");

                return (
                  <div
                    key={order.id || invNumber}
                    onClick={() => onNavigateTab("invoices")}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1.3fr 1.1fr 1fr 1fr 1.2fr 1fr",
                      alignItems: "center",
                      padding: "0.45rem 0.75rem",
                      background: "var(--bg-tertiary)",
                      borderRadius: "6px",
                      marginBottom: "0.35rem",
                      fontSize: "0.78rem",
                      cursor: "pointer",
                      border: "1px solid var(--border-subtle)",
                      transition: "all 0.15s ease",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = "var(--accent-amber)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = "var(--border-subtle)";
                    }}
                  >
                    <div style={{ fontWeight: 700, color: "var(--text-main)" }}>
                      {invNumber}
                    </div>
                    <div style={{ color: "var(--text-muted)", fontWeight: 500 }}>
                      {tableName}
                    </div>
                    <div style={{ color: "var(--text-muted)" }}>
                      {Array.isArray(order.items) ? `${order.items.length} items` : "1 item"}
                    </div>
                    <div>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "3px",
                          padding: "2px 7px",
                          borderRadius: "4px",
                          fontSize: "0.68rem",
                          fontWeight: 700,
                          background: mode === "CASH" ? "rgba(16, 185, 129, 0.12)" : "rgba(59, 130, 246, 0.12)",
                          color: mode === "CASH" ? "var(--success)" : "#3b82f6",
                          border: mode === "CASH" ? "1px solid rgba(16, 185, 129, 0.3)" : "1px solid rgba(59, 130, 246, 0.3)",
                        }}
                      >
                        {mode === "CASH" ? <Banknote size={10} /> : <Smartphone size={10} />}
                        <span>{mode}</span>
                      </span>
                    </div>
                    <div style={{ textAlign: "right", fontWeight: 800, color: "var(--accent-amber)" }}>
                      ₹{total.toFixed(2)}
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "3px",
                          color: "var(--success)",
                          fontSize: "0.72rem",
                          fontWeight: 700,
                        }}
                      >
                        <CheckCircle2 size={12} />
                        <span>Settled</span>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
