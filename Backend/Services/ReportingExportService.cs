using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using HMS.Data;
using HMS.DTOs;
using HMS.Models;
using Microsoft.EntityFrameworkCore;

namespace HMS.Services;

public class ReportingExportService
{
    private readonly AppDbContext _context;
    private readonly DashboardService _dashboardService;
    private readonly BarService _barService;
    private readonly SalaryService _salaryService;

    public ReportingExportService(
        AppDbContext context,
        DashboardService dashboardService,
        BarService barService,
        SalaryService salaryService)
    {
        _context = context;
        _dashboardService = dashboardService;
        _barService = barService;
        _salaryService = salaryService;
    }

    #region Internal Shared Enrichment Helpers

    private sealed class EnrichedInvoiceRow
    {
        public long InvoiceId { get; set; }
        public string InvoiceNumber { get; set; } = string.Empty;
        public long OrderId { get; set; }
        public string TableName { get; set; } = "Direct";
        public string ServerName { get; set; } = "Staff";
        public string PaymentMethod { get; set; } = "CASH";
        public decimal Subtotal { get; set; }
        public decimal TaxAmount { get; set; }
        public decimal DiscountAmount { get; set; }
        public decimal ServiceChargeAmount { get; set; }
        public decimal TotalAmount { get; set; }
        public decimal PaidAmount { get; set; }
        public string Status { get; set; } = "UNPAID";
        public bool IsPaid { get; set; }
        public DateTime CreatedAt { get; set; }
        public decimal DepartmentShare { get; set; } = 1m;
    }

    private sealed class EnrichedOrderRow
    {
        public long OrderId { get; set; }
        public string OrderNumber { get; set; } = string.Empty;
        public string OrderType { get; set; } = "DineIn";
        public long? TableId { get; set; }
        public string TableName { get; set; } = "Direct";
        public string ServerName { get; set; } = "Staff";
        public int Guests { get; set; }
        public int ItemsCount { get; set; }
        public int DineItemsCount { get; set; }
        public int BarItemsCount { get; set; }
        public decimal Subtotal { get; set; }
        public decimal TaxAmount { get; set; }
        public decimal DiscountAmount { get; set; }
        public decimal ServiceChargeAmount { get; set; }
        public decimal GrandTotal { get; set; }
        public string Status { get; set; } = "Active";
        public string PaymentMethod { get; set; } = "—";
        public string? InvoiceNumber { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? SettledAt { get; set; }
    }

    private static string? NormalizeDepartment(string? department)
    {
        if (string.IsNullOrWhiteSpace(department)) return null;
        var clean = department.Trim();
        if (clean.Equals("all", StringComparison.OrdinalIgnoreCase)) return null;
        if (clean.Equals("bar", StringComparison.OrdinalIgnoreCase) || clean.Contains("lounge", StringComparison.OrdinalIgnoreCase))
            return "Bar";
        if (clean.Equals("dine", StringComparison.OrdinalIgnoreCase) ||
            clean.Equals("dining", StringComparison.OrdinalIgnoreCase) ||
            clean.Equals("kitchen", StringComparison.OrdinalIgnoreCase) ||
            clean.Equals("food", StringComparison.OrdinalIgnoreCase) ||
            clean.Equals("restaurant", StringComparison.OrdinalIgnoreCase))
            return "Dine";
        return clean;
    }

    private static bool IsBarDepartmentName(string? dept)
    {
        return !string.IsNullOrWhiteSpace(dept) && dept.Contains("bar", StringComparison.OrdinalIgnoreCase);
    }

    private async Task<(HashSet<long> BarMenuIds, Dictionary<string, MenuItem> MenuByName)> LoadMenuClassificationAsync()
    {
        var menuItems = await _context.MenuItems.AsNoTracking().ToListAsync();
        var barIds = new HashSet<long>();
        var byName = new Dictionary<string, MenuItem>(StringComparer.OrdinalIgnoreCase);

        foreach (var m in menuItems)
        {
            if (OrderItemRouting.IsBarItem(m.IsBarItem, m.DrinkType, m.Category, m.DishName))
            {
                barIds.Add(m.MenuItemId);
            }
            if (!string.IsNullOrWhiteSpace(m.DishName) && !byName.ContainsKey(m.DishName))
            {
                byName[m.DishName] = m;
            }
        }

        return (barIds, byName);
    }

    private static bool IsBarOrderItem(
        OrderItem item,
        HashSet<long> barMenuIds,
        Dictionary<string, MenuItem> menuByName)
    {
        if (item.BotId.HasValue && item.BotId.Value > 0) return true;
        if (item.MenuItemId > 0 && barMenuIds.Contains(item.MenuItemId)) return true;
        if (!string.IsNullOrWhiteSpace(item.Name) && menuByName.TryGetValue(item.Name.Trim(), out var matched))
        {
            return OrderItemRouting.IsBarItem(matched.IsBarItem, matched.DrinkType, matched.Category, matched.DishName);
        }
        return OrderItemRouting.IsBarItem(false, null, null, item.Name);
    }

    private static (bool Included, decimal Share, decimal DeptItemTotal) ComputeOrderDepartmentShare(
        Order? order,
        string? normalizedDept,
        HashSet<long> barMenuIds,
        Dictionary<string, MenuItem> menuByName)
    {
        if (normalizedDept == null) return (true, 1m, 0m);

        var items = order?.Items?.Where(i => i.IsActive && !i.IsDeleted).ToList() ?? new List<OrderItem>();
        if (items.Count == 0)
        {
            bool orderIsBar = string.Equals(order?.Section, "Bar", StringComparison.OrdinalIgnoreCase);
            if (normalizedDept == "Bar") return orderIsBar ? (true, 1m, 0m) : (false, 0m, 0m);
            return !orderIsBar ? (true, 1m, 0m) : (false, 0m, 0m);
        }

        decimal barTotal = 0m;
        decimal dineTotal = 0m;
        foreach (var it in items)
        {
            decimal line = it.TotalPrice > 0 ? it.TotalPrice : it.Price * it.Quantity;
            if (IsBarOrderItem(it, barMenuIds, menuByName))
                barTotal += line;
            else
                dineTotal += line;
        }

        decimal combined = barTotal + dineTotal;
        if (normalizedDept == "Bar")
        {
            if (barTotal <= 0) return (false, 0m, 0m);
            decimal share = combined > 0 ? barTotal / combined : 1m;
            return (true, share, barTotal);
        }
        else
        {
            if (dineTotal <= 0) return (false, 0m, 0m);
            decimal share = combined > 0 ? dineTotal / combined : 1m;
            return (true, share, dineTotal);
        }
    }

    private async Task<(
        Dictionary<long, string> DiningTables,
        Dictionary<long, string> RestaurantTables,
        Dictionary<long, string> StaffById,
        Dictionary<long, string> StaffPersonsById)> LoadEntityLookupsAsync()
    {
        var diningTables = await _context.DiningTables.AsNoTracking()
            .ToDictionaryAsync(t => t.Id, t => t.Name);

        var restaurantTables = await _context.RestaurantTables.AsNoTracking()
            .ToDictionaryAsync(t => t.TableId, t => !string.IsNullOrWhiteSpace(t.TableName) ? t.TableName : t.TableNumber);

        var staff = await _context.Staff.AsNoTracking()
            .ToDictionaryAsync(s => s.Id, s => s.Name);

        var staffPersons = await _context.StaffPersons.AsNoTracking()
            .ToDictionaryAsync(s => s.StaffId, s => s.FullName);

        return (diningTables, restaurantTables, staff, staffPersons);
    }

    private static string ResolveTableName(
        Order? order,
        Dictionary<long, string> diningTables,
        Dictionary<long, string> restaurantTables)
    {
        if (order == null) return "Direct / Counter";
        if (string.Equals(order.OrderType, "Takeaway", StringComparison.OrdinalIgnoreCase)) return "Takeaway";
        if (order.TableId.HasValue && order.TableId.Value > 0)
        {
            if (diningTables.TryGetValue(order.TableId.Value, out var dtName) && !string.IsNullOrWhiteSpace(dtName))
                return dtName;
            if (restaurantTables.TryGetValue(order.TableId.Value, out var rtName) && !string.IsNullOrWhiteSpace(rtName))
                return rtName;
            return $"Table {order.TableId.Value}";
        }
        return "Direct / Counter";
    }

    private static string ResolveServerName(
        Order? order,
        Dictionary<long, string> staffById,
        Dictionary<long, string> staffPersonsById)
    {
        if (order?.WaiterId.HasValue == true && order.WaiterId.Value > 0)
        {
            if (staffById.TryGetValue(order.WaiterId.Value, out var sName) && !string.IsNullOrWhiteSpace(sName))
                return sName;
            if (staffPersonsById.TryGetValue(order.WaiterId.Value, out var spName) && !string.IsNullOrWhiteSpace(spName))
                return spName;
        }
        return "Staff";
    }

    public static string ResolveCanonicalPaymentMode(InvoicePayment p)
    {
        var mode = p.PaymentMode?.Trim();
        var method = p.PaymentMethod?.Trim();

        if (!string.IsNullOrWhiteSpace(mode) && !mode.Equals("CASH", StringComparison.OrdinalIgnoreCase))
            return mode.ToUpperInvariant();

        if (!string.IsNullOrWhiteSpace(method) && !method.Equals("cash", StringComparison.OrdinalIgnoreCase))
            return method.ToUpperInvariant();

        return !string.IsNullOrWhiteSpace(mode) ? mode.ToUpperInvariant() : "CASH";
    }

    public static bool IsPaymentStatusSuccessful(string? paymentStatus)
    {
        if (string.IsNullOrWhiteSpace(paymentStatus)) return true;
        var st = paymentStatus.Trim().ToLowerInvariant();
        return st != "failed" && st != "pending" && st != "cancelled" && st != "void" && st != "refunded";
    }

    public static bool IsPaymentSuccessful(InvoicePayment p)
    {
        return IsPaymentStatusSuccessful(p.PaymentStatus);
    }

    private static string ResolveInvoicePaymentMethod(IEnumerable<InvoicePayment>? payments)
    {
        var list = payments?.ToList() ?? new List<InvoicePayment>();
        if (list.Count == 0) return "CASH";

        var distinctModes = list
            .Select(ResolveCanonicalPaymentMode)
            .Where(m => !string.IsNullOrWhiteSpace(m))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();

        if (distinctModes.Count == 0) return "CASH";
        if (distinctModes.Count == 1) return distinctModes[0];
        return string.Join(" + ", distinctModes);
    }

    private async Task<List<EnrichedInvoiceRow>> LoadEnrichedInvoicesAsync(
        DateTime? start,
        DateTime? end,
        string? department,
        string? status = null,
        bool excludeVoid = false)
    {
        var normDept = NormalizeDepartment(department);

        var query = _context.Invoices.Include(i => i.Payments).AsNoTracking();
        if (start.HasValue) query = query.Where(i => i.CreatedAt >= start.Value);
        if (end.HasValue) query = query.Where(i => i.CreatedAt <= end.Value);
        if (excludeVoid)
        {
            query = query.Where(i =>
                i.Status.ToLower() != "void" &&
                i.Status.ToLower() != "refunded" &&
                i.Status.ToLower() != "cancelled");
        }
        if (!string.IsNullOrWhiteSpace(status) && !string.Equals(status, "all", StringComparison.OrdinalIgnoreCase))
        {
            var stLower = status.Trim().ToLower();
            query = query.Where(i => i.Status.ToLower() == stLower);
        }

        var invoices = await query.OrderByDescending(i => i.CreatedAt).ToListAsync();
        if (invoices.Count == 0) return new List<EnrichedInvoiceRow>();

        var orderIds = invoices.Select(i => i.OrderId).Distinct().ToList();
        var orders = await _context.Orders.Include(o => o.Items).AsNoTracking()
            .Where(o => orderIds.Contains(o.Id))
            .ToDictionaryAsync(o => o.Id);

        var (diningTables, restaurantTables, staffById, staffPersonsById) = await LoadEntityLookupsAsync();
        var (barIds, menuByName) = await LoadMenuClassificationAsync();

        var results = new List<EnrichedInvoiceRow>();
        foreach (var inv in invoices)
        {
            orders.TryGetValue(inv.OrderId, out var ord);
            if (excludeVoid && ord != null &&
                (ord.Status.Equals("Cancelled", StringComparison.OrdinalIgnoreCase) ||
                 string.Equals(ord.FulfillmentStatus, "Cancelled", StringComparison.OrdinalIgnoreCase)))
            {
                continue;
            }
            var (included, share, _) = ComputeOrderDepartmentShare(ord, normDept, barIds, menuByName);
            if (!included) continue;

            decimal subtotal = Math.Round(inv.Subtotal * share, 2);
            decimal tax = Math.Round(inv.TaxAmount * share, 2);
            decimal discount = Math.Round(inv.DiscountAmount * share, 2);
            decimal total = Math.Round(inv.TotalAmount * share, 2);
            decimal paid = Math.Round(inv.PaidAmount * share, 2);
            decimal serviceCharge = Math.Max(0m, Math.Round(total - (Math.Max(0m, subtotal - discount) + tax), 2));

            results.Add(new EnrichedInvoiceRow
            {
                InvoiceId = inv.InvoiceId,
                InvoiceNumber = !string.IsNullOrWhiteSpace(inv.InvoiceNumber) ? inv.InvoiceNumber : $"INV-{inv.InvoiceId}",
                OrderId = inv.OrderId,
                TableName = ResolveTableName(ord, diningTables, restaurantTables),
                ServerName = ResolveServerName(ord, staffById, staffPersonsById),
                PaymentMethod = ResolveInvoicePaymentMethod(inv.Payments),
                Subtotal = subtotal,
                TaxAmount = tax,
                DiscountAmount = discount,
                ServiceChargeAmount = serviceCharge,
                TotalAmount = total,
                PaidAmount = paid,
                Status = inv.Status.ToUpperInvariant(),
                IsPaid = !inv.Status.Equals("VOID", StringComparison.OrdinalIgnoreCase) &&
                         !inv.Status.Equals("REFUNDED", StringComparison.OrdinalIgnoreCase) &&
                         !inv.Status.Equals("CANCELLED", StringComparison.OrdinalIgnoreCase) &&
                         (inv.Status.Equals("PAID", StringComparison.OrdinalIgnoreCase) || (inv.TotalAmount > 0 && inv.PaidAmount >= inv.TotalAmount)),
                CreatedAt = inv.CreatedAt,
                DepartmentShare = share
            });
        }

        return results;
    }

