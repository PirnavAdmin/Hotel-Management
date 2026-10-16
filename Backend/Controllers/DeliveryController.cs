using System;
using System.Collections.Generic;
using System.Data.Common;
using System.Threading.Tasks;
using HMS.Data;
using HMS.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HMS.Controllers;

[ApiController]
[Route("api/v1/delivery-orders")]
public class DeliveryController : ControllerBase
{
    private readonly SpService _spService;

    public DeliveryController(SpService spService)
    {
        _spService = spService;
    }

    [AllowAnonymous]
    [HttpGet]
    public async Task<IActionResult> GetDeliveryOrders([FromQuery] string? status)
    {
        var parameters = new Dictionary<string, object?> { { "p_status", status } };
        var orders = await _spService.ExecuteQueryAsync("sp_GetDeliveryOrders", MapDeliveryFromReader, parameters);

        return Ok(new
        {
            success = true,
            message = "Delivery orders retrieved successfully.",
            count = orders.Count,
            data = orders
        });
    }

    [AllowAnonymous]
    [HttpPost]
    public async Task<IActionResult> CreateDeliveryOrder([FromBody] CreateDeliveryOrderRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.CustomerName) || string.IsNullOrWhiteSpace(request.DeliveryAddress))
        {
            return BadRequest(new { success = false, message = "Customer Name and Delivery Address are required." });
        }

        var parameters = new Dictionary<string, object?>
        {
            { "p_order_id", request.OrderId },
            { "p_customer_name", request.CustomerName.Trim() },
            { "p_phone", request.Phone.Trim() },
            { "p_delivery_address", request.DeliveryAddress.Trim() }
        };

        long deliveryId = await _spService.ExecuteScalarAsync<long>("sp_CreateDeliveryOrder", parameters);

        var delivery = new DeliveryOrder
        {
            DeliveryId = deliveryId,
            OrderId = request.OrderId,
            CustomerName = request.CustomerName.Trim(),
            Phone = request.Phone.Trim(),
            DeliveryAddress = request.DeliveryAddress.Trim(),
            DeliveryStatus = "DISPATCHED",
            CreatedAt = DateTime.UtcNow
        };

        return Ok(new
        {
            success = true,
            message = "Delivery order dispatched successfully.",
            data = delivery
        });
    }

    [AllowAnonymous]
    [HttpPut("{id:long}/status")]
    public async Task<IActionResult> UpdateDeliveryStatus(long id, [FromBody] UpdateDeliveryStatusRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Status))
        {
            return BadRequest(new { success = false, message = "Status is required." });
        }

        var parameters = new Dictionary<string, object?>
        {
            { "p_delivery_id", id },
            { "p_status", request.Status.Trim().ToUpper() }
        };

        await _spService.ExecuteNonQueryAsync("sp_UpdateDeliveryStatus", parameters);

        return Ok(new
        {
            success = true,
            message = "Delivery status updated successfully.",
            data = new { deliveryId = id, deliveryStatus = request.Status.Trim().ToUpper() }
        });
    }

    private static DeliveryOrder MapDeliveryFromReader(DbDataReader reader)
    {
        return new DeliveryOrder
        {
            DeliveryId = reader.GetInt64(reader.GetOrdinal("delivery_id")),
            OrderId = reader.GetInt64(reader.GetOrdinal("order_id")),
            CustomerName = reader.GetString(reader.GetOrdinal("customer_name")),
            Phone = reader.GetString(reader.GetOrdinal("phone")),
            DeliveryAddress = reader.GetString(reader.GetOrdinal("delivery_address")),
            DeliveryStatus = reader.GetString(reader.GetOrdinal("delivery_status")),
            CreatedAt = reader.GetDateTime(reader.GetOrdinal("created_at"))
        };
    }
}

public class CreateDeliveryOrderRequest
{
    public long OrderId { get; set; }
    public string CustomerName { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public string DeliveryAddress { get; set; } = string.Empty;
}

public class UpdateDeliveryStatusRequest
{
    public string Status { get; set; } = "DELIVERED";
}
