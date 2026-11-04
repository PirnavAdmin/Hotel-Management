/**
 * Drink category helper utilities for AVSR Hotel Management System.
 * Ensures consistent handling of drinks, dietary classification, and synchronization across all frontend modules.
 */

export const FOOD_CATEGORY_KEYWORDS = [
  "biryani",
  "curries",
  "curry",
  "starters",
  "starter",
  "desserts",
  "dessert",
  "rice",
  "breads",
  "bread",
  "roti",
  "naan",
  "tandoori",
  "tandoor",
  "chinese",
  "south indian",
  "north indian",
  "snacks",
  "main course",
  "soups",
  "soup",
  "salads",
  "salad",
];

export const DRINK_CATEGORY_KEYWORDS = [
  "beverage",
  "beverages",
  "drink",
  "drinks",
  "cocktail",
  "cocktails",
  "mocktail",
  "mocktails",
  "juice",
  "juices",
  "soft drink",
  "soft drinks",
  "softdrink",
  "softdrinks",
  "soda",
  "sodas",
  "tea",
  "coffee",
  "tea & coffee",
  "tea and coffee",
  "hot beverage",
  "hot beverages",
  "cold beverage",
  "cold beverages",
  "alcoholic",
  "alcoholic beverage",
  "alcoholic beverages",
  "alcohol",
  "beer",
  "beers",
  "whiskey",
  "whisky",
  "bourbon",
  "scotch",
  "vodka",
  "vodka & gin",
  "gin",
  "rum",
  "rum & brandy",
  "brandy",
  "wine",
  "wine & champagne",
  "champagne",
  "tequila",
  "liqueur",
  "liquor",
  "spirits",
  "shots",
  "shooters",
  "shake",
  "shakes",
  "smoothie",
  "smoothies",
];

export const ALCOHOLIC_KEYWORDS = [
  "beer",
  "beers",
  "whiskey",
  "whisky",
  "bourbon",
  "scotch",
  "vodka",
  "vodka & gin",
  "gin",
  "rum",
  "rum & brandy",
  "brandy",
  "wine",
  "wine & champagne",
  "champagne",
  "cocktail",
  "cocktails",
  "shots",
  "shooters",
  "spirits",
  "liqueur",
  "liquor",
  "tequila",
  "alcohol",
  "alcoholic",
  "alcoholic beverage",
  "alcoholic beverages",
];

/**
 * Returns true if the given category represents a food category (not a drink).
 * @param {string|null|undefined} category
 * @returns {boolean}
 */
export function isFoodCategory(category) {
  if (!category || typeof category !== "string") return false;
  const normalized = category.trim().toLowerCase();
  return FOOD_CATEGORY_KEYWORDS.some(
    (kw) => normalized === kw || normalized.includes(kw)
  );
}

/**
 * Returns true if the given category or item represents an alcoholic or non-alcoholic beverage.
 * Ensures food items like Biryani, Curries, Starters, Desserts are never classified as drinks.
 * @param {string|null|undefined} category
 * @param {object|null|undefined} item
 * @returns {boolean}
 */
export function isDrinkCategory(category, item = null) {
  const effectiveCategory = category ?? item?.category ?? "";
  if (isFoodCategory(effectiveCategory)) {
    return false;
  }

  if (item && (item.isBarItem || item.isBarDrink || item.isBeverage || Boolean(item.drinkType))) {
    return true;
  }

  if (!effectiveCategory || typeof effectiveCategory !== "string") {
    return Boolean(item?.isBarItem || item?.drinkType);
  }

  const normalized = effectiveCategory.trim().toLowerCase();
  return DRINK_CATEGORY_KEYWORDS.some(
    (kw) => normalized === kw || normalized.includes(kw)
  );
}

/**
 * Checks whether a drink or category is alcoholic.
 * @param {string|null|undefined} category
 * @param {string|null|undefined} drinkType
 * @param {number|string|null|undefined} abv
 * @returns {boolean}
 */
export function isAlcoholicCategory(category, drinkType = null, abv = null) {
  if (drinkType) {
    const dt = String(drinkType).trim().toLowerCase();
    if (dt.includes("non")) return false;
    if (dt.includes("alc")) return true;
  }

  const numAbv = Number(abv);
  if (!Number.isNaN(numAbv) && numAbv > 0) {
    return true;
  }

  if (!category || typeof category !== "string") return false;
  const normalized = category.trim().toLowerCase();
  return ALCOHOLIC_KEYWORDS.some(
    (kw) => normalized === kw || normalized.includes(kw)
  );
}

/**
 * Requirement 1:
 * When adding a drink, Dietary Type must be automatically assigned based on Drink Type:
 * - If Drink Type = Alcoholic -> Automatically set Dietary Type = Veg.
 * - If Drink Type = Non-Alcoholic -> Automatically set Dietary Type = Non-Veg.
 * @param {string|null|undefined} drinkType
 * @param {string|null|undefined} category
 * @param {number|string|null|undefined} abv
 * @returns {"Veg" | "Non-Veg"}
 */
export function getDrinkDietaryType(drinkType, category = null, abv = null) {
  return isAlcoholicCategory(category, drinkType, abv) ? "Veg" : "Non-Veg";
}

/**
 * Normalizes the dietary display string.
 * For drinks:
 *   Alcoholic -> "VEG"
 *   Non-Alcoholic -> "NON-VEG"
 * For food:
 *   Veg -> "VEG"
 *   Non-Veg -> "NON-VEG"
 * @param {string|null|undefined} dietaryType
 * @param {string|null|undefined} category
 * @param {object|null|undefined} item
 * @returns {"VEG" | "NON-VEG"}
 */
export function formatDietaryType(dietaryType, category, item = null) {
  if (isDrinkCategory(category, item)) {
    const isAlc = isAlcoholicCategory(
      category ?? item?.category,
      item?.drinkType,
      item?.abv ?? item?.alcoholPct ?? item?.alcoholContent
    );
    return isAlc ? "VEG" : "NON-VEG";
  }

  const clean = String(dietaryType ?? "").trim().toUpperCase();
  if (clean === "VEG" || clean === "PURE VEG") return "VEG";
  if (clean === "NON-VEG" || clean === "NON VEG") return "NON-VEG";

  if (item && typeof item.isVeg === "boolean") {
    return item.isVeg ? "VEG" : "NON-VEG";
  }

  return "NON-VEG";
}
