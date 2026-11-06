using System;
using System.Collections.Generic;

namespace HMS.DTOs;

public class DashboardReportDto
{
    public decimal TodayRevenue { get; set; }
    public int TodayTotalOrders { get; set; }
    public int TodaySettledOrders { get; set; }
    public int ActiveTablesCount { get; set; }
    public decimal AverageOrderValue { get; set; }
    public List<TopSellingDishDto> TopSellingDishes { get; set; } = new List<TopSellingDishDto>();
    public Dictionary<string, decimal> PaymentMethodBreakdown { get; set; } = new Dictionary<string, decimal>();
    public Dictionary<string, int> CategorySalesBreakdown { get; set; } = new Dictionary<string, int>();
}

public class TopSellingDishDto
{
    public string ItemName { get; set; } = string.Empty;
    public int QuantitySold { get; set; }
    public decimal TotalRevenue { get; set; }
}

public class InventoryReportItemDto
{
    public long ItemId { get; set; }
    public long Id => ItemId;
    public long IngredientId { get => ItemId; set => ItemId = value; }
    public string? IngredientCode { get; set; }
    public string ItemName { get; set; } = string.Empty;
    public string Name => ItemName;
    public string Category { get; set; } = string.Empty;
    public string? ItemType { get; set; }
    public string Supplier { get; set; } = string.Empty;
    public string Department { get; set; } = "Bar";
    public decimal CurrentStock { get; set; }
    public decimal Stock => CurrentStock;
    public decimal UsedQuantity { get; set; } = 0.00m;
    public string Unit { get; set; } = "Bottle";
    public decimal MinimumThreshold { get; set; } = 5.00m;
    public decimal Threshold => MinimumThreshold;
    public decimal UnitCost { get; set; }
    public decimal? Mrp { get; set; }
    public decimal StockValuation { get; set; }
    public decimal Valuation => StockValuation;
    public string StockStatus { get; set; } = "In Stock";
    public string Status => StockStatus;
    public DateTime LastUpdated { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt => LastUpdated;
}

public class InventoryReportFilterDto
{
    public string? Search { get; set; }
    public string? Category { get; set; }
    public string? Supplier { get; set; }
    public string? Status { get; set; }
    public string? Department { get; set; } // "Bar", "Dine", "All"
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 20;
}

public class PurchaseLedgerItemDto
{
    public long PurchaseId { get; set; }
    public long Id => PurchaseId;
    public long IngredientId { get; set; }
    public DateTime PurchaseDate { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public string Department { get; set; } = "Bar";
    public string ItemName { get; set; } = string.Empty;
    public string Supplier { get; set; } = string.Empty;
    public decimal Quantity { get; set; }
    public decimal UnitCost { get; set; }
    public decimal TotalAmount { get; set; }
    public string? Note { get; set; }
}

public class PurchaseLedgerFilterDto
{
    public DateTime? FromDate { get; set; }
    public DateTime? ToDate { get; set; }
    public string? Department { get; set; }
    public long? ItemId { get; set; }
    public string? Supplier { get; set; }
    public string? Search { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 20;
}

public class PurchaseSummaryDto
{
    public decimal TotalPurchases { get; set; }
    public decimal DinePurchases { get; set; }
    public decimal BarPurchases { get; set; }
    public string Currency { get; set; } = "INR";
    public int TotalPurchaseCount { get; set; }
    public string PeriodDescription { get; set; } = string.Empty;
}
