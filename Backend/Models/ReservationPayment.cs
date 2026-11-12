using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace HMS.Models;

[Table("reservation_payments")]
public class ReservationPayment
{
    [Key]
    [Column("payment_id")]
    public long PaymentId { get; set; }

    [Column("reservation_id")]
    public long ReservationId { get; set; }

    [Column("customer_id")]
    public long? CustomerId { get; set; }

    [Required]
    [MaxLength(20)]
    [Column("payment_type")]
    public string PaymentType { get; set; } = "ADVANCE"; // ADVANCE, ADDITIONAL, REFUND

    [Column("amount", TypeName = "decimal(18,2)")]
    public decimal Amount { get; set; } = 0.00m;

    [Required]
    [MaxLength(30)]
    [Column("payment_method")]
    public string PaymentMethod { get; set; } = "UPI"; // UPI, CARD, NETBANKING, WALLET, CASH

    [Required]
    [MaxLength(30)]
    [Column("payment_status")]
    public string PaymentStatus { get; set; } = "pending"; // pending, success, failed, refunded, refund_pending

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

    [MaxLength(100)]
    [Column("transaction_reference")]
    public string? TransactionReference { get; set; }

    [MaxLength(100)]
    [Column("refund_reference")]
    public string? RefundReference { get; set; }

    [MaxLength(100)]
    [Column("idempotency_key")]
    public string? IdempotencyKey { get; set; }

    [MaxLength(255)]
    [Column("failure_reason")]
    public string? FailureReason { get; set; }

    [Column("paid_at")]
    public DateTime? PaidAt { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
