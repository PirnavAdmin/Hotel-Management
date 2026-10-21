using System;
using System.Collections.Generic;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using HMS.Data;
using HMS.DTOs;
using HMS.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;

namespace HMS.Controllers;

[ApiController]
[Route("api")]
[Route("api/v1")]
public class StateController : ControllerBase
{
    private readonly SpService _spService;
    private readonly TableService _tableService;
    private readonly MenuItemService _menuItemService;
    private readonly StaffService _staffService;
    private readonly RestaurantSettingsService _settingsService;
    private readonly ILogger<StateController> _logger;

    public StateController(
        SpService spService,
        TableService tableService,
        MenuItemService menuItemService,
        StaffService staffService,
        RestaurantSettingsService settingsService,
        ILogger<StateController> logger)
    {
        _spService = spService;
        _tableService = tableService;
        _menuItemService = menuItemService;
        _staffService = staffService;
        _settingsService = settingsService;
        _logger = logger;
    }

    /// <summary>
    /// Retrieves full POS runtime state (tables, active orders, past orders, categories, menu items, staff).
    /// </summary>
    [AllowAnonymous]
    [HttpGet("state")]
    [HttpGet("pos/state")]
    public async Task<IActionResult> GetState()
    {
        try
        {
            _logger.LogInformation("Fetching complete POS state via SPs.");

            var rawTables = await _tableService.GetTablesAsync();
            var tables = rawTables.ConvertAll(t => new
            {
                id = t.TableId,
                tableId = t.TableId,
                name = !string.IsNullOrWhiteSpace(t.TableNumber) ? t.TableNumber : (!string.IsNullOrWhiteSpace(t.TableName) ? t.TableName : $"Table-{t.TableId}"),
                tableName = !string.IsNullOrWhiteSpace(t.TableName) ? t.TableName : t.TableNumber,
                tableNumber = !string.IsNullOrWhiteSpace(t.TableNumber) ? t.TableNumber : t.TableName,
                branchId = t.BranchId,
                section = !string.IsNullOrWhiteSpace(t.SectionArea) ? t.SectionArea : t.Location,
                location = !string.IsNullOrWhiteSpace(t.Location) ? t.Location : t.SectionArea,
                capacity = t.CapacityChairs > 0 ? t.CapacityChairs : t.Capacity,
                status = t.Status,
                server = t.AssignedServerName ?? "Staff",
                assignedServerId = t.AssignedServerId,
                assignedServerName = t.AssignedServerName,
                assignedServerRole = t.AssignedServerRole
            });

            var categoriesList = await _menuItemService.GetCategoriesAsync();
            var categories = categoriesList.ConvertAll(c => new { id = Guid.NewGuid().ToString(), name = c, displayOrder = 0 });

            var rawMenuItems = await _menuItemService.GetMenuItemsAsync();
            var menuItems = rawMenuItems.ConvertAll(m => new
            {
                id = m.MenuItemId.ToString(),
                name = m.DishName,
                category = m.Category,
                price = m.Price,
                isVeg = m.DietaryType.ToLower() == "veg",
                spiceLevel = m.SpiceLevel == 0 ? "Mild" : (m.SpiceLevel == 1 ? "Medium" : "Spicy"),
                description = m.ShortDescription,
                prepTimeMinutes = m.PrepTimeMinutes ?? 15,
                isAvailable = m.IsAvailable,
                imageUrl = m.ImageUrl
            });

            var rawStaff = await _staffService.GetStaffListAsync();
            var staff = rawStaff.ConvertAll(s => new
            {
                id = s.StaffId,
                name = s.FullName,
                role = s.RoleTitle,
                phone = s.Phone,
                shift = s.Shift,
                status = s.IsActive ? "active" : "inactive"
            });

            var rawIngredients = await _spService.ExecuteQueryAsync("sp_GetIngredients", InventoryController.MapIngredientFromReader);
            var ingredients = rawIngredients.ConvertAll(i => new
            {
                id = i.IngredientId.ToString(),
                ingredientId = i.IngredientId,
                name = i.Name,
                unit = i.Unit,
                stock = i.CurrentStock,
                currentStock = i.CurrentStock,
                minThreshold = i.MinimumThreshold,
                minimumThreshold = i.MinimumThreshold,
                mrp = i.UnitCost,
                unitCost = i.UnitCost,
                category = i.Category,
                subCategory = i.Subcategory,
                supplier = i.Supplier
            });

            var activeOrders = new List<object>();
            var pastOrders = new List<object>();
            var restaurantSettings = await _settingsService.GetSettingsAsync();

            var stateData = new
            {
                tables,
                activeOrders,
                categories,
                menuItems,
                staff,
                pastOrders,
                ingredients,
                gourmet_pos_inventory_v2 = ingredients,
                gourmet_pos_inventory_v1 = ingredients,
                restaurantSettings,
                gourmet_pos_settings_v1 = restaurantSettings
            };

            return Ok(new PosStateResponseDto
            {
                Success = true,
                Message = "POS state loaded successfully.",
                Tables = tables,
                ActiveOrders = activeOrders,
                Categories = categories,
                MenuItems = menuItems,
                Staff = staff,
                PastOrders = pastOrders,
                Ingredients = ingredients,
                GourmetPosInventoryV2 = ingredients,
                RestaurantSettings = restaurantSettings,
                GourmetPosSettingsV1 = restaurantSettings,
                Data = stateData
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching POS state.");
            return StatusCode(500, new { success = false, message = "An error occurred while retrieving POS state." });
        }
    }

    /// <summary>
    /// Synchronizes POS client changes to the database.
    /// </summary>
    [HttpPost("sync")]
    public async Task<IActionResult> SyncState([FromBody] JsonElement syncPayload)
    {
        try
        {
            _logger.LogInformation("Processing POS sync payload.");

            if (syncPayload.ValueKind == JsonValueKind.Object)
            {
                JsonElement settingsElement = default;
                bool hasSettings = syncPayload.TryGetProperty("gourmet_pos_settings_v1", out settingsElement) ||
                                   syncPayload.TryGetProperty("restaurantSettings", out settingsElement) ||
                                   syncPayload.TryGetProperty("restaurant_settings", out settingsElement);

                if (hasSettings && settingsElement.ValueKind == JsonValueKind.Object)
                {
                    var options = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
                    var settingsDto = JsonSerializer.Deserialize<RestaurantSettingsDto>(settingsElement.GetRawText(), options);
                    if (settingsDto != null && !string.IsNullOrWhiteSpace(settingsDto.RestaurantName))
                    {
                        _logger.LogInformation("Syncing restaurant settings via /api/sync. Restaurant Name: {Name}", settingsDto.RestaurantName);
                        await _settingsService.SaveSettingsAsync(settingsDto);
                    }
                }

                JsonElement invElement = default;
                bool hasInv = syncPayload.TryGetProperty("gourmet_pos_inventory_v2", out invElement) ||
                              syncPayload.TryGetProperty("gourmet_pos_inventory_v1", out invElement) ||
                              syncPayload.TryGetProperty("inventory", out invElement) ||
                              syncPayload.TryGetProperty("ingredients", out invElement);

                if (hasInv && invElement.ValueKind == JsonValueKind.Array)
                {
                    _logger.LogInformation("Syncing {Count} inventory items via /api/sync to MySQL.", invElement.GetArrayLength());
                    foreach (var itemElem in invElement.EnumerateArray())
                    {
                        try
                        {
                            var name = itemElem.TryGetProperty("name", out var n) ? n.GetString() : null;
                            if (string.IsNullOrWhiteSpace(name)) continue;

                            var category = itemElem.TryGetProperty("category", out var c) ? c.GetString() : "General";
                            var subcategory = itemElem.TryGetProperty("subCategory", out var sc) ? sc.GetString() : (itemElem.TryGetProperty("subcategory", out var sc2) ? sc2.GetString() : "");
                            var supplier = itemElem.TryGetProperty("supplier", out var s) ? s.GetString() : "Local Supplier";
                            var unit = itemElem.TryGetProperty("unit", out var u) ? u.GetString() : "KG";
                            var stock = itemElem.TryGetProperty("stock", out var st) ? (st.TryGetDecimal(out var dStock) ? dStock : 0) : (itemElem.TryGetProperty("currentStock", out var cs) && cs.TryGetDecimal(out var dCs) ? dCs : 0);
                            var min = itemElem.TryGetProperty("minThreshold", out var mt) ? (mt.TryGetDecimal(out var dMin) ? dMin : 5) : (itemElem.TryGetProperty("minimumThreshold", out var mt2) && mt2.TryGetDecimal(out var dMt2) ? dMt2 : 5);
                            var mrp = itemElem.TryGetProperty("mrp", out var mr) ? (mr.TryGetDecimal(out var dMrp) ? dMrp : 0) : (itemElem.TryGetProperty("unitCost", out var uc) && uc.TryGetDecimal(out var dUc) ? dUc : 0);

                            long existingId = 0;
                            if (itemElem.TryGetProperty("id", out var idProp))
                            {
                                if (idProp.ValueKind == JsonValueKind.Number) existingId = idProp.GetInt64();
                                else if (idProp.ValueKind == JsonValueKind.String && long.TryParse(idProp.GetString(), out var parsedLong)) existingId = parsedLong;
                            }
                            if (existingId <= 0 && itemElem.TryGetProperty("ingredientId", out var ingIdProp))
                            {
                                if (ingIdProp.ValueKind == JsonValueKind.Number) existingId = ingIdProp.GetInt64();
                                else if (ingIdProp.ValueKind == JsonValueKind.String && long.TryParse(ingIdProp.GetString(), out var parsedLong2)) existingId = parsedLong2;
                            }

                            if (existingId > 0)
                            {
                                var parameters = new Dictionary<string, object?>
                                {
                                    { "p_id", existingId },
                                    { "p_name", name.Trim() },
                                    { "p_category", string.IsNullOrWhiteSpace(category) ? "General" : category.Trim() },
                                    { "p_subcategory", subcategory?.Trim() ?? string.Empty },
                                    { "p_supplier", string.IsNullOrWhiteSpace(supplier) ? "Local Supplier" : supplier.Trim() },
                                    { "p_unit", string.IsNullOrWhiteSpace(unit) ? "KG" : unit.Trim().ToUpper() },
                                    { "p_current_stock", stock },
                                    { "p_minimum_threshold", min > 0 ? min : 5.00m },
                                    { "p_unit_cost", mrp },
                                    { "p_mrp", mrp }
                                };
                                await _spService.ExecuteNonQueryAsync("sp_UpdateIngredient", parameters);
                            }
                            else
                            {
                                var parameters = new Dictionary<string, object?>
                                {
                                    { "p_name", name.Trim() },
                                    { "p_category", string.IsNullOrWhiteSpace(category) ? "General" : category.Trim() },
                                    { "p_subcategory", subcategory?.Trim() ?? string.Empty },
                                    { "p_supplier", string.IsNullOrWhiteSpace(supplier) ? "Local Supplier" : supplier.Trim() },
                                    { "p_unit", string.IsNullOrWhiteSpace(unit) ? "KG" : unit.Trim().ToUpper() },
                                    { "p_current_stock", stock },
                                    { "p_minimum_threshold", min > 0 ? min : 5.00m },
                                    { "p_unit_cost", mrp },
                                    { "p_mrp", mrp }
                                };
                                await _spService.ExecuteScalarAsync<long>("sp_CreateIngredient", parameters);
                            }
                        }
                        catch (Exception invEx)
                        {
                            _logger.LogWarning(invEx, "Could not sync individual inventory item.");
                        }
                    }
                }
            }

            return Ok(new
            {
                success = true,
                message = "POS state synchronized successfully.",
                timestamp = DateTime.UtcNow
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing POS sync.");
            return StatusCode(500, new { success = false, message = "An error occurred while synchronizing POS state." });
        }
    }

    /// <summary>
    /// Server-Sent Events (SSE) stream endpoint for live real-time POS & Kitchen updates.
    /// </summary>
    [HttpGet("events")]
    public async Task GetEvents(CancellationToken cancellationToken)
    {
        Response.ContentType = "text/event-stream";
        Response.Headers.Append("Cache-Control", "no-cache");
        Response.Headers.Append("Connection", "keep-alive");

        _logger.LogInformation("Client connected to SSE event stream.");

        try
        {
            var initialData = JsonSerializer.Serialize(new { eventType = "connected", message = "Connected to HMS live event stream.", timestamp = DateTime.UtcNow });
            await Response.WriteAsync($"data: {initialData}\n\n", cancellationToken);
            await Response.Body.FlushAsync(cancellationToken);

            while (!cancellationToken.IsCancellationRequested)
            {
                await Task.Delay(15000, cancellationToken);
                var heartbeat = JsonSerializer.Serialize(new { eventType = "heartbeat", timestamp = DateTime.UtcNow });
                await Response.WriteAsync($"data: {heartbeat}\n\n", cancellationToken);
                await Response.Body.FlushAsync(cancellationToken);
            }
        }
        catch (TaskCanceledException)
        {
            _logger.LogInformation("SSE client disconnected from event stream.");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in SSE event stream.");
        }
    }
}
