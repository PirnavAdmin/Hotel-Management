using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace HMS.Models;

[Table("restaurant_theme_settings")]
public sealed class RestaurantThemeSetting
{
    [Key]
    [Column("restaurant_id")]
    public long RestaurantId { get; set; }

    [Required]
    [MaxLength(7)]
    [Column("accent_color")]
    public string AccentColor { get; set; } = "#f59e0b";

    [Column("created_at")]
    public DateTime CreatedAt { get; set; }

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; }

    [Column("updated_by")]
    public long UpdatedBy { get; set; }
}