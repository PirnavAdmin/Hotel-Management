using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace HMS.Models;

[Table("reservations")]
public class Reservation
{
    [Key]
    [Column("reservation_id")]
    public long ReservationId { get; set; }

    [Column("customer_id")]
    public long? CustomerId { get; set; }

    [Required]
    [MaxLength(100)]
    [Column("customer_name")]
    public string CustomerName { get; set; } = string.Empty;

    [Required]
    [MaxLength(20)]
    [Column("phone")]
    public string Phone { get; set; } = string.Empty;

    [Column("table_id")]
    public long? TableId { get; set; }

    [Column("guests_count")]
    public int GuestsCount { get; set; } = 2;

    [Column("reservation_time")]
    public DateTime ReservationTime { get; set; } = DateTime.UtcNow;

    [Required]
    [MaxLength(20)]
    [Column("status")]
    public string Status { get; set; } = "PENDING"; // "PENDING", "CONFIRMED", "SEATED", "CANCELLED"

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
