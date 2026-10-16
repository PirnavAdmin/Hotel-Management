import { apiClient } from "./apiConfig";

export async function apiGetInventory() {
  return apiClient("/api/v1/inventory");
}

export async function apiGetInventoryIngredients() {
  return apiClient("/api/v1/inventory/ingredients");
}
