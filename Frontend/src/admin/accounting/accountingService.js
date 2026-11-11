import { roundCurrency } from "../../utils/formatCurrency";
import {
  apiGetChartOfAccounts,
  apiSaveChartOfAccount,
  apiGetJournalEntries,
  apiCreateJournalEntry,
  apiDeleteJournalEntry,
  apiGetDailyBalances,
  apiSaveDailyBalance,
} from "../../api/accountingApi";

// ============================================================================
// STORAGE KEYS
// ============================================================================
export const STORAGE_KEY_BALANCES = "avsr_opening_closing_balances_v1";
export const STORAGE_KEY_JOURNALS = "avsr_journal_entries_v1";
export const STORAGE_KEY_COA = "avsr_custom_accounts_v1";

// ============================================================================
// STANDARD CHART OF ACCOUNTS (COA)
// ============================================================================
export const DEFAULT_CHART_OF_ACCOUNTS = [
  // 1000 - Assets
  { code: "1001", name: "Cash in Hand", group: "Assets", type: "Current Asset", normalBalance: "Debit", description: "Physical cash in restaurant register" },
  { code: "1002", name: "Bank & UPI Collections", group: "Assets", type: "Current Asset", normalBalance: "Debit", description: "HDFC / ICICI POS terminal & UPI settled account" },
  { code: "1100", name: "Accounts Receivable", group: "Assets", type: "Current Asset", normalBalance: "Debit", description: "Credit customer receivables & pending card settlements" },
  { code: "1200", name: "Inventory Asset", group: "Assets", type: "Current Asset", normalBalance: "Debit", description: "Raw material ingredients, beverage stock & supplies on hand" },
  { code: "1501", name: "Kitchen & Bar Equipment", group: "Assets", type: "Fixed Asset", normalBalance: "Debit", description: "Ovens, fryers, refrigeration, bar blenders, espresso machines" },
  { code: "1502", name: "POS & Computer Equipment", group: "Assets", type: "Fixed Asset", normalBalance: "Debit", description: "Touchscreen terminals, thermal receipt printers, router & display monitors" },
  { code: "1503", name: "Restaurant Furniture & Fixtures", group: "Assets", type: "Fixed Asset", normalBalance: "Debit", description: "Dining tables, luxury chairs, ambient lighting & counter installations" },

  // 2000 - Liabilities
  { code: "2001", name: "Accounts Payable", group: "Liabilities", type: "Current Liability", normalBalance: "Credit", description: "Outstanding dues to raw ingredient & vegetable vendors" },
  { code: "2002", name: "GST Output Tax Payable", group: "Liabilities", type: "Current Liability", normalBalance: "Credit", description: "5% Restaurant GST collected (2.5% CGST + 2.5% SGST)" },
  { code: "2003", name: "Staff Salaries Payable", group: "Liabilities", type: "Current Liability", normalBalance: "Credit", description: "Accrued payroll dues pending monthly disbursement" },
  { code: "2004", name: "Short Term Business Loan", group: "Liabilities", type: "Current Liability", normalBalance: "Credit", description: "Working capital loan & overdraft credit line" },

  // 3000 - Equity
  { code: "3001", name: "Owner Capital & Equity", group: "Equity", type: "Equity", normalBalance: "Credit", description: "Initial capital infused by restaurant partners" },
  { code: "3002", name: "Retained Earnings", group: "Equity", type: "Equity", normalBalance: "Credit", description: "Cumulative net earnings reinvested in the restaurant" },

  // 4000 - Income / Revenue
  { code: "4001", name: "Dine-In Food Sales Revenue", group: "Income", type: "Direct Income", normalBalance: "Credit", description: "Sales generated from table dining" },
  { code: "4002", name: "Takeaway & Delivery Sales Revenue", group: "Income", type: "Direct Income", normalBalance: "Credit", description: "Revenue from parcel orders and takeaway counters" },
  { code: "4003", name: "Bar & Beverages Sales Revenue", group: "Income", type: "Direct Income", normalBalance: "Credit", description: "Mocktails, juices, soft drinks and bar sales" },
  { code: "4004", name: "Service Charges Collected", group: "Income", type: "Indirect Income", normalBalance: "Credit", description: "Discretionary service charges collected from diners" },
  { code: "4005", name: "Other Miscellaneous Income", group: "Income", type: "Indirect Income", normalBalance: "Credit", description: "Scrap sales, event bookings, promo rebates" },

  // 5000 - Expenses
  { code: "5001", name: "Cost of Goods Sold (COGS)", group: "Expenses", type: "Direct Expense", normalBalance: "Debit", description: "Direct kitchen raw materials, meat, vegetables, spices consumed" },
  { code: "5002", name: "Staff Salaries & Wages", group: "Expenses", type: "Indirect Expense", normalBalance: "Debit", description: "Monthly wages for chefs, waitstaff, captains, cashiers & cleaning team" },
  { code: "5003", name: "Restaurant Rent", group: "Expenses", type: "Indirect Expense", normalBalance: "Debit", description: "Monthly lease for restaurant dining floor & kitchen premises" },
  { code: "5004", name: "Electricity & Water Utilities", group: "Expenses", type: "Indirect Expense", normalBalance: "Debit", description: "Commercial power, backup generator diesel, water supply" },
  { code: "5005", name: "Gas & Kitchen Fuel", group: "Expenses", type: "Direct Expense", normalBalance: "Debit", description: "Commercial LPG cylinders & kitchen fuel" },
  { code: "5006", name: "Repairs & Maintenance", group: "Expenses", type: "Indirect Expense", normalBalance: "Debit", description: "HVAC maintenance, kitchen equipment upkeep & civil repairs" },
  { code: "5007", name: "Software & POS Subscriptions", group: "Expenses", type: "Indirect Expense", normalBalance: "Debit", description: "Cloud hosting, SMS gateway, licensing and tech maintenance" },
];

