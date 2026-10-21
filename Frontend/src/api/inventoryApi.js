import { apiClient } from "./apiConfig";

export async function apiGetInventory(category, search) {
  const query = new URLSearchParams();
  if (category) query.append("category", category);
  if (search) query.append("search", search);
  const qStr = query.toString() ? `?${query.toString()}` : "";
  return apiClient(`/api/v1/inventory${qStr}`);
}

export async function apiGetInventoryIngredients() {
  return apiClient("/api/v1/inventory/ingredients");
}

export async function apiGetIngredientById(id) {
  return apiClient(`/api/v1/inventory/${id}`);
}

export async function apiCreateIngredient(ingredientData) {
  return apiClient("/api/v1/inventory/ingredients", {
    method: "POST",
    body: JSON.stringify(ingredientData),
  });
}

export async function apiUpdateIngredient(id, ingredientData) {
  return apiClient(`/api/v1/inventory/ingredients/${id}`, {
    method: "PUT",
    body: JSON.stringify(ingredientData),
  });
}

export async function apiDeleteIngredient(id) {
  return apiClient(`/api/v1/inventory/ingredients/${id}`, {
    method: "DELETE",
  });
}

export async function apiAdjustStock(adjustmentData) {
  return apiClient("/api/v1/inventory/adjust", {
    method: "POST",
    body: JSON.stringify(adjustmentData),
  });
}

export async function apiGetLowStockAlerts() {
  return apiClient("/api/v1/inventory/low-stock");
}

export async function apiGetInventoryCategories() {
  return apiClient("/api/v1/inventory/categories");
}

export async function apiGetInventoryTransactions(limit = 50) {
  return apiClient(`/api/v1/inventory/transactions?limit=${limit}`);
}
