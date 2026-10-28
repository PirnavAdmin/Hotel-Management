using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace HMS.DTOs;

#region Screen 1: Bar Overview & KPIs

public class BarOverviewDto
{
    public int TotalDrinks { get; set; }
    public int ActiveBarOrders { get; set; }
    public int PendingOrders { get; set; }
    public int PreparingDrinks { get; set; }
    public int ReadyToServe { get; set; }
    public decimal CompletedDrinkSales { get; set; }
    public string FormattedCompletedSales => $"₹{CompletedDrinkSales:N2}";
    public List<BarRecentOrderDto> RecentOrders { get; set; } = new();
    public DateTime ServerTimeUtc { get; set; } = DateTime.UtcNow;
    public string ServerTimeFormatted { get; set; } = DateTime.Now.ToString("hh:mm:ss tt");
}

public class BarRecentOrderDto
{
    public long OrderId { get; set; }
    public string OrderNumber { get; set; } = string.Empty;
    public long? TableId { get; set; }
    public string Table { get; set; } = string.Empty;
    public string DrinkItems { get; set; } = string.Empty;
    public int Quantity { get; set; }
    public decimal Amount { get; set; }
    public string FormattedAmount => $"₹{Amount:N2}";
    public string Time { get; set; } = string.Empty;
    public string Status { get; set; } = "Pending"; // "Pending", "Preparing", "Ready", "Served", "Completed"
    public List<BarOrderItemDto> Items { get; set; } = new();
}

public class BarOrderItemDto
{
    public long OrderItemId { get; set; }
    public long OrderId { get; set; }
    public long? MenuItemId { get; set; }
    public string DishName { get; set; } = string.Empty;
    public int Quantity { get; set; }
    public decimal Price { get; set; }
    public string ItemStatus { get; set; } = "PENDING";
    public string? ServingMeasure { get; set; }
}

#endregion

#region Screen 2 & 3: Drinks Menu, Add Drink & Filter Dropdowns

