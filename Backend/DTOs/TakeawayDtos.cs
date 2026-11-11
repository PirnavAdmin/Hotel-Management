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
    public long? OrderItemId { get; set; }
    public long ItemId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public decimal UnitPrice { get; set; }
    public int Quantity { get; set; }
    public decimal TotalPrice { get; set; }
    public string? Notes { get; set; }
    public string? Department { get; set; }
    public string? KotStatus { get; set; }
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
    public string? CustomerEmail { get; set; }

    public string? PaymentMethod { get; set; } = "Cash"; // "Cash", "UPI", "Card", "NetBanking", "Wallet"
    public string? PaymentStatus { get; set; } // "Paid", "Success", "Pending", "Failed"
    public bool IsPaid { get; set; } = true;
    public decimal? PaidAmount { get; set; }
    public string? TransactionReference { get; set; }

    // Payment gateway verification metadata
    public string? GatewayProvider { get; set; } // "Razorpay", "Stripe", "UPI", "POS"
    public string? GatewayOrderId { get; set; }
    public string? GatewayPaymentId { get; set; }
    public string? GatewaySignature { get; set; }
    public string? FailureReason { get; set; }

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
    public bool AlreadyProcessed { get; set; }
    public string Message { get; set; } = "Takeaway order created successfully.";
    public long OrderId { get; set; }
    public string OrderNumber { get; set; } = string.Empty;
    public long InvoiceId { get; set; }
    public string InvoiceNumber { get; set; } = string.Empty;
    public string OrderType { get; set; } = "TAKEAWAY";
    public string OrderStatus { get; set; } = "Settled";
    public string FulfillmentStatus { get; set; } = "New";
    public string PaymentStatus { get; set; } = "Paid";
    public string PaymentMethod { get; set; } = "Cash";
    public string? TransactionReference { get; set; }
    public string? GatewayProvider { get; set; }
    public string? GatewayPaymentId { get; set; }
    public string? FailureReason { get; set; }
    public long? CustomerId { get; set; }
    public string? CustomerName { get; set; }
    public string? CustomerPhone { get; set; }
    public string? CustomerEmail { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public TakeawayFinancialsDto Financials { get; set; } = new();
    public List<TakeawayCartItemBreakdown> Items { get; set; } = new();

    public object? KitchenKot { get; set; }
    public object? BarKot { get; set; }
}

public class UpdateTakeawayOrderStatusRequest
{
    [Required]
    public string Status { get; set; } = "Preparing"; // "New", "Preparing", "Ready", "PickedUp", "Completed", "Cancelled"
    public string? Notes { get; set; }
}

public class TakeawayOrderStatusResponseDto
{
    public bool Success { get; set; } = true;
    public string Message { get; set; } = string.Empty;
    public long OrderId { get; set; }
    public string OrderNumber { get; set; } = string.Empty;
    public string OrderStatus { get; set; } = string.Empty;
    public string FulfillmentStatus { get; set; } = string.Empty;
    public string PaymentStatus { get; set; } = string.Empty;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

#endregion

#region 4. Invoice & Payment Record DTOs

public class TakeawayInvoiceSummaryDto
{
    public long InvoiceId { get; set; }
    public string InvoiceNumber { get; set; } = string.Empty;
    public long OrderId { get; set; }
    public string OrderNumber { get; set; } = string.Empty;
    public string OrderStatus { get; set; } = "Settled";
    public string FulfillmentStatus { get; set; } = "New";
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
    public string? CustomerEmail { get; set; }
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
    public string OrderStatus { get; set; } = "Settled";
    public string FulfillmentStatus { get; set; } = "New";

    public long? CustomerId { get; set; }
    public string? CustomerName { get; set; }
    public string? CustomerPhone { get; set; }
    public string? CustomerEmail { get; set; }
    public string? SpecialInstructions { get; set; }

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
    public object? KitchenKot { get; set; }
    public object? BarKot { get; set; }

    public string? CancellationReason { get; set; }
    public DateTime? CancelledAt { get; set; }
    public long? CancelledBy { get; set; }
    public string? CancelledByName { get; set; }
    public List<OrderStatusHistoryItemDto> StatusHistory { get; set; } = new();
}

public class TakeawayPaymentRecordDto
{
    public long PaymentId { get; set; }
    public decimal Amount { get; set; }
    public string PaymentMode { get; set; } = "CASH";
    public string PaymentMethod { get; set; } = "cash";
    public string? TransactionReference { get; set; }
    public string PaymentStatus { get; set; } = "success";
    public string? GatewayProvider { get; set; }
    public string? GatewayOrderId { get; set; }
    public string? GatewayPaymentId { get; set; }
    public string? FailureReason { get; set; }
    public DateTime PaidAt { get; set; }
}

public class TakeawayRecordPaymentRequest
{
    [Required]
    public string PaymentMethod { get; set; } = "Cash"; // Cash, UPI, Card, NetBanking, Wallet

    public decimal? Amount { get; set; }
    public string? TransactionReference { get; set; }
    public string? PaymentStatus { get; set; } // "Success", "Paid", "Pending", "Failed"

