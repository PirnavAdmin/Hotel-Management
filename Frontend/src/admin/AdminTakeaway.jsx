import React, { useState, useEffect, useMemo, useRef } from "react";
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
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Flame,
  Soup,
  Sparkles,
} from "lucide-react";
import {
  apiGetTakeawayOrders,
  apiGetTakeawayOrderHistory,
  apiCreatePaidTakeawayOrder,
  apiSendTakeawayOrderToKitchen,
  apiDispatchTakeawayOrder,
  apiCancelTakeawayOrder,
} from "../api/orderApi";

const STORAGE_KEY_TAKEAWAY = "avsr_admin_takeaway_orders_v1";

// Initial seed orders matching user's reference mockup
const SEED_TAKEAWAY_ORDERS = [
  {
    id: "TK-1068",
    orderNumber: "TK-1068",
    customer: "Ramesh K.",
    phone: "+91 98450 11223",
    itemsCount: 4,
    items: [
      { name: "Chicken Biryani", quantity: 2, price: 380 },
      { name: "Butter Naan", quantity: 4, price: 60 },
      { name: "Paneer Tikka", quantity: 1, price: 280 },
    ],
    amount: 1280.0,
    status: "Pending",
    orderTime: "14 Oct 2026, 11:10 AM",
    date: "2026-10-14T11:10:00",
    paymentMethod: "UPI",
    notes: "Extra spicy, pack gravy separately",
  },
  {
    id: "TK-1067",
    orderNumber: "TK-1067",
    customer: "Priya S.",
    phone: "+91 99451 66788",
    itemsCount: 3,
    items: [
      { name: "Veg Fried Rice", quantity: 2, price: 260 },
      { name: "Veg Manchurian", quantity: 1, price: 240 },
    ],
    amount: 760.0,
    status: "Preparing",
    orderTime: "14 Oct 2026, 10:55 AM",
    date: "2026-10-14T10:55:00",
    paymentMethod: "Card",
    notes: "No onion, no garlic",
  },
  {
    id: "TK-1066",
    orderNumber: "TK-1066",
    customer: "Vikram R.",
    phone: "+91 90085 33445",
    itemsCount: 5,
    items: [
      { name: "Mutton Dum Biryani", quantity: 2, price: 490 },
      { name: "Tandoori Chicken (Half)", quantity: 1, price: 360 },
      { name: "Garlic Naan", quantity: 4, price: 80 },
      { name: "Gulab Jamun", quantity: 4, price: 170 },
    ],
    amount: 2340.0,
    status: "Ready",
    orderTime: "14 Oct 2026, 10:35 AM",
    date: "2026-10-14T10:35:00",
    paymentMethod: "UPI",
    notes: "Customer waiting at counter",
  },
  {
    id: "TK-1065",
    orderNumber: "TK-1065",
    customer: "Karthik M.",
    phone: "+91 78902 55661",
    itemsCount: 2,
    items: [
      { name: "Paneer Butter Masala", quantity: 1, price: 320 },
      { name: "Butter Roti", quantity: 4, price: 40 },
    ],
    amount: 480.0,
    status: "Completed",
    orderTime: "14 Oct 2026, 10:20 AM",
    date: "2026-10-14T10:20:00",
    paymentMethod: "Cash",
    notes: "",
  },
  {
    id: "TK-1064",
    orderNumber: "TK-1064",
    customer: "Ananya P.",
    phone: "+91 96060 99887",
    itemsCount: 6,
    items: [
      { name: "Chicken Tikka Masala", quantity: 2, price: 390 },
      { name: "Jeera Rice", quantity: 2, price: 220 },
      { name: "Butter Naan", quantity: 6, price: 60 },
      { name: "Rasmalai", quantity: 2, price: 100 },
    ],
    amount: 1960.0,
    status: "Completed",
    orderTime: "14 Oct 2026, 09:50 AM",
    date: "2026-10-14T09:50:00",
    paymentMethod: "UPI",
    notes: "Double paper bag packing please",
  },
  {
    id: "TK-1063",
    orderNumber: "TK-1063",
    customer: "Suresh D.",
    phone: "+91 99804 22110",
    itemsCount: 3,
    items: [
      { name: "Chicken 65", quantity: 2, price: 310 },
      { name: "Veg Noodles", quantity: 1, price: 240 },
    ],
    amount: 920.0,
    status: "Cancelled",
    orderTime: "14 Oct 2026, 09:30 AM",
    date: "2026-10-14T09:30:00",
    paymentMethod: "UPI",
    notes: "Customer cancelled due to emergency",
  },
  {
    id: "TK-1062",
    orderNumber: "TK-1062",
    customer: "Divya N.",
    phone: "+91 94810 77550",
    itemsCount: 4,
    items: [
      { name: "Dal Makhani", quantity: 1, price: 280 },
      { name: "Kadai Paneer", quantity: 1, price: 340 },
      { name: "Tandoori Roti", quantity: 6, price: 35 },
      { name: "Gulab Jamun", quantity: 4, price: 170 },
    ],
    amount: 1360.0,
    status: "Completed",
    orderTime: "14 Oct 2026, 09:05 AM",
    date: "2026-10-14T09:05:00",
    paymentMethod: "Card",
    notes: "",
  },
  {
    id: "TK-1061",
    orderNumber: "TK-1061",
    customer: "Manoj T.",
    phone: "+91 97422 88990",
    itemsCount: 2,
    items: [
      { name: "Egg Fried Rice", quantity: 1, price: 260 },
      { name: "Chilli Chicken", quantity: 1, price: 260 },
    ],
    amount: 520.0,
    status: "Completed",
    orderTime: "14 Oct 2026, 08:45 AM",
    date: "2026-10-14T08:45:00",
    paymentMethod: "Cash",
    notes: "Medium spicy",
  },
];

