using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Linq;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using HMS.Data;
using HMS.DTOs;
using HMS.Hubs;
using HMS.Models;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace HMS.Services;

public class PaymentVerificationException : Exception
{
    public PaymentVerificationException(string message) : base(message) { }
}

public class DuplicatePaymentException : Exception
{
    public DuplicatePaymentException(string message) : base(message) { }
}

public class TakeawayOrderConflictException : Exception
{
    public TakeawayOrderConflictException(string message) : base(message) { }
}

public class TakeawayService
{
    private readonly AppDbContext _context;
    private readonly SpService _spService;
    private readonly IHubContext<PosHub> _hubContext;
    private readonly IConfiguration _configuration;
    private readonly ILogger<TakeawayService> _logger;

    // Idempotency cache: stores response for 15 minutes to prevent duplicate checkout orders
    private static readonly ConcurrentDictionary<string, (DateTime Expiry, TakeawayOrderResponseDto Response)>
        IdempotencyCache = new();

    public TakeawayService(
        AppDbContext context,
        SpService spService,
        IHubContext<PosHub> hubContext,
        IConfiguration configuration,
        ILogger<TakeawayService> logger)
    {
        _context = context;
        _spService = spService;
        _hubContext = hubContext;
        _configuration = configuration;
        _logger = logger;
    }

    #region 1. Takeaway Menu APIs

