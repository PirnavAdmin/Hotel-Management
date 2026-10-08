import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { INITIAL_TABLES } from './data/initialTables';
import { MENU_ITEMS } from './data/menuData';
import { INITIAL_STAFF } from './data/initialStaff';
// Admin modules
import { AdminPortal } from './admin';
// Kitchen KOT modules
import { KitchenKOTView, KOTModal } from './kot';
// User POS / Dining Floor modules
import { 
  TableView, 
  TableDetailView, 
  ReceiptModal, 
  SettlementModal, 
  TransferTableModal, 
  PastOrdersModal 
} from './user';
import { Header, LoginPage, ErrorBoundary } from './common';
import { sounds } from './utils/audio';
import { parseTimeToSeconds, formatElapsedTimer } from './utils/timer';
import { setSession, logoutUser } from './utils/auth';

const STORAGE_KEY_TABLES = 'gourmet_pos_tables_v2_inr';
const STORAGE_KEY_DELETED_TABLES = 'gourmet_pos_deleted_tables_v2';
const STORAGE_KEY_ORDERS = 'gourmet_pos_past_orders_v2_inr';
const STORAGE_KEY_THEME = 'gourmet_pos_theme_v2';
const STORAGE_KEY_MENU = 'gourmet_pos_menu_items_v2';
const STORAGE_KEY_STAFF = 'gourmet_pos_staff_v1';

const getDeletedTableIds = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_DELETED_TABLES);
    if (saved) return JSON.parse(saved);
    // Auto-detect any initially deleted tables already missing from saved tables
    const savedTables = localStorage.getItem(STORAGE_KEY_TABLES);
    if (savedTables) {
      const parsed = JSON.parse(savedTables);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const existingIds = new Set(parsed.map(t => String(t.id)));
        const missingFromInitial = INITIAL_TABLES.filter(t => !existingIds.has(String(t.id))).map(t => t.id);
        if (missingFromInitial.length > 0) {
          try { localStorage.setItem(STORAGE_KEY_DELETED_TABLES, JSON.stringify(missingFromInitial)); } catch {}
          return missingFromInitial;
        }
      }
    }
  } catch {}
  return [];
};

