using System;
using System.Collections.Generic;

namespace HMS.DTOs;

public class DashboardSummaryDto
{
    public string Department { get; set; } = "Dine";
    public decimal TodayTotalSales { get; set; }
    public decimal TotalSales => TodayTotalSales;
    public int TodaySettledBills { get; set; }
    public int SettledBillsCount => TodaySettledBills;
    public decimal TodayCashSales { get; set; }
    public decimal TodayUpiSales { get; set; }
    public decimal AverageOrderValue { get; set; }
    public decimal TodayTakeawaySales { get; set; }
    public int TodayTakeawayOrdersCount { get; set; }
    public int TakeawayNewCount { get; set; }
    public int TakeawayPreparingCount { get; set; }
    public int TakeawayReadyCount { get; set; }
    public int TakeawayCompletedCount { get; set; }
    public int KitchenActiveKotCount { get; set; }
    public int ActiveKotCount => KitchenActiveKotCount;
    public int TablesCurrentlyCooking { get; set; }
    public int TablesCookingCount => TablesCurrentlyCooking;
    public int TotalDiningTables { get; set; }
    public int TotalTables => TotalDiningTables;
    public int OccupiedTables { get; set; }
    public int OccupiedTablesCount => OccupiedTables;
    public int TotalSeatingCapacity { get; set; }
    public int TotalChairs => TotalSeatingCapacity;
    public int OccupiedSeats { get; set; }
    public int OccupiedChairs => OccupiedSeats;
    public int TotalTrackedInventory { get; set; }
    public int TotalInventoryItems => TotalTrackedInventory;
    public int LowStockInventoryCount { get; set; }
    public int LowStockCount => LowStockInventoryCount;
    public int OutOfStockInventoryCount { get; set; }
    public int ActiveMenuDishCount { get; set; }
    public int ActiveDishCount => ActiveMenuDishCount;
    public int VegMenuItemCount { get; set; }
    public int VegCount => VegMenuItemCount;
    public int NonVegMenuItemCount { get; set; }
    public int NonVegCount => NonVegMenuItemCount;
}

public class SalesPerformanceDto
{
    public string Period { get; set; } = "7d";
    public string Department { get; set; } = "Dine";
    public decimal TotalRevenue { get; set; }
    public int TotalSettledBills { get; set; }
    public decimal DailyAverageRevenue { get; set; }
    public decimal PreviousPeriodRevenue { get; set; }
    public decimal? GrowthPercentage { get; set; }
    public List<SalesDayBreakdownDto> DailyBreakdown { get; set; } = new();
    public List<SalesDayBreakdownDto> SalesSeries => DailyBreakdown;
}

public class SalesDayBreakdownDto
{
    public string Key { get; set; } = string.Empty;
    public string Date { get; set; } = string.Empty;
    public string Day { get; set; } = string.Empty;
    public string Label { get; set; } = string.Empty;
    public string AccessibleDate { get; set; } = string.Empty;
    public decimal Revenue { get; set; }
    public int BillsCount { get; set; }
    public int Count => BillsCount;
    public decimal CashRevenue { get; set; }
    public decimal UpiRevenue { get; set; }
}

public class DashboardTableDto
{
    public long TableId { get; set; }
    public string TableNumber { get; set; } = string.Empty;
    public string TableName { get; set; } = string.Empty;
    public string Floor { get; set; } = "Main Hall";
    public string Area => Floor;
    public string OccupancyStatus { get; set; } = "Vacant";
    public string Status => OccupancyStatus;
    public bool IsOccupied { get; set; }
    public int GuestCount { get; set; }
    public int Guests => GuestCount;
    public int Capacity { get; set; } = 4;
    public int Chairs => Capacity;
    public string AssignedStaff { get; set; } = "Unassigned";
    public string Server => AssignedStaff;
    public DashboardTableOrderDto? CurrentOrder { get; set; }
}

public class DashboardTableOrderDto
{
    public long OrderId { get; set; }
    public string OrderNumber { get; set; } = string.Empty;
    public decimal TotalAmount { get; set; }
    public int ItemCount { get; set; }
    public int ActiveKotCount { get; set; }
    public DateTime? OrderTime { get; set; }
}

public class SignatureDishDto
{
    public long MenuItemId { get; set; }
    public long Id => MenuItemId;
    public string DishName { get; set; } = string.Empty;
    public string Name => DishName;
    public string? Description { get; set; }
    public string Category { get; set; } = string.Empty;
    public string DietaryType { get; set; } = "Non-Veg";
    public bool IsVeg { get; set; }
    public decimal SellingPrice { get; set; }
    public decimal Price => SellingPrice;
    public int PrepTimeMinutes { get; set; } = 15;
    public string PrepTime => $"{PrepTimeMinutes} mins";
    public int IngredientCount { get; set; } = 4;
    public string? ImageUrl { get; set; }
    public bool IsChefsSpecial { get; set; }
    public bool IsAvailable { get; set; } = true;
    public string Status => IsAvailable ? "Available" : "Out of Stock";
}

