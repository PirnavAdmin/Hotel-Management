import React, { useState } from 'react';
import { Printer, X, FileText, Receipt as ReceiptIcon } from 'lucide-react';
import { formatCurrency } from '../utils/formatCurrency';
import { getTodayDateString, getNextInvoiceNumber } from '../utils/invoiceCounter';
import { printSurface } from '../utils/printSurface';

const formatReceiptTime = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isFinite(date.getTime()) && (typeof value === 'number' || /^\d{4}-\d{2}-\d{2}T/.test(String(value)))) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  return String(value);
};

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

  const restaurantName = restaurantSettings.restaurantName?.trim() || "Restaurant";
  const restaurantTagline = restaurantSettings.tagline?.trim() || "";
  const restaurantPhone = restaurantSettings.phone?.trim() || "";
  const restaurantAddress = restaurantSettings.address?.trim() || "";
  const restaurantGstin = restaurantSettings.gstin?.trim() || "";

  const items = (Array.isArray(table.items) ? table.items : []).map((item) => ({
    ...item,
    name: String(item?.name || item?.dishName || "Item name unavailable").trim(),
    quantity: Number(item?.quantity ?? item?.qty) || 1,
    price: Number(item?.price ?? item?.unitPrice) || 0,
  }));
  const subtotal = table.subtotal !== undefined && Number(table.subtotal) > 0
    ? Number(table.subtotal)
    : items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  
  const discountPercent = Number(table.discountPercent) || 0;
  const discountAmount = table.discountAmount !== undefined && Number(table.discountAmount) > 0
    ? Number(table.discountAmount)
    : (subtotal * discountPercent) / 100;

  const taxableAmount = Math.max(0, subtotal - discountAmount);
  const taxRate = 0.05; // 5% GST
  
  const taxAmount = table.taxAmount !== undefined && Number(table.taxAmount) > 0
    ? Number(table.taxAmount)
    : taxableAmount * taxRate;
  
  const cgst = taxAmount / 2;
  const sgst = taxAmount / 2;
  
  const serviceChargePercent = Number(table.serviceCharge) || 5;
  const serviceChargeAmount = table.serviceChargeAmount !== undefined && Number(table.serviceChargeAmount) > 0
    ? Number(table.serviceChargeAmount)
    : (table.serviceCharge ? (taxableAmount * (serviceChargePercent / 100)) : 0);
  
  const grandTotal = table.grandTotal !== undefined && Number(table.grandTotal) > 0
    ? Number(table.grandTotal)
    : Math.round(taxableAmount + taxAmount + serviceChargeAmount);

  const invoiceNumber = table.invoiceNo || getNextInvoiceNumber();
  const currentDate = table.date || getTodayDateString();
  const orderTime = formatReceiptTime(table.orderTime || table.createdAt || table.orderTimestamp);
  const tableCapacity = Number(table.capacity) || 0;
  const guestCount =
    (Number(table.guests) > 0 ? Number(table.guests) : null) ??
    (Number(table.occupiedChairs) > 0 ? Number(table.occupiedChairs) : null) ??
    (tableCapacity > 0 ? tableCapacity : null) ??
    2;

  // Determine if this bill has been settled and paid vs an unsettled active customer check
  const isSettled = Boolean(
    (table.isPaid === true ||
     table.settled === true ||
     String(table.status || '').toLowerCase() === 'settled' ||
     String(table.status || '').toLowerCase() === 'paid' ||
     Boolean(table.settledAt)) &&
    String(table.status || '').toLowerCase() !== 'occupied' &&
    String(table.status || '').toLowerCase() !== 'active'
  );

  const paidTime = isSettled
    ? formatReceiptTime(table.settledAt || (table.paymentMethod ? table.time : null))
    : null;

  const paymentMethod = isSettled
    ? (table.paymentMethod ? table.paymentMethod.toUpperCase() : (table.paymentMode ? table.paymentMode.toUpperCase() : 'PAID'))
    : null;

  const handlePrint = async () => {
    await printSurface("printable-receipt", {
      title: `Invoice ${invoiceNumber}`,
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
        background: 'var(--modal-overlay)',
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
          background: 'var(--bg-card)',
          color: 'var(--text-main)',
          width: '100%',
          maxWidth: printFormat === 'a4' ? '760px' : '400px',
          borderRadius: '12px',
          boxShadow: '0 25px 65px rgba(0,0,0,0.85), 0 0 35px rgba(245, 158, 11, 0.25)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '94vh',
          transition: 'max-width 0.2s ease'
        }}
      >
        {/* Receipt Controls Bar (hidden during print) */}
        <div className="no-print" style={{
          background: 'var(--bg-secondary)',
          padding: '0.55rem 1rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.5rem',
          color: 'var(--text-main)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
            <Printer size={16} color="#f59e0b" />
            <span style={{ fontSize: '0.86rem', fontWeight: 800 }}>Invoice & Bill Print</span>
          </div>

          {/* Print Format Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(var(--surface-rgb),0.08)', padding: '2px', borderRadius: '6px' }}>
            <button
              type="button"
              onClick={() => setPrintFormat('thermal')}
              style={{
                padding: '4px 10px',
                fontSize: '0.72rem',
                fontWeight: 700,
                borderRadius: '4px',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                background: printFormat === 'thermal' ? '#f59e0b' : 'transparent',
                color: printFormat === 'thermal' ? '#000000' : 'var(--text-muted)',
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
                fontSize: '0.72rem',
                fontWeight: 700,
                borderRadius: '4px',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                background: printFormat === 'a4' ? '#f59e0b' : 'transparent',
                color: printFormat === 'a4' ? '#000000' : 'var(--text-muted)',
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
              background: 'rgba(var(--surface-rgb),0.1)',
              border: 'none',
              color: 'var(--text-dim)',
              width: '26px',
              height: '26px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
            title="Close receipt popup"
          >
            <X size={15} />
          </button>
        </div>

        {/* PRINTABLE RECEIPT CONTENT */}
        {printFormat === 'thermal' ? (
          /* ======================================================= */
          /* 1. THERMAL 80MM RECEIPT FORMAT (POS ROLL PRINTER)      */
          /* ======================================================= */
          <div 
            id="printable-receipt" 
            className="format-thermal" 
            style={{
              padding: '0.75rem 1rem 0.5rem',
              fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
              fontSize: '0.78rem',
              lineHeight: '1.35',
              color: '#000000',
              display: 'flex',
              flexDirection: 'column',
              flex: '1 1 auto',
              minHeight: 0,
              overflowY: 'auto'
            }}
          >
            {/* Restaurant Header */}
            <div style={{ textAlign: 'center', borderBottom: '1px dashed #000000', paddingBottom: '0.45rem', marginBottom: '0.45rem' }}>
              {restaurantSettings.logo && (
                <img
                  src={restaurantSettings.logo}
                  alt={`${restaurantName} logo`}
                  style={{ maxWidth: '72px', maxHeight: '44px', objectFit: 'contain', margin: '0 auto 4px', display: 'block' }}
                />
              )}
              <h2 style={{ fontSize: '1.1rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#000000', margin: 0 }}>
                {restaurantName}
              </h2>
              {restaurantTagline && <p style={{ fontSize: '0.7rem', fontWeight: 700, color: '#000000', margin: '2px 0' }}>{restaurantTagline}</p>}
              {(restaurantAddress || restaurantPhone) && <p style={{ fontSize: '0.66rem', color: '#333333', margin: '1px 0' }}>{[restaurantAddress, restaurantPhone].filter(Boolean).join(' • ')}</p>}
              {restaurantGstin && <p style={{ fontSize: '0.66rem', fontWeight: 700, color: '#000000', margin: '1px 0' }}>GSTIN: {restaurantGstin}</p>}

              {/* Clear Paid vs Unpaid Status Badge */}
              <div style={{
                textAlign: 'center',
                fontSize: '0.72rem',
                fontWeight: 900,
                letterSpacing: '0.04em',
                padding: '3px 6px',
                margin: '5px 0 2px',
                borderRadius: '4px',
                border: isSettled ? '1.5px solid #16a34a' : '1.5px dashed #dc2626',
                color: isSettled ? '#15803d' : '#b91c1c',
                background: isSettled ? 'rgba(22, 163, 74, 0.08)' : 'rgba(220, 38, 38, 0.08)'
              }}>
                {isSettled
                  ? '★ PAID TAX INVOICE ★'
                  : '⚠ GUEST BILL / ESTIMATE — UNPAID (PAYMENT DUE) ⚠'}
              </div>
            </div>

            {/* Bill Meta Grid */}
            <div style={{ borderBottom: '1px dashed #000000', paddingBottom: '0.45rem', marginBottom: '0.45rem', fontSize: '0.72rem', display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, auto)', gap: '4px 10px' }}>
              <span style={{ minWidth: 0, overflowWrap: 'anywhere' }}>Table: <strong>{table.name || `Table ${table.id}`} ({table.section || 'Dine-In'})</strong></span>
              <span style={{ whiteSpace: 'nowrap', textAlign: 'right' }}>Inv: <strong>{invoiceNumber}</strong></span>
              <span style={{ minWidth: 0, overflowWrap: 'anywhere' }}>Server: <strong>{table.server || 'Staff'}</strong></span>
              <span style={{ whiteSpace: 'nowrap', textAlign: 'right' }}>Guests: <strong>{guestCount}</strong></span>
              <span>Date: <strong>{currentDate}</strong></span>
              {orderTime && <span style={{ textAlign: 'right' }}>Order: <strong>{orderTime}</strong></span>}
              {isSettled ? (
                <>
                  {paidTime && <span>Paid: <strong>{paidTime}</strong></span>}
                  <span style={{ textAlign: 'right', fontWeight: 800, color: '#15803d' }}>
                    Mode: <strong>{paymentMethod ? `${paymentMethod} (PAID)` : 'PAID'}</strong>
                  </span>
                </>
              ) : (
                <>
                  <span style={{ color: '#b91c1c', fontWeight: 800 }}>Payment: <strong>UNPAID</strong></span>
                  <span style={{ textAlign: 'right', fontWeight: 800, color: '#b91c1c' }}>Status: <strong>BILL DUE</strong></span>
                </>
              )}
            </div>

            {/* Itemized Table Header */}
            <div style={{ marginBottom: '0.45rem' }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: '3fr 1fr 1fr 1.2fr',
                fontWeight: 800,
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
                {items.map(item => (
                  <div
                    key={item.id || item.name}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '3fr 1fr 1fr 1.2fr',
                      fontSize: '0.74rem',
                      padding: '2px 0',
                      borderBottom: '1px dotted rgba(0,0,0,0.12)'
                    }}
                  >
                    <span style={{ fontWeight: 600, wordBreak: 'break-word', whiteSpace: 'normal', paddingRight: '4px' }}>
                      {item.name || "Item"}
                    </span>
                    <span style={{ textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}>{item.quantity}</span>
                    <span style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>₹{item.price}</span>
                    <span style={{ textAlign: 'right', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                      ₹{(item.price * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Calculation Breakdown */}
            <div style={{ borderTop: '1px dashed #000000', paddingTop: '0.4rem', display: 'flex', flexDirection: 'column', gap: '3px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem' }}>
                <span>Subtotal:</span>
                <span style={{ fontVariantNumeric: 'tabular-nums' }}>₹{subtotal.toFixed(2)}</span>
              </div>

              {(discountAmount > 0 || discountPercent > 0) && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', fontWeight: 800 }}>
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

              {/* TOTAL PAYABLE: Crisp Thermal Lines (No ink smearing) */}
              <div 
                className="receipt-total-box"
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  borderTop: '2px dashed #000000',
                  borderBottom: '2px solid #000000',
                  padding: '7px 2px',
                  marginTop: '5px',
                  fontWeight: 900
                }}
              >
                <span style={{ fontSize: '0.9rem', letterSpacing: '0.02em', color: '#000000' }}>
                  TOTAL PAYABLE:
                </span>
                <span style={{ fontSize: '1.2rem', color: '#000000', fontVariantNumeric: 'tabular-nums' }}>
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
                  borderRadius: '3px'
                }}>
                  *** BILL DUE — PLEASE SETTLE AT CASHIER ***
                </div>
              )}
            </div>

            {/* Thermal Footer */}
            <div style={{ textAlign: 'center', marginTop: '0.45rem', paddingTop: '0.4rem', borderTop: '1px dashed #000000' }}>
              <p style={{ fontSize: '0.72rem', fontWeight: 800, color: '#000000', margin: '2px 0 0' }}>
                {isSettled
                  ? `THANK YOU FOR DINING AT ${restaurantName.toUpperCase()}!`
                  : `THANK YOU FOR VISITING ${restaurantName.toUpperCase()}!`}
              </p>
              <p style={{ fontSize: '0.64rem', color: '#444444', margin: '1px 0 0' }}>
                Please visit again{restaurantPhone ? ` • For orders: ${restaurantPhone}` : ""}
              </p>
            </div>
          </div>
        ) : (
          /* ======================================================= */
          /* 2. A4 FULL PAGE TAX INVOICE FORMAT (PDF / DESKTOP PRINT)*/
          /* ======================================================= */
          <div 
            id="printable-receipt" 
            className="format-a4" 
            style={{
              padding: '1.5rem 1.75rem',
              fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
              fontSize: '0.84rem',
              lineHeight: '1.45',
              color: '#0f172a',
              display: 'flex',
              flexDirection: 'column',
              flex: '1 1 auto',
              minHeight: 0,
              overflowY: 'auto'
            }}
          >
            {/* A4 Tax Invoice Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #0f172a', paddingBottom: '0.85rem', marginBottom: '0.85rem' }}>
              <div style={{ display: 'flex', gap: '0.85rem', alignItems: 'center' }}>
                {restaurantSettings.logo && (
                  <img src={restaurantSettings.logo} alt="Logo" style={{ maxHeight: '56px', maxWidth: '80px', objectFit: 'contain' }} />
                )}
                <div>
                  <h1 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.03em', color: '#0f172a' }}>
                    {restaurantName}
                  </h1>
                  {restaurantTagline && <div style={{ fontSize: '0.76rem', fontWeight: 700, color: '#f59e0b' }}>{restaurantTagline}</div>}
                  {(restaurantAddress || restaurantPhone) && <div style={{ fontSize: '0.72rem', color: '#475569', marginTop: '2px' }}>{[restaurantAddress, restaurantPhone].filter(Boolean).join(' • ')}</div>}
                  {restaurantGstin && <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#0f172a', marginTop: '1px' }}>GSTIN: {restaurantGstin}</div>}
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '1.1rem', fontWeight: 900, color: isSettled ? '#0f172a' : '#b91c1c', letterSpacing: '0.04em' }}>
                  {isSettled ? 'TAX INVOICE' : 'GUEST ESTIMATE / UNPAID BILL'}
                </div>
                <div style={{ fontSize: '0.72rem', color: isSettled ? '#15803d' : '#b91c1c', fontWeight: 800 }}>
                  {isSettled ? 'Original for Recipient (Settled & Paid)' : 'PAYMENT DUE — UNSETTLED'}
                </div>
                <div style={{ fontSize: '0.86rem', fontWeight: 800, marginTop: '4px' }}>Invoice: #{invoiceNumber}</div>
                <div style={{ fontSize: '0.74rem', color: '#475569' }}>
                  Date: {currentDate} {orderTime ? `• Order: ${orderTime}` : ''} {paidTime ? `• Paid: ${paidTime}` : ''}
                </div>
              </div>
            </div>

            {/* Table / Order Meta Strip */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem', background: '#f8fafc', padding: '0.65rem 0.85rem', borderRadius: '6px', border: '1px solid #e2e8f0', marginBottom: '0.85rem', fontSize: '0.78rem' }}>
              <div><span style={{ color: '#64748b' }}>Table:</span> <strong>{table.name || `Table ${table.id}`} ({table.section || 'Dine-In'})</strong></div>
              <div><span style={{ color: '#64748b' }}>Server:</span> <strong>{table.server || 'Staff'}</strong></div>
              <div><span style={{ color: '#64748b' }}>Guests:</span> <strong>{guestCount} Persons</strong></div>
              <div>
                <span style={{ color: '#64748b' }}>Payment Status:</span>{' '}
                <strong style={{ color: isSettled ? '#16a34a' : '#dc2626' }}>
                  {isSettled ? (paymentMethod ? `${paymentMethod} (PAID)` : 'PAID') : 'UNPAID / BILL DUE'}
                </strong>
              </div>
            </div>

            {/* Itemized Table */}
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '1rem', fontSize: '0.8rem' }}>
              <thead>
                <tr style={{ background: '#0f172a', color: '#ffffff', textAlign: 'left' }}>
                  <th style={{ padding: '7px 8px', width: '36px', textAlign: 'center' }}>#</th>
                  <th style={{ padding: '7px 8px' }}>Item Description</th>
                  <th style={{ padding: '7px 8px', textAlign: 'center', width: '60px' }}>Qty</th>
                  <th style={{ padding: '7px 8px', textAlign: 'right', width: '90px' }}>Rate (₹)</th>
                  <th style={{ padding: '7px 8px', textAlign: 'right', width: '100px' }}>Amount (₹)</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0', background: idx % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                    <td style={{ padding: '6px 8px', textAlign: 'center', color: '#64748b' }}>{idx + 1}</td>
                    <td style={{ padding: '6px 8px', fontWeight: 600 }}>{item.name}</td>
                    <td style={{ padding: '6px 8px', textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}>{item.quantity}</td>
                    <td style={{ padding: '6px 8px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>₹{item.price.toFixed(2)}</td>
                    <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>₹{(item.price * item.quantity).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Summary Calculations & In-Words */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1.5rem' }}>
              <div style={{ flex: 1, fontSize: '0.78rem', color: '#475569', background: '#f8fafc', padding: '0.75rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontWeight: 800, color: '#0f172a', marginBottom: '3px' }}>Amount in Words:</div>
                <div style={{ fontStyle: 'italic', fontWeight: 700, color: '#0f172a' }}>{amountToWords(grandTotal)}</div>
                <div style={{ marginTop: '10px', fontSize: '0.72rem', borderTop: '1px dashed #cbd5e1', paddingTop: '5px' }}>
                  • GST calculated under restaurant dining scheme.<br />
                  • Thank you for visiting {restaurantName}!
                </div>
              </div>

              <div style={{ width: '260px', display: 'flex', flexDirection: 'column', gap: '3px', fontSize: '0.8rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1px 0' }}>
                  <span style={{ color: '#64748b' }}>Subtotal:</span>
                  <span style={{ fontVariantNumeric: 'tabular-nums' }}>₹{subtotal.toFixed(2)}</span>
                </div>
                {(discountAmount > 0 || discountPercent > 0) && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#16a34a', fontWeight: 700, padding: '1px 0' }}>
                    <span>Discount ({discountPercent}%):</span>
                    <span style={{ fontVariantNumeric: 'tabular-nums' }}>-₹{discountAmount.toFixed(2)}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1px 0' }}>
                  <span style={{ color: '#64748b' }}>Taxable Value:</span>
                  <span style={{ fontVariantNumeric: 'tabular-nums' }}>₹{taxableAmount.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', padding: '1px 0' }}>
                  <span>CGST (2.5%):</span>
                  <span style={{ fontVariantNumeric: 'tabular-nums' }}>₹{cgst.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', padding: '1px 0' }}>
                  <span>SGST (2.5%):</span>
                  <span style={{ fontVariantNumeric: 'tabular-nums' }}>₹{sgst.toFixed(2)}</span>
                </div>
                {serviceChargeAmount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', padding: '1px 0' }}>
                    <span>Service Charge ({serviceChargePercent}%):</span>
                    <span style={{ fontVariantNumeric: 'tabular-nums' }}>₹{serviceChargeAmount.toFixed(2)}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '2px solid #0f172a', borderBottom: '2px solid #0f172a', padding: '6px 0', marginTop: '4px', fontSize: '1.05rem', fontWeight: 900 }}>
                  <span>Total Payable:</span>
                  <span style={{ color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>₹{grandTotal.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Signatures */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2rem', paddingTop: '0.75rem', borderTop: '1px solid #e2e8f0', fontSize: '0.76rem', color: '#64748b' }}>
              <div>Customer Signature</div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: 700, color: '#0f172a' }}>For {restaurantName}</div>
                <div style={{ marginTop: '1.75rem' }}>Authorized Signatory</div>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons (no print) */}
        <div className="no-print" style={{
          padding: '0.5rem 1rem',
          background: 'var(--bg-secondary)',
          borderTop: '1px solid var(--border-card)',
          display: 'flex',
          gap: '0.65rem'
        }}>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: '0.48rem',
              borderRadius: '6px',
              background: 'var(--bg-tertiary)',
              color: 'var(--text-main)',
              fontWeight: 700,
              fontSize: '0.78rem',
              border: 'none',
              cursor: 'pointer'
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
              padding: '0.48rem',
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
              Print {isSettled ? (printFormat === 'a4' ? 'A4 Tax Invoice' : 'Thermal Receipt') : (printFormat === 'a4' ? 'A4 Bill (Unpaid)' : 'Bill / Estimate')}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default ReceiptModal;
