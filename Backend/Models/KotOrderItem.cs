using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace HMS.Models;

[Table("kot_order_items")]
public class KotOrderItem
{
    [Key]
    [Column("order_item_id")]
    public long OrderItemId { get; set; }

    [Column("order_id")]
    public long OrderId { get; set; }

    [Column("menu_item_id")]
    public long? MenuItemId { get; set; }

    [Required]
    [MaxLength(100)]
    [Column("dish_name")]
    public string DishName { get; set; } = string.Empty;

    [Column("quantity")]
    public int Quantity { get; set; } = 1;

    [Required]
    [MaxLength(50)]
    [Column("item_status")]
    public string ItemStatus { get; set; } = "PENDING"; // "PENDING", "IN PREP", "READY"

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public KotOrder? Order { get; set; }
}