// ============================================================================
// READ / WRITE HELPERS
// ============================================================================
export function getChartOfAccounts() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_COA);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return DEFAULT_CHART_OF_ACCOUNTS;
}

export async function syncChartOfAccountsFromApi() {
  try {
    const res = await apiGetChartOfAccounts();
    if (res?.success && Array.isArray(res.data) && res.data.length > 0) {
      localStorage.setItem(STORAGE_KEY_COA, JSON.stringify(res.data));
      window.dispatchEvent(new CustomEvent("avsr-coa-updated", { detail: res.data }));
      return res.data;
    }
  } catch {}
  return getChartOfAccounts();
}

export function saveChartOfAccounts(accounts) {
  try {
    localStorage.setItem(STORAGE_KEY_COA, JSON.stringify(accounts));
    window.dispatchEvent(new CustomEvent("avsr-coa-updated", { detail: accounts }));
  } catch {}
  // Asynchronously sync latest custom account to backend API
  if (Array.isArray(accounts)) {
    const lastItem = accounts[accounts.length - 1];
    if (lastItem) {
      apiSaveChartOfAccount(lastItem).catch(() => {});
    }
  }
}

export function getJournalEntries() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_JOURNALS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  // Default sample starter journal entries for double-entry trial balance anchor
  const initialJournals = [
    {
      id: "JV-2026-001",
      voucherNumber: "JV-2026-001",
      date: "2026-04-01",
      narration: "Initial Capital infusion by restaurant partners into Bank & Cash",
      lines: [
        { accountCode: "1001", accountName: "Cash in Hand", debit: 50000, credit: 0 },
        { accountCode: "1002", accountName: "Bank & UPI Collections", debit: 450000, credit: 0 },
        { accountCode: "3001", accountName: "Owner Capital & Equity", debit: 0, credit: 500000 },
      ],
      createdBy: "pirnav",
      createdAt: "2026-04-01T09:00:00.000Z",
    },
    {
      id: "JV-2026-002",
      voucherNumber: "JV-2026-002",
      date: "2026-04-05",
      narration: "Acquisition of Commercial Kitchen & POS Equipment",
      lines: [
        { accountCode: "1501", accountName: "Kitchen & Bar Equipment", debit: 180000, credit: 0 },
        { accountCode: "1502", accountName: "POS & Computer Equipment", debit: 65000, credit: 0 },
        { accountCode: "1002", accountName: "Bank & UPI Collections", debit: 0, credit: 245000 },
      ],
      createdBy: "pirnav",
      createdAt: "2026-04-05T11:00:00.000Z",
    },
  ];
  try {
    localStorage.setItem(STORAGE_KEY_JOURNALS, JSON.stringify(initialJournals));
  } catch {}
  return initialJournals;
}