public class RecentInvoiceDto
{
    public long InvoiceId { get; set; }
    public long Id => InvoiceId;
    public string InvoiceNumber { get; set; } = string.Empty;
    public long OrderId { get; set; }
    public string OrderType { get; set; } = "DineIn";
    public string? CustomerName { get; set; }
    public string? CustomerPhone { get; set; }
    public string TableOrSource { get; set; } = string.Empty;
    public string TableName => TableOrSource;
    public int ItemCount { get; set; }
    public string PaymentMode { get; set; } = "CASH";
    public decimal TotalAmount { get; set; }
    public decimal Total => TotalAmount;
    public string PaymentStatus { get; set; } = "paid";
    public string Status => PaymentStatus;
    public DateTime InvoiceDate { get; set; }
    public string FormattedDate => InvoiceDate.ToString("yyyy-MM-dd HH:mm");
}

public class RecentInvoicesResponseDto
{
    public int TotalSettledCount { get; set; }
    public List<RecentInvoiceDto> Invoices { get; set; } = new();
}

public class KitchenStatusDto
{
    public int ActiveKotCount { get; set; }
    public int TablesCurrentlyCooking { get; set; }
    public int PendingKotCount { get; set; }
    public int PreparingKotCount { get; set; }
    public int ReadyKotCount { get; set; }
    public List<KitchenTicketSummaryDto> ActiveTickets { get; set; } = new();
}

public class KitchenTicketSummaryDto
{
    public long TicketId { get; set; }
    public string TicketNumber { get; set; } = string.Empty;
    public long OrderId { get; set; }
    public string TableNumber { get; set; } = string.Empty;
    public string Status { get; set; } = "Queued";
    public int ItemCount { get; set; }
    public List<string> Items { get; set; } = new();
    public DateTime CreatedAt { get; set; }
    public int ElapsedMinutes => Math.Max(0, (int)(DateTime.UtcNow - CreatedAt).TotalMinutes);
}

public class InventoryHealthDto
{
    public string Department { get; set; } = "Dine";
    public int TotalTrackedItems { get; set; }
    public int AvailableStockItems { get; set; }
    public int LowStockItems { get; set; }
    public int OutOfStockItems { get; set; }
    public decimal TotalInventoryValuation { get; set; }
    public List<InventoryHealthItemDto> Items { get; set; } = new();
}

public class InventoryHealthItemDto
{
    public long IngredientId { get; set; }
    public long Id => IngredientId;
    public string Name { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public string Unit { get; set; } = "KG";
    public decimal CurrentStock { get; set; }
    public decimal Stock => CurrentStock;
    public decimal MinimumThreshold { get; set; }
    public decimal MinThreshold => MinimumThreshold;
    public decimal UnitCost { get; set; }
    public string Status { get; set; } = "Adequate";
    public decimal ReorderSuggestedQuantity { get; set; }
}

public class DashboardTakeawayOrdersResponseDto
{
    public DashboardTakeawaySummaryDto Summary { get; set; } = new();
    public int TotalCount { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 50;
    public List<DashboardTakeawayOrderDto> Orders { get; set; } = new();
}

public class DashboardTakeawaySummaryDto
{
    public decimal TotalTakeawaySales { get; set; }
    public decimal TodayTakeawaySales { get; set; }
    public decimal PaidTakeawaySales { get; set; }
    public decimal PendingTakeawaySales { get; set; }
    public int TotalOrdersCount { get; set; }
    public int NewCount { get; set; }
    public int PreparingCount { get; set; }
    public int ReadyCount { get; set; }
    public int PickedUpCount { get; set; }
    public int CompletedCount { get; set; }
    public int CancelledCount { get; set; }
}

public class DashboardTakeawayOrderDto
{
    public long OrderId { get; set; }
    public string OrderNumber { get; set; } = string.Empty;
    public string OrderType { get; set; } = "Takeaway";
    public string OrderStatus { get; set; } = "Settled";
    public string FulfillmentStatus { get; set; } = "New";
    public long? CustomerId { get; set; }
    public string CustomerName { get; set; } = "Walk-in / Online Customer";
    public string? CustomerPhone { get; set; }
    public string? CustomerEmail { get; set; }
    public int ItemCount { get; set; }
    public List<DashboardTakeawayOrderItemDto> Items { get; set; } = new();
    public decimal Subtotal { get; set; }
    public decimal DiscountAmount { get; set; }
    public decimal TaxAmount { get; set; }
    public decimal PackagingCharge { get; set; }
    public decimal TotalAmount { get; set; }
    public decimal PaidAmount { get; set; }
    public string PaymentStatus { get; set; } = "Paid";
    public string PaymentMethod { get; set; } = "Cash";
    public string? TransactionReference { get; set; }
    public string? GatewayProvider { get; set; }
    public long? InvoiceId { get; set; }
    public string? InvoiceNumber { get; set; }
    public string? KitchenKotNumber { get; set; }
    public string? BarBotNumber { get; set; }
    public string? SpecialInstructions { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}

public class DashboardTakeawayOrderItemDto
{
    public long OrderItemId { get; set; }
    public long MenuItemId { get; set; }
    public string Name { get; set; } = string.Empty;
    public int Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal TotalPrice { get; set; }
    public string Department { get; set; } = "Kitchen";
    public string KotStatus { get; set; } = "Queued";
    public string? Notes { get; set; }
}
