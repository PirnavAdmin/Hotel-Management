using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace HMS.Models;

[Table("restaurant_tables")]
public class RestaurantTable
{
    [Key]
    [Column("table_id")]
    public long TableId { get; set; }

    [Required]
    [MaxLength(50)]
    [Column("table_name")]
    public string TableName { get; set; } = string.Empty; // e.g. "Table 1"

    [Required]
    [MaxLength(50)]
    [Column("section_area")]
    public string SectionArea { get; set; } = "Main Hall"; // e.g. "Main Hall", "VIP Lounge", "Terrace"

    [Column("capacity_chairs")]
    public int CapacityChairs { get; set; } = 4;

    [Column("occupied_chairs")]
    public int OccupiedChairs { get; set; } = 0;

    [Required]
    [MaxLength(20)]
    [Column("status")]
    public string Status { get; set; } = "VACANT"; // "VACANT", "OCCUPIED", "RESERVED"

    [Column("assigned_server_id")]
    public long? AssignedServerId { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    [Column("deleted_at")]
    public DateTime? DeletedAt { get; set; }

    // Relationship
    public StaffPerson? AssignedServer { get; set; }
}
