import React, { useEffect, useMemo, useState } from "react";
import {
  Package,
  Search,
  Plus,
  Pencil,
  AlertTriangle,
  CheckCircle2,
  TrendingDown,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Download,
  ClipboardList,
  X,
  PackagePlus,
  MinusCircle,
} from "lucide-react";
import { CustomCreatableDropdown } from "../common/CustomCreatableDropdown";
import { ConfirmDeleteModal, useConfirmDelete } from "../common/ConfirmDeleteModal";
import { formatCurrency } from "../utils/formatCurrency";
import { API_BASE_URL } from "../api/apiConfig";
import {
  apiGetInventory,
  apiCreateInventoryItem,
  apiUpdateInventoryItem,
} from "../api/inventoryApi";

const INVENTORY_STORAGE_KEY = "gourmet_pos_inventory_v1";
const MENU_RECIPE_UNITS = ["KG", "g", "L", "ml", "Pcs", "Cans"];

const normalizeUnit = (unit) => (unit === "Litres" ? "L" : unit);
const normalizeInventoryUnits = (items) =>
  items.map((item) => ({ ...item, unit: normalizeUnit(item.unit) }));

const STORAGE_KEY_CUSTOM_INV_CATEGORIES = "pos_custom_inventory_categories";
const STORAGE_KEY_CUSTOM_INV_UNITS = "pos_custom_inventory_units";
const STORAGE_KEY_CUSTOM_INV_SUPPLIERS = "pos_custom_inventory_suppliers";
const STORAGE_KEY_CUSTOM_INV_SUBCATEGORIES = "pos_custom_inventory_subcategories";
const STORAGE_KEY_DELETED_INVENTORY_IDS = "pos_deleted_inventory_ids_v1";

export const PRIMARY_CATEGORY_KEYS = [
  "Grains & Rice",
  "Meats & Poultry",
  "Seafood",
  "Dairy & Cheeses",
  "Vegetables & Fresh Produce",
  "Spices & Seasonings",
  "Cooking Oils & Fats",
  "Sauces, Pastes & Condiments",
  "Bakery & Breads",
  "Beverages & Soft Drinks",
  "Desserts & Dry Fruits",
  "Packaging & Disposables",
  "Hygiene & Cleaning",
];

export const normalizeCategory = (cat) => {
  if (!cat || typeof cat !== "string") return "Grains & Rice";
  const trimmed = cat.trim();
  const lower = trimmed.toLowerCase();

  // Legacy mappings from old POS versions
  if (lower === "dairy") return "Dairy & Cheeses";
  if (
    lower === "spices & oils" ||
    lower === "spices & oil" ||
    lower === "spices" ||
    lower === "masalas" ||
    lower === "seasoning"
  )
    return "Spices & Seasonings";
  if (lower === "cooking oil" || lower === "oils" || lower === "fats")
    return "Cooking Oils & Fats";
  if (
    lower === "vegetables & fruits" ||
    lower === "vegetables" ||
    lower === "fruits"
  )
    return "Vegetables & Fresh Produce";
  if (lower === "packaging" || lower === "disposables")
    return "Packaging & Disposables";
  if (lower === "beverages" || lower === "drinks")
    return "Beverages & Soft Drinks";
  if (lower === "desserts" || lower === "dry fruits" || lower === "sweets")
    return "Desserts & Dry Fruits";
  if (lower === "sauces" || lower === "condiments" || lower === "pastes")
    return "Sauces, Pastes & Condiments";
  if (lower === "bakery" || lower === "breads") return "Bakery & Breads";
  if (lower === "cleaning" || lower === "hygiene") return "Hygiene & Cleaning";
  if (lower === "poultry" || lower === "meat" || lower === "meats")
    return "Meats & Poultry";

  // Check against canonical keys case-insensitively
  for (const key of PRIMARY_CATEGORY_KEYS) {
    if (key.toLowerCase() === lower) {
      return key;
    }
  }
  return trimmed;
};

export const DEFAULT_INVENTORY_CATEGORIES_WITH_SUBS = {
  "Grains & Rice": [
    "Basmati Biryani Rice",
    "Jeera Samba Rice",
    "Sona Masoori Rice",
    "Wheat Flour (Atta)",
    "Maida",
    "Corn Flour",
    "Dals & Pulses",
    "Poha & Flakes",
  ],
  "Meats & Poultry": [
    "Fresh Chicken (Curry Cut)",
    "Boneless Chicken Breast",
    "Chicken Wings & Legs",
    "Chicken 65 Pieces",
    "Fresh Mutton (Curry Cut)",
    "Mutton Keema (Minced)",
    "Mutton Chops",
    "Fresh Eggs",
  ],
  "Seafood": [
    "Tiger Prawns (Cleaned)",
    "Medium Prawns",
    "Fish Fillets (Basa / Rohu / Apollo)",
    "Whole Fresh Fish",
    "Crab",
  ],
  "Dairy & Cheeses": [
    "Fresh Malai Paneer",
    "Pure Desi Cooking Ghee",
    "Fresh Curd (Dahi)",
    "Cooking Butter",
    "Fresh Milk",
    "Cooking Cream",
    "Mozzarella & Cheddar Cheese",
  ],
  "Vegetables & Fresh Produce": [
    "Onions",
    "Tomatoes",
    "Ginger",
    "Garlic",
    "Fresh Coriander",
    "Mint Leaves (Pudina)",
    "Green Chillies",
    "Lemons",
    "Potatoes",
    "Capsicum & Carrots",
    "Cauliflower & Green Peas",
    "Curry Leaves",
  ],
  "Spices & Seasonings": [
    "Biryani Masala",
    "Garam Masala",
    "Kashmiri Chilli Powder",
    "Turmeric Powder (Haldi)",
    "Cumin Seeds (Jeera)",
    "Coriander Powder (Dhania)",
    "Whole Khada Spices (Cardamom, Cloves, Star Anise, Cinnamon, Bay Leaves)",
    "Saffron (Kesar)",
    "Kasuri Methi",
    "Ginger-Garlic Paste",
    "Table Salt & Rock Salt",
    "Black Pepper",
    "Chaat Masala",
  ],
  "Cooking Oils & Fats": [
    "Refined Sunflower Oil",
    "Mustard Oil",
    "Deep Frying Oil",
    "Dalda / Vanaspati Ghee",
    "Sesame Oil",
  ],
  "Sauces, Pastes & Condiments": [
    "Dark Soy Sauce",
    "Chilli Sauce (Red/Green)",
    "Tomato Puree & Ketchup",
    "White Vinegar",
    "Schezwan Sauce",
    "Mayonnaise",
    "Biryani Essence & Rose Water",
    "Food Coloring (Orange/Red/Yellow)",
  ],
  "Bakery & Breads": [
    "Rumali Roti",
    "Naan & Kulcha Dough / Flour Mix",
    "Burger Buns",
    "Bread Crumbs",
    "Shawarma Pita Breads",
  ],
  "Beverages & Soft Drinks": [
    "Packaged Mineral Water (Bottles)",
    "Club Soda",
    "Soft Drinks (Cola, Lemon, Orange cans/bottles)",
    "Fruit Pulps & Syrups",
    "Tea Leaves & Chai Spices",
    "Coffee Powder",
  ],
  "Desserts & Dry Fruits": [
    "Cashews (Kaju)",
    "Almonds (Badam)",
    "Raisins (Kismis)",
    "Gulab Jamun Mix",
    "Khoya / Mawa",
    "Refined White Sugar",
    "Condensed Milk",
  ],
  "Packaging & Disposables": [
    "Biryani Buckets & Handis",
    "Foil Meal Trays & Containers",
    "Aluminium Foil Rolls & Cling Film",
    "Gravy & Raita Plastic Cups",
    "Takeaway Carry Bags",
    "Paper Napkins & Tissues",
    "Wooden / Plastic Cutlery Sets",
  ],
  "Hygiene & Cleaning": [
    "Commercial Dishwash Liquid",
    "Floor Cleaner & Degreaser",
    "Hand Wash & Sanitizer",
    "Kitchen Gloves & Hairnets",
    "Garbage Bags & Bins",
  ],
};

// Aliases so subcategories are always available even if old category names are referenced
DEFAULT_INVENTORY_CATEGORIES_WITH_SUBS["Dairy"] =
  DEFAULT_INVENTORY_CATEGORIES_WITH_SUBS["Dairy & Cheeses"];
DEFAULT_INVENTORY_CATEGORIES_WITH_SUBS["Spices & Oils"] =
  DEFAULT_INVENTORY_CATEGORIES_WITH_SUBS["Spices & Seasonings"];
DEFAULT_INVENTORY_CATEGORIES_WITH_SUBS["Vegetables & Fruits"] =
  DEFAULT_INVENTORY_CATEGORIES_WITH_SUBS["Vegetables & Fresh Produce"];
DEFAULT_INVENTORY_CATEGORIES_WITH_SUBS["Packaging"] =
  DEFAULT_INVENTORY_CATEGORIES_WITH_SUBS["Packaging & Disposables"];
DEFAULT_INVENTORY_CATEGORIES_WITH_SUBS["Beverages"] =
  DEFAULT_INVENTORY_CATEGORIES_WITH_SUBS["Beverages & Soft Drinks"];

export const DEFAULT_SUPPLIERS = [
  "Metro Cash & Carry Wholesale",
  "Fresh Farm Poultry & Chicken Supplies",
  "Royal Halal Mutton Center",
  "Ocean Fresh Seafoods & Fisheries",
  "Local Mandi Vegetable & Fruit Market",
  "Sri Lakshmi Rice & Grain Merchants",
  "Heritage & Amul Dairy Distributors",
  "National Spices & Oil Traders",
  "City Packaging & Disposable Supplies",
  "Beverage & Soft Drinks Depot",
  "General Wholesale Supplier",
];

