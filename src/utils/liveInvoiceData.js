import { apiGetInvoices } from "../api/invoiceApi";
import { apiGetOrderHistory } from "../api/orderApi";
import { dedupeOrders, sortOrdersBySettlementTime } from "./orderDedupe";
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
    name: valueFrom(item, "name", "Name", "dishName", "DishName") || "Item",
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
  return records.filter((r) => {
    if (!r || typeof r !== "object") return false;
    const status = String(r.status || r.Status || "").toLowerCase();
    return status !== "active" && status !== "dining" && status !== "vacant";
  });
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
  return records.filter((r) => {
    if (!r || typeof r !== "object") return false;
    const status = String(r.status || r.Status || "").toLowerCase();
    return status !== "active" && status !== "dining" && status !== "vacant";
  });
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
  const payments = valueFrom(invoice, "payments", "Payments") || [];
  const latestPayment = payments[payments.length - 1];

  const rawOrderTotal = valueFrom(order, "grandTotal", "GrandTotal", "totalAmount", "TotalAmount");
  const rawInvoiceTotal = valueFrom(invoice, "totalAmount", "TotalAmount", "grandTotal", "GrandTotal");
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
      valueFrom(order, "taxAmount", "TaxAmount") ??
      Math.round(taxableAmount * 0.05),
  ) || 0;

  const rawTotal = Number(rawInvoiceTotal ?? rawOrderTotal) || 0;
  const grandTotal = rawTotal > 0
    ? rawTotal
    : (subtotal > 0 ? (taxableAmount + taxAmount) : 0);

  const isSettledOrder = String(valueFrom(order, "status", "Status") || "").toLowerCase() === "settled";
  const invoicePaidAmount = valueFrom(invoice, "paidAmount", "PaidAmount", "amountPaid", "AmountPaid");
  const paidAmount = Number(
    invoicePaidAmount ??
      valueFrom(order, "paidAmount", "PaidAmount") ??
      grandTotal,
  ) || 0;

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
    valueFrom(order, "paymentMethod", "PaymentMethod") ??
    "Cash";

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
      invoiceNumber = "INV-001";
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
      "Takeaway / Direct",
    tableId: valueFrom(order, "tableId", "TableId"),
    server:
      valueFrom(order, "server", "serverName", "ServerName") ??
      valueFrom(invoice, "serverName", "ServerName") ??
      "Staff",
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
    status: "Settled",
    isPaid: true,
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
  const settledInvoices = (Array.isArray(invoices) ? invoices : []).filter((inv) => {
    if (!inv || typeof inv !== "object") return false;
    const s = String(inv.status || inv.Status || "").toLowerCase();
    return s !== "active" && s !== "dining" && s !== "vacant";
  });
  const settledOrders = (Array.isArray(orders) ? orders : []).filter((ord) => {
    if (!ord || typeof ord !== "object") return false;
    const s = String(ord.status || ord.Status || "").toLowerCase();
    return s !== "active" && s !== "dining" && s !== "vacant";
  });

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
    return normalizeInvoiceRecord(invoice, ordersById.get(String(orderId ?? "")));
  });

  settledOrders.forEach((order) => {
    const orderId = valueFrom(order, "id", "Id", "orderId", "OrderId");
    if (orderId !== undefined && !includedOrderIds.has(String(orderId))) {
      records.push(normalizeInvoiceRecord({}, order));
    }
  });

  return records;
}


export async function requestLiveInvoiceRecords() {
  const [invoiceResponse, orderResponse] = await Promise.all([
    apiGetInvoices().catch((err) => ({ success: false, error: err?.message })),
    apiGetOrderHistory().catch((err) => ({ success: false, error: err?.message })),
  ]);
  const invoices = extractInvoiceRecords(invoiceResponse);
  const orders = extractSettledOrderRecords(orderResponse);

  let fallbackOrders = [];
  try {
    const raw = typeof localStorage !== "undefined" ? localStorage.getItem("gourmet_pos_past_orders_v2_inr") : null;
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        fallbackOrders = parsed;
      }
    }
  } catch {}

  const merged = mergeLiveInvoiceRecords(
    invoices || [],
    orders !== null
      ? orders
      : (invoices === null ? fallbackOrders : []),
  );

  const cleanRecords = sortOrdersBySettlementTime(dedupeOrders(merged));

  return {
    records: cleanRecords,
    error: (invoices === null && orders === null && cleanRecords.length === 0)
      ? `Invoice records could not be loaded (${invoiceResponse?.error || orderResponse?.error || "server unavailable"}).`
      : "",
  };
}
