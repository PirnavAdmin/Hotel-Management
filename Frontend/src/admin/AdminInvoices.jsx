import React, { useEffect, useMemo, useRef, useState } from "react";
import { useDialogAccessibility } from "../utils/useDialogAccessibility";
import {
  FileText,
  Search,
  Calendar,
  Eye,
  Save,
  X,
  Smartphone,
  Banknote,
  CreditCard,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  ShoppingBag,
  Printer,
  Pencil,
  AlertCircle,
  Download,
} from "lucide-react";
import {
  buildDayWiseBreakdown,
  buildInvoicesCsv,
  computeFinancialSummary,
  getInvoiceStatusCategory,
} from "../utils/invoiceFinancials";
import { SearchableSelect } from "../common/SearchableSelect";
import { formatCurrency } from "../utils/formatCurrency";
import { ReceiptModal } from "../user/ReceiptModal";
import { SkeletonDashboard, SkeletonTable } from "../common/Skeletons";
import {
  getInvoiceCreationTimestamp,
  normalizePaymentMethod,
  parseOrderToYMD,
  sortInvoicesByCreationTime,
  isSelfServiceOrder,
  isTakeawayOrder,
  isDineInOrder,
} from "../utils/orderDedupe";
import { requestInvoiceManagementRecords } from "../utils/liveInvoiceData";
import "./AdminInvoices.css";

// ============================================================
// Timezone-safe Local Date Helpers (YYYY-MM-DD / YYYY-MM)
// ============================================================
const localDateInputValue = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const shiftLocalYmd = (ymd, deltaDays) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(ymd || ""))) return localDateInputValue();
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(y, m - 1, d + deltaDays);
  return localDateInputValue(dt);
};

const getMondayToSundayRange = (ymd) => {
  const base = /^\d{4}-\d{2}-\d{2}$/.test(String(ymd || ""))
    ? new Date(`${ymd}T00:00:00`)
    : new Date();
  const start = new Date(base.getFullYear(), base.getMonth(), base.getDate());
  const daysSinceMonday = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - daysSinceMonday);
  const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6);
  return { from: localDateInputValue(start), to: localDateInputValue(end) };
};

const shiftWeekRange = (weekRange, deltaWeeks) => {
  const nextFrom = shiftLocalYmd(weekRange?.from || localDateInputValue(), deltaWeeks * 7);
  return getMondayToSundayRange(nextFrom);
};

const shiftYearMonth = (ym, deltaMonths) => {
  const match = String(ym || "").match(/^(\d{4})-(\d{2})$/);
  const base = match ? new Date(Number(match[1]), Number(match[2]) - 1 + deltaMonths, 1) : new Date();
  return `${base.getFullYear()}-${String(base.getMonth() + 1).padStart(2, "0")}`;
};

const formatReadableDate = (ymd) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(ymd || ""))) return "—";
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-IN", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatReadableMonth = (ym) => {
  const match = String(ym || "").match(/^(\d{4})-(\d{2})$/);
  if (!match) return "—";
  return new Date(Number(match[1]), Number(match[2]) - 1, 1).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });
};

// ============================================================
// Invoice Field & Status Helpers (Backend-Authoritative Only)
// ============================================================
const invoiceDateKey = (order) => parseOrderToYMD(order);

const invoiceNumberLabel = (order) => {
  const actualNumber =
    order?.invoiceNumber ?? order?.InvoiceNumber ?? order?.invoiceNo ?? order?.InvoiceNo;
  return actualNumber != null && String(actualNumber).trim()
    ? String(actualNumber).trim()
    : "Invoice Number Pending";
};

const getInvoicePaymentMethod = (order) => {
  const latestPayment = Array.isArray(order?.payments)
    ? order.payments[order.payments.length - 1]
    : null;
  return (
    order?.paymentMethod ||
    order?.PaymentMethod ||
    order?.paymentMode ||
    order?.PaymentMode ||
    order?.paymentType ||
    latestPayment?.paymentMode ||
    latestPayment?.PaymentMode ||
    latestPayment?.mode ||
    latestPayment?.Mode ||
    ""
  );
};

const getInvoicePaymentModes = (order) => {
  const paymentModes = Array.isArray(order?.payments)
    ? [
        ...new Set(
          order.payments
            .filter((p) => Number(p?.amount ?? p?.Amount ?? 0) > 0)
            .map((p) => normalizePaymentMethod(p))
        ),
      ]
    : [];
  if (paymentModes.length) return paymentModes;
  const method = getInvoicePaymentMethod(order);
  return method ? [normalizePaymentMethod(method)] : [];
};

const getNormalizedStatusKey = (order) => getInvoiceStatusCategory(order);

const getStatusDisplayLabel = (order) => {
  const raw = String(order?.backendStatus ?? order?.status ?? order?.Status ?? "").trim();
  if (raw) return raw.toUpperCase();
  const key = getNormalizedStatusKey(order);
  return key.toUpperCase();
};

const invoiceDisplayDate = (order) => {
  const rawDate =
    order?.invoiceCreatedAt || order?.createdAt || order?.date || order?.settledAt;
  if (rawDate) {
    let s = String(rawDate).trim();
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/i.test(s)) {
      if (!s.endsWith("Z") && !/[+-]\d{2}:?\d{2}$/.test(s)) s += "Z";
      const d = new Date(s);
      if (!Number.isNaN(d.getTime())) {
        return d.toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" });
      }
    }
  }
  const key = invoiceDateKey(order);
  if (!key) return "—";
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const formatInvoiceTime = (value) => {
  if (!value) return "—";
  let isoStr = String(value).trim();
  if (!isoStr) return "—";
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/i.test(isoStr)) {
    if (!isoStr.endsWith("Z") && !/[+-]\d{2}:?\d{2}$/.test(isoStr)) isoStr += "Z";
  }
  const parsed = new Date(isoStr);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
  }
  return "—";
};

const getOrderTypeLabel = (order) => {
  if (isSelfServiceOrder(order)) return "Self Service";
  if (isTakeawayOrder(order)) return "Takeaway";
  if (isDineInOrder(order)) return "Dine-In";
  return "—";
};

