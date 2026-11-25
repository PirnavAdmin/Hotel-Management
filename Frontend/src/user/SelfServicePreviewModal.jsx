import React, { useState } from "react";
import {
  X,
  FileText,
  Receipt,
  AlertCircle,
  Lock,
  Clock,
  User,
  Phone,
  Mail,
} from "lucide-react";
import { formatCurrency } from "../utils/formatCurrency";

/**
 * Phase 2B.3 – Self Service Invoice & Receipt Preview Modal
 *
 * Strictly a frontend preview of backend-confirmed order data (Phase 2B.1).
 * - Never generates fake invoice numbers or transaction IDs.
 * - Never marks an order as Paid or Settled.
 * - Never invents or recalculates tax/financial values not supplied by the backend.
 * - Keeps official invoice issuance and payment-linked receipt printing disabled
 *   until backend payment verification and invoice APIs are available.
 */
export function SelfServicePreviewModal({
  order,
  restaurantSettings = {},
  onClose,
}) {
  const [previewMode, setPreviewMode] = useState("invoice"); // 'invoice' | 'receipt'

  if (!order) return null;

  // Restaurant details — strictly from existing data, omitted if unavailable
  const restaurantName =
    restaurantSettings?.restaurantName?.trim() ||
    restaurantSettings?.name?.trim() ||
    "";
  const restaurantAddress = restaurantSettings?.address?.trim() || "";
  const restaurantPhone = restaurantSettings?.phone?.trim() || "";
  const restaurantEmail = restaurantSettings?.email?.trim() || "";
  const restaurantGstin = restaurantSettings?.gstin?.trim() || "";

  // Authoritative backend order fields
  const orderNumber = order.orderNumber || (order.orderId ? `ORD-${order.orderId}` : "");
  const orderStatus = order.status || "PendingPayment";
  const paymentStatus = order.paymentStatus || "Pending";
  const orderType = order.orderType || "SelfService";
  const createdAtDisplay = order.createdAt
    ? new Date(order.createdAt).toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      })
    : "";

  const items = Array.isArray(order.items) ? order.items : [];
  const financials = order.financials || null;

  const hasCustomerDetails = Boolean(
    order.customerName || order.customerPhone || order.customerEmail
  );

  return (
    <div className="self-service-modal-overlay" role="dialog" aria-modal="true" aria-label="Self Service Invoice and Receipt Preview">
      <div className="self-service-payment-modal self-service-preview-modal">
        {/* Header */}
        <div className="self-service-payment-header">
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <FileText size={20} color="var(--accent-amber)" />
            <div>
              <h3 style={{ margin: 0, fontSize: "1.02rem", fontWeight: 850 }}>
                Self Service {previewMode === "invoice" ? "Invoice" : "Receipt"} Preview
              </h3>
              {orderNumber && (
                <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "2px" }}>
                  Order Ref: {orderNumber}
                </div>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: "var(--text-muted)",
              cursor: "pointer",
              padding: "4px",
            }}
            aria-label="Close preview"
          >
            <X size={20} />
          </button>
        </div>

        {/* Mode Switcher & Mandatory Preview Banner */}
        <div className="self-service-preview-toolbar">
          <div className="self-service-preview-banner">
            <AlertCircle size={15} style={{ flexShrink: 0 }} />
            <span>PREVIEW ONLY – OFFICIAL INVOICE INTEGRATION PENDING</span>
          </div>

          <div className="self-service-preview-tabs">
            <button
              type="button"
              className={`self-service-channel-tab ${previewMode === "invoice" ? "is-active" : ""}`}
              onClick={() => setPreviewMode("invoice")}
            >
              <FileText size={13} style={{ marginRight: "4px", verticalAlign: "-2px" }} />
              Invoice Preview (A4)
            </button>
            <button
              type="button"
              className={`self-service-channel-tab ${previewMode === "receipt" ? "is-active" : ""}`}
              onClick={() => setPreviewMode("receipt")}
            >
              <Receipt size={13} style={{ marginRight: "4px", verticalAlign: "-2px" }} />
              Receipt Preview (80mm)
            </button>
          </div>
        </div>

        {/* Preview Sheet Body */}
        <div className="self-service-preview-scroll-area">
          <div
            className={`self-service-preview-sheet ${
              previewMode === "receipt" ? "is-thermal" : "is-a4"
            }`}
          >
            {/* Draft Watermark Header */}
            <div className="self-service-preview-draft-tag">
              PREVIEW ONLY – OFFICIAL INVOICE INTEGRATION PENDING
            </div>

            {/* Restaurant Details (only where available) */}
            {(restaurantName || restaurantAddress || restaurantPhone || restaurantEmail || restaurantGstin) && (
              <div className="self-service-preview-restaurant">
                {restaurantName && (
                  <div className="self-service-preview-rest-name">{restaurantName}</div>
                )}
                {restaurantAddress && (
                  <div className="self-service-preview-rest-meta">{restaurantAddress}</div>
                )}
                {(restaurantPhone || restaurantEmail) && (
                  <div className="self-service-preview-rest-meta">
                    {[restaurantPhone, restaurantEmail].filter(Boolean).join(" • ")}
                  </div>
                )}
                {restaurantGstin && (
                  <div className="self-service-preview-rest-meta">
                    GSTIN: {restaurantGstin}
                  </div>
                )}
              </div>
            )}

            {/* Order Reference & Status */}
            <div className="self-service-preview-meta-grid">
              <div>
                <div className="self-service-preview-meta-label">Order Reference</div>
                <div className="self-service-preview-meta-value">
                  {orderNumber || "Unavailable"}
                </div>
                {order.orderId != null && (
                  <div className="self-service-preview-meta-sub">
                    Order ID: #{order.orderId}
                  </div>
                )}
                {createdAtDisplay && (
                  <div className="self-service-preview-meta-sub">{createdAtDisplay}</div>
                )}
              </div>

              <div style={{ textAlign: "right" }}>
                <div className="self-service-preview-meta-label">Document Status</div>
                <div className="self-service-preview-status-pill">
                  <Clock size={11} />
                  <span>{orderStatus}</span>
                </div>
                <div className="self-service-preview-meta-sub">
                  Payment: {paymentStatus}
                </div>
                <div className="self-service-preview-meta-sub">
                  Type: {orderType}
                </div>
              </div>
            </div>

            {/* Official Invoice / Payment Disclaimer Row */}
            <div className="self-service-preview-notice-row">
              <span>Invoice No: Pending Official Issuance</span>
              <span>Not valid as proof of payment</span>
            </div>

            {/* Customer Details (only where available) */}
            {hasCustomerDetails && (
              <div className="self-service-preview-customer">
                <div className="self-service-preview-section-title">Customer Details</div>
                <div className="self-service-preview-customer-items">
                  {order.customerName && (
                    <span>
                      <User size={12} /> {order.customerName}
                    </span>
                  )}
                  {order.customerPhone && (
                    <span>
                      <Phone size={12} /> {order.customerPhone}
                    </span>
                  )}
                  {order.customerEmail && (
                    <span>
                      <Mail size={12} /> {order.customerEmail}
                    </span>
                  )}
                </div>
              </div>
            )}

            {order.specialInstructions && (
              <div className="self-service-preview-notes">
                <strong>Instructions:</strong> {order.specialInstructions}
              </div>
            )}

            {/* Items Table (authoritative backend data only) */}
            <div className="self-service-preview-items">
              <div className="self-service-preview-items-head">
                <span>Item</span>
                <span style={{ textAlign: "center" }}>Qty</span>
                <span style={{ textAlign: "right" }}>Rate</span>
                <span style={{ textAlign: "right" }}>Amount</span>
              </div>
              {items.length === 0 ? (
                <div className="self-service-preview-empty">No items available in order response.</div>
              ) : (
                items.map((item, idx) => {
                  const hasUnitPrice = item.unitPrice != null || item.price != null;
                  const unitPrice = hasUnitPrice ? Number(item.unitPrice ?? item.price) : null;
                  const hasLineTotal = item.lineSubtotal != null;
                  const lineTotal = hasLineTotal ? Number(item.lineSubtotal) : null;

                  return (
                    <div
                      key={item.orderItemId || item.menuItemId || idx}
                      className="self-service-preview-item-row"
                    >
                      <div>
                        <div className="self-service-preview-item-name">
                          {item.name || "Unnamed Item"}
                        </div>
                        {item.notes && (
                          <div className="self-service-preview-item-note">{item.notes}</div>
                        )}
                      </div>
                      <div style={{ textAlign: "center" }}>{item.quantity ?? "—"}</div>
                      <div style={{ textAlign: "right" }}>
                        {unitPrice != null ? formatCurrency(unitPrice) : "—"}
                      </div>
                      <div style={{ textAlign: "right", fontWeight: 700 }}>
                        {lineTotal != null ? formatCurrency(lineTotal) : "—"}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Financial Breakdown (strictly from backend-supplied financials; never calculated client-side) */}
            {financials ? (
              <div className="self-service-preview-totals">
                {financials.subtotal != null && (
                  <div className="self-service-preview-total-row">
                    <span>Subtotal</span>
                    <span>{formatCurrency(financials.subtotal)}</span>
                  </div>
                )}

                {financials.discountAmount != null && Number(financials.discountAmount) > 0 && (
                  <div className="self-service-preview-total-row is-discount">
                    <span>
                      Discount
                      {financials.discountPercent != null ? ` (${financials.discountPercent}%)` : ""}
                    </span>
                    <span>- {formatCurrency(financials.discountAmount)}</span>
                  </div>
                )}

                {financials.taxAmount != null && (
                  <>
                    <div className="self-service-preview-total-row">
                      <span>
                        GST
                        {financials.foodGstRate != null ? ` (${financials.foodGstRate}%)` : ""}
                      </span>
                      <span>{formatCurrency(financials.taxAmount)}</span>
                    </div>
                    {(financials.cgstAmount != null || financials.sgstAmount != null) && (
                      <div className="self-service-preview-tax-split">
                        {financials.cgstAmount != null && (
                          <span>
                            CGST{financials.cgstRate != null ? ` (${financials.cgstRate}%)` : ""}:{" "}
                            {formatCurrency(financials.cgstAmount)}
                          </span>
                        )}
                        {financials.sgstAmount != null && (
                          <span>
                            SGST{financials.sgstRate != null ? ` (${financials.sgstRate}%)` : ""}:{" "}
                            {formatCurrency(financials.sgstAmount)}
                          </span>
                        )}
                      </div>
                    )}
                  </>
                )}

                {financials.serviceChargeEnabled &&
                  financials.serviceChargeAmount != null &&
                  Number(financials.serviceChargeAmount) > 0 && (
                    <div className="self-service-preview-total-row">
                      <span>
                        Service Charge
                        {financials.serviceChargeRate != null
                          ? ` (${financials.serviceChargeRate}%)`
                          : ""}
                      </span>
                      <span>{formatCurrency(financials.serviceChargeAmount)}</span>
                    </div>
                  )}

                {financials.roundingAdjustment != null &&
                  Math.abs(Number(financials.roundingAdjustment)) > 0 && (
                    <div className="self-service-preview-total-row">
                      <span>Rounding Adjustment</span>
                      <span>
                        {Number(financials.roundingAdjustment) > 0
                          ? `+${formatCurrency(financials.roundingAdjustment)}`
                          : `-${formatCurrency(Math.abs(Number(financials.roundingAdjustment)))}`}
                      </span>
                    </div>
                  )}

                {financials.finalPayable != null && (
                  <div className="self-service-preview-grand-total">
                    <span>Total Amount (Backend Confirmed)</span>
                    <span>{formatCurrency(financials.finalPayable)}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="self-service-preview-unavailable">
                Financial and tax breakdown unavailable from backend response.
              </div>
            )}

            <div className="self-service-preview-sheet-footer">
              PREVIEW ONLY – OFFICIAL INVOICE INTEGRATION PENDING
            </div>
          </div>
        </div>

        {/* Footer Actions — Official issuance & payment-linked printing disabled */}
        <div className="self-service-payment-footer" style={{ flexWrap: "wrap", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.72rem", color: "var(--text-muted)" }}>
            <Lock size={13} />
            <span>Official invoice issuance &amp; receipt printing disabled until payment verification.</span>
          </div>
          <div style={{ display: "flex", gap: "0.5rem", marginLeft: "auto" }}>
            <button
              type="button"
              className="self-service-btn-clear"
              disabled
              title="Official invoice issuance requires backend payment verification"
            >
              Issue Official Invoice (Pending)
            </button>
            <button
              type="button"
              className="self-service-btn-proceed"
              style={{ flex: "0 0 auto", minWidth: "120px" }}
              onClick={onClose}
            >
              Close Preview
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
