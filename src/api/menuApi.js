import { API_BASE_URL, apiClient } from "./apiConfig";
import { getMenuItemImage } from "../utils/menuImageHelper";
import {
  isDrinkCategory,
  isAlcoholicCategory,
  getDrinkDietaryType,
} from "../utils/drinkCategoryHelper";

export function normalizeMenuItem(item = {}) {
  const prepTime = item.prepTime ?? item.prep_time;
  const prepTimeMinutes = item.prepTimeMinutes ?? item.prep_time_minutes;
  const dietaryType = item.dietaryType ?? item.dietary_type;
  const isDrink = isDrinkCategory(item.category, item);

  const drinkType =
    item.drinkType ??
    item.drink_type ??
    (isDrink
      ? isAlcoholicCategory(item.category, null, item.alcoholPct ?? item.abv)
        ? "Alcoholic"
        : "Non-Alcoholic"
      : null);

  const alcoholPct =
    item.alcoholPct ??
    item.alcohol_pct ??
    item.abv ??
    (drinkType === "Alcoholic"
      ? String(item.category || "").toLowerCase().includes("beer")
        ? 5
        : String(item.category || "").toLowerCase().includes("wine")
        ? 12
        : 40
      : 0);

  const servingMeasure =
    item.servingMeasure ??
    item.serving_measure ??
    item.measure ??
    item.servingVolume ??
    (drinkType === "Alcoholic" ? "30 ml (Single Peg)" : "Glass (250 ml)");

  // Requirement 1:
  // If Drink Type = Alcoholic -> Dietary Type = Veg
  // If Drink Type = Non-Alcoholic -> Dietary Type = Non-Veg
  const resolvedDietary = isDrink
    ? getDrinkDietaryType(drinkType, item.category, alcoholPct)
    : dietaryType && String(dietaryType).trim().toUpperCase() !== "N/A"
    ? String(dietaryType).toUpperCase().includes("VEG") &&
      !String(dietaryType).toUpperCase().includes("NON")
      ? "Veg"
      : "Non-Veg"
    : item.isVeg
    ? "Veg"
    : "Non-Veg";

  const resolvedIsVeg = isDrink
    ? drinkType === "Alcoholic"
    : typeof item.isVeg === "boolean"
    ? item.isVeg
    : resolvedDietary === "Veg";

  const rawImagePath =
    [item.imageUrl, item.image_url, item.image, item.ImageUrl].find(
      (value) => typeof value === "string" && value.trim().length > 0,
    )?.trim() || "";

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
    dishName: item.name ?? item.dishName ?? item.dish_name ?? "",
    drinkName: item.drinkName ?? item.name ?? item.dishName ?? "",
    category: item.category ?? "",
    price: Number(item.price) || 0,
    dietaryType: resolvedDietary,
    isVeg: resolvedIsVeg,
    isBarItem: isDrink,
    isBarDrink: isDrink,
    drinkType: isDrink ? drinkType : null,
    alcoholPct: isDrink ? alcoholPct : null,
    abv: isDrink ? alcoholPct : null,
    alcoholContent: isDrink ? alcoholPct : null,
    servingMeasure: isDrink ? servingMeasure : null,
    measure: isDrink ? servingMeasure : null,
    servingVolume: isDrink ? servingMeasure : null,
    isChefSpecial: Boolean(
      item.isChefSpecial ??
        item.isChefsSpecial ??
        item.is_chef_special ??
        item.isSpecial ??
        false,
    ),
    isChefsSpecial: Boolean(
      item.isChefsSpecial ??
        item.isChefSpecial ??
        item.is_chef_special ??
        item.isSpecial ??
        false,
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
    image: getMenuItemImage({ image: resolvedImagePath }),
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
  const token =
    typeof localStorage !== "undefined"
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
    try {
      data = text ? JSON.parse(text) : null;
    } catch {}
    if (!response.ok || data?.success === false) {
      return {
        success: false,
        error:
          data?.message ||
          data?.error ||
          text ||
          `Image upload failed (HTTP ${response.status}).`,
      };
    }
    const imageUrl =
      data?.imageUrl ||
      data?.url ||
      data?.fileUrl ||
      data?.imagePath ||
      data?.filePath ||
      data?.path ||
      data?.data?.imageUrl ||
      data?.data?.url ||
      data?.data?.fileUrl ||
      data?.data?.imagePath ||
      data?.data?.filePath ||
      data?.data?.path ||
      data?.data?.data?.imageUrl ||
      data?.data?.data?.url ||
      (typeof data?.data === "string" ? data.data : undefined);
    if (!imageUrl || typeof imageUrl !== "string") {
      return {
        success: false,
        error: "Upload completed but the server did not return an image URL.",
      };
    }
    return {
      success: true,
      imageUrl:
        imageUrl.startsWith("/") && API_BASE_URL
          ? `${API_BASE_URL.replace(/\/$/, "")}${imageUrl}`
          : imageUrl,
      data,
    };
  } catch (error) {
    return { success: false, error: error?.message || "Image upload failed." };
  }
}

