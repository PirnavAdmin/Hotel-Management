using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace HMS.Models;

[Table("invoice_payments")]
public class InvoicePayment
{
    [Key]
    [Column("payment_id")]
    public long PaymentId { get; set; }

    [Column("invoice_id")]
    public long InvoiceId { get; set; }

    [Column("amount", TypeName = "decimal(18,2)")]
    public decimal Amount { get; set; }

    [Column("amount_paid", TypeName = "decimal(10,2)")]
    public decimal AmountPaid { get; set; }

    [Column("payment_method")]
    public string PaymentMethod { get; set; } = "cash";

    [Required]
    [MaxLength(30)]
    [Column("payment_mode")]
    public string PaymentMode { get; set; } = "CASH"; // "CASH", "CARD", "UPI", "NETBANKING"

    [MaxLength(100)]
    [Column("transaction_reference")]
    public string? TransactionReference { get; set; }

    [Column("paid_at")]
    public DateTime PaidAt { get; set; } = DateTime.UtcNow;
}