export async function syncJournalEntriesFromApi() {
  try {
    const res = await apiGetJournalEntries();
    if (res?.success && Array.isArray(res.data) && res.data.length > 0) {
      localStorage.setItem(STORAGE_KEY_JOURNALS, JSON.stringify(res.data));
      window.dispatchEvent(new CustomEvent("avsr-journals-updated", { detail: res.data }));
      return res.data;
    }
  } catch {}
  return getJournalEntries();
}

export function saveJournalEntries(entries, latestEntryToPost = null) {
  try {
    localStorage.setItem(STORAGE_KEY_JOURNALS, JSON.stringify(entries));
    window.dispatchEvent(new CustomEvent("avsr-journals-updated", { detail: entries }));
  } catch {}
  // Asynchronously post to backend API
  const entryToPost = latestEntryToPost || (Array.isArray(entries) ? entries[entries.length - 1] : null);
  if (entryToPost && entryToPost.voucherNumber) {
    apiCreateJournalEntry({
      voucherNumber: entryToPost.voucherNumber,
      entryDate: entryToPost.date || entryToPost.entryDate,
      narration: entryToPost.narration,
      lines: entryToPost.lines,
      createdBy: entryToPost.createdBy || "pirnav",
    }).catch(() => {});
  }
}

export function deleteJournalEntryLocallyAndApi(voucherNumber) {
  try {
    const current = getJournalEntries();
    const updated = current.filter((e) => e.voucherNumber !== voucherNumber && e.id !== voucherNumber);
    localStorage.setItem(STORAGE_KEY_JOURNALS, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent("avsr-journals-updated", { detail: updated }));
  } catch {}
  apiDeleteJournalEntry(voucherNumber).catch(() => {});
}

export function getDailyBalances() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_BALANCES);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [];
}

export async function syncDailyBalancesFromApi() {
  try {
    const res = await apiGetDailyBalances();
    if (res?.success && Array.isArray(res.data) && res.data.length > 0) {
      localStorage.setItem(STORAGE_KEY_BALANCES, JSON.stringify(res.data));
      window.dispatchEvent(new CustomEvent("avsr-balances-updated", { detail: res.data }));
      return res.data;
    }
  } catch {}
  return getDailyBalances();
}

export function saveDailyBalances(balances, latestBalanceToPost = null) {
  try {
    localStorage.setItem(STORAGE_KEY_BALANCES, JSON.stringify(balances));
    window.dispatchEvent(new CustomEvent("avsr-balances-updated", { detail: balances }));
  } catch {}
  const balanceToPost = latestBalanceToPost || (Array.isArray(balances) ? balances[balances.length - 1] : null);
  if (balanceToPost && balanceToPost.date) {
    apiSaveDailyBalance({
      date: balanceToPost.date,
      openingCash: Number(balanceToPost.openingCash) || 0,
      openingBank: Number(balanceToPost.openingBank) || 0,
      closingCash: balanceToPost.closingCash != null ? Number(balanceToPost.closingCash) : null,
      closingBank: balanceToPost.closingBank != null ? Number(balanceToPost.closingBank) : null,
      expectedCash: balanceToPost.expectedCash != null ? Number(balanceToPost.expectedCash) : null,
      cashDifference: balanceToPost.cashDifference != null ? Number(balanceToPost.cashDifference) : null,
      isClosed: Boolean(balanceToPost.isClosed),
      openedBy: balanceToPost.openedBy || "pirnav",
      closedBy: balanceToPost.closedBy || (balanceToPost.isClosed ? "pirnav" : null),
      notes: balanceToPost.notes || "",
    }).catch(() => {});
  }
}

