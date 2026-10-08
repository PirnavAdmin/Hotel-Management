// import React, { useState, useMemo, useEffect, useRef } from 'react';
// import { 
//   ArrowLeft, 
//   Search, 
//   Plus, 
//   Minus, 
//   Trash2, 
//   Receipt, 
//   CreditCard, 
//   ChefHat, 
//   Flame, 
//   Clock, 
//   Calendar,
//   Users, 
//   ArrowRightLeft,
//   Sparkles,
//   FileText,
//   Utensils,
//   Soup,
//   Sandwich,
//   Coffee,
//   IceCream,
//   Percent,
//   X,
//   Filter,
//   ChevronDown,
//   RotateCcw
// } from 'lucide-react';
// import { MENU_CATEGORIES, MENU_ITEMS } from '../data/menuData';
// import { sounds } from '../utils/audio';
// import { formatCurrency } from '../utils/formatCurrency';
// import { parseTimeToSeconds, formatElapsedTimer, getTimerUrgencyColor } from '../utils/timer';

// const CATEGORY_ICONS = {
//   Utensils: Utensils,
//   Flame: Flame,
//   Sparkles: Sparkles,
//   Soup: Soup,
//   Sandwich: Sandwich,
//   Coffee: Coffee,
//   IceCream: IceCream
// };

// export function TableDetailView({
//   table,
//   allTables,
//   menuItems = MENU_ITEMS,
//   onSelectTable,
//   onBackToTables,
//   onAddItemToTable,
//   onUpdateItemQuantity,
//   onRemoveItemFromTable,
//   onUpdateItemNotes,
//   onUpdateGuests,
//   onUpdateDiscount,
//   onToggleServiceCharge,
//   onSendKOT,
//   onOpenReceipt,
//   onOpenSettlement,
//   onOpenTransferModal,
//   onClearOrder,
//   onOpenKOTView
// }) {
//   const [currentTime, setCurrentTime] = useState(new Date());

//   useEffect(() => {
//     const timer = setInterval(() => setCurrentTime(new Date()), 1000);
//     return () => clearInterval(timer);
//   }, []);

//   const [selectedCategory, setSelectedCategory] = useState('all');
//   const [dietaryFilter, setDietaryFilter] = useState('all'); // all | veg | non-veg | special
//   const [searchQuery, setSearchQuery] = useState('');
//   const [editingNoteItemId, setEditingNoteItemId] = useState(null);
//   const [tempNote, setTempNote] = useState('');

//   // Table Quick Filter States for T1, T2 switcher strip
//   const [tableStatusFilter, setTableStatusFilter] = useState('all'); // 'all' | 'vacant' | 'occupied' | 'billed'
//   const [tableSectionFilter, setTableSectionFilter] = useState('all'); // 'all' | 'Main Hall' | ...
//   const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
//   const filterDropdownRef = useRef(null);
//   const filterButtonRef = useRef(null);

//   // Close filter dropdown on click outside or escape key
//   useEffect(() => {
//     function handleClickOutside(event) {
//       if (
//         filterDropdownRef.current && 
//         !filterDropdownRef.current.contains(event.target) &&
//         filterButtonRef.current &&
//         !filterButtonRef.current.contains(event.target)
//       ) {
//         setIsFilterDropdownOpen(false);
//       }
//     }
//     function handleKeyDown(event) {
//       if (event.key === 'Escape') {
//         setIsFilterDropdownOpen(false);
//       }
//     }
//     if (isFilterDropdownOpen) {
//       document.addEventListener('mousedown', handleClickOutside);
//       window.addEventListener('keydown', handleKeyDown);
//     }
//     return () => {
//       document.removeEventListener('mousedown', handleClickOutside);
//       window.removeEventListener('keydown', handleKeyDown);
//     };
//   }, [isFilterDropdownOpen]);

//   // Dynamic filtered tables for quick switcher
//   const filteredQuickTables = useMemo(() => {
//     return (allTables || []).filter(t => {
//       const matchStatus = tableStatusFilter === 'all' || t.status === tableStatusFilter;
//       const matchSection = tableSectionFilter === 'all' || t.section === tableSectionFilter;
//       return matchStatus && matchSection;
//     });
//   }, [allTables, tableStatusFilter, tableSectionFilter]);

//   // Filtered menu items with spelling tolerance for biriyani / biryani
//   const filteredMenuItems = useMemo(() => {
//     const query = searchQuery.trim().toLowerCase();
//     const normalizedQuery = query.replace(/biriyani/g, 'biryani');

//     return (menuItems || MENU_ITEMS).filter(item => {
//       const matchCat = selectedCategory === 'all' || item.category === selectedCategory;

//       const itemTitle = item.name.toLowerCase();
//       const itemDesc = item.description.toLowerCase();
//       const itemCat = item.category.toLowerCase();

//       const matchSearch = !query || 
//         itemTitle.includes(query) || 
//         itemTitle.includes(normalizedQuery) ||
//         itemDesc.includes(query) || 
//         itemDesc.includes(normalizedQuery) ||
//         itemCat.includes(query) ||
//         itemCat.includes(normalizedQuery);

//       let matchDietary = true;
//       if (dietaryFilter === 'veg') matchDietary = item.isVeg;
//       if (dietaryFilter === 'non-veg') matchDietary = !item.isVeg;
//       if (dietaryFilter === 'special') matchDietary = item.isChefSpecial;

//       return matchCat && matchSearch && matchDietary;
//     });
//   }, [selectedCategory, dietaryFilter, searchQuery, menuItems]);

//   // Financial calculations in Rupees
//   const subtotal = table.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
//   const discountAmount = (subtotal * (table.discountPercent || 0)) / 100;
//   const taxableAmount = Math.max(0, subtotal - discountAmount);
//   const taxRate = 0.05; // 5% GST (2.5% CGST + 2.5% SGST)
//   const taxAmount = taxableAmount * taxRate;
//   const serviceChargeAmount = table.serviceCharge ? (taxableAmount * (table.serviceCharge / 100)) : 0;
//   const grandTotal = Math.round(taxableAmount + taxAmount + serviceChargeAmount);

//   // Find quantity of an item already in the table order
//   const getItemQuantityInCart = (itemId) => {
//     const found = table.items.find(i => i.id === itemId);
//     return found ? found.quantity : 0;
//   };

//   const handleAddItem = (item) => {
//     sounds.playAddItem();
//     onAddItemToTable(table.id, item);
//   };

//   const handleSaveNote = (itemId) => {
//     onUpdateItemNotes(table.id, itemId, tempNote);
//     setEditingNoteItemId(null);
//     setTempNote('');
//   };

//   return (
//     <div style={{ 
//       display: 'flex', 
//       flexDirection: 'column', 
//       height: 'calc(100vh - 68px)', 
//       minHeight: '600px',
//       overflow: 'hidden' 
//     }}>

//       {/* Top Table Switcher Strip & Table Info Bar */}
//       <div style={{
//         background: 'var(--bg-secondary)',
//         borderBottom: '1px solid var(--border-subtle)',
//         padding: '0.65rem 1.5rem',
//         display: 'flex',
//         alignItems: 'center',
//         justifyContent: 'space-between',
//         flexWrap: 'wrap',
//         gap: '0.85rem',
//         flexShrink: 0
//       }}>
//         {/* Left: Back & Table Identifiers */}
//         <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
//           <button
//             onClick={onBackToTables}
//             style={{
//               display: 'flex',
//               alignItems: 'center',
//               gap: '0.4rem',
//               padding: '0.45rem 0.8rem',
//               background: 'var(--bg-tertiary)',
//               color: 'var(--text-main)',
//               borderRadius: 'var(--radius-sm)',
//               fontSize: '0.82rem',
//               fontWeight: 600,
//               border: '1px solid var(--border-subtle)'
//             }}
//             onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent-amber)'}
//             onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-subtle)'}
//           >
//             <ArrowLeft size={16} />
//             <span>All Tables</span>
//           </button>

//           <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
//             <div style={{
//               background: 'linear-gradient(135deg, #f59e0b, #ea580c)',
//               color: '#ffffff',
//               padding: '0.35rem 0.75rem',
//               borderRadius: 'var(--radius-sm)',
//               fontWeight: 800,
//               fontSize: '1rem',
//               boxShadow: '0 2px 8px rgba(245, 158, 11, 0.35)'
//             }}>
//               {table.name}
//             </div>
//             <div>
//               <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
//                 <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{table.section}</span>
//                 <span style={{ color: 'var(--text-dim)' }}>•</span>
//                 <span style={{
//                   fontSize: '0.72rem',
//                   fontWeight: 700,
//                   textTransform: 'uppercase',
//                   color: table.status === 'vacant' ? 'var(--status-vacant)' : 'var(--status-occupied)',
//                   background: table.status === 'vacant' ? 'var(--status-vacant-bg)' : 'var(--status-occupied-bg)',
//                   padding: '1px 6px',
//                   borderRadius: '4px'
//                 }}>
//                   {table.status}
//                 </span>
//               </div>
//             </div>
//           </div>

//           {/* Guest Count Stepper */}
//           <div style={{
//             display: 'flex',
//             alignItems: 'center',
//             gap: '0.4rem',
//             background: 'var(--bg-tertiary)',
//             padding: '0.25rem 0.5rem',
//             borderRadius: 'var(--radius-sm)',
//             border: '1px solid var(--border-subtle)',
//             fontSize: '0.78rem'
//           }}>
//             <Users size={13} color="var(--text-muted)" />
//             <span style={{ color: 'var(--text-muted)' }}>Guests:</span>
//             <button
//               onClick={() => onUpdateGuests(table.id, Math.max(1, table.guests - 1))}
//               style={{
//                 background: 'rgba(255,255,255,0.08)',
//                 color: 'var(--text-main)',
//                 width: '20px',
//                 height: '20px',
//                 borderRadius: '4px',
//                 display: 'flex',
//                 alignItems: 'center',
//                 justifyContent: 'center'
//               }}
//             >
//               -
//             </button>
//             <span style={{ fontWeight: 700, minWidth: '16px', textAlign: 'center' }}>{table.guests}</span>
//             <button
//               onClick={() => onUpdateGuests(table.id, table.guests + 1)}
//               style={{
//                 background: 'rgba(255,255,255,0.08)',
//                 color: 'var(--text-main)',
//                 width: '20px',
//                 height: '20px',
//                 borderRadius: '4px',
//                 display: 'flex',
//                 alignItems: 'center',
//                 justifyContent: 'center'
//               }}
//             >
//               +
//             </button>
//           </div>

//           {/* Live Table Dining Timer Widget */}
//           {table.orderTime && (() => {
//             const elapsedSec = parseTimeToSeconds(table.orderTime);
//             const elapsedFormatted = formatElapsedTimer(elapsedSec);
//             const urgency = getTimerUrgencyColor(elapsedSec);

//             return (
//               <div 
//                 style={{
//                   display: 'flex',
//                   alignItems: 'center',
//                   gap: '0.45rem',
//                   background: urgency.bg,
//                   border: `1px solid ${urgency.border}`,
//                   padding: '0.28rem 0.65rem',
//                   borderRadius: 'var(--radius-sm)',
//                   fontSize: '0.78rem',
//                   fontWeight: 700,
//                   color: urgency.text
//                 }}
//                 title={`Table seated at ${table.orderTime}. Live dining elapsed duration: ${elapsedFormatted}`}
//               >
//                 <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
//                   <Calendar size={13} color="var(--accent-amber)" />
//                   <span>{new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
//                 </span>
//                 <span style={{ opacity: 0.5 }}>•</span>
//                 <Clock size={13} className="pulse-indicator" color={urgency.dot} />
//                 <span>Seated: <strong>{table.orderTime}</strong></span>
//                 <span style={{ opacity: 0.5 }}>•</span>
//                 <span style={{ fontFamily: 'monospace', fontWeight: 800 }}>⏱ {elapsedFormatted}</span>
//               </div>
//             );
//           })()}
//         </div>

//         {/* Right Table Actions */}
//         <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
//           <button
//             onClick={onOpenTransferModal}
//             style={{
//               display: 'flex',
//               alignItems: 'center',
//               gap: '0.35rem',
//               padding: '0.4rem 0.75rem',
//               borderRadius: 'var(--radius-sm)',
//               background: 'var(--bg-tertiary)',
//               color: 'var(--text-main)',
//               border: '1px solid var(--border-subtle)',
//               fontSize: '0.78rem',
//               fontWeight: 600
//             }}
//             title="Move this order to another table"
//           >
//             <ArrowRightLeft size={13} color="var(--accent-amber)" />
//             <span>Transfer</span>
//           </button>

//           {table.items.length > 0 && (
//             <button
//               onClick={() => onClearOrder(table.id)}
//               style={{
//                 display: 'flex',
//                 alignItems: 'center',
//                 gap: '0.35rem',
//                 padding: '0.4rem 0.75rem',
//                 borderRadius: 'var(--radius-sm)',
//                 background: 'var(--danger-bg)',
//                 color: 'var(--danger)',
//                 border: '1px solid rgba(239, 68, 68, 0.25)',
//                 fontSize: '0.78rem',
//                 fontWeight: 600
//               }}
//               title="Void / Clear current items"
//             >
//               <Trash2 size={13} />
//               <span>Void</span>
//             </button>
//           )}

