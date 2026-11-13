const normalize = (value) => String(value ?? "").trim().toLocaleLowerCase();

const EXCLUDED_SALE_STATUSES = new Set([
  "active", "dining", "vacant", "pending", "unpaid", "open", "processing",
  "cancelled", "canceled", "void", "voided", "deleted", "refunded",
]);
const SETTLED_SALE_STATUSES = new Set(["settled", "paid"]);

export const isSettledSaleRecord = (record) => {
  if (!record || typeof record !== "object") return false;
  const status = normalize(record.status ?? record.Status ?? record.invoiceStatus ?? record.InvoiceStatus);
  if (EXCLUDED_SALE_STATUSES.has(status)) return false;
  if (SETTLED_SALE_STATUSES.has(status)) return true;
  return record.isPaid === true || record.IsPaid === true ||
    record.isSettled === true || record.IsSettled === true;
};

export const isSettledInvoiceRecord = (invoice) => {
  if (!invoice || typeof invoice !== "object") return false;
  const status = normalize(invoice.status ?? invoice.Status ?? invoice.invoiceStatus ?? invoice.InvoiceStatus);
  const paymentStatus = normalize(invoice.paymentStatus ?? invoice.PaymentStatus);
  if (EXCLUDED_SALE_STATUSES.has(status) || EXCLUDED_SALE_STATUSES.has(paymentStatus)) return false;
  if (SETTLED_SALE_STATUSES.has(status) || SETTLED_SALE_STATUSES.has(paymentStatus)) return true;
  const total = Number(invoice.totalAmount ?? invoice.TotalAmount ?? invoice.grandTotal ?? invoice.GrandTotal ?? 0);
  const paid = Number(invoice.paidAmount ?? invoice.PaidAmount ?? invoice.amountPaid ?? invoice.AmountPaid ?? 0);
  return total > 0 && paid >= total;
};

export function parseOrderToYMD(order) {
  if (!order) return "";
  const months = {
    jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
    jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12",
  };

  const dateValue =
    order.settledDate ||
    order.date ||
    order.settledAt ||
    order.createdAt ||
    order.orderTimestamp ||
    order.timestamp;
  if (dateValue) {
    const s = String(dateValue).trim();
    const isoMatch = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (isoMatch) {
      return `${isoMatch[1]}-${isoMatch[2].padStart(2, "0")}-${isoMatch[3].padStart(2, "0")}`;
    }
    const dmyMatch = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
    if (dmyMatch) {
      return `${dmyMatch[3]}-${dmyMatch[2].padStart(2, "0")}-${dmyMatch[1].padStart(2, "0")}`;
    }
    const textMatch = s.match(/^(\d{1,2})[\s\-]+([a-zA-Z]{3,})[\s\-]+(\d{4})/);
    if (textMatch) {
      const mon = textMatch[2].slice(0, 3).toLowerCase();
      if (months[mon]) {
        return `${textMatch[3]}-${months[mon]}-${textMatch[1].padStart(2, "0")}`;
      }
    }
    const d = new Date(s);
    if (!isNaN(d.getTime())) {
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    }
  }

  const ts =
    order.orderTimestamp ||
    order.timestamp ||
    order.settledAt ||
    order.createdAt;
  if (ts) {
    const d = new Date(ts);
    if (!isNaN(d.getTime())) {
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    }
  }
  return "";
}

const dateKey = (order) => parseOrderToYMD(order);

const timeKey = (order) => {
  const value = order?.settledAt || order?.paidAt || order?.completedAt;
  if (value == null) return "";
  const clock = String(value).trim().match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?$/i);
  if (clock) {
    let hours = Number(clock[1]);
    if (clock[4]) {
      hours %= 12;
      if (clock[4].toUpperCase() === "PM") hours += 12;
    }
    return `${String(hours).padStart(2, "0")}:${clock[2]}:${clock[3] || "00"}`;
  }
  const timestamp = Date.parse(value);
  if (Number.isFinite(timestamp)) return String(Math.floor(timestamp / 60_000));
  return normalize(value).replace(/\s+/g, " ");
};

const amountKey = (order) =>
  Number(order?.grandTotal ?? order?.total ?? order?.amount ?? 0).toFixed(2);

