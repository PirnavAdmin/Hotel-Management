import { apiClient } from './apiConfig';

export async function apiGetStaff() {
  return await apiClient('/api/v1/staff');
}

export async function apiCreateStaff(staffData) {
  return await apiClient('/api/v1/staff', {
    method: 'POST',
    body: JSON.stringify({
      name: staffData.name,
      role: staffData.role || 'Waiter',
      phone: staffData.phone || '',
      email: staffData.email || '',
      shift: staffData.shift || 'Full Day'
    })
  });
}

export async function apiUpdateStaff(id, staffData) {
  return await apiClient(`/api/v1/staff/${id}`, {
    method: 'PUT',
    body: JSON.stringify(staffData)
  });
}

export async function apiDeleteStaff(id) {
  return await apiClient(`/api/v1/staff/${id}`, {
    method: 'DELETE'
  });
}
