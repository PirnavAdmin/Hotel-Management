import { apiClient } from './apiConfig';

export async function apiGetDashboard() {
  return await apiClient('/api/Reports/dashboard');
}

export async function apiGetSalesReports() {
  return await apiClient('/api/v1/reports/sales');
}