//           {/* Tables Dropdown Button (Right Corner) */}
//           <div style={{ position: 'relative' }}>
//             <button
//               ref={filterButtonRef}
//               onClick={() => setIsFilterDropdownOpen(prev => !prev)}
//               style={{
//                 display: 'flex',
//                 alignItems: 'center',
//                 gap: '0.35rem',
//                 padding: '0.4rem 0.75rem',
//                 borderRadius: 'var(--radius-sm)',
//                 fontSize: '0.78rem',
//                 fontWeight: 700,
//                 background: (tableStatusFilter !== 'all' || tableSectionFilter !== 'all' || isFilterDropdownOpen)
//                   ? 'rgba(245, 158, 11, 0.22)' 
//                   : 'var(--bg-tertiary)',
//                 color: (tableStatusFilter !== 'all' || tableSectionFilter !== 'all' || isFilterDropdownOpen)
//                   ? 'var(--accent-amber-light)' 
//                   : 'var(--text-main)',
//                 border: (tableStatusFilter !== 'all' || tableSectionFilter !== 'all' || isFilterDropdownOpen)
//                   ? '1px solid var(--accent-amber)' 
//                   : '1px solid var(--border-subtle)',
//                 cursor: 'pointer',
//                 whiteSpace: 'nowrap',
//                 transition: 'all 0.15s ease'
//               }}
//               title="Filter and switch tables"
//             >
//               <Filter size={13} color="var(--accent-amber)" />
//               <span>Tables</span>
//               {(tableStatusFilter !== 'all' || tableSectionFilter !== 'all') && (
//                 <span style={{
//                   width: '6px',
//                   height: '6px',
//                   borderRadius: '50%',
//                   backgroundColor: 'var(--accent-amber)'
//                 }} />
//               )}
//               <ChevronDown 
//                 size={12} 
//                 style={{
//                   transform: isFilterDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
//                   transition: 'transform 0.2s ease'
//                 }} 
//               />
//             </button>

//             {/* Filter Popover Dropdown */}
//             {isFilterDropdownOpen && (
//               <div
//                 ref={filterDropdownRef}
//                 style={{
//                   position: 'absolute',
//                   top: 'calc(100% + 8px)',
//                   right: 0,
//                   zIndex: 1000,
//                   background: 'var(--bg-secondary)',
//                   border: '1px solid var(--border-subtle)',
//                   borderRadius: 'var(--radius-md)',
//                   boxShadow: '0 16px 40px rgba(0,0,0,0.65), 0 0 0 1px rgba(255,255,255,0.07)',
//                   width: '420px',
//                   maxWidth: '92vw',
//                   padding: '1rem',
//                   color: 'var(--text-main)'
//                 }}
//               >
//                 {/* Popover Header */}
//                 <div style={{
//                   display: 'flex',
//                   alignItems: 'center',
//                   justifyContent: 'space-between',
//                   marginBottom: '0.85rem',
//                   paddingBottom: '0.6rem',
//                   borderBottom: '1px solid var(--border-subtle)'
//                 }}>
//                   <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
//                     <Filter size={15} color="var(--accent-amber)" />
//                     <span style={{ fontWeight: 800, fontSize: '0.9rem' }}>Filter Tables</span>
//                   </div>
//                   <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
//                     {(tableStatusFilter !== 'all' || tableSectionFilter !== 'all') && (
//                       <button
//                         onClick={() => {
//                           setTableStatusFilter('all');
//                           setTableSectionFilter('all');
//                         }}
//                         style={{
//                           background: 'none',
//                           border: 'none',
//                           color: 'var(--accent-amber)',
//                           fontSize: '0.74rem',
//                           fontWeight: 700,
//                           cursor: 'pointer',
//                           padding: '2px 4px',
//                           display: 'flex',
//                           alignItems: 'center',
//                           gap: '3px'
//                         }}
//                       >
//                         <RotateCcw size={11} />
//                         <span>Show All</span>
//                       </button>
//                     )}
//                     <button
//                       onClick={() => setIsFilterDropdownOpen(false)}
//                       style={{
//                         background: 'none',
//                         border: 'none',
//                         color: 'var(--text-muted)',
//                         cursor: 'pointer',
//                         padding: '2px',
//                         display: 'flex',
//                         alignItems: 'center'
//                       }}
//                     >
//                       <X size={15} />
//                     </button>
//                   </div>
//                 </div>

//                 {/* Status Filter */}
//                 <div style={{ marginBottom: '0.85rem' }}>
//                   <div style={{ 
//                     fontSize: '0.72rem', 
//                     color: 'var(--text-muted)', 
//                     fontWeight: 700, 
//                     textTransform: 'uppercase', 
//                     letterSpacing: '0.04em',
//                     marginBottom: '0.4rem' 
//                   }}>
//                     Filter by Status
//                   </div>
//                   <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.35rem' }}>
//                     {[
//                       { id: 'all', label: 'All Tables', count: allTables.length },
//                       { id: 'vacant', label: 'Vacant', count: allTables.filter(t => t.status === 'vacant').length, dot: 'var(--status-vacant)' },
//                       { id: 'occupied', label: 'Occupied', count: allTables.filter(t => t.status === 'occupied').length, dot: 'var(--status-occupied)' },
//                       { id: 'billed', label: 'Billed', count: allTables.filter(t => t.status === 'billed').length, dot: 'var(--status-billed)' }
//                     ].map(st => {
//                       const isSelected = tableStatusFilter === st.id;
//                       return (
//                         <button
//                           key={st.id}
//                           onClick={() => setTableStatusFilter(st.id)}
//                           style={{
//                             padding: '0.45rem 0.4rem',
//                             borderRadius: '6px',
//                             fontSize: '0.74rem',
//                             fontWeight: isSelected ? 800 : 600,
//                             background: isSelected ? 'rgba(245, 158, 11, 0.22)' : 'var(--bg-tertiary)',
//                             color: isSelected ? 'var(--accent-amber-light)' : 'var(--text-main)',
//                             border: isSelected ? '1px solid var(--accent-amber)' : '1px solid var(--border-subtle)',
//                             display: 'flex',
//                             flexDirection: 'column',
//                             alignItems: 'center',
//                             gap: '2px',
//                             cursor: 'pointer'
//                           }}
//                         >
//                           <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
//                             {st.dot && <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: st.dot }} />}
//                             <span>{st.label}</span>
//                           </div>
//                           <span style={{ 
//                             fontSize: '0.68rem', 
//                             color: isSelected ? 'var(--accent-amber-light)' : 'var(--text-dim)', 
//                             fontWeight: 700 
//                           }}>
//                             ({st.count})
//                           </span>
//                         </button>
//                       );
//                     })}
//                   </div>
//                 </div>

//                 {/* Area / Section Filter */}
//                 <div style={{ marginBottom: '0.95rem' }}>
//                   <div style={{ 
//                     fontSize: '0.72rem', 
//                     color: 'var(--text-muted)', 
//                     fontWeight: 700, 
//                     textTransform: 'uppercase', 
//                     letterSpacing: '0.04em',
//                     marginBottom: '0.4rem' 
//                   }}>
//                     Filter by Area / Section
//                   </div>
//                   <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
//                     {['all', 'Main Hall', 'Window Side', 'Garden Terrace', 'VIP Lounge'].map(sec => {
//                       const isSelected = tableSectionFilter === sec;
//                       const count = sec === 'all' 
//                         ? allTables.length 
//                         : allTables.filter(t => t.section === sec).length;
//                       return (
//                         <button
//                           key={sec}
//                           onClick={() => setTableSectionFilter(sec)}
//                           style={{
//                             padding: '0.3rem 0.6rem',
//                             borderRadius: '6px',
//                             fontSize: '0.73rem',
//                             fontWeight: isSelected ? 800 : 500,
//                             background: isSelected ? 'var(--accent-amber)' : 'var(--bg-tertiary)',
//                             color: isSelected ? '#000000' : 'var(--text-muted)',
//                             border: isSelected ? '1px solid var(--accent-amber)' : '1px solid var(--border-subtle)',
//                             cursor: 'pointer'
//                           }}
//                         >
//                           {sec === 'all' ? 'All Areas' : sec} ({count})
//                         </button>
//                       );
//                     })}
//                   </div>
//                 </div>

//                 {/* Show All Tables Grid in Popover */}
//                 <div>
//                   <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.45rem' }}>
//                     <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
//                       Quick Jump to Table ({filteredQuickTables.length})
//                     </span>
//                     <span style={{ fontSize: '0.68rem', color: 'var(--text-dim)' }}>
//                       Click any table
//                     </span>
//                   </div>
//                   <div style={{
//                     display: 'grid',
//                     gridTemplateColumns: 'repeat(5, 1fr)',
//                     gap: '0.4rem',
//                     maxHeight: '175px',
//                     overflowY: 'auto',
//                     padding: '2px'
//                   }}>
//                     {filteredQuickTables.map(t => {
//                       const isCurrent = t.id === table.id;
//                       let dotColor = 'var(--status-vacant)';
//                       if (t.status === 'occupied') dotColor = 'var(--status-occupied)';
//                       if (t.status === 'billed') dotColor = 'var(--status-billed)';

//                       return (
//                         <button
//                           key={t.id}
//                           onClick={() => {
//                             onSelectTable(t.id);
//                             setIsFilterDropdownOpen(false);
//                           }}
//                           style={{
//                             padding: '0.45rem 0.35rem',
//                             borderRadius: '6px',
//                             background: isCurrent 
//                               ? 'var(--accent-amber)' 
//                               : (t.status !== 'vacant' ? 'var(--bg-tertiary)' : 'rgba(255,255,255,0.04)'),
//                             color: isCurrent ? '#000000' : 'var(--text-main)',
//                             border: isCurrent 
//                               ? '1px solid var(--accent-amber)' 
//                               : '1px solid var(--border-subtle)',
//                             display: 'flex',
//                             flexDirection: 'column',
//                             alignItems: 'center',
//                             gap: '2px',
//                             cursor: 'pointer'
//                           }}
//                           title={`${t.name} - ${t.section} (${t.status})`}
//                         >
//                           <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
//                             {!isCurrent && <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: dotColor }} />}
//                             <span style={{ fontWeight: 800, fontSize: '0.8rem' }}>T{t.id}</span>
//                           </div>
//                           <span style={{ 
//                             fontSize: '0.62rem', 
//                             color: isCurrent ? 'rgba(0,0,0,0.7)' : 'var(--text-dim)',
//                             textTransform: 'capitalize' 
//                           }}>
//                             {t.status}
//                           </span>
//                         </button>
//                       );
//                     })}
//                   </div>
//                 </div>

//                 {/* Popover Footer: Floor Plan shortcut */}
//                 <div style={{
//                   marginTop: '0.85rem',
//                   paddingTop: '0.65rem',
//                   borderTop: '1px solid var(--border-subtle)',
//                   display: 'flex',
//                   justifyContent: 'space-between',
//                   alignItems: 'center'
//                 }}>
//                   <button
//                     onClick={() => {
//                       setIsFilterDropdownOpen(false);
//                       onBackToTables();
//                     }}
//                     style={{
//                       display: 'flex',
//                       alignItems: 'center',
//                       gap: '0.35rem',
//                       background: 'none',
//                       border: 'none',
//                       color: 'var(--accent-amber)',
//                       fontSize: '0.78rem',
//                       fontWeight: 700,
//                       cursor: 'pointer',
//                       padding: '2px 4px'
//                     }}
//                   >
//                     <ArrowLeft size={13} />
//                     <span>Show All Tables on Floor Plan</span>
//                   </button>
//                 </div>
//               </div>
//             )}
//           </div>
//         </div>
//       </div>

//       {/* Main Workspace: Left Menu & Right Bill Cart */}
//       <div style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' }}>

//         {/* Left Side: Interactive Restaurant Menu */}
//         <div style={{
//           flex: 1,
//           display: 'flex',
//           flexDirection: 'column',
//           borderRight: '1px solid var(--border-subtle)',
//           minHeight: 0,
//           overflow: 'hidden'
//         }}>
//           {/* Menu Search & Dietary Filters Bar */}
//           <div style={{
//             padding: '0.85rem 1.25rem',
//             background: 'var(--bg-primary)',
//             borderBottom: '1px solid var(--border-subtle)',
//             display: 'flex',
//             alignItems: 'center',
//             justifyContent: 'space-between',
//             gap: '1rem',
//             flexWrap: 'wrap',
//             flexShrink: 0
//           }}>
//             {/* Search Input */}
//             <div style={{ position: 'relative', flex: '1', minWidth: '220px', maxWidth: '440px' }}>
//               <Search size={16} color="var(--text-dim)" style={{ position: 'absolute', left: '12px', top: '11px' }} />
//               <input
//                 type="text"
//                 placeholder="Search Biryani, Chicken 65, Naan, Desserts..."
//                 value={searchQuery}
//                 onChange={e => setSearchQuery(e.target.value)}
//                 style={{
//                   width: '100%',
//                   background: 'var(--bg-secondary)',
//                   border: '1px solid var(--border-subtle)',
//                   borderRadius: 'var(--radius-md)',
//                   color: 'var(--text-main)',
//                   padding: '0.55rem 1rem 0.55rem 2.25rem',
//                   fontSize: '0.85rem'
//                 }}
//               />
//               {searchQuery && (
//                 <button
//                   onClick={() => setSearchQuery('')}
//                   style={{
//                     position: 'absolute',
//                     right: '10px',
//                     top: '8px',
//                     background: 'transparent',
//                     color: 'var(--text-muted)'
//                   }}
//                 >
//                   <X size={15} />
//                 </button>
//               )}
//             </div>