public class BarDrinkDto
{
    public long MenuItemId { get; set; }
    public long Id => MenuItemId;
    public string DrinkName { get; set; } = string.Empty;
    public string Name => DrinkName;
    public string Category { get; set; } = string.Empty;
    public string ServingMeasure { get; set; } = "—";
    public decimal Price { get; set; }
    public decimal SellingPrice => Price;
    public string FormattedPrice => $"₹{Price:N2}";
    public bool IsAvailable { get; set; } = true;
    public string Availability => IsAvailable ? "Available" : "Unavailable";
    public string DrinkType { get; set; } = "Non-Alcoholic"; // "Alcoholic", "Non-Alcoholic"
    public decimal AlcoholContent { get; set; } = 0.00m;
    public string Abv => $"{AlcoholContent:G}%";
    public string? Description { get; set; }
    public string? ImageUrl { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class CreateBarDrinkDto
{
    [Required(ErrorMessage = "Drink name is required.")]
    [MaxLength(100)]
    public string DrinkName { get; set; } = string.Empty;

    [Required(ErrorMessage = "Category is required.")]
    [MaxLength(100)]
    public string Category { get; set; } = "Cocktails";

    [MaxLength(30)]
    public string DrinkType { get; set; } = "Alcoholic"; // "Alcoholic", "Non-Alcoholic"

    [Range(0, 100)]
    public decimal? AlcoholContent { get; set; } = 0;

    [MaxLength(50)]
    public string? ServingMeasure { get; set; } = "60 ml (Double Peg)";

    [Required(ErrorMessage = "Selling price is required.")]
    [Range(0.01, 1000000, ErrorMessage = "Price must be greater than zero.")]
    public decimal SellingPrice { get; set; }

    public bool? IsAvailable { get; set; } = true;

    public string? Availability { get; set; } // "Available" / "Unavailable"

    [MaxLength(500)]
    public string? Description { get; set; }

    [MaxLength(500)]
    public string? ImageUrl { get; set; }
}

public class UpdateBarDrinkDto
{
    [MaxLength(100)]
    public string? DrinkName { get; set; }

    [MaxLength(100)]
    public string? Category { get; set; }

    [MaxLength(30)]
    public string? DrinkType { get; set; }

    [Range(0, 100)]
    public decimal? AlcoholContent { get; set; }

    [MaxLength(50)]
    public string? ServingMeasure { get; set; }

    [Range(0.01, 1000000)]
    public decimal? SellingPrice { get; set; }

    public bool? IsAvailable { get; set; }

    public string? Availability { get; set; }

    [MaxLength(500)]
    public string? Description { get; set; }

    [MaxLength(500)]
    public string? ImageUrl { get; set; }
}

public class ToggleAvailabilityDto
{
    public bool? IsAvailable { get; set; }
}

#endregion

#region Screen 4 & 5: Bar Tables & Add Table

public class BarTableDto
{
    public long TableId { get; set; }
    public long Id => TableId;
    public string TableNumber { get; set; } = string.Empty;
    public string TableName { get; set; } = string.Empty;
    public string Area { get; set; } = "Main Hall";
    public string SectionArea => Area;
    public int Chairs { get; set; } = 4;
    public int Capacity => Chairs;
    public long? AssignedServerId { get; set; }
    public string AssignedServer { get; set; } = "Unassigned";
    public string Status { get; set; } = "Available"; // "Available", "Occupied", "Reserved", "Billed"
    public int Guests { get; set; } = 0;
    public long? CurrentOrderId { get; set; }
    public string? CurrentOrderNumber { get; set; }
    public int CurrentOrderItemsCount { get; set; } = 0;
    public string CurrentOrderLabel => $"View Items ({CurrentOrderItemsCount})";
    public decimal OrderAmount { get; set; } = 0.00m;
    public string FormattedOrderAmount => $"₹{OrderAmount:N2}";
    public List<BarOrderItemDto> OrderItems { get; set; } = new();
}

public class CreateBarTableDto
{
    [Required(ErrorMessage = "Table number is required.")]
    [MaxLength(50)]
    public string TableNumber { get; set; } = string.Empty;

    [Required(ErrorMessage = "Area / Section is required.")]
    [MaxLength(50)]
    public string SectionArea { get; set; } = "Main Hall";

    public string? Area { get; set; }

    [Range(1, 100, ErrorMessage = "Seating capacity must be at least 1.")]
    public int SeatingCapacity { get; set; } = 4;

    public int? Chairs { get; set; }

    public int? CurrentGuests { get; set; } = 0;

    public string? OccupancyStatus { get; set; } = "Available";

    public string? Status { get; set; }

    public long? AssignedServerId { get; set; }

    public string? AssignedServer { get; set; }
}

public class UpdateBarTableDto
{
    [MaxLength(50)]
    public string? TableNumber { get; set; }

    [MaxLength(50)]
    public string? SectionArea { get; set; }

    public string? Area { get; set; }

    [Range(1, 100)]
    public int? SeatingCapacity { get; set; }

    public int? Chairs { get; set; }

    public int? CurrentGuests { get; set; }

    public string? OccupancyStatus { get; set; }

    public string? Status { get; set; }

    public long? AssignedServerId { get; set; }

    public string? AssignedServer { get; set; }
}

public class UpdateBarTableStatusDto
{
    [Required]
    public string Status { get; set; } = "Available"; // "Available", "Occupied", "Reserved", "Billed"

    public int? CurrentGuests { get; set; }
}

#endregion

#region Screen 6 & 7: Bar Staff & Persons & Add Staff Member (Images 4 & 5)

public class BarStaffDto
{
    public long StaffId { get; set; }
    public long Id => StaffId;
    public string FullName { get; set; } = string.Empty;
    public string JobTitle { get; set; } = string.Empty; // "Senior Captain", "Head Waiter", "Stewardess", "Server / Waiter"
    public string Phone { get; set; } = string.Empty;
    public string Shift { get; set; } = string.Empty; // "Morning Shift (10 AM - 4 PM)", "Evening Shift (5 PM - 11 PM)", "Full Day (11 AM - 11 PM)"
    public string BarArea { get; set; } = "—"; // e.g. "VIP Lounge, Main Hall" or "—"
    public string AssignedTables { get; set; } = "—"; // e.g. "Table-1, Table-2" or "—"
    public List<long> AssignedTableIds { get; set; } = new();
    public List<AssignableTableDto> AssignedTableDetails { get; set; } = new();
    public string Status { get; set; } = "active"; // "active", "inactive"
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class CreateBarStaffDto
{
    [Required(ErrorMessage = "Full Name is required.")]
    [MaxLength(100)]
    public string FullName { get; set; } = string.Empty;

    [Required(ErrorMessage = "Job Title is required.")]
    [MaxLength(50)]
    public string JobTitle { get; set; } = string.Empty;

    [Required(ErrorMessage = "Phone / Contact is required.")]
    [MaxLength(20)]
    public string Phone { get; set; } = string.Empty;

    [Required(ErrorMessage = "Shift is required.")]
    [MaxLength(50)]
    public string Shift { get; set; } = string.Empty;

    /// <summary>
    /// List of table IDs selected in the 'Assigned Tables' checklist box.
    /// </summary>
    public List<long>? AssignedTableIds { get; set; } = new();

    /// <summary>
    /// Optional list of table numbers or table strings (e.g. "Table-1", "Table-2").
    /// </summary>
    public List<string>? AssignedTables { get; set; } = new();

    public bool? IsActive { get; set; } = true;
}

public class UpdateBarStaffDto
{
    [MaxLength(100)]
    public string? FullName { get; set; }

    [MaxLength(50)]
    public string? JobTitle { get; set; }

    [MaxLength(20)]
    public string? Phone { get; set; }

    [MaxLength(50)]
    public string? Shift { get; set; }

    public List<long>? AssignedTableIds { get; set; }

    public List<string>? AssignedTables { get; set; }

    public bool? IsActive { get; set; }
}

public class AssignableTableDto
{
    public long TableId { get; set; }
    public string TableNumber { get; set; } = string.Empty;
    public string Area { get; set; } = "Main Hall";
    public string Label => $"{TableNumber} • {Area}"; // e.g. "Table-1 • VIP Lounge"
    public bool IsCurrentlyAssigned { get; set; } = false;
    public long? AssignedStaffId { get; set; }
    public string? AssignedStaffName { get; set; }
}

public class BarStaffFilterOptionsDto
{
    public List<string> Roles { get; set; } = new();
    public List<string> Shifts { get; set; } = new();
    public List<string> TableAssignments { get; set; } = new();
    public List<AssignableTableDto> AvailableTables { get; set; } = new();
}

#endregion

#region Screen 8: Bar KOT (Image 4)

public class BarKotTicketDto
{
    public long KotId { get; set; }
    public string KotNumber { get; set; } = string.Empty;
    public long OrderId { get; set; }
    public string OrderNumber { get; set; } = string.Empty;
    public long? TableId { get; set; }
    public string TableNumber { get; set; } = string.Empty;
    public string TableName { get; set; } = string.Empty;
    public string Area { get; set; } = "Main Hall";
    public string TableLabel => !string.IsNullOrWhiteSpace(TableNumber) ? TableNumber : (!string.IsNullOrWhiteSpace(TableName) ? TableName : "Bar Counter");
    public string ServerName { get; set; } = "Unassigned";
    public string Status { get; set; } = "queued"; // "queued", "preparing", "ready", "served", "cancelled"
    public string StatusFormatted => char.ToUpper(Status[0]) + Status.Substring(1).ToLower();
    public string Priority { get; set; } = "normal"; // "normal", "high", "urgent"
    public string? SpecialNotes { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? CompletedAt { get; set; }
    public string ElapsedTime { get; set; } = string.Empty;
    public int TotalItemsCount { get; set; }
    public int DrinksCount { get; set; }
    public List<BarKotItemDto> Items { get; set; } = new();
}

public class BarKotItemDto
{
    public long OrderItemId { get; set; }
    public long OrderId { get; set; }
    public long? KotId { get; set; }
    public long MenuItemId { get; set; }
    public string DishName { get; set; } = string.Empty;
    public string DrinkName => DishName;
    public string Category { get; set; } = "Cocktails";
    public string? ServingMeasure { get; set; }
    public int Quantity { get; set; } = 1;
    public string Status { get; set; } = "queued"; // "queued", "cooking", "ready", "served", "cancelled"
    public string StatusFormatted => char.ToUpper(Status[0]) + Status.Substring(1).ToLower();
    public string? SpecialNotes { get; set; }
    public string? PreparationNotes { get; set; }
    public bool IsBarItem { get; set; } = true;
}

public class BarKotSummaryDto
{
    public int ActiveTicketsCount { get; set; }
    public int QueuedTicketsCount { get; set; }
    public int PreparingTicketsCount { get; set; }
    public int ReadyTicketsCount { get; set; }
    public int ServedTodayCount { get; set; }
    public int TotalBeveragesToday { get; set; }
    public DateTime LastUpdatedAtUtc { get; set; } = DateTime.UtcNow;
}

public class BarKotFilterOptionsDto
{
    public List<string> Tables { get; set; } = new() { "All Tables" };
    public List<string> Statuses { get; set; } = new() { "All statuses", "Queued", "Preparing", "Ready", "Served", "Cancelled" };
}

public class BarKotScreenFeedDto
{
    public BarKotSummaryDto Summary { get; set; } = new();
    public List<BarKotTicketDto> Tickets { get; set; } = new();
    public BarKotFilterOptionsDto FilterOptions { get; set; } = new();
    public int TotalTickets => Tickets.Count;
    public DateTime ServerTimeUtc { get; set; } = DateTime.UtcNow;
}

public class UpdateBarKotStatusDto
{
    [Required]
    public string Status { get; set; } = "preparing"; // "queued", "preparing", "ready", "served", "cancelled"
}

public class UpdateBarKotItemStatusDto
{
    [Required]
    public string Status { get; set; } = "ready"; // "queued", "cooking", "ready", "served", "cancelled"
}

#endregion

#region Screen 9: Shared Inventory & Add Inventory Modal (Image 5)

public class BarInventoryItemDto
{
    public long ItemId { get; set; }
    public long Id => ItemId;
    public string? ItemCode { get; set; }
    public string ItemName { get; set; } = string.Empty;
    public string Name => ItemName;
    public string Category { get; set; } = "Wine";
    public string Unit { get; set; } = "Bottle";
    public decimal Stock { get; set; } = 0.00m;
    public decimal CurrentStock => Stock;
    public decimal Threshold { get; set; } = 5.00m;
    public decimal MinimumThreshold => Threshold;
    public decimal UnitCost { get; set; } = 0.00m;
    public decimal CostPerUnit => UnitCost;
    public decimal TotalValue => Math.Round(Stock * UnitCost, 2);
    public string FormattedTotalValue => $"₹{TotalValue:N2}";
    public string Status
    {
        get
        {
            if (Stock <= 0) return "Out of Stock";
            if (Stock <= Threshold) return "Low Stock";
            return "In Stock";
        }
    }
    public string? Supplier { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

public class CreateInventoryItemDto
{
    [Required(ErrorMessage = "Item Name is required.")]
    [MaxLength(100)]
    public string ItemName { get; set; } = string.Empty;

    public string? Name { set => ItemName = value ?? string.Empty; }

    [Required(ErrorMessage = "Category is required.")]
    [MaxLength(100)]
    public string Category { get; set; } = "Wine";

    [Required(ErrorMessage = "Unit is required.")]
    [MaxLength(50)]
    public string Unit { get; set; } = "Bottle";

    [Range(0, 10000000)]
    public decimal Stock { get; set; } = 0.00m;

    public decimal? CurrentStock { set { if (value.HasValue) Stock = value.Value; } }

    [Range(0, 100000)]
    public decimal Threshold { get; set; } = 5.00m;

    public decimal? MinThreshold { set { if (value.HasValue) Threshold = value.Value; } }
    public decimal? MinimumThreshold { set { if (value.HasValue) Threshold = value.Value; } }

    [Range(0, 10000000)]
    public decimal UnitCost { get; set; } = 0.00m;

    public decimal? CostPerUnit { set { if (value.HasValue) UnitCost = value.Value; } }

    [MaxLength(150)]
    public string? Supplier { get; set; } = "Local Supplier";
}

public class UpdateInventoryItemDto
{
    public string? ItemName { get; set; }
    public string? Name { set => ItemName = value; }
    public string? Category { get; set; }
    public string? Unit { get; set; }
    public decimal? Stock { get; set; }
    public decimal? CurrentStock { set => Stock = value; }
    public decimal? Threshold { get; set; }
    public decimal? MinThreshold { set => Threshold = value; }
    public decimal? MinimumThreshold { set => Threshold = value; }
    public decimal? UnitCost { get; set; }
    public decimal? CostPerUnit { set => UnitCost = value; }
    public string? Supplier { get; set; }
}

public class AdjustInventoryStockDto
{
    [Required]
    public decimal QuantityChange { get; set; }

    public decimal? Delta { set => QuantityChange = value ?? 0; }

    public string? Reason { get; set; } = "Manual Stock Adjustment";
}

public class ReceiveInventoryStockDto
{
    [Required]
    [Range(0.001, 10000000, ErrorMessage = "Quantity received must be greater than zero.")]
    public decimal QuantityReceived { get; set; }

    public decimal? Quantity { set => QuantityReceived = value ?? 0; }

    public decimal? UnitCost { get; set; }

    [MaxLength(150)]
    public string? Supplier { get; set; }

    [MaxLength(100)]
    public string? InvoiceRef { get; set; }

    [MaxLength(255)]
    public string? Notes { get; set; } = "Stock received into bar inventory";
}

public class BarInventorySummaryDto
{
    public int TotalItems { get; set; }
    public int InStockItems { get; set; }
    public int LowStockItems { get; set; }
    public int OutOfStockItems { get; set; }
    public decimal TotalInventoryValue { get; set; }
    public string FormattedTotalValue => $"₹{TotalInventoryValue:N2}";
}

public class BarInventoryScreenFeedDto
{
    public BarInventorySummaryDto Summary { get; set; } = new();
    public List<BarInventoryItemDto> Items { get; set; } = new();
    public List<string> Categories { get; set; } = new();
    public List<string> Units { get; set; } = new();
    public int TotalItems => Items.Count;
    public DateTime ServerTimeUtc { get; set; } = DateTime.UtcNow;
}

#endregion

#region Screen 10: Invoices & Billing Logs (Image 2)

public class BarInvoiceDto
{
    public long InvoiceId { get; set; }
    public string InvoiceNumber { get; set; } = string.Empty; // e.g. "INV-1000"
    public long OrderId { get; set; }
    public string OrderNumber { get; set; } = string.Empty;
    public long? TableId { get; set; }
    public string TableNumber { get; set; } = "Table-1";
    public string TableName { get; set; } = "Table 1";
    public string WaiterName { get; set; } = "Staff";
    public string TableAndWaiter => $"{TableNumber}\nWaiter: {WaiterName}";
    public DateTime InvoiceDate { get; set; } = DateTime.UtcNow;
    public string DateFormatted => InvoiceDate.ToString("M/d/yyyy");
    public string TimeFormatted => InvoiceDate.ToString("hh:mm tt");
    public string DateTimeFormatted => $"{DateFormatted}\n{TimeFormatted}";
    public int ItemsCount { get; set; }
    public string ItemsSummary { get; set; } = string.Empty; // e.g. "12 items\n..., Hyderabadi Chicken Dum Bir..."
    public List<BarInvoiceItemLineDto> Items { get; set; } = new();
    public string PaymentMode { get; set; } = "Cash"; // "Cash", "UPI", "Card"
    public decimal Subtotal { get; set; }
    public decimal TaxAmount { get; set; }
    public decimal DiscountAmount { get; set; }
    public decimal GrandTotal { get; set; }
    public string FormattedGrandTotal => $"₹{GrandTotal:N2}";
    public string Status { get; set; } = "PAID"; // "PAID", "SETTLED", "UNPAID", "VOID"
    public string? Notes { get; set; }
}

public class BarInvoiceItemLineDto
{
    public string ItemName { get; set; } = string.Empty;
    public int Quantity { get; set; } = 1;
    public decimal UnitPrice { get; set; }
    public decimal TotalPrice { get; set; }
    public bool IsBarItem { get; set; } = true;
}

public class BarInvoicesSummaryDto
{
    public int TotalInvoicesCount { get; set; }
    public decimal TotalRevenue { get; set; }
    public string FormattedTotalRevenue => $"₹{TotalRevenue:N2}";
    public decimal CashCollected { get; set; }
    public string FormattedCashCollected => $"₹{CashCollected:N2}";
    public int CashInvoicesCount { get; set; }
    public decimal UpiCollected { get; set; }
    public string FormattedUpiCollected => $"₹{UpiCollected:N2}";
    public int UpiInvoicesCount { get; set; }
    public decimal CardCollected { get; set; }
    public string FormattedCardCollected => $"₹{CardCollected:N2}";
    public int CardInvoicesCount { get; set; }
    public DateTime ServerTimeUtc { get; set; } = DateTime.UtcNow;
}

public class BarInvoicesScreenFeedDto
{
    public BarInvoicesSummaryDto Summary { get; set; } = new();
    public List<BarInvoiceDto> Invoices { get; set; } = new();
    public List<string> DateOptions { get; set; } = new() { "All Dates", "Today", "Yesterday", "This Week", "This Month" };
    public List<string> PaymentModes { get; set; } = new() { "ALL PAYMENTS", "UPI", "CASH", "CARD" };
    public int TotalCount { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 6;
    public DateTime ServerTimeUtc { get; set; } = DateTime.UtcNow;
}

public class UpdateBarInvoiceDto
{
    public string? PaymentMode { get; set; }
    public string? Status { get; set; }
    public string? Notes { get; set; }
}

#endregion

#region Screen 11: Bar Reports (Image 3)

public class BarReportRowDto
{
    public string Report { get; set; } = string.Empty;
    public string Value { get; set; } = string.Empty;
    public decimal NumericValue { get; set; }
    public string Source { get; set; } = string.Empty;
}

public class BarReportsScreenDto
{
    public int ActiveBeverageOrders { get; set; }
    public int MenuBeverageItems { get; set; }
    public int BeverageInventoryRecords { get; set; }
    public decimal CompletedDrinkSales { get; set; }
    public string FormattedCompletedSales => $"₹{CompletedDrinkSales:N2}";
    public List<BarReportRowDto> Rows { get; set; } = new();
    public List<BarReportRowDto> KpiCards => Rows;
    public List<BarReportRowDto> TableRows => Rows;
    public string Title { get; set; } = "Bar Reports";
    public string Subtitle { get; set; } = "Independent Bar workspace • drink and order records are demo data.";
    public string Note { get; set; } = "Summary calculated from the shared menu, active orders, inventory, and loaded order history.";
    public string Badge { get; set; } = "DEMO DATA • SESSION ONLY";
    public DateTime GeneratedAt { get; set; } = DateTime.UtcNow;
    public string ServerTimeFormatted { get; set; } = DateTime.Now.ToString("hh:mm:ss tt");
}

#endregion

#region Unified Screen Feed (All Bar Screens Together)

public class BarScreenFeedDto
{
    public BarOverviewDto Overview { get; set; } = new();
    public List<BarDrinkDto> Drinks { get; set; } = new();
    public List<BarTableDto> Tables { get; set; } = new();
    public List<BarStaffDto> Staff { get; set; } = new();
    public BarKotSummaryDto KotSummary { get; set; } = new();
    public List<BarKotTicketDto> RecentKotTickets { get; set; } = new();
    public BarInventorySummaryDto InventorySummary { get; set; } = new();
    public BarInvoicesSummaryDto InvoicesSummary { get; set; } = new();
    public BarReportsScreenDto ReportsScreen { get; set; } = new();
    public List<string> Categories { get; set; } = new();
    public List<string> PriceRanges { get; set; } = new();
    public List<string> AvailabilityOptions { get; set; } = new() { "All", "Available", "Unavailable" };
    public List<string> Areas { get; set; } = new();
    public List<string> ServingMeasures { get; set; } = new();
    public BarStaffFilterOptionsDto StaffFilterOptions { get; set; } = new();
    public BarKotFilterOptionsDto KotFilterOptions { get; set; } = new();
    public List<string> InventoryCategories { get; set; } = new();
    public List<string> InventoryUnits { get; set; } = new();
    public DateTime ServerTimeUtc { get; set; } = DateTime.UtcNow;
    public string ServerTimeFormatted { get; set; } = DateTime.Now.ToString("hh:mm:ss tt");
}

#endregion

