using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace HMS.DTOs;

public class SelfServiceOrderItemInput
{
    [Required]
    public long MenuItemId { get; set; }

    [Range(1, 100, ErrorMessage = "Quantity must be between 1 and 100.")]
    public int Quantity { get; set; } = 1;

    [MaxLength(255)]
    public string? Notes { get; set; }

    [MaxLength(150)]
    public string? Name { get; set; }

    // Client may attempt to send a price; backend MUST ignore and overwrite with database price
    public decimal? ClientSuppliedPrice { get; set; }
}

public class CreateSelfServiceOrderRequest
{
    [Required]
    public List<SelfServiceOrderItemInput> Items { get; set; } = new();

    [MaxLength(120)]
    public string? CustomerName { get; set; }

    [MaxLength(20)]
    public string? CustomerPhone { get; set; }

    [MaxLength(120)]
    [EmailAddress]
    public string? CustomerEmail { get; set; }

    [MaxLength(255)]
    public string? SpecialInstructions { get; set; }

    [MaxLength(100)]
    public string? IdempotencyKey { get; set; }

    // Discounts cannot be arbitrarily submitted by customers; validated strictly on backend
    public decimal? RequestedDiscountPercent { get; set; }
    public decimal? RequestedDiscountAmount { get; set; }

    [MaxLength(50)]
    public string? DiscountCode { get; set; }

    // Client-supplied totals (backend validates and recomputes authoritative figures)
    public decimal? ClientSuppliedSubtotal { get; set; }
    public decimal? ClientSuppliedGrandTotal { get; set; }
}

public class SelfServiceOrderItemResponseDto
{
    public long OrderItemId { get; set; }
    public long MenuItemId { get; set; }
    public string Name { get; set; } = string.Empty;
    public decimal UnitPrice { get; set; }
    public int Quantity { get; set; }
    public decimal LineSubtotal { get; set; }
    public string? Notes { get; set; }
    public string KotStatus { get; set; } = "Queued";
}

public class SelfServiceFinancialSummaryDto
{
    public decimal Subtotal { get; set; }
    public decimal DiscountPercent { get; set; }
    public decimal DiscountAmount { get; set; }
    public decimal TaxableAmount { get; set; }
    public decimal FoodGstRate { get; set; }
    public decimal CgstRate { get; set; }
    public decimal SgstRate { get; set; }
    public decimal CgstAmount { get; set; }
    public decimal SgstAmount { get; set; }
    public decimal TaxAmount { get; set; }
    public bool ServiceChargeEnabled { get; set; }
    public decimal ServiceChargeRate { get; set; }
    public decimal ServiceChargeAmount { get; set; }
    public string RoundingMode { get; set; } = "nearest";
    public decimal RoundingAdjustment { get; set; }
    public decimal FinalPayable { get; set; }
}

public class SelfServiceOrderResponseDto
{
    public long OrderId { get; set; }
    public string OrderNumber { get; set; } = string.Empty;
    public long BranchId { get; set; }
    public string OrderType { get; set; } = "SelfService";
    public string Status { get; set; } = "PendingPayment";
    public string FulfillmentStatus { get; set; } = "New";
    public string PaymentStatus { get; set; } = "Pending";
    public string? CustomerName { get; set; }
    public string? CustomerPhone { get; set; }
    public string? CustomerEmail { get; set; }
    public string? SpecialInstructions { get; set; }
    public string? IdempotencyKey { get; set; }
    public bool IsDuplicate { get; set; }
    public DateTime CreatedAt { get; set; }
    public List<SelfServiceOrderItemResponseDto> Items { get; set; } = new();
    public SelfServiceFinancialSummaryDto Financials { get; set; } = new();
    public long? InvoiceId { get; set; }
    public string? InvoiceNumber { get; set; }
}

public class SelfServicePaymentInitiationRequest
{
    [Required]
    [MaxLength(20)]
    public string PaymentMethod { get; set; } = "UPI"; // UPI | CASH | CARD

    [MaxLength(100)]
    public string? TransactionReference { get; set; }

    [MaxLength(255)]
    public string? Notes { get; set; }
}

public class SelfServicePaymentInitiationResponseDto
{
    public long OrderId { get; set; }
    public string OrderNumber { get; set; } = string.Empty;
    public string PaymentMethod { get; set; } = "UPI";
    public string PaymentStatus { get; set; } = "Pending";
    public decimal Amount { get; set; }
    public bool GatewayConfigured { get; set; }
    public string? QrPayload { get; set; }
    public string? Message { get; set; }
    public bool CounterPaymentRegistered { get; set; }
    public DateTime? InitiatedAt { get; set; }
}

public class SelfServicePaymentConfirmRequest
{
    [Required]
    [MaxLength(20)]
    public string PaymentMethod { get; set; } = "CASH"; // CASH | UPI | CARD

    public decimal Amount { get; set; }

    [MaxLength(100)]
    public string? TransactionReference { get; set; }
}
