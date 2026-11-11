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
<<<<<<< HEAD

=======
>>>>>>> 35c8f36115066816841543296a3856444e23bf2c
    [Required]
    [MaxLength(50)]
    [Column("department")]
    public string Department { get; set; } = "Bar"; // "Bar", "Dine", "Kitchen"

    [Required]
    [MaxLength(150)]
    [Column("supplier")]
    public string Supplier { get; set; } = "Local Supplier";

<<<<<<< HEAD
    [Column("quantity", TypeName = "decimal(18,2)")]
=======
    [Column("quantity", TypeName = "decimal(18,3)")]
>>>>>>> 35c8f36115066816841543296a3856444e23bf2c
    public decimal Quantity { get; set; }

    [Column("unit_cost", TypeName = "decimal(18,2)")]
    public decimal UnitCost { get; set; }

    [Column("total_amount", TypeName = "decimal(18,2)")]
    public decimal TotalAmount { get; set; }

<<<<<<< HEAD
=======
    [NotMapped]
    public decimal TotalCost => TotalAmount != 0 ? TotalAmount : Math.Round(Quantity * UnitCost, 2);

>>>>>>> 35c8f36115066816841543296a3856444e23bf2c
    [MaxLength(255)]
    [Column("note")]
    public string? Note { get; set; }

    [Column("purchase_date")]
    public DateTime PurchaseDate { get; set; } = DateTime.UtcNow;

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
