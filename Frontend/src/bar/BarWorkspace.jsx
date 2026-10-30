import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Armchair, ArrowRight, BarChart3, Beer, Check, ChefHat, ChevronLeft, ChevronRight,
  Clock3, Coffee, Eye, FileText, GlassWater, IndianRupee, Martini, Package,
  Pencil, SquarePen, Star, Plus, Printer, Receipt, RefreshCw, Search, Trash2, Users, Wine, X, AlertCircle, RotateCcw
} from "lucide-react";
import { apiAddOrderItems, apiCreateOrder, apiGetActiveOrders, apiGetOrderForTable, apiSendOrderKot } from "../api/orderApi";
import { apiAdjustStock, apiCreateInventoryItem, apiUpdateInventoryItem, apiDeleteInventoryItem, apiGetInventory } from "../api/inventoryApi";
import { createMenuItemLookup, findMenuItem, isBeverageCategory } from "../kot/orderRouting";

import { formatCurrency } from "../utils/formatCurrency";
import { getMenuItemImage, handleDishImageError } from "../utils/menuImageHelper";
import { SkeletonTable } from "../common/Skeletons";
import { BarBOTView, BarKOTView } from "./BarBOTView";
import { AdminInvoices } from "../admin/AdminInvoices";
import "./BarWorkspace.css";
import {
  apiGetBarTables,
  apiCreateBarTable,
  apiUpdateBarTable,
  apiDeleteBarTable,
  apiGetBarTableAreas,
  apiUpdateBarTableStatus,
  apiGetBarDrinks,
  apiGetBarDrinkById,
  apiCreateBarDrink,
  apiUpdateBarDrink,
  apiDeleteBarDrink,
  apiToggleBarDrinkAvailability,
  apiToggleBarDrinkSpecial,
  apiGetBarDrinkCategories,
  apiGetBarServingMeasures,
  apiGetBarPriceRanges,
  apiGetBarAvailabilityOptions,
  apiGetBarOverview,
  apiGetBarRecentOrders,
  apiGetBarStaff,
  apiGetBarStaffById,
  apiCreateBarStaff,
  apiUpdateBarStaff,
  apiToggleBarStaffStatus,
  apiDeleteBarStaff,
  apiGetBarStaffFilterOptions,
  apiGetAssignableTables,
} from "../api/barApi";
import { ConfirmDeleteModal, useConfirmDelete } from "../common/ConfirmDeleteModal";
import { SelectSeatsModal } from "../common/SelectSeatsModal";
import { CustomCreatableDropdown } from "../common/CustomCreatableDropdown";


const PAGE_SIZE = 8;
const BAR_AREAS = ["Bar Counter", "Lounge", "Indoor Bar", "Outdoor Bar"];
const BAR_ROLES = ["Bartender", "Head Bartender", "Bar Manager", "Bar Waiter", "Bar Server", "Mixologist", "Bar Assistant"];
const BAR_SHIFTS = ["Morning (10 AM-4 PM)", "Evening (4 PM-10 PM)", "Night (6 PM-Close)"];
const SETTINGS_DEFAULTS = {
  barName: "Telugu Taste Bar", contact: "+91 80 4567 8900", area: "Ground Floor • East Wing",
  opening: "10:00", closing: "23:30", prepTime: 8, kotPrefix: "BKOT", autoPrint: false,
  allowCancellation: true, currency: "INR (₹)", tax: 5, service: 5,
  lowStock: 6, stockTracking: true, stockUnit: "Bottle",
};
const ACCESS_ROLES = ["Bar Manager", "Head Bartender", "Bartender", "Bar Server", "Bar Cashier"];
const ACCESS_PAGES = ["Bar Overview", "Drinks Menu", "Bar Tables", "Bar Staff", "Bar KOT", "Inventory", "Orders", "Reports", "Settings"];
const ACCESS_DEFAULTS = Object.fromEntries(ACCESS_ROLES.map((role, index) => [role, Object.fromEntries(ACCESS_PAGES.map((page) => [page, index === 0 || (index === 1 && page !== "Settings") || (index === 2 && ["Bar Overview", "Drinks Menu", "Bar Tables", "Bar KOT"].includes(page)) || (index === 3 && ["Bar Overview", "Bar Tables", "Bar KOT"].includes(page)) || (index === 4 && ["Bar Overview", "Orders"].includes(page))]))]));

const BAR_DRINK_UNITS = ["Glass", "Bottle", "Can", "Peg", "ml", "Litre"];

export const BAR_CATEGORIES = [
  "Cocktails",
  "Mocktails",
  "Beers",
  "Whiskey",
  "Vodka & Gin",
  "Rum & Brandy",
  "Wine & Champagne",
  "Shots & Shooters",
  "Juices & Shakes",
  "Soft Drinks & Soda",
  "Tea & Coffee",
];

export const BAR_SERVING_MEASURES = [
  "30 ml (Single Peg)",
  "60 ml (Double Peg)",
  "90 ml (Large Peg)",
  "Pint (330 ml)",
  "Bottle (650 ml)",
  "Bottle (750 ml)",
  "Glass (150 ml)",
  "Glass (250 ml)",
  "Can (330 ml)",
  "Can (500 ml)",
  "Peg (60 ml)",
  "Pitcher (1500 ml)",
  "Tower (3000 ml)",
];
const FIELD_SETS = {
  drink: [
    ["name", "Drink Name", "text", true],
    ["category", "Category", "category_selector", true],
    ["drinkType", "Drink Type", "select", false, ["Alcoholic", "Non-Alcoholic"]],
    ["abv", "Alcohol Content (ABV %)", "number", false],
    ["measure", "Serving Measure / Volume", "measure_selector", false],
    ["price", "Selling Price (₹)", "number", true],
    ["isAvailable", "Availability", "select", false, ["Available", "Unavailable"]],
    ["description", "Description", "textarea"],
    ["image", "Choose Image", "image"],
  ],
  table: [
    ["number", "Table Number", "text", true], ["area", "Area / Section", "select", true, BAR_AREAS],
    ["capacity", "Seating Capacity", "number", true], ["guests", "Current Guests", "number"],
    ["status", "Occupancy Status", "select", true, ["Available", "Occupied", "Reserved", "Cleaning", "Inactive"]],
    ["staffId", "Assigned Server", "select", false, []],
  ],
  staff: [
    ["name", "Full Name", "text", true], ["role", "Job Title", "select", true, BAR_ROLES],
    ["phone", "Phone / Contact", "tel", true], ["shift", "Shift", "select", true, BAR_SHIFTS],
    ["tables", "Assigned Tables", "multiselect"],
  ],
  order: [
    ["table", "Table / Order Type", "text", true], ["customer", "Customer", "text", true],
    ["items", "Drinks and Quantities", "textarea", true], ["subtotal", "Subtotal", "number", true],
  ],
};

export const BAR_INVENTORY_CATEGORIES = [
  {
    category: "Whiskey & Scotch",
    subcategories: ["Single Malt Scotch", "Blended Scotch", "Bourbon & American", "Irish Whiskey", "Premium Indian Whisky"],
    defaultUnit: "Bottle (750 ml)",
    defaultAbv: 42.8,
  },
  {
    category: "Vodka & Gin",
    subcategories: ["Premium Vodka", "Flavored Vodka", "London Dry Gin", "Craft Botanical Gin", "Pink Gin"],
    defaultUnit: "Bottle (750 ml)",
    defaultAbv: 40,
  },
  {
    category: "Rum & Brandy",
    subcategories: ["White Rum", "Dark / Spiced Rum", "Aged Rum", "Cognac & VSOP", "Premium Brandy"],
    defaultUnit: "Bottle (750 ml)",
    defaultAbv: 42.8,
  },
  {
    category: "Tequila & Mezcal",
    subcategories: ["Silver / Blanco", "Reposado Tequila", "Añejo Tequila", "Artisanal Mezcal"],
    defaultUnit: "Bottle (750 ml)",
    defaultAbv: 38,
  },
  {
    category: "Beers & Ciders",
    subcategories: ["Draught Beer Keg", "Premium Lager (Pint 330ml)", "Strong Beer (650ml)", "Craft Wheat Beer", "Apple / Fruit Cider"],
    defaultUnit: "Bottle (330 ml)",
    defaultAbv: 5,
  },
  {
    category: "Wine & Champagne",
    subcategories: ["Red Wine", "White Wine", "Sparkling Wine / Prosecco", "Brut Champagne", "Rosé Wine", "Port Wine"],
    defaultUnit: "Bottle (750 ml)",
    defaultAbv: 12.5,
  },
  {
    category: "Liqueurs & Bitters",
    subcategories: ["Coffee Liqueur (Kahlúa)", "Irish Cream (Baileys)", "Triple Sec / Orange", "Herbal / Aperitif (Campari)", "Angostura Bitters"],
    defaultUnit: "Bottle (750 ml)",
    defaultAbv: 25,
  },
  {
    category: "Cocktails & Premixes",
    subcategories: ["Margarita Mix", "Bloody Mary Base", "Sour Mix", "Piña Colada Mix", "Cocktail Concentrates"],
    defaultUnit: "Bottle (1 L)",
    defaultAbv: 0,
  },
  {
    category: "Mocktails & Syrups",
    subcategories: ["Blue Curacao Syrup", "Grenadine Syrup", "Mojito Mint Syrup", "Passion Fruit Puree", "Simple Sugar Syrup"],
    defaultUnit: "Bottle (1 L)",
    defaultAbv: 0,
  },
  {
    category: "Soft Drinks, Tonics & Soda",
    subcategories: ["Club Soda", "Tonic Water", "Ginger Ale", "Cola / Diet Cola", "Lemon Soda (Sprite/Limca)", "Energy Drink (Red Bull)"],
    defaultUnit: "Can (330 ml)",
    defaultAbv: 0,
  },
  {
    category: "Juices & Purees",
    subcategories: ["Cranberry Juice", "Fresh Orange Juice", "Pineapple Juice", "Fresh Lime Juice", "Apple Juice", "Tomato Juice"],
    defaultUnit: "Tetra Pack (1 L)",
    defaultAbv: 0,
  },
  {
    category: "Bar Garnishes & Supplies",
    subcategories: ["Maraschino Cherries", "Cocktail Stuffed Olives", "Margarita Rim Salt", "Cocktail Sugar", "Fresh Lemons & Limes", "Fresh Mint"],
    defaultUnit: "Jar / Canister",
    defaultAbv: 0,
  },
  {
    category: "Bar Consumables & Ice",
    subcategories: ["Clear Ice Blocks / Cubes", "Cocktail Paper Straws", "Stirrers & Cocktail Picks", "Bar Coasters", "Bar Napkins"],
    defaultUnit: "Pack / Box",
    defaultAbv: 0,
  },
];

export const BAR_INVENTORY_UNITS = [
  "Bottle (750 ml)",
  "Bottle (1000 ml / 1 L)",
  "Bottle (330 ml)",
  "Bottle (650 ml)",
  "Can (330 ml)",
  "Can (500 ml)",
  "Keg (30 L)",
  "Keg (50 L)",
  "Tetra Pack (1 L)",
  "Litre (L)",
  "Millilitre (ml)",
  "Peg (30 ml)",
  "Peg (60 ml)",
  "Jar / Canister",
  "Pack / Case",
  "Pcs / Units",
];

export const BAR_STORAGE_LOCATIONS = [
  "Front Bar Display Shelf",
  "Under-Counter Bar Chiller",
  "Wine Cellar & Display Rack",
  "Back Bar Main Storage",
  "Beer Tap Cold Room",
  "Dry Store / Bar Pantry",
];

export const BAR_SUPPLIERS = [
  "State Beverages Corporation (TSBCL/Govt Depot)",
  "United Spirits / Diageo India",
  "Pernod Ricard India",
  "AB InBev / SABMiller Brewery",
  "Carlsberg India",
  "Sula Vineyards & Winery Depot",
  "Monin Gourmet Syrups Distributor",
  "Coca-Cola / Schweppes Beverages Depot",
  "Local Wholesale Bar Supplier",
];

