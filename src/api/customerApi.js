import { apiClient } from './apiConfig';

export async function apiGetCustomers(search = '') {
  const query = search ? `?search=${encodeURIComponent(search)}` : '';
  return await apiClient(`/api/v1/customers${query}`);
}

export async function apiGetCustomerById(id) {
  return await apiClient(`/api/v1/customers/${id}`);
}

export async function apiCreateCustomer(customerData) {
  return await apiClient('/api/v1/customers', {
    method: 'POST',
    body: JSON.stringify(customerData)
  });
}

export async function apiUpdateCustomer(id, customerData) {
  return await apiClient(`/api/v1/customers/${id}`, {
    method: 'PUT',
    body: JSON.stringify(customerData)
  });
}

export async function apiDeleteCustomer(id) {
  return await apiClient(`/api/v1/customers/${id}`, {
    method: 'DELETE'
  });
}
