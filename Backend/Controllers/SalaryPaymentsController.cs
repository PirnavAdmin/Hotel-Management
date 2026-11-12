using System.Text.RegularExpressions;
using HMS.Data;
using HMS.DTOs;
using HMS.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HMS.Controllers;

[ApiController]
[Route("api/v1/salary-payments")]
[Route("api/SalaryPayments")]
public class SalaryPaymentsController : ControllerBase
{
    private static readonly HashSet<string> PaymentMethods = new(StringComparer.OrdinalIgnoreCase)
    {
        "Bank Transfer",
        "UPI",
        "Cash",
        "Cheque"
    };

    private readonly AppDbContext _context;

    public SalaryPaymentsController(AppDbContext context)
    {
        _context = context;
    }

    [AllowAnonymous]
    [HttpGet]
    public async Task<IActionResult> GetSalaryPayments([FromQuery] long? staffId)
    {
        var query = _context.SalaryPayments.AsNoTracking();
        if (staffId.HasValue)
        {
            if (staffId.Value <= 0)
            {
                return BadRequest(new { success = false, message = "Staff ID must be positive." });
            }

            query = query.Where(payment => payment.StaffId == staffId.Value);
        }

        var payments = await query
            .OrderByDescending(payment => payment.PaymentDate)
            .ThenByDescending(payment => payment.PaymentId)
            .ToListAsync();

        return Ok(new { success = true, count = payments.Count, data = payments });
    }

    [AllowAnonymous]
    [HttpGet("{id:long}")]
    public async Task<IActionResult> GetSalaryPayment(long id)
    {
        var payment = await _context.SalaryPayments
            .AsNoTracking()
            .FirstOrDefaultAsync(row => row.PaymentId == id);
        if (payment == null)
        {
            return NotFound(new { success = false, message = "Salary payment was not found." });
        }

        return Ok(new { success = true, data = payment });
    }

    [AllowAnonymous]
    [HttpPost]
    public async Task<IActionResult> CreateSalaryPayment([FromBody] CreateSalaryPaymentDto request)
    {
        if (request.StaffId.HasValue && request.StaffId.Value <= 0)
        {
            return BadRequest(new { success = false, message = "Staff ID must be positive." });
        }

        var staffName = request.StaffName.Trim();
        if (string.IsNullOrWhiteSpace(staffName))
        {
            return BadRequest(new { success = false, message = "Staff name is required." });
        }

        if (request.PaidOn is null || request.PaidOn.Value == default)
        {
            return BadRequest(new { success = false, message = "A valid payment date is required." });
        }

        if (!Regex.IsMatch(request.SalaryPeriod, @"^\d{4}-(0[1-9]|1[0-2])$"))
        {
            return BadRequest(new { success = false, message = "Salary period must use YYYY-MM format." });
        }

        var method = PaymentMethods.FirstOrDefault(value =>
            value.Equals(request.PaymentMethod.Trim(), StringComparison.OrdinalIgnoreCase));
        if (method == null)
        {
            return BadRequest(new { success = false, message = "Payment method must be Bank Transfer, UPI, Cash, or Cheque." });
        }

        var payment = new SalaryPayment
        {
            StaffId = request.StaffId,
            StaffName = staffName,
            Amount = decimal.Round(request.Amount, 2),
            PaidOn = request.PaidOn.Value.Date,
            SalaryPeriod = request.SalaryPeriod,
            PaymentMethod = method,
            Notes = string.IsNullOrWhiteSpace(request.Notes) ? null : request.Notes.Trim(),
            CreatedAt = DateTime.UtcNow
        };

        _context.SalaryPayments.Add(payment);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetSalaryPayment), new { id = payment.PaymentId }, new
        {
            success = true,
            message = "Salary payment recorded successfully.",
            data = payment
        });
    }
}
