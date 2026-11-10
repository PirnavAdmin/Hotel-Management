import React, { useState } from "react";
import {
  FileText,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  Printer,
  Calendar,
  Save,
  Search,
  BookOpen,
} from "lucide-react";
import { formatCurrency, roundCurrency } from "../../utils/formatCurrency";
import {
  getChartOfAccounts,
  getJournalEntries,
  saveJournalEntries,
  exportToCSV,
  printFinancialReport,
} from "./accountingService";

export function JournalEntriesView({ currentSession }) {
  const chartOfAccounts = getChartOfAccounts();
  const [entries, setEntries] = useState(() => getJournalEntries());
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  // New Voucher form state
  const [voucherDate, setVoucherDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [narration, setNarration] = useState("");
  const [lines, setLines] = useState([
    { accountCode: "5003", accountName: "Restaurant Rent", debit: 25000, credit: 0, description: "Monthly lease" },
    { accountCode: "1002", accountName: "Bank & UPI Collections", debit: 0, credit: 25000, description: "Bank transfer" },
  ]);
  const [formError, setFormError] = useState("");

  // Calculate live Dr/Cr balance
  const totalDebit = roundCurrency(lines.reduce((sum, l) => sum + (Number(l.debit) || 0), 0));
  const totalCredit = roundCurrency(lines.reduce((sum, l) => sum + (Number(l.credit) || 0), 0));
  const difference = roundCurrency(Math.abs(totalDebit - totalCredit));
  const isBalanced = difference === 0 && totalDebit > 0;

  const handleAddLine = () => {
    setLines((prev) => [
      ...prev,
      { accountCode: chartOfAccounts[0]?.code || "1001", accountName: chartOfAccounts[0]?.name || "Cash in Hand", debit: 0, credit: 0, description: "" },
    ]);
  };

  const handleRemoveLine = (idx) => {
    if (lines.length <= 2) {
      setFormError("A double-entry journal entry requires at least 2 lines (Dr and Cr).");
      return;
    }
    setLines((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleLineChange = (idx, field, value) => {
    setLines((prev) =>
      prev.map((l, i) => {
        if (i !== idx) return l;
        if (field === "accountCode") {
          const acc = chartOfAccounts.find((a) => a.code === value);
          return { ...l, accountCode: value, accountName: acc?.name || "Account" };
        }
        return { ...l, [field]: value };
      })
    );
  };

  const handleSaveVoucher = (e) => {
    e.preventDefault();
    if (!narration.trim()) {
      setFormError("Please enter a narration/description for this journal voucher.");
      return;
    }
    if (!isBalanced) {
      setFormError(`Cannot save unbalanced voucher. Total Debits (₹${totalDebit}) must equal Total Credits (₹${totalCredit}).`);
      return;
    }

    const nextVoucherNum = `JV-2026-${String(entries.length + 1).padStart(3, "0")}`;
    const newEntry = {
      id: nextVoucherNum,
      voucherNumber: nextVoucherNum,
      date: voucherDate,
      narration: narration.trim(),
      lines: lines.map((l) => ({
        accountCode: l.accountCode,
        accountName: l.accountName,
        debit: Number(l.debit) || 0,
        credit: Number(l.credit) || 0,
        description: l.description || narration.trim(),
      })),
      createdBy: currentSession?.name || currentSession?.username || "Admin",
      createdAt: new Date().toISOString(),
      amount: totalDebit,
    };

    const nextEntries = [newEntry, ...entries];
    setEntries(nextEntries);
    saveJournalEntries(nextEntries);
    setIsModalOpen(false);
    setNarration("");
    setFormError("");
  };

  const filteredEntries = entries.filter((entry) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      entry.voucherNumber?.toLowerCase().includes(q) ||
      entry.narration?.toLowerCase().includes(q) ||
      entry.lines?.some((l) => l.accountName?.toLowerCase().includes(q) || l.accountCode?.includes(q))
    );
  });

  // Export CSV
  const handleExportCSV = () => {
    const headers = ["Voucher Number", "Date", "Narration", "Account Code", "Account Name", "Debit (₹)", "Credit (₹)", "Author"];
    const rows = [];
    filteredEntries.forEach((e) => {
      e.lines.forEach((l) => {
        rows.push([e.voucherNumber, e.date, e.narration, l.accountCode, l.accountName, l.debit, l.credit, e.createdBy]);
      });
    });
    exportToCSV("Journal_Entries_Register", headers, rows);
  };

  // Export PDF / Print
  const handlePrint = () => {
    const html = `
      <table border="1" cellpadding="6" cellspacing="0" style="width:100%; border-collapse:collapse; margin-top:15px; font-size:11.5px;">
        <thead>
          <tr style="background:#f1f5f9;">
            <th>Voucher #</th>
            <th>Date</th>
            <th>Account Code</th>
            <th>Account Name</th>
            <th class="text-right">Debit (₹)</th>
            <th class="text-right">Credit (₹)</th>
            <th>Narration</th>
          </tr>
        </thead>
        <tbody>
          ${filteredEntries
            .map((e) =>
              e.lines
                .map(
                  (l, idx) => `
              <tr>
                <td class="font-bold">${idx === 0 ? e.voucherNumber : ""}</td>
                <td>${idx === 0 ? e.date : ""}</td>
                <td>${l.accountCode}</td>
                <td>${l.accountName}</td>
                <td class="text-right">${l.debit > 0 ? "₹" + Number(l.debit).toLocaleString("en-IN") : "-"}</td>
                <td class="text-right">${l.credit > 0 ? "₹" + Number(l.credit).toLocaleString("en-IN") : "-"}</td>
                <td>${idx === 0 ? e.narration : ""}</td>
              </tr>
            `
                )
                .join("")
            )
            .join("")}
        </tbody>
      </table>
    `;
    printFinancialReport("Journal Entries Register", "Double-Entry Audit Register", html);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", width: "100%" }}>
      {/* Header */}
      <div
        style={{
          background: "var(--bg-secondary)",
          border: "1px solid var(--border-card)",
          borderRadius: "14px",
          padding: "1.25rem",
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
              Journal Entries (JV)
            </h2>
            <span
              style={{
                fontSize: "0.72rem",
                fontWeight: 700,
                color: "#10b981",
                background: "rgba(16, 185, 129, 0.15)",
                border: "1px solid rgba(16, 185, 129, 0.3)",
                padding: "2px 8px",
                borderRadius: "20px",
              }}
            >
              Double-Entry Vouchers
            </span>
          </div>
          <p style={{ margin: "3px 0 0", fontSize: "0.8rem", color: "var(--text-muted)" }}>
            Manual adjustments, partner capital infusions, asset purchases &amp; depreciation entries
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "5px",
              padding: "0.45rem 0.95rem",
              background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
              color: "#ffffff",
              border: "none",
              borderRadius: "8px",
              fontSize: "0.78rem",
              fontWeight: 700,
              cursor: "pointer",
              boxShadow: "0 2px 6px rgba(16, 185, 129, 0.3)",
            }}
          >
            <Plus size={14} /> New Journal Voucher
          </button>

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
            <Printer size={14} /> Print
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
        <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 700 }}>
          Total Vouchers: <span style={{ color: "var(--text-main)" }}>{filteredEntries.length}</span>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            background: "var(--bg-secondary)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "8px",
            padding: "0.35rem 0.75rem",
            width: "260px",
          }}
        >
          <Search size={14} color="var(--text-muted)" />
          <input
            type="text"
            placeholder="Search voucher # or narration..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--text-main)",
              fontSize: "0.78rem",
              width: "100%",
              outline: "none",
            }}
          />
        </div>
      </div>

      {/* Vouchers Cards List */}
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        {filteredEntries.length === 0 ? (
          <div
            style={{
              background: "var(--bg-secondary)",
              border: "1px solid var(--border-card)",
              borderRadius: "14px",
              padding: "3rem",
              textAlign: "center",
              color: "var(--text-muted)",
            }}
          >
            No journal vouchers found. Click "+ New Journal Voucher" to create your first double-entry adjustment.
          </div>
        ) : (
          filteredEntries.map((jv) => {
            const jvTotal = jv.lines.reduce((s, l) => s + (l.debit || 0), 0);
            return (
              <div
                key={jv.id}
                style={{
                  background: "var(--bg-secondary)",
                  border: "1px solid var(--border-card)",
                  borderRadius: "14px",
                  padding: "1.1rem 1.25rem",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.75rem",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <span style={{ fontWeight: 800, fontSize: "0.95rem", color: "var(--text-main)", fontFamily: "monospace" }}>
                      {jv.voucherNumber}
                    </span>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", background: "var(--bg-tertiary)", padding: "2px 8px", borderRadius: "5px" }}>
                      {jv.date}
                    </span>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-dim)" }}>
                      By: {jv.createdBy || "pirnav"}
                    </span>
                  </div>

                  <div style={{ fontSize: "1rem", fontWeight: 900, color: "#10b981" }}>
                    {formatCurrency(jvTotal)}
                  </div>
                </div>

                <div style={{ fontSize: "0.82rem", color: "var(--text-muted)", fontStyle: "italic" }}>
                  &ldquo;{jv.narration}&rdquo;
                </div>

                {/* Sub-table for lines */}
                <div style={{ background: "var(--bg-tertiary)", borderRadius: "8px", overflow: "hidden", border: "1px solid var(--border-subtle)" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.78rem" }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid var(--border-subtle)", color: "var(--text-muted)" }}>
                        <th style={{ textAlign: "left", padding: "0.45rem 0.75rem" }}>Account Code</th>
                        <th style={{ textAlign: "left", padding: "0.45rem 0.75rem" }}>Account Name</th>
                        <th style={{ textAlign: "left", padding: "0.45rem 0.75rem" }}>Description</th>
                        <th style={{ textAlign: "right", padding: "0.45rem 0.75rem", width: "120px" }}>Debit (₹)</th>
                        <th style={{ textAlign: "right", padding: "0.45rem 0.75rem", width: "120px" }}>Credit (₹)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {jv.lines.map((l, lIdx) => (
                        <tr key={lIdx} style={{ borderBottom: lIdx === jv.lines.length - 1 ? "none" : "1px solid var(--border-subtle)" }}>
                          <td style={{ padding: "0.45rem 0.75rem", fontFamily: "monospace", fontWeight: 700, color: "var(--text-main)" }}>{l.accountCode}</td>
                          <td style={{ padding: "0.45rem 0.75rem", fontWeight: 600, color: "var(--text-main)" }}>{l.accountName}</td>
                          <td style={{ padding: "0.45rem 0.75rem", color: "var(--text-dim)" }}>{l.description || "-"}</td>
                          <td style={{ textAlign: "right", padding: "0.45rem 0.75rem", color: l.debit > 0 ? "#3b82f6" : "var(--text-dim)", fontWeight: l.debit > 0 ? 700 : 400 }}>
                            {l.debit > 0 ? formatCurrency(l.debit) : "-"}
                          </td>
                          <td style={{ textAlign: "right", padding: "0.45rem 0.75rem", color: l.credit > 0 ? "#10b981" : "var(--text-dim)", fontWeight: l.credit > 0 ? 700 : 400 }}>
                            {l.credit > 0 ? formatCurrency(l.credit) : "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* New Voucher Modal */}
      {isModalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.65)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "1rem",
          }}
        >
          <div
            style={{
              background: "var(--bg-secondary)",
              border: "1px solid var(--border-card)",
              borderRadius: "16px",
              padding: "1.5rem",
              width: "100%",
              maxWidth: "720px",
              boxShadow: "var(--shadow-xl)",
              maxHeight: "90vh",
              overflowY: "auto",
            }}
          >
            <h3 style={{ margin: "0 0 1rem", fontSize: "1.15rem", fontWeight: 800, color: "var(--text-main)" }}>
              Create New Journal Voucher
            </h3>

            {formError && (
              <div style={{ padding: "0.6rem 0.8rem", background: "rgba(239, 68, 68, 0.15)", border: "1px solid #ef4444", borderRadius: "8px", color: "#ef4444", fontSize: "0.8rem", marginBottom: "1rem", fontWeight: 600 }}>
                {formError}
              </div>
            )}

            <form onSubmit={handleSaveVoucher} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "0.75rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "4px", fontWeight: 600 }}>
                    Voucher Date
                  </label>
                  <input
                    type="date"
                    value={voucherDate}
                    onChange={(e) => setVoucherDate(e.target.value)}
                    style={{
                      width: "100%",
                      boxSizing: "border-box",
                      background: "var(--bg-tertiary)",
                      border: "1px solid var(--border-subtle)",
                      borderRadius: "8px",
                      padding: "0.45rem 0.75rem",
                      color: "var(--text-main)",
                      fontSize: "0.85rem",
                      cursor: "pointer",
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "4px", fontWeight: 600 }}>
                    Narration / Description
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Monthly rent paid via Bank Transfer"
                    value={narration}
                    onChange={(e) => setNarration(e.target.value)}
                    style={{
                      width: "100%",
                      boxSizing: "border-box",
                      background: "var(--bg-tertiary)",
                      border: "1px solid var(--border-subtle)",
                      borderRadius: "8px",
                      padding: "0.45rem 0.75rem",
                      color: "var(--text-main)",
                      fontSize: "0.85rem",
                      outline: "none",
                    }}
                  />
                </div>
              </div>

              {/* Dynamic Line Items */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                  <label style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase" }}>
                    Double-Entry Line Items
                  </label>
                  <button
                    type="button"
                    onClick={handleAddLine}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                      background: "rgba(59, 130, 246, 0.12)",
                      color: "#3b82f6",
                      border: "1px solid rgba(59, 130, 246, 0.3)",
                      borderRadius: "6px",
                      padding: "2px 8px",
                      fontSize: "0.72rem",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    <Plus size={12} /> Add Line
                  </button>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  {lines.map((line, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "2.5fr 1fr 1fr 2fr auto",
                        gap: "0.5rem",
                        alignItems: "center",
                        background: "var(--bg-tertiary)",
                        padding: "0.5rem",
                        borderRadius: "8px",
                        border: "1px solid var(--border-subtle)",
                      }}
                    >
                      <select
                        value={line.accountCode}
                        onChange={(e) => handleLineChange(idx, "accountCode", e.target.value)}
                        style={{
                          background: "var(--bg-secondary)",
                          border: "1px solid var(--border-subtle)",
                          borderRadius: "6px",
                          padding: "0.4rem 0.6rem",
                          color: "var(--text-main)",
                          fontSize: "0.78rem",
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                      >
                        {chartOfAccounts.map((a) => (
                          <option key={a.code} value={a.code}>
                            {a.code} - {a.name} ({a.group})
                          </option>
                        ))}
                      </select>

                      <input
                        type="number"
                        placeholder="Debit (₹)"
                        value={line.debit || ""}
                        onChange={(e) => handleLineChange(idx, "debit", Number(e.target.value) || 0)}
                        style={{
                          background: "var(--bg-secondary)",
                          border: "1px solid var(--border-subtle)",
                          borderRadius: "6px",
                          padding: "0.4rem 0.6rem",
                          color: "#3b82f6",
                          fontSize: "0.82rem",
                          fontWeight: 700,
                          textAlign: "right",
                          outline: "none",
                        }}
                      />

                      <input
                        type="number"
                        placeholder="Credit (₹)"
                        value={line.credit || ""}
                        onChange={(e) => handleLineChange(idx, "credit", Number(e.target.value) || 0)}
                        style={{
                          background: "var(--bg-secondary)",
                          border: "1px solid var(--border-subtle)",
                          borderRadius: "6px",
                          padding: "0.4rem 0.6rem",
                          color: "#10b981",
                          fontSize: "0.82rem",
                          fontWeight: 700,
                          textAlign: "right",
                          outline: "none",
                        }}
                      />

                      <input
                        type="text"
                        placeholder="Line description"
                        value={line.description || ""}
                        onChange={(e) => handleLineChange(idx, "description", e.target.value)}
                        style={{
                          background: "var(--bg-secondary)",
                          border: "1px solid var(--border-subtle)",
                          borderRadius: "6px",
                          padding: "0.4rem 0.6rem",
                          color: "var(--text-main)",
                          fontSize: "0.78rem",
                          outline: "none",
                        }}
                      />

                      <button
                        type="button"
                        onClick={() => handleRemoveLine(idx)}
                        style={{
                          background: "transparent",
                          border: "none",
                          color: "#ef4444",
                          cursor: "pointer",
                          padding: "4px",
                        }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tally Footer Validation */}
              <div
                style={{
                  background: isBalanced ? "rgba(16, 185, 129, 0.12)" : "rgba(239, 68, 68, 0.12)",
                  border: `1px solid ${isBalanced ? "#10b981" : "#ef4444"}`,
                  borderRadius: "8px",
                  padding: "0.75rem 1rem",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  fontWeight: 700,
                  fontSize: "0.85rem",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  {isBalanced ? <CheckCircle2 size={16} color="#10b981" /> : <AlertTriangle size={16} color="#ef4444" />}
                  <span style={{ color: isBalanced ? "#10b981" : "#ef4444" }}>
                    {isBalanced ? "Balanced Voucher (Dr == Cr)" : `Unbalanced (Difference: ₹${difference})`}
                  </span>
                </div>

                <div style={{ display: "flex", gap: "1rem" }}>
                  <span style={{ color: "#3b82f6" }}>Total Dr: {formatCurrency(totalDebit)}</span>
                  <span style={{ color: "#10b981" }}>Total Cr: {formatCurrency(totalCredit)}</span>
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "0.5rem" }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  style={{
                    padding: "0.5rem 1rem",
                    background: "var(--bg-tertiary)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "8px",
                    color: "var(--text-main)",
                    fontSize: "0.82rem",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!isBalanced}
                  style={{
                    padding: "0.5rem 1.25rem",
                    background: isBalanced ? "linear-gradient(135deg, #10b981 0%, #059669 100%)" : "var(--bg-tertiary)",
                    border: "none",
                    borderRadius: "8px",
                    color: isBalanced ? "#ffffff" : "var(--text-dim)",
                    fontSize: "0.82rem",
                    fontWeight: 700,
                    cursor: isBalanced ? "pointer" : "not-allowed",
                    boxShadow: isBalanced ? "0 2px 8px rgba(16, 185, 129, 0.35)" : "none",
                  }}
                >
                  Post Journal Voucher
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