// Helper to generate seed history to reach the mockup numbers (86 total, ₹74,320.00 sales, 78 completed, 8 pending/active, 2 cancelled)
function generateExpandedSeedOrders() {
  const list = [...SEED_TAKEAWAY_ORDERS];
  const names = [
    "Arun K.", "Deepa M.", "Kiran B.", "Sanjay V.", "Meera S.", "Naveen P.",
    "Swathi R.", "Pooja G.", "Harish T.", "Sneha L.", "Vijay C.", "Rohit K.",
    "Bhavya S.", "Rajesh M.", "Snehal P.", "Girish D.", "Aishwarya K.", "Sunil R."
  ];
  const dishes = [
    { name: "Chicken Biryani", price: 380 },
    { name: "Mutton Dum Biryani", price: 490 },
    { name: "Paneer Butter Masala", price: 320 },
    { name: "Dal Tadka", price: 220 },
    { name: "Butter Naan", price: 60 },
    { name: "Tandoori Roti", price: 35 },
    { name: "Veg Fried Rice", price: 250 },
    { name: "Chicken 65", price: 310 },
    { name: "Gulab Jamun", price: 150 },
  ];

  let currentSales = list
    .filter((o) => o.status === "Completed")
    .reduce((sum, o) => sum + o.amount, 0);

  const targetTotal = 86;
  const targetCompleted = 78;
  const currentCompleted = list.filter((o) => o.status === "Completed").length;
  const neededCompleted = targetCompleted - currentCompleted;

  for (let i = 1; i <= neededCompleted; i++) {
    const num = 1060 - i;
    const name = names[i % names.length];
    const dish1 = dishes[i % dishes.length];
    const dish2 = dishes[(i + 3) % dishes.length];
    const amount = dish1.price + dish2.price * 2;
    currentSales += amount;

    const day = Math.max(1, 14 - Math.floor(i / 6));
    const dayStr = String(day).padStart(2, "0");
    const hour = 12 + (i % 9);
    const minute = (i * 7) % 60;
    const timeStr = `${dayStr} Oct 2026, ${String(hour > 12 ? hour - 12 : hour).padStart(2, "0")}:${String(minute).padStart(2, "0")} ${hour >= 12 ? "PM" : "AM"}`;

    list.push({
      id: `TK-${num}`,
      orderNumber: `TK-${num}`,
      customer: name,
      phone: `+91 98${String(10000000 + i * 2311).slice(0, 8)}`,
      itemsCount: 3,
      items: [
        { name: dish1.name, quantity: 1, price: dish1.price },
        { name: dish2.name, quantity: 2, price: dish2.price },
      ],
      amount: amount,
      status: "Completed",
      orderTime: timeStr,
      date: `2026-10-${dayStr}T14:00:00`,
      paymentMethod: i % 2 === 0 ? "UPI" : "Cash",
      notes: "",
    });
  }

  return list;
}

