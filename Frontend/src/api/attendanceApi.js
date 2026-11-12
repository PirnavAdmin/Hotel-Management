import { apiClient } from './apiConfig';

/**
 * Fetch staff attendance logs
 * GET /api/v1/employees/attendance?staffId=...
 */
export async function apiGetAttendanceLogs(staffId = null) {
  const query = staffId != null ? `?staffId=${encodeURIComponent(staffId)}` : '';
  return await apiClient(`/api/v1/employees/attendance${query}`);
}

/**
 * Check-in staff member
 * POST /api/v1/employees/attendance/check-in
 */
export async function apiCheckInStaff(staffId, shift = 'Morning Shift') {
  return await apiClient('/api/v1/employees/attendance/check-in', {
    method: 'POST',
    body: JSON.stringify({ staffId: Number(staffId), shift })
  });
}

export const apiCheckInAttendance = apiCheckInStaff;

/**
 * Check-out staff member
 * POST /api/v1/employees/attendance/check-out
 */
export async function apiCheckOutStaff(staffId, attendanceId = null) {
  const payload = { staffId: Number(staffId) };
  if (attendanceId != null) payload.attendanceId = Number(attendanceId);
  return await apiClient('/api/v1/employees/attendance/check-out', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export const apiCheckOutAttendance = apiCheckOutStaff;
