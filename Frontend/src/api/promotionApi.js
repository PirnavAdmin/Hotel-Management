import { apiClient } from './apiConfig';

export async function apiGetPromotions() {
  return await apiClient('/api/v1/promotions');
}

export async function apiCreatePromotion(promotionData) {
  return await apiClient('/api/v1/promotions', {
    method: 'POST',
    body: JSON.stringify(promotionData),
  });
}

export async function apiDeletePromotion(id) {
  return await apiClient(`/api/v1/promotions/${id}`, {
    method: 'DELETE',
  });
}
