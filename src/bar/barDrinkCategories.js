export const BAR_CATEGORIES = Object.freeze([
  "Cocktails",
  "Cocktail Premixes",
  "Mocktails",
  "Mocktail Syrups",
  "Vodka",
  "Gin",
  "Rum",
  "Brandy",
  "Whiskey",
  "Scotch",
  "Tequila",
  "Mezcal",
  "Beer",
  "Cider",
  "Wine",
  "Champagne",
  "Liqueurs",
  "Bitters",
  "Shots",
  "Shooters",
  "Soft Drinks",
  "Tonic Water",
  "Soda Water",
  "Fresh Juices",
  "Fruit Purees",
  "Coffee",
  "Tea",
  "Iced Tea",
  "Milkshakes",
  "Smoothies",
  "Energy Drinks",
  "Sports Drinks",
  "Mineral Water",
  "Sparkling Water",
  "Lemonade",
  "Dairy Beverages",
  "Coconut Beverages",
  "Coconut Water",
  "Hot Chocolate",
  "Slushies",
  "Other Beverages",
]);

// Menu-only variety metadata. The current BarDrink API persists Category but has
// no Subcategory field, so this remains configuration data and does not alter payloads.
export const BAR_DRINK_SUBCATEGORIES = Object.freeze({
  Cocktails: ["Mojito", "Martini", "Margarita", "Daiquiri", "Sangria", "Other Cocktail"],
  "Cocktail Premixes": ["Margarita Mix", "Mojito Mix", "Sour Mix", "Other Cocktail Premix"],
  Mocktails: ["Virgin Mojito", "Fruit Punch", "Shirley Temple", "Other Mocktail"],
  "Mocktail Syrups": ["Fruit Syrup", "Flavoured Syrup", "Grenadine", "Mint Syrup"],
  Vodka: ["Premium Vodka", "Flavoured Vodka"],
  Gin: ["London Dry Gin", "Botanical Gin", "Flavoured Gin"],
  Rum: ["White Rum", "Dark Rum", "Spiced Rum", "Aged Rum"],
  Brandy: ["Cognac", "Fruit Brandy", "Armagnac"],
  Whiskey: ["Bourbon", "Rye Whiskey", "Irish Whiskey", "Blended Whiskey"],
  Scotch: ["Single Malt Scotch", "Blended Scotch"],
  Tequila: ["Blanco", "Reposado", "Añejo", "Extra Añejo"],
  Mezcal: ["Joven", "Reposado Mezcal", "Añejo Mezcal"],
  Beer: ["Lager", "Ale", "Stout", "Wheat Beer", "Craft Beer"],
  Cider: ["Apple Cider", "Pear Cider", "Fruit Cider"],
  Wine: ["Red Wine", "White Wine", "Rosé", "Dessert Wine"],
  Champagne: ["Brut", "Rosé Champagne", "Demi-Sec"],
  Liqueurs: ["Coffee Liqueur", "Orange Liqueur", "Cream Liqueur", "Herbal Liqueur"],
  Bitters: ["Aromatic Bitters", "Orange Bitters", "Chocolate Bitters"],
  Shots: ["Straight Shots", "Layered Shots", "Other Shots"],
  Shooters: ["Mixed Shooters", "Layered Shooters", "Other Shooters"],
  "Soft Drinks": ["Cola", "Lemon-Lime Soda", "Ginger Ale", "Root Beer"],
  "Tonic Water": ["Indian Tonic", "Light Tonic", "Flavoured Tonic"],
  "Soda Water": ["Club Soda", "Sparkling Mixer"],
  "Fresh Juices": ["Orange Juice", "Apple Juice", "Citrus Juice", "Mixed Fruit Juice"],
  "Fruit Purees": ["Mango Puree", "Passion Fruit Puree", "Berry Puree", "Citrus Puree"],
  Coffee: ["Espresso", "Cappuccino", "Latte", "Americano", "Cold Brew"],
  Tea: ["Black Tea", "Green Tea", "Herbal Tea", "Chai"],
  "Iced Tea": ["Black Iced Tea", "Green Iced Tea", "Flavoured Iced Tea"],
  Milkshakes: ["Chocolate", "Vanilla", "Strawberry", "Mango"],
  Smoothies: ["Fruit", "Berry", "Green", "Protein"],
  "Energy Drinks": ["Regular", "Sugar-Free"],
  "Sports Drinks": ["Electrolyte", "Isotonic", "Recovery"],
  "Mineral Water": ["Still Mineral Water", "Natural Mineral Water"],
  "Sparkling Water": ["Plain Sparkling Water", "Flavoured Sparkling Water"],
  Lemonade: ["Classic", "Mint", "Flavoured"],
  "Dairy Beverages": ["Milk", "Buttermilk", "Lassi", "Flavoured Milk"],
  "Coconut Beverages": ["Coconut Milk", "Coconut Cream", "Coconut Drink"],
  "Coconut Water": ["Tender Coconut Water", "Packaged Coconut Water"],
  "Hot Chocolate": ["Classic", "Dark Chocolate", "White Chocolate"],
  Slushies: ["Fruit Slushie", "Cola Slushie", "Lemon Slushie"],
  "Other Beverages": ["Other Beverage"],
});

