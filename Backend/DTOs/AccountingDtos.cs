using System;
using System.Collections.Generic;

namespace HMS.DTOs;

// ============================================================
// SCREEN 1: DAILY BALANCES (DAILY CASH & BANK REGISTER)
// ============================================================

public class DailyRegisterOpeningCardDto
{
    public decimal TotalOpeningBalance { get; set; }
    public decimal CashFloat { get; set; }
    public decimal BankBalance { get; set; }
    public string CarryForwardSource { get; set; } = "Shift Start";
    public string Caption { get; set; } = string.Empty;
}

public class DailyRegisterInflowCardDto
{
    public decimal TotalInflow { get; set; }
    public decimal CashInflow { get; set; }
    public decimal BankUpiInflow { get; set; }
    public decimal UpiInflow { get; set; }
    public decimal CardOtherInflow { get; set; }
    public decimal JvCashInflow { get; set; }
    public decimal JvBankInflow { get; set; }
    public int SettledReceiptsCount { get; set; }
    public string Caption { get; set; } = string.Empty;
}

public class DailyRegisterOutflowCardDto
{
    public decimal TotalOutflow { get; set; }
    public decimal CashOutflow { get; set; }
    public decimal BankOutflow { get; set; }
    public decimal PurchasesOutflow { get; set; }
    public decimal SalariesOutflow { get; set; }
    public decimal JvCashOutflow { get; set; }
    public decimal JvBankOutflow { get; set; }
    public int OutflowCount { get; set; }
    public string Caption { get; set; } = "Purchases & petty payments";
}

public class DailyRegisterClosingCardDto
{
    public decimal TotalClosingBalance { get; set; }
    public decimal CashBalance { get; set; }
    public decimal BankBalance { get; set; }
}

public class CashDenominationItemDto
{
    public int Denomination { get; set; } // e.g., 2000, 500, 200, 100, 50, 20, 10, 5, 2, 1
    public int Count { get; set; }
    public decimal Amount => Denomination * Count;
}

public class DailyCashReconciliationDto
{
    public decimal ExpectedCashInDrawer { get; set; }
    public decimal? PhysicalCashCount { get; set; }
    public decimal? CashVariance { get; set; }
    public string ReconciliationStatus { get; set; } = "Pending Count"; // Pending Count | Matched | Shortage | Excess
    public List<CashDenominationItemDto> Denominations { get; set; } = new();
}

public class DailyRegisterTransactionDto
{
    public DateTime Timestamp { get; set; }
    public string ReferenceNo { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty; // SALE_RECEIPT | PURCHASE | SALARY | JOURNAL_VOUCHER
    public string Direction { get; set; } = string.Empty; // INFLOW | OUTFLOW
    public string Channel { get; set; } = string.Empty; // CASH | UPI | CARD | BANK
    public string Description { get; set; } = string.Empty;
    public decimal CashAmount { get; set; }
    public decimal BankAmount { get; set; }
    public decimal TotalAmount { get; set; }
}

public class DailyCashBankRegisterResponseDto
{
    public long? RegisterId { get; set; }
    public string BusinessDate { get; set; } = string.Empty;
    public string ShiftStatus { get; set; } = "Open"; // Open | Closed
    public string StatusBadge { get; set; } = "Live / Open Shift";
    public bool IsPersistedShift { get; set; }
    public DateTime ShiftOpenedAt { get; set; }
    public DateTime? ShiftClosedAt { get; set; }
    public string? OpenedBy { get; set; }
    public string? ClosedBy { get; set; }
    public string? Notes { get; set; }

