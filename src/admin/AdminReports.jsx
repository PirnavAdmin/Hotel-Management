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
} from "lucide-react";
import { formatCurrency } from "../utils/formatCurrency";
import { apiGetOrderHistory } from "../api/orderApi";
import {
  dedupeOrders,
  sortOrdersBySettlementTime,
  normalizePaymentMethod,
  parseOrderToYMD,
  mergeSettledOrders,
} from '../utils/orderDedupe';

export function AdminReports({ pastOrders = [], menuItems = [], restaurantSettings = {} }) {
  const now = new Date();
  const todayYMD = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const sevenDaysYMD = `${sevenDaysAgo.getFullYear()}-${String(sevenDaysAgo.getMonth() + 1).padStart(2, '0')}-${String(sevenDaysAgo.getDate()).padStart(2, '0')}`;
  const currentMonthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const monthStartYMD = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

  const [showAllDishes, setShowAllDishes] = useState(false);
  const [filterPeriod, setFilterPeriod] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isFetching, setIsFetching] = useState(false);
  const [fetchedOrders, setFetchedOrders] = useState(null);
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
    if (Array.isArray(inventory) && inventory.length > 0) return inventory;
    try {
      const saved = localStorage.getItem('gourmet_pos_inventory_v1');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    if (Array.isArray(inventory) && inventory.length > 0) {
      setLiveInventory(inventory);
    }
  }, [inventory]);

  useEffect(() => {
    const handleUpdate = (e) => {
      if (Array.isArray(e.detail)) setLiveInventory(e.detail);
    };
    const handleStorage = (e) => {
      if (e.key === 'gourmet_pos_inventory_v1' && e.newValue) {
        try {
          setLiveInventory(JSON.parse(e.newValue));
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

  const filteredOrders = useMemo(() => {
    return ordersData.filter((order) => {
      if (filterPeriod === "all") return true;

      const orderYMD = parseOrderToYMD(order);
      if (!orderYMD) return false;

      if (filterPeriod === 'today') {
        return orderYMD === todayYMD;
      }
      if (filterPeriod === 'week') {
        return orderYMD >= sevenDaysYMD && orderYMD <= todayYMD;
      }
      if (filterPeriod === 'month') {
        return orderYMD.startsWith(currentMonthPrefix);
      }
      if (filterPeriod === 'custom') {
        if (startDate && endDate) {
          const from = startDate <= endDate ? startDate : endDate;
          const to = startDate <= endDate ? endDate : startDate;
          return orderYMD >= from && orderYMD <= to;
        }
        if (startDate) {
          return orderYMD >= startDate;
        }
        if (endDate) {
          return orderYMD <= endDate;
        }
        return true;
      }
      return true;
    });
  }, [ordersData, filterPeriod, todayYMD, sevenDaysYMD, currentMonthPrefix, startDate, endDate]);

  const totalRevenue = filteredOrders.reduce(
    (sum, o) => sum + (Number(o.grandTotal ?? o.total ?? 0) || 0),
    0
  );

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
  const plExpenditure = totalInventoryCost + totalDiscount;
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
      const [response, invoiceResponse] = await Promise.all([
        apiGetOrderHistory(),
        apiGetInvoices(),
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
    } catch {
    } finally {
      setIsFetching(false);
    }
  };

  const getFilterPeriodLabel = () => {
    if (filterPeriod === "today") return `Today (${todayYMD})`;
    if (filterPeriod === "week") return `Last 7 Days (${sevenDaysYMD} to ${todayYMD})`;
    if (filterPeriod === "month") return `This Month (${currentMonthPrefix})`;
    if (filterPeriod === "all") return "All Time";
    if (filterPeriod === "custom") {
      if (startDate && endDate) {
        return startDate === endDate ? startDate : `${startDate} to ${endDate}`;
      }
      if (startDate) return `From ${startDate}`;
      if (endDate) return `Up to ${endDate}`;
    }
    return 'Custom Period';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem', width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
      
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
            onClick={() => window.print()}
            style={{
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.14)',
              borderRadius: '10px',
              padding: '0.5rem 1rem',
              color: '#ffffff',
              fontSize: '0.82rem',
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
            {/* Quick Period Buttons */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                background: "var(--bg-tertiary)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "10px",
                padding: "3px",
                gap: "3px",
              }}
            >
              {[
                { id: "today", label: "Today" },
                { id: "week", label: "7 Days" },
                { id: "month", label: "This Month" },
                { id: "all", label: "All Time" },
              ].map((p) => {
                const active = filterPeriod === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => {
                      setFilterPeriod(p.id);
                      if (p.id === "today") {
                        setStartDate(todayYMD);
                        setEndDate(todayYMD);
                      } else if (p.id === "week") {
                        setStartDate(sevenDaysYMD);
                        setEndDate(todayYMD);
                      } else if (p.id === "month") {
                        setStartDate(monthStartYMD);
                        setEndDate(todayYMD);
                      } else if (p.id === "all") {
                        setStartDate("");
                        setEndDate("");
                      }
                    }}
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
                    }}
                    onMouseEnter={(e) => {
                      if (!active) {
                        e.currentTarget.style.color = "var(--text-main)";
                        e.currentTarget.style.background = "rgba(245, 158, 11, 0.08)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!active) {
                        e.currentTarget.style.color = "var(--text-muted)";
                        e.currentTarget.style.background = "transparent";
                      }
                    }}
                  >
                    {p.label}
                  </button>
                );
              })}
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

        {/* 6 Metric Overview Cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
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
                  color: '#ffffff',
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
                    color: '#64748b',
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
                      color: "#fbbf24",
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
              Stock: <strong style={{ color: 'var(--text-main)' }}>{formatCurrency(totalInventoryCost)}</strong> ({inventoryItems.length} items) + Discounts: <strong style={{ color: 'var(--text-main)' }}>{formatCurrency(totalDiscount)}</strong>
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

          <div style={{ fontSize: '0.74rem', color: 'var(--text-dim)', paddingRight: '0.5rem' }}>
            Period: <strong style={{ color: 'var(--text-main)' }}>{getFilterPeriodLabel()}</strong>
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
                      Ingredient &amp; Raw Material Stock Valuation
                    </td>
                    <td style={{ padding: '8px 14px', color: 'var(--text-muted)', fontSize: '0.76rem' }}>
                      {inventoryItems.length} inventory items evaluated at unit cost
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
                      Total materials, ingredient costs &amp; discounts
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
          <div style={{ textAlign: "right", fontSize: "11px", color: "#334155" }}>
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
                <tr style={{ background: "#f8fafc", fontWeight: 800 }}>
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
