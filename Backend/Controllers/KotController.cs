using HMS.DTOs;
using HMS.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HMS.Controllers;

[ApiController]
[Route("api/Kot")]
[Route("api/v1/kot")]
public class KotController : ControllerBase
{
    private readonly KotService _kotService;

    public KotController(KotService kotService)
    {
        _kotService = kotService;
    }

    // GET /api/Kot OR /api/v1/kot OR /api/Kot/orders OR /api/v1/kot/orders
    [AllowAnonymous]
    [HttpGet]
    [HttpGet("orders")]
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

    // GET /api/Kot/summary OR /api/v1/kot/summary OR /api/Kot/orders/summary OR /api/v1/kot/orders/summary
    [AllowAnonymous]
    [HttpGet("summary")]
    [HttpGet("orders/summary")]
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

    // GET /api/Kot/{id} OR /api/v1/kot/{id} OR /api/Kot/orders/{id} OR /api/v1/kot/orders/{id}
    [AllowAnonymous]
    [HttpGet("{id:long}")]
    [HttpGet("orders/{id:long}")]
    public async Task<IActionResult> GetKotOrderById(long id)
    {
        var order = await _kotService.GetKotOrderByIdAsync(id);
        if (order == null)
        {
            return NotFound(new { success = false, message = $"KOT order with ID {id} not found." });
        }
        return Ok(new { success = true, data = order });
    }

    // POST /api/Kot OR /api/v1/kot OR /api/Kot/orders OR /api/v1/kot/orders
    [AllowAnonymous]
    [HttpPost]
    [HttpPost("orders")]
    public async Task<IActionResult> CreateKotOrder([FromBody] CreateKotOrderDto dto)
    {
        var created = await _kotService.CreateKotOrderAsync(dto);
        return CreatedAtAction(nameof(GetKotOrderById), new { id = created.OrderId }, new
        {
            success = true,
            message = "KOT order dispatched successfully.",
            data = created
        });
    }

    // DELETE /api/Kot/{id} OR /api/v1/kot/{id} OR /api/Kot/orders/{id} OR /api/v1/kot/orders/{id}
    [AllowAnonymous]
    [HttpDelete("{id:long}")]
    [HttpDelete("orders/{id:long}")]
    public async Task<IActionResult> DeleteKotOrder(long id)
    {
        var result = await _kotService.DeleteKotOrderAsync(id);
        if (!result)
        {
            return NotFound(new { success = false, message = $"KOT order with ID {id} not found." });
        }
        return Ok(new { success = true, message = $"KOT order with ID {id} has been cancelled/deleted successfully." });
    }

    // PUT/PATCH /api/Kot/{id}/status OR /api/v1/kot/{id}/status OR /api/Kot/orders/{id}/status OR /api/v1/kot/orders/{id}/status
    [AllowAnonymous]
    [HttpPut("{id:long}/status")]
    [HttpPatch("{id:long}/status")]
    [HttpPut("orders/{id:long}/status")]
    [HttpPatch("orders/{id:long}/status")]
    public async Task<IActionResult> UpdateOrderStatus(long id, [FromBody] UpdateOrderStatusDto dto)
    {
        var updated = await _kotService.UpdateOrderStatusAsync(id, dto.Status);
        if (updated == null)
        {
            return NotFound(new { success = false, message = $"KOT order with ID {id} not found." });
        }
        return Ok(new
        {
            success = true,
            message = "KOT order status updated successfully.",
            data = updated
        });
    }

    // POST /api/Kot/{id}/mark-all-prepared OR /api/v1/kot/{id}/mark-all-prepared OR /api/Kot/orders/{id}/mark-all-prepared OR /api/v1/kot/orders/{id}/mark-all-prepared
    [AllowAnonymous]
    [HttpPost("{id:long}/mark-all-prepared")]
    [HttpPost("orders/{id:long}/mark-all-prepared")]
    public async Task<IActionResult> MarkAllPrepared(long id)
    {
        var updated = await _kotService.MarkAllPreparedAsync(id);
        if (updated == null)
        {
            return NotFound(new { success = false, message = $"KOT order with ID {id} not found." });
        }
        return Ok(new
        {
            success = true,
            message = "All items in KOT order marked as prepared.",
            data = updated
        });
    }

    // POST /api/Kot/{id}/items/{itemId}/advance OR /api/v1/kot/{id}/items/{itemId}/advance OR /api/Kot/orders/{id}/items/{itemId}/advance OR /api/v1/kot/orders/{id}/items/{itemId}/advance
    [AllowAnonymous]
    [HttpPost("{id:long}/items/{itemId:long}/advance")]
    [HttpPost("orders/{id:long}/items/{itemId:long}/advance")]
    public async Task<IActionResult> AdvanceItemStatus(long id, long itemId)
    {
        var updated = await _kotService.AdvanceItemStatusAsync(id, itemId);
        if (updated == null)
        {
            return NotFound(new { success = false, message = $"KOT order or item not found." });
        }
        return Ok(new
        {
            success = true,
            message = "KOT item status advanced successfully.",
            data = updated
        });
    }

    // PUT/PATCH /api/Kot/{orderId}/items/{itemId}/status OR /api/v1/kot/{orderId}/items/{itemId}/status OR /api/Kot/orders/{orderId}/items/{itemId}/status OR /api/v1/kot/orders/{orderId}/items/{itemId}/status
    [AllowAnonymous]
    [HttpPut("{orderId:long}/items/{itemId:long}/status")]
    [HttpPatch("{orderId:long}/items/{itemId:long}/status")]
    [HttpPut("orders/{orderId:long}/items/{itemId:long}/status")]
    [HttpPatch("orders/{orderId:long}/items/{itemId:long}/status")]
    public async Task<IActionResult> UpdateItemStatus(long orderId, long itemId, [FromBody] UpdateItemStatusDto dto)
    {
        var updated = await _kotService.UpdateItemStatusAsync(orderId, itemId, dto.Status);
        if (updated == null)
        {
            return NotFound(new { success = false, message = $"Order or item not found." });
        }
        return Ok(new
        {
            success = true,
            message = "KOT order item status updated successfully.",
            data = updated
        });
    }
}
