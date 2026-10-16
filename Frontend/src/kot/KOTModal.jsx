import React from 'react';
import { ChefHat, X, Printer, Check } from 'lucide-react';
import { sounds } from '../utils/audio';

export function KOTModal({ table, onClose }) {
  if (!table) return null;

  const handlePrint = () => {
    window.print();
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
      zIndex: 110,
      padding: '1rem'
    }}>
      <div style={{
        background: '#ffffff',
        color: '#1a1a1a',
        width: '100%',
        maxWidth: '360px',
        borderRadius: '14px',
        boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Header (No print) */}
        <div className="no-print" style={{
          background: '#1e293b',
          color: '#ffffff',
          padding: '0.75rem 1rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <ChefHat size={18} color="#f59e0b" />
            <span style={{ fontSize: '0.88rem', fontWeight: 700 }}>Kitchen Order Ticket (KOT)</span>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', color: '#94a3b8' }}>
            <X size={18} />
          </button>
        </div>

        {/* Printable KOT Thermal Slip */}
        <div id="printable-receipt" style={{
          padding: '1.25rem',
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '0.82rem',
          lineHeight: '1.4'
        }}>
          <div style={{ textAlign: 'center', borderBottom: '2px solid #000', paddingBottom: '0.5rem', marginBottom: '0.75rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 900 }}>*** KITCHEN COPY ***</h2>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, marginTop: '2px' }}>
              TABLE: {table.name}
            </div>
            <div style={{ fontSize: '0.75rem' }}>Section: {table.section} • Guests: {table.guests}</div>
            <div style={{ fontSize: '0.72rem', color: '#555', marginTop: '3px' }}>
              Server: {table.server} • Date: {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} • Time: {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>

          <div style={{ borderBottom: '1px dashed #000', paddingBottom: '0.5rem', marginBottom: '0.5rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '40px 1fr', fontWeight: 800, marginBottom: '4px' }}>
              <span>QTY</span>
              <span>ITEM & SPECIAL NOTES</span>
            </div>

            {table.items.map((item, idx) => (
              <div key={idx} style={{ display: 'grid', gridTemplateColumns: '40px 1fr', padding: '4px 0', borderBottom: '1px dotted #ccc' }}>
                <span style={{ fontSize: '1rem', fontWeight: 900 }}>{item.quantity}x</span>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '0.9rem' }}>{item.name}</div>
                  {item.notes && (
                    <div style={{ fontSize: '0.75rem', fontStyle: 'italic', fontWeight: 700, color: '#dc2626' }}>
                      &gt;&gt; NOTE: {item.notes}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div style={{ textAlign: 'center', fontSize: '0.72rem', marginTop: '0.5rem' }}>
            Ticket Dispatch: Active | AVSR Food Court Kitchen
          </div>
        </div>

        {/* Buttons (No print) */}
        <div className="no-print" style={{
          padding: '0.75rem 1rem',
          background: '#f8fafc',
          borderTop: '1px solid #e2e8f0',
          display: 'flex',
          gap: '0.5rem'
        }}>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: '0.6rem',
              borderRadius: '6px',
              background: '#e2e8f0',
              fontWeight: 700,
              fontSize: '0.8rem'
            }}
          >
            Done
          </button>
          <button
            onClick={handlePrint}
            style={{
              flex: 1,
              padding: '0.6rem',
              borderRadius: '6px',
              background: '#0f172a',
              color: '#ffffff',
              fontWeight: 700,
              fontSize: '0.8rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.3rem'
            }}
          >
            <Printer size={14} />
            <span>Print KOT</span>
          </button>
        </div>
      </div>
    </div>
  );
}
