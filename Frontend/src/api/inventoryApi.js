import { apiClient } from "./apiConfig";

/**
 * Retrieves all inventory ingredients from backend MySQL database.
 */
export async function apiGetInventory(category, search) {
  const query = new URLSearchParams();
  if (category) query.set("category", category);
  if (search) query.set("search", search);
  const queryString = query.toString();
  return apiClient(`/api/v1/inventory${queryString ? `?${queryString}` : ""}`);
}

export async function apiGetInventoryIngredients() {
  return apiClient("/api/v1/inventory/ingredients");
}

/**
 * Creates a new ingredient supply item in MySQL database.
 * Accepts:
 * { name, category, subcategory, supplier, unit, stock, minThreshold, unitCost, mrp }
 */
export async function apiCreateInventoryItem(itemData) {
  const stockVal = Number(itemData.stock) || 0;
  const thresholdVal = itemData.minThreshold == null || itemData.minThreshold === ""
    ? 5
    : Number(itemData.minThreshold);
  const mrpVal =
    itemData.mrp == null || itemData.mrp === "" ? null : Number(itemData.mrp);
  const costVal = Number(itemData.unitCost || mrpVal || 0);

  return apiClient("/api/v1/inventory", {
    method: "POST",
    body: JSON.stringify({
      ...itemData,
      name: (itemData.name || "").trim(),
      category: itemData.category || "General",
      subcategory: itemData.subcategory || itemData.brand || "",
      brand: itemData.brand || itemData.subcategory || "",
      supplier: (itemData.supplier || "Local Supplier").trim(),
      unit: itemData.unit || "Bottle",
      stock: stockVal,
      minThreshold: thresholdVal,
      unitCost: costVal,
      mrp: mrpVal,
      abv: itemData.abv != null && itemData.abv !== "" ? Number(itemData.abv) : null,
      volumeMl: itemData.volumeMl != null && itemData.volumeMl !== "" ? Number(itemData.volumeMl) : null,
      storageLocation: itemData.storageLocation || "",
      sellingPrice: itemData.sellingPrice != null && itemData.sellingPrice !== "" ? Number(itemData.sellingPrice) : mrpVal,
      currentStock: stockVal,
      minimumThreshold: thresholdVal,
    }),
  });
}

export async function apiCreateIngredient(ingredientData) {
  return apiClient("/api/v1/inventory/ingredients", {
    method: "POST",
    body: JSON.stringify(ingredientData),
  });
}

/**
 * Updates an existing ingredient in MySQL database.
 */
export async function apiUpdateInventoryItem(id, itemData) {
  const stockVal = Number(itemData.stock) || 0;
  const thresholdVal = itemData.minThreshold == null || itemData.minThreshold === ""
    ? 5
    : Number(itemData.minThreshold);
  const mrpVal =
    itemData.mrp == null || itemData.mrp === "" ? null : Number(itemData.mrp);
  const costVal = Number(itemData.unitCost || mrpVal || 0);

  return apiClient(`/api/v1/inventory/${id}`, {
    method: "PUT",
    body: JSON.stringify({
      ...itemData,
      name: (itemData.name || "").trim(),
      category: itemData.category || "General",
      subcategory: itemData.subcategory || itemData.brand || "",
      brand: itemData.brand || itemData.subcategory || "",
      supplier: (itemData.supplier || "Local Supplier").trim(),
      unit: itemData.unit || "Bottle",
      stock: stockVal,
      minThreshold: thresholdVal,
      unitCost: costVal,
      mrp: mrpVal,
      abv: itemData.abv != null && itemData.abv !== "" ? Number(itemData.abv) : null,
      volumeMl: itemData.volumeMl != null && itemData.volumeMl !== "" ? Number(itemData.volumeMl) : null,
      storageLocation: itemData.storageLocation || "",
      sellingPrice: itemData.sellingPrice != null && itemData.sellingPrice !== "" ? Number(itemData.sellingPrice) : mrpVal,
      currentStock: stockVal,
      minimumThreshold: thresholdVal,
    }),
  });
}

