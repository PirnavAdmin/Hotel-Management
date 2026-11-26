import React, { useEffect, useMemo, useRef, useState } from "react";
import { useDialogAccessibility } from "../../utils/useDialogAccessibility";

export function SaModuleHeader({ title, subtitle, actions }) {
  return (
    <div className="sa-module-header">
      <div>
        <h1 className="sa-title">{title}</h1>
        {subtitle && <p className="sa-subtitle">{subtitle}</p>}
      </div>
      {actions && <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>{actions}</div>}
    </div>
  );
}

export function SaStatusBadge({ status }) {
  const s = String(status || "Unknown").trim();
  const low = s.toLowerCase();
  const variant =
    low === "active" || low === "approved" || low === "paid" || low === "resolved"
      ? "sa-badge-active"
      : low === "pending" || low === "pendingapproval" || low === "trial" || low === "open"
        ? "sa-badge-pending"
        : low === "suspended" || low === "rejected" || low === "overdue" || low === "inactive"
          ? "sa-badge-danger"
          : "sa-badge-neutral";
  return <span className={`sa-badge ${variant}`}>{s}</span>;
}

export function SaStateBanner({ loading, integrationPending, error, endpoint, empty, emptyMessage, onRetry }) {
  if (loading) {
    return (
      <div className="sa-card" aria-busy="true" aria-label="Loading module data">
        <div style={{ display: "grid", gap: 10 }}>
          <div className="sa-skeleton" style={{ width: "45%" }} />
          <div className="sa-skeleton" style={{ width: "100%" }} />
          <div className="sa-skeleton" style={{ width: "85%" }} />
        </div>
      </div>
    );
  }

  if (integrationPending) {
    return (
      <div className="sa-banner sa-banner-pending" role="status">
        <div>
          <strong>Integration Pending:</strong> {error}
        </div>
        {endpoint && (
          <div style={{ marginTop: 6, fontSize: 12 }}>
            Required backend contract: <code>{endpoint}</code>
          </div>
        )}
      </div>
    );
  }

  if (error) {
    return (
      <div className="sa-banner sa-banner-error" role="alert">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <span>{error}</span>
          {onRetry && (
            <button type="button" className="sa-btn sa-btn-secondary" onClick={onRetry}>
              Retry
            </button>
          )}
        </div>
      </div>
    );
  }

  if (empty) {
    return (
      <div className="sa-card" style={{ textAlign: "center", padding: 28, color: "#94a3b8" }}>
        {emptyMessage || "No records found."}
      </div>
    );
  }

  return null;
}

export const SaDataTable = React.memo(function SaDataTable({
  columns,
  rows,
  rowKey,
  searchPlaceholder = "Search...",
  filters,
  pageSize = 8,
  emptyMessage = "No matching records.",
}) {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState("");
  const [sortDir, setSortDir] = useState("asc");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = (rows || []).filter((row) => {
      if (!q) return true;
      return columns.some((col) => {
        const val = typeof col.accessor === "function" ? col.accessor(row) : row?.[col.key];
        return String(val ?? "").toLowerCase().includes(q);
      });
    });

    if (!sortKey) return list;
    return [...list].sort((a, b) => {
      const av = String(a?.[sortKey] ?? "").toLowerCase();
      const bv = String(b?.[sortKey] ?? "").toLowerCase();
      if (av === bv) return 0;
      return sortDir === "asc" ? (av > bv ? 1 : -1) : av < bv ? 1 : -1;
    });
  }, [rows, columns, search, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  const toggleSort = (key) => {
    if (!key) return;
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  return (
    <div>
      <div className="sa-toolbar">
        <input
          type="search"
          className="sa-input"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder={searchPlaceholder}
          aria-label={searchPlaceholder}
          style={{ minWidth: 220, flex: "1 1 220px", maxWidth: 340 }}
        />
        {filters}
      </div>

      <div className="sa-table-wrap">
        <table className="sa-table">
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col.key}>
                  {col.sortable ? (
                    <button
                      type="button"
                      onClick={() => toggleSort(col.key)}
                      style={{
                        background: "none",
                        border: "none",
                        color: "inherit",
                        font: "inherit",
                        cursor: "pointer",
                        padding: 0,
                      }}
                    >
                      {col.label} {sortKey === col.key ? (sortDir === "asc" ? "↑" : "↓") : ""}
                    </button>
                  ) : (
                    col.label
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paged.length === 0 ? (
              <tr>
                <td colSpan={columns.length} style={{ textAlign: "center", color: "#94a3b8", padding: 24 }}>
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              paged.map((row, idx) => (
                <tr key={rowKey ? rowKey(row) : row?.id || idx}>
                  {columns.map((col) => (
                    <td key={col.key}>
                      {col.render ? col.render(row) : String(row?.[col.key] ?? "—")}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="sa-pagination">
        <span>
          Showing {paged.length} of {filtered.length} records (Page {safePage} of {totalPages})
        </span>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="button"
            className="sa-btn sa-btn-secondary"
            disabled={safePage <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Previous
          </button>
          <button
            type="button"
            className="sa-btn sa-btn-secondary"
            disabled={safePage >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
});

export function SaModal({ isOpen, title, onClose, children }) {
  const modalRef = useRef(null);
  useDialogAccessibility({
    isOpen,
    onClose,
    dialogRef: modalRef,
  });

  if (!isOpen) return null;
  return (
    <div className="sa-modal-backdrop" role="presentation" onClick={onClose}>
      <div
        ref={modalRef}
        className="sa-modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>{title}</h2>
          <button type="button" className="sa-btn sa-btn-secondary" onClick={onClose} aria-label="Close dialog">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function SaConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = "Confirm",
  danger = false,
  requireReason = false,
  reasonLabel = "Reason *",
  onCancel,
  onConfirm,
  busy = false,
}) {
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState("");

  useEffect(() => {
    if (isOpen) {
      setReason("");
      setReasonError("");
    }
  }, [isOpen]);

  const handleConfirm = () => {
    if (requireReason && reason.trim().length < 5) {
      setReasonError("Please enter a mandatory reason (at least 5 characters).");
      return;
    }
    onConfirm?.(reason.trim());
  };

  return (
    <SaModal isOpen={isOpen} title={title} onClose={onCancel}>
      <p style={{ margin: "0 0 14px", color: "#cbd5e1", fontSize: 14 }}>{message}</p>
      {requireReason && (
        <div className="sa-field" style={{ marginBottom: 14 }}>
          <label className="sa-label" htmlFor="sa-confirm-reason">
            {reasonLabel}
          </label>
          <textarea
            id="sa-confirm-reason"
            className="sa-textarea"
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              setReasonError("");
            }}
            placeholder="Provide reason for audit trail..."
          />
          {reasonError && <span style={{ color: "#fca5a5", fontSize: 12 }}>{reasonError}</span>}
        </div>
      )}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
        <button type="button" className="sa-btn sa-btn-secondary" onClick={onCancel} disabled={busy}>
          Cancel
        </button>
        <button
          type="button"
          className={`sa-btn ${danger ? "sa-btn-danger" : "sa-btn-primary"}`}
          onClick={handleConfirm}
          disabled={busy}
        >
          {busy ? "Processing..." : confirmLabel}
        </button>
      </div>
    </SaModal>
  );
}
