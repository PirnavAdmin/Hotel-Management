const categoryRows = [
  ["Vodka", "Alcoholic Beverages", ["Premium Vodka", "Flavoured Vodka"], "Bottle (750 ml)", 40],
  ["Gin", "Alcoholic Beverages", ["London Dry Gin", "Botanical Gin", "Flavoured Gin"], "Bottle (750 ml)", 40],
  ["Rum", "Alcoholic Beverages", ["White Rum", "Dark Rum", "Spiced Rum", "Aged Rum"], "Bottle (750 ml)", 40],
  ["Brandy", "Alcoholic Beverages", ["Cognac", "Fruit Brandy", "Armagnac"], "Bottle (750 ml)", 40],
  ["Whiskey", "Alcoholic Beverages", ["Bourbon", "Rye Whiskey", "Irish Whiskey", "Blended Whiskey"], "Bottle (750 ml)", 42],
  ["Scotch", "Alcoholic Beverages", ["Single Malt Scotch", "Blended Scotch"], "Bottle (750 ml)", 42],
  ["Tequila", "Alcoholic Beverages", ["Blanco", "Reposado", "Añejo", "Extra Añejo"], "Bottle (750 ml)", 38],
  ["Mezcal", "Alcoholic Beverages", ["Joven", "Reposado Mezcal", "Añejo Mezcal"], "Bottle (750 ml)", 40],
  ["Beer", "Alcoholic Beverages", ["Lager", "Ale", "Stout", "Wheat Beer", "Craft Beer"], "Bottle (330 ml)", 5],
  ["Cider", "Alcoholic Beverages", ["Apple Cider", "Pear Cider", "Fruit Cider"], "Bottle (330 ml)", 5],
  ["Wine", "Alcoholic Beverages", ["Red Wine", "White Wine", "Rosé", "Dessert Wine"], "Bottle (750 ml)", 13],
  ["Champagne", "Alcoholic Beverages", ["Brut Champagne", "Rosé Champagne", "Demi-Sec Champagne"], "Bottle (750 ml)", 12],
  ["Liqueurs", "Alcoholic Beverages", ["Coffee Liqueur", "Orange Liqueur", "Cream Liqueur", "Herbal Liqueur"], "Bottle (750 ml)", 25],
  ["Bitters", "Alcoholic Beverages", ["Aromatic Bitters", "Orange Bitters", "Chocolate Bitters"], "Bottle (200 ml)", 40],
  ["Cocktails", "Alcoholic Beverages", ["Mojito", "Martini", "Margarita", "Daiquiri", "Other Cocktail"], "Bottle (750 ml)", 12],
  ["Cocktail Premixes", "Mixers & Premixes", ["Margarita Mix", "Mojito Mix", "Sour Mix", "Ready-to-Drink Cocktail Premix"], "Bottle (1 L)", 0],
  ["Mixers", "Mixers & Premixes", ["Cocktail Mixer", "Tonic Mixer", "Soda Mixer", "Other Mixer"], "Bottle (1 L)", 0],
  ["Ingredients", "Syrups & Ingredients", ["Citrus", "Herbs", "Spices", "Other Bar Ingredient"], "Pack / Case", 0],
  ["Syrups", "Syrups & Ingredients", ["Simple Syrup", "Flavoured Syrup", "Grenadine", "Orgeat"], "Bottle (1 L)", 0],
  ["Purees", "Syrups & Ingredients", ["Fruit Puree", "Vegetable Puree", "Citrus Puree", "Other Puree"], "Bottle (1 L)", 0],
  ["Mocktails", "Non-alcoholic Beverages", ["Virgin Mojito", "Fruit Punch", "Shirley Temple", "Other Mocktail"], "Bottle (1 L)", 0],
  ["Mocktail Syrups", "Syrups & Ingredients", ["Fruit Syrups", "Flavoured Syrups", "Grenadine", "Mint Syrup"], "Bottle (1 L)", 0],
  ["Soft Drinks", "Non-alcoholic Beverages", ["Cola", "Lemon-Lime Soda", "Ginger Ale", "Root Beer"], "Can (330 ml)", 0],
  ["Tonic Water", "Mixers & Premixes", ["Indian Tonic", "Light Tonic", "Flavoured Tonic"], "Bottle (200 ml)", 0],
  ["Soda Water", "Mixers & Premixes", ["Club Soda", "Soda Water", "Sparkling Mixer"], "Bottle (200 ml)", 0],
  ["Fresh Juices", "Non-alcoholic Beverages", ["Orange Juice", "Apple Juice", "Citrus Juice", "Mixed Fruit Juice"], "Tetra Pack (1 L)", 0],
  ["Fruit Purees", "Syrups & Ingredients", ["Mango Puree", "Passion Fruit Puree", "Berry Puree", "Citrus Puree"], "Bottle (1 L)", 0],
  ["Coffee", "Non-alcoholic Beverages", ["Espresso", "Cappuccino", "Latte", "Americano", "Cold Brew"], "Pack / Case", 0],
  ["Tea", "Non-alcoholic Beverages", ["Black Tea", "Green Tea", "Herbal Tea", "Chai", "Iced Tea"], "Pack / Case", 0],
  ["Milkshakes", "Non-alcoholic Beverages", ["Chocolate Milkshake", "Vanilla Milkshake", "Strawberry Milkshake", "Mango Milkshake"], "Bottle (1 L)", 0],
  ["Smoothies", "Non-alcoholic Beverages", ["Fruit Smoothie", "Berry Smoothie", "Green Smoothie", "Protein Smoothie"], "Bottle (1 L)", 0],
  ["Energy Drinks", "Non-alcoholic Beverages", ["Standard Energy Drink", "Sugar-free Energy Drink"], "Can (250 ml)", 0],
  ["Sports Drinks", "Non-alcoholic Beverages", ["Electrolyte Drink", "Isotonic Drink", "Recovery Drink"], "Bottle (500 ml)", 0],
  ["Mineral Water", "Non-alcoholic Beverages", ["Still Mineral Water", "Natural Mineral Water"], "Bottle (1 L)", 0],
  ["Sparkling Water", "Non-alcoholic Beverages", ["Plain Sparkling Water", "Flavoured Sparkling Water"], "Bottle (750 ml)", 0],
  ["Lemonade", "Non-alcoholic Beverages", ["Classic Lemonade", "Mint Lemonade", "Flavoured Lemonade"], "Bottle (1 L)", 0],
  ["Dairy Beverages", "Non-alcoholic Beverages", ["Milk", "Buttermilk", "Lassi", "Flavoured Milk"], "Bottle (1 L)", 0],
  ["Coconut Water", "Non-alcoholic Beverages", ["Tender Coconut Water", "Packaged Coconut Water"], "Bottle (500 ml)", 0],
  ["Coconut Beverages", "Non-alcoholic Beverages", ["Coconut Milk", "Coconut Cream", "Coconut Drink"], "Bottle (1 L)", 0],
  ["Hot Chocolate", "Non-alcoholic Beverages", ["Classic Hot Chocolate", "Dark Chocolate", "White Hot Chocolate"], "Pack / Case", 0],
  ["Slushies", "Non-alcoholic Beverages", ["Fruit Slushie", "Cola Slushie", "Lemon Slushie"], "Bottle (1 L)", 0],
  ["Bar Garnishes", "Garnishes", ["Mint Leaves", "Lemon", "Lime", "Orange Slices", "Cocktail Cherries", "Olives"], "Jar / Canister", 0],
  ["Bar Supplies", "Bar Supplies", ["Rim Salt", "Bar Sugar", "Mixing Ingredients", "Cleaning Supplies"], "Pack / Case", 0],
  ["Ice", "Ice", ["Ice Cubes", "Crushed Ice", "Clear Ice Blocks"], "Pack / Case", 0],
  ["Bar Consumables", "Bar Consumables", ["Straws", "Napkins", "Stirring Sticks", "Coasters", "Cocktail Picks"], "Pack / Case", 0],
  ["Other Bar Stock", "Other Bar Stock", [], "Bottle (750 ml)", 0],
];

