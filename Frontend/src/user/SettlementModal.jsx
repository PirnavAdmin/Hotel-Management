import React, { useState, useEffect } from 'react';
import { 
  X, 
  Banknote, 
  CreditCard, 
  QrCode, 
  CheckCircle2, 
  Receipt,
  Calendar,
  Clock,
  Users,
  Building2,
  Wallet,
  Zap,
  ShieldCheck,
  ArrowLeft
} from 'lucide-react';
import { sounds } from '../utils/audio';
import { formatCurrency } from '../utils/formatCurrency';
import { getBusinessDayStart, getNextInvoiceNumber, getTodayDateString } from '../utils/invoiceCounter';
import paymentQrImage from '../assets/payment-qr.png';

export function SettlementModal({ table, menuItems = [], onClose, onConfirmPayment }) {
  // 'upi' | 'cash' | 'card' | 'wallet'
  const [paymentMethod, setPaymentMethod] = useState('upi');
  const [cashTendered, setCashTendered] = useState(0);
  const [selectedWallet, setSelectedWallet] = useState('paytm');
  const [isProcessing, setIsProcessing] = useState(false);

  const [currentTheme, setCurrentTheme] = useState(() => {
    return (
      document.documentElement.getAttribute("data-theme") ||
      localStorage.getItem("gourmet_pos_theme_v2") ||
      "emerald-spice"
    );
  });

  useEffect(() => {
    const handleThemeChange = () => {
      const activeTheme =
        document.documentElement.getAttribute("data-theme") ||
        localStorage.getItem("gourmet_pos_theme_v2") ||
        "emerald-spice";
      setCurrentTheme(activeTheme);
    };

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (
          mutation.type === "attributes" &&
          mutation.attributeName === "data-theme"
        ) {
          handleThemeChange();
        }
      }
    });

    observer.observe(document.documentElement, { attributes: true });
    window.addEventListener("storage", handleThemeChange);

    return () => {
      observer.disconnect();
      window.removeEventListener("storage", handleThemeChange);
    };
  }, []);

  const isLight = currentTheme === "light-bistro";

  const getQrConfig = () => {
    try {
      const saved = localStorage.getItem("gourmet_pos_settings_v1");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed.paymentQrs)) {
          const valid = parsed.paymentQrs.filter((q) => q && q.image);
          if (valid.length > 0) {
            let activeIdx = -1;
            if (parsed.selectedQrId) {
              activeIdx = valid.findIndex((q) => q.id === parsed.selectedQrId);
            }
            if (activeIdx === -1) {
              activeIdx = valid.findIndex((q) => q.active);
            }
            if (activeIdx === -1) {
              activeIdx = 0;
            }
            return { configuredQrs: valid, initialIndex: activeIdx };
          }
        }
      }
    } catch {}
    return {
      configuredQrs: [{ id: "default", label: "Main Counter UPI", image: paymentQrImage, active: true }],
      initialIndex: 0,
    };
  };

  const [qrConfig, setQrConfig] = useState(() => getQrConfig());
  const [selectedQrIndex, setSelectedQrIndex] = useState(qrConfig.initialIndex);

  useEffect(() => {
    const syncQrConfig = () => {
      const latest = getQrConfig();
      setQrConfig(latest);
      setSelectedQrIndex(latest.initialIndex);
    };
    window.addEventListener("storage", syncQrConfig);
    window.addEventListener("focus", syncQrConfig);
    return () => {
      window.removeEventListener("storage", syncQrConfig);
      window.removeEventListener("focus", syncQrConfig);
    };
  }, []);

  const configuredQrs = qrConfig.configuredQrs;
  const activeQr = configuredQrs[selectedQrIndex] || configuredQrs[0];

  const handleSelectQr = (idx) => {
    setSelectedQrIndex(idx);
    const chosenQr = configuredQrs[idx];
    if (chosenQr) {
      try {
        const saved = localStorage.getItem("gourmet_pos_settings_v1");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed.paymentQrs)) {
            parsed.paymentQrs = parsed.paymentQrs.map((q) => ({
              ...q,
              active:
                q.id === chosenQr.id ||
                (chosenQr.id !== "default" && q.image === chosenQr.image),
            }));
          }
          parsed.selectedQrId = chosenQr.id;
          localStorage.setItem("gourmet_pos_settings_v1", JSON.stringify(parsed));
          window.dispatchEvent(new Event("storage"));
        }
      } catch (err) {
        console.error("Failed to update active QR in settings", err);
      }
    }
  };

  if (!table) return null;

  const safeItems = Array.isArray(table?.items) ? table.items : [];
  const normalizedItems = safeItems.map((item) => ({
    ...item,
    name: String(item?.name || item?.dishName || menuItems.find((menuItem) =>
      String(menuItem.id) === String(item?.menuItemId ?? item?.id),
    )?.name || "").trim(),
    quantity: Number(item?.quantity ?? item?.qty) || 0,
    price: Number(item?.price ?? item?.unitPrice),
  }));
  const validItems = normalizedItems.filter((item) =>
    item.name && item.quantity > 0 && Number.isFinite(item.price) && item.price >= 0,
  );
  const hasInvalidItems = safeItems.length === 0 || validItems.length !== safeItems.length;
  const subtotal = validItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const discountAmount = (subtotal * (table?.discountPercent || 0)) / 100;
  const taxableAmount = Math.max(0, subtotal - discountAmount);
  const taxRate = 0.05;
  const taxAmount = taxableAmount * taxRate;
  const serviceChargeAmount = table?.serviceCharge ? (taxableAmount * (table.serviceCharge / 100)) : 0;
  const grandTotal = Math.round(taxableAmount + taxAmount + serviceChargeAmount);

  const effectiveCash = cashTendered || grandTotal;
  const changeDue = Math.max(0, (parseFloat(effectiveCash) || 0) - grandTotal);

  const handleSettle = () => {
    if (hasInvalidItems) return;
    setIsProcessing(true);
    sounds.playSuccess();

    setTimeout(() => {
      onConfirmPayment({
        tableId: table.id,
        tableName: table.name,
        section: table.section,
        server: table.server || 'Srija Chepuri',
        guests:
          (Number(table.guests) > 0 ? Number(table.guests) : null) ??
          (Number(table.occupiedChairs) > 0 ? Number(table.occupiedChairs) : null) ??
          (Number(table.capacity) > 0 ? Number(table.capacity) : null) ??
          2,
        capacity: Number(table.capacity) || 4,
        orderTime: table.orderTime || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        items: validItems.map((item) => ({
          ...item,
          name: item.name,
          quantity: item.quantity,
          price: item.price,
        })),
        subtotal,
        discountAmount,
        taxAmount,
        serviceChargeAmount,
        tipAmount: 0,
        grandTotal,
        paymentMethod: paymentMethod || 'upi',
        paymentMode: paymentMethod || 'upi',
        PaymentMethod: paymentMethod || 'upi',
        status: 'Settled',
        cashTendered: paymentMethod === 'cash' ? cashTendered : grandTotal,
        changeDue: paymentMethod === 'cash' ? changeDue : 0,
        settledAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        date: getTodayDateString(),
        settledDate: getBusinessDayStart().toISOString().slice(0, 10),
        invoiceNo: getNextInvoiceNumber()
      });
    }, 450);
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: isLight ? 'rgba(15, 23, 42, 0.45)' : 'rgba(5, 9, 18, 0.82)',
      backdropFilter: 'blur(10px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '1rem'
    }}>
      <style>{`
        .payment-tab-btn {
          position: relative;
          background: ${isLight ? 'var(--bg-tertiary, #f8fafc)' : 'rgba(15, 23, 42, 0.65)'};
          border: 1px solid ${isLight ? 'var(--border-subtle, #e2e8f0)' : 'rgba(255, 255, 255, 0.08)'};
          border-radius: 12px;
          padding: 0.9rem 0.5rem;
          color: ${isLight ? 'var(--text-dim, #64748b)' : '#94a3b8'};
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.45rem;
          font-size: 0.8rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.18s ease;
        }
        .payment-tab-btn:hover {
          background: ${isLight ? 'rgba(217, 119, 6, 0.08)' : 'rgba(245, 158, 11, 0.08)'};
          border-color: var(--accent-amber, #f59e0b);
          color: ${isLight ? 'var(--text-main, #0f172a)' : '#f8fafc'};
        }
        .payment-tab-btn.active {
          background: ${isLight ? 'linear-gradient(180deg, rgba(217, 119, 6, 0.16) 0%, rgba(217, 119, 6, 0.05) 100%)' : 'linear-gradient(180deg, rgba(245, 158, 11, 0.2) 0%, rgba(245, 158, 11, 0.06) 100%)'};
          border: 1.5px solid var(--accent-amber, #f59e0b);
          color: var(--accent-amber, #f59e0b);
          box-shadow: 0 0 16px rgba(245, 158, 11, 0.2);
        }
        .payment-tab-btn.active::after {
          content: '';
          position: absolute;
          bottom: -6px;
          left: 50%;
          transform: translateX(-50%);
          width: 0;
          height: 0;
          border-left: 6px solid transparent;
          border-right: 6px solid transparent;
          border-top: 6px solid var(--accent-amber, #f59e0b);
        }
      `}</style>

      <div style={{
        background: isLight ? 'var(--bg-secondary, #ffffff)' : 'linear-gradient(180deg, #0f172a 0%, #0b1120 100%)',
        border: isLight ? '1.5px solid var(--border-subtle, #e2e8f0)' : '1px solid rgba(255, 255, 255, 0.1)',
        width: '100%',
        maxWidth: '660px',
        borderRadius: '18px',
        boxShadow: isLight
          ? '0 25px 60px -10px rgba(0, 0, 0, 0.16), 0 0 1px rgba(0,0,0,0.1)'
          : '0 25px 60px -10px rgba(0, 0, 0, 0.85), 0 0 40px rgba(245, 158, 11, 0.08)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        padding: '1.5rem 1.6rem',
        gap: '1.15rem'
      }}>
        {/* Top Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            {/* Golden Receipt Icon Squircle */}
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              boxShadow: '0 4px 14px rgba(245, 158, 11, 0.35)',
              flexShrink: 0
            }}>
              <Receipt size={22} strokeWidth={2.4} />
            </div>

            <div>
              <h2 style={{
                fontSize: '1.25rem',
                fontWeight: 800,
                color: 'var(--text-main, #ffffff)',
                margin: 0,
                letterSpacing: '-0.01em'
              }}>
                Settle Bill — {table.name}
              </h2>
              <div style={{
                fontSize: '0.74rem',
                color: 'var(--text-dim, #94a3b8)',
                marginTop: '4px',
                display: 'flex',
                alignItems: 'center',
                gap: '0.55rem',
                flexWrap: 'wrap'
              }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                  <Building2 size={12} color="var(--text-dim, #64748b)" />
                  {table.section || 'Main Hall'}
                </span>
                <span style={{ color: isLight ? '#cbd5e1' : '#475569' }}>•</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                  <Users size={12} color="var(--text-dim, #64748b)" />
                  {table.guests || 0} Guests
                </span>
                <span style={{ color: isLight ? '#cbd5e1' : '#475569' }}>•</span>
                <span>Server: {table.server || '-'}</span>
                <span style={{ color: isLight ? '#cbd5e1' : '#475569' }}>•</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', color: 'var(--accent-amber, #f59e0b)', fontWeight: 600 }}>
                  <Calendar size={12} color="var(--accent-amber, #f59e0b)" />
                  {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                </span>
                <span style={{ color: isLight ? '#cbd5e1' : '#475569' }}>•</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', color: 'var(--accent-amber, #f59e0b)', fontWeight: 600 }}>
                  <Clock size={12} color="var(--accent-amber, #f59e0b)" />
                  {table.orderTime || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              border: isLight ? '1px solid #cbd5e1' : '1px solid rgba(255, 255, 255, 0.1)',
              background: isLight ? '#f1f5f9' : 'rgba(255, 255, 255, 0.05)',
              color: 'var(--text-dim, #94a3b8)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = isLight ? '#e2e8f0' : 'rgba(255,255,255,0.1)';
              e.currentTarget.style.color = 'var(--text-main, #ffffff)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = isLight ? '#f1f5f9' : 'rgba(255,255,255,0.05)';
              e.currentTarget.style.color = 'var(--text-dim, #94a3b8)';
            }}
            title="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Net Amount Due Banner */}
        <div style={{
          background: isLight ? 'var(--bg-tertiary, #f8fafc)' : 'rgba(15, 23, 42, 0.65)',
          border: isLight ? '1px solid var(--border-subtle, #e2e8f0)' : '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '14px',
          padding: '1rem 1.35rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              background: isLight ? 'rgba(217, 119, 6, 0.12)' : 'rgba(245, 158, 11, 0.15)',
              border: isLight ? '1px solid rgba(217, 119, 6, 0.3)' : '1px solid rgba(245, 158, 11, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent-amber, #f59e0b)',
              flexShrink: 0
            }}>
              <Wallet size={20} />
            </div>

            <div>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-dim, #94a3b8)', fontWeight: 600, display: 'block' }}>
                Net Amount Due
              </span>
              <span className="font-mono" style={{
                fontSize: '1.95rem',
                fontWeight: 900,
                color: 'var(--accent-amber, #f59e0b)',
                lineHeight: 1.1,
                display: 'block'
              }}>
                {formatCurrency(grandTotal)}
              </span>
            </div>
          </div>

          {/* Subtotal & GST breakdown */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.3rem',
            textAlign: 'right',
            fontSize: '0.82rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.8rem', color: 'var(--text-dim, #94a3b8)' }}>
              <span>Subtotal</span>
              <span className="font-mono" style={{ color: 'var(--text-main, #ffffff)', fontWeight: 700 }}>
                {formatCurrency(subtotal)}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.8rem', color: 'var(--text-dim, #94a3b8)' }}>
              <span>GST (5%)</span>
              <span className="font-mono" style={{ color: 'var(--text-main, #ffffff)', fontWeight: 700 }}>
                {formatCurrency(taxAmount)}
              </span>
            </div>
            {serviceChargeAmount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.8rem', color: 'var(--text-dim, #94a3b8)' }}>
                <span>Service (5%)</span>
                <span className="font-mono" style={{ color: 'var(--text-main, #ffffff)', fontWeight: 700 }}>
                  {formatCurrency(serviceChargeAmount)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Select Payment Mode 4-Tab Bar */}
        <div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.45rem',
            marginBottom: '0.6rem',
            fontSize: '0.82rem',
            fontWeight: 700,
            color: 'var(--text-main, #cbd5e1)'
          }}>
            <CreditCard size={15} color="var(--text-dim, #94a3b8)" />
            <span>Select Payment Mode</span>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '0.65rem'
          }}>
            {[
              { id: 'upi', label: 'UPI / QR Tap', icon: QrCode },
              { id: 'cash', label: 'Cash Tender', icon: Banknote },
              { id: 'card', label: 'Credit / Debit Card', icon: CreditCard },
              { id: 'wallet', label: 'Wallet', icon: Wallet }
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = paymentMethod === tab.id;

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setPaymentMethod(tab.id)}
                  className={`payment-tab-btn ${isActive ? 'active' : ''}`}
                >
                  <Icon size={20} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Payment Mode Dynamic Content Box */}
        {paymentMethod === 'upi' && (
          <div style={{
            background: isLight ? 'var(--bg-tertiary, #f8fafc)' : 'rgba(15, 23, 42, 0.65)',
            border: isLight ? '1px solid var(--border-subtle, #e2e8f0)' : '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '14px',
            padding: '1.25rem 1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '1.6rem'
          }}>
            {/* Stylized QR Code with Amber Corner Brackets */}
            <div style={{
              position: 'relative',
              padding: '8px',
              flexShrink: 0
            }}>
              {/* Corner Brackets */}
              <div style={{ position: 'absolute', top: 0, left: 0, width: '15px', height: '15px', borderTop: '2.5px solid var(--accent-amber, #f59e0b)', borderLeft: '2.5px solid var(--accent-amber, #f59e0b)', borderRadius: '4px 0 0 0' }} />
              <div style={{ position: 'absolute', top: 0, right: 0, width: '15px', height: '15px', borderTop: '2.5px solid var(--accent-amber, #f59e0b)', borderRight: '2.5px solid var(--accent-amber, #f59e0b)', borderRadius: '0 4px 0 0' }} />
              <div style={{ position: 'absolute', bottom: 0, left: 0, width: '15px', height: '15px', borderBottom: '2.5px solid var(--accent-amber, #f59e0b)', borderLeft: '2.5px solid var(--accent-amber, #f59e0b)', borderRadius: '0 0 0 4px' }} />
              <div style={{ position: 'absolute', bottom: 0, right: 0, width: '15px', height: '15px', borderBottom: '2.5px solid var(--accent-amber, #f59e0b)', borderRight: '2.5px solid var(--accent-amber, #f59e0b)', borderRadius: '0 0 4px 0' }} />

              {/* Real Payment QR */}
              <div style={{
                background: '#ffffff',
                padding: '6px',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: isLight ? '0 4px 15px rgba(0,0,0,0.12)' : '0 4px 20px rgba(0,0,0,0.5)'
              }}>
                <img
                  src={activeQr?.image || paymentQrImage}
                  alt={activeQr?.label || "Scan to Pay"}
                  style={{
                    width: '115px',
                    height: '115px',
                    objectFit: 'contain',
                    borderRadius: '4px',
                    display: 'block'
                  }}
                />
              </div>
            </div>

            {/* Scan & Pay Instructions & Brand Badges */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem', flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.45rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                  <Zap size={16} color="var(--accent-amber, #f59e0b)" fill="var(--accent-amber, #f59e0b)" />
                  <span style={{ fontSize: '0.98rem', fontWeight: 800, color: 'var(--text-main, #ffffff)' }}>
                    Scan & Pay
                  </span>
                </div>
                <span className="font-mono" style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--accent-amber, #f59e0b)' }}>
                  {formatCurrency(grandTotal)}
                </span>
              </div>

              {/* Configured QR Label */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <span style={{ fontSize: '0.82rem', color: 'var(--text-dim, #cbd5e1)', fontWeight: 600 }}>
                  {activeQr?.label || "UPI / QR to Pay"}
                </span>
              </div>

              {/* Counter / Channel Selector if multiple QRs configured */}
              {configuredQrs.length > 1 && (
                <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', margin: '2px 0' }}>
                  {configuredQrs.map((q, idx) => (
                    <button
                      key={q.id || idx}
                      type="button"
                      onClick={() => handleSelectQr(idx)}
                      style={{
                        background: selectedQrIndex === idx
                          ? 'var(--accent-amber, #f59e0b)'
                          : isLight
                          ? '#f1f5f9'
                          : 'rgba(255, 255, 255, 0.08)',
                        color: selectedQrIndex === idx ? '#ffffff' : 'var(--text-main, #cbd5e1)',
                        border: selectedQrIndex === idx
                          ? '1px solid var(--accent-amber, #f59e0b)'
                          : isLight
                          ? '1px solid #cbd5e1'
                          : '1px solid rgba(255, 255, 255, 0.12)',
                        borderRadius: '6px',
                        padding: '2px 8px',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {q.label || `QR #${idx + 1}`}
                    </button>
                  ))}
                </div>
              )}

              {/* UPI Brand Badges: GPay, PhonePe, Paytm, BHIM */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                flexWrap: 'wrap',
                marginTop: '0.15rem'
              }}>
                {/* GPay Badge */}
                <div style={{
                  background: '#ffffff',
                  color: '#1e293b',
                  padding: '3px 9px',
                  borderRadius: '16px',
                  fontSize: '0.68rem',
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.12)',
                  border: isLight ? '1px solid #e2e8f0' : 'none'
                }}>
                  <span style={{ color: '#4285F4', fontWeight: 900 }}>G</span>
                  <span>Pay</span>
                </div>

                {/* PhonePe Badge */}
                <div style={{
                  background: '#5f259f',
                  color: '#ffffff',
                  padding: '3px 9px',
                  borderRadius: '16px',
                  fontSize: '0.68rem',
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.12)'
                }}>
                  <span style={{ background: '#ffffff', color: '#5f259f', width: '12px', height: '12px', borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.55rem', fontWeight: 900 }}>पे</span>
                  <span>PhonePe</span>
                </div>

                {/* Paytm Badge */}
                <div style={{
                  background: '#002e6e',
                  color: '#ffffff',
                  padding: '3px 9px',
                  borderRadius: '16px',
                  fontSize: '0.68rem',
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '2px',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.12)'
                }}>
                  <span>Pay</span>
                  <span style={{ color: '#00b9f1' }}>tm</span>
                </div>

                {/* BHIM Badge */}
                <div style={{
                  background: '#0f172a',
                  border: '1px solid rgba(255,255,255,0.15)',
                  color: '#ffffff',
                  padding: '3px 9px',
                  borderRadius: '16px',
                  fontSize: '0.68rem',
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '3px'
                }}>
                  <span style={{ color: '#10b981' }}>▶</span>
                  <span>BHIM</span>
                </div>
              </div>

              {/* Secure & Encrypted footer tag */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                fontSize: '0.72rem',
                color: 'var(--text-dim, #64748b)',
                marginTop: '0.2rem'
              }}>
                <ShieldCheck size={13} color="#10b981" />
                <span>Secure & Encrypted</span>
              </div>
            </div>
          </div>
        )}

        {paymentMethod === 'cash' && (
          <div style={{
            background: isLight ? 'var(--bg-tertiary, #f8fafc)' : 'rgba(15, 23, 42, 0.65)',
            border: isLight ? '1px solid var(--border-subtle, #e2e8f0)' : '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '14px',
            padding: '1.25rem 1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem'
          }}>
            <label style={{ fontSize: '0.78rem', color: 'var(--text-dim, #94a3b8)', fontWeight: 600 }}>
              Cash Tendered (₹):
            </label>
            <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 140px', minWidth: '130px' }}>
                <input
                  type="number"
                  step="10"
                  value={cashTendered}
                  onChange={e => setCashTendered(e.target.value)}
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    background: isLight ? '#ffffff' : 'rgba(2, 6, 23, 0.8)',
                    border: '1.5px solid var(--accent-amber, #f59e0b)',
                    borderRadius: '8px',
                    padding: '0.55rem 0.8rem',
                    color: 'var(--text-main, #ffffff)',
                    fontSize: '1.15rem',
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 800,
                    outline: 'none'
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.35rem', flex: '2 1 300px', flexWrap: 'wrap', alignItems: 'center' }}>
                {[grandTotal, 500, 1000, 2000, 5000].map((quickVal, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setCashTendered(quickVal)}
                    style={{
                      flex: '1 1 0px',
                      minWidth: '52px',
                      background: Number(cashTendered) === Number(quickVal)
                        ? 'var(--accent-amber, #f59e0b)'
                        : isLight
                        ? '#f1f5f9'
                        : 'rgba(255, 255, 255, 0.06)',
                      color: Number(cashTendered) === Number(quickVal)
                        ? '#ffffff'
                        : 'var(--text-main, #f8fafc)',
                      border: Number(cashTendered) === Number(quickVal)
                        ? '1px solid var(--accent-amber, #f59e0b)'
                        : isLight
                        ? '1px solid #cbd5e1'
                        : '1px solid rgba(255, 255, 255, 0.1)',
                      padding: '0.55rem 0.45rem',
                      borderRadius: '8px',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      textAlign: 'center',
                      whiteSpace: 'nowrap',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {i === 0 ? 'Exact' : `₹${quickVal}`}
                  </button>
                ))}
              </div>
            </div>

            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingTop: '0.55rem',
              borderTop: isLight ? '1px solid #e2e8f0' : '1px solid rgba(255, 255, 255, 0.08)',
              fontSize: '0.86rem'
            }}>
              <span style={{ color: 'var(--text-dim, #94a3b8)', fontWeight: 600 }}>Change to Return:</span>
              <span className="font-mono" style={{
                fontSize: '1.35rem',
                fontWeight: 900,
                color: changeDue >= 0 ? '#10b981' : '#ef4444'
              }}>
                {formatCurrency(changeDue)}
              </span>
            </div>
          </div>
        )}

        {paymentMethod === 'card' && (
          <div style={{
            background: isLight ? 'var(--bg-tertiary, #f8fafc)' : 'rgba(15, 23, 42, 0.65)',
            border: isLight ? '1px solid var(--border-subtle, #e2e8f0)' : '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '14px',
            padding: '1.4rem',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0.6rem'
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: isLight ? 'rgba(217, 119, 6, 0.12)' : 'rgba(245, 158, 11, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent-amber, #f59e0b)'
            }}>
              <CreditCard size={26} />
            </div>
            <div style={{ fontSize: '0.96rem', fontWeight: 800, color: 'var(--text-main, #ffffff)' }}>
              Tap or Insert Card on POS Terminal
            </div>
            <p style={{ fontSize: '0.76rem', color: 'var(--text-dim, #94a3b8)', maxWidth: '320px', margin: 0 }}>
              Supports Visa, MasterCard, RuPay, Maestro & Contactless Tap
            </p>
          </div>
        )}

        {paymentMethod === 'wallet' && (
          <div style={{
            background: isLight ? 'var(--bg-tertiary, #f8fafc)' : 'rgba(15, 23, 42, 0.65)',
            border: isLight ? '1px solid var(--border-subtle, #e2e8f0)' : '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '14px',
            padding: '1.25rem 1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem'
          }}>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-dim, #94a3b8)', fontWeight: 600 }}>
              Choose Digital Wallet:
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.6rem' }}>
              {[
                { id: 'paytm', name: 'Paytm Wallet', icon: '💳' },
                { id: 'phonepe', name: 'PhonePe Wallet', icon: '🟣' },
                { id: 'amazon', name: 'Amazon Pay', icon: '📦' }
              ].map(w => (
                <button
                  key={w.id}
                  type="button"
                  onClick={() => setSelectedWallet(w.id)}
                  style={{
                    padding: '0.65rem',
                    borderRadius: '8px',
                    background: selectedWallet === w.id
                      ? isLight
                        ? 'rgba(217, 119, 6, 0.16)'
                        : 'rgba(245, 158, 11, 0.2)'
                      : isLight
                      ? '#ffffff'
                      : 'rgba(255, 255, 255, 0.04)',
                    border: selectedWallet === w.id
                      ? '1.5px solid var(--accent-amber, #f59e0b)'
                      : isLight
                      ? '1px solid #cbd5e1'
                      : '1px solid rgba(255, 255, 255, 0.08)',
                    color: selectedWallet === w.id ? 'var(--accent-amber, #f59e0b)' : 'var(--text-main, #ffffff)',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.4rem',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <span>{w.icon}</span>
                  <span>{w.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Footer Action Buttons */}
        <div style={{
          display: 'flex',
          gap: '0.85rem',
          alignItems: 'center',
          marginTop: '0.2rem'
        }}>
          {/* Cancel Button */}
          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            style={{
              flex: 1,
              height: '46px',
              borderRadius: '10px',
              border: isLight ? '1px solid #cbd5e1' : '1px solid rgba(255, 255, 255, 0.12)',
              background: isLight ? '#f1f5f9' : 'rgba(255, 255, 255, 0.06)',
              color: 'var(--text-main, #e2e8f0)',
              fontWeight: 700,
              fontSize: '0.88rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.45rem',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={e => e.currentTarget.style.background = isLight ? '#e2e8f0' : 'rgba(255, 255, 255, 0.1)'}
            onMouseLeave={e => e.currentTarget.style.background = isLight ? '#f1f5f9' : 'rgba(255, 255, 255, 0.06)'}
          >
            <ArrowLeft size={16} />
            <span>Cancel</span>
          </button>

          {/* Confirm & Vacate Table Button (Vibrant Orange-Amber Gradient) */}
          <button
            type="button"
            onClick={handleSettle}
            disabled={hasInvalidItems || isProcessing}
            title={hasInvalidItems ? "Remove or correct unnamed/invalid items before settling" : "Settle bill"}
            style={{
              flex: 2,
              height: '46px',
              borderRadius: '10px',
              border: 'none',
              background: 'linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)',
              color: '#ffffff',
              fontWeight: 800,
              fontSize: '0.92rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              cursor: isProcessing || hasInvalidItems ? 'not-allowed' : 'pointer',
              opacity: hasInvalidItems ? 0.55 : 1,
              boxShadow: '0 6px 20px rgba(234, 88, 12, 0.4)',
              transition: 'all 0.18s ease'
            }}
            onMouseEnter={e => {
              if (!isProcessing) {
                e.currentTarget.style.filter = 'brightness(1.08)';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }
            }}
            onMouseLeave={e => {
              e.currentTarget.style.filter = 'none';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <CheckCircle2 size={19} strokeWidth={2.2} />
            <span>{isProcessing ? 'Processing Settlement...' : `Confirm & Vacate ${table.name}`}</span>
          </button>
        </div>
      </div>
    </div>

  );
}
