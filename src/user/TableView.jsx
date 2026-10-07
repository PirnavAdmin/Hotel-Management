import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Clock, 
  Utensils, 
  ChevronRight, 
  Search,
  Plus,
  Flame,
  Hourglass
} from 'lucide-react';
import { formatCurrency } from '../utils/formatCurrency';
import { parseTimeToSeconds, formatElapsedTimer, getTimerUrgencyColor } from '../utils/timer';

export function TableView({ tables, onSelectTable }) {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const [sectionFilter, setSectionFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const sections = [
    { id: 'all', name: `All Areas (${tables.length} Tables)` },
    { id: 'Main Hall', name: 'Main Hall' },
    { id: 'Window Side', name: 'Window Side' },
    { id: 'Garden Terrace', name: 'Garden Terrace' },
    { id: 'VIP Lounge', name: 'VIP Lounge' },
  ];

  const filteredTables = tables.filter(t => {
    const matchesSection = sectionFilter === 'all' || t.section === sectionFilter;
    const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
    const matchesSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          t.server.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          t.section.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSection && matchesStatus && matchesSearch;
  });

  return (
    <div style={{ padding: '1.25rem 1.5rem', maxWidth: '100%', margin: '0 auto' }}>
      {/* Floor Plan Title & Controls */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1rem',
        marginBottom: '1.5rem'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
              Restaurant Floor Plan & Tables
            </h2>
            <span style={{
              background: 'rgba(245, 158, 11, 0.15)',
              color: 'var(--accent-amber-light)',
              padding: '2px 8px',
              borderRadius: '6px',
              fontSize: '0.72rem',
              fontWeight: 700,
              border: '1px solid var(--border-subtle)'
            }}>
              {tables.length} Tables Active
            </span>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginTop: '3px' }}>
            Select any table from the floor below to take orders, add biryanis & generate bills in <strong>Rupees (₹)</strong>.
          </p>
        </div>

        {/* Search & Status Filters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          {/* Quick Search */}
          <div style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center'
          }}>
            <Search size={16} color="var(--text-dim)" style={{ position: 'absolute', left: '12px' }} />
            <input 
              type="text"
              placeholder="Search table or server..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--text-main)',
                padding: '0.55rem 1rem 0.55rem 2.25rem',
                fontSize: '0.85rem',
                width: '220px'
              }}
            />
          </div>

          {/* Status Filters */}
          <div style={{
            display: 'flex',
            background: 'var(--bg-secondary)',
            padding: '3px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)'
          }}>
            {[
              { id: 'all', label: `All (${tables.length})` },
              { id: 'vacant', label: 'Available', dot: 'var(--status-vacant)' },
              { id: 'occupied', label: 'Occupied', dot: 'var(--status-occupied)' },
              { id: 'billed', label: 'Billed', dot: 'var(--status-billed)' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                style={{
                  padding: '0.45rem 0.85rem',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.8rem',
                  fontWeight: statusFilter === tab.id ? 700 : 500,
                  background: statusFilter === tab.id ? 'var(--bg-tertiary)' : 'transparent',
                  color: statusFilter === tab.id ? 'var(--text-main)' : 'var(--text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem'
                }}
              >
                {tab.dot && (
                  <span style={{ 
                    width: '7px', 
                    height: '7px', 
                    borderRadius: '50%', 
                    backgroundColor: tab.dot 
                  }} />
                )}
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Section Filter Pills */}
      <div style={{ 
        display: 'flex', 
        gap: '0.6rem', 
        overflowX: 'auto', 
        paddingBottom: '0.75rem',
        marginBottom: '1.25rem' 
      }}>
        {sections.map(sec => {
          const isSelected = sectionFilter === sec.id;
          const count = sec.id === 'all' 
            ? tables.length 
            : tables.filter(t => t.section === sec.id).length;

          return (
            <button
              key={sec.id}
              onClick={() => setSectionFilter(sec.id)}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.84rem',
                fontWeight: isSelected ? 700 : 500,
                background: isSelected 
                  ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.25) 0%, rgba(245, 158, 11, 0.1) 100%)' 
                  : 'var(--bg-secondary)',
                color: isSelected ? 'var(--accent-amber-light)' : 'var(--text-muted)',
                border: isSelected 
                  ? '1px solid var(--accent-amber)' 
                  : '1px solid var(--border-subtle)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                whiteSpace: 'nowrap'
              }}
            >
              <span>{sec.name}</span>
              <span style={{
                background: isSelected ? 'var(--accent-amber)' : 'var(--bg-tertiary)',
                color: isSelected ? '#000000' : 'var(--text-dim)',
                fontSize: '0.72rem',
                padding: '1px 6px',
                borderRadius: '10px',
                fontWeight: 700
              }}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* 6 Tables Per Row Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(6, minmax(0, 1fr))',
        gap: '0.75rem'
      }}>
        {filteredTables.map(table => {
          const subtotal = table.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
          const totalItemsCount = table.items.reduce((sum, item) => sum + item.quantity, 0);

          let statusColor = 'var(--status-vacant)';
          let statusText = 'Available';
          let statusBg = 'var(--status-vacant-bg)';

          if (table.status === 'occupied') {
            statusColor = 'var(--status-occupied)';
            statusText = 'Dining';
            statusBg = 'var(--status-occupied-bg)';
          } else if (table.status === 'billed') {
            statusColor = 'var(--status-billed)';
            statusText = 'Billed';
            statusBg = 'var(--status-billed-bg)';
          }

          const isOccupied = table.status !== 'vacant';
          const hasCooking = isOccupied && table.items.some(i => i.kotStatus === 'cooking');
          const allReady = isOccupied && table.items.length > 0 && table.items.every(i => i.kotStatus === 'ready' || i.kotStatus === 'served' || i.kotStatus === 'completed');
          const hasReady = isOccupied && table.items.some(i => i.kotStatus === 'ready');
          const readyCount = isOccupied ? table.items.filter(i => i.kotStatus === 'ready' || i.kotStatus === 'served').length : 0;

          const isTable5 = table.id === 5;

          const cardBorderColor = !isOccupied
            ? 'var(--border-subtle)'
            : (allReady ? '#10b981' : (hasCooking ? '#ea580c' : 'rgba(245, 158, 11, 0.7)'));
          const cardShadow = !isOccupied
            ? 'var(--shadow-sm)'
            : (allReady ? '0 4px 16px rgba(16, 185, 129, 0.25)' : (hasCooking ? '0 4px 16px rgba(234, 88, 12, 0.22)' : '0 4px 14px rgba(245, 158, 11, 0.16)'));

          return (
            <div
              key={table.id}
              onClick={() => onSelectTable(table.id)}
              style={{
                background: 'var(--bg-secondary)',
                borderRadius: 'var(--radius-md)',
                border: `1.5px solid ${cardBorderColor}`,
                padding: '0.75rem 0.85rem',
                position: 'relative',
                cursor: 'pointer',
                transition: 'all 0.18s ease',
                boxShadow: cardShadow,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '0.45rem'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 6px 18px rgba(0,0,0,0.3)';
                e.currentTarget.style.borderColor = 'var(--accent-amber)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = cardShadow;
                e.currentTarget.style.borderColor = cardBorderColor;
              }}
            >
              {/* Table Card Header: Big, Bold, Crystal Clear Table Number */}
              <div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '0.35rem',
                  marginBottom: '0.2rem'
                }}>
                  {/* Prominent High-Contrast Table Number */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    minWidth: 0
                  }}>
                    <span style={{
                      background: table.status !== 'vacant'
                        ? 'linear-gradient(135deg, #f59e0b, #ea580c)'
                        : 'var(--bg-tertiary)',
                      color: table.status !== 'vacant' ? '#ffffff' : 'var(--text-main)',
                      border: table.status !== 'vacant' ? 'none' : '1px solid var(--border-subtle)',
                      fontWeight: 900,
                      fontSize: '0.74rem',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      letterSpacing: '0.03em',
                      flexShrink: 0
                    }}>
                      T{table.id}
                    </span>
                    <h3 style={{
                      fontSize: '1rem',
                      fontWeight: 900,
                      color: table.status !== 'vacant' ? 'var(--accent-amber-light)' : 'var(--text-main)',
                      lineHeight: 1.1,
                      letterSpacing: '-0.02em',
                      whiteSpace: 'nowrap'
                    }}>
                      Table {table.id}
                    </h3>
                  </div>

                  {/* Status Indicator */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    background: statusBg,
                    border: `1px solid ${statusColor}40`,
                    padding: '0.15rem 0.45rem',
                    borderRadius: '12px',
                    fontSize: '0.66rem',
                    fontWeight: 700,
                    color: statusColor,
                    flexShrink: 0
                  }}>
                    <span style={{
                      width: '5px',
                      height: '5px',
                      borderRadius: '50%',
                      background: statusColor,
                      display: 'inline-block'
                    }} className={table.status !== 'vacant' ? 'pulse-indicator' : ''} />
                    <span>{statusText}</span>
                  </div>
                </div>

                {/* Section & Capacity */}
                <div style={{
                  fontSize: '0.68rem',
                  color: 'var(--text-dim)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  paddingBottom: '0.35rem',
                  borderBottom: '1px solid rgba(255,255,255,0.06)'
                }}>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {table.section}
                  </span>
                  <span>•</span>
                  <span style={{ whiteSpace: 'nowrap' }}>
                    {table.capacity} Seats ({table.status !== 'vacant' ? `${table.guests} Seated` : 'Vacant'})
                  </span>
                </div>

                {/* Kitchen Cooking Status Live Badge */}
                {isOccupied && table.items.length > 0 && (
                  <div style={{ marginTop: '0.32rem' }}>
                    {allReady ? (
                      <div style={{
                        background: 'rgba(16, 185, 129, 0.16)',
                        border: '1.5px solid #10b981',
                        borderRadius: '6px',
                        padding: '3px 6px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        boxShadow: '0 0 10px rgba(16, 185, 129, 0.25)'
                      }}>
                        <span style={{ fontSize: '0.68rem', fontWeight: 900, color: '#34d399', display: 'flex', alignItems: 'center', gap: '3px' }}>
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }} className="pulse-indicator" />
                          🔔 Ready to Serve
                        </span>
                        <span style={{ fontSize: '0.6rem', color: '#6ee7b7', fontWeight: 800 }}>Hot!</span>
                      </div>
                    ) : hasCooking ? (
                      <div style={{
                        background: 'rgba(234, 88, 12, 0.15)',
                        border: '1px solid #ea580c',
                        borderRadius: '6px',
                        padding: '3px 6px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                      }}>
                        <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#fb923c', display: 'flex', alignItems: 'center', gap: '3px' }}>
                          {readyCount > 0 ? `🔥 Cooking (${readyCount}/${table.items.length} Ready)` : '🔥 Cooking in Kitchen'}
                        </span>
                        <span style={{ fontSize: '0.6rem', color: '#fed7aa', fontWeight: 700 }}>In Pan</span>
                      </div>
                    ) : hasReady ? (
                      <div style={{
                        background: 'rgba(16, 185, 129, 0.12)',
                        border: '1px solid rgba(16, 185, 129, 0.4)',
                        borderRadius: '6px',
                        padding: '3px 6px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                      }}>
                        <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#34d399' }}>
                          🔔 Dishes Ready ({readyCount}/{table.items.length})
                        </span>
                      </div>
                    ) : (
                      <div style={{
                        background: 'rgba(59, 130, 246, 0.1)',
                        border: '1px solid rgba(59, 130, 246, 0.3)',
                        borderRadius: '6px',
                        padding: '3px 6px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                      }}>
                        <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#93c5fd' }}>
                          📥 Order in Kitchen
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Order Status & Financial Snapshot */}
              <div>
                {table.status === 'vacant' ? (
                  <div style={{
                    padding: '0.35rem 0',
                    textAlign: 'center',
                    color: 'var(--text-dim)',
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.3rem',
                    background: 'rgba(255, 255, 255, 0.02)',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px dashed rgba(255, 255, 255, 0.07)',
                    marginTop: '0.25rem'
                  }}>
                    <Plus size={12} color="var(--status-vacant)" />
                    <span>Ready for Guests</span>
                  </div>
                ) : (
                  <div style={{ marginTop: '0.25rem' }}>
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      marginBottom: '0.2rem'
                    }}>
                      <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                        Items ({totalItemsCount}):
                      </span>
                      <span className="font-mono" style={{ 
                        fontSize: '0.96rem', 
                        fontWeight: 800, 
                        color: 'var(--accent-amber-light)' 
                      }}>
                        {formatCurrency(subtotal)}
                      </span>
                    </div>

                    {/* Compact Item Preview List */}
                    <div style={{
                      background: 'var(--bg-tertiary)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '0.25rem 0.45rem',
                      fontSize: '0.68rem',
                      color: 'var(--text-main)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.15rem'
                    }}>
                      {table.items.slice(0, 1).map((item, idx) => (
                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', gap: '0.3rem', alignItems: 'center' }}>
                          <span style={{ color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0 }}>
                            {item.quantity}x {item.name}
                          </span>
                          <span className="font-mono" style={{ flexShrink: 0, fontSize: '0.7rem' }}>{formatCurrency(item.price * item.quantity)}</span>
                        </div>
                      ))}
                      {table.items.length > 1 && (
                        <div style={{ color: 'var(--text-dim)', fontSize: '0.64rem', fontStyle: 'italic' }}>
                          + {table.items.length - 1} more dish{table.items.length > 2 ? 'es' : ''}...
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Card Action Button */}
                <button
                  style={{
                    width: '100%',
                    marginTop: '0.45rem',
                    padding: '0.42rem 0.6rem',
                    borderRadius: 'var(--radius-sm)',
                    background: table.status === 'vacant'
                      ? 'rgba(255, 255, 255, 0.05)'
                      : 'linear-gradient(135deg, rgba(245, 158, 11, 0.28), rgba(245, 158, 11, 0.12))',
                    color: table.status === 'vacant' ? 'var(--text-main)' : 'var(--accent-amber-light)',
                    border: table.status === 'vacant' 
                      ? '1px solid var(--border-subtle)' 
                      : '1px solid var(--accent-amber)',
                    fontSize: '0.76rem',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.3rem',
                    whiteSpace: 'nowrap',
                    cursor: 'pointer'
                  }}
                >
                  <Utensils size={12} />
                  <span>
                    {table.status === 'vacant' ? 'Take Order' : 'Manage Bill'}
                  </span>
                  <ChevronRight size={12} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
