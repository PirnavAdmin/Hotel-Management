using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace HMS.Models;

[Table("menu_items")]
public class MenuItem
{
    [Key]
    [Column("menu_item_id")]
    public long MenuItemId { get; set; }

    [Required]
    [MaxLength(100)]
    [Column("dish_name")]
    public string DishName { get; set; } = string.Empty;

    [Required]
    [MaxLength(100)]
    [Column("category")]
    public string Category { get; set; } = string.Empty;

    [Column("price", TypeName = "decimal(18,2)")]
    public decimal Price { get; set; }

    [Required]
    [MaxLength(20)]
    [Column("dietary_type")]
    public string DietaryType { get; set; } = "Non-Veg"; // "Veg", "Non-Veg", "Egg"

    [Column("spice_level")]
    public int SpiceLevel { get; set; } = 0; // 0 to 3

    [Column("prep_time_minutes")]
    public int? PrepTimeMinutes { get; set; } = 15;

    [MaxLength(500)]
    [Column("short_description")]
    public string? ShortDescription { get; set; }

    [MaxLength(255)]
    [Column("image_url")]
    public string? ImageUrl { get; set; }

    [Column("is_chefs_special")]
    public bool IsChefsSpecial { get; set; } = false;

    [Column("is_available")]
    public bool IsAvailable { get; set; } = true;

    [MaxLength(50)]
    [Column("serving_measure")]
    public string? ServingMeasure { get; set; }

    [MaxLength(30)]
    [Column("drink_type")]
    public string? DrinkType { get; set; }

    [Column("alcohol_pct", TypeName = "decimal(5,2)")]
    public decimal? AlcoholPct { get; set; }

    [Column("is_bar_item")]
    public bool IsBarItem { get; set; } = false;

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    [Column("deleted_at")]
    public DateTime? DeletedAt { get; set; }
}