const itemsKey = (order) =>
  (Array.isArray(order?.items) ? order.items : [])
    .map((item) =>
      [
        normalize(item?.name || item?.dishName || item?.id || item?.menuItemId),
        Number(item?.quantity ?? item?.qty ?? 0),
        Number(item?.price ?? item?.unitPrice ?? 0).toFixed(2),
      ].join(":"),
    )
    .sort()
    .join("|");

const getBillingSessionId = (order) => {
  const explicitId = order?.billingSessionId ?? order?.BillingSessionId ??
    order?.backendOrderId ?? order?.BackendOrderId ?? order?.orderId ?? order?.OrderId;
  if (explicitId !== undefined && explicitId !== null && String(explicitId).trim()) {
    return normalize(explicitId);
  }
  // API history rows use the backend order primary key as their id. Local POS
  // invoices use generated `ord_…` ids and receive their backend key on settle.
  const id = order?.id ?? order?.Id;
  return id !== undefined && id !== null && /^\d+$/.test(String(id).trim())
    ? normalize(id)
    : "";
};

const saleFingerprint = (order) => {
  const time = timeKey(order);
  const items = itemsKey(order);
  if (!time || !items) return "";
  return [
    normalize(order?.tableId ?? order?.tableName).replace(/^table\s*/, ""),
    dateKey(order),
    time,
    amountKey(order),
    items,
  ].join("::");
};

export function formatInvoiceNumber(orderOrId) {
  if (!orderOrId) return "INV-001";
  let val = "";
  let rawId = null;
  if (typeof orderOrId === "object") {
    val = orderOrId.invoiceNumber || orderOrId.invoiceNo || orderOrId.InvoiceNumber || orderOrId.InvoiceNo || "";
    rawId = orderOrId.orderId ?? orderOrId.OrderId ?? orderOrId.id ?? orderOrId.Id;
  } else {
    val = String(orderOrId);
  }
  val = String(val || "").trim();

  // If already clean INV-001 or INV-118
  const cleanMatch = val.match(/^INV-(\d{1,6})$/i);
  if (cleanMatch) {
    return `INV-${String(parseInt(cleanMatch[1], 10)).padStart(3, "0")}`;
  }

  // If rawId is a clean sequential number (e.g. 118, 117, 116, 87, 34)
  const cleanId = parseInt(String(rawId).replace(/\D/g, ""), 10);
  if (!isNaN(cleanId) && cleanId > 0 && cleanId < 100000) {
    return `INV-${String(cleanId).padStart(3, "0")}`;
  }

  // Trailing digits in invoice string (e.g. INV-20261111-116 -> INV-116)
  const trailingMatch = val.match(/[-_](\d{1,6})$/);
  if (trailingMatch) {
    const num = parseInt(trailingMatch[1], 10);
    if (!isNaN(num) && num > 0) return `INV-${String(num).padStart(3, "0")}`;
  }

  return val ? (val.startsWith("INV-") ? val : `INV-${val}`) : "INV-001";
}

export const getOrderTimestamp = (order) => {
  if (!order || typeof order !== "object") return 0;
  if (typeof order.orderTimestamp === "number" && order.orderTimestamp > 0) {
    return order.orderTimestamp < 1e11 ? order.orderTimestamp * 1000 : order.orderTimestamp;
  }
  const candidates = [
    order.settledAt,
    order.paidAt,
    order.completedAt,
    order.createdAt,
    order.date,
    order.settledDate,
    order.timestamp,
  ];
  for (const c of candidates) {
    if (typeof c === "string" && /^\d{4}-\d{2}-\d{2}/.test(c)) {
      const ms = Date.parse(c);
      if (!Number.isNaN(ms) && ms > 0) return ms;
    }
  }
  const dateStr = order.date || order.settledDate;
  const timeStr = order.settledAt || order.orderTime || order.time;
  if (dateStr && timeStr) {
    const ms = Date.parse(`${dateStr} ${timeStr}`);
    if (!Number.isNaN(ms) && ms > 0) return ms;
  }
  for (const c of candidates) {
    if (c) {
      const ms = Date.parse(c);
      if (!Number.isNaN(ms) && ms > 0) return ms;
    }
  }
  return 0;
};

