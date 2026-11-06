using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace HMS.Models;

[Table("salary_payments")]
public class SalaryPayment
{
    [Key]
    [Column("payment_id")]
    public long PaymentId { get; set; }

    [Column("staff_id")]
    public long StaffId { get; set; }

    [Required]
    [MaxLength(100)]
    [Column("staff_name")]
    public string StaffName { get; set; } = string.Empty;

    [Required]
    [MaxLength(50)]
    [Column("role_title")]
    public string RoleTitle { get; set; } = string.Empty;

    [Required]
    [MaxLength(50)]
    [Column("department")]
    public string Department { get; set; } = "Dining / Service"; // "Bar", "Kitchen", "Dining / Service", "Management"

    [Column("amount", TypeName = "decimal(18,2)")]
    public decimal Amount { get; set; }

    [Column("payment_date")]
    public DateTime PaymentDate { get; set; } = DateTime.UtcNow;

    [Required]
    [MaxLength(20)]
    [Column("payment_month")]
    public string PaymentMonth { get; set; } = string.Empty; // e.g. "2026-11"

    [Required]
    [MaxLength(50)]
    [Column("payment_method")]
    public string PaymentMethod { get; set; } = "BANK_TRANSFER"; // "BANK_TRANSFER", "CASH", "UPI", "CHEQUE"

    [MaxLength(100)]
    [Column("transaction_reference")]
    public string? TransactionReference { get; set; }

    [MaxLength(255)]
    [Column("remarks")]
    public string? Remarks { get; set; }

    [Required]
    [MaxLength(50)]
    [Column("status")]
    public string Status { get; set; } = "PAID"; // "PAID", "PROCESSED", "PENDING"

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    [MaxLength(100)]
    [Column("created_by")]
    public long? CreatedBy { get; set; }
}
