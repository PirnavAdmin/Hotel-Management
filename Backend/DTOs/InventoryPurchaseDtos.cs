using System.ComponentModel.DataAnnotations;

namespace HMS.DTOs;

public class CreateInventoryPurchaseDto
{
    public long? ItemId { get; set; }

    [Required]
    [StringLength(100, MinimumLength = 1)]
    public string Name { get; set; } = string.Empty;

    [StringLength(100)]
    public string? Category { get; set; }

    [StringLength(100)]
    public string? Subcategory { get; set; }

    [StringLength(150)]
    public string? Supplier { get; set; }

    [Range(typeof(decimal), "0.001", "999999999")]
    public decimal Quantity { get; set; }

    [Required]
    [StringLength(50, MinimumLength = 1)]
    public string Unit { get; set; } = string.Empty;

    [Range(typeof(decimal), "0", "9999999999999999")]
    public decimal UnitCost { get; set; }

    [Required]
    [RegularExpression("(?i)^(bar|dine)$")]
    public string Department { get; set; } = "dine";

    [Required]
    public DateTime? PurchaseDate { get; set; }
}
