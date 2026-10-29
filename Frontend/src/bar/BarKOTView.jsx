import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, Eye, Maximize2, Minimize2, Printer, RefreshCw, Search } from "lucide-react";
import { apiGetActiveKitchenTickets, apiUpdateKitchenItemStatus } from "../api/kitchenApi";
import { createMenuItemLookup, findMenuItem, isBeverageCategory } from "../kot/orderRouting";
import { SkeletonOrderTicket } from "../common/Skeletons";

function statusOf(item) {
  const status = String(item?.itemStatus ?? item?.kotStatus ?? "PENDING").trim().toLowerCase();
  if (["served", "completed"].includes(status)) return "Served";
  if (["ready", "preparation completed"].includes(status)) return "Ready";
  if (["in prep", "in preparation", "preparing", "cooking"].includes(status)) return "Preparing";
  if (["cancelled", "canceled"].includes(status)) return "Cancelled";
  return "Received";
}

function ticketStatus(items) {
  if (items.length && items.every((item) => statusOf(item) === "Served")) return "Served";
  if (items.length && items.every((item) => ["Ready", "Served"].includes(statusOf(item)))) return "Ready";
  if (items.some((item) => statusOf(item) === "Preparing")) return "Preparing";
  if (items.every((item) => statusOf(item) === "Cancelled")) return "Cancelled";
  return "Received";
}

function timeLabel(value) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function safeText(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
}

