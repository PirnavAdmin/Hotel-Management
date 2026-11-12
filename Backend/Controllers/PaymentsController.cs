using System;
using System.Linq;
using System.Threading.Tasks;
using HMS.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;

namespace HMS.Controllers;

[ApiController]
[Route("api/v1/payments")]
[AllowAnonymous]
[Tags("Payments")]
public class PaymentsController : ControllerBase
{
    private readonly ReportingExportService _reportingExportService;
    private readonly ExportService _exportService;
    private readonly ILogger<PaymentsController> _logger;

    public PaymentsController(
        ReportingExportService reportingExportService,
        ExportService exportService,
        ILogger<PaymentsController> logger)
    {
        _reportingExportService = reportingExportService;
        _exportService = exportService;
        _logger = logger;
    }

    /// <summary>
    /// Retrieves payment settlement transactions in JSON.
    /// Supports ?fromDate=...&toDate=...&method=CASH|UPI|CARD&department=Dine|Bar.
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> GetPayments(
        [FromQuery] DateTime? fromDate,
        [FromQuery] DateTime? toDate,
        [FromQuery] string? method,
        [FromQuery] string? department = null)
    {
        _logger.LogInformation("GET /api/v1/payments requested");
        try
        {
            var list = await _reportingExportService.GetEnrichedPaymentsAsync(fromDate, toDate, method, department);

            return Ok(new
            {
                success = true,
                message = "Payment transactions retrieved successfully.",
                count = list.Count,
                totalAmount = list.Where(p => ReportingExportService.IsPaymentStatusSuccessful(p.PaymentStatus)).Sum(p => p.Amount),
                data = list.Select(p => new
                {
                    paymentId = p.PaymentId,
                    invoiceId = p.InvoiceId,
                    invoiceNumber = p.InvoiceNumber,
                    paymentMode = p.PaymentMode,
                    paymentMethod = p.PaymentMethod,
                    amount = p.Amount,
                    transactionReference = p.TransactionReference,
                    paymentStatus = p.PaymentStatus,
                    paidAt = p.PaidAt
                })
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving payments");
            return StatusCode(500, new { success = false, message = "Failed to retrieve payments.", error = ex.Message });
        }
    }

    /// <summary>
    /// Exports settlement payments register as CSV or XLSX file.
    /// Supports ?fromDate=...&toDate=...&method=CASH|UPI|CARD&department=Dine|Bar&format=csv|xlsx.
    /// </summary>
    [HttpGet("export")]
    public async Task<IActionResult> ExportPayments(
        [FromQuery] DateTime? fromDate,
        [FromQuery] DateTime? toDate,
        [FromQuery] string? method,
        [FromQuery] string? department = null,
        [FromQuery] string? format = "csv")
    {
        _logger.LogInformation("GET /api/v1/payments/export requested");
        try
        {
            var doc = await _reportingExportService.GeneratePaymentsExportAsync(fromDate, toDate, method, department);
            return _exportService.ExportResult(doc, format, doc.BaseFileName);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error exporting payments register");
            return StatusCode(500, new { success = false, message = "Failed to export payments.", error = ex.Message });
        }
    }
}
