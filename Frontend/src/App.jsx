import { getSavedTheme, applyTheme, normalizeTheme } from './utils/theme';
import React, { useState, useEffect, useRef } from "react";
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
import { sounds } from "./utils/audio";
import { logRouteChange, logUserAction } from "./utils/logger";
import { parseTimeToSeconds, formatElapsedTimer } from "./utils/timer";
import { setSession, logoutUser } from "./utils/auth";
import {
  apiGetTables,
  apiCreateTable,
  apiUpdateTable,
  apiDeleteTable,
  apiVacateTable,
  apiUpdateTableStatus,
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
  apiGetStaff,
  apiCreateStaff,
  apiUpdateStaff,
  apiDeleteStaff,
} from "./api/staffApi";
import {
  apiGetOrderHistory,
  apiCreateOrder,
  apiSendOrderKot,
  apiUpdateOrderDiscount,
  apiSettleOrder,
} from "./api/orderApi";
import { apiAdjustStock } from "./api/inventoryApi";
import { API_BASE_URL, openOptionalEventStream } from "./api/apiConfig";
import { dedupeOrders, mergeSettledOrders } from "./utils/orderDedupe";
import { getTodayDateString } from "./utils/invoiceCounter";
import { INITIAL_TABLES } from "./data/initialTables";
import { useAppDialog } from "./common/DialogContext";
import {
  autoGenerateInventoryFromRecipe,
  getStandardDishSuggestions,
} from "./admin/AdminPortal";

