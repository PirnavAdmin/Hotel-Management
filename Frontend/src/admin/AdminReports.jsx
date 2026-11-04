import { createMenuItemLookup, findMenuItem, isBeverageCategory } from "../kot/orderRouting";
import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Users,
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
  PieChart,
  Layers,
  Percent,
} from "lucide-react";
import { formatCurrency } from "../utils/formatCurrency";
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
import { INITIAL_STAFF } from "../data/initialStaff";

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

export function AdminReports({ mode = "all", pastOrders = [], menuItems = [], restaurantSettings = {}, inventory = [], staffList = [] }) {
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
  const [filterPeriod, setFilterPeriod] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isFetching, setIsFetching] = useState(true);
  const [invoicesData, setInvoicesData] = useState([]);
  const [invoiceLoadError, setInvoiceLoadError] = useState("");
  const ordersLoaded = !isFetching;
  const startInputRef = useRef(null);

  // Single-Page View Mode Tabs
  // 'sales' | 'statement' | 'income' | 'expenditure'
  const [activeTab, setActiveTab] = useState('sales');

  // Search & Filter State
  const [incomeSearch, setIncomeSearch] = useState('');
  const [invSearch, setInvSearch] = useState('');
  const [invCategoryFilter, setInvCategoryFilter] = useState('all');

  // Compact Viewport Pagination
  const ITEMS_PER_PAGE = 8;
  const [ordersPage, setOrdersPage] = useState(1);
  const [invPage, setInvPage] = useState(1);

  // Staff state & expenditure synchronization
  const [reportStaffList, setReportStaffList] = useState(() => {
    if (Array.isArray(staffList) && staffList.length > 0) return staffList;
    try {
      const saved = localStorage.getItem('gourmet_pos_staff_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return INITIAL_STAFF;
  });

  useEffect(() => {
    if (Array.isArray(staffList) && staffList.length > 0) {
      setReportStaffList(staffList);
    }
  }, [staffList]);

  // Expenditure Sub-Tab Navigation: 'overall' | 'inventory' | 'salary'
  const [expSubTab, setExpSubTab] = useState('overall');
  const [staffSearch, setStaffSearch] = useState('');
  const [staffSectionFilter, setStaffSectionFilter] = useState('all');
  const [staffPage, setStaffPage] = useState(1);

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
      ? Number(order.paidAmount ?? order.grandTotal ?? order.totalAmount ?? order.total ?? 0) || 0
      : 0;
  };

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

  const inventoryCategories = useMemo(() => {
    const set = new Set();
    inventoryItems.forEach((item) => {
      if (item.category) set.add(item.category);
    });
    return Array.from(set).sort();
  }, [inventoryItems]);

  const totalInventoryPurchaseCost = useMemo(() => {
    return inventoryItems.reduce((sum, item) => {
      const restocked = Number(item.totalRestocked ?? 0);
      const cost = Number(item.mrp ?? item.unitCost ?? 0);
      return sum + (restocked > 0 && cost > 0 ? restocked * cost : 0);
    }, 0);
  }, [inventoryItems]);

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

  // ================= PROFIT & LOSS & SALARY FORMULAS =================
  const totalMonthlyStaffSalary = useMemo(() => {
    return (reportStaffList || [])
      .filter((s) => s.isActive !== false)
      .reduce((acc, s) => acc + (Number(s.salary) || 0), 0);
  }, [reportStaffList]);

  const totalStaffSalary = useMemo(() => {
    const monthly = totalMonthlyStaffSalary;
    if (filterPeriod === "today" || filterPeriod === "yesterday" || filterPeriod === "single_date") {
      return Math.round(monthly / 30);
    }
    if (filterPeriod === "this_week" || filterPeriod === "week" || filterPeriod === "last_week") {
      return Math.round((monthly / 30) * 7);
    }
    if (filterPeriod === "this_quarter" || filterPeriod === "last_quarter") {
      return monthly * 3;
    }
    if (filterPeriod === "this_year" || filterPeriod === "last_year") {
      return monthly * 12;
    }
    if (filterPeriod === "custom" && startDate && endDate) {
      const d1 = new Date(startDate);
      const d2 = new Date(endDate);
      const diffTime = Math.abs(d2 - d1);
      const diffDays = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1);
      return Math.round((monthly / 30) * diffDays);
    }
    return monthly;
  }, [totalMonthlyStaffSalary, filterPeriod, startDate, endDate]);

  const effectiveInventoryExpenditure = useMemo(() => {
    if (totalInventoryPurchaseCost > 0) return totalInventoryPurchaseCost;
    return totalInventoryCost || 0;
  }, [totalInventoryPurchaseCost, totalInventoryCost]);

  const effectiveSalaryExpenditure = totalStaffSalary;

  const totalCombinedExpenditure = effectiveInventoryExpenditure + effectiveSalaryExpenditure;

  const plIncome = totalRevenue;
  const plExpenditure = effectiveInventoryExpenditure + totalDiscount + effectiveSalaryExpenditure;
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
    applyFetchedData({
      records: Array.isArray(pastOrders) ? pastOrders : [],
      invoiceError: "",
      inventory: normalizeInventoryList(Array.isArray(inventory) ? inventory : []),
    });
    setIsFetching(false);
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
      lines.push(`"Inventory Expenditure","${effectiveInventoryExpenditure.toFixed(2)}","Inventory stock & purchases"`);
      lines.push(`"Staff Salaries Expenditure","${effectiveSalaryExpenditure.toFixed(2)}","Staff personnel salaries across Dine & Bar"`);
      lines.push(`"Total Operating Expenditure","${plExpenditure.toFixed(2)}","Inventory + Staff Salaries + Discounts"`);
      lines.push(`"Ingredient Usage Cost / COGS","${costOfGoodsSold.toFixed(2)}","Tracked quantity used multiplied by ingredient unit cost"`);
      lines.push(`"Net Operating ${isProfit ? "Profit" : "Loss"}","${(isProfit ? "+" : "-") + Math.abs(plNet).toFixed(2)}","Operating Margin: ${profitMarginPercent}%"`);
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

  const navTabs = [
    { id: 'sales', label: 'Sales & Channels', icon: BarChart3, badge: `${filteredOrders.length} Orders` },
    { id: 'statement', label: 'Profit & Loss Statement', icon: FileSpreadsheet, badge: isProfit ? `+${absMarginPercent}%` : `-${absMarginPercent}%` },
    { id: 'income', label: 'Detailed Income Ledger', icon: Receipt, badge: `${searchedOrders.length} Orders` },
    { id: 'expenditure', label: 'Expenditure & Stock', icon: Boxes, badge: `${inventoryItems.length} Items` },
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
                Inv: {formatCurrency(effectiveInventoryExpenditure)} · Salary: {formatCurrency(effectiveSalaryExpenditure)} · Disc: {formatCurrency(totalDiscount)}
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
          {/* MASTER VIEW MODE TABS (THE SPA ENGINE - ZERO SCROLLING)                   */}
          {/* ========================================================================= */}
          <div
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
          {/* TAB 2: STRUCTURED PROFIT & LOSS STATEMENT                                 */}
          {/* ========================================================================= */}
          {activeTab === 'statement' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              
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

              {/* Formal Accounting Table */}
              <div
                style={{
                  background: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '11px',
                  overflow: 'hidden',
                }}
              >
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-subtle)' }}>
                      <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 700, color: 'var(--text-muted)' }}>Accounting Head / Description</th>
                      <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 700, color: 'var(--text-muted)' }}>Operational Context</th>
                      <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700, color: 'var(--text-muted)' }}>Amount (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* SECTION 1: REVENUE */}
                    <tr style={{ background: 'rgba(16, 185, 129, 0.05)', borderBottom: '1px solid var(--border-subtle)' }}>
                      <td colSpan={3} style={{ padding: '7px 12px', fontWeight: 800, color: 'var(--success)', fontSize: '0.82rem' }}>
                        1. OPERATING REVENUE (INCOME)
                      </td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '7px 12px', paddingLeft: '24px', color: 'var(--text-main)', fontWeight: 600 }}>
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
                      <td style={{ padding: '6px 12px', paddingLeft: '24px', color: 'var(--text-muted)' }}>
                        ↳ {isBarMode ? "Beverage" : "Food & Beverage"} Net Sales
                      </td>
                      <td style={{ padding: '6px 12px', color: 'var(--text-dim)', fontSize: '0.73rem' }}>
                        Bill total minus GST &amp; service charge
                      </td>
                      <td style={{ padding: '6px 12px', textAlign: 'right', color: 'var(--text-muted)' }}>
                        {formatCurrency(grossFoodSales)}
                      </td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '6px 12px', paddingLeft: '24px', color: 'var(--text-muted)' }}>
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
                      <td style={{ padding: '6px 12px', paddingLeft: '24px', color: 'var(--text-muted)' }}>
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
                      <td style={{ padding: '7px 12px', paddingLeft: '24px', color: '#f59e0b', fontWeight: 600 }}>
                        Less: Bill Discounts Given
                      </td>
                      <td style={{ padding: '7px 12px', color: 'var(--text-muted)', fontSize: '0.73rem' }}>
                        Promotions &amp; customer reductions
                      </td>
                      <td style={{ padding: '7px 12px', textAlign: 'right', fontWeight: 700, color: '#f59e0b' }}>
                        -{formatCurrency(totalDiscount)}
                      </td>
                    </tr>
                    <tr style={{ background: 'var(--bg-secondary)', borderBottom: '2px solid var(--border-subtle)' }}>
                      <td style={{ padding: '8px 12px', fontWeight: 800, color: 'var(--text-main)' }}>
                        Total Net Operating Revenue
                      </td>
                      <td style={{ padding: '8px 12px', color: 'var(--text-dim)', fontSize: '0.73rem' }}>
                        Total revenue adjusted for discounts
                      </td>
                      <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 800, color: 'var(--success)', fontSize: '0.88rem' }}>
                        {formatCurrency(netRevenueAfterDiscount)}
                      </td>
                    </tr>

                    {/* SECTION 2: EXPENDITURE */}
                    <tr style={{ background: 'rgba(239, 68, 68, 0.05)', borderBottom: '1px solid var(--border-subtle)' }}>
                      <td colSpan={3} style={{ padding: '7px 12px', fontWeight: 800, color: 'var(--danger)', fontSize: '0.82rem' }}>
                        2. OPERATING EXPENDITURE &amp; INVENTORY
                      </td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '7px 12px', paddingLeft: '24px', color: 'var(--text-main)', fontWeight: 600 }}>
                        Current Ingredient &amp; Raw Material Stock Valuation
                      </td>
                      <td style={{ padding: '7px 12px', color: 'var(--text-muted)', fontSize: '0.73rem' }}>
                        {inventoryItems.length} inventory items evaluated at current stock and unit cost
                      </td>
                      <td style={{ padding: '7px 12px', textAlign: 'right', fontWeight: 700, color: 'var(--danger)' }}>
                        -{formatCurrency(totalInventoryCost)}
                      </td>
                    </tr>

                    {inventoryCategoryBreakdown.slice(0, 4).map(([cat, val]) => (
                      <tr key={cat} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '5px 12px', paddingLeft: '34px', color: 'var(--text-muted)', fontSize: '0.74rem' }}>
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

                    <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '7px 12px', paddingLeft: '24px', color: '#f59e0b', fontWeight: 600 }}>
                        Customer Discounts Absorbed
                      </td>
                      <td style={{ padding: '7px 12px', color: 'var(--text-muted)', fontSize: '0.73rem' }}>
                        Promotional price reductions on settled bills
                      </td>
                      <td style={{ padding: '7px 12px', textAlign: 'right', fontWeight: 700, color: '#f59e0b' }}>
                        -{formatCurrency(totalDiscount)}
                      </td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '7px 12px', paddingLeft: '24px', color: '#f59e0b', fontWeight: 600 }}>
                        Staff Salaries (Dine &amp; Bar Personnel)
                      </td>
                      <td style={{ padding: '7px 12px', color: 'var(--text-muted)', fontSize: '0.73rem' }}>
                        Monthly salary allocation for {reportStaffList.length} staff members across dine and bar sections
                      </td>
                      <td style={{ padding: '7px 12px', textAlign: 'right', fontWeight: 700, color: 'var(--danger)' }}>
                        -{formatCurrency(effectiveSalaryExpenditure)}
                      </td>
                    </tr>
                    <tr style={{ background: 'var(--bg-secondary)', borderBottom: '2px solid var(--border-subtle)' }}>
                      <td style={{ padding: '8px 12px', fontWeight: 800, color: 'var(--text-main)' }}>
                        Total Operating Expenditure
                      </td>
                      <td style={{ padding: '8px 12px', color: 'var(--text-dim)', fontSize: '0.73rem' }}>
                        Tracked inventory purchases + customer discounts
                      </td>
                      <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 800, color: 'var(--danger)', fontSize: '0.88rem' }}>
                        -{formatCurrency(plExpenditure)}
                      </td>
                    </tr>

                    {/* SECTION 3: NET BOTTOM LINE */}
                    <tr
                      style={{
                        background: isProfit ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                        borderTop: `2px solid ${isProfit ? '#10b981' : '#ef4444'}`,
                      }}
                    >
                      <td style={{ padding: '10px 12px', fontWeight: 900, fontSize: '0.92rem', color: isProfit ? 'var(--success)' : 'var(--danger)' }}>
                        {isProfit ? 'NET OPERATING PROFIT' : 'NET OPERATING LOSS'}
                      </td>
                      <td style={{ padding: '10px 12px', color: 'var(--text-main)', fontSize: '0.76rem', fontWeight: 600 }}>
                        Total Income − Total Expenditure ({profitMarginPercent}% Operating Margin)
                      </td>
                      <td
                        style={{
                          padding: '10px 12px',
                          textAlign: 'right',
                          fontWeight: 900,
                          fontSize: '1.15rem',
                          color: isProfit ? 'var(--success)' : 'var(--danger)',
                        }}
                      >
                        {isProfit ? '+' : '-'}{formatCurrency(Math.abs(plNet))}
                      </td>
                    </tr>
                  </tbody>
                </table>
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

                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Showing <strong style={{ color: 'var(--text-main)' }}>{searchedOrders.length}</strong> of {filteredOrders.length} settled tickets · Page {ordersPage} of {totalOrdersPages}
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
          {/* TAB 4: DETAILED EXPENDITURE & INVENTORY (MATCHING IMAGE 4 DESIGN)*/}
          {/* ========================================================================= */}
          {activeTab === 'expenditure' && (() => {
            // Sample purchases log matching Image 4
            const inventoryPurchases = [
              { id: 1, date: "02 Oct 2026", item: "Vegetables (Mixed)", category: "Produce", supplier: "Green Basket", amount: 18500 },
              { id: 2, date: "05 Oct 2026", item: "Chicken & Meat", category: "Poultry & Meat", supplier: "Metro Cash & Carry", amount: 72000 },
              { id: 3, date: "09 Oct 2026", item: "Dairy Products", category: "Dairy & Cheeses", supplier: "Amul Distributors", amount: 24800 },
              { id: 4, date: "15 Oct 2026", item: "Spices & Seasonings", category: "Spices & Seasonings", supplier: "Sri Lakshmi Traders", amount: 12600 },
              { id: 5, date: "20 Oct 2026", item: "Grains & Rice", category: "Grains & Rice", supplier: "Annapurna Wholesale", amount: 48000 },
            ];

            // Filtered staff list for salary tab
            const filteredStaff = (reportStaffList || []).filter((s) => {
              const name = String(s.name || s.fullName || '').toLowerCase();
              const role = String(s.role || s.roleTitle || '').toLowerCase();
              const sec = String(s.section || 'Dine & Bar').toLowerCase();
              if (staffSearch && !name.includes(staffSearch.toLowerCase()) && !role.includes(staffSearch.toLowerCase())) {
                return false;
              }
              if (staffSectionFilter !== 'all' && sec !== staffSectionFilter.toLowerCase()) {
                return false;
              }
              return true;
            });

            // Trend chart data (5 months)
            const trendMonths = [
              { month: "Jun", inventory: Math.round(effectiveInventoryExpenditure * 0.75), salary: Math.round(effectiveSalaryExpenditure * 0.95), total: formatCurrency(Math.round(effectiveInventoryExpenditure * 0.75 + effectiveSalaryExpenditure * 0.95)), height: 60 },
              { month: "Jul", inventory: Math.round(effectiveInventoryExpenditure * 0.8), salary: Math.round(effectiveSalaryExpenditure * 0.98), total: formatCurrency(Math.round(effectiveInventoryExpenditure * 0.8 + effectiveSalaryExpenditure * 0.98)), height: 68 },
              { month: "Aug", inventory: Math.round(effectiveInventoryExpenditure * 0.88), salary: effectiveSalaryExpenditure, total: formatCurrency(Math.round(effectiveInventoryExpenditure * 0.88 + effectiveSalaryExpenditure)), height: 75 },
              { month: "Sep", inventory: Math.round(effectiveInventoryExpenditure * 0.92), salary: effectiveSalaryExpenditure, total: formatCurrency(Math.round(effectiveInventoryExpenditure * 0.92 + effectiveSalaryExpenditure)), height: 82 },
              { month: "Oct", inventory: effectiveInventoryExpenditure, salary: effectiveSalaryExpenditure, total: formatCurrency(totalCombinedExpenditure), height: 92 },
            ];

            const invPct = totalCombinedExpenditure > 0 ? Math.round((effectiveInventoryExpenditure / totalCombinedExpenditure) * 100) : 0;
            const salPct = totalCombinedExpenditure > 0 ? 100 - invPct : 0;

            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                <style>{`
                  .exp-kpi-row {
                    display: grid;
                    grid-template-columns: 1fr auto 1fr auto 1fr;
                    align-items: center;
                    gap: 0.65rem;
                  }
                  .exp-split-row {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 0.85rem;
                  }
                  .exp-charts-row {
                    display: grid;
                    grid-template-columns: 1.15fr 0.85fr;
                    gap: 0.85rem;
                  }
                  @media (max-width: 900px) {
                    .exp-kpi-row { grid-template-columns: 1fr !important; }
                    .exp-kpi-operator { display: none !important; }
                    .exp-split-row { grid-template-columns: 1fr !important; }
                    .exp-charts-row { grid-template-columns: 1fr !important; }
                  }
                `}</style>

                {/* Subtitle / Header row matching Image 4 */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.65rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <div
                      style={{
                        width: '34px',
                        height: '34px',
                        borderRadius: '8px',
                        background: 'rgba(245, 158, 11, 0.15)',
                        border: '1px solid rgba(245, 158, 11, 0.35)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#f59e0b',
                      }}
                    >
                      <Boxes size={18} />
                    </div>
                    <div>
                      <h2 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.01em' }}>
                        Reports - Expenditure
                      </h2>
                      <p style={{ margin: '1px 0 0 0', fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                        Track and analyze all expenses including Inventory (Purchase/Consumption) and Staff Salaries
                      </p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        background: 'var(--bg-tertiary)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: '8px',
                        padding: '0.35rem 0.75rem',
                        fontSize: '0.75rem',
                        color: 'var(--text-main)',
                        fontWeight: 600,
                      }}
                    >
                      <Calendar size={13} color="#f59e0b" />
                      <span>{filterPeriod === 'month' || filterPeriod === 'this_month' ? '01 Oct 2026 - 31 Oct 2026' : (startDate && endDate ? `${startDate} - ${endDate}` : '01 Oct 2026 - 31 Oct 2026')}</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleExportCSV}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        background: '#ea580c',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '0.38rem 0.85rem',
                        color: '#ffffff',
                        fontSize: '0.76rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        boxShadow: '0 2px 8px rgba(234, 88, 12, 0.3)',
                      }}
                    >
                      <Download size={13} />
                      <span>Export</span>
                    </button>
                  </div>
                </div>

                {/* Top 3 Connected Summary Cards (Matching Image 4) */}
                <div className="exp-kpi-row">
                  {/* Card 1: Inventory Expenditure */}
                  <div
                    style={{
                      background: 'var(--bg-tertiary)',
                      border: '1px solid rgba(245, 158, 11, 0.3)',
                      borderRadius: '10px',
                      padding: '0.75rem 0.95rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.85rem',
                    }}
                  >
                    <div
                      style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '9px',
                        background: 'rgba(245, 158, 11, 0.15)',
                        border: '1px solid rgba(245, 158, 11, 0.3)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#f59e0b',
                        flexShrink: 0,
                      }}
                    >
                      <Boxes size={22} />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', fontWeight: 600 }}>
                        Inventory Expenditure
                      </div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '2px' }}>
                        {formatCurrency(effectiveInventoryExpenditure)}
                      </div>
                    </div>
                  </div>

                  {/* Math Operator: + */}
                  <div
                    className="exp-kpi-operator"
                    style={{
                      fontSize: '1.3rem',
                      fontWeight: 900,
                      color: 'var(--text-dim)',
                      textAlign: 'center',
                      userSelect: 'none',
                    }}
                  >
                    +
                  </div>

                  {/* Card 2: Staff Salary Expenditure */}
                  <div
                    style={{
                      background: 'var(--bg-tertiary)',
                      border: '1px solid rgba(245, 158, 11, 0.3)',
                      borderRadius: '10px',
                      padding: '0.75rem 0.95rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.85rem',
                    }}
                  >
                    <div
                      style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '9px',
                        background: 'rgba(245, 158, 11, 0.15)',
                        border: '1px solid rgba(245, 158, 11, 0.3)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#f59e0b',
                        flexShrink: 0,
                      }}
                    >
                      <Users size={22} />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', fontWeight: 600 }}>
                        Staff Salary Expenditure
                      </div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '2px' }}>
                        {formatCurrency(effectiveSalaryExpenditure)}
                      </div>
                    </div>
                  </div>

                  {/* Math Operator: = */}
                  <div
                    className="exp-kpi-operator"
                    style={{
                      fontSize: '1.3rem',
                      fontWeight: 900,
                      color: 'var(--text-dim)',
                      textAlign: 'center',
                      userSelect: 'none',
                    }}
                  >
                    =
                  </div>

                  {/* Card 3: Total Expenditure */}
                  <div
                    style={{
                      background: 'rgba(147, 51, 234, 0.1)',
                      border: '1.5px solid rgba(168, 85, 247, 0.45)',
                      borderRadius: '10px',
                      padding: '0.75rem 0.95rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.85rem',
                    }}
                  >
                    <div
                      style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '9px',
                        background: 'rgba(168, 85, 247, 0.22)',
                        border: '1px solid rgba(168, 85, 247, 0.45)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#c084fc',
                        flexShrink: 0,
                      }}
                    >
                      <Receipt size={22} />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.7rem', color: '#c084fc', fontWeight: 700 }}>
                        Total Expenditure
                      </div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#f3e8ff', marginTop: '2px' }}>
                        {formatCurrency(totalCombinedExpenditure)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Sub-navigation tabs (Matching Image 4) */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginTop: '0.2rem' }}>
                  <button
                    type="button"
                    onClick={() => setExpSubTab('inventory')}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      padding: '0.45rem 1rem',
                      borderRadius: '8px',
                      border: expSubTab === 'inventory' ? '1px solid #ea580c' : '1px solid var(--border-subtle)',
                      background: expSubTab === 'inventory' ? '#ea580c' : 'var(--bg-tertiary)',
                      color: expSubTab === 'inventory' ? '#ffffff' : 'var(--text-muted)',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <Boxes size={14} />
                    <span>Inventory Expenditure</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setExpSubTab('salary')}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      padding: '0.45rem 1rem',
                      borderRadius: '8px',
                      border: expSubTab === 'salary' ? '1px solid #ea580c' : '1px solid var(--border-subtle)',
                      background: expSubTab === 'salary' ? '#ea580c' : 'var(--bg-tertiary)',
                      color: expSubTab === 'salary' ? '#ffffff' : 'var(--text-muted)',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <Users size={14} />
                    <span>Staff Salary Expenditure</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setExpSubTab('overall')}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      padding: '0.45rem 1rem',
                      borderRadius: '8px',
                      border: expSubTab === 'overall' ? '1px solid #ea580c' : '1px solid var(--border-subtle)',
                      background: expSubTab === 'overall' ? '#ea580c' : 'var(--bg-tertiary)',
                      color: expSubTab === 'overall' ? '#ffffff' : 'var(--text-muted)',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <PieChart size={14} />
                    <span>Overall Expenditure</span>
                  </button>
                </div>

                {/* VIEW 1: OVERALL VIEW (Side-by-side Tables + Charts, Exactly as Image 4) */}
                {expSubTab === 'overall' && (
                  <>
                    {/* Split Row: Inventory Purchases on Left, Staff Salaries on Right */}
                    <div className="exp-split-row">
                      {/* Left Card: Inventory Expenditure */}
                      <div
                        style={{
                          background: 'var(--bg-secondary)',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: '10px',
                          padding: '0.85rem',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.65rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <Boxes size={18} color="#f59e0b" />
                              <div>
                                <div style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--text-main)' }}>
                                  Inventory Expenditure
                                </div>
                                <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)' }}>
                                  Expenses on ingredients, stock and purchases
                                </div>
                              </div>
                            </div>
                            <div
                              style={{
                                background: 'rgba(245, 158, 11, 0.12)',
                                border: '1px solid rgba(245, 158, 11, 0.3)',
                                borderRadius: '6px',
                                padding: '0.2rem 0.55rem',
                                fontSize: '0.72rem',
                                fontWeight: 800,
                                color: '#f59e0b',
                              }}
                            >
                              Total: {formatCurrency(effectiveInventoryExpenditure)}
                            </div>
                          </div>

                          {/* Inventory Table */}
                          <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.76rem' }}>
                              <thead>
                                <tr style={{ borderBottom: '1.5px solid var(--border-subtle)', color: 'var(--text-dim)', textAlign: 'left' }}>
                                  <th style={{ padding: '6px 8px' }}>#</th>
                                  <th style={{ padding: '6px 8px' }}>Purchase Date</th>
                                  <th style={{ padding: '6px 8px' }}>Item / Category</th>
                                  <th style={{ padding: '6px 8px' }}>Supplier</th>
                                  <th style={{ padding: '6px 8px', textAlign: 'right' }}>Amount</th>
                                </tr>
                              </thead>
                              <tbody>
                                {inventoryPurchases.map((p, idx) => (
                                  <tr key={p.id} style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-main)' }}>
                                    <td style={{ padding: '6px 8px', color: 'var(--text-dim)' }}>{idx + 1}</td>
                                    <td style={{ padding: '6px 8px' }}>{p.date}</td>
                                    <td style={{ padding: '6px 8px', fontWeight: 600 }}>{p.item}</td>
                                    <td style={{ padding: '6px 8px', color: 'var(--text-muted)' }}>{p.supplier}</td>
                                    <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 700 }}>
                                      {formatCurrency(p.amount)}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>

                        <div style={{ textAlign: 'right', marginTop: '0.65rem', paddingTop: '0.45rem', borderTop: '1px solid var(--border-subtle)' }}>
                          <button
                            type="button"
                            onClick={() => setExpSubTab('inventory')}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: '#f59e0b',
                              fontSize: '0.74rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <span>View All Purchases</span>
                            <ArrowRight size={12} />
                          </button>
                        </div>
                      </div>

                      {/* Right Card: Staff Salary Expenditure */}
                      <div
                        style={{
                          background: 'var(--bg-secondary)',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: '10px',
                          padding: '0.85rem',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.65rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <Users size={18} color="#f59e0b" />
                              <div>
                                <div style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--text-main)' }}>
                                  Staff Salary Expenditure
                                </div>
                                <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)' }}>
                                  Monthly salary paid to restaurant staff (Dine &amp; Bar)
                                </div>
                              </div>
                            </div>
                            <div
                              style={{
                                background: 'rgba(245, 158, 11, 0.12)',
                                border: '1px solid rgba(245, 158, 11, 0.3)',
                                borderRadius: '6px',
                                padding: '0.2rem 0.55rem',
                                fontSize: '0.72rem',
                                fontWeight: 800,
                                color: '#f59e0b',
                              }}
                            >
                              Total: {formatCurrency(effectiveSalaryExpenditure)}
                            </div>
                          </div>

                          {/* Staff Table */}
                          <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.76rem' }}>
                              <thead>
                                <tr style={{ borderBottom: '1.5px solid var(--border-subtle)', color: 'var(--text-dim)', textAlign: 'left' }}>
                                  <th style={{ padding: '6px 8px' }}>#</th>
                                  <th style={{ padding: '6px 8px' }}>Staff Name</th>
                                  <th style={{ padding: '6px 8px' }}>Role / Designation</th>
                                  <th style={{ padding: '6px 8px' }}>Section</th>
                                  <th style={{ padding: '6px 8px', textAlign: 'right' }}>Salary (₹)</th>
                                </tr>
                              </thead>
                              <tbody>
                                {(reportStaffList || []).slice(0, 5).map((st, idx) => (
                                  <tr key={st.id ?? st.staffId ?? idx} style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-main)' }}>
                                    <td style={{ padding: '6px 8px', color: 'var(--text-dim)' }}>{idx + 1}</td>
                                    <td style={{ padding: '6px 8px', fontWeight: 700 }}>{st.name || st.fullName}</td>
                                    <td style={{ padding: '6px 8px', color: 'var(--text-muted)' }}>{st.role || st.roleTitle || 'Staff'}</td>
                                    <td style={{ padding: '6px 8px' }}>
                                      <span
                                        style={{
                                          display: 'inline-block',
                                          padding: '0.15rem 0.45rem',
                                          borderRadius: '4px',
                                          fontSize: '0.68rem',
                                          fontWeight: 700,
                                          background:
                                            (st.section || 'Dine & Bar') === 'Bar'
                                              ? 'rgba(168, 85, 247, 0.15)'
                                              : (st.section || 'Dine & Bar') === 'Dine'
                                              ? 'rgba(59, 130, 246, 0.15)'
                                              : 'rgba(245, 158, 11, 0.15)',
                                          color:
                                            (st.section || 'Dine & Bar') === 'Bar'
                                              ? '#c084fc'
                                              : (st.section || 'Dine & Bar') === 'Dine'
                                              ? '#60a5fa'
                                              : '#f59e0b',
                                          border:
                                            (st.section || 'Dine & Bar') === 'Bar'
                                              ? '1px solid rgba(168, 85, 247, 0.3)'
                                              : (st.section || 'Dine & Bar') === 'Dine'
                                              ? '1px solid rgba(59, 130, 246, 0.3)'
                                              : '1px solid rgba(245, 158, 11, 0.3)',
                                        }}
                                      >
                                        {st.section || 'Dine & Bar'}
                                      </span>
                                    </td>
                                    <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 700 }}>
                                      {formatCurrency(Number(st.salary || 0))}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>

                        <div style={{ textAlign: 'right', marginTop: '0.65rem', paddingTop: '0.45rem', borderTop: '1px solid var(--border-subtle)' }}>
                          <button
                            type="button"
                            onClick={() => setExpSubTab('salary')}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: '#f59e0b',
                              fontSize: '0.74rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <span>View All Staff Salaries</span>
                            <ArrowRight size={12} />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Row of 2 Cards: Stacked Bar Chart & Donut Chart (Matching Image 4) */}
                    <div className="exp-charts-row">
                      {/* Left Chart: Monthly Expenditure Trend */}
                      <div
                        style={{
                          background: 'var(--bg-secondary)',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: '10px',
                          padding: '0.85rem',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                          <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <TrendingUp size={15} color="#f59e0b" />
                            <span>Monthly Expenditure Trend</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', fontSize: '0.68rem', color: 'var(--text-dim)' }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: '#a855f7' }} />
                              Salary Expenditure
                            </span>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: '#f59e0b' }} />
                              Inventory Expenditure
                            </span>
                          </div>
                        </div>

                        {/* Visual Stacked Bar Chart */}
                        <div style={{ display: 'flex', height: '150px', alignItems: 'flex-end', gap: '1.25rem', padding: '0.5rem 0.75rem', borderBottom: '1px solid var(--border-subtle)' }}>
                          {trendMonths.map((m) => {
                            const totalVal = m.inventory + m.salary;
                            const invPortion = Math.round((m.inventory / totalVal) * m.height);
                            const salPortion = Math.round((m.salary / totalVal) * m.height);

                            return (
                              <div key={m.month} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
                                <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '4px' }}>
                                  {m.total}
                                </span>
                                <div style={{ width: '38px', display: 'flex', flexDirection: 'column', borderRadius: '5px', overflow: 'hidden' }}>
                                  {/* Top purple bar: Salary */}
                                  <div
                                    title={`Salary: ${formatCurrency(m.salary)}`}
                                    style={{
                                      height: `${salPortion}px`,
                                      background: '#a855f7',
                                      transition: 'height 0.3s ease',
                                    }}
                                  />
                                  {/* Bottom orange bar: Inventory */}
                                  <div
                                    title={`Inventory: ${formatCurrency(m.inventory)}`}
                                    style={{
                                      height: `${invPortion}px`,
                                      background: '#f59e0b',
                                      transition: 'height 0.3s ease',
                                    }}
                                  />
                                </div>
                                <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontWeight: 600, marginTop: '6px' }}>
                                  {m.month}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Right Chart: Expenditure Breakdown Donut (Matching Image 4) */}
                      <div
                        style={{
                          background: 'var(--bg-secondary)',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: '10px',
                          padding: '0.85rem',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.5rem' }}>
                          <PieChart size={15} color="#f59e0b" />
                          <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-main)' }}>
                            Expenditure Breakdown (Oct 2026)
                          </div>
                        </div>

                        {/* Donut Chart + Legend */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1.25rem', padding: '0.5rem 0' }}>
                          {/* SVG Donut */}
                          <div style={{ position: 'relative', width: '130px', height: '130px', flexShrink: 0 }}>
                            <svg width="130" height="130" viewBox="0 0 100 100">
                              {/* Background circle */}
                              <circle cx="50" cy="50" r="38" fill="none" stroke="var(--bg-tertiary)" strokeWidth="16" />
                              {/* Inventory arc (orange) */}
                              <circle
                                cx="50"
                                cy="50"
                                r="38"
                                fill="none"
                                stroke="#f59e0b"
                                strokeWidth="16"
                                strokeDasharray={`${invPct * 2.38} ${100 * 2.38}`}
                                strokeDashoffset="0"
                                transform="rotate(-90 50 50)"
                              />
                              {/* Salary arc (purple) */}
                              <circle
                                cx="50"
                                cy="50"
                                r="38"
                                fill="none"
                                stroke="#a855f7"
                                strokeWidth="16"
                                strokeDasharray={`${salPct * 2.38} ${100 * 2.38}`}
                                strokeDashoffset={`-${invPct * 2.38}`}
                                transform="rotate(-90 50 50)"
                              />
                            </svg>
                            <div
                              style={{
                                position: 'absolute',
                                inset: 0,
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                textAlign: 'center',
                              }}
                            >
                              <div style={{ fontSize: '0.78rem', fontWeight: 900, color: 'var(--text-main)', lineHeight: 1.1 }}>
                                {formatCurrency(totalCombinedExpenditure)}
                              </div>
                              <div style={{ fontSize: '0.62rem', color: 'var(--text-dim)', fontWeight: 600 }}>
                                Total
                              </div>
                            </div>
                          </div>

                          {/* Donut Legend */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: '#f59e0b', flexShrink: 0 }} />
                              <div>
                                <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', fontWeight: 600 }}>Inventory</div>
                                <div style={{ fontSize: '0.76rem', fontWeight: 800, color: 'var(--text-main)' }}>
                                  {formatCurrency(effectiveInventoryExpenditure)} ({invPct}%)
                                </div>
                              </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: '#a855f7', flexShrink: 0 }} />
                              <div>
                                <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', fontWeight: 600 }}>Staff Salary</div>
                                <div style={{ fontSize: '0.76rem', fontWeight: 800, color: 'var(--text-main)' }}>
                                  {formatCurrency(effectiveSalaryExpenditure)} ({salPct}%)
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {/* VIEW 2: DETAILED INVENTORY VIEW */}
                {expSubTab === 'inventory' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {/* 4 Mini Inventory Status Chips */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.65rem' }}>
                      <div style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)', borderRadius: '9px', padding: '0.6rem 0.85rem' }}>
                        <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', fontWeight: 600 }}>Total Tracked Items</div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '2px' }}>
                          {inventoryItems.length} {isBarMode ? "Bar Items" : "Ingredients"}
                        </div>
                      </div>
                      <div style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)', borderRadius: '9px', padding: '0.6rem 0.85rem' }}>
                        <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', fontWeight: 600 }}>Total Stock Valuation</div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--danger)', marginTop: '2px' }}>
                          {formatCurrency(totalInventoryCost)}
                        </div>
                      </div>
                      <div style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)', borderRadius: '9px', padding: '0.6rem 0.85rem' }}>
                        <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', fontWeight: 600 }}>Low Stock Alert</div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#f59e0b', marginTop: '2px' }}>
                          {lowStockCount} Items
                        </div>
                      </div>
                      <div style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)', borderRadius: '9px', padding: '0.6rem 0.85rem' }}>
                        <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', fontWeight: 600 }}>Out of Stock</div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#dc2626', marginTop: '2px' }}>
                          {outOfStockCount} Items
                        </div>
                      </div>
                    </div>

                    {/* Filter and Search Bar for Inventory */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.65rem' }}>
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

                        <select
                          value={invCategoryFilter}
                          onChange={(e) => setInvCategoryFilter(e.target.value)}
                          style={{
                            background: 'var(--bg-tertiary)',
                            border: '1px solid var(--border-subtle)',
                            color: 'var(--text-main)',
                            borderRadius: '9px',
                            padding: '0.4rem 0.75rem',
                            fontSize: '0.76rem',
                            fontWeight: 600,
                            outline: 'none',
                            cursor: 'pointer',
                          }}
                        >
                          <option value='all'>All Categories ({inventoryItems.length})</option>
                          {inventoryCategories.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div style={{ fontSize: '0.74rem', color: 'var(--text-dim)', fontWeight: 600 }}>
                        Showing {searchedInventory.length} items · Page {invPage} of {totalInvPages}
                      </div>
                    </div>

                    {/* Inventory Table */}
                    <div style={{ overflowX: 'auto', background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '10px' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.76rem' }}>
                        <thead>
                          <tr style={{ background: 'var(--bg-tertiary)', borderBottom: '1.5px solid var(--border-subtle)', color: 'var(--text-dim)', textAlign: 'left' }}>
                            <th style={{ padding: '8px 10px' }}>#</th>
                            <th style={{ padding: '8px 10px' }}>Ingredient / Item</th>
                            <th style={{ padding: '8px 10px' }}>Category</th>
                            <th style={{ padding: '8px 10px' }}>Supplier</th>
                            <th style={{ padding: '8px 10px', textAlign: 'center' }}>Stock</th>
                            <th style={{ padding: '8px 10px', textAlign: 'center' }}>Threshold</th>
                            <th style={{ padding: '8px 10px', textAlign: 'right' }}>Unit Cost</th>
                            <th style={{ padding: '8px 10px', textAlign: 'right' }}>Valuation</th>
                            <th style={{ padding: '8px 10px', textAlign: 'center' }}>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {paginatedInventory.map((item, idx) => {
                            const stockNum = Number(item.stock ?? 0);
                            const threshNum = Number(item.minThreshold ?? 0);
                            const unitCost = Number(item.mrp ?? item.unitCost ?? 0);
                            const itemValuation = stockNum * unitCost;
                            const isOut = stockNum <= 0;
                            const isLow = !isOut && stockNum <= threshNum;

                            return (
                              <tr key={item.id || idx} style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-main)' }}>
                                <td style={{ padding: '8px 10px', color: 'var(--text-dim)' }}>{(invPage - 1) * ITEMS_PER_PAGE + idx + 1}</td>
                                <td style={{ padding: '8px 10px', fontWeight: 700 }}>{item.name || item.ingredientName}</td>
                                <td style={{ padding: '8px 10px', color: 'var(--text-muted)' }}>{item.category || 'General'}</td>
                                <td style={{ padding: '8px 10px', color: 'var(--text-dim)' }}>{item.supplier || 'Metro Cash & Carry Wholesale'}</td>
                                <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 800, color: isOut ? '#dc2626' : isLow ? '#f59e0b' : 'var(--text-main)' }}>
                                  {stockNum} {item.unit || 'KG'}
                                </td>
                                <td style={{ padding: '8px 10px', textAlign: 'center', color: 'var(--text-dim)' }}>
                                  {threshNum} {item.unit || 'KG'}
                                </td>
                                <td style={{ padding: '8px 10px', textAlign: 'right' }}>{formatCurrency(unitCost)}</td>
                                <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700 }}>{formatCurrency(itemValuation)}</td>
                                <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                                  <span
                                    style={{
                                      display: 'inline-block',
                                      padding: '0.15rem 0.5rem',
                                      borderRadius: '4px',
                                      fontSize: '0.68rem',
                                      fontWeight: 800,
                                      background: isOut ? 'rgba(239, 68, 68, 0.12)' : isLow ? 'rgba(245, 158, 11, 0.12)' : 'rgba(16, 185, 129, 0.12)',
                                      color: isOut ? '#dc2626' : isLow ? '#f59e0b' : '#10b981',
                                      border: isOut ? '1px solid rgba(239, 68, 68, 0.3)' : isLow ? '1px solid rgba(245, 158, 11, 0.3)' : '1px solid rgba(16, 185, 129, 0.3)',
                                    }}
                                  >
                                    ● {isOut ? 'Out of Stock' : isLow ? 'Low Stock' : 'In Stock'}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Pagination */}
                    {totalInvPages > 1 && (
                      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '6px' }}>
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
                          }}
                        >
                          Previous
                        </button>
                        <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
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
                          }}
                        >
                          Next
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* VIEW 3: DETAILED STAFF SALARY VIEW */}
                {expSubTab === 'salary' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {/* 4 Staff Salary Status Chips */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.65rem' }}>
                      <div style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)', borderRadius: '9px', padding: '0.6rem 0.85rem' }}>
                        <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', fontWeight: 600 }}>Total Staff Count</div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '2px' }}>
                          {(reportStaffList || []).length} Personnel
                        </div>
                      </div>
                      <div style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)', borderRadius: '9px', padding: '0.6rem 0.85rem' }}>
                        <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', fontWeight: 600 }}>Total Monthly Payroll</div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#f59e0b', marginTop: '2px' }}>
                          {formatCurrency(effectiveSalaryExpenditure)}
                        </div>
                      </div>
                      <div style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)', borderRadius: '9px', padding: '0.6rem 0.85rem' }}>
                        <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', fontWeight: 600 }}>Average Salary / Person</div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#10b981', marginTop: '2px' }}>
                          {formatCurrency(reportStaffList.length ? Math.round(effectiveSalaryExpenditure / reportStaffList.length) : 0)}
                        </div>
                      </div>
                      <div style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)', borderRadius: '9px', padding: '0.6rem 0.85rem' }}>
                        <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', fontWeight: 600 }}>Shared Sections</div>
                        <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#c084fc', marginTop: '4px' }}>
                          Both: {(reportStaffList || []).filter((s) => (s.section || 'Dine & Bar') === 'Dine & Bar').length} · Dine: {(reportStaffList || []).filter((s) => s.section === 'Dine').length} · Bar: {(reportStaffList || []).filter((s) => s.section === 'Bar').length}
                        </div>
                      </div>
                    </div>

                    {/* Filter and Search Bar for Staff */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.65rem' }}>
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
                            placeholder='Filter by staff name or role...'
                            value={staffSearch}
                            onChange={(e) => setStaffSearch(e.target.value)}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              outline: 'none',
                              color: 'var(--text-main)',
                              fontSize: '0.78rem',
                              width: '100%',
                            }}
                          />
                          {staffSearch && (
                            <button
                              type="button"
                              onClick={() => setStaffSearch('')}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)', fontSize: '0.75rem', padding: 0 }}
                            >
                              ✕
                            </button>
                          )}
                        </div>

                        <select
                          value={staffSectionFilter}
                          onChange={(e) => setStaffSectionFilter(e.target.value)}
                          style={{
                            background: 'var(--bg-tertiary)',
                            border: '1px solid var(--border-subtle)',
                            color: 'var(--text-main)',
                            borderRadius: '9px',
                            padding: '0.4rem 0.75rem',
                            fontSize: '0.76rem',
                            fontWeight: 600,
                            outline: 'none',
                            cursor: 'pointer',
                          }}
                        >
                          <option value='all'>All Sections ({(reportStaffList || []).length})</option>
                          <option value='dine & bar'>Dine &amp; Bar (Shared)</option>
                          <option value='dine'>Dine In Only</option>
                          <option value='bar'>Bar Only</option>
                        </select>
                      </div>

                      <div style={{ fontSize: '0.74rem', color: 'var(--text-dim)', fontWeight: 600 }}>
                        Showing {filteredStaff.length} staff members
                      </div>
                    </div>

                    {/* Staff Table */}
                    <div style={{ overflowX: 'auto', background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '10px' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.76rem' }}>
                        <thead>
                          <tr style={{ background: 'var(--bg-tertiary)', borderBottom: '1.5px solid var(--border-subtle)', color: 'var(--text-dim)', textAlign: 'left' }}>
                            <th style={{ padding: '8px 10px' }}>#</th>
                            <th style={{ padding: '8px 10px' }}>Staff Name</th>
                            <th style={{ padding: '8px 10px' }}>Role / Designation</th>
                            <th style={{ padding: '8px 10px' }}>Section</th>
                            <th style={{ padding: '8px 10px' }}>Shift</th>
                            <th style={{ padding: '8px 10px' }}>Contact Phone</th>
                            <th style={{ padding: '8px 10px', textAlign: 'right' }}>Monthly Salary</th>
                            <th style={{ padding: '8px 10px', textAlign: 'center' }}>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredStaff.map((person, idx) => (
                            <tr key={person.id ?? person.staffId ?? idx} style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-main)' }}>
                              <td style={{ padding: '8px 10px', color: 'var(--text-dim)' }}>{idx + 1}</td>
                              <td style={{ padding: '8px 10px', fontWeight: 700 }}>{person.name || person.fullName}</td>
                              <td style={{ padding: '8px 10px', color: 'var(--text-muted)' }}>{person.role || person.roleTitle || 'Staff'}</td>
                              <td style={{ padding: '8px 10px' }}>
                                <span
                                  style={{
                                    display: 'inline-block',
                                    padding: '0.18rem 0.5rem',
                                    borderRadius: '5px',
                                    fontSize: '0.68rem',
                                    fontWeight: 700,
                                    background:
                                      (person.section || 'Dine & Bar') === 'Bar'
                                        ? 'rgba(168, 85, 247, 0.15)'
                                        : (person.section || 'Dine & Bar') === 'Dine'
                                        ? 'rgba(59, 130, 246, 0.15)'
                                        : 'rgba(245, 158, 11, 0.15)',
                                    color:
                                      (person.section || 'Dine & Bar') === 'Bar'
                                        ? '#c084fc'
                                        : (person.section || 'Dine & Bar') === 'Dine'
                                        ? '#60a5fa'
                                        : '#f59e0b',
                                    border:
                                      (person.section || 'Dine & Bar') === 'Bar'
                                        ? '1px solid rgba(168, 85, 247, 0.3)'
                                        : (person.section || 'Dine & Bar') === 'Dine'
                                        ? '1px solid rgba(59, 130, 246, 0.3)'
                                        : '1px solid rgba(245, 158, 11, 0.3)',
                                  }}
                                >
                                  {person.section || 'Dine & Bar'}
                                </span>
                              </td>
                              <td style={{ padding: '8px 10px', color: 'var(--text-dim)' }}>{person.shift || 'General Shift'}</td>
                              <td style={{ padding: '8px 10px', color: 'var(--text-dim)' }}>{person.phone || '+91 98450 00000'}</td>
                              <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 800, color: 'var(--text-main)' }}>
                                {formatCurrency(Number(person.salary || 0))}
                              </td>
                              <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                                <span style={{ display: 'inline-block', padding: '0.15rem 0.5rem', borderRadius: '4px', fontSize: '0.68rem', fontWeight: 800, background: 'rgba(16, 185, 129, 0.12)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                                  ● Active
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr style={{ background: 'var(--bg-tertiary)', borderTop: '1.5px solid var(--border-subtle)' }}>
                            <td colSpan={6} style={{ padding: '8px 10px', fontWeight: 800, color: 'var(--text-main)', fontSize: '0.78rem' }}>
                              TOTAL RESTAURANT STAFF PAYROLL (DINE &amp; BAR COMBINED)
                            </td>
                            <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 900, color: '#f59e0b', fontSize: '0.92rem' }}>
                              {formatCurrency(effectiveSalaryExpenditure)}
                            </td>
                            <td style={{ padding: '8px 10px' }} />
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

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
