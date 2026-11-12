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
  apiGetTakeawayOrders,
  apiGetTakeawayOrderHistory,
  apiCreatePaidTakeawayOrder,
  apiDispatchTakeawayOrder,
  apiCancelTakeawayOrder,
} from "../api/orderApi";
import { ReceiptModal } from "../user/ReceiptModal";

const STORAGE_KEY_TAKEAWAY = "avsr_admin_takeaway_orders_v1";
const TAKEAWAY_GST_RATE = 0.05;
const TAKEAWAY_SERVICE_CHARGE_RATE = 0.05;

function calculateTakeawayBill(items, fallbackSubtotal = 0) {
  const subtotalFromItems = (Array.isArray(items) ? items : []).reduce(
    (sum, item) =>
      sum +
      (Number(item?.price ?? item?.unitPrice) || 0) *
        (Number(item?.quantity ?? item?.qty) || 1),
    0
  );
  const subtotal = Math.round((subtotalFromItems || Number(fallbackSubtotal) || 0) * 100) / 100;
  const taxAmount = Math.round((subtotal * TAKEAWAY_GST_RATE + Number.EPSILON) * 100) / 100;
  const serviceChargeAmount = Math.round((subtotal * TAKEAWAY_SERVICE_CHARGE_RATE + Number.EPSILON) * 100) / 100;

  return {
    subtotal,
    taxAmount,
    serviceChargeAmount,
    grandTotal: Math.round((subtotal + taxAmount + serviceChargeAmount) * 100) / 100,
  };
}

function getTakeawayOrderTotal(order) {
  return calculateTakeawayBill(order?.items, order?.amount).grandTotal;
}

function isValidIndianMobileNumber(phone) {
  const normalizedPhone = String(phone || "").trim().replace(/[\s()-]/g, "");
  if (!/^\+?\d+$/.test(normalizedPhone)) return false;
  const digits = normalizedPhone.replace(/\D/g, "");
  const mobileNumber = digits.length === 12 && digits.startsWith("91") ? digits.slice(2) : digits;
  return /^[6-9]\d{9}$/.test(mobileNumber);
}

// ── Initial Seed Data (Precisely calibrated to the 86 Total / 8 Pending / 78 Completed / ₹74,320.00 KPI mockup) ──
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

