using HMS.Services;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using HMS.Data;
using HMS.DTOs;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;

namespace HMS.Controllers;

[ApiController]
[Route("api/v1/reports")]
[Microsoft.AspNetCore.Authorization.AllowAnonymous]
[Tags("Admin", "Reports")]
public class ReportsController : ControllerBase
{
    private readonly SpService _spService;
    private readonly BarService _barService;
    private readonly SalaryService _salaryService;
    private readonly ReportingExportService _reportingExportService;
    private readonly ExportService _exportService;
    private readonly ILogger<ReportsController> _logger;

    public ReportsController(
        SpService spService,
        BarService barService,
        SalaryService salaryService,
        ReportingExportService reportingExportService,
        ExportService exportService,
        ILogger<ReportsController> logger)
    {
        _spService = spService;
        _barService = barService;
        _salaryService = salaryService;
        _reportingExportService = reportingExportService;
        _exportService = exportService;
        _logger = logger;
    }[HttpGet("dashboard")]
    public async Task<IActionResult> GetDashboardReport()
    {
        try
        {
            decimal todayRevenue = 0.00m;
            int settledOrdersCount = 0;
            int totalOrdersCount = 0;
            int activeTablesCount = 0;
            var topSellingDishes = new List<TopSellingDishDto>();
            var paymentMethodBreakdown = new Dictionary<string, decimal>();

            await _spService.ExecuteQueryMultipleAsync("sp_GetReportsDashboardSummary", null,
                reader =>
                {
                    if (reader.Read())
                    {
                        todayRevenue = reader.GetDecimal(0);
                        settledOrdersCount = Convert.ToInt32(reader[1]);
                    }
                },
                reader =>
                {
                    if (reader.Read())
                    {
                        totalOrdersCount = Convert.ToInt32(reader[0]);
                    }
                },
                reader =>
                {
                    if (reader.Read())
                    {
                        activeTablesCount = Convert.ToInt32(reader[0]);
                    }
                },
                reader =>
                {
                    while (reader.Read())
                    {
                        topSellingDishes.Add(new TopSellingDishDto
                        {
                            ItemName = reader.GetString(0),
                            QuantitySold = Convert.ToInt32(reader[1]),
                            TotalRevenue = reader.GetDecimal(2)
                        });
                    }
                },
                reader =>
                {
                    while (reader.Read())
                    {
                        paymentMethodBreakdown[reader.GetString(0)] = reader.GetDecimal(1);
                    }
                });

            decimal avgOrderValue = settledOrdersCount > 0 ? Math.Round(todayRevenue / settledOrdersCount, 2) : 0;

            return Ok(new DashboardReportDto
            {
                TodayRevenue = todayRevenue,
                TodayTotalOrders = totalOrdersCount,
                TodaySettledOrders = settledOrdersCount,
                ActiveTablesCount = activeTablesCount,
                AverageOrderValue = avgOrderValue,
                TopSellingDishes = topSellingDishes,
                PaymentMethodBreakdown = paymentMethodBreakdown,
                CategorySalesBreakdown = new Dictionary<string, int>()
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting dashboard report");
            return StatusCode(500, new { success = false, message = ex.Message });
        }
    }

    [HttpGet("daily")]
    [HttpGet("daily-sales")]
    public async Task<IActionResult> GetDailySalesReport([FromQuery] int? days)
    {
        try
        {
            var parameters = new Dictionary<string, object?> { { "p_days", days ?? 30 } };
            var list = await _spService.ExecuteQueryAsync("sp_GetDailySalesReport", reader => new
            {
                saleDate = reader.GetDateTime(0).ToString("yyyy-MM-dd"),
                totalInvoices = reader.GetInt64(1),
                paidInvoices = Convert.ToInt64(reader[2]),
                subtotal = reader.GetDecimal(3),
                taxAmount = reader.GetDecimal(4),
                discountAmount = reader.GetDecimal(5),
                totalAmount = reader.GetDecimal(6),
                paidAmount = reader.GetDecimal(7)
            }, parameters);

            return Ok(new
            {
                success = true,
                message = "Daily sales report retrieved successfully.",
                count = list.Count,
                data = list
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting daily sales report");
            return StatusCode(500, new { success = false, message = ex.Message });
        }
    }

    [HttpGet("monthly")]
    [HttpGet("monthly-sales")]
    public async Task<IActionResult> GetMonthlySalesReport([FromQuery] int? year)
    {
        try
        {
            var parameters = new Dictionary<string, object?> { { "p_year", year ?? DateTime.UtcNow.Year } };
            var list = await _spService.ExecuteQueryAsync("sp_GetMonthlySalesReport", reader => new
            {
                saleMonth = reader.GetString(0),
                totalInvoices = reader.GetInt64(1),
                paidInvoices = Convert.ToInt64(reader[2]),
                subtotal = reader.GetDecimal(3),
                taxAmount = reader.GetDecimal(4),
                discountAmount = reader.GetDecimal(5),
                totalAmount = reader.GetDecimal(6),
                paidAmount = reader.GetDecimal(7)
            }, parameters);

            return Ok(new
            {
                success = true,
                message = "Monthly sales report retrieved successfully.",
                count = list.Count,
                data = list
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting monthly sales report");
            return StatusCode(500, new { success = false, message = ex.Message });
        }
    }

    [HttpGet("kot")]
    public async Task<IActionResult> GetKotReport()
    {
        try
        {
            object? summary = null;
            var recentTickets = new List<object>();

            await _spService.ExecuteQueryMultipleAsync("sp_GetKotReport", null,
                reader =>
                {
                    if (reader.Read())
                    {
                        summary = new
                        {
                            totalTickets = Convert.ToInt64(reader[0]),
                            completedTickets = Convert.ToInt64(reader[1]),
                            activeTickets = Convert.ToInt64(reader[2]),
                            totalItemsOrdered = Convert.ToInt64(reader[3]),
                            totalItemsPrepared = Convert.ToInt64(reader[4])
                        };
                    }
                },
                reader =>
                {
                    while (reader.Read())
                    {
                        recentTickets.Add(new
                        {
                            orderId = reader.GetInt64(0),
                            kotNumber = reader.GetString(1),
                            tableName = reader.IsDBNull(2) ? "Table" : reader.GetString(2),
                            sectionArea = reader.IsDBNull(3) ? "Main Hall" : reader.GetString(3),
                            serverName = reader.IsDBNull(4) ? "Staff" : reader.GetString(4),
                            orderStatus = reader.IsDBNull(5) ? "Pending" : reader.GetString(5),
                            totalItems = reader.GetInt32(6),
                            preparedItems = reader.GetInt32(7),
                            createdAt = reader.GetDateTime(8)
                        });
                    }
                });

            return Ok(new
            {
                success = true,
                message = "KOT performance report retrieved successfully.",
                summary,
                recentTickets
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting KOT report");
            return StatusCode(500, new { success = false, message = ex.Message });
        }
    }

    [HttpGet("inventory/legacy-valuation")]
public async Task<IActionResult> GetInventoryReport()
    {
        try
        {
            var categorySummary = new List<object>();
            var ingredientStocks = new List<object>();

            await _spService.ExecuteQueryMultipleAsync("sp_GetInventoryReport", null,
                reader =>
                {
                    while (reader.Read())
                    {
                        categorySummary.Add(new
                        {
                            category = reader.IsDBNull(0) ? "Uncategorized" : reader.GetString(0),
                            totalItems = Convert.ToInt64(reader[1]),
                            lowStockItems = Convert.ToInt64(reader[2]),
                            outOfStockItems = Convert.ToInt64(reader[3]),
                            totalInventoryValuation = reader.GetDecimal(4)
                        });
                    }
                },
                reader =>
                {
                    while (reader.Read())
                    {
                        ingredientStocks.Add(new
                        {
                            ingredientId = reader.GetInt64(0),
                            name = reader.GetString(1),
                            category = reader.IsDBNull(2) ? "General" : reader.GetString(2),
                            supplier = reader.IsDBNull(3) ? "Local" : reader.GetString(3),
                            unit = reader.GetString(4),
                            currentStock = reader.GetDecimal(5),
                            minimumThreshold = reader.GetDecimal(6),
                            unitCost = reader.GetDecimal(7),
                            stockValue = reader.GetDecimal(8),
                            stockStatus = reader.GetString(9)
                        });
                    }
                });

            return Ok(new
            {
                success = true,
                message = "Inventory valuation report retrieved successfully.",
                categorySummary,
                ingredientStocks
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting inventory report");
            return StatusCode(500, new { success = false, message = ex.Message });
        }
    }

    [HttpGet("low-stock")]
    public async Task<IActionResult> GetLowStockReport()
    {
        try
        {
            var list = await _spService.ExecuteQueryAsync("sp_GetLowStockIngredients", reader =>
            {
                int idOrd = InventoryController.GetOrdinalSafe(reader, "ingredient_id", "id");
                int nameOrd = InventoryController.GetOrdinalSafe(reader, "name", "ingredient_name");
                int unitOrd = InventoryController.GetOrdinalSafe(reader, "unit");
                int stockOrd = InventoryController.GetOrdinalSafe(reader, "current_stock", "stock");
                int minOrd = InventoryController.GetOrdinalSafe(reader, "minimum_threshold", "reorder_level");
                int costOrd = InventoryController.GetOrdinalSafe(reader, "unit_cost", "cost_per_unit");
                int catOrd = InventoryController.GetOrdinalSafe(reader, "category");
                int subOrd = InventoryController.GetOrdinalSafe(reader, "subcategory", "sub_category");
                int supOrd = InventoryController.GetOrdinalSafe(reader, "supplier");

                return new
                {
                    ingredientId = idOrd >= 0 && !reader.IsDBNull(idOrd) ? Convert.ToInt64(reader.GetValue(idOrd)) : 0L,
                    name = nameOrd >= 0 && !reader.IsDBNull(nameOrd) ? reader.GetString(nameOrd) : string.Empty,
                    unit = unitOrd >= 0 && !reader.IsDBNull(unitOrd) ? reader.GetString(unitOrd).ToUpperInvariant() : "KG",
                    currentStock = stockOrd >= 0 && !reader.IsDBNull(stockOrd) ? Convert.ToDecimal(reader.GetValue(stockOrd)) : 0.00m,
                    minimumThreshold = minOrd >= 0 && !reader.IsDBNull(minOrd) ? Convert.ToDecimal(reader.GetValue(minOrd)) : 5.00m,
                    unitCost = costOrd >= 0 && !reader.IsDBNull(costOrd) ? Convert.ToDecimal(reader.GetValue(costOrd)) : 0.00m,
                    category = catOrd >= 0 && !reader.IsDBNull(catOrd) ? reader.GetString(catOrd) : "General",
                    subcategory = subOrd >= 0 && !reader.IsDBNull(subOrd) ? reader.GetString(subOrd) : string.Empty,
                    supplier = supOrd >= 0 && !reader.IsDBNull(supOrd) ? reader.GetString(supOrd) : "Local Supplier"
                };
            });

            return Ok(new
            {
                success = true,
                message = "Low stock alert ingredients retrieved successfully.",
                count = list.Count,
                data = list
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting low stock report");
            return StatusCode(500, new { success = false, message = ex.Message });
        }
    }

    [HttpGet("top-selling")]
    public async Task<IActionResult> GetTopSellingReport()
    {
        try
        {
            var topSellingDishes = new List<TopSellingDishDto>();
            await _spService.ExecuteQueryMultipleAsync("sp_GetReportsDashboardSummary", null,
                _ => { }, _ => { }, _ => { },
                reader =>
                {
                    while (reader.Read())
                    {
                        topSellingDishes.Add(new TopSellingDishDto
                        {
                            ItemName = reader.GetString(0),
                            QuantitySold = Convert.ToInt32(reader[1]),
                            TotalRevenue = reader.GetDecimal(2)
                        });
                    }
                },
                _ => { });

            return Ok(new
            {
                success = true,
                message = "Top selling dishes retrieved successfully.",
                count = topSellingDishes.Count,
                data = topSellingDishes
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting top selling report");
            return StatusCode(500, new { success = false, message = ex.Message });
        }
    }

    [HttpGet("payments")]
    public async Task<IActionResult> GetPaymentsReport()
    {
        try
        {
            var paymentMethodBreakdown = new Dictionary<string, decimal>();
            await _spService.ExecuteQueryMultipleAsync("sp_GetReportsDashboardSummary", null,
                _ => { }, _ => { }, _ => { }, _ => { },
                reader =>
                {
                    while (reader.Read())
                    {
                        paymentMethodBreakdown[reader.GetString(0)] = reader.GetDecimal(1);
                    }
                });

            return Ok(new
            {
                success = true,
                message = "Payment breakdown retrieved successfully.",
                data = paymentMethodBreakdown
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting payments report");
            return StatusCode(500, new { success = false, message = ex.Message });
        }
    }

    [HttpGet("categories")]
    [HttpGet("category-sales")]
    public async Task<IActionResult> GetCategorySalesReport()
    {
        try
        {
            var list = await _spService.ExecuteQueryAsync("sp_GetCategorySalesReport", reader => new
            {
                category = reader.GetString(0),
                itemsSold = Convert.ToInt64(reader[1]),
                quantity = Convert.ToInt64(reader[2]),
                revenue = reader.GetDecimal(3)
            });

            return Ok(new
            {
                success = true,
                message = "Category sales breakdown retrieved successfully.",
                count = list.Count,
                data = list
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting category sales report");
            return StatusCode(500, new { success = false, message = ex.Message });
        }
    }

    [HttpGet("sales")]
    [HttpGet("revenue")]
    public async Task<IActionResult> GetRevenueReport()
    {
        return await GetDashboardReport();
    }

    #region Export Endpoints

    [HttpGet("sales/export")]
    public async Task<IActionResult> ExportSalesReport(
        [FromQuery] DateTime? fromDate,
        [FromQuery] DateTime? toDate,
        [FromQuery] string? department = null,
        [FromQuery] int? days = null,
        [FromQuery] string? format = "csv")
    {
        var doc = await _reportingExportService.GenerateSalesReportExportAsync(fromDate, toDate, department, days);
        return _exportService.ExportResult(doc, format);
    }

    [HttpGet("profit-loss/export")]
    public async Task<IActionResult> ExportProfitLossReport(
        [FromQuery] DateTime? fromDate,
        [FromQuery] DateTime? toDate,
        [FromQuery] string? department = null,
        [FromQuery] string? format = "csv")
    {
        var doc = await _reportingExportService.GenerateProfitLossExportAsync(fromDate, toDate, department);
        return _exportService.ExportResult(doc, format);
    }

    [HttpGet("expenditure/export")]
    public async Task<IActionResult> ExportExpenditureReport(
        [FromQuery] DateTime? fromDate,
        [FromQuery] DateTime? toDate,
        [FromQuery] string? department = null,
        [FromQuery] string? format = "csv")
    {
        var doc = await _reportingExportService.GenerateExpenditureExportAsync(fromDate, toDate, department);
        return _exportService.ExportResult(doc, format);
    }

    [HttpGet("opening-balance/export")]
    public async Task<IActionResult> ExportOpeningBalance(
        [FromQuery] DateTime? fromDate,
        [FromQuery] DateTime? toDate,
        [FromQuery] string? department = null,
        [FromQuery] string? format = "csv")
    {
        var doc = await _reportingExportService.GenerateOpeningBalanceExportAsync(fromDate, toDate, department);
        return _exportService.ExportResult(doc, format);
    }

    [HttpGet("closing-balance/export")]
    public async Task<IActionResult> ExportClosingBalance(
        [FromQuery] DateTime? fromDate,
        [FromQuery] DateTime? toDate,
        [FromQuery] string? department = null,
        [FromQuery] string? format = "csv")
    {
        var doc = await _reportingExportService.GenerateClosingBalanceExportAsync(fromDate, toDate, department);
        return _exportService.ExportResult(doc, format);
    }

    [HttpGet("dine/export")]
    public async Task<IActionResult> ExportDineReport(
        [FromQuery] DateTime? fromDate,
        [FromQuery] DateTime? toDate,
        [FromQuery] string? format = "csv")
    {
        var doc = await _reportingExportService.GenerateDineReportExportAsync(fromDate, toDate);
        return _exportService.ExportResult(doc, format, "Dine_Performance_Report");
    }

    [HttpGet("financial/export")]
    public async Task<IActionResult> ExportFinancialReport(
        [FromQuery] DateTime? fromDate,
        [FromQuery] DateTime? toDate,
        [FromQuery] string? department = null,
        [FromQuery] string? format = "csv")
    {
        var doc = await _reportingExportService.GenerateFinancialReportExportAsync(fromDate, toDate, department);
        return _exportService.ExportResult(doc, format);
    }

    #endregion

    #region Inventory Reports

    [HttpGet("inventory")]
    public async Task<IActionResult> GetInventoryReport([FromQuery] InventoryReportFilterDto filter)
    {
        try
        {
            var report = await _barService.GetInventoryReportAsync(filter);
            return Ok(report);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting inventory report");
            return StatusCode(500, new { success = false, message = ex.Message });
        }
    }

    [HttpGet("inventory/purchases")]
    [HttpGet("inventory-purchases")]
    public async Task<IActionResult> GetInventoryPurchases([FromQuery] PurchaseLedgerFilterDto filter)
    {
        try
        {
            var purchases = await _barService.GetInventoryPurchasesAsync(filter);
            return Ok(purchases);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting inventory purchases ledger");
            return StatusCode(500, new { success = false, message = ex.Message });
        }
    }

    [HttpGet("inventory/purchase-summary")]
    [HttpGet("inventory-purchase-summary")]
    public async Task<IActionResult> GetInventoryPurchaseSummary([FromQuery] DateTime? fromDate, [FromQuery] DateTime? toDate)
    {
        try
        {
            var summary = await _barService.GetInventoryPurchaseSummaryAsync(fromDate, toDate);
            return Ok(new { success = true, data = summary });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting inventory purchase summary");
            return StatusCode(500, new { success = false, message = ex.Message });
        }
    }

    [HttpGet("inventory/export")]
    public async Task<IActionResult> ExportInventoryReport([FromQuery] InventoryReportFilterDto filter)
    {
        try
        {
            var bytes = await _barService.ExportInventoryCsvAsync(filter);
            var fileName = $"inventory_report_{DateTime.UtcNow:yyyyMMdd_HHmmss}.csv";
            return File(bytes, "text/csv; charset=utf-8", fileName);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error exporting inventory CSV");
            return StatusCode(500, new { success = false, message = ex.Message });
        }
    }

    #endregion

    #region Salary Reports

    [HttpGet("salaries")]
    public async Task<IActionResult> GetSalaryReports([FromQuery] SalaryFilterDto filter)
    {
        try
        {
            var (payments, totalCount, totalPages, totalAmount) = await _salaryService.GetSalaryPaymentsAsync(filter);
            return Ok(new
            {
                success = true,
                totalCount,
                page = filter.Page < 1 ? 1 : filter.Page,
                pageSize = filter.PageSize < 1 ? 20 : filter.PageSize,
                totalPages,
                totalAmount,
                currency = "INR",
                items = payments,
                data = payments
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting salary report");
            return StatusCode(500, new { success = false, message = ex.Message });
        }
    }

    [HttpGet("salaries/summary")]
    public async Task<IActionResult> GetSalarySummary([FromQuery] string? month)
    {
        try
        {
            var summary = await _salaryService.GetSalarySummaryAsync(month);
            return Ok(new { success = true, data = summary });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting salary summary report");
            return StatusCode(500, new { success = false, message = ex.Message });
        }
    }

    [HttpGet("salaries/budget")]
    public async Task<IActionResult> GetPayrollBudget([FromQuery] string? month)
    {
        try
        {
            var budget = await _salaryService.GetPayrollBudgetAsync(month);
            return Ok(new { success = true, data = budget });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting payroll budget");
            return StatusCode(500, new { success = false, message = ex.Message });
        }
    }

    [HttpGet("salaries/export")]
    public async Task<IActionResult> ExportSalariesReport([FromQuery] SalaryFilterDto filter)
    {
        try
        {
            var bytes = await _salaryService.ExportSalariesCsvAsync(filter);
            var fileName = $"salary_report_{DateTime.UtcNow:yyyyMMdd_HHmmss}.csv";
            return File(bytes, "text/csv; charset=utf-8", fileName);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error exporting salary CSV");
            return StatusCode(500, new { success = false, message = ex.Message });
        }
    }

    #endregion
}
