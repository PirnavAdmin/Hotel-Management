using HMS.DTOs;
using HMS.Hubs;
using HMS.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;

namespace HMS.Controllers;

[ApiController]
[Route("api/kot-order-items")]
[Route("api/v1/kot-order-items")]
[Route("api/kot_order_items")]
[Route("api/v1/kot_order_items")]
public class KotOrderItemsController : ControllerBase
{
    private readonly KotService _kotService;
    private readonly IHubContext<PosHub> _hubContext;

    public KotOrderItemsController(KotService kotService, IHubContext<PosHub> hubContext)
    {
        _kotService = kotService;
        _hubContext = hubContext;
    }

    // GET /api/v1/kot-order-items?orderId={orderId}&status={status}
    [AllowAnonymous]
    [HttpGet]
    public async Task<IActionResult> GetItems([FromQuery] long? orderId, [FromQuery] string? status)
    {
        var items = await _kotService.GetKotOrderItemsAsync(orderId, status);
        return Ok(new
        {
            success = true,
            message = "KOT order items retrieved successfully.",
            count = items.Count,
            data = items
        });
    }

    // GET /api/v1/kot-order-items/{id}
    [AllowAnonymous]
    [HttpGet("{id:long}")]
    public async Task<IActionResult> GetItemById(long id)
    {
        var item = await _kotService.GetKotOrderItemByIdAsync(id);
        if (item == null)
        {
            return NotFound(new { success = false, message = $"KOT item with ID {id} not found." });
        }
        return Ok(new { success = true, data = item });
    }

    // POST /api/v1/kot-order-items
    [AllowAnonymous]
    [HttpPost]
    public async Task<IActionResult> CreateItem([FromBody] AddKotItemRequestDto dto)
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

        var created = await _kotService.AddKotOrderItemAsync(dto.OrderId, itemDto);

        try
        {
            await _hubContext.Clients.Group("kitchen").SendAsync("KotItemAdded", created);
            await _hubContext.Clients.All.SendAsync("KotItemAdded", created);
        }
        catch { }

        return CreatedAtAction(nameof(GetItemById), new { id = created.OrderItemId }, new
        {
            success = true,
            message = "KOT order item added successfully.",
            data = created
        });
    }

    // PUT/PATCH /api/v1/kot-order-items/{id}/status
    [AllowAnonymous]
    [HttpPut("{id:long}/status")]
    [HttpPatch("{id:long}/status")]
    public async Task<IActionResult> UpdateStatus(long id, [FromBody] UpdateItemStatusDto dto)
    {
        var updated = await _kotService.UpdateItemStatusDirectAsync(id, dto.Status);
        if (updated == null)
        {
            return NotFound(new { success = false, message = $"KOT item with ID {id} not found." });
        }

        try
        {
            await _hubContext.Clients.Group("kitchen").SendAsync("KotItemUpdated", updated);
            await _hubContext.Clients.All.SendAsync("KotItemUpdated", updated);
        }
        catch { }

        return Ok(new
        {
            success = true,
            message = "KOT order item status updated successfully.",
            data = updated
        });
    }

    // POST /api/v1/kot-order-items/{id}/advance
    [AllowAnonymous]
    [HttpPost("{id:long}/advance")]
    public async Task<IActionResult> AdvanceStatus(long id)
    {
        var updated = await _kotService.AdvanceItemStatusDirectAsync(id);
        if (updated == null)
        {
            return NotFound(new { success = false, message = $"KOT item with ID {id} not found." });
        }

        try
        {
            await _hubContext.Clients.Group("kitchen").SendAsync("KotItemUpdated", updated);
            await _hubContext.Clients.All.SendAsync("KotItemUpdated", updated);
        }
        catch { }

        return Ok(new
        {
            success = true,
            message = "KOT order item status advanced successfully.",
            data = updated
        });
    }

    // DELETE /api/v1/kot-order-items/{id}
    [AllowAnonymous]
    [HttpDelete("{id:long}")]
    public async Task<IActionResult> DeleteItem(long id)
    {
        var result = await _kotService.DeleteKotOrderItemAsync(id);
        if (!result)
        {
            return NotFound(new { success = false, message = $"KOT item with ID {id} not found." });
        }

        try
        {
            await _hubContext.Clients.Group("kitchen").SendAsync("KotItemDeleted", new { itemId = id });
            await _hubContext.Clients.All.SendAsync("KotItemDeleted", new { itemId = id });
        }
        catch { }

        return Ok(new { success = true, message = $"KOT item {id} removed successfully." });
    }
}
