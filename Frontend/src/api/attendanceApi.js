import { apiClient } from './apiConfig';

export async function apiGetAttendanceLogs(staffId = null) {
  const query = staffId ? `?staffId=${encodeURIComponent(staffId)}` : '';
  return await apiClient(`/api/v1/employees/attendance${query}`);
}

export async function apiCheckInAttendance(staffId, shift = 'Morning Shift') {
  return await apiClient('/api/v1/employees/attendance/check-in', {
    method: 'POST',
    body: JSON.stringify({ staffId: Number(staffId), shift }),
  });
}

export async function apiCheckOutAttendance(attendanceId, staffId) {
  return await apiClient('/api/v1/employees/attendance/check-out', {
    method: 'POST',
    body: JSON.stringify({ attendanceId: Number(attendanceId), staffId: Number(staffId) }),
  });
}
