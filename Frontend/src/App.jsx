import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
// Admin modules
import { AdminPortal } from "./admin";
// Kitchen KOT modules
import { KitchenKOTView, KOTModal } from "./kot";
// User POS / Dining Floor modules
import {
  TableView,
  TableDetailView,
  ReceiptModal,
  SettlementModal,
  TransferTableModal,
  PastOrdersModal,
} from "./user";
import { Header, LoginPage, ErrorBoundary } from "./common";
import {
  ConfirmDeleteModal,
  useConfirmDelete,
} from "./common/ConfirmDeleteModal";
import { sounds } from "./utils/audio";
import { parseTimeToSeconds, formatElapsedTimer } from "./utils/timer";
import { setSession, logoutUser } from "./utils/auth";
import {
  apiGetTables,
  apiCreateTable,
  apiUpdateTable,
  apiDeleteTable,
  apiUpdateTableStatus,
  apiVacateTable,
} from "./api/tableApi";
import {
  apiGetMenuItems,
  apiCreateMenuItem,
  apiUpdateMenuItem,
  apiDeleteMenuItem,
  apiSetMenuAvailability,
  apiSetMenuSpecialStatus,
  normalizeMenuItem,
} from "./api/menuApi";
import { getRelevantLocalFallback } from "./utils/menuImageHelper";
import {
  apiGetKotOrders,
  apiCreateKotOrder,
  apiUpdateKotStatus,
  apiUpdateKotItemStatus,
  apiMarkAllPrepared,
} from "./api/kotApi";
import {
  apiGetStaff,
  apiCreateStaff,
  apiUpdateStaff,
  apiDeleteStaff,
} from "./api/staffApi";
import {
  apiGetOrderHistory,
  apiCreateOrder,
  apiUpdateOrderDiscount,
} from "./api/orderApi";
import { API_BASE_URL } from "./api/apiConfig";
import { dedupeOrders, mergeSettledOrders } from "./utils/orderDedupe";
import { getTodayDateString } from "./utils/invoiceCounter";
import { INITIAL_TABLES } from "./data/initialTables";

const STORAGE_KEY_TABLES = "gourmet_pos_tables_v2_inr";
const STORAGE_KEY_DELETED_TABLES = "gourmet_pos_deleted_tables_v2";
const STORAGE_KEY_ORDERS = "gourmet_pos_past_orders_v2_inr";
const STORAGE_KEY_THEME = "gourmet_pos_theme_v2";
const STORAGE_KEY_MENU = "gourmet_pos_menu_items_v2";
const STORAGE_KEY_STAFF = "gourmet_pos_staff_v1";
const STORAGE_KEY_INVENTORY = "gourmet_pos_inventory_v1";
const RESTAURANT_SETTINGS_KEY = "gourmet_pos_settings_v1";

const readRestaurantSettings = () => {
  try {
    return JSON.parse(localStorage.getItem(RESTAURANT_SETTINGS_KEY) || "{}");
  } catch {
    return {};
  }
};

const dedupeStaff = (staff) => {
  const byIdentity = new Map();
  (Array.isArray(staff) ? staff : []).forEach((person, index) => {
    const id = Number(person.staffId ?? person.id);
    const name = String(person.name || person.fullName || "").trim();
    const phone = String(person.phone || "").replace(/\D/g, "");
    const key = name
      ? `name:${name.toLowerCase()}`
      : Number.isFinite(id) && id > 0
        ? `id:${id}`
        : `person:unknown:${phone || index}`;
    const previous = byIdentity.get(key) || {};
    byIdentity.set(key, {
      ...previous,
      ...person,
      id: Number.isFinite(id) && id > 0 ? id : person.id,
      name: person.name || person.fullName || previous.name || "Staff",
    });
  });
  return Array.from(byIdentity.values()).sort((a, b) => Number(a.id || 0) - Number(b.id || 0));
};

<<<<<<< HEAD
const isAllowedTableFormat = (str) => {
  if (!str) return false;
  const trimmed = String(str).trim();
  return /^(Table|table)[-\s]?\d+$/i.test(trimmed);
};

const standardizeTableName = (str, fallbackId) => {
  const trimmed = String(str || "").trim();
  const match = trimmed.match(/^(Table|table)[-\s]?(\d+)$/i);
  if (match) {
    return `Table-${match[2]}`;
  }
  const digitsOnly = trimmed.match(/^(\d+)$/);
  if (digitsOnly) {
    return `Table-${digitsOnly[1]}`;
  }
  return fallbackId ? `Table-${fallbackId}` : trimmed;
};

const mergeIncomingTables = (incomingTables, deletedTableIds) => {
  // A server response is the authoritative table collection. Start with it so
  // deleted defaults and extra defaults cannot be reintroduced on every load.
  const tablesById = new Map();

  incomingTables.forEach((table) => {
    const id = Number(table.tableId ?? table.id);
    if (!Number.isFinite(id)) return;

    const rawIdentifier = String(table.tableNumber || table.tableName || table.name || "").trim();
    // Exclude mock / non-Table-X format tables (like T-01, PAT-01, VIP-01, HYD-01, ROOF-01, BOM-01)
    const isMock = /^(T-\d+|PAT|VIP|HYD|ROOF|BOM)/i.test(rawIdentifier);
    if (isMock) {
      return;
    }

    const existing = tablesById.get(id) || {};
    let tableNum = standardizeTableName(rawIdentifier || existing.tableNumber || existing.name, id);
    if (!isAllowedTableFormat(tableNum)) {
      return;
    }

    const normalized = {
      ...existing,
      ...table,
      id,
      tableId: id,
      name: tableNum,
      tableName: tableNum,
      tableNumber: tableNum,
      branchId: Number(table.branchId || existing.branchId || 1),
      section:
        table.location || table.sectionArea || table.section || existing.section || "Main Hall",
      location:
        table.location || table.sectionArea || table.section || existing.location || "Main Hall",
      capacity:
        table.capacity ?? table.capacityChairs ?? existing.capacity ?? 4,
      status:
        String(table.status || existing.status || "vacant").toLowerCase() === "occupied"
          ? "occupied"
          : "vacant",
      server:
        table.assignedServerName || table.server || existing.server || "Staff",
      guests: table.occupiedChairs ?? table.guests ?? existing.guests ?? 0,
      items: Array.isArray(table.items)
        ? table.items
        : Array.isArray(existing.items)
          ? existing.items
          : [],
      orderTime: table.orderTime ?? existing.orderTime ?? null,
      discountPercent:
        table.discountPercent ?? existing.discountPercent ?? 0,
      serviceCharge: table.serviceCharge ?? existing.serviceCharge ?? 5,
      occupiedSince:
        table.occupiedSince || existing.occupiedSince || "10:00 AM",
    };
    tablesById.set(id, normalized);
  });

=======
const isRogueName = (name) => {
  if (!name) return false;
  const lower = String(name).trim().toLowerCase();
  return (
    lower.includes("live verification") ||
    lower.includes("table final") ||
    lower.includes("table 20") ||
    lower === "verification" ||
    lower === "test"
  );
};

const parseTableNumber = (table) => {
  const rawName = String(table.tableName || table.name || "").trim();
  const nameMatch = rawName.match(/^(?:table|t)\s*(\d+)$/i);
  if (nameMatch) {
    return parseInt(nameMatch[1], 10);
  }
  const rawId = Number(table.id ?? table.tableId);
  if (Number.isFinite(rawId) && rawId > 0) {
    return rawId;
  }
  return null;
};

const mergeIncomingTables = (incomingTables, deletedTableIds) => {
>>>>>>> 4f6f6355e5450a66e56126e52fac8b40f2572b2d
  const deletedIds = Array.isArray(deletedTableIds)
    ? deletedTableIds.map(String)
    : [];
  const tablesById = new Map();

  // 1. Seed with default 15 tables from INITIAL_TABLES so the standard floor plan is always intact
  INITIAL_TABLES.forEach((defTable) => {
    if (!deletedIds.includes(String(defTable.id))) {
      tablesById.set(Number(defTable.id), { ...defTable });
    }
  });

  // 2. Overlay incoming live tables from server or localStorage
  if (Array.isArray(incomingTables)) {
    incomingTables.forEach((table) => {
      if (!table || typeof table !== "object") return;
      const rawName = String(table.tableName || table.name || "").trim();
      const num = parseTableNumber(table);

      let targetId = null;
      if (num && num >= 1 && num <= 15) {
        targetId = num;
      } else if (Number.isFinite(Number(table.id)) && Number(table.id) > 0) {
        targetId = Number(table.id);
      } else if (num) {
        targetId = num;
      }

      if (!targetId || deletedIds.includes(String(targetId))) return;

      const isStandard = targetId >= 1 && targetId <= 15;
      if (!isStandard && isRogueName(rawName)) return;

      const existing = tablesById.get(targetId) || {};
      const cleanName = isStandard
        ? isRogueName(rawName) || !rawName
          ? `Table ${targetId}`
          : rawName.match(/^(?:table|t)\s*(\d+)$/i)
            ? `Table ${targetId}`
            : rawName
        : rawName || `Table ${targetId}`;

      const normalized = {
        ...existing,
        ...table,
        id: targetId,
        name: cleanName,
        backendTableId:
          table.tableId ?? table.backendTableId ?? existing.backendTableId ?? targetId,
        section:
          table.sectionArea || table.section || existing.section || "Main Hall",
        capacity: Number(
          table.capacityChairs ?? table.capacity ?? existing.capacity ?? 4,
        ),
        status: String(table.status || existing.status || "vacant").toLowerCase(),
        server:
          table.assignedServerName || table.server || existing.server || "Staff",
        guests:
          String(table.status || existing.status || "vacant").toLowerCase() === "vacant"
            ? 0
            : Number(table.occupiedChairs ?? table.guests ?? existing.guests ?? 0),
        items: Array.isArray(table.items)
          ? table.items
          : Array.isArray(existing.items)
            ? existing.items
            : [],
        orderTime: table.orderTime ?? existing.orderTime ?? null,
        discountPercent: Number(
          table.discountPercent ?? existing.discountPercent ?? 0,
        ),
        serviceCharge: Number(
          table.serviceCharge ?? existing.serviceCharge ?? 5,
        ),
        occupiedSince:
          String(table.status || existing.status || "vacant").toLowerCase() === "vacant"
            ? null
            : (table.occupiedSince || existing.occupiedSince || null),
      };

      tablesById.set(targetId, normalized);
    });
  }

  return Array.from(tablesById.values())
    .filter((table) => !deletedIds.includes(String(table.id)))
    .sort((a, b) => Number(a.id || 0) - Number(b.id || 0));
};

const getDeletedTableIds = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_DELETED_TABLES);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [];
};

export function App() {
  const { confirmState, requestDelete, cancelDelete } = useConfirmDelete();
  const [restaurantSettings, setRestaurantSettings] = useState(readRestaurantSettings);

  useEffect(() => {
    const refreshSettings = () => setRestaurantSettings(readRestaurantSettings());
    window.addEventListener("storage", refreshSettings);
    window.addEventListener("restaurant-settings-updated", refreshSettings);
    return () => {
      window.removeEventListener("storage", refreshSettings);
      window.removeEventListener("restaurant-settings-updated", refreshSettings);
    };
  }, []);

  // Load shared restaurant settings for every device, keeping local settings as
  // a fallback when the shared server is unavailable.
  useEffect(() => {
    let active = true;
    const applySharedSettings = (settings) => {
      if (!settings || typeof settings !== "object") return;
      let local = {};
      try { local = JSON.parse(localStorage.getItem(RESTAURANT_SETTINGS_KEY) || "{}"); } catch {}
      const merged = { ...local, ...settings };
      try { localStorage.setItem(RESTAURANT_SETTINGS_KEY, JSON.stringify(merged)); } catch {}
      if (active) {
        setRestaurantSettings(merged);
        window.dispatchEvent(new Event("restaurant-settings-updated"));
      }
    };
    fetch(`${API_BASE_URL}/api/state`, { headers: { "ngrok-skip-browser-warning": "true" } })
      .then((response) => response.ok ? response.json() : null)
      .then((data) => applySharedSettings(data?.[RESTAURANT_SETTINGS_KEY] || data?.data?.[RESTAURANT_SETTINGS_KEY]))
      .catch(() => {});
    let events;
    try {
      events = new EventSource(`${API_BASE_URL}/api/events`);
      events.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          applySharedSettings(message?.payload?.[RESTAURANT_SETTINGS_KEY] || message?.payload?.data?.[RESTAURANT_SETTINGS_KEY]);
        } catch {}
      };
    } catch {}
    return () => { active = false; events?.close(); };
  }, []);

  // Theme state: 'royal-saffron' | 'emerald-spice' | 'light-bistro'
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem(STORAGE_KEY_THEME) || "royal-saffron";
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem(STORAGE_KEY_THEME, theme);
  }, [theme]);

  // Track permanently deleted table IDs so cross-tabs or reloads never resurrect them
  const [deletedTableIds, setDeletedTableIds] = useState(() => {
    const initial = getDeletedTableIds();
    return Array.isArray(initial) ? initial : [];
  });

  // Load saved tables only; do not seed demo records into the live list.
  const [tables, setTables] = useState(() => {
    const deleted = getDeletedTableIds();
    const delList = Array.isArray(deleted) ? deleted : [];
    const isDeleted = (id) => delList.some((d) => String(d) === String(id));
    try {
      const saved = localStorage.getItem(STORAGE_KEY_TABLES);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const merged = mergeIncomingTables(parsed, delList)
            .map((t) => ({ ...t, items: Array.isArray(t.items) ? t.items : [] }))
            .filter((t) => !isDeleted(t.id));
          if (merged.length > 0) return merged;
        }
      }
    } catch {
      // Fallback
    }
