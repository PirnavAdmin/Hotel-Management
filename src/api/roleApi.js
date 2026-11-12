import { apiClient } from './apiConfig';

export async function apiGetRoles() {
  return await apiClient('/api/v1/roles');
}

export async function apiGetRoleById(roleId) {
  return await apiClient(`/api/v1/roles/${roleId}`);
}