// ============================================================================
// CORE DOUBLE-ENTRY POSTINGS GENERATOR
// ============================================================================
/**
 * Automatically maps:
 * 1. Settled Invoices -> Dr Cash/Bank, Cr Revenue, Cr GST, Cr Service Charge
 * 2. Inventory Items / Purchases -> Dr Inventory/COGS, Cr Cash/Bank/Payables
 * 3. Salary Payments -> Dr Salary Expense, Cr Cash/Bank
 * 4. Manual Journal Vouchers -> Exact Dr & Cr as entered
 */
export function generateGeneralLedgerTransactions({
  orders = [],
  inventoryItems = [],
  inventoryPurchases = [],
  salaryPayments = [],
  journalEntries = [],
  startDate = null,
  endDate = null,
}) {
  const transactions = [];

  // Helper date checker
  const isInRange = (dateStr) => {
    if (!dateStr) return true;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return true;
    if (startDate) {
      const s = new Date(startDate);
      s.setHours(0, 0, 0, 0);
      if (d < s) return false;
    }
    if (endDate) {
      const e = new Date(endDate);
      e.setHours(23, 59, 59, 999);
      if (d > e) return false;
    }
    return true;
  };

  // 1. Settled Orders
  orders.forEach((order) => {
    const isSettled = String(order?.status || order?.Status || "").toLowerCase() === "settled" || order?.isPaid;
    if (!isSettled) return;

    const orderDate = order.settledDate || order.date || order.createdAt || new Date().toISOString();
    if (!isInRange(orderDate)) return;

    const grandTotal = roundCurrency(Number(order.grandTotal ?? order.totalAmount ?? order.total ?? order.paidAmount ?? 0));
    const subtotal = roundCurrency(Number(order.subtotal ?? order.taxableAmount ?? (grandTotal * 0.95) ?? 0));
    const taxAmount = roundCurrency(Number(order.taxAmount ?? (grandTotal - subtotal) ?? 0));
    const serviceAmount = roundCurrency(Number(order.serviceChargeAmount ?? 0));
    const paymentMode = String(order.paymentMode || order.paymentMethod || order.PaymentMethod || "cash").toLowerCase();
    const isTakeaway = String(order.orderType || order.tableId || "").toLowerCase().includes("takeaway");
    const isBar = Array.isArray(order.items) && order.items.some((i) => i.isBarDrink || i.isBarItem);

    const assetAccount = paymentMode.includes("upi") || paymentMode.includes("card") || paymentMode.includes("online")
      ? { code: "1002", name: "Bank & UPI Collections" }
      : { code: "1001", name: "Cash in Hand" };

    const revenueAccount = isTakeaway
      ? { code: "4002", name: "Takeaway & Delivery Sales Revenue" }
      : isBar
      ? { code: "4003", name: "Bar & Beverages Sales Revenue" }
      : { code: "4001", name: "Dine-In Food Sales Revenue" };

    const invRef = order.invoiceNumber || order.serverInvoiceNo || order.invoiceNo || order.id || "INV";

    // Dr. Cash or Bank
    transactions.push({
      date: orderDate,
      voucherNo: invRef,
      voucherType: "Sales Receipt",
      accountCode: assetAccount.code,
      accountName: assetAccount.name,
      description: `Settlement of ${isTakeaway ? "Takeaway" : "Table " + (order.tableName || order.tableId || "")} via ${paymentMode.toUpperCase()}`,
      debit: grandTotal,
      credit: 0,
      refId: order.id,
    });

    // Cr. Sales Revenue
    const pureSales = roundCurrency(Math.max(0, grandTotal - taxAmount - serviceAmount));
    transactions.push({
      date: orderDate,
      voucherNo: invRef,
      voucherType: "Sales Invoice",
      accountCode: revenueAccount.code,
      accountName: revenueAccount.name,
      description: `Food & beverage sales revenue from ${invRef}`,
      debit: 0,
      credit: pureSales,
      refId: order.id,
    });

    // Cr. GST Output Tax Payable (if any)
    if (taxAmount > 0) {
      transactions.push({
        date: orderDate,
        voucherNo: invRef,
        voucherType: "Tax Output",
        accountCode: "2002",
        accountName: "GST Output Tax Payable",
        description: `5% GST Output on invoice ${invRef}`,
        debit: 0,
        credit: taxAmount,
        refId: order.id,
      });
    }

    // Cr. Service Charge (if any)
    if (serviceAmount > 0) {
      transactions.push({
        date: orderDate,
        voucherNo: invRef,
        voucherType: "Service Fee",
        accountCode: "4004",
        accountName: "Service Charges Collected",
        description: `Service charges on invoice ${invRef}`,
        debit: 0,
        credit: serviceAmount,
        refId: order.id,
      });
    }
  });

  // 2. Inventory Stock Purchases & Expenses
  if (Array.isArray(inventoryPurchases) && inventoryPurchases.length > 0) {
    inventoryPurchases.forEach((p, idx) => {
      const pDate = p.purchaseDate || p.date || p.createdAt || new Date().toISOString();
      if (!isInRange(pDate)) return;
      const amount = roundCurrency(Number(p.totalAmount ?? p.amount ?? p.totalCost ?? 0));
      if (amount <= 0) return;
      const pRef = p.invoiceNumber || p.billNumber || p.id || `PUR-${idx + 1}`;

      // Dr. COGS / Inventory
      transactions.push({
        date: pDate,
        voucherNo: pRef,
        voucherType: "Purchase Bill",
        accountCode: "5001",
        accountName: "Cost of Goods Sold (COGS)",
        description: `Purchase of ${p.itemName || "Kitchen ingredients"} from ${p.supplierName || "Supplier"}`,
        debit: amount,
        credit: 0,
        refId: p.id,
      });

      // Cr. Cash / Bank
      const payMode = String(p.paymentMethod || p.paymentMode || "Bank").toLowerCase();
      const crCode = payMode.includes("cash") ? "1001" : "1002";
      const crName = payMode.includes("cash") ? "Cash in Hand" : "Bank & UPI Collections";

      transactions.push({
        date: pDate,
        voucherNo: pRef,
        voucherType: "Payment Voucher",
        accountCode: crCode,
        accountName: crName,
        description: `Payment for purchase ${pRef}`,
        debit: 0,
        credit: amount,
        refId: p.id,
      });
    });
  } else {
    // If no dedicated purchase log, estimate from inventory restock valuation
    inventoryItems.forEach((item) => {
      const restockedQty = Number(item.totalRestocked || 0);
      const unitCost = Number(item.unitCost || item.mrp || 0);
      const restockCost = roundCurrency(restockedQty * unitCost);
      if (restockCost > 0) {
        const itemDate = item.lastRestocked || new Date().toISOString();
        if (isInRange(itemDate)) {
          transactions.push({
            date: itemDate,
            voucherNo: `STK-${item.id || "INV"}`,
            voucherType: "Stock Inward",
            accountCode: "1200",
            accountName: "Inventory Asset",
            description: `Stock inward for ${item.name} (${restockedQty} ${item.unit || "units"})`,
            debit: restockCost,
            credit: 0,
            refId: item.id,
          });
          transactions.push({
            date: itemDate,
            voucherNo: `STK-${item.id || "INV"}`,
            voucherType: "Vendor Credit",
            accountCode: "2001",
            accountName: "Accounts Payable",
            description: `Vendor bill for ${item.name}`,
            debit: 0,
            credit: restockCost,
            refId: item.id,
          });
        }
      }
    });
  }

  // 3. Staff Salary Payments
  if (Array.isArray(salaryPayments)) {
    salaryPayments.forEach((sal, idx) => {
      const salDate = sal.paymentDate || sal.date || sal.createdAt || new Date().toISOString();
      if (!isInRange(salDate)) return;
      const salAmount = roundCurrency(Number(sal.amount ?? sal.paidAmount ?? sal.netSalary ?? 0));
      if (salAmount <= 0) return;
      const salRef = sal.voucherNo || sal.id || `SAL-${idx + 1}`;

      // Dr. Staff Salaries & Wages
      transactions.push({
        date: salDate,
        voucherNo: salRef,
        voucherType: "Payroll Voucher",
        accountCode: "5002",
        accountName: "Staff Salaries & Wages",
        description: `Salary disbursement to ${sal.staffName || "Staff"} for ${sal.month || "Current Month"}`,
        debit: salAmount,
        credit: 0,
        refId: sal.id,
      });

      // Cr. Bank Account
      transactions.push({
        date: salDate,
        voucherNo: salRef,
        voucherType: "Payment Voucher",
        accountCode: "1002",
        accountName: "Bank & UPI Collections",
        description: `Bank transfer for salary ${salRef}`,
        debit: 0,
        credit: salAmount,
        refId: sal.id,
      });
    });
  }

  // 4. Manual Journal Entries
  if (Array.isArray(journalEntries)) {
    journalEntries.forEach((jv) => {
      const jvDate = jv.date || jv.createdAt || new Date().toISOString();
      if (!isInRange(jvDate)) return;
      const lines = Array.isArray(jv.lines) ? jv.lines : [];
      lines.forEach((line) => {
        const dr = roundCurrency(Number(line.debit || 0));
        const cr = roundCurrency(Number(line.credit || 0));
        if (dr > 0 || cr > 0) {
          transactions.push({
            date: jvDate,
            voucherNo: jv.voucherNumber || jv.id,
            voucherType: "Journal Entry",
            accountCode: line.accountCode,
            accountName: line.accountName || line.name,
            description: line.description || jv.narration || "Journal entry",
            debit: dr,
            credit: cr,
            refId: jv.id,
          });
        }
      });
    });
  }

  return transactions;
}

