import { createMenuItemLookup, findMenuItem, isBeverageCategory } from "../kot/orderRouting";
import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  BarChart3, Wine,
  TrendingUp,
  TrendingDown,
Smartphone,
  Banknote,
  Utensils,
  Award,
  Calendar,
  ArrowRight,
  RefreshCw,
  Printer,
  FileSpreadsheet,
  Boxes,
  Receipt,
  Search,
  Download,
  RotateCcw,
  Clock,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  PieChart,
  Layers,
  Percent,
  Wallet,
  Scale,
  BookOpen,
  FileText,
  ShieldCheck,
} from "lucide-react";
import { formatCurrency, roundCurrency } from "../utils/formatCurrency";
import { DailyBalanceRegister } from "./accounting/DailyBalanceRegister";
import { ProfitLossStatementView } from "./accounting/ProfitLossStatementView";
import { TrialBalanceView } from "./accounting/TrialBalanceView";
import { StockSummaryReportView } from "./accounting/StockSummaryReportView";
import { BalanceSheetView } from "./accounting/BalanceSheetView";
import { ChartOfAccountsView } from "./accounting/ChartOfAccountsView";
import { GeneralLedgerView } from "./accounting/GeneralLedgerView";
import { JournalEntriesView } from "./accounting/JournalEntriesView";
import { AuditDocumentsView } from "./accounting/AuditDocumentsView";
import { getDailyBalances } from "./accounting/accountingService";
import { printSurface } from "../utils/printSurface";
import { apiGetInventory } from "../api/inventoryApi";
import { requestLiveInvoiceRecords } from "../utils/liveInvoiceData";
import {
  dedupeOrders,
  sortOrdersBySettlementTime,
  normalizePaymentMethod,
  parseOrderToYMD,
} from '../utils/orderDedupe';
import { deduplicateAndNormalizeInventory } from './AdminInventory';

const normalizeInventoryList = (items) => {
  if (!Array.isArray(items)) return [];
  try {
    if (typeof deduplicateAndNormalizeInventory === "function") {
      const res = deduplicateAndNormalizeInventory(items);
      if (Array.isArray(res) && res.length > 0) return res;
    }
  } catch {}
  const map = new Map();
  items.forEach((item, index) => {
    if (!item) return;
    const name = String(item.name || item.ingredientName || "").trim();
    if (!name) return;
    const key = name.toLowerCase().replace(/[^a-z0-9]/g, "");
    const stockVal = Number(item.stock ?? item.currentStock ?? 0);
    const minVal = Number(item.minThreshold ?? item.minimumThreshold ?? 0);
    const mrpVal = Number(item.mrp ?? item.unitCost ?? 0);
    const unitVal = item.unit === "Litres" ? "L" : (item.unit || "KG");
    if (map.has(key)) {
      const prev = map.get(key);
      map.set(key, {
        ...prev,
        stock: Math.max(prev.stock, stockVal),
        mrp: mrpVal || prev.mrp,
        unitCost: mrpVal || prev.unitCost,
      });
    } else {
      map.set(key, {
        id: String(item.id || `inv-${index + 1}`),
        name: name,
        category: item.category || "General Supplies",
        subcategory: item.subcategory || "",
        supplier: item.supplier || "Local Supplier",
        unit: unitVal,
        stock: stockVal,
        minThreshold: minVal,
        mrp: mrpVal,
        unitCost: mrpVal,
        lastRestocked: item.lastRestocked || "Recent",
      });
    }
  });
  return Array.from(map.values());
};

const getInventoryPurchaseCost = (purchase) => {
  const total = Number(purchase.totalCost);
  if (Number.isFinite(total)) return total;
  return (Number(purchase.quantity) || 0) * (Number(purchase.unitCost) || 0);
};

async function requestLiveReportData({ refresh = false } = {}) {
  if (!refresh) {
    return {
      records: Array.isArray(pastOrders) ? pastOrders : [],
      invoiceError: "",
      inventory: normalizeInventoryList(Array.isArray(inventory) ? inventory : []),
    };
  }

  const [invoiceResult, inventoryResponse] = await Promise.all([
    requestLiveInvoiceRecords(),
    apiGetInventory(),
  ]);
  if (invoiceResult.error && invoiceResult.records.length === 0) {
    throw new Error(invoiceResult.error);
  }

  const inventoryPayload = inventoryResponse?.data ?? inventoryResponse;
  const inventoryRows = Array.isArray(inventoryPayload)
    ? inventoryPayload
    : Array.isArray(inventoryPayload?.data)
      ? inventoryPayload.data
      : Array.isArray(inventoryPayload?.ingredients)
        ? inventoryPayload.ingredients
        : [];

  return {
    records: invoiceResult.records,
    invoiceError: invoiceResult.error,
    inventory: normalizeInventoryList(inventoryRows),
  };
}

