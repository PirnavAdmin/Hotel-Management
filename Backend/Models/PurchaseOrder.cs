using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace HMS.Models;

[Table("purchase_orders")]
public class PurchaseOrder
{
    [Key]
    [Column("po_id")]
    public long PoId { get; set; }

    [Column("supplier_id")]
    public long SupplierId { get; set; }

    [Required]
    [MaxLength(50)]
    [Column("po_number")]
    public string PoNumber { get; set; } = string.Empty;

    [Column("total_amount", TypeName = "decimal(18,2)")]
    public decimal TotalAmount { get; set; }

    [Required]
    [MaxLength(50)]
    [Column("status")]
    public string Status { get; set; } = "PENDING"; // "PENDING", "RECEIVED", "CANCELLED"

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
