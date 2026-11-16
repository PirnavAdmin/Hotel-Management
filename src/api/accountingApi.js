import { apiClient } from './apiConfig';

/**
 * Fetch Chart of Accounts from ASP.NET API
 * GET /api/v1/accounting/chart-of-accounts
 */
export async function apiGetChartOfAccounts() {
  return await apiClient('/api/v1/accounting/chart-of-accounts');
}

/**
 * Create or update an account in Chart of Accounts
 * POST /api/v1/accounting/chart-of-accounts
 */
export async function apiSaveChartOfAccount(accountData) {
  return await apiClient('/api/v1/accounting/chart-of-accounts', {
    method: 'POST',
    body: JSON.stringify(accountData),
  });
}

/**
 * Fetch Double-Entry Journal Vouchers
 * GET /api/v1/accounting/journal-entries
 */
export async function apiGetJournalEntries(params = {}) {
  const query = new URLSearchParams();
  if (params.fromDate) query.set('fromDate', params.fromDate);
  if (params.toDate) query.set('toDate', params.toDate);
  const qs = query.toString();
  return await apiClient(`/api/v1/accounting/journal-entries${qs ? `?${qs}` : ''}`);
}

/**
 * Create a balanced Double-Entry Journal Entry
 * POST /api/v1/accounting/journal-entries
 */
export async function apiCreateJournalEntry(entryData) {
  return await apiClient('/api/v1/accounting/journal-entries', {
    method: 'POST',
    body: JSON.stringify(entryData),
  });
}

/**
 * Delete / Void a Journal Entry
 * DELETE /api/v1/accounting/journal-entries/{voucherNumber}
 */
export async function apiDeleteJournalEntry(voucherNumber) {
  return await apiClient(`/api/v1/accounting/journal-entries/${encodeURIComponent(voucherNumber)}`, {
    method: 'DELETE',
  });
}

/**
 * Fetch Daily Opening & Closing Float Balance Records
 * GET /api/v1/accounting/daily-balances
 */
export async function apiGetDailyBalances() {
  return await apiClient('/api/v1/accounting/daily-balances');
}

/**
 * Record Opening Float or Finalize Closing Register
 * POST /api/v1/accounting/daily-balances
 */
export async function apiSaveDailyBalance(balanceData) {
  return await apiClient('/api/v1/accounting/daily-balances', {
    method: 'POST',
    body: JSON.stringify(balanceData),
  });
}

/**
 * Fetch Live Financial Statements Summary (Revenue, COGS, Expenses, Net Profit, Assets, Equity)
 * GET /api/v1/accounting/summary
 */
export async function apiGetFinancialSummary() {
  return await apiClient('/api/v1/accounting/summary');
}
