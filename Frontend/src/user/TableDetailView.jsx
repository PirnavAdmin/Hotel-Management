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

//       return matchCat && matchSearch && matchDietary && item.isAvailable !== false;
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
//               background: 'linear-gradient(135deg, var(--accent-amber), var(--accent-saffron))',
//               color: '#ffffff',
//               padding: '0.35rem 0.75rem',
//               borderRadius: 'var(--radius-sm)',
//               fontWeight: 800,
//               fontSize: '1rem',
//               boxShadow: '0 2px 8px color-mix(in srgb, var(--accent-amber) 35%, transparent)'
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
//                 background: 'var(--surface-tint)',
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
//                 background: 'var(--surface-tint)',
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
//                 <span style={{ fontFamily: 'monospace', fontWeight: 800 }}>⏱️ {elapsedFormatted}</span>
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
//                   ? 'color-mix(in srgb, var(--accent-amber) 22%, transparent)'
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
//                             background: isSelected ? 'color-mix(in srgb, var(--accent-amber) 22%, transparent)' : 'var(--bg-tertiary)',
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
//                       ? 'linear-gradient(135deg, color-mix(in srgb, var(--accent-amber) 30%, transparent) 0%, color-mix(in srgb, var(--accent-amber) 12%, transparent) 100%)'
//                       : (isBiryaniCat ? 'color-mix(in srgb, var(--accent-amber) 8%, transparent)' : 'var(--bg-secondary)'),
//                     color: isSelected
//                       ? 'var(--accent-amber-light)'
//                       : (isBiryaniCat ? 'var(--accent-amber-light)' : 'var(--text-muted)'),
//                     border: isSelected
//                       ? '1px solid var(--accent-amber)'
//                       : (isBiryaniCat ? '1px solid color-mix(in srgb, var(--accent-amber) 30%, transparent)' : '1px solid var(--border-subtle)'),
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
//                       boxShadow: currentQty > 0 ? '0 3px 10px color-mix(in srgb, var(--accent-amber) 22%, transparent)' : 'var(--shadow-sm)',
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
//                         background: 'var(--modal-overlay)',
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
//                           background: 'linear-gradient(135deg, var(--accent-amber), var(--accent-saffron))',
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
//                         background: 'var(--modal-overlay)',
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
//                               background: 'linear-gradient(135deg, var(--accent-amber) 0%, var(--accent-saffron) 100%)',
//                               color: '#ffffff',
//                               fontWeight: 800,
//                               fontSize: '0.7rem',
//                               boxShadow: '0 2px 4px color-mix(in srgb, var(--accent-amber) 35%, transparent)',
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
//                                 background: 'var(--surface-tint)',
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
//               background: 'color-mix(in srgb, var(--accent-amber) 18%, transparent)',
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
//                         <div style={{ fontSize: '0.78rem', fontWeight: 900, color: 'var(--success)', letterSpacing: '0.02em' }}>
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
//                     background: 'linear-gradient(135deg, color-mix(in srgb, var(--accent-saffron) 20%, transparent), color-mix(in srgb, var(--accent-amber) 10%, transparent))',
//                     border: '1.5px solid var(--accent-saffron)',
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
//                         {readyCount > 0 ? `${readyCount} dish(es) ready to serve • Remaining dishes cooking` : 'Kitchen started preparing dishes'}
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
//                       <div style={{ fontSize: '0.76rem', fontWeight: 800, color: 'var(--success)' }}>
//                         Some Dishes Prepared ({readyCount}/{table.items.length})
//                       </div>
//                       <div style={{ fontSize: '0.66rem', color: 'var(--success)' }}>
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
//                             : (item.kotStatus === 'cooking' ? 'color-mix(in srgb, var(--accent-saffron) 15%, transparent)' : 'color-mix(in srgb, var(--accent-amber) 15%, transparent)'),
//                           color: (item.kotStatus === 'ready' || item.kotStatus === 'served')
//                             ? '#10b981'
//                             : (item.kotStatus === 'cooking' ? 'var(--accent-saffron)' : 'var(--accent-amber)'),
//                           border: `1px solid ${
//                             (item.kotStatus === 'ready' || item.kotStatus === 'served')
//                               ? 'rgba(16, 185, 129, 0.3)'
//                               : (item.kotStatus === 'cooking' ? 'color-mix(in srgb, var(--accent-saffron) 30%, transparent)' : 'color-mix(in srgb, var(--accent-amber) 30%, transparent)')
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
//                     borderTop: '1px solid var(--neutral-border)'
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
//                     ? 'color-mix(in srgb, var(--accent-amber) 20%, transparent)'
//                     : 'linear-gradient(135deg, var(--accent-amber) 0%, var(--accent-saffron) 100%)',
//                   color: table.items.length === 0 ? 'var(--text-dim)' : '#ffffff',
//                   fontSize: '0.92rem',
//                   fontWeight: 800,
//                   boxShadow: table.items.length === 0 ? 'none' : '0 4px 14px color-mix(in srgb, var(--accent-amber) 40%, transparent)',
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

import React, { useState, useMemo, useEffect, useRef } from "react";
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
  Sparkles,
  FileText,
  Utensils,
  Soup,
  Sandwich,
  Coffee,
  IceCream,
  Percent,
  X,
  Circle,
  Star,
  ChevronDown,
  Filter,
  LogOut,
  LayoutGrid,
  List,
  RotateCcw,
  ArrowUpDown,
  Phone,
  User,
} from "lucide-react";
import { findCustomerByPhone } from "../utils/customerStorage";
import { sounds } from "../utils/audio";
import { formatCurrency, roundCurrency } from "../utils/formatCurrency";
import {
  parseTimeToSeconds,
  formatElapsedTimer,
  getTimerUrgencyColor,
} from "../utils/timer";
import { ItemDetailModal } from "./ItemDetailModal";
import { isSameMenuItem, consolidateOrderItems } from "../utils/orderItemMatcher";
import { isDrinkItem } from "../kot/orderRouting";
import { getMenuItemImage, handleDishImageError } from "../utils/menuImageHelper";
import { SkeletonMenuCard, SkeletonText, SkeletonAvatar, SkeletonButton } from "../common/Skeletons";
import { TruncatedTooltip } from "../common/TruncatedTooltip";
import { isDrinkCategory } from "../utils/drinkCategoryHelper";
import MenuItemVisual from "../common/MenuItemVisual";
import { MenuItemCard } from "../common/MenuItemCard";
import "../common/MenuCatalogLayout.css";

const CATEGORY_ICONS = {
  Utensils: Utensils,
  Flame: Flame,
  Sparkles: Sparkles,
  Soup: Soup,
  Sandwich: Sandwich,
  Coffee: Coffee,
  IceCream: IceCream,
};

const createOrderLineKeys = (items = []) => {
  const occurrences = new Map();
  return items.map((item) => {
    const persistedLineId = item?.orderItemId ?? item?.order_item_id ?? item?.lineId ?? item?.line_id;
    if (persistedLineId !== undefined && persistedLineId !== null && String(persistedLineId).trim()) {
      const base = `order-line-${String(persistedLineId)}`;
      const occurrence = occurrences.get(base) || 0;
      occurrences.set(base, occurrence + 1);
      return occurrence === 0 ? base : `${base}-${occurrence}`;
    }

    const menuId = item?.menuItemId ?? item?.menu_item_id ?? item?.menu?.id ?? item?.id ?? "unknown";
    const name = item?.name ?? item?.dishName ?? item?.dish_name ?? "item";
    const unitPrice = item?.unitPrice ?? item?.price ?? 0;
    const quantity = item?.quantity ?? item?.qty ?? 1;
    const notes = item?.notes ?? "";
    const base = `order-line-${String(menuId)}-${String(name)}-${String(unitPrice)}-${String(quantity)}-${String(notes)}`;
    const occurrence = occurrences.get(base) || 0;
    occurrences.set(base, occurrence + 1);
    return occurrence === 0 ? base : `${base}-${occurrence}`;
  });
};

