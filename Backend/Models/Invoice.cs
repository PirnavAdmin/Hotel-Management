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

    [MaxLength(30)]
    [Column("order_number")]
    public string? OrderNumber { get; set; }

    [Column("branch_id")]
    public long? BranchId { get; set; }

    [MaxLength(30)]
    [Column("order_type")]
    public string? OrderType { get; set; }

    [MaxLength(120)]
    [Column("customer_name")]
    public string? CustomerName { get; set; }

    [MaxLength(20)]
    [Column("customer_phone")]
    public string? CustomerPhone { get; set; }

    [Required]
    [MaxLength(50)]
    [Column("invoice_number")]
    public string InvoiceNumber { get; set; } = string.Empty;

    [Column("subtotal", TypeName = "decimal(18,2)")]
    public decimal Subtotal { get; set; }

    [Column("taxable_amount", TypeName = "decimal(18,2)")]
    public decimal TaxableAmount { get; set; }

    [Column("gst_percent", TypeName = "decimal(5,2)")]
    public decimal GstPercent { get; set; }

    [Column("cgst_amount", TypeName = "decimal(18,2)")]
    public decimal CgstAmount { get; set; }

    [Column("sgst_amount", TypeName = "decimal(18,2)")]
    public decimal SgstAmount { get; set; }

    [Column("tax_amount", TypeName = "decimal(18,2)")]
    public decimal TaxAmount { get; set; }

    [Column("discount_amount", TypeName = "decimal(18,2)")]
    public decimal DiscountAmount { get; set; }

    [Column("service_charge_percent", TypeName = "decimal(5,2)")]
    public decimal ServiceChargePercent { get; set; }

    [Column("service_charge_amount", TypeName = "decimal(18,2)")]
    public decimal ServiceChargeAmount { get; set; }

    [Column("rounding_adjustment", TypeName = "decimal(18,2)")]
    public decimal RoundingAdjustment { get; set; }

    [Column("total_amount", TypeName = "decimal(18,2)")]
    public decimal TotalAmount { get; set; }

    [Column("paid_amount", TypeName = "decimal(18,2)")]
    public decimal PaidAmount { get; set; }

    [Column("amount_paid", TypeName = "decimal(18,2)")]
    public decimal AmountPaid { get; set; }

    [MaxLength(20)]
    [Column("payment_status")]
    public string? PaymentStatus { get; set; }

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
    public decimal DueAmount => Math.Max(0, TotalAmount - PaidAmount);

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

