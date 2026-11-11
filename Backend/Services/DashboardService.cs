using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Threading.Tasks;
using HMS.Data;
using HMS.DTOs;
using HMS.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace HMS.Services;

public class DashboardService
{
    private readonly AppDbContext _context;
    private readonly SpService _spService;
    private readonly ILogger<DashboardService> _logger;

    public DashboardService(
        AppDbContext context,
        SpService spService,
        ILogger<DashboardService> logger)
    {
        _context = context;
        _spService = spService;
        _logger = logger;
    }

    private static bool IsBarDepartment(string? department)
    {
        return !string.IsNullOrWhiteSpace(department) &&
               department.Trim().Equals("Bar", StringComparison.OrdinalIgnoreCase);
    }

    // ============================================================
    // API 1: DASHBOARD SUMMARY
    // ============================================================
    public async Task<DashboardSummaryDto> GetDashboardSummaryAsync(string? department)
    {
        bool isBar = IsBarDepartment(department);
        string deptName = isBar ? "Bar" : "Dine";
        _logger.LogInformation("Generating Dashboard Summary for department: {Dept}", deptName);

        var today = DateTime.Today;
        var tomorrow = today.AddDays(1);

        // 1. Sales & Settled Bills for Today
        var todayOrders = await _context.Orders
            .Include(o => o.Items)
            .Where(o => o.IsActive && !o.IsDeleted &&
                        o.CreatedAt >= today.AddHours(-4) && o.CreatedAt < tomorrow.AddHours(4) &&
                        (o.Status.ToLower() == "completed" || o.Status.ToLower() == "settled" || o.Status.ToLower() == "billed") &&
                        o.Status.ToLower() != "cancelled" &&
                        (o.FulfillmentStatus == null || o.FulfillmentStatus.ToLower() != "cancelled"))
            .ToListAsync();

        todayOrders = todayOrders.Where(o => o.CreatedAt.Date == today || o.CreatedAt.ToLocalTime().Date == today).ToList();

        var todayOrderIds = todayOrders.Select(o => o.Id).ToList();
        var latestTodayInvoicesByOrder = todayOrderIds.Count > 0
            ? (await _context.Invoices.AsNoTracking()
                .Where(i => todayOrderIds.Contains(i.OrderId))
                .ToListAsync())
                .GroupBy(i => i.OrderId)
                .ToDictionary(g => g.Key, g => g.OrderByDescending(x => x.InvoiceId).First())
            : new Dictionary<long, Invoice>();

        var todayInvoicesByOrder = latestTodayInvoicesByOrder
            .Where(kv => !kv.Value.Status.Equals("VOID", StringComparison.OrdinalIgnoreCase) &&
                         !kv.Value.Status.Equals("REFUNDED", StringComparison.OrdinalIgnoreCase) &&
                         !kv.Value.Status.Equals("CANCELLED", StringComparison.OrdinalIgnoreCase))
            .ToDictionary(kv => kv.Key, kv => kv.Value);

        decimal todaySales = 0m;
        int settledBillsCount = 0;
        decimal todayCashSales = 0m;
        decimal todayUpiSales = 0m;
        decimal todayTakeawaySales = 0m;
        int todayTakeawayOrdersCount = 0;

        foreach (var order in todayOrders)
        {
            if (latestTodayInvoicesByOrder.TryGetValue(order.Id, out var latestInv) &&
                (latestInv.Status.Equals("VOID", StringComparison.OrdinalIgnoreCase) ||
                 latestInv.Status.Equals("REFUNDED", StringComparison.OrdinalIgnoreCase) ||
                 latestInv.Status.Equals("CANCELLED", StringComparison.OrdinalIgnoreCase)))
            {
                continue;
            }

            var items = order.Items.Where(i => i.IsActive && !i.IsDeleted).ToList();
            bool isTakeawayOrder = string.Equals(order.OrderType, "Takeaway", StringComparison.OrdinalIgnoreCase);
            bool isOrderPaid = !string.Equals(order.PaymentStatus, "Pending", StringComparison.OrdinalIgnoreCase) &&
                               !string.Equals(order.PaymentStatus, "Failed", StringComparison.OrdinalIgnoreCase) &&
                               !string.Equals(order.PaymentStatus, "Refunded", StringComparison.OrdinalIgnoreCase) &&
                               !string.Equals(order.PaymentStatus, "Cancelled", StringComparison.OrdinalIgnoreCase);

            if (isBar)
            {
                var barItems = items.Where(i => i.BotId != null || DrinkCategoryHelper.IsDrinkCategory(i.Name)).ToList();
                if (barItems.Count > 0 && isOrderPaid)
                {
                    decimal barTotal = barItems.Sum(i => i.TotalPrice > 0 ? i.TotalPrice : i.Price * i.Quantity);
                    todaySales += barTotal;
                    settledBillsCount++;
                    if (isTakeawayOrder)
                    {
                        todayTakeawaySales += barTotal;
                        todayTakeawayOrdersCount++;
                    }
                }
            }
            else
            {
                var foodItems = items.Where(i => i.BotId == null && !DrinkCategoryHelper.IsDrinkCategory(i.Name)).ToList();
                if ((foodItems.Count > 0 || (isTakeawayOrder && items.Count > 0)) && isOrderPaid)
                {
                    decimal foodTotal = foodItems.Count > 0
                        ? foodItems.Sum(i => i.TotalPrice > 0 ? i.TotalPrice : i.Price * i.Quantity)
                        : (todayInvoicesByOrder.TryGetValue(order.Id, out var inv) && inv.TotalAmount > 0
                            ? inv.TotalAmount
                            : items.Sum(i => i.TotalPrice > 0 ? i.TotalPrice : i.Price * i.Quantity));

                    todaySales += foodTotal;
                    settledBillsCount++;
                    if (isTakeawayOrder)
                    {
                        decimal takeawayOrderTotal = todayInvoicesByOrder.TryGetValue(order.Id, out var tInv) && tInv.TotalAmount > 0
                            ? tInv.TotalAmount
                            : foodTotal;
                        todayTakeawaySales += takeawayOrderTotal;
                        todayTakeawayOrdersCount++;
                    }
                }
            }
        }

        // Query today's successful payments for real Cash / UPI / Digital breakdown (no mock ratios)
        try
        {
            var todayPayments = await _context.InvoicePayments
                .AsNoTracking()
                .Where(p => p.PaidAt >= today && p.PaidAt < tomorrow)
                .ToListAsync();

            var pInvIds = todayPayments.Select(p => p.InvoiceId).Distinct().ToList();
            var invalidPayInvoiceIds = pInvIds.Count > 0
                ? (await _context.Invoices.AsNoTracking()
                    .Where(i => pInvIds.Contains(i.InvoiceId) &&
                                (i.Status.ToLower() == "void" || i.Status.ToLower() == "refunded" || i.Status.ToLower() == "cancelled"))
                    .Select(i => i.InvoiceId)
                    .ToListAsync()).ToHashSet()
                : new HashSet<long>();

            foreach (var pay in todayPayments.Where(p => ReportingExportService.IsPaymentSuccessful(p) && !invalidPayInvoiceIds.Contains(p.InvoiceId)))
            {
                decimal amt = pay.AmountPaid > 0 ? pay.AmountPaid : pay.Amount;
                string mode = ReportingExportService.ResolveCanonicalPaymentMode(pay);
                if (mode == "CASH") todayCashSales += amt;
                else if (mode == "UPI" || mode == "CARD" || mode == "NETBANKING" || mode == "WALLET" || mode == "BANK") todayUpiSales += amt;
            }
        }
        catch { }

        decimal avgOrderValue = settledBillsCount > 0 ? Math.Round(todaySales / settledBillsCount, 2) : 0m;

        // Takeaway operational queue counts (all active/recent takeaway orders)
        var allTakeawayOrders = await _context.Orders
            .Include(o => o.Items)
            .AsNoTracking()
            .Where(o => o.IsActive && !o.IsDeleted && o.OrderType == "Takeaway")
            .ToListAsync();

        int takeawayNewCount = 0;
        int takeawayPreparingCount = 0;
        int takeawayReadyCount = 0;
        int takeawayCompletedCount = 0;

        foreach (var to in allTakeawayOrders)
        {
            var eff = TakeawayStatusSyncHelper.ResolveEffectiveFulfillmentStatus(to);
            switch (eff)
            {
                case "New":
                    takeawayNewCount++;
                    break;
                case "Preparing":
                    takeawayPreparingCount++;
                    break;
                case "Ready":
                    takeawayReadyCount++;
                    break;
                case "PickedUp":
                case "Completed":
                    takeawayCompletedCount++;
                    break;
            }
        }

        // 2. Kitchen / Bar KOT Status
        int activeKotCount = 0;
        int tablesCookingCount = 0;

        if (isBar)
        {
            var activeBotOrders = await _context.Orders
                .Include(o => o.Items)
                .Where(o => o.IsActive && !o.IsDeleted && o.Status.ToLower() != "completed" && o.Status.ToLower() != "cancelled")
                .ToListAsync();

            var cookingTables = new HashSet<long>();
            foreach (var ord in activeBotOrders)
            {
                var barCooking = ord.Items.Any(i => !i.IsDeleted && (i.BotId != null || DrinkCategoryHelper.IsDrinkCategory(i.Name)) &&
                    (i.KotStatus.ToLower() == "queued" || i.KotStatus.ToLower() == "pending" || i.KotStatus.ToLower().Contains("prepar") || i.KotStatus.ToLower().Contains("mix") || i.KotStatus.ToLower() == "cooking"));
                if (barCooking)
                {
                    activeKotCount++;
                    if (ord.TableId.HasValue && ord.TableId.Value > 0) cookingTables.Add(ord.TableId.Value);
                }
            }
            tablesCookingCount = cookingTables.Count;
        }
        else
        {
            var activeTickets = await _context.KitchenOrderTickets
                .Where(k => k.IsActive && !k.IsDeleted &&
                            k.Status.ToLower() != "served" &&
                            k.Status.ToLower() != "ready" &&
                            k.Status.ToLower() != "completed" &&
                            k.Status.ToLower() != "cancelled" &&
                            (k.KotNumber.StartsWith("KOT") || string.IsNullOrEmpty(k.KotNumber)))
                .ToListAsync();

            activeKotCount = activeTickets.Count;

            var activeOrders = await _context.Orders
                .Include(o => o.Items)
                .Where(o => o.IsActive && !o.IsDeleted && o.Status.ToLower() != "completed" && o.Status.ToLower() != "cancelled")
                .ToListAsync();

            var cookingTables = new HashSet<long>();
            foreach (var ord in activeOrders)
            {
                var hasCookingFood = ord.Items.Any(i => !i.IsDeleted && (i.KotId != null || !DrinkCategoryHelper.IsDrinkCategory(i.Name)) &&
                    (i.KotStatus.ToLower() == "queued" || i.KotStatus.ToLower() == "pending" || i.KotStatus.ToLower().Contains("prepar") || i.KotStatus.ToLower().Contains("cook")));
                if (hasCookingFood && ord.TableId.HasValue && ord.TableId.Value > 0)
                {
                    cookingTables.Add(ord.TableId.Value);
                }
            }
            tablesCookingCount = cookingTables.Count;
            if (activeKotCount == 0 && tablesCookingCount > 0) activeKotCount = tablesCookingCount;
        }

        // 3. Tables & Occupancy
        var allTables = await _context.RestaurantTables
            .Where(t => t.DeletedAt == null)
            .ToListAsync();

        List<RestaurantTable> deptTables;
        if (isBar)
        {
            deptTables = allTables.Where(t =>
                t.SectionArea.IndexOf("Bar", StringComparison.OrdinalIgnoreCase) >= 0 ||
                t.Location.IndexOf("Bar", StringComparison.OrdinalIgnoreCase) >= 0 ||
                t.SectionArea.IndexOf("Lounge", StringComparison.OrdinalIgnoreCase) >= 0).ToList();

            if (deptTables.Count == 0) deptTables = allTables;
        }
        else
        {
            deptTables = allTables;
        }

        int totalTables = deptTables.Count;
        int occupiedTables = deptTables.Count(t => t.Status.Equals("occupied", StringComparison.OrdinalIgnoreCase));
        int totalChairs = deptTables.Sum(t => t.CapacityChairs > 0 ? t.CapacityChairs : (t.Capacity > 0 ? t.Capacity : 4));
        int occupiedSeats = deptTables.Where(t => t.Status.Equals("occupied", StringComparison.OrdinalIgnoreCase))
            .Sum(t => t.OccupiedChairs > 0 ? t.OccupiedChairs : 2);

        // 4. Inventory Tracking & Low Stock
        var allIngredients = await _context.Ingredients
            .Where(i => i.IsActive)
            .ToListAsync();

        List<Ingredient> deptIngredients = isBar
            ? allIngredients.Where(i => DrinkCategoryHelper.IsDrinkCategory(i.Category)).ToList()
            : allIngredients.Where(i => !DrinkCategoryHelper.IsDrinkCategory(i.Category)).ToList();

        int totalTrackedInventory = deptIngredients.Count;
        int lowStockCount = deptIngredients.Count(i => i.CurrentStock <= i.MinimumThreshold && i.CurrentStock > 0);
        int outOfStockCount = deptIngredients.Count(i => i.CurrentStock <= 0);

        // 5. Menu Items Catalog
        var allMenuItems = await _context.MenuItems
            .Where(m => m.DeletedAt == null)
            .ToListAsync();

        List<MenuItem> deptMenuItems = isBar
            ? allMenuItems.Where(m => m.IsBarItem || DrinkCategoryHelper.IsDrinkCategory(m.Category, m.DrinkType, m.IsBarItem)).ToList()
            : allMenuItems.Where(m => !m.IsBarItem && !DrinkCategoryHelper.IsDrinkCategory(m.Category, m.DrinkType, m.IsBarItem)).ToList();

        int activeMenuDishCount = deptMenuItems.Count;
        int vegCount = deptMenuItems.Count(m => string.Equals(m.DietaryType, "Veg", StringComparison.OrdinalIgnoreCase));
        int nonVegCount = deptMenuItems.Count(m => !string.Equals(m.DietaryType, "Veg", StringComparison.OrdinalIgnoreCase));

        return new DashboardSummaryDto
        {
            Department = deptName,
            TodayTotalSales = todaySales,
            TodaySettledBills = settledBillsCount,
            TodayCashSales = todayCashSales,
            TodayUpiSales = todayUpiSales,
            AverageOrderValue = avgOrderValue,
            TodayTakeawaySales = Math.Round(todayTakeawaySales, 2),
            TodayTakeawayOrdersCount = todayTakeawayOrdersCount,
            TakeawayNewCount = takeawayNewCount,
            TakeawayPreparingCount = takeawayPreparingCount,
            TakeawayReadyCount = takeawayReadyCount,
            TakeawayCompletedCount = takeawayCompletedCount,
            KitchenActiveKotCount = activeKotCount,
            TablesCurrentlyCooking = tablesCookingCount,
            TotalDiningTables = totalTables,
            OccupiedTables = occupiedTables,
            TotalSeatingCapacity = totalChairs,
            OccupiedSeats = occupiedSeats,
            TotalTrackedInventory = totalTrackedInventory,
            LowStockInventoryCount = lowStockCount,
            OutOfStockInventoryCount = outOfStockCount,
            ActiveMenuDishCount = activeMenuDishCount,
            VegMenuItemCount = vegCount,
            NonVegMenuItemCount = nonVegCount
        };
    }

