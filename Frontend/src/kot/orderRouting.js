const BEVERAGE_CATEGORY = /(beverage|drink|mocktail|cocktail|beer|wine|whisky|whiskey|rum|vodka|gin|soft drink|juice|water|mixer|champagne|brandy|tequila|liqueur)/i;

export function isBeverageCategory(category) {
  return BEVERAGE_CATEGORY.test(String(category ?? ""));
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
