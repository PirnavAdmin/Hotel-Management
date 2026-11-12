import React, { useState } from "react";
import {
  ArrowRight,
  ArrowDown,
  CheckCircle2,
  Clock,
  Search,
  ShoppingCart,
  User,
  CreditCard,
  ChefHat,
  X,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Phone,
  Printer,
  ChevronRight,
  Calendar,
  Layers,
  Flame,
  Utensils
} from "lucide-react";

export function TakeawayOrderFlowView({ onBack }) {
  const [activeFilter, setActiveFilter] = useState("all");
  const [selectedScreenModal, setSelectedScreenModal] = useState(null);

  // Sample data for screens
  const screens = [
    {
      id: 1,
      phase: "ordering",
      title: "Browse Menu – Select Food Items",
      shortTitle: "Browse Menu",
      desc: "Select food items & categories",
      screenType: "browse",
    },
    {
      id: 2,
      phase: "ordering",
      title: "Customize Your Order",
      shortTitle: "Customize Order",
      desc: "Spice level, add-ons & special requests",
      screenType: "customize",
    },
    {
      id: 3,
      phase: "ordering",
      title: "Cart Summary – Review Your Order",
      shortTitle: "Cart Summary",
      desc: "Review items, apply coupons & packaging",
      screenType: "cart",
    },
    {
      id: 4,
      phase: "checkout",
      title: "Customer Details – Takeaway Pickup Info",
      shortTitle: "Customer Details",
      desc: "Enter takeaway info & scheduled time",
      screenType: "customer",
    },
    {
      id: 5,
      phase: "checkout",
      title: "Select Payment Method",
      shortTitle: "Select Payment",
      desc: "Choose UPI, Card or Cash on Pickup",
      screenType: "payment",
    },
    {
      id: 6,
      phase: "checkout",
      title: "Order Processing – Confirming Order",
      shortTitle: "Order Processing",
      desc: "Confirming order with kitchen & POS",
      screenType: "processing",
    },
    {
      id: 7,
      phase: "tracking",
      title: "Order Confirmed – Successful Booking",
      shortTitle: "Order Confirmed",
      desc: "Successful takeaway booking & receipt",
      screenType: "confirmed",
    },
    {
      id: 8,
      phase: "tracking",
      title: "Track Takeaway Order",
      shortTitle: "Track Takeaway Order",
      desc: "Live kitchen preparation timeline",
      screenType: "tracking",
    },
    {
      id: 9,
      phase: "tracking",
      title: "My Takeaway Orders – Order History",
      shortTitle: "My Takeaway Orders",
      desc: "View active & past order history",
      screenType: "my_orders",
    },
    {
      id: 10,
      phase: "branches",
      title: "Cancel Takeaway Order",
      shortTitle: "Cancel Takeaway Order",
      desc: "Cancellation reason & refund policy",
      screenType: "cancel",
    },
    {
      id: 11,
      phase: "branches",
      title: "Cancellation Confirmed",
      shortTitle: "Cancellation Confirmed",
      desc: "Order cancelled & refund details",
      screenType: "cancellation_confirmed",
    },
    {
      id: 12,
      phase: "branches",
      title: "Reorder – Repeat Previous Order",
      shortTitle: "Reorder",
      desc: "Repeat previous order with quick checkout",
      screenType: "reorder",
    },
  ];

  const handleOpenStandalone = () => {
    window.open("/takeaway-flow.html", "_blank");
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#0d0604",
        backgroundImage: `radial-gradient(ellipse at 50% 12%, rgba(95, 42, 19, 0.55) 0%, rgba(20, 10, 6, 0.95) 60%, #0a0403 100%), url('/assets/dining-table.jpg')`,
        backgroundSize: "cover",
        backgroundPosition: "center top",
        backgroundAttachment: "fixed",
        color: "#f5ede6",
        padding: "24px 20px 80px",
        fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
      }}
    >
      {/* Top Flow Header */}
      <div
        style={{
          maxWidth: "1680px",
          margin: "0 auto 30px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 28px",
          background: "rgba(23, 11, 7, 0.88)",
          border: "1px solid rgba(245, 158, 11, 0.35)",
          backdropFilter: "blur(14px)",
          borderRadius: "18px",
          boxShadow: "0 12px 30px rgba(0,0,0,0.5)",
          flexWrap: "wrap",
          gap: "16px",
        }}
      >
        {/* Brand */}
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "50%",
              background: "linear-gradient(135deg, #f59e0b, #d97706, #b45309)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "2px solid #fbbf24",
              boxShadow: "0 0 16px rgba(245, 158, 11, 0.45)",
            }}
          >
            <ChefHat size={26} color="#ffffff" />
          </div>
          <div>
            <div
              style={{
                fontFamily: "'Cinzel', Georgia, serif",
                fontSize: "20px",
                fontWeight: 800,
                color: "#ffffff",
                letterSpacing: "0.5px",
                lineHeight: "1.1",
              }}
            >
              Bhanu Bistro
            </div>
            <div
              style={{
                fontSize: "11px",
                textTransform: "uppercase",
                letterSpacing: "2px",
                color: "#f59e0b",
                fontWeight: 700,
              }}
            >
              Fine Dining & Takeaway
            </div>
          </div>
        </div>

        {/* Center Flow Title */}
        <div style={{ textAlign: "center" }}>
          <h2
            style={{
              fontFamily: "'Cinzel', Georgia, serif",
              fontSize: "24px",
              color: "#ffffff",
              fontWeight: 800,
              letterSpacing: "0.8px",
              margin: 0,
            }}
          >
            Bhanu Bistro – Takeaway Order Flow{" "}
            <span style={{ fontSize: "18px", color: "#f59e0b", fontWeight: 600 }}>
              (Self Pickup & Pre-Order)
            </span>
          </h2>
          <div style={{ fontSize: "12px", color: "#cbbcb1", marginTop: "3px" }}>
            Complete 12-Step Visual Flow Diagram • Professional POS Ordering Experience
          </div>
        </div>

        {/* Header Actions */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <button
            onClick={handleOpenStandalone}
            style={{
              background: "rgba(255, 255, 255, 0.08)",
              border: "1px solid rgba(255, 255, 255, 0.2)",
              color: "#fff",
              padding: "8px 16px",
              borderRadius: "20px",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <Layers size={14} /> Fullscreen Flow
          </button>
          <button
            onClick={() => window.print()}
            style={{
              background: "rgba(255, 255, 255, 0.08)",
              border: "1px solid rgba(255, 255, 255, 0.2)",
              color: "#fff",
              padding: "8px 16px",
              borderRadius: "20px",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <Printer size={14} /> Print / PDF
          </button>
          {onBack && (
            <button
              onClick={onBack}
              style={{
                background: "linear-gradient(135deg, #f97316, #ea580c)",
                border: "none",
                color: "#fff",
                padding: "8px 18px",
                borderRadius: "20px",
                fontSize: "13px",
                fontWeight: 700,
                cursor: "pointer",
                boxShadow: "0 4px 14px rgba(234, 88, 12, 0.4)",
              }}
            >
              Back to POS
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div
        style={{
          maxWidth: "1680px",
          margin: "0 auto 28px",
          display: "flex",
          justifyContent: "center",
          flexWrap: "wrap",
          gap: "10px",
        }}
      >
        {[
          { key: "all", label: "All 12 Screens Flow" },
          { key: "ordering", label: "1. Item Selection (Steps 1–3)" },
          { key: "checkout", label: "2. Pickup & Payment (Steps 4–6)" },
          { key: "tracking", label: "3. Confirmation & Tracking (Steps 7–9)" },
          { key: "branches", label: "4. Cancellation & Reorder (Steps 10–12)" },
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => setActiveFilter(f.key)}
            style={{
              background:
                activeFilter === f.key
                  ? "#e65100"
                  : "rgba(28, 14, 9, 0.85)",
              color: activeFilter === f.key ? "#fff" : "#dfd3ca",
              border:
                activeFilter === f.key
                  ? "1px solid #f57c00"
                  : "1px solid rgba(245, 158, 11, 0.25)",
              padding: "7px 18px",
              borderRadius: "24px",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
              boxShadow:
                activeFilter === f.key
                  ? "0 4px 14px rgba(230, 81, 0, 0.4)"
                  : "none",
              transition: "all 0.2s",
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Main Flow Grid */}
      <div style={{ maxWidth: "1680px", margin: "0 auto" }}>
        {/* ROW 1: Steps 1, 2, 3 */}
        {(activeFilter === "all" || activeFilter === "ordering") && (
          <div style={{ marginBottom: "36px" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "14px",
                margin: "0 0 16px 8px",
              }}
            >
              <span
                style={{
                  fontFamily: "'Cinzel', Georgia, serif",
                  fontSize: "18px",
                  color: "#f59e0b",
                  textTransform: "uppercase",
                  fontWeight: 700,
                  letterSpacing: "0.5px",
                }}
              >
                Phase 1: Item Selection & Customization
              </span>
              <div
                style={{
                  flexGrow: 1,
                  height: "1px",
                  background:
                    "linear-gradient(90deg, rgba(245, 158, 11, 0.5), rgba(245, 158, 11, 0.05))",
                }}
              />
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr auto 1fr auto 1fr",
                alignItems: "center",
                gap: "14px",
              }}
            >
              <ScreenItem
                screen={screens[0]}
                onClick={() => setSelectedScreenModal(screens[0])}
              />
              <ArrowConnector />
              <ScreenItem
                screen={screens[1]}
                onClick={() => setSelectedScreenModal(screens[1])}
              />
              <ArrowConnector />
              <ScreenItem
                screen={screens[2]}
                onClick={() => setSelectedScreenModal(screens[2])}
              />
            </div>

            {/* Downward indicator */}
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                paddingRight: "180px",
                margin: "18px 0 -10px",
              }}
            >
              <div
                style={{
                  background: "rgba(28, 14, 9, 0.85)",
                  border: "1px solid rgba(245, 158, 11, 0.3)",
                  padding: "5px 16px",
                  borderRadius: "20px",
                  fontSize: "12px",
                  fontWeight: 600,
                  color: "#f59e0b",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <span>Proceed to Pickup Details</span>
                <span
                  style={{
                    width: "22px",
                    height: "22px",
                    borderRadius: "50%",
                    background: "#e65100",
                    color: "#fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  ↓
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ROW 2: Steps 4, 5, 6 */}
        {(activeFilter === "all" || activeFilter === "checkout") && (
          <div style={{ marginBottom: "36px" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "14px",
                margin: "0 0 16px 8px",
              }}
            >
              <span
                style={{
                  fontFamily: "'Cinzel', Georgia, serif",
                  fontSize: "18px",
                  color: "#f59e0b",
                  textTransform: "uppercase",
                  fontWeight: 700,
                  letterSpacing: "0.5px",
                }}
              >
                Phase 2: Customer Takeaway Info & Secure Payment
              </span>
              <div
                style={{
                  flexGrow: 1,
                  height: "1px",
                  background:
                    "linear-gradient(90deg, rgba(245, 158, 11, 0.5), rgba(245, 158, 11, 0.05))",
                }}
              />
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr auto 1fr auto 1fr",
                alignItems: "center",
                gap: "14px",
              }}
            >
              <ScreenItem
                screen={screens[3]}
                onClick={() => setSelectedScreenModal(screens[3])}
              />
              <ArrowConnector />
              <ScreenItem
                screen={screens[4]}
                onClick={() => setSelectedScreenModal(screens[4])}
              />
              <ArrowConnector />
              <ScreenItem
                screen={screens[5]}
                onClick={() => setSelectedScreenModal(screens[5])}
              />
            </div>

            {/* Downward indicator */}
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                paddingRight: "180px",
                margin: "18px 0 -10px",
              }}
            >
              <div
                style={{
                  background: "rgba(28, 14, 9, 0.85)",
                  border: "1px solid rgba(245, 158, 11, 0.3)",
                  padding: "5px 16px",
                  borderRadius: "20px",
                  fontSize: "12px",
                  fontWeight: 600,
                  color: "#f59e0b",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <span>Order Confirmed & Live Tracking</span>
                <span
                  style={{
                    width: "22px",
                    height: "22px",
                    borderRadius: "50%",
                    background: "#e65100",
                    color: "#fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  ↓
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ROW 3: Steps 7, 8, 9 */}
        {(activeFilter === "all" || activeFilter === "tracking") && (
          <div style={{ marginBottom: "36px" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "14px",
                margin: "0 0 16px 8px",
              }}
            >
              <span
                style={{
                  fontFamily: "'Cinzel', Georgia, serif",
                  fontSize: "18px",
                  color: "#f59e0b",
                  textTransform: "uppercase",
                  fontWeight: 700,
                  letterSpacing: "0.5px",
                }}
              >
                Phase 3: Order Confirmation, Live Tracking & Order History
              </span>
              <div
                style={{
                  flexGrow: 1,
                  height: "1px",
                  background:
                    "linear-gradient(90deg, rgba(245, 158, 11, 0.5), rgba(245, 158, 11, 0.05))",
                }}
              />
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr auto 1fr auto 1fr",
                alignItems: "center",
                gap: "14px",
              }}
            >
              <ScreenItem
                screen={screens[6]}
                onClick={() => setSelectedScreenModal(screens[6])}
              />
              <ArrowConnector />
              <ScreenItem
                screen={screens[7]}
                onClick={() => setSelectedScreenModal(screens[7])}
              />
              <ArrowConnector />
              <ScreenItem
                screen={screens[8]}
                onClick={() => setSelectedScreenModal(screens[8])}
              />
            </div>

            {/* Downward indicator for branching */}
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                paddingRight: "180px",
                margin: "18px 0 -10px",
              }}
            >
              <div
                style={{
                  background: "rgba(28, 14, 9, 0.85)",
                  border: "1px solid rgba(245, 158, 11, 0.3)",
                  padding: "5px 16px",
                  borderRadius: "20px",
                  fontSize: "12px",
                  fontWeight: 600,
                  color: "#f59e0b",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <span>Branching Actions from My Orders</span>
                <span
                  style={{
                    width: "22px",
                    height: "22px",
                    borderRadius: "50%",
                    background: "#e65100",
                    color: "#fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  ↓
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ROW 4: Steps 10, 11, 12 */}
        {(activeFilter === "all" || activeFilter === "branches") && (
          <div style={{ marginBottom: "36px" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "14px",
                margin: "0 0 16px 8px",
              }}
            >
              <span
                style={{
                  fontFamily: "'Cinzel', Georgia, serif",
                  fontSize: "18px",
                  color: "#f59e0b",
                  textTransform: "uppercase",
                  fontWeight: 700,
                  letterSpacing: "0.5px",
                }}
              >
                Phase 4: Cancellation & Fast Reorder Flows
              </span>
              <div
                style={{
                  flexGrow: 1,
                  height: "1px",
                  background:
                    "linear-gradient(90deg, rgba(245, 158, 11, 0.5), rgba(245, 158, 11, 0.05))",
                }}
              />
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr auto 1fr auto 1fr",
                alignItems: "center",
                gap: "14px",
              }}
            >
              <ScreenItem
                screen={screens[9]}
                onClick={() => setSelectedScreenModal(screens[9])}
              />
              <ArrowConnector />
              <ScreenItem
                screen={screens[10]}
                onClick={() => setSelectedScreenModal(screens[10])}
              />
              <ArrowConnector isGold={true} />
              <ScreenItem
                screen={screens[11]}
                onClick={() => setSelectedScreenModal(screens[11])}
              />
            </div>
          </div>
        )}
      </div>

      {/* Lightbox / Zoom Modal */}
      {selectedScreenModal && (
        <div
          onClick={() => setSelectedScreenModal(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(10, 4, 2, 0.88)",
            backdropFilter: "blur(10px)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#170b07",
              border: "2px solid #e65100",
              borderRadius: "20px",
              width: "100%",
              maxWidth: "880px",
              maxHeight: "90vh",
              overflowY: "auto",
              boxShadow: "0 25px 60px rgba(0,0,0,0.85)",
              padding: "28px",
              position: "relative",
              color: "#fff",
            }}
          >
            <button
              onClick={() => setSelectedScreenModal(null)}
              style={{
                position: "absolute",
                top: "16px",
                right: "18px",
                width: "36px",
                height: "36px",
                borderRadius: "50%",
                background: "rgba(255,255,255,0.15)",
                border: "1px solid rgba(255,255,255,0.3)",
                color: "#fff",
                fontSize: "18px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
              }}
            >
              <X size={20} />
            </button>

            <div style={{ marginBottom: "16px" }}>
              <span
                style={{
                  fontSize: "11px",
                  textTransform: "uppercase",
                  letterSpacing: "1.5px",
                  color: "#f59e0b",
                  fontWeight: 700,
                }}
              >
                Screen #{selectedScreenModal.id} • {selectedScreenModal.shortTitle}
              </span>
              <h2
                style={{
                  fontFamily: "'Cinzel', Georgia, serif",
                  fontSize: "22px",
                  color: "#fff",
                  margin: "4px 0 6px",
                }}
              >
                {selectedScreenModal.title}
              </h2>
              <p style={{ fontSize: "13.5px", color: "#d6c8be" }}>
                {selectedScreenModal.desc}
              </p>
            </div>

            {/* Embedded Zoom Render */}
            <div
              style={{
                background: "#ffffff",
                borderRadius: "14px",
                padding: "20px",
                color: "#1f1610",
                boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
              }}
            >
              <ScreenContentRenderer screenType={selectedScreenModal.screenType} isModal={true} />
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                marginTop: "20px",
              }}
            >
              <button
                onClick={() => setSelectedScreenModal(null)}
                style={{
                  background: "linear-gradient(135deg, #f97316, #ea580c)",
                  border: "none",
                  color: "#fff",
                  padding: "8px 20px",
                  borderRadius: "10px",
                  fontSize: "13px",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Arrow connector component
function ArrowConnector({ isGold = false }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          width: "36px",
          height: "36px",
          borderRadius: "50%",
          background: isGold
            ? "linear-gradient(135deg, #d97706, #b45309)"
            : "linear-gradient(135deg, #f97316, #ea580c)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#ffffff",
          boxShadow: "0 4px 14px rgba(234, 88, 12, 0.5)",
          border: "2px solid rgba(255, 255, 255, 0.35)",
        }}
      >
        <ArrowRight size={18} strokeWidth={2.8} />
      </div>
    </div>
  );
}

// Screen Item Unit (Frame + Pill badge)
function ScreenItem({ screen, onClick }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "14px",
        width: "100%",
      }}
    >
      {/* Screen Frame (Mock Window) */}
      <div
        onClick={onClick}
        style={{
          width: "100%",
          height: "320px",
          background: "#140905",
          backgroundImage: `radial-gradient(circle at 50% 30%, rgba(55, 24, 13, 0.65) 0%, rgba(18, 9, 5, 0.96) 80%), url('/assets/dining-table.jpg')`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          borderRadius: "18px",
          border: "1px solid rgba(245, 158, 11, 0.25)",
          boxShadow:
            "0 16px 36px rgba(0, 0, 0, 0.65), 0 0 0 1px rgba(245, 158, 11, 0.22)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          cursor: "pointer",
          transition: "all 0.2s ease",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "translateY(-4px)";
          e.currentTarget.style.borderColor = "#f97316";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "translateY(0)";
          e.currentTarget.style.borderColor = "rgba(245, 158, 11, 0.25)";
        }}
      >
        {/* App Topbar */}
        <div
          style={{
            height: "36px",
            background: "rgba(18, 9, 6, 0.94)",
            borderBottom: "1px solid rgba(245, 158, 11, 0.2)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 12px",
            flexShrink: 0,
            backdropFilter: "blur(6px)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <div
              style={{
                width: "18px",
                height: "18px",
                borderRadius: "50%",
                background: "linear-gradient(135deg, #f59e0b, #d97706)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <ChefHat size={11} color="#fff" />
            </div>
            <span
              style={{
                fontFamily: "'Cinzel', serif",
                fontSize: "11px",
                fontWeight: 700,
                color: "#fff",
              }}
            >
              Bhanu Bistro
            </span>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              fontSize: "10px",
              fontWeight: 600,
              color: "#c9bbae",
            }}
          >
            <span>Home</span>
            <span style={{ color: "#f97316" }}>Menu</span>
            <span>About</span>
            <span>Contact</span>
          </div>

          <div
            style={{
              background: "rgba(255, 255, 255, 0.1)",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              borderRadius: "12px",
              padding: "2px 8px",
              fontSize: "9.5px",
              fontWeight: 600,
              color: "#f1e7df",
            }}
          >
            Hi, Priya
          </div>
        </div>

        {/* Content Body Area */}
        <div
          style={{
            flexGrow: 1,
            padding: "10px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              background: "#ffffff",
              color: "#1f1610",
              borderRadius: "14px",
              boxShadow: "0 10px 25px rgba(0, 0, 0, 0.35)",
              width: "100%",
              height: "100%",
              padding: "10px 12px",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              border: "1px solid #f0e6dc",
            }}
          >
            <ScreenContentRenderer screenType={screen.screenType} isModal={false} />
          </div>
        </div>
      </div>

      {/* Step Pill Below Screen */}
      <div
        style={{
          background: "#ffffff",
          color: "#1f1610",
          padding: "7px 18px 7px 10px",
          borderRadius: "30px",
          display: "inline-flex",
          alignItems: "center",
          gap: "10px",
          boxShadow: "0 6px 16px rgba(0, 0, 0, 0.45)",
          border: "1px solid rgba(255, 255, 255, 0.85)",
          maxWidth: "95%",
        }}
      >
        <span
          style={{
            width: "26px",
            height: "26px",
            borderRadius: "50%",
            background: "linear-gradient(135deg, #f97316, #ea580c)",
            color: "#ffffff",
            fontSize: "13px",
            fontWeight: 800,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 2px 6px rgba(234, 88, 12, 0.45)",
            flexShrink: 0,
          }}
        >
          {screen.id}
        </span>
        <span
          style={{
            fontSize: "12px",
            fontWeight: 700,
            color: "#1f1610",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {screen.shortTitle} <span style={{ fontWeight: 500, color: "#5d5046" }}>– {screen.desc}</span>
        </span>
      </div>
    </div>
  );
}

// Inner Content Renderer for each screen
function ScreenContentRenderer({ screenType, isModal = false }) {
  switch (screenType) {
    case "browse":
      return (
        <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
          <div style={{ display: "flex", gap: "6px", marginBottom: "6px" }}>
            <div
              style={{
                position: "relative",
                flexGrow: 1,
                background: "#faf7f2",
                border: "1px solid #e2d7cc",
                borderRadius: "6px",
                display: "flex",
                alignItems: "center",
                padding: "2px 6px",
              }}
            >
              <Search size={12} color="#8c7f74" />
              <span style={{ fontSize: "9.5px", color: "#6b5d52", marginLeft: "6px" }}>
                Search biryani, starters, curries...
              </span>
            </div>
            <span
              style={{
                fontSize: "9px",
                background: "#f3ede6",
                padding: "3px 8px",
                borderRadius: "6px",
                fontWeight: 600,
              }}
            >
              Filters ⚙️
            </span>
          </div>

          <div style={{ display: "flex", gap: "4px", marginBottom: "6px" }}>
            {["All", "Biryani", "Starters", "Chinese", "Curries"].map((c, i) => (
              <span
                key={c}
                style={{
                  fontSize: "8.5px",
                  fontWeight: 600,
                  padding: "2px 7px",
                  borderRadius: "10px",
                  background: i === 1 ? "#e65100" : "#f4eee7",
                  color: i === 1 ? "#fff" : "#55483f",
                }}
              >
                {c}
              </span>
            ))}
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "6px",
              flexGrow: 1,
            }}
          >
            <div
              style={{
                background: "#fffcf7",
                border: "1px solid #fed7aa",
                borderRadius: "8px",
                padding: "6px",
                display: "flex",
                gap: "6px",
              }}
            >
              <img
                src="/assets/biryani/chicken-dum-biryani.jpg"
                onError={(e) => {
                  e.target.src = "/assets/chicken-dum-biryani.jpg";
                }}
                alt="Biryani"
                style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "6px",
                  objectFit: "cover",
                }}
              />
              <div style={{ flexGrow: 1, minWidth: 0 }}>
                <div style={{ fontSize: "9.5px", fontWeight: 700, color: "#221711" }}>
                  Royal Dum Biryani
                </div>
                <div style={{ fontSize: "8px", color: "#73675e" }}>Saffron Basmati</div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginTop: "2px",
                  }}
                >
                  <strong style={{ fontSize: "9.5px", color: "#c2410c" }}>₹340</strong>
                  <span
                    style={{
                      background: "#fff5ee",
                      border: "1px solid #fed7aa",
                      borderRadius: "4px",
                      fontSize: "9px",
                      padding: "1px 5px",
                      fontWeight: 700,
                      color: "#e65100",
                    }}
                  >
                    1
                  </span>
                </div>
              </div>
            </div>

            <div
              style={{
                background: "#faf7f2",
                border: "1px solid #ece2d8",
                borderRadius: "8px",
                padding: "6px",
                display: "flex",
                gap: "6px",
              }}
            >
              <img
                src="/assets/curries/paneer-butter-masala.jpg"
                onError={(e) => {
                  e.target.src = "/assets/crispy-corn.jpg";
                }}
                alt="Paneer"
                style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "6px",
                  objectFit: "cover",
                }}
              />
              <div style={{ flexGrow: 1, minWidth: 0 }}>
                <div style={{ fontSize: "9.5px", fontWeight: 700, color: "#221711" }}>
                  Paneer Butter Masala
                </div>
                <div style={{ fontSize: "8px", color: "#73675e" }}>Buttery Gravy</div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginTop: "2px",
                  }}
                >
                  <strong style={{ fontSize: "9.5px", color: "#c2410c" }}>₹260</strong>
                  <span
                    style={{
                      background: "#e65100",
                      color: "#fff",
                      borderRadius: "4px",
                      fontSize: "8.5px",
                      padding: "2px 6px",
                      fontWeight: 700,
                    }}
                  >
                    + Add
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div
            style={{
              background: "#1f1610",
              color: "#fff",
              padding: "5px 10px",
              borderRadius: "8px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: "4px",
            }}
          >
            <span style={{ fontSize: "9px", fontWeight: 600 }}>3 Items Added • ₹720</span>
            <span style={{ fontSize: "9.5px", fontWeight: 700, color: "#f59e0b" }}>
              View Cart →
            </span>
          </div>
        </div>
      );

    case "customize":
      return (
        <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              borderBottom: "1px solid #f2ece6",
              paddingBottom: "4px",
              marginBottom: "6px",
            }}
          >
            <div>
              <div style={{ fontSize: "11px", fontWeight: 700 }}>Customize Dum Biryani</div>
              <div style={{ fontSize: "8px", color: "#786c62" }}>Spice & Add-ons</div>
            </div>
            <strong style={{ fontSize: "11px", color: "#c2410c" }}>₹340</strong>
          </div>

          <div style={{ flexGrow: 1, overflowY: "auto", fontSize: "9px" }}>
            <div style={{ marginBottom: "5px" }}>
              <span style={{ fontWeight: 700, color: "#55483f" }}>Spice Level:</span>
              <div style={{ display: "flex", gap: "4px", marginTop: "2px" }}>
                <span style={{ background: "#f0ebe4", padding: "2px 6px", borderRadius: "4px" }}>
                  Mild 🟢
                </span>
                <span
                  style={{
                    background: "#fed7aa",
                    padding: "2px 6px",
                    borderRadius: "4px",
                    fontWeight: 700,
                    color: "#c2410c",
                  }}
                >
                  Medium 🟡
                </span>
                <span style={{ background: "#f0ebe4", padding: "2px 6px", borderRadius: "4px" }}>
                  Spicy 🌶️
                </span>
              </div>
            </div>

            <div style={{ marginBottom: "5px" }}>
              <span style={{ fontWeight: 700, color: "#55483f" }}>Add-ons:</span>
              <div style={{ display: "flex", flexDirection: "column", gap: "2px", marginTop: "2px" }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    background: "#fffcf7",
                    border: "1px solid #ffedd5",
                    padding: "2px 6px",
                    borderRadius: "4px",
                  }}
                >
                  <span>☑️ Extra Mirchi Ka Salan</span>
                  <strong>+₹40</strong>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    background: "#fffcf7",
                    border: "1px solid #ffedd5",
                    padding: "2px 6px",
                    borderRadius: "4px",
                  }}
                >
                  <span>☑️ Extra Boondi Raita</span>
                  <strong>+₹35</strong>
                </div>
              </div>
            </div>

            <div style={{ fontSize: "8.5px", color: "#6e6259" }}>
              Notes: Less oil, pack extra onions & lemon
            </div>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              borderTop: "1px solid #f2ece6",
              paddingTop: "6px",
              marginTop: "auto",
            }}
          >
            <span style={{ fontSize: "9.5px", fontWeight: 700 }}>Qty: 1</span>
            <button
              style={{
                background: "linear-gradient(135deg, #f97316, #ea580c)",
                color: "#fff",
                border: "none",
                borderRadius: "6px",
                fontSize: "9.5px",
                fontWeight: 700,
                padding: "4px 12px",
              }}
            >
              Add to Cart • ₹415 →
            </button>
          </div>
        </div>
      );

    case "cart":
      return (
        <div style={{ display: "flex", flexDirection: "column", height: "100%", fontSize: "9px" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              borderBottom: "1px solid #f2ece6",
              paddingBottom: "4px",
              marginBottom: "4px",
            }}
          >
            <strong style={{ fontSize: "11px" }}>Cart Summary (3 items)</strong>
            <span
              style={{
                background: "#dcfce7",
                color: "#166534",
                padding: "1px 6px",
                borderRadius: "4px",
                fontWeight: 700,
              }}
            >
              Takeaway
            </span>
          </div>

          <div style={{ flexGrow: 1, overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "2px 0" }}>
              <span>1x Royal Dum Biryani (Custom)</span>
              <strong>₹415.00</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "2px 0" }}>
              <span>1x Paneer Butter Masala</span>
              <strong>₹260.00</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "2px 0" }}>
              <span>2x Butter Garlic Naan</span>
              <strong>₹120.00</strong>
            </div>

            <div
              style={{
                background: "#f0fdf4",
                border: "1px dashed #86efac",
                borderRadius: "4px",
                padding: "2px 6px",
                display: "flex",
                justifyContent: "space-between",
                margin: "3px 0",
                color: "#166534",
                fontWeight: 700,
              }}
            >
              <span>🏷️ Coupon WELCOME50</span>
              <span>-₹50.00</span>
            </div>

            <div
              style={{
                background: "#faf6f0",
                padding: "4px 6px",
                borderRadius: "6px",
                marginTop: "2px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Subtotal + Packaging:</span>
                <span>₹825.00</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>GST (5%):</span>
                <span>₹39.75</span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontWeight: 800,
                  fontSize: "10.5px",
                  marginTop: "2px",
                  borderTop: "1px solid #d4c4b2",
                  paddingTop: "2px",
                }}
              >
                <span>Grand Total:</span>
                <span style={{ color: "#c2410c" }}>₹815.00</span>
              </div>
            </div>
          </div>

          <button
            style={{
              background: "linear-gradient(135deg, #f97316, #ea580c)",
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              padding: "5px 0",
              fontWeight: 700,
              fontSize: "10px",
              marginTop: "4px",
            }}
          >
            Continue to Checkout →
          </button>
        </div>
      );

    case "customer":
      return (
        <div style={{ display: "flex", flexDirection: "column", height: "100%", fontSize: "9px" }}>
          <strong style={{ fontSize: "11px", marginBottom: "4px" }}>Takeaway Pickup Info</strong>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px", marginBottom: "4px" }}>
            <div
              style={{
                background: "#fff7ed",
                border: "1px solid #ea580c",
                borderRadius: "4px",
                padding: "3px 5px",
              }}
            >
              <div style={{ fontWeight: 800, color: "#c2410c" }}>⚡ Self Pickup</div>
              <div style={{ fontSize: "7.5px", color: "#7c6d61" }}>Ready in 25 mins</div>
            </div>
            <div
              style={{
                background: "#faf6f2",
                border: "1px solid #e5dbd0",
                borderRadius: "4px",
                padding: "3px 5px",
              }}
            >
              <div style={{ fontWeight: 600 }}>🕒 Scheduled</div>
              <div style={{ fontSize: "7.5px", color: "#7c6d61" }}>Pre-order slot</div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px" }}>
            <div>
              <span style={{ fontSize: "8px", fontWeight: 700 }}>NAME *</span>
              <div style={{ background: "#faf7f2", border: "1px solid #e2d7cc", padding: "3px 5px", borderRadius: "4px" }}>
                Priya Sharma
              </div>
            </div>
            <div>
              <span style={{ fontSize: "8px", fontWeight: 700 }}>PHONE *</span>
              <div style={{ background: "#faf7f2", border: "1px solid #e2d7cc", padding: "3px 5px", borderRadius: "4px" }}>
                +91 98765 43210
              </div>
            </div>
          </div>

          <div style={{ marginTop: "4px" }}>
            <span style={{ fontSize: "8px", fontWeight: 700 }}>PICKUP TIME</span>
            <div style={{ background: "#faf7f2", border: "1px solid #e2d7cc", padding: "3px 5px", borderRadius: "4px" }}>
              Today, 10 Nov 2026 at 08:15 PM
            </div>
          </div>

          <div style={{ display: "flex", gap: "4px", marginTop: "auto" }}>
            <button style={{ flex: 1, background: "#f3ede6", border: "none", borderRadius: "4px", padding: "4px" }}>
              ← Back
            </button>
            <button
              style={{
                flex: 1.5,
                background: "linear-gradient(135deg, #f97316, #ea580c)",
                color: "#fff",
                border: "none",
                borderRadius: "4px",
                padding: "4px",
                fontWeight: 700,
              }}
            >
              Payment →
            </button>
          </div>
        </div>
      );

    case "payment":
      return (
        <div style={{ display: "flex", flexDirection: "column", height: "100%", fontSize: "9px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
            <strong style={{ fontSize: "11px" }}>Select Payment</strong>
            <span style={{ fontWeight: 800, color: "#c2410c" }}>₹815.00</span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "3px", flexGrow: 1 }}>
            <div
              style={{
                background: "#fff7ed",
                border: "1.5px solid #ea580c",
                borderRadius: "4px",
                padding: "3px 6px",
                display: "flex",
                justifyContent: "space-between",
              }}
            >
              <span>🟢 UPI (Google Pay, PhonePe)</span>
              <strong style={{ color: "#ea580c", fontSize: "8px" }}>SELECTED</strong>
            </div>
            <div
              style={{
                background: "#faf6f2",
                border: "1px solid #e5dbd0",
                borderRadius: "4px",
                padding: "3px 6px",
              }}
            >
              <span>⚪ Credit / Debit Card</span>
            </div>
            <div
              style={{
                background: "#faf6f2",
                border: "1px solid #e5dbd0",
                borderRadius: "4px",
                padding: "3px 6px",
              }}
            >
              <span>⚪ Net Banking</span>
            </div>
            <div
              style={{
                background: "#faf6f2",
                border: "1px solid #e5dbd0",
                borderRadius: "4px",
                padding: "3px 6px",
              }}
            >
              <span>⚪ Cash / Card at Pickup Desk</span>
            </div>
          </div>

          <button
            style={{
              background: "linear-gradient(135deg, #f97316, #ea580c)",
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              padding: "5px 0",
              fontWeight: 700,
              fontSize: "10px",
              marginTop: "4px",
            }}
          >
            Pay ₹815.00 & Place Order →
          </button>
        </div>
      );

    case "processing":
      return (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            height: "100%",
            textAlign: "center",
          }}
        >
          <div
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "50%",
              background: "#fff7ed",
              border: "2px solid #ea580c",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: "6px",
            }}
          >
            <Clock size={18} color="#ea580c" />
          </div>
          <strong style={{ fontSize: "12px", color: "#1f1610" }}>
            Confirming Order...
          </strong>
          <span style={{ fontSize: "8px", color: "#7c6f66", marginBottom: "8px" }}>
            Please do not close or refresh this screen
          </span>

          <div
            style={{
              background: "#faf6f0",
              border: "1px solid #ebdcd0",
              borderRadius: "6px",
              padding: "6px 10px",
              width: "100%",
              fontSize: "8.5px",
              textAlign: "left",
            }}
          >
            <div>✓ Payment Verified (UPI - ₹815)</div>
            <div>✓ Order Logged in POS</div>
            <div style={{ color: "#c2410c", fontWeight: 700 }}>
              ⏳ Confirming with Bhanu Bistro Kitchen...
            </div>
          </div>
        </div>
      );

    case "confirmed":
      return (
        <div style={{ display: "flex", flexDirection: "column", height: "100%", textAlign: "center" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", marginBottom: "4px" }}>
            <CheckCircle2 size={22} color="#16a34a" />
            <strong style={{ fontSize: "12px", color: "#166534" }}>
              Takeaway Confirmed!
            </strong>
          </div>

          <div
            style={{
              background: "#faf6f0",
              border: "1px solid #e7ded4",
              borderRadius: "6px",
              padding: "6px",
              textAlign: "left",
              fontSize: "8.5px",
              marginBottom: "4px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "2px" }}>
              <span>Order ID:</span>
              <strong style={{ color: "#c2410c" }}>TKO-1023</strong>
            </div>
            <div>Customer: Priya Sharma • 08:15 PM (Today)</div>
            <div>Items: 1x Biryani, 1x Paneer Masala, 2x Naan</div>
            <div>Paid: ₹815.00 via UPI</div>
          </div>

          <div style={{ display: "flex", gap: "4px", marginTop: "auto" }}>
            <button style={{ flex: 1, background: "#f3ede6", border: "none", borderRadius: "4px", padding: "4px", fontSize: "8.5px" }}>
              Receipt
            </button>
            <button
              style={{
                flex: 1.5,
                background: "linear-gradient(135deg, #f97316, #ea580c)",
                color: "#fff",
                border: "none",
                borderRadius: "4px",
                padding: "4px",
                fontWeight: 700,
                fontSize: "8.5px",
              }}
            >
              Track Order →
            </button>
          </div>
        </div>
      );

    case "tracking":
      return (
        <div style={{ display: "flex", flexDirection: "column", height: "100%", fontSize: "8.5px" }}>
          <div
            style={{
              background: "#fff7ed",
              border: "1px solid #fed7aa",
              borderRadius: "4px",
              padding: "3px 6px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "4px",
            }}
          >
            <div>
              <strong style={{ color: "#c2410c" }}>🔥 Food Prep Started</strong>
              <div style={{ fontSize: "7.5px", color: "#7c6d61" }}>Chef Rajesh preparing</div>
            </div>
            <strong style={{ fontSize: "10px" }}>18 Mins</strong>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "3px", flexGrow: 1 }}>
            <div>✓ 07:50 PM: Order Received</div>
            <div>✓ 07:51 PM: Accepted by Bistro</div>
            <div style={{ color: "#c2410c", fontWeight: 700 }}>
              🍳 07:54 PM: Preparation in Progress
            </div>
            <div style={{ opacity: 0.6 }}>⚪ 08:15 PM: Ready for Pickup</div>
          </div>

          <div style={{ borderTop: "1px solid #eee", paddingTop: "3px", color: "#695b50", fontSize: "7.5px" }}>
            📍 Takeaway Desk, Ground Floor • 📞 Call +91 40 2345 6789
          </div>
        </div>
      );

    case "my_orders":
      return (
        <div style={{ display: "flex", flexDirection: "column", height: "100%", fontSize: "8.5px" }}>
          <div style={{ display: "flex", gap: "4px", marginBottom: "4px" }}>
            <span style={{ background: "#e65100", color: "#fff", padding: "1px 6px", borderRadius: "8px", fontWeight: 700 }}>
              Active (1)
            </span>
            <span style={{ background: "#f0ebe4", padding: "1px 6px", borderRadius: "8px" }}>
              Past (2)
            </span>
          </div>

          <div
            style={{
              background: "#fffcf7",
              border: "1px solid #fed7aa",
              borderRadius: "6px",
              padding: "4px",
              marginBottom: "4px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <strong>#TKO-1023</strong>
              <span style={{ color: "#c2410c", fontWeight: 700 }}>🍳 08:15 PM</span>
            </div>
            <div>Biryani, Paneer, Naan • ₹815.00</div>
            <div style={{ display: "flex", gap: "3px", marginTop: "3px" }}>
              <span style={{ background: "#ea580c", color: "#fff", padding: "1px 5px", borderRadius: "3px" }}>
                Track
              </span>
              <span style={{ border: "1px solid #fca5a5", color: "#dc2626", padding: "1px 5px", borderRadius: "3px" }}>
                Cancel
              </span>
            </div>
          </div>

          <div style={{ background: "#faf7f2", border: "1px solid #ebdcd0", borderRadius: "6px", padding: "4px" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>#TKO-0982 (06 Nov)</span>
              <span style={{ color: "#16a34a" }}>✓ Completed</span>
            </div>
            <div>2x Biryani, Chicken 65 • ₹940.00</div>
            <span style={{ color: "#ea580c", fontWeight: 700, marginTop: "2px", display: "inline-block" }}>
              🔁 Reorder
            </span>
          </div>
        </div>
      );

    case "cancel":
      return (
        <div style={{ display: "flex", flexDirection: "column", height: "100%", fontSize: "8.5px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
            <AlertTriangle size={18} color="#dc2626" />
            <div>
              <strong style={{ color: "#991b1b", fontSize: "11px" }}>Cancel Order?</strong>
              <div style={{ fontSize: "7.5px", color: "#6b5d52" }}>#TKO-1023 • Amount: ₹815.00</div>
            </div>
          </div>

          <div>
            <span style={{ fontWeight: 700 }}>Cancellation Reason:</span>
            <div style={{ background: "#faf7f2", border: "1px solid #e2d7cc", padding: "3px", borderRadius: "4px", margin: "2px 0" }}>
              Ordered wrong items by mistake ▼
            </div>
          </div>

          <div
            style={{
              background: "#fef2f2",
              border: "1px solid #fecaca",
              borderRadius: "4px",
              padding: "4px",
              color: "#991b1b",
              fontSize: "7.5px",
              margin: "3px 0",
            }}
          >
            ⚠️ <strong>100% Full Refund:</strong> Cancelled under 5 mins. ₹815.00 will be credited back to your UPI.
          </div>

          <div style={{ display: "flex", gap: "4px", marginTop: "auto" }}>
            <button style={{ flex: 1, background: "#f3ede6", border: "none", borderRadius: "4px", padding: "3px" }}>
              Keep Order
            </button>
            <button
              style={{
                flex: 1.4,
                background: "#dc2626",
                color: "#fff",
                border: "none",
                borderRadius: "4px",
                padding: "3px",
                fontWeight: 700,
              }}
            >
              Confirm Cancel
            </button>
          </div>
        </div>
      );

    case "cancellation_confirmed":
      return (
        <div style={{ display: "flex", flexDirection: "column", height: "100%", textAlign: "center", fontSize: "8.5px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", marginBottom: "4px" }}>
            <X size={20} color="#dc2626" />
            <strong style={{ fontSize: "12px", color: "#991b1b" }}>Order Cancelled</strong>
          </div>

          <div
            style={{
              background: "#faf6f0",
              border: "1px solid #ebdcd0",
              borderRadius: "6px",
              padding: "6px",
              textAlign: "left",
              margin: "4px 0",
            }}
          >
            <div><strong>Refund:</strong> ₹815.00 (100% Initiated)</div>
            <div><strong>Mode:</strong> UPI (priya@oksbi)</div>
            <div><strong>ARN:</strong> 431092841</div>
            <div style={{ fontSize: "7.5px", color: "#6b5f54", marginTop: "2px" }}>
              Credit within 24-48 business hours.
            </div>
          </div>

          <button
            style={{
              background: "linear-gradient(135deg, #f97316, #ea580c)",
              color: "#fff",
              border: "none",
              borderRadius: "4px",
              padding: "4px 0",
              fontWeight: 700,
              marginTop: "auto",
            }}
          >
            Back to My Orders →
          </button>
        </div>
      );

    case "reorder":
      return (
        <div style={{ display: "flex", flexDirection: "column", height: "100%", fontSize: "8.5px" }}>
          <strong style={{ fontSize: "11px", marginBottom: "4px" }}>Quick Reorder</strong>
          <span style={{ fontSize: "7.5px", color: "#7c6f65", marginBottom: "4px" }}>
            From #TKO-0982 (06 Nov 2026)
          </span>

          <div style={{ flexGrow: 1, overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "1px 0" }}>
              <span>2x Royal Dum Biryani</span>
              <strong>₹680.00</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "1px 0" }}>
              <span>1x Chicken 65 Starter</span>
              <strong>₹280.00</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "1px 0" }}>
              <span>2x Thums Up Can</span>
              <strong>₹80.00</strong>
            </div>

            <div
              style={{
                background: "#faf6f0",
                padding: "3px 5px",
                borderRadius: "4px",
                marginTop: "3px",
                display: "flex",
                justifyContent: "space-between",
                fontWeight: 800,
              }}
            >
              <span>Total Payable:</span>
              <span style={{ color: "#c2410c" }}>₹1,122.00</span>
            </div>
          </div>

          <button
            style={{
              background: "linear-gradient(135deg, #f97316, #ea580c)",
              color: "#fff",
              border: "none",
              borderRadius: "4px",
              padding: "5px 0",
              fontWeight: 700,
              marginTop: "4px",
            }}
          >
            Add & Proceed to Checkout →
          </button>
        </div>
      );

    default:
      return null;
  }
}

