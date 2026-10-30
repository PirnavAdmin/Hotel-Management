import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  ChefHat,
  Clock,
  Calendar,
  CheckCircle2,
  Flame,
  Search,
  AlertCircle,
  Check,
  Printer,
  Utensils,
  ArrowRight,
  RefreshCw,
  RotateCcw,
  BellRing,
  Filter,
  ArrowUpDown,
  X,
  Users,
  ChevronDown,
  ChevronRight,
  Sun,
  Moon,
} from "lucide-react";
import { sounds } from "../utils/audio";
import {
  apiCompleteKitchenTicket,
  apiGetActiveKitchenTickets,
  apiStartKitchenTicket,
  apiUpdateKitchenItemStatus,
} from "../api/kitchenApi";
import { KOTModal } from "./KOTModal";
import { createMenuItemLookup, findMenuItem, isBeverageCategory } from "./orderRouting";
import { ProfileDropdown } from "../common/ProfileDropdown";
import { ThemeToggle } from "../common/ThemeToggle";
import { SkeletonOrderTicket } from "../common/Skeletons";
import {
  parseTimeToSeconds,
  formatElapsedTimer,
  getTimerUrgencyColor,
  formatDisplayTime,
} from "../utils/timer";

const formatCleanTableNum = (name, id) => {
  if (!name) return String(id ?? "");
  const num = String(name).replace(/^Table\s*[-–—]?\s*/i, "").replace(/^Table\s*/i, "").trim();
  return num || String(id ?? "");
};

const formatCleanTableName = (name, id) => {
  const num = formatCleanTableNum(name, id);
  return `Table ${num}`;
};

