import React, { useState } from "react";
import {
  FileText,
  Search,
  Calendar,
  CheckCircle2,
  Eye,
  Pencil,
  Save,
  X,
  Printer,
  CreditCard,
  Smartphone,
  Banknote,
  Receipt,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { formatCurrency } from "../utils/formatCurrency";
import { dedupeOrders, sortOrdersBySettlementTime } from "../utils/orderDedupe";

const localDateInputValue = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const localWeekStartValue = (date = new Date()) => {
  const weekStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const daysSinceMonday = (weekStart.getDay() + 6) % 7;
  weekStart.setDate(weekStart.getDate() - daysSinceMonday);
  return localDateInputValue(weekStart);
};

const localWeekEndValue = (date = new Date()) => {
  const weekEnd = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const daysUntilSunday = 6 - ((weekEnd.getDay() + 6) % 7);
  weekEnd.setDate(weekEnd.getDate() + daysUntilSunday);
  return localDateInputValue(weekEnd);
};

const invoiceDateKey = (order) => {
  const value = order.settledDate || order.date || order.settledAt || order.createdAt;
  if (!value) return "";
  const text = String(value).trim();
  const isoDate = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoDate) return `${isoDate[1]}-${isoDate[2]}-${isoDate[3]}`;
  const dayMonthYear = text.match(/^(\d{1,2})[\s/-]+([A-Za-z]{3,}|\d{1,2})[\s,-]+(\d{4})/);
  if (dayMonthYear) {
    const monthNames = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
    const month = /^\d+$/.test(dayMonthYear[2])
      ? Number(dayMonthYear[2])
      : monthNames.indexOf(dayMonthYear[2].slice(0, 3).toLowerCase()) + 1;
    if (month >= 1 && month <= 12) return `${dayMonthYear[3]}-${String(month).padStart(2, "0")}-${String(Number(dayMonthYear[1])).padStart(2, "0")}`;
  }
  const yearMonthDay = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (yearMonthDay) return `${yearMonthDay[3]}-${String(Number(yearMonthDay[2])).padStart(2, "0")}-${String(Number(yearMonthDay[1])).padStart(2, "0")}`;
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? "" : localDateInputValue(parsed);
};

const invoiceDisplayDate = (order) => {
  const dateKey = invoiceDateKey(order);
  if (!dateKey) return "—";
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-IN");
};

const parseDisplayDateInput = (displayDate) => {
  const match = String(displayDate || "").trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return "";
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return "";
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
};

const formatInvoiceTime = (value) => {
  const text = String(value || "").trim();
  const match = text.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?$/i);
  if (match) {
    let hour = Number(match[1]);
    const minute = match[2];
    let suffix = match[3]?.toUpperCase();
    if (!suffix) {
      suffix = hour >= 12 ? "PM" : "AM";
      hour %= 12;
      if (hour === 0) hour = 12;
    }
    return `${String(hour).padStart(2, "0")}:${minute} ${suffix}`;
  }
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime())
    ? text || "12:00 PM"
    : parsed.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
};