export async function apiUpdateIngredient(id, ingredientData) {
  return apiClient(`/api/v1/inventory/ingredients/${id}`, {
    method: "PUT",
    body: JSON.stringify(ingredientData),
  });
}

/**
 * Deletes / deactivates an ingredient in MySQL database.
 */
export async function apiDeleteInventoryItem(id) {
  const primaryResult = await apiClient(`/api/v1/inventory/${id}`, {
    method: "DELETE",
  });
  if (primaryResult?.success) return primaryResult;

  const fallbackResult = await apiClient(`/api/v1/inventory/ingredients/${id}`, {
    method: "DELETE",
  });
  if (fallbackResult?.success) return fallbackResult;

  return {
    ...fallbackResult,
    error: `Delete failed on both inventory routes. Primary: ${primaryResult?.error || "unknown error"}. Fallback: ${fallbackResult?.error || "unknown error"}.`,
  };
}

export async function apiDeleteIngredient(id) {
  return apiDeleteInventoryItem(id);
}

/**
 * Adjusts stock quantity for an ingredient in MySQL database and logs audit transaction.
 */
export async function apiAdjustStock({ ingredientId, quantityChange, reason }) {
  const id = Number(ingredientId);
  const change = Number(quantityChange);
  if (!Number.isInteger(id) || id <= 0 || !Number.isFinite(change) || change === 0) {
    return { success: false, error: "Ingredient ID and a non-zero stock change are required." };
  }
  if (String(reason || "").length > 255) {
    return { success: false, error: "Stock adjustment reason cannot exceed 255 characters." };
  }
  return apiClient("/api/v1/inventory/adjust", {
    method: "POST",
    body: JSON.stringify({
      ingredientId: id,
      quantityChange: change,
      reason: reason || "Stock adjustment",
      // Compatibility aliases
      id,
      delta: change,
    }),
  });
}

export function apiGetInventoryPurchases({ department, limit = 500 } = {}) {
  const query = new URLSearchParams();
  if (department) query.set("department", department);
  query.set("limit", String(limit));
  return apiClient(`/api/v1/inventory/purchases?${query.toString()}`);
}

export function apiCreateInventoryPurchase(purchase) {
  const itemId = Number(purchase.itemId);
  return apiClient("/api/v1/inventory/purchases", {
    method: "POST",
    body: JSON.stringify({
      itemId: Number.isInteger(itemId) && itemId > 0 ? itemId : null,
      name: String(purchase.name || "").trim(),
      category: String(purchase.category || "").trim(),
      subcategory: String(purchase.subcategory || "").trim(),
      supplier: String(purchase.supplier || "").trim(),
      quantity: Number(purchase.quantity),
      unit: String(purchase.unit || "").trim(),
      unitCost: Number(purchase.unitCost),
      department: String(purchase.department || "dine").trim().toLowerCase(),
      purchaseDate: purchase.purchaseDate,
    }),
  });
}

/**
 * Retrieves low stock inventory items from MySQL.
 */
export async function apiGetLowStockInventory() {
  return apiClient("/api/v1/inventory/low-stock");
}

export async function apiGetLowStockAlerts() {
  return apiGetLowStockInventory();
}

/**
 * Retrieves a single ingredient by ID from MySQL database.
 */
export async function apiGetIngredientById(id) {
  return apiClient(`/api/v1/inventory/${id}`);
}

/**
 * Retrieves distinct ingredient categories from MySQL database.
 */
export async function apiGetInventoryCategories() {
  return apiClient("/api/v1/inventory/categories");
}

/**
 * Retrieves inventory transactions audit log from MySQL.
 */
export async function apiGetInventoryTransactions(limit = 50) {
  return apiClient(`/api/v1/inventory/transactions?limit=${limit}`);
}
