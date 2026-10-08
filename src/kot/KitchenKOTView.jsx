import React, { useState, useEffect } from 'react';
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
  Sun,
  Moon
} from 'lucide-react';
import { sounds } from '../utils/audio';
import { KOTModal } from './KOTModal';
import { parseTimeToSeconds, formatElapsedTimer, getTimerUrgencyColor } from '../utils/timer';
import { ProfileDropdown } from '../common/ProfileDropdown';

export function KitchenKOTView({ 
  tables = [], 
  pastOrders = [],
  currentTheme,
  onChangeTheme,
  onBackToFloor, 
  onUpdateItemKotStatus, 
  onCompleteTableKot,
  onOpenTableOrder,
  initialTableId = 'all',
  currentSession = null,
  onLogout = null
}) {
  const [selectedTableFilter, setSelectedTableFilter] = useState(initialTableId); // 'all' or table.id
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'pending' | 'cooking' | 'completed'
  const [sortOrder, setSortOrder] = useState('recent-first'); // 'recent-first' (default: newest orders first) | 'oldest-first'
  const [searchQuery, setSearchQuery] = useState('');
  const [activePrintTable, setActivePrintTable] = useState(null);
  const [selectedDetailTicket, setSelectedDetailTicket] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Track dismissed paid completed tickets (if chef explicitly chooses to clear them from screen)
  const [dismissedPaidTicketIds, setDismissedPaidTicketIds] = useState(() => {
    try {
      const saved = localStorage.getItem('gourmet_kot_dismissed_tickets_v1');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  const handleDismissTicket = (ticketId) => {
    setDismissedPaidTicketIds(prev => {
      const updated = [...prev, ticketId];
      try { localStorage.setItem('gourmet_kot_dismissed_tickets_v1', JSON.stringify(updated)); } catch {}
      return updated;
    });
  };

  // Keep past orders synced in real-time across tabs/windows
  const [syncedPastOrders, setSyncedPastOrders] = useState(() => {
    try {
      const saved = localStorage.getItem('gourmet_pos_past_orders_v2_inr');
      if (saved) return JSON.parse(saved);
    } catch {}
    return pastOrders;
  });

  useEffect(() => {
    if (pastOrders && pastOrders.length > 0) {
      setSyncedPastOrders(pastOrders);
    }
  }, [pastOrders]);

  useEffect(() => {
    const handleStorage = (e) => {
      if (e.key === 'gourmet_pos_past_orders_v2_inr' && e.newValue) {
        try { setSyncedPastOrders(JSON.parse(e.newValue)); } catch {}
      }
    };
    const pollInterval = setInterval(() => {
      try {
        const saved = localStorage.getItem('gourmet_pos_past_orders_v2_inr');
        if (saved) {
          const parsed = JSON.parse(saved);
          setSyncedPastOrders(prev => {
            if (JSON.stringify(prev) !== saved) return parsed;
            return prev;
          });
        }
      } catch {}
    }, 1000);

    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('storage', handleStorage);
      clearInterval(pollInterval);
    };
  }, []);

  const [completedTimers, setCompletedTimers] = useState({});

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const effectivePastOrders = (syncedPastOrders && syncedPastOrders.length > 0) ? syncedPastOrders : pastOrders;

  // KOT Status Helpers
  const isItemReceived = (item) => !item.kotStatus || item.kotStatus === 'received' || item.kotStatus === 'new';
  const isItemCooking = (item) => item.kotStatus === 'cooking';
  const isItemCompleted = (item) => item.kotStatus === 'ready' || item.kotStatus === 'served' || item.kotStatus === 'completed';

  // 1. Active Floor Tables with Orders in Preparation
  const activeTickets = tables
    .filter(t => t.items && t.items.length > 0)
    .map(t => ({
      ...t,
      uniqueKey: `active-${t.id}`,
      isPaid: false,
      ticketType: 'active'
    }));

  // 2. Paid / Settled Completed Orders (So they REMAIN VISIBLE in KOT screen even after payment!)
  const paidTickets = (effectivePastOrders || [])
    .filter((order, idx) => {
      if (!order.items || order.items.length === 0) return false;
      const ticketId = `paid-${order.invoiceNo || `${order.tableId}-${idx}`}-${order.settledAt || order.orderTime}`;
      return !dismissedPaidTicketIds.includes(ticketId);
    })
    .map((order, idx) => ({
      id: order.tableId,
      uniqueKey: `paid-${order.invoiceNo || `${order.tableId}-${idx}`}-${order.settledAt || order.orderTime}`,
      name: order.tableName || `Table ${order.tableId}`,
      section: order.section || 'Main Hall',
      server: order.server || 'Floor Staff',
      capacity: 4,
      status: 'billed',
      orderTime: order.orderTime || order.settledAt,
      cookingStartedAt: order.cookingStartedAt || order.orderTime || order.settledAt,
      completedAt: order.settledAt,
      completedDuration: order.completedDuration || '12m 30s',
      items: (order.items || []).map(i => ({ ...i, kotStatus: 'ready' })),
      isPaid: true,
      paymentMethod: order.paymentMethod || 'cash',
      grandTotal: order.grandTotal,
      settledAt: order.settledAt,
      invoiceNo: order.invoiceNo,
      ticketType: 'paid'
    }));

  // Precise time value extractor (epoch ms) for chronological time sorting
  const getTicketTimeValue = (ticket) => {
    if (!ticket) return 0;

    // 1. Direct epoch ms if orderTimestamp is recorded
    if (typeof ticket.orderTimestamp === 'number' && ticket.orderTimestamp > 0) {
      return ticket.orderTimestamp;
    }

    // 2. Extract item timeAdded values (e.g. '06:24 PM', '05:58 PM', '04:46 PM')
    const itemTimes = (ticket.items || [])
      .map(i => i.timeAdded || i.time)
      .filter(Boolean);

    // 3. Fallback candidate time strings: orderTime, item time, settledAt, completedAt, cookingStartedAt
    const timeStr = ticket.orderTime 
      || (itemTimes.length > 0 ? itemTimes[0] : null) 
      || ticket.settledAt 
      || ticket.completedAt 
      || ticket.cookingStartedAt;

    if (!timeStr) return 0;

    // If timeStr is already a full ISO date or parseable date string
    const parsedDate = Date.parse(timeStr);
    if (!isNaN(parsedDate) && String(timeStr).includes('-')) {
      return parsedDate;
    }

    // Match 12-hour or 24-hour time strings like "06:24:33 PM", "06:24 PM", "18:24"
    const match = String(timeStr).match(/(\d+):(\d+)(?::(\d+))?\s*(AM|PM)?/i);
    if (!match) return 0;

    let hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    const seconds = match[3] ? parseInt(match[3], 10) : 0;
    const meridian = match[4];

    if (meridian) {
      const m = meridian.toUpperCase();
      if (m === 'PM' && hours < 12) hours += 12;
      if (m === 'AM' && hours === 12) hours = 0;
    }

    const d = new Date();
    d.setHours(hours, minutes, seconds, 0);

    // If parsed time is > 30 minutes in the future, it was placed yesterday before midnight
    if (d.getTime() > Date.now() + 30 * 60 * 1000) {
      d.setDate(d.getDate() - 1);
    }

    return d.getTime();
  };

  // Combined List: Active Preparation Orders + Paid Completed Orders (Sorted Time-Wise: Recent First)
  const allKitchenTickets = [...activeTickets, ...paidTickets].sort((a, b) => {
    const timeA = getTicketTimeValue(a);
    const timeB = getTicketTimeValue(b);
    if (sortOrder === 'recent-first') {
      if (timeB !== timeA) return timeB - timeA; // Descending: Most recent orders show first!
      return (b.id || 0) - (a.id || 0);
    } else {
      if (timeA !== timeB) return timeA - timeB; // Ascending: Oldest orders show first
      return (a.id || 0) - (b.id || 0);
    }
  });

  // Auto-record completion timer for any completed ticket that doesn't have one so it STOPS ticking immediately
  useEffect(() => {
    allKitchenTickets.forEach(t => {
      const isDone = t.isPaid || (t.items && t.items.length > 0 && t.items.every(isItemCompleted));
      const key = t.uniqueKey || `table-${t.id}`;
      if (isDone) {
        setCompletedTimers(prev => {
          if (prev[key]) return prev;
          let stoppedVal = t.completedDuration;
          if (!stoppedVal && t.orderTime) {
            const sec = parseTimeToSeconds(t.orderTime, t.completedAt);
            stoppedVal = formatElapsedTimer(sec);
          }
          return { ...prev, [key]: stoppedVal || 'Ready' };
        });
      } else {
        // Clean up stale completed timer if order is still active or new item was added
        setCompletedTimers(prev => {
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
  const filteredTables = allKitchenTickets.filter(t => {
    // 1. Table Number Filter: When user or admin clicks on a table number, show only that table
    if (selectedTableFilter !== 'all') {
      const matchId = String(t.id) === String(selectedTableFilter);
      const matchName = t.name && (t.name === selectedTableFilter || t.name.toLowerCase() === String(selectedTableFilter).toLowerCase());
      if (!matchId && !matchName) {
        return false;
      }
    }

    // 2. Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchesTable = (t.name || '').toLowerCase().includes(q) || (t.section || '').toLowerCase().includes(q) || (t.server || '').toLowerCase().includes(q);
      const matchesItem = t.items && t.items.some(item => (item.name || '').toLowerCase().includes(q));
      if (!matchesTable && !matchesItem) return false;
    }

    // 3. Status filter
    if (statusFilter !== 'all') {
      const allCompleted = t.items.every(isItemCompleted);
      const hasCooking = t.items.some(isItemCooking);
      const hasReceived = t.items.some(isItemReceived);

      if (statusFilter === 'pending' && (!hasReceived || t.isPaid)) return false;
      if (statusFilter === 'cooking' && (!hasCooking || t.isPaid)) return false;
      if (statusFilter === 'completed' && !(allCompleted || t.isPaid)) return false;
    }

    return true;
  });

  // Kitchen stats: accurately reflect Received -> Cooking -> Completed (including paid completed!)
  const totalOrdersCount = allKitchenTickets.length;
  const pendingOrdersCount = allKitchenTickets.filter(t => !t.isPaid && t.items.some(isItemReceived)).length;
  const cookingOrdersCount = allKitchenTickets.filter(t => !t.isPaid && t.items.some(isItemCooking)).length;
  const completedOrdersCount = allKitchenTickets.filter(t => t.isPaid || (t.items.length > 0 && t.items.every(isItemCompleted))).length;

  // Real-time synced ticket for popup details modal (strictly matching the clicked ticket's uniqueKey)
  const activeModalTicket = selectedDetailTicket 
    ? (allKitchenTickets.find(t => t.uniqueKey && t.uniqueKey === selectedDetailTicket.uniqueKey) || selectedDetailTicket)
    : null;

  const handleStartCooking = (tableId, itemId = null) => {
    sounds.playAddItem();
    onUpdateItemKotStatus(tableId, 'cooking', itemId);
  };

  const handleCompletePreparation = (tableId, itemId = null) => {
    sounds.playBell();
    const currentTable = allKitchenTickets.find(t => String(t.id) === String(tableId));
    let durationStr = null;
    if (currentTable && currentTable.orderTime) {
      const elapsedSec = parseTimeToSeconds(currentTable.orderTime);
      durationStr = formatElapsedTimer(elapsedSec);
    }
    const nowTimeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
    
    // Only lock completed duration if all items on the table will be prepared
    const willAllBeReady = !itemId || (currentTable?.items && currentTable.items.every(i => i.id === itemId || isItemCompleted(i)));
    if (willAllBeReady && durationStr) {
      setCompletedTimers(prev => ({
        ...prev,
        [tableId]: durationStr,
        [`table-${tableId}`]: durationStr,
        ...(currentTable?.uniqueKey ? { [currentTable.uniqueKey]: durationStr } : {})
      }));
    }
    onCompleteTableKot(tableId, itemId, durationStr, nowTimeStr);
  };

  const handleResetToReceived = (tableId, itemId = null) => {
    sounds.playAddItem();
    setCompletedTimers(prev => {
      const copy = { ...prev };
      delete copy[tableId];
      delete copy[`table-${tableId}`];
      return copy;
    });
    onUpdateItemKotStatus(tableId, 'received', itemId);
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
  const singleSelectedTable = selectedTableFilter !== 'all' 
    ? (tables.find(t => String(t.id) === String(selectedTableFilter) || t.name === selectedTableFilter) ||
       allKitchenTickets.find(t => String(t.id) === String(selectedTableFilter) || t.name === selectedTableFilter))
    : null;

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      background: 'var(--bg-primary)',
      backgroundImage: 'radial-gradient(ellipse 90% 40% at 50% -10%, rgba(245, 158, 11, 0.08), transparent 75%)',
      overflow: 'hidden'
    }}>
      
      {/* ================= 1. KOT TOP NAVIGATION & HEADER ================= */}
      <div style={{
        background: 'var(--bg-secondary)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1.5px solid var(--border-subtle)',
        boxShadow: 'var(--shadow-md)',
        padding: '0.85rem 1.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem',
        flexShrink: 0
      }}>
        {/* Left: Brand Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              background: 'linear-gradient(135deg, #f59e0b, #ea580c)',
              color: '#ffffff',
              padding: '8px',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 14px rgba(245, 158, 11, 0.45)'
            }}>
              <ChefHat size={26} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <h1 style={{ fontSize: '1.3rem', fontWeight: 900, color: 'var(--text-main)', lineHeight: 1.1, letterSpacing: '-0.02em' }}>
                  AVSR FOOD COURT
                </h1>
                <span style={{
                  background: 'rgba(245, 158, 11, 0.18)',
                  color: 'var(--accent-amber-light)',
                  border: '1.5px solid var(--accent-amber)',
                  fontSize: '0.7rem',
                  fontWeight: 900,
                  padding: '2px 9px',
                  borderRadius: '12px',
                  letterSpacing: '0.05em',
                  boxShadow: '0 0 10px rgba(245, 158, 11, 0.2)'
                }}>
                  KITCHEN DISPLAY SYSTEM (KDS)
                </span>
              </div>
              <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                Live Kitchen Order Tickets • Table orders & preparation completed queue
              </p>
            </div>
          </div>
        </div>

        {/* Right: Live Clock, Theme Switcher & Profile Dropdown (Symmetrical with Admin Header) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'nowrap', marginLeft: 'auto' }}>
          {/* Single Theme Toggle Icon Button (Dark <-> Light) */}
          {onChangeTheme && (
            <button
              onClick={() => {
                const nextTheme = (currentTheme === 'light-bistro') ? 'royal-saffron' : 'light-bistro';
                onChangeTheme(nextTheme);
              }}
              style={{
                width: '36px',
                height: '36px',
                boxSizing: 'border-box',
                borderRadius: '50%',
                background: 'var(--bg-tertiary)',
                border: '1.5px solid var(--border-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                flexShrink: 0
              }}
              title={currentTheme === 'light-bistro' ? 'Switch to Dark Theme' : 'Switch to Light Theme'}
            >
              {currentTheme === 'light-bistro' ? (
                <Sun size={18} color="#ea580c" />
              ) : (
                <Moon size={18} color="#fbbf24" />
              )}
            </button>
          )}

          {/* Live Kitchen Clock with Radiant Glow */}
          <div style={{
            height: '36px',
            boxSizing: 'border-box',
            background: 'var(--bg-tertiary)',
            border: '1.5px solid var(--accent-amber)',
            boxShadow: '0 0 12px var(--accent-amber-glow)',
            padding: '0 0.85rem',
            borderRadius: '9px',
            display: 'flex',
            alignItems: 'center',
            gap: '0.45rem',
            color: 'var(--accent-amber-light)',
            fontWeight: 800,
            fontSize: '0.82rem',
            fontFamily: 'monospace',
            whiteSpace: 'nowrap',
            flexShrink: 0
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-main)' }}>
              <Calendar size={14} color="var(--accent-amber)" />
              <span>{currentTime.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short' })}</span>
            </div>
            <span style={{ color: 'var(--border-subtle)', opacity: 0.6 }}>•</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--accent-amber-light)' }}>
              <Clock size={14} color="var(--accent-amber)" className="pulse-indicator" />
              <span>{currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
            </div>
          </div>

          {/* Profile Dropdown with User Details & Logout (Far Right Corner) */}
          <ProfileDropdown
            currentSession={currentSession}
            onLogout={onLogout}
            role="kot"
          />
        </div>
      </div>

      {/* ================= 2. KOT SUB-TOOLBAR (Search, Status Filter Pills & Sort Order) ================= */}
      <div style={{
        background: 'var(--bg-tertiary)',
        borderBottom: '1px solid var(--border-subtle)',
        padding: '0.55rem 1.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.75rem',
        flexShrink: 0
      }}>
        {/* Search table or dish */}
        <div style={{ position: 'relative', width: '240px', flexShrink: 0 }}>
          <Search size={15} color="var(--text-dim)" style={{ position: 'absolute', left: '10px', top: '10px' }} />
          <input
            type="text"
            placeholder="Search table or dish..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '0.48rem 0.75rem 0.48rem 2rem',
              background: 'var(--bg-secondary)',
              border: '1.5px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-main)',
              fontSize: '0.82rem',
              fontWeight: 600,
              outline: 'none'
            }}
          />
        </div>

        {/* Center: Quick status filters with High-Contrast Number Badges */}
        <div style={{
          display: 'flex',
          background: 'var(--bg-secondary)',
          padding: '3px',
          borderRadius: 'var(--radius-sm)',
          border: '1.5px solid var(--border-subtle)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.25)'
        }}>
          {[
            { id: 'all', label: 'All Orders', count: totalOrdersCount, dot: '#fbbf24', badgeColor: '#fbbf24', badgeBg: 'rgba(245, 158, 11, 0.25)', badgeBorder: 'rgba(245, 158, 11, 0.5)' },
            { id: 'pending', label: 'Received', count: pendingOrdersCount, dot: '#f59e0b', badgeColor: '#fbbf24', badgeBg: 'rgba(245, 158, 11, 0.25)', badgeBorder: 'rgba(245, 158, 11, 0.5)' },
            { id: 'cooking', label: 'Cooking', count: cookingOrdersCount, dot: '#ea580c', badgeColor: '#fb923c', badgeBg: 'rgba(234, 88, 12, 0.25)', badgeBorder: 'rgba(234, 88, 12, 0.5)' },
            { id: 'completed', label: 'Completed', count: completedOrdersCount, dot: '#10b981', badgeColor: '#34d399', badgeBg: 'rgba(16, 185, 129, 0.25)', badgeBorder: 'rgba(16, 185, 129, 0.5)' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              style={{
                padding: '0.42rem 0.85rem',
                borderRadius: '5px',
                fontSize: '0.8rem',
                fontWeight: statusFilter === tab.id ? 800 : 700,
                background: statusFilter === tab.id 
                  ? 'linear-gradient(135deg, #f59e0b, #ea580c)' 
                  : 'transparent',
                color: statusFilter === tab.id ? '#ffffff' : 'var(--text-main)',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                cursor: 'pointer',
                boxShadow: statusFilter === tab.id ? '0 2px 10px rgba(234, 88, 12, 0.35)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              {tab.dot && (
                <span style={{ 
                  width: '7px', 
                  height: '7px', 
                  borderRadius: '50%', 
                  background: tab.dot,
                  boxShadow: `0 0 6px ${tab.dot}`
                }} />
              )}
              <span style={{ fontWeight: 800 }}>
                {tab.label}
              </span>
              <span style={{
                background: statusFilter === tab.id ? '#000000' : tab.badgeBg,
                color: statusFilter === tab.id ? '#fbbf24' : tab.badgeColor,
                border: statusFilter === tab.id ? '1px solid rgba(0,0,0,0.5)' : `1px solid ${tab.badgeBorder}`,
                padding: '2px 7px',
                borderRadius: '8px',
                fontSize: '0.72rem',
                fontWeight: 900,
                minWidth: '20px',
                textAlign: 'center'
              }}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Right: Time-Wise Chronological Sorting Button */}
        <button
          onClick={() => setSortOrder(prev => prev === 'recent-first' ? 'oldest-first' : 'recent-first')}
          title="Click to toggle sorting: Most Recent First vs Oldest First"
          style={{
            padding: '0.42rem 0.85rem',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.8rem',
            fontWeight: 800,
            background: sortOrder === 'recent-first' 
              ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.22), rgba(234, 88, 12, 0.16))'
              : 'var(--bg-secondary)',
            color: '#fbbf24',
            border: '1.5px solid rgba(245, 158, 11, 0.45)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.45rem',
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
            transition: 'all 0.15s ease',
            whiteSpace: 'nowrap'
          }}
        >
          <Clock size={14} color="#fbbf24" />
          <span>{sortOrder === 'recent-first' ? '🕒 Recent First' : '⏳ Oldest First'}</span>
          <ArrowUpDown size={13} style={{ opacity: 0.85 }} />
        </button>
      </div>

      {/* ================= 2. TABLE NUMBER SELECTOR NAVIGATION BAR ================= */}
      {/* Allows clicking on any specific table to isolate ONLY that table number and its orders */}
      <div style={{
        background: 'var(--bg-secondary)',
        borderBottom: '1.5px solid var(--border-subtle)',
        padding: '0.65rem 1.5rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.6rem',
        overflowX: 'auto',
        flexShrink: 0
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.4rem',
          fontSize: '0.8rem',
          fontWeight: 900,
          color: 'var(--accent-amber-light)',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          marginRight: '0.5rem',
          flexShrink: 0
        }}>
          <Filter size={15} color="var(--accent-amber)" />
          <span>TABLE NO:</span>
        </div>

        {/* 'ALL TABLES' BUTTON */}
        <button
          onClick={() => setSelectedTableFilter('all')}
          style={{
            padding: '0.45rem 0.95rem',
            borderRadius: '6px',
            fontSize: '0.82rem',
            fontWeight: 800,
            background: selectedTableFilter === 'all' 
              ? 'linear-gradient(135deg, #f59e0b, #ea580c)' 
              : 'rgba(255, 255, 255, 0.08)',
            color: '#ffffff',
            border: selectedTableFilter === 'all' 
              ? '1px solid #ea580c' 
              : '1px solid rgba(255,255,255,0.18)',
            whiteSpace: 'nowrap',
            display: 'flex',
            alignItems: 'center',
            gap: '0.45rem',
            cursor: 'pointer'
          }}
        >
          <span>All Tables</span>
          <span style={{
            background: '#000000',
            color: '#fbbf24',
            padding: '2px 6px',
            borderRadius: '8px',
            fontSize: '0.72rem',
            fontWeight: 900
          }}>
            {allKitchenTickets.length}
          </span>
        </button>

        {/* INDIVIDUAL TABLE NUMBER BUTTONS (Table 1, Table 2, ... Table 15 + any added by Admin) */}
        {tables.map(tbl => {
          const matchingTickets = allKitchenTickets.filter(t => String(t.id) === String(tbl.id) || t.name === tbl.name);
          const hasOrders = matchingTickets.length > 0;
          const isPaidOrder = matchingTickets.some(t => t.isPaid);
          const isCompleted = hasOrders && matchingTickets.every(t => t.isPaid || t.items.every(isItemCompleted));
          const isCooking = matchingTickets.some(t => !t.isPaid && t.items.some(isItemCooking));
          const isSelected = String(selectedTableFilter) === String(tbl.id) || selectedTableFilter === tbl.name;
          const totalItemsCount = matchingTickets.reduce((sum, t) => sum + (t.items?.length || 0), 0);

          let dotColor = '#64748b';
          let badgeColor = '#94a3b8';
          let badgeBg = 'rgba(255, 255, 255, 0.08)';
          let borderStyle = '1px solid rgba(255, 255, 255, 0.1)';

          if (isCompleted || isPaidOrder) {
            dotColor = '#10b981';
            badgeColor = '#34d399';
            badgeBg = 'rgba(16, 185, 129, 0.25)';
            borderStyle = '1px solid rgba(16, 185, 129, 0.45)';
          } else if (isCooking) {
            dotColor = '#ea580c';
            badgeColor = '#fb923c';
            badgeBg = 'rgba(234, 88, 12, 0.25)';
            borderStyle = '1px solid rgba(234, 88, 12, 0.45)';
          } else if (hasOrders) {
            dotColor = '#f59e0b';
            badgeColor = '#fbbf24';
            badgeBg = 'rgba(245, 158, 11, 0.25)';
            borderStyle = '1px solid rgba(245, 158, 11, 0.45)';
          }

          return (
            <button
              key={tbl.id}
              onClick={() => setSelectedTableFilter(tbl.id)}
              style={{
                padding: '0.45rem 0.85rem',
                borderRadius: '6px',
                fontSize: '0.82rem',
                fontWeight: 800,
                background: isSelected 
                  ? 'linear-gradient(135deg, #f59e0b, #ea580c)' 
                  : (hasOrders ? 'rgba(255, 255, 255, 0.06)' : 'rgba(255, 255, 255, 0.03)'),
                color: '#ffffff',
                border: isSelected ? '1.5px solid #ea580c' : borderStyle,
                whiteSpace: 'nowrap',
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                boxShadow: isSelected ? '0 2px 8px rgba(245, 158, 11, 0.4)' : 'none',
                cursor: 'pointer'
              }}
              title={`View only ${tbl.name} orders`}
            >
              <span style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: dotColor,
                boxShadow: `0 0 6px ${dotColor}`
              }} />
              <strong style={{ color: '#ffffff', fontSize: '0.84rem' }}>{tbl.name}</strong>
              {hasOrders && (
                <span style={{
                  background: isSelected ? '#000000' : badgeBg,
                  color: isSelected ? '#fbbf24' : badgeColor,
                  border: isSelected ? '1px solid rgba(0,0,0,0.5)' : `1px solid ${badgeColor}60`,
                  padding: '1px 6px',
                  borderRadius: '6px',
                  fontSize: '0.7rem',
                  fontWeight: 900
                }}>
                  {totalItemsCount} items {isPaidOrder ? '• Paid' : ''}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ================= 3. ACTIVE ISOLATION NOTIFICATION BANNER ================= */}
      {selectedTableFilter !== 'all' && (
        <div style={{
          background: 'rgba(245, 158, 11, 0.1)',
          borderBottom: '1px solid rgba(245, 158, 11, 0.25)',
          padding: '0.5rem 1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '0.82rem',
          color: 'var(--accent-amber-light)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontWeight: 800 }}>📌 Filtering:</span>
            <span>Showing only order received for <strong>{singleSelectedTable?.name || `Table ${selectedTableFilter}`}</strong></span>
          </div>
          <button
            onClick={() => setSelectedTableFilter('all')}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-main)',
              fontSize: '0.78rem',
              fontWeight: 700,
              textDecoration: 'underline',
              cursor: 'pointer'
            }}
          >
            Show All Tables
          </button>
        </div>
      )}

      {/* ================= 4. KOT ORDERS DISPLAY CARDS ================= */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '0.75rem 1rem',
        minHeight: 0
      }}>
        {filteredTables.length === 0 ? (
          /* Empty State */
          <div style={{
            textAlign: 'center',
            padding: '3rem 1.5rem',
            color: 'var(--text-dim)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1rem'
          }}>
            <div style={{
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              background: 'rgba(245, 158, 11, 0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid rgba(245, 158, 11, 0.25)'
            }}>
              <CheckCircle2 size={34} color="var(--status-vacant)" />
            </div>

            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)' }}>
                {selectedTableFilter !== 'all' 
                  ? `No Orders Received for ${singleSelectedTable?.name || `Table ${selectedTableFilter}`} Yet!`
                  : 'No Pending KOT Orders in Kitchen!'}
              </h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', maxWidth: '420px', marginTop: '0.35rem' }}>
                {selectedTableFilter !== 'all' 
                  ? `Open ${singleSelectedTable?.name || `Table ${selectedTableFilter}`} on the dining floor to add biryanis and dishes, then click "Send KOT".`
                  : 'All kitchen tickets are currently prepared or no tables have placed orders. Click any table button above to inspect.'}
              </p>
            </div>

            <div style={{ display: 'flex', gap: '0.65rem', marginTop: '0.35rem' }}>
              {selectedTableFilter !== 'all' && singleSelectedTable && onOpenTableOrder && (
                <button
                  onClick={() => onOpenTableOrder(singleSelectedTable.id)}
                  style={{
                    padding: '0.55rem 1.1rem',
                    borderRadius: 'var(--radius-sm)',
                    background: 'linear-gradient(135deg, #f59e0b, #ea580c)',
                    color: '#ffffff',
                    fontWeight: 800,
                    fontSize: '0.8rem',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    cursor: 'pointer',
                    boxShadow: '0 3px 12px rgba(245, 158, 11, 0.4)'
                  }}
                >
                  <Utensils size={15} />
                  <span>Go to {singleSelectedTable.name} & Add Dishes</span>
                </button>
              )}

              {selectedTableFilter !== 'all' && (
                <button
                  onClick={() => setSelectedTableFilter('all')}
                  style={{
                    padding: '0.55rem 1rem',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--bg-tertiary)',
                    color: 'var(--text-main)',
                    fontWeight: 600,
                    fontSize: '0.8rem',
                    border: '1px solid var(--border-subtle)',
                    cursor: 'pointer'
                  }}
                >
                  View All Kitchen Orders
                </button>
              )}
            </div>
          </div>
        ) : (
          /* Cards Grid: 4 KOT Tickets per row */
          <div style={{
            display: 'grid',
            gridTemplateColumns: selectedTableFilter !== 'all' ? 'minmax(300px, 580px)' : 'repeat(4, minmax(0, 1fr))',
            gap: '0.65rem',
            alignItems: 'start',
            justifyContent: selectedTableFilter !== 'all' ? 'center' : 'stretch'
          }}>
            {filteredTables.map(tbl => {
              const allServed = tbl.isPaid || (tbl.items && tbl.items.length > 0 && tbl.items.every(isItemCompleted));
              const isCooking = !tbl.isPaid && tbl.items && tbl.items.some(isItemCooking);
              const isReceived = !tbl.isPaid && !allServed && !isCooking;
              const preparedCount = tbl.items ? tbl.items.filter(isItemCompleted).length : 0;
              const totalCount = tbl.items ? tbl.items.length : 0;

              let headerBg = 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)';
              let badgeText = '📥 ORDER RECEIVED';
              let badgeColor = '#f59e0b';
              let badgeBg = 'rgba(245, 158, 11, 0.18)';
              let tableBadgeBg = 'linear-gradient(135deg, #f59e0b, #d97706)';

              if (tbl.isPaid) {
                badgeText = '💰 COMPLETED (PAID)';
                badgeColor = '#34d399';
                badgeBg = 'rgba(16, 185, 129, 0.2)';
                tableBadgeBg = 'linear-gradient(135deg, #059669, #047857)';
              } else if (allServed) {
                badgeText = '✅ PREPARATION COMPLETED';
                badgeColor = '#10b981';
                badgeBg = 'rgba(16, 185, 129, 0.18)';
                tableBadgeBg = 'linear-gradient(135deg, #10b981, #059669)';
              } else if (isCooking) {
                badgeText = preparedCount > 0 
                  ? `🔥 COOKING (${preparedCount}/${totalCount} PREPARED)` 
                  : '🔥 COOKING IN PROGRESS';
                badgeColor = '#ea580c';
                badgeBg = 'rgba(234, 88, 12, 0.18)';
                tableBadgeBg = 'linear-gradient(135deg, #ea580c, #c2410c)';
              } else {
                badgeText = preparedCount > 0 
                  ? `📥 ORDER RECEIVED (${preparedCount}/${totalCount} PREPARED)` 
                  : '📥 ORDER RECEIVED';
              }

              // Pre-calculate timestamps and stopped duration
              const elapsedSec = tbl.orderTime ? parseTimeToSeconds(tbl.orderTime) : 0;
              const elapsedFormatted = formatElapsedTimer(elapsedSec);
              const urgency = getTimerUrgencyColor(elapsedSec);

              let stoppedDuration = tbl.completedDuration;
              if (!stoppedDuration && tbl.completedAt) {
                stoppedDuration = formatElapsedTimer(parseTimeToSeconds(tbl.orderTime, tbl.completedAt));
              }
              if (!stoppedDuration && completedTimers[tbl.id]) {
                stoppedDuration = completedTimers[tbl.id];
              }
              if (!stoppedDuration && completedTimers[`table-${tbl.id}`]) {
                stoppedDuration = completedTimers[`table-${tbl.id}`];
              }
              if (!stoppedDuration && completedTimers[tbl.uniqueKey]) {
                stoppedDuration = completedTimers[tbl.uniqueKey];
              }

              // Cooking started time display
              let cookingStartedDisplay = tbl.cookingStartedAt;
              if (!cookingStartedDisplay) {
                if (isCooking) {
                  cookingStartedDisplay = tbl.orderTime || 'Started';
                } else if (allServed || tbl.isPaid) {
                  cookingStartedDisplay = tbl.cookingStartedAt || tbl.orderTime || 'Done';
                } else {
                  cookingStartedDisplay = 'In Queue';
                }
              }

              // Completed time display
              let completedTimeDisplay = tbl.completedAt || tbl.settledAt;
              if (!completedTimeDisplay && (allServed || tbl.isPaid)) {
                completedTimeDisplay = 'Ready';
              }

              const cardBorder = (allServed || tbl.isPaid)
                ? '2px solid #10b981' 
                : (isCooking ? '2px solid #ff7b00' : '2px solid #f59e0b');

              const cardGlow = (allServed || tbl.isPaid)
                ? '0 6px 20px rgba(16, 185, 129, 0.2), 0 0 10px rgba(16, 185, 129, 0.14)' 
                : (isCooking 
                    ? '0 6px 20px rgba(255, 123, 0, 0.26), 0 0 10px rgba(255, 123, 0, 0.16)' 
                    : '0 6px 20px rgba(245, 158, 11, 0.22), 0 0 10px rgba(245, 158, 11, 0.14)');

              return (
                <div
                  key={tbl.uniqueKey || tbl.id}
                  onClick={() => setSelectedDetailTicket(tbl)}
                  title="Click anywhere on this card to open full order details popup"
                  style={{
                    background: 'var(--bg-card, #131d31)',
                    borderRadius: 'var(--radius-md, 10px)',
                    border: cardBorder,
                    boxShadow: cardGlow,
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    cursor: 'pointer',
                    transition: 'transform 0.15s ease, box-shadow 0.15s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  {/* --- CARD HEADER TIER 1: PROMINENT TABLE NUMBER & SERVER --- */}
                  <div style={{
                    padding: '0.45rem 0.65rem',
                    background: headerBg,
                    borderBottom: '1px solid rgba(255,255,255,0.08)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '0.4rem'
                  }}>
                    {/* Left: Table Number Badge & Table Info */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
                      <div style={{
                        background: tableBadgeBg,
                        color: '#ffffff',
                        padding: '0.22rem 0.45rem',
                        borderRadius: '6px',
                        fontWeight: 900,
                        fontSize: '0.86rem',
                        letterSpacing: '-0.02em',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.3)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minWidth: '40px',
                        flexShrink: 0
                      }}>
                        <span style={{ fontSize: '0.46rem', textTransform: 'uppercase', letterSpacing: '0.08em', opacity: 0.95, fontWeight: 800 }}>
                          TABLE
                        </span>
                        <span>{tbl.name.replace(/Table\s*/i, '')}</span>
                      </div>

                      <div style={{ minWidth: 0 }}>
                        <h3 style={{
                          fontSize: '0.94rem',
                          fontWeight: 900,
                          color: '#ffffff',
                          margin: 0,
                          lineHeight: 1.15,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          letterSpacing: '-0.01em'
                        }}>
                          {tbl.name}
                        </h3>
                        <div style={{
                          fontSize: '0.66rem',
                          color: 'var(--text-muted)',
                          marginTop: '1px',
                          fontWeight: 600,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}>
                          {tbl.section} • {tbl.server}
                        </div>
                      </div>
                    </div>

                    {/* Right: Paid Pill + Print Slip Button */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', flexShrink: 0 }}>
                      {tbl.isPaid && (
                        <span style={{
                          background: 'rgba(16, 185, 129, 0.22)',
                          color: '#34d399',
                          border: '1px solid rgba(16, 185, 129, 0.5)',
                          padding: '2px 5px',
                          borderRadius: '5px',
                          fontSize: '0.6rem',
                          fontWeight: 800,
                          whiteSpace: 'nowrap'
                        }}>
                          💰 PAID
                        </span>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActivePrintTable(tbl);
                        }}
                        style={{
                          background: 'rgba(255,255,255,0.08)',
                          border: '1px solid rgba(255,255,255,0.15)',
                          color: 'var(--text-muted)',
                          padding: '3px 6px',
                          borderRadius: '5px',
                          fontSize: '0.65rem',
                          display: 'flex',
                          alignItems: 'center',
                          cursor: 'pointer'
                        }}
                        title="Print Kitchen Slip"
                      >
                        <Printer size={12} />
                      </button>
                    </div>
                  </div>

                  {/* --- CARD HEADER TIER 2: FULL-WIDTH RADIANT STATUS BANNER --- */}
                  <div style={{
                    padding: '0.26rem 0.65rem',
                    background: badgeBg,
                    borderBottom: `1px solid ${badgeColor}35`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.35rem',
                    color: badgeColor,
                    fontSize: '0.66rem',
                    fontWeight: 900,
                    letterSpacing: '0.05em',
                    textTransform: 'uppercase'
                  }}>
                    <span>{badgeText}</span>
                  </div>

                  {/* --- CARD HEADER TIER 3: NEAT & CLEAR 3-COLUMN LIFECYCLE TIMESTAMPS BAR --- */}
                  <div style={{
                    background: 'rgba(0, 0, 0, 0.32)',
                    borderBottom: '1px solid rgba(255,255,255,0.08)',
                    padding: '0.32rem 0.55rem',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '0.32rem',
                    alignItems: 'stretch'
                  }}>
                    {/* 1. Received Time */}
                    <div style={{
                      background: 'rgba(245, 158, 11, 0.12)',
                      border: '1.5px solid rgba(245, 158, 11, 0.35)',
                      borderRadius: '5px',
                      padding: '0.22rem 0.35rem',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      gap: '1px',
                      textAlign: 'center'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2px', color: '#fbbf24', fontSize: '0.54rem', fontWeight: 800, letterSpacing: '0.04em' }}>
                        <Clock size={10} />
                        <span>RECEIVED</span>
                      </div>
                      <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#ffffff', fontFamily: 'monospace' }}>
                        {tbl.orderTime || '--:--'}
                      </span>
                    </div>

                    {/* 2. Cooking Started Time */}
                    <div style={{
                      background: isCooking || allServed || tbl.isPaid ? 'rgba(255, 123, 0, 0.12)' : 'rgba(255, 255, 255, 0.04)',
                      border: isCooking || allServed || tbl.isPaid ? '1.5px solid rgba(255, 123, 0, 0.4)' : '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: '5px',
                      padding: '0.22rem 0.35rem',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      gap: '1px',
                      textAlign: 'center'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2px', color: isCooking || allServed || tbl.isPaid ? '#fb923c' : 'var(--text-muted)', fontSize: '0.54rem', fontWeight: 800, letterSpacing: '0.04em' }}>
                        <Flame size={10} />
                        <span>COOKING</span>
                      </div>
                      <span style={{
                        fontSize: '0.7rem',
                        fontWeight: 800,
                        color: (isCooking || allServed || tbl.isPaid || tbl.cookingStartedAt) ? '#ffffff' : 'var(--text-dim)',
                        fontFamily: 'monospace'
                      }}>
                        {cookingStartedDisplay}
                      </span>
                    </div>

                    {/* 3. Completed Time & Stopped Duration */}
                    <div style={{
                      background: allServed || tbl.isPaid ? 'rgba(16, 185, 129, 0.14)' : 'rgba(255, 255, 255, 0.04)',
                      border: allServed || tbl.isPaid ? '1.5px solid rgba(16, 185, 129, 0.45)' : '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: '5px',
                      padding: '0.22rem 0.35rem',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      gap: '1px',
                      textAlign: 'center'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2px', color: allServed || tbl.isPaid ? '#34d399' : 'var(--text-muted)', fontSize: '0.54rem', fontWeight: 800, letterSpacing: '0.04em' }}>
                        <CheckCircle2 size={10} />
                        <span>COMPLETED</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1px' }}>
                        <span style={{
                          fontSize: '0.7rem',
                          fontWeight: 800,
                          color: allServed || tbl.isPaid ? '#34d399' : 'var(--text-dim)',
                          fontFamily: 'monospace'
                        }}>
                          {allServed || tbl.isPaid 
                            ? completedTimeDisplay 
                            : (isCooking 
                                ? (preparedCount > 0 ? `Cooking (${preparedCount}/${totalCount})` : 'Cooking') 
                                : (preparedCount > 0 ? `${preparedCount}/${totalCount} Ready` : 'Pending'))}
                        </span>
                        {(allServed || tbl.isPaid) && stoppedDuration && (
                          <span style={{ fontSize: '0.58rem', color: '#10b981', fontWeight: 800, fontFamily: 'monospace' }}>
                            ({stoppedDuration})
                          </span>
                        )}
                        {!allServed && !tbl.isPaid && tbl.orderTime && (
                          <span style={{ fontSize: '0.58rem', color: urgency.text, fontWeight: 800, fontFamily: 'monospace' }}>
                            ({elapsedFormatted})
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* --- CARD BODY: DISHES ORDERED RECEIVED FROM TABLE --- */}
                  <div style={{
                    padding: '0.55rem 0.65rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.42rem',
                    maxHeight: '300px',
                    overflowY: 'auto'
                  }}>
                    <div style={{
                      fontSize: '0.64rem',
                      fontWeight: 800,
                      color: 'var(--text-muted)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      display: 'flex',
                      justifyContent: 'space-between',
                      borderBottom: '1px solid rgba(255,255,255,0.08)',
                      paddingBottom: '0.28rem'
                    }}>
                      <span>Ordered Dishes ({tbl.items?.length || 0})</span>
                      <span>Dish Status (Click)</span>
                    </div>

                    {tbl.items && tbl.items.map((item, idx) => {
                      const itemReady = isItemCompleted(item);
                      const itemCooking = isItemCooking(item);

                      return (
                        <div
                          key={idx}
                          style={{
                            background: itemReady 
                              ? 'rgba(16, 185, 129, 0.1)' 
                              : (itemCooking ? 'rgba(255, 123, 0, 0.1)' : 'rgba(255, 255, 255, 0.04)'),
                            borderRadius: 'var(--radius-sm)',
                            padding: '0.42rem 0.55rem',
                            border: itemReady 
                              ? '1.5px solid rgba(16, 185, 129, 0.35)' 
                              : (itemCooking ? '1.5px solid rgba(255, 123, 0, 0.4)' : '1px solid rgba(255,255,255,0.08)'),
                            display: 'flex',
                            alignItems: 'flex-start',
                            justifyContent: 'space-between',
                            gap: '0.45rem',
                            boxShadow: '0 1px 4px rgba(0,0,0,0.2)'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.45rem', flex: 1, minWidth: 0 }}>
                            {/* Quantity badge */}
                            <span style={{
                              background: itemReady 
                                ? 'linear-gradient(135deg, #10b981, #059669)' 
                                : (itemCooking ? 'linear-gradient(135deg, #ff7b00, #ea580c)' : 'linear-gradient(135deg, #f59e0b, #d97706)'),
                              color: '#ffffff',
                              padding: '2px 5px',
                              borderRadius: '5px',
                              fontWeight: 900,
                              fontSize: '0.74rem',
                              minWidth: '24px',
                              textAlign: 'center',
                              boxShadow: '0 2px 5px rgba(0,0,0,0.35)',
                              flexShrink: 0
                            }}>
                              {item.quantity}x
                            </span>

                            <div style={{ minWidth: 0 }}>
                              <div style={{ 
                                fontSize: '0.8rem', 
                                fontWeight: 800, 
                                color: '#ffffff',
                                lineHeight: 1.25,
                                letterSpacing: '-0.01em'
                              }}>
                                {item.name}
                              </div>

                              {item.notes ? (
                                <div style={{
                                  fontSize: '0.66rem',
                                  color: '#f87171',
                                  fontWeight: 700,
                                  marginTop: '2px',
                                  background: 'rgba(239, 68, 68, 0.15)',
                                  padding: '1px 5px',
                                  borderRadius: '3px',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '3px'
                                }}>
                                  <span>⚠️</span>
                                  <strong>{item.notes}</strong>
                                </div>
                              ) : null}
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleItemStatus(tbl.id, item);
                              }}
                              style={{
                                fontSize: '0.64rem',
                                fontWeight: 800,
                                padding: '3px 7px',
                                borderRadius: '5px',
                                textTransform: 'uppercase',
                                background: itemReady 
                                  ? 'rgba(16, 185, 129, 0.22)' 
                                  : (itemCooking ? 'rgba(255, 123, 0, 0.22)' : 'rgba(245, 158, 11, 0.22)'),
                                color: itemReady ? '#34d399' : (itemCooking ? '#ff9248' : '#fbbf24'),
                                border: itemReady 
                                  ? '1.5px solid #10b981' 
                                  : (itemCooking ? '1.5px solid #ff7b00' : '1.5px solid #f59e0b'),
                                boxShadow: itemReady 
                                  ? '0 0 8px rgba(16, 185, 129, 0.25)' 
                                  : (itemCooking ? '0 0 8px rgba(255, 123, 0, 0.25)' : 'none'),
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '3px',
                                whiteSpace: 'nowrap',
                                transition: 'all 0.15s ease'
                              }}
                              title="Click to toggle: Received -> Cooking -> Prepared"
                            >
                              {itemReady ? '✓ Prepared' : (itemCooking ? '🔥 Cooking' : '📥 Received')}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* --- CARD FOOTER: ACTION BUTTONS (ORDER RECEIVED -> START COOKING -> COMPLETED) --- */}
                  <div style={{
                    padding: '0.5rem 0.65rem',
                    background: 'rgba(0,0,0,0.35)',
                    borderTop: '1px solid rgba(255,255,255,0.08)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.42rem'
                  }}>
                    {/* STEP 1: ORDER RECEIVED -> NEXT STEP IS "START COOKING" */}
                    {isReceived && (
                      <div style={{ display: 'flex', gap: '0.45rem' }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStartCooking(tbl.id);
                          }}
                          style={{
                            flex: 2,
                            padding: '0.52rem 0.65rem',
                            borderRadius: 'var(--radius-sm)',
                            background: 'linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)',
                            color: '#ffffff',
                            fontWeight: 800,
                            fontSize: '0.78rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.35rem',
                            border: 'none',
                            cursor: 'pointer',
                            boxShadow: '0 3px 10px rgba(245, 158, 11, 0.35)'
                          }}
                        >
                          <Flame size={14} />
                          <span>{preparedCount > 0 ? `🔥 COOK REMAINING (${totalCount - preparedCount})` : '🔥 START COOKING'}</span>
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCompletePreparation(tbl.id);
                          }}
                          style={{
                            flex: 1,
                            padding: '0.52rem 0.5rem',
                            borderRadius: 'var(--radius-sm)',
                            background: 'rgba(16, 185, 129, 0.15)',
                            border: '1px solid rgba(16, 185, 129, 0.4)',
                            color: '#10b981',
                            fontWeight: 700,
                            fontSize: '0.72rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.3rem',
                            cursor: 'pointer'
                          }}
                        >
                          <CheckCircle2 size={13} />
                          <span>Direct Complete</span>
                        </button>
                      </div>
                    )}

                    {/* STEP 2: COOKING IN PROGRESS -> NEXT STEP IS "PREPARATION COMPLETED" */}
                    {isCooking && (
                      <div style={{ display: 'flex', gap: '0.45rem' }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCompletePreparation(tbl.id);
                          }}
                          style={{
                            flex: 2,
                            padding: '0.52rem 0.65rem',
                            borderRadius: 'var(--radius-sm)',
                            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                            color: '#ffffff',
                            fontWeight: 800,
                            fontSize: '0.78rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.4rem',
                            border: 'none',
                            cursor: 'pointer',
                            boxShadow: '0 3px 12px rgba(16, 185, 129, 0.35)'
                          }}
                        >
                          <CheckCircle2 size={14} />
                          <span>{preparedCount > 0 ? `✅ COMPLETE REMAINING (${totalCount - preparedCount})` : '✅ PREPARATION COMPLETED'}</span>
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleResetToReceived(tbl.id);
                          }}
                          style={{
                            flex: 1,
                            padding: '0.52rem 0.5rem',
                            borderRadius: 'var(--radius-sm)',
                            background: 'rgba(255, 255, 255, 0.06)',
                            border: '1px solid rgba(255,255,255,0.12)',
                            color: 'var(--text-muted)',
                            fontWeight: 600,
                            fontSize: '0.72rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.25rem',
                            cursor: 'pointer'
                          }}
                          title="Revert back to received order"
                        >
                          <RotateCcw size={12} />
                          <span>Revert</span>
                        </button>
                      </div>
                    )}

                    {/* STEP 3: PREPARATION COMPLETED (Active vs Paid) */}
                    {(allServed || tbl.isPaid) && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                        <div style={{
                          width: '100%',
                          padding: '0.48rem 0.65rem',
                          borderRadius: 'var(--radius-sm)',
                          background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.18) 0%, rgba(5, 150, 105, 0.12) 100%)',
                          border: '1.5px solid rgba(16, 185, 129, 0.45)',
                          boxShadow: '0 2px 8px rgba(16, 185, 129, 0.12)',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.25rem'
                        }}>
                          <div style={{
                            color: '#34d399',
                            fontWeight: 900,
                            fontSize: '0.8rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            textShadow: '0 0 10px rgba(52, 211, 153, 0.4)'
                          }}>
                            <CheckCircle2 size={14} />
                            <span>{tbl.isPaid ? 'PREPARATION COMPLETED & BILL PAID' : 'PREPARATION COMPLETED'}</span>
                          </div>
                          <p style={{ fontSize: '0.68rem', color: '#e2e8f0', textAlign: 'center', fontWeight: 600, margin: 0 }}>
                            {tbl.isPaid ? (
                              <>
                                Table <strong style={{ color: '#ffffff' }}>{tbl.name}</strong> bill settled via {(tbl.paymentMethod || 'UPI').toUpperCase()} at {tbl.settledAt}. Order remained in KDS!
                              </>
                            ) : (
                              <>
                                Order for <strong style={{ color: '#ffffff' }}>{tbl.name}</strong> is cooked & ready to be served to guests!
                              </>
                            )}
                          </p>
                        </div>

                        {/* Actions for Paid ticket vs Active ticket */}
                        {tbl.isPaid ? (
                          <div style={{ display: 'flex', gap: '0.45rem' }}>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setActivePrintTable(tbl);
                              }}
                              style={{
                                flex: 1,
                                padding: '0.42rem',
                                borderRadius: 'var(--radius-sm)',
                                background: 'rgba(255, 255, 255, 0.08)',
                                border: '1px solid rgba(255,255,255,0.15)',
                                color: '#ffffff',
                                fontWeight: 700,
                                fontSize: '0.72rem',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.3rem',
                                cursor: 'pointer'
                              }}
                            >
                              <Printer size={12} />
                              <span>Print Slip</span>
                            </button>

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDismissTicket(tbl.uniqueKey || `paid-${tbl.id}`);
                              }}
                              style={{
                                flex: 1,
                                padding: '0.42rem',
                                borderRadius: 'var(--radius-sm)',
                                background: 'rgba(239, 68, 68, 0.12)',
                                border: '1px solid rgba(239, 68, 68, 0.35)',
                                color: '#f87171',
                                fontWeight: 700,
                                fontSize: '0.72rem',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.3rem',
                                cursor: 'pointer'
                              }}
                              title="Clear this completed paid ticket from kitchen display"
                            >
                              <Check size={12} />
                              <span>Clear from KOT</span>
                            </button>
                          </div>
                        ) : (
                          /* Active Table Re-cook / Reset */
                          <div style={{ display: 'flex', gap: '0.45rem' }}>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStartCooking(tbl.id);
                              }}
                              style={{
                                flex: 1,
                                padding: '0.42rem',
                                borderRadius: 'var(--radius-sm)',
                                background: 'rgba(234, 88, 12, 0.12)',
                                border: '1px solid rgba(234, 88, 12, 0.35)',
                                color: '#fb923c',
                                fontWeight: 700,
                                fontSize: '0.72rem',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.25rem',
                                cursor: 'pointer'
                              }}
                            >
                              <Flame size={12} />
                              <span>Re-cook</span>
                            </button>

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleResetToReceived(tbl.id);
                              }}
                              style={{
                                flex: 1,
                                padding: '0.42rem',
                                borderRadius: 'var(--radius-sm)',
                                background: 'rgba(245, 158, 11, 0.12)',
                                border: '1px solid rgba(245, 158, 11, 0.35)',
                                color: '#f59e0b',
                                fontWeight: 700,
                                fontSize: '0.72rem',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.25rem',
                                cursor: 'pointer'
                              }}
                              title="Reset back to Order Received state"
                            >
                              <RotateCcw size={12} />
                              <span>Reset to Received</span>
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ================= 5. PRINT KOT MODAL IF TRIGGERED ================= */}
      {activePrintTable && (
        <KOTModal
          table={activePrintTable}
          onClose={() => setActivePrintTable(null)}
        />
      )}

      {/* ================= 6. TICKET / ORDER DETAILS POPUP MODAL ================= */}
      {activeModalTicket && (() => {
        const modalTicket = activeModalTicket;
        const allServed = modalTicket.isPaid || (modalTicket.items && modalTicket.items.length > 0 && modalTicket.items.every(isItemCompleted));
        const isCooking = !modalTicket.isPaid && modalTicket.items && modalTicket.items.some(isItemCooking);
        const isReceived = !modalTicket.isPaid && !allServed && !isCooking;

        const elapsedSec = modalTicket.orderTime ? parseTimeToSeconds(modalTicket.orderTime) : 0;
        const elapsedFormatted = formatElapsedTimer(elapsedSec);
        const urgency = getTimerUrgencyColor(elapsedSec);

        let stoppedDuration = modalTicket.completedDuration;
        if (!stoppedDuration && modalTicket.completedAt) {
          stoppedDuration = formatElapsedTimer(parseTimeToSeconds(modalTicket.orderTime, modalTicket.completedAt));
        }
        if (!stoppedDuration && completedTimers[modalTicket.id]) {
          stoppedDuration = completedTimers[modalTicket.id];
        }
        if (!stoppedDuration && completedTimers[`table-${modalTicket.id}`]) {
          stoppedDuration = completedTimers[`table-${modalTicket.id}`];
        }
        if (!stoppedDuration && completedTimers[modalTicket.uniqueKey]) {
          stoppedDuration = completedTimers[modalTicket.uniqueKey];
        }

        let cookingStartedDisplay = modalTicket.cookingStartedAt;
        if (!cookingStartedDisplay) {
          if (isCooking) {
            cookingStartedDisplay = modalTicket.orderTime || 'Started';
          } else if (allServed || modalTicket.isPaid) {
            cookingStartedDisplay = modalTicket.cookingStartedAt || modalTicket.orderTime || 'Done';
          } else {
            cookingStartedDisplay = 'In Queue';
          }
        }

        let completedTimeDisplay = modalTicket.completedAt || modalTicket.settledAt;
        if (!completedTimeDisplay && (allServed || modalTicket.isPaid)) {
          completedTimeDisplay = 'Ready';
        }

        const modalPreparedCount = modalTicket.items ? modalTicket.items.filter(isItemCompleted).length : 0;
        const modalTotalCount = modalTicket.items ? modalTicket.items.length : 0;

        let statusBadgeText = '';
        let statusBadgeColor = '#fb923c';
        let statusBadgeBg = 'rgba(234, 88, 12, 0.22)';
        let statusBadgeBorder = 'rgba(234, 88, 12, 0.55)';

        if (modalTicket.isPaid) {
          statusBadgeText = '💰 COMPLETED (PAID)';
          statusBadgeColor = '#34d399';
          statusBadgeBg = 'rgba(16, 185, 129, 0.22)';
          statusBadgeBorder = 'rgba(16, 185, 129, 0.55)';
        } else if (allServed) {
          statusBadgeText = '✅ PREPARATION COMPLETED';
          statusBadgeColor = '#10b981';
          statusBadgeBg = 'rgba(16, 185, 129, 0.22)';
          statusBadgeBorder = 'rgba(16, 185, 129, 0.55)';
        } else if (isCooking) {
          statusBadgeText = modalPreparedCount > 0 
            ? `🔥 COOKING (${modalPreparedCount}/${modalTotalCount} PREPARED)` 
            : '🔥 COOKING IN PROGRESS';
          statusBadgeColor = '#fb923c';
          statusBadgeBg = 'rgba(234, 88, 12, 0.22)';
          statusBadgeBorder = 'rgba(234, 88, 12, 0.55)';
        } else {
          statusBadgeText = modalPreparedCount > 0 
            ? `📥 ORDER RECEIVED (${modalPreparedCount}/${modalTotalCount} PREPARED)` 
            : '📥 ORDER RECEIVED';
        }

        return (
          <div 
            onClick={() => setSelectedDetailTicket(null)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0, 0, 0, 0.78)',
              backdropFilter: 'blur(8px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 105,
              padding: '1rem',
              animation: 'fadeIn 0.15s ease'
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                background: 'var(--bg-secondary, #0e1726)',
                border: '1.5px solid var(--accent-amber, #f59e0b)',
                boxShadow: '0 25px 60px rgba(0,0,0,0.7), 0 0 30px rgba(245, 158, 11, 0.2)',
                borderRadius: '16px',
                width: '100%',
                maxWidth: '560px',
                maxHeight: '90vh',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column'
              }}
            >
              {/* Modal Header */}
              <div style={{
                background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
                padding: '1rem 1.25rem',
                borderBottom: '1.5px solid rgba(255,255,255,0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '0.75rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{
                    background: 'linear-gradient(135deg, #f59e0b, #ea580c)',
                    color: '#ffffff',
                    padding: '0.4rem 0.75rem',
                    borderRadius: '8px',
                    fontWeight: 900,
                    fontSize: '1.1rem',
                    textAlign: 'center',
                    boxShadow: '0 3px 10px rgba(0,0,0,0.4)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minWidth: '50px'
                  }}>
                    <span style={{ fontSize: '0.52rem', letterSpacing: '0.08em', textTransform: 'uppercase', opacity: 0.9 }}>
                      TABLE
                    </span>
                    <span>{modalTicket.name.replace(/Table\s*/i, '')}</span>
                  </div>

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <h2 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#ffffff', margin: 0 }}>
                        {modalTicket.name} Order Details
                      </h2>
                      <span style={{
                        background: statusBadgeBg,
                        color: statusBadgeColor,
                        border: `1px solid ${statusBadgeBorder}`,
                        padding: '2px 8px',
                        borderRadius: '10px',
                        fontSize: '0.68rem',
                        fontWeight: 900
                      }}>
                        {statusBadgeText}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted, #94a3b8)', marginTop: '3px' }}>
                      📍 {modalTicket.section} • 👤 Server: <strong style={{ color: '#ffffff' }}>{modalTicket.server}</strong> • 👥 {modalTicket.capacity || 4} Guests
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedDetailTicket(null)}
                  style={{
                    background: 'rgba(255,255,255,0.08)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    color: '#cbd5e1',
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    flexShrink: 0
                  }}
                  title="Close Details Modal"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Modal Body */}
              <div style={{
                padding: '1.25rem',
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
                flex: 1
              }}>
                {/* 1. Lifecycle Timeline / Timestamps */}
                <div>
                  <div style={{
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    color: 'var(--text-muted, #94a3b8)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    marginBottom: '0.5rem'
                  }}>
                    ⏱️ Order Lifecycle & Timestamps
                  </div>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '0.5rem'
                  }}>
                    {/* Received */}
                    <div style={{
                      background: 'rgba(245, 158, 11, 0.12)',
                      border: '1.5px solid rgba(245, 158, 11, 0.4)',
                      borderRadius: '8px',
                      padding: '0.65rem 0.5rem',
                      textAlign: 'center'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', color: '#fbbf24', fontSize: '0.68rem', fontWeight: 800 }}>
                        <Clock size={12} />
                        <span>RECEIVED</span>
                      </div>
                      <div style={{ fontSize: '0.95rem', fontWeight: 900, color: '#ffffff', fontFamily: 'monospace', marginTop: '3px' }}>
                        {modalTicket.orderTime || '--:--'}
                      </div>
                      <div style={{ fontSize: '0.65rem', color: '#fbbf24', marginTop: '2px', fontWeight: 700 }}>
                        Kitchen Queue
                      </div>
                    </div>

                    {/* Cooking */}
                    <div style={{
                      background: isCooking || allServed || modalTicket.isPaid ? 'rgba(255, 123, 0, 0.12)' : 'rgba(255, 255, 255, 0.04)',
                      border: isCooking || allServed || modalTicket.isPaid ? '1.5px solid rgba(255, 123, 0, 0.45)' : '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '8px',
                      padding: '0.65rem 0.5rem',
                      textAlign: 'center'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', color: isCooking || allServed || modalTicket.isPaid ? '#fb923c' : 'var(--text-muted)', fontSize: '0.68rem', fontWeight: 800 }}>
                        <Flame size={12} />
                        <span>COOKING</span>
                      </div>
                      <div style={{ fontSize: '0.95rem', fontWeight: 900, color: (isCooking || allServed || modalTicket.isPaid || modalTicket.cookingStartedAt) ? '#ffffff' : 'var(--text-dim)', fontFamily: 'monospace', marginTop: '3px' }}>
                        {cookingStartedDisplay}
                      </div>
                      <div style={{ fontSize: '0.65rem', color: isCooking ? '#fb923c' : 'var(--text-dim)', marginTop: '2px', fontWeight: 700 }}>
                        {isCooking ? 'Active Cooking' : (allServed || modalTicket.isPaid ? 'Cooked' : 'Waiting')}
                      </div>
                    </div>

                    {/* Completed */}
                    <div style={{
                      background: allServed || modalTicket.isPaid ? 'rgba(16, 185, 129, 0.14)' : 'rgba(255, 255, 255, 0.04)',
                      border: allServed || modalTicket.isPaid ? '1.5px solid rgba(16, 185, 129, 0.5)' : '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '8px',
                      padding: '0.65rem 0.5rem',
                      textAlign: 'center'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', color: allServed || modalTicket.isPaid ? '#34d399' : 'var(--text-muted)', fontSize: '0.68rem', fontWeight: 800 }}>
                        <CheckCircle2 size={12} />
                        <span>COMPLETED</span>
                      </div>
                      <div style={{ fontSize: '0.95rem', fontWeight: 900, color: allServed || modalTicket.isPaid ? '#34d399' : 'var(--text-dim)', fontFamily: 'monospace', marginTop: '3px' }}>
                        {allServed || modalTicket.isPaid 
                          ? completedTimeDisplay 
                          : (isCooking 
                              ? (modalPreparedCount > 0 ? `Cooking (${modalPreparedCount}/${modalTotalCount})` : 'Cooking') 
                              : (modalPreparedCount > 0 ? `${modalPreparedCount}/${modalTotalCount} Ready` : 'Pending'))}
                      </div>
                      <div style={{ fontSize: '0.65rem', color: '#10b981', marginTop: '2px', fontWeight: 800, fontFamily: 'monospace' }}>
                        {(allServed || modalTicket.isPaid) && stoppedDuration 
                          ? `(${stoppedDuration})` 
                          : (!allServed && !modalTicket.isPaid && modalTicket.orderTime ? `(${elapsedFormatted})` : '')}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. Complete Ordered Dishes List */}
                <div>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    color: 'var(--text-muted, #94a3b8)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    marginBottom: '0.5rem'
                  }}>
                    <span>🍽️ Ordered Dishes ({modalTicket.items?.length || 0})</span>
                    <span>Click status to update</span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {modalTicket.items && modalTicket.items.map((item, idx) => {
                      const itemReady = isItemCompleted(item);
                      const itemCooking = isItemCooking(item);

                      return (
                        <div
                          key={idx}
                          style={{
                            background: itemReady 
                              ? 'rgba(16, 185, 129, 0.12)' 
                              : (itemCooking ? 'rgba(255, 123, 0, 0.12)' : 'rgba(255, 255, 255, 0.04)'),
                            borderRadius: '8px',
                            padding: '0.65rem 0.85rem',
                            border: itemReady 
                              ? '1.5px solid rgba(16, 185, 129, 0.45)' 
                              : (itemCooking ? '1.5px solid rgba(255, 123, 0, 0.45)' : '1px solid rgba(255,255,255,0.1)'),
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '0.75rem'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flex: 1, minWidth: 0 }}>
                            <span style={{
                              background: itemReady 
                                ? 'linear-gradient(135deg, #10b981, #059669)' 
                                : (itemCooking ? 'linear-gradient(135deg, #ff7b00, #ea580c)' : 'linear-gradient(135deg, #f59e0b, #d97706)'),
                              color: '#ffffff',
                              padding: '2px 7px',
                              borderRadius: '6px',
                              fontWeight: 900,
                              fontSize: '0.85rem',
                              minWidth: '28px',
                              textAlign: 'center'
                            }}>
                              {item.quantity}x
                            </span>

                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#ffffff', lineHeight: 1.25 }}>
                                {item.name}
                              </div>
                              {item.notes && (
                                <div style={{
                                  fontSize: '0.72rem',
                                  color: '#f87171',
                                  fontWeight: 700,
                                  marginTop: '2px',
                                  background: 'rgba(239, 68, 68, 0.15)',
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '3px'
                                }}>
                                  <span>⚠️</span>
                                  <strong>{item.notes}</strong>
                                </div>
                              )}
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexShrink: 0 }}>
                            <button
                              onClick={() => handleToggleItemStatus(modalTicket.id, item)}
                              style={{
                                fontSize: '0.72rem',
                                fontWeight: 800,
                                padding: '4px 9px',
                                borderRadius: '6px',
                                textTransform: 'uppercase',
                                background: itemReady 
                                  ? 'rgba(16, 185, 129, 0.25)' 
                                  : (itemCooking ? 'rgba(255, 123, 0, 0.25)' : 'rgba(245, 158, 11, 0.25)'),
                                color: itemReady ? '#34d399' : (itemCooking ? '#ff9248' : '#fbbf24'),
                                border: itemReady 
                                  ? '1.5px solid #10b981' 
                                  : (itemCooking ? '1.5px solid #ff7b00' : '1.5px solid #f59e0b'),
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '3px',
                                whiteSpace: 'nowrap'
                              }}
                              title="Click to advance status"
                            >
                              {itemReady ? '✓ Prepared' : (itemCooking ? '🔥 Cooking' : '📥 Received')}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 3. Settlement info if paid */}
                {modalTicket.isPaid && (
                  <div style={{
                    background: 'rgba(16, 185, 129, 0.12)',
                    border: '1.5px solid rgba(16, 185, 129, 0.4)',
                    borderRadius: '8px',
                    padding: '0.75rem 1rem',
                    fontSize: '0.82rem',
                    color: '#e2e8f0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}>
                    <div>
                      <div style={{ fontWeight: 800, color: '#34d399' }}>
                        💰 Bill Paid & Settled
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '2px' }}>
                        Payment Method: {(modalTicket.paymentMethod || 'cash').toUpperCase()} • Settled At: {modalTicket.settledAt}
                      </div>
                    </div>
                    {modalTicket.invoiceNo && (
                      <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#fbbf24', background: '#000000', padding: '3px 8px', borderRadius: '6px' }}>
                        #{modalTicket.invoiceNo}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Modal Footer Controls */}
              <div style={{
                background: 'rgba(0,0,0,0.4)',
                borderTop: '1px solid rgba(255,255,255,0.1)',
                padding: '0.85rem 1.25rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '0.65rem',
                flexWrap: 'wrap'
              }}>
                <button
                  onClick={() => {
                    setActivePrintTable(modalTicket);
                  }}
                  style={{
                    padding: '0.55rem 0.95rem',
                    borderRadius: 'var(--radius-sm)',
                    background: 'rgba(255, 255, 255, 0.08)',
                    border: '1px solid rgba(255, 255, 255, 0.18)',
                    color: '#ffffff',
                    fontWeight: 700,
                    fontSize: '0.8rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    cursor: 'pointer'
                  }}
                >
                  <Printer size={15} />
                  <span>Print KOT Slip</span>
                </button>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {!modalTicket.isPaid && isReceived && (
                    <button
                      onClick={() => handleStartCooking(modalTicket.id)}
                      style={{
                        padding: '0.55rem 1.1rem',
                        borderRadius: 'var(--radius-sm)',
                        background: 'linear-gradient(135deg, #f59e0b, #ea580c)',
                        color: '#ffffff',
                        fontWeight: 800,
                        fontSize: '0.82rem',
                        border: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        cursor: 'pointer',
                        boxShadow: '0 3px 12px rgba(245, 158, 11, 0.4)'
                      }}
                    >
                      <Flame size={15} />
                      <span>{modalPreparedCount > 0 ? `Start Cooking Remaining (${modalTotalCount - modalPreparedCount})` : 'Start Cooking'}</span>
                    </button>
                  )}

                  {!modalTicket.isPaid && isCooking && (
                    <button
                      onClick={() => handleCompletePreparation(modalTicket.id)}
                      style={{
                        padding: '0.55rem 1.1rem',
                        borderRadius: 'var(--radius-sm)',
                        background: 'linear-gradient(135deg, #10b981, #059669)',
                        color: '#ffffff',
                        fontWeight: 800,
                        fontSize: '0.82rem',
                        border: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        cursor: 'pointer',
                        boxShadow: '0 3px 12px rgba(16, 185, 129, 0.4)'
                      }}
                    >
                      <CheckCircle2 size={15} />
                      <span>{modalPreparedCount > 0 ? `Mark Remaining Prepared (${modalTotalCount - modalPreparedCount})` : 'Mark All Prepared'}</span>
                    </button>
                  )}

                  <button
                    onClick={() => setSelectedDetailTicket(null)}
                    style={{
                      padding: '0.55rem 1rem',
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--bg-tertiary, #1e293b)',
                      color: 'var(--text-main, #ffffff)',
                      fontWeight: 700,
                      fontSize: '0.8rem',
                      border: '1px solid var(--border-subtle, rgba(255,255,255,0.15))',
                      cursor: 'pointer'
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
  );
}