export function AdminInvoices({
  invoiceFilter = null,
  restaurantName = "The Rustic Spin",
  restaurantSettings = {},
  onUpdateInvoiceDiscount = null,
}) {
  const [invoiceRecords, setInvoiceRecords] = useState([]);
  const [isLoadingInvoices, setIsLoadingInvoices] = useState(true);
  const [isRefreshingInvoices, setIsRefreshingInvoices] = useState(false);
  const [invoiceLoadError, setInvoiceLoadError] = useState("");

  // Date Range Selection State
  const [dateFilter, setDateFilter] = useState("daily"); // 'all' | 'daily' | 'weekly' | 'monthly' | 'custom'
  const [selectedDate, setSelectedDate] = useState(() => localDateInputValue());
  const [selectedWeek, setSelectedWeek] = useState(() =>
    getMondayToSundayRange(localDateInputValue())
  );
  const [selectedMonth, setSelectedMonth] = useState(() => localDateInputValue().slice(0, 7));
  const [customFromDraft, setCustomFromDraft] = useState(() => localDateInputValue());
  const [customToDraft, setCustomToDraft] = useState(() => localDateInputValue());
  const [appliedCustomRange, setAppliedCustomRange] = useState(() => ({
    from: localDateInputValue(),
    to: localDateInputValue(),
  }));
  const [customRangeError, setCustomRangeError] = useState("");

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [branchFilter, setBranchFilter] = useState("all");
  const [orderTypeFilter, setOrderTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");

  // Pagination & Sorting
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortField, setSortField] = useState("date");
  const [sortDirection, setSortDirection] = useState("desc");

  // Modals
  const [viewingInvoice, setViewingInvoice] = useState(null);
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [discountDraft, setDiscountDraft] = useState("0");
  const [editError, setEditError] = useState("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const detailDialogRef = useRef(null);
  const editDialogRef = useRef(null);
  useDialogAccessibility({
    isOpen: Boolean(viewingInvoice),
    onClose: () => setViewingInvoice(null),
    dialogRef: detailDialogRef,
  });
  useDialogAccessibility({
    isOpen: Boolean(editingInvoice),
    onClose: () => {
      if (!isSavingEdit) setEditingInvoice(null);
    },
    dialogRef: editDialogRef,
    closeOnEscape: !isSavingEdit,
  });

  const refreshInvoices = async () => {
    setIsLoadingInvoices(true);
    setIsRefreshingInvoices(true);
    setInvoiceLoadError("");
    try {
      const { records, error } = await requestInvoiceManagementRecords();
      setInvoiceRecords(records);
      setInvoiceLoadError(error);
    } catch (error) {
      setInvoiceLoadError(error?.message || "Live invoices could not be loaded.");
      setInvoiceRecords([]);
    } finally {
      setIsLoadingInvoices(false);
      setIsRefreshingInvoices(false);
    }
  };

  useEffect(() => {
    let active = true;
    let updateTimer = null;
    const fetchInvoices = () => {
      requestInvoiceManagementRecords()
        .then(({ records, error }) => {
          if (!active) return;
          setInvoiceRecords(records);
          setInvoiceLoadError(error);
        })
        .catch((error) => {
          if (!active) return;
          setInvoiceLoadError(error?.message || "Live invoices could not be loaded.");
          setInvoiceRecords([]);
        })
        .finally(() => {
          if (active) setIsLoadingInvoices(false);
        });
    };

    fetchInvoices();
    const handleUpdate = () => {
      if (!active) return;
      if (updateTimer) window.clearTimeout(updateTimer);
      updateTimer = window.setTimeout(fetchInvoices, 120);
    };

    window.addEventListener("avsr-invoices-updated", handleUpdate);
    return () => {
      active = false;
      if (updateTimer) window.clearTimeout(updateTimer);
      window.removeEventListener("avsr-invoices-updated", handleUpdate);
    };
  }, []);

  const allOrders = useMemo(
    () =>
      invoiceRecords.filter(
        (order) => typeof invoiceFilter !== "function" || invoiceFilter(order)
      ),
    [invoiceRecords, invoiceFilter]
  );

  // Dynamically discover available branches and payment methods from actual backend records
  const availableBranches = useMemo(() => {
    const map = new Map();
    allOrders.forEach((o) => {
      if (o.branchId != null || o.branchName) {
        const key = String(o.branchId ?? o.branchName);
        const label = o.branchName ? String(o.branchName) : `Branch #${o.branchId}`;
        if (!map.has(key)) map.set(key, label);
      }
    });
    return Array.from(map.entries()).map(([id, label]) => ({ id, label }));
  }, [allOrders]);

  const availablePaymentModes = useMemo(() => {
    const set = new Set();
    allOrders.forEach((o) => {
      getInvoicePaymentModes(o).forEach((m) => {
        if (m && m !== "unknown") set.add(m);
      });
    });
    return Array.from(set).sort();
  }, [allOrders]);

  // Apply Date Filter + Search + All Facet Filters together
  const dateFilteredOrders = useMemo(() => {
    return allOrders.filter((order) => {
      const orderDate = invoiceDateKey(order);
      if (dateFilter === "all") return true;
      if (!orderDate) return false;
      if (dateFilter === "daily") return orderDate === selectedDate;
      if (dateFilter === "weekly") {
        return orderDate >= selectedWeek.from && orderDate <= selectedWeek.to;
      }
      if (dateFilter === "monthly") return orderDate.startsWith(selectedMonth);
      if (dateFilter === "custom") {
        return (
          (!appliedCustomRange.from || orderDate >= appliedCustomRange.from) &&
          (!appliedCustomRange.to || orderDate <= appliedCustomRange.to)
        );
      }
      return true;
    });
  }, [allOrders, dateFilter, selectedDate, selectedWeek, selectedMonth, appliedCustomRange]);

  const filteredOrders = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    const list = dateFilteredOrders.filter((order) => {
      if (query) {
        const invNum = invoiceNumberLabel(order).toLowerCase();
        const ordRef = String(
          order.orderNumber ?? order.orderId ?? order.OrderId ?? order.id ?? ""
        ).toLowerCase();
        const custName = String(order.customerName ?? "").toLowerCase();
        const custPhone = String(order.customerPhone ?? "").toLowerCase();
        const tbl = String(order.tableName ?? "").toLowerCase();
        if (
          !invNum.includes(query) &&
          !ordRef.includes(query) &&
          !custName.includes(query) &&
          !custPhone.includes(query) &&
          !tbl.includes(query)
        ) {
          return false;
        }
      }

      if (branchFilter !== "all") {
        const bKey = String(order.branchId ?? order.branchName ?? "");
        if (bKey !== branchFilter) return false;
      }

      if (orderTypeFilter !== "all") {
        if (orderTypeFilter === "dine_in" && !isDineInOrder(order)) return false;
        if (orderTypeFilter === "takeaway" && !isTakeawayOrder(order)) return false;
        if (orderTypeFilter === "self_service" && !isSelfServiceOrder(order)) return false;
      }

      if (statusFilter !== "all") {
        const sKey = getNormalizedStatusKey(order);
        if (sKey !== statusFilter) return false;
      }

      if (paymentFilter !== "all") {
        if (!getInvoicePaymentModes(order).includes(paymentFilter)) return false;
      }

      return true;
    });

    return sortInvoicesByCreationTime(list);
  }, [dateFilteredOrders, searchTerm, branchFilter, orderTypeFilter, statusFilter, paymentFilter]);

  // Summary Metrics (Strictly from actual backend fields; excludes void/cancelled/refunded from paid sales)
  const summary = useMemo(() => computeFinancialSummary(filteredOrders), [filteredOrders]);

  // Day-wise Breakdown for Weekly (Mon-Sun), Monthly (all days), and Custom ranges
  const dayWiseBreakdown = useMemo(
    () =>
      buildDayWiseBreakdown({
        orders: filteredOrders,
        dateFilter,
        selectedWeek,
        selectedMonth,
        appliedCustomRange,
        getDateKey: invoiceDateKey,
      }),
    [filteredOrders, dateFilter, selectedWeek, selectedMonth, appliedCustomRange]
  );

  const handleExportCsv = () => {
    if (!filteredOrders.length) return;
    const csv = buildInvoicesCsv(filteredOrders, {
      getInvoiceNumber: invoiceNumberLabel,
      getDateText: invoiceDisplayDate,
      getOrderType: getOrderTypeLabel,
      getStatusLabel: getStatusDisplayLabel,
    });
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `invoices-${dateFilter}-${localDateInputValue()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Sorting & Pagination
  const sortedOrders = useMemo(() => {
    const copy = [...filteredOrders];
    copy.sort((a, b) => {
      if (sortField === "invoiceNo") {
        const cmp = invoiceNumberLabel(a).localeCompare(invoiceNumberLabel(b), undefined, {
          numeric: true,
        });
        return sortDirection === "asc" ? cmp : -cmp;
      }
      if (sortField === "amount") {
        const totA = Number(a.totalAmount ?? a.grandTotal ?? 0) || 0;
        const totB = Number(b.totalAmount ?? b.grandTotal ?? 0) || 0;
        return sortDirection === "asc" ? totA - totB : totB - totA;
      }
      const timeA = getInvoiceCreationTimestamp(a);
      const timeB = getInvoiceCreationTimestamp(b);
      return sortDirection === "asc" ? timeA - timeB : timeB - timeA;
    });
    return copy;
  }, [filteredOrders, sortField, sortDirection]);

  const pageCount = Math.max(1, Math.ceil(sortedOrders.length / itemsPerPage));
  const visiblePage = Math.min(currentPage, pageCount);
  const pageStart = (visiblePage - 1) * itemsPerPage;
  const paginatedOrders = sortedOrders.slice(pageStart, pageStart + itemsPerPage);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
    setCurrentPage(1);
  };

  const handleApplyCustomRange = () => {
    if (!customFromDraft || !customToDraft) {
      setCustomRangeError("Both Start Date and End Date are required.");
      return;
    }
    if (customFromDraft > customToDraft) {
      setCustomRangeError("Start Date cannot be after End Date.");
      return;
    }
    setCustomRangeError("");
    setAppliedCustomRange({ from: customFromDraft, to: customToDraft });
    setCurrentPage(1);
  };

  const openDiscountEditor = (order) => {
    setEditingInvoice(order);
    setDiscountDraft(String(Number(order.discountPercent) || 0));
    setEditError("");
  };

  const saveInvoiceDiscount = async (event) => {
    event.preventDefault();
    const discountPercent = Number(discountDraft);
    if (!Number.isFinite(discountPercent) || discountPercent < 0 || discountPercent > 100) {
      setEditError("Enter a discount between 0% and 100%.");
      return;
    }
    if (!onUpdateInvoiceDiscount) {
      setEditError("Invoice editing is not available.");
      return;
    }
    setIsSavingEdit(true);
    setEditError("");
    try {
      await onUpdateInvoiceDiscount(editingInvoice?.id, discountPercent, editingInvoice);
      setEditingInvoice(null);
      await refreshInvoices();
    } catch (error) {
      setEditError(error?.message || "Could not update invoice discount.");
    } finally {
      setIsSavingEdit(false);
    }
  };

  return (
    <div className="admin-inv-root">
      <div className="admin-inv-shell no-print">
        {/* Top Header */}
        <div className="admin-inv-header">
          <div className="admin-inv-title-group">
            <div className="admin-inv-icon-box">
              <FileText size={22} color="#ffffff" />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flexWrap: "wrap" }}>
                <h2 style={{ fontSize: "1.3rem", fontWeight: 800, color: "var(--text-main)", margin: 0 }}>
                  Admin Invoice Management
                </h2>
                <span className="admin-inv-range-label">
                  {filteredOrders.length} {filteredOrders.length === 1 ? "invoice" : "invoices"}
                </span>
              </div>
              <p style={{ fontSize: "0.78rem", color: "var(--text-dim)", margin: "3px 0 0 0" }}>
                Authoritative backend invoice records, date-wise reports, and payment statuses
              </p>
            </div>
          </div>

          <div className="admin-inv-header-actions">
            <div className="admin-inv-search-wrap">
              <Search
                size={15}
                color="var(--text-dim)"
                style={{ position: "absolute", left: "12px", pointerEvents: "none" }}
              />
              <input
                type="text"
                className="admin-inv-search-input"
                aria-label="Search invoices"
                placeholder="Search invoice #, order #, customer..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>

            <button
              type="button"
              className="admin-inv-btn-neutral"
              onClick={handleExportCsv}
              disabled={isLoadingInvoices || filteredOrders.length === 0}
              aria-label="Export filtered invoices to CSV"
            >
              <Download size={14} />
              <span>Export CSV</span>
            </button>

            <button
              type="button"
              className="admin-inv-btn-neutral"
              onClick={refreshInvoices}
              disabled={isLoadingInvoices}
              aria-label="Refresh live invoices"
            >
              <RefreshCw
                size={14}
                style={{ animation: isRefreshingInvoices ? "spin 1s linear infinite" : "none" }}
              />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Date Range Selection & Navigation */}
        <div className="admin-inv-date-bar">
          <div className="admin-inv-date-modes">
            <div className="admin-inv-mode-pills" role="tablist" aria-label="Invoice report date period">
              {[
                { id: "daily", label: "Daily" },
                { id: "weekly", label: "Weekly" },
                { id: "monthly", label: "Monthly" },
                { id: "custom", label: "Custom Date Range" },
                { id: "all", label: "All Dates" },
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  role="tab"
                  aria-selected={dateFilter === m.id}
                  className={`admin-inv-mode-pill ${dateFilter === m.id ? "is-active" : ""}`}
                  onClick={() => {
                    setDateFilter(m.id);
                    setCustomRangeError("");
                    setCurrentPage(1);
                  }}
                >
                  {m.label}
                </button>
              ))}
            </div>

            <div className="admin-inv-range-label">
              {dateFilter === "daily" && formatReadableDate(selectedDate)}
              {dateFilter === "weekly" &&
                `${formatReadableDate(selectedWeek.from)} – ${formatReadableDate(selectedWeek.to)}`}
              {dateFilter === "monthly" && formatReadableMonth(selectedMonth)}
              {dateFilter === "custom" &&
                `${formatReadableDate(appliedCustomRange.from)} – ${formatReadableDate(appliedCustomRange.to)}`}
              {dateFilter === "all" && "All Available Backend Dates"}
            </div>
          </div>

          {dateFilter === "daily" && (
            <div className="admin-inv-date-nav">
              <button
                type="button"
                className="admin-inv-btn-neutral"
                onClick={() => {
                  setSelectedDate((prev) => shiftLocalYmd(prev, -1));
                  setCurrentPage(1);
                }}
              >
                <ChevronLeft size={14} />
                <span>Previous Day</span>
              </button>
              <input
                type="date"
                aria-label="Select daily date"
                className="admin-inv-date-input"
                value={selectedDate}
                onChange={(e) => {
                  if (e.target.value) {
                    setSelectedDate(e.target.value);
                    setCurrentPage(1);
                  }
                }}
              />
              <button
                type="button"
                className="admin-inv-btn-neutral"
                onClick={() => {
                  setSelectedDate((prev) => shiftLocalYmd(prev, 1));
                  setCurrentPage(1);
                }}
              >
                <span>Next Day</span>
                <ChevronRight size={14} />
              </button>
              <button
                type="button"
                className="admin-inv-btn-primary"
                onClick={() => {
                  setSelectedDate(localDateInputValue());
                  setCurrentPage(1);
                }}
              >
                <Calendar size={14} />
                <span>Today</span>
              </button>
            </div>
          )}

          {dateFilter === "weekly" && (
            <div className="admin-inv-date-nav">
              <button
                type="button"
                className="admin-inv-btn-neutral"
                onClick={() => {
                  setSelectedWeek((prev) => shiftWeekRange(prev, -1));
                  setCurrentPage(1);
                }}
              >
                <ChevronLeft size={14} />
                <span>Previous Week</span>
              </button>
              <input
                type="date"
                aria-label="Choose week"
                className="admin-inv-date-input"
                value={selectedWeek.from}
                onChange={(e) => {
                  if (e.target.value) {
                    setSelectedWeek(getMondayToSundayRange(e.target.value));
                    setCurrentPage(1);
                  }
                }}
              />
              <button
                type="button"
                className="admin-inv-btn-neutral"
                onClick={() => {
                  setSelectedWeek((prev) => shiftWeekRange(prev, 1));
                  setCurrentPage(1);
                }}
              >
                <span>Next Week</span>
                <ChevronRight size={14} />
              </button>
            </div>
          )}

          {dateFilter === "monthly" && (
            <div className="admin-inv-date-nav">
              <button
                type="button"
                className="admin-inv-btn-neutral"
                onClick={() => {
                  setSelectedMonth((prev) => shiftYearMonth(prev, -1));
                  setCurrentPage(1);
                }}
              >
                <ChevronLeft size={14} />
                <span>Previous Month</span>
              </button>
              <input
                type="month"
                aria-label="Select month"
                className="admin-inv-date-input"
                value={selectedMonth}
                onChange={(e) => {
                  if (e.target.value) {
                    setSelectedMonth(e.target.value);
                    setCurrentPage(1);
                  }
                }}
              />
              <button
                type="button"
                className="admin-inv-btn-neutral"
                onClick={() => {
                  setSelectedMonth((prev) => shiftYearMonth(prev, 1));
                  setCurrentPage(1);
                }}
              >
                <span>Next Month</span>
                <ChevronRight size={14} />
              </button>
            </div>
          )}

          {dateFilter === "custom" && (
            <div className="admin-inv-date-nav">
              <label style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.76rem", fontWeight: 700, color: "var(--text-muted)" }}>
                Start Date
                <input
                  type="date"
                  aria-label="Start Date"
                  className="admin-inv-date-input"
                  value={customFromDraft}
                  onChange={(e) => {
                    setCustomFromDraft(e.target.value);
                    setCustomRangeError("");
                  }}
                />
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.76rem", fontWeight: 700, color: "var(--text-muted)" }}>
                End Date
                <input
                  type="date"
                  aria-label="End Date"
                  className="admin-inv-date-input"
                  value={customToDraft}
                  onChange={(e) => {
                    setCustomToDraft(e.target.value);
                    setCustomRangeError("");
                  }}
                />
              </label>
              <button
                type="button"
                className="admin-inv-btn-primary"
                onClick={handleApplyCustomRange}
              >
                Apply Filter
              </button>
              {customRangeError && (
                <span role="alert" style={{ color: "var(--danger)", fontSize: "0.76rem", fontWeight: 700 }}>
                  {customRangeError}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Error & Loading States */}
        {invoiceLoadError && (
          <div
            role="alert"
            style={{
              padding: "0.75rem 0.95rem",
              borderRadius: "10px",
              border: "1px solid rgba(239, 68, 68, 0.35)",
              background: "rgba(239, 68, 68, 0.08)",
              color: "var(--danger)",
              fontSize: "0.8rem",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            <AlertCircle size={16} />
            <span>{invoiceLoadError}</span>
          </div>
        )}

        {isLoadingInvoices && invoiceRecords.length === 0 && (
          <div>
            <SkeletonDashboard cards={4} />
            <SkeletonTable rows={5} columns={7} />
          </div>
        )}

        {/* Summary Cards (Backend Invoice Totals Only; Void/Cancelled Excluded) */}
        <div className="admin-inv-summary-grid">
          <div className="admin-inv-summary-card">
            <div className="admin-inv-summary-label">Total Invoices</div>
            <div className="admin-inv-summary-value">{summary.validCount}</div>
            <div className="admin-inv-summary-sub">
              {summary.excludedCount > 0
                ? `${summary.excludedCount} void/cancelled/refunded excluded`
                : "Active backend invoices"}
            </div>
          </div>

          <div className="admin-inv-summary-card">
            <div className="admin-inv-summary-label">Gross Sales</div>
            <div className="admin-inv-summary-value">{formatCurrency(summary.grossSales)}</div>
            <div className="admin-inv-summary-sub">Sum of backend subtotals</div>
          </div>

          <div className="admin-inv-summary-card">
            <div className="admin-inv-summary-label">Discounts</div>
            <div className="admin-inv-summary-value">{formatCurrency(summary.totalDiscounts)}</div>
            <div className="admin-inv-summary-sub">Backend discount amounts</div>
          </div>

          <div className="admin-inv-summary-card">
            <div className="admin-inv-summary-label">Service Charges</div>
            <div className="admin-inv-summary-value">{formatCurrency(summary.totalServiceCharges)}</div>
            <div className="admin-inv-summary-sub">Backend service charges</div>
          </div>

          <div className="admin-inv-summary-card">
            <div className="admin-inv-summary-label">GST / Tax</div>
            <div className="admin-inv-summary-value">{formatCurrency(summary.totalTax)}</div>
            <div className="admin-inv-summary-sub">TaxAmount / CGST+SGST</div>
          </div>

          <div className="admin-inv-summary-card">
            <div className="admin-inv-summary-label">Net Sales</div>
            <div className="admin-inv-summary-value" style={{ color: "var(--accent-amber-light)" }}>
              {formatCurrency(summary.netSales)}
            </div>
            <div className="admin-inv-summary-sub">Excludes void/cancelled/refunded</div>
          </div>

          <div className="admin-inv-summary-card">
            <div className="admin-inv-summary-label">Paid Amount</div>
            <div className="admin-inv-summary-value" style={{ color: "var(--success, #10b981)" }}>
              {formatCurrency(summary.totalPaid)}
            </div>
            <div className="admin-inv-summary-sub">Collected payments</div>
          </div>

          <div className="admin-inv-summary-card">
            <div className="admin-inv-summary-label">Pending Amount</div>
            <div
              className="admin-inv-summary-value"
              style={{ color: summary.pendingAmount > 0 ? "var(--danger, #ef4444)" : "var(--text-main)" }}
            >
              {formatCurrency(summary.pendingAmount)}
            </div>
            <div className="admin-inv-summary-sub">Unpaid / partial due</div>
          </div>

          <div className="admin-inv-summary-card">
            <div className="admin-inv-summary-label">Cancelled Amount</div>
            <div className="admin-inv-summary-value">{formatCurrency(summary.cancelledAmount)}</div>
            <div className="admin-inv-summary-sub">{summary.cancelledCount} cancelled</div>
          </div>

          <div className="admin-inv-summary-card">
            <div className="admin-inv-summary-label">Refunded Amount</div>
            <div className="admin-inv-summary-value">{formatCurrency(summary.refundedAmount)}</div>
            <div className="admin-inv-summary-sub">{summary.refundedCount} refunded</div>
          </div>
        </div>

        {(summary.paymentBreakdown.hasData || summary.orderTypeBreakdown.hasData) && (
          <div className="admin-inv-summary-grid" style={{ marginTop: "-0.25rem" }}>
            {summary.paymentBreakdown.hasData && (
              <div className="admin-inv-summary-card">
                <div className="admin-inv-summary-label">Payment Method Breakdown</div>
                <div style={{ display: "flex", gap: "0.85rem", flexWrap: "wrap", fontSize: "0.78rem", marginTop: "0.25rem" }}>
                  <span>Cash: <strong>{formatCurrency(summary.paymentBreakdown.cash)}</strong></span>
                  <span>UPI: <strong>{formatCurrency(summary.paymentBreakdown.upi)}</strong></span>
                  <span>Card: <strong>{formatCurrency(summary.paymentBreakdown.card)}</strong></span>
                </div>
              </div>
            )}
            {summary.orderTypeBreakdown.hasData && (
              <div className="admin-inv-summary-card">
                <div className="admin-inv-summary-label">Order Type Breakdown</div>
                <div style={{ display: "flex", gap: "0.85rem", flexWrap: "wrap", fontSize: "0.78rem", marginTop: "0.25rem" }}>
                  <span>Dine-In ({summary.orderTypeBreakdown.dineIn.count}): <strong>{formatCurrency(summary.orderTypeBreakdown.dineIn.netSales)}</strong></span>
                  <span>Takeaway ({summary.orderTypeBreakdown.takeaway.count}): <strong>{formatCurrency(summary.orderTypeBreakdown.takeaway.netSales)}</strong></span>
                  <span>Self-Service ({summary.orderTypeBreakdown.selfService.count}): <strong>{formatCurrency(summary.orderTypeBreakdown.selfService.netSales)}</strong></span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Facet Filters */}
        <div className="admin-inv-filter-bar">
          {availableBranches.length > 0 && (
            <SearchableSelect
              aria-label="Filter by Branch"
              className="admin-inv-select"
              value={branchFilter}
              onChange={(e) => {
                setBranchFilter(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="all">All Branches</option>
              {availableBranches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.label}
                </option>
              ))}
            </SearchableSelect>
          )}

          <SearchableSelect
            aria-label="Filter by Order Type"
            className="admin-inv-select"
            value={orderTypeFilter}
            onChange={(e) => {
              setOrderTypeFilter(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="all">All Order Types</option>
            <option value="dine_in">Dine-In</option>
            <option value="takeaway">Takeaway</option>
            <option value="self_service">Self Service</option>
          </SearchableSelect>

          <SearchableSelect
            aria-label="Filter by Payment Status"
            className="admin-inv-select"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="all">All Invoice Statuses</option>
            <option value="paid">Paid</option>
            <option value="partial">Partial</option>
            <option value="unpaid">Unpaid</option>
            <option value="void">Void</option>
            <option value="cancelled">Cancelled</option>
            <option value="refunded">Refunded</option>
          </SearchableSelect>

          <SearchableSelect
            aria-label="Filter by Payment Method"
            className="admin-inv-select"
            value={paymentFilter}
            onChange={(e) => {
              setPaymentFilter(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="all">All Payment Methods</option>
            {availablePaymentModes.map((mode) => (
              <option key={mode} value={mode}>
                {mode.toUpperCase()}
              </option>
            ))}
          </SearchableSelect>

          {(searchTerm || branchFilter !== "all" || orderTypeFilter !== "all" || statusFilter !== "all" || paymentFilter !== "all") && (
            <button
              type="button"
              className="admin-inv-btn-neutral"
              onClick={() => {
                setSearchTerm("");
                setBranchFilter("all");
                setOrderTypeFilter("all");
                setStatusFilter("all");
                setPaymentFilter("all");
                setCurrentPage(1);
              }}
            >
              Reset Filters
            </button>
          )}
        </div>

        {/* Day-Wise Breakdown (Weekly Mon-Sun, Monthly 1..N, and Custom Range) */}
        {(dateFilter === "weekly" || dateFilter === "monthly" || dateFilter === "custom") && (
          <div className="admin-inv-breakdown-card">
            <div className="admin-inv-breakdown-title">
              <span>
                Day-Wise Breakdown (
                {dateFilter === "weekly" ? "Weekly Mon–Sun" : dateFilter === "monthly" ? "Monthly" : "Custom Range"})
              </span>
              <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: 600 }}>
                Click any date to inspect that day&apos;s invoices
              </span>
            </div>

            {dayWiseBreakdown.length === 0 ? (
              <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", padding: "0.5rem 0" }}>
                No matching backend invoices found for this period.
              </div>
            ) : (
              <div className="admin-inv-table-wrap">
                <table className="admin-inv-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Invoices</th>
                      <th>Total Invoice Amount</th>
                      <th>Paid Amount</th>
                      <th>Pending Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dayWiseBreakdown.map((row) => (
                      <tr
                        key={row.dateKey}
                        className="admin-inv-breakdown-row"
                        tabIndex={0}
                        onClick={() => {
                          setDateFilter("daily");
                          setSelectedDate(row.dateKey);
                          setCurrentPage(1);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            setDateFilter("daily");
                            setSelectedDate(row.dateKey);
                            setCurrentPage(1);
                          }
                        }}
                        title={`View invoices for ${formatReadableDate(row.dateKey)}`}
                      >
                        <td style={{ fontWeight: 750, color: "var(--accent-amber-light)" }}>
                          {formatReadableDate(row.dateKey)}
                        </td>
                        <td>{row.count}</td>
                        <td style={{ fontWeight: 700 }}>{formatCurrency(row.totalAmount)}</td>
                        <td style={{ color: "var(--success, #10b981)", fontWeight: 700 }}>
                          {formatCurrency(row.paidAmount)}
                        </td>
                        <td style={{ color: row.pendingAmount > 0 ? "var(--danger)" : "var(--text-muted)" }}>
                          {formatCurrency(row.pendingAmount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Main Invoices Table */}
        <div className="admin-inv-table-wrap">
          <table className="admin-inv-table">
            <thead>
              <tr>
                <th
                  onClick={() => handleSort("invoiceNo")}
                  style={{ cursor: "pointer", userSelect: "none" }}
                >
                  Invoice Number {sortField === "invoiceNo" ? (sortDirection === "asc" ? "▲" : "▼") : "↕"}
                </th>
                <th
                  onClick={() => handleSort("date")}
                  style={{ cursor: "pointer", userSelect: "none" }}
                >
                  Date &amp; Time {sortField === "date" ? (sortDirection === "asc" ? "▲" : "▼") : "↕"}
                </th>
                <th>Order No / ID</th>
                <th>Customer</th>
                <th>Order Type</th>
                <th>Subtotal</th>
                <th>Discount</th>
                <th>Tax</th>
                <th
                  onClick={() => handleSort("amount")}
                  style={{ cursor: "pointer", userSelect: "none" }}
                >
                  Total Amount {sortField === "amount" ? (sortDirection === "asc" ? "▲" : "▼") : "↕"}
                </th>
                <th>Paid Amount</th>
                <th>Pending Amount</th>
                <th>Payment Method</th>
                <th>Status</th>
                <th style={{ textAlign: "center" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedOrders.length === 0 && !isLoadingInvoices ? (
                <tr>
                  <td colSpan={14} style={{ textAlign: "center", padding: "2rem 1rem", color: "var(--text-muted)" }}>
                    No invoices match the selected date range and filters.
                  </td>
                </tr>
              ) : (
                paginatedOrders.map((order, idx) => {
                  const paymentMethod = getInvoicePaymentMethod(order);
                  const paymentModes = getInvoicePaymentModes(order);
                  const paymentLabel = paymentModes.length
                    ? paymentModes.map((m) => m.toUpperCase()).join(" + ")
                    : paymentMethod
                      ? String(paymentMethod).trim()
                      : "—";
                  const sKey = getNormalizedStatusKey(order);
                  const statusLabel = getStatusDisplayLabel(order);
                  const orderRef =
                    order.orderNumber ?? order.orderId ?? order.OrderId ?? order.id ?? null;
                  const customerText = order.customerName || order.customerPhone || "—";

                  return (
                    <tr
                      key={order.invoiceId ?? order.InvoiceId ?? order.orderId ?? order.id ?? idx}
                    >
                      <td style={{ fontFamily: "monospace", fontWeight: 800 }}>
                        {invoiceNumberLabel(order)}
                      </td>
                      <td>
                        <div>{invoiceDisplayDate(order)}</div>
                        <div style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>
                          {formatInvoiceTime(order.invoiceCreatedAt || order.createdAt)}
                        </div>
                      </td>
                      <td>{orderRef != null ? `#${orderRef}` : "—"}</td>
                      <td>{customerText}</td>
                      <td>
                        {isSelfServiceOrder(order) ? (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", color: "var(--info)", fontWeight: 700 }}>
                            <Smartphone size={11} /> Self Service
                          </span>
                        ) : isTakeawayOrder(order) ? (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", color: "var(--accent-amber-light)", fontWeight: 700 }}>
                            <ShoppingBag size={11} /> Takeaway
                          </span>
                        ) : (
                          <span>{order.tableName || getOrderTypeLabel(order)}</span>
                        )}
                      </td>
                      <td>{order.subtotal != null ? formatCurrency(order.subtotal) : "—"}</td>
                      <td>{order.discountAmount != null ? formatCurrency(order.discountAmount) : "—"}</td>
                      <td>{order.taxAmount != null ? formatCurrency(order.taxAmount) : "—"}</td>
                      <td style={{ fontWeight: 800, color: "var(--accent-amber-light)" }}>
                        {formatCurrency(order.totalAmount ?? order.grandTotal ?? 0)}
                      </td>
                      <td style={{ color: "var(--success, #10b981)", fontWeight: 700 }}>
                        {formatCurrency(order.paidAmount ?? 0)}
                      </td>
                      <td style={{ color: (order.dueAmount ?? 0) > 0 ? "var(--danger)" : "var(--text-muted)" }}>
                        {formatCurrency(order.dueAmount ?? 0)}
                      </td>
                      <td>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                          {paymentModes[0] === "upi" ? (
                            <Smartphone size={11} />
                          ) : paymentModes[0] === "card" ? (
                            <CreditCard size={11} />
                          ) : paymentModes[0] === "cash" ? (
                            <Banknote size={11} />
                          ) : null}
                          {paymentLabel}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`admin-inv-status-pill ${
                            sKey === "paid"
                              ? "is-paid"
                              : sKey === "void"
                                ? "is-void"
                                : "is-pending"
                          }`}
                        >
                          {statusLabel}
                        </span>
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <div style={{ display: "inline-flex", gap: "0.35rem" }}>
                          <button
                            type="button"
                            className="admin-inv-btn-neutral"
                            style={{ height: "28px", padding: "0 8px", fontSize: "0.7rem" }}
                            onClick={() => setViewingInvoice(order)}
                          >
                            <Eye size={12} />
                            <span>View</span>
                          </button>
                          <button
                            type="button"
                            className="admin-inv-btn-neutral"
                            style={{ height: "28px", padding: "0 8px", fontSize: "0.7rem" }}
                            onClick={() => setSelectedReceipt(order)}
                          >
                            <Printer size={12} />
                            <span>Print</span>
                          </button>
                          <button
                            type="button"
                            className="admin-inv-btn-neutral"
                            style={{ height: "28px", padding: "0 8px", fontSize: "0.7rem" }}
                            onClick={() => setSelectedReceipt(order)}
                            title="Open receipt & download PDF"
                          >
                            <Download size={12} />
                            <span>PDF</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "0.75rem",
            fontSize: "0.76rem",
            color: "var(--text-muted)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span>
              Showing {sortedOrders.length === 0 ? 0 : pageStart + 1}–
              {Math.min(pageStart + itemsPerPage, sortedOrders.length)} of {sortedOrders.length}
            </span>
            <select
              aria-label="Rows per page"
              className="admin-inv-date-input"
              style={{ height: "28px" }}
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
            >
              {[6, 10, 20, 50].map((n) => (
                <option key={n} value={n}>
                  {n} / page
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
            <button
              type="button"
              className="admin-inv-btn-neutral"
              style={{ height: "28px", padding: "0 10px" }}
              disabled={visiblePage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            >
              Prev
            </button>
            <span style={{ fontWeight: 700, padding: "0 6px" }}>
              Page {visiblePage} / {pageCount}
            </span>
            <button
              type="button"
              className="admin-inv-btn-neutral"
              style={{ height: "28px", padding: "0 10px" }}
              disabled={visiblePage >= pageCount}
              onClick={() => setCurrentPage((p) => Math.min(pageCount, p + 1))}
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Invoice Detail Modal */}
      {viewingInvoice && (
        <div className="admin-inv-modal-overlay" role="dialog" aria-modal="true" aria-label="Invoice Details">
          <div ref={detailDialogRef} tabIndex={-1} className="admin-inv-detail-modal">
            <div className="admin-inv-detail-header">
              <div>
                <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 850 }}>
                  {invoiceNumberLabel(viewingInvoice)}
                </h3>
                <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "2px" }}>
                  Invoice ID: {viewingInvoice.invoiceId ?? "—"} • Order Ref:{" "}
                  {viewingInvoice.orderNumber ?? viewingInvoice.orderId ?? "—"}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewingInvoice(null)}
                aria-label="Close invoice details"
                style={{ border: 0, background: "transparent", color: "var(--text-muted)", cursor: "pointer" }}
              >
                <X size={20} />
              </button>
            </div>

            <div className="admin-inv-detail-body">
              <div className="admin-inv-detail-grid">
                <div>
                  <span style={{ color: "var(--text-muted)" }}>Date &amp; Time:</span>{" "}
                  <strong>
                    {invoiceDisplayDate(viewingInvoice)} •{" "}
                    {formatInvoiceTime(viewingInvoice.invoiceCreatedAt || viewingInvoice.createdAt)}
                  </strong>
                </div>
                <div>
                  <span style={{ color: "var(--text-muted)" }}>Order Type:</span>{" "}
                  <strong>{getOrderTypeLabel(viewingInvoice)}</strong>
                </div>
                <div>
                  <span style={{ color: "var(--text-muted)" }}>Customer:</span>{" "}
                  <strong>
                    {viewingInvoice.customerName || viewingInvoice.customerPhone
                      ? [viewingInvoice.customerName, viewingInvoice.customerPhone]
                          .filter(Boolean)
                          .join(" • ")
                      : "—"}
                  </strong>
                </div>
                <div>
                  <span style={{ color: "var(--text-muted)" }}>Status:</span>{" "}
                  <strong>{getStatusDisplayLabel(viewingInvoice)}</strong>
                </div>
              </div>

              {/* Items */}
              <div>
                <div style={{ fontSize: "0.76rem", fontWeight: 800, color: "var(--text-muted)", marginBottom: "0.4rem" }}>
                  Items ({Array.isArray(viewingInvoice.items) ? viewingInvoice.items.length : 0})
                </div>
                {Array.isArray(viewingInvoice.items) && viewingInvoice.items.length > 0 ? (
                  <div className="admin-inv-table-wrap">
                    <table className="admin-inv-table">
                      <thead>
                        <tr>
                          <th>Item</th>
                          <th>Qty</th>
                          <th>Rate</th>
                          <th style={{ textAlign: "right" }}>Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {viewingInvoice.items.map((item, idx) => (
                          <tr key={item.id ?? idx}>
                            <td>{item.name || item.dishName || "—"}</td>
                            <td>{item.quantity ?? 1}</td>
                            <td>{formatCurrency(item.price ?? 0)}</td>
                            <td style={{ textAlign: "right", fontWeight: 700 }}>
                              {formatCurrency(item.total ?? (Number(item.price || 0) * Number(item.quantity || 1)))}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div style={{ fontSize: "0.76rem", color: "var(--text-muted)" }}>
                    No item details returned by backend.
                  </div>
                )}
              </div>

              {/* Financial Breakdown */}
              <div className="admin-inv-detail-grid" style={{ gridTemplateColumns: "1fr" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--text-muted)" }}>Subtotal</span>
                  <strong>{formatCurrency(viewingInvoice.subtotal ?? 0)}</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--text-muted)" }}>Discount</span>
                  <strong>{formatCurrency(viewingInvoice.discountAmount ?? 0)}</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--text-muted)" }}>Tax / GST</span>
                  <strong>{formatCurrency(viewingInvoice.taxAmount ?? 0)}</strong>
                </div>
                {viewingInvoice.serviceChargeAmount != null && (
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "var(--text-muted)" }}>Service Charge</span>
                    <strong>{formatCurrency(viewingInvoice.serviceChargeAmount)}</strong>
                  </div>
                )}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    borderTop: "1px dashed var(--border-subtle)",
                    paddingTop: "0.4rem",
                    fontSize: "0.95rem",
                  }}
                >
                  <strong>Total Amount</strong>
                  <strong style={{ color: "var(--accent-amber-light)" }}>
                    {formatCurrency(viewingInvoice.totalAmount ?? viewingInvoice.grandTotal ?? 0)}
                  </strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--text-muted)" }}>Paid Amount</span>
                  <strong style={{ color: "var(--success, #10b981)" }}>
                    {formatCurrency(viewingInvoice.paidAmount ?? 0)}
                  </strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--text-muted)" }}>Pending Amount</span>
                  <strong style={{ color: (viewingInvoice.dueAmount ?? 0) > 0 ? "var(--danger)" : "var(--text-main)" }}>
                    {formatCurrency(viewingInvoice.dueAmount ?? 0)}
                  </strong>
                </div>
              </div>

              {/* Payment Records */}
              <div>
                <div style={{ fontSize: "0.76rem", fontWeight: 800, color: "var(--text-muted)", marginBottom: "0.4rem" }}>
                  Payment Records
                </div>
                {Array.isArray(viewingInvoice.payments) && viewingInvoice.payments.length > 0 ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                    {viewingInvoice.payments.map((p, idx) => (
                      <div
                        key={p.paymentId ?? idx}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: "0.45rem 0.65rem",
                          borderRadius: "8px",
                          background: "var(--bg-secondary)",
                          border: "1px solid var(--border-subtle)",
                          fontSize: "0.76rem",
                        }}
                      >
                        <div>
                          <strong>{String(p.paymentMode || p.paymentMethod || "—").toUpperCase()}</strong>
                          {p.transactionReference && (
                            <span style={{ color: "var(--text-muted)", marginLeft: "0.5rem" }}>
                              Ref: {p.transactionReference}
                            </span>
                          )}
                        </div>
                        <strong>{formatCurrency(p.amount ?? p.amountPaid ?? 0)}</strong>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ fontSize: "0.76rem", color: "var(--text-muted)" }}>
                    {getInvoicePaymentMethod(viewingInvoice)
                      ? `Method: ${String(getInvoicePaymentMethod(viewingInvoice)).toUpperCase()}`
                      : "No payment records returned."}
                  </div>
                )}
              </div>
            </div>

            <div className="admin-inv-detail-footer">
              {typeof onUpdateInvoiceDiscount === "function" && (
                <button
                  type="button"
                  className="admin-inv-btn-neutral"
                  onClick={() => {
                    const target = viewingInvoice;
                    setViewingInvoice(null);
                    openDiscountEditor(target);
                  }}
                >
                  <Pencil size={13} />
                  <span>Edit Discount</span>
                </button>
              )}
              <button
                type="button"
                className="admin-inv-btn-neutral"
                onClick={() => {
                  setSelectedReceipt(viewingInvoice);
                  setViewingInvoice(null);
                }}
              >
                <Printer size={13} />
                <span>Print Invoice</span>
              </button>
              <button
                type="button"
                className="admin-inv-btn-primary"
                onClick={() => setViewingInvoice(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Official Receipt / Print Modal */}
      {selectedReceipt && (
        <ReceiptModal
          table={selectedReceipt}
          restaurantSettings={
            restaurantSettings?.restaurantName
              ? restaurantSettings
              : { ...restaurantSettings, restaurantName }
          }
          onClose={() => setSelectedReceipt(null)}
        />
      )}

      {/* Edit Invoice Discount Modal */}
      {editingInvoice && (
        <div className="admin-inv-modal-overlay" role="dialog" aria-modal="true" aria-label="Edit invoice discount">
          <form
            ref={editDialogRef}
            tabIndex={-1}
            onSubmit={saveInvoiceDiscount}
            style={{
              width: "100%",
              maxWidth: "400px",
              padding: "1.4rem",
              borderRadius: "14px",
              border: "1px solid var(--border-card)",
              background: "var(--bg-card)",
              color: "var(--text-main)",
              boxShadow: "0 20px 45px rgba(0,0,0,0.45)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <div>
                <h3 style={{ margin: 0, fontSize: "1.05rem" }}>Edit invoice discount</h3>
                <div style={{ marginTop: "0.25rem", color: "var(--text-muted)", fontSize: "0.78rem" }}>
                  {invoiceNumberLabel(editingInvoice)}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingInvoice(null)}
                aria-label="Close edit discount"
                style={{ border: 0, background: "transparent", color: "var(--text-muted)", cursor: "pointer" }}
              >
                <X size={18} />
              </button>
            </div>
            <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, marginBottom: "0.4rem" }}>
              Discount percentage
            </label>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <input
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={discountDraft}
                onChange={(event) => setDiscountDraft(event.target.value)}
                style={{ width: "100%", padding: "0.7rem", borderRadius: "8px", border: "1px solid var(--border-card)", background: "var(--bg-secondary)", color: "var(--text-main)" }}
              />
              <span>%</span>
            </div>
            <p style={{ color: "var(--text-muted)", fontSize: "0.74rem", lineHeight: 1.5 }}>
              Saving updates the bill discount on the server and reloads the invoice history.
            </p>
            {editError && <div role="alert" style={{ color: "var(--danger)", fontSize: "0.78rem", marginBottom: "0.8rem" }}>{editError}</div>}
            <div style={{ display: "flex", gap: "0.6rem", marginTop: "1rem" }}>
              <button
                type="button"
                onClick={() => setEditingInvoice(null)}
                disabled={isSavingEdit}
                className="admin-inv-btn-neutral"
                style={{ flex: 1 }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSavingEdit}
                className="admin-inv-btn-primary"
                style={{ flex: 1 }}
              >
                <Save size={14} />
                <span>{isSavingEdit ? "Saving..." : "Save Discount"}</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
