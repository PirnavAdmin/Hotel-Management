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

export async function apiCreateKotOrder(orderIdOrData, kotData) {
  if (typeof orderIdOrData === 'object' && orderIdOrData !== null) {
    return await apiClient('/api/v1/kot/orders', {
      method: 'POST',
      body: JSON.stringify(orderIdOrData)
    });
  }
  return await apiClient(`/api/v1/orders/${orderIdOrData}/kot`, {
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
