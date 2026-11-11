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
        backgroundColor: "#0c0705",
        backgroundImage:
          "radial-gradient(circle at 50% 20%, rgba(234, 88, 12, 0.12) 0%, transparent 60%), url('/assets/login-restaurant.jpg')",
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
          padding: "12px clamp(20px, 4vw, 64px)",
          minHeight: "72px",
          background: "rgba(16, 9, 7, 0.78)",
          borderBottom: "1px solid rgba(245, 158, 11, 0.2)",
          backdropFilter: "blur(10px)",
          position: "sticky",
          top: 0,
          zIndex: 100,
        }}
      >
        <div
          onClick={() => onNavigate("/")}
          style={{ display: "flex", alignItems: "center", gap: "12px", cursor: "pointer" }}
        >
          <div
            style={{
              width: "44px",
              height: "44px",
              borderRadius: "50%",
              background: "linear-gradient(135deg, #f59e0b, #d97706)",
              border: "2px solid #f59e0b",
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
              <ChefHat size={24} />
            )}
          </div>
          <div>
            <strong style={{ display: "block", fontSize: "18px", color: "#ffffff", fontWeight: 800 }}>
              {restaurantName}
            </strong>
            <small style={{ color: "#f59e0b", fontSize: "11px", fontWeight: 600, letterSpacing: "0.5px" }}>
              Fine Dining &amp; Takeaway
            </small>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
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
              padding: "6px 14px",
              borderRadius: "20px",
              fontSize: "12.5px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            <ArrowLeft size={14} /> Back to Home
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
          maxWidth: "840px",
          width: "100%",
          margin: "0 auto",
          padding: "36px 16px",
          boxSizing: "border-box",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", flexWrap: "wrap", gap: "16px" }}>
          <div>
            <h1 style={{ fontSize: "26px", fontWeight: 800, color: "#ffffff", margin: "0 0 6px 0" }}>
              My Orders
            </h1>
            <p style={{ fontSize: "13.5px", color: "#bfa99b", margin: 0 }}>
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
              padding: "10px 20px",
              borderRadius: "24px",
              fontSize: "13.5px",
              fontWeight: 700,
              border: "none",
              cursor: "pointer",
              boxShadow: "0 4px 14px rgba(234, 88, 12, 0.35)",
            }}
          >
            <ShoppingBag size={16} /> Order Takeaway
          </button>
        </div>

        {/* Orders List */}
        <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
          {orders.map((ord, idx) => (
            <div
              key={ord.orderNumber || idx}
              style={{
                background: "#ffffff",
                borderRadius: "16px",
                padding: "24px 26px",
                color: "#1a100b",
                boxShadow: "0 12px 30px rgba(0,0,0,0.5)",
                border: "1px solid rgba(245, 158, 11, 0.25)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  borderBottom: "1px solid #ebdcd1",
                  paddingBottom: "14px",
                  marginBottom: "16px",
                  flexWrap: "wrap",
                  gap: "10px",
                }}
              >
                <div>
                  <span
                    style={{
                      background: "#fff7ed",
                      color: "#ea580c",
                      border: "1px solid #fed7aa",
                      padding: "3px 10px",
                      borderRadius: "6px",
                      fontSize: "12px",
                      fontWeight: 800,
                    }}
                  >
                    {ord.orderNumber}
                  </span>
                  <span style={{ marginLeft: "12px", fontSize: "13px", color: "#6f6158" }}>
                    📅 {ord.date} • 🕒 {ord.pickupTime}
                  </span>
                </div>

                <div
                  style={{
                    background: ord.status === "Completed" ? "#f0fdf4" : "#eff6ff",
                    color: ord.status === "Completed" ? "#166534" : "#1d4ed8",
                    border: `1px solid ${ord.status === "Completed" ? "#bbf7d0" : "#bfdbfe"}`,
                    padding: "4px 12px",
                    borderRadius: "20px",
                    fontSize: "12px",
                    fontWeight: 700,
                    display: "flex",
                    alignItems: "center",
                    gap: "5px",
                  }}
                >
                  <span
                    style={{
                      width: "6px",
                      height: "6px",
                      borderRadius: "50%",
                      background: ord.status === "Completed" ? "#22c55e" : "#3b82f6",
                    }}
                  />
                  {ord.status || "Confirmed"}
                </div>
              </div>

              {/* Items */}
              <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "16px" }}>
                {(ord.items || []).map((item, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: "14px" }}>
                    <span>
                      <strong style={{ color: "#ea580c" }}>{item.quantity}x</strong> {item.name}
                    </span>
                    <strong style={{ color: "#1a100b" }}>₹{Number(item.price || 0) * (item.quantity || 1)}</strong>
                  </div>
                ))}
              </div>

              {/* Total & Action */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  borderTop: "1px solid #ebdcd1",
                  paddingTop: "14px",
                }}
              >
                <div>
                  <span style={{ fontSize: "12.5px", color: "#6f6158" }}>Payment: </span>
                  <strong style={{ fontSize: "12.5px", color: "#166534" }}>{ord.paymentMethod || "UPI"} (Paid)</strong>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                  <div style={{ textAlign: "right" }}>
                    <small style={{ display: "block", fontSize: "11px", color: "#8c7b70" }}>Total Amount</small>
                    <strong style={{ fontSize: "18px", color: "#ea580c", fontWeight: 800 }}>
                      ₹{Number(ord.grandTotal || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </strong>
                  </div>

                  <button
                    type="button"
                    onClick={() => onNavigate("/menu")}
                    style={{
                      background: "#faf7f4",
                      border: "1.5px solid #ea580c",
                      color: "#ea580c",
                      padding: "6px 14px",
                      borderRadius: "8px",
                      fontSize: "12.5px",
                      fontWeight: 700,
                      cursor: "pointer",
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