    private async Task<List<EnrichedOrderRow>> LoadEnrichedOrdersAsync(
        DateTime? start,
        DateTime? end,
        string? status = null,
        string? orderType = null,
        string? department = null,
        bool excludeCancelled = false)
    {
        var normDept = NormalizeDepartment(department);

        var query = _context.Orders.Include(o => o.Items).AsNoTracking()
            .Where(o => !o.IsDeleted);

        if (excludeCancelled)
        {
            query = query.Where(o =>
                o.Status.ToLower() != "cancelled" &&
                (o.FulfillmentStatus == null || o.FulfillmentStatus.ToLower() != "cancelled"));
        }

        if (start.HasValue) query = query.Where(o => o.CreatedAt >= start.Value);
        if (end.HasValue) query = query.Where(o => o.CreatedAt <= end.Value);

        if (!string.IsNullOrWhiteSpace(status) && !string.Equals(status, "all", StringComparison.OrdinalIgnoreCase))
        {
            var stLower = status.Trim().ToLower();
            query = query.Where(o => o.Status.ToLower() == stLower);
        }

        if (!string.IsNullOrWhiteSpace(orderType) && !string.Equals(orderType, "all", StringComparison.OrdinalIgnoreCase))
        {
            var otLower = orderType.Trim().ToLower();
            query = query.Where(o => o.OrderType.ToLower() == otLower);
        }

        var orders = await query.OrderByDescending(o => o.CreatedAt).ToListAsync();
        if (orders.Count == 0) return new List<EnrichedOrderRow>();

        var orderIds = orders.Select(o => o.Id).ToList();
        var invoices = await _context.Invoices.Include(i => i.Payments).AsNoTracking()
            .Where(i => orderIds.Contains(i.OrderId))
            .OrderByDescending(i => i.CreatedAt)
            .ToListAsync();

        var invByOrder = invoices.GroupBy(i => i.OrderId).ToDictionary(g => g.Key, g => g.First());
        var (diningTables, restaurantTables, staffById, staffPersonsById) = await LoadEntityLookupsAsync();
        var (barIds, menuByName) = await LoadMenuClassificationAsync();

        var results = new List<EnrichedOrderRow>();

        foreach (var ord in orders)
        {
            var activeItems = ord.Items?.Where(i => i.IsActive && !i.IsDeleted).ToList() ?? new List<OrderItem>();
            var (included, share, _) = ComputeOrderDepartmentShare(ord, normDept, barIds, menuByName);
            if (!included) continue;

            int barCount = activeItems.Count(i => IsBarOrderItem(i, barIds, menuByName));
            int dineCount = activeItems.Count - barCount;

            decimal itemSubtotal = activeItems.Sum(i => i.TotalPrice > 0 ? i.TotalPrice : i.Price * i.Quantity);
            decimal discountAmt = 0m;
            decimal taxAmt;
            decimal serviceAmt;
            decimal grandTotal;
            string payMethod = "—";
            string? invNo = null;
            DateTime? settledAt = ord.Status.Equals("Settled", StringComparison.OrdinalIgnoreCase) ? (ord.UpdatedAt ?? ord.CreatedAt) : null;

            if (invByOrder.TryGetValue(ord.Id, out var inv))
            {
                decimal baseSub = inv.Subtotal > 0 ? inv.Subtotal : itemSubtotal;
                itemSubtotal = Math.Round(baseSub * share, 2);
                discountAmt = Math.Round(inv.DiscountAmount * share, 2);
                taxAmt = Math.Round(inv.TaxAmount * share, 2);
                grandTotal = Math.Round(inv.TotalAmount * share, 2);
                serviceAmt = Math.Max(0m, Math.Round(grandTotal - (Math.Max(0m, itemSubtotal - discountAmt) + taxAmt), 2));
                payMethod = ResolveInvoicePaymentMethod(inv.Payments);
                invNo = inv.InvoiceNumber;
                bool isInvalidInv = inv.Status.Equals("VOID", StringComparison.OrdinalIgnoreCase) ||
                                    inv.Status.Equals("REFUNDED", StringComparison.OrdinalIgnoreCase) ||
                                    inv.Status.Equals("CANCELLED", StringComparison.OrdinalIgnoreCase);
                settledAt = isInvalidInv ? null : inv.CreatedAt;
            }
            else
            {
                itemSubtotal = Math.Round(itemSubtotal * share, 2);
                taxAmt = Math.Round(itemSubtotal * 0.05m, 2);
                serviceAmt = Math.Round(itemSubtotal * 0.05m, 2);
                grandTotal = Math.Round(itemSubtotal + taxAmt + serviceAmt, 2);
            }

            results.Add(new EnrichedOrderRow
            {
                OrderId = ord.Id,
                OrderNumber = ord.OrderNumber,
                OrderType = ord.OrderType,
                TableId = ord.TableId,
                TableName = ResolveTableName(ord, diningTables, restaurantTables),
                ServerName = ResolveServerName(ord, staffById, staffPersonsById),
                Guests = ord.Guests,
                ItemsCount = normDept == "Bar" ? barCount : (normDept == "Dine" ? dineCount : activeItems.Count),
                DineItemsCount = dineCount,
                BarItemsCount = barCount,
                Subtotal = itemSubtotal,
                TaxAmount = taxAmt,
                DiscountAmount = discountAmt,
                ServiceChargeAmount = serviceAmt,
                GrandTotal = grandTotal,
                Status = ord.Status.ToUpperInvariant(),
                PaymentMethod = payMethod,
                InvoiceNumber = invNo,
                CreatedAt = ord.CreatedAt,
                SettledAt = settledAt
            });
        }

        return results;
    }

    private static (DateTime? Start, DateTime? End) ResolveOptionalDateRange(DateTime? fromDate, DateTime? toDate, int? days = null)
    {
        if (days.HasValue && days.Value > 0 && !fromDate.HasValue && !toDate.HasValue)
        {
            var endDt = DateTime.UtcNow;
            var startDt = endDt.Date.AddDays(-(days.Value - 1));
            return (startDt, endDt);
        }

        if (!fromDate.HasValue && !toDate.HasValue)
        {
            return (null, null);
        }

        var s = fromDate?.Date ?? DateTime.MinValue;
        var e = toDate?.Date.AddDays(1).AddTicks(-1) ?? DateTime.MaxValue;
        if (s > e) (s, e) = (e.Date, s.Date.AddDays(1).AddTicks(-1));
        return (s, e);
    }

    private static string FormatSignedInr(decimal amount)
    {
        return amount < 0 ? $"-₹{Math.Abs(amount):N2}" : $"₹{amount:N2}";
    }

    private static string FormatPeriodLabel(DateTime? start, DateTime? end, string? fallbackStart = null, string? fallbackEnd = null)
    {
        if (start.HasValue && end.HasValue && start.Value != DateTime.MinValue && end.Value != DateTime.MaxValue)
            return $"{start.Value:yyyy-MM-dd} to {end.Value:yyyy-MM-dd}";
        if (start.HasValue && start.Value != DateTime.MinValue)
            return $"From {start.Value:yyyy-MM-dd}";
        if (end.HasValue && end.Value != DateTime.MaxValue)
            return $"Until {end.Value:yyyy-MM-dd}";
        if (!string.IsNullOrWhiteSpace(fallbackStart) && !string.IsNullOrWhiteSpace(fallbackEnd))
            return $"{fallbackStart} to {fallbackEnd} (All Time)";
        return "All Time (Complete History)";
    }

    #endregion

    #region 1. Admin Dashboard Export

    public async Task<ExportDocument> GenerateDashboardExportAsync(string? department = "Dine")
    {
        string deptNormalized = NormalizeDepartment(department) ?? "Dine";
        bool isBar = deptNormalized == "Bar";
        string deptLabel = isBar ? "Bar & Lounge" : "Dining Restaurant";

        var summary = await _dashboardService.GetDashboardSummaryAsync(deptNormalized);
        var tables = await _dashboardService.GetLiveDiningTablesGridAsync(deptNormalized);
        var dishes = await _dashboardService.GetSignatureDishesPreviewAsync(deptNormalized);
        var inventoryHealth = await _dashboardService.GetInventoryHealthAsync(deptNormalized);
        var kitchen = await _dashboardService.GetKitchenStatusAsync(deptNormalized);
        var recentInvoices = (await LoadEnrichedInvoicesAsync(null, null, deptNormalized)).Take(15).ToList();

        int vacantTables = Math.Max(0, summary.TotalDiningTables - summary.OccupiedTables);
        decimal occupancyRate = summary.TotalDiningTables > 0
            ? Math.Round((decimal)summary.OccupiedTables / summary.TotalDiningTables * 100m, 1)
            : 0m;
        decimal cardSales = Math.Max(0m, summary.TodayTotalSales - summary.TodayCashSales - summary.TodayUpiSales);
        int activeOrdersCount = tables.Count(t => t.CurrentOrder != null);

        var doc = new ExportDocument
        {
            Title = $"HMS Admin Dashboard Executive Snapshot ({deptLabel})",
            BaseFileName = $"HMS_Dashboard_{deptNormalized}"
        };

        var summarySheet = new ExportSheet
        {
            SheetName = "Executive Summary",
            Title = $"Dashboard Summary KPIs - {deptLabel}",
            Metadata = new Dictionary<string, string>
            {
                { "Department", deptLabel },
                { "Snapshot Date", DateTime.UtcNow.ToString("yyyy-MM-dd HH:mm UTC") },
                { "Active Dining Tables", $"{summary.OccupiedTables} / {summary.TotalDiningTables} ({occupancyRate:F1}% Occupancy)" },
                { "Active Kitchen/Bar Tickets", $"{summary.KitchenActiveKotCount} in progress" }
            },
            SummaryKpis = new Dictionary<string, string>
            {
                { "Today's Total Sales", $"₹{summary.TodayTotalSales:N2}" },
                { "Settled Orders Today", $"{summary.TodaySettledBills}" },
                { "Cash Sales", $"₹{summary.TodayCashSales:N2}" },
                { "UPI / Digital Sales", $"₹{summary.TodayUpiSales:N2}" },
                { "Card / Other Sales", $"₹{cardSales:N2}" },
                { "Total Active Orders", $"{activeOrdersCount}" }
            },
            Headers = new List<string> { "Metric Category", "Parameter", "Current Value", "Operational Notes" },
            Rows = new List<List<object?>>
            {
                new() { "Financial Revenue", "Today's Gross Sales", summary.TodayTotalSales, "Total revenue finalized today" },
                new() { "Financial Revenue", "Cash Collections", summary.TodayCashSales, "Cash in drawer from today's orders" },
                new() { "Financial Revenue", "UPI / Digital Collections", summary.TodayUpiSales, "Online and QR payments received" },
                new() { "Financial Revenue", "Card / Other Collections", cardSales, "POS card terminal transactions" },
                new() { "Restaurant Capacity", "Total Tables", summary.TotalDiningTables, "Configured active tables" },
                new() { "Restaurant Capacity", "Occupied Tables", summary.OccupiedTables, "Currently seated dining tables" },
                new() { "Restaurant Capacity", "Vacant Tables", vacantTables, "Available for immediate guest seating" },
                new() { "Restaurant Capacity", "Table Occupancy %", $"{occupancyRate:F1}%", "Real-time occupancy ratio" },
                new() { "Operations & Kitchen", "Active Orders", activeOrdersCount, "Open un-settled orders" },
                new() { "Operations & Kitchen", "Active KOTs / BOTs", summary.KitchenActiveKotCount, "Tickets pending or in preparation" },
                new() { "Operations & Kitchen", "Tables Cooking", kitchen.TablesCurrentlyCooking, "Tables with active food preparation" },
                new() { "Inventory Health", "Tracked Stock Items", inventoryHealth.TotalTrackedItems, "Active ingredients in department" },
                new() { "Inventory Health", "Low Stock Shortages", inventoryHealth.LowStockItems, "Items at or below restock threshold" },
                new() { "Inventory Health", "Out of Stock Items", inventoryHealth.OutOfStockItems, "Critical items with zero stock" },
                new() { "Inventory Health", "Total Inventory Valuation", inventoryHealth.TotalInventoryValuation, "Current warehouse valuation at cost" }
            }
        };
        doc.Sheets.Add(summarySheet);

        var tablesSheet = new ExportSheet
        {
            SheetName = "Tables Status",
            Title = $"Live Dining Tables Grid ({deptLabel})",
            Headers = new List<string> { "Table ID", "Table #", "Floor / Section", "Status", "Capacity", "Occupied Chairs", "Assigned Server", "Active Order #", "Elapsed (Mins)", "Order Total (₹)" },
            Rows = tables.Select(t => new List<object?>
            {
                t.TableId,
                t.TableNumber,
                t.Floor,
                t.Status.ToUpperInvariant(),
                t.Capacity,
                t.GuestCount,
                t.AssignedStaff,
                t.CurrentOrder?.OrderNumber ?? "—",
                t.CurrentOrder?.OrderTime != null ? (int)Math.Max(0, (DateTime.UtcNow - t.CurrentOrder.OrderTime.Value).TotalMinutes) : 0,
                t.CurrentOrder?.TotalAmount ?? 0m
            }).ToList()
        };
        doc.Sheets.Add(tablesSheet);

        var dishesSheet = new ExportSheet
        {
            SheetName = "Signature Dishes",
            Title = $"Signature Dishes & Menu Highlights ({deptLabel})",
            Headers = new List<string> { "Item ID", "Dish / Drink Name", "Category", "Price (₹)", "Dietary Type", "Chef's Special", "Prep Time (Mins)", "Available" },
            Rows = dishes.Select(d => new List<object?>
            {
                d.MenuItemId,
                d.DishName,
                d.Category,
                d.Price,
                d.DietaryType,
                d.IsChefsSpecial ? "Yes" : "No",
                d.PrepTimeMinutes,
                d.IsAvailable ? "Yes" : "No"
            }).ToList()
        };
        doc.Sheets.Add(dishesSheet);

        var invSheet = new ExportSheet
        {
            SheetName = "Recent Invoices",
            Title = $"Recent Customer Invoices ({deptLabel})",
            Headers = new List<string> { "Invoice #", "Order #", "Table / Source", "Server", "Payment Mode", "Status", "Total Amount (₹)", "Invoice Date" },
            Rows = recentInvoices.Select(inv => new List<object?>
            {
                inv.InvoiceNumber,
                $"ORD-{inv.OrderId}",
                inv.TableName,
                inv.ServerName,
                inv.PaymentMethod,
                inv.Status,
                inv.TotalAmount,
                inv.CreatedAt
            }).ToList()
        };
        doc.Sheets.Add(invSheet);

        return doc;
    }

