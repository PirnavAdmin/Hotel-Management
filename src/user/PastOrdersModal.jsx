import React, { useState, useMemo, useEffect } from 'react';
import { 
  X, Receipt, Search, Eye, Calendar, CalendarDays, CalendarRange,
  Clock, ChevronLeft, ChevronRight, Layers, Filter, CheckCircle2, RotateCcw 
} from 'lucide-react';
import { formatCurrency } from '../utils/formatCurrency';
import { dedupeOrders, sortOrdersBySettlementTime } from '../utils/orderDedupe';
const TODAY_DATE_STR = new Date().toLocaleDateString('en-IN', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

const formatOrderDate = (order, fallbackDate = TODAY_DATE_STR) => {
  if (!order) return fallbackDate;
  if (order.date) return order.date;
  if (order.settledDate) return order.settledDate;
  if (order.orderTimestamp) {
    const date = new Date(Number(order.orderTimestamp));
    if (!Number.isNaN(date.getTime())) {
      return date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    }
  }
  return fallbackDate;
};

const formatOrderTime = (value) => {
  const text = String(value || "").trim();
  const match = text.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?$/i);
  if (!match) return text;
  let hour = Number(match[1]);
  let suffix = match[3]?.toUpperCase();
  if (!suffix) {
    suffix = hour >= 12 ? "PM" : "AM";
    hour %= 12;
    if (hour === 0) hour = 12;
  }
  return `${String(hour).padStart(2, "0")}:${match[2]} ${suffix}`;
};

