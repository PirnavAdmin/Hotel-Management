import { API_BASE_URL, apiClient } from "./apiConfig";
import { getMenuItemImage } from "../utils/menuImageHelper";

export function normalizeMenuItem(item = {}) {
  const prepTime = item.prepTime ?? item.prep_time;
  const prepTimeMinutes = item.prepTimeMinutes ?? item.prep_time_minutes;
  const dietaryType = item.dietaryType ?? item.dietary_type;
  const rawImagePath = item.image ?? item.imageUrl ?? item.image_url ?? "";

  const resolvedImagePath =
    typeof rawImagePath === "string" &&
    rawImagePath.startsWith("/") &&
    !rawImagePath.startsWith("//") &&
    !rawImagePath.startsWith("/assets/") &&
    API_BASE_URL
      ? `${API_BASE_URL.replace(/\/$/, "")}${rawImagePath}`
      : rawImagePath;

  const intermediate = {
    ...item,
    id: item.id ?? item.menuItemId ?? item.menu_item_id,
    name: item.name ?? item.dishName ?? item.dish_name ?? "",
    category: item.category ?? "",
    price: Number(item.price) || 0,
    isVeg: item.isVeg ?? String(dietaryType ?? "").toUpperCase() === "VEG",
    isChefSpecial: Boolean(
      item.isChefSpecial ??
      item.isChefsSpecial ??
      item.is_chef_special ??
      item.isSpecial ??
      false
    ),
    isChefsSpecial: Boolean(
      item.isChefsSpecial ??
      item.isChefSpecial ??
      item.is_chef_special ??
      item.isSpecial ??
      false
    ),
    spiceLevel: Number(item.spiceLevel ?? item.spice_level) || 0,
    prepTime: prepTime ?? `${prepTimeMinutes ?? 15} min`,
    description:
      item.description ?? item.shortDescription ?? item.short_description ?? "",
    image: resolvedImagePath,
    isAvailable: item.isAvailable ?? item.is_available ?? true,
    recipe: Array.isArray(item.recipe)
      ? item.recipe
      : Array.isArray(item.Recipe)
      ? item.Recipe
      : [],
  };

  return {
    ...intermediate,
    image: getMenuItemImage(intermediate),
  };
}

export async function apiGetMenuItems() {
  return await apiClient("/api/v1/menu-items");
}

export async function apiGetMenuCategories() {
  return await apiClient("/api/v1/menu-items/categories");
}

export async function apiCreateMenuCategory(name, displayOrder = 0) {
  return await apiClient("/api/v1/menu-items/categories", {
    method: "POST",
    body: JSON.stringify({ name: String(name || "").trim(), displayOrder }),
  });
}

export async function apiUploadMenuImage(file) {
  const formData = new FormData();
  formData.append("file", file);
  const token = typeof localStorage !== "undefined"
    ? localStorage.getItem("avsr_jwt_token")
    : null;

  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/menu-items/upload-image`, {
      method: "POST",
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    });
    const text = await response.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch {}
    if (!response.ok || data?.success === false) {
      return {
        success: false,
        error: data?.message || data?.error || text || `Image upload failed (HTTP ${response.status}).`,
      };
    }
    const imageUrl =
      data?.imageUrl || data?.url || data?.fileUrl || data?.imagePath || data?.filePath || data?.path ||
      data?.data?.imageUrl || data?.data?.url || data?.data?.fileUrl || data?.data?.imagePath || data?.data?.filePath || data?.data?.path || data?.data?.data?.imageUrl || data?.data?.data?.url || (typeof data?.data === "string" ? data.data : undefined);
    if (!imageUrl || typeof imageUrl !== "string") {
      return { success: false, error: "Upload completed but the server did not return an image URL." };
    }
    return {
      success: true,
      imageUrl: imageUrl.startsWith("/") && API_BASE_URL
        ? `${API_BASE_URL.replace(/\/$/, "")}${imageUrl}`
        : imageUrl,
      data,
    };
  } catch (error) {
    return { success: false, error: error?.message || "Image upload failed." };
  }
}

export async function apiCreateMenuItem(itemData) {
  const isSpecialFlag = Boolean(itemData.isChefSpecial ?? itemData.isChefsSpecial ?? itemData.isSpecial);
  return await apiClient("/api/v1/menu-items", {
    method: "POST",
    body: JSON.stringify({
      dishName: itemData.name,
      category: itemData.category || "Main Course",
      price: parseFloat(itemData.price || 0),
      dietaryType: itemData.isVeg ? "VEG" : "NON-VEG",
      spiceLevel: Number.isFinite(Number(itemData.spiceLevel)) ? Number(itemData.spiceLevel) : 1,
      prepTimeMinutes: parseInt(itemData.prepTime || 15, 10),
      shortDescription: itemData.description || "",
      imageUrl: itemData.image || "",
      isChefsSpecial: isSpecialFlag,
      isChefSpecial: isSpecialFlag,
      isSpecial: isSpecialFlag,
      isAvailable: itemData.isAvailable !== false,
      recipe: Array.isArray(itemData.recipe) ? itemData.recipe : [],
    }),
  });
}

export async function apiUpdateMenuItem(id, itemData) {
  const cleanId = String(id).replace(/^m-/, "");
  const isSpecialFlag = Boolean(itemData.isChefSpecial ?? itemData.isChefsSpecial ?? itemData.isSpecial);
  return await apiClient(`/api/v1/menu-items/${encodeURIComponent(cleanId)}`, {
    method: "PUT",
    body: JSON.stringify({
      dishName: itemData.name,
      category: itemData.category,
      price: parseFloat(itemData.price || 0),
      dietaryType: itemData.isVeg ? "VEG" : "NON-VEG",
      spiceLevel: Number.isFinite(Number(itemData.spiceLevel)) ? Number(itemData.spiceLevel) : 1,
      prepTimeMinutes: parseInt(itemData.prepTime || 15, 10),
      shortDescription: itemData.description || "",
      imageUrl: itemData.image || "",
      isChefsSpecial: isSpecialFlag,
      isChefSpecial: isSpecialFlag,
      isSpecial: isSpecialFlag,
      isAvailable: itemData.isAvailable !== false,
      recipe: Array.isArray(itemData.recipe) ? itemData.recipe : [],
    }),
  });
}

export async function apiDeleteMenuItem(id) {
  const cleanId = String(id).replace(/^m-/, "");
  return await apiClient(`/api/v1/menu-items/${encodeURIComponent(cleanId)}`, {
    method: "DELETE",
  });
}

export async function apiSetMenuAvailability(id, isAvailable) {
  const cleanId = String(id).replace(/^m-/, "");
  return await apiClient(`/api/v1/menu-items/${encodeURIComponent(cleanId)}/availability`, {
    method: "PATCH",
    body: JSON.stringify({ isAvailable: !!isAvailable }),
  });
}

export async function apiSetMenuSpecialStatus(id, isSpecial) {
  const cleanId = String(id).replace(/^m-/, "");
  return await apiClient(`/api/v1/menu-items/${encodeURIComponent(cleanId)}/special-status`, {
    method: "PATCH",
    body: JSON.stringify({ isSpecial: !!isSpecial }),
  });
}