    #endregion

    #region 2. Sales Reports Export

    public async Task<ExportDocument> GenerateSalesReportExportAsync(DateTime? fromDate, DateTime? toDate, string? department = null, int? days = null)
    {
        var (start, end) = ResolveOptionalDateRange(fromDate, toDate, days);
        var normDept = NormalizeDepartment(department);
        string deptLabel = normDept ?? "All";

        var invoices = await LoadEnrichedInvoicesAsync(start, end, normDept, excludeVoid: true);

        var dailyGroups = invoices
            .GroupBy(i => i.CreatedAt.Date)
            .OrderBy(g => g.Key)
            .ToList();

        decimal grandSubtotal = 0;
        decimal grandTax = 0;
        decimal grandDiscount = 0;
        decimal grandTotal = 0;
        decimal grandPaid = 0;
        int grandInvoicesCount = invoices.Count;
        int grandPaidCount = invoices.Count(i => i.IsPaid);

        var rows = new List<List<object?>>();
        int index = 1;

        foreach (var day in dailyGroups)
        {
            int totalInvs = day.Count();
            int paidInvs = day.Count(i => i.IsPaid);
            decimal subtotal = day.Sum(i => i.Subtotal);
            decimal tax = day.Sum(i => i.TaxAmount);
            decimal disc = day.Sum(i => i.DiscountAmount);
            decimal total = day.Sum(i => i.TotalAmount);
            decimal paid = day.Sum(i => i.PaidAmount);

            grandSubtotal += subtotal;
            grandTax += tax;
            grandDiscount += disc;
            grandTotal += total;
            grandPaid += paid;

            rows.Add(new List<object?>
            {
                index++,
                day.Key.ToString("yyyy-MM-dd"),
                totalInvs,
                paidInvs,
                subtotal,
                tax,
                disc,
                total,
                paid,
                paidInvs > 0 ? Math.Round(paid / paidInvs, 2) : 0m
            });
        }

        string periodText = FormatPeriodLabel(
            start,
            end,
            dailyGroups.FirstOrDefault()?.Key.ToString("yyyy-MM-dd"),
            dailyGroups.LastOrDefault()?.Key.ToString("yyyy-MM-dd"));

        var sheet = new ExportSheet
        {
            SheetName = "Daily Sales",
            Title = $"Sales Performance Report ({deptLabel})",
            Metadata = new Dictionary<string, string>
            {
                { "Period", periodText },
                { "Department", deptLabel },
                { "Total Invoices", grandInvoicesCount.ToString() },
                { "Settled Invoices", grandPaidCount.ToString() }
            },
            SummaryKpis = new Dictionary<string, string>
            {
                { "Total Gross Sales", $"₹{grandTotal:N2}" },
                { "Total Tax Collected", $"₹{grandTax:N2}" },
                { "Total Discounts Given", $"₹{grandDiscount:N2}" },
                { "Total Amount Settled", $"₹{grandPaid:N2}" }
            },
            Headers = new List<string>
            {
                "#", "Date", "Total Invoices", "Paid Invoices", "Subtotal (₹)", "GST / Tax (₹)", "Discount (₹)", "Total Amount (₹)", "Paid Amount (₹)", "Avg Bill Value (₹)"
            },
            Rows = rows,
            TotalsRow = new List<object?>
            {
                "TOTAL", "—", grandInvoicesCount, grandPaidCount, grandSubtotal, grandTax, grandDiscount, grandTotal, grandPaid, grandPaidCount > 0 ? Math.Round(grandPaid / grandPaidCount, 2) : 0m
            }
        };

        return new ExportDocument("Sales Performance Report", $"Sales_Report_{deptLabel}", sheet);
    }

    #endregion

    #region 3. Profit & Loss Statement Export

    public async Task<ExportDocument> GenerateProfitLossExportAsync(DateTime? fromDate, DateTime? toDate, string? department = null)
    {
        var (start, end) = ResolveOptionalDateRange(fromDate, toDate);
        var normDept = NormalizeDepartment(department);
        string deptLabel = normDept ?? "All";

        var invoices = await LoadEnrichedInvoicesAsync(start, end, normDept, excludeVoid: true);

        decimal netSalesRevenue = invoices.Sum(i => i.TotalAmount); // Invoices.TotalAmount is already net of discounts
        decimal grossFoodSales = invoices.Sum(i => i.Subtotal);
        decimal totalTax = invoices.Sum(i => i.TaxAmount);
        decimal totalService = invoices.Sum(i => i.ServiceChargeAmount);
        decimal totalDiscount = invoices.Sum(i => i.DiscountAmount);
        decimal grossBeforeDiscount = netSalesRevenue + totalDiscount;

        var purchaseQuery = _context.InventoryPurchases.AsNoTracking();
        if (start.HasValue) purchaseQuery = purchaseQuery.Where(p => p.PurchaseDate >= start.Value);
        if (end.HasValue) purchaseQuery = purchaseQuery.Where(p => p.PurchaseDate <= end.Value);
        var purchases = await purchaseQuery.ToListAsync();
        if (normDept == "Bar")
            purchases = purchases.Where(p => IsBarDepartmentName(p.Department)).ToList();
        else if (normDept == "Dine")
            purchases = purchases.Where(p => !IsBarDepartmentName(p.Department)).ToList();

        decimal inventoryPurchasesCost = purchases.Sum(p => p.TotalAmount);

        var salaryQuery = _context.SalaryPayments.AsNoTracking()
            .Where(s => s.Amount > 0 && s.Status.ToLower() != "void" && s.Status.ToLower() != "cancelled");
        if (start.HasValue) salaryQuery = salaryQuery.Where(s => s.PaymentDate >= start.Value);
        if (end.HasValue) salaryQuery = salaryQuery.Where(s => s.PaymentDate <= end.Value);
        var salaries = await salaryQuery.ToListAsync();
        if (normDept == "Bar")
            salaries = salaries.Where(s => IsBarDepartmentName(s.Department)).ToList();
        else if (normDept == "Dine")
            salaries = salaries.Where(s => !IsBarDepartmentName(s.Department)).ToList();

        decimal salaryCost = salaries.Sum(s => s.Amount);

        // Ingredients current stock valuation matching DashboardService
        var ingredients = await _context.Ingredients.AsNoTracking().Where(i => i.IsActive).ToListAsync();
        if (normDept == "Bar")
            ingredients = ingredients.Where(i => DrinkCategoryHelper.IsDrinkCategory(i.Category)).ToList();
        else if (normDept == "Dine")
            ingredients = ingredients.Where(i => !DrinkCategoryHelper.IsDrinkCategory(i.Category)).ToList();

        decimal stockValuation = ingredients.Sum(i => i.CurrentStock * (i.UnitCost > 0 ? i.UnitCost : (i.CostPerUnit ?? 0m)));

        decimal cogs = inventoryPurchasesCost;
        decimal totalOperatingExpenditure = cogs + salaryCost;
        decimal netProfit = netSalesRevenue - totalOperatingExpenditure;
        decimal profitMargin = netSalesRevenue > 0 ? Math.Round((netProfit / netSalesRevenue) * 100m, 2) : 0m;
        bool isProfit = netProfit >= 0;

        var rows = new List<List<object?>>
        {
            new() { "REVENUE & INCOME", "Food & Beverage Menu Subtotal", grossFoodSales, "Menu sales subtotal before taxes, service & discounts" },
            new() { "REVENUE & INCOME", "GST / Taxes Collected", totalTax, "Indirect tax collected from guests" },
            new() { "REVENUE & INCOME", "Service Charges Revenue", totalService, "Restaurant service charge component" },
            new() { "REVENUE & INCOME", "Gross Billed Before Discounts", grossBeforeDiscount, "Gross revenue prior to promotional deductions" },
            new() { "REVENUE & INCOME", "Promotional Discounts Given", -totalDiscount, "Total discount deductions applied across bills" },
            new() { "REVENUE & INCOME", "Net Operating Sales (After Discounts)", netSalesRevenue, $"Total billed revenue from {invoices.Count} customer invoices" },

            new() { "EXPENDITURE & COGS", "Inventory Restock Purchases (COGS)", inventoryPurchasesCost, $"Direct stock & beverage purchases ({purchases.Count} transactions)" },
            new() { "EXPENDITURE & COGS", "Staff Salary & Payroll", salaryCost, $"Recorded employee salary disbursements ({salaries.Count} transactions)" },
            new() { "EXPENDITURE & COGS", "Total Operating Expenses", totalOperatingExpenditure, "Sum of inventory purchases and payroll (matches Expenditure & Ledger)" },

            new() { "BALANCE SUMMARY", "Closing Stock Asset Valuation", stockValuation, $"{ingredients.Count} active inventory items evaluated at cost" },
            new() { "BALANCE SUMMARY", isProfit ? "Net Operating Profit" : "Net Operating Loss", netProfit, $"Operating Profit Margin: {profitMargin:F2}%" }
        };

        var sheet = new ExportSheet
        {
            SheetName = "Profit & Loss",
            Title = $"Profit & Loss Statement ({deptLabel})",
            Metadata = new Dictionary<string, string>
            {
                { "Statement Window", FormatPeriodLabel(start, end) },
                { "Department Filter", deptLabel },
                { "Invoices Analyzed", invoices.Count.ToString() },
                { "Operating Result", isProfit ? $"PROFIT (+₹{netProfit:N2})" : $"LOSS (-₹{Math.Abs(netProfit):N2})" },
                { "Profit Margin", $"{profitMargin:F2}%" }
            },
            SummaryKpis = new Dictionary<string, string>
            {
                { "Total Revenue", FormatSignedInr(netSalesRevenue) },
                { "Total Expenses", FormatSignedInr(totalOperatingExpenditure) },
                { isProfit ? "Net Profit" : "Net Loss", FormatSignedInr(netProfit) },
                { "Profit Margin", $"{profitMargin:F2}%" }
            },
            Headers = new List<string> { "Account Category", "Statement Line Item", "Amount (INR ₹)", "Accounting Analysis Notes" },
            Rows = rows,
            TotalsRow = new List<object?>
            {
                "NET PROFIT / LOSS", "FINAL OPERATING OUTCOME", netProfit, isProfit ? "Net Profitable Operation" : "Operating Deficit"
            }
        };

        return new ExportDocument("Profit & Loss Statement", $"Profit_Loss_{deptLabel}", sheet);
    }

    #endregion

    #region 4. Expenditure Report Export

    public async Task<ExportDocument> GenerateExpenditureExportAsync(DateTime? fromDate, DateTime? toDate, string? department = null)
    {
        var (start, end) = ResolveOptionalDateRange(fromDate, toDate);
        var normDept = NormalizeDepartment(department);
        string deptLabel = normDept ?? "All";

        var purchaseQuery = _context.InventoryPurchases.AsNoTracking();
        if (start.HasValue) purchaseQuery = purchaseQuery.Where(p => p.PurchaseDate >= start.Value);
        if (end.HasValue) purchaseQuery = purchaseQuery.Where(p => p.PurchaseDate <= end.Value);
        var purchases = await purchaseQuery.OrderByDescending(p => p.PurchaseDate).ToListAsync();

        var salaryQuery = _context.SalaryPayments.AsNoTracking()
            .Where(s => s.Amount > 0 && s.Status.ToLower() != "void" && s.Status.ToLower() != "cancelled");
        if (start.HasValue) salaryQuery = salaryQuery.Where(s => s.PaymentDate >= start.Value);
        if (end.HasValue) salaryQuery = salaryQuery.Where(s => s.PaymentDate <= end.Value);
        var salaries = await salaryQuery.OrderByDescending(s => s.PaymentDate).ToListAsync();

        if (normDept == "Bar")
        {
            purchases = purchases.Where(p => IsBarDepartmentName(p.Department)).ToList();
            salaries = salaries.Where(s => IsBarDepartmentName(s.Department)).ToList();
        }
        else if (normDept == "Dine")
        {
            purchases = purchases.Where(p => !IsBarDepartmentName(p.Department)).ToList();
            salaries = salaries.Where(s => !IsBarDepartmentName(s.Department)).ToList();
        }

        var doc = new ExportDocument
        {
            Title = $"Expenditure & Outflow Audit Report ({deptLabel})",
            BaseFileName = $"Expenditure_Report_{deptLabel}"
        };

        decimal totalPurchases = purchases.Sum(p => p.TotalAmount);
        decimal totalSalaries = salaries.Sum(s => s.Amount);
        decimal totalExpenditure = totalPurchases + totalSalaries;

        var summarySheet = new ExportSheet
        {
            SheetName = "Expenditure Summary",
            Title = $"Master Expenditure Summary ({deptLabel})",
            Metadata = new Dictionary<string, string>
            {
                { "Period", FormatPeriodLabel(start, end) },
                { "Department Filter", deptLabel },
                { "Total Expenditure", $"₹{totalExpenditure:N2}" }
            },
            SummaryKpis = new Dictionary<string, string>
            {
                { "Total Supplier Purchases", $"₹{totalPurchases:N2}" },
                { "Total Staff Payroll", $"₹{totalSalaries:N2}" },
                { "Combined Expenditure", $"₹{totalExpenditure:N2}" }
            },
            Headers = new List<string> { "#", "Expense Category", "Transaction Count", "Total Amount (₹)", "Share %", "Description" },
            Rows = new List<List<object?>>
            {
                new() { 1, "Inventory Supplier Purchases", purchases.Count, totalPurchases, totalExpenditure > 0 ? Math.Round((totalPurchases / totalExpenditure) * 100m, 2) : 0m, "Stock supplies, raw ingredients, and beverages restock" },
                new() { 2, "Staff Salaries & Payroll", salaries.Count, totalSalaries, totalExpenditure > 0 ? Math.Round((totalSalaries / totalExpenditure) * 100m, 2) : 0m, "Recorded employee salary disbursements" }
            },
            TotalsRow = new List<object?>
            {
                "TOTAL", "ALL OPERATING EXPENSES", purchases.Count + salaries.Count, totalExpenditure, totalExpenditure > 0 ? 100.00m : 0.00m, "Total operational expenditure"
            }
        };
        doc.Sheets.Add(summarySheet);

        var purchasesSheet = new ExportSheet
        {
            SheetName = "Stock Purchases",
            Title = $"Supplier Inventory Purchases Ledger ({deptLabel})",
            Headers = new List<string> { "#", "Purchase ID", "Date", "Item Name", "Department", "Supplier", "Quantity", "Unit Cost (₹)", "Total Amount (₹)", "Notes" },
            Rows = purchases.Select((p, idx) => new List<object?>
            {
                idx + 1,
                p.PurchaseId,
                p.PurchaseDate,
                p.ItemName,
                p.Department,
                p.Supplier,
                p.Quantity,
                p.UnitCost,
                p.TotalAmount,
                p.Note ?? "—"
            }).ToList(),
            TotalsRow = new List<object?>
            {
                "TOTAL", "—", "—", "—", "—", "—", purchases.Sum(p => p.Quantity), "—", totalPurchases, "—"
            }
        };
        doc.Sheets.Add(purchasesSheet);

        var salarySheet = new ExportSheet
        {
            SheetName = "Salary Disbursements",
            Title = $"Staff Salary Disbursements Ledger ({deptLabel})",
            Headers = new List<string> { "#", "Payment ID", "Date", "Employee Name", "Role", "Department", "Payment Month", "Amount (₹)", "Method", "Status" },
            Rows = salaries.Select((s, idx) => new List<object?>
            {
                idx + 1,
                s.PaymentId,
                s.PaymentDate,
                s.StaffName,
                s.RoleTitle,
                s.Department,
                s.PaymentMonth,
                s.Amount,
                s.PaymentMethod.ToUpperInvariant(),
                s.Status.ToUpperInvariant()
            }).ToList(),
            TotalsRow = new List<object?>
            {
                "TOTAL", "—", "—", "—", "—", "—", "—", totalSalaries, "—", "—"
            }
        };
        doc.Sheets.Add(salarySheet);

        return doc;
    }

