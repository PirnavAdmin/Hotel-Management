using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace HMS.Models;

[Table("inventory_purchase_records")]
public class InventoryPurchaseRecord
{
    [Key]
    [Column("purchase_id")]
    public long PurchaseId { get; set; }

    [Column("item_id")]
    public long? ItemId { get; set; }

    [Required]
    [MaxLength(100)]
    [Column("name")]
    public string Name { get; set; } = string.Empty;

    [MaxLength(100)]
    [Column("category")]
    public string Category { get; set; } = string.Empty;

    [MaxLength(100)]
    [Column("subcategory")]
    public string Subcategory { get; set; } = string.Empty;

    [MaxLength(150)]
    [Column("supplier")]
    public string Supplier { get; set; } = string.Empty;

    [Column("quantity", TypeName = "decimal(18,3)")]
    public decimal Quantity { get; set; }

    [Required]
    [MaxLength(50)]
    [Column("unit")]
    public string Unit { get; set; } = string.Empty;

    [Column("unit_cost", TypeName = "decimal(18,2)")]
    public decimal UnitCost { get; set; }

    [Column("department")]
    public string Department { get; set; } = "dine";

    [Column("purchase_date", TypeName = "date")]
    public DateTime PurchaseDate { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [NotMapped]
    public decimal TotalCost => Math.Round(Quantity * UnitCost, 2);
}
