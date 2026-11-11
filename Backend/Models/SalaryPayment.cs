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
<<<<<<< HEAD
    public long StaffId { get; set; }

    [ForeignKey("StaffId")]
    public StaffPerson? StaffPerson { get; set; }
=======
    public long? StaffId { get; set; }
>>>>>>> 35c8f36115066816841543296a3856444e23bf2c

    [Required]
    [MaxLength(100)]
    [Column("staff_name")]
    public string StaffName { get; set; } = string.Empty;

<<<<<<< HEAD
    [Required]
=======
>>>>>>> 35c8f36115066816841543296a3856444e23bf2c
    [MaxLength(50)]
    [Column("role_title")]
    public string RoleTitle { get; set; } = string.Empty;

<<<<<<< HEAD
    [Required]
=======
>>>>>>> 35c8f36115066816841543296a3856444e23bf2c
    [MaxLength(50)]
    [Column("department")]
    public string Department { get; set; } = "Dining / Service"; // "Bar", "Kitchen", "Dining / Service", "Management"

    [Column("amount", TypeName = "decimal(18,2)")]
    public decimal Amount { get; set; }

    [Column("payment_date")]
    public DateTime PaymentDate { get; set; } = DateTime.UtcNow;

<<<<<<< HEAD
    [Required]
=======
    [NotMapped]
    public DateTime PaidOn
    {
        get => PaymentDate;
        set => PaymentDate = value;
    }

>>>>>>> 35c8f36115066816841543296a3856444e23bf2c
    [MaxLength(20)]
    [Column("payment_month")]
    public string PaymentMonth { get; set; } = string.Empty; // e.g. "2026-11"

<<<<<<< HEAD
=======
    [NotMapped]
    public string SalaryPeriod
    {
        get => PaymentMonth;
        set => PaymentMonth = value;
    }

>>>>>>> 35c8f36115066816841543296a3856444e23bf2c
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

<<<<<<< HEAD
    [Required]
=======
    [NotMapped]
    public string? Notes
    {
        get => Remarks;
        set => Remarks = value;
    }

>>>>>>> 35c8f36115066816841543296a3856444e23bf2c
    [MaxLength(50)]
    [Column("status")]
    public string Status { get; set; } = "PAID"; // "PAID", "PROCESSED", "PENDING"

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    [Column("created_by")]
    public long? CreatedBy { get; set; }
}
