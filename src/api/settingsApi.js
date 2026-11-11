import { apiClient } from './apiConfig';

export async function apiGetRestaurantSettings() {
  return await apiClient('/api/v1/restaurant-settings');
}

export async function apiSaveRestaurantSettings(settingsData) {
  return await apiClient('/api/v1/restaurant-settings', {
    method: 'PUT',
    body: JSON.stringify(settingsData),
  });
}
