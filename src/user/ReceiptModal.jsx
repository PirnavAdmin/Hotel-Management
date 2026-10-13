import React from 'react';
import { Printer, X } from 'lucide-react';
import { formatCurrency } from '../utils/formatCurrency';
import { getNextInvoiceNumber } from '../utils/invoiceCounter';

const formatReceiptTime = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isFinite(date.getTime()) && (typeof value === 'number' || /^\d{4}-\d{2}-\d{2}T/.test(String(value)))) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  return String(value);
};

export function ReceiptModal({ table, onClose, onPrint }) {
  if (!table) return null;

  const items = table.items || [];
  const subtotal = table.subtotal !== undefined
    ? table.subtotal
    : items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  
  const discountAmount = table.discountAmount !== undefined
    ? table.discountAmount
    : (subtotal * (table.discountPercent || 0)) / 100;

  const taxableAmount = Math.max(0, subtotal - discountAmount);
  const taxRate = 0.05; // 5% GST
  
  const taxAmount = table.taxAmount !== undefined
    ? table.taxAmount
    : taxableAmount * taxRate;
  
  const cgst = taxAmount / 2;
  const sgst = taxAmount / 2;
  
  const serviceChargeAmount = table.serviceChargeAmount !== undefined
    ? table.serviceChargeAmount
    : (table.serviceCharge ? (taxableAmount * (table.serviceCharge / 100)) : 0);
  
  const grandTotal = table.grandTotal !== undefined
    ? table.grandTotal
    : Math.round(taxableAmount + taxAmount + serviceChargeAmount);

  const invoiceNumber = table.invoiceNo || getNextInvoiceNumber();
  const currentDate = table.date || new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
  const orderTime = formatReceiptTime(table.orderTime || table.createdAt || table.orderTimestamp);
  const paidTime = formatReceiptTime(table.settledAt || table.time);
  const tableCapacity = Number(table.capacity) || 0;
  const guestCount =
    (Number(table.guests) > 0 ? Number(table.guests) : null) ??
    (Number(table.occupiedChairs) > 0 ? Number(table.occupiedChairs) : null) ??
    (tableCapacity > 0 ? tableCapacity : null) ??
    2;
  const paymentMethod = table.paymentMethod ? table.paymentMethod.toUpperCase() : null;

  const handlePrint = () => {
    window.print();
    if (onPrint) onPrint();
  };

  return (
    <div 
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.82)',
        backdropFilter: 'blur(10px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2500, // On top of all other modals (Invoices, KOT, etc.)
        padding: '0.75rem',
        animation: 'fadeIn 0.15s ease'
      }}
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#ffffff',
          color: '#1a1a1a',
          width: '100%',
          maxWidth: '380px',
          borderRadius: '12px',
          boxShadow: '0 25px 65px rgba(0,0,0,0.85), 0 0 35px rgba(245, 158, 11, 0.25)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '94vh'
        }}
      >
        {/* Receipt Controls Bar (hidden during print) */}
        <div className="no-print" style={{
          background: '#0f172a',
          padding: '0.45rem 1rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          color: '#ffffff'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
            <Printer size={16} color="#f59e0b" />
            <span style={{ fontSize: '0.84rem', fontWeight: 800 }}>Tax Invoice / Bill Receipt</span>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              border: 'none',
              color: '#94a3b8',
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

        {/* Printable Thermal Receipt Paper (Fits Entire Bill on One Screen) */}
        <div id="printable-receipt" style={{
          padding: '0.75rem 1rem 0.5rem',
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '0.78rem',
          lineHeight: '1.35',
          color: '#1e293b',
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
          overflowY: 'auto'
        }}>
          {/* Restaurant Header */}
          <div style={{ textAlign: 'center', borderBottom: '1px dashed #cbd5e1', paddingBottom: '0.45rem', marginBottom: '0.45rem' }}>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#0f172a', margin: 0 }}>
              AVSR FOOD COURT
            </h2>
            <p style={{ fontSize: '0.68rem', fontWeight: 700, color: '#f59e0b', margin: '1px 0' }}>Authentic Dum Biryani & Dining</p>
            <p style={{ fontSize: '0.64rem', color: '#64748b', margin: 0 }}>Plot 12, Food Street, Jubilee Enclave • Ph: +91 98490 12345</p>
            <p style={{ fontSize: '0.64rem', color: '#64748b', margin: 0 }}>GSTIN: 36AAJCS8214M1ZV</p>
          </div>

          {/* Bill details use separate grid cells to prevent wrapping guest counts and times */}
          <div style={{ borderBottom: '1px dashed #cbd5e1', paddingBottom: '0.45rem', marginBottom: '0.45rem', fontSize: '0.7rem', display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, auto)', gap: '4px 10px' }}>
            <span style={{ minWidth: 0, overflowWrap: 'anywhere' }}>Table: <strong>{table.name || `Table ${table.id}`} ({table.section || 'Dine-In'})</strong></span>
            <span style={{ whiteSpace: 'nowrap', textAlign: 'right' }}>Inv: <strong style={{ color: '#0f172a', fontFamily: 'monospace' }}>{invoiceNumber}</strong></span>
            <span style={{ minWidth: 0, overflowWrap: 'anywhere' }}>Server: <strong>{table.server || 'Staff'}</strong></span>
            <span style={{ whiteSpace: 'nowrap', textAlign: 'right' }}>Guests: <strong>{guestCount}</strong></span>
            <span>Date: <strong>{currentDate}</strong></span>
            {orderTime && <span style={{ textAlign: 'right' }}>Order: <strong>{orderTime}</strong></span>}
            {paidTime && <span>Paid: <strong>{paidTime}</strong></span>}
            {paymentMethod && <span style={{ textAlign: 'right', color: '#15803d', fontWeight: 800 }}>{paymentMethod}</span>}
          </div>

          {/* Itemized Table */}
          <div style={{ marginBottom: '0.45rem' }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: '3fr 1fr 1fr 1.2fr',
              fontWeight: 700,
              fontSize: '0.7rem',
              borderBottom: '1px solid #0f172a',
              paddingBottom: '3px',
              marginBottom: '3px',
              color: '#0f172a'
            }}>
              <span>ITEM</span>
              <span style={{ textAlign: 'center' }}>QTY</span>
              <span style={{ textAlign: 'right' }}>RATE</span>
              <span style={{ textAlign: 'right' }}>AMOUNT</span>
            </div>

            {/* Scrollable item list if many items, without pushing total down */}
            <div 
              style={{
                maxHeight: '22vh',
                overflowY: 'auto'
              }}
              className="receipt-items-scroll"
            >
              {items.map(item => (
                <div
                  key={item.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '3fr 1fr 1fr 1.2fr',
                    fontSize: '0.72rem',
                    padding: '2px 0'
                  }}
                >
                  <span style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.name}
                  </span>
                  <span style={{ textAlign: 'center' }}>{item.quantity}</span>
                  <span style={{ textAlign: 'right' }}>₹{item.price}</span>
                  <span style={{ textAlign: 'right', fontWeight: 700 }}>
                    ₹{(item.price * item.quantity)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Calculation Breakdown in Rupees */}
          <div style={{ borderTop: '1px dashed #cbd5e1', paddingTop: '0.4rem', display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem' }}>
              <span>Subtotal:</span>
              <span>₹{subtotal.toFixed(2)}</span>
            </div>

            {table.discountPercent > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#16a34a' }}>
                <span>Discount ({table.discountPercent}%):</span>
                <span>-₹{discountAmount.toFixed(2)}</span>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: '#64748b' }}>
              <span>CGST (2.5%) + SGST (2.5%):</span>
              <span>₹{cgst.toFixed(2)} + ₹{sgst.toFixed(2)} (₹{taxAmount.toFixed(2)})</span>
            </div>

            {serviceChargeAmount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: '#64748b' }}>
                <span>Service Charge ({table.serviceCharge}%):</span>
                <span>₹{serviceChargeAmount.toFixed(2)}</span>
              </div>
            )}

            {/* HIGHLIGHTED TOTAL PAYABLE - 100% VISIBLE WITHOUT SCROLLING */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: '#0f172a',
              color: '#ffffff',
              borderRadius: '6px',
              padding: '6px 10px',
              marginTop: '4px',
              fontWeight: 900
            }}>
              <span style={{ fontSize: '0.84rem', letterSpacing: '0.02em', color: '#f8fafc' }}>
                TOTAL PAYABLE:
              </span>
              <span style={{ fontSize: '1.15rem', color: '#fbbf24', fontFamily: 'monospace' }}>
                ₹{grandTotal.toFixed(2)}
              </span>
            </div>
          </div>

          <div style={{ textAlign: 'center', marginTop: '0.45rem', paddingTop: '0.4rem', borderTop: '1px dashed #cbd5e1' }}>
            <p style={{ fontSize: '0.68rem', fontWeight: 800, color: '#0f172a', margin: '2px 0 0' }}>
              THANK YOU FOR DINING AT AVSR FOOD COURT!
            </p>
            <p style={{ fontSize: '0.62rem', color: '#64748b', margin: '1px 0 0' }}>
              Please visit again â€¢ For bulk orders: +91 98490 12345
            </p>
          </div>
        </div>

        {/* Action Buttons (no print) */}
        <div className="no-print" style={{
          padding: '0.5rem 1rem',
          background: '#f8fafc',
          borderTop: '1px solid #e2e8f0',
          display: 'flex',
          gap: '0.65rem'
        }}>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: '0.48rem',
              borderRadius: '6px',
              background: '#e2e8f0',
              color: '#334155',
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
              gap: '0.4rem',
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
            <span>Print Receipt</span>
          </button>
        </div>
      </div>
    </div>
  );
}
