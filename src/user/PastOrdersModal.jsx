import React, { useState, useMemo } from 'react';
import { X, Receipt, Search, Eye, Calendar, Clock, ChevronLeft, ChevronRight, Layers, Filter, CheckCircle2 } from 'lucide-react';
import { formatCurrency } from '../utils/formatCurrency';

export function PastOrdersModal({ pastOrders = [], onClose, onReprintReceipt }) {
  const todayDateStr = useMemo(() => {
    return new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  }, []);

  // Extract all unique dates from pastOrders sorted newest first
  const availableDates = useMemo(() => {
    const datesSet = new Set();
    datesSet.add(todayDateStr);
    pastOrders.forEach(o => {
      if (o.date) datesSet.add(o.date);
    });
    return Array.from(datesSet).sort((a, b) => {
      const timeA = new Date(a).getTime() || 0;
      const timeB = new Date(b).getTime() || 0;
      return timeB - timeA;
    });
  }, [pastOrders, todayDateStr]);

  const [selectedDate, setSelectedDate] = useState(todayDateStr);
  const [viewMode, setViewMode] = useState('single_day'); // 'single_day' | 'grouped_all'
  const [searchTerm, setSearchTerm] = useState('');

  // Convert "DD MMM YYYY" string to "YYYY-MM-DD" for HTML <input type="date">
  const getYYYYMMDD = (dateString) => {
    if (!dateString) return '';
    try {
      const d = new Date(dateString);
      if (!isNaN(d.getTime())) {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
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
      setViewMode('single_day');
    } catch {}
  };

  // Search filtered orders across all history
  const searchFilteredOrders = useMemo(() => {
    return pastOrders.filter(o => {
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
  }, [pastOrders, searchTerm]);

  // Single day filtered orders
  const singleDayOrders = useMemo(() => {
    return searchFilteredOrders.filter(o => (o.date || todayDateStr) === selectedDate);
  }, [searchFilteredOrders, selectedDate, todayDateStr]);

  // Grouped orders by date
  const groupedOrdersByDate = useMemo(() => {
    const map = {};
    searchFilteredOrders.forEach(order => {
      const d = order.date || todayDateStr;
      if (!map[d]) map[d] = [];
      map[d].push(order);
    });

    const sortedKeys = Object.keys(map).sort((a, b) => {
      const timeA = new Date(a).getTime() || 0;
      const timeB = new Date(b).getTime() || 0;
      return timeB - timeA;
    });

    return sortedKeys.map(dateKey => {
      const orders = map[dateKey];
      const totalRev = orders.reduce((sum, o) => sum + (o.grandTotal || 0), 0);
      return {
        date: dateKey,
        orders,
        count: orders.length,
        totalRevenue: totalRev,
        avgValue: orders.length ? totalRev / orders.length : 0
      };
    });
  }, [searchFilteredOrders, todayDateStr]);

  // Navigation step helper
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

  // Active view stats calculation
  const activeOrders = viewMode === 'single_day' ? singleDayOrders : searchFilteredOrders;
  const totalCollected = activeOrders.reduce((sum, o) => sum + (o.grandTotal || 0), 0);
  const averageTicket = activeOrders.length ? totalCollected / activeOrders.length : 0;

  // Count invoices for selected date vs overall
  const countForSelectedDate = useMemo(() => {
    return pastOrders.filter(o => (o.date || todayDateStr) === selectedDate).length;
  }, [pastOrders, selectedDate, todayDateStr]);

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0, 0, 0, 0.78)',
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
        maxWidth: '820px',
        borderRadius: 'var(--radius-lg)',
        boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        maxHeight: '88vh'
      }}>
        {/* Header */}
        <div style={{
          padding: '1rem 1.5rem',
          borderBottom: '1px solid var(--border-subtle)',
          background: 'var(--bg-tertiary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <Receipt size={22} color="var(--accent-amber)" />
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)' }}>
                Day-by-Day Sales Invoices & Settled Orders
              </h3>
            </div>
            <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: '3px', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Calendar size={13} color="var(--accent-amber)" />
              <span>
                {viewMode === 'single_day' 
                  ? `Selected Date: ${selectedDate} (${countForSelectedDate} Invoices)`
                  : `All Dates Grouped Breakdown (${pastOrders.length} Total Invoices)`
                }
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-muted)',
              display: 'flex',
              padding: '6px',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* View Mode & Day Navigation Bar */}
        <div style={{
          padding: '0.75rem 1.5rem',
          background: 'rgba(0, 0, 0, 0.25)',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.75rem'
        }}>
          {/* Mode Switcher */}
          <div style={{ display: 'flex', gap: '4px', background: 'var(--bg-primary)', padding: '3px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
            <button
              onClick={() => setViewMode('single_day')}
              style={{
                padding: '0.4rem 0.85rem',
                borderRadius: '6px',
                border: 'none',
                background: viewMode === 'single_day' ? 'var(--accent-amber)' : 'transparent',
                color: viewMode === 'single_day' ? '#000' : 'var(--text-muted)',
                fontSize: '0.78rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                transition: 'all 0.15s ease'
              }}
            >
              <Calendar size={14} />
              Daily View
            </button>
            <button
              onClick={() => setViewMode('grouped_all')}
              style={{
                padding: '0.4rem 0.85rem',
                borderRadius: '6px',
                border: 'none',
                background: viewMode === 'grouped_all' ? 'var(--accent-amber)' : 'transparent',
                color: viewMode === 'grouped_all' ? '#000' : 'var(--text-muted)',
                fontSize: '0.78rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                transition: 'all 0.15s ease'
              }}
            >
              <Layers size={14} />
              Day-by-Day Breakdown
            </button>
          </div>

          {/* Date Selector & Navigation Controls (Enabled in single_day mode) */}
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
                const cnt = pastOrders.filter(o => (o.date || todayDateStr) === d).length;
                return (
                  <option key={d} value={d}>
                    📅 {d} ({cnt} {cnt === 1 ? 'invoice' : 'invoices'})
                  </option>
                );
              })}
            </select>

            {/* Native HTML DatePicker */}
            <input
              type="date"
              value={getYYYYMMDD(selectedDate)}
              onChange={handleDateInputChange}
              style={{
                background: 'var(--bg-tertiary)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-main)',
                padding: '0.35rem 0.5rem',
                borderRadius: '6px',
                fontSize: '0.78rem',
                cursor: 'pointer'
              }}
              title="Pick specific date calendar"
            />

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

            {selectedDate !== todayDateStr && (
              <button
                onClick={() => {
                  setSelectedDate(todayDateStr);
                  setViewMode('single_day');
                }}
                style={{
                  background: 'rgba(245, 158, 11, 0.15)',
                  border: '1px solid var(--accent-amber)',
                  color: '#fbbf24',
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
        </div>

        {/* Dynamic Stats Row */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '1rem',
          padding: '1rem 1.5rem',
          background: 'var(--bg-primary)',
          borderBottom: '1px solid var(--border-subtle)'
        }}>
          <div style={{
            background: 'var(--bg-secondary)',
            padding: '0.85rem 1rem',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)'
          }}>
            <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 600 }}>
              {viewMode === 'single_day' ? `Invoices Settled (${selectedDate})` : 'Total Invoices (All Dates)'}
            </span>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '2px' }}>
              {activeOrders.length} {activeOrders.length === 1 ? 'Bill' : 'Bills'}
            </div>
          </div>

          <div style={{
            background: 'var(--bg-secondary)',
            padding: '0.85rem 1rem',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)'
          }}>
            <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 600 }}>
              {viewMode === 'single_day' ? `Daily Revenue (${selectedDate})` : 'Total Revenue'}
            </span>
            <div className="font-mono" style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--accent-amber-light)', marginTop: '2px' }}>
              {formatCurrency(totalCollected)}
            </div>
          </div>

          <div style={{
            background: 'var(--bg-secondary)',
            padding: '0.85rem 1rem',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)'
          }}>
            <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 600 }}>
              Average Invoice Value
            </span>
            <div className="font-mono" style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--status-vacant)', marginTop: '2px' }}>
              {formatCurrency(averageTicket)}
            </div>
          </div>
        </div>

        {/* Search */}
        <div style={{ padding: '0.75rem 1.5rem', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-secondary)' }}>
          <div style={{ position: 'relative' }}>
            <Search size={15} color="var(--text-dim)" style={{ position: 'absolute', left: '12px', top: '10px' }} />
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
                padding: '0.5rem 0.85rem 0.5rem 2.2rem',
                color: 'var(--text-main)',
                fontSize: '0.82rem'
              }}
            />
          </div>
        </div>

        {/* Main Orders Display */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1rem 1.5rem' }}>
          {viewMode === 'single_day' ? (
            /* Single Day View */
            <div>
              <div style={{
                marginBottom: '0.75rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingBottom: '0.5rem',
                borderBottom: '1px dashed var(--border-subtle)'
              }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--accent-amber)' }}>
                  📅 Showing Invoices for {selectedDate}
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Total Invoices: <strong>{singleDayOrders.length}</strong>
                </span>
              </div>

              {singleDayOrders.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-dim)' }}>
                  <Calendar size={36} color="var(--border-subtle)" style={{ marginBottom: '0.5rem' }} />
                  <div style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-main)' }}>
                    No invoices found for {selectedDate}
                  </div>
                  <div style={{ fontSize: '0.8rem', marginTop: '4px', color: 'var(--text-muted)' }}>
                    Use the date navigation controls or dropdown above to select another date.
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                  {singleDayOrders.map((order, idx) => (
                    <OrderCard key={idx} order={order} onReprintReceipt={onReprintReceipt} />
                  ))}
                </div>
              )}
            </div>
          ) : (
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
                      background: 'rgba(0,0,0,0.2)',
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
                          color: '#fbbf24',
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
                    <div style={{ padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
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

        {/* Footer */}
        <div style={{
          padding: '0.85rem 1.5rem',
          background: 'var(--bg-tertiary)',
          borderTop: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Showing <strong>{activeOrders.length}</strong> of <strong>{pastOrders.length}</strong> total settled invoices
          </span>
          <button
            onClick={onClose}
            style={{
              padding: '0.5rem 1.35rem',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--bg-secondary)',
              color: 'var(--text-main)',
              fontSize: '0.82rem',
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

// Subcomponent for individual invoice item card
function OrderCard({ order, onReprintReceipt }) {
  return (
    <div
      onClick={() => onReprintReceipt(order)}
      style={{
        background: 'var(--bg-tertiary)',
        borderRadius: 'var(--radius-sm)',
        padding: '0.85rem 1rem',
        border: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        cursor: 'pointer',
        transition: 'all 0.15s ease'
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = 'rgba(245, 158, 11, 0.45)';
        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = 'var(--border-subtle)';
        e.currentTarget.style.background = 'var(--bg-tertiary)';
      }}
    >
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontWeight: 800, color: 'var(--text-main)', fontSize: '0.92rem' }}>
            {order.tableName}
          </span>
          <span className="font-mono" style={{ fontSize: '0.72rem', color: 'var(--accent-amber-light)', fontWeight: 800 }}>
            {order.invoiceNo}
          </span>
          <span style={{
            background: 'rgba(16, 185, 129, 0.15)',
            color: 'var(--status-vacant)',
            fontSize: '0.68rem',
            fontWeight: 700,
            padding: '1px 6px',
            borderRadius: '4px',
            textTransform: 'uppercase'
          }}>
            {order.paymentMethod}
          </span>
        </div>

        <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '0.3rem', display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', color: 'var(--text-main)', fontWeight: 600 }}>
            <Calendar size={12} color="var(--accent-amber)" />
            {order.date || new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
          </span>
          <span>•</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', color: 'var(--text-main)', fontWeight: 600 }}>
            <Clock size={12} color="var(--accent-amber)" />
            {order.settledAt}
          </span>
          <span>•</span>
          <span>Server: <strong>{order.server}</strong></span>
          <span>•</span>
          <span>{order.items ? order.items.length : 0} dishes</span>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div className="font-mono" style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)' }}>
          {formatCurrency(order.grandTotal)}
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onReprintReceipt(order);
          }}
          style={{
            padding: '0.45rem 0.85rem',
            borderRadius: 'var(--radius-sm)',
            background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.18), rgba(234, 88, 12, 0.18))',
            color: '#fbbf24',
            border: '1.5px solid rgba(245, 158, 11, 0.45)',
            fontSize: '0.78rem',
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            gap: '0.38rem',
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
            transition: 'all 0.15s ease'
          }}
          title="Open Receipt Pop-up"
        >
          <Eye size={14} />
          <span>View Receipt</span>
        </button>
      </div>
    </div>
  );
}
