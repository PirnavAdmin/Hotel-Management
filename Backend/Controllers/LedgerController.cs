using System;
using System.Threading.Tasks;
using HMS.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;

namespace HMS.Controllers;

[ApiController]
[Route("api/v1/ledger")]
[AllowAnonymous]
[Tags("Ledger")]
public class LedgerController : ControllerBase
{
    private readonly ReportingExportService _reportingExportService;
    private readonly ExportService _exportService;
    private readonly ILogger<LedgerController> _logger;

    public LedgerController(
        ReportingExportService reportingExportService,
        ExportService exportService,
        ILogger<LedgerController> logger)
    {
        _reportingExportService = reportingExportService;
        _exportService = exportService;
        _logger = logger;
    }

    /// <summary>
    /// Retrieves financial ledger and transaction journal records in JSON.
    /// Supports ?fromDate=...&toDate=...&department=Dine|Bar.
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> GetLedger(
        [FromQuery] DateTime? fromDate,
        [FromQuery] DateTime? toDate,
        [FromQuery] string? department)
    {
        _logger.LogInformation("GET /api/v1/ledger requested (fromDate={FromDate}, toDate={ToDate}, department={Department})", fromDate, toDate, department);
        try
        {
            var doc = await _reportingExportService.GenerateLedgerExportAsync(fromDate, toDate, department);
            var sheet = doc.Sheets.Count > 0 ? doc.Sheets[0] : null;

            return Ok(new
            {
                success = true,
                message = "Financial ledger retrieved successfully.",
                metadata = sheet?.Metadata,
                kpis = sheet?.SummaryKpis,
                count = sheet?.Rows.Count ?? 0,
                headers = sheet?.Headers,
                rows = sheet?.Rows,
                totals = sheet?.TotalsRow
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving financial ledger");
            return StatusCode(500, new { success = false, message = "Failed to retrieve ledger.", error = ex.Message });
        }
    }

    /// <summary>
    /// Exports Financial General Ledger as XLSX or CSV file.
    /// Example: GET /api/v1/ledger/export?fromDate=2026-11-01&toDate=2026-11-30&format=xlsx
    /// </summary>
    [HttpGet("export")]
    public async Task<IActionResult> ExportLedger(
        [FromQuery] DateTime? fromDate,
        [FromQuery] DateTime? toDate,
        [FromQuery] string? department,
        [FromQuery] string? format = "xlsx")
    {
        _logger.LogInformation("GET /api/v1/ledger/export requested (fromDate={FromDate}, toDate={ToDate}, format={Format})", fromDate, toDate, format);
        try
        {
            var doc = await _reportingExportService.GenerateLedgerExportAsync(fromDate, toDate, department);
            return _exportService.ExportResult(doc, format, doc.BaseFileName);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error exporting financial ledger");
            return StatusCode(500, new { success = false, message = "Failed to export financial ledger.", error = ex.Message });
        }
    }
}