    // ============================================================
    // API 2: SALES PERFORMANCE (7d, 15d, 30d)
    // ============================================================
    public async Task<SalesPerformanceDto> GetSalesPerformanceAsync(string? period, string? department)
    {
        bool isBar = IsBarDepartment(department);
        string deptName = isBar ? "Bar" : "Dine";

        int days = 7;
        if (!string.IsNullOrWhiteSpace(period))
        {
            var pLower = period.Trim().ToLowerInvariant();
            if (pLower == "15d" || pLower == "15") days = 15;
            else if (pLower == "30d" || pLower == "30") days = 30;
        }

        var now = DateTime.Today;
        var startDate = now.AddDays(-(days - 1));
        var prevStartDate = startDate.AddDays(-days);

        var orders = await _context.Orders
            .Include(o => o.Items)
            .Where(o => o.IsActive && !o.IsDeleted &&
                        o.CreatedAt >= prevStartDate && o.CreatedAt < now.AddDays(1) &&
                        (o.Status.ToLower() == "completed" || o.Status.ToLower() == "settled" || o.Status.ToLower() == "billed") &&
                        o.Status.ToLower() != "cancelled" &&
                        (o.FulfillmentStatus == null || o.FulfillmentStatus.ToLower() != "cancelled"))
            .ToListAsync();

        var perfOrderIds = orders.Select(o => o.Id).Distinct().ToList();
        var invalidPerfOrderIds = perfOrderIds.Count > 0
            ? (await _context.Invoices.AsNoTracking()
                .Where(i => perfOrderIds.Contains(i.OrderId) &&
                            (i.Status.ToLower() == "void" || i.Status.ToLower() == "refunded" || i.Status.ToLower() == "cancelled"))
                .Select(i => i.OrderId)
                .ToListAsync()).ToHashSet()
            : new HashSet<long>();

        var paymentsInRange = await _context.InvoicePayments
            .AsNoTracking()
            .Where(p => p.PaidAt >= startDate && p.PaidAt < now.AddDays(1))
            .ToListAsync();

        var rangePayInvIds = paymentsInRange.Select(p => p.InvoiceId).Distinct().ToList();
        var invalidRangePayInvIds = rangePayInvIds.Count > 0
            ? (await _context.Invoices.AsNoTracking()
                .Where(i => rangePayInvIds.Contains(i.InvoiceId) &&
                            (i.Status.ToLower() == "void" || i.Status.ToLower() == "refunded" || i.Status.ToLower() == "cancelled"))
                .Select(i => i.InvoiceId)
                .ToListAsync()).ToHashSet()
            : new HashSet<long>();

        var dailyBreakdown = new List<SalesDayBreakdownDto>();
        decimal currentPeriodRevenue = 0m;
        int currentPeriodBills = 0;

        for (int i = 0; i < days; i++)
        {
            var date = startDate.AddDays(i);
            var dateKey = date.ToString("yyyy-MM-dd");

            var dayOrders = orders.Where(o => o.CreatedAt.Date == date || o.CreatedAt.ToLocalTime().Date == date).ToList();

            decimal dayRevenue = 0m;
            int dayBills = 0;

            foreach (var o in dayOrders)
            {
                if (invalidPerfOrderIds.Contains(o.Id) ||
                    string.Equals(o.PaymentStatus, "Pending", StringComparison.OrdinalIgnoreCase) ||
                    string.Equals(o.PaymentStatus, "Failed", StringComparison.OrdinalIgnoreCase) ||
                    string.Equals(o.PaymentStatus, "Refunded", StringComparison.OrdinalIgnoreCase) ||
                    string.Equals(o.PaymentStatus, "Cancelled", StringComparison.OrdinalIgnoreCase))
                {
                    continue;
                }

                var items = o.Items.Where(it => it.IsActive && !it.IsDeleted).ToList();
                decimal orderPart = 0m;

                if (isBar)
                {
                    var barItems = items.Where(it => it.BotId != null || DrinkCategoryHelper.IsDrinkCategory(it.Name)).ToList();
                    if (barItems.Count > 0)
                    {
                        orderPart = barItems.Sum(it => it.TotalPrice > 0 ? it.TotalPrice : it.Price * it.Quantity);
                        dayBills++;
                    }
                }
                else
                {
                    var foodItems = items.Where(it => it.BotId == null && !DrinkCategoryHelper.IsDrinkCategory(it.Name)).ToList();
                    if (foodItems.Count > 0)
                    {
                        orderPart = foodItems.Sum(it => it.TotalPrice > 0 ? it.TotalPrice : it.Price * it.Quantity);
                        dayBills++;
                    }
                }

                dayRevenue += orderPart;
            }

            var daySuccessfulPays = paymentsInRange
                .Where(p => (p.PaidAt.Date == date || p.PaidAt.ToLocalTime().Date == date) &&
                            ReportingExportService.IsPaymentSuccessful(p) &&
                            !invalidRangePayInvIds.Contains(p.InvoiceId))
                .ToList();

            decimal dayCash = daySuccessfulPays
                .Where(p => ReportingExportService.ResolveCanonicalPaymentMode(p) == "CASH")
                .Sum(p => p.AmountPaid > 0 ? p.AmountPaid : p.Amount);

            decimal dayUpi = daySuccessfulPays
                .Where(p => ReportingExportService.ResolveCanonicalPaymentMode(p) != "CASH")
                .Sum(p => p.AmountPaid > 0 ? p.AmountPaid : p.Amount);

            currentPeriodRevenue += dayRevenue;
            currentPeriodBills += dayBills;

            string label = days == 7
                ? date.ToString("ddd", CultureInfo.InvariantCulture)
                : (days == 15 || i % 5 == 0 || i == days - 1 ? date.Day.ToString() : "");

            dailyBreakdown.Add(new SalesDayBreakdownDto
            {
                Key = dateKey,
                Date = dateKey,
                Day = date.ToString("ddd", CultureInfo.InvariantCulture),
                Label = label,
                AccessibleDate = date.ToString("dd MMM", CultureInfo.InvariantCulture),
                Revenue = dayRevenue,
                BillsCount = dayBills,
                CashRevenue = dayCash,
                UpiRevenue = dayUpi
            });
        }

        decimal previousPeriodRevenue = 0m;
        for (int i = 0; i < days; i++)
        {
            var date = prevStartDate.AddDays(i);
            var dayOrders = orders.Where(o => o.CreatedAt.Date == date || o.CreatedAt.ToLocalTime().Date == date).ToList();

            foreach (var o in dayOrders)
            {
                if (invalidPerfOrderIds.Contains(o.Id) ||
                    string.Equals(o.PaymentStatus, "Pending", StringComparison.OrdinalIgnoreCase) ||
                    string.Equals(o.PaymentStatus, "Failed", StringComparison.OrdinalIgnoreCase) ||
                    string.Equals(o.PaymentStatus, "Refunded", StringComparison.OrdinalIgnoreCase) ||
                    string.Equals(o.PaymentStatus, "Cancelled", StringComparison.OrdinalIgnoreCase))
                {
                    continue;
                }

                var items = o.Items.Where(it => it.IsActive && !it.IsDeleted).ToList();
                if (isBar)
                {
                    var barItems = items.Where(it => it.BotId != null || DrinkCategoryHelper.IsDrinkCategory(it.Name)).ToList();
                    if (barItems.Count > 0)
                    {
                        previousPeriodRevenue += barItems.Sum(it => it.TotalPrice > 0 ? it.TotalPrice : it.Price * it.Quantity);
                    }
                }
                else
                {
                    var foodItems = items.Where(it => it.BotId == null && !DrinkCategoryHelper.IsDrinkCategory(it.Name)).ToList();
                    if (foodItems.Count > 0)
                    {
                        previousPeriodRevenue += foodItems.Sum(it => it.TotalPrice > 0 ? it.TotalPrice : it.Price * it.Quantity);
                    }
                }
            }
        }

        decimal dailyAvg = days > 0 ? Math.Round(currentPeriodRevenue / days, 2) : 0m;
        decimal? growthPercent = previousPeriodRevenue > 0
            ? Math.Round(((currentPeriodRevenue - previousPeriodRevenue) / previousPeriodRevenue) * 100m, 1)
            : (currentPeriodRevenue > 0 ? 100.0m : null);

        return new SalesPerformanceDto
        {
            Period = $"{days}d",
            Department = deptName,
            TotalRevenue = currentPeriodRevenue,
            TotalSettledBills = currentPeriodBills,
            DailyAverageRevenue = dailyAvg,
            PreviousPeriodRevenue = previousPeriodRevenue,
            GrowthPercentage = growthPercent,
            DailyBreakdown = dailyBreakdown
        };
    }

