// Local Menu Image Helper
// Ensures every menu item uses real, local .jpg assets saved in the assets folder
// matching the exact structure: biryani/, starters/, curries/, breads/, fast-food/, desserts/, beverages/, etc.

export const LOCAL_DISH_IMAGES = {
  biryani: "/assets/chicken-dum-biryani.jpg",
  crispyCorn: "/assets/starters/crispy-corn.jpg",
  prawnsBiryani: "/assets/biryani/prawns-biryani.jpg",
  apolloFish: "/assets/starters/apollo-fish.jpg",
  tandooriChicken: "/assets/starters/tandoori-chicken.jpg",
  murghMalaiKebab: "/assets/starters/murgh-malai-kebab.jpg",
  muttonSeekhKebab: "/assets/starters/mutton-seekh-kebab.jpg",
  kadaiChicken: "/assets/curries/kadai-chicken.jpg",
  cheeseGarlicNaan: "/assets/breads/cheese-garlic-naan.jpg",
  tandooriRoti: "/assets/breads/tandoori-roti.jpg",
  sweetLassi: "/assets/beverages/sweet-lassi.jpg",
  chaas: "/assets/beverages/buttermilk.jpg",
  rabdiGulabJamun: "/assets/desserts/rabdi-gulab-jamun.jpg",
  gulabJamun: "/assets/desserts/gulab-jamun.jpg",
  chocolateMilkshake: "/assets/beverages/chocolate-milkshake.jpg",
  watermelonJuice: "/assets/beverages/watermelon-juice.jpg",
  paneerTikka: "/assets/starters/paneer-tikka.jpg",
  muttonBiryani: "/assets/biryani/mutton-biryani.jpg",
  vegBiryani: "/assets/veg-dum-biryani.jpg",
  pizza: "/assets/fast-food/pizza.jpg",
  burger: "/assets/fast-food/burger.jpg",
  fries: "/assets/fast-food/french-fries.jpg",
  pasta: "/assets/fast-food/pasta.jpg",
  salad: "/assets/starters/salad.jpg",
  icecream: "/assets/desserts/ice-cream.jpg",
  coffee: "/assets/beverages/coffee.jpg",
  pancakes: "/assets/desserts/pancakes.jpg",
  cake: "/assets/desserts/cake.jpg",
  starters: "/assets/starters/chicken-65.jpg",
  tandoori: "/assets/starters/tandoori-chicken.jpg",
  curry: "/assets/curries/butter-chicken.jpg",
  breads: "/assets/breads/butter-naan.jpg",
  beverages: "/assets/beverages/mango-lassi.jpg",
  desserts: "/assets/desserts/gulab-jamun.jpg",
  southIndian: "/assets/south-indian/masala-dosa.jpg",
  chinese: "/assets/chinese/fried-rice.jpg",
  default: "/assets/chicken-dum-biryani.jpg",
};

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

/**
 * Returns a relevant local .jpg image for a dish based on its name and category
 */