    #endregion

    #region 5. Dine Inventory Export

    public async Task<ExportDocument> GenerateDineInventoryExportAsync(string? category, string? status, string? search = null, bool? lowStockOnly = null, string? department = null)
    {
        var all = await _context.Ingredients.AsNoTracking().Where(i => i.IsActive).ToListAsync();
        var normDept = NormalizeDepartment(department);

        // Partition using DrinkCategoryHelper.IsDrinkCategory(i.Category) (default Dine when department is omitted)
        List<Ingredient> list;
        if (string.Equals(department?.Trim(), "all", StringComparison.OrdinalIgnoreCase))
        {
            list = all;
        }
        else if (normDept == "Bar")
        {
            list = all.Where(i => DrinkCategoryHelper.IsDrinkCategory(i.Category)).ToList();
        }
        else
        {
            list = all.Where(i => !DrinkCategoryHelper.IsDrinkCategory(i.Category)).ToList();
        }

        if (!string.IsNullOrWhiteSpace(category) && !string.Equals(category, "all", StringComparison.OrdinalIgnoreCase))
        {
            list = list.Where(i => string.Equals(i.Category, category.Trim(), StringComparison.OrdinalIgnoreCase)).ToList();
        }

        if (lowStockOnly == true)
        {
            list = list.Where(i => i.CurrentStock <= i.MinimumThreshold && i.CurrentStock > 0).ToList();
        }
        else if (!string.IsNullOrWhiteSpace(status) && !string.Equals(status, "all", StringComparison.OrdinalIgnoreCase))
        {
            var stNorm = status.Trim().ToLowerInvariant().Replace(" ", "-");
            list = list.Where(i =>
            {
                var s = i.CurrentStock <= 0 ? "out-of-stock" : (i.CurrentStock <= i.MinimumThreshold ? "low-stock" : "in-stock");
                return string.Equals(s, stNorm, StringComparison.OrdinalIgnoreCase);
            }).ToList();
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var q = search.Trim().ToLowerInvariant();
            list = list.Where(i =>
                i.Name.ToLowerInvariant().Contains(q) ||
                (i.Supplier?.ToLowerInvariant().Contains(q) ?? false) ||
                (i.IngredientCode?.ToLowerInvariant().Contains(q) ?? false)).ToList();
        }

        decimal totalStockValue = list.Sum(i => i.CurrentStock * (i.UnitCost > 0 ? i.UnitCost : (i.CostPerUnit ?? 0m)));

        var rows = list.Select((item, idx) =>
        {
            decimal cost = item.UnitCost > 0 ? item.UnitCost : (item.CostPerUnit ?? 0m);
            decimal val = item.CurrentStock * cost;
            string stockStatus = item.CurrentStock <= 0 ? "Out of Stock" : (item.CurrentStock <= item.MinimumThreshold ? "Low Stock" : "In Stock");

            return new List<object?>
            {
                idx + 1,
                !string.IsNullOrWhiteSpace(item.IngredientCode) ? item.IngredientCode : $"ING-{item.IngredientId:D4}",
                item.Name,
                item.Category ?? "General",
                string.IsNullOrWhiteSpace(item.Subcategory) ? "—" : item.Subcategory,
                item.Supplier ?? "Local Supplier",
                item.CurrentStock,
                item.Unit,
                cost,
                (item.Mrp ?? 0m) > 0 ? item.Mrp!.Value : cost,
                val,
                item.MinimumThreshold,
                stockStatus,
                item.UpdatedAt
            };
        }).ToList();

        string scopeLabel = string.Equals(department?.Trim(), "all", StringComparison.OrdinalIgnoreCase)
            ? "All Departments"
            : (normDept == "Bar" ? "Bar & Lounge" : "Dine-in Kitchen & Food");
        string sheetName = string.Equals(department?.Trim(), "all", StringComparison.OrdinalIgnoreCase)
            ? "All Inventory"
            : (normDept == "Bar" ? "Bar Inventory" : "Dine Inventory");
        string baseFile = string.Equals(department?.Trim(), "all", StringComparison.OrdinalIgnoreCase)
            ? "All_Inventory"
            : (normDept == "Bar" ? "Bar_Inventory" : "Dine_Inventory");

        var sheet = new ExportSheet
        {
            SheetName = sheetName,
            Title = $"{scopeLabel} Inventory Stock Valuation",
            Metadata = new Dictionary<string, string>
            {
                { "Department Scope", scopeLabel },
                { "Total Tracked Items", list.Count.ToString() },
                { "Category Filter", category ?? "All" },
                { "Status Filter", status ?? "All" },
                { "Low Stock Count", list.Count(i => i.CurrentStock <= i.MinimumThreshold && i.CurrentStock > 0).ToString() },
                { "Out of Stock Count", list.Count(i => i.CurrentStock <= 0).ToString() },
                { "Total Valuation", $"₹{totalStockValue:N2}" }
            },
            SummaryKpis = new Dictionary<string, string>
            {
                { "Total Items", list.Count.ToString() },
                { "Low Stock Items", list.Count(i => i.CurrentStock <= i.MinimumThreshold && i.CurrentStock > 0).ToString() },
                { "Out of Stock Items", list.Count(i => i.CurrentStock <= 0).ToString() },
                { "Total Valuation", $"₹{totalStockValue:N2}" }
            },
            Headers = new List<string>
            {
                "#", "Item Code", "Item Name", "Category", "Subcategory", "Supplier", "Available Stock", "Unit", "Unit Cost (₹)", "MRP (₹)", "Stock Value (₹)", "Min Threshold", "Stock Status", "Last Updated"
            },
            Rows = rows,
            TotalsRow = new List<object?>
            {
                "TOTAL", "—", $"{list.Count} Items", "—", "—", "—", list.Sum(i => i.CurrentStock), "—", "—", "—", totalStockValue, "—", "—", "—"
            }
        };

        return new ExportDocument($"{scopeLabel} Inventory Valuation", baseFile, sheet);
    }

    #endregion

    #region 6. Bar Inventory Export

    public async Task<ExportDocument> GenerateBarInventoryExportAsync(string? category, string? status = null, string? search = null, bool? lowStockOnly = null)
    {
        var all = await _context.Ingredients.AsNoTracking().Where(i => i.IsActive).ToListAsync();

        // Partition strictly using DrinkCategoryHelper.IsDrinkCategory(i.Category) to exclude kitchen items (Raw Chicken, Cooking Oil, etc.)
        var list = all.Where(i => DrinkCategoryHelper.IsDrinkCategory(i.Category)).ToList();

        if (!string.IsNullOrWhiteSpace(category) && !string.Equals(category, "all", StringComparison.OrdinalIgnoreCase) && !string.Equals(category, "all categories", StringComparison.OrdinalIgnoreCase))
        {
            list = list.Where(i => string.Equals(i.Category, category.Trim(), StringComparison.OrdinalIgnoreCase)).ToList();
        }

        if (lowStockOnly == true)
        {
            list = list.Where(i => i.CurrentStock <= i.MinimumThreshold && i.CurrentStock > 0).ToList();
        }
        else if (!string.IsNullOrWhiteSpace(status) && !string.Equals(status, "all", StringComparison.OrdinalIgnoreCase))
        {
            var stNorm = status.Trim().ToLowerInvariant().Replace(" ", "-");
            list = list.Where(i =>
            {
                var s = i.CurrentStock <= 0 ? "out-of-stock" : (i.CurrentStock <= i.MinimumThreshold ? "low-stock" : "in-stock");
                return string.Equals(s, stNorm, StringComparison.OrdinalIgnoreCase);
            }).ToList();
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var q = search.Trim().ToLowerInvariant();
            list = list.Where(i =>
                i.Name.ToLowerInvariant().Contains(q) ||
                (i.Supplier?.ToLowerInvariant().Contains(q) ?? false) ||
                (i.IngredientCode?.ToLowerInvariant().Contains(q) ?? false)).ToList();
        }

        decimal totalStockValue = list.Sum(i => i.CurrentStock * (i.UnitCost > 0 ? i.UnitCost : (i.CostPerUnit ?? 0m)));

        var rows = list.Select((item, idx) =>
        {
            decimal cost = item.UnitCost > 0 ? item.UnitCost : (item.CostPerUnit ?? 0m);
            decimal selling = (item.Mrp ?? 0m) > 0 ? item.Mrp!.Value : cost;
            decimal val = item.CurrentStock * cost;
            string stockStatus = item.CurrentStock <= 0 ? "Out of Stock" : (item.CurrentStock <= item.MinimumThreshold ? "Low Stock" : "In Stock");

            return new List<object?>
            {
                idx + 1,
                !string.IsNullOrWhiteSpace(item.IngredientCode) ? item.IngredientCode : $"BAR-{item.IngredientId:D4}",
                item.Name,
                item.Category ?? "Beverages & Bar",
                string.IsNullOrWhiteSpace(item.Subcategory) ? "—" : item.Subcategory,
                item.Unit ?? "Bottle",
                cost,
                selling,
                item.CurrentStock,
                item.MinimumThreshold,
                val,
                stockStatus,
                item.Supplier ?? "Bar Distributor",
                item.UpdatedAt
            };
        }).ToList();

        var doc = new ExportDocument
        {
            Title = "Bar & Lounge Liquor Inventory Valuation & Purchase Ledger",
            BaseFileName = "Bar_Inventory"
        };

        var sheet1 = new ExportSheet
        {
            SheetName = "Bar Inventory",
            Title = "Bar & Lounge Liquor Inventory Stock Valuation",
            Metadata = new Dictionary<string, string>
            {
                { "Total Beverages Tracked", list.Count.ToString() },
                { "Category Filter", category ?? "All" },
                { "Low Stock Count", list.Count(i => i.CurrentStock <= i.MinimumThreshold && i.CurrentStock > 0).ToString() },
                { "Out of Stock Count", list.Count(i => i.CurrentStock <= 0).ToString() },
                { "Total Valuation", $"₹{totalStockValue:N2}" }
            },
            SummaryKpis = new Dictionary<string, string>
            {
                { "Tracked Beverages", list.Count.ToString() },
                { "Low Stock Alerts", list.Count(i => i.CurrentStock <= i.MinimumThreshold && i.CurrentStock > 0).ToString() },
                { "Total Bar Valuation", $"₹{totalStockValue:N2}" }
            },
            Headers = new List<string>
            {
                "#", "Item Code", "Beverage / Brand", "Category", "Subcategory", "Unit", "Unit Cost (₹)", "Selling Price (₹)", "In-Stock Qty", "Min Threshold", "Stock Value (₹)", "Status", "Supplier", "Last Updated"
            },
            Rows = rows,
            TotalsRow = new List<object?>
            {
                "TOTAL", "—", $"{list.Count} Items", "—", "—", "—", "—", "—", list.Sum(i => i.CurrentStock), "—", totalStockValue, "—", "—", "—"
            }
        };
        doc.Sheets.Add(sheet1);

        var barPurchases = (await _context.InventoryPurchases.AsNoTracking()
            .OrderByDescending(p => p.PurchaseDate)
            .ToListAsync())
            .Where(p => IsBarDepartmentName(p.Department))
            .ToList();

        var sheet2 = new ExportSheet
        {
            SheetName = "Bar Purchases Ledger",
            Title = "Bar Stock Procurement & Purchase Ledger",
            Headers = new List<string> { "#", "Purchase ID", "Date", "Beverage Name", "Supplier", "Quantity", "Unit Cost (₹)", "Total Amount (₹)", "Notes" },
            Rows = barPurchases.Select((p, idx) => new List<object?>
            {
                idx + 1,
                $"PO-{p.PurchaseId}",
                p.PurchaseDate,
                p.ItemName,
                p.Supplier,
                p.Quantity,
                p.UnitCost,
                p.TotalAmount,
                p.Note ?? "—"
            }).ToList(),
            TotalsRow = new List<object?>
            {
                "TOTAL", "—", "—", $"{barPurchases.Count} Purchases", "—", barPurchases.Sum(p => p.Quantity), "—", barPurchases.Sum(p => p.TotalAmount), "—"
            }
        };
        doc.Sheets.Add(sheet2);

        return doc;
    }

    #endregion

    #region 7. Ledger Export