    // ============================================================
    // API 3: LIVE DINING TABLES GRID
    // ============================================================
    public async Task<List<DashboardTableDto>> GetLiveDiningTablesGridAsync(string? department = null)
    {
        bool isBar = IsBarDepartment(department);

        var tables = await _context.RestaurantTables
            .Include(t => t.AssignedServer)
            .Where(t => t.DeletedAt == null)
            .OrderBy(t => t.TableId)
            .ToListAsync();

        if (isBar)
        {
            var barFiltered = tables.Where(t =>
                t.SectionArea.IndexOf("Bar", StringComparison.OrdinalIgnoreCase) >= 0 ||
                t.Location.IndexOf("Bar", StringComparison.OrdinalIgnoreCase) >= 0 ||
                t.SectionArea.IndexOf("Lounge", StringComparison.OrdinalIgnoreCase) >= 0).ToList();

            if (barFiltered.Count > 0) tables = barFiltered;
        }

        var activeOrders = await _context.Orders
            .Include(o => o.Items)
            .Where(o => o.IsActive && !o.IsDeleted &&
                        o.Status.ToLower() != "completed" &&
                        o.Status.ToLower() != "cancelled" &&
                        o.TableId.HasValue && o.TableId.Value > 0)
            .ToListAsync();

        var tableOrderMap = activeOrders
            .GroupBy(o => o.TableId!.Value)
            .ToDictionary(g => g.Key, g => g.OrderByDescending(o => o.Id).First());

        var result = new List<DashboardTableDto>();

        foreach (var t in tables)
        {
            tableOrderMap.TryGetValue(t.TableId, out var activeOrder);
            bool isOccupied = t.Status.Equals("occupied", StringComparison.OrdinalIgnoreCase) ||
                              (activeOrder != null && activeOrder.Items.Any(i => !i.IsDeleted));

            DashboardTableOrderDto? orderDto = null;
            if (activeOrder != null)
            {
                var validItems = activeOrder.Items.Where(i => !i.IsDeleted).ToList();
                decimal total = validItems.Sum(i => i.TotalPrice > 0 ? i.TotalPrice : i.Price * i.Quantity);
                int activeKots = validItems.Count(i => i.KotStatus.ToLower() == "queued" || i.KotStatus.ToLower() == "pending" || i.KotStatus.ToLower().Contains("prepar"));

                orderDto = new DashboardTableOrderDto
                {
                    OrderId = activeOrder.Id,
                    OrderNumber = activeOrder.OrderNumber,
                    TotalAmount = total,
                    ItemCount = validItems.Count,
                    ActiveKotCount = activeKots,
                    OrderTime = activeOrder.CreatedAt
                };
            }

            string status = isOccupied ? "Occupied" : "Vacant";

            result.Add(new DashboardTableDto
            {
                TableId = t.TableId,
                TableNumber = !string.IsNullOrEmpty(t.TableNumber) ? t.TableNumber : $"Table-{t.TableId}",
                TableName = !string.IsNullOrEmpty(t.TableName) ? t.TableName : $"Table {t.TableId}",
                Floor = !string.IsNullOrEmpty(t.SectionArea) ? t.SectionArea : (!string.IsNullOrEmpty(t.Location) ? t.Location : "Main Hall"),
                OccupancyStatus = status,
                IsOccupied = isOccupied,
                GuestCount = isOccupied ? (t.OccupiedChairs > 0 ? t.OccupiedChairs : (activeOrder?.Guests ?? 2)) : 0,
                Capacity = t.CapacityChairs > 0 ? t.CapacityChairs : (t.Capacity > 0 ? t.Capacity : 4),
                AssignedStaff = t.AssignedServer?.FullName ?? "Unassigned",
                CurrentOrder = orderDto
            });
        }

        return result;
    }

