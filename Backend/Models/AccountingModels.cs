using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace HMS.Models;

/// <summary>
/// Master Ledger Account following standard 5-Group General Ledger Framework
/// (Assets, Liabilities, Equity, Income, Expenses).
/// </summary>
[Table("chart_of_accounts")]
public class ChartOfAccount
{
    [Key]
    [Column("account_id")]
    public long AccountId { get; set; }

    [Required]
    [MaxLength(20)]
    [Column("code")]
    public string Code { get; set; } = string.Empty; // e.g., "1001", "1002", "3001"

    [Required]
    [MaxLength(150)]
    [Column("account_name")]
    public string AccountName { get; set; } = string.Empty;

    [Required]
    [MaxLength(40)]
    [Column("account_group")]
    public string AccountGroup { get; set; } = "Assets"; // Assets | Liabilities | Equity | Income | Expenses

    [Required]
    [MaxLength(80)]
    [Column("account_type")]
    public string AccountType { get; set; } = "Current Asset"; // Current Asset, Fixed Asset, Operating Revenue, etc.

    [Required]
    [MaxLength(15)]
    [Column("normal_balance")]
    public string NormalBalance { get; set; } = "Debit"; // Debit | Credit

    [MaxLength(500)]
    [Column("description")]
    public string? Description { get; set; }

    [Column("is_system_account")]
    public bool IsSystemAccount { get; set; } = false;

    [Column("is_active")]
    public bool IsActive { get; set; } = true;

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<JournalVoucherLine> JournalLines { get; set; } = new List<JournalVoucherLine>();
}

/// <summary>
/// Double-Entry Journal Voucher Header (JV) for manual adjustments, capital infusions, asset purchases & depreciation.
/// </summary>
[Table("journal_vouchers")]
public class JournalVoucher
{
    [Key]
    [Column("voucher_id")]
    public long VoucherId { get; set; }

    [Required]
    [MaxLength(40)]
    [Column("voucher_number")]
    public string VoucherNumber { get; set; } = string.Empty; // e.g., "JV-2026-001"

    [Column("voucher_date")]
    public DateTime VoucherDate { get; set; } = DateTime.Today;

    [Required]
    [MaxLength(40)]
    [Column("voucher_type")]
    public string VoucherType { get; set; } = "JV"; // JV | Adjustment | Capital | Asset Purchase | Depreciation | Contra | Opening

    [Required]
    [MaxLength(500)]
    [Column("narration")]
    public string Narration { get; set; } = string.Empty;

    [Column("total_amount", TypeName = "decimal(18,2)")]
    public decimal TotalAmount { get; set; }

    [MaxLength(100)]
    [Column("created_by")]
    public string CreatedBy { get; set; } = "admin";

    [Required]
    [MaxLength(20)]
    [Column("status")]
    public string Status { get; set; } = "Posted"; // Posted | Void

    [MaxLength(255)]
    [Column("void_reason")]
    public string? VoidReason { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<JournalVoucherLine> Lines { get; set; } = new List<JournalVoucherLine>();
}

/// <summary>
/// Individual Debit or Credit posting line within a Journal Voucher.
/// </summary>
[Table("journal_voucher_lines")]
public class JournalVoucherLine
{
    [Key]
    [Column("line_id")]
    public long LineId { get; set; }

    [Column("voucher_id")]
    public long VoucherId { get; set; }

    [ForeignKey(nameof(VoucherId))]
    public JournalVoucher? Voucher { get; set; }

    [Column("account_id")]
    public long AccountId { get; set; }

    [ForeignKey(nameof(AccountId))]
    public ChartOfAccount? Account { get; set; }

    [Required]
    [MaxLength(20)]
    [Column("account_code")]
    public string AccountCode { get; set; } = string.Empty;

    [Required]
    [MaxLength(150)]
    [Column("account_name")]
    public string AccountName { get; set; } = string.Empty;

    [MaxLength(255)]
    [Column("description")]
    public string? Description { get; set; }

    [Column("debit_amount", TypeName = "decimal(18,2)")]
    public decimal DebitAmount { get; set; }

    [Column("credit_amount", TypeName = "decimal(18,2)")]
    public decimal CreditAmount { get; set; }
}

/// <summary>
/// Daily Cash & Bank Register snapshot tracking Opening Float, Physical Cash Count, Variance, and Shift Open/Close state.
/// </summary>
[Table("daily_cash_bank_registers")]
public class DailyCashBankRegister
{
    [Key]
    [Column("register_id")]
    public long RegisterId { get; set; }

    [Column("business_date")]
    public DateTime BusinessDate { get; set; } = DateTime.Today;

    [Column("opening_cash_float", TypeName = "decimal(18,2)")]
    public decimal OpeningCashFloat { get; set; }

    [Column("opening_bank_balance", TypeName = "decimal(18,2)")]
    public decimal OpeningBankBalance { get; set; }

    [Column("total_opening_balance", TypeName = "decimal(18,2)")]
    public decimal TotalOpeningBalance { get; set; }

    [Column("physical_cash_count", TypeName = "decimal(18,2)")]
    public decimal? PhysicalCashCount { get; set; }

    [MaxLength(1000)]
    [Column("denominations_json")]
    public string? DenominationsJson { get; set; }

    [Column("cash_variance", TypeName = "decimal(18,2)")]
    public decimal? CashVariance { get; set; }

    [Required]
    [MaxLength(20)]
    [Column("shift_status")]
    public string ShiftStatus { get; set; } = "Open"; // Open | Closed

    [Column("shift_opened_at")]
    public DateTime ShiftOpenedAt { get; set; } = DateTime.Today.AddHours(8);

    [Column("shift_closed_at")]
    public DateTime? ShiftClosedAt { get; set; }

    [MaxLength(100)]
    [Column("opened_by")]
    public string? OpenedBy { get; set; } = "admin";

    [MaxLength(100)]
    [Column("closed_by")]
    public string? ClosedBy { get; set; }

    [MaxLength(500)]
    [Column("notes")]
    public string? Notes { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
