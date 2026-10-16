import { apiClient } from './apiConfig';

export async function apiGetKotOrders() {
  return await apiClient('/api/v1/kot/orders');
}

export async function apiGetKotSummary() {
  return await apiClient('/api/v1/kot/summary');
}

export async function apiGetKotDetails(id) {
  return await apiClient(`/api/v1/kot/${id}`);
}

export async function apiCreateKotOrder(orderId, kotData) {
  return await apiClient(`/api/v1/orders/${orderId}/kot`, {
    method: 'POST',
    body: JSON.stringify(kotData)
  });
}

export async function apiUpdateKotStatus(kotId, status) {
  return await apiClient(`/api/v1/kot/${kotId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status })
  });
}

export async function apiMarkAllPrepared(kotId) {
  return await apiClient(`/api/v1/kot/${kotId}/mark-all-prepared`, {
    method: 'POST'
  });
}

export async function apiAdvanceKotItem(kotId, itemId) {
  return await apiClient(`/api/v1/kot/${kotId}/items/${itemId}/advance`, {
    method: 'POST'
  });
}

export async function apiUpdateKotItemStatus(orderId, itemId, status) {
  return await apiClient(`/api/v1/kot/${orderId}/items/${itemId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status })
  });
}
