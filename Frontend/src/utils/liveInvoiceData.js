import { apiGetInvoices } from "../api/invoiceApi";
import { apiGetOrderHistory } from "../api/orderApi";
import {
  dedupeOrders,
  isSettledInvoiceRecord,
  isSettledSaleRecord,
  sortInvoicesByCreationTime,
  sortOrdersBySettlementTime,
} from "./orderDedupe";
import { sanitizeDishName } from "./sanitizeDishName";
import { getBusinessDayKey, getTodayDateString } from "./invoiceCounter";
const valueFrom = (object, ...keys) => {
  for (const key of keys) {
    const value = object?.[key];
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return undefined;
};

const normalizeItems = (items) =>
  (Array.isArray(items) ? items : []).map((item) => {
    const rawName = valueFrom(item, "name", "Name", "dishName", "DishName") || "";
    const cleanName = sanitizeDishName(rawName);
    return {
      ...item,
      name: cleanName,
      dishName: cleanName,
      quantity: Number(valueFrom(item, "quantity", "Quantity", "qty", "Qty")) || 1,
      price: Number(valueFrom(item, "price", "Price", "unitPrice", "UnitPrice")) || 0,
    };
  });

export function extractInvoiceRecords(response, { includeAllStatuses = false } = {}) {
  if (!response?.success || response.data?.success === false) return null;

  const payload = response.data ?? response;
  const records = [
    payload,
    payload?.data,
    payload?.invoices,
    payload?.data?.invoices,
  ].find(Array.isArray);

  if (!records) return null;
  return includeAllStatuses ? records : records.filter(isSettledInvoiceRecord);
}

export function extractSettledOrderRecords(response) {
  if (!response?.success || response.data?.success === false) return null;

  const payload = response.data ?? response;
  const records = [
    payload?.orders,
    payload?.data?.orders,
    payload?.data,
    payload,
  ].find(Array.isArray);

  if (!records) return null;
  return records.filter(isSettledSaleRecord);
}

export function normalizeInvoiceRecord(invoice, order = null) {
  const invoiceId = valueFrom(invoice, "invoiceId", "InvoiceId", "id", "Id");
  const orderId = valueFrom(invoice, "orderId", "OrderId") ??
    valueFrom(order, "id", "Id", "orderId", "OrderId");
  const orderItems = valueFrom(order, "items", "Items");
  const invoiceItems = valueFrom(invoice, "items", "Items");
  const items = normalizeItems(
    invoiceItems?.length ? invoiceItems : orderItems,
  );
  const payments =
    valueFrom(invoice, "payments", "Payments") ??
    valueFrom(order, "payments", "Payments") ??
    [];
  const latestPayment = payments[payments.length - 1];

  const rawOrderTotal = valueFrom(order, "grandTotal", "GrandTotal", "totalAmount", "TotalAmount", "total", "Total");
  const rawInvoiceTotal = valueFrom(invoice, "totalAmount", "TotalAmount", "grandTotal", "GrandTotal", "total", "Total");
  const rawSubtotal = Number(
    valueFrom(invoice, "subtotal", "Subtotal") ??
      valueFrom(order, "subtotal", "Subtotal"),
  ) || 0;
  const discountAmount = Number(
    valueFrom(invoice, "discountAmount", "DiscountAmount") ??
      valueFrom(order, "discountAmount", "DiscountAmount"),
  ) || 0;

  // Compute item subtotal to prevent 0 totals when items exist
  const itemsSubtotal = items.reduce(
    (sum, item) => sum + (Number(item.price) || 0) * (Number(item.quantity) || 1),
    0,
  );
  const subtotal = rawSubtotal > 0 ? rawSubtotal : itemsSubtotal;
  const taxableAmount = Number(
    valueFrom(invoice, "taxableAmount", "TaxableAmount") ??
      Math.max(0, subtotal - discountAmount),
  ) || 0;
  const rawExplicitTax = valueFrom(invoice, "taxAmount", "TaxAmount") ?? valueFrom(order, "taxAmount", "TaxAmount");
  const rawCgst = Number(valueFrom(invoice, "cgstAmount", "CgstAmount") ?? valueFrom(order, "cgstAmount", "CgstAmount")) || 0;
  const rawSgst = Number(valueFrom(invoice, "sgstAmount", "SgstAmount") ?? valueFrom(order, "sgstAmount", "SgstAmount")) || 0;
  const taxAmount =
    rawExplicitTax !== undefined && rawExplicitTax !== null && Number.isFinite(Number(rawExplicitTax))
      ? Number(rawExplicitTax)
      : (rawCgst + rawSgst);

  const rawTotal = Number(rawInvoiceTotal ?? rawOrderTotal) || 0;
  const grandTotal = rawTotal > 0
    ? rawTotal
    : (subtotal > 0 ? (taxableAmount + taxAmount) : 0);

  const isSettledOrder = String(valueFrom(order, "status", "Status") || "").toLowerCase() === "settled";
  const rawBackendStatus = String(valueFrom(invoice, "status", "Status") || "").trim();
  const normalizedStatus = rawBackendStatus.toLowerCase();
  const isVoidOrCancelled =
    normalizedStatus === "void" ||
    normalizedStatus === "voided" ||
    normalizedStatus === "cancelled" ||
    normalizedStatus === "canceled" ||
    normalizedStatus === "refunded";

  const invoicePaidAmount = valueFrom(invoice, "paidAmount", "PaidAmount", "amountPaid", "AmountPaid");
  const rawPaidAmount = Number(
    invoicePaidAmount ??
      valueFrom(order, "paidAmount", "PaidAmount", "amountPaid", "AmountPaid") ??
      (isSettledOrder ? grandTotal : 0),
  ) || 0;
  const paidAmount = isSettledOrder && rawPaidAmount > grandTotal
    ? grandTotal
    : rawPaidAmount;

  const rawDueAmount = valueFrom(invoice, "dueAmount", "DueAmount");
  const dueAmount = isVoidOrCancelled
    ? 0
    : rawDueAmount !== undefined && rawDueAmount !== null
      ? Math.max(0, Number(rawDueAmount) || 0)
      : Math.max(0, grandTotal - paidAmount);

  // Invoice creation time is the source of truth for invoice date filters and
  // ordering. Settlement/order timestamps are only a fallback for older local
  // records that do not have a persisted invoice timestamp.
  const invoiceCreatedAt = valueFrom(
    invoice,
    "createdAt", "CreatedAt", "invoiceDate", "InvoiceDate", "issuedAt", "IssuedAt",
  );
  const createdAt = invoiceCreatedAt ??
    valueFrom(order, "settledAt", "SettledAt", "createdAt", "CreatedAt", "date", "Date");
  const paymentsNormalized = payments.map((payment) => ({
    ...payment,
    amount: Number(valueFrom(payment, "amount", "Amount")) || 0,
    paymentMode: valueFrom(payment, "paymentMode", "PaymentMode", "mode", "Mode") || "",
    paidAt: valueFrom(payment, "paidAt", "PaidAt"),
  }));
  const paymentMethod =
    valueFrom(latestPayment, "paymentMode", "PaymentMode", "mode", "Mode") ??
    valueFrom(invoice, "paymentMethod", "PaymentMethod") ??
    valueFrom(order, "paymentMethod", "PaymentMethod");
  const isVoidInvoice = isVoidOrCancelled;

  const rawInvoiceNumber =
    valueFrom(invoice, "invoiceNumber", "InvoiceNumber", "invoiceNo", "InvoiceNo") ??
    valueFrom(order, "invoiceNo", "InvoiceNo", "invoiceNumber", "InvoiceNumber");

  // Preserve exact backend invoice number; never fabricate one when absent.
  const invoiceNumber = rawInvoiceNumber ? String(rawInvoiceNumber).trim() : "";
  const isOfficialBackendInvoice = Boolean(invoiceId && invoiceNumber);
  const isLocalLegacyRecord = Boolean(order?.isLocalLegacyRecord && !invoiceId);

  const rawServiceChargeAmount = valueFrom(
    invoice,
    "serviceChargeAmount",
    "ServiceChargeAmount",
  ) ?? valueFrom(order, "serviceChargeAmount", "ServiceChargeAmount");

  return {
    ...order,
    ...invoice,
    id: orderId ?? invoiceId,
    invoiceId,
    orderId,
    orderNumber: valueFrom(invoice, "orderNumber", "OrderNumber") ?? valueFrom(order, "orderNumber", "OrderNumber"),
    branchId: valueFrom(invoice, "branchId", "BranchId") ?? valueFrom(order, "branchId", "BranchId"),
    branchName: valueFrom(invoice, "branchName", "BranchName") ?? valueFrom(order, "branchName", "BranchName"),
    customerName: valueFrom(invoice, "customerName", "CustomerName") ?? valueFrom(order, "customerName", "CustomerName"),
    customerPhone: valueFrom(invoice, "customerPhone", "CustomerPhone") ?? valueFrom(order, "customerPhone", "CustomerPhone"),
    invoiceCreatedAt: invoiceCreatedAt ?? createdAt,
    invoiceNo: invoiceNumber,
    invoiceNumber,
    isOfficialBackendInvoice,
    isLocalLegacyRecord,
    tableName:
      valueFrom(order, "tableName", "TableName") ??
      valueFrom(invoice, "tableName", "TableName") ??
      "",
    tableId: valueFrom(order, "tableId", "TableId"),
    server:
      valueFrom(order, "server", "serverName", "ServerName") ??
      valueFrom(invoice, "serverName", "ServerName") ??
      "",
    date: createdAt,
    createdAt,
    settledAt:
      valueFrom(order, "settledAt", "SettledAt") ??
      valueFrom(latestPayment, "paidAt", "PaidAt") ??
      createdAt,
    orderTime:
      valueFrom(order, "orderTime", "OrderTime") ??
      valueFrom(latestPayment, "paidAt", "PaidAt") ??
      createdAt,
    backendStatus: rawBackendStatus || (isVoidInvoice ? "VOID" : "PAID"),
    status: rawBackendStatus || (isVoidInvoice ? "Void" : "Settled"),
    isPaid: !isVoidInvoice && (normalizedStatus === "paid" || (grandTotal > 0 && paidAmount >= grandTotal)),
    subtotal,
    discountAmount,
    discountPercent:
      Number(valueFrom(order, "discountPercent", "DiscountPercent") ??
        valueFrom(invoice, "discountPercent", "DiscountPercent")) ||
      (subtotal > 0 ? (discountAmount / subtotal) * 100 : 0),
    taxableAmount,
    taxAmount,
    serviceCharge:
      Number(
        valueFrom(invoice, "serviceChargePercent", "ServiceChargePercent") ??
          valueFrom(order, "serviceChargePercent", "ServiceChargePercent") ??
          valueFrom(order, "serviceCharge", "ServiceCharge"),
      ) || 0,
    serviceChargePercent:
      Number(
        valueFrom(invoice, "serviceChargePercent", "ServiceChargePercent") ??
          valueFrom(order, "serviceChargePercent", "ServiceChargePercent"),
      ) || 0,
    serviceChargeAmount:
      rawServiceChargeAmount !== undefined && rawServiceChargeAmount !== null
        ? Number(rawServiceChargeAmount)
        : null,
    gstPercent:
      valueFrom(invoice, "gstPercent", "GstPercent") !== undefined
        ? Number(valueFrom(invoice, "gstPercent", "GstPercent"))
        : undefined,
    cgstAmount:
      valueFrom(invoice, "cgstAmount", "CgstAmount") !== undefined
        ? Number(valueFrom(invoice, "cgstAmount", "CgstAmount"))
        : undefined,
    sgstAmount:
      valueFrom(invoice, "sgstAmount", "SgstAmount") !== undefined
        ? Number(valueFrom(invoice, "sgstAmount", "SgstAmount"))
        : undefined,
    roundingAdjustment:
      valueFrom(invoice, "roundingAdjustment", "RoundingAdjustment") !== undefined
        ? Number(valueFrom(invoice, "roundingAdjustment", "RoundingAdjustment"))
        : undefined,
    paymentStatus:
      valueFrom(invoice, "paymentStatus", "PaymentStatus") ??
      valueFrom(order, "paymentStatus", "PaymentStatus"),
    tipAmount:
      Number(valueFrom(order, "tipAmount", "TipAmount")) || 0,
    grandTotal,
    totalAmount: grandTotal,
    paidAmount,
    dueAmount,
    paymentMethod,
    payments: isSettledOrder ? [] : paymentsNormalized,
    items,
  };
}

export function mergeLiveInvoiceRecords(invoices = [], orders = []) {
  const settledInvoices = (Array.isArray(invoices) ? invoices : []).filter(isSettledInvoiceRecord);
  const settledOrders = (Array.isArray(orders) ? orders : []).filter(isSettledSaleRecord);

  const ordersById = new Map(
    settledOrders
      .map((order) => [
        String(valueFrom(order, "id", "Id", "orderId", "OrderId") ?? ""),
        order,
      ])
      .filter(([id]) => id),
  );
  const includedOrderIds = new Set();
  const records = settledInvoices.map((invoice) => {
    const orderId = valueFrom(invoice, "orderId", "OrderId");
    if (orderId !== undefined) includedOrderIds.add(String(orderId));

    // Track orders referenced inside payments (e.g. TXN-ORD-36-...) so they aren't duplicated as orphan orders
    const paymentTxns = Array.isArray(invoice?.payments) ? invoice.payments : [];
    paymentTxns.forEach((p) => {
      const ref = String(p?.transactionReference || p?.txnReference || "");
      const match = ref.match(/ORD-(\d+)/i);
      if (match && match[1]) {
        includedOrderIds.add(String(match[1]));
      }
    });

    const matchingOrder = ordersById.get(String(orderId ?? ""));
    if (matchingOrder) {
      includedOrderIds.add(String(valueFrom(matchingOrder, "id", "Id", "orderId", "OrderId")));
    }
    return normalizeInvoiceRecord(invoice, matchingOrder);
  });

  settledOrders.forEach((order) => {
    const orderId = valueFrom(order, "id", "Id", "orderId", "OrderId");
    if (orderId !== undefined && !includedOrderIds.has(String(orderId))) {
      records.push(normalizeInvoiceRecord({}, order));
    }
  });

  return records;
}

let inFlightInvoiceApiRequest = null;
const requestInvoiceApiRecords = () => {
  if (!inFlightInvoiceApiRequest) {
    inFlightInvoiceApiRequest = apiGetInvoices()
      .catch((error) => ({ success: false, error: error?.message }))
      .finally(() => {
        inFlightInvoiceApiRequest = null;
      });
  }
  return inFlightInvoiceApiRequest;
};

async function loadInvoiceManagementRecords() {
  const response = await requestInvoiceApiRecords();
  const invoices = extractInvoiceRecords(response, { includeAllStatuses: true });
  if (!invoices) {
    return {
      records: [],
      error: `Invoice records could not be loaded (${response?.error || "server unavailable"}).`,
    };
  }

  const seenKeys = new Set();
  const deduped = invoices
    .map((invoice) => normalizeInvoiceRecord(invoice))
    .filter((rec) => {
      const key = rec.invoiceId != null
        ? `id:${String(rec.invoiceId)}`
        : rec.invoiceNumber
          ? `num:${rec.invoiceNumber}`
          : rec.orderId != null
            ? `ord:${String(rec.orderId)}`
            : null;
      if (!key) return true;
      if (seenKeys.has(key)) return false;
      seenKeys.add(key);
      return true;
    });

  const records = sortInvoicesByCreationTime(deduped);
  return { records, error: "" };
}

let inFlightInvoiceManagementRequest = null;

/** Fetch complete invoice API records for the management list and its client-side filters. */
export function requestInvoiceManagementRecords() {
  if (!inFlightInvoiceManagementRequest) {
    inFlightInvoiceManagementRequest = loadInvoiceManagementRecords().finally(() => {
      inFlightInvoiceManagementRequest = null;
    });
  }
  return inFlightInvoiceManagementRequest;
}

async function loadLiveInvoiceRecords() {
  const [invoiceResponse, orderResponse] = await Promise.all([
    requestInvoiceApiRecords(),
    apiGetOrderHistory().catch((err) => ({ success: false, error: err?.message })),
  ]);
  const invoices = extractInvoiceRecords(invoiceResponse);
  const orders = extractSettledOrderRecords(orderResponse);

  let localOrders = [];
  try {
    const raw = typeof localStorage !== "undefined" ? localStorage.getItem("gourmet_pos_past_orders_v2_inr") : null;
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        localOrders = parsed
          .filter(isSettledSaleRecord)
          .map((item) => ({ ...item, isLocalLegacyRecord: true, isOfficialBackendInvoice: false }));
      }
    }
  } catch {}

  const allOrders = [...(orders || []), ...localOrders];
  const liveRecords = mergeLiveInvoiceRecords(invoices || [], allOrders);
  const cleanRecords = sortOrdersBySettlementTime(dedupeOrders(liveRecords)).filter(
    (record) => !["void", "cancelled"].includes(String(record.status || record.Status || "").toLowerCase()),
  );

  // Ensure daily invoice counter matches today's settled orders count, and clean up obsolete global monotonic key
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.removeItem("avsr_highest_invoice_serial");
      const todayKey = getBusinessDayKey(new Date());
      const todayDateStr = getTodayDateString();
      const dateKeySafe = String(todayDateStr || "").trim().replace(/\s+/g, "_");
      const storageCounterKey = `avsr_daily_inv_cnt_${dateKeySafe}`;

      // Count settled orders strictly for today
      let todayCount = 0;
      let todayHighest = 0;
      cleanRecords.forEach((r) => {
        const orderKey = getBusinessDayKey(r.settledDate || r.date || r.settledAt || r.createdAt || r.orderTimestamp);
        if (orderKey === todayKey) {
          todayCount++;
          const invStr = r.invoiceNo || r.invoiceNumber || "";
          const m = String(invStr).match(/INV-(\d+)/i);
          if (m && m[1]) {
            const n = parseInt(m[1], 10);
            if (!isNaN(n) && n > todayHighest && n <= todayCount) {
              todayHighest = n;
            }
          }
        }
      });

      const effectiveToday = Math.max(todayCount, todayHighest);
      const currentSaved = parseInt(localStorage.getItem(storageCounterKey) || "0", 10);
      if (effectiveToday > 0 && (currentSaved < effectiveToday || currentSaved > effectiveToday + 5)) {
        localStorage.setItem(storageCounterKey, String(effectiveToday));
      }
    }
  } catch {}
  const error = invoices === null && orders === null && cleanRecords.length === 0
    ? `Invoice records could not be loaded (${invoiceResponse?.error || orderResponse?.error || "server unavailable"}).`
    : "";

  return {
    records: cleanRecords,
    error,
  };
}

let inFlightInvoiceRecordsRequest = null;

/** Share invoice and settled-order loading across dashboard and billing consumers. */
export function requestLiveInvoiceRecords() {
  if (!inFlightInvoiceRecordsRequest) {
    inFlightInvoiceRecordsRequest = loadLiveInvoiceRecords().finally(() => {
      inFlightInvoiceRecordsRequest = null;
    });
  }
  return inFlightInvoiceRecordsRequest;
}
