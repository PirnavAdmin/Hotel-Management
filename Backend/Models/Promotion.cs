using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace HMS.Models;

[Table("promotions")]
public class Promotion
{
    [Key]
    [Column("promotion_id")]
    public long PromotionId { get; set; }

    [Required]
    [MaxLength(50)]
    [Column("code")]
    public string Code { get; set; } = string.Empty;

    [Column("discount_percentage", TypeName = "decimal(5,2)")]
    public decimal DiscountPercentage { get; set; }

    [Column("flat_discount", TypeName = "decimal(18,2)")]
    public decimal FlatDiscount { get; set; }

    [Column("valid_until")]
    public DateTime ValidUntil { get; set; } = DateTime.UtcNow.AddDays(30);

    [Column("is_active")]
    public bool IsActive { get; set; } = true;
}
