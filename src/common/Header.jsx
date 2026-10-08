import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  UtensilsCrossed, 
  Clock, 
  Calendar,
  Receipt, 
  Users, 
  RotateCcw, 
  LayoutGrid, 
  ShieldCheck, 
  ChefHat,
  Bell,
  BellRing,
  Flame,
  CheckCircle,
  Trash2,
  ChevronRight,
  Sun,
  Moon
} from 'lucide-react';
import { formatCurrency } from '../utils/formatCurrency';
import { ProfileDropdown } from './ProfileDropdown';

export function Header({ 
  tables, 
  activeView, 
  setActiveView, 
  selectedTableId, 
  onResetData, 
  onOpenPastOrders, 
  onOpenAdmin,
  onOpenKOTView,
  currentTheme, 
  onChangeTheme,
  currentSession = null,
  onLogout = null,
  kitchenNotifications = [],
  onClearNotifications = null,
  onSelectTable = null
}) {
  const navigate = useNavigate();
  const location = useLocation();

  const isUserRoute = location.pathname === '/' || location.pathname === '/user';
  const isKotRoute = location.pathname === '/kot';
  const isAdminRoute = location.pathname === '/admin';

  const [time, setTime] = useState(new Date());
  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const [dropdownCoords, setDropdownCoords] = useState(null);
  const notifRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotifMenu(false);
      }
    };
    if (showNotifMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showNotifMenu]);

  // Keep dropdown securely inside visible screen bounds at all times
  useEffect(() => {
    if (showNotifMenu && notifRef.current) {
      const updatePosition = () => {
        if (!notifRef.current) return;
        const rect = notifRef.current.getBoundingClientRect();
        const width = Math.min(380, window.innerWidth - 24);
        
        // Default: try aligning right edge of dropdown with right edge of button
        let left = rect.right - width;
        
        // If pushing off left edge of screen (< 12px), align with left edge of button or clamp to 12px
        if (left < 12) {
          left = Math.max(12, rect.left);
        }
        
        // If right side extends beyond viewport edge, clamp within right border
        if (left + width > window.innerWidth - 12) {
          left = Math.max(12, window.innerWidth - width - 12);
        }
        
        setDropdownCoords({
          top: rect.bottom + 8,
          left,
          width
        });
      };

      updatePosition();
      window.addEventListener('resize', updatePosition);
      window.addEventListener('scroll', updatePosition);
      return () => {
        window.removeEventListener('resize', updatePosition);
        window.removeEventListener('scroll', updatePosition);
      };
    }
  }, [showNotifMenu]);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const occupiedCount = tables.filter(t => t.status === 'occupied').length;
  const billedCount = tables.filter(t => t.status === 'billed').length;
  const vacantCount = tables.filter(t => t.status === 'vacant').length;
  
  const totalGuests = tables
    .filter(t => t.status !== 'vacant')
    .reduce((acc, t) => acc + (t.guests || 0), 0);

  const totalRunningRevenue = tables
    .filter(t => t.status !== 'vacant')
    .reduce((acc, t) => {
      const subtotal = t.items.reduce((s, i) => s + (i.price * i.quantity), 0);
      return acc + subtotal;
    }, 0);

  const totalChairs = tables.reduce((sum, t) => sum + (Number(t.capacity) || 0), 0);

  // Count active KOT tickets that have items and are not completely ready/served
  const activeKOTCount = tables.filter(t => 
    t.items && t.items.length > 0 && 
    !t.items.every(i => i.kotStatus === 'served' || i.kotStatus === 'ready')
  ).length;

  const themes = [
    { id: 'royal-saffron', name: 'Dark Theme', icon: '🌙', label: 'Dark' },
    { id: 'light-bistro', name: 'Light Theme', icon: '☀️', label: 'Light' }
  ];

  return (
    <header style={{
      background: 'var(--bg-secondary)',
      borderBottom: '1px solid var(--border-subtle)',
      padding: '0.75rem 1.5rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      position: 'sticky',
      top: 0,
      zIndex: 40,
      boxShadow: 'var(--shadow-md)',
      flexWrap: 'wrap',
      gap: '0.75rem'
    }}>
      {/* 1. BRAND & LOGO */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
        <div 
          onClick={() => {
            setActiveView('tables');
            navigate('/');
          }}
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.75rem', 
            cursor: 'pointer' 
          }}
        >
          <div style={{
            background: 'linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)',
            width: '40px',
            height: '40px',
            borderRadius: '11px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 14px rgba(245, 158, 11, 0.4)'
          }}>
            <UtensilsCrossed size={20} color="#ffffff" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <h1 style={{ 
                fontSize: '1.15rem', 
                fontWeight: 800, 
                letterSpacing: '-0.02em', 
                color: 'var(--text-main)',
                lineHeight: 1.1
              }}>
                AVSR FOOD COURT
              </h1>
              <span style={{
                background: 'rgba(245, 158, 11, 0.18)',
                color: 'var(--accent-amber-light)',
                border: '1px solid var(--border-subtle)',
                fontSize: '0.62rem',
                fontWeight: 700,
                padding: '2px 5px',
                borderRadius: '4px',
                letterSpacing: '0.05em'
              }}>
                POS
              </span>
            </div>
            <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
              {tables.length} Tables • {totalChairs} Chairs
            </p>
          </div>
        </div>

        {/* 2. DEDICATED SEPARATE URL NAVIGATION (USER POS, KITCHEN KOT, ADMIN, INVOICES) */}
        <nav style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.3rem',
          background: 'var(--bg-tertiary)',
          padding: '3px',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-subtle)'
        }}>
          {/* USER POS: Dining Floor Tables & Menu (Route: /) */}
          <button
            onClick={() => {
              setActiveView('tables');
              navigate('/');
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.45rem 0.85rem',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.82rem',
              fontWeight: isUserRoute ? 800 : 600,
              background: isUserRoute ? 'var(--accent-amber)' : 'transparent',
              color: isUserRoute ? '#000000' : 'var(--text-muted)',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            title="User Dining Floor & Table Billing (Route: /)"
          >
            <LayoutGrid size={15} />
            <span>User POS ({tables.length})</span>
          </button>

          {/* Invoices History Button */}
          <button
            onClick={onOpenPastOrders}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.45rem 0.8rem',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.82rem',
              fontWeight: 600,
              background: 'transparent',
              color: 'var(--text-muted)',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--text-main)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
            title="View Settled Invoices"
          >
            <Receipt size={14} />
            <span>Invoices</span>
          </button>
        </nav>
      </div>

      {/* 2.5 LIVE RESTAURANT DATE & TIME */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.55rem',
        background: 'var(--bg-tertiary)',
        border: '1px solid var(--border-subtle)',
        padding: '0.42rem 0.95rem',
        borderRadius: 'var(--radius-md)',
        color: 'var(--accent-amber-light)',
        fontSize: '0.82rem',
        fontWeight: 800,
        fontFamily: 'monospace',
        boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.25)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-main)' }}>
          <Calendar size={14} color="var(--accent-amber)" />
          <span>{time.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}</span>
        </div>
        <span style={{ color: 'var(--border-subtle)', opacity: 0.6 }}>•</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--accent-amber-light)' }}>
          <Clock size={14} color="var(--accent-amber)" className="pulse-indicator" />
          <span>{time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
        </div>
      </div>

      {/* 3. CENTER LIVE FLOOR METRICS & RUPEE REVENUE */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '0.85rem',
        background: 'var(--bg-tertiary)',
        padding: '0.45rem 1rem',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border-subtle)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem' }}>
          <span style={{ 
            width: '8px', 
            height: '8px', 
            borderRadius: '50%', 
            background: 'var(--status-vacant)',
            display: 'inline-block' 
          }} />
          <span style={{ color: 'var(--text-muted)' }}>Vacant:</span>
          <strong style={{ color: 'var(--status-vacant)' }}>{vacantCount}</strong>
        </div>

        <div style={{ width: '1px', height: '14px', background: 'var(--border-subtle)' }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem' }}>
          <span style={{ 
            width: '8px', 
            height: '8px', 
            borderRadius: '50%', 
            background: 'var(--status-occupied)',
            display: 'inline-block' 
          }} />
          <span style={{ color: 'var(--text-muted)' }}>Dining:</span>
          <strong style={{ color: 'var(--status-occupied)' }}>{occupiedCount}</strong>
        </div>

        <div style={{ width: '1px', height: '14px', background: 'var(--border-subtle)' }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem' }}>
          <Users size={13} color="var(--text-muted)" />
          <span style={{ color: 'var(--text-muted)' }}>Guests:</span>
          <strong style={{ color: 'var(--text-main)' }}>{totalGuests}</strong>
        </div>

        <div style={{ width: '1px', height: '14px', background: 'var(--border-subtle)' }} />

        {/* Live Running Total in Rupees */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem' }}>
          <span style={{ color: 'var(--text-muted)' }}>Running Total:</span>
          <strong className="font-mono" style={{ color: 'var(--accent-amber-light)', fontSize: '0.9rem' }}>
            {formatCurrency(totalRunningRevenue)}
          </strong>
        </div>
      </div>

      {/* 4. RIGHT CONTROLS: THEME SWITCHER & RESET */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
        {/* Single Theme Toggle Icon Button (Dark <-> Light) */}
        <button
          onClick={() => {
            const nextTheme = (currentTheme === 'light-bistro') ? 'royal-saffron' : 'light-bistro';
            if (onChangeTheme) onChangeTheme(nextTheme);
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

        {/* Kitchen Status Notification Bell */}
        <div ref={notifRef} style={{ position: 'relative' }}>
          <button
            onClick={() => setShowNotifMenu(p => !p)}
            style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: kitchenNotifications.length > 0 ? 'rgba(245, 158, 11, 0.15)' : 'var(--bg-tertiary)',
              border: kitchenNotifications.length > 0 ? '1.5px solid rgba(245, 158, 11, 0.45)' : '1px solid var(--border-subtle)',
              color: kitchenNotifications.length > 0 ? 'var(--accent-amber-light)' : 'var(--text-muted)',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            title="Kitchen Cooking Status Updates"
          >
            {kitchenNotifications.some(n => n.type === 'cooking_completed') ? (
              <BellRing size={16} color="#10b981" />
            ) : (
              <Bell size={16} />
            )}
            {kitchenNotifications.length > 0 && (
              <span style={{
                position: 'absolute',
                top: '-4px',
                right: '-4px',
                background: kitchenNotifications.some(n => n.type === 'cooking_completed') ? '#10b981' : '#f59e0b',
                color: '#000000',
                fontSize: '0.62rem',
                fontWeight: 900,
                width: '17px',
                height: '17px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 8px rgba(0,0,0,0.5)',
                border: '1.5px solid var(--bg-primary)'
              }}>
                {kitchenNotifications.length > 9 ? '9+' : kitchenNotifications.length}
              </span>
            )}
          </button>

          {/* Notifications Dropdown Panel - Always 100% within screen bounds */}
          {showNotifMenu && (
            <div style={{
              position: 'fixed',
              top: dropdownCoords ? `${dropdownCoords.top}px` : '70px',
              left: dropdownCoords ? `${dropdownCoords.left}px` : '12px',
              width: dropdownCoords ? `${dropdownCoords.width}px` : '360px',
              maxWidth: 'calc(100vw - 24px)',
              background: '#0d1527',
              border: '1.5px solid rgba(245, 158, 11, 0.45)',
              borderRadius: '14px',
              boxShadow: '0 20px 50px rgba(0,0,0,0.85), 0 0 25px rgba(245, 158, 11, 0.2)',
              zIndex: 9999,
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              animation: 'fadeIn 0.15s ease'
            }}>
              {/* Dropdown Header */}
              <div style={{
                padding: '0.85rem 1rem',
                background: 'linear-gradient(135deg, #172339 0%, #0d1527 100%)',
                borderBottom: '1px solid rgba(255,255,255,0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Bell size={16} color="#f59e0b" />
                  <span style={{ fontSize: '0.88rem', fontWeight: 900, color: '#ffffff', letterSpacing: '-0.01em' }}>
                    Kitchen Status Updates
                  </span>
                  {kitchenNotifications.length > 0 && (
                    <span style={{
                      background: 'rgba(245, 158, 11, 0.2)',
                      color: '#fbbf24',
                      border: '1px solid rgba(245, 158, 11, 0.4)',
                      padding: '1px 6px',
                      borderRadius: '10px',
                      fontSize: '0.66rem',
                      fontWeight: 800
                    }}>
                      {kitchenNotifications.length}
                    </span>
                  )}
                </div>
                {kitchenNotifications.length > 0 && onClearNotifications && (
                  <button
                    onClick={() => {
                      onClearNotifications();
                      setShowNotifMenu(false);
                    }}
                    style={{
                      background: 'rgba(239, 68, 68, 0.12)',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      color: '#f87171',
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      padding: '3px 8px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <Trash2 size={12} /> Clear All
                  </button>
                )}
              </div>

              {/* Notifications List */}
              <div style={{ maxHeight: '340px', overflowY: 'auto', padding: '0.35rem 0' }}>
                {kitchenNotifications.length === 0 ? (
                  <div style={{ padding: '2rem 1rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.82rem' }}>
                    <div style={{ fontSize: '1.8rem', marginBottom: '0.5rem' }}>📭</div>
                    No kitchen status updates yet.
                  </div>
                ) : (
                  kitchenNotifications.map(n => {
                    const isCompleted = n.type === 'cooking_completed';
                    return (
                      <div
                        key={n.id}
                        onClick={() => {
                          if (onSelectTable && n.tableId) {
                            onSelectTable(n.tableId);
                            setShowNotifMenu(false);
                          }
                        }}
                        style={{
                          margin: '0.25rem 0.5rem',
                          padding: '0.75rem 0.85rem',
                          background: isCompleted ? 'rgba(16, 185, 129, 0.08)' : 'rgba(245, 158, 11, 0.08)',
                          border: isCompleted ? '1px solid rgba(16, 185, 129, 0.25)' : '1px solid rgba(245, 158, 11, 0.25)',
                          borderRadius: '9px',
                          cursor: n.tableId ? 'pointer' : 'default',
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '0.75rem',
                          transition: 'all 0.15s ease'
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.background = isCompleted ? 'rgba(16, 185, 129, 0.16)' : 'rgba(245, 158, 11, 0.16)';
                          e.currentTarget.style.transform = 'translateY(-1px)';
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.background = isCompleted ? 'rgba(16, 185, 129, 0.08)' : 'rgba(245, 158, 11, 0.08)';
                          e.currentTarget.style.transform = 'translateY(0)';
                        }}
                      >
                        <div style={{
                          width: '34px',
                          height: '34px',
                          borderRadius: '8px',
                          flexShrink: 0,
                          background: isCompleted 
                            ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.3), rgba(5, 150, 105, 0.2))' 
                            : 'linear-gradient(135deg, rgba(245, 158, 11, 0.3), rgba(234, 88, 12, 0.2))',
                          border: isCompleted ? '1.5px solid rgba(16, 185, 129, 0.5)' : '1.5px solid rgba(245, 158, 11, 0.5)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '1.1rem',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
                        }}>
                          {isCompleted ? '🔔' : '🔥'}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '3px' }}>
                            <span style={{
                              fontSize: '0.84rem',
                              fontWeight: 900,
                              color: isCompleted ? '#34d399' : '#fb923c',
                              letterSpacing: '-0.01em'
                            }}>
                              {n.title}
                            </span>
                            <span style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: 700, fontFamily: 'monospace' }}>
                              {n.timestamp}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.8rem', color: '#f1f5f9', lineHeight: 1.35, fontWeight: 500 }}>
                            {n.message}
                          </div>
                          {n.tableId && (
                            <div style={{ marginTop: '5px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <span style={{
                                fontSize: '0.68rem',
                                fontWeight: 800,
                                background: isCompleted ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                                color: isCompleted ? '#34d399' : '#fbbf24',
                                padding: '1px 6px',
                                borderRadius: '4px'
                              }}>
                                📍 {n.tableName || `Table ${n.tableId}`}
                              </span>
                              <span style={{ fontSize: '0.68rem', color: '#38bdf8', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '2px' }}>
                                View Table <ChevronRight size={11} />
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* Reset Demo Data Button */}
        <button
          onClick={onResetData}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
            padding: '0.45rem 0.65rem',
            background: 'transparent',
            color: 'var(--text-dim)',
            borderRadius: 'var(--radius-sm)',
            border: 'none',
            fontSize: '0.78rem',
            cursor: 'pointer'
          }}
          title="Reset tables to default initial state"
        >
          <RotateCcw size={13} />
          <span>Reset</span>
        </button>

        {/* Profile Dropdown with User Details & Logout (Top Right Corner) */}
        <ProfileDropdown
          currentSession={currentSession}
          onLogout={onLogout}
          role="pos"
        />
      </div>
    </header>
  );
}
