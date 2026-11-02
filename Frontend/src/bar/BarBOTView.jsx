import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  Filter,
  ChevronDown,
  ChevronRight,
  Wine,
  Martini,
  Clock,
  Check,
  CheckCircle2,
  ExternalLink,
  Minimize2,
  X,
  RefreshCw,
  Printer,
  Sparkles,
} from "lucide-react";
import {
  apiGetBarBotTickets,
  apiGetBarBotSummary,
  apiGetBarBotFilterOptions,
  apiUpdateBarBotItemStatus,
  apiMarkAllBarBotReady,
  apiMarkAllBarBotTableReady,
  apiGetBarDrinks,
} from "../api/barApi";
import { apiGetActiveKitchenTickets, apiUpdateKitchenItemStatus } from "../api/kitchenApi";
import {
  createMenuItemLookup,
  findMenuItem,
  isBeverageCategory,
  isDrinkItem,
} from "../kot/orderRouting";

function safeText(value) {
  return String(value ?? "").replace(
    /[&<>"']/g,
    (char) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[char]
  );
}

function timeLabel(value) {
  if (!value) return "Just Now";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? String(value)
    : date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true });
}

export function BarBOTView({
  menuItems = [],
  tables = [],
  staffList = [],
  barDrinks = [],
  onItemsUpdated,
  onUpdateItemKotStatus,
  onCompleteTableKot,
}) {
  const [adminBotTableFilter, setAdminBotTableFilter] = useState("all");
  const [isBotTableDropdownOpen, setIsBotTableDropdownOpen] = useState(false);
  const [botTableStatusFilter, setBotTableStatusFilter] = useState("all");
  const [selectedBotModalTable, setSelectedBotModalTable] = useState(null);
  const [isFullScreen, setIsFullScreen] = useState(false);

  // Live backend tickets & summary cache
  const [backendTickets, setBackendTickets] = useState([]);
  const [botSummary, setBotSummary] = useState(null);
  const [botFilterOptions, setBotFilterOptions] = useState(null);
  const [liveBarDrinks, setLiveBarDrinks] = useState(barDrinks || []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const inFlightRef = useRef(false);

  // Local overrides for optimistic status updates
  const [localItemStatusMap, setLocalItemStatusMap] = useState({});

  // Menu item lookup
  const menuLookup = useMemo(() => createMenuItemLookup(menuItems), [menuItems]);

  // Load bar drinks dynamically if not passed
  useEffect(() => {
    if (barDrinks && barDrinks.length > 0) {
      setLiveBarDrinks(barDrinks);
      return;
    }
    let isMounted = true;
    apiGetBarDrinks()
      .then((res) => {
        if (!isMounted) return;
        const fetched = res?.data || res?.drinks;
        if (Array.isArray(fetched) && fetched.length > 0) {
          setLiveBarDrinks(fetched);
        }
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, [barDrinks]);

  // Fetch dynamic filter options from backend
  useEffect(() => {
    let isMounted = true;
    apiGetBarBotFilterOptions()
      .then((res) => {
        if (!isMounted) return;
        if (res?.success && res.data) {
          setBotFilterOptions(res.data);
        }
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, []);

  // Poll active backend tickets & summary
  const fetchTickets = useCallback(async () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    try {
      // 1. Try dedicated Bar BOT endpoint first
      const botRes = await apiGetBarBotTickets();
      if (botRes?.success && (Array.isArray(botRes.data) || Array.isArray(botRes.tickets))) {
        const rows = botRes.data || botRes.tickets;
        setBackendTickets(rows);
        setError("");
      } else {
        // 2. Fallback to active kitchen tickets
        const res = await apiGetActiveKitchenTickets();
        if (res?.success && Array.isArray(res.data)) {
          setBackendTickets(res.data);
          setError("");
        }
      }

      // Fetch live KPI summary metrics
      try {
        const summaryRes = await apiGetBarBotSummary();
        if (summaryRes?.success && summaryRes.data) {
          setBotSummary(summaryRes.data);
        }
      } catch {}
    } catch (err) {
      // Backend error - non blocking
    } finally {
      inFlightRef.current = false;
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTickets();
    const interval = setInterval(fetchTickets, 5000);
    return () => clearInterval(interval);
  }, [fetchTickets]);

  // Reconcile tables with drink orders (from tables prop + live backend tickets)
  const tablesWithDrinks = useMemo(() => {
    const tableMap = new Map();

    // 1. Process tables passed via props
    (Array.isArray(tables) ? tables : []).forEach((tbl) => {
      const tId = String(tbl.backendTableId ?? tbl.tableId ?? tbl.id);
      const allItems = Array.isArray(tbl.items) ? tbl.items : [];
      const drinkItems = allItems
        .filter(
          (item) =>
            item &&
            item.status !== "cancelled" &&
            item.kotStatus !== "cancelled" &&
            isDrinkItem(item, menuLookup, liveBarDrinks)
        )
        .map((item) => {
          const key = `${tId}-${item.id || item.menuItemId || item.name}`;
          const override = localItemStatusMap[key];
          return override ? { ...item, kotStatus: override } : item;
        });

      tableMap.set(tId, {
        ...tbl,
        tId,
        drinkItems,
      });
    });

    // 2. Process backend tickets to catch any drink items
    backendTickets.forEach((ticket) => {
      const tId = String(ticket.tableId ?? ticket.TableId ?? "");
      if (!tId) return;

      const rawItems = Array.isArray(ticket.items)
        ? ticket.items
        : Array.isArray(ticket.drinks)
        ? ticket.drinks
        : [];

      const ticketDrinkItems = rawItems
        .filter(
          (i) =>
            i &&
            i.kotStatus !== "cancelled" &&
            i.status !== "cancelled" &&
            isDrinkItem(i, menuLookup, liveBarDrinks)
        )
        .map((i) => {
          const key = `${tId}-${i.orderItemId || i.id || i.menuItemId || i.name || i.dishName}`;
          const override = localItemStatusMap[key];
          return {
            id: i.orderItemId || i.id,
            orderItemId: i.orderItemId || i.id,
            menuItemId: i.menuItemId,
            name: i.dishName || i.name || i.drinkName || "Drink",
            dishName: i.dishName || i.name || i.drinkName || "Drink",
            quantity: i.quantity || 1,
            notes: i.specialNotes || i.preparationNotes || i.notes || "",
            kotStatus: override || i.status || i.kotStatus || "received",
            orderId: ticket.orderId || ticket.ticketId,
            orderTime: ticket.orderTime || ticket.createdAt,
            servingMeasure: i.servingMeasure,
            isBarDrink: true,
          };
        });

      if (ticketDrinkItems.length === 0) return;

      if (tableMap.has(tId)) {
        const existing = tableMap.get(tId);
        const existingIds = new Set(
          existing.drinkItems.map((i) => String(i.id || i.menuItemId || i.name))
        );
        const merged = [...existing.drinkItems];
        ticketDrinkItems.forEach((ti) => {
          const key = String(ti.id || ti.menuItemId || ti.name);
          if (!existingIds.has(key)) {
            merged.push(ti);
            existingIds.add(key);
          }
        });
        existing.drinkItems = merged;
        if (!existing.orderTime && (ticket.orderTime || ticket.createdAt)) {
          existing.orderTime = timeLabel(ticket.orderTime || ticket.createdAt);
        }
      } else {
        tableMap.set(tId, {
          id: tId,
          name: ticket.tableName || ticket.tableNumber || `Table ${tId}`,
          section: ticket.area || ticket.section || "Bar Lounge",
          server: ticket.serverName || "Bartender",
          status: "occupied",
          orderTime: timeLabel(ticket.orderTime || ticket.createdAt),
          drinkItems: ticketDrinkItems,
        });
      }
    });

    return Array.from(tableMap.values());
  }, [tables, backendTickets, menuLookup, liveBarDrinks, localItemStatusMap]);

  // Active tables that have at least 1 drink item
  const activeBotTables = useMemo(() => {
    return tablesWithDrinks.filter((t) => t.drinkItems && t.drinkItems.length > 0);
  }, [tablesWithDrinks]);

  // Tables to display based on the active table filter
  const botDisplayTables = useMemo(() => {
    return tablesWithDrinks.filter((t) => {
      if (adminBotTableFilter !== "all") {
        return (
          String(t.id) === String(adminBotTableFilter) ||
          String(t.name).toLowerCase() === String(adminBotTableFilter).toLowerCase()
        );
      }
      return t.drinkItems && t.drinkItems.length > 0;
    });
  }, [tablesWithDrinks, adminBotTableFilter]);

  // Active modal table reference
  const activeBotModalTable = useMemo(() => {
    if (!selectedBotModalTable) return null;
    return (
      tablesWithDrinks.find(
        (t) => String(t.id) === String(selectedBotModalTable.id)
      ) || selectedBotModalTable
    );
  }, [selectedBotModalTable, tablesWithDrinks]);

  // Update item status handler (optimistic local + backend API)
  const handleUpdateDrinkStatus = async (tableId, item, nextStatus) => {
    const itemId = item.orderItemId || item.id || item.menuItemId;
    const key = `${tableId}-${itemId || item.name}`;

    // 1. Optimistic local update
    setLocalItemStatusMap((prev) => ({
      ...prev,
      [key]: nextStatus,
    }));

    // 2. Persist to backend
    if (itemId && Number(itemId) > 0) {
      try {
        const res = await apiUpdateBarBotItemStatus(itemId, nextStatus);
        if (!res?.success) {
          await apiUpdateKitchenItemStatus(itemId, nextStatus);
        }
      } catch {
        try {
          await apiUpdateKitchenItemStatus(itemId, nextStatus);
        } catch (err) {
          console.warn("[BarBOTView] Update status fallback:", err?.message);
        }
      }
    }

    // 3. Inform parent callbacks if present
    if (typeof onUpdateItemKotStatus === "function") {
      try {
        onUpdateItemKotStatus(tableId, nextStatus, itemId);
      } catch {}
      try {
        onUpdateItemKotStatus(tableId, itemId, nextStatus);
      } catch {}
    }

    if (typeof onItemsUpdated === "function") {
      try {
        onItemsUpdated({
          tableId,
          orderId: item.orderId,
          items: [item],
          status: nextStatus,
        });
      } catch {}
    }

    setTimeout(fetchTickets, 500);
  };

  // Complete / ready all drinks for a table
  const handleCompleteTableDrinks = async (table) => {
    const items = table.drinkItems || [];
    const updates = {};
    items.forEach((item) => {
      const itemId = item.orderItemId || item.id || item.menuItemId;
      const key = `${table.id}-${itemId || item.name}`;
      updates[key] = "ready";
    });
    setLocalItemStatusMap((prev) => ({ ...prev, ...updates }));

    // Try atomic table endpoint first
    try {
      await apiMarkAllBarBotTableReady(table.id);
    } catch {
      // Fallback per-item update
      for (const item of items) {
        const itemId = item.orderItemId || item.id || item.menuItemId;
        if (itemId && Number(itemId) > 0) {
          try {
            await apiUpdateBarBotItemStatus(itemId, "ready");
          } catch {
            try {
              await apiUpdateKitchenItemStatus(itemId, "ready");
            } catch {}
          }
        }
      }
    }

    if (typeof onCompleteTableKot === "function") {
      try {
        onCompleteTableKot(table.id);
      } catch {}
    }

    if (typeof onItemsUpdated === "function") {
      try {
        onItemsUpdated({
          tableId: table.id,
          orderId: items[0]?.orderId,
          items,
          status: "ready",
        });
      } catch {}
    }

    setSelectedBotModalTable(null);
    setTimeout(fetchTickets, 500);
  };

  // Print BOT ticket
  const handlePrintBotTicket = (tbl) => {
    const popup = window.open("", "_blank", "width=460,height=650");
    if (!popup) return;
    const itemsHtml = (tbl.drinkItems || [])
      .map(
        (i) =>
          `<li><b>${safeText(i.quantity || 1)}x</b> ${safeText(i.name || i.dishName)}${
            i.servingMeasure ? ` <small>(${safeText(i.servingMeasure)})</small>` : ""
          }${i.notes ? ` <small style="color: #64748b;">[${safeText(i.notes)}]</small>` : ""}</li>`
      )
      .join("");

    popup.document.write(`
      <html>
        <head>
          <title>Bar BOT · ${safeText(tbl.name)}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 24px; color: #1e293b; }
            h2 { margin: 0 0 6px; font-size: 1.25rem; }
            p { margin: 2px 0; font-size: 0.85rem; color: #64748b; }
            hr { border: none; border-top: 1px dashed #cbd5e1; margin: 12px 0; }
            ul { list-style: none; padding: 0; margin: 12px 0; }
            li { padding: 6px 0; border-bottom: 1px solid #f1f5f9; font-size: 0.95rem; }
          </style>
        </head>
        <body>
          <h2>Telugu Taste · Bar BOT</h2>
          <p>${safeText(tbl.name)} · ${safeText(tbl.section || "Bar Lounge")}</p>
          <p>Server: ${safeText(tbl.server || "Bartender")} · Ordered: ${safeText(tbl.orderTime || "Just Now")}</p>
          <hr />
          <ul>${itemsHtml}</ul>
          <hr />
          <p style="font-size: 0.75rem; text-align: center; color: #94a3b8;">Bar Order Ticket Dispatch</p>
          <script>window.onload = () => window.print();</script>
        </body>
      </html>
    `);
    popup.document.close();
  };

  return (
    <div
      style={
        isFullScreen
          ? {
              position: "fixed",
              inset: 0,
              background: "var(--bg-primary, #0f172a)",
              zIndex: 99999,
              padding: "1.5rem",
              overflowY: "auto",
            }
          : {}
      }
    >
      {/* 1. Header Row (Matching Dine KOT Dispatch) */}
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
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <h3
              style={{
                fontSize: "1.15rem",
                fontWeight: 800,
                color: "var(--text-main)",
                margin: 0,
              }}
            >
              Bar Order Tickets (BOT) Dispatch
            </h3>
            <span
              style={{
                background: "rgba(245, 158, 11, 0.2)",
                color: "var(--accent-amber-light, #fbbf24)",
                border: "1px solid rgba(245, 158, 11, 0.4)",
                fontSize: "0.7rem",
                fontWeight: 800,
                padding: "2px 8px",
                borderRadius: "12px",
                letterSpacing: "0.03em",
              }}
            >
              ADMIN MONITOR
            </span>
            {botSummary && botSummary.ActiveTicketsCount > 0 && (
              <span
                style={{
                  background: "rgba(16, 185, 129, 0.15)",
                  color: "#10b981",
                  border: "1px solid rgba(16, 185, 129, 0.35)",
                  fontSize: "0.7rem",
                  fontWeight: 800,
                  padding: "2px 8px",
                  borderRadius: "12px",
                }}
              >
                {botSummary.ActiveTicketsCount} LIVE
              </span>
            )}
          </div>
          <p
            style={{
              fontSize: "0.76rem",
              color: "var(--text-muted)",
              margin: "4px 0 0",
            }}
          >
            Select any table number to inspect drink orders received from table and preparation completed status
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <button
            type="button"
            onClick={() => setIsFullScreen((prev) => !prev)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
              padding: "0.55rem 1rem",
              borderRadius: "var(--radius-sm, 8px)",
              background: "linear-gradient(135deg, #f59e0b, #ea580c)",
              color: "#ffffff",
              fontWeight: 800,
              fontSize: "0.82rem",
              border: "none",
              cursor: "pointer",
              boxShadow: "0 2px 10px rgba(245, 158, 11, 0.35)",
            }}
          >
            {isFullScreen ? <Minimize2 size={15} /> : <ExternalLink size={15} />}
            <span>{isFullScreen ? "Close Full Screen" : "Open Full Screen BOT Screen"}</span>
          </button>
        </div>
      </div>

      {/* 2. Table Filter Bar with Dropdown (Exact Match to Dine KOT) */}
      <div
        style={{
          background: "var(--bg-primary, #0b1120)",
          padding: "0.65rem 1rem",
          borderRadius: "var(--radius-md, 10px)",
          border: "1px solid var(--border-subtle, rgba(255, 255, 255, 0.1))",
          marginBottom: "1.25rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          position: "relative",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.35rem",
              fontSize: "0.76rem",
              fontWeight: 800,
              color: "var(--accent-amber-light, #fbbf24)",
            }}
          >
            <Filter size={14} />
            <span>TABLE FILTER:</span>
          </div>

          {adminBotTableFilter !== "all" ? (
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
                color: "var(--accent-amber-light, #fbbf24)",
              }}
            >
              <span>
                {tables.find(
                  (t) =>
                    String(t.id) === String(adminBotTableFilter) ||
                    t.name === adminBotTableFilter
                )?.name || `Table ${adminBotTableFilter}`}
              </span>
              <button
                type="button"
                onClick={() => setAdminBotTableFilter("all")}
                title="Show all tables"
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--accent-amber-light, #fbbf24)",
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
              All Active Tables ({activeBotTables.length})
            </span>
          )}
        </div>

        {/* Dropdown Container */}
        <div style={{ position: "relative" }}>
          <button
            type="button"
            onClick={() => setIsBotTableDropdownOpen((prev) => !prev)}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem",
              minWidth: "132px",
              padding: "0.5rem 0.8rem",
              borderRadius: "8px",
              background: isBotTableDropdownOpen
                ? "var(--accent-amber, #f59e0b)"
                : "var(--bg-tertiary, #1e293b)",
              color: isBotTableDropdownOpen ? "#000000" : "var(--text-main)",
              border: isBotTableDropdownOpen
                ? "1px solid var(--accent-amber, #f59e0b)"
                : "1px solid var(--border-subtle, rgba(255, 255, 255, 0.1))",
              fontSize: "0.8rem",
              fontWeight: 800,
              cursor: "pointer",
              boxShadow: isBotTableDropdownOpen
                ? "0 4px 12px rgba(245, 158, 11, 0.25)"
                : "none",
            }}
          >
            <Filter
              size={15}
              color={
                isBotTableDropdownOpen
                  ? "#000000"
                  : "var(--accent-amber, #f59e0b)"
              }
            />
            <span>
              {adminBotTableFilter === "all"
                ? "All Tables"
                : tables.find(
                    (t) =>
                      String(t.id) === String(adminBotTableFilter) ||
                      t.name === adminBotTableFilter
                  )?.name || "All Tables"}
            </span>
            <ChevronDown
              size={15}
              style={{
                transform: isBotTableDropdownOpen
                  ? "rotate(180deg)"
                  : "rotate(0deg)",
                transition: "transform 160ms ease",
              }}
            />
          </button>

          {isBotTableDropdownOpen && (
            <>
              {/* Backdrop */}
              <div
                onClick={() => setIsBotTableDropdownOpen(false)}
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
                  background: "var(--bg-secondary, #131d31)",
                  border: "1px solid var(--border-subtle, rgba(255, 255, 255, 0.1))",
                  borderRadius: "10px",
                  boxShadow: "0 14px 32px rgba(0,0,0,0.45)",
                  zIndex: 100,
                  overflow: "hidden",
                }}
              >
                {/* Status Filter Header */}
                <div
                  style={{
                    padding: "0.5rem 0.65rem 0.45rem",
                    borderBottom: "1px solid var(--border-subtle, rgba(255, 255, 255, 0.1))",
                    flexShrink: 0,
                  }}
                >
                  <div
                    style={{
                      color: "var(--text-dim, #94a3b8)",
                      fontSize: "0.68rem",
                      fontWeight: 800,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      marginBottom: "0.45rem",
                    }}
                  >
                    FILTER BY STATUS
                  </div>

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
                          (t) => (t.status || "vacant").toLowerCase() === "vacant"
                        ).length,
                        dot: "var(--status-vacant, #10b981)",
                      },
                      {
                        id: "occupied",
                        label: "Occupied",
                        count: tables.filter(
                          (t) => (t.status || "").toLowerCase() === "occupied"
                        ).length,
                        dot: "var(--status-occupied, #f59e0b)",
                      },
                      {
                        id: "billed",
                        label: "Billed",
                        count: tables.filter(
                          (t) => (t.status || "").toLowerCase() === "billed"
                        ).length,
                        dot: "var(--status-billed, #a855f7)",
                      },
                    ].map((sf) => {
                      const isActive = botTableStatusFilter === sf.id;
                      return (
                        <button
                          key={sf.id}
                          type="button"
                          onClick={() => setBotTableStatusFilter(sf.id)}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                            padding: "0.25rem 0.55rem",
                            borderRadius: "6px",
                            fontSize: "0.7rem",
                            fontWeight: isActive ? 800 : 600,
                            background: isActive
                              ? "rgba(245, 158, 11, 0.2)"
                              : "var(--bg-tertiary, #1e293b)",
                            color: isActive
                              ? "var(--accent-amber-light, #fbbf24)"
                              : "var(--text-muted, #94a3b8)",
                            border: isActive
                              ? "1px solid var(--accent-amber, #f59e0b)"
                              : "1px solid var(--border-subtle, rgba(255, 255, 255, 0.1))",
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
                          <span style={{ opacity: 0.7 }}>({sf.count})</span>
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
                      setAdminBotTableFilter("all");
                      setIsBotTableDropdownOpen(false);
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
                        adminBotTableFilter === "all"
                          ? "rgba(245, 158, 11, 0.14)"
                          : "transparent",
                      color: "var(--text-main)",
                      border:
                        adminBotTableFilter === "all"
                          ? "1px solid rgba(245, 158, 11, 0.5)"
                          : "1px solid transparent",
                      cursor: "pointer",
                      textAlign: "left",
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
                          background: "var(--accent-amber, #f59e0b)",
                          flexShrink: 0,
                        }}
                      />
                      <span
                        style={{
                          fontWeight: adminBotTableFilter === "all" ? 800 : 650,
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
                          adminBotTableFilter === "all"
                            ? "var(--accent-amber-light, #fbbf24)"
                            : "var(--text-dim, #94a3b8)",
                      }}
                    >
                      {adminBotTableFilter === "all"
                        ? "CURRENT"
                        : `${activeBotTables.length} ACTIVE`}
                    </span>
                  </button>

                  {tables
                    .filter((t) => {
                      const status = (t.status || "vacant").toLowerCase();
                      return (
                        botTableStatusFilter === "all" ||
                        status === botTableStatusFilter
                      );
                    })
                    .map((t) => {
                      const isCurrent =
                        String(adminBotTableFilter) === String(t.id) ||
                        adminBotTableFilter === t.name;
                      const status = (t.status || "vacant").toLowerCase();
                      let statusDot = "var(--status-vacant, #10b981)";
                      if (status === "occupied")
                        statusDot = "var(--status-occupied, #f59e0b)";
                      if (status === "billed")
                        statusDot = "var(--status-billed, #a855f7)";

                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => {
                            setAdminBotTableFilter(t.id);
                            setIsBotTableDropdownOpen(false);
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
                              ? "rgba(245, 158, 11, 0.14)"
                              : "transparent",
                            color: "var(--text-main)",
                            border: isCurrent
                              ? "1px solid rgba(245, 158, 11, 0.5)"
                              : "1px solid transparent",
                            cursor: "pointer",
                            textAlign: "left",
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
                                ? "var(--accent-amber-light, #fbbf24)"
                                : status === "occupied"
                                ? "var(--status-occupied, #f59e0b)"
                                : status === "billed"
                                ? "var(--status-billed, #a855f7)"
                                : "var(--text-dim, #94a3b8)",
                            }}
                          >
                            {isCurrent ? "CURRENT" : t.status || "VACANT"}
                          </span>
                        </button>
                      );
                    })}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* 3. Empty State if no active tables */}
      {botDisplayTables.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "3.5rem 1rem",
            color: "var(--text-dim, #94a3b8)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "0.75rem",
          }}
        >
          <Martini size={38} color="var(--accent-amber, #f59e0b)" />
          <h4
            style={{
              fontSize: "1.1rem",
              fontWeight: 700,
              color: "var(--text-main)",
              margin: 0,
            }}
          >
            {adminBotTableFilter !== "all"
              ? `No Active Drink Orders for Table ${adminBotTableFilter}`
              : "No Active Bar Tickets"}
          </h4>
          <p
            style={{
              fontSize: "0.82rem",
              color: "var(--text-muted)",
              margin: 0,
            }}
          >
            Drink orders dispatched from bar or dining tables will appear here live.
          </p>
        </div>
      ) : (
        /* 4. Cards Grid (Exact Match to Dine KOT glowing border cards) */
        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              adminBotTableFilter !== "all"
                ? "minmax(200px, 320px)"
                : "repeat(auto-fill, minmax(170px, 1fr))",
            gap: "0.85rem",
            justifyContent: adminBotTableFilter !== "all" ? "center" : "stretch",
            alignItems: "stretch",
          }}
        >
          {botDisplayTables.map((tbl) => {
            const activeItems = tbl.drinkItems || [];
            const totalDrinksCount = activeItems.reduce(
              (sum, i) => sum + (Number(i.quantity) || 1),
              0
            );

            const allCompleted =
              activeItems.length > 0 &&
              activeItems.every(
                (i) =>
                  i.kotStatus === "served" ||
                  i.kotStatus === "ready" ||
                  i.kotStatus === "completed"
              );

            const isPreparing = activeItems.some(
              (i) =>
                i.kotStatus === "cooking" ||
                i.kotStatus === "preparing" ||
                i.kotStatus === "in prep"
            );

            const cardBorderColor = allCompleted
              ? "#10b981"
              : isPreparing
              ? "#ea580c"
              : "rgba(245, 158, 11, 0.7)";

            const cardShadow = allCompleted
              ? "0 4px 16px rgba(16, 185, 129, 0.2)"
              : isPreparing
              ? "0 4px 16px rgba(234, 88, 12, 0.2)"
              : "0 4px 14px rgba(245, 158, 11, 0.16)";

            const statusDot = allCompleted
              ? "var(--status-vacant, #10b981)"
              : isPreparing
              ? "var(--accent-saffron, #ea580c)"
              : "var(--status-occupied, #f59e0b)";

            const statusBadge = allCompleted
              ? {
                  text: "🔔 Ready to Serve",
                  color: "#10b981",
                  bg: "rgba(16, 185, 129, 0.15)",
                  border: "rgba(16, 185, 129, 0.3)",
                }
              : isPreparing
              ? {
                  text: "🔥 In Preparation",
                  color: "#ea580c",
                  bg: "rgba(234, 88, 12, 0.15)",
                  border: "rgba(234, 88, 12, 0.3)",
                }
              : {
                  text: "🍸 Order Received",
                  color: "#f59e0b",
                  bg: "rgba(245, 158, 11, 0.15)",
                  border: "rgba(245, 158, 11, 0.3)",
                };

            const firstItem = activeItems[0];
            const moreCount = activeItems.length - 1;

            const tableNum = tbl.name
              ? tbl.name.replace(/^(?:table|t)\s*[-–—]?\s*/i, "")
              : tbl.id;
            const tableNameDisplay = tbl.name
              ? tbl.name.trim().match(/^(?:table|t)\s*[-–—]?\s*\d+$/i)
                ? `Table ${tableNum}`
                : tbl.name
              : `Table ${tbl.id}`;

            return (
              <div
                key={tbl.id}
                onClick={() => setSelectedBotModalTable(tbl)}
                title="Click to view ordered drinks and prepare actions"
                style={{
                  background: "var(--bg-secondary, #131d31)",
                  borderRadius: "var(--radius-md, 10px)",
                  border: `1.5px solid ${cardBorderColor}`,
                  padding: "0.75rem 0.85rem",
                  position: "relative",
                  cursor: "pointer",
                  transition: "all 0.18s ease",
                  boxShadow: cardShadow,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  gap: "0.45rem",
                  minHeight: "220px",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow =
                    "0 6px 18px rgba(0,0,0,0.35)";
                  e.currentTarget.style.borderColor = "var(--accent-amber, #f59e0b)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = cardShadow;
                  e.currentTarget.style.borderColor = cardBorderColor;
                }}
              >
                <div>
                  {/* Row 1: T{num} badge + Table Name + Status Dot */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "0.3rem",
                      marginBottom: "0.25rem",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.35rem",
                        minWidth: 0,
                        flex: 1,
                      }}
                    >
                      <span
                        style={{
                          background: allCompleted
                            ? "var(--status-vacant, #10b981)"
                            : "linear-gradient(135deg, #f59e0b, #ea580c)",
                          color: "#ffffff",
                          fontWeight: 900,
                          fontSize: "0.74rem",
                          padding: "2px 6px",
                          borderRadius: "4px",
                          letterSpacing: "0.03em",
                          flexShrink: 0,
                        }}
                      >
                        T{tableNum}
                      </span>
                      <h3
                        style={{
                          fontSize: "0.98rem",
                          fontWeight: 900,
                          color: "var(--text-main)",
                          margin: 0,
                          lineHeight: 1.1,
                          letterSpacing: "-0.02em",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {tableNameDisplay}
                      </h3>
                    </div>
                    <span
                      style={{
                        width: "9px",
                        height: "9px",
                        borderRadius: "50%",
                        background: statusDot,
                        boxShadow: `0 0 6px ${statusDot}`,
                        display: "inline-block",
                        flexShrink: 0,
                      }}
                    />
                  </div>

                  {/* Row 2: Section & Server */}
                  <div
                    style={{
                      fontSize: "0.68rem",
                      color: "var(--text-dim, #94a3b8)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "0.4rem",
                      paddingBottom: "0.35rem",
                      borderBottom: "1px solid var(--border-subtle, rgba(255, 255, 255, 0.1))",
                      marginBottom: "0.35rem",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    <span
                      style={{
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {tbl.section || "Bar Lounge"}
                    </span>
                    <span style={{ flexShrink: 0 }}>
                      Server: {tbl.server || "Bartender"}
                    </span>
                  </div>

                  {/* Row 3: Status Badge Pill with Order Time */}
                  <div
                    style={{
                      padding: "0.28rem 0.5rem",
                      borderRadius: "6px",
                      background: statusBadge.bg,
                      border: `1px solid ${statusBadge.border}`,
                      color: statusBadge.color,
                      fontSize: "0.68rem",
                      fontWeight: 800,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: "0.4rem",
                    }}
                  >
                    <span>{statusBadge.text}</span>
                    <span
                      style={{
                        fontSize: "0.66rem",
                        opacity: 0.85,
                        fontWeight: 700,
                      }}
                    >
                      {tbl.orderTime || "Just Now"}
                    </span>
                  </div>

                  {/* Row 4: Items Preview Box */}
                  <div
                    style={{
                      background: "var(--bg-primary, #0b1120)",
                      border: "1px solid var(--border-subtle, rgba(255, 255, 255, 0.1))",
                      borderRadius: "6px",
                      padding: "0.45rem 0.6rem",
                      fontSize: "0.72rem",
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.2rem",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        fontWeight: 800,
                        color: "var(--accent-amber-light, #fbbf24)",
                        fontSize: "0.74rem",
                      }}
                    >
                      <span>Items ({totalDrinksCount}):</span>
                      <span
                        style={{
                          fontSize: "0.68rem",
                          color: "var(--text-muted)",
                        }}
                      >
                        {activeItems.length}{" "}
                        {activeItems.length === 1 ? "drink" : "drinks"}
                      </span>
                    </div>

                    {firstItem ? (
                      <>
                        <div
                          style={{
                            color: "var(--text-main)",
                            fontWeight: 600,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {firstItem.quantity || 1}x{" "}
                          {firstItem.name || firstItem.dishName}
                        </div>
                        {moreCount > 0 ? (
                          <div
                            style={{
                              color: "var(--text-dim, #94a3b8)",
                              fontSize: "0.68rem",
                              fontStyle: "italic",
                            }}
                          >
                            + {moreCount} more{" "}
                            {moreCount === 1 ? "drink" : "drinks"}...
                          </div>
                        ) : null}
                      </>
                    ) : (
                      <div
                        style={{
                          color: "var(--text-muted)",
                          fontSize: "0.7rem",
                        }}
                      >
                        No active drinks
                      </div>
                    )}
                  </div>
                </div>

                {/* Row 5: Action Button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedBotModalTable(tbl);
                  }}
                  style={{
                    width: "100%",
                    padding: "0.45rem 0.6rem",
                    borderRadius: "6px",
                    background: allCompleted
                      ? "rgba(16, 185, 129, 0.15)"
                      : "linear-gradient(135deg, rgba(245, 158, 11, 0.2), rgba(234, 88, 12, 0.2))",
                    border: allCompleted
                      ? "1px solid rgba(16, 185, 129, 0.4)"
                      : "1px solid rgba(245, 158, 11, 0.4)",
                    color: allCompleted
                      ? "#10b981"
                      : "var(--accent-amber-light, #fbbf24)",
                    fontWeight: 800,
                    fontSize: "0.74rem",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "0.35rem",
                    transition: "all 0.15s ease",
                    marginTop: "0.3rem",
                  }}
                >
                  <Martini size={13} />
                  <span>View Drinks / Prepare</span>
                  <ChevronRight size={13} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* ================= 5. POPUP MODAL: DRINKS TO PREPARE ================= */}
      {activeBotModalTable && (
        <div
          onClick={() => setSelectedBotModalTable(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "var(--modal-overlay, rgba(0,0,0,0.75))",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "1rem",
            animation: "fadeIn 0.15s ease",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "var(--bg-secondary, #131d31)",
              border: "1.5px solid var(--accent-amber, #f59e0b)",
              boxShadow:
                "0 25px 60px rgba(0,0,0,0.85), 0 0 30px rgba(245, 158, 11, 0.25)",
              borderRadius: "14px",
              width: "100%",
              maxWidth: "520px",
              maxHeight: "90vh",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: "0.85rem 1.15rem",
                background: "var(--bg-primary, #0b1120)",
                borderBottom: "1px solid var(--border-subtle, rgba(255, 255, 255, 0.1))",
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
                  gap: "0.6rem",
                }}
              >
                <div
                  style={{
                    background: "linear-gradient(135deg, #f59e0b, #ea580c)",
                    color: "#ffffff",
                    padding: "0.3rem 0.65rem",
                    borderRadius: "7px",
                    fontWeight: 900,
                    fontSize: "0.95rem",
                  }}
                >
                  T
                  {activeBotModalTable.name
                    ? activeBotModalTable.name.replace(
                        /^(?:table|t)\s*[-–—]?\s*/i,
                        ""
                      )
                    : activeBotModalTable.id}
                </div>
                <div>
                  <h3
                    style={{
                      fontSize: "1.1rem",
                      fontWeight: 900,
                      color: "var(--text-main)",
                      margin: 0,
                      lineHeight: 1.2,
                    }}
                  >
                    {activeBotModalTable.name} — Drink Orders & Bar Preparation
                  </h3>
                  <div
                    style={{
                      fontSize: "0.74rem",
                      color: "var(--text-muted)",
                      marginTop: "2px",
                    }}
                  >
                    {activeBotModalTable.section || "Bar Lounge"} • Server:{" "}
                    <strong style={{ color: "var(--text-main)" }}>
                      {activeBotModalTable.server || "Bartender"}
                    </strong>{" "}
                    • Ordered: {activeBotModalTable.orderTime || "Just Now"}
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <button
                  type="button"
                  onClick={() => handlePrintBotTicket(activeBotModalTable)}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "var(--text-muted)",
                    cursor: "pointer",
                    padding: "4px",
                    borderRadius: "6px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                  title="Print Bar BOT Slip"
                >
                  <Printer size={18} />
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedBotModalTable(null)}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "var(--text-muted)",
                    cursor: "pointer",
                    padding: "4px",
                    borderRadius: "6px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                  title="Close"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Modal Body: Ordered Drinks List */}
            <div
              style={{
                padding: "1rem 1.15rem",
                display: "flex",
                flexDirection: "column",
                gap: "0.6rem",
                overflowY: "auto",
                flex: 1,
                maxHeight: "55vh",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  fontSize: "0.75rem",
                  fontWeight: 800,
                  color: "var(--text-dim, #94a3b8)",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  marginBottom: "0.2rem",
                }}
              >
                <span>
                  Ordered Drinks & Beverages (
                  {activeBotModalTable.drinkItems?.length || 0})
                </span>
                <span>Status</span>
              </div>

              {activeBotModalTable.drinkItems &&
              activeBotModalTable.drinkItems.length > 0 ? (
                activeBotModalTable.drinkItems.map((item, idx) => {
                  const isReady =
                    item.kotStatus === "ready" ||
                    item.kotStatus === "served" ||
                    item.kotStatus === "completed";
                  const isPreparing =
                    item.kotStatus === "cooking" ||
                    item.kotStatus === "preparing" ||
                    item.kotStatus === "in prep";

                  return (
                    <div
                      key={idx}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "0.6rem 0.8rem",
                        borderRadius: "8px",
                        background: "var(--bg-primary, #0b1120)",
                        border: isReady
                          ? "1px solid rgba(16, 185, 129, 0.4)"
                          : isPreparing
                          ? "1px solid rgba(234, 88, 12, 0.4)"
                          : "1px solid var(--border-subtle, rgba(255, 255, 255, 0.1))",
                        gap: "0.75rem",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.65rem",
                          minWidth: 0,
                          flex: 1,
                        }}
                      >
                        <span
                          style={{
                            background: "rgba(245, 158, 11, 0.16)",
                            border: "1px solid rgba(245, 158, 11, 0.4)",
                            color: "var(--accent-amber-light, #fbbf24)",
                            padding: "3px 8px",
                            borderRadius: "6px",
                            fontWeight: 800,
                            fontSize: "0.82rem",
                            flexShrink: 0,
                          }}
                        >
                          {item.quantity || 1}x
                        </span>

                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div
                            style={{
                              fontSize: "0.92rem",
                              fontWeight: 700,
                              color: "var(--text-main)",
                              textTransform: "capitalize",
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                            title={item.name || item.dishName}
                          >
                            {item.name || item.dishName}
                          </div>

                          {(item.servingMeasure ||
                            item.servingSize ||
                            item.notes) && (
                            <div
                              style={{
                                fontSize: "0.72rem",
                                color: "var(--text-muted)",
                                marginTop: "2px",
                              }}
                            >
                              {item.servingMeasure || item.servingSize
                                ? `Serving: ${item.servingMeasure || item.servingSize}`
                                : ""}
                              {item.notes ? ` · Note: ${item.notes}` : ""}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Interactive Status Toggle Button */}
                      <button
                        type="button"
                        onClick={() => {
                          const nextStatus = isReady ? "cooking" : "ready";
                          handleUpdateDrinkStatus(
                            activeBotModalTable.id,
                            item,
                            nextStatus
                          );
                        }}
                        title="Click to toggle drink status"
                        style={{
                          fontSize: "0.7rem",
                          fontWeight: 800,
                          letterSpacing: "0.04em",
                          textTransform: "uppercase",
                          padding: "4px 10px",
                          borderRadius: "6px",
                          flexShrink: 0,
                          whiteSpace: "nowrap",
                          cursor: "pointer",
                          background: isReady
                            ? "rgba(16, 185, 129, 0.18)"
                            : isPreparing
                            ? "rgba(234, 88, 12, 0.18)"
                            : "rgba(245, 158, 11, 0.18)",
                          border: isReady
                            ? "1px solid rgba(16, 185, 129, 0.4)"
                            : isPreparing
                            ? "1px solid rgba(234, 88, 12, 0.4)"
                            : "1px solid rgba(245, 158, 11, 0.4)",
                          color: isReady
                            ? "#10b981"
                            : isPreparing
                            ? "#ea580c"
                            : "#f59e0b",
                          transition: "all 0.15s ease",
                        }}
                      >
                        {isReady
                          ? "✓ READY"
                          : isPreparing
                          ? "🔥 PREPARING"
                          : "🍸 RECEIVED"}
                      </button>
                    </div>
                  );
                })
              ) : (
                <p
                  style={{
                    fontSize: "0.82rem",
                    color: "var(--text-muted)",
                    textAlign: "center",
                    margin: "2rem auto",
                  }}
                >
                  No beverage items currently ordered for this table.
                </p>
              )}
            </div>

            {/* Modal Footer */}
            <div
              style={{
                padding: "0.85rem 1.15rem",
                background: "var(--bg-primary, #0b1120)",
                borderTop: "1px solid var(--border-subtle, rgba(255, 255, 255, 0.1))",
                display: "flex",
                gap: "0.6rem",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <button
                type="button"
                onClick={() => setSelectedBotModalTable(null)}
                style={{
                  padding: "0.55rem 1rem",
                  borderRadius: "7px",
                  background: "var(--bg-tertiary, #1e293b)",
                  border: "1px solid var(--border-subtle, rgba(255, 255, 255, 0.1))",
                  color: "var(--text-main)",
                  fontWeight: 700,
                  fontSize: "0.82rem",
                  cursor: "pointer",
                }}
              >
                Close
              </button>

              {activeBotModalTable.drinkItems &&
                activeBotModalTable.drinkItems.length > 0 && (
                  <button
                    type="button"
                    onClick={() => handleCompleteTableDrinks(activeBotModalTable)}
                    style={{
                      flex: 1,
                      padding: "0.55rem 1rem",
                      borderRadius: "7px",
                      background: "linear-gradient(135deg, #10b981, #059669)",
                      border: "none",
                      color: "#ffffff",
                      fontWeight: 800,
                      fontSize: "0.82rem",
                      cursor: "pointer",
                      boxShadow: "0 2px 8px rgba(16, 185, 129, 0.35)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "0.4rem",
                    }}
                  >
                    <CheckCircle2 size={15} />
                    <span>Mark All Ready / Served</span>
                  </button>
                )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Export both BarBOTView and BarKOTView aliases for seamless backwards-compatibility
export { BarBOTView as BarKOTView };
export default BarBOTView;
