namespace HMS.Controllers;

using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using HMS.Data;
using HMS.DTOs;
using HMS.Hubs;
using HMS.Models;

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
                try
                {
                    var resolvedMenuId = await _spService.ExecuteSqlScalarAsync<long?>(
                        "SELECT menu_item_id FROM menu_items WHERE dish_name = @dname LIMIT 1;",
                        new Dictionary<string, object?> { { "dname", itemInput.Name.Trim() } });
                    if (resolvedMenuId.HasValue && resolvedMenuId.Value > 0)
                    {
                        menuItemId = resolvedMenuId.Value;
                    }
                }
                catch { }
            }
            if (menuItemId <= 0)
            {
                menuItemId = 1;
            }

            var existingItem = order.Items.FirstOrDefault(i =>
                i.MenuItemId == menuItemId &&
                i.VariantId == itemInput.VariantId &&
                (i.KotStatus == "Queued" ||
                 i.KotStatus == "queued") &&
                (i.KotId == null || i.KotId == 0));

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
            await EnsureInvoiceCreatedAsync(order, order.PaymentMethod ?? "Cash");
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
                i.MenuItemId == itemInput.MenuItemId &&
                i.VariantId == itemInput.VariantId);

            if (existing == null)
            {
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
    [HttpDelete("/api/v1/orders/{id}")]
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
    [HttpPost("/api/v1/orders/{id}/cancel")]
    public async Task<IActionResult> CancelOrder(long id)
    {
        return await DeleteOrder(id);
    }


    // ============================================================
    // SEND KOT
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

        var queuedItems = order.Items
            .Where(i =>
                (i.KotId == null || i.KotId == 0) &&
                (i.KotStatus == "Queued" ||
                 i.KotStatus == "queued"))
            .ToList();

        if (!queuedItems.Any())
        {
            return BadRequest(new
            {
                message = "No new queued items to send to kitchen."
            });
        }

        // ========================================================
        // GET MAIN KITCHEN
        // ========================================================

        var station = await _context.KitchenStations
            .FirstOrDefaultAsync(s =>
                s.StationId == 1 &&
                s.IsActive &&
                !s.IsDeleted);

        if (station == null)
        {
            return BadRequest(new
            {
                message =
                    "Main Kitchen station was not found."
            });
        }

        // ========================================================
        // NEXT BATCH
        // ========================================================

        int nextBatch =
            await _context.KitchenOrderTickets
                .Where(k =>
                    k.OrderId == order.Id &&
                    k.IsActive &&
                    !k.IsDeleted)
                .Select(k => (int?)k.BatchNumber)
                .MaxAsync() ?? 0;

        nextBatch++;

        // ========================================================
        // CREATE KOT
        // ========================================================

        string kotNumber =
            $"KOT-{DateTime.UtcNow:yyyyMMddHHmmssfff}";

        var kot = new KitchenOrderTicket
        {
            KotNumber = kotNumber,

            OrderId = order.Id,

            StationId = station.StationId,

            BatchNumber = nextBatch,

            Status = "Queued",

            IsActive = true,

            IsDeleted = false,

            CreatedAt = DateTime.UtcNow
        };

        _context.KitchenOrderTickets.Add(kot);

        // Save KOT first so MySQL generates kot_id.
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

        // ========================================================
        // NOW INSERT ORDER ITEMS WITH KOT ID
        // ========================================================

        foreach (var item in queuedItems)
        {
            item.KotId = kot.Id;

            item.KotBatch = nextBatch;

            item.KotStatus = "Queued";

            item.UpdatedAt = DateTime.UtcNow;

            // If this is a newly created item it is currently
            // tracked as Added.
            //
            // Existing items already have an ID and are updated.
            item.OrderId = order.Id;
        }

        await _context.SaveChangesAsync();

        // ========================================================
        // DISPLAY FIELDS
        // ========================================================

        await PopulateDisplayFields(order);

        RecalculateTotals(order);

        // ========================================================
        // KOT SIGNALR DATA
        // ========================================================

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

            stationId = station.StationId,

            stationName = station.StationName,

            kotBatch = nextBatch,

            status = kot.Status,

            orderTime = order.CreatedAt,

            items = queuedItems
                .Select(MapToOrderItemDto)
                .ToList()
        };

        // ========================================================
        // SEND TO KITCHEN
        // ========================================================

        await _hubContext.Clients
            .Group("kitchen")
            .SendAsync(
                "ReceiveNewKOT",
                kotData);

        // ========================================================
        // UPDATE FLOOR
        // ========================================================

        if (order.TableId.HasValue)
        {
            var table = await _context.DiningTables
                .FirstOrDefaultAsync(t =>
                    t.Id == order.TableId.Value);

            if (table != null)
            {
                var activeKotCount =
                    order.Items.Count(i =>
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

                            activeKOTCount =
                                activeKotCount,

                            orderTotal =
                                order.GrandTotal
                        });
            }
        }

        return Ok(new
        {
            message =
                "KOT sent to kitchen successfully.",

            kotId = kot.Id,

            kotNumber = kot.KotNumber,

            kotData
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
        string? invoiceNumber)
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