export const getCanonicalIngredientInfo = (rawName) => {
  if (!rawName || typeof rawName !== "string") {
    return { dedupeKey: "", canonicalName: "" };
  }
  const trimmed = rawName.trim().replace(/\s+/g, " ");
  const lower = trimmed.toLowerCase();
  const alphanumeric = lower.replace(/[^a-z0-9]/g, "");

  // 1. Jeera / Cumin detection (unless it is explicitly Jeera Rice / Samba Rice)
  if (alphanumeric.includes("jeera") || alphanumeric.includes("cumin")) {
    if (!alphanumeric.includes("rice") && !alphanumeric.includes("samba")) {
      return {
        dedupeKey: "ingredient_spice_jeera",
        canonicalName: "Cumin Seeds (Jeera)",
        suggestedCategory: "Spices & Seasonings",
        suggestedSubcategory: "Cumin Seeds (Jeera)",
        suggestedUnit: "KG",
      };
    }
  }

  // 2. Containers / Trays / Food Packaging detection
  if (
    alphanumeric.includes("container") ||
    alphanumeric === "foiltrays" ||
    alphanumeric === "foiltray" ||
    alphanumeric.includes("mealtray")
  ) {
    return {
      dedupeKey: "ingredient_pack_containers",
      canonicalName: "Foil Meal Trays & Containers",
      suggestedCategory: "Packaging & Disposables",
      suggestedSubcategory: "Foil Meal Trays & Containers",
      suggestedUnit: "Pcs",
    };
  }

  // 3. Basmati Biryani Rice detection
  if (alphanumeric.includes("basmati")) {
    return {
      dedupeKey: "ingredient_grain_basmati",
      canonicalName: "Basmati Biryani Rice",
      suggestedCategory: "Grains & Rice",
      suggestedSubcategory: "Basmati Biryani Rice",
      suggestedUnit: "KG",
    };
  }

  // 4. Common Indian biryani ingredients
  const biryaniIngredients = [
    [/(allam|ginger).*?(velluli|garlic)|gingergarlic/, "ingredient_paste_garlicginger", "Ginger-Garlic Paste", "Ginger-Garlic Paste", "Sauces, Pastes & Condiments", "KG"],
    [/\b(onion|onions)\b/, "ingredient_produce_onion", "Onions", "Onions", "Vegetables & Fresh Produce", "KG"],
    [/\b(curd|yogurt|dahi)\b/, "ingredient_dairy_curd", "Fresh Curd (Dahi)", "Fresh Curd (Dahi)", "Dairy & Cheeses", "KG"],
    [/\bsalt\b/, "ingredient_spice_salt", "Table Salt & Rock Salt", "Table Salt & Rock Salt", "Spices & Seasonings", "KG"],
    [/\bturmeric|haldi\b/, "ingredient_spice_turmeric", "Turmeric Powder (Haldi)", "Turmeric Powder (Haldi)", "Spices & Seasonings", "KG"],
    [/chicken.*masala|masala.*chicken/, "ingredient_spice_chickenmasala", "Chicken Masala Powder", "Chicken Masala Powder", "Spices & Seasonings", "KG"],
    [/dalchini|cinnamon/, "ingredient_spice_cinnamon", "Cinnamon (Dalchini)", "Cinnamon (Dalchini)", "Spices & Seasonings", "KG"],
    [/lawang|clove/, "ingredient_spice_clove", "Cloves (Lawang)", "Cloves (Lawang)", "Spices & Seasonings", "KG"],
    [/biriyani|biryani.*leaf|bay.*leaf/, "ingredient_spice_bayleaf", "Biryani / Bay Leaves", "Biryani / Bay Leaves", "Spices & Seasonings", "KG"],
  ];
  for (const [pattern, key, canonicalName, subcategory, category, unit] of biryaniIngredients) {
    if (pattern.test(alphanumeric) || pattern.test(lower)) {
      return {
        dedupeKey: key,
        canonicalName,
        suggestedCategory: category,
        suggestedSubcategory: subcategory,
        suggestedUnit: unit,
      };
    }
  }

  // 5. General normalized key (singularize common plural endings)
  let baseKey = alphanumeric;
  if (baseKey.endsWith("ies") && baseKey.length > 5) {
    baseKey = baseKey.slice(0, -3) + "y";
  } else if (baseKey.endsWith("es") && baseKey.length > 4) {
    baseKey = baseKey.slice(0, -2);
  } else if (baseKey.endsWith("s") && !baseKey.endsWith("ss") && baseKey.length > 3) {
    baseKey = baseKey.slice(0, -1);
  }

  return {
    dedupeKey: `ingredient_${baseKey}`,
    canonicalName: trimmed,
  };
};

