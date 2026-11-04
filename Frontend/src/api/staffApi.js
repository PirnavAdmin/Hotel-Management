import { apiClient } from './apiConfig';

export async function apiGetStaff() {
  return await apiClient('/api/v1/staff');
}

export async function apiCreateStaff(staffData) {
  return await apiClient('/api/v1/staff', {
    method: 'POST',
    body: JSON.stringify({
      name: staffData.name,
      fullName: staffData.name,
      role: staffData.role || 'Waiter',
      roleTitle: staffData.role || 'Waiter',
      phone: staffData.phone || '',
      email: staffData.email || '',
      shift: staffData.shift || 'Full Day',
      salary: Number(staffData.salary || 0),
      section: staffData.section || 'Dine & Bar'
    })
  });
}

export async function apiUpdateStaff(id, staffData) {
  return await apiClient(`/api/v1/staff/${id}`, {
    method: 'PUT',
    body: JSON.stringify({
      ...staffData,
      name: staffData.name || staffData.fullName,
      fullName: staffData.name || staffData.fullName,
      role: staffData.role || staffData.roleTitle,
      roleTitle: staffData.role || staffData.roleTitle,
      salary: Number(staffData.salary !== undefined ? staffData.salary : 0),
      section: staffData.section || 'Dine & Bar'
    })
  });
}

export async function apiDeleteStaff(id) {
  return await apiClient(`/api/v1/staff/${id}`, {
    method: 'DELETE'
  });
}
