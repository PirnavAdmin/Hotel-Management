import { apiClient } from './apiConfig';

/**
 * Fetch Executive Dashboard Summary (Today revenue, settled orders, active tables, top dishes)
 * GET /api/v1/reports/dashboard
 */
export async function apiGetDashboard() {
  return await apiClient('/api/v1/reports/dashboard');
}

/**
 * Fetch Daily Sales Breakdown
 * GET /api/v1/reports/daily-sales?days=30
 */
export async function apiGetDailySalesReport(days = 30) {
  return await apiClient(`/api/v1/reports/daily-sales?days=${encodeURIComponent(days)}`);
}

/**
 * Fetch Monthly Sales Breakdown for a Fiscal/Calendar Year
 * GET /api/v1/reports/monthly-sales?year=2026
 */
export async function apiGetMonthlySalesReport(year) {
  const query = year ? `?year=${encodeURIComponent(year)}` : '';
  return await apiClient(`/api/v1/reports/monthly-sales${query}`);
}

/**
 * Fetch Sales Reports (Alias matching sales summaries)
 */
export async function apiGetSalesReports(days = 30) {
  return await apiGetDailySalesReport(days);
}

/**
 * Fetch KOT Kitchen Ticket Statistics & Efficiency
 * GET /api/v1/reports/kot
 */
export async function apiGetKotReport() {
  return await apiClient('/api/v1/reports/kot');
}

/**
 * Fetch Raw Material & Inventory Stock Report
 * GET /api/v1/reports/inventory
 */
export async function apiGetInventoryReport(filter = {}) {
  const query = new URLSearchParams();
  if (filter.category) query.set('category', filter.category);
  if (filter.status) query.set('status', filter.status);
  const qs = query.toString();
  return await apiClient(`/api/v1/reports/inventory${qs ? `?${qs}` : ''}`);
}

/**
 * Fetch Low Stock Alerts
 * GET /api/v1/reports/low-stock
 */
export async function apiGetLowStockReport() {
  return await apiClient('/api/v1/reports/low-stock');
}

/**
 * Fetch Top Selling Dishes & Best Sellers
 * GET /api/v1/reports/top-selling
 */
export async function apiGetTopSellingReport() {
  return await apiClient('/api/v1/reports/top-selling');
}

/**
 * Fetch Payment Method Breakdown (Cash, UPI, Card, Takeaway)
 * GET /api/v1/reports/payments
 */
export async function apiGetPaymentsReport() {
  return await apiClient('/api/v1/reports/payments');
}

/**
 * Fetch Category-Wise Sales Distribution
 * GET /api/v1/reports/category-sales
 */
export async function apiGetCategorySalesReport() {
  return await apiClient('/api/v1/reports/category-sales');
}

/**
 * Fetch Total Revenue & Settled Sales Summary
 * GET /api/v1/reports/revenue
 */
export async function apiGetRevenueReport() {
  return await apiClient('/api/v1/reports/revenue');
}

/**
 * Fetch Inventory Purchases Ledger
 * GET /api/v1/reports/inventory-purchases
 */
export async function apiGetInventoryPurchases(filter = {}) {
  const query = new URLSearchParams();
  if (filter.supplier) query.set('supplier', filter.supplier);
  if (filter.fromDate) query.set('fromDate', filter.fromDate);
  if (filter.toDate) query.set('toDate', filter.toDate);
  const qs = query.toString();
  return await apiClient(`/api/v1/reports/inventory-purchases${qs ? `?${qs}` : ''}`);
}

/**
 * Fetch Inventory Purchase Summary
 * GET /api/v1/reports/inventory-purchase-summary
 */
export async function apiGetInventoryPurchaseSummary(fromDate, toDate) {
  const query = new URLSearchParams();
  if (fromDate) query.set('fromDate', fromDate);
  if (toDate) query.set('toDate', toDate);
  const qs = query.toString();
  return await apiClient(`/api/v1/reports/inventory-purchase-summary${qs ? `?${qs}` : ''}`);
}

/**
 * Fetch Salary & Payroll Reports
 * GET /api/v1/reports/salary
 */
export async function apiGetSalaryReports(filter = {}) {
  const query = new URLSearchParams();
  if (filter.month) query.set('month', filter.month);
  if (filter.staffId) query.set('staffId', filter.staffId);
  const qs = query.toString();
  return await apiClient(`/api/v1/reports/salary${qs ? `?${qs}` : ''}`);
}

/**
 * Fetch Salary Summary
 * GET /api/v1/reports/salary-summary
 */
export async function apiGetSalarySummary(month) {
  const query = month ? `?month=${encodeURIComponent(month)}` : '';
  return await apiClient(`/api/v1/reports/salary-summary${query}`);
}

/**
 * Fetch Payroll Budget
 * GET /api/v1/reports/payroll-budget
 */
export async function apiGetPayrollBudget(month) {
  const query = month ? `?month=${encodeURIComponent(month)}` : '';
  return await apiClient(`/api/v1/reports/payroll-budget${query}`);
}
