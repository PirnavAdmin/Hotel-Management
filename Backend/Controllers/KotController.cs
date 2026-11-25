using System.Security.Claims;
using HMS.DTOs;
using HMS.Hubs;
using HMS.Models;
using HMS.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;

namespace HMS.Controllers;

[ApiController]
[Route("api/v1/kot")]
public class KotController : ControllerBase
{
    private readonly KotService _kotService;
    private readonly IHubContext<PosHub> _hubContext;
    private readonly ISseBroadcaster _sseBroadcaster;
    private readonly IRealtimeSyncService _realtimeSync;

    public KotController(
        KotService kotService,
        IHubContext<PosHub> hubContext,
        ISseBroadcaster sseBroadcaster,
        IRealtimeSyncService realtimeSync)
    {
        _kotService = kotService;
        _hubContext = hubContext;
        _sseBroadcaster = sseBroadcaster;
        _realtimeSync = realtimeSync;
    }

    private long ResolveBranchId(long? tableId = null)
    {
        string? branchClaim = User?.FindFirstValue("branchId");
        if (long.TryParse(branchClaim, out var bId) && bId > 0)
        {
            return bId;
        }
        return 1;
    }

    // ============================================================
    // 1. KOT ORDERS APIS
    // ============================================================

    // GET /api/v1/kot/orders OR /api/v1/kot OR /api/v1/kot-orders OR /api/kot_orders
    [AllowAnonymous]
    [HttpGet("orders")]
    [HttpGet]
    public async Task<IActionResult> GetActiveKotOrders([FromQuery] long? tableId, [FromQuery] string? status)
    {
        var orders = await _kotService.GetActiveKotOrdersAsync(tableId, status);
        return Ok(new
        {
            success = true,
            message = "Active KOT orders retrieved successfully.",
            count = orders.Count,
            orders = orders,
            tickets = orders,
            data = orders
        });
    }

    // GET /api/v1/kot/summary OR /api/v1/kot/orders/summary
    [AllowAnonymous]
    [HttpGet("summary")]
    public async Task<IActionResult> GetKotSummary()
    {
        var summary = await _kotService.GetKotSummaryAsync();
        return Ok(new
        {
            success = true,
            message = "KOT summary retrieved successfully.",
            data = summary
        });
    }

    // GET /api/v1/kot/screen-feed OR /api/v1/kot/screens (Together for Kitchen & POS Screens)
    [AllowAnonymous]
    [HttpGet("screen-feed")]
    public async Task<IActionResult> GetKotScreenFeed([FromQuery] long? tableId, [FromQuery] string? status)
    {
        var feed = await _kotService.GetScreenFeedAsync(tableId, status);
        return Ok(new
        {
            success = true,
            message = "KOT screen feed retrieved successfully.",
            data = feed
        });
    }

    // GET /api/v1/kot/{id} OR /api/v1/kot/orders/{id}
    [AllowAnonymous]
    [HttpGet("orders/{id:long}")]
    [HttpGet("{id:long}")]
    public async Task<IActionResult> GetKotOrderById(long id)
    {
        var order = await _kotService.GetKotOrderByIdAsync(id);
        if (order == null)
        {
            return NotFound(new { success = false, message = $"KOT order with ID {id} not found." });
        }
        return Ok(new { success = true, data = order });
    }

    // POST /api/v1/kot/orders OR /api/v1/kot OR /api/v1/kot-orders
    [AllowAnonymous]
    [HttpPost("orders")]
    [HttpPost]
    public async Task<IActionResult> CreateKotOrder([FromBody] CreateKotOrderDto dto)
    {
        var created = await _kotService.CreateKotOrderAsync(dto);
        var branchId = ResolveBranchId(created.TableId);

        try
        {
            var branchGroup = $"restaurant_{branchId}";
            await _hubContext.Clients.Group(branchGroup).SendAsync("ReceiveNewKOT", created);
            await _hubContext.Clients.Group(branchGroup).SendAsync("KotOrderCreated", created);
            await _sseBroadcaster.BroadcastAsync("KOT_CREATED", created);

            await _realtimeSync.PublishAsync(new RealtimeEvent
            {
                EventType = "kot:created",
                Module = "Kitchen",
                Action = "created",
                BranchId = branchId,
                RecordId = created.OrderId.ToString(),
                Data = created
            }, EventScope.Station, "kitchen");
        }
        catch { }

        return CreatedAtAction(nameof(GetKotOrderById), new { id = created.OrderId }, new
        {
            success = true,
            message = "KOT order dispatched successfully.",
            data = created
        });
    }