export const BAR_INVENTORY_CATEGORIES = Object.freeze(categoryRows.map(([category, group, subcategories, defaultUnit, defaultAbv]) => Object.freeze({
  category,
  group,
  subcategories: Object.freeze(subcategories),
  defaultUnit,
  defaultAbv,
})));

const categoryByKey = new Map(BAR_INVENTORY_CATEGORIES.map(({ category }) => [category.toLocaleLowerCase(), category]));
const legacyInventoryCategories = {
  "whiskey & scotch": ["Whiskey", "Scotch"],
  "vodka & gin": ["Vodka", "Gin"],
  "rum & brandy": ["Rum", "Brandy"],
  "tequila & mezcal": ["Tequila", "Mezcal"],
  "beers & ciders": ["Beer", "Cider"],
  "wine & champagne": ["Wine", "Champagne"],
  "liqueurs & bitters": ["Liqueurs", "Bitters"],
  "cocktails & premixes": ["Cocktails", "Cocktail Premixes"],
  "mocktails & syrups": ["Mocktails", "Mocktail Syrups"],
  "soft drinks, tonics & soda": ["Soft Drinks", "Tonic Water", "Soda Water"],
  "soft drinks & soda": ["Soft Drinks", "Soda Water"],
  "juices & shakes": ["Fresh Juices", "Milkshakes"],
  "juice & shakes": ["Fresh Juices", "Milkshakes"],
  "tea & coffee": ["Tea", "Coffee"],
  "tea and coffee": ["Tea", "Coffee"],
  "juices & purees": ["Fresh Juices", "Fruit Purees"],
  "bar garnishes & supplies": ["Bar Garnishes", "Bar Supplies"],
  "bar consumables & ice": ["Bar Consumables", "Ice"],
};