export function AdminTakeaway({
  menuItems = [],
  restaurantName = "Bhanu Fine Dining & POS Management",
  restaurantSettings = {},
  currentSession = null,
}) {
  // --- Persistent & Live Orders State ---
  const [orders, setOrders] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_TAKEAWAY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return generateExpandedSeedOrders();
  });

  // Save changes to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_TAKEAWAY, JSON.stringify(orders));
    } catch {}
  }, [orders]);

  // Fetch live active takeaway orders from backend API
  const [isRefreshing, setIsRefreshing] = useState(false);
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const [activeResult, historyResult] = await Promise.all([
        apiGetTakeawayOrders().catch(() => null),
        apiGetTakeawayOrderHistory().catch(() => null),
      ]);

      const backendOrders = [];
      if (activeResult?.success && Array.isArray(activeResult.data)) {
        activeResult.data.forEach((bo) => {
          backendOrders.push({
            id: String(bo.orderNumber || bo.id || `TK-${bo.id}`),
            orderNumber: String(bo.orderNumber || bo.id || `TK-${bo.id}`),
            customer: bo.customerName || bo.customer || "Walk-in Guest",
            phone: bo.customerPhone || bo.phone || "—",
            itemsCount: Array.isArray(bo.items) ? bo.items.reduce((s, it) => s + (it.quantity || 1), 0) : 1,
            items: Array.isArray(bo.items) ? bo.items : [],
            amount: Number(bo.totalAmount || bo.grandTotal || bo.amount || 0),
            status: bo.status ? bo.status.charAt(0).toUpperCase() + bo.status.slice(1).toLowerCase() : "Pending",
            orderTime: bo.orderTime || new Date(bo.date || Date.now()).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
            date: bo.date || new Date().toISOString(),
            paymentMethod: bo.paymentMethod || "UPI",
            notes: bo.notes || "",
          });
        });
      }

      if (backendOrders.length > 0) {
        setOrders((prev) => {
          const ids = new Set(backendOrders.map((b) => b.id));
          const preserved = prev.filter((p) => !ids.has(p.id));
          return [...backendOrders, ...preserved];
        });
      }
    } catch (err) {
      console.warn("Could not sync live takeaway orders:", err);
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  // --- Filtering & Tab State ---
  const [activeTabStatus, setActiveTabStatus] = useState("all"); // 'all', 'Pending', 'Preparing', 'Ready', 'Completed', 'Cancelled'
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState("all"); // 'all', 'today', 'yesterday', '7days', 'month'
  const [secondaryStatusFilter, setSecondaryStatusFilter] = useState("all");
  const [dateDropdownOpen, setDateDropdownOpen] = useState(false);
  const [dateRangeLabel, setDateRangeLabel] = useState("01 Oct 2026 – 14 Oct 2026");

  // --- Modals State ---
  const [isNewOrderModalOpen, setIsNewOrderModalOpen] = useState(false);
  const [selectedOrderDetails, setSelectedOrderDetails] = useState(null);
  const [printReceiptOrder, setPrintReceiptOrder] = useState(null);
  const [actionMenuOrderId, setActionMenuOrderId] = useState(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (!e.target.closest(".action-menu-container")) {
        setActionMenuOrderId(null);
      }
      if (!e.target.closest(".date-filter-dropdown-container")) {
        setDateDropdownOpen(false);
      }
    };
    window.addEventListener("click", handleOutsideClick);
    return () => window.removeEventListener("click", handleOutsideClick);
  }, []);

  // --- KPI Card Calculations ---
  const totalOrdersCount = orders.length;
  const totalSalesAmount = useMemo(() => {
    return orders
      .filter((o) => o.status === "Completed")
      .reduce((sum, o) => sum + (Number(o.amount) || 0), 0);
  }, [orders]);

  const pendingOrdersCount = useMemo(() => {
    return orders.filter((o) => ["Pending", "Preparing", "Ready"].includes(o.status)).length;
  }, [orders]);

  const completedOrdersCount = useMemo(() => {
    return orders.filter((o) => o.status === "Completed").length;
  }, [orders]);

  // Tab Badge Counts
  const tabCounts = useMemo(() => {
    const counts = {
      all: orders.length,
      Pending: orders.filter((o) => o.status === "Pending").length,
      Preparing: orders.filter((o) => o.status === "Preparing").length,
      Ready: orders.filter((o) => o.status === "Ready").length,
      Completed: orders.filter((o) => o.status === "Completed").length,
      Cancelled: orders.filter((o) => o.status === "Cancelled").length,
    };
    return counts;
  }, [orders]);

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

      // 3. Search query filter (Order ID, Customer, Phone)
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
        }
      }

      return true;
    });
  }, [orders, activeTabStatus, secondaryStatusFilter, searchQuery, dateFilter]);

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

  // --- Order Status Updater ---
  const updateOrderStatus = async (orderId, newStatus) => {
    setOrders((prev) =>
      prev.map((ord) => (ord.id === orderId ? { ...ord, status: newStatus } : ord))
    );
    setActionMenuOrderId(null);

    // Call backend API if possible
    try {
      if (newStatus === "Cancelled") {
        await apiCancelTakeawayOrder(orderId).catch(() => null);
      } else if (newStatus === "Completed" || newStatus === "Ready") {
        await apiDispatchTakeawayOrder(orderId).catch(() => null);
      }
    } catch {}
  };

  // --- New Takeaway Order Form State ---
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerPhone, setNewCustomerPhone] = useState("");
  const [newOrderNotes, setNewOrderNotes] = useState("");
  const [newPaymentMethod, setNewPaymentMethod] = useState("UPI");
  const [newOrderCart, setNewOrderCart] = useState({});
  const [itemSearchQuery, setItemSearchQuery] = useState("");
  const [itemCategoryFilter, setItemCategoryFilter] = useState("all");

  const availableFoodItems = useMemo(() => {
    return (menuItems || []).filter((item) => {
      if (item.isAvailable === false) return false;
      const query = itemSearchQuery.trim().toLowerCase();
      const matchQuery = !query || String(item.name || "").toLowerCase().includes(query);
      const matchCat =
        itemCategoryFilter === "all" ||
        String(item.category || "").toLowerCase() === itemCategoryFilter.toLowerCase();
      return matchQuery && matchCat;
    });
  }, [menuItems, itemSearchQuery, itemCategoryFilter]);

  const addCartItem = (dish) => {
    const id = dish.id || dish.menuItemId || dish.name;
    setNewOrderCart((prev) => {
      const cur = prev[id] || { item: dish, quantity: 0 };
      return { ...prev, [id]: { ...cur, quantity: cur.quantity + 1 } };
    });
  };

  const removeCartItem = (dish) => {
    const id = dish.id || dish.menuItemId || dish.name;
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
  const cartSubtotal = cartItemsList.reduce(
    (sum, line) => sum + (Number(line.item.price) || 0) * line.quantity,
    0
  );
  const cartGst = Math.round(cartSubtotal * 0.05); // 5% GST
  const cartTotal = cartSubtotal + cartGst;

  const handleCreateTakeawayOrder = async () => {
    if (cartItemsList.length === 0) {
      alert("Please add at least one item to the takeaway order.");
      return;
    }

    const nextNumber = 1069 + orders.length;
    const newId = `TK-${nextNumber}`;
    const now = new Date();
    const timeFormatted = now.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }) + `, ${now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}`;

    const newOrder = {
      id: newId,
      orderNumber: newId,
      customer: newCustomerName.trim() || "Walk-in Guest",
      phone: newCustomerPhone.trim() || "—",
      itemsCount: cartItemsList.reduce((s, it) => s + it.quantity, 0),
      items: cartItemsList.map((line) => ({
        name: line.item.name,
        quantity: line.quantity,
        price: Number(line.item.price) || 0,
      })),
      amount: cartTotal,
      status: "Pending",
      orderTime: timeFormatted,
      date: now.toISOString(),
      paymentMethod: newPaymentMethod,
      notes: newOrderNotes.trim(),
    };

    setOrders((prev) => [newOrder, ...prev]);

    // Backend dispatch if available
    try {
      await apiCreatePaidTakeawayOrder({
        orderNumber: newId,
        orderType: "Takeaway",
        tableName: "Takeaway",
        customerName: newOrder.customer,
        customerPhone: newOrder.phone,
        totalAmount: cartTotal,
        paymentMethod: newPaymentMethod,
        items: newOrder.items,
      }).catch(() => null);
    } catch {}

    // Reset and close
    setIsNewOrderModalOpen(false);
    setNewCustomerName("");
    setNewCustomerPhone("");
    setNewOrderNotes("");
    setNewOrderCart({});
  };

  // Status Badge Component
  const renderStatusBadge = (status) => {
    switch (status) {
      case "Pending":
        return (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.35rem",
              padding: "0.25rem 0.65rem",
              borderRadius: "9999px",
              fontSize: "0.78rem",
              fontWeight: 600,
              background: "rgba(245, 158, 11, 0.12)",
              color: "#d97706",
              border: "1px solid rgba(245, 158, 11, 0.25)",
            }}
          >
            <Hourglass size={12} />
            Pending
          </span>
        );
      case "Preparing":
        return (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.35rem",
              padding: "0.25rem 0.65rem",
              borderRadius: "9999px",
              fontSize: "0.78rem",
              fontWeight: 600,
              background: "rgba(59, 130, 246, 0.12)",
              color: "#2563eb",
              border: "1px solid rgba(59, 130, 246, 0.25)",
            }}
          >
            <ChefHat size={12} />
            Preparing
          </span>
        );
      case "Ready":
        return (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.35rem",
              padding: "0.25rem 0.65rem",
              borderRadius: "9999px",
              fontSize: "0.78rem",
              fontWeight: 600,
              background: "rgba(168, 85, 247, 0.12)",
              color: "#9333ea",
              border: "1px solid rgba(168, 85, 247, 0.25)",
            }}
          >
            <Bell size={12} />
            Ready
          </span>
        );
      case "Completed":
        return (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.35rem",
              padding: "0.25rem 0.65rem",
              borderRadius: "9999px",
              fontSize: "0.78rem",
              fontWeight: 600,
              background: "rgba(34, 197, 94, 0.12)",
              color: "#16a34a",
              border: "1px solid rgba(34, 197, 94, 0.25)",
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
              gap: "0.35rem",
              padding: "0.25rem 0.65rem",
              borderRadius: "9999px",
              fontSize: "0.78rem",
              fontWeight: 600,
              background: "rgba(239, 68, 68, 0.12)",
              color: "#dc2626",
              border: "1px solid rgba(239, 68, 68, 0.25)",
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
              }}
            >
              Takeaway Orders
            </h1>
            <p
              style={{
                margin: "0.15rem 0 0",
                fontSize: "0.85rem",
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
                gap: "0.5rem",
                padding: "0.55rem 0.95rem",
                borderRadius: "10px",
                border: "1px solid var(--border-card)",
                background: "var(--bg-card)",
                color: "var(--text-main)",
                fontSize: "0.84rem",
                fontWeight: 500,
                cursor: "pointer",
                boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)",
                transition: "all 0.15s ease",
              }}
            >
              <Calendar size={15} color="#ea580c" />
              <span>{dateRangeLabel}</span>
              <ChevronDown size={14} style={{ opacity: 0.7 }} />
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
                  boxShadow: "0 10px 25px rgba(0, 0, 0, 0.2)",
                  padding: "0.4rem",
                  zIndex: 50,
                  minWidth: "190px",
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
                      padding: "0.5rem 0.75rem",
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
              padding: "0.6rem 1.25rem",
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
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
          gap: "1rem",
        }}
      >
        {/* Card 1: Total Takeaway Orders */}
        <div
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border-card)",
            borderRadius: "12px",
            padding: "1rem 1.25rem",
            display: "flex",
            alignItems: "center",
            gap: "1rem",
            boxShadow: "0 2px 6px rgba(0, 0, 0, 0.04)",
          }}
        >
          <div
            style={{
              width: "46px",
              height: "46px",
              borderRadius: "50%",
              background: "rgba(249, 115, 22, 0.12)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#ea580c",
              flexShrink: 0,
            }}
          >
            <ShoppingBag size={22} />
          </div>
          <div>
            <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 500 }}>
              Total Takeaway Orders
            </div>
            <div style={{ fontSize: "1.45rem", fontWeight: 700, marginTop: "0.2rem", color: "var(--text-main)" }}>
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
            padding: "1rem 1.25rem",
            display: "flex",
            alignItems: "center",
            gap: "1rem",
            boxShadow: "0 2px 6px rgba(0, 0, 0, 0.04)",
          }}
        >
          <div
            style={{
              width: "46px",
              height: "46px",
              borderRadius: "50%",
              background: "rgba(34, 197, 94, 0.12)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#16a34a",
              flexShrink: 0,
            }}
          >
            <IndianRupee size={22} />
          </div>
          <div>
            <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 500 }}>
              Takeaway Sales
            </div>
            <div style={{ fontSize: "1.45rem", fontWeight: 700, marginTop: "0.2rem", color: "#16a34a" }}>
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
            padding: "1rem 1.25rem",
            display: "flex",
            alignItems: "center",
            gap: "1rem",
            boxShadow: "0 2px 6px rgba(0, 0, 0, 0.04)",
          }}
        >
          <div
            style={{
              width: "46px",
              height: "46px",
              borderRadius: "50%",
              background: "rgba(245, 158, 11, 0.12)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#d97706",
              flexShrink: 0,
            }}
          >
            <Hourglass size={22} />
          </div>
          <div>
            <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 500 }}>
              Pending Orders
            </div>
            <div style={{ fontSize: "1.45rem", fontWeight: 700, marginTop: "0.2rem", color: "#d97706" }}>
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
            padding: "1rem 1.25rem",
            display: "flex",
            alignItems: "center",
            gap: "1rem",
            boxShadow: "0 2px 6px rgba(0, 0, 0, 0.04)",
          }}
        >
          <div
            style={{
              width: "46px",
              height: "46px",
              borderRadius: "50%",
              background: "rgba(34, 197, 94, 0.12)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#16a34a",
              flexShrink: 0,
            }}
          >
            <CheckCircle2 size={22} />
          </div>
          <div>
            <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 500 }}>
              Completed Orders
            </div>
            <div style={{ fontSize: "1.45rem", fontWeight: 700, marginTop: "0.2rem", color: "#16a34a" }}>
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
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTabStatus(tab.key)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.45rem",
                padding: "0.55rem 1rem",
                borderRadius: "10px",
                border: isActive ? "none" : "1px solid var(--border-card)",
                background: isActive
                  ? "linear-gradient(135deg, #f97316 0%, #ea580c 100%)"
                  : "var(--bg-card)",
                color: isActive ? "#ffffff" : "var(--text-main)",
                fontSize: "0.83rem",
                fontWeight: isActive ? 600 : 500,
                cursor: "pointer",
                whiteSpace: "nowrap",
                boxShadow: isActive ? "0 3px 8px rgba(234, 88, 12, 0.3)" : "none",
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
            flex: "1 1 300px",
            maxWidth: "460px",
          }}
        >
          <Search
            size={16}
            style={{
              position: "absolute",
              left: "0.85rem",
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--text-muted)",
            }}
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Order ID, Customer or Phone..."
            style={{
              width: "100%",
              padding: "0.58rem 0.85rem 0.58rem 2.4rem",
              borderRadius: "10px",
              border: "1px solid var(--border-card)",
              background: "var(--bg-card)",
              color: "var(--text-main)",
              fontSize: "0.83rem",
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
              padding: "0.55rem 0.85rem",
              borderRadius: "10px",
              border: "1px solid var(--border-card)",
              background: "var(--bg-card)",
              color: "var(--text-main)",
              fontSize: "0.82rem",
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
              padding: "0.55rem 0.85rem",
              borderRadius: "10px",
              border: "1px solid var(--border-card)",
              background: "var(--bg-card)",
              color: "var(--text-main)",
              fontSize: "0.82rem",
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
              padding: "0.55rem",
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
          borderRadius: "12px",
          overflow: "hidden",
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.03)",
        }}
      >
        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              textAlign: "left",
              fontSize: "0.85rem",
            }}
          >
            <thead>
              <tr
                style={{
                  borderBottom: "1px solid var(--border-card)",
                  color: "var(--text-muted)",
                  fontSize: "0.78rem",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.03em",
                }}
              >
                <th style={{ padding: "0.85rem 1rem", width: "40px" }}>#</th>
                <th style={{ padding: "0.85rem 1rem" }}>Order ID</th>
                <th style={{ padding: "0.85rem 1rem" }}>Customer</th>
                <th style={{ padding: "0.85rem 1rem" }}>Phone</th>
                <th style={{ padding: "0.85rem 1rem" }}>Items</th>
                <th style={{ padding: "0.85rem 1rem" }}>Amount</th>
                <th style={{ padding: "0.85rem 1rem" }}>Status</th>
                <th style={{ padding: "0.85rem 1rem" }}>Order Time</th>
                <th style={{ padding: "0.85rem 1rem", textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedOrders.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    style={{
                      padding: "3rem 1rem",
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
                      style={{
                        borderBottom: "1px solid var(--border-card)",
                        transition: "background 0.15s ease",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(249, 115, 22, 0.03)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      <td style={{ padding: "0.85rem 1rem", color: "var(--text-muted)" }}>
                        {rowNumber}
                      </td>
                      <td style={{ padding: "0.85rem 1rem", fontWeight: 700, color: "var(--text-main)" }}>
                        {order.orderNumber || order.id}
                      </td>
                      <td style={{ padding: "0.85rem 1rem", fontWeight: 600, color: "var(--text-main)" }}>
                        {order.customer}
                      </td>
                      <td style={{ padding: "0.85rem 1rem", color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                        {order.phone}
                      </td>
                      <td style={{ padding: "0.85rem 1rem", color: "var(--text-main)" }}>
                        <span
                          style={{
                            background: "rgba(255, 255, 255, 0.06)",
                            padding: "0.2rem 0.5rem",
                            borderRadius: "6px",
                            fontSize: "0.78rem",
                            border: "1px solid var(--border-card)",
                          }}
                        >
                          {order.itemsCount} Items
                        </span>
                      </td>
                      <td style={{ padding: "0.85rem 1rem", fontWeight: 700, color: "var(--text-main)" }}>
                        ₹ {Number(order.amount).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td style={{ padding: "0.85rem 1rem" }}>
                        {renderStatusBadge(order.status)}
                      </td>
                      <td style={{ padding: "0.85rem 1rem", color: "var(--text-muted)", fontSize: "0.8rem", whiteSpace: "nowrap" }}>
                        {order.orderTime}
                      </td>
                      <td style={{ padding: "0.85rem 1rem", textAlign: "right", whiteSpace: "nowrap" }}>
                        <div style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}>
                          {/* View details */}
                          <button
                            type="button"
                            onClick={() => setSelectedOrderDetails(order)}
                            title="View order details"
                            style={{
                              padding: "0.4rem",
                              borderRadius: "8px",
                              border: "1px solid var(--border-card)",
                              background: "transparent",
                              color: "var(--text-main)",
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <Eye size={15} />
                          </button>

                          {/* Print receipt */}
                          <button
                            type="button"
                            onClick={() => setPrintReceiptOrder(order)}
                            title="Print receipt / KOT"
                            style={{
                              padding: "0.4rem",
                              borderRadius: "8px",
                              border: "1px solid var(--border-card)",
                              background: "transparent",
                              color: "var(--text-main)",
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <Printer size={15} />
                          </button>

                          {/* More Options / Status changer */}
                          <div className="action-menu-container" style={{ position: "relative" }}>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActionMenuOrderId(actionMenuOrderId === order.id ? null : order.id);
                              }}
                              title="Order actions"
                              style={{
                                padding: "0.4rem",
                                borderRadius: "8px",
                                border: "1px solid var(--border-card)",
                                background: "transparent",
                                color: "var(--text-main)",
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
                                  top: "calc(100% + 4px)",
                                  background: "var(--bg-card)",
                                  border: "1px solid var(--border-card)",
                                  borderRadius: "10px",
                                  boxShadow: "0 10px 25px rgba(0, 0, 0, 0.25)",
                                  padding: "0.35rem",
                                  zIndex: 50,
                                  minWidth: "160px",
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
                                      padding: "0.45rem 0.65rem",
                                      borderRadius: "6px",
                                      border: "none",
                                      background: "transparent",
                                      color: "#2563eb",
                                      fontSize: "0.8rem",
                                      fontWeight: 500,
                                      cursor: "pointer",
                                      display: "flex",
                                      alignItems: "center",
                                      gap: "0.4rem",
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
                                      padding: "0.45rem 0.65rem",
                                      borderRadius: "6px",
                                      border: "none",
                                      background: "transparent",
                                      color: "#9333ea",
                                      fontSize: "0.8rem",
                                      fontWeight: 500,
                                      cursor: "pointer",
                                      display: "flex",
                                      alignItems: "center",
                                      gap: "0.4rem",
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
                                      padding: "0.45rem 0.65rem",
                                      borderRadius: "6px",
                                      border: "none",
                                      background: "transparent",
                                      color: "#16a34a",
                                      fontSize: "0.8rem",
                                      fontWeight: 500,
                                      cursor: "pointer",
                                      display: "flex",
                                      alignItems: "center",
                                      gap: "0.4rem",
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
                                      padding: "0.45rem 0.65rem",
                                      borderRadius: "6px",
                                      border: "none",
                                      background: "transparent",
                                      color: "#dc2626",
                                      fontSize: "0.8rem",
                                      fontWeight: 500,
                                      cursor: "pointer",
                                      display: "flex",
                                      alignItems: "center",
                                      gap: "0.4rem",
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
            padding: "0.85rem 1.25rem",
            borderTop: "1px solid var(--border-card)",
            fontSize: "0.82rem",
            color: "var(--text-muted)",
            flexWrap: "wrap",
            gap: "0.75rem",
          }}
        >
          <div>
            Showing{" "}
            <span style={{ fontWeight: 600, color: "var(--text-main)" }}>
              {filteredOrders.length > 0 ? (safePage - 1) * pageSize + 1 : 0}
            </span>{" "}
            -{" "}
            <span style={{ fontWeight: 600, color: "var(--text-main)" }}>
              {Math.min(safePage * pageSize, filteredOrders.length)}
            </span>{" "}
            of{" "}
            <span style={{ fontWeight: 600, color: "var(--text-main)" }}>
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
                width: "32px",
                height: "32px",
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

            {/* Page number buttons */}
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
                    <span key={`dots-${pIdx}`} style={{ padding: "0 0.3rem", color: "var(--text-muted)" }}>
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
                      width: "32px",
                      height: "32px",
                      borderRadius: "8px",
                      border: isSelected ? "none" : "1px solid var(--border-card)",
                      background: isSelected
                        ? "linear-gradient(135deg, #f97316 0%, #ea580c 100%)"
                        : "var(--bg-card)",
                      color: isSelected ? "#fff" : "var(--text-main)",
                      fontWeight: isSelected ? 700 : 500,
                      fontSize: "0.82rem",
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
                width: "32px",
                height: "32px",
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
            background: "rgba(0, 0, 0, 0.7)",
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
              borderRadius: "16px",
              width: "100%",
              maxWidth: "850px",
              maxHeight: "90vh",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 20px 50px rgba(0, 0, 0, 0.4)",
              overflow: "hidden",
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: "1rem 1.5rem",
                borderBottom: "1px solid var(--border-card)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                <div
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "10px",
                    background: "rgba(234, 88, 12, 0.12)",
                    color: "#ea580c",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Plus size={20} />
                </div>
                <div>
                  <h2 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 700, color: "var(--text-main)" }}>
                    New Takeaway Order
                  </h2>
                  <p style={{ margin: 0, fontSize: "0.78rem", color: "var(--text-muted)" }}>
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
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body: 2 Columns */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                overflowY: "auto",
                flex: 1,
              }}
            >
              {/* Left Column: Menu Items Selection */}
              <div style={{ padding: "1.25rem", borderRight: "1px solid var(--border-card)" }}>
                <div style={{ fontWeight: 600, fontSize: "0.85rem", marginBottom: "0.5rem" }}>
                  Select Dishes from Menu
                </div>

                {/* Dish search & category filter */}
                <div style={{ display: "flex", gap: "0.4rem", marginBottom: "0.85rem" }}>
                  <div style={{ position: "relative", flex: 1 }}>
                    <Search
                      size={14}
                      style={{
                        position: "absolute",
                        left: "0.65rem",
                        top: "50%",
                        transform: "translateY(-50%)",
                        color: "var(--text-muted)",
                      }}
                    />
                    <input
                      type="text"
                      placeholder="Search dish..."
                      value={itemSearchQuery}
                      onChange={(e) => setItemSearchQuery(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "0.45rem 0.65rem 0.45rem 2rem",
                        borderRadius: "8px",
                        border: "1px solid var(--border-card)",
                        background: "var(--bg-main)",
                        color: "var(--text-main)",
                        fontSize: "0.8rem",
                        boxSizing: "border-box",
                      }}
                    />
                  </div>
                </div>

                {/* Dishes list */}
                <div
                  style={{
                    maxHeight: "340px",
                    overflowY: "auto",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.45rem",
                  }}
                >
                  {availableFoodItems.slice(0, 30).map((dish) => {
                    const dishId = dish.id || dish.menuItemId || dish.name;
                    const inCart = newOrderCart[dishId]?.quantity || 0;
                    return (
                      <div
                        key={dishId}
                        style={{
                          padding: "0.5rem 0.75rem",
                          borderRadius: "8px",
                          border: "1px solid var(--border-card)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          background: inCart > 0 ? "rgba(234, 88, 12, 0.05)" : "var(--bg-main)",
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 600, fontSize: "0.82rem", color: "var(--text-main)" }}>
                            {dish.name}
                          </div>
                          <div style={{ fontSize: "0.75rem", color: "#16a34a", fontWeight: 600 }}>
                            ₹ {dish.price}
                          </div>
                        </div>

                        {inCart > 0 ? (
                          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                            <button
                              type="button"
                              onClick={() => removeCartItem(dish)}
                              style={{
                                width: "24px",
                                height: "24px",
                                borderRadius: "6px",
                                border: "1px solid var(--border-card)",
                                background: "var(--bg-card)",
                                color: "var(--text-main)",
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                            >
                              -
                            </button>
                            <span style={{ fontSize: "0.82rem", fontWeight: 700, minWidth: "16px", textAlign: "center" }}>
                              {inCart}
                            </span>
                            <button
                              type="button"
                              onClick={() => addCartItem(dish)}
                              style={{
                                width: "24px",
                                height: "24px",
                                borderRadius: "6px",
                                border: "none",
                                background: "#ea580c",
                                color: "#fff",
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
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
                              padding: "0.3rem 0.65rem",
                              borderRadius: "6px",
                              border: "1px solid rgba(234, 88, 12, 0.4)",
                              background: "rgba(234, 88, 12, 0.1)",
                              color: "#ea580c",
                              fontSize: "0.76rem",
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
                  padding: "1.25rem",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.85rem",
                }}
              >
                <div style={{ fontWeight: 600, fontSize: "0.85rem" }}>Customer & Order Info</div>

                {/* Customer Name */}
                <div>
                  <label style={{ fontSize: "0.76rem", color: "var(--text-muted)", display: "block", marginBottom: "0.25rem" }}>
                    Customer Name *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Ramesh Kumar"
                    value={newCustomerName}
                    onChange={(e) => setNewCustomerName(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "0.5rem 0.75rem",
                      borderRadius: "8px",
                      border: "1px solid var(--border-card)",
                      background: "var(--bg-main)",
                      color: "var(--text-main)",
                      fontSize: "0.82rem",
                      boxSizing: "border-box",
                    }}
                  />
                </div>

                {/* Customer Phone */}
                <div>
                  <label style={{ fontSize: "0.76rem", color: "var(--text-muted)", display: "block", marginBottom: "0.25rem" }}>
                    Phone Number
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. +91 98450 11223"
                    value={newCustomerPhone}
                    onChange={(e) => setNewCustomerPhone(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "0.5rem 0.75rem",
                      borderRadius: "8px",
                      border: "1px solid var(--border-card)",
                      background: "var(--bg-main)",
                      color: "var(--text-main)",
                      fontSize: "0.82rem",
                      boxSizing: "border-box",
                    }}
                  />
                </div>

                {/* Selected Items summary */}
                <div>
                  <div style={{ fontSize: "0.76rem", color: "var(--text-muted)", marginBottom: "0.35rem" }}>
                    Order Items ({cartItemsList.length})
                  </div>
                  <div
                    style={{
                      background: "var(--bg-main)",
                      border: "1px solid var(--border-card)",
                      borderRadius: "8px",
                      padding: "0.6rem",
                      maxHeight: "120px",
                      overflowY: "auto",
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.35rem",
                    }}
                  >
                    {cartItemsList.length === 0 ? (
                      <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", textAlign: "center", padding: "0.5rem" }}>
                        No items added yet. Click + Add on the left.
                      </div>
                    ) : (
                      cartItemsList.map((line) => (
                        <div
                          key={line.item.id || line.item.name}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            fontSize: "0.8rem",
                          }}
                        >
                          <span>
                            {line.item.name} × {line.quantity}
                          </span>
                          <span style={{ fontWeight: 600 }}>
                            ₹ {(Number(line.item.price) || 0) * line.quantity}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Payment Method */}
                <div>
                  <label style={{ fontSize: "0.76rem", color: "var(--text-muted)", display: "block", marginBottom: "0.25rem" }}>
                    Payment Mode
                  </label>
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    {["UPI", "Cash", "Card"].map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setNewPaymentMethod(mode)}
                        style={{
                          flex: 1,
                          padding: "0.45rem",
                          borderRadius: "6px",
                          border: newPaymentMethod === mode ? "1px solid #ea580c" : "1px solid var(--border-card)",
                          background: newPaymentMethod === mode ? "rgba(234, 88, 12, 0.1)" : "var(--bg-main)",
                          color: newPaymentMethod === mode ? "#ea580c" : "var(--text-main)",
                          fontSize: "0.78rem",
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                      >
                        {mode}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Bill Totals */}
                <div
                  style={{
                    background: "var(--bg-main)",
                    borderRadius: "8px",
                    padding: "0.65rem 0.85rem",
                    border: "1px solid var(--border-card)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.25rem",
                    fontSize: "0.82rem",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", color: "var(--text-muted)" }}>
                    <span>Subtotal:</span>
                    <span>₹ {cartSubtotal.toFixed(2)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", color: "var(--text-muted)" }}>
                    <span>GST (5%):</span>
                    <span>₹ {cartGst.toFixed(2)}</span>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontWeight: 700,
                      fontSize: "0.95rem",
                      color: "#16a34a",
                      borderTop: "1px dashed var(--border-card)",
                      paddingTop: "0.35rem",
                      marginTop: "0.2rem",
                    }}
                  >
                    <span>Total Amount:</span>
                    <span>₹ {cartTotal.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div
              style={{
                padding: "0.85rem 1.5rem",
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
                  padding: "0.55rem 1.15rem",
                  borderRadius: "8px",
                  border: "1px solid var(--border-card)",
                  background: "transparent",
                  color: "var(--text-main)",
                  fontSize: "0.82rem",
                  fontWeight: 500,
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateTakeawayOrder}
                style={{
                  padding: "0.55rem 1.35rem",
                  borderRadius: "8px",
                  border: "none",
                  background: "linear-gradient(135deg, #f97316 0%, #ea580c 100%)",
                  color: "#fff",
                  fontSize: "0.82rem",
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
            background: "rgba(0, 0, 0, 0.7)",
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
              borderRadius: "16px",
              width: "100%",
              maxWidth: "540px",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 20px 50px rgba(0, 0, 0, 0.4)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "1rem 1.25rem",
                borderBottom: "1px solid var(--border-card)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700, color: "var(--text-main)" }}>
                  Takeaway Order #{selectedOrderDetails.orderNumber || selectedOrderDetails.id}
                </h3>
                <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                  {selectedOrderDetails.orderTime}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOrderDetails(null)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--text-muted)",
                  cursor: "pointer",
                  padding: "0.4rem",
                }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
              {/* Customer info */}
              <div
                style={{
                  background: "var(--bg-main)",
                  padding: "0.75rem 1rem",
                  borderRadius: "10px",
                  border: "1px solid var(--border-card)",
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "0.85rem",
                }}
              >
                <div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Customer</div>
                  <div style={{ fontWeight: 600 }}>{selectedOrderDetails.customer}</div>
                </div>
                <div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Phone</div>
                  <div style={{ fontWeight: 600 }}>{selectedOrderDetails.phone}</div>
                </div>
                <div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Status</div>
                  <div style={{ marginTop: "0.15rem" }}>
                    {renderStatusBadge(selectedOrderDetails.status)}
                  </div>
                </div>
              </div>

              {/* Items List */}
              <div>
                <div style={{ fontWeight: 600, fontSize: "0.85rem", marginBottom: "0.4rem" }}>
                  Items Ordered
                </div>
                <div
                  style={{
                    border: "1px solid var(--border-card)",
                    borderRadius: "8px",
                    overflow: "hidden",
                  }}
                >
                  {(selectedOrderDetails.items || []).map((it, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: "0.55rem 0.85rem",
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: "0.82rem",
                        borderBottom:
                          idx < (selectedOrderDetails.items?.length || 0) - 1
                            ? "1px solid var(--border-card)"
                            : "none",
                      }}
                    >
                      <span>
                        {it.name} × {it.quantity}
                      </span>
                      <span style={{ fontWeight: 600 }}>
                        ₹ {((Number(it.price) || 0) * (it.quantity || 1)).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total Summary */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "0.85rem",
                  background: "rgba(34, 197, 94, 0.08)",
                  borderRadius: "10px",
                  border: "1px solid rgba(34, 197, 94, 0.2)",
                }}
              >
                <span style={{ fontWeight: 600, fontSize: "0.9rem" }}>Total Bill Amount:</span>
                <span style={{ fontSize: "1.2rem", fontWeight: 700, color: "#16a34a" }}>
                  ₹ {Number(selectedOrderDetails.amount).toFixed(2)}
                </span>
              </div>

              {/* Notes */}
              {selectedOrderDetails.notes && (
                <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                  <strong>Notes:</strong> {selectedOrderDetails.notes}
                </div>
              )}
            </div>

            <div
              style={{
                padding: "0.85rem 1.25rem",
                borderTop: "1px solid var(--border-card)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
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
                  gap: "0.4rem",
                  padding: "0.5rem 0.95rem",
                  borderRadius: "8px",
                  border: "1px solid var(--border-card)",
                  background: "transparent",
                  color: "var(--text-main)",
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                <Printer size={15} /> Print Receipt
              </button>

              <button
                type="button"
                onClick={() => setSelectedOrderDetails(null)}
                style={{
                  padding: "0.5rem 1.15rem",
                  borderRadius: "8px",
                  border: "none",
                  background: "#ea580c",
                  color: "#fff",
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 3: Thermal Receipt Preview ─────────────────── */}
      {printReceiptOrder && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.75)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1100,
            padding: "1rem",
          }}
        >
          <div
            style={{
              background: "#ffffff",
              color: "#111827",
              width: "100%",
              maxWidth: "380px",
              borderRadius: "14px",
              padding: "1.5rem",
              boxShadow: "0 25px 60px rgba(0, 0, 0, 0.5)",
              display: "flex",
              flexDirection: "column",
              gap: "0.75rem",
              fontFamily: "monospace",
              fontSize: "0.82rem",
            }}
          >
            {/* Header */}
            <div style={{ textAlign: "center", borderBottom: "1px dashed #d1d5db", paddingBottom: "0.75rem" }}>
              <div style={{ fontWeight: 800, fontSize: "1.1rem", fontFamily: "sans-serif" }}>
                {restaurantName}
              </div>
              <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>
                Fine Dining & POS Management
              </div>
              <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>
                Takeaway / Pickup Counter
              </div>
            </div>

            {/* Meta */}
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.78rem" }}>
              <span>Order #: {printReceiptOrder.orderNumber || printReceiptOrder.id}</span>
              <span>{printReceiptOrder.orderTime}</span>
            </div>
            <div style={{ fontSize: "0.78rem" }}>
              Customer: <strong>{printReceiptOrder.customer}</strong> ({printReceiptOrder.phone})
            </div>

            {/* Items Table */}
            <div style={{ borderTop: "1px dashed #d1d5db", borderBottom: "1px dashed #d1d5db", padding: "0.5rem 0" }}>
              <table style={{ width: "100%", textAlign: "left", fontSize: "0.78rem" }}>
                <thead>
                  <tr style={{ color: "#6b7280" }}>
                    <th>Item</th>
                    <th style={{ textAlign: "center" }}>Qty</th>
                    <th style={{ textAlign: "right" }}>Amt</th>
                  </tr>
                </thead>
                <tbody>
                  {(printReceiptOrder.items || []).map((it, idx) => (
                    <tr key={idx}>
                      <td style={{ padding: "0.2rem 0" }}>{it.name}</td>
                      <td style={{ textAlign: "center" }}>{it.quantity}</td>
                      <td style={{ textAlign: "right" }}>
                        ₹ {((Number(it.price) || 0) * (it.quantity || 1)).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.2rem", fontSize: "0.8rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Subtotal:</span>
                <span>₹ {(Number(printReceiptOrder.amount) * 0.95).toFixed(2)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>GST (5%):</span>
                <span>₹ {(Number(printReceiptOrder.amount) * 0.05).toFixed(2)}</span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontWeight: 800,
                  fontSize: "1rem",
                  borderTop: "1px solid #111827",
                  paddingTop: "0.3rem",
                  marginTop: "0.2rem",
                }}
              >
                <span>TOTAL:</span>
                <span>₹ {Number(printReceiptOrder.amount).toFixed(2)}</span>
              </div>
            </div>

            {/* Footer */}
            <div style={{ textAlign: "center", fontSize: "0.75rem", color: "#6b7280", marginTop: "0.4rem" }}>
              Thank you for your order! Please visit again.
            </div>

            {/* Actions */}
            <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
              <button
                type="button"
                onClick={() => window.print()}
                style={{
                  flex: 1,
                  padding: "0.6rem",
                  borderRadius: "8px",
                  border: "none",
                  background: "#ea580c",
                  color: "#fff",
                  fontWeight: 700,
                  cursor: "pointer",
                  fontFamily: "sans-serif",
                }}
              >
                Print
              </button>
              <button
                type="button"
                onClick={() => setPrintReceiptOrder(null)}
                style={{
                  padding: "0.6rem 1rem",
                  borderRadius: "8px",
                  border: "1px solid #d1d5db",
                  background: "transparent",
                  color: "#374151",
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: "sans-serif",
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