const legacyDrinkCategories = {
  "beers": ["Beer"],
  "beers & ciders": ["Beer", "Cider"],
  "beer & cider": ["Beer", "Cider"],
  "vodka & gin": ["Vodka", "Gin"],
  "vodka and gin": ["Vodka", "Gin"],
  "rum & brandy": ["Rum", "Brandy"],
  "rum and brandy": ["Rum", "Brandy"],
  "whiskey & scotch": ["Whiskey", "Scotch"],
  "whisky & scotch": ["Whiskey", "Scotch"],
  "tequila & mezcal": ["Tequila", "Mezcal"],
  "tequila and mezcal": ["Tequila", "Mezcal"],
  "wine & champagne": ["Wine", "Champagne"],
  "wine and champagne": ["Wine", "Champagne"],
  "liqueurs & bitters": ["Liqueurs", "Bitters"],
  "cocktails & premixes": ["Cocktails", "Cocktail Premixes"],
  "cocktails and premixes": ["Cocktails", "Cocktail Premixes"],
  "mocktails & syrups": ["Mocktails", "Mocktail Syrups"],
  "mocktails and syrups": ["Mocktails", "Mocktail Syrups"],
  "soft drinks, tonics & soda": ["Soft Drinks", "Tonic Water", "Soda Water"],
  "soft drinks & soda": ["Soft Drinks", "Soda Water"],
  "juices & purees": ["Fresh Juices", "Fruit Purees"],
  "juices & shakes": ["Fresh Juices", "Milkshakes"],
  "juice & shakes": ["Fresh Juices", "Milkshakes"],
  "shots & shooters": ["Shots", "Shooters"],
  "water": ["Mineral Water", "Sparkling Water"],
  "waters": ["Mineral Water", "Sparkling Water"],
  "lemonades": ["Lemonade"],
  "coconut beverages": ["Coconut Beverages"],
  "tea & coffee": ["Tea", "Coffee"],
  "tea and coffee": ["Tea", "Coffee"],
};