export function getRelevantLocalFallback(item = {}) {
  const name = String(item.name || "").toLowerCase();
  const cat = String(item.category || "").toLowerCase();

  // Exact dish name checks first
  if (name.includes("chocolate") && (name.includes("shake") || name.includes("milkshake"))) return LOCAL_DISH_IMAGES.chocolateMilkshake;
  if (name.includes("watermelon")) return LOCAL_DISH_IMAGES.watermelonJuice;
  if (name.includes("mutton") && name.includes("biryani")) return LOCAL_DISH_IMAGES.muttonBiryani;
  if (name.includes("prawn")) return LOCAL_DISH_IMAGES.prawnsBiryani;
  if (name.includes("apollo") || (name.includes("fish") && name.includes("fry"))) return LOCAL_DISH_IMAGES.apolloFish;
  if (name.includes("malai") && (name.includes("kebab") || name.includes("tikka") || name.includes("murgh"))) return LOCAL_DISH_IMAGES.murghMalaiKebab;
  if (name.includes("seekh")) return LOCAL_DISH_IMAGES.muttonSeekhKebab;
  if (name.includes("tandoori chicken")) return LOCAL_DISH_IMAGES.tandooriChicken;
  if (name.includes("paneer tikka") && !name.includes("biryani")) return LOCAL_DISH_IMAGES.paneerTikka;
  if (name.includes("kadai") || name.includes("kadhai")) return LOCAL_DISH_IMAGES.kadaiChicken;
  if (name.includes("cheese") && name.includes("naan")) return LOCAL_DISH_IMAGES.cheeseGarlicNaan;
  if (name.includes("tandoori roti") || (name.includes("roti") && !name.includes("naan"))) return LOCAL_DISH_IMAGES.tandooriRoti;
  if (name.includes("corn")) return LOCAL_DISH_IMAGES.crispyCorn;
  if (name.includes("rabdi") || (name.includes("jamun") && name.includes("rabdi"))) return LOCAL_DISH_IMAGES.rabdiGulabJamun;
  if (name.includes("jamun") || name.includes("gulab")) return LOCAL_DISH_IMAGES.gulabJamun;
  if (name.includes("sweet") && name.includes("lassi")) return LOCAL_DISH_IMAGES.sweetLassi;
  if (name.includes("punjabi") && name.includes("lassi")) return LOCAL_DISH_IMAGES.sweetLassi;
  if (name.includes("lassi") && !name.includes("mango")) return LOCAL_DISH_IMAGES.sweetLassi;
  if (name.includes("chaas") || name.includes("buttermilk")) return LOCAL_DISH_IMAGES.chaas;

  // 1. Fast food (Pizza, Burger, Fries, Pasta, Salad)
  if (name.includes("pizza")) return LOCAL_DISH_IMAGES.pizza;
  if (name.includes("burger")) return LOCAL_DISH_IMAGES.burger;
  if (name.includes("fries") || name.includes("french fry") || name.includes("french fries")) return LOCAL_DISH_IMAGES.fries;
  if (name.includes("pasta") || name.includes("macaroni") || name.includes("spaghetti")) return LOCAL_DISH_IMAGES.pasta;
  if (name.includes("salad")) return LOCAL_DISH_IMAGES.salad;

  // 2. Desserts & Sweets (Ice cream, Cake, Pancakes, Gulab Jamun, Shahi Tukda)
  if (name.includes("pancake")) return LOCAL_DISH_IMAGES.pancakes;
  if (name.includes("cake") || name.includes("pastry") || name.includes("brownie")) return LOCAL_DISH_IMAGES.cake;
  if (name.includes("ice cream") || name.includes("icecream") || name.includes("kulfi") || name.includes("falooda")) {
    return LOCAL_DISH_IMAGES.icecream;
  }
  if (name.includes("jamun") || name.includes("tukda") || name.includes("sweet") || name.includes("halwa") || cat === "desserts") {
    return LOCAL_DISH_IMAGES.desserts;
  }

  // 3. Coffee & Beverages
  if (name.includes("coffee") || name.includes("cappuccino") || name.includes("latte") || name.includes("espresso")) {
    return LOCAL_DISH_IMAGES.coffee;
  }
  if (name.includes("lassi") || name.includes("lemonade") || name.includes("shake") || name.includes("juice") || name.includes("soda") || name.includes("beverage") || name.includes("chaas") || name.includes("tea") || name.includes("chai") || cat === "beverages") {
    return LOCAL_DISH_IMAGES.beverages;
  }

  // 4. South Indian
  if (name.includes("dosa") || name.includes("idli") || name.includes("vada") || name.includes("uttapam") || cat === "south-indian") {
    return LOCAL_DISH_IMAGES.southIndian;
  }

  // 5. Chinese
  if (name.includes("manchurian") || name.includes("noodles") || name.includes("fried rice") || cat === "chinese") {
    return LOCAL_DISH_IMAGES.chinese;
  }

  // 6. Corn & Crispy Starters
  if (name.includes("corn")) return LOCAL_DISH_IMAGES.crispyCorn;
  if (name.includes("veg biryani") || name.includes("vegetable biryani")) return LOCAL_DISH_IMAGES.vegBiryani;

  // 7. Biryani & Rice
  if (name.includes("biryani") || name.includes("biriyani") || name.includes("pulao") || name.includes("rice") || cat === "biryani") {
    return LOCAL_DISH_IMAGES.biryani;
  }

  // 8. Breads & Naan
  if (name.includes("naan") || name.includes("roti") || name.includes("bread") || name.includes("kulcha") || name.includes("paratha") || cat === "breads") {
    return LOCAL_DISH_IMAGES.breads;
  }

  // 9. Tandoori & Kebabs
  if (name.includes("tandoor") || name.includes("kebab") || name.includes("tikka") || name.includes("seekh") || cat === "tandoor-kebabs" || cat.includes("tandoor") || cat.includes("kebab")) {
    return LOCAL_DISH_IMAGES.tandoori;
  }

  // 10. Curries & Main Course
  if (name.includes("curry") || name.includes("butter chicken") || name.includes("masala") || name.includes("paneer") || name.includes("dal") || name.includes("rogan") || cat === "mains" || cat.includes("main")) {
    return LOCAL_DISH_IMAGES.curry;
  }

  // 11. Starters
  if (name.includes("65") || name.includes("crispy") || name.includes("chilli") || name.includes("fry") || cat === "starters") {
    return LOCAL_DISH_IMAGES.starters;
  }

  return LOCAL_DISH_IMAGES.default;
}

export const ASSET_VERSION = "20261015-v4";

export function withAssetVersion(url) {
  if (typeof url === "string" && url.startsWith("/assets/")) {
    const base = url.split("?")[0];
    return `${base}?v=${ASSET_VERSION}`;
  }
  return url;
}

/**
 * Gets the best image URL for a menu item.
 * Always prefers local /assets/ image files or Data URLs so all devices display the same offline/online.
 * Appends ASSET_VERSION to local assets so browser caches immediately load updated dish images.
 */
export function getMenuItemImage(item = {}) {
  if (item && item.image && typeof item.image === "string" && item.image.trim().length > 0) {
    const img = item.image.trim();
    // If image is a local asset path or local data:image base64, use it directly
    if (img.startsWith("/assets/") || img.startsWith("data:image/")) {
      return withAssetVersion(img);
    }
    // If it's an external URL (e.g. Unsplash), map to the relevant local asset so all devices load locally
    return withAssetVersion(getRelevantLocalFallback(item));
  }
  return withAssetVersion(getRelevantLocalFallback(item));
}

/**
 * Safe image onError handler to replace broken or blocked external image with a relevant local JPG
 */
export function handleDishImageError(event, item = {}) {
  const fallback = withAssetVersion(getRelevantLocalFallback(item));
  if (event.target.src !== fallback && !event.target.src.endsWith(fallback)) {
    event.target.onerror = null; // Prevent infinite error loop
    event.target.src = fallback;
  }
}