    public async Task<ExportDocument> GenerateLedgerExportAsync(DateTime? fromDate, DateTime? toDate, string? department = null)
    {
        var (start, end) = ResolveOptionalDateRange(fromDate, toDate);
        var normDept = NormalizeDepartment(department);
        string deptLabel = normDept ?? "All";

        // Opening Balance Brought Forward strictly before `start`
        decimal openingBroughtForward = 0m;
        if (start.HasValue && start.Value > DateTime.MinValue)
        {
            var priorInvoices = await LoadEnrichedInvoicesAsync(null, start.Value.AddTicks(-1), normDept, excludeVoid: true);
            var priorPurchases = await _context.InventoryPurchases.AsNoTracking().Where(p => p.PurchaseDate < start.Value).ToListAsync();
            var priorSalaries = await _context.SalaryPayments.AsNoTracking()
                .Where(s => s.PaymentDate < start.Value && s.Amount > 0 && s.Status.ToLower() != "void" && s.Status.ToLower() != "cancelled")
                .ToListAsync();

            if (normDept == "Bar")
            {
                priorPurchases = priorPurchases.Where(p => IsBarDepartmentName(p.Department)).ToList();
                priorSalaries = priorSalaries.Where(s => IsBarDepartmentName(s.Department)).ToList();
            }
            else if (normDept == "Dine")
            {
                priorPurchases = priorPurchases.Where(p => !IsBarDepartmentName(p.Department)).ToList();
                priorSalaries = priorSalaries.Where(s => !IsBarDepartmentName(s.Department)).ToList();
            }

            openingBroughtForward = priorInvoices.Sum(i => i.TotalAmount)
                                  - priorPurchases.Sum(p => p.TotalAmount)
                                  - priorSalaries.Sum(s => s.Amount);
        }

        // Period entries
        var invoices = await LoadEnrichedInvoicesAsync(start, end, normDept, excludeVoid: true);

        var purchaseQuery = _context.InventoryPurchases.AsNoTracking();
        if (start.HasValue) purchaseQuery = purchaseQuery.Where(p => p.PurchaseDate >= start.Value);
        if (end.HasValue) purchaseQuery = purchaseQuery.Where(p => p.PurchaseDate <= end.Value);
        var purchases = await purchaseQuery.ToListAsync();

        var salaryQuery = _context.SalaryPayments.AsNoTracking()
            .Where(s => s.Amount > 0 && s.Status.ToLower() != "void" && s.Status.ToLower() != "cancelled");
        if (start.HasValue) salaryQuery = salaryQuery.Where(s => s.PaymentDate >= start.Value);
        if (end.HasValue) salaryQuery = salaryQuery.Where(s => s.PaymentDate <= end.Value);
        var salaries = await salaryQuery.ToListAsync();

        if (normDept == "Bar")
        {
            purchases = purchases.Where(p => IsBarDepartmentName(p.Department)).ToList();
            salaries = salaries.Where(s => IsBarDepartmentName(s.Department)).ToList();
        }
        else if (normDept == "Dine")
        {
            purchases = purchases.Where(p => !IsBarDepartmentName(p.Department)).ToList();
            salaries = salaries.Where(s => !IsBarDepartmentName(s.Department)).ToList();
        }

        var entries = new List<(DateTime Date, string RefNo, string Account, string Description, decimal Debit, decimal Credit, string PaymentMethod)>();

        foreach (var inv in invoices)
        {
            entries.Add((inv.CreatedAt, inv.InvoiceNumber, "Sales Revenue", $"Customer Invoice #{inv.InvoiceNumber} ({inv.TableName})", 0m, inv.TotalAmount, inv.PaymentMethod));
        }

        foreach (var p in purchases)
        {
            entries.Add((p.PurchaseDate, $"PO-{p.PurchaseId}", "Inventory Purchase", $"Restock: {p.ItemName} from {p.Supplier} ({p.Department})", p.TotalAmount, 0m, "BANK/CASH"));
        }

        foreach (var s in salaries)
        {
            entries.Add((s.PaymentDate, $"SAL-{s.PaymentId}", "Salary Expense", $"Salary for {s.StaffName} ({s.Department}, {s.PaymentMonth})", s.Amount, 0m, s.PaymentMethod));
        }

        var sortedEntries = entries.OrderBy(e => e.Date).ToList();

        decimal runningBalance = openingBroughtForward;
        decimal totalDebits = 0m;
        decimal totalCredits = 0m;

        var rows = new List<List<object?>>();
        int index = 1;

        foreach (var e in sortedEntries)
        {
            totalDebits += e.Debit;
            totalCredits += e.Credit;
            runningBalance += (e.Credit - e.Debit);

            rows.Add(new List<object?>
            {
                index++,
                e.Date,
                e.RefNo,
                e.Account,
                e.Description,
                e.Debit > 0 ? e.Debit : 0m,
                e.Credit > 0 ? e.Credit : 0m,
                e.PaymentMethod.ToUpperInvariant(),
                runningBalance
            });
        }

        var sheet = new ExportSheet
        {
            SheetName = "General Ledger",
            Title = $"HMS Financial General Ledger & Transaction Journal ({deptLabel})",
            Metadata = new Dictionary<string, string>
            {
                { "Statement Range", FormatPeriodLabel(start, end) },
                { "Department Filter", deptLabel },
                { "Opening Balance Brought Forward", FormatSignedInr(openingBroughtForward) },
                { "Total Transactions", sortedEntries.Count.ToString() },
                { "Total Inflows (Credit)", FormatSignedInr(totalCredits) },
                { "Total Outflows (Debit)", FormatSignedInr(totalDebits) },
                { "Net Closing Balance", FormatSignedInr(runningBalance) }
            },
            SummaryKpis = new Dictionary<string, string>
            {
                { "Opening Balance", FormatSignedInr(openingBroughtForward) },
                { "Total Credits (Revenue)", FormatSignedInr(totalCredits) },
                { "Total Debits (Expenses)", FormatSignedInr(totalDebits) },
                { "Closing Ledger Balance", FormatSignedInr(runningBalance) }
            },
            Headers = new List<string>
            {
                "#", "Date & Time", "Reference #", "Account Category", "Transaction Description", "Debit (Expense ₹)", "Credit (Income ₹)", "Payment Method", "Running Balance (₹)"
            },
            Rows = rows,
            TotalsRow = new List<object?>
            {
                "TOTAL", "—", "—", "—", "TOTAL JOURNAL MOVEMENT", totalDebits, totalCredits, "—", runningBalance
            }
        };

        return new ExportDocument("Financial General Ledger", $"General_Ledger_{deptLabel}", sheet);
    }

    #endregion

    #region 8 & 9. Opening Balance & Closing Balance Helpers & Exports

    private sealed class DailyBalanceEntry
    {
        public DateTime Date { get; set; }
        public decimal OpeningBalance { get; set; }
        public decimal OpeningCash { get; set; }
        public decimal OpeningDigital { get; set; }
        public decimal CashInflow { get; set; }
        public decimal UpiInflow { get; set; }
        public decimal CardOtherInflow { get; set; }
        public decimal TotalInflows => CashInflow + UpiInflow + CardOtherInflow;
        public decimal PurchasesOutflow { get; set; }
        public decimal SalariesOutflow { get; set; }
        public decimal TotalOutflows => PurchasesOutflow + SalariesOutflow;
        public decimal NetChange => TotalInflows - TotalOutflows;
        public decimal ClosingBalance => OpeningBalance + NetChange;
        public int TransactionCount { get; set; }
    }

    private async Task<(decimal PeriodOpeningBalance, decimal PeriodOpeningCash, decimal PeriodOpeningDigital, List<DailyBalanceEntry> DailyEntries)> ComputeDailyBalanceTimelineAsync(
        DateTime? start,
        DateTime? end,
        string? department)
    {
        var normDept = NormalizeDepartment(department);

        // Load payments with optional invoice department share (only active non-void invoices & successful settlements)
        var allPayments = await _context.InvoicePayments.AsNoTracking().ToListAsync();
        Dictionary<long, decimal>? invoiceShareByInvoiceId = null;
        HashSet<long>? nonVoidInvoiceIds = null;

        if (normDept != null)
        {
            var deptInvoices = await LoadEnrichedInvoicesAsync(null, null, normDept, excludeVoid: true);
            invoiceShareByInvoiceId = deptInvoices.ToDictionary(i => i.InvoiceId, i => i.DepartmentShare);
        }
        else
        {
            nonVoidInvoiceIds = (await _context.Invoices.AsNoTracking()
                .Where(i => i.Status.ToLower() != "void" &&
                            i.Status.ToLower() != "refunded" &&
                            i.Status.ToLower() != "cancelled")
                .Select(i => i.InvoiceId)
                .ToListAsync()).ToHashSet();
        }

        var allPurchases = await _context.InventoryPurchases.AsNoTracking().ToListAsync();
        var allSalaries = await _context.SalaryPayments.AsNoTracking()
            .Where(s => s.Amount > 0 && s.Status.ToLower() != "void" && s.Status.ToLower() != "cancelled")
            .ToListAsync();

        if (normDept == "Bar")
        {
            allPurchases = allPurchases.Where(p => IsBarDepartmentName(p.Department)).ToList();
            allSalaries = allSalaries.Where(s => IsBarDepartmentName(s.Department)).ToList();
        }
        else if (normDept == "Dine")
        {
            allPurchases = allPurchases.Where(p => !IsBarDepartmentName(p.Department)).ToList();
            allSalaries = allSalaries.Where(s => !IsBarDepartmentName(s.Department)).ToList();
        }

        // Accumulate daily cash/upi/card/outflows across all history first so opening balances carry forward strictly from DB records
        var allDates = new SortedDictionary<DateTime, DailyBalanceEntry>();
        DailyBalanceEntry GetOrCreate(DateTime dt)
        {
            var d = dt.Date;
            if (!allDates.TryGetValue(d, out var entry))
            {
                entry = new DailyBalanceEntry { Date = d };
                allDates[d] = entry;
            }
            return entry;
        }

        foreach (var p in allPayments)
        {
            if (!IsPaymentSuccessful(p)) continue;

            decimal share = 1m;
            if (invoiceShareByInvoiceId != null)
            {
                if (!invoiceShareByInvoiceId.TryGetValue(p.InvoiceId, out share)) continue;
            }
            else if (nonVoidInvoiceIds != null && !nonVoidInvoiceIds.Contains(p.InvoiceId))
            {
                continue;
            }

            decimal rawAmt = p.Amount > 0 ? p.Amount : p.AmountPaid;
            decimal amt = Math.Round(rawAmt * share, 2);
            if (amt <= 0) continue;

            var entry = GetOrCreate(p.PaidAt);
            entry.TransactionCount++;
            var mode = ResolveCanonicalPaymentMode(p);
            if (mode == "CASH") entry.CashInflow += amt;
            else if (mode == "UPI") entry.UpiInflow += amt;
            else entry.CardOtherInflow += amt;
        }

        foreach (var pur in allPurchases)
        {
            var entry = GetOrCreate(pur.PurchaseDate);
            entry.PurchasesOutflow += pur.TotalAmount;
            entry.TransactionCount++;
        }

        foreach (var sal in allSalaries)
        {
            var entry = GetOrCreate(sal.PaymentDate);
            entry.SalariesOutflow += sal.Amount;
            entry.TransactionCount++;
        }

        decimal runningTotal = 0m;
        decimal runningCash = 0m;
        decimal runningDigital = 0m;

        decimal periodOpeningTotal = 0m;
        decimal periodOpeningCash = 0m;
        decimal periodOpeningDigital = 0m;
        bool periodOpeningCaptured = false;

        var filtered = new List<DailyBalanceEntry>();

        foreach (var kvp in allDates)
        {
            var d = kvp.Key;
            var entry = kvp.Value;

            entry.OpeningBalance = runningTotal;
            entry.OpeningCash = runningCash;
            entry.OpeningDigital = runningDigital;

            bool afterStart = !start.HasValue || d >= start.Value.Date;
            bool beforeEnd = !end.HasValue || d <= end.Value.Date;

            if (afterStart && !periodOpeningCaptured)
            {
                periodOpeningTotal = runningTotal;
                periodOpeningCash = runningCash;
                periodOpeningDigital = runningDigital;
                periodOpeningCaptured = true;
            }

            if (afterStart && beforeEnd)
            {
                filtered.Add(entry);
            }

            runningTotal += entry.NetChange;
            runningCash += entry.CashInflow;
            runningDigital += (entry.UpiInflow + entry.CardOtherInflow - entry.TotalOutflows);
        }

        if (!periodOpeningCaptured)
        {
            periodOpeningTotal = runningTotal;
            periodOpeningCash = runningCash;
            periodOpeningDigital = runningDigital;
        }

        return (periodOpeningTotal, periodOpeningCash, periodOpeningDigital, filtered);
    }

    public async Task<ExportDocument> GenerateOpeningBalanceExportAsync(DateTime? fromDate, DateTime? toDate, string? department = null)
    {
        var (start, end) = ResolveOptionalDateRange(fromDate, toDate);
        var normDept = NormalizeDepartment(department);
        string deptLabel = normDept ?? "All";

        var (periodOpening, periodCash, periodDigital, dailyEntries) =
            await ComputeDailyBalanceTimelineAsync(start, end, normDept);

        var rows = new List<List<object?>>();
        int index = 1;

        foreach (var day in dailyEntries)
        {
            rows.Add(new List<object?>
            {
                index++,
                day.Date.ToString("yyyy-MM-dd"),
                deptLabel,
                day.OpeningCash,
                day.OpeningDigital,
                day.OpeningBalance,
                day.TransactionCount,
                day.Date == dailyEntries[0].Date ? "PERIOD START CARRIED FORWARD" : "CARRIED FROM PRIOR DAY"
            });
        }

        decimal finalOpeningSnapshot = dailyEntries.Count > 0 ? dailyEntries.Last().OpeningBalance : periodOpening;

        var sheet = new ExportSheet
        {
            SheetName = "Opening Balance",
            Title = $"Daily Opening Balance Brought Forward Log ({deptLabel})",
            Metadata = new Dictionary<string, string>
            {
                { "Period", FormatPeriodLabel(start, end, dailyEntries.FirstOrDefault()?.Date.ToString("yyyy-MM-dd"), dailyEntries.LastOrDefault()?.Date.ToString("yyyy-MM-dd")) },
                { "Department Filter", deptLabel },
                { "Active Transaction Days", dailyEntries.Count.ToString() },
                { "Period Opening Balance (Brought Forward)", FormatSignedInr(periodOpening) }
            },
            SummaryKpis = new Dictionary<string, string>
            {
                { "Period Opening Balance", FormatSignedInr(periodOpening) },
                { "Opening Cumulative Cash", FormatSignedInr(periodCash) },
                { "Opening Digital/Bank Net", FormatSignedInr(periodDigital) },
                { "Transaction Days", dailyEntries.Count.ToString() }
            },
            Headers = new List<string>
            {
                "#", "Date", "Department Scope", "Cumulative Cash Position (₹)", "Cumulative Digital/Bank Net (₹)", "Opening Balance Brought Forward (₹)", "Day Transactions", "Carry-Forward Source"
            },
            Rows = rows,
            TotalsRow = new List<object?>
            {
                "SUMMARY", "OPENING", deptLabel, periodCash, periodDigital, periodOpening, dailyEntries.Sum(d => d.TransactionCount), $"Last Day Opening: {FormatSignedInr(finalOpeningSnapshot)}"
            }
        };

        return new ExportDocument("Opening Balance Log", $"Opening_Balance_{deptLabel}", sheet);
    }

