import React, { useState, useEffect } from "react";
import {
  Wallet,
  Building2,
  ArrowDownLeft,
  ArrowUpRight,
  Calculator,
  Save,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Calendar,
  Lock,
  Unlock,
  Printer,
  FileSpreadsheet,
} from "lucide-react";
import { formatCurrency, roundCurrency } from "../../utils/formatCurrency";
import {
  getDailyBalances,
  saveDailyBalances,
  exportToCSV,
  printFinancialReport,
} from "./accountingService";

export function DailyBalanceRegister({ orders = [], inventoryPurchases = [], salaryPayments = [] }) {
  const [selectedDate, setSelectedDate] = useState(() => {
    return new Date().toISOString().slice(0, 10);
  });

  const [balances, setBalances] = useState(() => getDailyBalances());
  const [openingCash, setOpeningCash] = useState(5000);
  const [openingBank, setOpeningBank] = useState(25000);
  const [actualCashCounted, setActualCashCounted] = useState(0);
  const [isDayClosed, setIsDayClosed] = useState(false);
  const [closureNotes, setClosureNotes] = useState("");
  const [saveMessage, setSaveMessage] = useState("");

  // Calculate day-specific inflows from orders
  const dayOrders = orders.filter((o) => {
    const isSettled = String(o?.status || o?.Status || "").toLowerCase() === "settled" || o?.isPaid;
    if (!isSettled) return false;
    const dStr = o.settledDate || o.date || o.createdAt || "";
    return dStr.startsWith(selectedDate);
  });

  const cashInflow = roundCurrency(
    dayOrders
      .filter((o) => {
        const pm = String(o.paymentMode || o.paymentMethod || o.PaymentMethod || "").toLowerCase();
        return pm === "cash";
      })
      .reduce((sum, o) => sum + (Number(o.grandTotal ?? o.totalAmount ?? o.total ?? o.paidAmount ?? 0) || 0), 0)
  );

  const upiInflow = roundCurrency(
    dayOrders
      .filter((o) => {
        const pm = String(o.paymentMode || o.paymentMethod || o.PaymentMethod || "").toLowerCase();
        return pm.includes("upi") || pm.includes("card") || pm.includes("online");
      })
      .reduce((sum, o) => sum + (Number(o.grandTotal ?? o.totalAmount ?? o.total ?? o.paidAmount ?? 0) || 0), 0)
  );

  const totalInflow = roundCurrency(cashInflow + upiInflow);

  // Day outflows (purchases & salaries paid today)
  const dayPurchases = (inventoryPurchases || []).filter((p) => {
    const d = p.purchaseDate || p.date || p.createdAt || "";
    return d.startsWith(selectedDate);
  });
  const cashOutflow = roundCurrency(
    dayPurchases
      .filter((p) => String(p.paymentMethod || p.paymentMode || "").toLowerCase().includes("cash"))
      .reduce((sum, p) => sum + (Number(p.totalAmount ?? p.amount ?? 0) || 0), 0)
  );
  const bankOutflow = roundCurrency(
    dayPurchases
      .filter((p) => !String(p.paymentMethod || p.paymentMode || "").toLowerCase().includes("cash"))
      .reduce((sum, p) => sum + (Number(p.totalAmount ?? p.amount ?? 0) || 0), 0)
  );

  const totalOutflow = roundCurrency(cashOutflow + bankOutflow);

  // System computed balances
  const systemClosingCash = roundCurrency(openingCash + cashInflow - cashOutflow);
  const systemClosingBank = roundCurrency(openingBank + upiInflow - bankOutflow);
  const totalClosingBalance = roundCurrency(systemClosingCash + systemClosingBank);

  // Discrepancy / Variance
  const cashVariance = roundCurrency(actualCashCounted > 0 ? actualCashCounted - systemClosingCash : 0);

  // Load existing saved record for selected date if exists
  useEffect(() => {
    const existing = balances.find((b) => b.date === selectedDate);
    if (existing) {
      setOpeningCash(existing.openingCash ?? 5000);
      setOpeningBank(existing.openingBank ?? 25000);
      setActualCashCounted(existing.actualCashCounted ?? existing.closingCash ?? 0);
      setIsDayClosed(Boolean(existing.isClosed));
      setClosureNotes(existing.notes || "");
    } else {
      // Find previous day's closing to auto-roll opening
      const sorted = [...balances].sort((a, b) => new Date(b.date) - new Date(a.date));
      const prev = sorted.find((b) => b.date < selectedDate);
      if (prev) {
        setOpeningCash(prev.closingCash || 5000);
        setOpeningBank(prev.closingBank || 25000);
      }
      setIsDayClosed(false);
      setClosureNotes("");
    }
  }, [selectedDate, balances]);

  const handleSaveRegister = (closeDay = false) => {
    const record = {
      date: selectedDate,
      openingCash: roundCurrency(openingCash),
      openingBank: roundCurrency(openingBank),
      cashInflow,
      upiInflow,
      totalInflow,
      cashOutflow,
      bankOutflow,
      totalOutflow,
      systemClosingCash,
      systemClosingBank,
      closingCash: actualCashCounted > 0 ? roundCurrency(actualCashCounted) : systemClosingCash,
      closingBank: systemClosingBank,
      totalClosing: roundCurrency((actualCashCounted > 0 ? actualCashCounted : systemClosingCash) + systemClosingBank),
      actualCashCounted: roundCurrency(actualCashCounted),
      cashVariance,
      isClosed: closeDay || isDayClosed,
      closedAt: closeDay ? new Date().toISOString() : null,
      notes: closureNotes.trim(),
    };

    const nextBalances = [
      ...balances.filter((b) => b.date !== selectedDate),
      record,
    ].sort((a, b) => new Date(b.date) - new Date(a.date));

    setBalances(nextBalances);
    saveDailyBalances(nextBalances);
    setIsDayClosed(record.isClosed);
    setSaveMessage(closeDay ? "✅ Register Closed & Locked for Today!" : "✅ Daily Balances Saved Successfully!");
    setTimeout(() => setSaveMessage(""), 3500);
  };

  const handleExportCSV = () => {
    const headers = [
      "Date",
      "Opening Cash (₹)",
      "Opening Bank (₹)",
      "Cash Inflow (₹)",
      "UPI Inflow (₹)",
      "Total Inflow (₹)",
      "Cash Outflow (₹)",
      "Bank Outflow (₹)",
      "System Closing Cash (₹)",
      "System Closing Bank (₹)",
      "Actual Cash (₹)",
      "Variance (₹)",
      "Status",
    ];
    const rows = balances.map((b) => [
      b.date,
      b.openingCash,
      b.openingBank,
      b.cashInflow,
      b.upiInflow,
      b.totalInflow,
      b.cashOutflow,
      b.bankOutflow,
      b.systemClosingCash,
      b.systemClosingBank,
      b.actualCashCounted,
      b.cashVariance,
      b.isClosed ? "Closed" : "Open",
    ]);
    exportToCSV(`Daily_Balance_Register_${selectedDate}`, headers, rows);
  };

  const handlePrint = () => {
    const html = `
      <table border="1" cellpadding="6" cellspacing="0" style="width:100%; border-collapse:collapse; margin-top:15px;">
        <thead>
          <tr style="background:#f1f5f9;">
            <th>Date</th>
            <th>Opening Cash</th>
            <th>Opening Bank</th>
            <th>Inflow (Sales)</th>
            <th>Outflow (Expenses)</th>
            <th>System Closing Cash</th>
            <th>Actual Cash Counted</th>
            <th>Variance</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${balances
            .map(
              (b) => `
            <tr>
              <td>${b.date}</td>
              <td class="text-right">₹${Number(b.openingCash).toLocaleString("en-IN")}</td>
              <td class="text-right">₹${Number(b.openingBank).toLocaleString("en-IN")}</td>
              <td class="text-right">₹${Number(b.totalInflow).toLocaleString("en-IN")}</td>
              <td class="text-right">₹${Number(b.totalOutflow).toLocaleString("en-IN")}</td>
              <td class="text-right">₹${Number(b.systemClosingCash).toLocaleString("en-IN")}</td>
              <td class="text-right">₹${Number(b.actualCashCounted || b.systemClosingCash).toLocaleString("en-IN")}</td>
              <td class="text-right" style="color:${Number(b.cashVariance) < 0 ? "#dc2626" : "#16a34a"}">₹${Number(b.cashVariance || 0).toLocaleString("en-IN")}</td>
              <td class="text-center">${b.isClosed ? "Closed" : "Open"}</td>
            </tr>
          `
            )
            .join("")}
        </tbody>
      </table>
    `;
    printFinancialReport("Daily Cash & Bank Register", `Date: ${selectedDate}`, html);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", width: "100%" }}>
      {/* Top Header Card */}
      <div
        style={{
          background: "var(--bg-secondary)",
          border: "1px solid var(--border-card)",
          borderRadius: "14px",
          padding: "1.25rem 1.5rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <h2 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 800, color: "var(--text-main)" }}>
              Daily Cash &amp; Bank Register
            </h2>
            {isDayClosed ? (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                  fontSize: "0.72rem",
                  fontWeight: 700,
                  color: "#10b981",
                  background: "rgba(16, 185, 129, 0.15)",
                  border: "1px solid rgba(16, 185, 129, 0.3)",
                  padding: "2px 8px",
                  borderRadius: "20px",
                }}
              >
                <Lock size={12} /> Shift Closed &amp; Reconciled
              </span>
            ) : (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                  fontSize: "0.72rem",
                  fontWeight: 700,
                  color: "#f59e0b",
                  background: "rgba(245, 158, 11, 0.15)",
                  border: "1px solid rgba(245, 158, 11, 0.3)",
                  padding: "2px 8px",
                  borderRadius: "20px",
                }}
              >
                <Unlock size={12} /> Live / Open Shift
              </span>
            )}
          </div>
          <p style={{ margin: "4px 0 0", fontSize: "0.8rem", color: "var(--text-muted)" }}>
            Track Opening Float, Daily Real-Time Inflows/Outflows, Physical Cash Count &amp; Closing Balances
          </p>
        </div>

        {/* Action Controls */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flexWrap: "wrap" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              background: "var(--bg-tertiary)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "8px",
              padding: "0.4rem 0.75rem",
            }}
          >
            <Calendar size={14} color="var(--text-muted)" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              style={{
                background: "transparent",
                border: "none",
                color: "var(--text-main)",
                fontSize: "0.82rem",
                fontWeight: 600,
                outline: "none",
                cursor: "pointer",
              }}
            />
          </div>

          <button
            type="button"
            onClick={handleExportCSV}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "5px",
              padding: "0.45rem 0.85rem",
              background: "rgba(16, 185, 129, 0.12)",
              color: "#10b981",
              border: "1px solid rgba(16, 185, 129, 0.3)",
              borderRadius: "8px",
              fontSize: "0.78rem",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            <FileSpreadsheet size={14} /> Export CSV
          </button>

          <button
            type="button"
            onClick={handlePrint}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "5px",
              padding: "0.45rem 0.85rem",
              background: "var(--bg-tertiary)",
              color: "var(--text-main)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "8px",
              fontSize: "0.78rem",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            <Printer size={14} /> Print Register
          </button>
        </div>
      </div>

      {saveMessage && (
        <div
          style={{
            padding: "0.75rem 1rem",
            background: "rgba(16, 185, 129, 0.15)",
            border: "1px solid rgba(16, 185, 129, 0.4)",
            borderRadius: "8px",
            color: "#10b981",
            fontWeight: 700,
            fontSize: "0.85rem",
          }}
        >
          {saveMessage}
        </div>
      )}

      {/* 4 Primary Flow Cards (Opening -> Inflow -> Outflow -> Closing) */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
          gap: "1rem",
        }}
      >
        {/* 1. Opening Balance */}
        <div
          style={{
            background: "var(--bg-secondary)",
            border: "1px solid var(--border-card)",
            borderRadius: "12px",
            padding: "1.1rem 1.25rem",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>
              1. Opening Balance
            </span>
            <Wallet size={16} color="#f59e0b" />
          </div>
          <div style={{ margin: "0.6rem 0" }}>
            <div style={{ fontSize: "1.5rem", fontWeight: 900, color: "#f59e0b" }}>
              {formatCurrency(openingCash + openingBank)}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "4px" }}>
              <span>Cash Float: {formatCurrency(openingCash)}</span>
              <span>Bank: {formatCurrency(openingBank)}</span>
            </div>
          </div>
          <div style={{ fontSize: "0.7rem", color: "var(--text-dim)" }}>
            Brought forward at 08:00 AM shift start
          </div>
        </div>

        {/* 2. Total Inflows (Sales) */}
        <div
          style={{
            background: "var(--bg-secondary)",
            border: "1px solid var(--border-card)",
            borderRadius: "12px",
            padding: "1.1rem 1.25rem",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>
              2. Total Inflow (Sales)
            </span>
            <ArrowDownLeft size={16} color="#10b981" />
          </div>
          <div style={{ margin: "0.6rem 0" }}>
            <div style={{ fontSize: "1.5rem", fontWeight: 900, color: "#10b981" }}>
              +{formatCurrency(totalInflow)}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "4px" }}>
              <span>Cash: {formatCurrency(cashInflow)}</span>
              <span>UPI / Bank: {formatCurrency(upiInflow)}</span>
            </div>
          </div>
          <div style={{ fontSize: "0.7rem", color: "var(--text-dim)" }}>
            {dayOrders.length} settled receipts today
          </div>
        </div>

        {/* 3. Total Outflows (Purchases & Wages) */}
        <div
          style={{
            background: "var(--bg-secondary)",
            border: "1px solid var(--border-card)",
            borderRadius: "12px",
            padding: "1.1rem 1.25rem",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>
              3. Total Outflow (Expenses)
            </span>
            <ArrowUpRight size={16} color="#ef4444" />
          </div>
          <div style={{ margin: "0.6rem 0" }}>
            <div style={{ fontSize: "1.5rem", fontWeight: 900, color: "#ef4444" }}>
              -{formatCurrency(totalOutflow)}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "4px" }}>
              <span>Cash Out: {formatCurrency(cashOutflow)}</span>
              <span>Bank Out: {formatCurrency(bankOutflow)}</span>
            </div>
          </div>
          <div style={{ fontSize: "0.7rem", color: "var(--text-dim)" }}>
            Purchases &amp; petty payments
          </div>
        </div>

        {/* 4. Calculated Closing Balance */}
        <div
          style={{
            background: "var(--bg-secondary)",
            border: "1px solid var(--border-card)",
            borderRadius: "12px",
            padding: "1.1rem 1.25rem",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>
              4. Closing Balance
            </span>
            <Building2 size={16} color="#3b82f6" />
          </div>
          <div style={{ margin: "0.6rem 0" }}>
            <div style={{ fontSize: "1.5rem", fontWeight: 900, color: "#3b82f6" }}>
              {formatCurrency(totalClosingBalance)}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "4px" }}>
              <span>Cash: {formatCurrency(systemClosingCash)}</span>
              <span>Bank: {formatCurrency(systemClosingBank)}</span>
            </div>
          </div>
          <div style={{ fontSize: "0.7rem", color: "var(--text-dim)" }}>
            Expected balance before day closure
          </div>
        </div>
      </div>

      {/* Reconciliation Drawer & Input Panel */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: "1.25rem",
        }}
      >
        {/* Left: Opening Balance Adjustment */}
        <div
          style={{
            background: "var(--bg-secondary)",
            border: "1px solid var(--border-card)",
            borderRadius: "14px",
            padding: "1.25rem",
          }}
        >
          <h3 style={{ margin: "0 0 1rem", fontSize: "0.95rem", fontWeight: 800, color: "var(--text-main)" }}>
            Shift Opening Float Settings
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "4px", fontWeight: 600 }}>
                Opening Cash Drawer Float (₹)
              </label>
              <input
                type="number"
                disabled={isDayClosed}
                value={openingCash}
                onChange={(e) => setOpeningCash(Number(e.target.value) || 0)}
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  background: "var(--bg-tertiary)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "8px",
                  padding: "0.55rem 0.8rem",
                  color: "var(--text-main)",
                  fontSize: "0.95rem",
                  fontWeight: 700,
                  outline: "none",
                }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "4px", fontWeight: 600 }}>
                Opening Bank Account Balance (₹)
              </label>
              <input
                type="number"
                disabled={isDayClosed}
                value={openingBank}
                onChange={(e) => setOpeningBank(Number(e.target.value) || 0)}
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  background: "var(--bg-tertiary)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "8px",
                  padding: "0.55rem 0.8rem",
                  color: "var(--text-main)",
                  fontSize: "0.95rem",
                  fontWeight: 700,
                  outline: "none",
                }}
              />
            </div>
          </div>
        </div>

        {/* Right: End-of-Day Physical Cash Audit & Closing */}
        <div
          style={{
            background: "var(--bg-secondary)",
            border: "1px solid var(--border-card)",
            borderRadius: "14px",
            padding: "1.25rem",
          }}
        >
          <h3 style={{ margin: "0 0 1rem", fontSize: "0.95rem", fontWeight: 800, color: "var(--text-main)" }}>
            Physical Cash Audit &amp; Day Closure
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "4px", fontWeight: 600 }}>
                Actual Physical Cash Counted (₹)
              </label>
              <input
                type="number"
                disabled={isDayClosed}
                placeholder={`Expected: ₹${systemClosingCash}`}
                value={actualCashCounted || ""}
                onChange={(e) => setActualCashCounted(Number(e.target.value) || 0)}
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  background: "var(--bg-tertiary)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "8px",
                  padding: "0.55rem 0.8rem",
                  color: "var(--text-main)",
                  fontSize: "0.95rem",
                  fontWeight: 700,
                  outline: "none",
                }}
              />
            </div>

            {actualCashCounted > 0 && (
              <div
                style={{
                  padding: "0.6rem 0.85rem",
                  borderRadius: "8px",
                  background: cashVariance === 0 ? "rgba(16, 185, 129, 0.12)" : cashVariance > 0 ? "rgba(59, 130, 246, 0.12)" : "rgba(239, 68, 68, 0.12)",
                  border: `1px solid ${cashVariance === 0 ? "#10b981" : cashVariance > 0 ? "#3b82f6" : "#ef4444"}`,
                  fontSize: "0.8rem",
                  fontWeight: 700,
                  color: cashVariance === 0 ? "#10b981" : cashVariance > 0 ? "#3b82f6" : "#ef4444",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span>
                  {cashVariance === 0
                    ? "Exact Match (No Discrepancy)"
                    : cashVariance > 0
                    ? `Cash Surplus (Excess)`
                    : `Cash Shortage (Deficit)`}
                </span>
                <span>{cashVariance >= 0 ? `+₹${cashVariance}` : `-₹${Math.abs(cashVariance)}`}</span>
              </div>
            )}

            <div>
              <label style={{ display: "block", fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "4px", fontWeight: 600 }}>
                Reconciliation / Shift Notes
              </label>
              <input
                type="text"
                disabled={isDayClosed}
                placeholder="e.g. ₹200 petty cash paid for mint leaves, settled shift smoothly"
                value={closureNotes}
                onChange={(e) => setClosureNotes(e.target.value)}
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  background: "var(--bg-tertiary)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "8px",
                  padding: "0.55rem 0.8rem",
                  color: "var(--text-main)",
                  fontSize: "0.82rem",
                  outline: "none",
                }}
              />
            </div>

            <div style={{ display: "flex", gap: "0.75rem", marginTop: "4px" }}>
              <button
                type="button"
                onClick={() => handleSaveRegister(false)}
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  padding: "0.55rem",
                  background: "var(--bg-tertiary)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "8px",
                  color: "var(--text-main)",
                  fontWeight: 700,
                  fontSize: "0.82rem",
                  cursor: "pointer",
                }}
              >
                <Save size={14} /> Save Draft
              </button>

              <button
                type="button"
                onClick={() => handleSaveRegister(true)}
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  padding: "0.55rem",
                  background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                  border: "none",
                  borderRadius: "8px",
                  color: "#ffffff",
                  fontWeight: 700,
                  fontSize: "0.82rem",
                  cursor: "pointer",
                  boxShadow: "0 2px 8px rgba(16, 185, 129, 0.35)",
                }}
              >
                <Lock size={14} /> Reconcile &amp; Close Day
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
