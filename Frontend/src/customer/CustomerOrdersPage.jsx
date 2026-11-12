import React, { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, ChefHat, ChevronLeft, ChevronRight, Clock, RefreshCw, ShoppingBag } from "lucide-react";
import { CustomerProfileDropdown } from "./CustomerProfileDropdown";
import { apiGetCustomerProfile, apiGetMyCustomerOrders, getReservationCustomerToken } from "../api/reservationApi";

const PAGE_SIZE = 20;
const STATUS_FILTERS = ["New", "Preparing", "Ready", "PickedUp", "Completed", "Cancelled"];
const money = (value) => `₹${Number(value || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const formatDateTime = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
};

export function CustomerOrdersPage({
  customerUser,
  menuItems = [],
  onReorderOrder,
  onSessionExpired,
  onNavigate,
  onLogout,
  restaurantName = "Bhanu Bistro",
  restaurantLogo = "",
}) {
  const [profile, setProfile] = useState(null);
  const [profileError, setProfileError] = useState("");
  const [orders, setOrders] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [error, setError] = useState("");
  const [retryCount, setRetryCount] = useState(0);
  const [reorderingId, setReorderingId] = useState(null);
  const [reorderMessage, setReorderMessage] = useState("");
  const sessionExpiredHandled = useRef(false);
  const onSessionExpiredRef = useRef(onSessionExpired);
  useEffect(() => {
    onSessionExpiredRef.current = onSessionExpired;
  }, [onSessionExpired]);

  const expireSession = useCallback(() => {
    if (sessionExpiredHandled.current) return;
    sessionExpiredHandled.current = true;
    onSessionExpiredRef.current?.();
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoadingProfile(true);
    setProfileError("");
    if (!getReservationCustomerToken()) {
      setLoadingProfile(false);
      expireSession();
      return () => { cancelled = true; };
    }
    apiGetCustomerProfile().then((result) => {
      if (cancelled) return;
      const envelope = result?.data;
      if (!result?.success || envelope?.success === false) {
        if (result?.status === 401 || result?.status === 403) expireSession();
        else setProfileError(result?.error || envelope?.message || "Customer profile could not be loaded.");
        return;
      }
      setProfile(envelope?.data || null);
    }).finally(() => {
      if (!cancelled) setLoadingProfile(false);
    });
    return () => { cancelled = true; };
  }, [retryCount, expireSession]);

  useEffect(() => {
    let cancelled = false;
    setLoadingOrders(true);
    setError("");
    if (!getReservationCustomerToken()) {
      setLoadingOrders(false);
      expireSession();
      return () => { cancelled = true; };
    }
    apiGetMyCustomerOrders({ page, pageSize: PAGE_SIZE, status }).then((result) => {
      if (cancelled) return;
      const envelope = result?.data;
      if (!result?.success || envelope?.success === false) {
        const message = result?.error || envelope?.message || "Unable to load your orders.";
        setError(message);
        if (result?.status === 401 || result?.status === 403) expireSession();
        return;
      }
      const pageData = envelope?.data;
      setOrders(Array.isArray(pageData?.data) ? pageData.data : []);
      setTotalCount(Number(pageData?.totalCount) || 0);
      setTotalPages(Math.max(1, Number(pageData?.totalPages) || 1));
    }).catch((requestError) => {
      if (!cancelled) setError(requestError?.message || "Unable to load your orders.");
    }).finally(() => {
      if (!cancelled) setLoadingOrders(false);
    });
    return () => { cancelled = true; };
  }, [page, status, retryCount, expireSession]);

  const handleReorder = async (order) => {
    if (!onReorderOrder || reorderingId !== null) return;
    setReorderingId(order.orderId);
    setReorderMessage("");
    try {
      const message = await onReorderOrder(order.orderId);
      setReorderMessage(message || "Order items added to your cart.");
    } catch (reorderError) {
      setReorderMessage(reorderError?.message || "Could not reorder this order.");
      if (reorderError?.status === 401 || reorderError?.status === 403) expireSession();
    } finally {
      setReorderingId(null);
    }
  };

  const displayCustomer = profile?.fullName
    ? { ...customerUser, name: profile.fullName }
    : customerUser;

  return (
    <div style={{ minHeight: "100vh", width: "100%", backgroundColor: "#0d0604", backgroundImage: "radial-gradient(ellipse at 50% 15%, rgba(234, 88, 12, 0.2) 0%, rgba(13, 6, 4, 0.92) 75%, #0a0403 100%), linear-gradient(rgba(10, 5, 3, 0.72), rgba(10, 5, 3, 0.88)), url('/assets/login-restaurant.jpg')", backgroundSize: "cover", backgroundPosition: "center", backgroundAttachment: "fixed", display: "flex", flexDirection: "column", color: "#f7efe8" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 24px", minHeight: "56px", background: "rgba(16, 9, 7, 0.92)", borderBottom: "1px solid rgba(245, 158, 11, 0.25)", backdropFilter: "blur(12px)", position: "sticky", top: 0, zIndex: 100 }}>
        <div onClick={() => onNavigate("/")} style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}>
          <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "linear-gradient(135deg, #f59e0b, #d97706)", border: "1.5px solid #f59e0b", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", overflow: "hidden" }}>
            {restaurantLogo ? <img src={restaurantLogo} alt={restaurantName} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <ChefHat size={20} />}
          </div>
          <div>
            <strong style={{ display: "block", fontSize: "16px", color: "#ffffff", fontWeight: 800, lineHeight: 1.15 }}>{restaurantName}</strong>
            <small style={{ color: "#f59e0b", fontSize: "9.5px", fontWeight: 700, letterSpacing: "1.5px", textTransform: "uppercase" }}>Fine Dining &amp; Takeaway</small>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <button type="button" onClick={() => onNavigate("/")} style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "rgba(255, 255, 255, 0.08)", border: "1px solid rgba(255, 255, 255, 0.15)", color: "#f5ede6", padding: "5px 13px", borderRadius: "20px", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}><ArrowLeft size={13} /> Back to Home</button>
          <CustomerProfileDropdown customerUser={displayCustomer} onNavigate={onNavigate} onLogout={onLogout} currentRoute="/my-orders" />
        </div>
      </header>

      <main style={{ flex: 1, maxWidth: "1160px", width: "100%", margin: "0 auto", padding: "24px 20px 40px", boxSizing: "border-box" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "14px", background: "rgba(22, 12, 8, 0.78)", border: "1px solid rgba(245, 158, 11, 0.3)", borderRadius: "16px", padding: "14px 20px", backdropFilter: "blur(14px)", boxShadow: "0 10px 30px rgba(0, 0, 0, 0.55)" }}>
          <div>
            <h1 style={{ fontFamily: "'Cinzel', Georgia, serif", fontSize: "24px", fontWeight: 800, color: "#ffffff", margin: "0 0 4px 0", display: "flex", alignItems: "center", gap: "8px", textShadow: "0 2px 10px rgba(0, 0, 0, 0.6)", letterSpacing: "0.5px" }}><span style={{ color: "#f59e0b" }}>📋</span> My Orders</h1>
            <p style={{ fontSize: "13px", color: "#fef3c7", fontWeight: 600, margin: 0, textShadow: "0 1px 4px rgba(0, 0, 0, 0.8)", lineHeight: 1.4 }}>{loadingProfile ? "Loading customer profile…" : profile?.fullName ? `Orders for ${profile.fullName}` : "View and track your takeaway orders from Bhanu Bistro."}</p>
            {profileError && <p role="status" style={{ fontSize: "11px", color: "#fecaca", margin: "4px 0 0" }}>{profileError}</p>}
          </div>
          <button type="button" onClick={() => onNavigate("/menu")} style={{ display: "inline-flex", alignItems: "center", gap: "8px", background: "linear-gradient(135deg, #f97316 0%, #ea580c 100%)", color: "#ffffff", padding: "8px 16px", borderRadius: "20px", fontSize: "12.5px", fontWeight: 700, border: "none", cursor: "pointer", boxShadow: "0 4px 14px rgba(234, 88, 12, 0.35)" }}><ShoppingBag size={15} /> Order Takeaway</button>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px", flexWrap: "wrap", marginBottom: "14px" }}>
          <label style={{ display: "flex", alignItems: "center", gap: "8px", color: "#fef3c7", fontSize: "12px" }}>Order status
            <select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }} style={{ borderRadius: "8px", padding: "7px 10px", border: "1px solid rgba(245,158,11,.4)", background: "#21130d", color: "#fff" }}>
              <option value="">All statuses</option>
              {STATUS_FILTERS.map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
          </label>
          <button type="button" onClick={() => setRetryCount((count) => count + 1)} disabled={loadingOrders} style={{ display: "inline-flex", alignItems: "center", gap: "6px", border: "1px solid rgba(245,158,11,.45)", background: "rgba(255,255,255,.08)", color: "#fff", padding: "7px 12px", borderRadius: "8px", cursor: loadingOrders ? "wait" : "pointer" }}><RefreshCw size={14} /> Refresh</button>
        </div>

        {reorderMessage && <p role="status" style={{ color: "#ffedd5", background: "rgba(154, 52, 18, .5)", borderRadius: "8px", padding: "9px 12px" }}>{reorderMessage}</p>}
        {error && <div role="alert" style={{ color: "#fee2e2", background: "rgba(127, 29, 29, .72)", border: "1px solid rgba(252,165,165,.4)", borderRadius: "10px", padding: "12px 14px", marginBottom: "14px" }}><span>{error}</span> <button type="button" onClick={() => setRetryCount((count) => count + 1)} style={{ marginLeft: "10px", color: "#fff", background: "transparent", border: "1px solid #fecaca", borderRadius: "6px", padding: "4px 9px", cursor: "pointer" }}>Retry</button></div>}

        {loadingOrders ? (
          <div role="status" aria-label="Loading orders" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "14px" }}>
            {[0, 1, 2].map((key) => <div key={key} style={{ height: "190px", borderRadius: "12px", background: "linear-gradient(100deg, rgba(255,255,255,.08) 20%, rgba(255,255,255,.16) 40%, rgba(255,255,255,.08) 60%)", backgroundSize: "200% 100%", animation: "customer-orders-pulse 1.4s ease-in-out infinite" }} />)}
            <style>{"@keyframes customer-orders-pulse { 0% { opacity: .55; } 50% { opacity: 1; } 100% { opacity: .55; } }"}</style>
          </div>
        ) : !error && orders.length === 0 ? (
          <div style={{ textAlign: "center", padding: "48px 20px", background: "rgba(22,12,8,.78)", border: "1px solid rgba(245,158,11,.3)", borderRadius: "16px" }}><ShoppingBag size={32} color="#f59e0b" /><h2 style={{ color: "#fff", margin: "12px 0 6px" }}>No orders found</h2><p style={{ color: "#fef3c7", margin: "0 0 18px" }}>Your takeaway orders will appear here.</p><button type="button" onClick={() => onNavigate("/menu")} style={{ background: "linear-gradient(135deg, #f97316, #ea580c)", color: "#fff", border: 0, borderRadius: "20px", padding: "9px 16px", fontWeight: 700, cursor: "pointer" }}>Order Takeaway</button></div>
        ) : !error && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "14px", alignItems: "stretch" }}>
              {orders.map((order) => {
                const orderStatus = order.fulfillmentStatus || order.orderStatus;
                const isComplete = ["completed", "pickedup"].includes(String(orderStatus || "").replace(/\s/g, "").toLowerCase());
                return <article key={order.orderId} style={{ background: "#ffffff", borderRadius: "12px", padding: "12px 16px", color: "#1a100b", boxShadow: "0 8px 22px rgba(0,0,0,0.35)", border: "1px solid rgba(245, 158, 11, 0.22)", display: "flex", flexDirection: "column", justifyContent: "space-between", boxSizing: "border-box" }}>
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #ebdcd1", paddingBottom: "8px", marginBottom: "10px", flexWrap: "wrap", gap: "6px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}><span style={{ background: "#fff7ed", color: "#ea580c", border: "1px solid #fed7aa", padding: "2px 7px", borderRadius: "5px", fontSize: "11px", fontWeight: 800 }}>{order.orderNumber || order.orderId}</span><span style={{ fontSize: "11px", color: "#6f6158" }}><Clock size={11} style={{ verticalAlign: "-2px" }} /> {formatDateTime(order.orderDateTime || order.createdAt)}</span></div>
                      <span style={{ background: isComplete ? "#f0fdf4" : "#eff6ff", color: isComplete ? "#166534" : "#1d4ed8", border: `1px solid ${isComplete ? "#bbf7d0" : "#bfdbfe"}`, padding: "2px 8px", borderRadius: "16px", fontSize: "10.5px", fontWeight: 700 }}>{orderStatus || "—"}</span>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "7px", marginBottom: "12px" }}>
                      {(order.items || []).map((item) => <div key={item.orderItemId ?? item.itemId} style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "8px", fontSize: "12px" }}><span><strong style={{ color: "#ea580c" }}>{item.quantity}×</strong> {item.name}<small style={{ display: "block", color: "#806f64", marginLeft: "24px" }}>Unit price {money(item.unitPrice)}</small></span><strong>{money(item.totalPrice)}</strong></div>)}
                    </div>
                  </div>
                  <div style={{ borderTop: "1px solid #ebdcd1", paddingTop: "9px", marginTop: "auto" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", fontSize: "11px", color: "#6f6158" }}><span>Payment: {order.paymentMethod} · {order.paymentStatus}</span><span>Items subtotal {money(order.subtotal)}</span></div>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", alignItems: "center", marginTop: "7px" }}><span style={{ fontSize: "11px", color: "#6f6158" }}>Tax {money(order.taxAmount)}</span><div style={{ display: "flex", alignItems: "center", gap: "10px" }}><div style={{ textAlign: "right" }}><small style={{ display: "block", fontSize: "9.5px", color: "#8c7b70" }}>Total amount</small><strong style={{ fontSize: "14px", color: "#ea580c", fontWeight: 800 }}>{money(order.totalAmount)}</strong></div><button type="button" onClick={() => handleReorder(order)} disabled={reorderingId !== null || !menuItems.length} style={{ background: "#faf7f4", border: "1.2px solid #ea580c", color: "#ea580c", padding: "4px 10px", borderRadius: "6px", fontSize: "11px", fontWeight: 700, cursor: reorderingId !== null || !menuItems.length ? "not-allowed" : "pointer", opacity: reorderingId !== null || !menuItems.length ? 0.55 : 1 }}>{reorderingId === order.orderId ? "Loading…" : "Reorder"}</button></div></div>
                  </div>
                </article>;
              })}
            </div>
            <footer style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", marginTop: "18px", color: "#fef3c7", fontSize: "12px" }}><span>Showing {totalCount ? (page - 1) * PAGE_SIZE + 1 : 0}–{Math.min(page * PAGE_SIZE, totalCount)} of {totalCount}</span><div style={{ display: "flex", alignItems: "center", gap: "10px" }}><button type="button" aria-label="Previous page" disabled={page <= 1 || loadingOrders} onClick={() => setPage((value) => Math.max(1, value - 1))} style={{ background: "rgba(255,255,255,.08)", color: "#fff", border: "1px solid rgba(245,158,11,.35)", borderRadius: "6px", padding: "5px 8px", cursor: page <= 1 ? "not-allowed" : "pointer" }}><ChevronLeft size={16} /></button><span>Page {page} of {totalPages}</span><button type="button" aria-label="Next page" disabled={page >= totalPages || loadingOrders} onClick={() => setPage((value) => Math.min(totalPages, value + 1))} style={{ background: "rgba(255,255,255,.08)", color: "#fff", border: "1px solid rgba(245,158,11,.35)", borderRadius: "6px", padding: "5px 8px", cursor: page >= totalPages ? "not-allowed" : "pointer" }}><ChevronRight size={16} /></button></div></footer>
          </>
        )}
      </main>
    </div>
  );
}

export default CustomerOrdersPage;
