using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace HMS.Models;

[Table("invoices")]
public class Invoice
{
    [Key]
    [Column("invoice_id")]
    public long InvoiceId { get; set; }

    [Column("order_id")]
    public long OrderId { get; set; }

    [Required]
    [MaxLength(50)]
    [Column("invoice_number")]
    public string InvoiceNumber { get; set; } = string.Empty;

    [Column("subtotal", TypeName = "decimal(18,2)")]
    public decimal Subtotal { get; set; }

    [Column("taxable_amount", TypeName = "decimal(18,2)")]
    public decimal TaxableAmount { get; set; }

    [Column("tax_amount", TypeName = "decimal(18,2)")]
    public decimal TaxAmount { get; set; }

    [Column("discount_amount", TypeName = "decimal(18,2)")]
    public decimal DiscountAmount { get; set; }

    [Column("total_amount", TypeName = "decimal(18,2)")]
    public decimal TotalAmount { get; set; }

    [Column("paid_amount", TypeName = "decimal(18,2)")]
    public decimal PaidAmount { get; set; }

    [Column("amount_paid", TypeName = "decimal(18,2)")]
    public decimal AmountPaid { get; set; }

    [Required]
    [MaxLength(20)]
    [Column("status")]
    public string Status { get; set; } = "UNPAID"; // "UNPAID", "PARTIAL", "PAID", "VOID"

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<InvoicePayment> Payments { get; set; } = new List<InvoicePayment>();

    [NotMapped]
    public string TableName { get; set; } = "Table 1";

    [NotMapped]
    public string ServerName { get; set; } = "Staff";

    [NotMapped]
    public string PaymentMethod { get; set; } = "CASH";

    [NotMapped]
    public List<InvoiceItemDto> Items { get; set; } = new();
}

public class InvoiceItemDto
{
    public string Name { get; set; } = string.Empty;
    public int Quantity { get; set; } = 1;
    public decimal Price { get; set; }
    public decimal Total { get; set; }
}

