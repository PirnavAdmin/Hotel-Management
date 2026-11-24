import React, { useState, useEffect, useMemo } from "react";
import {
  Smartphone,
  Search,
  Calendar,
  Eye,
  Printer,
  Download,
  IndianRupee,
  Clock,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ShoppingBag,
  CreditCard,
  Banknote,
  QrCode,
  FileText,
  Filter,
} from "lucide-react";
import { formatCurrency } from "../utils/formatCurrency";
import { ReceiptModal } from "../user/ReceiptModal";
import {
  dedupeOrders,
  formatInvoiceNumber,
  isSelfServiceOrder,
  normalizePaymentMethod,
  parseOrderToYMD,
  sortInvoicesByCreationTime,
} from "../utils/orderDedupe";
import { requestInvoiceManagementRecords } from "../utils/liveInvoiceData";
import { subscribeToRealtimeEvents } from "../realtime/realtimeService";

const localDateInputValue = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export function AdminSelfService({
  restaurantName = "The Rustic Spin",
  restaurantSettings = {},
  restaurantLogo = "",
}) {
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all"); // 'all' | 'paid' | 'pending'
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const fetchOrders = async () => {
    setIsRefreshing(true);
    try {
      const { records } = await requestInvoiceManagementRecords();
      // Filter strictly for self service orders
      const selfServiceOnly = (Array.isArray(records) ? records : []).filter(isSelfServiceOrder);
      setOrders(selfServiceOnly);
    } catch (err) {
      console.warn("Could not load self service records:", err);
      // Fallback to local storage past orders
      try {
        const raw = localStorage.getItem("gourmet_pos_past_orders_v2_inr");
        if (raw) {
          const parsed = JSON.parse(raw);
          const selfOnly = (Array.isArray(parsed) ? parsed : []).filter(isSelfServiceOrder);
          setOrders(selfOnly);
        }
      } catch {}
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOrders();

    const handleUpdate = () => {
      fetchOrders();
    };

    window.addEventListener("avsr-orders-updated", handleUpdate);
    window.addEventListener("avsr-invoices-updated", handleUpdate);
    const unsubscribe = subscribeToRealtimeEvents(({ name }) => {
      if (name.includes("Order") || name.includes("Invoice")) {
        fetchOrders();
      }
    });

    return () => {
      window.removeEventListener("avsr-orders-updated", handleUpdate);
      window.removeEventListener("avsr-invoices-updated", handleUpdate);
      unsubscribe();
    };
  }, []);

  const todayStr = localDateInputValue();

  // Filtered orders
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      // Date filter
      if (dateFilter === "today") {
        const orderYmd = parseOrderToYMD(order);
        if (orderYmd !== todayStr) return false;
      }

      // Status filter
      if (statusFilter !== "all") {
        const rawStatus = String(order.paymentStatus || order.status || "").toLowerCase();
        const isPaid = rawStatus.includes("paid") || rawStatus.includes("settled") || rawStatus.includes("completed");
        if (statusFilter === "paid" && !isPaid) return false;
        if (statusFilter === "pending" && isPaid) return false;
      }

      // Search query (order number, invoice number, items)
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        const invNo = String(order.invoiceNumber || order.invoiceNo || "").toLowerCase();
        const ordNo = String(order.orderNumber || order.orderId || order.id || "").toLowerCase();
        const itemsStr = (order.items || []).map((i) => i.name).join(" ").toLowerCase();
        if (!invNo.includes(q) && !ordNo.includes(q) && !itemsStr.includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [orders, dateFilter, statusFilter, searchTerm, todayStr]);

  // Financial Metrics
  const totalOrders = orders.length;
  const totalRevenue = orders.reduce((sum, o) => sum + Number(o.grandTotal || o.totalAmount || 0), 0);
  const todayOrders = orders.filter((o) => parseOrderToYMD(o) === todayStr);
  const todayRevenue = todayOrders.reduce((sum, o) => sum + Number(o.grandTotal || o.totalAmount || 0), 0);
  const paidOrdersCount = orders.filter((o) => {
    const raw = String(o.paymentStatus || o.status || "").toLowerCase();
    return raw.includes("paid") || raw.includes("settled") || raw.includes("completed");
  }).length;
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / itemsPerPage));
  const paginatedOrders = filteredOrders.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", padding: "1.25rem", color: "var(--text-main)" }}>
      {/* 1. Header Banner */}
      <div
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border-card)",
          borderRadius: "16px",
          padding: "1.25rem 1.5rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.85rem" }}>
          <div
            style={{
              width: "44px",
              height: "44px",
              borderRadius: "12px",
              background: "linear-gradient(135deg, var(--info, #38bdf8), #0284c7)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#ffffff",
              boxShadow: "0 4px 14px rgba(56, 189, 248, 0.35)",
            }}
          >
            <Smartphone size={22} />
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <h2 style={{ fontSize: "1.25rem", fontWeight: 850, margin: 0, color: "var(--text-main)" }}>
                Self Service Orders
              </h2>
              <span
                style={{
                  fontSize: "0.72rem",
                  fontWeight: 800,
                  background: "rgba(56, 189, 248, 0.15)",
                  color: "var(--info, #38bdf8)",
                  padding: "2px 8px",
                  borderRadius: "12px",
                  border: "1px solid rgba(56, 189, 248, 0.35)",
                }}
              >
                {filteredOrders.length} orders
              </span>
            </div>
            <p style={{ fontSize: "0.76rem", color: "var(--text-muted)", margin: "2px 0 0" }}>
              Manage contactless kiosk orders, payments, invoices, and fulfillment
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={fetchOrders}
          disabled={isLoading || isRefreshing}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.45rem",
            padding: "0.5rem 0.95rem",
            borderRadius: "9px",
            border: "1px solid var(--border-card)",
            background: "var(--bg-tertiary)",
            color: "var(--text-main)",
            fontSize: "0.78rem",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          <RefreshCw size={14} style={{ animation: isRefreshing ? "spin 1s linear infinite" : "none" }} />
          <span>Refresh</span>
        </button>
      </div>

      {/* 2. Operational KPI Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "0.85rem",
        }}
      >
        {/* Total Self Service Orders */}
        <div
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border-card)",
            borderRadius: "12px",
            padding: "1rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div style={{ fontSize: "0.7rem", fontWeight: 750, color: "var(--text-muted)", textTransform: "uppercase" }}>
              Total Self Service Orders
            </div>
            <div style={{ fontSize: "1.4rem", fontWeight: 850, color: "var(--text-main)", marginTop: "2px" }}>
              {totalOrders}
            </div>
            <div style={{ fontSize: "0.68rem", color: "var(--text-dim)", marginTop: "2px" }}>
              All time kiosk orders
            </div>
          </div>
          <div
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "10px",
              background: "rgba(56, 189, 248, 0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--info, #38bdf8)",
            }}
          >
            <Smartphone size={20} />
          </div>
        </div>

        {/* Self Service Revenue */}
        <div
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border-card)",
            borderRadius: "12px",
            padding: "1rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div style={{ fontSize: "0.7rem", fontWeight: 750, color: "var(--text-muted)", textTransform: "uppercase" }}>
              Self Service Revenue
            </div>
            <div style={{ fontSize: "1.4rem", fontWeight: 850, color: "var(--accent-amber-light)", marginTop: "2px" }}>
              {formatCurrency(totalRevenue)}
            </div>
            <div style={{ fontSize: "0.68rem", color: "var(--text-dim)", marginTop: "2px" }}>
              Today: {formatCurrency(todayRevenue)}
            </div>
          </div>
          <div
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "10px",
              background: "color-mix(in srgb, var(--accent-amber) 15%, transparent)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--accent-amber)",
            }}
          >
            <IndianRupee size={20} />
          </div>
        </div>

        {/* Paid Orders */}
        <div
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border-card)",
            borderRadius: "12px",
            padding: "1rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div style={{ fontSize: "0.7rem", fontWeight: 750, color: "var(--text-muted)", textTransform: "uppercase" }}>
              Paid Orders
            </div>
            <div style={{ fontSize: "1.4rem", fontWeight: 850, color: "var(--success)", marginTop: "2px" }}>
              {paidOrdersCount}
            </div>
            <div style={{ fontSize: "0.68rem", color: "var(--text-dim)", marginTop: "2px" }}>
              Settled &amp; confirmed
            </div>
          </div>
          <div
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "10px",
              background: "rgba(16, 185, 129, 0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--success)",
            }}
          >
            <CheckCircle2 size={20} />
          </div>
        </div>

        {/* Average Order Value */}
        <div
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border-card)",
            borderRadius: "12px",
            padding: "1rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div style={{ fontSize: "0.7rem", fontWeight: 750, color: "var(--text-muted)", textTransform: "uppercase" }}>
              Avg. Order Value
            </div>
            <div style={{ fontSize: "1.4rem", fontWeight: 850, color: "var(--text-main)", marginTop: "2px" }}>
              {formatCurrency(avgOrderValue)}
            </div>
            <div style={{ fontSize: "0.68rem", color: "var(--text-dim)", marginTop: "2px" }}>
              Per transaction
            </div>
          </div>
          <div
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "10px",
              background: "rgba(99, 102, 241, 0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--accent-indigo)",
            }}
          >
            <FileText size={20} />
          </div>
        </div>
      </div>

      {/* 3. Filter Bar & Search */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "0.85rem",
          flexWrap: "wrap",
          padding: "0.85rem",
          background: "var(--bg-secondary)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "12px",
        }}
      >
        {/* Search */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.45rem",
            padding: "0 0.75rem",
            height: "38px",
            background: "var(--bg-tertiary)",
            border: "1px solid var(--border-card)",
            borderRadius: "8px",
            flex: "1 1 240px",
            maxWidth: "360px",
          }}
        >
          <Search size={15} color="var(--text-muted)" />
          <input
            type="text"
            placeholder="Search by order #, invoice #, dish name..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            style={{
              width: "100%",
              border: "none",
              background: "transparent",
              outline: "none",
              color: "var(--text-main)",
              fontSize: "0.8rem",
            }}
          />
        </div>

        {/* Date Filter */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
          <Calendar size={15} color="var(--accent-amber)" />
          <select
            value={dateFilter}
            onChange={(e) => {
              setDateFilter(e.target.value);
              setCurrentPage(1);
            }}
            style={{
              height: "38px",
              padding: "0 0.75rem",
              borderRadius: "8px",
              border: "1px solid var(--border-card)",
              background: "var(--bg-tertiary)",
              color: "var(--text-main)",
              fontSize: "0.78rem",
              fontWeight: 700,
            }}
          >
            <option value="all">All Dates</option>
            <option value="today">Today Only</option>
          </select>
        </div>

        {/* Payment Status Filter */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
          <Filter size={15} color="var(--accent-amber)" />
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            style={{
              height: "38px",
              padding: "0 0.75rem",
              borderRadius: "8px",
              border: "1px solid var(--border-card)",
              background: "var(--bg-tertiary)",
              color: "var(--text-main)",
              fontSize: "0.78rem",
              fontWeight: 700,
            }}
          >
            <option value="all">All Statuses</option>
            <option value="paid">Paid Orders</option>
            <option value="pending">Pending Payments</option>
          </select>
        </div>
      </div>

      {/* 4. Self Service Orders Table */}
      <div
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border-card)",
          borderRadius: "14px",
          overflow: "hidden",
        }}
      >
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.78rem" }}>
            <thead>
              <tr style={{ background: "var(--bg-tertiary)", borderBottom: "1px solid var(--border-subtle)", color: "var(--text-muted)", fontSize: "0.72rem", fontWeight: 800 }}>
                <th style={{ padding: "0.75rem 1rem" }}>Invoice Number</th>
                <th style={{ padding: "0.75rem 1rem" }}>Order Number</th>
                <th style={{ padding: "0.75rem 1rem" }}>Order Type</th>
                <th style={{ padding: "0.75rem 1rem" }}>Date &amp; Time</th>
                <th style={{ padding: "0.75rem 1rem" }}>Items Purchased</th>
                <th style={{ padding: "0.75rem 1rem" }}>Total Amount</th>
                <th style={{ padding: "0.75rem 1rem" }}>Payment Method</th>
                <th style={{ padding: "0.75rem 1rem" }}>Payment Status</th>
                <th style={{ padding: "0.75rem 1rem", textAlign: "center" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedOrders.map((order, idx) => {
                const invoiceNo = order.invoiceNumber || order.invoiceNo || formatInvoiceNumber(order);
                const orderNo = order.orderNumber || order.orderId || order.id || `SS-${idx + 1}`;
                const itemsCount = (order.items || []).reduce((sum, i) => sum + Number(i.quantity || 1), 0);
                const rawMethod = String(order.paymentMethod || order.paymentMode || "UPI").toUpperCase();
                const rawStatus = String(order.paymentStatus || order.status || "Paid").toLowerCase();
                const isPaid = rawStatus.includes("paid") || rawStatus.includes("settled") || rawStatus.includes("completed");
                const totalAmt = Number(order.grandTotal ?? order.totalAmount ?? order.total ?? 0);
                const dateStr = order.date || order.createdAt ? new Date(order.date || order.createdAt).toLocaleString("en-IN") : "—";

                return (
                  <tr
                    key={order.id || order.orderId || invoiceNo || idx}
                    style={{ borderBottom: "1px solid var(--border-subtle)", transition: "background 0.15s ease" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-tertiary)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    {/* Invoice Number */}
                    <td style={{ padding: "0.75rem 1rem", fontWeight: 800, fontFamily: "monospace", color: "var(--text-main)" }}>
                      {invoiceNo}
                    </td>

                    {/* Order Number */}
                    <td style={{ padding: "0.75rem 1rem", fontWeight: 700, color: "var(--accent-amber-light)" }}>
                      #{orderNo}
                    </td>

                    {/* Order Type */}
                    <td style={{ padding: "0.75rem 1rem" }}>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                          padding: "2px 8px",
                          borderRadius: "12px",
                          background: "rgba(56, 189, 248, 0.15)",
                          border: "1px solid rgba(56, 189, 248, 0.35)",
                          color: "var(--info, #38bdf8)",
                          fontSize: "0.7rem",
                          fontWeight: 800,
                        }}
                      >
                        <Smartphone size={10} />
                        <span>Self Service</span>
                      </span>
                    </td>

                    {/* Date & Time */}
                    <td style={{ padding: "0.75rem 1rem", color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                      {dateStr}
                    </td>

                    {/* Items Purchased */}
                    <td style={{ padding: "0.75rem 1rem" }}>
                      <span style={{ fontWeight: 750, color: "var(--text-main)" }}>
                        {itemsCount} {itemsCount === 1 ? "item" : "items"}
                      </span>
                      <div
                        style={{
                          fontSize: "0.68rem",
                          color: "var(--text-muted)",
                          maxWidth: "180px",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                        title={(order.items || []).map((i) => `${i.name} (x${i.quantity})`).join(", ")}
                      >
                        {(order.items || []).map((i) => i.name).filter(Boolean).join(", ") || "—"}
                      </div>
                    </td>

                    {/* Total Amount */}
                    <td style={{ padding: "0.75rem 1rem", fontWeight: 850, color: "var(--accent-amber-light)", fontSize: "0.85rem" }}>
                      {formatCurrency(totalAmt)}
                    </td>

                    {/* Payment Method */}
                    <td style={{ padding: "0.75rem 1rem" }}>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                          padding: "2px 8px",
                          borderRadius: "20px",
                          fontSize: "0.68rem",
                          fontWeight: 800,
                          background: rawMethod.includes("UPI")
                            ? "rgba(56, 189, 248, 0.15)"
                            : rawMethod.includes("CARD")
                            ? "rgba(99, 102, 241, 0.15)"
                            : "rgba(16, 185, 129, 0.15)",
                          color: rawMethod.includes("UPI")
                            ? "var(--info, #38bdf8)"
                            : rawMethod.includes("CARD")
                            ? "var(--accent-indigo)"
                            : "var(--success)",
                          border: `1px solid ${
                            rawMethod.includes("UPI")
                              ? "rgba(56, 189, 248, 0.3)"
                              : rawMethod.includes("CARD")
                              ? "rgba(99, 102, 241, 0.3)"
                              : "rgba(16, 185, 129, 0.3)"
                          }`,
                        }}
                      >
                        {rawMethod.includes("CARD") ? (
                          <CreditCard size={10} />
                        ) : rawMethod.includes("CASH") ? (
                          <Banknote size={10} />
                        ) : (
                          <QrCode size={10} />
                        )}
                        <span>{rawMethod}</span>
                      </span>
                    </td>

                    {/* Payment Status */}
                    <td style={{ padding: "0.75rem 1rem" }}>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                          padding: "2px 8px",
                          borderRadius: "20px",
                          fontSize: "0.68rem",
                          fontWeight: 800,
                          background: isPaid ? "rgba(16, 185, 129, 0.15)" : "rgba(239, 68, 68, 0.15)",
                          color: isPaid ? "var(--success)" : "var(--danger)",
                          border: isPaid ? "1px solid rgba(16, 185, 129, 0.35)" : "1px solid rgba(239, 68, 68, 0.35)",
                          textTransform: "uppercase",
                        }}
                      >
                        {isPaid ? <CheckCircle2 size={10} /> : <AlertCircle size={10} />}
                        <span>{isPaid ? "Paid" : "Pending"}</span>
                      </span>
                    </td>

                    {/* Actions: View, Print, Download */}
                    <td style={{ padding: "0.75rem 1rem", textAlign: "center" }}>
                      <div style={{ display: "inline-flex", gap: "0.35rem", justifyContent: "center" }}>
                        <button
                          type="button"
                          onClick={() => setSelectedReceipt(order)}
                          title="View Invoice"
                          style={{
                            background: "color-mix(in srgb, var(--accent-amber) 10%, transparent)",
                            border: "1px solid var(--accent-amber)",
                            color: "var(--accent-amber-light)",
                            borderRadius: "6px",
                            padding: "4px 8px",
                            fontSize: "0.72rem",
                            fontWeight: 700,
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "3px",
                          }}
                        >
                          <Eye size={12} />
                          <span>View</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedReceipt(order)}
                          title="Print Invoice"
                          style={{
                            background: "rgba(16, 185, 129, 0.1)",
                            border: "1px solid var(--success)",
                            color: "var(--success)",
                            borderRadius: "6px",
                            padding: "4px 8px",
                            fontSize: "0.72rem",
                            fontWeight: 700,
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "3px",
                          }}
                        >
                          <Printer size={12} />
                          <span>Print</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedReceipt(order)}
                          title="Download Invoice PDF"
                          style={{
                            background: "rgba(99, 102, 241, 0.1)",
                            border: "1px solid var(--accent-indigo)",
                            color: "var(--accent-indigo)",
                            borderRadius: "6px",
                            padding: "4px 8px",
                            fontSize: "0.72rem",
                            fontWeight: 700,
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "3px",
                          }}
                        >
                          <Download size={12} />
                          <span>PDF</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {paginatedOrders.length === 0 && (
                <tr>
                  <td colSpan={9} style={{ textAlign: "center", padding: "3rem 1rem", color: "var(--text-muted)" }}>
                    <Smartphone size={36} style={{ margin: "0 auto 0.5rem", opacity: 0.4 }} />
                    <div style={{ fontWeight: 700, color: "var(--text-main)", fontSize: "0.9rem" }}>
                      No Self Service orders found
                    </div>
                    <div style={{ fontSize: "0.74rem", marginTop: "3px" }}>
                      Orders placed at the Self Service Kiosk will appear here in real time.
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div
            style={{
              padding: "0.75rem 1rem",
              borderTop: "1px solid var(--border-subtle)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span style={{ fontSize: "0.74rem", color: "var(--text-muted)" }}>
              Page {currentPage} of {totalPages} ({filteredOrders.length} total orders)
            </span>
            <div style={{ display: "flex", gap: "0.4rem" }}>
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                style={{
                  padding: "4px 10px",
                  borderRadius: "6px",
                  border: "1px solid var(--border-subtle)",
                  background: "var(--bg-tertiary)",
                  color: "var(--text-main)",
                  cursor: currentPage === 1 ? "not-allowed" : "pointer",
                  fontSize: "0.74rem",
                }}
              >
                Previous
              </button>
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                style={{
                  padding: "4px 10px",
                  borderRadius: "6px",
                  border: "1px solid var(--border-subtle)",
                  background: "var(--bg-tertiary)",
                  color: "var(--text-main)",
                  cursor: currentPage === totalPages ? "not-allowed" : "pointer",
                  fontSize: "0.74rem",
                }}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 5. Receipt Modal for View / Print / PDF */}
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
    </div>
  );
}
