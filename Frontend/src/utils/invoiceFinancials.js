/**
 * Pure financial aggregation, day-wise breakdown, and CSV export helpers
 * for Phase 3.7 Unified Admin Invoice Management.
 * Uses strictly backend-authoritative invoice fields; never fabricates values.
 */

export function getInvoiceStatusCategory(order) {
  const raw = String(order?.backendStatus ?? order?.status ?? order?.Status ?? "")
    .trim()
    .toLowerCase();
  if (raw === "cancelled" || raw === "canceled") return "cancelled";
  if (raw === "refunded") return "refunded";
  if (raw === "void" || raw === "voided") return "void";
  if (raw === "partial") return "partial";
  if (raw === "unpaid" || raw === "pending") return "unpaid";
  if (raw === "paid" || raw === "settled") return "paid";

  const total = Number(order?.totalAmount ?? order?.grandTotal ?? 0) || 0;
  const paid = Number(order?.paidAmount ?? order?.amountPaid ?? 0) || 0;
  if (total > 0 && paid >= total) return "paid";
  if (paid > 0) return "partial";
  return "unpaid";
}

export function isExcludedFromSales(statusCategory) {
  return statusCategory === "void" || statusCategory === "cancelled" || statusCategory === "refunded";
}

export function getActualGstAmount(order) {
  const explicitTax = Number(order?.taxAmount ?? order?.TaxAmount);
  if (Number.isFinite(explicitTax) && explicitTax > 0) return explicitTax;
  const cgst = Number(order?.cgstAmount ?? order?.CGSTAmount ?? order?.cgst ?? 0) || 0;
  const sgst = Number(order?.sgstAmount ?? order?.SGSTAmount ?? order?.sgst ?? 0) || 0;
  return cgst + sgst;
}

export function getActualServiceCharge(order) {
  return Number(order?.serviceChargeAmount ?? order?.ServiceChargeAmount ?? 0) || 0;
}

function classifyMode(rawMode) {
  const m = String(rawMode || "").trim().toLowerCase();
  if (m.includes("upi")) return "upi";
  if (m.includes("card")) return "card";
  if (m.includes("cash")) return "cash";
  return "other";
}

function classifyOrderType(order) {
  const raw = String(order?.orderType ?? order?.OrderType ?? "").trim().toLowerCase();
  if (raw.includes("self") || raw.includes("qr") || order?.isSelfService) return "selfService";
  if (raw.includes("take") || raw === "parcel" || order?.tableName === "Takeaway") return "takeaway";
  if (raw.includes("dine") || order?.tableId || order?.tableName) return "dineIn";
  return "other";
}

/**
 * Aggregate Financial Summary Cards + Payment Method + Order Type breakdowns.
 * Never includes VOID, CANCELLED, or REFUNDED invoices in paid sales.
 * @param {Array<object>} orders
 */
