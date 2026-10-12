import { API_BASE_URL, apiClient } from "./apiConfig";

export function normalizeMenuItem(item = {}) {
  const prepTime = item.prepTime ?? item.prep_time;
  const prepTimeMinutes = item.prepTimeMinutes ?? item.prep_time_minutes;
  const dietaryType = item.dietaryType ?? item.dietary_type;
  const imagePath = item.image ?? item.imageUrl ?? item.image_url ?? "";

  return {
    ...item,
    id: item.id ?? item.menuItemId ?? item.menu_item_id,
    name: item.name ?? item.dishName ?? item.dish_name ?? "",
    category: item.category ?? "",
    price: Number(item.price) || 0,
    isVeg: item.isVeg ?? String(dietaryType ?? "").toUpperCase() === "VEG",
    isChefSpecial:
      item.isChefSpecial ??
      item.isChefsSpecial ??
      item.is_chef_special ??
      false,
    spiceLevel: Number(item.spiceLevel ?? item.spice_level) || 0,
    prepTime: prepTime ?? `${prepTimeMinutes ?? 15} min`,
    description:
      item.description ?? item.shortDescription ?? item.short_description ?? "",
    image:
      typeof imagePath === "string" &&
      imagePath.startsWith("/") &&
      !imagePath.startsWith("//") &&
      API_BASE_URL
        ? `${API_BASE_URL.replace(/\/$/, "")}${imagePath}`
        : imagePath,
    isAvailable: item.isAvailable ?? item.is_available ?? true,
  };
}

export async function apiGetMenuItems() {
  return await apiClient("/api/v1/menu-items");
}

export async function apiGetMenuCategories() {
  return await apiClient("/api/v1/menu-items/categories");
}

export async function apiCreateMenuItem(itemData) {
  return await apiClient("/api/v1/menu-items", {
    method: "POST",
    body: JSON.stringify({
      dishName: itemData.name,
      category: itemData.category || "Main Course",
      price: parseFloat(itemData.price || 0),
      dietaryType: itemData.isVeg ? "VEG" : "NON-VEG",
      spiceLevel: itemData.spiceLevel || 1,
      prepTimeMinutes: parseInt(itemData.prepTime || 15, 10),
      shortDescription: itemData.description || "",
      imageUrl: itemData.image || "",
      isChefsSpecial: !!itemData.isChefSpecial,
      isAvailable: true,
    }),
  });
}

export async function apiUpdateMenuItem(id, itemData) {
  const cleanId = String(id).replace("m-", "");
  return await apiClient(`/api/v1/menu-items/${cleanId}`, {
    method: "PUT",
    body: JSON.stringify({
      dishName: itemData.name,
      category: itemData.category,
      price: parseFloat(itemData.price || 0),
      dietaryType: itemData.isVeg ? "VEG" : "NON-VEG",
      spiceLevel: itemData.spiceLevel || 1,
      prepTimeMinutes: parseInt(itemData.prepTime || 15, 10),
      shortDescription: itemData.description || "",
      imageUrl: itemData.image || "",
      isChefsSpecial: !!itemData.isChefSpecial,
      isAvailable: itemData.isAvailable !== false,
    }),
  });
}

export async function apiDeleteMenuItem(id) {
  const cleanId = String(id).replace("m-", "");
  return await apiClient(`/api/v1/menu-items/${cleanId}`, {
    method: "DELETE",
  });
}
