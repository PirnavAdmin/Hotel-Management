import { apiClient } from './apiConfig';

/**
 * Fetch all raw material & inventory suppliers
 * GET /api/v1/suppliers
 */
export async function apiGetSuppliers() {
  return await apiClient('/api/v1/suppliers');
}

/**
 * Create a new supplier
 * POST /api/v1/suppliers
 */
export async function apiCreateSupplier(supplierData) {
  return await apiClient('/api/v1/suppliers', {
    method: 'POST',
    body: JSON.stringify(supplierData)
  });
}

/**
 * Update an existing supplier
 * PUT /api/v1/suppliers/{id}
 */
export async function apiUpdateSupplier(id, supplierData) {
  return await apiClient(`/api/v1/suppliers/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(supplierData)
  });
}

/**
 * Delete a supplier
 * DELETE /api/v1/suppliers/{id}
 */
export async function apiDeleteSupplier(id) {
  return await apiClient(`/api/v1/suppliers/${encodeURIComponent(id)}`, {
    method: 'DELETE'
  });
}

/**
 * Get all purchase orders/records from a supplier
 * GET /api/v1/suppliers/{id}/purchases
 */
export async function apiGetSupplierPurchases(id) {
  return await apiClient(`/api/v1/suppliers/${encodeURIComponent(id)}/purchases`);
}

/**
 * Get purchase orders list
 * GET /api/v1/suppliers/purchase-orders?status=...
 */
export async function apiGetPurchaseOrders(status = null) {
  const query = status ? `?status=${encodeURIComponent(status)}` : '';
  return await apiClient(`/api/v1/suppliers/purchase-orders${query}`);
}

/**
 * Create a purchase order
 * POST /api/v1/suppliers/purchase-orders
 */
export async function apiCreatePurchaseOrder(poData) {
  return await apiClient('/api/v1/suppliers/purchase-orders', {
    method: 'POST',
    body: JSON.stringify(poData),
  });
}

/**
 * Update purchase order status
 * PUT /api/v1/suppliers/purchase-orders/{id}/status
 */
export async function apiUpdatePurchaseOrderStatus(id, status) {
  return await apiClient(`/api/v1/suppliers/purchase-orders/${encodeURIComponent(id)}/status`, {
    method: 'PUT',
    body: JSON.stringify({ status }),
  });
}
