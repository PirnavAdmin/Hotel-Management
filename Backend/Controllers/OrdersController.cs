namespace HMS.Controllers;

using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using HMS.Data;
using HMS.DTOs;
using HMS.Hubs;
using HMS.Models;
using HMS.Services;

[ApiController]
[Route("api/v1/orders")]
[Tags("Orders")]
public class OrdersController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly SpService _spService;
    private readonly ReportingExportService _reportingExportService;
    private readonly ExportService _exportService;
    private readonly IHubContext<PosHub> _hubContext;
    private readonly IRealtimeSyncService _realtimeSync;
    private readonly ILogger<OrdersController> _logger;

    public OrdersController(
        AppDbContext context,
        SpService spService,
        ReportingExportService reportingExportService,
        ExportService exportService,
        IHubContext<PosHub> hubContext,
        IRealtimeSyncService realtimeSync,
        ILogger<OrdersController> logger)
    {
        _context = context;
        _spService = spService;
        _reportingExportService = reportingExportService;
        _exportService = exportService;
        _hubContext = hubContext;
        _realtimeSync = realtimeSync;
        _logger = logger;
    }

    // ============================================================
    // GET ACTIVE ORDERS
    // ============================================================

    [HttpGet("takeaway")]
    public async Task<IActionResult> GetUndispatchedTakeawayOrders()
    {
        var orders = await _context.Orders
            .Include(o => o.Items)
            .Where(o => o.IsActive && !o.IsDeleted &&
                o.OrderType.ToLower() == "takeaway" && o.Status.ToLower() == "settled" &&
                (o.FulfillmentStatus == null || o.FulfillmentStatus.ToLower() != "cancelled") &&
                o.Items.Any(i => i.IsActive && !i.IsDeleted &&
                    i.KotStatus.ToLower() != "served" &&
                    i.KotStatus.ToLower() != "cancelled" &&
                    i.KotStatus.ToLower() != "canceled"))
            .OrderByDescending(o => o.CreatedAt)
            .ToListAsync();

        foreach (var order in orders)
        {
            await CleanDuplicateOrderItemsAsync(order);
            await TakeawayStatusSyncHelper.SyncTakeawayFromItemsAsync(_context, order.Id);
            await PopulateDisplayFields(order);
            RecalculateTotals(order);
        }

        var dtos = orders.Select(MapToOrderDto).ToList();
        await PopulateInvoiceLinksAsync(dtos);
        return Ok(dtos);
    }

    [HttpPost("{id:long}/dispatch")]
    public async Task<IActionResult> DispatchTakeawayOrder(long id)
    {
        var order = await _context.Orders.Include(o => o.Items)
            .FirstOrDefaultAsync(o => o.Id == id && o.IsActive && !o.IsDeleted &&
                o.OrderType.ToLower() == "takeaway" && o.Status.ToLower() == "settled");
        if (order == null) return NotFound(new { success = false, message = "Takeaway order not found." });

        var kitchenItems = order.Items.Where(i => i.IsActive && !i.IsDeleted &&
            !string.Equals(i.KotStatus, "Cancelled", StringComparison.OrdinalIgnoreCase) &&
            !string.Equals(i.KotStatus, "Canceled", StringComparison.OrdinalIgnoreCase)).ToList();
        var fulfillmentStatus = order.FulfillmentStatus?.Trim();
        var isAlreadyHandedOver = string.Equals(fulfillmentStatus, "PickedUp", StringComparison.OrdinalIgnoreCase) ||
            string.Equals(fulfillmentStatus, "Completed", StringComparison.OrdinalIgnoreCase) ||
            (kitchenItems.Count > 0 && kitchenItems.All(i => string.Equals(i.KotStatus, "Served", StringComparison.OrdinalIgnoreCase)));
        if (isAlreadyHandedOver)
        {
            return Conflict(new { success = false, message = "This takeaway order has already been handed over." });
        }
        if (kitchenItems.Count == 0 || kitchenItems.Any(i =>
            i.KotStatus != "Ready" && i.KotStatus != "ready" &&
            i.KotStatus != "Completed" && i.KotStatus != "completed"))
        {
            return Conflict(new { success = false, message = "The kitchen must mark every item ready before dispatch." });
        }

        foreach (var item in kitchenItems)
        {
            item.KotStatus = "Served";
            item.UpdatedAt = DateTime.UtcNow;
        }
        order.FulfillmentStatus = "PickedUp";
        order.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        await _realtimeSync.PublishAsync(new RealtimeEvent
        {
            EventType = "takeaway:statusChanged",
            Module = "Takeaway",
            Action = "statusChanged",
            BranchId = order.OutletId > 0 ? order.OutletId : 1,
            RecordId = order.Id.ToString(),
            Data = new { orderId = order.Id, status = order.Status, fulfillmentStatus = order.FulfillmentStatus }
        });

        return Ok(new { success = true, message = "Takeaway order dispatched.", orderId = order.Id, fulfillmentStatus = order.FulfillmentStatus });
    }

    [HttpGet("active")]
    [HttpGet]
    public async Task<IActionResult> GetActiveOrders()
    {
        var orders = await _context.Orders
            .Include(o => o.Items)
            .Where(o => o.IsActive && !o.IsDeleted &&
                (o.Status == "Active" || o.Status == "active" || o.Status == "Billed" || o.Status == "billed"))
            .OrderByDescending(o => o.CreatedAt)
            .ToListAsync();

        foreach (var order in orders)
        {
            await PopulateDisplayFields(order);
            RecalculateTotals(order);
        }

        var dtos = orders.Select(MapToOrderDto).ToList();
        await PopulateInvoiceLinksAsync(dtos);
        return Ok(dtos);
    }

    // ============================================================
    // GET ORDER BY ID
    // ============================================================

    [HttpGet("{id:long}")]
    public async Task<IActionResult> GetOrderById(long id)
    {
        var order = await _context.Orders
            .Include(o => o.Items)
            .FirstOrDefaultAsync(o => o.Id == id && o.IsActive && !o.IsDeleted);

        if (order == null)
        {
            return NotFound(new { message = $"Order {id} not found." });
        }

        await CleanDuplicateOrderItemsAsync(order);
        await PopulateDisplayFields(order);
        RecalculateTotals(order);

        var dto = MapToOrderDto(order);
        await PopulateInvoiceLinksAsync(new[] { dto });
        return Ok(dto);
    }

    private async Task PopulateInvoiceLinksAsync(IList<OrderDto> dtos)
    {
        if (dtos == null || dtos.Count == 0) return;
        var ids = dtos.Select(d => d.Id).Where(id => id > 0).Distinct().ToList();
        if (ids.Count == 0) return;

        var invoices = await _context.Invoices
            .AsNoTracking()
            .Where(i => ids.Contains(i.OrderId))
            .OrderByDescending(i => i.CreatedAt)
            .Select(i => new { i.OrderId, i.InvoiceId, i.InvoiceNumber })
            .ToListAsync();

        var byOrder = invoices
            .GroupBy(i => i.OrderId)
            .ToDictionary(g => g.Key, g => g.First());

        foreach (var dto in dtos)
        {
            if (byOrder.TryGetValue(dto.Id, out var inv))
            {
                dto.InvoiceId = inv.InvoiceId;
                dto.InvoiceNo = inv.InvoiceNumber;
            }
        }
    }


    // ============================================================
    // GET ORDER BY TABLE
    // ============================================================

    [HttpGet("table/{tableId}")]
    public async Task<IActionResult> GetOrderByTable(long tableId)
    {
        try
        {
            // 1. Check for any open (non-settled, non-cancelled) order by TableId directly
            var order = await _context.Orders
                .Include(o => o.Items)
                .Where(o =>
                    o.TableId == tableId &&
                    o.IsActive &&
                    !o.IsDeleted &&
                    o.Status != "Settled" &&
                    o.Status != "settled" &&
                    o.Status != "Cancelled" &&
                    o.Status != "cancelled")
                .OrderByDescending(o => o.CreatedAt)
                .FirstOrDefaultAsync();

            // 2. If not found by TableId, also check matching table in RestaurantTables
            if (order == null)
            {
                var restTable = await _context.RestaurantTables
                    .FirstOrDefaultAsync(t => (t.TableId == tableId || t.TableNumber == tableId.ToString()) && t.DeletedAt == null);

                if (restTable != null)
                {
                    order = await _context.Orders
                        .Include(o => o.Items)
                        .Where(o =>
                            (o.TableId == restTable.TableId || o.TableName == restTable.TableName || o.TableName == restTable.TableNumber) &&
                            o.IsActive &&
                            !o.IsDeleted &&
                            o.Status != "Settled" &&
                            o.Status != "settled" &&
                            o.Status != "Cancelled" &&
                            o.Status != "cancelled")
                        .OrderByDescending(o => o.CreatedAt)
                        .FirstOrDefaultAsync();
                }
            }

            if (order == null)
            {
                // Table has no active order. Return 200 OK with null data so client can take a new order.
                return Ok(null);
            }

            await CleanDuplicateOrderItemsAsync(order);
            await PopulateDisplayFields(order);
            RecalculateTotals(order);

            var dto = MapToOrderDto(order);
            await PopulateInvoiceLinksAsync(new[] { dto });
            return Ok(dto);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Error getting order for table {TableId}: {Message}", tableId, ex.Message);
            return Ok(null);
        }
    }


    // ============================================================
    // CREATE ORDER / ADD ITEMS
    // ============================================================

    [HttpPost]
    public async Task<IActionResult> CreateOrAddToOrder(
        [FromBody] CreateOrderRequest request)
    {
        if (request == null)
        {
            return BadRequest(new
            {
                message = "Request body is required."
            });
        }


        // 1. Idempotency Check (prevent duplicate orders / invoices on retries)
        var idempotencyToken = !string.IsNullOrWhiteSpace(request.IdempotencyKey)
            ? request.IdempotencyKey.Trim()
            : (!string.IsNullOrWhiteSpace(request.InvoiceNumber) ? request.InvoiceNumber.Trim() : null);

        if (!string.IsNullOrWhiteSpace(idempotencyToken))
        {
            var existingInvoice = await _context.Invoices.FirstOrDefaultAsync(i => i.InvoiceNumber == idempotencyToken);
            if (existingInvoice != null)
            {
                var existingOrder = await _context.Orders.Include(o => o.Items).FirstOrDefaultAsync(o => o.Id == existingInvoice.OrderId);
                if (existingOrder != null)
                {
                    await PopulateDisplayFields(existingOrder);
                    RecalculateTotals(existingOrder);
                    var existingDto = MapToOrderDto(existingOrder);
                    existingDto.InvoiceId = existingInvoice.InvoiceId;
                    existingDto.InvoiceNo = existingInvoice.InvoiceNumber;
                    return Ok(new
                    {
                        success = true,
                        orderId = existingOrder.Id,
                        orderNumber = existingOrder.OrderNumber,
                        invoiceId = existingInvoice.InvoiceId,
                        invoiceNumber = existingInvoice.InvoiceNumber,
                        data = existingDto
                    });
                }
            }
        }

        // 2. Self Service Order Handling
        bool isSelfService = string.Equals(request.OrderType, "SelfService", StringComparison.OrdinalIgnoreCase) ||
            string.Equals(request.OrderType, "Self Service", StringComparison.OrdinalIgnoreCase) ||
            string.Equals(request.TableName, "Self Service", StringComparison.OrdinalIgnoreCase);

        if (isSelfService)
        {
            var ssRequest = new CreateSelfServiceOrderRequest
            {
                CustomerName = request.CustomerName,
                CustomerPhone = request.CustomerPhone,
                IdempotencyKey = request.IdempotencyKey ?? request.InvoiceNumber,
                RequestedDiscountPercent = request.DiscountPercent > 0 ? request.DiscountPercent : null,
                Items = request.Items?.Select(i => new SelfServiceOrderItemInput
                {
                    MenuItemId = i.MenuItemId ?? i.Id ?? i.BackendId ?? i.ItemId ?? 0,
                    Quantity = i.Quantity,
                    Notes = i.Notes,
                    ClientSuppliedPrice = i.Price
                }).ToList() ?? new List<SelfServiceOrderItemInput>()
            };

            return await CreateSelfServiceOrderInternalAsync(ssRequest, null);
        }

        // 3. Takeaway Order Handling (direct takeaway checkout without locking a dining table)
        bool isTakeaway = request.IsTakeaway ||
            string.Equals(request.OrderType, "Takeaway", StringComparison.OrdinalIgnoreCase) ||
            string.Equals(request.TableName, "Takeaway", StringComparison.OrdinalIgnoreCase);

        if (isTakeaway)
        {
            var takeawayOrder = new Order
            {
                OrderNumber = await GenerateOrderNumber(),
                OutletId = 1,
                OrderType = "Takeaway",
                TableId = null,
                TableName = "Takeaway",
                Section = "Takeaway",
                ServerName = !string.IsNullOrWhiteSpace(request.ServerName) ? request.ServerName : "Cashier",
                Guests = request.Guests > 0 ? request.Guests : 1,
                Status = "Active",
                FulfillmentStatus = "New",
                IsActive = true,
                IsDeleted = false,
                CreatedAt = DateTime.UtcNow
            };

            _context.Orders.Add(takeawayOrder);
            await _context.SaveChangesAsync();

            foreach (var itemInput in request.Items)
            {
                if (itemInput.Quantity <= 0) continue;

                long menuItemId = itemInput.MenuItemId ?? 0;
                if (menuItemId <= 0 && !string.IsNullOrWhiteSpace(itemInput.Name))
                {
                    var m = await _context.MenuItems
                        .AsNoTracking()
                        .FirstOrDefaultAsync(mi => mi.DishName == itemInput.Name.Trim() || EF.Functions.Like(itemInput.Name, "%" + mi.DishName + "%"));
                    if (m != null)
                    {
                        menuItemId = m.MenuItemId;
                    }
                }
                if (menuItemId <= 0) menuItemId = OrderItemRouting.IsBarItem(false, null, null, itemInput.Name) ? 7 : 1;

                if (menuItemId > 0 && (itemInput.Price <= 0 || string.IsNullOrWhiteSpace(itemInput.Name)))
                {
                    var m = await _context.MenuItems
                        .AsNoTracking()
                        .FirstOrDefaultAsync(mi => mi.MenuItemId == menuItemId);
                    if (m != null)
                    {
                        if (itemInput.Price <= 0) itemInput.Price = m.Price;
                        if (string.IsNullOrWhiteSpace(itemInput.Name)) itemInput.Name = m.DishName;
                    }
                }

                var newItem = new OrderItem
                {
                    OrderId = takeawayOrder.Id,
                    MenuItemId = menuItemId,
                    VariantId = itemInput.VariantId,
                    Name = itemInput.Name,
                    Price = itemInput.Price,
                    Quantity = itemInput.Quantity,
                    TotalPrice = itemInput.Price * itemInput.Quantity,
                    Notes = itemInput.Notes,
                    KotStatus = "Queued",
                    KotBatch = 1,
                    KotId = null,
                    IsActive = true,
                    IsDeleted = false,
                    CreatedAt = DateTime.UtcNow
                };

                takeawayOrder.Items.Add(newItem);
            }

            RecalculateTotals(takeawayOrder);

            // Automatically dispatch separate Kitchen KOT & Bar BOT tickets for Takeaway order
            var (tKitchenKot, tBarKot) = await DispatchKotAndBotForOrderAsync(takeawayOrder);

            bool isSettlingNow = !string.IsNullOrWhiteSpace(request.PaymentMethod) ||
                (request.Status != null && request.Status.Equals("settled", StringComparison.OrdinalIgnoreCase));

            long invoiceId = 0;
            string? assignedInvoiceNo = null;

            if (isSettlingNow)
            {
                takeawayOrder.Status = "Settled";
                takeawayOrder.PaymentStatus = "Paid";
                takeawayOrder.FulfillmentStatus = "New";
                takeawayOrder.PaymentMethod = request.PaymentMethod ?? "Cash";
                takeawayOrder.DiscountPercent = request.DiscountPercent;
                takeawayOrder.TipAmount = request.TipAmount;
                takeawayOrder.ServiceChargePercent = request.ServiceChargeEnabled ? 5m : 0m;
                takeawayOrder.SettledAt = DateTime.UtcNow;
                takeawayOrder.UpdatedAt = DateTime.UtcNow;
                RecalculateTotals(takeawayOrder);

                await _context.SaveChangesAsync();

                invoiceId = await EnsureInvoiceCreatedAsync(
                    takeawayOrder,
                    takeawayOrder.PaymentMethod ?? "Cash",
                    request.InvoiceNumber);

                assignedInvoiceNo = !string.IsNullOrWhiteSpace(request.InvoiceNumber)
                    ? request.InvoiceNumber.Trim()
                    : $"INV-{DateTime.UtcNow:yyyyMMdd}-{takeawayOrder.Id}";
            }
            else
            {
                await _context.SaveChangesAsync();
            }

            await PopulateDisplayFields(takeawayOrder);
            var takeawayDto = MapToOrderDto(takeawayOrder);
            if (invoiceId > 0)
            {
                takeawayDto.InvoiceId = invoiceId;
                takeawayDto.InvoiceNo = assignedInvoiceNo;
            }

            await _realtimeSync.PublishAsync(new RealtimeEvent
            {
                EventType = "takeaway:created",
                Module = "Takeaway",
                Action = "created",
                BranchId = takeawayOrder.OutletId > 0 ? takeawayOrder.OutletId : 1,
                RecordId = takeawayOrder.Id.ToString(),
                Data = takeawayDto
            });

            await _realtimeSync.PublishAsync(new RealtimeEvent
            {
                EventType = "order:created",
                Module = "Orders",
                Action = "created",
                BranchId = takeawayOrder.OutletId > 0 ? takeawayOrder.OutletId : 1,
                RecordId = takeawayOrder.Id.ToString(),
                Data = takeawayDto
            });

            return Ok(new
            {
                success = true,
                orderId = takeawayOrder.Id,
                orderNumber = takeawayOrder.OrderNumber,
                invoiceId = invoiceId > 0 ? (long?)invoiceId : null,
                invoiceNumber = assignedInvoiceNo ?? takeawayDto.InvoiceNo,
                kitchenKot = tKitchenKot,
                barKot = tBarKot,
                data = takeawayDto
            });
        }

        long resolvedTableId = request.TableId ?? 0;
        if (resolvedTableId <= 0 && (!string.IsNullOrWhiteSpace(request.TableName) || !string.IsNullOrWhiteSpace(request.TableNumber)))

        {
            var searchName = !string.IsNullOrWhiteSpace(request.TableNumber) ? request.TableNumber.Trim() : request.TableName!.Trim();
            var matchedTable = await _context.RestaurantTables.FirstOrDefaultAsync(t => (t.TableNumber == searchName || t.TableName == searchName) && t.DeletedAt == null);
            if (matchedTable != null)
            {
                resolvedTableId = matchedTable.TableId;
            }
        }
        if (!isTakeaway && resolvedTableId <= 0)
        {
            var firstTable = await _context.RestaurantTables.FirstOrDefaultAsync(t => t.DeletedAt == null);
            resolvedTableId = firstTable?.TableId ?? 1;
        }

        if (request.Items == null || !request.Items.Any())
        {
            return BadRequest(new
            {
                message = "At least one order item is required."
            });
        }

        DiningTable? table = isTakeaway ? null : await _context.DiningTables
            .FirstOrDefaultAsync(t => t.Id == resolvedTableId && t.IsActive && !t.IsDeleted);

        if (table == null && !isTakeaway)
        {
            var restTable = await _context.RestaurantTables
                .FirstOrDefaultAsync(t => t.TableId == resolvedTableId && t.DeletedAt == null);

            if (restTable != null)
            {
                try
                {
                    await _spService.ExecuteSqlNonQueryAsync(
                        "INSERT INTO dining_tables (dining_table_id, section_id, table_number, seating_capacity, status, is_active, is_deleted, created_at, updated_at, branch_id, outlet_id) VALUES (@tid, 1, @tnum, @cap, @stat, 1, 0, NOW(), NOW(), @bid, 1) ON DUPLICATE KEY UPDATE table_number = VALUES(table_number);",
                        new Dictionary<string, object?> { { "tid", restTable.TableId }, { "tnum", restTable.TableNumber }, { "cap", restTable.CapacityChairs }, { "stat", restTable.Status }, { "bid", restTable.BranchId } });
                }
                catch { }

                table = await _context.DiningTables.FirstOrDefaultAsync(t => t.Id == restTable.TableId);
                if (table == null)
                {
                    table = new DiningTable
                    {
                        Id = restTable.TableId,
                        SectionId = 1,
                        Name = !string.IsNullOrWhiteSpace(restTable.TableName) ? restTable.TableName : $"Table {restTable.TableId}",
                        Capacity = restTable.CapacityChairs > 0 ? restTable.CapacityChairs : 4,
                        Status = restTable.Status,
                        IsActive = true,
                        IsDeleted = false
                    };
                }
            }
            else
            {
                table = new DiningTable
                {
                    Id = resolvedTableId,
                    SectionId = 1,
                    Name = $"Table {resolvedTableId}",
                    Capacity = 4,
                    Status = "occupied",
                    IsActive = true,
                    IsDeleted = false
                };
            }
        }

        var section = table == null ? null : await _context.DiningSections
            .FirstOrDefaultAsync(s => s.Id == table.SectionId && s.IsActive && !s.IsDeleted);

        if (section == null)
        {
            section = await _context.DiningSections.FirstOrDefaultAsync(s => s.IsActive && !s.IsDeleted);
            if (section == null)
            {
                section = new DiningSection
                {
                    SectionName = "Main Hall",
                    OutletId = 1,
                    IsActive = true,
                    IsDeleted = false
                };
                _context.DiningSections.Add(section);
                await _context.SaveChangesAsync();
            }
        }

        var order = isTakeaway ? null : await _context.Orders
            .Include(o => o.Items)
            .FirstOrDefaultAsync(o => o.TableId == table!.Id && o.IsActive && !o.IsDeleted &&
                (o.Status == "Active" || o.Status == "active"));

        bool isNewOrder = order == null;

        // ========================================================
        // CREATE NEW ORDER
        // ========================================================

        if (isNewOrder)
        {
            order = new Order
            {
                OrderNumber = await GenerateOrderNumber(),

                OutletId = section.OutletId,

                OrderType = isTakeaway ? "Takeaway" : "DineIn",

                TableId = table?.Id,

                Guests = request.Guests > 0
                    ? request.Guests
                    : 1,

                Status = "Active",

                IsActive = true,

                IsDeleted = false,

                CreatedAt = DateTime.UtcNow
            };

            _context.Orders.Add(order);

            // IMPORTANT:
            // Save ONLY the order here.
            //
            // Do NOT add order items yet because
            // order_items.kot_id is NOT NULL.

            await _context.SaveChangesAsync();

            if (table != null)
            {
                table.Status = "occupied";
                table.UpdatedAt = DateTime.UtcNow;

                var restTableSync = await _context.RestaurantTables.FirstOrDefaultAsync(t =>
                    (t.TableId == table.Id || t.TableNumber == table.Name || t.TableName == table.Name) && t.DeletedAt == null);
                if (restTableSync != null)
                {
                    restTableSync.Status = "occupied";
                    restTableSync.OccupiedChairs = request.Guests > 0 ? request.Guests : 1;
                    restTableSync.UpdatedAt = DateTime.UtcNow;
                }

                await _context.SaveChangesAsync();
            }
        }
        else
        {
            order!.Guests = request.Guests > 0
                ? request.Guests
                : order.Guests;
        }

        // ========================================================
        // DISPLAY INFORMATION
        // ========================================================

        await PopulateDisplayFields(order);

        // ========================================================
        // ADD / UPDATE ITEMS IN MEMORY
        // ========================================================

        foreach (var itemInput in request.Items)
        {
            if (itemInput.Quantity <= 0)
            {
                continue;
            }

            long menuItemId = itemInput.MenuItemId ?? 0;
            if (menuItemId <= 0 && !string.IsNullOrWhiteSpace(itemInput.Name))
            {
                var m = await _context.MenuItems
                    .AsNoTracking()
                    .FirstOrDefaultAsync(mi => mi.DishName == itemInput.Name.Trim() || EF.Functions.Like(itemInput.Name, "%" + mi.DishName + "%"));
                if (m != null)
                {
                    menuItemId = m.MenuItemId;
                }
            }
            if (menuItemId <= 0)
            {
                menuItemId = OrderItemRouting.IsBarItem(false, null, null, itemInput.Name) ? 7 : 1;
            }

            if (menuItemId > 0 && (itemInput.Price <= 0 || string.IsNullOrWhiteSpace(itemInput.Name)))
            {
                var miRec = await _context.MenuItems.AsNoTracking().FirstOrDefaultAsync(mi => mi.MenuItemId == menuItemId);
                if (miRec != null)
                {
                    if (itemInput.Price <= 0) itemInput.Price = miRec.Price;
                    if (string.IsNullOrWhiteSpace(itemInput.Name)) itemInput.Name = miRec.DishName;
                }
            }

            var existingItem = order.Items.FirstOrDefault(i =>
                (i.MenuItemId == menuItemId && string.Equals(i.Name, itemInput.Name, StringComparison.OrdinalIgnoreCase)) &&
                i.VariantId == itemInput.VariantId &&
                (i.KotStatus == "Queued" ||
                 i.KotStatus == "queued") &&
                (i.KotId == null || i.KotId == 0) &&
                (i.BotId == null || i.BotId == 0));

            if (existingItem != null)
            {
                // Rapid duplicate protection: if this exact item was added within the last 15 seconds, ignore duplicate call
                if (existingItem.Quantity == itemInput.Quantity && Math.Abs((DateTime.UtcNow - existingItem.CreatedAt).TotalSeconds) < 15)
                {
                    continue;
                }

                existingItem.Quantity += itemInput.Quantity;

                existingItem.TotalPrice =
                    existingItem.Price *
                    existingItem.Quantity;

                existingItem.Notes =
                    itemInput.Notes ??
                    existingItem.Notes;

                existingItem.UpdatedAt =
                    DateTime.UtcNow;
            }
            else
            {
                // Idempotency check: if an active item for this exact dish was added within the last 20 seconds, skip duplicate creation
                var recentMatch = order.Items.FirstOrDefault(i =>
                    i.IsActive && !i.IsDeleted &&
                    (i.MenuItemId == menuItemId || string.Equals(i.Name, itemInput.Name, StringComparison.OrdinalIgnoreCase)) &&
                    i.VariantId == itemInput.VariantId &&
                    Math.Abs((DateTime.UtcNow - i.CreatedAt).TotalSeconds) < 20);

                if (recentMatch != null)
                {
                    continue;
                }

                var newItem = new OrderItem
                {
                    OrderId = order.Id,

                    MenuItemId = menuItemId,

                    VariantId = itemInput.VariantId,

                    Name = itemInput.Name,

                    Price = itemInput.Price,

                    Quantity = itemInput.Quantity,

                    TotalPrice =
                        itemInput.Price *
                        itemInput.Quantity,

                    Notes = itemInput.Notes,

                    KotStatus = "Queued",

                    KotBatch = 1,

                    KotId = null,

                    IsActive = true,

                    IsDeleted = false,

                    CreatedAt = DateTime.UtcNow
                };

                order.Items.Add(newItem);
            }
        }

        RecalculateTotals(order);

        // If settlement info was supplied with order creation (e.g. POS settlement workflow)
        bool isSettling = !string.IsNullOrWhiteSpace(request.PaymentMethod) || (request.Status != null && request.Status.Equals("settled", StringComparison.OrdinalIgnoreCase));
        if (isSettling)
        {
            order.Status = "Settled";
            order.PaymentMethod = request.PaymentMethod ?? "Cash";
            order.InvoiceNo = request.InvoiceNumber;
            order.DiscountPercent = request.DiscountPercent;
            order.TipAmount = request.TipAmount;
            order.ServiceChargePercent = request.ServiceChargeEnabled ? 5m : 0m;
            order.SettledAt = DateTime.UtcNow;
            order.UpdatedAt = DateTime.UtcNow;
            RecalculateTotals(order);

            if (table != null)
            {
                table.Status = "vacant";
                table.UpdatedAt = DateTime.UtcNow;

                var restTbl = await _context.RestaurantTables.FirstOrDefaultAsync(t =>
                    (t.TableId == table.Id || t.TableNumber == table.Name || t.TableName == table.Name) && t.DeletedAt == null);
                if (restTbl != null)
                {
                    restTbl.Status = "available";
                    restTbl.OccupiedChairs = 0;
                    restTbl.UpdatedAt = DateTime.UtcNow;
                }
            }
        }

        await _context.SaveChangesAsync();

        if (isSettling)
        {
            long invoiceId = await EnsureInvoiceCreatedAsync(order, order.PaymentMethod ?? "Cash", request.InvoiceNumber);

        }

        // ========================================================
        // SIGNALR - FLOOR
        // ========================================================

        await _hubContext.Clients
            .Group("floor")
            .SendAsync(
                "OrderUpdated",
                new
                {
                    orderId = order.Id,

                    tableId = order.TableId,

                    items = order.Items
                        .Select(MapToOrderItemDto)
                        .ToList(),

                    grandTotal = order.GrandTotal
                });

        var finalOrderDto = MapToOrderDto(order);

        await _realtimeSync.PublishAsync(new RealtimeEvent
        {
            EventType = isNewOrder ? "order:created" : "order:updated",
            Module = "Orders",
            Action = isNewOrder ? "created" : "updated",
            BranchId = order.OutletId > 0 ? order.OutletId : 1,
            RecordId = order.Id.ToString(),
            Data = finalOrderDto
        });

        if (table != null)
        {
            await _realtimeSync.PublishAsync(new RealtimeEvent
            {
                EventType = "table:statusChanged",
                Module = "Tables",
                Action = "statusChanged",
                BranchId = order.OutletId > 0 ? order.OutletId : 1,
                RecordId = table.Id.ToString(),
                Data = new
                {
                    tableId = table.Id,
                    status = table.Status,
                    orderTotal = order.GrandTotal
                }
            });
        }

        return Ok(finalOrderDto);
    }


    // ============================================================
    // SELF SERVICE ORDER CREATION (PHASE 2B.1)
    // ============================================================

    [HttpPost("self-service")]
    public async Task<IActionResult> CreateSelfServiceOrder(
        [FromBody] CreateSelfServiceOrderRequest request,
        [FromQuery] long? branchId)
    {
        return await CreateSelfServiceOrderInternalAsync(request, branchId);
    }

    [Microsoft.AspNetCore.Authorization.Authorize]
    [HttpGet("self-service/{id:long}")]
    public async Task<IActionResult> TrackSelfServiceOrder(long id, [FromQuery] long? branchId = null)
    {
        var (allowed, branch, statusCode, branchError) = await AuthorizeSelfServiceBranchAsync(branchId);
        if (!allowed || branch == null)
        {
            return StatusCode(statusCode, new { success = false, message = branchError });
        }

        var order = await _context.Orders
            .AsNoTracking()
            .Include(o => o.Items)
            .FirstOrDefaultAsync(o =>
                o.Id == id &&
                o.IsActive &&
                !o.IsDeleted &&
                o.OrderType == "SelfService" &&
                ((o.BranchId.HasValue && o.BranchId.Value == branch.BranchId) || o.OutletId == branch.BranchId));

        if (order == null)
        {
            return NotFound(new { success = false, message = "Self service order not found for this branch." });
        }

        var roleName = User.FindFirstValue("roleName") ?? User.FindFirstValue(ClaimTypes.Role) ?? "";
        var normRole = roleName.Trim().ToLowerInvariant();
        bool isStaffOrAdmin = normRole is "admin" or "superadmin" or "super admin" or "manager" or "branch manager" or "cashier" or "pos cashier" or "user pos";
        if (!isStaffOrAdmin && long.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var userId))
        {
            if (order.CreatedBy.HasValue && order.CreatedBy.Value != userId)
            {
                return StatusCode(403, new { success = false, message = "You are not authorized to view this order." });
            }
        }

        var dto = await BuildSelfServiceResponseDtoAsync(order);
        return Ok(new { success = true, data = dto });
    }

    [Microsoft.AspNetCore.Authorization.Authorize]
    [HttpPost("self-service/{id:long}/initiate-payment")]
    public async Task<IActionResult> InitiateSelfServicePayment(
        long id,
        [FromBody] SelfServicePaymentInitiationRequest? request,
        [FromQuery] long? branchId = null)
    {
        var (allowed, branch, statusCode, branchError) = await AuthorizeSelfServiceBranchAsync(branchId);
        if (!allowed || branch == null)
        {
            return StatusCode(statusCode, new { success = false, message = branchError });
        }

        var order = await _context.Orders
            .Include(o => o.Items)
            .FirstOrDefaultAsync(o =>
                o.Id == id &&
                o.IsActive &&
                !o.IsDeleted &&
                o.OrderType == "SelfService" &&
                ((o.BranchId.HasValue && o.BranchId.Value == branch.BranchId) || o.OutletId == branch.BranchId));

        if (order == null)
        {
            return NotFound(new { success = false, message = "Self service order not found." });
        }

        if (string.Equals(order.PaymentStatus, "Paid", StringComparison.OrdinalIgnoreCase))
        {
            return Conflict(new { success = false, message = "This order has already been paid." });
        }

        var dto = await BuildSelfServiceResponseDtoAsync(order);
        var mode = string.IsNullOrWhiteSpace(request?.PaymentMethod) ? "UPI" : request.PaymentMethod.Trim().ToUpperInvariant();
        if (mode is not ("UPI" or "CASH" or "CARD"))
        {
            return BadRequest(new { success = false, message = "Unsupported payment method. Use UPI, CASH, or CARD." });
        }

        // Persist selected payment method and instructions on order
        order.PaymentMethod = mode switch
        {
            "CASH" => "Cash",
            "CARD" => "Card",
            "UPI" => "UPI",
            _ => mode
        };

        if (!string.IsNullOrWhiteSpace(request?.TransactionReference))
        {
            var cleanRef = request.TransactionReference.Trim();
            order.SpecialInstructions = string.IsNullOrWhiteSpace(order.SpecialInstructions)
                ? "Payment Ref: " + cleanRef
                : order.SpecialInstructions + " | Payment Ref: " + cleanRef;
        }

        if (!string.IsNullOrWhiteSpace(request?.Notes))
        {
            var cleanNotes = request.Notes.Trim();
            if (string.IsNullOrWhiteSpace(order.SpecialInstructions) || !order.SpecialInstructions.Contains(cleanNotes, StringComparison.OrdinalIgnoreCase))
            {
                order.SpecialInstructions = string.IsNullOrWhiteSpace(order.SpecialInstructions)
                    ? cleanNotes
                    : order.SpecialInstructions + " | " + cleanNotes;
            }
        }

        order.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        // Broadcast real-time SignalR event to Cashier / POS
        try
        {
            await _hubContext.Clients.All.SendAsync("OrderUpdated", order.Id);
            await _hubContext.Clients.All.SendAsync("SelfServicePaymentRequested", new
            {
                orderId = order.Id,
                orderNumber = order.OrderNumber,
                paymentMethod = order.PaymentMethod,
                amount = dto.Financials.FinalPayable,
                specialInstructions = order.SpecialInstructions,
                requestedAt = DateTime.UtcNow
            });
        }
        catch (Exception exHub)
        {
            _logger.LogWarning(exHub, "Failed to broadcast payment request for order {OrderId}", order.Id);
        }

        if (mode == "UPI")
        {
            var targetRestaurantKey = "restaurant_" + branch.BranchId;
            var settings = await _context.RestaurantSettings.AsNoTracking()
                .FirstOrDefaultAsync(s => s.RestaurantId == targetRestaurantKey || s.Id == branch.BranchId)
                ?? await _context.RestaurantSettings.AsNoTracking().FirstOrDefaultAsync(s => s.Id == 1);

            string? upiId = null;
            if (!string.IsNullOrWhiteSpace(settings?.PaymentQrs))
            {
                try
                {
                    using var doc = System.Text.Json.JsonDocument.Parse(settings.PaymentQrs);
                    if (doc.RootElement.ValueKind == System.Text.Json.JsonValueKind.Array)
                    {
                        foreach (var el in doc.RootElement.EnumerateArray())
                        {
                            var isMatch = string.IsNullOrWhiteSpace(settings.SelectedQrId) ||
                                (el.TryGetProperty("id", out var idProp) && idProp.ToString() == settings.SelectedQrId);
                            if (!isMatch) continue;
                            if (el.TryGetProperty("upiId", out var upiProp) || el.TryGetProperty("upi_id", out upiProp))
                            {
                                var candidate = upiProp.GetString()?.Trim();
                                if (!string.IsNullOrWhiteSpace(candidate))
                                {
                                    upiId = candidate;
                                    break;
                                }
                            }
                        }
                    }
                }
                catch
                {
                    upiId = null;
                }
            }
            if (string.IsNullOrWhiteSpace(upiId))
            {
                return Ok(new
                {
                    success = true,
                    data = new SelfServicePaymentInitiationResponseDto
                    {
                        OrderId = order.Id,
                        OrderNumber = order.OrderNumber,
                        PaymentMethod = "UPI",
                        PaymentStatus = order.PaymentStatus ?? "Pending",
                        Amount = dto.Financials.FinalPayable,
                        GatewayConfigured = false,
                        QrPayload = null,
                        CounterPaymentRegistered = false,
                        InitiatedAt = DateTime.UtcNow,
                        Message = "Merchant UPI / payment gateway is not configured for this branch. Please pay at the counter."
                    }
                });
            }

            var merchantName = string.IsNullOrWhiteSpace(settings?.RestaurantName) ? branch.BranchName : settings.RestaurantName.Trim();
            var qrPayload = "upi://pay?pa=" + Uri.EscapeDataString(upiId) + "&pn=" + Uri.EscapeDataString(merchantName) + "&am=" + dto.Financials.FinalPayable.ToString("F2") + "&cu=INR&tn=" + Uri.EscapeDataString(order.OrderNumber);

            return Ok(new
            {
                success = true,
                data = new SelfServicePaymentInitiationResponseDto
                {
                    OrderId = order.Id,
                    OrderNumber = order.OrderNumber,
                    PaymentMethod = "UPI",
                    PaymentStatus = order.PaymentStatus ?? "Pending",
                    Amount = dto.Financials.FinalPayable,
                    GatewayConfigured = true,
                    QrPayload = qrPayload,
                    CounterPaymentRegistered = true,
                    InitiatedAt = DateTime.UtcNow,
                    Message = "Scan QR with any UPI app. Official invoice will be issued after cashier/gateway verification."
                }
            });
        }

        return Ok(new
        {
            success = true,
            data = new SelfServicePaymentInitiationResponseDto
            {
                OrderId = order.Id,
                OrderNumber = order.OrderNumber,
                PaymentMethod = mode,
                PaymentStatus = order.PaymentStatus ?? "Pending",
                Amount = dto.Financials.FinalPayable,
                GatewayConfigured = true,
                QrPayload = null,
                CounterPaymentRegistered = true,
                InitiatedAt = DateTime.UtcNow,
                Message = mode == "CASH"
                    ? "Counter cash payment registered for order " + order.OrderNumber + ". Please present reference at the cashier counter."
                    : "Card machine payment registered for order " + order.OrderNumber + ". Please proceed to the cashier counter to complete card tap/swipe."
            }
        });
    }

    [Microsoft.AspNetCore.Authorization.Authorize(Roles = "Admin,Super Admin,SuperAdmin,Manager,Branch Manager,Cashier,POS Cashier")]
    [HttpPost("self-service/{id:long}/confirm-payment")]
    public async Task<IActionResult> ConfirmSelfServicePayment(
        long id,
        [FromBody] SelfServicePaymentConfirmRequest? request,
        [FromQuery] long? branchId = null)
    {
        var (allowed, branch, statusCode, branchError) = await AuthorizeSelfServiceBranchAsync(branchId);
        if (!allowed || branch == null)
        {
            return StatusCode(statusCode, new { success = false, message = branchError });
        }

        var order = await _context.Orders
            .Include(o => o.Items)
            .FirstOrDefaultAsync(o =>
                o.Id == id &&
                o.IsActive &&
                !o.IsDeleted &&
                o.OrderType == "SelfService" &&
                ((o.BranchId.HasValue && o.BranchId.Value == branch.BranchId) || o.OutletId == branch.BranchId));

        if (order == null)
        {
            return NotFound(new { success = false, message = "Self service order not found." });
        }

        var dto = await BuildSelfServiceResponseDtoAsync(order);
        var requiredAmount = dto.Financials.FinalPayable;
        if (request == null || request.Amount < requiredAmount)
        {
            return BadRequest(new
            {
                success = false,
                message = $"Confirmed payment amount must be at least {requiredAmount:F2}."
            });
        }

        var paymentMethod = string.IsNullOrWhiteSpace(request.PaymentMethod) ? "CASH" : request.PaymentMethod.Trim().ToUpperInvariant();
        order.Subtotal = dto.Financials.Subtotal;
        order.DiscountPercent = dto.Financials.DiscountPercent;
        order.DiscountAmount = dto.Financials.DiscountAmount;
        order.TaxPercent = dto.Financials.FoodGstRate;
        order.TaxAmount = dto.Financials.TaxAmount;
        order.ServiceCharge = 0m;
        order.ServiceChargePercent = 0m;
        order.ServiceChargeAmount = 0m;
        order.GrandTotal = requiredAmount;

        var invoiceId = await EnsureInvoiceCreatedAsync(order, paymentMethod);
        if (invoiceId <= 0)
        {
            return StatusCode(502, new { success = false, message = "Official invoice could not be generated. Payment was not finalized." });
        }

        order.Status = "Settled";
        order.PaymentStatus = "Paid";
        order.PaymentMethod = paymentMethod;
        order.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        var updatedDto = await BuildSelfServiceResponseDtoAsync(order);
        return Ok(new { success = true, message = "Payment verified and official invoice issued.", data = updatedDto });
    }

    private long? GetUserBranchId()
    {
        var claim = User.FindFirstValue("branchId")
                 ?? User.FindFirstValue("restaurantId")
                 ?? User.FindFirstValue("branch_id")
                 ?? User.FindFirstValue("restaurant_id");

        if (!string.IsNullOrWhiteSpace(claim))
        {
            var sanitized = claim.Replace("restaurant_", "", StringComparison.OrdinalIgnoreCase).Trim();
            if (long.TryParse(sanitized, out var bId) && bId > 0)
            {
                return bId;
            }
        }
        return null;
    }

    private static string? MaskPhone(string? phone)
    {
        if (string.IsNullOrWhiteSpace(phone)) return null;
        var p = phone.Trim();
        if (p.Length <= 4) return "****";
        return new string('*', p.Length - 4) + p[^4..];
    }

    private static string? MaskEmail(string? email)
    {
        if (string.IsNullOrWhiteSpace(email)) return null;
        var parts = email.Trim().Split('@');
        if (parts.Length != 2) return "***@***";
        var name = parts[0];
        var domain = parts[1];
        var maskedName = name.Length <= 2 ? "**" : name[0] + new string('*', name.Length - 2) + name[^1];
        return $"{maskedName}@{domain}";
    }

    private async Task<(bool Allowed, Branch? Branch, int StatusCode, string? ErrorMessage)> AuthorizeSelfServiceBranchAsync(long? requestedBranchId)
    {
        if (User?.Identity?.IsAuthenticated != true)
        {
            return (false, null, 401, "Authentication is required to place a self service order.");
        }

        // 1. Resolve user from Claims and Database
        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        User? dbUser = null;
        if (long.TryParse(userIdClaim, out var numericUserId))
        {
            dbUser = await _context.Users.AsNoTracking().Include(u => u.Role).FirstOrDefaultAsync(u => u.UserId == numericUserId);
        }

        var roleName = dbUser?.Role?.RoleName ?? User.FindFirstValue("roleName") ?? User.FindFirstValue(ClaimTypes.Role) ?? "User";
        var normalizedRole = roleName.Trim().ToLowerInvariant();

        // A genuine global admin has no assigned branch (or <= 0)
        long? userDbBranch = dbUser?.BranchId ?? GetUserBranchId();
        bool isGlobalAdmin = (normalizedRole == "admin" || normalizedRole == "superadmin" || normalizedRole == "super admin") &&
                             (!userDbBranch.HasValue || userDbBranch.Value <= 0);

        long targetBranchId = 0;

        if (isGlobalAdmin)
        {
            // Global Admin must explicitly select an active branch; never silently default to Branch 1
            if (requestedBranchId.HasValue && requestedBranchId.Value > 0)
            {
                targetBranchId = requestedBranchId.Value;
            }
            else
            {
                return (false, null, 400, "Branch context is missing. SuperAdmin must specify an active branch.");
            }
        }
        else
        {
            // Branch-scoped staff: strictly locked to assigned branch. NO default branch 1 fallback!
            if (!userDbBranch.HasValue || userDbBranch.Value <= 0)
            {
                return (false, null, 403, "Authenticated user account is not associated with any restaurant branch.");
            }

            // Cross-branch rejection: if a non-global staff requests another branch, reject immediately
            if (requestedBranchId.HasValue && requestedBranchId.Value > 0 && requestedBranchId.Value != userDbBranch.Value)
            {
                return (false, null, 403, "Cross-branch access forbidden. Your account is not authorized for this branch.");
            }

            targetBranchId = userDbBranch.Value;
        }

        // Branch existence and active status verification
        var branch = await _context.Branches.AsNoTracking()
            .FirstOrDefaultAsync(b => b.BranchId == targetBranchId && b.IsActive && b.DeletedAt == null);

        if (branch == null)
        {
            return (false, null, 403, $"Branch {targetBranchId} does not exist or is inactive.");
        }

        return (true, branch, 200, null);
    }

    private async Task<IActionResult> CreateSelfServiceOrderInternalAsync(
        CreateSelfServiceOrderRequest? request,
        long? branchId)
    {
        if (request == null)
        {
            return BadRequest(new { success = false, message = "Request body is required." });
        }

        // 1. Authenticate and resolve branch context with strict isolation
        var (allowed, branch, statusCode, branchError) = await AuthorizeSelfServiceBranchAsync(branchId);
        if (!allowed || branch == null)
        {
            return StatusCode(statusCode, new { success = false, message = branchError });
        }

        // 2. Reject empty orders
        if (request.Items == null || request.Items.Count == 0)
        {
            return BadRequest(new
            {
                success = false,
                message = "At least one order item is required. Empty orders cannot be created."
            });
        }

        // 3. Idempotency Check (prevent duplicate order creation on retries)
        if (!string.IsNullOrWhiteSpace(request.IdempotencyKey))
        {
            var trimmedKey = request.IdempotencyKey.Trim();
            var existingOrder = await _context.Orders
                .Include(o => o.Items)
                .FirstOrDefaultAsync(o => o.IdempotencyKey == trimmedKey &&
                    ((o.BranchId.HasValue && o.BranchId.Value == branch.BranchId) || o.OutletId == branch.BranchId));

            if (existingOrder != null)
            {
                _logger.LogInformation("Idempotent request received. Returning existing SelfService order {OrderId} for key '{Key}'", existingOrder.Id, trimmedKey);
                var existingResponse = await BuildSelfServiceResponseDtoAsync(existingOrder, isDuplicate: true);
                return Ok(new
                {
                    success = true,
                    isDuplicate = true,
                    message = "Order already created (idempotent response).",
                    data = existingResponse
                });
            }
        }

        // 4. Validate menu items and enforce authoritative database prices (never trust frontend prices)
        var menuItemIds = request.Items.Select(i => i.MenuItemId).Distinct().ToList();
        var menuItemsMap = await _context.MenuItems.AsNoTracking()
            .Where(m => menuItemIds.Contains(m.MenuItemId) && m.DeletedAt == null)
            .ToDictionaryAsync(m => m.MenuItemId);

        var orderItems = new List<OrderItem>();
        foreach (var itemInput in request.Items)
        {
            if (itemInput.Quantity <= 0 || itemInput.Quantity > 100)
            {
                return BadRequest(new
                {
                    success = false,
                    message = $"Invalid quantity for item {itemInput.MenuItemId}. Quantity must be between 1 and 100."
                });
            }

            if (!menuItemsMap.TryGetValue(itemInput.MenuItemId, out var menuItem))
            {
                return BadRequest(new
                {
                    success = false,
                    message = $"Menu item with ID {itemInput.MenuItemId} was not found or has been deleted."
                });
            }

            // Cross-branch menu item check: reject if item belongs to a different branch
            if (menuItem.BranchId.HasValue && menuItem.BranchId.Value != branch.BranchId)
            {
                return BadRequest(new
                {
                    success = false,
                    message = $"Menu item with ID {itemInput.MenuItemId} is not available for this restaurant branch."
                });
            }

            if (!menuItem.IsAvailable)
            {
                return BadRequest(new
                {
                    success = false,
                    message = $"Menu item '{menuItem.DishName}' is currently unavailable."
                });
            }

            decimal authoritativePrice = menuItem.Price;
            orderItems.Add(new OrderItem
            {
                MenuItemId = menuItem.MenuItemId,
                Name = menuItem.DishName,
                Price = authoritativePrice,
                Quantity = itemInput.Quantity,
                TotalPrice = Math.Round(authoritativePrice * itemInput.Quantity, 2),
                Notes = !string.IsNullOrWhiteSpace(itemInput.Notes) ? itemInput.Notes.Trim() : "Self Service Order",
                KotStatus = "Queued",
                KotBatch = 1,
                IsActive = true,
                IsDeleted = false,
                CreatedAt = DateTime.UtcNow
            });
        }

        // 5. Financial Calculation Preparation & Discount Validation
        decimal subtotal = Math.Round(orderItems.Sum(i => i.TotalPrice), 2);
        decimal discountPercent = 0m;
        decimal discountAmount = 0m;
        var roleName = User.FindFirstValue("roleName") ?? User.FindFirstValue(ClaimTypes.Role) ?? "";
        bool canApplyStaffDiscount = User.IsInRole("Admin") || User.IsInRole("SuperAdmin") || User.IsInRole("Manager") ||
                                     string.Equals(roleName, "Admin", StringComparison.OrdinalIgnoreCase) ||
                                     string.Equals(roleName, "SuperAdmin", StringComparison.OrdinalIgnoreCase) ||
                                     string.Equals(roleName, "Manager", StringComparison.OrdinalIgnoreCase);

        if ((request.RequestedDiscountPercent.HasValue && request.RequestedDiscountPercent.Value > 0) ||
            (request.RequestedDiscountAmount.HasValue && request.RequestedDiscountAmount.Value > 0))
        {
            if (!canApplyStaffDiscount)
            {
                return BadRequest(new
                {
                    success = false,
                    message = "Arbitrary customer discounts are not permitted on self service orders."
                });
            }

            if (request.RequestedDiscountPercent.HasValue && request.RequestedDiscountPercent.Value > 0)
            {
                discountPercent = Math.Clamp(request.RequestedDiscountPercent.Value, 0m, 50m);
                discountAmount = Math.Round(subtotal * (discountPercent / 100m), 2);
            }
            else if (request.RequestedDiscountAmount.HasValue && request.RequestedDiscountAmount.Value > 0)
            {
                var maxDiscount = Math.Round(subtotal * 0.50m, 2);
                discountAmount = Math.Min(maxDiscount, Math.Round(request.RequestedDiscountAmount.Value, 2));
                discountPercent = subtotal > 0 ? Math.Round((discountAmount / subtotal) * 100m, 2) : 0m;
            }
        }
        else if (!string.IsNullOrWhiteSpace(request.DiscountCode))
        {
            var code = request.DiscountCode.Trim().ToUpperInvariant();
            var promo = await _context.Promotions.AsNoTracking()
                .FirstOrDefaultAsync(p => p.Code.ToUpper() == code && p.IsActive && p.ValidUntil >= DateTime.UtcNow);
            if (promo != null)
            {
                if (promo.DiscountPercentage > 0)
                {
                    discountPercent = Math.Clamp(promo.DiscountPercentage, 0m, 50m);
                    discountAmount = Math.Round(subtotal * (discountPercent / 100m), 2);
                }
                else if (promo.FlatDiscount > 0)
                {
                    var maxDiscount = Math.Round(subtotal * 0.50m, 2);
                    discountAmount = Math.Min(maxDiscount, Math.Round(promo.FlatDiscount, 2));
                    discountPercent = subtotal > 0 ? Math.Round((discountAmount / subtotal) * 100m, 2) : 0m;
                }
            }
            else
            {
                return BadRequest(new
                {
                    success = false,
                    message = $"Promotion code '{request.DiscountCode}' is invalid or expired."
                });
            }
        }

        // 6. Independent Backend Financial Recalculation using active restaurant settings
        var targetRestaurantKey = $"restaurant_{branch.BranchId}";
        var settings = await _context.RestaurantSettings.AsNoTracking()
            .FirstOrDefaultAsync(s => s.RestaurantId == targetRestaurantKey || s.Id == branch.BranchId)
            ?? await _context.RestaurantSettings.AsNoTracking().FirstOrDefaultAsync(s => s.Id == 1)
            ?? await _context.RestaurantSettings.AsNoTracking().FirstOrDefaultAsync();

        decimal foodGstRate = settings?.FoodGstRate ?? 5m;
        // Self Service orders never incur a service charge.
        bool serviceChargeEnabled = false;
        decimal serviceChargeRate = 0m;
        string roundingMode = settings?.RoundingMode ?? "nearest";

        decimal taxableAmount = Math.Max(0m, subtotal - discountAmount);

        decimal taxAmount = Math.Round(taxableAmount * (foodGstRate / 100m), 2);
        decimal cgstRate = foodGstRate / 2m;
        decimal sgstRate = foodGstRate / 2m;
        decimal cgstAmount = Math.Round(taxAmount / 2m, 2);
        decimal sgstAmount = taxAmount - cgstAmount;

        decimal serviceChargeAmount = 0m;

        decimal unroundedTotal = taxableAmount + taxAmount + serviceChargeAmount;

        decimal finalPayable = unroundedTotal;
        var normRounding = roundingMode.Trim().ToLowerInvariant();
        if (normRounding == "rupee" || normRounding == "nearest")
        {
            finalPayable = Math.Round(unroundedTotal, MidpointRounding.AwayFromZero);
        }
        else if (normRounding == "five")
        {
            finalPayable = Math.Round(unroundedTotal / 5m, MidpointRounding.AwayFromZero) * 5m;
        }
        else if (normRounding == "none")
        {
            finalPayable = unroundedTotal;
        }
        else
        {
            finalPayable = Math.Round(unroundedTotal, MidpointRounding.AwayFromZero);
        }

        decimal roundingAdjustment = finalPayable - unroundedTotal;

        // 7. Persist Order Entity with SelfService order type and full financial snapshot
        var order = new Order
        {
            OrderNumber = await GenerateOrderNumber(),
            OutletId = branch.BranchId,
            BranchId = branch.BranchId,
            OrderType = "SelfService",
            TableId = null,
            TableName = "Self Service",
            Section = "Self Service",
            ServerName = "Self Service Kiosk",
            Guests = 1,
            Status = "PendingPayment",
            FulfillmentStatus = "New",
            PaymentStatus = "Pending",
            Subtotal = subtotal,
            DiscountPercent = discountPercent,
            DiscountAmount = discountAmount,
            TaxPercent = foodGstRate,
            TaxAmount = taxAmount,
            PackagingCharge = 0m,
            ServiceCharge = serviceChargeRate,
            ServiceChargePercent = serviceChargeRate,
            ServiceChargeAmount = serviceChargeAmount,
            GrandTotal = finalPayable,
            CustomerName = request.CustomerName?.Trim(),
            CustomerPhone = request.CustomerPhone?.Trim(),
            CustomerEmail = request.CustomerEmail?.Trim(),
            SpecialInstructions = request.SpecialInstructions?.Trim(),
            IdempotencyKey = request.IdempotencyKey?.Trim(),
            IsActive = true,
            IsDeleted = false,
            CreatedAt = DateTime.UtcNow
        };

        foreach (var oi in orderItems)
        {
            order.Items.Add(oi);
        }

        _context.Orders.Add(order);
        try
        {
            await _context.SaveChangesAsync();
        }
        catch (DbUpdateException ex)
        {
            _logger.LogWarning(ex, "DbUpdateException when saving order. Checking for concurrent idempotent insert.");
            if (!string.IsNullOrWhiteSpace(request.IdempotencyKey))
            {
                var trimmedKey = request.IdempotencyKey.Trim();
                var concurrentOrder = await _context.Orders
                    .Include(o => o.Items)
                    .FirstOrDefaultAsync(o => o.IdempotencyKey == trimmedKey &&
                        ((o.BranchId.HasValue && o.BranchId.Value == branch.BranchId) || o.OutletId == branch.BranchId));

                if (concurrentOrder != null)
                {
                    _logger.LogInformation("Concurrent duplicate order caught via unique index. Returning existing order {OrderId}", concurrentOrder.Id);
                    var existingResponse = await BuildSelfServiceResponseDtoAsync(concurrentOrder, isDuplicate: true);
                    return Ok(new
                    {
                        success = true,
                        isDuplicate = true,
                        message = "Order already created (idempotent response).",
                        data = existingResponse
                    });
                }
            }
            throw;
        }

        _logger.LogInformation("SelfService order {OrderId} ({OrderNumber}) created. Total: {Total}. KOT queued awaiting payment confirmation.",
            order.Id, order.OrderNumber, finalPayable);

        // 8. Realtime Event Broadcast (scoped strictly to active branch with masked PII)
        var responseDto = new SelfServiceOrderResponseDto
        {
            OrderId = order.Id,
            OrderNumber = order.OrderNumber,
            BranchId = branch.BranchId,
            OrderType = order.OrderType,
            Status = order.Status,
            FulfillmentStatus = order.FulfillmentStatus ?? "New",
            PaymentStatus = order.PaymentStatus ?? "Pending",
            CustomerName = order.CustomerName,
            CustomerPhone = order.CustomerPhone,
            CustomerEmail = order.CustomerEmail,
            SpecialInstructions = order.SpecialInstructions,
            IdempotencyKey = order.IdempotencyKey,
            IsDuplicate = false,
            CreatedAt = order.CreatedAt,
            Items = order.Items.Select(i => new SelfServiceOrderItemResponseDto
            {
                OrderItemId = i.Id,
                MenuItemId = i.MenuItemId,
                Name = i.Name,
                UnitPrice = i.Price,
                Quantity = i.Quantity,
                LineSubtotal = i.TotalPrice,
                Notes = i.Notes,
                KotStatus = i.KotStatus
            }).ToList(),
            Financials = new SelfServiceFinancialSummaryDto
            {
                Subtotal = subtotal,
                DiscountPercent = discountPercent,
                DiscountAmount = discountAmount,
                TaxableAmount = taxableAmount,
                FoodGstRate = foodGstRate,
                CgstRate = cgstRate,
                SgstRate = sgstRate,
                CgstAmount = cgstAmount,
                SgstAmount = sgstAmount,
                TaxAmount = taxAmount,
                ServiceChargeEnabled = serviceChargeEnabled,
                ServiceChargeRate = serviceChargeRate,
                ServiceChargeAmount = serviceChargeAmount,
                RoundingMode = roundingMode,
                RoundingAdjustment = roundingAdjustment,
                FinalPayable = finalPayable
            }
        };

        var broadcastDto = new SelfServiceOrderResponseDto
        {
            OrderId = order.Id,
            OrderNumber = order.OrderNumber,
            BranchId = branch.BranchId,
            OrderType = order.OrderType,
            Status = order.Status,
            FulfillmentStatus = order.FulfillmentStatus ?? "New",
            PaymentStatus = order.PaymentStatus ?? "Pending",
            CustomerName = order.CustomerName,
            CustomerPhone = MaskPhone(order.CustomerPhone),
            CustomerEmail = MaskEmail(order.CustomerEmail),
            SpecialInstructions = order.SpecialInstructions,
            IdempotencyKey = order.IdempotencyKey,
            IsDuplicate = false,
            CreatedAt = order.CreatedAt,
            Items = responseDto.Items,
            Financials = responseDto.Financials
        };

        await _realtimeSync.PublishAsync(new RealtimeEvent
        {
            EventType = "selfservice:created",
            Module = "SelfService",
            Action = "created",
            BranchId = branch.BranchId,
            RecordId = order.Id.ToString(),
            Data = broadcastDto
        });

        await _realtimeSync.PublishAsync(new RealtimeEvent
        {
            EventType = "order:created",
            Module = "Orders",
            Action = "created",
            BranchId = branch.BranchId,
            RecordId = order.Id.ToString(),
            Data = broadcastDto
        });

        return StatusCode(201, new
        {
            success = true,
            message = "Self service order created successfully.",
            data = responseDto
        });
    }

    private async Task<SelfServiceOrderResponseDto> BuildSelfServiceResponseDtoAsync(Order order, bool isDuplicate = false)
    {
        var resolvedBranchId = order.BranchId ?? order.OutletId;
        var targetRestaurantKey = $"restaurant_{resolvedBranchId}";
        var settings = await _context.RestaurantSettings.AsNoTracking()
            .FirstOrDefaultAsync(s => s.RestaurantId == targetRestaurantKey || s.Id == resolvedBranchId)
            ?? await _context.RestaurantSettings.AsNoTracking().FirstOrDefaultAsync(s => s.Id == 1)
            ?? await _context.RestaurantSettings.AsNoTracking().FirstOrDefaultAsync();

        decimal foodGstRate = settings?.FoodGstRate ?? 5m;
        // Self Service orders never incur a service charge.
        bool serviceChargeEnabled = false;
        decimal serviceChargeRate = 0m;
        string roundingMode = settings?.RoundingMode ?? "nearest";

        var activeItems = order.Items.Where(i => i.IsActive && !i.IsDeleted).ToList();
        decimal subtotal = order.Subtotal > 0 ? order.Subtotal : Math.Round(activeItems.Sum(i => i.Price * i.Quantity), 2);
        decimal discountPercent = order.DiscountPercent;
        decimal discountAmount = order.DiscountAmount > 0
            ? order.DiscountAmount
            : (discountPercent > 0 ? Math.Round(subtotal * (discountPercent / 100m), 2) : 0m);
        decimal taxableAmount = Math.Max(0m, subtotal - discountAmount);

        decimal taxAmount = Math.Round(taxableAmount * (foodGstRate / 100m), 2);
        decimal cgstRate = foodGstRate / 2m;
        decimal sgstRate = foodGstRate / 2m;
        decimal cgstAmount = Math.Round(taxAmount / 2m, 2);
        decimal sgstAmount = taxAmount - cgstAmount;

        decimal serviceChargeAmount = 0m;

        decimal unroundedTotal = taxableAmount + taxAmount + serviceChargeAmount;

        decimal finalPayable = unroundedTotal;
        var normRounding = roundingMode.Trim().ToLowerInvariant();
        if (normRounding == "rupee" || normRounding == "nearest")
        {
            finalPayable = Math.Round(unroundedTotal, MidpointRounding.AwayFromZero);
        }
        else if (normRounding == "five")
        {
            finalPayable = Math.Round(unroundedTotal / 5m, MidpointRounding.AwayFromZero) * 5m;
        }
        else if (normRounding == "none")
        {
            finalPayable = unroundedTotal;
        }
        else
        {
            finalPayable = Math.Round(unroundedTotal, MidpointRounding.AwayFromZero);
        }

        decimal roundingAdjustment = finalPayable - unroundedTotal;

        var linkedInvoice = await _context.Invoices
            .AsNoTracking()
            .Where(i => i.OrderId == order.Id)
            .OrderByDescending(i => i.CreatedAt)
            .Select(i => new { i.InvoiceId, i.InvoiceNumber })
            .FirstOrDefaultAsync();

        return new SelfServiceOrderResponseDto
        {
            OrderId = order.Id,
            OrderNumber = order.OrderNumber,
            BranchId = order.BranchId ?? order.OutletId,
            OrderType = order.OrderType,
            Status = order.Status,
            FulfillmentStatus = order.FulfillmentStatus ?? "New",
            PaymentStatus = order.PaymentStatus ?? "Pending",
            CustomerName = order.CustomerName,
            CustomerPhone = order.CustomerPhone,
            CustomerEmail = order.CustomerEmail,
            SpecialInstructions = order.SpecialInstructions,
            IdempotencyKey = order.IdempotencyKey,
            IsDuplicate = isDuplicate,
            CreatedAt = order.CreatedAt,
            InvoiceId = linkedInvoice?.InvoiceId,
            InvoiceNumber = linkedInvoice?.InvoiceNumber,
            Items = activeItems.Select(i => new SelfServiceOrderItemResponseDto
            {
                OrderItemId = i.Id,
                MenuItemId = i.MenuItemId,
                Name = i.Name,
                UnitPrice = i.Price,
                Quantity = i.Quantity,
                LineSubtotal = i.TotalPrice > 0 ? i.TotalPrice : Math.Round(i.Price * i.Quantity, 2),
                Notes = i.Notes,
                KotStatus = i.KotStatus
            }).ToList(),
            Financials = new SelfServiceFinancialSummaryDto
            {
                Subtotal = subtotal,
                DiscountPercent = discountPercent,
                DiscountAmount = discountAmount,
                TaxableAmount = taxableAmount,
                FoodGstRate = foodGstRate,
                CgstRate = cgstRate,
                SgstRate = sgstRate,
                CgstAmount = cgstAmount,
                SgstAmount = sgstAmount,
                TaxAmount = taxAmount,
                ServiceChargeEnabled = serviceChargeEnabled,
                ServiceChargeRate = serviceChargeRate,
                ServiceChargeAmount = serviceChargeAmount,
                RoundingMode = roundingMode,
                RoundingAdjustment = roundingAdjustment,
                FinalPayable = finalPayable
            }
        };
    }


    // ============================================================
    // UPDATE ORDER ITEMS
    // ============================================================

    [HttpPost("{id}/items")]
    public async Task<IActionResult> UpdateOrderItems(
        long id,
        [FromBody] UpdateOrderItemsRequest request)
    {
        var order = await _context.Orders
            .Include(o => o.Items)
            .FirstOrDefaultAsync(o =>
                o.Id == id &&
                o.IsActive &&
                !o.IsDeleted);

        if (order == null)
        {
            return NotFound(new
            {
                message = "Order not found."
            });
        }

        if (request?.Items == null)
        {
            return BadRequest(new
            {
                message = "Items are required."
            });
        }

        foreach (var itemInput in request.Items)
        {
            var existing = order.Items.FirstOrDefault(i =>
                (i.MenuItemId == itemInput.MenuItemId || string.Equals(i.Name, itemInput.Name, StringComparison.OrdinalIgnoreCase)) &&
                i.VariantId == itemInput.VariantId &&
                (i.KotId == null || i.KotId == 0) &&
                (i.BotId == null || i.BotId == 0));

            if (existing == null)
            {
                if (itemInput.Quantity > 0)
                {
                    long mId = itemInput.MenuItemId ?? 0;
                    if (mId <= 0 && !string.IsNullOrWhiteSpace(itemInput.Name))
                    {
                        var m = await _context.MenuItems
                            .AsNoTracking()
                            .FirstOrDefaultAsync(mi => mi.DishName == itemInput.Name.Trim() || EF.Functions.Like(itemInput.Name, "%" + mi.DishName + "%"));
                        if (m != null) mId = m.MenuItemId;
                    }
                    if (mId <= 0)
                    {
                        mId = OrderItemRouting.IsBarItem(false, null, null, itemInput.Name) ? 7 : 1;
                    }

                    var addedItem = new OrderItem
                    {
                        OrderId = order.Id,
                        MenuItemId = mId,
                        VariantId = itemInput.VariantId,
                        Name = itemInput.Name ?? "Item",
                        Price = itemInput.Price,
                        Quantity = itemInput.Quantity,
                        TotalPrice = itemInput.Price * itemInput.Quantity,
                        Notes = itemInput.Notes,
                        KotStatus = "Queued",
                        KotBatch = 1,
                        KotId = null,
                        BotId = null,
                        IsActive = true,
                        IsDeleted = false,
                        CreatedAt = DateTime.UtcNow
                    };
                    order.Items.Add(addedItem);
                }
                continue;
            }

            if (itemInput.Quantity <= 0)
            {
                if (existing.KotStatus == "Queued" ||
                    existing.KotStatus == "queued")
                {
                    _context.OrderItems.Remove(existing);
                }
            }
            else
            {
                existing.Quantity = itemInput.Quantity;

                existing.TotalPrice =
                    existing.Price *
                    existing.Quantity;

                existing.Notes = itemInput.Notes;

                existing.UpdatedAt =
                    DateTime.UtcNow;
            }
        }

        RecalculateTotals(order);

        await _context.SaveChangesAsync();

        await _hubContext.Clients
            .Group("floor")
            .SendAsync(
                "OrderUpdated",
                new
                {
                    orderId = order.Id,

                    tableId = order.TableId,

                    items = order.Items
                        .Select(MapToOrderItemDto)
                        .ToList(),

                    grandTotal = order.GrandTotal
                });

        var updatedOrderDto = MapToOrderDto(order);

        await _realtimeSync.PublishAsync(new RealtimeEvent
        {
            EventType = "order:updated",
            Module = "Orders",
            Action = "updated",
            BranchId = order.OutletId > 0 ? order.OutletId : 1,
            RecordId = order.Id.ToString(),
            Data = updatedOrderDto
        });

        return Ok(updatedOrderDto);
    }


    // ============================================================
    // REMOVE ORDER ITEM
    // ============================================================

    [HttpDelete("{id}/items/{itemId}")]
    public async Task<IActionResult> RemoveOrderItem(
        long id,
        long itemId)
    {
        var order = await _context.Orders
            .Include(o => o.Items)
            .FirstOrDefaultAsync(o =>
                o.Id == id);

        if (order == null)
        {
            return NotFound(new
            {
                message = "Order not found."
            });
        }

        var item = order.Items.FirstOrDefault(i =>
            i.Id == itemId);

        if (item == null)
        {
            return NotFound(new
            {
                message = "Order item not found."
            });
        }

        if (item.KotStatus != "Queued" &&
            item.KotStatus != "queued")
        {
            return BadRequest(new
            {
                message =
                    "Items already sent to kitchen cannot be removed."
            });
        }

        _context.OrderItems.Remove(item);

        RecalculateTotals(order);

        await _context.SaveChangesAsync();

        await _hubContext.Clients
            .Group("floor")
            .SendAsync(
                "OrderUpdated",
                new
                {
                    orderId = order.Id,

                    tableId = order.TableId,

                    items = order.Items
                        .Where(i => i.Id != itemId)
                        .Select(MapToOrderItemDto)
                        .ToList(),

                    grandTotal = order.GrandTotal
                });

        var itemRemovedDto = MapToOrderDto(order);

        await _realtimeSync.PublishAsync(new RealtimeEvent
        {
            EventType = "order:itemDeleted",
            Module = "Orders",
            Action = "itemDeleted",
            BranchId = order.OutletId > 0 ? order.OutletId : 1,
            RecordId = order.Id.ToString(),
            Data = new { orderId = order.Id, itemId, order = itemRemovedDto }
        });

        await _realtimeSync.PublishAsync(new RealtimeEvent
        {
            EventType = "order:updated",
            Module = "Orders",
            Action = "updated",
            BranchId = order.OutletId > 0 ? order.OutletId : 1,
            RecordId = order.Id.ToString(),
            Data = itemRemovedDto
        });

        return Ok(itemRemovedDto);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteOrder(long id)
    {
        var order = await _context.Orders.Include(o => o.Items).FirstOrDefaultAsync(o => o.Id == id);
        if (order == null)
        {
            return Ok(new { success = true, message = "Order already removed." });
        }
        order.Status = "Cancelled";
        order.IsDeleted = true;
        order.IsActive = false;
        order.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        var cancelledDto = MapToOrderDto(order);

        await _realtimeSync.PublishAsync(new RealtimeEvent
        {
            EventType = "order:deleted",
            Module = "Orders",
            Action = "deleted",
            BranchId = order.OutletId > 0 ? order.OutletId : 1,
            RecordId = order.Id.ToString(),
            Data = new { orderId = order.Id, status = "Cancelled" }
        });

        await _realtimeSync.PublishAsync(new RealtimeEvent
        {
            EventType = "order:statusChanged",
            Module = "Orders",
            Action = "cancelled",
            BranchId = order.OutletId > 0 ? order.OutletId : 1,
            RecordId = order.Id.ToString(),
            Data = new { orderId = order.Id, status = "Cancelled" }
        });

        return Ok(new { success = true, message = "Order cancelled/deleted successfully.", data = cancelledDto });
    }

    [HttpPost("{id}/cancel")]
    public async Task<IActionResult> CancelOrder(long id)
    {
        return await DeleteOrder(id);
    }


    // ============================================================
    // DISPATCH KOT (KITCHEN) AND BOT (BAR) SEPARATELY
    // ============================================================

    [NonAction]
    public async Task<(object? kitchenKot, object? barKot)> DispatchKotAndBotForOrderAsync(Order order)
    {
        await PopulateDisplayFields(order);

        // Classify items into Kitchen (Food) vs Bar (Drinks)
        var (allKitchen, allBar) = await OrderItemRouting.ClassifyOrderItemsAsync(_context, order.Items);

        // Filter for items not yet dispatched to their respective department
        var unsentKitchenItems = allKitchen
            .Where(i => (i.KotId == null || i.KotId == 0) &&
                        (i.KotStatus == "Queued" || i.KotStatus == "queued"))
            .ToList();

        var unsentBarItems = allBar
            .Where(i => (i.BotId == null || i.BotId == 0) &&
                        (i.KotStatus == "Queued" || i.KotStatus == "queued"))
            .ToList();

        object? kitchenResult = null;
        object? barResult = null;

        // 1. Process Kitchen KOT
        if (unsentKitchenItems.Count > 0)
        {
            var station = await _context.KitchenStations
                .FirstOrDefaultAsync(s => s.StationId == 1 && s.IsActive && !s.IsDeleted);
            long stationId = station?.StationId ?? 1;

            int nextBatch = await _context.KitchenOrderTickets
                .Where(k => k.OrderId == order.Id && k.IsActive && !k.IsDeleted)
                .Select(k => (int?)k.BatchNumber)
                .MaxAsync() ?? 0;
            nextBatch++;

            string kotNumber = $"KOT-{DateTime.UtcNow:yyyyMMddHHmmssfff}";

            var kot = new KitchenOrderTicket
            {
                KotNumber = kotNumber,
                OrderId = order.Id,
                StationId = stationId,
                BatchNumber = nextBatch,
                Status = "Queued",
                IsActive = true,
                IsDeleted = false,
                CreatedAt = DateTime.UtcNow
            };

            _context.KitchenOrderTickets.Add(kot);
            await _context.SaveChangesAsync();

            try
            {
                var rawSql = "INSERT INTO kitchen_orders (kot_number, order_id, branch_id, batch_number, status, priority, special_notes, created_at) " +
                             "VALUES ({0}, {1}, 1, {2}, 'queued', 'normal', {3}, NOW()) " +
                             "ON DUPLICATE KEY UPDATE status = 'queued'";
                var note = $"Table: {order.TableName ?? ("Table " + order.TableId)} ({order.Section ?? "Main Hall"})";
                await _context.Database.ExecuteSqlRawAsync(rawSql, kot.KotNumber, order.Id, nextBatch, note);
            }
            catch { }

            foreach (var item in unsentKitchenItems)
            {
                item.KotId = kot.Id;
                item.KotBatch = nextBatch;
                item.KotStatus = "Queued";
                item.UpdatedAt = DateTime.UtcNow;
                item.OrderId = order.Id;
            }

            await _context.SaveChangesAsync();

            var kotData = new
            {
                kotId = kot.Id,
                kotNumber = kot.KotNumber,
                orderId = order.Id,
                orderNumber = order.OrderNumber,
                tableId = order.TableId,
                tableName = order.TableName,
                section = order.Section,
                serverName = order.ServerName,
                stationId = stationId,
                stationName = station?.StationName ?? "Main Kitchen",
                kotBatch = nextBatch,
                status = kot.Status,
                orderTime = order.CreatedAt,
                items = unsentKitchenItems.Select(MapToOrderItemDto).ToList()
            };

            try
            {
                await _hubContext.Clients.Group("kitchen").SendAsync("ReceiveNewKOT", kotData);
                await _realtimeSync.PublishAsync(new RealtimeEvent
                {
                    EventType = "kot:created",
                    Module = "Kitchen",
                    Action = "created",
                    BranchId = order.OutletId > 0 ? order.OutletId : 1,
                    RecordId = kot.Id.ToString(),
                    Data = kotData
                }, EventScope.Station, "kitchen");
            }
            catch { }

            kitchenResult = new
            {
                kotId = kot.Id,
                kotNumber = kot.KotNumber,
                batch = nextBatch,
                status = "Queued",
                itemCount = unsentKitchenItems.Count,
                items = unsentKitchenItems.Select(i => new { i.Id, i.Name, i.Quantity, i.Notes }).ToList()
            };
        }

        // 2. Process Bar BOT
        if (unsentBarItems.Count > 0)
        {
            int nextBarBatch = 1;
            try
            {
                var maxBatch = await _spService.ExecuteSqlScalarAsync<int?>(
                    "SELECT MAX(batch_number) FROM bar_order_tickets WHERE order_id = @oid;",
                    new Dictionary<string, object?> { { "oid", order.Id } });
                nextBarBatch = (maxBatch ?? 0) + 1;
            }
            catch { }

            string botNumber = $"BOT-{DateTime.UtcNow:yyyyMMddHHmmssfff}";
            var note = $"Table: {order.TableName ?? ("Table " + order.TableId)} ({order.Section ?? "Bar"})";

            long botId = 0;
            try
            {
                var insertBotSql = @"INSERT INTO bar_order_tickets (bot_number, order_id, bar_counter_id, batch_number, status, priority, special_notes, created_at)
                                     VALUES (@bnum, @oid, 1, @batch, 'queued', 'normal', @notes, NOW());
                                     SELECT LAST_INSERT_ID();";
                botId = await _spService.ExecuteSqlScalarAsync<long>(insertBotSql, new Dictionary<string, object?>
                {
                    { "bnum", botNumber },
                    { "oid", order.Id },
                    { "batch", nextBarBatch },
                    { "notes", note }
                });
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to insert bar_order_tickets record for order {OrderId}", order.Id);
            }

            foreach (var item in unsentBarItems)
            {
                if (botId > 0)
                {
                    item.BotId = botId;
                }
                item.KotBatch = nextBarBatch;
                item.KotStatus = "Queued";
                item.UpdatedAt = DateTime.UtcNow;
                item.OrderId = order.Id;

                if (botId > 0 && item.Id > 0)
                {
                    try
                    {
                        var insertItemSql = @"INSERT INTO bar_bot_items (bot_id, order_item_id, pour_size_ml, item_status, special_notes)
                                              VALUES (@bid, @oiid, 60.00, 'queued', @notes);";
                        await _spService.ExecuteSqlNonQueryAsync(insertItemSql, new Dictionary<string, object?>
                        {
                            { "bid", botId },
                            { "oiid", item.Id },
                            { "notes", item.Notes }
                        });
                    }
                    catch { }
                }
            }

            await _context.SaveChangesAsync();

            var botData = new
            {
                botId = botId,
                botNumber = botNumber,
                orderId = order.Id,
                orderNumber = order.OrderNumber,
                tableId = order.TableId,
                tableName = order.TableName,
                section = order.Section,
                serverName = order.ServerName,
                barBatch = nextBarBatch,
                status = "queued",
                orderTime = order.CreatedAt,
                items = unsentBarItems.Select(MapToOrderItemDto).ToList()
            };

            try
            {
                await _hubContext.Clients.Group("bar").SendAsync("ReceiveNewBOT", botData);
                await _hubContext.Clients.All.SendAsync("ReceiveBarKotCreated", botData);
                await _realtimeSync.PublishAsync(new RealtimeEvent
                {
                    EventType = "bot:created",
                    Module = "Bar",
                    Action = "created",
                    BranchId = order.OutletId > 0 ? order.OutletId : 1,
                    RecordId = botId.ToString(),
                    Data = botData
                }, EventScope.Station, "bar");
            }
            catch { }

            barResult = new
            {
                botId = botId,
                botNumber = botNumber,
                batch = nextBarBatch,
                status = "queued",
                itemCount = unsentBarItems.Count,
                items = unsentBarItems.Select(i => new { i.Id, i.Name, i.Quantity, i.Notes }).ToList()
            };
        }

        // Notify floor
        if (order.TableId.HasValue)
        {
            try
            {
                var table = await _context.DiningTables.FirstOrDefaultAsync(t => t.Id == order.TableId.Value);
                if (table != null)
                {
                    var activeCount = order.Items.Count(i =>
                        i.KotStatus == "Queued" || i.KotStatus == "queued" ||
                        i.KotStatus == "Cooking" || i.KotStatus == "cooking" ||
                        i.KotStatus == "mixing");
                    await _hubContext.Clients.All.SendAsync("TableStatusUpdated", new
                    {
                        tableId = table.Id,
                        status = table.Status,
                        activeKOTCount = activeCount,
                        orderTotal = order.GrandTotal
                    });
                    await _realtimeSync.PublishAsync(new RealtimeEvent
                    {
                        EventType = "table:statusChanged",
                        Module = "Tables",
                        Action = "statusChanged",
                        BranchId = order.OutletId > 0 ? order.OutletId : 1,
                        RecordId = table.Id.ToString(),
                        Data = new
                        {
                            tableId = table.Id,
                            status = table.Status,
                            activeKOTCount = activeCount,
                            orderTotal = order.GrandTotal
                        }
                    });
                }
            }
            catch { }
        }

        return (kitchenResult, barResult);
    }

    // ============================================================
    // SEND KOT & BOT AUTOMATICALLY ROUTED
    // ============================================================
    [HttpPost("{id}/kot")]
    public async Task<IActionResult> SendKot(long id)
    {
        var order = await _context.Orders
            .Include(o => o.Items)
            .FirstOrDefaultAsync(o =>
                o.Id == id &&
                o.IsActive &&
                !o.IsDeleted);

        if (order == null)
        {
            return NotFound(new
            {
                message = "Order not found."
            });
        }

        var (kitchenKot, barKot) = await DispatchKotAndBotForOrderAsync(order);

        if (kitchenKot == null && barKot == null)
        {
            return BadRequest(new
            {
                message = "No new queued items to send to kitchen or bar."
            });
        }


        return Ok(new
        {
            success = true,
            message = "Order items routed to kitchen and bar tickets successfully.",
            orderId = order.Id,
            orderNumber = order.OrderNumber,
            kitchenKot,
            barKot
        });
    }

    // ============================================================
    // SETTLE ORDER
    // ============================================================

    [HttpPost("{id}/settle")]
    public async Task<IActionResult> SettleOrder(
        long id,
        [FromBody] SettleOrderRequest request)
    {
        var order = await _context.Orders
            .Include(o => o.Items)
            .FirstOrDefaultAsync(o =>
                o.Id == id &&
                o.IsActive &&
                !o.IsDeleted);

        if (order == null)
        {
            return NotFound(new
            {
                message = "Order not found."
            });
        }

        if (string.Equals(order.Status, "Settled", StringComparison.OrdinalIgnoreCase))
        {
            return Conflict(new
            {
                success = false,
                message = "This order has already been settled."
            });
        }

        if (request != null)
        {
            order.DiscountPercent =
                request.DiscountPercent;

            order.TipAmount =
                request.TipAmount;

            if (!request.ServiceChargeEnabled)
            {
                order.ServiceChargePercent = 0;
            }
            else
            {
                order.ServiceChargePercent = 5m;
            }
        }

        RecalculateTotals(order);

        DiningTable? diningTable = null;
        RestaurantTable? restaurantTable = null;
        if (order.TableId.HasValue)
        {
            diningTable = await _context.DiningTables
                .FirstOrDefaultAsync(t => t.Id == order.TableId.Value && t.IsActive && !t.IsDeleted);
            if (diningTable != null && !string.IsNullOrWhiteSpace(diningTable.Name))
            {
                var tableName = diningTable.Name.Trim();
                restaurantTable = await _context.RestaurantTables.FirstOrDefaultAsync(t =>
                    t.DeletedAt == null &&
                    (t.TableName == tableName || t.TableNumber == tableName));
            }

            // Older records can use the same numeric ID across both table stores.
            // Use that fallback only after trying the stable custom name mapping.
            restaurantTable ??= await _context.RestaurantTables.FirstOrDefaultAsync(t =>
                t.TableId == order.TableId.Value && t.DeletedAt == null);

            if (restaurantTable == null && !string.IsNullOrWhiteSpace(order.TableName))
            {
                restaurantTable = await _context.RestaurantTables.FirstOrDefaultAsync(t =>
                    t.DeletedAt == null &&
                    (t.TableName == order.TableName || t.TableNumber == order.TableName));
            }
        }

        var paymentMethod = string.IsNullOrWhiteSpace(request?.PaymentMethod)
            ? order.PaymentMethod ?? "Cash"
            : request.PaymentMethod.Trim();
        var invoiceId = await EnsureInvoiceCreatedAsync(order, paymentMethod, request?.InvoiceNumber);
        if (invoiceId <= 0)
        {
            return StatusCode(StatusCodes.Status502BadGateway, new
            {
                success = false,
                message = "Payment could not be recorded. The order and table were left unsettled."
            });
        }

        order.Status = "Settled";
        order.PaymentStatus = "Paid";
        order.PaymentMethod = paymentMethod;
        order.UpdatedAt = DateTime.UtcNow;

        foreach (var item in order.Items)
        {
            if (item.KotStatus != "Ready" &&
                item.KotStatus != "ready")
            {
                item.KotStatus = "Served";
            }

            item.UpdatedAt = DateTime.UtcNow;
        }

        if (order.TableId.HasValue)
        {
            if (diningTable != null)
            {
                diningTable.Status = "vacant";
                diningTable.UpdatedAt = DateTime.UtcNow;
            }

            if (restaurantTable != null)
            {
                restaurantTable.Status = "available";
                restaurantTable.OccupiedChairs = 0;
                restaurantTable.UpdatedAt = DateTime.UtcNow;
            }
        }

        await _context.SaveChangesAsync();

        if (order.TableId.HasValue)
        {
            await _hubContext.Clients
                .All
                .SendAsync(
                    "TableStatusUpdated",
                    new
                    {
                        tableId = order.TableId.Value,

                        status = "vacant",

                        activeKOTCount = 0,

                        orderTotal = 0
                    });
        }

        var settledDto = MapToOrderDto(order);
        if (invoiceId > 0)
        {
            settledDto.InvoiceId = invoiceId;
            settledDto.InvoiceNo = !string.IsNullOrWhiteSpace(request?.InvoiceNumber)
                ? request.InvoiceNumber.Trim()
                : $"INV-{DateTime.UtcNow:yyyyMMdd}-{order.Id}";
        }

        long branchId = order.OutletId > 0 ? order.OutletId : 1;

        await _realtimeSync.PublishAsync(new RealtimeEvent
        {
            EventType = "order:statusChanged",
            Module = "Orders",
            Action = "settled",
            BranchId = branchId,
            RecordId = order.Id.ToString(),
            Data = new { orderId = order.Id, status = "Settled", invoiceId = invoiceId, invoiceNumber = settledDto.InvoiceNo }
        });

        if (order.TableId.HasValue)
        {
            await _realtimeSync.PublishAsync(new RealtimeEvent
            {
                EventType = "table:statusChanged",
                Module = "Tables",
                Action = "statusChanged",
                BranchId = branchId,
                RecordId = order.TableId.Value.ToString(),
                Data = new { tableId = order.TableId.Value, status = "vacant", activeKOTCount = 0, orderTotal = 0 }
            });
        }

        await _realtimeSync.PublishAsync(new RealtimeEvent
        {
            EventType = "payment:completed",
            Module = "Payments",
            Action = "completed",
            BranchId = branchId,
            RecordId = order.Id.ToString(),
            Data = new { orderId = order.Id, amount = order.GrandTotal, paymentMethod, invoiceId }
        });

        if (invoiceId > 0)
        {
            await _realtimeSync.PublishAsync(new RealtimeEvent
            {
                EventType = "invoice:created",
                Module = "Invoices",
                Action = "created",
                BranchId = branchId,
                RecordId = invoiceId.ToString(),
                Data = new { invoiceId, invoiceNumber = settledDto.InvoiceNo, orderId = order.Id, totalAmount = order.GrandTotal }
            });
        }

        return Ok(new
        {
            success = true,
            orderId = order.Id,
            orderNumber = order.OrderNumber,
            invoiceId = invoiceId > 0 ? (long?)invoiceId : null,
            invoiceNumber = settledDto.InvoiceNo,
            data = settledDto
        });
    }


    // ============================================================
    // ORDER HISTORY
    // ============================================================

    [HttpGet("history")]
    public async Task<IActionResult> GetOrderHistory(
        [FromQuery] string? search,
        [FromQuery] string? paymentMethod,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        if (page < 1)
            page = 1;

        if (pageSize < 1)
            pageSize = 20;

        var query = _context.Orders
            .Include(o => o.Items)
            .Where(o =>
                o.Status == "Settled" ||
                o.Status == "settled")
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
        {
            query = query.Where(o =>
                o.OrderNumber.Contains(search));
        }

        var totalCount =
            await query.CountAsync();

        var orders = await query
            .OrderByDescending(o => o.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        foreach (var order in orders)
        {
            await PopulateDisplayFields(order);
            RecalculateTotals(order);
        }

        var orderDtos = orders.Select(MapToOrderDto).ToList();
        await PopulateInvoiceLinksAsync(orderDtos);

        return Ok(new
        {
            totalCount,

            page,

            pageSize,

            totalPages =
                (int)Math.Ceiling(
                    totalCount /
                    (double)pageSize),

            orders = orderDtos
        });
    }


    // ============================================================
    // RECEIPT
    // ============================================================

    [HttpGet("{id}/receipt")]
    public async Task<IActionResult> GetReceipt(long id)
    {
        var order = await _context.Orders
            .Include(o => o.Items)
            .FirstOrDefaultAsync(o =>
                o.Id == id);

        if (order == null)
        {
            return NotFound(new
            {
                message = "Order not found."
            });
        }

        await PopulateDisplayFields(order);

        RecalculateTotals(order);

        return Ok(new
        {
            restaurantName =
                "Gourmet Restaurant & Lounge",

            invoiceNo =
                $"ORD-{order.Id}",

            orderNumber =
                order.OrderNumber,

            date =
                order.CreatedAt,

            table =
                order.TableName,

            section =
                order.Section,

            server =
                order.ServerName,

            guests =
                order.Guests,

            items =
                order.Items.Select(i => new
                {
                    name = i.Name,

                    qty = i.Quantity,

                    price = i.Price,

                    amount = i.TotalPrice
                }),

            subtotal =
                order.Subtotal,

            taxPercent =
                order.TaxPercent,

            taxAmount =
                order.TaxAmount,

            serviceChargePercent =
                order.ServiceChargePercent,

            serviceChargeAmount =
                order.ServiceChargeAmount,

            tipAmount =
                order.TipAmount,

            grandTotal =
                order.GrandTotal
        });
    }


    // ============================================================
    // GENERATE ORDER NUMBER
    // ============================================================

    private async Task<string> GenerateOrderNumber()
    {
        var today =
            DateTime.UtcNow.ToString("yyyyMMdd");

        var count =
            await _context.Orders
                .CountAsync(o =>
                    o.CreatedAt.Date ==
                    DateTime.UtcNow.Date);

        return $"ORD-{today}-{count + 1:0000}";
    }


    // ============================================================
    // POPULATE DISPLAY FIELDS
    // ============================================================

    private async Task PopulateDisplayFields(Order order)
    {
        // --------------------------------------------------------
        // TABLE
        // --------------------------------------------------------

        if (order.TableId.HasValue)
        {
            var table = await _context.DiningTables
                .FirstOrDefaultAsync(t =>
                    t.Id == order.TableId.Value);

            if (table != null)
            {
                order.TableName =
                    table.Name;

                // ------------------------------------------------
                // SECTION
                // ------------------------------------------------

                var section =
                    await _context.DiningSections
                        .FirstOrDefaultAsync(s =>
                            s.Id == table.SectionId);

                if (section != null)
                {
                    order.Section =
                        section.SectionName;
                }
            }
        }
        else if (string.Equals(order.OrderType, "Takeaway", StringComparison.OrdinalIgnoreCase))
        {
            order.TableName = "Takeaway";
            order.Section = "Takeaway";
        }

        // --------------------------------------------------------
        // WAITER / SERVER
        // --------------------------------------------------------

        if (order.WaiterId.HasValue)
        {
            var waiter =
                await _context.Staff
                    .FirstOrDefaultAsync(s =>
                        s.Id ==
                        order.WaiterId.Value);

            if (waiter != null)
            {
                order.ServerName =
                    waiter.Name;
            }
        }

        try
        {
            var latestKot = await _context.KitchenOrderTickets
                .Where(k => k.OrderId == order.Id && k.IsActive && !k.IsDeleted)
                .OrderByDescending(k => k.CreatedAt)
                .Select(k => k.KotNumber)
                .FirstOrDefaultAsync();
            if (!string.IsNullOrEmpty(latestKot))
            {
                order.KitchenKotNumber = latestKot;
            }

            var latestBot = await _spService.ExecuteSqlScalarAsync<string?>(
                "SELECT bot_number FROM bar_order_tickets WHERE order_id = @oid ORDER BY created_at DESC LIMIT 1;",
                new Dictionary<string, object?> { { "oid", order.Id } });
            if (!string.IsNullOrEmpty(latestBot))
            {
                order.BarBotNumber = latestBot;
            }
        }
        catch { }
    }


    // ============================================================
    // CLEAN DUPLICATE ITEMS & RECALCULATE TOTALS
    // ============================================================

    private async Task CleanDuplicateOrderItemsAsync(Order order)
    {
        if (order?.Items == null || order.Items.Count <= 1) return;
        try
        {
            var seenKeys = new HashSet<string>();
            bool hasDuplicates = false;
            foreach (var item in order.Items.Where(i => i.IsActive && !i.IsDeleted).ToList())
            {
                var key = $"{item.MenuItemId}_{item.Name?.Trim().ToLowerInvariant()}_{item.KotStatus?.ToLowerInvariant()}_{item.KotBatch}";
                if (!seenKeys.Add(key))
                {
                    item.IsActive = false;
                    item.IsDeleted = true;
                    item.KotStatus = "Cancelled";
                    hasDuplicates = true;
                }
            }
            if (hasDuplicates)
            {
                await _context.SaveChangesAsync();
            }
        }
        catch { }
    }

    private static void RecalculateTotals(Order order)
    {
        var activeItems = order.Items
            .Where(i => i.IsActive && !i.IsDeleted && !string.Equals(i.KotStatus, "Cancelled", StringComparison.OrdinalIgnoreCase));

        order.Subtotal = activeItems.Sum(i => i.Price * i.Quantity);

        order.DiscountAmount =
            order.Subtotal *
            (order.DiscountPercent / 100m);

        var netSubtotal =
            order.Subtotal -
            order.DiscountAmount;

        order.TaxAmount =
            netSubtotal *
            (order.TaxPercent / 100m);

        order.ServiceChargeAmount =
            netSubtotal *
            (order.ServiceChargePercent / 100m);

        order.GrandTotal =
            Math.Round(
                netSubtotal +
                order.TaxAmount +
                order.ServiceChargeAmount +
                order.TipAmount,
                2);
    }


    // ============================================================
    // MAP ORDER DTO
    // ============================================================

    private static OrderDto MapToOrderDto(
        Order order)
    {
        return new OrderDto
        {
            Id =
                order.Id,

            OrderType = order.OrderType,

            TableId =
                order.TableId ?? 0,

            TableName =
                order.TableName,

            Section =
                order.Section,

            ServerName =
                order.ServerName,

            Guests =
                order.Guests,

            Status =
                order.Status,

            PaymentStatus =
                order.PaymentStatus,

            FulfillmentStatus =
                order.FulfillmentStatus,

            Subtotal =
                order.Subtotal,

            DiscountPercent =
                order.DiscountPercent,

            DiscountAmount =
                order.DiscountAmount,

            TaxPercent =
                order.TaxPercent,

            TaxAmount =
                order.TaxAmount,

            ServiceChargePercent =
                order.ServiceChargePercent,

            ServiceChargeAmount =
                order.ServiceChargeAmount,

            TipAmount =
                order.TipAmount,

            GrandTotal =
                order.GrandTotal,
            InvoiceNo =
                order.InvoiceNo,

            KitchenKotNumber =
                order.KitchenKotNumber,

            BarBotNumber =
                order.BarBotNumber,

            SettledAt =
                order.SettledAt,

            CreatedAt =
                order.CreatedAt,

            Items = order.Items
                .Where(i => i.IsActive && !i.IsDeleted && !string.Equals(i.KotStatus, "Cancelled", StringComparison.OrdinalIgnoreCase))
                .GroupBy(i => new { i.MenuItemId, Name = (i.Name ?? "").Trim().ToLowerInvariant(), Status = (i.KotStatus ?? "").ToLowerInvariant(), i.KotBatch })
                .Select(g =>
                {
                    var first = g.First();
                    var dto = MapToOrderItemDto(first);
                    dto.Quantity = g.Sum(x => x.Quantity);
                    return dto;
                })
                .ToList()
        };
    }


    // ============================================================
    // MAP ORDER ITEM DTO
    // ============================================================

    private static OrderItemDto MapToOrderItemDto(
        OrderItem item)
    {
        bool isBar = item.BotId.HasValue && item.BotId.Value > 0;
        return new OrderItemDto
        {
            OrderId =
                item.OrderId,

            MenuItemId =
                item.MenuItemId,

            Name =
                item.Name,

            Price =
                item.Price,

            Quantity =
                item.Quantity,

            Notes =
                item.Notes,

            KotStatus =
                item.KotStatus,

            KotBatch =
                item.KotBatch,

            KotId =
                item.KotId,

            BotId =
                item.BotId,

            IsBarItem =
                isBar,

            Department =
                isBar ? "Bar" : "Kitchen"
        };
    }

    // ============================================================
    // UPDATE GUESTS COUNT
    // ============================================================

    [HttpPatch("{id}/guests")]
    public async Task<IActionResult> UpdateGuests(long id, [FromBody] UpdateGuestsRequestDto request)
    {
        if (request.Guests <= 0)
        {
            return BadRequest(new { success = false, message = "Guest count must be greater than zero." });
        }

        var order = await _context.Orders.FirstOrDefaultAsync(o => o.Id == id && !o.IsDeleted);
        if (order == null)
        {
            return NotFound(new { success = false, message = $"Order {id} not found." });
        }

        if (order.Status == "Settled" || order.Status == "Cancelled")
        {
            return BadRequest(new { success = false, message = $"Cannot modify guest count on a {order.Status} order." });
        }

        order.Guests = request.Guests;
        order.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        await _realtimeSync.PublishAsync(new RealtimeEvent
        {
            EventType = "order:updated",
            Module = "Orders",
            Action = "guestsUpdated",
            BranchId = order.OutletId > 0 ? order.OutletId : 1,
            RecordId = order.Id.ToString(),
            Data = new { orderId = order.Id, guests = order.Guests }
        });

        return Ok(new { success = true, message = $"Guest count updated to {request.Guests}.", guests = order.Guests });
    }

    // ============================================================
    // UPDATE DISCOUNT
    // ============================================================

    [HttpPatch("{id}/discount")]
    public async Task<IActionResult> UpdateDiscount(long id, [FromBody] UpdateDiscountRequestDto request)
    {
        if (request.DiscountPercent < 0 || request.DiscountPercent > 100)
        {
            return BadRequest(new { success = false, message = "Discount percentage must be between 0 and 100." });
        }

        var order = await _context.Orders.Include(o => o.Items).FirstOrDefaultAsync(o => o.Id == id && !o.IsDeleted);
        if (order == null)
        {
            return NotFound(new { success = false, message = $"Order {id} not found." });
        }

        if (order.Status == "Cancelled")
        {
            return BadRequest(new { success = false, message = $"Cannot modify discount on a {order.Status} order." });
        }

        order.DiscountPercent = request.DiscountPercent;
        RecalculateTotals(order);
        order.UpdatedAt = DateTime.UtcNow;

        // Synchronize with Invoices table if an invoice exists for this order
        var invoice = await _context.Invoices.FirstOrDefaultAsync(i => i.OrderId == id);
        if (invoice != null)
        {
            invoice.DiscountAmount = order.DiscountAmount;
            invoice.TaxableAmount = Math.Max(0, order.Subtotal - order.DiscountAmount);
            invoice.TaxAmount = order.TaxAmount;
            invoice.TotalAmount = order.GrandTotal;
            if (order.Status == "Settled" || invoice.Status == "PAID")
            {
                invoice.PaidAmount = order.GrandTotal;
                invoice.AmountPaid = order.GrandTotal;
            }
            invoice.UpdatedAt = DateTime.UtcNow;
        }

        await _context.SaveChangesAsync();

        await _realtimeSync.PublishAsync(new RealtimeEvent
        {
            EventType = "order:discountApplied",
            Module = "Orders",
            Action = "discountApplied",
            BranchId = order.OutletId > 0 ? order.OutletId : 1,
            RecordId = order.Id.ToString(),
            Data = new
            {
                orderId = order.Id,
                discountPercent = order.DiscountPercent,
                discountAmount = order.DiscountAmount,
                grandTotal = order.GrandTotal
            }
        });

        await _realtimeSync.PublishAsync(new RealtimeEvent
        {
            EventType = "order:updated",
            Module = "Orders",
            Action = "updated",
            BranchId = order.OutletId > 0 ? order.OutletId : 1,
            RecordId = order.Id.ToString(),
            Data = MapToOrderDto(order)
        });

        return Ok(new
        {
            success = true,
            message = $"Discount updated to {request.DiscountPercent}%.",
            discountPercent = order.DiscountPercent,
            discountAmount = order.DiscountAmount,
            grandTotal = order.GrandTotal
        });
    }

    // ============================================================
    // UPDATE ITEM NOTES
    // ============================================================

    [HttpPatch("{id}/items/{itemId}/notes")]
    public async Task<IActionResult> UpdateItemNotes(long id, long itemId, [FromBody] UpdateItemNotesRequestDto request)
    {
        var item = await _context.OrderItems.FirstOrDefaultAsync(i => i.Id == itemId && i.OrderId == id && !i.IsDeleted);
        if (item == null)
        {
            return NotFound(new { success = false, message = $"Order item {itemId} not found for order {id}." });
        }

        item.Notes = request.Notes?.Trim();
        item.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        await _realtimeSync.PublishAsync(new RealtimeEvent
        {
            EventType = "order:itemUpdated",
            Module = "Orders",
            Action = "notesUpdated",
            BranchId = 1,
            RecordId = id.ToString(),
            Data = new { orderId = id, itemId = itemId, notes = item.Notes }
        });

        return Ok(new { success = true, message = "Cooking instructions updated.", notes = item.Notes });
    }

    // ============================================================
    // UPDATE SERVICE CHARGE
    // ============================================================

    [HttpPatch("{id}/service-charge")]
    public async Task<IActionResult> UpdateServiceCharge(long id, [FromBody] UpdateServiceChargeRequestDto request)
    {
        var order = await _context.Orders.Include(o => o.Items).FirstOrDefaultAsync(o => o.Id == id && !o.IsDeleted);
        if (order == null)
        {
            return NotFound(new { success = false, message = $"Order {id} not found." });
        }

        if (order.Status == "Settled" || order.Status == "Cancelled")
        {
            return BadRequest(new { success = false, message = $"Cannot modify service charge on a {order.Status} order." });
        }

        if (request != null)
        {
            if (request.ServiceChargePercent.HasValue)
            {
                order.ServiceChargePercent = request.ServiceChargePercent.Value;
            }
            else if (request.ServiceCharge.HasValue)
            {
                order.ServiceChargePercent = request.ServiceCharge.Value ? 5m : 0m;
            }
        }

        RecalculateTotals(order);
        order.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        await _realtimeSync.PublishAsync(new RealtimeEvent
        {
            EventType = "order:updated",
            Module = "Orders",
            Action = "serviceChargeUpdated",
            BranchId = order.OutletId > 0 ? order.OutletId : 1,
            RecordId = order.Id.ToString(),
            Data = new
            {
                orderId = order.Id,
                serviceChargePercent = order.ServiceChargePercent,
                serviceChargeAmount = order.ServiceChargeAmount,
                grandTotal = order.GrandTotal
            }
        });

        return Ok(new
        {
            success = true,
            message = $"Service charge updated to {order.ServiceChargePercent}%.",
            serviceChargePercent = order.ServiceChargePercent,
            serviceChargeAmount = order.ServiceChargeAmount,
            grandTotal = order.GrandTotal
        });
    }

    // ============================================================
    // BILL SUMMARY
    // ============================================================

    [HttpGet("{id}/bill-summary")]
    public async Task<IActionResult> GetBillSummary(long id)
    {
        var order = await _context.Orders.Include(o => o.Items).FirstOrDefaultAsync(o => o.Id == id);
        if (order == null)
        {
            return NotFound(new { success = false, message = $"Order {id} not found." });
        }

        await CleanDuplicateOrderItemsAsync(order);
        await PopulateDisplayFields(order);
        RecalculateTotals(order);

        return Ok(new
        {
            success = true,
            orderId = order.Id,
            orderNumber = order.OrderNumber,
            tableId = order.TableId,
            tableName = order.TableName,
            subtotal = order.Subtotal,
            discountPercent = order.DiscountPercent,
            discountAmount = order.DiscountAmount,
            taxPercent = order.TaxPercent,
            taxAmount = order.TaxAmount,
            serviceChargePercent = order.ServiceChargePercent,
            serviceChargeAmount = order.ServiceChargeAmount,
            tipAmount = order.TipAmount,
            grandTotal = order.GrandTotal,
            itemCount = order.Items.Count,
            items = order.Items.Select(MapToOrderItemDto).ToList()
        });
    }

    private async Task<long> EnsureInvoiceCreatedAsync(
        Order order,
        string paymentMethod,
        string? invoiceNumber = null)
    {
        if (order.Subtotal <= 0 || order.GrandTotal <= 0)
        {
            _logger.LogWarning(
                "Skipping invoice creation for settled order {OrderId} because its POS total is not positive.",
                order.Id);
            return 0;
        }

        try
        {
            var persistedInvoiceNumber = string.IsNullOrWhiteSpace(invoiceNumber)
                ? $"INV-{DateTime.UtcNow:yyyyMMdd}-{order.Id}"
                : invoiceNumber.Trim();
            var subtotal = order.Subtotal;
            var discount = order.DiscountAmount;
            var taxable = Math.Max(0, subtotal - discount);
            var taxAmount = order.TaxAmount;
            var totalAmount = order.GrandTotal;

            long invoiceId = 0;
            try
            {
                var createParams = new Dictionary<string, object?>
                {
                    { "p_order_id", order.Id },
                    { "p_invoice_number", persistedInvoiceNumber },
                    { "p_subtotal", subtotal },
                    { "p_taxable_amount", taxable },
                    { "p_tax_amount", taxAmount },
                    { "p_discount_amount", discount },
                    { "p_total_amount", totalAmount }
                };

                invoiceId = await _spService.ExecuteScalarAsync<long>("sp_CreateInvoice", createParams);

                if (invoiceId > 0)
                {
                    var payParams = new Dictionary<string, object?>
                    {
                        { "p_invoice_id", invoiceId },
                        { "p_amount", totalAmount },
                        { "p_payment_mode", string.IsNullOrWhiteSpace(paymentMethod) ? "CASH" : paymentMethod.ToUpper() },
                        { "p_transaction_reference", $"TXN-ORD-{order.Id}-{DateTime.UtcNow:HHmmss}" }
                    };

                    await _spService.ExecuteNonQueryAsync("sp_RecordInvoicePayment", payParams);

                    // Backfill unified invoice metadata columns not yet written by sp_CreateInvoice
                    var spInvoice = await _context.Invoices.FirstOrDefaultAsync(i => i.InvoiceId == invoiceId);
                    if (spInvoice != null)
                    {
                        var cgst = Math.Round(taxAmount / 2m, 2);
                        var sgst = taxAmount - cgst;
                        var resolvedBranch = order.BranchId ?? (order.OutletId > 0 ? order.OutletId : 1);
                        spInvoice.BranchId ??= resolvedBranch;
                        spInvoice.OrderNumber ??= order.OrderNumber;
                        spInvoice.OrderType ??= order.OrderType;
                        spInvoice.CustomerName ??= order.CustomerName;
                        spInvoice.CustomerPhone ??= order.CustomerPhone;
                        spInvoice.GstPercent = order.TaxPercent;
                        spInvoice.CgstAmount = cgst;
                        spInvoice.SgstAmount = sgst;
                        spInvoice.ServiceChargePercent = order.ServiceChargePercent;
                        spInvoice.ServiceChargeAmount = order.ServiceChargeAmount;
                        spInvoice.PaymentStatus = "Paid";
                        spInvoice.UpdatedAt = DateTime.UtcNow;
                        await _context.SaveChangesAsync();
                    }
                }
            }
            catch (Exception spEx)
            {
                _logger.LogWarning(spEx, "sp_CreateInvoice stored procedure execution failed. Falling back to direct EF Core Invoice persistence.");
            }

            if (invoiceId <= 0)
            {
                var existingInvoice = await _context.Invoices.FirstOrDefaultAsync(i => i.OrderId == order.Id || i.InvoiceNumber == persistedInvoiceNumber);
                var cgst = Math.Round(taxAmount / 2m, 2);
                var sgst = taxAmount - cgst;
                var resolvedBranch = order.BranchId ?? (order.OutletId > 0 ? order.OutletId : 1);

                if (existingInvoice != null)
                {
                    existingInvoice.BranchId ??= resolvedBranch;
                    existingInvoice.OrderNumber ??= order.OrderNumber;
                    existingInvoice.OrderType ??= order.OrderType;
                    existingInvoice.CustomerName ??= order.CustomerName;
                    existingInvoice.CustomerPhone ??= order.CustomerPhone;
                    existingInvoice.Subtotal = subtotal;
                    existingInvoice.TaxableAmount = taxable;
                    existingInvoice.GstPercent = order.TaxPercent;
                    existingInvoice.CgstAmount = cgst;
                    existingInvoice.SgstAmount = sgst;
                    existingInvoice.TaxAmount = taxAmount;
                    existingInvoice.DiscountAmount = discount;
                    existingInvoice.ServiceChargePercent = order.ServiceChargePercent;
                    existingInvoice.ServiceChargeAmount = order.ServiceChargeAmount;
                    existingInvoice.TotalAmount = totalAmount;
                    existingInvoice.PaidAmount = totalAmount;
                    existingInvoice.AmountPaid = totalAmount;
                    existingInvoice.PaymentStatus = "Paid";
                    existingInvoice.Status = "PAID";
                    existingInvoice.UpdatedAt = DateTime.UtcNow;
                    await _context.SaveChangesAsync();
                    invoiceId = existingInvoice.InvoiceId;
                }
                else
                {
                    var newInvoice = new Invoice
                    {
                        OrderId = order.Id,
                        OrderNumber = order.OrderNumber,
                        BranchId = resolvedBranch,
                        OrderType = order.OrderType,
                        CustomerName = order.CustomerName,
                        CustomerPhone = order.CustomerPhone,
                        InvoiceNumber = persistedInvoiceNumber,
                        Subtotal = subtotal,
                        TaxableAmount = taxable,
                        GstPercent = order.TaxPercent,
                        CgstAmount = cgst,
                        SgstAmount = sgst,
                        TaxAmount = taxAmount,
                        DiscountAmount = discount,
                        ServiceChargePercent = order.ServiceChargePercent,
                        ServiceChargeAmount = order.ServiceChargeAmount,
                        TotalAmount = totalAmount,
                        PaidAmount = totalAmount,
                        AmountPaid = totalAmount,
                        PaymentStatus = "Paid",
                        Status = "PAID",
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    };
                    _context.Invoices.Add(newInvoice);
                    await _context.SaveChangesAsync();
                    invoiceId = newInvoice.InvoiceId;
                }

                if (invoiceId > 0)
                {
                    try
                    {
                        var payment = new InvoicePayment
                        {
                            InvoiceId = invoiceId,
                            Amount = totalAmount,
                            AmountPaid = totalAmount,
                            PaymentMode = string.IsNullOrWhiteSpace(paymentMethod) ? "CASH" : paymentMethod.ToUpper(),
                            PaymentMethod = string.IsNullOrWhiteSpace(paymentMethod) ? "cash" : paymentMethod.ToLower(),
                            TransactionReference = $"TXN-ORD-{order.Id}-{DateTime.UtcNow:HHmmss}",
                            PaidAt = DateTime.UtcNow
                        };
                        _context.InvoicePayments.Add(payment);
                        await _context.SaveChangesAsync();
                    }
                    catch { }
                }
            }

            return invoiceId;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to create invoice for settled order {OrderId}", order.Id);
            return 0;
        }
    }
    /// <summary>
    /// Exports Restaurant Orders History as CSV or XLSX.
    /// Supports ?fromDate=...&amp;toDate=...&amp;status=...&amp;orderType=...&amp;department=...&amp;format=csv|xlsx.
    /// </summary>
    [Microsoft.AspNetCore.Authorization.AllowAnonymous]
    [HttpGet("export")]
    public async Task<IActionResult> ExportOrders(
        [FromQuery] DateTime? fromDate,
        [FromQuery] DateTime? toDate,
        [FromQuery] string? status,
        [FromQuery] string? orderType,
        [FromQuery] string? department = null,
        [FromQuery] string? format = "csv")
    {
        try
        {
            var doc = await _reportingExportService.GenerateOrdersExportAsync(fromDate, toDate, status, orderType, department);
            return _exportService.ExportResult(doc, format, "Orders_Log");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error exporting orders history");
            return StatusCode(500, new { success = false, message = "Failed to export orders history.", error = ex.Message });
        }
    }
}

public class UpdateServiceChargeRequestDto
{
    public decimal? ServiceChargePercent { get; set; }
    public bool? ServiceCharge { get; set; }
}
