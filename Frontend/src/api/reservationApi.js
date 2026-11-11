import { apiClient } from './apiConfig';

/**
 * Fetch table reservations
 * GET /api/v1/reservations?branchId=...&date=...&status=...
 */
export async function apiGetReservations(branchId = 1, date = null, status = null) {
  const query = new URLSearchParams();
  if (branchId) query.set('branchId', branchId);
  if (date) query.set('date', date);
  if (status) query.set('status', status);
  const qs = query.toString();
  return await apiClient(`/api/v1/reservations${qs ? `?${qs}` : ''}`);
}

/**
 * Fetch reservation by ID
 * GET /api/v1/reservations/{id}
 */
export async function apiGetReservationById(id) {
  return await apiClient(`/api/v1/reservations/${encodeURIComponent(id)}`);
}

/**
 * Create a new table reservation
 * POST /api/v1/reservations
 */
export async function apiCreateReservation(reservationData) {
  return await apiClient('/api/v1/reservations', {
    method: 'POST',
    body: JSON.stringify(reservationData)
  });
}

/**
 * Update an existing table reservation
 * PUT /api/v1/reservations/{id}
 */
export async function apiUpdateReservation(id, reservationData) {
  return await apiClient(`/api/v1/reservations/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(reservationData)
  });
}

/**
 * Update reservation status (e.g. confirmed, seated, cancelled)
 * PATCH /api/v1/reservations/{id}/status
 */
export async function apiUpdateReservationStatus(id, status) {
  return await apiClient(`/api/v1/reservations/${encodeURIComponent(id)}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status })
  });
}

/**
 * Delete a reservation
 * DELETE /api/v1/reservations/{id}
 */
export async function apiDeleteReservation(id) {
  return await apiClient(`/api/v1/reservations/${encodeURIComponent(id)}`, {
    method: 'DELETE'
  });
}

/**
 * Get available tables for reservation
 * GET /api/v1/reservations/available-tables
 */
export async function apiGetAvailableReservationTables(date, time, guests, branchId = 1) {
  const query = new URLSearchParams();
  if (branchId) query.set('branchId', branchId);
  if (date) query.set('date', date);
  if (time) query.set('time', time);
  if (guests) query.set('guests', guests);
  const qs = query.toString();
  return await apiClient(`/api/v1/reservations/available-tables${qs ? `?${qs}` : ''}`);
}