    // ============================================================
    // API 4: SIGNATURE DISHES PREVIEW
    // ============================================================
    public async Task<List<SignatureDishDto>> GetSignatureDishesPreviewAsync(string? department = null, int limit = 10)
    {
        bool isBar = IsBarDepartment(department);

        var query = _context.MenuItems
            .Where(m => m.DeletedAt == null && m.IsAvailable);

        if (isBar)
        {
            query = query.Where(m => m.IsBarItem || m.DrinkType != null || m.AlcoholPct != null);
        }
        else
        {
            query = query.Where(m => !m.IsBarItem && m.DrinkType == null && m.AlcoholPct == null);
        }

        var dishes = await query
            .OrderByDescending(m => m.IsChefsSpecial ? 1 : 0)
            .ThenByDescending(m => m.Price)
            .Take(limit > 0 ? limit : 10)
            .ToListAsync();

        return dishes.Select(d =>
        {
            bool isVeg = string.Equals(d.DietaryType, "Veg", StringComparison.OrdinalIgnoreCase);

            return new SignatureDishDto
            {
                MenuItemId = d.MenuItemId,
                DishName = d.DishName,
                Description = d.ShortDescription,
                Category = d.Category,
                DietaryType = d.DietaryType ?? (isVeg ? "Veg" : "Non-Veg"),
                IsVeg = isVeg,
                SellingPrice = d.Price,
                PrepTimeMinutes = d.PrepTimeMinutes ?? 15,
                IngredientCount = 4,
                ImageUrl = d.ImageUrl,
                IsChefsSpecial = d.IsChefsSpecial,
                IsAvailable = d.IsAvailable
            };
        }).ToList();
    }

