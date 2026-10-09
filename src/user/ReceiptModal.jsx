import React from 'react';
import { Printer, X } from 'lucide-react';
import { formatCurrency } from '../utils/formatCurrency';
import { getNextInvoiceNumber } from '../utils/invoiceCounter';

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
  const currentTime = table.settledAt || table.time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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
        padding: '1rem',
        animation: 'fadeIn 0.15s ease'
      }}
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#ffffff',
          color: '#1a1a1a',
          width: '100%',
          maxWidth: '390px',
          borderRadius: '16px',
          boxShadow: '0 25px 65px rgba(0,0,0,0.85), 0 0 35px rgba(245, 158, 11, 0.25)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '90vh'
        }}
      >
        {/* Receipt Controls Bar (hidden during print) */}
        <div className="no-print" style={{
          background: '#0f172a',
          padding: '0.85rem 1.25rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          color: '#ffffff'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Printer size={18} color="#f59e0b" />
            <span style={{ fontSize: '0.9rem', fontWeight: 800 }}>Tax Invoice / Bill Receipt</span>
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
            title="Close receipt popup"
          >
            <X size={16} />
          </button>
        </div>

        {/* Printable Thermal Receipt Paper */}
        <div id="printable-receipt" style={{
          padding: '1.5rem',
          overflowY: 'auto',
          flex: 1,
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '0.82rem',
          lineHeight: '1.4',
          color: '#1e293b'
        }}>
          {/* Restaurant Header */}
          <div style={{ textAlign: 'center', borderBottom: '1px dashed #cbd5e1', paddingBottom: '0.85rem', marginBottom: '0.85rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#0f172a' }}>
              AVSR FOOD COURT
            </h2>
            <p style={{ fontSize: '0.74rem', fontWeight: 700, color: '#f59e0b' }}>Authentic Dum Biryani & Dining</p>
            <p style={{ fontSize: '0.7rem', color: '#64748b' }}>Plot 12, Food Street, Jubilee Enclave</p>
            <p style={{ fontSize: '0.7rem', color: '#64748b' }}>Ph: +91 98490 12345 • GSTIN: 36AAJCS8214M1ZV</p>
          </div>

          {/* Bill Meta */}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.35rem' }}>
            <span>Table: <strong>{table.name || `Table ${table.id}`} ({table.section || 'Dine-In'})</strong></span>
            <span>Guests: <strong>{table.guests || 2}</strong></span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.35rem' }}>
            <span>Server: <strong>{table.server || 'Staff'}</strong></span>
            <span>Inv: <strong style={{ color: '#0f172a', fontFamily: 'monospace' }}>{invoiceNumber}</strong></span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.85rem', borderBottom: '1px dashed #cbd5e1', paddingBottom: '0.65rem' }}>
            <span>Date: {currentDate}</span>
            <span>Time: {currentTime} {paymentMethod && <strong style={{ color: '#16a34a' }}>• {paymentMethod}</strong>}</span>
          </div>

          {/* Itemized Table */}
          <div style={{ marginBottom: '0.85rem' }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: '3fr 1fr 1fr 1.2fr',
              fontWeight: 700,
              fontSize: '0.74rem',
              borderBottom: '1px solid #0f172a',
              paddingBottom: '4px',
              marginBottom: '6px'
            }}>
              <span>ITEM</span>
              <span style={{ textAlign: 'center' }}>QTY</span>
              <span style={{ textAlign: 'right' }}>RATE</span>
              <span style={{ textAlign: 'right' }}>AMOUNT</span>
            </div>

            {table.items.map(item => (
              <div
                key={item.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '3fr 1fr 1fr 1.2fr',
                  fontSize: '0.75rem',
                  padding: '3px 0'
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

          {/* Calculation Breakdown in Rupees */}
          <div style={{ borderTop: '1px dashed #cbd5e1', paddingTop: '0.65rem', display: 'flex', flexDirection: 'column', gap: '3px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Subtotal:</span>
              <span>₹{subtotal.toFixed(2)}</span>
            </div>

            {table.discountPercent > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#16a34a' }}>
                <span>Discount ({table.discountPercent}%):</span>
                <span>-₹{discountAmount.toFixed(2)}</span>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#64748b' }}>
              <span>CGST (2.5%):</span>
              <span>₹{cgst.toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#64748b' }}>
              <span>SGST (2.5%):</span>
              <span>₹{sgst.toFixed(2)}</span>
            </div>

            {serviceChargeAmount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Service Charge ({table.serviceCharge}%):</span>
                <span>₹{serviceChargeAmount.toFixed(2)}</span>
              </div>
            )}

            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              borderTop: '2px solid #0f172a',
              borderBottom: '2px solid #0f172a',
              padding: '6px 0',
              marginTop: '6px',
              fontWeight: 800,
              fontSize: '1rem',
              color: '#0f172a'
            }}>
              <span>TOTAL PAYABLE:</span>
              <span>₹{grandTotal.toFixed(2)}</span>
            </div>
          </div>

          {/* Payment QR / Footer message */}
          <div style={{ textAlign: 'center', marginTop: '1rem', paddingTop: '0.85rem', borderTop: '1px dashed #cbd5e1' }}>
            <div style={{
              display: 'inline-block',
              padding: '6px',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '6px',
              marginBottom: '0.5rem'
            }}>
              <div style={{
                width: '74px',
                height: '74px',
                background: 'repeating-linear-gradient(45deg, #0f172a, #0f172a 4px, #ffffff 4px, #ffffff 8px)',
                borderRadius: '4px',
                margin: '0 auto'
              }} />
              <span style={{ fontSize: '0.62rem', color: '#64748b', display: 'block', marginTop: '2px' }}>
                Scan UPI QR (GPay / PhonePe / Paytm)
              </span>
            </div>

            <p style={{ fontSize: '0.76rem', fontWeight: 800, color: '#0f172a' }}>
              THANK YOU FOR DINING AT AVSR FOOD COURT!
            </p>
            <p style={{ fontSize: '0.66rem', color: '#64748b', marginTop: '2px' }}>
              Please visit again • For catering & bulk orders: +91 98490 12345
            </p>
          </div>
        </div>

        {/* Action Buttons (no print) */}
        <div className="no-print" style={{
          padding: '1rem 1.25rem',
          background: '#f8fafc',
          borderTop: '1px solid #e2e8f0',
          display: 'flex',
          gap: '0.75rem'
        }}>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: '0.65rem',
              borderRadius: '8px',
              background: '#e2e8f0',
              color: '#334155',
              fontWeight: 700,
              fontSize: '0.82rem'
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
              padding: '0.65rem',
              borderRadius: '8px',
              background: '#f59e0b',
              color: '#000000',
              fontWeight: 800,
              fontSize: '0.85rem',
              boxShadow: '0 2px 8px rgba(245, 158, 11, 0.4)'
            }}
          >
            <Printer size={16} />
            <span>Print Receipt</span>
          </button>
        </div>
      </div>
    </div>
  );
}
