using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace HMS.Models;

[Table("delivery_orders")]
public class DeliveryOrder
{
    [Key]
    [Column("delivery_id")]
    public long DeliveryId { get; set; }

    [Column("order_id")]
    public long OrderId { get; set; }

    [Required]
    [MaxLength(100)]
    [Column("customer_name")]
    public string CustomerName { get; set; } = string.Empty;

    [Required]
    [MaxLength(20)]
    [Column("phone")]
    public string Phone { get; set; } = string.Empty;

    [Required]
    [MaxLength(255)]
    [Column("delivery_address")]
    public string DeliveryAddress { get; set; } = string.Empty;

    [Required]
    [MaxLength(20)]
    [Column("delivery_status")]
    public string DeliveryStatus { get; set; } = "DISPATCHED"; // "DISPATCHED", "IN TRANSIT", "DELIVERED", "FAILED"

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
