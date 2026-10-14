import { apiClient } from './apiConfig';

export async function apiGetUsers() {
  return await apiClient('/api/Users');
}

export async function apiCreateUser(userData) {
  return await apiClient('/api/Users', {
    method: 'POST',
    body: JSON.stringify(userData)
  });
}

export async function apiUpdateUser(id, userData) {
  return await apiClient(`/api/Users/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(userData)
  });
}

export async function apiDeleteUser(id) {
  return await apiClient(`/api/Users/${encodeURIComponent(id)}`, {
    method: 'DELETE'
  });
}

export async function apiUpdateUserPassword(id, newPassword) {
  return await apiClient(`/api/Users/${encodeURIComponent(id)}/password`, {
    method: 'PUT',
    body: JSON.stringify({ newPassword })
  });
}
