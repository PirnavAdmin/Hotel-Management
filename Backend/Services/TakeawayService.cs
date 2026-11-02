using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using HMS.Data;
using HMS.DTOs;
using HMS.Hubs;
using HMS.Models;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace HMS.Services;

public class TakeawayService
{
    private readonly AppDbContext _context;
    private readonly SpService _spService;
    private readonly IHubContext<PosHub> _hubContext;
    private readonly ILogger<TakeawayService> _logger;

    // Idempotency cache: stores response for 15 minutes to prevent duplicate checkout orders
    private static readonly ConcurrentDictionary<string, (DateTime Expiry, TakeawayOrderResponseDto Response)>
        IdempotencyCache = new();

    public TakeawayService(
        AppDbContext context,
        SpService spService,
        IHubContext<PosHub> hubContext,
        ILogger<TakeawayService> logger)
    {
        _context = context;
        _spService = spService;
        _hubContext = hubContext;
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

            breakdowns.Add(new TakeawayCartItemBreakdown
            {
                ItemId = menuItem.MenuItemId,
                Name = menuItem.DishName,
                Category = menuItem.Category,
                UnitPrice = menuItem.Price,
                Quantity = itemInput.Quantity,
                TotalPrice = lineTotal,
                Notes = itemInput.Notes
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

    public async Task<TakeawayOrderResponseDto> CreateTakeawayOrderAsync(CreateTakeawayOrderRequest request)
    {
        // 1. Idempotency Check
        if (!string.IsNullOrWhiteSpace(request.IdempotencyKey))
        {
            var key = request.IdempotencyKey.Trim();
            if (IdempotencyCache.TryGetValue(key, out var cached) && cached.Expiry > DateTime.UtcNow)
            {
                _logger.LogInformation("Idempotent takeaway order hit for key {Key}", key);
                return cached.Response;
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

        // 3. Status resolution
        bool isPaid = request.IsPaid ||
            (!string.IsNullOrWhiteSpace(request.PaymentMethod) && !string.Equals(request.PaymentStatus, "Pending", StringComparison.OrdinalIgnoreCase));
        string orderStatus = isPaid ? "Settled" : "Active";
        string paymentStatus = isPaid ? "Paid" : "Pending";
        string paymentMethod = !string.IsNullOrWhiteSpace(request.PaymentMethod) ? request.PaymentMethod.Trim() : "Cash";

        // 4. Generate unique identifiers
        string dateStr = DateTime.UtcNow.ToString("yyyyMMdd");
        int countToday = await _context.Orders.CountAsync(o => o.CreatedAt.Date == DateTime.UtcNow.Date);
        string orderNumber = $"TAK-{dateStr}-{countToday + 1:0000}";
        string invoiceNumber = !string.IsNullOrWhiteSpace(request.InvoiceNumber)
            ? request.InvoiceNumber.Trim()
            : $"INV-{dateStr}-{DateTime.UtcNow:HHmmssfff}";

        // 5. Database Transaction Execution
        using var transaction = await _context.Database.BeginTransactionAsync();
        try
        {
            // A. Create restaurant_orders record
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
                SpecialInstructions = request.Notes ?? request.SpecialInstructions,
                IsActive = true,
                IsDeleted = false,
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
                    { "@cid", request.CustomerId },
                    { "@stat", isPaid ? "completed" : "pending" },
                    { "@sub", calculation.Subtotal },
                    { "@disc", calculation.DiscountAmount },
                    { "@tax", calculation.TaxAmount },
                    { "@pkg", calculation.PackagingCharge },
                    { "@tot", calculation.TotalAmount },
                    { "@notes", order.SpecialInstructions }
                });
            }
            catch { }

            // B. Create OrderItems
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
                    KotStatus = isPaid ? "Served" : "Queued",
                    KotBatch = 1,
                    IsActive = true,
                    IsDeleted = false,
                    CreatedAt = DateTime.UtcNow
                };
                order.Items.Add(oi);
            }
            await _context.SaveChangesAsync();

            // C. Dispatch Separate Kitchen KOT & Bar BOT Tickets
            var (kitchenKot, barKot) = await DispatchKotAndBotAsync(order);

            // D. Create Invoices record
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

            // E. Create Payment Record if paid
            if (isPaid)
            {
                var paymentModeUpper = paymentMethod.ToUpperInvariant();
                var paymentMethodEnum = paymentMethod.ToLowerInvariant() switch
                {
                    "upi" => "upi",
                    "card" => "card",
                    "wallet" => "wallet",
                    "netbanking" => "netbanking",
                    _ => "cash"
                };

                var payment = new InvoicePayment
                {
                    InvoiceId = invoice.InvoiceId,
                    Amount = calculation.TotalAmount,
                    AmountPaid = calculation.TotalAmount,
                    PaymentMode = paymentModeUpper,
                    PaymentMethod = paymentMethodEnum,
                    TransactionReference = $"TXN-TAK-{order.Id}-{DateTime.UtcNow:HHmmss}",
                    PaidAt = DateTime.UtcNow
                };
                _context.InvoicePayments.Add(payment);
                await _context.SaveChangesAsync();

                try
                {
                    var paymentSql = @"
                        UPDATE invoice_payments 
                        SET payment_method = @pmeth,
                            amount_paid = @amt,
                            payment_status = 'success',
                            txn_reference = @txn
                        WHERE payment_id = @pid;
                    ";
                    await _spService.ExecuteSqlNonQueryAsync(paymentSql, new Dictionary<string, object?>
                    {
                        { "@pmeth", paymentMethodEnum },
                        { "@amt", calculation.TotalAmount },
                        { "@txn", payment.TransactionReference },
                        { "@pid", payment.PaymentId }
                    });
                }
                catch { }
            }

            await transaction.CommitAsync();

            var response = new TakeawayOrderResponseDto
            {
                Success = true,
                Message = "Takeaway order and invoice created successfully.",
                OrderId = order.Id,
                OrderNumber = order.OrderNumber,
                InvoiceId = invoice.InvoiceId,
                InvoiceNumber = invoice.InvoiceNumber,
                OrderType = "TAKEAWAY",
                OrderStatus = order.Status,
                PaymentStatus = paymentStatus,
                PaymentMethod = paymentMethod,
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

            // Store in Idempotency cache
            if (!string.IsNullOrWhiteSpace(request.IdempotencyKey))
            {
                IdempotencyCache[request.IdempotencyKey.Trim()] = (DateTime.UtcNow.AddMinutes(15), response);
            }

            return response;
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync();
            _logger.LogError(ex, "Failed to create takeaway order. Rolled back transaction.");
            throw;
        }
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
                EF.Functions.Like(x.o.OrderNumber, $"%{s}%"));
        }

