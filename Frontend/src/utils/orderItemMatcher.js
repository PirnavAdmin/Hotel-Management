/**
 * Universal matcher for menu items and order items.
 * Robustly matches by exact ID, menuItemId, cleaned ID (without 'm-' prefix), or dish name.
 */
export function isSameMenuItem(a, b) {
  if (!a || !b) return false;

  const aName = String(a.name || a.dishName || "").trim().toLowerCase();
  const bName = String(b.name || b.dishName || "").trim().toLowerCase();

  // If both items have valid non-empty names and they differ, they CANNOT be the same menu item!
  if (aName && bName && aName !== bName) {
    return false;
  }

  // 1. Exact dish name match (case-insensitive, trimmed)
  if (aName && bName && aName === bName) {
    return true;
  }

  // 2. menuItemId match
  const aMenuId = a.menuItemId ?? a.menu_item_id;
  const bMenuId = b.menuItemId ?? b.menu_item_id;
  if (aMenuId != null && bMenuId != null && String(aMenuId) === String(bMenuId)) {
    return true;
  }

  // 3. Normalized ID match without 'm-' prefix
  const aCleanId = String(a.id ?? aMenuId ?? "").replace(/^m-/, "").trim();
  const bCleanId = String(b.id ?? bMenuId ?? "").replace(/^m-/, "").trim();
  if (aCleanId && bCleanId && aCleanId === bCleanId) {
    return true;
  }

  // 4. Exact ID match (only if neither has conflicting name)
  if (a.id != null && b.id != null && String(a.id) === String(b.id)) {
    return true;
  }

  return false;
}

/**
 * Consolidates duplicate order item rows in an array into single rows with deduplicated / consistent quantities.
 */
export function consolidateOrderItems(items = []) {
  if (!Array.isArray(items) || items.length === 0) return [];

  const consolidated = [];
  for (const item of items) {
    if (!item) continue;
    const existingIndex = consolidated.findIndex((c) => isSameMenuItem(c, item));
    if (existingIndex > -1) {
      const existing = consolidated[existingIndex];
      // When duplicate rows appear from duplicate SSE or API calls, take the maximum intended quantity
      const cleanQty = Math.max(Number(existing.quantity) || 1, Number(item.quantity) || 1);
      consolidated[existingIndex] = {
        ...existing,
        ...item,
        id: existing.id || item.id,
        menuItemId: existing.menuItemId ?? item.menuItemId ?? existing.id ?? item.id,
        quantity: cleanQty,
        notes: existing.notes || item.notes || "",
        kotStatus: existing.kotStatus === "ready" ? "ready" : (item.kotStatus || existing.kotStatus || "new"),
        kotSent: Boolean(existing.kotSent || item.kotSent),
      };
    } else {
      consolidated.push({
        ...item,
        quantity: Math.max(1, Number(item.quantity) || 1),
      });
    }
  }
  return consolidated;
}
