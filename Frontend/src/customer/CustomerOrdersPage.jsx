import React from "react";
import {
  ChefHat,
  ArrowLeft,
  ShoppingBag,
  Clock,
  MapPin,
  CheckCircle,
  FileText,
  Utensils,
  ArrowRight,
} from "lucide-react";
import { CustomerProfileDropdown } from "./CustomerProfileDropdown";

/**
 * CustomerOrdersPage - Dedicated My Orders page (Route: /my-orders)
 * Displays:
 * - Active / Recent takeaway orders
 * - Order ID, Items, Total Price, Pickup Time
 * - Status badges (Preparing, Ready, Completed)
 * - Navigation back to home or takeaway menu
 */
export function CustomerOrdersPage({
  customerUser,
  placedOrder,
  onNavigate,
  onLogout,
  restaurantName = "Bhanu Bistro",
  restaurantLogo = "",
}) {
  // Dummy orders list if placedOrder is empty
  const orders = placedOrder
    ? [placedOrder]
    : [
        {
          orderNumber: "ORD-9421",
          date: "2026-11-11",
          pickupTime: "08:15 PM",
          status: "Preparing",
          paymentMethod: "UPI",
          grandTotal: 580,
          items: [
            { id: "item-biryani-1", name: "Hyderabadi Chicken Dum Biryani", quantity: 1, price: 380 },
            { id: "item-fastfood-1", name: "Crispy Corn Pepper Fry", quantity: 1, price: 200 },
          ],
        },
        {
          orderNumber: "ORD-8812",
          date: "2026-11-09",
          pickupTime: "07:30 PM",
          status: "Completed",
          paymentMethod: "CARD",
          grandTotal: 450,
          items: [
            { id: "item-paneer-1", name: "Paneer Butter Masala", quantity: 1, price: 320 },
            { id: "item-roti-1", name: "Butter Naan (2 pcs)", quantity: 1, price: 130 },
          ],
        },
      ];

  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100%",
        backgroundColor: "#0d0604",
        backgroundImage:
          "radial-gradient(ellipse at 50% 15%, rgba(234, 88, 12, 0.2) 0%, rgba(13, 6, 4, 0.92) 75%, #0a0403 100%), linear-gradient(rgba(10, 5, 3, 0.72), rgba(10, 5, 3, 0.88)), url('/assets/login-restaurant.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed",
        display: "flex",
        flexDirection: "column",
        color: "#f7efe8",
      }}
    >
      {/* ── Header ────────────────────────────────────────────── */}
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "10px 24px",
          minHeight: "56px",
          background: "rgba(16, 9, 7, 0.92)",
          borderBottom: "1px solid rgba(245, 158, 11, 0.25)",
          backdropFilter: "blur(12px)",
          position: "sticky",
          top: 0,
          zIndex: 100,
        }}
      >
        <div
          onClick={() => onNavigate("/")}
          style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}
        >
          <div
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "50%",
              background: "linear-gradient(135deg, #f59e0b, #d97706)",
              border: "1.5px solid #f59e0b",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              overflow: "hidden",
            }}
          >
            {restaurantLogo ? (
              <img src={restaurantLogo} alt={restaurantName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <ChefHat size={20} />
            )}
          </div>
          <div>
            <strong style={{ display: "block", fontSize: "16px", color: "#ffffff", fontWeight: 800, lineHeight: 1.15 }}>
              {restaurantName}
            </strong>
            <small style={{ color: "#f59e0b", fontSize: "9.5px", fontWeight: 700, letterSpacing: "1.5px", textTransform: "uppercase" }}>
              Fine Dining &amp; Takeaway
            </small>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <button
            type="button"
            onClick={() => onNavigate("/")}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              background: "rgba(255, 255, 255, 0.08)",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              color: "#f5ede6",
              padding: "5px 13px",
              borderRadius: "20px",
              fontSize: "12px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            <ArrowLeft size={13} /> Back to Home
          </button>

          <CustomerProfileDropdown
            customerUser={customerUser}
            onNavigate={onNavigate}
            onLogout={onLogout}
            currentRoute="/my-orders"
          />
        </div>
      </header>

      {/* ── Page Content ──────────────────────────────────────── */}
      <main
        style={{
          flex: 1,
          maxWidth: "1160px",
          width: "100%",
          margin: "0 auto",
          padding: "24px 20px 40px",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "20px",
            flexWrap: "wrap",
            gap: "14px",
            background: "rgba(22, 12, 8, 0.78)",
            border: "1px solid rgba(245, 158, 11, 0.3)",
            borderRadius: "16px",
            padding: "14px 20px",
            backdropFilter: "blur(14px)",
            boxShadow: "0 10px 30px rgba(0, 0, 0, 0.55)",
          }}
        >
          <div>
            <h1
              style={{
                fontFamily: "'Cinzel', Georgia, serif",
                fontSize: "24px",
                fontWeight: 800,
                color: "#ffffff",
                margin: "0 0 4px 0",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                textShadow: "0 2px 10px rgba(0, 0, 0, 0.6)",
                letterSpacing: "0.5px",
              }}
            >
              <span style={{ color: "#f59e0b" }}>📋</span> My Orders
            </h1>
            <p
              style={{
                fontSize: "13px",
                color: "#fef3c7",
                fontWeight: 600,
                margin: 0,
                textShadow: "0 1px 4px rgba(0, 0, 0, 0.8)",
                lineHeight: 1.4,
              }}
            >
              View and track your takeaway orders from Bhanu Bistro.
            </p>
          </div>

          <button
            type="button"
            onClick={() => onNavigate("/menu")}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              background: "linear-gradient(135deg, #f97316 0%, #ea580c 100%)",
              color: "#ffffff",
              padding: "8px 16px",
              borderRadius: "20px",
              fontSize: "12.5px",
              fontWeight: 700,
              border: "none",
              cursor: "pointer",
              boxShadow: "0 4px 14px rgba(234, 88, 12, 0.35)",
              transition: "transform 0.15s ease",
            }}
          >
            <ShoppingBag size={15} /> Order Takeaway
          </button>
        </div>

        {/* Orders List: Column-wise Grid Layout (Compact Size) */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "14px",
            alignItems: "stretch",
          }}
        >
          {orders.map((ord, idx) => (
            <div
              key={ord.orderNumber || idx}
              style={{
                background: "#ffffff",
                borderRadius: "12px",
                padding: "12px 16px",
                color: "#1a100b",
                boxShadow: "0 8px 22px rgba(0,0,0,0.35)",
                border: "1px solid rgba(245, 158, 11, 0.22)",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                boxSizing: "border-box",
              }}
            >
              <div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    borderBottom: "1px solid #ebdcd1",
                    paddingBottom: "8px",
                    marginBottom: "10px",
                    flexWrap: "wrap",
                    gap: "6px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                    <span
                      style={{
                        background: "#fff7ed",
                        color: "#ea580c",
                        border: "1px solid #fed7aa",
                        padding: "2px 7px",
                        borderRadius: "5px",
                        fontSize: "11px",
                        fontWeight: 800,
                      }}
                    >
                      {ord.orderNumber}
                    </span>
                    <span style={{ fontSize: "11px", color: "#6f6158" }}>
                      📅 {ord.date} • 🕒 {ord.pickupTime}
                    </span>
                  </div>

                  <div
                    style={{
                      background: ord.status === "Completed" ? "#f0fdf4" : "#eff6ff",
                      color: ord.status === "Completed" ? "#166534" : "#1d4ed8",
                      border: `1px solid ${ord.status === "Completed" ? "#bbf7d0" : "#bfdbfe"}`,
                      padding: "2px 8px",
                      borderRadius: "16px",
                      fontSize: "10.5px",
                      fontWeight: 700,
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    <span
                      style={{
                        width: "5px",
                        height: "5px",
                        borderRadius: "50%",
                        background: ord.status === "Completed" ? "#22c55e" : "#3b82f6",
                      }}
                    />
                    {ord.status || "Confirmed"}
                  </div>
                </div>

                {/* Items */}
                <div style={{ display: "flex", flexDirection: "column", gap: "5px", marginBottom: "10px" }}>
                  {(ord.items || []).map((item, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: "12px" }}>
                      <span>
                        <strong style={{ color: "#ea580c" }}>{item.quantity}x</strong> {item.name}
                      </span>
                      <strong style={{ color: "#1a100b" }}>₹{Number(item.price || 0) * (item.quantity || 1)}</strong>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total & Action */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  borderTop: "1px solid #ebdcd1",
                  paddingTop: "8px",
                  marginTop: "auto",
                }}
              >
                <div>
                  <span style={{ fontSize: "11px", color: "#6f6158" }}>Payment: </span>
                  <strong style={{ fontSize: "11px", color: "#166534" }}>{ord.paymentMethod || "UPI"} (Paid)</strong>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div style={{ textAlign: "right" }}>
                    <small style={{ display: "block", fontSize: "9.5px", color: "#8c7b70" }}>Total Amount</small>
                    <strong style={{ fontSize: "14px", color: "#ea580c", fontWeight: 800 }}>
                      ₹{Number(ord.grandTotal || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </strong>
                  </div>

                  <button
                    type="button"
                    onClick={() => onNavigate("/menu")}
                    style={{
                      background: "#faf7f4",
                      border: "1.2px solid #ea580c",
                      color: "#ea580c",
                      padding: "4px 10px",
                      borderRadius: "6px",
                      fontSize: "11px",
                      fontWeight: 700,
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                  >
                    Reorder
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

export default CustomerOrdersPage;