export const deduplicateAndNormalizeInventory = (items) => {
  if (!Array.isArray(items)) return [];

  const map = new Map();

  const isMeaningfulSupplier = (s) =>
    Boolean(
      s &&
        s !== "Supplier not set" &&
        s !== "Local Vendor" &&
        s !== "Local Supplier" &&
        s.trim().length > 0,
    );

  items.forEach((rawItem) => {
    if (!rawItem || !rawItem.name) return;
    const rawName = String(rawItem.name).trim();
    if (!rawName) return;

    const info = getCanonicalIngredientInfo(rawName);
    const key = info.dedupeKey || rawName.toLowerCase();
    const finalName = info.canonicalName || rawName;

    const rawSupplier = String(rawItem.supplier || "").trim();
    const supplier =
      rawSupplier && rawSupplier !== "Supplier not set"
        ? rawSupplier
        : "Metro Cash & Carry Wholesale";

    const category =
      info.suggestedCategory || normalizeCategory(rawItem.category);
    const unit = info.suggestedUnit || normalizeUnit(rawItem.unit || "KG");
    const stock = Number(rawItem.stock ?? 0);
    const minThreshold = Number(rawItem.minThreshold ?? 5);
    const mrp =
      rawItem.mrp != null && rawItem.mrp !== "" ? Number(rawItem.mrp) : null;
    const totalUsed = Number(rawItem.totalUsed ?? 0);
    const totalRestocked = Number(rawItem.totalRestocked ?? 0);

    const defaultSubs =
      DEFAULT_INVENTORY_CATEGORIES_WITH_SUBS[category] || ["General Supplies"];
    const subcategory =
      info.suggestedSubcategory ||
      (rawItem.subcategory && rawItem.subcategory.trim()
        ? rawItem.subcategory.trim()
        : defaultSubs[0]);

    if (map.has(key)) {
      // DUPLICATE DETECTED: Merge duplicate records into one unique item
      const existing = map.get(key);
      existing.stock = Number(
        (
          Number(existing.stock || 0) + (isNaN(stock) ? 0 : stock)
        ).toFixed(3),
      );
      existing.totalUsed = Number(
        (
          Number(existing.totalUsed || 0) + (isNaN(totalUsed) ? 0 : totalUsed)
        ).toFixed(3),
      );
      existing.totalRestocked = Number(
        (
          Number(existing.totalRestocked || 0) +
          (isNaN(totalRestocked) ? 0 : totalRestocked)
        ).toFixed(3),
      );
      // Prefer meaningful supplier over generic placeholder
      if (
        !isMeaningfulSupplier(existing.supplier) &&
        isMeaningfulSupplier(supplier)
      ) {
        existing.supplier = supplier;
      }
      if (
        !existing.subcategory ||
        existing.subcategory === "General Supplies"
      ) {
        existing.subcategory = subcategory;
      }
      if (rawItem.id || rawItem.ingredientId) {
        const thisId = String(rawItem.id || rawItem.ingredientId);
        if (!existing.associatedIds) existing.associatedIds = [String(existing.id)];
        if (!existing.associatedIds.includes(thisId)) {
          existing.associatedIds.push(thisId);
        }
      }
      if (
        (existing.mrp == null || isNaN(existing.mrp)) &&
        mrp != null &&
        !isNaN(mrp)
      ) {
        existing.mrp = mrp;
      }
      if (rawItem.lastRestocked && rawItem.lastRestocked !== "Not restocked") {
        existing.lastRestocked = rawItem.lastRestocked;
      }
    } else {
      map.set(key, {
        ...rawItem,
        id: String(
          rawItem.id ||
            `inv-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        ),
        associatedIds: [String(rawItem.id || rawItem.ingredientId || "")].filter(Boolean),
        name: finalName,
        category,
        subcategory,
        supplier,
        unit,
        stock: isNaN(stock) ? 0 : Number(stock.toFixed(3)),
        minThreshold: isNaN(minThreshold) ? 5 : minThreshold,
        mrp: mrp != null && !isNaN(mrp) ? mrp : null,
        totalUsed: isNaN(totalUsed) ? 0 : Number(totalUsed.toFixed(3)),
        totalRestocked:
          isNaN(totalRestocked) ? 0 : Number(totalRestocked.toFixed(3)),
        lastRestocked: rawItem.lastRestocked || "Not restocked",
      });
    }
  });

  return Array.from(map.values());
};

export function AdminInventory({ menuItems = [], onUpdateMenuItem }) {
  const { confirmState, requestDelete, cancelDelete } = useConfirmDelete();
  const [inventory, setInventory] = useState(() => {
    try {
      const saved = localStorage.getItem(INVENTORY_STORAGE_KEY);
      let deletedIds = new Set();
      try {
        const d = JSON.parse(
          localStorage.getItem(STORAGE_KEY_DELETED_INVENTORY_IDS) || "[]",
        );
        deletedIds = new Set(d.map(String));
      } catch {}

      if (saved) {
        const parsed = JSON.parse(saved);
        const nonDeleted = (Array.isArray(parsed) ? parsed : []).filter(
          (item) => {
            const info = getCanonicalIngredientInfo(item.name);
            return (
              !deletedIds.has(String(item.id)) &&
              !deletedIds.has(info.dedupeKey) &&
              !deletedIds.has(String(item.name || "").toLowerCase().trim())
            );
          },
        );
        const cleaned = deduplicateAndNormalizeInventory(nonDeleted);
        localStorage.setItem(INVENTORY_STORAGE_KEY, JSON.stringify(cleaned));
        return cleaned;
      }
      return [];
    } catch {
      return [];
    }
  });

  const [customInvCategories, setCustomInvCategories] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CUSTOM_INV_CATEGORIES);
      if (!saved) return [];
      const parsed = JSON.parse(saved);
      if (!Array.isArray(parsed)) return [];
      const standardKeys = new Set(
        PRIMARY_CATEGORY_KEYS.map((k) => k.toLowerCase()),
      );
      const filtered = parsed
        .map(normalizeCategory)
        .filter((c) => c && !standardKeys.has(c.toLowerCase()));
      const unique = Array.from(new Set(filtered));
      localStorage.setItem(
        STORAGE_KEY_CUSTOM_INV_CATEGORIES,
        JSON.stringify(unique),
      );
      return unique;
    } catch {
      return [];
    }
  });

  const [customInvUnits, setCustomInvUnits] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CUSTOM_INV_UNITS);
      return saved ? JSON.parse(saved).map(normalizeUnit) : [];
    } catch {
      return [];
    }
  });

  const [customInvSuppliers, setCustomInvSuppliers] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CUSTOM_INV_SUPPLIERS);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [customInvSubcategories, setCustomInvSubcategories] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CUSTOM_INV_SUBCATEGORIES);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const saveCustomCategory = (newCat) => {
    if (!newCat || !newCat.trim()) return;
    const trimmed = normalizeCategory(newCat.trim());
    const standardKeys = new Set(
      PRIMARY_CATEGORY_KEYS.map((k) => k.toLowerCase()),
    );
    if (standardKeys.has(trimmed.toLowerCase())) return;

    setCustomInvCategories((prev) => {
      if (prev.some((c) => c.toLowerCase() === trimmed.toLowerCase()))
        return prev;
      const updated = [...prev, trimmed];
      try {
        localStorage.setItem(
          STORAGE_KEY_CUSTOM_INV_CATEGORIES,
          JSON.stringify(updated),
        );
      } catch {}
      return updated;
    });
  };

  const saveCustomUnit = (newUnit) => {
    if (!newUnit || !newUnit.trim()) return;
    const trimmed = normalizeUnit(newUnit.trim());
    setCustomInvUnits((prev) => {
      if (prev.some((u) => u.toLowerCase() === trimmed.toLowerCase()))
        return prev;
      const updated = [...prev, trimmed];
      try {
        localStorage.setItem(
          STORAGE_KEY_CUSTOM_INV_UNITS,
          JSON.stringify(updated),
        );
      } catch {}
      return updated;
    });
  };

  const saveCustomSupplier = (newSup) => {
    if (!newSup || !newSup.trim()) return;
    const trimmed = newSup.trim();
    setCustomInvSuppliers((prev) => {
      if (prev.some((s) => s.toLowerCase() === trimmed.toLowerCase()))
        return prev;
      const updated = [...prev, trimmed];
      try {
        localStorage.setItem(
          STORAGE_KEY_CUSTOM_INV_SUPPLIERS,
          JSON.stringify(updated),
        );
      } catch {}
      return updated;
    });
  };

  const saveCustomSubcategory = (newSub) => {
    if (!newSub || !newSub.trim()) return;
    const trimmed = newSub.trim();
    const currentCat = normalizeCategory(newItem.category || "General Supplies");
    setCustomInvSubcategories((prev) => {
      const existing = prev[currentCat] || [];
      if (existing.some((s) => s.toLowerCase() === trimmed.toLowerCase()))
        return prev;
      const updated = {
        ...prev,
        [currentCat]: [...existing, trimmed],
      };
      try {
        localStorage.setItem(
          STORAGE_KEY_CUSTOM_INV_SUBCATEGORIES,
          JSON.stringify(updated),
        );
      } catch {}
      return updated;
    });
  };

  const allCategoryOptions = useMemo(() => {
    const map = new Map();
    // 1. Only canonical standard categories
    PRIMARY_CATEGORY_KEYS.forEach((c) => {
      if (c && !map.has(c.toLowerCase()))
        map.set(c.toLowerCase(), { value: c, label: c });
    });
    // 2. Custom categories (normalized to skip duplicates of standard ones)
    customInvCategories.forEach((c) => {
      const norm = normalizeCategory(c);
      if (norm && !map.has(norm.toLowerCase()))
        map.set(norm.toLowerCase(), { value: norm, label: norm });
    });
    // 3. Normalized inventory item categories
    (inventory || []).forEach((item) => {
      const norm = normalizeCategory(item.category);
      if (norm && !map.has(norm.toLowerCase())) {
        map.set(norm.toLowerCase(), {
          value: norm,
          label: norm,
        });
      }
    });
    return Array.from(map.values());
  }, [customInvCategories, inventory]);

  const allSupplierOptions = useMemo(() => {
    const map = new Map();
    DEFAULT_SUPPLIERS.forEach((s) => {
      if (s && !map.has(s.toLowerCase()))
        map.set(s.toLowerCase(), { value: s, label: s });
    });
    customInvSuppliers.forEach((s) => {
      if (s && !map.has(s.toLowerCase()))
        map.set(s.toLowerCase(), { value: s, label: s });
    });
    (inventory || []).forEach((item) => {
      if (
        item.supplier &&
        item.supplier !== "Supplier not set" &&
        !map.has(item.supplier.toLowerCase())
      ) {
        map.set(item.supplier.toLowerCase(), {
          value: item.supplier,
          label: item.supplier,
        });
      }
    });
    return Array.from(map.values());
  }, [customInvSuppliers, inventory]);

  const allUnitOptions = useMemo(() => {
    const map = new Map();
    customInvUnits.forEach((u) => {
      if (u && !map.has(u.toLowerCase()))
        map.set(u.toLowerCase(), { value: u, label: u });
    });
    (inventory || []).forEach((item) => {
      if (item.unit && !map.has(item.unit.toLowerCase())) {
        map.set(item.unit.toLowerCase(), {
          value: item.unit,
          label: item.unit,
        });
      }
    });
    return Array.from(map.values());
  }, [customInvUnits, inventory]);

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedSupplier, setSelectedSupplier] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(6);
  const [exportMessage, setExportMessage] = useState("");
  const [recipeDish, setRecipeDish] = useState(null);
  const [recipeDraft, setRecipeDraft] = useState([]);
  const [recipeError, setRecipeError] = useState("");
  const [restockItem, setRestockItem] = useState(null);
  const [restockAmount, setRestockAmount] = useState("");
  const [restockSupplier, setRestockSupplier] = useState("");
  const [consumeItem, setConsumeItem] = useState(null);
  const [consumeAmount, setConsumeAmount] = useState("");
  const [consumeReason, setConsumeReason] = useState("Kitchen Usage");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingItemId, setEditingItemId] = useState(null);
  const [newItem, setNewItem] = useState({
    name: "",
    category: "Grains & Rice",
    subcategory: "Basmati Biryani Rice",
    mrp: "",
    stock: 10,
    minThreshold: 5,
    unit: "KG",
    supplier: "Metro Cash & Carry Wholesale",
  });

  const subcategoryOptions = useMemo(() => {
    const map = new Map();
    const currentCatNorm = normalizeCategory(newItem.category);

    const defaults =
      DEFAULT_INVENTORY_CATEGORIES_WITH_SUBS[newItem.category] ||
      DEFAULT_INVENTORY_CATEGORIES_WITH_SUBS[currentCatNorm] ||
      [];
    defaults.forEach((sub) => {
      if (sub && !map.has(sub.toLowerCase())) {
        map.set(sub.toLowerCase(), { value: sub, label: sub });
      }
    });

    const customs = [
      ...(customInvSubcategories[newItem.category] || []),
      ...(customInvSubcategories[currentCatNorm] || []),
    ];
    customs.forEach((sub) => {
      if (sub && !map.has(sub.toLowerCase())) {
        map.set(sub.toLowerCase(), { value: sub, label: sub });
      }
    });

    (inventory || [])
      .filter(
        (item) =>
          (item.category === newItem.category ||
            normalizeCategory(item.category) === currentCatNorm) &&
          item.subcategory,
      )
      .forEach((item) => {
        if (!map.has(item.subcategory.toLowerCase())) {
          map.set(item.subcategory.toLowerCase(), {
            value: item.subcategory,
            label: item.subcategory,
          });
        }
      });

    // Fallback: If custom category has no subcategories yet, provide a general default
    if (map.size === 0 && newItem.category) {
      map.set("general", {
        value: "General Supplies",
        label: "General Supplies",
      });
    }

    return Array.from(map.values());
  }, [inventory, newItem.category, customInvSubcategories]);

  const saveInventory = (updated) => {
    const normalized = deduplicateAndNormalizeInventory(updated);
    setInventory(normalized);
    normalized.forEach((item) => {
      const backendId = Number(item.id);
      if (!Number.isFinite(backendId) || backendId <= 0) {
        apiCreateInventoryItem(item).catch(() => {});
      } else {
        apiUpdateInventoryItem(backendId, item).catch(() => {});
      }
    });
    try {
      localStorage.setItem(INVENTORY_STORAGE_KEY, JSON.stringify(normalized));
      fetch(`${API_BASE_URL}/api/sync`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "ngrok-skip-browser-warning": "true",
        },
        body: JSON.stringify({ [INVENTORY_STORAGE_KEY]: normalized }),
      }).catch(() => {});
      window.dispatchEvent(
        new CustomEvent("avsr-inventory-updated", { detail: normalized }),
      );
    } catch {}
  };

  useEffect(() => {
    let active = true;
    apiGetInventory().then((response) => {
      const payload = response?.data ?? response;
      const rows = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.data)
          ? payload.data
          : Array.isArray(payload?.ingredients)
            ? payload.ingredients
            : [];
      if (!active || !response?.success || !rows.length) return;
      let saved = [];
      try {
        saved = JSON.parse(localStorage.getItem(INVENTORY_STORAGE_KEY) || "[]");
      } catch {}

      let deletedIds = new Set();
      try {
        const d = JSON.parse(
          localStorage.getItem(STORAGE_KEY_DELETED_INVENTORY_IDS) || "[]",
        );
        deletedIds = new Set(d.map(String));
      } catch {}

      const savedById = new Map((Array.isArray(saved) ? saved : []).map((item) => [String(item.id), item]));
      const remote = rows
        .filter((row) => {
          const id = String(row.id ?? row.ingredientId ?? row.IngredientId ?? row.ingredient_id);
          const info = getCanonicalIngredientInfo(row.name);
          return (
            !deletedIds.has(id) &&
            !deletedIds.has(info.dedupeKey) &&
            !deletedIds.has(String(row.name || "").toLowerCase().trim())
          );
        })
        .map((row) => {
          const id = row.id ?? row.ingredientId ?? row.ingredient_id;
          const previous = savedById.get(String(id)) || {};
          return {
            ...previous,
            id: String(id),
            name: row.name?.trim() || previous.name || `Unnamed ingredient #${id}`,
            unit: normalizeUnit(row.unit || previous.unit || "Pcs"),
            stock: Number(row.currentStock ?? row.stock ?? previous.stock ?? 0),
            minThreshold: Number(row.minimumThreshold ?? row.minThreshold ?? previous.minThreshold ?? 0),
            mrp: Number(row.unitCost ?? row.mrp ?? previous.mrp ?? 0),
          };
        });
      const remoteIds = new Set(remote.map((item) => String(item.id)));
      const merged = deduplicateAndNormalizeInventory([
        ...remote,
        ...(Array.isArray(saved) ? saved.filter((item) => !remoteIds.has(String(item.id))) : []),
      ]);
      setInventory(merged);
      try { localStorage.setItem(INVENTORY_STORAGE_KEY, JSON.stringify(merged)); } catch {}
    }).catch(() => {});
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const handleInventoryUpdate = (event) => {
      if (Array.isArray(event.detail)) {
        setInventory(deduplicateAndNormalizeInventory(event.detail));
      }
    };
    const handleStorageUpdate = (event) => {
      if (event.key !== INVENTORY_STORAGE_KEY || !event.newValue) return;
      try {
        const updated = JSON.parse(event.newValue);
        if (Array.isArray(updated)) {
          setInventory(deduplicateAndNormalizeInventory(updated));
        }
      } catch {}
    };
    window.addEventListener("avsr-inventory-updated", handleInventoryUpdate);
    window.addEventListener("storage", handleStorageUpdate);
    return () => {
      window.removeEventListener(
        "avsr-inventory-updated",
        handleInventoryUpdate,
      );
      window.removeEventListener("storage", handleStorageUpdate);
    };
  }, []);

  const openRecipeEditor = (dish) => {
    setRecipeDish(dish);
    setRecipeDraft(
      Array.isArray(dish.recipe)
        ? dish.recipe.map((ingredient) => ({
            ...ingredient,
            unit: normalizeUnit(ingredient.unit),
          }))
        : [],
    );
    setRecipeError("");
  };

  const addRecipeIngredient = () => {
    setRecipeDraft((current) => [
      ...current,
      {
        inventoryId: "",
        name: "",
        quantity: "",
        unit: "KG",
        category: "Grains & Rice",
      },
    ]);
  };

  const updateRecipeIngredient = (index, patch) => {
    setRecipeDraft((current) =>
      current.map((ingredient, rowIndex) =>
        rowIndex === index ? { ...ingredient, ...patch } : ingredient,
      ),
    );
  };

  const saveRecipe = () => {
    if (!recipeDish || !recipeDraft.length) {
      setRecipeError("Add at least one ingredient to this recipe.");
      return;
    }
    if (
      recipeDraft.some(
        (ingredient) =>
          !ingredient.name.trim() || !(Number(ingredient.quantity) > 0),
      )
    ) {
      setRecipeError(
        "Each ingredient needs a name and a quantity greater than zero.",
      );
      return;
    }

    const nextInventory = [...inventory];
    const recipe = recipeDraft.map((ingredient) => {
      let stockItem = nextInventory.find(
        (item) => String(item.id) === String(ingredient.inventoryId),
      );
      if (!stockItem) {
        stockItem = nextInventory.find(
          (item) =>
            item.name.trim().toLowerCase() ===
              ingredient.name.trim().toLowerCase() &&
            item.unit === ingredient.unit,
        );
      }
      if (!stockItem) {
        stockItem = {
          id: `recipe-ingredient-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          name: ingredient.name.trim(),
          category: ingredient.category,
          stock: 0,
          totalUsed: 0,
          totalRestocked: 0,
          minThreshold: 0,
          unit: ingredient.unit,
          supplier: "Supplier not set",
          lastRestocked: "Not restocked",
        };
        nextInventory.unshift(stockItem);
      }
      return {
        inventoryId: stockItem.id,
        name: stockItem.name,
        quantity: Number(ingredient.quantity),
        unit: stockItem.unit,
      };
    });

    saveInventory(nextInventory);
    onUpdateMenuItem?.({ ...recipeDish, recipe });
    setRecipeDish(null);
    setRecipeDraft([]);
    setRecipeError("");
  };

  const receiveStock = (event) => {
    event.preventDefault();
    const amount = Number(restockAmount);
    if (!restockItem || !Number.isFinite(amount) || amount <= 0) return;
    const restockedDate = new Date().toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
    const updated = inventory.map((item) =>
      item.id === restockItem.id
        ? {
            ...item,
            stock: Number((Number(item.stock || 0) + amount).toFixed(3)),
            totalRestocked: Number(item.totalRestocked || 0) + amount,
            lastRestocked: restockedDate,
            supplier: restockSupplier.trim() || item.supplier,
          }
        : item,
    );
    saveInventory(updated);
    setRestockItem(null);
    setRestockAmount("");
    setRestockSupplier("");
  };

  const handleRecordUsage = (event) => {
    event?.preventDefault?.();
    const amount = Number(consumeAmount);
    if (!consumeItem || !Number.isFinite(amount) || amount <= 0) return;
    const currentStock = Number(consumeItem.stock || 0);
    const nextStock = Math.max(0, Number((currentStock - amount).toFixed(3)));
    const updated = inventory.map((item) =>
      item.id === consumeItem.id
        ? {
            ...item,
            stock: nextStock,
            totalUsed: Number((Number(item.totalUsed || 0) + amount).toFixed(3)),
          }
        : item,
    );
    saveInventory(updated);
    try {
      const ledger = JSON.parse(
        localStorage.getItem("gourmet_pos_inventory_deductions_v1") || "[]",
      );
      const record = {
        id: `usage-${Date.now()}`,
        itemId: consumeItem.id,
        itemName: consumeItem.name,
        quantity: amount,
        unit: consumeItem.unit,
        reason: consumeReason.trim() || "Manual Kitchen Usage",
        timestamp: new Date().toISOString(),
      };
      ledger.unshift(record);
      localStorage.setItem(
        "gourmet_pos_inventory_deductions_v1",
        JSON.stringify(ledger.slice(0, 500)),
      );
    } catch {}
    setConsumeItem(null);
    setConsumeAmount("");
    setConsumeReason("Kitchen Usage");
  };

  const handleAdjustStock = (id, delta) => {
    const updated = inventory.map((item) => {
      if (item.id === id) {
        const nextStock = Math.max(0, Number((item.stock + delta).toFixed(2)));
        const adjustedAmount = Math.abs(nextStock - item.stock);
        return {
          ...item,
          stock: nextStock,
          totalUsed:
            Number(item.totalUsed || 0) + (delta < 0 ? adjustedAmount : 0),
          totalRestocked:
            Number(item.totalRestocked || 0) + (delta > 0 ? adjustedAmount : 0),
          lastRestocked:
            delta > 0
              ? new Date().toLocaleDateString("en-GB", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })
              : item.lastRestocked,
        };
      }
      return item;
    });
    saveInventory(updated);
  };

  const exportInventory = () => {
    const csvCell = (value) => {
      const text = String(value ?? "");
      const safeText = /^[=+@\-\t\r]/.test(text) ? `'${text}` : text;
      return `"${safeText.replaceAll('"', '""')}"`;
    };
    const rows = [
      [
        "Item",
        "Category",
        "MRP",
        "Supplier",
        "Available Quantity",
        "Unit",
        "Quantity Used (tracked)",
        "Quantity Restocked (tracked)",
        "Low Stock Threshold",
        "Status",
        "Last Restocked",
      ],
      ...inventory.map((item) => [
        item.name,
        item.category,
        item.mrp ?? "",
        item.supplier,
        item.stock,
        item.unit,
        Number(item.totalUsed || 0),
        Number(item.totalRestocked || 0),
        item.minThreshold,
        item.stock <= 0
          ? "Out of Stock"
          : item.stock <= item.minThreshold
            ? "Low Stock"
            : "In Stock",
        item.lastRestocked,
      ]),
    ];
    const csv = `\uFEFF${rows.map((row) => row.map(csvCell).join(",")).join("\r\n")}`;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `inventory-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setExportMessage(
      "Inventory exported. Usage and restock totals track adjustments from this update onward.",
    );
    window.setTimeout(() => setExportMessage(""), 5000);
  };

  const handleAddItem = (e) => {
    e.preventDefault();
    if (!newItem.name.trim()) return;

    const trimmedName = newItem.name.trim();
    const info = getCanonicalIngredientInfo(trimmedName);
    const finalName = info.canonicalName || trimmedName;
    const finalCategory =
      info.suggestedCategory || normalizeCategory(newItem.category);
    const finalSupplier =
      newItem.supplier.trim() || "Metro Cash & Carry Wholesale";

    // Validate duplicate item by canonical ingredient identity
    const duplicate = inventory.find((item) => {
      if (item.id === editingItemId) return false;
      const existingInfo = getCanonicalIngredientInfo(item.name);
      return (
        info.dedupeKey === existingInfo.dedupeKey ||
        item.name.trim().toLowerCase() === trimmedName.toLowerCase()
      );
    });

    if (duplicate) {
      requestDelete({
        title: "Duplicate inventory item",
        message: `"${trimmedName}" is already in your inventory as "${duplicate.name}". If restocking, use the Restock button or edit the existing item to add more quantity. Duplicate ingredients cannot be added multiple times.`,
        confirmLabel: "OK",
        cancelLabel: "Close",
        icon: <AlertTriangle size={22} color="#f59e0b" />,
        onConfirm: () => {},
      });
      return;
    }

    if (finalCategory) saveCustomCategory(finalCategory);
    if (newItem.unit) saveCustomUnit(newItem.unit);
    if (finalSupplier) saveCustomSupplier(finalSupplier);
    if (newItem.subcategory) saveCustomSubcategory(newItem.subcategory);

    const defaultSubs =
      DEFAULT_INVENTORY_CATEGORIES_WITH_SUBS[finalCategory] || [
        "General Supplies",
      ];
    const finalSubcategory =
      info.suggestedSubcategory ||
      (newItem.subcategory && newItem.subcategory.trim()
        ? newItem.subcategory.trim()
        : defaultSubs[0]);

    const itemDetails = {
      name: finalName,
      category: finalCategory,
      subcategory: finalSubcategory,
      mrp: newItem.mrp === "" ? null : Number(newItem.mrp),
      stock: Number(newItem.stock) || 0,
      minThreshold: Number(newItem.minThreshold) || 5,
      unit: info.suggestedUnit || normalizeUnit(newItem.unit || "KG"),
      supplier: finalSupplier,
      ...(newItem.totalUsed !== undefined && newItem.totalUsed !== ""
        ? { totalUsed: Math.max(0, Number(newItem.totalUsed) || 0) }
        : {}),
    };

    if (editingItemId !== null) {
      saveInventory(
        inventory.map((item) =>
          item.id === editingItemId ? { ...item, ...itemDetails } : item,
        ),
      );
    } else {
      saveInventory([
        {
          id: `inv-${Date.now()}`,
          ...itemDetails,
          totalUsed: Number(newItem.totalUsed) || 0,
          totalRestocked: Number(newItem.stock) || 0,
          lastRestocked: "Today",
        },
        ...inventory,
      ]);
    }

    resetItemForm();
    setIsAddModalOpen(false);
  };

  const resetItemForm = () => {
    setEditingItemId(null);
    setNewItem({
      name: "",
      category: "Grains & Rice",
      subcategory: "Basmati Biryani Rice",
      mrp: "",
      stock: 10,
      totalUsed: "0",
      minThreshold: 5,
      unit: "KG",
      supplier: "Metro Cash & Carry Wholesale",
    });
  };

  const openNewItemModal = () => {
    resetItemForm();
    setIsAddModalOpen(true);
  };

  const openEditItemModal = (item) => {
    setEditingItemId(item.id);
    const cat = normalizeCategory(item.category || "Grains & Rice");
    const defaultSubs =
      DEFAULT_INVENTORY_CATEGORIES_WITH_SUBS[cat] || ["General Supplies"];
    setNewItem({
      name: item.name || "",
      category: cat,
      subcategory: item.subcategory || defaultSubs[0],
      mrp: item.mrp == null ? "" : String(item.mrp),
      stock: String(item.stock ?? 0),
      totalUsed: String(item.totalUsed ?? 0),
      minThreshold: String(item.minThreshold ?? 5),
      unit: normalizeUnit(item.unit || "KG"),
      supplier: item.supplier || "Metro Cash & Carry Wholesale",
    });
    setIsAddModalOpen(true);
  };

  const closeItemModal = () => {
    setIsAddModalOpen(false);
    resetItemForm();
  };

  const handleDeleteItem = (id) => {
    const item = inventory.find((i) => String(i.id) === String(id));
    const itemName = item?.name || "this item";
    requestDelete({
      title: "Remove Inventory Item?",
      message: `Are you sure you want to remove "${itemName}" from restaurant inventory? This action cannot be undone.`,
      confirmLabel: "Yes, Remove",
      onConfirm: () => {
        // 1. Collect all local and backend IDs associated with this item
        const idsToDelete = Array.from(
          new Set([String(id), ...(item?.associatedIds || []).map(String)]),
        );
        const info = getCanonicalIngredientInfo(item?.name);
        const dedupeKey =
          info.dedupeKey || String(item?.name || "").toLowerCase().trim();

        // 2. Track in deleted localStorage so backend sync never resurrects it
        try {
          const prevDeleted = JSON.parse(
            localStorage.getItem(STORAGE_KEY_DELETED_INVENTORY_IDS) || "[]",
          );
          const updatedDeleted = Array.from(
            new Set([...prevDeleted, ...idsToDelete, dedupeKey]),
          );
          localStorage.setItem(
            STORAGE_KEY_DELETED_INVENTORY_IDS,
            JSON.stringify(updatedDeleted),
          );
        } catch {}

        // 3. Immediately update UI & localStorage
        const remaining = inventory.filter((i) => String(i.id) !== String(id));
        saveInventory(remaining);

        // 4. Call backend API to permanently delete from remote database
        idsToDelete.forEach((backendId) => {
          if (
            backendId &&
            !backendId.startsWith("inv-") &&
            !backendId.startsWith("recipe-")
          ) {
            void apiDeleteIngredient(backendId)
              .then((result) => {
                if (!result?.success) {
                  console.error(
                    `[Inventory] Failed to delete ingredient ${backendId}:`,
                    result?.error || "Unknown API error",
                  );
                }
              })
              .catch((error) => {
                console.error(
                  `[Inventory] Failed to delete ingredient ${backendId}:`,
                  error instanceof Error ? error.message : error,
                );
              });
          }
        });
      },
    });
  };

  const categories = useMemo(() => {
    return ["all", ...allCategoryOptions.map((opt) => opt.value)];
  }, [allCategoryOptions]);
  const suppliers = useMemo(() => {
    return allSupplierOptions.map((opt) => opt.value);
  }, [allSupplierOptions]);
  const inStockCount = inventory.filter(
    (item) => item.stock > item.minThreshold,
  ).length;
  const outOfStockCount = inventory.filter((item) => item.stock <= 0).length;

  const filtered = inventory.filter((item) => {
    const matchesCategory =
      selectedCategory === "all" ||
      item.category === selectedCategory ||
      normalizeCategory(item.category) === normalizeCategory(selectedCategory);
    const matchesSearch =
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.supplier.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      selectedStatus === "all" ||
      (selectedStatus === "in-stock" && item.stock > item.minThreshold) ||
      (selectedStatus === "low-stock" &&
        item.stock > 0 &&
        item.stock <= item.minThreshold) ||
      (selectedStatus === "out-of-stock" && item.stock <= 0);
    const matchesSupplier =
      selectedSupplier === "all" || item.supplier === selectedSupplier;
    return matchesCategory && matchesSearch && matchesStatus && matchesSupplier;
  });

  const pageCount = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
  const visiblePage = Math.min(currentPage, pageCount);
  const pageStart = (visiblePage - 1) * itemsPerPage;
  const visibleItems = filtered.slice(pageStart, pageStart + itemsPerPage);
  const paginationPages = Array.from(
    new Set(
      [1, visiblePage - 1, visiblePage, visiblePage + 1, pageCount].filter(
        (page) => page >= 1 && page <= pageCount,
      ),
    ),
  ).sort((a, b) => a - b);

  const lowStockCount = inventory.filter(
    (item) => item.stock > 0 && item.stock <= item.minThreshold,
  ).length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {/* Outer Card Matching Design */}
      <div
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border-card)",
          borderRadius: "16px",
          padding: "1.1rem",
        }}
      >
        {/* Header Strip inside Card */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "0.75rem",
            marginBottom: "1rem",
          }}
        >
          {/* Left Title with Orange Squircle */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.7rem" }}>
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "12px",
                background: "linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 4px 14px rgba(245, 158, 11, 0.35)",
              }}
            >
              <Package size={19} color="#ffffff" />
            </div>
            <div>
              <div
                style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}
              >
                <h2
                  style={{
                    fontSize: "1.18rem",
                    fontWeight: 800,
                    color: "var(--text-main)",
                    margin: 0,
                  }}
                >
                  Raw Inventory & Supplies
                </h2>
                <span
                  style={{
                    background: "rgba(245, 158, 11, 0.15)",
                    border: "1px solid rgba(245, 158, 11, 0.35)",
                    color: "var(--accent-amber-light)",
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    padding: "2px 10px",
                    borderRadius: "20px",
                  }}
                >
                  {inventory.length} items
                </span>
              </div>
              <p
                style={{
                  fontSize: "0.74rem",
                  color: "var(--text-dim)",
                  margin: "3px 0 0 0",
                }}
              >
                Track restaurant raw ingredients, meat stock, spices and
                packaging units
              </p>
            </div>
          </div>

          {/* Top Right Corner Actions */}
          <div
            style={{
              display: "flex",
              gap: "0.55rem",
              alignItems: "center",
              flexWrap: "wrap",
              marginLeft: "auto",
            }}
          >
            <button
              type="button"
              onClick={exportInventory}
              title="Download all inventory as an Excel-compatible CSV"
              style={{
                height: "36px",
                background: "var(--bg-tertiary)",
                color: "var(--success)",
                border: "1px solid rgba(52, 211, 153, 0.4)",
                borderRadius: "9px",
                padding: "0 0.85rem",
                fontWeight: 700,
                fontSize: "0.78rem",
                display: "flex",
                alignItems: "center",
                gap: "0.4rem",
                cursor: "pointer",
                whiteSpace: "nowrap",
                transition: "all 0.15s ease",
              }}
            >
              <Download size={15} />
              <span>Export Excel</span>
            </button>
            <button
              onClick={openNewItemModal}
              style={{
                height: "36px",
                background: "linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)",
                color: "#ffffff",
                border: "none",
                borderRadius: "9px",
                padding: "0 0.95rem",
                fontWeight: 700,
                fontSize: "0.78rem",
                display: "flex",
                alignItems: "center",
                gap: "0.45rem",
                cursor: "pointer",
                boxShadow: "0 3px 12px rgba(245, 158, 11, 0.35)",
                whiteSpace: "nowrap",
                transition: "all 0.15s ease",
              }}
            >
              <Plus size={15} />
              <span>Add Stock Item</span>
            </button>
          </div>

          {/* Filter Bar: Search & Inventory Dropdowns */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              flexWrap: "wrap",
              flex: "1 1 100%",
              width: "100%",
              marginTop: "0.25rem",
            }}
          >
            {/* Search Input */}
            <div
              style={{
                position: "relative",
                flex: "1 1 240px",
                minWidth: "220px",
                height: "36px",
                display: "flex",
                alignItems: "center",
              }}
            >
              <Search
                size={16}
                color="var(--text-dim)"
                style={{
                  position: "absolute",
                  left: "12px",
                  pointerEvents: "none",
                }}
              />
              <input
                type="text"
                placeholder="Search raw items or suppliers..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                style={{
                  width: "100%",
                  height: "100%",
                  background: "var(--bg-tertiary)",
                  border: "1px solid var(--border-card)",
                  borderRadius: "9px",
                  padding: "0 12px 0 36px",
                  color: "var(--text-main)",
                  fontSize: "0.82rem",
                  outline: "none",
                }}
              />
            </div>

            {/* Inventory Filters */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                flex: "2 1 480px",
                gap: "0.65rem",
                minWidth: "300px",
              }}
            >
              {[
                {
                  label: "Filter by category",
                  value: selectedCategory,
                  onChange: setSelectedCategory,
                  options: categories.map((category) => ({
                    value: category,
                    label: category === "all" ? "All Categories" : category,
                  })),
                },
                {
                  label: "Filter by status",
                  value: selectedStatus,
                  onChange: setSelectedStatus,
                  options: [
                    { value: "all", label: "All Status" },
                    { value: "in-stock", label: "In Stock" },
                    { value: "low-stock", label: "Low Stock" },
                    { value: "out-of-stock", label: "Out of Stock" },
                  ],
                },
                {
                  label: "Filter by supplier",
                  value: selectedSupplier,
                  onChange: setSelectedSupplier,
                  options: [
                    { value: "all", label: "All Suppliers" },
                    ...suppliers.map((supplier) => ({
                      value: supplier,
                      label: supplier,
                    })),
                  ],
                },
              ].map(({ label, value, onChange, options }) => (
                <div key={label} style={{ position: "relative", minWidth: 0 }}>
                  <select
                    aria-label={label}
                    value={value}
                    onChange={(e) => {
                      onChange(e.target.value);
                      setCurrentPage(1);
                    }}
                    style={{
                      width: "100%",
                      minWidth: 0,
                      height: "40px",
                      padding: "0 2.25rem 0 0.75rem",
                      color: "var(--text-main)",
                      background: "var(--bg-tertiary)",
                      border: "1px solid var(--border-card)",
                      borderRadius: "9px",
                      fontSize: "0.82rem",
                      fontWeight: 600,
                      outline: "none",
                      appearance: "none",
                      WebkitAppearance: "none",
                      cursor: "pointer",
                      transition:
                        "border-color 0.15s ease, box-shadow 0.15s ease",
                    }}
                  >
                    {options.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    size={16}
                    strokeWidth={2.2}
                    aria-hidden="true"
                    style={{
                      position: "absolute",
                      top: "50%",
                      right: "0.75rem",
                      transform: "translateY(-50%)",
                      color: "var(--text-muted)",
                      pointerEvents: "none",
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {exportMessage && (
          <div
            role="status"
            style={{
              color: "var(--success)",
              fontSize: "0.76rem",
              fontWeight: 600,
              margin: "-0.75rem 0 1rem",
            }}
          >
            {exportMessage}
          </div>
        )}

        {/* Stock Summary */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(145px, 1fr))",
            gap: "0.6rem",
            marginBottom: "0.9rem",
          }}
        >
          {[
            {
              label: "Total Items",
              value: inventory.length,
              status: "all",
              color: "var(--info)",
              icon: Package,
            },
            {
              label: "In Stock",
              value: inStockCount,
              status: "in-stock",
              color: "var(--success)",
              icon: CheckCircle2,
            },
            {
              label: "Low Stock",
              value: lowStockCount,
              status: "low-stock",
              color: "var(--accent-amber-light)",
              icon: AlertTriangle,
            },
            {
              label: "Out of Stock",
              value: outOfStockCount,
              status: "out-of-stock",
              color: "var(--danger)",
              icon: TrendingDown,
            },
          ].map(({ label, value, status, color, icon: Icon }) => (
            <button
              type="button"
              key={label}
              aria-label={`Show ${label.toLowerCase()} inventory items`}
              aria-pressed={selectedStatus === status}
              onClick={() => {
                setSelectedStatus(status);
                setCurrentPage(1);
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                minWidth: 0,
                width: "100%",
                padding: "0.65rem 0.8rem",
                background: "var(--bg-tertiary)",
                border: `1px solid ${selectedStatus === status ? color: "var(--border-subtle)"}`,
                borderRadius: "10px",
                color: "inherit",
                textAlign: "left",
                cursor: "pointer",
              }}
            >
              <div
                style={{
                  width: "32px",
                  height: "32px",
                  flexShrink: 0,
                  display: "grid",
                  placeItems: "center",
                  color,
                  background: `color-mix(in srgb, ${color} 12.55%, transparent)`,
                  borderRadius: "9px",
                }}
              >
                <Icon size={17} />
              </div>
              <div>
                <div
                  style={{
                    color: "var(--text-muted)",
                    fontSize: "0.72rem",
                    fontWeight: 600,
                  }}
                >
                  {label}
                </div>
                <div style={{ color, fontSize: "1rem", fontWeight: 800 }}>
                  {value}
                </div>
              </div>
            </button>
          ))}
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "0.75rem",
            flexWrap: "wrap",
            padding: "0.75rem 0.9rem",
            marginBottom: "0.9rem",
            background: "var(--bg-tertiary)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "10px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.55rem",
              minWidth: 0,
            }}
          >
            <ClipboardList size={17} color="#f59e0b" />
            <div>
              <div
                style={{
                  color: "var(--text-main)",
                  fontWeight: 800,
                  fontSize: "0.84rem",
                }}
              >
                Menu Recipes
              </div>
              <div style={{ color: "var(--text-muted)", fontSize: "0.72rem" }}>
                Set ingredient quantities per dish once; stock is reduced when
                its bill is paid.
              </div>
            </div>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              flex: "0 1 390px",
            }}
          >
            <select
              aria-label="Select menu item recipe"
              value={recipeDish?.id || ""}
              onChange={(event) => {
                const dish = menuItems.find(
                  (item) => String(item.id) === event.target.value,
                );
                if (dish) openRecipeEditor(dish);
              }}
              style={{
                flex: 1,
                minWidth: 0,
                height: "36px",
                padding: "0 0.6rem",
                color: "var(--text-main)",
                background: "var(--bg-card)",
                border: "1px solid var(--border-card)",
                borderRadius: "7px",
                fontSize: "0.76rem",
              }}
            >
              <option value="">Choose a menu item…</option>
              {menuItems.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => recipeDish && openRecipeEditor(recipeDish)}
              style={{
                height: "36px",
                padding: "0 0.75rem",
                background: "rgba(245, 158, 11, 0.14)",
                color: "var(--accent-amber-light)",
                border: "1px solid rgba(245, 158, 11, 0.35)",
                borderRadius: "7px",
                fontWeight: 700,
                fontSize: "0.75rem",
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              Set Recipe
            </button>
          </div>
        </div>

        {/* Inventory Items Table */}
        <div
          style={{
            overflowX: "auto",
            borderRadius: "12px",
            border: "1px solid var(--border-card)",
          }}
        >
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              textAlign: "left",
              fontSize: "0.85rem",
            }}
          >
            <thead>
              <tr
                style={{
                  borderBottom: "1px solid var(--border-subtle)",
                  background: "var(--bg-tertiary)",
                  color: "var(--text-muted)",
                  fontSize: "0.8rem",
                  fontWeight: 700,
                }}
              >
                <th style={{ padding: "0.55rem 0.65rem" }}>
                  Ingredient / Supply
                </th>
                <th style={{ padding: "0.55rem 0.65rem" }}>Category</th>
                <th style={{ padding: "0.55rem 0.5rem", textAlign: "right" }}>MRP</th>
                <th style={{ padding: "0.55rem 0.5rem", textAlign: "center" }}>In-Stock</th>
                <th style={{ padding: "0.55rem 0.5rem", textAlign: "center" }}>Used</th>
                <th style={{ padding: "0.55rem 0.5rem", textAlign: "center" }}>Threshold</th>
                <th style={{ padding: "0.55rem 0.6rem", textAlign: "center" }}>Status</th>
                <th style={{ padding: "0.55rem 0.65rem", textAlign: "right" }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {visibleItems.map((item) => {
                const isOutOfStock = item.stock <= 0;
                const isLowStock =
                  !isOutOfStock && item.stock <= item.minThreshold;
                const statusColor = isOutOfStock
                  ? "var(--danger)"
                  : isLowStock
                    ? "var(--status-occupied)"
                    : "var(--success)";
                return (
                  <tr
                    key={item.id}
                    style={{
                      borderBottom: "1px solid var(--border-subtle)",
                      transition: "background 0.15s ease",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background = "var(--bg-tertiary)")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = "transparent")
                    }
                  >
                    {/* Item Name */}
                    <td style={{ padding: "0.55rem 0.65rem" }}>
                      <div
                        style={{
                          fontWeight: 800,
                          color: "var(--text-main)",
                          fontSize: "0.84rem",
                          lineHeight: "1.25",
                        }}
                      >
                        {item.name}
                      </div>
                      <div
                        style={{
                          fontSize: "0.7rem",
                          color: "var(--text-muted)",
                          marginTop: "2px",
                          maxWidth: "180px",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                        title={`Supplier: ${item.supplier}`}
                      >
                        Supplier: {item.supplier}
                      </div>
                    </td>

                    {/* Category */}
                    <td
                      style={{
                        padding: "0.55rem 0.65rem",
                        color: "var(--text-main)",
                        fontWeight: 600,
                      }}
                    >
                      <div style={{ lineHeight: "1.25" }}>{item.category}</div>
                      {item.subcategory && (
                        <div
                          style={{
                            color: "var(--text-muted)",
                            fontSize: "0.7rem",
                            fontWeight: 500,
                            marginTop: "1px",
                            maxWidth: "140px",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                          title={item.subcategory}
                        >
                          {item.subcategory}
                        </div>
                      )}
                    </td>

                    {/* MRP */}
                    <td
                      style={{
                        padding: "0.55rem 0.5rem",
                        color: "var(--text-main)",
                        fontWeight: 700,
                        whiteSpace: "nowrap",
                        textAlign: "right",
                      }}
                    >
                      {item.mrp == null || item.mrp === ""
                        ? "—"
                        : formatCurrency(item.mrp)}
                    </td>

                    {/* In-Stock */}
                    <td style={{ padding: "0.55rem 0.5rem", textAlign: "center" }}>
                      <div
                        style={{
                          fontWeight: 800,
                          color: isOutOfStock
                            ? "#ef4444"
                            : isLowStock
                              ? "#f59e0b"
                              : "#10b981",
                          fontSize: "0.82rem",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {item.stock} {item.unit}
                      </div>
                    </td>

                    {/* Used since recipe tracking started */}
                    <td
                      style={{
                        padding: "0.55rem 0.5rem",
                        textAlign: "center",
                        whiteSpace: "nowrap",
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setConsumeItem(item);
                          setConsumeAmount("");
                          setConsumeReason("Kitchen Usage");
                        }}
                        title={`Click to manually record or add used ${item.name}`}
                        style={{
                          background: "transparent",
                          border: "1px dashed transparent",
                          padding: "1px 5px",
                          borderRadius: "4px",
                          cursor: "pointer",
                          color: "var(--text-main)",
                          fontWeight: 700,
                          fontSize: "0.8rem",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "3px",
                          whiteSpace: "nowrap",
                          transition: "all 0.15s ease",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = "var(--surface-tint)";
                          e.currentTarget.style.borderColor = "var(--accent-amber)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "transparent";
                          e.currentTarget.style.borderColor = "transparent";
                        }}
                      >
                        <span>{Number(item.totalUsed || 0)} {item.unit}</span>
                        <Pencil size={10} color="var(--accent-amber)" />
                      </button>
                    </td>

                    {/* Min Threshold */}
                    <td
                      style={{
                        padding: "0.55rem 0.5rem",
                        color: "var(--text-muted)",
                        fontWeight: 600,
                        textAlign: "center",
                        whiteSpace: "nowrap",
                        fontSize: "0.8rem",
                      }}
                    >
                      {item.minThreshold} {item.unit}
                    </td>

                    {/* Status Badge */}
                    <td style={{ padding: "0.55rem 0.6rem", textAlign: "center", whiteSpace: "nowrap" }}>
                      <span
                        style={{
                          background: `${statusColor}1f`,
                          border: `1px solid ${statusColor}4d`,
                          color: statusColor,
                          borderRadius: "12px",
                          padding: "2px 8px",
                          fontSize: "0.7rem",
                          fontWeight: 700,
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "4px",
                          whiteSpace: "nowrap",
                          lineHeight: "1.2",
                        }}
                      >
                        <span
                          style={{
                            width: 5,
                            height: 5,
                            borderRadius: "50%",
                            background: statusColor,
                          }}
                        />
                        {isOutOfStock
                          ? "Out of Stock"
                          : isLowStock
                            ? "Low Stock"
                            : "In Stock"}
                      </span>
                    </td>

                    {/* Actions */}
                    <td
                      style={{
                        padding: "0.55rem 0.65rem",
                        textAlign: "right",
                        whiteSpace: "nowrap",
                      }}
                    >
                      <div
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "0.25rem",
                          whiteSpace: "nowrap",
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => openEditItemModal(item)}
                          aria-label={`Edit ${item.name}`}
                          title="Edit inventory item"
                          style={{
                            background: "var(--bg-tertiary)",
                            border: "1px solid var(--border-subtle)",
                            color: "var(--text-main)",
                            borderRadius: "6px",
                            padding: "3px 6px",
                            fontSize: "0.72rem",
                            fontWeight: 700,
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "3px",
                            cursor: "pointer",
                            whiteSpace: "nowrap",
                            flexShrink: 0,
                          }}
                        >
                          <Pencil size={11} />
                          <span>Edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAdjustStock(item.id, -5)}
                          style={{
                            background: "var(--surface-tint)",
                            border: "1px solid rgba(255, 255, 255, 0.1)",
                            color: "var(--text-main)",
                            borderRadius: "6px",
                            padding: "3px 7px",
                            fontSize: "0.72rem",
                            fontWeight: 800,
                            cursor: "pointer",
                            whiteSpace: "nowrap",
                            flexShrink: 0,
                          }}
                          title="Quick consume -5 units"
                        >
                          -5
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setConsumeItem(item);
                            setConsumeAmount("");
                            setConsumeReason("Kitchen Usage");
                          }}
                          style={{
                            background: "rgba(245, 158, 11, 0.14)",
                            border: "1px solid rgba(245, 158, 11, 0.38)",
                            color: "#f59e0b",
                            borderRadius: "6px",
                            padding: "3px 7px",
                            fontSize: "0.72rem",
                            fontWeight: 700,
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "3px",
                            whiteSpace: "nowrap",
                            flexShrink: 0,
                          }}
                          title="Record custom used quantity manually (e.g. 20 KG)"
                        >
                          <MinusCircle size={11} />
                          <span>Use</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setRestockItem(item);
                            setRestockAmount("");
                            setRestockSupplier(
                              item.supplier === "Supplier not set"
                                ? ""
                                : item.supplier,
                            );
                          }}
                          style={{
                            background: "rgba(16, 185, 129, 0.1)",
                            border: "1px solid rgba(16, 185, 129, 0.3)",
                            color: "#10b981",
                            borderRadius: "6px",
                            padding: "3px 7px",
                            fontSize: "0.72rem",
                            fontWeight: 700,
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "3px",
                            whiteSpace: "nowrap",
                            flexShrink: 0,
                          }}
                          title="Record received stock quantity"
                        >
                          <PackagePlus size={12} />
                          <span>Receive</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteItem(item.id)}
                          style={{
                            background: "rgba(239, 68, 68, 0.08)",
                            border: "1px solid rgba(239, 68, 68, 0.3)",
                            color: "#ef4444",
                            borderRadius: "6px",
                            padding: "4px 6px",
                            fontSize: "0.72rem",
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            whiteSpace: "nowrap",
                            flexShrink: 0,
                          }}
                          title="Delete item"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {visibleItems.length === 0 && (
                <tr>
                  <td
                    colSpan={8}
                    style={{
                      padding: "2rem 1rem",
                      color: "var(--text-dim)",
                      textAlign: "center",
                    }}
                  >
                    No inventory items match these filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "0.65rem 0.85rem",
              borderTop: "1px solid var(--border-subtle)",
              background: "var(--bg-tertiary)",
              fontSize: "0.78rem",
              color: "var(--text-muted)",
              flexWrap: "wrap",
              gap: "0.75rem 1rem",
            }}
          >
            <span>
              Showing{" "}
              <strong style={{ color: "var(--text-main)", fontWeight: 700 }}>
                {filtered.length === 0 ? 0 : pageStart + 1}
              </strong>
              –
              <strong style={{ color: "var(--text-main)", fontWeight: 700 }}>
                {Math.min(pageStart + itemsPerPage, filtered.length)}
              </strong>{" "}
              of{" "}
              <strong style={{ color: "var(--text-main)", fontWeight: 700 }}>
                {filtered.length}
              </strong>{" "}
              items
            </span>
            <div
              style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "0.65rem", flexWrap: "wrap", marginLeft: "auto" }}
            >
              <div
                style={{ display: "flex", alignItems: "center", gap: "0.4rem", whiteSpace: "nowrap" }}
              >
                <span
                  style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}
                >
                  Per page:
                </span>
                <select
                  aria-label="Items per page"
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  style={{
                    background: "var(--bg-tertiary)",
                    color: "var(--text-main)",
                    border: "1px solid var(--border-card)",
                    borderRadius: "5px",
                    padding: "2px 6px",
                    fontSize: "0.72rem",
                    outline: "none",
                    cursor: "pointer",
                    height: "30px",
                  }}
                >
                  {[5, 6, 8, 10, 20].map((pageSize) => (
                    <option key={pageSize} value={pageSize}>
                      {pageSize}
                    </option>
                  ))}
                </select>
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.25rem",
                }}
              >
                <button
                  type="button"
                  aria-label="Previous page"
                  onClick={() =>
                    setCurrentPage((page) => Math.max(1, page - 1))
                  }
                  disabled={visiblePage === 1}
                  style={{
                    height: "30px",
                    padding: "0 6px",
                    borderRadius: "5px",
                    background:
                      visiblePage === 1
                        ? "var(--bg-card)"
                        : "var(--bg-tertiary)",
                    border: "1px solid var(--border-subtle)",
                    color:
                      visiblePage === 1
                        ? "var(--text-dim)"
                        : "var(--text-main)",
                    cursor: visiblePage === 1 ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "2px",
                    fontSize: "0.72rem",
                    fontWeight: 600,
                  }}
                >
                  <ChevronLeft size={13} />
                  <span>Prev</span>
                </button>
                {paginationPages.map((page, index) => {
                    const previousPage = paginationPages[index - 1];
                    const isActive = page === visiblePage;
                    return (
                      <React.Fragment key={page}>
                        {previousPage && page - previousPage > 1 && (
                          <span aria-hidden="true" style={{ padding: "0 0.1rem", color: "var(--text-dim)" }}>…</span>
                        )}
                        <button
                          type="button"
                          aria-label={`Page ${page}`}
                          aria-current={isActive ? "page" : undefined}
                          onClick={() => setCurrentPage(page)}
                          style={{
                            height: "30px",
                            minWidth: "30px",
                            padding: "0 8px",
                            borderRadius: "6px",
                            background: isActive
                              ? "linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)"
                              : "var(--bg-tertiary)",
                            border: isActive
                              ? "none"
                              : "1px solid var(--border-subtle)",
                            color: isActive ? "#ffffff" : "var(--text-muted)",
                            cursor: "pointer",
                            fontSize: "0.76rem",
                            fontWeight: isActive ? 800 : 500,
                            boxShadow: isActive
                              ? "0 2px 8px rgba(245, 158, 11, 0.35)"
                              : "none",
                          }}
                        >
                          {page}
                        </button>
                      </React.Fragment>
                    );
                  })}
                <button
                  type="button"
                  aria-label="Next page"
                  onClick={() =>
                    setCurrentPage((page) => Math.min(pageCount, page + 1))
                  }
                  disabled={visiblePage === pageCount}
                  style={{
                    height: "30px",
                    padding: "0 6px",
                    borderRadius: "5px",
                    background:
                      visiblePage === pageCount
                        ? "var(--bg-card)"
                        : "var(--bg-tertiary)",
                    border: "1px solid var(--border-subtle)",
                    color:
                      visiblePage === pageCount
                        ? "var(--text-dim)"
                        : "var(--text-main)",
                    cursor:
                      visiblePage === pageCount ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "2px",
                    fontSize: "0.72rem",
                    fontWeight: 600,
                  }}
                >
                  <span>Next</span>
                  <ChevronRight size={13} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {recipeDish && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 170,
            padding: "1rem",
            background: "var(--modal-overlay)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`${recipeDish.name} recipe`}
            style={{
              width: "100%",
              maxWidth: "720px",
              maxHeight: "88vh",
              overflowY: "auto",
              padding: "1.1rem",
              borderRadius: "14px",
              background: "var(--bg-card)",
              border: "1px solid var(--border-card)",
              boxShadow: "var(--shadow-lg)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: "0.75rem",
                marginBottom: "0.75rem",
              }}
            >
              <div>
                <h3
                  style={{
                    margin: 0,
                    color: "var(--text-main)",
                    fontSize: "1rem",
                  }}
                >
                  Recipe: {recipeDish.name}
                </h3>
                <p
                  style={{
                    margin: "0.25rem 0 0",
                    color: "var(--text-muted)",
                    fontSize: "0.75rem",
                  }}
                >
                  Enter ingredient quantity needed for one serving. New
                  ingredients are added to inventory with zero stock.
                </p>
              </div>
              <button
                type="button"
                aria-label="Close recipe editor"
                onClick={() => setRecipeDish(null)}
                style={{
                  border: 0,
                  color: "var(--text-muted)",
                  background: "transparent",
                  cursor: "pointer",
                }}
              >
                <X size={18} />
              </button>
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.55rem",
                marginBottom: "0.8rem",
              }}
            >
              {recipeDraft.map((ingredient, index) => {
                const existingIngredient = inventory.find(
                  (item) => String(item.id) === String(ingredient.inventoryId),
                );
                const fieldStyle = {
                  width: "100%",
                  minWidth: 0,
                  boxSizing: "border-box",
                  height: "36px",
                  padding: "0 0.55rem",
                  borderRadius: "7px",
                  border: "1px solid var(--border-card)",
                  background: "var(--bg-tertiary)",
                  color: "var(--text-main)",
                  fontSize: "0.76rem",
                };
                return (
                  <div
                    key={`${ingredient.inventoryId || "new"}-${index}`}
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "minmax(180px, 1.5fr) minmax(105px, 0.8fr) minmax(105px, 0.8fr) 34px",
                      gap: "0.45rem",
                      alignItems: "center",
                      padding: "0.55rem",
                      background: "var(--bg-tertiary)",
                      borderRadius: "9px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "0.4rem",
                        minWidth: 0,
                      }}
                    >
                      <select
                        aria-label={`Ingredient ${index + 1}`}
                        value={
                          existingIngredient
                            ? String(existingIngredient.id)
                            : "__new"
                        }
                        onChange={(event) => {
                          const stockItem = inventory.find(
                            (item) => String(item.id) === event.target.value,
                          );
                          updateRecipeIngredient(
                            index,
                            stockItem
                              ? {
                                  inventoryId: stockItem.id,
                                  name: stockItem.name,
                                  unit: stockItem.unit,
                                  category: stockItem.category,
                                }
                              : {
                                  inventoryId: "",
                                  name: "",
                                  unit: "KG",
                                  category: "Grains & Rice",
                                },
                          );
                        }}
                        style={fieldStyle}
                      >
                        <option value="__new">
                          + New inventory ingredient
                        </option>
                        {inventory.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.name} ({item.unit})
                          </option>
                        ))}
                      </select>
                      {!existingIngredient && (
                        <input
                          aria-label="New ingredient name"
                          placeholder="Ingredient name"
                          value={ingredient.name}
                          onChange={(event) =>
                            updateRecipeIngredient(index, {
                              name: event.target.value,
                            })
                          }
                          style={fieldStyle}
                        />
                      )}
                    </div>
                    <input
                      aria-label="Quantity per serving"
                      type="number"
                      min="0.001"
                      step="0.001"
                      placeholder="Qty / serving"
                      value={ingredient.quantity}
                      onChange={(event) =>
                        updateRecipeIngredient(index, {
                          quantity: event.target.value,
                        })
                      }
                      style={fieldStyle}
                    />
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "0.4rem",
                      }}
                    >
                      <select
                        aria-label="Recipe unit"
                        value={existingIngredient?.unit || ingredient.unit}
                        disabled={!!existingIngredient}
                        onChange={(event) =>
                          updateRecipeIngredient(index, {
                            unit: event.target.value,
                          })
                        }
                        style={fieldStyle}
                      >
                        {MENU_RECIPE_UNITS.map((unit) => (
                          <option key={unit} value={unit}>
                            {unit}
                          </option>
                        ))}
                      </select>
                      {!existingIngredient && (
                        <select
                          aria-label="Ingredient category"
                          value={ingredient.category}
                          onChange={(event) =>
                            updateRecipeIngredient(index, {
                              category: event.target.value,
                            })
                          }
                          style={fieldStyle}
                        >
                          {categories
                            .filter((category) => category !== "all")
                            .map((category) => (
                              <option key={category} value={category}>
                                {category}
                              </option>
                            ))}
                        </select>
                      )}
                    </div>
                    <button
                      type="button"
                      aria-label="Remove ingredient"
                      onClick={() =>
                        setRecipeDraft((current) =>
                          current.filter((_, rowIndex) => rowIndex !== index),
                        )
                      }
                      style={{
                        width: "32px",
                        height: "32px",
                        border: "1px solid rgba(239,68,68,0.3)",
                        borderRadius: "7px",
                        color: "var(--danger)",
                        background: "rgba(239,68,68,0.08)",
                        cursor: "pointer",
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                );
              })}
            </div>

            {recipeError && (
              <div
                role="alert"
                style={{
                  marginBottom: "0.7rem",
                  color: "var(--danger)",
                  fontSize: "0.76rem",
                }}
              >
                {recipeError}
              </div>
            )}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: "0.6rem",
                flexWrap: "wrap",
              }}
            >
              <button
                type="button"
                onClick={addRecipeIngredient}
                style={{
                  height: "36px",
                  padding: "0 0.8rem",
                  border: "1px solid var(--border-card)",
                  borderRadius: "8px",
                  color: "var(--text-main)",
                  background: "var(--bg-tertiary)",
                  fontWeight: 700,
                  fontSize: "0.76rem",
                  cursor: "pointer",
                }}
              >
                <Plus
                  size={14}
                  style={{ verticalAlign: "middle", marginRight: "0.35rem" }}
                />
                Add Ingredient
              </button>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button
                  type="button"
                  onClick={() => setRecipeDish(null)}
                  style={{
                    height: "36px",
                    padding: "0 0.85rem",
                    border: "1px solid var(--border-card)",
                    borderRadius: "8px",
                    color: "var(--text-main)",
                    background: "var(--bg-tertiary)",
                    fontWeight: 700,
                    fontSize: "0.76rem",
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={saveRecipe}
                  style={{
                    height: "36px",
                    padding: "0 0.9rem",
                    border: 0,
                    borderRadius: "8px",
                    color: "#fff",
                    background: "linear-gradient(135deg, #f59e0b, #ea580c)",
                    fontWeight: 800,
                    fontSize: "0.76rem",
                    cursor: "pointer",
                  }}
                >
                  Save Recipe
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {consumeItem && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 175,
            padding: "1rem",
            background: "var(--modal-overlay)",
            backdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <form
            onSubmit={handleRecordUsage}
            style={{
              width: "100%",
              maxWidth: "420px",
              padding: "1.2rem",
              borderRadius: "14px",
              background: "var(--bg-card)",
              border: "1px solid var(--border-card)",
              boxShadow: "var(--shadow-lg)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "0.4rem",
              }}
            >
              <h3
                style={{
                  margin: 0,
                  color: "var(--text-main)",
                  fontSize: "1.05rem",
                  fontWeight: 800,
                  display: "flex",
                  alignItems: "center",
                  gap: "0.4rem",
                }}
              >
                <MinusCircle size={18} color="#f59e0b" />
                Record Used: {consumeItem.name}
              </h3>
              <button
                type="button"
                onClick={() => setConsumeItem(null)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--text-dim)",
                  cursor: "pointer",
                  padding: "4px",
                }}
              >
                <X size={18} />
              </button>
            </div>

            <div
              style={{
                display: "flex",
                gap: "0.75rem",
                padding: "0.55rem 0.75rem",
                borderRadius: "8px",
                background: "var(--bg-tertiary)",
                border: "1px solid var(--border-subtle)",
                marginBottom: "0.85rem",
                fontSize: "0.78rem",
              }}
            >
              <div>
                <span style={{ color: "var(--text-dim)" }}>In-Stock:</span>{" "}
                <strong
                  style={{
                    color:
                      Number(consumeItem.stock || 0) <=
                      Number(consumeItem.minThreshold || 0)
                        ? "#f59e0b"
                        : "#10b981",
                  }}
                >
                  {consumeItem.stock} {consumeItem.unit}
                </strong>
              </div>
              <div
                style={{
                  borderLeft: "1px solid var(--border-subtle)",
                  paddingLeft: "0.75rem",
                }}
              >
                <span style={{ color: "var(--text-dim)" }}>Total Used:</span>{" "}
                <strong style={{ color: "var(--text-main)" }}>
                  {Number(consumeItem.totalUsed || 0)} {consumeItem.unit}
                </strong>
              </div>
            </div>

            <label
              style={{
                display: "block",
                color: "var(--text-main)",
                fontSize: "0.76rem",
                fontWeight: 700,
                marginBottom: "0.35rem",
              }}
            >
              QUANTITY USED ({consumeItem.unit}) *
            </label>
            <input
              autoFocus
              required
              type="number"
              min="0.001"
              step="any"
              value={consumeAmount}
              onChange={(event) => setConsumeAmount(event.target.value)}
              placeholder={`Enter amount used (e.g. 5, 20, 50 ${consumeItem.unit})`}
              style={{
                width: "100%",
                height: "40px",
                boxSizing: "border-box",
                padding: "0 0.75rem",
                borderRadius: "8px",
                border: "1px solid var(--border-card)",
                background: "var(--bg-tertiary)",
                color: "var(--text-main)",
                fontSize: "0.9rem",
                fontWeight: 700,
                marginBottom: "0.5rem",
              }}
            />

            {/* Quick Presets */}
            <div
              style={{
                display: "flex",
                gap: "0.35rem",
                marginBottom: "0.85rem",
                flexWrap: "wrap",
              }}
            >
              {[1, 5, 10, 20, 50].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setConsumeAmount(String(val))}
                  style={{
                    padding: "3px 9px",
                    borderRadius: "6px",
                    background:
                      consumeAmount === String(val)
                        ? "var(--accent-amber)"
                        : "var(--surface-tint)",
                    color:
                      consumeAmount === String(val)
                        ? "#000000"
                        : "var(--text-main)",
                    border: "1px solid var(--border-subtle)",
                    fontSize: "0.72rem",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  +{val} {consumeItem.unit}
                </button>
              ))}
            </div>

            <label
              style={{
                display: "block",
                color: "var(--text-muted)",
                fontSize: "0.74rem",
                fontWeight: 700,
                marginBottom: "0.35rem",
              }}
            >
              USAGE REASON / NOTE (OPTIONAL)
            </label>
            <input
              type="text"
              value={consumeReason}
              onChange={(event) => setConsumeReason(event.target.value)}
              placeholder="e.g. Kitchen cooking, Preparation, Spoilage"
              style={{
                width: "100%",
                height: "36px",
                boxSizing: "border-box",
                padding: "0 0.65rem",
                borderRadius: "8px",
                border: "1px solid var(--border-card)",
                background: "var(--bg-tertiary)",
                color: "var(--text-main)",
                fontSize: "0.8rem",
                marginBottom: "1rem",
              }}
            />

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "0.5rem",
              }}
            >
              <button
                type="button"
                onClick={() => setConsumeItem(null)}
                style={{
                  height: "36px",
                  padding: "0 0.95rem",
                  border: "1px solid var(--border-card)",
                  borderRadius: "8px",
                  color: "var(--text-main)",
                  background: "var(--bg-tertiary)",
                  fontWeight: 700,
                  fontSize: "0.78rem",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                style={{
                  height: "36px",
                  padding: "0 1.1rem",
                  border: "none",
                  borderRadius: "8px",
                  color: "#000000",
                  background:
                    "linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)",
                  fontWeight: 800,
                  fontSize: "0.78rem",
                  cursor: "pointer",
                  boxShadow: "0 2px 8px rgba(245, 158, 11, 0.35)",
                }}
              >
                Record Used
              </button>
            </div>
          </form>
        </div>
      )}

      {restockItem && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 175,
            padding: "1rem",
            background: "var(--modal-overlay)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <form
            onSubmit={receiveStock}
            style={{
              width: "100%",
              maxWidth: "420px",
              padding: "1.1rem",
              borderRadius: "14px",
              background: "var(--bg-card)",
              border: "1px solid var(--border-card)",
              boxShadow: "var(--shadow-lg)",
            }}
          >
            <h3
              style={{
                margin: "0 0 0.25rem",
                color: "var(--text-main)",
                fontSize: "1rem",
              }}
            >
              Receive {restockItem.name}
            </h3>
            <p
              style={{
                margin: "0 0 0.9rem",
                color: "var(--text-muted)",
                fontSize: "0.75rem",
              }}
            >
              Current stock: {restockItem.stock} {restockItem.unit}
            </p>
            <label
              style={{
                display: "block",
                color: "var(--text-muted)",
                fontSize: "0.74rem",
                fontWeight: 700,
                marginBottom: "0.35rem",
              }}
            >
              QUANTITY RECEIVED ({restockItem.unit})
            </label>
            <input
              autoFocus
              required
              type="number"
              min="0.001"
              step="0.001"
              value={restockAmount}
              onChange={(event) => setRestockAmount(event.target.value)}
              placeholder="Enter quantity"
              style={{
                width: "100%",
                height: "38px",
                boxSizing: "border-box",
                padding: "0 0.65rem",
                borderRadius: "8px",
                border: "1px solid var(--border-card)",
                background: "var(--bg-tertiary)",
                color: "var(--text-main)",
                fontSize: "0.82rem",
                marginBottom: "0.7rem",
              }}
            />
            <label
              style={{
                display: "block",
                color: "var(--text-muted)",
                fontSize: "0.74rem",
                fontWeight: 700,
                marginBottom: "0.35rem",
              }}
            >
              SUPPLIER
            </label>
            <div style={{ marginBottom: "0.9rem" }}>
              <CustomCreatableDropdown
                value={restockSupplier}
                onChange={(val) => setRestockSupplier(val)}
                options={allSupplierOptions}
                placeholder="Select or enter supplier..."
                customPlaceholder="Type new supplier name..."
                allowCustom
                onSaveCustomOption={saveCustomSupplier}
              />
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "0.5rem",
              }}
            >
              <button
                type="button"
                onClick={() => setRestockItem(null)}
                style={{
                  height: "36px",
                  padding: "0 0.85rem",
                  border: "1px solid var(--border-card)",
                  borderRadius: "8px",
                  color: "var(--text-main)",
                  background: "var(--bg-tertiary)",
                  fontWeight: 700,
                  fontSize: "0.76rem",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                style={{
                  height: "36px",
                  padding: "0 0.9rem",
                  border: 0,
                  borderRadius: "8px",
                  color: "#fff",
                  background: "linear-gradient(135deg, #059669, #10b981)",
                  fontWeight: 800,
                  fontSize: "0.76rem",
                  cursor: "pointer",
                }}
              >
                Save Received Stock
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Add Item Modal */}
      {isAddModalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "var(--modal-overlay)",
            backdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 150,
            padding: "1rem",
          }}
        >
          <div
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border-card)",
              borderRadius: "16px",
              padding: "1.5rem",
              width: "100%",
              maxWidth: "460px",
              maxHeight: "calc(100vh - 2rem)",
              overflowY: "auto",
              boxShadow: "var(--shadow-lg)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "1rem",
                borderBottom: "1.5px solid var(--border-subtle)",
                paddingBottom: "0.6rem",
              }}
            >
              <h3
                style={{
                  fontSize: "1.2rem",
                  fontWeight: 800,
                  color: "var(--text-main)",
                  margin: 0,
                }}
              >
                {editingItemId !== null
                  ? "Edit Inventory Supply"
                  : "Add New Inventory Supply"}
              </h3>
              <button
                type="button"
                onClick={closeItemModal}
                style={{
                  background: "var(--bg-tertiary)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "6px",
                  width: "32px",
                  height: "32px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--text-main)",
                  cursor: "pointer",
                }}
                title="Close"
              >
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={handleAddItem}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.85rem",
              }}
            >
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.75rem",
                    color: "var(--text-dim)",
                    marginBottom: "4px",
                  }}
                >
                  Item / Ingredient Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Basmati Saffron"
                  value={newItem.name}
                  onChange={(e) =>
                    setNewItem({ ...newItem, name: e.target.value })
                  }
                  style={{
                    width: "100%",
                    background: "var(--bg-tertiary)",
                    border: "1px solid var(--border-card)",
                    borderRadius: "8px",
                    padding: "0.6rem 0.8rem",
                    color: "var(--text-main)",
                    fontSize: "0.85rem",
                    outline: "none",
                  }}
                />
              </div>

              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.75rem",
                    color: "var(--text-dim)",
                    marginBottom: "4px",
                  }}
                >
                  MRP / Price (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  inputMode="decimal"
                  placeholder="e.g. 250.00"
                  value={newItem.mrp}
                  onChange={(e) =>
                    setNewItem({ ...newItem, mrp: e.target.value })
                  }
                  style={{
                    width: "100%",
                    background: "var(--bg-tertiary)",
                    border: "1px solid var(--border-card)",
                    borderRadius: "8px",
                    padding: "0.6rem 0.8rem",
                    color: "var(--text-main)",
                    fontSize: "0.85rem",
                    outline: "none",
                  }}
                />
              </div>

              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    color: "var(--text-main)",
                    marginBottom: "4px",
                  }}
                >
                  Supplier
                </label>
                <CustomCreatableDropdown
                  value={newItem.supplier}
                  onChange={(val) =>
                    setNewItem({ ...newItem, supplier: val })
                  }
                  options={allSupplierOptions}
                  placeholder="Select Supplier"
                  customPlaceholder="Type new supplier name..."
                  allowCustom
                  onSaveCustomOption={saveCustomSupplier}
                />
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "0.75rem",
                  alignItems: "start",
                }}
              >
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.75rem",
                      fontWeight: 700,
                      color: "var(--text-main)",
                      marginBottom: "4px",
                    }}
                  >
                    Category
                  </label>
                  <CustomCreatableDropdown
                    value={newItem.category}
                    onChange={(val) => {
                      const normalized = normalizeCategory(val);
                      const defaultSubs =
                        DEFAULT_INVENTORY_CATEGORIES_WITH_SUBS[normalized] ||
                        DEFAULT_INVENTORY_CATEGORIES_WITH_SUBS[val] ||
                        customInvSubcategories[val] ||
                        customInvSubcategories[normalized] ||
                        ["General Supplies"];
                      setNewItem({
                        ...newItem,
                        category: normalized,
                        subcategory:
                          defaultSubs.length > 0
                            ? defaultSubs[0]
                            : "General Supplies",
                      });
                    }}
                    options={allCategoryOptions}
                    placeholder="Select Category"
                    customPlaceholder="Type new category..."
                    allowCustom
                    onSaveCustomOption={saveCustomCategory}
                  />
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.75rem",
                      fontWeight: 700,
                      color: "var(--text-main)",
                      marginBottom: "4px",
                    }}
                  >
                    Unit
                  </label>
                  <CustomCreatableDropdown
                    value={newItem.unit}
                    onChange={(val) => setNewItem({ ...newItem, unit: val })}
                    options={allUnitOptions}
                    placeholder="Select Unit"
                    customPlaceholder="Type new unit..."
                    allowCustom
                    onSaveCustomOption={saveCustomUnit}
                  />
                </div>
              </div>

              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    color: "var(--text-main)",
                    marginBottom: "4px",
                  }}
                >
                  Subcategory
                </label>
                <CustomCreatableDropdown
                  value={newItem.subcategory}
                  onChange={(val) =>
                    setNewItem({ ...newItem, subcategory: val })
                  }
                  options={subcategoryOptions}
                  placeholder="Select Subcategory"
                  customPlaceholder="Type new subcategory..."
                  allowCustom
                  onSaveCustomOption={saveCustomSubcategory}
                />
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: editingItemId !== null ? "1fr 1fr 1fr" : "1fr 1fr",
                  gap: "0.75rem",
                }}
              >
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.75rem",
                      color: "var(--text-dim)",
                      marginBottom: "4px",
                    }}
                  >
                    {editingItemId !== null
                      ? "Current Stock"
                      : "Starting Stock"}
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={newItem.stock}
                    onChange={(e) =>
                      setNewItem({ ...newItem, stock: e.target.value })
                    }
                    style={{
                      width: "100%",
                      background: "var(--bg-tertiary)",
                      border: "1px solid var(--border-card)",
                      borderRadius: "8px",
                      padding: "0.6rem 0.8rem",
                      color: "var(--text-main)",
                      fontSize: "0.85rem",
                      outline: "none",
                    }}
                  />
                </div>
                {editingItemId !== null && (
                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: "0.75rem",
                        color: "var(--text-dim)",
                        marginBottom: "4px",
                      }}
                    >
                      Total Used ({newItem.unit || "Units"})
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={newItem.totalUsed}
                      onChange={(e) =>
                        setNewItem({ ...newItem, totalUsed: e.target.value })
                      }
                      style={{
                        width: "100%",
                        background: "var(--bg-tertiary)",
                        border: "1px solid var(--border-card)",
                        borderRadius: "8px",
                        padding: "0.6rem 0.8rem",
                        color: "var(--text-main)",
                        fontSize: "0.85rem",
                        outline: "none",
                      }}
                    />
                  </div>
                )}
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.75rem",
                      color: "var(--text-dim)",
                      marginBottom: "4px",
                    }}
                  >
                    Low Stock Threshold
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={newItem.minThreshold}
                    onChange={(e) =>
                      setNewItem({ ...newItem, minThreshold: e.target.value })
                    }
                    style={{
                      width: "100%",
                      background: "var(--bg-tertiary)",
                      border: "1px solid var(--border-card)",
                      borderRadius: "8px",
                      padding: "0.6rem 0.8rem",
                      color: "var(--text-main)",
                      fontSize: "0.85rem",
                      outline: "none",
                    }}
                  />
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  gap: "0.75rem",
                  marginTop: "0.75rem",
                }}
              >
                <button
                  type="button"
                  onClick={closeItemModal}
                  style={{
                    flex: 1,
                    padding: "0.7rem",
                    background: "var(--bg-tertiary)",
                    border: "1.5px solid var(--border-subtle)",
                    borderRadius: "8px",
                    color: "var(--text-main)",
                    fontSize: "0.85rem",
                    fontWeight: 700,
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    flex: 2,
                    padding: "0.7rem",
                    background: "linear-gradient(135deg, #f59e0b, #ea580c)",
                    border: "none",
                    borderRadius: "8px",
                    color: "#ffffff",
                    fontSize: "0.88rem",
                    fontWeight: 800,
                    cursor: "pointer",
                    boxShadow: "0 3px 12px rgba(234, 88, 12, 0.4)",
                  }}
                >
                  {editingItemId !== null ? "Save Changes" : "Save Ingredient"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Global Custom Delete Confirmation Modal */}
      <ConfirmDeleteModal {...confirmState} onCancel={cancelDelete} />
    </div>
  );
}
