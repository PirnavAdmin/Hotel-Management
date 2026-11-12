import { apiClient } from './apiConfig';

/**
 * Fetch all discounts & promotional codes
 * GET /api/v1/promotions
 */
export async function apiGetPromotions() {
  return await apiClient('/api/v1/promotions');
}

/**
 * Create a new promotion code
 * POST /api/v1/promotions
 */
export async function apiCreatePromotion(promotionData) {
  return await apiClient('/api/v1/promotions', {
    method: 'POST',
    body: JSON.stringify(promotionData)
  });
}

/**
 * Validate and calculate discount for a promo code
 * POST /api/v1/promotions/validate
 */
export async function apiValidatePromotion(code, orderAmount) {
  return await apiClient('/api/v1/promotions/validate', {
    method: 'POST',
    body: JSON.stringify({ code, orderAmount })
  });
}

/**
 * Delete a promotion
 * DELETE /api/v1/promotions/{id}
 */
export async function apiDeletePromotion(id) {
  return await apiClient(`/api/v1/promotions/${encodeURIComponent(id)}`, {
    method: 'DELETE'
  });
}