const getCalendarDateTimestamp = (order) => {
  const value = order?.settledDate || order?.date;
  if (value) {
    const text = String(value).trim();
    const localized = text.match(/^(\d{1,2})\s+([a-z]{3,})\s+(\d{4})$/i);
    const parsed = localized
      ? new Date(`${localized[2]} ${localized[1]}, ${localized[3]}`)
      : new Date(text);
    if (!Number.isNaN(parsed.getTime())) {
      return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate()).getTime();
    }
  }
  const timestamp = getOrderTimestamp(order);
  if (timestamp) {
    const date = new Date(timestamp);
    return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  }
  return 0;
};

const getSettlementTime = (order) => {
  const value = String(order?.settledAt || order?.paidAt || order?.completedAt || '').trim();
  const match = value.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)$/i);
  if (match) {
    let hours = Number(match[1]) % 12;
    if (match[4].toUpperCase() === 'PM') hours += 12;
    return hours * 3600 + Number(match[2]) * 60 + Number(match[3] || 0);
  }
  const timestamp = getOrderTimestamp(order);
  if (!timestamp) return 0;
  const date = new Date(timestamp);
  return date.getHours() * 3600 + date.getMinutes() * 60 + date.getSeconds();
};

export const sortOrdersBySettlementTime = (orders = []) =>
  [...orders].sort((a, b) => {
    const timeDiff = getOrderTimestamp(b) - getOrderTimestamp(a);
    if (timeDiff !== 0) return timeDiff;
    const idA = parseInt(String(a?.id || a?.invoiceNo || "").replace(/\D/g, ""), 10) || 0;
    const idB = parseInt(String(b?.id || b?.invoiceNo || "").replace(/\D/g, ""), 10) || 0;
    return idB - idA;
  });

export const mergeSettledOrders = (...sources) => {
  const settledOnly = sources.flatMap((orders) =>
    (Array.isArray(orders) ? orders : []).filter((order) => {
      if (!order || typeof order !== "object") return false;
      const status = String(order.status || order.Status || "").toLowerCase();
      return status !== "active" && status !== "dining" && status !== "vacant";
    }),
  );
  const merged = sortOrdersBySettlementTime(dedupeOrders(settledOnly));
  const current = sources[0];
  if (
    Array.isArray(current) &&
    current.length === merged.length &&
    current.every((order, index) => JSON.stringify(order) === JSON.stringify(merged[index]))
  ) {
    return current;
  }
  return merged;
};

export function normalizePaymentMethod(orderOrMethod) {
  if (!orderOrMethod) return "cash";

  let method = "";
  if (typeof orderOrMethod === "string") {
    method = orderOrMethod;
  } else if (typeof orderOrMethod === "object") {
    method =
      orderOrMethod.paymentMethod ??
      orderOrMethod.PaymentMethod ??
      orderOrMethod.paymentMode ??
      orderOrMethod.payment_mode ??
      orderOrMethod.paymentType ??
      orderOrMethod.payment ??
      "";
  }

  const s = String(method || "").trim().toLowerCase();
  if (!s) return "cash";

  if (
    s === "upi" ||
    s.includes("upi") ||
    s.includes("qr") ||
    s.includes("online") ||
    s.includes("gpay") ||
    s.includes("googlepay") ||
    s.includes("phonepe") ||
    s.includes("paytm") ||
    s.includes("bhim") ||
    s.includes("wallet") ||
    s.includes("netbanking") ||
    s.includes("bank")
  ) {
    return "upi";
  }

  if (
    s === "card" ||
    s.includes("card") ||
    s.includes("credit") ||
    s.includes("debit") ||
    s.includes("pos") ||
    s.includes("swipe") ||
    s.includes("visa") ||
    s.includes("mastercard")
  ) {
    return "card";
  }

  if (s === "cash" || s.includes("cash")) {
    return "cash";
  }

  return "cash";
}

