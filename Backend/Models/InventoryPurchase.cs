using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace HMS.Models;

[Table("inventory_purchases")]
public class InventoryPurchase
{
    [Key]
    [Column("purchase_id")]
    public long PurchaseId { get; set; }

    [Column("ingredient_id")]
    public long IngredientId { get; set; }

    [Required]
    [MaxLength(150)]
    [Column("item_name")]
    public string ItemName { get; set; } = string.Empty;

    [Required]
    [MaxLength(50)]
    [Column("department")]
    public string Department { get; set; } = "Bar"; // "Bar", "Dine", "Kitchen"

    [Required]
    [MaxLength(150)]
    [Column("supplier")]
    public string Supplier { get; set; } = "Local Supplier";

    [Column("quantity", TypeName = "decimal(18,3)")]
    public decimal Quantity { get; set; }

    [Column("unit_cost", TypeName = "decimal(18,2)")]
    public decimal UnitCost { get; set; }

    [Column("total_amount", TypeName = "decimal(18,2)")]
    public decimal TotalAmount { get; set; }

    [NotMapped]
    public decimal TotalCost => TotalAmount != 0 ? TotalAmount : Math.Round(Quantity * UnitCost, 2);

    [MaxLength(255)]
    [Column("note")]
    public string? Note { get; set; }

    [Column("purchase_date")]
    public DateTime PurchaseDate { get; set; } = DateTime.UtcNow;

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
