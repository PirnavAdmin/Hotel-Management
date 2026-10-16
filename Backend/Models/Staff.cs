namespace HMS.Models;

using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

[Table("staff")]
public class Staff
{
    [Key]
    [Column("id")]
    public long Id { get; set; }

    [Required]
    [MaxLength(100)]
    [Column("name")]
    public string Name { get; set; } = string.Empty;

    // Captain, Head Chef, Sous Chef, Waiter, Cashier, Bartender
    [Column("role")]
    public string Role { get; set; } = "Waiter";

    [Column("phone")]
    public string Phone { get; set; } = string.Empty;

    // Morning, Evening, Night, Full Day
    [Column("shift")]
    public string Shift { get; set; } = "Morning";

    // active, on-leave, inactive
    [Column("status")]
    public string Status { get; set; } = "active";
}