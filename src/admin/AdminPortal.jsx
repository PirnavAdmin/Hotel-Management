import React, { useState, useEffect } from 'react';
import { 
  X, 
  Plus, 
  Trash2, 
  Edit3, 
  Utensils, 
  Users, 
  LayoutGrid, 
  ShieldCheck, 
  Flame, 
  Clock, 
  Calendar, 
  Check, 
  CheckCircle2,
  ChefHat,
  Search, 
  AlertCircle,
  Armchair,
  Save,
  RotateCcw,
  ExternalLink,
  Filter,
  ArrowLeft
} from 'lucide-react';
import { MENU_CATEGORIES } from '../data/menuData';
import { formatCurrency } from '../utils/formatCurrency';
import { LoginManagement } from './LoginManagement';
import { ProfileDropdown } from '../common/ProfileDropdown';

export function AdminPortal({ 
  onClose,
  menuItems,
  onAddMenuItem,
  onUpdateMenuItem,
  onDeleteMenuItem,
  tables,
  onAddTable,
  onUpdateTable,
  onDeleteTable,
  staffList,
  onAddStaff,
  onDeleteStaff,
  onOpenKOTView,
  onUpdateItemKotStatus,
  onCompleteTableKot,
  isFullPage = false,
  currentSession = null,
  onLogout = null,
  currentTheme = 'royal-saffron',
  onChangeTheme = null
}) {
  const [activeTab, setActiveTab] = useState('menu'); // 'menu' | 'tables' | 'staff' | 'kot'
  const [searchFilter, setSearchFilter] = useState('');
  const [adminKotTableFilter, setAdminKotTableFilter] = useState('all');
  const [currentTime, setCurrentTime] = useState(new Date());

  const themes = [
    { id: 'royal-saffron', name: 'Radiance Saffron', icon: '👑' },
    { id: 'radiance-midnight', name: 'Radiance Cyber', icon: '✨' },
    { id: 'emerald-spice', name: 'Radiance Emerald', icon: '🌿' },
    { id: 'light-bistro', name: 'Daylight Bistro', icon: '☀️' }
  ];

  const handleThemeChange = (newTheme) => {
    if (onChangeTheme) {
      onChangeTheme(newTheme);
    } else {
      document.documentElement.setAttribute('data-theme', newTheme);
      try { localStorage.setItem('gourmet_pos_theme_v2', newTheme); } catch {}
    }
  };

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // --- ITEM MODAL STATE ---
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [itemForm, setItemForm] = useState({
    name: '',
    category: 'biryani',
    price: 250,
    isVeg: false,
    isChefSpecial: false,
    spiceLevel: 2,
    prepTime: '15 min',
    description: '',
    image: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=500&auto=format&fit=crop&q=80'
  });

  // --- TABLE MODAL STATE ---
  const [isTableModalOpen, setIsTableModalOpen] = useState(false);
  const [editingTable, setEditingTable] = useState(null);
  const [isNewServerMode, setIsNewServerMode] = useState(false);
  const [newServerName, setNewServerName] = useState('');
  const [newServerRole, setNewServerRole] = useState('Server / Waiter');
  const [tableForm, setTableForm] = useState({
    name: `Table ${tables.length + 1}`,
    section: 'Main Hall',
    capacity: 4, // Chairs / Persons capacity
    server: staffList[0]?.name || 'Rajesh K.'
  });

  // --- STAFF (PERSONS) MODAL STATE ---
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [staffForm, setStaffForm] = useState({
    name: '',
    role: 'Server / Waiter',
    phone: '',
    shift: 'General Shift'
  });

  // Open item modal for Add or Edit
  const handleOpenItemModal = (item = null) => {
    if (item) {
      setEditingItem(item);
      setItemForm({
        name: item.name,
        category: item.category,
        price: item.price,
        isVeg: item.isVeg,
        isChefSpecial: item.isChefSpecial,
        spiceLevel: item.spiceLevel || 0,
        prepTime: item.prepTime || '12 min',
        description: item.description || '',
        image: item.image || ''
      });
    } else {
      setEditingItem(null);
      setItemForm({
        name: '',
        category: 'biryani',
        price: 250,
        isVeg: false,
        isChefSpecial: false,
        spiceLevel: 2,
        prepTime: '15 min',
        description: '',
        image: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=500&auto=format&fit=crop&q=80'
      });
    }
    setIsItemModalOpen(true);
  };

  const handleSaveItem = (e) => {
    e.preventDefault();
    if (!itemForm.name.trim()) return;

    if (editingItem) {
      onUpdateMenuItem({
        ...editingItem,
        ...itemForm,
        price: Number(itemForm.price) || 0
      });
    } else {
      onAddMenuItem({
        id: `custom-${Date.now()}`,
        ...itemForm,
        price: Number(itemForm.price) || 0
      });
    }
    setIsItemModalOpen(false);
  };

  // Open table modal for Add or Edit
  const handleOpenTableModal = (tbl = null) => {
    setIsNewServerMode(false);
    setNewServerName('');
    setNewServerRole('Server / Waiter');

    if (tbl) {
      setEditingTable(tbl);
      setTableForm({
        name: tbl.name,
        section: tbl.section,
        capacity: tbl.capacity,
        server: tbl.server
      });
    } else {
      setEditingTable(null);
      // Auto suggest next table number
      const maxId = tables.reduce((m, t) => Math.max(m, t.id), 0);
      setTableForm({
        name: `Table ${maxId + 1}`,
        section: 'Main Hall',
        capacity: 4,
        server: staffList[0]?.name || 'Rajesh K.'
      });
    }
    setIsTableModalOpen(true);
  };

  const handleSaveTable = (e) => {
    e.preventDefault();
    if (!tableForm.name.trim()) return;

    let assignedServer = tableForm.server;
    if (isNewServerMode && newServerName.trim()) {
      assignedServer = newServerName.trim();
      onAddStaff({
        id: Date.now(),
        name: assignedServer,
        role: newServerRole.trim() || 'Server / Waiter',
        phone: '+91 98450 00000',
        shift: 'General Shift'
      });
    }

    if (editingTable) {
      onUpdateTable({
        ...editingTable,
        name: tableForm.name,
        section: tableForm.section,
        capacity: Number(tableForm.capacity) || 2,
        server: assignedServer
      });
    } else {
      const maxId = tables.reduce((m, t) => Math.max(m, t.id), 0);
      onAddTable({
        id: maxId + 1,
        name: tableForm.name,
        section: tableForm.section,
        capacity: Number(tableForm.capacity) || 4,
        status: 'vacant',
        guests: Number(tableForm.capacity) || 4,
        items: [],
        discountPercent: 0,
        serviceCharge: 5,
        orderTime: null,
        server: assignedServer
      });
    }
    setIsTableModalOpen(false);
    setIsNewServerMode(false);
    setNewServerName('');
  };

  // Save Staff Person
  const handleSaveStaff = (e) => {
    e.preventDefault();
    if (!staffForm.name.trim()) return;

    onAddStaff({
      id: Date.now(),
      name: staffForm.name,
      role: staffForm.role,
      phone: staffForm.phone || '+91 98450 00000',
      shift: staffForm.shift
    });

    setStaffForm({
      name: '',
      role: 'Server / Waiter',
      phone: '',
      shift: 'General Shift'
    });
    setIsStaffModalOpen(false);
  };

  // Filtered menu items
  const filteredItems = menuItems.filter(item => 
    item.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
    item.category.toLowerCase().includes(searchFilter.toLowerCase())
  );

  // Total capacity calculations
  const totalChairs = tables.reduce((sum, t) => sum + (Number(t.capacity) || 0), 0);
  const occupiedChairs = tables.filter(t => t.status !== 'vacant').reduce((sum, t) => sum + (Number(t.guests) || 0), 0);
  const tablesWithOrders = tables.filter(t => t.items && t.items.length > 0);
  const activeKOTCount = tablesWithOrders.filter(t => !t.items.every(i => i.kotStatus === 'served' || i.kotStatus === 'ready')).length;

  return (
    <div style={isFullPage ? {
      display: 'flex',
      flexDirection: 'column',
      height: 'calc(100vh - 68px)',
      background: 'var(--bg-primary)',
      overflow: 'hidden'
    } : {
      position: 'fixed',
      inset: 0,
      background: 'rgba(0, 0, 0, 0.82)',
      backdropFilter: 'blur(10px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 120,
      padding: '1.25rem'
    }}>
      <div style={isFullPage ? {
        background: 'var(--bg-secondary)',
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      } : {
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-subtle)',
        width: '100%',
        maxWidth: '1100px',
        height: '90vh',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-lg)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        
        {/* Admin Header */}
        <div style={{
          padding: '0.65rem 1.25rem',
          borderBottom: '1px solid var(--border-subtle)',
          background: 'var(--bg-tertiary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'nowrap',
          gap: '0.75rem',
          flexShrink: 0,
          width: '100%',
          boxSizing: 'border-box',
          overflow: 'visible',
          position: 'relative',
          zIndex: 100
        }}>
          {/* Left Brand Title */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexShrink: 1, minWidth: 0 }}>
            <div style={{
              background: 'linear-gradient(135deg, #f59e0b, #ea580c)',
              color: '#ffffff',
              padding: '6px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 14px rgba(245, 158, 11, 0.4)',
              flexShrink: 0
            }}>
              <ShieldCheck size={20} />
            </div>
            <div style={{ minWidth: 0 }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)', lineHeight: 1.1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                Restaurant Admin & Management Portal
              </h2>
              <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                Configure Menu Items, Dining Tables & Staff Persons
              </p>
            </div>
          </div>

          {/* Right Controls Row — Single Line, Uniform Heights */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'nowrap', flexShrink: 0, marginLeft: 'auto' }}>
            {/* Live Restaurant Date & Time Widget */}
            <div style={{
              height: '36px',
              boxSizing: 'border-box',
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              background: 'var(--bg-secondary)',
              border: '1.5px solid var(--border-subtle)',
              padding: '0 0.65rem',
              borderRadius: '9px',
              color: 'var(--accent-amber-light)',
              fontSize: '0.76rem',
              fontWeight: 800,
              fontFamily: 'monospace',
              boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.12)',
              whiteSpace: 'nowrap'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: 'var(--text-main)' }}>
                <Calendar size={13} color="var(--accent-amber)" />
                <span>{currentTime.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short' })}</span>
              </div>
              <span style={{ color: 'var(--border-subtle)', opacity: 0.6 }}>•</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: 'var(--accent-amber-light)' }}>
                <Clock size={13} color="var(--accent-amber)" className="pulse-indicator" />
                <span>{currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
              </div>
            </div>

            {/* Dynamic Theme Switcher (2nd Screenshot) — Beside Profile on the left */}
            <div style={{
              height: '36px',
              boxSizing: 'border-box',
              display: 'flex',
              alignItems: 'center',
              background: 'var(--bg-tertiary)',
              padding: '2px',
              borderRadius: '9px',
              border: '1px solid var(--border-subtle)'
            }}>
              {themes.map(t => (
                <button
                  key={t.id}
                  onClick={() => handleThemeChange(t.id)}
                  style={{
                    height: '28px',
                    padding: '0 0.45rem',
                    borderRadius: '6px',
                    fontSize: '0.72rem',
                    fontWeight: currentTheme === t.id ? 700 : 500,
                    background: currentTheme === t.id ? 'var(--accent-amber)' : 'transparent',
                    color: currentTheme === t.id ? '#000000' : 'var(--text-muted)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.2rem',
                    border: 'none',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                  title={`Switch to ${t.name}`}
                >
                  <span>{t.icon}</span>
                  <span style={{ display: currentTheme === t.id ? 'inline' : 'none' }}>
                    {t.id === 'royal-saffron' ? 'Saffron' : t.id === 'radiance-midnight' ? 'Radiance' : t.id === 'emerald-spice' ? 'Emerald' : 'Light'}
                  </span>
                </button>
              ))}
            </div>

            {/* Profile Avatar with Name Details & Logout (Safely inside Right Corner) */}
            <ProfileDropdown 
              currentSession={currentSession}
              onLogout={onLogout}
              role="admin"
            />
          </div>
        </div>

        {/* Tab Navigation Strip */}
        <div style={{
          display: 'flex',
          gap: '1rem',
          padding: '0.75rem 1.75rem',
          background: 'var(--bg-primary)',
          borderBottom: '1px solid var(--border-subtle)',
          flexShrink: 0
        }}>
          <button
            onClick={() => setActiveTab('menu')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.6rem 1.1rem',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.85rem',
              fontWeight: activeTab === 'menu' ? 700 : 500,
              background: activeTab === 'menu' ? 'var(--accent-amber)' : 'var(--bg-secondary)',
              color: activeTab === 'menu' ? '#000000' : 'var(--text-muted)',
              border: activeTab === 'menu' ? '1px solid var(--accent-amber)' : '1px solid var(--border-subtle)'
            }}
          >
            <Utensils size={16} />
            <span>Menu Items ({menuItems.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('tables')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.6rem 1.1rem',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.85rem',
              fontWeight: activeTab === 'tables' ? 700 : 500,
              background: activeTab === 'tables' ? 'var(--accent-amber)' : 'var(--bg-secondary)',
              color: activeTab === 'tables' ? '#000000' : 'var(--text-muted)',
              border: activeTab === 'tables' ? '1px solid var(--accent-amber)' : '1px solid var(--border-subtle)'
            }}
          >
            <Armchair size={16} />
            <span>Tables & Chairs ({tables.length} Tables / {totalChairs} Chairs)</span>
          </button>

          <button
            onClick={() => setActiveTab('staff')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.6rem 1.1rem',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.85rem',
              fontWeight: activeTab === 'staff' ? 700 : 500,
              background: activeTab === 'staff' ? 'var(--accent-amber)' : 'var(--bg-secondary)',
              color: activeTab === 'staff' ? '#000000' : 'var(--text-muted)',
              border: activeTab === 'staff' ? '1px solid var(--accent-amber)' : '1px solid var(--border-subtle)'
            }}
          >
            <Users size={16} />
            <span>Staff & Persons ({staffList.length})</span>
          </button>

          {/* DEDICATED ADMIN KOT TAB */}
          <button
            onClick={() => setActiveTab('kot')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.6rem 1.1rem',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.85rem',
              fontWeight: activeTab === 'kot' ? 700 : 500,
              background: activeTab === 'kot' ? 'var(--accent-amber)' : 'var(--bg-secondary)',
              color: activeTab === 'kot' ? '#000000' : 'var(--text-muted)',
              border: activeTab === 'kot' ? '1px solid var(--accent-amber)' : '1px solid var(--border-subtle)',
              cursor: 'pointer'
            }}
          >
            <ChefHat size={16} />
            <span>Kitchen KOT</span>
            {activeKOTCount > 0 && (
              <span style={{
                background: activeTab === 'kot' ? '#000000' : '#ea580c',
                color: activeTab === 'kot' ? 'var(--accent-amber-light)' : '#ffffff',
                padding: '1px 6px',
                borderRadius: '8px',
                fontSize: '0.7rem',
                fontWeight: 800
              }}>
                {activeKOTCount}
              </span>
            )}
          </button>

          {/* LOGINS MANAGEMENT TAB */}
          <button
            onClick={() => setActiveTab('logins')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.6rem 1.1rem',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.85rem',
              fontWeight: activeTab === 'logins' ? 700 : 500,
              background: activeTab === 'logins' ? '#6366f1' : 'var(--bg-secondary)',
              color: activeTab === 'logins' ? '#ffffff' : 'var(--text-muted)',
              border: activeTab === 'logins' ? '1px solid #6366f1' : '1px solid var(--border-subtle)',
              cursor: 'pointer'
            }}
          >
            <ShieldCheck size={16} />
            <span>🔐 Login Management</span>
          </button>

          {onOpenKOTView && (
            <button
              onClick={() => {
                onClose();
                onOpenKOTView();
              }}
              style={{
                marginLeft: 'auto',
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.6rem 1.1rem',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.85rem',
                fontWeight: 700,
                background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.25), rgba(234, 88, 12, 0.25))',
                color: 'var(--accent-amber-light)',
                border: '1px solid var(--accent-amber)',
                cursor: 'pointer'
              }}
            >
              <ExternalLink size={16} color="var(--accent-amber)" />
              <span>Full Screen KOT Display ↗</span>
            </button>
          )}
        </div>

        {/* Tab Content Work Area */}
        <div style={{ flex: 1, overflowY: 'auto', padding: activeTab === 'logins' ? '0' : '1.5rem 1.75rem', minHeight: 0 }}>

          {/* ================= TAB: LOGINS MANAGEMENT ================= */}
          {activeTab === 'logins' && (
            <LoginManagement currentAdminSession={currentSession} />
          )}

          {/* ================= TAB 1: MENU ITEMS ================= */}
          {activeTab === 'menu' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                  {/* Return to POS Navigation Button */}
                  <button
                    onClick={onClose}
                    style={{
                      height: '38px',
                      boxSizing: 'border-box',
                      background: 'rgba(255,255,255,0.06)',
                      color: 'var(--text-main)',
                      padding: '0 0.95rem',
                      borderRadius: 'var(--radius-sm)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      border: '1px solid var(--border-subtle)',
                      whiteSpace: 'nowrap',
                      transition: 'all 0.15s ease'
                    }}
                    title="Return to User POS"
                  >
                    {isFullPage ? <ArrowLeft size={16} /> : <X size={16} />}
                    <span>{isFullPage ? '← Go to User POS' : 'Close Admin'}</span>
                  </button>

                  {/* Search dishes input */}
                  <div style={{ position: 'relative', width: '300px' }}>
                    <Search size={16} color="var(--text-dim)" style={{ position: 'absolute', left: '12px', top: '11px' }} />
                    <input
                      type="text"
                      placeholder="Search dishes to edit/delete..."
                      value={searchFilter}
                      onChange={e => setSearchFilter(e.target.value)}
                      style={{
                        width: '100%',
                        height: '38px',
                        boxSizing: 'border-box',
                        background: 'var(--bg-tertiary)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '0 1rem 0 2.25rem',
                        color: 'var(--text-main)',
                        fontSize: '0.85rem'
                      }}
                    />
                  </div>
                </div>

                <button
                  onClick={() => handleOpenItemModal()}
                  style={{
                    height: '38px',
                    boxSizing: 'border-box',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    padding: '0 1.25rem',
                    background: 'linear-gradient(135deg, #f59e0b, #ea580c)',
                    color: '#ffffff',
                    borderRadius: 'var(--radius-sm)',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    boxShadow: '0 2px 8px rgba(245, 158, 11, 0.35)'
                  }}
                >
                  <Plus size={16} />
                  <span>+ Add New Dish / Biryani</span>
                </button>
              </div>

              {/* Items Table List */}
              <div style={{
                background: 'var(--bg-tertiary)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)',
                overflow: 'hidden'
              }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ background: 'rgba(0,0,0,0.2)', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
                      <th style={{ padding: '0.75rem 1rem' }}>Dish Name</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Category</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Dietary</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Price (₹)</th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredItems.map(item => (
                      <tr key={item.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                          <div style={{ width: '36px', height: '36px', borderRadius: '6px', overflow: 'hidden', background: '#222', flexShrink: 0 }}>
                            <img src={item.image} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => e.target.style.display = 'none'} />
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>{item.name}</div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{item.prepTime} • {item.description?.slice(0, 45)}...</div>
                          </div>
                        </td>
                        <td style={{ padding: '0.75rem 1rem', textTransform: 'capitalize', color: 'var(--text-muted)' }}>
                          {item.category.replace('-', ' ')}
                        </td>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          <span style={{
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            background: item.isVeg ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                            color: item.isVeg ? '#10b981' : '#ef4444'
                          }}>
                            {item.isVeg ? 'VEG 🟢' : 'NON-VEG 🔴'}
                          </span>
                        </td>
                        <td style={{ padding: '0.75rem 1rem', fontWeight: 800, color: 'var(--accent-amber-light)' }} className="font-mono">
                          {formatCurrency(item.price)}
                        </td>
                        <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '0.45rem' }}>
                            <button
                              onClick={() => handleOpenItemModal(item)}
                              style={{
                                padding: '4px 8px',
                                background: 'var(--bg-secondary)',
                                color: 'var(--accent-amber-light)',
                                border: '1px solid var(--border-subtle)',
                                borderRadius: '4px',
                                fontSize: '0.76rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '3px'
                              }}
                              title="Edit item"
                            >
                              <Edit3 size={13} />
                              <span>Edit</span>
                            </button>

                            <button
                              onClick={() => {
                                if (window.confirm(`Delete "${item.name}" from restaurant menu?`)) {
                                  onDeleteMenuItem(item.id);
                                }
                              }}
                              style={{
                                padding: '4px 8px',
                                background: 'var(--danger-bg)',
                                color: 'var(--danger)',
                                border: '1px solid rgba(239, 68, 68, 0.3)',
                                borderRadius: '4px',
                                fontSize: '0.76rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '3px'
                              }}
                              title="Delete item"
                            >
                              <Trash2 size={13} />
                              <span>Delete</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ================= TAB 2: TABLES & CHAIRS (PERSONS CAPACITY) ================= */}
          {activeTab === 'tables' && (
            <div>
              {/* Tables & Chairs Overview Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
                <div style={{ background: 'var(--bg-tertiary)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total Tables</div>
                  <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-main)' }}>{tables.length}</div>
                </div>

                <div style={{ background: 'var(--bg-tertiary)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total Dining Chairs</div>
                  <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--accent-amber-light)' }}>{totalChairs} Chairs</div>
                </div>

                <div style={{ background: 'var(--bg-tertiary)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Occupied Chairs (Dining)</div>
                  <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--status-occupied)' }}>{occupiedChairs} Persons</div>
                </div>

                <div style={{ background: 'var(--bg-tertiary)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Available Chairs</div>
                  <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--status-vacant)' }}>{totalChairs - occupiedChairs} Empty</div>
                </div>
              </div>

              {/* Action Bar */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)' }}>
                  Floor Tables & Chair Configuration
                </h3>

                <button
                  onClick={() => handleOpenTableModal()}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    padding: '0.6rem 1.25rem',
                    background: 'linear-gradient(135deg, #f59e0b, #ea580c)',
                    color: '#ffffff',
                    borderRadius: 'var(--radius-sm)',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    boxShadow: '0 2px 8px rgba(245, 158, 11, 0.35)'
                  }}
                >
                  <Plus size={16} />
                  <span>+ Add New Table</span>
                </button>
              </div>

              {/* Tables Grid with Chairs Management */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: '1rem'
              }}>
                {tables.map(tbl => (
                  <div
                    key={tbl.id}
                    style={{
                      background: 'var(--bg-tertiary)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-subtle)',
                      padding: '1rem',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      position: 'relative'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <div style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '8px',
                            background: 'rgba(245, 158, 11, 0.18)',
                            color: 'var(--accent-amber-light)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 800,
                            fontSize: '0.95rem'
                          }}>
                            T{tbl.id}
                          </div>
                          <div>
                            <h4 style={{ fontWeight: 800, color: 'var(--text-main)', fontSize: '1rem' }}>{tbl.name}</h4>
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>{tbl.section}</span>
                          </div>
                        </div>

                        <span style={{
                          padding: '2px 8px',
                          borderRadius: '12px',
                          fontSize: '0.68rem',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          background: tbl.status === 'vacant' ? 'var(--status-vacant-bg)' : 'var(--status-occupied-bg)',
                          color: tbl.status === 'vacant' ? 'var(--status-vacant)' : 'var(--status-occupied)'
                        }}>
                          {tbl.status}
                        </span>
                      </div>

                      {/* Chairs and Persons Capacity */}
                      <div style={{
                        background: 'var(--bg-secondary)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '0.65rem 0.75rem',
                        marginTop: '0.65rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.35rem',
                        fontSize: '0.8rem'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                            <Armchair size={14} color="var(--accent-amber)" />
                            <span>Chairs (Capacity):</span>
                          </span>
                          <strong style={{ color: 'var(--text-main)', fontSize: '0.9rem' }}>
                            {tbl.capacity} Chairs ({tbl.capacity} Persons)
                          </strong>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ color: 'var(--text-muted)' }}>Assigned Server:</span>
                          <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>{tbl.server}</span>
                        </div>
                      </div>
                    </div>

                    {/* Table Actions: Edit Chairs / Delete Table */}
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-subtle)' }}>
                      <button
                        onClick={() => handleOpenTableModal(tbl)}
                        style={{
                          flex: 1,
                          padding: '0.45rem',
                          background: 'var(--bg-secondary)',
                          color: 'var(--accent-amber-light)',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.3rem'
                        }}
                      >
                        <Edit3 size={13} />
                        <span>Edit Chairs / Area</span>
                      </button>

                      <button
                        onClick={() => {
                          if (tbl.status !== 'vacant') {
                            alert(`Cannot delete ${tbl.name} because it is currently occupied with diners. Clear or settle bill first.`);
                            return;
                          }
                          if (window.confirm(`Delete ${tbl.name} permanently?`)) {
                            onDeleteTable(tbl.id);
                          }
                        }}
                        style={{
                          padding: '0.45rem 0.65rem',
                          background: 'var(--danger-bg)',
                          color: 'var(--danger)',
                          border: '1px solid rgba(239,68,68,0.3)',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '0.78rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                        title="Delete table"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ================= TAB 3: STAFF & PERSONS ================= */}
          {activeTab === 'staff' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)' }}>
                    Restaurant Staff & Serving Personnel
                  </h3>
                  <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                    Manage waiters, table captains and servers handling dining guests
                  </p>
                </div>

                <button
                  onClick={() => setIsStaffModalOpen(true)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    padding: '0.6rem 1.25rem',
                    background: 'linear-gradient(135deg, #f59e0b, #ea580c)',
                    color: '#ffffff',
                    borderRadius: 'var(--radius-sm)',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    boxShadow: '0 2px 8px rgba(245, 158, 11, 0.35)'
                  }}
                >
                  <Plus size={16} />
                  <span>+ Add New Person (Staff)</span>
                </button>
              </div>

              {/* Staff Cards Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
                {staffList.map(person => {
                  const assignedCount = tables.filter(t => t.server === person.name).length;

                  return (
                    <div
                      key={person.id}
                      style={{
                        background: 'var(--bg-tertiary)',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border-subtle)',
                        padding: '1.1rem',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between'
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                            <div style={{
                              width: '40px',
                              height: '40px',
                              borderRadius: '50%',
                              background: 'var(--accent-amber)',
                              color: '#000000',
                              fontWeight: 800,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '1rem'
                            }}>
                              {person.name.charAt(0)}
                            </div>
                            <div>
                              <h4 style={{ fontWeight: 800, color: 'var(--text-main)', fontSize: '1rem' }}>{person.name}</h4>
                              <span style={{ fontSize: '0.74rem', color: 'var(--accent-amber-light)', fontWeight: 600 }}>{person.role}</span>
                            </div>
                          </div>

                          <button
                            onClick={() => {
                              if (window.confirm(`Remove ${person.name} from staff list?`)) {
                                onDeleteStaff(person.id);
                              }
                            }}
                            style={{
                              background: 'transparent',
                              color: 'var(--text-dim)',
                              padding: '4px'
                            }}
                            title="Remove staff member"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>

                        <div style={{ marginTop: '0.85rem', fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                          <div>Phone: <strong style={{ color: 'var(--text-main)' }}>{person.phone}</strong></div>
                          <div>Shift: <strong style={{ color: 'var(--text-main)' }}>{person.shift}</strong></div>
                          <div>Tables Assigned: <strong style={{ color: 'var(--status-vacant)' }}>{assignedCount} Tables</strong></div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ================= TAB 4: KITCHEN KOT (ORDERS RECEIVED) ================= */}
          {activeTab === 'kot' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)' }}>
                      Kitchen Order Tickets (KOT) Dispatch
                    </h3>
                    <span style={{
                      background: 'rgba(245, 158, 11, 0.2)',
                      color: 'var(--accent-amber-light)',
                      border: '1px solid rgba(245, 158, 11, 0.4)',
                      fontSize: '0.7rem',
                      fontWeight: 800,
                      padding: '2px 8px',
                      borderRadius: '12px'
                    }}>
                      ADMIN MONITOR
                    </span>
                  </div>
                  <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                    Select any table number to inspect orders received from table and preparation completed status
                  </p>
                </div>

                {onOpenKOTView && (
                  <button
                    onClick={() => {
                      onClose();
                      onOpenKOTView();
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      padding: '0.55rem 1rem',
                      borderRadius: 'var(--radius-sm)',
                      background: 'linear-gradient(135deg, #f59e0b, #ea580c)',
                      color: '#ffffff',
                      fontWeight: 800,
                      fontSize: '0.82rem',
                      border: 'none',
                      cursor: 'pointer',
                      boxShadow: '0 2px 10px rgba(245, 158, 11, 0.35)'
                    }}
                  >
                    <ExternalLink size={15} />
                    <span>Open Full Screen KOT Screen ↗</span>
                  </button>
                )}
              </div>

              {/* Table Number Selector Strip */}
              <div style={{
                background: 'var(--bg-primary)',
                padding: '0.65rem 1rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)',
                marginBottom: '1.25rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                overflowX: 'auto'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  fontSize: '0.76rem',
                  fontWeight: 800,
                  color: 'var(--accent-amber-light)',
                  marginRight: '0.5rem',
                  flexShrink: 0
                }}>
                  <Filter size={14} />
                  <span>TABLE NO:</span>
                </div>

                <button
                  onClick={() => setAdminKotTableFilter('all')}
                  style={{
                    padding: '0.4rem 0.8rem',
                    borderRadius: '5px',
                    fontSize: '0.78rem',
                    fontWeight: adminKotTableFilter === 'all' ? 800 : 500,
                    background: adminKotTableFilter === 'all' ? 'var(--accent-amber)' : 'var(--bg-secondary)',
                    color: adminKotTableFilter === 'all' ? '#000000' : 'var(--text-muted)',
                    border: adminKotTableFilter === 'all' ? '1px solid var(--accent-amber)' : '1px solid var(--border-subtle)',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                >
                  All Active Tables ({tablesWithOrders.length})
                </button>

                {tables.map(tbl => {
                  const hasOrders = tbl.items && tbl.items.length > 0;
                  const isCompleted = hasOrders && tbl.items.every(i => i.kotStatus === 'served' || i.kotStatus === 'ready');
                  const isSelected = adminKotTableFilter === tbl.id || adminKotTableFilter === tbl.name;
                  const dotColor = isCompleted ? '#10b981' : (hasOrders ? '#f59e0b' : '#64748b');

                  return (
                    <button
                      key={tbl.id}
                      onClick={() => setAdminKotTableFilter(tbl.id)}
                      style={{
                        padding: '0.4rem 0.75rem',
                        borderRadius: '5px',
                        fontSize: '0.78rem',
                        fontWeight: isSelected ? 800 : 500,
                        background: isSelected 
                          ? 'linear-gradient(135deg, #f59e0b, #ea580c)' 
                          : (hasOrders ? 'rgba(245, 158, 11, 0.12)' : 'var(--bg-secondary)'),
                        color: isSelected ? '#ffffff' : (hasOrders ? 'var(--text-main)' : 'var(--text-dim)'),
                        border: isSelected ? '1px solid #ea580c' : '1px solid var(--border-subtle)',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem'
                      }}
                    >
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: dotColor }} />
                      <span>{tbl.name}</span>
                      {hasOrders && (
                        <span style={{
                          background: isSelected ? '#000000' : 'rgba(0,0,0,0.3)',
                          color: isSelected ? '#ffffff' : (isCompleted ? '#10b981' : '#f59e0b'),
                          padding: '1px 5px',
                          borderRadius: '6px',
                          fontSize: '0.65rem',
                          fontWeight: 800
                        }}>
                          {tbl.items.length}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Table KOT Cards */}
              {(() => {
                const kotDisplayTables = tables.filter(t => {
                  if (adminKotTableFilter !== 'all') {
                    return t.id === Number(adminKotTableFilter) || t.name === adminKotTableFilter;
                  }
                  return t.items && t.items.length > 0;
                });

                if (kotDisplayTables.length === 0) {
                  return (
                    <div style={{
                      textAlign: 'center',
                      padding: '3.5rem 1rem',
                      color: 'var(--text-dim)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '0.75rem'
                    }}>
                      <ChefHat size={38} color="var(--accent-amber)" />
                      <h4 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)' }}>
                        {adminKotTableFilter !== 'all' ? `No Active Orders for Table ${adminKotTableFilter}` : 'No Active Kitchen Tickets'}
                      </h4>
                      <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                        Orders dispatched from dining tables will appear here live.
                      </p>
                    </div>
                  );
                }

                return (
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: adminKotTableFilter !== 'all' ? 'minmax(320px, 620px)' : 'repeat(auto-fill, minmax(320px, 1fr))',
                    gap: '1.25rem',
                    justifyContent: adminKotTableFilter !== 'all' ? 'center' : 'stretch'
                  }}>
                    {kotDisplayTables.map(tbl => {
                      const allCompleted = tbl.items && tbl.items.length > 0 && tbl.items.every(i => i.kotStatus === 'served' || i.kotStatus === 'ready');
                      const isCooking = tbl.items && tbl.items.some(i => i.kotStatus === 'cooking');

                      let statusBadge = 'ORDER RECEIVED FROM TABLE';
                      let statusColor = '#f59e0b';
                      let statusBg = 'rgba(245, 158, 11, 0.15)';

                      if (allCompleted) {
                        statusBadge = 'PREPARATION COMPLETED';
                        statusColor = '#10b981';
                        statusBg = 'rgba(16, 185, 129, 0.15)';
                      } else if (isCooking) {
                        statusBadge = 'PREPARING / COOKING';
                        statusColor = '#ea580c';
                        statusBg = 'rgba(234, 88, 12, 0.15)';
                      }

                      return (
                        <div
                          key={tbl.id}
                          style={{
                            background: 'var(--bg-secondary)',
                            borderRadius: 'var(--radius-md)',
                            border: allCompleted ? '2px solid rgba(16, 185, 129, 0.5)' : '2px solid var(--accent-amber)',
                            overflow: 'hidden',
                            display: 'flex',
                            flexDirection: 'column'
                          }}
                        >
                          {/* Table Number Header */}
                          <div style={{
                            padding: '0.85rem 1.1rem',
                            background: 'var(--bg-primary)',
                            borderBottom: '1px solid var(--border-subtle)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                              <div style={{
                                background: allCompleted ? 'var(--status-vacant)' : 'linear-gradient(135deg, #f59e0b, #ea580c)',
                                color: '#ffffff',
                                padding: '0.35rem 0.75rem',
                                borderRadius: '8px',
                                fontWeight: 900,
                                fontSize: '1.15rem'
                              }}>
                                {tbl.name}
                              </div>
                              <div>
                                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)' }}>
                                  {tbl.section} • Server: {tbl.server}
                                </div>
                                <div style={{ fontSize: '0.72rem', color: 'var(--accent-amber-light)' }}>
                                  Order Received: {tbl.orderTime || 'Just Now'}
                                </div>
                              </div>
                            </div>

                            <span style={{
                              padding: '3px 8px',
                              borderRadius: '10px',
                              fontSize: '0.68rem',
                              fontWeight: 800,
                              background: statusBg,
                              color: statusColor,
                              border: `1px solid ${statusColor}40`
                            }}>
                              {statusBadge}
                            </span>
                          </div>

                          {/* Ordered Items List */}
                          <div style={{ padding: '0.9rem 1.1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '280px', overflowY: 'auto' }}>
                            {tbl.items && tbl.items.length > 0 ? (
                              tbl.items.map((item, idx) => (
                                <div
                                  key={idx}
                                  style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    padding: '0.5rem 0.65rem',
                                    borderRadius: 'var(--radius-sm)',
                                    background: 'var(--bg-primary)',
                                    border: '1px solid var(--border-subtle)'
                                  }}
                                >
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                    <span style={{
                                      background: 'var(--accent-amber)',
                                      color: '#000000',
                                      padding: '1px 6px',
                                      borderRadius: '4px',
                                      fontWeight: 900,
                                      fontSize: '0.82rem'
                                    }}>
                                      {item.quantity}x
                                    </span>
                                    <div>
                                      <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-main)' }}>
                                        {item.name}
                                      </div>
                                      {item.notes && (
                                        <div style={{ fontSize: '0.72rem', color: '#f87171', fontWeight: 600 }}>
                                          Note: {item.notes}
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  <span style={{
                                    fontSize: '0.68rem',
                                    fontWeight: 700,
                                    textTransform: 'uppercase',
                                    color: (item.kotStatus === 'served' || item.kotStatus === 'ready') ? '#10b981' : '#f59e0b'
                                  }}>
                                    {(item.kotStatus === 'served' || item.kotStatus === 'ready') ? 'Ready' : 'In Prep'}
                                  </span>
                                </div>
                              ))
                            ) : (
                              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                No items currently ordered for this table.
                              </p>
                            )}
                          </div>

                          {/* Footer Action: Preparation Completed */}
                          {tbl.items && tbl.items.length > 0 && (
                            <div style={{
                              padding: '0.75rem 1.1rem',
                              borderTop: '1px solid var(--border-subtle)',
                              background: 'var(--bg-primary)',
                              display: 'flex',
                              gap: '0.5rem'
                            }}>
                              {!allCompleted ? (
                                <button
                                  onClick={() => onCompleteTableKot && onCompleteTableKot(tbl.id)}
                                  style={{
                                    width: '100%',
                                    padding: '0.65rem',
                                    borderRadius: 'var(--radius-sm)',
                                    background: 'linear-gradient(135deg, #10b981, #059669)',
                                    color: '#ffffff',
                                    fontWeight: 800,
                                    fontSize: '0.84rem',
                                    border: 'none',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '0.4rem',
                                    boxShadow: '0 3px 10px rgba(16, 185, 129, 0.3)'
                                  }}
                                >
                                  <CheckCircle2 size={16} />
                                  <span>Mark Preparation Completed</span>
                                </button>
                              ) : (
                                <div style={{
                                  width: '100%',
                                  padding: '0.6rem',
                                  borderRadius: 'var(--radius-sm)',
                                  background: 'rgba(16, 185, 129, 0.15)',
                                  color: '#10b981',
                                  fontWeight: 800,
                                  fontSize: '0.82rem',
                                  textAlign: 'center',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: '0.35rem'
                                }}>
                                  <CheckCircle2 size={15} />
                                  <span>Preparation Completed (Ready to Serve)</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      </div>

      {/* ================= MODAL: ADD / EDIT MENU ITEM ================= */}
      {isItemModalOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 130,
          padding: '1rem'
        }}>
          <form
            onSubmit={handleSaveItem}
            style={{
              background: 'var(--bg-secondary)',
              border: '1.5px solid var(--border-subtle)',
              borderRadius: 'var(--radius-lg)',
              boxShadow: 'var(--shadow-lg)',
              width: '100%',
              maxWidth: '520px',
              padding: '1.6rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.1rem'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1.5px solid var(--border-subtle)', paddingBottom: '0.85rem' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.01em' }}>
                {editingItem ? 'Edit Dish / Item' : 'Add New Menu Item'}
              </h3>
              <button
                type="button"
                onClick={() => setIsItemModalOpen(false)}
                style={{
                  background: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '6px',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--text-main)',
                  cursor: 'pointer'
                }}
              >
                <X size={18} />
              </button>
            </div>

            <div>
              <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)', display: 'block', marginBottom: '5px' }}>
                Dish Name <span style={{ color: '#ea580c' }}>*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Special Hyderabadi Dum Biryani"
                value={itemForm.name}
                onChange={e => setItemForm({ ...itemForm, name: e.target.value })}
                style={{
                  width: '100%',
                  background: 'var(--bg-tertiary)',
                  border: '1.5px solid var(--border-subtle)',
                  borderRadius: '8px',
                  padding: '0.65rem 0.85rem',
                  color: 'var(--text-main)',
                  fontWeight: 600,
                  fontSize: '0.92rem',
                  outline: 'none'
                }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)', display: 'block', marginBottom: '5px' }}>
                  Category <span style={{ color: '#ea580c' }}>*</span>
                </label>
                <select
                  value={itemForm.category}
                  onChange={e => setItemForm({ ...itemForm, category: e.target.value })}
                  style={{
                    width: '100%',
                    background: 'var(--bg-tertiary)',
                    border: '1.5px solid var(--border-subtle)',
                    borderRadius: '8px',
                    padding: '0.65rem 0.85rem',
                    color: 'var(--text-main)',
                    fontWeight: 600,
                    fontSize: '0.9rem',
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                >
                  {MENU_CATEGORIES.filter(c => c.id !== 'all').map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)', display: 'block', marginBottom: '5px' }}>
                  Price in Rupees (₹) <span style={{ color: '#ea580c' }}>*</span>
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  step="5"
                  value={itemForm.price}
                  onChange={e => setItemForm({ ...itemForm, price: e.target.value })}
                  style={{
                    width: '100%',
                    background: 'var(--bg-tertiary)',
                    border: '1.5px solid var(--border-subtle)',
                    borderRadius: '8px',
                    padding: '0.65rem 0.85rem',
                    color: 'var(--text-main)',
                    fontWeight: 700,
                    fontSize: '0.92rem',
                    fontFamily: 'var(--font-mono)',
                    outline: 'none'
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)', display: 'block', marginBottom: '5px' }}>
                  Dietary Type <span style={{ color: '#ea580c' }}>*</span>
                </label>
                <select
                  value={itemForm.isVeg ? 'veg' : 'non-veg'}
                  onChange={e => setItemForm({ ...itemForm, isVeg: e.target.value === 'veg' })}
                  style={{
                    width: '100%',
                    background: 'var(--bg-tertiary)',
                    border: '1.5px solid var(--border-subtle)',
                    borderRadius: '8px',
                    padding: '0.65rem 0.85rem',
                    color: 'var(--text-main)',
                    fontWeight: 600,
                    fontSize: '0.9rem',
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                >
                  <option value="non-veg">Non-Veg 🔴</option>
                  <option value="veg">Pure Veg 🟢</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)', display: 'block', marginBottom: '5px' }}>
                  Spice Level (0 to 3)
                </label>
                <input
                  type="number"
                  min="0"
                  max="3"
                  value={itemForm.spiceLevel}
                  onChange={e => setItemForm({ ...itemForm, spiceLevel: Number(e.target.value) })}
                  style={{
                    width: '100%',
                    background: 'var(--bg-tertiary)',
                    border: '1.5px solid var(--border-subtle)',
                    borderRadius: '8px',
                    padding: '0.65rem 0.85rem',
                    color: 'var(--text-main)',
                    fontWeight: 700,
                    fontSize: '0.92rem',
                    outline: 'none'
                  }}
                />
              </div>
            </div>

            <div>
              <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)', display: 'block', marginBottom: '5px' }}>
                Short Description
              </label>
              <textarea
                rows="2"
                placeholder="Delicious tender marinated chicken dum biryani cooked with basmati rice..."
                value={itemForm.description}
                onChange={e => setItemForm({ ...itemForm, description: e.target.value })}
                style={{
                  width: '100%',
                  background: 'var(--bg-tertiary)',
                  border: '1.5px solid var(--border-subtle)',
                  borderRadius: '8px',
                  padding: '0.65rem 0.85rem',
                  color: 'var(--text-main)',
                  fontWeight: 500,
                  fontSize: '0.88rem',
                  outline: 'none',
                  resize: 'vertical'
                }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={itemForm.isChefSpecial}
                  onChange={e => setItemForm({ ...itemForm, isChefSpecial: e.target.checked })}
                  style={{ width: '16px', height: '16px', accentColor: 'var(--accent-amber)', cursor: 'pointer' }}
                />
                <span>Mark as Chef's Special ⭐</span>
              </label>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.6rem' }}>
              <button
                type="button"
                onClick={() => setIsItemModalOpen(false)}
                style={{
                  flex: 1,
                  padding: '0.7rem',
                  background: 'var(--bg-tertiary)',
                  border: '1.5px solid var(--border-subtle)',
                  color: 'var(--text-main)',
                  borderRadius: '8px',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>

              <button
                type="submit"
                style={{
                  flex: 2,
                  padding: '0.7rem',
                  background: 'linear-gradient(135deg, #f59e0b, #ea580c)',
                  color: '#ffffff',
                  borderRadius: '8px',
                  fontSize: '0.88rem',
                  fontWeight: 800,
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: '0 3px 12px rgba(234, 88, 12, 0.4)'
                }}
              >
                {editingItem ? 'Save Item Changes' : 'Create Item'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ================= MODAL: ADD / EDIT TABLE & CHAIRS ================= */}
      {isTableModalOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 130,
          padding: '1rem'
        }}>
          <form
            onSubmit={handleSaveTable}
            style={{
              background: 'var(--bg-secondary)',
              border: '1.5px solid var(--border-subtle)',
              borderRadius: 'var(--radius-lg)',
              boxShadow: 'var(--shadow-lg)',
              width: '100%',
              maxWidth: '480px',
              padding: '1.6rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.1rem'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1.5px solid var(--border-subtle)', paddingBottom: '0.85rem' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.01em' }}>
                {editingTable ? `Edit ${editingTable.name}` : 'Add New Restaurant Table'}
              </h3>
              <button
                type="button"
                onClick={() => setIsTableModalOpen(false)}
                style={{
                  background: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '6px',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--text-main)',
                  cursor: 'pointer'
                }}
              >
                <X size={18} />
              </button>
            </div>

            <div>
              <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)', display: 'block', marginBottom: '5px' }}>
                Table Name / Identifier <span style={{ color: '#ea580c' }}>*</span>
              </label>
              <input
                type="text"
                required
                value={tableForm.name}
                onChange={e => setTableForm({ ...tableForm, name: e.target.value })}
                style={{
                  width: '100%',
                  background: 'var(--bg-tertiary)',
                  border: '1.5px solid var(--border-subtle)',
                  borderRadius: '8px',
                  padding: '0.65rem 0.85rem',
                  color: 'var(--text-main)',
                  fontWeight: 600,
                  fontSize: '0.92rem',
                  outline: 'none'
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)', display: 'block', marginBottom: '5px' }}>
                Dining Section / Area <span style={{ color: '#ea580c' }}>*</span>
              </label>
              <select
                value={tableForm.section}
                onChange={e => setTableForm({ ...tableForm, section: e.target.value })}
                style={{
                  width: '100%',
                  background: 'var(--bg-tertiary)',
                  border: '1.5px solid var(--border-subtle)',
                  borderRadius: '8px',
                  padding: '0.65rem 0.85rem',
                  color: 'var(--text-main)',
                  fontWeight: 600,
                  fontSize: '0.92rem',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                <option value="Main Hall">Main Hall</option>
                <option value="Window Side">Window Side</option>
                <option value="Garden Terrace">Garden Terrace</option>
                <option value="AC Family Hall">AC Family Hall</option>
                <option value="VIP Lounge">VIP Lounge</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)', display: 'block', marginBottom: '6px' }}>
                Chairs / Seating Capacity (Persons) <span style={{ color: '#ea580c' }}>*</span>
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.5rem', marginBottom: '0.6rem' }}>
                {[2, 4, 6, 8, 10].map(chairCount => {
                  const isSelected = tableForm.capacity === chairCount;
                  return (
                    <button
                      key={chairCount}
                      type="button"
                      onClick={() => setTableForm({ ...tableForm, capacity: chairCount })}
                      style={{
                        padding: '0.55rem 0.3rem',
                        borderRadius: '8px',
                        background: isSelected ? 'linear-gradient(135deg, #f59e0b, #ea580c)' : 'var(--bg-tertiary)',
                        color: isSelected ? '#ffffff' : 'var(--text-main)',
                        fontWeight: 800,
                        fontSize: '0.82rem',
                        border: isSelected ? '1.5px solid #ea580c' : '1.5px solid var(--border-subtle)',
                        boxShadow: isSelected ? '0 3px 10px rgba(234, 88, 12, 0.35)' : 'none',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {chairCount} Seats
                    </button>
                  );
                })}
              </div>
              <input
                type="number"
                min="1"
                max="30"
                value={tableForm.capacity}
                onChange={e => setTableForm({ ...tableForm, capacity: Number(e.target.value) })}
                style={{
                  width: '100%',
                  background: 'var(--bg-tertiary)',
                  border: '1.5px solid var(--border-subtle)',
                  borderRadius: '8px',
                  padding: '0.65rem 0.85rem',
                  color: 'var(--text-main)',
                  fontWeight: 700,
                  fontSize: '0.92rem',
                  outline: 'none'
                }}
              />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)' }}>
                  Default Server (Person)
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setIsNewServerMode(!isNewServerMode);
                    if (!isNewServerMode) setNewServerName('');
                  }}
                  style={{
                    background: isNewServerMode ? 'rgba(245, 158, 11, 0.18)' : 'var(--bg-tertiary)',
                    color: isNewServerMode ? 'var(--accent-amber)' : 'var(--text-main)',
                    border: isNewServerMode ? '1.5px solid var(--accent-amber)' : '1px solid var(--border-subtle)',
                    borderRadius: '6px',
                    padding: '3px 10px',
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <Plus size={12} />
                  <span>{isNewServerMode ? 'Select Existing Staff' : '+ Add New Server Name'}</span>
                </button>
              </div>

              {!isNewServerMode ? (
                <select
                  value={tableForm.server}
                  onChange={e => {
                    if (e.target.value === '__add_new__') {
                      setIsNewServerMode(true);
                      setNewServerName('');
                    } else {
                      setTableForm({ ...tableForm, server: e.target.value });
                    }
                  }}
                  style={{
                    width: '100%',
                    background: 'var(--bg-tertiary)',
                    border: '1.5px solid var(--border-subtle)',
                    borderRadius: '8px',
                    padding: '0.65rem 0.85rem',
                    color: 'var(--text-main)',
                    fontWeight: 600,
                    fontSize: '0.92rem',
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                >
                  {staffList.map(s => (
                    <option key={s.id} value={s.name}>{s.name} ({s.role})</option>
                  ))}
                  <option value="__add_new__" style={{ color: 'var(--accent-amber)', fontWeight: 800 }}>
                    ➕ + Add New Server Name...
                  </option>
                </select>
              ) : (
                <div style={{
                  background: 'rgba(245, 158, 11, 0.08)',
                  border: '1.5px solid var(--accent-amber)',
                  borderRadius: '8px',
                  padding: '0.85rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.6rem'
                }}>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input
                      type="text"
                      placeholder="Enter New Server Name (e.g. Ramesh K.)"
                      value={newServerName}
                      onChange={e => setNewServerName(e.target.value)}
                      required={isNewServerMode}
                      autoFocus
                      style={{
                        flex: 2,
                        background: 'var(--bg-secondary)',
                        border: '1.5px solid var(--accent-amber)',
                        borderRadius: '6px',
                        padding: '0.6rem 0.75rem',
                        color: 'var(--text-main)',
                        fontWeight: 600,
                        fontSize: '0.88rem',
                        outline: 'none'
                      }}
                    />
                    <select
                      value={newServerRole}
                      onChange={e => setNewServerRole(e.target.value)}
                      style={{
                        flex: 1,
                        background: 'var(--bg-secondary)',
                        border: '1.5px solid var(--border-subtle)',
                        borderRadius: '6px',
                        padding: '0.6rem',
                        color: 'var(--text-main)',
                        fontWeight: 600,
                        fontSize: '0.85rem',
                        outline: 'none',
                        cursor: 'pointer'
                      }}
                    >
                      <option value="Server / Waiter">Server / Waiter</option>
                      <option value="Captain">Captain</option>
                      <option value="Senior Captain">Senior Captain</option>
                      <option value="Stewardess">Stewardess</option>
                      <option value="VIP Lounge Captain">VIP Lounge Captain</option>
                    </select>
                  </div>
                  <p style={{ fontSize: '0.74rem', color: 'var(--accent-amber)', margin: 0, fontWeight: 600 }}>
                    💡 This new server will be assigned to this table and automatically saved to your Staff personnel list!
                  </p>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.6rem' }}>
              <button
                type="button"
                onClick={() => setIsTableModalOpen(false)}
                style={{
                  flex: 1,
                  padding: '0.7rem',
                  background: 'var(--bg-tertiary)',
                  border: '1.5px solid var(--border-subtle)',
                  color: 'var(--text-main)',
                  borderRadius: '8px',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>

              <button
                type="submit"
                style={{
                  flex: 2,
                  padding: '0.7rem',
                  background: 'linear-gradient(135deg, #f59e0b, #ea580c)',
                  color: '#ffffff',
                  borderRadius: '8px',
                  fontSize: '0.88rem',
                  fontWeight: 800,
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: '0 3px 12px rgba(234, 88, 12, 0.4)'
                }}
              >
                {editingTable ? 'Update Table Chairs' : 'Add Table'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ================= MODAL: ADD STAFF PERSON ================= */}
      {isStaffModalOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 130,
          padding: '1rem'
        }}>
          <form
            onSubmit={handleSaveStaff}
            style={{
              background: 'var(--bg-secondary)',
              border: '1.5px solid var(--border-subtle)',
              borderRadius: 'var(--radius-lg)',
              boxShadow: 'var(--shadow-lg)',
              width: '100%',
              maxWidth: '460px',
              padding: '1.6rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.1rem'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1.5px solid var(--border-subtle)', paddingBottom: '0.85rem' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.01em' }}>
                Add New Staff Person
              </h3>
              <button
                type="button"
                onClick={() => setIsStaffModalOpen(false)}
                style={{
                  background: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '6px',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--text-main)',
                  cursor: 'pointer'
                }}
              >
                <X size={18} />
              </button>
            </div>

            <div>
              <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)', display: 'block', marginBottom: '5px' }}>
                Person Full Name <span style={{ color: '#ea580c' }}>*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Ramesh Kumar"
                value={staffForm.name}
                onChange={e => setStaffForm({ ...staffForm, name: e.target.value })}
                style={{
                  width: '100%',
                  background: 'var(--bg-tertiary)',
                  border: '1.5px solid var(--border-subtle)',
                  borderRadius: '8px',
                  padding: '0.65rem 0.85rem',
                  color: 'var(--text-main)',
                  fontWeight: 600,
                  fontSize: '0.92rem',
                  outline: 'none'
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)', display: 'block', marginBottom: '5px' }}>
                Role / Designation
              </label>
              <select
                value={staffForm.role}
                onChange={e => setStaffForm({ ...staffForm, role: e.target.value })}
                style={{
                  width: '100%',
                  background: 'var(--bg-tertiary)',
                  border: '1.5px solid var(--border-subtle)',
                  borderRadius: '8px',
                  padding: '0.65rem 0.85rem',
                  color: 'var(--text-main)',
                  fontWeight: 600,
                  fontSize: '0.92rem',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                <option value="Captain">Captain</option>
                <option value="Head Waiter">Head Waiter</option>
                <option value="Server / Waiter">Server / Waiter</option>
                <option value="Steward">Steward</option>
                <option value="Cashier">Cashier</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)', display: 'block', marginBottom: '5px' }}>
                Contact Phone
              </label>
              <input
                type="text"
                placeholder="+91 98450 12345"
                value={staffForm.phone}
                onChange={e => setStaffForm({ ...staffForm, phone: e.target.value })}
                style={{
                  width: '100%',
                  background: 'var(--bg-tertiary)',
                  border: '1.5px solid var(--border-subtle)',
                  borderRadius: '8px',
                  padding: '0.65rem 0.85rem',
                  color: 'var(--text-main)',
                  fontWeight: 600,
                  fontSize: '0.92rem',
                  outline: 'none'
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)', display: 'block', marginBottom: '5px' }}>
                Shift
              </label>
              <select
                value={staffForm.shift}
                onChange={e => setStaffForm({ ...staffForm, shift: e.target.value })}
                style={{
                  width: '100%',
                  background: 'var(--bg-tertiary)',
                  border: '1.5px solid var(--border-subtle)',
                  borderRadius: '8px',
                  padding: '0.65rem 0.85rem',
                  color: 'var(--text-main)',
                  fontWeight: 600,
                  fontSize: '0.92rem',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                <option value="Morning Shift (10 AM - 4 PM)">Morning Shift (10 AM - 4 PM)</option>
                <option value="Evening Shift (5 PM - 11 PM)">Evening Shift (5 PM - 11 PM)</option>
                <option value="Full Day (11 AM - 11 PM)">Full Day (11 AM - 11 PM)</option>
              </select>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.6rem' }}>
              <button
                type="button"
                onClick={() => setIsStaffModalOpen(false)}
                style={{
                  flex: 1,
                  padding: '0.7rem',
                  background: 'var(--bg-tertiary)',
                  border: '1.5px solid var(--border-subtle)',
                  color: 'var(--text-main)',
                  borderRadius: '8px',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>

              <button
                type="submit"
                style={{
                  flex: 2,
                  padding: '0.7rem',
                  background: 'linear-gradient(135deg, #f59e0b, #ea580c)',
                  color: '#ffffff',
                  borderRadius: '8px',
                  fontSize: '0.88rem',
                  fontWeight: 800,
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: '0 3px 12px rgba(234, 88, 12, 0.4)'
                }}
              >
                Add Person
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
