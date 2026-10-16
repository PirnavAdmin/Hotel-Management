using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace HMS.Models;

[Table("kot_orders")]
public class KotOrder
{
    [Key]
    [Column("order_id")]
    public long OrderId { get; set; }

    [Column("table_id")]
    public long? TableId { get; set; }

    [Required]
    [MaxLength(50)]
    [Column("table_name")]
    public string TableName { get; set; } = string.Empty; // e.g. "Table 3"

    [Required]
    [MaxLength(50)]
    [Column("section_area")]
    public string SectionArea { get; set; } = "Main Hall";

    [Required]
    [MaxLength(100)]
    [Column("server_name")]
    public string ServerName { get; set; } = string.Empty; // e.g. "Rajesh K."

    [Required]
    [MaxLength(30)]
    [Column("order_status")]
    public string OrderStatus { get; set; } = "PENDING"; // "PENDING", "IN PREPARATION", "PREPARATION COMPLETED"

    [Column("order_received_at")]
    public DateTime OrderReceivedAt { get; set; } = DateTime.UtcNow;

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    [Column("deleted_at")]
    public DateTime? DeletedAt { get; set; }

    // Relationship
    public ICollection<KotOrderItem> Items { get; set; } = new List<KotOrderItem>();
}
