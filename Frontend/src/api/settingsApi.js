import { apiClient } from './apiConfig';

/**
 * Fetch Restaurant Brand Identity & Global Settings from ASP.NET Backend
 * GET /api/v1/restaurant-settings
 */
export async function apiGetRestaurantSettings() {
  return await apiClient('/api/v1/restaurant-settings');
}

/**
 * Update Restaurant Brand Identity & Global Settings in ASP.NET Backend
 * PUT /api/v1/restaurant-settings
 */
export async function apiUpdateRestaurantSettings(settingsData) {
  return await apiClient('/api/v1/restaurant-settings', {
    method: 'PUT',
    body: JSON.stringify(settingsData)
  });
}
