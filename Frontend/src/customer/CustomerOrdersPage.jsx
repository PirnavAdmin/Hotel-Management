import React from "react";
import {
  ChefHat,
  ArrowLeft,
  ShoppingBag,
  Calendar,
  User,
  RotateCcw,
  Check,
  Bell,
  Clock,
} from "lucide-react";
import { CustomerProfileDropdown } from "./CustomerProfileDropdown";

/**
 * CustomerOrdersPage - Dedicated My Orders page (Route: /my-orders)
 * Matches Image 1 UI:
 * - 5 Portrait-oriented cards side-by-side
 * - Card header: ORD-XXXX + status indicator dot
 * - Date & Time with Calendar icon (e.g. 11 Nov, 08:15 PM)
 * - Customer name with User icon (e.g. Priya S.)
 * - Centered status pill badge (Preparing, Completed, Ready for Pickup, Pending)
 * - Summary row: Items count + Total Price
 * - Multiplier item list: 1 × Item Name
 * - Outlined Reorder pill button
 */
export function CustomerOrdersPage({
  customerUser,
  placedOrder,
  onNavigate,
  onLogout,
  restaurantName = "Bhanu Bistro",
  restaurantLogo = "",
}) {
  const customerName = customerUser?.name
    ? `${customerUser.name.split(" ")[0]} ${customerUser.name.split(" ")[1] ? customerUser.name.split(" ")[1][0] + "." : ""}`.trim()
    : "Priya S.";

  // Format date and time to match "11 Nov, 08:15 PM"
  const formatOrderDateTime = (dateStr, timeStr) => {
    if (!dateStr) return timeStr || "";
    if (dateStr.includes("Nov") || dateStr.includes("Oct") || dateStr.includes("Dec")) {
      return `${dateStr}, ${timeStr || ""}`.trim().replace(/,\s*$/, "");
    }
    try {
      const d = new Date(dateStr);
      if (!isNaN(d.getTime())) {
        const day = d.getDate();
        const month = d.toLocaleString("en-US", { month: "short" });
        return `${day < 10 ? "0" + day : day} ${month}, ${timeStr || ""}`.trim().replace(/,\s*$/, "");
      }
    } catch {}
    return `${dateStr}${timeStr ? ", " + timeStr : ""}`;
  };

  // 5 Orders matching Image 1 mockup
  const defaultOrders = [
    {
      orderNumber: "ORD-9421",
      date: "11 Nov",
      pickupTime: "08:15 PM",
      customerName,
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
      date: "09 Nov",
      pickupTime: "07:30 PM",
      customerName,
      status: "Completed",
      paymentMethod: "CARD",
      grandTotal: 450,
      items: [
        { id: "item-paneer-1", name: "Paneer Butter Masala", quantity: 1, price: 320 },
        { id: "item-roti-1", name: "Butter Naan (2 pcs)", quantity: 1, price: 130 },
      ],
    },
    {
      orderNumber: "ORD-8799",
      date: "08 Nov",
      pickupTime: "06:45 PM",
      customerName,
      status: "Ready for Pickup",
      paymentMethod: "UPI",
      grandTotal: 760,
      items: [
        { id: "item-starter-1", name: "Chicken Tikka", quantity: 1, price: 340 },
        { id: "item-bread-1", name: "Tandoori Roti", quantity: 1, price: 180 },
        { id: "item-side-1", name: "Masala Fries", quantity: 1, price: 240 },
      ],
    },
    {
      orderNumber: "ORD-8765",
      date: "07 Nov",
      pickupTime: "06:10 PM",
      customerName,
      status: "Pending",
      paymentMethod: "UPI",
      grandTotal: 320,
      items: [
        { id: "item-paneer-1", name: "Paneer Butter Masala", quantity: 1, price: 320 },
      ],
    },
    {
      orderNumber: "ORD-8720",
      date: "05 Nov",
      pickupTime: "08:20 PM",
      customerName,
      status: "Completed",
      paymentMethod: "CARD",
      grandTotal: 1240,
      items: [
        { id: "item-biryani-6", name: "Veg Biryani", quantity: 1, price: 280 },
        { id: "item-starter-2", name: "Paneer Tikka", quantity: 1, price: 320 },
        { id: "item-bread-2", name: "Garlic Naan", quantity: 1, price: 240 },
        { id: "item-dessert-1", name: "Chocolate Brownie", quantity: 1, price: 400 },
      ],
    },
  ];

  const orders = placedOrder ? [placedOrder, ...defaultOrders] : defaultOrders;

  // Status badge config matching Image 1
  const getStatusBadgeConfig = (status) => {
    switch (status) {
      case "Preparing":
        return {
          bg: "#eff6ff",
          color: "#2563eb",
          border: "#bfdbfe",
          dot: "#3b82f6",
          icon: ChefHat,
        };
      case "Completed":
        return {
          bg: "#f0fdf4",
          color: "#166534",
          border: "#bbf7d0",
          dot: "#22c55e",
          icon: Check,
        };
      case "Ready for Pickup":
      case "Ready":
        return {
          bg: "#faf5ff",
          color: "#9333ea",
          border: "#e9d5ff",
          dot: "#3b82f6",
          icon: Bell,
        };
      case "Pending":
      default:
        return {
          bg: "#fffbeb",
          color: "#d97706",
          border: "#fde68a",
          dot: "#f59e0b",
          icon: Clock,
        };
    }
  };

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
        fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
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
          background: "rgba(16, 9, 7, 0.94)",
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
          maxWidth: "1360px",
          width: "100%",
          margin: "0 auto",
          padding: "20px 20px 40px",
          boxSizing: "border-box",
        }}
      >
        {/* Banner Strip (Matches Image 1 Header Card) */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "18px",
            flexWrap: "wrap",
            gap: "14px",
            background: "rgba(22, 12, 8, 0.88)",
            border: "1.5px solid rgba(245, 158, 11, 0.35)",
            borderRadius: "16px",
            padding: "14px 22px",
            backdropFilter: "blur(14px)",
            boxShadow: "0 10px 30px rgba(0, 0, 0, 0.55)",
          }}
        >
          <div>
            <h1
              style={{
                fontSize: "22px",
                fontWeight: 800,
                color: "#ffffff",
                margin: "0 0 4px 0",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                letterSpacing: "0.2px",
              }}
            >
              <span>📋</span> My Orders
            </h1>
            <p
              style={{
                fontSize: "12.5px",
                color: "#fef3c7",
                fontWeight: 500,
                margin: 0,
                lineHeight: 1.4,
              }}
            >
              View and track your takeaway orders from {restaurantName}.
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

        {/* Orders Cards Grid: Portrait-Oriented Cards (Exact Replica of Image 1) */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(215px, 1fr))",
            gap: "14px",
            alignItems: "stretch",
          }}
        >
          {orders.map((ord, idx) => {
            const badge = getStatusBadgeConfig(ord.status);
            const StatusIcon = badge.icon;
            const itemCount = (ord.items || []).reduce((acc, it) => acc + (it.quantity || 1), 0);
            const formattedDate = formatOrderDateTime(ord.date, ord.pickupTime);

            return (
              <div
                key={ord.orderNumber || idx}
                style={{
                  background: "#ffffff",
                  borderRadius: "16px",
                  padding: "16px 14px 14px",
                  color: "#1c1109",
                  boxShadow: "0 8px 24px rgba(0, 0, 0, 0.4)",
                  border: "1.5px solid rgba(245, 158, 11, 0.45)",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  boxSizing: "border-box",
                  transition: "transform 0.15s ease, box-shadow 0.15s ease",
                }}
              >
                <div>
                  {/* Top Row: Order ID + Status Dot */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "6px",
                    }}
                  >
                    <span
                      style={{
                        color: "#ea580c",
                        fontSize: "14px",
                        fontWeight: 800,
                        letterSpacing: "0.2px",
                      }}
                    >
                      {ord.orderNumber}
                    </span>
                    <span
                      style={{
                        width: "7px",
                        height: "7px",
                        borderRadius: "50%",
                        background: badge.dot,
                        boxShadow: `0 0 6px ${badge.dot}`,
                      }}
                    />
                  </div>

                  {/* Date & Time Row */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      color: "#8c786a",
                      fontSize: "11px",
                      fontWeight: 600,
                      marginBottom: "4px",
                    }}
                  >
                    <Calendar size={12} color="#ea580c" />
                    <span>{formattedDate}</span>
                  </div>

                  {/* Customer Name Row */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      color: "#4a3b32",
                      fontSize: "11.5px",
                      fontWeight: 600,
                      marginBottom: "10px",
                    }}
                  >
                    <User size={12} color="#8c786a" />
                    <span>{ord.customerName || customerName}</span>
                  </div>

                  {/* Status Badge Pill (Centered / Full-Width matching Image 1) */}
                  <div
                    style={{
                      width: "100%",
                      padding: "5px 0",
                      borderRadius: "20px",
                      fontSize: "11px",
                      fontWeight: 700,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "6px",
                      background: badge.bg,
                      color: badge.color,
                      border: `1px solid ${badge.border}`,
                      marginBottom: "12px",
                      boxSizing: "border-box",
                    }}
                  >
                    <StatusIcon size={13} />
                    <span>{ord.status}</span>
                  </div>

                  {/* Items Count & Total Price Row */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "baseline",
                      marginBottom: "8px",
                      borderBottom: "1px solid #f3ece4",
                      paddingBottom: "8px",
                    }}
                  >
                    <span style={{ fontSize: "11.5px", color: "#4a3b32", fontWeight: 700 }}>
                      {itemCount} {itemCount === 1 ? "Item" : "Items"}
                    </span>
                    <span style={{ fontSize: "14px", color: "#ea580c", fontWeight: 800 }}>
                      ₹{Number(ord.grandTotal || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  {/* Items List */}
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "4px",
                      marginBottom: "14px",
                    }}
                  >
                    {(ord.items || []).map((item, i) => (
                      <div
                        key={i}
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: "5px",
                          fontSize: "11px",
                          lineHeight: 1.35,
                          color: "#2a1d15",
                        }}
                      >
                        <span style={{ color: "#ea580c", fontWeight: 700, flexShrink: 0 }}>
                          {item.quantity} ×
                        </span>
                        <span style={{ wordBreak: "break-word" }}>{item.name}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Bottom Reorder Button */}
                <button
                  type="button"
                  onClick={() => onNavigate("/menu")}
                  style={{
                    width: "100%",
                    height: "32px",
                    borderRadius: "20px",
                    border: "1.5px solid #ea580c",
                    background: "#ffffff",
                    color: "#ea580c",
                    fontSize: "11.5px",
                    fontWeight: 750,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                    marginTop: "auto",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "#fff7ed";
                    e.currentTarget.style.borderColor = "#f97316";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "#ffffff";
                    e.currentTarget.style.borderColor = "#ea580c";
                  }}
                >
                  <RotateCcw size={12} strokeWidth={2.2} />
                  <span>Reorder</span>
                </button>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}

export default CustomerOrdersPage;
