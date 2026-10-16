namespace HMS.Models;

using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

public class Order
{
    // restaurant_orders.order_id
    public long Id { get; set; }

    // restaurant_orders.order_number
    [Required]
    [MaxLength(30)]
    public string OrderNumber { get; set; } = string.Empty;

    // restaurant_orders.outlet_id
    public long OutletId { get; set; }

    // restaurant_orders.order_type
    [Required]
    [MaxLength(30)]
    public string OrderType { get; set; } = "DineIn";

    // restaurant_orders.dining_table_id
    public long? TableId { get; set; }

    // restaurant_orders.booking_id
    public long? BookingId { get; set; }

    // restaurant_orders.waiter_id
    public long? WaiterId { get; set; }

    // restaurant_orders.guests_count
    public int Guests { get; set; } = 1;

    // restaurant_orders.order_status
    public string Status { get; set; } = "Active";

    // restaurant_orders.special_instructions
    public string? SpecialInstructions { get; set; }

    // restaurant_orders.is_active
    public bool IsActive { get; set; } = true;

    // restaurant_orders.is_deleted
    public bool IsDeleted { get; set; } = false;

    // restaurant_orders.created_at
    public DateTime CreatedAt { get; set; }

    // restaurant_orders.updated_at
    public DateTime? UpdatedAt { get; set; }

    // restaurant_orders.created_by
    public long? CreatedBy { get; set; }

    // restaurant_orders.updated_by
    public long? UpdatedBy { get; set; }

    // Navigation property
    public ICollection<OrderItem> Items { get; set; }
        = new List<OrderItem>();


    // =========================================================
    // UI / CALCULATED PROPERTIES
    // These are NOT stored in restaurant_orders.
    // =========================================================

    [NotMapped]
    public string TableName { get; set; } = string.Empty;

    [NotMapped]
    public string Section { get; set; } = string.Empty;

    [NotMapped]
    public string ServerName { get; set; } = string.Empty;

    [NotMapped]
    public decimal Subtotal { get; set; }

    [NotMapped]
    public decimal DiscountPercent { get; set; }

    [NotMapped]
    public decimal DiscountAmount { get; set; }

    [NotMapped]
    public decimal TaxPercent { get; set; } = 5m;

    [NotMapped]
    public decimal TaxAmount { get; set; }

    [NotMapped]
    public decimal ServiceChargePercent { get; set; } = 5m;

    [NotMapped]
    public decimal ServiceChargeAmount { get; set; }

    [NotMapped]
    public decimal TipAmount { get; set; }

    [NotMapped]
    public decimal GrandTotal { get; set; }

    [NotMapped]
    public string? PaymentMethod { get; set; }

    [NotMapped]
    public string? InvoiceNo { get; set; }

    [NotMapped]
    public DateTime? SettledAt { get; set; }
}