//             {/* Dietary Quick Filters */}
//             <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
//               {[
//                 { id: 'all', label: 'All Dishes' },
//                 { id: 'veg', label: 'Pure Veg 🟢' },
//                 { id: 'non-veg', label: 'Non-Veg 🔴' },
//                 { id: 'special', label: 'Chef Specials ⭐' }
//               ].map(f => (
//                 <button
//                   key={f.id}
//                   onClick={() => setDietaryFilter(f.id)}
//                   style={{
//                     padding: '0.45rem 0.75rem',
//                     borderRadius: 'var(--radius-sm)',
//                     fontSize: '0.78rem',
//                     fontWeight: dietaryFilter === f.id ? 700 : 500,
//                     background: dietaryFilter === f.id ? 'var(--bg-tertiary)' : 'var(--bg-secondary)',
//                     color: dietaryFilter === f.id ? 'var(--accent-amber-light)' : 'var(--text-muted)',
//                     border: dietaryFilter === f.id ? '1px solid var(--accent-amber)' : '1px solid var(--border-subtle)'
//                   }}
//                 >
//                   {f.label}
//                 </button>
//               ))}
//             </div>
//           </div>

//           {/* Category Horizontal Navigation with Biryani Highlight */}
//           <div style={{
//             display: 'flex',
//             gap: '0.5rem',
//             padding: '0.75rem 1.25rem',
//             background: 'var(--bg-primary)',
//             overflowX: 'auto',
//             borderBottom: '1px solid var(--border-subtle)',
//             flexShrink: 0
//           }}>
//             {MENU_CATEGORIES.map(category => {
//               const isSelected = selectedCategory === category.id;
//               const IconComp = CATEGORY_ICONS[category.icon] || Utensils;
//               const isBiryaniCat = category.id === 'biryani';

//               return (
//                 <button
//                   key={category.id}
//                   onClick={() => setSelectedCategory(category.id)}
//                   style={{
//                     display: 'flex',
//                     alignItems: 'center',
//                     gap: '0.45rem',
//                     padding: '0.5rem 0.9rem',
//                     borderRadius: 'var(--radius-md)',
//                     fontSize: '0.82rem',
//                     fontWeight: isSelected ? 700 : (isBiryaniCat ? 700 : 500),
//                     background: isSelected 
//                       ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.3) 0%, rgba(245, 158, 11, 0.12) 100%)' 
//                       : (isBiryaniCat ? 'rgba(245, 158, 11, 0.08)' : 'var(--bg-secondary)'),
//                     color: isSelected 
//                       ? 'var(--accent-amber-light)' 
//                       : (isBiryaniCat ? 'var(--accent-amber-light)' : 'var(--text-muted)'),
//                     border: isSelected 
//                       ? '1px solid var(--accent-amber)' 
//                       : (isBiryaniCat ? '1px solid rgba(245, 158, 11, 0.3)' : '1px solid var(--border-subtle)'),
//                     whiteSpace: 'nowrap'
//                   }}
//                 >
//                   <IconComp size={15} color={isSelected || isBiryaniCat ? 'var(--accent-amber)' : 'var(--text-dim)'} />
//                   <span>{category.name}</span>
//                 </button>
//               );
//             })}
//           </div>

//           {/* Menu Items Grid - Compact dishes per row */}
//           <div style={{
//             flex: 1,
//             minHeight: 0,
//             overflowY: 'auto',
//             padding: '0.65rem',
//             display: 'grid',
//             gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
//             gridAutoRows: 'min-content',
//             gap: '0.55rem',
//             alignContent: 'start'
//           }}>
//             {filteredMenuItems.length === 0 ? (
//               <div style={{
//                 gridColumn: '1 / -1',
//                 textAlign: 'center',
//                 padding: '4rem 1rem',
//                 color: 'var(--text-dim)'
//               }}>
//                 <Flame size={42} color="var(--accent-amber)" style={{ margin: '0 auto 0.75rem auto' }} />
//                 <h4 style={{ color: 'var(--text-main)', fontSize: '1.1rem', fontWeight: 700 }}>
//                   No dishes match "{searchQuery}"
//                 </h4>
//                 <p style={{ fontSize: '0.85rem', marginTop: '0.35rem', color: 'var(--text-muted)' }}>
//                   Try searching for "Biryani", "Chicken", "Paneer", "Tandoori" or click "All Items".
//                 </p>
//                 <button
//                   onClick={() => {
//                     setSearchQuery('');
//                     setSelectedCategory('all');
//                     setDietaryFilter('all');
//                   }}
//                   style={{
//                     marginTop: '1rem',
//                     padding: '0.5rem 1rem',
//                     background: 'var(--accent-amber)',
//                     color: '#000000',
//                     borderRadius: 'var(--radius-sm)',
//                     fontWeight: 700,
//                     fontSize: '0.82rem'
//                   }}
//                 >
//                   Show All Dishes
//                 </button>
//               </div>
//             ) : (
//               filteredMenuItems.map(item => {
//                 const currentQty = getItemQuantityInCart(item.id);

//                 return (
//                   <div
//                     key={item.id}
//                     style={{
//                       background: 'var(--bg-secondary)',
//                       borderRadius: 'var(--radius-sm)',
//                       border: currentQty > 0 ? '2px solid var(--accent-amber)' : '1px solid var(--border-subtle)',
//                       overflow: 'hidden',
//                       display: 'flex',
//                       flexDirection: 'column',
//                       boxShadow: currentQty > 0 ? '0 3px 10px rgba(245, 158, 11, 0.22)' : 'var(--shadow-sm)',
//                       transition: 'border-color 0.15s, box-shadow 0.15s'
//                     }}
//                   >
//                     {/* Item Image with culinary tags */}
//                     <div style={{
//                       position: 'relative',
//                       height: '78px',
//                       minHeight: '78px',
//                       flexShrink: 0,
//                       overflow: 'hidden',
//                       background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
//                       display: 'flex',
//                       alignItems: 'center',
//                       justifyContent: 'center'
//                     }}>
//                       <img 
//                         src={item.image} 
//                         alt={item.name} 
//                         loading="lazy"
//                         style={{
//                           width: '100%',
//                           height: '100%',
//                           objectFit: 'cover',
//                           display: 'block'
//                         }}
//                         onError={(e) => {
//                           e.target.style.opacity = '0';
//                         }}
//                       />

//                       {/* Fallback Icon when image loading */}
//                       <div style={{
//                         position: 'absolute',
//                         zIndex: 0,
//                         opacity: 0.25,
//                         display: 'flex',
//                         alignItems: 'center',
//                         justifyContent: 'center'
//                       }}>
//                         <Utensils size={26} color="var(--accent-amber)" />
//                       </div>

//                       {/* Veg / Non-Veg Indicator badge */}
//                       <div style={{
//                         position: 'absolute',
//                         top: '4px',
//                         left: '4px',
//                         zIndex: 2,
//                         background: 'rgba(0, 0, 0, 0.82)',
//                         backdropFilter: 'blur(3px)',
//                         padding: '1px 4px',
//                         borderRadius: '3px',
//                         display: 'flex',
//                         alignItems: 'center',
//                         gap: '3px',
//                         fontSize: '0.55rem',
//                         fontWeight: 750,
//                         color: '#ffffff',
//                         border: '1px solid rgba(255,255,255,0.1)'
//                       }}>
//                         <span style={{
//                           width: '5px',
//                           height: '5px',
//                           borderRadius: '2px',
//                           backgroundColor: item.isVeg ? '#10b981' : '#ef4444',
//                           display: 'inline-block'
//                         }} />
//                         <span>{item.isVeg ? 'VEG' : 'NON-VEG'}</span>
//                       </div>

//                       {/* Chef Special Badge */}
//                       {item.isChefSpecial && (
//                         <div style={{
//                           position: 'absolute',
//                           top: '4px',
//                           right: '4px',
//                           zIndex: 2,
//                           background: 'linear-gradient(135deg, #f59e0b, #ea580c)',
//                           color: '#ffffff',
//                           padding: '1px 5px',
//                           borderRadius: '3px',
//                           fontSize: '0.52rem',
//                           fontWeight: 800,
//                           display: 'flex',
//                           alignItems: 'center',
//                           gap: '2px',
//                           boxShadow: '0 2px 4px rgba(0,0,0,0.4)'
//                         }}>
//                           <Sparkles size={9} />
//                           <span>CHEF'S PICK</span>
//                         </div>
//                       )}

//                       {/* Prep time badge */}
//                       <div style={{
//                         position: 'absolute',
//                         bottom: '4px',
//                         right: '4px',
//                         zIndex: 2,
//                         background: 'rgba(0, 0, 0, 0.78)',
//                         color: '#ffffff',
//                         padding: '1px 4px',
//                         borderRadius: '3px',
//                         fontSize: '0.55rem',
//                         display: 'flex',
//                         alignItems: 'center',
//                         gap: '2px'
//                       }}>
//                         <Clock size={9} />
//                         <span>{item.prepTime}</span>
//                       </div>
//                     </div>

//                     {/* Item Content with Title, Description, and Actions */}
//                     <div style={{
//                       padding: '0.45rem 0.55rem',
//                       flex: 1,
//                       display: 'flex',
//                       flexDirection: 'column',
//                       justifyContent: 'space-between'
//                     }}>
//                       <div>
//                         <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.3rem' }}>
//                           <h4 style={{ 
//                             fontSize: '0.78rem', 
//                             fontWeight: 800, 
//                             color: 'var(--text-main)', 
//                             lineHeight: 1.2,
//                             display: '-webkit-box',
//                             WebkitLineClamp: 1,
//                             WebkitBoxOrient: 'vertical',
//                             overflow: 'hidden'
//                           }} title={item.name}>
//                             {item.name}
//                           </h4>
//                           {item.spiceLevel > 0 && (
//                             <div style={{ display: 'flex', color: '#ef4444', flexShrink: 0 }} title={`Spicy Level: ${item.spiceLevel}`}>
//                               {[...Array(item.spiceLevel)].map((_, i) => (
//                                 <Flame key={i} size={10} fill="#ef4444" />
//                               ))}
//                             </div>
//                           )}
//                         </div>

//                         {item.description ? (
//                           <p style={{
//                             fontSize: '0.64rem',
//                             color: 'var(--text-muted)',
//                             marginTop: '0.15rem',
//                             lineHeight: 1.25,
//                             display: '-webkit-box',
//                             WebkitLineClamp: 1,
//                             WebkitBoxOrient: 'vertical',
//                             overflow: 'hidden'
//                           }}>
//                             {item.description}
//                           </p>
//                         ) : null}
//                       </div>

//                       {/* Price in Rupees and Add / Quantity Control */}
//                       <div style={{
//                         display: 'flex',
//                         alignItems: 'center',
//                         justifyContent: 'space-between',
//                         marginTop: '0.35rem',
//                         paddingTop: '0.35rem',
//                         borderTop: '1px solid var(--border-subtle)'
//                       }}>
//                         <span className="font-mono" style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--accent-amber-light)' }}>
//                           {formatCurrency(item.price)}
//                         </span>

//                         {/* Interactive Add or Qty Controller */}
//                         {currentQty === 0 ? (
//                           <button
//                             onClick={() => handleAddItem(item)}
//                             style={{
//                               display: 'flex',
//                               alignItems: 'center',
//                               gap: '0.2rem',
//                               padding: '0.22rem 0.5rem',
//                               borderRadius: 'var(--radius-sm)',
//                               background: 'linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)',
//                               color: '#ffffff',
//                               fontWeight: 800,
//                               fontSize: '0.7rem',
//                               boxShadow: '0 2px 4px rgba(245, 158, 11, 0.35)',
//                               cursor: 'pointer'
//                             }}
//                           >
//                             <Plus size={11} />
//                             <span>Add</span>
//                           </button>
//                         ) : (
//                           <div style={{
//                             display: 'flex',
//                             alignItems: 'center',
//                             gap: '0.2rem',
//                             background: 'var(--bg-tertiary)',
//                             padding: '1px 3px',
//                             borderRadius: 'var(--radius-sm)',
//                             border: '1px solid var(--accent-amber)'
//                           }}>
//                             <button
//                               onClick={() => {
//                                 sounds.playRemoveItem();
//                                 onUpdateItemQuantity(table.id, item.id, currentQty - 1);
//                               }}
//                               style={{
//                                 background: 'rgba(255,255,255,0.08)',
//                                 color: 'var(--text-main)',
//                                 width: '20px',
//                                 height: '20px',
//                                 borderRadius: '3px',
//                                 display: 'flex',
//                                 alignItems: 'center',
//                                 justifyContent: 'center',
//                                 cursor: 'pointer'
//                               }}
//                             >
//                               <Minus size={11} />
//                             </button>

