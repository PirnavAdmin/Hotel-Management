import { apiClient } from './apiConfig';

export async function apiCreateBill(billData) {
  return await apiClient('/api/v1/bills', {
    method: 'POST',
    body: JSON.stringify(billData)
  });
}

export async function apiGetBill(billId) {
  return await apiClient(`/api/v1/bills/${billId}`);
}

export async function apiGetBillPaymentSummary(billId) {
  return await apiClient(`/api/v1/bills/${billId}/payment-summary`);
}

export async function apiGetBillPayments(billId) {
  return await apiClient(`/api/v1/bills/${billId}/payments`);
}

export async function apiAddBillPayment(billId, paymentData) {
  return await apiClient(`/api/v1/bills/${billId}/payments`, {
    method: 'POST',
    body: JSON.stringify(paymentData)
  });
}

export async function apiAddCashPayment(billId, cashData) {
  return await apiClient(`/api/v1/bills/${billId}/cash-payment`, {
    method: 'POST',
    body: JSON.stringify(cashData)
  });
}

export async function apiSettleBill(billId) {
  return await apiClient(`/api/v1/bills/${billId}/settle`, {
    method: 'POST'
  });
}
