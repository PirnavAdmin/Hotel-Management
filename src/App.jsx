import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { MENU_ITEMS } from "./data/menuData";
import { INITIAL_ORDERS } from "./data/initialOrders";
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
import { parseTimeToSeconds, formatElapsedTimer } from "./utils/timer";
import { setSession, logoutUser } from "./utils/auth";
import {
  apiGetTables,
  apiCreateTable,
  apiUpdateTable,
  apiDeleteTable,
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
import {
  apiGetKotOrders,
  apiCreateKotOrder,
  apiUpdateKotStatus,
} from "./api/kotApi";
import {
  apiGetStaff,
  apiCreateStaff,
  apiUpdateStaff,
  apiDeleteStaff,
} from "./api/staffApi";
import { apiGetOrders, apiCreateOrder } from "./api/orderApi";
import { API_BASE_URL } from "./api/apiConfig";
import { dedupeOrders, mergeSettledOrders } from "./utils/orderDedupe";

const STORAGE_KEY_TABLES = "gourmet_pos_tables_v2_inr";
const STORAGE_KEY_DELETED_TABLES = "gourmet_pos_deleted_tables_v2";
const STORAGE_KEY_ORDERS = "gourmet_pos_past_orders_v2_inr";
const STORAGE_KEY_THEME = "gourmet_pos_theme_v2";
const STORAGE_KEY_MENU = "gourmet_pos_menu_items_v2";
const STORAGE_KEY_STAFF = "gourmet_pos_staff_v1";
const STORAGE_KEY_INVENTORY = "gourmet_pos_inventory_v1";

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

const mergeIncomingTables = (incomingTables, deletedTableIds) => {
  // A server response is the authoritative table collection. Start with it so
  // deleted defaults and extra defaults cannot be reintroduced on every load.
  const tablesById = new Map();

  const normalizedIncoming = [];
  incomingTables.forEach((table) => {
    const id = Number(table.tableId ?? table.id);
    if (!Number.isFinite(id)) return;

    const existing = tablesById.get(id) || {};
    const normalized = {
      ...existing,
      ...table,
      id,
      name: table.tableName || table.name || existing.name || `Table ${id}`,
      section:
        table.sectionArea || table.section || existing.section || "Main Hall",
      capacity:
        table.capacityChairs ?? table.capacity ?? existing.capacity ?? 4,
      status: String(table.status || existing.status || "vacant").toLowerCase(),
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
    normalizedIncoming.push(normalized);
  });

  // Older clients sometimes saved generic table names against different IDs.
  const nameCounts = new Map();
  normalizedIncoming.forEach((table) => {
    const key = String(table.name || "").trim().toLowerCase();
    nameCounts.set(key, (nameCounts.get(key) || 0) + 1);
  });
  normalizedIncoming.forEach((table) => {
    const key = String(table.name || "").trim().toLowerCase();
    if (key && nameCounts.get(key) > 1 && /^table\s+\d+$/i.test(table.name)) {
      table.name = `Table ${table.id}`;
      tablesById.set(Number(table.id), table);
    }
  });

  const deletedIds = Array.isArray(deletedTableIds)
    ? deletedTableIds.map(String)
    : [];
  return Array.from(tablesById.values())
    .filter((table) => !deletedIds.includes(String(table.id)))
    .sort((a, b) => a.id - b.id);
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
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // Fallback
    }
    return MENU_ITEMS;
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
        if (Array.isArray(parsed) && parsed.length > 0) return dedupeOrders(parsed);
      }
    } catch {
      // Fallback
    }
    return INITIAL_ORDERS;
  });

  // Navigation & Table Selection ('tables' | 'order' | 'kot')
  const [activeView, setActiveView] = useState("tables");
  const [selectedTableId, setSelectedTableId] = useState(5); // Table 5

  const location = useLocation();
  const navigate = useNavigate();

  const isKotRoute = location.pathname === "/kot";
  const isAdminRoute = location.pathname === "/admin";
  const isUserRoute = !isKotRoute && !isAdminRoute;

  // â”€â”€ Live Backend Integration Hook (Ngrok API) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
      if (Array.isArray(backendTables) && backendTables.length > 0) {
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
      if (Array.isArray(backendMenu) && backendMenu.length > 0) {
        const menuByName = new Map(
          menuItems.map(normalizeMenuItem)
            .filter((item) => item.name)
            .map((item) => [item.name.toLowerCase().trim(), item]),
        );
        backendMenu.map(normalizeMenuItem).forEach((item) => {
          const key = item.name.toLowerCase().trim();
          if (!key) return;
          const existing = menuByName.get(key) || {};
          menuByName.set(key, {
            ...existing,
            ...item,
            image: item.image || existing.image || "",
            description: item.description || existing.description || "",
          });
        });
        const normalizedMenu = Array.from(menuByName.values());
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

    // 4. Load live past settled orders from backend API merged with INITIAL_ORDERS
    apiGetOrders().then((response) => {
      const backendOrders = Array.isArray(response)
        ? response
        : Array.isArray(response?.data)
          ? response.data
          : [];
      if (backendOrders.length > 0) {
        setPastOrders((current) => mergeSettledOrders(current, backendOrders));
      }
    });
  }, []);

  // â”€â”€ Authentication sessions per route â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

  // â”€â”€ Kitchen Real-Time Notifications System â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
      localStorage.setItem(STORAGE_KEY_TABLES, JSON.stringify(cleanTables));
      pushGlobalSync({ [STORAGE_KEY_TABLES]: cleanTables });
    } catch {}
  }, [tables, deletedTableIds]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_MENU, JSON.stringify(menuItems));
      pushGlobalSync({ [STORAGE_KEY_MENU]: menuItems });
    } catch {}
  }, [menuItems]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_STAFF, JSON.stringify(staffList));
      pushGlobalSync({ [STORAGE_KEY_STAFF]: staffList });
    } catch {}
  }, [staffList]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_ORDERS, JSON.stringify(pastOrders));
      pushGlobalSync({ [STORAGE_KEY_ORDERS]: pastOrders });
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
        const incomingTables =
          data.tables || data.data?.tables || data[STORAGE_KEY_TABLES];
      if (Array.isArray(incomingTables)) {
          const freshDel = getDeletedTableIds();
          const clean = mergeIncomingTables(incomingTables, freshDel);
          setTables(clean);
          try {
            localStorage.setItem(STORAGE_KEY_TABLES, JSON.stringify(clean));
          } catch {}
        }

        const incomingOrders =
          data.pastOrders || data.data?.pastOrders || data[STORAGE_KEY_ORDERS];
        if (Array.isArray(incomingOrders) && incomingOrders.length > 0) {
          setPastOrders((current) => mergeSettledOrders(current, incomingOrders));
        }

        const incomingMenu =
          data.menuItems || data.data?.menuItems || data[STORAGE_KEY_MENU];
        if (incomingMenu && incomingMenu.length > 0) {
          const map = new Map();
          menuItems.forEach((m) =>
            map.set(String(m.name).toLowerCase().trim(), m),
          );
          incomingMenu.forEach((m) => {
            const key = String(m.dishName || m.name)
              .toLowerCase()
              .trim();
            const existing = map.get(key) || {};
            map.set(key, {
              ...existing,
              id: m.menuItemId
                ? String(m.menuItemId)
                : existing.id || String(m.id),
              name: m.dishName || m.name || existing.name,
              category: m.category || existing.category || "biryani",
              price: parseFloat(m.price || existing.price || 0),
              isVeg: m.dietaryType
                ? m.dietaryType === "VEG"
                : (existing.isVeg ?? true),
              spiceLevel:
                m.spiceLevel === 1
                  ? "Mild"
                  : m.spiceLevel === 2
                    ? "Medium"
                    : existing.spiceLevel || "Spicy",
              description:
                m.shortDescription ||
                m.description ||
                existing.description ||
                "",
              prepTime: m.prepTimeMinutes
                ? `${m.prepTimeMinutes} mins`
                : existing.prepTime || "15 mins",
              prepTimeMinutes:
                m.prepTimeMinutes || existing.prepTimeMinutes || 15,
              isChefSpecial:
                m.isChefsSpecial ?? existing.isChefSpecial ?? false,
              isAvailable: m.isAvailable !== false,
              recipe: m.recipe || existing.recipe || [],
              image:
                m.imageUrl ||
                m.image ||
                existing.image ||
                "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=500&auto=format&fit=crop&q=80",
            });
          });
          const normalizedMenu = Array.from(map.values());
          setMenuItems(normalizedMenu);
          try {
            localStorage.setItem(
              STORAGE_KEY_MENU,
              JSON.stringify(normalizedMenu),
            );
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

          const incomingTables =
            payload.tables ||
            payload.data?.tables ||
            payload[STORAGE_KEY_TABLES];
          if (Array.isArray(incomingTables)) {
            const freshDel = getDeletedTableIds();
            const clean = mergeIncomingTables(incomingTables, freshDel);
            setTables(clean);
            try {
              localStorage.setItem(STORAGE_KEY_TABLES, JSON.stringify(clean));
            } catch {}
          }
          const incomingOrders =
            payload.pastOrders || payload[STORAGE_KEY_ORDERS];
          if (incomingOrders && incomingOrders.length > 0) {
            setPastOrders((current) => mergeSettledOrders(current, incomingOrders));
          }
          const incomingMenu = payload.menuItems || payload[STORAGE_KEY_MENU];
          if (incomingMenu && incomingMenu.length > 0) {
            let savedMenuForRecipes = [];
            try {
              savedMenuForRecipes = JSON.parse(localStorage.getItem(STORAGE_KEY_MENU) || "[]");
            } catch {}
            const normalizedMenu = incomingMenu.map((m) => ({
              id: m.menuItemId ? String(m.menuItemId) : String(m.id),
              name: m.dishName || m.name,
              category: m.category || "biryani",
              price: parseFloat(m.price || 0),
              isVeg: m.dietaryType === "VEG" || m.isVeg === true,
              spiceLevel:
                m.spiceLevel === 1
                  ? "Mild"
                  : m.spiceLevel === 2
                    ? "Medium"
                    : "Spicy",
              description: m.shortDescription || m.description || "",
              prepTime: m.prepTimeMinutes
                ? `${m.prepTimeMinutes} mins`
                : "15 mins",
              prepTimeMinutes: m.prepTimeMinutes || 15,
              isChefSpecial: !!m.isChefsSpecial || !!m.isChefSpecial,
              isAvailable: m.isAvailable !== false,
              recipe: m.recipe || savedMenuForRecipes.find((item) =>
                String(item.id) === String(m.menuItemId || m.id) ||
                item.name?.trim().toLowerCase() === String(m.dishName || m.name || "").trim().toLowerCase(),
              )?.recipe || [],
              image:
                m.imageUrl ||
                m.image ||
                "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=500&auto=format&fit=crop&q=80",
            }));
            setMenuItems(normalizedMenu);
            try {
              localStorage.setItem(
                STORAGE_KEY_MENU,
                JSON.stringify(normalizedMenu),
              );
            } catch {}
          }
          const incomingStaff = payload.staff || payload[STORAGE_KEY_STAFF];
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
      if (e.key === STORAGE_KEY_LATEST_ALERT && e.newValue) {
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

    const handleOrdersStorageUpdate = (event) => {
      if (event.key !== STORAGE_KEY_ORDERS || !event.newValue) return;
      try {
        const incomingOrders = JSON.parse(event.newValue);
        if (Array.isArray(incomingOrders)) {
          setPastOrders((current) => mergeSettledOrders(current, incomingOrders));
        }
      } catch {}
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("storage", handleOrdersStorageUpdate);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("storage", handleOrdersStorageUpdate);
      if (es) es.close();
    };
  }, []);

  // Current selected table object (with defensive fallback)
  const defaultFallbackTable = {
    id: 1,
    name: "Table 1",
    section: "Main Hall",
    items: [],
    status: "vacant",
    guests: 0,
    server: "Unassigned",
  };
  const currentTable =
    (tables && tables.length > 0
      ? tables.find((t) => t.id === selectedTableId) || tables[0]
      : null) || defaultFallbackTable;

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
  const handleSendKOT = (tableId) => {
    sounds.playBell();
    const tbl = tables.find((t) => t.id === tableId);
    setTables((prevTables) =>
      prevTables.map((t) => {
        if (t.id !== tableId) return t;
        const updatedItems = t.items.map((i) => ({
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
    apiCreateKotOrder({ tableId, items: tbl?.items, status: "received" }).catch(
      () => {},
    );
    setIsKOTOpen(true);
    showToast(
      `ðŸ“¥ KOT Sent: Order Received from ${tbl?.name || `Table ${tableId}`}!`,
    );
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
        title: "ðŸ”¥ Cooking Started",
        message: itemName
          ? `Chef started cooking "${itemName}" for ${tbl?.name || `Table ${tableId}`}!`
          : `Chef started cooking order for ${tbl?.name || `Table ${tableId}`}!`,
      });
      showToast(`ðŸ”¥ ${tbl?.name || `Table ${tableId}`}: Chef started cooking!`);
    } else if (status === "received") {
      showToast(
        `ðŸ“¥ ${tbl?.name || `Table ${tableId}`}: Reverted to Order Received.`,
      );
    } else if (status === "ready") {
      triggerKitchenNotification({
        tableId,
        tableName: tbl?.name || `Table ${tableId}`,
        type: "cooking_completed",
        title: itemName ? `ðŸ”” "${itemName}" Ready!` : "ðŸ”” Food Ready to Serve!",
        message: itemName
          ? `"${itemName}" is prepared and ready to serve for ${tbl?.name || `Table ${tableId}`}!`
          : `Order preparation completed for ${tbl?.name || `Table ${tableId}`}! Food is ready to serve.`,
      });
      showToast(
        `âœ… ${tbl?.name || `Table ${tableId}`}: Marked Prepared & Ready!`,
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

    const isSingleItem = Boolean(itemObj);
    triggerKitchenNotification({
      tableId,
      tableName: tbl?.name || `Table ${tableId}`,
      type: "cooking_completed",
      title: isSingleItem
        ? `ðŸ”” Prepared: ${itemObj.name}`
        : "ðŸ”” Cooking Completed!",
      message: isSingleItem
        ? `"${itemObj.name}" is prepared! Ready to serve.`
        : `All dishes for ${tbl?.name || `Table ${tableId}`} are cooked and ready to serve! ðŸ½ï¸`,
    });
    showToast(
      isSingleItem
        ? `âœ… ${tbl?.name || `Table ${tableId}`}: "${itemObj.name}" marked prepared!`
        : `âœ… ${tbl?.name || `Table ${tableId}`}: Order preparation completed! Ready to serve.`,
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
            orderTime: null,
            discountPercent: 0,
          };
        }),
      );
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
            orderTime: null,
            discountPercent: 0,
          };
        }
        return t;
      }),
    );

    setIsTransferOpen(false);
    setSelectedTableId(targetId);
    showToast(`Transferred Table ${sourceId} to Table ${targetId}!`);
  };

  // Confirm Payment & Settle Bill
  const handleConfirmPayment = (settlementData) => {
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
      date:
        settlementData.date ||
        new Date().toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }),
      cookingStartedAt:
        tableObj?.cookingStartedAt ||
        tableObj?.orderTime ||
        settlementData.settledAt,
      completedAt: tableObj?.completedAt || settlementData.settledAt,
      completedDuration: finalDuration || "12m 30s",
      guests:
        (Number(tableObj?.guests) > 0 ? Number(tableObj.guests) : null) ??
        (Number(settlementData.guests) > 0 ? Number(settlementData.guests) : null) ??
        (Number(tableObj?.capacity) > 0 ? Number(tableObj.capacity) : null) ??
        2,
      capacity: tableObj?.capacity || settlementData.capacity || 4,
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
    apiCreateOrder(enrichedSettlement).catch(() => {});
    try {
      localStorage.setItem(
        STORAGE_KEY_ORDERS,
        JSON.stringify(updatedPastOrders),
      );
    } catch {}

    const updatedTables = tables.map((t) => {
      if (t.id !== settlementData.tableId) return t;
      return {
        ...t,
        items: [],
        status: "vacant",
        orderTime: null,
        discountPercent: 0,
        guests: t.capacity,
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
    } catch {}

    setIsSettlementOpen(false);
    showToast(
      `âœ… ${settlementData.tableName} bill settled via ${settlementData.paymentMethod.toUpperCase()}`,
    );

    setReprintReceiptData({
      id: settlementData.tableId,
      name: settlementData.tableName,
      section: settlementData.section,
      server: settlementData.server,
      guests: enrichedSettlement.guests,
      orderTime: enrichedSettlement.orderTime,
      settledAt: enrichedSettlement.settledAt,
      items: settlementData.items,
      discountPercent: 0,
      serviceCharge: 5,
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

  // ================= ADMIN ACTIONS =================
  // 1. Menu Items Admin
  const handleAddMenuItem = async (newItem) => {
    const result = await apiCreateMenuItem(newItem);
    if (!result?.success || result.data?.success === false) {
      showToast(
        `âš ï¸ Dish was not saved to the backend: ${result?.error || "Unknown API error"}`,
      );
      return false;
    }

    const createdItem = result.data?.menuItem || result.data?.item || result.data?.data || result.data || {};
    const savedItem = normalizeMenuItem({
      ...newItem,
      ...createdItem,
      id:
        createdItem.menuItemId ??
        createdItem.menu_item_id ??
        createdItem.id ??
        newItem.id,
    });
    setMenuItems((prev) => [savedItem, ...prev.filter((item) => String(item.id) !== String(savedItem.id))]);
    showToast(`âœ… Dish "${newItem.name}" saved to the backend menu!`);
    return true;
  };

  const handleUpdateMenuItem = async (updatedItem) => {
    const result = await apiUpdateMenuItem(updatedItem.id, updatedItem);
    if (!result?.success || result.data?.success === false) {
      showToast(`Dish update failed: ${result?.error || result?.data?.message || "API error"}`);
      return false;
    }
    const responseItem = result.data?.menuItem || result.data?.item || result.data?.data || {};
    const savedItem = normalizeMenuItem({ ...updatedItem, ...responseItem, id: responseItem.id ?? responseItem.menuItemId ?? updatedItem.id });
    setMenuItems((prev) => prev.map((item) => String(item.id) === String(savedItem.id) ? savedItem : item));
    showToast(`Updated "${savedItem.name}"`);
    return true;
  };

  const handleDeleteMenuItem = async (itemId) => {
    const result = await apiDeleteMenuItem(itemId);
    if (!result?.success || result.data?.success === false) {
      showToast(`Dish delete failed: ${result?.error || result?.data?.message || "API error"}`);
      return false;
    }
    const item = menuItems.find((i) => String(i.id) === String(itemId));
    setMenuItems((prev) => prev.filter((i) => String(i.id) !== String(itemId)));
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
      } catch {}
      return updated;
    });
    apiCreateTable(normalizedTable).catch(() => {});
    showToast(`âœ… Created ${normalizedTable.name} with ${normalizedTable.capacity} chairs!`);
  };

  const handleUpdateTable = (updatedTable) => {
    setTables((prev) => {
      const updated = prev.map((t) =>
        String(t.id) === String(updatedTable.id) ? updatedTable : t,
      );
      try {
        localStorage.setItem(STORAGE_KEY_TABLES, JSON.stringify(updated));
      } catch {}
      return updated;
    });
    apiUpdateTable(updatedTable.id, updatedTable).catch(() => {});
    showToast(
      `âœ… Updated ${updatedTable.name} (${updatedTable.capacity} chairs)`,
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
    } catch {}

    // 3. If currently selected table in billing view is this deleted table, switch to first remaining table
    if (String(selectedTableId) === String(tableId)) {
      setSelectedTableId(nextTables.length > 0 ? nextTables[0].id : 1);
    }

    apiDeleteTable(tableId).catch(() => {});
    showToast(`ðŸ—‘ï¸ Permanently Deleted ${tbl?.name || "Table"}`);
  };

  // 3. Staff & Persons Admin
  const handleAddStaff = async (newPerson) => {
    const result = await apiCreateStaff(newPerson);
    if (!result?.success) {
      showToast(
        `âš ï¸ Staff member was not saved to the backend: ${result?.error || "Unknown API error"}`,
      );
      return false;
    }

    setStaffList((prev) => [...prev, newPerson]);
    showToast(`âœ… Staff member "${newPerson.name}" saved to the backend!`);
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

    showToast(`âœ… Updated staff details for "${updatedPerson.name}"`);
    return true;
  };

  const handleDeleteStaff = (personId) => {
    const person = staffList.find((p) => (p.id ?? p.staffId) === personId);
    setStaffList((prev) =>
      prev.filter((p) => (p.id ?? p.staffId) !== personId),
    );
    apiDeleteStaff(personId).catch(() => {});
    showToast(`ðŸ—‘ï¸ Removed "${person?.name || person?.fullName || "Staff"}"`);
  };

  // Reset to default initial state
  const handleResetData = () => {
    if (
      window.confirm(
        "Reset all tables, menu dishes and staff to initial default demo data?",
      )
    ) {
      setDeletedTableIds([]);
      setTables([]);
      setMenuItems(MENU_ITEMS);
      setStaffList([]);
      localStorage.removeItem(STORAGE_KEY_TABLES);
      localStorage.removeItem(STORAGE_KEY_DELETED_TABLES);
      localStorage.removeItem(STORAGE_KEY_MENU);
      localStorage.removeItem(STORAGE_KEY_STAFF);
      showToast("Reset to initial defaults complete.");
    }
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
            <LoginPage role="kot" onLoginSuccess={handleGlobalLogin} />
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
            />
          ) : (
            <LoginPage role="admin" onLoginSuccess={handleGlobalLogin} />
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
                  onOpenSettlement={() => setIsSettlementOpen(true)}
                  onOpenTransferModal={() => setIsTransferOpen(true)}
                  onClearOrder={handleClearOrder}
                  onOpenKOTView={() => navigate("/kot")}
                />
              )}
            </>
          ) : (
            <LoginPage role="pos" onLoginSuccess={handleGlobalLogin} />
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
                {activeKitchenAlert.type === "cooking_completed" ? "ðŸ””" : "ðŸ”¥"}
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
                    ? "âœ… Food Ready To Serve"
                    : "ðŸ”¥ Cooking in Progress"}
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
              âœ•
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
              â° {activeKitchenAlert.timestamp}
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
                â†’
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
        />
      )}

      {/* Receipt Modal */}
      {/* Settlement Checkout Modal */}
      {isSettlementOpen && (
        <SettlementModal
          table={currentTable}
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
            const resolvedCapacity = order.capacity || matchedTable?.capacity || 4;
            const resolvedGuests =
              (Number(order.guests) > 0 ? Number(order.guests) : null) ??
              (Number(order.occupiedChairs) > 0 ? Number(order.occupiedChairs) : null) ??
              resolvedCapacity;

            setReprintReceiptData({
              id: order.tableId,
              name: order.tableName,
              section: order.section,
              server: order.server,
              capacity: resolvedCapacity,
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
          onClose={() => {
            setIsReceiptOpen(false);
            setReprintReceiptData(null);
          }}
        />
      )}
    </div>
  );
}

export default App;
