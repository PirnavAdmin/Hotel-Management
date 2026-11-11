using HMS.Data;
using HMS.DTOs;
using HMS.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HMS.Controllers;

[ApiController]
[Route("api/v1/inventory/purchases")]
[Route("api/Inventory/purchases")]
public class InventoryPurchasesController : ControllerBase
{
    private readonly AppDbContext _context;

    public InventoryPurchasesController(AppDbContext context)
    {
        _context = context;
    }

    [AllowAnonymous]
    [HttpGet]
    public async Task<IActionResult> GetPurchases([FromQuery] string? department, [FromQuery] int limit = 500)
    {
        var query = _context.InventoryPurchaseRecords.AsNoTracking();
        if (!string.IsNullOrWhiteSpace(department))
        {
            var normalizedDepartment = department.Trim().ToLowerInvariant();
            if (normalizedDepartment is not ("bar" or "dine"))
            {
                return BadRequest(new { success = false, message = "Department must be bar or dine." });
            }

            query = query.Where(purchase => purchase.Department == normalizedDepartment);
        }

        var purchases = await query
            .OrderByDescending(purchase => purchase.PurchaseDate)
            .ThenByDescending(purchase => purchase.PurchaseId)
            .Take(Math.Clamp(limit, 1, 2000))
            .ToListAsync();

        return Ok(new { success = true, count = purchases.Count, data = purchases });
    }

    [AllowAnonymous]
    [HttpPost]
    public async Task<IActionResult> CreatePurchase([FromBody] CreateInventoryPurchaseDto request)
    {
        if (request.ItemId.HasValue && request.ItemId.Value <= 0)
        {
            return BadRequest(new { success = false, message = "Inventory item ID must be positive." });
        }
        if (string.IsNullOrWhiteSpace(request.Name))
        {
            return BadRequest(new { success = false, message = "Inventory item name is required." });
        }
        if (request.PurchaseDate is null || request.PurchaseDate.Value == default)
        {
            return BadRequest(new { success = false, message = "A valid purchase date is required." });
        }

        var purchase = new InventoryPurchaseRecord
        {
            ItemId = request.ItemId,
            Name = request.Name.Trim(),
            Category = request.Category?.Trim() ?? string.Empty,
            Subcategory = request.Subcategory?.Trim() ?? string.Empty,
            Supplier = request.Supplier?.Trim() ?? string.Empty,
            Quantity = decimal.Round(request.Quantity, 3),
            Unit = request.Unit.Trim(),
            UnitCost = decimal.Round(request.UnitCost, 2),
            Department = request.Department.Trim().ToLowerInvariant(),
            PurchaseDate = request.PurchaseDate.Value.Date,
            CreatedAt = DateTime.UtcNow
        };

        _context.InventoryPurchaseRecords.Add(purchase);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetPurchases), new { department = purchase.Department }, new
        {
            success = true,
            message = "Inventory purchase recorded successfully.",
            data = purchase
        });
    }
}