<<<<<<< HEAD
    return INITIAL_TABLES;
=======
    return [];
>>>>>>> 4f6f6355e5450a66e56126e52fac8b40f2572b2d
  });

  // Load dynamic menu items (supports Admin additions/deletions)
  const [menuItems, setMenuItems] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_MENU);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.map((item) => ({
            ...item,
            image: item.image || getRelevantLocalFallback(item),
          }));
        }
      }
    } catch {
      // Fallback
    }
    return [];
  });

  // Load staff personnel (supports Admin staff additions/deletions)
  const [staffList, setStaffList] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_STAFF);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // Fallback
    }
    return [];
  });

  // Past settled orders history in Rupees
  const [pastOrders, setPastOrders] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_ORDERS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return dedupeOrders(parsed);
      }
    } catch {
      // Fallback
    }
    return [];
  });

  // Navigation & Table Selection ('tables' | 'order' | 'kot')
  const [activeView, setActiveView] = useState("tables");
  const [selectedTableId, setSelectedTableId] = useState(null);

  const location = useLocation();
  const navigate = useNavigate();

  const isKotRoute = location.pathname === "/kot";
  const isAdminRoute = location.pathname === "/admin";
  const isUserRoute = !isKotRoute && !isAdminRoute;

  // ── Live Backend Integration Hook (Ngrok API) ──────────────────
  useEffect(() => {
    // 1. Load live tables from backend API, preserving initial data and deletions
    apiGetTables().then((response) => {
      const backendTables = Array.isArray(response)
        ? response
<<<<<<< HEAD
        : response?.success && Array.isArray(response.data?.data)
          ? response.data.data
          : response?.success && Array.isArray(response.data?.tables)
            ? response.data.tables
            : response?.success && Array.isArray(response.data)
              ? response.data
              : response?.success && Array.isArray(response.tables)
                ? response.tables
                : null;
=======
        : response?.success && Array.isArray(response.data)
          ? response.data
          : response?.success && Array.isArray(response.tables)
            ? response.tables
          : null;
>>>>>>> 4f6f6355e5450a66e56126e52fac8b40f2572b2d
      if (Array.isArray(backendTables)) {
        const merged = mergeIncomingTables(
          backendTables,
          getDeletedTableIds(),
        );
        setTables(merged);
        try {
          localStorage.setItem(STORAGE_KEY_TABLES, JSON.stringify(merged));
        } catch {}
      }
    });

    // 2. Load live menu items from backend API
    apiGetMenuItems().then((response) => {
      const backendMenu = [
        response,
        response?.data,
        response?.data?.data,
        response?.data?.menuItems,
        response?.menuItems,
      ].find((candidate) => Array.isArray(candidate));
      if (Array.isArray(backendMenu)) {
        let localMenu = [];
        try {
          localMenu = JSON.parse(localStorage.getItem(STORAGE_KEY_MENU) || "[]");
        } catch {}
        const normalizedMenu = backendMenu.map((item) => {
          const previous = localMenu.find((saved) =>
            String(saved.id) === String(item.menuItemId ?? item.id) ||
            saved.name?.trim().toLowerCase() === String(item.dishName || item.name || "").trim().toLowerCase()
          );
          return normalizeMenuItem({ ...item, recipe: item.recipe || previous?.recipe || [] });
        });
        setMenuItems(normalizedMenu);
        try {
          localStorage.setItem(
            STORAGE_KEY_MENU,
            JSON.stringify(normalizedMenu),
          );
        } catch {}
      }
    });

    // 3. Load live staff members from backend API
    apiGetStaff().then((backendStaff) => {
      const staffList = Array.isArray(backendStaff)
        ? backendStaff
        : Array.isArray(backendStaff?.data)
          ? backendStaff.data
          : Array.isArray(backendStaff?.staff)
            ? backendStaff.staff
            : [];
      if (staffList.length > 0) {
        const uniqueStaff = dedupeStaff(
          staffList.map((s) => ({
            ...s,
            id: s.staffId ?? s.id,
            name: s.fullName || s.name,
            role: s.roleTitle || s.role || "Waiter",
          })),
        );
        setStaffList(uniqueStaff);
        try {
          localStorage.setItem(STORAGE_KEY_STAFF, JSON.stringify(uniqueStaff));
        } catch {}
      }
    });

    // 4. Load live past settled orders from the backend
    apiGetOrderHistory().then((response) => {
      const result = response?.data ?? response;
      const backendOrders = Array.isArray(result)
        ? result
        : Array.isArray(result?.orders)
          ? result.orders
          : Array.isArray(result?.data)
            ? result.data
            : [];
      if (Array.isArray(backendOrders) && backendOrders.length > 0) {
        setPastOrders((current) => mergeSettledOrders(current, backendOrders));
      }
    });
  }, []);

  // ── Authentication sessions per route ────────────────────────────────
  // Each route has its own session key so POS, KOT and Admin can be
  // open simultaneously on different browser tabs/screens.
  const SESSION_KEY_POS = "avsr_pos_session";
  const SESSION_KEY_KOT = "avsr_kot_session";
  const SESSION_KEY_ADMIN = "avsr_admin_session";

  const loadRouteSession = (key) => {
    try {
      const raw = localStorage.getItem(key) || sessionStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  };

  const [posSession, setPosSession] = useState(() =>
    loadRouteSession(SESSION_KEY_POS),
  );
  const [kotSession, setKotSession] = useState(() =>
    loadRouteSession(SESSION_KEY_KOT),
  );
  const [adminSession, setAdminSession] = useState(() =>
    loadRouteSession(SESSION_KEY_ADMIN),
  );

  const saveRouteSession = (key, session) => {
    try {
      if (session) {
        localStorage.setItem(key, JSON.stringify(session));
        sessionStorage.setItem(key, JSON.stringify(session));
      } else {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
      }
    } catch {}
  };

  const handlePosLogin = (s) => {
    setPosSession(s);
    saveRouteSession(SESSION_KEY_POS, s);
  };
  const handleKotLogin = (s) => {
    setKotSession(s);
    saveRouteSession(SESSION_KEY_KOT, s);
  };
  const handleAdminLogin = (s) => {
    setAdminSession(s);
    saveRouteSession(SESSION_KEY_ADMIN, s);
  };

  const handleGlobalLogin = (s, targetRole) => {
    const roleToUse = targetRole || s?.role || "pos";
    setSession(s);
    if (roleToUse === "admin") {
      handleAdminLogin(s);
      navigate("/admin");
    } else if (roleToUse === "kot") {
      handleKotLogin(s);
      navigate("/kot");
    } else {
      handlePosLogin(s);
      navigate("/");
    }
  };

  const handlePosLogout = () => {
    setPosSession(null);
    saveRouteSession(SESSION_KEY_POS, null);
    logoutUser();
  };
  const handleKotLogout = () => {
    setKotSession(null);
    saveRouteSession(SESSION_KEY_KOT, null);
    logoutUser();
  };
  const handleAdminLogout = () => {
    setAdminSession(null);
    saveRouteSession(SESSION_KEY_ADMIN, null);
    logoutUser();
  };

  // Modals state
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [isSettlementOpen, setIsSettlementOpen] = useState(false);
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [isPastOrdersOpen, setIsPastOrdersOpen] = useState(false);
  const [isKOTOpen, setIsKOTOpen] = useState(false);
  const [reprintReceiptData, setReprintReceiptData] = useState(null);

  // Toast notification
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2800);
  };

  // ── Kitchen Real-Time Notifications System ───────────────────
  const STORAGE_KEY_KITCHEN_NOTIFICATIONS = "avsr_kitchen_notifications";
  const STORAGE_KEY_LATEST_ALERT = "avsr_latest_kitchen_alert";

  const [kitchenNotifications, setKitchenNotifications] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_KITCHEN_NOTIFICATIONS);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [activeKitchenAlert, setActiveKitchenAlert] = useState(null);

  // Auto-dismiss active alert after 6.5 seconds
  useEffect(() => {
    if (activeKitchenAlert) {
      const t = setTimeout(() => setActiveKitchenAlert(null), 6500);
      return () => clearTimeout(t);
    }
  }, [activeKitchenAlert]);

  const pushGlobalSync = (payload) => {
    try {
      fetch(`${API_BASE_URL}/api/sync`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "ngrok-skip-browser-warning": "true",
        },
        body: JSON.stringify(payload),
      }).catch(() => {});
    } catch {}
  };

  const triggerKitchenNotification = (alertData) => {
    const notif = {
      id: Date.now() + Math.random(),
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      }),
      read: false,
      ...alertData,
    };
    setKitchenNotifications((prev) => {
      const updated = [
        notif,
        ...prev.filter((n) => n.id !== notif.id).slice(0, 39),
      ];
      try {
        localStorage.setItem(
          STORAGE_KEY_KITCHEN_NOTIFICATIONS,
          JSON.stringify(updated),
        );
      } catch {}
      return updated;
    });
    setActiveKitchenAlert(notif);
    try {
      localStorage.setItem(STORAGE_KEY_LATEST_ALERT, JSON.stringify(notif));
      pushGlobalSync({ [STORAGE_KEY_LATEST_ALERT]: notif });
    } catch {}

    if (notif.type === "cooking_completed") {
      sounds.playBell();
    } else {
      sounds.playAddItem();
    }
  };

  const handleClearNotifications = () => {
    setKitchenNotifications([]);
    try {
      localStorage.removeItem(STORAGE_KEY_KITCHEN_NOTIFICATIONS);
    } catch {}
  };

  // BroadcastChannel helper for cross-tab instantaneous sync
  const broadcastSync = (type, payload) => {
    try {
      if (typeof BroadcastChannel !== "undefined") {
        const bc = new BroadcastChannel("avsr_pos_cross_sync");
        bc.postMessage({ type, payload });
        bc.close();
      }
    } catch {}
  };

  // Sync to LocalStorage & Global Network DB
  useEffect(() => {
    try {
      const isDeleted = (id) =>
        (Array.isArray(deletedTableIds) ? deletedTableIds : []).some(
          (d) => String(d) === String(id),
        );
      const cleanTables = mergeIncomingTables(
        Array.isArray(tables) ? tables : [],
        deletedTableIds,
      )
        .map((t) => ({ ...t, items: Array.isArray(t.items) ? t.items : [] }))
        .filter((t) => !isDeleted(t.id));
      const cleanJson = JSON.stringify(cleanTables);
      if (localStorage.getItem(STORAGE_KEY_TABLES) !== cleanJson) {
        localStorage.setItem(STORAGE_KEY_TABLES, cleanJson);
        pushGlobalSync({ [STORAGE_KEY_TABLES]: cleanTables });
        broadcastSync("SYNC_TABLES", cleanTables);
      }
    } catch {}
  }, [tables, deletedTableIds]);

  useEffect(() => {
    try {
      const menuJson = JSON.stringify(menuItems);
      if (localStorage.getItem(STORAGE_KEY_MENU) !== menuJson) {
        localStorage.setItem(STORAGE_KEY_MENU, menuJson);
        pushGlobalSync({ [STORAGE_KEY_MENU]: menuItems });
        broadcastSync("SYNC_MENU", menuItems);
      }
    } catch {}
  }, [menuItems]);

  useEffect(() => {
    try {
      const staffJson = JSON.stringify(staffList);
      if (localStorage.getItem(STORAGE_KEY_STAFF) !== staffJson) {
        localStorage.setItem(STORAGE_KEY_STAFF, staffJson);
        pushGlobalSync({ [STORAGE_KEY_STAFF]: staffList });
        broadcastSync("SYNC_STAFF", staffList);
      }
    } catch {}
  }, [staffList]);

  useEffect(() => {
    try {
      const ordersJson = JSON.stringify(pastOrders);
      if (localStorage.getItem(STORAGE_KEY_ORDERS) !== ordersJson) {
        localStorage.setItem(STORAGE_KEY_ORDERS, ordersJson);
        pushGlobalSync({ [STORAGE_KEY_ORDERS]: pastOrders });
        broadcastSync("SYNC_ORDERS", pastOrders);
      }
    } catch {}
  }, [pastOrders]);

  // Real-time cross-device network synchronization via SSE Stream & REST API
  useEffect(() => {
    // 1. Fetch initial network DB state on startup
    fetch(`${API_BASE_URL}/api/state`, {
      headers: {
        "ngrok-skip-browser-warning": "true",
      },
    })
      .then((res) => res.json())
      .then((data) => {
        if (!data) return;
        const incomingTables = data.tables ?? data.data?.tables ?? data[STORAGE_KEY_TABLES];
        if (Array.isArray(incomingTables)) {
          const freshDel = getDeletedTableIds();
          const clean = mergeIncomingTables(incomingTables, freshDel);
          setTables(clean);
          try {
            localStorage.setItem(STORAGE_KEY_TABLES, JSON.stringify(clean));
          } catch {}
        }

        const incomingOrders = data.pastOrders ?? data.data?.pastOrders ?? data[STORAGE_KEY_ORDERS];
        if (Array.isArray(incomingOrders)) {
          setPastOrders((current) => mergeSettledOrders(current, incomingOrders));
        }

        // Menu items are officially loaded from /api/v1/menu-items (which includes isChefsSpecial).
        const incomingMenu = data.menuItems ?? data.data?.menuItems ?? data[STORAGE_KEY_MENU];
        if (Array.isArray(incomingMenu)) {
          const normalizedMenu = incomingMenu.map(normalizeMenuItem);
          setMenuItems(normalizedMenu);
          try {
            localStorage.setItem(STORAGE_KEY_MENU, JSON.stringify(normalizedMenu));
          } catch {}
        }

        const incomingStaff =
          data.staff || data.data?.staff || data[STORAGE_KEY_STAFF];
        if (Array.isArray(incomingStaff)) {
          const normalizedStaff = dedupeStaff(incomingStaff.map((s) => ({
            id: s.staffId ?? s.id,
            name: s.fullName || s.name,
            role: s.roleTitle || s.role || "Waiter",
            phone: s.phone || "",
            email: s.email || "",
            shift: s.shift || "Full Day",
            status: s.isActive === false ? "inactive" : "active",
          })));
          setStaffList(normalizedStaff);
          try {
            localStorage.setItem(
              STORAGE_KEY_STAFF,
              JSON.stringify(normalizedStaff),
            );
          } catch {}
        }

        if (data["avsr_auth_users_v1"]) {
          try {
            localStorage.setItem(
              "avsr_auth_users_v1",
              JSON.stringify(data["avsr_auth_users_v1"]),
            );
          } catch {}
        }

        const incomingInventory = data[STORAGE_KEY_INVENTORY];
        if (Array.isArray(incomingInventory)) {
          try {
            localStorage.setItem(STORAGE_KEY_INVENTORY, JSON.stringify(incomingInventory));
            window.dispatchEvent(new CustomEvent("avsr-inventory-updated", { detail: incomingInventory }));
          } catch {}
        }
      })
      .catch(() => {});

    // 2. Connect to realtime SSE stream push for instant multi-device updates
    let es;
    try {
      es = new EventSource(
        `${API_BASE_URL}/api/events`,
      );
      es.onmessage = (e) => {
        try {
          const parsedMsg = JSON.parse(e.data);
          const payload = parsedMsg.payload;
          if (!payload) return;

          const incomingTables = payload.tables ?? payload.data?.tables ?? payload[STORAGE_KEY_TABLES];
        if (Array.isArray(incomingTables)) {
            const freshDel = getDeletedTableIds();
            const clean = mergeIncomingTables(incomingTables, freshDel);
            setTables(clean);
            try {
              localStorage.setItem(STORAGE_KEY_TABLES, JSON.stringify(clean));
            } catch {}
          }
          const incomingOrders = payload.pastOrders ?? payload[STORAGE_KEY_ORDERS];
          if (Array.isArray(incomingOrders)) {
            setPastOrders((current) => mergeSettledOrders(current, incomingOrders));
          }
          const incomingMenu = payload.menuItems ?? payload[STORAGE_KEY_MENU];
          if (Array.isArray(incomingMenu)) {
            let savedMenuForRecipes = [];
            try {
              savedMenuForRecipes = JSON.parse(localStorage.getItem(STORAGE_KEY_MENU) || "[]");
            } catch {}
            setMenuItems((prev) => {
              const currentList = prev && prev.length > 0 ? prev : savedMenuForRecipes;
              const normalizedMenu = incomingMenu.map((m) => {
                const existing = currentList.find(
                  (item) =>
                    String(item.id) === String(m.menuItemId || m.id) ||
                    item.name?.trim().toLowerCase() === String(m.dishName || m.name || "").trim().toLowerCase()
                );
                const hasExplicitSpecial = m.isChefSpecial !== undefined || m.isChefsSpecial !== undefined;
                const isSpecial = hasExplicitSpecial
                  ? Boolean(m.isChefSpecial ?? m.isChefsSpecial)
                  : Boolean(existing?.isChefSpecial ?? existing?.isChefsSpecial ?? false);

                return {
                  id: m.menuItemId ? String(m.menuItemId) : String(m.id),
                  name: m.dishName || m.name,
                  category: m.category || "",
                  price: parseFloat(m.price || 0),
                  isVeg: m.dietaryType === "VEG" || m.isVeg === true,
                  spiceLevel:
                    m.spiceLevel === 1
                      ? "Mild"
                      : m.spiceLevel === 2
                        ? "Medium"
                        : "Spicy",
                  description: m.shortDescription || m.description || "",
                  prepTime: m.prepTimeMinutes ? `${m.prepTimeMinutes} mins` : "",
                  prepTimeMinutes: m.prepTimeMinutes || 0,
                  isChefSpecial: isSpecial,
                  isChefsSpecial: isSpecial,
                  isAvailable: m.isAvailable !== false,
                  recipe: m.recipe || existing?.recipe || [],
                  image:
                    m.imageUrl ||
                    m.image ||
                    getRelevantLocalFallback(m),
                };
              });
              try {
                localStorage.setItem(STORAGE_KEY_MENU, JSON.stringify(normalizedMenu));
              } catch {}
              return normalizedMenu;
            });
          }
          if (payload.deletedMenuItemId) {
            setMenuItems((prev) => {
              const next = prev.filter(
                (item) =>
                  String(item.id) !== String(payload.deletedMenuItemId) &&
                  String(item.menuItemId) !== String(payload.deletedMenuItemId),
              );
              try {
                localStorage.setItem(STORAGE_KEY_MENU, JSON.stringify(next));
              } catch {}
              return next;
            });
          }
          const incomingStaff = payload.staff ?? payload[STORAGE_KEY_STAFF];
          if (Array.isArray(incomingStaff)) {
            const normalizedStaff = dedupeStaff(incomingStaff.map((s) => ({
              id: s.staffId || s.id,
              name: s.fullName || s.name,
              role: s.roleTitle || s.role || "Waiter",
              phone: s.phone || "",
              email: s.email || "",
              shift: s.shift || "Full Day",
              status: s.isActive === false ? "inactive" : "active",
            })));
            setStaffList(normalizedStaff);
            try {
              localStorage.setItem(
                STORAGE_KEY_STAFF,
                JSON.stringify(normalizedStaff),
              );
            } catch {}
          }
          const incomingInventory = payload[STORAGE_KEY_INVENTORY];
          if (Array.isArray(incomingInventory)) {
            try {
              localStorage.setItem(STORAGE_KEY_INVENTORY, JSON.stringify(incomingInventory));
              window.dispatchEvent(new CustomEvent("avsr-inventory-updated", { detail: incomingInventory }));
            } catch {}
          }
          if (payload["avsr_auth_users_v1"]) {
            try {
              localStorage.setItem(
                "avsr_auth_users_v1",
                JSON.stringify(payload["avsr_auth_users_v1"]),
              );
            } catch {}
          }
          if (payload[STORAGE_KEY_LATEST_ALERT]) {
            const alert = payload[STORAGE_KEY_LATEST_ALERT];
            setActiveKitchenAlert(alert);
            setKitchenNotifications((prev) => [
              alert,
              ...prev.filter((n) => n.id !== alert.id).slice(0, 39),
            ]);
            if (alert.type === "cooking_completed") sounds.playBell();
            else sounds.playAddItem();
          }
        } catch {}
      };
    } catch {}

    const handleStorageChange = (e) => {
      if (!e.key || !e.newValue) return;

      if (e.key === STORAGE_KEY_TABLES) {
        try {
          const incomingTables = JSON.parse(e.newValue);
          if (Array.isArray(incomingTables)) {
            const freshDel = getDeletedTableIds();
            const clean = mergeIncomingTables(incomingTables, freshDel);
            setTables((prev) => (JSON.stringify(prev) === JSON.stringify(clean) ? prev : clean));
          }
        } catch {}
      } else if (e.key === STORAGE_KEY_ORDERS) {
        try {
          const incomingOrders = JSON.parse(e.newValue);
          if (Array.isArray(incomingOrders)) {
            setPastOrders((current) => mergeSettledOrders(current, incomingOrders));
          }
        } catch {}
      } else if (e.key === STORAGE_KEY_MENU) {
        try {
          const incomingMenu = JSON.parse(e.newValue);
          if (Array.isArray(incomingMenu)) {
            const normalized = incomingMenu.map(normalizeMenuItem);
            setMenuItems((prev) => (JSON.stringify(prev) === JSON.stringify(normalized) ? prev : normalized));
          }
        } catch {}
      } else if (e.key === STORAGE_KEY_STAFF) {
        try {
          const incomingStaff = JSON.parse(e.newValue);
          if (Array.isArray(incomingStaff)) {
            const deduped = dedupeStaff(incomingStaff);
            setStaffList((prev) => (JSON.stringify(prev) === JSON.stringify(deduped) ? prev : deduped));
          }
        } catch {}
      } else if (e.key === STORAGE_KEY_DELETED_TABLES) {
        try {
          const incomingDeleted = JSON.parse(e.newValue);
          if (Array.isArray(incomingDeleted)) {
            setDeletedTableIds(incomingDeleted);
            setTables((prev) => prev.filter((t) => !incomingDeleted.map(String).includes(String(t.id))));
          }
        } catch {}
      } else if (e.key === STORAGE_KEY_INVENTORY) {
        try {
          const incomingInventory = JSON.parse(e.newValue);
          if (Array.isArray(incomingInventory)) {
            window.dispatchEvent(new CustomEvent("avsr-inventory-updated", { detail: incomingInventory }));
          }
        } catch {}
      } else if (e.key === RESTAURANT_SETTINGS_KEY) {
        try {
          const incomingSettings = JSON.parse(e.newValue);
          if (incomingSettings && typeof incomingSettings === "object") {
            setRestaurantSettings(incomingSettings);
            window.dispatchEvent(new Event("restaurant-settings-updated"));
          }
        } catch {}
      } else if (e.key === STORAGE_KEY_THEME) {
        setTheme(e.newValue);
      } else if (e.key === STORAGE_KEY_LATEST_ALERT) {
        try {
          const alert = JSON.parse(e.newValue);
          if (alert && alert.id) {
            setActiveKitchenAlert(alert);
            setKitchenNotifications((prev) => [
              alert,
              ...prev.filter((n) => n.id !== alert.id).slice(0, 39),
            ]);
            if (alert.type === "cooking_completed") {
              sounds.playBell();
            } else {
              sounds.playAddItem();
            }
          }
        } catch {}
      }
    };

    let syncChannel = null;
    if (typeof BroadcastChannel !== "undefined") {
      try {
        syncChannel = new BroadcastChannel("avsr_pos_cross_sync");
        syncChannel.onmessage = (event) => {
          const { type, payload } = event.data || {};
          if (!type || !payload) return;

          if (type === "SYNC_TABLES" && Array.isArray(payload)) {
            const freshDel = getDeletedTableIds();
            const clean = mergeIncomingTables(payload, freshDel);
            setTables((prev) => (JSON.stringify(prev) === JSON.stringify(clean) ? prev : clean));
          } else if (type === "SYNC_ORDERS" && Array.isArray(payload)) {
            setPastOrders((current) => mergeSettledOrders(current, payload));
          } else if (type === "SYNC_MENU" && Array.isArray(payload)) {
            const normalized = payload.map(normalizeMenuItem);
            setMenuItems((prev) => (JSON.stringify(prev) === JSON.stringify(normalized) ? prev : normalized));
          } else if (type === "SYNC_STAFF" && Array.isArray(payload)) {
            const deduped = dedupeStaff(payload);
            setStaffList((prev) => (JSON.stringify(prev) === JSON.stringify(deduped) ? prev : deduped));
          } else if (type === "SYNC_DELETED_TABLES" && Array.isArray(payload)) {
            setDeletedTableIds(payload);
            setTables((prev) => prev.filter((t) => !payload.map(String).includes(String(t.id))));
          }
        };
      } catch {}
    }

    const syncAllFromStorage = () => {
      try {
        const rawTables = localStorage.getItem(STORAGE_KEY_TABLES);
        if (rawTables) {
          const parsed = JSON.parse(rawTables);
          if (Array.isArray(parsed)) {
            const freshDel = getDeletedTableIds();
            const clean = mergeIncomingTables(parsed, freshDel);
            setTables((prev) => (JSON.stringify(prev) === JSON.stringify(clean) ? prev : clean));
          }
        }
      } catch {}

      try {
        const rawOrders = localStorage.getItem(STORAGE_KEY_ORDERS);
        if (rawOrders) {
          const parsed = JSON.parse(rawOrders);
          if (Array.isArray(parsed)) {
            setPastOrders((current) => mergeSettledOrders(current, parsed));
          }
        }
      } catch {}

      try {
        const rawMenu = localStorage.getItem(STORAGE_KEY_MENU);
        if (rawMenu) {
          const parsed = JSON.parse(rawMenu);
          if (Array.isArray(parsed)) {
            const normalized = parsed.map(normalizeMenuItem);
            setMenuItems((prev) => (JSON.stringify(prev) === JSON.stringify(normalized) ? prev : normalized));
          }
        }
      } catch {}

      try {
        const rawStaff = localStorage.getItem(STORAGE_KEY_STAFF);
        if (rawStaff) {
          const parsed = JSON.parse(rawStaff);
          if (Array.isArray(parsed)) {
            const deduped = dedupeStaff(parsed);
            setStaffList((prev) => (JSON.stringify(prev) === JSON.stringify(deduped) ? prev : deduped));
          }
        }
      } catch {}

      try {
        const rawDel = localStorage.getItem(STORAGE_KEY_DELETED_TABLES);
        if (rawDel) {
          const parsed = JSON.parse(rawDel);
          if (Array.isArray(parsed)) {
            setDeletedTableIds(parsed);
          }
        }
      } catch {}
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("focus", syncAllFromStorage);
    const handleVisibility = () => {
      if (document.visibilityState === "visible") syncAllFromStorage();
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("focus", syncAllFromStorage);
      document.removeEventListener("visibilitychange", handleVisibility);
      if (syncChannel) syncChannel.close();
      if (es) es.close();
    };
  }, []);

  const currentTable = tables.find((t) => String(t.id) === String(selectedTableId)) || tables[0] || null;

  // Table selection handler
  const handleSelectTable = (id) => {
    setSelectedTableId(id);
    setActiveView("order");
    sounds.playAddItem();
  };

  // Add Item to Table Order
  const handleAddItemToTable = (tableId, menuItem) => {
    setTables((prevTables) =>
      prevTables.map((t) => {
        if (t.id !== tableId) return t;

        const existingIndex = t.items.findIndex((i) => i.id === menuItem.id);
        let newItems;

        const specifiedQty =
          typeof menuItem.quantity === "number" ? menuItem.quantity : null;
        const specifiedNotes =
          typeof menuItem.notes === "string" ? menuItem.notes : null;

        if (specifiedQty === 0) {
          newItems = t.items.filter((i) => i.id !== menuItem.id);
        } else if (existingIndex > -1) {
          newItems = t.items.map((item, idx) =>
            idx === existingIndex
              ? {
                  ...item,
                  quantity:
                    specifiedQty !== null ? specifiedQty : item.quantity + 1,
                  notes: specifiedNotes !== null ? specifiedNotes : item.notes,
                }
              : item,
          );
        } else {
          newItems = [
            ...t.items,
            {
              id: menuItem.id,
              name: menuItem.name,
              price: menuItem.price,
              quantity:
                specifiedQty !== null && specifiedQty > 0 ? specifiedQty : 1,
              notes: specifiedNotes !== null ? specifiedNotes : "",
              timeAdded: new Date().toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              }),
              kotStatus: "received",
            },
          ];
        }

        return {
          ...t,
          items: newItems,
          status: t.status === "vacant" ? "occupied" : t.status,
          orderTime:
            t.orderTime ||
            new Date().toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
          orderTimestamp: t.orderTimestamp || Date.now(),
          completedAt: null,
          completedDuration: null,
        };
      }),
    );

    apiUpdateTableStatus(tableId, "occupied").catch(() => {});

    showToast(
      `Added ${menuItem.name} to ${tables.find((t) => t.id === tableId)?.name}`,
    );
  };

  // Update Item Quantity
  const handleUpdateItemQuantity = (tableId, itemId, newQty) => {
    setTables((prevTables) =>
      prevTables.map((t) => {
        if (t.id !== tableId) return t;

        let newItems;
        if (newQty <= 0) {
          newItems = t.items.filter((i) => i.id !== itemId);
        } else {
          newItems = t.items.map((i) =>
            i.id === itemId ? { ...i, quantity: newQty } : i,
          );
        }

        return {
          ...t,
          items: newItems,
          status: newItems.length === 0 ? "vacant" : t.status,
        };
      }),
    );
  };

  // Remove Item
  const handleRemoveItemFromTable = (tableId, itemId) => {
    setTables((prevTables) =>
      prevTables.map((t) => {
        if (t.id !== tableId) return t;
        const newItems = t.items.filter((i) => i.id !== itemId);
        return {
          ...t,
          items: newItems,
          status: newItems.length === 0 ? "vacant" : t.status,
        };
      }),
    );
  };

  // Update Item Notes
  const handleUpdateItemNotes = (tableId, itemId, notes) => {
    setTables((prevTables) =>
      prevTables.map((t) => {
        if (t.id !== tableId) return t;
        return {
          ...t,
          items: t.items.map((i) => (i.id === itemId ? { ...i, notes } : i)),
        };
      }),
    );
    showToast("Kitchen note updated");
  };

  // Update Guests Count
  const handleUpdateGuests = (tableId, count) => {
    setTables((prevTables) =>
      prevTables.map((t) => (t.id === tableId ? { ...t, guests: count } : t)),
    );
  };

  // Update Discount
  const handleUpdateDiscount = (tableId, discountPercent) => {
    setTables((prevTables) =>
      prevTables.map((t) => (t.id === tableId ? { ...t, discountPercent } : t)),
    );
  };

  // Toggle Service Charge
  const handleToggleServiceCharge = (tableId, charge) => {
    setTables((prevTables) =>
      prevTables.map((t) =>
        t.id === tableId ? { ...t, serviceCharge: charge } : t,
      ),
    );
  };

  // 1. Send KOT (Kitchen Order Ticket): Transitions items to 'received' status in Kitchen
  const handleSendKOT = async (tableId, explicitItems = null) => {
    sounds.playBell();
    const tbl =
      tables.find(
        (t) =>
          String(t.id) === String(tableId) ||
          String(t.tableNumber) === String(tableId) ||
          String(t.name) === String(tableId),
      ) ||
      (selectedTableId &&
        tables.find((t) => String(t.id) === String(selectedTableId))) ||
      {};

    const rawItems =
      explicitItems && Array.isArray(explicitItems) && explicitItems.length > 0
        ? explicitItems
        : tbl?.items || [];

    if (!rawItems || rawItems.length === 0) {
      showToast("⚠️ Cannot send KOT: Table order has no items.", "error");
      return;
    }

    setTables((prevTables) =>
      prevTables.map((t) => {
        if (
          String(t.id) !== String(tableId) &&
          String(t.tableNumber) !== String(tableId) &&
          String(t.name) !== String(tableId)
        )
          return t;
        const updatedItems = (t.items || []).map((i) => ({
          ...i,
          kotStatus:
            i.kotStatus === "ready" ||
            i.kotStatus === "served" ||
            i.kotStatus === "completed"
              ? i.kotStatus
              : i.kotStatus === "cooking"
                ? "cooking"
                : "received",
        }));
        const allReady =
          updatedItems.length > 0 &&
          updatedItems.every(
            (i) =>
              i.kotStatus === "ready" ||
              i.kotStatus === "served" ||
              i.kotStatus === "completed",
          );

        return {
          ...t,
          status: "occupied",
          orderTime:
            t.orderTime ||
            new Date().toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
          orderTimestamp: t.orderTimestamp || Date.now(),
          items: updatedItems,
          completedAt: allReady ? t.completedAt : null,
          completedDuration: allReady ? t.completedDuration : null,
        };
      }),
    );

    const resolvedTableId =
      Number.isInteger(Number(tbl?.id)) && Number(tbl?.id) > 0
        ? Number(tbl?.id)
        : Number.isInteger(Number(tableId)) && Number(tableId) > 0
          ? Number(tableId)
          : null;

    const resolvedTableName =
      tbl?.name ||
      tbl?.tableNumber ||
      (typeof tableId === "string" ? tableId : `Table ${tableId}`);

    const kotPayload = {
      tableId: resolvedTableId,
      tableName: resolvedTableName,
      name: resolvedTableName,
      sectionArea: tbl?.section || tbl?.location || "Main Hall",
      section: tbl?.section || tbl?.location || "Main Hall",
      serverName: tbl?.server || tbl?.assignedServer || "Staff",
      server: tbl?.server || tbl?.assignedServer || "Staff",
      items: rawItems.map((item) => ({
        menuItemId:
          Number.isInteger(Number(item.id)) && Number(item.id) > 0
            ? Number(item.id)
            : Number.isInteger(Number(item.backendId)) &&
                Number(item.backendId) > 0
              ? Number(item.backendId)
              : null,
        id:
          Number.isInteger(Number(item.id)) && Number(item.id) > 0
            ? Number(item.id)
            : Number.isInteger(Number(item.backendId)) &&
                Number(item.backendId) > 0
              ? Number(item.backendId)
              : null,
        backendId:
          Number.isInteger(Number(item.backendId)) &&
          Number(item.backendId) > 0
            ? Number(item.backendId)
            : Number.isInteger(Number(item.id)) && Number(item.id) > 0
              ? Number(item.id)
              : null,
        dishName: item.name || item.dishName || "Dish Item",
        name: item.name || item.dishName || "Dish Item",
        quantity: Math.max(1, Number(item.quantity || 1)),
      })),
    };

    try {
      const res = await apiCreateKotOrder(kotPayload);
      if (res && res.success === false) {
        console.error("Failed to create KOT order:", res.error);
        showToast(
          `❌ KOT Failed: ${res.error || "Could not save KOT to backend"}`,
          "error",
        );
        return;
      }
      if (resolvedTableId) {
        apiUpdateTableStatus(resolvedTableId, "occupied").catch(() => {});
      }
      setIsKOTOpen(true);
      showToast(
        `📥 KOT Sent: Order Received from ${resolvedTableName}!`,
      );
    } catch (err) {
      console.error("Error creating KOT order:", err);
      showToast(
        `❌ KOT Error: ${err.message || "Failed to dispatch KOT order"}`,
        "error",
      );
    }
  };

  // 2. Kitchen KDS Action: Start cooking or update status
  const handleUpdateItemKotStatus = (tableId, status, itemId = null) => {
    const tbl = tables.find((t) => t.id === tableId);
    const itemObj =
      itemId && tbl ? tbl.items.find((i) => i.id === itemId) : null;
    const itemName = itemObj ? itemObj.name : null;

    setTables((prevTables) =>
      prevTables.map((t) => {
        if (t.id !== tableId) return t;
        const updatedItems = t.items.map((i) => {
          if (itemId) {
            return i.id === itemId ? { ...i, kotStatus: status } : i;
          }
          // Table-level status change
          if (status === "cooking") {
            // If starting cooking for the table, DO NOT revert already prepared/served/completed dishes back to cooking!
            if (
              i.kotStatus === "ready" ||
              i.kotStatus === "served" ||
              i.kotStatus === "completed"
            ) {
              return i;
            }
            return { ...i, kotStatus: "cooking" };
          }
          if (status === "ready") {
            return { ...i, kotStatus: "ready" };
          }
          return { ...i, kotStatus: status };
        });
        const allReady =
          updatedItems.length > 0 &&
          updatedItems.every(
            (i) =>
              i.kotStatus === "ready" ||
              i.kotStatus === "served" ||
              i.kotStatus === "completed",
          );

        let finalDuration = t.completedDuration;
        let finalCompletedAt = t.completedAt;
        let finalCookingStartedAt = t.cookingStartedAt;

        if (status === "cooking" && !finalCookingStartedAt) {
          finalCookingStartedAt = new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
          });
        }

        if (allReady) {
          if (!finalDuration && t.orderTime) {
            finalDuration = formatElapsedTimer(parseTimeToSeconds(t.orderTime));
          }
          if (!finalCompletedAt) {
            finalCompletedAt = new Date().toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
              hour12: true,
            });
          }
          if (!finalCookingStartedAt) {
            finalCookingStartedAt = t.orderTime || finalCompletedAt;
          }
        } else {
          // Table is not fully ready (e.g. some items cooking or received)
          finalDuration = null;
          finalCompletedAt = null;
        }

        return {
          ...t,
          items: updatedItems,
          cookingStartedAt: finalCookingStartedAt,
          completedAt: finalCompletedAt,
          completedDuration: finalDuration,
        };
      }),
    );

    if (status === "cooking") {
      triggerKitchenNotification({
        tableId,
        tableName: tbl?.name || `Table ${tableId}`,
        type: "cooking_started",
        title: "🔥 Cooking Started",
        message: itemName
          ? `Chef started cooking "${itemName}" for ${tbl?.name || `Table ${tableId}`}!`
          : `Chef started cooking order for ${tbl?.name || `Table ${tableId}`}!`,
      });
      showToast(`🔥 ${tbl?.name || `Table ${tableId}`}: Chef started cooking!`);
    } else if (status === "received") {
      showToast(
        `📥 ${tbl?.name || `Table ${tableId}`}: Reverted to Order Received.`,
      );
    } else if (status === "ready") {
      triggerKitchenNotification({
        tableId,
        tableName: tbl?.name || `Table ${tableId}`,
        type: "cooking_completed",
        title: itemName ? `🔔 "${itemName}" Ready!` : "🔔 Food Ready to Serve!",
        message: itemName
          ? `"${itemName}" is prepared and ready to serve for ${tbl?.name || `Table ${tableId}`}!`
          : `Order preparation completed for ${tbl?.name || `Table ${tableId}`}! Food is ready to serve.`,
      });
      showToast(
        `✅ ${tbl?.name || `Table ${tableId}`}: Marked Prepared & Ready!`,
      );
    }

    if (itemId) {
      const kotItemStatus = status === "ready" ? "READY" : (status === "cooking" ? "IN PREP" : "PENDING");
      apiUpdateKotItemStatus(tableId, itemId, kotItemStatus).catch(() => {});
    } else {
      const kotOrderStatus = status === "ready" ? "PREPARATION COMPLETED" : (status === "cooking" ? "IN PREPARATION" : "PENDING");
      apiUpdateKotStatus(tableId, kotOrderStatus).catch(() => {});
    }
  };

  // 3. Kitchen KDS Action: Mark preparation completed
  const handleCompleteTableKot = (
    tableId,
    itemId = null,
    completedDuration = null,
    completedAt = null,
  ) => {
    const tbl = tables.find((t) => t.id === tableId);
    const itemObj =
      itemId && tbl ? tbl.items.find((i) => i.id === itemId) : null;
    const nowTimeStr =
      completedAt ||
      new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });

    setTables((prevTables) =>
      prevTables.map((t) => {
        if (t.id !== tableId) return t;
        const updatedItems = t.items.map((i) => {
          if (itemId && i.id !== itemId) return i;
          return { ...i, kotStatus: "ready" };
        });
        const allReady =
          updatedItems.length > 0 &&
          updatedItems.every(
            (i) =>
              i.kotStatus === "ready" ||
              i.kotStatus === "served" ||
              i.kotStatus === "completed",
          );

        let finalDuration = null;
        let finalCompletedAt = null;

        if (allReady) {
          if (completedDuration) {
            finalDuration = completedDuration;
          } else if (t.completedDuration) {
            finalDuration = t.completedDuration;
          } else if (t.orderTime) {
            finalDuration = formatElapsedTimer(parseTimeToSeconds(t.orderTime));
          }
          finalCompletedAt = t.completedAt || nowTimeStr;
        }

        return {
          ...t,
          items: updatedItems,
          cookingStartedAt: t.cookingStartedAt || t.orderTime || nowTimeStr,
          completedAt: finalCompletedAt,
          completedDuration: finalDuration,
        };
      }),
    );

    if (itemId) {
      apiUpdateKotItemStatus(tableId, itemId, "READY").catch(() => {});
    } else {
      apiMarkAllPrepared(tableId).catch(() => {});
    }

    const isSingleItem = Boolean(itemObj);
    triggerKitchenNotification({
      tableId,
      tableName: tbl?.name || `Table ${tableId}`,
      type: "cooking_completed",
      title: isSingleItem
        ? `🔔 Prepared: ${itemObj.name}`
        : "🔔 Cooking Completed!",
      message: isSingleItem
        ? `"${itemObj.name}" is prepared! Ready to serve.`
        : `All dishes for ${tbl?.name || `Table ${tableId}`} are cooked and ready to serve! 🍽️`,
    });
    showToast(
      isSingleItem
        ? `✅ ${tbl?.name || `Table ${tableId}`}: "${itemObj.name}" marked prepared!`
        : `✅ ${tbl?.name || `Table ${tableId}`}: Order preparation completed! Ready to serve.`,
    );
  };

  // Clear / Void Table Order
  const handleClearOrder = (tableId) => {
    if (
      window.confirm(
        `Are you sure you want to clear the entire order for Table ${tableId}?`,
      )
    ) {
      setTables((prevTables) =>
        prevTables.map((t) => {
          if (t.id !== tableId) return t;
          return {
            ...t,
            items: [],
            status: "vacant",
            guests: 0,
            orderTime: null,
            discountPercent: 0,
          };
        }),
      );
      apiVacateTable(tableId).catch(() => {});
      apiUpdateTableStatus(tableId, "available").catch(() => {});
      showToast(`Table ${tableId} order cleared.`);
    }
  };

  // Transfer Table Order
  const handleConfirmTransfer = (sourceId, targetId) => {
    const source = tables.find((t) => t.id === sourceId);
    if (!source) return;

    setTables((prevTables) =>
      prevTables.map((t) => {
        if (t.id === targetId) {
          return {
            ...t,
            items: [...source.items],
            status: "occupied",
            guests: source.guests,
            orderTime: source.orderTime,
            discountPercent: source.discountPercent,
            serviceCharge: source.serviceCharge,
          };
        }
        if (t.id === sourceId) {
          return {
            ...t,
            items: [],
            status: "vacant",
            guests: 0,
            orderTime: null,
            discountPercent: 0,
          };
        }
        return t;
      }),
    );

    apiUpdateTableStatus(targetId, "occupied").catch(() => {});
    apiVacateTable(sourceId).catch(() => {});
    apiUpdateTableStatus(sourceId, "available").catch(() => {});

    setIsTransferOpen(false);
    setSelectedTableId(targetId);
    showToast(`Transferred Table ${sourceId} to Table ${targetId}!`);
  };

  // Confirm Payment & Settle Bill
  const handleConfirmPayment = (settlementData) => {
    const rawItems = Array.isArray(settlementData.items) ? settlementData.items : [];
    const billableItems = rawItems
      .map((item) => ({
        ...item,
        name: String(item?.name || item?.dishName || "").trim(),
        quantity: Number(item?.quantity ?? item?.qty) || 0,
        price: Number(item?.price ?? item?.unitPrice) || 0,
      }))
      .filter((item) => item.name && item.quantity > 0);
    const hasInvalidItems = rawItems.some((item) =>
      !String(item?.name || item?.dishName || "").trim() ||
      !(Number(item?.quantity ?? item?.qty) > 0) ||
      !Number.isFinite(Number(item?.price ?? item?.unitPrice)) ||
      Number(item?.price ?? item?.unitPrice) < 0,
    );
    if (billableItems.length === 0 || hasInvalidItems) {
      showToast("Cannot settle this bill: remove or correct every unnamed/invalid item first.");
      setIsSettlementOpen(false);
      return;
    }
    settlementData = { ...settlementData, items: billableItems };
    const tableObj = tables.find((t) => t.id === settlementData.tableId);
    let finalDuration = tableObj?.completedDuration;
    if (!finalDuration && tableObj?.orderTime) {
      finalDuration = formatElapsedTimer(
        parseTimeToSeconds(tableObj.orderTime, settlementData.settledAt),
      );
    }
    const enrichedSettlement = {
      ...settlementData,
      id:
        settlementData.id ||
        `ord_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      date: settlementData.date || getTodayDateString(),
      status: "Settled",
      Status: "Settled",
      paymentMethod: settlementData.paymentMethod || "upi",
      paymentMode: settlementData.paymentMode || settlementData.paymentMethod || "upi",
      PaymentMethod: settlementData.PaymentMethod || settlementData.paymentMethod || "upi",
      cookingStartedAt:
        tableObj?.cookingStartedAt ||
        tableObj?.orderTime ||
        settlementData.settledAt,
      completedAt: tableObj?.completedAt || settlementData.settledAt,
      completedDuration: finalDuration || "",
      guests:
        (Number(tableObj?.guests) > 0 ? Number(tableObj.guests) : null) ??
        (Number(settlementData.guests) > 0 ? Number(settlementData.guests) : null) ??
        (Number(tableObj?.capacity) > 0 ? Number(tableObj.capacity) : null) ??
        2,
      capacity: tableObj?.capacity || settlementData.capacity || 0,
      orderTime: tableObj?.orderTime || settlementData.settledAt,
      orderTimestamp: tableObj?.orderTimestamp || Date.now(),
    };

    // Deduct recipe ingredients once the bill is paid.
    try {
      const inventory = JSON.parse(localStorage.getItem(STORAGE_KEY_INVENTORY) || "[]");
      if (Array.isArray(inventory) && inventory.length) {
        const usageByIngredient = new Map();
        (settlementData.items || []).forEach((orderedItem) => {
          const dish = menuItems.find((item) =>
            String(item.id) === String(orderedItem.id) ||
            item.name?.trim().toLowerCase() === orderedItem.name?.trim().toLowerCase(),
          );
          const dishCount = Number(orderedItem.quantity) || 1;
          (dish?.recipe || []).forEach((ingredient) => {
            const ingredientId = String(ingredient.inventoryId);
            const amount = Number(ingredient.quantity) * dishCount;
            if (ingredientId && Number.isFinite(amount) && amount > 0) {
              usageByIngredient.set(ingredientId, (usageByIngredient.get(ingredientId) || 0) + amount);
            }
          });
        });

        if (usageByIngredient.size) {
          const updatedInventory = inventory.map((ingredient) => {
            const used = usageByIngredient.get(String(ingredient.id));
            if (!used) return ingredient;
            return {
              ...ingredient,
              stock: Math.max(0, Number(ingredient.stock || 0) - used),
              totalUsed: Number(ingredient.totalUsed || 0) + used,
            };
          });
          localStorage.setItem(STORAGE_KEY_INVENTORY, JSON.stringify(updatedInventory));
          pushGlobalSync({ [STORAGE_KEY_INVENTORY]: updatedInventory });
          window.dispatchEvent(new CustomEvent("avsr-inventory-updated", { detail: updatedInventory }));
        }
      }
    } catch {}

    const updatedPastOrders = dedupeOrders([enrichedSettlement, ...pastOrders]);
    setPastOrders(updatedPastOrders);
<<<<<<< HEAD

    const orderPayload = {
      tableId: Number.isInteger(Number(settlementData.tableId)) ? Number(settlementData.tableId) : null,
      tableName: tableObj?.name || tableObj?.tableNumber || `Table ${settlementData.tableId}`,
      tableNumber: tableObj?.tableNumber || tableObj?.name || `Table ${settlementData.tableId}`,
      serverName: tableObj?.server || "Staff",
      guests: Number(enrichedSettlement.guests) || 1,
      paymentMethod: settlementData.paymentMethod || "Cash",
      discountPercent: Number(settlementData.discountPercent) || 0,
      serviceChargeEnabled: true,
      tipAmount: Number(settlementData.tipAmount) || 0,
      status: "Settled",
      items: billableItems.map((item) => ({
        id: Number.isInteger(Number(item.id)) ? Number(item.id) : null,
        backendId: Number.isInteger(Number(item.backendId)) ? Number(item.backendId) : null,
        menuItemId: Number.isInteger(Number(item.id || item.backendId)) ? Number(item.id || item.backendId) : null,
        dishName: item.name,
        name: item.name,
        price: Number(item.price) || 0,
        quantity: Math.max(1, Number(item.quantity) || 1),
      })),
    };

    apiCreateOrder(orderPayload)
      .then((res) => {
        if (res && res.success !== false) {
          apiGetOrderHistory()
            .then((hRes) => {
              const resData = hRes?.data ?? hRes;
              const freshHistory = Array.isArray(resData)
                ? resData
                : Array.isArray(resData?.data)
                  ? resData.data
                  : [];
              if (freshHistory.length > 0) {
                setPastOrders(dedupeOrders(freshHistory));
              }
            })
            .catch(() => {});
        }
      })
      .catch(() => {});

=======
>>>>>>> 4f6f6355e5450a66e56126e52fac8b40f2572b2d
    try {
      localStorage.setItem(
        STORAGE_KEY_ORDERS,
        JSON.stringify(updatedPastOrders),
      );
      pushGlobalSync({ [STORAGE_KEY_ORDERS]: updatedPastOrders });
    } catch {}
    apiCreateOrder(enrichedSettlement).catch(() => {});

    const updatedTables = tables.map((t) => {
      if (t.id !== settlementData.tableId) return t;
      return {
        ...t,
        items: [],
        status: "vacant",
        orderTime: null,
        discountPercent: 0,
        guests: 0,
      };
    });
    setTables(updatedTables);
    apiVacateTable(settlementData.tableId).catch(() => {});
    apiUpdateTableStatus(settlementData.tableId, "available").catch(() => {});
    try {
      const isDeleted = (id) =>
        (Array.isArray(deletedTableIds) ? deletedTableIds : []).some(
          (d) => String(d) === String(id),
        );
      const cleanTables = updatedTables
        .map((t) => ({ ...t, items: Array.isArray(t.items) ? t.items : [] }))
        .filter((t) => !isDeleted(t.id));
      localStorage.setItem(STORAGE_KEY_TABLES, JSON.stringify(cleanTables));
    } catch {}

    setIsSettlementOpen(false);
    showToast(
      `✅ ${settlementData.tableName} bill settled via ${settlementData.paymentMethod.toUpperCase()}`,
    );

    setReprintReceiptData({
      id: settlementData.tableId,
      name: settlementData.tableName,
      section: settlementData.section,
      server: settlementData.server || "",
      guests: enrichedSettlement.guests,
      orderTime: enrichedSettlement.orderTime,
      settledAt: enrichedSettlement.settledAt,
      items: settlementData.items,
      discountPercent: 0,
      serviceCharge: 0,
      subtotal: settlementData.subtotal,
      taxAmount: settlementData.taxAmount,
      serviceChargeAmount: settlementData.serviceChargeAmount,
      grandTotal: settlementData.grandTotal,
      paymentMethod: settlementData.paymentMethod,
      invoiceNo: settlementData.invoiceNo,
      date: enrichedSettlement.date,
    });
    setIsReceiptOpen(true);
  };

  const handleUpdateInvoiceDiscount = async (orderId, discountPercent) => {
    const updateResult = await apiUpdateOrderDiscount(orderId, discountPercent);
    if (!updateResult?.success || updateResult.data?.success === false) {
      throw new Error(updateResult?.error || updateResult?.data?.message || "The server could not update this invoice discount.");
    }

    const historyResult = await apiGetOrderHistory();
    const history = historyResult?.data ?? historyResult;
    const orders = Array.isArray(history?.orders)
      ? history.orders
      : Array.isArray(history?.data)
        ? history.data
        : Array.isArray(history)
          ? history
          : null;
    if (!historyResult?.success || !orders) {
      throw new Error("The discount was sent to the server, but the updated invoice list could not be refreshed. Reload Admin Invoices to confirm it.");
    }

    const updatedOrders = dedupeOrders(orders);
    setPastOrders(updatedOrders);
    try {
      localStorage.setItem(STORAGE_KEY_ORDERS, JSON.stringify(updatedOrders));
    } catch {}
  };

  // ================= ADMIN ACTIONS =================
  // 1. Menu Items Admin
  const handleAddMenuItem = async (newItem) => {
    const isSpecialValue = Boolean(
      newItem.isChefSpecial ?? newItem.isChefsSpecial ?? newItem.isSpecial
    );
    let result = await apiCreateMenuItem({
      ...newItem,
      isChefSpecial: isSpecialValue,
      isChefsSpecial: isSpecialValue,
      isSpecial: isSpecialValue,
    });
    let createdItem = {};
    if (result?.success && result.data?.success !== false) {
      createdItem = result.data?.menuItem || result.data?.item || result.data?.data || result.data || {};
      showToast(`✅ Dish "${newItem.name}" saved to the backend menu!`);
    } else {
      showToast(`✅ Dish "${newItem.name}" saved locally!`);
    }

    const createdId =
      createdItem.menuItemId ??
      createdItem.menu_item_id ??
      createdItem.id ??
      newItem.id;

    if (isSpecialValue && createdId) {
      try {
        await apiSetMenuSpecialStatus(createdId, true);
      } catch {}
    }

    const savedItem = normalizeMenuItem({
      ...newItem,
      ...createdItem,
      isChefSpecial: isSpecialValue,
      isChefsSpecial: isSpecialValue,
      isSpecial: isSpecialValue,
      id: createdId,
    });
    setMenuItems((prev) => {
      const nextMenu = [savedItem, ...prev.filter((item) => String(item.id) !== String(savedItem.id))];
      try {
        localStorage.setItem(STORAGE_KEY_MENU, JSON.stringify(nextMenu));
      } catch {}
      return nextMenu;
    });
    return true;
  };

  const handleUpdateMenuItem = async (updatedItem) => {
    const isSpecialValue = Boolean(
      updatedItem.isChefSpecial ??
      updatedItem.isChefsSpecial ??
      updatedItem.isSpecial
    );

    // Call update API (PUT)
    let result = await apiUpdateMenuItem(updatedItem.id, {
      ...updatedItem,
      isChefSpecial: isSpecialValue,
      isChefsSpecial: isSpecialValue,
      isSpecial: isSpecialValue,
    });

    // Also persist directly via dedicated special-status endpoint
    try {
      await apiSetMenuSpecialStatus(updatedItem.id, isSpecialValue);
    } catch {}

    const responseItem = (result?.success && (result.data?.menuItem || result.data?.item || result.data?.data)) || {};
    const savedItem = normalizeMenuItem({
      ...updatedItem,
      ...responseItem,
      isChefSpecial: isSpecialValue,
      isChefsSpecial: isSpecialValue,
      isSpecial: isSpecialValue,
      id: responseItem.id ?? responseItem.menuItemId ?? updatedItem.id,
    });

    setMenuItems((prev) => {
      const nextMenu = prev.map((item) => String(item.id) === String(savedItem.id) ? savedItem : item);
      try {
        localStorage.setItem(STORAGE_KEY_MENU, JSON.stringify(nextMenu));
      } catch {}
      return nextMenu;
    });
    showToast(`Updated "${savedItem.name}"`);
    return true;
  };

  const handleDeleteMenuItem = async (itemId) => {
    try {
      const res = await apiDeleteMenuItem(itemId);
      if (res && res.success === false) {
        showToast(`Failed to delete menu item: ${res.error || res.message || 'API error'}`);
        return false;
      }
    } catch (err) {
      console.warn("Delete menu item API error:", err);
    }
    const item = menuItems.find((i) => String(i.id) === String(itemId));
    const nextMenu = menuItems.filter((i) => String(i.id) !== String(itemId));
    setMenuItems(nextMenu);
    try {
      localStorage.setItem(STORAGE_KEY_MENU, JSON.stringify(nextMenu));
    } catch {}
    pushGlobalSync({
      [STORAGE_KEY_MENU]: nextMenu,
      deletedMenuItemId: String(itemId),
    });
    showToast(`Removed "${item?.name || "Item"}" from menu.`);
    return true;
  };

  const handleSetMenuAvailability = async (itemId, isAvailable) => {
    const result = await apiSetMenuAvailability(itemId, isAvailable);
    if (!result?.success || result.data?.success === false) {
      showToast(`Availability update failed: ${result?.error || result?.data?.message || "API error"}`);
      return false;
    }
    setMenuItems((prev) => prev.map((item) => String(item.id) === String(itemId) ? { ...item, isAvailable } : item));
    return true;
  };

  const handleSetMenuSpecial = async (itemId, isSpecial) => {
    const result = await apiSetMenuSpecialStatus(itemId, isSpecial);
    if (!result?.success || result.data?.success === false) {
      showToast(`Chef's Special update failed: ${result?.error || result?.data?.message || "API error"}`);
      return false;
    }
    setMenuItems((prev) => prev.map((item) => String(item.id) === String(itemId) ? { ...item, isChefSpecial: isSpecial } : item));
    return true;
  };
  // 2. Tables & Chairs Admin
  const handleAddTable = async (newTable) => {
    const tableNum = String(newTable.tableNumber || newTable.name || newTable.tableName || "").trim();
    if (!tableNum) {
      showToast("❌ Table Number is required.");
      return false;
    }
    if (tableNum.length > 10) {
      showToast("❌ Table Number must not exceed 10 characters.");
      return false;
    }

    const branch = Number(newTable.branchId) || 1;
    const capacity = Number(newTable.capacity || newTable.capacityChairs) || 4;
    const section = String(newTable.section || newTable.sectionArea || newTable.location || "Main Hall").trim();
    const assignedServerId = newTable.assignedServerId ? Number(newTable.assignedServerId) : null;
    const serverName = newTable.server || newTable.assignedServerName || "";

    try {
      const response = await apiCreateTable({
        tableNumber: tableNum,
        name: tableNum,
        tableName: tableNum,
        branchId: branch,
        section: section,
        sectionArea: section,
        location: section,
        capacity: capacity,
        capacityChairs: capacity,
        status: "available",
        assignedServerId: assignedServerId,
        server: serverName
      });

      if (!response?.success) {
        const errorMsg = response?.error || response?.data?.message || "Failed to create table on server.";
        showToast(`❌ ${errorMsg}`);
        return false;
      }

      const serverTable = response?.data?.data || response?.data || response;
      const assignedId = Number(serverTable?.tableId || serverTable?.id || newTable.id);

      const normalizedTable = {
        ...newTable,
        id: assignedId,
        tableId: assignedId,
        name: serverTable?.tableNumber || serverTable?.tableName || tableNum,
        tableName: serverTable?.tableName || serverTable?.tableNumber || tableNum,
        tableNumber: serverTable?.tableNumber || tableNum,
        branchId: Number(serverTable?.branchId || branch),
        section: serverTable?.sectionArea || serverTable?.location || section,
        location: serverTable?.location || serverTable?.sectionArea || section,
        capacity: Number(serverTable?.capacity || serverTable?.capacityChairs || capacity),
        status: String(serverTable?.status || "available").toLowerCase(),
        server: serverTable?.assignedServerName || serverTable?.server || serverName || "Staff",
        assignedServerId: serverTable?.assignedServerId || assignedServerId
      };

      const nextDeleted = deletedTableIds.filter(
        (id) => String(id) !== String(assignedId),
      );
      setDeletedTableIds(nextDeleted);
      try {
        localStorage.setItem(
          STORAGE_KEY_DELETED_TABLES,
          JSON.stringify(nextDeleted),
        );
      } catch {}
<<<<<<< HEAD

      setTables((prev) => {
        const filtered = prev.filter((t) => Number(t.id) !== assignedId);
        const updated = [...filtered, normalizedTable];
        try {
          localStorage.setItem(STORAGE_KEY_TABLES, JSON.stringify(updated));
        } catch {}
        return updated;
      });

      showToast(`✅ Created Table ${normalizedTable.tableNumber} with ${normalizedTable.capacity} chairs!`);
      return true;
    } catch (err) {
      console.error("Failed to create table via API:", err);
      showToast(`❌ Failed to connect to server: ${err.message || "Network Error"}`);
      return false;
    }
=======
      return updated;
    });
    const targetApiId = updatedTable.backendTableId || updatedTable.id;
    apiUpdateTable(targetApiId, updatedTable).catch(() => {});
    showToast(
      `✅ Updated ${updatedTable.name} (${updatedTable.capacity} chairs)`,
    );
