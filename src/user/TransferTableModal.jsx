import React, { useState } from 'react';
import { X, ArrowRightLeft, Check } from 'lucide-react';

export function TransferTableModal({ sourceTable, allTables, onClose, onConfirmTransfer }) {
  const [targetTableId, setTargetTableId] = useState('');

  // Available vacant tables (excluding current table)
  const availableTables = allTables.filter(t => t.id !== sourceTable.id && t.status === 'vacant');

  const handleTransfer = () => {
    if (!targetTableId) return;
    onConfirmTransfer(sourceTable.id, parseInt(targetTableId));
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
        maxWidth: '460px',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-lg)',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          padding: '1rem 1.25rem',
          borderBottom: '1px solid var(--border-subtle)',
          background: 'var(--bg-tertiary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ArrowRightLeft size={18} color="var(--accent-amber)" />
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#ffffff' }}>
              Transfer {sourceTable.name} Order
            </h3>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              color: 'var(--text-muted)',
              display: 'flex'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Select an empty table to move <strong>{sourceTable.name}'s</strong> active bill ({sourceTable.items.length} items):
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.65rem', maxHeight: '240px', overflowY: 'auto' }}>
            {availableTables.map(t => {
              const isSelected = targetTableId === t.id.toString();

              return (
                <button
                  key={t.id}
                  onClick={() => setTargetTableId(t.id.toString())}
                  style={{
                    padding: '0.85rem 0.5rem',
                    borderRadius: 'var(--radius-sm)',
                    background: isSelected ? 'var(--accent-amber)' : 'var(--bg-tertiary)',
                    color: isSelected ? '#000000' : 'var(--text-main)',
                    border: isSelected ? '1px solid var(--accent-amber)' : '1px solid var(--border-subtle)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '0.25rem'
                  }}
                >
                  <span style={{ fontWeight: 800, fontSize: '0.9rem' }}>{t.name}</span>
                  <span style={{ fontSize: '0.7rem', opacity: 0.8 }}>{t.capacity} Seats</span>
                </button>
              );
            })}
          </div>

          {availableTables.length === 0 && (
            <p style={{ color: 'var(--danger)', fontSize: '0.82rem', textAlign: 'center' }}>
              No vacant tables currently available for transfer.
            </p>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '1rem 1.25rem',
          background: 'var(--bg-tertiary)',
          borderTop: '1px solid var(--border-subtle)',
          display: 'flex',
          gap: '0.75rem'
        }}>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: '0.65rem',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--bg-secondary)',
              color: 'var(--text-muted)',
              fontWeight: 700,
              fontSize: '0.82rem'
            }}
          >
            Cancel
          </button>

          <button
            onClick={handleTransfer}
            disabled={!targetTableId}
            style={{
              flex: 2,
              padding: '0.65rem',
              borderRadius: 'var(--radius-sm)',
              background: targetTableId ? 'var(--accent-amber)' : 'rgba(245, 158, 11, 0.2)',
              color: targetTableId ? '#000000' : 'var(--text-dim)',
              fontWeight: 800,
              fontSize: '0.85rem',
              cursor: targetTableId ? 'pointer' : 'not-allowed'
            }}
          >
            Confirm Transfer
          </button>
        </div>
      </div>
    </div>
  );
}
