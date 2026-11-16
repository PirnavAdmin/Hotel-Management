import { SearchableSelect } from "../../common/SearchableSelect";
import React, { useState, useMemo } from "react";
import {
  BookOpen,
  Calendar,
  Search,
  Filter,
  FileSpreadsheet,
  Printer,
  ArrowUpRight,
  ArrowDownLeft,
  DollarSign,
} from "lucide-react";
import { formatCurrency, roundCurrency } from "../../utils/formatCurrency";
import {
  getChartOfAccounts,
  generateGeneralLedgerTransactions,
  exportToCSV,
  printFinancialReport,
} from "./accountingService";

export function GeneralLedgerView({
  orders = [],
  inventoryPurchases = [],
  salaryPayments = [],
  inventoryItems = [],
  journalEntries = [],
}) {
  const chartOfAccounts = useMemo(() => getChartOfAccounts(), []);
  const [selectedAccountCode, setSelectedAccountCode] = useState("1001"); // Default Cash in Hand
  const [fromDate, setFromDate] = useState("2026-04-01");
  const [toDate, setToDate] = useState("2027-03-31");
  const [searchQuery, setSearchQuery] = useState("");

  // Generate all transactions
  const allTransactions = useMemo(() => {
    return generateGeneralLedgerTransactions({
      orders,
      inventoryItems,
      inventoryPurchases,
      salaryPayments,
      journalEntries,
      startDate: fromDate,
      endDate: toDate,
    });
  }, [orders, inventoryItems, inventoryPurchases, salaryPayments, journalEntries, fromDate, toDate]);

  // Selected account details
  const selectedAccount = useMemo(() => {
    return (
      chartOfAccounts.find((a) => a.code === selectedAccountCode) || {
        code: selectedAccountCode,
        name: "General Account",
        group: "Assets",
        normalBalance: "Debit",
      }
    );
  }, [chartOfAccounts, selectedAccountCode]);

  // Filter transactions for the selected account
  const accountPostings = useMemo(() => {
    const raw = allTransactions.filter((tx) => tx.accountCode === selectedAccountCode);

    // Sort chronologically
    raw.sort((a, b) => new Date(a.date) - new Date(b.date));

    // Calculate running balance
    let running = 0;
    const isDebitNormal = selectedAccount.group === "Assets" || selectedAccount.group === "Expenses";

    return raw.map((tx) => {
      if (isDebitNormal) {
        running = roundCurrency(running + tx.debit - tx.credit);
      } else {
        running = roundCurrency(running + tx.credit - tx.debit);
      }
      return {
        ...tx,
        runningBalance: running,
      };
    });
  }, [allTransactions, selectedAccountCode, selectedAccount]);

  // Filtered by search within this account
  const filteredPostings = useMemo(() => {
    if (!searchQuery.trim()) return accountPostings;
    const q = searchQuery.toLowerCase().trim();
    return accountPostings.filter(
      (p) =>
        p.voucherNo.toLowerCase().includes(q) ||
        p.voucherType.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q)
    );
  }, [accountPostings, searchQuery]);

  // Totals
  const totalDebit = roundCurrency(accountPostings.reduce((sum, p) => sum + p.debit, 0));
  const totalCredit = roundCurrency(accountPostings.reduce((sum, p) => sum + p.credit, 0));
  const netClosingBalance = accountPostings.length > 0 ? accountPostings[accountPostings.length - 1].runningBalance : 0;

  // Export CSV
  const handleExportCSV = () => {
    const headers = ["Date", "Voucher No", "Voucher Type", "Particulars / Description", "Debit (₹)", "Credit (₹)", "Running Balance (₹)"];
    const rows = filteredPostings.map((p) => [
      p.date,
      p.voucherNo,
      p.voucherType,
      p.description,
      p.debit,
      p.credit,
      p.runningBalance,
    ]);
    exportToCSV(`General_Ledger_${selectedAccount.code}_${selectedAccount.name}`, headers, rows);
  };

  // Export PDF / Print
  const handlePrint = () => {
    const html = `
      <table border="1" cellpadding="6" cellspacing="0" style="width:100%; border-collapse:collapse; margin-top:15px; font-size:11.5px;">
        <thead>
          <tr style="background:#f1f5f9;">
            <th>Date</th>
            <th>Voucher #</th>
            <th>Type</th>
            <th>Particulars</th>
            <th class="text-right">Debit (₹)</th>
            <th class="text-right">Credit (₹)</th>
            <th class="text-right">Balance (₹)</th>
          </tr>
        </thead>
        <tbody>
          ${filteredPostings
            .map(
              (p) => `
            <tr>
              <td>${p.date}</td>
              <td class="font-bold">${p.voucherNo}</td>
              <td>${p.voucherType}</td>
              <td>${p.description}</td>
              <td class="text-right">${p.debit > 0 ? "₹" + Number(p.debit).toLocaleString("en-IN") : "-"}</td>
              <td class="text-right">${p.credit > 0 ? "₹" + Number(p.credit).toLocaleString("en-IN") : "-"}</td>
              <td class="text-right font-bold">₹${Number(p.runningBalance).toLocaleString("en-IN")}</td>
            </tr>
          `
            )
            .join("")}
          <tr class="bg-total font-bold" style="font-size:12px;">
            <td colspan="4" class="text-center">Total Period Activity</td>
            <td class="text-right">₹${Number(totalDebit).toLocaleString("en-IN")}</td>
            <td class="text-right">₹${Number(totalCredit).toLocaleString("en-IN")}</td>
            <td class="text-right font-bold">₹${Number(netClosingBalance).toLocaleString("en-IN")}</td>
          </tr>
        </tbody>
      </table>
    `;
    printFinancialReport(`General Ledger: ${selectedAccount.code} - ${selectedAccount.name}`, `Period: ${fromDate} to ${toDate}`, html);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", width: "100%" }}>
      {/* Top Header Card */}
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
              General Ledger (GL)
            </h2>
            <span
              style={{
                fontSize: "0.72rem",
                fontWeight: 700,
                color: "#0284c7",
                background: "rgba(2, 132, 199, 0.12)",
                border: "1px solid rgba(2, 132, 199, 0.3)",
                padding: "2px 8px",
                borderRadius: "20px",
              }}
            >
              Account Drill-Down
            </span>
          </div>
          <p style={{ margin: "3px 0 0", fontSize: "0.8rem", color: "var(--text-muted)" }}>
            Complete audit trail of debits, credits, and chronological running balances by account
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
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
            <Printer size={14} /> Print Ledger
          </button>
        </div>
      </div>

      {/* Account Picker & Date Filters */}
      <div
        style={{
          background: "var(--bg-secondary)",
          border: "1px solid var(--border-card)",
          borderRadius: "14px",
          padding: "1rem 1.25rem",
          display: "flex",
          alignItems: "flex-end",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        <div style={{ flex: 1, minWidth: "240px" }}>
          <label style={{ display: "block", fontSize: "0.72rem", color: "var(--text-muted)", marginBottom: "4px", fontWeight: 600 }}>
            Select Account to Inspect
          </label>
          <SearchableSelect
            value={selectedAccountCode}
            onChange={(e) => setSelectedAccountCode(e.target.value)}
            style={{
              width: "100%",
              background: "var(--bg-tertiary)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "8px",
              padding: "0.45rem 0.75rem",
              color: "var(--text-main)",
              fontSize: "0.82rem",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            {chartOfAccounts.map((a) => (
              <option key={a.code} value={a.code}>
                {a.code} &bull; {a.name} ({a.group})
              </option>
            ))}
          </SearchableSelect>
        </div>

        <div>
          <label style={{ display: "block", fontSize: "0.72rem", color: "var(--text-muted)", marginBottom: "4px", fontWeight: 600 }}>
            From Date
          </label>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            style={{
              background: "var(--bg-tertiary)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "8px",
              padding: "0.45rem 0.75rem",
              color: "var(--text-main)",
              fontSize: "0.8rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          />
        </div>

        <div>
          <label style={{ display: "block", fontSize: "0.72rem", color: "var(--text-muted)", marginBottom: "4px", fontWeight: 600 }}>
            To Date
          </label>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            style={{
              background: "var(--bg-tertiary)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "8px",
              padding: "0.45rem 0.75rem",
              color: "var(--text-main)",
              fontSize: "0.8rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          />
        </div>

        <div style={{ minWidth: "200px" }}>
          <label style={{ display: "block", fontSize: "0.72rem", color: "var(--text-muted)", marginBottom: "4px", fontWeight: 600 }}>
            Search Postings
          </label>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              background: "var(--bg-tertiary)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "8px",
              padding: "0.45rem 0.75rem",
            }}
          >
            <Search size={14} color="var(--text-muted)" />
            <input
              type="text"
              placeholder="Search voucher or description..."
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
      </div>

      {/* 3 Summary Badges for Selected Account */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "1rem",
        }}
      >
        <div style={{ background: "var(--bg-secondary)", border: "1px solid var(--border-card)", borderRadius: "12px", padding: "1rem 1.25rem" }}>
          <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase" }}>
            Total Period Debits
          </div>
          <div style={{ fontSize: "1.45rem", fontWeight: 900, color: "#3b82f6", marginTop: "3px" }}>
            {formatCurrency(totalDebit)}
          </div>
          <div style={{ fontSize: "0.68rem", color: "var(--text-dim)", marginTop: "2px" }}>
            Inflows / Asset increases
          </div>
        </div>

        <div style={{ background: "var(--bg-secondary)", border: "1px solid var(--border-card)", borderRadius: "12px", padding: "1rem 1.25rem" }}>
          <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase" }}>
            Total Period Credits
          </div>
          <div style={{ fontSize: "1.45rem", fontWeight: 900, color: "#10b981", marginTop: "3px" }}>
            {formatCurrency(totalCredit)}
          </div>
          <div style={{ fontSize: "0.68rem", color: "var(--text-dim)", marginTop: "2px" }}>
            Outflows / Revenue credits
          </div>
        </div>

        <div style={{ background: "var(--bg-secondary)", border: "1px solid var(--border-card)", borderRadius: "12px", padding: "1rem 1.25rem" }}>
          <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase" }}>
            Net Closing Balance
          </div>
          <div style={{ fontSize: "1.45rem", fontWeight: 900, color: netClosingBalance >= 0 ? "#10b981" : "#ef4444", marginTop: "3px" }}>
            {formatCurrency(Math.abs(netClosingBalance))}
            <span style={{ fontSize: "0.75rem", marginLeft: "6px", fontWeight: 700, color: "var(--text-muted)" }}>
              {selectedAccount.normalBalance}
            </span>
          </div>
          <div style={{ fontSize: "0.68rem", color: "var(--text-dim)", marginTop: "2px" }}>
            As of {toDate}
          </div>
        </div>
      </div>

      {/* Postings Table */}
      <div
        style={{
          background: "var(--bg-secondary)",
          border: "1px solid var(--border-card)",
          borderRadius: "14px",
          overflow: "hidden",
        }}
      >
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
            <thead>
              <tr style={{ background: "var(--bg-tertiary)", borderBottom: "1px solid var(--border-subtle)" }}>
                <th style={{ textAlign: "left", padding: "0.75rem 1rem", color: "var(--text-muted)", fontWeight: 700, width: "110px" }}>Date</th>
                <th style={{ textAlign: "left", padding: "0.75rem 1rem", color: "var(--text-muted)", fontWeight: 700, width: "110px" }}>Voucher #</th>
                <th style={{ textAlign: "left", padding: "0.75rem 1rem", color: "var(--text-muted)", fontWeight: 700, width: "120px" }}>Type</th>
                <th style={{ textAlign: "left", padding: "0.75rem 1rem", color: "var(--text-muted)", fontWeight: 700 }}>Particulars / Description</th>
                <th style={{ textAlign: "right", padding: "0.75rem 1rem", color: "var(--text-muted)", fontWeight: 700, width: "130px" }}>Debit (₹)</th>
                <th style={{ textAlign: "right", padding: "0.75rem 1rem", color: "var(--text-muted)", fontWeight: 700, width: "130px" }}>Credit (₹)</th>
                <th style={{ textAlign: "right", padding: "0.75rem 1.25rem", color: "var(--text-main)", fontWeight: 800, width: "150px" }}>Balance (₹)</th>
              </tr>
            </thead>
            <tbody>
              {filteredPostings.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: "center", padding: "2.5rem", color: "var(--text-muted)" }}>
                    No postings found for {selectedAccount.name} within this date range.
                  </td>
                </tr>
              ) : (
                filteredPostings.map((p, idx) => (
                  <tr
                    key={idx}
                    style={{
                      borderBottom: "1px solid var(--border-subtle)",
                      background: idx % 2 === 0 ? "transparent" : "rgba(255, 255, 255, 0.015)",
                    }}
                  >
                    <td style={{ padding: "0.65rem 1rem", color: "var(--text-muted)" }}>{p.date?.slice(0, 10)}</td>
                    <td style={{ padding: "0.65rem 1rem", fontWeight: 700, color: "var(--text-main)", fontFamily: "monospace" }}>{p.voucherNo}</td>
                    <td style={{ padding: "0.65rem 1rem" }}>
                      <span style={{ fontSize: "0.72rem", padding: "2px 6px", borderRadius: "4px", background: "var(--bg-tertiary)", color: "var(--text-muted)", border: "1px solid var(--border-subtle)" }}>
                        {p.voucherType}
                      </span>
                    </td>
                    <td style={{ padding: "0.65rem 1rem", color: "var(--text-main)" }}>{p.description}</td>
                    <td style={{ textAlign: "right", padding: "0.65rem 1rem", color: p.debit > 0 ? "#3b82f6" : "var(--text-dim)", fontWeight: p.debit > 0 ? 700 : 400 }}>
                      {p.debit > 0 ? formatCurrency(p.debit) : "-"}
                    </td>
                    <td style={{ textAlign: "right", padding: "0.65rem 1rem", color: p.credit > 0 ? "#10b981" : "var(--text-dim)", fontWeight: p.credit > 0 ? 700 : 400 }}>
                      {p.credit > 0 ? formatCurrency(p.credit) : "-"}
                    </td>
                    <td style={{ textAlign: "right", padding: "0.65rem 1.25rem", fontWeight: 800, color: "var(--text-main)" }}>
                      {formatCurrency(p.runningBalance)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
