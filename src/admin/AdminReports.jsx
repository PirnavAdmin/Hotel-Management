import React, { useState, useEffect, useRef } from "react";
import {
  BarChart3,
  TrendingUp,
  CreditCard,
  Smartphone,
  Banknote,
  Utensils,
  Award,
  Calendar,
  ArrowRight,
  RefreshCw,
  Printer,
} from "lucide-react";
import { formatCurrency } from "../utils/formatCurrency";
import { INITIAL_ORDERS } from "../data/initialOrders";

function parseOrderToYMD(order) {
  if (!order) return "";
  const months = {
    jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
    jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12",
  };

  if (order.date) {
    const s = String(order.date).trim();
    const isoMatch = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (isoMatch) {
      return `${isoMatch[1]}-${isoMatch[2].padStart(2, "0")}-${isoMatch[3].padStart(2, "0")}`;
    }
    const dmyMatch = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
    if (dmyMatch) {
      return `${dmyMatch[3]}-${dmyMatch[2].padStart(2, "0")}-${dmyMatch[1].padStart(2, "0")}`;
    }
    const textMatch = s.match(/^(\d{1,2})[\s\-]+([a-zA-Z]{3,})[\s\-]+(\d{4})/);
    if (textMatch) {
      const mon = textMatch[2].slice(0, 3).toLowerCase();
      if (months[mon]) {
        return `${textMatch[3]}-${months[mon]}-${textMatch[1].padStart(2, "0")}`;
      }
    }
    const d = new Date(s);
    if (!isNaN(d.getTime())) {
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    }
  }

  const ts = order.orderTimestamp || order.timestamp;
  if (ts) {
    const d = new Date(ts);
    if (!isNaN(d.getTime())) {
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    }
  }
  return "";
}

