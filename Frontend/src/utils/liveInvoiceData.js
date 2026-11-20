import { apiGetInvoices } from "../api/invoiceApi";
import { apiGetOrderHistory } from "../api/orderApi";
import {
  dedupeOrders,
  formatInvoiceNumber,
  isSettledInvoiceRecord,
  isSettledSaleRecord,
  sortInvoicesByCreationTime,
  sortOrdersBySettlementTime,
} from "./orderDedupe";
import { sanitizeDishName } from "./sanitizeDishName";
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

export function extractInvoiceRecords(response) {
  if (!response?.success || response.data?.success === false) return null;

  const payload = response.data ?? response;
  const records = [
    payload,
    payload?.data,
    payload?.invoices,
    payload?.data?.invoices,
  ].find(Array.isArray);

  if (!records) return null;
  return records.filter(isSettledInvoiceRecord);
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
  const taxAmount = Number(
    valueFrom(invoice, "taxAmount", "TaxAmount") ??
      valueFrom(order, "taxAmount", "TaxAmount"),
  ) || 0;

  const rawTotal = Number(rawInvoiceTotal ?? rawOrderTotal) || 0;
  const grandTotal = rawTotal > 0
    ? rawTotal
    : (subtotal > 0 ? (taxableAmount + taxAmount) : 0);

  const isSettledOrder = String(valueFrom(order, "status", "Status") || "").toLowerCase() === "settled";
  const invoicePaidAmount = valueFrom(invoice, "paidAmount", "PaidAmount", "amountPaid", "AmountPaid");
  const rawPaidAmount = Number(
    invoicePaidAmount ??
      valueFrom(order, "paidAmount", "PaidAmount", "amountPaid", "AmountPaid") ??
      grandTotal,
  ) || 0;
  const paidAmount = isSettledOrder && rawPaidAmount > grandTotal
    ? grandTotal
    : rawPaidAmount;

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
  const normalizedStatus = String(valueFrom(invoice, "status", "Status") || "").toLowerCase();
  const isVoidInvoice = normalizedStatus === "void" || normalizedStatus === "cancelled";

  const rawInvoiceNumber =
    valueFrom(invoice, "invoiceNumber", "InvoiceNumber", "invoiceNo", "InvoiceNo") ??
    valueFrom(order, "invoiceNo", "InvoiceNo");

  const invoiceNumber = rawInvoiceNumber
    ? String(rawInvoiceNumber).trim()
    : formatInvoiceNumber({
        ...order,
        ...invoice,
        id: orderId ?? invoiceId,
        invoiceNo: rawInvoiceNumber,
        invoiceNumber: rawInvoiceNumber,
      });

  return {
    ...order,
    ...invoice,
    id: orderId ?? invoiceId,
    invoiceId,
    orderId,
    invoiceCreatedAt: invoiceCreatedAt ?? createdAt,
    invoiceNo: invoiceNumber,
    invoiceNumber,
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
    status: isVoidInvoice ? "Void" : "Settled",
    isPaid: !isVoidInvoice,
    subtotal,
    discountAmount,
    discountPercent:
      Number(valueFrom(order, "discountPercent", "DiscountPercent") ??
        valueFrom(invoice, "discountPercent", "DiscountPercent")) ||
      (subtotal > 0 ? (discountAmount / subtotal) * 100 : 0),
    taxableAmount,
    taxAmount,
    serviceCharge:
      Number(valueFrom(order, "serviceChargePercent", "ServiceChargePercent")) || 0,
    serviceChargeAmount:
      Number(valueFrom(order, "serviceChargeAmount", "ServiceChargeAmount")) || 0,
    tipAmount:
      Number(valueFrom(order, "tipAmount", "TipAmount")) || 0,
    grandTotal,
    totalAmount: grandTotal,
    paidAmount,
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
  const invoices = extractInvoiceRecords(response);
  if (!invoices) {
    return {
      records: [],
      error: `Invoice records could not be loaded (${response?.error || "server unavailable"}).`,
    };
  }

  const records = sortInvoicesByCreationTime(
    invoices.map((invoice) => normalizeInvoiceRecord(invoice)),
  );
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
      if (Array.isArray(parsed)) localOrders = parsed.filter(isSettledSaleRecord);
    }
  } catch {}

  const allOrders = [...(orders || []), ...localOrders];
  const liveRecords = mergeLiveInvoiceRecords(invoices || [], allOrders);
  const cleanRecords = sortOrdersBySettlementTime(dedupeOrders(liveRecords)).filter(
    (record) => !["void", "cancelled"].includes(String(record.status || record.Status || "").toLowerCase()),
  );

  // Keep global invoice counter monotonically increasing beyond all historical invoices
  try {
    let maxNum = 0;
    cleanRecords.forEach((r) => {
      const invStr = r.invoiceNo || r.invoiceNumber || "";
      const m = String(invStr).match(/INV-(\d+)/i);
      if (m && m[1]) {
        const n = parseInt(m[1], 10);
        if (!isNaN(n) && n > maxNum && n < 100000) maxNum = n;
      }
      const oid = parseInt(String(r.id ?? r.orderId ?? "").replace(/\D/g, ""), 10);
      if (!isNaN(oid) && oid > maxNum && oid < 100000) maxNum = oid;
    });
    if (maxNum > 0 && typeof localStorage !== "undefined") {
      const current = parseInt(localStorage.getItem("avsr_highest_invoice_serial") || "0", 10);
      if (maxNum > current) {
        localStorage.setItem("avsr_highest_invoice_serial", String(maxNum));
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
