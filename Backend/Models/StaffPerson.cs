using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace HMS.Models;

[Table("staff_persons")]
public class StaffPerson
{
    [Key]
    [Column("staff_id")]
    public long StaffId { get; set; }

    [Required]
    [MaxLength(100)]
    [Column("full_name")]
    public string FullName { get; set; } = string.Empty;

    [Required]
    [MaxLength(50)]
    [Column("role_title")]
    public string RoleTitle { get; set; } = string.Empty; // e.g. "Senior Captain", "Head Waiter", "Server / Waiter"

    [Required]
    [MaxLength(20)]
    [Column("phone")]
    public string Phone { get; set; } = string.Empty;

    [Required]
    [MaxLength(50)]
    [Column("shift")]
    public string Shift { get; set; } = string.Empty; // e.g. "Morning Shift (10 AM - 4 PM)"

    [Column("is_active")]
    public bool IsActive { get; set; } = true;

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    [Column("deleted_at")]
    public DateTime? DeletedAt { get; set; }

    // Relationship
    public ICollection<RestaurantTable> AssignedTables { get; set; } = new List<RestaurantTable>();
}
