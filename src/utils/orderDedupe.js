const normalize = (value) => String(value ?? "").trim().toLocaleLowerCase();

const dateKey = (order) =>
  normalize(order?.settledDate || order?.date || order?.createdAt).replace(/\s+/g, " ");

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
        normalize(item?.id || item?.menuItemId || item?.name || item?.dishName),
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
    normalize(order?.tableId ?? order?.tableName),
    dateKey(order),
    time,
    amountKey(order),
    normalize(order?.paymentMethod),
    items,
  ].join("::");
};

const orderTimestamp = (order) => {
  const timestamp = Number(order?.orderTimestamp ?? order?.createdAt ?? 0);
  return Number.isFinite(timestamp) ? timestamp : 0;
};

/** Collapse copies of one settled sale even when a sync assigned each copy a different id/invoice number. */
export function dedupeOrders(orders = []) {
  const result = [];
  const indexByIdentity = new Map();

  for (const order of Array.isArray(orders) ? orders : []) {
    if (!order || typeof order !== "object") continue;
    const fingerprint = saleFingerprint(order);
    const identity = fingerprint || (order.id ? `id:${order.id}` : "");
    const existingIndex = identity ? indexByIdentity.get(identity) : undefined;

    if (existingIndex === undefined) {
      if (identity) indexByIdentity.set(identity, result.length);
      result.push(order);
      continue;
    }

    // Keep the more complete/newer copy, while retaining metadata from both sources.
    const existing = result[existingIndex];
    const incomingIsNewer = orderTimestamp(order) > orderTimestamp(existing);
    result[existingIndex] = incomingIsNewer
      ? { ...existing, ...order }
      : { ...order, ...existing };
  }

  return result.sort((a, b) => orderTimestamp(b) - orderTimestamp(a));
}