export function AdminInvoices({
  pastOrders = [],
  restaurantName = "Restaurant",
  onUpdateInvoiceDiscount = null,
}) {
  const allOrders = sortOrdersBySettlementTime(
      dedupeOrders(Array.isArray(pastOrders) ? pastOrders : []),
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [selectedDate, setSelectedDate] = useState(() => localDateInputValue());
  const [selectedWeek, setSelectedWeek] = useState(() => ({
    from: localWeekStartValue(),
    to: localWeekEndValue(),
  }));
  const [selectedMonth, setSelectedMonth] = useState(() => localDateInputValue().slice(0, 7));
  const [selectedQuarter, setSelectedQuarter] = useState(() => {
    const now = new Date();
    return { quarter: Math.floor(now.getMonth() / 3) + 1, year: now.getFullYear() };
  });
  const [customFromDate, setCustomFromDate] = useState("");
  const [customToDate, setCustomToDate] = useState("");
  const [customFromDateText, setCustomFromDateText] = useState("");
  const [customToDateText, setCustomToDateText] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(6);
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [discountDraft, setDiscountDraft] = useState("0");
  const [editError, setEditError] = useState("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);

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
    if (!editingInvoice?.id || !onUpdateInvoiceDiscount) {
      setEditError("This invoice cannot be edited because it has no server order ID.");
      return;
    }
    setIsSavingEdit(true);
    setEditError("");
    try {
      await onUpdateInvoiceDiscount(editingInvoice.id, discountPercent);
      setEditingInvoice(null);
    } catch (error) {
      setEditError(error?.message || "Could not update the invoice discount.");
    } finally {
      setIsSavingEdit(false);
    }
  };

  const invalidCustomDate = dateFilter === "custom" && (
    (customFromDateText && !customFromDate) ||
    (customToDateText && !customToDate) ||
    (customFromDate && customToDate && customFromDate > customToDate)
  );

  const normalizePaymentMethod = (method) => {
    const value = String(method || "cash").trim().toLowerCase();
    if (value === "cash" || value === "upi" || value === "card") return value;
    if (value.includes("upi") || value.includes("online") || value.includes("gpay") || value.includes("phonepe") || value.includes("paytm")) return "upi";
    if (value.includes("card") || value.includes("credit") || value.includes("debit")) return "card";
    return value;
  };

  const filteredOrders = allOrders.filter((order) => {
    const orderDate = invoiceDateKey(order);
    const matchesDate = dateFilter === "all" ||
      (dateFilter === "daily" && orderDate === selectedDate) ||
      (dateFilter === "weekly" && orderDate >= selectedWeek.from && orderDate <= selectedWeek.to) ||
      (dateFilter === "monthly" && orderDate.startsWith(selectedMonth)) ||
      (dateFilter === "quarterly" && (() => {
        const [year, month] = orderDate.split("-").map(Number);
        return year === selectedQuarter.year && Math.ceil(month / 3) === selectedQuarter.quarter;
      })()) ||
      (dateFilter === "custom" && !invalidCustomDate && !!orderDate &&
        (!customFromDate || orderDate >= customFromDate) &&
        (!customToDate || orderDate <= customToDate));
    const matchesPayment = paymentFilter === "all" ||
      normalizePaymentMethod(order.paymentMethod) === paymentFilter;

    const query = searchTerm.toLowerCase();
    const matchesSearch =
      (order.invoiceNo || "").toLowerCase().includes(query) ||
      (order.tableName || "").toLowerCase().includes(query) ||
      (order.server || "").toLowerCase().includes(query);

    return matchesDate && matchesPayment && matchesSearch;
  });

  const pageCount = Math.max(
    1,
    Math.ceil(filteredOrders.length / itemsPerPage),
  );
  const visiblePage = Math.min(currentPage, pageCount);
  const pageStart = (visiblePage - 1) * itemsPerPage;
  const paginatedOrders = filteredOrders.slice(
    pageStart,
    pageStart + itemsPerPage,
  );

  const totalCollected = filteredOrders.reduce(
    (sum, o) => sum + (Number(o.grandTotal) || 0),
    0,
  );

  const upiTotal = filteredOrders
    .filter((o) => normalizePaymentMethod(o.paymentMethod) === "upi")
    .reduce((sum, o) => sum + (Number(o.grandTotal) || 0), 0);

  const cashTotal = filteredOrders
    .filter((o) => normalizePaymentMethod(o.paymentMethod) === "cash")
    .reduce((sum, o) => sum + (Number(o.grandTotal) || 0), 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {/* Outer Card Matching Design */}
      <div
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border-card)",
          borderRadius: "16px",
          padding: "1.5rem",
        }}
      >
        {/* Header Strip inside Card */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "1rem",
            marginBottom: "1.5rem",
          }}
        >
          {/* Left Title with Orange Squircle */}
          <div
            style={{ display: "flex", alignItems: "center", gap: "0.85rem" }}
          >
            <div
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "12px",
                background: "linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 4px 14px rgba(245, 158, 11, 0.35)",
              }}
            >
              <FileText size={22} color="#ffffff" />
            </div>
            <div>
              <div
                style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}
              >
                <h2
                  style={{
                    fontSize: "1.35rem",
                    fontWeight: 800,
                    color: "var(--text-main)",
                    margin: 0,
                  }}
                >
                  Settled Invoices & Billing Logs
                </h2>
                <span
                  style={{
                    background: "rgba(245, 158, 11, 0.15)",
                    border: "1px solid rgba(245, 158, 11, 0.35)",
                    color: "#f59e0b",
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    padding: "2px 10px",
                    borderRadius: "20px",
                  }}
                >
                  {filteredOrders.length} invoices
                </span>
              </div>
              <p
                style={{
                  fontSize: "0.8rem",
                  color: "var(--text-dim)",
                  margin: "3px 0 0 0",
                }}
              >
                Detailed receipts, taxes, payment modes and customer settlement
                records
              </p>
            </div>
          </div>

          {/* Right Controls: Search */}
          <div
            style={{
              position: "relative",
              width: "280px",
              height: "40px",
              display: "flex",
              alignItems: "center",
            }}
          >
            <Search
              size={16}
              color="var(--text-dim)"
              style={{
                position: "absolute",
                left: "12px",
                pointerEvents: "none",
              }}
            />
            <input
              type="text"
              placeholder="Search invoice #, table, waiter..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              style={{
                width: "100%",
                height: "100%",
                background: "var(--bg-tertiary)",
                border: "1px solid var(--border-card)",
                borderRadius: "9px",
                padding: "0 12px 0 36px",
                color: "var(--text-main)",
                fontSize: "0.82rem",
                outline: "none",
              }}
            />
          </div>
        </div>

        {/* Invoice date filters */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-start", gap: "0.65rem", flexWrap: "wrap", minHeight: "54px", boxSizing: "border-box", padding: "0.55rem 0.8rem", marginBottom: "0.9rem", background: "var(--bg-tertiary)", border: "1px solid var(--border-subtle)", borderRadius: "10px" }}>
          <Calendar size={16} color="#f59e0b" style={{ flex: "0 0 auto" }} />
          <select
            aria-label="Filter invoices by date"
            value={dateFilter}
            onChange={(event) => { setDateFilter(event.target.value); setCurrentPage(1); }}
            style={{ height: "38px", minWidth: "190px", boxSizing: "border-box", padding: "0 0.7rem", borderRadius: "8px", border: "1px solid var(--border-card)", color: "var(--text-main)", background: "var(--bg-card)", fontSize: "0.8rem", fontWeight: 700 }}
          >
            <option value="all">All Dates</option>
            <option value="daily">Today</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="quarterly">Quarterly</option>
            <option value="custom">Custom Date Range</option>
          </select>
          {dateFilter === "daily" && (
            <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", height: "38px", color: "var(--text-muted)", fontSize: "0.78rem", fontWeight: 700, whiteSpace: "nowrap" }}>
              Date
              <input type="date" value={selectedDate} onChange={(event) => { setSelectedDate(event.target.value); setCurrentPage(1); }} style={{ width: "148px", height: "38px", boxSizing: "border-box", padding: "0 0.55rem", borderRadius: "8px", border: "1px solid var(--border-card)", color: "var(--text-main)", background: "var(--bg-card)", fontSize: "0.8rem" }} />
            </label>
          )}
          {dateFilter === "monthly" && (
            <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", height: "38px", color: "var(--text-muted)", fontSize: "0.78rem", fontWeight: 700, whiteSpace: "nowrap" }}>
              Month
              <input type="month" value={selectedMonth} onChange={(event) => { setSelectedMonth(event.target.value); setCurrentPage(1); }} style={{ width: "148px", height: "38px", boxSizing: "border-box", padding: "0 0.55rem", borderRadius: "8px", border: "1px solid var(--border-card)", color: "var(--text-main)", background: "var(--bg-card)", fontSize: "0.8rem" }} />
            </label>
          )}
          {dateFilter === "quarterly" && (
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", height: "38px", color: "var(--text-muted)", fontSize: "0.78rem", fontWeight: 700, whiteSpace: "nowrap" }}>
              <label htmlFor="invoice-quarter">Quarter</label>
              <select
                id="invoice-quarter"
                value={selectedQuarter.quarter}
                onChange={(event) => {
                  setSelectedQuarter((current) => ({ ...current, quarter: Number(event.target.value) }));
                  setCurrentPage(1);
                }}
                style={{ height: "38px", padding: "0 0.55rem", borderRadius: "8px", border: "1px solid var(--border-card)", color: "var(--text-main)", background: "var(--bg-card)", fontSize: "0.8rem" }}
              >
                {[1, 2, 3, 4].map((quarter) => <option key={quarter} value={quarter}>Q{quarter} ({(quarter - 1) * 3 + 1}–{quarter * 3})</option>)}
              </select>
              <label htmlFor="invoice-quarter-year">Year</label>
              <input
                id="invoice-quarter-year"
                type="number"
                min="2000"
                max="2100"
                value={selectedQuarter.year}
                onChange={(event) => {
                  setSelectedQuarter((current) => ({ ...current, year: Number(event.target.value) }));
                  setCurrentPage(1);
                }}
                style={{ width: "88px", height: "38px", boxSizing: "border-box", padding: "0 0.55rem", borderRadius: "8px", border: "1px solid var(--border-card)", color: "var(--text-main)", background: "var(--bg-card)", fontSize: "0.8rem" }}
              />
            </div>
          )}
          {dateFilter === "weekly" && (
            <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", height: "38px", color: "var(--text-muted)", fontSize: "0.78rem", fontWeight: 700, whiteSpace: "nowrap" }}>
              Week of
              <input
                type="date"
                aria-label="Choose week"
                value={selectedWeek.from}
                onChange={(event) => {
                  const from = event.target.value;
                  if (!from) return;
                  const weekStart = new Date(`${from}T00:00:00`);
                  const offset = (weekStart.getDay() + 6) % 7;
                  weekStart.setDate(weekStart.getDate() - offset);
                  const weekEnd = new Date(weekStart);
                  weekEnd.setDate(weekStart.getDate() + 6);
                  setSelectedWeek({ from: localDateInputValue(weekStart), to: localDateInputValue(weekEnd) });
                  setCurrentPage(1);
                }}
                style={{ width: "148px", height: "38px", boxSizing: "border-box", padding: "0 0.55rem", borderRadius: "8px", border: "1px solid var(--border-card)", color: "var(--text-main)", background: "var(--bg-card)", fontSize: "0.8rem" }}
              />
              <span style={{ fontWeight: 500 }}>{selectedWeek.from} – {selectedWeek.to}</span>
            </label>
          )}
          {dateFilter === "custom" && (
            <div style={{ display: "flex", alignItems: "center", gap: "0.65rem", flexWrap: "wrap" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", height: "38px", color: "var(--text-muted)", fontSize: "0.78rem", fontWeight: 700, whiteSpace: "nowrap" }}>
                From
                <span style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
                  <input type="text" inputMode="numeric" placeholder="dd/mm/yyyy" aria-label="From date (day/month/year)" value={customFromDateText} onChange={(event) => { const text = event.target.value; setCustomFromDateText(text); setCustomFromDate(parseDisplayDateInput(text)); setCurrentPage(1); }} style={{ width: "132px", height: "38px", boxSizing: "border-box", padding: "0 2.1rem 0 0.65rem", borderRadius: "8px", border: "1px solid var(--border-card)", color: "var(--text-main)", background: "var(--bg-card)", fontSize: "0.8rem", lineHeight: 1 }} />
                  <input type="date" aria-label="Choose from date" value={customFromDate} max={customToDate || undefined} onChange={(event) => { const value = event.target.value; setCustomFromDate(value); setCustomFromDateText(value ? `${value.slice(8, 10)}/${value.slice(5, 7)}/${value.slice(0, 4)}` : ""); setCurrentPage(1); }} onClick={(event) => { try { event.currentTarget.showPicker(); } catch {} }} style={{ position: "absolute", right: "5px", width: "28px", height: "30px", opacity: 0, cursor: "pointer" }} />
                  <Calendar size={16} color="var(--text-muted)" style={{ position: "absolute", right: "10px", pointerEvents: "none" }} />
                </span>
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", height: "38px", color: "var(--text-muted)", fontSize: "0.78rem", fontWeight: 700, whiteSpace: "nowrap" }}>
                To
                <span style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
                  <input type="text" inputMode="numeric" placeholder="dd/mm/yyyy" aria-label="To date (day/month/year)" value={customToDateText} onChange={(event) => { const text = event.target.value; setCustomToDateText(text); setCustomToDate(parseDisplayDateInput(text)); setCurrentPage(1); }} style={{ width: "132px", height: "38px", boxSizing: "border-box", padding: "0 2.1rem 0 0.65rem", borderRadius: "8px", border: "1px solid var(--border-card)", color: "var(--text-main)", background: "var(--bg-card)", fontSize: "0.8rem", lineHeight: 1 }} />
                  <input type="date" aria-label="Choose to date" value={customToDate} min={customFromDate || undefined} onChange={(event) => { const value = event.target.value; setCustomToDate(value); setCustomToDateText(value ? `${value.slice(8, 10)}/${value.slice(5, 7)}/${value.slice(0, 4)}` : ""); setCurrentPage(1); }} onClick={(event) => { try { event.currentTarget.showPicker(); } catch {} }} style={{ position: "absolute", right: "5px", width: "28px", height: "30px", opacity: 0, cursor: "pointer" }} />
                  <Calendar size={16} color="var(--text-muted)" style={{ position: "absolute", right: "10px", pointerEvents: "none" }} />
                </span>
              </label>
            </div>
          )}
          {invalidCustomDate && <span role="alert" style={{ color: "#fca5a5", fontSize: "0.73rem" }}>Enter valid dates in DD/MM/YYYY order.</span>}
          <span style={{ marginLeft: "auto", color: "var(--text-muted)", fontSize: "0.75rem", whiteSpace: "nowrap" }}>Showing {filteredOrders.length} invoices</span>
        </div>

        {/* Filter Strip & Mini Metrics */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "0.75rem",
            marginBottom: "1.25rem",
          }}
        >
          {/* Payment Method Filter Pills */}
          <div style={{ display: "flex", gap: "0.5rem" }}>
            {["all", "upi", "cash", "card"].map((mode) => (
              <button
                key={mode}
                onClick={() => {
                  setPaymentFilter(mode);
                  setCurrentPage(1);
                }}
                style={{
                  background:
                    paymentFilter === mode
                      ? "rgba(245, 158, 11, 0.15)"
                      : "var(--bg-tertiary)",
                  border:
                    paymentFilter === mode
                      ? "1px solid var(--accent-amber)"
                      : "1px solid var(--border-card)",
                  color: paymentFilter === mode ? "var(--accent-amber)" : "var(--text-muted)",
                  padding: "0.35rem 0.85rem",
                  borderRadius: "20px",
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  cursor: "pointer",
                  textTransform: "uppercase",
                }}
              >
                {mode === "all" ? "All Payments" : mode}
              </button>
            ))}
          </div>

          <div
            style={{
              fontSize: "0.82rem",
              color: "var(--text-muted)",
              display: "flex",
              gap: "1rem",
            }}
          >
            <span>
              Total:{" "}
              <strong style={{ color: "#f59e0b" }}>
                {formatCurrency(totalCollected)}
              </strong>
            </span>
            <span>
              UPI:{" "}
              <strong style={{ color: "#38bdf8" }}>
                {formatCurrency(upiTotal)}
              </strong>
            </span>
            <span>
              Cash:{" "}
              <strong style={{ color: "#10b981" }}>
                {formatCurrency(cashTotal)}
              </strong>
            </span>
          </div>
        </div>

        {/* Invoices Table */}
        <div
          style={{
            overflowX: "auto",
            borderRadius: "12px",
            border: "1px solid var(--border-card)",
          }}
        >
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
                  borderBottom: "1px solid var(--border-subtle)",
                  background: "var(--bg-tertiary)",
                  color: "var(--text-muted)",
                  fontSize: "0.8rem",
                  fontWeight: 700,
                }}
              >
                <th style={{ padding: "0.85rem 1rem" }}>Invoice No</th>
                <th style={{ padding: "0.85rem 1rem" }}>Table & Waiter</th>
                <th style={{ padding: "0.85rem 1rem" }}>Date & Time</th>
                <th style={{ padding: "0.85rem 1rem" }}>Items Summary</th>
                <th style={{ padding: "0.85rem 1rem" }}>Payment Mode</th>
                <th style={{ padding: "0.85rem 1rem" }}>Grand Total</th>
                <th style={{ padding: "0.85rem 1rem", textAlign: "center" }}>
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {paginatedOrders.map((order, idx) => {
                const orderIndex = pageStart + idx;
                const pMode = normalizePaymentMethod(order.paymentMethod);
                const itemCount = (order.items || []).reduce(
                  (sum, i) => sum + Number(i.quantity || 1),
                  0,
                );

                return (
                  <tr
                    key={order.invoiceNo || orderIndex}
                    style={{
                      borderBottom: "1px solid var(--border-subtle)",
                      transition: "background 0.15s ease",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background =
                        "var(--bg-tertiary)")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = "transparent")
                    }
                  >
                    {/* Invoice No */}
                    <td style={{ padding: "1rem" }}>
                      <span
                        style={{
                          fontFamily: "monospace",
                          fontWeight: 800,
                          color: "var(--text-main)",
                          fontSize: "0.88rem",
                        }}
                      >
                        {order.invoiceNo || `INV-${1000 + orderIndex}`}
                      </span>
                    </td>

                    {/* Table & Server */}
                    <td style={{ padding: "1rem" }}>
                      <div style={{ fontWeight: 700, color: "var(--text-main)" }}>
                        {order.tableName || `Table ${order.tableId || 1}`}
                      </div>
                      <div
                        style={{
                          fontSize: "0.72rem",
                          color: "var(--text-muted)",
                          marginTop: "2px",
                        }}
                      >
                        Waiter: {order.server || "Staff"}
                      </div>
                    </td>

                    {/* Date & Time */}
                    <td style={{ padding: "1rem" }}>
                      <div style={{ color: "var(--text-main)", fontWeight: 600 }}>
                        {invoiceDisplayDate(order)}
                      </div>
                      <div
                        style={{
                          fontSize: "0.72rem",
                          color: "var(--text-muted)",
                          marginTop: "2px",
                        }}
                      >
                        {formatInvoiceTime(order.settledAt || order.orderTime)}
                      </div>
                    </td>

                    {/* Items */}
                    <td style={{ padding: "1rem", color: "var(--text-main)" }}>
                      <span style={{ fontWeight: 600 }}>{itemCount} items</span>
                      <div
                        style={{
                          fontSize: "0.7rem",
                          color: "var(--text-muted)",
                          maxWidth: "180px",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {(order.items || []).map((i) => i.name).join(", ")}
                      </div>
                    </td>

                    {/* Payment Mode Badge */}
                    <td style={{ padding: "1rem" }}>
                      {pMode === "upi" ? (
                        <span
                          style={{
                            background: "rgba(56, 189, 248, 0.12)",
                            border: "1px solid rgba(56, 189, 248, 0.3)",
                            color: "#38bdf8",
                            borderRadius: "20px",
                            padding: "3px 10px",
                            fontSize: "0.72rem",
                            fontWeight: 700,
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "5px",
                          }}
                        >
                          <Smartphone size={11} />
                          UPI
                        </span>
                      ) : pMode === "card" ? (
                        <span
                          style={{
                            background: "rgba(168, 85, 247, 0.12)",
                            border: "1px solid rgba(168, 85, 247, 0.3)",
                            color: "#c084fc",
                            borderRadius: "20px",
                            padding: "3px 10px",
                            fontSize: "0.72rem",
                            fontWeight: 700,
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "5px",
                          }}
                        >
                          <CreditCard size={11} />
                          Card
                        </span>
                      ) : (
                        <span
                          style={{
                            background: "rgba(16, 185, 129, 0.12)",
                            border: "1px solid rgba(16, 185, 129, 0.3)",
                            color: "#10b981",
                            borderRadius: "20px",
                            padding: "3px 10px",
                            fontSize: "0.72rem",
                            fontWeight: 700,
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "5px",
                          }}
                        >
                          <Banknote size={11} />
                          Cash
                        </span>
                      )}
                    </td>

                    {/* Grand Total */}
                    <td
                      style={{
                        padding: "1rem",
                        fontWeight: 800,
                        color: "#f59e0b",
                        fontSize: "0.95rem",
                      }}
                    >
                      {formatCurrency(order.grandTotal)}
                    </td>

                    {/* Action */}
                    <td style={{ padding: "1rem", textAlign: "center" }}>
                      <div style={{ display: "flex", justifyContent: "center", gap: "0.4rem" }}>
                        <button
                          onClick={() => setSelectedReceipt(order)}
                          style={{
                          background: "rgba(245, 158, 11, 0.08)",
                          border: "1px solid rgba(245, 158, 11, 0.35)",
                          color: "#f59e0b",
                          borderRadius: "7px",
                          padding: "5px 12px",
                          fontSize: "0.75rem",
                          fontWeight: 700,
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                          }}
                        >
                          <Eye size={12} />
                          <span>View</span>
                        </button>
                        <button
                          onClick={() => openDiscountEditor(order)}
                          disabled={!onUpdateInvoiceDiscount || !order.id}
                          title="Edit bill discount"
                          style={{
                            background: "rgba(59, 130, 246, 0.08)",
                            border: "1px solid rgba(59, 130, 246, 0.35)",
                            color: "#60a5fa",
                            borderRadius: "7px",
                            padding: "5px 9px",
                            fontSize: "0.75rem",
                            fontWeight: 700,
                            cursor: onUpdateInvoiceDiscount && order.id ? "pointer" : "not-allowed",
                            opacity: onUpdateInvoiceDiscount && order.id ? 1 : 0.5,
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                          }}
                        >
                          <Pencil size={12} />
                          <span>Edit</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {paginatedOrders.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    style={{
                      padding: "2rem 1rem",
                      color: "#94a3b8",
                      textAlign: "center",
                    }}
                  >
                    No invoices match these filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "0.5rem 0.85rem",
              borderTop: "1px solid var(--border-subtle)",
              background: "var(--bg-tertiary)",
              fontSize: "0.74rem",
              color: "var(--text-muted)",
              flexWrap: "wrap",
              gap: "0.5rem",
            }}
          >
            <span>
              Showing{" "}
              <strong style={{ color: "var(--text-main)", fontWeight: 700 }}>
                {filteredOrders.length === 0 ? 0 : pageStart + 1}
              </strong>
              –
              <strong style={{ color: "var(--text-main)", fontWeight: 700 }}>
                {Math.min(pageStart + itemsPerPage, filteredOrders.length)}
              </strong>{" "}
              of{" "}
              <strong style={{ color: "var(--text-main)", fontWeight: 700 }}>
                {filteredOrders.length}
              </strong>{" "}
              invoices
            </span>
            <div
              style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
            >
              <div
                style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}
              >
                <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
                  Per page:
                </span>
                <select
                  aria-label="Invoices per page"
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  style={{
                    background: "var(--bg-tertiary)",
                    color: "var(--text-main)",
                    border: "1px solid var(--border-card)",
                    borderRadius: "5px",
                    padding: "2px 6px",
                    fontSize: "0.72rem",
                    outline: "none",
                    cursor: "pointer",
                    height: "24px",
                  }}
                >
                  {[5, 6, 8, 10, 20].map((pageSize) => (
                    <option key={pageSize} value={pageSize}>
                      {pageSize}
                    </option>
                  ))}
                </select>
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.25rem",
                }}
              >
                <button
                  type="button"
                  aria-label="Previous page"
                  onClick={() =>
                    setCurrentPage((page) => Math.max(1, page - 1))
                  }
                  disabled={visiblePage === 1}
                  style={{
                    height: "24px",
                    padding: "0 6px",
                    borderRadius: "5px",
                    background:
                      visiblePage === 1
                        ? "rgba(255, 255, 255, 0.02)"
                        : "rgba(255, 255, 255, 0.06)",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    color: visiblePage === 1 ? "#475569" : "#cbd5e1",
                    cursor: visiblePage === 1 ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "2px",
                    fontSize: "0.72rem",
                    fontWeight: 600,
                  }}
                >
                  <ChevronLeft size={13} />
                  <span>Prev</span>
                </button>
                {Array.from({ length: pageCount }, (_, index) => index + 1).map(
                  (page) => {
                    const isActive = page === visiblePage;
                    return (
                      <button
                        key={page}
                        type="button"
                        aria-label={`Page ${page}`}
                        aria-current={isActive ? "page" : undefined}
                        onClick={() => setCurrentPage(page)}
                        style={{
                          height: "24px",
                          minWidth: "24px",
                          padding: "0 5px",
                          borderRadius: "5px",
                          background: isActive
                            ? "linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)"
                            : "transparent",
                          border: isActive
                            ? "none"
                            : "1px solid rgba(255, 255, 255, 0.08)",
                          color: isActive ? "#ffffff" : "#94a3b8",
                          cursor: "pointer",
                          fontSize: "0.72rem",
                          fontWeight: isActive ? 800 : 500,
                          boxShadow: isActive
                            ? "0 2px 8px rgba(245, 158, 11, 0.35)"
                            : "none",
                        }}
                      >
                        {page}
                      </button>
                    );
                  },
                )}
                <button
                  type="button"
                  aria-label="Next page"
                  onClick={() =>
                    setCurrentPage((page) => Math.min(pageCount, page + 1))
                  }
                  disabled={visiblePage === pageCount}
                  style={{
                    height: "24px",
                    padding: "0 6px",
                    borderRadius: "5px",
                    background:
                      visiblePage === pageCount
                        ? "rgba(255, 255, 255, 0.02)"
                        : "rgba(255, 255, 255, 0.06)",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    color: visiblePage === pageCount ? "#475569" : "#cbd5e1",
                    cursor:
                      visiblePage === pageCount ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "2px",
                    fontSize: "0.72rem",
                    fontWeight: 600,
                  }}
                >
                  <span>Next</span>
                  <ChevronRight size={13} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Receipt Modal */}
      {selectedReceipt && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.8)",
            backdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 160,
            padding: "1rem",
          }}
        >
          <div
            style={{
              background: "#111827",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              borderRadius: "16px",
              padding: "1.75rem",
              width: "100%",
              maxWidth: "420px",
              boxShadow: "0 20px 40px rgba(0,0,0,0.6)",
              color: "#ffffff",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
                paddingBottom: "0.75rem",
                marginBottom: "1rem",
              }}
            >
              <div>
                <h3
                  style={{
                    fontSize: "1.1rem",
                    fontWeight: 800,
                    margin: 0,
                    color: "#f59e0b",
                  }}
                >
                  {restaurantName}
                </h3>
                <div style={{ fontSize: "0.72rem", color: "#94a3b8" }}>
                  Invoice: {selectedReceipt.invoiceNo || "INV-001"}
                </div>
              </div>
              <button
                onClick={() => setSelectedReceipt(null)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#94a3b8",
                  cursor: "pointer",
                }}
              >
                <X size={18} />
              </button>
            </div>

            <div
              style={{
                fontSize: "0.8rem",
                color: "#cbd5e1",
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "0.85rem",
              }}
            >
              <div>
                <div>
                  <strong>Table:</strong> {selectedReceipt.tableName}
                </div>
                <div>
                  <strong>Waiter:</strong> {selectedReceipt.server || "Staff"}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div>{invoiceDisplayDate(selectedReceipt)}</div>
                <div>{formatInvoiceTime(selectedReceipt.settledAt || selectedReceipt.orderTime)}</div>
              </div>
            </div>

            {/* Items List */}
            <div
              style={{
                borderTop: "1px dashed rgba(255, 255, 255, 0.15)",
                borderBottom: "1px dashed rgba(255, 255, 255, 0.15)",
                padding: "0.75rem 0",
                display: "flex",
                flexDirection: "column",
                gap: "0.45rem",
                maxHeight: "180px",
                overflowY: "auto",
              }}
            >
              {(selectedReceipt.items || []).map((item, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: "0.82rem",
                  }}
                >
                  <div>
                    <span>{item.name}</span>
                    <span style={{ color: "#64748b", marginLeft: "6px" }}>
                      x{item.quantity || 1}
                    </span>
                  </div>
                  <span style={{ fontWeight: 700 }}>
                    ₹{((item.price || 0) * (item.quantity || 1)).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>

            {/* Bill Summary */}
            <div
              style={{
                marginTop: "0.85rem",
                display: "flex",
                flexDirection: "column",
                gap: "0.35rem",
                fontSize: "0.8rem",
                color: "#94a3b8",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Subtotal</span>
                <span>{formatCurrency(selectedReceipt.subtotal || 0)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>GST / Tax</span>
                <span>{formatCurrency(selectedReceipt.taxAmount || 0)}</span>
              </div>
              {Number(selectedReceipt.serviceChargeAmount) > 0 && (
                <div
                  style={{ display: "flex", justifyContent: "space-between" }}
                >
                  <span>Service Charge</span>
                  <span>
                    {formatCurrency(selectedReceipt.serviceChargeAmount)}
                  </span>
                </div>
              )}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "1rem",
                  fontWeight: 800,
                  color: "#f59e0b",
                  borderTop: "1px solid rgba(255, 255, 255, 0.1)",
                  paddingTop: "0.5rem",
                  marginTop: "0.3rem",
                }}
              >
                <span>Grand Total</span>
                <span>{formatCurrency(selectedReceipt.grandTotal)}</span>
              </div>
              <div
                style={{
                  fontSize: "0.72rem",
                  color: "#10b981",
                  marginTop: "3px",
                  textAlign: "right",
                  textTransform: "uppercase",
                  fontWeight: 700,
                }}
              >
                Paid via {selectedReceipt.paymentMethod || "Cash"}
              </div>
            </div>

            <div
              style={{
                display: "flex",
                gap: "0.75rem",
                marginTop: "1.25rem",
              }}
            >
              <button
                onClick={() => window.print()}
                style={{
                  flex: 1,
                  padding: "0.6rem",
                  background: "rgba(255, 255, 255, 0.08)",
                  border: "none",
                  borderRadius: "8px",
                  color: "#ffffff",
                  fontSize: "0.82rem",
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  cursor: "pointer",
                }}
              >
                <Printer size={14} />
                <span>Print Receipt</span>
              </button>
              <button
                onClick={() => setSelectedReceipt(null)}
                style={{
                  flex: 1,
                  padding: "0.6rem",
                  background: "linear-gradient(135deg, #f59e0b, #ea580c)",
                  border: "none",
                  borderRadius: "8px",
                  color: "#ffffff",
                  fontSize: "0.82rem",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {editingInvoice && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 170,
            display: "grid",
            placeItems: "center",
            padding: "1rem",
            background: "rgba(0, 0, 0, 0.72)",
            backdropFilter: "blur(5px)",
          }}
        >
          <form
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
                  {editingInvoice.invoiceNo || `Order #${editingInvoice.id}`}
                </div>
              </div>
              <button type="button" onClick={() => setEditingInvoice(null)} aria-label="Close edit discount" style={{ border: 0, background: "transparent", color: "var(--text-muted)", cursor: "pointer" }}>
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
            {editError && <div role="alert" style={{ color: "#f87171", fontSize: "0.78rem", marginBottom: "0.8rem" }}>{editError}</div>}
            <div style={{ display: "flex", gap: "0.6rem", marginTop: "1rem" }}>
              <button type="button" onClick={() => setEditingInvoice(null)} disabled={isSavingEdit} style={{ flex: 1, padding: "0.65rem", borderRadius: "8px", border: "1px solid var(--border-card)", color: "var(--text-main)", background: "transparent", cursor: "pointer" }}>
                Cancel
              </button>
              <button type="submit" disabled={isSavingEdit} style={{ flex: 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "0.4rem", padding: "0.65rem", borderRadius: "8px", border: 0, color: "#fff", background: "linear-gradient(135deg, #f59e0b, #ea580c)", fontWeight: 700, cursor: isSavingEdit ? "wait" : "pointer", opacity: isSavingEdit ? 0.7 : 1 }}>
                <Save size={14} />
                {isSavingEdit ? "Saving..." : "Save Discount"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