//                             <span className="font-mono" style={{
//                               fontWeight: 800,
//                               fontSize: '0.78rem',
//                               minWidth: '16px',
//                               textAlign: 'center',
//                               color: 'var(--accent-amber-light)'
//                             }}>
//                               {currentQty}
//                             </span>

//                             <button
//                               onClick={() => {
//                                 sounds.playAddItem();
//                                 onUpdateItemQuantity(table.id, item.id, currentQty + 1);
//                               }}
//                               style={{
//                                 background: 'var(--accent-amber)',
//                                 color: '#000000',
//                                 width: '20px',
//                                 height: '20px',
//                                 borderRadius: '3px',
//                                 display: 'flex',
//                                 alignItems: 'center',
//                                 justifyContent: 'center',
//                                 cursor: 'pointer'
//                               }}
//                             >
//                               <Plus size={11} />
//                             </button>
//                           </div>
//                         )}
//                       </div>
//                     </div>
//                   </div>
//                 );
//               })
//             )}
//           </div>
//         </div>

//         {/* Right Side: Order Slip & Live Bill Drawer */}
//         <div style={{
//           width: '430px',
//           background: 'var(--bg-secondary)',
//           display: 'flex',
//           flexDirection: 'column',
//           boxShadow: '-4px 0 20px rgba(0, 0, 0, 0.3)',
//           minHeight: 0,
//           flexShrink: 0
//         }}>
//           {/* Order Header */}
//           <div style={{
//             padding: '1rem 1.25rem',
//             borderBottom: '1px solid var(--border-subtle)',
//             background: 'var(--bg-tertiary)',
//             display: 'flex',
//             alignItems: 'center',
//             justifyContent: 'space-between',
//             flexShrink: 0
//           }}>
//             <div>
//               <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
//                 <Receipt size={18} color="var(--accent-amber)" />
//                 <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-main)' }}>
//                   {table.name} Order Slip
//                 </h3>
//               </div>
//               <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '3px', display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
//                 <span>Server: <strong>{table.server}</strong></span>
//                 <span>•</span>
//                 <span>{table.items.length} items</span>
//                 <span>•</span>
//                 <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', color: 'var(--text-main)', fontWeight: 600 }}>
//                   <Calendar size={11} color="var(--accent-amber)" />
//                   {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
//                 </span>
//                 <span>•</span>
//                 <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', color: 'var(--text-main)', fontWeight: 600 }}>
//                   <Clock size={11} color="var(--accent-amber)" />
//                   {table.orderTime || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
//                 </span>
//               </div>
//             </div>

//             <div style={{
//               background: 'rgba(245, 158, 11, 0.18)',
//               color: 'var(--accent-amber-light)',
//               padding: '0.25rem 0.6rem',
//               borderRadius: '6px',
//               fontSize: '0.72rem',
//               fontWeight: 700
//             }}>
//               Order #{table.id}0{table.items.length}
//             </div>
//           </div>

//           {/* Ordered Items List */}
//           <div style={{
//             flex: 1,
//             minHeight: 0,
//             overflowY: 'auto',
//             padding: '0.85rem 1.25rem',
//             display: 'flex',
//             flexDirection: 'column',
//             gap: '0.65rem'
//           }}>
//             {/* Live Kitchen Status Banner */}
//             {table.items.length > 0 && (() => {
//               const allReady = table.items.every(i => i.kotStatus === 'ready' || i.kotStatus === 'served' || i.kotStatus === 'completed');
//               const hasCooking = table.items.some(i => i.kotStatus === 'cooking');
//               const hasReady = table.items.some(i => i.kotStatus === 'ready');
//               const readyCount = table.items.filter(i => i.kotStatus === 'ready' || i.kotStatus === 'served').length;

//               if (allReady) {
//                 return (
//                   <div style={{
//                     background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.22), rgba(5, 150, 105, 0.12))',
//                     border: '1.5px solid #10b981',
//                     borderRadius: '8px',
//                     padding: '0.65rem 0.85rem',
//                     display: 'flex',
//                     alignItems: 'center',
//                     justifyContent: 'space-between',
//                     boxShadow: '0 0 16px rgba(16, 185, 129, 0.25)',
//                     animation: 'pulseGlow 2.5s infinite'
//                   }}>
//                     <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
//                       <span style={{ fontSize: '1.2rem' }}>🔔</span>
//                       <div>
//                         <div style={{ fontSize: '0.78rem', fontWeight: 900, color: '#34d399', letterSpacing: '0.02em' }}>
//                           FOOD IS READY TO SERVE!
//                         </div>
//                         <div style={{ fontSize: '0.68rem', color: '#a7f3d0', fontWeight: 600 }}>
//                           Chef has completed cooking. All dishes prepared hot.
//                         </div>
//                       </div>
//                     </div>
//                     <span style={{ background: '#10b981', color: '#000', fontSize: '0.65rem', fontWeight: 900, padding: '2px 8px', borderRadius: '12px' }}>
//                       SERVE NOW
//                     </span>
//                   </div>
//                 );
//               }

//               if (hasCooking) {
//                 return (
//                   <div style={{
//                     background: 'linear-gradient(135deg, rgba(234, 88, 12, 0.2), rgba(245, 158, 11, 0.1))',
//                     border: '1.5px solid #ea580c',
//                     borderRadius: '8px',
//                     padding: '0.65rem 0.85rem',
//                     display: 'flex',
//                     alignItems: 'center',
//                     gap: '0.5rem'
//                   }}>
//                     <span style={{ fontSize: '1.2rem' }}>🔥</span>
//                     <div>
//                       <div style={{ fontSize: '0.78rem', fontWeight: 900, color: '#fb923c', letterSpacing: '0.02em' }}>
//                         {readyCount > 0 ? `CHEF IS COOKING (${readyCount}/${table.items.length} PREPARED)` : 'CHEF IS COOKING ORDER'}
//                       </div>
//                       <div style={{ fontSize: '0.68rem', color: '#fed7aa', fontWeight: 600 }}>
//                         {readyCount > 0 ? `${readyCount} dish(es) ready to serve • Remaining dishes in pan` : 'Kitchen started preparing dishes • Live in pan'}
//                       </div>
//                     </div>
//                   </div>
//                 );
//               }

//               if (hasReady) {
//                 return (
//                   <div style={{
//                     background: 'rgba(16, 185, 129, 0.12)',
//                     border: '1px solid rgba(16, 185, 129, 0.4)',
//                     borderRadius: '8px',
//                     padding: '0.55rem 0.8rem',
//                     display: 'flex',
//                     alignItems: 'center',
//                     gap: '0.5rem'
//                   }}>
//                     <span style={{ fontSize: '1.1rem' }}>🔔</span>
//                     <div>
//                       <div style={{ fontSize: '0.76rem', fontWeight: 800, color: '#34d399' }}>
//                         Some Dishes Prepared ({readyCount}/{table.items.length})
//                       </div>
//                       <div style={{ fontSize: '0.66rem', color: '#6ee7b7' }}>
//                         Partial items are ready to serve to guests
//                       </div>
//                     </div>
//                   </div>
//                 );
//               }

//               return null;
//             })()}

//             {table.items.length === 0 ? (
//               <div style={{
//                 textAlign: 'center',
//                 padding: '3rem 1rem',
//                 color: 'var(--text-dim)',
//                 display: 'flex',
//                 flexDirection: 'column',
//                 alignItems: 'center',
//                 gap: '0.75rem'
//               }}>
//                 <Utensils size={36} color="var(--text-dim)" />
//                 <p style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-muted)' }}>
//                   No dishes added yet to {table.name}
//                 </p>
//                 <p style={{ fontSize: '0.78rem', maxWidth: '240px' }}>
//                   Tap any Biryani or starter from the menu on the left to add items to this table.
//                 </p>
//               </div>
//             ) : (
//               table.items.map(item => (
//                 <div
//                   key={item.id}
//                   style={{
//                     background: 'var(--bg-tertiary)',
//                     borderRadius: 'var(--radius-sm)',
//                     padding: '0.75rem',
//                     border: '1px solid var(--border-subtle)',
//                     display: 'flex',
//                     flexDirection: 'column',
//                     gap: '0.45rem'
//                   }}
//                 >
//                   {/* Top Row: Name, Unit Price, Total Price */}
//                   <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
//                     <div style={{ flex: 1 }}>
//                       <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
//                         <span style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-main)' }}>
//                           {item.name}
//                         </span>
//                       </div>
//                       <span className="font-mono" style={{ fontSize: '0.74rem', color: 'var(--text-dim)' }}>
//                         {formatCurrency(item.price)} each
//                       </span>
//                     </div>

//                     <div style={{ textAlign: 'right' }}>
//                       <span className="font-mono" style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-main)' }}>
//                         {formatCurrency(item.price * item.quantity)}
//                       </span>
//                       {item.kotStatus && (
//                         <div style={{
//                           fontSize: '0.68rem',
//                           fontWeight: 800,
//                           textTransform: 'uppercase',
//                           padding: '1px 6px',
//                           borderRadius: '4px',
//                           marginTop: '3px',
//                           display: 'inline-block',
//                           background: (item.kotStatus === 'ready' || item.kotStatus === 'served')
//                             ? 'rgba(16, 185, 129, 0.15)'
//                             : (item.kotStatus === 'cooking' ? 'rgba(234, 88, 12, 0.15)' : 'rgba(245, 158, 11, 0.15)'),
//                           color: (item.kotStatus === 'ready' || item.kotStatus === 'served')
//                             ? '#10b981'
//                             : (item.kotStatus === 'cooking' ? '#ea580c' : '#f59e0b'),
//                           border: `1px solid ${
//                             (item.kotStatus === 'ready' || item.kotStatus === 'served')
//                               ? 'rgba(16, 185, 129, 0.3)'
//                               : (item.kotStatus === 'cooking' ? 'rgba(234, 88, 12, 0.3)' : 'rgba(245, 158, 11, 0.3)')
//                           }`
//                         }}>
//                           {(item.kotStatus === 'ready' || item.kotStatus === 'served')
//                             ? '✓ Prepared'
//                             : (item.kotStatus === 'cooking' ? '🔥 Cooking' : '📥 Received')}
//                         </div>
//                       )}
//                     </div>
//                   </div>

//                   {/* Quantity Stepper & Notes */}
//                   <div style={{
//                     display: 'flex',
//                     alignItems: 'center',
//                     justifyContent: 'space-between',
//                     marginTop: '0.2rem',
//                     paddingTop: '0.4rem',
//                     borderTop: '1px solid rgba(255,255,255,0.05)'
//                   }}>
//                     {/* Stepper */}
//                     <div style={{
//                       display: 'flex',
//                       alignItems: 'center',
//                       gap: '0.3rem',
//                       background: 'var(--bg-secondary)',
//                       borderRadius: '4px',
//                       padding: '2px 4px'
//                     }}>
//                       <button
//                         onClick={() => {
//                           sounds.playRemoveItem();
//                           onUpdateItemQuantity(table.id, item.id, item.quantity - 1);
//                         }}
//                         style={{
//                           background: 'transparent',
//                           color: 'var(--text-muted)',
//                           width: '20px',
//                           height: '20px',
//                           display: 'flex',
//                           alignItems: 'center',
//                           justifyContent: 'center'
//                         }}
//                       >
//                         <Minus size={12} />
//                       </button>

//                       <span className="font-mono" style={{ fontWeight: 700, fontSize: '0.84rem', minWidth: '18px', textAlign: 'center' }}>
//                         {item.quantity}
//                       </span>

//                       <button
//                         onClick={() => {
//                           sounds.playAddItem();
//                           onUpdateItemQuantity(table.id, item.id, item.quantity + 1);
//                         }}
//                         style={{
//                           background: 'transparent',
//                           color: 'var(--accent-amber-light)',
//                           width: '20px',
//                           height: '20px',
//                           display: 'flex',
//                           alignItems: 'center',
//                           justifyContent: 'center'
//                         }}
//                       >
//                         <Plus size={12} />
//                       </button>
//                     </div>

//                     {/* Notes Trigger & Delete */}
//                     <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
//                       <button
//                         onClick={() => {
//                           setEditingNoteItemId(item.id);
//                           setTempNote(item.notes || '');
//                         }}
//                         style={{
//                           fontSize: '0.72rem',
//                           color: item.notes ? 'var(--accent-amber-light)' : 'var(--text-dim)',
//                           background: 'transparent',
//                           display: 'flex',
//                           alignItems: 'center',
//                           gap: '0.25rem',
//                           textDecoration: 'underline'
//                         }}
//                       >
//                         <FileText size={11} />
//                         <span>{item.notes ? `"${item.notes}"` : '+ Note'}</span>
//                       </button>

//                       <button
//                         onClick={() => {
//                           sounds.playRemoveItem();
//                           onRemoveItemFromTable(table.id, item.id);
//                         }}
//                         style={{
//                           background: 'transparent',
//                           color: 'var(--text-dim)',
//                           padding: '2px'
//                         }}
//                         title="Remove item"
//                       >
//                         <Trash2 size={13} />
//                       </button>
//                     </div>
//                   </div>

