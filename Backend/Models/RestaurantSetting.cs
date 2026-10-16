using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace HMS.Models;

[Table("restaurant_settings")]
public class RestaurantSetting
{
    [Key]
    [Column("id")]
    public int Id { get; set; } = 1;

    [Required]
    [MaxLength(200)]
    [Column("restaurant_name")]
    public string RestaurantName { get; set; } = "AVSR FOOD COURT";

    [MaxLength(255)]
    [Column("tagline")]
    public string? Tagline { get; set; }

    [MaxLength(50)]
    [Column("contact_number")]
    public string? ContactNumber { get; set; }

    [MaxLength(255)]
    [Column("address")]
    public string? Address { get; set; }

    [MaxLength(50)]
    [Column("gstin")]
    public string? Gstin { get; set; }

    [Column("restaurant_logo", TypeName = "longtext")]
    public string? RestaurantLogo { get; set; }

    [Column("food_gst_rate", TypeName = "decimal(5,2)")]
    public decimal FoodGstRate { get; set; } = 5.00m;

    [Column("service_charge_rate", TypeName = "decimal(5,2)")]
    public decimal ServiceChargeRate { get; set; } = 5.00m;

    [Column("service_charge_enabled")]
    public bool ServiceChargeEnabled { get; set; } = true;

    [MaxLength(20)]
    [Column("rounding_mode")]
    public string RoundingMode { get; set; } = "nearest";

    [MaxLength(10)]
    [Column("currency")]
    public string Currency { get; set; } = "₹";

    [MaxLength(255)]
    [Column("receipt_header")]
    public string? ReceiptHeader { get; set; }

    [MaxLength(255)]
    [Column("receipt_footer")]
    public string? ReceiptFooter { get; set; }

    [MaxLength(50)]
    [Column("selected_qr_id")]
    public string? SelectedQrId { get; set; }

    [Column("payment_qrs", TypeName = "longtext")]
    public string? PaymentQrs { get; set; }

    [Column("show_logo_on_receipt")]
    public bool ShowLogoOnReceipt { get; set; } = true;

    [Column("show_address_on_receipt")]
    public bool ShowAddressOnReceipt { get; set; } = true;

    [Column("show_gst_breakdown")]
    public bool ShowGstBreakdown { get; set; } = true;

    [Column("low_stock_alerts_enabled")]
    public bool LowStockAlertsEnabled { get; set; } = true;

    [MaxLength(50)]
    [Column("display_theme")]
    public string DisplayTheme { get; set; } = "royal-saffron";

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
