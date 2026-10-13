const normalize = (value) => String(value ?? "").trim().toLocaleLowerCase();

const dateKey = (order) => {
  const rawDate = order?.settledDate || order?.date || order?.createdAt;
  const parsedDate = rawDate ? new Date(rawDate) : null;
  const timestampDate = Number(order?.orderTimestamp);
  const date = parsedDate && !Number.isNaN(parsedDate.getTime())
    ? parsedDate
    : Number.isFinite(timestampDate) && timestampDate > 0
      ? new Date(timestampDate)
      : null;
  if (!date || Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

const timeKey = (order) => {
  const value = order?.settledAt || order?.paidAt || order?.completedAt;
  if (value == null) return "";
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
    normalize(order?.paymentMethod),
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
      invoice && date ? `invoice:${invoice}:${date}` : "",
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
    result[existingIndex] = incomingIsNewer
      ? { ...existing, ...order }
      : { ...order, ...existing };
    identities.forEach((identity) => indexByIdentity.set(identity, existingIndex));
  }

  return result.sort((a, b) => getOrderTimestamp(b) - getOrderTimestamp(a));
}
