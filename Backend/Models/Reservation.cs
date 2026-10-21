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

    [Column("branch_id")]
    public long BranchId { get; set; } = 1;

    [Column("customer_id")]
    public long? CustomerId { get; set; }

    [MaxLength(100)]
    [Column("customer_name")]
    public string? CustomerName { get; set; }

    [MaxLength(20)]
    [Column("phone")]
    public string? Phone { get; set; }

    [Column("table_id")]
    public long? TableId { get; set; }

    [Column("guests_count")]
    public int GuestsCount { get; set; } = 2;

    [Column("reservation_date")]
    public DateTime ReservationDate { get; set; } = DateTime.UtcNow.Date;

    [Column("reservation_time")]
    public TimeSpan ReservationTime { get; set; }

    [Required]
    [MaxLength(20)]
    [Column("status")]
    public string Status { get; set; } = "booked"; // "booked", "confirmed", "seated", "cancelled", "no_show"

    [MaxLength(255)]
    [Column("notes")]
    public string? Notes { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