const normalized = (value) => String(value ?? "").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").trim().toLocaleLowerCase();
const nameRules = [
  ["Gin", /\b(gin|juniper)\b/], ["Vodka", /\b(vodka)\b/],
  ["Brandy", /\b(brandy|cognac|armagnac)\b/], ["Rum", /\b(rum|rhum)\b/],
  ["Scotch", /\b(scotch|single malt|blended scotch)\b/], ["Whiskey", /\b(whisk(?:y|ey)|bourbon|rye|irish whiskey)\b/],
  ["Mezcal", /\b(mezcal)\b/], ["Tequila", /\b(tequila)\b/],
  ["Cider", /\b(cider)\b/], ["Beer", /\b(beer|lager|ale|stout|pilsner|ipa)\b/],
  ["Champagne", /\b(champagne)\b/], ["Wine", /\b(wine|prosecco|merlot|shiraz|cabernet)\b/],
  ["Bitters", /\b(bitters?)\b/], ["Liqueurs", /\b(liqueur|liquor|amaro|aperitif)\b/],
  ["Cocktail Premixes", /\b(premix|pre[ -]?mix|margarita mix|mojito mix|sour mix)\b/], ["Cocktails", /\b(cocktail|mojito|martini|margarita|daiquiri|sangria)\b/],
  ["Mocktail Syrups", /\b(syrup|syrups|cordial)\b/], ["Mocktails", /\b(mocktail|virgin)\b/],
  ["Tonic Water", /\b(tonic)\b/], ["Soda Water", /\b(soda water|club soda|seltzer)\b/],
  ["Soft Drinks", /\b(soft drink|cola|ginger ale|lemon[ -]?lime)\b/],
  ["Fruit Purees", /\b(puree|purée|concentrate)\b/], ["Fresh Juices", /\b(juice|juices|nectar)\b/],
  ["Coffee", /\b(coffee|espresso|cappuccino|latte|americano|mocha)\b/],
  ["Iced Tea", /\b(iced tea|cold tea)\b/], ["Tea", /\b(tea|chai|matcha)\b/],
  ["Milkshakes", /\b(milkshake|shake)\b/], ["Smoothies", /\b(smoothie)\b/],
  ["Energy Drinks", /\b(energy drink|red bull|monster energy)\b/], ["Sports Drinks", /\b(sports drink|electrolyte|isotonic)\b/],
  ["Sparkling Water", /\b(sparkling water|carbonated water|mineral sparkling)\b/], ["Mineral Water", /\b(mineral water|still water|water)\b/],
  ["Lemonade", /\b(lemonade|lemon soda)\b/], ["Coconut Water", /\b(coconut water|tender coconut)\b/],
  ["Dairy Beverages", /\b(milk|lassi|buttermilk|dairy)\b/], ["Hot Chocolate", /\b(hot chocolate|cocoa)\b/],
  ["Slushies", /\b(slush|slushie)\b/], ["Shooters", /\b(shooter)\b/], ["Shots", /\b(shot)\b/],
];

const aliasValue = (value, item = {}) => {
  const raw = String(value ?? "").trim();
  const candidates = legacyDrinkCategories[normalized(raw)];
  if (!candidates) return raw;
  const evidence = normalized([
    item?.name, item?.drinkName, item?.dishName, item?.subcategory,
    item?.drinkType, item?.description,
  ].filter(Boolean).join(" "));
  return candidates.find((candidate) => nameRules.some(([name, rule]) => name === candidate && rule.test(evidence))) || candidates[0];
};

export function normalizeBarDrinkCategory(category, item = {}) {
  const mapped = aliasValue(category, item);
  const standard = BAR_CATEGORIES.find((entry) => normalized(entry) === normalized(mapped));
  return standard || String(mapped || "").trim();
}

const nonCategoryValues = new Set([
  "all", "all categories", "all category", "all items", "category", "categories", "select category", "__custom__",
  "beverage", "beverages", "alcohol", "alcoholic", "alcoholic beverages", "non-alcoholic beverages",
  "hot beverage", "cold beverage", "spirits", "food", "mixers & premixes", "syrups & ingredients",
  "garnishes", "bar supplies", "bar consumables",
]);

const categoryValue = (value) => {
  if (typeof value === "string" || typeof value === "number") return String(value).trim();
  if (!value || typeof value !== "object") return "";
  return String(value.name ?? value.category ?? value.categoryName ?? value.category_name ?? "").trim();
};

/** Standard, API, and saved custom drink categories, deduplicated without exposing legacy combined labels. */
export function mergeBarDrinkCategories(apiCategories = [], drinks = []) {
  const unique = new Map();
  const add = (entry, item = {}) => {
    const rawValue = categoryValue(entry);
    const value = normalizeBarDrinkCategory(rawValue, item);
    const key = normalized(value);
    if (!value || nonCategoryValues.has(key) || unique.has(key)) return;
    unique.set(key, { value, label: value });
  };

  BAR_CATEGORIES.forEach((category) => add(category));
  (Array.isArray(apiCategories) ? apiCategories : []).forEach((category) => add(category));
  (Array.isArray(drinks) ? drinks : []).forEach((drink) => {
    add(drink?.category ?? drink?.categoryName ?? drink?.category_name, drink);
  });
  return Array.from(unique.values());
}