/** Collapse copies of one settled sale even when a sync assigned each copy a different id/invoice number. */
export function dedupeOrders(orders = []) {
  const result = [];
  const indexByIdentity = new Map();

  const validOrders = (Array.isArray(orders) ? orders : []).filter(isSettledSaleRecord);

  for (const rawOrder of validOrders) {
    if (!rawOrder || typeof rawOrder !== "object") continue;

    const items = Array.isArray(rawOrder.items) ? rawOrder.items : [];
    const itemsTotal = items.reduce(
      (sum, it) => sum + (Number(it.price || it.unitPrice || 0) * Number(it.quantity || it.qty || 1)),
      0,
    );
    const orderSubtotal = Number(rawOrder.subtotal) > 0 ? Number(rawOrder.subtotal) : itemsTotal;
    const discountAmount = Number(rawOrder.discountAmount || 0);
    const taxableAmount = Math.max(0, orderSubtotal - discountAmount);
    const taxAmount = Number(rawOrder.taxAmount) || Math.round(taxableAmount * 0.05);
    const orderGrandTotal = Number(rawOrder.grandTotal ?? rawOrder.total ?? rawOrder.totalAmount) > 0
      ? Number(rawOrder.grandTotal ?? rawOrder.total ?? rawOrder.totalAmount)
      : (orderSubtotal > 0 ? (taxableAmount + taxAmount) : 0);

    const invNumber = formatInvoiceNumber(rawOrder);
    const order = {
      ...rawOrder,
      invoiceNo: invNumber,
      invoiceNumber: invNumber,
      subtotal: orderSubtotal,
      grandTotal: orderGrandTotal,
      total: orderGrandTotal,
      totalAmount: orderGrandTotal,
      paidAmount: Math.min(
        Number(rawOrder.paidAmount ?? rawOrder.amountPaid ?? rawOrder.AmountPaid ?? orderGrandTotal) || 0,
        orderGrandTotal,
      ),
      status: "Settled",
      Status: "Settled",
    };
    const fingerprint = saleFingerprint(order);
    const invoice = normalize(order.invoiceNo ?? order.InvoiceNo);
    const date = dateKey(order);
    const sessionId = getBillingSessionId(order);
    const identities = [
      sessionId ? `session:${sessionId}` : "",
      !sessionId && invoice && date && itemsKey(order)
        ? `invoice:${normalize(order.tableId ?? order.tableName)}:${invoice}:${date}:${amountKey(order)}:${itemsKey(order)}`
        : "",
      !sessionId && fingerprint ? `sale:${fingerprint}` : "",
      (order.id ?? order.Id) ? `id:${normalize(order.id ?? order.Id)}` : "",
    ].filter(Boolean);
    const existingIndex = identities
      .map((identity) => indexByIdentity.get(identity))
      .find((index) => index !== undefined);

    if (existingIndex === undefined) {
      identities.forEach((identity) => indexByIdentity.set(identity, result.length));
      result.push(order);
      continue;
    }

    // Keep the more complete/newer copy, while retaining metadata from both sources.
    const existing = result[existingIndex];
    const incomingIsNewer = getOrderTimestamp(order) > getOrderTimestamp(existing);
    const base = incomingIsNewer
      ? { ...existing, ...order }
      : { ...order, ...existing };

    // Crucial: preserve valid non-null properties so empty backend fields never wipe out live POS values
    const fieldsToPreserve = [
      "paymentMethod", "paymentMode", "PaymentMethod", "payment_mode",
      "invoiceNo", "InvoiceNo",
      "billingSessionId", "backendOrderId", "orderId",
      "BillingSessionId", "BackendOrderId", "OrderId",
      "settledAt", "SettledAt",
      "date", "settledDate",
      "tableName", "TableName",
      "server", "serverName", "ServerName",
    ];
    fieldsToPreserve.forEach((f) => {
      const val = order[f] || existing[f];
      if (val !== undefined && val !== null && val !== "") {
        if (base[f] === undefined || base[f] === null || base[f] === "") {
          base[f] = val;
        }
      }
    });

    const finalInvNumber = formatInvoiceNumber(base);
    base.invoiceNo = finalInvNumber;
    base.invoiceNumber = finalInvNumber;
    result[existingIndex] = base;
    identities.forEach((identity) => indexByIdentity.set(identity, existingIndex));
  }

  return sortOrdersBySettlementTime(result);
}
