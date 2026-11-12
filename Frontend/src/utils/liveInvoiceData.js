import { apiGetInvoices } from "../api/invoiceApi";
import { apiGetOrderHistory } from "../api/orderApi";
import {
  dedupeOrders,
  isSettledInvoiceRecord,
  isSettledSaleRecord,
  sortOrdersBySettlementTime,
} from "./orderDedupe";
const valueFrom = (object, ...keys) => {
  for (const key of keys) {
    const value = object?.[key];
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return undefined;
};

const normalizeItems = (items) =>
  (Array.isArray(items) ? items : []).map((item) => ({
    ...item,
    name: valueFrom(item, "name", "Name", "dishName", "DishName") || "",
    quantity: Number(valueFrom(item, "quantity", "Quantity", "qty", "Qty")) || 1,
    price: Number(valueFrom(item, "price", "Price", "unitPrice", "UnitPrice")) || 0,
  }));

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

  const createdAt = valueFrom(order, "settledAt", "SettledAt", "createdAt", "CreatedAt") ??
    valueFrom(invoice, "createdAt", "CreatedAt");
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

  let invoiceNumber =
    valueFrom(invoice, "invoiceNumber", "InvoiceNumber", "invoiceNo", "InvoiceNo") ??
    valueFrom(order, "invoiceNo", "InvoiceNo");

  // Clean raw timestamp invoice numbers (e.g. INV-1793258326562 or Order #1793...)
  if (!invoiceNumber || /^INV-\d{10,}$/i.test(String(invoiceNumber)) || /^Order\s*#\d{10,}$/i.test(String(invoiceNumber))) {
    const rawId = valueFrom(order, "id", "orderId") ?? valueFrom(invoice, "id");
    const num = parseInt(String(rawId).replace(/\D/g, ""), 10);
    if (!isNaN(num) && num > 0 && num < 1000) {
      invoiceNumber = `INV-${String(num).padStart(3, "0")}`;
    } else {
      invoiceNumber = rawId == null ? "" : `Order #${rawId}`;
    }
  }

  return {
    ...order,
    ...invoice,
    id: orderId ?? invoiceId,
    invoiceId,
    orderId,
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


async function loadLiveInvoiceRecords() {
  const [invoiceResponse, orderResponse] = await Promise.all([
    apiGetInvoices().catch((err) => ({ success: false, error: err?.message })),
    apiGetOrderHistory().catch((err) => ({ success: false, error: err?.message })),
  ]);
  const invoices = extractInvoiceRecords(invoiceResponse);
  const orders = extractSettledOrderRecords(orderResponse);

  const liveRecords = mergeLiveInvoiceRecords(invoices || [], orders || []);
  const cleanRecords = sortOrdersBySettlementTime(dedupeOrders(liveRecords)).filter(
    (record) => !["void", "cancelled"].includes(String(record.status || record.Status || "").toLowerCase()),
  );
  const error = invoices === null && orders === null
    ? `Invoice records could not be loaded (${invoiceResponse?.error || orderResponse?.error || "server unavailable"}).`
    : invoices === null
    ? `Invoice records could not be loaded (${invoiceResponse?.error || "invoice service unavailable"}); showing settled POS orders.`
    : orders === null
    ? `POS order history could not be loaded (${orderResponse?.error || "order history service unavailable"}); invoice details may be incomplete.`
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
