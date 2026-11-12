using System;
using System.Threading.Tasks;
using HMS.DTOs;
using HMS.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;

namespace HMS.Controllers;

[ApiController]
[Route("api/v1/salaries")]
[AllowAnonymous]
[Tags("Salaries", "Admin")]
public class SalariesController : ControllerBase
{
    private readonly SalaryService _salaryService;
    private readonly ReportingExportService _reportingExportService;
    private readonly ExportService _exportService;
    private readonly ILogger<SalariesController> _logger;

    public SalariesController(
        SalaryService salaryService,
        ReportingExportService reportingExportService,
        ExportService exportService,
        ILogger<SalariesController> logger)
    {
        _salaryService = salaryService;
        _reportingExportService = reportingExportService;
        _exportService = exportService;
        _logger = logger;
    }

    /// <summary>
    /// Records a new salary payment for a staff member.
    /// </summary>
    [HttpPost]
    public async Task<IActionResult> RecordSalaryPayment([FromBody] CreateSalaryPaymentDto dto)
    {
        if (dto == null)
        {
            return BadRequest(new { success = false, message = "Payment payload is required." });
        }

        if (dto.StaffId <= 0)
        {
            return BadRequest(new { success = false, message = "Valid staff ID is required." });
        }

        if (dto.Amount <= 0)
        {
            return BadRequest(new { success = false, message = "Salary amount must be greater than zero." });
        }

        try
        {
            var payment = await _salaryService.RecordSalaryPaymentAsync(dto);
            return StatusCode(201, new
            {
                success = true,
                message = "Salary payment recorded successfully.",
                data = payment
            });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error recording salary payment");
            return StatusCode(500, new { success = false, message = ex.Message });
        }
    }

    /// <summary>
    /// Returns paged salary payments with flexible date, department, role, staff, and status filtering.
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> GetSalaryPayments([FromQuery] SalaryFilterDto filter)
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
            _logger.LogError(ex, "Error retrieving salary payments");
            return StatusCode(500, new { success = false, message = ex.Message });
        }
    }

    /// <summary>
    /// Returns salary payment detail by payment ID.
    /// </summary>
    [HttpGet("{id:long}")]
    public async Task<IActionResult> GetSalaryPaymentById(long id)
    {
        try
        {
            var payment = await _salaryService.GetSalaryPaymentByIdAsync(id);
            if (payment == null)
            {
                return NotFound(new { success = false, message = $"Salary payment with ID {id} not found." });
            }

            return Ok(new
            {
                success = true,
                data = payment
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting salary payment {Id}", id);
            return StatusCode(500, new { success = false, message = ex.Message });
        }
    }

    /// <summary>
    /// Returns salary summary KPI metrics (Month Total, YTD Total, Transaction count, Department breakdown).
    /// </summary>
    [HttpGet("summary")]
    public async Task<IActionResult> GetSalarySummary([FromQuery] string? month)
    {
        try
        {
            var summary = await _salaryService.GetSalarySummaryAsync(month);
            return Ok(new
            {
                success = true,
                data = summary
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting salary summary");
            return StatusCode(500, new { success = false, message = ex.Message });
        }
    }

    /// <summary>
    /// Returns monthly payroll budget projected from active staff base salaries and departments.
    /// </summary>
    [HttpGet("budget")]
    public async Task<IActionResult> GetPayrollBudget([FromQuery] string? month)
    {
        try
        {
            var budget = await _salaryService.GetPayrollBudgetAsync(month);
            return Ok(new
            {
                success = true,
                data = budget
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting payroll budget");
            return StatusCode(500, new { success = false, message = ex.Message });
        }
    }

    /// <summary>
    /// Exports salary payments matching filter criteria as CSV or XLSX.
    /// Supports ?month=...&amp;paymentMonth=...&amp;department=...&amp;status=...&amp;format=csv|xlsx.
    /// </summary>
    [HttpGet("export")]
    public async Task<IActionResult> ExportSalaries(
        [FromQuery] SalaryFilterDto filter,
        [FromQuery] string? month = null,
        [FromQuery] string? status = null,
        [FromQuery] string? format = "csv")
    {
        try
        {
            if (string.IsNullOrWhiteSpace(filter.PaymentMonth) && !string.IsNullOrWhiteSpace(month))
            {
                filter.PaymentMonth = month;
            }
            var doc = await _reportingExportService.GenerateSalariesExportAsync(filter, status);
            return _exportService.ExportResult(doc, format, "Salary_Payments");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error exporting salaries");
            return StatusCode(500, new { success = false, message = "Failed to export salaries.", error = ex.Message });
        }
    }
}