function SharedBarInventory({ inventory, loading, error, onRefresh }) {
  const [busy, setBusy] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalBusy, setModalBusy] = useState(false);
  const [modalError, setModalError] = useState("");
  const [editingItem, setEditingItem] = useState(null);

  // Filter & Search states
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [stockFilter, setStockFilter] = useState("all");

  const defaultForm = {
    name: "",
    category: "Whiskey & Scotch",
    subcategory: "Single Malt Scotch",
    brand: "",
    unit: "Bottle (750 ml)",
    volumeMl: 750,
    abv: 42.8,
    stock: 12,
    minThreshold: 5,
    unitCost: 2500,
    sellingPrice: 3500,
    storageLocation: "Front Bar Display Shelf",
    supplier: "State Beverages Corporation (TSBCL/Govt Depot)",
  };

  const [formData, setFormData] = useState(defaultForm);
  const [customCategory, setCustomCategory] = useState(false);
  const [customUnit, setCustomUnit] = useState(false);
  const [customLocation, setCustomLocation] = useState(false);
  const [customSupplier, setCustomSupplier] = useState(false);

  // 1. Strict filter: Purge mock kitchen packaging, food, and non-beverage items
  const validBeverages = useMemo(() => {
    const list = Array.isArray(inventory) ? inventory : [];
    return list.filter((item) => {
      if (!item) return false;
      const name = String(item.name || "").trim().toLowerCase();
      const cat = String(item.category || item.subcategory || "").trim().toLowerCase();
      if (
        name.includes("handi") ||
        name.includes("foil") ||
        name.includes("container") ||
        name.includes("tray") ||
        name.includes("takeaway") ||
        name.includes("chicken") ||
        name.includes("mutton") ||
        name.includes("biryani") ||
        name.includes("paneer") ||
        name.includes("naan") ||
        name.includes("roti") ||
        name.includes("kebab") ||
        name.includes("shawarma") ||
        cat.includes("packaging") ||
        cat.includes("disposable") ||
        cat.includes("produce") ||
        cat.includes("meat") ||
        cat.includes("grain") ||
        cat.includes("spice") ||
        cat.includes("hygiene") ||
        cat.includes("cleaning")
      ) {
        return false;
      }
      return isBeverageCategory(item.category ?? item.subcategory ?? item.name);
    });
  }, [inventory]);

  // Available categories for dropdown filter
  const availableCategories = useMemo(() => {
    const set = new Set();
    BAR_INVENTORY_CATEGORIES.forEach((c) => set.add(c.category));
    validBeverages.forEach((item) => {
      if (item.category) set.add(item.category);
    });
    return Array.from(set);
  }, [validBeverages]);

  // Filtered rows matching search & filter
  const filteredRows = useMemo(() => {
    return validBeverages.filter((item) => {
      const q = query.trim().toLowerCase();
      const matchesSearch =
        !q ||
        String(item.name || "").toLowerCase().includes(q) ||
        String(item.brand || item.subcategory || "").toLowerCase().includes(q) ||
        String(item.category || "").toLowerCase().includes(q) ||
        String(item.storageLocation || "").toLowerCase().includes(q);

      const matchesCat =
        categoryFilter === "all" ||
        String(item.category || "").toLowerCase() === categoryFilter.toLowerCase();

      const stock = Number(item.stock ?? item.currentStock ?? 0);
      const threshold = Number(item.minThreshold ?? item.minimumThreshold ?? 0);
      const matchesStock =
        stockFilter === "all" ||
        (stockFilter === "out_of_stock" && stock <= 0) ||
        (stockFilter === "low_stock" && stock > 0 && stock <= threshold) ||
        (stockFilter === "in_stock" && stock > threshold);

      return matchesSearch && matchesCat && matchesStock;
    });
  }, [validBeverages, query, categoryFilter, stockFilter]);

  // Operational KPI metrics
  const totalItems = validBeverages.length;
  const totalUnits = validBeverages.reduce((sum, item) => sum + Number(item.stock ?? item.currentStock ?? 0), 0);
  const lowStockCount = validBeverages.filter((item) => {
    const s = Number(item.stock ?? item.currentStock ?? 0);
    const th = Number(item.minThreshold ?? item.minimumThreshold ?? 0);
    return s > 0 && s <= th;
  }).length;
  const outOfStockCount = validBeverages.filter((item) => Number(item.stock ?? item.currentStock ?? 0) <= 0).length;
  const inStockCount = validBeverages.filter((item) => {
    const s = Number(item.stock ?? item.currentStock ?? 0);
    const th = Number(item.minThreshold ?? item.minimumThreshold ?? 0);
    return s > th;
  }).length;
  const totalValuation = validBeverages.reduce((sum, item) => {
    const s = Number(item.stock ?? item.currentStock ?? 0);
    const c = Number(item.unitCost ?? item.cost ?? 0);
    return sum + (s * c);
  }, 0);

  // Form field updater
  const setField = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleCategorySelect = (selectedCat) => {
    if (selectedCat === "__custom__") {
      setCustomCategory(true);
      setFormData((prev) => ({ ...prev, category: "" }));
      return;
    }
    setCustomCategory(false);
    const matched = BAR_INVENTORY_CATEGORIES.find((c) => c.category === selectedCat);
    setFormData((prev) => ({
      ...prev,
      category: selectedCat,
      subcategory: matched?.subcategories?.[0] || prev.subcategory || "",
      unit: matched?.defaultUnit || prev.unit || "Bottle (750 ml)",
      abv: matched?.defaultAbv !== undefined ? matched.defaultAbv : prev.abv,
      volumeMl: matched?.defaultUnit?.includes("750") ? 750 : matched?.defaultUnit?.includes("1 L") ? 1000 : matched?.defaultUnit?.includes("330") ? 330 : prev.volumeMl,
    }));
  };

  const openAddModal = () => {
    setEditingItem(null);
    setFormData(defaultForm);
    setCustomCategory(false);
    setCustomUnit(false);
    setCustomLocation(false);
    setCustomSupplier(false);
    setModalError("");
    setModalOpen(true);
  };

  const openEditModal = (item) => {
    setEditingItem(item);
    const catExists = BAR_INVENTORY_CATEGORIES.some((c) => c.category.toLowerCase() === String(item.category || "").toLowerCase());
    const unitExists = BAR_INVENTORY_UNITS.some((u) => u.toLowerCase() === String(item.unit || "").toLowerCase());
    const locExists = BAR_STORAGE_LOCATIONS.some((l) => l.toLowerCase() === String(item.storageLocation || "").toLowerCase());
    const supExists = BAR_SUPPLIERS.some((s) => s.toLowerCase() === String(item.supplier || "").toLowerCase());

    setCustomCategory(!catExists && Boolean(item.category));
    setCustomUnit(!unitExists && Boolean(item.unit));
    setCustomLocation(!locExists && Boolean(item.storageLocation));
    setCustomSupplier(!supExists && Boolean(item.supplier));

    setFormData({
      name: item.name || "",
      category: item.category || "Whiskey & Scotch",
      subcategory: item.subcategory || item.brand || "",
      brand: item.brand || item.subcategory || "",
      unit: item.unit || "Bottle (750 ml)",
      volumeMl: item.volumeMl ?? (String(item.unit || "").includes("750") ? 750 : String(item.unit || "").includes("1 L") ? 1000 : 750),
      abv: item.abv ?? 42.8,
      stock: Number(item.stock ?? item.currentStock ?? 0),
      minThreshold: Number(item.minThreshold ?? item.minimumThreshold ?? 5),
      unitCost: Number(item.unitCost ?? item.cost ?? 0),
      sellingPrice: Number(item.sellingPrice ?? item.mrp ?? 0),
      storageLocation: item.storageLocation || "Front Bar Display Shelf",
      supplier: item.supplier || "State Beverages Corporation (TSBCL/Govt Depot)",
    });
    setModalError("");
    setModalOpen(true);
  };

  const saveInventoryItem = async (event) => {
    event.preventDefault();
    setModalBusy(true);
    setModalError("");

    if (!formData.name.trim()) {
      setModalError("Beverage item name is required.");
      setModalBusy(false);
      return;
    }
    if (!formData.category.trim()) {
      setModalError("Category is required.");
      setModalBusy(false);
      return;
    }

    try {
      if (editingItem) {
        const targetId = editingItem.id ?? editingItem.ingredientId;
        const res = await apiUpdateInventoryItem(targetId, formData);
        if (!res?.success) throw new Error(res?.error || "Could not update the inventory item.");
      } else {
        const res = await apiCreateInventoryItem(formData);
        if (!res?.success) throw new Error(res?.error || "Could not create the inventory item.");
      }
      setModalOpen(false);
      await onRefresh();
      window.dispatchEvent(new CustomEvent("avsr-inventory-updated", { detail: [] }));
    } catch (requestError) {
      console.error("[Bar Inventory] Save failed:", requestError);
      setModalError(requestError?.message || "Could not save inventory item.");
    } finally {
      setModalBusy(false);
    }
  };

  const adjustStock = async (item, direction) => {
    const isReceive = direction > 0;
    const promptMsg = isReceive
      ? `Enter quantity received for ${item.name} (${item.unit || "units"}):`
      : `Enter quantity to adjust/deduct for ${item.name} (${item.unit || "units"}):`;
    const input = window.prompt(promptMsg, "1");
    if (input === null) return;
    const amount = Number(input);
    if (!Number.isFinite(amount) || amount <= 0) {
      window.alert("Please enter a valid positive number.");
      return;
    }
    setBusy(true);
    try {
      const response = await apiAdjustStock({
        ingredientId: item.id ?? item.ingredientId,
        quantityChange: amount * direction,
        reason: isReceive ? "Bar stock received" : "Bar stock adjustment / wastage",
      });
      if (!response?.success) throw new Error(response?.error || "Stock adjustment failed.");
      await onRefresh();
      window.dispatchEvent(new CustomEvent("avsr-inventory-updated", { detail: [] }));
    } catch (requestError) {
      console.error("[Bar Inventory] Stock adjustment failed:", requestError);
      window.alert(requestError?.message || "Stock adjustment failed.");
    } finally {
      setBusy(false);
    }
  };

  const deleteItem = async (item) => {
    const confirmed = window.confirm(`Are you sure you want to permanently delete "${item.name}" from Bar Inventory?`);
    if (!confirmed) return;
    setBusy(true);
    try {
      const targetId = item.id ?? item.ingredientId;
      const res = await apiDeleteInventoryItem(targetId);
      if (!res?.success) throw new Error(res?.error || "Delete failed.");
      await onRefresh();
      window.dispatchEvent(new CustomEvent("avsr-inventory-updated", { detail: [] }));
    } catch (requestError) {
      console.error("[Bar Inventory] Delete failed:", requestError);
      window.alert(requestError?.message || "Could not delete inventory item.");
    } finally {
      setBusy(false);
    }
  };

  const purgeMockPackagingData = async () => {
    const nonBarItems = (Array.isArray(inventory) ? inventory : []).filter((item) => {
      const name = String(item.name || "").toLowerCase();
      const cat = String(item.category || "").toLowerCase();
      return (
        name.includes("handi") ||
        name.includes("foil") ||
        name.includes("container") ||
        name.includes("takeaway") ||
        cat.includes("packaging") ||
        cat.includes("disposable")
      );
    });

    if (nonBarItems.length === 0) {
      window.alert("No packaging or mock items found in inventory.");
      return;
    }

    const confirmPurge = window.confirm(
      `Found ${nonBarItems.length} kitchen packaging / mock item(s) (e.g. Foil Meal Trays, Takeaway Handis). Purge them now to keep Bar Inventory completely clean?`
    );
    if (!confirmPurge) return;

    setBusy(true);
    try {
      for (const item of nonBarItems) {
        await apiDeleteInventoryItem(item.id ?? item.ingredientId).catch(() => {});
      }
      await onRefresh();
      window.dispatchEvent(new CustomEvent("avsr-inventory-updated", { detail: [] }));
      window.alert("Successfully purged mock packaging items from inventory!");
    } catch (err) {
      window.alert("Some items could not be purged: " + err.message);
    } finally {
      setBusy(false);
    }
  };

  // Find subcategories for current category
  const currentCategoryObj = BAR_INVENTORY_CATEGORIES.find((c) => c.category === formData.category);
  const currentSubcategories = currentCategoryObj?.subcategories || [];

  return (
    <section className="bar-page-card" style={{ padding: 0, overflow: "hidden" }}>
      {/* 1. Header with Actions */}
      <div className="bar-section-head" style={{ padding: "16px 18px", borderBottom: "1px solid var(--bar-line)" }}>
        <div>
          <h2 style={{ display: "flex", alignItems: "center", gap: "8px", margin: 0, fontSize: "1.2rem" }}>
            <Wine size={20} color="var(--accent-amber)" /> Bar Inventory & Liquor Ledger
          </h2>
          <p style={{ margin: "4px 0 0", color: "var(--text-muted)", fontSize: "0.75rem" }}>
            Track bottles, barrels, kegs, spirits, wines, mixers, and bar consumables in real time.
          </p>
        </div>
        <div className="bar-actions">
          <button className="bar-button primary" type="button" onClick={openAddModal}>
            <Plus size={15} /> Add Inventory
          </button>
          <button className="bar-button secondary" type="button" onClick={onRefresh} disabled={loading || busy}>
            <RefreshCw size={15} className={loading ? "spin" : ""} /> Refresh
          </button>
          <button
            className="bar-button secondary"
            type="button"
            title="Purge any leftover mock packaging items (Takeaway Handis, Foil Trays)"
            onClick={purgeMockPackagingData}
            disabled={loading || busy}
            style={{ fontSize: "0.7rem" }}
          >
            <Trash2 size={13} /> Clean Mock Items
          </button>
        </div>
      </div>

      {/* 2. Top Operational KPI Summary Cards */}
      <div className="bar-inv-kpis">
        <div className="bar-inv-kpi">
          <span>Total Bar Items</span>
          <strong>{totalItems}</strong>
          <small>Active beverage lines</small>
        </div>
        <div className="bar-inv-kpi">
          <span>In-Stock Bottles / Units</span>
          <strong>{totalUnits.toLocaleString("en-IN")}</strong>
          <small>Total physical inventory</small>
        </div>
        <div className="bar-inv-kpi alert">
          <span>Low Stock Alerts</span>
          <strong style={{ color: lowStockCount > 0 ? "#f59e0b" : "inherit" }}>{lowStockCount}</strong>
          <small>At or below threshold</small>
        </div>
        <div className="bar-inv-kpi danger">
          <span>Out of Stock</span>
          <strong style={{ color: outOfStockCount > 0 ? "#ef4444" : "inherit" }}>{outOfStockCount}</strong>
          <small>Urgent re-order needed</small>
        </div>
        <div className="bar-inv-kpi highlight">
          <span>Bar Stock Valuation</span>
          <strong style={{ color: "var(--accent-amber, #f59e0b)" }}>{formatCurrency(totalValuation)}</strong>
          <small>Total purchase value</small>
        </div>
      </div>

      {/* 3. Search & Filter Bar */}
      <div className="bar-list-tools">
        <label className="bar-search">
          <Search size={16} />
          <input
            placeholder="Search drink name, brand, category, rack location…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && (
            <button className="bar-icon-button small" type="button" onClick={() => setQuery("")}>
              <X size={14} />
            </button>
          )}
        </label>
        <label className="bar-select-label">
          <span>Category Filter</span>
          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
            <option value="all">All Categories ({validBeverages.length})</option>
            {availableCategories.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </label>
        <label className="bar-select-label">
          <span>Stock Status</span>
          <select value={stockFilter} onChange={(e) => setStockFilter(e.target.value)}>
            <option value="all">All Statuses ({validBeverages.length})</option>
            <option value="in_stock">In Stock ({inStockCount})</option>
            <option value="low_stock">Low Stock ({lowStockCount})</option>
            <option value="out_of_stock">Out of Stock ({outOfStockCount})</option>
          </select>
        </label>
      </div>

      {error && <div className="bar-error" role="alert" style={{ margin: "14px 18px" }}>{error}</div>}

      {/* 4. Inventory Records Table */}
      {loading ? (
        <SkeletonTable rows={6} columns={7} className="bar-table-wrap" />
      ) : (
        <div className="bar-table-wrap">
          <table className="bar-table bar-inventory-table">
            <thead>
              <tr>
                <th style={{ minWidth: "180px", textAlign: "left" }}>Item / Drink Name</th>
                <th style={{ minWidth: "130px", textAlign: "left" }}>Category</th>
                <th style={{ minWidth: "120px", textAlign: "left" }}>Unit & Size</th>
                <th style={{ minWidth: "85px", textAlign: "center" }}>ABV %</th>
                <th style={{ minWidth: "100px", textAlign: "center" }}>Current Stock</th>
                <th style={{ minWidth: "80px", textAlign: "center" }}>Threshold</th>
                <th style={{ minWidth: "105px", textAlign: "right" }}>Unit Cost</th>
                <th style={{ minWidth: "105px", textAlign: "right" }}>Selling / MRP</th>
                <th style={{ minWidth: "140px", textAlign: "left" }}>Storage Location</th>
                <th style={{ minWidth: "95px", textAlign: "center" }}>Status</th>
                <th style={{ minWidth: "240px", textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((item) => {
                const stock = Number(item.stock ?? item.currentStock ?? 0);
                const threshold = Number(item.minThreshold ?? item.minimumThreshold ?? 0);
                const abvVal = item.abv != null && item.abv !== "" ? Number(item.abv) : null;
                const cost = Number(item.unitCost ?? item.cost ?? 0);
                const selling = Number(item.sellingPrice ?? item.mrp ?? 0);

                let statusLabel = "In Stock";
                if (stock <= 0) {
                  statusLabel = "Out of Stock";
                } else if (stock <= threshold) {
                  statusLabel = "Low Stock";
                }

                const brandText = String(item.brand || "").trim();
                const subcatText = String(item.subcategory || "").trim();
                const displaySubtitle =
                  brandText && subcatText && brandText.toLowerCase() !== subcatText.toLowerCase()
                    ? `${brandText} • ${subcatText}`
                    : brandText || subcatText || "";

                return (
                  <tr key={item.id ?? item.ingredientId}>
                    <td style={{ textAlign: "left" }}>
                      <strong>{item.name}</strong>
                      {displaySubtitle && (
                        <small style={{ color: "var(--text-dim)", display: "block" }}>
                          {displaySubtitle}
                        </small>
                      )}
                    </td>
                    <td style={{ textAlign: "left" }}>
                      <span className="bar-category-chip">{item.category || "Beverage"}</span>
                    </td>
                    <td style={{ textAlign: "left" }}>
                      <span>{item.unit || "Bottle"}</span>
                      {item.volumeMl && <small style={{ display: "block", color: "var(--text-dim)" }}>{item.volumeMl} ml</small>}
                    </td>
                    <td style={{ textAlign: "center" }}>
                      {abvVal != null && abvVal > 0 ? (
                        <span style={{ fontWeight: 700, color: "var(--accent-amber)" }}>{abvVal}%</span>
                      ) : (
                        <span style={{ color: "var(--text-dim)", fontSize: "0.68rem" }}>0% Non-Alc</span>
                      )}
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <span className={`bar-stock-chip ${stock <= threshold ? "low" : ""}`}>
                        {stock}
                      </span>
                    </td>
                    <td style={{ textAlign: "center", color: "var(--text-muted)" }}>{threshold}</td>
                    <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{formatCurrency(cost)}</td>
                    <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{selling > 0 ? formatCurrency(selling) : <span style={{ color: "var(--text-dim)" }}>—</span>}</td>
                    <td style={{ textAlign: "left" }}>
                      <small style={{ display: "block", color: "var(--text-muted)", fontSize: "0.72rem" }}>
                        {item.storageLocation || "Front Bar Display Shelf"}
                      </small>
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <Status>{statusLabel}</Status>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <div className="bar-inv-actions">
                        <div className="bar-stock-btn-group">
                          <button
                            className="bar-stock-btn deduct"
                            type="button"
                            title={`Deduct / Adjust stock for ${item.name}`}
                            disabled={busy}
                            onClick={() => adjustStock(item, -1)}
                          >
                            <span className="bar-stock-icon">−</span> Adjust
                          </button>
                          <button
                            className="bar-stock-btn receive"
                            type="button"
                            title={`Receive stock shipment for ${item.name}`}
                            disabled={busy}
                            onClick={() => adjustStock(item, 1)}
                          >
                            <span className="bar-stock-icon">+</span> Receive
                          </button>
                        </div>
                        <button
                          className="bar-icon-button small"
                          type="button"
                          title="Edit bar inventory item"
                          disabled={busy}
                          onClick={() => openEditModal(item)}
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          className="bar-icon-button small danger"
                          type="button"
                          title="Delete from bar inventory"
                          disabled={busy}
                          onClick={() => deleteItem(item)}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {filteredRows.length === 0 && !error && (
            <div className="bar-empty">
              {validBeverages.length === 0 ? (
                <div>
                  <p style={{ margin: "0 0 10px", fontSize: "0.9rem", fontWeight: 700 }}>
                    No bar inventory items found.
                  </p>
                  <p style={{ margin: "0 0 16px", color: "var(--text-dim)" }}>
                    All kitchen packaging mock data has been cleared. Add your first liquor or beverage item to get started.
                  </p>
                  <button className="bar-button primary" type="button" onClick={openAddModal}>
                    <Plus size={15} /> Add First Bar Inventory Item
                  </button>
                </div>
              ) : (
                <p>No beverage items match your current search or filters. Try adjusting your search query.</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* 5. Add / Edit Bar Inventory Modal */}
      {modalOpen && (
        <div
          className="bar-overlay"
          role="presentation"
          onMouseDown={(event) => event.target === event.currentTarget && !modalBusy && setModalOpen(false)}
        >
          <section className="bar-modal" role="dialog" aria-modal="true" style={{ width: "min(840px, 100%)" }}>
            <header className="bar-modal-head">
              <div>
                <span className="bar-kicker">BAR & LIQUOR LEDGER</span>
                <h2>{editingItem ? `Edit "${editingItem.name}"` : "Add Bar Inventory"}</h2>
              </div>
              <button
                className="bar-icon-button"
                type="button"
                aria-label="Close"
                disabled={modalBusy}
                onClick={() => setModalOpen(false)}
              >
                <X size={18} />
              </button>
            </header>

            <form className="bar-form" onSubmit={saveInventoryItem} style={{ padding: "18px 20px" }}>
              <div className="bar-form-grid">
                {/* Item Name */}
                <label className="bar-field wide">
                  <span>Beverage / Item Name *</span>
                  <input
                    required
                    placeholder="e.g. Johnnie Walker Black Label 12Y, Corona Extra Beer, Monin Blue Curacao"
                    value={formData.name}
                    onChange={(e) => setField("name", e.target.value)}
                  />
                </label>

                {/* Category */}
                <label className="bar-field">
                  <span>Bar Category *</span>
                  {!customCategory ? (
                    <select
                      value={formData.category}
                      onChange={(e) => handleCategorySelect(e.target.value)}
                    >
                      {BAR_INVENTORY_CATEGORIES.map((c) => (
                        <option key={c.category} value={c.category}>{c.category}</option>
                      ))}
                      <option value="__custom__">+ Custom Category…</option>
                    </select>
                  ) : (
                    <div style={{ display: "flex", gap: "6px" }}>
                      <input
                        required
                        placeholder="Type custom category name…"
                        value={formData.category}
                        onChange={(e) => setField("category", e.target.value)}
                      />
                      <button
                        className="bar-button secondary small"
                        type="button"
                        onClick={() => {
                          setCustomCategory(false);
                          setField("category", BAR_INVENTORY_CATEGORIES[0].category);
                        }}
                      >
                        Select
                      </button>
                    </div>
                  )}
                </label>

                {/* Subcategory / Variety */}
                <label className="bar-field">
                  <span>Subcategory / Variety</span>
                  {currentSubcategories.length > 0 && !customCategory ? (
                    <select
                      value={formData.subcategory}
                      onChange={(e) => setField("subcategory", e.target.value)}
                    >
                      {currentSubcategories.map((sub) => (
                        <option key={sub} value={sub}>{sub}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      placeholder="e.g. Single Malt, Craft IPA, Blanco, Puree"
                      value={formData.subcategory}
                      onChange={(e) => setField("subcategory", e.target.value)}
                    />
                  )}
                </label>

                {/* Brand */}
                <label className="bar-field">
                  <span>Brand / Label</span>
                  <input
                    placeholder="e.g. Diageo, Bacardi, Sula, Monin, Schweppes"
                    value={formData.brand}
                    onChange={(e) => setField("brand", e.target.value)}
                  />
                </label>

                {/* Unit / Packaging */}
                <label className="bar-field">
                  <span>Packaging Unit *</span>
                  {!customUnit ? (
                    <select
                      value={formData.unit}
                      onChange={(e) => {
                        if (e.target.value === "__custom__") {
                          setCustomUnit(true);
                          setField("unit", "");
                        } else {
                          setField("unit", e.target.value);
                          if (e.target.value.includes("750")) setField("volumeMl", 750);
                          else if (e.target.value.includes("1 L") || e.target.value.includes("1000")) setField("volumeMl", 1000);
                          else if (e.target.value.includes("330")) setField("volumeMl", 330);
                          else if (e.target.value.includes("650")) setField("volumeMl", 650);
                        }
                      }}
                    >
                      {BAR_INVENTORY_UNITS.map((u) => (
                        <option key={u} value={u}>{u}</option>
                      ))}
                      <option value="__custom__">+ Custom Unit…</option>
                    </select>
                  ) : (
                    <div style={{ display: "flex", gap: "6px" }}>
                      <input
                        required
                        placeholder="e.g. Case of 12, Barrel 20L"
                        value={formData.unit}
                        onChange={(e) => setField("unit", e.target.value)}
                      />
                      <button
                        className="bar-button secondary small"
                        type="button"
                        onClick={() => {
                          setCustomUnit(false);
                          setField("unit", BAR_INVENTORY_UNITS[0]);
                        }}
                      >
                        Select
                      </button>
                    </div>
                  )}
                </label>

                {/* Bottle Volume (ml) */}
                <label className="bar-field">
                  <span>Volume / Bottle Size (ml)</span>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    placeholder="750"
                    value={formData.volumeMl}
                    onChange={(e) => setField("volumeMl", e.target.value)}
                  />
                </label>

                {/* ABV % */}
                <label className="bar-field">
                  <span>Alcohol Content (ABV %)</span>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    placeholder="e.g. 42.8 or 0 for non-alcoholic"
                    value={formData.abv}
                    onChange={(e) => setField("abv", e.target.value)}
                  />
                </label>

                {/* Current Stock */}
                <label className="bar-field">
                  <span>Current In-Stock Quantity *</span>
                  <input
                    required
                    type="number"
                    min="0"
                    step="any"
                    value={formData.stock}
                    onChange={(e) => setField("stock", e.target.value)}
                  />
                </label>

                {/* Reorder Threshold */}
                <label className="bar-field">
                  <span>Re-order Alert Threshold *</span>
                  <input
                    required
                    type="number"
                    min="0"
                    step="any"
                    value={formData.minThreshold}
                    onChange={(e) => setField("minThreshold", e.target.value)}
                  />
                </label>

                {/* Unit Purchase Cost */}
                <label className="bar-field">
                  <span>Unit Purchase Cost (₹) *</span>
                  <input
                    required
                    type="number"
                    min="0"
                    step="any"
                    value={formData.unitCost}
                    onChange={(e) => setField("unitCost", e.target.value)}
                  />
                </label>

                {/* Selling Price / MRP */}
                <label className="bar-field">
                  <span>Selling Price / MRP (₹)</span>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    placeholder="Optional selling price / peg rate"
                    value={formData.sellingPrice}
                    onChange={(e) => setField("sellingPrice", e.target.value)}
                  />
                </label>

                {/* Storage Location */}
                <label className="bar-field">
                  <span>Storage / Rack Location</span>
                  {!customLocation ? (
                    <select
                      value={formData.storageLocation}
                      onChange={(e) => {
                        if (e.target.value === "__custom__") {
                          setCustomLocation(true);
                          setField("storageLocation", "");
                        } else {
                          setField("storageLocation", e.target.value);
                        }
                      }}
                    >
                      {BAR_STORAGE_LOCATIONS.map((loc) => (
                        <option key={loc} value={loc}>{loc}</option>
                      ))}
                      <option value="__custom__">+ Custom Location…</option>
                    </select>
                  ) : (
                    <div style={{ display: "flex", gap: "6px" }}>
                      <input
                        placeholder="e.g. Cellar Rack B3"
                        value={formData.storageLocation}
                        onChange={(e) => setField("storageLocation", e.target.value)}
                      />
                      <button
                        className="bar-button secondary small"
                        type="button"
                        onClick={() => {
                          setCustomLocation(false);
                          setField("storageLocation", BAR_STORAGE_LOCATIONS[0]);
                        }}
                      >
                        Select
                      </button>
                    </div>
                  )}
                </label>

                {/* Supplier / Distributor */}
                <label className="bar-field">
                  <span>Supplier / Distributor</span>
                  {!customSupplier ? (
                    <select
                      value={formData.supplier}
                      onChange={(e) => {
                        if (e.target.value === "__custom__") {
                          setCustomSupplier(true);
                          setField("supplier", "");
                        } else {
                          setField("supplier", e.target.value);
                        }
                      }}
                    >
                      {BAR_SUPPLIERS.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                      <option value="__custom__">+ Custom Supplier…</option>
                    </select>
                  ) : (
                    <div style={{ display: "flex", gap: "6px" }}>
                      <input
                        placeholder="e.g. Local Wine Wholesaler"
                        value={formData.supplier}
                        onChange={(e) => setField("supplier", e.target.value)}
                      />
                      <button
                        className="bar-button secondary small"
                        type="button"
                        onClick={() => {
                          setCustomSupplier(false);
                          setField("supplier", BAR_SUPPLIERS[0]);
                        }}
                      >
                        Select
                      </button>
                    </div>
                  )}
                </label>
              </div>

              {modalError && (
                <p className="bar-error" role="alert" style={{ marginTop: "12px" }}>
                  {modalError}
                </p>
              )}

              <footer className="bar-modal-footer" style={{ marginTop: "18px", padding: "14px 0 0" }}>
                <button
                  className="bar-button secondary"
                  type="button"
                  disabled={modalBusy}
                  onClick={() => setModalOpen(false)}
                >
                  Cancel
                </button>
                <button className="bar-button primary" type="submit" disabled={modalBusy}>
                  {modalBusy ? "Saving…" : editingItem ? "Update Inventory Item" : "Add Inventory Item"}
                </button>
              </footer>
            </form>
          </section>
        </div>
      )}
    </section>
  );
}
function Status({ children }) {
  const cls = String(children || "").toLowerCase().replace(/\s+/g, "-");
  return <span className={`bar-status bar-status-${cls}`}>{children}</span>;
}

function makeId(prefix, rows) {
  const next = rows.reduce((max, row) => Math.max(max, Number(String(row.id).match(/\d+$/)?.[0]) || 0), 0) + 1;
  return `${prefix}-${String(next).padStart(3, "0")}`;
}

function csvDownload(filename, rows) {
  const quote = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;
  const csv = rows.map((row) => row.map(quote).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function printBill(order) {
  const popup = window.open("", "_blank", "width=480,height=760");
  if (!popup) return false;
  const safe = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" })[char]);
  popup.document.write(`<html><head><title>${safe(order.id)} demo bill</title><style>body{font:14px Arial,sans-serif;padding:24px;color:#172033}h1{font-size:20px;margin:0 0 5px}p{color:#475569}.line{display:flex;justify-content:space-between;gap:16px;padding:8px 0;border-bottom:1px solid #e2e8f0}.total{font-weight:700;font-size:17px}</style></head><body><h1>Telugu Taste • Bar</h1><p>DEMO BILL • Not saved to server</p><p><b>${safe(order.id)}</b> • ${safe(order.table)}<br/>${safe(order.customer)} • ${safe(order.time)}</p><div class="line"><span>Items</span><span>${safe(order.items)}</span></div><div class="line"><span>Subtotal</span><span>${formatCurrency(order.subtotal)}</span></div><div class="line"><span>Discount</span><span>${formatCurrency(order.discount)}</span></div><div class="line"><span>GST</span><span>${formatCurrency(order.gst)}</span></div><div class="line"><span>Service charge</span><span>${formatCurrency(order.service)}</span></div><div class="line total"><span>Total</span><span>${formatCurrency(order.total)}</span></div><script>window.onload=()=>window.print()</script></body></html>`);
  popup.document.close();
  return true;
}

function EntityModal({ kind, initial, tables = [], staff = [], drinks = [], onClose, onSave }) {
  const fields = FIELD_SETS[kind] || [];
  const [values, setValues] = useState(() => ({
    ...(initial || {}),
    ...(kind === "staff" ? { tables: Array.isArray(initial?.tables) ? initial.tables : [] } : {}),
    ...(kind === "table" ? { staffId: initial?.staffId || "" } : {}),
    ...(kind === "drink" && initial ? {
      isAvailable: initial.isAvailable === false || initial.isAvailable === "Unavailable" ? "Unavailable" : "Available",
      active: initial.active === false || initial.active === "Inactive" ? "Inactive" : "Active",
      category: initial.category || "Cocktails",
      drinkType: initial.drinkType || (initial.abv ? "Alcoholic" : "Non-Alcoholic"),
      measure: initial.measure || "",
      abv: initial.abv ?? "",
    } : kind === "drink" ? {
      category: "Cocktails",
      drinkType: "Alcoholic",
      measure: "60 ml (Double Peg)",
      isAvailable: "Available",
      abv: "",
    } : {}),
  }));

  const allKnownCategories = useMemo(() => {
    const list = [...BAR_CATEGORIES];
    if (Array.isArray(drinks)) {
      drinks.forEach((d) => {
        if (d.category && !list.some((c) => c.toLowerCase() === d.category.toLowerCase())) {
          list.push(d.category);
        }
      });
    }
    return list;
  }, [drinks]);

  const [isCustomCategory, setIsCustomCategory] = useState(() => {
    if (kind !== "drink" || !initial?.category) return false;
    return !BAR_CATEGORIES.some((c) => c.toLowerCase() === String(initial.category).toLowerCase());
  });

  const [isCustomMeasure, setIsCustomMeasure] = useState(() => {
    if (kind !== "drink" || !initial?.measure) return false;
    return !BAR_SERVING_MEASURES.some((m) => m.toLowerCase() === String(initial.measure).toLowerCase());
  });

  const [error, setError] = useState("");
  const set = (key, value) => setValues((previous) => ({ ...previous, [key]: value }));

  const chooseImage = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Choose a valid image file.");
      event.target.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      set("image", String(reader.result || ""));
      setError("");
    };
    reader.onerror = () => setError("Could not read this image. Please try another file.");
    reader.readAsDataURL(file);
  };

  const submit = async (event) => {
    event.preventDefault();
    for (const [key, label, type, required] of fields) {
      const value = values[key];
      if (required && (value === undefined || value === null || String(value).trim() === "")) {
        setError(`${label} is required.`);
        return;
      }
      if (type === "number" && value !== undefined && value !== "" && (!Number.isFinite(Number(value)) || Number(value) < 0)) {
        setError(`${label} must be a non-negative number.`);
        return;
      }
    }
    if (kind === "drink" && values.abv !== "" && values.abv !== undefined && (Number(values.abv) < 0 || Number(values.abv) > 100)) {
      setError("Alcohol Percentage (ABV) must be between 0 and 100.");
      return;
    }
    const result = await onSave(values);
    if (result === false) setError("The requested changes were not fully applied. Check the message and try again.");
  };

  return (
    <div className="bar-overlay" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="bar-modal" role="dialog" aria-modal="true" aria-labelledby="bar-form-title">
        <header className="bar-modal-head">
          <div>
            <h2 id="bar-form-title">{initial ? "Edit" : "Add"} {kind === "drink" ? "Drink" : kind === "table" ? "Bar Table" : kind === "staff" ? "Bar Staff Member" : "Bar Order"}</h2>
          </div>
          <button className="bar-icon-button" aria-label="Close" onClick={onClose} type="button"><X size={18} /></button>
        </header>
        <form onSubmit={submit} className="bar-form">
          <div className="bar-form-grid">
            {fields.map(([key, label, type = "text", required, options]) => {
              if (kind === "drink" && key === "abv") {
                const isAlcoholic = values.drinkType === "Alcoholic" || ["Cocktails", "Beers", "Whiskey", "Vodka & Gin", "Rum & Brandy", "Wine & Champagne", "Shots & Shooters"].some((c) => c.toLowerCase() === String(values.category || "").toLowerCase());
                if (!isAlcoholic) return null;
              }

              return (
                <label className={`bar-field ${type === "textarea" || type === "multiselect" ? "wide" : ""}`} key={key}>
                  <span>{label}{required && " *"}</span>
                  {type === "category_selector" ? (
                    isCustomCategory ? (
                      <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                        <input
                          required={required}
                          type="text"
                          placeholder="Type custom category name..."
                          value={values.category ?? ""}
                          onChange={(e) => set("category", e.target.value)}
                          autoFocus
                        />
                        <button
                          type="button"
                          className="bar-button secondary small"
                          style={{ whiteSpace: "nowrap" }}
                          onClick={() => {
                            setIsCustomCategory(false);
                            set("category", allKnownCategories[0] || "Cocktails");
                          }}
                        >
                          Choose from list
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                        <select
                          required={required}
                          value={values.category ?? ""}
                          onChange={(e) => {
                            if (e.target.value === "__custom__") {
                              setIsCustomCategory(true);
                              set("category", "");
                            } else {
                              set("category", e.target.value);
                            }
                          }}
                        >
                          <option value="">Select category</option>
                          {allKnownCategories.map((c) => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                          <option value="__custom__">+ Type custom category...</option>
                        </select>
                        <button
                          type="button"
                          className="bar-button secondary small"
                          style={{ whiteSpace: "nowrap" }}
                          onClick={() => {
                            setIsCustomCategory(true);
                            set("category", "");
                          }}
                        >
                          + Custom
                        </button>
                      </div>
                    )
                  ) : type === "measure_selector" ? (
                    isCustomMeasure ? (
                      <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                        <input
                          type="text"
                          placeholder="e.g. 45 ml, 500 ml Pitcher..."
                          value={values.measure ?? ""}
                          onChange={(e) => set("measure", e.target.value)}
                          autoFocus
                        />
                        <button
                          type="button"
                          className="bar-button secondary small"
                          style={{ whiteSpace: "nowrap" }}
                          onClick={() => {
                            setIsCustomMeasure(false);
                            set("measure", BAR_SERVING_MEASURES[0]);
                          }}
                        >
                          Choose from list
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                        <select
                          value={values.measure ?? ""}
                          onChange={(e) => {
                            if (e.target.value === "__custom__") {
                              setIsCustomMeasure(true);
                              set("measure", "");
                            } else {
                              set("measure", e.target.value);
                            }
                          }}
                        >
                          <option value="">Select serving measure</option>
                          {BAR_SERVING_MEASURES.map((m) => (
                            <option key={m} value={m}>{m}</option>
                          ))}
                          <option value="__custom__">+ Custom Measure...</option>
                        </select>
                        <button
                          type="button"
                          className="bar-button secondary small"
                          style={{ whiteSpace: "nowrap" }}
                          onClick={() => {
                            setIsCustomMeasure(true);
                            set("measure", "");
                          }}
                        >
                          + Custom
                        </button>
                      </div>
                    )
                  ) : type === "image" ? (
                    <div className="bar-image-picker">
                      {values[key] && <img className="bar-image-preview" src={values[key]} alt="Selected drink preview" />}
                      <label className="bar-button secondary bar-image-choose">
                        <Plus size={15} />
                        {values[key] ? "Change Image" : "Choose Image"}
                        <input type="file" accept="image/*" onChange={chooseImage} />
                      </label>
                    </div>
                  ) : type === "select" ? (
                    <select
                      required={required}
                      value={values[key] ?? (key === "isAvailable" ? "Available" : key === "active" ? "Active" : "")}
                      onChange={(event) => set(key, event.target.value)}
                    >
                      <option value="">{key === "staffId" ? "Unassigned" : `Select ${label.toLowerCase()}`}</option>
                      {(key === "staffId"
                        ? staff.map((member) => ({ value: member.id, label: `${member.name} (${member.id})` }))
                        : kind === "table" && key === "area"
                        ? [...new Set([...BAR_AREAS, ...tables.map((table) => table.area)])]
                        : kind === "staff" && key === "role"
                        ? [...new Set([...options, ...staff.map((person) => person.role)])]
                        : kind === "staff" && key === "shift"
                        ? [...new Set([...options, ...staff.map((person) => person.shift).filter(Boolean)])]
                        : options
                      ).map((option) => {
                        const val = typeof option === "string" ? option : option.value;
                        const text = typeof option === "string" ? option : option.label;
                        return <option key={val} value={val}>{text}</option>;
                      })}
                    </select>
                  ) : type === "multiselect" ? (
                    <select
                      multiple
                      aria-label={label}
                      value={(Array.isArray(values[key]) ? values[key] : []).map(String).filter((tableId) => tables.some((table) => String(table.id) === tableId))}
                      onChange={(event) => set(key, [...new Set(Array.from(event.target.selectedOptions, (option) => option.value))])}
                    >
                      {tables.map((table) => (
                        <option key={table.id} value={String(table.id)}>
                          {table.number} • {table.area}
                        </option>
                      ))}
                    </select>
                  ) : type === "textarea" ? (
                    <textarea rows="3" required={required} value={values[key] ?? ""} onChange={(event) => set(key, event.target.value)} />
                  ) : (
                    <input
                      type={type}
                      min={type === "number" ? "0" : undefined}
                      max={type === "number" && key === "abv" ? "100" : undefined}
                      step={type === "number" ? (key === "abv" ? "0.1" : "any") : undefined}
                      required={required}
                      value={values[key] ?? ""}
                      onChange={(event) => set(key, event.target.value)}
                    />
                  )}
                </label>
              );
            })}
          </div>
          {error && <p className="bar-error" role="alert">{error}</p>}
          <footer className="bar-modal-footer">
            <button className="bar-button secondary" type="button" onClick={onClose}>Cancel</button>
            <button className="bar-button primary" type="submit">Save Demo Changes</button>
          </footer>
        </form>
      </section>
    </div>
  );
}

function DetailsModal({ item, onClose }) {
  if (!item) return null;
  return <div className="bar-overlay" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><section className="bar-modal" role="dialog" aria-modal="true" aria-labelledby="bar-details-title"><header className="bar-modal-head"><div><span className="bar-kicker">DEMO DETAILS</span><h2 id="bar-details-title">{item.name || item.id || "Details"}</h2></div><button className="bar-icon-button" aria-label="Close details" onClick={onClose} type="button"><X size={18} /></button></header><dl className="bar-details-grid">{Object.entries(item).filter(([key, value]) => !["image"].includes(key) && value !== "" && value !== undefined && value !== null).map(([key, value]) => <div key={key}><dt>{key.replace(/([A-Z])/g, " $1")}</dt><dd>{typeof value === "boolean" ? (value ? "Yes" : "No") : String(value)}</dd></div>)}</dl><footer className="bar-modal-footer"><button type="button" className="bar-button secondary" onClick={onClose}>Close</button></footer></section></div>;
}

function OrderItemsModal({ order, onClose }) {
  if (!order) return null;
  const items = Array.isArray(order.items) ? order.items : [];
  const amountOf = (item) => Number(item.unitPrice ?? item.price ?? 0) * Number(item.quantity ?? item.qty ?? 1);
  const orderDate = order.time || order.createdAt || order.orderTime || "—";
  return <div className="bar-overlay" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <section className="bar-modal bar-order-items-modal" role="dialog" aria-modal="true" aria-labelledby="bar-order-items-title">
      <header className="bar-modal-head"><div><span className="bar-kicker">ORDER ITEMS</span><h2 id="bar-order-items-title">Order {order.id}</h2></div><button className="bar-icon-button" aria-label="Close order items" onClick={onClose} type="button"><X size={18} /></button></header>
      <div className="bar-order-meta"><div><span>Table</span><strong>{order.table || "Takeaway"}</strong></div><div><span>Order date</span><strong>{String(orderDate)}</strong></div><div><span>Order status</span><Status>{order.status || "Pending"}</Status></div></div>
      <div className="bar-table-wrap bar-order-items-wrap"><table className="bar-table bar-order-items-table"><thead><tr><th>Item Name</th><th>Category</th><th>Qty</th><th>Unit Price</th><th>Total</th></tr></thead><tbody>{items.map((item, index) => <tr key={item.id ?? `${order.id}-${item.name ?? item.dishName}-${index}`}><td><strong>{item.name || item.dishName || item.menuItemName || "Item"}</strong></td><td>{item.categoryLabel || item.category || item.categoryName || "Beverage"}</td><td>{Number(item.quantity ?? item.qty ?? 1)}</td><td>{formatCurrency(item.unitPrice ?? item.price ?? 0)}</td><td><strong>{formatCurrency(amountOf(item))}</strong></td></tr>)}</tbody></table>{!items.length && <div className="bar-empty">No items are available for this order.</div>}</div>
      <footer className="bar-order-total"><span>Total order amount</span><strong>{formatCurrency(items.reduce((sum, item) => sum + amountOf(item), 0))}</strong></footer>
      <footer className="bar-modal-footer"><button type="button" className="bar-button secondary" onClick={onClose}>Close</button></footer>
    </section>
  </div>;
}


function getDrinkIcon(name = "", category = "") {
  const text = (name + " " + category).toLowerCase();
  if (text.includes("beer") || text.includes("ale") || text.includes("cider") || text.includes("lager") || text.includes("pint")) {
    return { Icon: Beer, tone: "tone-blue" };
  }
  if (text.includes("wine") || text.includes("champagne") || text.includes("sangria")) {
    return { Icon: Wine, tone: "tone-purple" };
  }
  if (text.includes("coffee") || text.includes("tea") || text.includes("latte") || text.includes("espresso")) {
    return { Icon: Coffee, tone: "tone-green" };
  }
  if (text.includes("cocktail") || text.includes("martini") || text.includes("whiskey") || text.includes("vodka") || text.includes("gin") || text.includes("rum") || text.includes("shot")) {
    return { Icon: Martini, tone: "tone-orange" };
  }
  return { Icon: GlassWater, tone: "tone-blue" };
}


function BarDrinksMenu({
  drinks = [],
  onAddDrink,
  onUpdateDrink,
  onDeleteDrink,
  onToggleDrinkAvailability,
  onToggleDrinkSpecial,
  onAddMenuItem,
  onUpdateMenuItem,
  onDeleteMenuItem,
  onSetMenuAvailability,
  setToast,
}) {
  const [extraCategories, setExtraCategories] = useState([]);
  const [extraMeasures, setExtraMeasures] = useState([]);

  useEffect(() => {
    let isMounted = true;
    apiGetBarDrinkCategories()
      .then((res) => {
        if (!isMounted) return;
        const cats = res?.data?.data || res?.data;
        if (Array.isArray(cats) && cats.length > 0) {
          setExtraCategories(cats);
        }
      })
      .catch(() => {});

    apiGetBarServingMeasures()
      .then((res) => {
        if (!isMounted) return;
        const measures = res?.data?.data || res?.data;
        if (Array.isArray(measures) && measures.length > 0) {
          setExtraMeasures(measures);
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, []);
  const [searchFilter, setSearchFilter] = useState("");
  const [menuFilters, setMenuFilters] = useState({
    category: "",
    drinkType: "",
    availability: "",
  });
  const [menuPage, setMenuPage] = useState(1);
  const [menuPageSize, setMenuPageSize] = useState(6);

  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [isCustomMeasure, setIsCustomMeasure] = useState(false);
  const [itemForm, setItemForm] = useState({
    name: "",
    category: "Cocktails",
    customCategory: "",
    price: "",
    drinkType: "Alcoholic",    measure: "Glass (250 ml)",
    customMeasure: "",
    abv: "",
    isVeg: false,
    isChefSpecial: false,
    prepTime: "15 min",
    measure: "30 ml (Single Peg)",
    customMeasure: "",
    drinkType: "Alcoholic",
    abv: "40",
    description: "",
    image: "",
    isAvailable: "Available",
  });

  const categoryOptions = useMemo(() => {
    const map = new Map();
    [...BAR_CATEGORIES, ...extraCategories].forEach((cat) => {
      if (cat) map.set(cat.toLowerCase(), { value: cat, label: cat });
    });
    drinks.forEach((d) => {
      if (d.category && !map.has(d.category.toLowerCase())) {
        map.set(d.category.toLowerCase(), { value: d.category, label: d.category });
      }
    });
    return Array.from(map.values());
  }, [drinks, extraCategories]);

  const measureOptions = useMemo(() => {
    const list = [...BAR_SERVING_MEASURES];
    extraMeasures.forEach((m) => {
      if (m && !list.some((existing) => existing.toLowerCase() === m.toLowerCase())) {
        list.push(m);
      }
    });
    drinks.forEach((d) => {
      const msr = String(d.measure || d.servingMeasure || "").trim();
      if (msr && !list.some((m) => m.toLowerCase() === msr.toLowerCase())) {
        list.push(msr);
      }
    });
    return list;
  }, [drinks, extraMeasures]);

  const filteredDrinks = useMemo(() => {
    return drinks.filter((item) => {
      const query = searchFilter.trim().toLowerCase();
      const matchesSearch =
        !query ||
        [item.name, item.dishName, item.drinkName, item.description, item.category].some((val) =>
          String(val ?? "").toLowerCase().includes(query)
        );
      const matchesCategory =
        !menuFilters.category ||
        String(item.category ?? "").toLowerCase() === menuFilters.category.toLowerCase();
      
      const isItemAlcoholic = item.drinkType
        ? item.drinkType.toLowerCase().includes("alc") && !item.drinkType.toLowerCase().includes("non")
        : (!item.isVeg || Boolean(item.abv) || Boolean(item.alcoholPct));

      const matchesDrinkType =
        !menuFilters.drinkType ||
        (menuFilters.drinkType === "alcoholic" ? isItemAlcoholic : !isItemAlcoholic);
      const matchesAvailability =
        !menuFilters.availability ||
        (item.isAvailable !== false && item.isAvailable !== "Unavailable") ===
          (menuFilters.availability === "available");
      return (
        matchesSearch &&
        matchesCategory &&
        matchesDrinkType &&
        matchesAvailability
      );
    });
  }, [drinks, searchFilter, menuFilters]);

  const totalMenuPages = Math.ceil(filteredDrinks.length / menuPageSize) || 1;
  const safeMenuPage = Math.min(Math.max(menuPage, 1), totalMenuPages);
  const startIdx = (safeMenuPage - 1) * menuPageSize;
  const paginatedDrinks = filteredDrinks.slice(startIdx, startIdx + menuPageSize);

  const handleOpenItemModal = (item = null) => {
    if (item) {
      setEditingItem(item);
      const cat = String(item.category || "").trim();
      const isKnownCat = BAR_CATEGORIES.some(
        (c) => c.toLowerCase() === cat.toLowerCase()
      );
      const isCustomCat = !isKnownCat && Boolean(cat);
      setIsCustomCategory(isCustomCat);

      const msr = String(item.measure || item.servingMeasure || "").trim();
      const isKnownMeasure = BAR_SERVING_MEASURES.some(
        (m) => m.toLowerCase() === msr.toLowerCase()
      );
      const isCustomMsr = !isKnownMeasure && Boolean(msr);
      setIsCustomMeasure(isCustomMsr);

      const isSpecial = Boolean(
        item.isChefSpecial ||
        item.isChefsSpecial ||
        item.isSpecial ||
        item.isBartenderSpecial
      );

      setItemForm({
        name: item.name || "",
        category: isCustomCat ? "__custom__" : (cat || "Cocktails"),
        customCategory: isCustomCat ? cat : "",
        price: item.price !== undefined && item.price !== null ? String(item.price) : "",
        isVeg: Boolean(item.isVeg),
        isChefSpecial: isSpecial,
        prepTime: item.prepTime || "15 min",
        measure: isCustomMsr ? "__custom__" : (msr || "30 ml (Single Peg)"),
        customMeasure: isCustomMsr ? msr : "",
        drinkType: item.drinkType || (item.abv ? "Alcoholic" : "Non-Alcoholic"),
        abv: item.abv !== undefined && item.abv !== null ? String(item.abv) : "",
        description: item.description || "",
        image: item.image || item.imageUrl || "",
        isAvailable: item.isAvailable === false || item.isAvailable === "Unavailable" ? "Unavailable" : "Available",
      });
    } else {
      setEditingItem(null);
      setIsCustomCategory(false);
      setIsCustomMeasure(false);
      setItemForm({
        name: "",
        category: "Cocktails",
        customCategory: "",
        price: "",
        isVeg: false,
        isChefSpecial: false,
        prepTime: "15 min",
        measure: "30 ml (Single Peg)",
        customMeasure: "",
        drinkType: "Alcoholic",
        abv: "40",
        isVeg: false,
        isChefSpecial: false,
        description: "",
        image: "",
        isAvailable: "Available",
      });
    }
    setIsItemModalOpen(true);
  };

  const handleSaveItem = async (e) => {
    e.preventDefault();
    if (!itemForm.name.trim()) {
      setToast?.("Drink name is required.");
      return;
    }
    if (!itemForm.price || Number(itemForm.price) < 0) {
      setToast?.("Please enter a valid price in Rupees.");
      return;
    }

    // Resolve Category: custom input or dropdown selection
    let finalCategory = "Cocktails";
    if (isCustomCategory || itemForm.category === "__custom__") {
      finalCategory = String(itemForm.customCategory || "").trim();
      if (!finalCategory) {
        setToast?.("Please enter a custom category name.");
        return;
      }
    } else {
      finalCategory = String(itemForm.category || "").trim() || "Cocktails";
    }

    // Resolve Serving Measure: custom input or dropdown selection
    let finalMeasure = "30 ml (Single Peg)";
    if (isCustomMeasure || itemForm.measure === "__custom__") {
      finalMeasure = String(itemForm.customMeasure || "").trim();
      if (!finalMeasure) {
        setToast?.("Please enter a custom serving measure / volume.");
        return;
      }
    } else {
      finalMeasure = String(itemForm.measure || "").trim() || "30 ml (Single Peg)";
    }

    const isSpecial = Boolean(itemForm.isChefSpecial);

    const payload = {
      ...(editingItem || {}),
      id: editingItem?.id || `DR-${Date.now()}`,
      name: itemForm.name.trim(),
      dishName: itemForm.name.trim(),
      drinkName: itemForm.name.trim(),
      category: finalCategory,
      price: parseFloat(itemForm.price || 0),
      isVeg: Boolean(itemForm.isVeg),
      dietaryType: itemForm.drinkType === "Non-Alcoholic" ? "VEG" : "NON-VEG",
      isChefSpecial: isSpecial,
      isChefsSpecial: isSpecial,
      isSpecial: isSpecial,
      isBartenderSpecial: isSpecial,
      prepTime: itemForm.prepTime || "15 min",
      prepTimeMinutes: parseInt(itemForm.prepTime, 10) || 15,
      measure: finalMeasure,
      servingMeasure: finalMeasure,
      drinkType: itemForm.drinkType || (itemForm.abv ? "Alcoholic" : itemForm.isVeg ? "Non-Alcoholic" : "Alcoholic"),
      abv: itemForm.abv !== "" ? Number(itemForm.abv) : undefined,
      description: itemForm.description || "",
      shortDescription: itemForm.description || "",
      image: itemForm.image || "",
      imageUrl: itemForm.image || "",
      isAvailable: itemForm.isAvailable !== false && itemForm.isAvailable !== "Unavailable",
      isBarItem: true,
      isBarDrink: true,
      isBeverage: true,
    };

    console.info("[Bar Drinks] Saving drink item...", payload);
    try {
      if (editingItem) {
        if (onUpdateDrink) onUpdateDrink(payload);
        else if (onUpdateMenuItem) await onUpdateMenuItem(payload);
      } else {
        if (onAddDrink) onAddDrink(payload);
        else if (onAddMenuItem) await onAddMenuItem(payload);
      }
      setIsItemModalOpen(false);
    } catch (err) {
      setToast?.(err?.message || "Could not save drink item.");
    }
  };

    const handleToggleAvailability = (item) => {
    const isAvail = item.isAvailable !== false && item.isAvailable !== "Unavailable";
    console.info("[Bar Drinks] Toggling availability for:", item.name, !isAvail);
    if (onToggleDrinkAvailability) {
      onToggleDrinkAvailability(item.id, !isAvail);
    } else if (onSetMenuAvailability) {
      onSetMenuAvailability(item.id, !isAvail);
    }
  };

  const handleDeleteItem = (item) => {
    if (!window.confirm('Are you sure you want to delete "' + item.name + '" from the drinks menu?')) return;
    console.info("[Bar Drinks] Deleting drink item:", item.id);
    if (onDeleteDrink) {
      onDeleteDrink(item.id);
    } else if (onDeleteMenuItem) {
      onDeleteMenuItem(item.id);
    }
  };

  return (
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
        <div style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
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
            <Wine size={18} color="#ffffff" strokeWidth={2.3} />
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <h2
                style={{
                  fontSize: "1.2rem",
                  fontWeight: 800,
                  color: "var(--text-main)",
                  margin: 0,
                }}
              >
                Drinks Menu
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
                {filteredDrinks.length} items
              </span>
            </div>
            <p
              style={{
                fontSize: "0.78rem",
                color: "var(--text-dim)",
                margin: "2px 0 0 0",
              }}
            >
              Manage your bar drinks, categories and pricing
            </p>
          </div>
        </div>

        {/* Right: Add Drink Button */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.65rem", flexWrap: "wrap" }}>
          <button
            type="button"
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
            <span>Add New Drink</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div
        className="menu-filter-toolbar menu-items-filter-toolbar"
        role="search"
        aria-label="Drink item filters"
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
              placeholder="Search drinks to edit, delete..."
              value={searchFilter}
              onChange={(e) => {
                setSearchFilter(e.target.value);
                setMenuPage(1);
              }}
              aria-label="Search drinks"
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

        <label className="menu-filter-field">
          <span>Category</span>
          <select
            value={menuFilters.category}
            onChange={(e) => {
              setMenuFilters((prev) => ({ ...prev, category: e.target.value }));
              setMenuPage(1);
            }}
          >
            <option value="">All</option>
            {categoryOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>

        <label className="menu-filter-field">
          <span>Drink Type</span>
          <select
            value={menuFilters.drinkType}
            onChange={(e) => {
              setMenuFilters((prev) => ({ ...prev, drinkType: e.target.value }));
              setMenuPage(1);
            }}
          >
            <option value="">All</option>
            <option value="alcoholic">Alcoholic</option>
            <option value="non-alcoholic">Non-Alcoholic</option>
          </select>
        </label>

        <label className="menu-filter-field">
          <span>Availability</span>
          <select
            value={menuFilters.availability}
            onChange={(e) => {
              setMenuFilters((prev) => ({ ...prev, availability: e.target.value }));
              setMenuPage(1);
            }}
          >
            <option value="">All</option>
            <option value="available">Available</option>
            <option value="unavailable">Unavailable</option>
          </select>
        </label>

        <button
          type="button"
          className="menu-filter-clear"
          onClick={() => {
            setSearchFilter("");
            setMenuFilters({ category: "", drinkType: "", availability: "" });
            setMenuPage(1);
          }}
          style={{
            height: "36px",
            padding: "0 14px",
            background: "var(--bg-tertiary)",
            border: "1px solid var(--border-card)",
            borderRadius: "8px",
            color: "var(--text-muted)",
            fontSize: "0.82rem",
            fontWeight: 600,
            cursor: "pointer",
            whiteSpace: "nowrap",
          }}
        >
          Clear Filters
        </button>
      </div>

      {/* Table matching Dine Table Structure & Styling */}
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
          <thead>
            <tr style={{ borderBottom: "1.5px solid var(--border-subtle)" }}>
              <th style={{ padding: "0.6rem 0.85rem", color: "var(--text-dim)", fontSize: "0.78rem", fontWeight: 700, width: "40%" }}>Drink Name</th>
              <th style={{ padding: "0.6rem 0.85rem", color: "var(--text-dim)", fontSize: "0.78rem", fontWeight: 700, width: "16%" }}>Category</th>
              <th style={{ padding: "0.6rem 0.85rem", color: "var(--text-dim)", fontSize: "0.78rem", fontWeight: 700, width: "16%" }}>Drink Type</th>
              <th style={{ padding: "0.6rem 0.85rem", color: "var(--text-dim)", fontSize: "0.78rem", fontWeight: 700, width: "14%" }}>Price (₹)</th>
              <th style={{ padding: "0.6rem 0.85rem", color: "var(--text-dim)", fontSize: "0.78rem", fontWeight: 700, width: "16%", textAlign: "center" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedDrinks.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ textAlign: "center", padding: "3rem 1rem", color: "var(--text-muted)" }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.6rem" }}>
                    <Wine size={32} color="var(--text-dim)" style={{ opacity: 0.6 }} />
                    <div style={{ fontSize: "0.92rem", fontWeight: 700, color: "var(--text-main)" }}>
                      {drinks.length === 0 ? "No drinks in Bar Drinks Menu yet" : "No drinks found matching your filters"}
                    </div>
                    <div style={{ fontSize: "0.78rem", color: "var(--text-dim)", maxWidth: "340px", textAlign: "center" }}>
                      {drinks.length === 0
                        ? 'Click "+ Add New Drink" above to add your first beverage, cocktail, or liquor item.'
                        : "Try clearing your search query or changing category and availability filters."}
                    </div>
                  </div>
                </td>
              </tr>
            ) : (
              paginatedDrinks.map((item) => {
                const isAvail = item.isAvailable !== false && item.isAvailable !== "Unavailable";
                const isSpecial = Boolean(item.isChefSpecial || item.isChefsSpecial || item.isSpecial);
                const isAlcoholic = item.drinkType
                  ? item.drinkType.toLowerCase().includes("alc") && !item.drinkType.toLowerCase().includes("non")
                  : (!item.isVeg || Boolean(item.abv) || Boolean(item.alcoholPct));

                return (
                  <tr
                    key={item.id}
                    style={{
                      borderBottom: "1px solid var(--border-subtle)",
                      transition: "background 0.15s ease, opacity 0.2s ease",
                      opacity: isAvail ? 1 : 0.6,
                      background: isAvail
                        ? "transparent"
                        : "rgba(239, 68, 68, 0.03)",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = isAvail
                        ? "var(--bg-tertiary)"
                        : "rgba(239, 68, 68, 0.07)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = isAvail
                        ? "transparent"
                        : "rgba(239, 68, 68, 0.03)";
                    }}
                  >
                    {/* Drink Name + Thumbnail */}
                    <td style={{ padding: "0.6rem 0.85rem" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                        <img
                          src={getMenuItemImage(item)}
                          alt={item.name}
                          onError={(e) => handleDishImageError(e, item)}
                          style={{
                            width: "48px",
                            height: "48px",
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
                        />
                        <div>
                          <div
                            style={{
                              fontWeight: 700,
                              color: isAvail
                                ? "var(--text-main)"
                                : "var(--text-dim)",
                              fontSize: "0.88rem",
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
                              item.isSpecial ||
                              item.isBartenderSpecial
                            ) && (
                              <span
                                title="Bartender's Special"
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "3px",
                                  background: "rgba(245, 158, 11, 0.15)",
                                  border: "1px solid rgba(245, 158, 11, 0.35)",
                                  color: "#f59e0b",
                                  borderRadius: "12px",
                                  padding: "1px 7px",
                                  fontSize: "0.68rem",
                                  fontWeight: 800,
                                  flexShrink: 0,
                                }}
                              >
                                <Star
                                  size={11}
                                  fill="#f59e0b"
                                  color="#f59e0b"
                                  style={{
                                    filter: "drop-shadow(0 0 2px rgba(245, 158, 11, 0.5))",
                                  }}
                                />
                                <span>Special</span>
                              </span>
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
                            {(item.measure || item.servingMeasure) && (
                              <span style={{ color: "var(--accent-amber-light)", fontWeight: 700 }}>
                                {item.measure || item.servingMeasure} •{" "}
                              </span>
                            )}
                            {item.prepTime || "15 min"} • {item.description || item.drinkType || ""}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Category */}
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
                      {item.category?.replace("-", " ") || "Cocktails"}
                    </td>

                    {/* Drink Type */}
                    <td style={{ padding: "0.6rem 0.85rem" }}>
                      {isAlcoholic ? (
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
                          ALCOHOLIC
                        </span>
                      ) : (
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
                          NON-ALCOHOLIC
                        </span>
                      )}
                    </td>

                    {/* Price */}
                    <td
                      style={{
                        padding: "0.6rem 0.85rem",
                        fontWeight: 800,
                        color: "var(--accent-amber-light)",
                        fontSize: "0.92rem",
                        whiteSpace: "nowrap",
                      }}
                    >
                      ₹{Number(item.price || item.sellingPrice || 0).toFixed(2)}
                    </td>

                    {/* Actions */}
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
                          type="button"
                          onClick={() => handleToggleAvailability(item)}
                          title={
                            !isAvail
                              ? "Make available"
                              : "Mark unavailable"
                          }
                          style={{
                            border: isAvail
                              ? "1px solid rgba(16, 185, 129, 0.45)"
                              : "1px solid rgba(239, 68, 68, 0.45)",
                            background: isAvail
                              ? "rgba(16, 185, 129, 0.12)"
                              : "rgba(239, 68, 68, 0.12)",
                            color: isAvail ? "#10b981" : "#ef4444",
                            borderRadius: "6px",
                            padding: "4px 9px",
                            fontSize: "0.74rem",
                            fontWeight: 700,
                            cursor: "pointer",
                            transition: "all 0.15s ease",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = isAvail
                              ? "rgba(16, 185, 129, 0.22)"
                              : "rgba(239, 68, 68, 0.22)";
                            e.currentTarget.style.borderColor = isAvail
                              ? "rgba(16, 185, 129, 0.7)"
                              : "rgba(239, 68, 68, 0.7)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = isAvail
                              ? "rgba(16, 185, 129, 0.12)"
                              : "rgba(239, 68, 68, 0.12)";
                            e.currentTarget.style.borderColor = isAvail
                              ? "rgba(16, 185, 129, 0.45)"
                              : "rgba(239, 68, 68, 0.45)";
                          }}
                        >
                          {isAvail ? "Available" : "Unavailable"}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleOpenItemModal(item)}
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
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = "rgba(245, 158, 11, 0.15)";
                            e.currentTarget.style.borderColor = "var(--accent-amber)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = "rgba(245, 158, 11, 0.06)";
                            e.currentTarget.style.borderColor = "rgba(245, 158, 11, 0.45)";
                          }}
                          title="Edit drink"
                        >
                          <SquarePen size={13} />
                          <span>Edit</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteItem(item)}
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
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = "rgba(239, 68, 68, 0.15)";
                            e.currentTarget.style.borderColor = "#ef4444";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = "rgba(239, 68, 68, 0.06)";
                            e.currentTarget.style.borderColor = "rgba(239, 68, 68, 0.35)";
                          }}
                          title="Delete drink"
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
      </div>

      {/* Pagination */}
      {filteredDrinks.length > 0 && (
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
            marginTop: "0.4rem",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <span>
              {"Showing "}
              <strong style={{ color: "var(--text-main)", fontWeight: 700 }}>
                {startIdx + 1}
              </strong>
              {"–"}
              <strong style={{ color: "var(--text-main)", fontWeight: 700 }}>
                {Math.min(startIdx + menuPageSize, filteredDrinks.length)}
              </strong>
              {" of "}
              <strong style={{ color: "var(--text-main)", fontWeight: 700 }}>
                {filteredDrinks.length}
              </strong>
              {" items"}
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
            <button
              type="button"
              disabled={safeMenuPage <= 1}
              onClick={() => setMenuPage((p) => Math.max(1, p - 1))}
              style={{
                width: "26px",
                height: "26px",
                border: "1px solid var(--border-card)",
                background: "var(--bg-secondary)",
                color: "var(--text-main)",
                borderRadius: "4px",
                cursor: safeMenuPage <= 1 ? "not-allowed" : "pointer",
                opacity: safeMenuPage <= 1 ? 0.4 : 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <ChevronLeft size={14} />
            </button>
            {Array.from({ length: totalMenuPages }, (_, i) => i + 1).map((pg) => (
              <button
                key={pg}
                type="button"
                onClick={() => setMenuPage(pg)}
                style={{
                  width: "26px",
                  height: "26px",
                  border: pg === safeMenuPage ? "1px solid rgba(245, 158, 11, 0.45)" : "1px solid var(--border-card)",
                  background: pg === safeMenuPage ? "rgba(245, 158, 11, 0.15)" : "var(--bg-secondary)",
                  color: pg === safeMenuPage ? "var(--accent-amber-light)" : "var(--text-main)",
                  borderRadius: "4px",
                  fontWeight: 700,
                  fontSize: "0.75rem",
                  cursor: "pointer",
                }}
              >
                {pg}
              </button>
            ))}
            <button
              type="button"
              disabled={safeMenuPage >= totalMenuPages}
              onClick={() => setMenuPage((p) => Math.min(totalMenuPages, p + 1))}
              style={{
                width: "26px",
                height: "26px",
                border: "1px solid var(--border-card)",
                background: "var(--bg-secondary)",
                color: "var(--text-main)",
                borderRadius: "4px",
                cursor: safeMenuPage >= totalMenuPages ? "not-allowed" : "pointer",
                opacity: safeMenuPage >= totalMenuPages ? 0.4 : 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Modal: Add / Edit Drink - Exactly Matching Requested Layout */}
      {isItemModalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "var(--modal-overlay)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 960,
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
              maxWidth: "680px",
              maxHeight: "calc(100dvh - 2rem)",
              padding: "1.6rem",
              display: "flex",
              flexDirection: "column",
              gap: "1.1rem",
              overflowY: "auto",
            }}
          >
            {/* Header */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                borderBottom: "1.5px solid var(--border-subtle)",
                paddingBottom: "0.85rem",
              }}
            >
              <div>
                <h3
                  style={{
                    fontSize: "1.15rem",
                    fontWeight: 800,
                    color: "var(--text-main)",
                    margin: "2px 0 0 0",
                  }}
                >
                  {editingItem ? "Edit Drink" : "Add Drink"}
                </h3>
              </div>
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

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                gap: "0.85rem",
                alignItems: "start",
              }}
            >
              {/* Row 1, Col 1: Drink Name */}
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
                  Drink Name <span style={{ color: "#ea580c" }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Special Mojito / Blue Lagoon"
                  value={itemForm.name}
                  onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    height: "38px",
                    background: "var(--bg-tertiary)",
                    border: "1.5px solid var(--border-subtle)",
                    borderRadius: "8px",
                    padding: "0 0.85rem",
                    color: "var(--text-main)",
                    fontWeight: 600,
                    fontSize: "0.9rem",
                    outline: "none",
                  }}
                />
              </div>

              {/* Row 1, Col 2: Category * with + Custom button */}
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
                {isCustomCategory ? (
                  <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                    <input
                      type="text"
                      required
                      placeholder="Type custom category..."
                      value={itemForm.customCategory}
                      onChange={(e) => setItemForm({ ...itemForm, customCategory: e.target.value })}
                      style={{
                        flex: 1,
                        height: "38px",
                        boxSizing: "border-box",
                        background: "var(--bg-tertiary)",
                        border: "1.5px solid var(--border-subtle)",
                        borderRadius: "8px",
                        padding: "0 0.85rem",
                        color: "var(--text-main)",
                        fontSize: "0.88rem",
                        outline: "none",
                      }}
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setIsCustomCategory(false);
                        setItemForm((prev) => ({ ...prev, category: BAR_CATEGORIES[0] }));
                      }}
                      style={{
                        height: "38px",
                        padding: "0 10px",
                        borderRadius: "8px",
                        border: "1.5px solid var(--border-subtle)",
                        background: "var(--bg-tertiary)",
                        color: "var(--text-main)",
                        fontWeight: 700,
                        fontSize: "0.78rem",
                        cursor: "pointer",
                        whiteSpace: "nowrap",
                      }}
                    >
                      List
                    </button>
                  </div>
                ) : (
                  <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                    <select
                      value={itemForm.category}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === "__custom__") {
                          setIsCustomCategory(true);
                          setItemForm((prev) => ({ ...prev, customCategory: "" }));
                        } else {
                          setItemForm((prev) => ({ ...prev, category: val }));
                        }
                      }}
                      style={{
                        flex: 1,
                        height: "38px",
                        boxSizing: "border-box",
                        background: "var(--bg-tertiary)",
                        border: "1.5px solid var(--border-subtle)",
                        borderRadius: "8px",
                        padding: "0 0.85rem",
                        color: "var(--text-main)",
                        fontWeight: 600,
                        fontSize: "0.9rem",
                        outline: "none",
                        cursor: "pointer",
                      }}
                    >
                      {categoryOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                      <option value="__custom__">+ Custom Category...</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => {
                        setIsCustomCategory(true);
                        setItemForm((prev) => ({ ...prev, category: "__custom__", customCategory: "" }));
                      }}
                      style={{
                        height: "38px",
                        padding: "0 12px",
                        borderRadius: "8px",
                        border: "1.5px solid var(--border-subtle)",
                        background: "var(--bg-tertiary)",
                        color: "var(--text-main)",
                        fontWeight: 700,
                        fontSize: "0.82rem",
                        cursor: "pointer",
                        whiteSpace: "nowrap",
                      }}
                    >
                      + Custom
                    </button>
                  </div>
                )}
              </div>

              {/* Row 2, Col 1: Drink Type */}
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
                  Drink Type
                </label>
                <select
                  value={itemForm.drinkType}
                  onChange={(e) => setItemForm({ ...itemForm, drinkType: e.target.value })}
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
                    fontSize: "0.9rem",
                    outline: "none",
                    cursor: "pointer",
                  }}
                >
                  <option value="Alcoholic">Alcoholic</option>
                  <option value="Non-Alcoholic">Non-Alcoholic</option>
                </select>
              </div>

              {/* Row 2, Col 2: Alcohol Content (ABV %) */}
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
                  Alcohol Content (ABV %)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  placeholder="e.g. 40"
                  disabled={itemForm.drinkType === "Non-Alcoholic"}
                  value={itemForm.drinkType === "Non-Alcoholic" ? "" : itemForm.abv}
                  onChange={(e) => setItemForm({ ...itemForm, abv: e.target.value })}
                  style={{
                    width: "100%",
                    height: "38px",
                    boxSizing: "border-box",
                    background: "var(--bg-tertiary)",
                    border: "1.5px solid var(--border-subtle)",
                    borderRadius: "8px",
                    padding: "0 0.85rem",
                    color: "var(--text-main)",
                    fontSize: "0.9rem",
                    outline: "none",
                    opacity: itemForm.drinkType === "Non-Alcoholic" ? 0.45 : 1,
                  }}
                />
              </div>

              {/* Row 3, Col 1: Serving Measure / Volume with + Custom button */}
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
                  Serving Measure / Volume
                </label>
                {isCustomMeasure ? (
                  <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                    <input
                      type="text"
                      placeholder="e.g. 45 ml, 500 ml Pitcher..."
                      value={itemForm.customMeasure}
                      onChange={(e) => setItemForm({ ...itemForm, customMeasure: e.target.value })}
                      style={{
                        flex: 1,
                        height: "38px",
                        boxSizing: "border-box",
                        background: "var(--bg-tertiary)",
                        border: "1.5px solid var(--border-subtle)",
                        borderRadius: "8px",
                        padding: "0 0.85rem",
                        color: "var(--text-main)",
                        fontSize: "0.88rem",
                        outline: "none",
                      }}
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setIsCustomMeasure(false);
                        setItemForm((prev) => ({ ...prev, measure: BAR_SERVING_MEASURES[0] }));
                      }}
                      style={{
                        height: "38px",
                        padding: "0 10px",
                        borderRadius: "8px",
                        border: "1.5px solid var(--border-subtle)",
                        background: "var(--bg-tertiary)",
                        color: "var(--text-main)",
                        fontWeight: 700,
                        fontSize: "0.78rem",
                        cursor: "pointer",
                        whiteSpace: "nowrap",
                      }}
                    >
                      List
                    </button>
                  </div>
                ) : (
                  <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                    <select
                      value={itemForm.measure}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === "__custom__") {
                          setIsCustomMeasure(true);
                          setItemForm((prev) => ({ ...prev, customMeasure: "" }));
                        } else {
                          setItemForm((prev) => ({ ...prev, measure: val }));
                        }
                      }}
                      style={{
                        flex: 1,
                        height: "38px",
                        boxSizing: "border-box",
                        background: "var(--bg-tertiary)",
                        border: "1.5px solid var(--border-subtle)",
                        borderRadius: "8px",
                        padding: "0 0.85rem",
                        color: "var(--text-main)",
                        fontWeight: 600,
                        fontSize: "0.9rem",
                        outline: "none",
                        cursor: "pointer",
                      }}
                    >
                      <option value="">Select serving measure</option>
                      {measureOptions.map((m) => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                      <option value="__custom__">+ Custom Measure...</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => {
                        setIsCustomMeasure(true);
                        setItemForm((prev) => ({ ...prev, measure: "__custom__", customMeasure: "" }));
                      }}
                      style={{
                        height: "38px",
                        padding: "0 12px",
                        borderRadius: "8px",
                        border: "1.5px solid var(--border-subtle)",
                        background: "var(--bg-tertiary)",
                        color: "var(--text-main)",
                        fontWeight: 700,
                        fontSize: "0.82rem",
                        cursor: "pointer",
                        whiteSpace: "nowrap",
                      }}
                    >
                      + Custom
                    </button>
                  </div>
                )}
              </div>

              {/* Row 3, Col 2: Selling Price (₹) * */}
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
                  Selling Price (₹) <span style={{ color: "#ea580c" }}>*</span>
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  step="5"
                  value={itemForm.price}
                  onChange={(e) => setItemForm({ ...itemForm, price: e.target.value })}
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

              {/* Row 4, Col 1: Availability */}
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
                  Availability
                </label>
                <select
                  value={itemForm.isAvailable}
                  onChange={(e) => setItemForm({ ...itemForm, isAvailable: e.target.value })}
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
                    fontSize: "0.9rem",
                    outline: "none",
                    cursor: "pointer",
                  }}
                >
                  <option value="Available">Available</option>
                  <option value="Unavailable">Unavailable</option>
                </select>
              </div>

              {/* Row 4, Col 2: Bartender's Special */}
              <div style={{ display: "flex", alignItems: "center", height: "100%", paddingTop: "20px" }}>
                <label style={{ display: "inline-flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "0.84rem", fontWeight: 700, color: "var(--text-main)" }}>
                  <input
                    type="checkbox"
                    checked={Boolean(itemForm.isChefSpecial)}
                    onChange={(e) => setItemForm({ ...itemForm, isChefSpecial: e.target.checked })}
                    style={{ width: "16px", height: "16px", accentColor: "#f59e0b", cursor: "pointer" }}
                  />
                  <span>Mark as Bartender's Special ⭐</span>
                </label>
              </div>

              {/* Row 5: Description (Full Width) */}
              <div style={{ gridColumn: "1 / -1" }}>
                <label
                  style={{
                    fontSize: "0.82rem",
                    fontWeight: 700,
                    color: "var(--text-main)",
                    display: "block",
                    marginBottom: "5px",
                  }}
                >
                  Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Short description of the drink..."
                  value={itemForm.description}
                  onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })}
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    background: "var(--bg-tertiary)",
                    border: "1.5px solid var(--border-subtle)",
                    borderRadius: "8px",
                    padding: "0.65rem 0.85rem",
                    color: "var(--text-main)",
                    fontSize: "0.85rem",
                    outline: "none",
                    resize: "vertical",
                  }}
                />
              </div>

              {/* Row 6: Choose Image (Full Width) */}
              <div style={{ gridColumn: "1 / -1" }}>
                <label
                  style={{
                    fontSize: "0.82rem",
                    fontWeight: 700,
                    color: "var(--text-main)",
                    display: "block",
                    marginBottom: "5px",
                  }}
                >
                  Choose Image
                </label>
                <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                  {itemForm.image && (
                    <img
                      src={itemForm.image}
                      alt="Drink preview"
                      style={{
                        width: "56px",
                        height: "56px",
                        borderRadius: "8px",
                        objectFit: "cover",
                        border: "1px solid var(--border-card)",
                      }}
                    />
                  )}
                  <label
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      height: "36px",
                      padding: "0 14px",
                      background: "var(--bg-tertiary)",
                      border: "1.5px solid var(--border-subtle)",
                      borderRadius: "8px",
                      color: "var(--text-main)",
                      fontSize: "0.82rem",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    <Plus size={15} />
                    <span>{itemForm.image ? "Change Image" : "+ Choose Image"}</span>
                    <input
                      type="file"
                      accept="image/*"
                      style={{ display: "none" }}
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = () => setItemForm((curr) => ({ ...curr, image: String(reader.result || "") }));
                        reader.readAsDataURL(file);
                      }}
                    />
                  </label>
                  {itemForm.image && (
                    <button
                      type="button"
                      onClick={() => setItemForm((curr) => ({ ...curr, image: "" }))}
                      style={{
                        background: "transparent",
                        border: "none",
                        color: "var(--danger)",
                        fontSize: "0.78rem",
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      ✕ Remove
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer Buttons */}
            <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end", marginTop: "0.6rem" }}>
              <button
                type="button"
                onClick={() => setIsItemModalOpen(false)}
                style={{
                  padding: "0.65rem 1.4rem",
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
                  padding: "0.65rem 1.6rem",
                  background: "linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)",
                  border: "none",
                  color: "#ffffff",
                  borderRadius: "8px",
                  fontSize: "0.85rem",
                  fontWeight: 700,
                  cursor: "pointer",
                  boxShadow: "0 4px 12px rgba(245, 158, 11, 0.35)",
                }}
              >
                {editingItem ? "Save Drink Changes" : "Add Drink"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}


const DEFAULT_BAR_TABLE_SECTIONS = [
  "Main Hall",
  "AC Hall",
  "Family Section",
  "Balcony / Outdoor",
  "Lounge",
  "Bar Counter",
  "Garden Area",
  "VIP Lounge",
];

function BarTablesView({
  tables = [],
  staffList = [],
  orders = [],
  onAddTable,
  onUpdateTable,
  onDeleteTable,
  onAddStaff,
  setToast,
}) {
  const { confirmState, requestDelete, cancelDelete } = useConfirmDelete();
  const [seatingStructureTable, setSeatingStructureTable] = useState(null);
  const [isTableModalOpen, setIsTableModalOpen] = useState(false);
  const [editingTable, setEditingTable] = useState(null);
  const [liveBarTables, setLiveBarTables] = useState(null);
  const [tableForm, setTableForm] = useState({
    name: "",
    section: "Main Hall",
    capacity: 4,
    server: staffList[0]?.name || "",
  });

  // Fetch live bar tables from backend API
  useEffect(() => {
    let isMounted = true;
    apiGetBarTables()
      .then((res) => {
        if (!isMounted) return;
        const fetched = res?.data || res?.tables;
        if (Array.isArray(fetched) && fetched.length > 0) {
          setLiveBarTables(fetched);
        }
      })
      .catch((err) => {
        console.warn("[BarTablesView] apiGetBarTables offline/fallback:", err?.message);
      });

    apiGetBarTableAreas()
      .then((res) => {
        const areas = res?.data || res?.areas;
        if (Array.isArray(areas) && areas.length > 0) {
          areas.forEach((a) => {
            if (a) saveCustomSection(a);
          });
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, []);

  const effectiveTables = useMemo(() => {
    if (!liveBarTables || liveBarTables.length === 0) return tables;
    const map = new Map(tables.map((t) => [String(t.id ?? t.tableId), t]));
    liveBarTables.forEach((st) => {
      const key = String(st.id ?? st.tableId);
      const existing = map.get(key) || {};
      map.set(key, { ...existing, ...st });
    });
    return Array.from(map.values());
  }, [tables, liveBarTables]);

  const STORAGE_KEY_CUSTOM_SECTIONS = "avsr_custom_sections";
  const [customSections, setCustomSections] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CUSTOM_SECTIONS);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const saveCustomSection = (newSec) => {
    if (!newSec || !newSec.trim()) return;
    const trimmed = newSec.trim();
    setCustomSections((prev) => {
      if (prev.some((s) => s.toLowerCase() === trimmed.toLowerCase())) return prev;
      const updated = [...prev, trimmed];
      try {
        localStorage.setItem(STORAGE_KEY_CUSTOM_SECTIONS, JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const allSectionOptions = useMemo(() => {
    const map = new Map();
    DEFAULT_BAR_TABLE_SECTIONS.forEach((s) => {
      if (s) map.set(s.toLowerCase(), { value: s, label: s });
    });
    customSections.forEach((s) => {
      if (s) map.set(s.toLowerCase(), { value: s, label: s });
    });
    (tables || []).forEach((tbl) => {
      const sec = tbl.section || tbl.area;
      if (sec && !map.has(sec.toLowerCase())) {
        map.set(sec.toLowerCase(), { value: sec, label: sec });
      }
    });
    return Array.from(map.values());
  }, [customSections, tables]);

  const isTableOccupied = (tbl) => {
    if (!tbl) return false;
    const rawStatus = String(tbl?.status || "").trim().toLowerCase();
    if (rawStatus === "vacant") return false;
    const hasActiveItemsInTable = Array.isArray(tbl?.items) && tbl.items.some(
      (i) => i && i.status !== "cancelled" && i.kotStatus !== "cancelled"
    );
    const activeOrder = Array.isArray(orders) && orders.find((o) => {
      const orderTblId = String(o.tableId ?? o.TableId ?? "");
      return orderTblId === String(tbl.id) || orderTblId === String(tbl.backendTableId);
    });
    const hasActiveItemsInOrder = activeOrder && Array.isArray(activeOrder.items) && activeOrder.items.some(
      (i) => i && i.status !== "cancelled" && i.kotStatus !== "cancelled"
    );
    const hasActiveItems = hasActiveItemsInTable || Boolean(hasActiveItemsInOrder);
    if (!hasActiveItems) return false;
    if (rawStatus === "occupied" || rawStatus === "dining" || rawStatus === "billed") return true;
    return Boolean(hasActiveItems || rawStatus === "occupied");
  };

  const [tableFilters, setTableFilters] = useState({
    search: "",
    status: "all",
  });
  const updateTableFilter = (key, value) => {
    setTableFilters((prev) => ({ ...prev, [key]: value }));
  };
  const clearTableFilters = () => {
    setTableFilters({ search: "", status: "all" });
  };
  const hasActiveTableFilters = Boolean(
    tableFilters.search || (tableFilters.status && tableFilters.status !== "all")
  );

  const normalizeTableFilterText = (value) =>
    String(value ?? "").trim().toLowerCase();

  const vacantTablesCount = effectiveTables.filter((t) => !isTableOccupied(t)).length;
  const occupiedTablesCount = effectiveTables.filter((t) => isTableOccupied(t)).length;

  const filteredTables = effectiveTables.filter((table) => {
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
        table.area,
        table.server,
      ].some((val) => normalizeTableFilterText(val).includes(query));

    const matchesStatus =
      !tableFilters.status ||
      tableFilters.status === "all" ||
      tableStatus === normalizeTableFilterText(tableFilters.status);

    return matchesSearch && matchesStatus;
  });

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

  const sortedTables = useMemo(() => {
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
        aVal = String(a.section || a.area || "").toLowerCase();
        bVal = String(b.section || b.area || "").toLowerCase();
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

  const handleOpenTableModal = (tbl = null) => {
    if (tbl) {
      setEditingTable(tbl);
      setTableForm({
        name: tbl.name || `Table ${tbl.id}`,
        section: tbl.section || tbl.area || "Main Hall",
        capacity: Number(tbl.capacity) || 4,
        server: tbl.server || staffList[0]?.name || "",
      });
    } else {
      setEditingTable(null);
      const maxId = tables.reduce((m, t) => Math.max(m, Number(t.id) || 0), 0);
      setTableForm({
        name: `Table-${maxId + 1}`,
        section: "Main Hall",
        capacity: 4,
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

    const assignedServer = tableForm.server || "";

    if (editingTable) {
      const updatedPayload = {
        ...editingTable,
        name: tableForm.name,
        tableName: tableForm.name,
        tableNumber: tableForm.name,
        section: tableForm.section,
        sectionArea: tableForm.section,
        area: tableForm.section,
        capacity: Number(tableForm.capacity) || 2,
        capacityChairs: Number(tableForm.capacity) || 2,
        server: assignedServer,
        assignedServer: assignedServer,
      };

      const targetApiId = editingTable.tableId || editingTable.backendTableId || editingTable.id;
      apiUpdateBarTable(targetApiId, updatedPayload).catch((err) => {
        console.warn("[BarWorkspace] apiUpdateBarTable warning:", err?.message);
      });

      onUpdateTable?.(updatedPayload);
      setToast?.(`Table "${tableForm.name}" updated successfully.`);
    } else {
      const parsedNum = parseInt(tableForm.name.replace(/\D/g, ""), 10);
      const maxId = effectiveTables.reduce((m, t) => Math.max(m, Number(t.id) || 0), 0);
      const chosenId = Number.isFinite(parsedNum) && parsedNum > 0 ? parsedNum : maxId + 1;
      const formattedName = tableForm.name.trim().match(/^(?:table|t)\s*[-–—]?\s*\d+$/i)
        ? `Table ${parsedNum}`
        : (/^\d+$/.test(tableForm.name.trim()) ? `Table ${tableForm.name.trim()}` : tableForm.name.trim());

      const newTablePayload = {
        id: chosenId,
        name: formattedName,
        tableName: formattedName,
        tableNumber: formattedName,
        section: tableForm.section,
        sectionArea: tableForm.section,
        area: tableForm.section,
        capacity: Number(tableForm.capacity) || 4,
        capacityChairs: Number(tableForm.capacity) || 4,
        status: "available",
        guests: Number(tableForm.capacity) || 4,
        items: [],
        discountPercent: 0,
        serviceCharge: 5,
        orderTime: null,
        server: assignedServer,
        assignedServer: assignedServer,
      };

      apiCreateBarTable(newTablePayload).then((res) => {
        const createdId = res?.data?.tableId || res?.data?.id;
        if (createdId) {
          newTablePayload.backendTableId = createdId;
        }
      }).catch((err) => {
        console.warn("[BarWorkspace] apiCreateBarTable warning:", err?.message);
      });

      onAddTable?.(newTablePayload);
      setToast?.(`Table "${formattedName}" added successfully.`);
    }
    setIsTableModalOpen(false);
  };

  const handleDeleteTableClick = (tbl) => {
    if (isTableOccupied(tbl)) {
      requestDelete({
        title: "Cannot Delete Table",
        message: `Cannot delete ${tbl.name || `Table ${tbl.id}`} because it is currently occupied with diners. Clear or settle bill first.`,
        confirmLabel: "Understood",
        cancelLabel: "Close",
        icon: <AlertCircle size={22} color="#f59e0b" />,
        onConfirm: () => {},
      });
      return;
    }
    requestDelete({
      title: "Delete Table?",
      message: `Are you sure you want to delete ${tbl.name || `Table ${tbl.id}`} permanently? This action cannot be undone.`,
      confirmLabel: "Yes, Delete",
      onConfirm: async () => {
        const targetApiId = tbl.tableId || tbl.backendTableId || tbl.id;
        apiDeleteBarTable(targetApiId).catch((err) => {
          console.warn("[BarWorkspace] apiDeleteBarTable warning:", err?.message);
        });
        await onDeleteTable?.(tbl.id);
        setToast?.(`Table "${tbl.name || tbl.id}" deleted.`);
      },
    });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "0.25rem",
          flexWrap: "wrap",
          gap: "0.75rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
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
                      {effectiveTables.length}
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
                    Showing all {effectiveTables.length} tables
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
                    {tbl.section || tbl.area || "Main Hall"}
                  </div>

                  {/* Col 3: Chairs / Capacity */}
                  <div
                    style={{
                      color: "var(--text-muted)",
                      fontSize: "0.84rem",
                      fontWeight: 500,
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => setSeatingStructureTable(tbl)}
                      style={{
                        background: "transparent",
                        border: "none",
                        padding: 0,
                        color: "inherit",
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "0.35rem",
                        fontSize: "inherit",
                        fontWeight: "inherit",
                      }}
                      title="Click to view & configure seating structure"
                    >
                      <Armchair size={13} color="var(--accent-amber)" />
                      <span>{tbl.capacity} Chairs / {tbl.capacity} Persons</span>
                    </button>
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
                    {/* Set / View Seating Structure Modal Button */}
                    <button
                      type="button"
                      onClick={() => setSeatingStructureTable(tbl)}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: "0.32rem 0.5rem",
                        background: "rgba(16, 185, 129, 0.08)",
                        color: "#10b981",
                        border: "1px solid rgba(16, 185, 129, 0.45)",
                        borderRadius: "6px",
                        fontSize: "0.74rem",
                        cursor: "pointer",
                        transition: "all 0.15s ease",
                        flexShrink: 0,
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "rgba(16, 185, 129, 0.2)";
                        e.currentTarget.style.borderColor = "#10b981";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "rgba(16, 185, 129, 0.08)";
                        e.currentTarget.style.borderColor = "rgba(16, 185, 129, 0.45)";
                      }}
                      title="Set Seating Structure & View Layout"
                      aria-label="Set Seating Structure & View Layout"
                    >
                      <Armchair size={13} color="#10b981" />
                    </button>
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
                      onClick={() => handleDeleteTableClick(tbl)}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: "0.32rem 0.5rem",
                        background: "rgba(239, 68, 68, 0.08)",
                        color: "#ef4444",
                        border: "1px solid rgba(239, 68, 68, 0.45)",
                        borderRadius: "6px",
                        fontSize: "0.74rem",
                        cursor: "pointer",
                        transition: "all 0.15s ease",
                        flexShrink: 0,
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "rgba(239, 68, 68, 0.2)";
                        e.currentTarget.style.borderColor = "#ef4444";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "rgba(239, 68, 68, 0.08)";
                        e.currentTarget.style.borderColor = "rgba(239, 68, 68, 0.45)";
                      }}
                      title="Delete Table"
                      aria-label="Delete Table"
                    >
                      <Trash2 size={13} color="#ef4444" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Add / Edit Table Modal */}
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
                {editingTable ? `Edit ${editingTable.name}` : "Add New Restaurant Table"}
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
                Table Name / Identifier <span style={{ color: "#ea580c" }}>*</span>
              </label>
              <input
                type="text"
                required
                value={tableForm.name}
                onChange={(e) => setTableForm({ ...tableForm, name: e.target.value })}
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
                Dining Section / Area <span style={{ color: "#ea580c" }}>*</span>
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
                Chairs / Seating Capacity (Persons) <span style={{ color: "#ea580c" }}>*</span>
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
                  const isSelected = Number(tableForm.capacity) === chairCount;
                  return (
                    <button
                      key={chairCount}
                      type="button"
                      onClick={() => setTableForm({ ...tableForm, capacity: chairCount })}
                      style={{
                        padding: "0.55rem 0.3rem",
                        borderRadius: "8px",
                        background: isSelected
                          ? "linear-gradient(135deg, #f59e0b, #ea580c)"
                          : "var(--bg-tertiary)",
                        color: isSelected ? "#ffffff" : "var(--text-main)",
                        fontWeight: 800,
                        fontSize: "0.82rem",
                        border: isSelected ? "1.5px solid #ea580c" : "1.5px solid var(--border-subtle)",
                        boxShadow: isSelected ? "0 3px 10px rgba(234, 88, 12, 0.35)" : "none",
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
                onChange={(e) => setTableForm({ ...tableForm, capacity: Number(e.target.value) })}
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
              <div style={{ marginBottom: "5px" }}>
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
                    "Unnamed staff"
                  );
                  const staffRole = staff?.role || staff?.roleTitle || "Staff";
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
                        (s) => (s.name || s.fullName || "").toLowerCase() === newServer.toLowerCase()
                      )
                    ) {
                      onAddStaff?.({
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

            <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.6rem" }}>
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

      {/* Select Seats Modal */}
      <SelectSeatsModal
        table={seatingStructureTable}
        isOpen={Boolean(seatingStructureTable)}
        onClose={() => setSeatingStructureTable(null)}
        onUpdateTable={onUpdateTable}
        role="admin"
      />

      {/* Confirm Delete Modal */}
      <ConfirmDeleteModal
        isOpen={confirmState.isOpen}
        title={confirmState.title}
        message={confirmState.message}
        confirmLabel={confirmState.confirmLabel}
        cancelLabel={confirmState.cancelLabel}
        icon={confirmState.icon}
        onConfirm={confirmState.onConfirm}
        onCancel={cancelDelete}
      />
    </div>
  );
}


// ============================================================================
// Bar Staff & Serving Personnel View (Mirrors Dine Staff & Persons)
// ============================================================================
function BarStaffView({
  staffList = [],
  tables = [],
  onAddStaff,
  onUpdateStaff,
  onDeleteStaff,
  onReloadStaff,
  loading = false,
  setToast,
}) {
  const { requestDelete, confirmState, cancelDelete } = useConfirmDelete();

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

  const [backendFilterOptions, setBackendFilterOptions] = useState(null);
  const [assignableTables, setAssignableTables] = useState([]);

  useEffect(() => {
    let isMounted = true;
    apiGetBarStaffFilterOptions()
      .then((res) => {
        if (!isMounted) return;
        if (res?.success && res?.data) {
          setBackendFilterOptions(res.data);
        }
      })
      .catch((err) => {
        console.warn("[BarStaffView] apiGetBarStaffFilterOptions error:", err?.message);
      });

    apiGetAssignableTables()
      .then((res) => {
        if (!isMounted) return;
        const list = res?.data || res?.tables;
        if (Array.isArray(list)) {
          setAssignableTables(list);
        }
      })
      .catch((err) => {
        console.warn("[BarStaffView] apiGetAssignableTables error:", err?.message);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const STORAGE_KEY_CUSTOM_ROLES = "avsr_custom_roles_v1";
  const STORAGE_KEY_CUSTOM_SHIFTS = "avsr_custom_shifts_v1";

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

  const staffRoleOptions = useMemo(() => {
    const set = new Set();
    if (Array.isArray(backendFilterOptions?.roles)) {
      backendFilterOptions.roles.forEach((r) => {
        if (r && !r.toLowerCase().startsWith("all")) set.add(r.trim());
      });
    }
    (staffList || []).forEach((s) => {
      const r = String(s?.role || s?.roleTitle || s?.jobTitle || "").trim();
      if (r) set.add(r);
    });
    return Array.from(set).sort();
  }, [backendFilterOptions, staffList]);

  const staffShiftOptions = useMemo(() => {
    const set = new Set();
    if (Array.isArray(backendFilterOptions?.shifts)) {
      backendFilterOptions.shifts.forEach((sh) => {
        if (sh && !sh.toLowerCase().startsWith("all")) set.add(sh.trim());
      });
    }
    (staffList || []).forEach((s) => {
      const sh = String(s?.shift || "").trim();
      if (sh) set.add(sh);
    });
    return Array.from(set).sort();
  }, [backendFilterOptions, staffList]);

  const allRoleOptions = useMemo(() => {
    const map = new Map();
    if (Array.isArray(backendFilterOptions?.roles)) {
      backendFilterOptions.roles.forEach((r) => {
        if (r && !r.toLowerCase().startsWith("all") && !map.has(r.toLowerCase())) {
          map.set(r.toLowerCase(), { value: r, label: r });
        }
      });
    }
    customRoles.forEach((r) => {
      if (r && !map.has(r.toLowerCase())) {
        map.set(r.toLowerCase(), { value: r, label: r });
      }
    });
    (staffList || []).forEach((st) => {
      const r = st.role || st.roleTitle || st.jobTitle;
      if (r && !map.has(r.toLowerCase())) {
        map.set(r.toLowerCase(), { value: r, label: r });
      }
    });
    return Array.from(map.values());
  }, [backendFilterOptions, customRoles, staffList]);

  const allShiftOptions = useMemo(() => {
    const map = new Map();
    if (Array.isArray(backendFilterOptions?.shifts)) {
      backendFilterOptions.shifts.forEach((sh) => {
        if (sh && !sh.toLowerCase().startsWith("all") && !map.has(sh.toLowerCase())) {
          map.set(sh.toLowerCase(), { value: sh, label: sh });
        }
      });
    }
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
  }, [backendFilterOptions, customShifts, staffList]);

  const filteredStaffList = useMemo(() => {
    return (staffList || []).filter((person) => {
      const personName = String(
        person?.name ||
        person?.fullName ||
        person?.FullName ||
        person?.username ||
        "Unnamed staff",
      );
      const personRole = String(person?.role || person?.roleTitle || person?.jobTitle || "Staff");
      const personPhone = String(person?.phone || "");
      const personShift = String(person?.shift || "");
      const personId = person?.id ?? person?.staffId;
      const assignedCount = (Array.isArray(person?.assignedTableIds) && person.assignedTableIds.length > 0)
        ? person.assignedTableIds.length
        : (person?.assignedTables && person.assignedTables !== "—"
            ? person.assignedTables.split(",").filter(Boolean).length
            : (tables || []).filter((t) => {
                const sName = (t.server || t.assignedServer || t.assignedServerName || "").trim().toLowerCase();
                const pName = personName.trim().toLowerCase();
                const sId = String(t.assignedServerId || t.serverId || "");
                const pId = String(personId || "");
                return (sName && sName === pName) || (sId && pId && sId === pId);
              }).length
          );

      if (staffFilters.search) {
        const q = staffFilters.search.toLowerCase().trim();
        const matches =
          personName.toLowerCase().includes(q) ||
          personPhone.toLowerCase().includes(q) ||
          personRole.toLowerCase().includes(q);
        if (!matches) return false;
      }
      if (staffFilters.role && personRole.toLowerCase() !== staffFilters.role.toLowerCase()) {
        return false;
      }
      if (staffFilters.shift && personShift.toLowerCase() !== staffFilters.shift.toLowerCase()) {
        return false;
      }
      if (staffFilters.assigned) {
        if (staffFilters.assigned === "assigned" && assignedCount === 0) return false;
        if (staffFilters.assigned === "unassigned" && assignedCount > 0) return false;
      }
      return true;
    });
  }, [staffList, tables, staffFilters]);

  // Modal State
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [staffForm, setStaffForm] = useState({
    name: "",
    role: "",
    phone: "",
    shift: "",
    assignedTableIds: [],
  });

  const handleOpenStaffModal = (person = null) => {
    if (person) {
      const personName = String(
        person?.name ||
          person?.fullName ||
          person?.FullName ||
          person?.username ||
          "",
      );
      const personRole = String(person?.role || person?.roleTitle || person?.jobTitle || "");
      const personTableIds = Array.isArray(person?.assignedTableIds)
        ? person.assignedTableIds
        : [];
      setEditingStaff(person);
      setStaffForm({
        name: personName,
        role: personRole,
        phone: person.phone || "",
        shift: person.shift || "",
        assignedTableIds: personTableIds,
      });
    } else {
      setEditingStaff(null);
      setStaffForm({
        name: "",
        role: "",
        phone: "",
        shift: "",
        assignedTableIds: [],
      });
    }
    setIsStaffModalOpen(true);
  };

  const handleSaveStaff = async (e) => {
    e.preventDefault();
    if (!staffForm.name.trim()) return;

    if (staffForm.role) {
      saveCustomRole(staffForm.role);
    }
    if (staffForm.shift) {
      saveCustomShift(staffForm.shift);
    }

    const payload = {
      name: staffForm.name.trim(),
      fullName: staffForm.name.trim(),
      role: staffForm.role,
      jobTitle: staffForm.role,
      roleTitle: staffForm.role,
      phone: staffForm.phone || "+91 98450 00000",
      shift: staffForm.shift,
      assignedTableIds: staffForm.assignedTableIds || [],
    };

    let saved;
    if (editingStaff) {
      if (onUpdateStaff) {
        saved = await onUpdateStaff({
          ...editingStaff,
          ...payload,
        });
      }
    } else {
      if (onAddStaff) {
        saved = await onAddStaff(payload);
      }
    }
    if (saved === false) return;

    setEditingStaff(null);
    setStaffForm({
      name: "",
      role: "",
      phone: "",
      shift: "",
      assignedTableIds: [],
    });
    setIsStaffModalOpen(false);
    setToast?.(`Staff member "${staffForm.name}" ${editingStaff ? "updated" : "saved"} successfully!`);
  };

  const handleDeleteStaffClick = (person) => {
    const personName = String(
      person?.name ||
      person?.fullName ||
      person?.FullName ||
      person?.username ||
      "Staff",
    );
    const personId = person?.id ?? person?.staffId;
    requestDelete({
      title: "Remove Staff?",
      message: `Are you sure you want to remove "${personName}" from the staff list? This action cannot be undone.`,
      confirmLabel: "Yes, Remove",
      onConfirm: async () => {
        await onDeleteStaff?.(personId);
        setToast?.(`Staff member "${personName}" removed.`);
      },
    });
  };

  return (
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

      {/* Header: Title + Action Buttons */}
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
              Bar Staff & Serving Personnel
            </h2>
            <p
              style={{
                fontSize: "0.76rem",
                color: "var(--text-muted)",
                margin: "2px 0 0 0",
              }}
            >
              Manage bartenders, bar captains and servers handling bar guests
            </p>
          </div>
        </div>

        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() => {
              onReloadStaff?.();
              setToast?.("Staff list refreshed from database.");
            }}
            title="Reload staff list from backend database"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.35rem",
              padding: "0.5rem 0.9rem",
              background: "var(--bg-secondary)",
              border: "1px solid var(--border-card)",
              color: "var(--text-dim)",
              borderRadius: "8px",
              fontWeight: 600,
              fontSize: "0.8rem",
              cursor: "pointer",
            }}
          >
            <RotateCcw size={14} />
            <span>Refresh</span>
          </button>

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
            <span>+ Add New Person (Staff)</span>
          </button>
        </div>
      </div>

      {/* Staff Rows Container */}
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
            {/* Column Filters Bar */}
            <div className="staff-filter-toolbar" role="search" aria-label="Staff filters">
              {/* Col 1: Search Filter */}
              <label className="menu-filter-field menu-filter-search staff-filter-search" htmlFor="bar-staff-filter-search">
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
                    id="bar-staff-filter-search"
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
              <label className="menu-filter-field" htmlFor="bar-staff-filter-role">
                <span>Role</span>
                <select
                  id="bar-staff-filter-role"
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

              {/* Col 3: Phone / Contact */}
              <label className="menu-filter-field" htmlFor="bar-staff-filter-contact">
                <span>Phone / Contact</span>
                <input id="bar-staff-filter-contact" type="text" aria-label="Phone / Contact filter unavailable" disabled />
              </label>

              {/* Col 4: Shift Filter */}
              <label className="menu-filter-field" htmlFor="bar-staff-filter-shift">
                <span>Shift</span>
                <select
                  id="bar-staff-filter-shift"
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
              <label className="menu-filter-field" htmlFor="bar-staff-filter-assigned">
                <span>Table Assignment</span>
                <select
                  id="bar-staff-filter-assigned"
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
                    {(staffList || []).length} Staff
                  </span>
                )}
              </div>
            </div>

            {/* Staff table headings */}
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
                    : 'No staff members configured yet. Click "+ Add New Person (Staff)" to create one.'}
                </p>
                {hasActiveStaffFilters ? (
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
                ) : (
                  <div style={{ marginTop: "1rem", display: "flex", gap: "0.75rem", justifyContent: "center", flexWrap: "wrap" }}>
                    <button
                      type="button"
                      onClick={() => handleOpenStaffModal()}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "0.4rem",
                        background: "linear-gradient(135deg, #f97316 0%, #ea580c 100%)",
                        color: "#fff",
                        border: "none",
                        padding: "0.45rem 1rem",
                        borderRadius: "6px",
                        fontSize: "0.85rem",
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      <Plus size={14} />
                      <span>+ Add New Person (Staff)</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Staff Rows List */}
            {filteredStaffList.map((person) => {
              const personName = String(
                person?.name ||
                  person?.fullName ||
                  person?.FullName ||
                  person?.username ||
                  "Unnamed staff",
              );
              const personRole = String(
                person?.role || person?.roleTitle || person?.jobTitle || "Staff",
              );
              const personId = person?.id ?? person?.staffId;
              const assignedCount = (Array.isArray(person?.assignedTableIds) && person.assignedTableIds.length > 0)
                ? person.assignedTableIds.length
                : (person?.assignedTables && person.assignedTables !== "—"
                    ? person.assignedTables.split(",").filter(Boolean).length
                    : (tables || []).filter((t) => {
                        const sName = (t.server || t.assignedServer || t.assignedServerName || "").trim().toLowerCase();
                        const pName = personName.trim().toLowerCase();
                        const sId = String(t.assignedServerId || t.serverId || "");
                        const pId = String(personId || "");
                        return (sName && sName === pName) || (sId && pId && sId === pId);
                      }).length
                  );

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
                  {/* Col 1: Staff Avatar Badge + Name */}
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

                  {/* Col 4: Shift */}
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

                  {/* Col 5: Status Pill */}
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

                  {/* Col 6: Actions */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "0.4rem" }}>
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

                    <button
                      type="button"
                      onClick={() => handleDeleteStaffClick(person)}
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
                      aria-label="Remove staff member"
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

      {/* Modal: Add / Edit Staff Person */}
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
              maxWidth: "480px",
              maxHeight: "90vh",
              overflowY: "auto",
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
                placeholder="e.g. Rajesh Kumar"
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
                  boxSizing: "border-box",
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

            {assignableTables.length > 0 && (
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
                  Assigned Bar Tables
                </label>
                <div
                  style={{
                    maxHeight: "130px",
                    overflowY: "auto",
                    background: "var(--bg-tertiary)",
                    border: "1.5px solid var(--border-subtle)",
                    borderRadius: "8px",
                    padding: "0.5rem 0.75rem",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.4rem",
                  }}
                >
                  {assignableTables.map((tbl) => {
                    const isChecked = staffForm.assignedTableIds.includes(tbl.tableId);
                    return (
                      <label
                        key={tbl.tableId}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.55rem",
                          fontSize: "0.82rem",
                          color: isChecked ? "var(--accent-amber-light)" : "var(--text-main)",
                          cursor: "pointer",
                          fontWeight: isChecked ? 700 : 500,
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setStaffForm((prev) => ({
                                ...prev,
                                assignedTableIds: [...prev.assignedTableIds, tbl.tableId],
                              }));
                            } else {
                              setStaffForm((prev) => ({
                                ...prev,
                                assignedTableIds: prev.assignedTableIds.filter((id) => id !== tbl.tableId),
                              }));
                            }
                          }}
                          style={{ accentColor: "#f59e0b", cursor: "pointer" }}
                        />
                        <span>{tbl.label || tbl.tableNumber || `Table ${tbl.tableId}`}</span>
                        {tbl.isCurrentlyAssigned && tbl.assignedStaffName && !isChecked && (
                          <span style={{ fontSize: "0.72rem", color: "var(--text-dim)", marginLeft: "auto" }}>
                            ({tbl.assignedStaffName})
                          </span>
                        )}
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

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

      {/* Confirmation Modal */}
      <ConfirmDeleteModal
        isOpen={confirmState.isOpen}
        title={confirmState.title}
        message={confirmState.message}
        confirmLabel={confirmState.confirmLabel}
        cancelLabel={confirmState.cancelLabel}
        icon={confirmState.icon}
        onConfirm={confirmState.onConfirm}
        onCancel={cancelDelete}
      />
    </div>
  );
}

export function BarWorkspace({
  activeTab = "bar-overview",
  onNavigate,
  tables: dineTables = [],
  staffList: dineStaff = [],
  menuItems = [],
  sharedRecordLoad = { tables: "ready", staff: "ready" },
  onAddTable,
  onUpdateTable,
  onDeleteTable,
  onAddStaff,
  onUpdateStaff,
  onDeleteStaff,
  onAddMenuItem,
  onUpdateMenuItem,
  onDeleteMenuItem,
  onSetMenuAvailability,
  onOrderUpdated,
  onBarOrderItemStatusUpdated,
  onUpdateItemKotStatus = null,
  onCompleteTableKot = null,
  inventory: sharedInventory = [],
  pastOrders = [],
  restaurantName = "Restaurant",
  restaurantSettings = {},
  onUpdateInvoiceDiscount = null,
}) {
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [ordersError, setOrdersError] = useState("");
  const [inventory, setInventory] = useState(sharedInventory);
  const [inventoryLoading, setInventoryLoading] = useState(false);
  const [inventoryError, setInventoryError] = useState("");
  const [busyItems, setBusyItems] = useState(() => new Set());
  const [orderComposerOpen, setOrderComposerOpen] = useState(false);
  const [orderSubmitting, setOrderSubmitting] = useState(false);
  const [pendingBarKot, setPendingBarKot] = useState(null);
  const [orderError, setOrderError] = useState("");
  const [orderTableId, setOrderTableId] = useState("");
  const [orderDrinkId, setOrderDrinkId] = useState("");
  const [orderMenuCategory, setOrderMenuCategory] = useState("all");
  const [orderQuantity, setOrderQuantity] = useState(1);
  const [orderNotes, setOrderNotes] = useState("");
  const [orderServing, setOrderServing] = useState("");
  const [orderIce, setOrderIce] = useState("");
  const [orderMixer, setOrderMixer] = useState("");
  const [settings, setSettings] = useState(SETTINGS_DEFAULTS);
  const [savedSettings, setSavedSettings] = useState(SETTINGS_DEFAULTS);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [extraFilter, setExtraFilter] = useState("all");
  const [capacityFilter, setCapacityFilter] = useState("all");
  const [assignmentFilter, setAssignmentFilter] = useState("all");
  const [stockFilter, setStockFilter] = useState("all");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [pricePreset, setPricePreset] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState(null);
  const [details, setDetails] = useState(null);
  const [itemsOrder, setItemsOrder] = useState(null);
  const [tableItems, setTableItems] = useState(null);
  const [toast, setToast] = useState("");
  const [reportPeriod, setReportPeriod] = useState("Today");
  const [reportCategory, setReportCategory] = useState("All Categories");
  const [reportStart, setReportStart] = useState("");
  const [reportEnd, setReportEnd] = useState("");
  const route = activeTab || "bar-overview";

  const menuLookup = useMemo(() => createMenuItemLookup(menuItems), [menuItems]);
  const STORAGE_KEY_BAR_DRINKS = "avsr_bar_drinks_menu_v2";

  // Dedicated bar drinks state - loaded live from Backend API (no mock data)
  const [barDrinks, setBarDrinks] = useState(() => {
    try {
      localStorage.removeItem("avsr_bar_drinks_menu_v1");
      const saved = localStorage.getItem(STORAGE_KEY_BAR_DRINKS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  });

  // Live Bar Overview dashboard state & loader
  const [overviewData, setOverviewData] = useState(null);
  const [overviewLoading, setOverviewLoading] = useState(false);

  const loadBarOverview = useCallback(async () => {
    setOverviewLoading(true);
    try {
      const res = await apiGetBarOverview();
      const data = res?.data?.data || res?.data;
      if (res?.success && data) {
        setOverviewData(data);
      }
    } catch (err) {
      console.warn("[BarWorkspace] apiGetBarOverview offline/fallback:", err?.message);
    } finally {
      setOverviewLoading(false);
    }
  }, []);

  useEffect(() => {
    if (route === "bar-overview") {
      loadBarOverview();
      const timer = window.setInterval(loadBarOverview, 15000);
      return () => window.clearInterval(timer);
    }
  }, [route, loadBarOverview]);

  // Fetch live drinks from backend API
  const loadBarDrinks = useCallback(async () => {
    try {
      const res = await apiGetBarDrinks();
      const raw = res?.data?.data || res?.data;
      if (res?.success && Array.isArray(raw)) {
        const formatted = raw.map((d) => ({
          ...d,
          id: d.menuItemId || d.id,
          menuItemId: d.menuItemId || d.id,
          name: d.drinkName || d.name || d.dishName || "",
          dishName: d.drinkName || d.name || d.dishName || "",
          drinkName: d.drinkName || d.name || d.dishName || "",
          category: d.category || "Cocktails",
          price: Number(d.price ?? d.sellingPrice ?? 0),
          sellingPrice: Number(d.price ?? d.sellingPrice ?? 0),
          measure: d.servingMeasure || d.measure || d.servingVolume || "30 ml (Single Peg)",
          servingMeasure: d.servingMeasure || d.measure || d.servingVolume || "30 ml (Single Peg)",
          servingVolume: d.servingMeasure || d.measure || d.servingVolume || "30 ml (Single Peg)",
          isAvailable: d.isAvailable !== false && d.isAvailable !== "Unavailable",
          drinkType: d.drinkType || (d.abv || d.alcoholContent ? "Alcoholic" : "Non-Alcoholic"),
          abv: d.abv !== undefined && d.abv !== null ? d.abv : (d.alcoholContent !== undefined ? d.alcoholContent : ""),
          alcoholContent: d.alcoholContent !== undefined ? d.alcoholContent : (d.abv !== undefined && d.abv !== null ? d.abv : 0),
          isChefSpecial: Boolean(d.isSpecial || d.isBartenderSpecial || d.isChefsSpecial),
          isChefsSpecial: Boolean(d.isSpecial || d.isBartenderSpecial || d.isChefsSpecial),
          isSpecial: Boolean(d.isSpecial || d.isBartenderSpecial || d.isChefsSpecial),
          isBartenderSpecial: Boolean(d.isSpecial || d.isBartenderSpecial || d.isChefsSpecial),
          prepTime: d.prepTime || `${d.prepTimeMinutes || 15} min`,
          prepTimeMinutes: d.prepTimeMinutes || 15,
          description: d.description || d.shortDescription || "",
          shortDescription: d.description || d.shortDescription || "",
          image: d.imageUrl || d.image || "",
          imageUrl: d.imageUrl || d.image || "",
          isBarDrink: true,
          isBarItem: true,
        }));
        setBarDrinks(formatted);
      }
    } catch (err) {
      console.warn("[BarWorkspace] apiGetBarDrinks offline/fallback:", err?.message);
    }
  }, []);

  useEffect(() => {
    loadBarDrinks();
  }, [loadBarDrinks]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_BAR_DRINKS, JSON.stringify(barDrinks));
    } catch {}
  }, [barDrinks]);

  const STORAGE_KEY_BAR_STAFF = "avsr_bar_staff_v2";

  // Dedicated bar staff state - loaded live from Backend API (no mock data)
  const [barStaff, setBarStaff] = useState(() => {
    try {
      localStorage.removeItem("avsr_bar_staff_v1");
      const saved = localStorage.getItem(STORAGE_KEY_BAR_STAFF);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  });
  const [barStaffLoading, setBarStaffLoading] = useState(false);

  const loadBarStaff = useCallback(async () => {
    setBarStaffLoading(true);
    try {
      const res = await apiGetBarStaff();
      const raw = res?.data?.data || res?.data;
      if (res?.success && Array.isArray(raw)) {
        const formatted = raw.map((s) => ({
          ...s,
          id: s.staffId || s.id,
          staffId: s.staffId || s.id,
          name: s.fullName || s.name || "",
          fullName: s.fullName || s.name || "",
          role: s.jobTitle || s.role || s.roleTitle || "Staff",
          jobTitle: s.jobTitle || s.role || s.roleTitle || "Staff",
          roleTitle: s.jobTitle || s.role || s.roleTitle || "Staff",
          phone: s.phone || "",
          shift: s.shift || "General Shift",
          barArea: s.barArea || "—",
          assignedTables: s.assignedTables || "—",
          assignedTableIds: Array.isArray(s.assignedTableIds) ? s.assignedTableIds : [],
          assignedTableDetails: Array.isArray(s.assignedTableDetails) ? s.assignedTableDetails : [],
          isActive: s.isActive !== false && s.status !== "inactive",
          status: s.status || (s.isActive !== false ? "active" : "inactive"),
        }));
        setBarStaff(formatted);
      }
    } catch (err) {
      console.warn("[BarWorkspace] apiGetBarStaff offline/fallback:", err?.message);
    } finally {
      setBarStaffLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBarStaff();
  }, [loadBarStaff]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_BAR_STAFF, JSON.stringify(barStaff));
    } catch {}
  }, [barStaff]);

  const handleAddBarStaff = async (newStaff) => {
    try {
      const res = await apiCreateBarStaff({
        fullName: newStaff.name || newStaff.fullName,
        jobTitle: newStaff.role || newStaff.jobTitle || newStaff.roleTitle,
        phone: newStaff.phone,
        shift: newStaff.shift,
        assignedTableIds: newStaff.assignedTableIds || [],
        assignedTables: newStaff.assignedTables || [],
        isActive: true,
      });
      const created = res?.data?.data || res?.data;
      if (created) {
        const mapped = {
          ...created,
          id: created.staffId || created.id,
          staffId: created.staffId || created.id,
          name: created.fullName || created.name || newStaff.name,
          fullName: created.fullName || created.name || newStaff.name,
          role: created.jobTitle || created.role || created.roleTitle || newStaff.role,
          jobTitle: created.jobTitle || created.role || created.roleTitle || newStaff.role,
          roleTitle: created.jobTitle || created.role || created.roleTitle || newStaff.role,
          phone: created.phone || newStaff.phone,
          shift: created.shift || newStaff.shift,
          barArea: created.barArea || "—",
          assignedTables: created.assignedTables || "—",
          assignedTableIds: created.assignedTableIds || [],
          assignedTableDetails: created.assignedTableDetails || [],
          isActive: true,
          status: "active",
        };
        setBarStaff((prev) => [mapped, ...prev.filter((s) => s.id !== mapped.id)]);
        return mapped;
      }
    } catch (err) {
      console.error("[BarWorkspace] apiCreateBarStaff error:", err);
      const fallback = {
        ...newStaff,
        id: Date.now(),
        staffId: Date.now(),
        fullName: newStaff.name,
        jobTitle: newStaff.role,
        roleTitle: newStaff.role,
        isActive: true,
        status: "active",
      };
      setBarStaff((prev) => [fallback, ...prev]);
      return fallback;
    }
  };

  const handleUpdateBarStaff = async (updatedStaff) => {
    const id = updatedStaff.staffId || updatedStaff.id;
    try {
      const res = await apiUpdateBarStaff(id, {
        fullName: updatedStaff.name || updatedStaff.fullName,
        jobTitle: updatedStaff.role || updatedStaff.jobTitle || updatedStaff.roleTitle,
        phone: updatedStaff.phone,
        shift: updatedStaff.shift,
        assignedTableIds: updatedStaff.assignedTableIds,
        assignedTables: updatedStaff.assignedTables,
        isActive: updatedStaff.isActive,
      });
      const updated = res?.data?.data || res?.data;
      if (updated) {
        const mapped = {
          ...updated,
          id: updated.staffId || updated.id || id,
          staffId: updated.staffId || updated.id || id,
          name: updated.fullName || updated.name || updatedStaff.name,
          fullName: updated.fullName || updated.name || updatedStaff.name,
          role: updated.jobTitle || updated.role || updated.roleTitle || updatedStaff.role,
          jobTitle: updated.jobTitle || updated.role || updated.roleTitle || updatedStaff.role,
          roleTitle: updated.jobTitle || updated.role || updated.roleTitle || updatedStaff.role,
          phone: updated.phone || updatedStaff.phone,
          shift: updated.shift || updatedStaff.shift,
          barArea: updated.barArea || "—",
          assignedTables: updated.assignedTables || "—",
          assignedTableIds: updated.assignedTableIds || [],
          assignedTableDetails: updated.assignedTableDetails || [],
          isActive: updated.isActive !== false,
          status: updated.status || "active",
        };
        setBarStaff((prev) => prev.map((s) => (s.id === id || s.staffId === id ? mapped : s)));
        return mapped;
      }
    } catch (err) {
      console.error("[BarWorkspace] apiUpdateBarStaff error:", err);
      setBarStaff((prev) => prev.map((s) => (s.id === id || s.staffId === id ? updatedStaff : s)));
      return updatedStaff;
    }
  };

  const handleDeleteBarStaff = async (staffId) => {
    try {
      await apiDeleteBarStaff(staffId);
    } catch (err) {
      console.error("[BarWorkspace] apiDeleteBarStaff error:", err);
    }
    setBarStaff((prev) => prev.filter((s) => s.id !== staffId && s.staffId !== staffId));
    return true;
  };

  // If mojito was previously pushed to Dine menuItems, remove it from dine
  useEffect(() => {
    const mojitoInDine = (Array.isArray(menuItems) ? menuItems : []).find(
      (m) => String(m.name || m.dishName || "").trim().toLowerCase() === "mojito" || m.isBarDrink
    );
    if (mojitoInDine?.id && onDeleteMenuItem) {
      onDeleteMenuItem(mojitoInDine.id);
    }
  }, [menuItems, onDeleteMenuItem]);

  const handleAddDrink = async (newDrink) => {
    const item = {
      ...newDrink,
      id: newDrink.id || `DR-${Date.now()}`,
      price: Number(newDrink.price || 0),
      isBarDrink: true,
      isAvailable: newDrink.isAvailable !== false,
    };
    // Optimistic UI update
    setBarDrinks((prev) => [item, ...prev]);
    setToast?.(`Drink "${item.name}" added to Bar Drinks Menu.`);

    // Persist to backend
    try {
      const res = await apiCreateBarDrink(item);
      const created = res?.data?.data || res?.data;
      if (res?.success && created) {
        const realId = created.menuItemId || created.id;
        if (realId) {
          setBarDrinks((prev) =>
            prev.map((d) => (d.id === item.id ? { ...d, ...created, id: realId } : d))
          );
        }
      }
    } catch (apiErr) {
      console.warn("[BarWorkspace] apiCreateBarDrink fallback:", apiErr?.message);
    }
    return true;
  };

  const handleUpdateDrink = async (updatedDrink) => {
    // Optimistic UI update
    setBarDrinks((prev) =>
      prev.map((d) =>
        String(d.id) === String(updatedDrink.id) ? { ...d, ...updatedDrink, isBarDrink: true } : d
      )
    );
    setToast?.(`Drink "${updatedDrink.name}" updated.`);

    // Persist to backend
    try {
      await apiUpdateBarDrink(updatedDrink.id, updatedDrink);
    } catch (apiErr) {
      console.warn("[BarWorkspace] apiUpdateBarDrink fallback:", apiErr?.message);
    }
    return true;
  };

  const handleDeleteDrink = async (drinkId) => {
    // Optimistic UI update
    setBarDrinks((prev) => prev.filter((d) => String(d.id) !== String(drinkId)));
    setToast?.("Drink deleted from Bar Drinks Menu.");

    // Persist to backend
    try {
      await apiDeleteBarDrink(drinkId);
    } catch (apiErr) {
      console.warn("[BarWorkspace] apiDeleteBarDrink fallback:", apiErr?.message);
    }
    return true;
  };

  const handleToggleDrinkAvailability = async (drinkId, newStatus) => {
    // Optimistic UI update
    setBarDrinks((prev) =>
      prev.map((d) => (String(d.id) === String(drinkId) ? { ...d, isAvailable: newStatus } : d))
    );

    if (onSetMenuAvailability) {
      onSetMenuAvailability(drinkId, newStatus);
    }

    setToast?.(`Drink marked ${newStatus ? "Available" : "Unavailable"}.`);

    // Persist to backend
    try {
      await apiToggleBarDrinkAvailability(drinkId, newStatus);
    } catch (apiErr) {
      console.warn("[BarWorkspace] apiToggleBarDrinkAvailability fallback:", apiErr?.message);
    }
    return true;
  };

  const handleToggleDrinkSpecial = async (drinkId, newStatus) => {
    // Optimistic UI update
    setBarDrinks((prev) =>
      prev.map((d) =>
        String(d.id) === String(drinkId)
          ? {
              ...d,
              isSpecial: newStatus,
              isBartenderSpecial: newStatus,
              isChefSpecial: newStatus,
              isChefsSpecial: newStatus,
            }
          : d
      )
    );

    // Persist to backend
    try {
      await apiToggleBarDrinkSpecial(drinkId, newStatus);
    } catch (apiErr) {
      console.warn("[BarWorkspace] apiToggleBarDrinkSpecial fallback:", apiErr?.message);
    }
    return true;
  };

  const drinks = barDrinks;
  const loadOrders = useCallback(async () => {
    setOrdersLoading(true);
    try {
      const response = await apiGetActiveOrders();
      const raw = response?.data;
      const rows = Array.isArray(raw) ? raw : Array.isArray(raw?.orders) ? raw.orders : null;
      if (!response?.success || !rows) throw new Error(response?.error || "Active orders response was invalid.");
      setOrders(rows);
      setOrdersError("");
    } catch (error) {
      setOrdersError(error?.message || "Could not load shared restaurant orders.");
    } finally { setOrdersLoading(false); }
  }, []);
  useEffect(() => {
    loadOrders();
    const timer = window.setInterval(loadOrders, 15000);
    return () => window.clearInterval(timer);
  }, [loadOrders]);
  useEffect(() => { setInventory(Array.isArray(sharedInventory) ? sharedInventory : []); }, [sharedInventory]);
  const loadInventory = useCallback(async () => {
    setInventoryLoading(true);
    try {
      const response = await apiGetInventory();
      const raw = response?.data;
      const rows = Array.isArray(raw) ? raw : Array.isArray(raw?.data) ? raw.data : Array.isArray(raw?.ingredients) ? raw.ingredients : null;
      if (!response?.success || !rows) throw new Error(response?.error || "Inventory response was invalid.");
      setInventory(rows);
      window.dispatchEvent(new CustomEvent("avsr-inventory-updated", { detail: rows }));
      setInventoryError("");
    } catch (error) { setInventoryError(error?.message || "Could not load shared inventory."); }
    finally { setInventoryLoading(false); }
  }, []);
  useEffect(() => { if (route === "bar-inventory") loadInventory(); }, [route, loadInventory]);
  const apiBarOrders = useMemo(() => orders.map((order) => {
    const items = (Array.isArray(order.items) ? order.items : []).filter((item) => {
      const menuItem = findMenuItem(menuLookup, item);
      return isBeverageCategory(menuItem?.category ?? menuItem?.categoryName ?? item.category);
    });
    if (!items.length) return null;
    const amount = items.reduce((sum, item) => sum + Number(item.price ?? item.unitPrice ?? 0) * Number(item.quantity ?? 0), 0);
    return { ...order, id: order.orderId ?? order.id, table: order.tableName || order.tableNumber || (order.tableId ? `Table ${order.tableId}` : "Takeaway"), customer: order.customerName || order.serverName || "—", items: Array.isArray(order.items) ? order.items : [], beverageItems: items, quantity: items.reduce((sum, item) => sum + Number(item.quantity || 0), 0), itemLabel: items.map((item) => `${item.quantity} × ${item.dishName || item.name || "Drink"}`).join(", "), total: Number(order.totalAmount ?? order.total ?? amount), status: order.status || order.orderStatus || "Pending", time: order.createdAt || order.orderTime || "—" };
  }).filter(Boolean), [orders, menuLookup]);
  const barOrders = useMemo(() => {
    return apiBarOrders;
  }, [apiBarOrders]);
  const inventoryRows = useMemo(() => inventory.filter((item) => isBeverageCategory(item.category ?? item.subcategory ?? item.name)), [inventory]);
  const barInvoices = useMemo(() => (Array.isArray(pastOrders) ? pastOrders : []).filter((order) => {
    const allItems = Array.isArray(order.items) ? order.items : [];
    return allItems.some((item) => {
      const name = item.name || item.dishName || item.menuItemName || "";
      const menuItem = findMenuItem(menuLookup, { ...item, menuItemId: item.menuItemId ?? item.menu_item_id ?? item.id }) || menuItems.find((candidate) =>
        String(candidate.name || "").trim().toLowerCase() === String(name).trim().toLowerCase());
      return isBeverageCategory(menuItem?.category ?? menuItem?.categoryName ?? item.category ?? item.categoryName ?? item.subcategory ?? name);
    });
  }), [pastOrders, menuItems, menuLookup]);

  const staffIdOf = (person) => person?.staffId ?? person?.id;
  const staffNameOf = (person) => person?.fullName || person?.name || person?.FullName || "";
  const effectiveStaffList = barStaff.length > 0 ? barStaff : (Array.isArray(dineStaff) ? dineStaff : []);
  const tables = (Array.isArray(dineTables) ? dineTables : []).map((source) => {
    const sourceTableId = source.backendTableId ?? source.tableId ?? source.id;
    const activeOrder = orders.find((order) => String(order.tableId ?? order.TableId) === String(sourceTableId))
      || orders.find((order) => String(order.tableId ?? order.TableId) === String(source.id));
    const serverName = source.server || source.assignedServerName || "";
    const assigned = effectiveStaffList.find((person) => String(staffIdOf(person)) === String(source.assignedServerId ?? source.serverId))
      || effectiveStaffList.find((person) => staffNameOf(person).trim().toLowerCase() === serverName.trim().toLowerCase());
    const rawStatus = String(source.status || "vacant").toLowerCase();
    const status = rawStatus === "reserved" ? "Reserved" : rawStatus === "cleaning" ? "Cleaning" : rawStatus === "inactive" ? "Inactive" : ["occupied", "dining", "billed"].includes(rawStatus) ? "Occupied" : "Available";
    const sourceItems = Array.isArray(source.items) ? source.items.filter((entry) => entry?.status !== "cancelled" && entry?.kotStatus !== "cancelled" && entry?.itemStatus !== "cancelled") : [];
    const orderItems = Array.isArray(activeOrder?.items) ? activeOrder.items : [];
    const items = (sourceItems.length ? sourceItems : orderItems).filter((entry) => entry?.status !== "cancelled" && entry?.kotStatus !== "cancelled" && entry?.itemStatus !== "cancelled");
    const currentOrder = items.map((entry) => {
      const name = entry.name || entry.dishName || entry.menuItemName || "Item";
      const quantity = Number(entry.quantity ?? entry.qty ?? 1) || 1;
      return `${quantity} × ${name}`;
    }).join(", ");
    return {
      ...source,
      id: source.id ?? source.tableId,
      number: source.name || source.tableName || source.tableNumber || `Table ${source.id}`,
      area: source.sectionArea || source.section || source.location || "—",
      capacity: Number(source.capacityChairs ?? source.capacity ?? 0),
      guests: Number(source.guests ?? source.occupiedChairs ?? 0),
      status,
      order: currentOrder || source.order || "—",
      amount: items.length
        ? items.reduce((sum, entry) => sum + Number(entry.price ?? entry.unitPrice ?? 0) * (Number(entry.quantity ?? entry.qty) || 1), 0)
        : Number(source.orderAmount ?? source.amount ?? source.totalAmount ?? activeOrder?.totalAmount ?? activeOrder?.total ?? 0),
      staffId: String(assigned ? staffIdOf(assigned) : source.assignedServerId ?? source.serverId ?? ""),
      _source: source,
    };
  });
  const staff = effectiveStaffList.map((source) => {
    const id = staffIdOf(source);
    const assignedTables = tables.filter((table) => String(table.staffId) === String(id));
    return {
      ...source,
      id,
      name: staffNameOf(source),
      role: source.roleTitle || source.role || "Waiter",
      phone: source.phone || source.contact || "",
      shift: source.shift || "",
      area: [...new Set(assignedTables.map((table) => table.area))].join(", ") || "—",
      tables: assignedTables.map((table) => String(table.id)),
      status: source.status || (source.isActive === true ? "Active" : source.isActive === false ? "Inactive" : "—"),
      _source: source,
    };
  });

  const submitBarOrder = async (event) => {
    event.preventDefault();
    if (orderSubmitting) return;
    const table = tables.find((row) => String(row.id) === String(orderTableId));
    const selectedItem = menuItems.find((row) => String(row.id) === String(orderDrinkId));
    const tableId = Number(table?._source?.backendTableId ?? table?._source?.tableId ?? table?.id);
    const menuItemId = Number(String(selectedItem?.id ?? "").replace(/^m-/, ""));
    if (!table || !selectedItem || !Number.isFinite(tableId) || !Number.isFinite(menuItemId)) {
      setOrderError("Select a valid shared table and menu item with backend IDs.");
      return;
    }
    setOrderSubmitting(true);
    setOrderError("");
    try {
      const notes = [orderServing && `Serving: ${orderServing}`, orderIce && `Ice: ${orderIce}`, orderMixer && `Mixer: ${orderMixer}`, orderNotes.trim()].filter(Boolean).join("; ");
      const itemPayload = [{ menuItemId, id: menuItemId, name: selectedItem.name, price: Number(selectedItem.price) || 0, quantity: Math.max(1, Math.floor(Number(orderQuantity) || 1)), notes }];
      let orderId = pendingBarKot?.orderId;
      let itemToSync = pendingBarKot?.item || itemPayload[0];
      let activeTableId = pendingBarKot?.tableId || tableId;
      if (!pendingBarKot) {
        const existingResponse = await apiGetOrderForTable(tableId);
        const tableMustBeRegisteredByCreate = !existingResponse?.success
          && existingResponse.status === 404
          && /table not found/i.test(existingResponse.error || "");
        if (!existingResponse?.success && !tableMustBeRegisteredByCreate) throw new Error(existingResponse?.error || "The existing shared table order could not be checked safely.");
        const existingData = tableMustBeRegisteredByCreate ? null : existingResponse.data?.data ?? existingResponse.data;
        const existingStatus = String(existingData?.status || "").toLowerCase();
        orderId = ["billed", "settled", "completed"].includes(existingStatus) ? null : Number(existingData?.id ?? existingData?.orderId);
        if (Number.isFinite(orderId)) {
          const added = await apiAddOrderItems(orderId, itemPayload);
          if (!added?.success) throw new Error(added?.error || "The item could not be added to the existing shared order.");
        } else {
          const created = await apiCreateOrder({ tableId, tableName: table.number, tableNumber: table.number, serverName: table.server || "Server", guests: Number(table.guests) || 1, status: "Active", items: itemPayload });
          if (!created?.success) throw new Error(created?.error || "The shared order could not be created.");
          const data = created.data?.data ?? created.data;
          orderId = Number(data?.id ?? data?.orderId);
          if (!Number.isFinite(orderId)) throw new Error("The order API did not return an order ID.");
        }
        setPendingBarKot({ orderId, tableId, item: itemPayload[0] });
      }
      const sent = await apiSendOrderKot(orderId);
      if (!sent?.success) throw new Error(sent?.error || `Order ${orderId} was created but its KOT was not confirmed. Retry from POS before creating another order.`);
      onOrderUpdated?.({ tableId: activeTableId, orderId, item: itemToSync });
      setPendingBarKot(null);
      setOrderComposerOpen(false);
      setOrderTableId(""); setOrderDrinkId(""); setOrderMenuCategory("all"); setOrderQuantity(1); setOrderNotes(""); setOrderServing(""); setOrderIce(""); setOrderMixer("");
      setToast(`Item added to shared order ${orderId}; KOT dispatch confirmed.`);
      await loadOrders();
    } catch (error) { setOrderError(error?.message || "Could not submit the Bar order."); }
    finally { setOrderSubmitting(false); }
  };

  useEffect(() => {
    if (!toast) return undefined;
    const timeout = window.setTimeout(() => setToast(""), 3200);
    return () => window.clearTimeout(timeout);
  }, [toast]);
  useEffect(() => { setQuery(""); setFilter("all"); setExtraFilter("all"); setCapacityFilter("all"); setAssignmentFilter("all"); setStockFilter("all"); setMinPrice(""); setMaxPrice(""); setPaymentFilter("all"); setPage(1); }, [activeTab]);

  const go = (next) => { onNavigate?.(next); setQuery(""); setFilter("all"); setPage(1); };
  const openForm = (kind, item = null) => setModal({ kind, item });
  const toDineStatus = (status, originalStatus) => {
    if (status === "Available") return "vacant";
    if (status === "Reserved") return "reserved";
    if (status === "Cleaning") return "cleaning";
    if (status === "Inactive") return "inactive";
    return ["dining", "billed"].includes(String(originalStatus).toLowerCase()) ? originalStatus : "occupied";
  };
  const saveSharedTable = async (values, item = null) => {
    const original = item?._source;
    const number = String(values.number || "").trim();
    const numberUnchanged = Boolean(item && number === String(item.number));
    const persistedNumber = numberUnchanged ? original?.tableNumber || original?.tableName || original?.name || number : number;
    const displayName = numberUnchanged ? original?.name || item.number : number;
    const staffPerson = staff.find((person) => String(person.id) === String(values.staffId));
    if (!number) { setToast("Table number is required."); return false; }
    const numericLabel = number.match(/\d+/)?.[0];
    const duplicate = tables.find((table) => table.id !== item?.id && (table.number.trim().toLowerCase() === number.toLowerCase() || (!item && numericLabel && table.number.match(/\d+/)?.[0] === numericLabel)));
    if (duplicate) { setToast(`Table ${number} already exists in the shared hotel table list.`); return false; }
    const common = {
      ...(original || {}),
      name: displayName,
      tableName: persistedNumber,
      tableNumber: persistedNumber,
      section: values.area || original?.section || "Main Hall",
      sectionArea: values.area || original?.sectionArea || original?.section || "Main Hall",
      capacity: Number(values.capacity ?? original?.capacity ?? 0),
      capacityChairs: Number(values.capacity ?? original?.capacityChairs ?? original?.capacity ?? 0),
      guests: Number(values.guests ?? original?.guests ?? original?.occupiedChairs ?? 0),
      occupiedChairs: Number(values.guests ?? original?.occupiedChairs ?? original?.guests ?? 0),
      status: toDineStatus(values.status || item?.status || "Available", original?.status),
      server: staffPerson ? staffNameOf(staffPerson) : (values.staffId ? original?.server || original?.assignedServerName || "" : ""),
      assignedServerName: staffPerson ? staffNameOf(staffPerson) : (values.staffId ? original?.assignedServerName || original?.server || "" : ""),
      assignedServerId: staffPerson ? staffIdOf(staffPerson) : (values.staffId ? original?.assignedServerId ?? original?.serverId ?? null : null),
    };
    try {
      const result = item
        ? await onUpdateTable?.({ ...common, id: original?.id ?? item.id, backendTableId: original?.backendTableId })
        : await onAddTable?.({ ...common, id: Math.max(0, ...tables.map((table) => Number(table.id) || 0)) + 1, items: [], status: "vacant", guests: 0, occupiedChairs: 0 });
      if (result === false || result?.success === false) {
        setToast(result?.error || "The shared table record could not be saved.");
        return false;
      }
      return true;
    } catch (error) {
      setToast(error?.message || "The shared table record could not be saved.");
      return false;
    }
  };
  const syncStaffAssignments = async (personOrId, selectedTableIds) => {
    const personId = typeof personOrId === "object" ? staffIdOf(personOrId) : personOrId;
    const assignedPerson = typeof personOrId === "object" ? personOrId : staff.find((person) => String(person.id) === String(personId));
    const selected = new Set(selectedTableIds.map(String));
    for (const table of tables) {
      const shouldAssign = selected.has(String(table.id));
      if ((shouldAssign && String(table.staffId) === String(personId)) || (!shouldAssign && String(table.staffId) !== String(personId))) continue;
      const currentStaff = shouldAssign ? assignedPerson : null;
      const original = table._source;
      const result = await onUpdateTable?.({
        ...original,
        id: original?.id ?? table.id,
        backendTableId: original?.backendTableId,
        server: currentStaff ? staffNameOf(currentStaff) : "",
        assignedServerName: currentStaff ? staffNameOf(currentStaff) : "",
        assignedServerId: currentStaff ? staffIdOf(currentStaff) : null,
      });
      if (result === false || result?.success === false) return false;
    }
    return true;
  };
  const saveSharedStaff = async (values, item = null) => {
    const payload = {
      ...(item?._source || {}),
      name: String(values.name || "").trim(),
      role: values.role || "Waiter",
      phone: values.phone || "",
      shift: values.shift || "",
    };
    if (!payload.name) { setToast("Staff name is required."); return false; }
    const normalizedName = payload.name.trim().toLowerCase();
    const normalizedPhone = String(payload.phone || "").replace(/\D/g, "");
    const duplicate = !item && staff.some((person) => person.name.trim().toLowerCase() === normalizedName && (!normalizedPhone || !String(person.phone || "").replace(/\D/g, "") || String(person.phone || "").replace(/\D/g, "") === normalizedPhone));
    if (duplicate) { setToast("This staff member already exists in the shared hotel staff list."); return false; }
    try {
      const result = item ? await onUpdateStaff?.({ ...payload, id: item.id }) : await onAddStaff?.(payload);
      if (result === false || result?.success === false) {
        setToast(result?.error || "The shared staff record could not be saved.");
        return false;
      }
      const savedPerson = result && typeof result === "object" ? result : (item?._source || staff.find((person) => String(person.id) === String(item?.id)));
      const personId = staffIdOf(savedPerson);
      if (personId == null) {
        setToast("The staff record was saved, but no backend staff ID is available for table assignment.");
        return false;
      }
      const assignmentsSaved = await syncStaffAssignments(savedPerson, Array.isArray(values.tables) ? values.tables : []);
      if (!assignmentsSaved) setToast("Staff details were saved, but one or more table assignment changes were not applied.");
      return assignmentsSaved;
    } catch (error) {
      setToast(error?.message || "The shared staff record could not be saved.");
      return false;
    }
  };
  const saveEntity = async (values) => {
    const { kind, item } = modal;
    const id = item?.id || makeId(kind === "drink" ? "DR" : kind === "table" ? "BT" : kind === "staff" ? "BS" : "BO", kind === "drink" ? drinks : kind === "table" ? tables : kind === "staff" ? staff : orders);
    const saved = { ...item, ...values, id };
    if (kind === "drink") {
      saved.price = Number(saved.price || 0);
      saved.isAvailable = saved.isAvailable === true || saved.isAvailable === "Available";
    }
    if (kind === "order" && saved.subtotal !== undefined) saved.subtotal = Number(saved.subtotal);
    if (kind === "drink") {
      const payload = {
        ...item,
        ...values,
        id: item?.id,
        name: String(values.name || "").trim(),
        category: values.category || "Cocktails",
        price: Number(values.price),
        isAvailable: values.isAvailable === true || values.isAvailable === "Available",
        drinkType: values.drinkType || (values.abv ? "Alcoholic" : "Non-Alcoholic"),
        measure: values.measure || "",
        abv: values.abv !== undefined && values.abv !== "" ? Number(values.abv) : undefined,
        isBeverage: true,
        isBarDrink: true,
      };
      const result = item ? await onUpdateMenuItem?.(payload) : await onAddMenuItem?.(payload);
      if (result === false || result?.success === false) { setToast(result?.error || "The shared menu item could not be be saved."); return false; }
    }
    if (kind === "table" && !(await saveSharedTable(values, item))) return false;
    if (kind === "staff" && !(await saveSharedStaff(values, item))) return false;
    if (kind === "order") setOrders((rows) => [{ ...saved, time: "Just now", discount: 0, gst: Number(saved.subtotal) * 0.05, service: Number(saved.subtotal) * 0.05, total: Number(saved.subtotal) * 1.1, payment: "Pending", status: "Pending" }, ...rows]);
    setPage(1);
    if (kind === "drink") setToast(`${saved.name} ${item ? "updated" : "added"} in the shared menu.`);
    setModal(null);
    return true;
  };
  const deleteItem = async (kind, item) => {
    if (!window.confirm(`Delete ${item.name || item.number || item.id} from the shared hotel records?`)) return;
    if (kind === "table") {
      const result = await onDeleteTable?.(item._source?.id ?? item.id);
      if (result === false || result?.success === false) { setToast(result?.error || "The shared table could not be deleted."); return; }
      setAssignmentFilter((current) => current === item.id ? "all" : current);
    } else if (kind === "staff") {
      if (!(await syncStaffAssignments(item._source || item, []))) { setToast("Could not clear this staff member's table assignments."); return; }
      const result = await onDeleteStaff?.(item._source?.id ?? item.id);
      if (result === false || result?.success === false) { setToast(result?.error || "The shared staff record could not be deleted."); return; }
    } else if (kind === "drink") {
      const result = await onDeleteMenuItem?.(item.id);
      if (result === false || result?.success === false) { setToast(result?.error || "The shared menu item could not be deleted."); return; }
    }
    setPage(1);
    if (kind === "drink") setToast("Menu item deleted.");
  };
  const patchOrder = (id, patch) => { setOrders((rows) => rows.map((order) => order.id === id ? { ...order, ...patch } : order)); setPage(1); };

  const completedDrinkSales = (Array.isArray(pastOrders) ? pastOrders : []).reduce((sum, order) => {
    const items = (Array.isArray(order.items) ? order.items : []).filter((item) => {
      const menuItem = findMenuItem(menuLookup, item);
      return isBeverageCategory(menuItem?.category ?? menuItem?.categoryName ?? item.category);
    });
    return sum + items.reduce((itemSum, item) => itemSum + Number(item.price ?? item.unitPrice ?? 0) * Number(item.quantity ?? 0), 0);
  }, 0);
  const pendingBarKotCount = useMemo(() => {
    return barOrders.filter((order) => !["Served", "Cancelled"].includes(String(order.status))).length;
  }, [barOrders]);

  const activePreparingCount = useMemo(() => {
    return barOrders.filter((order) => String(order.status).toLowerCase().includes("prepar")).length;
  }, [barOrders]);

  const occupiedBarTables = useMemo(() => {
    return tables.filter((t) => t.status === "Occupied" || (t.status !== "Available" && t.status !== "vacant"));
  }, [tables]);

  const totalChairs = useMemo(() => {
    return tables.reduce((sum, t) => sum + (Number(t.capacity) || 0), 0);
  }, [tables]);

  const occupiedChairs = useMemo(() => {
    return occupiedBarTables.reduce((sum, t) => sum + (Number(t.guests) || 2), 0);
  }, [occupiedBarTables]);

  const displayBarTables = useMemo(() => {
    return tables
      .slice()
      .sort((a, b) => {
        const aOcc = a.status === "Occupied" ? 1 : 0;
        const bOcc = b.status === "Occupied" ? 1 : 0;
        if (bOcc !== aOcc) return bOcc - aOcc;
        return Number(a.id || 0) - Number(b.id || 0);
      })
      .slice(0, 10);
  }, [tables]);

  const overviewTables = useMemo(() => {
    if (Array.isArray(overviewData?.counterTables) && overviewData.counterTables.length > 0) {
      return overviewData.counterTables.map((t) => ({
        id: t.tableId || t.id,
        number: t.tableName || t.tableNumber || `Table ${t.tableId || t.id}`,
        area: t.sectionArea || t.area || "Main Hall",
        status: t.status || "Available",
        guests: t.currentGuests || t.occupiedChairs || t.guests || 0,
        server: t.assignedServer || "Unassigned",
      }));
    }
    return displayBarTables;
  }, [overviewData, displayBarTables]);

  const overviewSignatureDrinks = useMemo(() => {
    if (Array.isArray(overviewData?.signatureDrinks) && overviewData.signatureDrinks.length > 0) {
      return overviewData.signatureDrinks.map((d) => ({
        ...d,
        id: d.menuItemId || d.id,
        name: d.drinkName || d.name || d.dishName || "",
        category: d.category || "Cocktail",
        price: Number(d.price ?? d.sellingPrice ?? 0),
        prepTime: d.prepTime || `${d.prepTimeMinutes || 15} min`,
        image: d.imageUrl || d.image || "",
      }));
    }
    return drinks.slice(0, 5);
  }, [overviewData, drinks]);

  const overviewRecentOrders = useMemo(() => {
    if (Array.isArray(overviewData?.recentOrders) && overviewData.recentOrders.length > 0) {
      return overviewData.recentOrders.map((o) => ({
        ...o,
        id: o.orderNumber || (o.orderId ? `ORD-${o.orderId}` : String(o.id || "")),
        orderId: o.orderId || o.id,
        table: o.table || o.tableName || (o.tableId ? `Table ${o.tableId}` : "Bar Counter"),
        itemLabel: o.drinkItems || o.itemLabel || "Beverages & Cocktails",
        quantity: o.quantity || 1,
        total: Number(o.amount ?? o.total ?? 0),
        time: o.time || "—",
        status: o.status || "Pending",
        items: o.items || [],
      }));
    }
    return barOrders.slice(0, 5);
  }, [overviewData, barOrders]);

  const lowStockBeverages = useMemo(() => {
    return inventoryRows.filter((item) => {
      const stock = Number(item.stock ?? item.currentStock ?? 0);
      const threshold = Number(item.minThreshold ?? item.minimumThreshold ?? 5);
      return stock <= threshold;
    });
  }, [inventoryRows]);

  const alcoholicDrinksCount = useMemo(() => {
    return drinks.filter((d) => d.drinkType === "Alcoholic" || ["cocktails", "beers", "whiskey", "vodka & gin", "rum & brandy", "wine & champagne", "shots & shooters"].some((c) => c === String(d.category || "").toLowerCase())).length;
  }, [drinks]);

  const nonAlcoholicDrinksCount = useMemo(() => {
    return drinks.length - alcoholicDrinksCount;
  }, [drinks.length, alcoholicDrinksCount]);

  const activeQueueItems = useMemo(() => {
    const queue = [];
    for (const order of barOrders) {
      if (["served", "cancelled"].includes(String(order.status).toLowerCase())) continue;
      // Strictly beverage items only - NEVER food!
      const rawItems = Array.isArray(order.beverageItems) && order.beverageItems.length > 0
        ? order.beverageItems
        : Array.isArray(order.items) ? order.items : [];
      const drinkItems = rawItems.filter((it) => {
        const menuItem = findMenuItem(menuLookup, it);
        const cat = menuItem?.category ?? menuItem?.categoryName ?? it.category ?? it.subcategory ?? "";
        return isBeverageCategory(cat) || isBeverageCategory(it.name ?? it.dishName ?? "");
      });

      for (const it of drinkItems) {
        queue.push({
          id: order.id + "-" + (it.id || it.name),
          name: it.dishName || it.name || "Drink",
          table: order.table || "Bar Tab",
          category: it.category || "Beverage",
          price: Number(it.unitPrice ?? it.price ?? 0),
          time: order.time || "Just now",
          status: order.status || "Preparing",
          quantity: Number(it.quantity ?? 1),
        });
      }
    }
    return queue.slice(0, 6);
  }, [barOrders, drinks, menuLookup]);

  const dashboard = [
    ["Total Drinks", drinks.length, Martini, "orange"],
    ["Active Bar Orders", barOrders.filter((order) => !["Served", "Cancelled"].includes(String(order.status))).length, FileText, "blue"],
    ["Pending Orders", barOrders.filter((order) => String(order.status).toLowerCase().includes("pending")).length, Clock3, "amber"],
    ["Preparing Drinks", barOrders.filter((order) => String(order.status).toLowerCase().includes("prepar")).length, GlassWater, "purple"],
    ["Ready to Serve", barOrders.filter((order) => String(order.status).toLowerCase().includes("ready")).length, Check, "green"],
    ["Completed Drink Sales", formatCurrency(completedDrinkSales), Wine, "orange"],
  ];

  const listConfig = {
    "bar-drinks": { title: "Drinks Menu", description: "Beverage items from the shared restaurant menu.", rows: drinks, kind: "drink", columns: ["Drink Name", "Category", "Serving / Measure", "Price", "Availability", "Actions"] },
    "bar-tables": { title: "Bar Tables", description: "The shared hotel table records and complete food-and-drink orders.", rows: tables, kind: "table", columns: ["Table #", "Area", "Chairs / Capacity", "Assigned Server", "Status", "Guests", "Current Order", "Order Amount", "Actions"] },
    "bar-staff": { title: "Bar Staff & Persons", description: "Shared hotel staff records • changes appear in Dine mode too.", rows: staff, kind: "staff", columns: ["Staff ID", "Full Name", "Job Title", "Phone / Contact", "Shift", "Bar Area", "Assigned Tables", "Status", "Actions"] },
  }[route];

  const filterChoices = route === "bar-drinks" ? ["all", ...new Set([...BAR_CATEGORIES, ...drinks.map((drink) => drink.category).filter(Boolean)])] : route === "bar-tables" ? ["all", ...new Set(tables.map((table) => table.area))] : route === "bar-staff" ? ["all", ...new Set([...BAR_ROLES, ...staff.map((person) => person.role)])] : ["all"];
  const listRows = (() => {
    if (!listConfig) return [];
    return listConfig.rows.filter((row) => {
      const matchesQuery = !query.trim() || JSON.stringify(row).toLowerCase().includes(query.trim().toLowerCase());
      const matchesFilter = route === "bar-drinks" ? (filter === "all" || String(row.category || "").toLowerCase() === filter.toLowerCase()) && (minPrice === "" || Number(row.price) >= Number(minPrice)) && (maxPrice === "" || Number(row.price) <= Number(maxPrice))
        : route === "bar-tables" ? (filter === "all" || row.area === filter) && (extraFilter === "all" || row.status === extraFilter) && (capacityFilter === "all" || Number(row.capacity) >= Number(capacityFilter))
        : route === "bar-staff" ? (filter === "all" || row.role === filter) && (extraFilter === "all" || row.shift === extraFilter) && (assignmentFilter === "all" || (Array.isArray(row.tables) && row.tables.includes(assignmentFilter)))
        : true;
      const matchesExtra = route === "bar-drinks" ? extraFilter === "all" || (extraFilter === "available" ? row.isAvailable !== false && row.isAvailable !== "Unavailable" : row.isAvailable === false || row.isAvailable === "Unavailable") : true;
      return matchesQuery && matchesFilter && matchesExtra;
    });
  })();
  const pageCount = Math.max(1, Math.ceil(listRows.length / PAGE_SIZE));
  const visibleRows = listRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const sharedListKey = route === "bar-tables" ? "tables" : route === "bar-staff" ? "staff" : null;
  const sharedListStatus = sharedListKey
    ? [sharedRecordLoad?.tables, sharedRecordLoad?.staff].includes("error")
      ? "error"
      : [sharedRecordLoad?.tables, sharedRecordLoad?.staff].includes("loading")
        ? "loading"
        : "ready"
    : "ready";
  const sharedListError = [sharedRecordLoad?.tableError, sharedRecordLoad?.staffError].filter(Boolean).join(" ");
  const filteredOrders = barOrders.filter((order) => (!query || JSON.stringify(order).toLowerCase().includes(query.toLowerCase())) && (filter === "all" || String(order.status).toLowerCase() === filter.toLowerCase()) && (paymentFilter === "all" || order.payment === paymentFilter));
  const visibleOrders = filteredOrders.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const primaryActions = (kind, row) => <div className="bar-actions"><button className="bar-icon-button" title="View" aria-label="View details" onClick={() => setDetails(row)}><Eye size={15} /></button><button className="bar-icon-button" title="Edit" aria-label="Edit" onClick={() => openForm(kind, row)}><Pencil size={15} /></button>{kind === "table" && <button className="bar-button secondary small" title="Change occupancy status" onClick={() => saveSharedTable({ ...row, status: ({ Available: "Occupied", Occupied: "Reserved", Reserved: "Available" })[row.status] || "Available" }, row)}>Status</button>}{kind === "drink" && <button type="button" className={`bar-button small ${row.isAvailable !== false && row.isAvailable !== "Unavailable" ? "warning" : "success"}`} title={row.isAvailable !== false && row.isAvailable !== "Unavailable" ? "Click to Disable drink" : "Click to Enable drink"} aria-label={row.isAvailable !== false && row.isAvailable !== "Unavailable" ? `Disable ${row.name}` : `Enable ${row.name}`} onClick={() => onSetMenuAvailability?.(row.id, row.isAvailable === false || row.isAvailable === "Unavailable")}>{row.isAvailable !== false && row.isAvailable !== "Unavailable" ? "Disable" : "Enable"}</button>}<button className="bar-icon-button danger" title="Delete" aria-label="Delete" onClick={() => deleteItem(kind, row)}><Trash2 size={15} /></button></div>;

  const renderListCell = (column, row, kind) => {
    if (column === "Actions") return primaryActions(kind, row);
    if (column === "Current Order" && kind === "table") {
      const sourceItems = Array.isArray(row.items) ? row.items : [];
      return <button className="bar-button secondary small" type="button" onClick={() => {
      const items = sourceItems.map((item) => {
        const menuItem = findMenuItem(menuLookup, item);
        const category = menuItem?.category ?? menuItem?.categoryName ?? item.category ?? item.subcategory;
        return { ...item, categoryLabel: isBeverageCategory(category) ? "Beverage" : "Food" };
      });
      setTableItems({ id: row.orderId ?? row.activeOrderId ?? `Table ${row.number}`, table: row.number, time: row.orderTime ?? row.createdAt ?? "—", status: row.status, items });
      }}>View Items ({sourceItems.length})</button>;
    }
    if (column === "Drink Name") return <><strong>{row.name}</strong>{row.description && <small>{row.description}</small>}</>;
    if (column === "Price" || column === "Order Amount") return formatCurrency(row.price ?? row.amount ?? 0);
    if (column === "Stock") return <span className={`bar-stock-chip ${Number(row.currentStock) <= Number(row.minimumStock) ? "low" : ""}`}>{row.currentStock} {Number(row.currentStock) <= Number(row.minimumStock) ? "• Low" : ""}</span>;
    if (column === "Availability") return <Status>{row.isAvailable === false || row.isAvailable === "Unavailable" ? "Unavailable" : "Available"}</Status>;
    if (column === "Status") return <Status>{row.status}</Status>;
    const map = {
      "Table": "number", "Table #": "number", "Area / Section": "area", "Area": "area", "Capacity": "capacity", "Chairs / Capacity": "capacity", "Guests": "guests", "Current Order": "order",
      "Staff ID": "id", "Full Name": "name", "Job Title": "role", "Phone / Contact": "phone", "Shift": "shift", "Bar Area": "area", "Assigned Tables": "tables",
      "Category": "category", SKU: "sku", Brand: "brand", Unit: "unit",
    };
    if (column === "Assigned Server" || column === "Assigned Staff") return staff.find((member) => String(member.id) === String(row.staffId))?.name || row.server || "Unassigned";
    if (column === "Assigned Tables") return (Array.isArray(row.tables) ? row.tables : []).map((tableId) => tables.find((table) => String(table.id) === String(tableId))?.number).filter(Boolean).join(", ") || "—";
    return row[map[column] || column.toLowerCase()] ?? "—";
  };

  const renderStaticTable = (columns, rows, cell, className = "") => <div className={`bar-table-wrap ${className}-wrap`}><table className={`bar-table ${className}`}><thead><tr>{columns.map((column) => <th key={column}>{column}</th>)}</tr></thead><tbody>{rows.map((row) => <tr key={row.id}>{columns.map((column) => <td key={column}>{cell(column, row)}</td>)}</tr>)}</tbody></table>{rows.length === 0 && <div className="bar-empty">No results found. Adjust your search or filters.</div>}</div>;

  const listPage = listConfig && <section className="bar-page-card">
    <div className="bar-section-head"><div><h2>{listConfig.title}</h2><p>{listConfig.description}</p></div><button className="bar-button primary" disabled={sharedListKey && sharedListStatus !== "ready"} onClick={() => openForm(listConfig.kind)}><Plus size={16} /> Add {listConfig.kind === "drink" ? "Drink" : listConfig.kind === "table" ? "Table" : "Staff"}</button></div>
    <div className="bar-list-tools"><label className="bar-search"><Search size={16} /><input value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder={`Search ${listConfig.title.toLowerCase()}...`} /></label><label className="bar-select-label"><span>{route === "bar-staff" ? "Role" : route === "bar-tables" ? "Area" : "Category"}</span><select value={filter} onChange={(event) => { setFilter(event.target.value); setPage(1); }}><option value="all">All {route === "bar-staff" ? "Roles" : route === "bar-tables" ? "Areas" : "Categories"}</option>{filterChoices.slice(1).map((choice) => <option key={choice}>{choice}</option>)}</select></label>
      {route === "bar-drinks" && (
        <>
          <label className="bar-select-label">
            <span>Availability</span>
            <select value={extraFilter} onChange={(event) => { setExtraFilter(event.target.value); setPage(1); }}>
              <option value="all">All</option>
              <option value="available">Available</option>
              <option value="unavailable">Unavailable</option>
            </select>
          </label>
          <label className="bar-select-label">
            <span>Price Range</span>
            <select
              value={pricePreset}
              onChange={(e) => {
                const val = e.target.value;
                setPricePreset(val);
                if (val === "all") {
                  setMinPrice("");
                  setMaxPrice("");
                } else if (val === "under-150") {
                  setMinPrice("");
                  setMaxPrice("150");
                } else if (val === "150-300") {
                  setMinPrice("150");
                  setMaxPrice("300");
                } else if (val === "300-500") {
                  setMinPrice("300");
                  setMaxPrice("500");
                } else if (val === "above-500") {
                  setMinPrice("500");
                  setMaxPrice("");
                }
                setPage(1);
              }}
            >
              <option value="all">All Prices</option>
              <option value="under-150">Under ₹150</option>
              <option value="150-300">₹150 – ₹300</option>
              <option value="300-500">₹300 – ₹500</option>
              <option value="above-500">Above ₹500</option>
              </select>
          </label>
        </>
      )}
      {route === "bar-tables" && <><label className="bar-select-label"><span>Occupancy</span><select value={extraFilter} onChange={(event) => { setExtraFilter(event.target.value); setPage(1); }}><option value="all">Any status</option>{[...new Set(tables.map((table) => table.status))].map((status) => <option key={status}>{status}</option>)}</select></label><label className="bar-select-label"><span>Minimum Capacity</span><select value={capacityFilter} onChange={(event) => { setCapacityFilter(event.target.value); setPage(1); }}><option value="all">Any capacity</option>{[2, 4, 6].map((size) => <option key={size} value={size}>{size}+ guests</option>)}</select></label></>}
      {route === "bar-staff" && <label className="bar-select-label"><span>Shift</span><select value={extraFilter} onChange={(event) => { setExtraFilter(event.target.value); setPage(1); }}><option value="all">All shifts</option>{BAR_SHIFTS.map((shift) => <option key={shift}>{shift}</option>)}</select></label>}
      {route === "bar-staff" && <label className="bar-select-label"><span>Table Assignment</span><select value={assignmentFilter} onChange={(event) => { setAssignmentFilter(event.target.value); setPage(1); }}><option value="all">All assignments</option>{tables.map((table) => <option key={table.id} value={table.id}>{table.number}</option>)}</select></label>}
    </div>
    {sharedListStatus === "loading" ? <SkeletonTable rows={6} columns={listConfig.columns.length} /> : sharedListStatus === "error" ? <div className="bar-error" role="alert">{sharedListError || `Could not load shared hotel ${sharedListKey}. The Bar page is not showing demo records.`}</div> : <>{renderStaticTable(listConfig.columns, visibleRows, (column, row) => renderListCell(column, row, listConfig.kind), `bar-${listConfig.kind}-table`)}
    <footer className="bar-pagination"><span>Showing {listRows.length ? (page - 1) * PAGE_SIZE + 1 : 0}–{Math.min(page * PAGE_SIZE, listRows.length)} of {listRows.length}</span><div><button disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))} aria-label="Previous page"><ChevronLeft size={16} /></button><span>Page {page} of {pageCount}</span><button disabled={page >= pageCount} onClick={() => setPage((value) => Math.min(pageCount, value + 1))} aria-label="Next page"><ChevronRight size={16} /></button></div></footer>
    </>}
  </section>;

  const reportData = [["Active Beverage Orders", String(barOrders.length), "Shared active orders API"], ["Menu Beverage Items", String(drinks.length), "Shared menu API"], ["Beverage Inventory Records", String(inventoryRows.length), "Shared inventory API"], ["Completed Drink Sales", formatCurrency(completedDrinkSales), "Calculated from loaded shared order items"]].filter((row) => reportCategory === "All Categories" || row.join(" ").toLowerCase().includes(reportCategory.toLowerCase()));

  return (
    <main className="bar-workspace">
      {route === "bar-overview" && (
        /* 1. Unified Header Banner Card (Matching Dine Dashboard) */
        <div
          style={{
            background: "linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, rgba(234, 88, 12, 0.08) 100%)",
            border: "1px solid rgba(245, 158, 11, 0.25)",
            borderRadius: "12px",
            padding: "0.85rem 1.15rem",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "0.75rem",
            marginBottom: "0.25rem",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
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
              <Martini size={20} color="#ffffff" />
            </div>
            <div>
              <h2
                style={{
                  fontSize: "1.15rem",
                  fontWeight: 800,
                  color: "var(--text-main)",
                  margin: 0,
                }}
              >
                Bar Operations Dashboard
              </h2>
              <div style={{ fontSize: "0.74rem", color: "var(--text-muted)", marginTop: "2px" }}>
                Live overview of drinks, bar counter tabs, BOT tickets, and beverage sales
              </div>
            </div>
          </div>

          {/* Quick Action Navigation Buttons - Single Clean Row */}
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
            <button
              type="button"
              onClick={() => { go("bar-drinks"); openForm("drink"); }}
              style={{
                background: "linear-gradient(135deg, #f59e0b, #ea580c)",
                color: "#ffffff",
                border: "none",
                borderRadius: "8px",
                padding: "0.42rem 0.85rem",
                fontSize: "0.76rem",
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                gap: "0.35rem",
                cursor: "pointer",
                boxShadow: "0 2px 8px rgba(245, 158, 11, 0.3)",
                height: "32px",
              }}
            >
              <Plus size={14} />
              <span>Add Drink</span>
            </button>

            <button
              type="button"
              onClick={() => go("bar-tables")}
              style={{
                background: "var(--bg-card)",
                border: "1px solid var(--border-card)",
                color: "var(--text-main)",
                borderRadius: "8px",
                padding: "0.42rem 0.85rem",
                fontSize: "0.76rem",
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                gap: "0.35rem",
                cursor: "pointer",
                height: "32px",
                boxShadow: "var(--shadow-sm)",
              }}
            >
              <Armchair size={14} color="var(--accent-amber)" />
              <span>Bar Tables</span>
            </button>

            <button
              type="button"
              onClick={() => go("bar-kot")}
              style={{
                background: pendingBarKotCount > 0 ? "rgba(239, 68, 68, 0.15)" : "var(--bg-card)",
                border: pendingBarKotCount > 0 ? "1px solid rgba(239, 68, 68, 0.4)" : "1px solid var(--border-card)",
                color: pendingBarKotCount > 0 ? "var(--danger)" : "var(--text-main)",
                borderRadius: "8px",
                padding: "0.42rem 0.85rem",
                fontSize: "0.76rem",
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                gap: "0.35rem",
                cursor: "pointer",
                height: "32px",
              }}
            >
              <Clock3 size={14} color={pendingBarKotCount > 0 ? "#ef4444" : "var(--text-main)"} />
              <span>Live BOT ({pendingBarKotCount})</span>
            </button>

            <button
              type="button"
              onClick={() => { go("bar-orders"); setOrderComposerOpen(true); }}
              style={{
                background: "var(--bg-card)",
                border: "1px solid var(--border-card)",
                color: "var(--text-main)",
                borderRadius: "8px",
                padding: "0.42rem 0.85rem",
                fontSize: "0.76rem",
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                gap: "0.35rem",
                cursor: "pointer",
                height: "32px",
                boxShadow: "var(--shadow-sm)",
              }}
            >
              <FileText size={14} color="#3b82f6" />
              <span>New Order</span>
            </button>

            <button
              type="button"
              onClick={() => go("bar-invoices")}
              style={{
                background: "var(--bg-card)",
                border: "1px solid var(--border-card)",
                color: "var(--text-main)",
                borderRadius: "8px",
                padding: "0.42rem 0.85rem",
                fontSize: "0.76rem",
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                gap: "0.35rem",
                cursor: "pointer",
                height: "32px",
                boxShadow: "var(--shadow-sm)",
              }}
            >
              <Receipt size={14} color="#10b981" />
              <span>Invoices</span>
            </button>

            <button
              type="button"
              onClick={() => loadBarOverview()}
              disabled={overviewLoading}
              style={{
                background: "var(--bg-card)",
                border: "1px solid rgba(245, 158, 11, 0.35)",
                color: "var(--text-main)",
                borderRadius: "8px",
                padding: "0.42rem 0.85rem",
                fontSize: "0.76rem",
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                gap: "0.35rem",
                cursor: "pointer",
                height: "32px",
                boxShadow: "var(--shadow-sm)",
              }}
              title="Refresh live bar overview"
            >
              <RefreshCw size={13} color="var(--accent-amber)" className={overviewLoading ? "spin" : ""} />
              <span>{overviewLoading ? "Refreshing..." : "Refresh"}</span>
            </button>
          </div>
        </div>
      )}

      {route === "bar-overview" && <>
        {/* 2. Five Operational Metric Cards - Exactly 1 Sleek Row (Matching Dine) */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
            gap: "0.55rem",
            width: "100%",
          }}
        >
          {/* Card 1: Today's Bar Sales */}
          <div
            onClick={() => go("bar-reports")}
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border-card)",
              borderRadius: "10px",
              padding: "0.65rem 0.75rem",
              cursor: "pointer",
              transition: "all 0.15s ease",
              minWidth: 0,
              overflow: "hidden",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "var(--accent-amber)";
              e.currentTarget.style.transform = "translateY(-2px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--border-card)";
              e.currentTarget.style.transform = "translateY(0)";
            }}
            title="Click to view Bar sales & revenue reports"
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.35rem" }}>
              <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                Bar Sales Today
              </span>
              <div style={{ width: "24px", height: "24px", borderRadius: "6px", background: "rgba(245, 158, 11, 0.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <IndianRupee size={12} color="#f59e0b" />
              </div>
            </div>
            <div style={{ fontSize: "1.15rem", fontWeight: 800, color: "var(--accent-amber)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {formatCurrency(overviewData?.completedDrinkSales ?? completedDrinkSales)}
            </div>
            <div style={{ fontSize: "0.66rem", color: "var(--text-muted)", marginTop: "2px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              <span>{(overviewData?.activeBarOrders ?? barOrders.length)} Orders</span>
              <span style={{ margin: "0 3px" }}>•</span>
              <span style={{ color: "var(--success)" }}>Active</span>
            </div>
          </div>

          {/* Card 2: Bar BOT Live */}
          <div
            onClick={() => go("bar-kot")}
            style={{
              background: "var(--bg-card)",
              border: pendingBarKotCount > 0 ? "1px solid rgba(239, 68, 68, 0.4)" : "1px solid var(--border-card)",
              borderRadius: "10px",
              padding: "0.65rem 0.75rem",
              cursor: "pointer",
              transition: "all 0.15s ease",
              minWidth: 0,
              overflow: "hidden",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "var(--danger)";
              e.currentTarget.style.transform = "translateY(-2px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = pendingBarKotCount > 0 ? "rgba(239, 68, 68, 0.4)" : "var(--border-card)";
              e.currentTarget.style.transform = "translateY(0)";
            }}
            title="Click to view Live Bar BOT screen"
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.35rem" }}>
              <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                Bar BOT Live
              </span>
              <div style={{ width: "24px", height: "24px", borderRadius: "6px", background: pendingBarKotCount > 0 ? "rgba(239, 68, 68, 0.15)" : "rgba(100, 116, 139, 0.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Clock3 size={12} color={pendingBarKotCount > 0 ? "#ef4444" : "var(--text-dim)"} />
              </div>
            </div>
            <div style={{ fontSize: "1.15rem", fontWeight: 800, color: (overviewData?.pendingOrders ?? overviewData?.pendingBarKotCount ?? pendingBarKotCount) > 0 ? "var(--danger)" : "var(--text-main)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {(overviewData?.pendingOrders ?? overviewData?.pendingBarKotCount ?? pendingBarKotCount)} Active BOT
            </div>
            <div style={{ fontSize: "0.66rem", color: (overviewData?.pendingOrders ?? overviewData?.pendingBarKotCount ?? pendingBarKotCount) > 0 ? "var(--danger)" : "var(--text-muted)", marginTop: "2px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              <span>{(overviewData?.preparingDrinks ?? overviewData?.activePreparingCount ?? activePreparingCount)} drinks in prep</span>
            </div>
          </div>

          {/* Card 3: Counter Occupancy */}
          <div
            onClick={() => go("bar-tables")}
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border-card)",
              borderRadius: "10px",
              padding: "0.65rem 0.75rem",
              cursor: "pointer",
              transition: "all 0.15s ease",
              minWidth: 0,
              overflow: "hidden",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "var(--accent-amber)";
              e.currentTarget.style.transform = "translateY(-2px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--border-card)";
              e.currentTarget.style.transform = "translateY(0)";
            }}
            title="Click to view Bar Counter & Tables"
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.35rem" }}>
              <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                Counter Occupancy
              </span>
              <div style={{ width: "24px", height: "24px", borderRadius: "6px", background: "rgba(16, 185, 129, 0.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Armchair size={12} color="var(--success)" />
              </div>
            </div>
            <div style={{ fontSize: "1.15rem", fontWeight: 800, color: "var(--text-main)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {(overviewData?.occupiedTables ?? occupiedBarTables.length)} / {(overviewData?.totalTables ?? tables.length)} Tables
            </div>
            <div style={{ fontSize: "0.66rem", color: (overviewData?.occupiedTables ?? occupiedBarTables.length) > 0 ? "var(--accent-amber-light)" : "var(--status-vacant)", fontWeight: 600, marginTop: "2px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {(overviewData?.occupiedSeats ?? occupiedChairs)} seated ({(overviewData?.totalSeats ?? totalChairs)} seats)
            </div>
          </div>

          {/* Card 4: Inventory Health */}
          <div
            onClick={() => go("bar-inventory")}
            style={{
              background: "var(--bg-card)",
              border: lowStockBeverages.length > 0 ? "1px solid rgba(239, 68, 68, 0.4)" : "1px solid var(--border-card)",
              borderRadius: "10px",
              padding: "0.65rem 0.75rem",
              cursor: "pointer",
              transition: "all 0.15s ease",
              minWidth: 0,
              overflow: "hidden",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = lowStockBeverages.length > 0 ? "#ef4444" : "var(--accent-amber)";
              e.currentTarget.style.transform = "translateY(-2px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = lowStockBeverages.length > 0 ? "rgba(239, 68, 68, 0.4)" : "var(--border-card)";
              e.currentTarget.style.transform = "translateY(0)";
            }}
            title="Click to view Beverage Inventory"
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.35rem" }}>
              <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                Beverage Health
              </span>
              <div style={{ width: "24px", height: "24px", borderRadius: "6px", background: lowStockBeverages.length > 0 ? "rgba(239, 68, 68, 0.15)" : "rgba(16, 185, 129, 0.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Package size={12} color={lowStockBeverages.length > 0 ? "#ef4444" : "#10b981"} />
              </div>
            </div>
            <div style={{ fontSize: "1.15rem", fontWeight: 800, color: (overviewData ? overviewData.lowStockItems > 0 : lowStockBeverages.length > 0) ? "var(--danger)" : "var(--text-main)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {(overviewData?.totalInventoryItems ?? inventoryRows.length)} Items
            </div>
            <div style={{ fontSize: "0.66rem", color: (overviewData ? overviewData.lowStockItems > 0 : lowStockBeverages.length > 0) ? "var(--danger)" : "var(--text-muted)", fontWeight: 600, marginTop: "2px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {overviewData ? (overviewData.lowStockItems > 0 ? "⚠️ " + overviewData.lowStockItems + " Low Stock" : "All stock healthy") : (lowStockBeverages.length > 0 ? "⚠️ " + lowStockBeverages.length + " Low Stock" : "All stock healthy")}
            </div>
          </div>

          {/* Card 5: Drinks Catalog */}
          <div
            onClick={() => go("bar-drinks")}
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border-card)",
              borderRadius: "10px",
              padding: "0.65rem 0.75rem",
              cursor: "pointer",
              transition: "all 0.15s ease",
              minWidth: 0,
              overflow: "hidden",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "var(--accent-amber)";
              e.currentTarget.style.transform = "translateY(-2px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--border-card)";
              e.currentTarget.style.transform = "translateY(0)";
            }}
            title="Click to view Drinks Catalog"
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.35rem" }}>
              <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                Drinks Catalog
              </span>
              <div style={{ width: "24px", height: "24px", borderRadius: "6px", background: "rgba(245, 158, 11, 0.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Martini size={12} color="#f59e0b" />
              </div>
            </div>
            <div style={{ fontSize: "1.15rem", fontWeight: 800, color: "var(--text-main)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {(overviewData?.totalDrinks ?? drinks.length)} Drinks
            </div>
            <div style={{ fontSize: "0.66rem", color: "var(--text-muted)", marginTop: "2px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {overviewData ? `${overviewData.alcoholicDrinksCount} Alc • ${overviewData.nonAlcoholicDrinksCount} Non-Alc` : `${alcoholicDrinksCount} Alc • ${nonAlcoholicDrinksCount} Non-Alc`}
            </div>
          </div>
        </div>

        {/* 3. Middle 2-Column Grid: Live Bar Stools & Drinks Queue */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
            gap: "0.75rem",
            marginTop: "0.75rem",
          }}
        >
          {/* Left Column: Live Bar Counter & Stools Grid */}
          <div
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border-card)",
              borderRadius: "12px",
              padding: "0.9rem 1rem",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "0.75rem",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
                <Armchair size={16} color="#f59e0b" />
                <h3
                  style={{
                    fontSize: "0.92rem",
                    fontWeight: 700,
                    color: "var(--text-main)",
                    margin: 0,
                  }}
                >
                  Live Bar Counter & Stools
                </h3>
                <span
                  style={{
                    fontSize: "0.68rem",
                    fontWeight: 700,
                    background: (overviewData?.occupiedTables ?? occupiedBarTables.length) > 0 ? "rgba(245, 158, 11, 0.15)" : "rgba(16, 185, 129, 0.15)",
                    color: (overviewData?.occupiedTables ?? occupiedBarTables.length) > 0 ? "var(--accent-amber-light)" : "var(--success)",
                    padding: "1px 6px",
                    borderRadius: "10px",
                  }}
                >
                  {(overviewData?.occupiedTables ?? occupiedBarTables.length)} Occupied
                </span>
              </div>
              <button
                type="button"
                onClick={() => go("bar-tables")}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--accent-amber)",
                  fontSize: "0.74rem",
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "2px",
                }}
              >
                <span>View All Floor</span>
                <ArrowRight size={12} />
              </button>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(95px, 1fr))",
                gap: "0.5rem",
                maxHeight: "260px",
                overflowY: "auto",
                paddingRight: "2px",
              }}
            >
              {overviewTables.map((tbl) => {
                const isOccupied = tbl.status === "Occupied";
                const serverName = staff.find((m) => String(m.id) === String(tbl.staffId))?.name || tbl.server || "Unassigned";
                return (
                  <div
                    key={tbl.id}
                    onClick={() => go("bar-tables")}
                    style={{
                      background: isOccupied ? "rgba(245, 158, 11, 0.12)" : "var(--bg-tertiary)",
                      border: isOccupied ? "1px solid rgba(245, 158, 11, 0.4)" : "1px solid var(--border-subtle)",
                      borderRadius: "8px",
                      padding: "0.5rem 0.4rem",
                      textAlign: "center",
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = "var(--accent-amber)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = isOccupied ? "rgba(245, 158, 11, 0.4)" : "var(--border-subtle)";
                    }}
                    title={tbl.number + " • " + tbl.area + " • " + (isOccupied ? ((tbl.guests || 2) + " Guests") : "Vacant")}
                  >
                    <div
                      style={{
                        fontSize: "0.82rem",
                        fontWeight: 800,
                        color: isOccupied ? "var(--accent-amber)" : "var(--text-main)",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {tbl.number}
                    </div>
                    <div
                      style={{
                        fontSize: "0.64rem",
                        color: isOccupied ? "var(--accent-amber-light)" : "var(--status-vacant)",
                        marginTop: "2px",
                        fontWeight: 700,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "3px",
                      }}
                    >
                      <span
                        style={{
                          width: "5px",
                          height: "5px",
                          borderRadius: "50%",
                          background: isOccupied ? "#f59e0b" : "#10b981",
                          flexShrink: 0,
                        }}
                      />
                      <span>{isOccupied ? (tbl.guests || 2) + " Guests" : "Vacant"}</span>
                    </div>
                    <div
                      style={{
                        fontSize: "0.62rem",
                        color: "var(--text-muted)",
                        marginTop: "2px",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {serverName}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Live Signature Drinks (Beverages Only) */}
          <div
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border-card)",
              borderRadius: "12px",
              padding: "0.9rem 1rem",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "0.75rem",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
                <Martini size={16} color="#ea580c" />
                <h3
                  style={{
                    fontSize: "0.92rem",
                    fontWeight: 700,
                    color: "var(--text-main)",
                    margin: 0,
                  }}
                >
                  Signature Drinks
                </h3>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <button
                  type="button"
                  onClick={() => { go("bar-drinks"); openForm("drink"); }}
                  style={{
                    background: "rgba(245, 158, 11, 0.15)",
                    border: "1px solid rgba(245, 158, 11, 0.35)",
                    color: "var(--accent-amber-light)",
                    borderRadius: "6px",
                    padding: "0.25rem 0.55rem",
                    fontSize: "0.72rem",
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "2px",
                  }}
                >
                  <Plus size={11} />
                  <span>Add Drink</span>
                </button>
                <button
                  type="button"
                  onClick={() => go("bar-drinks")}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "#ea580c",
                    fontSize: "0.74rem",
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "2px",
                  }}
                >
                  <span>Manage Menu</span>
                  <ArrowRight size={12} />
                </button>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.5rem",
                maxHeight: "260px",
                overflowY: "auto",
                paddingRight: "2px",
              }}
            >
              {overviewSignatureDrinks.length === 0 ? (
                <div style={{ textAlign: "center", padding: "2.5rem 1rem", color: "var(--text-dim)", fontSize: "0.82rem" }}>
                  No drinks added to menu yet.
                </div>
              ) : (
                overviewSignatureDrinks.map((drink) => (
                <div
                  key={drink.id}
                  onClick={() => go("bar-drinks")}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.65rem",
                    padding: "0.45rem 0.65rem",
                    borderRadius: "8px",
                    background: "var(--bg-tertiary)",
                    border: "1px solid var(--border-subtle)",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                  onMouseEnter={(event) => { event.currentTarget.style.borderColor = "var(--accent-amber)"; }}
                  onMouseLeave={(event) => { event.currentTarget.style.borderColor = "var(--border-subtle)"; }}
                >
                  <img
                    src={getMenuItemImage(drink)}
                    alt={drink.name}
                    style={{ width: "36px", height: "36px", borderRadius: "7px", objectFit: "cover", flexShrink: 0 }}
                    onError={(event) => handleDishImageError(event, drink)}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: "0.82rem",
                        fontWeight: 750,
                        color: "var(--text-main)",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {drink.name}
                    </div>
                    <div style={{ fontSize: "0.68rem", color: "var(--text-dim)", marginTop: "1px" }}>
                      {drink.prepTime || "15 min"} • {drink.category || "Beverage"}
                    </div>
                  </div>
                  <div style={{ fontSize: "0.84rem", fontWeight: 800, color: "var(--accent-amber)", whiteSpace: "nowrap" }}>
                    {formatCurrency(drink.price)}
                  </div>
                </div>
              ))
              )}
            </div>
          </div>
        </div>

        {/* 4. Bottom Card: Recent Customer Bar Orders & Bills */}
        <section
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border-card)",
            borderRadius: "12px",
            padding: "0.9rem 1.1rem",
            marginTop: "0.75rem",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "0.75rem",
              flexWrap: "wrap",
              gap: "0.5rem",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Receipt size={17} color="#3b82f6" />
              <h3
                style={{
                  fontSize: "0.94rem",
                  fontWeight: 700,
                  color: "var(--text-main)",
                  margin: 0,
                }}
              >
                Recent Customer Bar Orders & Bills
              </h3>
              <span
                style={{
                  fontSize: "0.68rem",
                  fontWeight: 700,
                  background: "rgba(59, 130, 246, 0.15)",
                  color: "#3b82f6",
                  padding: "2px 7px",
                  borderRadius: "10px",
                }}
              >
                {(overviewData?.activeBarOrders ?? barOrders.length)} Total Orders
              </span>
            </div>

            <button
              type="button"
              onClick={() => go("bar-orders")}
              style={{
                background: "transparent",
                border: "none",
                color: "#3b82f6",
                fontSize: "0.74rem",
                fontWeight: 700,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "3px",
              }}
            >
              <span>View All Orders in Detail</span>
              <ArrowRight size={13} />
            </button>
          </div>

          {ordersLoading ? (
            <SkeletonTable rows={5} columns={7} />
          ) : ordersError ? (
            <div className="bar-error" role="alert">{ordersError}</div>
          ) : (
            renderStaticTable(
              ["Order Number", "Table", "Drink Items", "Quantity", "Amount", "Time", "Status", "Actions"],
              overviewRecentOrders,
              (column, order) => ({
                "Order Number": <strong>{order.id}</strong>,
                Table: order.table,
                "Drink Items": order.itemLabel,
                Quantity: order.quantity,
                Amount: formatCurrency(order.total),
                Time: order.time,
                Status: <Status>{order.status}</Status>,
                Actions: (
                  <div className="bar-actions bar-order-actions">
                    <button className="bar-button secondary small" title="View all items in this order" onClick={() => setItemsOrder(order)}>
                      View Items
                    </button>
                    <button
                      className="bar-icon-button"
                      aria-label={"Print order " + order.id}
                      title="Print order details"
                      onClick={() =>
                        printBill({ ...order, subtotal: order.total, discount: 0, gst: 0, service: 0, items: order.itemLabel }) ||
                        setToast("Allow pop-ups to print the order details.")
                      }
                    >
                      <Printer size={15} />
                    </button>
                  </div>
                ),
              })[column]
            )
          )}
        </section>
      </>}

      {route === "bar-drinks" ? (
        <BarDrinksMenu
          drinks={barDrinks}
          onAddDrink={handleAddDrink}
          onUpdateDrink={handleUpdateDrink}
          onDeleteDrink={handleDeleteDrink}
          onToggleDrinkAvailability={handleToggleDrinkAvailability}
          onToggleDrinkSpecial={handleToggleDrinkSpecial}
          onSetMenuAvailability={onSetMenuAvailability}
          setToast={setToast}
        />
      ) : route === "bar-tables" ? (
        <BarTablesView
          tables={dineTables}
          staffList={effectiveStaffList}
          orders={orders}
          onAddTable={onAddTable}
          onUpdateTable={onUpdateTable}
          onDeleteTable={onDeleteTable}
          onAddStaff={handleAddBarStaff}
          setToast={setToast}
        />
      ) : route === "bar-staff" ? (
        <BarStaffView
          staffList={barStaff}
          tables={tables}
          onAddStaff={handleAddBarStaff}
          onUpdateStaff={handleUpdateBarStaff}
          onDeleteStaff={handleDeleteBarStaff}
          onReloadStaff={loadBarStaff}
          loading={barStaffLoading}
          setToast={setToast}
        />
      ) : (
        listPage
      )}

      {route === "bar-kot" && (
        <BarBOTView
          menuItems={menuItems}
          tables={tables}
          staffList={effectiveStaffList}
          barDrinks={barDrinks}
          onItemsUpdated={onBarOrderItemStatusUpdated}
          onUpdateItemKotStatus={onUpdateItemKotStatus}
          onCompleteTableKot={onCompleteTableKot}
        />
      )}

      {route === "bar-invoices" && <AdminInvoices pastOrders={barInvoices} restaurantName={restaurantName} restaurantSettings={restaurantSettings} onUpdateInvoiceDiscount={onUpdateInvoiceDiscount} />}

      {route === "bar-inventory" && <SharedBarInventory inventory={inventory} loading={inventoryLoading} error={inventoryError} onRefresh={loadInventory} />}

      {route === "bar-orders" && <section className="bar-page-card"><div className="bar-section-head"><div><h2>Bar Orders / Bills</h2><p>Shared restaurant orders with beverage summaries.</p></div><div className="bar-actions"><button className="bar-button secondary" onClick={loadOrders} disabled={ordersLoading}><RefreshCw size={15} /> Refresh</button><button className="bar-button primary" onClick={() => setOrderComposerOpen(true)}><Plus size={16} /> New Bar Order</button></div></div><div className="bar-list-tools"><label className="bar-search"><Search size={16} /><input placeholder="Search orders, tables, customers…" value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} /></label><label className="bar-select-label"><span>Order Status</span><select value={filter} onChange={(event) => { setFilter(event.target.value); setPage(1); }}><option value="all">All statuses</option>{[...new Set(barOrders.map((order) => order.status))].map((status) => <option key={status}>{status}</option>)}</select></label></div>{ordersLoading ? <SkeletonTable rows={5} columns={8} /> : <>{ordersError && <div className="bar-error" role="status">{ordersError}</div>}{renderStaticTable(["Order ID", "Table / Order Type", "Customer / Server", "Drinks and Quantities", "Order Time", "Total", "Order Status", "Actions"], visibleOrders, (column, order) => ({ "Order ID": <strong className="bar-order-id" title={String(order.id)}>{order.id}</strong>, "Table / Order Type": order.table, "Customer / Server": order.customer, "Drinks and Quantities": order.itemLabel, "Order Time": order.time, Total: <strong>{formatCurrency(order.total)}</strong>, "Order Status": <Status>{order.status}</Status>, Actions: <div className="bar-actions bar-order-actions"><button className="bar-button secondary small" title="View all items in this order" onClick={() => setItemsOrder(order)}>View Items</button><button className="bar-icon-button" aria-label={`Print order ${order.id}`} title="Print order details" onClick={() => printBill({ ...order, subtotal: order.total, discount: 0, gst: 0, service: 0, items: order.itemLabel }) || setToast("Allow pop-ups to print the order details.")}><Printer size={15} /></button></div> })[column], "bar-orders-table")}<footer className="bar-pagination"><span>Showing {filteredOrders.length ? (page - 1) * PAGE_SIZE + 1 : 0}–{Math.min(page * PAGE_SIZE, filteredOrders.length)} of {filteredOrders.length}</span><div><button disabled={page <= 1} onClick={() => setPage((n) => Math.max(1, n - 1))}><ChevronLeft size={16} /></button><span>Page {page} of {Math.max(1, Math.ceil(filteredOrders.length / PAGE_SIZE))}</span><button disabled={page >= Math.ceil(filteredOrders.length / PAGE_SIZE)} onClick={() => setPage((n) => n + 1)}><ChevronRight size={16} /></button></div></footer></>}</section>}
      <OrderItemsModal order={itemsOrder} onClose={() => setItemsOrder(null)} />
      <OrderItemsModal order={tableItems} onClose={() => setTableItems(null)} />

      {route === "bar-reports" && <section className="bar-page-card"><div className="bar-section-head"><div><h2>Bar Reports</h2><p>Summary calculated from the shared menu, active orders, inventory, and loaded order history.</p></div><button className="bar-button secondary" onClick={() => csvDownload("bar-report.csv", [["Report", "Value", "Source"], ...reportData])}>Export CSV</button></div><div className="bar-report-summary">{reportData.map(([label,value,note])=><article key={label}><span>{label}</span><strong>{value}</strong><small>{note}</small></article>)}</div>{renderStaticTable(["Report","Value","Source"],reportData.map((row,index)=>({id:index,name:row[0],value:row[1],source:row[2]})),(column,row)=>({Report:row.name,Value:row.value,Source:row.source})[column])}</section>}

      {route === "bar-access" && <section className="bar-page-card"><div className="bar-section-head"><div><h2>Bar Access Management</h2><p>Access changes use the application authorization system.</p></div></div><div className="bar-empty">No Bar-specific access management API is configured. Existing application roles and permissions remain authoritative.</div></section>}

      {route === "bar-settings" && <section className="bar-page-card"><div className="bar-section-head"><div><h2>Bar Settings</h2><p>Settings must be stored by the restaurant configuration service to persist across sessions.</p></div></div><div className="bar-empty">No Bar-specific settings API is configured. No local demo values are being presented as saved settings.</div></section>}

      {orderComposerOpen && <div className="bar-overlay" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && !orderSubmitting && setOrderComposerOpen(false)}><section className="bar-modal" role="dialog" aria-modal="true" aria-labelledby="bar-order-title"><header className="bar-modal-head"><div><span className="bar-kicker">SHARED RESTAURANT ORDER</span><h2 id="bar-order-title">New Bar Order</h2></div><button className="bar-icon-button" type="button" aria-label="Close" disabled={orderSubmitting} onClick={() => setOrderComposerOpen(false)}><X size={18} /></button></header><form className="bar-form" onSubmit={submitBarOrder}><div className="bar-form-grid"><label className="bar-field"><span>Table *</span><select required value={orderTableId} onChange={(event) => setOrderTableId(event.target.value)}><option value="">Select a shared table</option>{tables.map((table) => <option key={table.id} value={table.id}>{table.number}</option>)}</select></label><label className="bar-field"><span>Category</span><select value={orderMenuCategory} onChange={(event) => { setOrderMenuCategory(event.target.value); setOrderDrinkId(""); }}><option value="all">All categories</option>{[...new Set(menuItems.map((item) => item.category).filter(Boolean))].map((category) => <option key={category}>{category}</option>)}</select></label><label className="bar-field"><span>Food or Drink *</span><select required value={orderDrinkId} onChange={(event) => setOrderDrinkId(event.target.value)}><option value="">Select food or drink</option>{menuItems.filter((item) => item.isAvailable !== false && (orderMenuCategory === "all" || item.category === orderMenuCategory)).map((item) => <option key={item.id} value={item.id}>{item.name} · {item.category} · {formatCurrency(item.price)}</option>)}</select></label><label className="bar-field"><span>Quantity</span><input type="number" min="1" step="1" value={orderQuantity} onChange={(event) => setOrderQuantity(event.target.value)} /></label><label className="bar-field"><span>Serving Type</span><input value={orderServing} onChange={(event) => setOrderServing(event.target.value)} placeholder="Regular / large / peg" /></label><label className="bar-field"><span>Ice Preference</span><select value={orderIce} onChange={(event) => setOrderIce(event.target.value)}><option value="">No preference</option><option>With ice</option><option>No ice</option><option>Extra ice</option></select></label><label className="bar-field"><span>Mixer</span><input value={orderMixer} onChange={(event) => setOrderMixer(event.target.value)} placeholder="Soda, tonic, juice…" /></label><label className="bar-field wide"><span>Special Notes</span><textarea rows="2" value={orderNotes} onChange={(event) => setOrderNotes(event.target.value)} /></label></div>{orderError && <p className="bar-error" role="alert">{orderError}</p>}<footer className="bar-modal-footer"><button className="bar-button secondary" type="button" disabled={orderSubmitting} onClick={() => setOrderComposerOpen(false)}>Cancel</button><button className="bar-button primary" type="submit" disabled={orderSubmitting || !tables.length || !menuItems.length}>{orderSubmitting ? "Sending…" : "Create & Send KOT"}</button></footer></form></section></div>}
      {modal && <EntityModal kind={modal.kind} initial={modal.item} tables={tables} staff={staff} drinks={drinks} onClose={() => setModal(null)} onSave={saveEntity} />}
      <DetailsModal item={details} onClose={() => setDetails(null)} />
      {toast && <div className="bar-toast" role="status">{toast}</div>}
    </main>
  );
}