export async function apiCreateMenuItem(itemData) {
  const isSpecialFlag = Boolean(
    itemData.isChefSpecial ?? itemData.isChefsSpecial ?? itemData.isSpecial,
  );
  const isDrink = isDrinkCategory(itemData.category, itemData);
  const drinkType =
    itemData.drinkType ||
    (isDrink
      ? isAlcoholicCategory(itemData.category, null, itemData.alcoholPct ?? itemData.abv)
        ? "Alcoholic"
        : "Non-Alcoholic"
      : null);
  const alcoholPct = isDrink
    ? Number(itemData.alcoholPct ?? itemData.abv ?? (drinkType === "Alcoholic" ? 40 : 0))
    : null;
  const servingMeasure = isDrink
    ? itemData.servingMeasure ||
      itemData.measure ||
      (drinkType === "Alcoholic" ? "30 ml (Single Peg)" : "Glass (250 ml)")
    : null;
  const dietaryType = isDrink
    ? getDrinkDietaryType(drinkType, itemData.category, alcoholPct)
    : itemData.isVeg
    ? "Veg"
    : "Non-Veg";

  return await apiClient("/api/v1/menu-items", {
    method: "POST",
    body: JSON.stringify({
      dishName: itemData.name,
      category: itemData.category || "Main Course",
      price: parseFloat(itemData.price || 0),
      dietaryType: dietaryType,
      isVeg: isDrink ? drinkType === "Alcoholic" : Boolean(itemData.isVeg),
      spiceLevel: Number.isFinite(Number(itemData.spiceLevel))
        ? Number(itemData.spiceLevel)
        : 0,
      prepTimeMinutes: parseInt(itemData.prepTime || 15, 10),
      shortDescription: itemData.description || "",
      imageUrl: itemData.image || "",
      isChefsSpecial: isSpecialFlag,
      isChefSpecial: isSpecialFlag,
      isSpecial: isSpecialFlag,
      isAvailable: itemData.isAvailable !== false,
      isBarItem: isDrink,
      drinkType: drinkType,
      alcoholPct: alcoholPct,
      servingMeasure: servingMeasure,
      recipe: Array.isArray(itemData.recipe) ? itemData.recipe : [],
    }),
  });
}

export async function apiUpdateMenuItem(id, itemData) {
  const cleanId = String(id).replace(/^m-/, "");
  const isSpecialFlag = Boolean(
    itemData.isChefSpecial ?? itemData.isChefsSpecial ?? itemData.isSpecial,
  );
  const isDrink = isDrinkCategory(itemData.category, itemData);
  const drinkType =
    itemData.drinkType ||
    (isDrink
      ? isAlcoholicCategory(itemData.category, null, itemData.alcoholPct ?? itemData.abv)
        ? "Alcoholic"
        : "Non-Alcoholic"
      : null);
  const alcoholPct = isDrink
    ? Number(itemData.alcoholPct ?? itemData.abv ?? (drinkType === "Alcoholic" ? 40 : 0))
    : null;
  const servingMeasure = isDrink
    ? itemData.servingMeasure ||
      itemData.measure ||
      (drinkType === "Alcoholic" ? "30 ml (Single Peg)" : "Glass (250 ml)")
    : null;
  const dietaryType = isDrink
    ? getDrinkDietaryType(drinkType, itemData.category, alcoholPct)
    : itemData.isVeg
    ? "Veg"
    : "Non-Veg";

  return await apiClient(`/api/v1/menu-items/${encodeURIComponent(cleanId)}`, {
    method: "PUT",
    body: JSON.stringify({
      dishName: itemData.name,
      category: itemData.category,
      price: parseFloat(itemData.price || 0),
      dietaryType: dietaryType,
      isVeg: isDrink ? drinkType === "Alcoholic" : Boolean(itemData.isVeg),
      spiceLevel: Number.isFinite(Number(itemData.spiceLevel))
        ? Number(itemData.spiceLevel)
        : 0,
      prepTimeMinutes: parseInt(itemData.prepTime || 15, 10),
      shortDescription: itemData.description || "",
      imageUrl: itemData.image || "",
      isChefsSpecial: isSpecialFlag,
      isChefSpecial: isSpecialFlag,
      isSpecial: isSpecialFlag,
      isAvailable: itemData.isAvailable !== false,
      isBarItem: isDrink,
      drinkType: drinkType,
      alcoholPct: alcoholPct,
      servingMeasure: servingMeasure,
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
  return await apiClient(
    `/api/v1/menu-items/${encodeURIComponent(cleanId)}/availability`,
    {
      method: "PATCH",
      body: JSON.stringify({ isAvailable: !!isAvailable }),
    },
  );
}

export async function apiSetMenuSpecialStatus(id, isSpecial) {
  const cleanId = String(id).replace(/^m-/, "");
  return await apiClient(
    `/api/v1/menu-items/${encodeURIComponent(cleanId)}/special-status`,
    {
      method: "PATCH",
      body: JSON.stringify({ isSpecial: !!isSpecial }),
    },
  );
}
