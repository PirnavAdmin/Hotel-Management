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
  ChevronDown,
  Package,
  FileText,
  BarChart3,
  Settings,
  Wine,
  Beer,
  Martini,
  GlassWater,
  Sparkles,
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
import { apiGetInventory } from "../api/inventoryApi";
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
  inventory: propInventory = [],
}) {
  const [activeTab, setActiveTab] = useState("overview");

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
      return localStorage.getItem("avsr_portal_mode") || "dine";
    } catch {
      return "dine";
    }
  });

  const [activeBarTab, setActiveBarTab] = useState(() => {
    try {
      const saved = localStorage.getItem("avsr_active_bar_tab");
      return saved || "";
    } catch {
      return "";
    }
  });

  const handlePortalModeChange = (mode) => {
    setPortalMode(mode);
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

  const renderBarWorkspace = () => {
    return (
      <div
        style={{
          minHeight: "420px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          padding: "3.5rem 1.5rem",
          background: "var(--bg-card)",
          border: "1.5px dashed var(--border-card)",
          borderRadius: "16px",
        }}
      >
        <div
          style={{
            width: "72px",
            height: "72px",
            borderRadius: "50%",
            background: "rgba(234, 88, 12, 0.12)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: "1.2rem",
            color: "#ea580c",
          }}
        >
          <Wine size={36} />
        </div>
        <h2
          style={{
            fontSize: "1.45rem",
            fontWeight: 800,
            color: "var(--text-main)",
            marginBottom: "0.5rem",
          }}
        >
          {activeBarTab ? `Bar - ${activeBarTab}` : "Bar Workspace"}
        </h2>
        <p
          style={{
            maxWidth: "460px",
            fontSize: "0.92rem",
            color: "var(--text-muted)",
            lineHeight: 1.55,
            margin: 0,
          }}
        >
          You are currently in Bar mode.
        </p>
      </div>
    );
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
  const emptyTableFilters = {
    search: "",
    area: "",
    capacity: "",
    status: "",
    server: "",
  };
  const [tableFilters, setTableFilters] = useState(emptyTableFilters);
  const updateTableFilter = (key, value) =>
    setTableFilters((previous) => ({ ...previous, [key]: value }));
  const clearTableFilters = () => setTableFilters(emptyTableFilters);
  const hasActiveTableFilters = Boolean(
    tableFilters.search ||
    tableFilters.area ||
    tableFilters.capacity ||
    tableFilters.status ||
    tableFilters.server
  );

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

  const tableCapacityOptions = [
    ...new Set(tables.map((table) => Number(table.capacity || 0)).filter(Boolean)),
  ].sort((a, b) => a - b);

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
    const area = normalizeTableFilterText(table.section);
    const status = normalizeTableFilterText(table.status) === "vacant" ? "vacant" : "occupied";
    const capacity = String(table.capacity || "");

    const matchesSearch =
      !query ||
      [
        table.name,
        table.tableNumber,
        table.number,
        table.id,
        `table ${table.id}`,
        `t${table.id}`,
      ].some((value) => normalizeTableFilterText(value).includes(query));

    const matchesArea =
      !tableFilters.area ||
      area === normalizeTableFilterText(tableFilters.area);

    const matchesCapacity =
      !tableFilters.capacity ||
      capacity === String(tableFilters.capacity);

    const matchesServer =
      !tableFilters.server ||
      (tableFilters.server === "unassigned"
        ? !server || server === "unassigned" || server === "staff"
        : server === normalizeTableFilterText(tableFilters.server));

    const matchesStatus =
      !tableFilters.status ||
      status === normalizeTableFilterText(tableFilters.status);

    return (
      matchesSearch &&
      matchesArea &&
      matchesCapacity &&
      matchesServer &&
      matchesStatus
    );
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
        aVal = String(a.status || "").toLowerCase();
        bVal = String(b.status || "").toLowerCase();
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
    if (itemImage.includes("photo-1563379091339-03b21ab4a4f8")) {
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
      const maxId = tables.reduce((m, t) => Math.max(m, Number(t.id) || 0), 0);
      onAddTable({
        id: maxId + 1,
        name: tableForm.name,
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
          portalMode={portalMode}
          activeBarTab={activeBarTab}
          setActiveBarTab={setActiveBarTab}
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
            activeMode={portalMode}
            onModeChange={handlePortalModeChange}
            showModeToggle={showBarHeaderToggle}
          />

          {/* Scrollable Work Area */}
          <div
            id="admin-work-area"
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
              renderBarWorkspace()
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
                            background:
                              "linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)",
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
                                    borderBottom:
                                      "1px solid var(--border-subtle)",
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
                                          background:
                                            "rgba(16, 185, 129, 0.12)",
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
                                        onClick={() =>
                                          handleOpenItemModal(item)
                                        }
                                        style={{
                                          border:
                                            "1px solid rgba(245, 158, 11, 0.45)",
                                          background:
                                            "rgba(245, 158, 11, 0.06)",
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
                                          requestDelete({
                                            title: "Delete Menu Item?",
                                            message: `Are you sure you want to delete "${item.name}" from the restaurant menu? This action cannot be undone.`,
                                            confirmLabel: "Yes, Delete",
                                            onConfirm: () =>
                                              onDeleteMenuItem(item.id),
                                          });
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
                                  color:
                                    safeMenuPage === 1 ? "#475569" : "#cbd5e1",
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
                            color: "#f59e0b",
                          }}
                        >
                          <Armchair size={22} color="#f59e0b" />
                        </div>
                        <h2
                          style={{
                            fontSize: "1.25rem",
                            fontWeight: 800,
                            color: "#ffffff",
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
                        background: "rgba(6, 17, 31, 0.6)",
                        borderRadius: "10px",
                        border: "1px solid rgba(255, 255, 255, 0.05)",
                        overflow: "hidden",
                      }}
                    >
                      <div style={{ overflowX: "auto" }}>
                        <div style={{ minWidth: "960px", padding: "0.6rem" }}>
                          {/* Column Filters (Replacing header text) */}
                          <div
                            style={{
                              display: "grid",
                              gridTemplateColumns: "1.3fr 1.3fr 1.6fr 1.3fr 1.1fr 2.4fr",
                              alignItems: "center",
                              padding: "0.55rem 1.1rem",
                              background: "#081628",
                              borderRadius: "8px",
                              marginBottom: "0.5rem",
                              color: "#7e9bb7",
                              fontSize: "0.78rem",
                              gap: "0.6rem",
                            }}
                          >
                            {/* Col 1: Table # Search Filter */}
                            <div>
                              <div style={{ position: "relative" }}>
                                <Search
                                  size={12}
                                  color="#7e9bb7"
                                  style={{
                                    position: "absolute",
                                    left: "8px",
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
                                    background: "#0c1829",
                                    border: tableFilters.search
                                      ? "1px solid #f59e0b"
                                      : "1px solid rgba(255, 255, 255, 0.12)",
                                    borderRadius: "6px",
                                    color: "#f1f5f9",
                                    fontSize: "0.78rem",
                                    outline: "none",
                                    boxSizing: "border-box",
                                  }}
                                />
                              </div>
                            </div>

                            {/* Col 2: Area Filter */}
                            <div>
                              <select
                                value={tableFilters.area}
                                onChange={(e) => updateTableFilter("area", e.target.value)}
                                style={{
                                  width: "100%",
                                  padding: "0.42rem 0.5rem",
                                  background: "#0c1829",
                                  border: tableFilters.area
                                    ? "1px solid #f59e0b"
                                    : "1px solid rgba(255, 255, 255, 0.12)",
                                  borderRadius: "6px",
                                  color: tableFilters.area ? "#f59e0b" : "#f1f5f9",
                                  fontSize: "0.78rem",
                                  outline: "none",
                                  cursor: "pointer",
                                  boxSizing: "border-box",
                                }}
                              >
                                <option value="" style={{ background: "#0c1829", color: "#94a3b8" }}>
                                  All Areas
                                </option>
                                {tableAreaOptions.map((area) => (
                                  <option key={area} value={area} style={{ background: "#0c1829", color: "#fff" }}>
                                    {area}
                                  </option>
                                ))}
                              </select>
                            </div>

                            {/* Col 3: Chairs / Capacity Filter */}
                            <div>
                              <select
                                value={tableFilters.capacity}
                                onChange={(e) => updateTableFilter("capacity", e.target.value)}
                                style={{
                                  width: "100%",
                                  padding: "0.42rem 0.5rem",
                                  background: "#0c1829",
                                  border: tableFilters.capacity
                                    ? "1px solid #f59e0b"
                                    : "1px solid rgba(255, 255, 255, 0.12)",
                                  borderRadius: "6px",
                                  color: tableFilters.capacity ? "#f59e0b" : "#f1f5f9",
                                  fontSize: "0.78rem",
                                  outline: "none",
                                  cursor: "pointer",
                                  boxSizing: "border-box",
                                }}
                              >
                                <option value="" style={{ background: "#0c1829", color: "#94a3b8" }}>
                                  All Chairs / Capacity
                                </option>
                                {tableCapacityOptions.map((cap) => (
                                  <option key={cap} value={cap} style={{ background: "#0c1829", color: "#fff" }}>
                                    {cap} Chairs
                                  </option>
                                ))}
                              </select>
                            </div>

                            {/* Col 4: Assigned Server Filter */}
                            <div>
                              <select
                                value={tableFilters.server}
                                onChange={(e) => updateTableFilter("server", e.target.value)}
                                style={{
                                  width: "100%",
                                  padding: "0.42rem 0.5rem",
                                  background: "#0c1829",
                                  border: tableFilters.server
                                    ? "1px solid #f59e0b"
                                    : "1px solid rgba(255, 255, 255, 0.12)",
                                  borderRadius: "6px",
                                  color: tableFilters.server ? "#f59e0b" : "#f1f5f9",
                                  fontSize: "0.78rem",
                                  outline: "none",
                                  cursor: "pointer",
                                  boxSizing: "border-box",
                                }}
                              >
                                <option value="" style={{ background: "#0c1829", color: "#94a3b8" }}>
                                  All Assigned Servers
                                </option>
                                <option value="unassigned" style={{ background: "#0c1829", color: "#fff" }}>
                                  Unassigned
                                </option>
                                {tableServerOptions.map((srv) => (
                                  <option key={srv} value={srv} style={{ background: "#0c1829", color: "#fff" }}>
                                    {srv}
                                  </option>
                                ))}
                              </select>
                            </div>

                            {/* Col 5: Status Filter */}
                            <div>
                              <select
                                value={tableFilters.status}
                                onChange={(e) => updateTableFilter("status", e.target.value)}
                                style={{
                                  width: "100%",
                                  padding: "0.42rem 0.5rem",
                                  background: "#0c1829",
                                  border: tableFilters.status
                                    ? "1px solid #f59e0b"
                                    : "1px solid rgba(255, 255, 255, 0.12)",
                                  borderRadius: "6px",
                                  color: tableFilters.status ? "#f59e0b" : "#f1f5f9",
                                  fontSize: "0.78rem",
                                  outline: "none",
                                  cursor: "pointer",
                                  boxSizing: "border-box",
                                }}
                              >
                                <option value="" style={{ background: "#0c1829", color: "#94a3b8" }}>
                                  All Status
                                </option>
                                <option value="vacant" style={{ background: "#0c1829", color: "#fff" }}>
                                  Vacant
                                </option>
                                <option value="occupied" style={{ background: "#0c1829", color: "#fff" }}>
                                  Occupied
                                </option>
                              </select>
                            </div>

                            {/* Col 6: Seat Configuration / Reset Filter */}
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
                                    color: "#ef4444",
                                    padding: "0.42rem 0.75rem",
                                    borderRadius: "6px",
                                    fontSize: "0.78rem",
                                    fontWeight: 700,
                                    cursor: "pointer",
                                    transition: "all 0.15s ease",
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.background = "rgba(239, 68, 68, 0.25)";
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.background = "rgba(239, 68, 68, 0.15)";
                                  }}
                                  title="Clear all active table filters"
                                >
                                  <RotateCcw size={12} />
                                  <span>Reset Filters</span>
                                </button>
                              ) : (
                                <span style={{ fontSize: "0.76rem", color: "#64748b", fontWeight: 500 }}>
                                  Showing all {tables.length} tables
                                </span>
                              )}
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
                                    color: "#f59e0b",
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
                            const rawStatus = String(tbl.status || "").toLowerCase();
                            const isOccupied = rawStatus === "occupied";
                            const isVacant = rawStatus === "vacant";

                            let dotColor = "#10b981";
                            let textColor = "#10b981";
                            let bgColor = "rgba(16, 185, 129, 0.12)";
                            let borderColor = "rgba(16, 185, 129, 0.3)";
                            let label = "AVAILABLE";

                            if (isOccupied) {
                              dotColor = "#f59e0b";
                              textColor = "#f59e0b";
                              bgColor = "rgba(245, 158, 11, 0.12)";
                              borderColor = "rgba(245, 158, 11, 0.3)";
                              label = "OCCUPIED";
                            } else if (isVacant) {
                              dotColor = "#06b6d4";
                              textColor = "#06b6d4";
                              bgColor = "rgba(6, 182, 212, 0.12)";
                              borderColor = "rgba(6, 182, 212, 0.3)";
                              label = "VACANT";
                            }

                            return (
                              <div
                                key={tbl.id}
                                style={{
                                  display: "grid",
                                  gridTemplateColumns: "1.3fr 1.3fr 1.6fr 1.3fr 1.1fr 2.4fr",
                                  alignItems: "center",
                                  padding: "0.58rem 1.1rem",
                                  background: "#081627",
                                  border: "1px solid rgba(255, 255, 255, 0.05)",
                                  borderRadius: "8px",
                                  marginBottom: "0.45rem",
                                  transition: "background 0.15s ease, border-color 0.15s ease",
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.background = "#0c1f36";
                                  e.currentTarget.style.borderColor = "rgba(245, 158, 11, 0.3)";
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.background = "#081627";
                                  e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.05)";
                                }}
                              >
                                {/* Col 1: Table # */}
                                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                                  <div
                                    style={{
                                      width: "28px",
                                      height: "28px",
                                      borderRadius: "6px",
                                      background: "rgba(245, 158, 11, 0.15)",
                                      color: "#f59e0b",
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      fontWeight: 800,
                                      fontSize: "0.8rem",
                                      flexShrink: 0,
                                    }}
                                  >
                                    T{tbl.id}
                                  </div>
                                  <span
                                    style={{
                                      fontWeight: 700,
                                      color: "#ffffff",
                                      fontSize: "0.88rem",
                                      whiteSpace: "nowrap",
                                    }}
                                  >
                                    {tbl.name || `Table ${tbl.id}`}
                                  </span>
                                </div>

                                {/* Col 2: Area */}
                                <div
                                  style={{
                                    color: "#cbd5e1",
                                    fontSize: "0.84rem",
                                    fontWeight: 500,
                                  }}
                                >
                                  {tbl.section || "Main Hall"}
                                </div>

                                {/* Col 3: Chairs / Capacity */}
                                <div
                                  style={{
                                    color: "#cbd5e1",
                                    fontSize: "0.84rem",
                                    fontWeight: 500,
                                  }}
                                >
                                  {tbl.capacity} Chairs / {tbl.capacity} Persons
                                </div>

                                {/* Col 4: Assigned Server */}
                                <div
                                  style={{
                                    color: "#cbd5e1",
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
                                <div style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
                                  {/* Edit Chairs / Area */}
                                  <button
                                    type="button"
                                    onClick={() => handleOpenTableModal(tbl)}
                                    style={{
                                      display: "inline-flex",
                                      alignItems: "center",
                                      gap: "0.35rem",
                                      padding: "0.35rem 0.75rem",
                                      background: "rgba(245, 158, 11, 0.08)",
                                      color: "#f59e0b",
                                      border: "1px solid rgba(245, 158, 11, 0.45)",
                                      borderRadius: "6px",
                                      fontSize: "0.74rem",
                                      fontWeight: 700,
                                      cursor: "pointer",
                                      transition: "all 0.15s ease",
                                      whiteSpace: "nowrap",
                                    }}
                                    onMouseEnter={(e) => {
                                      e.currentTarget.style.background = "rgba(245, 158, 11, 0.2)";
                                      e.currentTarget.style.borderColor = "#f59e0b";
                                    }}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.style.background = "rgba(245, 158, 11, 0.08)";
                                      e.currentTarget.style.borderColor = "rgba(245, 158, 11, 0.45)";
                                    }}
                                  >
                                    <Edit3 size={13} color="#f59e0b" />
                                    <span>Edit Chairs / Area</span>
                                  </button>

                                  {/* Delete Table */}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (tbl.status === "occupied") {
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
                                      padding: "0.35rem 0.55rem",
                                      background: "rgba(239, 68, 68, 0.08)",
                                      color: "#ef4444",
                                      border: "1px solid rgba(239, 68, 68, 0.35)",
                                      borderRadius: "6px",
                                      fontSize: "0.74rem",
                                      cursor: "pointer",
                                      transition: "all 0.15s ease",
                                    }}
                                    onMouseEnter={(e) => {
                                      e.currentTarget.style.background = "rgba(239, 68, 68, 0.22)";
                                      e.currentTarget.style.borderColor = "#ef4444";
                                    }}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.style.background = "rgba(239, 68, 68, 0.08)";
                                      e.currentTarget.style.borderColor = "rgba(239, 68, 68, 0.35)";
                                    }}
                                    title="Delete table"
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
                  </div>
                )}

                {/* ================= TAB 3: STAFF & PERSONS ================= */}
                {activeTab === "staff" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
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
                            color: "#f59e0b",
                          }}
                        >
                          <Users size={22} color="#f59e0b" />
                        </div>
                        <div>
                          <h2
                            style={{
                              fontSize: "1.25rem",
                              fontWeight: 800,
                              color: "#ffffff",
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
                        background: "rgba(6, 17, 31, 0.6)",
                        borderRadius: "10px",
                        border: "1px solid rgba(255, 255, 255, 0.05)",
                        overflow: "hidden",
                      }}
                    >
                      <div style={{ overflowX: "auto" }}>
                        <div style={{ minWidth: "1100px", padding: "0.6rem" }}>
                          {/* Column Filters Bar (Matching Image 2 header) */}
                          <div
                            style={{
                              display: "grid",
                              gridTemplateColumns:
                                "minmax(160px, 1.4fr) minmax(130px, 1.2fr) minmax(130px, 1.2fr) minmax(240px, 2.4fr) minmax(110px, 1fr) minmax(140px, 1.2fr)",
                              alignItems: "center",
                              padding: "0.55rem 1.1rem",
                              background: "#081628",
                              borderRadius: "8px",
                              marginBottom: "0.5rem",
                              color: "#7e9bb7",
                              fontSize: "0.78rem",
                              gap: "0.6rem",
                            }}
                          >
                            {/* Col 1: Search Filter */}
                            <div>
                              <div style={{ position: "relative" }}>
                                <Search
                                  size={12}
                                  color="#7e9bb7"
                                  style={{
                                    position: "absolute",
                                    left: "8px",
                                    top: "50%",
                                    transform: "translateY(-50%)",
                                    pointerEvents: "none",
                                  }}
                                />
                                <input
                                  type="text"
                                  placeholder="Search Staff Name..."
                                  value={staffFilters.search}
                                  onChange={(e) => updateStaffFilter("search", e.target.value)}
                                  style={{
                                    width: "100%",
                                    padding: "0.42rem 0.5rem 0.42rem 1.6rem",
                                    background: "#0c1829",
                                    border: staffFilters.search
                                      ? "1px solid #f59e0b"
                                      : "1px solid rgba(255, 255, 255, 0.12)",
                                    borderRadius: "6px",
                                    color: "#f1f5f9",
                                    fontSize: "0.78rem",
                                    outline: "none",
                                    boxSizing: "border-box",
                                  }}
                                />
                              </div>
                            </div>

                            {/* Col 2: Role Filter */}
                            <div>
                              <select
                                value={staffFilters.role}
                                onChange={(e) => updateStaffFilter("role", e.target.value)}
                                style={{
                                  width: "100%",
                                  padding: "0.42rem 0.5rem",
                                  background: "#0c1829",
                                  border: staffFilters.role
                                    ? "1px solid #f59e0b"
                                    : "1px solid rgba(255, 255, 255, 0.12)",
                                  borderRadius: "6px",
                                  color: staffFilters.role ? "#f59e0b" : "#f1f5f9",
                                  fontSize: "0.78rem",
                                  outline: "none",
                                  cursor: "pointer",
                                  boxSizing: "border-box",
                                }}
                              >
                                <option value="" style={{ background: "#0c1829", color: "#94a3b8" }}>
                                  All Roles
                                </option>
                                {staffRoleOptions.map((role) => (
                                  <option key={role} value={role} style={{ background: "#0c1829", color: "#fff" }}>
                                    {role}
                                  </option>
                                ))}
                              </select>
                            </div>

                            {/* Col 3: Phone Header */}
                            <div>
                              <span style={{ color: "#7e9bb7", fontWeight: 600, fontSize: "0.78rem", paddingLeft: "4px" }}>
                                Phone / Contact
                              </span>
                            </div>

                            {/* Col 4: Shift Filter */}
                            <div>
                              <select
                                value={staffFilters.shift}
                                onChange={(e) => updateStaffFilter("shift", e.target.value)}
                                style={{
                                  width: "100%",
                                  padding: "0.42rem 0.5rem",
                                  background: "#0c1829",
                                  border: staffFilters.shift
                                    ? "1px solid #f59e0b"
                                    : "1px solid rgba(255, 255, 255, 0.12)",
                                  borderRadius: "6px",
                                  color: staffFilters.shift ? "#f59e0b" : "#f1f5f9",
                                  fontSize: "0.78rem",
                                  outline: "none",
                                  cursor: "pointer",
                                  boxSizing: "border-box",
                                }}
                              >
                                <option value="" style={{ background: "#0c1829", color: "#94a3b8" }}>
                                  All Shifts
                                </option>
                                {staffShiftOptions.map((shift) => (
                                  <option key={shift} value={shift} style={{ background: "#0c1829", color: "#fff" }}>
                                    {shift}
                                  </option>
                                ))}
                              </select>
                            </div>

                            {/* Col 5: Assigned Tables Filter */}
                            <div>
                              <select
                                value={staffFilters.assigned}
                                onChange={(e) => updateStaffFilter("assigned", e.target.value)}
                                style={{
                                  width: "100%",
                                  padding: "0.42rem 0.5rem",
                                  background: "#0c1829",
                                  border: staffFilters.assigned
                                    ? "1px solid #f59e0b"
                                    : "1px solid rgba(255, 255, 255, 0.12)",
                                  borderRadius: "6px",
                                  color: staffFilters.assigned ? "#f59e0b" : "#f1f5f9",
                                  fontSize: "0.78rem",
                                  outline: "none",
                                  cursor: "pointer",
                                  boxSizing: "border-box",
                                }}
                              >
                                <option value="" style={{ background: "#0c1829", color: "#94a3b8" }}>
                                  All Assigned Status
                                </option>
                                <option value="assigned" style={{ background: "#0c1829", color: "#fff" }}>
                                  Has Tables Assigned
                                </option>
                                <option value="unassigned" style={{ background: "#0c1829", color: "#fff" }}>
                                  No Tables Assigned
                                </option>
                              </select>
                            </div>

                            {/* Col 6: Reset / Count */}
                            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                              {hasActiveStaffFilters ? (
                                <button
                                  type="button"
                                  onClick={clearStaffFilters}
                                  style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "0.35rem",
                                    background: "rgba(239, 68, 68, 0.15)",
                                    border: "1px solid rgba(239, 68, 68, 0.4)",
                                    color: "#ef4444",
                                    padding: "0.42rem 0.75rem",
                                    borderRadius: "6px",
                                    fontSize: "0.78rem",
                                    fontWeight: 700,
                                    cursor: "pointer",
                                    transition: "all 0.15s ease",
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.background = "rgba(239, 68, 68, 0.25)";
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.background = "rgba(239, 68, 68, 0.15)";
                                  }}
                                  title="Clear all active staff filters"
                                >
                                  <RotateCcw size={12} />
                                  <span>Reset Filters</span>
                                </button>
                              ) : (
                                <span style={{ fontSize: "0.76rem", color: "#64748b", fontWeight: 500 }}>
                                  Showing all {staffList.length} staff
                                </span>
                              )}
                            </div>
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
                                    color: "#f59e0b",
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
                                  gridTemplateColumns:
                                    "minmax(160px, 1.4fr) minmax(130px, 1.2fr) minmax(130px, 1.2fr) minmax(240px, 2.4fr) minmax(110px, 1fr) minmax(140px, 1.2fr)",
                                  alignItems: "center",
                                  padding: "0.58rem 1.1rem",
                                  background: "#081627",
                                  border: "1px solid rgba(255, 255, 255, 0.05)",
                                  borderRadius: "8px",
                                  marginBottom: "0.45rem",
                                  gap: "0.6rem",
                                  transition: "background 0.15s ease, border-color 0.15s ease",
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.background = "#0c1f36";
                                  e.currentTarget.style.borderColor = "rgba(245, 158, 11, 0.3)";
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.background = "#081627";
                                  e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.05)";
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
                                      color: "#f59e0b",
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
                                      color: "#ffffff",
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
                                    color: "#cbd5e1",
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
                                    color: "#cbd5e1",
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
                                    color: "#cbd5e1",
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
                                      color: assignedCount > 0 ? "#10b981" : "#94a3b8",
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
                                <div style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
                                  {/* Edit Staff button */}
                                  <button
                                    type="button"
                                    onClick={() => handleOpenStaffModal(person)}
                                    style={{
                                      display: "inline-flex",
                                      alignItems: "center",
                                      gap: "0.35rem",
                                      padding: "0.35rem 0.75rem",
                                      background: "rgba(245, 158, 11, 0.08)",
                                      color: "#f59e0b",
                                      border: "1px solid rgba(245, 158, 11, 0.45)",
                                      borderRadius: "6px",
                                      fontSize: "0.74rem",
                                      fontWeight: 700,
                                      cursor: "pointer",
                                      transition: "all 0.15s ease",
                                      whiteSpace: "nowrap",
                                    }}
                                    onMouseEnter={(e) => {
                                      e.currentTarget.style.background = "rgba(245, 158, 11, 0.2)";
                                      e.currentTarget.style.borderColor = "#f59e0b";
                                    }}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.style.background = "rgba(245, 158, 11, 0.08)";
                                      e.currentTarget.style.borderColor = "rgba(245, 158, 11, 0.45)";
                                    }}
                                  >
                                    <Edit3 size={13} color="#f59e0b" />
                                    <span>Edit Staff</span>
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
                                      color: "#ef4444",
                                      border: "1px solid rgba(239, 68, 68, 0.35)",
                                      borderRadius: "6px",
                                      fontSize: "0.74rem",
                                      cursor: "pointer",
                                      transition: "all 0.15s ease",
                                    }}
                                    onMouseEnter={(e) => {
                                      e.currentTarget.style.background = "rgba(239, 68, 68, 0.22)";
                                      e.currentTarget.style.borderColor = "#ef4444";
                                    }}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.style.background = "rgba(239, 68, 68, 0.08)";
                                      e.currentTarget.style.borderColor = "rgba(239, 68, 68, 0.35)";
                                    }}
                                    title="Remove staff member"
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
                            background:
                              "linear-gradient(135deg, #f59e0b, #ea580c)",
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
                                  borderBottom:
                                    "1px solid var(--border-subtle)",
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
                                    borderBottom:
                                      "1px solid var(--border-subtle)",
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
                                          border:
                                            "1px solid var(--border-subtle)",
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
                                      borderTop:
                                        "1px solid var(--border-subtle)",
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
                                          background:
                                            "rgba(16, 185, 129, 0.15)",
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
                        background: "#0f172a",
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
                      color: "#ef4444",
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
      {/* Global Custom Delete Confirmation Modal */}
      <ConfirmDeleteModal {...confirmState} onCancel={cancelDelete} />
    </div>
  );
}
