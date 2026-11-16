import { apiClient } from './apiConfig';

/**
 * Fetch all defined system roles
 * GET /api/v1/roles
 */
export async function apiGetRoles() {
  return await apiClient('/api/v1/roles');
}

/**
 * Fetch role details by role ID
 * GET /api/v1/roles/{roleId}
 */
export async function apiGetRoleById(roleId) {
  return await apiClient(`/api/v1/roles/${encodeURIComponent(roleId)}`);
}