    public async Task<ExportDocument> GenerateClosingBalanceExportAsync(DateTime? fromDate, DateTime? toDate, string? department = null)
    {
        var (start, end) = ResolveOptionalDateRange(fromDate, toDate);
        var normDept = NormalizeDepartment(department);
        string deptLabel = normDept ?? "All";

        var (periodOpening, _, _, dailyEntries) =
            await ComputeDailyBalanceTimelineAsync(start, end, normDept);

        var rows = new List<List<object?>>();
        int index = 1;
        decimal grandCashIn = 0m;
        decimal grandUpiIn = 0m;
        decimal grandCardIn = 0m;
        decimal grandInflows = 0m;
        decimal grandOutflows = 0m;

        foreach (var day in dailyEntries)
        {
            grandCashIn += day.CashInflow;
            grandUpiIn += day.UpiInflow;
            grandCardIn += day.CardOtherInflow;
            grandInflows += day.TotalInflows;
            grandOutflows += day.TotalOutflows;

            rows.Add(new List<object?>
            {
                index++,
                day.Date.ToString("yyyy-MM-dd"),
                day.OpeningBalance,
                day.CashInflow,
                day.UpiInflow,
                day.CardOtherInflow,
                day.TotalInflows,
                day.TotalOutflows,
                day.NetChange,
                day.ClosingBalance,
                day.TransactionCount,
                "RECONCILED"
            });
        }

        decimal finalClosingBalance = dailyEntries.Count > 0 ? dailyEntries.Last().ClosingBalance : periodOpening;
        decimal netPeriodChange = grandInflows - grandOutflows;

        var sheet = new ExportSheet
        {
            SheetName = "Closing Balance",
            Title = $"Daily Closing Balance & Payment Reconciliation Log ({deptLabel})",
            Metadata = new Dictionary<string, string>
            {
                { "Period", FormatPeriodLabel(start, end, dailyEntries.FirstOrDefault()?.Date.ToString("yyyy-MM-dd"), dailyEntries.LastOrDefault()?.Date.ToString("yyyy-MM-dd")) },
                { "Department Filter", deptLabel },
                { "Period Opening Balance", FormatSignedInr(periodOpening) },
                { "Total Cash Receipts", FormatSignedInr(grandCashIn) },
                { "Total UPI Receipts", FormatSignedInr(grandUpiIn) },
                { "Total Card / Other Receipts", FormatSignedInr(grandCardIn) },
                { "Total Outflows (Purchases + Salaries)", FormatSignedInr(grandOutflows) },
                { "Period Closing Balance", FormatSignedInr(finalClosingBalance) }
            },
            SummaryKpis = new Dictionary<string, string>
            {
                { "Opening Balance", FormatSignedInr(periodOpening) },
                { "Cash Receipts", FormatSignedInr(grandCashIn) },
                { "UPI + Card Receipts", FormatSignedInr(grandUpiIn + grandCardIn) },
                { "Closing Balance", FormatSignedInr(finalClosingBalance) }
            },
            Headers = new List<string>
            {
                "#", "Date", "Opening Balance (₹)", "Cash Sales (₹)", "UPI Sales (₹)", "Card / Other Sales (₹)", "Total Credits (₹)", "Total Debits (₹)", "Net Movement (₹)", "Closing Balance (₹)", "Transactions", "Status"
            },
            Rows = rows,
            TotalsRow = new List<object?>
            {
                "TOTAL", "—", periodOpening, grandCashIn, grandUpiIn, grandCardIn, grandInflows, grandOutflows, netPeriodChange, finalClosingBalance, dailyEntries.Sum(d => d.TransactionCount), "RECONCILED"
            }
        };

        return new ExportDocument("Closing Balance Reconciliation", $"Closing_Balance_{deptLabel}", sheet);
    }

    #endregion

    #region 10. Salaries Export

    public async Task<ExportDocument> GenerateSalariesExportAsync(SalaryFilterDto filter, string? status = null)
    {
        var query = _context.SalaryPayments.AsNoTracking();

        if (!string.IsNullOrWhiteSpace(filter.Department) && !string.Equals(filter.Department, "all", StringComparison.OrdinalIgnoreCase))
            query = query.Where(s => s.Department.ToLower() == filter.Department.Trim().ToLower());

        if (filter.StaffId.HasValue && filter.StaffId.Value > 0)
            query = query.Where(s => s.StaffId == filter.StaffId.Value);

        if (!string.IsNullOrWhiteSpace(filter.PaymentMonth) && !string.Equals(filter.PaymentMonth, "all", StringComparison.OrdinalIgnoreCase))
            query = query.Where(s => s.PaymentMonth == filter.PaymentMonth.Trim());

        if (!string.IsNullOrWhiteSpace(filter.PaymentMethod) && !string.Equals(filter.PaymentMethod, "all", StringComparison.OrdinalIgnoreCase))
            query = query.Where(s => s.PaymentMethod.ToLower() == filter.PaymentMethod.Trim().ToLower());

        if (!string.IsNullOrWhiteSpace(status) && !string.Equals(status, "all", StringComparison.OrdinalIgnoreCase))
            query = query.Where(s => s.Status.ToLower() == status.Trim().ToLower());

        if (filter.FromDate.HasValue)
            query = query.Where(s => s.PaymentDate >= filter.FromDate.Value.Date);

        if (filter.ToDate.HasValue)
            query = query.Where(s => s.PaymentDate <= filter.ToDate.Value.Date.AddDays(1).AddTicks(-1));

        if (!string.IsNullOrWhiteSpace(filter.Search))
        {
            string term = filter.Search.Trim().ToLower();
            query = query.Where(s =>
                s.StaffName.ToLower().Contains(term) ||
                s.RoleTitle.ToLower().Contains(term) ||
                s.Department.ToLower().Contains(term) ||
                (s.TransactionReference != null && s.TransactionReference.ToLower().Contains(term)));
        }

        var list = await query.OrderByDescending(s => s.PaymentDate).ToListAsync();
        decimal totalAmount = list.Sum(s => s.Amount);

        var rows = list.Select((s, idx) => new List<object?>
        {
            idx + 1,
            $"SAL-{s.PaymentId:D4}",
            s.StaffName,
            $"EMP-{s.StaffId:D3}",
            s.RoleTitle,
            s.Department,
            s.PaymentMonth,
            s.PaymentDate,
            s.Amount,
            s.PaymentMethod.ToUpperInvariant(),
            s.TransactionReference ?? "—",
            s.Status.ToUpperInvariant(),
            s.Remarks ?? "—"
        }).ToList();

        var doc = new ExportDocument
        {
            Title = "HMS Staff Salary Disbursements Report",
            BaseFileName = "Salary_Payments"
        };

        var sheet1 = new ExportSheet
        {
            SheetName = "Salaries",
            Title = "HMS Staff Salary Disbursements Report",
            Metadata = new Dictionary<string, string>
            {
                { "Department Filter", filter.Department ?? "All" },
                { "Month Filter", filter.PaymentMonth ?? "All" },
                { "Method Filter", filter.PaymentMethod ?? "All" },
                { "Status Filter", status ?? "All" },
                { "Total Payments Count", list.Count.ToString() },
                { "Total Disbursed", $"₹{totalAmount:N2}" }
            },
            SummaryKpis = new Dictionary<string, string>
            {
                { "Total Disbursed", $"₹{totalAmount:N2}" },
                { "Employees Paid", $"{list.Select(s => s.StaffId).Distinct().Count()}" },
                { "Payment Records", $"{list.Count}" }
            },
            Headers = new List<string>
            {
                "#", "Payment ID", "Employee Name", "Staff ID", "Role / Designation", "Department", "Payment Month", "Payment Date", "Amount (₹)", "Payment Method", "Reference #", "Status", "Remarks"
            },
            Rows = rows,
            TotalsRow = new List<object?>
            {
                "TOTAL", "—", $"{list.Count} Records", "—", "—", "—", "—", "—", totalAmount, "—", "—", "—", "—"
            }
        };
        doc.Sheets.Add(sheet1);

        var budget = await _salaryService.GetPayrollBudgetAsync(filter.PaymentMonth);
        var deptActuals = list.GroupBy(s => s.Department)
            .ToDictionary(g => g.Key, g => g.Sum(x => x.Amount), StringComparer.OrdinalIgnoreCase);

        var deptRows = budget.DepartmentBudgets.Select((db, idx) =>
        {
            deptActuals.TryGetValue(db.Department, out decimal paidAmt);
            decimal variance = db.TotalMonthlyBudget - paidAmt;
            return new List<object?>
            {
                idx + 1,
                db.Department,
                db.StaffCount,
                db.TotalMonthlyBudget,
                paidAmt,
                variance
            };
        }).ToList();

        var sheet2 = new ExportSheet
        {
            SheetName = "Department Summary",
            Title = "Department Payroll Budget vs Actual Disbursements",
            Headers = new List<string> { "#", "Department", "Active Staff", "Monthly Budget (₹)", "Actual Disbursed (₹)", "Variance (₹)" },
            Rows = deptRows,
            TotalsRow = new List<object?>
            {
                "TOTAL", "ALL DEPARTMENTS", budget.ActiveStaffCount, budget.MonthlyBudget, totalAmount, budget.MonthlyBudget - totalAmount
            }
        };
        doc.Sheets.Add(sheet2);

        return doc;
    }

    #endregion

    #region 11. Invoices Export

    public async Task<ExportDocument> GenerateInvoicesExportAsync(DateTime? fromDate, DateTime? toDate, string? status, string? department)
    {
        var (start, end) = ResolveOptionalDateRange(fromDate, toDate);
        var normDept = NormalizeDepartment(department);
        string deptLabel = normDept ?? "All";

        var list = await LoadEnrichedInvoicesAsync(start, end, normDept, status: status);

        bool explicitVoidStatus = !string.IsNullOrWhiteSpace(status) &&
                                  (status.Equals("void", StringComparison.OrdinalIgnoreCase) ||
                                   status.Equals("refunded", StringComparison.OrdinalIgnoreCase) ||
                                   status.Equals("cancelled", StringComparison.OrdinalIgnoreCase));
        var kpiList = explicitVoidStatus
            ? list
            : list.Where(i => i.Status != "VOID" && i.Status != "REFUNDED" && i.Status != "CANCELLED").ToList();

        decimal grandSubtotal = kpiList.Sum(i => i.Subtotal);
        decimal grandTax = kpiList.Sum(i => i.TaxAmount);
        decimal grandDiscount = kpiList.Sum(i => i.DiscountAmount);
        decimal grandTotal = kpiList.Sum(i => i.TotalAmount);
        decimal grandPaid = kpiList.Sum(i => i.PaidAmount);
        decimal grandDue = kpiList.Sum(i => Math.Max(0m, i.TotalAmount - i.PaidAmount));

        var rows = list.Select((inv, idx) => new List<object?>
        {
            idx + 1,
            inv.InvoiceNumber,
            $"ORD-{inv.OrderId}",
            inv.TableName,
            inv.ServerName,
            inv.PaymentMethod,
            inv.Subtotal,
            inv.TaxAmount,
            inv.DiscountAmount,
            inv.TotalAmount,
            inv.PaidAmount,
            Math.Max(0m, inv.TotalAmount - inv.PaidAmount),
            inv.Status,
            inv.CreatedAt
        }).ToList();

        var sheet = new ExportSheet
        {
            SheetName = "Invoices",
            Title = $"HMS Customer Billing Invoices Register ({deptLabel})",
            Metadata = new Dictionary<string, string>
            {
                { "Period", FormatPeriodLabel(start, end) },
                { "Department Filter", deptLabel },
                { "Status Filter", status ?? "All" },
                { "Total Invoices", list.Count.ToString() }
            },
            SummaryKpis = new Dictionary<string, string>
            {
                { "Total Billed Amount", $"₹{grandTotal:N2}" },
                { "Total Paid Amount", $"₹{grandPaid:N2}" },
                { "Tax Collected", $"₹{grandTax:N2}" },
                { "Discounts Given", $"₹{grandDiscount:N2}" }
            },
            Headers = new List<string>
            {
                "#", "Invoice #", "Order #", "Table", "Server", "Payment Method", "Subtotal (₹)", "GST / Tax (₹)", "Discount (₹)", "Grand Total (₹)", "Paid Amount (₹)", "Balance Due (₹)", "Status", "Invoice Date & Time"
            },
            Rows = rows,
            TotalsRow = new List<object?>
            {
                "TOTAL", $"{list.Count} Invoices", "—", "—", "—", "—", grandSubtotal, grandTax, grandDiscount, grandTotal, grandPaid, grandDue, "—", "—"
            }
        };

        return new ExportDocument("Customer Billing Invoices Register", $"Invoices_Register_{deptLabel}", sheet);
    }

    #endregion

    #region 12. Payments Export & Shared Query

    public sealed class EnrichedPaymentRow
    {
        public long PaymentId { get; set; }
        public long InvoiceId { get; set; }
        public string InvoiceNumber { get; set; } = string.Empty;
        public string PaymentMode { get; set; } = "CASH";
        public string PaymentMethod { get; set; } = "cash";
        public decimal Amount { get; set; }
        public string? TransactionReference { get; set; }
        public string PaymentStatus { get; set; } = "success";
        public DateTime PaidAt { get; set; }
    }

