using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace HMS.DTOs;

#region 1. Takeaway Menu & Category DTOs

public class TakeawayMenuItemDto
{
    public long ItemId { get; set; }
    public long MenuItemId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string DishName { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public decimal Price { get; set; }
    public string? Description { get; set; }
    public string? ImageUrl { get; set; }
    public bool IsAvailable { get; set; }
    public string? DietaryType { get; set; }
    public string? DrinkType { get; set; }
    public bool IsBarItem { get; set; }
    public int SpiceLevel { get; set; }
    public int? PrepTimeMinutes { get; set; }
    public string? ServingMeasure { get; set; }
}

public class TakeawayCategoryDto
{
    public long CategoryId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string CategoryName { get; set; } = string.Empty;
    public int ItemCount { get; set; }
}

#endregion

#region 2. Cart Calculation DTOs

public class TakeawayCartItemInput
{
    public long ItemId { get; set; }
    public long? MenuItemId { get; set; }

    [Required]
    [Range(1, 10000, ErrorMessage = "Item quantity must be between 1 and 10000.")]
    public int Quantity { get; set; } = 1;

    public string? Notes { get; set; }
    public long? VariantId { get; set; }
}

public class TakeawayCartCalculateRequest
{
    [Required]
    [MinLength(1, ErrorMessage = "At least one item is required in cart calculation.")]
    public List<TakeawayCartItemInput> Items { get; set; } = new();

    public decimal? DiscountPercent { get; set; }
    public decimal? DiscountAmount { get; set; }
    public string? DiscountType { get; set; } // "percentage", "percent", "flat", "fixed"
    public decimal? DiscountValue { get; set; }

    public decimal? PackagingCharge { get; set; }
}

public class TakeawayCartItemBreakdown
{
    public long ItemId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public decimal UnitPrice { get; set; }
    public int Quantity { get; set; }
    public decimal TotalPrice { get; set; }
    public string? Notes { get; set; }
}

public class TakeawayCartCalculationResponse
{
    public decimal Subtotal { get; set; }
    public decimal DiscountPercent { get; set; }
    public decimal DiscountAmount { get; set; }
    public decimal TaxableAmount { get; set; }
    public decimal TaxRate { get; set; } = 5.0m;
    public decimal CgstRate { get; set; } = 2.5m;
    public decimal CgstAmount { get; set; }
    public decimal SgstRate { get; set; } = 2.5m;
    public decimal SgstAmount { get; set; }
    public decimal GstAmount { get; set; }
    public decimal TaxAmount { get; set; }
    public decimal PackagingCharge { get; set; }
    public decimal RoundOff { get; set; }
    public decimal TotalAmount { get; set; }
    public decimal FinalAmount { get; set; }
    public List<TakeawayCartItemBreakdown> Items { get; set; } = new();
}

#endregion

#region 3. Order Creation & Checkout DTOs

public class CreateTakeawayOrderRequest
{
    [Required]
    [MinLength(1, ErrorMessage = "At least one menu item is required to place a takeaway order.")]
    public List<TakeawayCartItemInput> Items { get; set; } = new();

    public string OrderType { get; set; } = "TAKEAWAY";

    public long? CustomerId { get; set; }
    public string? CustomerName { get; set; }
    public string? CustomerPhone { get; set; }

    public string? PaymentMethod { get; set; } = "Cash"; // "Cash", "UPI", "Card", etc.
    public string? PaymentStatus { get; set; } // "Paid", "Pending"
    public bool IsPaid { get; set; } = true;

    public decimal? DiscountPercent { get; set; }
    public decimal? DiscountAmount { get; set; }
    public string? DiscountType { get; set; }
    public decimal? DiscountValue { get; set; }

    public decimal? PackagingCharge { get; set; }

    public string? Notes { get; set; }
    public string? SpecialInstructions { get; set; }
    public string? InvoiceNumber { get; set; }
    public string? ServerName { get; set; } = "Takeaway Cashier";

