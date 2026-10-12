import { apiClient } from './apiConfig';

export async function apiGetStaff() {
  const res = await apiClient('/api/v1/staff');
  if (res.success && res.data) {
    const list = Array.isArray(res.data) 
      ? res.data 
      : (res.data.staff || res.data.data || []);
    return list.map(s => ({
      id: s.staffId || s.id,
      name: s.fullName || s.name,
      role: s.roleTitle || s.role || 'Waiter',
      phone: s.phone || '',
      email: s.email || '',
      shift: s.shift || 'Full Day',
      status: s.isActive === false ? 'inactive' : 'active'
    }));
  }
  return [];
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