const parseDisplayDate = (value) => {
  if (!value) return null;
  const text = String(value).trim();
  const localized = text.match(/^(\d{1,2})\s+([a-z]{3,})\s+(\d{4})$/i);
  if (localized) {
    const [, day, monthName, year] = localized;
    const month = new Date(`${monthName} 1, ${year}`).getMonth();
    if (!Number.isNaN(month)) return new Date(Number(year), month, Number(day));
  }
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const formatUSDateInput = (value) => {
  const date = parseDisplayDate(value);
  if (!date) return '';
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${month}/${day}/${date.getFullYear()}`;
};

const compareDatesNewestFirst = (a, b) =>
  (parseDisplayDate(b)?.getTime() || 0) - (parseDisplayDate(a)?.getTime() || 0);

export function PastOrdersModal({ pastOrders = [], onClose, onReprintReceipt }) {
  const uniquePastOrders = useMemo(() => dedupeOrders(pastOrders), [pastOrders]);


  // Helper to parse date from order safely
  const parseOrderDate = (order) => {
    const storedDate = parseDisplayDate(order.settledDate || order.date);
    if (storedDate) return storedDate;
    if (order.orderTimestamp) {
      const d = new Date(Number(order.orderTimestamp));
      if (!isNaN(d.getTime())) return d;
    }
    return new Date();
  };

  const getMonthStr = (d) => {
    return d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
  };

  const currentMonthStr = useMemo(() => {
    return new Date().toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
  }, []);

  // Extract all unique dates from pastOrders sorted newest first
  const availableDates = useMemo(() => {
    const datesSet = new Set();
    datesSet.add(TODAY_DATE_STR);
    uniquePastOrders.forEach(o => {
      const dStr = formatOrderDate(o);
      if (dStr) datesSet.add(dStr);
    });
    return Array.from(datesSet).sort(compareDatesNewestFirst);
  }, [uniquePastOrders]);

  // Extract all unique months from pastOrders sorted newest first
  const availableMonths = useMemo(() => {
    const monthsSet = new Set();
    monthsSet.add(currentMonthStr);
    uniquePastOrders.forEach(o => {
      const d = parseOrderDate(o);
      monthsSet.add(getMonthStr(d));
    });
    return Array.from(monthsSet).sort((a, b) =>
      compareDatesNewestFirst(`01 ${a}`, `01 ${b}`),
    );
  }, [uniquePastOrders, currentMonthStr]);

  const [selectedDate, setSelectedDate] = useState(() => {
    const hasToday = uniquePastOrders && uniquePastOrders.some(o => formatOrderDate(o) === TODAY_DATE_STR);
    if (hasToday) return TODAY_DATE_STR;
    if (uniquePastOrders && uniquePastOrders.length > 0) return formatOrderDate(uniquePastOrders[0]);
    return TODAY_DATE_STR;
  });
  const [selectedDateText, setSelectedDateText] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(currentMonthStr);
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [customStartDateText, setCustomStartDateText] = useState('');
  const [customEndDateText, setCustomEndDateText] = useState('');
  const [viewMode, setViewMode] = useState('single_day'); // 'single_day' | 'monthly' | 'custom' | 'grouped_all'
  const [searchTerm, setSearchTerm] = useState('');
  const countForSelectedDate = uniquePastOrders.filter(
    (order) => formatOrderDate(order) === selectedDate,
  ).length;

  // Convert Date or dateString to "YYYY-MM-DD" for HTML <input type="date">
  const getYYYYMMDD = (input) => {
    if (!input) return '';
    try {
      const d = input instanceof Date ? input : new Date(input);
      if (!isNaN(d.getTime())) {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      }
    } catch {}
    return '';
  };

  const formatDateForInput = (isoDate) => {
    if (!isoDate) return '';
    const [year, month, day] = isoDate.split('-');
    return year && month && day ? `${month}/${day}/${year}` : '';
  };

  const parseDateInput = (value) => {
    const match = value.trim().match(/^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{4})$/);
    if (!match) return '';
    const [, monthText, dayText, yearText] = match;
    const month = Number(monthText);
    const day = Number(dayText);
    const year = Number(yearText);
    const parsed = new Date(year, month - 1, day);
    if (
      parsed.getFullYear() !== year ||
      parsed.getMonth() !== month - 1 ||
      parsed.getDate() !== day
    ) return '';
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  };

  const handleCustomDateTextChange = (value, setText, setDate) => {
    setText(value);
    const parsed = parseDateInput(value);
    if (parsed) setDate(parsed);
    else if (!value.trim()) setDate('');
  };

  useEffect(() => {
    setSelectedDateText(formatUSDateInput(selectedDate));
  }, [selectedDate]);

  // Convert "Oct 2026" to "2026-10" for HTML <input type="month">
  const getYYYYMM = (monthStr) => {
    try {
      const d = new Date(monthStr);
      if (!isNaN(d.getTime())) {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        return `${year}-${month}`;
      }
    } catch {}
    return '';
  };

  // Convert "YYYY-MM-DD" input value back to "DD MMM YYYY"
  const handleDateInputChange = (e) => {
    const val = e.target.value;
    if (!val) return;
    try {
      const [y, m, d] = val.split('-').map(Number);
      const dateObj = new Date(y, m - 1, d);
      const formatted = dateObj.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
      setSelectedDate(formatted);
      setSelectedDateText(formatDateForInput(val));
      setViewMode('single_day');
    } catch {}
  };

  // Convert "YYYY-MM" input value back to "MMM YYYY"
  const handleMonthInputChange = (e) => {
    const val = e.target.value;
    if (!val) return;
    try {
      const [y, m] = val.split('-').map(Number);
      const dateObj = new Date(y, m - 1, 1);
      const formatted = getMonthStr(dateObj);
      setSelectedMonth(formatted);
      setViewMode('monthly');
    } catch {}
  };


  // Search filtered orders across all history
  const searchFilteredOrders = useMemo(() => {
    return uniquePastOrders.filter(o => {
      const search = searchTerm.toLowerCase().trim();
      if (!search) return true;
      return (
        (o.tableName || '').toLowerCase().includes(search) ||
        (o.invoiceNo || '').toLowerCase().includes(search) ||
        (o.server || '').toLowerCase().includes(search) ||
        (o.paymentMethod || '').toLowerCase().includes(search) ||
        (o.date || '').toLowerCase().includes(search)
      );
    });
  }, [uniquePastOrders, searchTerm]);

  // Single day filtered orders
  const singleDayOrders = useMemo(() => {
    return sortOrdersBySettlementTime(
      searchFilteredOrders.filter(o => formatOrderDate(o) === selectedDate),
    );
  }, [searchFilteredOrders, selectedDate]);

  // Monthly filtered orders
  const monthlyOrders = useMemo(() => {
    const filtered = searchFilteredOrders.filter(o => {
      const d = parseOrderDate(o);
      return getMonthStr(d) === selectedMonth;
    });
    return sortOrdersBySettlementTime(filtered);
  }, [searchFilteredOrders, selectedMonth]);

  // Custom date range filtered orders
  const customRangeOrders = useMemo(() => {
    const filtered = searchFilteredOrders.filter(o => {
      if (!customStartDate && !customEndDate) return true;
      const orderDate = parseOrderDate(o);
      const orderTime = orderDate.getTime();

      if (customStartDate) {
        const start = new Date(customStartDate);
        start.setHours(0, 0, 0, 0);
        if (orderTime < start.getTime()) return false;
      }
      if (customEndDate) {
        const end = new Date(customEndDate);
        end.setHours(23, 59, 59, 999);
        if (orderTime > end.getTime()) return false;
      }
      return true;
    });
    return sortOrdersBySettlementTime(filtered);
  }, [searchFilteredOrders, customStartDate, customEndDate]);

  // Grouped orders by date
  const groupedOrdersByDate = useMemo(() => {
    const map = {};
    searchFilteredOrders.forEach(order => {
      const d = formatOrderDate(order);
      if (!map[d]) map[d] = [];
      map[d].push(order);
    });

    const sortedKeys = Object.keys(map).sort(compareDatesNewestFirst);

    return sortedKeys.map(dateKey => {
      const orders = sortOrdersBySettlementTime(map[dateKey]);
      const totalRev = orders.reduce((sum, o) => sum + (o.grandTotal || 0), 0);
      return {
        date: dateKey,
        orders,
        count: orders.length,
        totalRevenue: totalRev,
        avgValue: orders.length ? totalRev / orders.length : 0
      };
    });
  }, [searchFilteredOrders]);

  // Day navigation step helpers
  const handlePrevDay = () => {
    const idx = availableDates.indexOf(selectedDate);
    if (idx !== -1 && idx < availableDates.length - 1) {
      setSelectedDate(availableDates[idx + 1]);
    } else {
      try {
        const d = new Date(selectedDate);
        d.setDate(d.getDate() - 1);
        const prevStr = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
        setSelectedDate(prevStr);
      } catch {}
    }
    setViewMode('single_day');
  };

  const handleNextDay = () => {
    const idx = availableDates.indexOf(selectedDate);
    if (idx > 0) {
      setSelectedDate(availableDates[idx - 1]);
    } else {
      try {
        const d = new Date(selectedDate);
        d.setDate(d.getDate() + 1);
        const nextStr = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
        setSelectedDate(nextStr);
      } catch {}
    }
    setViewMode('single_day');
  };

  // Month navigation step helpers
  const handlePrevMonth = () => {
    const idx = availableMonths.indexOf(selectedMonth);
    if (idx !== -1 && idx < availableMonths.length - 1) {
      setSelectedMonth(availableMonths[idx + 1]);
    } else {
      try {
        const d = new Date(selectedMonth);
        d.setMonth(d.getMonth() - 1);
        setSelectedMonth(getMonthStr(d));
      } catch {}
    }
    setViewMode('monthly');
  };

  const handleNextMonth = () => {
    const idx = availableMonths.indexOf(selectedMonth);
    if (idx > 0) {
      setSelectedMonth(availableMonths[idx - 1]);
    } else {
      try {
        const d = new Date(selectedMonth);
        d.setMonth(d.getMonth() + 1);
        setSelectedMonth(getMonthStr(d));
      } catch {}
    }
    setViewMode('monthly');
  };

  // Custom date preset handlers
  const handlePreset = (preset) => {
    const now = new Date();
    if (preset === 'today') {
      const todayStr = getYYYYMMDD(now);
      setCustomStartDate(todayStr);
      setCustomEndDate(todayStr);
      setCustomStartDateText(formatDateForInput(todayStr));
      setCustomEndDateText(formatDateForInput(todayStr));
    } else if (preset === '7days') {
      const start = new Date();
      start.setDate(now.getDate() - 6);
      setCustomStartDate(getYYYYMMDD(start));
      setCustomEndDate(getYYYYMMDD(now));
      setCustomStartDateText(formatDateForInput(getYYYYMMDD(start)));
      setCustomEndDateText(formatDateForInput(getYYYYMMDD(now)));
    } else if (preset === 'month') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      setCustomStartDate(getYYYYMMDD(start));
      setCustomEndDate(getYYYYMMDD(end));
      setCustomStartDateText(formatDateForInput(getYYYYMMDD(start)));
      setCustomEndDateText(formatDateForInput(getYYYYMMDD(end)));
    } else if (preset === '30days') {
      const start = new Date();
      start.setDate(now.getDate() - 29);
      setCustomStartDate(getYYYYMMDD(start));
      setCustomEndDate(getYYYYMMDD(now));
      setCustomStartDateText(formatDateForInput(getYYYYMMDD(start)));
      setCustomEndDateText(formatDateForInput(getYYYYMMDD(now)));
    } else if (preset === 'all') {
      setCustomStartDate('');
      setCustomEndDate('');
      setCustomStartDateText('');
      setCustomEndDateText('');
    }
    setViewMode('custom');
  };

  // Active view orders
  const activeOrders = useMemo(() => {
    if (viewMode === 'single_day') return singleDayOrders;
    if (viewMode === 'monthly') return monthlyOrders;
    if (viewMode === 'custom') return customRangeOrders;
    return sortOrdersBySettlementTime(searchFilteredOrders);
  }, [viewMode, singleDayOrders, monthlyOrders, customRangeOrders, searchFilteredOrders]);

  const totalCollected = activeOrders.reduce((sum, o) => sum + (o.grandTotal || 0), 0);
  const averageTicket = activeOrders.length ? totalCollected / activeOrders.length : 0;



  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'var(--modal-overlay)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 100,
      padding: '1rem'
    }}>
      <div style={{
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-subtle)',
        width: '100%',
        maxWidth: '920px',
        borderRadius: 'var(--radius-lg)',
        boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        maxHeight: '94vh',
        height: '92vh'
      }}>
        {/* Compact Header */}
        <div style={{
          padding: '0.65rem 1.25rem',
          borderBottom: '1px solid var(--border-subtle)',
          background: 'var(--bg-tertiary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Receipt size={18} color="var(--accent-amber)" />
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                Sales Invoices & Settled Orders
              </h3>
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Calendar size={12} color="var(--accent-amber)" />
              <span>
                {viewMode === 'single_day' && `Selected Date: ${selectedDate} (${countForSelectedDate} Invoices)`}
                {viewMode === 'monthly' && `Selected Month: ${selectedMonth} (${monthlyOrders.length} Invoices)`}
                {viewMode === 'custom' && `Custom Range: ${customStartDate ? customStartDate : 'All Start'} to ${customEndDate ? customEndDate : 'Present'} (${customRangeOrders.length} Invoices)`}
                {viewMode === 'grouped_all' && `All Dates Grouped Breakdown (${uniquePastOrders.length} Total Invoices)`}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'var(--surface-tint)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-muted)',
              display: 'flex',
              padding: '5px',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* View Mode & Filter Navigation Bar */}
        <div style={{
          padding: '0.45rem 1.25rem',
          background: 'var(--surface-tint)',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.45rem'
        }}>
          {/* Top Row: Mode Switcher Tabs */}
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
            <div style={{ display: 'flex', gap: '3px', background: 'var(--bg-primary)', padding: '2px', borderRadius: '6px', border: '1px solid var(--border-subtle)', flexWrap: 'wrap' }}>
              <button
                onClick={() => setViewMode('single_day')}
                style={{
                  padding: '0.3rem 0.65rem',
                  borderRadius: '5px',
                  border: 'none',
                  background: viewMode === 'single_day' ? 'var(--accent-amber)' : 'transparent',
                  color: viewMode === 'single_day' ? '#000' : 'var(--text-muted)',
                  fontSize: '0.74rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  transition: 'all 0.15s ease'
                }}
              >
                <Calendar size={13} />
                Daily View
              </button>
              <button
                onClick={() => setViewMode('monthly')}
                style={{
                  padding: '0.3rem 0.65rem',
                  borderRadius: '5px',
                  border: 'none',
                  background: viewMode === 'monthly' ? 'var(--accent-amber)' : 'transparent',
                  color: viewMode === 'monthly' ? '#000' : 'var(--text-muted)',
                  fontSize: '0.74rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  transition: 'all 0.15s ease'
                }}
              >
                <CalendarDays size={13} />
                Monthly View
              </button>
              <button
                onClick={() => setViewMode('custom')}
                style={{
                  padding: '0.3rem 0.65rem',
                  borderRadius: '5px',
                  border: 'none',
                  background: viewMode === 'custom' ? 'var(--accent-amber)' : 'transparent',
                  color: viewMode === 'custom' ? '#000' : 'var(--text-muted)',
                  fontSize: '0.74rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  transition: 'all 0.15s ease'
                }}
              >
                <CalendarRange size={13} />
                Custom Range
              </button>
              <button
                onClick={() => setViewMode('grouped_all')}
                style={{
                  padding: '0.3rem 0.65rem',
                  borderRadius: '5px',
                  border: 'none',
                  background: viewMode === 'grouped_all' ? 'var(--accent-amber)' : 'transparent',
                  color: viewMode === 'grouped_all' ? '#000' : 'var(--text-muted)',
                  fontSize: '0.74rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  transition: 'all 0.15s ease'
                }}
              >
                <Layers size={13} />
                Day-by-Day Breakdown
              </button>
            </div>

            {/* Quick summary badge on right */}
            <div style={{ fontSize: '0.74rem', color: 'var(--text-dim)', fontWeight: 600 }}>
              {viewMode === 'single_day' && `Date: ${selectedDate}`}
              {viewMode === 'monthly' && `Month: ${selectedMonth}`}
              {viewMode === 'custom' && (customStartDate || customEndDate ? `Filtered Range` : `All Range`)}
              {viewMode === 'grouped_all' && `${groupedOrdersByDate.length} Active Days`}
            </div>
          </div>

          {/* Bottom Row: Controls Specific to Selected Tab */}
          {viewMode === 'single_day' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button
                onClick={handlePrevDay}
                title="Previous Day"
                style={{
                  background: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-main)',
                  padding: '0.4rem 0.6rem',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '0.76rem',
                  fontWeight: 700
                }}
              >
                <ChevronLeft size={16} />
                Prev Day
              </button>

              {/* Quick Date Select Dropdown */}
              <select
                value={selectedDate}
                onChange={e => {
                  setSelectedDate(e.target.value);
                  setViewMode('single_day');
                }}
                style={{
                  background: 'var(--bg-tertiary)',
                  border: '1px solid var(--accent-amber)',
                  color: 'var(--text-main)',
                  padding: '0.4rem 0.75rem',
                  borderRadius: '6px',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                {availableDates.map(d => {
                  const cnt = uniquePastOrders.filter(o => formatOrderDate(o) === d).length;
                  return (
                    <option key={d} value={d}>
                      📅 {d} ({cnt} {cnt === 1 ? 'invoice' : 'invoices'})
                    </option>
                  );
                })}
              </select>

              {/* Native HTML DatePicker */}
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="MM/DD/YYYY"
                  aria-label="Selected date (month/day/year)"
                  value={selectedDateText || formatUSDateInput(selectedDate)}
                  onChange={(event) => {
                    const value = event.target.value;
                    setSelectedDateText(value);
                    const isoDate = parseDateInput(value);
                    if (isoDate) handleDateInputChange({ target: { value: isoDate } });
                  }}
                  style={{
                    width: '142px',
                    boxSizing: 'border-box',
                    background: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-main)',
                    padding: '0.4rem 2rem 0.4rem 0.55rem',
                    borderRadius: '6px',
                    fontSize: '0.78rem',
                  }}
                />
                <input
                  type="date"
                  value={getYYYYMMDD(selectedDate)}
                  onChange={handleDateInputChange}
                  onClick={(event) => { try { event.currentTarget.showPicker(); } catch {} }}
                  aria-label="Open calendar"
                  title="Pick specific date calendar"
                  style={{ position: 'absolute', right: '0.35rem', width: '1.25rem', height: '1.5rem', opacity: 0, cursor: 'pointer' }}
                />
                <CalendarDays size={15} style={{ position: 'absolute', right: '0.5rem', pointerEvents: 'none', color: 'var(--text-muted)' }} />
              </div>

              <button
                onClick={handleNextDay}
                title="Next Day"
                style={{
                  background: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-main)',
                  padding: '0.4rem 0.6rem',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '0.76rem',
                  fontWeight: 700
                }}
              >
                Next Day
                <ChevronRight size={16} />
              </button>

              {selectedDate !== TODAY_DATE_STR && (
                <button
                  onClick={() => {
                    setSelectedDate(TODAY_DATE_STR);
                    setViewMode('single_day');
                  }}
                  style={{
                    background: 'rgba(245, 158, 11, 0.15)',
                    border: '1px solid var(--accent-amber)',
                    color: 'var(--accent-amber-light)',
                    padding: '0.4rem 0.75rem',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '0.76rem',
                    fontWeight: 800
                  }}
                >
                  Today
                </button>
              )}
            </div>
          )}

          {viewMode === 'monthly' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button
                onClick={handlePrevMonth}
                title="Previous Month"
                style={{
                  background: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-main)',
                  padding: '0.4rem 0.6rem',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '0.76rem',
                  fontWeight: 700
                }}
              >
                <ChevronLeft size={16} />
                Prev Month
              </button>

              {/* Month Select Dropdown */}
              <select
                value={selectedMonth}
                onChange={e => {
                  setSelectedMonth(e.target.value);
                  setViewMode('monthly');
                }}
                style={{
                  background: 'var(--bg-tertiary)',
                  border: '1px solid var(--accent-amber)',
                  color: 'var(--text-main)',
                  padding: '0.4rem 0.75rem',
                  borderRadius: '6px',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                {availableMonths.map(m => {
                  const cnt = uniquePastOrders.filter(o => getMonthStr(parseOrderDate(o)) === m).length;
                  return (
                    <option key={m} value={m}>
                      🗓️ {m} ({cnt} {cnt === 1 ? 'invoice' : 'invoices'})
                    </option>
                  );
                })}
              </select>

              {/* Native HTML Month Picker */}
              <input
                type="month"
                value={getYYYYMM(selectedMonth)}
                onChange={handleMonthInputChange}
                style={{
                  background: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-main)',
                  padding: '0.35rem 0.5rem',
                  borderRadius: '6px',
                  fontSize: '0.78rem',
                  cursor: 'pointer'
                }}
                title="Pick specific month"
              />

              <button
                onClick={handleNextMonth}
                title="Next Month"
                style={{
                  background: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-main)',
                  padding: '0.4rem 0.6rem',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '0.76rem',
                  fontWeight: 700
                }}
              >
                Next Month
                <ChevronRight size={16} />
              </button>

              {selectedMonth !== currentMonthStr && (
                <button
                  onClick={() => {
                    setSelectedMonth(currentMonthStr);
                    setViewMode('monthly');
                  }}
                  style={{
                    background: 'rgba(245, 158, 11, 0.15)',
                    border: '1px solid var(--accent-amber)',
                    color: 'var(--accent-amber-light)',
                    padding: '0.4rem 0.75rem',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '0.76rem',
                    fontWeight: 800
                  }}
                >
                  This Month
                </button>
              )}
            </div>
          )}

          {viewMode === 'custom' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 700 }}>From:</span>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="MM/DD/YYYY"
                    aria-label="From date (month/day/year)"
                    value={customStartDateText || formatDateForInput(customStartDate)}
                    onChange={e => handleCustomDateTextChange(e.target.value, setCustomStartDateText, setCustomStartDate)}
                    style={{
                      background: 'var(--bg-tertiary)',
                      border: '1px solid var(--accent-amber)',
                      color: 'var(--text-main)',
                      padding: '0.35rem 2rem 0.35rem 0.55rem',
                      borderRadius: '6px',
                      fontSize: '0.78rem',
                      width: '135px',
                    }}
                  />
                  <input
                    type="date"
                    aria-label="Choose from date"
                    value={customStartDate}
                    onChange={e => {
                      setCustomStartDate(e.target.value);
                      setCustomStartDateText(formatDateForInput(e.target.value));
                    }}
                    style={{ position: 'absolute', right: '0.35rem', width: '1.25rem', opacity: 0, cursor: 'pointer' }}
                  />
                  <CalendarDays size={15} style={{ position: 'absolute', right: '0.5rem', pointerEvents: 'none', color: 'var(--text-muted)' }} />
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 700 }}>To:</span>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="MM/DD/YYYY"
                    aria-label="To date (month/day/year)"
                    value={customEndDateText || formatDateForInput(customEndDate)}
                    onChange={e => handleCustomDateTextChange(e.target.value, setCustomEndDateText, setCustomEndDate)}
                    style={{
                      background: 'var(--bg-tertiary)',
                      border: '1px solid var(--accent-amber)',
                      color: 'var(--text-main)',
                      padding: '0.35rem 2rem 0.35rem 0.55rem',
                      borderRadius: '6px',
                      fontSize: '0.78rem',
                      width: '135px',
                    }}
                  />
                  <input
                    type="date"
                    aria-label="Choose to date"
                    value={customEndDate}
                    onChange={e => {
                      setCustomEndDate(e.target.value);
                      setCustomEndDateText(formatDateForInput(e.target.value));
                    }}
                    style={{ position: 'absolute', right: '0.35rem', width: '1.25rem', opacity: 0, cursor: 'pointer' }}
                  />
                  <CalendarDays size={15} style={{ position: 'absolute', right: '0.5rem', pointerEvents: 'none', color: 'var(--text-muted)' }} />
                </div>
              </div>

              {/* Quick Preset Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                {[
                  { id: 'today', label: 'Today' },
                  { id: '7days', label: 'Last 7 Days' },
                  { id: 'month', label: 'This Month' },
                  { id: '30days', label: 'Last 30 Days' },
                  { id: 'all', label: 'All History' }
                ].map(p => (
                  <button
                    key={p.id}
                    onClick={() => handlePreset(p.id)}
                    style={{
                      background: 'var(--surface-tint)',
                      border: '1px solid var(--border-subtle)',
                      color: 'var(--text-main)',
                      padding: '0.32rem 0.6rem',
                      borderRadius: '5px',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Dynamic Compact Stats Row */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '0.5rem',
          padding: '0.35rem 1.25rem',
          background: 'var(--bg-primary)',
          borderBottom: '1px solid var(--border-subtle)'
        }}>
          <div style={{
            background: 'var(--bg-secondary)',
            padding: '0.35rem 0.75rem',
            borderRadius: '6px',
            border: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>
              {viewMode === 'single_day' && `Bills Settled`}
              {viewMode === 'monthly' && `Monthly Bills`}
              {viewMode === 'custom' && `Range Bills`}
              {viewMode === 'grouped_all' && 'Total Bills'}
            </span>
            <div style={{ fontSize: '0.98rem', fontWeight: 800, color: 'var(--text-main)' }}>
              {activeOrders.length} {activeOrders.length === 1 ? 'Bill' : 'Bills'}
            </div>
          </div>

          <div style={{
            background: 'var(--bg-secondary)',
            padding: '0.35rem 0.75rem',
            borderRadius: '6px',
            border: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>
              {viewMode === 'single_day' && `Daily Revenue`}
              {viewMode === 'monthly' && `Monthly Revenue`}
              {viewMode === 'custom' && `Total Revenue`}
              {viewMode === 'grouped_all' && 'Total Revenue'}
            </span>
            <div className="font-mono" style={{ fontSize: '0.98rem', fontWeight: 800, color: 'var(--accent-amber-light)' }}>
              {formatCurrency(totalCollected)}
            </div>
          </div>

          <div style={{
            background: 'var(--bg-secondary)',
            padding: '0.35rem 0.75rem',
            borderRadius: '6px',
            border: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>
              {viewMode === 'single_day' && `Avg Value`}
              {viewMode === 'monthly' && `Monthly Avg`}
              {viewMode === 'custom' && `Range Avg`}
              {viewMode === 'grouped_all' && 'Avg Value'}
            </span>
            <div className="font-mono" style={{ fontSize: '0.98rem', fontWeight: 800, color: 'var(--status-vacant)' }}>
              {formatCurrency(averageTicket)}
            </div>
          </div>
        </div>

        {/* Compact Search */}
        <div style={{ padding: '0.35rem 1.25rem', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-secondary)' }}>
          <div style={{ position: 'relative' }}>
            <Search size={14} color="var(--text-dim)" style={{ position: 'absolute', left: '10px', top: '8px' }} />
            <input
              type="text"
              placeholder="Search by invoice #, table name, server, payment method..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                background: 'var(--bg-tertiary)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                padding: '0.32rem 0.75rem 0.32rem 1.95rem',
                color: 'var(--text-main)',
                fontSize: '0.78rem'
              }}
            />
          </div>
        </div>

        {/* Main Orders Display */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0.5rem 1.25rem' }}>
          {viewMode === 'single_day' && (
            /* Single Day View */
            <div>
              <div style={{
                marginBottom: '0.35rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingBottom: '0.25rem',
                borderBottom: '1px dashed var(--border-subtle)'
              }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--accent-amber)' }}>
                  📅 Showing Invoices for {selectedDate}
                </span>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  Total Invoices: <strong>{singleDayOrders.length}</strong>
                </span>
              </div>

              {singleDayOrders.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-dim)' }}>
                  <Calendar size={32} color="var(--border-subtle)" style={{ marginBottom: '0.35rem' }} />
                  <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-main)' }}>
                    No invoices found for {selectedDate}
                  </div>
                  <div style={{ fontSize: '0.76rem', marginTop: '3px', color: 'var(--text-muted)' }}>
                    Use the date navigation controls or dropdown above to select another date.
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  {singleDayOrders.map((order, idx) => (
                    <OrderCard key={idx} order={order} onReprintReceipt={onReprintReceipt} />
                  ))}
                </div>
              )}
            </div>
          )}

          {viewMode === 'monthly' && (
            /* Monthly View */
            <div>
              <div style={{
                marginBottom: '0.35rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingBottom: '0.25rem',
                borderBottom: '1px dashed var(--border-subtle)'
              }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--accent-amber)' }}>
                  🗓️ Showing Invoices for Month: {selectedMonth}
                </span>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  Total Invoices: <strong>{monthlyOrders.length}</strong> • Total: <strong className="font-mono" style={{ color: 'var(--accent-amber-light)' }}>{formatCurrency(totalCollected)}</strong>
                </span>
              </div>

              {monthlyOrders.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-dim)' }}>
                  <CalendarDays size={32} color="var(--border-subtle)" style={{ marginBottom: '0.35rem' }} />
                  <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-main)' }}>
                    No invoices recorded for {selectedMonth}
                  </div>
                  <div style={{ fontSize: '0.76rem', marginTop: '3px', color: 'var(--text-muted)' }}>
                    Use the month navigation buttons or dropdown above to view past months.
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  {monthlyOrders.map((order, idx) => (
                    <OrderCard key={idx} order={order} onReprintReceipt={onReprintReceipt} />
                  ))}
                </div>
              )}
            </div>
          )}

          {viewMode === 'custom' && (
            /* Custom Date Range View */
            <div>
              <div style={{
                marginBottom: '0.35rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingBottom: '0.25rem',
                borderBottom: '1px dashed var(--border-subtle)',
                flexWrap: 'wrap',
                gap: '0.35rem'
              }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--accent-amber)' }}>
                  📅 Showing Invoices from {customStartDate ? customStartDate : 'All History'} to {customEndDate ? customEndDate : 'Present'}
                </span>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  Found <strong>{customRangeOrders.length}</strong> Invoices • Total: <strong className="font-mono" style={{ color: 'var(--accent-amber-light)' }}>{formatCurrency(totalCollected)}</strong>
                </span>
              </div>

              {customRangeOrders.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-dim)' }}>
                  <CalendarRange size={32} color="var(--border-subtle)" style={{ marginBottom: '0.35rem' }} />
                  <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-main)' }}>
                    No invoices match the selected date range
                  </div>
                  <div style={{ fontSize: '0.76rem', marginTop: '3px', color: 'var(--text-muted)' }}>
                    Adjust the "From" and "To" dates or click quick presets like "This Month" or "All History".
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  {customRangeOrders.map((order, idx) => (
                    <OrderCard key={idx} order={order} onReprintReceipt={onReprintReceipt} />
                  ))}
                </div>
              )}
            </div>
          )}

          {viewMode === 'grouped_all' && (
            /* Grouped Day-by-Day View */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {groupedOrdersByDate.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-dim)', fontSize: '0.85rem' }}>
                  No completed orders found matching your search.
                </div>
              ) : (
                groupedOrdersByDate.map(group => (
                  <div
                    key={group.date}
                    style={{
                      background: 'var(--surface-tint)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-md)',
                      overflow: 'hidden'
                    }}
                  >
                    {/* Group Header Banner */}
                    <div style={{
                      padding: '0.75rem 1rem',
                      background: 'var(--bg-tertiary)',
                      borderBottom: '1px solid var(--border-subtle)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '0.5rem'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Calendar size={16} color="var(--accent-amber)" />
                        <span style={{ fontWeight: 800, color: 'var(--text-main)', fontSize: '0.92rem' }}>
                          {group.date}
                        </span>
                        <span style={{
                          background: 'rgba(245, 158, 11, 0.15)',
                          color: 'var(--accent-amber-light)',
                          fontSize: '0.72rem',
                          fontWeight: 800,
                          padding: '2px 8px',
                          borderRadius: '12px'
                        }}>
                          {group.count} {group.count === 1 ? 'Invoice' : 'Invoices'}
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '1.2rem' }}>
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                          Daily Total: <strong className="font-mono" style={{ color: 'var(--accent-amber-light)', fontSize: '0.9rem' }}>{formatCurrency(group.totalRevenue)}</strong>
                        </span>
                        <button
                          onClick={() => {
                            setSelectedDate(group.date);
                            setViewMode('single_day');
                          }}
                          style={{
                            background: 'transparent',
                            border: '1px solid var(--border-subtle)',
                            color: 'var(--text-main)',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            padding: '3px 8px',
                            borderRadius: '4px',
                            cursor: 'pointer'
                          }}
                        >
                          Focus Day ➔
                        </button>
                      </div>
                    </div>

                    {/* Group Orders List */}
                    <div style={{ padding: '0.45rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                      {group.orders.map((order, idx) => (
                        <OrderCard key={idx} order={order} onReprintReceipt={onReprintReceipt} />
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Compact Footer */}
        <div style={{
          padding: '0.45rem 1.25rem',
          background: 'var(--bg-tertiary)',
          borderTop: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            Showing <strong>{activeOrders.length}</strong> of <strong>{uniquePastOrders.length}</strong> total settled invoices
          </span>
          <button
            onClick={onClose}
            style={{
              padding: '0.35rem 1.1rem',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--bg-secondary)',
              color: 'var(--text-main)',
              fontSize: '0.78rem',
              fontWeight: 700,
              cursor: 'pointer',
              border: '1px solid var(--border-subtle)'
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// Compact Subcomponent for individual invoice item card (fits 5-6 invoices concurrently)
function OrderCard({ order, onReprintReceipt }) {
  return (
    <div
      onClick={() => onReprintReceipt(order)}
      style={{
        background: 'var(--bg-tertiary)',
        borderRadius: '6px',
        padding: '0.42rem 0.85rem',
        border: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        cursor: 'pointer',
        transition: 'all 0.15s ease'
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = 'rgba(245, 158, 11, 0.45)';
        e.currentTarget.style.background = 'rgba(var(--surface-rgb),0.04)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = 'var(--border-subtle)';
        e.currentTarget.style.background = 'var(--bg-tertiary)';
      }}
    >
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
          <span style={{ fontWeight: 800, color: 'var(--text-main)', fontSize: '0.86rem' }}>
            {order.tableName || (order.tableId != null ? `Table ${order.tableId}` : "Table unavailable")}
          </span>
          <span className="font-mono" style={{ fontSize: '0.72rem', color: 'var(--accent-amber-light)', fontWeight: 800 }}>
            {order.invoiceNo}
          </span>
          <span style={{
            background: 'rgba(16, 185, 129, 0.15)',
            color: 'var(--status-vacant)',
            fontSize: '0.64rem',
            fontWeight: 700,
            padding: '1px 5px',
            borderRadius: '4px',
            textTransform: 'uppercase'
          }}>
            {order.paymentMethod}
          </span>
        </div>

        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', color: 'var(--text-main)', fontWeight: 600 }}>
            <Calendar size={11} color="var(--accent-amber)" />
            {formatOrderDate(order)}
          </span>
          <span>•</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', color: 'var(--text-main)', fontWeight: 600 }}>
            <Clock size={11} color="var(--accent-amber)" />
            {formatOrderTime(order.settledAt || order.orderTime) || "Time unavailable"}
          </span>
          <span>•</span>
          <span>Server: <strong>{order.server || "Staff unavailable"}</strong></span>
          <span>•</span>
          <span>{(Array.isArray(order.items) ? order.items : []).reduce((sum, item) => sum + Number(item.quantity || item.qty || 1), 0)} items</span>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
        <div className="font-mono" style={{ fontSize: '1.02rem', fontWeight: 800, color: 'var(--text-main)' }}>
          {formatCurrency(order.grandTotal)}
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onReprintReceipt(order);
          }}
          style={{
            padding: '0.28rem 0.65rem',
            borderRadius: '4px',
            background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.18), rgba(234, 88, 12, 0.18))',
            color: 'var(--accent-amber-light)',
            border: '1px solid rgba(245, 158, 11, 0.45)',
            fontSize: '0.72rem',
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            gap: '0.3rem',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
          title="Open Receipt Pop-up"
        >
          <Eye size={13} />
          <span>Receipt</span>
        </button>
      </div>
    </div>
  );
}
