using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace HMS.DTOs;

public class CreateSalaryPaymentDto
{
    [Required(ErrorMessage = "Staff ID is required.")]
    public long StaffId { get; set; }

    [Required(ErrorMessage = "Salary amount is required.")]
    [Range(0.01, 10000000.00, ErrorMessage = "Payment amount must be greater than zero.")]
    public decimal Amount { get; set; }

    public string? PaymentMonth { get; set; } // e.g. "2026-11"

    public DateTime? PaymentDate { get; set; }

    public string PaymentMethod { get; set; } = "BANK_TRANSFER"; // "BANK_TRANSFER", "CASH", "UPI", "CHEQUE"

    public string? TransactionReference { get; set; }

    public string? Remarks { get; set; }

    public string? Department { get; set; }

    public string Status { get; set; } = "PAID";
}

public class SalaryPaymentDto
{
    public long PaymentId { get; set; }
    public long Id => PaymentId;
    public long StaffId { get; set; }
    public string StaffName { get; set; } = string.Empty;
    public string RoleTitle { get; set; } = string.Empty;
    public string Department { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public DateTime PaymentDate { get; set; }
    public string PaymentMonth { get; set; } = string.Empty;
    public string PaymentMethod { get; set; } = "BANK_TRANSFER";
    public string? TransactionReference { get; set; }
    public string? Remarks { get; set; }
    public string Status { get; set; } = "PAID";
    public DateTime CreatedAt { get; set; }
}

public class SalaryFilterDto
{
    public long? StaffId { get; set; }
    public string? Department { get; set; }
    public string? PaymentMonth { get; set; }
    public DateTime? FromDate { get; set; }
    public DateTime? ToDate { get; set; }
    public string? PaymentMethod { get; set; }
    public string? Search { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 20;
}

public class SalarySummaryDto
{
    public decimal TotalPaidAmount { get; set; }
    public decimal TotalPaidMonth => TotalPaidAmount;
    public decimal TotalPaidYtd { get; set; }
    public int TotalStaffCount { get; set; }
    public int ActiveStaffCount => TotalStaffCount;
    public int PaidStaffCount { get; set; }
    public int TotalTransactionsMonth => PaidStaffCount;
    public int UnpaidStaffCount { get; set; }
    public decimal MonthlyBudget { get; set; }
    public decimal RemainingBudget => Math.Max(0, MonthlyBudget - TotalPaidAmount);
    public decimal Variance => MonthlyBudget - TotalPaidAmount;
    public decimal AverageMonthlySalary => ActiveStaffCount > 0 ? Math.Round(MonthlyBudget / ActiveStaffCount, 2) : 0m;
    public Dictionary<string, decimal> PaymentMethodBreakdown { get; set; } = new(StringComparer.OrdinalIgnoreCase);
    public Dictionary<string, decimal> DepartmentBreakdown { get; set; } = new(StringComparer.OrdinalIgnoreCase);
    public string Currency { get; set; } = "INR";
    public string SummaryPeriod { get; set; } = string.Empty;
}

public class PayrollBudgetDto
{
    public decimal MonthlyBudget { get; set; }
    public decimal TotalBudget => MonthlyBudget;
    public decimal AnnualBudget => MonthlyBudget * 12;
    public int ActiveStaffCount { get; set; }
    public int TotalStaff => ActiveStaffCount;
    public List<DepartmentBudgetDto> DepartmentBudgets { get; set; } = new();
    public List<DepartmentBudgetDto> Departments => DepartmentBudgets;
    public List<StaffBudgetDto> StaffBudgets { get; set; } = new();
    public List<StaffBudgetDto> Staff => StaffBudgets;
    public string Currency { get; set; } = "INR";
}

public class DepartmentBudgetDto
{
    public string Department { get; set; } = string.Empty;
    public int StaffCount { get; set; }
    public decimal TotalMonthlyBudget { get; set; }
    public decimal AverageSalary => StaffCount > 0 ? Math.Round(TotalMonthlyBudget / StaffCount, 2) : 0;
}

public class StaffBudgetDto
{
    public long StaffId { get; set; }
    public string StaffName { get; set; } = string.Empty;
    public string RoleTitle { get; set; } = string.Empty;
    public string Department { get; set; } = string.Empty;
    public decimal BaseSalary { get; set; }
    public string Shift { get; set; } = string.Empty;
    public bool IsActive { get; set; }
}
