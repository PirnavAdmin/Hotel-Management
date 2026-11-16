import { apiClient, API_BASE_URL } from './apiConfig';

/**
 * Fetch Paginated Audit Trail Logs from ASP.NET API
 * GET /api/v1/audit/logs
 */
export async function apiGetAuditLogs(params = {}) {
  const query = new URLSearchParams();
  if (params.action && params.action !== 'all') query.set('action', params.action);
  if (params.tableName && params.tableName !== 'all') query.set('tableName', params.tableName);
  if (params.search) query.set('search', params.search);
  if (params.fromDate) query.set('fromDate', params.fromDate);
  if (params.toDate) query.set('toDate', params.toDate);
  if (params.page) query.set('page', params.page);
  if (params.pageSize) query.set('pageSize', params.pageSize);

  const qs = query.toString();
  return await apiClient(`/api/v1/audit/logs${qs ? `?${qs}` : ''}`);
}

/**
 * Record a manual or system audit event
 * POST /api/v1/audit/logs
 */
export async function apiCreateAuditLog(logData) {
  return await apiClient('/api/v1/audit/logs', {
    method: 'POST',
    body: JSON.stringify(logData),
  });
}

/**
 * Get Audit Activity Statistics Summary
 * GET /api/v1/audit/summary
 */
export async function apiGetAuditSummary() {
  return await apiClient('/api/v1/audit/summary');
}

/**
 * Download Audit Log CSV Export URL
 */
export function getAuditExportUrl(params = {}) {
  const query = new URLSearchParams();
  if (params.fromDate) query.set('fromDate', params.fromDate);
  if (params.toDate) query.set('toDate', params.toDate);
  const qs = query.toString();
  return `${API_BASE_URL}/api/v1/audit/export${qs ? `?${qs}` : ''}`;
}
