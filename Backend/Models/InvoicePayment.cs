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

    [Column("amount_paid", TypeName = "decimal(18,2)")]
    public decimal AmountPaid { get; set; }

    [Required]
    [MaxLength(30)]
    [Column("payment_mode")]
    public string PaymentMode { get; set; } = "CASH"; // "CASH", "CARD", "UPI", "NETBANKING"

    [MaxLength(20)]
    [Column("payment_method")]
    public string PaymentMethod { get; set; } = "cash";

    [MaxLength(100)]
    [Column("transaction_reference")]
    public string? TransactionReference { get; set; }

    [MaxLength(100)]
    [Column("txn_reference")]
    public string? TxnReference { get; set; }

    [MaxLength(20)]
    [Column("payment_status")]
    public string PaymentStatus { get; set; } = "success";

    [MaxLength(40)]
    [Column("gateway_provider")]
    public string? GatewayProvider { get; set; }

    [MaxLength(100)]
    [Column("gateway_order_id")]
    public string? GatewayOrderId { get; set; }

    [MaxLength(100)]
    [Column("gateway_payment_id")]
    public string? GatewayPaymentId { get; set; }

    [MaxLength(255)]
    [Column("gateway_signature")]
    public string? GatewaySignature { get; set; }

    [MaxLength(255)]
    [Column("failure_reason")]
    public string? FailureReason { get; set; }

    [MaxLength(100)]
    [Column("idempotency_key")]
    public string? IdempotencyKey { get; set; }

    [Column("paid_at")]
    public DateTime PaidAt { get; set; } = DateTime.UtcNow;
}