const STORAGE_KEY_TABLES = "gourmet_pos_tables_v2_inr";
const STORAGE_KEY_DELETED_TABLES = "gourmet_pos_deleted_tables_v2";
const STORAGE_KEY_ORDERS = "gourmet_pos_past_orders_v2_inr";
const STORAGE_KEY_THEME = "gourmet_pos_theme_v2";
const STORAGE_KEY_MENU = "gourmet_pos_menu_items_v2";
const STORAGE_KEY_STAFF = "gourmet_pos_staff_v1";
const STORAGE_KEY_INVENTORY = "gourmet_pos_inventory_v1";
const STOCK_DEDUCTION_LEDGER_KEY = "gourmet_pos_inventory_deductions_v1";
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
      if (num && num >= 1) {
        targetId = num;
      } else if (Number.isFinite(Number(table.id)) && Number(table.id) > 0) {
        targetId = Number(table.id);
      }

      if (!targetId || deletedIds.includes(String(targetId))) return;

      if (isRogueName(rawName)) return;

      // If this table previously had an arbitrary backend auto-increment ID (e.g. 55) in tablesById, remove it
      if (table.id && Number(table.id) !== targetId && tablesById.has(Number(table.id))) {
        tablesById.delete(Number(table.id));
      }

      const existing = tablesById.get(targetId) || {};
      const existingGuests = Number(
        existing.occupiedChairs ??
          existing.guests ??
          (Array.isArray(existing.selectedSeats)
            ? existing.selectedSeats.length
            : 0),
      ) || 0;
      const cleanName = rawName.match(/^(?:table|t)\s*(\d+)$/i)
        ? `Table ${num || targetId}`
        : rawName || `Table ${targetId}`;

      const rawStatus = String(table.status || "").trim().toLowerCase();
      const isExplicitlyVacant = rawStatus === "vacant";

      const hasActiveItems = Array.isArray(table.items)
        ? table.items.some((i) => i && i.status !== "cancelled" && i.kotStatus !== "cancelled")
        : false;

      const incomingGuests = Number(table.occupiedChairs ?? table.guests ?? (Array.isArray(table.selectedSeats) && table.selectedSeats.length > 0 ? table.selectedSeats.length : null) ?? 0);
      const mergedGuests = incomingGuests || existingGuests;
      const hasActiveGuests = mergedGuests > 0;

      let finalStatus = "vacant";
      if (isExplicitlyVacant || (!hasActiveItems && !hasActiveGuests)) {
        // Individual table is strictly vacant once bill is done and guests leave
        finalStatus = "vacant";
      } else if (hasActiveItems || hasActiveGuests) {
        finalStatus = (rawStatus === "dining" || rawStatus === "billed") ? rawStatus : "occupied";
      } else {
        finalStatus = "vacant";
      }

      const isFinalVacant = finalStatus === "vacant";

      const normalized = {
        ...existing,
        ...table,
        id: targetId,
        activeOrderId: table.activeOrderId ?? existing.activeOrderId ?? null,
        pendingKotSubmission: table.pendingKotSubmission ?? existing.pendingKotSubmission ?? null,
        name: cleanName,
        backendTableId:
          table.tableId ?? table.backendTableId ?? existing.backendTableId ?? targetId,
        section:
          table.sectionArea || table.section || existing.section || "Main Hall",
        capacity: Number(
          table.capacityChairs ?? table.capacity ?? existing.capacity ?? 4,
        ),
        status: finalStatus,
        server:
          table.assignedServerName || table.server || existing.server || "Staff",
        guests: isFinalVacant ? 0 : mergedGuests,
        occupiedChairs: isFinalVacant ? 0 : mergedGuests,
        selectedSeats: isFinalVacant
          ? []
          : (Array.isArray(table.selectedSeats) ? table.selectedSeats : (Array.isArray(existing.selectedSeats) ? existing.selectedSeats : [])),
        items: isFinalVacant
          ? []
          : (Array.isArray(table.items)
            ? table.items
            : Array.isArray(existing.items)
              ? existing.items
              : []),
        orderTime: isFinalVacant ? null : (table.orderTime ?? existing.orderTime ?? null),
        orderTimestamp: isFinalVacant ? null : (table.orderTimestamp ?? existing.orderTimestamp ?? null),
        cookingStartedAt: isFinalVacant ? null : (table.cookingStartedAt ?? existing.cookingStartedAt ?? null),
        completedAt: isFinalVacant ? null : (table.completedAt ?? existing.completedAt ?? null),
        completedDuration: isFinalVacant ? null : (table.completedDuration ?? existing.completedDuration ?? null),
        discountPercent: Number(
          table.discountPercent ?? existing.discountPercent ?? 0,
        ),
        serviceCharge: Number(
          table.serviceCharge ?? existing.serviceCharge ?? 5,
        ),
        occupiedSince: isFinalVacant ? null : (table.occupiedSince || existing.occupiedSince || null),
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
  const { confirmDialog } = useAppDialog();
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
    const events = openOptionalEventStream();
    if (events) {
      events.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          applySharedSettings(message?.payload?.[RESTAURANT_SETTINGS_KEY] || message?.payload?.data?.[RESTAURANT_SETTINGS_KEY]);
        } catch {}
      };
    }
    return () => { active = false; events?.close(); };
  }, []);

  // Theme state: 'royal-saffron' | 'emerald-spice' | 'light-bistro'
  const [theme, setTheme] = useState(getSavedTheme);

  useEffect(() => {
    applyTheme(theme);
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
        if (Array.isArray(parsed)) {
          return mergeIncomingTables(parsed, delList)
            .map((t) => ({ ...t, items: Array.isArray(t.items) ? t.items : [] }))
            .filter((t) => !isDeleted(t.id));
        }
      }
    } catch {
      // Fallback
    }
    return [];
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

  useEffect(() => {
    if (!Array.isArray(menuItems) || menuItems.length === 0) return;

    let cancelled = false;

    const syncMenuIngredientsToInventory = async () => {
      let menuChanged = false;
      const syncedMenu = await Promise.all(
        menuItems.map(async (item) => {
          const hasRecipe = Array.isArray(item.recipe) && item.recipe.length > 0;
          const recipe = hasRecipe
            ? item.recipe
            : getStandardDishSuggestions(
                item.name || item.dishName || "",
                item.category || "",
              );
          const mappedRecipe = await autoGenerateInventoryFromRecipe(recipe);
          if (mappedRecipe.length === 0) return item;

          if (JSON.stringify(mappedRecipe) !== JSON.stringify(item.recipe)) {
            menuChanged = true;
            return { ...item, recipe: mappedRecipe };
          }
          return item;
        }),
      );

      if (cancelled || !menuChanged) return;
      setMenuItems(syncedMenu);
      try {
        localStorage.setItem(STORAGE_KEY_MENU, JSON.stringify(syncedMenu));
      } catch {}
    };

    syncMenuIngredientsToInventory();
    return () => {
      cancelled = true;
    };
  }, [menuItems]);

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
  const kotSubmissionLocks = useRef(new Set());

  const location = useLocation();
  const navigate = useNavigate();

  const isKotRoute = location.pathname === "/kot";
  const isAdminRoute = location.pathname === "/admin";
  const isUserRoute = !isKotRoute && !isAdminRoute;

  // ── Route & POS View Change Logging ──
  const prevPathRef = useRef(location.pathname + location.search);
  useEffect(() => {
    const current = location.pathname + location.search;
    if (prevPathRef.current !== current) {
      logRouteChange(prevPathRef.current, current);
      prevPathRef.current = current;
    }
  }, [location.pathname, location.search]);

  const prevViewRef = useRef(activeView);
  useEffect(() => {
    if (prevViewRef.current !== activeView) {
      logRouteChange(`POS View: ${prevViewRef.current}`, `POS View: ${activeView}`);
      prevViewRef.current = activeView;
    }
  }, [activeView]);


  // ── Live Backend Integration Hook (Ngrok API) ──────────────────
  useEffect(() => {
    // 1. Load live tables from backend API, preserving initial data and deletions
    apiGetTables().then((response) => {
      const backendTables = Array.isArray(response)
        ? response
        : response?.success && Array.isArray(response.data)
          ? response.data
          : response?.success && Array.isArray(response.tables)
            ? response.tables
          : null;
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
      if (Array.isArray(backendStaff)) {
        const uniqueStaff = dedupeStaff(backendStaff.map((s) => ({
          ...s,
          id: s.staffId ?? s.id,
          name: s.fullName || s.name,
          role: s.roleTitle || s.role || "Waiter",
        })));
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
        // Only fallback to /api/state if menuItems has not been loaded at all.
        const incomingMenu = data.menuItems ?? data.data?.menuItems ?? data[STORAGE_KEY_MENU];
        if (Array.isArray(incomingMenu) && incomingMenu.length > 0) {
          setMenuItems((prev) => {
            if (prev && prev.length > 0) return prev;
            const normalizedMenu = incomingMenu.map(normalizeMenuItem);
            try {
              localStorage.setItem(STORAGE_KEY_MENU, JSON.stringify(normalizedMenu));
            } catch {}
            return normalizedMenu;
          });
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
    const es = openOptionalEventStream();
    if (es) {
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
    }

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
        setTheme(normalizeTheme(e.newValue));
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
    setTables((prevTables) => {
      const nextTables = prevTables.map((t) => {
        if (t.id !== tableId) return t;
        const newCount = Math.max(0, Number(count) || 0);
        return {
          ...t,
          guests: newCount,
          status: newCount > 0 && t.status === "vacant" ? "occupied" : t.status,
        };
      });
      try {
        localStorage.setItem(STORAGE_KEY_TABLES, JSON.stringify(nextTables));
        pushGlobalSync({ [STORAGE_KEY_TABLES]: nextTables });
      } catch {}
      return nextTables;
    });
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

  // Persist an active order, then dispatch its queued items through the order-backed Kitchen API.
  const handleSendKOT = async (tableId) => {
    const lockKey = String(tableId);
    if (kotSubmissionLocks.current.has(lockKey)) return;
    kotSubmissionLocks.current.add(lockKey);

    const persistTable = (updateTable) => {
      setTables((previous) => {
        const next = previous.map((entry) =>
          String(entry.id) === lockKey ? updateTable(entry) : entry,
        );
        try {
          localStorage.setItem(STORAGE_KEY_TABLES, JSON.stringify(next));
          pushGlobalSync({ [STORAGE_KEY_TABLES]: next });
          broadcastSync("SYNC_TABLES", next);
        } catch (error) {
          if (import.meta.env.DEV) console.warn("Could not persist KOT submission state locally:", error);
        }
        return next;
      });
    };

    try {
      const table = tables.find((entry) => String(entry.id) === lockKey);
      if (!table) {
        showToast("Could not send KOT: table was not found.");
        return;
      }
      const items = Array.isArray(table.items) ? table.items : [];
      if (items.length === 0) {
        showToast("Add at least one item before sending a KOT.");
        return;
      }

      const pendingSubmission = table.pendingKotSubmission;
      const unsentItems = items
        .map((item) => ({
          item,
          itemKey: String(item.id ?? item.menuItemId ?? item.name),
          quantity: Math.max(0, Number(item.quantity) || 0),
        }))
        .filter(({ item, quantity }) => quantity > (Number(item.sentQuantity) || 0));
      if (!pendingSubmission && unsentItems.length === 0) {
        showToast("All current items have already been sent to Kitchen.");
        return;
      }

      let orderId = Number(pendingSubmission?.orderId || table.activeOrderId) || null;
      let pendingItems = pendingSubmission?.items || null;
      if (!pendingSubmission) {
        const requestBody = {
          tableId: Number(table.backendTableId ?? table.id),
          tableName: table.name || `Table ${tableId}`,
          tableNumber: String(table.tableNumber || table.name || tableId),
          serverName: table.server || "Server",
          guests: Math.max(1, Number(table.guests) || 1),
          items: unsentItems.map(({ item, quantity }) => ({
            menuItemId: Number(item.menuItemId ?? item.backendId ?? item.id) || undefined,
            name: item.name || item.dishName || "Order Item",
            price: Number(item.price ?? item.unitPrice ?? 0) || 0,
            quantity: quantity - (Number(item.sentQuantity) || 0),
            notes: item.notes || "",
          })),
        };
        if (import.meta.env.DEV) {
          console.debug("[KOT] POST /api/v1/orders", {
            tableId: requestBody.tableId,
            itemCount: requestBody.items.length,
            items: requestBody.items.map(({ menuItemId, name, quantity }) => ({ menuItemId, name, quantity })),
          });
        }
        const createResult = await apiCreateOrder(requestBody);
        const order = createResult?.data?.data ?? createResult?.data;
        orderId = Number(order?.id ?? order?.Id) || null;
        if (!createResult?.success || !orderId) {
          const error = createResult?.error || "The server did not return an order ID.";
          if (import.meta.env.DEV) console.error("[KOT] Order create failed", { status: createResult?.status, error });
          showToast(`Could not save order for Kitchen: ${error}`);
          return;
        }
        if (import.meta.env.DEV) {
          console.info("[KOT] Order persisted", {
            endpoint: "/api/v1/orders",
            status: createResult.status,
            orderId,
            itemCount: requestBody.items.length,
          });
        }

        pendingItems = unsentItems.map(({ itemKey, quantity }) => ({ itemKey, quantity }));
        // Save the server ID before dispatch so a retry resumes this KOT without re-adding items.
        persistTable((entry) => ({
          ...entry,
          activeOrderId: orderId,
          pendingKotSubmission: { orderId, items: pendingItems },
          backendOrderItems: Array.isArray(order?.items) ? order.items : entry.backendOrderItems,
        }));
      }

      if (!orderId) {
        showToast("Could not send KOT: the saved order ID is missing.");
        return;
      }
      if (import.meta.env.DEV) console.debug("[KOT] POST /api/v1/orders/{id}/send-kot", { orderId });
      const sendResult = await apiSendOrderKot(orderId);
      const sendResponse = sendResult?.data?.data ?? sendResult?.data;
      if (!sendResult?.success) {
        if (import.meta.env.DEV) console.error("[KOT] Dispatch failed", { orderId, status: sendResult?.status, error: sendResult?.error });
        showToast(`Order saved, but Kitchen did not confirm the KOT: ${sendResult?.error || "Request failed."} Retry Send KOT to dispatch it.`);
        return;
      }

      persistTable((entry) => ({
        ...entry,
        activeOrderId: orderId,
        pendingKotSubmission: null,
        kotId: sendResponse?.kotId ?? sendResponse?.kotData?.kotId ?? entry.kotId,
        orderTime: entry.orderTime || new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        orderTimestamp: entry.orderTimestamp || Date.now(),
        items: entry.items.map((item) => {
          const key = String(item.id ?? item.menuItemId ?? item.name);
          const submitted = pendingItems?.find((pending) => pending.itemKey === key);
          if (!submitted) return item;
          return {
            ...item,
            sentQuantity: Math.max(Number(item.sentQuantity) || 0, submitted.quantity),
            kotStatus: ["ready", "served", "completed"].includes(String(item.kotStatus).toLowerCase()) ? item.kotStatus : "received",
          };
        }),
        completedAt: null,
        completedDuration: null,
      }));

      try {
        const saved = localStorage.getItem("gourmet_kot_dismissed_tickets_v1");
        if (saved) {
          const dismissed = JSON.parse(saved).filter((id) =>
            id !== String(tableId) && id !== Number(tableId) && id !== `active-${tableId}`,
          );
          localStorage.setItem("gourmet_kot_dismissed_tickets_v1", JSON.stringify(dismissed));
        }
      } catch {}

      if (import.meta.env.DEV) console.info("[KOT] Dispatch confirmed", {
        endpoint: `/api/v1/orders/${orderId}/send-kot`,
        status: sendResult.status,
        orderId,
        kotId: sendResponse?.kotId ?? sendResponse?.kotData?.kotId,
      });
      sounds.playBell();
      setIsKOTOpen(true);
      showToast(`KOT sent to Kitchen for ${table.name || `Table ${tableId}`}.`);
    } catch (error) {
      if (import.meta.env.DEV) console.error("[KOT] Unexpected Send KOT error", error);
      showToast(`Could not send KOT: ${error?.message || "Unexpected request error."}`);
    } finally {
      kotSubmissionLocks.current.delete(lockKey);
    }
  };
  // 2. Kitchen KDS Action: Start cooking or update status
  const handleUpdateItemKotStatus = (tableId, status, itemId = null) => {
    const tbl = tables.find((t) => String(t.id) === String(tableId));
    const itemObj =
      itemId && tbl ? tbl.items.find((i) => String(i.id) === String(itemId)) : null;
    const itemName = itemObj ? itemObj.name : null;

    setTables((prevTables) =>
      prevTables.map((t) => {
        if (String(t.id) !== String(tableId)) return t;
        const updatedItems = t.items.map((i) => {
          if (itemId) {
            return String(i.id) === String(itemId) ? { ...i, kotStatus: status } : i;
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
  };

  // 3. Kitchen KDS Action: Mark preparation completed
  const handleCompleteTableKot = (
    tableId,
    itemId = null,
    completedDuration = null,
    completedAt = null,
  ) => {
    const tbl = tables.find((t) => String(t.id) === String(tableId));
    const itemObj =
      itemId && tbl ? tbl.items.find((i) => String(i.id) === String(itemId)) : null;
    const nowTimeStr =
      completedAt ||
      new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });

    setTables((prevTables) =>
      prevTables.map((t) => {
        if (String(t.id) !== String(tableId)) return t;
        const updatedItems = t.items.map((i) => {
          if (itemId && String(i.id) !== String(itemId)) return i;
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
  const handleClearOrder = async (tableId) => {
    const confirmed = await confirmDialog(
      `Are you sure you want to clear the entire order for Table ${tableId}?`,
      {
        title: "Clear table order?",
        confirmText: "Yes, Clear Order",
      },
    );
    if (!confirmed) return;

    setTables((prevTables) => {
      const nextTables = prevTables.map((t) => {
        if (String(t.id) !== String(tableId)) return t;
        return {
          ...t,
          status: "vacant",
          items: [],
          guests: 0,
          occupiedChairs: 0,
          selectedSeats: [],
          occupiedSince: null,
          activeOrderId: null,
          orderTime: null,
          orderTimestamp: null,
          cookingStartedAt: null,
          completedAt: null,
          completedDuration: null,
          discountPercent: 0,
          discountAmount: 0,
          subtotal: 0,
          taxAmount: 0,
          serviceChargeAmount: 0,
          grandTotal: 0,
        };
      });
      try {
        localStorage.setItem(STORAGE_KEY_TABLES, JSON.stringify(nextTables));
        pushGlobalSync({ [STORAGE_KEY_TABLES]: nextTables });
        window.dispatchEvent(new Event("storage"));
        window.dispatchEvent(new CustomEvent("avsr-tables-updated", { detail: nextTables }));
      } catch {}
      return nextTables;
    });

    const tbl = tables.find((t) => String(t.id) === String(tableId));
    const targetApiId = tbl?.backendTableId || tableId;
    try {
      apiVacateTable(targetApiId).catch(() => {});
      apiUpdateTableStatus(targetApiId, "vacant").catch(() => {});
    } catch {}

    showToast(`Table ${tableId} order cleared.`);
  };

  // Transfer Table Order
  const handleConfirmTransfer = (sourceId, targetId) => {
    const source = tables.find((t) => String(t.id) === String(sourceId));
    if (!source) return;

    setTables((prevTables) => {
      const nextTables = prevTables.map((t) => {
        if (String(t.id) === String(targetId)) {
          return {
            ...t,
            items: [...source.items],
            status: "occupied",
            guests: source.guests,
            occupiedChairs: source.occupiedChairs || source.guests,
            selectedSeats: source.selectedSeats || [],
            orderTime: source.orderTime,
            orderTimestamp: source.orderTimestamp,
            discountPercent: source.discountPercent,
            serviceCharge: source.serviceCharge,
          };
        }
        if (String(t.id) === String(sourceId)) {
          return {
            ...t,
            status: "vacant",
            items: [],
            guests: 0,
            occupiedChairs: 0,
            selectedSeats: [],
            occupiedSince: null,
            activeOrderId: null,
            orderTime: null,
            orderTimestamp: null,
            cookingStartedAt: null,
            completedAt: null,
            completedDuration: null,
            discountPercent: 0,
            discountAmount: 0,
            subtotal: 0,
            taxAmount: 0,
            serviceChargeAmount: 0,
            grandTotal: 0,
          };
        }
        return t;
      });
      try {
        localStorage.setItem(STORAGE_KEY_TABLES, JSON.stringify(nextTables));
        pushGlobalSync({ [STORAGE_KEY_TABLES]: nextTables });
        window.dispatchEvent(new Event("storage"));
        window.dispatchEvent(new CustomEvent("avsr-tables-updated", { detail: nextTables }));
      } catch {}
      return nextTables;
    });

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

    // Deduct recipe ingredients once the bill is paid. A ledger prevents
    // repeated settlement/re-render events from deducting the same invoice twice.
    try {
      const invoiceKey = String(
        settlementData.invoiceNo || enrichedSettlement.id || enrichedSettlement.orderId || settlementData.id,
      ).trim();
      let deductionLedger = [];
      try {
        deductionLedger = JSON.parse(localStorage.getItem(STOCK_DEDUCTION_LEDGER_KEY) || "[]");
      } catch {}
      if (!Array.isArray(deductionLedger)) deductionLedger = [];
      if (invoiceKey && deductionLedger.includes(invoiceKey)) {
        throw new Error(`Inventory already deducted for ${invoiceKey}`);
      }

      const rawInv = localStorage.getItem(STORAGE_KEY_INVENTORY);
      const inventory = rawInv ? JSON.parse(rawInv) : [];
      if (Array.isArray(inventory) && inventory.length) {
        // Map to aggregate required deduction per inventory item id
        const usageByIngredientId = new Map();

        // Helper for unit conversion between recipe and inventory stock
        const convertQuantity = (rawAmount, fromUnit, toUnit) => {
          const from = String(fromUnit || "KG").toUpperCase();
          const to = String(toUnit || "KG").toUpperCase();
          if (from === to) return rawAmount;
          // Weight
          if (from === "G" && to === "KG") return rawAmount / 1000;
          if (from === "KG" && to === "G") return rawAmount * 1000;
          // Volume
          if (from === "ML" && (to === "L" || to === "LITRES")) return rawAmount / 1000;
          if ((from === "L" || from === "LITRES") && to === "ML") return rawAmount * 1000;
          return rawAmount;
        };

        (settlementData.items || []).forEach((orderedItem) => {
          const cleanOrderedName = String(orderedItem?.name || orderedItem?.dishName || "").trim().toLowerCase();
          const dish = menuItems.find((item) =>
            String(item.id) === String(orderedItem.id) ||
            item.name?.trim().toLowerCase() === cleanOrderedName
          );
          const dishCount = Number(orderedItem.quantity ?? orderedItem.qty) || 1;

          if (Array.isArray(dish?.recipe) && dish.recipe.length > 0) {
            dish.recipe.forEach((ingredient) => {
              // Find matching inventory item by ID first, then by canonical name
              let matchedStock = null;
              if (ingredient.inventoryId) {
                matchedStock = inventory.find((inv) => String(inv.id) === String(ingredient.inventoryId));
              }
              if (!matchedStock && ingredient.name) {
                const ingCleanName = String(ingredient.name).trim().toLowerCase();
                matchedStock = inventory.find((inv) => String(inv.name || "").trim().toLowerCase() === ingCleanName);
              }

              if (matchedStock) {
                const rawAmount = Number(ingredient.quantity) * dishCount;
                if (Number.isFinite(rawAmount) && rawAmount > 0) {
                  const convertedAmount = convertQuantity(rawAmount, ingredient.unit, matchedStock.unit);
                  const existingTotal = usageByIngredientId.get(String(matchedStock.id)) || 0;
                  usageByIngredientId.set(String(matchedStock.id), existingTotal + convertedAmount);
                }
              }
            });
          }
        });

        if (usageByIngredientId.size > 0) {
          const lowStockAlerts = [];
          const updatedInventory = inventory.map((stockItem) => {
            const used = usageByIngredientId.get(String(stockItem.id));
            if (!used) return stockItem;

            const prevStock = Number(stockItem.stock ?? stockItem.currentStock ?? 0);
            const prevUsed = Number(stockItem.totalUsed ?? 0);
            const newStock = Math.max(0, Number((prevStock - used).toFixed(3)));
            const newTotalUsed = Number((prevUsed + used).toFixed(3));

            const threshold = Number(stockItem.minThreshold ?? stockItem.minimumThreshold ?? 5);
            if (newStock <= threshold) {
              lowStockAlerts.push(`${stockItem.name} (${newStock} ${stockItem.unit} remaining)`);
            }

            // Sync numeric backend inventory IDs only. Demo/local IDs remain local-safe.
            const backendIngredientId = Number(stockItem.id);
            if (Number.isFinite(backendIngredientId) && backendIngredientId > 0) {
              try {
                apiAdjustStock({
                  ingredientId: backendIngredientId,
                  quantityChange: -used,
                  reason: `Live POS billing deduction (Invoice ${settlementData.invoiceNo || enrichedSettlement.id})`,
                }).catch(() => {});
              } catch {}
            }

            return {
              ...stockItem,
              stock: newStock,
              currentStock: newStock,
              totalUsed: newTotalUsed,
            };
          });

          localStorage.setItem(STORAGE_KEY_INVENTORY, JSON.stringify(updatedInventory));
          pushGlobalSync({ [STORAGE_KEY_INVENTORY]: updatedInventory });
          window.dispatchEvent(new CustomEvent("avsr-inventory-updated", { detail: updatedInventory }));
          if (invoiceKey) {
            const nextLedger = [...new Set([...deductionLedger, invoiceKey])].slice(-1000);
            localStorage.setItem(STOCK_DEDUCTION_LEDGER_KEY, JSON.stringify(nextLedger));
          }

          if (lowStockAlerts.length > 0) {
            showToast(`⚠️ Low stock alert: ${lowStockAlerts.join(", ")}`);
          }
        }
      }
    } catch (invErr) {
      console.warn("Live inventory deduction error:", invErr);
    }

    const updatedPastOrders = dedupeOrders([enrichedSettlement, ...pastOrders]);
    setPastOrders(updatedPastOrders);
    try {
      localStorage.setItem(
        STORAGE_KEY_ORDERS,
        JSON.stringify(updatedPastOrders),
      );
      pushGlobalSync({ [STORAGE_KEY_ORDERS]: updatedPastOrders });
    } catch {}
    void (async () => {
      try {
        const createResult = await apiCreateOrder({
          tableId: settlementData.tableId,
          tableName: settlementData.tableName,
          tableNumber: String(settlementData.tableId || settlementData.tableName || ""),
          serverName: settlementData.server || "Server",
          guests: enrichedSettlement.guests,
          discountPercent: Number(settlementData.discountPercent ?? 0) || 0,
          serviceChargeEnabled: false,
          tipAmount: 0,
          status: "Active",
          items: enrichedSettlement.items.map((item) => ({
            menuItemId: Number(item.id ?? item.menuItemId ?? item.backendId) || undefined,
            id: Number(item.id ?? item.menuItemId ?? item.backendId) || undefined,
            name: item.name || item.dishName,
            dishName: item.name || item.dishName,
            price: Number(item.price ?? item.unitPrice ?? 0) || 0,
            quantity: Number(item.quantity ?? item.qty ?? 1) || 1,
            notes: item.notes || "",
          })),
        });
        const orderData = createResult?.data?.data || createResult?.data;
        const backendOrderId = Number(orderData?.id ?? orderData?.Id);
        if (createResult?.success && backendOrderId > 0) {
          await apiSettleOrder(backendOrderId, {
            discountPercent: settlementData.discountPercent,
            serviceChargeEnabled: (Number(settlementData.serviceChargeAmount ?? 0) > 0),
            tipAmount: settlementData.tipAmount,
            paymentMethod: enrichedSettlement.paymentMethod,
          });
        }
      } catch (error) {
        console.warn("Backend order settlement failed; local settlement retained:", error);
      }
    })();

    const updatedTables = tables.map((t) => {
      const isTarget =
        String(t.id) === String(settlementData.tableId) ||
        t.name === settlementData.tableName;
      if (!isTarget) return t;
      return {
        ...t,
        status: "vacant",
        items: [],
        guests: 0,
        occupiedChairs: 0,
        selectedSeats: [],
        occupiedSince: null,
        activeOrderId: null,
        orderTime: null,
        orderTimestamp: null,
        cookingStartedAt: null,
        completedAt: null,
        completedDuration: null,
        discountPercent: 0,
        discountAmount: 0,
        subtotal: 0,
        taxAmount: 0,
        serviceChargeAmount: 0,
        grandTotal: 0,
      };
    });
    setTables(updatedTables);
    try {
      const isDeleted = (id) =>
        (Array.isArray(deletedTableIds) ? deletedTableIds : []).some(
          (d) => String(d) === String(id),
        );
      const cleanTables = updatedTables
        .map((t) => ({ ...t, items: Array.isArray(t.items) ? t.items : [] }))
        .filter((t) => !isDeleted(t.id));
      localStorage.setItem(STORAGE_KEY_TABLES, JSON.stringify(cleanTables));
      pushGlobalSync({ [STORAGE_KEY_TABLES]: cleanTables });
      window.dispatchEvent(new Event("storage"));
      window.dispatchEvent(new CustomEvent("avsr-tables-updated", { detail: cleanTables }));
    } catch {}

    try {
      const targetApiId = tableObj?.backendTableId || tableObj?.id || settlementData.tableId;
      if (targetApiId) {
        apiVacateTable(targetApiId).catch(() => {});
        apiUpdateTableStatus(targetApiId, "vacant").catch(() => {});
      }
    } catch {}

    setIsSettlementOpen(false);
    setSelectedTableId(null);
    setActiveView("tables");
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
      await apiDeleteMenuItem(itemId);
    } catch {}
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
  const handleAddTable = (newTable) => {
    const normalizedTable = {
      ...newTable,
      id: Number(newTable.id),
      name: String(newTable.name || "").trim(),
    };
    const nextDeleted = deletedTableIds.filter(
      (id) => String(id) !== String(normalizedTable.id),
    );
    setDeletedTableIds(nextDeleted);
    try {
      localStorage.setItem(
        STORAGE_KEY_DELETED_TABLES,
        JSON.stringify(nextDeleted),
      );
    } catch {}

    setTables((prev) => {
      if (prev.some((table) => Number(table.id) === normalizedTable.id)) {
        showToast(`Table ID ${normalizedTable.id} already exists. Please choose another table number.`);
        return prev;
      }
      const updated = [...prev, normalizedTable];
      try {
        localStorage.setItem(STORAGE_KEY_TABLES, JSON.stringify(updated));
        pushGlobalSync({ [STORAGE_KEY_TABLES]: updated });
        window.dispatchEvent(new Event("storage"));
        window.dispatchEvent(new CustomEvent("avsr-tables-updated", { detail: updated }));
      } catch {}
      return updated;
    });
    apiCreateTable(normalizedTable).catch(() => {});
    showToast(`✅ Created ${normalizedTable.name} with ${normalizedTable.capacity} chairs!`);
  };

  const handleUpdateTable = (updatedTable) => {
    setTables((prev) => {
      const updated = prev.map((t) =>
        String(t.id) === String(updatedTable.id) ? updatedTable : t,
      );
      try {
        localStorage.setItem(STORAGE_KEY_TABLES, JSON.stringify(updated));
        pushGlobalSync({ [STORAGE_KEY_TABLES]: updated });
        window.dispatchEvent(new Event("storage"));
        window.dispatchEvent(new CustomEvent("avsr-tables-updated", { detail: updated }));
      } catch {}
      return updated;
    });
    const targetApiId = updatedTable.backendTableId || updatedTable.id;
    apiUpdateTable(targetApiId, updatedTable).catch(() => {});
    showToast(
      `✅ Updated ${updatedTable.name} (${updatedTable.capacity} chairs)`,
    );
  };

  const handleDeleteTable = (tableId) => {
    const tbl = tables.find((t) => String(t.id) === String(tableId));

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
      pushGlobalSync({ [STORAGE_KEY_TABLES]: nextTables });
      window.dispatchEvent(new Event("storage"));
      window.dispatchEvent(new CustomEvent("avsr-tables-updated", { detail: nextTables }));
    } catch {}

    // 3. If currently selected table in billing view is this deleted table, switch to first remaining table
    if (String(selectedTableId) === String(tableId)) {
      setSelectedTableId(nextTables.length > 0 ? nextTables[0].id : 1);
    }

    const targetApiId = tbl?.backendTableId || tableId;
    apiDeleteTable(targetApiId).catch(() => {});
    showToast(`🗑️  Permanently Deleted ${tbl?.name || "Table"}`);
  };

  // 3. Staff & Persons Admin
  const handleAddStaff = async (newPerson) => {
    const result = await apiCreateStaff(newPerson);
    if (!result?.success) {
      showToast(
        `⚠️ Staff member was not saved to the backend: ${result?.error || "Unknown API error"}`,
      );
      return false;
    }

    setStaffList((prev) => [...prev, newPerson]);
    showToast(`✅ Staff member "${newPerson.name}" saved to the backend!`);
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

  const handleDeleteStaff = (personId) => {
    const person = staffList.find((p) => (p.id ?? p.staffId) === personId);
    setStaffList((prev) =>
      prev.filter((p) => (p.id ?? p.staffId) !== personId),
    );
    apiDeleteStaff(personId).catch(() => {});
    showToast(`🗑️ Removed "${person?.name || person?.fullName || "Staff"}"`);
  };

  // Reset to default initial state
  const handleResetData = async () => {
    const confirmed = await confirmDialog(
      "Reset all data back to clean initial defaults (15 tables, standard menu and staff)? Active orders will be cleared.",
      {
        title: "Reset all data?",
        confirmText: "Yes, Reset Data",
      },
    );
    if (!confirmed) return;

    setDeletedTableIds([]);
    setTables(INITIAL_TABLES);
    setMenuItems([]);
    setStaffList([]);
    setPastOrders([]);
    setInventory([]);
    localStorage.setItem(STORAGE_KEY_TABLES, JSON.stringify(INITIAL_TABLES));
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
            <LoginPage currentTheme={theme} onChangeTheme={setTheme} role="kot" onLoginSuccess={handleGlobalLogin} restaurantName={restaurantSettings.restaurantName} restaurantLogo={restaurantSettings.logo} />
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
            <LoginPage currentTheme={theme} onChangeTheme={setTheme} role="admin" onLoginSuccess={handleGlobalLogin} restaurantName={restaurantSettings.restaurantName} restaurantLogo={restaurantSettings.logo} />
          ))}

        {/* 3. DEDICATED USER POS VIEW (ROUTE: / or /user) */}
        {isUserRoute &&
          (posSession &&
          (posSession.role === "pos" || posSession.role === "admin") ? (
            <>
              {activeView === "tables" && (
                <TableView
                  tables={tables}
                  onSelectTable={handleSelectTable}
                  onUpdateTable={handleUpdateTable}
                />
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
            <LoginPage currentTheme={theme} onChangeTheme={setTheme} role="pos" onLoginSuccess={handleGlobalLogin} restaurantName={restaurantSettings.restaurantName} restaurantLogo={restaurantSettings.logo} />
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
                background: "var(--surface-tint)",
                border: "none",
                color: "var(--text-dim)",
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
              style={{ fontSize: "0.7rem", color: "var(--text-dim)", fontWeight: 700 }}
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
        <KOTModal
          table={currentTable}
          restaurantName={restaurantSettings?.restaurantName || "Restaurant"}
          restaurantLogo={restaurantSettings?.logo || ""}
          onClose={() => setIsKOTOpen(false)}
        />
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
            if (activeView === "order" || activeView === "table") {
              setActiveView("tables");
              setSelectedTableId(null);
            }
          }}
        />
      )}
    </div>
  );
}

export default App;