    // PUT/PATCH /api/v1/kot/orders/{id}/status OR /api/v1/kot/{id}/status
    [AllowAnonymous]
    [HttpPatch("orders/{id:long}/status")]
    [HttpPatch("{id:long}/status")]
    [HttpPut("{id:long}/status")]
    public async Task<IActionResult> UpdateOrderStatus(long id, [FromBody] UpdateOrderStatusDto dto)
    {
        var updated = await _kotService.UpdateOrderStatusAsync(id, dto.Status);
        if (updated == null)
        {
            return NotFound(new { success = false, message = $"KOT order with ID {id} not found." });
        }
        var branchId = ResolveBranchId(updated.TableId);

        try
        {
            var branchGroup = $"restaurant_{branchId}";
            await _hubContext.Clients.Group(branchGroup).SendAsync("KotOrderUpdated", updated);
            await _sseBroadcaster.BroadcastAsync("KOT_STATUS_UPDATED", updated);

            await _realtimeSync.PublishAsync(new RealtimeEvent
            {
                EventType = "kot:statusChanged",
                Module = "Kitchen",
                Action = "statusChanged",
                BranchId = branchId,
                RecordId = updated.OrderId.ToString(),
                Data = updated
            }, EventScope.Station, "kitchen");
        }
        catch { }

        return Ok(new
        {
            success = true,
            message = "KOT order status updated successfully.",
            data = updated
        });
    }

    // POST /api/v1/kot/{id}/mark-all-prepared OR /api/v1/kot/orders/{id}/mark-all-prepared
    [AllowAnonymous]
    [HttpPost("orders/{id:long}/mark-all-prepared")]
    [HttpPost("{id:long}/mark-all-prepared")]
    public async Task<IActionResult> MarkAllPrepared(long id)
    {
        var updated = await _kotService.MarkAllPreparedAsync(id);
        if (updated == null)
        {
            return NotFound(new { success = false, message = $"KOT order with ID {id} not found." });
        }
        var branchId = ResolveBranchId(updated.TableId);

        try
        {
            var branchGroup = $"restaurant_{branchId}";
            await _hubContext.Clients.Group(branchGroup).SendAsync("KotOrderUpdated", updated);
            await _sseBroadcaster.BroadcastAsync("KOT_STATUS_UPDATED", updated);

            await _realtimeSync.PublishAsync(new RealtimeEvent
            {
                EventType = "kot:statusChanged",
                Module = "Kitchen",
                Action = "statusChanged",
                BranchId = branchId,
                RecordId = updated.OrderId.ToString(),
                Data = updated
            }, EventScope.Station, "kitchen");
        }
        catch { }

        return Ok(new
        {
            success = true,
            message = "All items in KOT order marked as prepared.",
            data = updated
        });
    }

    // DELETE /api/v1/kot/orders/{id} OR /api/v1/kot/{id}
    [AllowAnonymous]
    [HttpDelete("orders/{id:long}")]
    [HttpDelete("{id:long}")]
    public async Task<IActionResult> DeleteKotOrder(long id)
    {
        var existing = await _kotService.GetKotOrderByIdAsync(id);
        var branchId = ResolveBranchId(existing?.TableId);

        var result = await _kotService.DeleteKotOrderAsync(id);
        if (!result)
        {
            return NotFound(new { success = false, message = $"KOT order with ID {id} not found." });
        }

        try
        {
            var branchGroup = $"restaurant_{branchId}";
            await _hubContext.Clients.Group(branchGroup).SendAsync("KotOrderCancelled", new { orderId = id });

            await _realtimeSync.PublishAsync(new RealtimeEvent
            {
                EventType = "kot:cancelled",
                Module = "Kitchen",
                Action = "cancelled",
                BranchId = branchId,
                RecordId = id.ToString(),
                Data = new { orderId = id }
            }, EventScope.Station, "kitchen");
        }
        catch { }

        return Ok(new { success = true, message = $"KOT order with ID {id} has been cancelled/deleted successfully." });
    }

    // ============================================================
    // 2. KOT ORDER ITEMS APIS
    // ============================================================

