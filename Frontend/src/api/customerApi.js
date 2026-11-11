import { apiClient } from './apiConfig';

/**
 * Fetch all customers or search by name / phone
 * GET /api/v1/customers?search=...
 */
export async function apiGetCustomers(search = '') {
  const query = search ? `?search=${encodeURIComponent(search)}` : '';
  return await apiClient(`/api/v1/customers${query}`);
}

/**
 * Fetch customer by ID
 * GET /api/v1/customers/{id}
 */
export async function apiGetCustomerById(id) {
  return await apiClient(`/api/v1/customers/${encodeURIComponent(id)}`);
}

/**
 * Create a new customer profile
 * POST /api/v1/customers
 */
export async function apiCreateCustomer(customerData) {
  return await apiClient('/api/v1/customers', {
    method: 'POST',
    body: JSON.stringify(customerData)
  });
}

/**
 * Update an existing customer profile
 * PUT /api/v1/customers/{id}
 */
export async function apiUpdateCustomer(id, customerData) {
  return await apiClient(`/api/v1/customers/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(customerData)
  });
}

/**
 * Delete a customer profile
 * DELETE /api/v1/customers/{id}
 */
export async function apiDeleteCustomer(id) {
  return await apiClient(`/api/v1/customers/${encodeURIComponent(id)}`, {
    method: 'DELETE'
  });
}