    // Payment gateway response fields
    public string? GatewayProvider { get; set; }
    public string? GatewayOrderId { get; set; }
    public string? GatewayPaymentId { get; set; }
    public string? GatewaySignature { get; set; }
    public string? FailureReason { get; set; }
    public string? IdempotencyKey { get; set; }
}

public class TakeawayPaymentResultDto
{
    public bool Success { get; set; }
    public bool AlreadyProcessed { get; set; }
    public string Message { get; set; } = string.Empty;
    public long OrderId { get; set; }
    public string OrderNumber { get; set; } = string.Empty;
    public long InvoiceId { get; set; }
    public string InvoiceNumber { get; set; } = string.Empty;
    public long PaymentId { get; set; }
    public decimal Amount { get; set; }
    public decimal PaidAmount { get; set; }
    public decimal DueAmount { get; set; }
    public string PaymentStatus { get; set; } = "Paid";
    public string PaymentMethod { get; set; } = "Cash";
    public string? TransactionReference { get; set; }
    public string? GatewayProvider { get; set; }
    public string? GatewayPaymentId { get; set; }
    public string? FailureReason { get; set; }
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

#region 5. Takeaway Dashboard Orders List, Summary & Cancellation DTOs

public class OrderStatusHistoryItemDto
{
    public long LogId { get; set; }
    public string Action { get; set; } = string.Empty;
    public string? FromStatus { get; set; }
    public string? ToStatus { get; set; }
    public string? Reason { get; set; }
    public long? ChangedByUserId { get; set; }
    public string? ChangedByName { get; set; }
    public DateTime Timestamp { get; set; }
    public string? Details { get; set; }
}

public class TakeawayOrderListItemDto
{
    public long OrderId { get; set; }
    public string OrderNumber { get; set; } = string.Empty;
    public string OrderType { get; set; } = "Takeaway";
    public long? CustomerId { get; set; }
    public string CustomerName { get; set; } = "Walk-in / Online Customer";
    public string? CustomerPhone { get; set; }
    public string? PhoneNumber => CustomerPhone;
    public string? CustomerEmail { get; set; }

    public List<TakeawayCartItemBreakdown> Items { get; set; } = new();
    public int ItemCount { get; set; }
    public int TotalQuantity { get; set; }

    public decimal Subtotal { get; set; }
    public decimal DiscountAmount { get; set; }
    public decimal TaxableAmount { get; set; }
    public decimal CgstAmount { get; set; }
    public decimal SgstAmount { get; set; }
    public decimal GstAmount { get; set; }
    public decimal TaxAmount { get; set; }
    public decimal ServiceCharge { get; set; }
    public decimal PackagingCharge { get; set; }
    public decimal RoundOff { get; set; }
    public decimal TotalAmount { get; set; }
    public decimal PaidAmount { get; set; }
    public decimal DueAmount { get; set; }

    public string PaymentStatus { get; set; } = "Pending";
    public string PaymentMethod { get; set; } = "Cash";
    public string? TransactionReference { get; set; }
    public string? GatewayProvider { get; set; }
    public string? InvoiceStatus { get; set; }

    public string OrderStatus { get; set; } = "Active";
    public string FulfillmentStatus { get; set; } = "New";

    public DateTime OrderDateTime { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }

    public long? InvoiceId { get; set; }
    public string? InvoiceNumber { get; set; }
    public string? KitchenKotNumber { get; set; }
    public string? BarBotNumber { get; set; }

    public string? SpecialInstructions { get; set; }
    public string? CancellationReason { get; set; }
    public DateTime? CancelledAt { get; set; }
    public long? CancelledBy { get; set; }
    public string? CancelledByName { get; set; }
}

public class TakeawayOrdersSummaryDto
{
    public int TotalTakeawayOrders { get; set; }
    public int TotalOrders => TotalTakeawayOrders;
    public decimal TotalTakeawaySales { get; set; }
    public decimal TotalSales => TotalTakeawaySales;
    public decimal PaidTakeawaySales { get; set; }
    public decimal PendingTakeawaySales { get; set; }

    public int PendingOrders { get; set; }
    public int NewOrders => PendingOrders;
    public int PreparingOrders { get; set; }
    public int ReadyOrders { get; set; }
    public int PickedUpOrders { get; set; }
    public int CompletedOrders { get; set; }
    public int CancelledOrders { get; set; }

    public int PaidOrdersCount { get; set; }
    public int PendingPaymentOrders { get; set; }
    public int FailedPaymentOrders { get; set; }
    public int RefundedOrdersCount { get; set; }

    public DateTime? FromDate { get; set; }
    public DateTime? ToDate { get; set; }
}

public class CancelTakeawayOrderRequest
{
    [MaxLength(255)]
    public string? Reason { get; set; }

    [MaxLength(255)]
    public string? CancellationReason { get; set; }

    [MaxLength(40)]
    public string? RefundMethod { get; set; }

    [MaxLength(500)]
    public string? Notes { get; set; }
}

public class CancelTakeawayOrderResponseDto
{
    public bool Success { get; set; } = true;
    public string Message { get; set; } = string.Empty;
    public long OrderId { get; set; }
    public string OrderNumber { get; set; } = string.Empty;
    public string OrderType { get; set; } = "Takeaway";
    public string OrderStatus { get; set; } = "Cancelled";
    public string FulfillmentStatus { get; set; } = "Cancelled";
    public string PaymentStatus { get; set; } = string.Empty;
    public string? InvoiceStatus { get; set; }
    public string RefundStatus { get; set; } = "None";
    public decimal RefundedAmount { get; set; }
    public string CancellationReason { get; set; } = string.Empty;
    public DateTime CancelledAt { get; set; }
    public long? CancelledBy { get; set; }
    public string? CancelledByName { get; set; }
    public List<string> CancelledTickets { get; set; } = new();
    public List<OrderStatusHistoryItemDto> StatusHistory { get; set; } = new();
}

#endregion