export function computeFinancialSummary(orders = []) {
  let validCount = 0;
  let voidCount = 0;
  let cancelledCount = 0;
  let refundedCount = 0;

  let grossSales = 0;
  let totalDiscounts = 0;
  let totalServiceCharges = 0;
  let totalTax = 0;
  let netSales = 0;
  let totalPaid = 0;
  let pendingAmount = 0;
  let voidAmount = 0;
  let cancelledAmount = 0;
  let refundedAmount = 0;

  const paymentBreakdown = { cash: 0, upi: 0, card: 0, hasData: false };
  const orderTypeBreakdown = {
    dineIn: { count: 0, netSales: 0 },
    takeaway: { count: 0, netSales: 0 },
    selfService: { count: 0, netSales: 0 },
    hasData: false,
  };

  orders.forEach((o) => {
    const sKey = getInvoiceStatusCategory(o);
    const sub = Number(o?.subtotal ?? o?.Subtotal ?? 0) || 0;
    const disc = Number(o?.discountAmount ?? o?.DiscountAmount ?? 0) || 0;
    const svc = getActualServiceCharge(o);
    const tax = getActualGstAmount(o);
    const total = Number(o?.totalAmount ?? o?.TotalAmount ?? o?.grandTotal ?? o?.GrandTotal ?? 0) || 0;
    const paid = Number(o?.paidAmount ?? o?.PaidAmount ?? o?.amountPaid ?? 0) || 0;
    const due = Number(o?.dueAmount ?? o?.DueAmount ?? 0) || 0;

    if (sKey === "cancelled") {
      cancelledCount += 1;
      cancelledAmount += total;
      return;
    }
    if (sKey === "refunded") {
      refundedCount += 1;
      refundedAmount += total;
      return;
    }
    if (sKey === "void") {
      voidCount += 1;
      voidAmount += total;
      return;
    }

    validCount += 1;
    grossSales += sub;
    totalDiscounts += disc;
    totalServiceCharges += svc;
    totalTax += tax;
    netSales += total;
    totalPaid += paid;

    if (sKey === "unpaid" || sKey === "partial") {
      pendingAmount += due > 0 ? due : Math.max(0, total - paid);
    }

    // Payment method breakdown from actual payments or paymentMethod
    const payments = Array.isArray(o?.payments) ? o.payments : [];
    if (payments.length > 0) {
      payments.forEach((p) => {
        const amt = Number(p?.amount ?? p?.Amount ?? 0) || 0;
        if (amt > 0) {
          const bucket = classifyMode(p?.paymentMode ?? p?.PaymentMode ?? p?.mode ?? p?.Mode);
          if (bucket !== "other") {
            paymentBreakdown[bucket] += amt;
            paymentBreakdown.hasData = true;
          }
        }
      });
    } else if (paid > 0) {
      const bucket = classifyMode(o?.paymentMethod ?? o?.PaymentMethod ?? o?.paymentMode ?? o?.PaymentMode);
      if (bucket !== "other") {
        paymentBreakdown[bucket] += paid;
        paymentBreakdown.hasData = true;
      }
    }

    // Order type breakdown
    const channel = classifyOrderType(o);
    if (channel !== "other") {
      orderTypeBreakdown[channel].count += 1;
      orderTypeBreakdown[channel].netSales += total;
      orderTypeBreakdown.hasData = true;
    }
  });

  const excludedCount = voidCount + cancelledCount + refundedCount;

  return {
    totalInvoices: orders.length,
    validCount,
    excludedCount,
    voidCount,
    cancelledCount,
    refundedCount,
    grossSales,
    totalDiscounts,
    totalServiceCharges,
    totalTax,
    netSales,
    totalPaid,
    pendingAmount,
    voidAmount,
    cancelledAmount,
    refundedAmount,
    paymentBreakdown,
    orderTypeBreakdown,
  };
}

function enumerateDateRange(fromYmd, toYmd, maxDays = 90) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(fromYmd || "")) || !/^\d{4}-\d{2}-\d{2}$/.test(String(toYmd || ""))) {
    return [];
  }
  const [fy, fm, fd] = fromYmd.split("-").map(Number);
  const [ty, tm, td] = toYmd.split("-").map(Number);
  const start = new Date(fy, fm - 1, fd);
  const end = new Date(ty, tm - 1, td);
  if (end < start) return [];

  const dates = [];
  const cursor = new Date(start);
  while (cursor <= end && dates.length < maxDays) {
    const y = cursor.getFullYear();
    const m = String(cursor.getMonth() + 1).padStart(2, "0");
    const d = String(cursor.getDate()).padStart(2, "0");
    dates.push(`${y}-${m}-${d}`);
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
}

/**
 * Build complete day-wise breakdown for Weekly (Mon-Sun), Monthly (all days of month),
 * and Custom date ranges.
 */