    public DailyRegisterOpeningCardDto OpeningBalance { get; set; } = new();
    public DailyRegisterInflowCardDto TotalInflow { get; set; } = new();
    public DailyRegisterOutflowCardDto TotalOutflow { get; set; } = new();
    public DailyRegisterClosingCardDto ClosingBalance { get; set; } = new();
    public DailyCashReconciliationDto Reconciliation { get; set; } = new();
    public List<DailyRegisterTransactionDto> Transactions { get; set; } = new();
}

public class DailyBalanceHistoryItemDto
{
    public long? RegisterId { get; set; }
    public string BusinessDate { get; set; } = string.Empty;
    public decimal OpeningCashFloat { get; set; }
    public decimal OpeningBankBalance { get; set; }
    public decimal TotalOpeningBalance { get; set; }
    public decimal CashInflow { get; set; }
    public decimal BankUpiInflow { get; set; }
    public decimal TotalInflow { get; set; }
    public decimal CashOutflow { get; set; }
    public decimal BankOutflow { get; set; }
    public decimal TotalOutflow { get; set; }
    public decimal ClosingCashBalance { get; set; }
    public decimal ClosingBankBalance { get; set; }
    public decimal TotalClosingBalance { get; set; }
    public decimal? PhysicalCashCount { get; set; }
    public decimal? CashVariance { get; set; }
    public string ShiftStatus { get; set; } = "Open";
    public int TransactionCount { get; set; }
    public string? OpenedBy { get; set; }
    public string? ClosedBy { get; set; }
}

public class OpenDailyRegisterRequestDto
{
    public DateTime? BusinessDate { get; set; }
    public decimal OpeningCashFloat { get; set; }
    public decimal OpeningBankBalance { get; set; }
    public string? OpenedBy { get; set; }
    public DateTime? ShiftOpenedAt { get; set; }
    public string? Notes { get; set; }
}

public class ReconcileDailyRegisterRequestDto
{
    public DateTime? BusinessDate { get; set; }
    public decimal? PhysicalCashCount { get; set; }
    public List<CashDenominationItemDto>? Denominations { get; set; }
    public bool CloseShift { get; set; } = true;
    public string? ClosedBy { get; set; }
    public string? Notes { get; set; }
}

public class ReopenDailyRegisterRequestDto
{
    public DateTime? BusinessDate { get; set; }
    public string? ReopenedBy { get; set; }
    public string? Notes { get; set; }
}

// ============================================================
// SCREEN 2: CHART OF ACCOUNTS (COA)
// ============================================================

public class ChartOfAccountDto
{
    public long AccountId { get; set; }
    public string Code { get; set; } = string.Empty;
    public string AccountName { get; set; } = string.Empty;
    public string Group { get; set; } = string.Empty; // Assets | Liabilities | Equity | Income | Expenses
    public string AccountType { get; set; } = string.Empty;
    public string NormalBalance { get; set; } = string.Empty; // Debit | Credit
    public string Description { get; set; } = string.Empty;
    public decimal TotalDebit { get; set; }
    public decimal TotalCredit { get; set; }
    public decimal CurrentBalance { get; set; }
    public string BalanceSide { get; set; } = "Debit"; // Debit | Credit
    public bool IsSystemAccount { get; set; }
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class ChartOfAccountMetadataDto
{
    public List<string> Groups { get; set; } = new() { "Assets", "Liabilities", "Equity", "Income", "Expenses" };
    public Dictionary<string, string> NormalBalanceByGroup { get; set; } = new()
    {
        { "Assets", "Debit" },
        { "Liabilities", "Credit" },
        { "Equity", "Credit" },
        { "Income", "Credit" },
        { "Expenses", "Debit" }
    };
    public Dictionary<string, List<string>> SuggestedAccountTypes { get; set; } = new()
    {
        { "Assets", new List<string> { "Current Asset", "Fixed Asset", "Bank & Cash", "Inventory Asset", "Other Asset" } },
        { "Liabilities", new List<string> { "Current Liability", "Tax Payable", "Long-Term Liability", "Accrued Expense" } },
        { "Equity", new List<string> { "Equity", "Partner Capital", "Retained Earnings", "Drawings" } },
        { "Income", new List<string> { "Operating Revenue", "Other Income", "Service Charge Revenue" } },
        { "Expenses", new List<string> { "Cost of Goods Sold", "Operating Expense", "Payroll Expense", "Non-Cash Expense" } }
    };
}

public class ChartOfAccountListResponseDto
{
    public Dictionary<string, int> GroupCounts { get; set; } = new();
    public ChartOfAccountMetadataDto Metadata { get; set; } = new();
    public List<ChartOfAccountDto> Accounts { get; set; } = new();
}

public class CreateChartOfAccountDto
{
    public string Code { get; set; } = string.Empty;
    public string AccountName { get; set; } = string.Empty;
    public string Group { get; set; } = "Assets";
    public string AccountType { get; set; } = "Current Asset";
    public string? NormalBalance { get; set; }
    public string? Description { get; set; }
    public bool IsActive { get; set; } = true;
}

public class UpdateChartOfAccountDto
{
    public string? Code { get; set; }
    public string? AccountName { get; set; }
    public string? Group { get; set; }
    public string? AccountType { get; set; }
    public string? NormalBalance { get; set; }
    public string? Description { get; set; }
    public bool? IsActive { get; set; }
}

// ============================================================
// SCREEN 3: GENERAL LEDGER (GL)
// ============================================================

public class AccountOptionDto
{
    public long AccountId { get; set; }
    public string Code { get; set; } = string.Empty;
    public string AccountName { get; set; } = string.Empty;
    public string Group { get; set; } = string.Empty;
    public string NormalBalance { get; set; } = "Debit";
    public string Label => $"{Code} • {AccountName} ({Group})";
}

public class GeneralLedgerEntryDto
{
    public string EntryId { get; set; } = string.Empty;
    public DateTime Date { get; set; }
    public string VoucherNo { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty; // JV | RECEIPT | INVOICE | PURCHASE | SALARY
    public string SourceModule { get; set; } = string.Empty;
    public long SourceId { get; set; }
    public string Particulars { get; set; } = string.Empty;
    public decimal Debit { get; set; }
    public decimal Credit { get; set; }
    public decimal RunningBalance { get; set; }
    public string BalanceSide { get; set; } = "Debit"; // Debit | Credit
}

public class GeneralLedgerKpiDto
{
    public decimal OpeningBalance { get; set; }
    public string OpeningBalanceSide { get; set; } = "Debit";
    public decimal TotalPeriodDebits { get; set; }
    public decimal TotalPeriodCredits { get; set; }
    public decimal NetClosingBalance { get; set; }
    public string NetClosingBalanceSide { get; set; } = "Debit";
    public string AsOfDate { get; set; } = string.Empty;
}

public class GeneralLedgerResponseDto
{
    public ChartOfAccountDto Account { get; set; } = new();
    public string FromDate { get; set; } = string.Empty;
    public string ToDate { get; set; } = string.Empty;
    public GeneralLedgerKpiDto Summary { get; set; } = new();
    public List<AccountOptionDto> AvailableAccounts { get; set; } = new();
    public List<GeneralLedgerEntryDto> Entries { get; set; } = new();
}

public class TrialBalanceRowDto
{
    public long AccountId { get; set; }
    public string Code { get; set; } = string.Empty;
    public string AccountName { get; set; } = string.Empty;
    public string Group { get; set; } = string.Empty;
    public string NormalBalance { get; set; } = string.Empty;
    public decimal OpeningDebit { get; set; }
    public decimal OpeningCredit { get; set; }
    public decimal PeriodDebit { get; set; }
    public decimal PeriodCredit { get; set; }
    public decimal ClosingDebit { get; set; }
    public decimal ClosingCredit { get; set; }
}

public class TrialBalanceResponseDto
{
    public string FromDate { get; set; } = string.Empty;
    public string ToDate { get; set; } = string.Empty;
    public decimal TotalOpeningDebit { get; set; }
    public decimal TotalOpeningCredit { get; set; }
    public decimal TotalPeriodDebit { get; set; }
    public decimal TotalPeriodCredit { get; set; }
    public decimal TotalClosingDebit { get; set; }
    public decimal TotalClosingCredit { get; set; }
    public bool IsBalanced => Math.Abs(TotalClosingDebit - TotalClosingCredit) < 0.01m;
    public List<TrialBalanceRowDto> Accounts { get; set; } = new();
}

// ============================================================
// SCREEN 4: JOURNAL ENTRIES (JV)
// ============================================================

public class JournalVoucherLineDto
{
    public long LineId { get; set; }
    public long AccountId { get; set; }
    public string AccountCode { get; set; } = string.Empty;
    public string AccountName { get; set; } = string.Empty;
    public string? Description { get; set; }
    public decimal Debit { get; set; }
    public decimal Credit { get; set; }
}

public class JournalVoucherDto
{
    public long VoucherId { get; set; }
    public string VoucherNumber { get; set; } = string.Empty;
    public string VoucherDate { get; set; } = string.Empty;
    public string VoucherType { get; set; } = "JV";
    public string Narration { get; set; } = string.Empty;
    public decimal TotalAmount { get; set; }
    public decimal TotalDebit { get; set; }
    public decimal TotalCredit { get; set; }
    public string CreatedBy { get; set; } = string.Empty;
    public string Status { get; set; } = "Posted";
    public string? VoidReason { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public List<JournalVoucherLineDto> Lines { get; set; } = new();
}

public class CreateJournalVoucherLineRequestDto
{
    public long? AccountId { get; set; }
    public string? AccountCode { get; set; }
    public string? Description { get; set; }
    public decimal Debit { get; set; }
    public decimal Credit { get; set; }
}

public class CreateJournalVoucherRequestDto
{
    public string? VoucherNumber { get; set; }
    public DateTime? VoucherDate { get; set; }
    public string? VoucherType { get; set; }
    public string Narration { get; set; } = string.Empty;
    public string? CreatedBy { get; set; }
    public List<CreateJournalVoucherLineRequestDto> Lines { get; set; } = new();
}

public class VoidJournalVoucherRequestDto
{
    public string? Reason { get; set; }
    public string? VoidedBy { get; set; }
}
