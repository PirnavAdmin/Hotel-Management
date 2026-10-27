import React, { useState, useEffect, useRef } from "react";
import { logRouteChange, logUserAction } from "../utils/logger";
import {
  X,
  Plus,
  Trash2,
  Edit3,
  SquarePen,
  Star,
  Utensils,
  Users,
  LayoutGrid,
  ShieldCheck,
  Flame,
  Clock,
  Calendar,
  Check,
  CheckCircle2,
  ChefHat,
  Search,
  AlertCircle,
  Armchair,
  Save,
  RotateCcw,
  ExternalLink,
  Filter,
  ArrowLeft,
  Sun,
  Moon,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Package,
  FileText,
  BarChart3,
  Settings,
  Sparkles,
  Boxes,
} from "lucide-react";
import { formatCurrency } from "../utils/formatCurrency";
import { LoginManagement } from "./LoginManagement";
import { ProfileDropdown } from "../common/ProfileDropdown";
import { CustomCreatableDropdown } from "../common/CustomCreatableDropdown";
import {
  ConfirmDeleteModal,
  useConfirmDelete,
} from "../common/ConfirmDeleteModal";
import { AdminSidebar } from "./AdminSidebar";
import { AdminHeader } from "./AdminHeader";
import { AdminOverview } from "./AdminOverview";
import { AdminInventory } from "./AdminInventory";
import { AdminInvoices } from "./AdminInvoices";
import { AdminReports } from "./AdminReports";
import { AdminSettings } from "./AdminSettings";
import { BarWorkspace } from "../bar/BarWorkspace";
import { apiGetInventory, apiCreateInventoryItem } from "../api/inventoryApi";
import { apiVacateTable, apiUpdateTableStatus } from "../api/tableApi";
import { API_BASE_URL, openOptionalEventStream } from "../api/apiConfig";
import {
  apiCreateMenuCategory,
  apiGetMenuCategories,
  apiUploadMenuImage,
} from "../api/menuApi";
import {
  getMenuItemImage,
  handleDishImageError,
  getRelevantLocalFallback,
} from "../utils/menuImageHelper";

const RESTAURANT_SETTINGS_KEY = "gourmet_pos_settings_v1";

const MENU_RECIPE_UNITS = ["KG", "g", "L", "ml", "Pcs", "Cans", "Packets"];

export function inferIngredientCategory(rawName = "") {
  const name = String(rawName || "").toLowerCase().trim();
  if (/chicken|mutton|fish|prawn|lamb|meat|egg|beef|pork|bacon|sausage/i.test(name)) return "Meat & Seafood";
  if (/rice|basmati|wheat|flour|maida|atta|rava|suji|noodle|pasta|corn|grain|dal|lentil/i.test(name)) return "Grains & Rice";
  if (/paneer|milk|cheese|butter|curd|yogurt|cream|ghee|dahi/i.test(name)) return "Dairy & Eggs";
  if (/onion|tomato|potato|garlic|ginger|coriander|chilli|capsicum|carrot|lemon|mint|veg|cabbage|spinach|mushroom/i.test(name)) return "Produce & Veggies";
  if (/oil|vinegar|sauce|ketchup|mayo|mustard|condiment/i.test(name)) return "Oils & Condiments";
  if (/salt|pepper|turmeric|cumin|jeera|masala|cardamom|clove|cinnamon|spice|powder|herb/i.test(name)) return "Spices & Seasoning";
  if (/coffee|tea|sugar|syrup|soda|juice|beverage|drink|beer|wine|whiskey|vodka|rum/i.test(name)) return "Beverages & Bar";
  if (/bun|bread|toast|pav|tortilla|pita|roti|naan|bakery/i.test(name)) return "Bakery & Bread";
  if (/box|foil|cup|straw|bag|napkin|container|wrap/i.test(name)) return "Packaging & Disposables";
  return "General Supplies";
}

export function getStandardDishSuggestions(dishName = "", category = "") {
  const name = String(dishName || "").toLowerCase().trim();
  const cat = String(category || "").toLowerCase().trim();

  if (name.includes("biryani") || name.includes("pulao")) {
    const isVeg = name.includes("veg") || name.includes("paneer") || cat.includes("veg");
    return [
      { name: "Basmati Rice", quantity: "0.20", unit: "KG", category: "Grains & Rice" },
      { name: isVeg ? "Fresh Paneer" : "Raw Chicken", quantity: "0.25", unit: "KG", category: isVeg ? "Dairy & Eggs" : "Meat & Seafood" },
      { name: "Cooking Oil", quantity: "0.04", unit: "L", category: "Oils & Condiments" },
      { name: "Onions & Mint", quantity: "0.08", unit: "KG", category: "Produce & Veggies" },
      { name: "Biryani Spices & Masala", quantity: "0.02", unit: "KG", category: "Spices & Seasoning" },
    ];
  }

  if (name.includes("fried rice") || name.includes("schezwan rice")) {
    const isVeg = name.includes("veg") || cat.includes("veg");
    return [
      { name: "Cooked Rice", quantity: "0.25", unit: "KG", category: "Grains & Rice" },
      { name: isVeg ? "Chopped Veggies" : "Chicken & Egg", quantity: "0.15", unit: "KG", category: isVeg ? "Produce & Veggies" : "Meat & Seafood" },
      { name: "Refined Oil", quantity: "0.03", unit: "L", category: "Oils & Condiments" },
      { name: "Soy & Chilli Sauce", quantity: "0.03", unit: "L", category: "Oils & Condiments" },
    ];
  }

  if (name.includes("noodle") || name.includes("chowmein") || name.includes("hakka")) {
    const isVeg = name.includes("veg") || cat.includes("veg");
    return [
      { name: "Raw Noodles", quantity: "0.20", unit: "KG", category: "Grains & Rice" },
      { name: isVeg ? "Bell Peppers & Cabbage" : "Chicken Shreds", quantity: "0.10", unit: "KG", category: isVeg ? "Produce & Veggies" : "Meat & Seafood" },
      { name: "Stir Fry Oil", quantity: "0.03", unit: "L", category: "Oils & Condiments" },
      { name: "Soy & Garlic Sauce", quantity: "0.03", unit: "L", category: "Oils & Condiments" },
    ];
  }

  if (name.includes("paneer") || name.includes("butter masala") || name.includes("tikka masala")) {
    return [
      { name: "Fresh Paneer", quantity: "0.20", unit: "KG", category: "Dairy & Eggs" },
      { name: "Cooking Butter & Cream", quantity: "0.05", unit: "KG", category: "Dairy & Eggs" },
      { name: "Tomato & Onion Gravy", quantity: "0.15", unit: "KG", category: "Produce & Veggies" },
      { name: "Garam Masala Spices", quantity: "0.02", unit: "KG", category: "Spices & Seasoning" },
    ];
  }

  if (name.includes("chicken") || name.includes("curry") || name.includes("masala")) {
    return [
      { name: "Raw Chicken", quantity: "0.30", unit: "KG", category: "Meat & Seafood" },
      { name: "Curry Gravies & Onions", quantity: "0.15", unit: "KG", category: "Produce & Veggies" },
      { name: "Cooking Oil", quantity: "0.04", unit: "L", category: "Oils & Condiments" },
      { name: "Curry Spices", quantity: "0.02", unit: "KG", category: "Spices & Seasoning" },
    ];
  }

  if (name.includes("burger")) {
    return [
      { name: "Burger Buns", quantity: "1", unit: "Pcs", category: "Bakery & Bread" },
      { name: "Burger Patty", quantity: "1", unit: "Pcs", category: "Meat & Seafood" },
      { name: "Cheese Slice", quantity: "1", unit: "Pcs", category: "Dairy & Eggs" },
      { name: "Lettuce & Burger Sauce", quantity: "0.04", unit: "KG", category: "Oils & Condiments" },
    ];
  }

  if (name.includes("pizza")) {
    return [
      { name: "Pizza Base", quantity: "1", unit: "Pcs", category: "Bakery & Bread" },
      { name: "Mozzarella Cheese", quantity: "0.10", unit: "KG", category: "Dairy & Eggs" },
      { name: "Pizza Marinara Sauce", quantity: "0.05", unit: "KG", category: "Oils & Condiments" },
      { name: "Toppings (Veggies/Meat)", quantity: "0.08", unit: "KG", category: "Produce & Veggies" },
    ];
  }

  if (name.includes("coffee")) {
    return [
      { name: "Coffee Powder / Beans", quantity: "0.02", unit: "KG", category: "Beverages & Bar" },
      { name: "Fresh Milk", quantity: "0.18", unit: "L", category: "Dairy & Eggs" },
      { name: "Sugar", quantity: "0.015", unit: "KG", category: "Grains & Rice" },
    ];
  }

  if (name.includes("tea") || name.includes("chai")) {
    return [
      { name: "Tea Leaves", quantity: "0.015", unit: "KG", category: "Beverages & Bar" },
      { name: "Fresh Milk", quantity: "0.12", unit: "L", category: "Dairy & Eggs" },
      { name: "Sugar", quantity: "0.015", unit: "KG", category: "Grains & Rice" },
    ];
  }

  if (name.includes("shake") || name.includes("smoothie") || name.includes("juice")) {
    return [
      { name: "Fresh Milk / Juice Base", quantity: "0.25", unit: "L", category: "Beverages & Bar" },
      { name: "Flavor Syrup / Fruit", quantity: "0.05", unit: "KG", category: "Produce & Veggies" },
      { name: "Sugar", quantity: "0.02", unit: "KG", category: "Grains & Rice" },
    ];
  }

  // Default generic recipe
  return [
    { name: `${dishName.trim()} Main Ingredient`, quantity: "0.20", unit: "KG", category: inferIngredientCategory(dishName) },
    { name: "Cooking Oil / Butter", quantity: "0.03", unit: "L", category: "Oils & Condiments" },
    { name: "Seasoning & Spices", quantity: "0.01", unit: "KG", category: "Spices & Seasoning" },
  ];
}

export function getApproximateIngredientMrp(rawName = "", unit = "KG") {
  const name = String(rawName || "").toLowerCase();
  const normalizedUnit = String(unit || "KG");

  const approximateRates = {
    chicken: 280,
    mutton: 700,
    paneer: 360,
    egg: 8,
    prawn: 650,
    fish: 420,
    rice: 120,
    flour: 55,
    noodles: 140,
    pasta: 180,
    milk: 65,
    cheese: 420,
    butter: 550,
    cream: 280,
    ghee: 650,
    curd: 90,
    onion: 40,
    tomato: 50,
    potato: 35,
    garlic: 180,
    ginger: 160,
    coriander: 25,
    mint: 30,
    chilli: 120,
    capsicum: 90,
    carrot: 60,
    lemon: 120,
    vegetable: 70,
    oil: 180,
    sauce: 220,
    sugar: 50,
    spice: 250,
    masala: 280,
    salt: 25,
    coffee: 900,
    tea: 700,
    syrup: 300,
    juice: 120,
    bread: 180,
    bun: 120,
    pizza: 180,
  };

  const matchingRate = Object.entries(approximateRates).find(([keyword]) =>
    name.includes(keyword),
  );
  let rate = matchingRate?.[1] ?? 100;

  if (normalizedUnit === "Pcs") {
    rate = name.includes("egg") ? 8 : name.includes("bread") || name.includes("bun") ? 10 : 50;
  } else if (normalizedUnit === "ml") {
    rate = rate / 1000;
  } else if (normalizedUnit === "g") {
    rate = rate / 1000;
  } else if (normalizedUnit === "L") {
    rate = rate;
  }

  return Number(rate.toFixed(2));
}

