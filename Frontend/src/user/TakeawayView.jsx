import { SearchableSelect } from "../common/SearchableSelect";
import "./TakeawayView.css";
import "../common/MenuCatalogLayout.css";
import React, { useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Search, ShoppingBag, Plus, Minus, History, X, ClipboardList, CheckCircle2, Clock, ChefHat, LoaderCircle, RefreshCw, Eye, ReceiptText, Send, Phone, User } from "lucide-react";
import { findCustomerByPhone } from "../utils/customerStorage";
import { MenuItemCard } from "../common/MenuItemCard";
import { subscribeToRealtimeEvents } from "../realtime/realtimeService";
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

const extractOrderRecords = (response) => {
  const queue = [response?.data, response];
  const visited = new Set();
  while (queue.length) {
    const value = queue.shift();
    if (!value || typeof value !== "object" || visited.has(value)) continue;
    visited.add(value);
    if (Array.isArray(value)) return value;
    for (const key of ["orders", "takeawayOrders", "orderList", "records", "items", "data", "result"]) {
      const nested = value[key];
      if (Array.isArray(nested)) return nested;
      if (nested && typeof nested === "object") queue.push(nested);
    }
  }
  return null;
};

const isActiveTakeawayHistoryOrder = (order) => {
  const orderType = String(order?.orderType ?? order?.OrderType ?? "").trim().toLowerCase();
  const orderStatus = String(order?.status ?? order?.Status ?? order?.orderStatus ?? order?.OrderStatus ?? "").trim().toLowerCase();
  const fulfillmentStatus = String(order?.fulfillmentStatus ?? order?.FulfillmentStatus ?? "").trim().toLowerCase();
  const items = order?.items ?? order?.Items;
  const terminalFulfillment = ["cancelled", "canceled"];
  const activeKitchenStatuses = ["queued", "received", "new", "pending", "cooking", "mixing", "preparing", "ready", "completed"];
  return orderType === "takeaway" &&
    (orderStatus === "settled" || String(order?.paymentStatus ?? order?.PaymentStatus ?? "").trim().toLowerCase() === "paid") &&
    !["cancelled", "canceled"].includes(orderStatus) &&
    !terminalFulfillment.includes(fulfillmentStatus) &&
    Array.isArray(items) &&
    items.some((item) => {
      const kotId = Number(item?.kotId ?? item?.KotId ?? item?.botId ?? item?.BotId);
      const kotStatus = String(item?.kotStatus ?? item?.KotStatus ?? item?.itemStatus ?? "").trim().toLowerCase();
      return kotId > 0 && activeKitchenStatuses.includes(kotStatus);
    });
};