    // ============================================================
    // API 5: RECENT CUSTOMER BILLING INVOICES
    // ============================================================
    public async Task<RecentInvoicesResponseDto> GetRecentInvoicesAsync(int limit = 5, string? department = null)
    {
        int takeCount = limit > 0 && limit <= 50 ? limit : 5;

        var allInvoices = await _context.Invoices
            .OrderByDescending(i => i.CreatedAt)
            .Take(takeCount * 2)
            .ToListAsync();

        int totalSettledCount = await _context.Invoices
            .CountAsync(i => (i.Status.ToLower() == "paid" || (i.TotalAmount > 0 && i.PaidAmount >= i.TotalAmount)) &&
                             i.Status.ToLower() != "void" &&
                             i.Status.ToLower() != "refunded" &&
                             i.Status.ToLower() != "cancelled");

        var orderIds = allInvoices.Select(i => i.OrderId).Distinct().ToList();
        var orders = await _context.Orders
            .Include(o => o.Items)
            .Where(o => orderIds.Contains(o.Id))
            .ToListAsync();

        var orderMap = orders.ToDictionary(o => o.Id);

        var invoiceIds = allInvoices.Select(i => i.InvoiceId).Distinct().ToList();
        var payments = invoiceIds.Count > 0
            ? await _context.InvoicePayments
                .AsNoTracking()
                .Where(p => invoiceIds.Contains(p.InvoiceId))
                .OrderByDescending(p => p.PaidAt)
                .ToListAsync()
            : new List<InvoicePayment>();
        var paymentsByInvoice = payments.GroupBy(p => p.InvoiceId).ToDictionary(g => g.Key, g => g.ToList());

        var tableIds = orders.Where(o => o.TableId.HasValue).Select(o => o.TableId!.Value).Distinct().ToList();
        var tables = await _context.RestaurantTables
            .Where(t => tableIds.Contains(t.TableId))
            .ToDictionaryAsync(t => t.TableId, t => t.TableName);

        var resultList = new List<RecentInvoiceDto>();

        foreach (var inv in allInvoices)
        {
            orderMap.TryGetValue(inv.OrderId, out var ord);

            string tableName = "Takeaway / Direct";
            int itemCount = 1;

            if (ord != null)
            {
                if (string.Equals(ord.OrderType, "Takeaway", StringComparison.OrdinalIgnoreCase))
                {
                    tableName = !string.IsNullOrWhiteSpace(ord.CustomerName)
                        ? $"Takeaway ({ord.CustomerName})"
                        : "Takeaway";
                }
                else if (ord.TableId.HasValue && tables.TryGetValue(ord.TableId.Value, out var tName))
                {
                    tableName = tName;
                }
                else if (ord.TableId.HasValue && ord.TableId.Value > 0)
                {
                    tableName = $"Table {ord.TableId.Value}";
                }
                itemCount = ord.Items.Count(i => !i.IsDeleted);
                if (itemCount == 0) itemCount = 1;
            }

            string paymentMode = ord?.PaymentMethod?.ToUpperInvariant() ?? "CASH";
            if (paymentsByInvoice.TryGetValue(inv.InvoiceId, out var invPays) && invPays.Count > 0)
            {
                var successPay = invPays.FirstOrDefault(ReportingExportService.IsPaymentSuccessful) ?? invPays.First();
                paymentMode = ReportingExportService.ResolveCanonicalPaymentMode(successPay);
            }

            resultList.Add(new RecentInvoiceDto
            {
                InvoiceId = inv.InvoiceId,
                InvoiceNumber = !string.IsNullOrEmpty(inv.InvoiceNumber) ? inv.InvoiceNumber : $"INV-{inv.InvoiceId}",
                OrderId = inv.OrderId,
                OrderType = ord?.OrderType ?? "DineIn",
                CustomerName = ord?.CustomerName,
                CustomerPhone = ord?.CustomerPhone,
                TableOrSource = tableName,
                ItemCount = itemCount,
                PaymentMode = paymentMode,
                TotalAmount = inv.TotalAmount,
                PaymentStatus = inv.Status.ToLower(),
                InvoiceDate = inv.CreatedAt
            });

            if (resultList.Count >= takeCount) break;
        }

        return new RecentInvoicesResponseDto
        {
            TotalSettledCount = totalSettledCount > 0 ? totalSettledCount : resultList.Count,
            Invoices = resultList
        };
    }

