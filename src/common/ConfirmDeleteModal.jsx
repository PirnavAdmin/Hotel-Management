import React, { useState, useEffect } from 'react';
import { Trash2 } from 'lucide-react';

/**
 * ConfirmDeleteModal — Global custom delete confirmation dialog.
 * Replaces browser window.confirm() with a beautiful dark modal.
 */
export function ConfirmDeleteModal({
  isOpen,
  title = 'Delete?',
  message = 'This action cannot be undone.',
  confirmLabel = 'Yes, Delete',
  cancelLabel = 'Cancel',
  icon = null,
  onConfirm,
  onCancel,
}) {
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => { if (e.key === 'Escape') onCancel?.(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <div
      onClick={onCancel}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'var(--modal-overlay)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 99999,
        padding: '1rem',
        animation: 'cdm-fadeIn 0.15s ease',
      }}
    >
      <style>{`
        @keyframes cdm-fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes cdm-slideUp { from { opacity: 0; transform: translateY(14px) scale(0.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
        .cdm-confirm-btn { transition: all 0.15s ease; }
        .cdm-confirm-btn:hover { filter: brightness(1.12); transform: scale(1.02); }
        .cdm-cancel-btn { transition: all 0.15s ease; }
        .cdm-cancel-btn:hover { background: var(--surface-tint-hover) !important; color: var(--text-main) !important; }
      `}</style>

      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--bg-card)',
          border: '1.5px solid rgba(239,68,68,0.45)',
          borderRadius: '16px',
          padding: '1.6rem 1.5rem 1.4rem',
          maxWidth: '360px',
          width: '100%',
          boxShadow: '0 20px 60px rgba(0,0,0,0.7), 0 0 0 1px rgba(239,68,68,0.15)',
          textAlign: 'center',
          animation: 'cdm-slideUp 0.18s ease',
        }}
      >
        {/* Icon */}
        <div style={{
          width: '52px',
          height: '52px',
          borderRadius: '50%',
          background: 'rgba(239,68,68,0.15)',
          border: '1px solid rgba(239,68,68,0.35)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 0.9rem',
          boxShadow: '0 0 20px rgba(239,68,68,0.2)',
        }}>
          {icon || <Trash2 size={22} color="#f87171" />}
        </div>

        {/* Title */}
        <h3 style={{
          fontSize: '1.1rem', fontWeight: 900,
          color: 'var(--text-main)', margin: '0 0 0.5rem',
          letterSpacing: '-0.01em',
        }}>
          {title}
        </h3>

        {/* Message */}
        <p style={{
          fontSize: '0.82rem', color: 'var(--text-dim)',
          fontWeight: 500, margin: '0 0 1.5rem',
          lineHeight: 1.55,
        }}>
          {message}
        </p>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: '0.65rem' }}>
          <button
            className="cdm-confirm-btn"
            onClick={onConfirm}
            style={{
              flex: 1, padding: '0.65rem 1rem',
              borderRadius: '12px', border: 'none',
              background: 'linear-gradient(135deg, #ef4444, #dc2626)',
              color: '#ffffff', fontWeight: 800,
              fontSize: '0.88rem', cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(239,68,68,0.35)',
            }}
          >
            {confirmLabel}
          </button>
          <button
            className="cdm-cancel-btn"
            onClick={onCancel}
            style={{
              flex: 1, padding: '0.65rem 1rem',
              borderRadius: '12px',
              background: 'var(--surface-tint)',
              border: '1px solid var(--neutral-border)',
              color: 'var(--text-dim)', fontWeight: 700,
              fontSize: '0.85rem', cursor: 'pointer',
            }}
          >
            {cancelLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * useConfirmDelete — Hook to manage delete confirmation state.
 *
 * Usage:
 *   const { confirmState, requestDelete, cancelDelete } = useConfirmDelete();
 *   requestDelete({ title, message, onConfirm: () => doDelete(id) });
 *   <ConfirmDeleteModal {...confirmState} onCancel={cancelDelete} />
 */
export function useConfirmDelete() {
  const [confirmState, setConfirmState] = React.useState({ isOpen: false });

  const requestDelete = (opts) => {
    setConfirmState({
      isOpen: true,
      title: opts.title || 'Delete?',
      message: opts.message || 'This action cannot be undone.',
      confirmLabel: opts.confirmLabel || 'Yes, Delete',
      cancelLabel: opts.cancelLabel || 'Cancel',
      icon: opts.icon || null,
      onConfirm: () => {
        opts.onConfirm?.();
        setConfirmState({ isOpen: false });
      },
    });
  };

  const cancelDelete = () => setConfirmState({ isOpen: false });

  return { confirmState, requestDelete, cancelDelete };
}