// ============================================================================
// TRIAL BALANCE COMPUTATION
// ============================================================================
export function computeTrialBalance({
  chartOfAccounts = getChartOfAccounts(),
  transactions = [],
}) {
  const accountMap = {};

  chartOfAccounts.forEach((acc) => {
    accountMap[acc.code] = {
      code: acc.code,
      name: acc.name,
      group: acc.group,
      type: acc.type,
      normalBalance: acc.normalBalance,
      openingDebit: 0,
      openingCredit: 0,
      debit: 0,
      credit: 0,
      closingDebit: 0,
      closingCredit: 0,
    };
  });

  // Tally transaction Dr / Cr
  transactions.forEach((tx) => {
    if (!accountMap[tx.accountCode]) {
      // Auto-register any unlisted account
      accountMap[tx.accountCode] = {
        code: tx.accountCode,
        name: tx.accountName || `Account ${tx.accountCode}`,
        group: tx.accountCode.startsWith("1") ? "Assets" : tx.accountCode.startsWith("2") ? "Liabilities" : tx.accountCode.startsWith("3") ? "Equity" : tx.accountCode.startsWith("4") ? "Income" : "Expenses",
        type: "General Account",
        normalBalance: (tx.accountCode.startsWith("1") || tx.accountCode.startsWith("5")) ? "Debit" : "Credit",
        openingDebit: 0,
        openingCredit: 0,
        debit: 0,
        credit: 0,
        closingDebit: 0,
        closingCredit: 0,
      };
    }
    const target = accountMap[tx.accountCode];
    target.debit = roundCurrency(target.debit + Number(tx.debit || 0));
    target.credit = roundCurrency(target.credit + Number(tx.credit || 0));
  });

  // Calculate closing balances according to normal balance rules
  const rows = Object.values(accountMap).map((acc, index) => {
    const net = roundCurrency((acc.openingDebit - acc.openingCredit) + (acc.debit - acc.credit));
    let closingDebit = 0;
    let closingCredit = 0;

    if (acc.group === "Assets" || acc.group === "Expenses") {
      if (net >= 0) {
        closingDebit = net;
      } else {
        closingCredit = Math.abs(net);
      }
    } else {
      // Liabilities, Equity, Income
      if (net <= 0) {
        closingCredit = Math.abs(net);
      } else {
        closingDebit = net;
      }
    }

    return {
      sNo: index + 1,
      ...acc,
      closingDebit: roundCurrency(closingDebit),
      closingCredit: roundCurrency(closingCredit),
    };
  });

  // Filter out completely inactive accounts unless they have transactions
  const activeRows = rows.filter((r) => r.openingDebit > 0 || r.openingCredit > 0 || r.debit > 0 || r.credit > 0 || r.closingDebit > 0 || r.closingCredit > 0);

  const totalOpeningDebit = roundCurrency(activeRows.reduce((sum, r) => sum + r.openingDebit, 0));
  const totalOpeningCredit = roundCurrency(activeRows.reduce((sum, r) => sum + r.openingCredit, 0));
  const totalDebit = roundCurrency(activeRows.reduce((sum, r) => sum + r.debit, 0));
  const totalCredit = roundCurrency(activeRows.reduce((sum, r) => sum + r.credit, 0));
  const totalClosingDebit = roundCurrency(activeRows.reduce((sum, r) => sum + r.closingDebit, 0));
  const totalClosingCredit = roundCurrency(activeRows.reduce((sum, r) => sum + r.closingCredit, 0));

  const difference = roundCurrency(Math.abs(totalDebit - totalCredit));
  const isBalanced = difference === 0;

  return {
    rows: activeRows.map((r, i) => ({ ...r, sNo: i + 1 })),
    totals: {
      openingDebit: totalOpeningDebit,
      openingCredit: totalOpeningCredit,
      debit: totalDebit,
      credit: totalCredit,
      closingDebit: totalClosingDebit,
      closingCredit: totalClosingCredit,
      difference,
      isBalanced,
    },
  };
}

