import { apiClient } from './apiConfig';

export async function apiGetOrders() {
  const res = await apiClient('/api/v1/orders');
  if (res.success && res.data) {
    const list = Array.isArray(res.data) 
      ? res.data 
      : (res.data.orders || res.data.data || []);
    return list;
  }
  return [];
}

export async function apiGetActiveOrders() {
  return await apiClient('/api/v1/orders/active');
}

export async function apiGetOrder(id) {
  return await apiClient(`/api/v1/orders/${id}`);
}

export async function apiGetOrderForTable(tableId) {
  return await apiClient(`/api/v1/orders/table/${tableId}`);
}

export async function apiCreateOrder(orderData) {
  return await apiClient('/api/v1/orders', {
    method: 'POST',
    body: JSON.stringify(orderData)
  });
}

export async function apiAddOrderItems(orderId, items) {
  return await apiClient(`/api/v1/orders/${orderId}/items`, {
    method: 'POST',
    body: JSON.stringify({ items })
  });
}

export async function apiUpdateOrderItems(orderId, items) {
  return await apiClient(`/api/v1/orders/${orderId}/items`, {
    method: 'PUT',
    body: JSON.stringify({ items })
  });
}

export async function apiUpdateOrderItem(orderId, itemId, updates) {
  return await apiClient(`/api/v1/orders/${orderId}/items/${itemId}`, {
    method: 'PATCH',
    body: JSON.stringify(updates)
  });
}

export async function apiRemoveOrderItem(orderId, itemId) {
  return await apiClient(`/api/v1/orders/${orderId}/items/${itemId}`, {
    method: 'DELETE'
  });
}

export async function apiUpdateOrderGuests(orderId, guests) {
  return await apiClient(`/api/v1/orders/${orderId}/guests`, {
    method: 'PATCH',
    body: JSON.stringify({ guests })
  });
}

export async function apiUpdateOrderDiscount(orderId, discount) {
  return await apiClient(`/api/v1/orders/${orderId}/discount`, {
    method: 'PATCH',
    body: JSON.stringify({ discount })
  });
}

export async function apiUpdateOrderServiceCharge(orderId, serviceCharge) {
  return await apiClient(`/api/v1/orders/${orderId}/service-charge`, {
    method: 'PATCH',
    body: JSON.stringify({ serviceCharge })
  });
}

export async function apiUpdateOrderItemNotes(orderId, itemId, notes) {
  return await apiClient(`/api/v1/orders/${orderId}/items/${itemId}/notes`, {
    method: 'PATCH',
    body: JSON.stringify({ notes })
  });
}

export async function apiGetOrderBillSummary(orderId) {
  return await apiClient(`/api/v1/orders/${orderId}/bill-summary`);
}

export async function apiGetOrderHistory() {
  return await apiClient('/api/v1/orders/history');
}

export async function apiGetOrderReceipt(orderId) {
  return await apiClient(`/api/v1/orders/${orderId}/receipt`);
}
