using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace HMS.Models;

[Table("ingredients")]
public class Ingredient
{
    [Key]
    [Column("ingredient_id")]
    public long IngredientId { get; set; }

    [Required]
    [MaxLength(100)]
    [Column("name")]
    public string Name { get; set; } = string.Empty;

    [MaxLength(100)]
    [Column("ingredient_name")]
    public string? IngredientName { get; set; }

    [Required]
    [MaxLength(20)]
    [Column("unit")]
    public string Unit { get; set; } = "KG"; // "KG", "LTR", "PCS", "GRAM"

    [Column("current_stock", TypeName = "decimal(18,2)")]
    public decimal CurrentStock { get; set; }

    [Column("minimum_threshold", TypeName = "decimal(18,2)")]
    public decimal MinimumThreshold { get; set; } = 5.00m;

    [Column("reorder_level", TypeName = "decimal(12,3)")]
    public decimal? ReorderLevel { get; set; }

    [Column("unit_cost", TypeName = "decimal(18,2)")]
    public decimal UnitCost { get; set; }

    [Column("cost_per_unit", TypeName = "decimal(10,2)")]
    public decimal? CostPerUnit { get; set; }

    [Column("category")]
    public string Category { get; set; } = "General";

    [Column("subcategory")]
    public string Subcategory { get; set; } = string.Empty;

    [Column("supplier")]
    public string Supplier { get; set; } = "Local Supplier";

    [Column("mrp", TypeName = "decimal(18,2)")]
    public decimal? Mrp { get; set; }

    [Column("ingredient_code")]
    public string? IngredientCode { get; set; }

    [Column("is_active")]
    public bool IsActive { get; set; } = true;

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
