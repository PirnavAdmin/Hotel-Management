import React, { useRef } from "react";
import { useDialogAccessibility } from "../utils/useDialogAccessibility";
import {
  X,
  Clock,
  CheckCircle2,
  Package,
  CreditCard,
  AlertCircle,
  RefreshCw,
  Info,
  Utensils,
} from "lucide-react";
import { formatCurrency } from "../utils/formatCurrency";
import "./SelfServiceOrderTracking.css";

const TIMELINE_STAGES = [
  { key: "placed", label: "Order Placed" },
  { key: "accepted", label: "Order Accepted" },
  { key: "preparing", label: "Preparing" },
  { key: "ready", label: "Ready" },
  { key: "completed", label: "Completed" },
];

/**
 * Maps backend-confirmed fulfillmentStatus to a known timeline stage key
 * strictly based on confirmed backend vocabulary. Returns null for unknown
 * or unreported statuses so stages are never assumed or invented.
 */
function mapFulfillmentToStageKey(fulfillmentStatus) {
  if (!fulfillmentStatus || typeof fulfillmentStatus !== "string") return null;
  const normalized = fulfillmentStatus.trim().toLowerCase().replace(/[\s_-]+/g, "");

  if (normalized === "new" || normalized === "placed" || normalized === "orderplaced") {
    return "placed";
  }
  if (normalized === "accepted" || normalized === "orderaccepted" || normalized === "confirmed") {
    return "accepted";
  }
  if (normalized === "preparing" || normalized === "inprogress" || normalized === "cooking") {
    return "preparing";
  }
  if (normalized === "ready" || normalized === "readyforpickup") {
    return "ready";
  }
  if (normalized === "completed" || normalized === "pickedup" || normalized === "delivered") {
    return "completed";
  }
  return null;
}

/**
 * Phase 2B.4 – Self Service Order Tracking & Status UI
 *
 * Displays authoritative order, payment, and fulfillment information from a
 * backend-confirmed SelfServiceOrderResponseDto.
 * - Never fabricates progress, timestamps, or status transitions.
 * - Keeps Payment Status and Fulfillment Status strictly separated.
 * - Does not poll or invent tracking endpoints when backend integration is pending.
 */
