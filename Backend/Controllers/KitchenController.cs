namespace HMS.Controllers;

using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using HMS.Data;
using HMS.DTOs;
using HMS.Hubs;
using HMS.Services;

[ApiController]
[Route("api/v1/kitchen")]
public class KitchenController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly IHubContext<PosHub> _hubContext;

    public KitchenController(
        AppDbContext context,
        IHubContext<PosHub> hubContext)
    {
        _context = context;
        _hubContext = hubContext;
    }

    [HttpGet("active-tickets")]
    public async Task<IActionResult> GetActiveTickets()
    {
        var orders = await _context.Orders
            .Include(o => o.Items)
            .Where(o =>
                o.IsActive &&
                !o.IsDeleted &&
                o.Status != "Cancelled" && o.Status != "cancelled" &&
                (o.FulfillmentStatus == null || (o.FulfillmentStatus != "Cancelled" && o.FulfillmentStatus != "cancelled")) &&
                (o.Status == "Active" ||
                 o.Status == "active" ||
                 o.Status == "Billed" ||
                 o.Status == "billed" ||
                 (o.OrderType == "Takeaway" && o.Status == "Settled" &&
                  o.Items.Any(i => i.IsActive && !i.IsDeleted && i.KotId.HasValue && i.KotId.Value > 0 &&
                                   (i.KotStatus == "Queued" || i.KotStatus == "queued" ||
                                   i.KotStatus == "Cooking" || i.KotStatus == "cooking" ||
                                   i.KotStatus == "Ready" || i.KotStatus == "ready")))) &&
                o.Items.Any(i =>
                    i.IsActive &&
                    !i.IsDeleted &&
                    i.KotId.HasValue &&
                    i.KotId.Value > 0 &&
                    (i.KotStatus == "Queued" ||
                     i.KotStatus == "queued" ||
                     i.KotStatus == "Cooking" ||
                     i.KotStatus == "cooking" ||
                     i.KotStatus == "Ready" ||
                     i.KotStatus == "ready")))
            .ToListAsync();

        var barMenuItemIds = await OrderItemRouting.GetBarMenuItemIdsAsync(
            _context,
            orders.SelectMany(order => order.Items).Select(item => item.MenuItemId));
        var kotIds = orders
            .SelectMany(order => order.Items)
            .Where(item => item.KotId.HasValue && item.KotId.Value > 0)
            .Select(item => item.KotId!.Value)
            .Distinct()
            .ToList();
        var kotCreatedAt = await _context.KitchenOrderTickets
            .AsNoTracking()
            .Where(ticket => kotIds.Contains(ticket.Id) && ticket.IsActive && !ticket.IsDeleted)
            .ToDictionaryAsync(ticket => ticket.Id, ticket => ticket.CreatedAt);
        var tickets = new List<KotTicketDto>();

        foreach (var order in orders)
        {
            var (kitchenItems, _) = await OrderItemRouting.ClassifyOrderItemsAsync(_context, order.Items);
            var batches = kitchenItems
                .Where(i =>
                    i.IsActive && !i.IsDeleted &&
                    !string.Equals(i.KotStatus, "Cancelled", StringComparison.OrdinalIgnoreCase) &&
                    !barMenuItemIds.Contains(i.MenuItemId) &&
                    (i.BotId == null || i.BotId == 0) &&
                    !OrderItemRouting.IsBarItem(i.Name) &&
                    (i.KotStatus == "Queued" ||
                     i.KotStatus == "queued" ||
                     i.KotStatus == "Cooking" ||
                     i.KotStatus == "cooking" ||
                     i.KotStatus == "Ready" ||
                     i.KotStatus == "ready"))
                .GroupBy(i => i.KotBatch);

            foreach (var batch in batches)
            {
                var batchItems = batch.ToList();
                var batchKotId = batchItems.First().KotId;
                var orderTime = batchItems.Min(item => item.CreatedAt);
                if (batchKotId.HasValue && kotCreatedAt.TryGetValue(batchKotId.Value, out var createdAt))
                {
                    orderTime = createdAt;
                }

                string overallStatus = "ready";

                if (batchItems.Any(i =>
                    i.KotStatus == "Queued" ||
                    i.KotStatus == "queued"))
                {
                    overallStatus = "queued";
                }
                else if (batchItems.Any(i =>
                    i.KotStatus == "Cooking" ||
                    i.KotStatus == "cooking"))
                {
                    overallStatus = "cooking";
                }

                tickets.Add(new KotTicketDto
                {
                    TicketId = order.Id,

                    OrderId = order.Id,

                    OrderType = order.OrderType,

                    TableId = order.TableId ?? 0,

                    TableName = order.OrderType == "Takeaway" ? "Takeaway" : order.TableName,

                    Section = order.OrderType == "Takeaway" ? "Takeaway" : order.Section,

                    ServerName = order.ServerName,

                    KotBatch = batch.Key,

                    OrderTime = DateTime.SpecifyKind(orderTime, DateTimeKind.Utc),

                    TicketStatus = overallStatus,

                    Items = batchItems
                        .Select(i => new OrderItemDto
                        {
                            Id = i.Id,

                            OrderId = i.OrderId,

                            KotId = i.KotId,

                            BotId = i.BotId,

                            IsBarItem = false,

                            MenuItemId = i.MenuItemId,

                            Name = i.Name,

                            Price = i.Price,

                            Quantity = i.Quantity,

                            Notes = i.Notes,

                            KotStatus = i.KotStatus,

                            KotBatch = i.KotBatch
                        })
                        .ToList()
                });
            }
        }

        return Ok(
            tickets.OrderBy(t => t.OrderTime));
    }


    [HttpPatch("items/{itemId}/status")]
    public async Task<IActionResult> UpdateItemStatus(
        long itemId,
        [FromBody] UpdateItemStatusRequest request)
    {
        if (request == null || string.IsNullOrWhiteSpace(request.Status))
        {
            return BadRequest(new { success = false, message = "Status string is required." });
        }

        var rawStatus = request.Status.Trim();
        string cleanStatus;
        if (rawStatus.Equals("PREPARATION COMPLETED", StringComparison.OrdinalIgnoreCase) || rawStatus.Equals("READY", StringComparison.OrdinalIgnoreCase))
        {
            cleanStatus = "ready";
        }
        else if (rawStatus.Equals("COOKING", StringComparison.OrdinalIgnoreCase) || rawStatus.Equals("IN PREPARATION", StringComparison.OrdinalIgnoreCase) || rawStatus.Equals("IN PREP", StringComparison.OrdinalIgnoreCase))
        {
            cleanStatus = "cooking";
        }
        else
        {
            cleanStatus = rawStatus.ToLowerInvariant();
        }

        if (cleanStatus is not ("queued" or "cooking" or "ready"))
        {
            return BadRequest(new { success = false, message = "Status must be queued, cooking, or ready." });
        }

        try
        {
            var item = await _context.OrderItems
                .Include(i => i.Order)
                .FirstOrDefaultAsync(i =>
                    i.Id == itemId &&
                    i.IsActive &&
                    !i.IsDeleted &&
                    i.KotId.HasValue &&
                    i.KotId.Value > 0 &&
                    (i.BotId == null || i.BotId == 0));

            if (item == null)
            {
                return NotFound(new { success = false, message = "Order item not found." });
            }

            if (item.IsDeleted || !item.IsActive ||
                string.Equals(item.KotStatus, "Cancelled", StringComparison.OrdinalIgnoreCase) ||
                (item.Order != null && (item.Order.IsDeleted || !item.Order.IsActive ||
                 string.Equals(item.Order.Status, "Cancelled", StringComparison.OrdinalIgnoreCase) ||
                 string.Equals(item.Order.FulfillmentStatus, "Cancelled", StringComparison.OrdinalIgnoreCase))))
            {
                return Conflict(new { success = false, message = "Cannot update kitchen item status for a cancelled or deleted order." });
            }
            item.KotStatus = cleanStatus;
            item.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            await TakeawayStatusSyncHelper.SyncTakeawayFromItemsAsync(_context, item.OrderId);

            if (item.Order != null)
            {
                await _hubContext.Clients
                    .Group("floor")
                    .SendAsync(
                        "KitchenStatusAlert",
                        new
                        {
                            type =
                                cleanStatus.Equals(
                                    "ready",
                                    StringComparison.OrdinalIgnoreCase)
                                    ? "cooking_completed"
                                    : "cooking_started",

                            title =
                                $"Item {item.Name} status updated",

                            message =
                                $"{item.Name} for " +
                                $"{item.Order.TableName} " +
                                $"is now {item.KotStatus}.",

                            tableId = item.Order.TableId,
                            tableName = item.Order.TableName,
                            itemId = item.Id,
                            kotStatus = item.KotStatus
                        });
            }

            return Ok(new { success = true, message = "Item status updated successfully.", data = item });
        }
        catch (Exception ex)
        {
            var innerMsg = ex.InnerException != null ? ex.InnerException.Message : ex.Message;
            return StatusCode(500, new { success = false, message = "An error occurred while updating item status: " + innerMsg });
        }
    }


    [HttpPost("tickets/{ticketId}/start-cooking")]
    public async Task<IActionResult> StartCooking(
        long ticketId,
        [FromQuery] int batch = 1)
    {
        var order = await _context.Orders
            .Include(o => o.Items)
            .FirstOrDefaultAsync(o => o.Id == ticketId);

        if (order == null)
        {
            return NotFound(new
            {
                message = "Order/Ticket not found."
            });
        }

        if (order.IsDeleted || !order.IsActive ||
            string.Equals(order.Status, "Cancelled", StringComparison.OrdinalIgnoreCase) ||
            string.Equals(order.FulfillmentStatus, "Cancelled", StringComparison.OrdinalIgnoreCase))
        {
            return Conflict(new { success = false, message = "Cannot start cooking a cancelled or deleted order." });
        }
        var barMenuItemIds = await OrderItemRouting.GetBarMenuItemIdsAsync(
            _context,
            order.Items.Select(item => item.MenuItemId));

        var (kitchenItems, _) = await OrderItemRouting.ClassifyOrderItemsAsync(_context, order.Items);
        var itemsToUpdate = kitchenItems
            .Where(i =>
                i.IsActive && !i.IsDeleted &&
                !string.Equals(i.KotStatus, "Cancelled", StringComparison.OrdinalIgnoreCase) &&
                (i.KotBatch == batch || batch == 0) &&
                !barMenuItemIds.Contains(i.MenuItemId) &&
                (i.BotId == null || i.BotId == 0) &&
                !OrderItemRouting.IsBarItem(i.Name) &&
                (i.KotStatus == "Queued" ||
                 i.KotStatus == "queued" ||
                 i.KotStatus == "Cooking" ||
                 i.KotStatus == "cooking"))
            .ToList();

        foreach (var item in itemsToUpdate)
        {
            item.KotStatus = "cooking";
            item.UpdatedAt = DateTime.UtcNow;
        }

        var kotTickets = await _context.KitchenOrderTickets
            .Where(k => k.OrderId == order.Id && k.IsActive && !k.IsDeleted && k.Status == "Queued")
            .ToListAsync();
        foreach (var kt in kotTickets)
        {
            kt.Status = "Cooking";
            kt.UpdatedAt = DateTime.UtcNow;
        }

        await _context.SaveChangesAsync();
        await TakeawayStatusSyncHelper.SyncTakeawayFromItemsAsync(_context, order.Id);

        await _hubContext.Clients
            .Group("floor")
            .SendAsync(
                "KitchenStatusAlert",
                new
                {
                    type = "cooking_started",

                    title =
                        $"Cooking Started ({order.TableName})",

                    message =
                        $"Chef has started preparing " +
                        $"order for {order.TableName} " +
                        $"(Batch #{batch}).",

                    tableId = order.TableId,

                    tableName = order.TableName
                });

        return Ok(new
        {
            message =
                "Ticket status updated to cooking."
        });
    }


    [HttpPost("tickets/{ticketId}/complete")]
    public async Task<IActionResult> CompleteTicket(
        long ticketId,
        [FromQuery] int batch = 1)
    {
        var order = await _context.Orders
            .Include(o => o.Items)
            .FirstOrDefaultAsync(o => o.Id == ticketId);

        if (order == null)
        {
            return NotFound(new
            {
                message = "Order/Ticket not found."
            });
        }

        if (order.IsDeleted || !order.IsActive ||
            string.Equals(order.Status, "Cancelled", StringComparison.OrdinalIgnoreCase) ||
            string.Equals(order.FulfillmentStatus, "Cancelled", StringComparison.OrdinalIgnoreCase))
        {
            return Conflict(new { success = false, message = "Cannot complete a cancelled or deleted order." });
        }
        var barMenuItemIds = await OrderItemRouting.GetBarMenuItemIdsAsync(
            _context,
            order.Items.Select(item => item.MenuItemId));

        var (kitchenItems, _) = await OrderItemRouting.ClassifyOrderItemsAsync(_context, order.Items);
        var itemsToUpdate = kitchenItems
            .Where(i =>
                i.IsActive && !i.IsDeleted &&
                !string.Equals(i.KotStatus, "Cancelled", StringComparison.OrdinalIgnoreCase) &&
                (i.KotBatch == batch || batch == 0) &&
                !barMenuItemIds.Contains(i.MenuItemId) &&
                (i.BotId == null || i.BotId == 0) &&
                !OrderItemRouting.IsBarItem(i.Name) &&
                (i.KotStatus == "Queued" ||
                 i.KotStatus == "queued" ||
                 i.KotStatus == "Cooking" ||
                 i.KotStatus == "cooking"))
            .ToList();

        foreach (var item in itemsToUpdate)
        {
            item.KotStatus = "ready";
            item.UpdatedAt = DateTime.UtcNow;
        }

        var kotTickets = await _context.KitchenOrderTickets
            .Where(k => k.OrderId == order.Id && k.IsActive && !k.IsDeleted && k.Status != "Served" && k.Status != "Cancelled")
            .ToListAsync();
        foreach (var kt in kotTickets)
        {
            kt.Status = "Ready";
            kt.CompletedAt = DateTime.UtcNow;
            kt.UpdatedAt = DateTime.UtcNow;
        }

        await _context.SaveChangesAsync();
        await TakeawayStatusSyncHelper.SyncTakeawayFromItemsAsync(_context, order.Id);

        await _hubContext.Clients
            .Group("floor")
            .SendAsync(
                "KitchenStatusAlert",
                new
                {
                    type = "cooking_completed",

                    title =
                        $"Food Ready to Serve! " +
                        $"({order.TableName})",

                    message =
                        $"All dishes for " +
                        $"{order.TableName} " +
                        $"(Batch #{batch}) are ready " +
                        $"on the pass!",

                    tableId = order.TableId,

                    tableName = order.TableName
                });

        return Ok(new
        {
            message = "Ticket marked as ready."
        });
    }
}
