import { SearchableSelect } from "../common/SearchableSelect";
import "../common/MenuCatalogLayout.css";
import React, { useEffect, useId, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Search, ShoppingBag, Plus, Minus, History, X, ClipboardList, CheckCircle2, Clock, Send, ChefHat } from "lucide-react";
import { getMenuItemImage, handleDishImageError } from "../utils/menuImageHelper";
import {
  apiCancelTakeawayOrder,
  apiDispatchTakeawayOrder,
  apiGetTakeawayOrder,
  apiGetTakeawayOrderBillSummary,
  apiGetTakeawayOrderHistory,
  apiGetTakeawayOrderReceipt,
  apiGetTakeawayOrders,
  apiSendTakeawayOrderToKitchen,
} from "../api/orderApi";

export function TakeawayView({ menuItems = [], menuLoading = false, onCheckout, onShowReceipt, orderPlacedSignal = 0 }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [cart, setCart] = useState({});
  const [descriptionTooltip, setDescriptionTooltip] = useState(null);
  const descriptionTooltipId = useId();
  const [takeawayOrders, setTakeawayOrders] = useState([]);
  const [takeawayHistory, setTakeawayHistory] = useState([]);
  const [orderNotice, setOrderNotice] = useState("");
  const [dispatchingOrderId, setDispatchingOrderId] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [paidOrdersOpen, setPaidOrdersOpen] = useState(false);
  const [selectedOrderInfo, setSelectedOrderInfo] = useState(null);
  const [paidSearch, setPaidSearch] = useState("");
  const [paidStatus, setPaidStatus] = useState("all");
  const [paidDate, setPaidDate] = useState("");
  const [historySearch, setHistorySearch] = useState("");
  const [historyStatus, setHistoryStatus] = useState("all");
  const [historyDatePreset, setHistoryDatePreset] = useState("all");
  const [historyDateFrom, setHistoryDateFrom] = useState("");
  const [historyDateTo, setHistoryDateTo] = useState("");
  const categories = useMemo(() => [...new Set((Array.isArray(menuItems) ? menuItems : []).map((item) => item.category).filter(Boolean))], [menuItems]);
  const items = useMemo(() => {
    const term = query.trim().toLowerCase();
    return (Array.isArray(menuItems) ? menuItems : []).filter((item) =>
      (category === "all" || item.category === category) &&
      (!term || `${item.name || ""} ${item.category || ""} ${item.description || ""}`.toLowerCase().includes(term))
    );
  }, [menuItems, query, category]);
  const changeQty = (item, delta) => setCart((current) => {
    const qty = Math.max(0, (current[item.id]?.quantity || 0) + delta);
    const next = { ...current };
    if (!qty) delete next[item.id];
    else next[item.id] = { item, quantity: qty };
    return next;
  });
  const count = Object.values(cart).reduce((sum, line) => sum + line.quantity, 0);
  const total = Object.values(cart).reduce((sum, line) => sum + Number(line.item.price || 0) * line.quantity, 0);

  const showDescriptionTooltip = (event, description, itemId) => {
    const element = event.currentTarget;
    if (element.scrollWidth <= element.clientWidth + 1) return;
    const rect = element.getBoundingClientRect();
    const tooltipWidth = Math.min(300, window.innerWidth - 24);
    const above = rect.top >= 88 || window.innerHeight - rect.bottom < 76;
    setDescriptionTooltip({
      description,
      itemId,
      left: Math.max(12, Math.min(rect.left, window.innerWidth - tooltipWidth - 12)),
      top: above ? rect.top - 7 : rect.bottom + 7,
      above,
    });
  };

  const getOrderStatus = (order) => String(order.status ?? order.Status ?? order.orderStatus ?? order.OrderStatus ?? "").trim();
  const getOrderDate = (order) => {
    const value = order.dateTime ?? order.createdAt ?? order.createdDate ?? order.orderDate ?? order.date ?? order.CreatedAt ?? order.OrderDate;
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  };
  const getOrderNumber = (order) => String(order.orderNumber ?? order.invoiceNo ?? order.id ?? order.orderId ?? order.Id ?? "");
  const orderDateKey = (date) => date ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}` : "";
  const paidStatuses = useMemo(() => [...new Set(takeawayOrders.map(getOrderStatus).filter(Boolean))], [takeawayOrders]);
  const historyStatuses = useMemo(() => [...new Set(takeawayHistory.map(getOrderStatus).filter(Boolean))], [takeawayHistory]);
  const filteredPaidOrders = useMemo(() => {
    const today = new Date();
    const todayKey = orderDateKey(today);
    const query = paidSearch.trim().toLowerCase();
    return takeawayOrders.filter((order) => {
      const number = getOrderNumber(order).toLowerCase();
      const status = getOrderStatus(order).toLowerCase();
      const date = getOrderDate(order);
      const statusMatches = paidStatus === "all" || (paidStatus === "__in_kitchen" ? !["ready", "dispatched", "cancelled"].includes(status) : status === paidStatus.toLowerCase());
      return (!query || number.includes(query)) && statusMatches && (!paidDate || orderDateKey(date) === paidDate);
    });
  }, [takeawayOrders, paidSearch, paidStatus, paidDate]);
  const filteredTakeawayHistory = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const query = historySearch.trim().toLowerCase();
    return takeawayHistory.filter((order) => {
      const number = getOrderNumber(order).toLowerCase();
      const status = getOrderStatus(order).toLowerCase();
      const date = getOrderDate(order);
      let dateMatches = true;
      if (historyDatePreset === "today") dateMatches = Boolean(date && date >= today && date < new Date(today.getTime() + 86400000));
      else if (historyDatePreset === "yesterday") {
        const yesterday = new Date(today.getTime() - 86400000);
        dateMatches = Boolean(date && date >= yesterday && date < today);
      } else if (historyDatePreset === "7days") dateMatches = Boolean(date && date >= new Date(today.getTime() - 6 * 86400000) && date < new Date(today.getTime() + 86400000));
      else if (historyDatePreset === "30days") dateMatches = Boolean(date && date >= new Date(today.getTime() - 29 * 86400000) && date < new Date(today.getTime() + 86400000));
      else if (historyDatePreset === "custom") {
        const from = historyDateFrom ? new Date(`${historyDateFrom}T00:00:00`) : null;
        const to = historyDateTo ? new Date(`${historyDateTo}T23:59:59.999`) : null;
        dateMatches = Boolean(date && (!from || date >= from) && (!to || date <= to));
      }
      return (!query || number.includes(query)) && (historyStatus === "all" || status === historyStatus.toLowerCase()) && dateMatches;
    });
  }, [takeawayHistory, historySearch, historyStatus, historyDatePreset, historyDateFrom, historyDateTo]);

  const refreshTakeawayOrders = async () => {
    const result = await apiGetTakeawayOrders();
    if (!result?.success || !Array.isArray(result.data)) {
      setTakeawayOrders([]);
      setOrderNotice(result?.error || "Could not load takeaway orders from the server.");
      return;
    }
    setOrderNotice("");
    setTakeawayOrders(result.data);
  };

  const refreshTakeawayHistory = async () => {
    setHistoryLoading(true);
    const result = await apiGetTakeawayOrderHistory();
    if (!result?.success || !Array.isArray(result.data?.orders)) {
      setTakeawayHistory([]);
      setOrderNotice(result?.error || "Could not load takeaway history from the server.");
    } else {
      setTakeawayHistory(result.data.orders);
    }
    setHistoryLoading(false);
  };

  useEffect(() => {
    refreshTakeawayOrders();
    refreshTakeawayHistory();
    const intervalId = window.setInterval(refreshTakeawayOrders, 5000);
    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    if (orderPlacedSignal > 0) {
      setCart({});
      refreshTakeawayOrders();
      refreshTakeawayHistory();
    }
  }, [orderPlacedSignal]);

  const handleDispatch = async (orderId) => {
    setDispatchingOrderId(orderId);
    const result = await apiDispatchTakeawayOrder(orderId);
    if (!result?.success) {
      setOrderNotice(result?.error || "Could not dispatch this takeaway order.");
    } else {
      setOrderNotice("Takeaway order dispatched.");
      await refreshTakeawayOrders();
    }
    setDispatchingOrderId(null);
  };

  const handleRetryKitchenSend = async (orderId) => {
    setDispatchingOrderId(orderId);
    const result = await apiSendTakeawayOrderToKitchen(orderId);
    if (!result?.success) setOrderNotice(result?.error || "Could not send this order to the kitchen.");
    else {
      setOrderNotice("Takeaway order sent to the kitchen.");
      await refreshTakeawayOrders();
    }
    setDispatchingOrderId(null);
  };

  const handleCancelOrder = async (orderId) => {
    setDispatchingOrderId(orderId);
    const result = await apiCancelTakeawayOrder(orderId);
    if (!result?.success) setOrderNotice(result?.error || "Could not cancel this takeaway order.");
    else {
      setOrderNotice("Takeaway order cancelled.");
      await Promise.all([refreshTakeawayOrders(), refreshTakeawayHistory()]);
    }
    setDispatchingOrderId(null);
  };

  const handleLoadOrderDetails = async (orderId, fallbackOrder) => {
    setDispatchingOrderId(orderId);
    const [orderResult, billResult] = await Promise.all([
      apiGetTakeawayOrder(orderId),
      apiGetTakeawayOrderBillSummary(orderId),
    ]);
    if (!orderResult?.success && !fallbackOrder) {
      setOrderNotice(orderResult?.error || "Could not load takeaway order details.");
      setSelectedOrderInfo(null);
    } else {
      setSelectedOrderInfo({
        order: orderResult?.success ? (orderResult.data?.data ?? orderResult.data) : fallbackOrder,
        bill: billResult?.success ? (billResult.data?.data ?? billResult.data) : null,
      });
      setOrderNotice(!orderResult?.success
        ? "Order loaded from the server queue; the backend order-by-ID route is unavailable."
        : billResult?.success ? "" : billResult?.error || "Order loaded, but bill summary could not be loaded.");
    }
    setDispatchingOrderId(null);
  };

  const handleShowReceipt = async (orderId) => {
    setDispatchingOrderId(orderId);
    const result = await apiGetTakeawayOrderReceipt(orderId);
    if (!result?.success) setOrderNotice(result?.error || "Could not load takeaway receipt.");
    else onShowReceipt?.(result.data?.data ?? result.data, orderId);
    setDispatchingOrderId(null);
  };

  return (
    <section className="takeaway-section" style={{ padding: "1.25rem 2rem", color: "var(--text-main)", minHeight: "calc(100vh - 130px)" }}>
      <style>{`
        .takeaway-layout { display: grid; grid-template-columns: minmax(0, 1fr) minmax(280px, 320px); gap: .75rem; align-items: start; min-width: 0; }
        .takeaway-menu-filters { display: grid; grid-template-columns: minmax(0, 7fr) minmax(0, 3fr); align-items: center; gap: 10px; width: 100%; min-width: 0; margin-bottom: 1rem; }
        .takeaway-menu-search { display: flex; align-items: center; gap: .6rem; width: 100%; min-width: 0; height: 40px; box-sizing: border-box; padding: .35rem .75rem; border: 1px solid var(--border-subtle); border-radius: 9px; background: var(--bg-secondary); }
        .takeaway-menu-search input { flex: 1; width: 100%; min-width: 0; height: 100%; border: 0; outline: 0; background: transparent; color: var(--text-main); }
        .takeaway-menu-category { width: 100%; min-width: 0; height: 40px; }
        .takeaway-menu-category .searchable-select { width: 100%; height: 100%; }
        .takeaway-menu-category .searchable-select-trigger { width: 100%; height: 40px; min-height: 40px; box-sizing: border-box; padding: 0 .75rem; border-color: var(--border-subtle); border-radius: 9px; background: var(--bg-secondary); color: var(--text-main); }
        .takeaway-menu-card { border: 1px solid var(--border-subtle); border-radius: 8px; background: var(--bg-secondary); box-shadow: var(--shadow-sm); }
        .takeaway-menu-card-image { background: linear-gradient(135deg, var(--bg-tertiary), var(--bg-secondary)); }
        .takeaway-dietary-badge, .takeaway-prep-badge, .takeaway-special-badge { position: absolute; z-index: 2; display: inline-flex; align-items: center; gap: 3px; padding: 2px 4px; border: 1px solid rgba(var(--surface-rgb),0.1); border-radius: 3px; background: rgba(0,0,0,.78); color: #fff; font-size: .54rem; font-weight: 700; }
        .takeaway-dietary-badge { top: 5px; left: 5px; }
        .takeaway-dietary-dot { width: 7px; height: 7px; flex: 0 0 7px; border-radius: 50%; }
        .takeaway-special-badge { top: 5px; right: 5px; padding: 3px; background: linear-gradient(135deg,#f59e0b,#ea580c); }
        .takeaway-prep-badge { right: 5px; bottom: 5px; padding: 1px 4px; font-size: .52rem; }
        .takeaway-menu-card-name { margin: 0; color: var(--text-main); font-size: .76rem; font-weight: 800; line-height: 1.18; }
        .takeaway-menu-card-price { flex: 0 0 auto; white-space: nowrap; font-size: .82rem; }
        .takeaway-menu-description { width: 100%; box-sizing: border-box; color: var(--text-muted); font-size: .62rem; white-space: nowrap; text-overflow: ellipsis; cursor: help; }
        .takeaway-menu-description:focus-visible { outline: 2px solid var(--accent-amber); outline-offset: 2px; border-radius: 2px; }
        .takeaway-description-tooltip { position: fixed; z-index: 99999; width: max-content; max-width: min(300px, calc(100vw - 24px)); max-height: calc(100vh - 24px); overflow: auto; padding: .45rem .6rem; border: 1px solid var(--border-subtle); border-radius: 7px; background: var(--bg-secondary); color: var(--text-main); box-shadow: 0 8px 24px rgba(0,0,0,.35); font-size: .76rem; line-height: 1.35; white-space: normal; overflow-wrap: anywhere; pointer-events: none; animation: takeawayTooltipIn 140ms ease-out both; }
        .takeaway-description-tooltip.above { transform: translateY(-100%); }
        @keyframes takeawayTooltipIn { from { opacity: 0; } to { opacity: 1; } }
        .takeaway-add-button, .takeaway-qty-button { display: inline-flex; flex: 0 0 auto; align-items: center; justify-content: center; gap: .15rem; min-height: 24px; padding: .25rem .45rem; border: 1px solid rgba(245,158,11,.45); border-radius: 4px; background: linear-gradient(135deg,#f59e0b,#ea580c); color: #111827; font-size: .65rem; font-weight: 800; cursor: pointer; }
        .takeaway-qty-button { width: 21px; height: 21px; min-height: 21px; padding: 0; background: rgba(245,158,11,.14); color: var(--accent-amber-light); }
        .takeaway-order-panel { position: sticky; top: 100px; box-sizing: border-box; width: 100%; min-width: 0; padding: 1rem; border: 1px solid var(--border-subtle); border-radius: 12px; background: var(--bg-secondary); }
        .takeaway-cart-line { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: .4rem .6rem; align-items: start; border-bottom: 1px solid var(--border-subtle); padding-bottom: .65rem; }
        .takeaway-cart-line-details { min-width: 0; overflow-wrap: anywhere; }
        .takeaway-cart-line-controls { grid-column: 1; display: inline-flex; align-items: center; justify-self: start; gap: .35rem; min-height: 26px; padding: .1rem .25rem; border: 1px solid #e2e8f0; border-radius: 7px; background: #fff; color: #172033; }
        .takeaway-cart-line-controls button { display: inline-flex; align-items: center; justify-content: center; width: 19px; height: 20px; padding: 0; border: 0; border-radius: 4px; background: transparent; cursor: pointer; }
        .takeaway-cart-line-controls button:first-child { color: #172033; }
        .takeaway-cart-line-controls button:last-child { color: #ea7b00; }
        .takeaway-cart-line-controls button:focus-visible { outline: 2px solid var(--accent-amber); outline-offset: 2px; }
        .takeaway-cart-line-quantity { min-width: 1ch; color: #172033; font-size: .82rem; font-weight: 800; text-align: center; }
        .takeaway-cart-line-subtotal { grid-column: 2; grid-row: 2; align-self: center; white-space: nowrap; }
        .takeaway-kitchen-order { margin-top: .65rem; padding: .65rem; border: 1px solid var(--border-subtle); border-radius: 8px; background: var(--bg-tertiary); }
        .takeaway-secondary-button { padding: .4rem .35rem; border: 1px solid var(--border-subtle); border-radius: 6px; background: var(--bg-secondary); color: var(--text-main); font-size: .75rem; font-weight: 700; cursor: pointer; }
        .takeaway-page-header { display: flex; justify-content: space-between; align-items: center; gap: 1rem; margin-bottom: 1rem; flex-wrap: wrap; }
        .takeaway-header-actions { display: flex; align-items: center; justify-content: flex-end; gap: .5rem; flex-wrap: wrap; }
        .takeaway-header-actions .takeaway-secondary-button { display: inline-flex; align-items: center; justify-content: center; gap: .45rem; min-height: 38px; padding: .55rem .75rem; font-size: .85rem; white-space: nowrap; }
        @media (max-width: 600px) { .takeaway-page-header { align-items: flex-start; } .takeaway-header-actions { width: 100%; justify-content: flex-start; } .takeaway-header-actions .takeaway-secondary-button { flex: 1 1 auto; } }
        @media (max-width: 600px) { .takeaway-menu-filters { grid-template-columns: minmax(0, 1fr); } }
        .takeaway-history-overlay { position: fixed; inset: 0; z-index: 1200; display: flex; align-items: center; justify-content: center; padding: 1rem; background: rgba(0,0,0,.68); }
        .takeaway-history-dialog { display: flex; flex-direction: column; width: min(100%, 620px); max-height: min(82vh, 760px); overflow: hidden; border: 1px solid var(--border-subtle); border-radius: 14px; background: var(--bg-secondary); color: var(--text-main); box-shadow: 0 24px 70px rgba(0,0,0,.4); }
        .takeaway-history-content { overflow-y: auto; padding: .9rem 1rem 1rem; }
        .takeaway-filter-controls { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: .5rem; padding: .75rem 1rem; border-bottom: 1px solid var(--border-subtle); }
        .takeaway-filter-controls input, .takeaway-filter-controls select { box-sizing: border-box; width: 100%; min-width: 0; padding: .52rem .6rem; border: 1px solid var(--border-subtle); border-radius: 7px; background: var(--bg-tertiary); color: var(--text-main); font-size: .82rem; }
        .takeaway-history-row { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: .6rem; align-items: start; margin-bottom: .6rem; padding: .75rem; border: 1px solid var(--border-subtle); border-radius: 9px; background: var(--bg-tertiary); }
        @media (max-width: 600px) { .takeaway-history-overlay { padding: .5rem; } .takeaway-history-dialog { max-height: 90vh; border-radius: 11px; } .takeaway-history-row { grid-template-columns: minmax(0, 1fr); } .takeaway-filter-controls { grid-template-columns: minmax(0, 1fr); } }
        @media (max-width: 900px) { .takeaway-layout { grid-template-columns: minmax(0, 1fr); } .takeaway-order-panel { position: static; } }
        @media (max-width: 760px) { .takeaway-menu-card-name { font-size: .72rem; } .takeaway-menu-description { font-size: .59rem; } }
        @media (max-width: 600px) { .takeaway-section { padding: 1rem !important; } }
      `}</style>
      <div className="takeaway-page-header">
        <div><h2 style={{ margin: 0, fontSize: "1.5rem" }}>Takeaway Menu</h2><p style={{ margin: "0.3rem 0 0", color: "var(--text-muted)" }}>Choose items for a takeaway order.</p></div>
        <div className="takeaway-header-actions">
          <button type="button" onClick={() => setHistoryOpen(true)} className="takeaway-secondary-button"><History size={16}/> Order History</button>
          <button type="button" onClick={() => setPaidOrdersOpen(true)} className="takeaway-secondary-button"><ClipboardList size={16}/> Paid Takeaway Orders{takeawayOrders.length > 0 && <span style={{ color: "var(--accent-amber-light)" }}>({takeawayOrders.length})</span>}</button>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: ".5rem", background: "var(--bg-tertiary)", border: "1px solid var(--border-subtle)", borderRadius: 10, padding: ".6rem .8rem" }}><ShoppingBag size={18}/><strong>{count} items</strong><span style={{ color: "var(--accent-amber-light)" }}>₹{total.toFixed(2)}</span></div>
      </div>

      {/* ── Active Takeaway Orders & Kitchen Cooking Status Banner ── */}
      {takeawayOrders.length > 0 && (
        <div
          style={{
            marginBottom: "1.25rem",
            padding: "1rem 1.25rem",
            background: "var(--bg-secondary)",
            border: "1.5px solid var(--border-subtle)",
            borderRadius: "12px",
            boxShadow: "var(--shadow-sm)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.85rem", flexWrap: "wrap", gap: "0.5rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
              <div
                style={{
                  width: "10px",
                  height: "10px",
                  borderRadius: "50%",
                  background: takeawayOrders.some((o) => (o.items || []).every((i) => ["ready", "served", "completed"].includes(String(i.kotStatus || "").toLowerCase())))
                    ? "#10b981"
                    : "#f59e0b",
                }}
              />
              <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700 }}>
                Active Takeaway Orders ({takeawayOrders.length})
              </h3>
              <span style={{ fontSize: "0.76rem", color: "var(--text-muted)" }}>
                Live orders from KOT — When kitchen finishes cooking, review items and handover to user
              </span>
            </div>
            <button
              type="button"
              onClick={refreshTakeawayOrders}
              className="takeaway-secondary-button"
              style={{ fontSize: "0.75rem", padding: "0.3rem 0.65rem" }}
            >
              ↻ Refresh
            </button>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(310px, 1fr))",
              gap: "0.85rem",
            }}
          >
            {takeawayOrders.map((order) => {
              const orderId = order.id ?? order.orderId ?? order.Id;
              const orderNumber = order.orderNumber ?? orderId;
              const orderItems = Array.isArray(order.items) ? order.items : [];
              const allReady = orderItems.length > 0 && orderItems.every((item) =>
                ["ready", "served", "completed"].includes(String(item.kotStatus || "").toLowerCase())
              );
              const isCooking = orderItems.some((item) => String(item.kotStatus || "").toLowerCase() === "cooking");
              const orderTotal = order.grandTotal ?? order.totalAmount ?? order.total ?? order.amount;
              const statusBg = allReady ? "rgba(16, 185, 129, 0.15)" : isCooking ? "rgba(245, 158, 11, 0.15)" : "rgba(59, 130, 246, 0.15)";
              const statusColor = allReady ? "#10b981" : isCooking ? "#f59e0b" : "#3b82f6";
              const statusBorder = allReady ? "rgba(16, 185, 129, 0.4)" : isCooking ? "rgba(245, 158, 11, 0.4)" : "rgba(59, 130, 246, 0.4)";

              return (
                <div
                  key={orderId}
                  style={{
                    padding: "0.85rem",
                    borderRadius: "10px",
                    border: `1.5px solid ${allReady ? "#10b981" : "var(--border-subtle)"}`,
                    background: allReady ? "rgba(16, 185, 129, 0.04)" : "var(--bg-tertiary)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.55rem",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <strong style={{ fontSize: "0.95rem" }}>Order #{orderNumber}</strong>
                      {order.customerName && (
                        <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "2px" }}>
                          👤 {order.customerName} {order.customerPhone ? `(${order.customerPhone})` : ""}
                        </div>
                      )}
                    </div>
                    <span
                      style={{
                        padding: "0.22rem 0.55rem",
                        borderRadius: "999px",
                        background: statusBg,
                        color: statusColor,
                        border: `1px solid ${statusBorder}`,
                        fontSize: "0.72rem",
                        fontWeight: 700,
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "0.3rem",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {allReady ? <CheckCircle2 size={12} /> : isCooking ? <ChefHat size={12} /> : <Clock size={12} />}
                      {allReady ? "Cooking Done" : isCooking ? "Cooking" : "Kitchen Queue"}
                    </span>
                  </div>

                  {/* Items list with individual dish statuses */}
                  <div style={{ background: "var(--bg-secondary)", padding: "0.5rem 0.65rem", borderRadius: "7px", fontSize: "0.8rem", border: "1px solid var(--border-subtle)" }}>
                    <div style={{ fontSize: "0.68rem", fontWeight: 700, color: "var(--text-muted)", marginBottom: "0.25rem", textTransform: "uppercase" }}>
                      Dishes ({orderItems.length}):
                    </div>
                    {orderItems.map((item, idx) => {
                      const itemReady = ["ready", "served", "completed"].includes(String(item.kotStatus || "").toLowerCase());
                      return (
                        <div key={idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.15rem 0" }}>
                          <span style={{ fontWeight: 550 }}>{item.name || item.dishName} × {item.quantity || item.qty}</span>
                          <span style={{ fontSize: "0.7rem", fontWeight: 700, color: itemReady ? "#10b981" : "#f59e0b" }}>
                            {itemReady ? "Ready ✓" : "In Prep"}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Price & Secondary Actions */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "0.1rem" }}>
                    <span style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
                      Total: <strong style={{ color: "var(--text-main)", fontSize: "0.95rem" }}>₹{Number(orderTotal || 0).toFixed(2)}</strong>
                    </span>
                    <button
                      type="button"
                      onClick={() => handleShowReceipt(orderId)}
                      className="takeaway-secondary-button"
                      style={{ padding: "0.3rem 0.55rem", fontSize: "0.75rem" }}
                    >
                      Receipt
                    </button>
                  </div>

                  {/* Handover & Send to User Button */}
                  <button
                    type="button"
                    disabled={!allReady || dispatchingOrderId === orderId}
                    onClick={() => handleDispatch(orderId)}
                    style={{
                      width: "100%",
                      padding: "0.55rem 0.75rem",
                      borderRadius: "7px",
                      border: "none",
                      background: allReady ? "linear-gradient(135deg, #10b981 0%, #059669 100%)" : "var(--bg-secondary)",
                      color: allReady ? "#ffffff" : "var(--text-muted)",
                      fontWeight: 800,
                      fontSize: "0.82rem",
                      cursor: allReady ? "pointer" : "not-allowed",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "0.4rem",
                      boxShadow: allReady ? "0 2px 8px rgba(16, 185, 129, 0.35)" : "none",
                    }}
                  >
                    {dispatchingOrderId === orderId ? "Dispatching…" : allReady ? "Handover & Send to User ✓" : "Awaiting Cooking Completion in KOT"}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="takeaway-menu-filters">
        <label className="takeaway-menu-search"><Search size={16} aria-hidden="true"/><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search Menu Items" aria-label="Search menu items"/></label>
        <div className="takeaway-menu-category"><SearchableSelect aria-label="Filter menu by category" value={category} onChange={(e) => setCategory(e.target.value)} style={{ minWidth: 0 }}><option value="all">All Categories</option>{categories.map((name) => <option key={name} value={name}>{name}</option>)}</SearchableSelect></div>
      </div>
      <div className="takeaway-layout">
      {menuLoading ? <p>Loading menu…</p> : <div className="takeaway-menu-grid menu-catalog-grid">
        {items.map((item) => {
          const quantity = cart[item.id]?.quantity || 0;
          return <article key={item.id} className="takeaway-menu-card menu-catalog-card">
            <div className="takeaway-menu-card-image menu-catalog-image"><img src={getMenuItemImage(item)} alt={item.name} onError={(event) => handleDishImageError(event, item)}/><span className="takeaway-dietary-badge"><i className="takeaway-dietary-dot" style={{ background: item.dietaryType?.toUpperCase() === "VEG" || item.isVeg ? "#10b981" : "#ef4444" }} />{item.dietaryType?.toUpperCase() === "VEG" || item.isVeg ? "VEG" : "NON-VEG"}</span>{(item.isChefSpecial || item.isChefsSpecial || item.isSpecial) && <span className="takeaway-special-badge">★ Special</span>}<span className="takeaway-prep-badge">{item.prepTime || `${item.prepTimeMinutes || 15} min`}</span></div>
            <div className="takeaway-menu-card-body menu-catalog-body"><div className="takeaway-menu-card-info menu-catalog-info"><strong className="takeaway-menu-card-name menu-catalog-title">{item.name}</strong>{item.description && <p className="takeaway-menu-description menu-catalog-description" tabIndex={0} aria-label={item.description} aria-describedby={descriptionTooltip?.itemId === item.id ? descriptionTooltipId : undefined} onMouseEnter={(event) => showDescriptionTooltip(event, item.description, item.id)} onMouseLeave={() => setDescriptionTooltip(null)} onFocus={(event) => showDescriptionTooltip(event, item.description, item.id)} onBlur={() => setDescriptionTooltip(null)}>{item.description}</p>}</div><div className="takeaway-menu-card-actions menu-catalog-actions"><b className="takeaway-menu-card-price" style={{ color: "var(--accent-amber-light)" }}>₹{Number(item.price || 0).toFixed(2)}</b>{quantity ? <span style={{ display: "inline-flex", alignItems: "center", gap: ".35rem", flex: "0 0 auto" }}><button type="button" className="takeaway-qty-button" aria-label={`Remove one ${item.name}`} onClick={() => changeQty(item, -1)}><Minus size={14}/></button><b aria-live="polite">{quantity}</b><button type="button" className="takeaway-qty-button" aria-label={`Add one ${item.name}`} onClick={() => changeQty(item, 1)}><Plus size={14}/></button></span> : <button type="button" className="takeaway-add-button" onClick={() => changeQty(item, 1)}><Plus size={14}/> Add</button>}</div></div>
          </article>;
        })}
        {!items.length && <p style={{ color: "var(--text-muted)" }}>No menu items found.</p>}
      </div>}
      <aside className="takeaway-order-panel">
        <h3 style={{ margin: "0 0 .8rem" }}>Takeaway Order</h3>
        {!count ? <p style={{ color: "var(--text-muted)" }}>Add menu items to start an order.</p> : <div style={{ display: "grid", gap: ".7rem", maxHeight: "45vh", overflowY: "auto" }}>
          {Object.values(cart).map(({ item, quantity }) => <div key={item.id} className="takeaway-cart-line"><div className="takeaway-cart-line-details"><strong>{item.name}</strong><div style={{ color: "var(--text-muted)", fontSize: ".85rem" }}>₹{Number(item.price || 0).toFixed(2)} each</div></div><div className="takeaway-cart-line-controls" aria-label={`Quantity for ${item.name}`}><button type="button" aria-label={`Remove one ${item.name}`} onClick={() => changeQty(item, -1)}><Minus size={12}/></button><span className="takeaway-cart-line-quantity" aria-live="polite">{quantity}</span><button type="button" aria-label={`Add one ${item.name}`} onClick={() => changeQty(item, 1)}><Plus size={12}/></button></div><span className="takeaway-cart-line-subtotal">₹{(Number(item.price || 0) * quantity).toFixed(2)}</span></div>)}
        </div>}
        <div style={{ borderTop: "1px solid var(--border-subtle)", marginTop: ".8rem", paddingTop: ".7rem", display: "flex", justifyContent: "space-between" }}><span>Subtotal</span><strong>₹{total.toFixed(2)}</strong></div>
        <div style={{ marginTop: ".45rem", display: "flex", justifyContent: "space-between", color: "var(--text-muted)" }}><span>GST (5%)</span><span>₹{(total * .05).toFixed(2)}</span></div>
        <div style={{ marginTop: ".55rem", display: "flex", justifyContent: "space-between", fontSize: "1.1rem" }}><strong>Total</strong><strong style={{ color: "var(--accent-amber-light)" }}>₹{Math.round(total * 1.05).toFixed(2)}</strong></div>
        <button disabled={!count} onClick={() => onCheckout?.(Object.values(cart).map(({ item, quantity }) => ({ ...item, quantity })))} style={{ width: "100%", marginTop: ".9rem", padding: ".75rem", border: 0, borderRadius: 9, background: count ? "var(--accent-amber)" : "var(--bg-tertiary)", color: count ? "#111" : "var(--text-muted)", fontWeight: 800, cursor: count ? "pointer" : "not-allowed" }}>Pay &amp; Send to Kitchen</button>
        {orderNotice && <p role="status" style={{ color: "var(--text-muted)", fontSize: ".85rem", margin: ".45rem 0 0" }}>{orderNotice}</p>}
        {selectedOrderInfo && <div className="takeaway-kitchen-order" role="region" aria-label="Takeaway order details">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: ".5rem" }}><h4 style={{ margin: 0 }}>Order #{selectedOrderInfo.order?.id ?? selectedOrderInfo.order?.orderId ?? ""}</h4><button className="takeaway-secondary-button" onClick={() => setSelectedOrderInfo(null)}>Close</button></div>
          {selectedOrderInfo.bill ? <>
            <div style={{ color: "var(--text-muted)", fontSize: ".85rem", margin: ".45rem 0" }}>{(selectedOrderInfo.bill.items || []).map((item) => `${item.name} × ${item.quantity}`).join(", ")}</div>
            <div style={{ display: "flex", justifyContent: "space-between" }}><span>Subtotal</span><strong>₹{Number(selectedOrderInfo.bill.subtotal || 0).toFixed(2)}</strong></div>
            <div style={{ display: "flex", justifyContent: "space-between" }}><span>Tax</span><strong>₹{Number(selectedOrderInfo.bill.taxAmount || 0).toFixed(2)}</strong></div>
            <div style={{ display: "flex", justifyContent: "space-between" }}><span>Total</span><strong>₹{Number(selectedOrderInfo.bill.grandTotal || 0).toFixed(2)}</strong></div>
          </> : <p role="status" style={{ color: "var(--text-muted)" }}>Bill summary unavailable.</p>}
        </div>}
      </aside>
      </div>
      {descriptionTooltip && typeof document !== "undefined" && createPortal(
        <div
          id={descriptionTooltipId}
          role="tooltip"
          className={`takeaway-description-tooltip${descriptionTooltip.above ? " above" : ""}`}
          style={{ left: descriptionTooltip.left, top: descriptionTooltip.top }}
        >
          {descriptionTooltip.description}
        </div>,
        document.body,
      )}
      {paidOrdersOpen && <div className="takeaway-history-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) setPaidOrdersOpen(false); }}>
        <section className="takeaway-history-dialog" role="dialog" aria-modal="true" aria-labelledby="paid-takeaway-title">
          <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: ".75rem", padding: "1rem", borderBottom: "1px solid var(--border-subtle)" }}>
            <div><h3 id="paid-takeaway-title" style={{ margin: 0 }}>Paid Takeaway Orders</h3><p style={{ margin: ".25rem 0 0", color: "var(--text-muted)", fontSize: ".85rem" }}>Active paid orders</p></div>
            <button type="button" className="takeaway-secondary-button" aria-label="Close paid takeaway orders" onClick={() => setPaidOrdersOpen(false)} style={{ display: "inline-flex", padding: ".45rem", alignItems: "center" }}><X size={18}/></button>
          </header>
          <div className="takeaway-history-content">
          <div className="takeaway-filter-controls">
            <input aria-label="Search paid takeaway orders" placeholder="Search order number" value={paidSearch} onChange={(event) => setPaidSearch(event.target.value)} />
            <SearchableSelect aria-label="Filter paid orders by status" value={paidStatus} onChange={(event) => setPaidStatus(event.target.value)}><option value="all">All statuses</option>{paidStatuses.map((status) => <option key={status} value={status}>{status}</option>)}{!paidStatuses.some((status) => status.toLowerCase() === "in kitchen") && <option value="__in_kitchen">In Kitchen</option>}</SearchableSelect>
            <input aria-label="Filter paid orders by date" type="date" value={paidDate} onChange={(event) => setPaidDate(event.target.value)} />
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: ".5rem", color: "var(--text-muted)", fontSize: ".8rem" }}><span>{filteredPaidOrders.length} matching {filteredPaidOrders.length === 1 ? "order" : "orders"}</span><button type="button" className="takeaway-secondary-button" onClick={() => { setPaidSearch(""); setPaidStatus("all"); setPaidDate(""); }}>Clear Filters</button></div>
          </div>
          {!filteredPaidOrders.length && <p style={{ color: "var(--text-muted)", fontSize: ".9rem", padding: "0 1rem" }}>{takeawayOrders.length ? "No paid takeaway orders match these filters." : orderNotice || "No active takeaway orders."}</p>}
          {filteredPaidOrders.map((order) => {
            const orderItems = Array.isArray(order.items) ? order.items : [];
            const allReady = orderItems.length > 0 && orderItems.every((item) => ["ready", "served", "completed"].includes(String(item.kotStatus || "").toLowerCase()));
            const kotNotSent = orderItems.some((item) => !item.kotId);
            const orderId = order.id ?? order.orderId ?? order.Id;
            const orderTotal = order.grandTotal ?? order.totalAmount ?? order.total ?? order.amount;
            const displayStatus = order.status ?? order.Status ?? (allReady ? "Ready" : "In kitchen");
            return <div className="takeaway-kitchen-order" key={orderId}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: ".5rem" }}><strong>Order #{order.orderNumber ?? orderId}</strong><strong style={{ color: allReady ? "#10b981" : "var(--accent-amber-light)" }}>{displayStatus}</strong></div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: ".35rem", marginTop: ".4rem" }}>
                <button disabled={dispatchingOrderId === orderId} onClick={() => handleLoadOrderDetails(orderId, order)} className="takeaway-secondary-button">Details / Bill</button>
                <button disabled={dispatchingOrderId === orderId} onClick={() => handleShowReceipt(orderId)} className="takeaway-secondary-button">Receipt</button>
                <button disabled={dispatchingOrderId === orderId} onClick={() => handleCancelOrder(orderId)} className="takeaway-secondary-button">Cancel</button>
              </div>
              <div style={{ color: "var(--text-muted)", fontSize: ".85rem", margin: ".35rem 0" }}>{orderItems.map((item) => `${item.name} × ${item.quantity}`).join(", ")}</div>
              {orderTotal != null && <div style={{ display: "flex", justifyContent: "space-between", margin: ".35rem 0", fontSize: ".9rem" }}><span style={{ color: "var(--text-muted)" }}>Total</span><strong>₹{Number(orderTotal).toFixed(2)}</strong></div>}
              {kotNotSent && <button disabled={dispatchingOrderId === orderId} onClick={() => handleRetryKitchenSend(orderId)} style={{ width: "100%", marginBottom: ".4rem", padding: ".45rem", border: "1px solid var(--border-subtle)", borderRadius: 6, background: "var(--bg-secondary)", color: "var(--text-main)", fontWeight: 700 }}>{dispatchingOrderId === orderId ? "Sending…" : "Retry Send to Kitchen"}</button>}
              <button disabled={!allReady || dispatchingOrderId === orderId} onClick={() => handleDispatch(orderId)} style={{ width: "100%", padding: ".45rem", border: 0, borderRadius: 6, background: allReady ? "#10b981" : "var(--bg-secondary)", color: allReady ? "#062b20" : "var(--text-muted)", fontWeight: 750, cursor: allReady ? "pointer" : "not-allowed" }}>{dispatchingOrderId === orderId ? "Dispatching…" : "Mark Items Dispatched"}</button>
            </div>;
          })}
        </div>
        </section>
      </div>}
      {historyOpen && <div className="takeaway-history-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) setHistoryOpen(false); }}>
        <section className="takeaway-history-dialog" role="dialog" aria-modal="true" aria-labelledby="takeaway-history-title">
          <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: ".75rem", padding: "1rem", borderBottom: "1px solid var(--border-subtle)" }}>
            <div><h3 id="takeaway-history-title" style={{ margin: 0 }}>Takeaway Order History</h3><p style={{ margin: ".25rem 0 0", color: "var(--text-muted)", fontSize: ".85rem" }}>Previous takeaway orders</p></div>
            <button type="button" className="takeaway-secondary-button" aria-label="Close order history" onClick={() => setHistoryOpen(false)} style={{ display: "inline-flex", padding: ".45rem", alignItems: "center" }}><X size={18}/></button>
          </header>
          <div className="takeaway-filter-controls">
            <input aria-label="Search takeaway history by order number" placeholder="Search order number" value={historySearch} onChange={(event) => setHistorySearch(event.target.value)} />
            <SearchableSelect aria-label="Filter takeaway history by status" value={historyStatus} onChange={(event) => setHistoryStatus(event.target.value)}><option value="all">All statuses</option>{historyStatuses.map((status) => <option key={status} value={status}>{status}</option>)}</SearchableSelect>
            <SearchableSelect aria-label="Filter takeaway history by date" value={historyDatePreset} onChange={(event) => setHistoryDatePreset(event.target.value)}><option value="all">All dates</option><option value="today">Today</option><option value="yesterday">Yesterday</option><option value="7days">Last 7 Days</option><option value="30days">Last 30 Days</option><option value="custom">Custom Date Range</option></SearchableSelect>
            {historyDatePreset === "custom" && <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: ".5rem", gridColumn: "1 / -1" }}><input aria-label="History start date" type="date" value={historyDateFrom} onChange={(event) => setHistoryDateFrom(event.target.value)} /><input aria-label="History end date" type="date" value={historyDateTo} onChange={(event) => setHistoryDateTo(event.target.value)} /></div>}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: ".5rem", color: "var(--text-muted)", fontSize: ".8rem" }}><span>{filteredTakeawayHistory.length} matching {filteredTakeawayHistory.length === 1 ? "order" : "orders"}</span><button type="button" className="takeaway-secondary-button" onClick={() => { setHistorySearch(""); setHistoryStatus("all"); setHistoryDatePreset("all"); setHistoryDateFrom(""); setHistoryDateTo(""); }}>Clear Filters</button></div>
          </div>
          <div className="takeaway-history-content">
            {historyLoading ? <p role="status" style={{ color: "var(--text-muted)" }}>Loading takeaway history…</p> : !filteredTakeawayHistory.length ? <p style={{ color: "var(--text-muted)" }}>{takeawayHistory.length ? "No takeaway orders match these filters." : "No takeaway orders in history."}</p> : filteredTakeawayHistory.map((order) => {
              const orderId = order.id ?? order.orderId ?? order.Id;
              const orderItems = Array.isArray(order.items) ? order.items : [];
              const orderTotal = order.grandTotal ?? order.totalAmount ?? order.total ?? order.amount;
              const orderDate = order.dateTime ?? order.createdAt ?? order.orderDate ?? order.date;
              return <article className="takeaway-history-row" key={`history-${orderId}`}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: ".45rem" }}><strong>Order #{order.orderNumber ?? orderId}</strong><span style={{ color: "var(--accent-amber-light)", fontSize: ".82rem" }}>{order.status ?? order.Status ?? ""}</span></div>
                  <div style={{ color: "var(--text-muted)", fontSize: ".85rem", margin: ".35rem 0" }}>{orderItems.map((item) => `${item.name ?? item.dishName ?? "Item"} × ${item.quantity ?? item.qty ?? 0}`).join(", ") || "No item details available"}</div>
                  {orderDate && <time dateTime={orderDate} style={{ color: "var(--text-muted)", fontSize: ".78rem" }}>{new Date(orderDate).toLocaleString()}</time>}
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: ".45rem" }}>
                  {orderTotal != null && <strong>₹{Number(orderTotal).toFixed(2)}</strong>}
                  <button className="takeaway-secondary-button" disabled={dispatchingOrderId === orderId} onClick={() => handleShowReceipt(orderId)}>Load Receipt</button>
                </div>
              </article>;
            })}
          </div>
        </section>
      </div>}
    </section>
  );
}
