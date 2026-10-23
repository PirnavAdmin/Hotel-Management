import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  CreditCard,
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
} from "lucide-react";
import { formatCurrency } from "../utils/formatCurrency";
import { printSurface } from "../utils/printSurface";
import { apiGetOrderHistory } from "../api/orderApi";
import { apiGetInvoices } from "../api/invoiceApi";
import { apiGetInventory } from "../api/inventoryApi";
import {
  dedupeOrders,
  sortOrdersBySettlementTime,
  normalizePaymentMethod,
  parseOrderToYMD,
  mergeSettledOrders,
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

export function AdminReports({ pastOrders = [], menuItems = [], restaurantSettings = {}, inventory = [] }) {
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

  const [showAllDishes, setShowAllDishes] = useState(false);
  const [filterPeriod, setFilterPeriod] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isFetching, setIsFetching] = useState(false);
  const [fetchedOrders, setFetchedOrders] = useState(() => {
    try {
      const saved = localStorage.getItem("gourmet_pos_past_orders_v2_inr");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return null;
  });
  const [invoicesData, setInvoicesData] = useState(null);
  const ordersLoaded = true;
  const startInputRef = useRef(null);

  // Financial Sub-Tabs
  const [activeFinanceTab, setActiveFinanceTab] = useState('statement'); // 'statement' | 'income' | 'expenditure'
  const [incomeSearch, setIncomeSearch] = useState('');
  const [invSearch, setInvSearch] = useState('');
  const [invCategoryFilter, setInvCategoryFilter] = useState('all');

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
    let active = true;
    if (!liveInventory || liveInventory.length === 0) {
      apiGetInventory()
        .then((response) => {
          if (!active) return;
          const payload = response?.data ?? response;
          const rows = Array.isArray(payload)
            ? payload
            : Array.isArray(payload?.data)
              ? payload.data
              : Array.isArray(payload?.ingredients)
                ? payload.ingredients
                : [];
          if (rows.length > 0) {
            const normalized = normalizeInventoryList(rows);
            setLiveInventory(normalized);
            try {
              localStorage.setItem('gourmet_pos_inventory_v1', JSON.stringify(normalized));
            } catch {}
          }
        })
        .catch(() => {});
    }
    return () => {
      active = false;
    };
  }, [liveInventory]);

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
    const rawList = fetchedOrders || pastOrders;
    return sortOrdersBySettlementTime(
      dedupeOrders(Array.isArray(rawList) ? rawList : []),
    );
  }, [pastOrders, fetchedOrders]);

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
      ? Number(order.grandTotal ?? order.total ?? 0) || 0
      : 0;
  };

  // Payment breakdown
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
    ? Math.round((paymentStats.cash / totalRevenue) * 100)
    : 0;
  const cardPercent = totalRevenue
    ? Math.max(0, 100 - upiPercent - cashPercent)
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
  const inventoryItems = Array.isArray(liveInventory) ? liveInventory : [];

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

  // ================= PROFIT & LOSS FORMULAS =================
  const plIncome = totalRevenue;
  const plExpenditure = totalInventoryPurchaseCost + totalDiscount;
  const costOfGoodsSold = totalIngredientUsageCost;
  const plNet = plIncome - plExpenditure;
  const isProfit = plNet >= 0;
  const grossFoodSales = Math.max(0, totalRevenue - totalTax - totalService);
  const netRevenueAfterDiscount = Math.max(0, totalRevenue - totalDiscount);
  const profitMarginPercent = plIncome > 0 ? ((plNet / plIncome) * 100).toFixed(1) : '0.0';

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

  const handleFetchData = async () => {
    setIsFetching(true);
    try {
      const [response, invoiceResponse, inventoryResponse] = await Promise.all([
        apiGetOrderHistory().catch(() => null),
        apiGetInvoices().catch(() => null),
        apiGetInventory().catch(() => null),
      ]);
      const invoiceList =
        invoiceResponse?.data?.data ??
        invoiceResponse?.data?.invoices ??
        invoiceResponse?.data;
      if (invoiceResponse?.success && Array.isArray(invoiceList)) {
        setInvoicesData(invoiceList);
      }
      const result = response?.data ?? response;
      const serverOrders = Array.isArray(result)
        ? result
        : Array.isArray(result?.orders)
          ? result.orders
          : Array.isArray(result?.data)
            ? result.data
            : null;
      if (Array.isArray(serverOrders) && serverOrders.length > 0) {
        setFetchedOrders((current) =>
          mergeSettledOrders(current || pastOrders, serverOrders),
        );
        return;
      }
      const saved = localStorage.getItem('gourmet_pos_past_orders_v2_inr');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setFetchedOrders((current) =>
            mergeSettledOrders(current || pastOrders, parsed),
          );
        }
      }

      if (inventoryResponse) {
        const payload = inventoryResponse?.data ?? inventoryResponse;
        const rows = Array.isArray(payload)
          ? payload
          : Array.isArray(payload?.data)
            ? payload.data
            : Array.isArray(payload?.ingredients)
              ? payload.ingredients
              : [];
        if (rows.length > 0) {
          const normalized = normalizeInventoryList(rows);
          setLiveInventory(normalized);
          try {
            localStorage.setItem('gourmet_pos_inventory_v1', JSON.stringify(normalized));
          } catch {}
        }
      }
    } catch {
    } finally {
      setIsFetching(false);
    }
  };

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
      lines.push(`"FINANCIAL PERFORMANCE REPORT"`);
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
      lines.push(`"Total Operating Expenditure","${plExpenditure.toFixed(2)}","Inventory restock/purchase cost + Discounts"`);
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem', width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
      
      {/* SCREEN VIEW ONLY (hidden completely during print) */}
      <div className="no-print" style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem', width: '100%', maxWidth: '100%' }}>
      
      {/* ========================================================= */}
      {/* CARD 1: SALES ANALYTICS & REVENUE REPORTS                 */}
      {/* ========================================================= */}
      <div
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-card)',
          borderRadius: '16px',
          padding: '1.5rem',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
          boxSizing: 'border-box',
        }}
      >
        {/* Header Strip inside Card */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem',
            marginBottom: '1.5rem',
          }}
        >
          {/* Left Title with Orange Squircle */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.85rem" }}>
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 14px rgba(245, 158, 11, 0.35)',
                flexShrink: 0,
              }}
            >
              <BarChart3 size={22} color='#ffffff' />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                <h2
                  style={{
                    fontSize: "1.35rem",
                    fontWeight: 800,
                    color: "var(--text-main)",
                    margin: 0,
                  }}
                >
                  Sales Analytics & Revenue Reports
                </h2>
              </div>
            </div>
          </div>

          {/* Right Corner: Print Report Button */}
          <button
            onClick={() => printSurface("printable-report", {
              title: "Sales and Revenue Report",
              format: "a4",
              emptyMessage: "There is no report data to print.",
            })}
            style={{
              background: "var(--bg-tertiary)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "10px",
              padding: "0.48rem 0.95rem",
              color: "var(--text-main)",
              fontSize: "0.8rem",
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)';
              e.currentTarget.style.borderColor = 'rgba(245, 158, 11, 0.4)';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.14)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
            title='Print or export PDF of the report'
          >
            <Printer size={15} color='#f59e0b' />
            <span>Print Report</span>
          </button>
        </div>

        {/* Filters and Fetch Action Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.65rem',
            flexWrap: 'wrap',
            marginBottom: '1.5rem',
          }}
        >
            {/* Quick period buttons are hidden; the period dropdown is the primary control. */}
            <div
              style={{
                display: "none",
                alignItems: "center",
                background: "var(--bg-tertiary)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "10px",
                padding: "3px",
                gap: "3px",
                flexWrap: "wrap",
              }}
            >
              {[
                { id: "all", label: "All Time" },
                { id: "today", label: "Daily (Today)" },
                { id: "week", label: "Weekly (7D)" },
                { id: "this_month", label: "Monthly" },
                { id: "this_quarter", label: "Quarterly" },
                { id: "this_year", label: "Yearly" },
              ].map((p) => {
                const active = filterPeriod === p.id || (p.id === "this_month" && filterPeriod === "month");
                return (
                  <button
                    key={p.id}
                    onClick={() => handleSelectPeriod(p.id)}
                    style={{
                      background: active
                        ? "linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)"
                        : "transparent",
                      color: active ? "#ffffff" : "var(--text-muted)",
                      border: "none",
                      borderRadius: "7px",
                      padding: "0.38rem 0.65rem",
                      fontSize: "0.76rem",
                      fontWeight: active ? 700 : 600,
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>

            {/* More Periods Dropdown */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                background: "var(--bg-tertiary)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "10px",
                padding: "0.38rem 0.65rem",
                gap: "0.4rem",
              }}
            >
              <Calendar size={14} color="#f59e0b" />
              <select
                value={filterPeriod}
                onChange={(e) => handleSelectPeriod(e.target.value)}
                style={{
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  color: "var(--text-main)",
                  fontSize: "0.78rem",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
                title="Select detailed reporting period"
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
                <option value="custom">Custom Date Range</option>
              </select>
            </div>

            {/* Calendar Date-to-Date Range Picker */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.4rem",
                background:
                  filterPeriod === "custom"
                    ? "rgba(245, 158, 11, 0.14)"
                    : "var(--bg-tertiary)",
                border:
                  filterPeriod === "custom"
                    ? "1.5px solid var(--accent-amber)"
                    : "1px solid var(--border-subtle)",
                borderRadius: "10px",
                padding: "0.35rem 0.65rem",
                transition: "all 0.15s ease",
              }}
            >
              <span
                onClick={() => {
                  try {
                    startInputRef.current?.showPicker();
                  } catch {}
                }}
                style={{ cursor: "pointer", display: "flex", alignItems: "center" }}
                title="Click to select dates"
              >
                <Calendar size={15} color="var(--accent-amber)" style={{ flexShrink: 0 }} />
              </span>
              <input
                ref={startInputRef}
                type="date"
                className="clean-date-input"
                value={startDate}
                max={endDate && endDate < todayYMD ? endDate : todayYMD}
                onClick={(e) => {
                  try {
                    e.currentTarget.showPicker();
                  } catch {}
                }}
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
                  fontSize: "0.78rem",
                  fontWeight: 600,
                  fontFamily: "inherit",
                  cursor: "pointer",
                }}
                title="From Date (Future dates disabled)"
              />
              <span
                style={{
                  fontSize: "0.74rem",
                  color: "var(--text-muted)",
                  margin: "0 2px",
                  fontWeight: 700,
                  userSelect: "none",
                }}
              >
                to
              </span>
              <input
                type="date"
                className="clean-date-input"
                value={endDate}
                min={startDate || undefined}
                max={todayYMD}
                onClick={(e) => {
                  try {
                    e.currentTarget.showPicker();
                  } catch {}
                }}
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
                  fontSize: "0.78rem",
                  fontWeight: 600,
                  fontFamily: "inherit",
                  cursor: "pointer",
                }}
                title="To Date (Future dates disabled)"
              />
            </div>

            {/* Export CSV Button */}
            <button
              onClick={handleExportCSV}
              style={{
                background: "rgba(16, 185, 129, 0.12)",
                border: "1px solid rgba(16, 185, 129, 0.35)",
                borderRadius: "10px",
                padding: "0.45rem 0.85rem",
                color: "#10b981",
                fontSize: "0.78rem",
                fontWeight: 700,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "0.4rem",
                transition: "all 0.15s ease",
              }}
              title="Export report for this period to CSV spreadsheet"
            >
              <Download size={14} />
              <span>Export CSV</span>
            </button>

            {/* Fetch Data Button */}
            <button
              onClick={handleFetchData}
              style={{
                background: "linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)",
                border: "none",
                borderRadius: "10px",
                padding: "0.45rem 0.85rem",
                color: "#ffffff",
                fontSize: "0.78rem",
                fontWeight: 700,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "0.4rem",
                boxShadow: "0 3px 10px rgba(245, 158, 11, 0.35)",
                transition: "all 0.15s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = "0.92";
                e.currentTarget.style.transform = "translateY(-1px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = "1";
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              <RefreshCw
                size={13}
                style={{
                  transition: "transform 0.45s ease",
                  transform: isFetching ? "rotate(360deg)" : "none",
                }}
              />
              <span>Fetch Data</span>
            </button>

          </div>

          {/* Quick Section Navigation Bar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.65rem',
              marginBottom: '1.25rem',
              padding: '0.6rem 0.85rem',
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '12px',
              flexWrap: 'wrap',
            }}
          >
            <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontWeight: 700 }}>
              Quick Navigation:
            </span>
            <button
              type='button'
              onClick={() => {
                const el = document.getElementById('admin-work-area');
                if (el) el.scrollTo({ top: 0, behavior: 'smooth' });
                else window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                background: 'rgba(245, 158, 11, 0.12)',
                border: '1px solid rgba(245, 158, 11, 0.35)',
                color: '#f59e0b',
                borderRadius: '8px',
                padding: '0.35rem 0.75rem',
                fontSize: '0.76rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              <span>📊 Overview &amp; Metrics</span>
            </button>
            <button
              type='button'
              onClick={() => {
                const target = document.getElementById('profit-loss-section');
                if (target) {
                  target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2) 0%, rgba(5, 150, 105, 0.2) 100%)',
                border: '1.5px solid #10b981',
                color: '#10b981',
                borderRadius: '8px',
                padding: '0.35rem 0.85rem',
                fontSize: '0.76rem',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(16, 185, 129, 0.25)',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              <span>💰 Income, Expenditure &amp; Profit / Loss Report ↓</span>
            </button>
          </div>

        {/* 6 Metric Overview Cards */}
        <div
          className="reports-metric-grid"
          style={{
            display: 'grid',
            gap: '1rem',
            marginBottom: '1.5rem',
          }}
        >
          {/* Card 1: Total Collected */}
          <div
            style={{
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '12px',
              padding: '1.1rem',
            }}
          >
            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontWeight: 600 }}>
              Total Collected
            </div>
            <div
              style={{
                fontSize: '1.45rem',
                fontWeight: 800,
                color: '#f59e0b',
                marginTop: '4px',
              }}
            >
              {formatCurrency(totalRevenue)}
            </div>
            <div style={{ fontSize: "0.7rem", color: "var(--text-dim)", marginTop: "3px" }}>
              Across {filteredOrders.length} settled tickets
            </div>
          </div>

          {/* Card 2: Total Orders */}
          <div
            style={{
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '12px',
              padding: '1.1rem',
            }}
          >
            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontWeight: 600 }}>
              Total Orders
            </div>
            <div
              style={{
                fontSize: '1.45rem',
                fontWeight: 800,
                color: 'var(--text-main)',
                marginTop: '4px',
              }}
            >
              {filteredOrders.length}
            </div>
            <div style={{ fontSize: "0.7rem", color: "var(--text-dim)", marginTop: "3px" }}>
              Settled dining orders
            </div>
          </div>

          {/* Card 3: GST & Tax Collected */}
          <div
            style={{
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '12px',
              padding: '1.1rem',
            }}
          >
            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontWeight: 600 }}>
              GST & Tax Collected
            </div>
            <div
              style={{
                fontSize: '1.45rem',
                fontWeight: 800,
                color: '#10b981',
                marginTop: '4px',
              }}
            >
              {formatCurrency(totalTax)}
            </div>
            <div style={{ fontSize: "0.7rem", color: "var(--text-dim)", marginTop: "3px" }}>
              Tax collected across settled invoices
            </div>
          </div>

          {/* Card 4: Service Charges */}
          <div
            style={{
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '12px',
              padding: '1.1rem',
            }}
          >
            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontWeight: 600 }}>
              Service Charges
            </div>
            <div
              style={{
                fontSize: '1.45rem',
                fontWeight: 800,
                color: '#38bdf8',
                marginTop: '4px',
              }}
            >
              {formatCurrency(totalService)}
            </div>
            <div style={{ fontSize: "0.7rem", color: "var(--text-dim)", marginTop: "3px" }}>
              Service charges on settled invoices
            </div>
          </div>

          {/* Card 5: Average Bill */}
          <div
            style={{
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '12px',
              padding: '1.1rem',
            }}
          >
            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontWeight: 600 }}>
              Average Bill
            </div>
            <div style={{ fontSize: "1.4rem", fontWeight: 800, color: "var(--text-main)", marginTop: "4px" }}>
              {formatCurrency(averageBill)}
            </div>
            <div style={{ fontSize: "0.7rem", color: "var(--text-dim)", marginTop: "3px" }}>
              Average collected per settled order
            </div>
          </div>

          {/* Card 6: Discounts Given */}
          <div
            style={{
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '12px',
              padding: '1.1rem',
            }}
          >
            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontWeight: 600 }}>
              Discounts Given
            </div>
            <div style={{ fontSize: "1.4rem", fontWeight: 800, color: "#c084fc", marginTop: "4px" }}>
              {formatCurrency(totalDiscount)}
            </div>
            <div style={{ fontSize: "0.7rem", color: "var(--text-dim)", marginTop: "3px" }}>
              Total discounts on settled bills
            </div>
          </div>
        </div>

        {/* Two Column Grid: Payment Method Distribution & Top Dishes */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
            gap: '1.25rem',
          }}
        >
          {/* Payment Methods Breakdown */}
          <div
            style={{
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '14px',
              padding: '1.25rem',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <h3
              style={{
                fontSize: '0.95rem',
                fontWeight: 700,
                color: 'var(--text-main)',
                marginBottom: '1rem',
              }}
            >
              Payment Channel Distribution
            </h3>

            {/* UPI Bar */}
            <div style={{ marginBottom: '1rem' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '0.82rem',
                  marginBottom: '4px',
                }}
              >
                <span
                  style={{
                    color: '#38bdf8',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    fontWeight: 700,
                  }}
                >
                  <Smartphone size={14} /> UPI Payments ({upiPercent}%)
                </span>
                <span style={{ color: 'var(--text-main)', fontWeight: 800 }}>
                  {formatCurrency(paymentStats.upi)}
                </span>
              </div>
              <div
                style={{
                  width: '100%',
                  height: '8px',
                  background: 'var(--border-subtle)',
                  borderRadius: '4px',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    width: `${upiPercent}%`,
                    height: '100%',
                    background: '#38bdf8',
                  }}
                />
              </div>
            </div>

            {/* Cash Bar */}
            <div style={{ marginBottom: '1rem' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '0.82rem',
                  marginBottom: '4px',
                }}
              >
                <span
                  style={{
                    color: '#10b981',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    fontWeight: 700,
                  }}
                >
                  <Banknote size={14} /> Cash ({cashPercent}%)
                </span>
                <span style={{ color: 'var(--text-main)', fontWeight: 800 }}>
                  {formatCurrency(paymentStats.cash)}
                </span>
              </div>
              <div
                style={{
                  width: '100%',
                  height: '8px',
                  background: 'var(--border-subtle)',
                  borderRadius: '4px',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    width: `${cashPercent}%`,
                    height: '100%',
                    background: '#10b981',
                  }}
                />
              </div>
            </div>

            {/* Card Bar */}
            <div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '0.82rem',
                  marginBottom: '4px',
                }}
              >
                <span
                  style={{
                    color: '#c084fc',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    fontWeight: 700,
                  }}
                >
                  <CreditCard size={14} /> Card & POS Terminal ({cardPercent}%)
                </span>
                <span style={{ color: 'var(--text-main)', fontWeight: 800 }}>
                  {formatCurrency(paymentStats.card)}
                </span>
              </div>
              <div
                style={{
                  width: '100%',
                  height: '8px',
                  background: 'var(--border-subtle)',
                  borderRadius: '4px',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    width: `${cardPercent}%`,
                    height: '100%',
                    background: '#c084fc',
                  }}
                />
              </div>
            </div>
          </div>

          {/* Top Selling Items Ranking */}
          <div
            style={{
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '14px',
              padding: '1.25rem',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1rem',
              }}
            >
              <h3
                style={{
                  fontSize: '0.95rem',
                  fontWeight: 700,
                  color: "var(--text-main)",
                  margin: 0,
                }}
              >
                Top Selling Items
              </h3>
              {sortedDishes.length > 3 && (
                <button
                  onClick={() => setShowAllDishes((prev) => !prev)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#f59e0b',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '3px',
                    padding: 0,
                  }}
                >
                  <span>{showAllDishes ? 'Show Top 3' : 'View All'}</span>
                  <ArrowRight size={13} />
                </button>
              )}
            </div>

            <div
              className='no-scrollbar'
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.6rem',
                maxHeight: '155px',
                overflowY: 'auto',
                scrollbarWidth: 'none',
                msOverflowStyle: 'none',
              }}
            >
              {displayedDishes.length === 0 ? (
                <div
                  style={{
                    padding: '2rem 1rem',
                    textAlign: 'center',
                    color: 'var(--text-dim)',
                    fontSize: '0.82rem',
                  }}
                >
              {ordersLoaded ? "No settled invoices recorded for this period" : "Loading settled invoice data..."}
                </div>
              ) : (
                displayedDishes.map(([name, qty], index) => (
                <div
                  key={name}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "0.5rem 0.65rem",
                    borderRadius: "8px",
                    background: "var(--bg-card)",
                    border: "1px solid var(--border-subtle)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span
                      style={{
                        width: "22px",
                        height: "22px",
                        borderRadius: "50%",
                        background:
                          index === 0
                            ? "#f59e0b"
                            : index === 1
                            ? "#64748b"
                            : "var(--border-card)",
                        color: index <= 1 ? "#000000" : "var(--text-main)",
                        fontWeight: 800,
                        fontSize: "0.72rem",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {index + 1}
                    </span>
                    <span
                      style={{
                        fontSize: "0.85rem",
                        fontWeight: 700,
                        color: "var(--text-main)",
                      }}
                    >
                      {name}
                    </span>
                  </div>
                  <span
                    style={{
                      fontSize: "0.82rem",
                      fontWeight: 700,
                      color: "var(--accent-amber-light)",
                    }}
                  >
                    {qty} orders
                  </span>
                </div>
              )))}
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* CARD 2: INCOME, EXPENDITURE & PROFIT / LOSS REPORT (DETAILED & USER FRIENDLY) */}
      {/* ========================================================================= */}
      <div
        id="profit-loss-section"
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-card)',
          borderRadius: '16px',
          padding: '1.5rem',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
          boxSizing: 'border-box',
        }}
      >
        {/* Section Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem',
            borderBottom: '1px solid var(--border-subtle)',
            paddingBottom: '1.25rem',
            marginBottom: '1.5rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                background: isProfit
                  ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                  : 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: isProfit
                  ? '0 4px 14px rgba(16, 185, 129, 0.35)'
                  : '0 4px 14px rgba(239, 68, 68, 0.35)',
                flexShrink: 0,
              }}
            >
              <FileSpreadsheet size={22} color='#ffffff' />
            </div>
            <div>
              <h2
                style={{
                  fontSize: '1.35rem',
                  fontWeight: 800,
                  color: 'var(--text-main)',
                  margin: 0,
                  letterSpacing: '-0.01em',
                }}
              >
                Income, Expenditure &amp; Profit / Loss
              </h2>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                Complete financial accounting evaluating settled dining revenue against inventory item costs
              </div>
            </div>
          </div>

          {/* Profit / Loss Status Indicator Pill */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
              background: isProfit ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
              border: `1.5px solid ${isProfit ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`,
              borderRadius: '999px',
              padding: '0.45rem 1.1rem',
            }}
          >
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: isProfit ? '#10b981' : '#ef4444',
                boxShadow: `0 0 8px ${isProfit ? '#10b981' : '#ef4444'}`,
              }}
            />
            <span
              style={{
                fontSize: '0.82rem',
                fontWeight: 800,
                color: isProfit ? '#10b981' : '#ef4444',
                letterSpacing: '0.03em',
                textTransform: 'uppercase',
              }}
            >
              {isProfit ? `NET PROFIT: +${formatCurrency(plNet)} (${profitMarginPercent}%)` : `NET LOSS: -${formatCurrency(Math.abs(plNet))} (${profitMarginPercent}%)`}
            </span>
          </div>
        </div>

        {/* Period Performance Insights Bar */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "0.75rem",
            marginBottom: "1.25rem",
          }}
        >
          <div style={{ background: "var(--bg-tertiary)", border: "1px solid var(--border-subtle)", borderRadius: "10px", padding: "0.65rem 0.95rem" }}>
            <div style={{ fontSize: "0.68rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em" }}>Period Orders Settled</div>
            <div style={{ fontSize: "1.25rem", fontWeight: 900, color: "var(--text-main)", marginTop: "2px" }}>
              {filteredOrders.length} <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-dim)" }}>orders</span>
            </div>
          </div>
          <div style={{ background: "var(--bg-tertiary)", border: "1px solid var(--border-subtle)", borderRadius: "10px", padding: "0.65rem 0.95rem" }}>
            <div style={{ fontSize: "0.68rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em" }}>Average Bill (AOV)</div>
            <div style={{ fontSize: "1.25rem", fontWeight: 900, color: "#38bdf8", marginTop: "2px" }}>
              {formatCurrency(averageBill)}
            </div>
          </div>
          <div style={{ background: "var(--bg-tertiary)", border: "1px solid var(--border-subtle)", borderRadius: "10px", padding: "0.65rem 0.95rem" }}>
            <div style={{ fontSize: "0.68rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em" }}>Taxes &amp; Service Collected</div>
            <div style={{ fontSize: "1.25rem", fontWeight: 900, color: "#f59e0b", marginTop: "2px" }}>
              {formatCurrency(totalTax + totalService)}
            </div>
          </div>
          <div style={{ background: "var(--bg-tertiary)", border: "1px solid var(--border-subtle)", borderRadius: "10px", padding: "0.65rem 0.95rem" }}>
            <div style={{ fontSize: "0.68rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em" }}>Promotions &amp; Discounts</div>
            <div style={{ fontSize: "1.25rem", fontWeight: 900, color: totalDiscount > 0 ? "#ef4444" : "#10b981", marginTop: "2px" }}>
              {formatCurrency(totalDiscount)} <span style={{ fontSize: "0.72rem", fontWeight: 600, color: "var(--text-dim)" }}>({totalRevenue > 0 ? ((totalDiscount / totalRevenue) * 100).toFixed(1) : "0.0"}%)</span>
            </div>
          </div>
        </div>

        {/* 3 Prominent Executive Balance Metric Cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '1rem',
            marginBottom: '1.5rem',
          }}
        >
          {/* 1. TOTAL INCOME */}
          <div
            style={{
              background: 'linear-gradient(145deg, rgba(16, 185, 129, 0.08) 0%, rgba(16, 185, 129, 0.02) 100%)',
              border: '1.5px solid rgba(16, 185, 129, 0.3)',
              borderRadius: '14px',
              padding: '1.25rem',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Total Income (Sales)
              </div>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  background: 'rgba(16, 185, 129, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#10b981',
                }}
              >
                <TrendingUp size={18} />
              </div>
            </div>
            <div
              style={{
                fontSize: '1.75rem',
                fontWeight: 900,
                color: '#10b981',
                marginTop: '0.6rem',
                letterSpacing: '-0.02em',
              }}
            >
              {formatCurrency(plIncome)}
            </div>
            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
              Revenue generated from <strong style={{ color: 'var(--text-main)' }}>{filteredOrders.length}</strong> settled orders
            </div>
          </div>

          {/* 2. TOTAL EXPENDITURE */}
          <div
            style={{
              background: 'linear-gradient(145deg, rgba(239, 68, 68, 0.08) 0%, rgba(239, 68, 68, 0.02) 100%)',
              border: '1.5px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '14px',
              padding: '1.25rem',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Total Expenditure (Costs)
              </div>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  background: 'rgba(239, 68, 68, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ef4444',
                }}
              >
                <TrendingDown size={18} />
              </div>
            </div>
            <div
              style={{
                fontSize: '1.75rem',
                fontWeight: 900,
                color: '#ef4444',
                marginTop: '0.6rem',
                letterSpacing: '-0.02em',
              }}
            >
              {formatCurrency(plExpenditure)}
            </div>
            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
              Restock Purchases: <strong style={{ color: 'var(--text-main)' }}>{formatCurrency(totalInventoryPurchaseCost)}</strong> + Discounts: <strong style={{ color: 'var(--text-main)' }}>{formatCurrency(totalDiscount)}</strong> · COGS: <strong style={{ color: 'var(--text-main)' }}>{formatCurrency(costOfGoodsSold)}</strong>
            </div>
          </div>

          {/* 3. NET PROFIT / LOSS */}
          <div
            style={{
              background: isProfit
                ? 'linear-gradient(145deg, rgba(16, 185, 129, 0.12) 0%, rgba(16, 185, 129, 0.04) 100%)'
                : 'linear-gradient(145deg, rgba(239, 68, 68, 0.12) 0%, rgba(239, 68, 68, 0.04) 100%)',
              border: `1.5px solid ${isProfit ? 'rgba(16, 185, 129, 0.45)' : 'rgba(239, 68, 68, 0.45)'}`,
              borderRadius: '14px',
              padding: '1.25rem',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div
                style={{
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  color: isProfit ? '#10b981' : '#ef4444',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                {isProfit ? 'Net Operating Profit' : 'Net Operating Loss'}
              </div>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  background: isProfit ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: isProfit ? '#10b981' : '#ef4444',
                }}
              >
                <Award size={18} />
              </div>
            </div>
            <div
              style={{
                fontSize: '1.75rem',
                fontWeight: 900,
                color: isProfit ? '#10b981' : '#ef4444',
                marginTop: '0.6rem',
                letterSpacing: '-0.02em',
              }}
            >
              {isProfit ? '+' : '-'}{formatCurrency(Math.abs(plNet))}
            </div>
            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
              Operating Margin: <strong style={{ color: isProfit ? '#10b981' : '#ef4444' }}>{profitMarginPercent}%</strong> (Income − Expenditure)
            </div>
          </div>
        </div>

        {/* Financial Sub-Navigation Tabs */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.75rem',
            background: 'var(--bg-tertiary)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '12px',
            padding: '6px',
            marginBottom: '1.25rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            {/* Tab: Statement */}
            <button
              type='button'
              onClick={() => setActiveFinanceTab('statement')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '0.5rem 1rem',
                borderRadius: '8px',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: 'pointer',
                border: 'none',
                transition: 'all 0.15s ease',
                background: activeFinanceTab === 'statement'
                  ? 'linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)'
                  : 'transparent',
                color: activeFinanceTab === 'statement' ? '#ffffff' : 'var(--text-muted)',
                boxShadow: activeFinanceTab === 'statement' ? '0 2px 8px rgba(245, 158, 11, 0.35)' : 'none',
              }}
            >
              <FileSpreadsheet size={15} />
              <span>Profit &amp; Loss Statement</span>
            </button>

            {/* Tab: Detailed Income */}
            <button
              type='button'
              onClick={() => setActiveFinanceTab('income')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '0.5rem 1rem',
                borderRadius: '8px',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: 'pointer',
                border: 'none',
                transition: 'all 0.15s ease',
                background: activeFinanceTab === 'income'
                  ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                  : 'transparent',
                color: activeFinanceTab === 'income' ? '#ffffff' : 'var(--text-muted)',
                boxShadow: activeFinanceTab === 'income' ? '0 2px 8px rgba(16, 185, 129, 0.35)' : 'none',
              }}
            >
              <Receipt size={15} />
              <span>Detailed Income ({filteredOrders.length} Orders)</span>
            </button>

            {/* Tab: Detailed Expenditure / Inventory */}
            <button
              type='button'
              onClick={() => setActiveFinanceTab('expenditure')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '0.5rem 1rem',
                borderRadius: '8px',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: 'pointer',
                border: 'none',
                transition: 'all 0.15s ease',
                background: activeFinanceTab === 'expenditure'
                  ? 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)'
                  : 'transparent',
                color: activeFinanceTab === 'expenditure' ? '#ffffff' : 'var(--text-muted)',
                boxShadow: activeFinanceTab === 'expenditure' ? '0 2px 8px rgba(239, 68, 68, 0.35)' : 'none',
              }}
            >
              <Boxes size={15} />
              <span>Detailed Expenditure ({inventoryItems.length} Inventory Items)</span>
            </button>
          </div>

          {/* Interactive Period Quick Filter in Sub-Nav (Screenshot Location) */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.45rem",
              flexWrap: "wrap",
              paddingRight: "0.4rem",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.35rem",
                background: "rgba(255, 255, 255, 0.05)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "8px",
                padding: "0.32rem 0.6rem",
              }}
            >
              <Calendar size={13} color="#f59e0b" />
              <span style={{ fontSize: "0.74rem", color: "var(--text-muted)", fontWeight: 600 }}>Period:</span>
              <select
                value={filterPeriod}
                onChange={(e) => handleSelectPeriod(e.target.value)}
                style={{
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  color: "#f59e0b",
                  fontSize: "0.78rem",
                  fontWeight: 700,
                  cursor: "pointer",
                  paddingRight: "4px",
                }}
                title="Select reporting period"
              >
                <option value="all">🌐 All Time (Complete History)</option>
                <optgroup label="Daily &amp; Particular Day">
                  <option value="today">📅 Today ({todayYMD})</option>
                  <option value="yesterday">⏮️ Yesterday ({yesterdayYMD})</option>
                </optgroup>
                <optgroup label="Weekly Basis">
                  <option value="this_week">📆 This Week (Mon → Today)</option>
                  <option value="last_week">⏮️ Last Week (Full)</option>
                </optgroup>
                <optgroup label="Monthly Basis">
                  <option value="this_month">📊 This Month ({now.toLocaleString("default", { month: "short" })})</option>
                  <option value="last_month">⏮️ Last Month ({lastMonthDate.toLocaleString("default", { month: "short" })})</option>
                </optgroup>
                <optgroup label="Quarterly Basis">
                  <option value="this_quarter">📈 This Quarter (Q{currentQNum} {currentYear})</option>
                  <option value="last_quarter">⏮️ Last Quarter (Q{lastQNum})</option>
                </optgroup>
                <optgroup label="Yearly Basis">
                  <option value="this_year">🏛️ This Year ({currentYear})</option>
                  <option value="last_year">⏮️ Last Year ({currentYear - 1})</option>
                </optgroup>
                <optgroup label="Custom Range">
                  <option value="custom">⚙️ Custom Date Range (From → To)...</option>
                </optgroup>
              </select>
            </div>

            {/* Direct Inline Custom Date Range Picker (From → To) */}
            {filterPeriod === "custom" && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.35rem",
                  background: "rgba(245, 158, 11, 0.12)",
                  border: "1.5px solid var(--accent-amber)",
                  borderRadius: "8px",
                  padding: "0.28rem 0.6rem",
                }}
              >
                <Calendar size={13} color="#f59e0b" />
                <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: 600 }}>From:</span>
                <input
                  type="date"
                  className="clean-date-input"
                  value={startDate || thisMonthStartYMD}
                  max={endDate && endDate < todayYMD ? endDate : todayYMD}
                  onClick={(e) => {
                    try { e.currentTarget.showPicker(); } catch {}
                  }}
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
                    fontSize: "0.78rem",
                    fontWeight: 700,
                    fontFamily: "inherit",
                    cursor: "pointer",
                  }}
                  title="From Date"
                />
                <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: 700 }}>to</span>
                <input
                  type="date"
                  className="clean-date-input"
                  value={endDate || todayYMD}
                  min={startDate || undefined}
                  max={todayYMD}
                  onClick={(e) => {
                    try { e.currentTarget.showPicker(); } catch {}
                  }}
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
                    fontSize: "0.78rem",
                    fontWeight: 700,
                    fontFamily: "inherit",
                    cursor: "pointer",
                  }}
                  title="To Date"
                />
              </div>
            )}

            {/* Date range chip for other periods */}
            {filterPeriod !== "custom" && (
              <span
                style={{
                  fontSize: "0.72rem",
                  color: "var(--text-dim)",
                  background: "rgba(255, 255, 255, 0.03)",
                  padding: "0.28rem 0.55rem",
                  borderRadius: "6px",
                  border: "1px solid var(--border-subtle)",
                  whiteSpace: "nowrap",
                }}
              >
                {getActiveDateRangeText()}
              </span>
            )}

            {/* 1-click Reset button if filter is active */}
            {filterPeriod !== "all" && (
              <button
                type="button"
                onClick={() => handleSelectPeriod("all")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  background: "rgba(239, 68, 68, 0.12)",
                  border: "1px solid rgba(239, 68, 68, 0.3)",
                  color: "#ef4444",
                  borderRadius: "6px",
                  padding: "0.28rem 0.55rem",
                  fontSize: "0.7rem",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
                title="Reset filter to All Time"
              >
                <RotateCcw size={11} />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>

        {/* ===================================================================== */}
        {/* TAB 1: STRUCTURED PROFIT & LOSS STATEMENT                             */}
        {/* ===================================================================== */}
        {activeFinanceTab === 'statement' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Visual Margin Bar */}
            <div
              style={{
                background: 'var(--bg-tertiary)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '12px',
                padding: '1rem 1.25rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-main)' }}>
                  Operating Balance Ratio (Revenue vs Expenditure)
                </span>
                <span style={{ fontSize: '0.78rem', fontWeight: 800, color: isProfit ? '#10b981' : '#ef4444' }}>
                  {isProfit ? 'Operating in Profit' : 'Operating at Loss'}
                </span>
              </div>
              <div
                style={{
                  height: '10px',
                  width: '100%',
                  background: 'var(--border-subtle)',
                  borderRadius: '5px',
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
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', marginTop: '6px' }}>
                <span style={{ color: '#10b981', fontWeight: 700 }}>
                  ● Income: {formatCurrency(plIncome)} ({plIncome + plExpenditure > 0 ? Math.round((plIncome / (plIncome + plExpenditure)) * 100) : 0}%)
                </span>
                <span style={{ color: '#ef4444', fontWeight: 700 }}>
                  ● Expenditure: {formatCurrency(plExpenditure)} ({plIncome + plExpenditure > 0 ? Math.round((plExpenditure / (plIncome + plExpenditure)) * 100) : 0}%)
                </span>
              </div>
            </div>

            {/* Formal Accounting Table */}
            <div
              style={{
                background: 'var(--bg-tertiary)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '12px',
                overflow: 'hidden',
              }}
            >
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-subtle)' }}>
                    <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, color: 'var(--text-muted)' }}>Accounting Head / Description</th>
                    <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, color: 'var(--text-muted)' }}>Operational Context</th>
                    <th style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 700, color: 'var(--text-muted)' }}>Amount (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {/* SECTION 1: REVENUE */}
                  <tr style={{ background: 'rgba(16, 185, 129, 0.05)', borderBottom: '1px solid var(--border-subtle)' }}>
                    <td colSpan={3} style={{ padding: '8px 14px', fontWeight: 800, color: '#10b981', fontSize: '0.85rem' }}>
                      1. OPERATING REVENUE (INCOME)
                    </td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '8px 14px', paddingLeft: '28px', color: 'var(--text-main)', fontWeight: 600 }}>
                      Gross Settled Dining Sales
                    </td>
                    <td style={{ padding: '8px 14px', color: 'var(--text-muted)', fontSize: '0.76rem' }}>
                      Revenue from {filteredOrders.length} customer orders
                    </td>
                    <td style={{ padding: '8px 14px', textAlign: 'right', fontWeight: 700, color: '#10b981' }}>
                      +{formatCurrency(totalRevenue)}
                    </td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '8px 14px', paddingLeft: '28px', color: 'var(--text-muted)' }}>
                      ↳ Food &amp; Beverage Net Sales
                    </td>
                    <td style={{ padding: '8px 14px', color: 'var(--text-dim)', fontSize: '0.76rem' }}>
                      Bill total minus GST &amp; service charge
                    </td>
                    <td style={{ padding: '8px 14px', textAlign: 'right', color: 'var(--text-muted)' }}>
                      {formatCurrency(grossFoodSales)}
                    </td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '8px 14px', paddingLeft: '28px', color: 'var(--text-muted)' }}>
                      ↳ GST &amp; Direct Taxes Collected
                    </td>
                    <td style={{ padding: '8px 14px', color: 'var(--text-dim)', fontSize: '0.76rem' }}>
                      Tax liability collected from invoices
                    </td>
                    <td style={{ padding: '8px 14px', textAlign: 'right', color: '#38bdf8' }}>
                      {formatCurrency(totalTax)}
                    </td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '8px 14px', paddingLeft: '28px', color: 'var(--text-muted)' }}>
                      ↳ Service Charges Collected
                    </td>
                    <td style={{ padding: '8px 14px', color: 'var(--text-dim)', fontSize: '0.76rem' }}>
                      Customer dining service fees
                    </td>
                    <td style={{ padding: '8px 14px', textAlign: 'right', color: '#38bdf8' }}>
                      {formatCurrency(totalService)}
                    </td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '8px 14px', paddingLeft: '28px', color: '#f59e0b', fontWeight: 600 }}>
                      Less: Bill Discounts Given
                    </td>
                    <td style={{ padding: '8px 14px', color: 'var(--text-muted)', fontSize: '0.76rem' }}>
                      Promotions &amp; customer reductions
                    </td>
                    <td style={{ padding: '8px 14px', textAlign: 'right', fontWeight: 700, color: '#f59e0b' }}>
                      -{formatCurrency(totalDiscount)}
                    </td>
                  </tr>
                  <tr style={{ background: 'var(--bg-secondary)', borderBottom: '2px solid var(--border-subtle)' }}>
                    <td style={{ padding: '9px 14px', fontWeight: 800, color: 'var(--text-main)' }}>
                      Total Net Operating Revenue
                    </td>
                    <td style={{ padding: '9px 14px', color: 'var(--text-dim)', fontSize: '0.76rem' }}>
                      Total revenue adjusted for discounts
                    </td>
                    <td style={{ padding: '9px 14px', textAlign: 'right', fontWeight: 800, color: '#10b981', fontSize: '0.92rem' }}>
                      {formatCurrency(netRevenueAfterDiscount)}
                    </td>
                  </tr>

                  {/* SECTION 2: EXPENDITURE */}
                  <tr style={{ background: 'rgba(239, 68, 68, 0.05)', borderBottom: '1px solid var(--border-subtle)' }}>
                    <td colSpan={3} style={{ padding: '8px 14px', fontWeight: 800, color: '#ef4444', fontSize: '0.85rem' }}>
                      2. OPERATING EXPENDITURE &amp; INVENTORY
                    </td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '8px 14px', paddingLeft: '28px', color: 'var(--text-main)', fontWeight: 600 }}>
                      Current Ingredient &amp; Raw Material Stock Valuation
                    </td>
                    <td style={{ padding: '8px 14px', color: 'var(--text-muted)', fontSize: '0.76rem' }}>
                      {inventoryItems.length} inventory items evaluated at current stock and unit cost
                    </td>
                    <td style={{ padding: '8px 14px', textAlign: 'right', fontWeight: 700, color: '#ef4444' }}>
                      -{formatCurrency(totalInventoryCost)}
                    </td>
                  </tr>

                  {/* Top categories breakdown */}
                  {inventoryCategoryBreakdown.slice(0, 4).map(([cat, val]) => (
                    <tr key={cat} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '6px 14px', paddingLeft: '38px', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                        ↳ {cat} Stock Cost
                      </td>
                      <td style={{ padding: '6px 14px', color: 'var(--text-dim)', fontSize: '0.74rem' }}>
                        Category inventory valuation
                      </td>
                      <td style={{ padding: '6px 14px', textAlign: 'right', color: 'var(--text-dim)', fontSize: '0.78rem' }}>
                        {formatCurrency(val)}
                      </td>
                    </tr>
                  ))}

                  <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '8px 14px', paddingLeft: '28px', color: '#f59e0b', fontWeight: 600 }}>
                      Customer Discounts Absorbed
                    </td>
                    <td style={{ padding: '8px 14px', color: 'var(--text-muted)', fontSize: '0.76rem' }}>
                      Promotional price reductions on settled bills
                    </td>
                    <td style={{ padding: '8px 14px', textAlign: 'right', fontWeight: 700, color: '#f59e0b' }}>
                      -{formatCurrency(totalDiscount)}
                    </td>
                  </tr>
                  <tr style={{ background: 'var(--bg-secondary)', borderBottom: '2px solid var(--border-subtle)' }}>
                    <td style={{ padding: '9px 14px', fontWeight: 800, color: 'var(--text-main)' }}>
                      Total Operating Expenditure
                    </td>
                    <td style={{ padding: '9px 14px', color: 'var(--text-dim)', fontSize: '0.76rem' }}>
                      Lifetime tracked restock purchases + customer discounts
                    </td>
                    <td style={{ padding: '9px 14px', textAlign: 'right', fontWeight: 800, color: '#ef4444', fontSize: '0.92rem' }}>
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
                    <td style={{ padding: '12px 14px', fontWeight: 900, fontSize: '0.98rem', color: isProfit ? '#10b981' : '#ef4444' }}>
                      {isProfit ? 'NET OPERATING PROFIT' : 'NET OPERATING LOSS'}
                    </td>
                    <td style={{ padding: '12px 14px', color: 'var(--text-main)', fontSize: '0.8rem', fontWeight: 600 }}>
                      Total Income − Total Expenditure ({profitMarginPercent}% Operating Margin)
                    </td>
                    <td
                      style={{
                        padding: '12px 14px',
                        textAlign: 'right',
                        fontWeight: 900,
                        fontSize: '1.25rem',
                        color: isProfit ? '#10b981' : '#ef4444',
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

        {/* ===================================================================== */}
        {/* TAB 2: DETAILED INCOME TABLE                                          */}
        {/* ===================================================================== */}
        {activeFinanceTab === 'income' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Search Bar for Orders */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '0.75rem',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  background: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '10px',
                  padding: '0.45rem 0.85rem',
                  gap: '0.5rem',
                  width: '320px',
                  maxWidth: '100%',
                }}
              >
                <Search size={15} color='var(--text-muted)' />
                <input
                  type='text'
                  placeholder='Search by order #, table, dish or payment...'
                  value={incomeSearch}
                  onChange={(e) => setIncomeSearch(e.target.value)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    color: 'var(--text-main)',
                    fontSize: '0.8rem',
                    width: '100%',
                  }}
                />
              </div>

              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Showing <strong style={{ color: 'var(--text-main)' }}>{searchedOrders.length}</strong> of {filteredOrders.length} settled tickets
              </div>
            </div>

            {/* Orders Table */}
            <div
              style={{
                border: '1px solid var(--border-subtle)',
                borderRadius: '12px',
                overflowX: 'auto',
                background: 'var(--bg-tertiary)',
              }}
            >
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1.5px solid var(--border-subtle)' }}>
                    <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 700, color: 'var(--text-muted)' }}>#</th>
                    <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 700, color: 'var(--text-muted)' }}>Order ID</th>
                    <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 700, color: 'var(--text-muted)' }}>Date &amp; Time</th>
                    <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 700, color: 'var(--text-muted)' }}>Dining Table</th>
                    <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 700, color: 'var(--text-muted)' }}>Items Summary</th>
                    <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 700, color: 'var(--text-muted)' }}>Payment Mode</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: 'var(--text-muted)' }}>Tax (GST)</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: 'var(--text-muted)' }}>Discount</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: 'var(--text-muted)' }}>Total Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {searchedOrders.length === 0 ? (
                    <tr>
                      <td colSpan={9} style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                        No settled orders found matching the filter criteria.
                      </td>
                    </tr>
                  ) : (
                    searchedOrders.map((ord, idx) => {
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
                      return (
                        <tr
                          key={ord.id || idx}
                          style={{
                            borderBottom: '1px solid var(--border-subtle)',
                            background: idx % 2 === 0 ? 'transparent' : 'rgba(255, 255, 255, 0.02)',
                          }}
                        >
                          <td style={{ padding: '8px 12px', color: 'var(--text-dim)', fontSize: '0.75rem' }}>{idx + 1}</td>
                          <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontWeight: 700, color: 'var(--text-main)' }}>
                            #{ord.id || ord.orderNumber || idx + 1}
                          </td>
                          <td style={{ padding: '8px 12px', color: 'var(--text-muted)', whiteSpace: 'nowrap', fontSize: '0.76rem' }}>
                            {dateStr}
                          </td>
                          <td style={{ padding: '8px 12px', fontWeight: 600, color: 'var(--text-main)' }}>
                            {ord.table ? `Table ${ord.table}` : ord.tableName || 'Takeaway'}
                          </td>
                          <td
                            style={{
                              padding: '8px 12px',
                              color: 'var(--text-muted)',
                              maxWidth: '260px',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              fontSize: '0.78rem',
                            }}
                            title={itemSummary}
                          >
                            {itemSummary || '—'}
                          </td>
                          <td style={{ padding: '8px 12px', textAlign: 'center' }}>
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
                                padding: '2px 8px',
                                fontWeight: 700,
                                fontSize: '0.72rem',
                                textTransform: 'uppercase',
                              }}
                            >
                              {pm || 'OTHER'}
                            </span>
                          </td>
                          <td style={{ padding: '8px 12px', textAlign: 'right', color: '#10b981', fontWeight: 600 }}>
                            {formatCurrency(ord.taxAmount || 0)}
                          </td>
                          <td style={{ padding: '8px 12px', textAlign: 'right', color: '#c084fc', fontWeight: 600 }}>
                            {formatCurrency(ord.discountAmount || 0)}
                          </td>
                          <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 800, color: '#f59e0b' }}>
                            {formatCurrency(ord.grandTotal || ord.total || 0)}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
                <tfoot>
                  <tr style={{ background: 'var(--bg-secondary)', borderTop: '2px solid var(--border-subtle)' }}>
                    <td colSpan={6} style={{ padding: '10px 12px', fontWeight: 800, color: 'var(--text-main)' }}>
                      TOTAL SUMMARY ({searchedOrders.length} TICKETS)
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 800, color: '#10b981' }}>
                      {formatCurrency(searchedOrders.reduce((s, o) => s + (Number(o.taxAmount) || 0), 0))}
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 800, color: '#c084fc' }}>
                      {formatCurrency(searchedOrders.reduce((s, o) => s + (Number(o.discountAmount) || 0), 0))}
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 900, color: '#f59e0b', fontSize: '0.95rem' }}>
                      {formatCurrency(searchedOrders.reduce((s, o) => s + (Number(o.grandTotal || o.total || 0)), 0))}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* ===================================================================== */}
        {/* TAB 3: DETAILED EXPENDITURE / INVENTORY TABLE                         */}
        {/* ===================================================================== */}
        {activeFinanceTab === 'expenditure' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Inventory Status Overview Pills */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
              <div style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)', borderRadius: '10px', padding: '0.75rem 1rem' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontWeight: 600 }}>Total Tracked Items</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '2px' }}>
                  {inventoryItems.length} Ingredients
                </div>
              </div>
              <div style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)', borderRadius: '10px', padding: '0.75rem 1rem' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontWeight: 600 }}>Total Stock Valuation</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#ef4444', marginTop: '2px' }}>
                  {formatCurrency(totalInventoryCost)}
                </div>
              </div>
              <div style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)', borderRadius: '10px', padding: '0.75rem 1rem' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontWeight: 600 }}>Low Stock Alert</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f59e0b', marginTop: '2px' }}>
                  {lowStockCount} Items
                </div>
              </div>
              <div style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)', borderRadius: '10px', padding: '0.75rem 1rem' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontWeight: 600 }}>Out of Stock</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#dc2626', marginTop: '2px' }}>
                  {outOfStockCount} Items
                </div>
              </div>
            </div>

            {/* Filter and Search Bar for Inventory */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '0.75rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    background: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '10px',
                    padding: '0.45rem 0.85rem',
                    gap: '0.5rem',
                    width: '280px',
                    maxWidth: '100%',
                  }}
                >
                  <Search size={15} color='var(--text-muted)' />
                  <input
                    type='text'
                    placeholder='Filter by item name or supplier...'
                    value={invSearch}
                    onChange={(e) => setInvSearch(e.target.value)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      outline: 'none',
                      color: 'var(--text-main)',
                      fontSize: '0.8rem',
                      width: '100%',
                    }}
                  />
                </div>

                {/* Category Dropdown Filter */}
                <select
                  value={invCategoryFilter}
                  onChange={(e) => setInvCategoryFilter(e.target.value)}
                  style={{
                    background: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '10px',
                    padding: '0.45rem 0.85rem',
                    color: 'var(--text-main)',
                    fontSize: '0.8rem',
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

              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Showing <strong style={{ color: 'var(--text-main)' }}>{searchedInventory.length}</strong> items
              </div>
            </div>

            {/* Inventory Cost Table */}
            <div
              style={{
                border: '1px solid var(--border-subtle)',
                borderRadius: '12px',
                overflowX: 'auto',
                background: 'var(--bg-tertiary)',
              }}
            >
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1.5px solid var(--border-subtle)' }}>
                    <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 700, color: 'var(--text-muted)' }}>#</th>
                    <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 700, color: 'var(--text-muted)' }}>Ingredient / Item</th>
                    <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 700, color: 'var(--text-muted)' }}>Category</th>
                    <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 700, color: 'var(--text-muted)' }}>Supplier</th>
                    <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 700, color: 'var(--text-muted)' }}>Current Stock</th>
                    <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 700, color: 'var(--text-muted)' }}>Min Threshold</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: 'var(--text-muted)' }}>Unit Cost (₹)</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: 'var(--text-muted)' }}>Total Valuation (₹)</th>
                    <th style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 700, color: 'var(--text-muted)', minWidth: '130px', whiteSpace: 'nowrap' }}>Stock Status</th>
                  </tr>
                </thead>
                <tbody>
                  {searchedInventory.length === 0 ? (
                    <tr>
                      <td colSpan={9} style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                        No inventory ingredients found matching the filter.
                      </td>
                    </tr>
                  ) : (
                    searchedInventory.map((item, idx) => {
                      const stock = Number(item.stock ?? 0);
                      const mrp = Number(item.mrp ?? item.unitCost ?? 0);
                      const totalCost = stock > 0 && mrp > 0 ? stock * mrp : 0;
                      const min = Number(item.minThreshold ?? 0);
                      const isOut = stock <= 0;
                      const isLow = !isOut && stock <= min;

                      return (
                        <tr
                          key={item.id || idx}
                          style={{
                            borderBottom: '1px solid var(--border-subtle)',
                            background: idx % 2 === 0 ? 'transparent' : 'rgba(255, 255, 255, 0.02)',
                          }}
                        >
                          <td style={{ padding: '8px 12px', color: 'var(--text-dim)', fontSize: '0.75rem' }}>{idx + 1}</td>
                          <td style={{ padding: '8px 12px', fontWeight: 700, color: 'var(--text-main)' }}>
                            {item.name || 'Unnamed Ingredient'}
                          </td>
                          <td style={{ padding: '8px 12px', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                            {item.category || 'General'}
                          </td>
                          <td style={{ padding: '8px 12px', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                            {item.supplier || 'Local Supplier'}
                          </td>
                          <td style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 700, color: isOut ? '#ef4444' : isLow ? '#f59e0b' : 'var(--text-main)' }}>
                            {stock} {item.unit || ''}
                          </td>
                          <td style={{ padding: '8px 12px', textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.75rem' }}>
                            {min} {item.unit || ''}
                          </td>
                          <td style={{ padding: '8px 12px', textAlign: 'right', color: 'var(--text-muted)', fontWeight: 600 }}>
                            {formatCurrency(mrp)}
                          </td>
                          <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 800, color: totalCost > 0 ? '#ef4444' : 'var(--text-dim)' }}>
                            {formatCurrency(totalCost)}
                          </td>
                          <td style={{ padding: '8px 14px', textAlign: 'center', minWidth: '130px', whiteSpace: 'nowrap' }}>
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px',
                                width: '116px',
                                minWidth: '116px',
                                height: '28px',
                                boxSizing: 'border-box',
                                borderRadius: '999px',
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                whiteSpace: 'nowrap',
                                letterSpacing: '0.01em',
                                flexShrink: 0,
                                background: isOut
                                  ? 'rgba(239, 68, 68, 0.14)'
                                  : isLow
                                  ? 'rgba(245, 158, 11, 0.14)'
                                  : 'rgba(16, 185, 129, 0.14)',
                                color: isOut ? '#ef4444' : isLow ? '#f59e0b' : '#10b981',
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
                                  width: '6px',
                                  height: '6px',
                                  borderRadius: '50%',
                                  background: isOut ? '#ef4444' : isLow ? '#f59e0b' : '#10b981',
                                  boxShadow: `0 0 6px ${isOut ? '#ef4444' : isLow ? '#f59e0b' : '#10b981'}`,
                                  flexShrink: 0,
                                }}
                              />
                              {isOut ? 'Out of Stock' : isLow ? 'Low Stock' : 'In Stock'}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                  {totalDiscount > 0 && (
                    <tr style={{ background: 'rgba(245, 158, 11, 0.05)', borderTop: '1px dashed var(--border-subtle)' }}>
                      <td style={{ padding: '8px 12px', color: 'var(--text-dim)' }}>—</td>
                      <td style={{ padding: '8px 12px', fontWeight: 700, color: '#f59e0b' }}>Bill Discounts (Promotions)</td>
                      <td style={{ padding: '8px 12px', color: 'var(--text-muted)' }}>Financial Deduction</td>
                      <td style={{ padding: '8px 12px', color: 'var(--text-muted)' }}>Restaurant Operations</td>
                      <td colSpan={3} style={{ padding: '8px 12px', color: 'var(--text-dim)', fontSize: '0.74rem' }}>Discounts given to dining customers</td>
                      <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 800, color: '#f59e0b' }}>
                        {formatCurrency(totalDiscount)}
                      </td>
                      <td style={{ padding: '8px 14px', textAlign: 'center', minWidth: '130px', whiteSpace: 'nowrap' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                            width: '116px',
                            minWidth: '116px',
                            height: '28px',
                            boxSizing: 'border-box',
                            borderRadius: '999px',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            whiteSpace: 'nowrap',
                            letterSpacing: '0.01em',
                            background: 'rgba(245, 158, 11, 0.14)',
                            color: '#f59e0b',
                            border: '1px solid rgba(245, 158, 11, 0.35)',
                          }}
                        >
                          <span
                            style={{
                              width: '6px',
                              height: '6px',
                              borderRadius: '50%',
                              background: '#f59e0b',
                              boxShadow: '0 0 6px #f59e0b',
                              flexShrink: 0,
                            }}
                          />
                          Deduction
                        </span>
                      </td>
                    </tr>
                  )}
                </tbody>
                <tfoot>
                  <tr style={{ background: 'var(--bg-secondary)', borderTop: '2px solid var(--border-subtle)' }}>
                    <td colSpan={7} style={{ padding: '10px 12px', fontWeight: 800, color: 'var(--text-main)' }}>
                      TOTAL EXPENDITURE VALUATION (INVENTORY + DISCOUNTS)
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 900, color: '#ef4444', fontSize: '0.95rem' }}>
                      {formatCurrency(plExpenditure)}
                    </td>
                    <td style={{ padding: '10px 12px' }} />
                  </tr>
                </tfoot>
              </table>
            </div>
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
                <th style={{ border: "1px solid #cbd5e1", padding: "6px 8px", textAlign: "left" }}>Total GST (5%)</th>
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
                  {formatCurrency(totalDiscount)}
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
                <tr>
                  <td style={{ border: "1px solid #cbd5e1", padding: "6px 8px", fontWeight: 600 }}>Card / POS Swipe</td>
                  <td style={{ border: "1px solid #cbd5e1", padding: "6px 8px", textAlign: "right", fontWeight: 700 }}>
                    {formatCurrency(paymentStats.card)}
                  </td>
                  <td style={{ border: "1px solid #cbd5e1", padding: "6px 8px", textAlign: "right" }}>{cardPercent}%</td>
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