// ============================================================================
// EXPORT HELPERS (EXCEL CSV & PDF/PRINT)
// ============================================================================
export function exportToCSV(filename, headers, rows) {
  const escapeCsv = (val) => {
    if (val === null || val === undefined) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const headerRow = headers.map(escapeCsv).join(",");
  const dataRows = rows.map((row) => row.map(escapeCsv).join(","));
  const csvContent = "\uFEFF" + [headerRow, ...dataRows].join("\r\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function printFinancialReport(title, subtitle, tableHtml) {
  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    alert("Please allow popups to print/export this financial report.");
    return;
  }

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>${title}</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
            color: #0f172a;
            padding: 24px;
            margin: 0;
            background: #ffffff;
          }
          .header {
            text-align: center;
            border-bottom: 2px solid #0f172a;
            padding-bottom: 12px;
            margin-bottom: 20px;
          }
          .header h1 { margin: 0 0 4px 0; font-size: 20px; text-transform: uppercase; letter-spacing: 0.05em; }
          .header h2 { margin: 0 0 4px 0; font-size: 15px; color: #475569; font-weight: 600; }
          .header p { margin: 0; font-size: 12px; color: #64748b; }
          table { width: 100%; border-collapse: collapse; font-size: 11.5px; margin-top: 10px; }
          th { background: #f1f5f9; color: #0f172a; font-weight: 700; text-align: left; padding: 7px 8px; border: 1px solid #cbd5e1; }
          td { padding: 6px 8px; border: 1px solid #e2e8f0; color: #1e293b; }
          .text-right { text-align: right; }
          .text-center { text-align: center; }
          .font-bold { font-weight: 700; }
          .bg-total { background: #f8fafc; font-weight: 800; border-top: 2px solid #0f172a; border-bottom: 2px solid #0f172a; }
          .balanced-badge {
            display: inline-block;
            background: #ecfdf5;
            color: #065f46;
            border: 1px solid #6ee7b7;
            padding: 3px 8px;
            border-radius: 4px;
            font-weight: 700;
            font-size: 11px;
            margin-top: 10px;
          }
          @media print {
            body { padding: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Bhanu Fine Dining &amp; POS Management</h1>
          <h2>${title}</h2>
          <p>${subtitle} &bull; Generated on ${new Date().toLocaleString("en-IN")}</p>
        </div>
        ${tableHtml}
        <script>
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
}
