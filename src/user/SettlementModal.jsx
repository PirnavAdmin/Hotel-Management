import React, { useState } from 'react';
import { 
  X, 
  Banknote, 
  CreditCard, 
  QrCode, 
  CheckCircle2, 
  Calculator, 
  Receipt,
  Calendar,
  Clock
} from 'lucide-react';
import { sounds } from '../utils/audio';
import { formatCurrency } from '../utils/formatCurrency';

export function SettlementModal({ table, onClose, onConfirmPayment }) {
  if (!table) return null;

  const subtotal = table.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const discountAmount = (subtotal * (table.discountPercent || 0)) / 100;
  const taxableAmount = Math.max(0, subtotal - discountAmount);
  const taxRate = 0.05;
  const taxAmount = taxableAmount * taxRate;
  const serviceChargeAmount = table.serviceCharge ? (taxableAmount * (table.serviceCharge / 100)) : 0;
  const baseTotal = Math.round(taxableAmount + taxAmount + serviceChargeAmount);

  const [paymentMethod, setPaymentMethod] = useState('upi'); // upi | cash | card
  const [tipPercent, setTipPercent] = useState(0);
  const [cashTendered, setCashTendered] = useState(baseTotal);
  const [isProcessing, setIsProcessing] = useState(false);

  const tipAmount = Math.round((baseTotal * tipPercent) / 100);
  const grandTotal = baseTotal + tipAmount;
  const changeDue = Math.max(0, (parseFloat(cashTendered) || 0) - grandTotal);

  const handleSettle = () => {
    setIsProcessing(true);
    sounds.playSuccess();

    setTimeout(() => {
      onConfirmPayment({
        tableId: table.id,
        tableName: table.name,
        section: table.section,
        server: table.server,
        items: [...table.items],
        subtotal,
        discountAmount,
        taxAmount,
        serviceChargeAmount,
        tipAmount,
        grandTotal,
        paymentMethod,
        cashTendered: paymentMethod === 'cash' ? cashTendered : grandTotal,
        changeDue: paymentMethod === 'cash' ? changeDue : 0,
        settledAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        date: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
        invoiceNo: `INV-${table.id}${Date.now().toString().slice(-4)}`
      });
    }, 500);
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0, 0, 0, 0.75)',
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
        maxWidth: '520px',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-lg)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Header */}
        <div style={{
          padding: '1.1rem 1.5rem',
          borderBottom: '1px solid var(--border-subtle)',
          background: 'var(--bg-tertiary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)' }}>
              Settle Bill — {table.name}
            </h3>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
              <span>{table.section}</span>
              <span>•</span>
              <span>{table.guests} Guests</span>
              <span>•</span>
              <span>Server: <strong>{table.server}</strong></span>
              <span>•</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', color: 'var(--accent-amber-light)', fontWeight: 700 }}>
                <Calendar size={12} color="var(--accent-amber)" />
                {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
              </span>
              <span>•</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', color: 'var(--accent-amber-light)', fontWeight: 700 }}>
                <Clock size={12} color="var(--accent-amber)" />
                {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.06)',
              color: 'var(--text-muted)',
              padding: '6px',
              borderRadius: '6px',
              display: 'flex'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* Bill Summary Banner in Rupees */}
          <div style={{
            background: 'var(--bg-primary)',
            borderRadius: 'var(--radius-md)',
            padding: '1rem 1.25rem',
            border: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Net Amount Due</span>
              <div className="font-mono" style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--accent-amber-light)' }}>
                {formatCurrency(grandTotal)}
              </div>
            </div>

            <div style={{ textAlign: 'right', fontSize: '0.78rem', color: 'var(--text-dim)' }}>
              <div>Subtotal: {formatCurrency(subtotal)}</div>
              <div>GST (5%): {formatCurrency(taxAmount)}</div>
              {serviceChargeAmount > 0 && <div>Service: {formatCurrency(serviceChargeAmount)}</div>}
            </div>
          </div>

          {/* Payment Method Selector */}
          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '0.45rem' }}>
              Select Payment Mode:
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.65rem' }}>
              {[
                { id: 'upi', label: 'UPI / QR Tap', icon: QrCode },
                { id: 'cash', label: 'Cash Tender', icon: Banknote },
                { id: 'card', label: 'Credit / Debit Card', icon: CreditCard }
              ].map(method => {
                const Icon = method.icon;
                const isSelected = paymentMethod === method.id;

                return (
                  <button
                    key={method.id}
                    onClick={() => setPaymentMethod(method.id)}
                    style={{
                      padding: '0.85rem 0.5rem',
                      borderRadius: 'var(--radius-md)',
                      background: isSelected 
                        ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.3) 0%, rgba(245, 158, 11, 0.12) 100%)' 
                        : 'var(--bg-tertiary)',
                      border: isSelected ? '1px solid var(--accent-amber)' : '1px solid var(--border-subtle)',
                      color: isSelected ? 'var(--accent-amber-light)' : 'var(--text-main)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '0.4rem',
                      fontSize: '0.82rem',
                      fontWeight: 700
                    }}
                  >
                    <Icon size={20} color={isSelected ? 'var(--accent-amber)' : 'var(--text-dim)'} />
                    <span>{method.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Dynamic Payment Method Fields */}
          {paymentMethod === 'upi' && (
            <div style={{
              background: 'var(--bg-primary)',
              borderRadius: 'var(--radius-md)',
              padding: '1.25rem',
              border: '1px solid var(--border-subtle)',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <div style={{
                padding: '8px',
                background: '#ffffff',
                borderRadius: '8px',
                width: '100px',
                height: '100px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <QrCode size={84} color="#0f172a" />
              </div>
              <div style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-main)' }}>
                Scan UPI QR to Pay {formatCurrency(grandTotal)}
              </div>
              <span style={{ fontSize: '0.74rem', color: 'var(--status-vacant)' }}>
                Accepts GPay, PhonePe, Paytm, BHIM & All UPI Apps
              </span>
            </div>
          )}

          {paymentMethod === 'cash' && (
            <div style={{
              background: 'var(--bg-primary)',
              borderRadius: 'var(--radius-md)',
              padding: '1rem',
              border: '1px solid var(--border-subtle)'
            }}>
              <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.35rem' }}>
                Cash Tendered (₹):
              </label>
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.65rem' }}>
                <input
                  type="number"
                  step="10"
                  value={cashTendered}
                  onChange={e => setCashTendered(e.target.value)}
                  style={{
                    flex: 1,
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--accent-amber)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '0.55rem 0.75rem',
                    color: '#ffffff',
                    fontSize: '1.15rem',
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 700
                  }}
                />
                {[grandTotal, 500, 1000, 2000].map((quickVal, i) => (
                  <button
                    key={i}
                    onClick={() => setCashTendered(quickVal)}
                    style={{
                      background: 'var(--bg-tertiary)',
                      color: 'var(--text-main)',
                      border: '1px solid var(--border-subtle)',
                      padding: '0.4rem 0.65rem',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.78rem',
                      fontWeight: 700
                    }}
                  >
                    {i === 0 ? 'Exact' : `₹${quickVal}`}
                  </button>
                ))}
              </div>

              {/* Change calculation */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingTop: '0.5rem',
                borderTop: '1px solid var(--border-subtle)',
                fontSize: '0.85rem'
              }}>
                <span style={{ color: 'var(--text-muted)' }}>Change to Return:</span>
                <span className="font-mono" style={{
                  fontSize: '1.2rem',
                  fontWeight: 800,
                  color: changeDue >= 0 ? 'var(--status-vacant)' : 'var(--danger)'
                }}>
                  {formatCurrency(changeDue)}
                </span>
              </div>
            </div>
          )}

          {paymentMethod === 'card' && (
            <div style={{
              background: 'var(--bg-primary)',
              borderRadius: 'var(--radius-md)',
              padding: '1.25rem',
              border: '1px solid var(--border-subtle)',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <CreditCard size={32} color="var(--accent-amber)" />
              <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-main)' }}>
                Tap or Insert Card on POS Terminal
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', maxWidth: '280px' }}>
                Visa, MasterCard, RuPay & Contactless Tap Supported
              </p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div style={{
          padding: '1rem 1.5rem',
          background: 'var(--bg-tertiary)',
          borderTop: '1px solid var(--border-subtle)',
          display: 'flex',
          gap: '0.75rem'
        }}>
          <button
            onClick={onClose}
            disabled={isProcessing}
            style={{
              flex: 1,
              padding: '0.75rem',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--bg-secondary)',
              color: 'var(--text-muted)',
              fontWeight: 700,
              fontSize: '0.85rem'
            }}
          >
            Cancel
          </button>

          <button
            onClick={handleSettle}
            disabled={isProcessing}
            style={{
              flex: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              padding: '0.75rem',
              borderRadius: 'var(--radius-sm)',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: '#ffffff',
              fontWeight: 800,
              fontSize: '0.9rem',
              boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)'
            }}
          >
            <CheckCircle2 size={18} />
            <span>{isProcessing ? 'Processing...' : `Confirm & Vacate ${table.name}`}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
