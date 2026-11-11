import { apiClient } from './apiConfig';

/**
 * Fetch delivery orders
 * GET /api/v1/delivery-orders?status=...
 */
export async function apiGetDeliveryOrders(status = '') {
  const query = status ? `?status=${encodeURIComponent(status)}` : '';
  return await apiClient(`/api/v1/delivery-orders${query}`);
}

/**
 * Create delivery order
 * POST /api/v1/delivery-orders
 */
export async function apiCreateDeliveryOrder(deliveryData) {
  return await apiClient('/api/v1/delivery-orders', {
    method: 'POST',
    body: JSON.stringify(deliveryData)
  });
}

/**
 * Update delivery status
 * PATCH /api/v1/delivery-orders/{id}/status
 */
export async function apiUpdateDeliveryStatus(id, status) {
  return await apiClient(`/api/v1/delivery-orders/${encodeURIComponent(id)}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status })
  });
}

/**
 * Assign delivery driver
 * PATCH /api/v1/delivery-orders/{id}/driver
 */
export async function apiAssignDeliveryDriver(id, driverName, driverPhone) {
  return await apiClient(`/api/v1/delivery-orders/${encodeURIComponent(id)}/driver`, {
    method: 'PATCH',
    body: JSON.stringify({ driverName, driverPhone })
  });
}
