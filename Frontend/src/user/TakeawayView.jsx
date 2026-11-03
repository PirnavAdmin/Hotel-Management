import React, { useEffect, useMemo, useState } from "react";
import { Search, ShoppingBag, Plus, Minus } from "lucide-react";
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
  const [takeawayOrders, setTakeawayOrders] = useState([]);
  const [takeawayHistory, setTakeawayHistory] = useState([]);
  const [orderNotice, setOrderNotice] = useState("");
  const [dispatchingOrderId, setDispatchingOrderId] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [selectedOrderInfo, setSelectedOrderInfo] = useState(null);
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
        .takeaway-layout { display: grid; grid-template-columns: minmax(0, 1fr) minmax(290px, 340px); gap: 1rem; align-items: start; }
        .takeaway-menu-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 155px), 1fr)); gap: .6rem; min-width: 0; align-content: start; }
        .takeaway-menu-card { box-sizing: border-box; display: flex; flex-direction: column; height: auto; min-height: 0; min-width: 0; overflow: hidden; border: 1px solid var(--border-subtle); border-radius: 9px; background: var(--bg-secondary); }
        .takeaway-menu-card img { display: block; width: 100%; height: 64px; flex: 0 0 64px; object-fit: cover; background: var(--bg-tertiary); }
        .takeaway-menu-card-body { display: flex; flex-direction: column; gap: .35rem; padding: .38rem; }
        .takeaway-menu-card-name { display: -webkit-box; height: 2.2em; min-height: 2.2em; overflow: hidden; -webkit-box-orient: vertical; -webkit-line-clamp: 2; line-height: 1.1; font-size: .8rem; }
        .takeaway-menu-description { display: none; }
        .takeaway-add-button, .takeaway-qty-button { display: inline-flex; align-items: center; justify-content: center; gap: .2rem; min-height: 27px; padding: .25rem .45rem; border: 1px solid rgba(245,158,11,.45); border-radius: 6px; background: linear-gradient(135deg,#f59e0b,#ea580c); color: #111827; font-size: .76rem; font-weight: 800; cursor: pointer; }
        .takeaway-qty-button { width: 26px; min-height: 26px; padding: 0; background: rgba(245,158,11,.14); color: var(--accent-amber-light); }
        .takeaway-order-panel { position: sticky; top: 100px; box-sizing: border-box; width: 100%; min-width: 0; padding: 1rem; border: 1px solid var(--border-subtle); border-radius: 12px; background: var(--bg-secondary); }
        .takeaway-kitchen-order { margin-top: .65rem; padding: .65rem; border: 1px solid var(--border-subtle); border-radius: 8px; background: var(--bg-tertiary); }
        .takeaway-secondary-button { padding: .4rem .35rem; border: 1px solid var(--border-subtle); border-radius: 6px; background: var(--bg-secondary); color: var(--text-main); font-size: .75rem; font-weight: 700; cursor: pointer; }
        @media (max-width: 900px) { .takeaway-layout { grid-template-columns: minmax(0, 1fr); } .takeaway-order-panel { position: static; } }
        @media (max-width: 600px) { .takeaway-section { padding: 1rem !important; } }
      `}</style>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem", marginBottom: "1rem", flexWrap: "wrap" }}>
        <div><h2 style={{ margin: 0, fontSize: "1.5rem" }}>Takeaway Menu</h2><p style={{ margin: "0.3rem 0 0", color: "var(--text-muted)" }}>Choose items for a takeaway order.</p></div>
        <div style={{ display: "flex", alignItems: "center", gap: ".5rem", background: "var(--bg-tertiary)", border: "1px solid var(--border-subtle)", borderRadius: 10, padding: ".6rem .8rem" }}><ShoppingBag size={18}/><strong>{count} items</strong><span style={{ color: "var(--accent-amber-light)" }}>₹{total.toFixed(2)}</span></div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: ".65rem", flexWrap: "wrap", marginBottom: "1rem" }}>
        <label style={{ display: "flex", alignItems: "center", gap: ".6rem", width: "min(100%, 350px)", padding: ".55rem .75rem", border: "1px solid var(--border-subtle)", borderRadius: 9, background: "var(--bg-secondary)" }}><Search size={16}/><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search menu items" style={{ background: "transparent", border: 0, outline: 0, color: "inherit", width: "100%" }}/></label>
        <select aria-label="Filter menu by category" value={category} onChange={(e) => setCategory(e.target.value)} style={{ minWidth: 180, padding: ".62rem .75rem", border: "1px solid var(--border-subtle)", borderRadius: 9, background: "var(--bg-secondary)", color: "var(--text-main)" }}><option value="all">All Categories</option>{categories.map((name) => <option key={name} value={name}>{name}</option>)}</select>
      </div>
      <div className="takeaway-layout">
      {menuLoading ? <p>Loading menu…</p> : <div className="takeaway-menu-grid">
        {items.map((item) => {
          const quantity = cart[item.id]?.quantity || 0;
          return <article key={item.id} className="takeaway-menu-card">
            <img src={getMenuItemImage(item)} alt={item.name} onError={handleDishImageError}/>
            <div className="takeaway-menu-card-body"><strong className="takeaway-menu-card-name">{item.name}</strong><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: ".4rem" }}><b style={{ color: "var(--accent-amber-light)", whiteSpace: "nowrap" }}>₹{Number(item.price || 0).toFixed(2)}</b>{quantity ? <span style={{ display: "flex", alignItems: "center", gap: ".4rem" }}><button className="takeaway-qty-button" aria-label={`Remove one ${item.name}`} onClick={() => changeQty(item, -1)}><Minus size={14}/></button><b>{quantity}</b><button className="takeaway-qty-button" aria-label={`Add one ${item.name}`} onClick={() => changeQty(item, 1)}><Plus size={14}/></button></span> : <button className="takeaway-add-button" onClick={() => changeQty(item, 1)}><Plus size={14}/> Add</button>}</div></div>
          </article>;
        })}
        {!items.length && <p style={{ color: "var(--text-muted)" }}>No menu items found.</p>}
      </div>}
      <aside className="takeaway-order-panel">
        <h3 style={{ margin: "0 0 .8rem" }}>Takeaway Order</h3>
        {!count ? <p style={{ color: "var(--text-muted)" }}>Add menu items to start an order.</p> : <div style={{ display: "grid", gap: ".7rem", maxHeight: "45vh", overflowY: "auto" }}>
          {Object.values(cart).map(({ item, quantity }) => <div key={item.id} style={{ display: "flex", justifyContent: "space-between", gap: ".5rem", borderBottom: "1px solid var(--border-subtle)", paddingBottom: ".55rem" }}><div><strong>{item.name}</strong><div style={{ color: "var(--text-muted)", fontSize: ".85rem" }}>₹{Number(item.price || 0).toFixed(2)} × {quantity}</div></div><span>₹{(Number(item.price || 0) * quantity).toFixed(2)}</span></div>)}
        </div>}
        <div style={{ borderTop: "1px solid var(--border-subtle)", marginTop: ".8rem", paddingTop: ".7rem", display: "flex", justifyContent: "space-between" }}><span>Subtotal</span><strong>₹{total.toFixed(2)}</strong></div>
        <div style={{ marginTop: ".45rem", display: "flex", justifyContent: "space-between", color: "var(--text-muted)" }}><span>GST (5%)</span><span>₹{(total * .05).toFixed(2)}</span></div>
        <div style={{ marginTop: ".55rem", display: "flex", justifyContent: "space-between", fontSize: "1.1rem" }}><strong>Total</strong><strong style={{ color: "var(--accent-amber-light)" }}>₹{Math.round(total * 1.05).toFixed(2)}</strong></div>
        <button disabled={!count} onClick={() => onCheckout?.(Object.values(cart).map(({ item, quantity }) => ({ ...item, quantity })))} style={{ width: "100%", marginTop: ".9rem", padding: ".75rem", border: 0, borderRadius: 9, background: count ? "var(--accent-amber)" : "var(--bg-tertiary)", color: count ? "#111" : "var(--text-muted)", fontWeight: 800, cursor: count ? "pointer" : "not-allowed" }}>Pay &amp; Send to Kitchen</button>
        <div style={{ borderTop: "1px solid var(--border-subtle)", marginTop: "1rem", paddingTop: ".8rem" }}>
          <h3 style={{ margin: "0 0 .5rem" }}>Paid Takeaway Orders</h3>
          {orderNotice && <p role="status" style={{ color: "var(--text-muted)", fontSize: ".85rem" }}>{orderNotice}</p>}
          {!takeawayOrders.length && !orderNotice && <p style={{ color: "var(--text-muted)", fontSize: ".9rem" }}>No active takeaway orders.</p>}
          {takeawayOrders.map((order) => {
            const orderItems = Array.isArray(order.items) ? order.items : [];
            const allReady = orderItems.length > 0 && orderItems.every((item) => ["ready", "served", "completed"].includes(String(item.kotStatus || "").toLowerCase()));
            const kotNotSent = orderItems.some((item) => !item.kotId);
            const orderId = order.id ?? order.orderId ?? order.Id;
            return <div className="takeaway-kitchen-order" key={orderId}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: ".5rem" }}><strong>Order #{orderId}</strong><strong style={{ color: allReady ? "#10b981" : "var(--accent-amber-light)" }}>{allReady ? "Ready" : "In kitchen"}</strong></div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: ".35rem", marginTop: ".4rem" }}>
                <button disabled={dispatchingOrderId === orderId} onClick={() => handleLoadOrderDetails(orderId, order)} className="takeaway-secondary-button">Details / Bill</button>
                <button disabled={dispatchingOrderId === orderId} onClick={() => handleShowReceipt(orderId)} className="takeaway-secondary-button">Receipt</button>
                <button disabled={dispatchingOrderId === orderId} onClick={() => handleCancelOrder(orderId)} className="takeaway-secondary-button">Cancel</button>
              </div>
              <div style={{ color: "var(--text-muted)", fontSize: ".85rem", margin: ".35rem 0" }}>{orderItems.map((item) => `${item.name} × ${item.quantity}`).join(", ")}</div>
              {kotNotSent && <button disabled={dispatchingOrderId === orderId} onClick={() => handleRetryKitchenSend(orderId)} style={{ width: "100%", marginBottom: ".4rem", padding: ".45rem", border: "1px solid var(--border-subtle)", borderRadius: 6, background: "var(--bg-secondary)", color: "var(--text-main)", fontWeight: 700 }}>{dispatchingOrderId === orderId ? "Sending…" : "Retry Send to Kitchen"}</button>}
              <button disabled={!allReady || dispatchingOrderId === orderId} onClick={() => handleDispatch(orderId)} style={{ width: "100%", padding: ".45rem", border: 0, borderRadius: 6, background: allReady ? "#10b981" : "var(--bg-secondary)", color: allReady ? "#062b20" : "var(--text-muted)", fontWeight: 750, cursor: allReady ? "pointer" : "not-allowed" }}>{dispatchingOrderId === orderId ? "Dispatching…" : "Mark Items Dispatched"}</button>
            </div>;
          })}
        </div>
        {selectedOrderInfo && <div className="takeaway-kitchen-order" role="region" aria-label="Takeaway order details">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: ".5rem" }}><h4 style={{ margin: 0 }}>Order #{selectedOrderInfo.order?.id ?? selectedOrderInfo.order?.orderId ?? ""}</h4><button className="takeaway-secondary-button" onClick={() => setSelectedOrderInfo(null)}>Close</button></div>
          {selectedOrderInfo.bill ? <>
            <div style={{ color: "var(--text-muted)", fontSize: ".85rem", margin: ".45rem 0" }}>{(selectedOrderInfo.bill.items || []).map((item) => `${item.name} × ${item.quantity}`).join(", ")}</div>
            <div style={{ display: "flex", justifyContent: "space-between" }}><span>Subtotal</span><strong>₹{Number(selectedOrderInfo.bill.subtotal || 0).toFixed(2)}</strong></div>
            <div style={{ display: "flex", justifyContent: "space-between" }}><span>Tax</span><strong>₹{Number(selectedOrderInfo.bill.taxAmount || 0).toFixed(2)}</strong></div>
            <div style={{ display: "flex", justifyContent: "space-between" }}><span>Total</span><strong>₹{Number(selectedOrderInfo.bill.grandTotal || 0).toFixed(2)}</strong></div>
          </> : <p role="status" style={{ color: "var(--text-muted)" }}>Bill summary unavailable.</p>}
        </div>}
        <div style={{ borderTop: "1px solid var(--border-subtle)", marginTop: ".8rem", paddingTop: ".8rem" }}>
          <h3 style={{ margin: "0 0 .5rem" }}>Takeaway Order History</h3>
          {historyLoading ? <p style={{ color: "var(--text-muted)", fontSize: ".9rem" }}>Loading takeaway history…</p> : !takeawayHistory.length ? <p style={{ color: "var(--text-muted)", fontSize: ".9rem" }}>No takeaway orders in history.</p> : takeawayHistory.slice(0, 8).map((order) => {
            const orderId = order.id ?? order.orderId ?? order.Id;
            return <div className="takeaway-kitchen-order" key={`history-${orderId}`}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: ".5rem" }}><strong>Order #{orderId}</strong><strong>{order.status ?? order.Status}</strong></div>
              <div style={{ color: "var(--text-muted)", fontSize: ".85rem", margin: ".3rem 0" }}>{(order.items || []).map((item) => `${item.name} × ${item.quantity}`).join(", ")}</div>
              <button className="takeaway-secondary-button" disabled={dispatchingOrderId === orderId} onClick={() => handleShowReceipt(orderId)}>Load receipt</button>
            </div>;
          })}
        </div>
      </aside>
      </div>
    </section>
  );
}
