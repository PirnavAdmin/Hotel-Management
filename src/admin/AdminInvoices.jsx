import React, { useState } from "react";
import {
  FileText,
  Search,
  Calendar,
  CheckCircle2,
  Eye,
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
import { INITIAL_ORDERS } from "../data/initialOrders";
import { dedupeOrders, sortOrdersBySettlementTime } from "../utils/orderDedupe";

const localDateInputValue = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
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

export function AdminInvoices({ pastOrders = [] }) {
  const allOrders = sortOrdersBySettlementTime(
    dedupeOrders(
      pastOrders && pastOrders.length > 0 ? pastOrders : INITIAL_ORDERS,
    ),
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [selectedDate, setSelectedDate] = useState(() => localDateInputValue());
  const [selectedMonth, setSelectedMonth] = useState(() => localDateInputValue().slice(0, 7));
  const [customFromDate, setCustomFromDate] = useState("");
  const [customToDate, setCustomToDate] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(6);
  const [selectedReceipt, setSelectedReceipt] = useState(null);

  const filteredOrders = allOrders.filter((order) => {
    const orderDate = invoiceDateKey(order);
    const matchesDate = dateFilter === "all" ||
      (dateFilter === "daily" && orderDate === selectedDate) ||
      (dateFilter === "monthly" && orderDate.startsWith(selectedMonth)) ||
      (dateFilter === "custom" && !!orderDate &&
        (!customFromDate || orderDate >= customFromDate) &&
        (!customToDate || orderDate <= customToDate));
    const matchesPayment =
      paymentFilter === "all" ||
      String(order.paymentMethod || "").toLowerCase() ===
        paymentFilter.toLowerCase();

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
    .filter((o) => (o.paymentMethod || "").toLowerCase() === "upi")
    .reduce((sum, o) => sum + (Number(o.grandTotal) || 0), 0);

  const cashTotal = filteredOrders
    .filter((o) => (o.paymentMethod || "").toLowerCase() === "cash")
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
        <div style={{ display: "flex", alignItems: "center", gap: "0.65rem", flexWrap: "wrap", padding: "0.7rem 0.8rem", marginBottom: "0.9rem", background: "var(--bg-tertiary)", border: "1px solid var(--border-subtle)", borderRadius: "10px" }}>
          <Calendar size={16} color="#f59e0b" />
          <select
            aria-label="Filter invoices by date"
            value={dateFilter}
            onChange={(event) => { setDateFilter(event.target.value); setCurrentPage(1); }}
            style={{ height: "36px", minWidth: "145px", padding: "0 0.65rem", borderRadius: "8px", border: "1px solid var(--border-card)", color: "var(--text-main)", background: "var(--bg-card)", fontSize: "0.8rem", fontWeight: 700 }}
          >
            <option value="all">All Dates</option>
            <option value="daily">Daily</option>
            <option value="monthly">Monthly</option>
            <option value="custom">Custom Date Range</option>
          </select>
          {dateFilter === "daily" && (
            <label style={{ display: "flex", alignItems: "center", gap: "0.45rem", color: "var(--text-muted)", fontSize: "0.78rem", fontWeight: 600 }}>
              Date
              <input type="date" value={selectedDate} onChange={(event) => { setSelectedDate(event.target.value); setCurrentPage(1); }} style={{ height: "36px", padding: "0 0.55rem", borderRadius: "8px", border: "1px solid var(--border-card)", color: "var(--text-main)", background: "var(--bg-card)", fontSize: "0.8rem" }} />
            </label>
          )}
          {dateFilter === "monthly" && (
            <label style={{ display: "flex", alignItems: "center", gap: "0.45rem", color: "var(--text-muted)", fontSize: "0.78rem", fontWeight: 600 }}>
              Month
              <input type="month" value={selectedMonth} onChange={(event) => { setSelectedMonth(event.target.value); setCurrentPage(1); }} style={{ height: "36px", padding: "0 0.55rem", borderRadius: "8px", border: "1px solid var(--border-card)", color: "var(--text-main)", background: "var(--bg-card)", fontSize: "0.8rem" }} />
            </label>
          )}
          {dateFilter === "custom" && (
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "0.4rem", color: "var(--text-muted)", fontSize: "0.78rem", fontWeight: 600 }}>
                From
                <input type="date" value={customFromDate} onChange={(event) => { setCustomFromDate(event.target.value); setCurrentPage(1); }} style={{ height: "36px", padding: "0 0.5rem", borderRadius: "8px", border: "1px solid var(--border-card)", color: "var(--text-main)", background: "var(--bg-card)", fontSize: "0.8rem" }} />
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: "0.4rem", color: "var(--text-muted)", fontSize: "0.78rem", fontWeight: 600 }}>
                To
                <input type="date" value={customToDate} min={customFromDate || undefined} onChange={(event) => { setCustomToDate(event.target.value); setCurrentPage(1); }} style={{ height: "36px", padding: "0 0.5rem", borderRadius: "8px", border: "1px solid var(--border-card)", color: "var(--text-main)", background: "var(--bg-card)", fontSize: "0.8rem" }} />
              </label>
            </div>
          )}
          <span style={{ marginLeft: "auto", color: "var(--text-muted)", fontSize: "0.75rem" }}>Showing {filteredOrders.length} invoices</span>
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
                const pMode = String(
                  order.paymentMethod || "cash",
                ).toLowerCase();
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
                        {order.settledDate || order.date || "Today"}
                      </div>
                      <div
                        style={{
                          fontSize: "0.72rem",
                          color: "var(--text-muted)",
                          marginTop: "2px",
                        }}
                      >
                        {order.settledAt || order.orderTime || "12:00 PM"}
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
                  AVSR FOOD COURT
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
                <div>{selectedReceipt.date || "Today"}</div>
                <div>{selectedReceipt.settledAt || "12:00 PM"}</div>
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
    </div>
  );
}
