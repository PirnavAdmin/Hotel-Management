import { apiClient } from './apiConfig';

export async function apiGetReservations(params = {}) {
  const queryParts = [];
  if (params.branchId) queryParts.push(`branchId=${encodeURIComponent(params.branchId)}`);
  if (params.date) queryParts.push(`date=${encodeURIComponent(params.date)}`);
  if (params.status) queryParts.push(`status=${encodeURIComponent(params.status)}`);
  const query = queryParts.length > 0 ? `?${queryParts.join('&')}` : '';
  return await apiClient(`/api/v1/reservations${query}`);
}

export async function apiCreateReservation(reservationData) {
  return await apiClient('/api/v1/reservations', {
    method: 'POST',
    body: JSON.stringify(reservationData),
  });
}

export async function apiUpdateReservationStatus(id, status) {
  return await apiClient(`/api/v1/reservations/${id}/status`, {
    method: 'PUT',
    body: JSON.stringify({ status }),
  });
}

export async function apiDeleteReservation(id) {
  return await apiClient(`/api/v1/reservations/${id}`, {
    method: 'DELETE',
  });
}
