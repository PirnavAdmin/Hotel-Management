// Neutral image used only when a menu item has no associated image or its
// stored image cannot be loaded. Dish photos are never inferred from names.
export const MENU_ITEM_IMAGE_PLACEHOLDER = "/assets/dishes/default.svg";

export const LOCAL_IMAGE_PRESETS = [
  { id: "chicken-biryani", label: "Chicken Biryani", path: "/assets/chicken-dum-biryani.jpg", icon: "🍗" },
  { id: "mutton-biryani", label: "Mutton Biryani", path: "/assets/biryani/mutton-biryani.jpg", icon: "🍖" },
  { id: "prawns-biryani", label: "Spicy Prawns Biryani", path: "/assets/biryani/prawns-biryani.jpg", icon: "🍤" },
  { id: "veg-biryani", label: "Veg Biryani", path: "/assets/veg-dum-biryani.jpg", icon: "🍚" },
  { id: "crispy-corn", label: "Crispy Corn Salt & Pepper", path: "/assets/starters/crispy-corn.jpg", icon: "🌽" },
  { id: "apollo-fish", label: "Apollo Fish Fry", path: "/assets/starters/apollo-fish.jpg", icon: "🐟" },
  { id: "tandoori-chicken", label: "Tandoori Chicken", path: "/assets/starters/tandoori-chicken.jpg", icon: "🍗" },
  { id: "murgh-malai-kebab", label: "Murgh Malai Kebab", path: "/assets/starters/murgh-malai-kebab.jpg", icon: "🍢" },
  { id: "mutton-seekh-kebab", label: "Mutton Seekh Kebab", path: "/assets/starters/mutton-seekh-kebab.jpg", icon: "🍢" },
  { id: "paneer-tikka", label: "Paneer Tikka", path: "/assets/starters/paneer-tikka.jpg", icon: "🧀" },
  { id: "kadai-chicken", label: "Kadai Chicken Masala", path: "/assets/curries/kadai-chicken.jpg", icon: "🥘" },
  { id: "cheese-garlic-naan", label: "Cheese Garlic Naan", path: "/assets/breads/cheese-garlic-naan.jpg", icon: "🫓" },
  { id: "tandoori-roti", label: "Tandoori Roti (Butter)", path: "/assets/breads/tandoori-roti.jpg", icon: "🫓" },
  { id: "sweet-lassi", label: "Sweet Punjabi Lassi", path: "/assets/beverages/sweet-lassi.jpg", icon: "🥛" },
  { id: "chaas", label: "Spiced Buttermilk (Chaas)", path: "/assets/beverages/buttermilk.jpg", icon: "🥛" },
  { id: "chocolate-shake", label: "Chocolate Milkshake", path: "/assets/beverages/chocolate-milkshake.jpg", icon: "🥤" },
  { id: "watermelon-juice", label: "Watermelon Juice", path: "/assets/beverages/watermelon-juice.jpg", icon: "🍉" },
  { id: "rabdi-gulab-jamun", label: "Gulab Jamun with Rabdi", path: "/assets/desserts/rabdi-gulab-jamun.jpg", icon: "🍨" },
  { id: "gulab-jamun", label: "Gulab Jamun", path: "/assets/desserts/gulab-jamun.jpg", icon: "🧆" },
  { id: "pizza", label: "Pizza", path: "/assets/fast-food/pizza.jpg", icon: "🍕" },
  { id: "burger", label: "Burger", path: "/assets/fast-food/burger.jpg", icon: "🍔" },
  { id: "fries", label: "French Fries", path: "/assets/fast-food/french-fries.jpg", icon: "🍟" },
  { id: "pasta", label: "Pasta", path: "/assets/fast-food/pasta.jpg", icon: "🍝" },
  { id: "salad", label: "Salad", path: "/assets/starters/salad.jpg", icon: "🥗" },
  { id: "icecream", label: "Ice Cream", path: "/assets/desserts/ice-cream.jpg", icon: "🍨" },
  { id: "coffee", label: "Coffee", path: "/assets/beverages/coffee.jpg", icon: "☕" },
  { id: "pancakes", label: "Pancakes", path: "/assets/desserts/pancakes.jpg", icon: "🥞" },
  { id: "cake", label: "Cake", path: "/assets/desserts/cake.jpg", icon: "🍰" },
  { id: "butter-chicken", label: "Butter Chicken", path: "/assets/curries/butter-chicken.jpg", icon: "🍲" },
  { id: "paneer-butter", label: "Paneer Butter Masala", path: "/assets/curries/paneer-butter-masala.jpg", icon: "🧀" },
  { id: "naan", label: "Butter Naan", path: "/assets/breads/butter-naan.jpg", icon: "🫓" },
  { id: "lassi", label: "Mango Lassi", path: "/assets/beverages/mango-lassi.jpg", icon: "🥤" },
  { id: "dosa", label: "Masala Dosa", path: "/assets/south-indian/masala-dosa.jpg", icon: "🥘" },
  { id: "chinese", label: "Fried Rice / Chinese", path: "/assets/chinese/fried-rice.jpg", icon: "🥡" },
];

// Compatibility helper for callers that need a fallback image. It deliberately
// does not infer a dish photo from the item name or category.
export function getRelevantLocalFallback() {
  return MENU_ITEM_IMAGE_PLACEHOLDER;
}

export const ASSET_VERSION = "20261015-v4";

export function withAssetVersion(url) {
  if (typeof url === "string" && url.startsWith("/assets/")) {
    const base = url.split("?")[0];
    return `${base}?v=${ASSET_VERSION}`;
  }
  return url;
}

/** Returns the item's stored image reference, or the neutral placeholder. */
export function getMenuItemImage(item = {}) {
  const image = [item.imageUrl, item.image_url, item.image, item.ImageUrl].find(
    (value) => typeof value === "string" && value.trim().length > 0,
  );
  return withAssetVersion(image ? image.trim() : MENU_ITEM_IMAGE_PLACEHOLDER);
}

/** Replaces a broken image with the neutral placeholder without retrying. */
export function handleDishImageError(event) {
  const fallback = withAssetVersion(MENU_ITEM_IMAGE_PLACEHOLDER);
  event.target.onerror = null;
  if (event.target.src !== fallback && !event.target.src.endsWith(fallback)) {
    event.target.src = fallback;
  }
}
