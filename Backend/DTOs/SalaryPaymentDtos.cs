using System.ComponentModel.DataAnnotations;

namespace HMS.DTOs;

public class CreateSalaryPaymentDto
{
    public long? StaffId { get; set; }

    [Required]
    [StringLength(100, MinimumLength = 1)]
    public string StaffName { get; set; } = string.Empty;

    [Range(typeof(decimal), "0.01", "99999999.99")]
    public decimal Amount { get; set; }

    [Required]
    public DateTime? PaidOn { get; set; }

    [Required]
    [RegularExpression(@"^\d{4}-(0[1-9]|1[0-2])$")]
    public string SalaryPeriod { get; set; } = string.Empty;

    [Required]
    [StringLength(40, MinimumLength = 1)]
    public string PaymentMethod { get; set; } = string.Empty;

    [StringLength(255)]
    public string? Notes { get; set; }
}
