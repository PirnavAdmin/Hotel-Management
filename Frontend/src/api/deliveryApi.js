import { apiClient } from './apiConfig';

export async function apiGetDeliveryOrders(status = '') {
  const query = status ? `?status=${encodeURIComponent(status)}` : '';
  return await apiClient(`/api/v1/delivery-orders${query}`);
}

export async function apiCreateDeliveryOrder(deliveryData) {
  return await apiClient('/api/v1/delivery-orders', {
    method: 'POST',
    body: JSON.stringify(deliveryData)
  });
}

export async function apiUpdateDeliveryStatus(id, status) {
  return await apiClient(`/api/v1/delivery-orders/${id}/status`, {
    method: 'PUT',
    body: JSON.stringify({ status })
  });
}