export async function autoGenerateInventoryFromRecipe(recipe = []) {
  if (!Array.isArray(recipe) || recipe.length === 0) return [];

  const STORAGE_KEY = "gourmet_pos_inventory_v1";
  let currentInventory = [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) currentInventory = JSON.parse(raw);
  } catch {}
  if (!Array.isArray(currentInventory)) currentInventory = [];

  const updatedInventory = [...currentInventory];
  const mappedRecipe = [];
  let inventoryChanged = false;

  for (const ing of recipe) {
    const rawName = String(ing?.name || "").trim();
    if (!rawName) continue;

    const unit = (ing.unit === "Litres" ? "L" : (ing.unit || "KG")).toUpperCase();
    const quantity = Number(ing.quantity) || 0;
    const category = ing.category || inferIngredientCategory(rawName);

    // 1. Match existing by canonical name
    let existingItem = updatedInventory.find(
      (item) => (item.name || "").trim().toLowerCase() === rawName.toLowerCase()
    );

    // 2. Or match by ID if inventoryId was provided
    if (!existingItem && ing.inventoryId) {
      existingItem = updatedInventory.find(
        (item) => String(item.id) === String(ing.inventoryId)
      );
    }

    if (existingItem) {
      const currentMrp = Number(existingItem.mrp ?? existingItem.unitCost ?? 0);
      if (!Number.isFinite(currentMrp) || currentMrp <= 0) {
        const sampleMrp = getApproximateIngredientMrp(rawName, existingItem.unit || unit);
        existingItem.mrp = sampleMrp;
        existingItem.unitCost = sampleMrp;
        inventoryChanged = true;
      }
      mappedRecipe.push({
        inventoryId: existingItem.id,
        name: existingItem.name,
        quantity,
        unit: existingItem.unit || unit,
        category: existingItem.category || category,
      });
    } else {
      // Auto-generate new item in Inventory!
      const newId = `inv-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const sampleMrp = getApproximateIngredientMrp(rawName, unit);
      const newStockItem = {
        id: newId,
        name: rawName,
        category: category,
        subcategory: "",
        supplier: "Local Supplier",
        unit: unit,
        stock: 50,
        minThreshold: 10,
        unitCost: sampleMrp,
        mrp: sampleMrp,
        totalUsed: 0,
        totalRestocked: 50,
        lastRestocked: new Date().toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }),
      };

      updatedInventory.unshift(newStockItem);
      inventoryChanged = true;

      try {
        const createResult = await apiCreateInventoryItem(newStockItem);
        const createdItem = createResult?.data?.data || createResult?.data?.item || createResult?.data;
        const backendId = Number(createdItem?.ingredientId ?? createdItem?.IngredientId ?? createdItem?.id);
        if (createResult?.success && Number.isFinite(backendId) && backendId > 0) {
          newStockItem.id = String(backendId);
          newStockItem.ingredientId = backendId;
        } else {
          throw new Error(createResult?.error || "Inventory API create failed");
        }
      } catch (error) {
        console.warn("Inventory database create failed; keeping local cache:", error);
      }

      mappedRecipe.push({
        inventoryId: newStockItem.id,
        name: newStockItem.name,
        quantity,
        unit: newStockItem.unit,
        category: newStockItem.category,
      });
    }
  }

  if (inventoryChanged) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedInventory));
      window.dispatchEvent(
        new CustomEvent("avsr-inventory-updated", { detail: updatedInventory })
      );
      try {
        fetch(`${API_BASE_URL}/api/sync`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "ngrok-skip-browser-warning": "true",
          },
          body: JSON.stringify({ [STORAGE_KEY]: updatedInventory }),
        }).catch(() => {});
      } catch {}
    } catch {}
  }

  return mappedRecipe;
}

const STORAGE_KEY_CUSTOM_CATEGORIES = "pos_custom_menu_categories";
const STORAGE_KEY_CUSTOM_SECTIONS = "pos_custom_table_sections";
const STORAGE_KEY_CUSTOM_ROLES = "pos_custom_staff_roles";
const STORAGE_KEY_CUSTOM_SHIFTS = "pos_custom_staff_shifts";

export function AdminPortal({
  onClose,
  menuItems,
  onAddMenuItem,
  onUpdateMenuItem,
  onDeleteMenuItem,
  onSetMenuAvailability,
  onSetMenuSpecial,
  tables,
  onAddTable,
  onUpdateTable,
  onDeleteTable,
  onBarOrderUpdated,
  onBarOrderItemStatusUpdated,
  staffList,
  sharedRecordLoad,
  onAddStaff,
  onUpdateStaff,
  onDeleteStaff,
  onOpenKOTView,
  onUpdateItemKotStatus,
  onCompleteTableKot,
  isFullPage = false,
  currentSession = null,
  onLogout = null,
  currentTheme = "royal-saffron",
  onChangeTheme = null,
  pastOrders = [],
  onUpdateInvoiceDiscount = null,
  inventory: propInventory = [],
}) {
  const [activeTab, setActiveTab] = useState("overview");

  // Track Admin Portal Tab Navigation
  const prevTabRef = useRef(activeTab);
  useEffect(() => {
    if (prevTabRef.current !== activeTab) {
      logRouteChange(`Admin Tab: ${prevTabRef.current}`, `Admin Tab: ${activeTab}`);
      prevTabRef.current = activeTab;
    }
  }, [activeTab]);

  const [inventory, setInventory] = useState(() => {
    if (Array.isArray(propInventory) && propInventory.length > 0) return propInventory;
    try {
      const saved = localStorage.getItem("gourmet_pos_inventory_v1");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [];
  });

  useEffect(() => {
    if (Array.isArray(propInventory) && propInventory.length > 0) {
      setInventory(propInventory);
    }
  }, [propInventory]);

  useEffect(() => {
    if (!inventory || inventory.length === 0) {
      apiGetInventory()
        .then((res) => {
          const payload = res?.data ?? res;
          const rows = Array.isArray(payload)
            ? payload
            : Array.isArray(payload?.data)
              ? payload.data
              : Array.isArray(payload?.ingredients)
                ? payload.ingredients
                : [];
          if (rows.length > 0) {
            setInventory(rows);
            try {
              localStorage.setItem("gourmet_pos_inventory_v1", JSON.stringify(rows));
            } catch {}
          }
        })
        .catch(() => {});
    }

    const handleInvUpdated = (e) => {
      if (Array.isArray(e.detail) && e.detail.length > 0) {
        setInventory(e.detail);
      }
    };
    const handleStorage = (e) => {
      if (e.key === "gourmet_pos_inventory_v1" && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setInventory(parsed);
          }
        } catch {}
      }
    };
    window.addEventListener("avsr-inventory-updated", handleInvUpdated);
    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener("avsr-inventory-updated", handleInvUpdated);
      window.removeEventListener("storage", handleStorage);
    };
  }, [inventory]);
  const { confirmState, requestDelete, cancelDelete } = useConfirmDelete();

  // Toggle between Dine (Restaurant) and Bar mode
  const [portalMode, setPortalMode] = useState(() => {
    try {
      return localStorage.getItem("avsr_portal_mode") === "bar" ? "bar" : "dine";
    } catch {
      return "dine";
    }
  });

  const [activeBarTab, setActiveBarTab] = useState(() => {
    try {
      const saved = localStorage.getItem("avsr_active_bar_tab");
      return ["bar-overview", "bar-drinks", "bar-tables", "bar-staff", "bar-kot", "bar-inventory", "bar-invoices", "bar-orders", "bar-reports", "bar-access", "bar-settings"].includes(saved) ? saved : "bar-overview";
    } catch {
      return "bar-overview";
    }
  });

  const handleBarTabChange = (tab) => {
    if (!["bar-overview", "bar-drinks", "bar-tables", "bar-staff", "bar-kot", "bar-inventory", "bar-invoices", "bar-orders", "bar-reports", "bar-access", "bar-settings"].includes(tab)) return;
    setActiveBarTab(tab);
    try { localStorage.setItem("avsr_active_bar_tab", tab); } catch {}
  };

  const handlePortalModeChange = (mode) => {
    setPortalMode(mode);
    // The work area is shared with other admin sections; start Bar at its
    // dashboard rather than preserving a previous section's scroll position.
    if (mode === "bar") {
      const workArea = document.getElementById("admin-work-area");
      if (workArea) workArea.scrollTop = 0;
      if (!activeBarTab?.startsWith("bar-")) handleBarTabChange("bar-overview");
    }
    try {
      localStorage.setItem("avsr_portal_mode", mode);
    } catch {}
  };

  const [showBarHeaderToggle, setShowBarHeaderToggle] = useState(() => {
    try {
      const saved = localStorage.getItem("avsr_show_bar_header_toggle");
      if (saved !== null) return JSON.parse(saved);
      const posSettings = JSON.parse(
        localStorage.getItem(RESTAURANT_SETTINGS_KEY) || "{}",
      );
      if (posSettings?.showBarHeaderToggle !== undefined) {
        return Boolean(posSettings.showBarHeaderToggle);
      }
      return true;
    } catch {
      return true;
    }
  });

  const handleToggleShowBarHeader = (enabled) => {
    setShowBarHeaderToggle(enabled);
    try {
      localStorage.setItem(
        "avsr_show_bar_header_toggle",
        JSON.stringify(enabled),
      );
    } catch {}
    if (!enabled && portalMode === "bar") {
      handlePortalModeChange("dine");
    }
  };

  const [searchFilter, setSearchFilter] = useState("");
  const emptyMenuFilters = {
    category: "",
    dietary: "",
    availability: "",
    special: "",
  };
  const [menuFilters, setMenuFilters] = useState(emptyMenuFilters);
  const updateMenuFilter = (key, value) => {
    setMenuFilters((previous) => ({ ...previous, [key]: value }));
    setMenuPage(1);
  };
  const clearMenuFilters = () => {
    setSearchFilter("");
    setMenuFilters(emptyMenuFilters);
    setMenuPage(1);
  };
  const [adminKotTableFilter, setAdminKotTableFilter] = useState("all");
  const [isKotTableDropdownOpen, setIsKotTableDropdownOpen] = useState(false);
  const [kotTableStatusFilter, setKotTableStatusFilter] = useState("all");
  const isTableOccupied = (tbl) => {
    if (!tbl) return false;
    const rawStatus = String(tbl?.status || "").trim().toLowerCase();
    if (rawStatus === "vacant") {
      return false;
    }
    const hasActiveItems = Array.isArray(tbl?.items) && tbl.items.some(
      (i) => i && i.status !== "cancelled" && i.kotStatus !== "cancelled",
    );
    const hasActiveGuests = Number(tbl?.guests || tbl?.occupiedChairs || 0) > 0;

    // Once bill is settled, a table has no active items and no guests, so it is strictly vacant!
    if (!hasActiveItems && !hasActiveGuests) {
      return false;
    }

    if (rawStatus === "occupied" || rawStatus === "dining" || rawStatus === "billed") {
      return true;
    }
    return hasActiveItems;
  };

  const emptyTableFilters = {
    search: "",
    status: "all",
  };
  const [tableFilters, setTableFilters] = useState(emptyTableFilters);
  const updateTableFilter = (key, value) =>
    setTableFilters((previous) => ({ ...previous, [key]: value }));
  const clearTableFilters = () => setTableFilters(emptyTableFilters);
  const hasActiveTableFilters = Boolean(
    tableFilters.search ||
    (tableFilters.status && tableFilters.status !== "all")
  );

  const normalizeTableFilterText = (value) =>
    String(value ?? "")
      .trim()
      .toLowerCase();

  const vacantTablesCount = tables.filter((t) => !isTableOccupied(t)).length;
  const occupiedTablesCount = tables.filter((t) => isTableOccupied(t)).length;

  const filteredTables = tables.filter((table) => {
    const query = normalizeTableFilterText(tableFilters.search);
    const isOccupied = isTableOccupied(table);
    const tableStatus = isOccupied ? "occupied" : "vacant";

    const matchesSearch =
      !query ||
      [
        table.name,
        table.tableNumber,
        table.number,
        table.id,
        `table ${table.id}`,
        `t${table.id}`,
        table.section,
        table.server,
      ].some((value) => normalizeTableFilterText(value).includes(query));

    const matchesStatus =
      !tableFilters.status ||
      tableFilters.status === "all" ||
      tableStatus === normalizeTableFilterText(tableFilters.status);

    return matchesSearch && matchesStatus;
  }).sort((a, b) => Number(a.id || 0) - Number(b.id || 0));

  const [tableSortField, setTableSortField] = useState("id");
  const [tableSortDirection, setTableSortDirection] = useState("asc");


  const handleTableSort = (field) => {
    if (tableSortField === field) {
      setTableSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setTableSortField(field);
      setTableSortDirection("asc");
    }
  };

  const sortedTables = React.useMemo(() => {
    return [...filteredTables].sort((a, b) => {
      let aVal = a[tableSortField];
      let bVal = b[tableSortField];
      if (tableSortField === "id") {
        aVal = Number(a.id || 0);
        bVal = Number(b.id || 0);
      } else if (tableSortField === "capacity") {
        aVal = Number(a.capacity || 0);
        bVal = Number(b.capacity || 0);
      } else if (tableSortField === "name") {
        aVal = String(a.name || `Table ${a.id || ""}`).toLowerCase();
        bVal = String(b.name || `Table ${b.id || ""}`).toLowerCase();
      } else if (tableSortField === "area") {
        aVal = String(a.section || "").toLowerCase();
        bVal = String(b.section || "").toLowerCase();
      } else if (tableSortField === "server") {
        aVal = String(a.server || "").toLowerCase();
        bVal = String(b.server || "").toLowerCase();
      } else if (tableSortField === "status") {
        aVal = isTableOccupied(a) ? "occupied" : "vacant";
        bVal = isTableOccupied(b) ? "occupied" : "vacant";
      } else {
        aVal = String(aVal || "").toLowerCase();
        bVal = String(bVal || "").toLowerCase();
      }
      if (aVal < bVal) return tableSortDirection === "asc" ? -1 : 1;
      if (aVal > bVal) return tableSortDirection === "asc" ? 1 : -1;
      return 0;
    });
  }, [filteredTables, tableSortField, tableSortDirection]);

  const emptyStaffFilters = {
    search: "",
    role: "",
    shift: "",
    assigned: "",
  };
  const [staffFilters, setStaffFilters] = useState(emptyStaffFilters);
  const updateStaffFilter = (key, value) =>
    setStaffFilters((previous) => ({ ...previous, [key]: value }));
  const clearStaffFilters = () => setStaffFilters(emptyStaffFilters);
  const hasActiveStaffFilters = Boolean(
    staffFilters.search ||
    staffFilters.role ||
    staffFilters.shift ||
    staffFilters.assigned
  );

  const staffRoleOptions = React.useMemo(() => {
    return [
      ...new Set(
        staffList
          .map((s) => String(s?.role || s?.roleTitle || "").trim())
          .filter(Boolean),
      ),
    ].sort();
  }, [staffList]);

  const staffShiftOptions = React.useMemo(() => {
    return [
      ...new Set(
        staffList
          .map((s) => String(s?.shift || "").trim())
          .filter(Boolean),
      ),
    ].sort();
  }, [staffList]);

  const filteredStaffList = React.useMemo(() => {
    return staffList.filter((person) => {
      const personName = String(
        person?.name ||
        person?.fullName ||
        person?.FullName ||
        person?.username ||
        "Unnamed staff",
      );
      const personRole = String(person?.role || person?.roleTitle || "Staff");
      const personPhone = String(person?.phone || "");
      const personShift = String(person?.shift || "");
      const assignedCount = tables.filter(
        (t) => (t.server || "").trim().toLowerCase() === personName.trim().toLowerCase(),
      ).length;

      if (staffFilters.search) {
        const q = staffFilters.search.toLowerCase().trim();
        const matches =
          personName.toLowerCase().includes(q) ||
          personPhone.toLowerCase().includes(q);
        if (!matches) return false;
      }
      if (staffFilters.role && personRole !== staffFilters.role) {
        return false;
      }
      if (staffFilters.shift && personShift !== staffFilters.shift) {
        return false;
      }
      if (staffFilters.assigned) {
        if (staffFilters.assigned === "assigned" && assignedCount === 0) return false;
        if (staffFilters.assigned === "unassigned" && assignedCount > 0) return false;
      }
      return true;
    });
  }, [staffList, tables, staffFilters]);

  const [currentTime, setCurrentTime] = useState(new Date());
  const [restaurantSettings, setRestaurantSettings] = useState(() => {
    try {
      return JSON.parse(
        localStorage.getItem(RESTAURANT_SETTINGS_KEY) || "null",
      );
    } catch {
      return null;
    }
  });
  const restaurantLogo = restaurantSettings?.logo || "";
  const restaurantName =
    restaurantSettings?.restaurantName?.trim() || "Restaurant";
  const restaurantTagline = restaurantSettings?.tagline?.trim() || "";

  useEffect(() => {
    let active = true;
    const applySettings = (settings) => {
      if (!settings || typeof settings !== "object") return;
      let localSettings = {};
      try {
        localSettings = JSON.parse(
          localStorage.getItem(RESTAURANT_SETTINGS_KEY) || "{}",
        );
      } catch {}
      // Shared server settings are authoritative across devices.
      const mergedSettings = { ...localSettings, ...settings };
      try {
        localStorage.setItem(
          RESTAURANT_SETTINGS_KEY,
          JSON.stringify(mergedSettings),
        );
      } catch {}
      if (active) setRestaurantSettings(mergedSettings);
    };

    fetch(`${API_BASE_URL}/api/state`, {
      headers: { "ngrok-skip-browser-warning": "true" },
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) =>
        applySettings(
          data?.[RESTAURANT_SETTINGS_KEY] ||
            data?.data?.[RESTAURANT_SETTINGS_KEY],
        ),
      )
      .catch(() => {});

    const events = openOptionalEventStream();
    if (events) {
      events.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          const settings =
            message?.payload?.[RESTAURANT_SETTINGS_KEY] ||
            message?.payload?.data?.[RESTAURANT_SETTINGS_KEY];
          if (settings) applySettings(settings);
        } catch {}
      };
    }

    return () => {
      active = false;
      events?.close();
    };
  }, []);

  const handleSaveRestaurantSettings = async (settings) => {
    const response = await fetch(`${API_BASE_URL}/api/sync`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "ngrok-skip-browser-warning": "true",
      },
      body: JSON.stringify({ [RESTAURANT_SETTINGS_KEY]: settings }),
    });
    if (!response.ok) {
      throw new Error(`Settings sync failed (HTTP ${response.status}).`);
    }
    const result = await response.json().catch(() => null);
    if (result?.success === false) {
      throw new Error(
        result.error ||
          result.message ||
          "The server rejected the settings update.",
      );
    }
    try {
      localStorage.setItem(RESTAURANT_SETTINGS_KEY, JSON.stringify(settings));
    } catch {}
    window.dispatchEvent(new Event("restaurant-settings-updated"));
    setRestaurantSettings(settings);
  };

  const themes = [
    { id: "royal-saffron", name: "Dark Theme", icon: "ðŸŒ™", label: "Dark" },
    { id: "light-bistro", name: "Light Theme", icon: "â˜€ï¸Â", label: "Light" },
  ];

  const handleThemeChange = (newTheme) => {
    if (onChangeTheme) {
      onChangeTheme(newTheme);
    } else {
      document.documentElement.setAttribute("data-theme", newTheme);
      try {
        localStorage.setItem("gourmet_pos_theme_v2", newTheme);
      } catch {}
    }
  };

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // --- CUSTOM DROPDOWN OPTIONS PERSISTENT STATE ---
  const [customCategories, setCustomCategories] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CUSTOM_CATEGORIES);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [customSections, setCustomSections] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CUSTOM_SECTIONS);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [customRoles, setCustomRoles] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CUSTOM_ROLES);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [customShifts, setCustomShifts] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CUSTOM_SHIFTS);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Persistent save helpers
  const saveCustomCategory = async (newCat) => {
    if (!newCat || !newCat.trim()) return;
    const trimmed = newCat.trim();
    const knownNames = [
      ...customCategories.map((category) =>
        typeof category === "string"
          ? category
          : category.name || category.label || category.value,
      ),
    ];
    if (
      !knownNames.some((name) => name?.toLowerCase() === trimmed.toLowerCase())
    ) {
      const result = await apiCreateMenuCategory(trimmed, knownNames.length);
      if (!result?.success || result.data?.success === false) {
        requestDelete({
          title: "Category Not Saved",
          message: `Category was not saved: ${result?.error || result?.data?.message || "API error"}`,
          confirmLabel: "Understood",
          cancelLabel: "Close",
          icon: <AlertCircle size={22} color="#f59e0b" />,
          onConfirm: () => {},
        });
        return;
      }
    }
    setCustomCategories((prev) => {
      if (prev.some((c) => c.toLowerCase() === trimmed.toLowerCase()))
        return prev;
      const updated = [...prev, trimmed];
      try {
        localStorage.setItem(
          STORAGE_KEY_CUSTOM_CATEGORIES,
          JSON.stringify(updated),
        );
      } catch {}
      return updated;
    });
  };

  const saveCustomSection = (newSec) => {
    if (!newSec || !newSec.trim()) return;
    const trimmed = newSec.trim();
    setCustomSections((prev) => {
      if (prev.some((s) => s.toLowerCase() === trimmed.toLowerCase()))
        return prev;
      const updated = [...prev, trimmed];
      try {
        localStorage.setItem(
          STORAGE_KEY_CUSTOM_SECTIONS,
          JSON.stringify(updated),
        );
      } catch {}
      return updated;
    });
  };

  const saveCustomRole = (newRole) => {
    if (!newRole || !newRole.trim()) return;
    const trimmed = newRole.trim();
    setCustomRoles((prev) => {
      if (prev.some((r) => r.toLowerCase() === trimmed.toLowerCase()))
        return prev;
      const updated = [...prev, trimmed];
      try {
        localStorage.setItem(STORAGE_KEY_CUSTOM_ROLES, JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const saveCustomShift = (newShift) => {
    if (!newShift || !newShift.trim()) return;
    const trimmed = newShift.trim();
    setCustomShifts((prev) => {
      if (prev.some((sh) => sh.toLowerCase() === trimmed.toLowerCase()))
        return prev;
      const updated = [...prev, trimmed];
      try {
        localStorage.setItem(
          STORAGE_KEY_CUSTOM_SHIFTS,
          JSON.stringify(updated),
        );
      } catch {}
      return updated;
    });
  };

  // Dynamic option lists for combobox dropdowns
  useEffect(() => {
    let active = true;
    apiGetMenuCategories().then((result) => {
      if (!active || !result?.success || result.data?.success === false) return;
      const raw =
        result.data?.categories ||
        result.data?.data ||
        result.data?.items ||
        result.data;
      if (!Array.isArray(raw)) return;
      const names = raw
        .map((item) =>
          typeof item === "string" ? item : item?.name || item?.categoryName,
        )
        .filter(Boolean);
      setCustomCategories((previous) => {
        const merged = [...previous];
        names.forEach((name) => {
          if (
            !merged.some(
              (value) =>
                String(
                  typeof value === "string"
                    ? value
                    : value.name || value.label || value.value,
                ).toLowerCase() === name.toLowerCase(),
            )
          )
            merged.push(name);
        });
        try {
          localStorage.setItem(
            STORAGE_KEY_CUSTOM_CATEGORIES,
            JSON.stringify(merged),
          );
        } catch {}
        return merged;
      });
    });
    return () => {
      active = false;
    };
  }, []);

  const allCategoryOptions = React.useMemo(() => {
    const map = new Map();
    customCategories.forEach((cat) => {
      const name =
        typeof cat === "string" ? cat : cat.name || cat.label || cat.value;
      if (name && !map.has(name.toLowerCase())) {
        map.set(name.toLowerCase(), { value: name, label: name });
      }
    });
    (menuItems || []).forEach((item) => {
      if (item.category) {
        const name = item.category;
        if (!map.has(name.toLowerCase())) {
          map.set(name.toLowerCase(), { value: name, label: name });
        }
      }
    });
    return Array.from(map.values());
  }, [customCategories, menuItems]);

  const allSectionOptions = React.useMemo(() => {
    const map = new Map();
    customSections.forEach((s) => {
      if (s && !map.has(s.toLowerCase())) {
        map.set(s.toLowerCase(), { value: s, label: s });
      }
    });
    (tables || []).forEach((tbl) => {
      if (tbl.section && !map.has(tbl.section.toLowerCase())) {
        map.set(tbl.section.toLowerCase(), {
          value: tbl.section,
          label: tbl.section,
        });
      }
    });
    return Array.from(map.values());
  }, [customSections, tables]);

  const allRoleOptions = React.useMemo(() => {
    const map = new Map();
    customRoles.forEach((r) => {
      if (r && !map.has(r.toLowerCase())) {
        map.set(r.toLowerCase(), { value: r, label: r });
      }
    });
    (staffList || []).forEach((st) => {
      if (st.role && !map.has(st.role.toLowerCase())) {
        map.set(st.role.toLowerCase(), { value: st.role, label: st.role });
      }
    });
    return Array.from(map.values());
  }, [customRoles, staffList]);

  const allShiftOptions = React.useMemo(() => {
    const map = new Map();
    customShifts.forEach((sh) => {
      if (sh && !map.has(sh.toLowerCase())) {
        map.set(sh.toLowerCase(), { value: sh, label: sh });
      }
    });
    (staffList || []).forEach((st) => {
      if (st.shift && !map.has(st.shift.toLowerCase())) {
        map.set(st.shift.toLowerCase(), { value: st.shift, label: st.shift });
      }
    });
    return Array.from(map.values());
  }, [customShifts, staffList]);

  // Available ingredients for recipe autocomplete
  const [availableIngredients, setAvailableIngredients] = useState(() => {
    try {
      const raw = localStorage.getItem("gourmet_pos_inventory_v1");
      if (raw) return JSON.parse(raw);
    } catch {}
    return [];
  });

  useEffect(() => {
    const handleInvSync = (e) => {
      if (Array.isArray(e.detail)) {
        setAvailableIngredients(e.detail);
      }
    };
    window.addEventListener("avsr-inventory-updated", handleInvSync);
    return () => window.removeEventListener("avsr-inventory-updated", handleInvSync);
  }, []);

  // --- ITEM MODAL STATE ---
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [isImageUploading, setIsImageUploading] = useState(false);
  const [itemForm, setItemForm] = useState({
    name: "",
    category: "",
    price: "",
    isVeg: false,
    isChefSpecial: false,
    spiceLevel: "",
    prepTime: "",
    description: "",
    image: "",
  });

  // --- TABLE MODAL STATE ---
  const [isTableModalOpen, setIsTableModalOpen] = useState(false);
  const [editingTable, setEditingTable] = useState(null);
  const [isNewServerMode, setIsNewServerMode] = useState(false);
  const [newServerName, setNewServerName] = useState("");
  const [newServerRole, setNewServerRole] = useState("");
  const [tableForm, setTableForm] = useState({
    name: "",
    section: "",
    capacity: "",
    server: staffList[0]?.name || "",
  });

  // --- STAFF (PERSONS) MODAL STATE ---
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [staffForm, setStaffForm] = useState({
    name: "",
    role: "",
    phone: "",
    shift: "",
  });

  // Open item modal for Add or Edit
  const handleOpenItemModal = (item = null) => {
    const fileInput = document.getElementById("dish-image-file-input");
    if (fileInput) fileInput.value = "";

    if (item) {
      setEditingItem(item);
      setItemForm({
        name: item.name,
        category: item.category || "",
        price: item.price,
        isVeg: item.isVeg,
        isChefSpecial: Boolean(
          item.isChefSpecial ?? item.isChefsSpecial ?? item.isSpecial,
        ),
        spiceLevel: item.spiceLevel || 0,
        prepTime: item.prepTime || "12 min",
        description: item.description || "",
        image: item.image || "",
        recipe: Array.isArray(item.recipe) ? item.recipe.map((r) => ({ ...r })) : [],
      });
    } else {
      setEditingItem(null);
      setItemForm({
        name: "",
        category: "",
        price: "",
        isVeg: false,
        isChefSpecial: false,
        spiceLevel: "",
        prepTime: "",
        description: "",
        image: "",
        recipe: [],
      });
    }
    setIsItemModalOpen(true);
  };

  // Recipe / Ingredients Builder Handlers
  const handleAddRecipeRow = () => {
    setItemForm((curr) => ({
      ...curr,
      recipe: [
        ...(curr.recipe || []),
        { name: "", quantity: "0.25", unit: "KG", category: "General Supplies" },
      ],
    }));
  };

  const handleUpdateRecipeRow = (idx, patch) => {
    setItemForm((curr) => ({
      ...curr,
      recipe: (curr.recipe || []).map((row, i) => {
        if (i !== idx) return row;
        const updated = { ...row, ...patch };
        if (patch.name && !patch.category) {
          const match = availableIngredients.find(
            (ai) => String(ai.name || "").trim().toLowerCase() === String(patch.name).trim().toLowerCase()
          );
          if (match) {
            updated.category = match.category;
            updated.unit = match.unit;
            updated.inventoryId = match.id;
          } else {
            updated.category = inferIngredientCategory(patch.name);
          }
        }
        return updated;
      }),
    }));
  };

  const handleRemoveRecipeRow = (idx) => {
    setItemForm((curr) => ({
      ...curr,
      recipe: (curr.recipe || []).filter((_, i) => i !== idx),
    }));
  };

  const handleAutoSuggestIngredients = () => {
    if (!itemForm.name.trim()) return;
    const suggestions = getStandardDishSuggestions(itemForm.name, itemForm.category);
    setItemForm((curr) => ({
      ...curr,
      recipe: suggestions,
    }));
  };

  const handleSaveItem = async (e) => {
    e.preventDefault();
    if (isImageUploading || !itemForm.name.trim()) return;

    let itemImage = (itemForm.image || "").trim();
    if (itemImage.includes("photo-1563379091339-03b21ab4a4f8")) {
      itemImage = getRelevantLocalFallback(itemForm);
    }

    // Auto-generate recipe ingredients directly into Inventory database
    let mappedRecipe = itemForm.recipe || [];
    if (Array.isArray(itemForm.recipe) && itemForm.recipe.length > 0) {
      mappedRecipe = await autoGenerateInventoryFromRecipe(itemForm.recipe);
    }

    const isSpecialValue = Boolean(itemForm.isChefSpecial);
    const payload = {
      ...itemForm,
      recipe: mappedRecipe,
      image: itemImage,
      price: Number(itemForm.price) || 0,
      isChefSpecial: isSpecialValue,
      isChefsSpecial: isSpecialValue,
      isSpecial: isSpecialValue,
    };

    let saved;
    if (editingItem) {
      saved = await onUpdateMenuItem({
        ...editingItem,
        ...payload,
      });
    } else {
      saved = await onAddMenuItem({
        id: `custom-${Date.now()}`,
        ...payload,
      });
    }
    if (saved === false) return;
    setIsItemModalOpen(false);
  };

  // Open table modal for Add or Edit
  const handleOpenTableModal = (tbl = null) => {
    setIsNewServerMode(false);
    setNewServerName("");
    setNewServerRole("");

    if (tbl) {
      setEditingTable(tbl);
      setTableForm({
        name: tbl.name,
        section: tbl.section,
        capacity: tbl.capacity,
        server: tbl.server,
      });
    } else {
      setEditingTable(null);
      // Auto suggest next table number
      const maxId = tables.reduce((m, t) => Math.max(m, Number(t.id) || 0), 0);
      setTableForm({
        name: "",
        section: "",
        capacity: "",
        server: staffList[0]?.name || "",
      });
    }
    setIsTableModalOpen(true);
  };

  const handleSaveTable = (e) => {
    e.preventDefault();
    if (!tableForm.name.trim()) return;

    if (tableForm.section) {
      saveCustomSection(tableForm.section);
    }

    let assignedServer = tableForm.server;
    if (isNewServerMode && newServerName.trim()) {
      assignedServer = newServerName.trim();
      onAddStaff({
        name: assignedServer,
        role: newServerRole.trim(),
        phone: "+91 98450 00000",
        shift: "",
      });
    }

    if (editingTable) {
      onUpdateTable({
        ...editingTable,
        name: tableForm.name,
        section: tableForm.section,
        capacity: Number(tableForm.capacity) || 2,
        server: assignedServer,
      });
    } else {
      const parsedNum = parseInt(tableForm.name.replace(/\D/g, ""), 10);
      const maxId = tables.reduce((m, t) => Math.max(m, Number(t.id) || 0), 0);
      const chosenId = Number.isFinite(parsedNum) && parsedNum > 0 ? parsedNum : maxId + 1;
      const formattedName = tableForm.name.trim().match(/^(?:table|t)\s*[-–—]?\s*\d+$/i)
        ? `Table ${parsedNum}`
        : (/^\d+$/.test(tableForm.name.trim()) ? `Table ${tableForm.name.trim()}` : tableForm.name.trim());
      onAddTable({
        id: chosenId,
        name: formattedName,
        section: tableForm.section,
        capacity: Number(tableForm.capacity) || 4,
        status: "vacant",
        guests: Number(tableForm.capacity) || 4,
        items: [],
        discountPercent: 0,
        serviceCharge: 5,
        orderTime: null,
        server: assignedServer,
      });
    }
    setIsTableModalOpen(false);
    setIsNewServerMode(false);
    setNewServerName("");
  };

  // Open staff modal for Add or Edit
  const handleOpenStaffModal = (person = null) => {
    if (person) {
      const personName = String(
        person?.name ||
          person?.fullName ||
          person?.FullName ||
          person?.username ||
          "",
      );
      const personRole = String(person?.role || person?.roleTitle || "");
      setEditingStaff(person);
      setStaffForm({
        name: personName,
        role: personRole,
        phone: person.phone || "",
        shift: person.shift || "",
      });
    } else {
      setEditingStaff(null);
      setStaffForm({
        name: "",
        role: "",
        phone: "",
        shift: "",
      });
    }
    setIsStaffModalOpen(true);
  };

  // Save Staff Person (Add or Edit)
  const handleSaveStaff = async (e) => {
    e.preventDefault();
    if (!staffForm.name.trim()) return;

    if (staffForm.role) {
      saveCustomRole(staffForm.role);
    }
    if (staffForm.shift) {
      saveCustomShift(staffForm.shift);
    }

    let saved;
    if (editingStaff) {
      if (onUpdateStaff) {
        saved = await onUpdateStaff({
          ...editingStaff,
          name: staffForm.name.trim(),
          role: staffForm.role,
          phone: staffForm.phone || "+91 98450 00000",
          shift: staffForm.shift,
        });
      }
    } else {
      saved = await onAddStaff({
        name: staffForm.name.trim(),
        role: staffForm.role,
        phone: staffForm.phone || "+91 98450 00000",
        shift: staffForm.shift,
      });
    }
    if (saved === false) return;

    setEditingStaff(null);
    setStaffForm({
      name: "",
      role: "",
      phone: "",
      shift: "",
    });
    setIsStaffModalOpen(false);
  };

  // Filtered menu items
  const filteredItems = menuItems.filter((item) => {
    const query = searchFilter.trim().toLowerCase();
    return (
      [item.name, item.description, item.category].some((value) =>
        String(value ?? "")
          .toLowerCase()
          .includes(query),
      ) &&
      (!menuFilters.category ||
        String(item.category ?? "").toLowerCase() ===
          menuFilters.category.toLowerCase()) &&
      (!menuFilters.dietary ||
        Boolean(item.isVeg) === (menuFilters.dietary === "veg")) &&
      (!menuFilters.availability ||
        (item.isAvailable !== false) ===
          (menuFilters.availability === "available")) &&
      (!menuFilters.special ||
        Boolean(item.isChefSpecial) === (menuFilters.special === "special"))
    );
  });

  // Small Pagination for Menu Items
  const [menuPage, setMenuPage] = useState(1);
  const [menuPageSize, setMenuPageSize] = useState(6);

  const totalMenuPages = Math.ceil(filteredItems.length / menuPageSize) || 1;
  const safeMenuPage = Math.min(Math.max(menuPage, 1), totalMenuPages);
  const startIdx = (safeMenuPage - 1) * menuPageSize;
  const paginatedItems = filteredItems.slice(startIdx, startIdx + menuPageSize);

  // Total capacity calculations
  const totalChairs = tables.reduce(
    (sum, t) => sum + (Number(t.capacity) || 0),
    0,
  );
  const occupiedChairs = tables
    .filter((t) => t.status !== "vacant")
    .reduce((sum, t) => sum + (Number(t.guests) || 0), 0);
  const tablesWithOrders = tables.filter((t) => t.items && t.items.length > 0);
  const activeKOTCount = tablesWithOrders.filter(
    (t) =>
      !t.items.every(
        (i) => i.kotStatus === "served" || i.kotStatus === "ready",
      ),
  ).length;

  return (
    <div
      className="admin-portal-root"
      style={
        isFullPage
          ? {
              display: "flex",
              height: "100vh",
              width: "100%",
              background: "var(--bg-primary)",
              overflow: "hidden",
            }
          : {
              position: "fixed",
              inset: 0,
              background: "var(--modal-overlay)",
              backdropFilter: "blur(10px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 120,
              padding: "1.25rem",
            }
      }
    >
      <div
        className="admin-portal-inner no-scrollbar"
        style={
          isFullPage
            ? {
                width: "100%",
                height: "100%",
                display: "flex",
                flexDirection: "row",
                overflow: "hidden",
              }
            : {
                background: "var(--bg-secondary)",
                border: "1px solid var(--border-card)",
                width: "100%",
                maxWidth: "1400px",
                height: "92vh",
                borderRadius: "16px",
                boxShadow: "var(--shadow-lg)",
                display: "flex",
                flexDirection: "row",
                overflow: "hidden",
              }
        }
      >
        {/* Left Sidebar */}
        <AdminSidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          currentSession={currentSession}
          onClose={onClose}
          onLogout={onLogout}
          menuCount={menuItems.length}
          tablesCount={tables.length}
          staffCount={staffList.length}
          activeKOTCount={activeKOTCount}
          restaurantLogo={restaurantLogo}
          restaurantName={restaurantName}
          restaurantTagline={restaurantTagline}
          portalMode={portalMode}
          activeBarTab={activeBarTab}
          setActiveBarTab={handleBarTabChange}
        />

        {/* Right Main Content Pane */}
        <div
          className="admin-portal-main-pane"
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            height: "100%",
            overflow: "hidden",
            background: "var(--bg-primary)",
            minWidth: 0,
          }}
        >
          {/* Top Bar Header */}
          <AdminHeader
            currentSession={currentSession}
            onLogout={onLogout}
            onClose={onClose}
            currentTheme={currentTheme}
            onChangeTheme={handleThemeChange}
            activeMode={portalMode}
            onModeChange={handlePortalModeChange}
            showModeToggle={showBarHeaderToggle}
          />

          {/* Scrollable Work Area */}
          <div
            id="admin-work-area"
            className="admin-work-area"
            style={{
              flex: 1,
              overflowY: "auto",
              padding:
                portalMode === "bar" || activeTab === "logins"
                  ? "1rem"
                  : "1.5rem 2rem",
              minHeight: 0,
            }}
          >
            {portalMode === "bar" ? (
              <BarWorkspace
                activeTab={activeBarTab}
                onNavigate={handleBarTabChange}
                menuItems={menuItems}
                onAddMenuItem={onAddMenuItem}
                onUpdateMenuItem={onUpdateMenuItem}
                onDeleteMenuItem={onDeleteMenuItem}
                onSetMenuAvailability={onSetMenuAvailability}
                inventory={inventory}
                pastOrders={pastOrders}
                restaurantName={restaurantName}
                restaurantSettings={restaurantSettings}
                onUpdateInvoiceDiscount={onUpdateInvoiceDiscount}
                tables={tables}
                staffList={staffList}
                sharedRecordLoad={sharedRecordLoad}
                onAddTable={onAddTable}
                onUpdateTable={onUpdateTable}
                onDeleteTable={onDeleteTable}
                onOrderUpdated={onBarOrderUpdated}
                onBarOrderItemStatusUpdated={onBarOrderItemStatusUpdated}
                onAddStaff={onAddStaff}
                onUpdateStaff={onUpdateStaff}
                onDeleteStaff={onDeleteStaff}
              />
            ) : (
              <>
                {/* OVERVIEW TAB */}
                {activeTab === "overview" && (
                  <AdminOverview
                    menuItems={menuItems}
                    tables={tables}
                    staffList={staffList}
                    pastOrders={pastOrders}
                    onNavigateTab={setActiveTab}
                    onOpenKOTView={onOpenKOTView}
                    onOpenItemModal={handleOpenItemModal}
                  />
                )}

                {/* TAB 1: MENU ITEMS */}
                {activeTab === "menu" && (
                  <div
                    style={{
                      background: "var(--bg-card)",
                      border: "1px solid var(--border-card)",
                      borderRadius: "12px",
                      padding: "0.75rem 0.85rem",
                    }}
                  >
                    {/* Header inside Card */}
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        flexWrap: "wrap",
                        gap: "0.65rem",
                        marginBottom: "0.75rem",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.65rem",
                        }}
                      >
                        <div
                          style={{
                            width: "38px",
                            height: "38px",
                            borderRadius: "10px",
                            background: "linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            boxShadow: "0 3px 12px rgba(245, 158, 11, 0.35)",
                            flexShrink: 0,
                          }}
                        >
                          <Utensils
                            size={18}
                            color="#ffffff"
                            strokeWidth={2.3}
                          />
                        </div>
                        <div>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "0.5rem",
                            }}
                          >
                            <h2
                              style={{
                                fontSize: "1.2rem",
                                fontWeight: 800,
                                color: "var(--text-main)",
                                margin: 0,
                              }}
                            >
                              Menu Items
                            </h2>
                            <span
                              style={{
                                background: "rgba(245, 158, 11, 0.15)",
                                border: "1px solid rgba(245, 158, 11, 0.3)",
                                color: "var(--accent-amber-light)",
                                fontSize: "0.74rem",
                                fontWeight: 700,
                                padding: "2px 8px",
                                borderRadius: "16px",
                              }}
                            >
                              {filteredItems.length} items
                            </span>
                          </div>
                          <p
                            style={{
                              fontSize: "0.78rem",
                              color: "var(--text-dim)",
                              margin: "2px 0 0 0",
                            }}
                          >
                            Manage your restaurant menu items, categories and
                            pricing
                          </p>
                        </div>
                      </div>

                      {/* Right: Search & Add button */}
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.65rem",
                          flexWrap: "wrap",
                        }}
                      >
                        <button
                          onClick={() => handleOpenItemModal()}
                          style={{
                            height: "36px",
                            background: "linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)",
                            color: "#ffffff",
                            border: "none",
                            borderRadius: "8px",
                            padding: "0 1.1rem",
                            fontWeight: 700,
                            fontSize: "0.82rem",
                            display: "flex",
                            alignItems: "center",
                            gap: "0.45rem",
                            cursor: "pointer",
                            boxShadow: "0 3px 12px rgba(245, 158, 11, 0.35)",
                          }}
                        >
                          <Plus size={16} strokeWidth={2.5} />
                          <span>Add New Dish / Biryani</span>
                        </button>
                      </div>
                    </div>

                    <div
                      className="menu-filter-toolbar menu-items-filter-toolbar"
                      role="search"
                      aria-label="Menu item filters"
                    >
                      <label className="menu-filter-field menu-filter-search">
                        <span>Search</span>
                        <div
                          style={{
                            position: "relative",
                            width: "100%",
                            height: "36px",
                            display: "flex",
                            alignItems: "center",
                          }}
                        >
                          <Search
                            size={15}
                            color="var(--text-dim)"
                            style={{
                              position: "absolute",
                              left: "12px",
                              pointerEvents: "none",
                            }}
                          />
                          <input
                            type="text"
                            placeholder="Search dishes to edit, delete..."
                            value={searchFilter}
                            onChange={(e) => {
                              setSearchFilter(e.target.value);
                              setMenuPage(1);
                            }}
                            aria-label="Search dishes"
                            style={{
                              width: "100%",
                              height: "100%",
                              background: "var(--bg-tertiary)",
                              border: "1px solid var(--border-card)",
                              borderRadius: "8px",
                              padding: "0 10px 0 34px",
                              color: "var(--text-main)",
                              fontSize: "0.82rem",
                              outline: "none",
                            }}
                          />
                        </div>
                      </label>
                      {[
                        {
                          key: "category",
                          label: "Category",
                          options: allCategoryOptions,
                        },
                        {
                          key: "dietary",
                          label: "Dietary Type",
                          options: [
                            { value: "veg", label: "Veg" },
                            { value: "non-veg", label: "Non-Veg" },
                          ],
                        },
                        {
                          key: "availability",
                          label: "Availability",
                          options: [
                            { value: "available", label: "Available" },
                            { value: "unavailable", label: "Unavailable" },
                          ],
                        },
                        {
                          key: "special",
                          label: "Special Dish",
                          options: [
                            { value: "special", label: "Special" },
                            { value: "regular", label: "Regular" },
                          ],
                        },
                      ].map(({ key, label, options }) => (
                        <label className="menu-filter-field" key={key}>
                          <span>{label}</span>
                          <select
                            value={menuFilters[key]}
                            onChange={(event) =>
                              updateMenuFilter(key, event.target.value)
                            }
                          >
                            <option value="">All</option>
                            {options.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </label>
                      ))}
                      <button
                        type="button"
                        className="menu-filter-clear"
                        onClick={clearMenuFilters}
                      >
                        Clear Filters
                      </button>
                    </div>

                    {/* Items Table List */}
                    <div
                      style={{
                        borderRadius: "10px",
                        border: "1px solid var(--border-card)",
                        overflowX: "auto",
                      }}
                    >
                      <table
                        style={{
                          width: "100%",
                          borderCollapse: "collapse",
                          textAlign: "left",
                          fontSize: "0.84rem",
                        }}
                      >
                        <thead>
                          <tr
                            style={{
                              background: "var(--bg-tertiary)",
                              borderBottom: "1px solid var(--border-subtle)",
                              color: "var(--text-muted)",
                              fontSize: "0.76rem",
                              fontWeight: 700,
                            }}
                          >
                            <th
                              style={{
                                padding: "0.6rem 0.85rem",
                                width: "44%",
                              }}
                            >
                              Dish Name
                            </th>
                            <th
                              style={{
                                padding: "0.6rem 0.85rem",
                                width: "14%",
                              }}
                            >
                              Category
                            </th>
                            <th
                              style={{
                                padding: "0.6rem 0.85rem",
                                width: "14%",
                              }}
                            >
                              Dietary
                            </th>
                            <th
                              style={{
                                padding: "0.6rem 0.85rem",
                                width: "12%",
                              }}
                            >
                              Price (₹)
                            </th>
                            <th
                              style={{
                                padding: "0.6rem 0.85rem",
                                width: "16%",
                                textAlign: "center",
                              }}
                            >
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {paginatedItems.length === 0 ? (
                            <tr>
                              <td
                                colSpan={5}
                                style={{
                                  padding: "2rem",
                                  textAlign: "center",
                                  color: "var(--text-muted)",
                                  fontSize: "0.85rem",
                                }}
                              >
                                No menu items match the selected filters.
                              </td>
                            </tr>
                          ) : (
                            paginatedItems.map((item) => {
                              const isAvail = item.isAvailable !== false;
                              return (
                                <tr
                                  key={item.id}
                                  style={{
                                    borderBottom: "1px solid var(--border-subtle)",
                                    transition:
                                      "background 0.15s ease, opacity 0.2s ease",
                                    opacity: isAvail ? 1 : 0.6,
                                    background: isAvail
                                      ? "transparent"
                                      : "rgba(239, 68, 68, 0.03)",
                                  }}
                                  onMouseEnter={(e) =>
                                    (e.currentTarget.style.background = isAvail
                                      ? "var(--bg-tertiary)"
                                      : "rgba(239, 68, 68, 0.07)")
                                  }
                                  onMouseLeave={(e) =>
                                    (e.currentTarget.style.background = isAvail
                                      ? "transparent"
                                      : "rgba(239, 68, 68, 0.03)")
                                  }
                                >
                                  <td style={{ padding: "0.6rem 0.85rem" }}>
                                    <div
                                      style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "0.75rem",
                                      }}
                                    >
                                      <img
                                        src={getMenuItemImage(item)}
                                        alt={item.name}
                                        style={{
                                          width: "52px",
                                          height: "52px",
                                          borderRadius: "10px",
                                          objectFit: "cover",
                                          border: isAvail
                                            ? "1px solid var(--border-card)"
                                            : "1px solid rgba(239, 68, 68, 0.35)",
                                          flexShrink: 0,
                                          filter: isAvail
                                            ? "none"
                                            : "grayscale(60%)",
                                        }}
                                        onError={(e) =>
                                          handleDishImageError(e, item)
                                        }
                                      />
                                      <div style={{ minWidth: 0, flex: 1 }}>
                                        <div
                                          style={{
                                            fontWeight: 800,
                                            color: isAvail
                                              ? "var(--text-main)"
                                              : "var(--text-dim)",
                                            fontSize: "0.92rem",
                                            lineHeight: 1.3,
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "6px",
                                          }}
                                        >
                                          <span>{item.name}</span>
                                          {Boolean(
                                            item.isChefSpecial ||
                                            item.isChefsSpecial ||
                                            item.isSpecial,
                                          ) && (
                                            <Star
                                              size={14}
                                              fill="#f59e0b"
                                              color="#f59e0b"
                                              title="Chef's Special"
                                              style={{
                                                flexShrink: 0,
                                                filter:
                                                  "drop-shadow(0 0 3px rgba(245, 158, 11, 0.45))",
                                              }}
                                            />
                                          )}
                                        </div>
                                        <div
                                          style={{
                                            fontSize: "0.72rem",
                                            color: "var(--text-muted)",
                                            lineHeight: 1.35,
                                            marginTop: "2px",
                                            display: "-webkit-box",
                                            WebkitLineClamp: 2,
                                            WebkitBoxOrient: "vertical",
                                            overflow: "hidden",
                                          }}
                                        >
                                          {item.prepTime || ""} •{" "}
                                          {item.description}
                                        </div>
                                      </div>
                                    </div>
                                  </td>
                                  <td
                                    style={{
                                      padding: "0.6rem 0.85rem",
                                      textTransform: "capitalize",
                                      color: "var(--text-main)",
                                      fontSize: "0.84rem",
                                      fontWeight: 600,
                                      whiteSpace: "nowrap",
                                    }}
                                  >
                                    {item.category.replace("-", " ")}
                                  </td>
                                  <td style={{ padding: "0.6rem 0.85rem" }}>
                                    {item.isVeg ? (
                                      <span
                                        style={{
                                          background: "rgba(16, 185, 129, 0.12)",
                                          border: "1px solid rgba(16, 185, 129, 0.28)",
                                          color: "var(--success)",
                                          borderRadius: "14px",
                                          padding: "3px 10px",
                                          fontSize: "0.68rem",
                                          fontWeight: 700,
                                          display: "inline-flex",
                                          alignItems: "center",
                                          whiteSpace: "nowrap",
                                        }}
                                      >
                                        VEG
                                      </span>
                                    ) : (
                                      <span
                                        style={{
                                          background: "rgba(239, 68, 68, 0.12)",
                                          border: "1px solid rgba(239, 68, 68, 0.28)",
                                          color: "var(--danger)",
                                          borderRadius: "14px",
                                          padding: "3px 10px",
                                          fontSize: "0.68rem",
                                          fontWeight: 700,
                                          display: "inline-flex",
                                          alignItems: "center",
                                          whiteSpace: "nowrap",
                                        }}
                                      >
                                        NON-VEG
                                      </span>
                                    )}
                                  </td>
                                  <td
                                    style={{
                                      padding: "0.6rem 0.85rem",
                                      fontWeight: 800,
                                      color: "var(--accent-amber-light)",
                                      fontSize: "0.92rem",
                                      whiteSpace: "nowrap",
                                    }}
                                  >
                                    ₹{Number(item.price).toFixed(2)}
                                  </td>
                                  <td
                                    style={{
                                      padding: "0.6rem 0.85rem",
                                      textAlign: "center",
                                      whiteSpace: "nowrap",
                                    }}
                                  >
                                    <div
                                      style={{
                                        display: "inline-flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        gap: "0.45rem",
                                      }}
                                    >
                                      <button
                                        onClick={() =>
                                          onSetMenuAvailability?.(
                                            item.id,
                                            item.isAvailable === false,
                                          )
                                        }
                                        title={
                                          item.isAvailable === false
                                            ? "Make available"
                                            : "Mark unavailable"
                                        }
                                        style={{
                                          border:
                                            item.isAvailable === false
                                              ? "1px solid rgba(239, 68, 68, 0.45)"
                                              : "1px solid rgba(16, 185, 129, 0.45)",
                                          background:
                                            item.isAvailable === false
                                              ? "rgba(239, 68, 68, 0.12)"
                                              : "rgba(16, 185, 129, 0.12)",
                                          color:
                                            item.isAvailable === false
                                              ? "#ef4444"
                                              : "#10b981",
                                          borderRadius: "6px",
                                          padding: "4px 9px",
                                          fontSize: "0.74rem",
                                          fontWeight: 700,
                                          cursor: "pointer",
                                          transition: "all 0.15s ease",
                                        }}
                                        onMouseEnter={(e) => {
                                          e.currentTarget.style.background =
                                            item.isAvailable === false
                                              ? "rgba(239, 68, 68, 0.22)"
                                              : "rgba(16, 185, 129, 0.22)";
                                          e.currentTarget.style.borderColor =
                                            item.isAvailable === false
                                              ? "rgba(239, 68, 68, 0.7)"
                                              : "rgba(16, 185, 129, 0.7)";
                                        }}
                                        onMouseLeave={(e) => {
                                          e.currentTarget.style.background =
                                            item.isAvailable === false
                                              ? "rgba(239, 68, 68, 0.12)"
                                              : "rgba(16, 185, 129, 0.12)";
                                          e.currentTarget.style.borderColor =
                                            item.isAvailable === false
                                              ? "rgba(239, 68, 68, 0.45)"
                                              : "rgba(16, 185, 129, 0.45)";
                                        }}
                                      >
                                        {item.isAvailable === false
                                          ? "Unavailable"
                                          : "Available"}
                                      </button>
                                      <button
                                        onClick={() =>
                                          handleOpenItemModal(item)
                                        }
                                        style={{
                                          border: "1px solid rgba(245, 158, 11, 0.45)",
                                          background: "rgba(245, 158, 11, 0.06)",
                                          color: "var(--accent-amber-light)",
                                          borderRadius: "6px",
                                          padding: "4px 12px",
                                          fontSize: "0.78rem",
                                          fontWeight: 700,
                                          display: "flex",
                                          alignItems: "center",
                                          gap: "4px",
                                          cursor: "pointer",
                                          transition: "all 0.15s ease",
                                        }}
                                        title="Edit item"
                                      >
                                        <SquarePen size={13} />
                                        <span>Edit</span>
                                      </button>

                                      <button
                                        onClick={() => {
                                          requestDelete({
                                            title: "Delete Menu Item?",
                                            message: `Are you sure you want to delete "${item.name}" from the restaurant menu? This action cannot be undone.`,
                                            confirmLabel: "Yes, Delete",
                                            onConfirm: () =>
                                              onDeleteMenuItem(item.id),
                                          });
                                        }}
                                        style={{
                                          border: "1px solid rgba(239, 68, 68, 0.45)",
                                          background: "rgba(239, 68, 68, 0.06)",
                                          color: "var(--danger)",
                                          borderRadius: "6px",
                                          padding: "4px 12px",
                                          fontSize: "0.78rem",
                                          fontWeight: 700,
                                          display: "flex",
                                          alignItems: "center",
                                          gap: "4px",
                                          cursor: "pointer",
                                          transition: "all 0.15s ease",
                                        }}
                                        title="Delete item"
                                      >
                                        <Trash2 size={13} />
                                        <span>Delete</span>
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>

                      {/* Small Compact Pagination at Bottom */}
                      {filteredItems.length > 0 && (
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            padding: "0.5rem 0.85rem",
                            borderTop: "1px solid var(--border-subtle)",
                            background: "var(--bg-tertiary)",
                            fontSize: "0.74rem",
                            color: "var(--text-muted)",
                            flexWrap: "wrap",
                            gap: "0.5rem",
                          }}
                        >
                          {/* Left: Range text */}
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "0.4rem",
                            }}
                          >
                            <span>
                              Showing{" "}
                              <strong
                                style={{
                                  color: "var(--text-main)",
                                  fontWeight: 700,
                                }}
                              >
                                {startIdx + 1}
                              </strong>
                              –
                              <strong
                                style={{
                                  color: "var(--text-main)",
                                  fontWeight: 700,
                                }}
                              >
                                {Math.min(
                                  startIdx + menuPageSize,
                                  filteredItems.length,
                                )}
                              </strong>{" "}
                              of{" "}
                              <strong
                                style={{
                                  color: "var(--text-main)",
                                  fontWeight: 700,
                                }}
                              >
                                {filteredItems.length}
                              </strong>{" "}
                              items
                            </span>
                          </div>

                          {/* Right: Small Controls */}
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "0.5rem",
                            }}
                          >
                            {/* Per-page selector (small) */}
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "0.3rem",
                              }}
                            >
                              <span
                                style={{
                                  fontSize: "0.7rem",
                                  color: "var(--text-muted)",
                                }}
                              >
                                Per page:
                              </span>
                              <select
                                value={menuPageSize}
                                onChange={(e) => {
                                  setMenuPageSize(Number(e.target.value));
                                  setMenuPage(1);
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
                                  height: "24px",
                                }}
                              >
                                <option value={5}>5</option>
                                <option value={6}>6</option>
                                <option value={8}>8</option>
                                <option value={10}>10</option>
                                <option value={20}>20</option>
                              </select>
                            </div>

                            {/* Page Buttons */}
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "0.25rem",
                              }}
                            >
                              <button
                                onClick={() =>
                                  setMenuPage((p) => Math.max(1, p - 1))
                                }
                                disabled={safeMenuPage === 1}
                                style={{
                                  height: "24px",
                                  padding: "0 6px",
                                  borderRadius: "5px",
                                  background:
                                    safeMenuPage === 1
                                      ? "rgba(var(--surface-rgb),0.02)"
                                      : "rgba(var(--surface-rgb),0.06)",
                                  border: "1px solid var(--neutral-border)",
                                  color:
                                    safeMenuPage === 1 ? "#475569" : "var(--text-muted)",
                                  cursor:
                                    safeMenuPage === 1
                                      ? "not-allowed"
                                      : "pointer",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "2px",
                                  fontSize: "0.72rem",
                                  fontWeight: 600,
                                  transition: "all 0.15s ease",
                                }}
                                title="Previous page"
                              >
                                <ChevronLeft size={13} />
                                <span>Prev</span>
                              </button>

                              {Array.from(
                                { length: totalMenuPages },
                                (_, i) => i + 1,
                              ).map((page) => {
                                const isActive = page === safeMenuPage;
                                return (
                                  <button
                                    key={page}
                                    onClick={() => setMenuPage(page)}
                                    style={{
                                      height: "24px",
                                      minWidth: "24px",
                                      padding: "0 5px",
                                      borderRadius: "5px",
                                      background: isActive
                                        ? "linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)"
                                        : "transparent",
                                      border: isActive
                                        ? "none"
                                        : "1px solid rgba(var(--surface-rgb),0.08)",
                                      color: isActive ? "#ffffff" : "var(--text-dim)",
                                      cursor: "pointer",
                                      fontSize: "0.72rem",
                                      fontWeight: isActive ? 800 : 500,
                                      boxShadow: isActive
                                        ? "0 2px 8px rgba(245, 158, 11, 0.35)"
                                        : "none",
                                      transition: "all 0.15s ease",
                                    }}
                                  >
                                    {page}
                                  </button>
                                );
                              })}

                              <button
                                onClick={() =>
                                  setMenuPage((p) =>
                                    Math.min(totalMenuPages, p + 1),
                                  )
                                }
                                disabled={safeMenuPage === totalMenuPages}
                                style={{
                                  height: "24px",
                                  padding: "0 6px",
                                  borderRadius: "5px",
                                  background:
                                    safeMenuPage === totalMenuPages
                                      ? "rgba(var(--surface-rgb),0.02)"
                                      : "rgba(var(--surface-rgb),0.06)",
                                  border: "1px solid var(--neutral-border)",
                                  color:
                                    safeMenuPage === totalMenuPages
                                      ? "#475569"
                                      : "var(--text-muted)",
                                  cursor:
                                    safeMenuPage === totalMenuPages
                                      ? "not-allowed"
                                      : "pointer",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "2px",
                                  fontSize: "0.72rem",
                                  fontWeight: 600,
                                  transition: "all 0.15s ease",
                                }}
                                title="Next page"
                              >
                                <span>Next</span>
                                <ChevronRight size={13} />
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* ================= TAB 2: TABLES & CHAIRS (PERSONS CAPACITY) ================= */}
                {activeTab === "tables" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                    {/* Header: Title + Add New Table Button */}
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "0.2rem 0",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.75rem",
                        }}
                      >
                        <div
                          style={{
                            width: "36px",
                            height: "36px",
                            borderRadius: "8px",
                            background: "rgba(245, 158, 11, 0.15)",
                            border: "1.5px solid rgba(245, 158, 11, 0.4)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "var(--accent-amber-light)",
                          }}
                        >
                          <Armchair size={22} color="#f59e0b" />
                        </div>
                        <h2
                          style={{
                            fontSize: "1.25rem",
                            fontWeight: 800,
                            color: "var(--text-main)",
                            letterSpacing: "-0.01em",
                            margin: 0,
                          }}
                        >
                          Floor Tables & Chair Configuration
                        </h2>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleOpenTableModal()}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.45rem",
                          padding: "0.55rem 1.3rem",
                          background: "linear-gradient(135deg, #f97316 0%, #ea580c 100%)",
                          color: "#ffffff",
                          borderRadius: "8px",
                          fontWeight: 700,
                          fontSize: "0.85rem",
                          boxShadow: "0 4px 14px rgba(249, 115, 22, 0.4)",
                          border: "none",
                          cursor: "pointer",
                          transition: "transform 0.15s ease, box-shadow 0.15s ease",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = "translateY(-1px)";
                          e.currentTarget.style.boxShadow = "0 6px 18px rgba(249, 115, 22, 0.5)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = "translateY(0)";
                          e.currentTarget.style.boxShadow = "0 4px 14px rgba(249, 115, 22, 0.4)";
                        }}
                      >
                        <Plus size={16} strokeWidth={2.5} />
                        <span>Add New Table</span>
                      </button>
                    </div>

                    {/* Table Rows Container */}
                    <div
                      style={{
                        background: "var(--bg-tertiary)",
                        borderRadius: "10px",
                        border: "1px solid var(--neutral-border)",
                        overflow: "hidden",
                      }}
                    >
                      <div className="floor-table-scroll" style={{ overflowX: "auto" }}>
                        <div className="floor-table-layout">
                          {/* Filter Toolbar: Vacant / Occupied Only + Search */}
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              flexWrap: "wrap",
                              gap: "0.75rem",
                              padding: "0.55rem 0.85rem",
                              background: "var(--bg-secondary)",
                              borderRadius: "8px",
                              marginBottom: "0.5rem",
                              border: "1px solid rgba(var(--surface-rgb),0.05)",
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: "0.65rem", flexWrap: "wrap" }}>
                              {/* Table # Search Filter */}
                              <div style={{ position: "relative", minWidth: "170px" }}>
                                <Search
                                  size={13}
                                  color="var(--text-dim)"
                                  style={{
                                    position: "absolute",
                                    left: "9px",
                                    top: "50%",
                                    transform: "translateY(-50%)",
                                    pointerEvents: "none",
                                  }}
                                />
                                <input
                                  type="text"
                                  placeholder="Search Table #..."
                                  value={tableFilters.search}
                                  onChange={(e) => updateTableFilter("search", e.target.value)}
                                  style={{
                                    width: "100%",
                                    padding: "0.42rem 0.5rem 0.42rem 1.6rem",
                                    background: "var(--input-bg)",
                                    border: tableFilters.search
                                      ? "1px solid #f59e0b"
                                      : "1px solid rgba(var(--surface-rgb),0.12)",
                                    borderRadius: "6px",
                                    color: "var(--text-main)",
                                    fontSize: "0.78rem",
                                    outline: "none",
                                    boxSizing: "border-box",
                                  }}
                                />
                              </div>

                              {/* Vacant & Occupied Status Filter Pills */}
                              <div
                                style={{
                                  display: "inline-flex",
                                  gap: "0.3rem",
                                  background: "var(--input-bg)",
                                  padding: "3px",
                                  borderRadius: "7px",
                                  border: "1px solid rgba(var(--surface-rgb),0.08)",
                                }}
                              >
                                {/* All Tables */}
                                <button
                                  type="button"
                                  onClick={() => updateTableFilter("status", "all")}
                                  style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "0.35rem",
                                    padding: "0.3rem 0.7rem",
                                    borderRadius: "5px",
                                    border: "none",
                                    cursor: "pointer",
                                    fontSize: "0.74rem",
                                    fontWeight: (!tableFilters.status || tableFilters.status === "all") ? 700 : 500,
                                    background: (!tableFilters.status || tableFilters.status === "all")
                                      ? "rgba(245, 158, 11, 0.2)"
                                      : "transparent",
                                    color: (!tableFilters.status || tableFilters.status === "all")
                                      ? "#f59e0b"
                                      : "var(--text-dim)",
                                    transition: "all 0.15s ease",
                                  }}
                                >
                                  <span>All Tables</span>
                                  <span
                                    style={{
                                      padding: "1px 5px",
                                      borderRadius: "8px",
                                      background: (!tableFilters.status || tableFilters.status === "all")
                                        ? "#f59e0b"
                                        : "rgba(var(--surface-rgb),0.08)",
                                      color: (!tableFilters.status || tableFilters.status === "all")
                                        ? "#081628"
                                        : "var(--text-dim)",
                                      fontSize: "0.68rem",
                                      fontWeight: 800,
                                    }}
                                  >
                                    {tables.length}
                                  </span>
                                </button>

                                {/* Vacant Filter */}
                                <button
                                  type="button"
                                  onClick={() => updateTableFilter("status", "vacant")}
                                  style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "0.35rem",
                                    padding: "0.3rem 0.7rem",
                                    borderRadius: "5px",
                                    border: "none",
                                    cursor: "pointer",
                                    fontSize: "0.74rem",
                                    fontWeight: tableFilters.status === "vacant" ? 700 : 500,
                                    background: tableFilters.status === "vacant"
                                      ? "rgba(16, 185, 129, 0.2)"
                                      : "transparent",
                                    color: tableFilters.status === "vacant" ? "var(--success)" : "var(--text-dim)",
                                    boxShadow: tableFilters.status === "vacant"
                                      ? "0 0 10px rgba(16, 185, 129, 0.15)"
                                      : "none",
                                    transition: "all 0.15s ease",
                                  }}
                                >
                                  <span
                                    style={{
                                      width: "6px",
                                      height: "6px",
                                      borderRadius: "50%",
                                      backgroundColor: "var(--success)",
                                      boxShadow: "0 0 6px #10b981",
                                    }}
                                  />
                                  <span>Vacant</span>
                                  <span
                                    style={{
                                      padding: "1px 5px",
                                      borderRadius: "8px",
                                      background: tableFilters.status === "vacant"
                                        ? "#10b981"
                                        : "rgba(var(--surface-rgb),0.08)",
                                      color: tableFilters.status === "vacant" ? "#081628" : "var(--text-dim)",
                                      fontSize: "0.68rem",
                                      fontWeight: 800,
                                    }}
                                  >
                                    {vacantTablesCount}
                                  </span>
                                </button>

                                {/* Occupied Filter */}
                                <button
                                  type="button"
                                  onClick={() => updateTableFilter("status", "occupied")}
                                  style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "0.35rem",
                                    padding: "0.3rem 0.7rem",
                                    borderRadius: "5px",
                                    border: "none",
                                    cursor: "pointer",
                                    fontSize: "0.74rem",
                                    fontWeight: tableFilters.status === "occupied" ? 700 : 500,
                                    background: tableFilters.status === "occupied"
                                      ? "rgba(245, 158, 11, 0.2)"
                                      : "transparent",
                                    color: tableFilters.status === "occupied" ? "var(--accent-amber-light)" : "var(--text-dim)",
                                    boxShadow: tableFilters.status === "occupied"
                                      ? "0 0 10px rgba(245, 158, 11, 0.15)"
                                      : "none",
                                    transition: "all 0.15s ease",
                                  }}
                                >
                                  <span
                                    style={{
                                      width: "6px",
                                      height: "6px",
                                      borderRadius: "50%",
                                      backgroundColor: "#f59e0b",
                                      boxShadow: "0 0 6px #f59e0b",
                                    }}
                                  />
                                  <span>Occupied</span>
                                  <span
                                    style={{
                                      padding: "1px 5px",
                                      borderRadius: "8px",
                                      background: tableFilters.status === "occupied"
                                        ? "#f59e0b"
                                        : "rgba(var(--surface-rgb),0.08)",
                                      color: tableFilters.status === "occupied" ? "#081628" : "var(--text-dim)",
                                      fontSize: "0.68rem",
                                      fontWeight: 800,
                                    }}
                                  >
                                    {occupiedTablesCount}
                                  </span>
                                </button>
                              </div>
                            </div>

                            {/* Right: Reset or Count Info */}
                            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                              {hasActiveTableFilters ? (
                                <button
                                  type="button"
                                  onClick={clearTableFilters}
                                  style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "0.35rem",
                                    background: "rgba(239, 68, 68, 0.15)",
                                    border: "1px solid rgba(239, 68, 68, 0.4)",
                                    color: "var(--danger)",
                                    padding: "0.38rem 0.75rem",
                                    borderRadius: "6px",
                                    fontSize: "0.75rem",
                                    fontWeight: 700,
                                    cursor: "pointer",
                                    transition: "all 0.15s ease",
                                  }}
                                  title="Clear all active table filters"
                                >
                                  <RotateCcw size={12} />
                                  <span>Reset Filters</span>
                                </button>
                              ) : (
                                <span style={{ fontSize: "0.76rem", color: "var(--text-dim)", fontWeight: 500 }}>
                                  Showing all {tables.length} tables
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Column Headers */}
                          <div
                            className="floor-table-grid floor-table-heading"
                            style={{
                              display: "grid",
                              alignItems: "center",
                              paddingBlock: "0.55rem",
                              background: "var(--bg-secondary)",
                              borderRadius: "8px",
                              marginBottom: "0.5rem",
                              color: "var(--text-dim)",
                              fontSize: "0.74rem",
                              fontWeight: 700,
                              letterSpacing: "0.04em",
                              textTransform: "uppercase",
                            }}
                          >
                            <div
                              onClick={() => handleTableSort("name")}
                              style={{ cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "0.3rem" }}
                            >
                              <span>Table #</span>
                              {tableSortField === "name" && (tableSortDirection === "asc" ? " ▲" : " ▼")}
                            </div>
                            <div
                              onClick={() => handleTableSort("area")}
                              style={{ cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "0.3rem" }}
                            >
                              <span>Area</span>
                              {tableSortField === "area" && (tableSortDirection === "asc" ? " ▲" : " ▼")}
                            </div>
                            <div
                              onClick={() => handleTableSort("capacity")}
                              style={{ cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "0.3rem" }}
                            >
                              <span>Chairs / Capacity</span>
                              {tableSortField === "capacity" && (tableSortDirection === "asc" ? " ▲" : " ▼")}
                            </div>
                            <div
                              onClick={() => handleTableSort("server")}
                              style={{ cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "0.3rem" }}
                            >
                              <span>Assigned Server</span>
                              {tableSortField === "server" && (tableSortDirection === "asc" ? " ▲" : " ▼")}
                            </div>
                            <div
                              onClick={() => handleTableSort("status")}
                              style={{ cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "0.3rem" }}
                            >
                              <span>Status</span>
                              {tableSortField === "status" && (tableSortDirection === "asc" ? " ▲" : " ▼")}
                            </div>
                            <div className="floor-table-actions-heading" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                              Actions
                            </div>
                          </div>

                          {/* Empty State */}
                          {sortedTables.length === 0 && (
                            <div
                              style={{
                                padding: "3rem 1.5rem",
                                textAlign: "center",
                                color: "var(--text-muted)",
                              }}
                            >
                              <p style={{ margin: 0, fontSize: "0.95rem" }}>
                                {hasActiveTableFilters
                                  ? "No tables match the selected filters."
                                  : "No tables configured yet. Click \"+ Add New Table\" to create one."}
                              </p>
                              {hasActiveTableFilters && (
                                <button
                                  type="button"
                                  onClick={clearTableFilters}
                                  style={{
                                    marginTop: "0.75rem",
                                    background: "transparent",
                                    border: "1px solid #f59e0b",
                                    color: "var(--accent-amber-light)",
                                    padding: "0.35rem 0.9rem",
                                    borderRadius: "6px",
                                    fontSize: "0.8rem",
                                    fontWeight: 600,
                                    cursor: "pointer",
                                  }}
                                >
                                  Clear Filters
                                </button>
                              )}
                            </div>
                          )}

                          {/* Rows List */}
                          {sortedTables.map((tbl) => {
                            const isOccupied = isTableOccupied(tbl);
                            const dotColor = isOccupied ? "#f59e0b" : "#10b981";
                            const textColor = isOccupied ? "var(--status-occupied)" : "var(--status-vacant)";
                            const bgColor = isOccupied ? "rgba(245, 158, 11, 0.12)" : "rgba(16, 185, 129, 0.12)";
                            const borderColor = isOccupied ? "rgba(245, 158, 11, 0.3)" : "rgba(16, 185, 129, 0.3)";
                            const label = isOccupied ? "OCCUPIED" : "VACANT";

                            return (
                              <div
                                key={tbl.id}
                                className="floor-table-grid floor-table-row"
                                style={{
                                  display: "grid",
                                  alignItems: "center",
                                  paddingBlock: "0.58rem",
                                  background: "var(--bg-secondary)",
                                  border: "1px solid var(--neutral-border)",
                                  borderRadius: "8px",
                                  marginBottom: "0.45rem",
                                  transition: "background 0.15s ease, border-color 0.15s ease",
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.background = "var(--bg-tertiary)";
                                  e.currentTarget.style.borderColor = "rgba(245, 158, 11, 0.3)";
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.background = "var(--bg-secondary)";
                                  e.currentTarget.style.borderColor = "var(--neutral-border)";
                                }}
                              >
                                {/* Col 1: Table # */}
                                <div className="floor-table-name" style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                                  <div
                                    style={{
                                      width: "28px",
                                      height: "28px",
                                      borderRadius: "6px",
                                      background: "rgba(245, 158, 11, 0.15)",
                                      color: "var(--accent-amber-light)",
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      fontWeight: 800,
                                      fontSize: "0.8rem",
                                      flexShrink: 0,
                                    }}
                                  >
                                    <span>T{tbl.name ? tbl.name.replace(/^(?:table|t)\s*[-–—]?\s*/i, "") : tbl.id}</span>
                                  </div>
                                  <span
                                    style={{
                                      fontWeight: 700,
                                      color: "var(--text-main)",
                                      fontSize: "0.88rem",
                                      whiteSpace: "normal",
                                    }}
                                  >
                                    {tbl.name || `Table ${tbl.id}`}
                                  </span>
                                </div>

                                {/* Col 2: Area */}
                                <div
                                  style={{
                                    color: "var(--text-muted)",
                                    fontSize: "0.84rem",
                                    fontWeight: 500,
                                  }}
                                >
                                  {tbl.section || "Main Hall"}
                                </div>

                                {/* Col 3: Chairs / Capacity */}
                                <div
                                  style={{
                                    color: "var(--text-muted)",
                                    fontSize: "0.84rem",
                                    fontWeight: 500,
                                  }}
                                >
                                  {tbl.capacity} Chairs / {tbl.capacity} Persons
                                </div>

                                {/* Col 4: Assigned Server */}
                                <div
                                  style={{
                                    color: "var(--text-muted)",
                                    fontSize: "0.84rem",
                                    fontWeight: 500,
                                  }}
                                >
                                  {tbl.server || "Unassigned"}
                                </div>

                                {/* Col 5: Status Pill */}
                                <div>
                                  <div
                                    style={{
                                      display: "inline-flex",
                                      alignItems: "center",
                                      gap: "0.4rem",
                                      padding: "0.26rem 0.75rem",
                                      borderRadius: "20px",
                                      background: bgColor,
                                      border: `1px solid ${borderColor}`,
                                      color: textColor,
                                      fontSize: "0.7rem",
                                      fontWeight: 800,
                                      letterSpacing: "0.04em",
                                      width: "fit-content",
                                    }}
                                  >
                                    <span
                                      style={{
                                        width: "6px",
                                        height: "6px",
                                        borderRadius: "50%",
                                        backgroundColor: dotColor,
                                        boxShadow: `0 0 6px ${dotColor}`,
                                      }}
                                    />
                                    <span>{label}</span>
                                  </div>
                                </div>

                                {/* Col 6: Actions */}
                                <div className="floor-table-actions" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.45rem" }}>
                                  {/* Edit Chairs / Area */}
                                  <button
                                    type="button"
                                    onClick={() => handleOpenTableModal(tbl)}
                                    style={{
                                      display: "inline-flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      padding: "0.32rem 0.5rem",
                                      background: "rgba(245, 158, 11, 0.08)",
                                      color: "#f59e0b",
                                      border: "1px solid rgba(245, 158, 11, 0.45)",
                                      borderRadius: "6px",
                                      fontSize: "0.74rem",
                                      cursor: "pointer",
                                      transition: "all 0.15s ease",
                                      flexShrink: 0,
                                    }}
                                    onMouseEnter={(e) => {
                                      e.currentTarget.style.background = "rgba(245, 158, 11, 0.2)";
                                      e.currentTarget.style.borderColor = "#f59e0b";
                                    }}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.style.background = "rgba(245, 158, 11, 0.08)";
                                      e.currentTarget.style.borderColor = "rgba(245, 158, 11, 0.45)";
                                    }}
                                    title="Edit Chairs / Area"
                                    aria-label="Edit Chairs / Area"
                                  >
                                    <SquarePen size={13} color="#f59e0b" />
                                  </button>

                                  {/* Delete Table */}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (isTableOccupied(tbl)) {
                                        requestDelete({
                                          title: "Cannot Delete Table",
                                          message: `Cannot delete ${tbl.name || `Table ${tbl.id}`} because it is currently occupied with diners. Clear or settle bill first.`,
                                          confirmLabel: "Understood",
                                          cancelLabel: "Close",
                                          icon: (
                                            <AlertCircle size={22} color="#f59e0b" />
                                          ),
                                          onConfirm: () => {},
                                        });
                                        return;
                                      }
                                      requestDelete({
                                        title: "Delete Table?",
                                        message: `Are you sure you want to delete ${tbl.name || `Table ${tbl.id}`} permanently? This action cannot be undone.`,
                                        confirmLabel: "Yes, Delete",
                                        onConfirm: () => onDeleteTable(tbl.id),
                                      });
                                    }}
                                    style={{
                                      display: "inline-flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      padding: "0.32rem 0.5rem",
                                      background: "rgba(239, 68, 68, 0.08)",
                                      color: "var(--danger)",
                                      border: "1px solid rgba(239, 68, 68, 0.35)",
                                      borderRadius: "6px",
                                      fontSize: "0.74rem",
                                      cursor: "pointer",
                                      transition: "all 0.15s ease",
                                      flexShrink: 0,
                                    }}
                                    onMouseEnter={(e) => {
                                      e.currentTarget.style.background = "rgba(239, 68, 68, 0.22)";
                                      e.currentTarget.style.borderColor = "var(--danger)";
                                    }}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.style.background = "rgba(239, 68, 68, 0.08)";
                                      e.currentTarget.style.borderColor = "rgba(239, 68, 68, 0.35)";
                                    }}
                                    title="Delete table"
                                  >
                                    <Trash2 size={13} color="var(--danger)" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ================= TAB 3: STAFF & PERSONS ================= */}
                {activeTab === "staff" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                    <style>{`
                      .staff-filter-toolbar {
                        display: grid;
                        grid-template-columns: minmax(200px, 1.7fr) repeat(4, minmax(112px, 1fr)) auto;
                        align-items: end;
                        gap: 10px;
                        padding: 0.65rem;
                        margin-bottom: 0.5rem;
                        background: var(--bg-secondary);
                        border-radius: 8px;
                      }
                      .staff-filter-toolbar .menu-filter-field { min-width: 0; }
                      .staff-filter-toolbar .staff-filter-search { flex: initial; }
                      .staff-filter-toolbar .staff-filter-count {
                        min-width: max-content;
                        padding: 0 0.25rem 0.6rem;
                        color: var(--text-dim);
                        font-size: 0.74rem;
                        font-weight: 600;
                        white-space: nowrap;
                        text-align: right;
                      }
                      @media (max-width: 1100px) {
                        .staff-filter-toolbar { grid-template-columns: repeat(3, minmax(0, 1fr)); }
                        .staff-filter-toolbar .staff-filter-search { grid-column: span 2; }
                        .staff-filter-toolbar .staff-filter-count { grid-column: 1 / -1; padding: 0; }
                      }
                      @media (max-width: 600px) {
                        .staff-filter-toolbar { grid-template-columns: repeat(2, minmax(0, 1fr)); }
                        .staff-filter-toolbar .staff-filter-search { grid-column: 1 / -1; }
                        .staff-filter-toolbar .staff-filter-count { grid-column: 1 / -1; }
                      }
                      .staff-table-grid {
                        display: grid;
                        grid-template-columns: minmax(150px, 1.4fr) minmax(120px, 1.1fr) minmax(125px, 1.1fr) minmax(155px, 1.5fr) minmax(120px, 0.9fr) minmax(150px, 1.2fr);
                        gap: 0.5rem;
                      }
                      .staff-table-grid > * { min-width: 0; }
                      @media (max-width: 900px) {
                        .staff-table-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
                      }
                      @media (max-width: 600px) {
                        .staff-table-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
                      }
                      @media (max-width: 380px) {
                        .staff-table-grid { grid-template-columns: minmax(0, 1fr); }
                      }
                    `}</style>
                    {/* Header: Title + Add New Person Button */}
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "0.2rem 0",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.75rem",
                        }}
                      >
                        <div
                          style={{
                            width: "36px",
                            height: "36px",
                            borderRadius: "8px",
                            background: "rgba(245, 158, 11, 0.15)",
                            border: "1.5px solid rgba(245, 158, 11, 0.4)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "var(--accent-amber-light)",
                          }}
                        >
                          <Users size={22} color="#f59e0b" />
                        </div>
                        <div>
                          <h2
                            style={{
                              fontSize: "1.25rem",
                              fontWeight: 800,
                              color: "var(--text-main)",
                              letterSpacing: "-0.01em",
                              margin: 0,
                            }}
                          >
                            Restaurant Staff & Serving Personnel
                          </h2>
                          <p
                            style={{
                              fontSize: "0.76rem",
                              color: "var(--text-muted)",
                              margin: "2px 0 0 0",
                            }}
                          >
                            Manage waiters, table captains and servers handling dining guests
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleOpenStaffModal()}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.45rem",
                          padding: "0.55rem 1.3rem",
                          background: "linear-gradient(135deg, #f97316 0%, #ea580c 100%)",
                          color: "#ffffff",
                          borderRadius: "8px",
                          fontWeight: 700,
                          fontSize: "0.85rem",
                          boxShadow: "0 4px 14px rgba(249, 115, 22, 0.4)",
                          border: "none",
                          cursor: "pointer",
                          transition: "transform 0.15s ease, box-shadow 0.15s ease",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = "translateY(-1px)";
                          e.currentTarget.style.boxShadow = "0 6px 18px rgba(249, 115, 22, 0.5)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = "translateY(0)";
                          e.currentTarget.style.boxShadow = "0 4px 14px rgba(249, 115, 22, 0.4)";
                        }}
                      >
                        <Plus size={16} strokeWidth={2.5} />
                        <span>Add New Person (Staff)</span>
                      </button>
                    </div>

                    {/* Staff Rows Container (Matching Image 2) */}
                    <div
                      style={{
                        background: "var(--bg-tertiary)",
                        borderRadius: "10px",
                        border: "1px solid var(--neutral-border)",
                        overflow: "hidden",
                      }}
                    >
                      <div>
                        <div style={{ width: "100%", minWidth: 0, padding: "0.6rem", boxSizing: "border-box" }}>
                          {/* Column Filters Bar (Matching Image 2 header) */}
                          <div className="staff-filter-toolbar" role="search" aria-label="Staff filters">
                            {/* Col 1: Search Filter */}
                            <label className="menu-filter-field menu-filter-search staff-filter-search" htmlFor="staff-filter-search">
                              <span>Search Staff</span>
                              <div style={{ position: "relative", width: "100%", height: "36px", display: "flex", alignItems: "center" }}>
                                <Search
                                  size={15}
                                  color="var(--text-dim)"
                                  style={{
                                    position: "absolute",
                                    left: "12px",
                                    pointerEvents: "none",
                                  }}
                                />
                                <input
                                  id="staff-filter-search"
                                  type="text"
                                  placeholder="Search Staff..."
                                  value={staffFilters.search}
                                  onChange={(e) => updateStaffFilter("search", e.target.value)}
                                  style={{
                                    width: "100%",
                                    height: "100%",
                                    padding: "0 10px 0 34px",
                                    background: "var(--bg-tertiary)",
                                    border: staffFilters.search
                                      ? "1px solid #f59e0b"
                                      : "1px solid var(--border-card)",
                                    borderRadius: "8px",
                                    color: "var(--text-main)",
                                    fontSize: "0.82rem",
                                    outline: "none",
                                    boxSizing: "border-box",
                                  }}
                                />
                              </div>
                            </label>

                            {/* Col 2: Role Filter */}
                            <label className="menu-filter-field" htmlFor="staff-filter-role">
                              <span>Role</span>
                              <select
                                id="staff-filter-role"
                                value={staffFilters.role}
                                onChange={(e) => updateStaffFilter("role", e.target.value)}
                                style={{
                                  width: "100%",
                                  padding: "0 10px",
                                  background: "var(--bg-tertiary)",
                                  border: staffFilters.role
                                    ? "1px solid #f59e0b"
                                    : "1px solid var(--border-card)",
                                  borderRadius: "8px",
                                  color: staffFilters.role ? "var(--accent-amber-light)" : "var(--text-main)",
                                  fontSize: "0.82rem",
                                  height: "36px",
                                  outline: "none",
                                  cursor: "pointer",
                                  boxSizing: "border-box",
                                }}
                              >
                                <option value="" style={{ background: "var(--input-bg)", color: "var(--text-dim)" }}>
                                  All Roles
                                </option>
                                {staffRoleOptions.map((role) => (
                                  <option key={role} value={role} style={{ background: "var(--input-bg)", color: "var(--text-main)" }}>
                                    {role}
                                  </option>
                                ))}
                              </select>
                            </label>

                            {/* Col 3: Phone / Contact (display-only column; filtering behavior unchanged) */}
                            <label className="menu-filter-field" htmlFor="staff-filter-contact">
                              <span>Phone / Contact</span>
                              <input id="staff-filter-contact" type="text" aria-label="Phone / Contact filter unavailable" disabled />
                            </label>

                            {/* Col 4: Shift Filter */}
                            <label className="menu-filter-field" htmlFor="staff-filter-shift">
                              <span>Shift</span>
                              <select
                                id="staff-filter-shift"
                                value={staffFilters.shift}
                                onChange={(e) => updateStaffFilter("shift", e.target.value)}
                                style={{
                                  width: "100%",
                                  padding: "0 10px",
                                  background: "var(--bg-tertiary)",
                                  border: staffFilters.shift
                                    ? "1px solid #f59e0b"
                                    : "1px solid var(--border-card)",
                                  borderRadius: "8px",
                                  color: staffFilters.shift ? "var(--accent-amber-light)" : "var(--text-main)",
                                  fontSize: "0.82rem",
                                  height: "36px",
                                  outline: "none",
                                  cursor: "pointer",
                                  boxSizing: "border-box",
                                }}
                              >
                                <option value="" style={{ background: "var(--input-bg)", color: "var(--text-dim)" }}>
                                  All Shifts
                                </option>
                                {staffShiftOptions.map((shift) => (
                                  <option key={shift} value={shift} style={{ background: "var(--input-bg)", color: "var(--text-main)" }}>
                                    {shift}
                                  </option>
                                ))}
                              </select>
                            </label>

                            {/* Col 5: Assigned Tables Filter */}
                            <label className="menu-filter-field" htmlFor="staff-filter-assigned">
                              <span>Table Assignment</span>
                              <select
                                id="staff-filter-assigned"
                                value={staffFilters.assigned}
                                onChange={(e) => updateStaffFilter("assigned", e.target.value)}
                                style={{
                                  width: "100%",
                                  padding: "0 10px",
                                  background: "var(--bg-tertiary)",
                                  border: staffFilters.assigned
                                    ? "1px solid #f59e0b"
                                    : "1px solid var(--border-card)",
                                  borderRadius: "8px",
                                  color: staffFilters.assigned ? "var(--accent-amber-light)" : "var(--text-main)",
                                  fontSize: "0.82rem",
                                  height: "36px",
                                  outline: "none",
                                  cursor: "pointer",
                                  boxSizing: "border-box",
                                }}
                              >
                                <option value="" style={{ background: "var(--input-bg)", color: "var(--text-dim)" }}>
                                  All Tables
                                </option>
                                <option value="assigned" style={{ background: "var(--input-bg)", color: "var(--text-main)" }}>
                                  Has Tables
                                </option>
                                <option value="unassigned" style={{ background: "var(--input-bg)", color: "var(--text-main)" }}>
                                  No Tables
                                </option>
                              </select>
                            </label>

                            {/* Col 6: Reset / Count */}
                            <div className="staff-filter-count">
                              {hasActiveStaffFilters ? (
                                <button
                                  type="button"
                                  onClick={clearStaffFilters}
                                  style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "0.3rem",
                                    background: "rgba(239, 68, 68, 0.15)",
                                    border: "1px solid rgba(239, 68, 68, 0.4)",
                                    color: "var(--danger)",
                                    padding: "0.35rem 0.65rem",
                                    borderRadius: "6px",
                                    fontSize: "0.74rem",
                                    fontWeight: 700,
                                    cursor: "pointer",
                                    transition: "all 0.15s ease",
                                    whiteSpace: "nowrap",
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.background = "rgba(239, 68, 68, 0.25)";
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.background = "rgba(239, 68, 68, 0.15)";
                                  }}
                                  title="Clear all active staff filters"
                                >
                                  <RotateCcw size={11} />
                                  <span>Reset</span>
                                </button>
                              ) : (
                                <span>
                                  {staffList.length} Staff
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Staff table headings, separate from the filters */}
                          <div
                            className="staff-table-grid"
                            style={{
                              alignItems: "center",
                              padding: "0.65rem 0.85rem",
                              marginBottom: "0.45rem",
                              background: "var(--bg-secondary)",
                              borderRadius: "8px",
                              color: "var(--text-dim)",
                              fontSize: "0.84rem",
                              fontWeight: 600,
                            }}
                          >
                            <div>Staff Name</div>
                            <div>Role / Designation</div>
                            <div>Phone / Contact</div>
                            <div>Shift</div>
                            <div>Table Assignment</div>
                            <div style={{ textAlign: "right" }}>Actions</div>
                          </div>

                          {/* Empty State */}
                          {filteredStaffList.length === 0 && (
                            <div
                              style={{
                                padding: "3rem 1.5rem",
                                textAlign: "center",
                                color: "var(--text-muted)",
                              }}
                            >
                              <p style={{ margin: 0, fontSize: "0.95rem" }}>
                                {hasActiveStaffFilters
                                  ? "No staff members match the selected filters."
                                  : "No staff members configured yet. Click \"+ Add New Person (Staff)\" to create one."}
                              </p>
                              {hasActiveStaffFilters && (
                                <button
                                  type="button"
                                  onClick={clearStaffFilters}
                                  style={{
                                    marginTop: "0.75rem",
                                    background: "transparent",
                                    border: "1px solid #f59e0b",
                                    color: "var(--accent-amber-light)",
                                    padding: "0.35rem 0.9rem",
                                    borderRadius: "6px",
                                    fontSize: "0.8rem",
                                    fontWeight: 600,
                                    cursor: "pointer",
                                  }}
                                >
                                  Clear Filters
                                </button>
                              )}
                            </div>
                          )}

                          {/* Staff Rows List (Matching Image 2) */}
                          {filteredStaffList.map((person) => {
                            const personName = String(
                              person?.name ||
                                person?.fullName ||
                                person?.FullName ||
                                person?.username ||
                                "Unnamed staff",
                            );
                            const personRole = String(
                              person?.role || person?.roleTitle || "Staff",
                            );
                            const personId = person?.id ?? person?.staffId;
                            const assignedCount = tables.filter(
                              (t) => (t.server || "").trim().toLowerCase() === personName.trim().toLowerCase(),
                            ).length;

                            return (
                              <div
                                key={personId ?? personName}
                                style={{
                                  display: "grid",
                                  alignItems: "center",
                                  padding: "0.55rem 0.85rem",
                                  background: "var(--bg-secondary)",
                                  border: "1px solid var(--neutral-border)",
                                  borderRadius: "8px",
                                  marginBottom: "0.45rem",
                                  transition: "background 0.15s ease, border-color 0.15s ease",
                                }}
                                className="staff-table-grid"
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.background = "var(--bg-tertiary)";
                                  e.currentTarget.style.borderColor = "rgba(245, 158, 11, 0.3)";
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.background = "var(--bg-secondary)";
                                  e.currentTarget.style.borderColor = "rgba(var(--surface-rgb),0.05)";
                                }}
                              >
                                {/* Col 1: Staff Avatar Badge + Name (Matching Image 2 table badge) */}
                                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                                  <div
                                    style={{
                                      width: "28px",
                                      height: "28px",
                                      borderRadius: "6px",
                                      background: "rgba(245, 158, 11, 0.15)",
                                      color: "var(--accent-amber-light)",
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      fontWeight: 800,
                                      fontSize: "0.82rem",
                                      flexShrink: 0,
                                    }}
                                  >
                                    {personName.charAt(0).toUpperCase()}
                                  </div>
                                  <span
                                    style={{
                                      fontWeight: 700,
                                      color: "var(--text-main)",
                                      fontSize: "0.88rem",
                                      whiteSpace: "nowrap",
                                      overflow: "hidden",
                                      textOverflow: "ellipsis",
                                    }}
                                  >
                                    {personName}
                                  </span>
                                </div>

                                {/* Col 2: Role */}
                                <div
                                  style={{
                                    color: "var(--text-muted)",
                                    fontSize: "0.84rem",
                                    fontWeight: 500,
                                    whiteSpace: "nowrap",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                  }}
                                  title={personRole}
                                >
                                  {personRole}
                                </div>

                                {/* Col 3: Phone */}
                                <div
                                  style={{
                                    color: "var(--text-muted)",
                                    fontSize: "0.84rem",
                                    fontWeight: 500,
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  {person.phone || "—"}
                                </div>

                                {/* Col 4: Shift (Full Description without truncation) */}
                                <div
                                  style={{
                                    color: "var(--text-muted)",
                                    fontSize: "0.84rem",
                                    fontWeight: 500,
                                    whiteSpace: "nowrap",
                                  }}
                                  title={person.shift || "General Shift"}
                                >
                                  {person.shift || "General Shift"}
                                </div>

                                {/* Col 5: Status Pill (Matching Image 2 status pill) */}
                                <div>
                                  <div
                                    style={{
                                      display: "inline-flex",
                                      alignItems: "center",
                                      gap: "0.4rem",
                                      padding: "0.26rem 0.75rem",
                                      borderRadius: "20px",
                                      background:
                                        assignedCount > 0
                                          ? "rgba(16, 185, 129, 0.12)"
                                          : "rgba(100, 116, 139, 0.12)",
                                      border:
                                        assignedCount > 0
                                          ? "1px solid rgba(16, 185, 129, 0.3)"
                                          : "1px solid rgba(100, 116, 139, 0.25)",
                                      color: assignedCount > 0 ? "var(--success)" : "var(--text-dim)",
                                      fontSize: "0.7rem",
                                      fontWeight: 800,
                                      letterSpacing: "0.04em",
                                      width: "fit-content",
                                    }}
                                  >
                                    <span
                                      style={{
                                        width: "6px",
                                        height: "6px",
                                        borderRadius: "50%",
                                        backgroundColor:
                                          assignedCount > 0 ? "#10b981" : "#64748b",
                                        boxShadow:
                                          assignedCount > 0 ? "0 0 6px #10b981" : "none",
                                      }}
                                    />
                                    <span>
                                      {assignedCount > 0
                                        ? `${assignedCount} ${assignedCount === 1 ? "TABLE" : "TABLES"}`
                                        : "0 TABLES"}
                                    </span>
                                  </div>
                                </div>

                                {/* Col 6: Actions (Edit Staff + Delete button matching Image 2) */}
                                <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "0.4rem" }}>
                                  {/* Edit Staff button */}
                                  <button
                                    type="button"
                                    onClick={() => handleOpenStaffModal(person)}
                                    style={{
                                      display: "inline-flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      padding: "0.35rem 0.55rem",
                                      background: "rgba(245, 158, 11, 0.08)",
                                      color: "#f59e0b",
                                      border: "1px solid rgba(245, 158, 11, 0.45)",
                                      borderRadius: "6px",
                                      fontSize: "0.74rem",
                                      cursor: "pointer",
                                      transition: "all 0.15s ease",
                                    }}
                                    onMouseEnter={(e) => {
                                      e.currentTarget.style.background = "rgba(245, 158, 11, 0.2)";
                                      e.currentTarget.style.borderColor = "#f59e0b";
                                    }}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.style.background = "rgba(245, 158, 11, 0.08)";
                                      e.currentTarget.style.borderColor = "rgba(245, 158, 11, 0.45)";
                                    }}
                                    title="Edit Staff"
                                    aria-label="Edit Staff"
                                  >
                                    <SquarePen size={13} color="#f59e0b" />
                                  </button>

                                  {/* Delete Staff button */}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      requestDelete({
                                        title: "Remove Staff?",
                                        message: `Are you sure you want to remove "${personName}" from the staff list? This action cannot be undone.`,
                                        confirmLabel: "Yes, Remove",
                                        onConfirm: () => onDeleteStaff(personId),
                                      });
                                    }}
                                    style={{
                                      display: "inline-flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      padding: "0.35rem 0.55rem",
                                      background: "rgba(239, 68, 68, 0.08)",
                                      color: "var(--danger)",
                                      border: "1px solid rgba(239, 68, 68, 0.35)",
                                      borderRadius: "6px",
                                      fontSize: "0.74rem",
                                      cursor: "pointer",
                                      transition: "all 0.15s ease",
                                    }}
                                    onMouseEnter={(e) => {
                                      e.currentTarget.style.background = "rgba(239, 68, 68, 0.22)";
                                      e.currentTarget.style.borderColor = "var(--danger)";
                                    }}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.style.background = "rgba(239, 68, 68, 0.08)";
                                      e.currentTarget.style.borderColor = "rgba(239, 68, 68, 0.35)";
                                    }}
                                    title="Remove staff member"
                                  >
                                    <Trash2 size={13} color="var(--danger)" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ================= TAB 4: KITCHEN KOT (ORDERS RECEIVED) ================= */}
                {activeTab === "kot" && (
                  <div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: "1.25rem",
                        flexWrap: "wrap",
                        gap: "0.75rem",
                      }}
                    >
                      <div>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.5rem",
                          }}
                        >
                          <h3
                            style={{
                              fontSize: "1.15rem",
                              fontWeight: 800,
                              color: "var(--text-main)",
                            }}
                          >
                            Kitchen Order Tickets (KOT) Dispatch
                          </h3>
                          <span
                            style={{
                              background: "rgba(245, 158, 11, 0.2)",
                              color: "var(--accent-amber-light)",
                              border: "1px solid rgba(245, 158, 11, 0.4)",
                              fontSize: "0.7rem",
                              fontWeight: 800,
                              padding: "2px 8px",
                              borderRadius: "12px",
                            }}
                          >
                            ADMIN MONITOR
                          </span>
                        </div>
                        <p
                          style={{
                            fontSize: "0.76rem",
                            color: "var(--text-muted)",
                          }}
                        >
                          Select any table number to inspect orders received
                          from table and preparation completed status
                        </p>
                      </div>

                      {onOpenKOTView && (
                        <button
                          onClick={() => {
                            onClose();
                            onOpenKOTView();
                          }}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.4rem",
                            padding: "0.55rem 1rem",
                            borderRadius: "var(--radius-sm)",
                            background: "linear-gradient(135deg, #f59e0b, #ea580c)",
                            color: "#ffffff",
                            fontWeight: 800,
                            fontSize: "0.82rem",
                            border: "none",
                            cursor: "pointer",
                            boxShadow: "0 2px 10px rgba(245, 158, 11, 0.35)",
                          }}
                        >
                          <ExternalLink size={15} />
                          <span>Open Full Screen KOT Screen</span>
                        </button>
                      )}
                    </div>

                    {/* Table Filter Bar with Dropdown matching TableDetailView */}
                    <div
                      style={{
                        background: "var(--bg-primary)",
                        padding: "0.65rem 1rem",
                        borderRadius: "var(--radius-md)",
                        border: "1px solid var(--border-subtle)",
                        marginBottom: "1.25rem",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        position: "relative",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.5rem",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.35rem",
                            fontSize: "0.76rem",
                            fontWeight: 800,
                            color: "var(--accent-amber-light)",
                          }}
                        >
                          <Filter size={14} />
                          <span>TABLE FILTER:</span>
                        </div>
                        {adminKotTableFilter !== "all" ? (
                          <div
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "6px",
                              background: "rgba(245, 158, 11, 0.15)",
                              border: "1px solid rgba(245, 158, 11, 0.4)",
                              padding: "3px 8px",
                              borderRadius: "6px",
                              fontSize: "0.75rem",
                              fontWeight: 700,
                              color: "var(--accent-amber-light)",
                            }}
                          >
                            <span>
                              {tables.find(
                                (t) =>
                                  t.id === Number(adminKotTableFilter) ||
                                  t.name === adminKotTableFilter ||
                                  String(t.id) === String(adminKotTableFilter),
                              )?.name || `Table ${adminKotTableFilter}`}
                            </span>
                            <button
                              type="button"
                              onClick={() => setAdminKotTableFilter("all")}
                              title="Show all tables"
                              style={{
                                background: "transparent",
                                border: "none",
                                color: "var(--accent-amber-light)",
                                cursor: "pointer",
                                fontSize: "0.8rem",
                                lineHeight: 1,
                                padding: 0,
                              }}
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <span
                            style={{
                              fontSize: "0.75rem",
                              color: "var(--text-muted)",
                              fontWeight: 600,
                            }}
                          >
                            All Active Tables ({tablesWithOrders.length})
                          </span>
                        )}
                      </div>

                      {/* Dropdown Container */}
                      <div style={{ position: "relative" }}>
                        <button
                          type="button"
                          onClick={() =>
                            setIsKotTableDropdownOpen((prev) => !prev)
                          }
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "0.5rem",
                            minWidth: "132px",
                            padding: "0.5rem 0.8rem",
                            borderRadius: "8px",
                            background: isKotTableDropdownOpen
                              ? "var(--accent-amber)"
                              : "var(--bg-tertiary)",
                            color: isKotTableDropdownOpen
                              ? "#000000"
                              : "var(--text-main)",
                            border: isKotTableDropdownOpen
                              ? "1px solid var(--accent-amber)"
                              : "1px solid var(--border-subtle)",
                            fontSize: "0.8rem",
                            fontWeight: 800,
                            cursor: "pointer",
                            boxShadow: isKotTableDropdownOpen
                              ? "0 4px 12px rgba(245,158,11,0.25)"
                              : "none",
                          }}
                        >
                          <Filter
                            size={15}
                            color={
                              isKotTableDropdownOpen
                                ? "#000000"
                                : "var(--accent-amber)"
                            }
                          />
                          <span>
                            {adminKotTableFilter === "all"
                              ? "All Tables"
                              : tables.find(
                                  (t) =>
                                    t.id === Number(adminKotTableFilter) ||
                                    t.name === adminKotTableFilter ||
                                    String(t.id) ===
                                      String(adminKotTableFilter),
                                )?.name || "All Tables"}
                          </span>
                          <ChevronDown
                            size={15}
                            style={{
                              transform: isKotTableDropdownOpen
                                ? "rotate(180deg)"
                                : "rotate(0deg)",
                              transition: "transform 160ms ease",
                            }}
                          />
                        </button>

                        {isKotTableDropdownOpen && (
                          <>
                            {/* Backdrop to close dropdown on click outside */}
                            <div
                              onClick={() => setIsKotTableDropdownOpen(false)}
                              style={{
                                position: "fixed",
                                top: 0,
                                left: 0,
                                right: 0,
                                bottom: 0,
                                zIndex: 99,
                              }}
                            />

                            <div
                              style={{
                                position: "absolute",
                                top: "calc(100% + 8px)",
                                right: 0,
                                width: "280px",
                                maxHeight: "380px",
                                display: "flex",
                                flexDirection: "column",
                                background: "var(--bg-secondary)",
                                border: "1px solid var(--border-subtle)",
                                borderRadius: "10px",
                                boxShadow: "0 14px 32px rgba(0,0,0,0.35)",
                                zIndex: 100,
                                overflow: "hidden",
                              }}
                            >
                              {/* Header */}
                              <div
                                style={{
                                  padding: "0.5rem 0.65rem 0.45rem",
                                  borderBottom: "1px solid var(--border-subtle)",
                                  flexShrink: 0,
                                }}
                              >
                                <div
                                  style={{
                                    color: "var(--text-dim)",
                                    fontSize: "0.68rem",
                                    fontWeight: 800,
                                    textTransform: "uppercase",
                                    letterSpacing: "0.05em",
                                    marginBottom: "0.45rem",
                                  }}
                                >
                                  FILTER BY STATUS
                                </div>

                                {/* Status Filter Pills */}
                                <div
                                  style={{
                                    display: "flex",
                                    gap: "0.3rem",
                                    flexWrap: "wrap",
                                  }}
                                >
                                  {[
                                    {
                                      id: "all",
                                      label: "All",
                                      count: tables.length,
                                      dot: null,
                                    },
                                    {
                                      id: "vacant",
                                      label: "Vacant",
                                      count: tables.filter(
                                        (t) =>
                                          (
                                            t.status || "vacant"
                                          ).toLowerCase() === "vacant",
                                      ).length,
                                      dot: "var(--status-vacant, #10b981)",
                                    },
                                    {
                                      id: "occupied",
                                      label: "Occupied",
                                      count: tables.filter(
                                        (t) =>
                                          (t.status || "").toLowerCase() ===
                                          "occupied",
                                      ).length,
                                      dot: "var(--status-occupied, #f59e0b)",
                                    },
                                    {
                                      id: "billed",
                                      label: "Billed",
                                      count: tables.filter(
                                        (t) =>
                                          (t.status || "").toLowerCase() ===
                                          "billed",
                                      ).length,
                                      dot: "var(--status-billed, #a855f7)",
                                    },
                                  ].map((sf) => {
                                    const isActive =
                                      kotTableStatusFilter === sf.id;
                                    return (
                                      <button
                                        key={sf.id}
                                        type="button"
                                        onClick={() =>
                                          setKotTableStatusFilter(sf.id)
                                        }
                                        style={{
                                          display: "flex",
                                          alignItems: "center",
                                          gap: "4px",
                                          padding: "0.25rem 0.55rem",
                                          borderRadius: "6px",
                                          fontSize: "0.7rem",
                                          fontWeight: isActive ? 800 : 600,
                                          background: isActive
                                            ? "rgba(245,158,11,0.2)"
                                            : "var(--bg-tertiary)",
                                          color: isActive
                                            ? "var(--accent-amber-light)"
                                            : "var(--text-muted)",
                                          border: isActive
                                            ? "1px solid var(--accent-amber)"
                                            : "1px solid var(--border-subtle)",
                                          cursor: "pointer",
                                        }}
                                      >
                                        {sf.dot && (
                                          <span
                                            style={{
                                              width: "6px",
                                              height: "6px",
                                              borderRadius: "50%",
                                              backgroundColor: sf.dot,
                                              flexShrink: 0,
                                            }}
                                          />
                                        )}
                                        <span>{sf.label}</span>
                                        <span style={{ opacity: 0.7 }}>
                                          ({sf.count})
                                        </span>
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>

                              {/* Table List */}
                              <div
                                style={{
                                  overflowY: "auto",
                                  flex: 1,
                                  padding: "0.35rem",
                                }}
                              >
                                {/* All Active Tables Option */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setAdminKotTableFilter("all");
                                    setIsKotTableDropdownOpen(false);
                                  }}
                                  style={{
                                    width: "100%",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    gap: "0.65rem",
                                    padding: "0.55rem 0.65rem",
                                    marginBottom: "2px",
                                    borderRadius: "7px",
                                    background:
                                      adminKotTableFilter === "all"
                                        ? "rgba(245,158,11,0.14)"
                                        : "transparent",
                                    color: "var(--text-main)",
                                    border:
                                      adminKotTableFilter === "all"
                                        ? "1px solid rgba(245,158,11,0.5)"
                                        : "1px solid transparent",
                                    cursor: "pointer",
                                    textAlign: "left",
                                  }}
                                  onMouseEnter={(e) => {
                                    if (adminKotTableFilter !== "all")
                                      e.currentTarget.style.background =
                                        "var(--bg-tertiary)";
                                  }}
                                  onMouseLeave={(e) => {
                                    if (adminKotTableFilter !== "all")
                                      e.currentTarget.style.background =
                                        "transparent";
                                  }}
                                >
                                  <span
                                    style={{
                                      display: "flex",
                                      alignItems: "center",
                                      gap: "0.55rem",
                                    }}
                                  >
                                    <span
                                      style={{
                                        width: "7px",
                                        height: "7px",
                                        borderRadius: "50%",
                                        background: "var(--accent-amber)",
                                        flexShrink: 0,
                                      }}
                                    />
                                    <span
                                      style={{
                                        fontWeight:
                                          adminKotTableFilter === "all"
                                            ? 800
                                            : 650,
                                      }}
                                    >
                                      All Active Tables
                                    </span>
                                  </span>
                                  <span
                                    style={{
                                      fontSize: "0.66rem",
                                      fontWeight: 800,
                                      textTransform: "uppercase",
                                      color:
                                        adminKotTableFilter === "all"
                                          ? "var(--accent-amber-light)"
                                          : "var(--text-dim)",
                                    }}
                                  >
                                    {adminKotTableFilter === "all"
                                      ? "CURRENT"
                                      : `${tablesWithOrders.length} ACTIVE`}
                                  </span>
                                </button>

                                {tables
                                  .filter((t) => {
                                    const status = (
                                      t.status || "vacant"
                                    ).toLowerCase();
                                    return (
                                      kotTableStatusFilter === "all" ||
                                      status === kotTableStatusFilter
                                    );
                                  })
                                  .map((t) => {
                                    const isCurrent =
                                      adminKotTableFilter === t.id ||
                                      adminKotTableFilter === t.name ||
                                      String(adminKotTableFilter) ===
                                        String(t.id);
                                    const status = (
                                      t.status || "vacant"
                                    ).toLowerCase();
                                    let statusDot =
                                      "var(--status-vacant, #10b981)";
                                    if (status === "occupied")
                                      statusDot =
                                        "var(--status-occupied, #f59e0b)";
                                    if (status === "billed")
                                      statusDot =
                                        "var(--status-billed, #a855f7)";

                                    return (
                                      <button
                                        key={t.id}
                                        type="button"
                                        onClick={() => {
                                          setAdminKotTableFilter(t.id);
                                          setIsKotTableDropdownOpen(false);
                                        }}
                                        style={{
                                          width: "100%",
                                          display: "flex",
                                          alignItems: "center",
                                          justifyContent: "space-between",
                                          gap: "0.65rem",
                                          padding: "0.55rem 0.65rem",
                                          marginBottom: "2px",
                                          borderRadius: "7px",
                                          background: isCurrent
                                            ? "rgba(245,158,11,0.14)"
                                            : "transparent",
                                          color: "var(--text-main)",
                                          border: isCurrent
                                            ? "1px solid rgba(245,158,11,0.5)"
                                            : "1px solid transparent",
                                          cursor: "pointer",
                                          textAlign: "left",
                                        }}
                                        onMouseEnter={(e) => {
                                          if (!isCurrent)
                                            e.currentTarget.style.background =
                                              "var(--bg-tertiary)";
                                        }}
                                        onMouseLeave={(e) => {
                                          if (!isCurrent)
                                            e.currentTarget.style.background =
                                              "transparent";
                                        }}
                                      >
                                        <span
                                          style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "0.55rem",
                                          }}
                                        >
                                          <span
                                            style={{
                                              width: "7px",
                                              height: "7px",
                                              borderRadius: "50%",
                                              background: statusDot,
                                              flexShrink: 0,
                                            }}
                                          />
                                          <span
                                            style={{
                                              fontWeight: isCurrent ? 800 : 650,
                                            }}
                                          >
                                            {t.name}
                                          </span>
                                        </span>
                                        <span
                                          style={{
                                            fontSize: "0.66rem",
                                            fontWeight: 800,
                                            textTransform: "uppercase",
                                            color: isCurrent
                                              ? "var(--accent-amber-light)"
                                              : status === "occupied"
                                                ? "var(--status-occupied, #f59e0b)"
                                                : status === "billed"
                                                  ? "var(--status-billed, #a855f7)"
                                                  : "var(--text-dim)",
                                          }}
                                        >
                                          {isCurrent
                                            ? "CURRENT"
                                            : t.status || "VACANT"}
                                        </span>
                                      </button>
                                    );
                                  })}

                                {/* Empty state when filter yields nothing */}
                                {tables.filter((t) => {
                                  const status = (
                                    t.status || "vacant"
                                  ).toLowerCase();
                                  return (
                                    kotTableStatusFilter === "all" ||
                                    status === kotTableStatusFilter
                                  );
                                }).length === 0 && (
                                  <div
                                    style={{
                                      textAlign: "center",
                                      padding: "1rem",
                                      color: "var(--text-dim)",
                                      fontSize: "0.75rem",
                                    }}
                                  >
                                    No {kotTableStatusFilter} tables found
                                  </div>
                                )}
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Table KOT Cards */}
                    {(() => {
                      const kotDisplayTables = tables.filter((t) => {
                        if (adminKotTableFilter !== "all") {
                          return (
                            t.id === Number(adminKotTableFilter) ||
                            t.name === adminKotTableFilter
                          );
                        }
                        return t.items && t.items.length > 0;
                      });

                      if (kotDisplayTables.length === 0) {
                        return (
                          <div
                            style={{
                              textAlign: "center",
                              padding: "3.5rem 1rem",
                              color: "var(--text-dim)",
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "center",
                              gap: "0.75rem",
                            }}
                          >
                            <ChefHat size={38} color="var(--accent-amber)" />
                            <h4
                              style={{
                                fontSize: "1.1rem",
                                fontWeight: 700,
                                color: "var(--text-main)",
                              }}
                            >
                              {adminKotTableFilter !== "all"
                                ? `No Active Orders for Table ${adminKotTableFilter}`
                                : "No Active Kitchen Tickets"}
                            </h4>
                            <p
                              style={{
                                fontSize: "0.82rem",
                                color: "var(--text-muted)",
                              }}
                            >
                              Orders dispatched from dining tables will appear
                              here live.
                            </p>
                          </div>
                        );
                      }

                      return (
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns:
                              adminKotTableFilter !== "all"
                                ? "minmax(320px, 620px)"
                                : "repeat(auto-fill, minmax(320px, 1fr))",
                            gap: "1.25rem",
                            justifyContent:
                              adminKotTableFilter !== "all"
                                ? "center"
                                : "stretch",
                          }}
                        >
                          {kotDisplayTables.map((tbl) => {
                            const allCompleted =
                              tbl.items &&
                              tbl.items.length > 0 &&
                              tbl.items.every(
                                (i) =>
                                  i.kotStatus === "served" ||
                                  i.kotStatus === "ready",
                              );
                            const isCooking =
                              tbl.items &&
                              tbl.items.some((i) => i.kotStatus === "cooking");

                            let statusBadge = "ORDER RECEIVED FROM TABLE";
                            let statusColor = "var(--status-occupied)";
                            let statusBg = "rgba(245, 158, 11, 0.15)";

                            if (allCompleted) {
                              statusBadge = "PREPARATION COMPLETED";
                              statusColor = "var(--success)";
                              statusBg = "rgba(16, 185, 129, 0.15)";
                            } else if (isCooking) {
                              statusBadge = "PREPARING / COOKING";
                              statusColor = "var(--accent-saffron)";
                              statusBg = "rgba(234, 88, 12, 0.15)";
                            }

                            return (
                              <div
                                key={tbl.id}
                                style={{
                                  background: "var(--bg-secondary)",
                                  borderRadius: "var(--radius-md)",
                                  border: allCompleted
                                    ? "2px solid rgba(16, 185, 129, 0.5)"
                                    : "2px solid var(--accent-amber)",
                                  overflow: "hidden",
                                  display: "flex",
                                  flexDirection: "column",
                                }}
                              >
                                {/* Table Number Header */}
                                <div
                                  style={{
                                    padding: "0.85rem 1.1rem",
                                    background: "var(--bg-primary)",
                                    borderBottom: "1px solid var(--border-subtle)",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                  }}
                                >
                                  <div
                                    style={{
                                      display: "flex",
                                      alignItems: "center",
                                      gap: "0.65rem",
                                    }}
                                  >
                                    <div
                                      style={{
                                        background: allCompleted
                                          ? "var(--status-vacant)"
                                          : "linear-gradient(135deg, #f59e0b, #ea580c)",
                                        color: "#ffffff",
                                        padding: "0.35rem 0.75rem",
                                        borderRadius: "8px",
                                        fontWeight: 900,
                                        fontSize: "1.15rem",
                                      }}
                                    >
                                      {tbl.name}
                                    </div>
                                    <div>
                                      <div
                                        style={{
                                          fontSize: "0.8rem",
                                          fontWeight: 700,
                                          color: "var(--text-main)",
                                        }}
                                      >
                                        {tbl.section} • Server: {tbl.server}
                                      </div>
                                      <div
                                        style={{
                                          fontSize: "0.72rem",
                                          color: "var(--accent-amber-light)",
                                        }}
                                      >
                                        Order Received:{" "}
                                        {tbl.orderTime || "Just Now"}
                                      </div>
                                    </div>
                                  </div>

                                  <span
                                    style={{
                                      padding: "3px 8px",
                                      borderRadius: "10px",
                                      fontSize: "0.68rem",
                                      fontWeight: 800,
                                      background: statusBg,
                                      color: statusColor,
                                      border: `1px solid color-mix(in srgb, ${statusColor} 25.10%, transparent)`,
                                    }}
                                  >
                                    {statusBadge}
                                  </span>
                                </div>

                                {/* Ordered Items List */}
                                <div
                                  style={{
                                    padding: "0.9rem 1.1rem",
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: "0.5rem",
                                    maxHeight: "280px",
                                    overflowY: "auto",
                                  }}
                                >
                                  {tbl.items && tbl.items.length > 0 ? (
                                    tbl.items.map((item, idx) => (
                                      <div
                                        key={idx}
                                        style={{
                                          display: "flex",
                                          justifyContent: "space-between",
                                          alignItems: "center",
                                          padding: "0.5rem 0.65rem",
                                          borderRadius: "var(--radius-sm)",
                                          background: "var(--bg-primary)",
                                          border: "1px solid var(--border-subtle)",
                                        }}
                                      >
                                        <div
                                          style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "0.6rem",
                                          }}
                                        >
                                          <span
                                            style={{
                                              background: "var(--accent-amber)",
                                              color: "#000000",
                                              padding: "1px 6px",
                                              borderRadius: "4px",
                                              fontWeight: 900,
                                              fontSize: "0.82rem",
                                            }}
                                          >
                                            {item.quantity}x
                                          </span>
                                          <div>
                                            <div
                                              style={{
                                                fontSize: "0.88rem",
                                                fontWeight: 700,
                                                color: "var(--text-main)",
                                              }}
                                            >
                                              {item.name}
                                            </div>
                                            {item.notes && (
                                              <div
                                                style={{
                                                  fontSize: "0.72rem",
                                                  color: "var(--danger)",
                                                  fontWeight: 600,
                                                }}
                                              >
                                                Note: {item.notes}
                                              </div>
                                            )}
                                          </div>
                                        </div>

                                        <span
                                          style={{
                                            fontSize: "0.68rem",
                                            fontWeight: 700,
                                            textTransform: "uppercase",
                                            color:
                                              item.kotStatus === "served" ||
                                              item.kotStatus === "ready"
                                                ? "#10b981"
                                                : "#f59e0b",
                                          }}
                                        >
                                          {item.kotStatus === "served" ||
                                          item.kotStatus === "ready"
                                            ? "Ready"
                                            : "In Prep"}
                                        </span>
                                      </div>
                                    ))
                                  ) : (
                                    <p
                                      style={{
                                        fontSize: "0.8rem",
                                        color: "var(--text-muted)",
                                      }}
                                    >
                                      No items currently ordered for this table.
                                    </p>
                                  )}
                                </div>

                                {/* Footer Action: Preparation Completed */}
                                {tbl.items && tbl.items.length > 0 && (
                                  <div
                                    style={{
                                      padding: "0.75rem 1.1rem",
                                      borderTop: "1px solid var(--border-subtle)",
                                      background: "var(--bg-primary)",
                                      display: "flex",
                                      gap: "0.5rem",
                                    }}
                                  >
                                    {!allCompleted ? (
                                      <button
                                        onClick={() =>
                                          onCompleteTableKot &&
                                          onCompleteTableKot(tbl.id)
                                        }
                                        style={{
                                          width: "100%",
                                          padding: "0.65rem",
                                          borderRadius: "var(--radius-sm)",
                                          background: "linear-gradient(135deg, #10b981, #059669)",
                                          color: "#ffffff",
                                          fontWeight: 800,
                                          fontSize: "0.84rem",
                                          border: "none",
                                          cursor: "pointer",
                                          display: "flex",
                                          alignItems: "center",
                                          justifyContent: "center",
                                          gap: "0.4rem",
                                          boxShadow:
                                            "0 3px 10px rgba(16, 185, 129, 0.3)",
                                        }}
                                      >
                                        <CheckCircle2 size={16} />
                                        <span>Mark Preparation Completed</span>
                                      </button>
                                    ) : (
                                      <div
                                        style={{
                                          width: "100%",
                                          padding: "0.6rem",
                                          borderRadius: "var(--radius-sm)",
                                          background: "rgba(16, 185, 129, 0.15)",
                                          color: "var(--success)",
                                          fontWeight: 800,
                                          fontSize: "0.82rem",
                                          textAlign: "center",
                                          display: "flex",
                                          alignItems: "center",
                                          justifyContent: "center",
                                          gap: "0.35rem",
                                        }}
                                      >
                                        <CheckCircle2 size={15} />
                                        <span>
                                          Preparation Completed (Ready to Serve)
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* ================= TAB 5: INVENTORY ================= */}
                {activeTab === "inventory" && (
                  <AdminInventory
                    menuItems={menuItems}
                    onUpdateMenuItem={onUpdateMenuItem}
                  />
                )}

                {/* ================= TAB 6: INVOICES ================= */}
                {activeTab === "invoices" && (
                  <AdminInvoices
                    pastOrders={pastOrders}
                    restaurantName={restaurantName}
                    onUpdateInvoiceDiscount={onUpdateInvoiceDiscount}
                  />
                )}

                {/* ================= TAB 7: REPORTS ================= */}
                {activeTab === "reports" && (
                  <AdminReports
                    pastOrders={pastOrders}
                    menuItems={menuItems}
                    restaurantSettings={restaurantSettings}
                    inventory={inventory}
                  />
                )}

                {/* ================= TAB 8: LOGIN MANAGEMENT ================= */}
                {activeTab === "logins" && (
                  <LoginManagement currentAdminSession={currentSession} />
                )}

                {/* ================= TAB 9: SETTINGS ================= */}
                {activeTab === "settings" && (
                  <AdminSettings
                    currentTheme={currentTheme}
                    onChangeTheme={handleThemeChange}
                    initialSettings={restaurantSettings}
                    onSaveSettings={handleSaveRestaurantSettings}
                    showBarHeaderToggle={showBarHeaderToggle}
                    onToggleShowBarHeader={handleToggleShowBarHeader}
                  />
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* ================= MODAL: ADD / EDIT MENU ITEM ================= */}
      {isItemModalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "var(--modal-overlay)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 130,
            padding: "1rem",
          }}
        >
          <form
            onSubmit={handleSaveItem}
            style={{
              background: "var(--bg-secondary)",
              border: "1.5px solid var(--border-subtle)",
              borderRadius: "var(--radius-lg)",
              boxShadow: "var(--shadow-lg)",
              width: "100%",
              maxWidth: "580px",
              maxHeight: "calc(100dvh - 2rem)",
              padding: "1.6rem",
              display: "flex",
              flexDirection: "column",
              gap: "1.1rem",
              overflowY: "auto",
              overscrollBehavior: "contain",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                borderBottom: "1.5px solid var(--border-subtle)",
                paddingBottom: "0.85rem",
              }}
            >
              <h3
                style={{
                  fontSize: "1.15rem",
                  fontWeight: 800,
                  color: "var(--text-main)",
                  letterSpacing: "-0.01em",
                }}
              >
                {editingItem ? "Edit Dish / Item" : "Add New Menu Item"}
              </h3>
              <button
                type="button"
                onClick={() => setIsItemModalOpen(false)}
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
              >
                <X size={18} />
              </button>
            </div>

            <div>
              <label
                style={{
                  fontSize: "0.82rem",
                  fontWeight: 700,
                  color: "var(--text-main)",
                  display: "block",
                  marginBottom: "5px",
                }}
              >
                Dish Name <span style={{ color: "#ea580c" }}>*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Special Hyderabadi Dum Biryani"
                value={itemForm.name}
                onChange={(e) =>
                  setItemForm({ ...itemForm, name: e.target.value })
                }
                style={{
                  width: "100%",
                  background: "var(--bg-tertiary)",
                  border: "1.5px solid var(--border-subtle)",
                  borderRadius: "8px",
                  padding: "0.65rem 0.85rem",
                  color: "var(--text-main)",
                  fontWeight: 600,
                  fontSize: "0.92rem",
                  outline: "none",
                }}
              />
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                gap: "0.85rem",
                alignItems: "start",
              }}
            >
              <div>
                <label
                  style={{
                    fontSize: "0.82rem",
                    fontWeight: 700,
                    color: "var(--text-main)",
                    display: "block",
                    marginBottom: "5px",
                  }}
                >
                  Category <span style={{ color: "#ea580c" }}>*</span>
                </label>
                <CustomCreatableDropdown
                  value={itemForm.category}
                  onChange={(val) =>
                    setItemForm({ ...itemForm, category: val })
                  }
                  options={allCategoryOptions}
                  placeholder="Select Category"
                  customPlaceholder="Type new category..."
                  required
                  allowCustom
                  onSaveCustomOption={saveCustomCategory}
                />
              </div>

              <div>
                <label
                  style={{
                    fontSize: "0.82rem",
                    fontWeight: 700,
                    color: "var(--text-main)",
                    display: "block",
                    marginBottom: "5px",
                  }}
                >
                  Price in Rupees (₹){" "}
                  <span style={{ color: "#ea580c" }}>*</span>
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  step="5"
                  value={itemForm.price}
                  onChange={(e) =>
                    setItemForm({ ...itemForm, price: e.target.value })
                  }
                  style={{
                    width: "100%",
                    height: "38px",
                    boxSizing: "border-box",
                    background: "var(--bg-tertiary)",
                    border: "1.5px solid var(--border-subtle)",
                    borderRadius: "8px",
                    padding: "0 0.85rem",
                    color: "var(--text-main)",
                    fontWeight: 700,
                    fontSize: "0.92rem",
                    fontFamily: "var(--font-mono)",
                    outline: "none",
                  }}
                />
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "0.85rem",
              }}
            >
              <div>
                <label
                  style={{
                    fontSize: "0.82rem",
                    fontWeight: 700,
                    color: "var(--text-main)",
                    display: "block",
                    marginBottom: "5px",
                  }}
                >
                  Dietary Type <span style={{ color: "#ea580c" }}>*</span>
                </label>
                <select
                  value={itemForm.isVeg ? "veg" : "non-veg"}
                  onChange={(e) =>
                    setItemForm({
                      ...itemForm,
                      isVeg: e.target.value === "veg",
                    })
                  }
                  style={{
                    width: "100%",
                    background: "var(--bg-tertiary)",
                    border: "1.5px solid var(--border-subtle)",
                    borderRadius: "8px",
                    padding: "0.65rem 0.85rem",
                    color: "var(--text-main)",
                    fontWeight: 600,
                    fontSize: "0.9rem",
                    outline: "none",
                    cursor: "pointer",
                  }}
                >
                  <option value="non-veg">Non-Veg 🔴</option>
                  <option value="veg">Pure Veg 🟢</option>
                </select>
              </div>

              <div>
                <label
                  style={{
                    fontSize: "0.82rem",
                    fontWeight: 700,
                    color: "var(--text-main)",
                    display: "block",
                    marginBottom: "5px",
                  }}
                >
                  Spice Level (0 to 3)
                </label>
                <input
                  type="number"
                  min="0"
                  max="3"
                  value={itemForm.spiceLevel}
                  onChange={(e) =>
                    setItemForm({
                      ...itemForm,
                      spiceLevel: Number(e.target.value),
                    })
                  }
                  style={{
                    width: "100%",
                    background: "var(--bg-tertiary)",
                    border: "1.5px solid var(--border-subtle)",
                    borderRadius: "8px",
                    padding: "0.65rem 0.85rem",
                    color: "var(--text-main)",
                    fontWeight: 700,
                    fontSize: "0.92rem",
                    outline: "none",
                  }}
                />
              </div>
            </div>

            <div>
              <label
                style={{
                  fontSize: "0.82rem",
                  fontWeight: 700,
                  color: "var(--text-main)",
                  display: "block",
                  marginBottom: "5px",
                }}
              >
                Short Description
              </label>
              <textarea
                rows="2"
                placeholder="Delicious tender marinated chicken dum biryani cooked with basmati rice..."
                value={itemForm.description}
                onChange={(e) =>
                  setItemForm({ ...itemForm, description: e.target.value })
                }
                style={{
                  width: "100%",
                  background: "var(--bg-tertiary)",
                  border: "1.5px solid var(--border-subtle)",
                  borderRadius: "8px",
                  padding: "0.65rem 0.85rem",
                  color: "var(--text-main)",
                  fontWeight: 500,
                  fontSize: "0.88rem",
                  outline: "none",
                  resize: "vertical",
                }}
              />
            </div>

            <div>
              <label
                style={{
                  fontSize: "0.82rem",
                  fontWeight: 700,
                  color: "var(--text-main)",
                  display: "block",
                  marginBottom: "5px",
                }}
              >
                Employee ID
              </label>
              <input
                type="text"
                readOnly
                value={
                  editingStaff
                    ? `EMP-${String(editingStaff.staffId ?? editingStaff.id).padStart(5, "0")}`
                    : "Assigned automatically on save"
                }
                style={{
                  width: "100%",
                  background: "var(--bg-tertiary)",
                  border: "1.5px solid var(--border-subtle)",
                  borderRadius: "8px",
                  padding: "0.65rem 0.85rem",
                  color: "var(--text-muted)",
                  fontWeight: 600,
                  fontSize: "0.92rem",
                  outline: "none",
                }}
              />
            </div>

            <div>
              <label
                style={{
                  fontSize: "0.82rem",
                  fontWeight: 700,
                  color: "var(--text-main)",
                  display: "block",
                  marginBottom: "5px",
                }}
              >
                Dish Image (Upload)
              </label>

              {/* File Upload Input */}
              <input
                id="dish-image-file-input"
                type="file"
                accept="image/*"
                disabled={isImageUploading}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;

                  // 1. Immediately read as Base64 Data URL so it is preserved locally in data across all devices
                  const reader = new FileReader();
                  reader.onload = (uploadEvent) => {
                    const base64Data = uploadEvent.target?.result;
                    if (base64Data) {
                      setItemForm((current) => ({
                        ...current,
                        image: base64Data,
                      }));
                    }
                  };
                  reader.readAsDataURL(file);

                  // 2. Also attempt upload to backend API if available
                  setIsImageUploading(true);
                  apiUploadMenuImage(file)
                    .then((result) => {
                      if (result && result.success && result.imageUrl) {
                        setItemForm((current) => ({
                          ...current,
                          image: result.imageUrl,
                        }));
                      }
                    })
                    .catch(() => {})
                    .finally(() => setIsImageUploading(false));
                }}
                style={{
                  width: "100%",
                  background: "var(--bg-tertiary)",
                  border: "1.5px solid var(--border-subtle)",
                  borderRadius: "8px",
                  padding: "0.55rem 0.85rem",
                  color: "var(--text-main)",
                  fontWeight: 500,
                  fontSize: "0.85rem",
                  outline: "none",
                }}
              />

              {/* Dish Image Live Preview - only shown when an image is actually chosen or uploaded */}
              {itemForm.image ? (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginTop: "8px",
                    padding: "6px 10px",
                    borderRadius: "8px",
                    background: "var(--bg-tertiary)",
                    border: "1px dashed var(--border-subtle)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                    }}
                  >
                    <img
                      src={itemForm.image}
                      alt="Dish preview"
                      style={{
                        width: "56px",
                        height: "44px",
                        objectFit: "cover",
                        borderRadius: "6px",
                        border: "1px solid var(--border-card)",
                        background: "var(--bg-card)",
                        flexShrink: 0,
                      }}
                    />
                    <div
                      style={{
                        fontSize: "0.76rem",
                        color: "var(--text-muted)",
                      }}
                    >
                      <div
                        style={{ fontWeight: 600, color: "var(--text-main)" }}
                      >
                        Live Preview
                      </div>
                      <div>Uploaded image ready</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setItemForm((curr) => ({ ...curr, image: "" }));
                      const fileInput = document.getElementById(
                        "dish-image-file-input",
                      );
                      if (fileInput) fileInput.value = "";
                    }}
                    style={{
                      background: "transparent",
                      border: "none",
                      color: "var(--danger)",
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      cursor: "pointer",
                      padding: "4px 8px",
                      borderRadius: "4px",
                    }}
                  >
                    ✕ Remove
                  </button>
                </div>
              ) : null}
            </div>

            <div
              style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}
            >
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  fontSize: "0.85rem",
                  fontWeight: 700,
                  color: "var(--text-main)",
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={Boolean(itemForm.isChefSpecial)}
                  onChange={(e) =>
                    setItemForm({
                      ...itemForm,
                      isChefSpecial: e.target.checked,
                    })
                  }
                  style={{
                    width: "16px",
                    height: "16px",
                    accentColor: "var(--accent-amber)",
                    cursor: "pointer",
                  }}
                />
                <span>Mark as Chef's Special â­</span>
              </label>
            </div>

            {/* INGREDIENTS & INVENTORY BREAKDOWN (RECIPE) */}
            <div
              style={{
                background: "rgba(245, 158, 11, 0.03)",
                border: "1.5px solid var(--border-subtle)",
                borderRadius: "10px",
                padding: "0.9rem",
                display: "flex",
                flexDirection: "column",
                gap: "0.7rem",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "0.5rem",
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
                    <Boxes size={16} color="var(--accent-amber)" />
                    <span style={{ fontSize: "0.88rem", fontWeight: 800, color: "var(--text-main)" }}>
                      Ingredients Breakdown (Inventory)
                    </span>
                    <span
                      style={{
                        fontSize: "0.68rem",
                        fontWeight: 800,
                        background: "rgba(245, 158, 11, 0.15)",
                        color: "var(--accent-amber-light)",
                        padding: "2px 7px",
                        borderRadius: "10px",
                      }}
                    >
                      {itemForm.recipe?.length || 0} Ingredients
                    </span>
                  </div>
                  <div style={{ fontSize: "0.72rem", color: "var(--text-dim)", marginTop: "2px" }}>
                    Ingredients auto-generate in Inventory and auto-deduct when this dish is billed.
                  </div>
                </div>

                <div style={{ display: "flex", gap: "0.4rem" }}>
                  {itemForm.name.trim() && (
                    <button
                      type="button"
                      onClick={handleAutoSuggestIngredients}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "0.3rem",
                        padding: "0.3rem 0.6rem",
                        background: "rgba(16, 185, 129, 0.12)",
                        border: "1px solid rgba(16, 185, 129, 0.35)",
                        color: "var(--success)",
                        borderRadius: "6px",
                        fontSize: "0.73rem",
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                      title="Auto-suggest standard ingredients based on dish name"
                    >
                      <Sparkles size={12} />
                      <span>Auto-Suggest</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleAddRecipeRow}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.3rem",
                      padding: "0.3rem 0.65rem",
                      background: "rgba(245, 158, 11, 0.15)",
                      border: "1px solid rgba(245, 158, 11, 0.4)",
                      color: "var(--accent-amber-light)",
                      borderRadius: "6px",
                      fontSize: "0.74rem",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    <Plus size={13} />
                    <span>+ Add Ingredient</span>
                  </button>
                </div>
              </div>

              {/* List of Ingredients */}
              {(!itemForm.recipe || itemForm.recipe.length === 0) ? (
                <div
                  style={{
                    padding: "0.85rem",
                    background: "var(--bg-tertiary)",
                    borderRadius: "8px",
                    textAlign: "center",
                    border: "1px dashed var(--border-subtle)",
                    color: "var(--text-dim)",
                    fontSize: "0.76rem",
                  }}
                >
                  <span>No ingredients added yet. Click </span>
                  <strong style={{ color: "var(--accent-amber-light)" }}>"+ Add Ingredient"</strong>
                  <span> or </span>
                  <strong style={{ color: "var(--success)" }}>"Auto-Suggest"</strong>
                  <span> to divide this dish into inventory stock items.</span>
                </div>
              ) : (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.45rem",
                    maxHeight: "180px",
                    overflowY: "auto",
                    paddingRight: "2px",
                  }}
                >
                  {itemForm.recipe.map((ing, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1.7fr 0.8fr 0.8fr auto",
                        gap: "0.4rem",
                        alignItems: "center",
                        background: "var(--bg-tertiary)",
                        padding: "0.4rem 0.55rem",
                        borderRadius: "7px",
                        border: "1px solid var(--border-subtle)",
                      }}
                    >
                      {/* Ingredient Name (with datalist autocomplete) */}
                      <div style={{ minWidth: 0 }}>
                        <input
                          type="text"
                          list={`inv-item-suggestions-${idx}`}
                          placeholder="Ingredient (e.g. Basmati Rice)"
                          value={ing.name || ""}
                          onChange={(e) => handleUpdateRecipeRow(idx, { name: e.target.value })}
                          style={{
                            width: "100%",
                            padding: "0.35rem 0.5rem",
                            background: "var(--bg-card)",
                            border: "1px solid var(--border-subtle)",
                            borderRadius: "5px",
                            color: "var(--text-main)",
                            fontSize: "0.77rem",
                            fontWeight: 600,
                            outline: "none",
                            boxSizing: "border-box",
                          }}
                        />
                        <datalist id={`inv-item-suggestions-${idx}`}>
                          {availableIngredients.map((ai) => (
                            <option key={ai.id} value={ai.name} />
                          ))}
                        </datalist>
                      </div>

                      {/* Quantity */}
                      <div style={{ minWidth: 0 }}>
                        <input
                          type="number"
                          step="any"
                          min="0.001"
                          placeholder="Qty (e.g. 0.25)"
                          value={ing.quantity || ""}
                          onChange={(e) => handleUpdateRecipeRow(idx, { quantity: e.target.value })}
                          style={{
                            width: "100%",
                            padding: "0.35rem 0.45rem",
                            background: "var(--bg-card)",
                            border: "1px solid var(--border-subtle)",
                            borderRadius: "5px",
                            color: "var(--text-main)",
                            fontSize: "0.77rem",
                            fontWeight: 600,
                            outline: "none",
                            boxSizing: "border-box",
                          }}
                        />
                      </div>

                      {/* Unit */}
                      <div style={{ minWidth: 0 }}>
                        <select
                          value={ing.unit || "KG"}
                          onChange={(e) => handleUpdateRecipeRow(idx, { unit: e.target.value })}
                          style={{
                            width: "100%",
                            padding: "0.35rem 0.4rem",
                            background: "var(--bg-card)",
                            border: "1px solid var(--border-subtle)",
                            borderRadius: "5px",
                            color: "var(--text-main)",
                            fontSize: "0.77rem",
                            fontWeight: 600,
                            outline: "none",
                            cursor: "pointer",
                            boxSizing: "border-box",
                          }}
                        >
                          {MENU_RECIPE_UNITS.map((u) => (
                            <option key={u} value={u}>
                              {u}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Remove Button */}
                      <button
                        type="button"
                        onClick={() => handleRemoveRecipeRow(idx)}
                        style={{
                          width: "26px",
                          height: "26px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          background: "rgba(239, 68, 68, 0.12)",
                          color: "var(--danger)",
                          border: "1px solid rgba(239, 68, 68, 0.3)",
                          borderRadius: "5px",
                          cursor: "pointer",
                          flexShrink: 0,
                          padding: 0,
                        }}
                        title="Remove ingredient"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div
              style={{ display: "flex", gap: "0.75rem", marginTop: "0.6rem" }}
            >
              <button
                type="button"
                onClick={() => setIsItemModalOpen(false)}
                style={{
                  flex: 1,
                  padding: "0.7rem",
                  background: "var(--bg-tertiary)",
                  border: "1.5px solid var(--border-subtle)",
                  color: "var(--text-main)",
                  borderRadius: "8px",
                  fontSize: "0.85rem",
                  fontWeight: 700,
                  cursor: "pointer",
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
                  color: "#ffffff",
                  borderRadius: "8px",
                  fontSize: "0.88rem",
                  fontWeight: 800,
                  border: "none",
                  cursor: "pointer",
                  boxShadow: "0 3px 12px rgba(234, 88, 12, 0.4)",
                }}
              >
                {isImageUploading
                  ? "Uploading image..."
                  : editingItem
                    ? "Save Item Changes"
                    : "Create Item"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ================= MODAL: ADD / EDIT TABLE & CHAIRS ================= */}
      {isTableModalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "var(--modal-overlay)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 130,
            padding: "1rem",
          }}
        >
          <form
            onSubmit={handleSaveTable}
            style={{
              background: "var(--bg-secondary)",
              border: "1.5px solid var(--border-subtle)",
              borderRadius: "var(--radius-lg)",
              boxShadow: "var(--shadow-lg)",
              width: "100%",
              maxWidth: "480px",
              padding: "1.6rem",
              display: "flex",
              flexDirection: "column",
              gap: "1.1rem",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                borderBottom: "1.5px solid var(--border-subtle)",
                paddingBottom: "0.85rem",
              }}
            >
              <h3
                style={{
                  fontSize: "1.15rem",
                  fontWeight: 800,
                  color: "var(--text-main)",
                  letterSpacing: "-0.01em",
                }}
              >
                {editingTable
                  ? `Edit ${editingTable.name}`
                  : "Add New Restaurant Table"}
              </h3>
              <button
                type="button"
                onClick={() => setIsTableModalOpen(false)}
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
              >
                <X size={18} />
              </button>
            </div>

            <div>
              <label
                style={{
                  fontSize: "0.82rem",
                  fontWeight: 700,
                  color: "var(--text-main)",
                  display: "block",
                  marginBottom: "5px",
                }}
              >
                Table Name / Identifier{" "}
                <span style={{ color: "#ea580c" }}>*</span>
              </label>
              <input
                type="text"
                required
                value={tableForm.name}
                onChange={(e) =>
                  setTableForm({ ...tableForm, name: e.target.value })
                }
                style={{
                  width: "100%",
                  background: "var(--bg-tertiary)",
                  border: "1.5px solid var(--border-subtle)",
                  borderRadius: "8px",
                  padding: "0.65rem 0.85rem",
                  color: "var(--text-main)",
                  fontWeight: 600,
                  fontSize: "0.92rem",
                  outline: "none",
                }}
              />
            </div>

            <div>
              <label
                style={{
                  fontSize: "0.82rem",
                  fontWeight: 700,
                  color: "var(--text-main)",
                  display: "block",
                  marginBottom: "5px",
                }}
              >
                Dining Section / Area{" "}
                <span style={{ color: "#ea580c" }}>*</span>
              </label>
              <CustomCreatableDropdown
                value={tableForm.section}
                onChange={(val) => setTableForm({ ...tableForm, section: val })}
                options={allSectionOptions}
                placeholder="Select dining section"
                customPlaceholder="Type new section..."
                required
                allowCustom
                onSaveCustomOption={saveCustomSection}
              />
            </div>

            <div>
              <label
                style={{
                  fontSize: "0.82rem",
                  fontWeight: 700,
                  color: "var(--text-main)",
                  display: "block",
                  marginBottom: "6px",
                }}
              >
                Chairs / Seating Capacity (Persons){" "}
                <span style={{ color: "#ea580c" }}>*</span>
              </label>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(5, 1fr)",
                  gap: "0.5rem",
                  marginBottom: "0.6rem",
                }}
              >
                {[2, 4, 6, 8, 10].map((chairCount) => {
                  const isSelected = tableForm.capacity === chairCount;
                  return (
                    <button
                      key={chairCount}
                      type="button"
                      onClick={() =>
                        setTableForm({ ...tableForm, capacity: chairCount })
                      }
                      style={{
                        padding: "0.55rem 0.3rem",
                        borderRadius: "8px",
                        background: isSelected
                          ? "linear-gradient(135deg, #f59e0b, #ea580c)"
                          : "var(--bg-tertiary)",
                        color: isSelected ? "#ffffff" : "var(--text-main)",
                        fontWeight: 800,
                        fontSize: "0.82rem",
                        border: isSelected
                          ? "1.5px solid #ea580c"
                          : "1.5px solid var(--border-subtle)",
                        boxShadow: isSelected
                          ? "0 3px 10px rgba(234, 88, 12, 0.35)"
                          : "none",
                        cursor: "pointer",
                        transition: "all 0.15s ease",
                      }}
                    >
                      {chairCount} Seats
                    </button>
                  );
                })}
              </div>
              <input
                type="number"
                min="1"
                max="30"
                value={tableForm.capacity}
                onChange={(e) =>
                  setTableForm({
                    ...tableForm,
                    capacity: Number(e.target.value),
                  })
                }
                style={{
                  width: "100%",
                  background: "var(--bg-tertiary)",
                  border: "1.5px solid var(--border-subtle)",
                  borderRadius: "8px",
                  padding: "0.65rem 0.85rem",
                  color: "var(--text-main)",
                  fontWeight: 700,
                  fontSize: "0.92rem",
                  outline: "none",
                }}
              />
            </div>

            <div>
              <div
                style={{
                  marginBottom: "5px",
                }}
              >
                <label
                  style={{
                    fontSize: "0.82rem",
                    fontWeight: 700,
                    color: "var(--text-main)",
                  }}
                >
                  Default Server (Person)
                </label>
              </div>

              <CustomCreatableDropdown
                value={tableForm.server}
                onChange={(val) => {
                  setTableForm({ ...tableForm, server: val });
                }}
                options={staffList.map((staff) => {
                  const staffName = String(
                    staff?.name ||
                      staff?.fullName ||
                      staff?.FullName ||
                      staff?.username ||
                      "Unnamed staff",
                  );
                  const staffRole =
                    staff?.role || staff?.roleTitle || "Staff";
                  return {
                    value: staffName,
                    label: `${staffName} (${staffRole})`,
                  };
                })}
                placeholder="Select server"
                customPlaceholder="Type new server name..."
                allowCustom
                onSaveCustomOption={(newServer) => {
                  if (newServer && newServer !== "__add_new__") {
                    setTableForm({ ...tableForm, server: newServer });
                    if (
                      !staffList.some(
                        (s) =>
                          s.name?.toLowerCase() === newServer.toLowerCase(),
                      )
                    ) {
                      onAddStaff({
                        id: Date.now(),
                        name: newServer,
                        role: "",
                        phone: "+91 98450 00000",
                        shift: "",
                      });
                    }
                  }
                }}
              />
            </div>

            <div
              style={{ display: "flex", gap: "0.75rem", marginTop: "0.6rem" }}
            >
              <button
                type="button"
                onClick={() => setIsTableModalOpen(false)}
                style={{
                  flex: 1,
                  padding: "0.7rem",
                  background: "var(--bg-tertiary)",
                  border: "1.5px solid var(--border-subtle)",
                  color: "var(--text-main)",
                  borderRadius: "8px",
                  fontSize: "0.85rem",
                  fontWeight: 700,
                  cursor: "pointer",
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
                  color: "#ffffff",
                  borderRadius: "8px",
                  fontSize: "0.88rem",
                  fontWeight: 800,
                  border: "none",
                  cursor: "pointer",
                  boxShadow: "0 3px 12px rgba(234, 88, 12, 0.4)",
                }}
              >
                {editingTable ? "Update Table Chairs" : "Add Table"}
              </button>
            </div>
          </form>
        </div>
      )}



      {/* ================= MODAL: ADD / EDIT STAFF PERSON ================= */}
      {isStaffModalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "var(--modal-overlay)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 130,
            padding: "1rem",
          }}
        >
          <form
            onSubmit={handleSaveStaff}
            style={{
              background: "var(--bg-secondary)",
              border: "1.5px solid var(--border-subtle)",
              borderRadius: "var(--radius-lg)",
              boxShadow: "var(--shadow-lg)",
              width: "100%",
              maxWidth: "460px",
              padding: "1.6rem",
              display: "flex",
              flexDirection: "column",
              gap: "1.1rem",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                borderBottom: "1.5px solid var(--border-subtle)",
                paddingBottom: "0.85rem",
              }}
            >
              <h3
                style={{
                  fontSize: "1.15rem",
                  fontWeight: 800,
                  color: "var(--text-main)",
                  letterSpacing: "-0.01em",
                }}
              >
                {editingStaff ? "Edit Staff Details" : "Add New Staff Person"}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setEditingStaff(null);
                  setIsStaffModalOpen(false);
                }}
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
              >
                <X size={18} />
              </button>
            </div>

            <div>
              <label
                style={{
                  fontSize: "0.82rem",
                  fontWeight: 700,
                  color: "var(--text-main)",
                  display: "block",
                  marginBottom: "5px",
                }}
              >
                Person Full Name <span style={{ color: "#ea580c" }}>*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Ramesh Kumar"
                value={staffForm.name}
                onChange={(e) =>
                  setStaffForm({ ...staffForm, name: e.target.value })
                }
                style={{
                  width: "100%",
                  background: "var(--bg-tertiary)",
                  border: "1.5px solid var(--border-subtle)",
                  borderRadius: "8px",
                  padding: "0.65rem 0.85rem",
                  color: "var(--text-main)",
                  fontWeight: 600,
                  fontSize: "0.92rem",
                  outline: "none",
                }}
              />
            </div>

            <div>
              <label
                style={{
                  fontSize: "0.82rem",
                  fontWeight: 700,
                  color: "var(--text-main)",
                  display: "block",
                  marginBottom: "5px",
                }}
              >
                Role / Designation
              </label>
              <CustomCreatableDropdown
                value={staffForm.role}
                onChange={(val) => setStaffForm({ ...staffForm, role: val })}
                options={allRoleOptions}
                placeholder="Select role"
                customPlaceholder="Type new role..."
                required
                allowCustom
                onSaveCustomOption={saveCustomRole}
              />
            </div>

            <div>
              <label
                style={{
                  fontSize: "0.82rem",
                  fontWeight: 700,
                  color: "var(--text-main)",
                  display: "block",
                  marginBottom: "5px",
                }}
              >
                Contact Phone
              </label>
              <input
                type="text"
                placeholder="+91 98450 12345"
                value={staffForm.phone}
                onChange={(e) =>
                  setStaffForm({ ...staffForm, phone: e.target.value })
                }
                style={{
                  width: "100%",
                  height: "38px",
                  boxSizing: "border-box",
                  background: "var(--bg-tertiary)",
                  border: "1.5px solid var(--border-subtle)",
                  borderRadius: "8px",
                  padding: "0 0.85rem",
                  color: "var(--text-main)",
                  fontWeight: 600,
                  fontSize: "0.92rem",
                  outline: "none",
                }}
              />
            </div>

            <div>
              <label
                style={{
                  fontSize: "0.82rem",
                  fontWeight: 700,
                  color: "var(--text-main)",
                  display: "block",
                  marginBottom: "5px",
                }}
              >
                Shift
              </label>
              <CustomCreatableDropdown
                value={staffForm.shift}
                onChange={(val) => setStaffForm({ ...staffForm, shift: val })}
                options={allShiftOptions}
                placeholder="Select shift"
                customPlaceholder="Type new shift..."
                allowCustom
                onSaveCustomOption={saveCustomShift}
              />
            </div>

            <div
              style={{ display: "flex", gap: "0.75rem", marginTop: "0.6rem" }}
            >
              <button
                type="button"
                onClick={() => {
                  setEditingStaff(null);
                  setIsStaffModalOpen(false);
                }}
                style={{
                  flex: 1,
                  padding: "0.7rem",
                  background: "var(--bg-tertiary)",
                  border: "1.5px solid var(--border-subtle)",
                  color: "var(--text-main)",
                  borderRadius: "8px",
                  fontSize: "0.85rem",
                  fontWeight: 700,
                  cursor: "pointer",
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
                  color: "#ffffff",
                  borderRadius: "8px",
                  fontSize: "0.88rem",
                  fontWeight: 800,
                  border: "none",
                  cursor: "pointer",
                  boxShadow: "0 3px 12px rgba(234, 88, 12, 0.4)",
                }}
              >
                {editingStaff ? "Save Changes" : "Add Person"}
              </button>
            </div>
          </form>
        </div>
      )}
      {/* Global Custom Delete Confirmation Modal */}
      <ConfirmDeleteModal {...confirmState} onCancel={cancelDelete} />
    </div>
  );
}
