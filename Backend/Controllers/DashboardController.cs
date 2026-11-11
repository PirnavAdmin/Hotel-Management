using System;
using System.Threading.Tasks;
using HMS.DTOs;
using HMS.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;

namespace HMS.Controllers;

[ApiController]
[Route("api/v1/dashboard")]
[AllowAnonymous]
[Tags("Dashboard")]
public class DashboardController : ControllerBase
{
    private readonly DashboardService _dashboardService;
    private readonly ReportingExportService _reportingExportService;
    private readonly ExportService _exportService;
    private readonly ILogger<DashboardController> _logger;

    public DashboardController(
        DashboardService dashboardService,
        ReportingExportService reportingExportService,
        ExportService exportService,
        ILogger<DashboardController> logger)
    {
        _dashboardService = dashboardService;
        _reportingExportService = reportingExportService;
        _exportService = exportService;
        _logger = logger;
    }

    /// <summary>
    /// API 1: Dashboard Summary - Overall KPIs including today's sales, takeaway sales, settled bills, active KOTs, tables, and inventory.
    /// Supports ?department=Dine or ?department=Bar.
    /// </summary>
    [HttpGet("summary")]
    public async Task<IActionResult> GetSummary([FromQuery] string? department)
    {
        _logger.LogInformation("GET /api/v1/dashboard/summary requested (department={Department})", department ?? "Dine");
        try
        {
            var summary = await _dashboardService.GetDashboardSummaryAsync(department);
            return Ok(new
            {
                success = true,
                message = "Dashboard summary retrieved successfully.",
                data = summary
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving dashboard summary for department={Department}", department);
            return StatusCode(500, new
            {
                success = false,
                message = "An error occurred while calculating dashboard summary.",
                error = ex.Message
            });
        }
    }

    /// <summary>
    /// API 2: Sales Performance - Revenue, settled bill counts, daily average, previous period comparison, and daily breakdown.
    /// Supports ?period=7d|15d|30d and ?department=Dine|Bar.
    /// </summary>
    [HttpGet("sales-performance")]
    public async Task<IActionResult> GetSalesPerformance([FromQuery] string? period, [FromQuery] string? department)
    {
        _logger.LogInformation("GET /api/v1/dashboard/sales-performance requested (period={Period}, department={Department})", period ?? "7d", department ?? "Dine");
        try
        {
            var performance = await _dashboardService.GetSalesPerformanceAsync(period, department);
            return Ok(new
            {
                success = true,
                message = "Sales performance retrieved successfully.",
                data = performance
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving sales performance");
            return StatusCode(500, new
            {
                success = false,
                message = "An error occurred while generating sales performance report.",
                error = ex.Message
            });
        }
    }

    /// <summary>
    /// API 3: Live Dining Tables Grid - Displays all active and vacant dining tables, occupancy status, guest count, and active orders.
    /// </summary>
    [HttpGet("tables")]
    public async Task<IActionResult> GetLiveTables([FromQuery] string? department)
    {
        _logger.LogInformation("GET /api/v1/dashboard/tables requested (department={Department})", department ?? "All");
        try
        {
            var tables = await _dashboardService.GetLiveDiningTablesGridAsync(department);
            return Ok(new
            {
                success = true,
                message = "Live dining tables grid retrieved successfully.",
                count = tables.Count,
                data = tables
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving live dining tables grid");
            return StatusCode(500, new
            {
                success = false,
                message = "An error occurred while retrieving floor table status.",
                error = ex.Message
            });
        }
    }

    /// <summary>
    /// API 4: Signature Dishes Preview - Active and available signature dishes based on existing menu business rules.
    /// Supports ?department=Dine|Bar and ?limit=10.
    /// </summary>
    [HttpGet("signature-dishes")]
    public async Task<IActionResult> GetSignatureDishes([FromQuery] string? department, [FromQuery] int limit = 10)
    {
        _logger.LogInformation("GET /api/v1/dashboard/signature-dishes requested (department={Department}, limit={Limit})", department ?? "Dine", limit);
        try
        {
            var dishes = await _dashboardService.GetSignatureDishesPreviewAsync(department, limit);
            return Ok(new
            {
                success = true,
                message = "Signature dishes preview retrieved successfully.",
                count = dishes.Count,
                data = dishes
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving signature dishes preview");
            return StatusCode(500, new
            {
                success = false,
                message = "An error occurred while fetching signature dishes preview.",
                error = ex.Message
            });
        }
    }

    /// <summary>
    /// API 5: Recent Customer Billing Invoices - Returns the most recent customer billing invoices and settled count.
    /// Supports ?limit=5 and ?department=Dine|Bar.
    /// </summary>
    [HttpGet("recent-invoices")]
    public async Task<IActionResult> GetRecentInvoices([FromQuery] int limit = 5, [FromQuery] string? department = null)
    {
        _logger.LogInformation("GET /api/v1/dashboard/recent-invoices requested (limit={Limit}, department={Department})", limit, department ?? "All");
        try
        {
            var response = await _dashboardService.GetRecentInvoicesAsync(limit, department);
            return Ok(new
            {
                success = true,
                message = "Recent customer billing invoices retrieved successfully.",
                totalSettledCount = response.TotalSettledCount,
                count = response.Invoices.Count,
                data = response.Invoices
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving recent customer billing invoices");
            return StatusCode(500, new
            {
                success = false,
                message = "An error occurred while fetching recent invoices.",
                error = ex.Message
            });
        }
    }

    /// <summary>
    /// API 6: Kitchen KOT Status - Active KOT count, cooking tables, pending, preparing, and ready status.
    /// </summary>
    [HttpGet("kitchen-status")]
    public async Task<IActionResult> GetKitchenStatus([FromQuery] string? department)
    {
        _logger.LogInformation("GET /api/v1/dashboard/kitchen-status requested (department={Department})", department ?? "Dine");
        try
        {
            var status = await _dashboardService.GetKitchenStatusAsync(department);
            return Ok(new
            {
                success = true,
                message = "Kitchen KOT status retrieved successfully.",
                data = status
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving kitchen KOT status");
            return StatusCode(500, new
            {
                success = false,
                message = "An error occurred while fetching kitchen status.",
                error = ex.Message
            });
        }
    }

    /// <summary>
    /// API 7: Inventory Health - Stock counts, low-stock, out-of-stock, and total valuation.
    /// Supports ?department=Dine|Bar.
    /// </summary>
    [HttpGet("inventory-health")]
    public async Task<IActionResult> GetInventoryHealth([FromQuery] string? department)
    {
        _logger.LogInformation("GET /api/v1/dashboard/inventory-health requested (department={Department})", department ?? "Dine");
        try
        {
            var health = await _dashboardService.GetInventoryHealthAsync(department);
            return Ok(new
            {
                success = true,
                message = "Inventory health summary retrieved successfully.",
                data = health
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving inventory health summary");
            return StatusCode(500, new
            {
                success = false,
                message = "An error occurred while calculating inventory health metrics.",
                error = ex.Message
            });
        }
    }

    /// <summary>
    /// API 8: Dashboard Export - Downloads comprehensive Admin Dashboard executive report in CSV or XLSX format.
    /// Supports ?department=Dine|Bar and ?format=csv|xlsx.
    /// </summary>
    [HttpGet("export")]
    public async Task<IActionResult> ExportDashboard(
        [FromQuery] string? department = "Dine",
        [FromQuery] string? format = "csv")
    {
        try
        {
            var doc = await _reportingExportService.GenerateDashboardExportAsync(department);
            return _exportService.ExportResult(doc, format, doc.BaseFileName);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating dashboard export");
            return StatusCode(500, new { success = false, message = "Failed to generate dashboard export.", error = ex.Message });
        }
    }

    /// <summary>
    /// API 9: Admin Dashboard Online Takeaway Orders - Retrieves online/POS takeaway orders with status counts
    /// (New, Preparing, Ready, PickedUp, Completed, Cancelled), customer details, ordered items, payment status/method, and total takeaway sales.
    /// </summary>
    [HttpGet("takeaway-orders")]
    public async Task<IActionResult> GetTakeawayOrders(
        [FromQuery] string? status = null,
        [FromQuery] string? paymentStatus = null,
        [FromQuery] string? search = null,
        [FromQuery] DateTime? fromDate = null,
        [FromQuery] DateTime? toDate = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50)
    {
        _logger.LogInformation("GET /api/v1/dashboard/takeaway-orders requested (status={Status}, paymentStatus={PaymentStatus})", status ?? "all", paymentStatus ?? "all");
        try
        {
            var result = await _dashboardService.GetDashboardTakeawayOrdersAsync(
                status,
                paymentStatus,
                search,
                fromDate,
                toDate,
                page,
                pageSize);

            return Ok(new
            {
                success = true,
                message = "Dashboard takeaway orders retrieved successfully.",
                summary = result.Summary,
                totalCount = result.TotalCount,
                page = result.Page,
                pageSize = result.PageSize,
                data = result.Orders
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving dashboard takeaway orders");
            return StatusCode(500, new
            {
                success = false,
                message = "An error occurred while retrieving takeaway orders for dashboard.",
                error = ex.Message
            });
        }
    }
}