//                   {/* Inline Note Editor */}
//                   {editingNoteItemId === item.id && (
//                     <div style={{ display: 'flex', gap: '0.3rem', marginTop: '0.3rem' }}>
//                       <input
//                         type="text"
//                         placeholder="e.g. Extra salan, spicy, no coriander..."
//                         value={tempNote}
//                         onChange={e => setTempNote(e.target.value)}
//                         autoFocus
//                         style={{
//                           flex: 1,
//                           background: 'var(--bg-primary)',
//                           border: '1px solid var(--accent-amber)',
//                           borderRadius: '4px',
//                           color: 'var(--text-main)',
//                           padding: '0.25rem 0.5rem',
//                           fontSize: '0.74rem'
//                         }}
//                         onKeyDown={e => {
//                           if (e.key === 'Enter') handleSaveNote(item.id);
//                         }}
//                       />
//                       <button
//                         onClick={() => handleSaveNote(item.id)}
//                         style={{
//                           background: 'var(--accent-amber)',
//                           color: '#000000',
//                           padding: '0 0.5rem',
//                           borderRadius: '4px',
//                           fontSize: '0.72rem',
//                           fontWeight: 700
//                         }}
//                       >
//                         Save
//                       </button>
//                     </div>
//                   )}
//                 </div>
//               ))
//             )}
//           </div>

//           {/* Financial Breakdown & Tax Calculation in Rupees */}
//           <div style={{
//             background: 'var(--bg-primary)',
//             padding: '1rem 1.25rem',
//             borderTop: '1px solid var(--border-subtle)',
//             display: 'flex',
//             flexDirection: 'column',
//             gap: '0.55rem',
//             flexShrink: 0
//           }}>
//             {/* Subtotal */}
//             <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.84rem', color: 'var(--text-muted)' }}>
//               <span>Subtotal:</span>
//               <span className="font-mono">{formatCurrency(subtotal)}</span>
//             </div>

//             {/* Discount selector */}
//             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.82rem' }}>
//               <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: 'var(--text-muted)' }}>
//                 <Percent size={13} color="var(--accent-amber)" />
//                 <span>Discount:</span>
//               </div>
//               <div style={{ display: 'flex', gap: '0.3rem' }}>
//                 {[0, 5, 10, 15].map(pct => (
//                   <button
//                     key={pct}
//                     onClick={() => onUpdateDiscount(table.id, pct)}
//                     style={{
//                       background: (table.discountPercent || 0) === pct ? 'var(--accent-amber)' : 'var(--bg-tertiary)',
//                       color: (table.discountPercent || 0) === pct ? '#000000' : 'var(--text-muted)',
//                       padding: '1px 6px',
//                       borderRadius: '4px',
//                       fontSize: '0.72rem',
//                       fontWeight: 700
//                     }}
//                   >
//                     {pct}%
//                   </button>
//                 ))}
//               </div>
//             </div>

//             {table.discountPercent > 0 && (
//               <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--success)' }}>
//                 <span>Discount ({table.discountPercent}%):</span>
//                 <span className="font-mono">-{formatCurrency(discountAmount)}</span>
//               </div>
//             )}

//             {/* Tax (GST 5% - CGST 2.5% + SGST 2.5%) */}
//             <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
//               <span>Restaurant GST (5%):</span>
//               <span className="font-mono">{formatCurrency(taxAmount)}</span>
//             </div>

//             {/* Service Charge Toggle */}
//             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
//               <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer' }}>
//                 <input
//                   type="checkbox"
//                   checked={table.serviceCharge > 0}
//                   onChange={(e) => onToggleServiceCharge(table.id, e.target.checked ? 5 : 0)}
//                   style={{ accentColor: 'var(--accent-amber)' }}
//                 />
//                 <span>Service Charge (5%)</span>
//               </label>
//               <span className="font-mono">{formatCurrency(serviceChargeAmount)}</span>
//             </div>

//             {/* Grand Total */}
//             <div style={{
//               display: 'flex',
//               justifyContent: 'space-between',
//               alignItems: 'center',
//               marginTop: '0.4rem',
//               paddingTop: '0.65rem',
//               borderTop: '1px dashed var(--border-subtle)'
//             }}>
//               <div>
//                 <span style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--text-main)' }}>TOTAL PAYABLE</span>
//                 <p style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>Inclusive of 5% GST</p>
//               </div>
//               <span className="font-mono" style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--accent-amber-light)' }}>
//                 {formatCurrency(grandTotal)}
//               </span>
//             </div>

//             {/* Bottom Actions: KOT, Print Bill, Settle Checkout */}
//             <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
//               <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
//                 {/* Send KOT Button */}
//                 <button
//                   onClick={() => onSendKOT(table.id)}
//                   disabled={table.items.length === 0}
//                   style={{
//                     display: 'flex',
//                     alignItems: 'center',
//                     justifyContent: 'center',
//                     gap: '0.4rem',
//                     padding: '0.65rem',
//                     borderRadius: 'var(--radius-sm)',
//                     background: 'var(--bg-tertiary)',
//                     color: table.items.length === 0 ? 'var(--text-dim)' : 'var(--text-main)',
//                     border: '1px solid var(--border-subtle)',
//                     fontSize: '0.8rem',
//                     fontWeight: 700,
//                     cursor: table.items.length === 0 ? 'not-allowed' : 'pointer'
//                   }}
//                 >
//                   <ChefHat size={15} color="var(--accent-amber)" />
//                   <span>Send KOT</span>
//                 </button>

//                 {/* Print Bill Receipt Button */}
//                 <button
//                   onClick={() => onOpenReceipt(table.id)}
//                   disabled={table.items.length === 0}
//                   style={{
//                     display: 'flex',
//                     alignItems: 'center',
//                     justifyContent: 'center',
//                     gap: '0.4rem',
//                     padding: '0.65rem',
//                     borderRadius: 'var(--radius-sm)',
//                     background: 'var(--bg-tertiary)',
//                     color: table.items.length === 0 ? 'var(--text-dim)' : 'var(--text-main)',
//                     border: '1px solid var(--border-subtle)',
//                     fontSize: '0.8rem',
//                     fontWeight: 700,
//                     cursor: table.items.length === 0 ? 'not-allowed' : 'pointer'
//                   }}
//                 >
//                   <Receipt size={15} color="var(--accent-amber)" />
//                   <span>Print Bill</span>
//                 </button>
//               </div>

//               {/* Settle & Checkout Button */}
//               <button
//                 onClick={() => onOpenSettlement(table.id)}
//                 disabled={table.items.length === 0}
//                 style={{
//                   display: 'flex',
//                   alignItems: 'center',
//                   justifyContent: 'center',
//                   gap: '0.5rem',
//                   padding: '0.85rem',
//                   borderRadius: 'var(--radius-md)',
//                   background: table.items.length === 0
//                     ? 'rgba(245, 158, 11, 0.2)'
//                     : 'linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)',
//                   color: table.items.length === 0 ? 'var(--text-dim)' : '#ffffff',
//                   fontSize: '0.92rem',
//                   fontWeight: 800,
//                   boxShadow: table.items.length === 0 ? 'none' : '0 4px 14px rgba(245, 158, 11, 0.4)',
//                   cursor: table.items.length === 0 ? 'not-allowed' : 'pointer'
//                 }}
//               >
//                 <CreditCard size={18} />
//                 <span>Settle & Checkout ({formatCurrency(grandTotal)})</span>
//               </button>
//             </div>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }



import React, { useState, useMemo, useEffect } from 'react';
import {
  ArrowLeft,
  Search,
  Plus,
  Minus,
  Trash2,
  Receipt,
  CreditCard,
  ChefHat,
  Flame,
  Clock,
  Calendar,
  Users,
  ArrowRightLeft,
  Sparkles,
  FileText,
  Utensils,
  Soup,
  Sandwich,
  Coffee,
  IceCream,
  Percent,
  X,
  ChevronDown,
  Filter
} from 'lucide-react';
import { MENU_CATEGORIES, MENU_ITEMS } from '../data/menuData';
import { sounds } from '../utils/audio';
import { formatCurrency } from '../utils/formatCurrency';
import { parseTimeToSeconds, formatElapsedTimer, getTimerUrgencyColor } from '../utils/timer';

const CATEGORY_ICONS = {
  Utensils: Utensils,
  Flame: Flame,
  Sparkles: Sparkles,
  Soup: Soup,
  Sandwich: Sandwich,
  Coffee: Coffee,
  IceCream: IceCream
};

