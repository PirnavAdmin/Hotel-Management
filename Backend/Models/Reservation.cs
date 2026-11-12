using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace HMS.Models;

[Table("reservations")]
public class Reservation
{
    [Key]
    [Column("reservation_id")]
    public long ReservationId { get; set; }

    [MaxLength(30)]
    [Column("reservation_number")]
    public string? ReservationNumber { get; set; }

    [Column("branch_id")]
    public long BranchId { get; set; } = 1;

    [Column("outlet_id")]
    public long? OutletId { get; set; } = 1;

    [Column("customer_id")]
    public long? CustomerId { get; set; }

    [MaxLength(100)]
    [Column("customer_name")]
    public string? CustomerName { get; set; }

    [MaxLength(20)]
    [Column("phone")]
    public string? Phone { get; set; }

    [MaxLength(120)]
    [Column("email")]
    public string? Email { get; set; }

    [Column("table_id")]
    public long? TableId { get; set; }

    [Column("guests_count")]
    public int GuestsCount { get; set; } = 2;

    [MaxLength(50)]
    [Column("seating_preference")]
    public string? SeatingPreference { get; set; }

    [Column("reservation_date")]
    public DateTime ReservationDate { get; set; } = DateTime.Now.Date;

    [Column("reservation_time")]
    public TimeSpan ReservationTime { get; set; }

    [Column("slot_duration_minutes")]
    public int SlotDurationMinutes { get; set; } = 120;

    [Column("reservation_amount", TypeName = "decimal(18,2)")]
    public decimal ReservationAmount { get; set; } = 0.00m;

    [Column("advance_amount", TypeName = "decimal(18,2)")]
    public decimal AdvanceAmount { get; set; } = 0.00m;

    [Column("paid_amount", TypeName = "decimal(18,2)")]
    public decimal PaidAmount { get; set; } = 0.00m;

    [Column("remaining_amount", TypeName = "decimal(18,2)")]
    public decimal RemainingAmount { get; set; } = 0.00m;

    [MaxLength(30)]
    [Column("payment_status")]
    public string PaymentStatus { get; set; } = "UNPAID";

    [Required]
    [MaxLength(40)]
    [Column("status")]
    public string Status { get; set; } = "PENDING_PAYMENT";

    [MaxLength(500)]
    [Column("notes")]
    public string? Notes { get; set; }

    [MaxLength(100)]
    [Column("idempotency_key")]
    public string? IdempotencyKey { get; set; }

    [MaxLength(255)]
    [Column("cancellation_reason")]
    public string? CancellationReason { get; set; }

    [Column("cancelled_at")]
    public DateTime? CancelledAt { get; set; }

    [MaxLength(100)]
    [Column("cancelled_by")]
    public string? CancelledBy { get; set; }

    [Column("refund_amount", TypeName = "decimal(18,2)")]
    public decimal RefundAmount { get; set; } = 0.00m;

    [MaxLength(30)]
    [Column("refund_status")]
    public string RefundStatus { get; set; } = "NONE";

    [MaxLength(100)]
    [Column("refund_reference")]
    public string? RefundReference { get; set; }

    [Column("confirmed_at")]
    public DateTime? ConfirmedAt { get; set; }

    [Column("modified_at")]
    public DateTime? ModifiedAt { get; set; }

    [Column("created_by")]
    public long? CreatedBy { get; set; }

    [Column("updated_by")]
    public long? UpdatedBy { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