export function BarKOTView({ menuItems = [], tables = [], staffList = [], onItemsUpdated }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [tableFilter, setTableFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [expanded, setExpanded] = useState("");
  const [busyOrders, setBusyOrders] = useState(() => new Set());
  const [fullScreen, setFullScreen] = useState(false);
  const inFlight = useRef(false);
  const busyOrdersRef = useRef(new Set());
  const refreshRef = useRef(null);

  const refresh = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      const result = await apiGetActiveKitchenTickets();
      const rows = result?.success && Array.isArray(result.data) ? result.data : null;
      if (!rows) {
        setError(result?.error || "The KOT API returned an unexpected response.");
        return;
      }
      setOrders(rows);
      setError("");
    } catch (requestError) {
      setError(requestError?.message || "Could not load persisted Bar KOTs.");
    } finally {
      inFlight.current = false;
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshRef.current = refresh;
    refresh();
    const timer = window.setInterval(refresh, 7000);
    return () => {
      window.clearInterval(timer);
      refreshRef.current = null;
    };
  }, [refresh]);

  const menuById = useMemo(() => createMenuItemLookup(menuItems), [menuItems]);
  const barTickets = useMemo(() => orders.map((order) => {
    const items = (Array.isArray(order.items) ? order.items : []).filter((item) => {
      const menuItem = findMenuItem(menuById, item);
      return isBeverageCategory(menuItem?.category ?? menuItem?.categoryName ?? item.category);
    }).map((item) => ({ ...item, menu: findMenuItem(menuById, item) }));
    if (!items.length) return null;
    const orderId = order.orderId ?? order.ticketId ?? order.id;
    const tableId = order.tableId ?? order.TableId;
    const sharedTable = tables.find((table) => String(table.backendTableId ?? table.tableId ?? table.id) === String(tableId));
    const assignedStaff = staffList.find((person) => String(person.staffId ?? person.id) === String(sharedTable?.assignedServerId ?? sharedTable?.serverId ?? sharedTable?.staffId));
    const batch = Number(order.kotBatch) || 1;
    return {
      id: `${orderId}-${batch}`, orderId, tableId,
      tableName: order.tableName || order.tableNumber || sharedTable?.name || (tableId ? `Table ${tableId}` : "Takeaway"),
      section: order.sectionArea || order.section || sharedTable?.sectionArea || "",
      server: assignedStaff?.fullName || assignedStaff?.name || order.serverName || sharedTable?.assignedServerName || "—",
      batch,
      time: order.orderTime || order.orderReceivedAt || order.orderReceivedFormatted || order.createdAt,
      status: /cancel/i.test(String(order.ticketStatus || order.orderStatus || "")) ? "Cancelled" : ticketStatus(items), items,
    };
  }).filter(Boolean), [orders, menuById, tables, staffList]);

  const displayed = useMemo(() => barTickets.filter((ticket) => {
    const matchesTable = tableFilter === "all" || String(ticket.tableId) === String(tableFilter);
    const matchesStatus = statusFilter === "all" || ticket.status.toLowerCase() === statusFilter;
    const text = `${ticket.orderId} ${ticket.tableName} ${ticket.server} ${ticket.items.map((item) => item.dishName || item.name).join(" ")}`.toLowerCase();
    return matchesTable && matchesStatus && (!query.trim() || text.includes(query.trim().toLowerCase()));
  }), [barTickets, tableFilter, statusFilter, query]);

  const updateItems = async (ticket, itemRows, nextStatus) => {
    if (!itemRows.length || busyOrdersRef.current.has(ticket.id)) return;
    busyOrdersRef.current.add(ticket.id);
    setBusyOrders((previous) => new Set(previous).add(ticket.id));
    try {
    const results = await Promise.all(itemRows.map((item) => apiUpdateKitchenItemStatus(item.id ?? item.orderItemId, nextStatus)));
      const failed = results.find((result) => !result?.success);
      if (failed) setError(failed.error || `Could not update order ${ticket.orderId}.`);
      else {
        setError("");
        onItemsUpdated?.({ tableId: ticket.tableId, orderId: ticket.orderId, items: itemRows, status: nextStatus });
      }
      await refreshRef.current?.();
    } catch (requestError) {
      setError(requestError?.message || `Could not update order ${ticket.orderId}.`);
    } finally {
      busyOrdersRef.current.delete(ticket.id);
      setBusyOrders((previous) => { const next = new Set(previous); next.delete(ticket.id); return next; });
    }
  };

  const printTicket = (ticket) => {
    const popup = window.open("", "_blank", "width=460,height=650");
    if (!popup) { setError("Allow pop-ups to print the Bar BOT slip."); return; }
    const rows = ticket.items.map((item) => {
      const drinkName = item.dishName || item.name || "Beverage";
      const serving = item.menu?.servingSize ?? item.menu?.portionSize ?? item.servingSize;
      return `<li>${safeText(item.quantity)} × ${safeText(drinkName)}${serving ? ` · ${safeText(serving)}${typeof serving === "number" ? " ml" : ""}` : ""}${item.notes ? `<br><small>${safeText(item.notes)}</small>` : ""}</li>`;
    }).join("");
    popup.document.write(`<html><head><title>Bar BOT ${safeText(ticket.orderId)}</title><style>body{font:14px Arial,sans-serif;padding:24px;color:#172033}h2{margin:0 0 8px}li{margin:9px 0}</style></head><body><h2>Telugu Taste · Bar BOT</h2><p>Order #${safeText(ticket.orderId)} · Batch ${safeText(ticket.batch)} · ${safeText(ticket.tableName)}<br>Received ${safeText(timeLabel(ticket.time))} · ${safeText(ticket.server)}</p><ul>${rows}</ul><p>Status: ${safeText(ticket.status)}</p><script>window.onload=()=>window.print()</script></body></html>`);
    popup.document.close();
  };

  const pendingCount = barTickets.filter((ticket) => ["Received", "Preparing"].includes(ticket.status)).length;
  const modeClass = fullScreen ? "bar-kot-page bar-kot-fullscreen" : "bar-kot-page";

  return <section className={modeClass} aria-label="Bar Order Tickets (BOT)">
    <header className="bar-kot-heading">
      <div><span className="bar-kicker">TELUGU TASTE · BAR OPERATIONS</span><h2>Bar Order Tickets (BOT)</h2><p>Persisted beverage items from the shared BOT service.</p></div>
      <div className="bar-kot-head-actions"><span className="bar-kot-monitor">ADMIN MONITOR · {pendingCount} ACTIVE</span><button className="bar-button secondary" type="button" onClick={() => setFullScreen((value) => !value)}>{fullScreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}{fullScreen ? "Close Full Screen" : "Open Full Screen BOT Screen"}</button></div>
    </header>
    <div className="bar-kot-toolbar">
      <label className="bar-kot-search"><Search size={15} /><input aria-label="Search Bar tickets" placeholder="Search table or drink…" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
      <label className="bar-kot-filter"><span>Table</span><select value={tableFilter} onChange={(event) => setTableFilter(event.target.value)}><option value="all">All Tables</option>{tables.map((table) => <option key={table.id} value={String(table.backendTableId ?? table.tableId ?? table.id)}>{table.name || table.tableName || table.tableNumber || `Table ${table.id}`}</option>)}</select></label>
      <label className="bar-kot-filter"><span>Status</span><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="all">All statuses</option><option value="received">Received</option><option value="preparing">Preparing</option><option value="ready">Ready</option><option value="served">Served</option></select></label>
      <span className="bar-kot-count">{displayed.length} {displayed.length === 1 ? "ticket" : "tickets"}</span>
      <button className="bar-button secondary" type="button" onClick={() => refreshRef.current?.()} disabled={loading}><RefreshCw size={15} className={loading ? "bar-kot-spinning" : ""} /> Refresh</button>
    </div>
    {error && <div className="bar-kot-error" role="alert"><span>{error}</span><button className="bar-button secondary small" type="button" onClick={() => refreshRef.current?.()}>Retry</button></div>}
    {loading ? <div className="app-skeleton-kot-grid" role="status" aria-label="Loading Bar tickets">{Array.from({ length: 3 }, (_, index) => <SkeletonOrderTicket key={index} />)}</div>
      : menuItems.length === 0 ? <div className="bar-kot-empty" role="status">Menu categories are unavailable, so beverage tickets cannot be identified safely.</div>
        : displayed.length === 0 ? <div className="bar-kot-empty"><Check size={22} />{error ? "Bar tickets are unavailable." : "No persisted beverage tickets match these filters."}</div>
          : <div className="bar-kot-grid">{displayed.map((ticket) => {
            const pending = ticket.status === "Cancelled" ? [] : ticket.items.filter((item) => statusOf(item) === "Received");
            const preparing = ticket.status === "Cancelled" ? [] : ticket.items.filter((item) => statusOf(item) === "Preparing");
            const ready = ticket.status === "Cancelled" ? [] : ticket.items.filter((item) => statusOf(item) === "Ready");
            const busy = busyOrders.has(ticket.id);
            return <article className="bar-kot-card" key={ticket.id}>
              <div className="bar-kot-title"><div><span className="bar-kicker">ORDER #{ticket.orderId}</span><h3>{ticket.tableName}</h3><p>{ticket.section ? `${ticket.section} · ` : ""}Received {timeLabel(ticket.time)} · {ticket.server}</p></div><span className={`bar-kot-status bar-kot-status-${ticket.status.toLowerCase()}`}>{ticket.status}</span></div>
              <div className="bar-kot-meta"><span>Received <b>{timeLabel(ticket.time)}</b></span><span>Preparing <b>{preparing.length ? "In progress" : "—"}</b></span><span>Ready <b>{ready.length ? "Ready" : "—"}</b></span></div>
              <div className="bar-kot-items">{ticket.items.map((item) => {
                const name = item.dishName || item.name || "Beverage";
                const serving = item.menu?.servingSize ?? item.menu?.portionSize ?? item.servingSize;
                return <div className="bar-kot-item" key={item.orderItemId ?? item.id}><div><strong>{item.quantity} × {name}</strong><small>{serving ? `Serving ${serving}${typeof serving === "number" ? " ml" : ""}` : "Serving size not provided"}{item.notes ? ` · ${item.notes}` : ""}</small></div><span className={`bar-kot-item-status bar-kot-item-${statusOf(item).toLowerCase()}`}>{statusOf(item)}</span></div>;
              })}</div>
              <div className="bar-kot-actions"><button className="bar-button secondary" type="button" onClick={() => setExpanded((value) => value === ticket.id ? "" : ticket.id)}><Eye size={15} />{expanded === ticket.id ? "Hide Items" : "View Items"}</button><button className="bar-icon-button" type="button" title="Print Bar BOT" aria-label={`Print Bar BOT ${ticket.orderId}`} onClick={() => printTicket(ticket)}><Printer size={15} /></button>{pending.length > 0 && <button className="bar-button primary" type="button" disabled={busy} onClick={() => updateItems(ticket, pending, "cooking")}>Start Preparing</button>}{preparing.length > 0 && <button className="bar-button primary" type="button" disabled={busy} onClick={() => updateItems(ticket, preparing, "ready")}>Mark Ready</button>}{ready.length > 0 && <button className="bar-button primary" type="button" disabled={busy} onClick={() => updateItems(ticket, ready, "served")}>Mark Served</button>}{(pending.length + preparing.length + ready.length) > 0 && <button className="bar-button danger" type="button" disabled={busy} onClick={() => window.confirm(`Cancel the beverage items in order ${ticket.orderId}?`) && updateItems(ticket, [...pending, ...preparing, ...ready], "cancelled")}>Cancel Drinks</button>}</div>
              {expanded === ticket.id && <p className="bar-kot-expanded">{ticket.items.map((item) => `${item.quantity} × ${item.dishName || item.name}${item.notes ? ` — ${item.notes}` : ""}`).join(" · ")}</p>}
            </article>;
          })}</div>}
  </section>;
}