export function TableDetailView({
  table,
  allTables,
  menuItems = MENU_ITEMS,
  onSelectTable,
  onBackToTables,
  onAddItemToTable,
  onUpdateItemQuantity,
  onRemoveItemFromTable,
  onUpdateItemNotes,
  onUpdateGuests,
  onUpdateDiscount,
  onToggleServiceCharge,
  onSendKOT,
  onOpenReceipt,
  onOpenSettlement,
  onOpenTransferModal,
  onClearOrder,
  onOpenKOTView
}) {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const [selectedCategory, setSelectedCategory] = useState('all');
  const [dietaryFilter, setDietaryFilter] = useState('all'); // all | veg | non-veg | special
  const [searchQuery, setSearchQuery] = useState('');
  const [editingNoteItemId, setEditingNoteItemId] = useState(null);
  const [tempNote, setTempNote] = useState('');

  // Filter states
  const [isTableDropdownOpen, setIsTableDropdownOpen] = useState(false);
  const [tableStatusFilter, setTableStatusFilter] = useState('all'); // 'all' | 'vacant' | 'occupied' | 'billed'
  const [expandedCategory, setExpandedCategory] = useState('all');

  // Filtered menu items with spelling tolerance for biriyani / biryani
  const filteredMenuItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const normalizedQuery = query.replace(/biriyani/g, 'biryani');

    return (menuItems || MENU_ITEMS).filter(item => {
      const matchCat = selectedCategory === 'all' || item.category === selectedCategory;

      const itemTitle = item.name.toLowerCase();
      const itemDesc = item.description.toLowerCase();
      const itemCat = item.category.toLowerCase();

      const matchSearch = !query ||
        itemTitle.includes(query) ||
        itemTitle.includes(normalizedQuery) ||
        itemDesc.includes(query) ||
        itemDesc.includes(normalizedQuery) ||
        itemCat.includes(query) ||
        itemCat.includes(normalizedQuery);

      let matchDietary = true;
      if (dietaryFilter === 'veg') matchDietary = item.isVeg;
      if (dietaryFilter === 'non-veg') matchDietary = !item.isVeg;
      if (dietaryFilter === 'special') matchDietary = item.isChefSpecial;

      return matchCat && matchSearch && matchDietary;
    });
  }, [selectedCategory, dietaryFilter, searchQuery]);

  // Financial calculations in Rupees
  const subtotal = table.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const discountAmount = (subtotal * (table.discountPercent || 0)) / 100;
  const taxableAmount = Math.max(0, subtotal - discountAmount);
  const taxRate = 0.05; // 5% GST (2.5% CGST + 2.5% SGST)
  const taxAmount = taxableAmount * taxRate;
  const serviceChargeAmount = table.serviceCharge ? (taxableAmount * (table.serviceCharge / 100)) : 0;
  const grandTotal = Math.round(taxableAmount + taxAmount + serviceChargeAmount);

  // Find quantity of an item already in the table order
  const getItemQuantityInCart = (itemId) => {
    const found = table.items.find(i => i.id === itemId);
    return found ? found.quantity : 0;
  };

  const handleAddItem = (item) => {
    sounds.playAddItem();
    onAddItemToTable(table.id, item);
  };

  const handleSaveNote = (itemId) => {
    onUpdateItemNotes(table.id, itemId, tempNote);
    setEditingNoteItemId(null);
    setTempNote('');
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: 'calc(100vh - 68px)',
      minHeight: '600px',
      overflow: 'hidden'
    }}>

      <style>{`
        .pos-menu-grid {
          flex: 1;
          min-height: 0;
          overflow-y: auto;
          padding: 0.65rem;
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
          grid-auto-rows: min-content;
          gap: 0.5rem;
          align-content: start;
          background: var(--bg-primary);
        }

        .pos-menu-card {
          min-width: 0;
          background: var(--bg-secondary);
          border-radius: 8px;
          border: 1px solid var(--border-subtle);
          overflow: hidden;
          display: flex;
          flex-direction: column;
          box-shadow: var(--shadow-sm);
          transition: transform 160ms ease, border-color 160ms ease, box-shadow 160ms ease;
        }

        .pos-menu-card:hover {
          transform: translateY(-2px);
          border-color: rgba(245, 158, 11, 0.65);
          box-shadow: 0 7px 18px rgba(0,0,0,0.24);
        }

        .pos-menu-card.has-qty {
          border: 1.5px solid var(--accent-amber);
          box-shadow: 0 5px 16px rgba(245, 158, 11, 0.18);
        }

        .pos-menu-card-image {
          position: relative;
          height: 70px;
          min-height: 70px;
          overflow: hidden;
          background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
        }

        .pos-menu-card-image img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
          transition: transform 220ms ease;
        }

        .pos-menu-card:hover .pos-menu-card-image img {
          transform: scale(1.045);
        }

        .pos-menu-card-content {
          padding: 0.4rem 0.45rem 0.45rem;
          min-height: 90px;
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }

        .pos-menu-card-title-row {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 0.25rem;
        }

        .pos-menu-card-title {
          margin: 0;
          font-size: 0.76rem;
          font-weight: 800;
          color: var(--text-main);
          line-height: 1.18;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .pos-menu-card-description {
          font-size: 0.62rem;
          color: var(--text-muted);
          margin-top: 0.18rem;
          line-height: 1.28;
          display: -webkit-box;
          -webkit-line-clamp: 1;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .pos-menu-card-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.35rem;
          margin-top: 0.38rem;
          padding-top: 0.35rem;
          border-top: 1px solid var(--border-subtle);
        }

        .pos-menu-card-price {
          font-size: 0.82rem;
          font-weight: 800;
          color: var(--accent-amber-light);
          white-space: nowrap;
        }

        .pos-menu-add {
          display: flex;
          align-items: center;
          gap: 0.15rem;
          padding: 0.25rem 0.45rem;
          min-height: 24px;
          border-radius: 4px;
          background: linear-gradient(135deg, #f59e0b 0%, #ea580c 100%);
          color: #fff;
          font-weight: 800;
          font-size: 0.65rem;
          box-shadow: 0 2px 6px rgba(245, 158, 11, 0.28);
          transition: transform 140ms ease, filter 140ms ease;
        }

        .pos-menu-add:hover {
          filter: brightness(1.08);
          transform: translateY(-1px);
        }

        .pos-menu-qty {
          display: flex;
          align-items: center;
          gap: 0.18rem;
          background: var(--bg-tertiary);
          padding: 2px 3px;
          border-radius: 6px;
          border: 1px solid var(--accent-amber);
        }

        .pos-menu-qty button {
          width: 21px;
          height: 21px;
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 140ms ease, transform 140ms ease;
        }

        .pos-menu-qty button:hover {
          transform: scale(1.05);
        }

        .pos-menu-qty-count {
          font-weight: 800;
          font-size: 0.76rem;
          min-width: 17px;
          text-align: center;
          color: var(--accent-amber-light);
        }

        .pos-menu-badge {
          position: absolute;
          top: 5px;
          left: 5px;
          z-index: 2;
          background: rgba(0,0,0,0.78);
          backdrop-filter: blur(4px);
          padding: 2px 4px;
          border-radius: 3px;
          display: flex;
          align-items: center;
          gap: 3px;
          font-size: 0.54rem;
          font-weight: 700;
          color: #fff;
          border: 1px solid rgba(255,255,255,0.1);
        }

        .pos-menu-chef {
          position: absolute;
          top: 5px;
          right: 5px;
          z-index: 2;
          background: linear-gradient(135deg, #f59e0b, #ea580c);
          color: #fff;
          padding: 2px 5px;
          border-radius: 3px;
          font-size: 0.5rem;
          font-weight: 800;
          display: flex;
          align-items: center;
          gap: 2px;
          box-shadow: 0 2px 5px rgba(0,0,0,0.35);
        }

        .pos-menu-time {
          position: absolute;
          bottom: 5px;
          right: 5px;
          z-index: 2;
          background: rgba(0,0,0,0.76);
          color: #fff;
          padding: 1px 4px;
          border-radius: 3px;
          font-size: 0.52rem;
          display: flex;
          align-items: center;
          gap: 2px;
        }

        @media (max-width: 1100px) {
          .pos-menu-grid {
            grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
          }
        }

        @media (max-width: 760px) {
          .pos-menu-grid {
            padding: 0.5rem;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 0.45rem;
          }

          .pos-menu-card-image {
            height: 82px;
            min-height: 82px;
          }

          .pos-menu-card-content {
            min-height: 100px;
            padding: 0.45rem;
          }

          .pos-menu-card-title {
            font-size: 0.72rem;
          }

          .pos-menu-card-description {
            font-size: 0.59rem;
          }
        }

        @media (max-width: 420px) {
          .pos-menu-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .pos-menu-card-image {
            height: 76px;
            min-height: 76px;
          }

          .pos-menu-card-price {
            font-size: 0.82rem;
          }

          .pos-menu-add {
            padding: 0.25rem 0.42rem;
            font-size: 0.62rem;
          }
        }

        @keyframes cartPulse {
          0%, 100% { box-shadow: 0 8px 28px rgba(245, 158, 11, 0.45); }
          50% { box-shadow: 0 8px 36px rgba(245, 158, 11, 0.75), 0 0 0 6px rgba(245,158,11,0.12); }
        }

        @keyframes slideInDrawer {
          from {
            transform: translateX(100%);
          }
          to {
            transform: translateX(0);
          }
        }
      `}</style>


      {/* Top Table Switcher Strip & Table Info Bar */}
      <div style={{
        background: 'var(--bg-secondary)',
        borderBottom: '1px solid var(--border-subtle)',
        padding: '0.65rem 1.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.85rem',
        flexShrink: 0
      }}>
        {/* Left: Back & Table Identifiers */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <button
            onClick={onBackToTables}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.45rem 0.8rem',
              background: 'var(--bg-tertiary)',
              color: 'var(--text-main)',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.82rem',
              fontWeight: 600,
              border: '1px solid var(--border-subtle)'
            }}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent-amber)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-subtle)'}
          >
            <ArrowLeft size={16} />
            <span>All Tables</span>
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{
              background: 'linear-gradient(135deg, #f59e0b, #ea580c)',
              color: '#ffffff',
              padding: '0.35rem 0.75rem',
              borderRadius: 'var(--radius-sm)',
              fontWeight: 800,
              fontSize: '1rem',
              boxShadow: '0 2px 8px rgba(245, 158, 11, 0.35)'
            }}>
              {table.name}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{table.section}</span>
                <span style={{ color: 'var(--text-dim)' }}>•</span>
                <span style={{
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  color: table.status === 'vacant' ? 'var(--status-vacant)' : 'var(--status-occupied)',
                  background: table.status === 'vacant' ? 'var(--status-vacant-bg)' : 'var(--status-occupied-bg)',
                  padding: '1px 6px',
                  borderRadius: '4px'
                }}>
                  {table.status}
                </span>
              </div>
            </div>
          </div>

          {/* Guest Count Stepper */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            background: 'var(--bg-tertiary)',
            padding: '0.25rem 0.5rem',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-subtle)',
            fontSize: '0.78rem'
          }}>
            <Users size={13} color="var(--text-muted)" />
            <span style={{ color: 'var(--text-muted)' }}>Guests:</span>
            <button
              onClick={() => onUpdateGuests(table.id, Math.max(1, table.guests - 1))}
              style={{
                background: 'rgba(255,255,255,0.08)',
                color: 'var(--text-main)',
                width: '20px',
                height: '20px',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              -
            </button>
            <span style={{ fontWeight: 700, minWidth: '16px', textAlign: 'center' }}>{table.guests}</span>
            <button
              onClick={() => onUpdateGuests(table.id, table.guests + 1)}
              style={{
                background: 'rgba(255,255,255,0.08)',
                color: 'var(--text-main)',
                width: '20px',
                height: '20px',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              +
            </button>
          </div>

          {/* Live Table Dining Timer Widget */}
          {table.orderTime && (() => {
            const elapsedSec = parseTimeToSeconds(table.orderTime);
            const elapsedFormatted = formatElapsedTimer(elapsedSec);
            const urgency = getTimerUrgencyColor(elapsedSec);

            return (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  background: urgency.bg,
                  border: `1px solid ${urgency.border}`,
                  padding: '0.28rem 0.65rem',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  color: urgency.text
                }}
                title={`Table seated at ${table.orderTime}. Live dining elapsed duration: ${elapsedFormatted}`}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                  <Calendar size={13} color="var(--accent-amber)" />
                  <span>{new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                </span>
                <span style={{ opacity: 0.5 }}>•</span>
                <Clock size={13} className="pulse-indicator" color={urgency.dot} />
                <span>Seated: <strong>{table.orderTime}</strong></span>
                <span style={{ opacity: 0.5 }}>•</span>
                <span style={{ fontFamily: 'monospace', fontWeight: 800 }}>⏱ {elapsedFormatted}</span>
              </div>
            );
          })()}
        </div>

        {/* Right Table Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button
            onClick={onOpenTransferModal}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: '0.4rem 0.75rem',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--bg-tertiary)',
              color: 'var(--text-main)',
              border: '1px solid var(--border-subtle)',
              fontSize: '0.78rem',
              fontWeight: 600
            }}
            title="Move this order to another table"
          >
            <ArrowRightLeft size={13} color="var(--accent-amber)" />
            <span>Transfer</span>
          </button>

          {table.items.length > 0 && (
            <button
              onClick={() => onClearOrder(table.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.4rem 0.75rem',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--danger-bg)',
                color: 'var(--danger)',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                fontSize: '0.78rem',
                fontWeight: 600
              }}
              title="Void / Clear current items"
            >
              <Trash2 size={13} />
              <span>Void</span>
            </button>
          )}

          {/* Cart Icon in vacant place */}
          {table.items.length > 0 && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: '0.4rem 0.75rem',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--accent-amber)',
              color: '#000000',
              fontSize: '0.78rem',
              fontWeight: 800
            }}>
              <Receipt size={14} />
              <span>{table.items.reduce((s, i) => s + i.quantity, 0)} Items</span>
            </div>
          )}

          {/* All Tables dropdown - kept on the far right.
              Existing onSelectTable functionality is preserved. */}
          <div style={{
            marginLeft: 'auto',
            position: 'relative',
            flexShrink: 0
          }}>
            <button
              type="button"
              onClick={() => setIsTableDropdownOpen(prev => !prev)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                minWidth: '132px',
                padding: '0.5rem 0.8rem',
                borderRadius: '8px',
                background: isTableDropdownOpen ? 'var(--accent-amber)' : 'var(--bg-tertiary)',
                color: isTableDropdownOpen ? '#000000' : 'var(--text-main)',
                border: isTableDropdownOpen
                  ? '1px solid var(--accent-amber)'
                  : '1px solid var(--border-subtle)',
                fontSize: '0.8rem',
                fontWeight: 800,
                cursor: 'pointer',
                boxShadow: isTableDropdownOpen ? '0 4px 12px rgba(245,158,11,0.25)' : 'none'
              }}
            >
              <Filter size={15} color={isTableDropdownOpen ? '#000000' : 'var(--accent-amber)'} />
              <span>All Tables</span>
              <ChevronDown
                size={15}
                style={{
                  transform: isTableDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 160ms ease'
                }}
              />
            </button>

            {isTableDropdownOpen && (
              <div style={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                right: 0,
                width: '280px',
                maxHeight: '380px',
                display: 'flex',
                flexDirection: 'column',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '10px',
                boxShadow: '0 14px 32px rgba(0,0,0,0.35)',
                zIndex: 100,
                overflow: 'hidden'
              }}>
                {/* Header */}
                <div style={{
                  padding: '0.5rem 0.65rem 0.45rem',
                  borderBottom: '1px solid var(--border-subtle)',
                  flexShrink: 0
                }}>
                  <div style={{
                    color: 'var(--text-dim)',
                    fontSize: '0.68rem',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    marginBottom: '0.45rem'
                  }}>
                    Filter by Status
                  </div>

                  {/* Status Filter Pills */}
                  <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                    {[
                      { id: 'all', label: 'All', count: allTables.length, dot: null },
                      { id: 'vacant', label: 'Vacant', count: allTables.filter(t => t.status === 'vacant').length, dot: 'var(--status-vacant)' },
                      { id: 'occupied', label: 'Occupied', count: allTables.filter(t => t.status === 'occupied').length, dot: 'var(--status-occupied)' },
                      { id: 'billed', label: 'Billed', count: allTables.filter(t => t.status === 'billed').length, dot: 'var(--status-billed)' }
                    ].map(sf => {
                      const isActive = tableStatusFilter === sf.id;
                      return (
                        <button
                          key={sf.id}
                          type="button"
                          onClick={() => setTableStatusFilter(sf.id)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '0.25rem 0.55rem',
                            borderRadius: '6px',
                            fontSize: '0.7rem',
                            fontWeight: isActive ? 800 : 600,
                            background: isActive ? 'rgba(245,158,11,0.2)' : 'var(--bg-tertiary)',
                            color: isActive ? 'var(--accent-amber-light)' : 'var(--text-muted)',
                            border: isActive ? '1px solid var(--accent-amber)' : '1px solid var(--border-subtle)',
                            cursor: 'pointer'
                          }}
                        >
                          {sf.dot && <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: sf.dot, flexShrink: 0 }} />}
                          <span>{sf.label}</span>
                          <span style={{ opacity: 0.7 }}>({sf.count})</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Table List */}
                <div style={{ overflowY: 'auto', flex: 1, padding: '0.35rem' }}>
                  {allTables
                    .filter(t => tableStatusFilter === 'all' || t.status === tableStatusFilter)
                    .map(t => {
                      const isCurrent = t.id === table.id;
                      let statusDot = 'var(--status-vacant)';
                      if (t.status === 'occupied') statusDot = 'var(--status-occupied)';
                      if (t.status === 'billed') statusDot = 'var(--status-billed)';

                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => {
                            onSelectTable(t.id);
                            setIsTableDropdownOpen(false);
                          }}
                          style={{
                            width: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '0.65rem',
                            padding: '0.55rem 0.65rem',
                            marginBottom: '2px',
                            borderRadius: '7px',
                            background: isCurrent ? 'rgba(245,158,11,0.14)' : 'transparent',
                            color: 'var(--text-main)',
                            border: isCurrent ? '1px solid rgba(245,158,11,0.5)' : '1px solid transparent',
                            cursor: 'pointer',
                            textAlign: 'left'
                          }}
                          onMouseEnter={e => {
                            if (!isCurrent) e.currentTarget.style.background = 'var(--bg-tertiary)';
                          }}
                          onMouseLeave={e => {
                            if (!isCurrent) e.currentTarget.style.background = 'transparent';
                          }}
                        >
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                            <span style={{
                              width: '7px',
                              height: '7px',
                              borderRadius: '50%',
                              background: statusDot,
                              flexShrink: 0
                            }} />
                            <span style={{ fontWeight: isCurrent ? 800 : 650 }}>{t.name}</span>
                          </span>
                          <span style={{
                            fontSize: '0.66rem',
                            fontWeight: 800,
                            textTransform: 'uppercase',
                            color: t.status === 'occupied'
                              ? 'var(--status-occupied)'
                              : t.status === 'billed'
                                ? 'var(--status-billed)'
                                : 'var(--text-dim)'
                          }}>
                            {isCurrent ? 'Current' : t.status}
                          </span>
                        </button>
                      );
                    })}

                  {/* Empty state when filter yields nothing */}
                  {allTables.filter(t => tableStatusFilter === 'all' || t.status === tableStatusFilter).length === 0 && (
                    <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-dim)', fontSize: '0.75rem' }}>
                      No {tableStatusFilter} tables
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Main Workspace: Left Menu & Right Bill Cart */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden', position: 'relative' }}>


        {/* Left Sidebar: Categories & Subcategories */}
        <div style={{
          width: '240px',
          background: 'var(--bg-primary)',
          borderRight: '1px solid var(--border-subtle)',
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0,
          overflowY: 'auto'
        }}>
          <div style={{ padding: '1rem', borderBottom: '1px solid var(--border-subtle)' }}>
            <h4 style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Categories</h4>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', padding: '0.5rem' }}>
            {MENU_CATEGORIES.map(category => {
              const isSelected = selectedCategory === category.id;
              const isExpanded = expandedCategory === category.id;
              const IconComp = CATEGORY_ICONS[category.icon] || Utensils;
              
              return (
                <div key={category.id}>
                  <button
                    onClick={() => {
                      setSelectedCategory(category.id);
                      setExpandedCategory(isExpanded && isSelected ? null : category.id);
                    }}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.65rem 0.75rem',
                      borderRadius: 'var(--radius-sm)',
                      background: isSelected ? 'rgba(245, 158, 11, 0.1)' : 'transparent',
                      color: isSelected ? 'var(--accent-amber-light)' : 'var(--text-main)',
                      border: isSelected ? '1px solid rgba(245, 158, 11, 0.3)' : '1px solid transparent',
                      cursor: 'pointer',
                      marginBottom: '2px',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <IconComp size={16} color={isSelected ? 'var(--accent-amber)' : 'var(--text-dim)'} />
                      <span style={{ fontSize: '0.85rem', fontWeight: isSelected ? 700 : 500 }}>{category.name}</span>
                    </div>
                    <ChevronDown size={14} style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s', opacity: 0.5 }} />
                  </button>
                  
                  {/* Subcategories (Dietary Filters) */}
                  {isExpanded && (
                    <div style={{ paddingLeft: '2rem', display: 'flex', flexDirection: 'column', gap: '2px', marginBottom: '0.5rem' }}>
                      {(() => {
                        let filters = [
                          { id: 'all', label: 'All' },
                          { id: 'veg', label: 'Veg 🟢' },
                          { id: 'non-veg', label: 'Non-Veg 🔴' },
                          { id: 'special', label: 'Specials ⭐' }
                        ];
                        
                        if (category.id === 'breads' || category.id === 'beverages' || category.id === 'desserts') {
                          filters = [
                            { id: 'all', label: 'All Items' },
                            { id: 'special', label: 'Specials ⭐' }
                          ];
                        }

                        return filters.map(sub => (
                          <button
                            key={sub.id}
                            onClick={() => setDietaryFilter(sub.id)}
                            style={{
                              textAlign: 'left',
                              padding: '0.4rem 0.5rem',
                              borderRadius: '4px',
                              background: dietaryFilter === sub.id ? 'var(--bg-tertiary)' : 'transparent',
                              color: dietaryFilter === sub.id ? 'var(--accent-amber-light)' : 'var(--text-muted)',
                              fontSize: '0.78rem',
                              fontWeight: dietaryFilter === sub.id ? 700 : 500,
                              cursor: 'pointer',
                              border: 'none',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.4rem'
                            }}
                          >
                            <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: dietaryFilter === sub.id ? 'var(--accent-amber)' : 'transparent' }} />
                            {sub.label}
                          </button>
                        ));
                      })()}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Center: Interactive Restaurant Menu */}
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
          background: 'var(--bg-primary)'
        }}>
          {/* Menu Search Bar */}
          <div style={{
            padding: '0.85rem 1.25rem',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            background: 'var(--bg-secondary)',
            flexShrink: 0
          }}>
            {/* Search Input */}
            <div style={{ position: 'relative', flex: '1', maxWidth: '440px' }}>
              <Search size={16} color="var(--text-dim)" style={{ position: 'absolute', left: '12px', top: '11px' }} />
              <input
                type="text"
                placeholder="Search Biryani, Chicken 65, Naan, Desserts..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--text-main)',
                  padding: '0.55rem 1rem 0.55rem 2.25rem',
                  fontSize: '0.85rem'
                }}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '8px',
                    background: 'transparent',
                    color: 'var(--text-muted)',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  <X size={15} />
                </button>
              )}
            </div>
          </div>

          {/* Menu Items Grid - 4 dishes per row */}
          <div className="pos-menu-grid">
            {filteredMenuItems.length === 0 ? (
              <div style={{
                gridColumn: '1 / -1',
                textAlign: 'center',
                padding: '4rem 1rem',
                color: 'var(--text-dim)'
              }}>
                <Flame size={42} color="var(--accent-amber)" style={{ margin: '0 auto 0.75rem auto' }} />
                <h4 style={{ color: 'var(--text-main)', fontSize: '1.1rem', fontWeight: 700 }}>
                  No dishes match "{searchQuery}"
                </h4>
                <p style={{ fontSize: '0.85rem', marginTop: '0.35rem', color: 'var(--text-muted)' }}>
                  Try searching for "Biryani", "Chicken", "Paneer", "Tandoori" or click "All Items".
                </p>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCategory('all');
                    setDietaryFilter('all');
                  }}
                  style={{
                    marginTop: '1rem',
                    padding: '0.5rem 1rem',
                    background: 'var(--accent-amber)',
                    color: '#000000',
                    borderRadius: 'var(--radius-sm)',
                    fontWeight: 700,
                    fontSize: '0.82rem'
                  }}
                >
                  Show All Dishes
                </button>
              </div>
            ) : (
              filteredMenuItems.map(item => {
                const currentQty = getItemQuantityInCart(item.id);

                return (
                  <div
                    key={item.id}
                    className={`pos-menu-card ${currentQty > 0 ? 'has-qty' : ''}`}
                  >
                    {/* Item Image with culinary tags */}
                    <div className="pos-menu-card-image">
                      <img
                        src={item.image || 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=500&auto=format&fit=crop&q=80'}
                        alt={item.name}
                        loading="lazy"
                        className="pos-menu-card-image-img"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=500&auto=format&fit=crop&q=80';
                        }}
                      />

                      {/* Fallback Icon when image loading */}
                      <div style={{
                        position: 'absolute',
                        inset: 0,
                        zIndex: 0,
                        opacity: 0.25,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        pointerEvents: 'none'
                      }}>
                        <Utensils size={36} color="var(--accent-amber)" />
                      </div>

                      {/* Veg / Non-Veg Indicator badge */}
                      <div className="pos-menu-badge">
                        <span style={{
                          width: '6px',
                          height: '6px',
                          borderRadius: '2px',
                          backgroundColor: item.isVeg ? '#10b981' : '#ef4444',
                          display: 'inline-block'
                        }} />
                        <span>{item.isVeg ? 'VEG' : 'NON-VEG'}</span>
                      </div>

                      {/* Chef Special Badge */}
                      {item.isChefSpecial && (
                        <div className="pos-menu-chef">
                          <Sparkles size={10} />
                          <span>CHEF'S PICK</span>
                        </div>
                      )}

                      {/* Prep time badge */}
                      <div className="pos-menu-time">
                        <Clock size={10} />
                        <span>{item.prepTime}</span>
                      </div>
                    </div>

                    {/* Item Content with Title, Description, and Actions */}
                    <div className="pos-menu-card-content">
                      <div>
                        <div className="pos-menu-card-title-row">
                          <h4 className="pos-menu-card-title">
                            {item.name}
                          </h4>
                          {item.spiceLevel > 0 && (
                            <div style={{ display: 'flex', color: '#ef4444', flexShrink: 0 }} title={`Spicy Level: ${item.spiceLevel}`}>
                              {[...Array(item.spiceLevel)].map((_, i) => (
                                <Flame key={i} size={11} fill="#ef4444" />
                              ))}
                            </div>
                          )}
                        </div>

                        <p className="pos-menu-card-description">
                          {item.description}
                        </p>
                      </div>

                      {/* Price in Rupees and Add / Quantity Control */}
                      <div className="pos-menu-card-footer">
                        <span className="font-mono pos-menu-card-price">
                          {formatCurrency(item.price)}
                        </span>

                        {/* Interactive Add or Qty Controller */}
                        {currentQty === 0 ? (
                          <button
                            onClick={() => handleAddItem(item)}
                            className="pos-menu-add"
                          >
                            <Plus size={13} />
                            <span>Add</span>
                          </button>
                        ) : (
                          <div className="pos-menu-qty">
                            <button
                              onClick={() => {
                                sounds.playRemoveItem();
                                onUpdateItemQuantity(table.id, item.id, currentQty - 1);
                              }}
                              style={{
                                background: 'rgba(255,255,255,0.08)',
                                color: 'var(--text-main)',
                                border: 'none'
                              }}
                            >
                              <Minus size={12} />
                            </button>

                            <span className="font-mono pos-menu-qty-count">
                              {currentQty}
                            </span>

                            <button
                              onClick={() => {
                                sounds.playAddItem();
                                onUpdateItemQuantity(table.id, item.id, currentQty + 1);
                              }}
                              style={{
                                background: 'var(--accent-amber)',
                                color: '#000000',
                                border: 'none'
                              }}
                            >
                              <Plus size={12} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Side: Order Slip (Only shown when items exist) */}
        {table.items.length > 0 && (
          <div style={{
              width: '300px',
              background: 'var(--bg-secondary)',
              display: 'flex',
              flexDirection: 'column',
              borderLeft: '1px solid var(--border-subtle)',
              boxShadow: '-4px 0 16px rgba(0, 0, 0, 0.25)',
              overflow: 'hidden',
              flexShrink: 0
            }}>
              {/* Order Header — Compact */}
              <div style={{
                padding: '0.55rem 0.85rem',
                borderBottom: '1px solid var(--border-subtle)',
                background: 'var(--bg-tertiary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexShrink: 0
              }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Receipt size={14} color="var(--accent-amber)" />
                    <h3 style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-main)' }}>
                      {table.name} — Order Slip
                    </h3>
                  </div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '0.3rem', flexWrap: 'wrap' }}>
                    <span>{table.items.length} items</span>
                    <span>•</span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                      <Clock size={10} color="var(--accent-amber)" />
                      {table.orderTime || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
                <div style={{
                  background: 'rgba(245, 158, 11, 0.18)',
                  color: 'var(--accent-amber-light)',
                  padding: '0.18rem 0.5rem',
                  borderRadius: '5px',
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  whiteSpace: 'nowrap'
                }}>
                  #{table.id}0{table.items.length}
                </div>
              </div>

              {/* Ordered Items List */}
              <div style={{
                flex: 1,
                minHeight: 0,
                overflowY: 'auto',
                padding: '0.5rem 0.75rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.4rem'
              }}>
                {/* Live Kitchen Status Banner */}
                {table.items.length > 0 && (() => {
                  const allReady = table.items.every(i => i.kotStatus === 'ready' || i.kotStatus === 'served' || i.kotStatus === 'completed');
                  const hasCooking = table.items.some(i => i.kotStatus === 'cooking');
                  const hasReady = table.items.some(i => i.kotStatus === 'ready');
                  const readyCount = table.items.filter(i => i.kotStatus === 'ready' || i.kotStatus === 'served').length;

                  if (allReady) {
                    return (
                      <div style={{
                        background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.22), rgba(5, 150, 105, 0.12))',
                        border: '1.5px solid #10b981',
                        borderRadius: '8px',
                        padding: '0.65rem 0.85rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        boxShadow: '0 0 16px rgba(16, 185, 129, 0.25)',
                        animation: 'pulseGlow 2.5s infinite'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontSize: '1.2rem' }}>🔔</span>
                          <div>
                            <div style={{ fontSize: '0.78rem', fontWeight: 900, color: '#34d399', letterSpacing: '0.02em' }}>
                              FOOD IS READY TO SERVE!
                            </div>
                            <div style={{ fontSize: '0.68rem', color: '#a7f3d0', fontWeight: 600 }}>
                              Chef has completed cooking. All dishes prepared hot.
                            </div>
                          </div>
                        </div>
                        <span style={{ background: '#10b981', color: '#000', fontSize: '0.65rem', fontWeight: 900, padding: '2px 8px', borderRadius: '12px' }}>
                          SERVE NOW
                        </span>
                      </div>
                    );
                  }

                  if (hasCooking) {
                    return (
                      <div style={{
                        background: 'linear-gradient(135deg, rgba(234, 88, 12, 0.2), rgba(245, 158, 11, 0.1))',
                        border: '1.5px solid #ea580c',
                        borderRadius: '8px',
                        padding: '0.65rem 0.85rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                      }}>
                        <span style={{ fontSize: '1.2rem' }}>🔥</span>
                        <div>
                          <div style={{ fontSize: '0.78rem', fontWeight: 900, color: '#fb923c', letterSpacing: '0.02em' }}>
                            {readyCount > 0 ? `CHEF IS COOKING (${readyCount}/${table.items.length} PREPARED)` : 'CHEF IS COOKING ORDER'}
                          </div>
                          <div style={{ fontSize: '0.68rem', color: '#fed7aa', fontWeight: 600 }}>
                            {readyCount > 0 ? `${readyCount} dish(es) ready to serve • Remaining dishes in pan` : 'Kitchen started preparing dishes • Live in pan'}
                          </div>
                        </div>
                      </div>
                    );
                  }

                  if (hasReady) {
                    return (
                      <div style={{
                        background: 'rgba(16, 185, 129, 0.12)',
                        border: '1px solid rgba(16, 185, 129, 0.4)',
                        borderRadius: '8px',
                        padding: '0.55rem 0.8rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                      }}>
                        <span style={{ fontSize: '1.1rem' }}>🔔</span>
                        <div>
                          <div style={{ fontSize: '0.76rem', fontWeight: 800, color: '#34d399' }}>
                            Some Dishes Prepared ({readyCount}/{table.items.length})
                          </div>
                          <div style={{ fontSize: '0.66rem', color: '#6ee7b7' }}>
                            Partial items are ready to serve to guests
                          </div>
                        </div>
                      </div>
                    );
                  }

                  return null;
                })()}

                {table.items.length === 0 ? (
                  <div style={{
                    textAlign: 'center',
                    padding: '3rem 1rem',
                    color: 'var(--text-dim)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '0.75rem'
                  }}>
                    <Utensils size={36} color="var(--text-dim)" />
                    <p style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                      No dishes added yet to {table.name}
                    </p>
                    <p style={{ fontSize: '0.78rem', maxWidth: '240px' }}>
                      Tap any Biryani or starter from the menu on the left to add items to this table.
                    </p>
                  </div>
                ) : (
                  table.items.map(item => (
                    <div
                      key={item.id}
                      style={{
                        background: 'var(--bg-tertiary)',
                        borderRadius: '6px',
                        padding: '0.45rem 0.6rem',
                        border: '1px solid var(--border-subtle)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.3rem'
                      }}
                    >
                      {/* Top Row: Name + Total Price */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.4rem' }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            color: 'var(--text-main)',
                            lineHeight: 1.3,
                            wordBreak: 'break-word'
                          }}>
                            {item.name}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', marginTop: '2px', flexWrap: 'wrap' }}>
                            <span className="font-mono" style={{ fontSize: '0.68rem', color: 'var(--text-dim)' }}>
                              {formatCurrency(item.price)} × {item.quantity}
                            </span>
                            {item.kotStatus && (
                              <span style={{
                                fontSize: '0.6rem',
                                fontWeight: 800,
                                padding: '0px 5px',
                                borderRadius: '3px',
                                background: (item.kotStatus === 'ready' || item.kotStatus === 'served')
                                  ? 'rgba(16, 185, 129, 0.15)'
                                  : (item.kotStatus === 'cooking' ? 'rgba(234, 88, 12, 0.15)' : 'rgba(245, 158, 11, 0.15)'),
                                color: (item.kotStatus === 'ready' || item.kotStatus === 'served')
                                  ? '#10b981'
                                  : (item.kotStatus === 'cooking' ? '#ea580c' : '#f59e0b')
                              }}>
                                {(item.kotStatus === 'ready' || item.kotStatus === 'served')
                                  ? '✓ Ready'
                                  : (item.kotStatus === 'cooking' ? '🔥 Cooking' : '📥 KOT')}
                              </span>
                            )}
                          </div>
                        </div>
                        <span className="font-mono" style={{ fontSize: '0.84rem', fontWeight: 800, color: 'var(--accent-amber-light)', whiteSpace: 'nowrap', flexShrink: 0 }}>
                          {formatCurrency(item.price * item.quantity)}
                        </span>
                      </div>

                      {/* Quantity Stepper & Notes */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginTop: '0.2rem',
                        paddingTop: '0.4rem',
                        borderTop: '1px solid rgba(255,255,255,0.05)'
                      }}>
                        {/* Stepper */}
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                          background: 'var(--bg-secondary)',
                          borderRadius: '4px',
                          padding: '2px 4px'
                        }}>
                          <button
                            onClick={() => {
                              sounds.playRemoveItem();
                              onUpdateItemQuantity(table.id, item.id, item.quantity - 1);
                            }}
                            style={{
                              background: 'transparent',
                              color: 'var(--text-muted)',
                              width: '20px',
                              height: '20px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                          >
                            <Minus size={12} />
                          </button>

                          <span className="font-mono" style={{ fontWeight: 700, fontSize: '0.84rem', minWidth: '18px', textAlign: 'center' }}>
                            {item.quantity}
                          </span>

                          <button
                            onClick={() => {
                              sounds.playAddItem();
                              onUpdateItemQuantity(table.id, item.id, item.quantity + 1);
                            }}
                            style={{
                              background: 'transparent',
                              color: 'var(--accent-amber-light)',
                              width: '20px',
                              height: '20px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                          >
                            <Plus size={12} />
                          </button>
                        </div>

                        {/* Notes Trigger & Delete */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <button
                            onClick={() => {
                              setEditingNoteItemId(item.id);
                              setTempNote(item.notes || '');
                            }}
                            style={{
                              fontSize: '0.72rem',
                              color: item.notes ? 'var(--accent-amber-light)' : 'var(--text-dim)',
                              background: 'transparent',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.25rem',
                              textDecoration: 'underline'
                            }}
                          >
                            <FileText size={11} />
                            <span>{item.notes ? `"${item.notes}"` : '+ Note'}</span>
                          </button>

                          <button
                            onClick={() => {
                              sounds.playRemoveItem();
                              onRemoveItemFromTable(table.id, item.id);
                            }}
                            style={{
                              background: 'transparent',
                              color: 'var(--text-dim)',
                              padding: '2px'
                            }}
                            title="Remove item"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>

                      {/* Inline Note Editor */}
                      {editingNoteItemId === item.id && (
                        <div style={{ display: 'flex', gap: '0.3rem', marginTop: '0.3rem' }}>
                          <input
                            type="text"
                            placeholder="e.g. Extra salan, spicy, no coriander..."
                            value={tempNote}
                            onChange={e => setTempNote(e.target.value)}
                            autoFocus
                            style={{
                              flex: 1,
                              background: 'var(--bg-primary)',
                              border: '1px solid var(--accent-amber)',
                              borderRadius: '4px',
                              color: 'var(--text-main)',
                              padding: '0.25rem 0.5rem',
                              fontSize: '0.74rem'
                            }}
                            onKeyDown={e => {
                              if (e.key === 'Enter') handleSaveNote(item.id);
                            }}
                          />
                          <button
                            onClick={() => handleSaveNote(item.id)}
                            style={{
                              background: 'var(--accent-amber)',
                              color: '#000000',
                              padding: '0 0.5rem',
                              borderRadius: '4px',
                              fontSize: '0.72rem',
                              fontWeight: 700
                            }}
                          >
                            Save
                          </button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>

              {/* Financial Breakdown — Compact */}
              <div style={{
                background: 'var(--bg-primary)',
                padding: '0.6rem 0.85rem',
                borderTop: '1px solid var(--border-subtle)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.3rem',
                flexShrink: 0
              }}>
                {/* Subtotal row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                  <span>Subtotal</span>
                  <span className="font-mono">{formatCurrency(subtotal)}</span>
                </div>

                {/* Discount selector — inline compact */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.74rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', color: 'var(--text-muted)' }}>
                    <Percent size={11} color="var(--accent-amber)" />
                    <span>Discount</span>
                  </div>
                  <div style={{ display: 'flex', gap: '0.2rem' }}>
                    {[0, 5, 10, 15].map(pct => (
                      <button
                        key={pct}
                        onClick={() => onUpdateDiscount(table.id, pct)}
                        style={{
                          background: (table.discountPercent || 0) === pct ? 'var(--accent-amber)' : 'var(--bg-tertiary)',
                          color: (table.discountPercent || 0) === pct ? '#000000' : 'var(--text-muted)',
                          padding: '0px 5px',
                          borderRadius: '3px',
                          fontSize: '0.65rem',
                          fontWeight: 700
                        }}
                      >
                        {pct}%
                      </button>
                    ))}
                  </div>
                </div>

                {table.discountPercent > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#10b981' }}>
                    <span>Discount ({table.discountPercent}%)</span>
                    <span className="font-mono">-{formatCurrency(discountAmount)}</span>
                  </div>
                )}

                {/* GST + Service in one compact row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  <span>GST (5%)</span>
                  <span className="font-mono">{formatCurrency(taxAmount)}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={table.serviceCharge > 0}
                      onChange={(e) => onToggleServiceCharge(table.id, e.target.checked ? 5 : 0)}
                      style={{ accentColor: 'var(--accent-amber)', width: '12px', height: '12px' }}
                    />
                    <span>Service Charge (5%)</span>
                  </label>
                  <span className="font-mono">{formatCurrency(serviceChargeAmount)}</span>
                </div>

                {/* Grand Total row */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingTop: '0.4rem',
                  borderTop: '1px dashed var(--border-subtle)',
                  marginTop: '0.15rem'
                }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-main)' }}>TOTAL</span>
                  <span className="font-mono" style={{ fontSize: '1.15rem', fontWeight: 900, color: 'var(--accent-amber-light)' }}>
                    {formatCurrency(grandTotal)}
                  </span>
                </div>

                {/* Actions: KOT + Print then Settle */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginTop: '0.35rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.35rem' }}>
                    <button
                      onClick={() => onSendKOT(table.id)}
                      disabled={table.items.length === 0}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        gap: '0.3rem', padding: '0.5rem',
                        borderRadius: '6px',
                        background: 'var(--bg-tertiary)',
                        color: table.items.length === 0 ? 'var(--text-dim)' : 'var(--text-main)',
                        border: '1px solid var(--border-subtle)',
                        fontSize: '0.74rem', fontWeight: 700,
                        cursor: table.items.length === 0 ? 'not-allowed' : 'pointer'
                      }}
                    >
                      <ChefHat size={13} color="var(--accent-amber)" />
                      <span>Send KOT</span>
                    </button>
                    <button
                      onClick={() => onOpenReceipt(table.id)}
                      disabled={table.items.length === 0}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        gap: '0.3rem', padding: '0.5rem',
                        borderRadius: '6px',
                        background: 'var(--bg-tertiary)',
                        color: table.items.length === 0 ? 'var(--text-dim)' : 'var(--text-main)',
                        border: '1px solid var(--border-subtle)',
                        fontSize: '0.74rem', fontWeight: 700,
                        cursor: table.items.length === 0 ? 'not-allowed' : 'pointer'
                      }}
                    >
                      <Receipt size={13} color="var(--accent-amber)" />
                      <span>Print Bill</span>
                    </button>
                  </div>

                  <button
                    onClick={() => onOpenSettlement(table.id)}
                    disabled={table.items.length === 0}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      gap: '0.4rem', padding: '0.65rem',
                      borderRadius: '8px',
                      background: table.items.length === 0
                        ? 'rgba(245, 158, 11, 0.2)'
                        : 'linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)',
                      color: table.items.length === 0 ? 'var(--text-dim)' : '#ffffff',
                      fontSize: '0.82rem',
                      fontWeight: 800,
                      boxShadow: table.items.length === 0 ? 'none' : '0 3px 10px rgba(245, 158, 11, 0.4)',
                      cursor: table.items.length === 0 ? 'not-allowed' : 'pointer'
                    }}
                  >
                    <CreditCard size={15} />
                    <span>Settle & Checkout — {formatCurrency(grandTotal)}</span>
                  </button>
                </div>
              </div>
          </div>
        )}
      </div>
    </div>
  );
}
