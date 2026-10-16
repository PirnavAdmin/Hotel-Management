using System;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace HMS.DTOs;

public class RestaurantSettingsDto
{
    [JsonPropertyName("restaurantName")]
    public string RestaurantName { get; set; } = "AVSR FOOD COURT";

    [JsonPropertyName("tagline")]
    public string? Tagline { get; set; } = "Restaurant Management & Fine Dining";

    [JsonPropertyName("contactNumber")]
    public string? ContactNumber { get; set; } = "+91 98450 12345";

    [JsonPropertyName("phone")]
    public string? Phone
    {
        get => ContactNumber;
        set { if (!string.IsNullOrWhiteSpace(value)) ContactNumber = value; }
    }

    [JsonPropertyName("address")]
    public string? Address { get; set; } = "Main Road, Near Tech Park, Hyderabad, India";

    [JsonPropertyName("gstin")]
    public string? Gstin { get; set; } = "36AABCA1234F1Z5";

    [JsonPropertyName("restaurantLogo")]
    public string? RestaurantLogo { get; set; }

    [JsonPropertyName("logo")]
    public string? Logo
    {
        get => RestaurantLogo;
        set { if (!string.IsNullOrWhiteSpace(value)) RestaurantLogo = value; }
    }

    [JsonPropertyName("foodGstRate")]
    public decimal FoodGstRate { get; set; } = 5.00m;

    [JsonPropertyName("taxRate")]
    public decimal TaxRate
    {
        get => FoodGstRate;
        set => FoodGstRate = value;
    }

    [JsonPropertyName("serviceChargeRate")]
    public decimal ServiceChargeRate { get; set; } = 5.00m;

    [JsonPropertyName("serviceChargeEnabled")]
    public bool ServiceChargeEnabled { get; set; } = true;

    [JsonPropertyName("roundingMode")]
    public string RoundingMode { get; set; } = "nearest";

    [JsonPropertyName("currency")]
    public string Currency { get; set; } = "₹";

    [JsonPropertyName("receiptHeader")]
    public string? ReceiptHeader { get; set; } = "Welcome to AVSR Food Court!";

    [JsonPropertyName("receiptFooter")]
    public string? ReceiptFooter { get; set; } = "Thank you for dining with us. Visit again!";

    [JsonPropertyName("selectedQrId")]
    public string? SelectedQrId { get; set; } = "qr-1";

    [JsonPropertyName("paymentQrs")]
    public object? PaymentQrs { get; set; }

    [JsonPropertyName("showLogoOnReceipt")]
    public bool ShowLogoOnReceipt { get; set; } = true;

    [JsonPropertyName("showAddressOnReceipt")]
    public bool ShowAddressOnReceipt { get; set; } = true;

    [JsonPropertyName("showGstBreakdown")]
    public bool ShowGstBreakdown { get; set; } = true;

    [JsonPropertyName("lowStockAlertsEnabled")]
    public bool LowStockAlertsEnabled { get; set; } = true;

    [JsonPropertyName("displayTheme")]
    public string DisplayTheme { get; set; } = "royal-saffron";

    [JsonPropertyName("theme")]
    public string? Theme
    {
        get => DisplayTheme;
        set { if (!string.IsNullOrWhiteSpace(value)) DisplayTheme = value; }
    }

    [JsonPropertyName("updatedAt")]
    public DateTime? UpdatedAt { get; set; } = DateTime.UtcNow;
}
