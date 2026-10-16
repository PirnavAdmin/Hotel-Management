namespace HMS.Models;

using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

public class OrderItem
{
    // order_items.order_item_id
    public long Id { get; set; }

    // order_items.order_id
    public long OrderId { get; set; }

    // order_items.kot_id
    public long? KotId { get; set; }

    // order_items.menu_item_id
    public long MenuItemId { get; set; }

    // order_items.variant_id
    public long? VariantId { get; set; }

    // order_items.item_name
    [Required]
    [MaxLength(150)]
    public string Name { get; set; } = string.Empty;

    // order_items.unit_price
    public decimal Price { get; set; }

    // order_items.quantity
    public int Quantity { get; set; } = 1;

    // order_items.total_price
    public decimal TotalPrice { get; set; }

    // order_items.preparation_notes
    public string? Notes { get; set; }

    // order_items.item_status
    public string KotStatus { get; set; } = "Queued";

    // =========================================================
    // Database fields
    // =========================================================

    public bool IsActive { get; set; } = true;

    public bool IsDeleted { get; set; } = false;

    public DateTime CreatedAt { get; set; }

    public DateTime? UpdatedAt { get; set; }

    public long? CreatedBy { get; set; }

    public long? UpdatedBy { get; set; }


    // =========================================================
    // Navigation
    // =========================================================

    [JsonIgnore]
    public Order? Order { get; set; }


    // =========================================================
    // UI compatibility
    // =========================================================

    [NotMapped]
    public int KotBatch { get; set; } = 1;
}