    // ============================================================
    // API 6: KITCHEN KOT STATUS
    // ============================================================
    public async Task<KitchenStatusDto> GetKitchenStatusAsync(string? department = null)
    {
        bool isBar = IsBarDepartment(department);

        var activeOrders = await _context.Orders
            .Include(o => o.Items)
            .Where(o => o.IsActive && !o.IsDeleted &&
                        o.Status.ToLower() != "completed" &&
                        o.Status.ToLower() != "cancelled")
            .OrderByDescending(o => o.CreatedAt)
            .ToListAsync();

        var activeTickets = await _context.KitchenOrderTickets
            .Where(k => k.IsActive && !k.IsDeleted &&
                        k.Status.ToLower() != "served" &&
                        k.Status.ToLower() != "completed" &&
                        k.Status.ToLower() != "cancelled")
            .OrderByDescending(k => k.CreatedAt)
            .ToListAsync();

        if (isBar)
        {
            activeTickets = activeTickets.Where(k => k.KotNumber.StartsWith("BOT")).ToList();
        }
        else
        {
            activeTickets = activeTickets.Where(k => !k.KotNumber.StartsWith("BOT")).ToList();
        }

        var cookingTables = new HashSet<long>();
        int pendingCount = 0;
        int preparingCount = 0;
        int readyCount = 0;

        var ticketSummaries = new List<KitchenTicketSummaryDto>();

        foreach (var t in activeTickets)
        {
            var st = t.Status.ToLower();
            if (st == "queued" || st == "pending") pendingCount++;
            else if (st.Contains("prepar") || st.Contains("cook") || st.Contains("in preparation")) preparingCount++;
            else if (st == "ready" || st == "prepared") readyCount++;

            var ord = activeOrders.FirstOrDefault(o => o.Id == t.OrderId);
            string tableLabel = ord != null && ord.TableId.HasValue
                ? $"Table {ord.TableId.Value}"
                : (ord != null && string.Equals(ord.OrderType, "Takeaway", StringComparison.OrdinalIgnoreCase)
                    ? (!string.IsNullOrWhiteSpace(ord.CustomerName) ? $"Takeaway ({ord.OrderNumber} - {ord.CustomerName})" : $"Takeaway ({ord.OrderNumber})")
                    : "Takeaway");
            if (ord != null && ord.TableId.HasValue && ord.TableId.Value > 0)
            {
                cookingTables.Add(ord.TableId.Value);
            }

            var itemNames = ord != null
                ? ord.Items.Where(i => !i.IsDeleted && (t.KotNumber.StartsWith("BOT") ? (i.BotId != null || DrinkCategoryHelper.IsDrinkCategory(i.Name)) : (i.KotId != null || !DrinkCategoryHelper.IsDrinkCategory(i.Name))))
                           .Select(i => $"{i.Quantity}x {i.Name}")
                           .ToList()
                : new List<string>();

            ticketSummaries.Add(new KitchenTicketSummaryDto
            {
                TicketId = t.Id,
                TicketNumber = t.KotNumber,
                OrderId = t.OrderId,
                TableNumber = tableLabel,
                Status = t.Status,
                ItemCount = itemNames.Count > 0 ? itemNames.Count : 1,
                Items = itemNames,
                CreatedAt = t.CreatedAt
            });
        }

        return new KitchenStatusDto
        {
            ActiveKotCount = activeTickets.Count,
            TablesCurrentlyCooking = cookingTables.Count,
            PendingKotCount = pendingCount,
            PreparingKotCount = preparingCount,
            ReadyKotCount = readyCount,
            ActiveTickets = ticketSummaries
        };
    }

    // ============================================================
    // API 7: INVENTORY HEALTH
    // ============================================================
    public async Task<InventoryHealthDto> GetInventoryHealthAsync(string? department = null)
    {
        bool isBar = IsBarDepartment(department);
        string deptName = isBar ? "Bar" : "Dine";

        var allIngredients = await _context.Ingredients
            .Where(i => i.IsActive)
            .OrderBy(i => i.CurrentStock <= i.MinimumThreshold ? 0 : 1)
            .ThenBy(i => i.CurrentStock)
            .ToListAsync();

        List<Ingredient> deptIngredients = isBar
            ? allIngredients.Where(i => DrinkCategoryHelper.IsDrinkCategory(i.Category)).ToList()
            : allIngredients.Where(i => !DrinkCategoryHelper.IsDrinkCategory(i.Category)).ToList();

        int totalTracked = deptIngredients.Count;
        int lowStockCount = deptIngredients.Count(i => i.CurrentStock <= i.MinimumThreshold && i.CurrentStock > 0);
        int outOfStockCount = deptIngredients.Count(i => i.CurrentStock <= 0);
        int availableCount = deptIngredients.Count(i => i.CurrentStock > i.MinimumThreshold);

        decimal totalValuation = deptIngredients.Sum(i => i.CurrentStock * i.UnitCost);

        var itemsList = deptIngredients.Select(i =>
        {
            string status = i.CurrentStock <= 0 ? "Out of Stock" : (i.CurrentStock <= i.MinimumThreshold ? "Low Stock" : "Adequate");
            decimal suggestedQty = i.CurrentStock <= i.MinimumThreshold ? Math.Max(10, (i.MinimumThreshold * 2) - i.CurrentStock) : 0m;

            return new InventoryHealthItemDto
            {
                IngredientId = i.IngredientId,
                Name = i.Name,
                Category = i.Category,
                Unit = i.Unit,
                CurrentStock = i.CurrentStock,
                MinimumThreshold = i.MinimumThreshold,
                UnitCost = i.UnitCost,
                Status = status,
                ReorderSuggestedQuantity = suggestedQty
            };
        }).ToList();

        return new InventoryHealthDto
        {
            Department = deptName,
            TotalTrackedItems = totalTracked,
            AvailableStockItems = availableCount,
            LowStockItems = lowStockCount,
            OutOfStockItems = outOfStockCount,
            TotalInventoryValuation = Math.Round(totalValuation, 2),
            Items = itemsList
        };
    }

