import { SearchableSelect } from "../../common/SearchableSelect";
import React, { useState, useMemo } from "react";
import {
  FileSpreadsheet,
  Printer,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Calendar,
  Layers,
  Maximize2,
  ShieldCheck,
  RefreshCw,
} from "lucide-react";
import { formatCurrency, roundCurrency } from "../../utils/formatCurrency";
import {
  getChartOfAccounts,
  generateGeneralLedgerTransactions,
  computeTrialBalance,
  exportToCSV,
  printFinancialReport,
} from "./accountingService";

export function TrialBalanceView({
  orders = [],
  inventoryPurchases = [],
  salaryPayments = [],
  inventoryItems = [],
  journalEntries = [],
}) {
  const [fromDate, setFromDate] = useState("2026-04-01");
  const [toDate, setToDate] = useState("2027-03-31");
  const [financialYear, setFinancialYear] = useState("2026-2027");
  const [searchQuery, setSearchQuery] = useState("");
  const [groupFilter, setGroupFilter] = useState("All");

  // Generate dynamic GL transactions & trial balance tally
  const { rows, totals } = useMemo(() => {
    const transactions = generateGeneralLedgerTransactions({
      orders,
      inventoryItems,
      inventoryPurchases,
      salaryPayments,
      journalEntries,
      startDate: fromDate,
      endDate: toDate,
    });

    const coa = getChartOfAccounts();
    return computeTrialBalance({ chartOfAccounts: coa, transactions });
  }, [orders, inventoryItems, inventoryPurchases, salaryPayments, journalEntries, fromDate, toDate]);

  // Filtered rows by search and group
  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        r.code.toLowerCase().includes(q) ||
        r.name.toLowerCase().includes(q) ||
        r.group.toLowerCase().includes(q);
      const matchesGroup = groupFilter === "All" || r.group === groupFilter;
      return matchesSearch && matchesGroup;
    });
  }, [rows, searchQuery, groupFilter]);

  // Export Excel CSV
  const handleExportCSV = () => {
    const headers = [
      "S.No",
      "Account Code",
      "Account Name",
      "Group",
      "Opening Debit (₹)",
      "Opening Credit (₹)",
      "Transaction Debit (₹)",
      "Transaction Credit (₹)",
      "Closing Debit (₹)",
      "Closing Credit (₹)",
    ];
    const dataRows = filteredRows.map((r) => [
      r.sNo,
      r.code,
      r.name,
      r.group,
      r.openingDebit,
      r.openingCredit,
      r.debit,
      r.credit,
      r.closingDebit,
      r.closingCredit,
    ]);
    dataRows.push([
      "Total",
      "-",
      "Grand Totals",
      "-",
      totals.openingDebit,
      totals.openingCredit,
      totals.debit,
      totals.credit,
      totals.closingDebit,
      totals.closingCredit,
    ]);
    exportToCSV(`Trial_Balance_${financialYear}`, headers, dataRows);
  };

  // Export PDF / Print
  const handlePrint = () => {
    const html = `
      <table border="1" cellpadding="6" cellspacing="0" style="width:100%; border-collapse:collapse; margin-top:15px; font-size:11px;">
        <thead>
          <tr style="background:#f1f5f9;">
            <th>S.No</th>
            <th>Account Code</th>
            <th>Account Name</th>
            <th>Group</th>
            <th class="text-right">Opening Dr (₹)</th>
            <th class="text-right">Opening Cr (₹)</th>
            <th class="text-right">Period Dr (₹)</th>
            <th class="text-right">Period Cr (₹)</th>
            <th class="text-right">Closing Dr (₹)</th>
            <th class="text-right">Closing Cr (₹)</th>
          </tr>
        </thead>
        <tbody>
          ${filteredRows
            .map(
              (r) => `
            <tr>
              <td class="text-center">${r.sNo}</td>
              <td class="font-bold">${r.code}</td>
              <td>${r.name}</td>
              <td>${r.group}</td>
              <td class="text-right">${r.openingDebit ? "₹" + Number(r.openingDebit).toLocaleString("en-IN") : "0.00"}</td>
              <td class="text-right">${r.openingCredit ? "₹" + Number(r.openingCredit).toLocaleString("en-IN") : "0.00"}</td>
              <td class="text-right">${r.debit ? "₹" + Number(r.debit).toLocaleString("en-IN") : "0.00"}</td>
              <td class="text-right">${r.credit ? "₹" + Number(r.credit).toLocaleString("en-IN") : "0.00"}</td>
              <td class="text-right font-bold">${r.closingDebit ? "₹" + Number(r.closingDebit).toLocaleString("en-IN") : "0.00"}</td>
              <td class="text-right font-bold">${r.closingCredit ? "₹" + Number(r.closingCredit).toLocaleString("en-IN") : "0.00"}</td>
            </tr>
          `
            )
            .join("")}
          <tr class="bg-total font-bold" style="font-size:12px;">
            <td colspan="4" class="text-center">Total</td>
            <td class="text-right">₹${Number(totals.openingDebit).toLocaleString("en-IN")}</td>
            <td class="text-right">₹${Number(totals.openingCredit).toLocaleString("en-IN")}</td>
            <td class="text-right">₹${Number(totals.debit).toLocaleString("en-IN")}</td>
            <td class="text-right">₹${Number(totals.credit).toLocaleString("en-IN")}</td>
            <td class="text-right font-bold">₹${Number(totals.closingDebit).toLocaleString("en-IN")}</td>
            <td class="text-right font-bold">₹${Number(totals.closingCredit).toLocaleString("en-IN")}</td>
          </tr>
        </tbody>
      </table>
      <div style="margin-top:15px; text-align:center;">
        <span class="balanced-badge">
          &check; Audit Verification: Total Debits == Total Credits (Balanced Difference: ₹${totals.difference})
        </span>
      </div>
    `;
    printFinancialReport("Trial Balance Statement", `CA Reporting Panel &bull; Period: ${fromDate} to ${toDate}`, html);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", width: "100%" }}>
      {/* Top CA Reporting Panel Header (Matches Screenshot 2) */}
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
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div
            style={{
              width: "42px",
              height: "42px",
              borderRadius: "10px",
              background: "rgba(59, 130, 246, 0.15)",
              color: "#3b82f6",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 900,
              fontSize: "1.1rem",
            }}
          >
            CA
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <h2 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 800, color: "var(--text-main)" }}>
                Trial Balance
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
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                <ShieldCheck size={12} /> CA Audit Ready
              </span>
            </div>
            <p style={{ margin: "2px 0 0", fontSize: "0.78rem", color: "var(--text-muted)" }}>
              Chartered Accountant Reporting Panel &bull; Double-Entry Verification
            </p>
          </div>
        </div>

        {/* Company & FY Selectors */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 600 }}>Company:</span>
            <select
              style={{
                background: "var(--bg-tertiary)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "7px",
                padding: "0.35rem 0.6rem",
                color: "var(--text-main)",
                fontSize: "0.78rem",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              <option>Bhanu Fine Dining &amp; POS Management</option>
            </select>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 600 }}>FY:</span>
            <SearchableSelect
              value={financialYear}
              onChange={(e) => setFinancialYear(e.target.value)}
              style={{
                background: "var(--bg-tertiary)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "7px",
                padding: "0.35rem 0.6rem",
                color: "var(--text-main)",
                fontSize: "0.78rem",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              <option value="2026-2027">2026-2027</option>
              <option value="2025-2026">2025-2026</option>
              <option value="2024-2025">2024-2025</option>
            </SearchableSelect>
          </div>
        </div>
      </div>

      {/* Date Filter & Action Strip (Matching Screenshot 2) */}
      <div
        style={{
          background: "var(--bg-secondary)",
          border: "1px solid var(--border-card)",
          borderRadius: "14px",
          padding: "1rem 1.25rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.85rem", flexWrap: "wrap" }}>
          <div>
            <label style={{ display: "block", fontSize: "0.7rem", color: "var(--text-muted)", marginBottom: "3px", fontWeight: 600 }}>
              Report
            </label>
            <input
              type="text"
              readOnly
              value="Trial Balance"
              style={{
                background: "var(--bg-tertiary)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "7px",
                padding: "0.38rem 0.7rem",
                color: "var(--text-main)",
                fontSize: "0.8rem",
                fontWeight: 600,
                width: "140px",
              }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.7rem", color: "var(--text-muted)", marginBottom: "3px", fontWeight: 600 }}>
              From Date
            </label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              style={{
                background: "var(--bg-tertiary)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "7px",
                padding: "0.38rem 0.7rem",
                color: "var(--text-main)",
                fontSize: "0.8rem",
                fontWeight: 600,
                cursor: "pointer",
              }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.7rem", color: "var(--text-muted)", marginBottom: "3px", fontWeight: 600 }}>
              To Date
            </label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              style={{
                background: "var(--bg-tertiary)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "7px",
                padding: "0.38rem 0.7rem",
                color: "var(--text-main)",
                fontSize: "0.8rem",
                fontWeight: 600,
                cursor: "pointer",
              }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.7rem", color: "var(--text-muted)", marginBottom: "3px", fontWeight: 600 }}>
              Group Filter
            </label>
            <SearchableSelect
              value={groupFilter}
              onChange={(e) => setGroupFilter(e.target.value)}
              style={{
                background: "var(--bg-tertiary)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "7px",
                padding: "0.38rem 0.7rem",
                color: "var(--text-main)",
                fontSize: "0.8rem",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              <option value="All">All Groups</option>
              <option value="Assets">Assets</option>
              <option value="Liabilities">Liabilities</option>
              <option value="Equity">Equity</option>
              <option value="Income">Income</option>
              <option value="Expenses">Expenses</option>
            </SearchableSelect>
          </div>
        </div>

        {/* Buttons */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={handleExportCSV}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "5px",
              padding: "0.45rem 0.85rem",
              background: "#10b981",
              color: "#ffffff",
              border: "none",
              borderRadius: "8px",
              fontSize: "0.78rem",
              fontWeight: 700,
              cursor: "pointer",
              boxShadow: "0 2px 6px rgba(16, 185, 129, 0.3)",
            }}
          >
            <FileSpreadsheet size={14} /> Export Excel
          </button>

          <button
            type="button"
            onClick={handlePrint}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "5px",
              padding: "0.45rem 0.85rem",
              background: "#ef4444",
              color: "#ffffff",
              border: "none",
              borderRadius: "8px",
              fontSize: "0.78rem",
              fontWeight: 700,
              cursor: "pointer",
              boxShadow: "0 2px 6px rgba(239, 68, 68, 0.3)",
            }}
          >
            <Printer size={14} /> Export PDF
          </button>
        </div>
      </div>

      {/* Validation Banner (Total Debit == Total Credit) */}
      <div
        style={{
          background: totals.isBalanced ? "rgba(16, 185, 129, 0.12)" : "rgba(239, 68, 68, 0.12)",
          border: `1.5px solid ${totals.isBalanced ? "#10b981" : "#ef4444"}`,
          borderRadius: "10px",
          padding: "0.75rem 1rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "0.8rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {totals.isBalanced ? (
            <CheckCircle2 size={18} color="#10b981" />
          ) : (
            <AlertTriangle size={18} color="#ef4444" />
          )}
          <span style={{ fontSize: "0.85rem", fontWeight: 800, color: totals.isBalanced ? "#10b981" : "#ef4444" }}>
            {totals.isBalanced
              ? "TRIAL BALANCE AUDIT VERIFIED: Total Debits equal Total Credits (Difference: ₹0.00)"
              : `UNBALANCED LEDGER: Difference of ₹${totals.difference} detected.`}
          </span>
        </div>
        <div style={{ fontSize: "0.78rem", color: "var(--text-main)", fontWeight: 700 }}>
          Period Dr: {formatCurrency(totals.debit)} &bull; Period Cr: {formatCurrency(totals.credit)}
        </div>
      </div>

      {/* Report Info Strip & Search */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.8rem" }}>
        <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 700 }}>
          REPORT DATA &bull; Total Accounts: <span style={{ color: "var(--text-main)" }}>{filteredRows.length}</span> | Columns: <span style={{ color: "var(--text-main)" }}>10</span>
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
            width: "240px",
          }}
        >
          <Search size={14} color="var(--text-muted)" />
          <input
            type="text"
            placeholder="Search account code, name..."
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

      {/* 10-Column Accounting Table (Matching Screenshot 2) */}
      <div
        style={{
          background: "var(--bg-secondary)",
          border: "1px solid var(--border-card)",
          borderRadius: "14px",
          overflow: "hidden",
        }}
      >
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
            <thead>
              <tr style={{ background: "var(--bg-tertiary)", borderBottom: "1px solid var(--border-subtle)" }}>
                <th style={{ textAlign: "center", padding: "0.7rem 0.5rem", fontWeight: 700, color: "var(--text-muted)", width: "45px" }}>S.No</th>
                <th style={{ textAlign: "left", padding: "0.7rem 0.6rem", fontWeight: 700, color: "var(--text-muted)", width: "85px" }}>Account Code</th>
                <th style={{ textAlign: "left", padding: "0.7rem 0.75rem", fontWeight: 700, color: "var(--text-muted)" }}>Account Name</th>
                <th style={{ textAlign: "left", padding: "0.7rem 0.6rem", fontWeight: 700, color: "var(--text-muted)", width: "90px" }}>Group</th>
                <th style={{ textAlign: "right", padding: "0.7rem 0.6rem", fontWeight: 700, color: "var(--text-muted)" }}>Opening Debit (₹)</th>
                <th style={{ textAlign: "right", padding: "0.7rem 0.6rem", fontWeight: 700, color: "var(--text-muted)" }}>Opening Credit (₹)</th>
                <th style={{ textAlign: "right", padding: "0.7rem 0.6rem", fontWeight: 700, color: "var(--text-muted)" }}>Debit (₹)</th>
                <th style={{ textAlign: "right", padding: "0.7rem 0.6rem", fontWeight: 700, color: "var(--text-muted)" }}>Credit (₹)</th>
                <th style={{ textAlign: "right", padding: "0.7rem 0.6rem", fontWeight: 700, color: "var(--text-muted)" }}>Closing Debit (₹)</th>
                <th style={{ textAlign: "right", padding: "0.7rem 0.75rem", fontWeight: 700, color: "var(--text-muted)" }}>Closing Credit (₹)</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan="10" style={{ textAlign: "center", padding: "2rem", color: "var(--text-muted)" }}>
                    No accounts found matching search filters.
                  </td>
                </tr>
              ) : (
                filteredRows.map((row, idx) => (
                  <tr
                    key={row.code}
                    style={{
                      borderBottom: "1px solid var(--border-subtle)",
                      background: idx % 2 === 0 ? "transparent" : "rgba(255, 255, 255, 0.015)",
                      transition: "background 0.15s ease",
                    }}
                  >
                    <td style={{ textAlign: "center", padding: "0.6rem 0.5rem", color: "var(--text-dim)" }}>{row.sNo}</td>
                    <td style={{ padding: "0.6rem 0.6rem", fontWeight: 700, color: "var(--text-main)", fontFamily: "monospace" }}>{row.code}</td>
                    <td style={{ padding: "0.6rem 0.75rem", fontWeight: 600, color: "var(--text-main)" }}>{row.name}</td>
                    <td style={{ padding: "0.6rem 0.6rem" }}>
                      <span
                        style={{
                          fontSize: "0.7rem",
                          fontWeight: 700,
                          padding: "2px 6px",
                          borderRadius: "4px",
                          background:
                            row.group === "Assets"
                              ? "rgba(59, 130, 246, 0.12)"
                              : row.group === "Liabilities"
                              ? "rgba(239, 68, 68, 0.12)"
                              : row.group === "Income"
                              ? "rgba(16, 185, 129, 0.12)"
                              : row.group === "Expenses"
                              ? "rgba(245, 158, 11, 0.12)"
                              : "rgba(168, 85, 247, 0.12)",
                          color:
                            row.group === "Assets"
                              ? "#3b82f6"
                              : row.group === "Liabilities"
                              ? "#ef4444"
                              : row.group === "Income"
                              ? "#10b981"
                              : row.group === "Expenses"
                              ? "#f59e0b"
                              : "#a855f7",
                        }}
                      >
                        {row.group}
                      </span>
                    </td>
                    <td style={{ textAlign: "right", padding: "0.6rem 0.6rem", color: "var(--text-muted)" }}>
                      {row.openingDebit > 0 ? formatCurrency(row.openingDebit) : "0.00"}
                    </td>
                    <td style={{ textAlign: "right", padding: "0.6rem 0.6rem", color: "var(--text-muted)" }}>
                      {row.openingCredit > 0 ? formatCurrency(row.openingCredit) : "0.00"}
                    </td>
                    <td style={{ textAlign: "right", padding: "0.6rem 0.6rem", color: row.debit > 0 ? "var(--text-main)" : "var(--text-dim)", fontWeight: row.debit > 0 ? 700 : 400 }}>
                      {row.debit > 0 ? formatCurrency(row.debit) : "0.00"}
                    </td>
                    <td style={{ textAlign: "right", padding: "0.6rem 0.6rem", color: row.credit > 0 ? "var(--text-main)" : "var(--text-dim)", fontWeight: row.credit > 0 ? 700 : 400 }}>
                      {row.credit > 0 ? formatCurrency(row.credit) : "0.00"}
                    </td>
                    <td style={{ textAlign: "right", padding: "0.6rem 0.6rem", color: row.closingDebit > 0 ? "#10b981" : "var(--text-dim)", fontWeight: 700 }}>
                      {row.closingDebit > 0 ? formatCurrency(row.closingDebit) : "0.00"}
                    </td>
                    <td style={{ textAlign: "right", padding: "0.6rem 0.75rem", color: row.closingCredit > 0 ? "#3b82f6" : "var(--text-dim)", fontWeight: 700 }}>
                      {row.closingCredit > 0 ? formatCurrency(row.closingCredit) : "0.00"}
                    </td>
                  </tr>
                ))
              )}

              {/* Total Row (Bold summary) */}
              <tr
                style={{
                  background: "var(--bg-tertiary)",
                  borderTop: "2px solid var(--border-card)",
                  borderBottom: "2px solid var(--border-card)",
                  fontWeight: 900,
                  fontSize: "0.85rem",
                }}
              >
                <td colSpan="4" style={{ textAlign: "center", padding: "0.8rem", color: "var(--text-main)" }}>
                  Total
                </td>
                <td style={{ textAlign: "right", padding: "0.8rem 0.6rem", color: "var(--text-main)" }}>
                  {formatCurrency(totals.openingDebit)}
                </td>
                <td style={{ textAlign: "right", padding: "0.8rem 0.6rem", color: "var(--text-main)" }}>
                  {formatCurrency(totals.openingCredit)}
                </td>
                <td style={{ textAlign: "right", padding: "0.8rem 0.6rem", color: "#10b981" }}>
                  {formatCurrency(totals.debit)}
                </td>
                <td style={{ textAlign: "right", padding: "0.8rem 0.6rem", color: "#10b981" }}>
                  {formatCurrency(totals.credit)}
                </td>
                <td style={{ textAlign: "right", padding: "0.8rem 0.6rem", color: "#3b82f6" }}>
                  {formatCurrency(totals.closingDebit)}
                </td>
                <td style={{ textAlign: "right", padding: "0.8rem 0.75rem", color: "#3b82f6" }}>
                  {formatCurrency(totals.closingCredit)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
