import React, { useState, useEffect, useMemo } from "react";
import {
  ShoppingBag,
  Search,
  Calendar,
  Plus,
  ChevronDown,
  IndianRupee,
  Clock,
  Hourglass,
  ChefHat,
  Bell,
  CheckCircle2,
  Check,
  XCircle,
  X,
  Eye,
  Printer,
  MoreHorizontal,
  RefreshCw,
  User,
  Phone,
  Receipt,
  Trash2,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  FileText,
} from "lucide-react";
import {
  apiGetAllAdminTakeawayOrders,
  apiGetAdminTakeawaySummary,
  apiGetAdminTakeawayOrder,
  apiUpdateAdminTakeawayStatus,
  apiCancelAdminTakeawayOrder,
  apiGetAdminTakeawayMenu,
  apiSearchAdminTakeawayMenu,
  apiGetAdminTakeawayCategories,
  apiCalculateAdminTakeawayCart,
  apiCreateAdminTakeawayOrder,
  apiGetAdminTakeawayInvoice,
} from "../api/takeawayAdminApi";
import { ReceiptModal, formatOrderNumber } from "../user/ReceiptModal";

function getTakeawayOrderTotal(order) {
  return Number(order?.totalAmount ?? order?.grandTotal ?? order?.amount ?? 0);
}

function isValidIndianMobileNumber(phone) {
  const normalizedPhone = String(phone || "").trim().replace(/[\s()-]/g, "");
  if (!/^\+?\d+$/.test(normalizedPhone)) return false;
  const digits = normalizedPhone.replace(/\D/g, "");
  const mobileNumber = digits.length === 12 && digits.startsWith("91") ? digits.slice(2) : digits;
  return /^[6-9]\d{9}$/.test(mobileNumber);
}

