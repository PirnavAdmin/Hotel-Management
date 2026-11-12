import React, { useState } from 'react';
import { 
  Printer, 
  X, 
  FileText, 
  Receipt as ReceiptIcon, 
  MapPin, 
  Phone, 
  Mail, 
  Utensils, 
  CheckCircle2, 
  Clock, 
  Users 
} from 'lucide-react';
import { formatCurrency, roundCurrency } from '../utils/formatCurrency';
import { getTodayDateString, getNextInvoiceNumber } from '../utils/invoiceCounter';
import { printSurface } from '../utils/printSurface';

/**
 * Robust Order Number Formatter
 * Guarantees every order/invoice ID is formatted with the "ORD-" prefix
 * E.g.: TAK-4964 -> ORD-4964, RES-1010 -> ORD-1010, INV-001 -> ORD-001, 4964 -> ORD-4964
 */
export function formatOrderNumber(rawId) {
  if (!rawId) return 'ORD-1001';
  const str = String(rawId).trim();
  if (/^ord[-_]/i.test(str)) {
    return `ORD-${str.replace(/^ord[-_]/i, '').toUpperCase()}`;
  }
  const digitsMatch = str.match(/\d+/g);
  if (digitsMatch && digitsMatch.length > 0) {
    return `ORD-${digitsMatch.join('')}`;
  }
  return `ORD-${str.replace(/^[^a-zA-Z0-9]+/, '').toUpperCase()}`;
}

/**
 * Format timestamp cleanly for 80mm Thermal Receipt (e.g. "2026-11-12 08:47:40")
 * Eliminates ugly raw ISO strings and unnecessary rows
 */
export function formatThermalDateTime(value, fallbackTime) {
  if (!value) {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const ss = String(now.getSeconds()).padStart(2, '0');
    return `${y}-${m}-${d} ${hh}:${mm}:${ss}`;
  }

  const str = String(value).trim();
  const dateObj = new Date(str);
  if (!isNaN(dateObj.getTime())) {
    const y = dateObj.getFullYear();
    const m = String(dateObj.getMonth() + 1).padStart(2, '0');
    const d = String(dateObj.getDate()).padStart(2, '0');
    const hh = String(dateObj.getHours()).padStart(2, '0');
    const mm = String(dateObj.getMinutes()).padStart(2, '0');
    const ss = String(dateObj.getSeconds()).padStart(2, '0');
    return `${y}-${m}-${d} ${hh}:${mm}:${ss}`;
  }

  if (fallbackTime && typeof fallbackTime === 'string') {
    return `${str} ${fallbackTime}`;
  }
  return str;
}

/**
 * Format timestamp cleanly for A4 Tax Invoice (e.g. "12 Nov 2026, 08:47 AM")
 */
export function formatA4DateTime(value, fallbackTime) {
  const raw = value || fallbackTime;
  if (!raw) {
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
    return `${dateStr}, ${timeStr}`;
  }

  const dateObj = new Date(raw);
  if (!isNaN(dateObj.getTime())) {
    const dateStr = dateObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const timeStr = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
    return `${dateStr}, ${timeStr}`;
  }

  if (fallbackTime && typeof fallbackTime === 'string') {
    return `${raw}, ${fallbackTime}`;
  }
  return String(raw);
}

/**
 * Format time only (e.g. "02:17 pm")
 */
export function formatOrderTimeOnly(value) {
  if (!value) return '';
  const str = String(value).trim();
  if (/^\d{1,2}:\d{2}\s*(am|pm)?$/i.test(str)) {
    return str;
  }
  const dateObj = new Date(str);
  if (!isNaN(dateObj.getTime())) {
    return dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
  }
  return str;
}

function amountToWords(amount) {
  const n = Math.round(Number(amount) || 0);
  if (n <= 0) return 'Zero Rupees Only';
  const a = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  function inWords(num) {
    if (num < 20) return a[num];
    if (num < 100) return b[Math.floor(num / 10)] + (num % 10 ? ' ' + a[num % 10] : '');
    if (num < 1000) return a[Math.floor(num / 100)] + ' Hundred' + (num % 100 ? ' ' + inWords(num % 100) : '');
    if (num < 100000) return inWords(Math.floor(num / 1000)) + ' Thousand' + (num % 1000 ? ' ' + inWords(num % 1000) : '');
    if (num < 10000000) return inWords(Math.floor(num / 100000)) + ' Lakh' + (num % 100000 ? ' ' + inWords(num % 100000) : '');
    return inWords(Math.floor(num / 10000000)) + ' Crore' + (num % 10000000 ? ' ' + inWords(num % 10000000) : '');
  }
  return inWords(n) + ' Rupees Only';
}