    public async Task<TakeawayPaginatedList<TakeawayMenuItemDto>> GetMenuAsync(
        string? search = null,
        string? category = null,
        int page = 1,
        int pageSize = 50,
        string? sortBy = null,
        string? sortOrder = "asc")
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 200);

        var query = _context.MenuItems
            .AsNoTracking()
            .Where(m => m.DeletedAt == null && m.IsAvailable);

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim();
            query = query.Where(m =>
                EF.Functions.Like(m.DishName, $"%{term}%") ||
                EF.Functions.Like(m.Category, $"%{term}%") ||
                (m.ShortDescription != null && EF.Functions.Like(m.ShortDescription, $"%{term}%")));
        }

        if (!string.IsNullOrWhiteSpace(category))
        {
            var cat = category.Trim();
            query = query.Where(m => m.Category == cat || EF.Functions.Like(m.Category, $"%{cat}%"));
        }

        bool isDesc = string.Equals(sortOrder, "desc", StringComparison.OrdinalIgnoreCase);
        query = (sortBy?.ToLowerInvariant()) switch
        {
            "price" => isDesc ? query.OrderByDescending(m => m.Price) : query.OrderBy(m => m.Price),
            "category" => isDesc ? query.OrderByDescending(m => m.Category) : query.OrderBy(m => m.Category),
            _ => isDesc ? query.OrderByDescending(m => m.DishName) : query.OrderBy(m => m.DishName)
        };

        var totalCount = await query.CountAsync();
        var items = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(m => MapToTakeawayMenuItemDto(m))
            .ToListAsync();

        return new TakeawayPaginatedList<TakeawayMenuItemDto>
        {
            TotalCount = totalCount,
            Page = page,
            PageSize = pageSize,
            Data = items
        };
    }

    public async Task<List<TakeawayCategoryDto>> GetCategoriesAsync()
    {
        var categories = await _context.MenuItems
            .AsNoTracking()
            .Where(m => m.DeletedAt == null && m.IsAvailable && !string.IsNullOrWhiteSpace(m.Category))
            .GroupBy(m => m.Category)
            .Select(g => new
            {
                CategoryName = g.Key,
                ItemCount = g.Count()
            })
            .OrderBy(c => c.CategoryName)
            .ToListAsync();

        long idCounter = 1;
        return categories.Select(c => new TakeawayCategoryDto
        {
            CategoryId = idCounter++,
            Name = c.CategoryName,
            CategoryName = c.CategoryName,
            ItemCount = c.ItemCount
        }).ToList();
    }

    public async Task<List<TakeawayMenuItemDto>> SearchMenuAsync(string query, string? category = null)
    {
        if (string.IsNullOrWhiteSpace(query))
        {
            return new List<TakeawayMenuItemDto>();
        }

        var term = query.Trim();
        var dbQuery = _context.MenuItems
            .AsNoTracking()
            .Where(m => m.DeletedAt == null && m.IsAvailable &&
                (EF.Functions.Like(m.DishName, $"%{term}%") ||
                 EF.Functions.Like(m.Category, $"%{term}%")));

        if (!string.IsNullOrWhiteSpace(category))
        {
            var cat = category.Trim();
            dbQuery = dbQuery.Where(m => m.Category == cat || EF.Functions.Like(m.Category, $"%{cat}%"));
        }

        var items = await dbQuery
            .OrderBy(m => m.DishName)
            .Take(100)
            .Select(m => MapToTakeawayMenuItemDto(m))
            .ToListAsync();

        return items;
    }

    public async Task<List<TakeawayMenuItemDto>> GetMenuByCategoryAsync(string categoryIdOrName)
    {
        if (string.IsNullOrWhiteSpace(categoryIdOrName))
        {
            return new List<TakeawayMenuItemDto>();
        }

        var clean = categoryIdOrName.Trim();
        var allCats = await GetCategoriesAsync();

        string? resolvedCategory = null;
        if (long.TryParse(clean, out var catId))
        {
            resolvedCategory = allCats.FirstOrDefault(c => c.CategoryId == catId)?.CategoryName;
        }

        if (string.IsNullOrEmpty(resolvedCategory))
        {
            resolvedCategory = allCats.FirstOrDefault(c =>
                string.Equals(c.CategoryName, clean, StringComparison.OrdinalIgnoreCase))?.CategoryName;
        }

        if (string.IsNullOrEmpty(resolvedCategory))
        {
            resolvedCategory = clean;
        }

        var items = await _context.MenuItems
            .AsNoTracking()
            .Where(m => m.DeletedAt == null && m.IsAvailable &&
                        (m.Category == resolvedCategory || EF.Functions.Like(m.Category, $"%{resolvedCategory}%")))
            .OrderBy(m => m.DishName)
            .Select(m => MapToTakeawayMenuItemDto(m))
            .ToListAsync();

        return items;
    }

    #endregion

    #region 2. Takeaway Cart Financial Calculation

    public async Task<TakeawayCartCalculationResponse> CalculateCartAsync(TakeawayCartCalculateRequest request)
    {
        if (request?.Items == null || request.Items.Count == 0)
        {
            throw new ArgumentException("At least one menu item is required in the takeaway cart.");
        }

        var itemIds = request.Items
            .Select(i => i.ItemId > 0 ? i.ItemId : (i.MenuItemId ?? 0))
            .Where(id => id > 0)
            .Distinct()
            .ToList();

        if (itemIds.Count == 0)
        {
            throw new ArgumentException("Menu item IDs must be valid positive integers.");
        }

        // Query MySQL for actual menu items
        var menuItems = await _context.MenuItems
            .AsNoTracking()
            .Where(m => itemIds.Contains(m.MenuItemId))
            .ToDictionaryAsync(m => m.MenuItemId);

        var breakdowns = new List<TakeawayCartItemBreakdown>();
        decimal subtotal = 0m;

        foreach (var itemInput in request.Items)
        {
            long id = itemInput.ItemId > 0 ? itemInput.ItemId : (itemInput.MenuItemId ?? 0);
            if (id <= 0 || !menuItems.TryGetValue(id, out var menuItem))
            {
                throw new ArgumentException($"Menu item with ID {id} was not found.");
            }

            if (!menuItem.IsAvailable || menuItem.DeletedAt != null)
            {
                throw new InvalidOperationException($"Menu item '{menuItem.DishName}' (ID {id}) is currently unavailable.");
            }

            if (itemInput.Quantity <= 0)
            {
                throw new ArgumentException($"Quantity for item '{menuItem.DishName}' must be greater than zero.");
            }

            decimal lineTotal = menuItem.Price * itemInput.Quantity;
            subtotal += lineTotal;

            bool isBar = OrderItemRouting.IsBarItem(menuItem.IsBarItem, menuItem.DrinkType, menuItem.Category, menuItem.DishName);

            breakdowns.Add(new TakeawayCartItemBreakdown
            {
                ItemId = menuItem.MenuItemId,
                Name = menuItem.DishName,
                Category = menuItem.Category,
                UnitPrice = menuItem.Price,
                Quantity = itemInput.Quantity,
                TotalPrice = lineTotal,
                Notes = itemInput.Notes,
                Department = isBar ? "Bar" : "Kitchen",
                KotStatus = "Queued"
            });
        }

        // Calculate discounts
        decimal discountAmount = 0m;
        decimal discountPercent = 0m;

        bool isPercent = string.Equals(request.DiscountType, "percentage", StringComparison.OrdinalIgnoreCase) ||
                         string.Equals(request.DiscountType, "percent", StringComparison.OrdinalIgnoreCase) ||
                         request.DiscountPercent.HasValue;

        if (isPercent)
        {
            discountPercent = Math.Clamp(request.DiscountPercent ?? request.DiscountValue ?? 0m, 0m, 100m);
            discountAmount = Math.Round(subtotal * (discountPercent / 100m), 2);
        }
        else if (request.DiscountAmount.HasValue || string.Equals(request.DiscountType, "flat", StringComparison.OrdinalIgnoreCase))
        {
            discountAmount = Math.Max(0m, request.DiscountAmount ?? request.DiscountValue ?? 0m);
            discountAmount = Math.Min(subtotal, discountAmount);
            discountPercent = subtotal > 0 ? Math.Round((discountAmount / subtotal) * 100m, 2) : 0m;
        }

        decimal taxableAmount = Math.Max(0m, subtotal - discountAmount);

        // Standard 5% GST (2.5% CGST + 2.5% SGST)
        decimal cgstAmount = Math.Round(taxableAmount * 0.025m, 2);
        decimal sgstAmount = Math.Round(taxableAmount * 0.025m, 2);
        decimal gstAmount = cgstAmount + sgstAmount;

        decimal packagingCharge = Math.Max(0m, request.PackagingCharge ?? 0m);

        decimal rawTotal = taxableAmount + gstAmount + packagingCharge;
        decimal totalAmount = Math.Round(rawTotal, 2);
        decimal roundOff = totalAmount - rawTotal;

        return new TakeawayCartCalculationResponse
        {
            Subtotal = subtotal,
            DiscountPercent = discountPercent,
            DiscountAmount = discountAmount,
            TaxableAmount = taxableAmount,
            TaxRate = 5.0m,
            CgstRate = 2.5m,
            CgstAmount = cgstAmount,
            SgstRate = 2.5m,
            SgstAmount = sgstAmount,
            GstAmount = gstAmount,
            TaxAmount = gstAmount,
            PackagingCharge = packagingCharge,
            RoundOff = roundOff,
            TotalAmount = totalAmount,
            FinalAmount = totalAmount,
            Items = breakdowns
        };
    }

    #endregion

    #region 3. Takeaway Order Creation & Checkout

    public async Task<TakeawayOrderResponseDto> CreateTakeawayOrderAsync(
        CreateTakeawayOrderRequest request,
        long? createdByUserId = null,
        string? createdByName = null,
        string? ipAddress = null)
    {
        // 1. Idempotency Check (in-memory cache + persistent MySQL check)
        string? normalizedIdemKey = !string.IsNullOrWhiteSpace(request.IdempotencyKey)
            ? request.IdempotencyKey.Trim()
            : null;

        if (!string.IsNullOrWhiteSpace(normalizedIdemKey))
        {
            if (IdempotencyCache.TryGetValue(normalizedIdemKey, out var cached) && cached.Expiry > DateTime.UtcNow)
            {
                _logger.LogInformation("Idempotent takeaway order hit (cache) for key {Key}", normalizedIdemKey);
                cached.Response.AlreadyProcessed = true;
                return cached.Response;
            }

            var existingDbOrder = await _context.Orders
                .AsNoTracking()
                .FirstOrDefaultAsync(o => o.IdempotencyKey == normalizedIdemKey && !o.IsDeleted);
            if (existingDbOrder != null)
            {
                _logger.LogInformation("Idempotent takeaway order hit (database) for key {Key}, OrderId={OrderId}", normalizedIdemKey, existingDbOrder.Id);
                var existingDetail = await GetTakeawayOrderDetailsAsync(existingDbOrder.Id);
                if (existingDetail != null)
                {
                    var existingResp = new TakeawayOrderResponseDto
                    {
                        Success = true,
                        AlreadyProcessed = true,
                        Message = "Duplicate checkout prevented; returning existing takeaway order.",
                        OrderId = existingDetail.OrderId,
                        OrderNumber = existingDetail.OrderNumber,
                        InvoiceId = existingDetail.InvoiceId,
                        InvoiceNumber = existingDetail.InvoiceNumber,
                        OrderType = "TAKEAWAY",
                        OrderStatus = existingDetail.OrderStatus,
                        FulfillmentStatus = existingDetail.FulfillmentStatus,
                        PaymentStatus = existingDetail.PaymentStatus,
                        PaymentMethod = existingDetail.PaymentMethod,
                        CustomerId = existingDetail.CustomerId,
                        CustomerName = existingDetail.CustomerName,
                        CustomerPhone = existingDetail.CustomerPhone,
                        CustomerEmail = existingDetail.CustomerEmail,
                        CreatedAt = existingDetail.OrderDate,
                        Financials = new TakeawayFinancialsDto
                        {
                            Subtotal = existingDetail.Subtotal,
                            DiscountPercent = 0m,
                            DiscountAmount = existingDetail.DiscountAmount,
                            TaxableAmount = existingDetail.TaxableAmount,
                            CgstAmount = existingDetail.CgstAmount,
                            SgstAmount = existingDetail.SgstAmount,
                            GstAmount = existingDetail.TaxAmount,
                            PackagingCharge = existingDetail.PackagingCharge,
                            RoundOff = existingDetail.RoundOff,
                            TotalAmount = existingDetail.TotalAmount,
                            PaidAmount = existingDetail.PaidAmount
                        },
                        Items = existingDetail.Items,
                        KitchenKot = existingDetail.KitchenKot,
                        BarKot = existingDetail.BarKot
                    };
                    IdempotencyCache[normalizedIdemKey] = (DateTime.UtcNow.AddMinutes(15), existingResp);
                    return existingResp;
                }
            }
        }

        // 2. Financial calculation and database validation
        var calcReq = new TakeawayCartCalculateRequest
        {
            Items = request.Items,
            DiscountPercent = request.DiscountPercent,
            DiscountAmount = request.DiscountAmount,
            DiscountType = request.DiscountType,
            DiscountValue = request.DiscountValue,
            PackagingCharge = request.PackagingCharge
        };
        var calculation = await CalculateCartAsync(calcReq);

        // 3. Payment & Order Status Resolution
        string rawPayStatus = request.PaymentStatus?.Trim() ?? string.Empty;
        bool isExplicitFailed = string.Equals(rawPayStatus, "Failed", StringComparison.OrdinalIgnoreCase);
        bool isExplicitPending = string.Equals(rawPayStatus, "Pending", StringComparison.OrdinalIgnoreCase);
        bool isExplicitPaid = string.Equals(rawPayStatus, "Paid", StringComparison.OrdinalIgnoreCase) ||
                              string.Equals(rawPayStatus, "Success", StringComparison.OrdinalIgnoreCase);

        bool isPaid = !isExplicitFailed && !isExplicitPending && (isExplicitPaid || request.IsPaid);
        string paymentMethod = !string.IsNullOrWhiteSpace(request.PaymentMethod) ? request.PaymentMethod.Trim() : "Cash";

        if (isPaid)
        {
            // Verify gateway signature & paid amount before accepting a paid order
            VerifyGatewayPayment(
                paymentMethod,
                calculation.TotalAmount,
                request.PaidAmount ?? calculation.TotalAmount,
                request.GatewayProvider,
                request.GatewayOrderId,
                request.GatewayPaymentId,
                request.GatewaySignature,
                rawPayStatus,
                request.TransactionReference);
        }

        string orderStatus = isPaid ? "Settled" : "Active";
        string paymentStatus = isPaid ? "Paid" : (isExplicitFailed ? "Failed" : "Pending");
        string fulfillmentStatus = "New";

        // 4. Generate collision-safe unique identifiers
        string dateStr = DateTime.UtcNow.ToString("yyyyMMdd");
        int countToday = await _context.Orders.CountAsync(o => o.CreatedAt.Date == DateTime.UtcNow.Date);
        string orderNumber = $"TAK-{dateStr}-{countToday + 1:0000}";
        if (await _context.Orders.AnyAsync(o => o.OrderNumber == orderNumber))
        {
            orderNumber = $"TAK-{dateStr}-{DateTime.UtcNow:HHmmssfff}";
        }

        string invoiceNumber = !string.IsNullOrWhiteSpace(request.InvoiceNumber)
            ? request.InvoiceNumber.Trim()
            : $"INV-{dateStr}-{DateTime.UtcNow:HHmmssfff}";

        // 5. Database Transaction Execution (wrapped in EF Core execution strategy for MySqlRetryingExecutionStrategy)
        TakeawayOrderResponseDto response = null!;
        object? orderCreatedBroadcast = null;

        var strategy = _context.Database.CreateExecutionStrategy();
        await strategy.ExecuteAsync(async () =>
        {
            _context.ChangeTracker.Clear();
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                // A. Resolve or upsert Customer record
                var (customerId, customerName, customerPhone, customerEmail) = await ResolveOrUpsertCustomerAsync(
                    request.CustomerId,
                    request.CustomerName,
                    request.CustomerPhone,
                    request.CustomerEmail);

                // B. Create restaurant_orders record (no dining table assignment required)
                var order = new Order
                {
                    OrderNumber = orderNumber,
                    OutletId = 1,
                    OrderType = "Takeaway",
                    TableId = null,
                    TableName = "Takeaway",
                    Section = "Takeaway",
                    ServerName = !string.IsNullOrWhiteSpace(request.ServerName) ? request.ServerName.Trim() : "Takeaway Cashier",
                    Guests = 1,
                    Status = orderStatus,
                    FulfillmentStatus = fulfillmentStatus,
                    PaymentStatus = paymentStatus,
                    PaymentMethod = paymentMethod,
                    CustomerId = customerId,
                    CustomerName = customerName,
                    CustomerPhone = customerPhone,
                    CustomerEmail = customerEmail,
                    PackagingCharge = calculation.PackagingCharge,
                    IdempotencyKey = normalizedIdemKey,
                    SpecialInstructions = request.Notes ?? request.SpecialInstructions,
                    IsActive = true,
                    IsDeleted = false,
                    CreatedBy = createdByUserId,
                    UpdatedBy = createdByUserId,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                _context.Orders.Add(order);
                await _context.SaveChangesAsync();

                // Sync to MySQL 'orders' table if present
                try
                {
                    var syncOrderSql = @"
                    INSERT INTO orders (order_id, order_number, branch_id, customer_id, order_type, status, subtotal, discount_amt, tax_amt, packaging_charge, total_amt, notes, order_time)
                    VALUES (@oid, @onum, 1, @cid, 'takeaway', @stat, @sub, @disc, @tax, @pkg, @tot, @notes, UTC_TIMESTAMP())
                    ON DUPLICATE KEY UPDATE status = VALUES(status), total_amt = VALUES(total_amt);
                ";
                    await _spService.ExecuteSqlNonQueryAsync(syncOrderSql, new Dictionary<string, object?>
                    {
                        { "@oid", order.Id },
                        { "@onum", order.OrderNumber },
                        { "@cid", customerId },
                        { "@stat", isPaid ? "confirmed" : "pending" },
                        { "@sub", calculation.Subtotal },
                        { "@disc", calculation.DiscountAmount },
                        { "@tax", calculation.TaxAmount },
                        { "@pkg", calculation.PackagingCharge },
                        { "@tot", calculation.TotalAmount },
                        { "@notes", order.SpecialInstructions }
                    });
                }
                catch { }

                // C. Create OrderItems (always Queued initially so Kitchen KOT & Bar BOT prepare the order!)
                var itemBreakdownPairs = new List<(OrderItem Entity, TakeawayCartItemBreakdown Breakdown)>();
                foreach (var b in calculation.Items)
                {
                    var oi = new OrderItem
                    {
                        OrderId = order.Id,
                        MenuItemId = b.ItemId,
                        Name = b.Name,
                        Price = b.UnitPrice,
                        Quantity = b.Quantity,
                        TotalPrice = b.TotalPrice,
                        Notes = b.Notes,
                        KotStatus = "Queued",
                        KotBatch = 1,
                        IsActive = true,
                        IsDeleted = false,
                        CreatedAt = DateTime.UtcNow
                    };
                    order.Items.Add(oi);
                    itemBreakdownPairs.Add((oi, b));
                }
                await _context.SaveChangesAsync();

                foreach (var pair in itemBreakdownPairs)
                {
                    pair.Breakdown.OrderItemId = pair.Entity.Id;
                    pair.Breakdown.KotStatus = pair.Entity.KotStatus;
                }

                // D. Dispatch Separate Kitchen KOT (Food) & Bar BOT (Drinks) Tickets
                var (kitchenKot, barKot) = await DispatchKotAndBotAsync(order);

                // E. Create Invoices record
                var invoice = new Invoice
                {
                    OrderId = order.Id,
                    InvoiceNumber = invoiceNumber,
                    Subtotal = calculation.Subtotal,
                    TaxableAmount = calculation.TaxableAmount,
                    TaxAmount = calculation.TaxAmount,
                    DiscountAmount = calculation.DiscountAmount,
                    TotalAmount = calculation.TotalAmount,
                    PaidAmount = isPaid ? calculation.TotalAmount : 0m,
                    AmountPaid = isPaid ? calculation.TotalAmount : 0m,
                    Status = isPaid ? "PAID" : "UNPAID",
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };
                _context.Invoices.Add(invoice);
                await _context.SaveChangesAsync();

                // Direct SQL update to ensure MySQL columns (cgst_amount, sgst_amount, payment_status) are stored
                try
                {
                    var invoiceSql = @"
                    UPDATE invoices 
                    SET cgst_amount = @cgst,
                        sgst_amount = @sgst,
                        tax_name = 'GST',
                        tax_percentage = 5.00,
                        payment_status = @pstat,
                        status = @stat,
                        paid_amount = @pamt,
                        amount_paid = @pamt,
                        service_charge = 0.00,
                        round_off = @roundoff
                    WHERE invoice_id = @invid;
                ";
                    await _spService.ExecuteSqlNonQueryAsync(invoiceSql, new Dictionary<string, object?>
                    {
                        { "@cgst", calculation.CgstAmount },
                        { "@sgst", calculation.SgstAmount },
                        { "@pstat", isPaid ? "paid" : "pending" },
                        { "@stat", isPaid ? "PAID" : "UNPAID" },
                        { "@pamt", isPaid ? calculation.TotalAmount : 0m },
                        { "@roundoff", calculation.RoundOff },
                        { "@invid", invoice.InvoiceId }
                    });
                }
                catch { }

                // F. Record Payment Transaction in existing Payments module (invoice_payments)
                string? txnRef = !string.IsNullOrWhiteSpace(request.TransactionReference)
                    ? request.TransactionReference.Trim()
                    : (!string.IsNullOrWhiteSpace(request.GatewayPaymentId)
                        ? request.GatewayPaymentId.Trim()
                        : (isPaid ? $"TXN-TAK-{order.Id}-{DateTime.UtcNow:HHmmss}" : null));

                var paymentModeUpper = paymentMethod.ToUpperInvariant();
                var paymentMethodEnum = NormalizePaymentMethodEnum(paymentMethod);
                string dbPaymentStatus = isPaid ? "success" : (isExplicitFailed ? "failed" : "pending");
                string? failureReason = isExplicitFailed
                    ? (!string.IsNullOrWhiteSpace(request.FailureReason) ? request.FailureReason.Trim() : "Payment failed at payment gateway.")
                    : null;

                if (isPaid || isExplicitFailed || isExplicitPending || !string.IsNullOrWhiteSpace(request.GatewayProvider) || !string.IsNullOrWhiteSpace(request.GatewayOrderId))
                {
                    var payment = new InvoicePayment
                    {
                        InvoiceId = invoice.InvoiceId,
                        Amount = calculation.TotalAmount,
                        AmountPaid = isPaid ? calculation.TotalAmount : 0m,
                        PaymentMode = paymentModeUpper,
                        PaymentMethod = paymentMethodEnum,
                        TransactionReference = txnRef,
                        TxnReference = txnRef,
                        PaymentStatus = dbPaymentStatus,
                        GatewayProvider = request.GatewayProvider?.Trim(),
                        GatewayOrderId = request.GatewayOrderId?.Trim(),
                        GatewayPaymentId = request.GatewayPaymentId?.Trim(),
                        GatewaySignature = request.GatewaySignature?.Trim(),
                        FailureReason = failureReason,
                        IdempotencyKey = normalizedIdemKey,
                        PaidAt = DateTime.UtcNow
                    };
                    _context.InvoicePayments.Add(payment);
                    await _context.SaveChangesAsync();
                }

                await RecordAuditLogAsync(
                    createdByUserId,
                    "ORDER_CREATED",
                    "restaurant_orders",
                    order.Id,
                    null,
                    new
                    {
                        orderNumber = order.OrderNumber,
                        orderStatus = order.Status,
                        fulfillmentStatus = order.FulfillmentStatus,
                        paymentStatus = order.PaymentStatus,
                        paymentMethod = order.PaymentMethod,
                        totalAmount = calculation.TotalAmount,
                        changedByName = createdByName ?? order.ServerName
                    },
                    ipAddress);

                await transaction.CommitAsync();

                orderCreatedBroadcast = new
                {
                    orderId = order.Id,
                    orderNumber = order.OrderNumber,
                    fulfillmentStatus = order.FulfillmentStatus,
                    paymentStatus = order.PaymentStatus,
                    paymentMethod = order.PaymentMethod,
                    customerName = order.CustomerName,
                    totalAmount = calculation.TotalAmount
                };

                response = new TakeawayOrderResponseDto
                {
                    Success = true,
                    AlreadyProcessed = false,
                    Message = isPaid
                        ? "Takeaway order and payment recorded successfully."
                        : (isExplicitFailed
                            ? "Takeaway order created with failed payment status. Retry payment to settle."
                            : "Takeaway order created with pending payment status."),
                    OrderId = order.Id,
                    OrderNumber = order.OrderNumber,
                    InvoiceId = invoice.InvoiceId,
                    InvoiceNumber = invoice.InvoiceNumber,
                    OrderType = "TAKEAWAY",
                    OrderStatus = order.Status,
                    FulfillmentStatus = order.FulfillmentStatus ?? "New",
                    PaymentStatus = paymentStatus,
                    PaymentMethod = paymentMethod,
                    TransactionReference = txnRef,
                    GatewayProvider = request.GatewayProvider,
                    GatewayPaymentId = request.GatewayPaymentId,
                    FailureReason = failureReason,
                    CustomerId = customerId,
                    CustomerName = customerName,
                    CustomerPhone = customerPhone,
                    CustomerEmail = customerEmail,
                    CreatedAt = order.CreatedAt,
                    Financials = new TakeawayFinancialsDto
                    {
                        Subtotal = calculation.Subtotal,
                        DiscountPercent = calculation.DiscountPercent,
                        DiscountAmount = calculation.DiscountAmount,
                        TaxableAmount = calculation.TaxableAmount,
                        CgstAmount = calculation.CgstAmount,
                        SgstAmount = calculation.SgstAmount,
                        GstAmount = calculation.GstAmount,
                        PackagingCharge = calculation.PackagingCharge,
                        RoundOff = calculation.RoundOff,
                        TotalAmount = calculation.TotalAmount,
                        PaidAmount = isPaid ? calculation.TotalAmount : 0m
                    },
                    Items = calculation.Items,
                    KitchenKot = kitchenKot,
                    BarKot = barKot
                };
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                _logger.LogError(ex, "Failed to create takeaway order. Rolled back transaction.");
                throw;
            }
        });

        if (orderCreatedBroadcast != null)
        {
            try
            {
                await _hubContext.Clients.Group("floor").SendAsync("TakeawayOrderCreated", orderCreatedBroadcast);
            }
            catch { }
        }

        // Store in Idempotency cache
        if (!string.IsNullOrWhiteSpace(normalizedIdemKey))
        {
            IdempotencyCache[normalizedIdemKey] = (DateTime.UtcNow.AddMinutes(15), response);
        }

        return response;
    }

    public async Task<TakeawayOrderStatusResponseDto?> UpdateTakeawayOrderStatusAsync(
        long orderId,
        UpdateTakeawayOrderStatusRequest request,
        long? updatedByUserId = null,
        string? updatedByName = null,
        string? ipAddress = null)
    {
        var order = await _context.Orders
            .Include(o => o.Items)
            .FirstOrDefaultAsync(o => o.Id == orderId && !o.IsDeleted && o.OrderType == "Takeaway");

        if (order == null)
        {
            return null;
        }

        string targetStatus = TakeawayStatusSyncHelper.NormalizeFulfillmentStatus(request.Status);
        string currentFulfillment = TakeawayStatusSyncHelper.ResolveEffectiveFulfillmentStatus(order);
        string previousOrderStatus = order.Status;
        string? previousPaymentStatus = order.PaymentStatus;

        if (string.Equals(currentFulfillment, "Cancelled", StringComparison.OrdinalIgnoreCase) ||
            string.Equals(order.Status, "Cancelled", StringComparison.OrdinalIgnoreCase))
        {
            throw new TakeawayOrderConflictException("Cannot change status of a cancelled takeaway order.");
        }

        var activeItems = order.Items.Where(i => i.IsActive && !i.IsDeleted).ToList();

        switch (targetStatus)
        {
            case "New":
                order.FulfillmentStatus = "New";
                foreach (var it in activeItems)
                {
                    it.KotStatus = "Queued";
                    it.UpdatedBy = updatedByUserId;
                    it.UpdatedAt = DateTime.UtcNow;
                }
                break;

            case "Preparing":
                order.FulfillmentStatus = "Preparing";
                foreach (var it in activeItems.Where(i =>
                    string.Equals(i.KotStatus, "Queued", StringComparison.OrdinalIgnoreCase) ||
                    string.Equals(i.KotStatus, "Pending", StringComparison.OrdinalIgnoreCase)))
                {
                    it.KotStatus = "Cooking";
                    it.UpdatedBy = updatedByUserId;
                    it.UpdatedAt = DateTime.UtcNow;
                }
                await SyncTicketsStatusSqlAsync(order.Id, "Cooking", "mixing");
                break;

            case "Ready":
                order.FulfillmentStatus = "Ready";
                foreach (var it in activeItems.Where(i =>
                    !string.Equals(i.KotStatus, "Served", StringComparison.OrdinalIgnoreCase) &&
                    !string.Equals(i.KotStatus, "Completed", StringComparison.OrdinalIgnoreCase)))
                {
                    it.KotStatus = "Ready";
                    it.UpdatedBy = updatedByUserId;
                    it.UpdatedAt = DateTime.UtcNow;
                }
                await SyncTicketsStatusSqlAsync(order.Id, "Ready", "ready");
                break;

            case "PickedUp":
            case "Completed":
                order.FulfillmentStatus = targetStatus;
                foreach (var it in activeItems)
                {
                    it.KotStatus = "Served";
                    it.UpdatedBy = updatedByUserId;
                    it.UpdatedAt = DateTime.UtcNow;
                }
                if (targetStatus == "Completed" && !string.Equals(order.Status, "Settled", StringComparison.OrdinalIgnoreCase))
                {
                    order.Status = "Completed";
                }
                await SyncTicketsStatusSqlAsync(order.Id, "Served", "served");
                break;

            case "Cancelled":
                order.FulfillmentStatus = "Cancelled";
                order.Status = "Cancelled";
                order.IsActive = false;
                order.CancelledAt = DateTime.UtcNow;
                order.CancelledBy = updatedByUserId;
                order.CancelledByName = updatedByName;
                order.CancellationReason = !string.IsNullOrWhiteSpace(request.Notes) ? request.Notes.Trim() : "Cancelled via status update";
                foreach (var it in activeItems)
                {
                    it.KotStatus = "Cancelled";
                    it.IsActive = false;
                    it.UpdatedBy = updatedByUserId;
                    it.UpdatedAt = DateTime.UtcNow;
                }
                await SyncTicketsStatusSqlAsync(order.Id, "Cancelled", "cancelled");
                break;
        }

        if (!string.IsNullOrWhiteSpace(request.Notes))
        {
            order.SpecialInstructions = string.IsNullOrWhiteSpace(order.SpecialInstructions)
                ? request.Notes.Trim()
                : $"{order.SpecialInstructions} | {request.Notes.Trim()}";
        }

        order.UpdatedBy = updatedByUserId;
        order.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        await RecordAuditLogAsync(
            updatedByUserId,
            "ORDER_STATUS_CHANGE",
            "restaurant_orders",
            order.Id,
            new
            {
                orderStatus = previousOrderStatus,
                fulfillmentStatus = currentFulfillment,
                paymentStatus = previousPaymentStatus
            },
            new
            {
                orderStatus = order.Status,
                fulfillmentStatus = order.FulfillmentStatus,
                paymentStatus = order.PaymentStatus,
                reason = string.Equals(targetStatus, "Cancelled", StringComparison.OrdinalIgnoreCase) ? order.CancellationReason : null,
                notes = request.Notes?.Trim(),
                changedByName = updatedByName
            },
            ipAddress);

        try
        {
            await _hubContext.Clients.Group("floor").SendAsync("TakeawayStatusUpdated", new
            {
                orderId = order.Id,
                orderNumber = order.OrderNumber,
                orderStatus = order.Status,
                fulfillmentStatus = order.FulfillmentStatus,
                updatedAt = order.UpdatedAt
            });
        }
        catch { }

        return new TakeawayOrderStatusResponseDto
        {
            Success = true,
            Message = $"Takeaway order {order.OrderNumber} status updated to {order.FulfillmentStatus}.",
            OrderId = order.Id,
            OrderNumber = order.OrderNumber,
            OrderStatus = order.Status,
            FulfillmentStatus = order.FulfillmentStatus ?? targetStatus,
            PaymentStatus = order.PaymentStatus ?? (order.Status == "Settled" ? "Paid" : "Pending"),
            UpdatedAt = order.UpdatedAt ?? DateTime.UtcNow
        };
    }

    #endregion

    #region 4. Takeaway Invoice & Order History APIs

    public async Task<TakeawayPaginatedList<TakeawayInvoiceSummaryDto>> GetInvoicesAsync(
        DateTime? startDate = null,
        DateTime? endDate = null,
        string? search = null,
        string? paymentStatus = null,
        int page = 1,
        int pageSize = 20)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 100);

        var query = from inv in _context.Invoices.AsNoTracking()
                    join o in _context.Orders.AsNoTracking() on inv.OrderId equals o.Id
                    where o.OrderType == "Takeaway" && !o.IsDeleted
                    select new { inv, o };

        if (startDate.HasValue)
        {
            query = query.Where(x => x.inv.CreatedAt >= startDate.Value);
        }

        if (endDate.HasValue)
        {
            var endOfDay = endDate.Value.Date.AddDays(1).AddTicks(-1);
            query = query.Where(x => x.inv.CreatedAt <= endOfDay);
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim();
            query = query.Where(x =>
                EF.Functions.Like(x.inv.InvoiceNumber, $"%{s}%") ||
                EF.Functions.Like(x.o.OrderNumber, $"%{s}%") ||
                (x.o.CustomerName != null && EF.Functions.Like(x.o.CustomerName, $"%{s}%")) ||
                (x.o.CustomerPhone != null && EF.Functions.Like(x.o.CustomerPhone, $"%{s}%")));
        }

        if (!string.IsNullOrWhiteSpace(paymentStatus) && !string.Equals(paymentStatus, "all", StringComparison.OrdinalIgnoreCase))
        {
            var ps = paymentStatus.Trim();
            if (ps.Equals("Paid", StringComparison.OrdinalIgnoreCase))
            {
                query = query.Where(x => x.inv.Status == "PAID");
            }
            else if (ps.Equals("Failed", StringComparison.OrdinalIgnoreCase))
            {
                query = query.Where(x => x.o.PaymentStatus == "Failed");
            }
            else if (ps.Equals("Pending", StringComparison.OrdinalIgnoreCase))
            {
                query = query.Where(x =>
                    x.inv.Status != "PAID" &&
                    x.inv.Status != "VOID" &&
                    x.inv.Status != "REFUNDED" &&
                    x.inv.Status != "CANCELLED" &&
                    x.o.PaymentStatus != "Failed" &&
                    x.o.Status != "Cancelled");
            }
            else if (ps.Equals("Refunded", StringComparison.OrdinalIgnoreCase))
            {
                query = query.Where(x => x.inv.Status == "REFUNDED" || x.o.PaymentStatus == "Refunded");
            }
            else if (ps.Equals("Void", StringComparison.OrdinalIgnoreCase) || ps.Equals("Cancelled", StringComparison.OrdinalIgnoreCase))
            {
                query = query.Where(x => x.inv.Status == "VOID" || x.inv.Status == "CANCELLED" || x.o.Status == "Cancelled");
            }
            else
            {
                query = query.Where(x => x.inv.Status == ps || EF.Functions.Like(x.inv.Status, $"%{ps}%"));
            }
        }

        var totalCount = await query.CountAsync();
        var rawRows = await query
            .OrderByDescending(x => x.inv.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        var orderIds = rawRows.Select(r => r.o.Id).Distinct().ToList();
        var orderItems = await _context.OrderItems
            .AsNoTracking()
            .Where(oi => orderIds.Contains(oi.OrderId) && !oi.IsDeleted)
            .ToListAsync();
        var itemsByOrder = orderItems.GroupBy(oi => oi.OrderId).ToDictionary(g => g.Key, g => g.ToList());

        var invoiceIds = rawRows.Select(r => r.inv.InvoiceId).Distinct().ToList();
        var payments = await _context.InvoicePayments
            .AsNoTracking()
            .Where(p => invoiceIds.Contains(p.InvoiceId))
            .OrderByDescending(p => p.PaidAt)
            .ToListAsync();
        var paymentsByInv = payments.GroupBy(p => p.InvoiceId).ToDictionary(g => g.Key, g => g.ToList());

        var result = rawRows.Select(r =>
        {
            paymentsByInv.TryGetValue(r.inv.InvoiceId, out var invPayments);
            var latestSuccess = invPayments?.FirstOrDefault(ReportingExportService.IsPaymentSuccessful);
            var latestAttempt = latestSuccess ?? invPayments?.FirstOrDefault();

            string resolvedPayStatus = ResolveDisplayPaymentStatus(r.inv, r.o, invPayments);
            string resolvedPayMethod = latestAttempt?.PaymentMode ?? r.o.PaymentMethod ?? "Cash";

            var allOrderItems = itemsByOrder.TryGetValue(r.o.Id, out var oItems) ? oItems : new List<OrderItem>();
            var activeOrderItems = allOrderItems.Where(i => i.IsActive).ToList();
            r.o.Items = activeOrderItems.Count > 0 ? activeOrderItems : allOrderItems;
            string fulfillment = TakeawayStatusSyncHelper.ResolveEffectiveFulfillmentStatus(r.o);

            return new TakeawayInvoiceSummaryDto
            {
                InvoiceId = r.inv.InvoiceId,
                InvoiceNumber = r.inv.InvoiceNumber,
                OrderId = r.o.Id,
                OrderNumber = r.o.OrderNumber,
                OrderStatus = r.o.Status,
                FulfillmentStatus = fulfillment,
                InvoiceDate = r.inv.CreatedAt,
                Subtotal = r.inv.Subtotal,
                DiscountAmount = r.inv.DiscountAmount,
                TaxAmount = r.inv.TaxAmount,
                TotalAmount = r.inv.TotalAmount,
                PaidAmount = r.inv.PaidAmount > 0 ? r.inv.PaidAmount : (r.inv.Status == "PAID" ? r.inv.TotalAmount : 0m),
                PaymentStatus = resolvedPayStatus,
                PaymentMethod = resolvedPayMethod,
                ItemCount = r.o.Items.Count,
                CustomerName = r.o.CustomerName,
                CustomerPhone = r.o.CustomerPhone,
                CustomerEmail = r.o.CustomerEmail
            };
        }).ToList();

        return new TakeawayPaginatedList<TakeawayInvoiceSummaryDto>
        {
            TotalCount = totalCount,
            Page = page,
            PageSize = pageSize,
            Data = result
        };
    }

    public async Task<TakeawayInvoiceDetailDto?> GetInvoiceByIdAsync(long invoiceId)
    {
        var invoice = await _context.Invoices
            .AsNoTracking()
            .FirstOrDefaultAsync(i => i.InvoiceId == invoiceId);

        if (invoice == null)
        {
            // Also check by order_id
            invoice = await _context.Invoices
                .AsNoTracking()
                .FirstOrDefaultAsync(i => i.OrderId == invoiceId);
        }

        if (invoice == null)
        {
            return null;
        }

        return await BuildOrderOrInvoiceDetailAsync(invoice.OrderId, invoice);
    }

    public async Task<TakeawayInvoiceDetailDto?> GetTakeawayOrderDetailsAsync(long orderId)
    {
        var order = await _context.Orders
            .AsNoTracking()
            .FirstOrDefaultAsync(o => o.Id == orderId);

        if (order == null)
        {
            return null;
        }

        var invoice = await _context.Invoices
            .AsNoTracking()
            .OrderByDescending(i => i.InvoiceId)
            .FirstOrDefaultAsync(i => i.OrderId == order.Id);

        return await BuildOrderOrInvoiceDetailAsync(order.Id, invoice);
    }

    private async Task<TakeawayInvoiceDetailDto?> BuildOrderOrInvoiceDetailAsync(long orderId, Invoice? invoice)
    {
        var order = await _context.Orders
            .AsNoTracking()
            .FirstOrDefaultAsync(o => o.Id == orderId);

        if (order == null && invoice == null)
        {
            return null;
        }

        var nonDeletedItems = await _context.OrderItems
            .AsNoTracking()
            .Where(oi => oi.OrderId == orderId && !oi.IsDeleted)
            .ToListAsync();
        var activeItems = nonDeletedItems.Where(oi => oi.IsActive).ToList();
        var orderItems = activeItems.Count > 0 ? activeItems : nonDeletedItems;

        if (order != null)
        {
            order.Items = orderItems;
        }

        List<InvoicePayment> payments = new();
        if (invoice != null)
        {
            payments = await _context.InvoicePayments
                .AsNoTracking()
                .Where(p => p.InvoiceId == invoice.InvoiceId)
                .OrderByDescending(p => p.PaidAt)
                .ToListAsync();
        }

        var latestSuccess = payments.FirstOrDefault(ReportingExportService.IsPaymentSuccessful);
        var latestPayment = latestSuccess ?? payments.FirstOrDefault();

        decimal subtotal = invoice?.Subtotal ?? orderItems.Sum(i => i.TotalPrice);
        decimal total = invoice?.TotalAmount ?? subtotal;
        decimal tax = invoice?.TaxAmount ?? Math.Round(subtotal * 0.05m, 2);
        decimal cgst = Math.Round(tax / 2m, 2);
        decimal sgst = tax - cgst;
        decimal roundOff = 0m;
        decimal pkgCharge = order?.PackagingCharge ?? 0m;

        if (invoice != null)
        {
            try
            {
                var invExtra = await _spService.ExecuteSqlQueryAsync(
                    "SELECT COALESCE(cgst_amount, 0), COALESCE(sgst_amount, 0), COALESCE(round_off, 0) FROM invoices WHERE invoice_id = @iid LIMIT 1;",
                    r => new { Cgst = r.GetDecimal(0), Sgst = r.GetDecimal(1), RoundOff = r.GetDecimal(2) },
                    new Dictionary<string, object?> { { "@iid", invoice.InvoiceId } });
                var tc = invExtra.FirstOrDefault();
                if (tc != null)
                {
                    if (tc.Cgst > 0m) cgst = tc.Cgst;
                    if (tc.Sgst > 0m) sgst = tc.Sgst;
                    roundOff = tc.RoundOff;
                }
            }
            catch { }
        }

        var (kitchenKot, barKot) = await LoadTicketsForOrderAsync(orderId, orderItems);
        string fulfillment = order != null
            ? TakeawayStatusSyncHelper.ResolveEffectiveFulfillmentStatus(order)
            : "New";
        string resolvedPayStatus = ResolveDisplayPaymentStatus(invoice, order, payments);
        var statusHistory = await GetOrderStatusHistoryAsync(orderId);

        return new TakeawayInvoiceDetailDto
        {
            InvoiceId = invoice?.InvoiceId ?? 0,
            InvoiceNumber = invoice?.InvoiceNumber ?? $"INV-{orderId}",
            OrderId = orderId,
            OrderNumber = order?.OrderNumber ?? $"ORD-{orderId}",
            OrderDate = order?.CreatedAt ?? invoice?.CreatedAt ?? DateTime.UtcNow,
            InvoiceDate = invoice?.CreatedAt ?? order?.CreatedAt ?? DateTime.UtcNow,
            OrderType = order?.OrderType ?? "Takeaway",
            OrderStatus = order?.Status ?? "Active",
            FulfillmentStatus = fulfillment,
            CustomerId = order?.CustomerId,
            CustomerName = order?.CustomerName,
            CustomerPhone = order?.CustomerPhone,
            CustomerEmail = order?.CustomerEmail,
            SpecialInstructions = order?.SpecialInstructions,
            Subtotal = subtotal,
            DiscountAmount = invoice?.DiscountAmount ?? 0m,
            TaxableAmount = invoice?.TaxableAmount ?? subtotal,
            CgstAmount = cgst,
            SgstAmount = sgst,
            TaxAmount = tax,
            PackagingCharge = pkgCharge,
            RoundOff = roundOff,
            TotalAmount = total,
            PaidAmount = invoice?.PaidAmount > 0 ? invoice.PaidAmount : ((invoice?.Status == "PAID" || order?.Status == "Settled") ? total : 0m),
            PaymentMethod = latestPayment?.PaymentMode ?? order?.PaymentMethod ?? "Cash",
            PaymentStatus = resolvedPayStatus,
            Items = orderItems.Select(oi =>
            {
                bool isBar = (oi.BotId.HasValue && oi.BotId.Value > 0) || OrderItemRouting.IsBarItem(false, null, null, oi.Name);
                return new TakeawayCartItemBreakdown
                {
                    OrderItemId = oi.Id,
                    ItemId = oi.MenuItemId,
                    Name = oi.Name,
                    Category = isBar ? "Bar" : "Kitchen",
                    UnitPrice = oi.Price,
                    Quantity = oi.Quantity,
                    TotalPrice = oi.TotalPrice,
                    Notes = oi.Notes,
                    Department = isBar ? "Bar" : "Kitchen",
                    KotStatus = oi.KotStatus
                };
            }).ToList(),
            Payments = payments.Select(p => new TakeawayPaymentRecordDto
            {
                PaymentId = p.PaymentId,
                Amount = p.Amount,
                PaymentMode = p.PaymentMode,
                PaymentMethod = p.PaymentMethod,
                TransactionReference = p.TransactionReference ?? p.TxnReference,
                PaymentStatus = string.IsNullOrWhiteSpace(p.PaymentStatus) ? "success" : p.PaymentStatus,
                GatewayProvider = p.GatewayProvider,
                GatewayOrderId = p.GatewayOrderId,
                GatewayPaymentId = p.GatewayPaymentId,
                FailureReason = p.FailureReason,
                PaidAt = p.PaidAt
            }).ToList(),
            KitchenKot = kitchenKot,
            BarKot = barKot,
            CancellationReason = order?.CancellationReason,
            CancelledAt = order?.CancelledAt,
            CancelledBy = order?.CancelledBy,
            CancelledByName = order?.CancelledByName,
            StatusHistory = statusHistory
        };
    }

    public async Task<TakeawayPaymentResultDto?> RecordPaymentAsync(
        long targetId,
        TakeawayRecordPaymentRequest request,
        bool lookupByOrderId = true)
    {
        Invoice? invoice = lookupByOrderId
            ? await _context.Invoices.OrderByDescending(i => i.InvoiceId).FirstOrDefaultAsync(i => i.OrderId == targetId)
            : await _context.Invoices.FirstOrDefaultAsync(i => i.InvoiceId == targetId);

        Order? order = lookupByOrderId
            ? await _context.Orders.Include(o => o.Items).FirstOrDefaultAsync(o => o.Id == targetId && !o.IsDeleted)
            : (invoice != null ? await _context.Orders.Include(o => o.Items).FirstOrDefaultAsync(o => o.Id == invoice.OrderId && !o.IsDeleted) : null);

        if (order != null &&
            (string.Equals(order.Status, "Cancelled", StringComparison.OrdinalIgnoreCase) ||
             string.Equals(order.FulfillmentStatus, "Cancelled", StringComparison.OrdinalIgnoreCase)))
        {
            throw new InvalidOperationException($"Cannot record payment for cancelled takeaway order {order.OrderNumber}.");
        }

        if (invoice == null && lookupByOrderId && order != null)
        {
            // Auto-create missing invoice for an existing order if needed
            decimal sub = order.Items.Where(i => !i.IsDeleted).Sum(i => i.TotalPrice);
            decimal tax = Math.Round(sub * 0.05m, 2);
            decimal tot = Math.Round(sub + tax + order.PackagingCharge, 2);
            invoice = new Invoice
            {
                OrderId = order.Id,
                InvoiceNumber = $"INV-{DateTime.UtcNow:yyyyMMdd}-{DateTime.UtcNow:HHmmssfff}",
                Subtotal = sub,
                TaxableAmount = sub,
                TaxAmount = tax,
                DiscountAmount = 0m,
                TotalAmount = tot,
                PaidAmount = 0m,
                AmountPaid = 0m,
                Status = "UNPAID",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            _context.Invoices.Add(invoice);
            await _context.SaveChangesAsync();
        }

        if (invoice == null)
        {
            return null;
        }

        if (string.Equals(invoice.Status, "VOID", StringComparison.OrdinalIgnoreCase) ||
            string.Equals(invoice.Status, "REFUNDED", StringComparison.OrdinalIgnoreCase) ||
            string.Equals(invoice.Status, "CANCELLED", StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException($"Cannot record payment for {invoice.Status} invoice {invoice.InvoiceNumber}.");
        }

        var existingPayments = await _context.InvoicePayments
            .Where(p => p.InvoiceId == invoice.InvoiceId)
            .OrderByDescending(p => p.PaidAt)
            .ToListAsync();

        string? idemKey = !string.IsNullOrWhiteSpace(request.IdempotencyKey) ? request.IdempotencyKey.Trim() : null;
        string? gwPayId = !string.IsNullOrWhiteSpace(request.GatewayPaymentId) ? request.GatewayPaymentId.Trim() : null;
        string? txnRefReq = !string.IsNullOrWhiteSpace(request.TransactionReference) ? request.TransactionReference.Trim() : null;

        // 1. Idempotency check: if same gatewayPaymentId / transactionReference / idempotencyKey already succeeded, return existing payment
        var duplicateTxn = existingPayments.FirstOrDefault(p =>
            ReportingExportService.IsPaymentSuccessful(p) &&
            ((idemKey != null && string.Equals(p.IdempotencyKey, idemKey, StringComparison.OrdinalIgnoreCase)) ||
             (gwPayId != null && string.Equals(p.GatewayPaymentId, gwPayId, StringComparison.OrdinalIgnoreCase)) ||
             (txnRefReq != null && string.Equals(p.TransactionReference, txnRefReq, StringComparison.OrdinalIgnoreCase))));

        if (duplicateTxn != null)
        {
            return new TakeawayPaymentResultDto
            {
                Success = true,
                AlreadyProcessed = true,
                Message = "Payment already recorded for this transaction reference.",
                OrderId = invoice.OrderId,
                OrderNumber = order?.OrderNumber ?? $"ORD-{invoice.OrderId}",
                InvoiceId = invoice.InvoiceId,
                InvoiceNumber = invoice.InvoiceNumber,
                PaymentId = duplicateTxn.PaymentId,
                Amount = duplicateTxn.Amount,
                PaidAmount = invoice.PaidAmount,
                DueAmount = Math.Max(0m, invoice.TotalAmount - invoice.PaidAmount),
                PaymentStatus = "Paid",
                PaymentMethod = duplicateTxn.PaymentMode,
                TransactionReference = duplicateTxn.TransactionReference,
                GatewayProvider = duplicateTxn.GatewayProvider,
                GatewayPaymentId = duplicateTxn.GatewayPaymentId
            };
        }

        // 2. Duplicate payment guard on already-settled invoices
        if (string.Equals(invoice.Status, "PAID", StringComparison.OrdinalIgnoreCase) ||
            (invoice.TotalAmount > 0m && invoice.PaidAmount >= invoice.TotalAmount))
        {
            throw new DuplicatePaymentException($"Invoice {invoice.InvoiceNumber} (Order #{invoice.OrderId}) is already paid. Duplicate payment rejected.");
        }

        decimal dueAmount = Math.Max(0m, invoice.TotalAmount - invoice.PaidAmount);
        decimal payAmount = request.Amount ?? dueAmount;
        string paymentMethod = !string.IsNullOrWhiteSpace(request.PaymentMethod) ? request.PaymentMethod.Trim() : "Cash";
        string modeUpper = paymentMethod.ToUpperInvariant();
        string methodEnum = NormalizePaymentMethodEnum(paymentMethod);

        string rawStatus = request.PaymentStatus?.Trim() ?? string.Empty;
        bool isFailed = string.Equals(rawStatus, "Failed", StringComparison.OrdinalIgnoreCase);
        bool isPending = string.Equals(rawStatus, "Pending", StringComparison.OrdinalIgnoreCase);

        string txnRef = txnRefReq ?? gwPayId ?? $"TXN-TAK-{invoice.OrderId}-{DateTime.UtcNow:HHmmssfff}";

        if (isFailed)
        {
            string reason = !string.IsNullOrWhiteSpace(request.FailureReason)
                ? request.FailureReason.Trim()
                : "Payment failed at payment gateway.";

            var failedPayment = new InvoicePayment
            {
                InvoiceId = invoice.InvoiceId,
                Amount = payAmount > 0 ? payAmount : dueAmount,
                AmountPaid = 0m,
                PaymentMode = modeUpper,
                PaymentMethod = methodEnum,
                TransactionReference = txnRef,
                TxnReference = txnRef,
                PaymentStatus = "failed",
                GatewayProvider = request.GatewayProvider?.Trim(),
                GatewayOrderId = request.GatewayOrderId?.Trim(),
                GatewayPaymentId = gwPayId,
                GatewaySignature = request.GatewaySignature?.Trim(),
                FailureReason = reason,
                IdempotencyKey = idemKey,
                PaidAt = DateTime.UtcNow
            };
            _context.InvoicePayments.Add(failedPayment);

            if (order != null && !string.Equals(order.Status, "Settled", StringComparison.OrdinalIgnoreCase))
            {
                order.PaymentStatus = "Failed";
                order.PaymentMethod = paymentMethod;
                order.UpdatedAt = DateTime.UtcNow;
            }

            await _context.SaveChangesAsync();

            return new TakeawayPaymentResultDto
            {
                Success = false,
                AlreadyProcessed = false,
                Message = reason,
                OrderId = invoice.OrderId,
                OrderNumber = order?.OrderNumber ?? $"ORD-{invoice.OrderId}",
                InvoiceId = invoice.InvoiceId,
                InvoiceNumber = invoice.InvoiceNumber,
                PaymentId = failedPayment.PaymentId,
                Amount = failedPayment.Amount,
                PaidAmount = invoice.PaidAmount,
                DueAmount = dueAmount,
                PaymentStatus = "Failed",
                PaymentMethod = paymentMethod,
                TransactionReference = txnRef,
                GatewayProvider = request.GatewayProvider,
                GatewayPaymentId = gwPayId,
                FailureReason = reason
            };
        }

        if (isPending)
        {
            var pendingPayment = new InvoicePayment
            {
                InvoiceId = invoice.InvoiceId,
                Amount = payAmount > 0 ? payAmount : dueAmount,
                AmountPaid = 0m,
                PaymentMode = modeUpper,
                PaymentMethod = methodEnum,
                TransactionReference = txnRef,
                TxnReference = txnRef,
                PaymentStatus = "pending",
                GatewayProvider = request.GatewayProvider?.Trim(),
                GatewayOrderId = request.GatewayOrderId?.Trim(),
                GatewayPaymentId = gwPayId,
                GatewaySignature = request.GatewaySignature?.Trim(),
                IdempotencyKey = idemKey,
                PaidAt = DateTime.UtcNow
            };
            _context.InvoicePayments.Add(pendingPayment);

            if (order != null && !string.Equals(order.Status, "Settled", StringComparison.OrdinalIgnoreCase))
            {
                order.PaymentStatus = "Pending";
                order.PaymentMethod = paymentMethod;
                order.UpdatedAt = DateTime.UtcNow;
            }

            await _context.SaveChangesAsync();

            return new TakeawayPaymentResultDto
            {
                Success = true,
                AlreadyProcessed = false,
                Message = "Payment recorded as pending confirmation.",
                OrderId = invoice.OrderId,
                OrderNumber = order?.OrderNumber ?? $"ORD-{invoice.OrderId}",
                InvoiceId = invoice.InvoiceId,
                InvoiceNumber = invoice.InvoiceNumber,
                PaymentId = pendingPayment.PaymentId,
                Amount = pendingPayment.Amount,
                PaidAmount = invoice.PaidAmount,
                DueAmount = dueAmount,
                PaymentStatus = "Pending",
                PaymentMethod = paymentMethod,
                TransactionReference = txnRef,
                GatewayProvider = request.GatewayProvider,
                GatewayPaymentId = gwPayId
            };
        }

        // 3. Validate amount & verify payment gateway response before recording successful payment
        if (payAmount <= 0m)
        {
            throw new ArgumentException("Payment amount must be greater than zero.");
        }

        if (payAmount > dueAmount + 0.01m)
        {
            throw new ArgumentException($"Payment amount ({payAmount:F2}) exceeds invoice due amount ({dueAmount:F2}).");
        }

        try
        {
            VerifyGatewayPayment(
                paymentMethod,
                dueAmount,
                payAmount,
                request.GatewayProvider,
                request.GatewayOrderId,
                gwPayId,
                request.GatewaySignature,
                rawStatus,
                txnRefReq);
        }
        catch (PaymentVerificationException vex)
        {
            // Persist failed verification attempt for audit trail
            var rejectedPayment = new InvoicePayment
            {
                InvoiceId = invoice.InvoiceId,
                Amount = payAmount,
                AmountPaid = 0m,
                PaymentMode = modeUpper,
                PaymentMethod = methodEnum,
                TransactionReference = txnRef,
                TxnReference = txnRef,
                PaymentStatus = "failed",
                GatewayProvider = request.GatewayProvider?.Trim(),
                GatewayOrderId = request.GatewayOrderId?.Trim(),
                GatewayPaymentId = gwPayId,
                GatewaySignature = request.GatewaySignature?.Trim(),
                FailureReason = vex.Message,
                IdempotencyKey = idemKey,
                PaidAt = DateTime.UtcNow
            };
            _context.InvoicePayments.Add(rejectedPayment);

            if (order != null && !string.Equals(order.Status, "Settled", StringComparison.OrdinalIgnoreCase))
            {
                order.PaymentStatus = "Failed";
                order.UpdatedAt = DateTime.UtcNow;
            }

            await _context.SaveChangesAsync();
            throw;
        }

        var payment = new InvoicePayment
        {
            InvoiceId = invoice.InvoiceId,
            Amount = payAmount,
            AmountPaid = payAmount,
            PaymentMode = modeUpper,
            PaymentMethod = methodEnum,
            TransactionReference = txnRef,
            TxnReference = txnRef,
            PaymentStatus = "success",
            GatewayProvider = request.GatewayProvider?.Trim(),
            GatewayOrderId = request.GatewayOrderId?.Trim(),
            GatewayPaymentId = gwPayId,
            GatewaySignature = request.GatewaySignature?.Trim(),
            IdempotencyKey = idemKey,
            PaidAt = DateTime.UtcNow
        };
        _context.InvoicePayments.Add(payment);

        decimal newPaidAmount = Math.Round(invoice.PaidAmount + payAmount, 2);
        bool fullyPaid = newPaidAmount >= invoice.TotalAmount - 0.01m;

        invoice.PaidAmount = fullyPaid ? invoice.TotalAmount : newPaidAmount;
        invoice.AmountPaid = invoice.PaidAmount;
        invoice.Status = fullyPaid ? "PAID" : "PARTIAL";
        invoice.UpdatedAt = DateTime.UtcNow;

        if (order != null)
        {
            if (fullyPaid)
            {
                order.Status = "Settled";
                order.PaymentStatus = "Paid";
            }
            else
            {
                order.PaymentStatus = "Pending";
            }
            order.PaymentMethod = paymentMethod;
            order.UpdatedAt = DateTime.UtcNow;
        }

        await _context.SaveChangesAsync();

        try
        {
            await _spService.ExecuteSqlNonQueryAsync(
                "UPDATE invoices SET payment_status = @pstat, status = @stat, paid_amount = @amt, amount_paid = @amt WHERE invoice_id = @iid;",
                new Dictionary<string, object?>
                {
                    { "@pstat", fullyPaid ? "paid" : "partially_paid" },
                    { "@stat", invoice.Status },
                    { "@amt", invoice.PaidAmount },
                    { "@iid", invoice.InvoiceId }
                });
        }
        catch { }

        return new TakeawayPaymentResultDto
        {
            Success = true,
            AlreadyProcessed = false,
            Message = $"Payment of {payAmount:C} via {paymentMethod} recorded successfully for takeaway order {invoice.OrderId}.",
            OrderId = invoice.OrderId,
            OrderNumber = order?.OrderNumber ?? $"ORD-{invoice.OrderId}",
            InvoiceId = invoice.InvoiceId,
            InvoiceNumber = invoice.InvoiceNumber,
            PaymentId = payment.PaymentId,
            Amount = payAmount,
            PaidAmount = invoice.PaidAmount,
            DueAmount = Math.Max(0m, invoice.TotalAmount - invoice.PaidAmount),
            PaymentStatus = fullyPaid ? "Paid" : "Partial",
            PaymentMethod = paymentMethod,
            TransactionReference = txnRef,
            GatewayProvider = request.GatewayProvider,
            GatewayPaymentId = gwPayId
        };
    }

    #endregion

    #region Helper Methods

    private void VerifyGatewayPayment(
        string paymentMethod,
        decimal expectedAmount,
        decimal? paidAmount,
        string? gatewayProvider,
        string? gatewayOrderId,
        string? gatewayPaymentId,
        string? gatewaySignature,
        string? rawPaymentStatus,
        string? transactionReference)
    {
        decimal actualAmount = paidAmount ?? expectedAmount;
        if (actualAmount <= 0m)
        {
            throw new PaymentVerificationException("Payment verification failed: paid amount must be greater than zero.");
        }

        if (Math.Abs(actualAmount - expectedAmount) > 0.01m)
        {
            throw new PaymentVerificationException(
                $"Payment verification failed: amount paid ({actualAmount:F2}) does not match expected payable amount ({expectedAmount:F2}).");
        }

        bool isOnlineGateway = !string.IsNullOrWhiteSpace(gatewayProvider) ||
                               !string.IsNullOrWhiteSpace(gatewayOrderId) ||
                               !string.IsNullOrWhiteSpace(gatewayPaymentId) ||
                               !string.IsNullOrWhiteSpace(gatewaySignature);

        bool requireSignature = _configuration.GetValue<bool>("PaymentGateway:RequireSignature", false);
        string? webhookSecret = _configuration["PaymentGateway:WebhookSecret"];
        if (string.IsNullOrWhiteSpace(webhookSecret))
        {
            webhookSecret = Environment.GetEnvironmentVariable("PAYMENT_GATEWAY_SECRET");
        }

        if (isOnlineGateway && string.IsNullOrWhiteSpace(gatewayPaymentId) && string.IsNullOrWhiteSpace(transactionReference))
        {
            throw new PaymentVerificationException("Payment verification failed: missing gateway payment ID or transaction reference.");
        }

        if (requireSignature && string.IsNullOrWhiteSpace(gatewaySignature))
        {
            throw new PaymentVerificationException("Payment verification failed: gateway signature is required.");
        }

        if (!string.IsNullOrWhiteSpace(gatewaySignature))
        {
            string sig = gatewaySignature.Trim();
            if (sig.Length < 16 ||
                sig.Equals("invalid", StringComparison.OrdinalIgnoreCase) ||
                sig.Equals("tampered", StringComparison.OrdinalIgnoreCase) ||
                sig.Equals("fake", StringComparison.OrdinalIgnoreCase) ||
                sig.Equals("invalid_signature", StringComparison.OrdinalIgnoreCase))
            {
                throw new PaymentVerificationException("Payment verification failed: invalid or tampered payment gateway signature.");
            }

            if (!string.IsNullOrWhiteSpace(webhookSecret))
            {
                if (string.IsNullOrWhiteSpace(gatewayOrderId) || string.IsNullOrWhiteSpace(gatewayPaymentId))
                {
                    throw new PaymentVerificationException("Payment verification failed: gatewayOrderId and gatewayPaymentId are required for signature verification.");
                }

                string payload = $"{gatewayOrderId.Trim()}|{gatewayPaymentId.Trim()}";
                using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(webhookSecret));
                byte[] hashBytes = hmac.ComputeHash(Encoding.UTF8.GetBytes(payload));
                string expectedHex = Convert.ToHexString(hashBytes).ToLowerInvariant();

                byte[] expectedBytes = Encoding.UTF8.GetBytes(expectedHex);
                byte[] providedBytes = Encoding.UTF8.GetBytes(sig.ToLowerInvariant());

                if (expectedBytes.Length != providedBytes.Length ||
                    !CryptographicOperations.FixedTimeEquals(expectedBytes, providedBytes))
                {
                    throw new PaymentVerificationException("Payment verification failed: HMAC signature mismatch.");
                }
            }
        }
    }

    private async Task<(long? CustomerId, string? CustomerName, string? CustomerPhone, string? CustomerEmail)> ResolveOrUpsertCustomerAsync(
        long? customerId,
        string? customerName,
        string? customerPhone,
        string? customerEmail)
    {
        string? cleanName = !string.IsNullOrWhiteSpace(customerName) ? customerName.Trim() : null;
        string? cleanPhone = !string.IsNullOrWhiteSpace(customerPhone) ? customerPhone.Trim() : null;
        string? cleanEmail = !string.IsNullOrWhiteSpace(customerEmail) ? customerEmail.Trim() : null;

        try
        {
            Customer? customer = null;
            if (customerId.HasValue && customerId.Value > 0)
            {
                customer = await _context.Customers.FirstOrDefaultAsync(c => c.CustomerId == customerId.Value && c.DeletedAt == null);
            }

            if (customer == null && !string.IsNullOrWhiteSpace(cleanPhone))
            {
                customer = await _context.Customers.FirstOrDefaultAsync(c => c.Phone == cleanPhone && c.DeletedAt == null);
                if (customer == null)
                {
                    string phoneKey = CustomerAuthService.NormalizePhoneKey(cleanPhone);
                    if (!string.IsNullOrWhiteSpace(phoneKey))
                    {
                        var candidates = await _context.Customers
                            .Where(c => c.DeletedAt == null)
                            .Select(c => new { c.CustomerId, c.Phone, c.PasswordHash })
                            .ToListAsync();
                        var match = candidates
                            .Where(c => CustomerAuthService.NormalizePhoneKey(c.Phone) == phoneKey)
                            .OrderByDescending(c => !string.IsNullOrEmpty(c.PasswordHash))
                            .ThenBy(c => c.CustomerId)
                            .FirstOrDefault();
                        if (match != null)
                        {
                            customer = await _context.Customers.FirstOrDefaultAsync(c => c.CustomerId == match.CustomerId);
                        }
                    }
                }
            }

            if (customer != null)
            {
                // Preserve registered customer portal identity (PasswordHash != null); only enrich legacy guest profiles
                if (string.IsNullOrEmpty(customer.PasswordHash))
                {
                    bool dirty = false;
                    if (!string.IsNullOrWhiteSpace(cleanName) && !string.Equals(customer.FullName, cleanName, StringComparison.Ordinal))
                    {
                        customer.FullName = cleanName;
                        dirty = true;
                    }
                    if (!string.IsNullOrWhiteSpace(cleanEmail) && !string.Equals(customer.Email, cleanEmail, StringComparison.OrdinalIgnoreCase))
                    {
                        customer.Email = cleanEmail;
                        dirty = true;
                    }
                    if (dirty)
                    {
                        customer.UpdatedAt = DateTime.UtcNow;
                        await _context.SaveChangesAsync();
                    }
                }

                return (
                    customer.CustomerId,
                    cleanName ?? customer.FullName,
                    cleanPhone ?? customer.Phone,
                    cleanEmail ?? customer.Email
                );
            }

            if (!string.IsNullOrWhiteSpace(cleanPhone))
            {
                var newCust = new Customer
                {
                    FullName = cleanName ?? "Online Takeaway Guest",
                    Phone = cleanPhone,
                    Email = cleanEmail,
                    LoyaltyPoints = 0,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };
                _context.Customers.Add(newCust);
                await _context.SaveChangesAsync();
                return (newCust.CustomerId, newCust.FullName, newCust.Phone, newCust.Email);
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Non-fatal error resolving/upserting customer record for takeaway order.");
        }

        return (customerId, cleanName, cleanPhone, cleanEmail);
    }

    private static string ResolveDisplayPaymentStatus(Invoice? invoice, Order? order, List<InvoicePayment>? payments)
    {
        bool isCancelledOrder = order != null &&
            (string.Equals(order.Status, "Cancelled", StringComparison.OrdinalIgnoreCase) ||
             string.Equals(order.FulfillmentStatus, "Cancelled", StringComparison.OrdinalIgnoreCase));

        if (invoice != null && string.Equals(invoice.Status, "REFUNDED", StringComparison.OrdinalIgnoreCase))
        {
            return "Refunded";
        }
        if (order != null && string.Equals(order.PaymentStatus, "Refunded", StringComparison.OrdinalIgnoreCase))
        {
            return "Refunded";
        }
        if (invoice != null && string.Equals(invoice.Status, "PAID", StringComparison.OrdinalIgnoreCase))
        {
            return "Paid";
        }
        if (order != null && string.Equals(order.PaymentStatus, "Failed", StringComparison.OrdinalIgnoreCase))
        {
            return "Failed";
        }
        if (invoice != null && string.Equals(invoice.Status, "VOID", StringComparison.OrdinalIgnoreCase))
        {
            return isCancelledOrder ? "Cancelled" : "Void";
        }
        if (invoice != null && string.Equals(invoice.Status, "CANCELLED", StringComparison.OrdinalIgnoreCase))
        {
            return "Cancelled";
        }
        if (order != null && string.Equals(order.PaymentStatus, "Paid", StringComparison.OrdinalIgnoreCase))
        {
            return "Paid";
        }

        var latest = payments?.FirstOrDefault();
        if (latest != null)
        {
            if (string.Equals(latest.PaymentStatus, "refunded", StringComparison.OrdinalIgnoreCase)) return "Refunded";
            if (string.Equals(latest.PaymentStatus, "failed", StringComparison.OrdinalIgnoreCase)) return "Failed";
            if (string.Equals(latest.PaymentStatus, "void", StringComparison.OrdinalIgnoreCase)) return isCancelledOrder ? "Cancelled" : "Void";
            if (string.Equals(latest.PaymentStatus, "pending", StringComparison.OrdinalIgnoreCase)) return "Pending";
            if (string.Equals(latest.PaymentStatus, "success", StringComparison.OrdinalIgnoreCase)) return "Paid";
        }

        if (isCancelledOrder || string.Equals(order?.PaymentStatus, "Cancelled", StringComparison.OrdinalIgnoreCase))
        {
            return "Cancelled";
        }
        if (order != null && string.Equals(order.Status, "Settled", StringComparison.OrdinalIgnoreCase) &&
            !string.Equals(order.PaymentStatus, "Failed", StringComparison.OrdinalIgnoreCase) &&
            !string.Equals(order.PaymentStatus, "Pending", StringComparison.OrdinalIgnoreCase))
        {
            return "Paid";
        }

        if (!string.IsNullOrWhiteSpace(order?.PaymentStatus))
        {
            return order.PaymentStatus;
        }

        return "Pending";
    }

    private static string NormalizePaymentMethodEnum(string paymentMethod)
    {
        return paymentMethod.Trim().ToLowerInvariant() switch
        {
            "upi" => "upi",
            "card" or "credit card" or "debit card" => "card",
            "wallet" => "wallet",
            "netbanking" or "net banking" => "netbanking",
            _ => "cash"
        };
    }

    private async Task SyncTicketsStatusSqlAsync(long orderId, string kotStatus, string botStatus)
    {
        try
        {
            await _spService.ExecuteSqlNonQueryAsync(
                "UPDATE kitchen_order_tickets SET status = @st, is_active = CASE WHEN @st = 'Cancelled' THEN 0 ELSE is_active END, updated_at = UTC_TIMESTAMP(), completed_at = CASE WHEN @st IN ('Ready', 'Served') THEN UTC_TIMESTAMP() ELSE completed_at END WHERE order_id = @oid AND is_deleted = 0;",
                new Dictionary<string, object?> { { "@st", kotStatus }, { "@oid", orderId } });
        }
        catch { }

        try
        {
            string kitchenOrderStatus = kotStatus.Trim().ToLowerInvariant() switch
            {
                "cooking" or "preparing" => "preparing",
                "ready" => "ready",
                "served" or "completed" => "served",
                "cancelled" => "cancelled",
                _ => "queued"
            };
            await _spService.ExecuteSqlNonQueryAsync(
                "UPDATE kitchen_orders SET status = @st WHERE order_id = @oid;",
                new Dictionary<string, object?> { { "@st", kitchenOrderStatus }, { "@oid", orderId } });
        }
        catch { }

        try
        {
            await _spService.ExecuteSqlNonQueryAsync(
                "UPDATE bar_order_tickets SET status = @st, completed_at = CASE WHEN @st IN ('ready', 'served') THEN UTC_TIMESTAMP() ELSE completed_at END WHERE order_id = @oid;",
                new Dictionary<string, object?> { { "@st", botStatus }, { "@oid", orderId } });
        }
        catch { }

        try
        {
            string botItemStatus = botStatus switch
            {
                "mixing" => "cooking",
                "ready" => "ready",
                "served" => "served",
                "cancelled" => "cancelled",
                _ => "queued"
            };
            await _spService.ExecuteSqlNonQueryAsync(
                "UPDATE bar_bot_items SET item_status = @ist WHERE bot_id IN (SELECT bot_id FROM bar_order_tickets WHERE order_id = @oid);",
                new Dictionary<string, object?> { { "@ist", botItemStatus }, { "@oid", orderId } });
        }
        catch { }
    }

    private async Task<(object? kitchenKot, object? barKot)> LoadTicketsForOrderAsync(long orderId, List<OrderItem> orderItems)
    {
        object? kitchenKot = null;
        object? barKot = null;

        try
        {
            var kot = await _context.KitchenOrderTickets
                .AsNoTracking()
                .Where(k => k.OrderId == orderId && !k.IsDeleted)
                .OrderByDescending(k => k.IsActive)
                .ThenByDescending(k => k.CreatedAt)
                .FirstOrDefaultAsync();

            if (kot != null)
            {
                var kItems = orderItems.Where(i => i.KotId == kot.Id || (i.BotId == null && !OrderItemRouting.IsBarItem(false, null, null, i.Name))).ToList();
                kitchenKot = new
                {
                    kotId = kot.Id,
                    kotNumber = kot.KotNumber,
                    batch = kot.BatchNumber,
                    status = kot.Status,
                    createdAt = kot.CreatedAt,
                    itemCount = kItems.Count,
                    items = kItems.Select(i => new { i.Id, i.Name, i.Quantity, i.KotStatus, i.Notes }).ToList()
                };
            }
        }
        catch { }

        try
        {
            var bots = await _spService.ExecuteSqlQueryAsync(
                "SELECT bot_id, bot_number, batch_number, status, created_at FROM bar_order_tickets WHERE order_id = @oid ORDER BY created_at DESC LIMIT 1;",
                r => new
                {
                    botId = r.GetInt64(0),
                    botNumber = r.GetString(1),
                    batch = r.GetInt32(2),
                    status = r.GetString(3),
                    createdAt = r.GetDateTime(4)
                },
                new Dictionary<string, object?> { { "@oid", orderId } });

            var bot = bots.FirstOrDefault();
            if (bot != null)
            {
                var bItems = orderItems.Where(i => i.BotId == bot.botId || OrderItemRouting.IsBarItem(false, null, null, i.Name)).ToList();
                barKot = new
                {
                    botId = bot.botId,
                    botNumber = bot.botNumber,
                    batch = bot.batch,
                    status = bot.status,
                    createdAt = bot.createdAt,
                    itemCount = bItems.Count,
                    items = bItems.Select(i => new { i.Id, i.Name, i.Quantity, i.KotStatus, i.Notes }).ToList()
                };
            }
        }
        catch { }

        return (kitchenKot, barKot);
    }

    private static TakeawayMenuItemDto MapToTakeawayMenuItemDto(MenuItem m)
    {
        return new TakeawayMenuItemDto
        {
            ItemId = m.MenuItemId,
            MenuItemId = m.MenuItemId,
            Name = m.DishName,
            DishName = m.DishName,
            Category = m.Category,
            Price = m.Price,
            Description = m.ShortDescription,
            ImageUrl = m.ImageUrl,
            IsAvailable = m.IsAvailable,
            DietaryType = m.DietaryType,
            DrinkType = m.DrinkType,
            IsBarItem = m.IsBarItem,
            SpiceLevel = m.SpiceLevel,
            PrepTimeMinutes = m.PrepTimeMinutes,
            ServingMeasure = m.ServingMeasure
        };
    }

    private async Task<(object? kitchenKot, object? barKot)> DispatchKotAndBotAsync(Order order)
    {
        try
        {
            var (allKitchen, allBar) = await OrderItemRouting.ClassifyOrderItemsAsync(_context, order.Items);
            object? kitchenResult = null;
            object? barResult = null;
            string noteLabel = !string.IsNullOrWhiteSpace(order.CustomerName)
                ? $"Takeaway - {order.CustomerName} ({order.OrderNumber})"
                : $"Takeaway Order ({order.OrderNumber})";

            if (allKitchen.Count > 0)
            {
                string kotNumber = $"KOT-{DateTime.UtcNow:yyyyMMddHHmmssfff}";
                var kot = new KitchenOrderTicket
                {
                    KotNumber = kotNumber,
                    OrderId = order.Id,
                    StationId = 1,
                    BatchNumber = 1,
                    Status = "Queued",
                    IsActive = true,
                    IsDeleted = false,
                    CreatedAt = DateTime.UtcNow
                };
                _context.KitchenOrderTickets.Add(kot);
                await _context.SaveChangesAsync();

                try
                {
                    var rawSql = @"INSERT INTO kitchen_orders (kot_number, order_id, branch_id, batch_number, status, priority, special_notes, created_at)
                                   VALUES ({0}, {1}, 1, 1, 'queued', 'normal', {2}, NOW())
                                   ON DUPLICATE KEY UPDATE status = 'queued';";
                    await _context.Database.ExecuteSqlRawAsync(rawSql, kot.KotNumber, order.Id, noteLabel);
                }
                catch { }

                foreach (var kItem in allKitchen)
                {
                    kItem.KotId = kot.Id;
                }
                await _context.SaveChangesAsync();

                kitchenResult = new
                {
                    kotId = kot.Id,
                    kotNumber = kot.KotNumber,
                    batch = 1,
                    status = "Queued",
                    itemCount = allKitchen.Count,
                    items = allKitchen.Select(i => new { i.Id, i.Name, i.Quantity, i.Notes }).ToList()
                };

                try
                {
                    await _hubContext.Clients.Group("kitchen").SendAsync("ReceiveNewKOT", new
                    {
                        kotId = kot.Id,
                        kotNumber = kot.KotNumber,
                        orderId = order.Id,
                        orderNumber = order.OrderNumber,
                        tableName = "Takeaway",
                        section = "Takeaway",
                        customerName = order.CustomerName,
                        status = "Queued",
                        orderTime = order.CreatedAt,
                        items = allKitchen.Select(i => new { i.Id, i.Name, i.Quantity, i.Notes }).ToList()
                    });
                }
                catch { }
            }

            if (allBar.Count > 0)
            {
                string botNumber = $"BOT-{DateTime.UtcNow:yyyyMMddHHmmssfff}";
                long botId = 0;
                try
                {
                    var insertBotSql = @"INSERT INTO bar_order_tickets (bot_number, order_id, bar_counter_id, batch_number, status, priority, special_notes, created_at)
                                         VALUES (@bnum, @oid, 1, 1, 'queued', 'normal', @notes, NOW());";
                    await _spService.ExecuteSqlNonQueryAsync(insertBotSql, new Dictionary<string, object?>
                    {
                        { "bnum", botNumber },
                        { "oid", order.Id },
                        { "notes", noteLabel }
                    });
                    botId = await _spService.ExecuteSqlScalarAsync<long>(
                        "SELECT bot_id FROM bar_order_tickets WHERE bot_number = @bnum LIMIT 1;",
                        new Dictionary<string, object?> { { "bnum", botNumber } });
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Failed to insert bar_order_tickets row for order {OrderId}", order.Id);
                }

                foreach (var bItem in allBar)
                {
                    if (botId > 0) bItem.BotId = botId;
                    if (botId > 0 && bItem.Id > 0)
                    {
                        try
                        {
                            var insertItemSql = @"INSERT INTO bar_bot_items (bot_id, order_item_id, pour_size_ml, item_status, special_notes)
                                                  VALUES (@bid, @oiid, 60.00, 'queued', @notes);";
                            await _spService.ExecuteSqlNonQueryAsync(insertItemSql, new Dictionary<string, object?>
                            {
                                { "bid", botId },
                                { "oiid", bItem.Id },
                                { "notes", bItem.Notes }
                            });
                        }
                        catch { }
                    }
                }
                await _context.SaveChangesAsync();

                barResult = new
                {
                    botId = botId,
                    botNumber = botNumber,
                    batch = 1,
                    status = "queued",
                    itemCount = allBar.Count,
                    items = allBar.Select(i => new { i.Id, i.Name, i.Quantity, i.Notes }).ToList()
                };

                try
                {
                    var botPayload = new
                    {
                        botId = botId,
                        botNumber = botNumber,
                        orderId = order.Id,
                        orderNumber = order.OrderNumber,
                        tableName = "Takeaway",
                        section = "Takeaway",
                        customerName = order.CustomerName,
                        status = "queued",
                        orderTime = order.CreatedAt,
                        items = allBar.Select(i => new { i.Id, i.Name, i.Quantity, i.Notes }).ToList()
                    };
                    await _hubContext.Clients.Group("bar").SendAsync("ReceiveNewBOT", botPayload);
                    await _hubContext.Clients.All.SendAsync("ReceiveBarKotCreated", botPayload);
                }
                catch { }
            }

            return (kitchenResult, barResult);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to auto-dispatch KOT/BOT for takeaway order {OrderId}", order.Id);
            return (null, null);
        }
    }

    #endregion

    #region 5. Takeaway Dashboard Orders List, Summary & Cancellation APIs

    public async Task<TakeawayPaginatedList<TakeawayOrderListItemDto>> GetCustomerTakeawayOrdersAsync(
        long customerId,
        string? customerPhone,
        int page = 1,
        int pageSize = 20,
        string? status = null)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 100);

        string targetPhoneKey = CustomerAuthService.NormalizePhoneKey(customerPhone);
        string? suffix = targetPhoneKey.Length >= 4 ? targetPhoneKey[^4..] : (targetPhoneKey.Length > 0 ? targetPhoneKey : null);

        var items = await LoadTakeawayOrderListItemsAsync(null, null, customerId, suffix);
        IEnumerable<TakeawayOrderListItemDto> filtered = items.Where(d =>
            d.CustomerId == customerId ||
            (!d.CustomerId.HasValue &&
             !string.IsNullOrEmpty(targetPhoneKey) &&
             CustomerAuthService.NormalizePhoneKey(d.CustomerPhone) == targetPhoneKey));

        if (!string.IsNullOrWhiteSpace(status) && !string.Equals(status, "all", StringComparison.OrdinalIgnoreCase))
        {
            string statusTrim = status.Trim();
            string? normalizedStatus = TryNormalizeStatusFilter(statusTrim);
            filtered = filtered.Where(d =>
                string.Equals(d.FulfillmentStatus, statusTrim, StringComparison.OrdinalIgnoreCase) ||
                string.Equals(d.OrderStatus, statusTrim, StringComparison.OrdinalIgnoreCase) ||
                (normalizedStatus != null && string.Equals(d.FulfillmentStatus, normalizedStatus, StringComparison.OrdinalIgnoreCase)));
        }

        var matchedList = filtered.ToList();
        return new TakeawayPaginatedList<TakeawayOrderListItemDto>
        {
            TotalCount = matchedList.Count,
            Page = page,
            PageSize = pageSize,
            Data = matchedList.Skip((page - 1) * pageSize).Take(pageSize).ToList()
        };
    }

    public async Task<(bool Exists, bool Allowed)> CanCustomerAccessOrderAsync(
        long orderId,
        long customerId,
        string? customerPhone)
    {
        var order = await _context.Orders
            .AsNoTracking()
            .FirstOrDefaultAsync(o => o.Id == orderId && !o.IsDeleted);

        if (order == null)
        {
            return (false, false);
        }

        if (order.CustomerId.HasValue)
        {
            return (true, order.CustomerId.Value == customerId);
        }

        string callerPhoneKey = CustomerAuthService.NormalizePhoneKey(customerPhone);
        string orderPhoneKey = CustomerAuthService.NormalizePhoneKey(order.CustomerPhone);
        bool phoneMatches = !string.IsNullOrEmpty(callerPhoneKey) &&
                            !string.IsNullOrEmpty(orderPhoneKey) &&
                            string.Equals(callerPhoneKey, orderPhoneKey, StringComparison.Ordinal);
        return (true, phoneMatches);
    }

    public async Task<(bool Exists, bool Allowed)> CanCustomerAccessInvoiceAsync(
        long invoiceId,
        long customerId,
        string? customerPhone)
    {
        var invoice = await _context.Invoices
            .AsNoTracking()
            .FirstOrDefaultAsync(i => i.InvoiceId == invoiceId)
            ?? await _context.Invoices
                .AsNoTracking()
                .FirstOrDefaultAsync(i => i.OrderId == invoiceId);

        if (invoice == null)
        {
            return (false, false);
        }

        return await CanCustomerAccessOrderAsync(invoice.OrderId, customerId, customerPhone);
    }

    public async Task<TakeawayPaginatedList<TakeawayOrderListItemDto>> GetTakeawayOrdersAsync(
        int page = 1,
        int pageSize = 20,
        string? search = null,
        string? status = null,
        DateTime? fromDate = null,
        DateTime? toDate = null,
        string? paymentStatus = null,
        string? paymentMethod = null)
    {
        if (fromDate.HasValue && toDate.HasValue && fromDate.Value.Date > toDate.Value.Date)
        {
            throw new ArgumentException("fromDate cannot be greater than toDate.");
        }

        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 100);

        var items = await LoadTakeawayOrderListItemsAsync(fromDate, toDate);
        IEnumerable<TakeawayOrderListItemDto> filtered = items;

        if (!string.IsNullOrWhiteSpace(status) && !string.Equals(status, "all", StringComparison.OrdinalIgnoreCase))
        {
            string statusTrim = status.Trim();
            string? normalizedStatus = TryNormalizeStatusFilter(statusTrim);

            filtered = filtered.Where(d =>
                string.Equals(d.FulfillmentStatus, statusTrim, StringComparison.OrdinalIgnoreCase) ||
                string.Equals(d.OrderStatus, statusTrim, StringComparison.OrdinalIgnoreCase) ||
                (normalizedStatus != null && string.Equals(d.FulfillmentStatus, normalizedStatus, StringComparison.OrdinalIgnoreCase)));
        }

        if (!string.IsNullOrWhiteSpace(paymentStatus) && !string.Equals(paymentStatus, "all", StringComparison.OrdinalIgnoreCase))
        {
            string ps = paymentStatus.Trim();
            filtered = filtered.Where(d =>
                string.Equals(d.PaymentStatus, ps, StringComparison.OrdinalIgnoreCase) ||
                ((ps.Equals("Void", StringComparison.OrdinalIgnoreCase) || ps.Equals("Cancelled", StringComparison.OrdinalIgnoreCase)) &&
                 string.Equals(d.InvoiceStatus, "VOID", StringComparison.OrdinalIgnoreCase)));
        }

        if (!string.IsNullOrWhiteSpace(paymentMethod) && !string.Equals(paymentMethod, "all", StringComparison.OrdinalIgnoreCase))
        {
            string pm = paymentMethod.Trim();
            filtered = filtered.Where(d =>
                !string.IsNullOrWhiteSpace(d.PaymentMethod) &&
                d.PaymentMethod.Contains(pm, StringComparison.OrdinalIgnoreCase));
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            string s = search.Trim();
            filtered = filtered.Where(d =>
                d.OrderId.ToString().Contains(s, StringComparison.OrdinalIgnoreCase) ||
                d.OrderNumber.Contains(s, StringComparison.OrdinalIgnoreCase) ||
                (!string.IsNullOrEmpty(d.CustomerName) && d.CustomerName.Contains(s, StringComparison.OrdinalIgnoreCase)) ||
                (!string.IsNullOrEmpty(d.CustomerPhone) && d.CustomerPhone.Contains(s, StringComparison.OrdinalIgnoreCase)) ||
                (!string.IsNullOrEmpty(d.InvoiceNumber) && d.InvoiceNumber.Contains(s, StringComparison.OrdinalIgnoreCase)) ||
                d.Items.Any(i => i.Name.Contains(s, StringComparison.OrdinalIgnoreCase)));
        }

        var matchedList = filtered.ToList();
        int totalCount = matchedList.Count;
        var paged = matchedList
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToList();

        return new TakeawayPaginatedList<TakeawayOrderListItemDto>
        {
            TotalCount = totalCount,
            Page = page,
            PageSize = pageSize,
            Data = paged
        };
    }

    public async Task<TakeawayOrdersSummaryDto> GetTakeawayOrdersSummaryAsync(
        DateTime? fromDate = null,
        DateTime? toDate = null)
    {
        if (fromDate.HasValue && toDate.HasValue && fromDate.Value.Date > toDate.Value.Date)
        {
            throw new ArgumentException("fromDate cannot be greater than toDate.");
        }

        var items = await LoadTakeawayOrderListItemsAsync(fromDate, toDate);
        var summary = new TakeawayOrdersSummaryDto
        {
            TotalTakeawayOrders = items.Count,
            FromDate = fromDate?.Date,
            ToDate = toDate?.Date
        };

        foreach (var item in items)
        {
            bool isCancelled = string.Equals(item.FulfillmentStatus, "Cancelled", StringComparison.OrdinalIgnoreCase) ||
                               string.Equals(item.OrderStatus, "Cancelled", StringComparison.OrdinalIgnoreCase);

            bool isVoidOrRefundedInvoice =
                string.Equals(item.InvoiceStatus, "VOID", StringComparison.OrdinalIgnoreCase) ||
                string.Equals(item.InvoiceStatus, "REFUNDED", StringComparison.OrdinalIgnoreCase) ||
                string.Equals(item.InvoiceStatus, "CANCELLED", StringComparison.OrdinalIgnoreCase);

            switch (item.FulfillmentStatus)
            {
                case "New":
                    summary.PendingOrders++;
                    break;
                case "Preparing":
                    summary.PreparingOrders++;
                    break;
                case "Ready":
                    summary.ReadyOrders++;
                    break;
                case "PickedUp":
                    summary.PickedUpOrders++;
                    break;
                case "Completed":
                    summary.CompletedOrders++;
                    break;
                case "Cancelled":
                    summary.CancelledOrders++;
                    break;
            }

            if (!isCancelled && !isVoidOrRefundedInvoice)
            {
                if (string.Equals(item.PaymentStatus, "Paid", StringComparison.OrdinalIgnoreCase))
                {
                    summary.PaidOrdersCount++;
                    summary.TotalTakeawaySales += item.TotalAmount;
                    summary.PaidTakeawaySales += item.PaidAmount > 0 ? item.PaidAmount : item.TotalAmount;
                }
                else if (string.Equals(item.PaymentStatus, "Pending", StringComparison.OrdinalIgnoreCase))
                {
                    summary.PendingPaymentOrders++;
                    summary.PendingTakeawaySales += item.TotalAmount;
                }
                else if (string.Equals(item.PaymentStatus, "Failed", StringComparison.OrdinalIgnoreCase))
                {
                    summary.FailedPaymentOrders++;
                }
            }
            else if (string.Equals(item.PaymentStatus, "Refunded", StringComparison.OrdinalIgnoreCase))
            {
                summary.RefundedOrdersCount++;
            }
            else if (string.Equals(item.PaymentStatus, "Failed", StringComparison.OrdinalIgnoreCase))
            {
                summary.FailedPaymentOrders++;
            }
        }

        summary.TotalTakeawaySales = Math.Round(summary.TotalTakeawaySales, 2);
        summary.PaidTakeawaySales = Math.Round(summary.PaidTakeawaySales, 2);
        summary.PendingTakeawaySales = Math.Round(summary.PendingTakeawaySales, 2);
        return summary;
    }

    public async Task<CancelTakeawayOrderResponseDto?> CancelTakeawayOrderAsync(
        long orderId,
        CancelTakeawayOrderRequest request,
        long? cancelledByUserId = null,
        string? cancelledByName = null,
        string? ipAddress = null)
    {
        string rawReason = !string.IsNullOrWhiteSpace(request?.Reason)
            ? request.Reason
            : (request?.CancellationReason ?? string.Empty);
        string cleanReason = rawReason.Trim();

        if (string.IsNullOrWhiteSpace(cleanReason))
        {
            throw new ArgumentException("Cancellation reason is required.");
        }

        if (cleanReason.Length > 255)
        {
            throw new ArgumentException("Cancellation reason must not exceed 255 characters.");
        }

        var order = await _context.Orders
            .Include(o => o.Items)
            .FirstOrDefaultAsync(o => o.Id == orderId && !o.IsDeleted);

        if (order == null)
        {
            return null;
        }

        if (!string.Equals(order.OrderType, "Takeaway", StringComparison.OrdinalIgnoreCase))
        {
            throw new ArgumentException($"Order {order.OrderNumber} is a '{order.OrderType}' order; only Takeaway orders can be cancelled via this endpoint.");
        }

        string currentFulfillment = TakeawayStatusSyncHelper.ResolveEffectiveFulfillmentStatus(order);

        if (string.Equals(currentFulfillment, "Cancelled", StringComparison.OrdinalIgnoreCase) ||
            string.Equals(order.Status, "Cancelled", StringComparison.OrdinalIgnoreCase))
        {
            throw new TakeawayOrderConflictException($"Takeaway order {order.OrderNumber} is already cancelled.");
        }

        if (string.Equals(currentFulfillment, "PickedUp", StringComparison.OrdinalIgnoreCase) ||
            string.Equals(currentFulfillment, "Completed", StringComparison.OrdinalIgnoreCase) ||
            string.Equals(order.Status, "Completed", StringComparison.OrdinalIgnoreCase))
        {
            throw new TakeawayOrderConflictException($"Takeaway order {order.OrderNumber} cannot be cancelled because it is already {currentFulfillment}.");
        }

        long targetOrderId = order.Id;
        string targetOrderNumber = order.OrderNumber;
        string? targetOrderIdemKey = order.IdempotencyKey;
        string previousOrderStatus = order.Status;
        string? previousPaymentStatus = order.PaymentStatus;
        DateTime utcNow = DateTime.UtcNow;

        object? cancelPayload = null;
        string? finalInvoiceStatus = null;
        string refundStatus = "None";
        decimal refundedAmount = 0m;
        var cancelledTickets = new List<string>();
        string finalOrderStatus = "Cancelled";
        string finalFulfillment = "Cancelled";
        string finalPaymentStatus = "Cancelled";

        var strategy = _context.Database.CreateExecutionStrategy();
        await strategy.ExecuteAsync(async () =>
        {
            _context.ChangeTracker.Clear();
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                var txOrder = await _context.Orders
                    .Include(o => o.Items)
                    .FirstAsync(o => o.Id == targetOrderId && !o.IsDeleted);

                var orderInvoices = await _context.Invoices
                    .Where(i => i.OrderId == txOrder.Id)
                    .OrderByDescending(i => i.InvoiceId)
                    .ToListAsync();
                var primaryInvoice = orderInvoices.FirstOrDefault();
                var invoiceIds = orderInvoices.Select(i => i.InvoiceId).Distinct().ToList();

                var invoicePayments = invoiceIds.Count > 0
                    ? await _context.InvoicePayments
                        .Where(p => invoiceIds.Contains(p.InvoiceId))
                        .ToListAsync()
                    : new List<InvoicePayment>();

                decimal collectedFromPayments = invoicePayments
                    .Where(ReportingExportService.IsPaymentSuccessful)
                    .Sum(p => p.AmountPaid > 0 ? p.AmountPaid : p.Amount);

                decimal invoiceCollected = primaryInvoice != null
                    ? Math.Max(primaryInvoice.PaidAmount, primaryInvoice.AmountPaid)
                    : 0m;

                bool hasCollectedPayment =
                    collectedFromPayments > 0m ||
                    invoiceCollected > 0m ||
                    orderInvoices.Any(i =>
                        string.Equals(i.Status, "PAID", StringComparison.OrdinalIgnoreCase) ||
                        string.Equals(i.Status, "PARTIAL", StringComparison.OrdinalIgnoreCase)) ||
                    string.Equals(txOrder.PaymentStatus, "Paid", StringComparison.OrdinalIgnoreCase) ||
                    string.Equals(txOrder.Status, "Settled", StringComparison.OrdinalIgnoreCase);

                bool hasFailedAttempt =
                    string.Equals(txOrder.PaymentStatus, "Failed", StringComparison.OrdinalIgnoreCase) ||
                    invoicePayments.Any(p => string.Equals(p.PaymentStatus, "failed", StringComparison.OrdinalIgnoreCase));

                refundedAmount = 0m;
                refundStatus = "None";
                string targetInvoiceStatus = hasCollectedPayment ? "REFUNDED" : "VOID";
                string targetInvoicePayStatus = hasCollectedPayment ? "refunded" : "void";
                finalInvoiceStatus = primaryInvoice != null ? targetInvoiceStatus : null;

                if (hasCollectedPayment)
                {
                    refundedAmount = collectedFromPayments > 0m
                        ? collectedFromPayments
                        : (invoiceCollected > 0m ? invoiceCollected : (primaryInvoice?.TotalAmount ?? 0m));
                    refundStatus = !string.IsNullOrWhiteSpace(request?.RefundMethod)
                        ? $"Refunded ({request.RefundMethod.Trim()})"
                        : "Refunded";
                    txOrder.PaymentStatus = "Refunded";

                    foreach (var p in invoicePayments)
                    {
                        if (ReportingExportService.IsPaymentSuccessful(p))
                        {
                            p.PaymentStatus = "refunded";
                        }
                        else if (string.Equals(p.PaymentStatus, "pending", StringComparison.OrdinalIgnoreCase))
                        {
                            p.PaymentStatus = "void";
                        }
                    }
                }
                else
                {
                    txOrder.PaymentStatus = hasFailedAttempt ? "Failed" : "Cancelled";
                    foreach (var p in invoicePayments)
                    {
                        if (string.Equals(p.PaymentStatus, "pending", StringComparison.OrdinalIgnoreCase))
                        {
                            p.PaymentStatus = "void";
                        }
                    }
                }

                foreach (var inv in orderInvoices)
                {
                    inv.Status = targetInvoiceStatus;
                    inv.UpdatedAt = utcNow;
                }

                // Update parent restaurant_orders row (preserve history with IsDeleted = false)
                txOrder.Status = "Cancelled";
                txOrder.FulfillmentStatus = "Cancelled";
                txOrder.IsActive = false;
                txOrder.IsDeleted = false;
                txOrder.CancellationReason = cleanReason;
                txOrder.CancelledAt = utcNow;
                txOrder.CancelledBy = cancelledByUserId;
                txOrder.CancelledByName = cancelledByName;
                txOrder.UpdatedBy = cancelledByUserId;
                txOrder.UpdatedAt = utcNow;

                finalOrderStatus = txOrder.Status;
                finalFulfillment = txOrder.FulfillmentStatus ?? "Cancelled";
                finalPaymentStatus = txOrder.PaymentStatus ?? "Cancelled";

                if (!string.IsNullOrWhiteSpace(request?.Notes))
                {
                    string cleanNotes = request.Notes.Trim();
                    txOrder.SpecialInstructions = string.IsNullOrWhiteSpace(txOrder.SpecialInstructions)
                        ? $"Cancel Note: {cleanNotes}"
                        : $"{txOrder.SpecialInstructions} | Cancel Note: {cleanNotes}";
                }

                // Update order_items row states (preserve history with IsDeleted = false)
                foreach (var item in txOrder.Items.Where(i => !i.IsDeleted))
                {
                    item.KotStatus = "Cancelled";
                    item.IsActive = false;
                    item.IsDeleted = false;
                    item.UpdatedBy = cancelledByUserId;
                    item.UpdatedAt = utcNow;
                }

                // Collect and cancel active Kitchen KOTs
                cancelledTickets = new List<string>();
                var kots = await _context.KitchenOrderTickets
                    .Where(k => k.OrderId == txOrder.Id && !k.IsDeleted)
                    .ToListAsync();
                foreach (var kot in kots)
                {
                    if (!string.IsNullOrWhiteSpace(kot.KotNumber) && !cancelledTickets.Contains(kot.KotNumber))
                    {
                        cancelledTickets.Add(kot.KotNumber);
                    }
                    kot.Status = "Cancelled";
                    kot.IsActive = false;
                    kot.IsDeleted = false;
                    kot.UpdatedAt = utcNow;
                }

                await _context.SaveChangesAsync();

                // Sync invoices SQL columns (payment_status enum)
                foreach (var inv in orderInvoices)
                {
                    try
                    {
                        await _spService.ExecuteSqlNonQueryAsync(
                            "UPDATE invoices SET status = @st, payment_status = @pst, updated_at = UTC_TIMESTAMP() WHERE invoice_id = @iid;",
                            new Dictionary<string, object?>
                            {
                                { "@st", targetInvoiceStatus },
                                { "@pst", targetInvoicePayStatus },
                                { "@iid", inv.InvoiceId }
                            });
                    }
                    catch { }
                }

                // Sync legacy 'orders' table
                try
                {
                    await _spService.ExecuteSqlNonQueryAsync(
                        "UPDATE orders SET status = 'cancelled', cancelled_reason = @reason, updated_by = @uid, updated_at = UTC_TIMESTAMP() WHERE order_id = @oid;",
                        new Dictionary<string, object?>
                        {
                            { "@reason", cleanReason },
                            { "@uid", cancelledByUserId },
                            { "@oid", txOrder.Id }
                        });
                }
                catch { }

                // Collect & cancel kitchen_orders
                try
                {
                    var koNums = await _spService.ExecuteSqlQueryAsync(
                        "SELECT kot_number FROM kitchen_orders WHERE order_id = @oid;",
                        r => r.IsDBNull(0) ? string.Empty : r.GetString(0),
                        new Dictionary<string, object?> { { "@oid", txOrder.Id } });
                    foreach (var kn in koNums)
                    {
                        if (!string.IsNullOrWhiteSpace(kn) && !cancelledTickets.Contains(kn))
                        {
                            cancelledTickets.Add(kn);
                        }
                    }
                    await _spService.ExecuteSqlNonQueryAsync(
                        "UPDATE kitchen_orders SET status = 'cancelled' WHERE order_id = @oid;",
                        new Dictionary<string, object?> { { "@oid", txOrder.Id } });
                }
                catch { }

                // Collect & cancel bar_order_tickets + bar_bot_items
                try
                {
                    var botNums = await _spService.ExecuteSqlQueryAsync(
                        "SELECT bot_number FROM bar_order_tickets WHERE order_id = @oid;",
                        r => r.IsDBNull(0) ? string.Empty : r.GetString(0),
                        new Dictionary<string, object?> { { "@oid", txOrder.Id } });
                    foreach (var bn in botNums)
                    {
                        if (!string.IsNullOrWhiteSpace(bn) && !cancelledTickets.Contains(bn))
                        {
                            cancelledTickets.Add(bn);
                        }
                    }
                    await _spService.ExecuteSqlNonQueryAsync(
                        "UPDATE bar_bot_items SET item_status = 'cancelled' WHERE bot_id IN (SELECT bot_id FROM bar_order_tickets WHERE order_id = @oid);",
                        new Dictionary<string, object?> { { "@oid", txOrder.Id } });
                    await _spService.ExecuteSqlNonQueryAsync(
                        "UPDATE bar_order_tickets SET status = 'cancelled' WHERE order_id = @oid;",
                        new Dictionary<string, object?> { { "@oid", txOrder.Id } });
                }
                catch { }

                // Insert immutable audit_logs record inside transaction
                await RecordAuditLogAsync(
                    cancelledByUserId,
                    "CANCEL_ORDER",
                    "restaurant_orders",
                    txOrder.Id,
                    new
                    {
                        orderStatus = previousOrderStatus,
                        fulfillmentStatus = currentFulfillment,
                        paymentStatus = previousPaymentStatus,
                        invoiceStatus = primaryInvoice?.Status
                    },
                    new
                    {
                        orderStatus = txOrder.Status,
                        fulfillmentStatus = txOrder.FulfillmentStatus,
                        paymentStatus = txOrder.PaymentStatus,
                        invoiceStatus = finalInvoiceStatus,
                        reason = cleanReason,
                        refundMethod = request?.RefundMethod?.Trim(),
                        refundStatus = refundStatus,
                        refundedAmount = refundedAmount,
                        notes = request?.Notes?.Trim(),
                        cancelledBy = cancelledByUserId,
                        cancelledByName = cancelledByName,
                        cancelledTickets = cancelledTickets
                    },
                    ipAddress);

                await transaction.CommitAsync();

                cancelPayload = new
                {
                    orderId = txOrder.Id,
                    orderNumber = txOrder.OrderNumber,
                    orderStatus = txOrder.Status,
                    fulfillmentStatus = txOrder.FulfillmentStatus,
                    paymentStatus = txOrder.PaymentStatus,
                    invoiceStatus = finalInvoiceStatus,
                    cancellationReason = cleanReason,
                    cancelledAt = utcNow,
                    cancelledBy = cancelledByUserId,
                    cancelledByName = cancelledByName,
                    cancelledTickets = cancelledTickets
                };
            }
            catch
            {
                await transaction.RollbackAsync();
                throw;
            }
        });

        if (!string.IsNullOrWhiteSpace(targetOrderIdemKey))
        {
            IdempotencyCache.TryRemove(targetOrderIdemKey, out _);
        }

        if (cancelPayload != null)
        {
            try
            {
                await _hubContext.Clients.Group("floor").SendAsync("TakeawayOrderCancelled", cancelPayload);
                await _hubContext.Clients.Group("floor").SendAsync("TakeawayStatusUpdated", cancelPayload);
                await _hubContext.Clients.Group("kitchen").SendAsync("KotOrderCancelled", cancelPayload);
                await _hubContext.Clients.Group("bar").SendAsync("BarBotCancelled", cancelPayload);
                await _hubContext.Clients.All.SendAsync("BarKotCancelled", cancelPayload);
            }
            catch { }
        }

        var history = await GetOrderStatusHistoryAsync(targetOrderId);

        return new CancelTakeawayOrderResponseDto
        {
            Success = true,
            Message = $"Takeaway order {targetOrderNumber} has been cancelled.",
            OrderId = targetOrderId,
            OrderNumber = targetOrderNumber,
            OrderType = order.OrderType,
            OrderStatus = finalOrderStatus,
            FulfillmentStatus = finalFulfillment,
            PaymentStatus = finalPaymentStatus,
            InvoiceStatus = finalInvoiceStatus,
            RefundStatus = refundStatus,
            RefundedAmount = Math.Round(refundedAmount, 2),
            CancellationReason = cleanReason,
            CancelledAt = utcNow,
            CancelledBy = cancelledByUserId,
            CancelledByName = cancelledByName,
            CancelledTickets = cancelledTickets,
            StatusHistory = history
        };
    }

    private async Task<List<TakeawayOrderListItemDto>> LoadTakeawayOrderListItemsAsync(
        DateTime? fromDate,
        DateTime? toDate,
        long? customerIdFilter = null,
        string? customerPhoneSuffix = null)
    {
        var query = _context.Orders
            .AsNoTracking()
            .Where(o => !o.IsDeleted && o.OrderType == "Takeaway");

        if (customerIdFilter.HasValue)
        {
            long cid = customerIdFilter.Value;
            if (!string.IsNullOrEmpty(customerPhoneSuffix))
            {
                string suffix = customerPhoneSuffix;
                query = query.Where(o =>
                    o.CustomerId == cid ||
                    (o.CustomerId == null && o.CustomerPhone != null && o.CustomerPhone.Contains(suffix)));
            }
            else
            {
                query = query.Where(o => o.CustomerId == cid);
            }
        }

        if (fromDate.HasValue)
        {
            var start = fromDate.Value.Date;
            query = query.Where(o => o.CreatedAt >= start);
        }

        if (toDate.HasValue)
        {
            var end = toDate.Value.Date.AddDays(1).AddTicks(-1);
            query = query.Where(o => o.CreatedAt <= end);
        }

        var orders = await query
            .OrderByDescending(o => o.CreatedAt)
            .ThenByDescending(o => o.Id)
            .ToListAsync();

        if (orders.Count == 0)
        {
            return new List<TakeawayOrderListItemDto>();
        }

        var orderIds = orders.Select(o => o.Id).Distinct().ToList();

        var allOrderItems = await _context.OrderItems
            .AsNoTracking()
            .Where(oi => orderIds.Contains(oi.OrderId) && !oi.IsDeleted)
            .ToListAsync();
        var itemsByOrder = allOrderItems.GroupBy(oi => oi.OrderId).ToDictionary(g => g.Key, g => g.ToList());

        var allInvoices = await _context.Invoices
            .AsNoTracking()
            .Where(i => orderIds.Contains(i.OrderId))
            .ToListAsync();
        var invoiceByOrder = allInvoices
            .GroupBy(i => i.OrderId)
            .ToDictionary(g => g.Key, g => g.OrderByDescending(x => x.InvoiceId).First());

        var invoiceIds = invoiceByOrder.Values.Select(i => i.InvoiceId).Distinct().ToList();
        var invExtrasById = new Dictionary<long, (decimal Cgst, decimal Sgst, decimal ServiceCharge, decimal RoundOff)>();
        if (invoiceIds.Count > 0)
        {
            try
            {
                var invIdList = string.Join(",", invoiceIds);
                var extraRows = await _spService.ExecuteSqlQueryAsync(
                    $"SELECT invoice_id, COALESCE(cgst_amount, 0), COALESCE(sgst_amount, 0), COALESCE(service_charge, 0), COALESCE(round_off, 0) FROM invoices WHERE invoice_id IN ({invIdList});",
                    r => new
                    {
                        InvoiceId = r.GetInt64(0),
                        Cgst = r.GetDecimal(1),
                        Sgst = r.GetDecimal(2),
                        ServiceCharge = r.GetDecimal(3),
                        RoundOff = r.GetDecimal(4)
                    });
                foreach (var er in extraRows)
                {
                    invExtrasById[er.InvoiceId] = (er.Cgst, er.Sgst, er.ServiceCharge, er.RoundOff);
                }
            }
            catch { }
        }

        var payments = invoiceIds.Count > 0
            ? await _context.InvoicePayments
                .AsNoTracking()
                .Where(p => invoiceIds.Contains(p.InvoiceId))
                .OrderByDescending(p => p.PaidAt)
                .ToListAsync()
            : new List<InvoicePayment>();
        var paymentsByInv = payments.GroupBy(p => p.InvoiceId).ToDictionary(g => g.Key, g => g.ToList());

        var customerIds = orders
            .Where(o => o.CustomerId.HasValue && o.CustomerId.Value > 0)
            .Select(o => o.CustomerId!.Value)
            .Distinct()
            .ToList();
        var customersById = customerIds.Count > 0
            ? await _context.Customers
                .AsNoTracking()
                .Where(c => customerIds.Contains(c.CustomerId))
                .ToDictionaryAsync(c => c.CustomerId)
            : new Dictionary<long, Customer>();

        var kots = await _context.KitchenOrderTickets
            .AsNoTracking()
            .Where(k => orderIds.Contains(k.OrderId) && !k.IsDeleted)
            .OrderByDescending(k => k.IsActive)
            .ThenByDescending(k => k.CreatedAt)
            .ToListAsync();
        var kotByOrder = kots
            .GroupBy(k => k.OrderId)
            .ToDictionary(g => g.Key, g => g.First().KotNumber);

        var botByOrder = new Dictionary<long, string>();
        try
        {
            var idList = string.Join(",", orderIds);
            var botRows = await _spService.ExecuteSqlQueryAsync(
                $"SELECT order_id, bot_number FROM bar_order_tickets WHERE order_id IN ({idList}) ORDER BY created_at DESC;",
                r => new { OrderId = r.GetInt64(0), BotNumber = r.GetString(1) });
            foreach (var br in botRows)
            {
                if (!botByOrder.ContainsKey(br.OrderId))
                {
                    botByOrder[br.OrderId] = br.BotNumber;
                }
            }
        }
        catch { }

        var result = new List<TakeawayOrderListItemDto>(orders.Count);

        foreach (var o in orders)
        {
            var allItemsForOrd = itemsByOrder.TryGetValue(o.Id, out var rawOrdItems)
                ? rawOrdItems
                : new List<OrderItem>();
            var activeItems = allItemsForOrd.Where(i => i.IsActive).ToList();
            var itemsToDisplay = activeItems.Count > 0 ? activeItems : allItemsForOrd;
            o.Items = itemsToDisplay;

            invoiceByOrder.TryGetValue(o.Id, out var inv);
            List<InvoicePayment>? invPays = null;
            if (inv != null) paymentsByInv.TryGetValue(inv.InvoiceId, out invPays);

            var latestSuccess = invPays?.FirstOrDefault(ReportingExportService.IsPaymentSuccessful);
            var latestAttempt = latestSuccess ?? invPays?.FirstOrDefault();

            string fulfillment = TakeawayStatusSyncHelper.ResolveEffectiveFulfillmentStatus(o);
            bool isCancelled = string.Equals(fulfillment, "Cancelled", StringComparison.OrdinalIgnoreCase) ||
                               string.Equals(o.Status, "Cancelled", StringComparison.OrdinalIgnoreCase);

            string resolvedPayStatus = ResolveDisplayPaymentStatus(inv, o, invPays);
            string resolvedPayMethod = latestAttempt?.PaymentMode ?? o.PaymentMethod ?? "Cash";

            decimal itemSub = itemsToDisplay.Sum(i => i.TotalPrice > 0 ? i.TotalPrice : i.Price * i.Quantity);
            decimal subtotal = inv != null && inv.Subtotal > 0 ? inv.Subtotal : itemSub;
            decimal discount = inv?.DiscountAmount ?? 0m;
            decimal taxable = inv != null && inv.TaxableAmount > 0 ? inv.TaxableAmount : Math.Max(0m, subtotal - discount);
            decimal tax = inv != null && inv.TaxAmount > 0 ? inv.TaxAmount : Math.Round(taxable * 0.05m, 2);

            (decimal Cgst, decimal Sgst, decimal ServiceCharge, decimal RoundOff) extra = default;
            if (inv != null)
            {
                invExtrasById.TryGetValue(inv.InvoiceId, out extra);
            }

            decimal cgst = extra.Cgst > 0 ? extra.Cgst : Math.Round(tax / 2m, 2);
            decimal sgst = extra.Sgst > 0 ? extra.Sgst : (tax - cgst);
            decimal serviceCharge = extra.ServiceCharge > 0 ? extra.ServiceCharge : o.ServiceCharge;
            decimal pkg = o.PackagingCharge;
            decimal roundOff = extra.RoundOff;
            decimal total = inv != null && inv.TotalAmount > 0
                ? inv.TotalAmount
                : Math.Round(taxable + tax + serviceCharge + pkg + roundOff, 2);

            decimal paidAmt = inv?.PaidAmount > 0
                ? inv.PaidAmount
                : ((inv?.Status == "PAID" || string.Equals(resolvedPayStatus, "Paid", StringComparison.OrdinalIgnoreCase)) ? total : 0m);

            decimal dueAmt = (isCancelled ||
                              string.Equals(resolvedPayStatus, "Paid", StringComparison.OrdinalIgnoreCase) ||
                              string.Equals(resolvedPayStatus, "Refunded", StringComparison.OrdinalIgnoreCase) ||
                              string.Equals(resolvedPayStatus, "Void", StringComparison.OrdinalIgnoreCase) ||
                              string.Equals(resolvedPayStatus, "Cancelled", StringComparison.OrdinalIgnoreCase))
                ? 0m
                : Math.Max(0m, total - paidAmt);

            Customer? linkedCust = (o.CustomerId.HasValue && customersById.TryGetValue(o.CustomerId.Value, out var cObj)) ? cObj : null;
            string custName = !string.IsNullOrWhiteSpace(o.CustomerName)
                ? o.CustomerName!
                : (linkedCust?.FullName ?? "Walk-in / Online Customer");
            string? custPhone = !string.IsNullOrWhiteSpace(o.CustomerPhone) ? o.CustomerPhone : linkedCust?.Phone;
            string? custEmail = !string.IsNullOrWhiteSpace(o.CustomerEmail) ? o.CustomerEmail : linkedCust?.Email;

            kotByOrder.TryGetValue(o.Id, out var kotNum);
            botByOrder.TryGetValue(o.Id, out var botNum);

            result.Add(new TakeawayOrderListItemDto
            {
                OrderId = o.Id,
                OrderNumber = o.OrderNumber,
                OrderType = o.OrderType,
                CustomerId = o.CustomerId,
                CustomerName = custName,
                CustomerPhone = custPhone,
                CustomerEmail = custEmail,
                Items = itemsToDisplay.Select(oi =>
                {
                    bool isBar = (oi.BotId.HasValue && oi.BotId.Value > 0) || OrderItemRouting.IsBarItem(false, null, null, oi.Name);
                    return new TakeawayCartItemBreakdown
                    {
                        OrderItemId = oi.Id,
                        ItemId = oi.MenuItemId,
                        Name = oi.Name,
                        Category = isBar ? "Bar" : "Kitchen",
                        UnitPrice = oi.Price,
                        Quantity = oi.Quantity,
                        TotalPrice = oi.TotalPrice > 0 ? oi.TotalPrice : oi.Price * oi.Quantity,
                        Notes = oi.Notes,
                        Department = isBar ? "Bar" : "Kitchen",
                        KotStatus = oi.KotStatus
                    };
                }).ToList(),
                ItemCount = itemsToDisplay.Count,
                TotalQuantity = itemsToDisplay.Sum(i => i.Quantity),
                Subtotal = subtotal,
                DiscountAmount = discount,
                TaxableAmount = taxable,
                CgstAmount = cgst,
                SgstAmount = sgst,
                GstAmount = tax,
                TaxAmount = tax,
                ServiceCharge = serviceCharge,
                PackagingCharge = pkg,
                RoundOff = roundOff,
                TotalAmount = total,
                PaidAmount = paidAmt,
                DueAmount = dueAmt,
                PaymentStatus = resolvedPayStatus,
                PaymentMethod = resolvedPayMethod,
                TransactionReference = latestAttempt?.TransactionReference ?? latestAttempt?.TxnReference,
                GatewayProvider = latestAttempt?.GatewayProvider,
                InvoiceStatus = inv?.Status,
                OrderStatus = o.Status,
                FulfillmentStatus = fulfillment,
                OrderDateTime = o.CreatedAt,
                CreatedAt = o.CreatedAt,
                UpdatedAt = o.UpdatedAt,
                InvoiceId = inv?.InvoiceId,
                InvoiceNumber = inv?.InvoiceNumber,
                KitchenKotNumber = kotNum,
                BarBotNumber = botNum,
                SpecialInstructions = o.SpecialInstructions,
                CancellationReason = o.CancellationReason,
                CancelledAt = o.CancelledAt,
                CancelledBy = o.CancelledBy,
                CancelledByName = o.CancelledByName
            });
        }

        return result;
    }

    private static string? TryNormalizeStatusFilter(string? rawStatus)
    {
        if (string.IsNullOrWhiteSpace(rawStatus)) return null;
        try
        {
            return TakeawayStatusSyncHelper.NormalizeFulfillmentStatus(rawStatus);
        }
        catch
        {
            return null;
        }
    }

    private async Task RecordAuditLogAsync(
        long? userId,
        string action,
        string tableName,
        long recordId,
        object? oldValue,
        object? newValue,
        string? ipAddress)
    {
        try
        {
            string? oldJson = oldValue != null ? JsonSerializer.Serialize(oldValue) : null;
            string? newJson = newValue != null ? JsonSerializer.Serialize(newValue) : null;
            string? cleanIp = !string.IsNullOrWhiteSpace(ipAddress)
                ? (ipAddress.Length > 45 ? ipAddress[..45] : ipAddress)
                : null;

            const string sql = @"
                INSERT INTO audit_logs (user_id, action, table_name, record_id, old_value, new_value, ip_address, created_at)
                VALUES (@uid, @act, @tbl, @rid, @oldv, @newv, @ip, UTC_TIMESTAMP());";

            await _spService.ExecuteSqlNonQueryAsync(sql, new Dictionary<string, object?>
            {
                { "@uid", userId },
                { "@act", action },
                { "@tbl", tableName },
                { "@rid", recordId },
                { "@oldv", oldJson },
                { "@newv", newJson },
                { "@ip", cleanIp }
            });
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Non-fatal error writing audit log ({Action} on {Table} #{RecordId}).", action, tableName, recordId);
        }
    }

    private async Task<List<OrderStatusHistoryItemDto>> GetOrderStatusHistoryAsync(long orderId)
    {
        var list = new List<OrderStatusHistoryItemDto>();
        try
        {
            const string sql = @"
                SELECT a.log_id, a.action, a.user_id, COALESCE(u.full_name, u.user_name, ''), a.old_value, a.new_value, a.created_at
                FROM audit_logs a
                LEFT JOIN users u ON a.user_id = u.user_id
                WHERE a.table_name = 'restaurant_orders' AND a.record_id = @oid
                ORDER BY a.created_at ASC, a.log_id ASC;";

            var rows = await _spService.ExecuteSqlQueryAsync(sql, r => new
            {
                LogId = r.GetInt64(0),
                Action = r.IsDBNull(1) ? string.Empty : r.GetString(1),
                UserId = r.IsDBNull(2) ? (long?)null : r.GetInt64(2),
                UserName = r.IsDBNull(3) ? null : r.GetString(3),
                OldJson = r.IsDBNull(4) ? null : r.GetString(4),
                NewJson = r.IsDBNull(5) ? null : r.GetString(5),
                CreatedAt = r.GetDateTime(6)
            }, new Dictionary<string, object?> { { "@oid", orderId } });

            foreach (var row in rows)
            {
                string? fromStatus = TryExtractJsonString(row.OldJson, "fulfillmentStatus")
                    ?? TryExtractJsonString(row.OldJson, "orderStatus");
                string? toStatus = TryExtractJsonString(row.NewJson, "fulfillmentStatus")
                    ?? TryExtractJsonString(row.NewJson, "orderStatus");
                string? reason = TryExtractJsonString(row.NewJson, "reason");
                string? jsonActor = TryExtractJsonString(row.NewJson, "cancelledByName")
                    ?? TryExtractJsonString(row.NewJson, "changedByName");
                string? details = reason
                    ?? TryExtractJsonString(row.NewJson, "notes")
                    ?? (string.Equals(row.Action, "ORDER_CREATED", StringComparison.OrdinalIgnoreCase)
                        ? "Takeaway order created"
                        : row.Action);

                list.Add(new OrderStatusHistoryItemDto
                {
                    LogId = row.LogId,
                    Action = row.Action,
                    FromStatus = fromStatus,
                    ToStatus = toStatus,
                    Reason = reason,
                    ChangedByUserId = row.UserId,
                    ChangedByName = !string.IsNullOrWhiteSpace(jsonActor)
                        ? jsonActor
                        : (!string.IsNullOrWhiteSpace(row.UserName) ? row.UserName : null),
                    Timestamp = row.CreatedAt,
                    Details = details
                });
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Non-fatal error reading status history for takeaway order {OrderId}.", orderId);
        }

        return list;
    }

    private static string? TryExtractJsonString(string? json, string propName)
    {
        if (string.IsNullOrWhiteSpace(json)) return null;
        try
        {
            using var doc = JsonDocument.Parse(json);
            if (doc.RootElement.ValueKind == JsonValueKind.Object &&
                doc.RootElement.TryGetProperty(propName, out var prop) &&
                prop.ValueKind == JsonValueKind.String)
            {
                return prop.GetString();
            }
        }
        catch { }
        return null;
    }

    #endregion
}
