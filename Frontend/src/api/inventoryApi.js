import { apiClient } from "./apiConfig";

/**
 * Retrieves all inventory ingredients from backend MySQL database.
 */
export async function apiGetInventory() {
  return apiClient("/api/v1/inventory");
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
  const thresholdVal = Number(itemData.minThreshold) || 5;
  const mrpVal =
    itemData.mrp == null || itemData.mrp === "" ? null : Number(itemData.mrp);
  const costVal = Number(itemData.unitCost || mrpVal || 0);

  return apiClient("/api/v1/inventory", {
    method: "POST",
    body: JSON.stringify({
      name: (itemData.name || "").trim(),
      category: itemData.category || "General",
      subcategory: itemData.subcategory || "",
      supplier: (itemData.supplier || "Local Supplier").trim(),
      unit: (itemData.unit || "KG").toUpperCase(),
      stock: stockVal,
      minThreshold: thresholdVal,
      unitCost: costVal,
      mrp: mrpVal,
      // Field aliases for backend DTO compatibility
      currentStock: stockVal,
      minimumThreshold: thresholdVal,
    }),
  });
}

/**
 * Updates an existing ingredient in MySQL database.
 */
export async function apiUpdateInventoryItem(id, itemData) {
  const stockVal = Number(itemData.stock) || 0;
  const thresholdVal = Number(itemData.minThreshold) || 5;
  const mrpVal =
    itemData.mrp == null || itemData.mrp === "" ? null : Number(itemData.mrp);
  const costVal = Number(itemData.unitCost || mrpVal || 0);

  return apiClient(`/api/v1/inventory/${id}`, {
    method: "PUT",
    body: JSON.stringify({
      name: (itemData.name || "").trim(),
      category: itemData.category || "General",
      subcategory: itemData.subcategory || "",
      supplier: (itemData.supplier || "Local Supplier").trim(),
      unit: (itemData.unit || "KG").toUpperCase(),
      stock: stockVal,
      minThreshold: thresholdVal,
      unitCost: costVal,
      mrp: mrpVal,
      currentStock: stockVal,
      minimumThreshold: thresholdVal,
    }),
  });
}

/**
 * Deletes / deactivates an ingredient in MySQL database.
 */
export async function apiDeleteInventoryItem(id) {
  return apiClient(`/api/v1/inventory/${id}`, {
    method: "DELETE",
  });
}

/**
 * Adjusts stock quantity for an ingredient in MySQL database and logs audit transaction.
 */
export async function apiAdjustStock({ ingredientId, quantityChange, reason }) {
  return apiClient("/api/v1/inventory/adjust", {
    method: "POST",
    body: JSON.stringify({
      ingredientId: Number(ingredientId),
      quantityChange: Number(quantityChange),
      reason: reason || "Stock adjustment",
      // Compatibility aliases
      id: Number(ingredientId),
      delta: Number(quantityChange),
    }),
  });
}

/**
 * Retrieves low stock inventory items from MySQL.
 */
export async function apiGetLowStockInventory() {
  return apiClient("/api/v1/inventory/low-stock");
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
