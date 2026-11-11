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
