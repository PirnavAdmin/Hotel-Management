// Strict word-boundary beverage matcher to avoid false positives (e.g. "gin" inside "packaging")
const BEVERAGE_KEYWORDS = [
  "beverage", "beverages",
  "drink", "drinks",
  "mocktail", "mocktails",
  "cocktail", "cocktails",
  "beer", "beers",
  "cider", "ciders",
  "wine", "wines",
  "champagne",
  "whisky", "whiskey", "whiskeys",
  "scotch", "bourbon",
  "rum", "rums",
  "vodka", "vodkas",
  "gin", "gins",
  "brandy", "cognac",
  "tequila", "mezcal",
  "liqueur", "liqueurs", "aperitif", "bitters",
  "shot", "shots", "shooter", "shooters",
  "shake", "shakes", "smoothie", "smoothies",
  "soda", "tonic", "mixer", "mixers",
  "juice", "juices",
  "tea", "chai", "coffee", "latte", "espresso", "cappuccino",
  "syrup", "puree",
  "bar"
];

const BEVERAGE_REGEX = new RegExp(`(?:^|[^a-z0-9])(?:${BEVERAGE_KEYWORDS.join("|")})(?:$|[^a-z0-9])`, "i");

export function isBeverageCategory(category) {
  const str = String(category ?? "").trim();
  if (!str) return false;
  // Explicitly reject packaging, disposable, meat, grocery, hygiene items
  if (/(?:packaging|disposable|handi|container|foil|tray|bag|napkin|cutlery|meat|poultry|seafood|grain|vegetable|produce|spice|hygiene|cleaning|detergent)/i.test(str)) {
    return false;
  }
  return BEVERAGE_REGEX.test(str);
}

export function createMenuItemLookup(menuItems = []) {
  const lookup = new Map();
  menuItems.forEach((item) => {
    const id = item.id ?? item.menuItemId ?? item.menu_item_id;
    if (id == null) return;
    lookup.set(String(id), item);
    const numericId = String(id).replace(/\D/g, "");
    if (numericId) lookup.set(numericId, item);
  });
  return lookup;
}

export function findMenuItem(lookup, item) {
  const id = item?.menuItemId ?? item?.menu_item_id;
  if (id == null) return null;
  const key = String(id);
  return lookup.get(key) ?? lookup.get(key.replace(/\D/g, "")) ?? null;
}

const DRINK_NAME_REGEX = /\b(?:virgin\s+)?(?:mojito|margarita|martini|cocktail|mocktail|beer|whisky|whiskey|scotch|bourbon|vodka|rum|gin|brandy|cognac|tequila|mezcal|wine|champagne|sangria|cider|breezer|shooter|shot|liqueur)\b/i;
const KNOWN_FOOD_CATEGORIES = new Set([
  "main course", "starters", "starter", "biryani", "curry", "curries", "rice",
  "breads", "bread", "roti", "desserts", "dessert", "tandoor", "tandoori",
  "soups", "soup", "salads", "salad", "appetizers", "appetizer", "sides", "snacks"
]);

export function isDrinkItem(item, menuLookup = null, barDrinksList = []) {
  if (!item) return false;

  // 1. Explicit bar drink flags
  if (item.isBarDrink === true || item.isBarItem === true) return true;
  if (item.drinkType || item.alcoholPct != null || item.servingMeasure) return true;

  // 2. Check barDrinksList if provided
  const rawName = String(item.name || item.dishName || "").trim().toLowerCase();
  const itemId = String(item.menuItemId ?? item.id ?? "");
  if (Array.isArray(barDrinksList) && barDrinksList.length > 0) {
    const inBarList = barDrinksList.some((d) => {
      const dId = String(d.id ?? d.menuItemId ?? "");
      const dName = String(d.name || d.dishName || "").trim().toLowerCase();
      return (itemId && dId && itemId === dId) || (rawName && dName && rawName === dName);
    });
    if (inBarList) return true;
  }

  // 3. Match against menuLookup
  if (menuLookup) {
    const menuItem = findMenuItem(menuLookup, item);
    if (menuItem) {
      if (menuItem.isBarDrink || menuItem.isBarItem || menuItem.drinkType || menuItem.alcoholPct != null || menuItem.servingMeasure) {
        return true;
      }
      const mCat = String(menuItem.category || menuItem.categoryName || "").trim();
      if (isBeverageCategory(mCat)) return true;
      if (KNOWN_FOOD_CATEGORIES.has(mCat.toLowerCase())) return false;
    }
  }

  // 4. Category check on item
  const rawCat = String(item.category || item.categoryName || item.dishCategory || "").trim();
  if (rawCat) {
    if (isBeverageCategory(rawCat)) return true;
    if (KNOWN_FOOD_CATEGORIES.has(rawCat.toLowerCase())) return false;
  }

  // 5. Name check
  if (DRINK_NAME_REGEX.test(rawName)) return true;

  return false;
}