    // GET /api/v1/kot/items OR /api/v1/kot/orders/{orderId}/items
    [AllowAnonymous]
    [HttpGet("orders/{orderId:long}/items")]
    [HttpGet("items")]
    public async Task<IActionResult> GetKotOrderItems([FromRoute] long? orderId, [FromQuery] long? orderIdQuery, [FromQuery] string? status)
    {
        var targetOrderId = orderId ?? orderIdQuery;
        var items = await _kotService.GetKotOrderItemsAsync(targetOrderId, status);
        return Ok(new
        {
            success = true,
            message = "KOT order items retrieved successfully.",
            count = items.Count,
            data = items
        });
    }

    // GET /api/v1/kot/items/{itemId} OR /api/v1/kot/orders/{orderId}/items/{itemId}
    [AllowAnonymous]
    [HttpGet("orders/{orderId:long}/items/{itemId:long}")]
    [HttpGet("items/{itemId:long}")]
    public async Task<IActionResult> GetKotOrderItemById(long itemId)
    {
        var item = await _kotService.GetKotOrderItemByIdAsync(itemId);
        if (item == null)
        {
            return NotFound(new { success = false, message = $"KOT order item with ID {itemId} not found." });
        }
        return Ok(new { success = true, data = item });
    }

    // POST /api/v1/kot/orders/{orderId}/items
    [AllowAnonymous]
    [HttpPost("orders/{orderId:long}/items")]
    public async Task<IActionResult> AddKotOrderItem(long orderId, [FromBody] CreateKotOrderItemDto dto)
    {
        var createdItem = await _kotService.AddKotOrderItemAsync(orderId, dto);
        var existing = await _kotService.GetKotOrderByIdAsync(orderId);
        var branchId = ResolveBranchId(existing?.TableId);

        try
        {
            var branchGroup = $"restaurant_{branchId}";
            await _hubContext.Clients.Group(branchGroup).SendAsync("KotItemAdded", createdItem);

            await _realtimeSync.PublishAsync(new RealtimeEvent
            {
                EventType = "kot:itemAdded",
                Module = "Kitchen",
                Action = "itemAdded",
                BranchId = branchId,
                RecordId = createdItem.OrderItemId.ToString(),
                Data = createdItem
            }, EventScope.Station, "kitchen");
        }
        catch { }

        return CreatedAtAction(nameof(GetKotOrderItemById), new { itemId = createdItem.OrderItemId }, new
        {
            success = true,
            message = "KOT item added successfully.",
            data = createdItem
        });
    }

    // POST /api/v1/kot/items (with orderId in body)
    [AllowAnonymous]
    [HttpPost("items")]
    public async Task<IActionResult> CreateKotOrderItemDirect([FromBody] AddKotItemRequestDto dto)
    {
        if (dto.OrderId <= 0)
        {
            return BadRequest(new { success = false, message = "Valid orderId is required." });
        }

        var itemDto = new CreateKotOrderItemDto
        {
            MenuItemId = dto.MenuItemId,
            DishName = dto.DishName,
            Quantity = dto.Quantity
        };

        var createdItem = await _kotService.AddKotOrderItemAsync(dto.OrderId, itemDto);
        var existing = await _kotService.GetKotOrderByIdAsync(dto.OrderId);
        var branchId = ResolveBranchId(existing?.TableId);

        try
        {
            var branchGroup = $"restaurant_{branchId}";
            await _hubContext.Clients.Group(branchGroup).SendAsync("KotItemAdded", createdItem);

            await _realtimeSync.PublishAsync(new RealtimeEvent
            {
                EventType = "kot:itemAdded",
                Module = "Kitchen",
                Action = "itemAdded",
                BranchId = branchId,
                RecordId = createdItem.OrderItemId.ToString(),
                Data = createdItem
            }, EventScope.Station, "kitchen");
        }
        catch { }

        return CreatedAtAction(nameof(GetKotOrderItemById), new { itemId = createdItem.OrderItemId }, new
        {
            success = true,
            message = "KOT item created successfully.",
            data = createdItem
        });
    }