export function TakeawayView({ menuItems = [], menuLoading = false, onCheckout, onShowReceipt, orderPlacedSignal = 0 }) {
  const [activeScreen, setActiveScreen] = useState("menu");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [cart, setCart] = useState({});
  const [descriptionTooltip, setDescriptionTooltip] = useState(null);
  const descriptionTooltipId = useId();
  const [takeawayOrders, setTakeawayOrders] = useState([]);
  const [takeawayHistory, setTakeawayHistory] = useState([]);
  const takeawayOrdersRefreshInFlightRef = useRef(false);
  const takeawayHistoryRefreshInFlightRef = useRef(false);
  const takeawayHistoryRef = useRef([]);
  const takeawayHistoryLoadedRef = useRef(false);
  const [orderNotice, setOrderNotice] = useState("");
  const [dispatchingOrderId, setDispatchingOrderId] = useState(null);
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [paidOrdersOpen, setPaidOrdersOpen] = useState(false);
  const [selectedOrderInfo, setSelectedOrderInfo] = useState(null);
  const [paidSearch, setPaidSearch] = useState("");
  const [paidStatus, setPaidStatus] = useState("all");
  const [paidDate, setPaidDate] = useState("");
  const [historySearch, setHistorySearch] = useState("");

  // Customer Capture for Takeaway
  const [custPhone, setCustPhone] = useState("");
  const [custName, setCustName] = useState("");
  const [custTier, setCustTier] = useState("");
  const [custVisits, setCustVisits] = useState(0);

  const handleCustPhoneChange = (val) => {
    setCustPhone(val);
    const match = findCustomerByPhone(val);
    if (match) {
      setCustName(match.fullName || match.name || "");
      setCustTier(match.tier || (match.totalSpent > 20000 ? "VIP" : "Regular"));
      setCustVisits(match.visitsCount || 1);
    }
  };
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
  const total = Math.round((Object.values(cart).reduce((sum, line) => sum + Number(line.item.price || 0) * line.quantity, 0) + Number.EPSILON) * 100) / 100;
  const gstAmount = Math.round((total * 0.05 + Number.EPSILON) * 100) / 100;
  const grandTotal = Math.round((total + gstAmount + Number.EPSILON) * 100) / 100;

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
  const paidTakeawayOrders = useMemo(() => {
    const ordersById = new Map();
    const getOrderId = (order) => String(order.id ?? order.Id ?? order.orderId ?? order.OrderId ?? order.orderNumber ?? order.OrderNumber ?? "");
    takeawayHistory.forEach((order) => {
      const id = getOrderId(order);
      if (id) ordersById.set(id, order);
    });
    takeawayOrders.forEach((order) => {
      const id = getOrderId(order);
      if (id) ordersById.set(id, order);
    });
    return [...ordersById.values()];
  }, [takeawayOrders, takeawayHistory]);
  const paidStatuses = useMemo(() => [...new Set(paidTakeawayOrders.map(getOrderStatus).filter(Boolean))], [paidTakeawayOrders]);
  const historyStatuses = useMemo(() => [...new Set(takeawayHistory.map(getOrderStatus).filter(Boolean))], [takeawayHistory]);
  const filteredPaidOrders = useMemo(() => {
    const query = paidSearch.trim().toLowerCase();
    return paidTakeawayOrders.filter((order) => {
      const number = getOrderNumber(order).toLowerCase();
      const status = getOrderStatus(order).toLowerCase();
      const date = getOrderDate(order);
      const statusMatches = paidStatus === "all" || (paidStatus === "__in_kitchen" ? !["ready", "dispatched", "cancelled"].includes(status) : status === paidStatus.toLowerCase());
      return (!query || number.includes(query)) && statusMatches && (!paidDate || orderDateKey(date) === paidDate);
    });
  }, [paidTakeawayOrders, paidSearch, paidStatus, paidDate]);
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

  const getLocalTakeawayOrders = () => {
    try {
      const raw = localStorage.getItem("gourmet_pos_takeaway_orders");
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  };

  const refreshTakeawayOrders = async () => {
    if (takeawayOrdersRefreshInFlightRef.current) return;
    takeawayOrdersRefreshInFlightRef.current = true;
    const localList = getLocalTakeawayOrders();
    const normalizedLocal = localList.map((order) => ({
      ...order,
      id: order.id ?? order.orderId ?? order.invoiceNo,
      orderId: order.orderId ?? order.id ?? order.invoiceNo,
      orderNumber: order.invoiceNo ?? order.orderNumber ?? `TAK-${order.id}`,
      status: order.kotStatus ?? order.status ?? "received",
      customerName: order.customerName || order.guestName || "Takeaway Guest",
      customerPhone: order.customerPhone || order.phone || "",
      grandTotal: Number(order.grandTotal ?? order.totalAmount ?? order.total ?? 0),
      items: (order.items || []).map((item) => ({
        ...item,
        name: item.name ?? item.dishName ?? "Item",
        quantity: Number(item.quantity ?? item.qty ?? 1),
        price: Number(item.price ?? item.unitPrice ?? 0),
        kotStatus: item.kotStatus ?? "received",
        kotId: item.kotId ?? null,
      })),
    }));

    try {
      const result = await apiGetTakeawayOrders();
      const apiOrders = extractOrderRecords(result);
      if (result?.success && apiOrders) {
        setOrderNotice("");
        const serverOrders = apiOrders
          .filter((order) => {
            const orderType = String(order.orderType ?? order.OrderType ?? "").trim().toLowerCase();
            return !orderType || orderType === "takeaway";
          })
          .map((order) => ({
          ...order,
          id: order.id ?? order.Id ?? order.orderId ?? order.OrderId,
          orderId: order.orderId ?? order.OrderId ?? order.id ?? order.Id,
          orderNumber: order.orderNumber ?? order.OrderNumber ?? order.invoiceNo ?? order.InvoiceNo,
          status: order.status ?? order.Status ?? order.orderStatus ?? order.OrderStatus,
          paymentStatus: order.paymentStatus ?? order.PaymentStatus,
          fulfillmentStatus: order.fulfillmentStatus ?? order.FulfillmentStatus,
          customerName: order.customerName ?? order.CustomerName,
          customerPhone: order.customerPhone ?? order.CustomerPhone ?? order.phoneNumber ?? order.PhoneNumber,
          grandTotal: order.grandTotal ?? order.GrandTotal ?? order.totalAmount ?? order.TotalAmount,
          items: (order.items ?? order.Items ?? []).map((item) => ({
            ...item,
            name: item.name ?? item.Name,
            quantity: item.quantity ?? item.Quantity,
            price: item.price ?? item.Price ?? item.unitPrice ?? item.UnitPrice,
            kotStatus: item.kotStatus ?? item.KotStatus,
            kotId: item.kotId ?? item.KotId,
          })),
        }));

        let currentOrders = serverOrders;
        if (currentOrders.length === 0) {
          if (!takeawayHistoryLoadedRef.current) {
            const historyResult = await apiGetTakeawayOrderHistory();
            const historyRecords = extractOrderRecords(historyResult);
            if (historyResult?.success && historyRecords) {
              const takeawayRecords = historyRecords.filter((order) =>
                String(order.orderType ?? order.OrderType ?? "").trim().toLowerCase() === "takeaway",
              );
              takeawayHistoryRef.current = takeawayRecords;
              takeawayHistoryLoadedRef.current = true;
              setTakeawayHistory(takeawayRecords);
            }
          }
          currentOrders = takeawayHistoryRef.current.filter(isActiveTakeawayHistoryOrder);
        }
        setTakeawayOrders(currentOrders);
        return;
      }
      if (!result?.success && normalizedLocal.length === 0) {
        setOrderNotice(result?.error || "Could not load active takeaway orders from the server.");
      } else if (result?.success && normalizedLocal.length === 0) {
        setOrderNotice("The takeaway orders response did not contain an order list.");
      }
    } catch (error) {
      if (normalizedLocal.length === 0) {
        setOrderNotice(error?.message || "Could not load active takeaway orders from the server.");
      }
    } finally {
      takeawayOrdersRefreshInFlightRef.current = false;
    }

    // Fallback: Display local orders immediately
    if (normalizedLocal.length > 0) {
      setTakeawayOrders(normalizedLocal);
      setOrderNotice("");
    }
  };

  const refreshTakeawayHistory = async () => {
    if (takeawayHistoryRefreshInFlightRef.current) return;
    takeawayHistoryRefreshInFlightRef.current = true;
    setHistoryLoading(true);
    try {
      const result = await apiGetTakeawayOrderHistory();
      const historyOrders = extractOrderRecords(result);
      if (!result?.success || !historyOrders) {
        setOrderNotice(result?.error || "Could not load takeaway history from the server.");
      } else {
        const takeawayRecords = historyOrders.filter((order) =>
          String(order.orderType ?? order.OrderType ?? "").trim().toLowerCase() === "takeaway",
        );
        takeawayHistoryRef.current = takeawayRecords;
        takeawayHistoryLoadedRef.current = true;
        setTakeawayHistory(takeawayRecords);
      }
    } catch (error) {
      setOrderNotice(error?.message || "Could not load takeaway history from the server.");
    } finally {
      setHistoryLoading(false);
      takeawayHistoryRefreshInFlightRef.current = false;
    }
  };

  useEffect(() => {
    refreshTakeawayOrders();
    refreshTakeawayHistory();
    let refreshTimer = null;
    let shouldRefreshHistory = false;
    const scheduleOrderRefresh = (includeHistory = false) => {
      shouldRefreshHistory ||= includeHistory;
      if (refreshTimer) window.clearTimeout(refreshTimer);
      refreshTimer = window.setTimeout(() => {
        refreshTimer = null;
        refreshTakeawayOrders();
        if (shouldRefreshHistory) refreshTakeawayHistory();
        shouldRefreshHistory = false;
      }, 180);
    };
    const unsubscribe = subscribeToRealtimeEvents(({ name }) => {
      if (name === "TakeawayOrderCreated" || name === "TakeawayStatusUpdated" || name === "TakeawayOrderCancelled" || name === "KitchenStatusAlert") {
        scheduleOrderRefresh(true);
      }
    });
    const handleReconnect = () => scheduleOrderRefresh(true);
    const intervalId = window.setInterval(refreshTakeawayOrders, 15000);
    const handleSync = () => {
      scheduleOrderRefresh(true);
    };

    window.addEventListener("avsr:realtime-reconnected", handleReconnect);
    window.addEventListener("avsr-takeaway-updated", handleSync);
    window.addEventListener("avsr-kot-updated", handleSync);
    window.addEventListener("storage", handleSync);

    return () => {
      if (refreshTimer) window.clearTimeout(refreshTimer);
      if (unsubscribe) unsubscribe();
      window.removeEventListener("avsr:realtime-reconnected", handleReconnect);
      window.clearInterval(intervalId);
      window.removeEventListener("avsr-takeaway-updated", handleSync);
      window.removeEventListener("avsr-kot-updated", handleSync);
      window.removeEventListener("storage", handleSync);
    };
  }, []);

  useEffect(() => {
    if (orderPlacedSignal > 0) {
      setCart({});
      refreshTakeawayOrders();
      refreshTakeawayHistory();
    }
  }, [orderPlacedSignal]);

  const handleDispatch = async (orderId) => {
    if (dispatchingOrderId != null) return;
    setDispatchingOrderId(orderId);
    try {
      const result = await apiDispatchTakeawayOrder(orderId);
      if (!result?.success || result?.data?.success === false) setOrderNotice(result?.error || result?.data?.message || "Could not dispatch this takeaway order.");
      else {
        setOrderNotice("Takeaway order dispatched.");
        await refreshTakeawayOrders();
      }
    } catch (error) {
      setOrderNotice(error?.message || "Could not dispatch this takeaway order.");
    } finally {
      setDispatchingOrderId(null);
    }
  };

  const handleRetryKitchenSend = async (orderId) => {
    if (dispatchingOrderId != null) return;
    setDispatchingOrderId(orderId);
    try {
      const result = await apiSendTakeawayOrderToKitchen(orderId);
      if (!result?.success) setOrderNotice(result?.error || "Could not send this order to the kitchen.");
      else {
        setOrderNotice("Takeaway order sent to the kitchen.");
        await refreshTakeawayOrders();
      }
    } catch (error) {
      setOrderNotice(error?.message || "Could not send this order to the kitchen.");
    } finally {
      setDispatchingOrderId(null);
    }
  };

  const handleCancelOrder = async (orderId) => {
    if (dispatchingOrderId != null) return;
    setDispatchingOrderId(orderId);
    try {
      const result = await apiCancelTakeawayOrder(orderId);
      if (!result?.success) setOrderNotice(result?.error || "Could not cancel this takeaway order.");
      else {
        setOrderNotice("Takeaway order cancelled.");
        await Promise.all([refreshTakeawayOrders(), refreshTakeawayHistory()]);
      }
    } catch (error) {
      setOrderNotice(error?.message || "Could not cancel this takeaway order.");
    } finally {
      setDispatchingOrderId(null);
    }
  };

  const handleLoadOrderDetails = async (orderId, fallbackOrder) => {
    if (dispatchingOrderId != null) return;
    setDispatchingOrderId(orderId);
    setOrderNotice("");
    setSelectedOrderInfo({ order: fallbackOrder, bill: null });

    const fallbackItems = fallbackOrder?.items ?? fallbackOrder?.Items;
    const hasSummaryData = Array.isArray(fallbackItems) && (
      fallbackOrder?.grandTotal != null || fallbackOrder?.GrandTotal != null ||
      fallbackOrder?.totalAmount != null || fallbackOrder?.TotalAmount != null
    );
    if (hasSummaryData) {
      setDispatchingOrderId(null);
      return;
    }

    try {
      const orderResult = await apiGetTakeawayOrder(orderId);
      const orderData = orderResult?.data?.data ?? orderResult?.data;
      if (!orderResult?.success && !fallbackOrder) {
        setOrderNotice(orderResult?.error || "Could not load takeaway order details.");
        setSelectedOrderInfo(null);
      } else {
        const order = orderResult?.success ? orderData : fallbackOrder;
        let bill = null;
        const hasTotals = order?.subtotal != null || order?.Subtotal != null ||
          order?.grandTotal != null || order?.GrandTotal != null;
        let billError = "";
        if (!hasTotals) {
          const billResult = await apiGetTakeawayOrderBillSummary(orderId);
          bill = billResult?.success ? (billResult.data?.data ?? billResult.data) : null;
          billError = billResult?.error || "";
        }
        setSelectedOrderInfo({
          order,
          bill,
        });
        setOrderNotice(!orderResult?.success
          ? "Order loaded from the server queue; the backend order-by-ID route is unavailable."
          : billError ? `Order loaded, but bill summary could not be loaded: ${billError}` : "");
      }
    } catch (error) {
      setOrderNotice(error?.message || "Could not load takeaway order details.");
    } finally {
      setDispatchingOrderId(null);
    }
  };

  const handleShowReceipt = async (orderId) => {
    if (dispatchingOrderId != null) return;
    setDispatchingOrderId(orderId);
    try {
      const result = await apiGetTakeawayOrderReceipt(orderId);
      if (!result?.success) setOrderNotice(result?.error || "Could not load takeaway receipt.");
      else onShowReceipt?.(result.data?.data ?? result.data, orderId);
    } catch (error) {
      setOrderNotice(error?.message || "Could not load takeaway receipt.");
    } finally {
      setDispatchingOrderId(null);
    }
  };

  const handleCheckout = () => {
    if (isSubmittingOrder || !count) return;
    const checkoutItems = Object.values(cart).map(({ item, quantity }) => ({ ...item, quantity }));
    if (checkoutItems.some((item) => !item.name || !Number.isFinite(Number(item.price)) || Number(item.price) < 0 || item.quantity < 1)) {
      setOrderNotice("Remove or correct invalid menu items before checkout.");
      return;
    }
    setIsSubmittingOrder(true);
    try {
      onCheckout?.(checkoutItems, {
        customerName: custName.trim(),
        customerPhone: custPhone.trim(),
        customerTier: custTier,
        customerVisits: custVisits,
      });
    } finally {
      // Checkout opens the settlement dialog; its own processing state owns the request lifecycle.
      setIsSubmittingOrder(false);
    }
  };

  const selectedOrder = selectedOrderInfo?.order || {};
  const selectedOrderItemsValue = selectedOrder.items ?? selectedOrder.Items;
  const selectedOrderItems = Array.isArray(selectedOrderItemsValue) ? selectedOrderItemsValue : [];
  const selectedBill = selectedOrderInfo?.bill || selectedOrder;
  const selectedOrderId = selectedOrder.id ?? selectedOrder.Id ?? selectedOrder.orderId ?? selectedOrder.OrderId;
  const selectedOrderNumber = selectedOrder.orderNumber ?? selectedOrder.OrderNumber ?? selectedOrder.invoiceNo ?? selectedOrder.InvoiceNo ?? selectedOrderId;
  const selectedOrderDate = getOrderDate(selectedOrder);
  const selectedOrderStatus = getOrderStatus(selectedOrder) || "Status unavailable";
  const selectedSubtotal = selectedBill.subtotal ?? selectedBill.Subtotal;
  const selectedTax = selectedBill.taxAmount ?? selectedBill.TaxAmount;
  const selectedGrandTotal = selectedBill.grandTotal ?? selectedBill.GrandTotal ?? selectedBill.totalAmount ?? selectedBill.TotalAmount;
  const selectedPaymentStatus = selectedOrder.paymentStatus ?? selectedOrder.PaymentStatus ??
    (selectedOrderStatus.toLowerCase() === "settled" ? "Paid" : "Not provided");

  return (
    <section className="takeaway-section" style={{ padding: "1.25rem 2rem", color: "var(--text-main)", minHeight: "calc(100vh - 130px)", boxSizing: "border-box", width: "100%", minWidth: 0 }}>

      <nav className="takeaway-view-tabs" aria-label="Takeaway POS screens">
        <button
          type="button"
          className={`takeaway-view-tab${activeScreen === "orders" ? " is-active" : ""}`}
          aria-pressed={activeScreen === "orders"}
          onClick={() => {
            setActiveScreen("orders");
            refreshTakeawayOrders();
          }}
        >
          <ClipboardList size={18} aria-hidden="true" />
          <span>Active Orders</span>
          <span className="takeaway-view-tab-count">{takeawayOrders.length}</span>
        </button>
        <button
          type="button"
          className={`takeaway-view-tab${activeScreen === "menu" ? " is-active" : ""}`}
          aria-pressed={activeScreen === "menu"}
          onClick={() => setActiveScreen("menu")}
        >
          <ShoppingBag size={18} aria-hidden="true" />
          <span>Menu &amp; Billing</span>
          <span className="takeaway-view-tab-count">{count}</span>
        </button>
      </nav>

      <div className="takeaway-page-header">
        <div>
          <h2 style={{ margin: 0, fontSize: "1.5rem" }}>{activeScreen === "orders" ? "Active Takeaway Orders" : "Takeaway Menu"}</h2>
          <p style={{ margin: "0.3rem 0 0", color: "var(--text-muted)" }}>
            {activeScreen === "orders" ? "Monitor kitchen progress and hand over ready orders." : "Choose items for a takeaway order."}
          </p>
        </div>
        <div className="takeaway-header-actions">
          <button type="button" onClick={() => setHistoryOpen(true)} className="takeaway-secondary-button"><History size={16}/> Order History</button>
          <button type="button" onClick={() => setPaidOrdersOpen(true)} className="takeaway-secondary-button"><ClipboardList size={16}/> Paid Takeaway Orders{takeawayOrders.length > 0 && <span style={{ color: "var(--accent-amber-light)" }}>({takeawayOrders.length})</span>}</button>
          {activeScreen === "orders" && <button type="button" onClick={refreshTakeawayOrders} disabled={dispatchingOrderId != null} className="takeaway-secondary-button"><RefreshCw size={15}/> Refresh</button>}
        </div>
        {activeScreen === "menu" && <div className="takeaway-cart-summary"><ShoppingBag size={18}/><strong>{count} items</strong><span style={{ color: "var(--accent-amber-light)" }}>₹{total.toFixed(2)}</span></div>}
      </div>

      {/* ── Active Takeaway Orders & Kitchen Cooking Status Banner ── */}
      {/* Active takeaway orders */}
      {/* Active takeaway orders */}
      {activeScreen === "orders" && (
        <section className="takeaway-active-orders" aria-label="Active takeaway orders">
          {orderNotice && <div className="takeaway-order-notice" role="status">{orderNotice}</div>}
          {takeawayOrders.length ? <div className="takeaway-active-orders-grid">
            {takeawayOrders.map((order, orderIndex) => {
              const orderId = order.id ?? order.Id ?? order.orderId ?? order.OrderId;
              const orderNumber = order.orderNumber ?? order.OrderNumber ?? order.invoiceNo ?? order.InvoiceNo ?? orderId;
              const orderItems = Array.isArray(order.items ?? order.Items) ? (order.items ?? order.Items) : [];
              const requiredItems = orderItems.filter((item) => !["cancelled", "canceled", "void", "deleted"].includes(String(item.kotStatus ?? item.KotStatus ?? "").trim().toLowerCase()));
              const allReady = requiredItems.length > 0 && requiredItems.every((item) => ["ready", "served", "completed"].includes(String(item.kotStatus ?? item.KotStatus ?? "").trim().toLowerCase()));
              const fulfillmentState = String(order.fulfillmentStatus ?? order.FulfillmentStatus ?? "").trim().toLowerCase().replace(/[ _-]/g, "");
              const alreadyHandedOver = ["pickedup", "dispatched", "handedover"].includes(fulfillmentState) || (requiredItems.length > 0 && requiredItems.every((item) => String(item.kotStatus ?? item.KotStatus ?? "").trim().toLowerCase() === "served"));
              const isCooking = requiredItems.some((item) => String(item.kotStatus ?? item.KotStatus ?? "").trim().toLowerCase() === "cooking");
              const orderTotal = order.grandTotal ?? order.GrandTotal ?? order.totalAmount ?? order.TotalAmount ?? order.total ?? order.amount;
              const dishCount = orderItems.reduce((sum, item) => sum + (Number(item.quantity ?? item.Quantity ?? item.qty) || 1), 0);
              const kotNotSent = orderItems.some((item) => !(item.kotId ?? item.KotId));
              const statusBg = allReady ? "rgba(16, 185, 129, .15)" : isCooking ? "color-mix(in srgb, var(--accent-amber) 15%, transparent)" : "rgba(59, 130, 246, .15)";
              const statusColor = allReady ? "#10b981" : isCooking ? "var(--accent-amber)" : "#3b82f6";
              const statusBorder = allReady ? "rgba(16, 185, 129, .4)" : isCooking ? "color-mix(in srgb, var(--accent-amber) 40%, transparent)" : "rgba(59, 130, 246, .4)";
              const isBusy = dispatchingOrderId === orderId;
              return (
                <article key={orderId ?? `takeaway-${orderIndex}`} className="takeaway-active-order-card">
                  <div className="takeaway-order-card-heading">
                    <strong>Order #{orderNumber}</strong>
                    <span className="takeaway-order-status" style={{ background: statusBg, color: statusColor, borderColor: statusBorder }}>
                      {allReady ? <CheckCircle2 size={12} /> : isCooking ? <ChefHat size={12} /> : <Clock size={12} />}
                      {allReady ? "Ready" : isCooking ? "Cooking" : "Kitchen Queue"}
                    </span>
                  </div>
                  <div className="takeaway-order-card-summary">
                    <span><small>Dishes</small><strong>{dishCount}</strong></span>
                    <span><small>Total</small><strong>₹{Number(orderTotal || 0).toFixed(2)}</strong></span>
                  </div>
                  <div className="takeaway-order-primary-actions">
                    <button type="button" onClick={() => handleLoadOrderDetails(orderId, order)} disabled={dispatchingOrderId != null} className="takeaway-view-order-button"><Eye size={15}/>{isBusy ? "Loading…" : "View"}</button>
                    <button type="button" onClick={() => handleShowReceipt(orderId)} disabled={dispatchingOrderId != null} className="takeaway-secondary-button takeaway-receipt-button">{isBusy ? <><LoaderCircle className="takeaway-spinner" size={13}/> Loading…</> : <><ReceiptText size={14}/> Receipt</>}</button>
                  </div>
                  <div className="takeaway-order-lifecycle-actions">
                    {kotNotSent && <button type="button" disabled={dispatchingOrderId != null} onClick={() => handleRetryKitchenSend(orderId)} className="takeaway-secondary-button takeaway-order-secondary-action">{isBusy ? <><LoaderCircle className="takeaway-spinner" size={13}/> Sending…</> : <><Send size={13}/> Retry kitchen send</>}</button>}
                    <button type="button" disabled={!allReady || alreadyHandedOver || dispatchingOrderId != null} onClick={() => handleDispatch(orderId)} className="takeaway-order-handover" style={{ background: allReady && !alreadyHandedOver ? "linear-gradient(135deg, #10b981 0%, #059669 100%)" : "var(--bg-secondary)", color: allReady && !alreadyHandedOver ? "#fff" : "var(--text-muted)", cursor: allReady && !alreadyHandedOver ? "pointer" : "not-allowed", boxShadow: allReady && !alreadyHandedOver ? "0 2px 8px rgba(16, 185, 129, .35)" : "none" }}>
                      {isBusy ? <><LoaderCircle className="takeaway-spinner" size={13}/> Processing…</> : "Handover"}
                    </button>
                  </div>
                </article>
              );
            })}
          </div> : <div className="takeaway-orders-empty" role="status">
            <ClipboardList size={28} aria-hidden="true" />
            <strong>No active takeaway orders</strong>
            <span>New paid orders sent to the kitchen will appear here.</span>
          </div>}
        </section>
      )}
      {activeScreen === "menu" && <>
<div className="takeaway-menu-filters">
        <label className="takeaway-menu-search"><Search size={16} aria-hidden="true"/><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search Menu Items" aria-label="Search menu items"/></label>
        <div className="takeaway-menu-category"><SearchableSelect aria-label="Filter menu by category" value={category} onChange={(e) => setCategory(e.target.value)} style={{ minWidth: 0 }}><option value="all">All Categories</option>{categories.map((name) => <option key={name} value={name}>{name}</option>)}</SearchableSelect></div>
      </div>
      <div className="takeaway-layout">
      {menuLoading ? <p>Loading menu…</p> : <div className="takeaway-menu-grid">
        {items.map((item) => {
          const quantity = cart[item.id]?.quantity || 0;
          return <MenuItemCard
            key={item.id}
            item={item}
            quantity={quantity}
            onAdd={(menuItem) => changeQty(menuItem, 1)}
            onQuantityChange={(menuItem, nextQuantity) => changeQty(menuItem, nextQuantity - quantity)}
            descriptionProps={{
              tabIndex: 0,
              "aria-label": item.description || item.name,
              "aria-describedby": descriptionTooltip?.itemId === item.id ? descriptionTooltipId : undefined,
              onMouseEnter: (event) => showDescriptionTooltip(event, item.description, item.id),
              onMouseLeave: () => setDescriptionTooltip(null),
              onFocus: (event) => showDescriptionTooltip(event, item.description, item.id),
              onBlur: () => setDescriptionTooltip(null),
            }}
          />;
        })}
        {!items.length && <p style={{ color: "var(--text-muted)" }}>No menu items found.</p>}
      </div>}
      <aside className="takeaway-order-panel">
        <h3 style={{ margin: "0 0 .8rem" }}>Takeaway Order</h3>

        {/* Quick Customer Capture (Phone & Name with auto-fill & loyalty recognition) */}
        <div
          style={{
            padding: "0.5rem 0.65rem",
            background: "rgba(255, 255, 255, 0.03)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "8px",
            marginBottom: "0.8rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.35rem",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "4px" }}>
              <User size={13} color="var(--accent-amber)" /> Customer Info (Optional)
            </span>
            {custTier && (
              <span style={{
                fontSize: "0.62rem",
                fontWeight: 800,
                padding: "1px 6px",
                borderRadius: "4px",
                background: custTier === "VIP" ? "rgba(168, 85, 247, 0.2)" : "rgba(34, 197, 94, 0.2)",
                color: custTier === "VIP" ? "#c084fc" : "#4ade80",
                border: custTier === "VIP" ? "1px solid rgba(168, 85, 247, 0.4)" : "1px solid rgba(34, 197, 94, 0.4)",
              }}>
                {custTier} Diner {custVisits > 1 ? `(${custVisits} visits)` : ""}
              </span>
            )}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1.3fr", gap: "0.35rem" }}>
            <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
              <Phone size={12} style={{ position: "absolute", left: "7px", color: "var(--text-muted)", pointerEvents: "none" }} />
              <input
                type="tel"
                placeholder="Phone No."
                value={custPhone}
                onChange={(e) => handleCustPhoneChange(e.target.value)}
                style={{
                  width: "100%",
                  padding: "5px 5px 5px 24px",
                  fontSize: "0.76rem",
                  background: "var(--bg-primary)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "6px",
                  color: "var(--text-main)",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>
            <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
              <User size={12} style={{ position: "absolute", left: "7px", color: "var(--text-muted)", pointerEvents: "none" }} />
              <input
                type="text"
                placeholder="Customer Name"
                value={custName}
                onChange={(e) => setCustName(e.target.value)}
                style={{
                  width: "100%",
                  padding: "5px 5px 5px 24px",
                  fontSize: "0.76rem",
                  background: "var(--bg-primary)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "6px",
                  color: "var(--text-main)",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>
          </div>
        </div>
        {!count ? <p style={{ color: "var(--text-muted)" }}>Add menu items to start an order.</p> : <div className="takeaway-cart-items" style={{ display: "grid", gap: ".7rem" }}>
          {Object.values(cart).map(({ item, quantity }) => <div key={item.id} className="takeaway-cart-line"><div className="takeaway-cart-line-details"><strong>{item.name}</strong><div style={{ color: "var(--text-muted)", fontSize: ".85rem" }}>₹{Number(item.price || 0).toFixed(2)} each</div></div><div className="takeaway-cart-line-controls" aria-label={`Quantity for ${item.name}`}><button type="button" aria-label={`Remove one ${item.name}`} onClick={() => changeQty(item, -1)}><Minus size={12}/></button><span className="takeaway-cart-line-quantity" aria-live="polite">{quantity}</span><button type="button" aria-label={`Add one ${item.name}`} onClick={() => changeQty(item, 1)}><Plus size={12}/></button></div><span className="takeaway-cart-line-subtotal">₹{(Number(item.price || 0) * quantity).toFixed(2)}</span></div>)}
        </div>}
        <div className="takeaway-cart-summary-row" style={{ borderTop: "1px solid var(--border-subtle)", marginTop: ".8rem", paddingTop: ".7rem", display: "flex", justifyContent: "space-between" }}><span>Subtotal</span><strong>₹{total.toFixed(2)}</strong></div>
        <div className="takeaway-cart-tax-row" style={{ marginTop: ".45rem", display: "flex", justifyContent: "space-between", color: "var(--text-muted)" }}><span>GST (5%)</span><span>{String.fromCharCode(8377)}{gstAmount.toFixed(2)}</span></div>
        <div className="takeaway-cart-grand-total" style={{ marginTop: ".55rem", display: "flex", justifyContent: "space-between", fontSize: "1.1rem" }}><strong>Total</strong><strong style={{ color: "var(--accent-amber-light)" }}>{String.fromCharCode(8377)}{grandTotal.toFixed(2)}</strong></div>
        <button type="button" disabled={!count || isSubmittingOrder} onClick={handleCheckout} className="takeaway-checkout-button" style={{ width: "100%", marginTop: ".9rem", padding: ".75rem", border: 0, borderRadius: 9, background: count ? "var(--accent-amber)" : "var(--bg-tertiary)", color: count ? "#111" : "var(--text-muted)", fontWeight: 800, cursor: count && !isSubmittingOrder ? "pointer" : "not-allowed", opacity: isSubmittingOrder ? .8 : 1 }}>{isSubmittingOrder && <LoaderCircle className="takeaway-spinner" size={17}/>}Pay &amp; Send to Kitchen</button>
        {orderNotice && <p role="status" style={{ color: "var(--text-muted)", fontSize: ".85rem", margin: ".45rem 0 0" }}>{orderNotice}</p>}


      </aside>
      </div>
      </>}
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
      {selectedOrderInfo && <div className="takeaway-details-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedOrderInfo(null); }}>
        <section className="takeaway-details-dialog" role="dialog" aria-modal="true" aria-labelledby="takeaway-details-title">
          <header className="takeaway-details-header">
            <div>
              <span className="takeaway-details-eyebrow">Takeaway order</span>
              <h3 id="takeaway-details-title">Order #{selectedOrderNumber}</h3>
            </div>
            <button type="button" className="takeaway-details-close" aria-label="Close order details" onClick={() => setSelectedOrderInfo(null)}><X size={18}/></button>
          </header>
          <div className="takeaway-details-content">
            {orderNotice && <p className="takeaway-order-notice" role="status">{orderNotice}</p>}
            {dispatchingOrderId === selectedOrderId && <p className="takeaway-details-loading" role="status"><LoaderCircle className="takeaway-spinner" size={15}/> Loading order details…</p>}
            <div className="takeaway-details-meta">
              <div><small>Order status</small><strong>{selectedOrderStatus}</strong></div>
              <div><small>Order date</small><strong>{selectedOrderDate ? selectedOrderDate.toLocaleString() : "Not provided"}</strong></div>
              {(selectedOrder.customerName ?? selectedOrder.CustomerName) && <div><small>Customer</small><strong>{selectedOrder.customerName ?? selectedOrder.CustomerName}</strong></div>}
              {(selectedOrder.customerPhone ?? selectedOrder.CustomerPhone ?? selectedOrder.phoneNumber ?? selectedOrder.PhoneNumber) && <div><small>Phone</small><strong>{selectedOrder.customerPhone ?? selectedOrder.CustomerPhone ?? selectedOrder.phoneNumber ?? selectedOrder.PhoneNumber}</strong></div>}
            </div>
            <section className="takeaway-details-section" aria-label="Order items">
              <div className="takeaway-details-section-heading"><h4>Order items</h4><span>{selectedOrderItems.length} {selectedOrderItems.length === 1 ? "dish" : "dishes"}</span></div>
              {selectedOrderItems.length ? <div className="takeaway-details-table-wrap"><table className="takeaway-details-table">
                <thead><tr><th>Dish</th><th>Qty</th><th>Unit price</th><th>Item total</th><th>Prep status</th></tr></thead>
                <tbody>{selectedOrderItems.map((item, index) => {
                  const name = item.name ?? item.Name ?? item.dishName ?? item.DishName ?? "Item";
                  const quantity = Number(item.quantity ?? item.Quantity ?? item.qty ?? 0);
                  const unitPrice = Number(item.price ?? item.Price ?? item.unitPrice ?? item.UnitPrice ?? 0);
                  const prepStatus = item.kotStatus ?? item.KotStatus ?? item.status ?? item.Status;
                  return <tr key={item.id ?? item.Id ?? item.orderItemId ?? item.OrderItemId ?? `${name}-${index}`}>
                    <td>{name}</td><td>{quantity}</td><td>₹{unitPrice.toFixed(2)}</td><td>₹{(quantity * unitPrice).toFixed(2)}</td><td>{prepStatus || "Not provided"}</td>
                  </tr>;
                })}</tbody>
              </table></div> : <p className="takeaway-details-empty">No item details were returned for this order.</p>}
            </section>
            <section className="takeaway-details-section takeaway-payment-section" aria-label="Payment information">
              <div className="takeaway-details-section-heading"><h4>Payment</h4><span>{selectedPaymentStatus}</span></div>
              <div className="takeaway-details-total-row"><span>Subtotal</span><strong>{selectedSubtotal == null ? "Not provided" : `₹${Number(selectedSubtotal).toFixed(2)}`}</strong></div>
              <div className="takeaway-details-total-row"><span>GST / tax</span><strong>{selectedTax == null ? "Not provided" : `₹${Number(selectedTax).toFixed(2)}`}</strong></div>
              {(selectedOrder.paymentMethod ?? selectedOrder.PaymentMethod) && <div className="takeaway-details-total-row"><span>Payment method</span><strong>{selectedOrder.paymentMethod ?? selectedOrder.PaymentMethod}</strong></div>}
              <div className="takeaway-details-total-row is-grand-total"><span>Total amount</span><strong>{selectedGrandTotal == null ? "Not provided" : `₹${Number(selectedGrandTotal).toFixed(2)}`}</strong></div>
            </section>
          </div>
          <footer className="takeaway-details-footer">
            <button type="button" className="takeaway-secondary-button" onClick={() => setSelectedOrderInfo(null)}>Close</button>
            <button type="button" className="takeaway-secondary-button" disabled={selectedOrderId == null || dispatchingOrderId != null} onClick={() => handleShowReceipt(selectedOrderId)}><ReceiptText size={15}/> Receipt</button>
          </footer>
        </section>
      </div>}
      {paidOrdersOpen && <div className="takeaway-history-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) setPaidOrdersOpen(false); }}>
        <section className="takeaway-history-dialog" role="dialog" aria-modal="true" aria-labelledby="paid-takeaway-title">
          <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: ".75rem", padding: "1rem", borderBottom: "1px solid var(--border-subtle)" }}>
            <div><h3 id="paid-takeaway-title" style={{ margin: 0 }}>Paid Takeaway Orders</h3><p style={{ margin: ".25rem 0 0", color: "var(--text-muted)", fontSize: ".85rem" }}>Active and handed-over paid orders</p></div>
            <button type="button" className="takeaway-secondary-button" aria-label="Close paid takeaway orders" onClick={() => setPaidOrdersOpen(false)} style={{ display: "inline-flex", padding: ".45rem", alignItems: "center" }}><X size={18}/></button>
          </header>
          <div className="takeaway-history-content">
          <div className="takeaway-filter-controls">
            <input aria-label="Search paid takeaway orders" placeholder="Search order number" value={paidSearch} onChange={(event) => setPaidSearch(event.target.value)} />
            <SearchableSelect aria-label="Filter paid orders by status" value={paidStatus} onChange={(event) => setPaidStatus(event.target.value)}><option value="all">All statuses</option>{paidStatuses.map((status) => <option key={status} value={status}>{status}</option>)}{!paidStatuses.some((status) => status.toLowerCase() === "in kitchen") && <option value="__in_kitchen">In Kitchen</option>}</SearchableSelect>
            <input aria-label="Filter paid orders by date" type="date" value={paidDate} onChange={(event) => setPaidDate(event.target.value)} />
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: ".5rem", color: "var(--text-muted)", fontSize: ".8rem" }}><span>{filteredPaidOrders.length} matching {filteredPaidOrders.length === 1 ? "order" : "orders"}</span><button type="button" className="takeaway-secondary-button" onClick={() => { setPaidSearch(""); setPaidStatus("all"); setPaidDate(""); }}>Clear Filters</button></div>
          </div>
          {!filteredPaidOrders.length && <p style={{ color: "var(--text-muted)", fontSize: ".9rem", padding: "0 1rem" }}>{paidTakeawayOrders.length ? "No paid takeaway orders match these filters." : orderNotice || "No paid takeaway orders."}</p>}
          {filteredPaidOrders.map((order) => {
            const orderItems = Array.isArray(order.items) ? order.items : [];
            const requiredItems = orderItems.filter((item) => !["cancelled", "canceled", "void", "deleted"].includes(String(item.kotStatus ?? item.KotStatus ?? "").trim().toLowerCase()));
            const allReady = requiredItems.length > 0 && requiredItems.every((item) => ["ready", "served", "completed"].includes(String(item.kotStatus ?? item.KotStatus ?? "").trim().toLowerCase()));
            const fulfillmentState = String(order.fulfillmentStatus ?? order.FulfillmentStatus ?? "").trim().toLowerCase().replace(/[ _-]/g, "");
            const alreadyHandedOver = ["pickedup", "dispatched", "handedover", "completed"].includes(fulfillmentState) || (requiredItems.length > 0 && requiredItems.every((item) => String(item.kotStatus ?? item.KotStatus ?? "").trim().toLowerCase() === "served"));
            const kotNotSent = orderItems.some((item) => !item.kotId);
            const orderId = order.id ?? order.orderId ?? order.Id;
            const orderTotal = order.grandTotal ?? order.totalAmount ?? order.total ?? order.amount;
            const displayStatus = order.fulfillmentStatus ?? order.FulfillmentStatus ?? (allReady ? "Ready" : "In kitchen");
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
