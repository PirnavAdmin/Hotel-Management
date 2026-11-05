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
    public long? StaffId { get; set; }

    [Required]
    [MaxLength(100)]
    [Column("staff_name")]
    public string StaffName { get; set; } = string.Empty;

    [Column("amount", TypeName = "decimal(18,2)")]
    public decimal Amount { get; set; }

    [Column("paid_on", TypeName = "date")]
    public DateTime PaidOn { get; set; }

    [Required]
    [MaxLength(7)]
    [Column("salary_period")]
    public string SalaryPeriod { get; set; } = string.Empty;

    [Required]
    [MaxLength(40)]
    [Column("payment_method")]
    public string PaymentMethod { get; set; } = string.Empty;

    [MaxLength(255)]
    [Column("notes")]
    public string? Notes { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
