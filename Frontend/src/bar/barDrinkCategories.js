export const BAR_CATEGORIES = Object.freeze([
  "Cocktails",
  "Mocktails",
  "Beers",
  "Whiskey",
  "Vodka & Gin",
  "Rum & Brandy",
  "Wine & Champagne",
  "Shots & Shooters",
  "Coffee",
  "Tea",
  "Soft Drinks",
  "Fresh Juices",
  "Milkshakes",
  "Smoothies",
  "Energy Drinks",
  "Sports Drinks",
  "Water",
  "Lemonades",
  "Dairy Beverages",
  "Coconut Beverages",
  "Iced Tea",
  "Hot Chocolate",
  "Slushies",
  "Other Beverages",
]);

const nonCategoryValues = new Set([
  "all",
  "all categories",
  "all category",
  "all items",
  "category",
  "categories",
  "select category",
  "__custom__",
]);

const categoryValue = (value) => {
  if (typeof value === "string" || typeof value === "number") return String(value).trim();
  if (!value || typeof value !== "object") return "";
  return String(value.name ?? value.category ?? value.categoryName ?? value.category_name ?? "").trim();
};

/** Merge standard, API-provided, and existing saved categories without losing custom values. */
export function mergeBarDrinkCategories(apiCategories = [], drinks = []) {
  const unique = new Map();
  const add = (entry) => {
    const value = categoryValue(entry);
    const key = value.toLocaleLowerCase();
    if (!value || nonCategoryValues.has(key) || unique.has(key)) return;
    unique.set(key, { value, label: value });
  };

  BAR_CATEGORIES.forEach(add);
  (Array.isArray(apiCategories) ? apiCategories : []).forEach(add);
  (Array.isArray(drinks) ? drinks : []).forEach((drink) => {
    add(drink?.category ?? drink?.categoryName ?? drink?.category_name);
  });
  return Array.from(unique.values());
}
