using System;
using System.Collections.Generic;
using System.Data.Common;
using System.Linq;
using System.Threading.Tasks;
using HMS.Data;
using HMS.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;

namespace HMS.Controllers;

[ApiController]
[Route("api/v1/inventory")]
[Route("api/Inventory")]
[Route("api/v1/ingredients")]
[Route("api/Ingredients")]
public class InventoryController : ControllerBase
{
    private readonly SpService _spService;
    private readonly ILogger<InventoryController> _logger;

    public InventoryController(SpService spService, ILogger<InventoryController> logger)
    {
        _spService = spService;
        _logger = logger;
    }

    /// <summary>
    /// Retrieves all ingredients from the inventory.
    /// </summary>
    [AllowAnonymous]
    [HttpGet]
    [HttpGet("ingredients")]
    public async Task<IActionResult> GetIngredients([FromQuery] string? category, [FromQuery] string? search)
    {
        try
        {
            _logger.LogInformation("Retrieving inventory ingredients. Category: {Category}, Search: {Search}", category, search);
            var ingredients = await _spService.ExecuteQueryAsync("sp_GetIngredients", MapIngredientFromReader);

            if (!string.IsNullOrWhiteSpace(category) && !category.Equals("all", StringComparison.OrdinalIgnoreCase))
            {
                ingredients = ingredients.Where(i => i.Category.Equals(category.Trim(), StringComparison.OrdinalIgnoreCase)).ToList();
            }

            if (!string.IsNullOrWhiteSpace(search))
            {
                var term = search.Trim().ToLower();
                ingredients = ingredients.Where(i =>
                    i.Name.ToLower().Contains(term) ||
                    i.Supplier.ToLower().Contains(term) ||
                    (i.IngredientCode?.ToLower().Contains(term) ?? false)).ToList();
            }

            return Ok(new
            {
                success = true,
                message = "Ingredients stock list retrieved successfully.",
                count = ingredients.Count,
                data = ingredients
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to retrieve inventory ingredients.");
            return StatusCode(500, new { success = false, message = "Failed to retrieve inventory ingredients: " + ex.Message });
        }
    }

    /// <summary>
    /// Retrieves a single ingredient by ID.
    /// </summary>
    [AllowAnonymous]
    [HttpGet("{id:long}")]
    [HttpGet("ingredients/{id:long}")]
    public async Task<IActionResult> GetIngredientById(long id)
    {
        try
        {
            _logger.LogInformation("Retrieving ingredient by ID: {IngredientId}", id);
            var parameters = new Dictionary<string, object?> { { "p_id", id } };
            var list = await _spService.ExecuteQueryAsync("sp_GetIngredientById", MapIngredientFromReader, parameters);
            var ingredient = list.FirstOrDefault();

            if (ingredient == null)
            {
                _logger.LogWarning("Ingredient with ID {IngredientId} not found.", id);
                return NotFound(new { success = false, message = $"Ingredient with ID {id} not found." });
            }

            return Ok(new { success = true, data = ingredient });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to retrieve ingredient {IngredientId}", id);
            return StatusCode(500, new { success = false, message = ex.Message });
        }
    }

    /// <summary>
    /// Retrieves all low stock alerts.
    /// </summary>
    [AllowAnonymous]
    [HttpGet("low-stock")]
    public async Task<IActionResult> GetLowStockAlerts()
    {
        try
        {
            _logger.LogInformation("Retrieving low stock ingredient alerts.");
            var lowStock = await _spService.ExecuteQueryAsync("sp_GetLowStockIngredients", MapIngredientFromReader);

            return Ok(new
            {
                success = true,
                message = "Low stock ingredients retrieved successfully.",
                count = lowStock.Count,
                data = lowStock
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to retrieve low stock alerts.");
            return StatusCode(500, new { success = false, message = ex.Message });
        }
    }

    /// <summary>
    /// Retrieves distinct ingredient categories.
    /// </summary>
    [AllowAnonymous]
    [HttpGet("categories")]
    public async Task<IActionResult> GetCategories()
    {
        try
        {
            var ingredients = await _spService.ExecuteQueryAsync("sp_GetIngredients", MapIngredientFromReader);
            var categories = ingredients
                .Select(i => i.Category)
                .Where(c => !string.IsNullOrWhiteSpace(c))
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .OrderBy(c => c)
                .ToList();

            return Ok(new
            {
                success = true,
                count = categories.Count,
                data = categories
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to retrieve inventory categories.");
            return StatusCode(500, new { success = false, message = ex.Message });
        }
    }

    /// <summary>
    /// Creates a new ingredient in MySQL.
    /// </summary>
    [AllowAnonymous]
    [HttpPost]
    [HttpPost("ingredients")]
    public async Task<IActionResult> CreateIngredient([FromBody] CreateIngredientRequest request)
    {
        if (request == null || string.IsNullOrWhiteSpace(request.Name))
        {
            return BadRequest(new { success = false, message = "Ingredient Name is required." });
        }

        try
        {
            _logger.LogInformation("Creating new ingredient: {Name}, Stock: {Stock}, Unit: {Unit}", request.Name, request.Stock, request.Unit);

            var parameters = new Dictionary<string, object?>
            {
                { "p_name", request.Name.Trim() },
                { "p_category", string.IsNullOrWhiteSpace(request.Category) ? "General" : request.Category.Trim() },
                { "p_subcategory", request.Subcategory?.Trim() ?? string.Empty },
                { "p_supplier", string.IsNullOrWhiteSpace(request.Supplier) ? "Local Supplier" : request.Supplier.Trim() },
                { "p_unit", string.IsNullOrWhiteSpace(request.Unit) ? "KG" : request.Unit.Trim().ToUpper() },
                { "p_current_stock", request.Stock },
                { "p_minimum_threshold", request.MinThreshold > 0 ? request.MinThreshold : 5.00m },
                { "p_unit_cost", request.UnitCost > 0 ? request.UnitCost : (request.Mrp ?? 0.00m) },
                { "p_mrp", request.Mrp }
            };

            long id = await _spService.ExecuteScalarAsync<long>("sp_CreateIngredient", parameters);

            var created = new Ingredient
            {
                IngredientId = id,
                Name = request.Name.Trim(),
                Category = string.IsNullOrWhiteSpace(request.Category) ? "General" : request.Category.Trim(),
                Subcategory = request.Subcategory?.Trim() ?? string.Empty,
                Supplier = string.IsNullOrWhiteSpace(request.Supplier) ? "Local Supplier" : request.Supplier.Trim(),
                Unit = string.IsNullOrWhiteSpace(request.Unit) ? "KG" : request.Unit.Trim().ToUpper(),
                CurrentStock = request.Stock,
                MinimumThreshold = request.MinThreshold > 0 ? request.MinThreshold : 5.00m,
                UnitCost = request.UnitCost > 0 ? request.UnitCost : (request.Mrp ?? 0.00m),
                Mrp = request.Mrp,
                UpdatedAt = DateTime.UtcNow,
                IsActive = true
            };

            return CreatedAtAction(nameof(GetIngredientById), new { id }, new
            {
                success = true,
                message = "Ingredient added to inventory successfully.",
                data = created
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to create ingredient: {Name}", request.Name);
            return StatusCode(500, new { success = false, message = "Failed to add ingredient: " + ex.Message });
        }
    }

    /// <summary>
    /// Updates an existing ingredient in MySQL.
    /// </summary>
    [AllowAnonymous]
    [HttpPut("{id:long}")]
    [HttpPut("ingredients/{id:long}")]
    public async Task<IActionResult> UpdateIngredient(long id, [FromBody] UpdateIngredientRequest request)
    {
        if (request == null || string.IsNullOrWhiteSpace(request.Name))
        {
            return BadRequest(new { success = false, message = "Ingredient Name is required." });
        }

        try
        {
            _logger.LogInformation("Updating ingredient {IngredientId}: {Name}", id, request.Name);

            var parameters = new Dictionary<string, object?>
            {
                { "p_id", id },
                { "p_name", request.Name.Trim() },
                { "p_category", string.IsNullOrWhiteSpace(request.Category) ? "General" : request.Category.Trim() },
                { "p_subcategory", request.Subcategory?.Trim() ?? string.Empty },
                { "p_supplier", string.IsNullOrWhiteSpace(request.Supplier) ? "Local Supplier" : request.Supplier.Trim() },
                { "p_unit", string.IsNullOrWhiteSpace(request.Unit) ? "KG" : request.Unit.Trim().ToUpper() },
                { "p_current_stock", request.Stock },
                { "p_minimum_threshold", request.MinThreshold > 0 ? request.MinThreshold : 5.00m },
                { "p_unit_cost", request.UnitCost > 0 ? request.UnitCost : (request.Mrp ?? 0.00m) },
                { "p_mrp", request.Mrp }
            };

            await _spService.ExecuteNonQueryAsync("sp_UpdateIngredient", parameters);

            var updatedList = await _spService.ExecuteQueryAsync("sp_GetIngredientById", MapIngredientFromReader, new Dictionary<string, object?> { { "p_id", id } });
            var updated = updatedList.FirstOrDefault();

            return Ok(new
            {
                success = true,
                message = "Ingredient updated successfully.",
                data = updated
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to update ingredient {IngredientId}", id);
            return StatusCode(500, new { success = false, message = "Failed to update ingredient: " + ex.Message });
        }
    }

    /// <summary>
    /// Soft deletes / deactivates an ingredient in MySQL.
    /// </summary>
    [AllowAnonymous]
    [HttpDelete("{id:long}")]
    [HttpDelete("ingredients/{id:long}")]
    public async Task<IActionResult> DeleteIngredient(long id)
    {
        try
        {
            _logger.LogInformation("Deleting ingredient {IngredientId}", id);
            var parameters = new Dictionary<string, object?> { { "p_id", id } };
            await _spService.ExecuteNonQueryAsync("sp_DeleteIngredient", parameters);

            return Ok(new
            {
                success = true,
                message = "Ingredient removed from inventory successfully.",
                deletedId = id
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to delete ingredient {IngredientId}", id);
            return StatusCode(500, new { success = false, message = "Failed to delete ingredient: " + ex.Message });
        }
    }

    /// <summary>
    /// Adjusts stock for an ingredient and logs an inventory transaction.
    /// </summary>
    [AllowAnonymous]
    [HttpPost("adjust")]
    [HttpPost("stock-adjustment")]
    public async Task<IActionResult> AdjustStock([FromBody] StockAdjustmentRequest request)
    {
        if (request == null || request.IngredientId <= 0 || request.QuantityChange == 0)
        {
            return BadRequest(new { success = false, message = "Valid Ingredient ID and non-zero Quantity change are required." });
        }

        try
        {
            _logger.LogInformation("Adjusting stock for Ingredient {IngredientId} by {QuantityChange}. Reason: {Reason}",
                request.IngredientId, request.QuantityChange, request.Reason);

            var parameters = new Dictionary<string, object?>
            {
                { "p_ingredient_id", request.IngredientId },
                { "p_quantity_change", request.QuantityChange },
                { "p_remarks", string.IsNullOrWhiteSpace(request.Reason) ? "Stock adjustment" : request.Reason.Trim() }
            };

            await _spService.ExecuteNonQueryAsync("sp_AdjustStock", parameters);

            var list = await _spService.ExecuteQueryAsync("sp_GetIngredientById", MapIngredientFromReader, new Dictionary<string, object?> { { "p_id", request.IngredientId } });
            var updated = list.FirstOrDefault();

            return Ok(new
            {
                success = true,
                message = "Stock adjusted successfully.",
                data = updated ?? (object)new { ingredientId = request.IngredientId, quantityChange = request.QuantityChange }
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to adjust stock for Ingredient {IngredientId}", request.IngredientId);
            return StatusCode(500, new { success = false, message = "Failed to adjust stock: " + ex.Message });
        }
    }

    /// <summary>
    /// Retrieves recent inventory transactions audit log.
    /// </summary>
    [AllowAnonymous]
    [HttpGet("transactions")]
    public async Task<IActionResult> GetTransactions([FromQuery] int limit = 50)
    {
        try
        {
            _logger.LogInformation("Retrieving inventory transactions. Limit: {Limit}", limit);
            var parameters = new Dictionary<string, object?> { { "p_limit", Math.Clamp(limit, 1, 200) } };

            var transactions = await _spService.ExecuteQueryAsync("sp_GetInventoryTransactions", reader => new
            {
                txnId = reader.GetInt64(reader.GetOrdinal("txn_id")),
                ingredientId = reader.GetInt64(reader.GetOrdinal("ingredient_id")),
                ingredientName = reader.GetString(reader.GetOrdinal("ingredient_name")),
                txnType = reader.GetString(reader.GetOrdinal("txn_type")),
                quantity = reader.GetDecimal(reader.GetOrdinal("quantity")),
                unitCost = reader.GetDecimal(reader.GetOrdinal("unit_cost")),
                balanceAfter = reader.GetDecimal(reader.GetOrdinal("balance_after")),
                remarks = reader.IsDBNull(reader.GetOrdinal("remarks")) ? null : reader.GetString(reader.GetOrdinal("remarks")),
                txnDate = reader.GetDateTime(reader.GetOrdinal("txn_date"))
            }, parameters);

            return Ok(new
            {
                success = true,
                message = "Inventory transactions retrieved successfully.",
                count = transactions.Count,
                data = transactions
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to retrieve inventory transactions.");
            return StatusCode(500, new { success = false, message = ex.Message });
        }
    }

    public static Ingredient MapIngredientFromReader(DbDataReader reader)
    {
        int catOrd = reader.GetOrdinal("category");
        int subOrd = reader.GetOrdinal("subcategory");
        int supOrd = reader.GetOrdinal("supplier");
        int mrpOrd = reader.GetOrdinal("mrp");
        int codeOrd = reader.GetOrdinal("ingredient_code");
        int actOrd = reader.GetOrdinal("is_active");

        return new Ingredient
        {
            IngredientId = reader.GetInt64(reader.GetOrdinal("ingredient_id")),
            Name = reader.GetString(reader.GetOrdinal("name")),
            Category = reader.IsDBNull(catOrd) ? "General" : reader.GetString(catOrd),
            Subcategory = reader.IsDBNull(subOrd) ? string.Empty : reader.GetString(subOrd),
            Supplier = reader.IsDBNull(supOrd) ? "Local Supplier" : reader.GetString(supOrd),
            Unit = reader.GetString(reader.GetOrdinal("unit")).ToUpper(),
            CurrentStock = reader.GetDecimal(reader.GetOrdinal("current_stock")),
            MinimumThreshold = reader.GetDecimal(reader.GetOrdinal("minimum_threshold")),
            UnitCost = reader.GetDecimal(reader.GetOrdinal("unit_cost")),
            Mrp = reader.IsDBNull(mrpOrd) ? null : reader.GetDecimal(mrpOrd),
            IngredientCode = reader.IsDBNull(codeOrd) ? null : reader.GetString(codeOrd),
            IsActive = !reader.IsDBNull(actOrd) && (reader.GetInt32(actOrd) == 1 || reader.GetBoolean(actOrd)),
            UpdatedAt = reader.GetDateTime(reader.GetOrdinal("updated_at"))
        };
    }
}

public class CreateIngredientRequest
{
    public string Name { get; set; } = string.Empty;
    public string? ItemName { set => Name = value ?? string.Empty; }
    public string? Category { get; set; } = "General";
    public string? Subcategory { get; set; }
    public string? Supplier { get; set; } = "Local Supplier";
    public string Unit { get; set; } = "KG";
    public decimal Stock { get; set; }
    public decimal MinThreshold { get; set; } = 5.00m;
    public decimal UnitCost { get; set; }
    public decimal? Mrp { get; set; }

    // Aliases for compatibility
    public decimal CurrentStock { set => Stock = value; }
    public decimal MinimumThreshold { set => MinThreshold = value; }
    public decimal Threshold { set => MinThreshold = value; }
    public decimal CostPerUnit { set => UnitCost = value; }
}

public class UpdateIngredientRequest
{
    public string Name { get; set; } = string.Empty;
    public string? ItemName { set => Name = value ?? string.Empty; }
    public string? Category { get; set; } = "General";
    public string? Subcategory { get; set; }
    public string? Supplier { get; set; } = "Local Supplier";
    public string Unit { get; set; } = "KG";
    public decimal Stock { get; set; }
    public decimal MinThreshold { get; set; } = 5.00m;
    public decimal UnitCost { get; set; }
    public decimal? Mrp { get; set; }

    // Aliases for compatibility
    public decimal CurrentStock { set => Stock = value; }
    public decimal MinimumThreshold { set => MinThreshold = value; }
    public decimal Threshold { set => MinThreshold = value; }
    public decimal CostPerUnit { set => UnitCost = value; }
}

public class StockAdjustmentRequest
{
    public long IngredientId { get; set; }
    public decimal QuantityChange { get; set; }
    public string? Reason { get; set; }

    // Aliases for compatibility
    public long Id { set => IngredientId = value; }
    public decimal Delta { set => QuantityChange = value; }
}