        if (!string.IsNullOrWhiteSpace(paymentStatus) && !string.Equals(paymentStatus, "all", StringComparison.OrdinalIgnoreCase))
        {
            var ps = paymentStatus.Trim();
            query = query.Where(x => x.inv.Status == ps || EF.Functions.Like(x.inv.Status, $"%{ps}%"));
        }

        var totalCount = await query.CountAsync();
        var rawRows = await query
            .OrderByDescending(x => x.inv.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        var orderIds = rawRows.Select(r => r.o.Id).Distinct().ToList();
        var itemCounts = await _context.OrderItems
            .AsNoTracking()
            .Where(oi => orderIds.Contains(oi.OrderId) && !oi.IsDeleted)
            .GroupBy(oi => oi.OrderId)
            .Select(g => new { OrderId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(g => g.OrderId, g => g.Count);

        var invoiceIds = rawRows.Select(r => r.inv.InvoiceId).Distinct().ToList();
        var payments = await _context.InvoicePayments
            .AsNoTracking()
            .Where(p => invoiceIds.Contains(p.InvoiceId))
            .OrderByDescending(p => p.PaidAt)
            .ToListAsync();
        var paymentsByInv = payments.GroupBy(p => p.InvoiceId).ToDictionary(g => g.Key, g => g.FirstOrDefault());

        var result = rawRows.Select(r =>
        {
            var pay = paymentsByInv.TryGetValue(r.inv.InvoiceId, out var p) ? p : null;
            return new TakeawayInvoiceSummaryDto
            {
                InvoiceId = r.inv.InvoiceId,
                InvoiceNumber = r.inv.InvoiceNumber,
                OrderId = r.o.Id,
                OrderNumber = r.o.OrderNumber,
                InvoiceDate = r.inv.CreatedAt,
                Subtotal = r.inv.Subtotal,
                DiscountAmount = r.inv.DiscountAmount,
                TaxAmount = r.inv.TaxAmount,
                TotalAmount = r.inv.TotalAmount,
                PaidAmount = r.inv.PaidAmount > 0 ? r.inv.PaidAmount : (r.inv.Status == "PAID" ? r.inv.TotalAmount : 0m),
                PaymentStatus = r.inv.Status == "PAID" ? "Paid" : "Pending",
                PaymentMethod = pay?.PaymentMode ?? "Cash",
                ItemCount = itemCounts.TryGetValue(r.o.Id, out var count) ? count : 0
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

        var order = await _context.Orders
            .AsNoTracking()
            .FirstOrDefaultAsync(o => o.Id == invoice.OrderId);

        var orderItems = await _context.OrderItems
            .AsNoTracking()
            .Where(oi => oi.OrderId == invoice.OrderId && !oi.IsDeleted)
            .ToListAsync();

        var payments = await _context.InvoicePayments
            .AsNoTracking()
            .Where(p => p.InvoiceId == invoice.InvoiceId)
            .OrderByDescending(p => p.PaidAt)
            .ToListAsync();

        var latestPayment = payments.FirstOrDefault();

        // Calculate CGST and SGST amounts (half of tax_amount each)
        decimal cgst = Math.Round(invoice.TaxAmount / 2m, 2);
        decimal sgst = invoice.TaxAmount - cgst;

        return new TakeawayInvoiceDetailDto
        {
            InvoiceId = invoice.InvoiceId,
            InvoiceNumber = invoice.InvoiceNumber,
            OrderId = invoice.OrderId,
            OrderNumber = order?.OrderNumber ?? $"ORD-{invoice.OrderId}",
            OrderDate = order?.CreatedAt ?? invoice.CreatedAt,
            InvoiceDate = invoice.CreatedAt,
            OrderType = order?.OrderType ?? "Takeaway",
            Subtotal = invoice.Subtotal,
            DiscountAmount = invoice.DiscountAmount,
            TaxableAmount = invoice.TaxableAmount,
            CgstAmount = cgst,
            SgstAmount = sgst,
            TaxAmount = invoice.TaxAmount,
            PackagingCharge = 0m,
            RoundOff = 0m,
            TotalAmount = invoice.TotalAmount,
            PaidAmount = invoice.PaidAmount > 0 ? invoice.PaidAmount : (invoice.Status == "PAID" ? invoice.TotalAmount : 0m),
            PaymentMethod = latestPayment?.PaymentMode ?? "Cash",
            PaymentStatus = invoice.Status == "PAID" ? "Paid" : "Pending",
            Items = orderItems.Select(oi => new TakeawayCartItemBreakdown
            {
                ItemId = oi.MenuItemId,
                Name = oi.Name,
                Category = "Item",
                UnitPrice = oi.Price,
                Quantity = oi.Quantity,
                TotalPrice = oi.TotalPrice,
                Notes = oi.Notes
            }).ToList(),
            Payments = payments.Select(p => new TakeawayPaymentRecordDto
            {
                PaymentId = p.PaymentId,
                Amount = p.Amount,
                PaymentMode = p.PaymentMode,
                TransactionReference = p.TransactionReference,
                PaymentStatus = "success",
                PaidAt = p.PaidAt
            }).ToList()
        };
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
            .FirstOrDefaultAsync(i => i.OrderId == order.Id);

        var orderItems = await _context.OrderItems
            .AsNoTracking()
            .Where(oi => oi.OrderId == order.Id && !oi.IsDeleted)
            .ToListAsync();

        List<InvoicePayment> payments = new();
        if (invoice != null)
        {
            payments = await _context.InvoicePayments
                .AsNoTracking()
                .Where(p => p.InvoiceId == invoice.InvoiceId)
                .OrderByDescending(p => p.PaidAt)
                .ToListAsync();
        }

        decimal subtotal = orderItems.Sum(i => i.TotalPrice);
        decimal total = invoice?.TotalAmount ?? subtotal;
        decimal tax = invoice?.TaxAmount ?? Math.Round(subtotal * 0.05m, 2);
        decimal cgst = Math.Round(tax / 2m, 2);
        decimal sgst = tax - cgst;

        return new TakeawayInvoiceDetailDto
        {
            InvoiceId = invoice?.InvoiceId ?? 0,
            InvoiceNumber = invoice?.InvoiceNumber ?? $"INV-{order.Id}",
            OrderId = order.Id,
            OrderNumber = order.OrderNumber,
            OrderDate = order.CreatedAt,
            InvoiceDate = invoice?.CreatedAt ?? order.CreatedAt,
            OrderType = order.OrderType,
            Subtotal = invoice?.Subtotal ?? subtotal,
            DiscountAmount = invoice?.DiscountAmount ?? 0m,
            TaxableAmount = invoice?.TaxableAmount ?? subtotal,
            CgstAmount = cgst,
            SgstAmount = sgst,
            TaxAmount = tax,
            PackagingCharge = 0m,
            RoundOff = 0m,
            TotalAmount = total,
            PaidAmount = invoice?.PaidAmount ?? (order.Status == "Settled" ? total : 0m),
            PaymentMethod = payments.FirstOrDefault()?.PaymentMode ?? "Cash",
            PaymentStatus = (order.Status == "Settled" || invoice?.Status == "PAID") ? "Paid" : "Pending",
            Items = orderItems.Select(oi => new TakeawayCartItemBreakdown
            {
                ItemId = oi.MenuItemId,
                Name = oi.Name,
                Category = "Item",
                UnitPrice = oi.Price,
                Quantity = oi.Quantity,
                TotalPrice = oi.TotalPrice,
                Notes = oi.Notes
            }).ToList(),
            Payments = payments.Select(p => new TakeawayPaymentRecordDto
            {
                PaymentId = p.PaymentId,
                Amount = p.Amount,
                PaymentMode = p.PaymentMode,
                TransactionReference = p.TransactionReference,
                PaymentStatus = "success",
                PaidAt = p.PaidAt
            }).ToList()
        };
    }

    public async Task<bool> RecordPaymentAsync(long orderOrInvoiceId, TakeawayRecordPaymentRequest request)
    {
        var invoice = await _context.Invoices
            .FirstOrDefaultAsync(i => i.InvoiceId == orderOrInvoiceId || i.OrderId == orderOrInvoiceId);

        if (invoice == null)
        {
            return false;
        }

        decimal payAmount = request.Amount ?? invoice.TotalAmount;
        string modeUpper = (request.PaymentMethod ?? "Cash").ToUpperInvariant();
        string methodEnum = (request.PaymentMethod ?? "cash").ToLowerInvariant() switch
        {
            "upi" => "upi",
            "card" => "card",
            "wallet" => "wallet",
            "netbanking" => "netbanking",
            _ => "cash"
        };

        var payment = new InvoicePayment
        {
            InvoiceId = invoice.InvoiceId,
            Amount = payAmount,
            AmountPaid = payAmount,
            PaymentMode = modeUpper,
            PaymentMethod = methodEnum,
            TransactionReference = request.TransactionReference ?? $"TXN-TAK-{invoice.OrderId}-{DateTime.UtcNow:HHmmss}",
            PaidAt = DateTime.UtcNow
        };
        _context.InvoicePayments.Add(payment);

        invoice.PaidAmount = payAmount;
        invoice.AmountPaid = payAmount;
        invoice.Status = "PAID";
        invoice.UpdatedAt = DateTime.UtcNow;

        var order = await _context.Orders.FirstOrDefaultAsync(o => o.Id == invoice.OrderId);
        if (order != null)
        {
            order.Status = "Settled";
            order.UpdatedAt = DateTime.UtcNow;
        }

        await _context.SaveChangesAsync();

        try
        {
            await _spService.ExecuteSqlNonQueryAsync(
                "UPDATE invoices SET payment_status = 'paid', status = 'PAID', paid_amount = @amt WHERE invoice_id = @iid;",
                new Dictionary<string, object?> { { "@amt", payAmount }, { "@iid", invoice.InvoiceId } });

            await _spService.ExecuteSqlNonQueryAsync(
                "UPDATE invoice_payments SET payment_method = @pm, amount_paid = @amt, payment_status = 'success' WHERE payment_id = @pid;",
                new Dictionary<string, object?> { { "@pm", methodEnum }, { "@amt", payAmount }, { "@pid", payment.PaymentId } });
        }
        catch { }

        return true;
    }

    #endregion

    #region Helper Methods

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
                    await _context.Database.ExecuteSqlRawAsync(rawSql, kot.KotNumber, order.Id, "Takeaway Order");
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
            }

            if (allBar.Count > 0)
            {
                string botNumber = $"BOT-{DateTime.UtcNow:yyyyMMddHHmmssfff}";
                long botId = 0;
                try
                {
                    var insertBotSql = @"INSERT INTO bar_order_tickets (bot_number, order_id, bar_counter_id, batch_number, status, priority, special_notes, created_at)
                                         VALUES (@bnum, @oid, 1, 1, 'queued', 'normal', 'Takeaway Drink', NOW());
                                         SELECT LAST_INSERT_ID();";
                    botId = await _spService.ExecuteSqlScalarAsync<long>(insertBotSql, new Dictionary<string, object?>
                    {
                        { "bnum", botNumber },
                        { "oid", order.Id }
                    });
                }
                catch { }

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
}
