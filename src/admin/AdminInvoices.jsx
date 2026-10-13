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
} from "lucide-react";
import { formatCurrency } from "../utils/formatCurrency";
import { INITIAL_ORDERS } from "../data/initialOrders";

export function AdminInvoices({ pastOrders = [] }) {
  const allOrders = pastOrders && pastOrders.length > 0 ? pastOrders : INITIAL_ORDERS;
  const [searchTerm, setSearchTerm] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [selectedReceipt, setSelectedReceipt] = useState(null);

  const filteredOrders = allOrders.filter((order) => {
    const matchesPayment =
      paymentFilter === "all" ||
      String(order.paymentMethod || "").toLowerCase() === paymentFilter.toLowerCase();

    const query = searchTerm.toLowerCase();
    const matchesSearch =
      (order.invoiceNo || "").toLowerCase().includes(query) ||
      (order.tableName || "").toLowerCase().includes(query) ||
      (order.server || "").toLowerCase().includes(query);

    return matchesPayment && matchesSearch;
  });

  const totalCollected = filteredOrders.reduce(
    (sum, o) => sum + (Number(o.grandTotal) || 0),
    0
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
          background: "#0d1527",
          border: "1px solid rgba(255, 255, 255, 0.08)",
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
          <div style={{ display: "flex", alignItems: "center", gap: "0.85rem" }}>
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
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                <h2
                  style={{
                    fontSize: "1.35rem",
                    fontWeight: 800,
                    color: "#ffffff",
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
                  {allOrders.length} invoices
                </span>
              </div>
              <p
                style={{
                  fontSize: "0.8rem",
                  color: "#94a3b8",
                  margin: "3px 0 0 0",
                }}
              >
                Detailed receipts, taxes, payment modes and customer settlement records
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
              color="#64748b"
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
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: "100%",
                height: "100%",
                background: "#080d1a",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                borderRadius: "9px",
                padding: "0 12px 0 36px",
                color: "#ffffff",
                fontSize: "0.82rem",
                outline: "none",
              }}
            />
          </div>
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
                onClick={() => setPaymentFilter(mode)}
                style={{
                  background:
                    paymentFilter === mode
                      ? "rgba(245, 158, 11, 0.2)"
                      : "rgba(255, 255, 255, 0.03)",
                  border:
                    paymentFilter === mode
                      ? "1px solid #f59e0b"
                      : "1px solid rgba(255, 255, 255, 0.08)",
                  color: paymentFilter === mode ? "#fbbf24" : "#94a3b8",
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
              color: "#94a3b8",
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
            border: "1px solid rgba(255, 255, 255, 0.08)",
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
                  borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
                  background: "rgba(255, 255, 255, 0.02)",
                  color: "#94a3b8",
                  fontSize: "0.8rem",
                  fontWeight: 600,
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
              {filteredOrders.map((order, idx) => {
                const pMode = String(order.paymentMethod || "cash").toLowerCase();
                const itemCount = (order.items || []).reduce(
                  (sum, i) => sum + (i.quantity || 1),
                  0
                );

                return (
                  <tr
                    key={order.invoiceNo || idx}
                    style={{
                      borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
                      transition: "background 0.15s ease",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background =
                        "rgba(255, 255, 255, 0.02)")
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
                          color: "#ffffff",
                          fontSize: "0.88rem",
                        }}
                      >
                        {order.invoiceNo || `INV-${1000 + idx}`}
                      </span>
                    </td>

                    {/* Table & Server */}
                    <td style={{ padding: "1rem" }}>
                      <div style={{ fontWeight: 700, color: "#ffffff" }}>
                        {order.tableName || `Table ${order.tableId || 1}`}
                      </div>
                      <div
                        style={{
                          fontSize: "0.72rem",
                          color: "#64748b",
                          marginTop: "2px",
                        }}
                      >
                        Waiter: {order.server || "Staff"}
                      </div>
                    </td>

                    {/* Date & Time */}
                    <td style={{ padding: "1rem" }}>
                      <div style={{ color: "#cbd5e1" }}>
                        {order.date || "Today"}
                      </div>
                      <div
                        style={{
                          fontSize: "0.72rem",
                          color: "#64748b",
                          marginTop: "2px",
                        }}
                      >
                        {order.settledAt || order.orderTime || "12:00 PM"}
                      </div>
                    </td>

                    {/* Items */}
                    <td style={{ padding: "1rem", color: "#94a3b8" }}>
                      <span>{itemCount} items</span>
                      <div
                        style={{
                          fontSize: "0.7rem",
                          color: "#64748b",
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
            </tbody>
          </table>
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
                <div style={{ display: "flex", justifyContent: "space-between" }}>
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
