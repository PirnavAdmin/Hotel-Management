import React from "react";
import {
  BarChart3,
  TrendingUp,
  CreditCard,
  Smartphone,
  Banknote,
  Utensils,
  Award,
  Calendar,
} from "lucide-react";
import { formatCurrency } from "../utils/formatCurrency";
import { INITIAL_ORDERS } from "../data/initialOrders";

export function AdminReports({ pastOrders = [], menuItems = [] }) {
  const allOrders =
    pastOrders && pastOrders.length > 0 ? pastOrders : INITIAL_ORDERS;

  const totalRevenue = allOrders.reduce(
    (sum, o) => sum + (Number(o.grandTotal) || 0),
    0
  );

  const totalTax = allOrders.reduce(
    (sum, o) => sum + (Number(o.taxAmount) || 0),
    0
  );

  const totalService = allOrders.reduce(
    (sum, o) => sum + (Number(o.serviceChargeAmount) || 0),
    0
  );

  // Payment breakdown
  const paymentStats = {
    upi: allOrders
      .filter((o) => (o.paymentMethod || "").toLowerCase() === "upi")
      .reduce((s, o) => s + (Number(o.grandTotal) || 0), 0),
    cash: allOrders
      .filter((o) => (o.paymentMethod || "").toLowerCase() === "cash")
      .reduce((s, o) => s + (Number(o.grandTotal) || 0), 0),
    card: allOrders
      .filter((o) => (o.paymentMethod || "").toLowerCase() === "card")
      .reduce((s, o) => s + (Number(o.grandTotal) || 0), 0),
  };

  const upiPercent = totalRevenue ? Math.round((paymentStats.upi / totalRevenue) * 100) : 0;
  const cashPercent = totalRevenue ? Math.round((paymentStats.cash / totalRevenue) * 100) : 0;
  const cardPercent = totalRevenue ? Math.max(0, 100 - upiPercent - cashPercent) : 0;

  // Top selling dishes across settled orders
  const dishCounts = {};
  allOrders.forEach((o) => {
    (o.items || []).forEach((item) => {
      const name = item.name || "Dish";
      dishCounts[name] = (dishCounts[name] || 0) + (item.quantity || 1);
    });
  });

  const sortedDishes = Object.entries(dishCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);

  const averageBill = allOrders.length
    ? Math.round(totalRevenue / allOrders.length)
    : 0;

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
                <span
                  style={{
                    background: "rgba(245, 158, 11, 0.15)",
                    border: "1px solid rgba(245, 158, 11, 0.35)",
                    color: "#f59e0b",
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    padding: "2px 10px",
                    borderRadius: "20px",
                  }}
                >
                  Period: All Time
                </span>
              </div>
              <p
                style={{
                  fontSize: "0.8rem",
                  color: "#94a3b8",
                  margin: "3px 0 0 0",
                }}
              >
                Comprehensive breakdown of restaurant earnings, payment channels, and popular biryanis
              </p>
            </div>
          </div>
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
              Across {allOrders.length} settled tickets
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
              Average Ticket Value
            </div>
            <div
              style={{
                fontSize: "1.4rem",
                fontWeight: 800,
                color: "#ffffff",
                marginTop: "4px",
              }}
            >
              {formatCurrency(averageBill)}
            </div>
            <div style={{ fontSize: "0.7rem", color: "#64748b", marginTop: "3px" }}>
              Per dining table order
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
                  <Banknote size={14} /> Cash Receipts ({cashPercent}%)
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
              Top Selling Dishes & Biryanis
            </h3>

            <div
              style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}
            >
              {sortedDishes.map(([name, qty], index) => (
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
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