    /// <summary>
    /// Idempotency key protecting against duplicate checkout submissions.
    /// </summary>
    public string? IdempotencyKey { get; set; }
}

public class TakeawayFinancialsDto
{
    public decimal Subtotal { get; set; }
    public decimal DiscountPercent { get; set; }
    public decimal DiscountAmount { get; set; }
    public decimal TaxableAmount { get; set; }
    public decimal CgstAmount { get; set; }
    public decimal SgstAmount { get; set; }
    public decimal GstAmount { get; set; }
    public decimal PackagingCharge { get; set; }
    public decimal RoundOff { get; set; }
    public decimal TotalAmount { get; set; }
    public decimal PaidAmount { get; set; }
}

public class TakeawayOrderResponseDto
{
    public bool Success { get; set; } = true;
    public string Message { get; set; } = "Takeaway order created successfully.";
    public long OrderId { get; set; }
    public string OrderNumber { get; set; } = string.Empty;
    public long InvoiceId { get; set; }
    public string InvoiceNumber { get; set; } = string.Empty;
    public string OrderType { get; set; } = "TAKEAWAY";
    public string OrderStatus { get; set; } = "Settled";
    public string PaymentStatus { get; set; } = "Paid";
    public string PaymentMethod { get; set; } = "Cash";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public TakeawayFinancialsDto Financials { get; set; } = new();
    public List<TakeawayCartItemBreakdown> Items { get; set; } = new();

    public object? KitchenKot { get; set; }
    public object? BarKot { get; set; }
}

#endregion

#region 4. Invoice & Payment Record DTOs

public class TakeawayInvoiceSummaryDto
{
    public long InvoiceId { get; set; }
    public string InvoiceNumber { get; set; } = string.Empty;
    public long OrderId { get; set; }
    public string OrderNumber { get; set; } = string.Empty;
    public DateTime InvoiceDate { get; set; }
    public decimal Subtotal { get; set; }
    public decimal DiscountAmount { get; set; }
    public decimal TaxAmount { get; set; }
    public decimal TotalAmount { get; set; }
    public decimal PaidAmount { get; set; }
    public string PaymentStatus { get; set; } = "Paid";
    public string PaymentMethod { get; set; } = "Cash";
    public int ItemCount { get; set; }
    public string? CustomerName { get; set; }
    public string? CustomerPhone { get; set; }
}

public class TakeawayInvoiceDetailDto
{
    public long InvoiceId { get; set; }
    public string InvoiceNumber { get; set; } = string.Empty;
    public long OrderId { get; set; }
    public string OrderNumber { get; set; } = string.Empty;
    public DateTime OrderDate { get; set; }
    public DateTime InvoiceDate { get; set; }
    public string OrderType { get; set; } = "Takeaway";

    public decimal Subtotal { get; set; }
    public decimal DiscountAmount { get; set; }
    public decimal TaxableAmount { get; set; }
    public decimal CgstAmount { get; set; }
    public decimal SgstAmount { get; set; }
    public decimal TaxAmount { get; set; }
    public decimal PackagingCharge { get; set; }
    public decimal RoundOff { get; set; }
    public decimal TotalAmount { get; set; }
    public decimal PaidAmount { get; set; }

    public string PaymentMethod { get; set; } = "Cash";
    public string PaymentStatus { get; set; } = "Paid";

    public List<TakeawayCartItemBreakdown> Items { get; set; } = new();
    public List<TakeawayPaymentRecordDto> Payments { get; set; } = new();
}

public class TakeawayPaymentRecordDto
{
    public long PaymentId { get; set; }
    public decimal Amount { get; set; }
    public string PaymentMode { get; set; } = "CASH";
    public string? TransactionReference { get; set; }
    public string PaymentStatus { get; set; } = "success";
    public DateTime PaidAt { get; set; }
}

public class TakeawayRecordPaymentRequest
{
    [Required]
    public string PaymentMethod { get; set; } = "Cash"; // Cash, UPI, Card

    public decimal? Amount { get; set; }
    public string? TransactionReference { get; set; }
}

public class TakeawayPaginatedList<T>
{
    public int TotalCount { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
    public int TotalPages => (int)Math.Ceiling(TotalCount / (double)PageSize);
    public List<T> Data { get; set; } = new();
}

#endregion
