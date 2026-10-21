import React, { useState, useEffect } from "react";
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
  Package,
  FileText,
  BarChart3,
  Settings,
} from "lucide-react";
import { formatCurrency } from "../utils/formatCurrency";
import { LoginManagement } from "./LoginManagement";
import { ProfileDropdown } from "../common/ProfileDropdown";
import { CustomCreatableDropdown } from "../common/CustomCreatableDropdown";
import { AdminSidebar } from "./AdminSidebar";
import { AdminHeader } from "./AdminHeader";
import { AdminOverview } from "./AdminOverview";
import { AdminInventory } from "./AdminInventory";
import { AdminInvoices } from "./AdminInvoices";
import { AdminReports } from "./AdminReports";
import { AdminSettings } from "./AdminSettings";
import { API_BASE_URL } from "../api/apiConfig";
import {
  apiCreateMenuCategory,
  apiGetMenuCategories,
  apiUploadMenuImage,
} from "../api/menuApi";
import {
  getMenuItemImage,
  handleDishImageError,
  getRelevantLocalFallback,
  LOCAL_IMAGE_PRESETS,
} from "../utils/menuImageHelper";

const RESTAURANT_SETTINGS_KEY = "gourmet_pos_settings_v1";

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
  staffList,
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
}) {
  const [activeTab, setActiveTab] = useState("overview");
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
  const emptyTableFilters = { search: "", area: "", status: "", server: "" };
  const [tableFilters, setTableFilters] = useState(emptyTableFilters);
  const updateTableFilter = (key, value) =>
    setTableFilters((previous) => ({ ...previous, [key]: value }));
  const normalizeTableFilterText = (value) =>
    String(value ?? "")
      .trim()
      .toLowerCase();
  const tableAreaOptions = [
    ...new Map(
      tables
        .map((table) => String(table.section ?? "").trim())
        .filter(Boolean)
        .map((area) => [normalizeTableFilterText(area), area]),
    ).values(),
  ];
  const tableServerOptions = [
    ...new Map(
      [
        ...staffList.map(
          (staff) =>
            staff?.name ||
            staff?.fullName ||
            staff?.FullName ||
            staff?.username,
        ),
        ...tables.map((table) => table.server),
      ]
        .map((name) => String(name ?? "").trim())
        .filter(Boolean)
        .map((name) => [normalizeTableFilterText(name), name]),
    ).values(),
  ];
  const filteredTables = tables.filter((table) => {
    const query = normalizeTableFilterText(tableFilters.search);
    const server = normalizeTableFilterText(table.server);
    return (
      [table.name, table.tableNumber, table.number, table.id].some((value) =>
        normalizeTableFilterText(value).includes(query),
      ) &&
      (!tableFilters.area ||
        normalizeTableFilterText(table.section) ===
          normalizeTableFilterText(tableFilters.area)) &&
      (!tableFilters.status ||
        (normalizeTableFilterText(table.status) === "vacant"
          ? "vacant"
          : "occupied") === tableFilters.status) &&
      (!tableFilters.server ||
        (tableFilters.server === "unassigned"
          ? !server
          : server === tableFilters.server.slice(5)))
    );
  });
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

    let events;
    try {
      events = new EventSource(`${API_BASE_URL}/api/events`);
      events.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          const settings =
            message?.payload?.[RESTAURANT_SETTINGS_KEY] ||
            message?.payload?.data?.[RESTAURANT_SETTINGS_KEY];
          if (settings) applySettings(settings);
        } catch {}
      };
    } catch {}

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
        window.alert(
          `Category was not saved: ${result?.error || result?.data?.message || "API error"}`,
        );
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
    tableNumber: "",
    branchId: 1,
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
      });
    }
    setIsItemModalOpen(true);
  };

  const handleSaveItem = async (e) => {
    e.preventDefault();
    if (isImageUploading || !itemForm.name.trim()) return;

    let itemImage = (itemForm.image || "").trim();
    if (!itemImage || itemImage.includes("photo-1563379091339-03b21ab4a4f8")) {
      itemImage = getRelevantLocalFallback(itemForm);
    }

    const isSpecialValue = Boolean(itemForm.isChefSpecial);
    const payload = {
      ...itemForm,
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
      const tNum = String(tbl.tableNumber || tbl.name || tbl.tableName || "").trim();
      setTableForm({
        name: tNum,
        tableNumber: tNum,
        branchId: tbl.branchId || 1,
        section: tbl.section || tbl.location || "",
        capacity: tbl.capacity || 4,
        server: tbl.server || tbl.assignedServerName || staffList[0]?.name || "",
        assignedServerId: tbl.assignedServerId || null,
      });
    } else {
      setEditingTable(null);
      // Auto suggest next table number based on active table count
      const nextNum = `T-${String(tables.length + 1).padStart(2, "0")}`;
      setTableForm({
        name: nextNum,
        tableNumber: nextNum,
        branchId: 1,
        section: "",
        capacity: 4,
        server: staffList[0]?.name || "",
        assignedServerId: staffList[0]?.staffId || staffList[0]?.id || null,
      });
    }
    setIsTableModalOpen(true);
  };

  const handleSaveTable = async (e) => {
    e.preventDefault();
    const rawInput = String(tableForm.tableNumber || tableForm.name || "").trim();
    if (!rawInput) {
      showToast("❌ Table Number / Identifier is required.");
      return;
    }
    const match = rawInput.match(/^(Table|table)[-\s]?(\d+)$/i);
    const tableNum = match
      ? `Table-${match[2]}`
      : (/^\d+$/.test(rawInput) ? `Table-${rawInput}` : rawInput);

    if (tableNum.length > 10) {
      showToast("❌ Table Number / Identifier must not exceed 10 characters.");
      return;
    }

    if (tableForm.section) {
      saveCustomSection(tableForm.section);
    }

    let assignedServer = tableForm.server;
    let assignedServerId = tableForm.assignedServerId || null;

    if (isNewServerMode && newServerName.trim()) {
      assignedServer = newServerName.trim();
      const staffRes = await onAddStaff({
        id: Date.now(),
        name: assignedServer,
        fullName: assignedServer,
        role: newServerRole.trim() || "Server",
        roleTitle: newServerRole.trim() || "Server",
        phone: "+91 98450 00000",
        shift: "Morning",
        isActive: true,
      });
      if (staffRes && typeof staffRes === "object") {
        assignedServerId = staffRes.staffId || staffRes.id || null;
      }
    } else if (tableForm.server) {
      const foundStaff = staffList.find(s =>
        String(s.name || s.fullName || "").toLowerCase() === String(tableForm.server).toLowerCase()
      );
      if (foundStaff) {
        assignedServerId = foundStaff.staffId || foundStaff.id || null;
      }
    }

    let savedResult;
    if (editingTable) {
      savedResult = await onUpdateTable({
        ...editingTable,
        name: tableNum,
        tableName: tableNum,
        tableNumber: tableNum,
        branchId: Number(tableForm.branchId) || editingTable.branchId || 1,
        section: tableForm.section || "Main Hall",
        location: tableForm.section || "Main Hall",
        capacity: Number(tableForm.capacity) || 4,
        server: assignedServer,
        assignedServerId: assignedServerId,
      });
    } else {
      const maxId = tables.reduce((m, t) => Math.max(m, Number(t.id) || 0), 0);
      savedResult = await onAddTable({
        id: maxId + 1,
        name: tableNum,
        tableName: tableNum,
        tableNumber: tableNum,
        branchId: Number(tableForm.branchId) || 1,
        section: tableForm.section || "Main Hall",
        location: tableForm.section || "Main Hall",
        capacity: Number(tableForm.capacity) || 4,
        status: "available",
        guests: 0,
        items: [],
        discountPercent: 0,
        serviceCharge: 5,
        orderTime: null,
        server: assignedServer,
        assignedServerId: assignedServerId,
      });
    }

    if (savedResult !== false) {
      setIsTableModalOpen(false);
      setIsNewServerMode(false);
      setNewServerName("");
    }
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
        id: Date.now(),
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
              background: "rgba(0, 0, 0, 0.82)",
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
        className="no-scrollbar"
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
        />

        {/* Right Main Content Pane */}
        <div
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
          />

          {/* Scrollable Work Area */}
          <div
            className="no-scrollbar"
            style={{
              flex: 1,
              overflowY: "auto",
              scrollbarWidth: "none",
              msOverflowStyle: "none",
              padding: activeTab === "logins" ? "1rem" : "1.5rem 2rem",
              minHeight: 0,
            }}
          >
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
                        background:
                          "linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        boxShadow: "0 3px 12px rgba(245, 158, 11, 0.35)",
                        flexShrink: 0,
                      }}
                    >
                      <Utensils size={18} color="#ffffff" strokeWidth={2.3} />
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
                            color: "#f59e0b",
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
                        background:
                          "linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)",
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
                        <th style={{ padding: "0.6rem 0.85rem", width: "44%" }}>
                          Dish Name
                        </th>
                        <th style={{ padding: "0.6rem 0.85rem", width: "14%" }}>
                          Category
                        </th>
                        <th style={{ padding: "0.6rem 0.85rem", width: "14%" }}>
                          Dietary
                        </th>
                        <th style={{ padding: "0.6rem 0.85rem", width: "12%" }}>
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
                                      {item.prepTime || ""} • {item.description}
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
                                      border:
                                        "1px solid rgba(16, 185, 129, 0.28)",
                                      color: "#10b981",
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
                                      border:
                                        "1px solid rgba(239, 68, 68, 0.28)",
                                      color: "#ef4444",
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
                                  color: "#f59e0b",
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
                                    onClick={() => handleOpenItemModal(item)}
                                    style={{
                                      border:
                                        "1px solid rgba(245, 158, 11, 0.45)",
                                      background: "rgba(245, 158, 11, 0.06)",
                                      color: "#f59e0b",
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
                                      if (
                                        window.confirm(
                                          `Delete "${item.name}" from restaurant menu?`,
                                        )
                                      ) {
                                        onDeleteMenuItem(item.id);
                                      }
                                    }}
                                    style={{
                                      border:
                                        "1px solid rgba(239, 68, 68, 0.45)",
                                      background: "rgba(239, 68, 68, 0.06)",
                                      color: "#ef4444",
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
                                  ? "rgba(255, 255, 255, 0.02)"
                                  : "rgba(255, 255, 255, 0.06)",
                              border: "1px solid rgba(255, 255, 255, 0.08)",
                              color: safeMenuPage === 1 ? "#475569" : "#cbd5e1",
                              cursor:
                                safeMenuPage === 1 ? "not-allowed" : "pointer",
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
                                    : "1px solid rgba(255, 255, 255, 0.08)",
                                  color: isActive ? "#ffffff" : "#94a3b8",
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
                                  ? "rgba(255, 255, 255, 0.02)"
                                  : "rgba(255, 255, 255, 0.06)",
                              border: "1px solid rgba(255, 255, 255, 0.08)",
                              color:
                                safeMenuPage === totalMenuPages
                                  ? "#475569"
                                  : "#cbd5e1",
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
              <div>
                {/* Tables & Chairs Overview Cards */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(4, 1fr)",
                    gap: "0.65rem",
                    marginBottom: "0.85rem",
                  }}
                >
                  <div
                    style={{
                      background: "var(--bg-tertiary)",
                      padding: "0.65rem 0.85rem",
                      borderRadius: "var(--radius-sm)",
                      border: "1px solid var(--border-subtle)",
                    }}
                  >
                    <div
                      style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}
                    >
                      Total Tables
                    </div>
                    <div
                      style={{
                        fontSize: "1.3rem",
                        fontWeight: 800,
                        color: "var(--text-main)",
                      }}
                    >
                      {tables.length}
                    </div>
                  </div>

                  <div
                    style={{
                      background: "var(--bg-tertiary)",
                      padding: "0.65rem 0.85rem",
                      borderRadius: "var(--radius-sm)",
                      border: "1px solid var(--border-subtle)",
                    }}
                  >
                    <div
                      style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}
                    >
                      Total Dining Chairs
                    </div>
                    <div
                      style={{
                        fontSize: "1.3rem",
                        fontWeight: 800,
                        color: "var(--accent-amber-light)",
                      }}
                    >
                      {totalChairs} Chairs
                    </div>
                  </div>

                  <div
                    style={{
                      background: "var(--bg-tertiary)",
                      padding: "0.65rem 0.85rem",
                      borderRadius: "var(--radius-sm)",
                      border: "1px solid var(--border-subtle)",
                    }}
                  >
                    <div
                      style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}
                    >
                      Occupied Chairs (Dining)
                    </div>
                    <div
                      style={{
                        fontSize: "1.3rem",
                        fontWeight: 800,
                        color: "var(--status-occupied)",
                      }}
                    >
                      {occupiedChairs} Persons
                    </div>
                  </div>

                  <div
                    style={{
                      background: "var(--bg-tertiary)",
                      padding: "0.65rem 0.85rem",
                      borderRadius: "var(--radius-sm)",
                      border: "1px solid var(--border-subtle)",
                    }}
                  >
                    <div
                      style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}
                    >
                      Available Chairs
                    </div>
                    <div
                      style={{
                        fontSize: "1.3rem",
                        fontWeight: 800,
                        color: "var(--status-vacant)",
                      }}
                    >
                      {totalChairs - occupiedChairs} Empty
                    </div>
                  </div>
                </div>

                <div
                  className="menu-filter-toolbar"
                  role="search"
                  aria-label="Table filters"
                >
                  <label className="menu-filter-field menu-filter-search">
                    <span>Search Table</span>
                    <input
                      type="search"
                      placeholder="Table number or name..."
                      value={tableFilters.search}
                      onChange={(event) =>
                        updateTableFilter("search", event.target.value)
                      }
                    />
                  </label>
                  {[
                    {
                      key: "area",
                      label: "Area / Location",
                      options: tableAreaOptions.map((area) => ({
                        value: area,
                        label: area,
                      })),
                    },
                    {
                      key: "status",
                      label: "Table Status",
                      options: [
                        { value: "vacant", label: "Vacant" },
                        { value: "occupied", label: "Occupied" },
                      ],
                    },
                    {
                      key: "server",
                      label: "Assigned Server",
                      options: [
                        { value: "unassigned", label: "Unassigned" },
                        ...tableServerOptions.map((name) => ({
                          value: "name:" + normalizeTableFilterText(name),
                          label: name,
                        })),
                      ],
                    },
                  ].map(({ key, label, options }) => (
                    <label className="menu-filter-field" key={key}>
                      <span>{label}</span>
                      <select
                        value={tableFilters[key]}
                        onChange={(event) =>
                          updateTableFilter(key, event.target.value)
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
                    onClick={() => setTableFilters(emptyTableFilters)}
                  >
                    Clear Filters
                  </button>
                </div>

                {/* Action Bar */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "0.75rem",
                  }}
                >
                  <h3
                    style={{
                      fontSize: "0.98rem",
                      fontWeight: 800,
                      color: "var(--text-main)",
                      margin: 0,
                    }}
                  >
                    Floor Tables & Chair Configuration
                  </h3>

                  <button
                    onClick={() => handleOpenTableModal()}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.35rem",
                      padding: "0.45rem 1rem",
                      background: "linear-gradient(135deg, #f59e0b, #ea580c)",
                      color: "#ffffff",
                      borderRadius: "var(--radius-sm)",
                      fontWeight: 700,
                      fontSize: "0.78rem",
                      boxShadow: "0 2px 8px rgba(245, 158, 11, 0.35)",
                      border: "none",
                      cursor: "pointer",
                      height: "32px",
                    }}
                  >
                    <Plus size={15} />
                    <span>Add New Table</span>
                  </button>
                </div>

                {/* Tables Grid with Chairs Management */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fill, minmax(235px, 1fr))",
                    gap: "0.75rem",
                  }}
                >
                  {filteredTables.length === 0 && (
                    <p
                      role="status"
                      style={{
                        color: "var(--text-muted)",
                        gridColumn: "1 / -1",
                        margin: "0.75rem 0",
                      }}
                    >
                      No tables match the selected filters.
                    </p>
                  )}
                  {filteredTables.map((tbl) => (
                    <div
                      key={tbl.id}
                      style={{
                        background: "var(--bg-tertiary)",
                        borderRadius: "10px",
                        border: "1px solid var(--border-subtle)",
                        padding: "0.75rem 0.85rem",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "space-between",
                        position: "relative",
                      }}
                    >
                      <div>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "flex-start",
                            marginBottom: "0.4rem",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "0.45rem",
                            }}
                          >
                            <div
                              style={{
                                width: "30px",
                                height: "30px",
                                borderRadius: "7px",
                                background: "rgba(245, 158, 11, 0.18)",
                                color: "var(--accent-amber-light)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontWeight: 800,
                                fontSize: "0.82rem",
                                flexShrink: 0,
                              }}
                            >
                              {tbl.tableNumber || tbl.name || `T${tbl.id}`}
                            </div>
                            <div>
                              <h4
                                style={{
                                  fontWeight: 800,
                                  color: "var(--text-main)",
                                  fontSize: "0.9rem",
                                  margin: 0,
                                }}
                              >
                                {tbl.name || tbl.tableNumber || `Table ${tbl.id}`}
                              </h4>
                              <span
                                style={{
                                  fontSize: "0.68rem",
                                  color: "var(--text-dim)",
                                }}
                              >
                                {tbl.section}
                              </span>
                            </div>
                          </div>

                          <span
                            style={{
                              padding: "2px 7px",
                              borderRadius: "10px",
                              fontSize: "0.64rem",
                              fontWeight: 700,
                              textTransform: "uppercase",
                              background:
                                (tbl.status === "vacant" || tbl.status === "available")
                                  ? "var(--status-vacant-bg)"
                                  : "var(--status-occupied-bg)",
                              color:
                                (tbl.status === "vacant" || tbl.status === "available")
                                  ? "var(--status-vacant)"
                                  : "var(--status-occupied)",
                            }}
                          >
                            {tbl.status}
                          </span>
                        </div>

                        {/* Chairs and Persons Capacity */}
                        <div
                          style={{
                            background: "var(--bg-secondary)",
                            borderRadius: "var(--radius-sm)",
                            padding: "0.45rem 0.65rem",
                            marginTop: "0.45rem",
                            display: "flex",
                            flexDirection: "column",
                            gap: "0.25rem",
                            fontSize: "0.74rem",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                            }}
                          >
                            <span
                              style={{
                                color: "var(--text-muted)",
                                display: "flex",
                                alignItems: "center",
                                gap: "0.25rem",
                                fontSize: "0.72rem",
                              }}
                            >
                              <Armchair size={13} color="var(--accent-amber)" />
                              <span>Chairs (Capacity):</span>
                            </span>
                            <strong
                              style={{
                                color: "var(--text-main)",
                                fontSize: "0.82rem",
                              }}
                            >
                              {tbl.capacity} Chairs ({tbl.capacity} Persons)
                            </strong>
                          </div>

                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                            }}
                          >
                            <span
                              style={{
                                color: "var(--text-muted)",
                                fontSize: "0.72rem",
                              }}
                            >
                              Assigned Server:
                            </span>
                            <span
                              style={{
                                color: "var(--text-main)",
                                fontWeight: 600,
                                fontSize: "0.74rem",
                              }}
                            >
                              {tbl.server}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Table Actions: Edit Chairs / Delete Table */}
                      <div
                        style={{
                          display: "flex",
                          gap: "0.4rem",
                          marginTop: "0.65rem",
                          paddingTop: "0.55rem",
                          borderTop: "1px solid var(--border-subtle)",
                        }}
                      >
                        <button
                          onClick={() => handleOpenTableModal(tbl)}
                          style={{
                            flex: 1,
                            padding: "0.35rem 0.5rem",
                            background: "var(--bg-secondary)",
                            color: "var(--accent-amber-light)",
                            border: "1px solid var(--border-subtle)",
                            borderRadius: "var(--radius-sm)",
                            fontSize: "0.74rem",
                            fontWeight: 700,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "0.25rem",
                            cursor: "pointer",
                          }}
                        >
                          <Edit3 size={12} />
                          <span>Edit Chairs / Area</span>
                        </button>

                        <button
                          onClick={() => {
                            if (tbl.status !== "vacant" && tbl.status !== "available") {
                              alert(
                                `Cannot delete ${tbl.tableNumber || tbl.name || `Table ${tbl.id}`} because it is currently occupied with diners. Clear or settle bill first.`,
                              );
                              return;
                            }
                            if (
                              window.confirm(`Delete ${tbl.tableNumber || tbl.name || `Table ${tbl.id}`} permanently?`)
                            ) {
                              onDeleteTable(tbl.id);
                            }
                          }}
                          style={{
                            padding: "0.35rem 0.55rem",
                            background: "var(--danger-bg)",
                            color: "var(--danger)",
                            border: "1px solid rgba(239,68,68,0.3)",
                            borderRadius: "var(--radius-sm)",
                            fontSize: "0.74rem",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            cursor: "pointer",
                          }}
                          title="Delete table"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ================= TAB 3: STAFF & PERSONS ================= */}
            {activeTab === "staff" && (
              <div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "1.25rem",
                  }}
                >
                  <div>
                    <h3
                      style={{
                        fontSize: "1.1rem",
                        fontWeight: 800,
                        color: "var(--text-main)",
                      }}
                    >
                      Restaurant Staff & Serving Personnel
                    </h3>
                    <p
                      style={{
                        fontSize: "0.76rem",
                        color: "var(--text-muted)",
                      }}
                    >
                      Manage waiters, table captains and servers handling dining
                      guests
                    </p>
                  </div>

                  <button
                    onClick={() => handleOpenStaffModal()}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.45rem",
                      padding: "0.6rem 1.25rem",
                      background: "linear-gradient(135deg, #f59e0b, #ea580c)",
                      color: "#ffffff",
                      borderRadius: "var(--radius-sm)",
                      fontWeight: 700,
                      fontSize: "0.85rem",
                      boxShadow: "0 2px 8px rgba(245, 158, 11, 0.35)",
                    }}
                  >
                    <Plus size={16} />
                    <span>Add New Person (Staff)</span>
                  </button>
                </div>

                {/* Staff Cards Grid */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fill, minmax(280px, 1fr))",
                    gap: "1rem",
                  }}
                >
                  {staffList.map((person) => {
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
                      (t) => t.server === personName,
                    ).length;

                    return (
                      <div
                        key={personId ?? personName}
                        style={{
                          background: "var(--bg-tertiary)",
                          borderRadius: "var(--radius-md)",
                          border: "1px solid var(--border-subtle)",
                          padding: "1.1rem",
                          display: "flex",
                          flexDirection: "column",
                          justifyContent: "space-between",
                        }}
                      >
                        <div>
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "flex-start",
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
                                  width: "40px",
                                  height: "40px",
                                  borderRadius: "50%",
                                  background: "var(--accent-amber)",
                                  color: "#000000",
                                  fontWeight: 800,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  fontSize: "1rem",
                                }}
                              >
                                {personName.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <h4
                                  style={{
                                    fontWeight: 800,
                                    color: "var(--text-main)",
                                    fontSize: "1rem",
                                  }}
                                >
                                  {personName}
                                </h4>
                                <span
                                  style={{
                                    fontSize: "0.74rem",
                                    color: "var(--accent-amber-light)",
                                    fontWeight: 600,
                                  }}
                                >
                                  {personRole}
                                </span>
                              </div>
                            </div>

                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "0.25rem",
                              }}
                            >
                              <button
                                onClick={() => handleOpenStaffModal(person)}
                                style={{
                                  background: "transparent",
                                  color: "var(--text-dim)",
                                  padding: "4px",
                                  cursor: "pointer",
                                }}
                                title="Edit staff details"
                              >
                                <SquarePen size={14} />
                              </button>

                              <button
                                onClick={() => {
                                  if (
                                    window.confirm(
                                      `Remove ${personName} from staff list?`,
                                    )
                                  ) {
                                    onDeleteStaff(personId);
                                  }
                                }}
                                style={{
                                  background: "transparent",
                                  color: "var(--text-dim)",
                                  padding: "4px",
                                  cursor: "pointer",
                                }}
                                title="Remove staff member"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>

                          <div
                            style={{
                              marginTop: "0.85rem",
                              fontSize: "0.78rem",
                              color: "var(--text-muted)",
                              display: "flex",
                              flexDirection: "column",
                              gap: "0.3rem",
                            }}
                          >
                            <div>
                              Phone:{" "}
                              <strong style={{ color: "var(--text-main)" }}>
                                {person.phone}
                              </strong>
                            </div>
                            <div>
                              Shift:{" "}
                              <strong style={{ color: "var(--text-main)" }}>
                                {person.shift}
                              </strong>
                            </div>
                            <div>
                              Tables Assigned:{" "}
                              <strong style={{ color: "var(--status-vacant)" }}>
                                {assignedCount} Tables
                              </strong>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
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
                      Select any table number to inspect orders received from
                      table and preparation completed status
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

                {/* Table Number Selector Strip */}
                <div
                  style={{
                    background: "var(--bg-primary)",
                    padding: "0.65rem 1rem",
                    borderRadius: "var(--radius-md)",
                    border: "1px solid var(--border-subtle)",
                    marginBottom: "1.25rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    overflowX: "auto",
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
                      marginRight: "0.5rem",
                      flexShrink: 0,
                    }}
                  >
                    <Filter size={14} />
                    <span>TABLE NO:</span>
                  </div>

                  <button
                    onClick={() => setAdminKotTableFilter("all")}
                    style={{
                      padding: "0.4rem 0.8rem",
                      borderRadius: "5px",
                      fontSize: "0.78rem",
                      fontWeight: adminKotTableFilter === "all" ? 800 : 500,
                      background:
                        adminKotTableFilter === "all"
                          ? "var(--accent-amber)"
                          : "var(--bg-secondary)",
                      color:
                        adminKotTableFilter === "all"
                          ? "#000000"
                          : "var(--text-muted)",
                      border:
                        adminKotTableFilter === "all"
                          ? "1px solid var(--accent-amber)"
                          : "1px solid var(--border-subtle)",
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                    }}
                  >
                    All Active Tables ({tablesWithOrders.length})
                  </button>

                  {tables.map((tbl) => {
                    const hasOrders = tbl.items && tbl.items.length > 0;
                    const isCompleted =
                      hasOrders &&
                      tbl.items.every(
                        (i) =>
                          i.kotStatus === "served" || i.kotStatus === "ready",
                      );
                    const isSelected =
                      adminKotTableFilter === tbl.id ||
                      adminKotTableFilter === tbl.name;
                    const dotColor = isCompleted
                      ? "#10b981"
                      : hasOrders
                        ? "#f59e0b"
                        : "#64748b";

                    return (
                      <button
                        key={tbl.id}
                        onClick={() => setAdminKotTableFilter(tbl.id)}
                        style={{
                          padding: "0.4rem 0.75rem",
                          borderRadius: "5px",
                          fontSize: "0.78rem",
                          fontWeight: isSelected ? 800 : 500,
                          background: isSelected
                            ? "linear-gradient(135deg, #f59e0b, #ea580c)"
                            : hasOrders
                              ? "rgba(245, 158, 11, 0.12)"
                              : "var(--bg-secondary)",
                          color: isSelected
                            ? "#ffffff"
                            : hasOrders
                              ? "var(--text-main)"
                              : "var(--text-muted)",
                          border: isSelected
                            ? "1px solid #ea580c"
                            : "1px solid var(--border-subtle)",
                          cursor: "pointer",
                          whiteSpace: "nowrap",
                          display: "flex",
                          alignItems: "center",
                          gap: "0.35rem",
                        }}
                      >
                        <span
                          style={{
                            width: "6px",
                            height: "6px",
                            borderRadius: "50%",
                            background: dotColor,
                          }}
                        />
                        <span>{tbl.name}</span>
                        {hasOrders && (
                          <span
                            style={{
                              background: isSelected
                                ? "#000000"
                                : "rgba(0,0,0,0.3)",
                              color: isSelected
                                ? "#ffffff"
                                : isCompleted
                                  ? "#10b981"
                                  : "#f59e0b",
                              padding: "1px 5px",
                              borderRadius: "6px",
                              fontSize: "0.65rem",
                              fontWeight: 800,
                            }}
                          >
                            {tbl.items.length}
                          </span>
                        )}
                      </button>
                    );
                  })}
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
                          Orders dispatched from dining tables will appear here
                          live.
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
                          adminKotTableFilter !== "all" ? "center" : "stretch",
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
                        let statusColor = "#f59e0b";
                        let statusBg = "rgba(245, 158, 11, 0.15)";

                        if (allCompleted) {
                          statusBadge = "PREPARATION COMPLETED";
                          statusColor = "#10b981";
                          statusBg = "rgba(16, 185, 129, 0.15)";
                        } else if (isCooking) {
                          statusBadge = "PREPARING / COOKING";
                          statusColor = "#ea580c";
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
                                  border: `1px solid ${statusColor}40`,
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
                                              color: "#f87171",
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
                                      background:
                                        "linear-gradient(135deg, #10b981, #059669)",
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
                                      color: "#10b981",
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
              />
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
            background: "rgba(0,0,0,0.8)",
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
              maxWidth: "520px",
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
                Dish Image (Local Preset or Upload)
              </label>

              {/* Local Presets Pill Selector */}
              <div style={{ marginBottom: "8px" }}>
                <span
                  style={{
                    fontSize: "0.75rem",
                    color: "var(--text-muted)",
                    display: "block",
                    marginBottom: "4px",
                  }}
                >
                  Select from local asset presets:
                </span>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                  {LOCAL_IMAGE_PRESETS.map((preset) => {
                    const isSelected = itemForm.image === preset.path;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() =>
                          setItemForm((curr) => ({
                            ...curr,
                            image: preset.path,
                          }))
                        }
                        style={{
                          fontSize: "0.74rem",
                          fontWeight: 600,
                          padding: "4px 8px",
                          borderRadius: "6px",
                          border: isSelected
                            ? "1.5px solid var(--color-primary, #ea580c)"
                            : "1px solid var(--border-subtle)",
                          background: isSelected
                            ? "rgba(234, 88, 12, 0.15)"
                            : "var(--bg-tertiary)",
                          color: isSelected
                            ? "var(--color-primary, #ea580c)"
                            : "var(--text-main)",
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                        }}
                      >
                        <span>{preset.icon}</span>
                        <span>{preset.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* File Upload Input */}
              <input
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

              {/* Dish Image Live Preview */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  marginTop: "8px",
                  padding: "6px 10px",
                  borderRadius: "8px",
                  background: "var(--bg-tertiary)",
                  border: "1px dashed var(--border-subtle)",
                }}
              >
                <img
                  src={getMenuItemImage(itemForm)}
                  alt="Dish preview"
                  onError={(e) => handleDishImageError(e, itemForm)}
                  style={{
                    width: "56px",
                    height: "44px",
                    objectFit: "cover",
                    borderRadius: "6px",
                    border: "1px solid var(--border-card)",
                    background: "#0f172a",
                    flexShrink: 0,
                  }}
                />
                <div
                  style={{ fontSize: "0.76rem", color: "var(--text-muted)" }}
                >
                  <div style={{ fontWeight: 600, color: "var(--text-main)" }}>
                    Live Preview
                  </div>
                  <div>Relevant image saved locally for all devices</div>
                </div>
              </div>
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
            background: "rgba(0,0,0,0.7)",
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
                Table Number / Identifier{" "}
                <span style={{ color: "#ea580c" }}>*</span>
              </label>
              <input
                type="text"
                required
                maxLength={10}
                placeholder="e.g. Table-1, Table-2"
                value={tableForm.tableNumber || tableForm.name}
                onChange={(e) =>
                  setTableForm({
                    ...tableForm,
                    name: e.target.value,
                    tableNumber: e.target.value,
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
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
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
                <button
                  type="button"
                  onClick={() => {
                    setIsNewServerMode(!isNewServerMode);
                    if (!isNewServerMode) setNewServerName("");
                  }}
                  style={{
                    background: isNewServerMode
                      ? "rgba(245, 158, 11, 0.18)"
                      : "var(--bg-tertiary)",
                    color: isNewServerMode
                      ? "var(--accent-amber)"
                      : "var(--text-main)",
                    border: isNewServerMode
                      ? "1.5px solid var(--accent-amber)"
                      : "1px solid var(--border-subtle)",
                    borderRadius: "6px",
                    padding: "3px 10px",
                    fontSize: "0.74rem",
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                >
                  <Plus size={12} />
                  <span>
                    {isNewServerMode
                      ? "Select Existing Staff"
                      : "Add New Server Name"}
                  </span>
                </button>
              </div>

              {!isNewServerMode ? (
                <CustomCreatableDropdown
                  value={tableForm.server}
                  onChange={(val) => {
                    if (val === "__add_new__") {
                      setIsNewServerMode(true);
                      setNewServerName("");
                    } else {
                      setTableForm({ ...tableForm, server: val });
                    }
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
              ) : (
                <div
                  style={{
                    background: "rgba(245, 158, 11, 0.08)",
                    border: "1.5px solid var(--accent-amber)",
                    borderRadius: "8px",
                    padding: "0.85rem",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.6rem",
                  }}
                >
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <input
                      type="text"
                      placeholder="Enter New Server Name (e.g. Ramesh K.)"
                      value={newServerName}
                      onChange={(e) => setNewServerName(e.target.value)}
                      required={isNewServerMode}
                      autoFocus
                      style={{
                        flex: 2,
                        background: "var(--bg-secondary)",
                        border: "1.5px solid var(--accent-amber)",
                        borderRadius: "6px",
                        padding: "0.6rem 0.75rem",
                        color: "var(--text-main)",
                        fontWeight: 600,
                        fontSize: "0.88rem",
                        outline: "none",
                      }}
                    />
                    <CustomCreatableDropdown
                      value={newServerRole}
                      onChange={(val) => setNewServerRole(val)}
                      options={allRoleOptions}
                      placeholder="Select or type role..."
                      allowCustom
                      onSaveCustomOption={saveCustomRole}
                      style={{ flex: 1 }}
                    />
                  </div>
                  <p
                    style={{
                      fontSize: "0.74rem",
                      color: "var(--accent-amber)",
                      margin: 0,
                      fontWeight: 600,
                    }}
                  >
                    💡 This new server will be assigned to this table and
                    automatically saved to your Staff personnel list!
                  </p>
                </div>
              )}
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
            background: "rgba(0,0,0,0.7)",
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
    </div>
  );
}
