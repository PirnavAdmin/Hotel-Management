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

    [Tags("Takeaway", "Orders")]
    [HttpGet("takeaway")]
    public async Task<IActionResult> GetUndispatchedTakeawayOrders()
    {
        var orders = await _context.Orders
            .Include(o => o.Items)
            .Where(o => o.IsActive && !o.IsDeleted && o.OrderType == "Takeaway" && o.Status == "Settled" &&
                o.Items.Any(i => i.IsActive && !i.IsDeleted &&
                    i.KotStatus != "Served" && i.KotStatus != "served" &&
                    i.KotStatus != "Completed" && i.KotStatus != "completed"))
            .OrderByDescending(o => o.CreatedAt)
            .ToListAsync();

        foreach (var order in orders)
        {
            await PopulateDisplayFields(order);
            RecalculateTotals(order);
        }

        return Ok(orders.Select(MapToOrderDto));
    }

    [Tags("Takeaway", "Orders")]
    [HttpPost("{id:long}/dispatch")]
    public async Task<IActionResult> DispatchTakeawayOrder(long id)
    {
        var order = await _context.Orders.Include(o => o.Items)
            .FirstOrDefaultAsync(o => o.Id == id && o.IsActive && !o.IsDeleted && o.OrderType == "Takeaway" && o.Status == "Settled");
        if (order == null) return NotFound(new { success = false, message = "Takeaway order not found." });

        var kitchenItems = order.Items.Where(i => i.IsActive && !i.IsDeleted).ToList();
        if (kitchenItems.Count == 0 || kitchenItems.Any(i =>
            i.KotStatus != "Ready" && i.KotStatus != "ready" &&
            i.KotStatus != "Served" && i.KotStatus != "served" &&
            i.KotStatus != "Completed" && i.KotStatus != "completed"))
        {
            return Conflict(new { success = false, message = "The kitchen must mark every item ready before dispatch." });
        }

        foreach (var item in kitchenItems)
        {
            item.KotStatus = "Served";
            item.UpdatedAt = DateTime.UtcNow;
        }
        order.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        return Ok(new { success = true, message = "Takeaway order dispatched.", orderId = order.Id });
    }

    // ============================================================
    // GET ORDER BY ID
    // ============================================================

    [Tags("Takeaway", "Orders")]
    [HttpGet("{id:long}")]
    public async Task<IActionResult> GetOrderById(long id)
    {
        var order = await _context.Orders
            .Include(o => o.Items)
            .FirstOrDefaultAsync(o => o.Id == id && !o.IsDeleted);

        if (order == null)
        {
            return NotFound(new { success = false, message = $"Order #{id} not found." });
        }

        RecalculateTotals(order);
        return Ok(MapToOrderDto(order));
    }
    [HttpGet("active")]
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

        return Ok(orders.Select(MapToOrderDto));
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
    [Tags("Takeaway", "Orders")]
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

        var isTakeaway = string.Equals(request.OrderType, "Takeaway", StringComparison.OrdinalIgnoreCase);
        if (isTakeaway && string.IsNullOrWhiteSpace(request.PaymentMethod))
        {
            return BadRequest(new { success = false, message = "Takeaway orders must be paid before sending to the kitchen." });
        }
        if (isTakeaway && !string.Equals(request.Status, "Settled", StringComparison.OrdinalIgnoreCase))
        {
            return BadRequest(new { success = false, message = "Takeaway orders must be marked paid before sending to the kitchen." });
        }

        long resolvedTableId = isTakeaway ? 0 : request.TableId ?? 0;
        if (!isTakeaway && resolvedTableId <= 0 && (!string.IsNullOrWhiteSpace(request.TableName) || !string.IsNullOrWhiteSpace(request.TableNumber)))
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

        _logger.LogInformation("[Orders] CreateOrAddToOrder processing Order #{OrderId} (Table: {TableId}). Total incoming items: {Count}",
            order.Id, order.TableId, request.Items.Count);

        foreach (var itemInput in request.Items)
        {
            if (itemInput.Quantity <= 0)
            {
                continue;
            }

            long menuItemId = await OrderItemRouting.ResolveMenuItemIdAsync(
                _context,
                itemInput.MenuItemId,
                itemInput.Name,
                itemInput.IsBarItem);

            bool isBar = OrderItemRouting.IsBarItem(itemInput.Name, itemInput.Category, itemInput.DrinkType, itemInput.IsBarItem ?? false);
            _logger.LogInformation("[Orders] Item classified: '{ItemName}' (InputId: {InputId}, Qty: {Qty}) -> ResolvedMenuItemId: {MenuItemId}, Category: {Category}",
                itemInput.Name, itemInput.MenuItemId, itemInput.Quantity, menuItemId, isBar ? "BAR" : "FOOD");

            var existingItem = order.Items.FirstOrDefault(i =>
                i.MenuItemId == menuItemId &&
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

                    BotId = null,

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
            await EnsureInvoiceCreatedAsync(order, order.PaymentMethod ?? "Cash", request.InvoiceNumber);
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
    // ADD ORDER ITEMS (POST)
    // ============================================================

    [HttpPost("{id}/items")]
    public async Task<IActionResult> AddOrderItems(
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
                success = false,
                message = "Order not found."
            });
        }

        if (request?.Items == null || !request.Items.Any())
        {
            return BadRequest(new
            {
                success = false,
                message = "Items are required."
            });
        }

        _logger.LogInformation("[Orders] AddOrderItems processing Order #{OrderId}. Items to add: {Count}", order.Id, request.Items.Count);

        foreach (var itemInput in request.Items)
        {
            if (itemInput.Quantity <= 0)
            {
                continue;
            }

            long menuItemId = await OrderItemRouting.ResolveMenuItemIdAsync(
                _context,
                itemInput.MenuItemId,
                itemInput.Name,
                itemInput.IsBarItem);

            decimal price = itemInput.Price;
            if (price <= 0)
            {
                var mi = await _context.MenuItems.FirstOrDefaultAsync(m => m.MenuItemId == menuItemId);
                if (mi != null) price = mi.Price;
            }

            var existing = order.Items.FirstOrDefault(i =>
                i.MenuItemId == menuItemId &&
                i.VariantId == itemInput.VariantId &&
                (i.KotStatus == "Queued" || i.KotStatus == "queued") &&
                (i.KotId == null || i.KotId == 0) &&
                (i.BotId == null || i.BotId == 0));

            if (existing != null)
            {
                existing.Quantity += itemInput.Quantity;
                existing.TotalPrice = existing.Price * existing.Quantity;
                if (!string.IsNullOrWhiteSpace(itemInput.Notes))
                {
                    existing.Notes = itemInput.Notes;
                }
                existing.UpdatedAt = DateTime.UtcNow;
                _logger.LogInformation("[Orders] Incremented existing queued item '{Name}' on Order #{OrderId} to Qty={Qty}",
                    existing.Name, order.Id, existing.Quantity);
            }
            else
            {
                var newItem = new OrderItem
                {
                    OrderId = order.Id,
                    MenuItemId = menuItemId,
                    VariantId = itemInput.VariantId,
                    Name = itemInput.Name,
                    Price = price,
                    Quantity = itemInput.Quantity,
                    TotalPrice = price * itemInput.Quantity,
                    Notes = itemInput.Notes,
                    KotStatus = "Queued",
                    KotBatch = 1,
                    KotId = null,
                    BotId = null,
                    IsActive = true,
                    IsDeleted = false,
                    CreatedAt = DateTime.UtcNow
                };

                order.Items.Add(newItem);
                _logger.LogInformation("[Orders] Added new queued item '{Name}' (MenuItemId: {MenuItemId}, Price: {Price}, Qty: {Qty}) to Order #{OrderId}",
                    itemInput.Name, menuItemId, price, itemInput.Quantity, order.Id);
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
                    items = order.Items.Select(MapToOrderItemDto).ToList(),
                    grandTotal = order.GrandTotal
                });

        return Ok(new
        {
            success = true,
            orderId = order.Id,
            items = order.Items.Select(MapToOrderItemDto).ToList(),
            grandTotal = order.GrandTotal,
            order = MapToOrderDto(order)
        });
    }

    // ============================================================
    // UPDATE ORDER ITEMS (PUT)
    // ============================================================

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
                success = false,
                message = "Order not found."
            });
        }

        if (request?.Items == null)
        {
            return BadRequest(new
            {
                success = false,
                message = "Items are required."
            });
        }

        foreach (var itemInput in request.Items)
        {
            long menuItemId = await OrderItemRouting.ResolveMenuItemIdAsync(
                _context,
                itemInput.MenuItemId,
                itemInput.Name,
                itemInput.IsBarItem);

            var existing = order.Items.FirstOrDefault(i =>
                (i.MenuItemId == itemInput.MenuItemId || i.MenuItemId == menuItemId) &&
                i.VariantId == itemInput.VariantId);

            if (existing == null)
            {
                if (itemInput.Quantity > 0)
                {
                    decimal price = itemInput.Price;
                    if (price <= 0)
                    {
                        var mi = await _context.MenuItems.FirstOrDefaultAsync(m => m.MenuItemId == menuItemId);
                        if (mi != null) price = mi.Price;
                    }

                    var newItem = new OrderItem
                    {
                        OrderId = order.Id,
                        MenuItemId = menuItemId,
                        VariantId = itemInput.VariantId,
                        Name = itemInput.Name,
                        Price = price,
                        Quantity = itemInput.Quantity,
                        TotalPrice = price * itemInput.Quantity,
                        Notes = itemInput.Notes,
                        KotStatus = "Queued",
                        KotBatch = 1,
                        KotId = null,
                        BotId = null,
                        IsActive = true,
                        IsDeleted = false,
                        CreatedAt = DateTime.UtcNow
                    };
                    order.Items.Add(newItem);
                    _logger.LogInformation("[Orders] Added item in UpdateOrderItems '{Name}' (MenuItemId: {MenuItemId}, Price: {Price}, Qty: {Qty}) to Order #{OrderId}",
                        itemInput.Name, menuItemId, price, itemInput.Quantity, order.Id);
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
                existing.TotalPrice = existing.Price * existing.Quantity;
                existing.Notes = itemInput.Notes;
                existing.UpdatedAt = DateTime.UtcNow;
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
                    items = order.Items.Select(MapToOrderItemDto).ToList(),
                    grandTotal = order.GrandTotal
                });

        return Ok(new
        {
            success = true,
            orderId = order.Id,
            items = order.Items.Select(MapToOrderItemDto).ToList(),
            grandTotal = order.GrandTotal,
            order = MapToOrderDto(order)
        });
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

    [Tags("Takeaway", "Orders")]
    [HttpPost("{id}/cancel")]
    public async Task<IActionResult> CancelOrder(long id)
    {
        return await DeleteOrder(id);
    }


    // ============================================================
    // SEND KOT
    // ============================================================

    [HttpPost("{id}/send-kot")]
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

        var queuedItems = order.Items
            .Where(i =>
                i.IsActive && !i.IsDeleted &&
                (i.KotStatus == "Queued" || i.KotStatus == "queued") &&
                (i.KotId == null || i.KotId == 0) &&
                (i.BotId == null || i.BotId == 0))
            .ToList();

        if (!queuedItems.Any())
        {
            return BadRequest(new
            {
                message = "No new queued items to send to kitchen or bar."
            });
        }

        _logger.LogInformation("[KOT/BOT Dispatch] Received SendKot for Order #{OrderId}. Total queued items: {QueuedCount}",
            order.Id, queuedItems.Count);

        var barItemIds = await OrderItemRouting.GetBarMenuItemIdsAsync(
            _context,
            queuedItems.Select(item => item.MenuItemId));

        var barItems = queuedItems
            .Where(item => barItemIds.Contains(item.MenuItemId) || OrderItemRouting.IsBarItem(item.Name))
            .ToList();

        var kitchenItems = queuedItems
            .Where(item => !barItemIds.Contains(item.MenuItemId) && !OrderItemRouting.IsBarItem(item.Name))
            .ToList();

        _logger.LogInformation("[KOT/BOT Dispatch] Classification for Order #{OrderId}: Kitchen items = {KitchenCount}, Bar items = {BarCount}",
            order.Id, kitchenItems.Count, barItems.Count);

        foreach (var item in kitchenItems)
        {
            _logger.LogInformation("[KOT/BOT Dispatch] -> Kitchen Item: '{Name}' (MenuItemId: {MenuItemId}, Qty: {Qty})",
                item.Name, item.MenuItemId, item.Quantity);
        }

        foreach (var item in barItems)
        {
            _logger.LogInformation("[KOT/BOT Dispatch] -> Bar Item: '{Name}' (MenuItemId: {MenuItemId}, Qty: {Qty})",
                item.Name, item.MenuItemId, item.Quantity);
        }

        // ========================================================
        // 1. DISPATCH KITCHEN ITEMS (KOT)
        // ========================================================
        KitchenOrderTicket? kot = null;
        object? kotData = null;
        int nextKitchenBatch = 1;

        if (kitchenItems.Any())
        {
            var station = await _context.KitchenStations
                .FirstOrDefaultAsync(s =>
                    s.StationId == 1 &&
                    s.IsActive &&
                    !s.IsDeleted);

            if (station == null)
            {
                station = await _context.KitchenStations
                    .FirstOrDefaultAsync(s => s.IsActive && !s.IsDeleted);
            }

            nextKitchenBatch = await _context.KitchenOrderTickets
                .Where(k =>
                    k.OrderId == order.Id &&
                    k.IsActive &&
                    !k.IsDeleted)
                .Select(k => (int?)k.BatchNumber)
                .MaxAsync() ?? 0;

            nextKitchenBatch++;

            string kotNumber = $"KOT-{DateTime.UtcNow:yyyyMMddHHmmssfff}";

            kot = new KitchenOrderTicket
            {
                KotNumber = kotNumber,
                OrderId = order.Id,
                StationId = station?.StationId ?? 1,
                BatchNumber = nextKitchenBatch,
                Status = "Queued",
                IsActive = true,
                IsDeleted = false,
                CreatedAt = DateTime.UtcNow
            };

            _context.KitchenOrderTickets.Add(kot);
            await _context.SaveChangesAsync();
            _logger.LogInformation("[KOT/BOT Dispatch] Kitchen KOT created: KotId={KotId}, KotNumber={KotNumber}, Batch={Batch}",
                kot.Id, kot.KotNumber, nextKitchenBatch);

            try
            {
                var rawSql = "INSERT INTO kitchen_orders (kot_number, order_id, branch_id, batch_number, status, priority, special_notes, created_at) " +
                             "VALUES ({0}, {1}, 1, {2}, 'queued', 'normal', {3}, NOW()) " +
                             "ON DUPLICATE KEY UPDATE status = 'queued'";
                var note = $"Table: {order.TableName ?? ("Table " + order.TableId)} ({order.Section ?? "Main Hall"})";
                await _context.Database.ExecuteSqlRawAsync(rawSql, kot.KotNumber, order.Id, nextKitchenBatch, note);
            }
            catch { }

            foreach (var item in kitchenItems)
            {
                item.KotId = kot.Id;
                item.KotBatch = nextKitchenBatch;
                item.KotStatus = "Queued";
                item.UpdatedAt = DateTime.UtcNow;
                item.OrderId = order.Id;
            }
        }

        // ========================================================
        // 2. DISPATCH BAR ITEMS (BOT)
        // ========================================================
        long? botId = null;
        string? botNumber = null;
        object? botData = null;
        int nextBarBatch = 1;

        if (barItems.Any())
        {
            try
            {
                var maxBatch = await _spService.ExecuteSqlScalarAsync<int?>(
                    "SELECT MAX(batch_number) FROM bar_order_tickets WHERE order_id = @oid;",
                    new Dictionary<string, object?> { { "@oid", order.Id } });
                nextBarBatch = (maxBatch ?? 0) + 1;
            }
            catch
            {
                nextBarBatch = 1;
            }

            botNumber = $"BOT-{DateTime.UtcNow:yyyyMMddHHmmssfff}";
            var note = $"Table: {order.TableName ?? ("Table " + order.TableId)} ({order.Section ?? "Main Hall"})";

            const string insertBotSql = @"
                INSERT INTO bar_order_tickets (bot_number, order_id, bar_counter_id, batch_number, status, priority, special_notes, created_at)
                VALUES (@bot_number, @order_id, 1, @batch_number, 'queued', 'normal', @special_notes, NOW());
                SELECT LAST_INSERT_ID();";

            var generatedBotId = await _spService.ExecuteSqlScalarAsync<ulong?>(
                insertBotSql,
                new Dictionary<string, object?>
                {
                    { "@bot_number", botNumber },
                    { "@order_id", order.Id },
                    { "@batch_number", nextBarBatch },
                    { "@special_notes", note }
                });

            if (generatedBotId.HasValue && generatedBotId.Value > 0)
            {
                botId = (long)generatedBotId.Value;
            }
            else
            {
                var lookupId = await _spService.ExecuteSqlScalarAsync<long?>(
                    "SELECT bot_id FROM bar_order_tickets WHERE bot_number = @bnum LIMIT 1;",
                    new Dictionary<string, object?> { { "@bnum", botNumber } });
                botId = lookupId ?? order.Id;
            }

            foreach (var item in barItems)
            {
                item.BotId = botId;
                item.KotBatch = nextBarBatch;
                item.KotStatus = "Queued";
                item.UpdatedAt = DateTime.UtcNow;
                item.OrderId = order.Id;
            }
            _logger.LogInformation("[KOT/BOT Dispatch] Bar BOT created: BotId={BotId}, BotNumber={BotNumber}, Batch={Batch}",
                botId, botNumber, nextBarBatch);
        }

        await _context.SaveChangesAsync();
        _logger.LogInformation("[KOT/BOT Dispatch] Order #{OrderId} KOT/BOT successfully dispatched and saved to database.", order.Id);

        if (barItems.Any() && botId.HasValue)
        {
            var barItemDbIds = barItems.Select(b => b.Id).Where(id => id > 0).ToList();
            if (barItemDbIds.Any())
            {
                try
                {
                    var inClause = string.Join(",", barItemDbIds);
                    await _spService.ExecuteSqlNonQueryAsync(
                        $"UPDATE order_items SET bot_id = {botId.Value} WHERE order_item_id IN ({inClause});");
                }
                catch { }
            }
        }

        // ========================================================
        // 3. DISPLAY FIELDS & RECALCULATE
        // ========================================================
        await PopulateDisplayFields(order);
        RecalculateTotals(order);

        // ========================================================
        // 4. SIGNALR BROADCASTING
        // ========================================================
        if (kot != null)
        {
            kotData = new
            {
                kotId = kot.Id,
                kotNumber = kot.KotNumber,
                orderId = order.Id,
                orderNumber = order.OrderNumber,
                tableId = order.TableId,
                tableName = order.TableName,
                section = order.Section,
                serverName = order.ServerName,
                stationId = kot.StationId,
                stationName = "Main Kitchen",
                kotBatch = nextKitchenBatch,
                status = kot.Status,
                orderTime = order.CreatedAt,
                items = kitchenItems.Select(MapToOrderItemDto).ToList()
            };

            try
            {
                await _hubContext.Clients
                    .Group("kitchen")
                    .SendAsync("ReceiveNewKOT", kotData);
            }
            catch { }
        }

        if (botId.HasValue)
        {
            botData = new
            {
                kotId = botId.Value,
                kotNumber = botNumber,
                botId = botId.Value,
                botNumber = botNumber,
                orderId = order.Id,
                orderNumber = order.OrderNumber,
                tableId = order.TableId,
                tableNumber = order.TableName,
                tableName = order.TableName,
                area = order.Section,
                section = order.Section,
                serverName = order.ServerName,
                botBatch = nextBarBatch,
                status = "queued",
                priority = "normal",
                orderTime = order.CreatedAt,
                items = barItems.Select(MapToOrderItemDto).ToList()
            };

            try
            {
                await _hubContext.Clients.Group("bar").SendAsync("ReceiveNewBOT", botData);
                await _hubContext.Clients.All.SendAsync("ReceiveBarKotUpdated", botData);
            }
            catch { }
        }

        if (order.TableId.HasValue)
        {
            var table = await _context.DiningTables
                .FirstOrDefaultAsync(t => t.Id == order.TableId.Value);

            if (table != null)
            {
                var activeKotCount = order.Items.Count(i =>
                    i.KotStatus == "Queued" ||
                    i.KotStatus == "queued" ||
                    i.KotStatus == "Cooking" ||
                    i.KotStatus == "cooking");

                await _hubContext.Clients
                    .All
                    .SendAsync(
                        "TableStatusUpdated",
                        new
                        {
                            tableId = table.Id,
                            status = table.Status,
                            activeKOTCount = activeKotCount,
                            orderTotal = order.GrandTotal
                        });
            }
        }
        else if (string.Equals(order.OrderType, "Takeaway", StringComparison.OrdinalIgnoreCase))
        {
            order.TableName = "Takeaway";
            order.Section = "Takeaway";
        }

        string responseMessage = (kot != null && botId.HasValue)
            ? "Order items separated and routed: KOT sent to kitchen and BOT sent to bar."
            : (kot != null ? "KOT sent to kitchen successfully." : "BOT sent to bar successfully.");

        return Ok(new
        {
            message = responseMessage,
            kotId = kot?.Id,
            kotNumber = kot?.KotNumber,
            botId = botId,
            botNumber = botNumber,
            kitchenItemsCount = kitchenItems.Count,
            barItemsCount = barItems.Count,
            kotData = kotData,
            botData = botData
        });
    }


    // ============================================================
    // SETTLE ORDER
    // ============================================================

    [Tags("Takeaway", "Orders")]
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

        await EnsureInvoiceCreatedAsync(
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

        return Ok(MapToOrderDto(order));
    }


    // ============================================================
    // ORDER HISTORY
    // ============================================================

    [Tags("Takeaway", "Orders")]
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

    [Tags("Takeaway", "Orders")]
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
    }


    // ============================================================
    // RECALCULATE TOTALS
    // ============================================================

    private static void RecalculateTotals(Order order)
    {
        order.Subtotal =
            Math.Round(
                order.Items.Sum(i =>
                    i.Price * i.Quantity),
                2,
                MidpointRounding.AwayFromZero);

        order.DiscountAmount =
            Math.Round(
                order.Subtotal *
                (order.DiscountPercent / 100m),
                2,
                MidpointRounding.AwayFromZero);

        var netSubtotal =
            Math.Max(
                0,
                order.Subtotal -
                order.DiscountAmount);

        order.TaxAmount =
            Math.Round(
                netSubtotal *
                (order.TaxPercent / 100m),
                2,
                MidpointRounding.AwayFromZero);

        order.ServiceChargeAmount =
            Math.Round(
                netSubtotal *
                (order.ServiceChargePercent / 100m),
                2,
                MidpointRounding.AwayFromZero);

        order.GrandTotal =
            Math.Round(
                netSubtotal +
                order.TaxAmount +
                order.ServiceChargeAmount +
                Math.Round(order.TipAmount, 2, MidpointRounding.AwayFromZero),
                2,
                MidpointRounding.AwayFromZero);
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

            InvoiceNo =
                order.InvoiceNo,

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
        return new OrderItemDto
        {
            Id =
                item.Id,

            KotId = item.KotId,

            BotId = item.BotId,

            IsBarItem = (item.BotId.HasValue && item.BotId.Value > 0) || OrderItemRouting.IsBarItem(item.Name),

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
                item.KotBatch
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

    [Tags("Takeaway", "Orders")]
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
            var mode = string.IsNullOrWhiteSpace(paymentMethod) ? "CASH" : paymentMethod.ToUpper();
            var pMethod = mode.ToLower() switch
            {
                "cash" => "cash",
                "card" => "card",
                "upi" => "upi",
                "wallet" => "wallet",
                "netbanking" or "net_banking" => "netbanking",
                _ => "cash"
            };

            var existingInvoice = await _context.Invoices
                .Include(i => i.Payments)
                .Where(i => i.OrderId == order.Id)
                .OrderByDescending(i => i.CreatedAt)
                .FirstOrDefaultAsync();

            if (existingInvoice != null)
            {
                existingInvoice.Subtotal = subtotal;
                existingInvoice.TaxableAmount = taxable;
                existingInvoice.TaxAmount = taxAmount;
                existingInvoice.DiscountAmount = discount;
                existingInvoice.TotalAmount = totalAmount;
                existingInvoice.PaidAmount = totalAmount;
                existingInvoice.AmountPaid = totalAmount;
                existingInvoice.Status = "PAID";
                existingInvoice.UpdatedAt = DateTime.UtcNow;

                var payment = new InvoicePayment
                {
                    InvoiceId = existingInvoice.InvoiceId,
                    Amount = totalAmount,
                    AmountPaid = totalAmount,
                    PaymentMode = mode,
                    PaymentMethod = pMethod,
                    TransactionReference = $"TXN-ORD-{order.Id}-{DateTime.UtcNow:HHmmss}",
                    TxnReference = $"TXN-ORD-{order.Id}-{DateTime.UtcNow:HHmmss}",
                    PaymentStatus = "success",
                    PaidAt = DateTime.UtcNow
                };

                _context.InvoicePayments.Add(payment);
                await _context.SaveChangesAsync();
                return existingInvoice.InvoiceId;
            }

            var invoice = new Invoice
            {
                OrderId = order.Id,
                InvoiceNumber = persistedInvoiceNumber,
                Subtotal = subtotal,
                TaxableAmount = taxable,
                TaxAmount = taxAmount,
                DiscountAmount = discount,
                TotalAmount = totalAmount,
                PaidAmount = totalAmount,
                AmountPaid = totalAmount,
                Status = "PAID",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            var newPayment = new InvoicePayment
            {
                Amount = totalAmount,
                AmountPaid = totalAmount,
                PaymentMode = mode,
                PaymentMethod = pMethod,
                TransactionReference = $"TXN-ORD-{order.Id}-{DateTime.UtcNow:HHmmss}",
                TxnReference = $"TXN-ORD-{order.Id}-{DateTime.UtcNow:HHmmss}",
                PaymentStatus = "success",
                PaidAt = DateTime.UtcNow
            };

            invoice.Payments.Add(newPayment);

            _context.Invoices.Add(invoice);
            await _context.SaveChangesAsync();
            return invoice.InvoiceId;
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