    // PUT/PATCH /api/v1/kot/items/{itemId}/status OR /api/v1/kot/orders/{orderId}/items/{itemId}/status
    [AllowAnonymous]
    [HttpPatch("orders/{orderId:long}/items/{itemId:long}/status")]
    [HttpPatch("{orderId:long}/items/{itemId:long}/status")]
    [HttpPatch("items/{itemId:long}/status")]
    [HttpPut("items/{itemId:long}/status")]
    public async Task<IActionResult> UpdateItemStatus([FromRoute] long itemId, [FromRoute] long? orderId, [FromBody] UpdateItemStatusDto dto)
    {
        var updated = await _kotService.UpdateItemStatusDirectAsync(itemId, dto.Status, orderId);
        if (updated == null)
        {
            return NotFound(new { success = false, message = $"KOT item with ID {itemId} not found." });
        }
        var branchId = ResolveBranchId();

        try
        {
            var branchGroup = $"restaurant_{branchId}";
            await _hubContext.Clients.Group(branchGroup).SendAsync("KotItemUpdated", updated);
            await _sseBroadcaster.BroadcastAsync("KOT_ITEM_UPDATED", updated);

            await _realtimeSync.PublishAsync(new RealtimeEvent
            {
                EventType = "kot:itemUpdated",
                Module = "Kitchen",
                Action = "itemUpdated",
                BranchId = branchId,
                RecordId = updated.OrderItemId.ToString(),
                Data = updated
            }, EventScope.Station, "kitchen");
        }
        catch { }

        return Ok(new
        {
            success = true,
            message = "KOT order item status updated successfully.",
            data = updated
        });
    }

    // POST /api/v1/kot/items/{itemId}/advance OR /api/v1/kot/orders/{orderId}/items/{itemId}/advance
    [AllowAnonymous]
    [HttpPost("orders/{orderId:long}/items/{itemId:long}/advance")]
    [HttpPost("{orderId:long}/items/{itemId:long}/advance")]
    [HttpPost("items/{itemId:long}/advance")]
    public async Task<IActionResult> AdvanceItemStatus([FromRoute] long itemId, [FromRoute] long? orderId)
    {
        var updated = await _kotService.AdvanceItemStatusDirectAsync(itemId, orderId);
        if (updated == null)
        {
            return NotFound(new { success = false, message = "KOT item not found." });
        }
        var branchId = ResolveBranchId();

        try
        {
            var branchGroup = $"restaurant_{branchId}";
            await _hubContext.Clients.Group(branchGroup).SendAsync("KotItemUpdated", updated);
            await _sseBroadcaster.BroadcastAsync("KOT_ITEM_UPDATED", updated);

            await _realtimeSync.PublishAsync(new RealtimeEvent
            {
                EventType = "kot:itemUpdated",
                Module = "Kitchen",
                Action = "itemUpdated",
                BranchId = branchId,
                RecordId = updated.OrderItemId.ToString(),
                Data = updated
            }, EventScope.Station, "kitchen");
        }
        catch { }

        return Ok(new
        {
            success = true,
            message = "KOT item status advanced successfully.",
            data = updated
        });
    }

    // DELETE /api/v1/kot/items/{itemId} OR /api/v1/kot/orders/{orderId}/items/{itemId}
    [AllowAnonymous]
    [HttpDelete("orders/{orderId:long}/items/{itemId:long}")]
    [HttpDelete("items/{itemId:long}")]
    public async Task<IActionResult> DeleteKotOrderItem([FromRoute] long itemId, [FromRoute] long? orderId)
    {
        var result = await _kotService.DeleteKotOrderItemAsync(itemId, orderId);
        if (!result)
        {
            return NotFound(new { success = false, message = $"KOT item with ID {itemId} not found." });
        }
        var branchId = ResolveBranchId();

        try
        {
            var branchGroup = $"restaurant_{branchId}";
            await _hubContext.Clients.Group(branchGroup).SendAsync("KotItemDeleted", new { itemId, orderId });

            await _realtimeSync.PublishAsync(new RealtimeEvent
            {
                EventType = "kot:itemDeleted",
                Module = "Kitchen",
                Action = "itemDeleted",
                BranchId = branchId,
                RecordId = itemId.ToString(),
                Data = new { itemId, orderId }
            }, EventScope.Station, "kitchen");
        }
        catch { }

        return Ok(new { success = true, message = $"KOT item {itemId} removed successfully." });
    }
}

public class AddKotItemRequestDto
{
    public long OrderId { get; set; }
    public long? MenuItemId { get; set; }
    public string DishName { get; set; } = string.Empty;
    public int Quantity { get; set; } = 1;
}