export function KitchenKOTView({
  tables = [],
  pastOrders = [],
  currentTheme,
  onChangeTheme,
  onBackToFloor,
  onUpdateItemKotStatus,
  onCompleteTableKot,
  onOpenTableOrder,
  initialTableId = "all",
  currentSession = null,
  onLogout = null,
  restaurantName = "Restaurant",
  restaurantLogo = "",
  station = "kitchen",
  menuItems = [],
}) {
  const menuLookup = useMemo(() => createMenuItemLookup(menuItems), [menuItems]);
  const isBarStation = station === "bar";
  const [selectedTableFilter, setSelectedTableFilter] =
    useState(initialTableId); // 'all' or table.id
  const [isTableFilterOpen, setIsTableFilterOpen] = useState(false);
  const tableFilterRef = useRef(null);
  const [statusFilter, setStatusFilter] = useState("all"); // 'all' | 'pending' | 'cooking' | 'completed'
  const [sortOrder, setSortOrder] = useState("recent-first"); // 'recent-first' (default: newest orders first) | 'oldest-first'
  const [searchQuery, setSearchQuery] = useState("");
  const [activePrintTable, setActivePrintTable] = useState(null);
  const [selectedDetailTicket, setSelectedDetailTicket] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [persistedKitchenTickets, setPersistedKitchenTickets] = useState([]);
  const [isKitchenLoading, setIsKitchenLoading] = useState(true);
  const [kitchenApiError, setKitchenApiError] = useState("");
  const kitchenFetchInProgress = useRef(false);
  const refreshKitchenTicketsRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    const refresh = async () => {
      if (kitchenFetchInProgress.current) return;
      kitchenFetchInProgress.current = true;
      try {
        if (import.meta.env.DEV) console.debug("[Kitchen] GET /api/Kitchen/active-tickets");
        const result = await apiGetActiveKitchenTickets();
        if (!result?.success || !Array.isArray(result.data)) {
          const message = result?.error || "The Kitchen API returned an unexpected response.";
          if (import.meta.env.DEV) console.error("[Kitchen] Ticket load failed", { status: result?.status, error: message });
          if (!cancelled) setKitchenApiError(message);
          return;
        }
        if (import.meta.env.DEV) console.debug("[Kitchen] Tickets loaded", {
          endpoint: "/api/Kitchen/active-tickets",
          status: result.status,
          count: result.data.length,
        });
        if (!cancelled) {
          setPersistedKitchenTickets(result.data);
          setKitchenApiError("");
          setIsKitchenLoading(false);
        }
      } catch (error) {
        if (!cancelled) setKitchenApiError(error?.message || "Could not load Kitchen tickets.");
      } finally {
        kitchenFetchInProgress.current = false;
        if (!cancelled) setIsKitchenLoading(false);
      }
    };
    refreshKitchenTicketsRef.current = refresh;
    refresh();
    const intervalId = window.setInterval(refresh, 7000);
    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      refreshKitchenTicketsRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!isTableFilterOpen) return;

    const closeOnOutsideClick = (event) => {
      if (!tableFilterRef.current?.contains(event.target)) {
        setIsTableFilterOpen(false);
      }
    };
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setIsTableFilterOpen(false);
    };

    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [isTableFilterOpen]);

  // Track dismissed paid completed tickets (if chef explicitly chooses to clear them from screen)
  const [dismissedPaidTicketIds, setDismissedPaidTicketIds] = useState(() => {
    try {
      const saved = localStorage.getItem("gourmet_kot_dismissed_tickets_v1");
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  const handleDismissTicket = (ticketId) => {
    setDismissedPaidTicketIds((prev) => {
      const updated = [...prev, ticketId];
      try {
        localStorage.setItem(
          "gourmet_kot_dismissed_tickets_v1",
          JSON.stringify(updated),
        );
      } catch {}
      return updated;
    });
  };

  // Keep past orders synced in real-time across tabs/windows
  const [syncedPastOrders, setSyncedPastOrders] = useState(() => {
    try {
      const saved = localStorage.getItem("gourmet_pos_past_orders_v2_inr");
      if (saved) return JSON.parse(saved);
    } catch {}
    return pastOrders;
  });

  useEffect(() => {
    setSyncedPastOrders(Array.isArray(pastOrders) ? pastOrders : []);
  }, [pastOrders]);

  useEffect(() => {
    const handleStorage = (e) => {
      if (e.key === "gourmet_pos_past_orders_v2_inr" && e.newValue) {
        try {
          setSyncedPastOrders(JSON.parse(e.newValue));
        } catch {}
      }
    };
    const pollInterval = setInterval(() => {
      try {
        const saved = localStorage.getItem("gourmet_pos_past_orders_v2_inr");
        if (saved) {
          const parsed = JSON.parse(saved);
          setSyncedPastOrders((prev) => {
            if (JSON.stringify(prev) !== saved) return parsed;
            return prev;
          });
        }
      } catch {}
    }, 1000);

    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener("storage", handleStorage);
      clearInterval(pollInterval);
    };
  }, []);

  const [completedTimers, setCompletedTimers] = useState({});

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const effectivePastOrders =
    syncedPastOrders && syncedPastOrders.length > 0
      ? syncedPastOrders
      : pastOrders;

  // The Kitchen board uses persisted order-backed tickets as its source of truth.
  const isItemReceived = (item) => {
    return ["", "received", "new", "queued", "pending"].includes(
      String(item?.kotStatus || "").toLowerCase(),
    );
  };

  const isItemCooking = (item) =>
    String(item?.kotStatus || "").toLowerCase() === "cooking";

  const isItemCompleted = (item) =>
    item.kotStatus === "ready" ||
    item.kotStatus === "served" ||
    item.kotStatus === "completed";

  const getCookingElapsedSeconds = (ticket) => {
    if (!ticket) return 0;

    if (ticket.completedAt && ticket.cookingStartedAt) {
      return parseTimeToSeconds(ticket.cookingStartedAt, ticket.completedAt);
    }

    if (ticket.cookingStartedAt) {
      return parseTimeToSeconds(ticket.cookingStartedAt);
    }

    return 0;
  };

  const normalizePriority = (value) => {
    const normalized = String(value ?? "normal")
      .trim()
      .toLowerCase();

    if (["urgent", "asap", "critical", "emergency"].includes(normalized)) {
      return "urgent";
    }

    if (["high", "important", "priority"].includes(normalized)) {
      return "high";
    }

    return "normal";
  };

  const getPriorityMeta = (ticket) => {
    const rawPriority =
      ticket?.priority ??
      ticket?.orderPriority ??
      ticket?.items?.find((item) => item?.priority)?.priority ??
      ticket?.items?.[0]?.priority ??
      "normal";

    const value = normalizePriority(rawPriority);
    const priorityMap = {
      normal: {
        value: "normal",
        label: "NORMAL",
        emoji: "🟢",
        color: "#22c55e",
        bg: "rgba(34, 197, 94, 0.14)",
        border: "rgba(34, 197, 94, 0.45)",
      },
      high: {
        value: "high",
        label: "HIGH",
        emoji: "🟡",
        color: "var(--accent-amber-light)",
        bg: "rgba(251, 191, 36, 0.14)",
        border: "rgba(251, 191, 36, 0.45)",
      },
      urgent: {
        value: "urgent",
        label: "URGENT",
        emoji: "🔴",
        color: "var(--danger)",
        bg: "rgba(239, 68, 68, 0.14)",
        border: "rgba(239, 68, 68, 0.45)",
      },
    };

    return priorityMap[value] || priorityMap.normal;
  };

  const getPriorityWeight = (ticket) => {
    const value = getPriorityMeta(ticket).value;
    const weights = { normal: 1, high: 2, urgent: 3 };
    return weights[value] || 1;
  };

  const parsePrepMinutes = (value) => {
    if (!value) return 0;
    const match = String(value).match(/(\d+)\s*min/i);
    if (match) return Number(match[1]);
    const hourMatch = String(value).match(/(\d+)\s*hr/i);
    if (hourMatch) return Number(hourMatch[1]) * 60;
    return 0;
  };

  const getTicketExpectedPrepSeconds = (ticket) => {
    if (!ticket?.items || ticket.items.length === 0) return 0;
    const prepValues = ticket.items
      .map((item) => parsePrepMinutes(item?.prepTime ?? item?.expectedPrepTime))
      .filter((value) => value > 0);
    if (prepValues.length === 0) return 0;
    return Math.max(...prepValues) * 60;
  };

  const getDelayMeta = (ticket) => {
    if (!ticket?.cookingStartedAt) {
      return {
        isDelayed: false,
        isOnTime: false,
        diffSeconds: 0,
        label: "WAITING",
      };
    }

    const expectedSeconds = getTicketExpectedPrepSeconds(ticket);
    if (!expectedSeconds) {
      return {
        isDelayed: false,
        isOnTime: true,
        diffSeconds: 0,
        label: "ON TIME",
      };
    }

    const elapsedSeconds = getCookingElapsedSeconds(ticket);
    const diffSeconds = elapsedSeconds - expectedSeconds;

    if (diffSeconds <= 0) {
      return {
        isDelayed: false,
        isOnTime: true,
        diffSeconds,
        label: "ON TIME",
      };
    }

    return {
      isDelayed: true,
      isOnTime: false,
      diffSeconds,
      label: "DELAYED",
      deltaText: `+${formatElapsedTimer(diffSeconds)}`,
    };
  };

  // One visual card per persisted order batch. Table ID remains the floor-filter key;
  // the server order ID and batch are retained for Kitchen mutations.
  const getTicketTimeValue = (ticket) => {
    if (Number(ticket?.orderTimestamp) > 0) return Number(ticket.orderTimestamp);
    const value = ticket?.orderTime || ticket?.createdAt || ticket?.orderReceivedAt;
    if (!value) return 0;
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : parseTimeToSeconds(value);
  };

  const activeTickets = persistedKitchenTickets.map((ticket) => {
    const orderId = ticket.orderId ?? ticket.ticketId;
    const backendTableId = ticket.tableId ?? orderId;
    const localTable = tables.find((table) =>
      String(table.backendTableId ?? table.id) === String(backendTableId),
    );
    const tableId = localTable?.id ?? backendTableId;
    const batch = Number(ticket.kotBatch) || 1;
    return {
      id: tableId,
      backendTableId,
      backendOrderId: orderId,
      kotBatch: batch,
      name: ticket.tableName || `Table ${tableId}`,
      section: ticket.section || ticket.sectionArea || "Main Hall",
      server: ticket.serverName || "Server",
      orderTime: ticket.orderTime || ticket.createdAt || ticket.orderReceivedAt,
      priority: ticket.priority || "normal",
      uniqueKey: `active-${orderId}-${batch}`,
      isPaid: false,
      ticketType: "active",
      items: (Array.isArray(ticket.items) ? ticket.items : []).filter((item) => {
        const category = findMenuItem(menuLookup, item)?.category;
        return isBarStation ? isBeverageCategory(category) : !isBeverageCategory(category);
      }).map((item) => ({
        ...item,
        id: item.id ?? item.orderItemId,
        menuItemId: item.menuItemId,
        name: item.name || item.dishName || "Order Item",
        kotStatus: String(item.kotStatus || item.itemStatus || "queued").toLowerCase(),
        kotBatch: Number(item.kotBatch) || batch,
      })),
    };
  }).filter((ticket) => ticket.items.length > 0);

  // Combined List: Only Active Orders from POS
  const allKitchenTickets = activeTickets.sort((a, b) => {
    const priorityDelta = getPriorityWeight(b) - getPriorityWeight(a);
    if (priorityDelta !== 0) return priorityDelta;

    const timeA = getTicketTimeValue(a);
    const timeB = getTicketTimeValue(b);
    if (sortOrder === "recent-first") {
      if (timeB !== timeA) return timeB - timeA; // Descending: Most recent orders show first!
      return (b.id || 0) - (a.id || 0);
    } else {
      if (timeA !== timeB) return timeA - timeB; // Ascending: Oldest orders show first
      return (a.id || 0) - (b.id || 0);
    }
  });

  // Auto-record completion timer for any completed ticket that doesn't have one so it STOPS ticking immediately
  useEffect(() => {
    allKitchenTickets.forEach((t) => {
      const isDone =
        t.isPaid ||
        (t.items && t.items.length > 0 && t.items.every(isItemCompleted));
      const key = t.uniqueKey || `table-${t.id}`;
      if (isDone) {
        setCompletedTimers((prev) => {
          if (prev[key]) return prev;
          let stoppedVal = t.completedDuration;
          if (!stoppedVal && t.orderTime) {
            const sec = parseTimeToSeconds(t.orderTime, t.completedAt);
            stoppedVal = formatElapsedTimer(sec);
          }
          return { ...prev, [key]: stoppedVal || "Ready" };
        });
      } else {
        // Clean up stale completed timer if order is still active or new item was added
        setCompletedTimers((prev) => {
          if (!prev[key] && !prev[t.id] && !prev[`table-${t.id}`]) return prev;
          const copy = { ...prev };
          delete copy[key];
          delete copy[t.id];
          delete copy[`table-${t.id}`];
          return copy;
        });
      }
    });
  }, [allKitchenTickets]);

  // Filtered tickets based on selected table number, status, and search query
  const filteredTables = allKitchenTickets.filter((t) => {
    // 1. Table Number Filter: When user or admin clicks on a table number, show only that table
    if (selectedTableFilter !== "all") {
      const matchId = String(t.id) === String(selectedTableFilter);
      const matchName =
        t.name &&
        (t.name === selectedTableFilter ||
          t.name.toLowerCase() === String(selectedTableFilter).toLowerCase());
      if (!matchId && !matchName) {
        return false;
      }
    }

    // 2. Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchesTable =
        (t.name || "").toLowerCase().includes(q) ||
        (t.section || "").toLowerCase().includes(q) ||
        (t.server || "").toLowerCase().includes(q);
      const matchesItem =
        t.items &&
        t.items.some((item) => (item.name || "").toLowerCase().includes(q));
      if (!matchesTable && !matchesItem) return false;
    }

    // 3. Status filter
    if (statusFilter !== "all") {
      const items = Array.isArray(t?.items) ? t.items : [];
      const allCompleted = items.length > 0 && items.every(isItemCompleted);
      const hasCooking = items.some(isItemCooking);
      const hasReceived = items.some(isItemReceived);

      if (statusFilter === "pending" && !hasReceived) return false;
      if (statusFilter === "cooking" && !hasCooking) return false;
      if (statusFilter === "completed" && !allCompleted) return false;
    }

    return true;
  });

  // Kitchen stats: accurately reflect Received -> Cooking -> Completed
  const totalOrdersCount = allKitchenTickets.length;
  const pendingOrdersCount = allKitchenTickets.filter(
    (t) => Array.isArray(t?.items) && t.items.some(isItemReceived),
  ).length;
  const cookingOrdersCount = allKitchenTickets.filter(
    (t) => Array.isArray(t?.items) && t.items.some(isItemCooking),
  ).length;
  const completedOrdersCount = allKitchenTickets.filter(
    (t) => Array.isArray(t?.items) && t.items.length > 0 && t.items.every(isItemCompleted),
  ).length;

  // Auto-switch to "Received" tab when a new KOT arrives
  const prevPendingRef = useRef(pendingOrdersCount);
  useEffect(() => {
    if (pendingOrdersCount > prevPendingRef.current) {
      setStatusFilter("pending"); // Automatically switch tab to 'Received'
    }
    prevPendingRef.current = pendingOrdersCount;
  }, [pendingOrdersCount]);

  // Real-time synced ticket for popup details modal (strictly matching the clicked ticket's uniqueKey)
  const activeModalTicket = selectedDetailTicket
    ? allKitchenTickets.find(
        (t) => t.uniqueKey && t.uniqueKey === selectedDetailTicket.uniqueKey,
      ) || selectedDetailTicket
    : null;

  const findKitchenTicket = (ticketKey) => allKitchenTickets.find(
    (ticket) => ticket.uniqueKey === ticketKey || String(ticket.id) === String(ticketKey),
  );

  const reportKitchenActionError = (result, action) => {
    const message = result?.error || `${action} failed. Please retry.`;
    setKitchenApiError(message);
    if (import.meta.env.DEV) console.error(`[Kitchen] ${action} failed`, { status: result?.status, error: message });
  };

  const handleStartCooking = async (ticketKey, itemId = null) => {
    sounds.playAddItem();
    const ticket = findKitchenTicket(ticketKey);
    if (!ticket) return;

    const result = itemId
      ? await apiUpdateKitchenItemStatus(itemId, "cooking")
      : await apiStartKitchenTicket(ticket.backendOrderId, ticket.kotBatch);
    if (!result?.success) {
      reportKitchenActionError(result, "Start cooking");
      return;
    }
    const targetItem = itemId && ticket.items.find((item) => String(item.id) === String(itemId));
    const localTableId = tables.find((table) =>
      String(table.backendTableId ?? table.id) === String(ticket.backendTableId),
    )?.id ?? ticket.id;
    onUpdateItemKotStatus?.(localTableId, "cooking", targetItem?.menuItemId ?? null);
    await refreshKitchenTicketsRef.current?.();
  };

  const handleCompletePreparation = async (ticketKey, itemId = null) => {
    sounds.playBell();
    const currentTable = findKitchenTicket(ticketKey);
    if (!currentTable) return;
    const nowTimeStr = new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });

    let durationStr = null;
    const startTime = currentTable?.cookingStartedAt || currentTable?.orderTime;
    if (currentTable && startTime) {
      const elapsedSec = currentTable.cookingStartedAt
        ? parseTimeToSeconds(currentTable.cookingStartedAt, nowTimeStr)
        : parseTimeToSeconds(startTime);
      durationStr = formatElapsedTimer(elapsedSec);
    }

    // Only lock completed duration if all items on the table will be prepared
    const willAllBeReady =
      !itemId ||
      (currentTable?.items &&
        currentTable.items.every((i) => String(i.id) === String(itemId) || isItemCompleted(i)));
    if (willAllBeReady && durationStr) {
      setCompletedTimers((prev) => ({
        ...prev,
        [ticketKey]: durationStr,
        [`table-${currentTable.id}`]: durationStr,
        ...(currentTable?.uniqueKey
          ? { [currentTable.uniqueKey]: durationStr }
          : {}),
      }));
    }
    const result = itemId
      ? await apiUpdateKitchenItemStatus(itemId, "ready")
      : await apiCompleteKitchenTicket(currentTable.backendOrderId, currentTable.kotBatch);
    if (!result?.success) {
      reportKitchenActionError(result, "Complete preparation");
      return;
    }
    const targetItem = itemId && currentTable.items.find((item) => String(item.id) === String(itemId));
    const localTableId = tables.find((table) =>
      String(table.backendTableId ?? table.id) === String(currentTable.backendTableId),
    )?.id ?? currentTable.id;
    onCompleteTableKot?.(localTableId, targetItem?.menuItemId ?? null, durationStr, nowTimeStr);
    await refreshKitchenTicketsRef.current?.();
  };

  const handleResetToReceived = async (ticketKey, itemId = null) => {
    sounds.playAddItem();
    const ticket = findKitchenTicket(ticketKey);
    if (!ticket) return;
    setCompletedTimers((prev) => {
      const copy = { ...prev };
      delete copy[ticketKey];
      delete copy[`table-${ticket.id}`];
      return copy;
    });
    const targetItems = itemId
      ? ticket.items.filter((item) => String(item.id) === String(itemId))
      : ticket.items.filter((item) => !isItemCompleted(item));
    const results = await Promise.all(targetItems.map((item) => apiUpdateKitchenItemStatus(item.id, "queued")));
    const failed = results.find((result) => !result?.success);
    if (failed) {
      reportKitchenActionError(failed, "Reset item to received");
      return;
    }
    const targetItem = itemId && targetItems[0];
    const localTableId = tables.find((table) =>
      String(table.backendTableId ?? table.id) === String(ticket.backendTableId),
    )?.id ?? ticket.id;
    onUpdateItemKotStatus?.(localTableId, "received", targetItem?.menuItemId ?? null);
    await refreshKitchenTicketsRef.current?.();
  };

  // Toggle single dish status: Received -> Cooking -> Prepared
  const handleToggleItemStatus = (tableId, item) => {
    if (isItemReceived(item)) {
      handleStartCooking(tableId, item.id);
    } else if (isItemCooking(item)) {
      handleCompletePreparation(tableId, item.id);
    } else {
      handleResetToReceived(tableId, item.id);
    }
  };

  // Selected table specific data when a single table is isolated
  const singleSelectedTable =
    selectedTableFilter !== "all"
      ? tables.find(
          (t) =>
            String(t.id) === String(selectedTableFilter) ||
            t.name === selectedTableFilter,
        ) ||
        allKitchenTickets.find(
          (t) =>
            String(t.id) === String(selectedTableFilter) ||
            t.name === selectedTableFilter,
        )
      : null;

  // Keep primary card text readable in both dark and light themes.
  const isLightTheme = currentTheme === "light-bistro";
  const cardPrimaryText = isLightTheme ? "#1f2937" : "#ffffff";

  return (
    <>
      <style>{`
        .kot-start-cooking-button {
          background: #f97316;
          color: #ffffff;
          font-weight: 600;
          font-size: 0.78rem;
          line-height: 1.2;
          box-shadow: 0 1px 4px rgba(194, 65, 12, 0.22);
          transition: background-color 0.15s ease, box-shadow 0.15s ease;
        }

        .kot-start-cooking-button:hover {
          background: #ea580c;
          color: #ffffff;
          box-shadow: 0 2px 6px rgba(194, 65, 12, 0.28);
        }

        .kot-start-cooking-button:active {
          background: #c2410c;
        }

        .kot-start-cooking-button:focus-visible {
          outline: 2px solid #ffffff;
          outline-offset: 2px;
        }

        .kot-start-cooking-button:disabled {
          background: #c2410c;
          color: #ffffff;
          cursor: not-allowed;
          opacity: 0.7;
        }

        .kot-start-cooking-button > *,
        .kot-start-cooking-button svg {
          color: #ffffff !important;
        }

        .kot-start-cooking-button svg {
          stroke: currentColor !important;
        }

        .kot-cards-grid {
          width: 100%;
        }

        .kot-order-card {
          width: 100%;
        }

        .kot-order-card--compact {
          box-sizing: border-box;
          min-height: 140px;
          padding: 0.7rem 0.8rem;
          display: grid;
          grid-template-rows: minmax(48px, auto) 20px 32px;
          gap: 0.55rem;
          align-content: start;
        }

        .kot-compact-header {
          display: grid;
          grid-template-columns: 56px minmax(0, 1fr) auto;
          align-items: center;
          column-gap: 0.6rem;
          min-width: 0;
        }

        .kot-compact-table-badge {
          display: grid;
          place-items: center;
          width: 56px;
          height: 42px;
          padding: 0 0.25rem;
          box-sizing: border-box;
          border-radius: 7px;
          font-size: 0.78rem;
          font-weight: 900;
          line-height: 1.1;
        }

        .kot-compact-table-badge small {
          font-size: 0.48rem;
          letter-spacing: 0.06em;
        }

        .kot-compact-copy {
          min-width: 0;
        }

        .kot-compact-title,
        .kot-compact-order-number {
          display: block;
          overflow: visible;
          text-overflow: unset;
          white-space: normal;
          overflow-wrap: anywhere;
        }

        .kot-compact-title {
          font-size: 0.86rem;
          line-height: 1.2;
        }

        .kot-compact-order-number {
          margin-top: 3px;
          color: var(--text-muted);
          font-size: 0.69rem;
          line-height: 1.15;
        }

        .kot-compact-status {
          display: inline-flex;
          align-items: center;
          justify-self: end;
          gap: 0.38rem;
          min-width: 0;
          white-space: nowrap;
          font-size: 0.72rem;
          font-weight: 750;
        }

        .kot-compact-status-dot {
          width: 8px;
          height: 8px;
          flex: 0 0 8px;
          border-radius: 50%;
          background: var(--kot-status-color);
          box-shadow: 0 0 0 3px color-mix(in srgb, var(--kot-status-color) 14%, transparent);
        }

        .kot-compact-meta {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          align-items: center;
          gap: 0.6rem;
          min-width: 0;
          color: var(--text-muted);
          font-size: 0.72rem;
          line-height: 1;
        }

        .kot-compact-meta > :last-child {
          justify-self: end;
          white-space: nowrap;
        }

        .kot-compact-view-button {
          justify-self: start;
          align-self: end;
          min-height: 32px;
          padding: 0.35rem 0.75rem;
          border: 1px solid var(--border-card);
          border-radius: 7px;
          background: var(--bg-tertiary);
          color: var(--text-main);
          font-size: 0.72rem;
          font-weight: 750;
          line-height: 1;
          white-space: nowrap;
          cursor: pointer;
        }

        @media (max-width: 1200px) {
          .kot-cards-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
          }
        }

        @media (max-width: 900px) {
          .kot-cards-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }
        }

        @media (max-width: 640px) {
          .kot-status-sticky {
            position: sticky;
            top: 0;
            z-index: 100;
            display: flex;
            align-items: center;
            gap: 0.5rem;
            width: 100%;
            max-width: 100%;
            min-width: 0;
            overflow-x: auto;
            overflow-y: hidden;
            flex-shrink: 0;
            background: var(--bg-primary);
            padding: 3px 0;
            -webkit-overflow-scrolling: touch;
            scrollbar-width: none;
          }

          .kot-status-sticky::-webkit-scrollbar {
            display: none;
          }

          .kot-status-filter {
            width: max-content !important;
            min-width: max-content !important;
            flex-shrink: 0 !important;
            flex-wrap: nowrap !important;
          }

          .kot-status-filter button {
            flex: 0 0 auto !important;
            white-space: nowrap !important;
          }

          .kot-cards-grid {
            grid-template-columns: minmax(0, 1fr) !important;
            gap: 0.75rem !important;
          }

          .kot-order-card {
            width: 100% !important;
          }

          .kot-order-card--compact {
            min-height: 140px;
            padding: 0.65rem 0.7rem;
            grid-template-rows: minmax(48px, auto) 20px 32px;
          }

          .kot-compact-header { grid-template-columns: 50px minmax(0, 1fr) auto; column-gap: 0.4rem; }
          .kot-compact-table-badge { width: 50px; }
          .kot-compact-status { gap: 0.3rem; font-size: 0.68rem; }
          .kot-compact-title { font-size: 0.81rem; }
          .kot-compact-order-number { font-size: 0.66rem; }
        }

        @media (max-width: 360px) {
          .kot-order-card--compact { min-height: 154px; grid-template-rows: minmax(60px, auto) 20px 32px; }
          .kot-compact-header { grid-template-columns: 44px minmax(0, 1fr); grid-template-rows: auto auto; column-gap: 0.4rem; row-gap: 0.25rem; }
          .kot-compact-table-badge { grid-row: 1 / span 2; width: 44px; }
          .kot-compact-status { grid-column: 2; grid-row: 2; justify-self: start; }
        }
      `}</style>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          height: "100vh",
          background: "var(--bg-primary)",
          backgroundImage:
            "radial-gradient(ellipse 90% 40% at 50% -10%, rgba(245, 158, 11, 0.08), transparent 75%)",
          overflow: "hidden",
        }}
      >
        {/* ================= 1. KOT TOP NAVIGATION & HEADER ================= */}
        <div
          style={{
            background: "var(--bg-secondary)",
            backdropFilter: "blur(12px)",
            position: "relative",
            zIndex: 20,
            borderBottom: "1.5px solid var(--border-subtle)",
            boxShadow: "var(--shadow-md)",
            padding: "0.85rem 1.5rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "1rem",
            flexShrink: 0,
          }}
        >
          {/* Left: Brand Title */}
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <div
              style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}
            >
              {restaurantLogo ? (
                <img
                  src={restaurantLogo}
                  alt={`${restaurantName || "Restaurant"} logo`}
                  style={{ width: 54, height: 54, objectFit: "contain", borderRadius: 10 }}
                />
              ) : (
              <div
                style={{
                  background: "linear-gradient(135deg, #f59e0b, #ea580c)",
                  color: "#ffffff",
                  padding: "8px",
                  borderRadius: "10px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 4px 14px rgba(245, 158, 11, 0.45)",
                }}
              >
                <ChefHat size={26} />
              </div>
              )}
              <div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.6rem",
                  }}
                >
                  <h1
                    style={{
                      fontSize: "1.3rem",
                      fontWeight: 900,
                      color: "var(--text-main)",
                      lineHeight: 1.1,
                      letterSpacing: "-0.02em",
                    }}
                  >
                    {restaurantName?.trim() || "Restaurant"}
                  </h1>
                  <span
                    style={{
                      background: "rgba(245, 158, 11, 0.18)",
                      color: "var(--accent-amber-light)",
                      border: "1.5px solid var(--accent-amber)",
                      fontSize: "0.7rem",
                      fontWeight: 900,
                      padding: "2px 9px",
                      borderRadius: "12px",
                      letterSpacing: "0.05em",
                      boxShadow: "0 0 10px rgba(245, 158, 11, 0.2)",
                    }}
                  >
                    KITCHEN DISPLAY SYSTEM (KDS)
                  </span>
                </div>
                <p
                  style={{
                    fontSize: "0.74rem",
                    color: "var(--text-muted)",
                    marginTop: "2px",
                  }}
                >
                  Live Kitchen Order Tickets • Table orders & preparation
                  completed queue
                </p>
              </div>
            </div>
          </div>

          {/* Right Controls: Date & Time, Theme Toggle, Profile Dropdown (Identical sequence to Admin & POS) */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.65rem",
              flexWrap: "nowrap",
              marginLeft: "auto",
            }}
          >
            {/* Live Kitchen Clock with Radiant Glow */}
            <div
              style={{
                height: "36px",
                boxSizing: "border-box",
                background: "var(--bg-tertiary)",
                border: "1.5px solid var(--accent-amber)",
                boxShadow: "0 0 12px var(--accent-amber-glow)",
                padding: "0 0.85rem",
                borderRadius: "9px",
                display: "flex",
                alignItems: "center",
                gap: "0.45rem",
                color: "var(--accent-amber-light)",
                fontWeight: 800,
                fontSize: "0.82rem",
                fontFamily: "monospace",
                whiteSpace: "nowrap",
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.35rem",
                  color: "var(--text-main)",
                }}
              >
                <Calendar size={14} color="var(--accent-amber)" />
                <span>
                  {currentTime.toLocaleDateString("en-IN", {
                    weekday: "short",
                    day: "2-digit",
                    month: "short",
                  })}
                </span>
              </div>
              <span style={{ color: "var(--border-subtle)", opacity: 0.6 }}>
                •
              </span>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.35rem",
                  color: "var(--accent-amber-light)",
                }}
              >
                <Clock
                  size={14}
                  color="var(--accent-amber)"
                  className="pulse-indicator"
                />
                <span>
                  {currentTime.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  })}
                </span>
              </div>
            </div>

            {/* Shared theme control */}
            {onChangeTheme && (<ThemeToggle currentTheme={currentTheme} onChangeTheme={onChangeTheme}/>
            )}

            {/* Profile Dropdown Pill with Details & Logout (Far Right Corner) */}
            <ProfileDropdown
              currentSession={currentSession}
              onLogout={onLogout}
              role="kot"
            />
          </div>
        </div>

        {/* ================= 2. KOT SUB-TOOLBAR (Search, Status Pills, Table Dropdown & Sort Order) ================= */}
        <div
          style={{
            background: "var(--bg-tertiary)",
            borderBottom: "1px solid var(--border-subtle)",
            padding: "0.55rem 1.5rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "0.75rem",
            flexShrink: 0,
          }}
        >
          {/* Search table or dish */}
          <div style={{ position: "relative", width: "230px", flexShrink: 0 }}>
            <Search
              size={15}
              color="var(--text-dim)"
              style={{ position: "absolute", left: "10px", top: "10px" }}
            />
            <input
              type="text"
              placeholder="Search table or dish..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: "100%",
                padding: "0.48rem 0.75rem 0.48rem 2rem",
                background: "var(--bg-secondary)",
                border: "1.5px solid var(--border-subtle)",
                borderRadius: "var(--radius-sm)",
                color: "var(--text-main)",
                fontSize: "0.82rem",
                fontWeight: 600,
                outline: "none",
              }}
            />
          </div>

          {/* Quick status filters with Crystal-Clear High-Contrast Number Badges */}
          <div className="kot-status-sticky">
            <div
              className="kot-status-filter"
              style={{
                display: "flex",
                background: "var(--bg-secondary)",
                padding: "3px",
                borderRadius: "var(--radius-sm)",
                border: "1.5px solid var(--border-subtle)",
                boxShadow: "0 2px 8px rgba(0,0,0,0.25)",
              }}
            >
              {[
                {
                  id: "all",
                  label: "All Orders",
                  count: totalOrdersCount,
                  dot: "#fbbf24",
                  badgeColor: "var(--accent-amber-light)",
                  badgeBg: "rgba(245, 158, 11, 0.25)",
                  badgeBorder: "rgba(245, 158, 11, 0.5)",
                },
                {
                  id: "pending",
                  label: "Received",
                  count: pendingOrdersCount,
                  dot: "#f59e0b",
                  badgeColor: "var(--accent-amber-light)",
                  badgeBg: "rgba(245, 158, 11, 0.25)",
                  badgeBorder: "rgba(245, 158, 11, 0.5)",
                },
                {
                  id: "cooking",
                  label: "Cooking",
                  count: cookingOrdersCount,
                  dot: "#ea580c",
                  badgeColor: "var(--accent-amber-light)",
                  badgeBg: "rgba(234, 88, 12, 0.25)",
                  badgeBorder: "rgba(234, 88, 12, 0.5)",
                },
                {
                  id: "completed",
                  label: "Completed",
                  count: completedOrdersCount,
                  dot: "#10b981",
                  badgeColor: "var(--success)",
                  badgeBg: "rgba(16, 185, 129, 0.25)",
                  badgeBorder: "rgba(16, 185, 129, 0.5)",
                },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setStatusFilter(tab.id)}
                  style={{
                    padding: "0.42rem 0.85rem",
                    borderRadius: "5px",
                    fontSize: "0.8rem",
                    fontWeight: statusFilter === tab.id ? 800 : 700,
                    background:
                      statusFilter === tab.id
                        ? "linear-gradient(135deg, #f59e0b, #ea580c)"
                        : "transparent",
                    color:
                      statusFilter === tab.id ? "#ffffff" : "var(--text-main)",
                    border: "none",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.45rem",
                    cursor: "pointer",
                    boxShadow:
                      statusFilter === tab.id
                        ? "0 2px 10px rgba(234, 88, 12, 0.35)"
                        : "none",
                    transition: "all 0.15s ease",
                  }}
                >
                  {tab.dot && (
                    <span
                      style={{
                        width: "7px",
                        height: "7px",
                        borderRadius: "50%",
                        background: tab.dot,
                        boxShadow: `0 0 6px ${tab.dot}`,
                      }}
                    />
                  )}
                  <span style={{ fontWeight: 800 }}>{tab.label}</span>
                  <span
                    style={{
                      background:
                        statusFilter === tab.id ? "#000000" : tab.badgeBg,
                      color:
                        statusFilter === tab.id ? "#fbbf24" : tab.badgeColor,
                      border:
                        statusFilter === tab.id
                          ? "1px solid rgba(0,0,0,0.5)"
                          : `1px solid ${tab.badgeBorder}`,
                      padding: "2px 7px",
                      borderRadius: "8px",
                      fontSize: "0.72rem",
                      fontWeight: 900,
                      minWidth: "20px",
                      textAlign: "center",
                    }}
                  >
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div
            ref={tableFilterRef}
            style={{ position: "relative", flexShrink: 0 }}
          >
            <button
              type="button"
              aria-haspopup="menu"
              aria-expanded={isTableFilterOpen}
              onClick={() => setIsTableFilterOpen((open) => !open)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.42rem 0.7rem",
                borderRadius: "var(--radius-sm)",
                background: "var(--bg-secondary)",
                border: "1.5px solid rgba(245, 158, 11, 0.45)",
                color: "var(--text-main)",
                fontSize: "0.8rem",
                fontWeight: 800,
                whiteSpace: "nowrap",
                cursor: "pointer",
              }}
              title="Filter orders by table"
            >
              <Filter size={15} color="var(--accent-amber)" />
              <span>
                {selectedTableFilter === "all"
                  ? "All Tables"
                  : singleSelectedTable?.name || "Selected Table"}
              </span>
              <ChevronDown size={14} color="var(--text-muted)" />
            </button>
            {isTableFilterOpen && (
              <div
                role="menu"
                style={{
                  position: "absolute",
                  top: "calc(100% + 6px)",
                  right: 0,
                  zIndex: 500,
                  width: "240px",
                  maxWidth: "calc(100vw - 32px)",
                  maxHeight: "min(60vh, 360px)",
                  overflowY: "auto",
                  padding: "5px",
                  borderRadius: "8px",
                  background: "var(--bg-secondary)",
                  border: "1px solid var(--border-subtle)",
                  boxShadow: "0 12px 30px rgba(0, 0, 0, 0.35)",
                }}
              >
                <button
                  type="button"
                  role="menuitemradio"
                  aria-checked={selectedTableFilter === "all"}
                  onClick={() => {
                    setSelectedTableFilter("all");
                    setIsTableFilterOpen(false);
                  }}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "0.55rem 0.65rem",
                    border: "none",
                    borderRadius: "5px",
                    background:
                      selectedTableFilter === "all"
                        ? "rgba(245, 158, 11, 0.18)"
                        : "transparent",
                    color: isLightTheme ? "#1f2937" : "var(--text-main)",
                    fontSize: "0.8rem",
                    fontWeight: 800,
                    fontFamily: "inherit",
                    textAlign: "left",
                    cursor: "pointer",
                  }}
                >
                  <span>All Tables</span>
                  <span
                    style={{
                      color: "var(--accent-amber-light)",
                      fontSize: "0.72rem",
                      fontWeight: 800,
                    }}
                  >
                    {allKitchenTickets.length}
                  </span>
                </button>
                {tables.map((table) => {
                  const matchingTickets = allKitchenTickets.filter(
                    (ticket) =>
                      String(ticket.id) === String(table.id) ||
                      ticket.name === table.name,
                  );
                  const itemCount = matchingTickets.reduce(
                    (total, ticket) => total + (ticket.items?.length || 0),
                    0,
                  );
                  const isSelected =
                    String(selectedTableFilter) === String(table.id) ||
                    selectedTableFilter === table.name;
                  const tableDot = matchingTickets.some(
                    (ticket) =>
                      !ticket.isPaid && Array.isArray(ticket?.items) && ticket.items.some(isItemCooking),
                  )
                    ? "#ea580c"
                    : matchingTickets.length > 0
                      ? "#f59e0b"
                      : "#64748b";

                  return (
                    <button
                      key={table.id}
                      type="button"
                      role="menuitemradio"
                      aria-checked={isSelected}
                      onClick={() => {
                        setSelectedTableFilter(table.id);
                        setIsTableFilterOpen(false);
                      }}
                      style={{
                        width: "100%",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.55rem",
                        padding: "0.55rem 0.65rem",
                        border: "none",
                        borderRadius: "5px",
                        background: isSelected
                          ? "rgba(245, 158, 11, 0.18)"
                          : "transparent",
                        color: isLightTheme ? "#1f2937" : "var(--text-main)",
                        fontSize: "0.8rem",
                        fontWeight: isSelected ? 800 : 700,
                        fontFamily: "inherit",
                        textAlign: "left",
                        cursor: "pointer",
                      }}
                    >
                      <span
                        style={{
                          width: "7px",
                          height: "7px",
                          flexShrink: 0,
                          borderRadius: "50%",
                          background: tableDot,
                        }}
                      />
                      <span style={{ flex: 1 }}>{table.name}</span>
                      {itemCount > 0 && (
                        <span
                          style={{
                            color: "var(--accent-amber-light)",
                            fontSize: "0.72rem",
                            fontWeight: 700,
                          }}
                        >
                          {itemCount} items
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Time-Wise Chronological Sorting Button */}
          <button
            onClick={() =>
              setSortOrder((prev) =>
                prev === "recent-first" ? "oldest-first" : "recent-first",
              )
            }
            title="Click to toggle sorting: Most Recent First vs Oldest First"
            style={{
              padding: "0.42rem 0.85rem",
              borderRadius: "var(--radius-sm)",
              fontSize: "0.8rem",
              fontWeight: 800,
              background:
                sortOrder === "recent-first"
                  ? "linear-gradient(135deg, rgba(245, 158, 11, 0.22), rgba(234, 88, 12, 0.16))"
                  : "var(--bg-secondary)",
              color: "var(--accent-amber-light)",
              border: "1.5px solid rgba(245, 158, 11, 0.45)",
              display: "flex",
              alignItems: "center",
              gap: "0.45rem",
              cursor: "pointer",
              boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
              transition: "all 0.15s ease",
              whiteSpace: "nowrap",
            }}
          >
            <Clock size={14} color="#fbbf24" />
            <span>
              {sortOrder === "recent-first"
                ? "🕒 Recent First"
                : "⏳ Oldest First"}
            </span>
            <ArrowUpDown size={13} style={{ opacity: 0.85 }} />
          </button>
        </div>

        {/* ================= 2. ACTIVE ISOLATION NOTIFICATION BANNER ================= */}
        {selectedTableFilter !== "all" && (
          <div
            style={{
              background: "rgba(245, 158, 11, 0.1)",
              borderBottom: "1px solid rgba(245, 158, 11, 0.25)",
              padding: "0.5rem 1.5rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              fontSize: "0.82rem",
              color: "var(--accent-amber-light)",
            }}
          >
            <div
              style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
            >
              <span style={{ fontWeight: 800 }}>📌 Filtering:</span>
              <span>
                Showing only order received for{" "}
                <strong>
                  {singleSelectedTable?.name || `Table ${selectedTableFilter}`}
                </strong>
              </span>
            </div>
            <button
              onClick={() => setSelectedTableFilter("all")}
              style={{
                background: "transparent",
                border: "none",
                color: "var(--text-main)",
                fontSize: "0.78rem",
                fontWeight: 700,
                textDecoration: "underline",
                cursor: "pointer",
              }}
            >
              Show All Tables
            </button>
          </div>
        )}

        {/* ================= 4. KOT ORDERS DISPLAY CARDS ================= */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "0.75rem 1rem",
            minHeight: 0,
          }}
        >
          {kitchenApiError && (
            <div
              role="alert"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "0.75rem",
                padding: "0.7rem 0.9rem",
                marginBottom: "0.75rem",
                border: "1px solid rgba(239, 68, 68, 0.35)",
                borderRadius: "8px",
                background: "rgba(239, 68, 68, 0.1)",
                color: "var(--text-main)",
                fontSize: "0.82rem",
              }}
            >
              <span>Kitchen data could not be refreshed: {kitchenApiError}</span>
              <button
                type="button"
                onClick={() => refreshKitchenTicketsRef.current?.()}
                style={{
                  flexShrink: 0,
                  padding: "0.35rem 0.65rem",
                  border: "1px solid var(--border-card)",
                  borderRadius: "6px",
                  background: "var(--bg-tertiary)",
                  color: "var(--text-main)",
                  cursor: "pointer",
                }}
              >
                Retry
              </button>
            </div>
          )}
          {isKitchenLoading && filteredTables.length === 0 ? (
            <div className="kot-cards-grid app-skeleton-kot-grid" role="status" aria-label="Loading Kitchen tickets">
              {Array.from({ length: selectedTableFilter !== "all" ? 1 : 4 }, (_, index) => <SkeletonOrderTicket key={index} />)}
            </div>
          ) : filteredTables.length === 0 ? (
            /* Empty State */
            <div
              style={{
                textAlign: "center",
                padding: "3rem 1.5rem",
                color: "var(--text-dim)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "1rem",
              }}
            >
              <div
                style={{
                  width: "60px",
                  height: "60px",
                  borderRadius: "50%",
                  background: "rgba(245, 158, 11, 0.12)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: "1px solid rgba(245, 158, 11, 0.25)",
                }}
              >
                <CheckCircle2 size={34} color="var(--status-vacant)" />
              </div>

              <div>
                <h3
                  style={{
                    fontSize: "1.2rem",
                    fontWeight: 800,
                    color: "var(--text-main)",
                  }}
                >
                  {kitchenApiError
                      ? "Kitchen tickets are unavailable"
                      : selectedTableFilter !== "all"
                    ? `No Orders Received for ${singleSelectedTable?.name || `Table ${selectedTableFilter}`} Yet!`
                    : "No Pending KOT Orders in Kitchen!"}
                </h3>
                <p
                  style={{
                    fontSize: "0.8rem",
                    color: "var(--text-muted)",
                    maxWidth: "420px",
                    marginTop: "0.35rem",
                  }}
                >
                  {kitchenApiError
                      ? "Reconnect to the Kitchen API and retry to load server-saved tickets."
                      : selectedTableFilter !== "all"
                    ? `Open ${singleSelectedTable?.name || `Table ${selectedTableFilter}`} on the dining floor to add biryanis and dishes, then click "Send KOT".`
                    : "All kitchen tickets are currently prepared or no tables have placed orders. Click any table button above to inspect."}
                </p>
              </div>

              <div
                style={{
                  display: "flex",
                  gap: "0.65rem",
                  marginTop: "0.35rem",
                }}
              >
                {selectedTableFilter !== "all" &&
                  singleSelectedTable &&
                  onOpenTableOrder && (
                    <button
                      onClick={() => onOpenTableOrder(singleSelectedTable.id)}
                      style={{
                        padding: "0.55rem 1.1rem",
                        borderRadius: "var(--radius-sm)",
                        background: "linear-gradient(135deg, #f59e0b, #ea580c)",
                        color: "#ffffff",
                        fontWeight: 800,
                        fontSize: "0.8rem",
                        border: "none",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.35rem",
                        cursor: "pointer",
                        boxShadow: "0 3px 12px rgba(245, 158, 11, 0.4)",
                      }}
                    >
                      <Utensils size={15} />
                      <span>Go to {singleSelectedTable.name} & Add Dishes</span>
                    </button>
                  )}

                {selectedTableFilter !== "all" && (
                  <button
                    onClick={() => setSelectedTableFilter("all")}
                    style={{
                      padding: "0.55rem 1rem",
                      borderRadius: "var(--radius-sm)",
                      background: "var(--bg-tertiary)",
                      color: "var(--text-main)",
                      fontWeight: 600,
                      fontSize: "0.8rem",
                      border: "1px solid var(--border-subtle)",
                      cursor: "pointer",
                    }}
                  >
                    View All Kitchen Orders
                  </button>
                )}
              </div>
            </div>
          ) : (
            /* Compact Cards Grid matching Image 2 UI */
            <div
              className="kot-cards-grid"
              style={{
                display: "grid",
                gridTemplateColumns:
                  selectedTableFilter !== "all"
                    ? "minmax(200px, 320px)"
                    : "repeat(auto-fill, minmax(260px, 1fr))",
                gap: "0.85rem",
                alignItems: "stretch",
                justifyContent:
                  selectedTableFilter !== "all" ? "center" : "stretch",
              }}
            >
              {filteredTables.map((tbl) => {
                const allServed =
                  tbl.isPaid ||
                  (tbl.items &&
                    tbl.items.length > 0 &&
                    tbl.items.every(isItemCompleted));
                const isCooking =
                  !tbl.isPaid && tbl.items && tbl.items.some(isItemCooking);
                const compactStatus = allServed || tbl.isPaid
                  ? { label: "Completed", color: "#22c55e" }
                  : isCooking
                    ? { label: "Preparing", color: "#f97316" }
                    : { label: "Received", color: "#ef4444" };
                const orderTimeLabel = formatDisplayTime(tbl.orderTime);

                return (
                  <article
                    key={tbl.uniqueKey || tbl.id}
                    className={`kot-order-card kot-order-card--compact${isCooking ? " kot-order-card--cooking" : ""}`}
                    style={{
                      background: isLightTheme ? "#ffffff" : "var(--bg-card, #131d31)",
                      color: cardPrimaryText,
                      border: `1px solid ${compactStatus.color}66`,
                      borderRadius: "var(--radius-md, 10px)",
                      boxShadow: isLightTheme ? "0 2px 8px rgba(15,23,42,.06)" : "0 4px 14px rgba(0,0,0,.16)",
                      "--kot-status-color": compactStatus.color,
                    }}
                  >
                    <div className="kot-compact-header">
                      <span className="kot-compact-table-badge" style={{ background: `${compactStatus.color}1c`, color: compactStatus.color }}>
                        <small>TABLE</small>
                        {formatCleanTableNum(tbl.name, tbl.id)}
                      </span>
                      <div className="kot-compact-copy">
                        <strong className="kot-compact-title">{formatCleanTableName(tbl.name, tbl.id)}</strong>
                        <span className="kot-compact-order-number">Order #{tbl.backendOrderId ?? tbl.id}</span>
                      </div>
                      <span className="kot-compact-status" style={{ color: "var(--text-main)" }}>
                        <span aria-hidden="true" className="kot-compact-status-dot" />
                        {compactStatus.label}
                      </span>
                    </div>
                    <div className="kot-compact-meta">
                      <span>{orderTimeLabel}</span>
                      <span>{Array.isArray(tbl.items) ? tbl.items.length : 0} {(tbl.items?.length ?? 0) === 1 ? "item" : "items"}</span>
                    </div>
                    <button
                      className="kot-compact-view-button"
                      type="button"
                      onClick={(event) => { event.stopPropagation(); setSelectedDetailTicket(tbl); }}
                    >
                      View Order
                    </button>
                  </article>
                );
              })}
            </div>
          )}
        </div>

        {/* ================= 5. PRINT KOT MODAL IF TRIGGERED ================= */}
        {activePrintTable && (
          <KOTModal
            table={activePrintTable}
            restaurantName={restaurantName}
            restaurantLogo={restaurantLogo}
            onClose={() => setActivePrintTable(null)}
          />
        )}

        {/* ================= 6. TICKET / ORDER DETAILS POPUP MODAL ================= */}
        {activeModalTicket &&
          (() => {
            const modalTicket = activeModalTicket;
            const allServed =
              modalTicket.isPaid ||
              (modalTicket.items &&
                modalTicket.items.length > 0 &&
                modalTicket.items.every(isItemCompleted));
            const isCooking =
              !modalTicket.isPaid &&
              modalTicket.items &&
              modalTicket.items.some(isItemCooking);
            const isReceived = !modalTicket.isPaid && !allServed && !isCooking;

            const elapsedSec = modalTicket.orderTime
              ? parseTimeToSeconds(modalTicket.orderTime)
              : 0;
            const elapsedFormatted = formatElapsedTimer(elapsedSec);
            const urgency = getTimerUrgencyColor(elapsedSec);

            let stoppedDuration = modalTicket.completedDuration;
            if (!stoppedDuration && modalTicket.completedAt) {
              stoppedDuration = formatElapsedTimer(
                parseTimeToSeconds(
                  modalTicket.orderTime,
                  modalTicket.completedAt,
                ),
              );
            }
            if (!stoppedDuration && completedTimers[modalTicket.id]) {
              stoppedDuration = completedTimers[modalTicket.id];
            }
            if (
              !stoppedDuration &&
              completedTimers[`table-${modalTicket.id}`]
            ) {
              stoppedDuration = completedTimers[`table-${modalTicket.id}`];
            }
            if (!stoppedDuration && completedTimers[modalTicket.uniqueKey]) {
              stoppedDuration = completedTimers[modalTicket.uniqueKey];
            }

            let cookingStartedDisplay = modalTicket.cookingStartedAt;
            if (!cookingStartedDisplay) {
              if (isCooking) {
                cookingStartedDisplay = modalTicket.orderTime || "Started";
              } else if (allServed || modalTicket.isPaid) {
                cookingStartedDisplay =
                  modalTicket.cookingStartedAt ||
                  modalTicket.orderTime ||
                  "Done";
              } else {
                cookingStartedDisplay = "In Queue";
              }
            }

            let completedTimeDisplay =
              modalTicket.completedAt || modalTicket.settledAt;
            if (!completedTimeDisplay && (allServed || modalTicket.isPaid)) {
              completedTimeDisplay = "Ready";
            }

            const modalPreparedCount = modalTicket.items
              ? modalTicket.items.filter(isItemCompleted).length
              : 0;
            const modalTotalCount = modalTicket.items
              ? modalTicket.items.length
              : 0;

            let statusBadgeText = "";
            let statusBadgeColor = "#fb923c";
            let statusBadgeBg = "rgba(234, 88, 12, 0.22)";
            let statusBadgeBorder = "rgba(234, 88, 12, 0.55)";

            if (modalTicket.isPaid) {
              statusBadgeText = "💰 COMPLETED (PAID)";
              statusBadgeColor = "var(--success)";
              statusBadgeBg = "rgba(16, 185, 129, 0.22)";
              statusBadgeBorder = "rgba(16, 185, 129, 0.55)";
            } else if (allServed) {
              statusBadgeText = "PREPARATION COMPLETED";
              statusBadgeColor = "var(--success)";
              statusBadgeBg = "rgba(16, 185, 129, 0.22)";
              statusBadgeBorder = "rgba(16, 185, 129, 0.55)";
            } else if (isCooking) {
              statusBadgeText =
                modalPreparedCount > 0
                  ? `COOKING (${modalPreparedCount}/${modalTotalCount} PREPARED)`
                  : "COOKING IN PROGRESS";
              statusBadgeColor = "#fb923c";
              statusBadgeBg = "rgba(234, 88, 12, 0.22)";
              statusBadgeBorder = "rgba(234, 88, 12, 0.55)";
            } else {
              statusBadgeText =
                modalPreparedCount > 0
                  ? `ORDER RECEIVED (${modalPreparedCount}/${modalTotalCount} PREPARED)`
                  : "ORDER RECEIVED";
            }

            return (
              <div
                onClick={() => {
                  if (!isCooking) setSelectedDetailTicket(null);
                }}
                style={{
                  position: "fixed",
                  inset: 0,
                  background: "var(--modal-overlay)",
                  backdropFilter: "blur(8px)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  zIndex: 105,
                  padding: "1rem",
                  animation: "fadeIn 0.15s ease",
                }}
              >
                <div
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    background: "var(--bg-secondary, #0e1726)",
                    border: "1.5px solid var(--accent-amber, #f59e0b)",
                    boxShadow:
                      "0 25px 60px rgba(0,0,0,0.7), 0 0 30px rgba(245, 158, 11, 0.2)",
                    borderRadius: "16px",
                    width: "100%",
                    maxWidth: "560px",
                    maxHeight: "90vh",
                    overflow: "hidden",
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  {/* Modal Header */}
                  <div
                    style={{
                      background: isLightTheme
                        ? "#f8fafc"
                        : "linear-gradient(135deg, var(--bg-tertiary) 0%, var(--bg-secondary) 100%)",
                      padding: "1rem 1.25rem",
                      borderBottom: isLightTheme
                        ? "1.5px solid #e2e8f0"
                        : "1.5px solid rgba(var(--surface-rgb),0.1)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "0.75rem",
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
                          background: "linear-gradient(135deg, #f59e0b, #ea580c)",
                          color: "#ffffff",
                          padding: "0.4rem 0.75rem",
                          borderRadius: "8px",
                          fontWeight: 900,
                          fontSize: "1.1rem",
                          textAlign: "center",
                          boxShadow: "0 3px 10px rgba(0,0,0,0.4)",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "center",
                          minWidth: "50px",
                        }}
                      >
                        <span
                          style={{
                            fontSize: "0.52rem",
                            letterSpacing: "0.08em",
                            textTransform: "uppercase",
                            opacity: 0.9,
                          }}
                        >
                          TABLE
                        </span>
                        <span>{modalTicket.name.replace(/Table\s*/i, "")}</span>
                      </div>

                      <div>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.5rem",
                            flexWrap: "wrap",
                          }}
                        >
                          <h2
                            style={{
                              fontSize: "1.25rem",
                              fontWeight: 900,
                              color: cardPrimaryText,
                              margin: 0,
                            }}
                          >
                            {modalTicket.name} Order Details
                          </h2>
                          <span
                            style={{
                              background: isLightTheme
                                ? modalTicket.isPaid || allServed
                                  ? "rgba(16, 185, 129, 0.12)"
                                  : "rgba(234, 88, 12, 0.12)"
                                : statusBadgeBg,
                              color: isLightTheme
                                ? modalTicket.isPaid || allServed
                                  ? "#047857"
                                  : "#c2410c"
                                : statusBadgeColor,
                              border: `1px solid ${isLightTheme ? (modalTicket.isPaid || allServed ? "rgba(5, 150, 105, 0.45)" : "rgba(194, 65, 12, 0.4)") : statusBadgeBorder}`,
                              padding: "2px 8px",
                              borderRadius: "10px",
                              fontSize: "0.68rem",
                              fontWeight: 900,
                            }}
                          >
                            {statusBadgeText}
                          </span>
                        </div>
                        <div
                          style={{
                            fontSize: "0.78rem",
                            color: "var(--text-muted, #94a3b8)",
                            marginTop: "3px",
                          }}
                        >
                          📍 {modalTicket.section} • 👤 Server:{" "}
                          <strong style={{ color: cardPrimaryText }}>
                            {modalTicket.server}
                          </strong>{" "}
                          • 👥 {modalTicket.capacity || 4} Guests
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => setSelectedDetailTicket(null)}
                      style={{
                        background: isLightTheme
                          ? "#ffffff"
                          : "rgba(var(--surface-rgb),0.08)",
                        border: isLightTheme
                          ? "1px solid #cbd5e1"
                          : "1px solid rgba(var(--surface-rgb),0.15)",
                        color: isLightTheme ? "var(--text-dim)" : "var(--text-muted)",
                        width: "32px",
                        height: "32px",
                        borderRadius: "8px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        flexShrink: 0,
                      }}
                      title="Close Details Modal"
                    >
                      <X size={18} />
                    </button>
                  </div>

                  {/* Modal Body */}
                  <div
                    style={{
                      padding: "1.25rem",
                      overflowY: "auto",
                      display: "flex",
                      flexDirection: "column",
                      gap: "1rem",
                      flex: 1,
                    }}
                  >
                    {/* 1. Lifecycle Timeline / Timestamps */}
                    <div>
                      <div
                        style={{
                          fontSize: "0.74rem",
                          fontWeight: 800,
                          color: "var(--text-muted, #94a3b8)",
                          textTransform: "uppercase",
                          letterSpacing: "0.06em",
                          marginBottom: "0.6rem",
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                        }}
                      >
                        <Clock size={13} />
                        <span>Order Lifecycle & Timestamps</span>
                      </div>
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                          gap: "0.75rem",
                        }}
                      >
                        {/* Received */}
                        <div
                          style={{
                            background: "rgba(245, 158, 11, 0.12)",
                            border: "1.5px solid rgba(245, 158, 11, 0.45)",
                            borderRadius: "10px",
                            padding: "0.75rem 0.5rem",
                            textAlign: "center",
                            minWidth: 0,
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: "4px",
                              color: isLightTheme ? "#92400e" : "var(--accent-amber-light)",
                              fontSize: "0.72rem",
                              fontWeight: 800,
                              letterSpacing: "0.04em",
                            }}
                          >
                            <Clock size={12} />
                            <span>RECEIVED</span>
                          </div>
                          <div
                            style={{
                              fontSize: "1rem",
                              fontWeight: 900,
                              color: cardPrimaryText,
                              fontFamily: "monospace",
                              marginTop: "4px",
                              marginBottom: "2px",
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {formatDisplayTime(modalTicket.orderTime)}
                          </div>
                          <div
                            style={{
                              fontSize: "0.68rem",
                              color: isLightTheme ? "#92400e" : "var(--accent-amber-light)",
                              fontWeight: 700,
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            Kitchen Queue
                          </div>
                        </div>

                        {/* Cooking */}
                        <div
                          style={{
                            background:
                              isCooking || allServed || modalTicket.isPaid
                                ? "rgba(255, 123, 0, 0.12)"
                                : "rgba(var(--surface-rgb),0.04)",
                            border:
                              isCooking || allServed || modalTicket.isPaid
                                ? "1.5px solid rgba(255, 123, 0, 0.45)"
                                : "1px solid rgba(var(--surface-rgb),0.12)",
                            borderRadius: "10px",
                            padding: "0.75rem 0.5rem",
                            textAlign: "center",
                            minWidth: 0,
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: "4px",
                              color:
                                isCooking || allServed || modalTicket.isPaid
                                ? isLightTheme
                                  ? "#c2410c"
                                  : "#fb923c"
                                : "var(--text-muted)",
                              fontSize: "0.72rem",
                              fontWeight: 800,
                              letterSpacing: "0.04em",
                            }}
                          >
                            <Flame size={12} />
                            <span>COOKING</span>
                          </div>
                          <div
                            style={{
                              fontSize: "1rem",
                              fontWeight: 900,
                              color:
                                isCooking ||
                                allServed ||
                                modalTicket.isPaid ||
                                modalTicket.cookingStartedAt
                                ? cardPrimaryText
                                : isLightTheme
                                  ? "#64748b"
                                  : "var(--text-dim)",
                              fontFamily: "monospace",
                              marginTop: "4px",
                              marginBottom: "2px",
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {formatDisplayTime(cookingStartedDisplay)}
                          </div>
                          <div
                            style={{
                              fontSize: "0.68rem",
                              color: isCooking
                                ? isLightTheme
                                  ? "#c2410c"
                                  : "#fb923c"
                                : isLightTheme
                                  ? "#64748b"
                                  : "var(--text-dim)",
                              fontWeight: 700,
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {isCooking
                              ? "Active Cooking"
                              : allServed || modalTicket.isPaid
                                ? "Cooked"
                                : "Waiting"}
                          </div>
                        </div>

                        {/* Completed */}
                        <div
                          style={{
                            background:
                              allServed || modalTicket.isPaid
                                ? "rgba(16, 185, 129, 0.14)"
                                : "rgba(var(--surface-rgb),0.04)",
                            border:
                              allServed || modalTicket.isPaid
                                ? "1.5px solid rgba(16, 185, 129, 0.5)"
                                : "1px solid rgba(var(--surface-rgb),0.12)",
                            borderRadius: "10px",
                            padding: "0.75rem 0.5rem",
                            textAlign: "center",
                            minWidth: 0,
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: "4px",
                              color:
                                allServed || modalTicket.isPaid
                                ? isLightTheme
                                  ? "#047857"
                                  : "#34d399"
                                : "var(--text-muted)",
                              fontSize: "0.72rem",
                              fontWeight: 800,
                              letterSpacing: "0.04em",
                            }}
                          >
                            <CheckCircle2 size={12} />
                            <span>COMPLETED</span>
                          </div>
                          <div
                            style={{
                              fontSize: "1rem",
                              fontWeight: 900,
                              color:
                                allServed || modalTicket.isPaid
                                ? isLightTheme
                                  ? "#047857"
                                  : "#34d399"
                                : isLightTheme
                                  ? "#64748b"
                                  : "var(--text-dim)",
                              fontFamily: "monospace",
                              marginTop: "4px",
                              marginBottom: "2px",
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {allServed || modalTicket.isPaid
                              ? formatDisplayTime(completedTimeDisplay)
                              : isCooking
                                ? modalPreparedCount > 0
                                  ? `Cooking (${modalPreparedCount}/${modalTotalCount})`
                                  : "Cooking"
                                : modalPreparedCount > 0
                                  ? `${modalPreparedCount}/${modalTotalCount} Ready`
                                  : "Pending"}
                          </div>
                          <div
                            style={{
                              fontSize: "0.68rem",
                              color: isLightTheme ? "#047857" : "var(--success)",
                              fontWeight: 800,
                              fontFamily: "monospace",
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {(allServed || modalTicket.isPaid) &&
                            stoppedDuration
                              ? `(${stoppedDuration})`
                              : !allServed &&
                                  !modalTicket.isPaid &&
                                  modalTicket.orderTime
                                ? `(${elapsedFormatted})`
                                : ""}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 2. Complete Ordered Dishes List */}
                    <div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          fontSize: "0.72rem",
                          fontWeight: 800,
                          color: "var(--text-muted, #94a3b8)",
                          textTransform: "uppercase",
                          letterSpacing: "0.06em",
                          marginBottom: "0.5rem",
                        }}
                      >
                        <span>
                          🍽️ Ordered Dishes ({modalTicket.items?.length || 0})
                        </span>
                        <span>Click status to update</span>
                      </div>

                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "0.5rem",
                        }}
                      >
                        {modalTicket.items &&
                          modalTicket.items.map((item, idx) => {
                            const itemReady = isItemCompleted(item);
                            const itemCooking = isItemCooking(item);

                            return (
                              <div
                                key={idx}
                                style={{
                                  background: itemReady
                                    ? "rgba(16, 185, 129, 0.12)"
                                    : itemCooking
                                      ? "rgba(255, 123, 0, 0.12)"
                                      : "rgba(var(--surface-rgb),0.04)",
                                  borderRadius: "8px",
                                  padding: "0.65rem 0.85rem",
                                  border: itemReady
                                    ? "1.5px solid rgba(16, 185, 129, 0.45)"
                                    : itemCooking
                                      ? "1.5px solid rgba(255, 123, 0, 0.45)"
                                      : "1px solid rgba(var(--surface-rgb),0.1)",
                                  animation: itemCooking
                                    ? "kot-cooking-pulse 1.8s ease-in-out infinite"
                                    : "none",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "space-between",
                                  gap: "0.75rem",
                                }}
                              >
                                <div
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "0.65rem",
                                    flex: 1,
                                    minWidth: 0,
                                  }}
                                >
                                  <span
                                    style={{
                                      background: itemReady
                                        ? "linear-gradient(135deg, #10b981, #059669)"
                                        : itemCooking
                                          ? "linear-gradient(135deg, #ff7b00, #ea580c)"
                                          : "linear-gradient(135deg, #f59e0b, #d97706)",
                                      color: "#ffffff",
                                      padding: "2px 7px",
                                      borderRadius: "6px",
                                      fontWeight: 900,
                                      fontSize: "0.85rem",
                                      minWidth: "28px",
                                      textAlign: "center",
                                    }}
                                  >
                                    {item.quantity}x
                                  </span>

                                  <div style={{ minWidth: 0 }}>
                                    <div
                                      style={{
                                        fontSize: "0.92rem",
                                        fontWeight: 800,
                                        color: cardPrimaryText,
                                        lineHeight: 1.25,
                                      }}
                                    >
                                      {item.name}
                                    </div>
                                    {item.notes && (
                                      <div
                                        style={{
                                          fontSize: "0.72rem",
                                          color: "var(--danger)",
                                          fontWeight: 700,
                                          marginTop: "2px",
                                          background: "rgba(239, 68, 68, 0.15)",
                                          padding: "2px 6px",
                                          borderRadius: "4px",
                                          display: "inline-flex",
                                          alignItems: "center",
                                          gap: "3px",
                                        }}
                                      >
                                        <span>⚠️</span>
                                        <strong>{item.notes}</strong>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                <div
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "0.6rem",
                                    flexShrink: 0,
                                  }}
                                >
                                  <button
                                    onClick={() =>
                                      handleToggleItemStatus(
                                        modalTicket.uniqueKey,
                                        item,
                                      )
                                    }
                                    style={{
                                      fontSize: "0.72rem",
                                      fontWeight: 800,
                                      padding: "4px 9px",
                                      borderRadius: "6px",
                                      textTransform: "uppercase",
                                      background: itemReady
                                        ? "rgba(16, 185, 129, 0.25)"
                                        : itemCooking
                                          ? "rgba(255, 123, 0, 0.25)"
                                          : "rgba(245, 158, 11, 0.25)",
                                      color: itemReady
                                        ? "#34d399"
                                        : itemCooking
                                          ? "#ff9248"
                                          : "#fbbf24",
                                      border: itemReady
                                        ? "1.5px solid #10b981"
                                        : itemCooking
                                          ? "1.5px solid #ff7b00"
                                          : "1.5px solid #f59e0b",
                                      cursor: "pointer",
                                      display: "flex",
                                      alignItems: "center",
                                      gap: "3px",
                                      whiteSpace: "nowrap",
                                    }}
                                    title="Click to advance status"
                                  >
                                    {itemReady
                                      ? "✓ Prepared"
                                      : itemCooking
                                        ? "🔥 Cooking"
                                        : "📥 Received"}
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    </div>

                    {/* 3. Settlement info if paid */}
                    {modalTicket.isPaid && (
                      <div
                        style={{
                          background: "rgba(16, 185, 129, 0.12)",
                          border: "1.5px solid rgba(16, 185, 129, 0.4)",
                          borderRadius: "8px",
                          padding: "0.75rem 1rem",
                          fontSize: "0.82rem",
                          color: cardPrimaryText,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                        }}
                      >
                        <div>
                          <div
                            style={{
                              fontWeight: 800,
                              color: isLightTheme ? "#047857" : "var(--success)",
                            }}
                          >
                            💰 Bill Paid & Settled
                          </div>
                          <div
                            style={{
                              fontSize: "0.72rem",
                              color:
                                currentTheme === "light-bistro"
                                  ? "#64748b"
                                  : "var(--text-dim)",
                              marginTop: "2px",
                            }}
                          >
                            Payment Method:{" "}
                            {(
                              modalTicket.paymentMethod || "cash"
                            ).toUpperCase()}{" "}
                            • Settled At: {modalTicket.settledAt}
                          </div>
                        </div>
                        {modalTicket.invoiceNo && (
                          <span
                            style={{
                              fontSize: "0.74rem",
                              fontWeight: 800,
                              color: "var(--accent-amber-light)",
                              background: "#000000",
                              padding: "3px 8px",
                              borderRadius: "6px",
                            }}
                          >
                            #{modalTicket.invoiceNo}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Modal Footer Controls */}
                  <div
                    style={{
                      background: isLightTheme ? "#f1f5f9" : "rgba(0,0,0,0.4)",
                      borderTop: isLightTheme
                        ? "1px solid #cbd5e1"
                        : "1px solid rgba(var(--surface-rgb),0.1)",
                      padding: "0.85rem 1.25rem",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "0.65rem",
                      flexWrap: "wrap",
                    }}
                  >
                    <button
                      onClick={() => {
                        setActivePrintTable(modalTicket);
                      }}
                      style={{
                        padding: "0.55rem 0.95rem",
                        borderRadius: "var(--radius-sm)",
                        background: isLightTheme
                          ? "#ffffff"
                          : "rgba(var(--surface-rgb),0.08)",
                        border: isLightTheme
                          ? "1px solid #cbd5e1"
                          : "1px solid rgba(var(--surface-rgb),0.18)",
                        color: isLightTheme ? "#1f2937" : "#ffffff",
                        fontWeight: 700,
                        fontSize: "0.8rem",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.4rem",
                        cursor: "pointer",
                      }}
                    >
                      <Printer size={15} />
                      <span>Print KOT Slip</span>
                    </button>

                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                      }}
                    >
                      {!modalTicket.isPaid && isReceived && (
                        <button
                          onClick={() => handleStartCooking(modalTicket.uniqueKey)}
                          style={{
                            padding: "0.55rem 1.1rem",
                            borderRadius: "var(--radius-sm)",
                            background: "linear-gradient(135deg, #f59e0b, #ea580c)",
                            color: "#ffffff",
                            fontWeight: 800,
                            fontSize: "0.82rem",
                            border: "none",
                            display: "flex",
                            alignItems: "center",
                            gap: "0.4rem",
                            cursor: "pointer",
                            boxShadow: "0 3px 12px rgba(245, 158, 11, 0.4)",
                          }}
                        >
                          <Flame size={15} />
                          <span>
                            {modalPreparedCount > 0
                              ? `Start Cooking Remaining (${modalTotalCount - modalPreparedCount})`
                              : "Start Cooking"}
                          </span>
                        </button>
                      )}

                      {!modalTicket.isPaid && isCooking && (
                        <button
                          onClick={() =>
                            handleCompletePreparation(modalTicket.uniqueKey)
                          }
                          style={{
                            padding: "0.55rem 1.1rem",
                            borderRadius: "var(--radius-sm)",
                            background: "linear-gradient(135deg, #10b981, #059669)",
                            color: "#ffffff",
                            fontWeight: 800,
                            fontSize: "0.82rem",
                            border: "none",
                            display: "flex",
                            alignItems: "center",
                            gap: "0.4rem",
                            cursor: "pointer",
                            boxShadow: "0 3px 12px rgba(16, 185, 129, 0.4)",
                          }}
                        >
                          <CheckCircle2 size={15} />
                          <span>
                            {modalPreparedCount > 0
                              ? `Mark Remaining Prepared (${modalTotalCount - modalPreparedCount})`
                              : "Mark All Prepared"}
                          </span>
                        </button>
                      )}

                      <button
                        onClick={() => setSelectedDetailTicket(null)}
                        style={{
                          padding: "0.55rem 1rem",
                          borderRadius: "var(--radius-sm)",
                          background: "var(--bg-tertiary, #1e293b)",
                          color: "var(--text-main, #ffffff)",
                          fontWeight: 700,
                          fontSize: "0.8rem",
                          border: "1px solid var(--border-subtle, var(--neutral-border))",
                          cursor: "pointer",
                        }}
                      >
                        Close
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
      </div>
    </>
  );
}