    public async Task<List<EnrichedPaymentRow>> GetEnrichedPaymentsAsync(
        DateTime? fromDate,
        DateTime? toDate,
        string? method = null,
        string? department = null)
    {
        var (start, end) = ResolveOptionalDateRange(fromDate, toDate);
        var normDept = NormalizeDepartment(department);

        var query = _context.InvoicePayments.AsNoTracking();
        if (start.HasValue) query = query.Where(p => p.PaidAt >= start.Value);
        if (end.HasValue) query = query.Where(p => p.PaidAt <= end.Value);

        var allPayments = await query.OrderByDescending(p => p.PaidAt).ToListAsync();

        Dictionary<long, decimal>? invoiceShareByInvoiceId = null;
        if (normDept != null)
        {
            var deptInvoices = await LoadEnrichedInvoicesAsync(null, null, normDept, excludeVoid: true);
            invoiceShareByInvoiceId = deptInvoices.ToDictionary(i => i.InvoiceId, i => i.DepartmentShare);
        }

        var invoiceIds = allPayments.Select(p => p.InvoiceId).Distinct().ToList();
        var invoiceMeta = invoiceIds.Count > 0
            ? await _context.Invoices.AsNoTracking()
                .Where(i => invoiceIds.Contains(i.InvoiceId))
                .Select(i => new { i.InvoiceId, i.InvoiceNumber, i.Status })
                .ToDictionaryAsync(i => i.InvoiceId)
            : new[] { new { InvoiceId = 0L, InvoiceNumber = string.Empty, Status = string.Empty } }
                .Take(0)
                .ToDictionary(i => i.InvoiceId);

        string? mNorm = (!string.IsNullOrWhiteSpace(method) && !string.Equals(method, "all", StringComparison.OrdinalIgnoreCase))
            ? method.Trim().ToUpperInvariant()
            : null;

        var results = new List<EnrichedPaymentRow>();
        foreach (var p in allPayments)
        {
            decimal share = 1m;
            if (invoiceShareByInvoiceId != null)
            {
                if (!invoiceShareByInvoiceId.TryGetValue(p.InvoiceId, out share)) continue;
            }
            else if (invoiceMeta.TryGetValue(p.InvoiceId, out var invStatusMeta))
            {
                if (invStatusMeta.Status.Equals("VOID", StringComparison.OrdinalIgnoreCase) ||
                    invStatusMeta.Status.Equals("REFUNDED", StringComparison.OrdinalIgnoreCase) ||
                    invStatusMeta.Status.Equals("CANCELLED", StringComparison.OrdinalIgnoreCase))
                {
                    continue;
                }
            }

            string canonicalMode = ResolveCanonicalPaymentMode(p);
            if (mNorm != null && !string.Equals(canonicalMode, mNorm, StringComparison.OrdinalIgnoreCase))
                continue;

            decimal rawAmt = p.Amount > 0 ? p.Amount : p.AmountPaid;
            decimal amt = normDept != null ? Math.Round(rawAmt * share, 2) : rawAmt;
            if (normDept != null && amt <= 0) continue;

            invoiceMeta.TryGetValue(p.InvoiceId, out var invRow);
            string? invNo = invRow?.InvoiceNumber;

            results.Add(new EnrichedPaymentRow
            {
                PaymentId = p.PaymentId,
                InvoiceId = p.InvoiceId,
                InvoiceNumber = !string.IsNullOrWhiteSpace(invNo) ? invNo : $"INV-{p.InvoiceId}",
                PaymentMode = canonicalMode,
                PaymentMethod = p.PaymentMethod,
                Amount = amt,
                TransactionReference = p.TransactionReference ?? p.TxnReference,
                PaymentStatus = p.PaymentStatus,
                PaidAt = p.PaidAt
            });
        }

        return results;
    }

    public async Task<ExportDocument> GeneratePaymentsExportAsync(DateTime? fromDate, DateTime? toDate, string? method, string? department = null)
    {
        var (start, end) = ResolveOptionalDateRange(fromDate, toDate);
        var normDept = NormalizeDepartment(department);
        string deptLabel = normDept ?? "All";

        var list = await GetEnrichedPaymentsAsync(fromDate, toDate, method, normDept);

        decimal totalAmount = 0m;
        decimal cashTotal = 0m;
        decimal upiTotal = 0m;
        decimal cardTotal = 0m;
        decimal otherTotal = 0m;

        var rows = new List<List<object?>>();
        int idx = 1;

        foreach (var p in list)
        {
            if (IsPaymentStatusSuccessful(p.PaymentStatus))
            {
                totalAmount += p.Amount;
                if (p.PaymentMode == "CASH") cashTotal += p.Amount;
                else if (p.PaymentMode == "UPI") upiTotal += p.Amount;
                else if (p.PaymentMode == "CARD") cardTotal += p.Amount;
                else otherTotal += p.Amount;
            }

            rows.Add(new List<object?>
            {
                idx++,
                $"PMT-{p.PaymentId}",
                p.InvoiceNumber,
                p.PaymentMode,
                p.Amount,
                p.TransactionReference ?? "—",
                p.PaymentStatus.ToUpperInvariant(),
                p.PaidAt
            });
        }

        var kpis = new Dictionary<string, string>
        {
            { "Total Collections", $"₹{totalAmount:N2}" },
            { "Cash Collections", $"₹{cashTotal:N2}" },
            { "UPI Collections", $"₹{upiTotal:N2}" },
            { "Card Collections", $"₹{cardTotal:N2}" }
        };
        if (otherTotal > 0)
        {
            kpis["Wallet / Other Collections"] = $"₹{otherTotal:N2}";
        }

        var sheet = new ExportSheet
        {
            SheetName = "Payments",
            Title = $"HMS Settlement & Payment Transactions Register ({deptLabel})",
            Metadata = new Dictionary<string, string>
            {
                { "Period", FormatPeriodLabel(start, end) },
                { "Department Filter", deptLabel },
                { "Total Payments Recorded", list.Count.ToString() },
                { "Method Filter", method ?? "All" },
                { "Channel Sum Verification", $"Cash ₹{cashTotal:N2} + UPI ₹{upiTotal:N2} + Card ₹{cardTotal:N2} + Other ₹{otherTotal:N2} = ₹{totalAmount:N2}" }
            },
            SummaryKpis = kpis,
            Headers = new List<string>
            {
                "#", "Payment ID", "Invoice #", "Payment Mode", "Amount (₹)", "Transaction Reference", "Status", "Payment Date & Time"
            },
            Rows = rows,
            TotalsRow = new List<object?>
            {
                "TOTAL", $"{list.Count} Records", "—", "—", totalAmount, "—", "—", "—"
            }
        };

        string baseFile = normDept == null ? "Payments_Register" : $"Payments_Register_{deptLabel}";
        return new ExportDocument("Payment Transactions Register", baseFile, sheet);
    }

    #endregion

    #region 13. Orders Export

    public async Task<ExportDocument> GenerateOrdersExportAsync(DateTime? fromDate, DateTime? toDate, string? status, string? orderType, string? department = null)
    {
        var (start, end) = ResolveOptionalDateRange(fromDate, toDate);
        var normDept = NormalizeDepartment(department);

        var list = await LoadEnrichedOrdersAsync(start, end, status, orderType, normDept);

        bool explicitCancelled = !string.IsNullOrWhiteSpace(status) &&
                                 status.Equals("cancelled", StringComparison.OrdinalIgnoreCase);
        var kpiOrders = explicitCancelled
            ? list
            : list.Where(o => o.Status != "CANCELLED").ToList();

        decimal grandSubtotal = kpiOrders.Sum(o => o.Subtotal);
        decimal grandTax = kpiOrders.Sum(o => o.TaxAmount);
        decimal grandDiscount = kpiOrders.Sum(o => o.DiscountAmount);
        decimal grandTotal = kpiOrders.Sum(o => o.GrandTotal);

        var rows = list.Select((ord, idx) => new List<object?>
        {
            idx + 1,
            ord.OrderNumber,
            ord.OrderType,
            ord.TableName,
            ord.ServerName,
            ord.Guests,
            ord.ItemsCount,
            ord.Subtotal,
            ord.TaxAmount,
            ord.DiscountAmount,
            ord.GrandTotal,
            ord.Status,
            ord.PaymentMethod,
            ord.CreatedAt,
            ord.SettledAt
        }).ToList();

        var sheet = new ExportSheet
        {
            SheetName = "Orders History",
            Title = "HMS Restaurant Orders Master Log",
            Metadata = new Dictionary<string, string>
            {
                { "Period", FormatPeriodLabel(start, end) },
                { "Total Orders Count", list.Count.ToString() },
                { "Order Type Filter", orderType ?? "All" },
                { "Status Filter", status ?? "All" },
                { "Department Filter", normDept ?? "All" }
            },
            SummaryKpis = new Dictionary<string, string>
            {
                { "Total Order Revenue", $"₹{grandTotal:N2}" },
                { "Average Order Value", $"₹{(kpiOrders.Count > 0 ? Math.Round(grandTotal / kpiOrders.Count, 2) : 0m):N2}" },
                { "Total Items Ordered", $"{kpiOrders.Sum(o => o.ItemsCount)}" }
            },
            Headers = new List<string>
            {
                "#", "Order #", "Type", "Table", "Server", "Guests", "Items Count", "Subtotal (₹)", "GST (₹)", "Discount (₹)", "Grand Total (₹)", "Status", "Payment", "Created Timestamp", "Settled Timestamp"
            },
            Rows = rows,
            TotalsRow = new List<object?>
            {
                "TOTAL", $"{kpiOrders.Count} Active Orders", "—", "—", "—", kpiOrders.Sum(o => o.Guests), kpiOrders.Sum(o => o.ItemsCount), grandSubtotal, grandTax, grandDiscount, grandTotal, "—", "—", "—", "—"
            }
        };

        return new ExportDocument("Restaurant Orders Master Log", "Orders_Log", sheet);
    }

    #endregion

    #region 14. Dine Reports Export

    public async Task<ExportDocument> GenerateDineReportExportAsync(DateTime? fromDate, DateTime? toDate)
    {
        var (start, end) = ResolveOptionalDateRange(fromDate, toDate);

        var dineOrders = await LoadEnrichedOrdersAsync(start, end, department: "Dine", excludeCancelled: true);
        var dineInOrders = dineOrders.Where(o => o.OrderType.Equals("DineIn", StringComparison.OrdinalIgnoreCase)).ToList();
        var takeawayDineOrders = dineOrders.Where(o => !o.OrderType.Equals("DineIn", StringComparison.OrdinalIgnoreCase)).ToList();

        var tables = await _context.RestaurantTables.AsNoTracking()
            .Where(t => t.DeletedAt == null)
            .OrderBy(t => t.TableId)
            .ToListAsync();

        decimal totalRevenue = dineOrders.Sum(o => o.GrandTotal);
        decimal dineInRevenue = dineInOrders.Sum(o => o.GrandTotal);
        int totalOrders = dineOrders.Count;
        decimal avgTicket = totalOrders > 0 ? Math.Round(totalRevenue / totalOrders, 2) : 0m;

        var tableRows = tables.Select((t, idx) =>
        {
            var tableOrders = dineInOrders.Where(o =>
                o.TableId == t.TableId ||
                string.Equals(o.TableName, t.TableName, StringComparison.OrdinalIgnoreCase) ||
                string.Equals(o.TableName, t.TableNumber, StringComparison.OrdinalIgnoreCase)).ToList();

            decimal rev = tableOrders.Sum(o => o.GrandTotal);
            decimal avg = tableOrders.Count > 0 ? Math.Round(rev / tableOrders.Count, 2) : 0m;

            return new List<object?>
            {
                idx + 1,
                t.TableNumber,
                t.TableName,
                !string.IsNullOrWhiteSpace(t.Location) ? t.Location : t.SectionArea,
                t.CapacityChairs > 0 ? t.CapacityChairs : t.Capacity,
                tableOrders.Count,
                rev,
                avg
            };
        }).ToList();

        if (takeawayDineOrders.Count > 0)
        {
            decimal twRev = takeawayDineOrders.Sum(o => o.GrandTotal);
            tableRows.Add(new List<object?>
            {
                tableRows.Count + 1,
                "TAKEAWAY",
                "Takeaway Counter",
                "Direct Dispatch",
                0,
                takeawayDineOrders.Count,
                twRev,
                Math.Round(twRev / takeawayDineOrders.Count, 2)
            });
        }

        var doc = new ExportDocument
        {
            Title = "Dine-in Operations & Table Performance Report",
            BaseFileName = "Dine_Performance_Report"
        };

        var sheet1 = new ExportSheet
        {
            SheetName = "Table Performance",
            Title = "Dine-in Dining Tables Turnover & Revenue Performance",
            Metadata = new Dictionary<string, string>
            {
                { "Period", FormatPeriodLabel(start, end) },
                { "Total Dine Orders", totalOrders.ToString() },
                { "Dine-In Table Revenue", $"₹{dineInRevenue:N2}" },
                { "Total Dine Revenue (incl. Takeaway)", $"₹{totalRevenue:N2}" }
            },
            SummaryKpis = new Dictionary<string, string>
            {
                { "Total Dine Sales", $"₹{totalRevenue:N2}" },
                { "Total Dine Orders", $"{totalOrders}" },
                { "Average Dine Ticket", $"₹{avgTicket:N2}" }
            },
            Headers = new List<string> { "#", "Table #", "Table Name", "Section / Floor", "Capacity (Seats)", "Times Occupied", "Revenue Generated (₹)", "Avg Bill (₹)" },
            Rows = tableRows,
            TotalsRow = new List<object?>
            {
                "TOTAL", "—", "ALL DINE CHANNELS", "—", tables.Sum(t => t.CapacityChairs > 0 ? t.CapacityChairs : t.Capacity), totalOrders, totalRevenue, avgTicket
            }
        };
        doc.Sheets.Add(sheet1);

        // Sheet 2: Top Dine Dishes Sold
        var (barIds, menuByName) = await LoadMenuClassificationAsync();
        var itemQuery = _context.OrderItems.Include(i => i.Order).AsNoTracking()
            .Where(i => i.IsActive && !i.IsDeleted &&
                        i.KotStatus.ToLower() != "cancelled" &&
                        i.Order != null && i.Order.IsActive && !i.Order.IsDeleted &&
                        i.Order.Status.ToLower() != "cancelled" &&
                        (i.Order.FulfillmentStatus == null || i.Order.FulfillmentStatus.ToLower() != "cancelled"));
        if (start.HasValue) itemQuery = itemQuery.Where(i => i.CreatedAt >= start.Value);
        if (end.HasValue) itemQuery = itemQuery.Where(i => i.CreatedAt <= end.Value);

        var dineItems = (await itemQuery.ToListAsync())
            .Where(i => !IsBarOrderItem(i, barIds, menuByName))
            .ToList();

        var dishGroups = dineItems
            .GroupBy(i => i.Name)
            .Select(g => new
            {
                Name = g.Key,
                QuantitySold = g.Sum(x => x.Quantity),
                TotalRevenue = g.Sum(x => x.TotalPrice > 0 ? x.TotalPrice : x.Quantity * x.Price)
            })
            .OrderByDescending(x => x.TotalRevenue)
            .ToList();

        decimal dishesRevenue = dishGroups.Sum(d => d.TotalRevenue);
        var sheet2 = new ExportSheet
        {
            SheetName = "Dine Item Sales",
            Title = "Dine-in Top Selling Food Dishes",
            Headers = new List<string> { "#", "Dish Name", "Quantity Sold", "Item Revenue (₹)", "Share %" },
            Rows = dishGroups.Select((d, idx) => new List<object?>
            {
                idx + 1,
                d.Name,
                d.QuantitySold,
                d.TotalRevenue,
                dishesRevenue > 0 ? Math.Round((d.TotalRevenue / dishesRevenue) * 100m, 2) : 0m
            }).ToList(),
            TotalsRow = new List<object?>
            {
                "TOTAL", "ALL DINE DISHES", dishGroups.Sum(d => d.QuantitySold), dishesRevenue, dishesRevenue > 0 ? 100.00m : 0.00m
            }
        };
        doc.Sheets.Add(sheet2);

        return doc;
    }