const inferenceRules = [
  ["Vodka", /\bvodka\b/], ["Gin", /\bgin\b/], ["Scotch", /\bscotch\b/], ["Whiskey", /\bwhisk(?:y|ey)|bourbon|rye\b/],
  ["Brandy", /\bbrandy|cognac|armagnac\b/], ["Rum", /\brum\b/], ["Mezcal", /\bmezcal\b/], ["Tequila", /\btequila\b/],
  ["Cider", /\bcider\b/], ["Beer", /\bbeer|lager|ale|stout|pilsner|ipa\b/], ["Champagne", /\bchampagne\b/], ["Wine", /\bwine|prosecco|merlot|shiraz\b/],
  ["Bitters", /\bbitters?\b/], ["Liqueurs", /\bliqu(?:eur|or)|amaro\b/],
  ["Cocktail Premixes", /\bpremix|pre[ -]?mix|margarita mix|sour mix\b/], ["Cocktails", /\bcocktail|mojito|martini|margarita\b/],
  ["Mocktail Syrups", /\bsyrup|cordial\b/], ["Mocktails", /\bmocktail|virgin\b/],
  ["Tonic Water", /\btonic\b/], ["Soda Water", /\bsoda water|club soda\b/], ["Soft Drinks", /\bsoft drink|cola|ginger ale\b/],
  ["Fruit Purees", /\bpuree|purée|concentrate\b/], ["Fresh Juices", /\bjuice|nectar\b/],
  ["Bar Garnishes", /\bmint|lemon|lime|orange slice|cherr|olive|garnish\b/], ["Bar Supplies", /\bsuppl|rim salt|bar sugar\b/],
  ["Ice", /\bice|cube\b/], ["Bar Consumables", /\bstraw|napkin|stirring stick|coaster|pick\b/],
];

export function isLegacyBarInventoryCategory(category) {
  return Object.hasOwn(legacyInventoryCategories, String(category ?? "").trim().toLocaleLowerCase());
}

/** Resolve old combined labels using item metadata. This is a display/edit mapping; it does not mutate stored rows. */
export function normalizeBarInventoryCategory(category, item = {}) {
  const raw = String(category ?? "").trim();
  const canonical = categoryByKey.get(raw.toLocaleLowerCase());
  if (canonical) return canonical;
  const candidates = legacyInventoryCategories[raw.toLocaleLowerCase()];
  if (!candidates) return raw;
  const evidence = [item?.name, item?.subcategory, item?.brand, item?.unit].filter(Boolean).join(" ").toLocaleLowerCase();
  return candidates.find((candidate) => inferenceRules.some(([target, pattern]) => target === candidate && pattern.test(evidence))) || candidates[0];
}