export function SelfServiceOrderTracking({
  order = null,
  isLoading = false,
  error = "",
  hasTrackingApi = false,
  onRefresh = null,
  onClose,
}) {
  const dialogRef = useRef(null);
  useDialogAccessibility({ isOpen: true, onClose, dialogRef });

  const orderNumber = order?.orderNumber || (order?.orderId ? `ORD-${order.orderId}` : "");
  const createdAtDisplay = order?.createdAt
    ? new Date(order.createdAt).toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      })
    : "";

  const lastUpdatedRaw = order?.updatedAt || order?.lastUpdatedAt || null;
  const lastUpdatedDisplay = lastUpdatedRaw
    ? new Date(lastUpdatedRaw).toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      })
    : "";

  const orderStatus = order?.status || "Status unavailable";
  const paymentStatus = order?.paymentStatus || "Status unavailable";
  const fulfillmentStatus = order?.fulfillmentStatus || "Status unavailable";
  const activeStageKey = mapFulfillmentToStageKey(order?.fulfillmentStatus);
  const items = Array.isArray(order?.items) ? order.items : [];

  return (
    <div
      className="ss-tracking-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Self Service Order Tracking"
    >
      <div ref={dialogRef} tabIndex={-1} className="ss-tracking-card">
        {/* Header */}
        <div className="ss-tracking-header">
          <div className="ss-tracking-header-title">
            <Package size={20} color="var(--accent-amber)" />
            <div>
              <h3>Order Tracking</h3>
              {orderNumber && (
                <div className="ss-tracking-header-sub">
                  Reference: {orderNumber}
                </div>
              )}
            </div>
          </div>

          <button
            type="button"
            className="ss-tracking-close-btn"
            onClick={onClose}
            aria-label="Close order tracking"
          >
            <X size={20} />
          </button>
        </div>

        <div className="ss-tracking-body">
          {/* Loading State */}
          {isLoading && !order && (
            <div className="ss-tracking-state-box" role="status" aria-live="polite">
              <RefreshCw size={22} />
              <span>Loading order status from backend...</span>
            </div>
          )}

          {/* Error Banner (preserves last fetched order if present) */}
          {error && (
            <div className="ss-tracking-error-box" role="alert">
              <AlertCircle size={17} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {/* Unavailable State when no backend-confirmed order is present */}
          {!isLoading && !order && (
            <div className="ss-tracking-unavailable-box">
              <Info size={24} color="var(--text-muted)" />
              <div className="ss-tracking-unavailable-title">
                Order status unavailable
              </div>
              <p className="ss-tracking-unavailable-text">
                A valid backend-confirmed order reference is required to view order tracking.
              </p>
            </div>
          )}

          {/* Authoritative Order Details */}
          {order && (
            <>
              {/* Order Reference & Timestamps */}
              <div className="ss-tracking-ref-card">
                <div>
                  <div className="ss-tracking-meta-label">Order Number</div>
                  <div className="ss-tracking-order-num">
                    {orderNumber || "Unavailable"}
                  </div>
                  {order.orderId != null && (
                    <div className="ss-tracking-meta-sub">
                      Order ID: #{order.orderId}
                    </div>
                  )}
                </div>

                <div className="ss-tracking-dates">
                  {createdAtDisplay && (
                    <div className="ss-tracking-meta-sub">
                      <strong>Placed:</strong> {createdAtDisplay}
                    </div>
                  )}
                  {lastUpdatedDisplay && (
                    <div className="ss-tracking-meta-sub">
                      <strong>Last Updated:</strong> {lastUpdatedDisplay}
                    </div>
                  )}
                </div>
              </div>

              {/* Separate Order, Fulfillment & Payment Statuses */}
              <div className="ss-tracking-status-grid">
                <div className="ss-tracking-status-card">
                  <div className="ss-tracking-status-label">
                    <Clock size={13} />
                    <span>Order Status</span>
                  </div>
                  <div className="ss-tracking-status-value">{orderStatus}</div>
                </div>

                <div className="ss-tracking-status-card">
                  <div className="ss-tracking-status-label">
                    <Utensils size={13} />
                    <span>Fulfillment Status</span>
                  </div>
                  <div className="ss-tracking-status-value">{fulfillmentStatus}</div>
                </div>

                <div className="ss-tracking-status-card">
                  <div className="ss-tracking-status-label">
                    <CreditCard size={13} />
                    <span>Payment Status</span>
                  </div>
                  <div className="ss-tracking-status-value">{paymentStatus}</div>
                </div>
              </div>

              {/* Fulfillment Stage Timeline (no assumed prior completion, no fake animation) */}
              <div className="ss-tracking-timeline-section">
                <div className="ss-tracking-section-header">
                  <span>Fulfillment Stages</span>
                  {!activeStageKey && order.fulfillmentStatus && (
                    <span className="ss-tracking-neutral-tag">
                      Reported: {order.fulfillmentStatus}
                    </span>
                  )}
                </div>

                <ol className="ss-tracking-timeline" aria-label="Order fulfillment stages">
                  {TIMELINE_STAGES.map((stage) => {
                    const isCurrent = activeStageKey === stage.key;
                    return (
                      <li
                        key={stage.key}
                        className={`ss-tracking-step ${isCurrent ? "is-current" : ""}`}
                        aria-current={isCurrent ? "step" : undefined}
                      >
                        <div className="ss-tracking-step-marker">
                          {isCurrent ? (
                            <CheckCircle2 size={16} />
                          ) : (
                            <span className="ss-tracking-step-dot" />
                          )}
                        </div>
                        <div className="ss-tracking-step-content">
                          <span className="ss-tracking-step-label">{stage.label}</span>
                          <span className="ss-tracking-step-state">
                            {isCurrent ? "Current reported status" : "Pending / Not reported"}
                          </span>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              </div>

              {/* Order Item Summary (only if supplied by backend) */}
              {items.length > 0 && (
                <div className="ss-tracking-items-section">
                  <div className="ss-tracking-section-header">
                    <span>Order Items ({items.length})</span>
                    {order.financials?.finalPayable != null && (
                      <span className="ss-tracking-total-text">
                        Total: {formatCurrency(order.financials.finalPayable)}
                      </span>
                    )}
                  </div>
                  <div className="ss-tracking-items-list">
                    {items.map((item, idx) => (
                      <div
                        key={item.orderItemId || item.menuItemId || idx}
                        className="ss-tracking-item-row"
                      >
                        <div>
                          <span className="ss-tracking-item-name">
                            {item.name || "Item"}
                          </span>
                          <span className="ss-tracking-item-qty">
                            × {item.quantity ?? "—"}
                          </span>
                        </div>
                        <div className="ss-tracking-item-right">
                          {item.kotStatus && (
                            <span className="ss-tracking-kot-pill">{item.kotStatus}</span>
                          )}
                          {item.lineSubtotal != null && (
                            <span className="ss-tracking-item-price">
                              {formatCurrency(item.lineSubtotal)}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Backend Tracking Integration Notice */}
          {!hasTrackingApi && (
            <div className="ss-tracking-pending-banner" role="note">
              <Info size={16} style={{ flexShrink: 0 }} />
              <span>Live order tracking will be available after backend integration.</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="ss-tracking-footer">
          {hasTrackingApi && typeof onRefresh === "function" ? (
            <button
              type="button"
              className="self-service-btn-clear"
              onClick={onRefresh}
              disabled={isLoading || !order}
              aria-label="Refresh order status"
            >
              <RefreshCw size={14} style={{ marginRight: "5px", verticalAlign: "-2px" }} />
              <span>{isLoading ? "Refreshing..." : "Refresh Status"}</span>
            </button>
          ) : (
            <button
              type="button"
              className="self-service-btn-clear"
              disabled
              title="Live order tracking will be available after backend integration."
              aria-label="Refresh status unavailable until backend integration"
            >
              <RefreshCw size={14} style={{ marginRight: "5px", verticalAlign: "-2px" }} />
              <span>Refresh Unavailable</span>
            </button>
          )}

          <button
            type="button"
            className="self-service-btn-proceed"
            style={{ flex: "0 0 auto", minWidth: "120px" }}
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