// ── Initial Seed Data (Precisely calibrated to the 86 Total / 8 Pending / 78 Completed / ₹74,320.00 KPI mockup) ──
export function AdminTakeaway({
  menuItems = [],
  restaurantName = "Bhanu Fine Dining & POS Management",
  restaurantSettings = {},
  restaurantLogo = "",
  currentSession = null,
}) {
  // Effective settings for invoices and receipts (matching Bhanu POS standard)
  const effectiveSettings = useMemo(() => {
    const base = restaurantSettings || {};
    let name = base.restaurantName?.trim() || restaurantName || "BHANU";
    if (!name || name.toLowerCase() === "restaurant") {
      name = "BHANU";
    }
    return {
      ...base,
      restaurantName: name,
      tagline: base.tagline?.trim() || "Fine Dining & POS Management",
      address: base.address?.trim() || "Main Road, Near Tech Park, Hyderabad, India",
      phone: base.phone?.trim() || "+91 98450 12345",
      gstin: base.gstin?.trim() || "36AABCA1234F1Z5",
      logo: restaurantLogo || base.logo || "",
    };
  }, [restaurantSettings, restaurantName, restaurantLogo]);

  const [orders, setOrders] = useState([]);
  const [summary, setSummary] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const normalizeOrder = (order) => {
    const rawStatus = String(order.fulfillmentStatus || order.orderStatus || "New");
    const normalizedStatus = rawStatus.toLowerCase() === "new" ? "Pending" : rawStatus.toLowerCase() === "pickedup" ? "Completed" : rawStatus.charAt(0).toUpperCase() + rawStatus.slice(1).toLowerCase();
    const date = order.orderDateTime || order.createdAt || "";
    return {
      ...order,
      id: String(order.orderId ?? order.id ?? ""),
      orderNumber: String(order.orderNumber || order.orderId || order.id || ""),
      customer: order.customerName || "",
      phone: order.customerPhone || "",
      itemsCount: Number(order.totalQuantity || order.itemCount || 0),
      items: (Array.isArray(order.items) ? order.items : []).map((item) => ({
        ...item,
        name: item.name || item.dishName || "",
        quantity: Number(item.quantity || 0),
        price: Number(item.unitPrice ?? item.price ?? 0),
      })),
      amount: Number(order.totalAmount ?? order.grandTotal ?? 0),
      status: normalizedStatus,
      orderTime: date ? new Date(date).toLocaleString("en-IN") : "",
      date,
      paymentMethod: order.paymentMethod || "",
      notes: order.specialInstructions || order.notes || "",
    };
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const [ordersResult, summaryResult] = await Promise.all([
        apiGetAllAdminTakeawayOrders(),
        apiGetAdminTakeawaySummary(),
      ]);
      if (!ordersResult?.success) throw new Error(ordersResult?.error || "Could not load takeaway orders.");
      if (!summaryResult?.success) throw new Error(summaryResult?.error || "Could not load takeaway order summary.");
      setOrders((Array.isArray(ordersResult.data) ? ordersResult.data : []).map(normalizeOrder));
      setSummary(summaryResult.data || null);
    } catch (error) {
      alert(error?.message || "Could not load takeaway orders.");
    } finally {
      setIsRefreshing(false);
    }
  };
  useEffect(() => {
    handleRefresh();
  }, []);  // --- Filtering & Tab State ---
  const [activeTabStatus, setActiveTabStatus] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState("all");
  const [secondaryStatusFilter, setSecondaryStatusFilter] = useState("all");
  const [dateDropdownOpen, setDateDropdownOpen] = useState(false);
  const [dateRangeLabel, setDateRangeLabel] = useState("All Dates");
  const [customDateRangeOpen, setCustomDateRangeOpen] = useState(false);
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [appliedCustomStartDate, setAppliedCustomStartDate] = useState("");
  const [appliedCustomEndDate, setAppliedCustomEndDate] = useState("");

  // --- Modals State ---
  const [isNewOrderModalOpen, setIsNewOrderModalOpen] = useState(false);
  const [selectedOrderDetails, setSelectedOrderDetails] = useState(null);
  const [printReceiptOrder, setPrintReceiptOrder] = useState(null);
  const [orderDetailsLoadingId, setOrderDetailsLoadingId] = useState(null);
  const [actionMenuOrderId, setActionMenuOrderId] = useState(null);
  const [actionMenuOpenAbove, setActionMenuOpenAbove] = useState(false);

  const handleViewOrder = async (order) => {
    setOrderDetailsLoadingId(String(order.id));
    const result = await apiGetAdminTakeawayOrder(order.id);
    setOrderDetailsLoadingId(null);
    if (!result?.success) {
      alert(result?.error || "Could not load takeaway order details.");
      return;
    }
    setSelectedOrderDetails(normalizeOrder(result.data));
  };

  const handlePrintInvoice = async (order) => {
    if (!order.invoiceId) {
      alert("This order has no invoice available.");
      return;
    }
    const result = await apiGetAdminTakeawayInvoice(order.invoiceId);
    if (!result?.success) {
      alert(result?.error || "Could not load takeaway invoice.");
      return;
    }
    const invoice = result.data || {};
    setPrintReceiptOrder({
      ...invoice,
      id: order.id,
      orderNumber: invoice.orderNumber || order.orderNumber,
      customer: invoice.customerName || order.customer,
      phone: invoice.customerPhone || order.phone,
      status: invoice.fulfillmentStatus || order.status,
      date: invoice.invoiceDate || invoice.orderDate || order.date,
      amount: invoice.totalAmount,
    });
  };

  // Table data formatted specifically for the unified ReceiptModal (80mm Thermal & A4 Tax Invoice)
  const receiptTableData = useMemo(() => {
    if (!printReceiptOrder) return null;

    const items =
      Array.isArray(printReceiptOrder.items) && printReceiptOrder.items.length > 0
        ? printReceiptOrder.items.map((it) => ({
            name: String(it?.name || it?.dishName || "Item").trim(),
            quantity: Number(it?.quantity ?? it?.qty) || 1,
            price: Number(it?.price ?? it?.unitPrice) || 0,
          }))
        : [];

    const subtotal = Number(printReceiptOrder.subtotal ?? 0);
    const taxAmount = Number(printReceiptOrder.taxAmount ?? printReceiptOrder.gstAmount ?? 0);
    const serviceChargeAmount = Number(printReceiptOrder.packagingCharge ?? printReceiptOrder.serviceCharge ?? 0);
    const grandTotal = Number(printReceiptOrder.totalAmount ?? printReceiptOrder.grandTotal ?? printReceiptOrder.amount ?? 0);

    const isCancelled = printReceiptOrder.status === "Cancelled";

    return {
      id: printReceiptOrder.id,
      invoiceNo: formatOrderNumber(printReceiptOrder.orderNumber || printReceiptOrder.id),
      name: "Takeaway",
      tableName: "Takeaway",
      section: "Takeaway",
      server: "Staff",
      guests: 1,
      date: printReceiptOrder.date || new Date().toISOString(),
      orderTime: printReceiptOrder.orderTime || printReceiptOrder.date,
      status: isCancelled ? "Cancelled" : "Completed",
      isPaid: !isCancelled,
      settled: !isCancelled,
      settledAt: printReceiptOrder.date || new Date().toISOString(),
      paymentMethod: (printReceiptOrder.paymentMethod || "CASH").toUpperCase(),
      customer: printReceiptOrder.customer || "Walk-in Guest",
      customerPhone: printReceiptOrder.phone || "",
      items,
      subtotal,
      taxAmount,
      serviceCharge: 0,
      serviceChargeAmount,
      grandTotal,
    };
  }, [printReceiptOrder]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (!e.target.closest(".action-menu-container")) {
        setActionMenuOrderId(null);
        setActionMenuOpenAbove(false);
      }
      if (!e.target.closest(".date-filter-dropdown-container")) {
        setDateDropdownOpen(false);
      }
    };
    window.addEventListener("click", handleOutsideClick);
    return () => window.removeEventListener("click", handleOutsideClick);
  }, []);

  // --- KPI Card Calculations ---
  const totalOrdersCount = Number(summary?.totalTakeawayOrders ?? orders.length);
  const totalSalesAmount = Number(summary?.totalTakeawaySales ?? 0);
  const pendingOrdersCount = Number(summary?.pendingOrders ?? 0);
  const completedOrdersCount = Number(summary?.completedOrders ?? 0);

  // Tab Badge Counts
  const tabCounts = useMemo(() => {
    return {
      all: Number(summary?.totalTakeawayOrders ?? orders.length),
      Pending: Number(summary?.pendingOrders ?? 0),
      Preparing: Number(summary?.preparingOrders ?? 0),
      Ready: Number(summary?.readyOrders ?? 0),
      Completed: Number(summary?.completedOrders ?? 0),
      Cancelled: Number(summary?.cancelledOrders ?? 0),
    };
  }, [orders, summary]);

  // --- Filtered Orders List ---
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      // 1. Primary tab status filter
      if (activeTabStatus !== "all" && order.status.toLowerCase() !== activeTabStatus.toLowerCase()) {
        return false;
      }

      // 2. Secondary status dropdown filter
      if (
        secondaryStatusFilter !== "all" &&
        order.status.toLowerCase() !== secondaryStatusFilter.toLowerCase()
      ) {
        return false;
      }

      // 3. Search query filter
      if (searchQuery.trim()) {
        const query = searchQuery.trim().toLowerCase();
        const idMatch = String(order.id || "").toLowerCase().includes(query);
        const nameMatch = String(order.customer || "").toLowerCase().includes(query);
        const phoneMatch = String(order.phone || "").toLowerCase().includes(query);
        if (!idMatch && !nameMatch && !phoneMatch) return false;
      }

      // 4. Date filter
      if (dateFilter !== "all") {
        const orderDate = new Date(order.date || Date.now());
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        if (dateFilter === "today") {
          if (orderDate < today) return false;
        } else if (dateFilter === "yesterday") {
          const yesterday = new Date(today.getTime() - 86400000);
          if (orderDate < yesterday || orderDate >= today) return false;
        } else if (dateFilter === "7days") {
          const sevenDaysAgo = new Date(today.getTime() - 6 * 86400000);
          if (orderDate < sevenDaysAgo) return false;
        } else if (dateFilter === "month") {
          const monthAgo = new Date(today.getTime() - 30 * 86400000);
          if (orderDate < monthAgo) return false;
        } else if (dateFilter === "custom") {
          const startDate = new Date(`${appliedCustomStartDate}T00:00:00`);
          const endDateExclusive = new Date(`${appliedCustomEndDate}T00:00:00`);
          endDateExclusive.setDate(endDateExclusive.getDate() + 1);
          if (orderDate < startDate || orderDate >= endDateExclusive) return false;
        }
      }

      return true;
    });
  }, [orders, activeTabStatus, secondaryStatusFilter, searchQuery, dateFilter, appliedCustomStartDate, appliedCustomEndDate]);

  // --- Pagination State ---
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;
  const totalPages = Math.ceil(filteredOrders.length / pageSize) || 1;
  const safePage = Math.min(Math.max(currentPage, 1), totalPages);

  const paginatedOrders = useMemo(() => {
    const startIdx = (safePage - 1) * pageSize;
    return filteredOrders.slice(startIdx, startIdx + pageSize);
  }, [filteredOrders, safePage]);

  // Reset page when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTabStatus, searchQuery, dateFilter, secondaryStatusFilter]);

  const updateOrderStatus = async (orderId, newStatus) => {
    if (newStatus === "Cancelled" && !window.confirm("Cancel this takeaway order? The backend will apply supported refund and KOT/BOT voiding rules.")) return;
    setActionMenuOrderId(null);
    setActionMenuOpenAbove(false);
    const result = newStatus === "Cancelled"
      ? await apiCancelAdminTakeawayOrder(orderId, "Cancelled by admin")
      : await apiUpdateAdminTakeawayStatus(orderId, newStatus);
    if (!result?.success) {
      alert(result?.error || `Could not update order status to ${newStatus}.`);
      return;
    }
    await handleRefresh();
    if (selectedOrderDetails && String(selectedOrderDetails.id) === String(orderId)) {
      const detail = await apiGetAdminTakeawayOrder(orderId);
      if (detail?.success) setSelectedOrderDetails(normalizeOrder(detail.data));
    }
  };

  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerPhone, setNewCustomerPhone] = useState("");
  const [customerPhoneError, setCustomerPhoneError] = useState("");
  const [newOrderNotes, setNewOrderNotes] = useState("");
  const [newPaymentMethod, setNewPaymentMethod] = useState("UPI");
  const [newOrderCart, setNewOrderCart] = useState({});
  const [itemSearchQuery, setItemSearchQuery] = useState("");
  const [itemCategoryFilter, setItemCategoryFilter] = useState("all");
  const [takeawayMenuItems, setTakeawayMenuItems] = useState([]);
  const [takeawayCategories, setTakeawayCategories] = useState([]);
  const [menuLoading, setMenuLoading] = useState(false);
  const [cartCalculation, setCartCalculation] = useState(null);
  const [cartCalculationLoading, setCartCalculationLoading] = useState(false);
  const [orderSaving, setOrderSaving] = useState(false);

  useEffect(() => {
    if (!isNewOrderModalOpen) return undefined;
    let cancelled = false;
    apiGetAdminTakeawayCategories().then((result) => {
      if (!cancelled && result?.success) setTakeawayCategories(Array.isArray(result.data) ? result.data : []);
    }).catch((error) => { if (!cancelled) alert(error?.message || "Could not load takeaway categories."); });
    return () => { cancelled = true; };
  }, [isNewOrderModalOpen]);

  useEffect(() => {
    if (!isNewOrderModalOpen) return undefined;
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setMenuLoading(true);
      try {
        const result = itemSearchQuery.trim()
          ? await apiSearchAdminTakeawayMenu(itemSearchQuery.trim(), itemCategoryFilter === "all" ? undefined : itemCategoryFilter)
          : await apiGetAdminTakeawayMenu({ page: 1, pageSize: 100, category: itemCategoryFilter === "all" ? undefined : itemCategoryFilter });
        if (!result?.success) throw new Error(result?.error || "Could not load takeaway menu.");
        const payload = result.data;
        const rows = Array.isArray(payload) ? payload : (payload?.data || []);
        if (!cancelled) setTakeawayMenuItems(rows.map((item) => ({
          ...item,
          id: item.itemId ?? item.menuItemId,
          name: item.name || item.dishName || "",
          price: Number(item.price || 0),
          category: item.category || "",
        })));
      } catch (error) {
        if (!cancelled) {
          setTakeawayMenuItems([]);
          alert(error?.message || "Could not load takeaway menu.");
        }
      } finally {
        if (!cancelled) setMenuLoading(false);
      }
    }, itemSearchQuery.trim() ? 250 : 0);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [isNewOrderModalOpen, itemSearchQuery, itemCategoryFilter]);

  const availableFoodItems = takeawayMenuItems.filter((item) => item.isAvailable !== false);
  const addCartItem = (dish) => {
    const id = dish.itemId ?? dish.menuItemId ?? dish.id;
    if (!id) return;
    setNewOrderCart((prev) => {
      const cur = prev[id] || { item: dish, quantity: 0 };
      return { ...prev, [id]: { ...cur, quantity: cur.quantity + 1 } };
    });
  };
  const removeCartItem = (dish) => {
    const id = dish.itemId ?? dish.menuItemId ?? dish.id;
    setNewOrderCart((prev) => {
      const cur = prev[id];
      if (!cur) return prev;
      if (cur.quantity <= 1) {
        const next = { ...prev };
        delete next[id];
        return next;
      }
      return { ...prev, [id]: { ...cur, quantity: cur.quantity - 1 } };
    });
  };

  const cartItemsList = Object.values(newOrderCart);
  useEffect(() => {
    if (!isNewOrderModalOpen || cartItemsList.length === 0) {
      setCartCalculation(null);
      setCartCalculationLoading(false);
      return undefined;
    }
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setCartCalculationLoading(true);
      try {
        const result = await apiCalculateAdminTakeawayCart({
          items: cartItemsList.map(({ item, quantity }) => ({ itemId: Number(item.itemId ?? item.menuItemId ?? item.id), quantity })),
        });
        if (!result?.success) throw new Error(result?.error || "Could not calculate takeaway total.");
        if (!cancelled) setCartCalculation(result.data || null);
      } catch (error) {
        if (!cancelled) {
          setCartCalculation(null);
          alert(error?.message || "Could not calculate takeaway total.");
        }
      } finally {
        if (!cancelled) setCartCalculationLoading(false);
      }
    }, 150);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [isNewOrderModalOpen, newOrderCart]);

  const cartSubtotal = Number(cartCalculation?.subtotal || 0);
  const cartGst = Number(cartCalculation?.taxAmount ?? cartCalculation?.gstAmount ?? 0);
  const cartServiceCharge = Number(cartCalculation?.packagingCharge || 0);
  const cartTotal = Number(cartCalculation?.finalAmount ?? cartCalculation?.totalAmount ?? 0);

  const handleCreateTakeawayOrder = async () => {
    if (!isValidIndianMobileNumber(newCustomerPhone)) {
      setCustomerPhoneError(newCustomerPhone.trim() ? "Enter a valid 10-digit Indian mobile number." : "Phone number is required.");
      return;
    }
    setCustomerPhoneError("");
    if (!cartItemsList.length) {
      alert("Please add at least one item to the takeaway order.");
      return;
    }
    if (!cartCalculation || cartCalculationLoading) {
      alert("Wait for the server to calculate the order total.");
      return;
    }

    setOrderSaving(true);
    try {
      const payload = {
        customerName: newCustomerName.trim() || "Walk-in Guest",
        customerPhone: newCustomerPhone.trim(),
        paymentMethod: newPaymentMethod || "Direct",
        paymentStatus: "Paid",
        isPaid: true,
        paidAmount: cartSubtotal || cartTotal,
        notes: newOrderNotes.trim() || null,
        items: cartItemsList.map(({ item, quantity }) => ({
          itemId: Number(item.itemId ?? item.menuItemId ?? item.id),
          quantity: Number(quantity),
        })),
        idempotencyKey: globalThis.crypto?.randomUUID?.() || `admin-takeaway-${Date.now()}`,
      };
      const result = await apiCreateAdminTakeawayOrder(payload);
      if (!result?.success) throw new Error(result?.error || "Could not create takeaway order.");
      const created = result.data || {};
      setIsNewOrderModalOpen(false);
      setNewCustomerName("");
      setNewCustomerPhone("");
      setNewOrderNotes("");
      setNewOrderCart({});
      setCartCalculation(null);
      await handleRefresh();
      if (created.orderId) {
        const detail = await apiGetAdminTakeawayOrder(created.orderId);
        if (detail?.success) setSelectedOrderDetails(normalizeOrder(detail.data));
      }
    } catch (error) {
      alert(error?.message || "Could not create takeaway order.");
    } finally {
      setOrderSaving(false);
    }
  };  // Status Badge Component
  const renderStatusBadge = (status) => {
    switch (status) {
      case "Pending":
        return (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.38rem",
              padding: "0.28rem 0.75rem",
              borderRadius: "9999px",
              fontSize: "0.78rem",
              fontWeight: 600,
              background: "rgba(245, 158, 11, 0.12)",
              color: "#d97706",
              border: "1px solid rgba(245, 158, 11, 0.28)",
              whiteSpace: "nowrap",
            }}
          >
            <Hourglass size={12} strokeWidth={2.2} />
            Pending
          </span>
        );
      case "Preparing":
        return (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.38rem",
              padding: "0.28rem 0.75rem",
              borderRadius: "9999px",
              fontSize: "0.78rem",
              fontWeight: 600,
              background: "rgba(59, 130, 246, 0.12)",
              color: "#2563eb",
              border: "1px solid rgba(59, 130, 246, 0.28)",
              whiteSpace: "nowrap",
            }}
          >
            <ChefHat size={12} strokeWidth={2.2} />
            Preparing
          </span>
        );
      case "Ready":
        return (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.38rem",
              padding: "0.28rem 0.75rem",
              borderRadius: "9999px",
              fontSize: "0.78rem",
              fontWeight: 600,
              background: "rgba(168, 85, 247, 0.12)",
              color: "#9333ea",
              border: "1px solid rgba(168, 85, 247, 0.28)",
              whiteSpace: "nowrap",
            }}
          >
            <Bell size={12} strokeWidth={2.2} />
            Ready
          </span>
        );
      case "Completed":
        return (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.38rem",
              padding: "0.28rem 0.75rem",
              borderRadius: "9999px",
              fontSize: "0.78rem",
              fontWeight: 600,
              background: "rgba(34, 197, 94, 0.12)",
              color: "#16a34a",
              border: "1px solid rgba(34, 197, 94, 0.28)",
              whiteSpace: "nowrap",
            }}
          >
            <Check size={12} strokeWidth={2.5} />
            Completed
          </span>
        );
      case "Cancelled":
        return (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.38rem",
              padding: "0.28rem 0.75rem",
              borderRadius: "9999px",
              fontSize: "0.78rem",
              fontWeight: 600,
              background: "rgba(239, 68, 68, 0.12)",
              color: "#dc2626",
              border: "1px solid rgba(239, 68, 68, 0.28)",
              whiteSpace: "nowrap",
            }}
          >
            <X size={12} strokeWidth={2.5} />
            Cancelled
          </span>
        );
      default:
        return <span>{status}</span>;
    }
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "1.25rem",
        color: "var(--text-main)",
        fontFamily: "inherit",
      }}
    >
      {/* ── Top Header ────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        {/* Title and Icon */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.85rem" }}>
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "12px",
              background: "linear-gradient(135deg, #f97316 0%, #ea580c 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              boxShadow: "0 4px 12px rgba(234, 88, 12, 0.3)",
              flexShrink: 0,
            }}
          >
            <ShoppingBag size={24} />
          </div>
          <div>
            <h1
              style={{
                margin: 0,
                fontSize: "1.45rem",
                fontWeight: 700,
                letterSpacing: "-0.01em",
                color: "var(--text-main)",
                lineHeight: 1.2,
              }}
            >
              Takeaway Orders
            </h1>
            <p
              style={{
                margin: "0.2rem 0 0",
                fontSize: "0.84rem",
                color: "var(--text-muted)",
              }}
            >
              Manage and track all takeaway (pickup) orders
            </p>
          </div>
        </div>

        {/* Top Right Controls (Date Selector & + New Takeaway Button) */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          {/* Date Selector Dropdown */}
          <div className="date-filter-dropdown-container" style={{ position: "relative" }}>
            <button
              type="button"
              onClick={() => setDateDropdownOpen(!dateDropdownOpen)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.55rem",
                height: "42px",
                padding: "0 1rem",
                borderRadius: "10px",
                border: "1px solid var(--border-card)",
                background: "var(--bg-card)",
                color: "var(--text-main)",
                fontSize: "0.84rem",
                fontWeight: 500,
                cursor: "pointer",
                boxShadow: "0 1px 3px rgba(0, 0, 0, 0.04)",
                transition: "all 0.15s ease",
              }}
            >
              <Calendar size={15} color="#ea580c" />
              <span>{dateRangeLabel}</span>
              <ChevronDown size={14} style={{ opacity: 0.6 }} />
            </button>

            {dateDropdownOpen && (
              <div
                style={{
                  position: "absolute",
                  right: 0,
                  top: "calc(100% + 6px)",
                  background: "var(--bg-card)",
                  border: "1px solid var(--border-card)",
                  borderRadius: "10px",
                  boxShadow: "0 10px 25px rgba(0, 0, 0, 0.18)",
                  padding: "0.4rem",
                  zIndex: 50,
                  minWidth: "210px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.2rem",
                }}
              >
                {[
                  { label: "Today", value: "today" },
                  { label: "Yesterday", value: "yesterday" },
                  { label: "Last 7 Days", value: "7days" },
                  { label: "This Month (Oct 2026)", value: "month" },
                  { label: "01 Oct 2026 – 14 Oct 2026", value: "all" },
                ].map((preset) => (
                  <button
                    key={preset.value}
                    type="button"
                    onClick={() => {
                      setDateFilter(preset.value);
                      setDateRangeLabel(preset.label);
                      setDateDropdownOpen(false);
                    }}
                    style={{
                      textAlign: "left",
                      padding: "0.55rem 0.85rem",
                      borderRadius: "6px",
                      border: "none",
                      background: dateFilter === preset.value ? "rgba(234, 88, 12, 0.12)" : "transparent",
                      color: dateFilter === preset.value ? "#ea580c" : "var(--text-main)",
                      fontSize: "0.82rem",
                      fontWeight: dateFilter === preset.value ? 600 : 400,
                      cursor: "pointer",
                    }}
                  >
                    {preset.label}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setCustomDateRangeOpen((open) => !open)}
                  style={{
                    textAlign: "left",
                    padding: "0.55rem 0.85rem",
                    borderRadius: "6px",
                    border: "none",
                    background: customDateRangeOpen || dateFilter === "custom" ? "rgba(234, 88, 12, 0.12)" : "transparent",
                    color: customDateRangeOpen || dateFilter === "custom" ? "#ea580c" : "var(--text-main)",
                    fontSize: "0.82rem",
                    fontWeight: customDateRangeOpen || dateFilter === "custom" ? 600 : 400,
                    cursor: "pointer",
                  }}
                >
                  Custom date range
                </button>
                {customDateRangeOpen && (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.5rem",
                      padding: "0.5rem 0.45rem 0.35rem",
                      borderTop: "1px solid var(--border-card)",
                    }}
                  >
                    <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem", color: "var(--text-muted)", fontSize: "0.72rem" }}>
                      From
                      <input
                        aria-label="Start date"
                        type="date"
                        value={customStartDate}
                        max={customEndDate || undefined}
                        onChange={(event) => setCustomStartDate(event.target.value)}
                        style={{
                          width: "100%",
                          boxSizing: "border-box",
                          padding: "0.45rem",
                          border: "1px solid var(--border-card)",
                          borderRadius: "6px",
                          background: "var(--bg-main)",
                          color: "var(--text-main)",
                        }}
                      />
                    </label>
                    <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem", color: "var(--text-muted)", fontSize: "0.72rem" }}>
                      To
                      <input
                        aria-label="End date"
                        type="date"
                        value={customEndDate}
                        min={customStartDate || undefined}
                        onChange={(event) => setCustomEndDate(event.target.value)}
                        style={{
                          width: "100%",
                          boxSizing: "border-box",
                          padding: "0.45rem",
                          border: "1px solid var(--border-card)",
                          borderRadius: "6px",
                          background: "var(--bg-main)",
                          color: "var(--text-main)",
                        }}
                      />
                    </label>
                    <button
                      type="button"
                      disabled={!customStartDate || !customEndDate || customStartDate > customEndDate}
                      onClick={() => {
                        const formatDate = (date) =>
                          new Date(`${date}T00:00:00`).toLocaleDateString("en-GB", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          });
                          setAppliedCustomStartDate(customStartDate);
                          setAppliedCustomEndDate(customEndDate);
                          setDateFilter("custom");
                        setDateRangeLabel(`${formatDate(customStartDate)} – ${formatDate(customEndDate)}`);
                        setDateDropdownOpen(false);
                        setCustomDateRangeOpen(false);
                      }}
                      style={{
                        padding: "0.5rem 0.75rem",
                        border: "none",
                        borderRadius: "6px",
                        background: "#ea580c",
                        color: "#fff",
                        fontSize: "0.8rem",
                        fontWeight: 600,
                        cursor: !customStartDate || !customEndDate || customStartDate > customEndDate ? "not-allowed" : "pointer",
                        opacity: !customStartDate || !customEndDate || customStartDate > customEndDate ? 0.55 : 1,
                      }}
                    >
                      Apply date range
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* + New Takeaway Button */}
          <button
            type="button"
            onClick={() => setIsNewOrderModalOpen(true)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.45rem",
              height: "42px",
              padding: "0 1.25rem",
              borderRadius: "10px",
              border: "none",
              background: "linear-gradient(135deg, #f97316 0%, #ea580c 100%)",
              color: "#fff",
              fontSize: "0.88rem",
              fontWeight: 600,
              cursor: "pointer",
              boxShadow: "0 3px 10px rgba(234, 88, 12, 0.35)",
              transition: "transform 0.15s ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-1px)")}
            onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0)")}
          >
            <Plus size={16} strokeWidth={2.5} />
            <span>New Takeaway</span>
          </button>
        </div>
      </div>

      {/* ── Key Metrics / KPI Summary Cards (4 Cards) ────────── */}
      <div
        className="takeaway-metrics-grid"
        style={{
          display: "grid",
          gap: "0.75rem",
        }}
      >
        {/* Card 1: Total Takeaway Orders */}
        <div
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border-card)",
            borderRadius: "12px",
            padding: "0.75rem 0.85rem",
            display: "flex",
            alignItems: "center",
            gap: "0.7rem",
            boxShadow: "0 1px 3px rgba(0, 0, 0, 0.04), 0 4px 12px rgba(0, 0, 0, 0.02)",
            minWidth: 0,
          }}
        >
          <div
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "50%",
              background: "rgba(249, 115, 22, 0.12)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#ea580c",
              flexShrink: 0,
            }}
          >
            <ShoppingBag size={20} />
          </div>
          <div style={{ minWidth: 0, overflow: "hidden" }}>
            <div
              style={{
                fontSize: "0.74rem",
                color: "var(--text-muted)",
                fontWeight: 600,
                whiteSpace: "nowrap",
              }}
            >
              Total Takeaway Orders
            </div>
            <div
              style={{
                fontSize: "1.35rem",
                fontWeight: 800,
                marginTop: "0.1rem",
                color: "var(--text-main)",
                whiteSpace: "nowrap",
                letterSpacing: "-0.02em",
                lineHeight: 1.1,
              }}
            >
              {totalOrdersCount}
            </div>
          </div>
        </div>

        {/* Card 2: Takeaway Sales */}
        <div
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border-card)",
            borderRadius: "12px",
            padding: "0.75rem 0.85rem",
            display: "flex",
            alignItems: "center",
            gap: "0.7rem",
            boxShadow: "0 1px 3px rgba(0, 0, 0, 0.04), 0 4px 12px rgba(0, 0, 0, 0.02)",
            minWidth: 0,
          }}
        >
          <div
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "50%",
              background: "rgba(34, 197, 94, 0.12)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#16a34a",
              flexShrink: 0,
            }}
          >
            <IndianRupee size={20} />
          </div>
          <div style={{ minWidth: 0, overflow: "hidden" }}>
            <div
              style={{
                fontSize: "0.74rem",
                color: "var(--text-muted)",
                fontWeight: 600,
                whiteSpace: "nowrap",
              }}
            >
              Takeaway Sales
            </div>
            <div
              style={{
                fontSize: "1.35rem",
                fontWeight: 800,
                marginTop: "0.1rem",
                color: "#16a34a",
                whiteSpace: "nowrap",
                letterSpacing: "-0.02em",
                lineHeight: 1.1,
              }}
            >
              ₹ {totalSalesAmount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
        </div>

        {/* Card 3: Pending Orders */}
        <div
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border-card)",
            borderRadius: "12px",
            padding: "0.75rem 0.85rem",
            display: "flex",
            alignItems: "center",
            gap: "0.7rem",
            boxShadow: "0 1px 3px rgba(0, 0, 0, 0.04), 0 4px 12px rgba(0, 0, 0, 0.02)",
            minWidth: 0,
          }}
        >
          <div
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "50%",
              background: "rgba(245, 158, 11, 0.12)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#d97706",
              flexShrink: 0,
            }}
          >
            <Hourglass size={20} />
          </div>
          <div style={{ minWidth: 0, overflow: "hidden" }}>
            <div
              style={{
                fontSize: "0.74rem",
                color: "var(--text-muted)",
                fontWeight: 600,
                whiteSpace: "nowrap",
              }}
            >
              Pending Orders
            </div>
            <div
              style={{
                fontSize: "1.35rem",
                fontWeight: 800,
                marginTop: "0.1rem",
                color: "#d97706",
                whiteSpace: "nowrap",
                letterSpacing: "-0.02em",
                lineHeight: 1.1,
              }}
            >
              {pendingOrdersCount}
            </div>
          </div>
        </div>

        {/* Card 4: Completed Orders */}
        <div
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border-card)",
            borderRadius: "12px",
            padding: "0.75rem 0.85rem",
            display: "flex",
            alignItems: "center",
            gap: "0.7rem",
            boxShadow: "0 1px 3px rgba(0, 0, 0, 0.04), 0 4px 12px rgba(0, 0, 0, 0.02)",
            minWidth: 0,
          }}
        >
          <div
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "50%",
              background: "rgba(34, 197, 94, 0.12)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#16a34a",
              flexShrink: 0,
            }}
          >
            <CheckCircle2 size={20} />
          </div>
          <div style={{ minWidth: 0, overflow: "hidden" }}>
            <div
              style={{
                fontSize: "0.74rem",
                color: "var(--text-muted)",
                fontWeight: 600,
                whiteSpace: "nowrap",
              }}
            >
              Completed Orders
            </div>
            <div
              style={{
                fontSize: "1.35rem",
                fontWeight: 800,
                marginTop: "0.1rem",
                color: "#16a34a",
                whiteSpace: "nowrap",
                letterSpacing: "-0.02em",
                lineHeight: 1.1,
              }}
            >
              {completedOrdersCount}
            </div>
          </div>
        </div>
      </div>

      {/* ── Status Filter Tabs (Horizontal Pills) ───────────── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.6rem",
          overflowX: "auto",
          paddingBottom: "0.2rem",
        }}
      >
        {[
          { key: "all", label: "All Orders", count: tabCounts.all, icon: ShoppingBag },
          { key: "Pending", label: "Pending", count: tabCounts.Pending, icon: Hourglass },
          { key: "Preparing", label: "Preparing", count: tabCounts.Preparing, icon: ChefHat },
          { key: "Ready", label: "Ready", count: tabCounts.Ready, icon: Bell },
          { key: "Completed", label: "Completed", count: tabCounts.Completed, icon: CheckCircle2 },
          { key: "Cancelled", label: "Cancelled", count: tabCounts.Cancelled, icon: XCircle },
        ].map((tab) => {
          const isActive = activeTabStatus.toLowerCase() === tab.key.toLowerCase();
          const Icon = tab.icon;
          const tabColor = {
            all: { text: "#ea580c", background: "rgba(234, 88, 12, 0.1)", border: "rgba(234, 88, 12, 0.3)" },
            pending: { text: "#b45309", background: "rgba(245, 158, 11, 0.1)", border: "rgba(245, 158, 11, 0.35)" },
            preparing: { text: "#2563eb", background: "rgba(59, 130, 246, 0.1)", border: "rgba(59, 130, 246, 0.3)" },
            ready: { text: "#9333ea", background: "rgba(168, 85, 247, 0.1)", border: "rgba(168, 85, 247, 0.3)" },
            completed: { text: "#16a34a", background: "rgba(34, 197, 94, 0.1)", border: "rgba(34, 197, 94, 0.3)" },
            cancelled: { text: "#dc2626", background: "rgba(239, 68, 68, 0.1)", border: "rgba(239, 68, 68, 0.3)" },
          }[tab.key.toLowerCase()];
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTabStatus(tab.key)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.45rem",
                height: "38px",
                padding: "0 1.05rem",
                borderRadius: "10px",
                border: `1px solid ${tabColor.border}`,
                background: isActive
                  ? tabColor.text
                  : `linear-gradient(${tabColor.background}, ${tabColor.background}), var(--bg-card)`,
                color: isActive ? "#ffffff" : tabColor.text,
                fontSize: "0.84rem",
                fontWeight: isActive ? 600 : 500,
                cursor: "pointer",
                whiteSpace: "nowrap",
                boxShadow: isActive ? `0 3px 8px ${tabColor.border}` : "none",
                transition: "all 0.15s ease",
              }}
            >
              <Icon size={14} />
              <span>
                {tab.label} ({tab.count})
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Search & Filter Controls ────────────────────────── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "0.75rem",
        }}
      >
        {/* Search input */}
        <div
          style={{
            position: "relative",
            flex: "1 1 320px",
            maxWidth: "480px",
          }}
        >
          <Search
            size={16}
            style={{
              position: "absolute",
              left: "0.95rem",
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--text-muted)",
              pointerEvents: "none",
            }}
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Order ID, Customer or Phone..."
            style={{
              width: "100%",
              height: "42px",
              padding: "0 0.95rem 0 2.5rem",
              borderRadius: "10px",
              border: "1px solid var(--border-card)",
              background: "var(--bg-card)",
              color: "var(--text-main)",
              fontSize: "0.84rem",
              outline: "none",
              boxSizing: "border-box",
            }}
          />
        </div>

        {/* Dropdown Filters and Refresh Button */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
          {/* Quick Date Select */}
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            style={{
              height: "42px",
              padding: "0 1rem",
              borderRadius: "10px",
              border: "1px solid var(--border-card)",
              background: "var(--bg-card)",
              color: "var(--text-main)",
              fontSize: "0.83rem",
              fontWeight: 500,
              cursor: "pointer",
              outline: "none",
            }}
          >
            <option value="all">All Dates</option>
            <option value="today">Today</option>
            <option value="yesterday">Yesterday</option>
            <option value="7days">Last 7 Days</option>
            <option value="month">This Month</option>
          </select>

          {/* Secondary Status Filter */}
          <select
            value={secondaryStatusFilter}
            onChange={(e) => setSecondaryStatusFilter(e.target.value)}
            style={{
              height: "42px",
              padding: "0 1rem",
              borderRadius: "10px",
              border: "1px solid var(--border-card)",
              background: "var(--bg-card)",
              color: "var(--text-main)",
              fontSize: "0.83rem",
              fontWeight: 500,
              cursor: "pointer",
              outline: "none",
            }}
          >
            <option value="all">All Status</option>
            <option value="Pending">Pending</option>
            <option value="Preparing">Preparing</option>
            <option value="Ready">Ready</option>
            <option value="Completed">Completed</option>
            <option value="Cancelled">Cancelled</option>
          </select>

          {/* Refresh Button */}
          <button
            type="button"
            onClick={handleRefresh}
            title="Refresh orders from server"
            style={{
              height: "42px",
              width: "42px",
              borderRadius: "10px",
              border: "1px solid var(--border-card)",
              background: "var(--bg-card)",
              color: "var(--text-main)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "transform 0.2s ease",
            }}
          >
            <RefreshCw
              size={16}
              style={{
                animation: isRefreshing ? "spin 0.8s linear infinite" : "none",
              }}
            />
          </button>
        </div>
      </div>

      {/* ── Orders Table ────────────────────────────────────── */}
      <div
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border-card)",
          borderRadius: "14px",
          overflow: "hidden",
          boxShadow: "0 1px 3px rgba(0, 0, 0, 0.04), 0 4px 12px rgba(0, 0, 0, 0.02)",
        }}
      >
        <div className="takeaway-orders-scroll" style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              tableLayout: "fixed",
              borderCollapse: "separate",
              borderSpacing: 0,
              textAlign: "left",
              fontSize: "0.73rem",
            }}
          >
            <colgroup>
              <col style={{ width: "4%" }} />
              <col style={{ width: "9%" }} />
              <col style={{ width: "12%" }} />
              <col style={{ width: "12%" }} />
              <col style={{ width: "8%" }} />
              <col style={{ width: "11%" }} />
              <col style={{ width: "14%" }} />
              <col style={{ width: "16%" }} />
              <col style={{ width: "14%" }} />
            </colgroup>
            <thead>
              <tr>
                <th style={{ padding: "0.48rem 0.45rem", borderBottom: "1px solid var(--border-card)", color: "var(--text-muted)", fontSize: "0.66rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.025em", whiteSpace: "nowrap" }}>
                  #
                </th>
                <th style={{ padding: "0.48rem 0.45rem", borderBottom: "1px solid var(--border-card)", color: "var(--text-muted)", fontSize: "0.66rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.025em", whiteSpace: "nowrap" }}>
                  ORDER ID
                </th>
                <th style={{ padding: "0.48rem 0.45rem", borderBottom: "1px solid var(--border-card)", color: "var(--text-muted)", fontSize: "0.66rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.025em", whiteSpace: "nowrap" }}>
                  CUSTOMER
                </th>
                <th style={{ padding: "0.48rem 0.45rem", borderBottom: "1px solid var(--border-card)", color: "var(--text-muted)", fontSize: "0.66rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.025em", whiteSpace: "nowrap" }}>
                  PHONE
                </th>
                <th style={{ padding: "0.48rem 0.45rem", borderBottom: "1px solid var(--border-card)", color: "var(--text-muted)", fontSize: "0.66rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.025em", whiteSpace: "nowrap" }}>
                  ITEMS
                </th>
                <th style={{ padding: "0.48rem 0.45rem", borderBottom: "1px solid var(--border-card)", color: "var(--text-muted)", fontSize: "0.66rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.025em", whiteSpace: "nowrap" }}>
                  AMOUNT
                </th>
                <th style={{ padding: "0.48rem 0.45rem", borderBottom: "1px solid var(--border-card)", color: "var(--text-muted)", fontSize: "0.66rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.025em", whiteSpace: "nowrap" }}>
                  STATUS
                </th>
                <th style={{ padding: "0.48rem 0.45rem", borderBottom: "1px solid var(--border-card)", color: "var(--text-muted)", fontSize: "0.66rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.025em", whiteSpace: "nowrap" }}>
                  ORDER TIME
                </th>
                <th style={{ padding: "0.48rem 0.45rem", borderBottom: "1px solid var(--border-card)", color: "var(--text-muted)", fontSize: "0.66rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.025em", textAlign: "right", whiteSpace: "nowrap" }}>
                  ACTIONS
                </th>
              </tr>
            </thead>
            <tbody>
              {paginatedOrders.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    style={{
                      padding: "3.5rem 1rem",
                      textAlign: "center",
                      color: "var(--text-muted)",
                      fontSize: "0.9rem",
                    }}
                  >
                    No takeaway orders found matching your criteria.
                  </td>
                </tr>
              ) : (
                paginatedOrders.map((order, idx) => {
                  const rowNumber = (safePage - 1) * pageSize + idx + 1;
                  return (
                    <tr
                      key={order.id}
                      onClick={() => {
                        setActionMenuOrderId(null);
                        handleViewOrder(order);
                      }}
                      style={{
                        transition: "background 0.15s ease",
                        cursor: "pointer",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(249, 115, 22, 0.03)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      <td style={{ padding: "0.44rem 0.45rem", borderBottom: "1px solid var(--border-card)", color: "var(--text-muted)", verticalAlign: "middle", whiteSpace: "nowrap" }}>
                        {rowNumber}
                      </td>
                      <td style={{ padding: "0.44rem 0.45rem", borderBottom: "1px solid var(--border-card)", fontWeight: 700, color: "var(--text-main)", verticalAlign: "middle", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {formatOrderNumber(order.orderNumber || order.id)}
                      </td>
                      <td style={{ padding: "0.44rem 0.45rem", borderBottom: "1px solid var(--border-card)", fontWeight: 600, color: "var(--text-main)", verticalAlign: "middle", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {order.customer}
                      </td>
                      <td style={{ padding: "0.44rem 0.45rem", borderBottom: "1px solid var(--border-card)", color: "var(--text-muted)", verticalAlign: "middle", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {order.phone}
                      </td>
                      <td style={{ padding: "0.44rem 0.45rem", borderBottom: "1px solid var(--border-card)", verticalAlign: "middle", whiteSpace: "nowrap" }}>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            padding: "0.25rem 0.45rem",
                            borderRadius: "6px",
                            fontSize: "0.76rem",
                            fontWeight: 600,
                            background: "rgba(100, 116, 139, 0.07)",
                            color: "var(--text-main)",
                            border: "1px solid var(--border-card)",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {order.itemsCount} Items
                        </span>
                      </td>
                      <td style={{ padding: "0.44rem 0.45rem", borderBottom: "1px solid var(--border-card)", fontWeight: 700, color: "var(--text-main)", verticalAlign: "middle", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        ₹ {getTakeawayOrderTotal(order).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td style={{ padding: "0.44rem 0.45rem", borderBottom: "1px solid var(--border-card)", verticalAlign: "middle", whiteSpace: "nowrap" }}>
                        {renderStatusBadge(order.status)}
                      </td>
                      <td style={{ padding: "0.44rem 0.45rem", borderBottom: "1px solid var(--border-card)", color: "var(--text-muted)", fontSize: "0.76rem", verticalAlign: "middle", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {order.orderTime}
                      </td>
                      <td onClick={(e) => e.stopPropagation()} style={{ padding: "0.65rem 0.45rem", borderBottom: "1px solid var(--border-card)", textAlign: "right", verticalAlign: "middle", whiteSpace: "nowrap" }}>
                        <div style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem" }}>
                          {/* View bill & print invoice */}
                          <button
                            type="button"
                            onClick={() => handleViewOrder(order)}
                            title="View order details"
                            style={{
                              width: "32px",
                              height: "32px",
                              borderRadius: "8px",
                              border: "1px solid var(--border-card)",
                              background: "transparent",
                              color: "var(--text-main)",
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              transition: "background 0.15s ease",
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(100, 116, 139, 0.08)")}
                            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                          >
                            <Eye size={15} />
                          </button>

                          {/* Print receipt */}
                          <button
                            type="button"
                            onClick={() => handlePrintInvoice(order)}
                            title="Print bill / tax invoice"
                            style={{
                              width: "32px",
                              height: "32px",
                              borderRadius: "8px",
                              border: "1px solid var(--border-card)",
                              background: "transparent",
                              color: "var(--text-main)",
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              transition: "background 0.15s ease",
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(100, 116, 139, 0.08)")}
                            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                          >
                            <Printer size={15} />
                          </button>

                          {/* More Options / Status changer */}
                          <div className="action-menu-container" style={{ position: "relative" }}>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (actionMenuOrderId === order.id) {
                                  setActionMenuOrderId(null);
                                  setActionMenuOpenAbove(false);
                                } else {
                                  const buttonRect = e.currentTarget.getBoundingClientRect();
                                  const scrollAreaRect = e.currentTarget.closest(".takeaway-orders-scroll")?.getBoundingClientRect();
                                  const menuHeight = 220;
                                  setActionMenuOpenAbove(
                                    Boolean(
                                      scrollAreaRect &&
                                      scrollAreaRect.bottom - buttonRect.bottom < menuHeight &&
                                      buttonRect.top - scrollAreaRect.top > menuHeight
                                    )
                                  );
                                  setActionMenuOrderId(order.id);
                                }
                              }}
                              title="Order actions"
                              style={{
                                width: "32px",
                                height: "32px",
                                borderRadius: "8px",
                                border: "1px solid var(--border-card)",
                                background: actionMenuOrderId === order.id ? "rgba(234, 88, 12, 0.12)" : "transparent",
                                color: actionMenuOrderId === order.id ? "#ea580c" : "var(--text-main)",
                                cursor: "pointer",
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                            >
                              <MoreHorizontal size={15} />
                            </button>

                            {actionMenuOrderId === order.id && (
                              <div
                                style={{
                                  position: "absolute",
                                  right: 0,
                                  top: actionMenuOpenAbove ? "auto" : "calc(100% + 4px)",
                                  bottom: actionMenuOpenAbove ? "calc(100% + 4px)" : "auto",
                                  background: "var(--bg-card)",
                                  border: "1px solid var(--border-card)",
                                  borderRadius: "10px",
                                  boxShadow: "0 10px 25px rgba(0, 0, 0, 0.2)",
                                  padding: "0.35rem",
                                  zIndex: 50,
                                  minWidth: "175px",
                                  display: "flex",
                                  flexDirection: "column",
                                  gap: "0.2rem",
                                  textAlign: "left",
                                }}
                              >
                                {order.status === "Pending" && (
                                  <button
                                    type="button"
                                    onClick={() => updateOrderStatus(order.id, "Preparing")}
                                    style={{
                                      textAlign: "left",
                                      padding: "0.5rem 0.75rem",
                                      borderRadius: "6px",
                                      border: "none",
                                      background: "transparent",
                                      color: "#2563eb",
                                      fontSize: "0.8rem",
                                      fontWeight: 600,
                                      cursor: "pointer",
                                      display: "flex",
                                      alignItems: "center",
                                      gap: "0.45rem",
                                    }}
                                  >
                                    <ChefHat size={14} /> Mark as Preparing
                                  </button>
                                )}
                                {(order.status === "Pending" || order.status === "Preparing") && (
                                  <button
                                    type="button"
                                    onClick={() => updateOrderStatus(order.id, "Ready")}
                                    style={{
                                      textAlign: "left",
                                      padding: "0.5rem 0.75rem",
                                      borderRadius: "6px",
                                      border: "none",
                                      background: "transparent",
                                      color: "#9333ea",
                                      fontSize: "0.8rem",
                                      fontWeight: 600,
                                      cursor: "pointer",
                                      display: "flex",
                                      alignItems: "center",
                                      gap: "0.45rem",
                                    }}
                                  >
                                    <Bell size={14} /> Mark as Ready
                                  </button>
                                )}
                                {order.status !== "Completed" && order.status !== "Cancelled" && (
                                  <button
                                    type="button"
                                    onClick={() => updateOrderStatus(order.id, "Completed")}
                                    style={{
                                      textAlign: "left",
                                      padding: "0.5rem 0.75rem",
                                      borderRadius: "6px",
                                      border: "none",
                                      background: "transparent",
                                      color: "#16a34a",
                                      fontSize: "0.8rem",
                                      fontWeight: 600,
                                      cursor: "pointer",
                                      display: "flex",
                                      alignItems: "center",
                                      gap: "0.45rem",
                                    }}
                                  >
                                    <CheckCircle2 size={14} /> Mark as Completed
                                  </button>
                                )}
                                {order.status !== "Cancelled" && (
                                  <button
                                    type="button"
                                    onClick={() => updateOrderStatus(order.id, "Cancelled")}
                                    style={{
                                      textAlign: "left",
                                      padding: "0.5rem 0.75rem",
                                      borderRadius: "6px",
                                      border: "none",
                                      background: "transparent",
                                      color: "#dc2626",
                                      fontSize: "0.8rem",
                                      fontWeight: 600,
                                      cursor: "pointer",
                                      display: "flex",
                                      alignItems: "center",
                                      gap: "0.45rem",
                                    }}
                                  >
                                    <XCircle size={14} /> Cancel Order
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ── Bottom Pagination Bar ─────────────────────────── */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0.9rem 1.25rem",
            borderTop: "1px solid var(--border-card)",
            fontSize: "0.84rem",
            color: "var(--text-muted)",
            flexWrap: "wrap",
            gap: "0.75rem",
          }}
        >
          <div>
            Showing{" "}
            <span style={{ fontWeight: 700, color: "var(--text-main)" }}>
              {filteredOrders.length > 0 ? (safePage - 1) * pageSize + 1 : 0}
            </span>{" "}
            –{" "}
            <span style={{ fontWeight: 700, color: "var(--text-main)" }}>
              {Math.min(safePage * pageSize, filteredOrders.length)}
            </span>{" "}
            of{" "}
            <span style={{ fontWeight: 700, color: "var(--text-main)" }}>
              {filteredOrders.length}
            </span>{" "}
            orders
          </div>

          {/* Pagination buttons */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
            <button
              type="button"
              disabled={safePage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              style={{
                width: "34px",
                height: "34px",
                borderRadius: "8px",
                border: "1px solid var(--border-card)",
                background: "var(--bg-card)",
                color: safePage <= 1 ? "var(--text-muted)" : "var(--text-main)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: safePage <= 1 ? "not-allowed" : "pointer",
                opacity: safePage <= 1 ? 0.4 : 1,
              }}
            >
              <ChevronLeft size={16} />
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((p) => p === 1 || p === totalPages || Math.abs(p - safePage) <= 1)
              .reduce((acc, p, index, arr) => {
                if (index > 0 && p - arr[index - 1] > 1) {
                  acc.push("...");
                }
                acc.push(p);
                return acc;
              }, [])
              .map((pageItem, pIdx) => {
                if (pageItem === "...") {
                  return (
                    <span key={`dots-${pIdx}`} style={{ padding: "0 0.35rem", color: "var(--text-muted)" }}>
                      ...
                    </span>
                  );
                }
                const isSelected = pageItem === safePage;
                return (
                  <button
                    key={pageItem}
                    type="button"
                    onClick={() => setCurrentPage(pageItem)}
                    style={{
                      width: "34px",
                      height: "34px",
                      borderRadius: "8px",
                      border: isSelected ? "none" : "1px solid var(--border-card)",
                      background: isSelected
                        ? "linear-gradient(135deg, #f97316 0%, #ea580c 100%)"
                        : "var(--bg-card)",
                      color: isSelected ? "#fff" : "var(--text-main)",
                      fontWeight: isSelected ? 700 : 500,
                      fontSize: "0.84rem",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      boxShadow: isSelected ? "0 2px 6px rgba(234, 88, 12, 0.3)" : "none",
                    }}
                  >
                    {pageItem}
                  </button>
                );
              })}

            <button
              type="button"
              disabled={safePage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              style={{
                width: "34px",
                height: "34px",
                borderRadius: "8px",
                border: "1px solid var(--border-card)",
                background: "var(--bg-card)",
                color: safePage >= totalPages ? "var(--text-muted)" : "var(--text-main)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: safePage >= totalPages ? "not-allowed" : "pointer",
                opacity: safePage >= totalPages ? 0.4 : 1,
              }}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* ── MODAL 1: + New Takeaway Order ────────────────────── */}
      {isNewOrderModalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "var(--modal-overlay, rgba(0, 0, 0, 0.45))",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "1rem",
          }}
        >
          <div
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border-card)",
              borderRadius: "18px",
              width: "100%",
              maxWidth: "860px",
              maxHeight: "90vh",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 25px 60px rgba(0, 0, 0, 0.25)",
              overflow: "hidden",
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: "1.1rem 1.6rem",
                borderBottom: "1px solid var(--border-card)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <div
                  style={{
                    width: "40px",
                    height: "40px",
                    borderRadius: "10px",
                    background: "rgba(234, 88, 12, 0.12)",
                    color: "#ea580c",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Plus size={22} strokeWidth={2.5} />
                </div>
                <div>
                  <h2 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 700, color: "var(--text-main)" }}>
                    New Takeaway Order
                  </h2>
                  <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--text-muted)" }}>
                    Create and dispatch a new customer pickup order
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsNewOrderModalOpen(false)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--text-muted)",
                  cursor: "pointer",
                  padding: "0.4rem",
                  borderRadius: "8px",
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body: 2 Columns */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1.15fr 1fr",
                overflowY: "auto",
                flex: 1,
              }}
            >
              {/* Left Column: Menu Items Selection */}
              <div style={{ padding: "1.4rem", borderRight: "1px solid var(--border-card)" }}>
                <div style={{ fontWeight: 700, fontSize: "0.88rem", marginBottom: "0.75rem" }}>
                  Select Dishes from Menu
                </div>

                {/* Dish search */}
                <div style={{ position: "relative", marginBottom: "0.85rem" }}>
                  <Search
                    size={15}
                    style={{
                      position: "absolute",
                      left: "0.75rem",
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: "var(--text-muted)",
                    }}
                  />
                  <input
                    type="text"
                    placeholder="Search dish name..."
                    value={itemSearchQuery}
                    onChange={(e) => setItemSearchQuery(e.target.value)}
                    style={{
                      width: "100%",
                      height: "38px",
                      padding: "0 0.75rem 0 2.2rem",
                      borderRadius: "8px",
                      border: "1px solid var(--border-card)",
                      background: "var(--bg-main)",
                      color: "var(--text-main)",
                      fontSize: "0.82rem",
                      boxSizing: "border-box",
                      outline: "none",
                    }}
                  />
                </div>

                <select
                  value={itemCategoryFilter}
                  onChange={(e) => setItemCategoryFilter(e.target.value)}
                  style={{ width: "100%", height: "38px", marginBottom: "0.75rem", padding: "0 0.7rem", borderRadius: "8px", border: "1px solid var(--border-card)", background: "var(--bg-main)", color: "var(--text-main)", fontSize: "0.82rem" }}
                >
                  <option value="all">All categories</option>
                  {takeawayCategories.map((category) => {
                    const name = category.name || category.categoryName;
                    return name ? <option key={category.categoryId || name} value={name}>{name}</option> : null;
                  })}
                </select>

                {/* Dishes list */}
                <div
                  style={{
                    maxHeight: "350px",
                    overflowY: "auto",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.5rem",
                  }}
                >
                  {menuLoading ? <div style={{ padding: "1rem", color: "var(--text-muted)" }}>Loading menu…</div> : availableFoodItems.length === 0 ? <div style={{ padding: "1rem", color: "var(--text-muted)" }}>No dishes found.</div> : availableFoodItems.slice(0, 35).map((dish) => {
                    const dishId = dish.id || dish.menuItemId || dish.name;
                    const inCart = newOrderCart[dishId]?.quantity || 0;
                    return (
                      <div
                        key={dishId}
                        style={{
                          padding: "0.6rem 0.85rem",
                          borderRadius: "10px",
                          border: "1px solid var(--border-card)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          background: inCart > 0 ? "rgba(234, 88, 12, 0.06)" : "var(--bg-main)",
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 600, fontSize: "0.84rem", color: "var(--text-main)" }}>
                            {dish.name}
                          </div>
                          <div style={{ fontSize: "0.78rem", color: "#16a34a", fontWeight: 700, marginTop: "0.1rem" }}>
                            ₹ {Number(dish.price).toFixed(2)}
                          </div>
                        </div>

                        {inCart > 0 ? (
                          <div style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
                            <button
                              type="button"
                              onClick={() => removeCartItem(dish)}
                              style={{
                                width: "26px",
                                height: "26px",
                                borderRadius: "6px",
                                border: "1px solid var(--border-card)",
                                background: "var(--bg-card)",
                                color: "var(--text-main)",
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontWeight: 700,
                              }}
                            >
                              -
                            </button>
                            <span style={{ fontSize: "0.84rem", fontWeight: 700, minWidth: "18px", textAlign: "center" }}>
                              {inCart}
                            </span>
                            <button
                              type="button"
                              onClick={() => addCartItem(dish)}
                              style={{
                                width: "26px",
                                height: "26px",
                                borderRadius: "6px",
                                border: "none",
                                background: "#ea580c",
                                color: "#fff",
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontWeight: 700,
                              }}
                            >
                              +
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => addCartItem(dish)}
                            style={{
                              padding: "0.35rem 0.75rem",
                              borderRadius: "6px",
                              border: "1px solid rgba(234, 88, 12, 0.4)",
                              background: "rgba(234, 88, 12, 0.1)",
                              color: "#ea580c",
                              fontSize: "0.78rem",
                              fontWeight: 600,
                              cursor: "pointer",
                            }}
                          >
                            + Add
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right Column: Customer Details & Order Cart */}
              <div
                style={{
                  padding: "1.4rem",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.95rem",
                }}
              >
                <div style={{ fontWeight: 700, fontSize: "0.88rem" }}>Customer & Order Info</div>

                {/* Customer Name */}
                <div>
                  <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: "0.3rem" }}>
                    Customer Name *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Ramesh Kumar"
                    value={newCustomerName}
                    onChange={(e) => setNewCustomerName(e.target.value)}
                    style={{
                      width: "100%",
                      height: "38px",
                      padding: "0 0.85rem",
                      borderRadius: "8px",
                      border: "1px solid var(--border-card)",
                      background: "var(--bg-main)",
                      color: "var(--text-main)",
                      fontSize: "0.84rem",
                      boxSizing: "border-box",
                      outline: "none",
                    }}
                  />
                </div>

                {/* Customer Phone */}
                <div>
                  <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: "0.3rem" }}>
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    required
                    aria-label="Phone number (required)"
                    aria-invalid={Boolean(customerPhoneError)}
                    aria-describedby={customerPhoneError ? "takeaway-phone-error" : undefined}
                    placeholder="e.g. +91 98450 11223"
                    value={newCustomerPhone}
                    onChange={(e) => {
                      setNewCustomerPhone(e.target.value);
                      if (customerPhoneError && isValidIndianMobileNumber(e.target.value)) {
                        setCustomerPhoneError("");
                      }
                    }}
                    onBlur={() => {
                      if (newCustomerPhone.trim() && !isValidIndianMobileNumber(newCustomerPhone)) {
                        setCustomerPhoneError("Enter a valid 10-digit Indian mobile number.");
                      }
                    }}
                    style={{
                      width: "100%",
                      height: "38px",
                      padding: "0 0.85rem",
                      borderRadius: "8px",
                      border: `1px solid ${customerPhoneError ? "#dc2626" : "var(--border-card)"}`,
                      background: "var(--bg-main)",
                      color: "var(--text-main)",
                      fontSize: "0.84rem",
                      boxSizing: "border-box",
                      outline: "none",
                    }}
                  />
                  {customerPhoneError && (
                    <div id="takeaway-phone-error" role="alert" style={{ marginTop: "0.3rem", color: "#dc2626", fontSize: "0.74rem" }}>
                      {customerPhoneError}
                    </div>
                  )}
                </div>

                {/* Selected Items summary */}
                <div>
                  <div style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-muted)", marginBottom: "0.35rem" }}>
                    Selected Items ({cartItemsList.length})
                  </div>
                  <div
                    style={{
                      background: "var(--bg-main)",
                      border: "1px solid var(--border-card)",
                      borderRadius: "8px",
                      padding: "0.65rem 0.85rem",
                      maxHeight: "125px",
                      overflowY: "auto",
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.35rem",
                    }}
                  >
                    {cartItemsList.length === 0 ? (
                      <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", textAlign: "center", padding: "0.6rem" }}>
                        No items added yet. Click + Add on the left.
                      </div>
                    ) : (
                      cartItemsList.map((line) => (
                        <div
                          key={line.item.id || line.item.name}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            fontSize: "0.82rem",
                          }}
                        >
                          <span>
                            {line.item.name} × {line.quantity}
                          </span>
                          <span style={{ fontWeight: 700 }}>
                            ₹ {((Number(line.item.price) || 0) * line.quantity).toFixed(2)}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Bill Totals */}
                <div
                  style={{
                    background: "var(--bg-main)",
                    borderRadius: "10px",
                    padding: "0.85rem 1rem",
                    border: "1px solid var(--border-card)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.3rem",
                    fontSize: "0.84rem",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontWeight: 800,
                      fontSize: "1.05rem",
                      color: "#16a34a",
                    }}
                  >
                    <span>Total Amount:</span>
                    <span>₹ {cartSubtotal.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div
              style={{
                padding: "1rem 1.6rem",
                borderTop: "1px solid var(--border-card)",
                display: "flex",
                justifyContent: "flex-end",
                gap: "0.75rem",
              }}
            >
              <button
                type="button"
                onClick={() => setIsNewOrderModalOpen(false)}
                style={{
                  padding: "0.6rem 1.25rem",
                  borderRadius: "8px",
                  border: "1px solid var(--border-card)",
                  background: "transparent",
                  color: "var(--text-main)",
                  fontSize: "0.84rem",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateTakeawayOrder}
                style={{
                  padding: "0.6rem 1.45rem",
                  borderRadius: "8px",
                  border: "none",
                  background: "linear-gradient(135deg, #f97316 0%, #ea580c 100%)",
                  color: "#fff",
                  fontSize: "0.84rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  boxShadow: "0 2px 8px rgba(234, 88, 12, 0.3)",
                }}
              >
                Create Takeaway Order
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 2: Order Details (Eye Icon) ────────────────── */}
      {selectedOrderDetails && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "var(--modal-overlay, rgba(0, 0, 0, 0.45))",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "1rem",
          }}
        >
          <div
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border-card)",
              borderRadius: "18px",
              width: "100%",
              maxWidth: "580px",
              maxHeight: "85vh",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 25px 60px rgba(0, 0, 0, 0.25)",
              overflow: "hidden",
            }}
          >
            {/* Header */}
            <div
              style={{
                padding: "1.1rem 1.4rem",
                borderBottom: "1px solid var(--border-card)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexShrink: 0,
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 700, color: "var(--text-main)", lineHeight: 1.2 }}>
                  Takeaway Order #{selectedOrderDetails.orderNumber || selectedOrderDetails.id}
                </h3>
                <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", fontSize: "0.82rem", color: "var(--text-muted)", marginTop: "0.2rem" }}>
                  <Clock size={13} />
                  <span>{selectedOrderDetails.orderTime}</span>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <button
                  type="button"
                  onClick={() => {
                    setPrintReceiptOrder(selectedOrderDetails);
                    setSelectedOrderDetails(null);
                  }}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.4rem",
                    padding: "0.42rem 0.85rem",
                    borderRadius: "8px",
                    border: "1px solid #ea580c",
                    background: "rgba(234, 88, 12, 0.08)",
                    color: "#ea580c",
                    fontSize: "0.8rem",
                    fontWeight: 700,
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                >
                  <Printer size={14} /> View / Print Bill
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedOrderDetails(null)}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "var(--text-muted)",
                    cursor: "pointer",
                    padding: "0.45rem",
                    borderRadius: "8px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div style={{ padding: "1.2rem 1.4rem", display: "flex", flexDirection: "column", gap: "0.95rem", overflowY: "auto", flex: "1 1 auto", minHeight: 0, maxHeight: "calc(85vh - 130px)" }}>
              {/* Customer and Order Summary Banner */}
              <div
                style={{
                  background: "var(--bg-main)",
                  padding: "0.95rem 1.25rem",
                  borderRadius: "12px",
                  border: "1px solid var(--border-card)",
                  display: "grid",
                  gridTemplateColumns: "1.2fr 1.2fr 1fr",
                  gap: "0.75rem",
                  alignItems: "center",
                }}
              >
                <div>
                  <div style={{ fontSize: "0.76rem", color: "var(--text-muted)", fontWeight: 600, display: "flex", alignItems: "center", gap: "0.3rem" }}>
                    <User size={13} /> Customer
                  </div>
                  <div style={{ fontWeight: 700, fontSize: "0.92rem", color: "var(--text-main)", marginTop: "0.15rem" }}>
                    {selectedOrderDetails.customer}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: "0.76rem", color: "var(--text-muted)", fontWeight: 600, display: "flex", alignItems: "center", gap: "0.3rem" }}>
                    <Phone size={13} /> Phone
                  </div>
                  <div style={{ fontWeight: 700, fontSize: "0.88rem", color: "var(--text-main)", marginTop: "0.15rem" }}>
                    {selectedOrderDetails.phone}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: "0.76rem", color: "var(--text-muted)", fontWeight: 600, marginBottom: "0.2rem" }}>
                    Status
                  </div>
                  <div>
                    {renderStatusBadge(selectedOrderDetails.status)}
                  </div>
                </div>
              </div>

              {/* Items Ordered Table */}
              <div>
                <div style={{ fontWeight: 700, fontSize: "0.88rem", marginBottom: "0.5rem" }}>
                  Items Ordered
                </div>
                <div
                  style={{
                    border: "1px solid var(--border-card)",
                    borderRadius: "10px",
                    overflow: "hidden",
                  }}
                >
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
                    <tbody>
                      {(selectedOrderDetails.items || []).map((it, idx) => (
                        <tr
                          key={idx}
                          style={{
                            borderBottom:
                              idx < (selectedOrderDetails.items?.length || 0) - 1
                                ? "1px solid var(--border-card)"
                                : "none",
                          }}
                        >
                          <td style={{ padding: "0.75rem 1rem", color: "var(--text-main)", fontWeight: 600 }}>
                            {it.name} <span style={{ color: "var(--text-muted)", fontWeight: 500 }}>× {it.quantity}</span>
                          </td>
                          <td style={{ padding: "0.75rem 1rem", textAlign: "right", fontWeight: 700, color: "var(--text-main)" }}>
                            ₹ {((Number(it.price) || 0) * (it.quantity || 1)).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Total Bill Amount (Matching Reference Image) */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "0.95rem 1.25rem",
                  background: "rgba(34, 197, 94, 0.08)",
                  borderRadius: "12px",
                  border: "1px solid rgba(34, 197, 94, 0.25)",
                }}
              >
                <span style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--text-main)" }}>
                  Total Bill Amount:
                </span>
                <span style={{ fontSize: "1.35rem", fontWeight: 800, color: "#16a34a", letterSpacing: "-0.01em" }}>
                  ₹ {getTakeawayOrderTotal(selectedOrderDetails).toFixed(2)}
                </span>
              </div>

              {/* Notes */}
              {selectedOrderDetails.notes && (
                <div
                  style={{
                    fontSize: "0.82rem",
                    color: "var(--text-muted)",
                    padding: "0.65rem 0.95rem",
                    borderRadius: "8px",
                    background: "var(--bg-main)",
                    border: "1px solid var(--border-card)",
                  }}
                >
                  <strong style={{ color: "var(--text-main)" }}>Notes:</strong> {selectedOrderDetails.notes}
                </div>
              )}

              {/* Status Change Quick Actions */}
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap", paddingTop: "0.2rem" }}>
                <span style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-muted)", marginRight: "0.3rem" }}>
                  Quick Status:
                </span>
                {selectedOrderDetails.status === "Pending" && (
                  <button
                    type="button"
                    onClick={() => updateOrderStatus(selectedOrderDetails.id, "Preparing")}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.35rem",
                      padding: "0.35rem 0.75rem",
                      borderRadius: "6px",
                      border: "1px solid rgba(59, 130, 246, 0.4)",
                      background: "rgba(59, 130, 246, 0.1)",
                      color: "#2563eb",
                      fontSize: "0.78rem",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    <ChefHat size={13} /> Start Preparing
                  </button>
                )}
                {(selectedOrderDetails.status === "Pending" || selectedOrderDetails.status === "Preparing") && (
                  <button
                    type="button"
                    onClick={() => updateOrderStatus(selectedOrderDetails.id, "Ready")}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.35rem",
                      padding: "0.35rem 0.75rem",
                      borderRadius: "6px",
                      border: "1px solid rgba(168, 85, 247, 0.4)",
                      background: "rgba(168, 85, 247, 0.1)",
                      color: "#9333ea",
                      fontSize: "0.78rem",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    <Bell size={13} /> Mark as Ready
                  </button>
                )}
                {selectedOrderDetails.status !== "Completed" && selectedOrderDetails.status !== "Cancelled" && (
                  <button
                    type="button"
                    onClick={() => updateOrderStatus(selectedOrderDetails.id, "Completed")}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.35rem",
                      padding: "0.35rem 0.75rem",
                      borderRadius: "6px",
                      border: "1px solid rgba(34, 197, 94, 0.4)",
                      background: "rgba(34, 197, 94, 0.1)",
                      color: "#16a34a",
                      fontSize: "0.78rem",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    <CheckCircle2 size={13} /> Complete Order
                  </button>
                )}
                {selectedOrderDetails.status !== "Cancelled" && (
                  <button
                    type="button"
                    onClick={() => updateOrderStatus(selectedOrderDetails.id, "Cancelled")}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.35rem",
                      padding: "0.35rem 0.75rem",
                      borderRadius: "6px",
                      border: "1px solid rgba(239, 68, 68, 0.4)",
                      background: "rgba(239, 68, 68, 0.1)",
                      color: "#dc2626",
                      fontSize: "0.78rem",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    <XCircle size={13} /> Cancel
                  </button>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div
              style={{
                padding: "1.1rem 1.5rem",
                borderTop: "1px solid var(--border-card)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexShrink: 0,
              }}
            >
              <button
                type="button"
                onClick={() => {
                  setPrintReceiptOrder(selectedOrderDetails);
                  setSelectedOrderDetails(null);
                }}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.45rem",
                  padding: "0.6rem 1.15rem",
                  borderRadius: "8px",
                  border: "1px solid var(--border-card)",
                  background: "transparent",
                  color: "var(--text-main)",
                  fontSize: "0.84rem",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                <Printer size={16} /> Print Receipt
              </button>

              <button
                type="button"
                onClick={() => setSelectedOrderDetails(null)}
                style={{
                  padding: "0.6rem 1.5rem",
                  borderRadius: "8px",
                  border: "none",
                  background: "#ea580c",
                  color: "#fff",
                  fontSize: "0.84rem",
                  fontWeight: 700,
                  cursor: "pointer",
                  boxShadow: "0 2px 8px rgba(234, 88, 12, 0.3)",
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 3: Tax Invoice & Bill Print (ReceiptModal) ─────────────────── */}
      {receiptTableData && (
        <ReceiptModal
          table={receiptTableData}
          restaurantSettings={effectiveSettings}
          onClose={() => setPrintReceiptOrder(null)}
        />
      )}
    </div>
  );
}
