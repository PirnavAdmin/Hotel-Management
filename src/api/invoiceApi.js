import { apiClient } from './apiConfig';

/**
 * Fetch All Invoices (filtered optionally by status)
 * GET /api/v1/invoices
 */
export async function apiGetInvoices(status) {
  const query = status ? `?status=${encodeURIComponent(status)}` : '';
  return await apiClient(`/api/v1/invoices${query}`);
}

/**
 * Fetch a single invoice by ID
 * GET /api/v1/invoices/{id}
 */
export async function apiGetInvoice(id) {
  return await apiClient(`/api/v1/invoices/${encodeURIComponent(id)}`);
}

/**
 * Fetch invoice generated for an order
 * GET /api/v1/invoices/by-order/{orderId}
 */
export async function apiGetInvoiceByOrder(orderId) {
  return await apiClient(`/api/v1/invoices/by-order/${encodeURIComponent(orderId)}`);
}

/**
 * Create a new billing invoice
 * POST /api/v1/invoices
 */
export async function apiCreateInvoice(invoiceData) {
  return await apiClient('/api/v1/invoices', {
    method: 'POST',
    body: JSON.stringify(invoiceData)
  });
}

/**
 * Update an existing invoice (discounts, items, taxes, notes)
 * PUT /api/v1/invoices/{id}
 */
export async function apiUpdateInvoice(id, invoiceData) {
  return await apiClient(`/api/v1/invoices/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(invoiceData)
  });
}

/**
 * Update invoice status (e.g. Paid, Settled, Cancelled)
 * PATCH /api/v1/invoices/{id}/status
 */
export async function apiUpdateInvoiceStatus(id, status) {
  return await apiClient(`/api/v1/invoices/${encodeURIComponent(id)}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status })
  });
}

/**
 * Settle bill for an invoice
 * POST /api/v1/invoices/{id}/settle
 */
export async function apiSettleInvoice(id) {
  return await apiClient(`/api/v1/invoices/${encodeURIComponent(id)}/settle`, {
    method: 'POST'
  });
}

/**
 * Delete / void an invoice
 * DELETE /api/v1/invoices/{id}
 */
export async function apiDeleteInvoice(id) {
  return await apiClient(`/api/v1/invoices/${encodeURIComponent(id)}`, {
    method: 'DELETE'
  });
}

/**
 * Fetch printable receipt data for an invoice
 * GET /api/v1/invoices/{id}/receipt
 */
export async function apiGetInvoiceReceipt(id) {
  return await apiClient(`/api/v1/invoices/${encodeURIComponent(id)}/receipt`);
}

/**
 * Fetch printable PDF for an invoice
 * GET /api/v1/invoices/{id}/pdf
 */
export async function apiGetInvoicePdf(id) {
  return await apiClient(`/api/v1/invoices/${encodeURIComponent(id)}/pdf`);
}

/**
 * Add a payment record to an invoice (Cash, UPI, Card)
 * POST /api/v1/invoices/{id}/payments
 */
export async function apiAddInvoicePayment(id, paymentData) {
  return await apiClient(`/api/v1/invoices/${encodeURIComponent(id)}/payments`, {
    method: 'POST',
    body: JSON.stringify(paymentData)
  });
}

/**
 * Get payment summary for an invoice
 * GET /api/v1/invoices/{id}/payment-summary
 */
export async function apiGetInvoicePaymentSummary(id) {
  return await apiClient(`/api/v1/invoices/${encodeURIComponent(id)}/payment-summary`);
}

/**
 * Get payment breakdown list for an invoice
 * GET /api/v1/invoices/{id}/payments
 */
export async function apiGetInvoicePayments(id) {
  return await apiClient(`/api/v1/invoices/${encodeURIComponent(id)}/payments`);
}
