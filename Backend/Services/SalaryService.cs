using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using HMS.Data;
using HMS.DTOs;
using HMS.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace HMS.Services;

public class SalaryService
{
    private readonly AppDbContext _context;
    private readonly ILogger<SalaryService> _logger;

    public SalaryService(AppDbContext context, ILogger<SalaryService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<SalaryPaymentDto> RecordSalaryPaymentAsync(CreateSalaryPaymentDto dto, long? createdBy = 1L)
    {
        if (dto == null) throw new ArgumentNullException(nameof(dto));
<<<<<<< HEAD
        if (dto.StaffId <= 0) throw new ArgumentException("A valid Staff ID is required.");
        if (dto.Amount <= 0) throw new ArgumentException("Salary payment amount must be greater than zero.");

        var staff = await _context.StaffPersons
            .FirstOrDefaultAsync(s => s.StaffId == dto.StaffId && s.DeletedAt == null);

        if (staff == null)
        {
            throw new KeyNotFoundException($"Staff person with ID {dto.StaffId} was not found.");
=======
        if (!dto.StaffId.HasValue || dto.StaffId.Value <= 0) throw new ArgumentException("A valid Staff ID is required.");
        if (dto.Amount <= 0) throw new ArgumentException("Salary payment amount must be greater than zero.");

        var staff = await _context.StaffPersons
            .FirstOrDefaultAsync(s => s.StaffId == dto.StaffId.Value && s.DeletedAt == null);

        if (staff == null)
        {
            throw new KeyNotFoundException($"Staff person with ID {dto.StaffId.Value} was not found.");
>>>>>>> 35c8f36115066816841543296a3856444e23bf2c
        }

        var paymentDate = dto.PaymentDate ?? DateTime.UtcNow;
        var paymentMonth = !string.IsNullOrWhiteSpace(dto.PaymentMonth) 
            ? dto.PaymentMonth.Trim() 
            : paymentDate.ToString("yyyy-MM");

        var department = !string.IsNullOrWhiteSpace(dto.Department)
            ? dto.Department.Trim()
            : (!string.IsNullOrWhiteSpace(staff.Department) ? staff.Department : ResolveDepartmentFromRole(staff.RoleTitle));

        var payment = new SalaryPayment
        {
            StaffId = staff.StaffId,
            StaffName = staff.FullName,
            RoleTitle = staff.RoleTitle,
            Department = department,
            Amount = dto.Amount,
            PaymentDate = paymentDate,
            PaymentMonth = paymentMonth,
            PaymentMethod = string.IsNullOrWhiteSpace(dto.PaymentMethod) ? "BANK_TRANSFER" : dto.PaymentMethod.Trim().ToUpper(),
            TransactionReference = dto.TransactionReference?.Trim(),
            Remarks = dto.Remarks?.Trim(),
            Status = string.IsNullOrWhiteSpace(dto.Status) ? "PAID" : dto.Status.Trim().ToUpper(),
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            CreatedBy = createdBy ?? 1L
        };

        _context.SalaryPayments.Add(payment);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Recorded salary payment ID {PaymentId} of {Amount} for Staff {StaffId} ({StaffName})",
            payment.PaymentId, payment.Amount, payment.StaffId, payment.StaffName);

        return MapToDto(payment);
    }

    public async Task<(List<SalaryPaymentDto> Items, int TotalCount, int TotalPages, decimal TotalPaidAmount)> GetSalaryPaymentsAsync(SalaryFilterDto filter)
    {
        var query = _context.SalaryPayments.AsNoTracking().AsQueryable();

        if (filter.StaffId.HasValue && filter.StaffId.Value > 0)
        {
            query = query.Where(p => p.StaffId == filter.StaffId.Value);
        }

        if (!string.IsNullOrWhiteSpace(filter.Department) && !filter.Department.Equals("all", StringComparison.OrdinalIgnoreCase))
        {
            var dept = filter.Department.Trim().ToLower();
            query = query.Where(p => p.Department.ToLower() == dept);
        }

        if (!string.IsNullOrWhiteSpace(filter.PaymentMonth))
        {
            var month = filter.PaymentMonth.Trim();
            query = query.Where(p => p.PaymentMonth == month);
        }

        if (filter.FromDate.HasValue)
        {
            var from = filter.FromDate.Value.Date;
            query = query.Where(p => p.PaymentDate >= from);
        }

        if (filter.ToDate.HasValue)
        {
            var to = filter.ToDate.Value.Date.AddDays(1).AddTicks(-1);
            query = query.Where(p => p.PaymentDate <= to);
        }

        if (!string.IsNullOrWhiteSpace(filter.PaymentMethod) && !filter.PaymentMethod.Equals("all", StringComparison.OrdinalIgnoreCase))
        {
            var method = filter.PaymentMethod.Trim().ToUpper();
            query = query.Where(p => p.PaymentMethod.ToUpper() == method);
        }

        if (!string.IsNullOrWhiteSpace(filter.Search))
        {
            var term = filter.Search.Trim().ToLower();
            query = query.Where(p =>
                p.StaffName.ToLower().Contains(term) ||
                p.RoleTitle.ToLower().Contains(term) ||
                (p.TransactionReference != null && p.TransactionReference.ToLower().Contains(term)) ||
                (p.Remarks != null && p.Remarks.ToLower().Contains(term)));
        }

        var totalCount = await query.CountAsync();
        var totalAmount = totalCount > 0 ? await query.SumAsync(p => p.Amount) : 0.00m;

        int page = filter.Page < 1 ? 1 : filter.Page;
        int pageSize = filter.PageSize < 1 ? 20 : (filter.PageSize > 500 ? 500 : filter.PageSize);
        int totalPages = totalCount > 0 ? (int)Math.Ceiling((double)totalCount / pageSize) : 1;

        var payments = await query
            .OrderByDescending(p => p.PaymentDate)
            .ThenByDescending(p => p.PaymentId)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return (payments.ConvertAll(MapToDto), totalCount, totalPages, totalAmount);
    }

    public async Task<SalaryPaymentDto?> GetSalaryPaymentByIdAsync(long id)
    {
        var payment = await _context.SalaryPayments.AsNoTracking().FirstOrDefaultAsync(p => p.PaymentId == id);
        return payment != null ? MapToDto(payment) : null;
    }

    public async Task<SalarySummaryDto> GetSalarySummaryAsync(string? month = null, DateTime? fromDate = null, DateTime? toDate = null, string? department = null)
    {
        var query = _context.SalaryPayments.AsNoTracking().AsQueryable();

        string period = "All Time";
        if (!string.IsNullOrWhiteSpace(month))
        {
            query = query.Where(p => p.PaymentMonth == month.Trim());
            period = $"Month: {month.Trim()}";
        }
        else if (fromDate.HasValue || toDate.HasValue)
        {
            if (fromDate.HasValue) query = query.Where(p => p.PaymentDate >= fromDate.Value.Date);
            if (toDate.HasValue) query = query.Where(p => p.PaymentDate <= toDate.Value.Date.AddDays(1).AddTicks(-1));
            period = $"{fromDate:yyyy-MM-dd} to {toDate:yyyy-MM-dd}";
        }
        else
        {
            // Default to current month
            var currentMonth = DateTime.UtcNow.ToString("yyyy-MM");
            query = query.Where(p => p.PaymentMonth == currentMonth);
            period = $"Current Month ({currentMonth})";
        }

        if (!string.IsNullOrWhiteSpace(department) && !department.Equals("all", StringComparison.OrdinalIgnoreCase))
        {
            query = query.Where(p => p.Department.ToLower() == department.Trim().ToLower());
        }

        var payments = await query.ToListAsync();

        // Get active staff count & budget
        var activeStaff = await _context.StaffPersons
            .AsNoTracking()
            .Where(s => s.IsActive && s.DeletedAt == null)
            .ToListAsync();

        if (!string.IsNullOrWhiteSpace(department) && !department.Equals("all", StringComparison.OrdinalIgnoreCase))
        {
            activeStaff = activeStaff.Where(s => (s.Department ?? ResolveDepartmentFromRole(s.RoleTitle)).Equals(department.Trim(), StringComparison.OrdinalIgnoreCase)).ToList();
        }

        decimal totalPaid = payments.Sum(p => p.Amount);
        decimal ytdPaid = await _context.SalaryPayments.Where(p => p.PaymentDate.Year == DateTime.UtcNow.Year).SumAsync(p => (decimal?)p.Amount) ?? totalPaid;
        int totalStaff = activeStaff.Count;
        int paidStaffCount = payments.Select(p => p.StaffId).Distinct().Count();
        int unpaidStaffCount = Math.Max(0, totalStaff - paidStaffCount);

        decimal monthlyBudget = activeStaff.Sum(s => s.BaseSalary > 0 ? s.BaseSalary : 25000.00m);

        var methodBreakdown = payments
            .GroupBy(p => p.PaymentMethod)
            .ToDictionary(g => g.Key, g => g.Sum(p => p.Amount), StringComparer.OrdinalIgnoreCase);

        var deptBreakdown = payments
            .GroupBy(p => p.Department)
            .ToDictionary(g => g.Key, g => g.Sum(p => p.Amount), StringComparer.OrdinalIgnoreCase);

        return new SalarySummaryDto
        {
            TotalPaidAmount = totalPaid,
            TotalPaidYtd = ytdPaid,
            TotalStaffCount = totalStaff,
            PaidStaffCount = paidStaffCount,
            UnpaidStaffCount = unpaidStaffCount,
            MonthlyBudget = monthlyBudget,
            PaymentMethodBreakdown = methodBreakdown,
            DepartmentBreakdown = deptBreakdown,
            Currency = "INR",
            SummaryPeriod = period
        };
    }

    public async Task<PayrollBudgetDto> GetPayrollBudgetAsync(string? month = null)
    {
        var staffList = await _context.StaffPersons
            .AsNoTracking()
            .Where(s => s.IsActive && s.DeletedAt == null)
            .OrderBy(s => s.RoleTitle)
            .ThenBy(s => s.FullName)
            .ToListAsync();

        var staffBudgets = staffList.ConvertAll(s => new StaffBudgetDto
        {
            StaffId = s.StaffId,
            StaffName = s.FullName,
            RoleTitle = s.RoleTitle,
            Department = !string.IsNullOrWhiteSpace(s.Department) ? s.Department : ResolveDepartmentFromRole(s.RoleTitle),
            BaseSalary = s.BaseSalary > 0 ? s.BaseSalary : 25000.00m,
            Shift = s.Shift,
            IsActive = s.IsActive
        });

        var deptBudgets = staffBudgets
            .GroupBy(s => s.Department)
            .Select(g => new DepartmentBudgetDto
            {
                Department = g.Key,
                StaffCount = g.Count(),
                TotalMonthlyBudget = g.Sum(s => s.BaseSalary)
            })
            .OrderByDescending(d => d.TotalMonthlyBudget)
            .ToList();

        decimal totalMonthly = staffBudgets.Sum(s => s.BaseSalary);

        return new PayrollBudgetDto
        {
            MonthlyBudget = totalMonthly,
            ActiveStaffCount = staffBudgets.Count,
            DepartmentBudgets = deptBudgets,
            StaffBudgets = staffBudgets,
            Currency = "INR"
        };
    }

    public async Task<byte[]> ExportSalariesCsvAsync(SalaryFilterDto filter)
    {
        // Get all matching payments without pagination
        filter.Page = 1;
        filter.PageSize = 100000;
        var (items, _, _, _) = await GetSalaryPaymentsAsync(filter);

        var sb = new StringBuilder();
        sb.AppendLine("Payment ID,Staff ID,Staff Name,Role,Department,Amount (INR),Payment Month,Payment Date,Payment Method,Transaction Reference,Remarks,Status");

        foreach (var item in items)
        {
            var line = string.Join(",", new[]
            {
                item.PaymentId.ToString(),
                item.StaffId.ToString(),
                EscapeCsv(item.StaffName),
                EscapeCsv(item.RoleTitle),
                EscapeCsv(item.Department),
                item.Amount.ToString("F2"),
                EscapeCsv(item.PaymentMonth),
                item.PaymentDate.ToString("yyyy-MM-dd HH:mm:ss"),
                EscapeCsv(item.PaymentMethod),
                EscapeCsv(item.TransactionReference ?? ""),
                EscapeCsv(item.Remarks ?? ""),
                EscapeCsv(item.Status)
            });
            sb.AppendLine(line);
        }

        return Encoding.UTF8.GetBytes(sb.ToString());
    }

    public static string ResolveDepartmentFromRole(string? roleTitle)
    {
        if (string.IsNullOrWhiteSpace(roleTitle)) return "Dining / Service";
        var r = roleTitle.Trim().ToLower();

        if (r.Contains("bar") || r.Contains("bartender") || r.Contains("mixologist") || r.Contains("sommelier"))
            return "Bar";

        if (r.Contains("chef") || r.Contains("cook") || r.Contains("kitchen") || r.Contains("commis") || r.Contains("dish"))
            return "Kitchen";

        if (r.Contains("manager") || r.Contains("admin") || r.Contains("supervisor") || r.Contains("account") || r.Contains("cashier"))
            return "Management";

        return "Dining / Service";
    }

    private static SalaryPaymentDto MapToDto(SalaryPayment p) => new()
    {
        PaymentId = p.PaymentId,
<<<<<<< HEAD
        StaffId = p.StaffId,
=======
        StaffId = p.StaffId ?? 0,
>>>>>>> 35c8f36115066816841543296a3856444e23bf2c
        StaffName = p.StaffName,
        RoleTitle = p.RoleTitle,
        Department = p.Department,
        Amount = p.Amount,
        PaymentDate = p.PaymentDate,
        PaymentMonth = p.PaymentMonth,
        PaymentMethod = p.PaymentMethod,
        TransactionReference = p.TransactionReference,
        Remarks = p.Remarks,
        Status = p.Status,
        CreatedAt = p.CreatedAt
    };

    private static string EscapeCsv(string value)
    {
        if (string.IsNullOrEmpty(value)) return "\"\"";
        if (value.Contains(",") || value.Contains("\"") || value.Contains("\n") || value.Contains("\r"))
        {
            return $"\"{value.Replace("\"", "\"\"")}\"";
        }
        return value;
    }
}
