import { apiClient } from './apiConfig';

export async function apiGetSuppliers() {
  return await apiClient('/api/v1/suppliers');
}

export async function apiCreateSupplier(supplierData) {
  return await apiClient('/api/v1/suppliers', {
    method: 'POST',
    body: JSON.stringify(supplierData),
  });
}

export async function apiDeleteSupplier(id) {
  return await apiClient(`/api/v1/suppliers/${id}`, {
    method: 'DELETE',
  });
}

export async function apiGetPurchaseOrders(status = null) {
  const query = status ? `?status=${encodeURIComponent(status)}` : '';
  return await apiClient(`/api/v1/suppliers/purchase-orders${query}`);
}

export async function apiCreatePurchaseOrder(poData) {
  return await apiClient('/api/v1/suppliers/purchase-orders', {
    method: 'POST',
    body: JSON.stringify(poData),
  });
}

export async function apiUpdatePurchaseOrderStatus(id, status) {
  return await apiClient(`/api/v1/suppliers/purchase-orders/${id}/status`, {
    method: 'PUT',
    body: JSON.stringify({ status }),
  });
}