export function App() {
  // Theme state: 'royal-saffron' | 'emerald-spice' | 'light-bistro'
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem(STORAGE_KEY_THEME) || 'royal-saffron';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(STORAGE_KEY_THEME, theme);
  }, [theme]);

  // Track permanently deleted table IDs so cross-tabs or reloads never resurrect them
  const [deletedTableIds, setDeletedTableIds] = useState(getDeletedTableIds);

  // Load saved tables or fallback to INITIAL_TABLES (filtering out any deleted tables)
  const [tables, setTables] = useState(() => {
    const deleted = getDeletedTableIds();
    const isDeleted = (id) => deleted.some(d => String(d) === String(id));
    try {
      const saved = localStorage.getItem(STORAGE_KEY_TABLES);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.filter(t => !isDeleted(t.id));
        }
      }
    } catch {
      // Fallback
    }
    return INITIAL_TABLES.filter(t => !isDeleted(t.id));
  });

  // Load dynamic menu items (supports Admin additions/deletions)
  const [menuItems, setMenuItems] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_MENU);
      if (saved) return JSON.parse(saved);
    } catch {
      // Fallback
    }
    return MENU_ITEMS;
  });

  // Load staff personnel (supports Admin staff additions/deletions)
  const [staffList, setStaffList] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_STAFF);
      if (saved) return JSON.parse(saved);
    } catch {
      // Fallback
    }
    return INITIAL_STAFF;
  });

  // Past settled orders history in Rupees
  const [pastOrders, setPastOrders] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_ORDERS);
      if (saved) return JSON.parse(saved);
    } catch {
      // Fallback
    }
    return [
      {
        tableId: 2,
        tableName: 'Table 2',
        section: 'Main Hall',
        server: 'Vikram S.',
        items: [
          { id: 'bir-1', name: 'Hyderabadi Chicken Dum Biryani', price: 320, quantity: 3 },
          { id: 'st-1', name: 'Crispy Chicken 65', price: 260, quantity: 2 }
        ],
        subtotal: 1480,
        discountAmount: 0,
        taxAmount: 27,
        serviceChargeAmount: 0,
        tipAmount: 0,
        grandTotal: 1507,
        paymentMethod: 'CASH',
        settledAt: '09:30 AM',
        date: '07 Oct 2026',
        invoiceNo: 'INV-24003'
      },
      {
        tableId: 3,
        tableName: 'Table 3',
        section: 'Main Hall',
        server: 'Rajesh K.',
        items: [
          { id: 'bir-2', name: 'Mutton Dum Biryani', price: 420, quantity: 2 }
        ],
        subtotal: 840,
        discountAmount: 4,
        taxAmount: 0,
        serviceChargeAmount: 0,
        tipAmount: 0,
        grandTotal: 836,
        paymentMethod: 'CASH',
        settledAt: '09:17 AM',
        date: '07 Oct 2026',
        invoiceNo: 'INV-33984'
      },
      {
        tableId: 5,
        tableName: 'Table 5',
        section: 'AC Section',
        server: 'Suresh P.',
        items: [
          { id: 'st-2', name: 'Paneer Butter Masala', price: 250, quantity: 3 },
          { id: 'br-1', name: 'Butter Naan', price: 50, quantity: 10 }
        ],
        subtotal: 1250,
        discountAmount: 0,
        taxAmount: 0,
        serviceChargeAmount: 0,
        tipAmount: 0,
        grandTotal: 1250,
        paymentMethod: 'UPI',
        settledAt: '10:45 AM',
        date: '07 Oct 2026',
        invoiceNo: 'INV-12904'
      },
      {
        tableId: 8,
        tableName: 'Table 8',
        section: 'Family Room',
        server: 'Vikram S.',
        items: [
          { id: 'bir-1', name: 'Hyderabadi Chicken Dum Biryani', price: 320, quantity: 2 },
          { id: 'dr-1', name: 'Royal Mango Lassi', price: 130, quantity: 2 }
        ],
        subtotal: 900,
        discountAmount: 0,
        taxAmount: 12,
        serviceChargeAmount: 0,
        tipAmount: 0,
        grandTotal: 912,
        paymentMethod: 'CARD',
        settledAt: '11:20 AM',
        date: '07 Oct 2026',
        invoiceNo: 'INV-49201'
      },
      {
        tableId: 4,
        tableName: 'Table 4',
        section: 'Garden Terrace',
        server: 'Priya M.',
        items: [
          { id: 'st-3', name: 'Tandoori Platter', price: 550, quantity: 2 }
        ],
        subtotal: 1100,
        discountAmount: 50,
        taxAmount: 55,
        serviceChargeAmount: 0,
        tipAmount: 0,
        grandTotal: 1105,
        paymentMethod: 'UPI',
        settledAt: '08:40 PM',
        date: '06 Oct 2026',
        invoiceNo: 'INV-98210'
      },
      {
        tableId: 1,
        tableName: 'Table 1',
        section: 'Main Hall',
        server: 'Rajesh K.',
        items: [
          { id: 'bir-1', name: 'Hyderabadi Chicken Dum Biryani', price: 320, quantity: 2 },
          { id: 'st-1', name: 'Crispy Chicken 65', price: 260, quantity: 1 },
          { id: 'dr-1', name: 'Royal Mango Lassi', price: 130, quantity: 2 }
        ],
        subtotal: 1160,
        discountAmount: 0,
        taxAmount: 58,
        serviceChargeAmount: 58,
        tipAmount: 50,
        grandTotal: 1326,
        paymentMethod: 'UPI',
        settledAt: '01:10 PM',
        date: '01 Oct 2026',
        invoiceNo: 'INV-1048'
      }
    ];
  });

  // Navigation & Table Selection ('tables' | 'order' | 'kot')
  const [activeView, setActiveView] = useState('tables');
  const [selectedTableId, setSelectedTableId] = useState(5); // Table 5

  const location = useLocation();
  const navigate = useNavigate();

  const isKotRoute = location.pathname === '/kot';
  const isAdminRoute = location.pathname === '/admin';
  const isUserRoute = !isKotRoute && !isAdminRoute;

  // ── Authentication sessions per route ────────────────────────────────
  // Each route has its own session key so POS, KOT and Admin can be
  // open simultaneously on different browser tabs/screens.
  const SESSION_KEY_POS   = 'avsr_pos_session';
  const SESSION_KEY_KOT   = 'avsr_kot_session';
  const SESSION_KEY_ADMIN = 'avsr_admin_session';

  const loadRouteSession = (key) => {
    try {
      const raw = localStorage.getItem(key) || sessionStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  };

  const [posSession,   setPosSession]   = useState(() => loadRouteSession(SESSION_KEY_POS));
  const [kotSession,   setKotSession]   = useState(() => loadRouteSession(SESSION_KEY_KOT));
  const [adminSession, setAdminSession] = useState(() => loadRouteSession(SESSION_KEY_ADMIN));

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

  const handlePosLogin   = (s) => { setPosSession(s);   saveRouteSession(SESSION_KEY_POS, s);   };
  const handleKotLogin   = (s) => { setKotSession(s);   saveRouteSession(SESSION_KEY_KOT, s);   };
  const handleAdminLogin = (s) => { setAdminSession(s); saveRouteSession(SESSION_KEY_ADMIN, s); };

  const handleGlobalLogin = (s, targetRole) => {
    const roleToUse = targetRole || s?.role || 'pos';
    setSession(s);
    if (roleToUse === 'admin') {
      handleAdminLogin(s);
      navigate('/admin');
    } else if (roleToUse === 'kot') {
      handleKotLogin(s);
      navigate('/kot');
    } else {
      handlePosLogin(s);
      navigate('/');
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
  const STORAGE_KEY_KITCHEN_NOTIFICATIONS = 'avsr_kitchen_notifications';
  const STORAGE_KEY_LATEST_ALERT           = 'avsr_latest_kitchen_alert';

  const [kitchenNotifications, setKitchenNotifications] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_KITCHEN_NOTIFICATIONS);
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [activeKitchenAlert, setActiveKitchenAlert] = useState(null);

  // Auto-dismiss active alert after 6.5 seconds
  useEffect(() => {
    if (activeKitchenAlert) {
      const t = setTimeout(() => setActiveKitchenAlert(null), 6500);
      return () => clearTimeout(t);
    }
  }, [activeKitchenAlert]);

  const triggerKitchenNotification = (alertData) => {
    const notif = {
      id: Date.now() + Math.random(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }),
      read: false,
      ...alertData
    };
    setKitchenNotifications(prev => {
      const updated = [notif, ...prev.filter(n => n.id !== notif.id).slice(0, 39)];
      try { localStorage.setItem(STORAGE_KEY_KITCHEN_NOTIFICATIONS, JSON.stringify(updated)); } catch {}
      return updated;
    });
    setActiveKitchenAlert(notif);
    try {
      localStorage.setItem(STORAGE_KEY_LATEST_ALERT, JSON.stringify(notif));
    } catch {}

    if (notif.type === 'cooking_completed') {
      sounds.playBell();
    } else {
      sounds.playAddItem();
    }
  };

  const handleClearNotifications = () => {
    setKitchenNotifications([]);
    try { localStorage.removeItem(STORAGE_KEY_KITCHEN_NOTIFICATIONS); } catch {}
  };

  // Sync to LocalStorage (always sanitizing against deletedTableIds)
  useEffect(() => {
    try {
      const isDeleted = (id) => deletedTableIds.some(d => String(d) === String(id));
      const cleanTables = tables.filter(t => !isDeleted(t.id));
      localStorage.setItem(STORAGE_KEY_TABLES, JSON.stringify(cleanTables));
    } catch {
      // Local storage full
    }
  }, [tables, deletedTableIds]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_MENU, JSON.stringify(menuItems));
    } catch {
      // Local storage full
    }
  }, [menuItems]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_STAFF, JSON.stringify(staffList));
    } catch {
      // Local storage full
    }
  }, [staffList]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_ORDERS, JSON.stringify(pastOrders));
    } catch {
      // Local storage full
    }
  }, [pastOrders]);

  // Real-time cross-tab synchronization for multi-screen restaurant stations
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === STORAGE_KEY_LATEST_ALERT && e.newValue) {
        try {
          const alert = JSON.parse(e.newValue);
          if (alert && alert.id) {
            setActiveKitchenAlert(alert);
            setKitchenNotifications(prev => [alert, ...prev.filter(n => n.id !== alert.id).slice(0, 39)]);
            if (alert.type === 'cooking_completed') {
              sounds.playBell();
            } else {
              sounds.playAddItem();
            }
          }
        } catch {}
      }
      if (e.key === STORAGE_KEY_KITCHEN_NOTIFICATIONS && e.newValue) {
        try {
          setKitchenNotifications(JSON.parse(e.newValue));
        } catch {}
      }
      if (e.key === STORAGE_KEY_DELETED_TABLES && e.newValue) {
        try {
          const newDeleted = JSON.parse(e.newValue);
          setDeletedTableIds(newDeleted);
          setTables(prev => prev.filter(t => !newDeleted.some(d => String(d) === String(t.id))));
        } catch {}
      }
      if (e.key === STORAGE_KEY_TABLES && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          const currentDeleted = getDeletedTableIds();
          const clean = parsed.filter(t => !currentDeleted.some(d => String(d) === String(t.id)));
          setTables(clean);
        } catch {}
      }
      if (e.key === STORAGE_KEY_MENU && e.newValue) {
        try { setMenuItems(JSON.parse(e.newValue)); } catch {}
      }
      if (e.key === STORAGE_KEY_STAFF && e.newValue) {
        try { setStaffList(JSON.parse(e.newValue)); } catch {}
      }
      if (e.key === STORAGE_KEY_ORDERS && e.newValue) {
        try { setPastOrders(JSON.parse(e.newValue)); } catch {}
      }
    };

    // When switching tabs or focusing window, reload fresh state so stale tabs never resurrect deleted tables
    const handleSyncOnFocus = () => {
      try {
        const freshDeleted = getDeletedTableIds();
        setDeletedTableIds(freshDeleted);
        const saved = localStorage.getItem(STORAGE_KEY_TABLES);
        if (saved) {
          const parsed = JSON.parse(saved);
          const clean = parsed.filter(t => !freshDeleted.some(d => String(d) === String(t.id)));
          setTables(clean);
        }
        const savedOrders = localStorage.getItem(STORAGE_KEY_ORDERS);
        if (savedOrders) {
          setPastOrders(JSON.parse(savedOrders));
        }
        const savedStaff = localStorage.getItem(STORAGE_KEY_STAFF);
        if (savedStaff) {
          setStaffList(JSON.parse(savedStaff));
        }
      } catch {}
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('focus', handleSyncOnFocus);
    const handleVis = () => {
      if (document.visibilityState === 'visible') {
        handleSyncOnFocus();
      }
    };
    document.addEventListener('visibilitychange', handleVis);

    // Live background interval sync across tabs/windows (every 1200ms)
    const syncInterval = setInterval(() => {
      try {
        const savedOrders = localStorage.getItem(STORAGE_KEY_ORDERS);
        if (savedOrders) {
          const parsed = JSON.parse(savedOrders);
          setPastOrders(prev => {
            if (JSON.stringify(prev) !== savedOrders) {
              return parsed;
            }
            return prev;
          });
        }
        const savedTables = localStorage.getItem(STORAGE_KEY_TABLES);
        if (savedTables) {
          const freshDeleted = getDeletedTableIds();
          const parsed = JSON.parse(savedTables);
          const clean = parsed.filter(t => !freshDeleted.some(d => String(d) === String(t.id)));
          setTables(prev => {
            if (JSON.stringify(prev) !== JSON.stringify(clean)) {
              return clean;
            }
            return prev;
          });
        }
      } catch {}
    }, 1200);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('focus', handleSyncOnFocus);
      document.removeEventListener('visibilitychange', handleVis);
      clearInterval(syncInterval);
    };
  }, []);

  // Current selected table object
  const currentTable = tables.find(t => t.id === selectedTableId) || tables[0];

  // Table selection handler
  const handleSelectTable = (id) => {
    setSelectedTableId(id);
    setActiveView('order');
    sounds.playAddItem();
  };

  // Add Item to Table Order
  const handleAddItemToTable = (tableId, menuItem) => {
    setTables(prevTables => prevTables.map(t => {
      if (t.id !== tableId) return t;

      const existingIndex = t.items.findIndex(i => i.id === menuItem.id);
      let newItems;

      if (existingIndex > -1) {
        newItems = t.items.map((item, idx) => 
          idx === existingIndex ? { ...item, quantity: item.quantity + 1 } : item
        );
      } else {
        newItems = [
          ...t.items,
          {
            id: menuItem.id,
            name: menuItem.name,
            price: menuItem.price,
            quantity: 1,
            notes: '',
            timeAdded: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            kotStatus: 'received'
          }
        ];
      }

      return {
        ...t,
        items: newItems,
        status: t.status === 'vacant' ? 'occupied' : t.status,
        orderTime: t.orderTime || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        orderTimestamp: t.orderTimestamp || Date.now(),
        completedAt: null,
        completedDuration: null
      };
    }));

    showToast(`Added ${menuItem.name} to ${tables.find(t => t.id === tableId)?.name}`);
  };

  // Update Item Quantity
  const handleUpdateItemQuantity = (tableId, itemId, newQty) => {
    setTables(prevTables => prevTables.map(t => {
      if (t.id !== tableId) return t;

      let newItems;
      if (newQty <= 0) {
        newItems = t.items.filter(i => i.id !== itemId);
      } else {
        newItems = t.items.map(i => i.id === itemId ? { ...i, quantity: newQty } : i);
      }

      return {
        ...t,
        items: newItems,
        status: newItems.length === 0 ? 'vacant' : t.status
      };
    }));
  };

  // Remove Item
  const handleRemoveItemFromTable = (tableId, itemId) => {
    setTables(prevTables => prevTables.map(t => {
      if (t.id !== tableId) return t;
      const newItems = t.items.filter(i => i.id !== itemId);
      return {
        ...t,
        items: newItems,
        status: newItems.length === 0 ? 'vacant' : t.status
      };
    }));
  };

  // Update Item Notes
  const handleUpdateItemNotes = (tableId, itemId, notes) => {
    setTables(prevTables => prevTables.map(t => {
      if (t.id !== tableId) return t;
      return {
        ...t,
        items: t.items.map(i => i.id === itemId ? { ...i, notes } : i)
      };
    }));
    showToast('Kitchen note updated');
  };

  // Update Guests Count
  const handleUpdateGuests = (tableId, count) => {
    setTables(prevTables => prevTables.map(t => 
      t.id === tableId ? { ...t, guests: count } : t
    ));
  };

  // Update Discount
  const handleUpdateDiscount = (tableId, discountPercent) => {
    setTables(prevTables => prevTables.map(t => 
      t.id === tableId ? { ...t, discountPercent } : t
    ));
  };

  // Toggle Service Charge
  const handleToggleServiceCharge = (tableId, charge) => {
    setTables(prevTables => prevTables.map(t => 
      t.id === tableId ? { ...t, serviceCharge: charge } : t
    ));
  };

  // 1. Send KOT (Kitchen Order Ticket): Transitions items to 'received' status in Kitchen
  const handleSendKOT = (tableId) => {
    sounds.playBell();
    const tbl = tables.find(t => t.id === tableId);
    setTables(prevTables => prevTables.map(t => {
      if (t.id !== tableId) return t;
      const updatedItems = t.items.map(i => ({
        ...i,
        kotStatus: (i.kotStatus === 'ready' || i.kotStatus === 'served' || i.kotStatus === 'completed')
          ? i.kotStatus
          : (i.kotStatus === 'cooking' ? 'cooking' : 'received')
      }));
      const allReady = updatedItems.length > 0 && updatedItems.every(i => i.kotStatus === 'ready' || i.kotStatus === 'served' || i.kotStatus === 'completed');

      return {
        ...t,
        orderTime: t.orderTime || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        orderTimestamp: t.orderTimestamp || Date.now(),
        items: updatedItems,
        completedAt: allReady ? t.completedAt : null,
        completedDuration: allReady ? t.completedDuration : null
      };
    }));
    setIsKOTOpen(true);
    showToast(`📥 KOT Sent: Order Received from ${tbl?.name || `Table ${tableId}`}!`);
  };

  // 2. Kitchen KDS Action: Start cooking or update status
  const handleUpdateItemKotStatus = (tableId, status, itemId = null) => {
    const tbl = tables.find(t => t.id === tableId);
    const itemObj = itemId && tbl ? tbl.items.find(i => i.id === itemId) : null;
    const itemName = itemObj ? itemObj.name : null;

    setTables(prevTables => prevTables.map(t => {
      if (t.id !== tableId) return t;
      const updatedItems = t.items.map(i => {
        if (itemId) {
          return i.id === itemId ? { ...i, kotStatus: status } : i;
        }
        // Table-level status change
        if (status === 'cooking') {
          // If starting cooking for the table, DO NOT revert already prepared/served/completed dishes back to cooking!
          if (i.kotStatus === 'ready' || i.kotStatus === 'served' || i.kotStatus === 'completed') {
            return i;
          }
          return { ...i, kotStatus: 'cooking' };
        }
        if (status === 'ready') {
          return { ...i, kotStatus: 'ready' };
        }
        return { ...i, kotStatus: status };
      });
      const allReady = updatedItems.length > 0 && updatedItems.every(i => i.kotStatus === 'ready' || i.kotStatus === 'served' || i.kotStatus === 'completed');

      let finalDuration = t.completedDuration;
      let finalCompletedAt = t.completedAt;
      let finalCookingStartedAt = t.cookingStartedAt;

      if (status === 'cooking' && !finalCookingStartedAt) {
        finalCookingStartedAt = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
      }

      if (allReady) {
        if (!finalDuration && t.orderTime) {
          finalDuration = formatElapsedTimer(parseTimeToSeconds(t.orderTime));
        }
        if (!finalCompletedAt) {
          finalCompletedAt = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
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
        completedDuration: finalDuration
      };
    }));

    if (status === 'cooking') {
      triggerKitchenNotification({
        tableId,
        tableName: tbl?.name || `Table ${tableId}`,
        type: 'cooking_started',
        title: '🔥 Cooking Started',
        message: itemName
          ? `Chef started cooking "${itemName}" for ${tbl?.name || `Table ${tableId}`}!`
          : `Chef started cooking order for ${tbl?.name || `Table ${tableId}`}!`
      });
      showToast(`🔥 ${tbl?.name || `Table ${tableId}`}: Chef started cooking!`);
    } else if (status === 'received') {
      showToast(`📥 ${tbl?.name || `Table ${tableId}`}: Reverted to Order Received.`);
    } else if (status === 'ready') {
      triggerKitchenNotification({
        tableId,
        tableName: tbl?.name || `Table ${tableId}`,
        type: 'cooking_completed',
        title: itemName ? `🔔 "${itemName}" Ready!` : '🔔 Food Ready to Serve!',
        message: itemName
          ? `"${itemName}" is prepared and ready to serve for ${tbl?.name || `Table ${tableId}`}!`
          : `Order preparation completed for ${tbl?.name || `Table ${tableId}`}! Food is ready to serve.`
      });
      showToast(`✅ ${tbl?.name || `Table ${tableId}`}: Marked Prepared & Ready!`);
    }
  };

  // 3. Kitchen KDS Action: Mark preparation completed
  const handleCompleteTableKot = (tableId, itemId = null, completedDuration = null, completedAt = null) => {
    const tbl = tables.find(t => t.id === tableId);
    const itemObj = itemId && tbl ? tbl.items.find(i => i.id === itemId) : null;
    const nowTimeStr = completedAt || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });

    setTables(prevTables => prevTables.map(t => {
      if (t.id !== tableId) return t;
      const updatedItems = t.items.map(i => {
        if (itemId && i.id !== itemId) return i;
        return { ...i, kotStatus: 'ready' };
      });
      const allReady = updatedItems.length > 0 && updatedItems.every(i => i.kotStatus === 'ready' || i.kotStatus === 'served' || i.kotStatus === 'completed');

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
        completedDuration: finalDuration
      };
    }));

    const isSingleItem = Boolean(itemObj);
    triggerKitchenNotification({
      tableId,
      tableName: tbl?.name || `Table ${tableId}`,
      type: 'cooking_completed',
      title: isSingleItem ? `🔔 Prepared: ${itemObj.name}` : '🔔 Cooking Completed!',
      message: isSingleItem
        ? `"${itemObj.name}" is prepared! Ready to serve.`
        : `All dishes for ${tbl?.name || `Table ${tableId}`} are cooked and ready to serve! 🍽️`
    });
    showToast(isSingleItem 
      ? `✅ ${tbl?.name || `Table ${tableId}`}: "${itemObj.name}" marked prepared!`
      : `✅ ${tbl?.name || `Table ${tableId}`}: Order preparation completed! Ready to serve.`
    );
  };

  // Clear / Void Table Order
  const handleClearOrder = (tableId) => {
    if (window.confirm(`Are you sure you want to clear the entire order for Table ${tableId}?`)) {
      setTables(prevTables => prevTables.map(t => {
        if (t.id !== tableId) return t;
        return {
          ...t,
          items: [],
          status: 'vacant',
          orderTime: null,
          discountPercent: 0
        };
      }));
      showToast(`Table ${tableId} order cleared.`);
    }
  };

  // Transfer Table Order
  const handleConfirmTransfer = (sourceId, targetId) => {
    const source = tables.find(t => t.id === sourceId);
    if (!source) return;

    setTables(prevTables => prevTables.map(t => {
      if (t.id === targetId) {
        return {
          ...t,
          items: [...source.items],
          status: 'occupied',
          guests: source.guests,
          orderTime: source.orderTime,
          discountPercent: source.discountPercent,
          serviceCharge: source.serviceCharge
        };
      }
      if (t.id === sourceId) {
        return {
          ...t,
          items: [],
          status: 'vacant',
          orderTime: null,
          discountPercent: 0
        };
      }
      return t;
    }));

    setIsTransferOpen(false);
    setSelectedTableId(targetId);
    showToast(`Transferred Table ${sourceId} to Table ${targetId}!`);
  };

  // Confirm Payment & Settle Bill
  const handleConfirmPayment = (settlementData) => {
    const tableObj = tables.find(t => t.id === settlementData.tableId);
    let finalDuration = tableObj?.completedDuration;
    if (!finalDuration && tableObj?.orderTime) {
      finalDuration = formatElapsedTimer(parseTimeToSeconds(tableObj.orderTime, settlementData.settledAt));
    }
    const enrichedSettlement = {
      ...settlementData,
      date: settlementData.date || new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
      cookingStartedAt: tableObj?.cookingStartedAt || tableObj?.orderTime || settlementData.settledAt,
      completedAt: tableObj?.completedAt || settlementData.settledAt,
      completedDuration: finalDuration || '12m 30s',
      orderTime: tableObj?.orderTime || settlementData.settledAt,
      orderTimestamp: tableObj?.orderTimestamp || Date.now()
    };

    const updatedPastOrders = [enrichedSettlement, ...pastOrders];
    setPastOrders(updatedPastOrders);
    try {
      localStorage.setItem(STORAGE_KEY_ORDERS, JSON.stringify(updatedPastOrders));
    } catch {}

    const updatedTables = tables.map(t => {
      if (t.id !== settlementData.tableId) return t;
      return {
        ...t,
        items: [],
        status: 'vacant',
        orderTime: null,
        discountPercent: 0,
        guests: t.capacity
      };
    });
    setTables(updatedTables);
    try {
      const isDeleted = (id) => deletedTableIds.some(d => String(d) === String(id));
      const cleanTables = updatedTables.filter(t => !isDeleted(t.id));
      localStorage.setItem(STORAGE_KEY_TABLES, JSON.stringify(cleanTables));
    } catch {}

    setIsSettlementOpen(false);
    showToast(`✅ ${settlementData.tableName} bill settled via ${settlementData.paymentMethod.toUpperCase()}`);

    setReprintReceiptData({
      id: settlementData.tableId,
      name: settlementData.tableName,
      section: settlementData.section,
      server: settlementData.server,
      guests: 2,
      items: settlementData.items,
      discountPercent: 0,
      serviceCharge: 5
    });
    setIsReceiptOpen(true);
  };

  // ================= ADMIN ACTIONS =================
  // 1. Menu Items Admin
  const handleAddMenuItem = (newItem) => {
    setMenuItems(prev => [newItem, ...prev]);
    showToast(`✅ Dish "${newItem.name}" added to menu!`);
  };

  const handleUpdateMenuItem = (updatedItem) => {
    setMenuItems(prev => prev.map(item => item.id === updatedItem.id ? updatedItem : item));
    showToast(`✅ Updated "${updatedItem.name}"`);
  };

  const handleDeleteMenuItem = (itemId) => {
    const item = menuItems.find(i => i.id === itemId);
    setMenuItems(prev => prev.filter(i => i.id !== itemId));
    showToast(`🗑️ Removed "${item?.name || 'Item'}" from menu.`);
  };

  // 2. Tables & Chairs Admin
  const handleAddTable = (newTable) => {
    // If table ID was previously marked deleted, unmark it
    const nextDeleted = deletedTableIds.filter(id => String(id) !== String(newTable.id));
    setDeletedTableIds(nextDeleted);
    try {
      localStorage.setItem(STORAGE_KEY_DELETED_TABLES, JSON.stringify(nextDeleted));
    } catch {}

    setTables(prev => {
      const updated = [...prev, newTable];
      try {
        localStorage.setItem(STORAGE_KEY_TABLES, JSON.stringify(updated));
      } catch {}
      return updated;
    });
    showToast(`✅ Created ${newTable.name} with ${newTable.capacity} chairs!`);
  };

  const handleUpdateTable = (updatedTable) => {
    setTables(prev => {
      const updated = prev.map(t => String(t.id) === String(updatedTable.id) ? updatedTable : t);
      try {
        localStorage.setItem(STORAGE_KEY_TABLES, JSON.stringify(updated));
      } catch {}
      return updated;
    });
    showToast(`✅ Updated ${updatedTable.name} (${updatedTable.capacity} chairs)`);
  };

  const handleDeleteTable = (tableId) => {
    const tbl = tables.find(t => String(t.id) === String(tableId));
    
    // 1. Permanently register this table ID as deleted
    const nextDeleted = [...new Set([...deletedTableIds, tableId, String(tableId), Number(tableId)].filter(Boolean))];
    setDeletedTableIds(nextDeleted);
    try {
      localStorage.setItem(STORAGE_KEY_DELETED_TABLES, JSON.stringify(nextDeleted));
    } catch {}

    // 2. Remove table from active list and persist immediately
    const nextTables = tables.filter(t => String(t.id) !== String(tableId));
    setTables(nextTables);
    try {
      localStorage.setItem(STORAGE_KEY_TABLES, JSON.stringify(nextTables));
    } catch {}

    // 3. If currently selected table in billing view is this deleted table, switch to first remaining table
    if (String(selectedTableId) === String(tableId)) {
      setSelectedTableId(nextTables.length > 0 ? nextTables[0].id : 1);
    }

    showToast(`🗑️ Permanently Deleted ${tbl?.name || 'Table'}`);
  };

  // 3. Staff & Persons Admin
  const handleAddStaff = (newPerson) => {
    setStaffList(prev => [...prev, newPerson]);
    showToast(`✅ Staff member "${newPerson.name}" added!`);
  };

  const handleDeleteStaff = (personId) => {
    const person = staffList.find(p => p.id === personId);
    setStaffList(prev => prev.filter(p => p.id !== personId));
    showToast(`🗑️ Removed "${person?.name || 'Staff'}"`);
  };

  // Reset to default initial state
  const handleResetData = () => {
    if (window.confirm("Reset all tables, menu dishes and staff to initial default demo data?")) {
      setDeletedTableIds([]);
      setTables(INITIAL_TABLES);
      setMenuItems(MENU_ITEMS);
      setStaffList(INITIAL_STAFF);
      localStorage.removeItem(STORAGE_KEY_TABLES);
      localStorage.removeItem(STORAGE_KEY_DELETED_TABLES);
      localStorage.removeItem(STORAGE_KEY_MENU);
      localStorage.removeItem(STORAGE_KEY_STAFF);
      showToast("Reset to initial defaults complete.");
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)' }}>
      {/* Top Header shown only on User POS (Dining Floor & Billing) when logged in */}
      {isUserRoute && posSession && (posSession.role === 'pos' || posSession.role === 'admin') && (
        <Header
          tables={tables}
          activeView={activeView}
          setActiveView={setActiveView}
          selectedTableId={selectedTableId}
          onResetData={handleResetData}
          onOpenPastOrders={() => setIsPastOrdersOpen(true)}
          onOpenAdmin={() => navigate('/admin')}
          onOpenKOTView={() => navigate('/kot')}
          currentTheme={theme}
          onChangeTheme={setTheme}
          currentSession={posSession}
          onLogout={handlePosLogout}
          kitchenNotifications={kitchenNotifications}
          onClearNotifications={handleClearNotifications}
          onSelectTable={(tblId) => {
            setSelectedTableId(tblId);
            setActiveView('order');
            navigate('/');
          }}
        />
      )}

      {/* Main Separate Routes Rendering */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* 1. DEDICATED KITCHEN KOT VIEW (ROUTE: /kot) - ONLY KOT RELATED! */}
        {isKotRoute && (
          kotSession && (kotSession.role === 'kot' || kotSession.role === 'admin')
            ? (
              <ErrorBoundary>
                <KitchenKOTView
                  tables={tables}
                  pastOrders={pastOrders}
                  currentTheme={theme}
                  onChangeTheme={setTheme}
                  onBackToFloor={() => {
                    setActiveView('tables');
                    navigate('/');
                  }}
                  onUpdateItemKotStatus={handleUpdateItemKotStatus}
                  onCompleteTableKot={handleCompleteTableKot}
                  onOpenTableOrder={(tableId) => {
                    setSelectedTableId(tableId);
                    setActiveView('order');
                    navigate('/');
                  }}
                  currentSession={kotSession}
                  onLogout={handleKotLogout}
                />
              </ErrorBoundary>
            ) : (
              <LoginPage role="kot" onLoginSuccess={handleGlobalLogin} />
            )
        )}

        {/* 2. DEDICATED ADMIN PORTAL VIEW (ROUTE: /admin) */}
        {isAdminRoute && (
          adminSession && adminSession.role === 'admin'
            ? (
              <AdminPortal
                isFullPage={true}
                onClose={() => navigate('/')}
                menuItems={menuItems}
                onAddMenuItem={handleAddMenuItem}
                onUpdateMenuItem={handleUpdateMenuItem}
                onDeleteMenuItem={handleDeleteMenuItem}
                tables={tables}
                onAddTable={handleAddTable}
                onUpdateTable={handleUpdateTable}
                onDeleteTable={handleDeleteTable}
                staffList={staffList}
                onAddStaff={handleAddStaff}
                onDeleteStaff={handleDeleteStaff}
                onOpenKOTView={() => navigate('/kot')}
                onUpdateItemKotStatus={handleUpdateItemKotStatus}
                onCompleteTableKot={handleCompleteTableKot}
                currentSession={adminSession}
                onLogout={handleAdminLogout}
                currentTheme={theme}
                onChangeTheme={setTheme}
              />
            ) : (
              <LoginPage role="admin" onLoginSuccess={handleGlobalLogin} />
            )
        )}

        {/* 3. DEDICATED USER POS VIEW (ROUTE: / or /user) */}
        {isUserRoute && (
          posSession && (posSession.role === 'pos' || posSession.role === 'admin')
            ? (
              <>
                {activeView === 'tables' && (
                  <TableView
                    tables={tables}
                    onSelectTable={handleSelectTable}
                  />
                )}
                {activeView === 'order' && (
                  <TableDetailView
                    table={currentTable}
                    allTables={tables}
                    menuItems={menuItems}
                    onSelectTable={setSelectedTableId}
                    onBackToTables={() => setActiveView('tables')}
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
                    onOpenKOTView={() => navigate('/kot')}
                  />
                )}
              </>
            ) : (
              <LoginPage role="pos" onLoginSuccess={handleGlobalLogin} />
            )
        )}
      </main>

      {/* Real-time Kitchen Status Alert Banner (Cooking Started & Cooking Completed) */}
      {activeKitchenAlert && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '24px',
          zIndex: 9999,
          width: '380px',
          maxWidth: 'calc(100vw - 32px)',
          background: activeKitchenAlert.type === 'cooking_completed'
            ? 'linear-gradient(135deg, rgba(6, 78, 59, 0.96), rgba(15, 23, 42, 0.98))'
            : 'linear-gradient(135deg, rgba(124, 45, 18, 0.96), rgba(15, 23, 42, 0.98))',
          backdropFilter: 'blur(16px)',
          border: `2px solid ${activeKitchenAlert.type === 'cooking_completed' ? '#10b981' : '#f97316'}`,
          borderRadius: '16px',
          padding: '1rem 1.15rem',
          boxShadow: `0 20px 45px rgba(0, 0, 0, 0.7), 0 0 30px ${activeKitchenAlert.type === 'cooking_completed' ? 'rgba(16, 185, 129, 0.45)' : 'rgba(249, 115, 22, 0.45)'}`,
          display: 'flex',
          flexDirection: 'column',
          gap: '0.55rem',
          animation: 'slideInAlert 0.35s cubic-bezier(0.16, 1, 0.3, 1)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <div style={{
                width: '36px', height: '36px', borderRadius: '10px',
                background: activeKitchenAlert.type === 'cooking_completed' ? 'rgba(16, 185, 129, 0.25)' : 'rgba(249, 115, 22, 0.25)',
                border: `1.5px solid ${activeKitchenAlert.type === 'cooking_completed' ? 'rgba(16, 185, 129, 0.5)' : 'rgba(249, 115, 22, 0.5)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.25rem'
              }}>
                {activeKitchenAlert.type === 'cooking_completed' ? '🔔' : '🔥'}
              </div>
              <div>
                <div style={{
                  fontSize: '0.66rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.08em',
                  color: activeKitchenAlert.type === 'cooking_completed' ? '#34d399' : '#fb923c'
                }}>
                  {activeKitchenAlert.type === 'cooking_completed' ? '✅ Food Ready To Serve' : '🔥 Cooking in Progress'}
                </div>
                <div style={{ fontSize: '1rem', fontWeight: 900, color: '#ffffff', lineHeight: 1.1 }}>
                  {activeKitchenAlert.title}
                </div>
              </div>
            </div>
            <button
              onClick={() => setActiveKitchenAlert(null)}
              style={{
                background: 'rgba(255,255,255,0.08)', border: 'none', color: '#94a3b8',
                width: '26px', height: '26px', borderRadius: '50%', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem'
              }}
              title="Dismiss"
            >
              ✕
            </button>
          </div>

          <div style={{ fontSize: '0.84rem', color: '#f1f5f9', lineHeight: 1.35, fontWeight: 600 }}>
            {activeKitchenAlert.message}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '0.45rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
            <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 700 }}>
              ⏰ {activeKitchenAlert.timestamp}
            </span>
            {activeKitchenAlert.tableId && (
              <button
                onClick={() => {
                  setSelectedTableId(activeKitchenAlert.tableId);
                  setActiveView('order');
                  navigate('/');
                  setActiveKitchenAlert(null);
                }}
                style={{
                  background: activeKitchenAlert.type === 'cooking_completed'
                    ? 'linear-gradient(135deg, #10b981, #059669)'
                    : 'linear-gradient(135deg, #f59e0b, #ea580c)',
                  border: 'none', color: '#ffffff',
                  padding: '5px 14px', borderRadius: '7px',
                  fontSize: '0.76rem', fontWeight: 800, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: '4px',
                  boxShadow: activeKitchenAlert.type === 'cooking_completed' ? '0 4px 14px rgba(16, 185, 129, 0.4)' : '0 4px 14px rgba(245, 158, 11, 0.4)'
                }}
              >
                View {activeKitchenAlert.tableName || `Table ${activeKitchenAlert.tableId}`} →
              </button>
            )}
          </div>
        </div>
      )}

      {/* Floating Notification Toast */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'var(--bg-tertiary)',
          color: 'var(--text-main)',
          border: '1px solid var(--accent-amber)',
          boxShadow: 'var(--shadow-lg)',
          padding: '0.65rem 1.25rem',
          borderRadius: '30px',
          fontSize: '0.85rem',
          fontWeight: 700,
          zIndex: 200,
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
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
          tables={tables}
          onAddTable={handleAddTable}
          onUpdateTable={handleUpdateTable}
          onDeleteTable={handleDeleteTable}
          staffList={staffList}
          onAddStaff={handleAddStaff}
          onDeleteStaff={handleDeleteStaff}
          onOpenKOTView={() => {
            setIsAdminOpen(false);
            setActiveView('kot');
          }}
          onUpdateItemKotStatus={handleUpdateItemKotStatus}
          onCompleteTableKot={handleCompleteTableKot}
          currentTheme={theme}
          onChangeTheme={setTheme}
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
        <KOTModal
          table={currentTable}
          onClose={() => setIsKOTOpen(false)}
        />
      )}

      {/* Past Orders & Invoices Modal */}
      {isPastOrdersOpen && (
        <PastOrdersModal
          pastOrders={pastOrders}
          onClose={() => setIsPastOrdersOpen(false)}
          onReprintReceipt={(order) => {
            setReprintReceiptData({
              id: order.tableId,
              name: order.tableName,
              section: order.section,
              server: order.server,
              guests: order.guests || 2,
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
              date: order.date
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