>>>>>>> 4f6f6355e5450a66e56126e52fac8b40f2572b2d
  };

  const handleUpdateTable = async (updatedTable) => {
    const tableNum = String(updatedTable.tableNumber || updatedTable.name || updatedTable.tableName || "").trim();
    if (!tableNum) {
      showToast("❌ Table Number is required.");
      return false;
    }
    if (tableNum.length > 10) {
      showToast("❌ Table Number must not exceed 10 characters.");
      return false;
    }
    const branch = Number(updatedTable.branchId) || 1;
    const capacity = Number(updatedTable.capacity || updatedTable.capacityChairs) || 4;
    const section = String(updatedTable.section || updatedTable.sectionArea || updatedTable.location || "Main Hall").trim();
    const assignedServerId = updatedTable.assignedServerId ? Number(updatedTable.assignedServerId) : null;
    const serverName = updatedTable.server || updatedTable.assignedServerName || "";

    try {
      const response = await apiUpdateTable(updatedTable.id, {
        tableNumber: tableNum,
        name: tableNum,
        tableName: tableNum,
        branchId: branch,
        section: section,
        sectionArea: section,
        location: section,
        capacity: capacity,
        capacityChairs: capacity,
        status: updatedTable.status || "available",
        assignedServerId: assignedServerId,
        server: serverName
      });

      if (!response?.success) {
        const errorMsg = response?.error || response?.data?.message || "Failed to update table on server.";
        showToast(`❌ ${errorMsg}`);
        return false;
      }

      setTables((prev) => {
        const updated = prev.map((t) =>
          String(t.id) === String(updatedTable.id)
            ? { ...updatedTable, name: tableNum, tableNumber: tableNum, tableName: tableNum, branchId: branch, location: section, section: section, capacity: capacity, server: serverName, assignedServerId: assignedServerId }
            : t,
        );
        try {
          localStorage.setItem(STORAGE_KEY_TABLES, JSON.stringify(updated));
        } catch {}
        return updated;
      });

      showToast(`✅ Updated ${tableNum} (${capacity} chairs)`);
      return true;
    } catch (err) {
      console.warn("Update table API error:", err);
      showToast(`❌ Failed to connect to server: ${err.message || "Network Error"}`);
      return false;
    }
  };

  const handleDeleteTable = async (tableId) => {
    const tbl = tables.find((t) => String(t.id) === String(tableId));
    try {
      const response = await apiDeleteTable(tableId);
      if (!response?.success) {
        const errorMsg = response?.error || response?.data?.message || "Failed to delete table on server.";
        showToast(`❌ ${errorMsg}`);
        return false;
      }
    } catch (err) {
      console.warn("Delete table API error:", err);
      showToast(`❌ Failed to connect to server: ${err.message || "Network Error"}`);
      return false;
    }

    // 1. Permanently register this table ID as deleted
    const nextDeleted = [
      ...new Set(
        [...deletedTableIds, tableId, String(tableId), Number(tableId)].filter(
          Boolean,
        ),
      ),
    ];
    setDeletedTableIds(nextDeleted);
    try {
      localStorage.setItem(
        STORAGE_KEY_DELETED_TABLES,
        JSON.stringify(nextDeleted),
      );
    } catch {}

    // 2. Remove table from active list and persist immediately
    const nextTables = tables.filter((t) => String(t.id) !== String(tableId));
    setTables(nextTables);
    try {
      localStorage.setItem(STORAGE_KEY_TABLES, JSON.stringify(nextTables));
    } catch {}

    // 3. If currently selected table in billing view is this deleted table, switch to first remaining table
    if (String(selectedTableId) === String(tableId)) {
      setSelectedTableId(nextTables.length > 0 ? nextTables[0].id : 1);
    }

<<<<<<< HEAD
    showToast(`🗑️  Permanently Deleted ${tbl?.name || "Table"}`);
    return true;
=======
    const targetApiId = tbl?.backendTableId || tableId;
    apiDeleteTable(targetApiId).catch(() => {});
    showToast(`🗑️  Permanently Deleted ${tbl?.name || "Table"}`);
>>>>>>> 4f6f6355e5450a66e56126e52fac8b40f2572b2d
  };

  // 3. Staff & Persons Admin
  const handleAddStaff = async (newPerson) => {
    const result = await apiCreateStaff(newPerson);
    const createdStaff = result?.data?.data ?? result?.data;
    const staffId = createdStaff?.staffId ?? createdStaff?.id;
    if (!result?.success || !staffId) {
      showToast(
        `⚠️  Staff member was not saved to the backend: ${result?.error || "Unknown API error"}`,
      );
      return false;
    }

    const savedStaff = {
      ...createdStaff,
      id: staffId,
      name: createdStaff.fullName || createdStaff.name || newPerson.name,
      role: createdStaff.roleTitle || createdStaff.role || newPerson.role,
      employeeId:
        newPerson.employeeId ||
        `EMP-${String(staffId).padStart(3, "0")}`,
    };
    setStaffList((prev) => [...prev, savedStaff]);
    showToast(
      `✅ ${savedStaff.name} saved with Employee ID ${savedStaff.employeeId || `EMP-${String(staffId).padStart(5, "0")}`}`,
    );
    return true;
  };

  const handleUpdateStaff = async (updatedPerson) => {
    const personId = updatedPerson.id ?? updatedPerson.staffId;
    const oldPerson = staffList.find(
      (p) => String(p.id ?? p.staffId) === String(personId),
    );
    const oldName =
      oldPerson?.name || oldPerson?.fullName || oldPerson?.FullName;
    const newName = updatedPerson.name;

    setStaffList((prev) =>
      prev.map((p) =>
        String(p.id ?? p.staffId) === String(personId)
          ? { ...p, ...updatedPerson }
          : p,
      ),
    );

    if (oldName && newName && oldName !== newName) {
      setTables((prev) => {
        const updated = prev.map((t) =>
          t.server === oldName ? { ...t, server: newName } : t,
        );
        try {
          localStorage.setItem(STORAGE_KEY_TABLES, JSON.stringify(updated));
        } catch {}
        return updated;
      });
    }

    apiUpdateStaff(personId, {
      name: updatedPerson.name,
      role: updatedPerson.role || "Waiter",
      phone: updatedPerson.phone || "",
      email: updatedPerson.email || "",
      shift: updatedPerson.shift || "Full Day",
    }).catch(() => {});

    showToast(`✅ Updated staff details for "${updatedPerson.name}"`);
    return true;
  };

  const handleDeleteStaff = async (personId) => {
    const person = staffList.find((p) => (p.id ?? p.staffId) === personId);
<<<<<<< HEAD
    try {
      await apiDeleteStaff(personId);
    } catch (err) {
      console.warn("Delete staff API error:", err);
    }
    const nextStaff = staffList.filter((p) => (p.id ?? p.staffId) !== personId);
    setStaffList(nextStaff);
    try {
      localStorage.setItem(STORAGE_KEY_STAFF, JSON.stringify(nextStaff));
    } catch {}
=======
    setStaffList((prev) =>
      prev.filter((p) => (p.id ?? p.staffId) !== personId),
    );
    apiDeleteStaff(personId).catch(() => {});
>>>>>>> 4f6f6355e5450a66e56126e52fac8b40f2572b2d
    showToast(`🗑️  Removed "${person?.name || person?.fullName || "Staff"}"`);
  };

  // Reset to default initial state
  const handleResetData = () => {
    requestDelete({
      title: "Reset All Restaurant Data?",
      message:
        "Clear all dynamic tables, menu items, staff, invoices and inventory? This cannot be undone.",
      confirmLabel: "Yes, Reset All",
      onConfirm: () => {
        setDeletedTableIds([]);
        setTables(INITIAL_TABLES);
        setMenuItems([]);
        setStaffList([]);
        setPastOrders([]);
        setInventory([]);
        localStorage.setItem(
          STORAGE_KEY_TABLES,
          JSON.stringify(INITIAL_TABLES),
        );
        localStorage.setItem(STORAGE_KEY_DELETED_TABLES, "[]");
        localStorage.setItem(STORAGE_KEY_MENU, "[]");
        localStorage.setItem(STORAGE_KEY_STAFF, "[]");
        localStorage.setItem(STORAGE_KEY_ORDERS, "[]");
        localStorage.setItem(STORAGE_KEY_INVENTORY, "[]");
        pushGlobalSync({
          [STORAGE_KEY_TABLES]: INITIAL_TABLES,
          [STORAGE_KEY_MENU]: [],
          [STORAGE_KEY_STAFF]: [],
          [STORAGE_KEY_ORDERS]: [],
          [STORAGE_KEY_INVENTORY]: [],
        });
        showToast("Data reset to default 15 tables.");
      },
    });
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        background: "var(--bg-primary)",
      }}
    >
      {/* Top Header shown only on User POS (Dining Floor & Billing) when logged in */}
      {isUserRoute &&
        posSession &&
        (posSession.role === "pos" || posSession.role === "admin") && (
          <Header
            restaurantName={restaurantSettings.restaurantName}
            restaurantLogo={restaurantSettings.logo}
            tables={tables}
            activeView={activeView}
            setActiveView={setActiveView}
            selectedTableId={selectedTableId}
            onResetData={handleResetData}
            onOpenPastOrders={() => setIsPastOrdersOpen(true)}
            onOpenAdmin={() => navigate("/admin")}
            onOpenKOTView={() => navigate("/kot")}
            currentTheme={theme}
            onChangeTheme={setTheme}
            currentSession={posSession}
            onLogout={handlePosLogout}
            kitchenNotifications={kitchenNotifications}
            onClearNotifications={handleClearNotifications}
            onSelectTable={(tblId) => {
              setSelectedTableId(tblId);
              setActiveView("order");
              navigate("/");
            }}
          />
        )}

      {/* Main Separate Routes Rendering */}
      <main style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        {/* 1. DEDICATED KITCHEN KOT VIEW (ROUTE: /kot) - ONLY KOT RELATED! */}
        {isKotRoute &&
          (kotSession &&
          (kotSession.role === "kot" || kotSession.role === "admin") ? (
            <ErrorBoundary>
              <KitchenKOTView
                tables={tables}
                pastOrders={pastOrders}
                restaurantName={restaurantSettings.restaurantName}
                restaurantLogo={restaurantSettings.logo}
                currentTheme={theme}
                onChangeTheme={setTheme}
                onBackToFloor={() => {
                  setActiveView("tables");
                  navigate("/");
                }}
                onUpdateItemKotStatus={handleUpdateItemKotStatus}
                onCompleteTableKot={handleCompleteTableKot}
                onOpenTableOrder={(tableId) => {
                  setSelectedTableId(tableId);
                  setActiveView("order");
                  navigate("/");
                }}
                currentSession={kotSession}
                onLogout={handleKotLogout}
              />
            </ErrorBoundary>
          ) : (
            <LoginPage role="kot" onLoginSuccess={handleGlobalLogin} restaurantName={restaurantSettings.restaurantName} />
          ))}

        {/* 2. DEDICATED ADMIN PORTAL VIEW (ROUTE: /admin) */}
        {isAdminRoute &&
          (adminSession && adminSession.role === "admin" ? (
            <AdminPortal
              isFullPage={true}
              onClose={() => navigate("/")}
              menuItems={menuItems}
              onAddMenuItem={handleAddMenuItem}
              onUpdateMenuItem={handleUpdateMenuItem}
              onDeleteMenuItem={handleDeleteMenuItem}
              onSetMenuAvailability={handleSetMenuAvailability}
              onSetMenuSpecial={handleSetMenuSpecial}
              tables={tables}
              onAddTable={handleAddTable}
              onUpdateTable={handleUpdateTable}
              onDeleteTable={handleDeleteTable}
              staffList={staffList}
              onAddStaff={handleAddStaff}
              onUpdateStaff={handleUpdateStaff}
              onDeleteStaff={handleDeleteStaff}
              onOpenKOTView={() => navigate("/kot")}
              onUpdateItemKotStatus={handleUpdateItemKotStatus}
              onCompleteTableKot={handleCompleteTableKot}
              currentSession={adminSession}
              onLogout={handleAdminLogout}
              currentTheme={theme}
              onChangeTheme={setTheme}
              pastOrders={pastOrders}
              onUpdateInvoiceDiscount={handleUpdateInvoiceDiscount}
            />
          ) : (
            <LoginPage role="admin" onLoginSuccess={handleGlobalLogin} restaurantName={restaurantSettings.restaurantName} />
          ))}

        {/* 3. DEDICATED USER POS VIEW (ROUTE: / or /user) */}
        {isUserRoute &&
          (posSession &&
          (posSession.role === "pos" || posSession.role === "admin") ? (
            <>
              {activeView === "tables" && (
                <TableView tables={tables} onSelectTable={handleSelectTable} />
              )}
              {activeView === "order" && (
                <TableDetailView
                  table={currentTable}
                  allTables={tables}
                  menuItems={menuItems}
                  onSelectTable={setSelectedTableId}
                  onBackToTables={() => setActiveView("tables")}
                  onAddItemToTable={handleAddItemToTable}
                  onUpdateItemQuantity={handleUpdateItemQuantity}
                  onRemoveItemFromTable={handleRemoveItemFromTable}
                  onUpdateItemNotes={handleUpdateItemNotes}
                  onUpdateGuests={handleUpdateGuests}
                  onUpdateDiscount={handleUpdateDiscount}
                  onToggleServiceCharge={handleToggleServiceCharge}
                  onSendKOT={handleSendKOT}
                  onOpenReceipt={() => {
                    setReprintReceiptData(null);
                    setIsReceiptOpen(true);
                  }}
                  onOpenSettlement={() => {
                    const items = Array.isArray(currentTable?.items) ? currentTable.items : [];
                    const hasValidItems = items.length > 0 && items.every((item) =>
                      String(item?.name || item?.dishName || menuItems.find((menuItem) => String(menuItem.id) === String(item?.menuItemId ?? item?.id))?.name || "").trim() &&
                      Number(item?.quantity ?? item?.qty) > 0 &&
                      Number.isFinite(Number(item?.price ?? item?.unitPrice)) &&
                      Number(item?.price ?? item?.unitPrice) >= 0,
                    );
                    if (!hasValidItems) {
                      showToast("Cannot settle: remove or correct every unnamed/invalid item first.");
                      return;
                    }
                    setIsSettlementOpen(true);
                  }}
                  onOpenTransferModal={() => setIsTransferOpen(true)}
                  onClearOrder={handleClearOrder}
                  onOpenKOTView={() => navigate("/kot")}
                />
              )}
            </>
          ) : (
            <LoginPage role="pos" onLoginSuccess={handleGlobalLogin} restaurantName={restaurantSettings.restaurantName} />
          ))}
      </main>

      {/* Real-time Kitchen Status Alert Banner (Cooking Started & Cooking Completed) */}
      {activeKitchenAlert && (
        <div
          style={{
            position: "fixed",
            top: "20px",
            right: "24px",
            zIndex: 9999,
            width: "380px",
            maxWidth: "calc(100vw - 32px)",
            background:
              activeKitchenAlert.type === "cooking_completed"
                ? "linear-gradient(135deg, rgba(6, 78, 59, 0.96), rgba(15, 23, 42, 0.98))"
                : "linear-gradient(135deg, rgba(124, 45, 18, 0.96), rgba(15, 23, 42, 0.98))",
            backdropFilter: "blur(16px)",
            border: `2px solid ${activeKitchenAlert.type === "cooking_completed" ? "#10b981" : "#f97316"}`,
            borderRadius: "16px",
            padding: "1rem 1.15rem",
            boxShadow: `0 20px 45px rgba(0, 0, 0, 0.7), 0 0 30px ${activeKitchenAlert.type === "cooking_completed" ? "rgba(16, 185, 129, 0.45)" : "rgba(249, 115, 22, 0.45)"}`,
            display: "flex",
            flexDirection: "column",
            gap: "0.55rem",
            animation: "slideInAlert 0.35s cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div
              style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}
            >
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "10px",
                  background:
                    activeKitchenAlert.type === "cooking_completed"
                      ? "rgba(16, 185, 129, 0.25)"
                      : "rgba(249, 115, 22, 0.25)",
                  border: `1.5px solid ${activeKitchenAlert.type === "cooking_completed" ? "rgba(16, 185, 129, 0.5)" : "rgba(249, 115, 22, 0.5)"}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "1.25rem",
                }}
              >
                {activeKitchenAlert.type === "cooking_completed" ? "🔔" : "🔥"}
              </div>
              <div>
                <div
                  style={{
                    fontSize: "0.66rem",
                    fontWeight: 900,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    color:
                      activeKitchenAlert.type === "cooking_completed"
                        ? "#34d399"
                        : "#fb923c",
                  }}
                >
                  {activeKitchenAlert.type === "cooking_completed"
                    ? "✅ Food Ready To Serve"
                    : "🔥 Cooking in Progress"}
                </div>
                <div
                  style={{
                    fontSize: "1rem",
                    fontWeight: 900,
                    color: "#ffffff",
                    lineHeight: 1.1,
                  }}
                >
                  {activeKitchenAlert.title}
                </div>
              </div>
            </div>
            <button
              onClick={() => setActiveKitchenAlert(null)}
              style={{
                background: "rgba(255,255,255,0.08)",
                border: "none",
                color: "#94a3b8",
                width: "26px",
                height: "26px",
                borderRadius: "50%",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "0.85rem",
              }}
              title="Dismiss"
            >
              ✕
            </button>
          </div>

          <div
            style={{
              fontSize: "0.84rem",
              color: "#f1f5f9",
              lineHeight: 1.35,
              fontWeight: 600,
            }}
          >
            {activeKitchenAlert.message}
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              paddingTop: "0.45rem",
              borderTop: "1px solid rgba(255,255,255,0.1)",
            }}
          >
            <span
              style={{ fontSize: "0.7rem", color: "#94a3b8", fontWeight: 700 }}
            >
              ⏰ {activeKitchenAlert.timestamp}
            </span>
            {activeKitchenAlert.tableId && (
              <button
                onClick={() => {
                  setSelectedTableId(activeKitchenAlert.tableId);
                  setActiveView("order");
                  navigate("/");
                  setActiveKitchenAlert(null);
                }}
                style={{
                  background:
                    activeKitchenAlert.type === "cooking_completed"
                      ? "linear-gradient(135deg, #10b981, #059669)"
                      : "linear-gradient(135deg, #f59e0b, #ea580c)",
                  border: "none",
                  color: "#ffffff",
                  padding: "5px 14px",
                  borderRadius: "7px",
                  fontSize: "0.76rem",
                  fontWeight: 800,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  boxShadow:
                    activeKitchenAlert.type === "cooking_completed"
                      ? "0 4px 14px rgba(16, 185, 129, 0.4)"
                      : "0 4px 14px rgba(245, 158, 11, 0.4)",
                }}
              >
                View{" "}
                {activeKitchenAlert.tableName ||
                  `Table ${activeKitchenAlert.tableId}`}{" "}
                →
              </button>
            )}
          </div>
        </div>
      )}

      {/* Floating Notification Toast */}
      {toastMessage && (
        <div
          style={{
            position: "fixed",
            bottom: "24px",
            left: "50%",
            transform: "translateX(-50%)",
            background: "var(--bg-tertiary)",
            color: "var(--text-main)",
            border: "1px solid var(--accent-amber)",
            boxShadow: "var(--shadow-lg)",
            padding: "0.65rem 1.25rem",
            borderRadius: "30px",
            fontSize: "0.85rem",
            fontWeight: 700,
            zIndex: 200,
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
          }}
        >
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Admin Portal Modal (if opened in overlay mode) */}
      {isAdminOpen && !isAdminRoute && (
        <AdminPortal
          onClose={() => setIsAdminOpen(false)}
          menuItems={menuItems}
          onAddMenuItem={handleAddMenuItem}
          onUpdateMenuItem={handleUpdateMenuItem}
          onDeleteMenuItem={handleDeleteMenuItem}
              onSetMenuAvailability={handleSetMenuAvailability}
              onSetMenuSpecial={handleSetMenuSpecial}
          tables={tables}
          onAddTable={handleAddTable}
          onUpdateTable={handleUpdateTable}
          onDeleteTable={handleDeleteTable}
          staffList={staffList}
          onAddStaff={handleAddStaff}
          onUpdateStaff={handleUpdateStaff}
          onDeleteStaff={handleDeleteStaff}
          onOpenKOTView={() => {
            setIsAdminOpen(false);
            setActiveView("kot");
          }}
          onUpdateItemKotStatus={handleUpdateItemKotStatus}
          onCompleteTableKot={handleCompleteTableKot}
          currentTheme={theme}
          onChangeTheme={setTheme}
          pastOrders={pastOrders}
          onUpdateInvoiceDiscount={handleUpdateInvoiceDiscount}
        />
      )}

      {/* Receipt Modal */}
      {/* Settlement Checkout Modal */}
      {isSettlementOpen && (
        <SettlementModal
          table={currentTable}
          menuItems={menuItems}
          onClose={() => setIsSettlementOpen(false)}
          onConfirmPayment={handleConfirmPayment}
        />
      )}

      {/* Transfer Table Modal */}
      {isTransferOpen && (
        <TransferTableModal
          sourceTable={currentTable}
          allTables={tables}
          onClose={() => setIsTransferOpen(false)}
          onConfirmTransfer={handleConfirmTransfer}
        />
      )}

      {/* Kitchen Order Ticket (KOT) Thermal Pop-up Modal */}
      {isKOTOpen && (
        <KOTModal table={currentTable} onClose={() => setIsKOTOpen(false)} />
      )}

      {/* Past Orders & Invoices Modal */}
      {isPastOrdersOpen && (
        <PastOrdersModal
          pastOrders={pastOrders}
          onClose={() => setIsPastOrdersOpen(false)}
          onReprintReceipt={(order) => {
            const matchedTable = tables.find(t => t.id === order.tableId || t.name === order.tableName);
            const resolvedCapacity = order.capacity || matchedTable?.capacity || 0;
            const resolvedGuests =
              (Number(order.guests) > 0 ? Number(order.guests) : null) ??
              (Number(order.occupiedChairs) > 0 ? Number(order.occupiedChairs) : null) ??
              (resolvedCapacity > 0 ? resolvedCapacity : null);

            setReprintReceiptData({
              id: order.tableId,
              name: order.tableName || (order.tableId != null ? `Table ${order.tableId}` : "Table unavailable"),
              section: order.section,
              server: order.server,
              capacity: order.capacity || matchedTable?.capacity || 0,
              guests: resolvedGuests,
              orderTime:
                order.orderTime ||
                order.cookingStartedAt ||
                order.orderTimestamp,
              items: order.items,
              discountPercent: order.discountPercent || 0,
              discountAmount: order.discountAmount || 0,
              taxAmount: order.taxAmount,
              serviceCharge: order.serviceCharge || 5,
              serviceChargeAmount: order.serviceChargeAmount,
              subtotal: order.subtotal,
              grandTotal: order.grandTotal,
              paymentMethod: order.paymentMethod,
              settledAt: order.settledAt,
              invoiceNo: order.invoiceNo,
              date: order.date,
            });
            setIsReceiptOpen(true);
          }}
        />
      )}

      {/* Receipt Modal: Pops up directly on top of Invoices or Floor */}
      {isReceiptOpen && (
        <ReceiptModal
          table={reprintReceiptData || currentTable}
          restaurantSettings={restaurantSettings}
          onClose={() => {
            setIsReceiptOpen(false);
            setReprintReceiptData(null);
          }}
        />
      )}

      {/* Global Custom Delete Confirmation Modal */}
      <ConfirmDeleteModal {...confirmState} onCancel={cancelDelete} />
    </div>
  );
}

export default App;
