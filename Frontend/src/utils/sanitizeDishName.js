import { MENU_ITEMS } from "../data/menuData";

const menuItemsMap = new Map();
MENU_ITEMS.forEach((item) => {
  menuItemsMap.set(item.name.toLowerCase().trim(), item);
});

const EXACT_LEGACY_MAP = {
  "hyderabadi chicken dum biryani": "Chilli Chicken Pizza (10\")",
  "chicken dum biryani": "Chilli Chicken Pizza (8\")",
  "royal mango lassi": "Cold Coffee",
  "mango lassi": "Cold Coffee",
  "royal mutton dum biryani": "Chicken Ghee Roast Pizza (10\")",
  "special boneless chicken biryani": "Andhra Pepper Chicken Pizza (10\")",
  "crispy chicken 65": "Popcorn Chicken",
  "chicken 65": "Popcorn Chicken",
  "chicken 65 biryani": "Chicken 65 Pizza (10\")",
  "paneer butter masala": "Chilli Paneer Pizza (10\")",
  "kaju paneer curry": "Paneer Pesto Pizza (10\")",
  "butter chicken": "Chicken Ghee Roast Pizza (8\")",
  "butter naan": "Garlic Bread With Cheese",
  "tandoori roti": "Garlic Bread Without Cheese",
  "roti": "Garlic Bread Without Cheese",
  "naan": "Garlic Bread With Cheese",
  "andhra mutton curry": "Mutton Kheema Pizza (10\")",
  "mutton biryani": "Mutton Kheema Pizza (8\")",
  "bagara with mutton": "Bagara Rice with Gongura Chicken",
  "crispy corn salt & pepper": "Crispy Fries",
  "crispy corn": "Crispy Fries",
  "brownie with ice cream": "Tiramisu Tub",
  "chocolate milkshake": "Signature Hot Chocolate",
  "order item": "Margherita Pizza (10\")",
  "chicken pizza": "Chilli Chicken Pizza (8\")",
  "pizza veg": "Margherita Pizza (8\")",
  "beers": "Berry Cold Brew",
  "beer": "Cold Brew",
  "coffee": "Cappuccino",
  "tea": "Classic Peach Iced Tea",
  "vodka": "Mint Mojito",
  "mojito": "Mint Mojito",
  "cocktail": "Passionfruit Mojito",
  "mocktail": "Strawberry Lemonade",
};

export function sanitizeDishName(rawName) {
  if (!rawName || typeof rawName !== "string") return "Chilli Chicken Pizza (8\")";
  const trimmed = rawName.trim();
  const lower = trimmed.toLowerCase();

  // If already matches a real restaurant menu item exactly, keep it!
  const directMatch = menuItemsMap.get(lower);
  if (directMatch) return directMatch.name;

  // Check exact legacy map
  if (EXACT_LEGACY_MAP[lower]) {
    return EXACT_LEGACY_MAP[lower];
  }

  // Check fuzzy or substring
  if (lower.includes("mango lassi") || lower.includes("lassi")) return "Cold Coffee";
  if (lower.includes("hyderabadi chicken")) return "Chilli Chicken Pizza (10\")";
  if (lower.includes("mutton dum biryani") || lower.includes("mutton biryani")) return "Chicken Ghee Roast Pizza (10\")";
  if (lower.includes("chicken 65")) return "Chicken 65 Pizza (10\")";
  if (lower.includes("boneless chicken")) return "Andhra Pepper Chicken Pizza (10\")";
  if (lower.includes("paneer butter")) return "Chilli Paneer Pizza (10\")";
  if (lower.includes("butter naan") || lower.includes("naan")) return "Garlic Bread With Cheese";
  if (lower.includes("roti")) return "Garlic Bread Without Cheese";
  if (lower.includes("crispy chicken") || lower.includes("chicken wings")) return "Chicken Wings";
  if (lower.includes("crispy corn") || lower.includes("french fries") || lower.includes("fries")) return "Peri-Peri Fries";
  if (lower.includes("milkshake") || lower.includes("chocolate")) return "Signature Hot Chocolate";
  if (lower.includes("brownie") || lower.includes("ice cream")) return "Tiramisu Tub";
  if (lower.includes("beer") || lower.includes("whiskey") || lower.includes("rum") || lower.includes("vodka")) return "Berry Cold Brew";
  if (lower.includes("mojito")) return "Mint Mojito";
  if (lower.includes("coffee") || lower.includes("cappuccino") || lower.includes("latte")) return "Cold Coffee";

  // If it contains "pizza", default to Margherita
  if (lower.includes("pizza")) return "Margherita Pizza (10\")";

  // Check partial match against all current menu items
  const partial = MENU_ITEMS.find((m) => lower.includes(m.name.toLowerCase()) || m.name.toLowerCase().includes(lower));
  if (partial) return partial.name;

  return "Margherita Pizza (10\")";
}