export function TableDetailView({
  table,
  allTables,
  menuItems = [],
  barMenuItems = [],
  menuLoading = false,
  barMenuLoading = false,
  menuLoadError = "",
  barMenuLoadError = "",
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
  onOpenKOTView,
  onShowToast,
  onUpdateCustomer,
}) {
  // Active table identity and live selection
  const activeTable =
    (Array.isArray(allTables) && table?.id
      ? allTables.find((t) => String(t.id) === String(table.id))
      : null) || table || {};

  const activeGuests =
    (Number(activeTable?.guests) > 0 ? Number(activeTable.guests) : null) ??
    (Array.isArray(activeTable?.selectedSeats) && activeTable.selectedSeats.length > 0 ? activeTable.selectedSeats.length : null) ??
    (Number(activeTable?.occupiedChairs) > 0 ? Number(activeTable.occupiedChairs) : null) ??
    (Number(table?.guests) > 0 ? Number(table.guests) : null) ??
    (Array.isArray(table?.selectedSeats) && table.selectedSeats.length > 0 ? table.selectedSeats.length : null) ??
    (Number(table?.occupiedChairs) > 0 ? Number(table.occupiedChairs) : null) ??
    0;

  // Customer capture & recognition
  const [custName, setCustName] = useState(activeTable?.customerName || "");
  const [custPhone, setCustPhone] = useState(activeTable?.customerPhone || "");
  const [custTier, setCustTier] = useState(activeTable?.customerTier || "");
  const [custVisits, setCustVisits] = useState(activeTable?.customerVisits || 0);

  useEffect(() => {
    setCustName(activeTable?.customerName || "");
    setCustPhone(activeTable?.customerPhone || "");
    setCustTier(activeTable?.customerTier || "");
    setCustVisits(activeTable?.customerVisits || 0);
  }, [activeTable?.id, activeTable?.customerName, activeTable?.customerPhone]);

  const handleCustomerPhoneChange = (val) => {
    setCustPhone(val);
    const match = findCustomerByPhone(val);
    if (match) {
      const matchName = match.fullName || match.name || "";
      const matchTier = match.tier || (match.totalSpent > 20000 ? "VIP" : "Regular");
      const matchVisits = match.visitsCount || 1;
      setCustName(matchName);
      setCustTier(matchTier);
      setCustVisits(matchVisits);
      onUpdateCustomer?.(activeTable?.id || table?.id, {
        customerName: matchName,
        customerPhone: val,
        customerTier: matchTier,
        customerVisits: matchVisits,
      });
    } else {
      onUpdateCustomer?.(activeTable?.id || table?.id, {
        customerName: custName,
        customerPhone: val,
        customerTier: custTier,
        customerVisits: custVisits,
      });
    }
  };

  const handleCustomerNameChange = (val) => {
    setCustName(val);
    onUpdateCustomer?.(activeTable?.id || table?.id, {
      customerName: val,
      customerPhone: custPhone,
      customerTier: custTier,
      customerVisits: custVisits,
    });
  };

  const [selectedCategory, setSelectedCategory] = useState("all");
  const [orderMode, setOrderMode] = useState("kitchen");
  const [dietaryFilter, setDietaryFilter] = useState("all"); // all | veg | non-veg | special
  const [menuSortOrder, setMenuSortOrder] = useState("default"); // default | price-asc | price-desc | name-asc
  const [searchQuery, setSearchQuery] = useState("");
  const [editingNoteItemId, setEditingNoteItemId] = useState(null);
  const [tempNote, setTempNote] = useState("");
  const [selectedMenuItemModal, setSelectedMenuItemModal] = useState(null);
  const [menuViewMode, setMenuViewMode] = useState(() => {
    try {
      const stored = localStorage.getItem("gourmet_pos_menu_view_mode");
      if (stored === "grid") {
        localStorage.removeItem("gourmet_pos_menu_view_mode");
      }
    } catch {}
    return "rows";
  });

  const handleSetMenuViewMode = (mode) => {
    setMenuViewMode(mode);
    try {
      localStorage.setItem("gourmet_pos_menu_view_mode", mode);
    } catch {}
  };

  // Filter states
  const [isTableDropdownOpen, setIsTableDropdownOpen] = useState(false);
  const [tableStatusFilter, setTableStatusFilter] = useState("all"); // 'all' | 'vacant' | 'occupied' | 'billed'
  const [isMobileOrderSlipOpen, setIsMobileOrderSlipOpen] = useState(false);
  const [isSendingKot, setIsSendingKot] = useState(false);
  const [isCustomerDetailsOpen, setIsCustomerDetailsOpen] = useState(false);

  const handleTriggerSendKot = async () => {
    if (isSendingKot || safeItems.length === 0) return;
    setIsSendingKot(true);
    try {
      await onSendKOT(targetTableId, safeItems);
    } finally {
      setTimeout(() => setIsSendingKot(false), 2000);
    }
  };
  const activeMenuItems = orderMode === "bar"
    ? barMenuItems
    : menuItems.filter((item) => !isDrinkItem(item));
  const activeMenuLoading = orderMode === "bar" ? barMenuLoading : menuLoading;
  const activeMenuLoadError = orderMode === "bar" ? barMenuLoadError : menuLoadError;
  const barMenuItemIds = new Set(
    barMenuItems.map((item) => String(item.menuItemId ?? item.id ?? "")).filter(Boolean),
  );

  // Filtered menu items with spelling tolerance for biriyani / biryani
  const filteredMenuItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const normalizedQuery = query.replace(/biriyani/g, "biryani");
    const normalizedSelectedCategory = String(selectedCategory || "all").trim().toLowerCase();

    return (Array.isArray(activeMenuItems) ? activeMenuItems : []).filter((item) => {
      const itemName = String(item?.name ?? item?.dishName ?? item?.dish_name ?? "");
      const itemDescription = String(item?.description ?? item?.shortDescription ?? item?.short_description ?? "");
      const itemCategory = String(item?.category ?? item?.categoryName ?? item?.category_name ?? item?.dishCategory ?? "");
      const normalizedItemCategory = itemCategory.trim().toLowerCase();
      const matchCat =
        normalizedSelectedCategory === "all" ||
        normalizedItemCategory === normalizedSelectedCategory ||
        normalizedItemCategory.replace(/[\s-_]/g, "") === normalizedSelectedCategory.replace(/[\s-_]/g, "");

      const itemTitle = itemName.toLowerCase();
      const itemDesc = itemDescription.toLowerCase();
      const itemCat = normalizedItemCategory;

      const matchSearch =
        !query ||
        itemTitle.includes(query) ||
        itemTitle.includes(normalizedQuery) ||
        itemDesc.includes(query) ||
        itemDesc.includes(normalizedQuery) ||
        itemCat.includes(query) ||
        itemCat.includes(normalizedQuery);

      let matchDietary = true;
      const normalizedDietaryType = String(item?.dietaryType ?? item?.dietary_type ?? "").trim().toUpperCase();
      if (dietaryFilter === "veg") matchDietary = (normalizedDietaryType === "VEG" || item?.isVeg === true || item?.is_veg === true);
      if (dietaryFilter === "non-veg") matchDietary = (normalizedDietaryType.includes("NON") || item?.isVeg === false || item?.is_veg === false);
      if (dietaryFilter === "special") matchDietary = Boolean(item?.isChefSpecial || item?.isChefsSpecial || item?.is_chef_special || item?.isSpecial);

      return matchCat && matchSearch && matchDietary;
    });

    if (menuSortOrder === "price-asc") {
      return [...items].sort((a, b) => Number(a?.price ?? a?.finalPrice ?? 0) - Number(b?.price ?? b?.finalPrice ?? 0));
    }
    if (menuSortOrder === "price-desc") {
      return [...items].sort((a, b) => Number(b?.price ?? b?.finalPrice ?? 0) - Number(a?.price ?? a?.finalPrice ?? 0));
    }
    if (menuSortOrder === "name-asc") {
      return [...items].sort((a, b) => String(a?.name ?? a?.dishName ?? "").localeCompare(String(b?.name ?? b?.dishName ?? "")));
    }
    return items;
  }, [selectedCategory, dietaryFilter, searchQuery, activeMenuItems, menuSortOrder]);

  const emptyStateContent = activeMenuLoadError
    ? {
        title: orderMode === "bar" ? "Bar drinks could not be loaded" : "Menu items could not be loaded",
      }
    : {
        title: "No Matching Dishes Found",
      };

  // Financial calculations in Rupees
  const isVacant = activeTable?.status === "vacant" || table?.status === "vacant";
  const activeItems = Array.isArray(activeTable?.items) ? activeTable.items : [];
  const propItems = Array.isArray(table?.items) ? table.items : [];
  const rawSafeItems = isVacant
    ? []
    : (activeItems.length > 0 ? activeItems : propItems);
  const safeItems = useMemo(() => consolidateOrderItems(rawSafeItems), [rawSafeItems]);
  const safeItemKeys = createOrderLineKeys(safeItems);
  const targetTableId = activeTable?.id ?? table?.id;

  // KOT Flow Helpers: Enforce Send KOT first, then Cooking, then Settle enabled
  const isItemSentToKot = (item) => {
    if (!item) return false;
    return Boolean(
      item.kotSent ||
      item.kotStatus === "received" ||
      item.kotStatus === "cooking" ||
      item.kotStatus === "ready" ||
      item.kotStatus === "served" ||
      item.kotStatus === "completed"
    );
  };

  const unsentItems = useMemo(() => safeItems.filter((i) => !isItemSentToKot(i)), [safeItems]);
  const sentItems = useMemo(() => safeItems.filter((i) => isItemSentToKot(i)), [safeItems]);

  const isItemCookedReady = (item) => {
    if (!item) return false;
    return (
      item.kotStatus === "ready" ||
      item.kotStatus === "served" ||
      item.kotStatus === "completed"
    );
  };

  const isBarMenuItem = (item) => Boolean(
    isDrinkItem(item, null, barMenuItems) ||
    item?.isBarItem ||
    item?.isBarDrink ||
    barMenuItemIds.has(String(item?.menuItemId ?? item?.id ?? ""))
  );
  const hasUnsentItems = safeItems.length > 0 && safeItems.some((i) => !isItemSentToKot(i));
  const hasUnsentKitchenItems = safeItems.some((item) => !isBarMenuItem(item) && !isItemSentToKot(item));
  const hasUnsentBarItems = safeItems.some((item) => isBarMenuItem(item) && !isItemSentToKot(item));
  const dispatchButtonLabel = hasUnsentKitchenItems && hasUnsentBarItems
    ? "Send KOT + BOT"
    : hasUnsentBarItems
      ? "Send BOT"
      : hasUnsentKitchenItems
        ? "Send KOT"
        : "Send Orders";
  const allItemsSentToKot = safeItems.length > 0 && safeItems.every((i) => isItemSentToKot(i));
  const allCookingReady = safeItems.length > 0 && safeItems.every((i) => isItemCookedReady(i));
  const canSettleAndCheckout = safeItems.length > 0 && allItemsSentToKot && allCookingReady;

  const subtotal = roundCurrency(safeItems.reduce(
    (sum, item) =>
      sum + (Number(item?.price) || 0) * (Number(item?.quantity) || 1),
    0,
  ));
  const currentDiscountPercent = Number(activeTable?.discountPercent ?? table?.discountPercent ?? 0);
  const currentDiscountAmount = activeTable?.discountAmount !== undefined && Number(activeTable?.discountAmount) >= 0
    ? roundCurrency(Number(activeTable.discountAmount))
    : table?.discountAmount !== undefined && Number(table?.discountAmount) >= 0
      ? roundCurrency(Number(table.discountAmount))
      : roundCurrency((subtotal * currentDiscountPercent) / 100);
  const currentServiceCharge = Number(activeTable?.serviceCharge ?? table?.serviceCharge ?? 0);
  const discountAmount = currentDiscountAmount;
  const taxableAmount = roundCurrency(Math.max(0, subtotal - discountAmount));
  const taxRate = 0.05; // 5% GST (2.5% CGST + 2.5% SGST)
  const taxAmount = roundCurrency(taxableAmount * taxRate);
  const serviceChargeAmount = currentServiceCharge
    ? roundCurrency(taxableAmount * (currentServiceCharge / 100))
    : 0;
  const grandTotal = roundCurrency(
    taxableAmount + taxAmount + serviceChargeAmount,
  );

  // Find quantity of an item already in the table order
  const getItemQuantityInCart = (itemOrId) => {
    if (!itemOrId) return 0;
    const target = typeof itemOrId === "object" ? itemOrId : { id: itemOrId };
    return safeItems
      .filter((i) => isSameMenuItem(i, target))
      .reduce((sum, i) => sum + (Number(i.quantity) || 1), 0);
  };

  const addDebounceRef = useRef({});
  const lastAddTimestampRef = useRef({});

  const handleAddItem = (item) => {
    if (!item) return;
    const key = String(item.id || item.menuItemId || item.name);
    const now = Date.now();
    // Guard against rapid duplicate clicks (double-click, touch bounce) within 450ms
    if (addDebounceRef.current[key] && now - addDebounceRef.current[key] < 450) {
      return;
    }
    addDebounceRef.current[key] = now;
    lastAddTimestampRef.current[key] = now;

    sounds.playAddItem();
    onAddItemToTable(targetTableId, { ...item, quantity: 1 });
  };

  const handleSaveNote = (itemId) => {
    onUpdateItemNotes(targetTableId, itemId, tempNote.trim());
    setEditingNoteItemId(null);
    setTempNote("");
  };

  const handleOpenItemModal = (item) => {
    setSelectedMenuItemModal(item);
  };

  const handleConfirmItemModal = (customizedItem) => {
    onAddItemToTable(targetTableId, customizedItem);
  };

  const handleRemoveItemFromModal = (itemId) => {
    onRemoveItemFromTable(targetTableId, itemId);
  };

  const renderItemCard = (item, index, isUnsent) => {
    const itemStatus = String(item?.kotStatus || "").toLowerCase();
    const isReady = itemStatus === "ready" || itemStatus === "served" || itemStatus === "completed";
    const isCooking = itemStatus === "cooking" || itemStatus === "mixing";
    const isSent = isItemSentToKot(item);
    const itemKey = `${item?.id || index}_${item?.uniqueCartKey || index}`;

    return (
      <div
        key={itemKey}
        style={{
          background: isUnsent ? "rgba(245, 158, 11, 0.06)" : "var(--bg-tertiary)",
          borderRadius: "8px",
          padding: "0.55rem 0.7rem",
          border: isUnsent ? "1px solid rgba(245, 158, 11, 0.35)" : "1px solid var(--border-subtle)",
          display: "flex",
          flexDirection: "column",
          gap: "0.35rem",
          transition: "all 0.15s ease",
        }}
      >
        {/* Top Row: Name + Badges + Item Total */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: "0.5rem",
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", flexWrap: "wrap" }}>
              <span
                style={{
                  fontSize: "0.82rem",
                  fontWeight: 700,
                  color: "var(--text-main)",
                  lineHeight: 1.3,
                  wordBreak: "break-word",
                }}
              >
                {item.name}
              </span>
              <span
                style={{
                  fontSize: "0.58rem",
                  fontWeight: 800,
                  padding: "1px 5px",
                  borderRadius: "999px",
                  background: isBarMenuItem(item) ? "rgba(59, 130, 246, 0.14)" : "rgba(245, 158, 11, 0.14)",
                  color: isBarMenuItem(item) ? "var(--info)" : "var(--accent-amber-light)",
                  border: `1px solid ${isBarMenuItem(item) ? "rgba(59, 130, 246, 0.35)" : "rgba(245, 158, 11, 0.35)"}`,
                  whiteSpace: "nowrap",
                }}
              >
                {isBarMenuItem(item) ? "Bar" : "Kitchen"}
              </span>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.35rem",
                marginTop: "3px",
                flexWrap: "wrap",
              }}
            >
              <span
                className="font-mono"
                style={{
                  fontSize: "0.72rem",
                  color: "var(--text-dim)",
                }}
              >
                {formatCurrency(item.price)} × {item.quantity}
              </span>
              {isReady ? (
                <span
                  style={{
                    fontSize: "0.62rem",
                    fontWeight: 800,
                    padding: "1px 6px",
                    borderRadius: "4px",
                    background: "rgba(16, 185, 129, 0.15)",
                    color: "#10b981",
                    border: "1px solid rgba(16, 185, 129, 0.35)",
                  }}
                >
                  ✓ Ready
                </span>
              ) : isCooking ? (
                <span
                  style={{
                    fontSize: "0.62rem",
                    fontWeight: 800,
                    padding: "1px 6px",
                    borderRadius: "4px",
                    background: "rgba(234, 88, 12, 0.15)",
                    color: "#ea580c",
                    border: "1px solid rgba(234, 88, 12, 0.35)",
                  }}
                >
                  🔥 Cooking
                </span>
              ) : isSent ? (
                <span
                  style={{
                    fontSize: "0.62rem",
                    fontWeight: 800,
                    padding: "1px 6px",
                    borderRadius: "4px",
                    background: "rgba(245, 158, 11, 0.15)",
                    color: "var(--accent-amber-light)",
                    border: "1px solid rgba(245, 158, 11, 0.35)",
                  }}
                >
                  📥 {isBarMenuItem(item) ? "BOT Sent" : "KOT Sent"}
                </span>
              ) : (
                <span
                  style={{
                    fontSize: "0.62rem",
                    fontWeight: 800,
                    padding: "1px 6px",
                    borderRadius: "4px",
                    background: "rgba(245, 158, 11, 0.22)",
                    color: "var(--accent-amber-light)",
                    border: "1px solid rgba(245, 158, 11, 0.5)",
                  }}
                >
                  🟡 New (Unsent)
                </span>
              )}
            </div>
          </div>
          <span
            className="font-mono"
            style={{
              fontSize: "0.92rem",
              fontWeight: 800,
              color: "var(--accent-amber-light)",
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}
          >
            {formatCurrency(item.price * item.quantity)}
          </span>
        </div>

        {/* Stepper & Note & Delete */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: "0.2rem",
            paddingTop: "0.35rem",
            borderTop: "1px solid var(--neutral-border)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.35rem",
              background: "var(--bg-secondary)",
              borderRadius: "6px",
              padding: "2px 6px",
              border: "1px solid var(--border-subtle)",
            }}
          >
            <button
              onClick={() => {
                sounds.playRemoveItem();
                onUpdateItemQuantity(
                  targetTableId,
                  item.id,
                  item.quantity - 1,
                );
              }}
              style={{
                background: "transparent",
                color: "var(--text-muted)",
                width: "22px",
                height: "22px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: "none",
                cursor: "pointer",
              }}
              title="Decrease quantity"
            >
              <Minus size={13} />
            </button>

            <span
              className="font-mono"
              style={{
                fontWeight: 800,
                fontSize: "0.86rem",
                minWidth: "20px",
                textAlign: "center",
                color: "var(--text-main)",
              }}
            >
              {item.quantity}
            </span>

            <button
              onClick={() => {
                sounds.playAddItem();
                onUpdateItemQuantity(
                  targetTableId,
                  item.id,
                  item.quantity + 1,
                );
              }}
              style={{
                background: "transparent",
                color: "var(--accent-amber-light)",
                width: "22px",
                height: "22px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: "none",
                cursor: "pointer",
              }}
              title="Increase quantity"
            >
              <Plus size={13} />
            </button>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.45rem",
            }}
          >
            <button
              onClick={() => {
                if (editingNoteItemId === item.id) {
                  if (!tempNote.trim() && item.notes) {
                    onUpdateItemNotes(targetTableId, item.id, "");
                  }
                  setEditingNoteItemId(null);
                  setTempNote("");
                } else {
                  setEditingNoteItemId(item.id);
                  setTempNote(item.notes || "");
                }
              }}
              style={{
                fontSize: "0.72rem",
                color: item.notes
                  ? "var(--accent-amber-light)"
                  : "var(--text-dim)",
                background: "transparent",
                border: "none",
                display: "flex",
                alignItems: "center",
                gap: "0.25rem",
                textDecoration: "underline",
                cursor: "pointer",
              }}
            >
              <FileText size={12} />
              <span>
                {item.notes ? `"${item.notes}"` : "+ Note"}
              </span>
            </button>

            <button
              onClick={() => {
                sounds.playRemoveItem();
                onRemoveItemFromTable(targetTableId, item.id);
              }}
              style={{
                background: "rgba(239, 68, 68, 0.1)",
                color: "#ef4444",
                border: "1px solid rgba(239, 68, 68, 0.25)",
                borderRadius: "5px",
                padding: "3px 6px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
              }}
              title="Remove item"
            >
              <Trash2 size={13} />
            </button>
          </div>
        </div>

        {/* Inline Note Editor */}
        {editingNoteItemId === item.id && (
          <div
            style={{
              display: "flex",
              gap: "0.3rem",
              marginTop: "0.3rem",
            }}
          >
            <input
              type="text"
              placeholder="e.g. Extra spicy, less oil, no onion..."
              value={tempNote}
              onChange={(e) => setTempNote(e.target.value)}
              autoFocus
              style={{
                flex: 1,
                background: "var(--bg-primary)",
                border: "1px solid var(--accent-amber)",
                borderRadius: "5px",
                color: "var(--text-main)",
                padding: "0.26rem 0.5rem",
                fontSize: "0.74rem",
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSaveNote(item.id);
                if (e.key === "Escape") {
                  if (!tempNote.trim() && item.notes) {
                    onUpdateItemNotes(targetTableId, item.id, "");
                  }
                  setEditingNoteItemId(null);
                  setTempNote("");
                }
              }}
            />
            <button
              onClick={() => handleSaveNote(item.id)}
              style={{
                background: "var(--accent-amber)",
                color: "#000000",
                border: "none",
                padding: "0 0.55rem",
                borderRadius: "5px",
                fontSize: "0.72rem",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => {
                if (!tempNote.trim() && item.notes) {
                  onUpdateItemNotes(targetTableId, item.id, "");
                }
                setEditingNoteItemId(null);
                setTempNote("");
              }}
              style={{
                background: "var(--surface-tint)",
                color: "var(--text-dim)",
                border: "1px solid rgba(var(--surface-rgb),0.1)",
                padding: "0 0.4rem",
                borderRadius: "5px",
                fontSize: "0.72rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
              }}
              title="Cancel"
            >
              <X size={12} />
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      className="responsive-order-detail-layout"
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        maxHeight: "100%",
        minHeight: "0",
        flex: 1,
        overflow: "hidden",
      }}
    >
      <style>{`
        .responsive-order-detail-layout {
          height: 100% !important;
          max-height: 100% !important;
          min-height: 0 !important;
          flex: 1 !important;
        }

        .pos-menu-table-container {
          flex: 1;
          width: 100%;
          box-sizing: border-box;
          min-width: 0;
          min-height: 0;
          overflow-y: auto;
          overflow-x: auto;
          padding: 0.45rem;
          padding-bottom: 4rem;
          background: var(--bg-primary);
        }

        .pos-menu-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
          min-width: 500px;
          table-layout: auto;
          font-size: 0.8rem;
          background: var(--bg-secondary);
        }

        .pos-menu-table thead tr {
          background: var(--bg-tertiary);
          border-bottom: 1px solid var(--border-subtle);
          color: var(--text-muted);
          font-size: 0.76rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.03em;
        }

        .pos-menu-table th {
          padding: 0.45rem 0.6rem;
          white-space: nowrap;
        }

        .pos-menu-table td {
          padding: 0.45rem 0.6rem;
          border-bottom: 1px solid var(--border-subtle);
          vertical-align: middle;
        }

        .pos-menu-row {
          transition: background 150ms ease;
        }

        .pos-menu-row:hover {
          background: color-mix(in srgb, var(--accent-amber) 6%, transparent);
        }

        .pos-menu-row.has-qty {
          background: color-mix(in srgb, var(--accent-amber) 8%, transparent);
        }

        .pos-menu-row.is-unavailable {
          opacity: 0.55;
          cursor: not-allowed;
        }

        .pos-menu-row.is-unavailable:hover {
          background: transparent !important;
        }

        .pos-menu-grid {
          flex: 1;
          width: 100%;
          box-sizing: border-box;
          min-width: 0;
          min-height: 0;
          overflow-y: auto;
          padding: 0.5rem;
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(min(100%, 170px), 1fr));
          grid-auto-rows: min-content;
          gap: 0.55rem;
          align-content: start;
          background: var(--bg-primary);
        }

        .pos-menu-table-add {
          min-height: 32px !important;
          padding: 0.35rem 0.65rem !important;
          border-radius: 7px !important;
          font-size: 0.76rem !important;
        }

        .pos-table-menu-toolbar {
          flex-wrap: wrap !important;
          gap: 0.35rem !important;
          overflow: visible !important;
          padding: 0.35rem 0.65rem !important;
        }

        .pos-table-menu-toolbar button { min-height: 30px !important; padding: 0.25rem 0.45rem !important; font-size: 0.74rem !important; }
        .pos-table-menu-toolbar input,
        .pos-table-menu-toolbar select { height: 30px !important; font-size: 0.76rem !important; }
        .pos-menu-search-control {
          flex: 1 1 120px !important;
          min-width: 90px !important;
          max-width: 220px !important;
        }
        .pos-menu-category-filter { max-width: 130px; }
        .pos-menu-category-filter select { max-width: 130px; padding: 0.2rem 1.4rem 0.2rem 0.5rem !important; }
        .pos-menu-dietary-filters { flex-wrap: nowrap !important; gap: 0.2rem !important; }

        .pos-table-info-strip { padding: 0.4rem 0.9rem !important; gap: 0.5rem !important; }
        .pos-table-info-strip > div { gap: 0.5rem !important; }
        .pos-categories-sidebar { width: 155px !important; }
        .pos-categories-header { padding: 0.6rem !important; }
        .pos-categories-list { padding: 0.3rem !important; gap: 0.15rem; }
        .pos-category-btn { min-height: 34px; padding: 0.4rem 0.5rem !important; }

        @media (max-width: 1100px) {
          .pos-categories-sidebar { width: 145px !important; }
          .pos-menu-grid { grid-template-columns: repeat(auto-fill, minmax(min(100%, 155px), 1fr)); }
        }

        @media (max-width: 760px) {
          .pos-table-info-strip { padding: 0.4rem 0.55rem !important; }
          .pos-table-menu-toolbar { gap: 0.35rem !important; }
          .pos-categories-sidebar {
            width: 100% !important; height: auto !important; max-height: 52px !important;
            border-right: none !important; border-bottom: 1px solid var(--border-subtle) !important;
            flex-direction: row !important; overflow-x: auto !important; white-space: nowrap !important;
            padding: 0.35rem 0.5rem !important; display: flex !important; flex-shrink: 0 !important;
          }
          .pos-categories-header { display: none !important; }
          .pos-categories-list { flex-direction: row !important; gap: 0.35rem !important; padding: 0 !important; }
          .pos-category-btn { width: auto !important; min-height: 30px; padding: 0.35rem 0.7rem !important; border-radius: 20px !important; }
          .pos-menu-grid { grid-template-columns: repeat(auto-fill, minmax(min(100%, 145px), 1fr)); }
        }

        @keyframes cartPulse {
          0%, 100% { box-shadow: 0 8px 28px color-mix(in srgb, var(--accent-amber) 45%, transparent); }
          50% { box-shadow: 0 8px 36px color-mix(in srgb, var(--accent-amber) 75%, transparent), 0 0 0 6px color-mix(in srgb, var(--accent-amber) 12%, transparent); }
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
      <div
        className="pos-table-info-strip"
        style={{
          background: "var(--bg-secondary)",
          borderBottom: "1px solid var(--border-subtle)",
          padding: "0.45rem 1.25rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "0.85rem",
          flexShrink: 0,
        }}
      >
        {/* Left: Back & Table Identifiers */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.85rem" }}>
          <button
            onClick={onBackToTables}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
              padding: "0.45rem 0.8rem",
              background: "var(--bg-tertiary)",
              color: "var(--text-main)",
              borderRadius: "var(--radius-sm)",
              fontSize: "0.82rem",
              fontWeight: 600,
              border: "1px solid var(--border-subtle)",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.borderColor = "var(--accent-amber)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.borderColor = "var(--border-subtle)")
            }
          >
            <ArrowLeft size={16} />
            <span>All Tables</span>
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <div
              style={{
                background: "linear-gradient(135deg, var(--accent-amber), var(--accent-saffron))",
                color: "#ffffff",
                padding: "0.35rem 0.75rem",
                borderRadius: "var(--radius-sm)",
                fontWeight: 800,
                fontSize: "1rem",
                boxShadow: "0 2px 8px color-mix(in srgb, var(--accent-amber) 35%, transparent)",
              }}
            >
              {table.name}
            </div>
            <div>
              <div
                style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}
              >
                <span
                  style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}
                >
                  {table.section}
                </span>
                <span style={{ color: "var(--text-dim)" }}>•</span>
                <span
                  style={{
                    fontSize: "0.72rem",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    color: (safeItems.length > 0 && activeTable.status !== "vacant")
                      ? "var(--status-occupied)"
                      : "var(--status-vacant)",
                    background: (safeItems.length > 0 && activeTable.status !== "vacant")
                      ? "var(--status-occupied-bg)"
                      : "var(--status-vacant-bg)",
                    padding: "1px 6px",
                    borderRadius: "4px",
                  }}
                >
                  {(safeItems.length > 0 && activeTable.status !== "vacant") ? (activeTable.status || "occupied") : "vacant"}
                </span>
              </div>
            </div>
          </div>

          {/* Guest Count Stepper */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
              background: "var(--bg-tertiary)",
              padding: "0.25rem 0.5rem",
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--border-subtle)",
              fontSize: "0.78rem",
            }}
          >
            <Users size={13} color="var(--text-muted)" />
            <span style={{ color: "var(--text-muted)" }}>Guests:</span>
            <button
              type="button"
              onClick={() => {
                const currentG = activeGuests;
                if (onUpdateGuests) {
                  onUpdateGuests(activeTable.id, Math.max(0, currentG - 1));
                }
              }}
              style={{
                background: "var(--surface-tint)",
                color: "var(--text-main)",
                width: "20px",
                height: "20px",
                borderRadius: "4px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                border: "none",
              }}
            >
              -
            </button>
            <span
              style={{ fontWeight: 700, minWidth: "16px", textAlign: "center" }}
            >
              {activeGuests}
            </span>
            <button
              type="button"
              onClick={() => {
                const currentG = activeGuests;
                if (onUpdateGuests) {
                  onUpdateGuests(activeTable.id, currentG + 1);
                }
              }}
              style={{
                background: "var(--surface-tint)",
                color: "var(--text-main)",
                width: "20px",
                height: "20px",
                borderRadius: "4px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                border: "none",
              }}
            >
              +
            </button>
          </div>

          {/* Quick Vacate Table Button */}
          {(activeTable.status !== "vacant" || activeGuests > 0 || safeItems.length > 0) && (
            <button
              type="button"
              onClick={() => {
                if (onClearOrder) {
                  onClearOrder(activeTable.id);
                } else if (onUpdateGuests) {
                  onUpdateGuests(activeTable.id, 0);
                }
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.3rem",
                padding: "0.24rem 0.55rem",
                borderRadius: "var(--radius-sm)",
                background: "rgba(239, 68, 68, 0.12)",
                color: "#ef4444",
                border: "1px solid rgba(239, 68, 68, 0.3)",
                fontSize: "0.72rem",
                fontWeight: 700,
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
              title="Clear order and vacate table"
            >
              <LogOut size={12} />
              <span>Vacate</span>
            </button>
          )}

          {/* Live Table Dining Timer Widget */}
          {safeItems.length > 0 && table.orderTime &&
            (() => {
              const elapsedSec = parseTimeToSeconds(table.orderTime);
              const elapsedFormatted = formatElapsedTimer(elapsedSec);
              const urgency = getTimerUrgencyColor(elapsedSec);

              return (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.45rem",
                    background: urgency.bg,
                    border: `1px solid ${urgency.border}`,
                    padding: "0.28rem 0.65rem",
                    borderRadius: "var(--radius-sm)",
                    fontSize: "0.78rem",
                    fontWeight: 700,
                    color: urgency.text,
                  }}
                  title={`Table seated at ${table.orderTime}. Live dining elapsed duration: ${elapsedFormatted}`}
                >
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "3px",
                    }}
                  >
                    <Calendar size={13} color="var(--accent-amber)" />
                    <span>
                      {new Date().toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  </span>
                  <span style={{ opacity: 0.5 }}>•</span>
                  <Clock
                    size={13}
                    className="pulse-indicator"
                    color={urgency.dot}
                  />
                  <span>
                    Seated: <strong>{table.orderTime}</strong>
                  </span>
                  <span style={{ opacity: 0.5 }}>•</span>
                  <span style={{ fontFamily: "monospace", fontWeight: 800 }}>
                    ⏱️ {elapsedFormatted}
                  </span>
                </div>
              );
            })()}
        </div>

        {/* Right Table Actions */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginLeft: "auto" }}>
          {/* Quick Switch Table Dropdown */}
          <div
            style={{
              position: "relative",
              flexShrink: 0,
            }}
          >
            <button
              type="button"
              onClick={() => setIsTableDropdownOpen((prev) => !prev)}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.5rem",
                padding: "0.42rem 0.75rem",
                borderRadius: "8px",
                background: isTableDropdownOpen
                  ? "var(--accent-amber)"
                  : "var(--bg-tertiary)",
                color: isTableDropdownOpen ? "#000000" : "var(--text-main)",
                border: isTableDropdownOpen
                  ? "1px solid var(--accent-amber)"
                  : "1px solid var(--border-subtle)",
                fontSize: "0.78rem",
                fontWeight: 700,
                cursor: "pointer",
                boxShadow: isTableDropdownOpen
                  ? "0 4px 12px color-mix(in srgb, var(--accent-amber) 25%, transparent)"
                  : "none",
              }}
              title="Quickly switch to another table"
            >
              <ArrowRightLeft
                size={14}
                color={isTableDropdownOpen ? "#000000" : "var(--accent-amber)"}
              />
              <span>Switch Table</span>
              <ChevronDown
                size={14}
                style={{
                  transform: isTableDropdownOpen
                    ? "rotate(180deg)"
                    : "rotate(0deg)",
                  transition: "transform 160ms ease",
                }}
              />
            </button>

            {isTableDropdownOpen && (
              <div
                style={{
                  position: "absolute",
                  top: "calc(100% + 8px)",
                  right: 0,
                  width: "280px",
                  maxHeight: "380px",
                  display: "flex",
                  flexDirection: "column",
                  background: "var(--bg-secondary)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "10px",
                  boxShadow: "0 14px 32px rgba(0,0,0,0.35)",
                  zIndex: 100,
                  overflow: "hidden",
                }}
              >
                {/* Header */}
                <div
                  style={{
                    padding: "0.5rem 0.65rem 0.45rem",
                    borderBottom: "1px solid var(--border-subtle)",
                    flexShrink: 0,
                  }}
                >
                  <div
                    style={{
                      color: "var(--text-dim)",
                      fontSize: "0.68rem",
                      fontWeight: 800,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      marginBottom: "0.45rem",
                    }}
                  >
                    Filter by Status
                  </div>

                  {/* Status Filter Pills */}
                  <div
                    style={{ display: "flex", gap: "0.3rem", flexWrap: "wrap" }}
                  >
                    {[
                      {
                        id: "all",
                        label: "All",
                        count: allTables.length,
                        dot: null,
                      },
                      {
                        id: "vacant",
                        label: "Vacant",
                        count: allTables.filter((t) => t.status === "vacant")
                          .length,
                        dot: "var(--status-vacant)",
                      },
                      {
                        id: "occupied",
                        label: "Occupied",
                        count: allTables.filter((t) => t.status === "occupied")
                          .length,
                        dot: "var(--status-occupied)",
                      },
                      {
                        id: "billed",
                        label: "Billed",
                        count: allTables.filter((t) => t.status === "billed")
                          .length,
                        dot: "var(--status-billed)",
                      },
                    ].map((sf) => {
                      const isActive = tableStatusFilter === sf.id;
                      return (
                        <button
                          key={sf.id}
                          type="button"
                          onClick={() => setTableStatusFilter(sf.id)}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                            padding: "0.25rem 0.55rem",
                            borderRadius: "6px",
                            fontSize: "0.7rem",
                            fontWeight: isActive ? 800 : 600,
                            background: isActive
                              ? "color-mix(in srgb, var(--accent-amber) 20%, transparent)"
                              : "var(--bg-tertiary)",
                            color: isActive
                              ? "var(--accent-amber-light)"
                              : "var(--text-muted)",
                            border: isActive
                              ? "1px solid var(--accent-amber)"
                              : "1px solid var(--border-subtle)",
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
                <div style={{ overflowY: "auto", flex: 1, padding: "0.35rem" }}>
                  {allTables
                    .filter(
                      (t) =>
                        tableStatusFilter === "all" ||
                        t.status === tableStatusFilter,
                    )
                    .map((t) => {
                      const isCurrent = t.id === table.id;
                      let statusDot = "var(--status-vacant)";
                      if (t.status === "occupied")
                        statusDot = "var(--status-occupied)";
                      if (t.status === "billed")
                        statusDot = "var(--status-billed)";

                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => {
                            onSelectTable(t.id);
                            setIsTableDropdownOpen(false);
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
                              ? "color-mix(in srgb, var(--accent-amber) 14%, transparent)"
                              : "transparent",
                            color: "var(--text-main)",
                            border: isCurrent
                              ? "1px solid color-mix(in srgb, var(--accent-amber) 50%, transparent)"
                              : "1px solid transparent",
                            cursor: "pointer",
                            textAlign: "left",
                          }}
                          onMouseEnter={(e) => {
                            if (!isCurrent)
                              e.currentTarget.style.background =
                                "var(--bg-tertiary)";
                          }}
                          onMouseLeave={(e) => {
                            if (!isCurrent)
                              e.currentTarget.style.background = "transparent";
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
                            <span style={{ fontWeight: isCurrent ? 800 : 650 }}>
                              {t.name}
                            </span>
                          </span>
                          <span
                            style={{
                              fontSize: "0.66rem",
                              fontWeight: 800,
                              textTransform: "uppercase",
                              color:
                                t.status === "occupied"
                                  ? "var(--status-occupied)"
                                  : t.status === "billed"
                                    ? "var(--status-billed)"
                                    : "var(--text-dim)",
                            }}
                          >
                            {isCurrent ? "Current" : t.status}
                          </span>
                        </button>
                      );
                    })}

                  {/* Empty state when filter yields nothing */}
                  {allTables.filter(
                    (t) =>
                      tableStatusFilter === "all" ||
                      t.status === tableStatusFilter,
                  ).length === 0 && (
                    <div
                      style={{
                        textAlign: "center",
                        padding: "1rem",
                        color: "var(--text-dim)",
                        fontSize: "0.75rem",
                      }}
                    >
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
      <div
        className="pos-workspace-container"
        style={{
          display: "flex",
          flex: 1,
          minHeight: 0,
          overflow: "hidden",
          position: "relative",
        }}
      >
        {/* Left Sidebar: Menu Categories */}
        <div
          className="pos-categories-sidebar"
          style={{
            width: "155px",
            background: "var(--bg-primary)",
            borderRight: "1px solid var(--border-subtle)",
            display: "flex",
            flexDirection: "column",
            minHeight: 0,
            flexShrink: 0,
            overflowY: "auto",
          }}
        >
          <div
            className="pos-categories-header"
            style={{
              padding: "0.75rem 1rem",
              borderBottom: "1px solid var(--border-subtle)",
              flexShrink: 0,
            }}
          >
            <h4
              style={{
                fontSize: "0.85rem",
                fontWeight: 800,
                color: "var(--text-muted)",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                margin: 0,
              }}
            >
              Categories
            </h4>
          </div>
          <div
            className="pos-categories-list"
            style={{
              display: "flex",
              flexDirection: "column",
              padding: "0.5rem",
              paddingBottom: "3.5rem",
            }}
          >
            {[{ id: "all", name: orderMode === "bar" ? "All Drinks" : "All Items", icon: orderMode === "bar" ? "Coffee" : "Utensils" }, ...Array.from(new Map((activeMenuItems || []).filter((item) => item.category).map((item) => [item.category, { id: item.category, name: item.category, icon: orderMode === "bar" ? "Coffee" : "Utensils" }])).values())].map((category) => {
              const isSelected = selectedCategory === category.id;
              const IconComp = CATEGORY_ICONS[category.icon] || Utensils;

              return (
                <div key={category.id}>
                  <button
                    className="pos-category-btn"
                    onClick={() => setSelectedCategory(category.id)}
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "flex-start",
                      padding: "0.65rem 0.75rem",
                      borderRadius: "var(--radius-sm)",
                      background: isSelected
                        ? "color-mix(in srgb, var(--accent-amber) 10%, transparent)"
                        : "transparent",
                      color: isSelected
                        ? "var(--accent-amber-light)"
                        : "var(--text-main)",
                      border: isSelected
                        ? "1px solid color-mix(in srgb, var(--accent-amber) 30%, transparent)"
                        : "1px solid transparent",
                      cursor: "pointer",
                      marginBottom: "2px",
                      transition: "all 0.15s ease",
                      textAlign: "left",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                        width: "100%",
                        minWidth: 0,
                        textAlign: "left",
                      }}
                    >
                      <IconComp
                        size={16}
                        style={{ flexShrink: 0 }}
                        color={
                          isSelected ? "var(--accent-amber)" : "var(--text-dim)"
                        }
                      />
                      <TruncatedTooltip
                        className="pos-category-label"
                        label={category.name}
                        style={{
                          display: "block",
                          fontSize: "0.85rem",
                          fontWeight: isSelected ? 700 : 500,
                          flex: 1,
                          minWidth: 0,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          textAlign: "left",
                        }}
                      >
                        {category.name}
                      </TruncatedTooltip>
                    </div>
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Center: Interactive Restaurant Menu */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            minWidth: 0,
            minHeight: 0,
            height: "100%",
            overflow: "hidden",
            background: "var(--bg-primary)",
          }}
        >
          {/* Menu Search Bar */}
          <div
            className="menu-catalog-controls pos-table-menu-toolbar"
            style={{
              padding: "0.45rem 0.65rem",
              borderBottom: "1px solid var(--border-subtle)",
              display: "flex",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "0.45rem",
              background: "var(--bg-secondary)",
              flexShrink: 0,
            }}
          >
            <div
              role="group"
              aria-label="Choose order station"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.35rem",
                flexShrink: 0,
              }}
            >
              {[
                { id: "kitchen", label: "Food", icon: ChefHat },
                { id: "bar", label: "Bar", icon: Coffee },
              ].map(({ id, label, icon: Icon }) => {
                const isActive = orderMode === id;
                return (
                  <button
                    key={id}
                    type="button"
                    aria-pressed={isActive}
                    onClick={() => {
                      setOrderMode(id);
                      setSelectedCategory("all");
                      setDietaryFilter("all");
                      setSearchQuery("");
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "0.35rem",
                      minHeight: "30px",
                      padding: "0.25rem 0.55rem",
                      borderRadius: "var(--radius-md)",
                      border: `1px solid ${isActive ? "var(--accent-amber)" : "var(--border-subtle)"}`,
                      background: isActive ? "color-mix(in srgb, var(--accent-amber) 16%, transparent)" : "var(--bg-primary)",
                      color: isActive ? "var(--accent-amber-light)" : "var(--text-muted)",
                      fontSize: "0.76rem",
                      fontWeight: isActive ? 800 : 650,
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                    }}
                  >
                    <Icon size={13} />
                    {label}
                  </button>
                );
              })}
            </div>

            {/* Search Input */}
            <div
              className="pos-menu-search-control"
              style={{
                position: "relative",
                flex: "1 1 140px",
                minWidth: "100px",
                maxWidth: "240px",
              }}
            >
              <Search
                size={14}
                color="var(--text-dim)"
                style={{ position: "absolute", left: "9px", top: "8px" }}
              />
              <input
                type="text"
                placeholder={orderMode === "bar" ? "Search..." : "Search menu..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: "100%",
                  height: "30px",
                  boxSizing: "border-box",
                  background: "var(--bg-primary)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "var(--radius-md)",
                  color: "var(--text-main)",
                  padding: "0.25rem 0.6rem 0.25rem 1.8rem",
                  fontSize: "0.78rem",
                }}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  style={{
                    position: "absolute",
                    right: "7px",
                    top: "7px",
                    background: "transparent",
                    color: "var(--text-muted)",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  <X size={13} />
                </button>
              )}
            </div>

            <div
              role="group"
              aria-label="Filter dishes"
              className="pos-menu-dietary-filters"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.25rem",
                flexShrink: 0,
              }}
            >
              {[
                { id: "veg", label: "Veg", icon: Circle, color: "#16a34a" },
                {
                  id: "non-veg",
                  label: "Non-Veg",
                  icon: Circle,
                  color: "#dc2626",
                },
                {
                  id: "special",
                  label: "Specials",
                  icon: Star,
                  color: "var(--accent-amber)",
                },
              ].map((filter) => {
                const isActive = dietaryFilter === filter.id;
                const FilterIcon = filter.icon;
                return (
                  <button
                    key={filter.id}
                    type="button"
                    aria-pressed={isActive}
                    onClick={() =>
                      setDietaryFilter(isActive ? "all" : filter.id)
                    }
                    style={{
                      padding: "0.28rem 0.5rem",
                      borderRadius: "var(--radius-sm)",
                      background: isActive
                        ? "var(--accent-amber)"
                        : "var(--bg-primary)",
                      color: isActive ? "#000000" : "var(--text-muted)",
                      border: `1px solid ${isActive ? "var(--accent-amber)" : "var(--border-subtle)"}`,
                      fontSize: "0.74rem",
                      fontWeight: isActive ? 700 : 500,
                      whiteSpace: "nowrap",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.25rem",
                    }}
                  >
                    <FilterIcon
                      size={12}
                      color={filter.color}
                      fill={filter.color}
                      aria-hidden="true"
                    />
                    {filter.label}
                  </button>
                );
              })}
            </div>

            {/* Quick Sort Order */}
            <div
              style={{
                position: "relative",
                display: "inline-flex",
                alignItems: "center",
                flexShrink: 0,
              }}
            >
              <select
                value={menuSortOrder}
                onChange={(e) => setMenuSortOrder(e.target.value)}
                aria-label="Sort dishes"
                title="Sort menu dishes"
                style={{
                  height: "30px",
                  background: "var(--bg-primary)",
                  border: `1px solid ${menuSortOrder !== "default" ? "var(--accent-amber)" : "var(--border-subtle)"}`,
                  borderRadius: "var(--radius-sm)",
                  color: menuSortOrder !== "default" ? "var(--accent-amber-light)" : "var(--text-muted)",
                  padding: "0.2rem 1.3rem 0.2rem 0.55rem",
                  fontSize: "0.74rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  outline: "none",
                }}
              >
                <option value="default">Default Sort</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
                <option value="name-asc">Name: A to Z</option>
              </select>
            </div>

            {/* Dish Count Badge */}
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.35rem",
                padding: "0 0.55rem",
                height: "30px",
                borderRadius: "var(--radius-sm)",
                background: "var(--bg-primary)",
                border: "1px solid var(--border-subtle)",
                fontSize: "0.74rem",
                fontWeight: 600,
                color: "var(--text-muted)",
                whiteSpace: "nowrap",
                flexShrink: 0,
              }}
              title="Number of dishes available"
            >
              <span
                style={{
                  color: "var(--accent-amber-light)",
                  fontWeight: 700,
                }}
              >
                {filteredMenuItems.length}
              </span>
              <span>{filteredMenuItems.length === 1 ? "dish" : "dishes"}</span>
            </div>

            {/* Clear / Reset Filters Button */}
            {(Boolean(searchQuery) || selectedCategory !== "all" || dietaryFilter !== "all" || menuSortOrder !== "default") && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedCategory("all");
                  setDietaryFilter("all");
                  setMenuSortOrder("default");
                }}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.3rem",
                  height: "30px",
                  padding: "0 0.55rem",
                  borderRadius: "var(--radius-sm)",
                  background: "rgba(239, 68, 68, 0.12)",
                  border: "1px solid rgba(239, 68, 68, 0.35)",
                  color: "#f87171",
                  fontSize: "0.73rem",
                  fontWeight: 650,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                  transition: "all 0.15s ease",
                }}
                title="Reset search and filters to show all dishes"
              >
                <RotateCcw size={12} />
                <span>Reset</span>
              </button>
            )}

            {/* View Mode Switcher: Rows (default) vs Cards */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                background: "var(--bg-primary)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "var(--radius-sm)",
                padding: "2px",
                marginLeft: "auto",
                gap: "2px",
                flexShrink: 0,
              }}
              role="group"
              aria-label="Menu view mode"
            >
              <button
                type="button"
                title="Rows View (Row-wise List)"
                onClick={() => handleSetMenuViewMode("rows")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  padding: "4px 8px",
                  borderRadius: "4px",
                  border: "none",
                  background: menuViewMode === "rows" ? "var(--accent-amber)" : "transparent",
                  color: menuViewMode === "rows" ? "#000000" : "var(--text-muted)",
                  fontSize: "0.74rem",
                  fontWeight: menuViewMode === "rows" ? 700 : 500,
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                <List size={14} />
                <span>Rows</span>
              </button>
              <button
                type="button"
                title="Cards View (Grid)"
                onClick={() => handleSetMenuViewMode("grid")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  padding: "4px 8px",
                  borderRadius: "4px",
                  border: "none",
                  background: menuViewMode === "grid" ? "var(--accent-amber)" : "transparent",
                  color: menuViewMode === "grid" ? "#000000" : "var(--text-muted)",
                  fontSize: "0.74rem",
                  fontWeight: menuViewMode === "grid" ? 700 : 500,
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                <LayoutGrid size={14} />
                <span>Cards</span>
              </button>
            </div>
          </div>

          {/* Menu Items Display: Rows Mode (Row-wise table matching Image 2) or Grid Mode (Cards) */}
          {menuViewMode === "rows" ? (
            <div className="pos-menu-table-container">
              {activeMenuLoading ? (
                <div style={{ borderRadius: "10px", border: "1px solid var(--border-card)", overflow: "hidden", background: "var(--bg-secondary)" }}>
                  <table className="pos-menu-table">
                    <thead>
                      <tr>
                        <th style={{ width: "36%" }}>Dish Name</th>
                        <th style={{ width: "16%" }}>Category</th>
                        <th style={{ width: "14%" }}>Dietary</th>
                        <th style={{ width: "16%" }}>Price (₹)</th>
                        <th style={{ width: "18%", textAlign: "right" }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Array.from({ length: 6 }, (_, index) => (
                        <tr key={index}>
                          <td>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.55rem" }}>
                              <SkeletonAvatar size={40} />
                              <div style={{ flex: 1 }}>
                                <SkeletonText width="50%" height="0.95rem" />
                                <div style={{ marginTop: "4px" }}><SkeletonText width="80%" height="0.72rem" /></div>
                              </div>
                            </div>
                          </td>
                          <td><SkeletonText width="60%" /></td>
                          <td><SkeletonText width="55px" height="20px" /></td>
                          <td><SkeletonText width="65px" height="1rem" /></td>
                          <td style={{ textAlign: "right" }}><SkeletonButton width={70} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : filteredMenuItems.length === 0 ? (
                <div
                  style={{
                    textAlign: "center",
                    padding: "4rem 1rem",
                    color: "var(--text-dim)",
                  }}
                >
                  <Flame
                    size={42}
                    color="var(--accent-amber)"
                    style={{ margin: "0 auto 0.75rem auto" }}
                  />
                  <h4
                    style={{
                      color: "var(--text-main)",
                      fontSize: "1.1rem",
                      fontWeight: 700,
                    }}
                  >
                    {emptyStateContent.title}
                  </h4>
                  <button
                    className="primary-action-button"
                    onClick={() => {
                      setSearchQuery("");
                      setSelectedCategory("all");
                      setDietaryFilter("all");
                    }}
                    style={{
                      marginTop: "1rem",
                      padding: "0.5rem 1rem",
                      background: "var(--accent-amber)",
                      color: "#000000",
                      borderRadius: "var(--radius-sm)",
                      fontWeight: 700,
                      fontSize: "0.82rem",
                    }}
                  >
                    {orderMode === "bar" ? "Show All Drinks" : "Show All Dishes"}
                  </button>
                </div>
              ) : (
                <div style={{ borderRadius: "10px", border: "1px solid var(--border-card)", overflow: "hidden", background: "var(--bg-secondary)" }}>
                  <table className="pos-menu-table">
                    <thead>
                      <tr>
                        <th style={{ width: "36%" }}>Dish Name</th>
                        <th style={{ width: "16%" }}>Category</th>
                        <th style={{ width: "14%" }}>Dietary</th>
                        <th style={{ width: "16%" }}>Price (₹)</th>
                        <th style={{ width: "18%", textAlign: "right" }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredMenuItems.map((item) => {
                        const isAvailable = item.isAvailable !== false;
                        const currentQty = getItemQuantityInCart(item);
                        const isVeg = item.dietaryType?.toUpperCase() === "VEG" || item.isVeg;

                        return (
                          <tr
                            key={item.id}
                            className={`pos-menu-row ${currentQty > 0 ? "has-qty" : ""} ${!isAvailable ? "is-unavailable" : ""}`}
                            onClick={() => {
                              if (!isAvailable) return;
                              handleOpenItemModal(item);
                            }}
                            style={{
                              cursor: isAvailable ? "pointer" : "not-allowed",
                              opacity: isAvailable ? 1 : 0.6,
                              background: currentQty > 0 ? "color-mix(in srgb, var(--accent-amber) 6%, transparent)" : undefined,
                            }}
                          >
                            {/* Dish Name */}
                            <td>
                              <div style={{ display: "flex", alignItems: "center", gap: "0.55rem" }}>
                                <div
                                  style={{
                                    position: "relative",
                                    width: "40px",
                                    height: "40px",
                                    minWidth: "40px",
                                    borderRadius: "8px",
                                    overflow: "hidden",
                                    background: "var(--bg-tertiary)",
                                    border: "1px solid var(--border-subtle)",
                                    flexShrink: 0,
                                  }}
                                >
                                  {orderMode === "bar" ? (
                                    <MenuItemVisual
                                      item={item}
                                      style={{
                                        width: "100%",
                                        height: "100%",
                                        objectFit: "cover",
                                        filter: isAvailable ? "none" : "grayscale(35%)",
                                      }}
                                    />
                                  ) : (
                                    <img
                                      src={getMenuItemImage(item)}
                                      alt={item.name}
                                      loading="lazy"
                                      onError={(e) => handleDishImageError(e, item)}
                                      style={{
                                        width: "100%",
                                        height: "100%",
                                        objectFit: "cover",
                                        filter: isAvailable ? "none" : "grayscale(35%)",
                                      }}
                                    />
                                  )}
                                </div>

                                <div style={{ minWidth: 0, flex: 1 }}>
                                  <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", flexWrap: "wrap" }}>
                                    <span
                                      style={{
                                        fontWeight: 700,
                                        fontSize: "0.88rem",
                                        color: isAvailable ? "var(--text-main)" : "var(--text-dim)",
                                      }}
                                    >
                                      {item.name}
                                    </span>
                                    {Boolean(item.isChefSpecial || item.isChefsSpecial) && (
                                      <Star size={13} fill="var(--accent-amber)" color="var(--accent-amber)" title="Chef's Special" />
                                    )}
                                    {item.prepTime && (
                                      <span
                                        style={{
                                          display: "inline-flex",
                                          alignItems: "center",
                                          gap: "2px",
                                          fontSize: "0.68rem",
                                          color: "var(--text-muted)",
                                          background: "var(--bg-tertiary)",
                                          padding: "1px 5px",
                                          borderRadius: "4px",
                                        }}
                                      >
                                        <Clock size={10} />
                                        {item.prepTime}
                                      </span>
                                    )}
                                  </div>
                                  {item.description && (
                                    <div
                                      style={{
                                        fontSize: "0.74rem",
                                        color: "var(--text-muted)",
                                        marginTop: "2px",
                                        lineHeight: 1.35,
                                        display: "-webkit-box",
                                        WebkitLineClamp: 2,
                                        WebkitBoxOrient: "vertical",
                                        overflow: "hidden",
                                        textOverflow: "ellipsis",
                                      }}
                                    >
                                      • {item.description}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>

                            {/* Category */}
                            <td
                              style={{
                                color: "var(--text-main)",
                                fontWeight: 600,
                                fontSize: "0.82rem",
                              }}
                            >
                              {item.category || "-"}
                            </td>

                            {/* Dietary */}
                            <td>
                              <span
                                style={{
                                  display: "inline-block",
                                  padding: "2px 8px",
                                  borderRadius: "6px",
                                  fontSize: "0.7rem",
                                  fontWeight: 800,
                                  letterSpacing: "0.03em",
                                  background: isVeg
                                    ? "rgba(16, 185, 129, 0.1)"
                                    : "rgba(239, 68, 68, 0.1)",
                                  color: isVeg ? "#10b981" : "#ef4444",
                                  border: `1px solid ${isVeg ? "rgba(16, 185, 129, 0.3)" : "rgba(239, 68, 68, 0.3)"}`,
                                }}
                              >
                                {isVeg ? "VEG" : "NON-VEG"}
                              </span>
                            </td>

                            {/* Price */}
                            <td
                              style={{
                                fontWeight: 800,
                                fontSize: "0.92rem",
                                color: isAvailable ? "var(--accent-amber)" : "var(--text-dim)",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {formatCurrency(item.price)}
                            </td>

                            {/* Actions */}
                            <td style={{ textAlign: "right", whiteSpace: "nowrap" }} onClick={(e) => e.stopPropagation()}>
                              {!isAvailable ? (
                                <span
                                  style={{
                                    fontSize: "0.72rem",
                                    fontWeight: 700,
                                    color: "var(--danger)",
                                    background: "rgba(239, 68, 68, 0.12)",
                                    border: "1px solid rgba(239, 68, 68, 0.35)",
                                    borderRadius: "6px",
                                    padding: "4px 9px",
                                    cursor: "not-allowed",
                                  }}
                                  title="This item is currently unavailable"
                                >
                                  Unavailable
                                </span>
                              ) : currentQty === 0 ? (
                                <button
                                  type="button"
                                  className="pos-menu-table-add"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleAddItem(item);
                                  }}
                                  style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "0.25rem",
                                    background: "linear-gradient(135deg, var(--accent-amber), var(--accent-saffron))",
                                    color: "#ffffff",
                                    border: "none",
                                    borderRadius: "6px",
                                    padding: "0.35rem 0.85rem",
                                    fontSize: "0.78rem",
                                    fontWeight: 700,
                                    cursor: "pointer",
                                    boxShadow: "0 2px 6px color-mix(in srgb, var(--accent-amber) 30%, transparent)",
                                    transition: "transform 0.12s ease",
                                  }}
                                  onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.04)")}
                                  onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
                                  title="Add to table"
                                >
                                  <Plus size={13} strokeWidth={2.5} />
                                  <span>Add</span>
                                </button>
                              ) : (
                                <div
                                  className="pos-menu-qty"
                                  onClick={(e) => e.stopPropagation()}
                                  style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "0.25rem",
                                    background: "var(--bg-tertiary)",
                                    border: "1px solid var(--accent-amber)",
                                    borderRadius: "6px",
                                    padding: "2px",
                                  }}
                                >
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      sounds.playRemoveItem();
                                      onUpdateItemQuantity(table.id, item.id, currentQty - 1);
                                    }}
                                    style={{
                                      background: "var(--surface-tint)",
                                      color: "var(--text-main)",
                                      border: "none",
                                      borderRadius: "4px",
                                      width: "24px",
                                      height: "24px",
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      cursor: "pointer",
                                    }}
                                    title="Decrease"
                                  >
                                    <Minus size={12} />
                                  </button>
                                  <span
                                    className="font-mono"
                                    style={{
                                      fontSize: "0.82rem",
                                      fontWeight: 800,
                                      color: "var(--accent-amber)",
                                      minWidth: "20px",
                                      textAlign: "center",
                                    }}
                                  >
                                    {currentQty}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const key = String(item.id || item.menuItemId || item.name);
                                      const now = Date.now();
                                      if (lastAddTimestampRef.current[key] && now - lastAddTimestampRef.current[key] < 400) {
                                        return;
                                      }
                                      sounds.playAddItem();
                                      onUpdateItemQuantity(table.id, item.id, currentQty + 1);
                                    }}
                                    style={{
                                      background: "var(--accent-amber)",
                                      color: "#000000",
                                      border: "none",
                                      borderRadius: "4px",
                                      width: "24px",
                                      height: "24px",
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      cursor: "pointer",
                                    }}
                                    title="Increase"
                                  >
                                    <Plus size={12} strokeWidth={2.5} />
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : (
            /* Menu Items Grid - 4 dishes per row (Card View) */
            <div className="pos-menu-grid">
              {activeMenuLoading ? (
                Array.from({ length: 8 }, (_, index) => <SkeletonMenuCard key={index} />)
              ) : filteredMenuItems.length === 0 ? (
                <div
                  style={{
                    gridColumn: "1 / -1",
                    textAlign: "center",
                    padding: "4rem 1rem",
                    color: "var(--text-dim)",
                  }}
                >
                  <Flame
                    size={42}
                    color="var(--accent-amber)"
                    style={{ margin: "0 auto 0.75rem auto" }}
                  />
                  <h4
                    style={{
                      color: "var(--text-main)",
                      fontSize: "1.1rem",
                      fontWeight: 700,
                    }}
                  >
                    {emptyStateContent.title}
                  </h4>
                  <button
                    className="primary-action-button"
                    onClick={() => {
                      setSearchQuery("");
                      setSelectedCategory("all");
                      setDietaryFilter("all");
                    }}
                    style={{
                      marginTop: "1rem",
                      padding: "0.5rem 1rem",
                      background: "var(--accent-amber)",
                      color: "#000000",
                      borderRadius: "var(--radius-sm)",
                      fontWeight: 700,
                      fontSize: "0.82rem",
                    }}
                  >
                    {orderMode === "bar" ? "Show All Drinks" : "Show All Dishes"}
                  </button>
                </div>
              ) : (
                filteredMenuItems.map((item) => {
                  const currentQty = getItemQuantityInCart(item);
                  return (
                    <MenuItemCard
                      key={item.id}
                      item={item}
                      quantity={currentQty}
                      orderMode={orderMode}
                      onOpen={handleOpenItemModal}
                      onAdd={handleAddItem}
                      onQuantityChange={(menuItem, nextQuantity) => {
                        if (nextQuantity < currentQty) sounds.playRemoveItem();
                        else sounds.playAddItem();
                        onUpdateItemQuantity(table.id, menuItem.id, nextQuantity);
                      }}
                    />
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* Right Side: Order Slip (Spacious 2-stage sidebar, shown when items exist) */}
        {safeItems.length > 0 && (
          <div
            className="pos-order-slip-desktop"
            style={{
              width: "365px",
              minWidth: "350px",
              maxWidth: "400px",
              background: "var(--bg-secondary)",
              display: "flex",
              flexDirection: "column",
              height: "100%",
              maxHeight: "100%",
              minHeight: 0,
              borderLeft: "1px solid var(--border-subtle)",
              boxShadow: "-4px 0 16px rgba(0, 0, 0, 0.25)",
              overflow: "hidden",
              flexShrink: 0,
            }}
          >
            {/* Order Header */}
            <div
              style={{
                padding: "0.55rem 0.85rem",
                borderBottom: "1px solid var(--border-subtle)",
                background: "var(--bg-tertiary)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexShrink: 0,
              }}
            >
              <div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.4rem",
                  }}
                >
                  <Receipt size={14} color="var(--accent-amber)" />
                  <h3
                    style={{
                    fontSize: "0.88rem",
                    fontWeight: 800,
                    color: "var(--text-main)",
                  }}
                  >
                    {table.name} — Order Slip
                  </h3>
                </div>
                <div
                  style={{
                    fontSize: "0.68rem",
                    color: "var(--text-muted)",
                    marginTop: "2px",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.3rem",
                    flexWrap: "wrap",
                  }}
                >
                  <span>{safeItems.length} items</span>
                  {unsentItems.length > 0 && (
                    <span style={{ color: "var(--accent-amber-light)", fontWeight: 700 }}>
                      ({unsentItems.length} to send)
                    </span>
                  )}
                  <span>•</span>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "2px",
                    }}
                  >
                    <Clock size={10} color="var(--accent-amber)" />
                    {table.orderTime ||
                      new Date().toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                  </span>
                </div>
              </div>
              <div
                style={{
                  background: "rgba(245, 158, 11, 0.18)",
                  color: "var(--accent-amber-light)",
                  padding: "0.18rem 0.5rem",
                  borderRadius: "5px",
                  fontSize: "0.68rem",
                  fontWeight: 700,
                  whiteSpace: "nowrap",
                }}
              >
                #{targetTableId}0{safeItems.length}
              </div>
            </div>

            {/* Quick Customer Capture (Collapsible to save vertical height) */}
            <div
              style={{
                padding: "0.35rem 0.65rem",
                background: "rgba(255, 255, 255, 0.02)",
                borderBottom: "1px solid var(--border-subtle)",
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  cursor: "pointer",
                  userSelect: "none",
                }}
                onClick={() => setIsCustomerDetailsOpen((prev) => !prev)}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "5px", minWidth: 0 }}>
                  <User size={12} color="var(--accent-amber)" />
                  <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--text-main)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {custName || custPhone ? `${custName || "Customer"} (${custPhone || "No Phone"})` : "Customer Details"}
                  </span>
                  {custTier && (
                    <span style={{
                      fontSize: "0.58rem",
                      fontWeight: 800,
                      padding: "1px 5px",
                      borderRadius: "4px",
                      background: custTier === "VIP" ? "rgba(168, 85, 247, 0.2)" : "rgba(34, 197, 94, 0.2)",
                      color: custTier === "VIP" ? "#c084fc" : "#4ade80",
                      whiteSpace: "nowrap",
                    }}>
                      {custTier}
                    </span>
                  )}
                </div>
                <span style={{ fontSize: "0.66rem", color: "var(--accent-amber-light)", fontWeight: 700, flexShrink: 0 }}>
                  {isCustomerDetailsOpen ? "▲ Hide" : custName || custPhone ? "✎ Edit" : "▼ + Add"}
                </span>
              </div>
              {isCustomerDetailsOpen && (
                <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1.3fr", gap: "0.35rem", marginTop: "0.35rem" }}>
                  <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                    <Phone size={11} style={{ position: "absolute", left: "6px", color: "var(--text-muted)", pointerEvents: "none" }} />
                    <input
                      type="tel"
                      placeholder="Phone No."
                      value={custPhone}
                      onChange={(e) => handleCustomerPhoneChange(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "4px 4px 4px 22px",
                        fontSize: "0.72rem",
                        background: "var(--bg-primary)",
                        border: "1px solid var(--border-subtle)",
                        borderRadius: "5px",
                        color: "var(--text-main)",
                        outline: "none",
                      }}
                    />
                  </div>
                  <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                    <User size={11} style={{ position: "absolute", left: "6px", color: "var(--text-muted)", pointerEvents: "none" }} />
                    <input
                      type="text"
                      placeholder="Customer Name"
                      value={custName}
                      onChange={(e) => handleCustomerNameChange(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "4px 4px 4px 22px",
                        fontSize: "0.72rem",
                        background: "var(--bg-primary)",
                        border: "1px solid var(--border-subtle)",
                        borderRadius: "5px",
                        color: "var(--text-main)",
                        outline: "none",
                      }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Ordered Items List (Stage 1: Current Selection vs Stage 2: Kitchen Confirmed) */}
            <div
              style={{
                flex: "1 1 0%",
                minHeight: 0,
                maxHeight: "none",
                overflowY: "auto",
                overflowX: "hidden",
                padding: "0.45rem 0.65rem",
                display: "flex",
                flexDirection: "column",
                gap: "0.45rem",
              }}
            >
              {/* STAGE 1: Current Selection (Newly added items waiting to be sent to kitchen) */}
              {unsentItems.length > 0 && (
                <div style={{ marginBottom: "0.35rem" }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "0.35rem 0.6rem",
                      background: "rgba(245, 158, 11, 0.12)",
                      borderRadius: "6px",
                      border: "1px solid rgba(245, 158, 11, 0.35)",
                      marginBottom: "0.35rem",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                      <span style={{ fontSize: "0.8rem" }}>🟡</span>
                      <span style={{ fontSize: "0.74rem", fontWeight: 800, color: "var(--accent-amber-light)" }}>
                        Current Selection ({unsentItems.reduce((acc, i) => acc + (i.quantity || 1), 0)} to send)
                      </span>
                    </div>
                    <span
                      style={{
                        fontSize: "0.6rem",
                        fontWeight: 800,
                        background: "var(--accent-amber)",
                        color: "#000000",
                        padding: "1px 6px",
                        borderRadius: "4px",
                        textTransform: "uppercase",
                      }}
                    >
                      Unsent
                    </span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                    {unsentItems.map((item, idx) => renderItemCard(item, idx, true))}
                  </div>

                  {/* Direct Quick Action to send current selection */}
                  <button
                    type="button"
                    onClick={handleTriggerSendKot}
                    disabled={isSendingKot}
                    style={{
                      marginTop: "0.45rem",
                      background: "linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)",
                      color: "#ffffff",
                      border: "none",
                      borderRadius: "8px",
                      padding: "0.52rem 0.85rem",
                      fontSize: "0.82rem",
                      fontWeight: 800,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "0.45rem",
                      width: "100%",
                      boxShadow: "0 4px 14px rgba(234, 88, 12, 0.35)",
                    }}
                  >
                    <ChefHat size={14} color="#ffffff" />
                    <span>{isSendingKot ? "Sending..." : `${dispatchButtonLabel} (${unsentItems.length} new items)`}</span>
                  </button>
                </div>
              )}

              {/* STAGE 2: Kitchen Confirmed Order (Already sent to kitchen, cooking / ready) */}
              {sentItems.length > 0 && (
                <div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "0.35rem 0.6rem",
                      background: "rgba(16, 185, 129, 0.08)",
                      borderRadius: "6px",
                      border: "1px solid rgba(16, 185, 129, 0.25)",
                      marginBottom: "0.35rem",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                      <span style={{ fontSize: "0.8rem" }}>🟢</span>
                      <span style={{ fontSize: "0.74rem", fontWeight: 800, color: "#10b981" }}>
                        Kitchen Confirmed Order ({sentItems.reduce((acc, i) => acc + (i.quantity || 1), 0)} items)
                      </span>
                    </div>
                    <span
                      style={{
                        fontSize: "0.6rem",
                        fontWeight: 700,
                        color: "var(--text-muted)",
                      }}
                    >
                      Active in Kitchen
                    </span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                    {sentItems.map((item, idx) => renderItemCard(item, idx, false))}
                  </div>
                </div>
              )}

              {safeItems.length === 0 && (
                <div
                  style={{
                    textAlign: "center",
                    padding: "3rem 1rem",
                    color: "var(--text-dim)",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "0.75rem",
                  }}
                >
                  <Utensils size={36} color="var(--text-dim)" />
                  <p
                    style={{
                      fontSize: "0.9rem",
                      fontWeight: 600,
                      color: "var(--text-muted)",
                    }}
                  >
                    No dishes added yet to {table.name}
                  </p>
                  <p style={{ fontSize: "0.78rem", maxWidth: "240px" }}>
                    Tap any item from the menu on the left to add items to this table.
                  </p>
                </div>
              )}
            </div>

            {/* Financial Breakdown — Compact */}
            <div
              style={{
                background: "var(--bg-primary)",
                padding: "0.35rem 0.65rem",
                borderTop: "1px solid var(--border-subtle)",
                display: "flex",
                flexDirection: "column",
                gap: "0.2rem",
                flexShrink: 0,
              }}
            >
              {/* Subtotal row */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "0.76rem",
                  color: "var(--text-muted)",
                }}
              >
                <span>Subtotal</span>
                <span className="font-mono">{formatCurrency(subtotal)}</span>
              </div>

              {/* Discount selector in INR (₹) */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  fontSize: "0.74rem",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.25rem",
                    color: "var(--text-muted)",
                    fontWeight: 600,
                  }}
                >
                  <span style={{ color: "var(--accent-amber-light)", fontWeight: 800 }}>₹</span>
                  <span>Discount (INR)</span>
                </div>
                <div style={{ display: "flex", gap: "0.2rem", alignItems: "center" }}>
                  {[0, 50, 100, 200].map((inr) => (
                    <button
                      key={inr}
                      type="button"
                      onClick={() => onUpdateDiscount(targetTableId, inr, true)}
                      style={{
                        background:
                          currentDiscountAmount === inr
                            ? "var(--accent-amber)"
                            : "var(--bg-tertiary)",
                        color:
                          currentDiscountAmount === inr
                            ? "#000000"
                            : "var(--text-muted)",
                        padding: "1px 5px",
                        borderRadius: "3px",
                        fontSize: "0.64rem",
                        fontWeight: 700,
                        border: "1px solid var(--border-subtle)",
                        cursor: "pointer",
                      }}
                    >
                      {inr === 0 ? "₹0" : `₹${inr}`}
                    </button>
                  ))}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      background: "var(--bg-tertiary)",
                      border: "1px solid var(--border-subtle)",
                      borderRadius: "3px",
                      padding: "0 4px",
                      height: "22px",
                    }}
                  >
                    <span style={{ fontSize: "0.64rem", color: "var(--accent-amber)", fontWeight: 800, marginRight: "2px" }}>₹</span>
                    <input
                      type="number"
                      min="0"
                      max={subtotal}
                      step="1"
                      aria-label="Manual discount in INR"
                      title="Enter manual discount amount in Rupees"
                      placeholder="Amount"
                      value={currentDiscountAmount > 0 ? currentDiscountAmount : ""}
                      onChange={(event) => {
                        const value = event.target.value;
                        if (value === "") {
                          onUpdateDiscount(targetTableId, 0, true);
                          return;
                        }
                        const val = Number(value);
                        if (Number.isFinite(val)) {
                          onUpdateDiscount(targetTableId, Math.max(0, Math.min(subtotal, val)), true);
                        }
                      }}
                      style={{
                        width: "50px",
                        height: "100%",
                        boxSizing: "border-box",
                        border: "none",
                        background: "transparent",
                        color: "var(--text-main)",
                        fontSize: "0.68rem",
                        fontWeight: 700,
                        outline: "none",
                        fontFamily: "monospace",
                      }}
                    />
                  </div>
                </div>
              </div>

              {currentDiscountAmount > 0 && (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: "0.72rem",
                    color: "var(--success)",
                  }}
                >
                  <span>Discount (INR)</span>
                  <span className="font-mono">
                    -{formatCurrency(currentDiscountAmount)}
                  </span>
                </div>
              )}

              {/* GST + Service in one compact row */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "0.72rem",
                  color: "var(--text-muted)",
                }}
              >
                <span>GST (5%)</span>
                <span className="font-mono">{formatCurrency(taxAmount)}</span>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  fontSize: "0.72rem",
                  color: "var(--text-muted)",
                }}
              >
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.3rem",
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={currentServiceCharge > 0}
                    onChange={(e) =>
                      onToggleServiceCharge(targetTableId, e.target.checked ? 5 : 0)
                    }
                    style={{
                      accentColor: "var(--accent-amber)",
                      width: "12px",
                      height: "12px",
                    }}
                  />
                  <span>Service Charge (5%)</span>
                </label>
                <span className="font-mono">
                  {formatCurrency(serviceChargeAmount)}
                </span>
              </div>

              {/* Grand Total row */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  paddingTop: "0.4rem",
                  borderTop: "1px dashed var(--border-subtle)",
                  marginTop: "0.15rem",
                }}
              >
                <span
                  style={{
                    fontSize: "0.78rem",
                    fontWeight: 800,
                    color: "var(--text-main)",
                  }}
                >
                  TOTAL
                </span>
                <span
                  className="font-mono"
                  style={{
                    fontSize: "1.15rem",
                    fontWeight: 900,
                    color: "var(--accent-amber-light)",
                  }}
                >
                  {formatCurrency(grandTotal)}
                </span>
              </div>

              {/* Actions: KOT + Print then Settle */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.25rem",
                  marginTop: "0.2rem",
                }}
              >
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "0.3rem",
                  }}
                >
                  <button
                    onClick={handleTriggerSendKot}
                    disabled={safeItems.length === 0 || isSendingKot}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "0.3rem",
                      padding: "0.38rem 0.4rem",
                      borderRadius: "6px",
                      background: isSendingKot
                        ? "var(--bg-tertiary)"
                        : hasUnsentItems
                          ? "linear-gradient(135deg, color-mix(in srgb, var(--accent-amber) 25%, transparent), color-mix(in srgb, var(--accent-saffron) 15%, transparent))"
                          : "var(--bg-tertiary)",
                      color:
                        safeItems.length === 0 || isSendingKot
                          ? "var(--text-dim)"
                          : (hasUnsentItems ? "var(--accent-amber-light)" : "var(--text-main)"),
                      border: hasUnsentItems && !isSendingKot
                        ? "1.5px solid var(--accent-amber)"
                        : "1px solid var(--border-subtle)",
                      fontSize: "0.72rem",
                      fontWeight: 700,
                      cursor:
                        safeItems.length === 0 || isSendingKot ? "not-allowed" : "pointer",
                      boxShadow: hasUnsentItems && !isSendingKot
                        ? "0 0 10px color-mix(in srgb, var(--accent-amber) 30%, transparent)"
                        : "none",
                    }}
                  >
                    <ChefHat size={13} color="var(--accent-amber)" />
                    <span>{isSendingKot ? "Sending..." : (hasUnsentItems ? `${dispatchButtonLabel} (Required)` : dispatchButtonLabel)}</span>
                  </button>
                  <button
                    onClick={() => onOpenReceipt(targetTableId)}
                    disabled={safeItems.length === 0}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "0.3rem",
                      padding: "0.38rem 0.4rem",
                      borderRadius: "6px",
                      background: "var(--bg-tertiary)",
                      color:
                        safeItems.length === 0
                          ? "var(--text-dim)"
                          : "var(--text-main)",
                      border: "1px solid var(--border-subtle)",
                      fontSize: "0.72rem",
                      fontWeight: 700,
                      cursor:
                        safeItems.length === 0 ? "not-allowed" : "pointer",
                    }}
                  >
                    <Receipt size={13} color="var(--accent-amber)" />
                    <span>Generate Bill</span>
                  </button>
                </div>

                <button
                  onClick={() => {
                    if (!canSettleAndCheckout) {
                      if (hasUnsentItems) {
                        onShowToast?.(`⚠️ Please ${dispatchButtonLabel} first before settling!`);
                      } else if (!allCookingReady) {
                        onShowToast?.("👨‍🍳 Cooking in progress! Settle will unlock once kitchen marks food ready.");
                      }
                      return;
                    }
                    onOpenSettlement(targetTableId);
                  }}
                  disabled={!canSettleAndCheckout}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "0.35rem",
                    padding: "0.45rem 0.6rem",
                    borderRadius: "7px",
                    background:
                      !canSettleAndCheckout
                        ? "rgba(100, 116, 139, 0.15)"
                        : "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                    color:
                      !canSettleAndCheckout ? "var(--text-dim)" : "#ffffff",
                    border: !canSettleAndCheckout
                      ? "1px solid rgba(148, 163, 184, 0.2)"
                      : "1px solid #10b981",
                    fontSize: "0.76rem",
                    fontWeight: 800,
                    boxShadow:
                      !canSettleAndCheckout
                        ? "none"
                        : "0 4px 14px rgba(16, 185, 129, 0.4)",
                    cursor: !canSettleAndCheckout ? "not-allowed" : "pointer",
                    transition: "all 0.2s ease",
                  }}
                >
                  <CreditCard size={14} />
                  <span>
                    {safeItems.length === 0
                      ? `Settle & Checkout — ${formatCurrency(0)}`
                      : hasUnsentItems
                        ? `🔒 ${dispatchButtonLabel} First to Settle`
                        : !allCookingReady
                          ? "👨‍🍳 Cooking in KOT... (Waiting Ready)"
                          : `✓ Settle & Checkout — ${formatCurrency(grandTotal)}`}
                  </span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Mobile Floating Cart Trigger (Sticky at bottom on phones only) */}
      {safeItems.length > 0 && !isMobileOrderSlipOpen && (
        <div
          className="pos-mobile-cart-bar"
          onClick={() => setIsMobileOrderSlipOpen(true)}
          style={{
            display: "none",
            position: "fixed",
            bottom: "12px",
            left: "12px",
            right: "12px",
            background: "linear-gradient(135deg, var(--accent-amber) 0%, var(--accent-saffron) 100%)",
            color: "#ffffff",
            borderRadius: "12px",
            padding: "0.75rem 1rem",
            alignItems: "center",
            justifyContent: "space-between",
            boxShadow: "0 8px 24px color-mix(in srgb, var(--accent-saffron) 45%, transparent)",
            zIndex: 90,
            cursor: "pointer",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <Receipt size={18} color="#ffffff" />
            <div>
              <div style={{ fontWeight: 800, fontSize: "0.88rem", color: "#ffffff" }}>
                {safeItems.reduce((acc, i) => acc + (i.quantity || 1), 0)} Items
                • {formatCurrency(grandTotal)}
              </div>
              <div style={{ fontSize: "0.68rem", opacity: 0.95, color: "#ffffff" }}>
                {table.name} • Tap to view bill & actions
              </div>
            </div>
          </div>
          <div
            className="pos-mobile-cart-action"
            style={{
              background: "#ffffff",
              color: "#0f172a",
              padding: "0.4rem 0.8rem",
              borderRadius: "8px",
              fontSize: "0.78rem",
              fontWeight: 800,
              display: "flex",
              alignItems: "center",
              gap: "0.3rem",
              boxShadow: "0 2px 8px rgba(0,0,0,0.18)",
            }}
          >
            <span style={{ color: "#0f172a", fontWeight: 800 }}>View Bill</span>
            <span style={{ color: "#0f172a", fontWeight: 800 }}>›</span>
          </div>
        </div>
      )}

      {/* Slide-Up / Centered Order Slip Modal Drawer */}
      {isMobileOrderSlipOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "var(--modal-overlay)",
            backdropFilter: "blur(5px)",
            zIndex: 1000,
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-end",
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsMobileOrderSlipOpen(false);
          }}
        >
          <div
            style={{
              background: "var(--bg-secondary)",
              borderTop: "2px solid var(--accent-amber)",
              borderTopLeftRadius: "16px",
              borderTopRightRadius: "16px",
              maxHeight: "88vh",
              width: "100%",
              maxWidth: "560px",
              margin: "0 auto",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 -8px 32px rgba(0,0,0,0.6)",
              overflow: "hidden",
            }}
          >
            {/* Drawer Header */}
            <div
              style={{
                padding: "0.75rem 1rem",
                background: "var(--bg-tertiary)",
                borderBottom: "1px solid var(--border-subtle)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div>
                <h3
                  style={{
                    fontSize: "1rem",
                    fontWeight: 800,
                    color: "var(--text-main)",
                  }}
                >
                  {table.name} — Order Slip
                </h3>
                <span
                  style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}
                >
                  {safeItems.length} items ordered {unsentItems.length > 0 ? `(${unsentItems.length} to send)` : ""}
                </span>
              </div>
              <button
                onClick={() => setIsMobileOrderSlipOpen(false)}
                style={{
                  background: "rgba(var(--surface-rgb),0.1)",
                  color: "var(--text-main)",
                  border: "none",
                  borderRadius: "8px",
                  padding: "0.4rem 0.8rem",
                  fontSize: "0.8rem",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                ✕ Close
              </button>
            </div>

            {/* Quick Customer Capture (Drawer) */}
            <div
              style={{
                padding: "0.5rem 0.75rem",
                background: "rgba(255, 255, 255, 0.03)",
                borderBottom: "1px solid var(--border-subtle)",
                display: "flex",
                flexDirection: "column",
                gap: "0.35rem",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "4px" }}>
                  <User size={13} color="var(--accent-amber)" /> Customer Details
                </span>
                {custTier && (
                  <span style={{
                    fontSize: "0.65rem",
                    fontWeight: 800,
                    padding: "2px 7px",
                    borderRadius: "4px",
                    background: custTier === "VIP" ? "rgba(168, 85, 247, 0.2)" : "rgba(34, 197, 94, 0.2)",
                    color: custTier === "VIP" ? "#c084fc" : "#4ade80",
                    border: custTier === "VIP" ? "1px solid rgba(168, 85, 247, 0.4)" : "1px solid rgba(34, 197, 94, 0.4)",
                  }}>
                    {custTier} Diner {custVisits > 1 ? `(${custVisits} visits)` : ""}
                  </span>
                )}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1.3fr", gap: "0.4rem" }}>
                <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                  <Phone size={12} style={{ position: "absolute", left: "7px", color: "var(--text-muted)", pointerEvents: "none" }} />
                  <input
                    type="tel"
                    placeholder="Phone No."
                    value={custPhone}
                    onChange={(e) => handleCustomerPhoneChange(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "5px 5px 5px 24px",
                      fontSize: "0.76rem",
                      background: "var(--bg-primary)",
                      border: "1px solid var(--border-subtle)",
                      borderRadius: "6px",
                      color: "var(--text-main)",
                      outline: "none",
                    }}
                  />
                </div>
                <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                  <User size={12} style={{ position: "absolute", left: "7px", color: "var(--text-muted)", pointerEvents: "none" }} />
                  <input
                    type="text"
                    placeholder="Customer Name"
                    value={custName}
                    onChange={(e) => handleCustomerNameChange(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "5px 5px 5px 24px",
                      fontSize: "0.76rem",
                      background: "var(--bg-primary)",
                      border: "1px solid var(--border-subtle)",
                      borderRadius: "6px",
                      color: "var(--text-main)",
                      outline: "none",
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Scrollable Items List (2-Stage: Unsent vs Kitchen Confirmed) */}
            <div
              style={{
                flex: 1,
                overflowY: "auto",
                padding: "0.75rem 1rem",
                display: "flex",
                flexDirection: "column",
                gap: "0.6rem",
                maxHeight: "45vh",
              }}
            >
              {unsentItems.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                  <div style={{ fontSize: "0.74rem", fontWeight: 800, color: "var(--accent-amber-light)", display: "flex", alignItems: "center", gap: "4px" }}>
                    <span>🟡 Current Selection ({unsentItems.length} items to send)</span>
                  </div>
                  {unsentItems.map((item, idx) => renderItemCard(item, idx, true))}
                </div>
              )}

              {sentItems.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem", marginTop: unsentItems.length > 0 ? "0.4rem" : 0 }}>
                  <div style={{ fontSize: "0.74rem", fontWeight: 800, color: "#10b981", display: "flex", alignItems: "center", gap: "4px" }}>
                    <span>🟢 Kitchen Confirmed Order ({sentItems.length} items)</span>
                  </div>
                  {sentItems.map((item, idx) => renderItemCard(item, idx, false))}
                </div>
              )}
            </div>

            {/* Financial Summary & Actions */}
            <div
              style={{
                background: "var(--bg-tertiary)",
                borderTop: "1px solid var(--border-subtle)",
                padding: "0.75rem 1rem",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "0.8rem",
                  color: "var(--text-muted)",
                  marginBottom: "0.2rem",
                }}
              >
                <span>Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "0.8rem",
                  color: "var(--text-muted)",
                  marginBottom: "0.4rem",
                }}
              >
                <span>Taxes & Charges</span>
                <span>{formatCurrency(taxAmount + serviceChargeAmount)}</span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "1.05rem",
                  fontWeight: 900,
                  color: "var(--accent-amber-light)",
                  marginBottom: "0.65rem",
                }}
              >
                <span>Total Payable</span>
                <span>{formatCurrency(grandTotal)}</span>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "0.4rem",
                  marginBottom: "0.4rem",
                }}
              >
                <button
                  onClick={() => {
                    setIsMobileOrderSlipOpen(false);
                    handleTriggerSendKot();
                  }}
                  disabled={safeItems.length === 0 || isSendingKot}
                  style={{
                    padding: "0.55rem",
                    borderRadius: "8px",
                    background: isSendingKot
                      ? "var(--bg-primary)"
                      : hasUnsentItems
                        ? "linear-gradient(135deg, color-mix(in srgb, var(--accent-amber) 25%, transparent), color-mix(in srgb, var(--accent-saffron) 15%, transparent))"
                        : "var(--bg-primary)",
                    color: safeItems.length === 0 || isSendingKot
                      ? "var(--text-dim)"
                      : (hasUnsentItems ? "var(--accent-amber-light)" : "var(--text-main)"),
                    border: hasUnsentItems && !isSendingKot
                      ? "1.5px solid var(--accent-amber)"
                      : "1px solid var(--border-subtle)",
                    fontWeight: 700,
                    fontSize: "0.78rem",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "0.3rem",
                  }}
                >
                  <ChefHat size={14} color="var(--accent-amber)" />
                  <span>{hasUnsentItems ? `${dispatchButtonLabel} (Required)` : dispatchButtonLabel}</span>
                </button>
                <button
                  onClick={() => {
                    setIsMobileOrderSlipOpen(false);
                    onOpenReceipt(targetTableId);
                  }}
                  disabled={safeItems.length === 0}
                  style={{
                    padding: "0.55rem",
                    borderRadius: "8px",
                    background: "var(--bg-primary)",
                    color: "var(--text-main)",
                    border: "1px solid var(--border-subtle)",
                    fontWeight: 700,
                    fontSize: "0.78rem",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "0.3rem",
                  }}
                >
                  <Receipt size={14} color="var(--accent-amber)" />
                  <span>Generate Bill</span>
                </button>
              </div>

              <button
                onClick={() => {
                  if (!canSettleAndCheckout) {
                    if (hasUnsentItems) {
                      onShowToast?.(`⚠️ Please ${dispatchButtonLabel} first before settling!`);
                    } else if (!allCookingReady) {
                      onShowToast?.("👨‍🍳 Cooking in progress! Settle will unlock once kitchen marks food ready.");
                    }
                    return;
                  }
                  setIsMobileOrderSlipOpen(false);
                  onOpenSettlement(targetTableId);
                }}
                disabled={!canSettleAndCheckout}
                style={{
                  width: "100%",
                  padding: "0.7rem",
                  borderRadius: "8px",
                  background:
                    !canSettleAndCheckout
                      ? "rgba(100, 116, 139, 0.15)"
                      : "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                  color: !canSettleAndCheckout ? "var(--text-dim)" : "#ffffff",
                  fontWeight: 800,
                  fontSize: "0.88rem",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.4rem",
                  border: !canSettleAndCheckout
                    ? "1px solid rgba(148, 163, 184, 0.2)"
                    : "1px solid #10b981",
                  boxShadow:
                    !canSettleAndCheckout
                      ? "none"
                      : "0 4px 14px rgba(16, 185, 129, 0.4)",
                  cursor: !canSettleAndCheckout ? "not-allowed" : "pointer",
                }}
              >
                <CreditCard size={16} />
                <span>
                  {safeItems.length === 0
                    ? `Settle & Checkout — ${formatCurrency(0)}`
                    : hasUnsentItems
                      ? `🔒 ${dispatchButtonLabel} First to Settle`
                      : !allCookingReady
                        ? "👨‍🍳 Cooking in KOT... (Waiting Ready)"
                        : `✓ Settle & Checkout — ${formatCurrency(grandTotal)}`}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Item Customization & Detail Modal */}
      {selectedMenuItemModal && (
        <ItemDetailModal
          item={selectedMenuItemModal}
          existingCartItem={safeItems.find(
            (i) => i.id === selectedMenuItemModal.id,
          )}
          onClose={() => setSelectedMenuItemModal(null)}
          onConfirm={handleConfirmItemModal}
          onRemove={handleRemoveItemFromModal}
        />
      )}
    </div>
  );
}
