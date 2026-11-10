using System;
using System.Collections.Generic;

namespace HMS.DTOs;

public class ChartOfAccountDto
{
    public long Id { get; set; }
    public string AccountCode { get; set; } = string.Empty;
    public string AccountName { get; set; } = string.Empty;
    public string AccountGroup { get; set; } = string.Empty; // Assets, Liabilities, Equity, Income, Expenses
    public string AccountType { get; set; } = string.Empty; // Current Asset, Fixed Asset, Direct Income, etc.
    public string NormalBalance { get; set; } = "Debit"; // Debit or Credit
    public string? Description { get; set; }
    public decimal OpeningBalance { get; set; }
    public bool IsSystem { get; set; }
}

public class JournalEntryLineDto
{
    public string AccountCode { get; set; } = string.Empty;
    public string AccountName { get; set; } = string.Empty;
    public decimal Debit { get; set; }
    public decimal Credit { get; set; }
}

public class JournalEntryDto
{
    public long Id { get; set; }
    public string VoucherNumber { get; set; } = string.Empty;
    public string EntryDate { get; set; } = string.Empty; // yyyy-MM-dd
    public string Narration { get; set; } = string.Empty;
    public decimal TotalDebit { get; set; }
    public decimal TotalCredit { get; set; }
    public List<JournalEntryLineDto> Lines { get; set; } = new();
    public string? CreatedBy { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class CreateJournalEntryRequestDto
{
    public string VoucherNumber { get; set; } = string.Empty;
    public string EntryDate { get; set; } = string.Empty;
    public string Narration { get; set; } = string.Empty;
    public List<JournalEntryLineDto> Lines { get; set; } = new();
    public string? CreatedBy { get; set; }
}

public class DailyBalanceDto
{
    public long Id { get; set; }
    public string Date { get; set; } = string.Empty; // yyyy-MM-dd
    public decimal OpeningCash { get; set; }
    public decimal OpeningBank { get; set; }
    public decimal OpeningTotal { get; set; }
    public decimal? ClosingCash { get; set; }
    public decimal? ClosingBank { get; set; }
    public decimal? ClosingTotal { get; set; }
    public decimal? ExpectedCash { get; set; }
    public decimal? CashDifference { get; set; }
    public bool IsClosed { get; set; }
    public string? OpenedBy { get; set; }
    public string? ClosedBy { get; set; }
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class SaveDailyBalanceRequestDto
{
    public string Date { get; set; } = string.Empty;
    public decimal OpeningCash { get; set; }
    public decimal OpeningBank { get; set; }
    public decimal? ClosingCash { get; set; }
    public decimal? ClosingBank { get; set; }
    public decimal? ExpectedCash { get; set; }
    public decimal? CashDifference { get; set; }
    public bool IsClosed { get; set; }
    public string? OpenedBy { get; set; }
    public string? ClosedBy { get; set; }
    public string? Notes { get; set; }
}

public class FinancialStatementSummaryDto
{
    public decimal TotalRevenue { get; set; }
    public decimal TotalDirectCost { get; set; }
    public decimal GrossProfit { get; set; }
    public decimal TotalOperatingExpenses { get; set; }
    public decimal NetProfit { get; set; }
    public decimal TotalAssets { get; set; }
    public decimal TotalLiabilities { get; set; }
    public decimal TotalEquity { get; set; }
    public bool IsBalanceSheetBalanced { get; set; }
}