export function ReceiptModal({ table, onClose, onPrint, restaurantSettings = {} }) {
  const [printFormat, setPrintFormat] = useState('thermal'); // 'thermal' (80mm) or 'a4' (Full Page)

  if (!table) return null;

  // Retrieve stored settings fallback if needed
  let storedSettings = {};
  try {
    storedSettings = JSON.parse(localStorage.getItem('gourmet_pos_settings_v1') || '{}');
  } catch {}

  const restaurantName =
    restaurantSettings.restaurantName?.trim() ||
    storedSettings.restaurantName?.trim() ||
    "BHANU BISTRO";
  const restaurantTagline =
    restaurantSettings.tagline?.trim() ||
    storedSettings.tagline?.trim() ||
    "Restaurant & Cafe";
  const restaurantPhone =
    restaurantSettings.phone?.trim() ||
    storedSettings.phone?.trim() ||
    "+91 98450 12345";
  const restaurantAddress =
    restaurantSettings.address?.trim() ||
    storedSettings.address?.trim() ||
    "Main Road, Near Tech Park, Hyderabad, India - 500081";
  const restaurantGstin =
    restaurantSettings.gstin?.trim() ||
    storedSettings.gstin?.trim() ||
    "36AABCA1234F1Z5";
  const restaurantEmail =
    restaurantSettings.email?.trim() ||
    storedSettings.email?.trim() ||
    "info@bhanubistro.com";
  const restaurantLogo =
    restaurantSettings.logo ||
    table.logo ||
    storedSettings.logo ||
    "/assets/login-restaurant.jpg";

  // Items resolution
  const items = (Array.isArray(table.items) ? table.items : []).map((item) => ({
    ...item,
    name: String(item?.name || item?.dishName || "Item").trim(),
    quantity: Number(item?.quantity ?? item?.qty) || 1,
    price: Number(item?.price ?? item?.unitPrice) || 0,
  }));

  const itemsSubtotal = roundCurrency(items.reduce((sum, item) => sum + (item.price * item.quantity), 0));
  const subtotal = table.subtotal !== undefined && Number(table.subtotal) > 0
    ? Number(table.subtotal)
    : itemsSubtotal;
  
  const discountPercent = Number(table.discountPercent) || 0;
  const discountAmount = table.discountAmount !== undefined && Number(table.discountAmount) > 0
    ? Number(table.discountAmount)
    : roundCurrency((subtotal * discountPercent) / 100);

  const taxableAmount = roundCurrency(Math.max(0, subtotal - discountAmount));
  const taxRate = 0.05; // 5% GST
  
  const taxAmount = table.taxAmount !== undefined && Number(table.taxAmount) > 0
    ? Number(table.taxAmount)
    : roundCurrency(taxableAmount * taxRate);
  
  const cgst = roundCurrency(taxAmount / 2);
  const sgst = roundCurrency(taxAmount / 2);
  
  const serviceChargePercent = Number(table.serviceCharge) || 5;
  const serviceChargeAmount = table.serviceChargeAmount !== undefined && table.serviceChargeAmount !== null && Number.isFinite(Number(table.serviceChargeAmount))
    ? Number(table.serviceChargeAmount)
    : (table.serviceCharge ? roundCurrency(taxableAmount * (serviceChargePercent / 100)) : 0);
  const tipAmount = Number(table.tipAmount ?? table.TipAmount) || 0;
  
  const grandTotal = table.grandTotal !== undefined && Number(table.grandTotal) > 0
    ? Number(table.grandTotal)
    : roundCurrency(taxableAmount + taxAmount + serviceChargeAmount + tipAmount);

  // Raw and unified Order Number (Always formatted as ORD-XXXX)
  const rawInvoiceNo = table.invoiceNo || table.id || table.orderId || getNextInvoiceNumber();
  const orderNumber = formatOrderNumber(rawInvoiceNo);

  // Clean date & time formats
  const thermalDateTime = formatThermalDateTime(table.date || table.createdAt || table.settledAt, table.orderTime);
  const a4DateTime = formatA4DateTime(table.date || table.createdAt || table.settledAt, table.orderTime);
  const orderTimeDisplay = formatOrderTimeOnly(table.orderTime || table.createdAt || table.time) || "02:17 pm";

  // Table & Section display
  const displayTableName = table.name || table.tableName || table.tableNumber || (table.id != null ? `Table ${table.id}` : "Takeaway");
  const displaySection = table.section || table.sectionArea || table.area || "Takeaway";
  const displayServer = table.server || table.serverName || table.assignedServer || "Staff";
  
  const tableCapacity = Number(table.capacity) || 0;
  const guestCount =
    (Number(table.guests) > 0 ? Number(table.guests) : null) ??
    (Number(table.guestsCount) > 0 ? Number(table.guestsCount) : null) ??
    (Number(table.occupiedChairs) > 0 ? Number(table.occupiedChairs) : null) ??
    (tableCapacity > 0 ? tableCapacity : null) ??
    1;

  // Order Type categorization
  const isTakeaway = Boolean(
    String(displayTableName).toLowerCase().includes('takeaway') ||
    String(displaySection).toLowerCase().includes('takeaway') ||
    table.orderType?.toLowerCase?.().includes('takeaway')
  );
  const isReservation = Boolean(
    String(displayTableName).toLowerCase().includes('reservation') ||
    table.orderType?.toLowerCase?.().includes('reservation') ||
    table.reservationDate
  );
  const orderTypeLabel = isTakeaway
    ? "Takeaway"
    : isReservation
    ? "Table Reservation"
    : `Dine-In (${displayTableName})`;

  // Status & Settlement
  const receiptStatus = String(table.status || table.Status || "").toLowerCase();
  const isVoid = ["void", "voided", "cancelled", "canceled"].includes(receiptStatus);
  const isSettled = !isVoid && Boolean(
    (table.isPaid === true ||
     table.settled === true ||
     receiptStatus === 'settled' ||
     receiptStatus === 'paid' ||
     receiptStatus === 'completed' ||
     Boolean(table.settledAt)) &&
    receiptStatus !== 'occupied' &&
    receiptStatus !== 'active'
  );

  const paymentMethod = isSettled
    ? (table.paymentMethod ? table.paymentMethod.toUpperCase() : (table.paymentMode ? table.paymentMode.toUpperCase() : 'UPI'))
    : null;

  const handlePrint = async () => {
    await printSurface("printable-receipt", {
      title: `Order_${orderNumber}`,
      format: printFormat,
      emptyMessage: "Cannot print an empty invoice. Add items first.",
    });
    if (onPrint) onPrint();
  };

  return (
    <div 
      className="receipt-modal-overlay"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.85)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2500,
        padding: '0.75rem',
        animation: 'fadeIn 0.15s ease'
      }}
    >
      <div 
        className="receipt-modal-container"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#ffffff',
          color: '#0f172a',
          width: '100%',
          maxWidth: printFormat === 'a4' ? '760px' : '410px',
          borderRadius: '14px',
          boxShadow: '0 25px 65px rgba(0,0,0,0.85), 0 0 35px rgba(234, 88, 12, 0.25)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '94vh',
          transition: 'max-width 0.2s ease'
        }}
      >
        {/* Receipt Controls Bar (hidden during print) */}
        <div className="no-print" style={{
          background: '#0f172a',
          padding: '0.65rem 1rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.5rem',
          color: '#ffffff',
          borderBottom: '1px solid #1e293b'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Printer size={17} color="#f59e0b" />
            <span style={{ fontSize: '0.88rem', fontWeight: 800, letterSpacing: '-0.01em' }}>Invoice & Bill Print</span>
          </div>

          {/* Print Format Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(255,255,255,0.08)', padding: '2px', borderRadius: '6px' }}>
            <button
              type="button"
              onClick={() => setPrintFormat('thermal')}
              style={{
                padding: '4px 10px',
                fontSize: '0.74rem',
                fontWeight: 750,
                borderRadius: '4px',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                background: printFormat === 'thermal' ? '#f59e0b' : 'transparent',
                color: printFormat === 'thermal' ? '#000000' : '#cbd5e1',
                transition: 'all 0.15s'
              }}
              title="80mm Thermal Receipt Paper (Roll Printer)"
            >
              <ReceiptIcon size={13} />
              <span>80mm Thermal</span>
            </button>

            <button
              type="button"
              onClick={() => setPrintFormat('a4')}
              style={{
                padding: '4px 10px',
                fontSize: '0.74rem',
                fontWeight: 750,
                borderRadius: '4px',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                background: printFormat === 'a4' ? '#f59e0b' : 'transparent',
                color: printFormat === 'a4' ? '#000000' : '#cbd5e1',
                transition: 'all 0.15s'
              }}
              title="A4 Full Page / PDF Tax Invoice"
            >
              <FileText size={13} />
              <span>A4 Tax Invoice</span>
            </button>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              border: 'none',
              color: '#94a3b8',
              width: '28px',
              height: '28px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
            title="Close popup"
          >
            <X size={16} />
          </button>
        </div>

        {/* PRINTABLE RECEIPT CONTENT */}
        {printFormat === 'thermal' ? (
          /* ========================================================================= */
          /* 1. THERMAL 80MM RECEIPT FORMAT (Compact layout matching Image 1 exactly)  */
          /* ========================================================================= */
          <div 
            id="printable-receipt" 
            className="format-thermal" 
            style={{
              padding: '0.85rem 1rem 0.6rem',
              fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
              fontSize: '0.76rem',
              lineHeight: '1.3',
              background: '#ffffff',
              color: '#000000',
              display: 'flex',
              flexDirection: 'column',
              flex: '1 1 auto',
              minHeight: 0,
              overflowY: 'auto'
            }}
          >
            {/* Restaurant Header: Left Logo + Vertical Divider + Details (Matches Image 1) */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              paddingBottom: '0.45rem'
            }}>
              {/* Logo Container */}
              <div style={{
                width: '54px',
                height: '54px',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                background: '#ffffff',
                flexShrink: 0
              }}>
                {restaurantLogo ? (
                  <img
                    src={restaurantLogo}
                    alt={`${restaurantName} logo`}
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                  />
                ) : (
                  <Utensils size={28} color="#ea580c" />
                )}
              </div>

              {/* Vertical Divider Line */}
              <div style={{ width: '1.5px', height: '50px', background: '#cbd5e1', flexShrink: 0 }} />

              {/* Header Text Details */}
              <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                <h2 style={{
                  fontSize: '1.18rem',
                  fontWeight: 900,
                  textTransform: 'uppercase',
                  letterSpacing: '0.02em',
                  color: '#000000',
                  margin: 0,
                  lineHeight: 1.15
                }}>
                  {restaurantName}
                </h2>
                <div style={{ fontSize: '0.74rem', fontWeight: 800, color: '#1e293b', marginTop: '1px' }}>
                  {restaurantTagline}
                </div>
                <div style={{ fontSize: '0.64rem', color: '#475569', marginTop: '2px', lineHeight: 1.25 }}>
                  {[restaurantAddress, restaurantPhone].filter(Boolean).join(' • ')}
                </div>
                {restaurantGstin && (
                  <div style={{ fontSize: '0.66rem', fontWeight: 800, color: '#000000', marginTop: '2px' }}>
                    GSTIN: {restaurantGstin}
                  </div>
                )}
              </div>
            </div>

            {/* Clear Status Badge Banner (Matches Image 1) */}
            <div style={{
              textAlign: 'center',
              fontSize: '0.72rem',
              fontWeight: 900,
              letterSpacing: '0.04em',
              padding: '3px 8px',
              margin: '4px 0 6px',
              borderRadius: '4px',
              border: isVoid ? '1.5px solid #dc2626' : isSettled ? '1.5px solid #16a34a' : '1.5px dashed #dc2626',
              color: isVoid ? '#b91c1c' : isSettled ? '#15803d' : '#b91c1c',
              background: isVoid ? 'rgba(220, 38, 38, 0.08)' : isSettled ? 'rgba(22, 163, 74, 0.08)' : 'rgba(220, 38, 38, 0.08)'
            }}>
              {isVoid
                ? 'VOID — NOT A VALID PAYMENT INVOICE'
                : isSettled
                ? '★ PAID TAX INVOICE ★'
                : '⚠ GUEST BILL / ESTIMATE — UNPAID ⚠'}
            </div>

            {/* Dashed Separator */}
            <div style={{ borderBottom: '1px dashed #64748b', marginBottom: '6px' }} />

            {/* Bill Meta 2-Column Grid (Matches Image 1) */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr auto',
              columnGap: '12px',
              rowGap: '3px',
              fontSize: '0.73rem',
              marginBottom: '6px'
            }}>
              {/* Row 1 */}
              <div>
                Table: <strong>{displayTableName} ({displaySection})</strong>
              </div>
              <div style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                Ord: <strong style={{ fontFamily: 'monospace' }}>{orderNumber}</strong>
              </div>

              {/* Row 2 */}
              <div>
                Server: <strong>{displayServer}</strong>
              </div>
              <div style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                Guests: <strong>{guestCount}</strong>
              </div>

              {/* Row 3 */}
              <div style={{ whiteSpace: 'nowrap' }}>
                Date: <strong>{thermalDateTime}</strong>
              </div>
              <div style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                Order: <strong>{orderTimeDisplay}</strong>
              </div>

              {/* Row 4 (Mode / Status) */}
              <div>
                {table.customer && <span>Guest: <strong>{table.customer}</strong></span>}
              </div>
              <div style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                <span style={{ color: isSettled ? '#15803d' : '#b91c1c', fontWeight: 800 }}>
                  Mode: <strong>{paymentMethod ? `${paymentMethod} (PAID)` : (isSettled ? 'PAID' : 'DUE')}</strong>
                </span>
              </div>
            </div>

            {/* Dashed Separator */}
            <div style={{ borderBottom: '1px dashed #64748b', marginBottom: '6px' }} />

            {/* Items Table Header */}
            <div>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(0, 3.2fr) 1fr 1.2fr 1.3fr',
                fontWeight: 900,
                fontSize: '0.72rem',
                borderBottom: '1.5px solid #000000',
                paddingBottom: '3px',
                marginBottom: '4px',
                color: '#000000'
              }}>
                <span>ITEM</span>
                <span style={{ textAlign: 'center' }}>QTY</span>
                <span style={{ textAlign: 'right' }}>RATE</span>
                <span style={{ textAlign: 'right' }}>AMOUNT</span>
              </div>

              {/* Items List */}
              <div 
                style={{
                  maxHeight: '26vh',
                  overflowY: 'auto'
                }}
                className="receipt-items-scroll"
              >
                {items.map((item, idx) => (
                  <div
                    key={item.id || idx}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'minmax(0, 3.2fr) 1fr 1.2fr 1.3fr',
                      fontSize: '0.74rem',
                      padding: '2.5px 0',
                      borderBottom: '1px dotted rgba(0,0,0,0.12)'
                    }}
                  >
                    <span style={{ fontWeight: 700, wordBreak: 'break-word', color: '#000000', paddingRight: '4px' }}>
                      {item.name || "Item"}
                    </span>
                    <span style={{ textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}>{item.quantity}</span>
                    <span style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>₹{item.price}</span>
                    <span style={{ textAlign: 'right', fontWeight: 800, fontVariantNumeric: 'tabular-nums', color: '#000000' }}>
                      ₹{(item.price * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Dashed Separator */}
            <div style={{ borderTop: '1px dashed #64748b', paddingTop: '5px', marginTop: '5px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.73rem' }}>
                <span>Subtotal:</span>
                <span style={{ fontVariantNumeric: 'tabular-nums' }}>₹{subtotal.toFixed(2)}</span>
              </div>

              {(discountAmount > 0 || discountPercent > 0) && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.73rem', fontWeight: 800, color: '#16a34a' }}>
                  <span>Discount {discountPercent > 0 ? `(${discountPercent}%)` : ""}:</span>
                  <span style={{ fontVariantNumeric: 'tabular-nums' }}>-₹{discountAmount.toFixed(2)}</span>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#222222' }}>
                <span>CGST (2.5%) + SGST (2.5%):</span>
                <span style={{ fontVariantNumeric: 'tabular-nums' }}>₹{cgst.toFixed(2)} + ₹{sgst.toFixed(2)} (₹{taxAmount.toFixed(2)})</span>
              </div>

              {serviceChargeAmount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#222222' }}>
                  <span>Service Charge ({serviceChargePercent}%):</span>
                  <span style={{ fontVariantNumeric: 'tabular-nums' }}>₹{serviceChargeAmount.toFixed(2)}</span>
                </div>
              )}

              {tipAmount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#222222' }}>
                  <span>Tip:</span>
                  <span style={{ fontVariantNumeric: 'tabular-nums' }}>₹{tipAmount.toFixed(2)}</span>
                </div>
              )}

              {/* Dashed Separator */}
              <div style={{ borderBottom: '1px dashed #64748b', margin: '4px 0 2px' }} />

              {/* TOTAL PAYABLE: Soft Amber/Yellow Highlight Box (Matches Image 1) */}
              <div 
                className="receipt-total-box"
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: '#fef3c7',
                  borderRadius: '6px',
                  padding: '7px 10px',
                  marginTop: '4px',
                  border: '1px solid #fde68a'
                }}
              >
                <span style={{ fontSize: '0.92rem', fontWeight: 900, letterSpacing: '0.02em', color: '#000000' }}>
                  TOTAL PAYABLE:
                </span>
                <span style={{ fontSize: '1.25rem', fontWeight: 900, color: '#000000', fontVariantNumeric: 'tabular-nums' }}>
                  ₹{grandTotal.toFixed(2)}
                </span>
              </div>

              {!isSettled && (
                <div style={{
                  textAlign: 'center',
                  padding: '4px 6px',
                  marginTop: '6px',
                  border: '1.5px dashed #b91c1c',
                  color: '#b91c1c',
                  fontWeight: 800,
                  fontSize: '0.7rem',
                  letterSpacing: '0.03em',
                  background: 'rgba(220, 38, 38, 0.05)',
                  borderRadius: '4px'
                }}>
                  *** BILL DUE — PLEASE SETTLE AT CASHIER ***
                </div>
              )}
            </div>

            {/* Thermal Footer */}
            <div style={{ textAlign: 'center', marginTop: '0.5rem', paddingTop: '0.4rem', borderTop: '1px dashed #64748b' }}>
              <p style={{ fontSize: '0.72rem', fontWeight: 800, color: '#000000', margin: '2px 0 0' }}>
                THANK YOU FOR VISITING {restaurantName.toUpperCase()}!
              </p>
              <p style={{ fontSize: '0.64rem', color: '#475569', margin: '1px 0 0' }}>
                Please visit again{restaurantPhone ? ` • Orders: ${restaurantPhone}` : ""}
              </p>
            </div>
          </div>
        ) : (
          /* ========================================================================= */
          /* 2. A4 FULL PAGE TAX INVOICE FORMAT (Matches Image 3 exactly)              */
          /* ========================================================================= */
          <div 
            id="printable-receipt" 
            className="format-a4" 
            style={{
              padding: '1.5rem 1.75rem 1rem',
              fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
              fontSize: '0.84rem',
              lineHeight: '1.45',
              background: '#ffffff',
              color: '#0f172a',
              display: 'flex',
              flexDirection: 'column',
              flex: '1 1 auto',
              minHeight: 0,
              overflowY: 'auto'
            }}
          >
            {/* A4 Tax Invoice Header (Matches Image 3) */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingBottom: '0.65rem'
            }}>
              {/* Left: Round Logo + Restaurant Details */}
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                {/* Circular Logo Container */}
                <div style={{
                  width: '68px',
                  height: '68px',
                  borderRadius: '50%',
                  border: '2.5px solid #fdba74',
                  boxShadow: '0 4px 14px rgba(234, 88, 12, 0.18)',
                  overflow: 'hidden',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: '#ffffff',
                  flexShrink: 0
                }}>
                  {restaurantLogo ? (
                    <img
                      src={restaurantLogo}
                      alt="Logo"
                      style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                    />
                  ) : (
                    <Utensils size={32} color="#ea580c" />
                  )}
                </div>

                {/* Restaurant Brand Info */}
                <div>
                  <h1 style={{
                    margin: 0,
                    fontSize: '1.55rem',
                    fontWeight: 900,
                    textTransform: 'uppercase',
                    letterSpacing: '0.02em',
                    color: '#0f172a',
                    lineHeight: 1.15
                  }}>
                    {restaurantName}
                  </h1>
                  <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#ea580c', margin: '2px 0 4px' }}>
                    {restaurantTagline}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '0.72rem', color: '#475569' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <MapPin size={12} color="#ea580c" />
                      <span>{restaurantAddress}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <Phone size={12} color="#ea580c" />
                      <span>{restaurantPhone}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <Mail size={12} color="#ea580c" />
                      <span>{restaurantEmail}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right: TAX INVOICE Card with GSTIN */}
              <div style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '0.75rem 1.4rem',
                textAlign: 'center',
                minWidth: '220px',
                boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
              }}>
                <div style={{ fontSize: '1.18rem', fontWeight: 900, letterSpacing: '0.05em', color: '#0f172a' }}>
                  TAX INVOICE
                </div>
                {restaurantGstin && (
                  <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#0f172a', marginTop: '3px' }}>
                    GSTIN: {restaurantGstin}
                  </div>
                )}
              </div>
            </div>

            {/* Solid Orange Divider Line (Matches Image 3) */}
            <div style={{ height: '2.5px', background: '#ea580c', margin: '0.85rem 0 1rem', borderRadius: '2px' }} />

            {/* Two Information Cards (Side-by-Side Grid matching Image 3) */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.15rem' }}>
              {/* Left Card: Order No, Invoice Ref, Date & Time */}
              <div style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                overflow: 'hidden',
                fontSize: '0.8rem'
              }}>
                <div style={{ display: 'flex', borderBottom: '1px solid #f1f5f9', padding: '7px 12px' }}>
                  <span style={{ width: '110px', color: '#64748b', fontWeight: 600 }}>Order No.</span>
                  <span style={{ color: '#0f172a', fontWeight: 800, fontFamily: 'monospace' }}>: {orderNumber}</span>
                </div>
                <div style={{ display: 'flex', borderBottom: '1px solid #f1f5f9', padding: '7px 12px', background: '#fafafa' }}>
                  <span style={{ width: '110px', color: '#64748b', fontWeight: 600 }}>Invoice No.</span>
                  <span style={{ color: '#0f172a', fontWeight: 700, fontFamily: 'monospace' }}>: {rawInvoiceNo || orderNumber}</span>
                </div>
                <div style={{ display: 'flex', padding: '7px 12px' }}>
                  <span style={{ width: '110px', color: '#64748b', fontWeight: 600 }}>Date & Time</span>
                  <span style={{ color: '#0f172a', fontWeight: 700 }}>: {a4DateTime}</span>
                </div>
              </div>

              {/* Right Card: Order Type, Server, Guests, Payment Mode */}
              <div style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                overflow: 'hidden',
                fontSize: '0.8rem'
              }}>
                <div style={{ display: 'flex', borderBottom: '1px solid #f1f5f9', padding: '7px 12px' }}>
                  <span style={{ width: '120px', color: '#64748b', fontWeight: 600 }}>Order Type</span>
                  <span style={{ color: '#0f172a', fontWeight: 700 }}>: {orderTypeLabel}</span>
                </div>
                <div style={{ display: 'flex', borderBottom: '1px solid #f1f5f9', padding: '7px 12px', background: '#fafafa' }}>
                  <span style={{ width: '120px', color: '#64748b', fontWeight: 600 }}>Server</span>
                  <span style={{ color: '#0f172a', fontWeight: 700 }}>: {displayServer}</span>
                </div>
                <div style={{ display: 'flex', borderBottom: '1px solid #f1f5f9', padding: '7px 12px' }}>
                  <span style={{ width: '120px', color: '#64748b', fontWeight: 600 }}>Guests</span>
                  <span style={{ color: '#0f172a', fontWeight: 700 }}>: {guestCount}</span>
                </div>
                <div style={{ display: 'flex', padding: '7px 12px', background: '#fafafa' }}>
                  <span style={{ width: '120px', color: '#64748b', fontWeight: 600 }}>Payment Mode</span>
                  <span style={{ color: '#16a34a', fontWeight: 800 }}>
                    : {paymentMethod ? `${paymentMethod} (Paid)` : (isSettled ? "PAID" : "Due")}
                  </span>
                </div>
              </div>
            </div>

            {/* Items Table: Solid Orange Header (Matches Image 3) */}
            <table style={{
              width: '100%',
              borderCollapse: 'separate',
              borderSpacing: 0,
              marginBottom: '1.25rem',
              fontSize: '0.82rem',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              overflow: 'hidden'
            }}>
              <thead>
                <tr style={{ background: '#ea580c', color: '#ffffff' }}>
                  <th style={{ padding: '8px 10px', width: '48px', textAlign: 'center', fontWeight: 800, fontSize: '0.78rem' }}>S.No</th>
                  <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 800, fontSize: '0.78rem' }}>Item</th>
                  <th style={{ padding: '8px 10px', width: '70px', textAlign: 'center', fontWeight: 800, fontSize: '0.78rem' }}>Qty</th>
                  <th style={{ padding: '8px 12px', width: '110px', textAlign: 'right', fontWeight: 800, fontSize: '0.78rem' }}>Rate (₹)</th>
                  <th style={{ padding: '8px 12px', width: '120px', textAlign: 'right', fontWeight: 800, fontSize: '0.78rem' }}>Amount (₹)</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => (
                  <tr key={idx} style={{ background: '#ffffff' }}>
                    <td style={{ padding: '8px 10px', textAlign: 'center', color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>{idx + 1}</td>
                    <td style={{ padding: '8px 12px', fontWeight: 700, color: '#0f172a', borderBottom: '1px solid #e2e8f0' }}>{item.name}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'center', color: '#0f172a', borderBottom: '1px solid #e2e8f0' }}>{item.quantity}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'right', color: '#0f172a', borderBottom: '1px solid #e2e8f0' }}>{item.price.toFixed(2)}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 800, color: '#0f172a', borderBottom: '1px solid #e2e8f0' }}>{(item.price * item.quantity).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Calculations & Watermark Emblem (Matches Image 3) */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '2rem', marginBottom: '1.15rem' }}>
              {/* Left: Chef Hat & Cutlery Watermark Seal */}
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{
                  width: '125px',
                  height: '125px',
                  borderRadius: '50%',
                  border: '3px solid rgba(234, 88, 12, 0.2)',
                  background: 'rgba(234, 88, 12, 0.04)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: 'inset 0 0 16px rgba(234, 88, 12, 0.06)'
                }}>
                  <svg width="68" height="68" viewBox="0 0 24 24" fill="none" stroke="#ea580c" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.7 }}>
                    <path d="M6 13.87A4 4 0 0 1 7.41 6a5.11 5.11 0 0 1 1.05-1.54 5 5 0 0 1 7.08 0A5.11 5.11 0 0 1 16.59 6 4 4 0 0 1 18 13.87V21H6Z"/>
                    <line x1="6" y1="17" x2="18" y2="17"/>
                  </svg>
                </div>
              </div>

              {/* Right: Calculations Card */}
              <div style={{
                width: '310px',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                overflow: 'hidden',
                background: '#ffffff',
                fontSize: '0.82rem'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 12px', borderBottom: '1px solid #f1f5f9' }}>
                  <span style={{ color: '#64748b', fontWeight: 600 }}>Subtotal</span>
                  <span style={{ fontWeight: 700, color: '#0f172a' }}>₹{subtotal.toFixed(2)}</span>
                </div>
                {(discountAmount > 0 || discountPercent > 0) && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 12px', borderBottom: '1px solid #f1f5f9', color: '#16a34a', fontWeight: 700 }}>
                    <span>Discount ({discountPercent}%)</span>
                    <span>-₹{discountAmount.toFixed(2)}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 12px', borderBottom: '1px solid #f1f5f9' }}>
                  <span style={{ color: '#64748b', fontWeight: 600 }}>CGST (2.5%)</span>
                  <span style={{ fontWeight: 700, color: '#0f172a' }}>₹{cgst.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 12px', borderBottom: '1px solid #f1f5f9' }}>
                  <span style={{ color: '#64748b', fontWeight: 600 }}>SGST (2.5%)</span>
                  <span style={{ fontWeight: 700, color: '#0f172a' }}>₹{sgst.toFixed(2)}</span>
                </div>
                {serviceChargeAmount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 12px', borderBottom: '1px solid #f1f5f9' }}>
                    <span style={{ color: '#64748b', fontWeight: 600 }}>Service Charge ({serviceChargePercent}%)</span>
                    <span style={{ fontWeight: 700, color: '#0f172a' }}>₹{serviceChargeAmount.toFixed(2)}</span>
                  </div>
                )}
                {/* Total Payable: Warm Orange Highlight Container */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '8px 12px',
                  background: '#ffedd5',
                  borderTop: '1px solid #fdba74'
                }}>
                  <span style={{ fontSize: '0.92rem', fontWeight: 900, color: '#0f172a' }}>Total Payable</span>
                  <span style={{ fontSize: '1.25rem', fontWeight: 900, color: '#c2410c' }}>₹{grandTotal.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Paid Tax Invoice Pill Banner (Matches Image 3) */}
            <div style={{ textAlign: 'center', margin: '0.85rem 0' }}>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.35rem 1.4rem',
                borderRadius: '999px',
                border: isVoid ? '1.5px solid #dc2626' : isSettled ? '1.5px solid #16a34a' : '1.5px dashed #dc2626',
                background: isVoid ? 'rgba(220, 38, 38, 0.08)' : isSettled ? 'rgba(22, 163, 74, 0.08)' : 'rgba(220, 38, 38, 0.08)',
                color: isVoid ? '#b91c1c' : isSettled ? '#15803d' : '#b91c1c',
                fontWeight: 800,
                fontSize: '0.82rem',
                letterSpacing: '0.03em'
              }}>
                <CheckCircle2 size={16} color={isSettled ? '#16a34a' : '#dc2626'} />
                <span>{isVoid ? 'VOID TAX INVOICE' : isSettled ? 'PAID TAX INVOICE' : 'UNPAID / BILL DUE'}</span>
              </div>
            </div>

            {/* Footer: Terms & Conditions + Thank You (Matches Image 3) */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1.4fr 1fr',
              gap: '1.5rem',
              borderTop: '1px solid #e2e8f0',
              paddingTop: '0.85rem',
              marginTop: 'auto'
            }}>
              {/* Terms & Conditions */}
              <div style={{
                fontSize: '0.74rem',
                color: '#475569',
                lineHeight: 1.5,
                borderRight: '1.5px solid #fed7aa',
                paddingRight: '1rem'
              }}>
                <strong style={{ color: '#0f172a', display: 'block', marginBottom: '3px' }}>Terms & Conditions:</strong>
                <div>1. This is a computer-generated tax invoice.</div>
                <div>2. Goods are supplied for takeaway / restaurant consumption only.</div>
                <div>3. Prices are inclusive of applicable taxes.</div>
                <div>4. No return or refund after takeaway.</div>
              </div>

              {/* Thank You Calligraphy & Visit Again */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center'
              }}>
                <div style={{
                  fontSize: '2rem',
                  fontFamily: "'Caveat', 'Dancing Script', 'Brush Script MT', cursive, serif",
                  fontWeight: 700,
                  color: '#ea580c',
                  lineHeight: 1.1
                }}>
                  Thank You!
                </div>
                <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 600, marginTop: '3px' }}>
                  — Visit Again —
                </div>
              </div>
            </div>

            {/* Decorative Orange Wave / Gradient Bottom Accent (Matches Image 3) */}
            <div style={{
              height: '14px',
              background: 'linear-gradient(90deg, #ea580c 0%, #f97316 50%, #fb923c 100%)',
              borderRadius: '0 0 8px 8px',
              marginTop: '0.9rem'
            }} />
          </div>
        )}

        {/* Action Buttons (no print) */}
        <div className="no-print" style={{
          padding: '0.65rem 1rem',
          background: '#0f172a',
          borderTop: '1px solid #1e293b',
          display: 'flex',
          gap: '0.65rem'
        }}>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: '0.55rem',
              borderRadius: '6px',
              background: '#334155',
              color: '#f8fafc',
              fontWeight: 700,
              fontSize: '0.82rem',
              border: '1px solid #475569',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            Close
          </button>

          <button
            onClick={handlePrint}
            style={{
              flex: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.45rem',
              padding: '0.52rem',
              borderRadius: '6px',
              background: '#f59e0b',
              color: '#000000',
              fontWeight: 800,
              fontSize: '0.82rem',
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(245, 158, 11, 0.4)'
            }}
          >
            <Printer size={15} />
            <span>
              Print {isVoid ? 'Void Invoice' : (printFormat === 'a4' ? 'A4 Tax Invoice' : 'Thermal Receipt')}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default ReceiptModal;