    #endregion

    #region 15. Bar Reports Export

    public async Task<ExportDocument> GenerateBarReportExportAsync(DateTime? fromDate, DateTime? toDate)
    {
        var (start, end) = ResolveOptionalDateRange(fromDate, toDate);
        var (barIds, menuByName) = await LoadMenuClassificationAsync();

        var itemQuery = _context.OrderItems.Include(i => i.Order).AsNoTracking()
            .Where(i => i.IsActive && !i.IsDeleted &&
                        i.KotStatus.ToLower() != "cancelled" &&
                        i.Order != null && i.Order.IsActive && !i.Order.IsDeleted &&
                        i.Order.Status.ToLower() != "cancelled" &&
                        (i.Order.FulfillmentStatus == null || i.Order.FulfillmentStatus.ToLower() != "cancelled"));
        if (start.HasValue) itemQuery = itemQuery.Where(i => i.CreatedAt >= start.Value);
        if (end.HasValue) itemQuery = itemQuery.Where(i => i.CreatedAt <= end.Value);

        var allItems = await itemQuery.ToListAsync();
        var barItems = allItems.Where(i => IsBarOrderItem(i, barIds, menuByName)).ToList();

        decimal totalDrinkSales = barItems.Sum(i => i.TotalPrice > 0 ? i.TotalPrice : i.Quantity * i.Price);
        int totalDrinkQuantity = barItems.Sum(i => i.Quantity);

        var drinkGroups = barItems
            .GroupBy(i => i.Name)
            .Select(g => new
            {
                Name = g.Key,
                QuantitySold = g.Sum(i => i.Quantity),
                TotalRevenue = g.Sum(i => i.TotalPrice > 0 ? i.TotalPrice : i.Quantity * i.Price)
            })
            .OrderByDescending(g => g.TotalRevenue)
            .ToList();

        var rows = drinkGroups.Select((d, idx) => new List<object?>
        {
            idx + 1,
            d.Name,
            d.QuantitySold,
            d.TotalRevenue,
            totalDrinkSales > 0 ? Math.Round((d.TotalRevenue / totalDrinkSales) * 100m, 2) : 0m
        }).ToList();

        var barScreen = await _barService.GetBarReportsScreenAsync();

        var doc = new ExportDocument
        {
            Title = "Bar & Lounge Operations & Beverage Sales Report",
            BaseFileName = "Bar_Reports"
        };

        var sheet1 = new ExportSheet
        {
            SheetName = "Bar KPI Summary",
            Title = "Bar Operations KPI Summary",
            Metadata = new Dictionary<string, string>
            {
                { "Period", FormatPeriodLabel(start, end) },
                { "Generated At", DateTime.UtcNow.ToString("yyyy-MM-dd HH:mm UTC") }
            },
            SummaryKpis = new Dictionary<string, string>
            {
                { "Active Beverage Orders", barScreen.ActiveBeverageOrders.ToString() },
                { "Menu Beverage Items", barScreen.MenuBeverageItems.ToString() },
                { "Period Beverage Revenue", $"₹{totalDrinkSales:N2}" },
                { "Drinks Served in Period", totalDrinkQuantity.ToString() }
            },
            Headers = new List<string> { "Report Metric", "Value", "Source / Notes" },
            Rows = new List<List<object?>>
            {
                new() { "Active Beverage Orders", barScreen.ActiveBeverageOrders, "Shared active orders" },
                new() { "Menu Beverage Items", barScreen.MenuBeverageItems, "Active bar drinks catalog" },
                new() { "Beverage Inventory Items", barScreen.BeverageInventoryRecords, "Tracked ingredients & liquor stock" },
                new() { "Period Beverage Sales (₹)", totalDrinkSales, $"From {totalDrinkQuantity} served drinks in period" },
                new() { "Unique Beverage SKUs Sold", drinkGroups.Count, "Distinct drink items ordered" }
            }
        };
        doc.Sheets.Add(sheet1);

        var sheet2 = new ExportSheet
        {
            SheetName = "Beverage Sales",
            Title = "Bar & Lounge Beverage Sales Breakdown",
            Headers = new List<string> { "#", "Beverage / Drink Name", "Quantity Sold", "Total Revenue (₹)", "Revenue Share %" },
            Rows = rows,
            TotalsRow = new List<object?>
            {
                "TOTAL", "ALL DRINK ITEMS", totalDrinkQuantity, totalDrinkSales, totalDrinkSales > 0 ? 100.00m : 0.00m
            }
        };
        doc.Sheets.Add(sheet2);

        return doc;
    }

    #endregion

    #region 16. Master Financial Reports Export

    public async Task<ExportDocument> GenerateFinancialReportExportAsync(DateTime? fromDate, DateTime? toDate, string? department = null)
    {
        var (start, end) = ResolveOptionalDateRange(fromDate, toDate);
        var normDept = NormalizeDepartment(department);
        string deptLabel = normDept ?? "All";
        bool isBar = normDept == "Bar";

        var invoices = await LoadEnrichedInvoicesAsync(start, end, normDept, excludeVoid: true);

        var ingredients = await _context.Ingredients.AsNoTracking().Where(i => i.IsActive).ToListAsync();
        if (isBar)
            ingredients = ingredients.Where(i => DrinkCategoryHelper.IsDrinkCategory(i.Category)).ToList();
        else if (normDept == "Dine")
            ingredients = ingredients.Where(i => !DrinkCategoryHelper.IsDrinkCategory(i.Category)).ToList();

        decimal plIncome = invoices.Sum(i => i.TotalAmount); // Invoices.TotalAmount is already net of discounts
        decimal grossFoodSales = invoices.Sum(i => i.Subtotal);
        decimal totalTax = invoices.Sum(i => i.TaxAmount);
        decimal totalService = invoices.Sum(i => i.ServiceChargeAmount);
        decimal totalDiscount = invoices.Sum(i => i.DiscountAmount);
        decimal grossBeforeDiscounts = plIncome + totalDiscount;
        decimal totalInventoryCost = ingredients.Sum(i => i.CurrentStock * (i.UnitCost > 0 ? i.UnitCost : (i.CostPerUnit ?? 0m)));

        var purchaseQuery = _context.InventoryPurchases.AsNoTracking();
        if (start.HasValue) purchaseQuery = purchaseQuery.Where(p => p.PurchaseDate >= start.Value);
        if (end.HasValue) purchaseQuery = purchaseQuery.Where(p => p.PurchaseDate <= end.Value);
        var purchases = await purchaseQuery.ToListAsync();
        if (isBar)
            purchases = purchases.Where(p => IsBarDepartmentName(p.Department)).ToList();
        else if (normDept == "Dine")
            purchases = purchases.Where(p => !IsBarDepartmentName(p.Department)).ToList();

        var salaryQuery = _context.SalaryPayments.AsNoTracking()
            .Where(s => s.Amount > 0 && s.Status.ToLower() != "void" && s.Status.ToLower() != "cancelled");
        if (start.HasValue) salaryQuery = salaryQuery.Where(s => s.PaymentDate >= start.Value);
        if (end.HasValue) salaryQuery = salaryQuery.Where(s => s.PaymentDate <= end.Value);
        var salaries = await salaryQuery.ToListAsync();
        if (isBar)
            salaries = salaries.Where(s => IsBarDepartmentName(s.Department)).ToList();
        else if (normDept == "Dine")
            salaries = salaries.Where(s => !IsBarDepartmentName(s.Department)).ToList();

        decimal purchasesCost = purchases.Sum(p => p.TotalAmount);
        decimal salariesCost = salaries.Sum(s => s.Amount);
        decimal totalExpenditure = purchasesCost + salariesCost;
        decimal plNet = plIncome - totalExpenditure;
        bool isProfit = plNet >= 0;
        decimal profitMarginPercent = plIncome > 0 ? Math.Round((plNet / plIncome) * 100m, 2) : 0m;

        var doc = new ExportDocument
        {
            Title = isBar ? "BAR FINANCIAL PERFORMANCE REPORT" : $"FINANCIAL PERFORMANCE REPORT ({deptLabel})",
            BaseFileName = $"Financial_Report_{deptLabel}"
        };

        var summarySheet = new ExportSheet
        {
            SheetName = "Executive Summary",
            Title = $"EXECUTIVE FINANCIAL SUMMARY ({deptLabel})",
            Metadata = new Dictionary<string, string>
            {
                { "Period", FormatPeriodLabel(start, end) },
                { "Generated At", DateTime.UtcNow.ToString("yyyy-MM-dd HH:mm UTC") },
                { "Department", deptLabel }
            },
            SummaryKpis = new Dictionary<string, string>
            {
                { "Total Income (Sales)", FormatSignedInr(plIncome) },
                { "Total Expenditure", FormatSignedInr(totalExpenditure) },
                { isProfit ? "Net Profit" : "Net Loss", FormatSignedInr(plNet) },
                { "Stock Valuation", FormatSignedInr(totalInventoryCost) }
            },
            Headers = new List<string> { "Metric", "Amount (INR ₹)", "Notes" },
            Rows = new List<List<object?>>
            {
                new() { "Total Income (Sales)", plIncome, $"Net billed revenue across {invoices.Count} settled invoices" },
                new() { "Food & Beverage Menu Subtotal", grossFoodSales, "Excluding taxes, service charge & discounts" },
                new() { "GST / Tax Collected", totalTax, "Tax liability" },
                new() { "Service Charges Revenue", totalService, "Service charge component" },
                new() { "Gross Billed Before Discounts", grossBeforeDiscounts, "Gross amount prior to discount deductions" },
                new() { "Bill Discounts Given", totalDiscount, "Promotions & reductions (deducted in Total Income)" },
                new() { "Total Inventory Stock Valuation", totalInventoryCost, $"{ingredients.Count} items evaluated at unit cost" },
                new() { "Inventory Purchases (COGS)", purchasesCost, $"{purchases.Count} purchase transactions in period" },
                new() { "Staff Payroll & Salaries", salariesCost, $"{salaries.Count} salary disbursements in period" },
                new() { "Total Operating Expenditure", totalExpenditure, "Inventory purchases + Staff payroll" },
                new() { $"Net Operating {(isProfit ? "Profit" : "Loss")}", plNet, $"Operating Margin: {profitMarginPercent:F2}%" }
            }
        };
        doc.Sheets.Add(summarySheet);

        var ordersSheet = new ExportSheet
        {
            SheetName = "Settled Orders",
            Title = $"SETTLED INVOICES IN PERIOD ({invoices.Count} Invoices)",
            Headers = new List<string> { "#", "Invoice #", "Date & Time", "Table", "Payment Method", "Subtotal (₹)", "Tax (₹)", "Discount (₹)", "Grand Total (₹)" },
            Rows = invoices.Select((inv, idx) => new List<object?>
            {
                idx + 1,
                inv.InvoiceNumber,
                inv.CreatedAt,
                inv.TableName,
                inv.PaymentMethod,
                inv.Subtotal,
                inv.TaxAmount,
                inv.DiscountAmount,
                inv.TotalAmount
            }).ToList(),
            TotalsRow = new List<object?>
            {
                "TOTAL", $"{invoices.Count} Invoices", "—", "—", "—", grossFoodSales, totalTax, totalDiscount, plIncome
            }
        };
        doc.Sheets.Add(ordersSheet);

        var invSheet = new ExportSheet
        {
            SheetName = "Stock Valuation",
            Title = $"INVENTORY INGREDIENT VALUATION ({ingredients.Count} Items)",
            Headers = new List<string> { "#", "Ingredient / Item", "Category", "Supplier", "Stock", "Unit", "Min Threshold", "Unit Cost (₹)", "Total Valuation (₹)", "Status" },
            Rows = ingredients.Select((it, idx) =>
            {
                decimal cost = it.UnitCost > 0 ? it.UnitCost : (it.CostPerUnit ?? 0m);
                decimal val = it.CurrentStock * cost;
                string status = it.CurrentStock <= 0 ? "Out of Stock" : (it.CurrentStock <= it.MinimumThreshold ? "Low Stock" : "In Stock");

                return new List<object?>
                {
                    idx + 1,
                    it.Name,
                    it.Category ?? "General",
                    it.Supplier ?? "Local Supplier",
                    it.CurrentStock,
                    it.Unit,
                    it.MinimumThreshold,
                    cost,
                    val,
                    status
                };
            }).ToList(),
            TotalsRow = new List<object?>
            {
                "TOTAL", $"{ingredients.Count} Items", "—", "—", ingredients.Sum(i => i.CurrentStock), "—", "—", "—", totalInventoryCost, "—"
            }
        };
        doc.Sheets.Add(invSheet);

        return doc;
    }

    #endregion
}
