namespace HMS.Controllers;

using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using HMS.Data;
using HMS.DTOs;
using HMS.Hubs;

[ApiController]
[Route("api/[controller]")]
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
                (o.Status == "Active" ||
                 o.Status == "active" ||
                 o.Status == "Billed" ||
                 o.Status == "billed"))
            .ToListAsync();

        var tickets = new List<KotTicketDto>();

        foreach (var order in orders)
        {
            var batches = order.Items
                .Where(i =>
                    i.KotStatus == "Queued" ||
                    i.KotStatus == "queued" ||
                    i.KotStatus == "Cooking" ||
                    i.KotStatus == "cooking" ||
                    i.KotStatus == "Ready" ||
                    i.KotStatus == "ready")
                .GroupBy(i => i.KotBatch);

            foreach (var batch in batches)
            {
                var batchItems = batch.ToList();

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

                    TableId = order.TableId ?? 0,

                    TableName = order.TableName,

                    Section = order.Section,

                    ServerName = order.ServerName,

                    KotBatch = batch.Key,

                    OrderTime = order.CreatedAt,

                    TicketStatus = overallStatus,

                    Items = batchItems
                        .Select(i => new OrderItemDto
                        {
                            Id = i.Id,

                            OrderId = i.OrderId,

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

        try
        {
            var item = await _context.OrderItems
                .Include(i => i.Order)
                .FirstOrDefaultAsync(i => i.Id == itemId);

            if (item == null)
            {
                return NotFound(new { success = false, message = "Order item not found." });
            }

            var cleanStatus = request.Status.Trim();
            if (cleanStatus.Equals("PREPARATION COMPLETED", StringComparison.OrdinalIgnoreCase) || cleanStatus.Equals("READY", StringComparison.OrdinalIgnoreCase))
            {
                cleanStatus = "ready";
            }
            else if (cleanStatus.Equals("COOKING", StringComparison.OrdinalIgnoreCase) || cleanStatus.Equals("IN PREPARATION", StringComparison.OrdinalIgnoreCase) || cleanStatus.Equals("IN PREP", StringComparison.OrdinalIgnoreCase))
            {
                cleanStatus = "cooking";
            }
            else if (cleanStatus.Length > 20)
            {
                cleanStatus = cleanStatus.Substring(0, 20);
            }

            item.KotStatus = cleanStatus.ToLowerInvariant();
            item.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

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

        var itemsToUpdate = order.Items
            .Where(i =>
                (i.KotBatch == batch || batch == 0) &&
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

        await _context.SaveChangesAsync();

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

        var itemsToUpdate = order.Items
            .Where(i =>
                (i.KotBatch == batch || batch == 0) &&
                i.KotStatus != "served")
            .ToList();

        foreach (var item in itemsToUpdate)
        {
            item.KotStatus = "ready";
            item.UpdatedAt = DateTime.UtcNow;
        }

        await _context.SaveChangesAsync();

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