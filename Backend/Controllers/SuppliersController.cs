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
[Route("api/v1/suppliers")]
public class SuppliersController : ControllerBase
{
    private readonly SpService _spService;

    public SuppliersController(SpService spService)
    {
        _spService = spService;
    }

    [AllowAnonymous]
    [HttpGet]
    public async Task<IActionResult> GetSuppliers()
    {
        var suppliers = await _spService.ExecuteQueryAsync("sp_GetSuppliers", MapSupplierFromReader);

        return Ok(new
        {
            success = true,
            message = "Suppliers retrieved successfully.",
            count = suppliers.Count,
            data = suppliers
        });
    }

    [AllowAnonymous]
    [HttpPost]
    public async Task<IActionResult> CreateSupplier([FromBody] CreateSupplierRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.SupplierName) || string.IsNullOrWhiteSpace(request.Phone))
        {
            return BadRequest(new { success = false, message = "Supplier Name and Phone are required." });
        }

        var parameters = new Dictionary<string, object?>
        {
            { "p_supplier_name", request.SupplierName.Trim() },
            { "p_phone", request.Phone.Trim() },
            { "p_email", request.Email?.Trim() },
            { "p_address", request.Address?.Trim() }
        };

        long id = await _spService.ExecuteScalarAsync<long>("sp_CreateSupplier", parameters);

        var supplier = new Supplier
        {
            SupplierId = id,
            SupplierName = request.SupplierName.Trim(),
            Phone = request.Phone.Trim(),
            Email = request.Email?.Trim(),
            Address = request.Address?.Trim(),
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        return Ok(new
        {
            success = true,
            message = "Supplier registered successfully.",
            data = supplier
        });
    }

    [AllowAnonymous]
    [HttpGet("purchase-orders")]
    public async Task<IActionResult> GetPurchaseOrders([FromQuery] string? status)
    {
        var parameters = new Dictionary<string, object?> { { "p_status", status } };
        var pos = await _spService.ExecuteQueryAsync("sp_GetPurchaseOrders", MapPurchaseOrderFromReader, parameters);

        return Ok(new
        {
            success = true,
            message = "Purchase orders retrieved successfully.",
            count = pos.Count,
            data = pos
        });
    }

    [AllowAnonymous]
    [HttpPost("purchase-orders")]
    public async Task<IActionResult> CreatePurchaseOrder([FromBody] CreatePurchaseOrderRequest request)
    {
        if (request.SupplierId <= 0 || request.TotalAmount <= 0)
        {
            return BadRequest(new { success = false, message = "Valid Supplier ID and Total Amount are required." });
        }

        var poNumber = $"PO-{DateTime.UtcNow:yyyyMMdd}-{Random.Shared.Next(1000, 9999)}";

        var parameters = new Dictionary<string, object?>
        {
            { "p_supplier_id", request.SupplierId },
            { "p_po_number", poNumber },
            { "p_total_amount", request.TotalAmount }
        };

        long id = await _spService.ExecuteScalarAsync<long>("sp_CreatePurchaseOrder", parameters);

        var po = new PurchaseOrder
        {
            PoId = id,
            SupplierId = request.SupplierId,
            PoNumber = poNumber,
            TotalAmount = request.TotalAmount,
            Status = "PENDING",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        return Ok(new
        {
            success = true,
            message = "Purchase order created successfully.",
            data = po
        });
    }

    [AllowAnonymous]
    [HttpPut("purchase-orders/{id:long}/status")]
    public async Task<IActionResult> UpdatePoStatus(long id, [FromBody] UpdatePoStatusRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Status))
        {
            return BadRequest(new { success = false, message = "Status is required." });
        }

        var parameters = new Dictionary<string, object?>
        {
            { "p_po_id", id },
            { "p_status", request.Status.Trim().ToUpper() }
        };

        await _spService.ExecuteNonQueryAsync("sp_UpdatePoStatus", parameters);

        return Ok(new
        {
            success = true,
            message = "Purchase order status updated successfully.",
            data = new { poId = id, status = request.Status.Trim().ToUpper() }
        });
    }

    private static Supplier MapSupplierFromReader(DbDataReader reader)
    {
        var emailOrd = reader.GetOrdinal("email");
        var addrOrd = reader.GetOrdinal("address");

        return new Supplier
        {
            SupplierId = reader.GetInt64(reader.GetOrdinal("supplier_id")),
            SupplierName = reader.GetString(reader.GetOrdinal("supplier_name")),
            Phone = reader.GetString(reader.GetOrdinal("phone")),
            Email = reader.IsDBNull(emailOrd) ? null : reader.GetString(emailOrd),
            Address = reader.IsDBNull(addrOrd) ? null : reader.GetString(addrOrd),
            IsActive = reader.GetBoolean(reader.GetOrdinal("is_active")),
            CreatedAt = reader.GetDateTime(reader.GetOrdinal("created_at"))
        };
    }

    private static PurchaseOrder MapPurchaseOrderFromReader(DbDataReader reader)
    {
        return new PurchaseOrder
        {
            PoId = reader.GetInt64(reader.GetOrdinal("po_id")),
            SupplierId = reader.GetInt64(reader.GetOrdinal("supplier_id")),
            PoNumber = reader.GetString(reader.GetOrdinal("po_number")),
            TotalAmount = reader.GetDecimal(reader.GetOrdinal("total_amount")),
            Status = reader.GetString(reader.GetOrdinal("status")),
            CreatedAt = reader.GetDateTime(reader.GetOrdinal("created_at")),
            UpdatedAt = reader.GetDateTime(reader.GetOrdinal("updated_at"))
        };
    }
}

public class CreateSupplierRequest
{
    public string SupplierName { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public string? Email { get; set; }
    public string? Address { get; set; }
}

public class CreatePurchaseOrderRequest
{
    public long SupplierId { get; set; }
    public decimal TotalAmount { get; set; }
}

public class UpdatePoStatusRequest
{
    public string Status { get; set; } = "RECEIVED";
}