export function buildDayWiseBreakdown({
  orders = [],
  dateFilter,
  selectedWeek,
  selectedMonth,
  appliedCustomRange,
  getDateKey,
}) {
  if (dateFilter !== "weekly" && dateFilter !== "monthly" && dateFilter !== "custom") {
    return [];
  }

  let expectedDates = [];
  if (dateFilter === "weekly" && selectedWeek?.from && selectedWeek?.to) {
    expectedDates = enumerateDateRange(selectedWeek.from, selectedWeek.to, 7);
  } else if (dateFilter === "monthly" && /^\d{4}-\d{2}$/.test(String(selectedMonth || ""))) {
    const [y, m] = selectedMonth.split("-").map(Number);
    const lastDay = new Date(y, m, 0).getDate();
    expectedDates = Array.from({ length: lastDay }, (_, i) => {
      return `${y}-${String(m).padStart(2, "0")}-${String(i + 1).padStart(2, "0")}`;
    });
  } else if (dateFilter === "custom" && appliedCustomRange?.from && appliedCustomRange?.to) {
    expectedDates = enumerateDateRange(appliedCustomRange.from, appliedCustomRange.to, 90);
  }

  const byDay = new Map();
  expectedDates.forEach((dKey) => {
    byDay.set(dKey, {
      dateKey: dKey,
      count: 0,
      validCount: 0,
      totalAmount: 0,
      paidAmount: 0,
      pendingAmount: 0,
    });
  });

  orders.forEach((o) => {
    const dKey = getDateKey(o);
    if (!dKey) return;
    if (expectedDates.length > 0 && !byDay.has(dKey)) return;
    if (!byDay.has(dKey)) {
      byDay.set(dKey, {
        dateKey: dKey,
        count: 0,
        validCount: 0,
        totalAmount: 0,
        paidAmount: 0,
        pendingAmount: 0,
      });
    }
    const entry = byDay.get(dKey);
    const sKey = getInvoiceStatusCategory(o);
    entry.count += 1;
    if (!isExcludedFromSales(sKey)) {
      entry.validCount += 1;
      entry.totalAmount += Number(o?.totalAmount ?? o?.grandTotal ?? 0) || 0;
      entry.paidAmount += Number(o?.paidAmount ?? o?.amountPaid ?? 0) || 0;
      if (sKey === "unpaid" || sKey === "partial") {
        entry.pendingAmount += Number(o?.dueAmount ?? 0) || 0;
      }
    }
  });

  return Array.from(byDay.values()).sort((a, b) => (a.dateKey > b.dateKey ? 1 : -1));
}

function escapeCsvCell(val) {
  const str = String(val ?? "");
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Export actual available invoice records to CSV without inventing any fields.
 */
export function buildInvoicesCsv(orders = [], { getInvoiceNumber, getDateText, getOrderType, getStatusLabel }) {
  const headers = [
    "Invoice Number",
    "Order Number",
    "Date",
    "Branch",
    "Order Type",
    "Customer Name",
    "Customer Phone",
    "Status",
    "Subtotal",
    "Discount",
    "Service Charge",
    "GST",
    "Grand Total",
    "Paid Amount",
    "Due Amount",
  ];

  const rows = orders.map((o) => [
    getInvoiceNumber(o),
    o?.orderNumber ?? o?.orderId ?? o?.id ?? "",
    getDateText(o),
    o?.branchName ?? o?.branchId ?? "",
    getOrderType(o),
    o?.customerName ?? "",
    o?.customerPhone ?? "",
    getStatusLabel(o),
    Number(o?.subtotal ?? 0) || 0,
    Number(o?.discountAmount ?? 0) || 0,
    getActualServiceCharge(o),
    getActualGstAmount(o),
    Number(o?.totalAmount ?? o?.grandTotal ?? 0) || 0,
    Number(o?.paidAmount ?? o?.amountPaid ?? 0) || 0,
    Number(o?.dueAmount ?? 0) || 0,
  ]);

  return [headers, ...rows].map((row) => row.map(escapeCsvCell).join(",")).join("\r\n");
}
