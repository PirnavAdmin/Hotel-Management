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

  return records || null;
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

  return records || null;
}

export function normalizeInvoiceRecord(invoice, order = null) {
  const invoiceId = valueFrom(invoice, "invoiceId", "InvoiceId", "id", "Id");
  const orderId = valueFrom(invoice, "orderId", "OrderId") ??
    valueFrom(order, "id", "Id", "orderId", "OrderId");
  const orderItems = valueFrom(order, "items", "Items");
  const invoiceItems = valueFrom(invoice, "items", "Items");
  const items = normalizeItems(
    orderItems?.length ? orderItems : invoiceItems,
  );
  const payments = valueFrom(invoice, "payments", "Payments") || [];
  const latestPayment = payments[payments.length - 1];
  const orderTotal = valueFrom(order, "grandTotal", "GrandTotal", "totalAmount", "TotalAmount");
  const grandTotal = Number(
    orderTotal ??
      valueFrom(invoice, "totalAmount", "TotalAmount", "grandTotal", "GrandTotal"),
  ) || 0;
  const isSettledOrder = String(valueFrom(order, "status", "Status") || "").toLowerCase() === "settled";
  const invoicePaidAmount = valueFrom(invoice, "paidAmount", "PaidAmount", "amountPaid", "AmountPaid");
  const paidAmount = Number(
    (isSettledOrder && orderTotal !== undefined ? orderTotal : invoicePaidAmount) ??
      valueFrom(order, "paidAmount", "PaidAmount") ??
      grandTotal,
  ) || 0;
  const subtotal = Number(
    valueFrom(order, "subtotal", "Subtotal") ??
      valueFrom(invoice, "subtotal", "Subtotal"),
  ) || 0;
  const discountAmount = Number(
    valueFrom(order, "discountAmount", "DiscountAmount") ??
      valueFrom(invoice, "discountAmount", "DiscountAmount"),
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
    valueFrom(order, "paymentMethod", "PaymentMethod");
  const invoiceNumber =
    valueFrom(invoice, "invoiceNumber", "InvoiceNumber", "invoiceNo", "InvoiceNo") ??
    valueFrom(order, "invoiceNo", "InvoiceNo") ??
    (orderId ? `Order #${orderId}` : `Invoice #${invoiceId}`);
  const status =
    (isSettledOrder ? valueFrom(order, "status", "Status") : undefined) ??
    valueFrom(invoice, "status", "Status") ??
    valueFrom(order, "status", "Status") ??
    (paidAmount >= grandTotal ? "PAID" : "UNPAID");

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
    status,
    isPaid: paidAmount >= grandTotal && grandTotal > 0,
    subtotal,
    discountAmount,
    discountPercent:
      Number(valueFrom(order, "discountPercent", "DiscountPercent") ??
        valueFrom(invoice, "discountPercent", "DiscountPercent")) ||
      (subtotal > 0 ? (discountAmount / subtotal) * 100 : 0),
    taxableAmount: Number(
      valueFrom(invoice, "taxableAmount", "TaxableAmount") ??
        Math.max(0, subtotal - discountAmount),
    ) || 0,
    taxAmount: Number(
      valueFrom(order, "taxAmount", "TaxAmount") ??
        valueFrom(invoice, "taxAmount", "TaxAmount"),
    ) || 0,
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
  const ordersById = new Map(
    orders
      .map((order) => [
        String(valueFrom(order, "id", "Id", "orderId", "OrderId") ?? ""),
        order,
      ])
      .filter(([id]) => id),
  );
  const includedOrderIds = new Set();
  const records = invoices.map((invoice) => {
    const orderId = valueFrom(invoice, "orderId", "OrderId");
    if (orderId !== undefined) includedOrderIds.add(String(orderId));
    return normalizeInvoiceRecord(invoice, ordersById.get(String(orderId ?? "")));
  });

  orders.forEach((order) => {
    const orderId = valueFrom(order, "id", "Id", "orderId", "OrderId");
    if (orderId !== undefined && !includedOrderIds.has(String(orderId))) {
      records.push(normalizeInvoiceRecord({}, order));
    }
  });

  return records;
}
