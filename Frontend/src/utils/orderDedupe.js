const normalize = (value) => String(value ?? "").trim().toLocaleLowerCase();

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

export const getOrderTimestamp = (order) => {
  const timestamp = Number(order?.orderTimestamp ?? order?.createdAt ?? 0);
  if (Number.isFinite(timestamp) && timestamp > 0) return timestamp;

  const value = order?.settledDate || order?.date;
  if (value) {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed.getTime();
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
    const dateDifference = getCalendarDateTimestamp(b) - getCalendarDateTimestamp(a);
    if (dateDifference) return dateDifference;
    return getSettlementTime(b) - getSettlementTime(a);
  });

export const mergeSettledOrders = (...sources) => {
  const merged = sortOrdersBySettlementTime(
    dedupeOrders(sources.flatMap((orders) => (Array.isArray(orders) ? orders : []))),
  );
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

  for (const order of Array.isArray(orders) ? orders : []) {
    if (!order || typeof order !== "object") continue;
    const fingerprint = saleFingerprint(order);
    const invoice = normalize(order.invoiceNo);
    const date = dateKey(order);
    const identities = [
      invoice && date && itemsKey(order)
        ? `invoice:${invoice}:${date}:${amountKey(order)}:${itemsKey(order)}`
        : "",
      fingerprint ? `sale:${fingerprint}` : "",
      order.id ? `id:${normalize(order.id)}` : "",
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

    result[existingIndex] = base;
    identities.forEach((identity) => indexByIdentity.set(identity, existingIndex));
  }

  return result.sort((a, b) => getOrderTimestamp(b) - getOrderTimestamp(a));
}
