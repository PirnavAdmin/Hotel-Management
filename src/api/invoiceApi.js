import { apiClient } from './apiConfig';

export async function apiGetInvoices() {
  return await apiClient('/api/v1/invoices');
}

export async function apiGetInvoice(id) {
  return await apiClient(`/api/v1/invoices/${id}`);
}

export async function apiGetInvoiceByOrder(orderId) {
  return await apiClient(`/api/v1/invoices/by-order/${orderId}`);
}

export async function apiCreateInvoice(invoiceData) {
  return await apiClient('/api/v1/invoices', {
    method: 'POST',
    body: JSON.stringify(invoiceData)
  });
}

export async function apiGetInvoiceReceipt(id) {
  return await apiClient(`/api/v1/invoices/${id}/receipt`);
}

export async function apiGetInvoicePdf(id) {
  return await apiClient(`/api/v1/invoices/${id}/pdf`);
}

export async function apiAddInvoicePayment(id, paymentData) {
  return await apiClient(`/api/v1/invoices/${id}/payments`, {
    method: 'POST',
    body: JSON.stringify(paymentData)
  });
}
