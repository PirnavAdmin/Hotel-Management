import React from 'react';
import { ChefHat, X, Printer } from 'lucide-react';

export function KOTModal({ table, onClose, restaurantName = "Restaurant", restaurantLogo = "" }) {
  if (!table) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="receipt-modal-overlay" style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0, 0, 0, 0.82)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2500,
      padding: '1rem',
      animation: 'fadeIn 0.15s ease'
    }}>
      <div className="receipt-modal-container" style={{
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
      }}>
        {/* Header (No print) */}
        <div className="no-print" style={{
          background: '#0f172a',
          color: '#ffffff',
          padding: '0.65rem 1rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid #1e293b'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
            <ChefHat size={18} color="#f59e0b" />
            <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#ffffff', letterSpacing: '0.02em' }}>
              Kitchen Order Ticket (KOT)
            </span>
          </div>
          <button 
            onClick={onClose} 
            style={{ 
              background: 'transparent', 
              color: '#94a3b8', 
              border: 'none', 
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              padding: '4px',
              borderRadius: '4px'
            }}
            title="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Printable KOT Thermal Slip */}
        <div id="printable-receipt" className="format-thermal" style={{
          padding: '1.25rem',
          fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
          fontSize: '0.82rem',
          lineHeight: '1.4',
          background: '#ffffff',
          color: '#000000',
          flex: '1 1 auto',
          overflowY: 'auto'
        }}>
          <div style={{ textAlign: 'center', borderBottom: '2px solid #000000', paddingBottom: '0.5rem', marginBottom: '0.75rem' }}>
            {restaurantLogo && <img src={restaurantLogo} alt={`${restaurantName || "Restaurant"} logo`} style={{ maxWidth: '72px', maxHeight: '44px', objectFit: 'contain', margin: '0 auto 6px', display: 'block' }} />}
            <div style={{ fontSize: '1.05rem', fontWeight: 900, textTransform: 'uppercase', color: '#000000', letterSpacing: '0.03em', marginBottom: '2px' }}>
              {restaurantName?.trim() || "Restaurant"}
            </div>
            <div style={{
              display: 'inline-block',
              background: '#000000',
              color: '#ffffff',
              padding: '3px 12px',
              borderRadius: '3px',
              fontSize: '0.85rem',
              fontWeight: 900,
              letterSpacing: '0.06em',
              margin: '4px 0'
            }}>
              *** KITCHEN ORDER TICKET (KOT) ***
            </div>
            <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#000000', marginTop: '4px' }}>
              TABLE: {table.name || `Table ${table.id}`}
            </div>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155' }}>
              Section: {table.section || 'Main Hall'} • Guests: {table.guests ?? 0}
            </div>
            <div style={{ fontSize: '0.72rem', color: '#475569', marginTop: '3px', fontWeight: 600 }}>
              Server: {table.server || 'Staff'} • Date: {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} • Time: {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>

          <div style={{ borderBottom: '1.5px dashed #000000', paddingBottom: '0.5rem', marginBottom: '0.5rem' }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: '46px 1fr',
              fontWeight: 900,
              fontSize: '0.76rem',
              borderTop: '2px solid #000000',
              borderBottom: '2px solid #000000',
              padding: '4px 0',
              marginBottom: '6px',
              color: '#000000',
              letterSpacing: '0.03em'
            }}>
              <span>QTY</span>
              <span>ITEM & SPECIAL NOTES</span>
            </div>

            {(table.items || []).map((item, idx) => (
              <div key={idx} style={{
                display: 'grid',
                gridTemplateColumns: '46px 1fr',
                padding: '5px 0',
                borderBottom: '1px dotted #94a3b8',
                alignItems: 'flex-start'
              }}>
                <span style={{ fontSize: '1.05rem', fontWeight: 900, color: '#000000' }}>
                  {item.quantity || item.qty || 1}x
                </span>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '0.92rem', color: '#000000', lineHeight: '1.3' }}>
                    {item.name || item.dishName || 'Item'}
                  </div>
                  {item.notes && (
                    <div style={{
                      fontSize: '0.74rem',
                      fontStyle: 'normal',
                      fontWeight: 800,
                      color: '#b91c1c',
                      background: '#fee2e2',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      marginTop: '3px',
                      display: 'inline-block'
                    }}>
                      &gt;&gt; NOTE: {item.notes}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div style={{ textAlign: 'center', fontSize: '0.72rem', fontWeight: 700, color: '#475569', marginTop: '0.5rem' }}>
            Ticket Dispatch: Active | {restaurantName?.trim() || "Restaurant"} Kitchen
          </div>
        </div>

        {/* Buttons (No print) */}
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
              padding: '0.52rem',
              borderRadius: '6px',
              background: '#1e293b',
              color: '#f1f5f9',
              fontWeight: 700,
              fontSize: '0.8rem',
              border: '1px solid #334155',
              cursor: 'pointer'
            }}
          >
            Done
          </button>
          <button
            onClick={handlePrint}
            style={{
              flex: 1.5,
              padding: '0.52rem',
              borderRadius: '6px',
              background: '#f59e0b',
              color: '#000000',
              fontWeight: 800,
              fontSize: '0.82rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.4rem',
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(245, 158, 11, 0.4)'
            }}
          >
            <Printer size={15} />
            <span>Print KOT</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default KOTModal;
