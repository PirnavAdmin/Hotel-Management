using HMS.Services;
using System;
using System.Collections.Generic;
using System.Data.Common;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using HMS.Data;
using HMS.DTOs;
using HMS.Models;
using HMS.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;

namespace HMS.Controllers;

[ApiController]
[Route("api/v1/inventory")]
public class InventoryController : ControllerBase
{
    private readonly SpService _spService;
    private readonly InventoryService _inventoryService;
    private readonly ILogger<InventoryController> _logger;

    public InventoryController(SpService spService, InventoryService inventoryService, ILogger<InventoryController> logger)
    {
        _spService = spService;
        _inventoryService = inventoryService;
        _logger = logger;
    }

    /// <summary>
    /// Retrieves all ingredients from the inventory.
    /// </summary>
    [AllowAnonymous]
    [HttpGet]
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
            var ingredients = await _spService.ExecuteQueryAsync("sp_GetIngredients", MapIngredientFromReader);
            var lowStock = ingredients
                .Where(ingredient => ingredient.CurrentStock <= ingredient.MinimumThreshold)
                .OrderBy(ingredient => ingredient.CurrentStock)
                .ToList();

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
    /// Creates or batch-processes inventory ingredients (both Food and Bar items) in MySQL.
    /// Supports single item object, JSON array [ ... ], or wrapped batch { items: [ ... ] }.
    /// </summary>
    [AllowAnonymous]
    [HttpPost]
    public async Task<IActionResult> CreateIngredient([FromBody] JsonElement body, [FromQuery] bool? atomic = false)
    {
        try
        {
            var items = _inventoryService.ParseJsonPayload(body);
            if (items.Count == 0)
            {
                return BadRequest(new { success = false, message = "Ingredient Name is required or no valid items found." });
            }

            // Check if single item failed basic validation
            if (items.Count == 1)
            {
                var (isValid, valErr) = _inventoryService.ValidateItem(items[0], 0);
                if (!isValid)
                {
                    return BadRequest(new { success = false, message = valErr });
                }
            }

            var result = await _inventoryService.ProcessInventorySubmissionAsync(items, atomic ?? false);

            if (!result.Success && result.Items.Count == 0)
            {
                return StatusCode(500, new
                {
                    success = false,
                    message = result.Message,
                    errors = result.Errors
                });
            }

            // Single item creation: return 201 CreatedAtAction for backwards compatibility
            if (items.Count == 1 && result.Items.Count == 1)
            {
                var first = result.Items[0];
                return CreatedAtAction(nameof(GetIngredientById), new { id = first.Id }, new
                {
                    success = true,
                    message = first.Action == "updated"
                        ? $"Ingredient '{first.Name}' stock updated in inventory successfully."
                        : $"Ingredient '{first.Name}' added to inventory successfully.",
                    classification = first.Classification,
                    isBarItem = first.IsBarItem,
                    data = first,
                    totalReceived = 1,
                    insertedCount = result.InsertedCount,
                    updatedCount = result.UpdatedCount,
                    failedCount = result.FailedCount,
                    items = result.Items,
                    errors = result.Errors
                });
            }

            // Batch creation: return 200 OK with full summary
            return Ok(new
            {
                success = result.Success,
                message = result.Message,
                totalReceived = result.TotalReceived,
                insertedCount = result.InsertedCount,
                updatedCount = result.UpdatedCount,
                failedCount = result.FailedCount,
                foodCount = result.FoodCount,
                barCount = result.BarCount,
                items = result.Items,
                errors = result.Errors,
                data = result.Items
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to create ingredient(s).");
            return StatusCode(500, new { success = false, message = "Failed to add ingredient: " + ex.Message });
        }
    }

    /// <summary>
    /// Updates an existing ingredient in MySQL.
    /// </summary>
    [AllowAnonymous]
    [HttpPut("{id:long}")]
    public async Task<IActionResult> UpdateIngredient(long id, [FromBody] JsonElement body)
    {
        try
        {
            var items = _inventoryService.ParseJsonPayload(body);
            if (items.Count == 0 || string.IsNullOrWhiteSpace(items[0].Name))
            {
                return BadRequest(new { success = false, message = "Ingredient Name is required." });
            }

            var item = items[0];
            item.Id = id;

            var (isValid, error) = _inventoryService.ValidateItem(item, 0);
            if (!isValid)
            {
                return BadRequest(new { success = false, message = error });
            }

            var existing = await _spService.ExecuteQueryAsync(
                "sp_GetIngredientById",
                MapIngredientFromReader,
                new Dictionary<string, object?> { { "p_id", id } });
            if (existing.Count == 0)
            {
                return NotFound(new { success = false, message = $"Ingredient with ID {id} was not found." });
            }

            var result = await _inventoryService.ProcessInventorySubmissionAsync(
                new List<InventoryItemInputDto> { item },
                atomic: true,
                replaceStockOnExisting: true);

            if (result.Items.Count > 0)
            {
                return Ok(new
                {
                    success = true,
                    message = "Ingredient updated successfully.",
                    data = result.Items[0]
                });
            }

            return StatusCode(500, new { success = false, message = result.Message });
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
    public async Task<IActionResult> AdjustStock([FromBody] StockAdjustmentRequest request)
    {
        if (request == null || request.IngredientId <= 0 || request.QuantityChange == 0)
        {
            return BadRequest(new { success = false, message = "Valid Ingredient ID and non-zero Quantity change are required." });
        }
        if (request.Reason?.Length > 255)
        {
            return BadRequest(new { success = false, message = "Stock adjustment reason cannot exceed 255 characters." });
        }

        try
        {
            var currentItems = await _spService.ExecuteQueryAsync(
                "sp_GetIngredientById",
                MapIngredientFromReader,
                new Dictionary<string, object?> { { "p_id", request.IngredientId } });
            var currentItem = currentItems.FirstOrDefault();
            if (currentItem == null)
            {
                return NotFound(new { success = false, message = $"Ingredient {request.IngredientId} was not found." });
            }
            if (request.QuantityChange < -currentItem.CurrentStock)
            {
                return BadRequest(new
                {
                    success = false,
                    message = $"Cannot consume more than the {currentItem.CurrentStock} {currentItem.Unit} currently in stock."
                });
            }

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

    public static int GetOrdinalSafe(DbDataReader reader, params string[] columnNames)
    {
        for (int i = 0; i < reader.FieldCount; i++)
        {
            string name = reader.GetName(i);
            foreach (var col in columnNames)
            {
                if (string.Equals(name, col, StringComparison.OrdinalIgnoreCase))
                {
                    return i;
                }
            }
        }
        return -1;
    }

    private static string GetStringSafe(DbDataReader reader, string defaultValue, params string[] columnNames)
    {
        int ord = GetOrdinalSafe(reader, columnNames);
        if (ord >= 0 && !reader.IsDBNull(ord))
        {
            return reader.GetValue(ord)?.ToString() ?? defaultValue;
        }
        return defaultValue;
    }

    private static decimal GetDecimalSafe(DbDataReader reader, decimal defaultValue, params string[] columnNames)
    {
        int ord = GetOrdinalSafe(reader, columnNames);
        if (ord >= 0 && !reader.IsDBNull(ord))
        {
            try
            {
                return Convert.ToDecimal(reader.GetValue(ord));
            }
            catch
            {
                return defaultValue;
            }
        }
        return defaultValue;
    }

    private static decimal? GetNullableDecimalSafe(DbDataReader reader, params string[] columnNames)
    {
        int ord = GetOrdinalSafe(reader, columnNames);
        if (ord >= 0 && !reader.IsDBNull(ord))
        {
            try
            {
                return Convert.ToDecimal(reader.GetValue(ord));
            }
            catch
            {
                return null;
            }
        }
        return null;
    }

    private static long GetInt64Safe(DbDataReader reader, long defaultValue, params string[] columnNames)
    {
        int ord = GetOrdinalSafe(reader, columnNames);
        if (ord >= 0 && !reader.IsDBNull(ord))
        {
            try
            {
                return Convert.ToInt64(reader.GetValue(ord));
            }
            catch
            {
                return defaultValue;
            }
        }
        return defaultValue;
    }

    private static bool GetBoolSafe(DbDataReader reader, bool defaultValue, params string[] columnNames)
    {
        int ord = GetOrdinalSafe(reader, columnNames);
        if (ord >= 0 && !reader.IsDBNull(ord))
        {
            try
            {
                object val = reader.GetValue(ord);
                if (val is bool b) return b;
                if (val is int i) return i == 1;
                if (val is sbyte sb) return sb == 1;
                if (val is short s) return s == 1;
                if (val is long l) return l == 1;
                string str = val.ToString()?.Trim() ?? "";
                if (str == "1" || string.Equals(str, "true", StringComparison.OrdinalIgnoreCase)) return true;
                if (str == "0" || string.Equals(str, "false", StringComparison.OrdinalIgnoreCase)) return false;
            }
            catch
            {
                return defaultValue;
            }
        }
        return defaultValue;
    }

    private static DateTime GetDateTimeSafe(DbDataReader reader, DateTime defaultValue, params string[] columnNames)
    {
        int ord = GetOrdinalSafe(reader, columnNames);
        if (ord >= 0 && !reader.IsDBNull(ord))
        {
            try
            {
                return Convert.ToDateTime(reader.GetValue(ord));
            }
            catch
            {
                return defaultValue;
            }
        }
        return defaultValue;
    }

    public static Ingredient MapIngredientFromReader(DbDataReader reader)
    {
        string code = GetStringSafe(reader, string.Empty, "ingredient_code", "code");

        return new Ingredient
        {
            IngredientId = GetInt64Safe(reader, 0L, "ingredient_id", "id"),
            Name = GetStringSafe(reader, string.Empty, "name", "ingredient_name"),
            Category = GetStringSafe(reader, "General", "category"),
            Subcategory = GetStringSafe(reader, string.Empty, "subcategory", "sub_category"),
            Supplier = GetStringSafe(reader, "Local Supplier", "supplier"),
            Unit = GetStringSafe(reader, "KG", "unit").ToUpperInvariant(),
            CurrentStock = GetDecimalSafe(reader, 0.00m, "current_stock", "stock"),
            MinimumThreshold = GetDecimalSafe(reader, 5.00m, "minimum_threshold", "min_threshold", "reorder_level"),
            UnitCost = GetDecimalSafe(reader, 0.00m, "unit_cost", "cost_per_unit"),
            Mrp = GetNullableDecimalSafe(reader, "mrp"),
            IngredientCode = string.IsNullOrWhiteSpace(code) ? null : code,
            IsActive = GetBoolSafe(reader, true, "is_active", "active"),
            UpdatedAt = GetDateTimeSafe(reader, DateTime.UtcNow, "updated_at")
        };
    }
    /// <summary>
    /// Exports Dine Inventory (or All / Bar when ?department=All|Bar is passed) as CSV or XLSX.
    /// Supports ?category=...&amp;status=in-stock|low-stock|out-of-stock&amp;search=...&amp;lowStockOnly=true&amp;department=Dine|Bar|All&amp;format=csv|xlsx.
    /// </summary>
    [AllowAnonymous]
    [HttpGet("export")]
    public async Task<IActionResult> ExportInventory(
        [FromQuery] string? category,
        [FromQuery] string? status,
        [FromQuery] string? search = null,
        [FromQuery] bool? lowStockOnly = null,
        [FromQuery] string? department = null,
        [FromQuery] string? format = "csv")
    {
        try
        {
            var doc = await _reportingExportService.GenerateDineInventoryExportAsync(category, status, search, lowStockOnly, department);
            return _exportService.ExportResult(doc, format, doc.BaseFileName);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error exporting dine inventory");
            return StatusCode(500, new { success = false, message = "Failed to export dine inventory.", error = ex.Message });
        }
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
