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
} from "lucide-react";
import { CustomCreatableDropdown } from "../common/CustomCreatableDropdown";
import { ConfirmDeleteModal, useConfirmDelete } from "../common/ConfirmDeleteModal";
import { formatCurrency } from "../utils/formatCurrency";
import { API_BASE_URL } from "../api/apiConfig";
import {
  apiGetInventory,
  apiCreateInventoryItem,
  apiUpdateInventoryItem,
  apiDeleteInventoryItem,
  apiAdjustStock,
} from "../api/inventoryApi";

const INVENTORY_STORAGE_KEY = "gourmet_pos_inventory_v1";
const INVENTORY_FORM_DRAFT_KEY = "gourmet_pos_inventory_form_draft_v1";
const MENU_RECIPE_UNITS = ["KG", "g", "L", "ml", "Pcs", "Cans"];

const normalizeUnit = (unit) => (unit === "Litres" ? "L" : unit);
const normalizeInventoryUnits = (items) =>
  items.map((item) => ({ ...item, unit: normalizeUnit(item.unit) }));

const STORAGE_KEY_CUSTOM_INV_CATEGORIES = "pos_custom_inventory_categories";
const STORAGE_KEY_CUSTOM_INV_UNITS = "pos_custom_inventory_units";
export function AdminInventory({ menuItems = [], onUpdateMenuItem }) {
  const { confirmState, requestDelete, cancelDelete } = useConfirmDelete();
  const [inventory, setInventory] = useState(() => {
    try {
      const saved = localStorage.getItem(INVENTORY_STORAGE_KEY);
      return saved
        ? normalizeInventoryUnits(JSON.parse(saved))
        : [];
    } catch {
      return [];
    }
  });

  const [customInvCategories, setCustomInvCategories] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CUSTOM_INV_CATEGORIES);
      return saved ? JSON.parse(saved) : [];
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

  const saveCustomCategory = (newCat) => {
    if (!newCat || !newCat.trim()) return;
    const trimmed = newCat.trim();
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

  const allCategoryOptions = useMemo(() => {
    const map = new Map();
    customInvCategories.forEach((c) => {
      if (c && !map.has(c.toLowerCase()))
        map.set(c.toLowerCase(), { value: c, label: c });
    });
    (inventory || []).forEach((item) => {
      if (item.category && !map.has(item.category.toLowerCase())) {
        map.set(item.category.toLowerCase(), {
          value: item.category,
          label: item.category,
        });
      }
    });
    return Array.from(map.values());
  }, [customInvCategories, inventory]);

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
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingItemId, setEditingItemId] = useState(null);
  const [newItem, setNewItem] = useState(() => {
    try {
      const raw = localStorage.getItem(INVENTORY_FORM_DRAFT_KEY);
      if (raw) {
        const draft = JSON.parse(raw);
        if (draft && typeof draft === "object") return draft;
      }
    } catch {}
    return {
      name: "",
      category: "Grains & Rice",
      subcategory: "Rice",
      mrp: "",
      stock: 10,
      minThreshold: 5,
      unit: "KG",
      supplier: "Local Supplier",
    };
  });

  const updateNewItemField = (field, value) => {
    setNewItem((prev) => {
      const next = { ...prev, [field]: value };
      if (editingItemId === null) {
        try {
          localStorage.setItem(INVENTORY_FORM_DRAFT_KEY, JSON.stringify(next));
          console.log(`[LocalStorage Draft Saved] Key: "${INVENTORY_FORM_DRAFT_KEY}"`, next);
        } catch (err) {
          console.error("Failed to save draft to localStorage:", err);
        }
      }
      console.log(`[Inventory Form Input] "${field}":`, value);
      return next;
    });
  };

  const handleCategoryChange = (val) => {
    setNewItem((prev) => {
      const next = { ...prev, category: val, subcategory: "" };
      if (editingItemId === null) {
        try {
          localStorage.setItem(INVENTORY_FORM_DRAFT_KEY, JSON.stringify(next));
          console.log(`[LocalStorage Draft Saved] Key: "${INVENTORY_FORM_DRAFT_KEY}"`, next);
        } catch (err) {
          console.error("Failed to save draft to localStorage:", err);
        }
      }
      console.log(`[Inventory Form Input] "category":`, val);
      return next;
    });
  };

  const subcategoryOptions = useMemo(() => {
    const subcategories = new Map();
    (inventory || [])
      .filter((item) => item.category === newItem.category && item.subcategory)
      .forEach((item) => {
        if (!subcategories.has(item.subcategory.toLowerCase())) {
          subcategories.set(item.subcategory.toLowerCase(), {
            value: item.subcategory,
            label: item.subcategory,
          });
        }
      });
    return Array.from(subcategories.values());
  }, [inventory, newItem.category]);

  const saveInventory = (updated) => {
    const normalized = normalizeInventoryUnits(updated);
    setInventory(normalized);
    try {
      localStorage.setItem(INVENTORY_STORAGE_KEY, JSON.stringify(normalized));
      console.log(`[LocalStorage Saved] Key: "${INVENTORY_STORAGE_KEY}", items count: ${normalized.length}`, normalized);
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
    } catch (e) {
      console.error("[LocalStorage Error] Failed to save inventory:", e);
    }
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
      const savedById = new Map((Array.isArray(saved) ? saved : []).map((item) => [String(item.id), item]));
      const remote = rows.map((row) => {
        const id = row.id ?? row.ingredientId ?? row.ingredient_id;
        const previous = savedById.get(String(id)) || {};
        return {
          ...previous,
          id: String(id),
          name: row.name?.trim() || previous.name || `Unnamed ingredient #${id}`,
          category: row.category?.trim() || previous.category || "General",
          subcategory: row.subcategory?.trim() || previous.subcategory || "",
          supplier: row.supplier?.trim() || previous.supplier || "Local Supplier",
          unit: normalizeUnit(row.unit || previous.unit || "KG"),
          stock: Number(row.currentStock ?? row.stock ?? previous.stock ?? 0),
          minThreshold: Number(row.minimumThreshold ?? row.minThreshold ?? previous.minThreshold ?? 5),
          mrp: Number(row.mrp ?? row.unitCost ?? previous.mrp ?? 0),
          unitCost: Number(row.unitCost ?? row.mrp ?? previous.unitCost ?? 0),
        };
      });
      const remoteIds = new Set(remote.map((item) => String(item.id)));
      const merged = normalizeInventoryUnits([
        ...remote,
        ...(Array.isArray(saved) ? saved.filter((item) => !remoteIds.has(String(item.id))) : []),
      ]);
      setInventory(merged);
      try { localStorage.setItem(INVENTORY_STORAGE_KEY, JSON.stringify(merged)); } catch {}
      console.log(`[Database API] Synced ${remote.length} ingredients from MySQL Database:`, remote);
    }).catch((err) => {
      console.error("[Database API] Error fetching inventory from DB:", err);
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const handleInventoryUpdate = (event) => {
      if (Array.isArray(event.detail)) {
        setInventory(normalizeInventoryUnits(event.detail));
      }
    };
    const handleStorageUpdate = (event) => {
      if (event.key !== INVENTORY_STORAGE_KEY || !event.newValue) return;
      try {
        const updated = JSON.parse(event.newValue);
        if (Array.isArray(updated)) {
          setInventory(normalizeInventoryUnits(updated));
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
    const numId = Number(restockItem.id);
    if (Number.isFinite(numId) && numId > 0) {
      apiAdjustStock({
        ingredientId: numId,
        quantityChange: amount,
        reason: `Restocked from ${restockSupplier.trim() || restockItem.supplier || "Supplier"}`,
      }).then((res) => {
        if (res?.success) {
          console.log(`[Database API] Restock adjusted in MySQL DB for ingredient #${numId}: +${amount}`);
        }
      }).catch((err) => {
        console.error("[Database API] Error saving stock adjustment to DB:", err);
      });
    }

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

  const handleAdjustStock = (id, delta) => {
    const numId = Number(id);
    if (Number.isFinite(numId) && numId > 0 && delta !== 0) {
      apiAdjustStock({
        ingredientId: numId,
        quantityChange: delta,
        reason: delta > 0 ? "Manual stock increment" : "Manual stock decrement",
      }).then((res) => {
        if (res?.success) {
          console.log(`[Database API] Stock delta ${delta} saved to MySQL DB for ingredient #${numId}`);
        }
      }).catch((err) => {
        console.error("[Database API] Error saving stock adjustment to DB:", err);
      });
    }

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

  const handleAddItem = async (e) => {
    e.preventDefault();
    if (!newItem.name.trim()) return;

    if (newItem.category) saveCustomCategory(newItem.category);
    if (newItem.unit) saveCustomUnit(newItem.unit);

    const itemDetails = {
      name: newItem.name.trim(),
      category: newItem.category || "General",
      subcategory: newItem.subcategory || "",
      mrp: newItem.mrp === "" || newItem.mrp == null ? null : Number(newItem.mrp),
      stock: Number(newItem.stock) || 0,
      minThreshold: Number(newItem.minThreshold) || 5,
      unit: newItem.unit || "KG",
      supplier: newItem.supplier?.trim() || "Local Supplier",
    };

    console.log("[Inventory Form Submit] Processing item for MySQL Database:", itemDetails);

    if (editingItemId !== null) {
      // Optimistically update UI & localStorage
      const updated = inventory.map((item) =>
        item.id === editingItemId ? { ...item, ...itemDetails } : item,
      );
      saveInventory(updated);

      // Call Backend PUT API to update in MySQL Database
      const numId = Number(editingItemId);
      if (Number.isFinite(numId) && numId > 0) {
        apiUpdateInventoryItem(numId, itemDetails).then((res) => {
          if (res?.success) {
            console.log(`[Database API] Ingredient #${numId} updated in MySQL DB:`, res.data);
          } else {
            console.warn(`[Database API] Backend update warning for #${numId}:`, res?.error);
          }
        }).catch((err) => {
          console.error(`[Database API] Error updating ingredient #${numId} in DB:`, err);
        });
      }
    } else {
      let assignedId = `inv-${Date.now()}`;
      const newEntry = {
        id: assignedId,
        ...itemDetails,
        totalUsed: 0,
        totalRestocked: Number(newItem.stock) || 0,
        lastRestocked: "Today",
      };

      // Call Backend POST API to persist into MySQL Database
      try {
        const apiRes = await apiCreateInventoryItem(itemDetails);
        console.log("[Database API] Response from /api/v1/inventory:", apiRes);
        if (apiRes?.success && apiRes?.data) {
          const dbItem = apiRes.data?.data || apiRes.data;
          const remoteId = String(dbItem.ingredientId || dbItem.id || dbItem.ingredient_id || "");
          if (remoteId) {
            assignedId = remoteId;
            newEntry.id = remoteId;
          }
          if (dbItem.currentStock !== undefined) newEntry.stock = Number(dbItem.currentStock);
          if (dbItem.minimumThreshold !== undefined) newEntry.minThreshold = Number(dbItem.minimumThreshold);
          console.log(`[Database API] Successfully saved new ingredient #${assignedId} to MySQL Database:`, dbItem);
        } else {
          console.warn("[Database API] Backend create warning (saved locally):", apiRes?.error);
        }
      } catch (err) {
        console.error("[Database API] Network error calling create inventory API:", err);
      }

      const updated = [newEntry, ...inventory.filter((item) => item.id !== newEntry.id)];
      saveInventory(updated);
      console.log(`[Inventory Current Count in LocalStorage (${INVENTORY_STORAGE_KEY})]:`, updated.length);
    }

    try {
      localStorage.removeItem(INVENTORY_FORM_DRAFT_KEY);
      console.log(`[LocalStorage Draft Cleared] Key: "${INVENTORY_FORM_DRAFT_KEY}" after successful save`);
    } catch {}

    resetItemForm();
    setIsAddModalOpen(false);
  };

  const resetItemForm = () => {
    setEditingItemId(null);
    setNewItem({
      name: "",
      category: "Grains & Rice",
      subcategory: "Rice",
      mrp: "",
      stock: 10,
      minThreshold: 5,
      unit: "KG",
      supplier: "Local Supplier",
    });
  };

  const openNewItemModal = () => {
    setEditingItemId(null);
    let draft = null;
    try {
      const raw = localStorage.getItem(INVENTORY_FORM_DRAFT_KEY);
      if (raw) draft = JSON.parse(raw);
    } catch {}
    if (draft && typeof draft === "object") {
      setNewItem({
        name: draft.name || "",
        category: draft.category || "Grains & Rice",
        subcategory: draft.subcategory || "",
        mrp: draft.mrp !== undefined ? draft.mrp : "",
        stock: draft.stock !== undefined ? draft.stock : 10,
        minThreshold: draft.minThreshold !== undefined ? draft.minThreshold : 5,
        unit: draft.unit || "KG",
        supplier: draft.supplier !== undefined ? draft.supplier : "Local Supplier",
      });
      console.log("[Inventory Form] Restored draft from localStorage:", draft);
    } else {
      resetItemForm();
    }
    setIsAddModalOpen(true);
  };

  const openEditItemModal = (item) => {
    setEditingItemId(item.id);
    setNewItem({
      name: item.name || "",
      category: item.category || "Grains & Rice",
      subcategory: item.subcategory || "",
      mrp: item.mrp == null ? "" : String(item.mrp),
      stock: String(item.stock ?? 0),
      minThreshold: String(item.minThreshold ?? 5),
      unit: item.unit || "KG",
      supplier: item.supplier || "",
    });
    console.log("[Inventory Form] Editing item:", item);
    setIsAddModalOpen(true);
  };

  const closeItemModal = () => {
    setIsAddModalOpen(false);
    console.log("[Inventory Form] Modal closed.");
  };

  const handleDeleteItem = (id) => {
    const item = inventory.find((i) => i.id === id);
    const itemName = item?.name || "this item";
    requestDelete({
      title: "Remove Inventory Item?",
      message: `Are you sure you want to remove "${itemName}" from restaurant inventory? This action cannot be undone.`,
      confirmLabel: "Yes, Remove",
      onConfirm: () => {
        const numId = Number(id);
        if (Number.isFinite(numId) && numId > 0) {
          apiDeleteInventoryItem(numId).then((res) => {
            if (res?.success) {
              console.log(`[Database API] Ingredient #${numId} deleted from MySQL DB`);
            } else {
              console.warn(`[Database API] Backend delete warning for #${numId}:`, res?.error);
            }
          }).catch((err) => {
            console.error(`[Database API] Error deleting ingredient #${numId} from DB:`, err);
          });
        }
        saveInventory(inventory.filter((i) => i.id !== id));
      },
    });
  };

  const categories = [
    "all",
    "Grains & Rice",
    "Meats & Poultry",
    "Seafood",
    "Dairy",
    "Spices & Oils",
    "Vegetables & Fruits",
    "Packaging",
    "Beverages",
  ];
  const suppliers = [...new Set(inventory.map((item) => item.supplier))].sort();
  const inStockCount = inventory.filter(
    (item) => item.stock > item.minThreshold,
  ).length;
  const outOfStockCount = inventory.filter((item) => item.stock <= 0).length;

  const filtered = inventory.filter((item) => {
    const matchesCategory =
      selectedCategory === "all" || item.category === selectedCategory;
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
                    color: "#f59e0b",
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
                color: "#34d399",
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
              color: "#34d399",
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
              color: "#38bdf8",
              icon: Package,
            },
            {
              label: "In Stock",
              value: inStockCount,
              status: "in-stock",
              color: "#10b981",
              icon: CheckCircle2,
            },
            {
              label: "Low Stock",
              value: lowStockCount,
              status: "low-stock",
              color: "#f59e0b",
              icon: AlertTriangle,
            },
            {
              label: "Out of Stock",
              value: outOfStockCount,
              status: "out-of-stock",
              color: "#ef4444",
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
                border: `1px solid ${selectedStatus === status ? color : "var(--border-subtle)"}`,
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
                  background: `${color}20`,
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
                color: "#f59e0b",
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
                <th style={{ padding: "0.65rem 0.8rem" }}>
                  Ingredient / Supply
                </th>
                <th style={{ padding: "0.65rem 0.8rem" }}>Category</th>
                <th style={{ padding: "0.65rem 0.8rem" }}>MRP</th>
                <th style={{ padding: "0.65rem 0.8rem" }}>In-Stock Level</th>
                <th style={{ padding: "0.65rem 0.8rem" }}>Used</th>
                <th style={{ padding: "0.65rem 0.8rem" }}>Threshold</th>
                <th style={{ padding: "0.65rem 0.8rem" }}>Status</th>
                <th style={{ padding: "0.65rem 0.8rem", textAlign: "right" }}>
                  Quick Adjust & Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {visibleItems.map((item) => {
                const isOutOfStock = item.stock <= 0;
                const isLowStock =
                  !isOutOfStock && item.stock <= item.minThreshold;
                const statusColor = isOutOfStock
                  ? "#ef4444"
                  : isLowStock
                    ? "#f59e0b"
                    : "#10b981";
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
                    <td style={{ padding: "0.7rem 0.8rem" }}>
                      <div
                        style={{
                          fontWeight: 800,
                          color: "var(--text-main)",
                          fontSize: "0.84rem",
                        }}
                      >
                        {item.name}
                      </div>
                      <div
                        style={{
                          fontSize: "0.72rem",
                          color: "var(--text-muted)",
                          marginTop: "2px",
                        }}
                      >
                        Supplier: {item.supplier}
                      </div>
                    </td>

                    {/* Category */}
                    <td
                      style={{
                        padding: "0.7rem 0.8rem",
                        color: "var(--text-main)",
                        fontWeight: 600,
                      }}
                    >
                      {item.category}
                      {item.subcategory && (
                        <div
                          style={{
                            color: "var(--text-muted)",
                            fontSize: "0.72rem",
                            fontWeight: 500,
                            marginTop: "2px",
                          }}
                        >
                          {item.subcategory}
                        </div>
                      )}
                    </td>

                    {/* MRP */}
                    <td
                      style={{
                        padding: "0.7rem 0.8rem",
                        color: "var(--text-main)",
                        fontWeight: 700,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {item.mrp == null || item.mrp === ""
                        ? "—"
                        : formatCurrency(item.mrp)}
                    </td>

                    {/* In-Stock */}
                    <td style={{ padding: "0.7rem 0.8rem" }}>
                      <div
                        style={{
                          fontWeight: 800,
                          color: isOutOfStock
                            ? "#ef4444"
                            : isLowStock
                              ? "#f59e0b"
                              : "#10b981",
                          fontSize: "0.85rem",
                        }}
                      >
                        {item.stock} {item.unit}
                      </div>
                    </td>

                    {/* Used since recipe tracking started */}
                    <td
                      style={{
                        padding: "0.7rem 0.8rem",
                        color: "var(--text-muted)",
                        fontWeight: 600,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {Number(item.totalUsed || 0)} {item.unit}
                    </td>

                    {/* Min Threshold */}
                    <td
                      style={{
                        padding: "0.7rem 0.8rem",
                        color: "var(--text-muted)",
                        fontWeight: 600,
                      }}
                    >
                      {item.minThreshold} {item.unit}
                    </td>

                    {/* Status Badge */}
                    <td style={{ padding: "0.7rem 0.8rem" }}>
                      <span
                        style={{
                          background: `${statusColor}1f`,
                          border: `1px solid ${statusColor}4d`,
                          color: statusColor,
                          borderRadius: "20px",
                          width: "118px",
                          height: "32px",
                          boxSizing: "border-box",
                          padding: "0 8px",
                          fontSize: "0.72rem",
                          fontWeight: 700,
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "5px",
                          whiteSpace: "nowrap",
                          flexShrink: 0,
                        }}
                      >
                        <span
                          style={{
                            width: 6,
                            height: 6,
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
                      style={{ padding: "0.7rem 0.8rem", textAlign: "right" }}
                    >
                      <div
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "0.45rem",
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
                            padding: "5px 7px",
                            fontSize: "0.75rem",
                            fontWeight: 700,
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                            cursor: "pointer",
                          }}
                        >
                          <Pencil size={13} />
                          Edit
                        </button>
                        <button
                          onClick={() => handleAdjustStock(item.id, -5)}
                          style={{
                            background: "rgba(255, 255, 255, 0.05)",
                            border: "1px solid rgba(255, 255, 255, 0.1)",
                            color: "#ffffff",
                            borderRadius: "6px",
                            padding: "4px 8px",
                            fontSize: "0.75rem",
                            fontWeight: 700,
                            cursor: "pointer",
                          }}
                          title="Consume -5 units"
                        >
                          -5
                        </button>
                        <button
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
                            padding: "4px 8px",
                            fontSize: "0.75rem",
                            fontWeight: 700,
                            cursor: "pointer",
                          }}
                          title="Record received stock quantity"
                        >
                          <PackagePlus
                            size={13}
                            style={{
                              verticalAlign: "middle",
                              marginRight: "3px",
                            }}
                          />
                          Receive
                        </button>
                        <button
                          onClick={() => handleDeleteItem(item.id)}
                          style={{
                            background: "rgba(239, 68, 68, 0.08)",
                            border: "1px solid rgba(239, 68, 68, 0.3)",
                            color: "#ef4444",
                            borderRadius: "6px",
                            padding: "5px 7px",
                            fontSize: "0.75rem",
                            cursor: "pointer",
                          }}
                          title="Delete item"
                        >
                          <Trash2 size={13} />
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
                      color: "#94a3b8",
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
              padding: "0.5rem 0.85rem",
              borderTop: "1px solid var(--border-subtle)",
              background: "var(--bg-tertiary)",
              fontSize: "0.74rem",
              color: "var(--text-muted)",
              flexWrap: "wrap",
              gap: "0.5rem",
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
              style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
            >
              <div
                style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}
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
                    height: "24px",
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
                    height: "24px",
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
                {Array.from({ length: pageCount }, (_, index) => index + 1).map(
                  (page) => {
                    const isActive = page === visiblePage;
                    return (
                      <button
                        key={page}
                        type="button"
                        aria-label={`Page ${page}`}
                        aria-current={isActive ? "page" : undefined}
                        onClick={() => setCurrentPage(page)}
                        style={{
                          height: "24px",
                          minWidth: "24px",
                          padding: "0 5px",
                          borderRadius: "5px",
                          background: isActive
                            ? "linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)"
                            : "var(--bg-tertiary)",
                          border: isActive
                            ? "none"
                            : "1px solid var(--border-subtle)",
                          color: isActive ? "#ffffff" : "var(--text-muted)",
                          cursor: "pointer",
                          fontSize: "0.72rem",
                          fontWeight: isActive ? 800 : 500,
                          boxShadow: isActive
                            ? "0 2px 8px rgba(245, 158, 11, 0.35)"
                            : "none",
                        }}
                      >
                        {page}
                      </button>
                    );
                  },
                )}
                <button
                  type="button"
                  aria-label="Next page"
                  onClick={() =>
                    setCurrentPage((page) => Math.min(pageCount, page + 1))
                  }
                  disabled={visiblePage === pageCount}
                  style={{
                    height: "24px",
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
            background: "rgba(0,0,0,0.72)",
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
                        color: "#ef4444",
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
                  color: "#fca5a5",
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

      {restockItem && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 175,
            padding: "1rem",
            background: "rgba(0,0,0,0.72)",
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
            <input
              value={restockSupplier}
              onChange={(event) => setRestockSupplier(event.target.value)}
              placeholder="Supplier name"
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
                marginBottom: "0.9rem",
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
            background: "rgba(0, 0, 0, 0.75)",
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
                  onChange={(e) => updateNewItemField("name", e.target.value)}
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
                  onChange={(e) => updateNewItemField("mrp", e.target.value)}
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
                  Supplier
                </label>
                <input
                  type="text"
                  placeholder="e.g. Local Supplier"
                  value={newItem.supplier}
                  onChange={(e) =>
                    updateNewItemField("supplier", e.target.value)
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
                    onChange={handleCategoryChange}
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
                    onChange={(val) => updateNewItemField("unit", val)}
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
                  onChange={(val) => updateNewItemField("subcategory", val)}
                  options={subcategoryOptions}
                  placeholder="Select Subcategory"
                  customPlaceholder="Type new subcategory..."
                  allowCustom
                />
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
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
                    value={newItem.stock}
                    onChange={(e) =>
                      updateNewItemField("stock", e.target.value)
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
                    Low Stock Threshold
                  </label>
                  <input
                    type="number"
                    value={newItem.minThreshold}
                    onChange={(e) =>
                      updateNewItemField("minThreshold", e.target.value)
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