export function AdminReports({ pastOrders = [], menuItems = [] }) {
  const now = new Date();
  const todayYMD = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const sevenDaysYMD = `${sevenDaysAgo.getFullYear()}-${String(sevenDaysAgo.getMonth() + 1).padStart(2, "0")}-${String(sevenDaysAgo.getDate()).padStart(2, "0")}`;
  const currentMonthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const monthStartYMD = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;

  const [showAllDishes, setShowAllDishes] = useState(false);
  const [filterPeriod, setFilterPeriod] = useState("today");
  const [startDate, setStartDate] = useState(todayYMD);
  const [endDate, setEndDate] = useState(todayYMD);
  const [isFetching, setIsFetching] = useState(false);
  const startInputRef = useRef(null);
  const [ordersData, setOrdersData] = useState(() => {
    return pastOrders && pastOrders.length > 0 ? pastOrders : INITIAL_ORDERS;
  });

  useEffect(() => {
    if (pastOrders && pastOrders.length > 0) {
      setOrdersData(pastOrders);
    }
  }, [pastOrders]);

  const allOrders = ordersData;

  const filteredOrders = ordersData.filter((order) => {
    if (filterPeriod === "all") return true;

    const orderYMD = parseOrderToYMD(order);
    if (!orderYMD) return false;

    if (filterPeriod === "today") {
      return orderYMD === todayYMD;
    }
    if (filterPeriod === "week") {
      return orderYMD >= sevenDaysYMD && orderYMD <= todayYMD;
    }
    if (filterPeriod === "month") {
      return orderYMD.startsWith(currentMonthPrefix);
    }
    if (filterPeriod === "custom") {
      if (startDate && endDate) {
        const from = startDate <= endDate ? startDate : endDate;
        const to = startDate <= endDate ? endDate : startDate;
        return orderYMD >= from && orderYMD <= to;
      }
      if (startDate) {
        return orderYMD >= startDate;
      }
      if (endDate) {
        return orderYMD <= endDate;
      }
      return true;
    }
    return true;
  });

  const totalRevenue = filteredOrders.reduce(
    (sum, o) => sum + (Number(o.grandTotal) || 0),
    0
  );

  const totalTax = filteredOrders.reduce(
    (sum, o) => sum + (Number(o.taxAmount) || 0),
    0
  );

  const totalService = filteredOrders.reduce(
    (sum, o) => sum + (Number(o.serviceChargeAmount) || 0),
    0
  );

  // Payment breakdown
  const paymentStats = {
    upi: filteredOrders
      .filter((o) => (o.paymentMethod || "").toLowerCase() === "upi")
      .reduce((s, o) => s + (Number(o.grandTotal) || 0), 0),
    cash: filteredOrders
      .filter((o) => (o.paymentMethod || "").toLowerCase() === "cash")
      .reduce((s, o) => s + (Number(o.grandTotal) || 0), 0),
    card: filteredOrders
      .filter((o) => (o.paymentMethod || "").toLowerCase() === "card")
      .reduce((s, o) => s + (Number(o.grandTotal) || 0), 0),
  };

  const upiPercent = totalRevenue ? Math.round((paymentStats.upi / totalRevenue) * 100) : 0;
  const cashPercent = totalRevenue ? Math.round((paymentStats.cash / totalRevenue) * 100) : 0;
  const cardPercent = totalRevenue ? Math.max(0, 100 - upiPercent - cashPercent) : 0;

  // Top selling dishes across settled orders
  const dishCounts = {};
  filteredOrders.forEach((o) => {
    (o.items || []).forEach((item) => {
      const name = item.name || "Dish";
      dishCounts[name] = (dishCounts[name] || 0) + (item.quantity || 1);
    });
  });

  const sortedDishes = Object.entries(dishCounts).sort((a, b) => b[1] - a[1]);
  const displayedDishes = showAllDishes
    ? sortedDishes
    : sortedDishes.slice(0, 3);

  const averageBill = filteredOrders.length
    ? Math.round(totalRevenue / filteredOrders.length)
    : 0;

  const handleFetchData = () => {
    setIsFetching(true);
    try {
      const saved = localStorage.getItem("gourmet_pos_past_orders_v2_inr");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setOrdersData(parsed);
        }
      }
    } catch {}

    setTimeout(() => {
      setIsFetching(false);
    }, 450);
  };

  const getFilterPeriodLabel = () => {
    if (filterPeriod === "today") return `Today (${todayYMD})`;
    if (filterPeriod === "week") return `Last 7 Days (${sevenDaysYMD} to ${todayYMD})`;
    if (filterPeriod === "month") return `This Month (${currentMonthPrefix})`;
    if (filterPeriod === "all") return "All Time";
    if (filterPeriod === "custom") {
      if (startDate && endDate) {
        return startDate === endDate ? startDate : `${startDate} to ${endDate}`;
      }
      if (startDate) return `From ${startDate}`;
      if (endDate) return `Up to ${endDate}`;
    }
    return "Custom Period";
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {/* Outer Card Matching Design */}
      <div
        style={{
          background: "#0d1527",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          borderRadius: "16px",
          padding: "1.5rem",
        }}
      >
        {/* Header Strip inside Card */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "1rem",
            marginBottom: "1.5rem",
          }}
        >
          {/* Left Title with Orange Squircle */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.85rem" }}>
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
              }}
            >
              <BarChart3 size={22} color="#ffffff" />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                <h2
                  style={{
                    fontSize: "1.35rem",
                    fontWeight: 800,
                    color: "#ffffff",
                    margin: 0,
                  }}
                >
                  Sales Analytics & Revenue Reports
                </h2>
              </div>
            </div>
          </div>

          {/* Right Corner: Print Report Button */}
          <button
            onClick={() => window.print()}
            style={{
              background: "rgba(255, 255, 255, 0.06)",
              border: "1px solid rgba(255, 255, 255, 0.14)",
              borderRadius: "10px",
              padding: "0.48rem 0.95rem",
              color: "#ffffff",
              fontSize: "0.8rem",
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "0.45rem",
              transition: "all 0.15s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(255, 255, 255, 0.12)";
              e.currentTarget.style.borderColor = "rgba(245, 158, 11, 0.4)";
              e.currentTarget.style.transform = "translateY(-1px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(255, 255, 255, 0.06)";
              e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.14)";
              e.currentTarget.style.transform = "translateY(0)";
            }}
            title="Print or export PDF of the report"
          >
            <Printer size={14} color="#f59e0b" />
            <span>Print Report</span>
          </button>
        </div>

        {/* Filters and Fetch Action Bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.55rem",
            flexWrap: "wrap",
            marginBottom: "1.5rem",
          }}
        >
            {/* Quick Period Buttons */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                background: "rgba(255, 255, 255, 0.04)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: "10px",
                padding: "3px",
                gap: "3px",
              }}
            >
              {[
                { id: "today", label: "Today" },
                { id: "week", label: "7 Days" },
                { id: "month", label: "This Month" },
                { id: "all", label: "All Time" },
              ].map((p) => {
                const active = filterPeriod === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => {
                      setFilterPeriod(p.id);
                      if (p.id === "today") {
                        setStartDate(todayYMD);
                        setEndDate(todayYMD);
                      } else if (p.id === "week") {
                        setStartDate(sevenDaysYMD);
                        setEndDate(todayYMD);
                      } else if (p.id === "month") {
                        setStartDate(monthStartYMD);
                        setEndDate(todayYMD);
                      } else if (p.id === "all") {
                        setStartDate("");
                        setEndDate("");
                      }
                    }}
                    style={{
                      background: active
                        ? "linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)"
                        : "transparent",
                      color: active ? "#ffffff" : "#94a3b8",
                      border: "none",
                      borderRadius: "7px",
                      padding: "0.38rem 0.65rem",
                      fontSize: "0.76rem",
                      fontWeight: active ? 700 : 500,
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                    onMouseEnter={(e) => {
                      if (!active) e.currentTarget.style.color = "#ffffff";
                    }}
                    onMouseLeave={(e) => {
                      if (!active) e.currentTarget.style.color = "#94a3b8";
                    }}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>

            {/* Calendar Date-to-Date Range Picker */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.35rem",
                background:
                  filterPeriod === "custom"
                    ? "rgba(245, 158, 11, 0.12)"
                    : "rgba(255, 255, 255, 0.04)",
                border:
                  filterPeriod === "custom"
                    ? "1.5px solid rgba(245, 158, 11, 0.5)"
                    : "1px solid rgba(255, 255, 255, 0.09)",
                borderRadius: "10px",
                padding: "0.32rem 0.65rem",
                transition: "all 0.15s ease",
              }}
            >
              <span
                onClick={() => {
                  try {
                    startInputRef.current?.showPicker();
                  } catch {}
                }}
                style={{ cursor: "pointer", display: "flex", alignItems: "center" }}
                title="Click to select dates"
              >
                <Calendar size={14} color="#f59e0b" style={{ flexShrink: 0 }} />
              </span>
              <input
                ref={startInputRef}
                type="date"
                className="clean-date-input"
                value={startDate}
                max={endDate && endDate < todayYMD ? endDate : todayYMD}
                onClick={(e) => {
                  try {
                    e.currentTarget.showPicker();
                  } catch {}
                }}
                onChange={(e) => {
                  const val = e.target.value;
                  const capped = val && val > todayYMD ? todayYMD : val;
                  setStartDate(capped);
                  setFilterPeriod("custom");
                }}
                style={{
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  color: "#ffffff",
                  fontSize: "0.76rem",
                  fontFamily: "inherit",
                  colorScheme: "dark",
                  cursor: "pointer",
                }}
                title="From Date (Future dates disabled)"
              />
              <span
                style={{
                  color: "#94a3b8",
                  fontSize: "0.72rem",
                  fontWeight: 600,
                  userSelect: "none",
                }}
              >
                to
              </span>
              <input
                type="date"
                className="clean-date-input"
                value={endDate}
                min={startDate || undefined}
                max={todayYMD}
                onClick={(e) => {
                  try {
                    e.currentTarget.showPicker();
                  } catch {}
                }}
                onChange={(e) => {
                  const val = e.target.value;
                  const capped = val && val > todayYMD ? todayYMD : val;
                  setEndDate(capped);
                  setFilterPeriod("custom");
                }}
                style={{
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  color: "#ffffff",
                  fontSize: "0.76rem",
                  fontFamily: "inherit",
                  colorScheme: "dark",
                  cursor: "pointer",
                }}
                title="To Date (Future dates disabled)"
              />
            </div>

            {/* Fetch Data Button */}
            <button
              onClick={handleFetchData}
              style={{
                background: "linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)",
                border: "none",
                borderRadius: "10px",
                padding: "0.45rem 0.85rem",
                color: "#ffffff",
                fontSize: "0.78rem",
                fontWeight: 700,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "0.4rem",
                boxShadow: "0 3px 10px rgba(245, 158, 11, 0.35)",
                transition: "all 0.15s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = "0.92";
                e.currentTarget.style.transform = "translateY(-1px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = "1";
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              <RefreshCw
                size={13}
                style={{
                  transition: "transform 0.45s ease",
                  transform: isFetching ? "rotate(360deg)" : "none",
                }}
              />
              <span>Fetch Data</span>
            </button>

          </div>

        {/* 4 Financial Metric Cards */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
            gap: "1rem",
            marginBottom: "1.5rem",
          }}
        >
          <div
            style={{
              background: "#080d1a",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "12px",
              padding: "1.1rem",
            }}
          >
            <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>
              Total Gross Revenue
            </div>
            <div
              style={{
                fontSize: "1.4rem",
                fontWeight: 800,
                color: "#f59e0b",
                marginTop: "4px",
              }}
            >
              {formatCurrency(totalRevenue)}
            </div>
            <div style={{ fontSize: "0.7rem", color: "#64748b", marginTop: "3px" }}>
              Across {filteredOrders.length} settled tickets
            </div>
          </div>

          <div
            style={{
              background: "#080d1a",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "12px",
              padding: "1.1rem",
            }}
          >
            <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>
              Total Orders
            </div>
            <div
              style={{
                fontSize: "1.4rem",
                fontWeight: 800,
                color: "#ffffff",
                marginTop: "4px",
              }}
            >
              {filteredOrders.length}
            </div>
            <div style={{ fontSize: "0.7rem", color: "#64748b", marginTop: "3px" }}>
              Settled dining orders
            </div>
          </div>

          <div
            style={{
              background: "#080d1a",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "12px",
              padding: "1.1rem",
            }}
          >
            <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>
              GST & Tax Collected
            </div>
            <div
              style={{
                fontSize: "1.4rem",
                fontWeight: 800,
                color: "#10b981",
                marginTop: "4px",
              }}
            >
              {formatCurrency(totalTax)}
            </div>
            <div style={{ fontSize: "0.7rem", color: "#64748b", marginTop: "3px" }}>
              Standard 5% Food GST
            </div>
          </div>

          <div
            style={{
              background: "#080d1a",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "12px",
              padding: "1.1rem",
            }}
          >
            <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>
              Service Charges
            </div>
            <div
              style={{
                fontSize: "1.4rem",
                fontWeight: 800,
                color: "#38bdf8",
                marginTop: "4px",
              }}
            >
              {formatCurrency(totalService)}
            </div>
            <div style={{ fontSize: "0.7rem", color: "#64748b", marginTop: "3px" }}>
              Staff & facility tips
            </div>
          </div>
        </div>

        {/* Two Column Grid: Payment Method Distribution & Top Dishes */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
            gap: "1.25rem",
          }}
        >
          {/* Payment Methods Breakdown */}
          <div
            style={{
              background: "#080d1a",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "14px",
              padding: "1.25rem",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}
          >
            <h3
              style={{
                fontSize: "0.95rem",
                fontWeight: 700,
                color: "#ffffff",
                marginBottom: "1rem",
              }}
            >
              Payment Channel Distribution
            </h3>

            {/* UPI Bar */}
            <div style={{ marginBottom: "1rem" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "0.82rem",
                  marginBottom: "4px",
                }}
              >
                <span
                  style={{
                    color: "#38bdf8",
                    display: "flex",
                    alignItems: "center",
                    gap: "5px",
                    fontWeight: 700,
                  }}
                >
                  <Smartphone size={14} /> UPI Payments ({upiPercent}%)
                </span>
                <span style={{ color: "#ffffff", fontWeight: 800 }}>
                  {formatCurrency(paymentStats.upi)}
                </span>
              </div>
              <div
                style={{
                  width: "100%",
                  height: "8px",
                  background: "rgba(255,255,255,0.06)",
                  borderRadius: "4px",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${upiPercent}%`,
                    height: "100%",
                    background: "#38bdf8",
                  }}
                />
              </div>
            </div>

            {/* Cash Bar */}
            <div style={{ marginBottom: "1rem" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "0.82rem",
                  marginBottom: "4px",
                }}
              >
                <span
                  style={{
                    color: "#10b981",
                    display: "flex",
                    alignItems: "center",
                    gap: "5px",
                    fontWeight: 700,
                  }}
                >
                  <Banknote size={14} /> Cash ({cashPercent}%)
                </span>
                <span style={{ color: "#ffffff", fontWeight: 800 }}>
                  {formatCurrency(paymentStats.cash)}
                </span>
              </div>
              <div
                style={{
                  width: "100%",
                  height: "8px",
                  background: "rgba(255,255,255,0.06)",
                  borderRadius: "4px",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${cashPercent}%`,
                    height: "100%",
                    background: "#10b981",
                  }}
                />
              </div>
            </div>

            {/* Card Bar */}
            <div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "0.82rem",
                  marginBottom: "4px",
                }}
              >
                <span
                  style={{
                    color: "#c084fc",
                    display: "flex",
                    alignItems: "center",
                    gap: "5px",
                    fontWeight: 700,
                  }}
                >
                  <CreditCard size={14} /> Card & POS Terminal ({cardPercent}%)
                </span>
                <span style={{ color: "#ffffff", fontWeight: 800 }}>
                  {formatCurrency(paymentStats.card)}
                </span>
              </div>
              <div
                style={{
                  width: "100%",
                  height: "8px",
                  background: "rgba(255,255,255,0.06)",
                  borderRadius: "4px",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${cardPercent}%`,
                    height: "100%",
                    background: "#c084fc",
                  }}
                />
              </div>
            </div>
          </div>

          {/* Top Selling Items Ranking */}
          <div
            style={{
              background: "#080d1a",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "14px",
              padding: "1.25rem",
              display: "flex",
              flexDirection: "column",
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
              <h3
                style={{
                  fontSize: "0.95rem",
                  fontWeight: 700,
                  color: "#ffffff",
                  margin: 0,
                }}
              >
                Top Selling Items
              </h3>
              {sortedDishes.length > 3 && (
                <button
                  onClick={() => setShowAllDishes((prev) => !prev)}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "#f59e0b",
                    fontSize: "0.78rem",
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "3px",
                    padding: 0,
                  }}
                >
                  <span>{showAllDishes ? "Show Top 3" : "View All"}</span>
                  <ArrowRight size={13} />
                </button>
              )}
            </div>

            <div
              className="no-scrollbar"
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.6rem",
                maxHeight: "155px",
                overflowY: "auto",
                scrollbarWidth: "none",
                msOverflowStyle: "none",
              }}
            >
              {displayedDishes.length === 0 ? (
                <div
                  style={{
                    padding: "2rem 1rem",
                    textAlign: "center",
                    color: "#64748b",
                    fontSize: "0.82rem",
                  }}
                >
                  No orders recorded for this period
                </div>
              ) : (
                displayedDishes.map(([name, qty], index) => (
                <div
                  key={name}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "0.5rem 0.65rem",
                    borderRadius: "8px",
                    background: "rgba(255, 255, 255, 0.02)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span
                      style={{
                        width: "22px",
                        height: "22px",
                        borderRadius: "50%",
                        background:
                          index === 0
                            ? "#f59e0b"
                            : index === 1
                            ? "#64748b"
                            : "rgba(255,255,255,0.1)",
                        color: index <= 1 ? "#000000" : "#ffffff",
                        fontWeight: 800,
                        fontSize: "0.72rem",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {index + 1}
                    </span>
                    <span
                      style={{
                        fontSize: "0.85rem",
                        fontWeight: 600,
                        color: "#ffffff",
                      }}
                    >
                      {name}
                    </span>
                  </div>
                  <span
                    style={{
                      fontSize: "0.82rem",
                      fontWeight: 700,
                      color: "#fbbf24",
                    }}
                  >
                    {qty} orders
                  </span>
                </div>
              )))}
            </div>
          </div>
        </div>
      </div>

      {/* Printable Sales & Revenue Report (Screen hidden, visible in window.print()) */}
      <div
        id="printable-report"
        style={{
          fontFamily: "'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
          color: "#0f172a",
          lineHeight: "1.4",
          fontSize: "12px",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            borderBottom: "2px solid #0f172a",
            paddingBottom: "12px",
            marginBottom: "16px",
          }}
        >
          <div>
            <h1
              style={{
                fontSize: "20px",
                fontWeight: 900,
                color: "#0f172a",
                margin: "0 0 2px 0",
                letterSpacing: "0.04em",
                textTransform: "uppercase",
              }}
            >
              AVSR FOOD COURT
            </h1>
            <div style={{ fontSize: "11px", color: "#475569", fontWeight: 500 }}>
              Plot 12, Food Street, Jubilee Enclave • Ph: +91 98490 12345 • GSTIN: 36AAJCS8214M1ZV
            </div>
            <div
              style={{
                fontSize: "13px",
                fontWeight: 800,
                color: "#b45309",
                marginTop: "4px",
                letterSpacing: "0.02em",
              }}
            >
              SALES & REVENUE ANALYTICS REPORT
            </div>
          </div>
          <div style={{ textAlign: "right", fontSize: "11px", color: "#334155" }}>
            <div>
              <strong>Generated:</strong>{" "}
              {new Date().toLocaleDateString("en-IN", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })}{" "}
              {new Date().toLocaleTimeString("en-IN", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </div>
            <div>
              <strong>Filter Period:</strong> {getFilterPeriodLabel()}
            </div>
            <div>
              <strong>Total Orders:</strong> {filteredOrders.length}
            </div>
          </div>
        </div>

        {/* Key Financial Metrics Table */}
        <div style={{ marginBottom: "18px" }}>
          <h3
            style={{
              fontSize: "12.5px",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.03em",
              margin: "0 0 6px 0",
              color: "#0f172a",
            }}
          >
            1. Executive Financial Summary
          </h3>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "11px",
            }}
          >
            <thead>
              <tr style={{ background: "#f1f5f9" }}>
                <th style={{ border: "1px solid #cbd5e1", padding: "6px 8px", textAlign: "left" }}>Gross Revenue</th>
                <th style={{ border: "1px solid #cbd5e1", padding: "6px 8px", textAlign: "left" }}>Net Food Sales</th>
                <th style={{ border: "1px solid #cbd5e1", padding: "6px 8px", textAlign: "left" }}>Total GST (5%)</th>
                <th style={{ border: "1px solid #cbd5e1", padding: "6px 8px", textAlign: "left" }}>Service Charges</th>
                <th style={{ border: "1px solid #cbd5e1", padding: "6px 8px", textAlign: "left" }}>Total Orders</th>
                <th style={{ border: "1px solid #cbd5e1", padding: "6px 8px", textAlign: "left" }}>Avg Ticket</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ border: "1px solid #cbd5e1", padding: "6px 8px", fontWeight: 800, fontSize: "13px", color: "#047857" }}>
                  {formatCurrency(totalRevenue)}
                </td>
                <td style={{ border: "1px solid #cbd5e1", padding: "6px 8px", fontWeight: 700 }}>
                  {formatCurrency(Math.max(0, totalRevenue - totalTax - totalService))}
                </td>
                <td style={{ border: "1px solid #cbd5e1", padding: "6px 8px" }}>
                  {formatCurrency(totalTax)}
                </td>
                <td style={{ border: "1px solid #cbd5e1", padding: "6px 8px" }}>
                  {formatCurrency(totalService)}
                </td>
                <td style={{ border: "1px solid #cbd5e1", padding: "6px 8px", fontWeight: 700 }}>
                  {filteredOrders.length}
                </td>
                <td style={{ border: "1px solid #cbd5e1", padding: "6px 8px", fontWeight: 700 }}>
                  {formatCurrency(averageBill)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Payment Breakdown & Top Selling in 2 columns */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "16px",
            marginBottom: "18px",
          }}
        >
          {/* Payment Method Distribution */}
          <div>
            <h3
              style={{
                fontSize: "12.5px",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.03em",
                margin: "0 0 6px 0",
                color: "#0f172a",
              }}
            >
              2. Payment Channel Breakdown
            </h3>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
              <thead>
                <tr style={{ background: "#f1f5f9" }}>
                  <th style={{ border: "1px solid #cbd5e1", padding: "6px 8px", textAlign: "left" }}>Channel</th>
                  <th style={{ border: "1px solid #cbd5e1", padding: "6px 8px", textAlign: "right" }}>Amount</th>
                  <th style={{ border: "1px solid #cbd5e1", padding: "6px 8px", textAlign: "right" }}>Share %</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ border: "1px solid #cbd5e1", padding: "6px 8px", fontWeight: 600 }}>UPI / QR Pay</td>
                  <td style={{ border: "1px solid #cbd5e1", padding: "6px 8px", textAlign: "right", fontWeight: 700 }}>
                    {formatCurrency(paymentStats.upi)}
                  </td>
                  <td style={{ border: "1px solid #cbd5e1", padding: "6px 8px", textAlign: "right" }}>{upiPercent}%</td>
                </tr>
                <tr>
                  <td style={{ border: "1px solid #cbd5e1", padding: "6px 8px", fontWeight: 600 }}>Cash</td>
                  <td style={{ border: "1px solid #cbd5e1", padding: "6px 8px", textAlign: "right", fontWeight: 700 }}>
                    {formatCurrency(paymentStats.cash)}
                  </td>
                  <td style={{ border: "1px solid #cbd5e1", padding: "6px 8px", textAlign: "right" }}>{cashPercent}%</td>
                </tr>
                <tr>
                  <td style={{ border: "1px solid #cbd5e1", padding: "6px 8px", fontWeight: 600 }}>Card / POS Swipe</td>
                  <td style={{ border: "1px solid #cbd5e1", padding: "6px 8px", textAlign: "right", fontWeight: 700 }}>
                    {formatCurrency(paymentStats.card)}
                  </td>
                  <td style={{ border: "1px solid #cbd5e1", padding: "6px 8px", textAlign: "right" }}>{cardPercent}%</td>
                </tr>
                <tr style={{ background: "#f8fafc", fontWeight: 800 }}>
                  <td style={{ border: "1px solid #cbd5e1", padding: "6px 8px" }}>Total Settlement</td>
                  <td style={{ border: "1px solid #cbd5e1", padding: "6px 8px", textAlign: "right" }}>
                    {formatCurrency(totalRevenue)}
                  </td>
                  <td style={{ border: "1px solid #cbd5e1", padding: "6px 8px", textAlign: "right" }}>100%</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Top Selling Items */}
          <div>
            <h3
              style={{
                fontSize: "12.5px",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.03em",
                margin: "0 0 6px 0",
                color: "#0f172a",
              }}
            >
              3. Top Selling Items
            </h3>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
              <thead>
                <tr style={{ background: "#f1f5f9" }}>
                  <th style={{ border: "1px solid #cbd5e1", padding: "6px 8px", width: "35px", textAlign: "center" }}>#</th>
                  <th style={{ border: "1px solid #cbd5e1", padding: "6px 8px", textAlign: "left" }}>Dish / Item Name</th>
                  <th style={{ border: "1px solid #cbd5e1", padding: "6px 8px", textAlign: "right" }}>Qty Sold</th>
                </tr>
              </thead>
              <tbody>
                {sortedDishes.length === 0 ? (
                  <tr>
                    <td colSpan={3} style={{ border: "1px solid #cbd5e1", padding: "8px", textAlign: "center", color: "#64748b" }}>
                      No items sold during this period.
                    </td>
                  </tr>
                ) : (
                  sortedDishes.slice(0, 7).map(([name, qty], idx) => (
                    <tr key={name}>
                      <td style={{ border: "1px solid #cbd5e1", padding: "6px 8px", textAlign: "center", fontWeight: 700 }}>
                        {idx + 1}
                      </td>
                      <td style={{ border: "1px solid #cbd5e1", padding: "6px 8px", fontWeight: 600 }}>{name}</td>
                      <td style={{ border: "1px solid #cbd5e1", padding: "6px 8px", textAlign: "right", fontWeight: 700 }}>
                        {qty} orders
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Settled Orders Itemized List */}
        {filteredOrders.length > 0 && (
          <div style={{ marginBottom: "20px" }}>
            <h3
              style={{
                fontSize: "12.5px",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.03em",
                margin: "0 0 6px 0",
                color: "#0f172a",
              }}
            >
              4. Filtered Orders Summary ({filteredOrders.length} records)
            </h3>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "10.5px" }}>
              <thead>
                <tr style={{ background: "#f1f5f9" }}>
                  <th style={{ border: "1px solid #cbd5e1", padding: "5px 7px", textAlign: "left" }}>Order #</th>
                  <th style={{ border: "1px solid #cbd5e1", padding: "5px 7px", textAlign: "left" }}>Date / Time</th>
                  <th style={{ border: "1px solid #cbd5e1", padding: "5px 7px", textAlign: "left" }}>Table</th>
                  <th style={{ border: "1px solid #cbd5e1", padding: "5px 7px", textAlign: "left" }}>Mode</th>
                  <th style={{ border: "1px solid #cbd5e1", padding: "5px 7px", textAlign: "left" }}>Items Summary</th>
                  <th style={{ border: "1px solid #cbd5e1", padding: "5px 7px", textAlign: "right" }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((ord, idx) => {
                  const itemSummary = (ord.items || [])
                    .map((i) => `${i.name || "Item"}${i.quantity > 1 ? ` (x${i.quantity})` : ""}`)
                    .join(", ");
                  return (
                    <tr key={ord.id || idx} style={{ pageBreakInside: "avoid" }}>
                      <td style={{ border: "1px solid #cbd5e1", padding: "5px 7px", fontFamily: "monospace", fontWeight: 600 }}>
                        #{ord.id || ord.orderNumber || idx + 1}
                      </td>
                      <td style={{ border: "1px solid #cbd5e1", padding: "5px 7px", whiteSpace: "nowrap" }}>
                        {ord.date || ord.time || "N/A"}
                      </td>
                      <td style={{ border: "1px solid #cbd5e1", padding: "5px 7px" }}>
                        {ord.table ? `T-${ord.table}` : "Takeaway / Direct"}
                      </td>
                      <td style={{ border: "1px solid #cbd5e1", padding: "5px 7px", fontWeight: 600, textTransform: "uppercase" }}>
                        {ord.paymentMethod || "CASH"}
                      </td>
                      <td
                        style={{
                          border: "1px solid #cbd5e1",
                          padding: "5px 7px",
                          maxWidth: "260px",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {itemSummary || "N/A"}
                      </td>
                      <td style={{ border: "1px solid #cbd5e1", padding: "5px 7px", textAlign: "right", fontWeight: 700 }}>
                        {formatCurrency(ord.grandTotal || ord.total || 0)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer Sign-off */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            marginTop: "24px",
            paddingTop: "12px",
            borderTop: "1px solid #cbd5e1",
            fontSize: "11px",
            color: "#64748b",
            pageBreakInside: "avoid",
          }}
        >
          <div>
            <div>System generated via AVSR Management POS Admin Portal.</div>
            <div>Confidential internal management record.</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ marginBottom: "28px" }}>Authorized Signatory:</div>
            <div style={{ borderTop: "1px dashed #64748b", width: "180px", textAlign: "center", paddingTop: "4px" }}>
              Manager / Auditor
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
