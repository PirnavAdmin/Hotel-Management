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
[Route("api/v1")]
[Route("api")]
public class StateController : ControllerBase
{
    private readonly SpService _spService;
    private readonly TableService _tableService;
    private readonly MenuItemService _menuItemService;
    private readonly StaffService _staffService;
    private readonly RestaurantSettingsService _settingsService;
    private readonly InventoryService _inventoryService;
    private readonly ITableLockService _tableLockService;
    private readonly ISseBroadcaster _sseBroadcaster;
    private readonly ILogger<StateController> _logger;

    public StateController(
        SpService spService,
        TableService tableService,
        MenuItemService menuItemService,
        StaffService staffService,
        RestaurantSettingsService settingsService,
        InventoryService inventoryService,
        ITableLockService tableLockService,
        ISseBroadcaster sseBroadcaster,
        ILogger<StateController> logger)
    {
        _spService = spService;
        _tableService = tableService;
        _menuItemService = menuItemService;
        _staffService = staffService;
        _settingsService = settingsService;
        _inventoryService = inventoryService;
        _tableLockService = tableLockService;
        _sseBroadcaster = sseBroadcaster;
        _logger = logger;
    }

    /// <summary>
    /// Retrieves full POS runtime state (tables, active orders, past orders, categories, menu items, staff, table locks).
    /// </summary>
    [AllowAnonymous]
    [HttpGet("state")]
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
            var activeTableLocks = _tableLockService.GetAllActiveLocks();

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
                gourmet_pos_settings_v1 = restaurantSettings,
                tableLocks = activeTableLocks,
                avsr_table_locks_v1 = activeTableLocks
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
    /// Synchronizes POS client changes to the database and broadcasts to all connected clients.
    /// </summary>
    [HttpPost("sync")]
    public async Task<IActionResult> SyncState([FromBody] JsonElement syncPayload)
    {
        try
        {
            _logger.LogInformation("Processing POS sync payload.");

            if (syncPayload.ValueKind == JsonValueKind.Object)
            {
                // 1. Restaurant Settings
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

                // 2. Inventory Items
                JsonElement invElement = default;
                bool hasInv = syncPayload.TryGetProperty("gourmet_pos_inventory_v2", out invElement) ||
                              syncPayload.TryGetProperty("gourmet_pos_inventory_v1", out invElement) ||
                              syncPayload.TryGetProperty("inventory", out invElement) ||
                              syncPayload.TryGetProperty("ingredients", out invElement);

                if (hasInv)
                {
                    var items = _inventoryService.ParseJsonPayload(invElement);
                    if (items.Count > 0)
                    {
                        _logger.LogInformation("Syncing {Count} inventory items via /api/sync through InventoryService.", items.Count);
                        await _inventoryService.ProcessInventorySubmissionAsync(items, atomic: false);
                    }
                }

                // 3. Table Concurrency Locks
                JsonElement locksElement = default;
                bool hasLocks = syncPayload.TryGetProperty("avsr_table_locks_v1", out locksElement) ||
                                syncPayload.TryGetProperty("tableLocks", out locksElement) ||
                                syncPayload.TryGetProperty("SYNC_TABLE_LOCKS", out locksElement);

                if (hasLocks && locksElement.ValueKind == JsonValueKind.Object)
                {
                    var options = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
                    var incomingLocks = JsonSerializer.Deserialize<Dictionary<string, TableLockDto>>(locksElement.GetRawText(), options);
                    if (incomingLocks != null)
                    {
                        _tableLockService.SyncLocks(incomingLocks);
                    }
                }
            }

            // Real-time broadcast to all connected clients over SSE!
            await _sseBroadcaster.BroadcastAsync("SYNC", syncPayload);

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
            using var linkedCts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);

            // Periodically emit a lightweight heartbeat in the background
            _ = Task.Run(async () =>
            {
                while (!linkedCts.Token.IsCancellationRequested)
                {
                    try
                    {
                        await Task.Delay(15000, linkedCts.Token);
                        var heartbeat = JsonSerializer.Serialize(new { eventType = "heartbeat", timestamp = DateTime.UtcNow });
                        await Response.WriteAsync($"data: {heartbeat}\n\n", linkedCts.Token);
                        await Response.Body.FlushAsync(linkedCts.Token);
                    }
                    catch { break; }
                }
            }, linkedCts.Token);

            await foreach (var sseFrame in _sseBroadcaster.SubscribeAsync(cancellationToken))
            {
                await Response.WriteAsync(sseFrame, cancellationToken);
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
