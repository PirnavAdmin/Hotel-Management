namespace HMS.Controllers;

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
[Route("api/[controller]")]
[Route("api/v1/orders")]
public class OrdersController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly SpService _spService;
    private readonly IHubContext<PosHub> _hubContext;
    private readonly ILogger<OrdersController> _logger;

    public OrdersController(
        AppDbContext context,
        SpService spService,
        IHubContext<PosHub> hubContext,
        ILogger<OrdersController> logger)
    {
        _context = context;
        _spService = spService;
        _hubContext = hubContext;
        _logger = logger;
    }

    // ============================================================
    // GET ACTIVE ORDERS
    // ============================================================

    [HttpGet]
    [HttpGet("active")]
    public async Task<IActionResult> GetActiveOrders()
    {
        var orders = await _context.Orders
            .Include(o => o.Items)
            .Where(o =>
                o.IsActive &&
                !o.IsDeleted &&
                (o.Status == "Active" ||
                 o.Status == "active" ||
                 o.Status == "Billed" ||
                 o.Status == "billed"))
            .OrderByDescending(o => o.CreatedAt)
            .ToListAsync();

        foreach (var order in orders)
        {
            await PopulateDisplayFields(order);
            RecalculateTotals(order);
        }

        return Ok(orders.Select(MapToOrderDto));
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

        await PopulateDisplayFields(order);
        RecalculateTotals(order);

        return Ok(MapToOrderDto(order));
    }


    // ============================================================
    // GET ORDER BY TABLE
    // ============================================================

    [HttpGet("table/{tableId}")]
    public async Task<IActionResult> GetOrderByTable(long tableId)
    {
        var table = await _context.DiningTables
            .FirstOrDefaultAsync(t =>
                t.Id == tableId &&
                t.IsActive &&
                !t.IsDeleted);

        if (table == null)
        {
            return NotFound(new
            {
                message = "Table not found."
            });
        }

        var order = await _context.Orders
            .Include(o => o.Items)
            .Where(o =>
                o.TableId == tableId &&
                o.IsActive &&
                !o.IsDeleted &&
                (o.Status == "Active" ||
                 o.Status == "active" ||
                 o.Status == "Billed" ||
                 o.Status == "billed"))
            .OrderByDescending(o => o.CreatedAt)
            .FirstOrDefaultAsync();

        if (order == null)
        {
            return Ok(null);
        }

        await PopulateDisplayFields(order);
        RecalculateTotals(order);

        return Ok(MapToOrderDto(order));
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

        // 2. Takeaway Order Handling (direct takeaway checkout without locking a dining table)
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
                takeawayOrder.PaymentMethod = request.PaymentMethod ?? "Cash";
                takeawayOrder.DiscountPercent = request.DiscountPercent;
                takeawayOrder.TipAmount = request.TipAmount;
                takeawayOrder.ServiceChargePercent = request.ServiceChargeEnabled ? 5m : 0m;
                takeawayOrder.SettledAt = DateTime.UtcNow;
                takeawayOrder.UpdatedAt = DateTime.UtcNow;
                RecalculateTotals(takeawayOrder);

                foreach (var item in takeawayOrder.Items)
                {
                    item.KotStatus = "Served";
                    item.UpdatedAt = DateTime.UtcNow;
                }

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
        if (resolvedTableId <= 0)
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

        var table = await _context.DiningTables
            .FirstOrDefaultAsync(t =>
                t.Id == resolvedTableId &&
                t.IsActive &&
                !t.IsDeleted);

        if (table == null)
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

        var section = await _context.DiningSections
            .FirstOrDefaultAsync(s =>
                s.Id == table.SectionId &&
                s.IsActive &&
                !s.IsDeleted);

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

        var order = await _context.Orders
            .Include(o => o.Items)
            .FirstOrDefaultAsync(o =>
                o.TableId == table.Id &&
                o.IsActive &&
                !o.IsDeleted &&
                (o.Status == "Active" ||
                 o.Status == "active"));

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

                OrderType = "DineIn",

                TableId = table.Id,

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

            var existingItem = order.Items.FirstOrDefault(i =>
                (i.MenuItemId == menuItemId && string.Equals(i.Name, itemInput.Name, StringComparison.OrdinalIgnoreCase)) &&
                i.VariantId == itemInput.VariantId &&
                (i.KotStatus == "Queued" ||
                 i.KotStatus == "queued") &&
                (i.KotId == null || i.KotId == 0) &&
                (i.BotId == null || i.BotId == 0));

            if (existingItem != null)
            {
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
            order.DiscountPercent = request.DiscountPercent;
            order.TipAmount = request.TipAmount;
            order.ServiceChargePercent = request.ServiceChargeEnabled ? 5m : 0m;
            order.SettledAt = DateTime.UtcNow;
            order.UpdatedAt = DateTime.UtcNow;
            RecalculateTotals(order);

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

        return Ok(MapToOrderDto(order));
    }


    // ============================================================
    // UPDATE ORDER ITEMS
    // ============================================================

    [HttpPost("{id}/items")]
    [HttpPut("{id}/items")]
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

        return Ok(MapToOrderDto(order));
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

        return Ok(MapToOrderDto(order));
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
        return Ok(new { success = true, message = "Order cancelled/deleted successfully.", data = MapToOrderDto(order) });
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
                }
            }
            catch { }
        }

        return (kitchenResult, barResult);
    }

    // ============================================================
    // SEND KOT & BOT AUTOMATICALLY ROUTED
    // ============================================================

    [HttpPost("{id}/send-kot")]
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

        order.Status = "Settled";

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
            var table = await _context.DiningTables
                .FirstOrDefaultAsync(t =>
                    t.Id == order.TableId.Value);

            if (table != null)
            {
                table.Status = "vacant";
                table.UpdatedAt = DateTime.UtcNow;
            }

            var restTbl = await _context.RestaurantTables.FirstOrDefaultAsync(t => 
                (t.TableId == order.TableId.Value || (table != null && (t.TableNumber == table.Name || t.TableName == table.Name))) && t.DeletedAt == null);
            if (restTbl != null)
            {
                restTbl.Status = "available";
                restTbl.OccupiedChairs = 0;
                restTbl.UpdatedAt = DateTime.UtcNow;
            }
        }

        await _context.SaveChangesAsync();

        long invoiceId = await EnsureInvoiceCreatedAsync(
            order,
            request?.PaymentMethod ?? order.PaymentMethod ?? "Cash",
            request?.InvoiceNumber);

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

        return Ok(new
        {
            totalCount,

            page,

            pageSize,

            totalPages =
                (int)Math.Ceiling(
                    totalCount /
                    (double)pageSize),

            orders =
                orders.Select(MapToOrderDto)
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
    // RECALCULATE TOTALS
    // ============================================================

    private static void RecalculateTotals(Order order)
    {
        order.Subtotal =
            order.Items.Sum(i =>
                i.Price * i.Quantity);

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

            PaymentMethod =
                order.PaymentMethod,

            OrderType =
                order.OrderType,

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

            Items =
                order.Items
                    .Select(MapToOrderItemDto)
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
            Id =
                item.Id,

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

            long invoiceId = await _spService.ExecuteScalarAsync<long>("sp_CreateInvoice", createParams);

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
            }

            return invoiceId;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to create invoice for settled order {OrderId}", order.Id);
            return 0;
        }
    }
}

public class UpdateServiceChargeRequestDto
{
    public decimal? ServiceChargePercent { get; set; }
    public bool? ServiceCharge { get; set; }
}