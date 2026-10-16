namespace HMS.Models;

using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

public class KitchenOrderTicket
{
    // kitchen_order_tickets.kot_id
    public long Id { get; set; }

    // kitchen_order_tickets.kot_number
    [Required]
    [MaxLength(30)]
    public string KotNumber { get; set; } = string.Empty;

    // kitchen_order_tickets.order_id
    public long OrderId { get; set; }

    // kitchen_order_tickets.station_id
    public long StationId { get; set; }

    // kitchen_order_tickets.batch_number
    public int BatchNumber { get; set; } = 1;

    // kitchen_order_tickets.status
    public string Status { get; set; } = "Queued";

    // kitchen_order_tickets.prepared_by_chef_id
    public long? PreparedByChefId { get; set; }

    // kitchen_order_tickets.printed_at
    public DateTime? PrintedAt { get; set; }

    // kitchen_order_tickets.completed_at
    public DateTime? CompletedAt { get; set; }

    // kitchen_order_tickets.is_active
    public bool IsActive { get; set; } = true;

    // kitchen_order_tickets.is_deleted
    public bool IsDeleted { get; set; } = false;

    // kitchen_order_tickets.created_at
    public DateTime CreatedAt { get; set; }

    // kitchen_order_tickets.updated_at
    public DateTime? UpdatedAt { get; set; }

    // kitchen_order_tickets.created_by
    public long? CreatedBy { get; set; }

    // kitchen_order_tickets.updated_by
    public long? UpdatedBy { get; set; }

    [JsonIgnore]
    public Order? Order { get; set; }
}