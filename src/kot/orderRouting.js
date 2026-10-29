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