    // ============================================================
    // API 8: ADMIN DASHBOARD TAKEAWAY ORDERS FEED
    // ============================================================
    public async Task<DashboardTakeawayOrdersResponseDto> GetDashboardTakeawayOrdersAsync(
        string? status = null,
        string? paymentStatus = null,
        string? search = null,
        DateTime? fromDate = null,
        DateTime? toDate = null,
        int page = 1,
        int pageSize = 50)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 200);

        var query = _context.Orders
            .Include(o => o.Items)
            .AsNoTracking()
            .Where(o => !o.IsDeleted && o.OrderType == "Takeaway");

        if (fromDate.HasValue)
        {
            query = query.Where(o => o.CreatedAt >= fromDate.Value.Date);
        }
        if (toDate.HasValue)
        {
            var endOfDay = toDate.Value.Date.AddDays(1).AddTicks(-1);
            query = query.Where(o => o.CreatedAt <= endOfDay);
        }

        var allTakeaway = await query
            .OrderByDescending(o => o.CreatedAt)
            .ToListAsync();

        var orderIds = allTakeaway.Select(o => o.Id).ToList();
        var invoices = orderIds.Count > 0
            ? await _context.Invoices
                .AsNoTracking()
                .Where(i => orderIds.Contains(i.OrderId))
                .ToListAsync()
            : new List<Invoice>();
        var invoiceByOrder = invoices.GroupBy(i => i.OrderId).ToDictionary(g => g.Key, g => g.OrderByDescending(x => x.InvoiceId).First());

        var invoiceIds = invoices.Select(i => i.InvoiceId).Distinct().ToList();
        var payments = invoiceIds.Count > 0
            ? await _context.InvoicePayments
                .AsNoTracking()
                .Where(p => invoiceIds.Contains(p.InvoiceId))
                .OrderByDescending(p => p.PaidAt)
                .ToListAsync()
            : new List<InvoicePayment>();
        var paymentsByInvoice = payments.GroupBy(p => p.InvoiceId).ToDictionary(g => g.Key, g => g.ToList());

        var customerIds = allTakeaway.Where(o => o.CustomerId.HasValue && o.CustomerId.Value > 0).Select(o => o.CustomerId!.Value).Distinct().ToList();
        var customersById = customerIds.Count > 0
            ? await _context.Customers
                .AsNoTracking()
                .Where(c => customerIds.Contains(c.CustomerId))
                .ToDictionaryAsync(c => c.CustomerId)
            : new Dictionary<long, Customer>();

        var kots = orderIds.Count > 0
            ? await _context.KitchenOrderTickets
                .AsNoTracking()
                .Where(k => orderIds.Contains(k.OrderId) && k.IsActive && !k.IsDeleted)
                .OrderByDescending(k => k.CreatedAt)
                .ToListAsync()
            : new List<KitchenOrderTicket>();
        var kotByOrder = kots.GroupBy(k => k.OrderId).ToDictionary(g => g.Key, g => g.First().KotNumber);

        var botByOrder = new Dictionary<long, string>();
        if (orderIds.Count > 0)
        {
            try
            {
                var idList = string.Join(",", orderIds.Distinct());
                var botRows = await _spService.ExecuteSqlQueryAsync(
                    $"SELECT order_id, bot_number FROM bar_order_tickets WHERE order_id IN ({idList}) ORDER BY created_at DESC;",
                    r => new { OrderId = r.GetInt64(0), BotNumber = r.GetString(1) });
                foreach (var b in botRows)
                {
                    if (!botByOrder.ContainsKey(b.OrderId))
                    {
                        botByOrder[b.OrderId] = b.BotNumber;
                    }
                }
            }
            catch { }
        }

        var today = DateTime.Today;
        var summary = new DashboardTakeawaySummaryDto();
        var enrichedAll = new List<DashboardTakeawayOrderDto>();

        foreach (var ord in allTakeaway)
        {
            var activeItems = ord.Items.Where(i => i.IsActive && !i.IsDeleted).ToList();
            if (activeItems.Count == 0)
            {
                activeItems = ord.Items.Where(i => !i.IsDeleted).ToList();
            }

            invoiceByOrder.TryGetValue(ord.Id, out var inv);
            List<InvoicePayment>? invPays = null;
            if (inv != null) paymentsByInvoice.TryGetValue(inv.InvoiceId, out invPays);

            var latestSuccess = invPays?.FirstOrDefault(ReportingExportService.IsPaymentSuccessful);
            var latestPay = latestSuccess ?? invPays?.FirstOrDefault();

            string fulfillment = TakeawayStatusSyncHelper.ResolveEffectiveFulfillmentStatus(ord);
            bool isCancelledOrder = string.Equals(fulfillment, "Cancelled", StringComparison.OrdinalIgnoreCase) ||
                                    string.Equals(ord.Status, "Cancelled", StringComparison.OrdinalIgnoreCase);

            string resolvedPayStatus;
            if (inv != null && string.Equals(inv.Status, "REFUNDED", StringComparison.OrdinalIgnoreCase))
                resolvedPayStatus = "Refunded";
            else if (string.Equals(ord.PaymentStatus, "Refunded", StringComparison.OrdinalIgnoreCase))
                resolvedPayStatus = "Refunded";
            else if (inv != null && string.Equals(inv.Status, "VOID", StringComparison.OrdinalIgnoreCase))
                resolvedPayStatus = isCancelledOrder ? "Cancelled" : "Void";
            else if (inv != null && string.Equals(inv.Status, "PAID", StringComparison.OrdinalIgnoreCase))
                resolvedPayStatus = "Paid";
            else if (string.Equals(ord.PaymentStatus, "Paid", StringComparison.OrdinalIgnoreCase))
                resolvedPayStatus = "Paid";
            else if (latestPay != null && string.Equals(latestPay.PaymentStatus, "refunded", StringComparison.OrdinalIgnoreCase))
                resolvedPayStatus = "Refunded";
            else if (latestPay != null && string.Equals(latestPay.PaymentStatus, "failed", StringComparison.OrdinalIgnoreCase))
                resolvedPayStatus = "Failed";
            else if (string.Equals(ord.PaymentStatus, "Failed", StringComparison.OrdinalIgnoreCase))
                resolvedPayStatus = "Failed";
            else if (isCancelledOrder || string.Equals(ord.PaymentStatus, "Cancelled", StringComparison.OrdinalIgnoreCase))
                resolvedPayStatus = "Cancelled";
            else if (string.Equals(ord.Status, "Settled", StringComparison.OrdinalIgnoreCase) &&
                     !string.Equals(ord.PaymentStatus, "Pending", StringComparison.OrdinalIgnoreCase))
                resolvedPayStatus = "Paid";
            else
                resolvedPayStatus = "Pending";

            string resolvedPayMethod = latestPay?.PaymentMode ?? ord.PaymentMethod ?? "Cash";

            decimal itemSub = activeItems.Sum(i => i.TotalPrice > 0 ? i.TotalPrice : i.Price * i.Quantity);
            decimal subtotal = inv?.Subtotal > 0 ? inv.Subtotal : itemSub;
            decimal discount = inv?.DiscountAmount ?? 0m;
            decimal tax = inv?.TaxAmount ?? Math.Round(Math.Max(0m, subtotal - discount) * 0.05m, 2);
            decimal pkg = ord.PackagingCharge;
            decimal total = inv?.TotalAmount > 0 ? inv.TotalAmount : Math.Round(Math.Max(0m, subtotal - discount) + tax + pkg, 2);
            decimal paidAmt = inv?.PaidAmount > 0 ? inv.PaidAmount : (resolvedPayStatus == "Paid" ? total : 0m);

            Customer? linkedCust = (ord.CustomerId.HasValue && customersById.TryGetValue(ord.CustomerId.Value, out var cObj)) ? cObj : null;
            string custName = !string.IsNullOrWhiteSpace(ord.CustomerName)
                ? ord.CustomerName!
                : (linkedCust?.FullName ?? "Walk-in / Online Customer");
            string? custPhone = !string.IsNullOrWhiteSpace(ord.CustomerPhone) ? ord.CustomerPhone : linkedCust?.Phone;
            string? custEmail = !string.IsNullOrWhiteSpace(ord.CustomerEmail) ? ord.CustomerEmail : linkedCust?.Email;

            // Update summary KPIs across all takeaway orders in date window (exclude cancelled & refunded/void from sales totals)
            summary.TotalOrdersCount++;
            if (!isCancelledOrder)
            {
                if (resolvedPayStatus == "Paid")
                {
                    summary.TotalTakeawaySales += total;
                    summary.PaidTakeawaySales += paidAmt > 0 ? paidAmt : total;
                    if (ord.CreatedAt.Date == today || ord.CreatedAt.ToLocalTime().Date == today)
                    {
                        summary.TodayTakeawaySales += total;
                    }
                }
                else if (resolvedPayStatus == "Pending")
                {
                    summary.PendingTakeawaySales += total;
                }
            }

            switch (fulfillment)
            {
                case "New":
                    summary.NewCount++;
                    break;
                case "Preparing":
                    summary.PreparingCount++;
                    break;
                case "Ready":
                    summary.ReadyCount++;
                    break;
                case "PickedUp":
                    summary.PickedUpCount++;
                    summary.CompletedCount++;
                    break;
                case "Completed":
                    summary.CompletedCount++;
                    break;
                case "Cancelled":
                    summary.CancelledCount++;
                    break;
            }

            kotByOrder.TryGetValue(ord.Id, out var kotNum);
            botByOrder.TryGetValue(ord.Id, out var botNum);

            enrichedAll.Add(new DashboardTakeawayOrderDto
            {
                OrderId = ord.Id,
                OrderNumber = ord.OrderNumber,
                OrderType = "Takeaway",
                OrderStatus = ord.Status,
                FulfillmentStatus = fulfillment,
                CustomerId = ord.CustomerId,
                CustomerName = custName,
                CustomerPhone = custPhone,
                CustomerEmail = custEmail,
                ItemCount = activeItems.Count,
                Items = activeItems.Select(oi =>
                {
                    bool isBar = (oi.BotId.HasValue && oi.BotId.Value > 0) || OrderItemRouting.IsBarItem(false, null, null, oi.Name);
                    return new DashboardTakeawayOrderItemDto
                    {
                        OrderItemId = oi.Id,
                        MenuItemId = oi.MenuItemId,
                        Name = oi.Name,
                        Quantity = oi.Quantity,
                        UnitPrice = oi.Price,
                        TotalPrice = oi.TotalPrice > 0 ? oi.TotalPrice : oi.Price * oi.Quantity,
                        Department = isBar ? "Bar" : "Kitchen",
                        KotStatus = oi.KotStatus,
                        Notes = oi.Notes
                    };
                }).ToList(),
                Subtotal = subtotal,
                DiscountAmount = discount,
                TaxAmount = tax,
                PackagingCharge = pkg,
                TotalAmount = total,
                PaidAmount = paidAmt,
                PaymentStatus = resolvedPayStatus,
                PaymentMethod = resolvedPayMethod,
                TransactionReference = latestPay?.TransactionReference ?? latestPay?.TxnReference,
                GatewayProvider = latestPay?.GatewayProvider,
                InvoiceId = inv?.InvoiceId,
                InvoiceNumber = inv?.InvoiceNumber,
                KitchenKotNumber = kotNum,
                BarBotNumber = botNum,
                SpecialInstructions = ord.SpecialInstructions,
                CreatedAt = ord.CreatedAt,
                UpdatedAt = ord.UpdatedAt
            });
        }

        summary.TotalTakeawaySales = Math.Round(summary.TotalTakeawaySales, 2);
        summary.TodayTakeawaySales = Math.Round(summary.TodayTakeawaySales, 2);
        summary.PaidTakeawaySales = Math.Round(summary.PaidTakeawaySales, 2);
        summary.PendingTakeawaySales = Math.Round(summary.PendingTakeawaySales, 2);

        // Apply filters
        IEnumerable<DashboardTakeawayOrderDto> filtered = enrichedAll;

        if (!string.IsNullOrWhiteSpace(status) && !status.Equals("all", StringComparison.OrdinalIgnoreCase))
        {
            var stNorm = status.Trim().ToLowerInvariant().Replace("_", " ").Replace("-", " ");
            filtered = stNorm switch
            {
                "new" or "placed" => filtered.Where(o => o.FulfillmentStatus.Equals("New", StringComparison.OrdinalIgnoreCase)),
                "preparing" or "cooking" => filtered.Where(o => o.FulfillmentStatus.Equals("Preparing", StringComparison.OrdinalIgnoreCase)),
                "ready" or "ready for pickup" => filtered.Where(o => o.FulfillmentStatus.Equals("Ready", StringComparison.OrdinalIgnoreCase)),
                "picked up" or "pickedup" => filtered.Where(o => o.FulfillmentStatus.Equals("PickedUp", StringComparison.OrdinalIgnoreCase)),
                "completed" => filtered.Where(o => o.FulfillmentStatus.Equals("Completed", StringComparison.OrdinalIgnoreCase) || o.FulfillmentStatus.Equals("PickedUp", StringComparison.OrdinalIgnoreCase)),
                "cancelled" or "canceled" => filtered.Where(o => o.FulfillmentStatus.Equals("Cancelled", StringComparison.OrdinalIgnoreCase)),
                _ => filtered.Where(o => o.FulfillmentStatus.Equals(status.Trim(), StringComparison.OrdinalIgnoreCase) || o.OrderStatus.Equals(status.Trim(), StringComparison.OrdinalIgnoreCase))
            };
        }

        if (!string.IsNullOrWhiteSpace(paymentStatus) && !paymentStatus.Equals("all", StringComparison.OrdinalIgnoreCase))
        {
            var ps = paymentStatus.Trim();
            filtered = filtered.Where(o => o.PaymentStatus.Equals(ps, StringComparison.OrdinalIgnoreCase));
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var q = search.Trim().ToLowerInvariant();
            filtered = filtered.Where(o =>
                o.OrderId.ToString().Contains(q) ||
                o.OrderNumber.ToLowerInvariant().Contains(q) ||
                (o.InvoiceNumber != null && o.InvoiceNumber.ToLowerInvariant().Contains(q)) ||
                o.CustomerName.ToLowerInvariant().Contains(q) ||
                (o.CustomerPhone != null && o.CustomerPhone.ToLowerInvariant().Contains(q)) ||
                o.Items.Any(i => i.Name.ToLowerInvariant().Contains(q)));
        }

        var filteredList = filtered.ToList();
        int totalCount = filteredList.Count;
        var paged = filteredList
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToList();

        return new DashboardTakeawayOrdersResponseDto
        {
            Summary = summary,
            TotalCount = totalCount,
            Page = page,
            PageSize = pageSize,
            Orders = paged
        };
    }
}