export function AdminReports({
  mode = "all",
  pastOrders = [],
  menuItems = [],
  restaurantSettings = {},
  inventory = [],
  staffList = [],
  salaryPayments = [],
  inventoryPurchases = [],
  initialTab = "sales",
}) {
  const isBarMode = mode === "bar";
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const currentDate = now.getDate();
  const currentDayOfWeek = now.getDay();
  const pad2 = (n) => String(n).padStart(2, "0");
  const formatYMD = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

  // Daily
  const todayYMD = formatYMD(now);
  const yesterdayDate = new Date(currentYear, currentMonth, currentDate - 1);
  const yesterdayYMD = formatYMD(yesterdayDate);

  // Weekly
  const sevenDaysAgoDate = new Date(currentYear, currentMonth, currentDate - 6);
  const sevenDaysYMD = formatYMD(sevenDaysAgoDate);
  const mondayOffset = (currentDayOfWeek + 6) % 7;
  const thisWeekStartDate = new Date(currentYear, currentMonth, currentDate - mondayOffset);
  const thisWeekStartYMD = formatYMD(thisWeekStartDate);
  const lastWeekStartDate = new Date(currentYear, currentMonth, currentDate - mondayOffset - 7);
  const lastWeekEndDate = new Date(currentYear, currentMonth, currentDate - mondayOffset - 1);
  const lastWeekStartYMD = formatYMD(lastWeekStartDate);
  const lastWeekEndYMD = formatYMD(lastWeekEndDate);

  // Monthly
  const currentMonthPrefix = `${currentYear}-${pad2(currentMonth + 1)}`;
  const thisMonthStartYMD = `${currentMonthPrefix}-01`;
  const thisMonthEndDay = new Date(currentYear, currentMonth + 1, 0).getDate();
  const thisMonthEndYMD = `${currentMonthPrefix}-${pad2(thisMonthEndDay)}`;
  const lastMonthDate = new Date(currentYear, currentMonth - 1, 1);
  const lastMonthYear = lastMonthDate.getFullYear();
  const lastMonthNum = lastMonthDate.getMonth() + 1;
  const lastMonthPrefix = `${lastMonthYear}-${pad2(lastMonthNum)}`;
  const lastMonthStartYMD = `${lastMonthPrefix}-01`;
  const lastMonthEndDay = new Date(lastMonthYear, lastMonthNum, 0).getDate();
  const lastMonthEndYMD = `${lastMonthPrefix}-${pad2(lastMonthEndDay)}`;

  // Quarterly
  const currentQNum = Math.floor(currentMonth / 3) + 1;
  const qStartMonth = (currentQNum - 1) * 3;
  const currentQStartDate = new Date(currentYear, qStartMonth, 1);
  const currentQEndDate = new Date(currentYear, qStartMonth + 3, 0);
  const currentQStartYMD = formatYMD(currentQStartDate);
  const currentQEndYMD = formatYMD(currentQEndDate);
  const lastQNum = currentQNum === 1 ? 4 : currentQNum - 1;
  const lastQYear = currentQNum === 1 ? currentYear - 1 : currentYear;
  const lastQStartMonth = (lastQNum - 1) * 3;
  const lastQStartDate = new Date(lastQYear, lastQStartMonth, 1);
  const lastQEndDate = new Date(lastQYear, lastQStartMonth + 3, 0);
  const lastQStartYMD = formatYMD(lastQStartDate);
  const lastQEndYMD = formatYMD(lastQEndDate);

  // Yearly
  const thisYearStartYMD = `${currentYear}-01-01`;
  const thisYearEndYMD = `${currentYear}-12-31`;
  const lastYearStartYMD = `${currentYear - 1}-01-01`;
  const lastYearEndYMD = `${currentYear - 1}-12-31`;

  const menuLookup = useMemo(() => createMenuItemLookup(menuItems), [menuItems]);

  const isBarItem = (item) => {
    if (!item) return false;
    const name = item.name || item.dishName || item.menuItemName || "";
    const menuItem = findMenuItem(menuLookup, { ...item, menuItemId: item.menuItemId ?? item.menu_item_id ?? item.id }) ||
      (menuItems || []).find((c) => String(c.name || "").trim().toLowerCase() === String(name).trim().toLowerCase());
    return isBeverageCategory(menuItem?.category ?? menuItem?.categoryName ?? item.category ?? item.categoryName ?? item.subcategory ?? name);
  };

  const isBarOrder = (order) => {
    if (!order) return false;
    if (order.source === "bar" || order.orderType === "bar" || order.isBarOrder) return true;
    const items = Array.isArray(order.items) ? order.items : [];
    return items.some(isBarItem);
  };

  const isBarInventoryItem = (item) => {
    if (!item) return false;
    const name = String(item.name || "").trim().toLowerCase();
    const cat = String(item.category || item.subcategory || "").trim().toLowerCase();
    if (
      name.includes("handi") || name.includes("foil") || name.includes("container") ||
      name.includes("tray") || name.includes("takeaway") || name.includes("chicken") ||
      name.includes("mutton") || name.includes("biryani") || name.includes("paneer") ||
      name.includes("naan") || name.includes("roti") || name.includes("kebab") ||
      name.includes("shawarma") || cat.includes("packaging") || cat.includes("disposable") ||
      cat.includes("produce") || cat.includes("meat") || cat.includes("grain") ||
      cat.includes("spice") || cat.includes("hygiene") || cat.includes("cleaning")
    ) {
      return false;
    }
    return isBeverageCategory(item.category ?? item.subcategory ?? item.name);
  };

  const [showAllDishes, setShowAllDishes] = useState(false);
  const [isCornerDateOpen, setIsCornerDateOpen] = useState(false);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const cornerDateRef = useRef(null);
  const exportMenuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (cornerDateRef.current && !cornerDateRef.current.contains(e.target)) {
        setIsCornerDateOpen(false);
      }
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target)) {
        setIsExportMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  const [filterPeriod, setFilterPeriod] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isFetching, setIsFetching] = useState(true);
  const [invoicesData, setInvoicesData] = useState([]);
  const [invoiceLoadError, setInvoiceLoadError] = useState("");
  const ordersLoaded = !isFetching;
  const startInputRef = useRef(null);

  // Single-Page View Mode Tabs
  // 'sales' | 'statement' | 'income' | 'expenditure' | 'daily-register' | 'coa' | 'general-ledger' | 'journal-entries' | etc.
  const [activeTab, setActiveTab] = useState(initialTab || 'sales');

  useEffect(() => {
    if (initialTab && initialTab !== 'sales') {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  const tabsScrollRef = useRef(null);

  useEffect(() => {
    if (tabsScrollRef.current) {
      const activeEl = tabsScrollRef.current.querySelector('[data-active="true"]');
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }
    }
  }, [activeTab]);

  const [expenditureView, setExpenditureView] = useState('inventory');

  // Search & Filter State
  const [incomeSearch, setIncomeSearch] = useState('');
  const [invSearch, setInvSearch] = useState('');
  const [invCategoryFilter, setInvCategoryFilter] = useState('all');

  // Compact Viewport Pagination
  const ITEMS_PER_PAGE = 8;
  const [ordersPage, setOrdersPage] = useState(1);
  const [invPage, setInvPage] = useState(1);

  // Reset pagination on search / filter updates
  useEffect(() => {
    setOrdersPage(1);
  }, [incomeSearch, filterPeriod, startDate, endDate]);

  useEffect(() => {
    setInvPage(1);
  }, [invSearch, invCategoryFilter]);

  // Real-time Inventory State
  const [liveInventory, setLiveInventory] = useState(() => {
    if (Array.isArray(inventory) && inventory.length > 0)
      return normalizeInventoryList(inventory);
    try {
      const saved = localStorage.getItem('gourmet_pos_inventory_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return normalizeInventoryList(parsed);
      }
    } catch {
      return [];
    }
    return [];
  });

  useEffect(() => {
    if (Array.isArray(inventory) && inventory.length > 0) {
      setLiveInventory(normalizeInventoryList(inventory));
    }
  }, [inventory]);

  useEffect(() => {
    const handleUpdate = (e) => {
      if (Array.isArray(e.detail) && e.detail.length > 0)
        setLiveInventory(normalizeInventoryList(e.detail));
    };
    const handleStorage = (e) => {
      if (e.key === 'gourmet_pos_inventory_v1' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setLiveInventory(normalizeInventoryList(parsed));
          }
        } catch {}
      }
    };
    window.addEventListener('avsr-inventory-updated', handleUpdate);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('avsr-inventory-updated', handleUpdate);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const ordersData = useMemo(() => {
    const sourceList = Array.isArray(invoicesData)
      ? invoicesData
      : (Array.isArray(pastOrders) ? pastOrders : []);
    const sorted = sortOrdersBySettlementTime(dedupeOrders(sourceList));
    if (!isBarMode) return sorted;
    return sorted.filter(isBarOrder);
  }, [invoicesData, pastOrders, isBarMode]);

  const handleSelectPeriod = (periodId) => {
    setFilterPeriod(periodId);
    if (periodId === "today") {
      setStartDate(todayYMD);
      setEndDate(todayYMD);
    } else if (periodId === "yesterday") {
      setStartDate(yesterdayYMD);
      setEndDate(yesterdayYMD);
    } else if (periodId === "single_date") {
      const target = startDate && startDate <= todayYMD ? startDate : todayYMD;
      setStartDate(target);
      setEndDate(target);
    } else if (periodId === "this_week") {
      setStartDate(thisWeekStartYMD);
      setEndDate(todayYMD);
    } else if (periodId === "week") {
      setStartDate(sevenDaysYMD);
      setEndDate(todayYMD);
    } else if (periodId === "last_week") {
      setStartDate(lastWeekStartYMD);
      setEndDate(lastWeekEndYMD);
    } else if (periodId === "this_month" || periodId === "month") {
      setStartDate(thisMonthStartYMD);
      setEndDate(todayYMD);
    } else if (periodId === "last_month") {
      setStartDate(lastMonthStartYMD);
      setEndDate(lastMonthEndYMD);
    } else if (periodId === "this_quarter") {
      setStartDate(currentQStartYMD);
      setEndDate(todayYMD);
    } else if (periodId === "last_quarter") {
      setStartDate(lastQStartYMD);
      setEndDate(lastQEndYMD);
    } else if (periodId === "this_year") {
      setStartDate(thisYearStartYMD);
      setEndDate(todayYMD);
    } else if (periodId === "last_year") {
      setStartDate(lastYearStartYMD);
      setEndDate(lastYearEndYMD);
    } else if (periodId === "custom") {
      if (!startDate) setStartDate(thisMonthStartYMD);
      if (!endDate) setEndDate(todayYMD);
    } else if (periodId === "all") {
      setStartDate("");
      setEndDate("");
    }
  };

  const filteredOrders = useMemo(() => {
    return ordersData.filter((order) => {
      if (filterPeriod === "all") return true;
      const orderYMD = parseOrderToYMD(order);
      if (!orderYMD) return false;
      if (filterPeriod === "today") return orderYMD === todayYMD;
      if (filterPeriod === "yesterday") return orderYMD === yesterdayYMD;
      if (filterPeriod === "single_date") {
        const target = startDate || todayYMD;
        return orderYMD === target;
      }
      if (filterPeriod === "this_week") return orderYMD >= thisWeekStartYMD && orderYMD <= todayYMD;
      if (filterPeriod === "week") return orderYMD >= sevenDaysYMD && orderYMD <= todayYMD;
      if (filterPeriod === "last_week") return orderYMD >= lastWeekStartYMD && orderYMD <= lastWeekEndYMD;
      if (filterPeriod === "this_month" || filterPeriod === "month") return orderYMD >= thisMonthStartYMD && orderYMD <= thisMonthEndYMD;
      if (filterPeriod === "last_month") return orderYMD >= lastMonthStartYMD && orderYMD <= lastMonthEndYMD;
      if (filterPeriod === "this_quarter") return orderYMD >= currentQStartYMD && orderYMD <= currentQEndYMD;
      if (filterPeriod === "last_quarter") return orderYMD >= lastQStartYMD && orderYMD <= lastQEndYMD;
      if (filterPeriod === "this_year") return orderYMD >= thisYearStartYMD && orderYMD <= thisYearEndYMD;
      if (filterPeriod === "last_year") return orderYMD >= lastYearStartYMD && orderYMD <= lastYearEndYMD;
      if (filterPeriod === "custom") {
        if (startDate && endDate) {
          const from = startDate <= endDate ? startDate : endDate;
          const to = startDate <= endDate ? endDate : startDate;
          return orderYMD >= from && orderYMD <= to;
        }
        if (startDate) return orderYMD >= startDate;
        if (endDate) return orderYMD <= endDate;
        return true;
      }
      return true;
    });
  }, [
    ordersData,
    filterPeriod,
    todayYMD,
    yesterdayYMD,
    sevenDaysYMD,
    thisWeekStartYMD,
    lastWeekStartYMD,
    lastWeekEndYMD,
    thisMonthStartYMD,
    thisMonthEndYMD,
    lastMonthStartYMD,
    lastMonthEndYMD,
    currentQStartYMD,
    currentQEndYMD,
    lastQStartYMD,
    lastQEndYMD,
    thisYearStartYMD,
    thisYearEndYMD,
    lastYearStartYMD,
    lastYearEndYMD,
    startDate,
    endDate,
  ]);

  const totalRevenue = filteredOrders.reduce((sum, order) => {
    const grandTotal = Number(
      order.grandTotal ?? order.totalAmount ?? order.finalTotal ?? order.amount ?? order.total ?? 0,
    ) || 0;
    return sum + Math.max(0, grandTotal);
  }, 0);

  const totalTax = filteredOrders.reduce(
    (sum, o) => sum + (Number(o.taxAmount) || 0),
    0
  );

  const totalService = filteredOrders.reduce(
    (sum, o) => sum + (Number(o.serviceChargeAmount) || 0),
    0
  );
  const totalDiscount = filteredOrders.reduce(
    (sum, order) => sum + (Number(order.discountAmount) || 0),
    0,
  );
  const averageBill = filteredOrders.length
    ? totalRevenue / filteredOrders.length
    : 0;

  // Payment breakdown
  const getPaymentTotal = (order, channel) => {
    if (Array.isArray(order.payments) && order.payments.length > 0) {
      return order.payments.reduce(
        (sum, payment) =>
          normalizePaymentMethod(payment) === channel
            ? sum + (Number(payment.amount ?? payment.Amount) || 0)
            : sum,
        0,
      );
    }
    return normalizePaymentMethod(order) === channel
      ? Number(order.grandTotal ?? order.totalAmount ?? order.finalTotal ?? order.total ?? order.paidAmount ?? 0) || 0
      : 0;
  };

  const dineInRevenue = filteredOrders
    .filter((o) => {
      const t = String(o.table || o.tableName || '').toLowerCase();
      return t.includes('table') || (t && !t.includes('takeaway') && !t.includes('delivery'));
    })
    .reduce((s, o) => s + (Number(o.grandTotal ?? o.total) || 0), 0);

  const takeawayRevenue = Math.max(0, totalRevenue - dineInRevenue);

  const paymentStats = {
    upi: filteredOrders.reduce(
      (sum, order) => sum + getPaymentTotal(order, "upi"),
      0,
    ),
    cash: filteredOrders.reduce(
      (sum, order) => sum + getPaymentTotal(order, "cash"),
      0,
    ),
    card: filteredOrders.reduce(
      (sum, order) => sum + getPaymentTotal(order, "card"),
      0,
    ),
  };

  const upiPercent = totalRevenue
    ? Math.round((paymentStats.upi / totalRevenue) * 100)
    : 0;
  const cashPercent = totalRevenue
    ? Math.max(0, 100 - upiPercent)
    : 0;

  // Top selling dishes across settled orders
  const sortedDishes = useMemo(() => {
    const dishCounts = {};
    filteredOrders.forEach((o) => {
      (o.items || []).forEach((item) => {
        const name = item.name || 'Dish';
        dishCounts[name] = (dishCounts[name] || 0) + (item.quantity || 1);
      });
    });
    return Object.entries(dishCounts).sort((a, b) => b[1] - a[1]);
  }, [filteredOrders]);

  const displayedDishes = showAllDishes ? sortedDishes : sortedDishes.slice(0, 3);

  // ================= INVENTORY & EXPENDITURE CALCULATIONS =================
  const inventoryItems = useMemo(() => {
    const base = Array.isArray(liveInventory) ? liveInventory : [];
    if (!isBarMode) return base;
    return base.filter(isBarInventoryItem);
  }, [liveInventory, isBarMode]);

  const totalInventoryCost = useMemo(() => {
    return inventoryItems.reduce((sum, item) => {
      const stock = Number(item.stock ?? 0);
      const mrp = Number(item.mrp ?? item.unitCost ?? 0);
      return sum + (stock > 0 && mrp > 0 ? stock * mrp : 0);
    }, 0);
  }, [inventoryItems]);

  const filteredInventoryPurchases = useMemo(() => {
    return (Array.isArray(inventoryPurchases) ? inventoryPurchases : [])
      .filter((purchase) => {
        const purchaseDate = String(purchase.purchaseDate || purchase.paidOn || "").slice(0, 10);
        const department = String(purchase.department || "dine").toLowerCase();
        return Boolean(purchaseDate) &&
          (filterPeriod === "all" || (!startDate || purchaseDate >= startDate) && (!endDate || purchaseDate <= endDate)) &&
          (!isBarMode || department === "bar");
      })
      .sort((a, b) => String(b.purchaseDate || "").localeCompare(String(a.purchaseDate || "")));
  }, [inventoryPurchases, filterPeriod, startDate, endDate, isBarMode]);

  const filteredSalaryPayments = useMemo(() => {
    return (Array.isArray(salaryPayments) ? salaryPayments : [])
      .map((payment) => ({
        ...payment,
        amount: Number(payment.amount) || 0,
        paidOn: String(payment.paidOn || "").slice(0, 10),
      }))
      .filter((payment) =>
        Boolean(payment.paidOn) &&
        (filterPeriod === "all" || (!startDate || payment.paidOn >= startDate) && (!endDate || payment.paidOn <= endDate)))
      .sort((a, b) => b.paidOn.localeCompare(a.paidOn));
  }, [salaryPayments, filterPeriod, startDate, endDate]);

  const inventoryCategories = useMemo(() => {
    const set = new Set();
    inventoryItems.forEach((item) => {
      if (item.category) set.add(item.category);
    });
    return Array.from(set).sort();
  }, [inventoryItems]);

  const totalInventoryPurchaseCost = useMemo(
    () => filteredInventoryPurchases.reduce((sum, purchase) => sum + getInventoryPurchaseCost(purchase), 0),
    [filteredInventoryPurchases],
  );
  const dineInventoryPurchaseCost = useMemo(
    () => filteredInventoryPurchases.reduce(
      (sum, purchase) => sum + (String(purchase.department || "dine").toLowerCase() === "bar" ? 0 : getInventoryPurchaseCost(purchase)),
      0,
    ),
    [filteredInventoryPurchases],
  );
  const barInventoryPurchaseCost = useMemo(
    () => filteredInventoryPurchases.reduce(
      (sum, purchase) => sum + (String(purchase.department || "").toLowerCase() === "bar" ? getInventoryPurchaseCost(purchase) : 0),
      0,
    ),
    [filteredInventoryPurchases],
  );
  const totalSalaryPaid = useMemo(
    () => filteredSalaryPayments.reduce((sum, payment) => sum + payment.amount, 0),
    [filteredSalaryPayments],
  );
  const monthlyPayrollBudget = useMemo(
    () => (Array.isArray(staffList) ? staffList : []).reduce((sum, person) => {
      const active = person.isActive !== false && String(person.status || "").toLowerCase() !== "inactive";
      return sum + (active ? Number(person.monthlySalary) || 0 : 0);
    }, 0),
    [staffList],
  );

  const totalIngredientUsageCost = useMemo(() => {
    return inventoryItems.reduce((sum, item) => {
      const used = Number(item.totalUsed ?? 0);
      const cost = Number(item.mrp ?? item.unitCost ?? 0);
      return sum + (used > 0 && cost > 0 ? used * cost : 0);
    }, 0);
  }, [inventoryItems]);

  const inventoryCategoryBreakdown = useMemo(() => {
    const map = {};
    inventoryItems.forEach((item) => {
      const cat = item.category || 'General';
      const stock = Number(item.stock ?? 0);
      const mrp = Number(item.mrp ?? item.unitCost ?? 0);
      const val = stock > 0 && mrp > 0 ? stock * mrp : 0;
      map[cat] = (map[cat] || 0) + val;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [inventoryItems]);

  const outOfStockCount = useMemo(() => {
    return inventoryItems.filter((i) => Number(i.stock ?? 0) <= 0).length;
  }, [inventoryItems]);

  const lowStockCount = useMemo(() => {
    return inventoryItems.filter((i) => {
      const st = Number(i.stock ?? 0);
      const th = Number(i.minThreshold ?? 0);
      return st > 0 && st <= th;
    }).length;
  }, [inventoryItems]);

  // ================= PROFIT & LOSS FORMULAS =================
  const plIncome = totalRevenue;
  const plExpenditure = totalInventoryPurchaseCost + totalSalaryPaid + totalDiscount;
  const costOfGoodsSold = totalIngredientUsageCost;
  const plNet = plIncome - plExpenditure;
  const isProfit = plNet >= 0;
  const grossFoodSales = Math.max(0, totalRevenue - totalTax - totalService);
  const netRevenueAfterDiscount = Math.max(0, totalRevenue - totalDiscount);
  const profitMarginPercent = plIncome > 0 ? ((plNet / plIncome) * 100).toFixed(1) : '0.0';
  const absMarginPercent = plIncome > 0 ? Math.abs((plNet / plIncome) * 100).toFixed(1) : '0.0';

  // Filtered Income Table Orders
  const searchedOrders = useMemo(() => {
    if (!incomeSearch.trim()) return filteredOrders;
    const q = incomeSearch.toLowerCase().trim();
    return filteredOrders.filter((ord) => {
      const idMatch = String(ord.id || ord.orderNumber || '').toLowerCase().includes(q);
      const tableMatch = String(ord.table || ord.tableName || '').toLowerCase().includes(q);
      const itemMatch = (ord.items || []).some((it) => String(it.name || '').toLowerCase().includes(q));
      const payMatch = String(normalizePaymentMethod(ord)).toLowerCase().includes(q);
      return idMatch || tableMatch || itemMatch || payMatch;
    });
  }, [filteredOrders, incomeSearch]);

  // Paginated Orders for Compact Single-Page Display
  const totalOrdersPages = Math.max(1, Math.ceil(searchedOrders.length / ITEMS_PER_PAGE));
  const paginatedOrders = useMemo(() => {
    const start = (ordersPage - 1) * ITEMS_PER_PAGE;
    return searchedOrders.slice(start, start + ITEMS_PER_PAGE);
  }, [searchedOrders, ordersPage]);

  // Filtered Inventory Table Items
  const searchedInventory = useMemo(() => {
    return inventoryItems.filter((item) => {
      if (invCategoryFilter !== 'all' && item.category !== invCategoryFilter) {
        return false;
      }
      if (!invSearch.trim()) return true;
      const q = invSearch.toLowerCase().trim();
      return (
        String(item.name || '').toLowerCase().includes(q) ||
        String(item.category || '').toLowerCase().includes(q) ||
        String(item.supplier || '').toLowerCase().includes(q)
      );
    });
  }, [inventoryItems, invSearch, invCategoryFilter]);

  // Paginated Inventory for Compact Single-Page Display
  const totalInvPages = Math.max(1, Math.ceil(searchedInventory.length / ITEMS_PER_PAGE));
  const paginatedInventory = useMemo(() => {
    const start = (invPage - 1) * ITEMS_PER_PAGE;
    return searchedInventory.slice(start, start + ITEMS_PER_PAGE);
  }, [searchedInventory, invPage]);

  const applyFetchedData = (data) => {
    setInvoicesData(data.records);
    setInvoiceLoadError(data.invoiceError);
    if (data.inventory.length > 0) {
      setLiveInventory(data.inventory);
      try {
        localStorage.setItem('gourmet_pos_inventory_v1', JSON.stringify(data.inventory));
      } catch {}
    }
  };

  const handleFetchData = async () => {
    setIsFetching(true);
    setInvoiceLoadError("");
    try {
      applyFetchedData(await requestLiveReportData({ refresh: true }));
    } catch (error) {
      setInvoicesData([]);
      setInvoiceLoadError(error?.message || "Live invoice and report data could not be loaded.");
    } finally {
      setIsFetching(false);
    }
  };

  useEffect(() => {
    let active = true;
    requestLiveReportData({ refresh: true })
      .then((data) => {
        if (active) applyFetchedData(data);
      })
      .catch((error) => {
        if (!active) return;
        setInvoiceLoadError(error?.message || "Live invoice and report data could not be loaded.");
      })
      .finally(() => {
        if (active) setIsFetching(false);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    applyFetchedData({
      records: Array.isArray(pastOrders) ? pastOrders : [],
      invoiceError: "",
      inventory: normalizeInventoryList(Array.isArray(inventory) ? inventory : []),
    });
  }, [pastOrders, inventory]);

  const getFilterPeriodLabel = () => {
    if (filterPeriod === "today") return `Today (${todayYMD})`;
    if (filterPeriod === "yesterday") return `Yesterday (${yesterdayYMD})`;
    if (filterPeriod === "single_date") return `Particular Date (${startDate || todayYMD})`;
    if (filterPeriod === "this_week") return `This Week (${thisWeekStartYMD} to ${todayYMD})`;
    if (filterPeriod === "week") return `Last 7 Days (${sevenDaysYMD} to ${todayYMD})`;
    if (filterPeriod === "last_week") return `Last Week (${lastWeekStartYMD} to ${lastWeekEndYMD})`;
    if (filterPeriod === "this_month" || filterPeriod === "month") return `This Month (${now.toLocaleString("default", { month: "short" })} ${currentYear})`;
    if (filterPeriod === "last_month") return `Last Month (${lastMonthDate.toLocaleString("default", { month: "short" })} ${lastMonthYear})`;
    if (filterPeriod === "this_quarter") return `This Quarter (Q${currentQNum} ${currentYear})`;
    if (filterPeriod === "last_quarter") return `Last Quarter (Q${lastQNum} ${lastQYear})`;
    if (filterPeriod === "this_year") return `This Year (${currentYear})`;
    if (filterPeriod === "last_year") return `Last Year (${currentYear - 1})`;
    if (filterPeriod === "all") return "All Time (Complete History)";
    if (filterPeriod === "custom") {
      if (startDate && endDate) {
        return startDate === endDate ? startDate : `${startDate} to ${endDate}`;
      }
      if (startDate) return `From ${startDate}`;
      if (endDate) return `Until ${endDate}`;
      return "Custom Date Range";
    }
    return "All Time";
  };

  const formatPrettyDate = (ymd) => {
    if (!ymd || typeof ymd !== 'string') return '';
    const parts = ymd.split('-');
    if (parts.length !== 3) return ymd;
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const y = parts[0];
    const m = parseInt(parts[1], 10) - 1;
    const d = parts[2].padStart(2, '0');
    return `${d}-${months[m] || parts[1]}-${y}`;
  };

  const formatDottedDate = (ymd) => {
    if (!ymd || typeof ymd !== 'string') return '';
    const parts = ymd.split('-');
    if (parts.length !== 3) return ymd;
    return `${parts[2].padStart(2, '0')}.${parts[1].padStart(2, '0')}.${parts[0]}`;
  };

  const getCornerDateLabel = () => {
    if (filterPeriod === 'today') return formatPrettyDate(todayYMD);
    if (filterPeriod === 'yesterday') return formatPrettyDate(yesterdayYMD);
    if (filterPeriod === 'single_date') return formatPrettyDate(startDate || todayYMD);
    if (filterPeriod === 'this_week') return `${formatPrettyDate(thisWeekStartYMD)} to ${formatPrettyDate(todayYMD)}`;
    if (filterPeriod === 'week') return `${formatPrettyDate(sevenDaysYMD)} to ${formatPrettyDate(todayYMD)}`;
    if (filterPeriod === 'last_week') return `${formatPrettyDate(lastWeekStartYMD)} to ${formatPrettyDate(lastWeekEndYMD)}`;
    if (filterPeriod === 'this_month' || filterPeriod === 'month') return `${formatPrettyDate(thisMonthStartYMD)} to ${formatPrettyDate(thisMonthEndYMD)}`;
    if (filterPeriod === 'last_month') return `${formatPrettyDate(lastMonthStartYMD)} to ${formatPrettyDate(lastMonthEndYMD)}`;
    if (filterPeriod === 'this_quarter') return `${formatPrettyDate(currentQStartYMD)} to ${formatPrettyDate(currentQEndYMD)}`;
    if (filterPeriod === 'last_quarter') return `${formatPrettyDate(lastQStartYMD)} to ${formatPrettyDate(lastQEndYMD)}`;
    if (filterPeriod === 'this_year') return `${formatPrettyDate(thisYearStartYMD)} to ${formatPrettyDate(thisYearEndYMD)}`;
    if (filterPeriod === 'last_year') return `${formatPrettyDate(lastYearStartYMD)} to ${formatPrettyDate(lastYearEndYMD)}`;
    if (filterPeriod === 'custom') {
      if (startDate && endDate) {
        return startDate === endDate ? formatPrettyDate(startDate) : `${formatPrettyDate(startDate)} to ${formatPrettyDate(endDate)}`;
      }
      if (startDate) return `From ${formatPrettyDate(startDate)}`;
      if (endDate) return `Until ${formatPrettyDate(endDate)}`;
      return 'Custom Dates';
    }
    return 'All Time';
  };

  const getExcelPeriodDateText = () => {
    if (filterPeriod === 'today') return formatDottedDate(todayYMD);
    if (filterPeriod === 'yesterday') return formatDottedDate(yesterdayYMD);
    if (filterPeriod === 'single_date') return formatDottedDate(startDate || todayYMD);
    if (filterPeriod === 'this_week') return `${formatDottedDate(thisWeekStartYMD)} - ${formatDottedDate(todayYMD)}`;
    if (filterPeriod === 'week') return `${formatDottedDate(sevenDaysYMD)} - ${formatDottedDate(todayYMD)}`;
    if (filterPeriod === 'last_week') return `${formatDottedDate(lastWeekStartYMD)} - ${formatDottedDate(lastWeekEndYMD)}`;
    if (filterPeriod === 'this_month' || filterPeriod === 'month') return `${formatDottedDate(thisMonthStartYMD)} - ${formatDottedDate(thisMonthEndYMD)}`;
    if (filterPeriod === 'last_month') return `${formatDottedDate(lastMonthStartYMD)} - ${formatDottedDate(lastMonthEndYMD)}`;
    if (filterPeriod === 'this_quarter') return `${formatDottedDate(currentQStartYMD)} - ${formatDottedDate(currentQEndYMD)}`;
    if (filterPeriod === 'last_quarter') return `${formatDottedDate(lastQStartYMD)} - ${formatDottedDate(lastQEndYMD)}`;
    if (filterPeriod === 'this_year') return `${formatDottedDate(thisYearStartYMD)} - ${formatDottedDate(thisYearEndYMD)}`;
    if (filterPeriod === 'last_year') return `${formatDottedDate(lastYearStartYMD)} - ${formatDottedDate(lastYearEndYMD)}`;
    if (filterPeriod === 'custom') {
      if (startDate && endDate) {
        return startDate === endDate ? formatDottedDate(startDate) : `${formatDottedDate(startDate)} - ${formatDottedDate(endDate)}`;
      }
      if (startDate) return `From ${formatDottedDate(startDate)}`;
      if (endDate) return `Until ${formatDottedDate(endDate)}`;
      return 'Custom Period';
    }
    return formatDottedDate(todayYMD);
  };

  const handleExportExcel = () => {
    try {
      const periodLabel = getFilterPeriodLabel();
      const safePeriodName = filterPeriod.replace(/[^a-zA-Z0-9]/g, '_');
      const activePeriodDates = getActiveDateRangeText();

      // Dynamic category breakdown rows from actual hotel POS inventory
      const categoryRowsHtml = (inventoryCategoryBreakdown || []).map(([cat, val], idx) => `
        <tr style="font-size: 10pt;">
          <td style="border: 1px solid #000000; text-align: center; padding: 5px 6px;">${idx + 2}</td>
          <td style="border: 1px solid #000000; padding: 5px 12px 5px 24px; font-weight: 500;">↳ ${cat} Stock Cost</td>
          <td style="border: 1px solid #000000; padding: 5px 8px; color: #4b5563;">Category inventory valuation</td>
          <td style="border: 1px solid #000000; padding: 5px 8px; text-align: center;">Ingredient Stock</td>
          <td style="border: 1px solid #000000;"></td>
          <td style="border: 1px solid #000000; text-align: right; padding: 5px 10px; mso-number-format: '0\\.00';">${val.toFixed(2)}</td>
          <td style="border: 1px solid #000000; text-align: right; padding: 5px 10px; color: #b91c1c; mso-number-format: '0\\.00';">-${val.toFixed(2)}</td>
        </tr>
      `).join('');

      // Dine purchases in period
      const dinePurchasesHtml = dineInventoryPurchaseCost > 0 ? `
        <tr style="font-size: 10pt;">
          <td style="border: 1px solid #000000; text-align: center; padding: 5px 6px;">•</td>
          <td style="border: 1px solid #000000; padding: 5px 12px 5px 24px; font-weight: 600;">↳ Dine Inventory Purchases</td>
          <td style="border: 1px solid #000000; padding: 5px 8px; color: #4b5563;">${filteredInventoryPurchases.filter(p => String(p.department || 'dine').toLowerCase() !== 'bar').length} recorded receipts in period</td>
          <td style="border: 1px solid #000000; padding: 5px 8px; text-align: center;">Dine Supplies</td>
          <td style="border: 1px solid #000000;"></td>
          <td style="border: 1px solid #000000; text-align: right; padding: 5px 10px; color: #b91c1c; font-weight: 600; mso-number-format: '0\\.00';">${dineInventoryPurchaseCost.toFixed(2)}</td>
          <td style="border: 1px solid #000000; text-align: right; padding: 5px 10px; color: #b91c1c; font-weight: 600; mso-number-format: '0\\.00';">-${dineInventoryPurchaseCost.toFixed(2)}</td>
        </tr>
      ` : '';

      // Bar purchases in period
      const barPurchasesHtml = barInventoryPurchaseCost > 0 ? `
        <tr style="font-size: 10pt;">
          <td style="border: 1px solid #000000; text-align: center; padding: 5px 6px;">•</td>
          <td style="border: 1px solid #000000; padding: 5px 12px 5px 24px; font-weight: 600;">↳ Bar Inventory Purchases</td>
          <td style="border: 1px solid #000000; padding: 5px 8px; color: #4b5563;">${filteredInventoryPurchases.filter(p => String(p.department || '').toLowerCase() === 'bar').length} recorded receipts in period</td>
          <td style="border: 1px solid #000000; padding: 5px 8px; text-align: center;">Bar Supplies</td>
          <td style="border: 1px solid #000000;"></td>
          <td style="border: 1px solid #000000; text-align: right; padding: 5px 10px; color: #b91c1c; font-weight: 600; mso-number-format: '0\\.00';">${barInventoryPurchaseCost.toFixed(2)}</td>
          <td style="border: 1px solid #000000; text-align: right; padding: 5px 10px; color: #b91c1c; font-weight: 600; mso-number-format: '0\\.00';">-${barInventoryPurchaseCost.toFixed(2)}</td>
        </tr>
      ` : '';

      // Salary in period
      const salaryHtml = totalSalaryPaid > 0 ? `
        <tr style="font-size: 10pt;">
          <td style="border: 1px solid #000000; text-align: center; padding: 5px 6px;">•</td>
          <td style="border: 1px solid #000000; padding: 5px 12px 5px 24px; font-weight: 600;">↳ Staff Salary Payments</td>
          <td style="border: 1px solid #000000; padding: 5px 8px; color: #4b5563;">${filteredSalaryPayments.length} staff payments recorded in period</td>
          <td style="border: 1px solid #000000; padding: 5px 8px; text-align: center;">Payroll</td>
          <td style="border: 1px solid #000000;"></td>
          <td style="border: 1px solid #000000; text-align: right; padding: 5px 10px; color: #b91c1c; font-weight: 600; mso-number-format: '0\\.00';">${totalSalaryPaid.toFixed(2)}</td>
          <td style="border: 1px solid #000000; text-align: right; padding: 5px 10px; color: #b91c1c; font-weight: 600; mso-number-format: '0\\.00';">-${totalSalaryPaid.toFixed(2)}</td>
        </tr>
      ` : '';

      const htmlContent = `
        <html xmlns:o="urn:schemas-microsoft-com:office:office"
              xmlns:x="urn:schemas-microsoft-com:office:excel"
              xmlns="http://www.w3.org/TR/REC-html40">
        <head>
          <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
          <!--[if gte mso 9]>
          <xml>
            <x:ExcelWorkbook>
              <x:ExcelWorksheets>
                <x:ExcelWorksheet>
                  <x:Name>Profit and loss statement</x:Name>
                  <x:WorksheetOptions>
                    <x:DisplayGridlines/>
                    <x:Print><x:ValidPrinterInfo/></x:Print>
                  </x:WorksheetOptions>
                </x:ExcelWorksheet>
              </x:ExcelWorksheets>
            </x:ExcelWorkbook>
          </xml>
          <![endif]-->
          <style>
            body { font-family: Calibri, 'Segoe UI', Arial, sans-serif; margin: 0; padding: 15px; background: #ffffff; color: #000000; }
            table { border-collapse: collapse; width: 100%; font-family: Calibri, 'Segoe UI', Arial, sans-serif; font-size: 10.5pt; }
            .banner { background-color: #D9EAD3 !important; font-size: 15pt; font-weight: bold; text-align: center; color: #1E4620; padding: 10px; border: 1px solid #000000; }
            .header-cell { background-color: #D9EAD3 !important; border: 1px solid #000000; font-weight: bold; font-size: 10.5pt; text-align: center; padding: 7px 6px; }
            .section-revenue { background-color: #E2EFDA !important; font-weight: bold; font-size: 11pt; padding: 7px 10px; border: 1px solid #000000; color: #166534; }
            .section-expenditure { background-color: #FCE4D6 !important; font-weight: bold; font-size: 11pt; padding: 7px 10px; border: 1px solid #000000; color: #991b1b; }
            .balance-row td { background-color: #D9EAD3 !important; border: 1px solid #000000; font-weight: bold; padding: 7px 8px; }
            .total-row td { border: 1px solid #000000; font-weight: bold; padding: 7px 8px; font-size: 11pt; }
          </style>
        </head>
        <body>
          <table>
            <colgroup>
              <col style="width: 45px;" />
              <col style="width: 270px;" />
              <col style="width: 310px;" />
              <col style="width: 170px;" />
              <col style="width: 135px;" />
              <col style="width: 135px;" />
              <col style="width: 145px;" />
            </colgroup>
            <tbody>
              <!-- Title Banner matching Ledger Reconciliation pattern -->
              <tr>
                <td colspan="7" class="banner">Profit &amp; Loss Statement (Revenue vs Expenditure)</td>
              </tr>

              <!-- Company & Header Info Block matching pattern -->
              <tr>
                <td colspan="4" style="font-size: 10pt; font-weight: bold; padding: 6px 6px 2px 6px;">Company Name: <span style="font-weight: normal;">AVSR FOOD COURT (Fine Dining &amp; POS)</span></td>
                <td colspan="3" style="font-size: 10pt; font-weight: bold; padding: 6px 6px 2px 6px;">Email ID: <span style="font-weight: normal;">admin@avsrfoodcourt.com</span></td>
              </tr>
              <tr>
                <td colspan="4" style="font-size: 10pt; font-weight: bold; padding: 2px 6px;">Address: <span style="font-weight: normal;">Food Court Campus, Main Road</span></td>
                <td colspan="3" style="font-size: 10pt; font-weight: bold; padding: 2px 6px;">Department: <span style="font-weight: normal;">${isBarMode ? "Bar &amp; Beverages" : "Fine Dining &amp; Food Court"}</span></td>
              </tr>
              <tr>
                <td colspan="4" style="font-size: 10pt; font-weight: bold; padding: 2px 6px;">Phone No.: <span style="font-weight: normal;">+91 98765 43210</span></td>
                <td colspan="3" style="font-size: 10pt; font-weight: bold; padding: 2px 6px;">Created By: <span style="font-weight: normal;">Admin</span></td>
              </tr>
              <tr>
                <td colspan="7" style="font-size: 10pt; font-weight: bold; padding: 2px 6px 12px 6px;">Time Period / Date: <span style="font-weight: normal;">${periodLabel} (${activePeriodDates})</span></td>
              </tr>

              <!-- Table Headers matching pattern -->
              <tr style="background-color: #D9EAD3;">
                <th class="header-cell">#</th>
                <th class="header-cell">Accounting Head</th>
                <th class="header-cell">Operational Context / Breakdown</th>
                <th class="header-cell">Department / Scope</th>
                <th class="header-cell">Revenue / Inflow (₹)</th>
                <th class="header-cell">Expenditure (₹)</th>
                <th class="header-cell">Net Balance (₹)</th>
              </tr>

              <!-- 1. OPERATING REVENUE (INCOME) -->
              <tr>
                <td colspan="7" class="section-revenue">1. OPERATING REVENUE (INCOME)</td>
              </tr>
              <tr style="font-size: 10pt;">
                <td style="border: 1px solid #000000; text-align: center; padding: 5px 6px;">1</td>
                <td style="border: 1px solid #000000; padding: 5px 8px; font-weight: bold; color: #166534;">${isBarMode ? "Gross Settled Bar Sales" : "Gross Settled Dining Sales"}</td>
                <td style="border: 1px solid #000000; padding: 5px 8px; color: #374151;">Revenue from ${filteredOrders.length} customer orders</td>
                <td style="border: 1px solid #000000; padding: 5px 8px; text-align: center;">Direct Customer Sales</td>
                <td style="border: 1px solid #000000; text-align: right; padding: 5px 10px; font-weight: bold; color: #166534; mso-number-format: '0\\.00';">${totalRevenue.toFixed(2)}</td>
                <td style="border: 1px solid #000000;"></td>
                <td style="border: 1px solid #000000; text-align: right; padding: 5px 10px; font-weight: bold; color: #166534; mso-number-format: '0\\.00';">+${totalRevenue.toFixed(2)}</td>
              </tr>
              <tr style="font-size: 10pt;">
                <td style="border: 1px solid #000000; text-align: center; padding: 5px 6px;">2</td>
                <td style="border: 1px solid #000000; padding: 5px 12px 5px 24px; color: #374151;">↳ ${isBarMode ? "Beverage" : "Food &amp; Beverage"} Net Sales</td>
                <td style="border: 1px solid #000000; padding: 5px 8px; color: #4b5563;">Bill total minus GST &amp; service charge</td>
                <td style="border: 1px solid #000000; padding: 5px 8px; text-align: center;">Kitchen / F&amp;B</td>
                <td style="border: 1px solid #000000; text-align: right; padding: 5px 10px; mso-number-format: '0\\.00';">${grossFoodSales.toFixed(2)}</td>
                <td style="border: 1px solid #000000;"></td>
                <td style="border: 1px solid #000000;"></td>
              </tr>
              ${dineInRevenue > 0 ? `
                <tr style="font-size: 10pt;">
                  <td style="border: 1px solid #000000; text-align: center; padding: 5px 6px;">3</td>
                  <td style="border: 1px solid #000000; padding: 5px 12px 5px 24px; color: #374151;">↳ Dine-In Customer Sales</td>
                  <td style="border: 1px solid #000000; padding: 5px 8px; color: #4b5563;">In-restaurant table dining settlements</td>
                  <td style="border: 1px solid #000000; padding: 5px 8px; text-align: center;">Table Dining</td>
                  <td style="border: 1px solid #000000; text-align: right; padding: 5px 10px; mso-number-format: '0\\.00';">${dineInRevenue.toFixed(2)}</td>
                  <td style="border: 1px solid #000000;"></td>
                  <td style="border: 1px solid #000000;"></td>
                </tr>
              ` : ''}
              ${takeawayRevenue > 0 ? `
                <tr style="font-size: 10pt;">
                  <td style="border: 1px solid #000000; text-align: center; padding: 5px 6px;">4</td>
                  <td style="border: 1px solid #000000; padding: 5px 12px 5px 24px; color: #374151;">↳ Takeaway &amp; Parcel Sales</td>
                  <td style="border: 1px solid #000000; padding: 5px 8px; color: #4b5563;">Direct counter &amp; parcel takeaway settlements</td>
                  <td style="border: 1px solid #000000; padding: 5px 8px; text-align: center;">Takeaway Counter</td>
                  <td style="border: 1px solid #000000; text-align: right; padding: 5px 10px; mso-number-format: '0\\.00';">${takeawayRevenue.toFixed(2)}</td>
                  <td style="border: 1px solid #000000;"></td>
                  <td style="border: 1px solid #000000;"></td>
                </tr>
              ` : ''}
              <tr style="font-size: 10pt;">
                <td style="border: 1px solid #000000; text-align: center; padding: 5px 6px;">5</td>
                <td style="border: 1px solid #000000; padding: 5px 12px 5px 24px; color: #374151;">↳ GST &amp; Direct Taxes Collected</td>
                <td style="border: 1px solid #000000; padding: 5px 8px; color: #4b5563;">Tax liability collected from invoices</td>
                <td style="border: 1px solid #000000; padding: 5px 8px; text-align: center;">Tax Compliance</td>
                <td style="border: 1px solid #000000; text-align: right; padding: 5px 10px; mso-number-format: '0\\.00';">${totalTax.toFixed(2)}</td>
                <td style="border: 1px solid #000000;"></td>
                <td style="border: 1px solid #000000;"></td>
              </tr>
              <tr style="font-size: 10pt;">
                <td style="border: 1px solid #000000; text-align: center; padding: 5px 6px;">6</td>
                <td style="border: 1px solid #000000; padding: 5px 12px 5px 24px; color: #374151;">↳ Service Charges Collected</td>
                <td style="border: 1px solid #000000; padding: 5px 8px; color: #4b5563;">Customer dining service fees</td>
                <td style="border: 1px solid #000000; padding: 5px 8px; text-align: center;">Dining Service</td>
                <td style="border: 1px solid #000000; text-align: right; padding: 5px 10px; mso-number-format: '0\\.00';">${totalService.toFixed(2)}</td>
                <td style="border: 1px solid #000000;"></td>
                <td style="border: 1px solid #000000;"></td>
              </tr>
              <tr style="font-size: 10pt;">
                <td style="border: 1px solid #000000; text-align: center; padding: 5px 6px;">7</td>
                <td style="border: 1px solid #000000; padding: 5px 8px; font-weight: bold; color: #b45309;">Less: Bill Discounts Given</td>
                <td style="border: 1px solid #000000; padding: 5px 8px; color: #4b5563;">Promotions &amp; customer reductions</td>
                <td style="border: 1px solid #000000; padding: 5px 8px; text-align: center;">Bill Reductions</td>
                <td style="border: 1px solid #000000; text-align: right; padding: 5px 10px; font-weight: bold; color: #b45309; mso-number-format: '0\\.00';">-${totalDiscount.toFixed(2)}</td>
                <td style="border: 1px solid #000000;"></td>
                <td style="border: 1px solid #000000; text-align: right; padding: 5px 10px; font-weight: bold; color: #b45309; mso-number-format: '0\\.00';">-${totalDiscount.toFixed(2)}</td>
              </tr>
              <!-- Revenue Subtotal Row matching pattern -->
              <tr class="balance-row" style="font-size: 10.5pt;">
                <td colspan="4" style="background-color: #D9EAD3; border: 1px solid #000000; text-align: left; padding: 7px 8px;">Total Net Operating Revenue (Adjusted for discounts)</td>
                <td style="background-color: #D9EAD3; border: 1px solid #000000; text-align: right; font-weight: bold; color: #166534; padding: 7px 10px; mso-number-format: '0\\.00';">${netRevenueAfterDiscount.toFixed(2)}</td>
                <td style="background-color: #D9EAD3; border: 1px solid #000000;"></td>
                <td style="background-color: #D9EAD3; border: 1px solid #000000; text-align: right; font-weight: bold; color: #166534; padding: 7px 10px; mso-number-format: '0\\.00';">+${netRevenueAfterDiscount.toFixed(2)}</td>
              </tr>

              <!-- 2. OPERATING EXPENDITURE & INVENTORY -->
              <tr>
                <td colspan="7" class="section-expenditure">2. OPERATING EXPENDITURE &amp; INVENTORY</td>
              </tr>
              <tr style="font-size: 10pt;">
                <td style="border: 1px solid #000000; text-align: center; padding: 5px 6px;">1</td>
                <td style="border: 1px solid #000000; padding: 5px 8px; font-weight: bold; color: #000000;">Current Ingredient Stock Valuation</td>
                <td style="border: 1px solid #000000; padding: 5px 8px; color: #374151;">${inventoryItems.length} items evaluated at unit cost</td>
                <td style="border: 1px solid #000000; padding: 5px 8px; text-align: center;">Inventory Asset</td>
                <td style="border: 1px solid #000000;"></td>
                <td style="border: 1px solid #000000; text-align: right; padding: 5px 10px; font-weight: bold; color: #b91c1c; mso-number-format: '0\\.00';">${totalInventoryCost.toFixed(2)}</td>
                <td style="border: 1px solid #000000; text-align: right; padding: 5px 10px; color: #b91c1c; mso-number-format: '0\\.00';">-${totalInventoryCost.toFixed(2)}</td>
              </tr>
              ${categoryRowsHtml}
              ${dinePurchasesHtml}
              ${barPurchasesHtml}
              ${salaryHtml}
              <tr style="font-size: 10pt;">
                <td style="border: 1px solid #000000; text-align: center; padding: 5px 6px;">•</td>
                <td style="border: 1px solid #000000; padding: 5px 8px; font-weight: bold; color: #b45309;">Customer Discounts Absorbed</td>
                <td style="border: 1px solid #000000; padding: 5px 8px; color: #4b5563;">Promotional reductions absorbed on settled bills</td>
                <td style="border: 1px solid #000000; padding: 5px 8px; text-align: center;">Operating Cost</td>
                <td style="border: 1px solid #000000;"></td>
                <td style="border: 1px solid #000000; text-align: right; padding: 5px 10px; font-weight: bold; color: #b45309; mso-number-format: '0\\.00';">-${totalDiscount.toFixed(2)}</td>
                <td style="border: 1px solid #000000; text-align: right; padding: 5px 10px; font-weight: bold; color: #b45309; mso-number-format: '0\\.00';">-${totalDiscount.toFixed(2)}</td>
              </tr>
              <!-- Expenditure Subtotal Row matching pattern -->
              <tr class="balance-row" style="font-size: 10.5pt;">
                <td colspan="4" style="background-color: #FCE4D6; border: 1px solid #000000; text-align: left; padding: 7px 8px; font-weight: bold;">Total Operating Expenditure (Stock + period purchases + discounts)</td>
                <td style="background-color: #FCE4D6; border: 1px solid #000000;"></td>
                <td style="background-color: #FCE4D6; border: 1px solid #000000; text-align: right; font-weight: bold; color: #b91c1c; padding: 7px 10px; mso-number-format: '0\\.00';">${plExpenditure.toFixed(2)}</td>
                <td style="background-color: #FCE4D6; border: 1px solid #000000; text-align: right; font-weight: bold; color: #b91c1c; padding: 7px 10px; mso-number-format: '0\\.00';">-${plExpenditure.toFixed(2)}</td>
              </tr>

              <!-- NET OPERATING PROFIT / LOSS SUMMARY ROW -->
              <tr class="total-row" style="background-color: #D9EAD3;">
                <td colspan="4" style="background-color: #D9EAD3; border: 1px solid #000000; border-bottom: 3px double #000000; text-align: center; padding: 9px 8px; font-size: 11.5pt;">NET OPERATING PROFIT / (LOSS) &nbsp;·&nbsp; ${profitMarginPercent}% Operating Margin</td>
                <td style="background-color: #D9EAD3; border: 1px solid #000000; border-bottom: 3px double #000000; text-align: right; font-weight: bold; padding: 9px 10px; color: #166534; mso-number-format: '0\\.00';">${netRevenueAfterDiscount.toFixed(2)}</td>
                <td style="background-color: #D9EAD3; border: 1px solid #000000; border-bottom: 3px double #000000; text-align: right; font-weight: bold; padding: 9px 10px; color: #b91c1c; mso-number-format: '0\\.00';">${plExpenditure.toFixed(2)}</td>
                <td style="background-color: #D9EAD3; border: 1px solid #000000; border-bottom: 3px double #000000; text-align: right; font-weight: bold; padding: 9px 10px; font-size: 12pt; color: ${isProfit ? '#166534' : '#b91c1c'}; mso-number-format: '0\\.00';">${isProfit ? '+' : '-'}${Math.abs(plNet).toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
        </body>
        </html>
      `;

      const blob = new Blob([htmlContent], { type: 'application/vnd.ms-excel;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Profit_and_Loss_Statement_${safePeriodName}_${todayYMD}.xls`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export Excel error:', err);
    }
  };

  const getActiveDateRangeText = () => {
    if (filterPeriod === "today") return todayYMD;
    if (filterPeriod === "yesterday") return yesterdayYMD;
    if (filterPeriod === "single_date") return `Date: ${startDate || todayYMD}`;
    if (filterPeriod === "this_week") return `${thisWeekStartYMD} → ${todayYMD}`;
    if (filterPeriod === "week") return `${sevenDaysYMD} → ${todayYMD}`;
    if (filterPeriod === "last_week") return `${lastWeekStartYMD} → ${lastWeekEndYMD}`;
    if (filterPeriod === "this_month" || filterPeriod === "month") return `${thisMonthStartYMD} → ${thisMonthEndYMD}`;
    if (filterPeriod === "last_month") return `${lastMonthStartYMD} → ${lastMonthEndYMD}`;
    if (filterPeriod === "this_quarter") return `${currentQStartYMD} → ${currentQEndYMD}`;
    if (filterPeriod === "last_quarter") return `${lastQStartYMD} → ${lastQEndYMD}`;
    if (filterPeriod === "this_year") return `${thisYearStartYMD} → ${thisYearEndYMD}`;
    if (filterPeriod === "last_year") return `${lastYearStartYMD} → ${lastYearEndYMD}`;
    if (filterPeriod === "custom") {
      if (startDate && endDate) return `${startDate} → ${endDate}`;
      if (startDate) return `From ${startDate}`;
      if (endDate) return `Until ${endDate}`;
    }
    return "All Time History";
  };

    const handleExportExpenditureReconciliationExcel = () => {
    try {
      const periodLabel = getFilterPeriodLabel();
      const safePeriodName = filterPeriod.replace(/[^a-zA-Z0-9]/g, "_");

      const inStockItems = searchedInventory.filter((it) => Number(it.stock ?? 0) > Number(it.minThreshold ?? 0)).length;
      const lowStockItems = searchedInventory.filter((it) => {
        const s = Number(it.stock ?? 0);
        const th = Number(it.minThreshold ?? 0);
        return s > 0 && s <= th;
      }).length;
      const outOfStockItems = searchedInventory.filter((it) => Number(it.stock ?? 0) <= 0).length;

      let totalValuationSum = 0;

      const rowsHtml = searchedInventory.map((item, idx) => {
        const stock = Number(item.stock ?? 0);
        const mrp = Number(item.mrp ?? item.unitCost ?? 0);
        const val = stock * mrp;
        const min = Number(item.minThreshold ?? 0);
        const unit = item.unit || 'units';
        totalValuationSum += val;

        const status = stock <= 0 ? "Out of Stock" : (stock <= min ? "Low Stock" : "In Stock");
        const statusColor = stock <= 0 ? "#ef4444" : (stock <= min ? "#f59e0b" : "#10b981");

        return `
          <tr style="font-size: 10pt;">
            <td style="border: 1px solid #000000; text-align: center; padding: 5px 6px;">${idx + 1}</td>
            <td style="border: 1px solid #000000; text-align: left; padding: 5px 8px; font-weight: 600;">${(item.name || '').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</td>
            <td style="border: 1px solid #000000; text-align: left; padding: 5px 8px;">${item.category || 'General'}</td>
            <td style="border: 1px solid #000000; text-align: left; padding: 5px 8px;">${(item.supplier || 'Metro Cash & Carry Wholesale').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</td>
            <td style="border: 1px solid #000000; text-align: center; padding: 5px 6px; font-weight: bold; color: ${stock <= 0 ? '#ef4444' : '#000000'};">${stock} ${unit}</td>
            <td style="border: 1px solid #000000; text-align: center; padding: 5px 6px;">${min} ${unit}</td>
            <td style="border: 1px solid #000000; text-align: right; padding: 5px 8px; mso-number-format: '0\\.00';">${mrp.toFixed(2)}</td>
            <td style="border: 1px solid #000000; text-align: right; padding: 5px 8px; font-weight: bold; color: ${val > 0 ? '#b91c1c' : '#000000'}; mso-number-format: '0\\.00';">${val.toFixed(2)}</td>
            <td style="border: 1px solid #000000; text-align: center; padding: 5px 6px; font-weight: bold; color: ${statusColor};">${status}</td>
          </tr>
        `;
      }).join('');

      // Optional Purchases in period
      const purchasesRowsHtml = (filteredInventoryPurchases || []).slice(0, 30).map((p, idx) => `
        <tr style="font-size: 9.5pt;">
          <td style="border: 1px solid #000000; text-align: center; padding: 4px;">${idx + 1}</td>
          <td style="border: 1px solid #000000; text-align: left; padding: 4px 6px;">${p.purchaseDate || ''}</td>
          <td style="border: 1px solid #000000; text-align: left; padding: 4px 6px;">${String(p.department || 'dine').toUpperCase()}</td>
          <td style="border: 1px solid #000000; text-align: left; padding: 4px 6px;">${(p.name || '').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</td>
          <td style="border: 1px solid #000000; text-align: left; padding: 4px 6px;">${(p.supplier || '').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</td>
          <td style="border: 1px solid #000000; text-align: center; padding: 4px;">${Number(p.quantity) || 0} ${p.unit || ''}</td>
          <td style="border: 1px solid #000000; text-align: right; padding: 4px 6px; mso-number-format: '0\\.00';">${(Number(p.unitCost) || 0).toFixed(2)}</td>
          <td style="border: 1px solid #000000; text-align: right; padding: 4px 6px; font-weight: bold; color: #b91c1c; mso-number-format: '0\\.00';">${getInventoryPurchaseCost(p).toFixed(2)}</td>
          <td style="border: 1px solid #000000; text-align: center; padding: 4px; font-weight: 600; color: #10b981;">Receipt Verified</td>
        </tr>
      `).join('');

      const htmlContent = `
        <html xmlns:o="urn:schemas-microsoft-com:office:office"
              xmlns:x="urn:schemas-microsoft-com:office:excel"
              xmlns="http://www.w3.org/TR/REC-html40">
        <head>
          <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
          <!--[if gte mso 9]>
          <xml>
            <x:ExcelWorkbook>
              <x:ExcelWorksheets>
                <x:ExcelWorksheet>
                  <x:Name>Expenditure & Stock Ledger</x:Name>
                  <x:WorksheetOptions>
                    <x:DisplayGridlines/>
                    <x:Print><x:ValidPrinterInfo/></x:Print>
                  </x:WorksheetOptions>
                </x:ExcelWorksheet>
              </x:ExcelWorksheets>
            </x:ExcelWorkbook>
          </xml>
          <![endif]-->
          <style>
            body { font-family: Calibri, 'Segoe UI', Arial, sans-serif; margin: 0; padding: 15px; background: #ffffff; color: #000000; }
            table { border-collapse: collapse; width: 100%; font-family: Calibri, 'Segoe UI', Arial, sans-serif; }
            .banner { background-color: #D9EAD3 !important; font-size: 15pt; font-weight: bold; text-align: center; color: #1E4620; padding: 10px; border: 1px solid #000000; }
            .header-cell { background-color: #D9EAD3 !important; border: 1px solid #000000; font-weight: bold; font-size: 10.5pt; text-align: center; padding: 7px 6px; }
            .balance-row td { background-color: #D9EAD3 !important; border: 1px solid #000000; font-weight: bold; padding: 6px 8px; }
            .total-row td { border: 1px solid #000000; font-weight: bold; padding: 6px 8px; font-size: 10.5pt; }
          </style>
        </head>
        <body>
          <table>
            <colgroup>
              <col style="width: 45px;" />
              <col style="width: 250px;" />
              <col style="width: 170px;" />
              <col style="width: 220px;" />
              <col style="width: 95px;" />
              <col style="width: 95px;" />
              <col style="width: 95px;" />
              <col style="width: 120px;" />
              <col style="width: 110px;" />
            </colgroup>
            <tbody>
              <!-- Title Banner matching Ledger Reconciliation pattern -->
              <tr>
                <td colspan="9" class="banner">Expenditure &amp; Inventory Stock Valuation</td>
              </tr>
              
              <!-- Company & Header Info Block matching pattern -->
              <tr>
                <td colspan="5" style="font-size: 10pt; font-weight: bold; padding: 6px 6px 2px 6px;">Company Name: <span style="font-weight: normal;">AVSR FOOD COURT (Fine Dining &amp; POS)</span></td>
                <td colspan="4" style="font-size: 10pt; font-weight: bold; padding: 6px 6px 2px 6px;">Email ID: <span style="font-weight: normal;">admin@avsrfoodcourt.com</span></td>
              </tr>
              <tr>
                <td colspan="9" style="font-size: 10pt; font-weight: bold; padding: 2px 6px;">Address: <span style="font-weight: normal;">Food Court Campus, Main Road</span></td>
              </tr>
              <tr>
                <td colspan="5" style="font-size: 10pt; font-weight: bold; padding: 2px 6px;">Phone No.: <span style="font-weight: normal;">+91 98765 43210</span></td>
                <td colspan="4" style="font-size: 10pt; font-weight: bold; padding: 2px 6px;">Created By: <span style="font-weight: normal;">Admin</span></td>
              </tr>
              <tr>
                <td colspan="9" style="font-size: 10pt; font-weight: bold; padding: 2px 6px;">Department / Category: <span style="font-weight: normal;">${invCategoryFilter === 'all' ? `All Categories (${searchedInventory.length} Tracked Items)` : invCategoryFilter}</span></td>
              </tr>
              <tr>
                <td colspan="9" style="font-size: 10pt; font-weight: bold; padding: 2px 6px 12px 6px;">Time Period / Date: <span style="font-weight: normal;">${periodLabel} (${getActiveDateRangeText()})</span></td>
              </tr>

              <!-- Table Headers matching pattern -->
              <tr style="background-color: #D9EAD3;">
                <th class="header-cell">#</th>
                <th class="header-cell">Ingredient / Item</th>
                <th class="header-cell">Category</th>
                <th class="header-cell">Supplier</th>
                <th class="header-cell">Stock</th>
                <th class="header-cell">Threshold</th>
                <th class="header-cell">Unit Cost</th>
                <th class="header-cell">Valuation</th>
                <th class="header-cell">Status</th>
              </tr>

              <!-- Opening Summary Row matching pattern -->
              <tr style="font-size: 10pt;">
                <td style="border: 1px solid #000000; text-align: center;"></td>
                <td colspan="3" style="background-color: #D9EAD3; border: 1px solid #000000; text-align: center; font-weight: bold; padding: 6px 8px;">Total Tracked Items: ${searchedInventory.length}</td>
                <td style="border: 1px solid #000000; text-align: center; font-weight: bold;">${inStockItems} In Stock</td>
                <td style="border: 1px solid #000000; text-align: center; font-weight: bold;">${lowStockItems} Low</td>
                <td style="border: 1px solid #000000;"></td>
                <td style="background-color: #D9EAD3; border: 1px solid #000000; text-align: right; font-weight: bold; padding: 6px 8px; color: #b91c1c; mso-number-format: '0\\.00';">${totalValuationSum.toFixed(2)}</td>
                <td style="border: 1px solid #000000; text-align: center; font-weight: bold; color: #10b981;">Active</td>
              </tr>

              <!-- Data Rows -->
              ${rowsHtml}

              <!-- Closing Balance Row matching pattern -->
              <tr class="balance-row" style="font-size: 10.5pt;">
                <td colspan="7" style="background-color: #D9EAD3; border: 1px solid #000000; text-align: center; font-weight: bold; padding: 7px 8px;">CURRENT INVENTORY STOCK VALUATION</td>
                <td style="background-color: #D9EAD3; border: 1px solid #000000; text-align: right; font-weight: bold; padding: 7px 8px; color: #b91c1c; mso-number-format: '0\\.00';">${totalValuationSum.toFixed(2)}</td>
                <td style="background-color: #D9EAD3; border: 1px solid #000000; text-align: center; font-weight: bold; color: #10b981;">Verified</td>
              </tr>

              <!-- Total Row matching pattern -->
              <tr class="total-row">
                <td colspan="4" style="border: 1px solid #000000; text-align: center; padding: 7px 8px; font-weight: bold;">Total Stock Summary</td>
                <td style="border: 1px solid #000000; text-align: center; font-weight: bold;">${inStockItems} OK</td>
                <td style="border: 1px solid #000000; text-align: center; font-weight: bold; color: #f59e0b;">${lowStockItems} Low</td>
                <td style="border: 1px solid #000000; text-align: center; font-weight: bold; color: #ef4444;">${outOfStockItems} Out</td>
                <td style="border: 1px solid #000000; text-align: right; padding: 7px 8px; font-weight: bold; color: #b91c1c; mso-number-format: '0\\.00';">${totalValuationSum.toFixed(2)}</td>
                <td style="background-color: #D9EAD3; border: 1px solid #000000;"></td>
              </tr>

              ${purchasesRowsHtml ? `
                <tr><td colspan="9" style="height: 20px;"></td></tr>
                <tr>
                  <td colspan="9" class="banner" style="font-size: 13pt;">Dated Inventory Purchases in Selected Period (${periodLabel})</td>
                </tr>
                <tr style="background-color: #D9EAD3;">
                  <th class="header-cell">#</th>
                  <th class="header-cell">Date</th>
                  <th class="header-cell">Department</th>
                  <th class="header-cell">Item Name</th>
                  <th class="header-cell">Supplier</th>
                  <th class="header-cell">Quantity</th>
                  <th class="header-cell">Unit Cost</th>
                  <th class="header-cell">Purchase Total</th>
                  <th class="header-cell">Audit Status</th>
                </tr>
                ${purchasesRowsHtml}
                <tr class="balance-row">
                  <td colspan="7" style="background-color: #D9EAD3; border: 1px solid #000000; text-align: center; font-weight: bold;">TOTAL PERIOD INVENTORY PURCHASES</td>
                  <td style="background-color: #D9EAD3; border: 1px solid #000000; text-align: right; font-weight: bold; color: #b91c1c; mso-number-format: '0\\.00';">${totalInventoryPurchaseCost.toFixed(2)}</td>
                  <td style="background-color: #D9EAD3; border: 1px solid #000000;"></td>
                </tr>
              ` : ''}
            </tbody>
          </table>
        </body>
        </html>
      `;

      const blob = new Blob([htmlContent], { type: 'application/vnd.ms-excel;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Expenditure_Stock_Valuation_${safePeriodName}_${todayYMD}.xls`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export expenditure reconciliation error:', err);
    }
  };

  const handleExportInventoryCSV = () => {
    try {
      const lines = [];
      lines.push(`"${isBarMode ? "BAR INVENTORY & STOCK VALUATION" : "DINING INVENTORY & STOCK VALUATION"}"`);
      lines.push(`"Generated At:","${new Date().toLocaleString("en-IN")}"`);
      lines.push(`"Total Items:","${searchedInventory.length}"`);
      lines.push(`"Total Valuation:","${totalInventoryCost.toFixed(2)}"`);
      lines.push(``);
      lines.push(`"#","Ingredient / Item","Category","Supplier","Current Stock","Unit","Min Threshold","Unit Cost (INR)","Total Valuation (INR)","Stock Status"`);

      searchedInventory.forEach((it, idx) => {
        const stock = Number(it.stock ?? 0);
        const mrp = Number(it.mrp ?? it.unitCost ?? 0);
        const val = stock * mrp;
        const min = Number(it.minThreshold ?? 0);
        const status = stock <= 0 ? "Out of Stock" : (stock <= min ? "Low Stock" : "In Stock");
        lines.push(`"${idx + 1}","${(it.name || '').replace(/"/g, '""')}","${it.category || ''}","${(it.supplier || '').replace(/"/g, '""')}","${stock}","${it.unit || ''}","${min}","${mrp.toFixed(2)}","${val.toFixed(2)}","${status}"`);
      });

      const totalVal = searchedInventory.reduce((s, it) => s + (Number(it.stock ?? 0) * Number(it.mrp ?? it.unitCost ?? 0)), 0);
      lines.push(``);
      lines.push(`"TOTAL SUMMARY","","","","","","","","${totalVal.toFixed(2)}",""`);

      const csvContent = "data:text/csv;charset=utf-8," + encodeURIComponent(lines.join("\n"));
      const link = document.createElement("a");
      link.setAttribute("href", csvContent);
      link.setAttribute("download", `Inventory_Stock_Valuation_${todayYMD}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("Export inventory CSV error:", err);
    }
  };

  const handleExportLedgerReconciliationExcel = () => {
    try {
      const periodLabel = getFilterPeriodLabel();
      const safePeriodName = filterPeriod.replace(/[^a-zA-Z0-9]/g, "_");
      const activePeriodDates = getActiveDateRangeText();

      let runningBalance = 0;
      let totalTaxSum = 0;
      let totalDiscSum = 0;
      let totalDebitSum = 0;
      let totalCreditSum = 0;

      const rowsHtml = searchedOrders.map((ord, idx) => {
        const id = ord.orderNumber || ord.id || `#${idx + 1}`;
        const dateRaw = ord.settledAt || ord.timestamp || ord.date || todayYMD;
        let formattedDate = "";
        try {
          const d = new Date(dateRaw);
          if (!isNaN(d.getTime())) {
            const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            formattedDate = `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()} ${timeStr}`;
          } else {
            formattedDate = String(dateRaw).slice(0, 16);
          }
        } catch {
          formattedDate = String(dateRaw).slice(0, 16);
        }

        const tbl = ord.table || ord.tableName || "Takeaway";
        const pay = normalizePaymentMethod(ord).toUpperCase();
        const items = (ord.items || [])
          .map((it) => `${it.quantity || 1}x ${it.name || 'Dish'}`)
          .join(', ') || 'Dishes';

        const grand = Number(ord.grandTotal ?? ord.total) || 0;
        const tax = Number(ord.taxAmount) || 0;
        const discount = Number(ord.discountAmount) || 0;
        
        // Debit = Settled gross sales; Credit = Bill discounts
        const debit = grand;
        const credit = discount > 0 ? discount : 0;
        const drOrCr = debit >= credit ? "Dr" : "Cr";
        
        runningBalance += (debit - credit);
        totalTaxSum += tax;
        totalDiscSum += discount;
        totalDebitSum += debit;
        totalCreditSum += credit;

        return `
          <tr style="font-size: 10pt;">
            <td style="border: 1px solid #000000; text-align: center; padding: 5px 6px;">${idx + 1}</td>
            <td style="border: 1px solid #000000; text-align: center; padding: 5px 6px; font-weight: bold; color: #166534;">${id}</td>
            <td style="border: 1px solid #000000; text-align: center; padding: 5px 6px; white-space: nowrap; mso-number-format: '\\@';">${formattedDate}</td>
            <td style="border: 1px solid #000000; text-align: center; padding: 5px 6px; font-weight: 600;">${tbl}</td>
            <td style="border: 1px solid #000000; text-align: left; padding: 5px 8px;">${items.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</td>
            <td style="border: 1px solid #000000; text-align: center; padding: 5px 6px; font-weight: 600; color: #2563eb;">${pay}</td>
            <td style="border: 1px solid #000000; text-align: right; padding: 5px 8px; color: #10b981; mso-number-format: '0\\.00';">${tax.toFixed(2)}</td>
            <td style="border: 1px solid #000000; text-align: right; padding: 5px 8px; color: #b45309; mso-number-format: '0\\.00';">${discount.toFixed(2)}</td>
            <td style="border: 1px solid #000000; text-align: right; padding: 5px 8px; font-weight: bold; color: #166534; mso-number-format: '0\\.00';">${debit.toFixed(2)}</td>
            <td style="border: 1px solid #000000; text-align: right; padding: 5px 8px; color: #b45309; mso-number-format: '0\\.00';">${credit > 0 ? credit.toFixed(2) : '-'}</td>
            <td style="border: 1px solid #000000; text-align: center; padding: 5px 6px; font-weight: 600;">${drOrCr}</td>
            <td style="border: 1px solid #000000; text-align: right; padding: 5px 8px; font-weight: bold; mso-number-format: '0\\.00';">${runningBalance.toFixed(2)}</td>
          </tr>
        `;
      }).join('');

      const htmlContent = `
        <html xmlns:o="urn:schemas-microsoft-com:office:office"
              xmlns:x="urn:schemas-microsoft-com:office:excel"
              xmlns="http://www.w3.org/TR/REC-html40">
        <head>
          <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
          <!--[if gte mso 9]>
          <xml>
            <x:ExcelWorkbook>
              <x:ExcelWorksheets>
                <x:ExcelWorksheet>
                  <x:Name>Detailed Income Ledger</x:Name>
                  <x:WorksheetOptions>
                    <x:DisplayGridlines/>
                    <x:Print><x:ValidPrinterInfo/></x:Print>
                  </x:WorksheetOptions>
                </x:ExcelWorksheet>
              </x:ExcelWorksheets>
            </x:ExcelWorkbook>
          </xml>
          <![endif]-->
          <style>
            body { font-family: Calibri, 'Segoe UI', Arial, sans-serif; margin: 0; padding: 15px; background: #ffffff; color: #000000; }
            table { border-collapse: collapse; width: 100%; font-family: Calibri, 'Segoe UI', Arial, sans-serif; font-size: 10.5pt; }
            .banner { background-color: #D9EAD3 !important; font-size: 15pt; font-weight: bold; text-align: center; color: #1E4620; padding: 10px; border: 1px solid #000000; }
            .header-cell { background-color: #D9EAD3 !important; border: 1px solid #000000; font-weight: bold; font-size: 10.5pt; text-align: center; padding: 7px 6px; }
            .balance-row td { background-color: #D9EAD3 !important; border: 1px solid #000000; font-weight: bold; padding: 7px 8px; }
            .total-row td { border: 1px solid #000000; font-weight: bold; padding: 7px 8px; font-size: 11pt; }
          </style>
        </head>
        <body>
          <table>
            <colgroup>
              <col style="width: 40px;" />
              <col style="width: 75px;" />
              <col style="width: 175px;" />
              <col style="width: 95px;" />
              <col style="width: 320px;" />
              <col style="width: 85px;" />
              <col style="width: 90px;" />
              <col style="width: 90px;" />
              <col style="width: 120px;" />
              <col style="width: 100px;" />
              <col style="width: 65px;" />
              <col style="width: 130px;" />
            </colgroup>
            <tbody>
              <!-- Title Banner matching Ledger Reconciliation pattern -->
              <tr>
                <td colspan="12" class="banner">Ledger Reconciliation (Detailed Income &amp; Settled Orders)</td>
              </tr>

              <!-- Company & Client Info Block matching pattern -->
              <tr>
                <td colspan="7" style="font-size: 10pt; font-weight: bold; padding: 6px 6px 2px 6px;">Company Name: <span style="font-weight: normal;">AVSR FOOD COURT (Fine Dining &amp; POS)</span></td>
                <td colspan="5" style="font-size: 10pt; font-weight: bold; padding: 6px 6px 2px 6px;">Email ID: <span style="font-weight: normal;">admin@avsrfoodcourt.com</span></td>
              </tr>
              <tr>
                <td colspan="7" style="font-size: 10pt; font-weight: bold; padding: 2px 6px;">Address: <span style="font-weight: normal;">Food Court Campus, Main Road</span></td>
                <td colspan="5" style="font-size: 10pt; font-weight: bold; padding: 2px 6px;">Scope: <span style="font-weight: normal;">Settled Dining &amp; Takeaway Tickets</span></td>
              </tr>
              <tr>
                <td colspan="7" style="font-size: 10pt; font-weight: bold; padding: 2px 6px;">Phone No.: <span style="font-weight: normal;">+91 98765 43210</span></td>
                <td colspan="5" style="font-size: 10pt; font-weight: bold; padding: 2px 6px;">Created By: <span style="font-weight: normal;">Admin</span></td>
              </tr>
              <tr>
                <td colspan="12" style="font-size: 10pt; font-weight: bold; padding: 2px 6px 12px 6px;">Time Period / Date: <span style="font-weight: normal;">${periodLabel} (${activePeriodDates})</span></td>
              </tr>

              <!-- Table Headers matching pattern -->
              <tr style="background-color: #D9EAD3;">
                <th class="header-cell">#</th>
                <th class="header-cell">Order ID</th>
                <th class="header-cell">Date &amp; Time</th>
                <th class="header-cell">Table</th>
                <th class="header-cell">Items Summary (Dishes &amp; Drinks)</th>
                <th class="header-cell">Payment</th>
                <th class="header-cell">Tax (₹)</th>
                <th class="header-cell">Discount (₹)</th>
                <th class="header-cell">Debit / Amount (₹)</th>
                <th class="header-cell">Credit / Reductions (₹)</th>
                <th class="header-cell">Dr or Cr</th>
                <th class="header-cell">Closing Balance (₹)</th>
              </tr>

              <!-- Opening Balance Row matching pattern -->
              <tr style="font-size: 10pt;">
                <td style="border: 1px solid #000000; text-align: center;"></td>
                <td colspan="7" style="background-color: #D9EAD3; border: 1px solid #000000; text-align: center; font-weight: bold; padding: 6px 8px;">Opening Balance (Settled Orders: ${searchedOrders.length} tickets)</td>
                <td style="border: 1px solid #000000; text-align: right; padding: 6px 8px; font-weight: bold;">0.00</td>
                <td style="border: 1px solid #000000; text-align: right; padding: 6px 8px;">0.00</td>
                <td style="border: 1px solid #000000; text-align: center; font-weight: bold;">-</td>
                <td style="background-color: #D9EAD3; border: 1px solid #000000; text-align: right; font-weight: bold; padding: 6px 8px; mso-number-format: '0\\.00';">0.00</td>
              </tr>

              <!-- Data Rows -->
              ${rowsHtml}

              <!-- Closing Balance Row matching pattern -->
              <tr class="balance-row" style="font-size: 10.5pt;">
                <td colspan="8" style="background-color: #D9EAD3; border: 1px solid #000000; text-align: center; font-weight: bold; padding: 7px 8px;">CLOSING LEDGER BALANCE (NET SETTLED VALUE)</td>
                <td style="background-color: #D9EAD3; border: 1px solid #000000; text-align: right; font-weight: bold; padding: 7px 8px; color: #166534; mso-number-format: '0\\.00';">${totalDebitSum.toFixed(2)}</td>
                <td style="background-color: #D9EAD3; border: 1px solid #000000; text-align: right; font-weight: bold; padding: 7px 8px; color: #b45309; mso-number-format: '0\\.00';">${totalCreditSum.toFixed(2)}</td>
                <td style="background-color: #D9EAD3; border: 1px solid #000000; text-align: center; font-weight: bold;">Dr</td>
                <td style="background-color: #D9EAD3; border: 1px solid #000000; text-align: right; font-weight: bold; padding: 7px 8px; font-size: 11pt; color: #166534; mso-number-format: '0\\.00';">${runningBalance.toFixed(2)}</td>
              </tr>

              <!-- Total Row matching pattern -->
              <tr class="total-row">
                <td colspan="6" style="border: 1px solid #000000; text-align: center; padding: 7px 8px; font-weight: bold;">TOTAL SUMMARY (${searchedOrders.length} TICKETS)</td>
                <td style="border: 1px solid #000000; text-align: right; padding: 7px 8px; font-weight: bold; color: #10b981; mso-number-format: '0\\.00';">${totalTaxSum.toFixed(2)}</td>
                <td style="border: 1px solid #000000; text-align: right; padding: 7px 8px; font-weight: bold; color: #b45309; mso-number-format: '0\\.00';">${totalDiscSum.toFixed(2)}</td>
                <td style="border: 1px solid #000000; text-align: right; padding: 7px 8px; font-weight: bold; color: #166534; mso-number-format: '0\\.00';">${totalDebitSum.toFixed(2)}</td>
                <td style="border: 1px solid #000000; text-align: right; padding: 7px 8px; font-weight: bold; color: #b45309; mso-number-format: '0\\.00';">${totalCreditSum.toFixed(2)}</td>
                <td style="border: 1px solid #000000; text-align: center; font-weight: bold;">Dr</td>
                <td style="background-color: #D9EAD3; border: 1px solid #000000; text-align: right; padding: 7px 8px; font-weight: bold; font-size: 11pt; color: #166534; mso-number-format: '0\\.00';">${runningBalance.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
        </body>
        </html>
      `;

      const blob = new Blob([htmlContent], { type: 'application/vnd.ms-excel;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Detailed_Income_Ledger_${safePeriodName}_${todayYMD}.xls`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export ledger reconciliation error:', err);
    }
  };

  const handleExportOrdersCSV = () => {
    try {
      const lines = [];
      lines.push(`"${isBarMode ? "BAR SETTLED ORDERS & INCOME LEDGER" : "DINING SETTLED ORDERS & INCOME LEDGER"}"`);
      lines.push(`"Period:","${getFilterPeriodLabel()}"`);
      lines.push(`"Date Range:","${getActiveDateRangeText()}"`);
      lines.push(`"Total Orders:","${searchedOrders.length}"`);
      lines.push(`"Generated At:","${new Date().toLocaleString("en-IN")}"`);
      lines.push(``);
      lines.push(`"#","Order ID / No.","Settled Date & Time","Table","Items Summary","Payment Method","Subtotal (INR)","Tax (INR)","Discount (INR)","Total Amount (INR)"`);

      searchedOrders.forEach((ord, idx) => {
        const id = ord.orderNumber || ord.id || `ord-${idx + 1}`;
        const dt = ord.settledAt || ord.timestamp || ord.date || "";
        const tbl = ord.table || ord.tableName || "Takeaway";
        const pay = normalizePaymentMethod(ord).toUpperCase();
        const itemsSummary = (ord.items || [])
          .map((it) => `${it.quantity || 1}x ${it.name || 'Item'}`)
          .join('; ') || 'Order Items';
        const sub = Number(ord.subtotal || (ord.grandTotal - (ord.taxAmount || 0))) || 0;
        const tax = Number(ord.taxAmount) || 0;
        const disc = Number(ord.discountAmount) || 0;
        const grand = Number(ord.grandTotal ?? ord.total) || 0;
        lines.push(`"${idx + 1}","${id}","${dt}","${tbl}","${itemsSummary.replace(/"/g, '""')}","${pay}","${sub.toFixed(2)}","${tax.toFixed(2)}","${disc.toFixed(2)}","${grand.toFixed(2)}"`);
      });

      const totalSub = searchedOrders.reduce((s, o) => s + (Number(o.subtotal || (o.grandTotal - (o.taxAmount || 0))) || 0), 0);
      const totalTaxSum = searchedOrders.reduce((s, o) => s + (Number(o.taxAmount) || 0), 0);
      const totalDiscSum = searchedOrders.reduce((s, o) => s + (Number(o.discountAmount) || 0), 0);
      const totalGrandSum = searchedOrders.reduce((s, o) => s + (Number(o.grandTotal || o.total) || 0), 0);

      lines.push(``);
      lines.push(`"TOTAL SUMMARY (${searchedOrders.length} TICKETS)","","","","","","${totalSub.toFixed(2)}","${totalTaxSum.toFixed(2)}","${totalDiscSum.toFixed(2)}","${totalGrandSum.toFixed(2)}"`);

      const csvContent = "data:text/csv;charset=utf-8," + encodeURIComponent(lines.join("\n"));
      const link = document.createElement("a");
      const safePeriodName = filterPeriod.replace(/[^a-zA-Z0-9]/g, "_");
      link.setAttribute("href", csvContent);
      link.setAttribute("download", `Detailed_Income_Ledger_${safePeriodName}_${todayYMD}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("Export orders CSV error:", err);
    }
  };

  const handleExportCSV = () => {
    try {
      const lines = [];
      lines.push(`"${isBarMode ? "BAR FINANCIAL PERFORMANCE REPORT" : "FINANCIAL PERFORMANCE REPORT"}"`);
      lines.push(`"Period:","${getFilterPeriodLabel()}"`);
      lines.push(`"Date Range:","${getActiveDateRangeText()}"`);
      lines.push(`"Generated At:","${new Date().toLocaleString("en-IN")}"`);
      lines.push(``);
      lines.push(`"EXECUTIVE FINANCIAL SUMMARY"`);
      lines.push(`"Metric","Amount (INR)","Notes"`);
      lines.push(`"Total Income (Sales)","${plIncome.toFixed(2)}","From ${filteredOrders.length} settled orders"`);
      lines.push(`"Food & Beverage Net Sales","${grossFoodSales.toFixed(2)}","Excluding taxes & service charge"`);
      lines.push(`"GST / Tax Collected","${totalTax.toFixed(2)}","Tax liability"`);
      lines.push(`"Service Charges","${totalService.toFixed(2)}","Service charge revenue"`);
      lines.push(`"Bill Discounts Given","${totalDiscount.toFixed(2)}","Promotions & reductions"`);
      lines.push(`"Net Operating Revenue","${netRevenueAfterDiscount.toFixed(2)}","Sales adjusted for discounts"`);
      lines.push(`"Total Inventory Stock Valuation","${totalInventoryCost.toFixed(2)}","${inventoryItems.length} items evaluated at unit cost"`);
      lines.push(`"Dine Inventory Purchases","${dineInventoryPurchaseCost.toFixed(2)}","Dated purchase receipts in selected period"`);
      lines.push(`"Bar Inventory Purchases","${barInventoryPurchaseCost.toFixed(2)}","Dated purchase receipts in selected period"`);
      lines.push(`"Salary Payments","${totalSalaryPaid.toFixed(2)}","${filteredSalaryPayments.length} dated salary payments in selected period"`);
      lines.push(`"Active Monthly Payroll Budget","${monthlyPayrollBudget.toFixed(2)}","Monthly run-rate; not included in actual paid expenditure"`);
      lines.push(`"Total Operating Expenditure","${plExpenditure.toFixed(2)}","Tracked inventory purchases + salary payments + bill discounts"`);
      lines.push(`"Ingredient Usage Cost / COGS","${costOfGoodsSold.toFixed(2)}","Tracked quantity used multiplied by ingredient unit cost"`);
      lines.push(`"Net Operating ${isProfit ? "Profit" : "Loss"}","${(isProfit ? "+" : "-") + Math.abs(plNet).toFixed(2)}","Operating Margin: ${profitMarginPercent}%"`);
      lines.push(``);
      lines.push(`"INVENTORY PURCHASES IN PERIOD (${filteredInventoryPurchases.length} Purchases)"`);
      lines.push(`"Date","Department","Item","Supplier","Quantity","Unit","Unit Cost","Total Cost"`);
      filteredInventoryPurchases.forEach((purchase) => {
        lines.push(`"${purchase.purchaseDate || ""}","${purchase.department || "dine"}","${purchase.name || ""}","${purchase.supplier || ""}","${Number(purchase.quantity) || 0}","${purchase.unit || ""}","${(Number(purchase.unitCost) || 0).toFixed(2)}","${getInventoryPurchaseCost(purchase).toFixed(2)}"`);
      });
      lines.push(``);
      lines.push(`"SALARY PAYMENTS IN PERIOD (${filteredSalaryPayments.length} Payments)"`);
      lines.push(`"Date","Salary Period","Staff Member","Payment Method","Amount","Notes"`);
      filteredSalaryPayments.forEach((payment) => {
        lines.push(`"${payment.paidOn}","${payment.salaryPeriod || ""}","${payment.staffName || ""}","${payment.paymentMethod || ""}","${payment.amount.toFixed(2)}","${payment.notes || ""}"`);
      });
      lines.push(``);
      lines.push(`"SETTLED ORDERS IN PERIOD (${filteredOrders.length} Orders)"`);
      lines.push(`"#","Order ID / No.","Date & Time","Table","Payment Method","Subtotal","Tax","Discount","Grand Total"`);
      filteredOrders.forEach((ord, idx) => {
        const id = ord.orderNumber || ord.id || `ord-${idx + 1}`;
        const dt = ord.settledAt || ord.timestamp || ord.date || "";
        const tbl = ord.table || ord.tableName || "Takeaway";
        const pay = normalizePaymentMethod(ord);
        const sub = Number(ord.subtotal || (ord.grandTotal - (ord.taxAmount || 0))) || 0;
        const tax = Number(ord.taxAmount) || 0;
        const disc = Number(ord.discountAmount) || 0;
        const grand = Number(ord.grandTotal ?? ord.total) || 0;
        lines.push(`"${idx + 1}","${id}","${dt}","${tbl}","${pay.toUpperCase()}","${sub.toFixed(2)}","${tax.toFixed(2)}","${disc.toFixed(2)}","${grand.toFixed(2)}"`);
      });
      lines.push(``);
      lines.push(`"INVENTORY INGREDIENT VALUATION (${inventoryItems.length} Items)"`);
      lines.push(`"#","Ingredient / Item","Category","Supplier","Stock","Unit","Min Threshold","Unit Cost","Total Valuation","Status"`);
      inventoryItems.forEach((it, idx) => {
        const stock = Number(it.stock ?? 0);
        const mrp = Number(it.mrp ?? it.unitCost ?? 0);
        const val = stock * mrp;
        const min = Number(it.minThreshold ?? 0);
        const status = stock <= 0 ? "Out of Stock" : (stock <= min ? "Low Stock" : "In Stock");
        lines.push(`"${idx + 1}","${it.name || ""}","${it.category || ""}","${it.supplier || ""}","${stock}","${it.unit || ""}","${min}","${mrp.toFixed(2)}","${val.toFixed(2)}","${status}"`);
      });
      const csvContent = "data:text/csv;charset=utf-8," + encodeURIComponent(lines.join("\n"));
      const link = document.createElement("a");
      const safePeriodName = filterPeriod.replace(/[^a-zA-Z0-9]/g, "_");
      link.setAttribute("href", csvContent);
      link.setAttribute("download", `Financial_Report_${safePeriodName}_${todayYMD}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("Export error:", err);
    }
  };

  // Real-time calculations for Opening Balance & Closing Balance Bar
  const todayOrders = useMemo(() => {
    return (pastOrders || []).filter((o) => {
      const isSettled = String(o?.status || o?.Status || "").toLowerCase() === "settled" || o?.isPaid;
      if (!isSettled) return false;
      const dStr = o.settledDate || o.date || o.createdAt || "";
      return dStr.startsWith(todayYMD);
    });
  }, [pastOrders, todayYMD]);

  const todayCashInflow = roundCurrency(
    todayOrders.filter((o) => {
      const pm = String(o.paymentMode || o.paymentMethod || o.PaymentMethod || "").toLowerCase();
      return pm === "cash";
    }).reduce((sum, o) => sum + (Number(o.grandTotal ?? o.totalAmount ?? o.total ?? o.paidAmount ?? 0) || 0), 0)
  );

  const todayUpiInflow = roundCurrency(
    todayOrders.filter((o) => {
      const pm = String(o.paymentMode || o.paymentMethod || o.PaymentMethod || "").toLowerCase();
      return pm.includes("upi") || pm.includes("card") || pm.includes("online");
    }).reduce((sum, o) => sum + (Number(o.grandTotal ?? o.totalAmount ?? o.total ?? o.paidAmount ?? 0) || 0), 0)
  );

  const todayTotalInflow = roundCurrency(todayCashInflow + todayUpiInflow);

  const todayPurchases = useMemo(() => {
    return (inventoryPurchases || []).filter((p) => {
      const d = p.purchaseDate || p.date || p.createdAt || "";
      return d.startsWith(todayYMD);
    });
  }, [inventoryPurchases, todayYMD]);

  const todayTotalOutflow = roundCurrency(
    todayPurchases.reduce((sum, p) => sum + (Number(p.totalAmount ?? p.amount ?? 0) || 0), 0)
  );

  const savedDailyBalances = useMemo(() => getDailyBalances(), [activeTab]);
  const todaySavedRecord = savedDailyBalances.find((b) => b.date === todayYMD);
  const todayOpeningCash = todaySavedRecord?.openingCash ?? 5000;
  const todayOpeningBank = todaySavedRecord?.openingBank ?? 25000;
  const todayOpeningTotal = roundCurrency(todayOpeningCash + todayOpeningBank);
  const todayClosingTotal = roundCurrency(todayOpeningTotal + todayTotalInflow - todayTotalOutflow);

  const navTabs = [
    { id: 'statement', label: 'Profit & Loss Statement', icon: FileSpreadsheet, badge: isProfit ? `+${absMarginPercent}%` : `-${absMarginPercent}%` },
    { id: 'trial-balance', label: 'Trial Balance', icon: Scale, badge: 'CA Audit' },
    { id: 'stock-summary', label: 'Stock Summary Report', icon: Boxes, badge: `${inventoryItems.length} Items` },
    { id: 'balance-sheet', label: 'Balance Sheet', icon: BookOpen, badge: 'Balanced' },
    { id: 'daily-register', label: 'Opening & Closing Register', icon: Wallet, badge: 'Daily Float' },
    { id: 'coa', label: 'Chart of Accounts', icon: Layers, badge: 'COA' },
    { id: 'general-ledger', label: 'General Ledger', icon: Receipt, badge: 'Ledger' },
    { id: 'journal-entries', label: 'Journal Entries', icon: FileText, badge: 'JV' },
    { id: 'audit-documents', label: 'Audit Documents', icon: ShieldCheck, badge: 'Statutory' },
    { id: 'sales', label: 'Sales & Channels', icon: BarChart3, badge: `${filteredOrders.length} Orders` },
    { id: 'income', label: 'Detailed Income Ledger', icon: Receipt, badge: `${searchedOrders.length} Orders` },
    { id: 'expenditure', label: 'Operating Costs', icon: Boxes, badge: 'Expenses' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
      
      {/* SCREEN VIEW ONLY (Hidden during print) */}
      <div className="no-print" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%', maxWidth: '100%' }}>
        
        {/* ========================================================================= */}
        {/* UNIFIED SINGLE-PAGE WORKSPACE CARD                                        */}
        {/* ========================================================================= */}
        <div
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-card)',
            borderRadius: '16px',
            padding: '1.25rem',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
            boxSizing: 'border-box',
          }}
        >
          {/* Top Bar: Title & Global Date/Export Actions */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '0.85rem',
              paddingBottom: '1rem',
              borderBottom: '1px solid var(--border-subtle)',
              marginBottom: '1rem',
            }}
          >
            {/* Title Section */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 3px 12px rgba(245, 158, 11, 0.35)',
                  flexShrink: 0,
                }}
              >
                {isBarMode ? <Wine size={20} color='#ffffff' /> : <BarChart3 size={20} color='#ffffff' />}
              </div>
              <div>
                <h2
                  style={{
                    fontSize: "1.2rem",
                    fontWeight: 800,
                    color: "var(--text-main)",
                    margin: 0,
                    letterSpacing: "-0.01em",
                  }}
                >
                  {isBarMode ? "Bar Sales Analytics & Financial Reports" : "Sales Analytics & Financial Reports"}
                </h2>
                <div style={{ fontSize: "0.74rem", color: "var(--text-muted)", marginTop: "2px" }}>
                  {isBarMode ? "All-in-one financial dashboard · settled bar revenue, P&L accounting & liquor stock expenditure" : "All-in-one financial dashboard · settled dining revenue, P&L accounting & stock expenditure"}
                </div>
              </div>
            </div>

            {/* Actions: Period Selector, Custom Date Range, CSV, Print, Fetch */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              
              {/* Period Dropdown */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  background: "var(--bg-tertiary)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "9px",
                  padding: "0.32rem 0.55rem",
                  gap: "0.35rem",
                }}
              >
                <Calendar size={13} color="#f59e0b" />
                <select
                  value={filterPeriod}
                  onChange={(e) => handleSelectPeriod(e.target.value)}
                  style={{
                    background: "transparent",
                    border: "none",
                    outline: "none",
                    color: "var(--text-main)",
                    fontSize: "0.76rem",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                  title="Select reporting period"
                >
                  <option value="all">All Time</option>
                  <optgroup label="Daily">
                    <option value="today">Today</option>
                    <option value="yesterday">Yesterday</option>
                  </optgroup>
                  <optgroup label="Weekly">
                    <option value="this_week">This Week</option>
                    <option value="last_week">Last Week</option>
                  </optgroup>
                  <optgroup label="Monthly">
                    <option value="this_month">This Month</option>
                    <option value="last_month">Last Month</option>
                  </optgroup>
                  <optgroup label="Quarterly">
                    <option value="this_quarter">This Quarter</option>
                    <option value="last_quarter">Last Quarter</option>
                  </optgroup>
                  <optgroup label="Yearly">
                    <option value="this_year">This Year</option>
                    <option value="last_year">Last Year</option>
                  </optgroup>
                  <option value="custom">Custom Range...</option>
                </select>
              </div>

              {/* Custom Date Range Picker */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.35rem",
                  background: filterPeriod === "custom" ? "rgba(245, 158, 11, 0.12)" : "var(--bg-tertiary)",
                  border: filterPeriod === "custom" ? "1.5px solid var(--accent-amber)" : "1px solid var(--border-subtle)",
                  borderRadius: "9px",
                  padding: "0.3rem 0.55rem",
                  transition: "all 0.15s ease",
                }}
              >
                <span
                  onClick={() => {
                    try { startInputRef.current?.showPicker(); } catch {}
                  }}
                  style={{ cursor: "pointer", display: "flex", alignItems: "center" }}
                  title="Click to select dates"
                >
                  <Calendar size={13} color="var(--accent-amber)" style={{ flexShrink: 0 }} />
                </span>
                <input
                  ref={startInputRef}
                  type="date"
                  className="clean-date-input"
                  value={startDate}
                  max={endDate && endDate < todayYMD ? endDate : todayYMD}
                  onClick={(e) => { try { e.currentTarget.showPicker(); } catch {} }}
                  onChange={(e) => {
                    const val = e.target.value;
                    const capped = val && val > todayYMD ? todayYMD : val;
                    setStartDate(capped);
                    setFilterPeriod("custom");
                  }}
                  style={{
                    background: "transparent",
                    border: "none",
                    outline: "none",
                    color: "var(--text-main)",
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    fontFamily: "inherit",
                    cursor: "pointer",
                    width: "95px",
                  }}
                  title="From Date"
                />
                <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontWeight: 700 }}>to</span>
                <input
                  type="date"
                  className="clean-date-input"
                  value={endDate}
                  min={startDate || undefined}
                  max={todayYMD}
                  onClick={(e) => { try { e.currentTarget.showPicker(); } catch {} }}
                  onChange={(e) => {
                    const val = e.target.value;
                    const capped = val && val > todayYMD ? todayYMD : val;
                    setEndDate(capped);
                    setFilterPeriod("custom");
                  }}
                  style={{
                    background: "transparent",
                    border: "none",
                    outline: "none",
                    color: "var(--text-main)",
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    fontFamily: "inherit",
                    cursor: "pointer",
                    width: "95px",
                  }}
                  title="To Date"
                />
              </div>

              {/* Export CSV */}
              <button
                onClick={handleExportCSV}
                style={{
                  background: "rgba(16, 185, 129, 0.12)",
                  border: "1px solid rgba(16, 185, 129, 0.35)",
                  borderRadius: "9px",
                  padding: "0.38rem 0.75rem",
                  color: "var(--success)",
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.35rem",
                  transition: "all 0.15s ease",
                }}
                title="Export report for this period to CSV spreadsheet"
              >
                <Download size={13} />
                <span>Export CSV</span>
              </button>

              {/* Print Report */}
              <button
                onClick={() => printSurface("printable-report", {
                  title: "Sales and Revenue Report",
                  format: "a4",
                  emptyMessage: "There is no report data to print.",
                })}
                style={{
                  background: "var(--bg-tertiary)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "9px",
                  padding: "0.38rem 0.75rem",
                  color: "var(--text-main)",
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.35rem",
                  transition: "all 0.15s ease",
                }}
                title="Print or export full audit report to PDF"
              >
                <Printer size={13} color="#f59e0b" />
                <span>Print Report</span>
              </button>

              {/* Fetch Data */}
              <button
                onClick={() => { setIsFetching(true); setInvoiceLoadError(""); handleFetchData(); }}
                disabled={isFetching}
                style={{
                  background: "linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)",
                  border: "none",
                  borderRadius: "9px",
                  padding: "0.38rem 0.8rem",
                  color: "#ffffff",
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.35rem",
                  boxShadow: "0 2px 8px rgba(245, 158, 11, 0.3)",
                  transition: "all 0.15s ease",
                }}
              >
                <RefreshCw
                  size={12}
                  style={{
                    transition: "transform 0.45s ease",
                    transform: isFetching ? "rotate(360deg)" : "none",
                  }}
                />
                <span>Fetch Data</span>
              </button>

            </div>
          </div>

          {invoiceLoadError && (
            <div role="alert" style={{ marginBottom: "0.85rem", padding: "0.6rem 0.85rem", borderRadius: "8px", border: "1px solid rgba(239, 68, 68, 0.35)", background: "rgba(239, 68, 68, 0.08)", color: "var(--danger)", fontSize: "0.78rem" }}>
              {invoiceLoadError}
            </div>
          )}

          {/* ========================================================================= */}
          {/* 5 EXECUTIVE KEY NUMBERS - COMPACT 1-ROW DASHBOARD (ZERO SCROLLING)       */}
          {/* ========================================================================= */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(185px, 1fr))',
              gap: '0.65rem',
              marginBottom: '1rem',
            }}
          >
            {/* 1. Total Income */}
            <div
              style={{
                background: 'var(--bg-tertiary)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '10px',
                padding: '0.75rem 0.95rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Total Income (Sales)
                </span>
                <TrendingUp size={13} color="var(--success)" />
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f59e0b', marginTop: '2px' }}>
                {formatCurrency(totalRevenue)}
              </div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                From {filteredOrders.length} settled tickets
              </div>
            </div>

            {/* 2. Total Expenditure */}
            <div
              style={{
                background: 'var(--bg-tertiary)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '10px',
                padding: '0.75rem 0.95rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Total Expenditure
                </span>
                <TrendingDown size={13} color="var(--danger)" />
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--danger)', marginTop: '2px' }}>
                {formatCurrency(plExpenditure)}
              </div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                Stock on hand: {formatCurrency(totalInventoryCost)} · Inventory paid: {formatCurrency(totalInventoryPurchaseCost)} · Salaries paid: {formatCurrency(totalSalaryPaid)}
              </div>
            </div>

            {/* 3. Net Operating Profit */}
            <div
              style={{
                background: isProfit ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                border: `1.5px solid ${isProfit ? 'rgba(16, 185, 129, 0.35)' : 'rgba(239, 68, 68, 0.35)'}`,
                borderRadius: '10px',
                padding: '0.75rem 0.95rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.7rem', color: isProfit ? 'var(--success)' : 'var(--danger)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  {isProfit ? 'Net Operating Profit' : 'Net Operating Loss'}
                </span>
                <span style={{ fontSize: '0.68rem', fontWeight: 800, color: isProfit ? 'var(--success)' : 'var(--danger)', background: isProfit ? 'rgba(16, 185, 129, 0.18)' : 'rgba(239, 68, 68, 0.18)', padding: '1px 5px', borderRadius: '4px' }}>
                  {profitMarginPercent}%
                </span>
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: 900, color: isProfit ? 'var(--success)' : 'var(--danger)', marginTop: '2px' }}>
                {isProfit ? '+' : '-'}{formatCurrency(Math.abs(plNet))}
              </div>
              <div style={{ fontSize: '0.68rem', color: isProfit ? 'var(--success)' : 'var(--danger)', marginTop: '2px' }}>
                Operating Margin: {profitMarginPercent}%
              </div>
            </div>

            {/* 4. Settled Orders */}
            <div
              style={{
                background: 'var(--bg-tertiary)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '10px',
                padding: '0.75rem 0.95rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Settled Orders
                </span>
                <Utensils size={13} color="var(--text-muted)" />
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '2px' }}>
                {filteredOrders.length} <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontWeight: 600 }}>Orders</span>
              </div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                Avg Ticket: {formatCurrency(averageBill)}
              </div>
            </div>

            {/* 5. Taxes & Service */}
            <div
              style={{
                background: 'var(--bg-tertiary)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '10px',
                padding: '0.75rem 0.95rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Taxes &amp; Service
                </span>
                <Receipt size={13} color="var(--info)" />
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--info)', marginTop: '2px' }}>
                {formatCurrency(totalTax + totalService)}
              </div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                GST: {formatCurrency(totalTax)} · Svc: {formatCurrency(totalService)}
              </div>
            </div>

          </div>

          {/* ========================================================================= */}
          {/* OPENING BALANCE & CLOSING BALANCE REGISTER BANNER (USER REQUESTED)        */}
          {/* ========================================================================= */}
          <div
            style={{
              background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.95) 0%, rgba(15, 23, 42, 0.98) 100%)',
              border: '1.5px solid rgba(245, 158, 11, 0.35)',
              borderRadius: '12px',
              padding: '0.85rem 1.25rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '1rem',
              marginBottom: '1rem',
              boxShadow: '0 4px 15px rgba(0, 0, 0, 0.25)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  background: 'rgba(245, 158, 11, 0.15)',
                  color: '#f59e0b',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Wallet size={20} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Daily Register &bull; Today's Balance Bar
                  </span>
                  <span style={{ fontSize: '0.68rem', padding: '1px 6px', borderRadius: '4px', background: todaySavedRecord?.isClosed ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)', color: todaySavedRecord?.isClosed ? '#10b981' : '#f59e0b', fontWeight: 700 }}>
                    {todaySavedRecord?.isClosed ? 'Shift Closed' : 'Live Shift'}
                  </span>
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Date: {now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} &bull; Cash Float: {formatCurrency(todayOpeningCash)} &bull; Bank: {formatCurrency(todayOpeningBank)}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
              <div>
                <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                  Opening Balance
                </span>
                <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#f59e0b' }}>
                  {formatCurrency(todayOpeningTotal)}
                </div>
              </div>

              <div style={{ fontSize: '1.2rem', color: 'var(--text-dim)', fontWeight: 700 }}>&rarr;</div>

              <div>
                <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                  Inflows (Sales)
                </span>
                <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#10b981' }}>
                  +{formatCurrency(todayTotalInflow)}
                </div>
              </div>

              <div style={{ fontSize: '1.2rem', color: 'var(--text-dim)', fontWeight: 700 }}>&minus;</div>

              <div>
                <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                  Outflows (Expenses)
                </span>
                <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#ef4444' }}>
                  -{formatCurrency(todayTotalOutflow)}
                </div>
              </div>

              <div style={{ fontSize: '1.2rem', color: 'var(--text-dim)', fontWeight: 700 }}>=</div>

              <div>
                <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                  Closing Balance
                </span>
                <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#3b82f6' }}>
                  {formatCurrency(todayClosingTotal)}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActiveTab('daily-register')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '0.45rem 0.85rem',
                  background: 'rgba(245, 158, 11, 0.15)',
                  border: '1px solid rgba(245, 158, 11, 0.4)',
                  borderRadius: '8px',
                  color: '#f59e0b',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <span>Manage Register</span>
                <ArrowRight size={13} />
              </button>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* MASTER VIEW MODE TABS (SEAMLESS HORIZONTAL SCROLL STRIP)                  */}
          {/* ========================================================================= */}
          <div
            ref={tabsScrollRef}
            onWheel={(e) => {
              if (e.deltaY !== 0 && tabsScrollRef.current) {
                tabsScrollRef.current.scrollLeft += e.deltaY;
              }
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              flexWrap: 'nowrap',
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '11px',
              padding: '4px',
              marginBottom: '1rem',
              overflowX: 'auto',
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
              scrollBehavior: 'smooth',
              WebkitOverflowScrolling: 'touch',
            }}
          >
              {navTabs.map((tab) => {
                const isActive = activeTab === tab.id;
                const Icon = tab.icon;

                // Color logic:
                // - statement: profit -> green, loss -> red
                // - expenditure: orange
                // - sales & income: amber/orange
                let activeBackground = 'linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)';
                let activeShadow = '0 2px 8px rgba(245, 158, 11, 0.3)';

                if (tab.id === 'statement') {
                  if (isProfit) {
                    activeBackground = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
                    activeShadow = '0 2px 8px rgba(16, 185, 129, 0.35)';
                  } else {
                    activeBackground = 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)';
                    activeShadow = '0 2px 8px rgba(239, 68, 68, 0.35)';
                  }
                } else if (tab.id === 'expenditure') {
                  activeBackground = 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)';
                  activeShadow = '0 2px 8px rgba(249, 115, 22, 0.35)';
                }

                // Inactive styling for statement badge
                let inactiveBadgeBg = 'rgba(var(--surface-rgb), 0.08)';
                let inactiveBadgeColor = 'var(--text-dim)';
                let inactiveBadgeBorder = 'none';

                if (tab.id === 'statement' && !isActive) {
                  inactiveBadgeBg = isProfit ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)';
                  inactiveBadgeColor = isProfit ? '#10b981' : '#ef4444';
                  inactiveBadgeBorder = `1px solid ${isProfit ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`;
                }

                return (
                  <button
                    key={tab.id}
                    data-active={isActive ? "true" : "false"}
                    type='button'
                    onClick={() => setActiveTab(tab.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '0.45rem 0.85rem',
                      borderRadius: '8px',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      border: 'none',
                      whiteSpace: 'nowrap',
                      flexShrink: 0,
                      transition: 'all 0.15s ease',
                      background: isActive ? activeBackground : 'transparent',
                      color: isActive ? '#ffffff' : 'var(--text-muted)',
                      boxShadow: isActive ? activeShadow : 'none',
                    }}
                  >
                    <Icon size={14} />
                    <span>{tab.label}</span>
                    {tab.badge && (
                      <span
                        style={{
                          fontSize: '0.66rem',
                          padding: '1px 5px',
                          borderRadius: '10px',
                          background: isActive ? 'rgba(255, 255, 255, 0.25)' : inactiveBadgeBg,
                          color: isActive ? '#ffffff' : inactiveBadgeColor,
                          border: isActive ? 'none' : inactiveBadgeBorder,
                          fontWeight: 700,
                        }}
                      >
                        {tab.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

          {/* ========================================================================= */}
          {/* TAB 1: SALES & CHANNELS (PAYMENT DISTRIBUTION + TOP DISHES)               */}
          {/* ========================================================================= */}
          {activeTab === 'sales' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Two Column Grid */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
                  gap: '1rem',
                }}
              >
                {/* Left Column: Payment Channel Distribution */}
                <div
                  style={{
                    background: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '12px',
                    padding: '1rem',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}
                >
                  <h3
                    style={{
                      fontSize: '0.88rem',
                      fontWeight: 700,
                      color: 'var(--text-main)',
                      marginBottom: '0.85rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                    }}
                  >
                    <Smartphone size={15} color="#38bdf8" />
                    <span>Payment Channel Distribution</span>
                  </h3>

                  {/* UPI */}
                  <div style={{ marginBottom: '0.85rem' }}>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: '0.78rem',
                        marginBottom: '4px',
                      }}
                    >
                      <span style={{ color: 'var(--info)', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 700 }}>
                        <Smartphone size={13} /> UPI ({upiPercent}%)
                      </span>
                      <span style={{ color: 'var(--text-main)', fontWeight: 800 }}>
                        {formatCurrency(paymentStats.upi)}
                      </span>
                    </div>
                    <div style={{ width: '100%', height: '7px', background: 'var(--border-subtle)', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ width: `${upiPercent}%`, height: '100%', background: '#38bdf8' }} />
                    </div>
                  </div>

                  {/* Cash */}
                  <div style={{ marginBottom: '0.85rem' }}>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: '0.78rem',
                        marginBottom: '4px',
                      }}
                    >
                      <span style={{ color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 700 }}>
                        <Banknote size={13} /> Cash ({cashPercent}%)
                      </span>
                      <span style={{ color: 'var(--text-main)', fontWeight: 800 }}>
                        {formatCurrency(paymentStats.cash)}
                      </span>
                    </div>
                    <div style={{ width: '100%', height: '7px', background: 'var(--border-subtle)', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ width: `${cashPercent}%`, height: '100%', background: '#10b981' }} />
                    </div>
                  </div>


                </div>

                {/* Right Column: Top Selling Items */}
                <div
                  style={{
                    background: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '12px',
                    padding: '1rem',
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '0.75rem',
                    }}
                  >
                    <h3
                      style={{
                        fontSize: '0.88rem',
                        fontWeight: 700,
                        color: "var(--text-main)",
                        margin: 0,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                      }}
                    >
                      <Award size={15} color="#f59e0b" />
                      <span>Top Selling Items</span>
                    </h3>
                    {sortedDishes.length > 3 && (
                      <button
                        onClick={() => setShowAllDishes((prev) => !prev)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#f59e0b',
                          fontSize: '0.74rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '3px',
                          padding: 0,
                        }}
                      >
                        <span>{showAllDishes ? 'Top 3' : 'View All'}</span>
                        <ArrowRight size={12} />
                      </button>
                    )}
                  </div>

                  <div
                    className='no-scrollbar'
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.5rem',
                      maxHeight: '150px',
                      overflowY: 'auto',
                    }}
                  >
                    {displayedDishes.length === 0 ? (
                      <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.78rem' }}>
                        {ordersLoaded ? "No settled orders recorded for this period" : "Loading orders data..."}
                      </div>
                    ) : (
                      displayedDishes.map(([name, qty], index) => (
                        <div
                          key={name}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            padding: "0.45rem 0.6rem",
                            borderRadius: "7px",
                            background: "var(--bg-card)",
                            border: "1px solid var(--border-subtle)",
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
                            <span
                              style={{
                                width: "20px",
                                height: "20px",
                                borderRadius: "50%",
                                background: index === 0 ? "#f59e0b" : index === 1 ? "#64748b" : "var(--border-card)",
                                color: index <= 1 ? "#000000" : "var(--text-main)",
                                fontWeight: 800,
                                fontSize: "0.68rem",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                            >
                              {index + 1}
                            </span>
                            <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text-main)" }}>
                              {name}
                            </span>
                          </div>
                          <span style={{ fontSize: "0.76rem", fontWeight: 700, color: "var(--accent-amber-light)" }}>
                            {qty} orders
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Settlement Revenue Composition Strip */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '0.65rem',
                  background: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '12px',
                  padding: '0.85rem 1rem',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', fontWeight: 600 }}>{isBarMode ? "Beverage Net Sales" : "Food & Beverage Net Sales"}</div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '2px' }}>
                    {formatCurrency(grossFoodSales)}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', fontWeight: 600 }}>GST &amp; Direct Taxes Collected</div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--success)', marginTop: '2px' }}>
                    {formatCurrency(totalTax)}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', fontWeight: 600 }}>Customer Service Charges</div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--info)', marginTop: '2px' }}>
                    {formatCurrency(totalService)}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', fontWeight: 600 }}>Customer Discounts Given</div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 800, color: totalDiscount > 0 ? 'var(--accent-purple)' : 'var(--text-dim)', marginTop: '2px' }}>
                    {formatCurrency(totalDiscount)}
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* ========================================================================= */}
          {/* PRIMARY ACCOUNTING & FINANCIAL SUITE (MATCHING USER SCREENSHOTS)          */}
          {/* ========================================================================= */}
          {activeTab === 'statement' && (
            <ProfitLossStatementView
              orders={pastOrders}
              inventoryPurchases={inventoryPurchases}
              salaryPayments={salaryPayments}
              inventoryItems={inventoryItems}
            />
          )}

          {activeTab === 'trial-balance' && (
            <TrialBalanceView
              orders={pastOrders}
              inventoryPurchases={inventoryPurchases}
              salaryPayments={salaryPayments}
              inventoryItems={inventoryItems}
            />
          )}

          {activeTab === 'stock-summary' && (
            <StockSummaryReportView
              inventoryItems={inventoryItems}
              inventoryPurchases={inventoryPurchases}
            />
          )}

          {activeTab === 'balance-sheet' && (
            <BalanceSheetView
              orders={pastOrders}
              inventoryPurchases={inventoryPurchases}
              salaryPayments={salaryPayments}
              inventoryItems={inventoryItems}
            />
          )}

          {activeTab === 'daily-register' && (
            <DailyBalanceRegister
              orders={pastOrders}
              inventoryPurchases={inventoryPurchases}
              salaryPayments={salaryPayments}
            />
          )}

          {activeTab === 'coa' && (
            <ChartOfAccountsView />
          )}

          {activeTab === 'general-ledger' && (
            <GeneralLedgerView
              orders={pastOrders}
              inventoryPurchases={inventoryPurchases}
              salaryPayments={salaryPayments}
              inventoryItems={inventoryItems}
            />
          )}

          {activeTab === 'journal-entries' && (
            <JournalEntriesView currentSession={restaurantSettings} />
          )}

          {activeTab === 'audit-documents' && (
            <AuditDocumentsView />
          )}

          {/* ========================================================================= */}
          {/* LEGACY OPERATIONAL PROFIT & LOSS STATEMENT                                */}
          {/* ========================================================================= */}
          {activeTab === 'legacy_statement' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              
              {/* Corner Row: Date Filter Dropdown + Export CSV / Excel Button (Matching Image 1) */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  alignItems: 'center',
                  gap: '0.65rem',
                  flexWrap: 'wrap',
                  marginBottom: '0.15rem',
                }}
              >
                {/* Date Filter Dropdown (e.g. 01-Nov-2026 to 30-Nov-2026 ⌵) */}
                <div style={{ position: 'relative' }} ref={cornerDateRef}>
                  <button
                    type="button"
                    onClick={() => setIsCornerDateOpen((prev) => !prev)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.45rem',
                      background: 'var(--bg-tertiary)',
                      border: filterPeriod === 'custom' || filterPeriod === 'single_date' ? '1.5px solid var(--accent-amber)' : '1px solid var(--border-subtle)',
                      borderRadius: '9px',
                      padding: '0.38rem 0.75rem',
                      color: 'var(--text-main)',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      boxShadow: '0 2px 6px rgba(0, 0, 0, 0.2)',
                      transition: 'all 0.15s ease',
                    }}
                    title="Click to select date or filter period"
                  >
                    <Calendar size={13} color="#f59e0b" />
                    <span>{getCornerDateLabel()}</span>
                    <ChevronDown size={13} color="var(--text-muted)" style={{ transform: isCornerDateOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease' }} />
                  </button>

                  {/* Dropdown Menu Popover */}
                  {isCornerDateOpen && (
                    <div
                      style={{
                        position: 'absolute',
                        top: 'calc(100% + 6px)',
                        right: 0,
                        zIndex: 9999,
                        minWidth: '280px',
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: '12px',
                        padding: '0.75rem',
                        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.5rem',
                      }}
                    >
                      <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Reporting Period Filter
                      </div>
                      
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
                        {[
                          { id: 'today', label: 'Today' },
                          { id: 'yesterday', label: 'Yesterday' },
                          { id: 'single_date', label: 'Particular Date' },
                          { id: 'this_week', label: 'This Week' },
                          { id: 'week', label: 'Last 7 Days' },
                          { id: 'last_week', label: 'Last Week' },
                          { id: 'this_month', label: 'This Month' },
                          { id: 'last_month', label: 'Last Month' },
                          { id: 'this_quarter', label: 'This Quarter' },
                          { id: 'this_year', label: 'This Year' },
                          { id: 'all', label: 'All Time' },
                          { id: 'custom', label: 'Custom Range' },
                        ].map((opt) => (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => {
                              handleSelectPeriod(opt.id);
                              if (opt.id !== 'single_date' && opt.id !== 'custom') {
                                setIsCornerDateOpen(false);
                              }
                            }}
                            style={{
                              padding: '0.35rem 0.55rem',
                              borderRadius: '6px',
                              border: filterPeriod === opt.id ? '1px solid var(--accent-amber)' : '1px solid transparent',
                              background: filterPeriod === opt.id ? 'rgba(245, 158, 11, 0.18)' : 'var(--bg-tertiary)',
                              color: filterPeriod === opt.id ? '#f59e0b' : 'var(--text-main)',
                              fontSize: '0.74rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                              textAlign: 'left',
                            }}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>

                      {/* Particular Date Input */}
                      {filterPeriod === 'single_date' && (
                        <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '0.5rem', marginTop: '4px' }}>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700, marginBottom: '4px' }}>
                            Pick Particular Date:
                          </div>
                          <input
                            type="date"
                            value={startDate || todayYMD}
                            max={todayYMD}
                            onChange={(e) => {
                              const val = e.target.value;
                              setStartDate(val);
                              setEndDate(val);
                            }}
                            style={{
                              width: '100%',
                              padding: '0.35rem 0.5rem',
                              background: 'var(--bg-tertiary)',
                              border: '1px solid var(--border-subtle)',
                              borderRadius: '6px',
                              color: 'var(--text-main)',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              boxSizing: 'border-box',
                            }}
                          />
                        </div>
                      )}

                      {/* Custom Range Inputs */}
                      {filterPeriod === 'custom' && (
                        <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '0.5rem', marginTop: '4px' }}>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700, marginBottom: '4px' }}>
                            Pick Custom Dates:
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <input
                              type="date"
                              value={startDate}
                              max={endDate || todayYMD}
                              onChange={(e) => setStartDate(e.target.value)}
                              style={{
                                width: '50%',
                                padding: '0.35rem 0.4rem',
                                background: 'var(--bg-tertiary)',
                                border: '1px solid var(--border-subtle)',
                                borderRadius: '6px',
                                color: 'var(--text-main)',
                                fontSize: '0.73rem',
                                fontWeight: 600,
                                boxSizing: 'border-box',
                              }}
                            />
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>to</span>
                            <input
                              type="date"
                              value={endDate}
                              min={startDate || undefined}
                              max={todayYMD}
                              onChange={(e) => setEndDate(e.target.value)}
                              style={{
                                width: '50%',
                                padding: '0.35rem 0.4rem',
                                background: 'var(--bg-tertiary)',
                                border: '1px solid var(--border-subtle)',
                                borderRadius: '6px',
                                color: 'var(--text-main)',
                                fontSize: '0.73rem',
                                fontWeight: 600,
                                boxSizing: 'border-box',
                              }}
                            />
                          </div>
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() => setIsCornerDateOpen(false)}
                        style={{
                          marginTop: '4px',
                          padding: '0.4rem',
                          background: 'linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)',
                          border: 'none',
                          borderRadius: '6px',
                          color: '#fff',
                          fontSize: '0.74rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        Apply Date Filter
                      </button>
                    </div>
                  )}
                </div>

                {/* Export Button (Matching Image 1 [Export CSV] button) */}
                <div style={{ position: 'relative' }} ref={exportMenuRef}>
                  <button
                    type="button"
                    onClick={handleExportExcel}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      background: 'rgba(16, 185, 129, 0.12)',
                      border: '1px solid rgba(16, 185, 129, 0.4)',
                      borderRadius: '9px',
                      padding: '0.38rem 0.85rem',
                      color: 'var(--success)',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      boxShadow: '0 2px 6px rgba(0, 0, 0, 0.15)',
                      transition: 'all 0.15s ease',
                    }}
                    title="Export neat Profit & Loss Excel sheet (Template as Image 3)"
                  >
                    <Download size={13} />
                    <span>Export CSV</span>
                    <span
                      onClick={(e) => { e.stopPropagation(); setIsExportMenuOpen((prev) => !prev); }}
                      style={{ display: 'flex', alignItems: 'center', paddingLeft: '4px', borderLeft: '1px solid rgba(16, 185, 129, 0.3)', cursor: 'pointer' }}
                      title="More export options"
                    >
                      <ChevronDown size={11} />
                    </span>
                  </button>

                  {isExportMenuOpen && (
                    <div
                      style={{
                        position: 'absolute',
                        top: 'calc(100% + 6px)',
                        right: 0,
                        zIndex: 9999,
                        minWidth: '220px',
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: '10px',
                        padding: '0.45rem',
                        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '3px',
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => { handleExportExcel(); setIsExportMenuOpen(false); }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '0.45rem 0.65rem',
                          borderRadius: '6px',
                          border: 'none',
                          background: 'rgba(16, 185, 129, 0.1)',
                          color: 'var(--success)',
                          fontSize: '0.76rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          textAlign: 'left',
                        }}
                      >
                        <FileSpreadsheet size={14} />
                        <span>Export Excel Sheet (.xls)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => { handleExportCSV(); setIsExportMenuOpen(false); }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '0.45rem 0.65rem',
                          borderRadius: '6px',
                          border: 'none',
                          background: 'transparent',
                          color: 'var(--text-main)',
                          fontSize: '0.76rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          textAlign: 'left',
                        }}
                      >
                        <Download size={14} />
                        <span>Export CSV File (.csv)</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Visual Balance Bar */}
              <div
                style={{
                  background: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '10px',
                  padding: '0.75rem 1rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-main)' }}>
                    Operating Balance Ratio (Revenue vs Expenditure)
                  </span>
                  <span style={{ fontSize: '0.76rem', fontWeight: 800, color: isProfit ? 'var(--success)' : 'var(--danger)' }}>
                    {isProfit ? 'Operating in Profit' : 'Operating at Loss'}
                  </span>
                </div>
                <div
                  style={{
                    height: '8px',
                    width: '100%',
                    background: 'var(--border-subtle)',
                    borderRadius: '4px',
                    overflow: 'hidden',
                    display: 'flex',
                  }}
                >
                  <div
                    style={{
                      width: plIncome + plExpenditure > 0 ? `${Math.round((plIncome / (plIncome + plExpenditure)) * 100)}%` : '50%',
                      background: '#10b981',
                      transition: 'width 0.4s ease',
                    }}
                    title={`Revenue Share: ${formatCurrency(plIncome)}`}
                  />
                  <div
                    style={{
                      width: plIncome + plExpenditure > 0 ? `${Math.round((plExpenditure / (plIncome + plExpenditure)) * 100)}%` : '50%',
                      background: '#ef4444',
                      transition: 'width 0.4s ease',
                    }}
                    title={`Cost Share: ${formatCurrency(plExpenditure)}`}
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', marginTop: '5px' }}>
                  <span style={{ color: 'var(--success)', fontWeight: 700 }}>
                    ● Income: {formatCurrency(plIncome)} ({plIncome + plExpenditure > 0 ? Math.round((plIncome / (plIncome + plExpenditure)) * 100) : 0}%)
                  </span>
                  <span style={{ color: 'var(--danger)', fontWeight: 700 }}>
                    ● Expenditure: {formatCurrency(plExpenditure)} ({plIncome + plExpenditure > 0 ? Math.round((plExpenditure / (plIncome + plExpenditure)) * 100) : 0}%)
                  </span>
                </div>
              </div>

              {/* Side by Side Two Column Template (Matching Image 1 with Active Internal Scroll on Both Cards) */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))',
                  gap: '1rem',
                  alignItems: 'stretch',
                }}
              >
                {/* 1. OPERATING REVENUE (INCOME) CARD */}
                <div
                  style={{
                    background: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    boxSizing: 'border-box',
                  }}
                >
                  {/* Header Strip - Fixed at top */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '9px 14px',
                      background: 'rgba(16, 185, 129, 0.08)',
                      borderBottom: '1px solid var(--border-subtle)',
                      flexShrink: 0,
                    }}
                  >
                    <span style={{ fontWeight: 800, color: 'var(--success)', fontSize: '0.82rem', letterSpacing: '0.02em' }}>
                      1. OPERATING REVENUE (INCOME)
                    </span>
                    <span style={{ fontWeight: 800, color: 'var(--success)', fontSize: '0.84rem' }}>
                      +{formatCurrency(totalRevenue)}
                    </span>
                  </div>

                  {/* Internal Scrollable Table Content */}
                  <div
                    style={{
                      height: '185px',
                      maxHeight: '185px',
                      overflowY: 'auto',
                      overflowX: 'hidden',
                      scrollbarWidth: 'thin',
                      scrollbarColor: 'rgba(16, 185, 129, 0.4) rgba(0, 0, 0, 0.2)',
                    }}
                  >
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                      <thead style={{ position: 'sticky', top: 0, zIndex: 3 }}>
                        <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-subtle)' }}>
                          <th style={{ padding: '7px 12px', textAlign: 'left', fontWeight: 700, color: 'var(--text-muted)', background: 'var(--bg-secondary)' }}>Accounting Head</th>
                          <th style={{ padding: '7px 12px', textAlign: 'left', fontWeight: 700, color: 'var(--text-muted)', background: 'var(--bg-secondary)' }}>Operational Context</th>
                          <th style={{ padding: '7px 12px', textAlign: 'right', fontWeight: 700, color: 'var(--text-muted)', background: 'var(--bg-secondary)' }}>Amount (₹)</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                          <td style={{ padding: '7px 12px', color: 'var(--text-main)', fontWeight: 600 }}>
                            {isBarMode ? "Gross Settled Bar Sales" : "Gross Settled Dining Sales"}
                          </td>
                          <td style={{ padding: '7px 12px', color: 'var(--text-muted)', fontSize: '0.73rem' }}>
                            Revenue from {filteredOrders.length} customer orders
                          </td>
                          <td style={{ padding: '7px 12px', textAlign: 'right', fontWeight: 700, color: 'var(--success)' }}>
                            +{formatCurrency(totalRevenue)}
                          </td>
                        </tr>
                        <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                          <td style={{ padding: '6px 12px', paddingLeft: '22px', color: 'var(--text-muted)' }}>
                            ↳ {isBarMode ? "Beverage" : "Food & Beverage"} Net Sales
                          </td>
                          <td style={{ padding: '6px 12px', color: 'var(--text-dim)', fontSize: '0.73rem' }}>
                            Bill total minus GST &amp; service charge
                          </td>
                          <td style={{ padding: '6px 12px', textAlign: 'right', color: 'var(--text-muted)' }}>
                            {formatCurrency(grossFoodSales)}
                          </td>
                        </tr>
                        {dineInRevenue > 0 && (
                          <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                            <td style={{ padding: '6px 12px', paddingLeft: '22px', color: 'var(--text-muted)' }}>
                              ↳ Dine-In Customer Sales
                            </td>
                            <td style={{ padding: '6px 12px', color: 'var(--text-dim)', fontSize: '0.73rem' }}>
                              In-restaurant table dining settlements
                            </td>
                            <td style={{ padding: '6px 12px', textAlign: 'right', color: 'var(--text-muted)' }}>
                              {formatCurrency(dineInRevenue)}
                            </td>
                          </tr>
                        )}
                        {takeawayRevenue > 0 && (
                          <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                            <td style={{ padding: '6px 12px', paddingLeft: '22px', color: 'var(--text-muted)' }}>
                              ↳ Takeaway &amp; Parcel Sales
                            </td>
                            <td style={{ padding: '6px 12px', color: 'var(--text-dim)', fontSize: '0.73rem' }}>
                              Direct counter &amp; takeaway settlements
                            </td>
                            <td style={{ padding: '6px 12px', textAlign: 'right', color: 'var(--text-muted)' }}>
                              {formatCurrency(takeawayRevenue)}
                            </td>
                          </tr>
                        )}
                        {paymentStats.upi > 0 && (
                          <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                            <td style={{ padding: '6px 12px', paddingLeft: '22px', color: 'var(--text-muted)' }}>
                              ↳ UPI / Digital Channel
                            </td>
                            <td style={{ padding: '6px 12px', color: 'var(--text-dim)', fontSize: '0.73rem' }}>
                              Settled via QR / payment gateways
                            </td>
                            <td style={{ padding: '6px 12px', textAlign: 'right', color: '#38bdf8' }}>
                              {formatCurrency(paymentStats.upi)}
                            </td>
                          </tr>
                        )}
                        {paymentStats.cash > 0 && (
                          <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                            <td style={{ padding: '6px 12px', paddingLeft: '22px', color: 'var(--text-muted)' }}>
                              ↳ Cash Register Channel
                            </td>
                            <td style={{ padding: '6px 12px', color: 'var(--text-dim)', fontSize: '0.73rem' }}>
                              Settled via physical cash register
                            </td>
                            <td style={{ padding: '6px 12px', textAlign: 'right', color: '#10b981' }}>
                              {formatCurrency(paymentStats.cash)}
                            </td>
                          </tr>
                        )}
                        <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                          <td style={{ padding: '6px 12px', paddingLeft: '22px', color: 'var(--text-muted)' }}>
                            ↳ GST &amp; Direct Taxes Collected
                          </td>
                          <td style={{ padding: '6px 12px', color: 'var(--text-dim)', fontSize: '0.73rem' }}>
                            Tax liability collected from invoices
                          </td>
                          <td style={{ padding: '6px 12px', textAlign: 'right', color: 'var(--info)' }}>
                            {formatCurrency(totalTax)}
                          </td>
                        </tr>
                        <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                          <td style={{ padding: '6px 12px', paddingLeft: '22px', color: 'var(--text-muted)' }}>
                            ↳ Service Charges Collected
                          </td>
                          <td style={{ padding: '6px 12px', color: 'var(--text-dim)', fontSize: '0.73rem' }}>
                            Customer dining service fees
                          </td>
                          <td style={{ padding: '6px 12px', textAlign: 'right', color: 'var(--info)' }}>
                            {formatCurrency(totalService)}
                          </td>
                        </tr>
                        <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                          <td style={{ padding: '7px 12px', color: '#f59e0b', fontWeight: 600 }}>
                            Less: Bill Discounts Given
                          </td>
                          <td style={{ padding: '7px 12px', color: 'var(--text-muted)', fontSize: '0.73rem' }}>
                            Promotions &amp; customer reductions
                          </td>
                          <td style={{ padding: '7px 12px', textAlign: 'right', fontWeight: 700, color: '#f59e0b' }}>
                            -{formatCurrency(totalDiscount)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Left Footer Row - Fixed at bottom */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '9px 14px',
                      background: 'var(--bg-secondary)',
                      borderTop: '1px solid var(--border-subtle)',
                      flexShrink: 0,
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 800, color: 'var(--text-main)', fontSize: '0.78rem' }}>
                        Total Net Operating Revenue
                      </div>
                      <div style={{ fontSize: '0.71rem', color: 'var(--text-dim)' }}>
                        Adjusted for discounts
                      </div>
                    </div>
                    <div style={{ fontWeight: 800, color: 'var(--success)', fontSize: '0.9rem' }}>
                      {formatCurrency(netRevenueAfterDiscount)}
                    </div>
                  </div>
                </div>

                {/* 2. OPERATING EXPENDITURE & INVENTORY CARD */}
                <div
                  style={{
                    background: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    boxSizing: 'border-box',
                  }}
                >
                  {/* Header Strip - Fixed at top */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '9px 14px',
                      background: 'rgba(239, 68, 68, 0.08)',
                      borderBottom: '1px solid var(--border-subtle)',
                      flexShrink: 0,
                    }}
                  >
                    <span style={{ fontWeight: 800, color: 'var(--danger)', fontSize: '0.82rem', letterSpacing: '0.02em' }}>
                      2. OPERATING EXPENDITURE &amp; INVENTORY
                    </span>
                    <span style={{ fontWeight: 800, color: 'var(--danger)', fontSize: '0.84rem' }}>
                      -{formatCurrency(plExpenditure)}
                    </span>
                  </div>

                  {/* Internal Scrollable Table Content */}
                  <div
                    style={{
                      height: '185px',
                      maxHeight: '185px',
                      overflowY: 'auto',
                      overflowX: 'hidden',
                      scrollbarWidth: 'thin',
                      scrollbarColor: 'rgba(239, 68, 68, 0.4) rgba(0, 0, 0, 0.2)',
                    }}
                  >
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                      <thead style={{ position: 'sticky', top: 0, zIndex: 3 }}>
                        <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-subtle)' }}>
                          <th style={{ padding: '7px 12px', textAlign: 'left', fontWeight: 700, color: 'var(--text-muted)', background: 'var(--bg-secondary)' }}>Accounting Head</th>
                          <th style={{ padding: '7px 12px', textAlign: 'left', fontWeight: 700, color: 'var(--text-muted)', background: 'var(--bg-secondary)' }}>Operational Context</th>
                          <th style={{ padding: '7px 12px', textAlign: 'right', fontWeight: 700, color: 'var(--text-muted)', background: 'var(--bg-secondary)' }}>Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                          <td style={{ padding: '7px 12px', color: 'var(--text-main)', fontWeight: 600 }}>
                            Current Ingredient Stock Valuation
                          </td>
                          <td style={{ padding: '7px 12px', color: 'var(--text-muted)', fontSize: '0.73rem' }}>
                            {inventoryItems.length} items at unit cost
                          </td>
                          <td style={{ padding: '7px 12px', textAlign: 'right', fontWeight: 700, color: 'var(--text-main)' }}>
                            -{formatCurrency(totalInventoryCost)}
                          </td>
                        </tr>

                        {/* All dynamic inventory categories scrollable internally */}
                        {inventoryCategoryBreakdown.map(([cat, val]) => (
                          <tr key={cat} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                            <td style={{ padding: '5px 12px', paddingLeft: '22px', color: 'var(--text-muted)', fontSize: '0.74rem' }}>
                              ↳ {cat} Stock Cost
                            </td>
                            <td style={{ padding: '5px 12px', color: 'var(--text-dim)', fontSize: '0.72rem' }}>
                              Category inventory valuation
                            </td>
                            <td style={{ padding: '5px 12px', textAlign: 'right', color: 'var(--text-dim)', fontSize: '0.74rem' }}>
                              {formatCurrency(val)}
                            </td>
                          </tr>
                        ))}

                        {dineInventoryPurchaseCost > 0 && (
                          <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                            <td style={{ padding: '6px 12px', paddingLeft: '22px', color: 'var(--text-main)', fontWeight: 600 }}>
                              ↳ Dine Inventory Purchases
                            </td>
                            <td style={{ padding: '6px 12px', color: 'var(--text-muted)', fontSize: '0.73rem' }}>
                              {filteredInventoryPurchases.filter((p) => String(p.department || "dine").toLowerCase() !== "bar").length} recorded receipts in period
                            </td>
                            <td style={{ padding: '6px 12px', textAlign: 'right', fontWeight: 700, color: 'var(--danger)' }}>
                              -{formatCurrency(dineInventoryPurchaseCost)}
                            </td>
                          </tr>
                        )}

                        {barInventoryPurchaseCost > 0 && (
                          <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                            <td style={{ padding: '6px 12px', paddingLeft: '22px', color: 'var(--text-main)', fontWeight: 600 }}>
                              ↳ Bar Inventory Purchases
                            </td>
                            <td style={{ padding: '6px 12px', color: 'var(--text-muted)', fontSize: '0.73rem' }}>
                              {filteredInventoryPurchases.filter((p) => String(p.department || "").toLowerCase() === "bar").length} recorded receipts in period
                            </td>
                            <td style={{ padding: '6px 12px', textAlign: 'right', fontWeight: 700, color: 'var(--danger)' }}>
                              -{formatCurrency(barInventoryPurchaseCost)}
                            </td>
                          </tr>
                        )}

                        {totalSalaryPaid > 0 && (
                          <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                            <td style={{ padding: '6px 12px', paddingLeft: '22px', color: 'var(--text-main)', fontWeight: 600 }}>
                              ↳ Staff Salary Payments
                            </td>
                            <td style={{ padding: '6px 12px', color: 'var(--text-muted)', fontSize: '0.73rem' }}>
                              {filteredSalaryPayments.length} dated staff payments
                            </td>
                            <td style={{ padding: '6px 12px', textAlign: 'right', fontWeight: 700, color: 'var(--danger)' }}>
                              -{formatCurrency(totalSalaryPaid)}
                            </td>
                          </tr>
                        )}

                        <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                          <td style={{ padding: '7px 12px', color: '#f59e0b', fontWeight: 600 }}>
                            Customer Discounts Absorbed
                          </td>
                          <td style={{ padding: '7px 12px', color: 'var(--text-muted)', fontSize: '0.73rem' }}>
                            Promotional reductions on bills
                          </td>
                          <td style={{ padding: '7px 12px', textAlign: 'right', fontWeight: 700, color: '#f59e0b' }}>
                            -{formatCurrency(totalDiscount)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Right Footer Row - Fixed at bottom */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '9px 14px',
                      background: 'var(--bg-secondary)',
                      borderTop: '1px solid var(--border-subtle)',
                      flexShrink: 0,
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 800, color: 'var(--text-main)', fontSize: '0.78rem' }}>
                        Total Operating Expenditure
                      </div>
                      <div style={{ fontSize: '0.71rem', color: 'var(--text-dim)' }}>
                        Stock + discounts
                      </div>
                    </div>
                    <div style={{ fontWeight: 800, color: 'var(--danger)', fontSize: '0.9rem' }}>
                      -{formatCurrency(plExpenditure)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Full-width NET OPERATING PROFIT Banner Underneath (Matching Image 1) */}
              <div
                style={{
                  background: isProfit ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                  border: `1.5px solid ${isProfit ? 'rgba(16, 185, 129, 0.35)' : 'rgba(239, 68, 68, 0.35)'}`,
                  borderRadius: '12px',
                  padding: '1rem 1.35rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '0.75rem',
                  boxShadow: isProfit ? '0 4px 15px rgba(16, 185, 129, 0.12)' : '0 4px 15px rgba(239, 68, 68, 0.12)',
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: '0.95rem',
                      fontWeight: 900,
                      color: isProfit ? 'var(--success)' : 'var(--danger)',
                      letterSpacing: '0.04em',
                      textTransform: 'uppercase',
                    }}
                  >
                    {isProfit ? 'NET OPERATING PROFIT' : 'NET OPERATING LOSS'}
                  </div>
                  <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: '2px', fontWeight: 600 }}>
                    Total Income − Total Expenditure ({profitMarginPercent}% Operating Margin)
                  </div>
                </div>
                <div
                  style={{
                    fontSize: '1.45rem',
                    fontWeight: 900,
                    color: isProfit ? 'var(--success)' : 'var(--danger)',
                  }}
                >
                  {isProfit ? '+' : '-'}{formatCurrency(Math.abs(plNet))}
                </div>
              </div>

            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 3: DETAILED INCOME TABLE (PAGINATED - SINGLE PAGE VIEWPORT)           */}
          {/* ========================================================================= */}
          {activeTab === 'income' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {/* Search & Stats Bar */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '0.65rem',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    background: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '9px',
                    padding: '0.38rem 0.75rem',
                    gap: '0.45rem',
                    width: '300px',
                    maxWidth: '100%',
                  }}
                >
                  <Search size={14} color='var(--text-muted)' />
                  <input
                    type='text'
                    placeholder='Search order #, table, dish or payment...'
                    value={incomeSearch}
                    onChange={(e) => setIncomeSearch(e.target.value)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      outline: 'none',
                      color: 'var(--text-main)',
                      fontSize: '0.78rem',
                      width: '100%',
                    }}
                  />
                  {incomeSearch && (
                    <button
                      type="button"
                      onClick={() => setIncomeSearch('')}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)', fontSize: '0.75rem', padding: 0 }}
                    >
                      ✕
                    </button>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flexWrap: 'wrap' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Showing <strong style={{ color: 'var(--text-main)' }}>{searchedOrders.length}</strong> of {filteredOrders.length} settled tickets · Page {ordersPage} of {totalOrdersPages}
                  </div>

                  {/* Export CSV Button (Matching Image 1 & 2) */}
                  <button
                    type="button"
                    onClick={handleExportLedgerReconciliationExcel}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.45rem',
                      background: 'rgba(16, 185, 129, 0.08)',
                      border: '1.5px solid #10b981',
                      borderRadius: '10px',
                      padding: '0.38rem 0.85rem',
                      color: '#ffffff',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      boxShadow: '0 2px 8px rgba(16, 185, 129, 0.2)',
                      transition: 'all 0.15s ease',
                    }}
                    title="Export settled tickets to CSV"
                  >
                    <Download size={14} color="#10b981" />
                    <span>Export CSV</span>
                  </button>
                </div>
              </div>

              {/* Paginated Orders Table */}
              <div
                style={{
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '11px',
                  overflowX: 'auto',
                  background: 'var(--bg-tertiary)',
                }}
              >
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-subtle)' }}>
                      <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 700, color: 'var(--text-muted)', width: '35px' }}>#</th>
                      <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 700, color: 'var(--text-muted)' }}>Order ID</th>
                      <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 700, color: 'var(--text-muted)' }}>Date &amp; Time</th>
                      <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 700, color: 'var(--text-muted)' }}>Table</th>
                      <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 700, color: 'var(--text-muted)' }}>Items Summary</th>
                      <th style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 700, color: 'var(--text-muted)' }}>Payment</th>
                      <th style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, color: 'var(--text-muted)' }}>Tax</th>
                      <th style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, color: 'var(--text-muted)' }}>Discount</th>
                      <th style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, color: 'var(--text-muted)' }}>Total Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedOrders.length === 0 ? (
                      <tr>
                        <td colSpan={9} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                          No settled orders found matching the filter criteria.
                        </td>
                      </tr>
                    ) : (
                      paginatedOrders.map((ord, idx) => {
                        const itemSummary = (ord.items || [])
                          .map((i) => `${i.name || 'Dish'}${i.quantity > 1 ? ` (x${i.quantity})` : ''}`)
                          .join(', ');
                        const settledAt = ord.settledAt || ord.closedAt || ord.createdAt || ord.time || '';
                        const dateStr = settledAt
                          ? new Date(settledAt).toLocaleString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : ord.date || '—';
                        const pm = normalizePaymentMethod(ord);
                        const globalIndex = (ordersPage - 1) * ITEMS_PER_PAGE + idx + 1;
                        return (
                          <tr
                            key={ord.id || idx}
                            style={{
                              borderBottom: '1px solid var(--border-subtle)',
                              background: idx % 2 === 0 ? 'transparent' : 'rgba(var(--surface-rgb),0.02)',
                            }}
                          >
                            <td style={{ padding: '7px 10px', color: 'var(--text-dim)', fontSize: '0.72rem' }}>{globalIndex}</td>
                            <td style={{ padding: '7px 10px', fontFamily: 'monospace', fontWeight: 700, color: 'var(--text-main)' }}>
                              #{ord.id || ord.orderNumber || globalIndex}
                            </td>
                            <td style={{ padding: '7px 10px', color: 'var(--text-muted)', whiteSpace: 'nowrap', fontSize: '0.74rem' }}>
                              {dateStr}
                            </td>
                            <td style={{ padding: '7px 10px', fontWeight: 600, color: 'var(--text-main)' }}>
                              {ord.table ? `Table ${ord.table}` : ord.tableName || 'Takeaway'}
                            </td>
                            <td
                              style={{
                                padding: '7px 10px',
                                color: 'var(--text-muted)',
                                maxWidth: '240px',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                fontSize: '0.75rem',
                              }}
                              title={itemSummary}
                            >
                              {itemSummary || '—'}
                            </td>
                            <td style={{ padding: '7px 10px', textAlign: 'center' }}>
                              <span
                                style={{
                                  background:
                                    pm === 'upi'
                                      ? 'rgba(56, 189, 248, 0.15)'
                                      : pm === 'cash'
                                      ? 'rgba(16, 185, 129, 0.15)'
                                      : 'rgba(192, 132, 252, 0.15)',
                                  color:
                                    pm === 'upi'
                                      ? '#38bdf8'
                                      : pm === 'cash'
                                      ? '#10b981'
                                      : '#c084fc',
                                  border: `1px solid ${
                                    pm === 'upi'
                                      ? 'rgba(56, 189, 248, 0.3)'
                                      : pm === 'cash'
                                      ? 'rgba(16, 185, 129, 0.3)'
                                      : 'rgba(192, 132, 252, 0.3)'
                                  }`,
                                  borderRadius: '999px',
                                  padding: '2px 7px',
                                  fontWeight: 700,
                                  fontSize: '0.68rem',
                                  textTransform: 'uppercase',
                                }}
                              >
                                {pm || 'OTHER'}
                              </span>
                            </td>
                            <td style={{ padding: '7px 10px', textAlign: 'right', color: 'var(--success)', fontWeight: 600 }}>
                              {formatCurrency(ord.taxAmount || 0)}
                            </td>
                            <td style={{ padding: '7px 10px', textAlign: 'right', color: 'var(--accent-purple)', fontWeight: 600 }}>
                              {formatCurrency(ord.discountAmount || 0)}
                            </td>
                            <td style={{ padding: '7px 10px', textAlign: 'right', fontWeight: 800, color: '#f59e0b' }}>
                              {formatCurrency(ord.grandTotal || ord.total || 0)}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                  <tfoot>
                    <tr style={{ background: 'var(--bg-secondary)', borderTop: '1.5px solid var(--border-subtle)' }}>
                      <td colSpan={6} style={{ padding: '8px 10px', fontWeight: 800, color: 'var(--text-main)', fontSize: '0.76rem' }}>
                        TOTAL SUMMARY ({searchedOrders.length} TICKETS)
                      </td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 800, color: 'var(--success)' }}>
                        {formatCurrency(searchedOrders.reduce((s, o) => s + (Number(o.taxAmount) || 0), 0))}
                      </td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 800, color: 'var(--accent-purple)' }}>
                        {formatCurrency(searchedOrders.reduce((s, o) => s + (Number(o.discountAmount) || 0), 0))}
                      </td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 900, color: '#f59e0b', fontSize: '0.88rem' }}>
                        {formatCurrency(searchedOrders.reduce((s, o) => s + (Number(o.grandTotal || o.total || 0)), 0))}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Pagination Bar for Orders */}
              {totalOrdersPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                  <button
                    type="button"
                    onClick={() => setOrdersPage((p) => Math.max(1, p - 1))}
                    disabled={ordersPage === 1}
                    style={{
                      background: 'var(--bg-tertiary)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '6px',
                      padding: '0.3rem 0.6rem',
                      color: ordersPage === 1 ? 'var(--text-dim)' : 'var(--text-main)',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      cursor: ordersPage === 1 ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '3px',
                    }}
                  >
                    <ChevronLeft size={13} />
                    <span>Previous</span>
                  </button>
                  <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 600, padding: '0 6px' }}>
                    Page {ordersPage} of {totalOrdersPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => setOrdersPage((p) => Math.min(totalOrdersPages, p + 1))}
                    disabled={ordersPage === totalOrdersPages}
                    style={{
                      background: 'var(--bg-tertiary)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '6px',
                      padding: '0.3rem 0.6rem',
                      color: ordersPage === totalOrdersPages ? 'var(--text-dim)' : 'var(--text-main)',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      cursor: ordersPage === totalOrdersPages ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '3px',
                    }}
                  >
                    <span>Next</span>
                    <ChevronRight size={13} />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 4: DETAILED EXPENDITURE & INVENTORY (PAGINATED - SINGLE PAGE VIEWPORT)*/}
          {/* ========================================================================= */}
          {activeTab === 'expenditure' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div
                role="group"
                aria-label="Expenditure sections"
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                  gap: '0.6rem',
                  padding: '4px',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '11px',
                  background: 'var(--bg-tertiary)',
                }}
              >
                {[
                  { id: 'inventory', label: 'Inventory', icon: Boxes },
                  { id: 'salary', label: 'Salary', icon: Banknote },
                ].map((view) => {
                  const Icon = view.icon;
                  const isSelected = expenditureView === view.id;
                  return (
                    <button
                      key={view.id}
                      type="button"
                      aria-pressed={isSelected}
                      onClick={() => setExpenditureView(view.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem',
                        minHeight: '42px',
                        border: 'none',
                        borderRadius: '8px',
                        background: isSelected ? 'linear-gradient(135deg, #f97316, #ea580c)' : 'transparent',
                        color: isSelected ? '#fff' : 'var(--text-muted)',
                        fontSize: '0.84rem',
                        fontWeight: 750,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <Icon size={16} />
                      {view.label}
                    </button>
                  );
                })}
              </div>

              {/* Inventory and payroll summary */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.65rem' }}>
                {expenditureView === 'inventory' && <div style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)', borderRadius: '9px', padding: '0.6rem 0.85rem' }}>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', fontWeight: 600 }}>Total Tracked Items</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '2px' }}>
                    {inventoryItems.length} {isBarMode ? "Bar Items" : "Ingredients"}
                  </div>
                </div>}
                {expenditureView === 'inventory' && <div style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)', borderRadius: '9px', padding: '0.6rem 0.85rem' }}>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', fontWeight: 600 }}>Total Stock Valuation</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--danger)', marginTop: '2px' }}>
                    {formatCurrency(totalInventoryCost)}
                  </div>
                </div>}
                {expenditureView === 'inventory' && <div style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)', borderRadius: '9px', padding: '0.6rem 0.85rem' }}>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', fontWeight: 600 }}>Low Stock Alert</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#f59e0b', marginTop: '2px' }}>
                    {lowStockCount} Items
                  </div>
                </div>}
                {expenditureView === 'inventory' && <div style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)', borderRadius: '9px', padding: '0.6rem 0.85rem' }}>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', fontWeight: 600 }}>Out of Stock</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#dc2626', marginTop: '2px' }}>
                    {outOfStockCount} Items
                  </div>
                </div>}
                {expenditureView === 'inventory' && <div style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)', borderRadius: '9px', padding: '0.6rem 0.85rem' }}>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', fontWeight: 600 }}>Inventory Purchases (Period)</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--danger)', marginTop: '2px' }}>
                    {formatCurrency(totalInventoryPurchaseCost)}
                  </div>
                </div>
                }
                {expenditureView === 'salary' && <div style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)', borderRadius: '9px', padding: '0.7rem 0.9rem' }}>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', fontWeight: 600 }}>Actual Salary Payments (Period)</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--danger)', marginTop: '2px' }}>
                    {formatCurrency(totalSalaryPaid)}
                  </div>
                </div>}
                {expenditureView === 'salary' && <div style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)', borderRadius: '9px', padding: '0.7rem 0.9rem' }}>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', fontWeight: 600 }}>Monthly Payroll Budget</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '2px' }}>
                    {formatCurrency(monthlyPayrollBudget)}
                  </div>
                </div>}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: '0.75rem' }}>
                {expenditureView === 'inventory' && <section style={{ border: '1px solid var(--border-subtle)', borderRadius: '10px', overflow: 'hidden', background: 'var(--bg-tertiary)' }}>
                  <div style={{ padding: '0.7rem 0.85rem', borderBottom: '1px solid var(--border-subtle)' }}>
                    <strong style={{ color: 'var(--text-main)', fontSize: '0.82rem' }}>Inventory Purchase Ledger</strong>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem', marginTop: '3px' }}>
                      Dine {formatCurrency(dineInventoryPurchaseCost)} · Bar {formatCurrency(barInventoryPurchaseCost)} · {getFilterPeriodLabel()}
                    </div>
                  </div>
                  <div style={{ maxHeight: '220px', overflow: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.72rem' }}>
                      <thead>
                        <tr style={{ textAlign: 'left', color: 'var(--text-dim)', background: 'var(--bg-secondary)' }}>
                          <th style={{ padding: '7px' }}>Date</th>
                          <th style={{ padding: '7px' }}>Department / Item</th>
                          <th style={{ padding: '7px', textAlign: 'right' }}>Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredInventoryPurchases.slice(0, 8).map((purchase) => (
                          <tr key={purchase.id} style={{ borderTop: '1px solid var(--border-subtle)', color: 'var(--text-main)' }}>
                            <td style={{ padding: '7px', whiteSpace: 'nowrap' }}>{purchase.purchaseDate}</td>
                            <td style={{ padding: '7px' }}>
                              <strong>{String(purchase.department || "dine").toUpperCase()}</strong> · {purchase.name}
                              <div style={{ color: 'var(--text-muted)', marginTop: '2px' }}>{purchase.supplier || "Supplier not recorded"}</div>
                            </td>
                            <td style={{ padding: '7px', textAlign: 'right', fontWeight: 700, whiteSpace: 'nowrap' }}>{formatCurrency(getInventoryPurchaseCost(purchase))}</td>
                          </tr>
                        ))}
                        {filteredInventoryPurchases.length === 0 && (
                          <tr><td colSpan={3} style={{ padding: '12px 8px', color: 'var(--text-muted)', textAlign: 'center' }}>No dated stock receipts in this period. New receipts will be tracked with their purchase cost.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </section>}

                {expenditureView === 'salary' && <section style={{ border: '1px solid var(--border-subtle)', borderRadius: '10px', overflow: 'hidden', background: 'var(--bg-tertiary)' }}>
                  <div style={{ padding: '0.7rem 0.85rem', borderBottom: '1px solid var(--border-subtle)' }}>
                    <strong style={{ color: 'var(--text-main)', fontSize: '0.82rem' }}>Recorded Salary Payments</strong>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem', marginTop: '3px' }}>
                      Actual payments {formatCurrency(totalSalaryPaid)} · Monthly salary budget {formatCurrency(monthlyPayrollBudget)}
                    </div>
                  </div>
                  <div style={{ maxHeight: '220px', overflow: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.72rem' }}>
                      <thead>
                        <tr style={{ textAlign: 'left', color: 'var(--text-dim)', background: 'var(--bg-secondary)' }}>
                          <th style={{ padding: '7px' }}>Paid On</th>
                          <th style={{ padding: '7px' }}>Staff / Salary Month</th>
                          <th style={{ padding: '7px', textAlign: 'right' }}>Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredSalaryPayments.slice(0, 8).map((payment) => (
                          <tr key={payment.id} style={{ borderTop: '1px solid var(--border-subtle)', color: 'var(--text-main)' }}>
                            <td style={{ padding: '7px', whiteSpace: 'nowrap' }}>{payment.paidOn}</td>
                            <td style={{ padding: '7px' }}>
                              <strong>{payment.staffName || "Staff"}</strong>
                              <div style={{ color: 'var(--text-muted)', marginTop: '2px' }}>{payment.salaryPeriod} · {payment.paymentMethod}</div>
                            </td>
                            <td style={{ padding: '7px', textAlign: 'right', fontWeight: 700, whiteSpace: 'nowrap' }}>{formatCurrency(payment.amount)}</td>
                          </tr>
                        ))}
                        {filteredSalaryPayments.length === 0 && (
                          <tr><td colSpan={3} style={{ padding: '12px 8px', color: 'var(--text-muted)', textAlign: 'center' }}>No salary payments recorded in this period.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </section>}
              </div>

              {expenditureView === 'inventory' && <>
              {/* Filter and Search Bar for Inventory */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '0.65rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      background: 'var(--bg-tertiary)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '9px',
                      padding: '0.38rem 0.75rem',
                      gap: '0.45rem',
                      width: '240px',
                      maxWidth: '100%',
                    }}
                  >
                    <Search size={14} color='var(--text-muted)' />
                    <input
                      type='text'
                      placeholder='Filter by item or supplier...'
                      value={invSearch}
                      onChange={(e) => setInvSearch(e.target.value)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        outline: 'none',
                        color: 'var(--text-main)',
                        fontSize: '0.78rem',
                        width: '100%',
                      }}
                    />
                    {invSearch && (
                      <button
                        type="button"
                        onClick={() => setInvSearch('')}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)', fontSize: '0.75rem', padding: 0 }}
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {/* Category Dropdown Filter */}
                  <select
                    value={invCategoryFilter}
                    onChange={(e) => setInvCategoryFilter(e.target.value)}
                    style={{
                      background: 'var(--bg-tertiary)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '9px',
                      padding: '0.38rem 0.75rem',
                      color: 'var(--text-main)',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      outline: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    <option value='all'>All Categories ({inventoryItems.length})</option>
                    {inventoryCategories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flexWrap: 'wrap' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Showing <strong style={{ color: 'var(--text-main)' }}>{searchedInventory.length}</strong> items · Page {invPage} of {totalInvPages}
                  </div>

                  {/* Export CSV Button (Matching Image 1 & 2) */}
                  <button
                    type="button"
                    onClick={handleExportExpenditureReconciliationExcel}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.45rem',
                      background: 'rgba(16, 185, 129, 0.08)',
                      border: '1.5px solid #10b981',
                      borderRadius: '10px',
                      padding: '0.38rem 0.85rem',
                      color: '#ffffff',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      boxShadow: '0 2px 8px rgba(16, 185, 129, 0.2)',
                      transition: 'all 0.15s ease',
                    }}
                    title="Export inventory valuation to CSV"
                  >
                    <Download size={14} color="#10b981" />
                    <span>Export CSV</span>
                  </button>
                </div>
              </div>

              {/* Paginated Inventory Table */}
              <div
                style={{
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '11px',
                  overflowX: 'auto',
                  background: 'var(--bg-tertiary)',
                }}
              >
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-subtle)' }}>
                      <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 700, color: 'var(--text-muted)', width: '35px' }}>#</th>
                      <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 700, color: 'var(--text-muted)' }}>Ingredient / Item</th>
                      <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 700, color: 'var(--text-muted)' }}>Category</th>
                      <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 700, color: 'var(--text-muted)' }}>Supplier</th>
                      <th style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 700, color: 'var(--text-muted)' }}>Stock</th>
                      <th style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 700, color: 'var(--text-muted)' }}>Threshold</th>
                      <th style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, color: 'var(--text-muted)' }}>Unit Cost</th>
                      <th style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, color: 'var(--text-muted)' }}>Valuation</th>
                      <th style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 700, color: 'var(--text-muted)', minWidth: '110px', whiteSpace: 'nowrap' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedInventory.length === 0 ? (
                      <tr>
                        <td colSpan={9} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                          No inventory ingredients found matching the filter.
                        </td>
                      </tr>
                    ) : (
                      paginatedInventory.map((item, idx) => {
                        const stock = Number(item.stock ?? 0);
                        const mrp = Number(item.mrp ?? item.unitCost ?? 0);
                        const totalCost = stock > 0 && mrp > 0 ? stock * mrp : 0;
                        const min = Number(item.minThreshold ?? 0);
                        const isOut = stock <= 0;
                        const isLow = !isOut && stock <= min;
                        const globalIndex = (invPage - 1) * ITEMS_PER_PAGE + idx + 1;

                        return (
                          <tr
                            key={item.id || idx}
                            style={{
                              borderBottom: '1px solid var(--border-subtle)',
                              background: idx % 2 === 0 ? 'transparent' : 'rgba(var(--surface-rgb),0.02)',
                            }}
                          >
                            <td style={{ padding: '7px 10px', color: 'var(--text-dim)', fontSize: '0.72rem' }}>{globalIndex}</td>
                            <td style={{ padding: '7px 10px', fontWeight: 700, color: 'var(--text-main)' }}>
                              {item.name || 'Unnamed Item'}
                            </td>
                            <td style={{ padding: '7px 10px', color: 'var(--text-muted)', fontSize: '0.74rem' }}>
                              {item.category || 'General'}
                            </td>
                            <td style={{ padding: '7px 10px', color: 'var(--text-muted)', fontSize: '0.74rem' }}>
                              {item.supplier || 'Local Supplier'}
                            </td>
                            <td style={{ padding: '7px 10px', textAlign: 'center', fontWeight: 700, color: isOut ? 'var(--danger)' : isLow ? '#f59e0b' : 'var(--text-main)' }}>
                              {stock} {item.unit || ''}
                            </td>
                            <td style={{ padding: '7px 10px', textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.72rem' }}>
                              {min} {item.unit || ''}
                            </td>
                            <td style={{ padding: '7px 10px', textAlign: 'right', color: 'var(--text-muted)', fontWeight: 600 }}>
                              {formatCurrency(mrp)}
                            </td>
                            <td style={{ padding: '7px 10px', textAlign: 'right', fontWeight: 800, color: totalCost > 0 ? 'var(--danger)' : 'var(--text-dim)' }}>
                              {formatCurrency(totalCost)}
                            </td>
                            <td style={{ padding: '7px 12px', textAlign: 'center', minWidth: '110px', whiteSpace: 'nowrap' }}>
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: '5px',
                                  padding: '2px 8px',
                                  borderRadius: '999px',
                                  fontSize: '0.68rem',
                                  fontWeight: 700,
                                  background: isOut
                                    ? 'rgba(239, 68, 68, 0.14)'
                                    : isLow
                                    ? 'rgba(245, 158, 11, 0.14)'
                                    : 'rgba(16, 185, 129, 0.14)',
                                  color: isOut ? 'var(--danger)' : isLow ? '#f59e0b' : 'var(--success)',
                                  border: `1px solid ${
                                    isOut
                                      ? 'rgba(239, 68, 68, 0.35)'
                                      : isLow
                                      ? 'rgba(245, 158, 11, 0.35)'
                                      : 'rgba(16, 185, 129, 0.35)'
                                  }`,
                                }}
                              >
                                <span
                                  style={{
                                    width: '5px',
                                    height: '5px',
                                    borderRadius: '50%',
                                    background: isOut ? '#ef4444' : isLow ? '#f59e0b' : '#10b981',
                                  }}
                                />
                                {isOut ? 'Out of Stock' : isLow ? 'Low Stock' : 'In Stock'}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                  <tfoot>
                    <tr style={{ background: 'var(--bg-secondary)', borderTop: '1.5px solid var(--border-subtle)' }}>
                      <td colSpan={7} style={{ padding: '8px 10px', fontWeight: 800, color: 'var(--text-main)', fontSize: '0.76rem' }}>
                        CURRENT INVENTORY STOCK VALUATION
                      </td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 900, color: 'var(--danger)', fontSize: '0.88rem' }}>
                        {formatCurrency(totalInventoryCost)}
                      </td>
                      <td style={{ padding: '8px 10px' }} />
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Pagination Bar for Inventory */}
              {totalInvPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                  <button
                    type="button"
                    onClick={() => setInvPage((p) => Math.max(1, p - 1))}
                    disabled={invPage === 1}
                    style={{
                      background: 'var(--bg-tertiary)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '6px',
                      padding: '0.3rem 0.6rem',
                      color: invPage === 1 ? 'var(--text-dim)' : 'var(--text-main)',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      cursor: invPage === 1 ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '3px',
                    }}
                  >
                    <ChevronLeft size={13} />
                    <span>Previous</span>
                  </button>
                  <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 600, padding: '0 6px' }}>
                    Page {invPage} of {totalInvPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => setInvPage((p) => Math.min(totalInvPages, p + 1))}
                    disabled={invPage === totalInvPages}
                    style={{
                      background: 'var(--bg-tertiary)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '6px',
                      padding: '0.3rem 0.6rem',
                      color: invPage === totalInvPages ? 'var(--text-dim)' : 'var(--text-main)',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      cursor: invPage === totalInvPages ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '3px',
                    }}
                  >
                    <span>Next</span>
                    <ChevronRight size={13} />
                  </button>
                </div>
              )}
              </>}
            </div>
          )}

        </div>
      </div>

      {/* ========================================================================= */}
      {/* PRINTABLE REPORT SHEET (Hidden on screen, rendered on window.print())     */}
      {/* ========================================================================= */}
      <div
        id='printable-report'
        style={{
          fontFamily: "'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
          color: '#0f172a',
          lineHeight: '1.4',
          fontSize: '12px',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            borderBottom: '2px solid #0f172a',
            paddingBottom: '12px',
            marginBottom: '16px',
          }}
        >
          <div>
            <h1
              style={{
                fontSize: '20px',
                fontWeight: 900,
                color: '#0f172a',
                margin: '0 0 2px 0',
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
              }}
            >
              {restaurantSettings?.restaurantName?.trim() || 'Restaurant'}
            </h1>
            <div style={{ fontSize: "11px", color: "#475569", fontWeight: 500 }}>
              {[restaurantSettings?.address, restaurantSettings?.phone, restaurantSettings?.gstin && `GSTIN: ${restaurantSettings.gstin}`].filter(Boolean).join(" • ")}
            </div>
            <div
              style={{
                fontSize: '13px',
                fontWeight: 800,
                color: '#b45309',
                marginTop: '4px',
                letterSpacing: '0.02em',
              }}
            >
              SALES, REVENUE &amp; PROFIT/LOSS AUDIT REPORT
            </div>
          </div>
          <div style={{ textAlign: "right", fontSize: "11px", color: "#475569" }}>
            <div>
              <strong>Generated:</strong>{' '}
              {new Date().toLocaleDateString('en-IN', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              })}{' '}
              {new Date().toLocaleTimeString('en-IN', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </div>
            <div>
              <strong>Filter Period:</strong> {getFilterPeriodLabel()}
            </div>
            <div>
              <strong>Settled Orders:</strong> {filteredOrders.length}
            </div>
            <div>
              <strong>Inventory Items:</strong> {inventoryItems.length}
            </div>
          </div>
        </div>

        {/* Financial Executive Summary */}
        <div style={{ marginBottom: '18px' }}>
          <h3
            style={{
              fontSize: '12.5px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.03em',
              margin: '0 0 6px 0',
              color: '#0f172a',
            }}
          >
            1. Executive Operating Summary
          </h3>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '11px',
            }}
          >
            <thead>
              <tr style={{ background: "#f1f5f9" }}>
                <th style={{ border: "1px solid #cbd5e1", padding: "6px 8px", textAlign: "left" }}>Gross Revenue</th>
                <th style={{ border: "1px solid #cbd5e1", padding: "6px 8px", textAlign: "left" }}>Net Food Sales</th>
                <th style={{ border: "1px solid #cbd5e1", padding: "6px 8px", textAlign: "left" }}>Total GST</th>
                <th style={{ border: "1px solid #cbd5e1", padding: "6px 8px", textAlign: "left" }}>Service Charges</th>
                <th style={{ border: "1px solid #cbd5e1", padding: "6px 8px", textAlign: "left" }}>Total Orders</th>
                <th style={{ border: "1px solid #cbd5e1", padding: "6px 8px", textAlign: "left" }}>Avg Ticket</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ border: "1px solid #cbd5e1", padding: "6px 8px", fontWeight: 800, fontSize: "13px", color: "#047857" }}>
                  {formatCurrency(totalRevenue)}
                </td>
                <td style={{ border: "1px solid #cbd5e1", padding: "6px 8px", fontWeight: 700 }}>
                  {formatCurrency(Math.max(0, totalRevenue - totalTax - totalService))}
                </td>
                <td style={{ border: "1px solid #cbd5e1", padding: "6px 8px" }}>
                  {formatCurrency(totalTax)}
                </td>
                <td style={{ border: '1px solid #cbd5e1', padding: '6px 8px' }}>
                  {formatCurrency(totalService)}
                </td>
                <td style={{ border: "1px solid #cbd5e1", padding: "6px 8px", fontWeight: 700 }}>
                  {filteredOrders.length}
                </td>
                <td style={{ border: "1px solid #cbd5e1", padding: "6px 8px", fontWeight: 700 }}>
                  {formatCurrency(averageBill)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Payment Breakdown & Top Selling in 2 columns */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '16px',
            marginBottom: '18px',
          }}
        >
          {/* Payment Method Distribution */}
          <div>
            <h3
              style={{
                fontSize: '12.5px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.03em',
                margin: '0 0 6px 0',
                color: '#0f172a',
              }}
            >
              2. Payment Channel Breakdown
            </h3>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
              <thead>
                <tr style={{ background: "#f1f5f9" }}>
                  <th style={{ border: "1px solid #cbd5e1", padding: "6px 8px", textAlign: "left" }}>Channel</th>
                  <th style={{ border: "1px solid #cbd5e1", padding: "6px 8px", textAlign: "right" }}>Amount</th>
                  <th style={{ border: "1px solid #cbd5e1", padding: "6px 8px", textAlign: "right" }}>Share %</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ border: "1px solid #cbd5e1", padding: "6px 8px", fontWeight: 600 }}>UPI / QR Pay</td>
                  <td style={{ border: "1px solid #cbd5e1", padding: "6px 8px", textAlign: "right", fontWeight: 700 }}>
                    {formatCurrency(paymentStats.upi)}
                  </td>
                  <td style={{ border: "1px solid #cbd5e1", padding: "6px 8px", textAlign: "right" }}>{upiPercent}%</td>
                </tr>
                <tr>
                  <td style={{ border: "1px solid #cbd5e1", padding: "6px 8px", fontWeight: 600 }}>Cash</td>
                  <td style={{ border: "1px solid #cbd5e1", padding: "6px 8px", textAlign: "right", fontWeight: 700 }}>
                    {formatCurrency(paymentStats.cash)}
                  </td>
                  <td style={{ border: "1px solid #cbd5e1", padding: "6px 8px", textAlign: "right" }}>{cashPercent}%</td>
                </tr>

                <tr style={{ background: "#f1f5f9", fontWeight: 800 }}>
                  <td style={{ border: "1px solid #cbd5e1", padding: "6px 8px" }}>Total Settlement</td>
                  <td style={{ border: "1px solid #cbd5e1", padding: "6px 8px", textAlign: "right" }}>
                    {formatCurrency(totalRevenue)}
                  </td>
                  <td style={{ border: "1px solid #cbd5e1", padding: "6px 8px", textAlign: "right" }}>100%</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Top Selling Items */}
          <div>
            <h3
              style={{
                fontSize: '12.5px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.03em',
                margin: '0 0 6px 0',
                color: '#0f172a',
              }}
            >
              3. Top Selling Items
            </h3>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
              <thead>
                <tr style={{ background: "#f1f5f9" }}>
                  <th style={{ border: "1px solid #cbd5e1", padding: "6px 8px", width: "35px", textAlign: "center" }}>#</th>
                  <th style={{ border: "1px solid #cbd5e1", padding: "6px 8px", textAlign: "left" }}>Dish / Item Name</th>
                  <th style={{ border: "1px solid #cbd5e1", padding: "6px 8px", textAlign: "right" }}>Qty Sold</th>
                </tr>
              </thead>
              <tbody>
                {sortedDishes.length === 0 ? (
                  <tr>
                    <td colSpan={3} style={{ border: "1px solid #cbd5e1", padding: "8px", textAlign: "center", color: "#64748b" }}>
                      No items sold during this period.
                    </td>
                  </tr>
                ) : (
                  sortedDishes.slice(0, 7).map(([name, qty], idx) => (
                    <tr key={name}>
                      <td style={{ border: "1px solid #cbd5e1", padding: "6px 8px", textAlign: "center", fontWeight: 700 }}>
                        {idx + 1}
                      </td>
                      <td style={{ border: "1px solid #cbd5e1", padding: "6px 8px", fontWeight: 600 }}>{name}</td>
                      <td style={{ border: "1px solid #cbd5e1", padding: "6px 8px", textAlign: "right", fontWeight: 700 }}>
                        {qty} orders
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Settled Orders Itemized List */}
        {filteredOrders.length > 0 && (
          <div style={{ marginBottom: '20px' }}>
            <h3
              style={{
                fontSize: '12.5px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.03em',
                margin: '0 0 6px 0',
                color: '#0f172a',
              }}
            >
              4. Settled Orders Summary ({filteredOrders.length} records)
            </h3>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "10.5px" }}>
              <thead>
                <tr style={{ background: "#f1f5f9" }}>
                  <th style={{ border: "1px solid #cbd5e1", padding: "5px 7px", textAlign: "left" }}>Order #</th>
                  <th style={{ border: "1px solid #cbd5e1", padding: "5px 7px", textAlign: "left" }}>Date / Time</th>
                  <th style={{ border: "1px solid #cbd5e1", padding: "5px 7px", textAlign: "left" }}>Table</th>
                  <th style={{ border: "1px solid #cbd5e1", padding: "5px 7px", textAlign: "left" }}>Mode</th>
                  <th style={{ border: "1px solid #cbd5e1", padding: "5px 7px", textAlign: "left" }}>Items Summary</th>
                  <th style={{ border: "1px solid #cbd5e1", padding: "5px 7px", textAlign: "right" }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.slice(0, 30).map((ord, idx) => {
                  const itemSummary = (ord.items || [])
                    .map((i) => `${i.name || "Item"}${i.quantity > 1 ? ` (x${i.quantity})` : ""}`)
                    .join(", ");
                  return (
                    <tr key={ord.id || idx} style={{ pageBreakInside: "avoid" }}>
                      <td style={{ border: "1px solid #cbd5e1", padding: "5px 7px", fontFamily: "monospace", fontWeight: 600 }}>
                        #{ord.id || ord.orderNumber || idx + 1}
                      </td>
                      <td style={{ border: "1px solid #cbd5e1", padding: "5px 7px", whiteSpace: "nowrap" }}>
                        {ord.date || ord.time || "N/A"}
                      </td>
                      <td style={{ border: "1px solid #cbd5e1", padding: "5px 7px" }}>
                        {ord.table ? `T-${ord.table}` : "Takeaway / Direct"}
                      </td>
                      <td style={{ border: "1px solid #cbd5e1", padding: "5px 7px", fontWeight: 600, textTransform: "uppercase" }}>
                        {normalizePaymentMethod(ord).toUpperCase()}
                      </td>
                      <td
                        style={{
                          border: '1px solid #cbd5e1',
                          padding: '5px 7px',
                          maxWidth: '260px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {itemSummary || 'N/A'}
                      </td>
                      <td style={{ border: "1px solid #cbd5e1", padding: "5px 7px", textAlign: "right", fontWeight: 700 }}>
                        {formatCurrency(ord.grandTotal || ord.total || 0)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer Sign-off */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            marginTop: '24px',
            paddingTop: '12px',
            borderTop: '1px solid #cbd5e1',
            fontSize: '11px',
            color: '#64748b',
            pageBreakInside: 'avoid',
          }}
        >
          <div>
            <div>System generated via AVSR Management POS Admin Portal.</div>
            <div>Confidential internal management record.</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ marginBottom: "28px" }}>Authorized Signatory:</div>
            <div style={{ borderTop: "1px dashed #64748b", width: "180px", textAlign: "center", paddingTop: "4px" }}>
              Manager / Auditor
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
