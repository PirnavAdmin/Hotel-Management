using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace HMS.Models;

[Table("suppliers")]
public class Supplier
{
    [Key]
    [Column("supplier_id")]
    public long SupplierId { get; set; }

    [Required]
    [MaxLength(100)]
    [Column("supplier_name")]
    public string SupplierName { get; set; } = string.Empty;

    [Required]
    [MaxLength(20)]
    [Column("phone")]
    public string Phone { get; set; } = string.Empty;

    [MaxLength(100)]
    [Column("email")]
    public string? Email { get; set; }

    [MaxLength(255)]
    [Column("address")]
    public string? Address { get; set; }

    [Column("is_active")]
    public bool IsActive { get; set; } = true;

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