// Helper to seed the full 86 orders with 78 completed, 8 pending, and exact sales sum
function generateExpandedSeedOrders() {
  const list = [...SEED_TAKEAWAY_ORDERS];
  const names = [
    "Arun K.", "Deepa M.", "Kiran B.", "Sanjay V.", "Meera S.", "Naveen P.",
    "Swathi R.", "Pooja G.", "Harish T.", "Sneha L.", "Vijay C.", "Rohit K.",
    "Bhavya S.", "Rajesh M.", "Snehal P.", "Girish D.", "Aishwarya K.", "Sunil R."
  ];

  // 7 more pending orders to reach 8 total pending
  const pendingTemplates = [
    { customer: "Sneha Reddy", phone: "+91 98451 22334", items: [{ name: "Veg Biryani", quantity: 2, price: 280 }], amount: 560, notes: "Pack extra raita" },
    { customer: "Rahul V.", phone: "+91 98112 44556", items: [{ name: "Butter Chicken", quantity: 1, price: 390 }, { name: "Garlic Naan", quantity: 3, price: 75 }], amount: 615, notes: "" },
    { customer: "Meenakshi S.", phone: "+91 97334 55667", items: [{ name: "Paneer Tikka", quantity: 2, price: 290 }], amount: 580, notes: "Green chutney extra" },
    { customer: "Aditya Roy", phone: "+91 96221 88990", items: [{ name: "Chicken 65", quantity: 2, price: 310 }], amount: 620, notes: "Crispy fry" },
    { customer: "Pooja Hegde", phone: "+91 95443 22110", items: [{ name: "Veg Hakka Noodles", quantity: 2, price: 240 }], amount: 480, notes: "" },
    { customer: "Gautam Rao", phone: "+91 94332 11998", items: [{ name: "Tandoori Roti", quantity: 8, price: 35 }, { name: "Dal Makhani", quantity: 1, price: 280 }], amount: 560, notes: "" },
    { customer: "Kavitha N.", phone: "+91 93221 00887", items: [{ name: "Chicken Dum Biryani", quantity: 2, price: 380 }], amount: 760, notes: "Urgent pickup" },
  ];

  pendingTemplates.forEach((pt, i) => {
    list.push({
      id: `TK-${1060 - i}`,
      orderNumber: `TK-${1060 - i}`,
      customer: pt.customer,
      phone: pt.phone,
      itemsCount: pt.items.reduce((s, it) => s + it.quantity, 0),
      items: pt.items,
      amount: pt.amount,
      status: "Pending",
      orderTime: `14 Oct 2026, ${String(8 - Math.floor(i / 2)).padStart(2, "0")}:${String(15 + i * 5).padStart(2, "0")} AM`,
      date: `2026-10-14T08:${String(15 + i * 5).padStart(2, "0")}:00`,
      paymentMethod: "UPI",
      notes: pt.notes,
    });
  });

  // 1 more cancelled order to reach 2 total cancelled
  list.push({
    id: "TK-1053",
    orderNumber: "TK-1053",
    customer: "Sameer Joshi",
    phone: "+91 98223 33441",
    itemsCount: 2,
    items: [{ name: "Mutton Biryani", quantity: 1, price: 490 }],
    amount: 490.0,
    status: "Cancelled",
    orderTime: "14 Oct 2026, 08:10 AM",
    date: "2026-10-14T08:10:00",
    paymentMethod: "UPI",
    notes: "Customer delayed, cancelled order",
  });

  // 4 more preparing orders to reach 5 total preparing
  const preparingTemplates = [
    { customer: "Varun Verma", phone: "+91 98334 11223", items: [{ name: "Chicken Tikka", quantity: 2, price: 320 }], amount: 640 },
    { customer: "Shweta K.", phone: "+91 97445 22334", items: [{ name: "Veg Pulao", quantity: 2, price: 250 }], amount: 500 },
    { customer: "Murali B.", phone: "+91 96556 33445", items: [{ name: "Fish Curry", quantity: 1, price: 420 }, { name: "Steamed Rice", quantity: 2, price: 120 }], amount: 660 },
    { customer: "Neha Sharma", phone: "+91 95667 44556", items: [{ name: "Paneer Kulcha", quantity: 4, price: 90 }], amount: 360 },
  ];
  preparingTemplates.forEach((pt, i) => {
    list.push({
      id: `TK-${1052 - i}`,
      orderNumber: `TK-${1052 - i}`,
      customer: pt.customer,
      phone: pt.phone,
      itemsCount: pt.items.reduce((s, it) => s + it.quantity, 0),
      items: pt.items,
      amount: pt.amount,
      status: "Preparing",
      orderTime: `14 Oct 2026, 07:${String(45 + i * 3).padStart(2, "0")} AM`,
      date: `2026-10-14T07:${String(45 + i * 3).padStart(2, "0")}:00`,
      paymentMethod: "Card",
      notes: "",
    });
  });

  // 2 more ready orders to reach 3 total ready
  const readyTemplates = [
    { customer: "Prashanth D.", phone: "+91 94778 55667", items: [{ name: "Chicken Biryani", quantity: 2, price: 380 }], amount: 760 },
    { customer: "Deepika R.", phone: "+91 93889 66778", items: [{ name: "Paneer Butter Masala", quantity: 1, price: 320 }, { name: "Naan", quantity: 4, price: 50 }], amount: 520 },
  ];
  readyTemplates.forEach((rt, i) => {
    list.push({
      id: `TK-${1048 - i}`,
      orderNumber: `TK-${1048 - i}`,
      customer: rt.customer,
      phone: rt.phone,
      itemsCount: rt.items.reduce((s, it) => s + it.quantity, 0),
      items: rt.items,
      amount: rt.amount,
      status: "Ready",
      orderTime: `14 Oct 2026, 07:30 AM`,
      date: `2026-10-14T07:30:00`,
      paymentMethod: "UPI",
      notes: "Packed and ready at counter",
    });
  });

  // Generate completed orders to reach exact target 78 completed and ₹74,320.00 total sales
  const currentCompletedList = list.filter((o) => o.status === "Completed");
  const neededCompleted = 78 - currentCompletedList.length;
  let remainingSales = 74320.0 - currentCompletedList.reduce((s, o) => s + o.amount, 0);

  for (let i = 1; i <= neededCompleted; i++) {
    const num = 1046 - i;
    const name = names[i % names.length];
    const isLast = i === neededCompleted;
    const amount = isLast ? Math.max(200, Math.round(remainingSales)) : Math.round(remainingSales / (neededCompleted - i + 1));
    remainingSales -= amount;

    const day = Math.max(1, 14 - Math.floor(i / 6));
    const dayStr = String(day).padStart(2, "0");
    const hour = 11 + (i % 10);
    const minute = (i * 13) % 60;
    const timeStr = `${dayStr} Oct 2026, ${String(hour > 12 ? hour - 12 : hour).padStart(2, "0")}:${String(minute).padStart(2, "0")} ${hour >= 12 ? "PM" : "AM"}`;

    list.push({
      id: `TK-${num}`,
      orderNumber: `TK-${num}`,
      customer: name,
      phone: `+91 98${String(10000000 + i * 2311).slice(0, 8)}`,
      itemsCount: 3,
      items: [
        { name: "Special Dine Combo", quantity: 1, price: Math.round(amount * 0.6) },
        { name: "Indian Bread / Rice", quantity: 2, price: Math.round((amount * 0.4) / 2) },
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

  // --- Persistent & Live Orders State ---
  const [orders, setOrders] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_TAKEAWAY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length >= 8) return parsed;
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
  const [activeTabStatus, setActiveTabStatus] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState("all");
  const [secondaryStatusFilter, setSecondaryStatusFilter] = useState("all");
  const [dateDropdownOpen, setDateDropdownOpen] = useState(false);
  const [dateRangeLabel, setDateRangeLabel] = useState("01 Oct 2026 – 14 Oct 2026");
  const [customDateRangeOpen, setCustomDateRangeOpen] = useState(false);
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [appliedCustomStartDate, setAppliedCustomStartDate] = useState("");
  const [appliedCustomEndDate, setAppliedCustomEndDate] = useState("");

  // --- Modals State ---
  const [isNewOrderModalOpen, setIsNewOrderModalOpen] = useState(false);
  const [selectedOrderDetails, setSelectedOrderDetails] = useState(null);
  const [printReceiptOrder, setPrintReceiptOrder] = useState(null);
  const [actionMenuOrderId, setActionMenuOrderId] = useState(null);
  const [actionMenuOpenAbove, setActionMenuOpenAbove] = useState(false);

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
        : [
            {
              name: "Takeaway Meal Package",
              quantity: 1,
              price: Number(printReceiptOrder.amount) || 0,
            },
          ];

    const { subtotal, taxAmount, serviceChargeAmount, grandTotal } = calculateTakeawayBill(
      items,
      printReceiptOrder.amount
    );

    const isCancelled = printReceiptOrder.status === "Cancelled";

    return {
      id: printReceiptOrder.id,
      invoiceNo: printReceiptOrder.orderNumber || printReceiptOrder.id,
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
      serviceCharge: TAKEAWAY_SERVICE_CHARGE_RATE * 100,
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
  const totalOrdersCount = orders.length;
  const totalSalesAmount = useMemo(() => {
    return orders
      .filter((o) => o.status === "Completed")
      .reduce((sum, o) => sum + getTakeawayOrderTotal(o), 0);
  }, [orders]);

  const pendingOrdersCount = useMemo(() => {
    return orders.filter((o) => o.status === "Pending").length;
  }, [orders]);

  const completedOrdersCount = useMemo(() => {
    return orders.filter((o) => o.status === "Completed").length;
  }, [orders]);

  // Tab Badge Counts
  const tabCounts = useMemo(() => {
    return {
      all: orders.length,
      Pending: orders.filter((o) => o.status === "Pending").length,
      Preparing: orders.filter((o) => o.status === "Preparing").length,
      Ready: orders.filter((o) => o.status === "Ready").length,
      Completed: orders.filter((o) => o.status === "Completed").length,
      Cancelled: orders.filter((o) => o.status === "Cancelled").length,
    };
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

  // --- Order Status Updater ---
  const updateOrderStatus = async (orderId, newStatus) => {
    setOrders((prev) =>
      prev.map((ord) => (ord.id === orderId ? { ...ord, status: newStatus } : ord))
    );
    if (selectedOrderDetails && selectedOrderDetails.id === orderId) {
      setSelectedOrderDetails((prev) => ({ ...prev, status: newStatus }));
    }
    setActionMenuOrderId(null);
    setActionMenuOpenAbove(false);

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
  const [customerPhoneError, setCustomerPhoneError] = useState("");
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
  const cartBill = calculateTakeawayBill(
    cartItemsList.map((line) => ({ price: line.item.price, quantity: line.quantity }))
  );
  const { subtotal: cartSubtotal, taxAmount: cartGst, serviceChargeAmount: cartServiceCharge, grandTotal: cartTotal } = cartBill;

  const handleCreateTakeawayOrder = async () => {
    if (!isValidIndianMobileNumber(newCustomerPhone)) {
      setCustomerPhoneError(
        newCustomerPhone.trim()
          ? "Enter a valid 10-digit Indian mobile number."
          : "Phone number is required."
      );
      return;
    }

    setCustomerPhoneError("");

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
      subtotal: cartSubtotal,
      taxAmount: cartGst,
      serviceChargeAmount: cartServiceCharge,
      grandTotal: cartTotal,
      status: "Pending",
      orderTime: timeFormatted,
      date: now.toISOString(),
      paymentMethod: newPaymentMethod,
      notes: newOrderNotes.trim(),
    };

    setOrders((prev) => [newOrder, ...prev]);

    try {
      await apiCreatePaidTakeawayOrder({
        orderNumber: newId,
        orderType: "Takeaway",
        tableName: "Takeaway",
        customerName: newOrder.customer,
        customerPhone: newOrder.phone,
        subtotal: cartSubtotal,
        taxAmount: cartGst,
        serviceChargeAmount: cartServiceCharge,
        totalAmount: cartTotal,
        grandTotal: cartTotal,
        paymentMethod: newPaymentMethod,
        items: newOrder.items,
      }).catch(() => null);
    } catch {}

    setIsNewOrderModalOpen(false);
    setNewCustomerName("");
    setNewCustomerPhone("");
    setCustomerPhoneError("");
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
              fontSize: "0.86rem",
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
                <th style={{ padding: "0.7rem 0.55rem", borderBottom: "1px solid var(--border-card)", color: "var(--text-muted)", fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.025em", whiteSpace: "nowrap" }}>
                  #
                </th>
                <th style={{ padding: "0.7rem 0.55rem", borderBottom: "1px solid var(--border-card)", color: "var(--text-muted)", fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.025em", whiteSpace: "nowrap" }}>
                  ORDER ID
                </th>
                <th style={{ padding: "0.7rem 0.55rem", borderBottom: "1px solid var(--border-card)", color: "var(--text-muted)", fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.025em", whiteSpace: "nowrap" }}>
                  CUSTOMER
                </th>
                <th style={{ padding: "0.7rem 0.55rem", borderBottom: "1px solid var(--border-card)", color: "var(--text-muted)", fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.025em", whiteSpace: "nowrap" }}>
                  PHONE
                </th>
                <th style={{ padding: "0.7rem 0.55rem", borderBottom: "1px solid var(--border-card)", color: "var(--text-muted)", fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.025em", whiteSpace: "nowrap" }}>
                  ITEMS
                </th>
                <th style={{ padding: "0.7rem 0.55rem", borderBottom: "1px solid var(--border-card)", color: "var(--text-muted)", fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.025em", whiteSpace: "nowrap" }}>
                  AMOUNT
                </th>
                <th style={{ padding: "0.7rem 0.55rem", borderBottom: "1px solid var(--border-card)", color: "var(--text-muted)", fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.025em", whiteSpace: "nowrap" }}>
                  STATUS
                </th>
                <th style={{ padding: "0.7rem 0.55rem", borderBottom: "1px solid var(--border-card)", color: "var(--text-muted)", fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.025em", whiteSpace: "nowrap" }}>
                  ORDER TIME
                </th>
                <th style={{ padding: "0.7rem 0.55rem", borderBottom: "1px solid var(--border-card)", color: "var(--text-muted)", fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.025em", textAlign: "right", whiteSpace: "nowrap" }}>
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
                        setSelectedOrderDetails(order);
                      }}
                      style={{
                        transition: "background 0.15s ease",
                        cursor: "pointer",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(249, 115, 22, 0.03)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      <td style={{ padding: "0.65rem 0.55rem", borderBottom: "1px solid var(--border-card)", color: "var(--text-muted)", verticalAlign: "middle", whiteSpace: "nowrap" }}>
                        {rowNumber}
                      </td>
                      <td style={{ padding: "0.65rem 0.55rem", borderBottom: "1px solid var(--border-card)", fontWeight: 700, color: "var(--text-main)", verticalAlign: "middle", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {order.orderNumber || order.id}
                      </td>
                      <td style={{ padding: "0.65rem 0.55rem", borderBottom: "1px solid var(--border-card)", fontWeight: 600, color: "var(--text-main)", verticalAlign: "middle", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {order.customer}
                      </td>
                      <td style={{ padding: "0.65rem 0.55rem", borderBottom: "1px solid var(--border-card)", color: "var(--text-muted)", verticalAlign: "middle", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {order.phone}
                      </td>
                      <td style={{ padding: "0.65rem 0.55rem", borderBottom: "1px solid var(--border-card)", verticalAlign: "middle", whiteSpace: "nowrap" }}>
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
                      <td style={{ padding: "0.65rem 0.55rem", borderBottom: "1px solid var(--border-card)", fontWeight: 700, color: "var(--text-main)", verticalAlign: "middle", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        ₹ {getTakeawayOrderTotal(order).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td style={{ padding: "0.65rem 0.55rem", borderBottom: "1px solid var(--border-card)", verticalAlign: "middle", whiteSpace: "nowrap" }}>
                        {renderStatusBadge(order.status)}
                      </td>
                      <td style={{ padding: "0.65rem 0.55rem", borderBottom: "1px solid var(--border-card)", color: "var(--text-muted)", fontSize: "0.76rem", verticalAlign: "middle", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {order.orderTime}
                      </td>
                      <td onClick={(e) => e.stopPropagation()} style={{ padding: "0.65rem 0.45rem", borderBottom: "1px solid var(--border-card)", textAlign: "right", verticalAlign: "middle", whiteSpace: "nowrap" }}>
                        <div style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem" }}>
                          {/* View bill & print invoice */}
                          <button
                            type="button"
                            onClick={() => setPrintReceiptOrder(order)}
                            title="View bill & tax invoice"
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
                            onClick={() => setPrintReceiptOrder(order)}
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
            background: "rgba(0, 0, 0, 0.65)",
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
                  {availableFoodItems.slice(0, 35).map((dish) => {
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

                {/* Payment Method */}
                <div>
                  <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: "0.3rem" }}>
                    Payment Mode
                  </label>
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    {["UPI", "Cash"].map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setNewPaymentMethod(mode)}
                        style={{
                          flex: 1,
                          height: "36px",
                          borderRadius: "8px",
                          border: newPaymentMethod === mode ? "1px solid #ea580c" : "1px solid var(--border-card)",
                          background: newPaymentMethod === mode ? "rgba(234, 88, 12, 0.1)" : "var(--bg-main)",
                          color: newPaymentMethod === mode ? "#ea580c" : "var(--text-main)",
                          fontSize: "0.82rem",
                          fontWeight: 700,
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
                    borderRadius: "10px",
                    padding: "0.75rem 0.95rem",
                    border: "1px solid var(--border-card)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.3rem",
                    fontSize: "0.84rem",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", color: "var(--text-muted)" }}>
                    <span>Subtotal:</span>
                    <span style={{ fontWeight: 600 }}>₹ {cartSubtotal.toFixed(2)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", color: "var(--text-muted)" }}>
                    <span>GST (5%):</span>
                    <span style={{ fontWeight: 600 }}>₹ {cartGst.toFixed(2)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", color: "var(--text-muted)" }}>
                    <span>Service Charge (5%):</span>
                    <span style={{ fontWeight: 600 }}>₹ {cartServiceCharge.toFixed(2)}</span>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontWeight: 800,
                      fontSize: "1.05rem",
                      color: "#16a34a",
                      borderTop: "1px dashed var(--border-card)",
                      paddingTop: "0.45rem",
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
            background: "rgba(0, 0, 0, 0.65)",
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
