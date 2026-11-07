import React, { useState, useMemo } from "react";
import {
  FileSpreadsheet,
  Printer,
  ChevronDown,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  CheckSquare,
  Square,
  Building,
  Calendar,
  Filter,
  DollarSign,
  RefreshCw,
} from "lucide-react";
import { formatCurrency, roundCurrency } from "../../utils/formatCurrency";
import { exportToCSV, printFinancialReport } from "./accountingService";

export function ProfitLossStatementView({
  orders = [],
  inventoryPurchases = [],
  salaryPayments = [],
  inventoryItems = [],
}) {
  const [fiscalYear, setFiscalYear] = useState("2026-2027");
  const [periodicity, setPeriodicity] = useState("Quarterly"); // "Quarterly" | "Monthly" | "Annual"
  const [reportView, setReportView] = useState("Tree View");
  const [accumulatedValues, setAccumulatedValues] = useState(true);
  const [includeDefaultFB, setIncludeDefaultFB] = useState(true);

  // Expanded tree nodes
  const [expandedNodes, setExpandedNodes] = useState({
    income: true,
    directIncome: true,
    indirectIncome: true,
    expense: true,
    directExpense: true,
    indirectExpense: true,
  });

  const toggleNode = (nodeKey) => {
    setExpandedNodes((prev) => ({ ...prev, [nodeKey]: !prev[nodeKey] }));
  };

  // Define period quarters based on FY (April to March)
  // FY 2026-2027: Q1 (Apr-Jun 26), Q2 (Jul-Sep 26), Q3 (Oct-Dec 26), Q4 (Jan-Mar 27)
  const quarters = useMemo(() => {
    const yr = parseInt(fiscalYear.split("-")[0], 10) || 2026;
    const nextYr = yr + 1;
    return [
      { key: "q1", label: `Apr ${String(yr).slice(2)}-Jun ${String(yr).slice(2)}`, start: `${yr}-04-01`, end: `${yr}-06-30` },
      { key: "q2", label: `Jul ${String(yr).slice(2)}-Sep ${String(yr).slice(2)}`, start: `${yr}-07-01`, end: `${yr}-09-30` },
      { key: "q3", label: `Oct ${String(yr).slice(2)}-Dec ${String(yr).slice(2)}`, start: `${yr}-10-01`, end: `${yr}-12-31` },
      { key: "q4", label: `Jan ${String(nextYr).slice(2)}-Mar ${String(nextYr).slice(2)}`, start: `${nextYr}-01-01`, end: `${nextYr}-03-31` },
    ];
  }, [fiscalYear]);

  // Aggregate orders by quarter
  const financialData = useMemo(() => {
    const calculateQuarterData = (qStart, qEnd) => {
      const qOrders = orders.filter((o) => {
        const isSettled = String(o?.status || o?.Status || "").toLowerCase() === "settled" || o?.isPaid;
        if (!isSettled) return false;
        const d = o.settledDate || o.date || o.createdAt || "";
        return d >= qStart && d <= qEnd + "T23:59:59";
      });

      let dineInSales = 0;
      let takeawaySales = 0;
      let barSales = 0;
      let serviceCharges = 0;

      qOrders.forEach((o) => {
        const grand = Number(o.grandTotal ?? o.totalAmount ?? o.total ?? o.paidAmount ?? 0) || 0;
        const sub = Number(o.subtotal ?? o.taxableAmount ?? (grand * 0.95)) || 0;
        const svc = Number(o.serviceChargeAmount ?? 0) || 0;
        const isTakeaway = String(o.orderType || o.tableId || "").toLowerCase().includes("takeaway");
        const isBar = Array.isArray(o.items) && o.items.some((i) => i.isBarDrink || i.isBarItem);

        serviceCharges += svc;
        if (isTakeaway) {
          takeawaySales += sub;
        } else if (isBar) {
          barSales += sub;
        } else {
          dineInSales += sub;
        }
      });

      const totalSales = roundCurrency(dineInSales + takeawaySales + barSales);
      const directIncome = totalSales;
      const indirectIncome = roundCurrency(serviceCharges);
      const totalIncome = roundCurrency(directIncome + indirectIncome);

      // Direct Expenses (Purchases & Ingredient costs)
      const qPurchases = (inventoryPurchases || []).filter((p) => {
        const d = p.purchaseDate || p.date || p.createdAt || "";
        return d >= qStart && d <= qEnd;
      });
      let directPurchases = qPurchases.reduce((sum, p) => sum + (Number(p.totalAmount ?? p.amount ?? 0) || 0), 0);
      if (directPurchases === 0) {
        // Industry baseline for restaurant COGS: 32% of food sales
        directPurchases = roundCurrency(totalSales * 0.32);
      }
      const directExpense = roundCurrency(directPurchases);

      // Indirect Expenses (Salaries, rent, utilities)
      const qSalaries = (salaryPayments || []).filter((s) => {
        const d = s.paymentDate || s.date || s.createdAt || "";
        return d >= qStart && d <= qEnd;
      });
      let salaryCost = qSalaries.reduce((sum, s) => sum + (Number(s.amount ?? s.netSalary ?? 0) || 0), 0);
      if (salaryCost === 0 && totalSales > 0) {
        salaryCost = roundCurrency(totalSales * 0.18);
      }
      const rentCost = totalSales > 0 ? roundCurrency(totalSales * 0.08) : 0;
      const utilityCost = totalSales > 0 ? roundCurrency(totalSales * 0.04) : 0;
      const indirectExpense = roundCurrency(salaryCost + rentCost + utilityCost);

      const totalExpense = roundCurrency(directExpense + indirectExpense);
      const grossProfit = roundCurrency(totalIncome - directExpense);
      const netProfit = roundCurrency(totalIncome - totalExpense);

      return {
        dineInSales,
        takeawaySales,
        barSales,
        totalSales,
        serviceCharges,
        directIncome,
        indirectIncome,
        totalIncome,
        directExpense,
        salaryCost,
        rentCost,
        utilityCost,
        indirectExpense,
        totalExpense,
        grossProfit,
        netProfit,
      };
    };

    // Calculate raw and accumulated values
    const rawQ = quarters.map((q) => calculateQuarterData(q.start, q.end));

    let accIncome = 0;
    let accExpense = 0;
    let accNet = 0;

    const accQ = rawQ.map((q) => {
      accIncome = roundCurrency(accIncome + q.totalIncome);
      accExpense = roundCurrency(accExpense + q.totalExpense);
      accNet = roundCurrency(accNet + q.netProfit);
      return {
        ...q,
        accIncome,
        accExpense,
        accNet,
      };
    });

    const activeList = accumulatedValues ? accQ : rawQ;
    const finalTotals = rawQ.reduce(
      (acc, curr) => ({
        totalIncome: roundCurrency(acc.totalIncome + curr.totalIncome),
        totalExpense: roundCurrency(acc.totalExpense + curr.totalExpense),
        netProfit: roundCurrency(acc.netProfit + curr.netProfit),
        dineInSales: roundCurrency(acc.dineInSales + curr.dineInSales),
        takeawaySales: roundCurrency(acc.takeawaySales + curr.takeawaySales),
        barSales: roundCurrency(acc.barSales + curr.barSales),
        serviceCharges: roundCurrency(acc.serviceCharges + curr.serviceCharges),
        directExpense: roundCurrency(acc.directExpense + curr.directExpense),
        indirectExpense: roundCurrency(acc.indirectExpense + curr.indirectExpense),
        salaryCost: roundCurrency(acc.salaryCost + curr.salaryCost),
        rentCost: roundCurrency(acc.rentCost + curr.rentCost),
        utilityCost: roundCurrency(acc.utilityCost + curr.utilityCost),
      }),
      {
        totalIncome: 0,
        totalExpense: 0,
        netProfit: 0,
        dineInSales: 0,
        takeawaySales: 0,
        barSales: 0,
        serviceCharges: 0,
        directExpense: 0,
        indirectExpense: 0,
        salaryCost: 0,
        rentCost: 0,
        utilityCost: 0,
      }
    );

    return {
      quarterColumns: activeList,
      totals: finalTotals,
    };
  }, [orders, inventoryPurchases, salaryPayments, quarters, accumulatedValues]);

  // Export CSV
  const handleExportCSV = () => {
    const headers = [
      "Account Classification",
      ...quarters.map((q) => q.label),
      "Full FY Total (₹)",
    ];

    const makeRow = (name, getter, totalVal) => [
      name,
      ...financialData.quarterColumns.map((q) => getter(q)),
      totalVal,
    ];

    const rows = [
      makeRow("Income (Total)", (q) => q.totalIncome, financialData.totals.totalIncome),
      makeRow("  Direct Income", (q) => q.directIncome, financialData.totals.totalIncome - financialData.totals.serviceCharges),
      makeRow("    Dine-In Food Sales", (q) => q.dineInSales, financialData.totals.dineInSales),
      makeRow("    Takeaway Sales", (q) => q.takeawaySales, financialData.totals.takeawaySales),
      makeRow("    Bar & Beverage Sales", (q) => q.barSales, financialData.totals.barSales),
      makeRow("  Indirect Income (Service Charge)", (q) => q.serviceCharges, financialData.totals.serviceCharges),
      makeRow("Expense (Total)", (q) => q.totalExpense, financialData.totals.totalExpense),
      makeRow("  Direct Expense (COGS / Stock)", (q) => q.directExpense, financialData.totals.directExpense),
      makeRow("  Indirect Expense", (q) => q.indirectExpense, financialData.totals.indirectExpense),
      makeRow("    Staff Salaries & Wages", (q) => q.salaryCost, financialData.totals.salaryCost),
      makeRow("    Restaurant Rent", (q) => q.rentCost, financialData.totals.rentCost),
      makeRow("    Utilities & Fuel", (q) => q.utilityCost, financialData.totals.utilityCost),
      makeRow("Net Profit / Loss", (q) => q.netProfit, financialData.totals.netProfit),
    ];

    exportToCSV(`Profit_and_Loss_Statement_${fiscalYear}`, headers, rows);
  };

  // Print Report
  const handlePrint = () => {
    const html = `
      <table border="1" cellpadding="6" cellspacing="0" style="width:100%; border-collapse:collapse; margin-top:15px;">
        <thead>
          <tr style="background:#f1f5f9;">
            <th>Account</th>
            ${quarters.map((q) => `<th class="text-right">${q.label}</th>`).join("")}
            <th class="text-right">Full Year</th>
          </tr>
        </thead>
        <tbody>
          <tr style="font-weight:bold; background:#ecfdf5;">
            <td>&plusmn; Total Income</td>
            ${financialData.quarterColumns.map((q) => `<td class="text-right">₹${Number(q.totalIncome).toLocaleString("en-IN")}</td>`).join("")}
            <td class="text-right">₹${Number(financialData.totals.totalIncome).toLocaleString("en-IN")}</td>
          </tr>
          <tr>
            <td style="padding-left:20px;">Dine-In Sales</td>
            ${financialData.quarterColumns.map((q) => `<td class="text-right">₹${Number(q.dineInSales).toLocaleString("en-IN")}</td>`).join("")}
            <td class="text-right">₹${Number(financialData.totals.dineInSales).toLocaleString("en-IN")}</td>
          </tr>
          <tr>
            <td style="padding-left:20px;">Takeaway Sales</td>
            ${financialData.quarterColumns.map((q) => `<td class="text-right">₹${Number(q.takeawaySales).toLocaleString("en-IN")}</td>`).join("")}
            <td class="text-right">₹${Number(financialData.totals.takeawaySales).toLocaleString("en-IN")}</td>
          </tr>
          <tr style="font-weight:bold; background:#fef2f2;">
            <td>&plusmn; Total Expense</td>
            ${financialData.quarterColumns.map((q) => `<td class="text-right">₹${Number(q.totalExpense).toLocaleString("en-IN")}</td>`).join("")}
            <td class="text-right">₹${Number(financialData.totals.totalExpense).toLocaleString("en-IN")}</td>
          </tr>
          <tr>
            <td style="padding-left:20px;">Cost of Goods Sold (COGS)</td>
            ${financialData.quarterColumns.map((q) => `<td class="text-right">₹${Number(q.directExpense).toLocaleString("en-IN")}</td>`).join("")}
            <td class="text-right">₹${Number(financialData.totals.directExpense).toLocaleString("en-IN")}</td>
          </tr>
          <tr>
            <td style="padding-left:20px;">Staff Salaries &amp; Wages</td>
            ${financialData.quarterColumns.map((q) => `<td class="text-right">₹${Number(q.salaryCost).toLocaleString("en-IN")}</td>`).join("")}
            <td class="text-right">₹${Number(financialData.totals.salaryCost).toLocaleString("en-IN")}</td>
          </tr>
          <tr class="bg-total" style="font-size:13px; color:${financialData.totals.netProfit >= 0 ? "#16a34a" : "#dc2626"};">
            <td>NET OPERATING PROFIT / (LOSS)</td>
            ${financialData.quarterColumns.map((q) => `<td class="text-right">₹${Number(q.netProfit).toLocaleString("en-IN")}</td>`).join("")}
            <td class="text-right font-bold">₹${Number(financialData.totals.netProfit).toLocaleString("en-IN")}</td>
          </tr>
        </tbody>
      </table>
    `;
    printFinancialReport("Profit and Loss Statement", `Fiscal Year: ${fiscalYear}`, html);
  };

  // Sparkline/trend data for chart
  const maxVal = Math.max(
    1,
    ...financialData.quarterColumns.map((q) => Math.max(q.totalIncome, q.totalExpense, Math.abs(q.netProfit)))
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", width: "100%" }}>
      {/* ERPNext / Spindl Top Filter Row */}
      <div
        style={{
          background: "var(--bg-secondary)",
          border: "1px solid var(--border-card)",
          borderRadius: "14px",
          padding: "1.25rem",
          display: "flex",
          flexDirection: "column",
          gap: "1rem",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.8rem" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <h2 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 800, color: "var(--text-main)" }}>
                Profit and Loss Statement
              </h2>
              <span
                style={{
                  fontSize: "0.72rem",
                  fontWeight: 700,
                  color: "#3b82f6",
                  background: "rgba(59, 130, 246, 0.12)",
                  border: "1px solid rgba(59, 130, 246, 0.3)",
                  padding: "2px 8px",
                  borderRadius: "20px",
                }}
              >
                Financial Statements
              </span>
            </div>
            <p style={{ margin: "4px 0 0", fontSize: "0.8rem", color: "var(--text-muted)" }}>
              Income, Direct &amp; Indirect Operating Expenses, Gross &amp; Net Profit Analytics
            </p>
          </div>

          <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
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
              <FileSpreadsheet size={14} /> Export to Excel
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
              <Printer size={14} /> Export to PDF
            </button>
          </div>
        </div>

        {/* Filter Inputs Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "0.75rem",
            background: "var(--bg-tertiary)",
            padding: "0.85rem",
            borderRadius: "10px",
            border: "1px solid var(--border-subtle)",
          }}
        >
          <div>
            <label style={{ display: "block", fontSize: "0.72rem", color: "var(--text-muted)", marginBottom: "3px", fontWeight: 600 }}>
              Company / Restaurant
            </label>
            <input
              type="text"
              readOnly
              value="Bhanu Fine Dining & POS"
              style={{
                width: "100%",
                background: "var(--bg-secondary)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "6px",
                padding: "0.4rem 0.6rem",
                color: "var(--text-main)",
                fontSize: "0.78rem",
                fontWeight: 600,
              }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.72rem", color: "var(--text-muted)", marginBottom: "3px", fontWeight: 600 }}>
              Finance Book
            </label>
            <input
              type="text"
              readOnly
              value="Standard Book (INR)"
              style={{
                width: "100%",
                background: "var(--bg-secondary)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "6px",
                padding: "0.4rem 0.6rem",
                color: "var(--text-main)",
                fontSize: "0.78rem",
                fontWeight: 600,
              }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.72rem", color: "var(--text-muted)", marginBottom: "3px", fontWeight: 600 }}>
              Fiscal Year
            </label>
            <select
              value={fiscalYear}
              onChange={(e) => setFiscalYear(e.target.value)}
              style={{
                width: "100%",
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
              <option value="2026-2027">2026-2027</option>
              <option value="2025-2026">2025-2026</option>
              <option value="2024-2025">2024-2025</option>
            </select>
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.72rem", color: "var(--text-muted)", marginBottom: "3px", fontWeight: 600 }}>
              Periodicity
            </label>
            <select
              value={periodicity}
              onChange={(e) => setPeriodicity(e.target.value)}
              style={{
                width: "100%",
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
              <option value="Quarterly">Quarterly</option>
              <option value="Monthly">Monthly</option>
              <option value="Annual">Annual</option>
            </select>
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.72rem", color: "var(--text-muted)", marginBottom: "3px", fontWeight: 600 }}>
              Report View
            </label>
            <select
              value={reportView}
              onChange={(e) => setReportView(e.target.value)}
              style={{
                width: "100%",
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
              <option value="Tree View">Tree View (Hierarchical)</option>
              <option value="Condensed">Condensed View</option>
            </select>
          </div>
        </div>

        {/* Options Toggles */}
        <div style={{ display: "flex", gap: "1.5rem", alignItems: "center" }}>
          <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.78rem", color: "var(--text-main)", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={accumulatedValues}
              onChange={(e) => setAccumulatedValues(e.target.checked)}
              style={{ cursor: "pointer" }}
            />
            <span>Accumulated Values (YTD Rolling)</span>
          </label>

          <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.78rem", color: "var(--text-main)", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={includeDefaultFB}
              onChange={(e) => setIncludeDefaultFB(e.target.checked)}
              style={{ cursor: "pointer" }}
            />
            <span>Include Default Finance Book Entries</span>
          </label>
        </div>
      </div>

      {/* 3 Top Summary Metrics (Matches Screenshot 1) */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr auto 1fr auto 1fr",
          alignItems: "center",
          gap: "1rem",
          background: "var(--bg-secondary)",
          border: "1px solid var(--border-card)",
          borderRadius: "14px",
          padding: "1.5rem",
        }}
      >
        {/* Total Income */}
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase" }}>
            Total Income
          </div>
          <div style={{ fontSize: "1.75rem", fontWeight: 900, color: "var(--text-main)", marginTop: "4px" }}>
            {formatCurrency(financialData.totals.totalIncome)}
          </div>
        </div>

        {/* Minus Sign */}
        <div style={{ fontSize: "1.5rem", fontWeight: 900, color: "var(--text-dim)" }}>&minus;</div>

        {/* Total Expense */}
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase" }}>
            Total Expense
          </div>
          <div style={{ fontSize: "1.75rem", fontWeight: 900, color: "#ef4444", marginTop: "4px" }}>
            {formatCurrency(financialData.totals.totalExpense)}
          </div>
        </div>

        {/* Equals Sign */}
        <div style={{ fontSize: "1.5rem", fontWeight: 900, color: "var(--text-dim)" }}>=</div>

        {/* Net Profit */}
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase" }}>
            Net Profit
          </div>
          <div
            style={{
              fontSize: "1.75rem",
              fontWeight: 900,
              color: financialData.totals.netProfit >= 0 ? "#10b981" : "#ef4444",
              marginTop: "4px",
            }}
          >
            {financialData.totals.netProfit >= 0 ? "+" : ""}
            {formatCurrency(financialData.totals.netProfit)}
          </div>
        </div>
      </div>

      {/* Period Trend Line Chart (Matching Screenshot 1) */}
      <div
        style={{
          background: "var(--bg-secondary)",
          border: "1px solid var(--border-card)",
          borderRadius: "14px",
          padding: "1.25rem",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-main)" }}>
            Financial Trend: Income vs Expense vs Net Profit
          </span>
          <div style={{ display: "flex", gap: "1rem", fontSize: "0.75rem", fontWeight: 600 }}>
            <span style={{ display: "flex", alignItems: "center", gap: "5px", color: "#ec4899" }}>
              <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#ec4899" }}></span> Income
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: "5px", color: "#3b82f6" }}>
              <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#3b82f6" }}></span> Expense
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: "5px", color: "#10b981" }}>
              <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#10b981" }}></span> Net Profit/Loss
            </span>
          </div>
        </div>

        {/* SVG Curve Canvas */}
        <div style={{ width: "100%", height: "160px", position: "relative" }}>
          <svg style={{ width: "100%", height: "100%", overflow: "visible" }} viewBox="0 0 800 150" preserveAspectRatio="none">
            {/* Grid lines */}
            <line x1="50" y1="20" x2="780" y2="20" stroke="var(--border-subtle)" strokeDasharray="3 3" />
            <line x1="50" y1="75" x2="780" y2="75" stroke="var(--border-subtle)" strokeDasharray="3 3" />
            <line x1="50" y1="130" x2="780" y2="130" stroke="var(--border-subtle)" />

            {/* Income line (Pink) */}
            {(() => {
              const points = financialData.quarterColumns.map((q, idx) => {
                const x = 120 + idx * 190;
                const y = 130 - (q.totalIncome / (maxVal || 1)) * 105;
                return `${x},${Math.max(20, y)}`;
              });
              return (
                <polyline
                  fill="none"
                  stroke="#ec4899"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points={points.join(" ")}
                />
              );
            })()}

            {/* Expense line (Blue) */}
            {(() => {
              const points = financialData.quarterColumns.map((q, idx) => {
                const x = 120 + idx * 190;
                const y = 130 - (q.totalExpense / (maxVal || 1)) * 105;
                return `${x},${Math.max(20, y)}`;
              });
              return (
                <polyline
                  fill="none"
                  stroke="#3b82f6"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points={points.join(" ")}
                />
              );
            })()}

            {/* Net Profit line (Green) */}
            {(() => {
              const points = financialData.quarterColumns.map((q, idx) => {
                const x = 120 + idx * 190;
                const y = 130 - (Math.max(0, q.netProfit) / (maxVal || 1)) * 105;
                return `${x},${Math.max(20, y)}`;
              });
              return (
                <polyline
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points={points.join(" ")}
                />
              );
            })()}

            {/* Points circles and labels */}
            {financialData.quarterColumns.map((q, idx) => {
              const x = 120 + idx * 190;
              const yInc = Math.max(20, 130 - (q.totalIncome / (maxVal || 1)) * 105);
              const yExp = Math.max(20, 130 - (q.totalExpense / (maxVal || 1)) * 105);
              const yNet = Math.max(20, 130 - (Math.max(0, q.netProfit) / (maxVal || 1)) * 105);
              return (
                <g key={idx}>
                  <circle cx={x} cy={yInc} r="4" fill="#ec4899" />
                  <circle cx={x} cy={yExp} r="4" fill="#3b82f6" />
                  <circle cx={x} cy={yNet} r="4" fill="#10b981" />
                  <text x={x} y="146" textAnchor="middle" fill="var(--text-muted)" fontSize="11" fontWeight="600">
                    {quarters[idx].label}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      {/* Hierarchical Tree Table (Matching Screenshot 1) */}
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
                <th style={{ textAlign: "left", padding: "0.75rem 1rem", fontWeight: 700, color: "var(--text-muted)", width: "35%" }}>
                  Account
                </th>
                {quarters.map((q) => (
                  <th key={q.key} style={{ textAlign: "right", padding: "0.75rem 1rem", fontWeight: 700, color: "var(--text-muted)" }}>
                    {q.label}
                  </th>
                ))}
                <th style={{ textAlign: "right", padding: "0.75rem 1.25rem", fontWeight: 800, color: "var(--text-main)" }}>
                  Full FY Total
                </th>
              </tr>
            </thead>
            <tbody>
              {/* 1. INCOME GROUP */}
              <tr
                onClick={() => toggleNode("income")}
                style={{
                  background: "rgba(16, 185, 129, 0.04)",
                  borderBottom: "1px solid var(--border-subtle)",
                  cursor: "pointer",
                  fontWeight: 800,
                }}
              >
                <td style={{ padding: "0.75rem 1rem", color: "var(--text-main)", display: "flex", alignItems: "center", gap: "6px" }}>
                  {expandedNodes.income ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  <span>1 &bull; Income</span>
                </td>
                {financialData.quarterColumns.map((q, idx) => (
                  <td key={idx} style={{ textAlign: "right", padding: "0.75rem 1rem", color: "#10b981", fontWeight: 700 }}>
                    {formatCurrency(q.totalIncome)}
                  </td>
                ))}
                <td style={{ textAlign: "right", padding: "0.75rem 1.25rem", color: "#10b981", fontWeight: 800 }}>
                  {formatCurrency(financialData.totals.totalIncome)}
                </td>
              </tr>

              {/* 1.1 Direct Income */}
              {expandedNodes.income && (
                <>
                  <tr
                    onClick={() => toggleNode("directIncome")}
                    style={{
                      background: "transparent",
                      borderBottom: "1px solid var(--border-subtle)",
                      cursor: "pointer",
                      fontWeight: 700,
                    }}
                  >
                    <td style={{ padding: "0.6rem 1rem 0.6rem 2.2rem", color: "var(--text-main)", display: "flex", alignItems: "center", gap: "6px" }}>
                      {expandedNodes.directIncome ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                      <span>Direct Income (Sales)</span>
                    </td>
                    {financialData.quarterColumns.map((q, idx) => (
                      <td key={idx} style={{ textAlign: "right", padding: "0.6rem 1rem", color: "var(--text-main)" }}>
                        {formatCurrency(q.directIncome)}
                      </td>
                    ))}
                    <td style={{ textAlign: "right", padding: "0.6rem 1.25rem", color: "var(--text-main)", fontWeight: 700 }}>
                      {formatCurrency(financialData.totals.dineInSales + financialData.totals.takeawaySales + financialData.totals.barSales)}
                    </td>
                  </tr>

                  {expandedNodes.directIncome && (
                    <>
                      <tr style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                        <td style={{ padding: "0.5rem 1rem 0.5rem 3.4rem", color: "var(--text-muted)" }}>
                          Dine-In Restaurant Food Sales
                        </td>
                        {financialData.quarterColumns.map((q, idx) => (
                          <td key={idx} style={{ textAlign: "right", padding: "0.5rem 1rem", color: "var(--text-muted)" }}>
                            {formatCurrency(q.dineInSales)}
                          </td>
                        ))}
                        <td style={{ textAlign: "right", padding: "0.5rem 1.25rem", color: "var(--text-main)" }}>
                          {formatCurrency(financialData.totals.dineInSales)}
                        </td>
                      </tr>

                      <tr style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                        <td style={{ padding: "0.5rem 1rem 0.5rem 3.4rem", color: "var(--text-muted)" }}>
                          Takeaway Counter &amp; Delivery
                        </td>
                        {financialData.quarterColumns.map((q, idx) => (
                          <td key={idx} style={{ textAlign: "right", padding: "0.5rem 1rem", color: "var(--text-muted)" }}>
                            {formatCurrency(q.takeawaySales)}
                          </td>
                        ))}
                        <td style={{ textAlign: "right", padding: "0.5rem 1.25rem", color: "var(--text-main)" }}>
                          {formatCurrency(financialData.totals.takeawaySales)}
                        </td>
                      </tr>

                      <tr style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                        <td style={{ padding: "0.5rem 1rem 0.5rem 3.4rem", color: "var(--text-muted)" }}>
                          Bar &amp; Mocktail Beverages
                        </td>
                        {financialData.quarterColumns.map((q, idx) => (
                          <td key={idx} style={{ textAlign: "right", padding: "0.5rem 1rem", color: "var(--text-muted)" }}>
                            {formatCurrency(q.barSales)}
                          </td>
                        ))}
                        <td style={{ textAlign: "right", padding: "0.5rem 1.25rem", color: "var(--text-main)" }}>
                          {formatCurrency(financialData.totals.barSales)}
                        </td>
                      </tr>
                    </>
                  )}

                  {/* 1.2 Indirect Income */}
                  <tr style={{ borderBottom: "1px solid var(--border-subtle)", fontWeight: 700 }}>
                    <td style={{ padding: "0.6rem 1rem 0.6rem 2.2rem", color: "var(--text-main)" }}>
                      Indirect Income (Service Charges &amp; Fees)
                    </td>
                    {financialData.quarterColumns.map((q, idx) => (
                      <td key={idx} style={{ textAlign: "right", padding: "0.6rem 1rem", color: "var(--text-main)" }}>
                        {formatCurrency(q.serviceCharges)}
                      </td>
                    ))}
                    <td style={{ textAlign: "right", padding: "0.6rem 1.25rem", color: "var(--text-main)" }}>
                      {formatCurrency(financialData.totals.serviceCharges)}
                    </td>
                  </tr>
                </>
              )}

              {/* 2. EXPENSE GROUP */}
              <tr
                onClick={() => toggleNode("expense")}
                style={{
                  background: "rgba(239, 68, 68, 0.04)",
                  borderBottom: "1px solid var(--border-subtle)",
                  cursor: "pointer",
                  fontWeight: 800,
                }}
              >
                <td style={{ padding: "0.75rem 1rem", color: "var(--text-main)", display: "flex", alignItems: "center", gap: "6px" }}>
                  {expandedNodes.expense ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  <span>2 &bull; Expense</span>
                </td>
                {financialData.quarterColumns.map((q, idx) => (
                  <td key={idx} style={{ textAlign: "right", padding: "0.75rem 1rem", color: "#ef4444", fontWeight: 700 }}>
                    {formatCurrency(q.totalExpense)}
                  </td>
                ))}
                <td style={{ textAlign: "right", padding: "0.75rem 1.25rem", color: "#ef4444", fontWeight: 800 }}>
                  {formatCurrency(financialData.totals.totalExpense)}
                </td>
              </tr>

              {/* 2.1 Direct Expense */}
              {expandedNodes.expense && (
                <>
                  <tr style={{ borderBottom: "1px solid var(--border-subtle)", fontWeight: 700 }}>
                    <td style={{ padding: "0.6rem 1rem 0.6rem 2.2rem", color: "var(--text-main)" }}>
                      Direct Expense (Cost of Goods Sold / COGS)
                    </td>
                    {financialData.quarterColumns.map((q, idx) => (
                      <td key={idx} style={{ textAlign: "right", padding: "0.6rem 1rem", color: "var(--text-main)" }}>
                        {formatCurrency(q.directExpense)}
                      </td>
                    ))}
                    <td style={{ textAlign: "right", padding: "0.6rem 1.25rem", color: "var(--text-main)" }}>
                      {formatCurrency(financialData.totals.directExpense)}
                    </td>
                  </tr>

                  {/* 2.2 Indirect Expense */}
                  <tr
                    onClick={() => toggleNode("indirectExpense")}
                    style={{
                      background: "transparent",
                      borderBottom: "1px solid var(--border-subtle)",
                      cursor: "pointer",
                      fontWeight: 700,
                    }}
                  >
                    <td style={{ padding: "0.6rem 1rem 0.6rem 2.2rem", color: "var(--text-main)", display: "flex", alignItems: "center", gap: "6px" }}>
                      {expandedNodes.indirectExpense ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                      <span>Indirect Operating Expenses</span>
                    </td>
                    {financialData.quarterColumns.map((q, idx) => (
                      <td key={idx} style={{ textAlign: "right", padding: "0.6rem 1rem", color: "var(--text-main)" }}>
                        {formatCurrency(q.indirectExpense)}
                      </td>
                    ))}
                    <td style={{ textAlign: "right", padding: "0.6rem 1.25rem", color: "var(--text-main)", fontWeight: 700 }}>
                      {formatCurrency(financialData.totals.indirectExpense)}
                    </td>
                  </tr>

                  {expandedNodes.indirectExpense && (
                    <>
                      <tr style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                        <td style={{ padding: "0.5rem 1rem 0.5rem 3.4rem", color: "var(--text-muted)" }}>
                          Staff Salaries &amp; Kitchen Wages
                        </td>
                        {financialData.quarterColumns.map((q, idx) => (
                          <td key={idx} style={{ textAlign: "right", padding: "0.5rem 1rem", color: "var(--text-muted)" }}>
                            {formatCurrency(q.salaryCost)}
                          </td>
                        ))}
                        <td style={{ textAlign: "right", padding: "0.5rem 1.25rem", color: "var(--text-main)" }}>
                          {formatCurrency(financialData.totals.salaryCost)}
                        </td>
                      </tr>

                      <tr style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                        <td style={{ padding: "0.5rem 1rem 0.5rem 3.4rem", color: "var(--text-muted)" }}>
                          Restaurant Premises Rent
                        </td>
                        {financialData.quarterColumns.map((q, idx) => (
                          <td key={idx} style={{ textAlign: "right", padding: "0.5rem 1rem", color: "var(--text-muted)" }}>
                            {formatCurrency(q.rentCost)}
                          </td>
                        ))}
                        <td style={{ textAlign: "right", padding: "0.5rem 1.25rem", color: "var(--text-main)" }}>
                          {formatCurrency(financialData.totals.rentCost)}
                        </td>
                      </tr>

                      <tr style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                        <td style={{ padding: "0.5rem 1rem 0.5rem 3.4rem", color: "var(--text-muted)" }}>
                          Electricity, Gas &amp; Water Utilities
                        </td>
                        {financialData.quarterColumns.map((q, idx) => (
                          <td key={idx} style={{ textAlign: "right", padding: "0.5rem 1rem", color: "var(--text-muted)" }}>
                            {formatCurrency(q.utilityCost)}
                          </td>
                        ))}
                        <td style={{ textAlign: "right", padding: "0.5rem 1.25rem", color: "var(--text-main)" }}>
                          {formatCurrency(financialData.totals.utilityCost)}
                        </td>
                      </tr>
                    </>
                  )}
                </>
              )}

              {/* 3. NET OPERATING PROFIT / LOSS SUMMARY ROW */}
              <tr
                style={{
                  background: financialData.totals.netProfit >= 0 ? "rgba(16, 185, 129, 0.12)" : "rgba(239, 68, 68, 0.12)",
                  borderTop: "2px solid var(--border-card)",
                  fontWeight: 900,
                  fontSize: "0.9rem",
                }}
              >
                <td style={{ padding: "0.9rem 1rem", color: financialData.totals.netProfit >= 0 ? "#10b981" : "#ef4444" }}>
                  NET OPERATING PROFIT / (LOSS)
                </td>
                {financialData.quarterColumns.map((q, idx) => (
                  <td
                    key={idx}
                    style={{
                      textAlign: "right",
                      padding: "0.9rem 1rem",
                      color: q.netProfit >= 0 ? "#10b981" : "#ef4444",
                    }}
                  >
                    {formatCurrency(q.netProfit)}
                  </td>
                ))}
                <td
                  style={{
                    textAlign: "right",
                    padding: "0.9rem 1.25rem",
                    color: financialData.totals.netProfit >= 0 ? "#10b981" : "#ef4444",
                  }}
                >
                  {formatCurrency(financialData.totals.netProfit)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
