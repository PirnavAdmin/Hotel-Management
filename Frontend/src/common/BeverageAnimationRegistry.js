const normalized = (value) => String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const matches = (value, expression) => expression.test(value);

const animationRules = [
  ["soft-drink", /\b(root beer)\b/],
  ["beer", /\b(beers?|lager|ale|stout|wheat beer|craft beer|pilsner|ipa|porter)\b/],
  ["shot", /\b(shots?|shooters?|tequila shot|vodka shot|lemon shot|jagermeister|jaegermeister)\b/],
  ["mocktail", /\b(mocktails?|virgin mojito|virgin pina colada|blue lagoon|fruit punch|shirley temple)\b/],
  ["mojito", /\b(mojitos?|mint cooler)\b/],
  ["lemonade", /\b(lemonades?|lemon soda|mint lemonade|strawberry lemonade|blue lemonade)\b/],
  ["cocktail", /\b(cocktails?|martinis?|margaritas?|cosmopolitans?|daiquiris?|sangrias?|old fashioned|pina colada|bloody mary|long island iced tea|gin and tonic|spritz|mimosa)\b/],
  ["iced-tea", /\b(iced teas?|cold teas?)\b/],
  ["cold-coffee", /\b(cold coffee|iced coffee|frappe|frappuccino)\b/],
  ["hot-chocolate", /\b(hot chocolates?|chocolate mocha|white hot chocolate)\b/],
  ["coffee", /\b(coffee|espresso|americano|cappuccino|latte|mocha|macchiato)\b/],
  ["tea", /\b(teas?|chai|masala chai|black tea|green tea|herbal tea|lemon tea|oolong|matcha)\b/],
  ["milkshake", /\b(milkshakes?|shake|chocolate shake|vanilla shake|strawberry shake|oreo shake|mango shake|banana shake|butterscotch shake)\b/],
  ["smoothie", /\b(smoothies?|protein smoothie|green smoothie|berry smoothie|banana smoothie|mango smoothie|strawberry smoothie)\b/],
  ["energy", /\b(energy drinks?|energy beverage|energy drink)\b/],
  ["sports", /\b(sports drinks?|electrolyte drinks?|isotonic drinks?|sports hydration)\b/],
  ["wine", /\b(wines?|red wine|white wine|rose|sparkling wine|champagne|prosecco|merlot|shiraz|cabernet|pinot|chardonnay|sauvignon)\b/],
  ["vodka-gin", /\b(vodkas?|gin|dry gin|flavou?red vodka|gin and tonic)\b/],
  ["whiskey", /\b(whisk(?:y|ey)|scotch|bourbon|rye whiskey|irish whiskey|single malt|blended whiskey)\b/],
  ["rum-brandy", /\b(rums?|brandy|cognac|white rum|dark rum|spiced rum)\b/],
  ["water", /\b(waters?|mineral water|still water|sparkling water|flavou?red water|seltzer)\b/],
  ["juice", /\b(juices?|orange juice|apple juice|mango juice|pineapple juice|watermelon juice|grape juice|pomegranate juice|mixed fruit juice|fruit punch)\b/],
  ["dairy", /\b(dairy beverages?|milk|buttermilk|lassi|sweet lassi|salted lassi|flavou?red milk)\b/],
  ["coconut", /\b(coconut beverages?|tender coconut|coconut water|coconut milk|coconut shake)\b/],
  ["slushie", /\b(slushies?|slush|blue slush|strawberry slush|mango slush|mixed fruit slush)\b/],
];

const categoryRules = [
  ["beer", /\b(beers?|lager|ale|stout|wheat beer|craft beer|pilsner|ipa|porter)\b/],
  ["shot", /\b(shots?|shooters?)\b/],
  ["mocktail", /\b(mocktails?)\b/],
  ["cocktail", /\b(cocktails?)\b/],
  ["wine", /\b(wines?|champagne|prosecco)\b/],
  ["whiskey", /\b(whisk(?:y|ey)|scotch|bourbon)\b/],
  ["vodka-gin", /\b(vodka|gin)\b/],
  ["rum-brandy", /\b(rum|brandy|cognac)\b/],
  ["coffee", /\b(coffee|espresso)\b/],
  ["iced-tea", /\b(iced tea)\b/],
  ["tea", /\b(tea|chai)\b/],
  ["soft-drink", /\b(soft drinks?|soda|cola|tonic|ginger ale)\b/],
  ["juice", /\b(juices?|fresh juice)\b/],
  ["milkshake", /\b(milkshakes?|shakes?)\b/],
  ["smoothie", /\b(smoothies?)\b/],
  ["energy", /\b(energy drinks?)\b/],
  ["sports", /\b(sports drinks?|electrolyte|isotonic)\b/],
  ["water", /\b(waters?|mineral water)\b/],
  ["lemonade", /\b(lemonades?)\b/],
  ["dairy", /\b(dairy beverages?|milk|buttermilk|lassi)\b/],
  ["coconut", /\b(coconut beverages?|coconut)\b/],
  ["iced-tea", /\b(iced tea)\b/],
  ["hot-chocolate", /\b(hot chocolate)\b/],
  ["slushie", /\b(slushies?|slush)\b/],
];

/** Selects visuals by specific drink name first, then category, then beverage metadata. */
export function selectBeverageAnimation(item = {}) {
  const safeItem = item && typeof item === "object" ? item : {};
  const name = normalized(safeItem.name ?? safeItem.drinkName ?? safeItem.dishName ?? safeItem.dish_name);
  const category = normalized(safeItem.category ?? safeItem.categoryName ?? safeItem.category_name ?? safeItem.beverageCategory);
  const otherMetadata = normalized([
    safeItem.subCategory, safeItem.subcategory, safeItem.drinkType, safeItem.drink_type,
    safeItem.beverageType, safeItem.type, safeItem.description,
  ].filter(Boolean).join(" "));

  const byName = animationRules.find(([, expression]) => matches(name, expression));
  if (byName) return byName[0];
  const byCategory = categoryRules.find(([, expression]) => matches(category, expression));
  if (byCategory) return byCategory[0];
  const byMetadata = animationRules.find(([, expression]) => matches(otherMetadata, expression));
  if (byMetadata) return byMetadata[0];

  if (Number(safeItem.alcoholPct ?? safeItem.alcohol_pct ?? safeItem.abv ?? 0) > 0 || /\balcohol(?:ic)?\b/.test(normalized(safeItem.drinkType ?? safeItem.drink_type))) return "spirits";
  return "generic";
}

export const BEVERAGE_ANIMATION_REGISTRY = Object.freeze({
  beer: "beer",
  shot: "shots and shooters",
  mocktail: "mocktail",
  mojito: "mojito cocktail",
  cocktail: "cocktail",
  lemonade: "lemonade",
  "iced-tea": "iced tea",
  "cold-coffee": "cold coffee",
  "hot-chocolate": "hot chocolate",
  coffee: "coffee",
  tea: "tea",
  milkshake: "milkshake",
  smoothie: "smoothie",
  energy: "energy drink",
  sports: "sports drink",
  wine: "wine and champagne",
  "vodka-gin": "vodka and gin",
  whiskey: "whiskey",
  "rum-brandy": "rum and brandy",
  water: "water",
  juice: "fresh juice",
  dairy: "dairy beverage",
  coconut: "coconut beverage",
  slushie: "slushie",
  spirits: "spirits fallback",
  generic: "generic beverage",
});
